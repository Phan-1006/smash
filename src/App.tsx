import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  getRedirectResult,
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  User,
} from 'firebase/auth';
import { Check } from 'lucide-react';
import { AnimatePresence, motion, MotionConfig } from 'motion/react';
import { AdminPanel } from './components/AdminPanel';
import { BurgerStorySection } from './components/BurgerStorySection';
import { CartDrawer } from './components/CartDrawer';
import { CatalogCtaSection } from './components/CatalogCtaSection';
import { CheckoutModal } from './components/CheckoutModal';
import { CraftSection } from './components/CraftSection';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Footer } from './components/Footer';
import { HeroSection } from './components/HeroSection';
import { MenuSection } from './components/MenuSection';
import { Navbar } from './components/Navbar';
import { OrdersPanel } from './components/OrdersPanel';
import { ProductModal } from './components/ProductModal';
import { ShowcaseSection } from './components/ShowcaseSection';
import { MENU_ITEMS, MenuCategory, MenuItem } from './data/menu';
import { auth, googleProvider, testFirestoreConnection } from './firebase';
import {
  clearUserCart,
  ensureUserProfile,
  removeCartItem,
  sanitizeId,
  subscribeAllOrdersForAdmin,
  subscribeProducts,
  subscribeUserCart,
  subscribeUserOrders,
  subscribeUserProfile,
  updateCartItemQty,
  upsertCartItem,
} from './services/storefrontService';
import {
  CartItemDoc,
  CurrencyCode,
  DeliveryMode,
  isAdminUser,
  OrderDoc,
  ProductDoc,
  UserProfileDoc,
} from './types/ecommerce';

const GUEST_CART_STORAGE_KEY = 'maison_smash_guest_cart_v1';

