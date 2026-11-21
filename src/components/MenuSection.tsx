import { useMemo, useState } from 'react';
import { Plus, Search } from 'lucide-react';
import { motion } from 'motion/react';
import { formatMoney, MenuCategory, MenuItem } from '../data/menu';
import type { CurrencyCode } from '../types/ecommerce';
import { FoodImage } from './FoodImage';
import { TiltCard } from './TiltCard';

interface MenuSectionProps {
  items: MenuItem[];
  currency: CurrencyCode;
  enableCdfCurrency?: boolean;
  usdToCdfRate?: number;
  activeCategory?: MenuCategory;
  onChangeCategory?: (category: MenuCategory) => void;
  onChangeCurrency: (currency: CurrencyCode) => void;
  onSelectProduct: (item: MenuItem) => void;
  onQuickAdd: (item: MenuItem) => void;
}

const CATEGORIES: { id: MenuCategory; label: string }[] = [
  { id: 'all', label: 'Toute la carte' },
  { id: 'burgers', label: 'Smash Burgers' },
  { id: 'pizzas', label: 'Pizzas Artisanales' },
  { id: 'chicken', label: 'Poulet Croustillant' },
  { id: 'sides', label: 'Frites & Sides' },
  { id: 'drinks', label: 'Boissons & Shakes' },
];

