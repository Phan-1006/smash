import { useMemo, useState } from 'react';
import { User } from 'firebase/auth';
import {
  Check,
  Edit3,
  ExternalLink,
  Loader2,
  MapPin,
  PackagePlus,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import {
  IMAGE_PRESETS,
  MENU_ITEMS,
  MenuCategory,
  MenuItem,
} from '../data/menu';
import {
  deleteProduct,
  sanitizeId,
  seedCatalogToFirestore,
  updateOrderPaymentState,
  upsertProduct,
} from '../services/storefrontService';
import type {
  OrderDoc,
  OrderStatusType,
  PaymentStatusType,
} from '../types/ecommerce';
import { FoodImage } from './FoodImage';

interface AdminPanelProps {
  open: boolean;
  user: User | null;
  orders: OrderDoc[];
  products: MenuItem[];
  hasCloudProducts: boolean;
  onClose: () => void;
}

const CATEGORY_OPTIONS: { id: Exclude<MenuCategory, 'all'>; label: string; defaultLabel: string }[] =
  [
    { id: 'burgers', label: 'Smash Burgers', defaultLabel: 'Smash Burger' },
    { id: 'pizzas', label: 'Pizzas', defaultLabel: 'Pizza Artisanale' },
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

export function AdminPanel({
  open,
  user,
  orders,
  products,
  hasCloudProducts,
  onClose,
}: AdminPanelProps) {
  const [activeTab, setActiveTab] = useState<'orders' | 'products'>('orders');
  const [orderSearch, setOrderSearch] = useState('');
  const [orderFilter, setOrderFilter] = useState<'all' | 'active' | 'delivered' | 'unpaid'>('all');
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);

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
  const [formImage, setFormImage] = useState(IMAGE_PRESETS[3].url);
  const [formTag, setFormTag] = useState('');
  const [formAvailable, setFormAvailable] = useState(true);
  const [formSupportsCombo, setFormSupportsCombo] = useState(true);
  const [formComboExtraUsd, setFormComboExtraUsd] = useState('4.00');
  const [adminError, setAdminError] = useState<string | null>(null);

  const kpis = useMemo(() => {
    const paidOrders = orders.filter((o) => o.paymentStatus === 'PAID');
    const revenueUsd = paidOrders.reduce((sum, o) => sum + (o.subtotalUsd + o.deliveryFeeUsd - (o.discountUsd || 0)), 0);
    const activeKitchen = orders.filter((o) =>
      o.orderStatus === 'PREPARING' || o.orderStatus === 'READY' || o.orderStatus === 'DELIVERING'
    ).length;
    const availableCount = products.filter((p) => p.available).length;
    return {
      revenueUsd,
      paidCount: paidOrders.length,
      activeKitchen,
      totalOrders: orders.length,
      availableCount,
      totalProducts: products.length,
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
        (orderFilter === 'unpaid' && o.paymentStatus === 'PENDING');

      const matchesSearch =
        !q ||
        o.transactionReference.toLowerCase().includes(q) ||
        o.customerName.toLowerCase().includes(q) ||
        o.customerPhone.toLowerCase().includes(q) ||
        o.customerEmail.toLowerCase().includes(q);

      return matchesFilter && matchesSearch;
    });
  }, [orders, orderFilter, orderSearch]);

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
    setFormImage(IMAGE_PRESETS[3].url);
    setFormTag('Nouveau');
    setFormAvailable(true);
    setFormSupportsCombo(true);
    setFormComboExtraUsd('4.00');
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
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
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
          addons: editingProduct?.addons || [],
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
    try {
      await updateOrderPaymentState(order.id, nextPaymentStatus, nextOrderStatus);
    } finally {
      setUpdatingOrderId(null);
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
                Gestion Boutique & Cuisine
              </h2>
            </div>

            <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-3 w-full sm:w-auto">
              <div className="inline-flex p-1 bg-[#F5F5F7] rounded-lg">
                <button
                  type="button"
                  onClick={() => setActiveTab('orders')}
                  className={`px-3 sm:px-4 py-1.5 min-h-[36px] text-xs font-semibold rounded-md transition-colors whitespace-nowrap cursor-pointer ${
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
                  className={`px-3 sm:px-4 py-1.5 min-h-[36px] text-xs font-semibold rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                    activeTab === 'products'
                      ? 'bg-[#141414] text-white'
                      : 'text-zinc-600 hover:text-[#141414]'
                  }`}
                >
                  Produits ({products.length})
                </button>
              </div>

              <button
                type="button"
                onClick={onClose}
                aria-label="Fermer l’administration"
                className="p-2 min-w-[44px] min-h-[44px] inline-flex items-center justify-center text-zinc-500 hover:text-[#141414] hover:bg-[#F5F5F7] rounded-lg transition-colors cursor-pointer"
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
              <p className="text-[11px] sm:text-xs text-zinc-500">Produits actifs</p>
              <p className="font-mono tabular-nums text-lg sm:text-xl font-bold text-[#141414] mt-0.5 sm:mt-1">
                {kpis.availableCount} / {kpis.totalProducts}
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
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4">
                  <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 md:pb-0">
                    {(
                      [
                        { id: 'all', label: 'Toutes' },
                        { id: 'active', label: 'En cours' },
                        { id: 'unpaid', label: 'Paiement en attente' },
                        { id: 'delivered', label: 'Livrées' },
                      ] as const
                    ).map((f) => (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => setOrderFilter(f.id)}
                        className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                          orderFilter === f.id
                            ? 'bg-[#141414] text-white'
                            : 'bg-[#F5F5F7] text-zinc-600 hover:text-[#141414]'
                        }`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>

                  <div className="relative w-full md:w-auto">
                    <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="search"
                      value={orderSearch}
                      onChange={(e) => setOrderSearch(e.target.value)}
                      placeholder="Référence, nom, téléphone..."
                      className="pl-9 pr-4 py-2 min-h-[42px] text-base sm:text-sm bg-[#F5F5F7] rounded-lg border border-transparent focus:border-zinc-300 focus:bg-white focus:outline-none w-full md:w-72"
                    />
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
                    {filteredOrders.map((order) => (
                      <div
                        key={order.id}
                        className="border border-zinc-200 rounded-xl p-5 bg-white space-y-4"
                      >
                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 text-xs text-zinc-500">
                              <span className="font-mono font-semibold text-[#141414]">
                                {order.transactionReference}
                              </span>
                              <span>·</span>
                              <span>
                                {order.deliveryMode === 'pickup' ? 'Retrait Comptoir' : 'Livraison'}
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
                                    GPS {order.deliveryLat.toFixed(5)}, {order.deliveryLng.toFixed(5)}
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
                                  Code {order.promoCode} (-${(order.discountUsd || 0).toFixed(2)})
                                </p>
                              )}
                            </div>

                            <div className="grid grid-cols-1 xs:grid-cols-2 sm:flex sm:items-center gap-2">
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
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-6">
                {/* Products Toolbar */}
                <div className="flex flex-wrap items-center justify-between gap-4">
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

                  <div className="flex items-center gap-3">
                    {!hasCloudProducts && (
                      <button
                        type="button"
                        onClick={() => void handleSeedCatalog()}
                        disabled={seedingCatalog}
                        className="inline-flex items-center gap-2 px-4 py-2.5 border border-zinc-300 text-xs font-semibold rounded-lg hover:bg-zinc-50 transition-colors cursor-pointer disabled:opacity-50"
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
                      className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#D92323] text-white text-xs font-semibold rounded-lg hover:bg-[#B81C1C] transition-colors cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Ajouter un produit</span>
                    </button>
                  </div>
                </div>

                {/* Create / Edit Product Form */}
                {(creatingNew || editingProduct) && (
                  <form
                    onSubmit={(e) => void handleSaveProduct(e)}
                    className="border border-zinc-300 rounded-2xl p-6 bg-[#F5F5F7] space-y-4"
                  >
                    <div className="flex items-center justify-between">
                      <h4 className="font-display text-base font-bold text-[#141414]">
                        {creatingNew ? 'Nouveau produit' : `Modifier : ${editingProduct?.name}`}
                      </h4>
                      <button
                        type="button"
                        onClick={() => {
                          setCreatingNew(false);
                          setEditingProduct(null);
                        }}
                        className="text-xs font-semibold text-zinc-600 hover:text-[#141414] cursor-pointer"
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
                          className="w-full px-3 py-2 text-sm bg-white border border-zinc-300 rounded-lg"
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
                          className="w-full px-3 py-2 text-sm bg-white border border-zinc-300 rounded-lg"
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
                          className="w-full px-3 py-2 text-sm bg-white border border-zinc-300 rounded-lg font-mono"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-zinc-600 mb-1">
                          Photo (galerie studio)
                        </label>
                        <select
                          value={formImage}
                          onChange={(e) => setFormImage(e.target.value)}
                          className="w-full px-3 py-2 text-sm bg-white border border-zinc-300 rounded-lg"
                        >
                          {IMAGE_PRESETS.map((preset) => (
                            <option key={preset.url} value={preset.url}>
                              {preset.label}
                            </option>
                          ))}
                        </select>
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
                          className="w-full px-3 py-2 text-sm bg-white border border-zinc-300 rounded-lg"
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
                          className="w-full px-3 py-2 text-sm bg-white border border-zinc-300 rounded-lg"
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

                    <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
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
                        className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#141414] text-white text-xs font-semibold rounded-lg hover:bg-zinc-800 transition-colors cursor-pointer disabled:opacity-50"
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

                {/* Product Grid / Rows */}
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {products.map((item) => (
                    <div
                      key={item.id}
                      className="border border-zinc-200 rounded-xl p-3.5 sm:p-4 flex items-center gap-3.5 sm:gap-4 bg-white"
                    >
                      <div className="w-20 h-16 rounded-lg overflow-hidden bg-[#F5F5F7] shrink-0">
                        <FoodImage
                          src={item.image}
                          alt={item.name}
                          className="w-full h-full object-cover"
                        />
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-zinc-500">
                          {item.categoryLabel} · {item.available ? 'En stock' : 'Épuisé'}
                        </p>
                        <p className="font-display text-sm font-bold text-[#141414] truncate">
                          {item.name}
                        </p>
                        <p className="font-mono tabular-nums text-xs font-semibold text-zinc-700 mt-0.5">
                          ${item.priceUsd.toFixed(2)}
                        </p>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => void handleToggleAvailable(item)}
                          className={`px-2.5 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
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
                          className="p-2 text-zinc-600 hover:text-[#141414] hover:bg-[#F5F5F7] rounded-lg transition-colors cursor-pointer"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        {confirmDeleteId === item.id ? (
                          <button
                            type="button"
                            onClick={() => void handleDeleteProduct(item.id)}
                            className="px-2.5 py-1.5 bg-[#D92323] text-white text-xs font-semibold rounded-lg cursor-pointer"
                          >
                            Confirmer
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(item.id)}
                            aria-label={`Supprimer ${item.name}`}
                            className="p-2 text-zinc-400 hover:text-[#D92323] hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