function loadGuestCart(): CartItemDoc[] {
  try {
    const raw = window.localStorage.getItem(GUEST_CART_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as CartItemDoc[]) : [];
  } catch {
    return [];
  }
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);

  const [cloudProducts, setCloudProducts] = useState<ProductDoc[]>([]);
  const [profile, setProfile] = useState<UserProfileDoc | null>(null);
  const [cloudCart, setCloudCart] = useState<CartItemDoc[]>([]);
  const [guestCart, setGuestCart] = useState<CartItemDoc[]>(() => loadGuestCart());
  const [orders, setOrders] = useState<OrderDoc[]>([]);
  const [adminOrders, setAdminOrders] = useState<OrderDoc[]>([]);

  const [currency, setCurrency] = useState<CurrencyCode>('USD');
  const [menuCategory, setMenuCategory] = useState<MenuCategory>('all');
  const [deliveryMode, setDeliveryMode] = useState<DeliveryMode>('delivery');
  const [promoCode, setPromoCode] = useState<string | null>(null);

  const [selectedProduct, setSelectedProduct] = useState<MenuItem | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [ordersOpen, setOrdersOpen] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const authPromiseRef = useRef<Promise<string | null> | null>(null);

  const showToast = useCallback((msg: string, durationMs = 3000) => {
    setToastMessage(msg);
    window.setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, durationMs);
  }, []);

  useEffect(() => {
    testFirestoreConnection();
    const unsubProducts = subscribeProducts(setCloudProducts);
    getRedirectResult(auth).catch((err) => {
      const code =
        typeof err === 'object' && err !== null && 'code' in err
          ? String((err as { code?: unknown }).code)
          : '';
      if (code === 'auth/unauthorized-domain') {
        showToast(
          `Domaine non autorisé (${window.location.hostname}) dans Firebase Authentication.`,
          6500
        );
      } else if (code) {
        console.error('Google redirect error:', code, err);
      }
    });
    return () => unsubProducts();
  }, [showToast]);

  // Use Firestore catalog when seeded, fallback to default MENU_ITEMS
  const activeMenu: MenuItem[] = useMemo(() => {
    if (cloudProducts.length > 0) {
      return cloudProducts;
    }
    return MENU_ITEMS;
  }, [cloudProducts]);

  const signatureBurger = useMemo(
    () =>
      activeMenu.find((item) => item.id === 'maison-triple-crust') ||
      activeMenu.find((item) => item.category === 'burgers') ||
      activeMenu[0],
    [activeMenu]
  );

  const handleExploreCategory = useCallback((category: MenuCategory) => {
    setMenuCategory(category);
    const menuEl = document.getElementById('menu');
    if (menuEl) {
      menuEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, []);

  // Persist guest cart locally while signed out
  useEffect(() => {
    if (!user) {
      try {
        window.localStorage.setItem(GUEST_CART_STORAGE_KEY, JSON.stringify(guestCart));
      } catch {
        // Ignore storage quota errors
      }
    }
  }, [guestCart, user]);

  // Real Firebase Auth State + Firestore listeners
  useEffect(() => {
    let unsubProfile: (() => void) | undefined;
    let unsubCart: (() => void) | undefined;
    let unsubOrders: (() => void) | undefined;
    let unsubAdminOrders: (() => void) | undefined;

    const unsubAuth = onAuthStateChanged(auth, async (nextUser) => {
      if (unsubProfile) unsubProfile();
      if (unsubCart) unsubCart();
      if (unsubOrders) unsubOrders();
      if (unsubAdminOrders) unsubAdminOrders();

      setUser(nextUser);
      setAuthReady(true);

      if (nextUser) {
        try {
          await ensureUserProfile(nextUser);

          // Migrate any guest cart items into Firestore cart
          const pendingGuest = loadGuestCart();
          if (pendingGuest.length > 0) {
            for (const gItem of pendingGuest) {
              await upsertCartItem(nextUser.uid, { ...gItem, userId: nextUser.uid });
            }
            window.localStorage.removeItem(GUEST_CART_STORAGE_KEY);
            setGuestCart([]);
          }
        } catch (err) {
          console.error('Synchronisation profil/panier interrompue:', err);
        }

        unsubProfile = subscribeUserProfile(nextUser.uid, setProfile);
        unsubCart = subscribeUserCart(nextUser.uid, setCloudCart);
        unsubOrders = subscribeUserOrders(nextUser.uid, setOrders);

        if (isAdminUser(nextUser)) {
          unsubAdminOrders = subscribeAllOrdersForAdmin(setAdminOrders);
        } else {
          setAdminOrders([]);
          setAdminOpen(false);
        }
      } else {
        setProfile(null);
        setCloudCart([]);
        setOrders([]);
        setAdminOrders([]);
        setAdminOpen(false);
      }
    });

    return () => {
      unsubAuth();
      if (unsubProfile) unsubProfile();
      if (unsubCart) unsubCart();
      if (unsubOrders) unsubOrders();
      if (unsubAdminOrders) unsubAdminOrders();
    };
  }, []);

  const activeCart = useMemo(() => (user ? cloudCart : guestCart), [user, cloudCart, guestCart]);

  const cartCount = useMemo(
    () => activeCart.reduce((total, item) => total + item.quantity, 0),
    [activeCart]
  );

  const handleSignInGoogle = useCallback(async (): Promise<string | null> => {
    if (auth.currentUser) {
      return null;
    }
    if (authPromiseRef.current) {
      return authPromiseRef.current;
    }

    const signInTask = (async (): Promise<string | null> => {
      setAuthLoading(true);
      try {
        await signInWithPopup(auth, googleProvider);
        showToast('Connecté avec votre compte Google');
        return null;
      } catch (err) {
        const code =
          typeof err === 'object' && err !== null && 'code' in err
            ? String((err as { code?: unknown }).code)
            : '';
        const msg = err instanceof Error ? err.message : '';

        if (code === 'auth/cancelled-popup-request' || msg.includes('cancelled-popup-request')) {
          return null;
        }
        if (code === 'auth/popup-closed-by-user' || msg.includes('popup-closed-by-user')) {
          const closedMsg = 'Fenêtre de connexion Google fermée.';
          showToast(closedMsg, 4000);
          return closedMsg;
        }
        if (code === 'auth/popup-blocked' || msg.includes('popup-blocked')) {
          const isTopLevelWindow = typeof window !== 'undefined' && window.self === window.top;
          if (isTopLevelWindow) {
            await signInWithRedirect(auth, googleProvider);
            return null;
          }
          const blockedMsg =
            'Pop-up bloquée par le navigateur. Veuillez autoriser les pop-ups pour ce site.';
          showToast(blockedMsg, 5500);
          return blockedMsg;
        }
        if (code === 'auth/unauthorized-domain' || msg.includes('unauthorized-domain')) {
          const host = typeof window !== 'undefined' ? window.location.hostname : '';
          const unauthMsg = `Domaine non autorisé (${host}) : ajoutez-le dans Firebase Authentication > Domaines autorisés.`;
          showToast(unauthMsg, 7000);
          return unauthMsg;
        }
        if (code === 'auth/operation-not-allowed') {
          const opMsg =
            'Fournisseur Google désactivé dans Firebase Console > Authentication > Sign-in method.';
          showToast(opMsg, 7000);
          return opMsg;
        }
        if (code === 'auth/network-request-failed') {
          const netMsg = 'Erreur réseau lors de la connexion Google. Vérifiez votre connexion.';
          showToast(netMsg, 5500);
          return netMsg;
        }

        console.error('Google Sign-In error:', code, err);
        const fallbackMsg = code
          ? `Erreur connexion Google (${code}). Vérifiez votre configuration Firebase.`
          : 'Impossible de finaliser la connexion Google. Veuillez réessayer.';
        showToast(fallbackMsg, 6500);
        return fallbackMsg;
      } finally {
        setAuthLoading(false);
        authPromiseRef.current = null;
      }
    })();

    authPromiseRef.current = signInTask;
    return signInTask;
  }, [showToast]);

  const handleSignOut = useCallback(async () => {
    await signOut(auth);
    showToast('Déconnecté');
  }, [showToast]);

  const handleAddToCart = useCallback(
    async (payload: {
      item: MenuItem;
      variant: 'Solo' | 'Menu Complet';
      addons: string[];
      unitPriceUsd: number;
      quantity: number;
      notes: string;
    }) => {
      const sortedAddons = [...payload.addons].sort();
      const keyBasis = `${payload.item.id}_${payload.variant}_${sortedAddons.join('_')}_${payload.notes.trim()}`;
      const existingMatch = activeCart.find((c) => {
        const cKey = `${c.productId}_${c.variant}_${[...c.addons].sort().join('_')}_${(c.notes || '').trim()}`;
        return cKey === keyBasis;
      });

      const nextQty = existingMatch
        ? Math.min(50, existingMatch.quantity + payload.quantity)
        : payload.quantity;

      const itemId =
        existingMatch?.id ||
        sanitizeId(
          `${payload.item.id}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
          64
        );

      const cartDoc: CartItemDoc = {
        id: itemId,
        userId: user?.uid || 'guest',
        productId: payload.item.id,
        productName: payload.item.name,
        unitPriceUsd: payload.unitPriceUsd,
        quantity: nextQty,
        variant: payload.variant,
        addons: sortedAddons,
        notes: payload.notes.trim() || undefined,
        image: payload.item.image,
      };

      if (user) {
        await upsertCartItem(user.uid, cartDoc);
      } else {
        setGuestCart((prev) => {
          const idx = prev.findIndex((i) => i.id === itemId);
          if (idx >= 0) {
            const copy = [...prev];
            copy[idx] = cartDoc;
            return copy;
          }
          return [cartDoc, ...prev];
        });
      }

      showToast(`${payload.item.name} ajouté au panier`);
    },
    [activeCart, user, showToast]
  );

  const handleQuickAdd = useCallback(
    (item: MenuItem) => {
      if (!item.available) return;
      void handleAddToCart({
        item,
        variant: 'Solo',
        addons: [],
        unitPriceUsd: item.priceUsd,
        quantity: 1,
        notes: '',
      });
    },
    [handleAddToCart]
  );

  const handleUpdateQty = useCallback(
    async (itemId: string, nextQty: number) => {
      if (user) {
        await updateCartItemQty(user.uid, itemId, nextQty);
      } else {
        setGuestCart((prev) =>
          prev.map((item) => (item.id === itemId ? { ...item, quantity: nextQty } : item))
        );
      }
    },
    [user]
  );

  const handleRemoveItem = useCallback(
    async (itemId: string) => {
      if (user) {
        await removeCartItem(user.uid, itemId);
      } else {
        setGuestCart((prev) => prev.filter((item) => item.id !== itemId));
      }
    },
    [user]
  );

  const handleClearCart = useCallback(async () => {
    setPromoCode(null);
    if (user) {
      await clearUserCart(
        user.uid,
        cloudCart.map((c) => c.id)
      );
    } else {
      setGuestCart([]);
      window.localStorage.removeItem(GUEST_CART_STORAGE_KEY);
    }
  }, [user, cloudCart]);

  return (
    <ErrorBoundary>
      <MotionConfig reducedMotion="user">
        <div className="min-h-screen flex flex-col bg-white text-[#141414]">
          <Navbar
            user={user}
            cartCount={cartCount}
            onOpenCart={() => setCartOpen(true)}
            onOpenOrders={() => setOrdersOpen(true)}
            onOpenAdmin={() => setAdminOpen(true)}
            onSignInGoogle={() => void handleSignInGoogle()}
            authLoading={authLoading || !authReady}
          />

          <main className="flex-1">
            <HeroSection
              signatureItem={signatureBurger}
              currency={currency}
              onSelectProduct={setSelectedProduct}
            />
            <BurgerStorySection
              signatureItem={signatureBurger}
              currency={currency}
              onSelectProduct={setSelectedProduct}
            />
            <ShowcaseSection
              items={activeMenu}
              currency={currency}
              onSelectProduct={setSelectedProduct}
              onExploreCategory={handleExploreCategory}
            />
            <CraftSection />
            <CatalogCtaSection onExploreCategory={handleExploreCategory} />
            <MenuSection
              items={activeMenu}
              currency={currency}
              activeCategory={menuCategory}
              onChangeCategory={setMenuCategory}
              onChangeCurrency={setCurrency}
              onSelectProduct={setSelectedProduct}
              onQuickAdd={handleQuickAdd}
            />
          </main>

          <Footer />

          {/* Product Customizer Modal */}
          <ProductModal
            key={selectedProduct?.id || 'closed'}
            item={selectedProduct}
            currency={currency}
            onClose={() => setSelectedProduct(null)}
            onAddToCart={(payload) => void handleAddToCart(payload)}
          />

          {/* Slide-over Cart Drawer */}
          <CartDrawer
            open={cartOpen}
            items={activeCart}
            catalog={activeMenu}
            currency={currency}
            deliveryMode={deliveryMode}
            promoCode={promoCode}
            onApplyPromoCode={setPromoCode}
            onChangeDeliveryMode={setDeliveryMode}
            onClose={() => setCartOpen(false)}
            onUpdateQty={(id, qty) => void handleUpdateQty(id, qty)}
            onRemoveItem={(id) => void handleRemoveItem(id)}
            onQuickAddProduct={handleQuickAdd}
            onProceedToCheckout={() => {
              setCartOpen(false);
              setCheckoutOpen(true);
            }}
          />

          {/* Checkout & Payment Modal */}
          <CheckoutModal
            open={checkoutOpen}
            user={user}
            profile={profile}
            items={activeCart}
            currency={currency}
            deliveryMode={deliveryMode}
            promoCode={promoCode}
            onChangeCurrency={setCurrency}
            onSignInGoogle={handleSignInGoogle}
            onClearCart={handleClearCart}
            onClose={() => setCheckoutOpen(false)}
            onOrderCompleted={() => setOrdersOpen(true)}
          />

          {/* Google Account & Live Orders Panel */}
          <OrdersPanel
            open={ordersOpen}
            user={user}
            profile={profile}
            orders={orders}
            onClose={() => setOrdersOpen(false)}
            onOpenAdmin={() => setAdminOpen(true)}
            onSignInGoogle={handleSignInGoogle}
            onSignOut={handleSignOut}
          />

          {/* Admin Panel (restricted strictly to p9695009@gmail.com) */}
          {isAdminUser(user) && (
            <AdminPanel
              open={adminOpen}
              user={user}
              orders={adminOrders}
              products={activeMenu}
              hasCloudProducts={cloudProducts.length > 0}
              onClose={() => setAdminOpen(false)}
            />
          )}

          {/* Subtle Confirmation Toast */}
          <AnimatePresence>
            {toastMessage && (
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 16 }}
                transition={{ duration: 0.18 }}
                className="fixed bottom-4 left-4 right-4 sm:left-auto sm:bottom-5 sm:right-5 sm:max-w-sm z-50 bg-[#141414] text-white px-4 py-3 rounded-xl shadow-lg flex items-center justify-between gap-3 text-sm font-medium"
              >
                <span className="flex items-center gap-2.5 min-w-0">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="leading-snug">{toastMessage}</span>
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setToastMessage(null);
                    setCartOpen(true);
                  }}
                  className="text-xs font-semibold text-zinc-300 hover:text-white underline underline-offset-2 shrink-0 py-1 px-1 cursor-pointer"
                >
                  Panier
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </MotionConfig>
    </ErrorBoundary>
  );
}
