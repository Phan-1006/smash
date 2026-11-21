import { useMemo, useState } from 'react';
import { ArrowRight, Minus, Plus, ShoppingBag, Tag, Trash2, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import {
  formatMoney,
  MenuItem,
  PROMO_CODES,
} from '../data/menu';
import { DEFAULT_SITE_SETTINGS } from '../data/siteSettings';
import type { CartItemDoc, CurrencyCode, DeliveryMode, SiteSettingsDoc } from '../types/ecommerce';
import { FoodImage } from './FoodImage';

interface CartDrawerProps {
  open: boolean;
  items: CartItemDoc[];
  catalog: MenuItem[];
  currency: CurrencyCode;
  deliveryMode: DeliveryMode;
  promoCode: string | null;
  siteSettings?: Omit<SiteSettingsDoc, 'updatedAt'>;
  onApplyPromoCode: (code: string | null) => void;
  onChangeDeliveryMode: (mode: DeliveryMode) => void;
  onClose: () => void;
  onUpdateQty: (itemId: string, nextQty: number) => void;
  onRemoveItem: (itemId: string) => void;
  onQuickAddProduct: (item: MenuItem) => void;
  onProceedToCheckout: () => void;
}

export function CartDrawer({
  open,
  items,
  catalog,
  currency,
  deliveryMode,
  promoCode,
  siteSettings = DEFAULT_SITE_SETTINGS,
  onApplyPromoCode,
  onChangeDeliveryMode,
  onClose,
  onUpdateQty,
  onRemoveItem,
  onQuickAddProduct,
  onProceedToCheckout,
}: CartDrawerProps) {
  const [promoInput, setPromoInput] = useState('');
  const [promoError, setPromoError] = useState<string | null>(null);

  const subtotalUsd = items.reduce((sum, item) => sum + item.unitPriceUsd * item.quantity, 0);
  const promoInfo = promoCode ? PROMO_CODES[promoCode] : undefined;
  const discountUsd = promoInfo ? Number((subtotalUsd * promoInfo.rate).toFixed(2)) : 0;
  const discountedSubtotalUsd = Math.max(0, subtotalUsd - discountUsd);

  const freeThreshold = siteSettings.freeDeliveryThresholdUsd;
  const baseDeliveryFee = siteSettings.deliveryFeeUsd;
  const usdToCdfRate = siteSettings.usdToCdfRate;

  const qualifiesFreeDelivery =
    baseDeliveryFee <= 0 || freeThreshold <= 0 || subtotalUsd >= freeThreshold;
  const deliveryFeeUsd =
    deliveryMode === 'pickup' || items.length === 0 || qualifiesFreeDelivery
      ? 0
      : baseDeliveryFee;
  const totalUsd = discountedSubtotalUsd + deliveryFeeUsd;
  const remainingForFreeDelivery = Math.max(0, freeThreshold - subtotalUsd);
  const progressRatio =
    qualifiesFreeDelivery || freeThreshold <= 0 ? 1 : Math.min(1, subtotalUsd / freeThreshold);

  const upsellItems = useMemo(() => {
    const inCartIds = new Set(items.map((i) => i.productId));
    return catalog
      .filter(
        (p) =>
          p.available &&
          !inCartIds.has(p.id) &&
          (p.category === 'sides' || p.category === 'drinks' || p.category === 'pizzas')
      )
      .slice(0, 3);
  }, [catalog, items]);

  const handleApplyPromo = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = promoInput.trim().toUpperCase();
    if (!cleaned) return;
    if (PROMO_CODES[cleaned]) {
      onApplyPromoCode(cleaned);
      setPromoError(null);
      setPromoInput('');
    } else {
      setPromoError('Code invalide (essayez SMASH10 ou PIZZA15)');
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/45 backdrop-blur-xs"
          />

          <motion.aside
            role="dialog"
            aria-modal="true"
            aria-label="Votre panier"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="relative z-10 w-full max-w-md sm:max-w-lg bg-white h-[100dvh] flex flex-col shadow-2xl border-l border-zinc-200"
          >
            {/* Header */}
            <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-zinc-200 flex items-center justify-between gap-4 shrink-0">
              <div>
                <h2 className="font-display text-lg sm:text-xl font-extrabold text-[#141414]">
                  Votre panier
                </h2>
                <p className="text-xs text-zinc-500 mt-0.5 tabular-nums">
                  {items.reduce((acc, i) => acc + i.quantity, 0)} article(s) sélectionné(s)
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Fermer le panier"
                className="p-2.5 min-w-[44px] min-h-[44px] inline-flex items-center justify-center text-zinc-500 hover:text-[#141414] hover:bg-[#F5F5F7] rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" strokeWidth={2} />
              </button>
            </div>

            {/* Delivery / Pickup Toggle & Free Delivery Progress Bar */}
            <div className="px-4 sm:px-6 py-3 sm:py-3.5 bg-[#F5F5F7] border-b border-zinc-200 space-y-2.5 shrink-0">
              <div className="grid grid-cols-2 gap-1 p-1 bg-zinc-200/70 rounded-lg">
                <button
                  type="button"
                  onClick={() => onChangeDeliveryMode('delivery')}
                  className={`py-2 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                    deliveryMode === 'delivery'
                      ? 'bg-white text-[#141414] shadow-xs'
                      : 'text-zinc-600 hover:text-[#141414]'
                  }`}
                >
                  Livraison Express
                </button>
                <button
                  type="button"
                  onClick={() => onChangeDeliveryMode('pickup')}
                  className={`py-2 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                    deliveryMode === 'pickup'
                      ? 'bg-white text-[#141414] shadow-xs'
                      : 'text-zinc-600 hover:text-[#141414]'
                  }`}
                >
                  Retrait Comptoir
                </button>
              </div>

              {deliveryMode === 'delivery' && items.length > 0 && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs text-zinc-600 tabular-nums">
                    <span>
                      {qualifiesFreeDelivery
                        ? 'Livraison gratuite débloquée'
                        : `Plus que ${formatMoney(remainingForFreeDelivery, currency, usdToCdfRate)} pour la livraison offerte`}
                    </span>
                    <span className="font-mono font-semibold text-[#141414]">
                      {Math.round(progressRatio * 100)}%
                    </span>
                  </div>
                  <div className="h-1.5 bg-zinc-200 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ scaleX: 0 }}
                      animate={{ scaleX: progressRatio }}
                      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                      className={`ms-progress-shimmer h-full origin-left rounded-full ${
                        qualifiesFreeDelivery ? 'bg-emerald-600' : 'bg-[#D92323]'
                      }`}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Cart Items + Upsell */}
            <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 sm:py-5 space-y-6">
              {items.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center py-12">
                  <div className="w-12 h-12 rounded-xl bg-[#F5F5F7] flex items-center justify-center text-zinc-400 mb-4">
                    <ShoppingBag className="w-6 h-6" strokeWidth={1.6} />
                  </div>
                  <p className="font-display text-lg font-bold text-[#141414] mb-1">
                    Votre panier est vide
                  </p>
                  <p className="text-sm text-zinc-500 max-w-xs mb-6">
                    Ajoutez nos smash burgers, pizzas sur pierre ou poulet croustillant.
                  </p>
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-5 py-2.5 bg-[#141414] text-white text-sm font-semibold rounded-lg hover:bg-zinc-800 transition-colors cursor-pointer"
                  >
                    Explorer le menu
                  </button>
                </div>
              ) : (
                <>
                  <div className="divide-y divide-zinc-100">
                    <AnimatePresence initial={false}>
                      {items.map((item) => (
                        <motion.div
                          key={item.id}
                          layout
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, x: 24 }}
                          transition={{ duration: 0.18 }}
                          className="py-4 first:pt-0 last:pb-0 flex gap-4"
                        >
                          <div className="w-20 h-20 rounded-xl overflow-hidden bg-[#F5F5F7] shrink-0">
                            <FoodImage
                              src={item.image}
                              alt={item.productName}
                              className="w-full h-full object-cover"
                            />
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <h3 className="font-display text-sm font-bold text-[#141414] truncate">
                                {item.productName}
                              </h3>
                              <button
                                type="button"
                                onClick={() => onRemoveItem(item.id)}
                                aria-label={`Supprimer ${item.productName}`}
                                className="text-zinc-400 hover:text-[#D92323] transition-colors p-1 cursor-pointer"
                              >
                                <Trash2 className="w-4 h-4" strokeWidth={1.8} />
                              </button>
                            </div>

                            <p className="text-xs text-zinc-500 mt-0.5">
                              {item.variant}
                              {item.addons.length > 0 ? ` · ${item.addons.join(', ')}` : ''}
                            </p>
                            {item.notes && (
                              <p className="text-xs text-zinc-500 italic mt-0.5 truncate">
                                Note : {item.notes}
                              </p>
                            )}

                            <div className="mt-3 flex items-center justify-between">
                              <div className="inline-flex items-center border border-zinc-200 rounded-lg">
                                <button
                                  type="button"
                                  onClick={() =>
                                    item.quantity <= 1
                                      ? onRemoveItem(item.id)
                                      : onUpdateQty(item.id, item.quantity - 1)
                                  }
                                  aria-label="Diminuer quantité"
                                  className="p-2 min-w-[36px] min-h-[36px] inline-flex items-center justify-center text-zinc-600 hover:text-[#141414] cursor-pointer"
                                >
                                  <Minus className="w-3.5 h-3.5" strokeWidth={2} />
                                </button>
                                <span className="px-2.5 font-mono tabular-nums text-xs font-semibold text-[#141414]">
                                  {item.quantity}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => onUpdateQty(item.id, item.quantity + 1)}
                                  aria-label="Augmenter quantité"
                                  className="p-2 min-w-[36px] min-h-[36px] inline-flex items-center justify-center text-zinc-600 hover:text-[#141414] cursor-pointer"
                                >
                                  <Plus className="w-3.5 h-3.5" strokeWidth={2} />
                                </button>
                              </div>

                              <p className="font-mono tabular-nums text-sm font-semibold text-[#141414]">
                                {formatMoney(item.unitPriceUsd * item.quantity, currency, usdToCdfRate)}
                              </p>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>

                  {/* Upsell Suggestions */}
                  {upsellItems.length > 0 && (
                    <div className="pt-4 border-t border-zinc-200">
                      <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-3">
                        Complétez votre commande
                      </p>
                      <div className="space-y-2.5">
                        {upsellItems.map((suggestion) => (
                          <div
                            key={suggestion.id}
                            className="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-[#F5F5F7]"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-12 h-10 rounded-lg overflow-hidden bg-white shrink-0">
                                <FoodImage
                                  src={suggestion.image}
                                  alt={suggestion.name}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-[#141414] truncate">
                                  {suggestion.name}
                                </p>
                                <p className="font-mono tabular-nums text-xs text-zinc-600">
                                  {formatMoney(suggestion.priceUsd, currency, usdToCdfRate)}
                                </p>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => onQuickAddProduct(suggestion)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-white border border-zinc-200 text-xs font-semibold text-[#141414] rounded-lg hover:bg-[#141414] hover:text-white transition-colors shrink-0 cursor-pointer"
                            >
                              <Plus className="w-3 h-3" />
                              <span>Ajouter</span>
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Promo Code Input */}
                  <div className="pt-4 border-t border-zinc-200">
                    {promoCode && promoInfo ? (
                      <div className="flex items-center justify-between px-3.5 py-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs">
                        <span className="font-semibold text-emerald-800 inline-flex items-center gap-1.5">
                          <Tag className="w-3.5 h-3.5" />
                          {promoCode} · {promoInfo.label}
                        </span>
                        <button
                          type="button"
                          onClick={() => onApplyPromoCode(null)}
                          className="text-emerald-700 hover:text-emerald-950 font-semibold cursor-pointer"
                        >
                          Retirer
                        </button>
                      </div>
                    ) : (
                      <form onSubmit={handleApplyPromo} className="space-y-1.5">
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            maxLength={24}
                            value={promoInput}
                            onChange={(e) => {
                              setPromoInput(e.target.value);
                              if (promoError) setPromoError(null);
                            }}
                            placeholder="Code promo (ex. SMASH10)"
                            className="flex-1 min-w-0 min-h-[42px] px-3 py-2 text-base sm:text-xs bg-[#F5F5F7] rounded-lg border border-transparent focus:border-zinc-300 focus:bg-white focus:outline-none uppercase font-mono"
                          />
                          <button
                            type="submit"
                            className="px-4 min-h-[42px] py-2 bg-[#141414] text-white text-xs font-semibold rounded-lg hover:bg-zinc-800 transition-colors shrink-0 cursor-pointer"
                          >
                            Appliquer
                          </button>
                        </div>
                        {promoError && <p className="text-xs text-[#D92323]">{promoError}</p>}
                      </form>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Footer Totals & Checkout CTA */}
            {items.length > 0 && (
              <div className="px-4 py-4 sm:p-6 border-t border-zinc-200 bg-white space-y-3 sm:space-y-4 shrink-0">
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between text-zinc-600">
                    <span>Sous-total</span>
                    <span className="font-mono tabular-nums font-medium text-[#141414]">
                      {formatMoney(subtotalUsd, currency, usdToCdfRate)}
                    </span>
                  </div>
                  {discountUsd > 0 && (
                    <div className="flex items-center justify-between text-emerald-700">
                      <span>Réduction ({promoCode})</span>
                      <span className="font-mono tabular-nums font-semibold">
                        -{formatMoney(discountUsd, currency, usdToCdfRate)}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center justify-between text-zinc-600">
                    <span>
                      {deliveryMode === 'pickup' ? 'Retrait au comptoir' : 'Frais de livraison'}
                    </span>
                    <span className="font-mono tabular-nums font-medium text-[#141414]">
                      {deliveryFeeUsd === 0
                        ? 'Gratuit'
                        : formatMoney(deliveryFeeUsd, currency, usdToCdfRate)}
                    </span>
                  </div>
                  <div className="pt-2 border-t border-zinc-100 flex items-center justify-between text-base font-bold text-[#141414]">
                    <span>Total TTC</span>
                    <span className="font-mono tabular-nums">
                      {formatMoney(totalUsd, currency, usdToCdfRate)}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={onProceedToCheckout}
                  className="ms-btn-glint w-full py-3.5 px-5 bg-[#D92323] text-white text-sm font-semibold rounded-lg hover:bg-[#B81C1C] transition-colors flex items-center justify-between gap-2.5 cursor-pointer active:scale-[0.98]"
                >
                  <span className="inline-flex items-center gap-2">
                    <span>Passer au paiement</span>
                    <ArrowRight className="w-4 h-4" strokeWidth={2} />
                  </span>
                  <span className="font-mono tabular-nums">
                    {formatMoney(totalUsd, currency, usdToCdfRate)}
                  </span>
                </button>
              </div>
            )}
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
}
