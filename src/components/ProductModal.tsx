import { useState } from 'react';
import { Check, Minus, Plus, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { formatMoney, MenuItem } from '../data/menu';
import type { CurrencyCode } from '../types/ecommerce';
import { FoodImage } from './FoodImage';

interface ProductModalProps {
  item: MenuItem | null;
  currency: CurrencyCode;
  usdToCdfRate?: number;
  onClose: () => void;
  onAddToCart: (payload: {
    item: MenuItem;
    variant: 'Solo' | 'Menu Complet';
    addons: string[];
    unitPriceUsd: number;
    quantity: number;
    notes: string;
  }) => void;
}

export function ProductModal({
  item,
  currency,
  usdToCdfRate,
  onClose,
  onAddToCart,
}: ProductModalProps) {
  const [variant, setVariant] = useState<'Solo' | 'Menu Complet'>('Solo');
  const [selectedAddons, setSelectedAddons] = useState<string[]>([]);
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState('');

  if (!item) return null;

  const addonsTotalUsd = item.addons
    .filter((a) => selectedAddons.includes(a.label))
    .reduce((sum, a) => sum + a.priceUsd, 0);

  const variantExtraUsd = variant === 'Menu Complet' && item.supportsCombo ? item.comboExtraUsd : 0;
  const unitPriceUsd = item.priceUsd + variantExtraUsd + addonsTotalUsd;
  const lineTotalUsd = unitPriceUsd * quantity;

  const toggleAddon = (label: string) => {
    setSelectedAddons((prev) =>
      prev.includes(label) ? prev.filter((itemLabel) => itemLabel !== label) : [...prev, label]
    );
  };

  const handleConfirm = () => {
    onAddToCart({
      item,
      variant: item.supportsCombo ? variant : 'Solo',
      addons: selectedAddons,
      unitPriceUsd,
      quantity,
      notes,
    });
    onClose();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-6">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/50 backdrop-blur-xs"
        />

        <motion.div
          role="dialog"
          aria-modal="true"
          aria-labelledby="product-modal-title"
          initial={{ opacity: 0, scale: 0.96, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 20 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="relative z-10 w-full max-w-3xl lg:max-w-4xl bg-white rounded-t-2xl sm:rounded-2xl border border-zinc-200 shadow-2xl overflow-hidden max-h-[92dvh] sm:max-h-[90vh] flex flex-col md:flex-row"
        >
          {/* Left Sticky Image */}
          <div className="md:w-5/12 bg-[#F5F5F7] shrink-0">
            <div className="aspect-[16/10] sm:aspect-[4/3] md:aspect-auto md:h-full max-h-[220px] sm:max-h-[260px] md:max-h-none">
              <FoodImage src={item.image} alt={item.name} className="w-full h-full object-cover" />
            </div>
          </div>

          {/* Right Contiguous Purchase Module */}
          <div className="md:w-7/12 flex flex-col min-h-0 flex-1 overflow-hidden">
            <div className="px-4 py-4 sm:p-6 sm:pb-4 flex items-start justify-between gap-4 border-b border-zinc-100 shrink-0">
              <div className="min-w-0">
                <p className="text-xs font-medium uppercase tracking-wider text-zinc-500 mb-1">
                  {item.categoryLabel} · {item.calories}
                </p>
                <h2
                  id="product-modal-title"
                  className="font-display text-xl sm:text-2xl font-extrabold text-[#141414]"
                >
                  {item.name}
                </h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Fermer"
                className="p-2.5 min-w-[44px] min-h-[44px] inline-flex items-center justify-center text-zinc-500 hover:text-[#141414] hover:bg-[#F5F5F7] rounded-lg transition-colors shrink-0 cursor-pointer"
              >
                <X className="w-5 h-5" strokeWidth={2} />
              </button>
            </div>

            <div className="p-4 sm:p-6 space-y-5 sm:space-y-6 flex-1 overflow-y-auto">
              <p className="text-sm text-zinc-600 leading-relaxed">{item.description}</p>

              {/* Formule / Variant selector */}
              {item.supportsCombo && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-2.5">
                    Format
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    {(['Solo', 'Menu Complet'] as const).map((option) => {
                      const active = variant === option;
                      return (
                        <button
                          key={option}
                          type="button"
                          onClick={() => setVariant(option)}
                          className={`p-3.5 rounded-xl border text-left transition-colors cursor-pointer ${
                            active
                              ? 'border-[#141414] bg-[#141414] text-white'
                              : 'border-zinc-200 bg-white text-[#141414] hover:border-zinc-400'
                          }`}
                        >
                          <p className="text-sm font-semibold">{option}</p>
                          <p
                            className={`text-xs mt-0.5 tabular-nums ${
                              active ? 'text-zinc-300' : 'text-zinc-500'
                            }`}
                          >
                            {option === 'Solo'
                              ? formatMoney(item.priceUsd, currency, usdToCdfRate)
                              : `+${formatMoney(item.comboExtraUsd, currency, usdToCdfRate)} (Frites + Boisson)`}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Addons */}
              {item.addons.length > 0 && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-2.5">
                    Suppléments
                  </p>
                  <div className="space-y-2">
                    {item.addons.map((addon) => {
                      const checked = selectedAddons.includes(addon.label);
                      return (
                        <button
                          key={addon.id}
                          type="button"
                          onClick={() => toggleAddon(addon.label)}
                          className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl border text-sm transition-colors cursor-pointer ${
                            checked
                              ? 'border-[#141414] bg-[#F5F5F7]'
                              : 'border-zinc-200 hover:border-zinc-300'
                          }`}
                        >
                          <span className="flex items-center gap-2.5 font-medium text-[#141414]">
                            <span
                              className={`w-4 h-4 rounded flex items-center justify-center border ${
                                checked
                                  ? 'bg-[#141414] border-[#141414] text-white'
                                  : 'border-zinc-300 bg-white'
                              }`}
                            >
                              {checked && <Check className="w-3 h-3" strokeWidth={2.5} />}
                            </span>
                            {addon.label}
                          </span>
                          <span className="font-mono tabular-nums text-xs font-semibold text-zinc-600">
                            +{formatMoney(addon.priceUsd, currency, usdToCdfRate)}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Kitchen Note */}
              <div>
                <label
                  htmlFor="kitchen-note"
                  className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-2"
                >
                  Instructions cuisine (optionnel)
                </label>
                <input
                  id="kitchen-note"
                  type="text"
                  maxLength={180}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Ex. : sans pickles, sauce à part..."
                  className="w-full min-h-[44px] px-3.5 py-2.5 text-base sm:text-sm bg-[#F5F5F7] border border-transparent focus:border-zinc-300 focus:bg-white rounded-lg focus:outline-none"
                />
              </div>
            </div>

            {/* Footer Buy CTA (always pinned) */}
            <div className="px-4 py-4 sm:p-5 bg-white border-t border-zinc-200 flex items-center justify-between gap-3 sm:gap-4 shrink-0">
              <div className="inline-flex items-center border border-zinc-200 rounded-lg shrink-0">
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  aria-label="Diminuer la quantité"
                  className="p-2.5 min-w-[42px] min-h-[44px] inline-flex items-center justify-center text-zinc-700 hover:text-[#141414] cursor-pointer"
                >
                  <Minus className="w-4 h-4" strokeWidth={2} />
                </button>
                <span className="px-2.5 sm:px-3 font-mono tabular-nums text-sm font-semibold text-[#141414]">
                  {quantity}
                </span>
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.min(50, q + 1))}
                  aria-label="Augmenter la quantité"
                  className="p-2.5 min-w-[42px] min-h-[44px] inline-flex items-center justify-center text-zinc-700 hover:text-[#141414] cursor-pointer"
                >
                  <Plus className="w-4 h-4" strokeWidth={2} />
                </button>
              </div>

              <motion.button
                type="button"
                whileTap={{ scale: 0.98 }}
                onClick={handleConfirm}
                className="ms-btn-glint flex-1 min-h-[44px] py-3 px-4 sm:px-5 bg-[#D92323] text-white text-sm font-semibold rounded-lg hover:bg-[#B81C1C] transition-colors flex items-center justify-between gap-2 sm:gap-3 cursor-pointer"
              >
                <span className="truncate">Ajouter au panier</span>
                <span className="font-mono tabular-nums shrink-0">
                  {formatMoney(lineTotalUsd, currency, usdToCdfRate)}
                </span>
              </motion.button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
