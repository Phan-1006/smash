import { useEffect, useMemo, useState } from 'react';
import { User } from 'firebase/auth';
import {
  ArrowRight,
  BarChart3,
  Check,
  Copy,
  Download,
  Edit3,
  ExternalLink,
  Loader2,
  MapPin,
  PackagePlus,
  Plus,
  RotateCcw,
  Search,
  SlidersHorizontal,
  Trash2,
  X,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import {
  IMAGE_PRESETS,
  MENU_ITEMS,
  MenuAddon,
  MenuCategory,
  MenuItem,
} from '../data/menu';
import { DEFAULT_SITE_SETTINGS, normalizeSiteSettings } from '../data/siteSettings';
import {
  deleteProduct,
  sanitizeId,
  saveSiteSettings,
  seedCatalogToFirestore,
  updateOrderPaymentState,
  upsertProduct,
} from '../services/storefrontService';
import type {
  OrderDoc,
  OrderStatusType,
  PaymentStatusType,
  SiteSettingsDoc,
} from '../types/ecommerce';
import {
  fetchAdminUploadedImages,
  isValidImageLink,
  uploadAdminImageFile,
  type UploadedImageItem,
} from '../utils/imageUpload';
import { AdminImageField } from './AdminImageField';
import { FoodImage } from './FoodImage';

interface AdminPanelProps {
  open: boolean;
  user: User | null;
  orders: OrderDoc[];
  products: MenuItem[];
  hasCloudProducts: boolean;
  siteSettings?: Omit<SiteSettingsDoc, 'updatedAt'>;
  onClose: () => void;
}

const CATEGORY_OPTIONS: { id: Exclude<MenuCategory, 'all'>; label: string; defaultLabel: string }[] =
  [
    { id: 'burgers', label: 'Smash Burgers', defaultLabel: 'Smash Burger' },
    { id: 'pizzas', label: 'Pizzas Artisanales', defaultLabel: 'Pizza Artisanale' },
    { id: 'chicken', label: 'Poulet Croustillant', defaultLabel: 'Poulet Croustillant' },
    { id: 'sides', label: 'Accompagnements', defaultLabel: 'Accompagnement' },
    { id: 'drinks', label: 'Boissons & Shakes', defaultLabel: 'Boisson Glacée' },
  ];

const ORDER_STATUS_OPTIONS: { value: OrderStatusType; label: string }[] = [
  { value: 'AWAITING_PAYMENT', label: 'Paiement en attente' },
  { value: 'PREPARING', label: 'En préparation' },
  { value: 'READY', label: 'Prête au comptoir' },
  { value: 'DELIVERING', label: 'En cours de livraison' },
  { value: 'DELIVERED', label: 'Livrée' },
  { value: 'CANCELLED', label: 'Annulée' },
];

const PAYMENT_STATUS_OPTIONS: { value: PaymentStatusType; label: string }[] = [
  { value: 'PENDING', label: 'En attente' },
  { value: 'PAID', label: 'Payé' },
  { value: 'FAILED', label: 'Échoué' },
];

function getNextOrderStep(
  order: OrderDoc
): { nextStatus: OrderStatusType; label: string } | null {
  switch (order.orderStatus) {
    case 'AWAITING_PAYMENT':
      return { nextStatus: 'PREPARING', label: 'Passer en cuisine' };
    case 'PREPARING':
      return { nextStatus: 'READY', label: 'Marquer prête' };
    case 'READY':
      return order.deliveryMode === 'pickup'
        ? { nextStatus: 'DELIVERED', label: 'Remise client' }
        : { nextStatus: 'DELIVERING', label: 'Envoyer livreur' };
    case 'DELIVERING':
      return { nextStatus: 'DELIVERED', label: 'Marquer livrée' };
    default:
      return null;
  }
}

function escapeCsvCell(raw: string | number | undefined): string {
  const str = String(raw ?? '');
  const safe = /^[=+\-@\t\r]/.test(str) ? `'${str}` : str;
  return `"${safe.replace(/"/g, '""')}"`;
}

type SitePosterField =
  | 'heroMainImage'
  | 'heroMacroImage'
  | 'pizzaShowcaseImage'
  | 'crispyShowcaseImage'
  | 'friesShowcaseImage'
  | 'drinksShowcaseImage';

const SITE_POSTER_SLOTS: {
  key: SitePosterField;
  title: string;
  locationHint: string;
}[] = [
  {
    key: 'heroMainImage',
    title: 'Affiche Hero Principale',
    locationHint: 'Grande photo d’ouverture en haut de page',
  },
  {
    key: 'heroMacroImage',
    title: 'Affiche Hero Détail (2.5D)',
    locationHint: 'Vignette superposée sur l’accueil',
  },
  {
    key: 'pizzaShowcaseImage',
    title: 'Affiche Expérience Pizza',
    locationHint: 'Grande pizza zénithale dans la 2e section',
  },
  {
    key: 'crispyShowcaseImage',
    title: 'Affiche Poulet Crispy',
    locationHint: 'Visuel principal de la section sombre',
  },
  {
    key: 'friesShowcaseImage',
    title: 'Affiche Frites & Accompagnements',
    locationHint: 'Vignette flottante sous le poulet crispy',
  },
  {
    key: 'drinksShowcaseImage',
    title: 'Affiche Boissons & Milkshakes',
    locationHint: 'Portrait vertical de la section claire',
  },
];

export function AdminPanel({
  open,
  user,
  orders,
  products,
  hasCloudProducts,
  siteSettings = DEFAULT_SITE_SETTINGS,
  onClose,
}: AdminPanelProps) {
  const [activeTab, setActiveTab] = useState<'orders' | 'products' | 'analytics' | 'site'>(
    'orders'
  );

  // Orders Filters
  const [orderSearch, setOrderSearch] = useState('');
  const [orderFilter, setOrderFilter] = useState<
    'all' | 'active' | 'unpaid' | 'delivered' | 'cancelled'
  >('all');
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);

  // Products Filters & Editor
  const [productSearch, setProductSearch] = useState('');
  const [productCategoryFilter, setProductCategoryFilter] = useState<MenuCategory>('all');
  const [productStockFilter, setProductStockFilter] = useState<'all' | 'available' | 'out'>('all');
  const [seedingCatalog, setSeedingCatalog] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [editingProduct, setEditingProduct] = useState<MenuItem | null>(null);
  const [creatingNew, setCreatingNew] = useState(false);
  const [savingProduct, setSavingProduct] = useState(false);

  // Product Form State
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState<Exclude<MenuCategory, 'all'>>('pizzas');
  const [formCategoryLabel, setFormCategoryLabel] = useState('Pizza Artisanale');
  const [formCalories, setFormCalories] = useState('720 kcal');
  const [formPriceUsd, setFormPriceUsd] = useState('14.00');
  const [formDescription, setFormDescription] = useState('');
  const [formImage, setFormImage] = useState(IMAGE_PRESETS[4].url);
  const [formTag, setFormTag] = useState('');
  const [formAvailable, setFormAvailable] = useState(true);
  const [formSupportsCombo, setFormSupportsCombo] = useState(true);
  const [formComboExtraUsd, setFormComboExtraUsd] = useState('4.00');
  const [formAddons, setFormAddons] = useState<MenuAddon[]>([]);
  const [adminError, setAdminError] = useState<string | null>(null);

  // Image Uploads & Site Settings Form State
  const [uploadedImages, setUploadedImages] = useState<UploadedImageItem[]>([]);
  const [uploadingTarget, setUploadingTarget] = useState<string | null>(null);
  const [siteForm, setSiteForm] = useState<Omit<SiteSettingsDoc, 'updatedAt'>>(siteSettings);
  const [savingSite, setSavingSite] = useState(false);
  const [siteSavedNotice, setSiteSavedNotice] = useState(false);

  useEffect(() => {
    setSiteForm(siteSettings);
  }, [siteSettings]);

  useEffect(() => {
    if (!open || !user) return;
    void fetchAdminUploadedImages(user).then(setUploadedImages);
  }, [open, user]);

  const kpis = useMemo(() => {
    const paidOrders = orders.filter((o) => o.paymentStatus === 'PAID');
    const revenueUsd = paidOrders.reduce(
      (sum, o) => sum + Math.max(0, o.subtotalUsd + o.deliveryFeeUsd - (o.discountUsd || 0)),
      0
    );
    const averageOrderUsd = paidOrders.length > 0 ? revenueUsd / paidOrders.length : 0;
    const activeKitchen = orders.filter(
      (o) =>
        o.orderStatus === 'PREPARING' ||
        o.orderStatus === 'READY' ||
        o.orderStatus === 'DELIVERING'
    ).length;
    const availableCount = products.filter((p) => p.available).length;
    return {
      revenueUsd,
      averageOrderUsd,
      paidCount: paidOrders.length,
      activeKitchen,
      totalOrders: orders.length,
      availableCount,
      totalProducts: products.length,
    };
  }, [orders, products]);

  const analyticsBreakdown = useMemo(() => {
    const paidOrders = orders.filter((o) => o.paymentStatus === 'PAID');
    const byProvider = new Map<string, { count: number; revenueUsd: number }>();
    let deliveryCount = 0;
    let pickupCount = 0;

    paidOrders.forEach((o) => {
      const orderNetUsd = Math.max(0, o.subtotalUsd + o.deliveryFeeUsd - (o.discountUsd || 0));
      const key = o.paymentProvider || o.paymentMethod || 'Autre';
      const cur = byProvider.get(key) || { count: 0, revenueUsd: 0 };
      byProvider.set(key, {
        count: cur.count + 1,
        revenueUsd: cur.revenueUsd + orderNetUsd,
      });
    });

    orders.forEach((o) => {
      if (o.deliveryMode === 'pickup') pickupCount += 1;
      else deliveryCount += 1;
    });

    const providerRows = Array.from(byProvider.entries())
      .map(([provider, stats]) => ({ provider, ...stats }))
      .sort((a, b) => b.revenueUsd - a.revenueUsd);

    const categoryInventory = CATEGORY_OPTIONS.map((cat) => {
      const catItems = products.filter((p) => p.category === cat.id);
      return {
        id: cat.id,
        label: cat.label,
        total: catItems.length,
        active: catItems.filter((p) => p.available).length,
      };
    });

    return {
      providerRows,
      deliveryCount,
      pickupCount,
      categoryInventory,
    };
  }, [orders, products]);

  const filteredOrders = useMemo(() => {
    const q = orderSearch.trim().toLowerCase();
    return orders.filter((o) => {
      const matchesFilter =
        orderFilter === 'all' ||
        (orderFilter === 'active' &&
          (o.orderStatus === 'PREPARING' ||
            o.orderStatus === 'READY' ||
            o.orderStatus === 'DELIVERING')) ||
        (orderFilter === 'delivered' && o.orderStatus === 'DELIVERED') ||
        (orderFilter === 'unpaid' && o.paymentStatus === 'PENDING') ||
        (orderFilter === 'cancelled' && o.orderStatus === 'CANCELLED');

      const matchesSearch =
        !q ||
        o.transactionReference.toLowerCase().includes(q) ||
        o.customerName.toLowerCase().includes(q) ||
        o.customerPhone.toLowerCase().includes(q) ||
        o.customerEmail.toLowerCase().includes(q);

      return matchesFilter && matchesSearch;
    });
  }, [orders, orderFilter, orderSearch]);

  const filteredProducts = useMemo(() => {
    const q = productSearch.trim().toLowerCase();
    return products.filter((item) => {
      const matchesCat =
        productCategoryFilter === 'all' || item.category === productCategoryFilter;
      const matchesStock =
        productStockFilter === 'all' ||
        (productStockFilter === 'available' && item.available) ||
        (productStockFilter === 'out' && !item.available);
      const matchesQuery =
        !q ||
        item.name.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.categoryLabel.toLowerCase().includes(q);
      return matchesCat && matchesStock && matchesQuery;
    });
  }, [products, productSearch, productCategoryFilter, productStockFilter]);

  if (!open || !user) return null;

  const openNewProductForm = () => {
    setEditingProduct(null);
    setCreatingNew(true);
    setAdminError(null);
    setFormName('');
    setFormCategory('pizzas');
    setFormCategoryLabel('Pizza Artisanale');
    setFormCalories('780 kcal');
    setFormPriceUsd('15.00');
    setFormDescription('');
    setFormImage(IMAGE_PRESETS[4].url);
    setFormTag('Nouveau');
    setFormAvailable(true);
    setFormSupportsCombo(true);
    setFormComboExtraUsd('4.00');
    setFormAddons([]);
  };

  const openEditProductForm = (item: MenuItem) => {
    setCreatingNew(false);
    setEditingProduct(item);
    setAdminError(null);
    setFormName(item.name);
    setFormCategory(item.category);
    setFormCategoryLabel(item.categoryLabel);
    setFormCalories(item.calories);
    setFormPriceUsd(item.priceUsd.toFixed(2));
    setFormDescription(item.description);
    setFormImage(item.image);
    setFormTag(item.tag || '');
    setFormAvailable(item.available);
    setFormSupportsCombo(item.supportsCombo);
    setFormComboExtraUsd(item.comboExtraUsd.toFixed(2));
    setFormAddons(item.addons ? item.addons.map((a) => ({ ...a })) : []);
  };

  const handleDuplicateProduct = (item: MenuItem) => {
    setEditingProduct(null);
    setCreatingNew(true);
    setAdminError(null);
    setFormName(`${item.name} (Copie)`.slice(0, 100));
    setFormCategory(item.category);
    setFormCategoryLabel(item.categoryLabel);
    setFormCalories(item.calories);
    setFormPriceUsd(item.priceUsd.toFixed(2));
    setFormDescription(item.description);
    setFormImage(item.image);
    setFormTag(item.tag || '');
    setFormAvailable(item.available);
    setFormSupportsCombo(item.supportsCombo);
    setFormComboExtraUsd(item.comboExtraUsd.toFixed(2));
    setFormAddons(item.addons ? item.addons.map((a) => ({ ...a })) : []);
  };

  const handleAddAddonRow = () => {
    if (formAddons.length >= 10) return;
    setFormAddons((prev) => [
      ...prev,
      {
        id: `addon_${Date.now().toString(36)}_${prev.length + 1}`,
        label: '',
        priceUsd: 1.5,
      },
    ]);
  };

  const handleUpdateAddonRow = (
    idx: number,
    patch: Partial<MenuAddon>
  ) => {
    setFormAddons((prev) =>
      prev.map((row, i) => {
        if (i !== idx) return row;
        const nextLabel = patch.label !== undefined ? patch.label : row.label;
        return {
          ...row,
          ...patch,
          id:
            patch.label !== undefined && patch.label.trim().length > 0
              ? sanitizeId(patch.label.toLowerCase().replace(/\s+/g, '-'), 40)
              : row.id,
          label: nextLabel,
        };
      })
    );
  };

  const handleRemoveAddonRow = (idx: number) => {
    setFormAddons((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidImageLink(formImage)) {
      setAdminError('Veuillez saisir un lien d’image valide (commençant par https://, http:// ou /) ou importer une photo.');
      return;
    }
    setSavingProduct(true);
    setAdminError(null);
    try {
      if (!hasCloudProducts) {
        await seedCatalogToFirestore(MENU_ITEMS);
      }

      const id =
        editingProduct?.id ||
        sanitizeId(
          `${formName.toLowerCase().replace(/\s+/g, '-')}-${Date.now().toString(36)}`,
          64
        );

      const cleanAddons = formAddons
        .filter((a) => a.label.trim().length > 0)
        .slice(0, 10)
        .map((a, idx) => ({
          id: sanitizeId(a.id || `addon_${idx + 1}`, 40),
          label: a.label.trim().slice(0, 80),
          priceUsd: Math.max(0, Math.min(100, Number(a.priceUsd) || 0)),
        }));

      await upsertProduct(
        {
          id,
          name: formName,
          category: formCategory,
          categoryLabel: formCategoryLabel,
          calories: formCalories,
          description: formDescription,
          priceUsd: Number(formPriceUsd) || 10,
          image: formImage,
          tag: formTag.trim() || undefined,
          available: formAvailable,
          supportsCombo: formSupportsCombo,
          comboExtraUsd: formSupportsCombo ? Number(formComboExtraUsd) || 0 : 0,
          addons: cleanAddons,
        },
        creatingNew
      );
      setCreatingNew(false);
      setEditingProduct(null);
    } catch (err) {
      setAdminError(
        err instanceof Error ? err.message : 'Erreur lors de la sauvegarde du produit.'
      );
    } finally {
      setSavingProduct(false);
    }
  };

  const handleToggleAvailable = async (item: MenuItem) => {
    setAdminError(null);
    try {
      if (!hasCloudProducts) {
        await seedCatalogToFirestore(MENU_ITEMS);
      }
      await upsertProduct({ ...item, available: !item.available }, false);
    } catch (err) {
      setAdminError(
        err instanceof Error ? err.message : 'Erreur lors de la mise à jour du stock.'
      );
    }
  };

  const handleDeleteProduct = async (id: string) => {
    setAdminError(null);
    try {
      if (!hasCloudProducts) {
        await seedCatalogToFirestore(MENU_ITEMS);
      }
      await deleteProduct(id);
      setConfirmDeleteId(null);
    } catch (err) {
      setAdminError(err instanceof Error ? err.message : 'Erreur lors de la suppression.');
    }
  };

  const handleSeedCatalog = async () => {
    setSeedingCatalog(true);
    setAdminError(null);
    try {
      await seedCatalogToFirestore(MENU_ITEMS);
    } catch (err) {
      setAdminError(
        err instanceof Error ? err.message : 'Impossible de synchroniser le catalogue.'
      );
    } finally {
      setSeedingCatalog(false);
    }
  };

  const handleOrderChange = async (
    order: OrderDoc,
    nextPaymentStatus: PaymentStatusType,
    nextOrderStatus: OrderStatusType
  ) => {
    setUpdatingOrderId(order.id);
    setAdminError(null);
    try {
      await updateOrderPaymentState(order.id, nextPaymentStatus, nextOrderStatus);
    } catch (err) {
      setAdminError(
        err instanceof Error ? err.message : 'Impossible de mettre à jour la commande.'
      );
    } finally {
      setUpdatingOrderId(null);
    }
  };

  const handleExportOrdersCsv = () => {
    const headers = [
      'Référence',
      'Client',
      'Téléphone',
      'Email',
      'Mode',
      'Adresse',
      'Statut Paiement',
      'Statut Commande',
      'Fournisseur',
      'Devise',
      'Total',
      'Articles',
    ];
    const rows = filteredOrders.map((o) => [
      escapeCsvCell(o.transactionReference),
      escapeCsvCell(o.customerName),
      escapeCsvCell(o.customerPhone),
      escapeCsvCell(o.customerEmail),
      escapeCsvCell(o.deliveryMode === 'pickup' ? 'Retrait' : 'Livraison'),
      escapeCsvCell(o.deliveryAddress),
      escapeCsvCell(o.paymentStatus),
      escapeCsvCell(o.orderStatus),
      escapeCsvCell(o.paymentProvider),
      escapeCsvCell(o.currency),
      escapeCsvCell(o.totalAmount),
      escapeCsvCell(o.itemsSummary.join(' | ')),
    ]);

    const csvContent = '\uFEFF' + [headers.map(escapeCsvCell).join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `commandes-maison-smash-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleImageFileUpload = async (
    file: File | undefined,
    targetKey: string,
    onUrlReady: (url: string) => void
  ) => {
    if (!file || !user) return;
    setUploadingTarget(targetKey);
    setAdminError(null);
    try {
      const uploadedUrl = await uploadAdminImageFile(file, user);
      onUrlReady(uploadedUrl);
      setUploadedImages((prev) => [
        { url: uploadedUrl, name: file.name },
        ...prev.filter((u) => u.url !== uploadedUrl),
      ]);
    } catch (err) {
      setAdminError(
        err instanceof Error ? err.message : 'Erreur lors du téléversement de la photo.'
      );
    } finally {
      setUploadingTarget(null);
    }
  };

  const handleSaveSiteSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    for (const slot of SITE_POSTER_SLOTS) {
      if (!isValidImageLink(siteForm[slot.key])) {
        setAdminError(
          `Lien invalide pour « ${slot.title} ». Utilisez une adresse commençant par https://, http:// ou / (max 1000 caractères).`
        );
        return;
      }
    }
    setSavingSite(true);
    setSiteSavedNotice(false);
    setAdminError(null);
    try {
      const saved = await saveSiteSettings(siteForm);
      setSiteForm(saved);
      setSiteSavedNotice(true);
      window.setTimeout(() => setSiteSavedNotice(false), 3200);
    } catch (err) {
      setAdminError(
        err instanceof Error
          ? err.message
          : 'Impossible d’enregistrer la configuration du site.'
      );
    } finally {
      setSavingSite(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 lg:p-6">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/60 backdrop-blur-xs"
        />

        <motion.div
          role="dialog"
          aria-modal="true"
          aria-label="Console d'administration"
          initial={{ opacity: 0, scale: 0.97, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.97, y: 12 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="relative z-10 w-full max-w-6xl xl:max-w-7xl bg-white rounded-none sm:rounded-2xl border-0 sm:border border-zinc-200 shadow-2xl overflow-hidden h-[100dvh] sm:h-[92vh] flex flex-col"
        >
          {/* Top Bar */}
          <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-b border-zinc-200 flex flex-wrap items-center justify-between gap-3 sm:gap-4 bg-white shrink-0">
            <div className="min-w-0">
              <p className="text-[11px] sm:text-xs font-medium uppercase tracking-wider text-zinc-500 truncate">
                Administration · {user.email}
              </p>
              <h2 className="font-display text-lg sm:text-2xl font-extrabold text-[#141414]">
                Centre de Contrôle Boutique &amp; Cuisine
              </h2>
            </div>

            <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-3 w-full sm:w-auto">
              <div className="inline-flex p-1 bg-[#F5F5F7] rounded-lg overflow-x-auto no-scrollbar">
                <button
                  type="button"
                  onClick={() => setActiveTab('orders')}
                  className={`px-3 sm:px-4 py-1.5 min-h-[38px] text-xs font-semibold rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                    activeTab === 'orders'
                      ? 'bg-[#141414] text-white'
                      : 'text-zinc-600 hover:text-[#141414]'
                  }`}
                >
                  Commandes ({orders.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('products')}
                  className={`px-3 sm:px-4 py-1.5 min-h-[38px] text-xs font-semibold rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                    activeTab === 'products'
                      ? 'bg-[#141414] text-white'
                      : 'text-zinc-600 hover:text-[#141414]'
                  }`}
                >
                  Produits ({products.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('analytics')}
                  className={`inline-flex items-center gap-1.5 px-3 sm:px-4 py-1.5 min-h-[38px] text-xs font-semibold rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                    activeTab === 'analytics'
                      ? 'bg-[#141414] text-white'
                      : 'text-zinc-600 hover:text-[#141414]'
                  }`}
                >
                  <BarChart3 className="w-3.5 h-3.5" />
                  <span>Analytique</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('site')}
                  className={`inline-flex items-center gap-1.5 px-3 sm:px-4 py-1.5 min-h-[38px] text-xs font-semibold rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                    activeTab === 'site'
                      ? 'bg-[#D92323] text-white'
                      : 'text-zinc-600 hover:text-[#141414]'
                  }`}
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  <span>Site &amp; Photos</span>
                </button>
              </div>

              <button
                type="button"
                onClick={onClose}
                aria-label="Fermer l’administration"
                className="p-2 min-w-[44px] min-h-[44px] inline-flex items-center justify-center text-zinc-500 hover:text-[#141414] hover:bg-[#F5F5F7] rounded-lg transition-colors cursor-pointer shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* 4-Column KPI Strip */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 px-4 sm:px-6 py-3 sm:py-4 bg-[#F5F5F7] border-b border-zinc-200 shrink-0">
            <div className="bg-white rounded-xl p-3 sm:p-3.5 border border-zinc-200">
              <p className="text-[11px] sm:text-xs text-zinc-500">CA encaissé</p>
              <p className="font-mono tabular-nums text-lg sm:text-xl font-bold text-[#141414] mt-0.5 sm:mt-1">
                ${kpis.revenueUsd.toFixed(2)}
              </p>
            </div>
            <div className="bg-white rounded-xl p-3 sm:p-3.5 border border-zinc-200">
              <p className="text-[11px] sm:text-xs text-zinc-500">En cuisine / route</p>
              <p className="font-mono tabular-nums text-lg sm:text-xl font-bold text-[#D92323] mt-0.5 sm:mt-1">
                {kpis.activeKitchen}
              </p>
            </div>
            <div className="bg-white rounded-xl p-3 sm:p-3.5 border border-zinc-200">
              <p className="text-[11px] sm:text-xs text-zinc-500">Commandes payées</p>
              <p className="font-mono tabular-nums text-lg sm:text-xl font-bold text-[#141414] mt-0.5 sm:mt-1">
                {kpis.paidCount} / {kpis.totalOrders}
              </p>
            </div>
            <div className="bg-white rounded-xl p-3 sm:p-3.5 border border-zinc-200">
              <p className="text-[11px] sm:text-xs text-zinc-500">Panier moyen payé</p>
              <p className="font-mono tabular-nums text-lg sm:text-xl font-bold text-[#141414] mt-0.5 sm:mt-1">
                ${kpis.averageOrderUsd.toFixed(2)}
              </p>
            </div>
          </div>

          {adminError && (
            <div className="mx-4 sm:mx-6 mt-4 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-[#D92323] font-medium shrink-0">
              {adminError}
            </div>
          )}

          {/* Main Workspace */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6">
            {activeTab === 'orders' ? (
              <div className="space-y-5">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 sm:gap-4">
                  <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 lg:pb-0">
                    {(
                      [
                        { id: 'all', label: 'Toutes' },
                        { id: 'active', label: 'En cours' },
                        { id: 'unpaid', label: 'Paiement en attente' },
                        { id: 'delivered', label: 'Livrées' },
                        { id: 'cancelled', label: 'Annulées' },
                      ] as const
                    ).map((f) => (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => setOrderFilter(f.id)}
                        className={`px-3.5 py-2 min-h-[38px] text-xs font-semibold rounded-lg whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                          orderFilter === f.id
                            ? 'bg-[#141414] text-white'
                            : 'bg-[#F5F5F7] text-zinc-600 hover:text-[#141414]'
                        }`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>

                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full lg:w-auto">
                    <div className="relative flex-1 sm:flex-initial">
                      <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="search"
                        value={orderSearch}
                        onChange={(e) => setOrderSearch(e.target.value)}
                        placeholder="Référence, nom, téléphone..."
                        className="pl-9 pr-4 py-2 min-h-[42px] text-base sm:text-sm bg-[#F5F5F7] rounded-lg border border-transparent focus:border-zinc-300 focus:bg-white focus:outline-none w-full sm:w-64"
                      />
                    </div>

                    <button
                      type="button"
                      disabled={filteredOrders.length === 0}
                      onClick={handleExportOrdersCsv}
                      className="inline-flex items-center justify-center gap-2 px-3.5 py-2 min-h-[42px] border border-zinc-300 bg-white text-[#141414] text-xs font-semibold rounded-lg hover:bg-[#F5F5F7] transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-40"
                    >
                      <Download className="w-4 h-4" />
                      <span>Exporter CSV</span>
                    </button>
                  </div>
                </div>

                {filteredOrders.length === 0 ? (
                  <div className="py-12 text-center border border-dashed border-zinc-200 rounded-2xl">
                    <p className="font-display text-base font-bold text-[#141414]">
                      Aucune commande dans cette vue
                    </p>
                    <p className="text-xs text-zinc-500 mt-1">
                      Les nouvelles commandes clients apparaîtront ici en temps réel.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredOrders.map((order) => {
                      const nextStep = getNextOrderStep(order);
                      return (
                        <div
                          key={order.id}
                          className="border border-zinc-200 rounded-xl p-4 sm:p-5 bg-white space-y-4"
                        >
                          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                            <div className="space-y-1">
                              <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500">
                                <span className="font-mono font-semibold text-[#141414]">
                                  {order.transactionReference}
                                </span>
                                <span>·</span>
                                <span>
                                  {order.deliveryMode === 'pickup'
                                    ? 'Retrait Comptoir'
                                    : 'Livraison'}
                                </span>
                                <span>·</span>
                                <span>{order.paymentProvider}</span>
                              </div>
                              <p className="font-display text-base font-bold text-[#141414]">
                                {order.customerName} · {order.customerPhone}
                              </p>
                              <p className="text-xs text-zinc-600">
                                {order.customerEmail} · {order.deliveryAddress}
                              </p>
                              {typeof order.deliveryLat === 'number' &&
                                typeof order.deliveryLng === 'number' && (
                                  <a
                                    href={`https://www.google.com/maps?q=${order.deliveryLat},${order.deliveryLng}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#D92323] hover:underline mt-1"
                                  >
                                    <MapPin className="w-3.5 h-3.5 shrink-0" />
                                    <span className="font-mono tabular-nums">
                                      GPS {order.deliveryLat.toFixed(5)},{' '}
                                      {order.deliveryLng.toFixed(5)}
                                    </span>
                                    {typeof order.deliveryAccuracy === 'number' && (
                                      <span className="text-zinc-500 font-normal">
                                        (±{order.deliveryAccuracy} m)
                                      </span>
                                    )}
                                    <ExternalLink className="w-3 h-3 shrink-0" />
                                  </a>
                                )}
                            </div>

                            <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-2.5 sm:gap-3">
                              <div className="sm:text-right sm:mr-2">
                                <p className="font-mono tabular-nums text-base font-bold text-[#141414]">
                                  {order.currency === 'CDF'
                                    ? `${order.totalAmount.toLocaleString('fr-FR')} FC`
                                    : `$${order.totalAmount.toFixed(2)}`}
                                </p>
                                {order.promoCode && (
                                  <p className="text-xs text-emerald-700 font-medium">
                                    Code {order.promoCode} (-$
                                    {(order.discountUsd || 0).toFixed(2)})
                                  </p>
                                )}
                              </div>

                              <div className="grid grid-cols-1 sm:flex sm:flex-wrap sm:items-center gap-2">
                                {nextStep && (
                                  <button
                                    type="button"
                                    disabled={updatingOrderId === order.id}
                                    onClick={() =>
                                      void handleOrderChange(
                                        order,
                                        order.paymentStatus,
                                        nextStep.nextStatus
                                      )
                                    }
                                    className="inline-flex items-center justify-center gap-1.5 px-3 py-2 min-h-[40px] bg-[#D92323] text-white text-xs font-semibold rounded-lg hover:bg-[#B81C1C] transition-colors whitespace-nowrap cursor-pointer disabled:opacity-45"
                                  >
                                    <span>{nextStep.label}</span>
                                    <ArrowRight className="w-3.5 h-3.5" />
                                  </button>
                                )}

                                <select
                                  aria-label="Statut paiement"
                                  disabled={updatingOrderId === order.id}
                                  value={order.paymentStatus}
                                  onChange={(e) =>
                                    void handleOrderChange(
                                      order,
                                      e.target.value as PaymentStatusType,
                                      order.orderStatus
                                    )
                                  }
                                  className="w-full sm:w-auto min-h-[40px] px-3 py-2 text-xs font-semibold border border-zinc-300 rounded-lg bg-white text-[#141414] cursor-pointer"
                                >
                                  {PAYMENT_STATUS_OPTIONS.map((opt) => (
                                    <option key={opt.value} value={opt.value}>
                                      Paiement : {opt.label}
                                    </option>
                                  ))}
                                </select>

                                <select
                                  aria-label="Statut commande"
                                  disabled={updatingOrderId === order.id}
                                  value={order.orderStatus}
                                  onChange={(e) =>
                                    void handleOrderChange(
                                      order,
                                      order.paymentStatus,
                                      e.target.value as OrderStatusType
                                    )
                                  }
                                  className="w-full sm:w-auto min-h-[40px] px-3 py-2 text-xs font-semibold border border-zinc-300 rounded-lg bg-[#141414] text-white cursor-pointer"
                                >
                                  {ORDER_STATUS_OPTIONS.map((opt) => (
                                    <option key={opt.value} value={opt.value}>
                                      {opt.label}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            </div>
                          </div>

                          <ul className="pt-3 border-t border-zinc-100 text-xs text-zinc-600 grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                            {order.itemsSummary.map((line, i) => (
                              <li key={i}>{line}</li>
                            ))}
                          </ul>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : activeTab === 'products' ? (
              <div className="space-y-6">
                {/* Products Toolbar */}
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div>
                    <h3 className="font-display text-lg font-bold text-[#141414]">
                      Catalogue en ligne ({products.length} articles)
                    </h3>
                    <p className="text-xs text-zinc-500">
                      {hasCloudProducts
                        ? 'Synchronisé en direct avec Firestore.'
                        : 'Mode catalogue initial — synchronisez pour activer l’édition cloud.'}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
                    {!hasCloudProducts && (
                      <button
                        type="button"
                        onClick={() => void handleSeedCatalog()}
                        disabled={seedingCatalog}
                        className="inline-flex items-center gap-2 px-4 py-2.5 min-h-[42px] border border-zinc-300 text-xs font-semibold rounded-lg hover:bg-zinc-50 transition-colors cursor-pointer disabled:opacity-50"
                      >
                        {seedingCatalog ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <PackagePlus className="w-4 h-4" />
                        )}
                        <span>Synchroniser le menu initial</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={openNewProductForm}
                      className="inline-flex items-center gap-2 px-4 py-2.5 min-h-[42px] bg-[#D92323] text-white text-xs font-semibold rounded-lg hover:bg-[#B81C1C] transition-colors cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Ajouter un produit</span>
                    </button>
                  </div>
                </div>

                {/* Product Search & Category / Stock Filters */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 p-3.5 bg-[#F5F5F7] rounded-xl">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="search"
                      value={productSearch}
                      onChange={(e) => setProductSearch(e.target.value)}
                      placeholder="Rechercher un article, ingrédient..."
                      className="w-full pl-9 pr-3 py-2 min-h-[40px] bg-white border border-zinc-200 rounded-lg text-sm focus:outline-none focus:border-zinc-400"
                    />
                  </div>

                  <select
                    aria-label="Filtrer par catégorie"
                    value={productCategoryFilter}
                    onChange={(e) => setProductCategoryFilter(e.target.value as MenuCategory)}
                    className="px-3 py-2 min-h-[40px] bg-white border border-zinc-200 rounded-lg text-xs font-semibold text-[#141414]"
                  >
                    <option value="all">Toutes catégories</option>
                    {CATEGORY_OPTIONS.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.label}
                      </option>
                    ))}
                  </select>

                  <select
                    aria-label="Filtrer par disponibilité"
                    value={productStockFilter}
                    onChange={(e) =>
                      setProductStockFilter(e.target.value as 'all' | 'available' | 'out')
                    }
                    className="px-3 py-2 min-h-[40px] bg-white border border-zinc-200 rounded-lg text-xs font-semibold text-[#141414]"
                  >
                    <option value="all">Tout le stock</option>
                    <option value="available">En stock uniquement</option>
                    <option value="out">Masqués / Épuisés</option>
                  </select>
                </div>

                {/* Create / Edit Product Form */}
                {(creatingNew || editingProduct) && (
                  <form
                    onSubmit={(e) => void handleSaveProduct(e)}
                    className="border border-zinc-300 rounded-2xl p-5 sm:p-6 bg-[#F5F5F7] space-y-5"
                  >
                    <div className="flex items-center justify-between">
                      <h4 className="font-display text-base font-bold text-[#141414]">
                        {creatingNew
                          ? 'Nouveau produit'
                          : `Modifier : ${editingProduct?.name}`}
                      </h4>
                      <button
                        type="button"
                        onClick={() => {
                          setCreatingNew(false);
                          setEditingProduct(null);
                        }}
                        className="text-xs font-semibold text-zinc-600 hover:text-[#141414] min-h-[36px] px-2 cursor-pointer"
                      >
                        Annuler
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="sm:col-span-2">
                        <label className="block text-xs font-semibold text-zinc-600 mb-1">
                          Nom du produit
                        </label>
                        <input
                          type="text"
                          required
                          maxLength={100}
                          value={formName}
                          onChange={(e) => setFormName(e.target.value)}
                          placeholder="Ex. : Pizza Quatre Fromages"
                          className="w-full px-3 py-2 min-h-[40px] text-sm bg-white border border-zinc-300 rounded-lg"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-zinc-600 mb-1">
                          Catégorie
                        </label>
                        <select
                          value={formCategory}
                          onChange={(e) => {
                            const val = e.target.value as Exclude<MenuCategory, 'all'>;
                            setFormCategory(val);
                            const match = CATEGORY_OPTIONS.find((c) => c.id === val);
                            if (match) setFormCategoryLabel(match.defaultLabel);
                          }}
                          className="w-full px-3 py-2 min-h-[40px] text-sm bg-white border border-zinc-300 rounded-lg"
                        >
                          {CATEGORY_OPTIONS.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-zinc-600 mb-1">
                          Prix (USD)
                        </label>
                        <input
                          type="number"
                          step="0.5"
                          min="0.5"
                          max="500"
                          required
                          value={formPriceUsd}
                          onChange={(e) => setFormPriceUsd(e.target.value)}
                          className="w-full px-3 py-2 min-h-[40px] text-sm bg-white border border-zinc-300 rounded-lg font-mono"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 items-start">
                      <div className="lg:col-span-2 flex flex-col sm:flex-row items-start gap-3">
                        <div className="w-28 h-24 rounded-xl overflow-hidden bg-white border border-zinc-200 shrink-0 sm:mt-5">
                          <FoodImage
                            src={formImage}
                            alt="Aperçu"
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="flex-1 w-full space-y-1.5 min-w-0">
                          <label className="block text-xs font-semibold text-zinc-600">
                            Photo du produit (fichier, lien URL ou galerie)
                          </label>
                          <AdminImageField
                            value={formImage}
                            onChange={setFormImage}
                            onUploadFile={(f) =>
                              void handleImageFileUpload(f, 'product', (url) => setFormImage(url))
                            }
                            isUploading={uploadingTarget === 'product'}
                            uploadedImages={uploadedImages}
                            presets={IMAGE_PRESETS}
                            selectAriaLabel="Choisir une photo pour le produit"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-zinc-600 mb-1">
                          Calories / Portion
                        </label>
                        <input
                          type="text"
                          required
                          maxLength={30}
                          value={formCalories}
                          onChange={(e) => setFormCalories(e.target.value)}
                          className="w-full px-3 py-2 min-h-[40px] text-sm bg-white border border-zinc-300 rounded-lg"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-zinc-600 mb-1">
                          Mention (optionnel)
                        </label>
                        <input
                          type="text"
                          maxLength={30}
                          placeholder="Ex. : Nouveau, Chef"
                          value={formTag}
                          onChange={(e) => setFormTag(e.target.value)}
                          className="w-full px-3 py-2 min-h-[40px] text-sm bg-white border border-zinc-300 rounded-lg"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-zinc-600 mb-1">
                        Description
                      </label>
                      <textarea
                        rows={2}
                        required
                        maxLength={400}
                        value={formDescription}
                        onChange={(e) => setFormDescription(e.target.value)}
                        className="w-full px-3 py-2 text-sm bg-white border border-zinc-300 rounded-lg"
                      />
                    </div>

                    {/* Add-ons / Suppléments Editor (max 10 per Firestore rules) */}
                    <div className="pt-2 border-t border-zinc-200 space-y-3">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-xs font-semibold text-[#141414]">
                            Suppléments &amp; Options ({formAddons.length} / 10)
                          </p>
                          <p className="text-[11px] text-zinc-500">
                            Affichés dans la fiche produit lors de la personnalisation client.
                          </p>
                        </div>
                        <button
                          type="button"
                          disabled={formAddons.length >= 10}
                          onClick={handleAddAddonRow}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 min-h-[36px] bg-white border border-zinc-300 text-xs font-semibold text-[#141414] rounded-lg hover:bg-zinc-50 cursor-pointer disabled:opacity-40"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Ajouter un supplément</span>
                        </button>
                      </div>

                      {formAddons.length > 0 && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                          {formAddons.map((addon, idx) => (
                            <div
                              key={`${addon.id}_${idx}`}
                              className="flex items-center gap-2 bg-white p-2 rounded-lg border border-zinc-200"
                            >
                              <input
                                type="text"
                                maxLength={80}
                                value={addon.label}
                                onChange={(e) =>
                                  handleUpdateAddonRow(idx, { label: e.target.value })
                                }
                                placeholder="Ex. : Extra bacon fumé"
                                className="flex-1 min-w-0 px-2.5 py-1.5 text-xs bg-[#F5F5F7] rounded border border-transparent focus:border-zinc-300 focus:bg-white focus:outline-none"
                              />
                              <input
                                type="number"
                                step="0.1"
                                min="0"
                                max="100"
                                value={addon.priceUsd}
                                onChange={(e) =>
                                  handleUpdateAddonRow(idx, {
                                    priceUsd: Number(e.target.value) || 0,
                                  })
                                }
                                aria-label="Prix supplément USD"
                                className="w-20 px-2 py-1.5 text-xs font-mono bg-[#F5F5F7] rounded border border-transparent focus:border-zinc-300 focus:bg-white focus:outline-none"
                              />
                              <button
                                type="button"
                                onClick={() => handleRemoveAddonRow(idx)}
                                aria-label="Retirer ce supplément"
                                className="p-1.5 text-zinc-400 hover:text-[#D92323] rounded cursor-pointer"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-zinc-200">
                      <div className="flex flex-wrap items-center gap-6 text-xs font-medium text-[#141414]">
                        <label className="inline-flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={formAvailable}
                            onChange={(e) => setFormAvailable(e.target.checked)}
                          />
                          <span>Disponible à la vente</span>
                        </label>

                        <label className="inline-flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={formSupportsCombo}
                            onChange={(e) => setFormSupportsCombo(e.target.checked)}
                          />
                          <span>Proposer en Menu Complet</span>
                        </label>

                        {formSupportsCombo && (
                          <label className="inline-flex items-center gap-2">
                            <span>Supplément Menu ($)</span>
                            <input
                              type="number"
                              step="0.5"
                              min="0"
                              max="50"
                              value={formComboExtraUsd}
                              onChange={(e) => setFormComboExtraUsd(e.target.value)}
                              className="w-20 px-2 py-1 bg-white border border-zinc-300 rounded font-mono"
                            />
                          </label>
                        )}
                      </div>

                      <button
                        type="submit"
                        disabled={savingProduct}
                        className="inline-flex items-center gap-2 px-5 py-2.5 min-h-[42px] bg-[#141414] text-white text-xs font-semibold rounded-lg hover:bg-zinc-800 transition-colors cursor-pointer disabled:opacity-50"
                      >
                        {savingProduct ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Check className="w-4 h-4" />
                        )}
                        <span>Enregistrer le produit</span>
                      </button>
                    </div>
                  </form>
                )}

                {/* Filtered Product Grid / Rows */}
                {filteredProducts.length === 0 ? (
                  <div className="py-10 text-center border border-dashed border-zinc-200 rounded-2xl">
                    <p className="font-display text-base font-bold text-[#141414]">
                      Aucun produit ne correspond à ces filtres
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {filteredProducts.map((item) => (
                      <div
                        key={item.id}
                        className="border border-zinc-200 rounded-xl p-3.5 sm:p-4 flex items-center gap-3.5 bg-white"
                      >
                        <div className="w-18 h-16 rounded-lg overflow-hidden bg-[#F5F5F7] shrink-0">
                          <FoodImage
                            src={item.image}
                            alt={item.name}
                            className="w-full h-full object-cover"
                          />
                        </div>

                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] text-zinc-500 truncate">
                            {item.categoryLabel} · {item.available ? 'En stock' : 'Épuisé'}
                          </p>
                          <p className="font-display text-sm font-bold text-[#141414] truncate">
                            {item.name}
                          </p>
                          <p className="font-mono tabular-nums text-xs font-semibold text-zinc-700 mt-0.5">
                            ${item.priceUsd.toFixed(2)}
                            {item.addons.length > 0 && (
                              <span className="font-sans font-normal text-zinc-400">
                                {' '}
                                · {item.addons.length} opt.
                              </span>
                            )}
                          </p>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => void handleToggleAvailable(item)}
                            className={`px-2 py-1.5 min-h-[36px] text-[11px] font-semibold rounded-lg transition-colors cursor-pointer ${
                              item.available
                                ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                                : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                            }`}
                          >
                            {item.available ? 'Actif' : 'Masqué'}
                          </button>
                          <button
                            type="button"
                            onClick={() => openEditProductForm(item)}
                            aria-label={`Modifier ${item.name}`}
                            className="p-2 min-w-[36px] min-h-[36px] text-zinc-600 hover:text-[#141414] hover:bg-[#F5F5F7] rounded-lg transition-colors cursor-pointer"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDuplicateProduct(item)}
                            aria-label={`Dupliquer ${item.name}`}
                            className="p-2 min-w-[36px] min-h-[36px] text-zinc-500 hover:text-[#141414] hover:bg-[#F5F5F7] rounded-lg transition-colors cursor-pointer"
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                          {confirmDeleteId === item.id ? (
                            <button
                              type="button"
                              onClick={() => void handleDeleteProduct(item.id)}
                              className="px-2.5 py-1.5 min-h-[36px] bg-[#D92323] text-white text-xs font-semibold rounded-lg cursor-pointer"
                            >
                              Confirmer
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(item.id)}
                              aria-label={`Supprimer ${item.name}`}
                              className="p-2 min-w-[36px] min-h-[36px] text-zinc-400 hover:text-[#D92323] hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : activeTab === 'analytics' ? (
              /* ANALYTICS TAB */
              <div className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Payment Providers Breakdown */}
                  <div className="border border-zinc-200 rounded-2xl p-5 bg-white space-y-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                        Encaissements confirmés
                      </p>
                      <h3 className="font-display text-lg font-bold text-[#141414]">
                        Répartition par fournisseur
                      </h3>
                    </div>

                    {analyticsBreakdown.providerRows.length === 0 ? (
                      <p className="text-xs text-zinc-500 py-6">
                        Aucune commande payée enregistrée pour le moment.
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {analyticsBreakdown.providerRows.map((row) => {
                          const sharePct =
                            kpis.revenueUsd > 0
                              ? Math.round((row.revenueUsd / kpis.revenueUsd) * 100)
                              : 0;
                          return (
                            <div key={row.provider} className="space-y-1.5">
                              <div className="flex items-center justify-between text-xs">
                                <span className="font-semibold text-[#141414]">
                                  {row.provider}{' '}
                                  <span className="text-zinc-500 font-normal">
                                    ({row.count})
                                  </span>
                                </span>
                                <span className="font-mono tabular-nums font-semibold text-[#141414]">
                                  ${row.revenueUsd.toFixed(2)} · {sharePct}%
                                </span>
                              </div>
                              <div className="h-2 bg-[#F5F5F7] rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-[#D92323] rounded-full"
                                  style={{ width: `${Math.max(4, sharePct)}%` }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Delivery Mode & Conversion Summary */}
                  <div className="border border-zinc-200 rounded-2xl p-5 bg-white space-y-5">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                        Logistique &amp; Conversion
                      </p>
                      <h3 className="font-display text-lg font-bold text-[#141414]">
                        Modes de remise &amp; Stock par famille
                      </h3>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3.5 rounded-xl bg-[#F5F5F7]">
                        <p className="text-xs text-zinc-500">Livraison adresse</p>
                        <p className="font-mono tabular-nums text-xl font-bold text-[#141414] mt-1">
                          {analyticsBreakdown.deliveryCount}
                        </p>
                      </div>
                      <div className="p-3.5 rounded-xl bg-[#F5F5F7]">
                        <p className="text-xs text-zinc-500">Retrait comptoir</p>
                        <p className="font-mono tabular-nums text-xl font-bold text-[#141414] mt-1">
                          {analyticsBreakdown.pickupCount}
                        </p>
                      </div>
                    </div>

                    <div className="divide-y divide-zinc-100 border-t border-zinc-100">
                      {analyticsBreakdown.categoryInventory.map((cat) => (
                        <div
                          key={cat.id}
                          className="py-2.5 flex items-center justify-between text-xs"
                        >
                          <span className="font-medium text-[#141414]">{cat.label}</span>
                          <span className="font-mono tabular-nums text-zinc-600">
                            {cat.active} / {cat.total} actifs
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* SITE & POSTERS CUSTOMIZATION TAB */
              <form onSubmit={(e) => void handleSaveSiteSettings(e)} className="space-y-8">
                {/* Header Action Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-200">
                  <div>
                    <h3 className="font-display text-lg font-bold text-[#141414]">
                      Identité, Adresse, Affiches &amp; Tarifs
                    </h3>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      Remplacez toutes les affiches du site avec vos propres photos et adaptez
                      l’adresse à votre marché en temps réel.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                    {siteSavedNotice && (
                      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 px-3 py-2 rounded-lg">
                        <Check className="w-3.5 h-3.5" />
                        <span>Site mis à jour en direct</span>
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => setSiteForm(DEFAULT_SITE_SETTINGS)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 min-h-[40px] border border-zinc-300 text-xs font-semibold text-zinc-700 rounded-lg hover:bg-[#F5F5F7] transition-colors cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Valeurs initiales</span>
                    </button>
                    <button
                      type="submit"
                      disabled={savingSite}
                      className="inline-flex items-center gap-2 px-5 py-2 min-h-[42px] bg-[#D92323] text-white text-xs font-semibold rounded-lg hover:bg-[#B81C1C] transition-colors cursor-pointer disabled:opacity-50"
                    >
                      {savingSite ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Check className="w-4 h-4" />
                      )}
                      <span>Enregistrer la configuration</span>
                    </button>
                  </div>
                </div>

                {/* 1. ALL 6 SITE POSTERS & SECTION PHOTOS */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                        Visuels éditoriaux du site (6 emplacements)
                      </p>
                      <h4 className="font-display text-base font-bold text-[#141414]">
                        Affiches d’accueil, Pizza, Poulet Crispy, Frites &amp; Milkshake
                      </h4>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {SITE_POSTER_SLOTS.map((slot) => {
                      const currentUrl = siteForm[slot.key];
                      const isUploading = uploadingTarget === slot.key;
                      return (
                        <div
                          key={slot.key}
                          className="border border-zinc-200 rounded-2xl p-4 bg-[#F5F5F7] space-y-3 flex flex-col"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="font-display text-sm font-bold text-[#141414]">
                                {slot.title}
                              </p>
                              <p className="text-[11px] text-zinc-500">{slot.locationHint}</p>
                            </div>
                            <button
                              type="button"
                              onClick={() =>
                                setSiteForm((prev) => ({
                                  ...prev,
                                  [slot.key]: DEFAULT_SITE_SETTINGS[slot.key],
                                }))
                              }
                              title="Restaurer l’affiche par défaut"
                              className="text-[11px] font-semibold text-zinc-500 hover:text-[#141414] px-2 py-1 rounded bg-white border border-zinc-200 shrink-0 cursor-pointer"
                            >
                              Défaut
                            </button>
                          </div>

                          <div className="aspect-[16/10] w-full rounded-xl overflow-hidden bg-white border border-zinc-200">
                            <FoodImage
                              src={currentUrl}
                              alt={slot.title}
                              className="w-full h-full object-cover"
                            />
                          </div>

                          <div className="mt-auto">
                            <AdminImageField
                              compact
                              value={currentUrl}
                              onChange={(nextUrl) =>
                                setSiteForm((prev) => ({ ...prev, [slot.key]: nextUrl }))
                              }
                              onUploadFile={(f) =>
                                void handleImageFileUpload(f, slot.key, (url) =>
                                  setSiteForm((prev) => ({ ...prev, [slot.key]: url }))
                                )
                              }
                              isUploading={isUploading}
                              uploadedImages={uploadedImages}
                              presets={IMAGE_PRESETS}
                              selectAriaLabel={`Choisir une photo pour ${slot.title}`}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 2. STORE IDENTITY, MARKET ADDRESS & CONTACT */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="border border-zinc-200 rounded-2xl p-5 bg-white space-y-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                        Localisation &amp; Identité Boutique
                      </p>
                      <h4 className="font-display text-base font-bold text-[#141414]">
                        Adresse, Ville, Horaires &amp; Contact
                      </h4>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      <div>
                        <label className="block text-xs font-semibold text-zinc-600 mb-1">
                          Nom de la marque
                        </label>
                        <input
                          type="text"
                          required
                          maxLength={60}
                          value={siteForm.brandName}
                          onChange={(e) =>
                            setSiteForm((prev) => ({ ...prev, brandName: e.target.value }))
                          }
                          placeholder="MAISON SMASH"
                          className="w-full px-3 py-2 min-h-[40px] text-sm bg-[#F5F5F7] border border-zinc-200 rounded-lg focus:bg-white focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-zinc-600 mb-1">
                          Ville / Marché affiché
                        </label>
                        <input
                          type="text"
                          required
                          maxLength={80}
                          value={siteForm.storeCity}
                          onChange={(e) =>
                            setSiteForm((prev) => ({ ...prev, storeCity: e.target.value }))
                          }
                          placeholder="Ex. : Lubumbashi, Abidjan, Dakar, Paris..."
                          className="w-full px-3 py-2 min-h-[40px] text-sm bg-[#F5F5F7] border border-zinc-200 rounded-lg focus:bg-white focus:outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-zinc-600 mb-1">
                        Adresse complète du restaurant / point de retrait
                      </label>
                      <input
                        type="text"
                        required
                        maxLength={240}
                        value={siteForm.storeAddress}
                        onChange={(e) =>
                          setSiteForm((prev) => ({ ...prev, storeAddress: e.target.value }))
                        }
                        placeholder="Avenue, numéro, quartier, ville..."
                        className="w-full px-3 py-2 min-h-[40px] text-sm bg-[#F5F5F7] border border-zinc-200 rounded-lg focus:bg-white focus:outline-none"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      <div>
                        <label className="block text-xs font-semibold text-zinc-600 mb-1">
                          Horaires d’ouverture
                        </label>
                        <input
                          type="text"
                          required
                          maxLength={80}
                          value={siteForm.openingHours}
                          onChange={(e) =>
                            setSiteForm((prev) => ({ ...prev, openingHours: e.target.value }))
                          }
                          placeholder="11h00 – 23h30 · Tous les jours"
                          className="w-full px-3 py-2 min-h-[40px] text-sm bg-[#F5F5F7] border border-zinc-200 rounded-lg focus:bg-white focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-zinc-600 mb-1">
                          Téléphone / WhatsApp
                        </label>
                        <input
                          type="text"
                          maxLength={30}
                          value={siteForm.contactPhone}
                          onChange={(e) =>
                            setSiteForm((prev) => ({ ...prev, contactPhone: e.target.value }))
                          }
                          placeholder="+243 81 000 0000"
                          className="w-full px-3 py-2 min-h-[40px] text-sm bg-[#F5F5F7] border border-zinc-200 rounded-lg focus:bg-white focus:outline-none font-mono"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-zinc-600 mb-1">
                        Email de contact (pied de page)
                      </label>
                      <input
                        type="email"
                        maxLength={160}
                        value={siteForm.contactEmail}
                        onChange={(e) =>
                          setSiteForm((prev) => ({ ...prev, contactEmail: e.target.value }))
                        }
                        placeholder="contact@votremarque.com"
                        className="w-full px-3 py-2 min-h-[40px] text-sm bg-[#F5F5F7] border border-zinc-200 rounded-lg focus:bg-white focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* 3. HERO COPY & DELIVERY / CURRENCY RULES */}
                  <div className="space-y-6">
                    <div className="border border-zinc-200 rounded-2xl p-5 bg-white space-y-4">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                          Éditorial Accueil
                        </p>
                        <h4 className="font-display text-base font-bold text-[#141414]">
                          Textes du bandeau Hero
                        </h4>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-zinc-600 mb-1">
                          Surtitre (après la ville)
                        </label>
                        <input
                          type="text"
                          required
                          maxLength={100}
                          value={siteForm.heroKicker}
                          onChange={(e) =>
                            setSiteForm((prev) => ({ ...prev, heroKicker: e.target.value }))
                          }
                          className="w-full px-3 py-2 min-h-[40px] text-sm bg-[#F5F5F7] border border-zinc-200 rounded-lg focus:bg-white focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-zinc-600 mb-1">
                          Grand titre principal (H1)
                        </label>
                        <input
                          type="text"
                          required
                          maxLength={140}
                          value={siteForm.heroTitle}
                          onChange={(e) =>
                            setSiteForm((prev) => ({ ...prev, heroTitle: e.target.value }))
                          }
                          className="w-full px-3 py-2 min-h-[40px] text-sm bg-[#F5F5F7] border border-zinc-200 rounded-lg focus:bg-white focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-zinc-600 mb-1">
                          Texte de présentation
                        </label>
                        <textarea
                          rows={2}
                          required
                          maxLength={320}
                          value={siteForm.heroSubtitle}
                          onChange={(e) =>
                            setSiteForm((prev) => ({ ...prev, heroSubtitle: e.target.value }))
                          }
                          className="w-full px-3 py-2 text-sm bg-[#F5F5F7] border border-zinc-200 rounded-lg focus:bg-white focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="border border-zinc-200 rounded-2xl p-5 bg-white space-y-4">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                          Livraison &amp; Devises
                        </p>
                        <h4 className="font-display text-base font-bold text-[#141414]">
                          Frais, Seuil gratuit &amp; Taux de change
                        </h4>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-xs font-semibold text-zinc-600 mb-1">
                            Frais livraison ($)
                          </label>
                          <input
                            type="number"
                            step="0.5"
                            min="0"
                            max="500"
                            required
                            value={siteForm.deliveryFeeUsd}
                            onChange={(e) =>
                              setSiteForm((prev) => ({
                                ...prev,
                                deliveryFeeUsd: Number(e.target.value) || 0,
                              }))
                            }
                            className="w-full px-3 py-2 min-h-[40px] text-sm font-mono bg-[#F5F5F7] border border-zinc-200 rounded-lg focus:bg-white focus:outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-zinc-600 mb-1">
                            Seuil gratuit ($)
                          </label>
                          <input
                            type="number"
                            step="1"
                            min="0"
                            max="5000"
                            required
                            value={siteForm.freeDeliveryThresholdUsd}
                            onChange={(e) =>
                              setSiteForm((prev) => ({
                                ...prev,
                                freeDeliveryThresholdUsd: Number(e.target.value) || 0,
                              }))
                            }
                            className="w-full px-3 py-2 min-h-[40px] text-sm font-mono bg-[#F5F5F7] border border-zinc-200 rounded-lg focus:bg-white focus:outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-zinc-600 mb-1">
                            1 USD en CDF
                          </label>
                          <input
                            type="number"
                            step="10"
                            min="100"
                            max="100000"
                            required
                            value={siteForm.usdToCdfRate}
                            onChange={(e) =>
                              setSiteForm((prev) => ({
                                ...prev,
                                usdToCdfRate: Number(e.target.value) || 2850,
                              }))
                            }
                            className="w-full px-3 py-2 min-h-[40px] text-sm font-mono bg-[#F5F5F7] border border-zinc-200 rounded-lg focus:bg-white focus:outline-none"
                          />
                        </div>
                      </div>

                      <label className="inline-flex items-center gap-2.5 text-xs font-medium text-[#141414] cursor-pointer pt-1">
                        <input
                          type="checkbox"
                          checked={siteForm.enableCdfCurrency}
                          onChange={(e) =>
                            setSiteForm((prev) => ({
                              ...prev,
                              enableCdfCurrency: e.target.checked,
                            }))
                          }
                        />
                        <span>
                          Proposer le sélecteur et paiement en Francs Congolais (CDF) sur la carte
                        </span>
                      </label>
                    </div>
                  </div>
                </div>

                {/* Bottom Save Footer */}
                <div className="flex flex-wrap items-center justify-end gap-3 pt-4 border-t border-zinc-200">
                  <button
                    type="button"
                    onClick={() =>
                      setSiteForm((prev) => normalizeSiteSettings(prev))
                    }
                    className="px-4 py-2 min-h-[40px] border border-zinc-300 text-xs font-semibold text-zinc-700 rounded-lg hover:bg-[#F5F5F7] cursor-pointer"
                  >
                    Vérifier les champs
                  </button>
                  <button
                    type="submit"
                    disabled={savingSite}
                    className="inline-flex items-center gap-2 px-6 py-2.5 min-h-[42px] bg-[#141414] text-white text-xs font-semibold rounded-lg hover:bg-[#D92323] transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {savingSite ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Check className="w-4 h-4" />
                    )}
                    <span>Enregistrer toutes les modifications du site</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