export function MenuSection({
  items,
  currency,
  enableCdfCurrency = true,
  usdToCdfRate,
  activeCategory: controlledCategory,
  onChangeCategory,
  onChangeCurrency,
  onSelectProduct,
  onQuickAdd,
}: MenuSectionProps) {
  const [internalCategory, setInternalCategory] = useState<MenuCategory>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const activeCategory = controlledCategory ?? internalCategory;
  const setActiveCategory = (cat: MenuCategory) => {
    setInternalCategory(cat);
    onChangeCategory?.(cat);
  };

  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return items.filter((item) => {
      const matchesCat = activeCategory === 'all' || item.category === activeCategory;
      const matchesQuery =
        !q ||
        item.name.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.categoryLabel.toLowerCase().includes(q);
      return matchesCat && matchesQuery;
    });
  }, [items, activeCategory, searchQuery]);

  return (
    <section
      id="menu"
      className="scroll-mt-16 bg-white py-12 sm:py-16 lg:py-24"
    >
      <div className="max-w-7xl xl:max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-10">
        {/* Header & Currency Switcher */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="ms-scroll-reveal flex flex-col lg:flex-row lg:items-end justify-between gap-5 sm:gap-6 mb-7 sm:mb-8"
        >
          <div>
            <p className="text-xs font-medium uppercase tracking-widest text-zinc-500 mb-2">
              Carte du jour
            </p>
            <h2
              className="font-display text-2xl sm:text-3xl lg:text-4xl font-extrabold text-[#141414] tracking-tight"
              style={{ textWrap: 'balance' }}
            >
              Burgers, pizzas et recettes préparées minute
            </h2>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto">
            {/* Search Input */}
            <div className="relative flex-1 sm:flex-initial">
              <Search
                className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                strokeWidth={2}
              />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher un burger, pizza..."
                aria-label="Rechercher un plat"
                className="w-full sm:w-64 lg:w-72 min-h-[44px] pl-10 pr-4 py-2 bg-[#F5F5F7] text-base sm:text-sm text-[#141414] placeholder:text-zinc-500 rounded-lg border border-transparent focus:border-zinc-300 focus:bg-white focus:outline-none transition-colors"
              />
            </div>

            {/* Currency Segmented Toggle */}
            {enableCdfCurrency && (
              <div
                role="group"
                aria-label="Devise d’affichage"
                className="grid grid-cols-2 sm:inline-flex items-center p-1 bg-[#F5F5F7] rounded-lg shrink-0 min-h-[44px]"
              >
                <button
                  type="button"
                  onClick={() => onChangeCurrency('USD')}
                  className={`px-3.5 py-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    currency === 'USD'
                      ? 'bg-[#141414] text-white shadow-sm'
                      : 'text-zinc-600 hover:text-[#141414]'
                  }`}
                >
                  USD ($)
                </button>
                <button
                  type="button"
                  onClick={() => onChangeCurrency('CDF')}
                  className={`px-3.5 py-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    currency === 'CDF'
                      ? 'bg-[#141414] text-white shadow-sm'
                      : 'text-zinc-600 hover:text-[#141414]'
                  }`}
                >
                  CDF (FC)
                </button>
              </div>
            )}
          </div>
        </motion.div>

        {/* Category Filter Tabs — full-bleed snap scroll on mobile */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0 pb-3 mb-7 sm:mb-8 border-b border-zinc-300/80 snap-x">
          {CATEGORIES.map((cat) => {
            const isActive = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setActiveCategory(cat.id)}
                className={`relative px-4 min-h-[42px] py-2 text-sm font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 snap-start cursor-pointer ${
                  isActive ? 'text-white' : 'text-zinc-700 hover:text-[#141414] hover:bg-[#F5F5F7]'
                }`}
              >
                {isActive && (
                  <motion.span
                    layoutId="activeMenuCategory"
                    transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                    className="absolute inset-0 bg-[#141414] rounded-lg"
                  />
                )}
                <span className="relative z-10">{cat.label}</span>
              </button>
            );
          })}
        </div>

        {/* Responsive Product Grid (1 col mobile, 2 col tablet, 3 col desktop) */}
        {filteredItems.length === 0 ? (
          <div className="bg-[#F5F5F7] rounded-2xl p-8 sm:p-12 text-center">
            <p className="font-display text-lg font-bold text-[#141414] mb-1">
              Aucun plat trouvé
            </p>
            <p className="text-sm text-zinc-600 mb-4">
              Essayez un autre mot-clé ou réinitialisez les filtres.
            </p>
            <button
              type="button"
              onClick={() => {
                setActiveCategory('all');
                setSearchQuery('');
              }}
              className="px-5 py-2.5 min-h-[44px] bg-[#141414] text-white text-sm font-semibold rounded-lg hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              Voir toute la carte
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6 lg:gap-8">
            {filteredItems.map((item, idx) => (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.12 }}
                transition={{
                  duration: 0.35,
                  delay: Math.min(idx * 0.04, 0.24),
                  ease: [0.16, 1, 0.3, 1],
                }}
                className="h-full"
              >
                <TiltCard maxTiltDeg={3} className="h-full rounded-2xl">
                  <article
                    className={`group ms-product-card h-full flex flex-col bg-white rounded-2xl border border-zinc-200 overflow-hidden ${
                      item.available ? 'hover:border-zinc-300' : 'opacity-65'
                    }`}
                  >
                    {/* 4:3 Product Photo with CSS sheen sweep */}
                    <button
                      type="button"
                      disabled={!item.available}
                      onClick={() => onSelectProduct(item)}
                      className="ms-card-media relative aspect-[4/3] w-full bg-[#F5F5F7] overflow-hidden text-left cursor-pointer disabled:cursor-not-allowed"
                    >
                      <FoodImage
                        src={item.image}
                        alt={item.name}
                        className="w-full h-full object-cover group-hover:scale-[1.06] transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]"
                      />
                    </button>

                    {/* Card Body */}
                    <div className="p-4 sm:p-5 flex-1 flex flex-col">
                      {/* Unboxed quiet metadata line */}
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs font-medium uppercase tracking-wider text-zinc-500 mb-2">
                        <span>{item.categoryLabel}</span>
                        <span aria-hidden="true">·</span>
                        <span className="tabular-nums">{item.calories}</span>
                        {!item.available ? (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="text-zinc-600 font-semibold">Épuisé</span>
                          </>
                        ) : (
                          item.tag && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span className="text-[#D92323] font-semibold">{item.tag}</span>
                            </>
                          )
                        )}
                      </div>

                      <button
                        type="button"
                        disabled={!item.available}
                        onClick={() => onSelectProduct(item)}
                        className="text-left cursor-pointer disabled:cursor-not-allowed"
                      >
                        <h3 className="font-display text-lg font-bold text-[#141414] group-hover:text-[#D92323] transition-colors mb-1.5 sm:mb-2">
                          {item.name}
                        </h3>
                      </button>

                      <p className="text-sm text-zinc-600 leading-relaxed line-clamp-2 mb-4 sm:mb-5 flex-1">
                        {item.description}
                      </p>

                      {/* Price & Quick Add Row */}
                      <div className="pt-3.5 sm:pt-4 border-t border-zinc-100 flex flex-wrap items-center justify-between gap-2.5 sm:gap-3">
                        <div className="min-w-0">
                          <p className="font-mono tabular-nums text-sm sm:text-base font-semibold text-[#141414] truncate">
                            {formatMoney(item.priceUsd, currency, usdToCdfRate)}
                          </p>
                          {item.supportsCombo && (
                            <p className="text-[11px] sm:text-xs text-zinc-500 truncate">
                              Menu +{formatMoney(item.comboExtraUsd, currency, usdToCdfRate)}
                            </p>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 ml-auto">
                          <button
                            type="button"
                            disabled={!item.available}
                            onClick={() => onSelectProduct(item)}
                            className="px-2.5 sm:px-3 min-h-[40px] py-2 text-xs font-semibold text-zinc-700 hover:text-[#141414] hover:bg-[#F5F5F7] rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-40"
                          >
                            Options
                          </button>
                          <motion.button
                            type="button"
                            disabled={!item.available}
                            whileTap={{ scale: 0.94 }}
                            onClick={() => onQuickAdd(item)}
                            aria-label={`Ajouter ${item.name} au panier`}
                            className="ms-btn-glint inline-flex items-center gap-1.5 px-3 sm:px-3.5 min-h-[40px] py-2 bg-[#141414] text-white text-xs font-semibold rounded-lg hover:bg-[#D92323] transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-40 disabled:hover:bg-[#141414]"
                          >
                            <Plus className="w-3.5 h-3.5" strokeWidth={2.2} />
                            <span>Ajouter</span>
                          </motion.button>
                        </div>
                      </div>
                    </div>
                  </article>
                </TiltCard>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
