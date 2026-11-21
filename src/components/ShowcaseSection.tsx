import { ArrowRight, ArrowUpRight } from 'lucide-react';
import { motion } from 'motion/react';
import { formatMoney, MenuCategory, MenuItem } from '../data/menu';
import type { CurrencyCode } from '../types/ecommerce';
import { FoodImage } from './FoodImage';
import { TiltCard } from './TiltCard';

interface ShowcaseSectionProps {
  items: MenuItem[];
  currency: CurrencyCode;
  onSelectProduct: (item: MenuItem) => void;
  onExploreCategory: (category: MenuCategory) => void;
}

interface CategoryShowcaseMeta {
  category: Exclude<MenuCategory, 'all'>;
  index: string;
  title: string;
  preferredId: string;
  spanClass: string;
}

const CATEGORY_ORDER: CategoryShowcaseMeta[] = [
  {
    category: 'burgers',
    index: '01',
    title: 'Smash Burgers',
    preferredId: 'truffle-bacon-smash',
    spanClass: 'lg:col-span-7',
  },
  {
    category: 'pizzas',
    index: '02',
    title: 'Pizzas Artisanales',
    preferredId: 'pizza-pepperoni-hot-honey',
    spanClass: 'lg:col-span-5',
  },
  {
    category: 'chicken',
    index: '03',
    title: 'Poulet Croustillant',
    preferredId: 'crispy-hot-chicken',
    spanClass: 'lg:col-span-4',
  },
  {
    category: 'sides',
    index: '04',
    title: 'Frites & Sides',
    preferredId: 'hand-cut-fries',
    spanClass: 'lg:col-span-4',
  },
  {
    category: 'drinks',
    index: '05',
    title: 'Boissons & Shakes',
    preferredId: 'salted-caramel-shake',
    spanClass: 'lg:col-span-4',
  },
];

export function ShowcaseSection({
  items,
  currency,
  onSelectProduct,
  onExploreCategory,
}: ShowcaseSectionProps) {
  const familyCards = CATEGORY_ORDER.map((meta) => {
    const categoryItems = items.filter((item) => item.category === meta.category);
    if (categoryItems.length === 0) return null;

    const featuredItem =
      categoryItems.find((item) => item.id === meta.preferredId) || categoryItems[0];
    const minPriceUsd = Math.min(...categoryItems.map((item) => item.priceUsd));

    return {
      ...meta,
      count: categoryItems.length,
      minPriceUsd,
      featuredItem,
    };
  }).filter(Boolean) as Array<
    CategoryShowcaseMeta & {
      count: number;
      minPriceUsd: number;
      featuredItem: MenuItem;
    }
  >;

  return (
    <section
      id="specialites"
      data-nav-theme="light"
      className="scroll-mt-16 bg-white text-[#141414] border-b border-zinc-200 py-14 sm:py-20 lg:py-28"
    >
      <div className="max-w-7xl xl:max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-10">
        {/* Section Heading */}
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.25 }}
          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-col md:flex-row md:items-end justify-between gap-4 sm:gap-6 mb-8 sm:mb-12"
        >
          <div className="max-w-2xl">
            <p className="text-[11px] sm:text-xs font-medium uppercase tracking-[0.22em] text-zinc-500 mb-2">
              Vitrine de la carte · {familyCards.length} familles
            </p>
            <h2
              className="font-display text-2xl sm:text-3xl lg:text-4xl font-extrabold text-[#141414] tracking-tight"
              style={{ textWrap: 'balance' }}
            >
              Toutes nos familles de recettes, directement issues du comptoir.
            </h2>
          </div>

          <button
            type="button"
            onClick={() => onExploreCategory('all')}
            className="inline-flex items-center gap-2 text-sm font-semibold text-[#141414] hover:text-[#D92323] transition-colors self-start md:self-auto whitespace-nowrap shrink-0 cursor-pointer min-h-[40px]"
          >
            <span>Parcourir toute la carte</span>
            <ArrowRight className="w-4 h-4" strokeWidth={2} />
          </button>
        </motion.div>

        {/* Asymmetric Editorial Showcase Grid covering all real catalog categories */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-5 sm:gap-6 lg:gap-7">
          {familyCards.map((card, index) => (
            <motion.div
              key={card.category}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.15 }}
              transition={{
                duration: 0.45,
                delay: Math.min(index * 0.06, 0.24),
                ease: [0.16, 1, 0.3, 1],
              }}
              className={
                index < 2 ? `${card.spanClass} sm:col-span-1` : `${card.spanClass} sm:col-span-1`
              }
            >
              <TiltCard
                maxTiltDeg={4}
                darkSpotlight
                className="group h-full bg-[#141414] rounded-2xl overflow-hidden border border-zinc-800/80 shadow-lg"
              >
                <div className="flex flex-col h-full">
                  {/* Visual Surface */}
                  <button
                    type="button"
                    data-cursor="Voir"
                    onClick={() => onSelectProduct(card.featuredItem)}
                    className={`relative overflow-hidden text-left cursor-pointer w-full ${
                      index < 2 ? 'aspect-[16/10]' : 'aspect-[4/3]'
                    }`}
                  >
                    <FoodImage
                      src={card.featuredItem.image}
                      alt={`${card.title} — ${card.featuredItem.name}`}
                      className="w-full h-full object-cover group-hover:scale-[1.06] transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#141414] via-[#141414]/25 to-transparent" />
                  </button>

                  {/* Content Block */}
                  <div className="p-5 sm:p-6 flex-1 flex flex-col justify-between text-white">
                    <div>
                      <div className="flex items-center justify-between gap-3 text-[11px] sm:text-xs font-medium uppercase tracking-wider text-zinc-400 mb-2">
                        <span className="truncate">
                          {card.index} · {card.count}{' '}
                          {card.count > 1 ? 'recettes' : 'recette'}
                        </span>
                        <span className="font-mono tabular-nums text-[#F59E0B] shrink-0">
                          Dès {formatMoney(card.minPriceUsd, currency)}
                        </span>
                      </div>

                      <h3 className="font-display text-lg sm:text-2xl font-bold text-white mb-1.5">
                        {card.title}
                      </h3>
                      <p className="text-xs sm:text-sm font-medium text-zinc-300 mb-1">
                        Vedette : {card.featuredItem.name}
                      </p>
                      <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed line-clamp-2 mb-5">
                        {card.featuredItem.description}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2.5 pt-4 border-t border-zinc-800">
                      <button
                        type="button"
                        data-cursor="Commander"
                        onClick={() => onSelectProduct(card.featuredItem)}
                        className="ms-btn-glint inline-flex items-center gap-1.5 px-3.5 py-2 min-h-[40px] bg-[#D92323] text-white text-xs sm:text-sm font-semibold rounded-lg hover:bg-[#B81C1C] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        <span>Personnaliser</span>
                        <ArrowUpRight className="w-3.5 h-3.5" strokeWidth={2} />
                      </button>
                      <button
                        type="button"
                        onClick={() => onExploreCategory(card.category)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-2 min-h-[40px] text-xs sm:text-sm font-semibold text-zinc-300 hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        <span>Voir la famille</span>
                        <ArrowRight className="w-3.5 h-3.5" strokeWidth={2} />
                      </button>
                    </div>
                  </div>
                </div>
              </TiltCard>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
