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

export function ShowcaseSection({
  items,
  currency,
  onSelectProduct,
  onExploreCategory,
}: ShowcaseSectionProps) {
  const heroBurger =
    items.find((i) => i.id === 'truffle-bacon-smash') ||
    items.find((i) => i.category === 'burgers') ||
    items[0];
  const heroPizza =
    items.find((i) => i.id === 'pizza-pepperoni-hot-honey') ||
    items.find((i) => i.category === 'pizzas') ||
    items[1];
  const heroChicken =
    items.find((i) => i.id === 'crispy-hot-chicken') ||
    items.find((i) => i.category === 'chicken') ||
    items[2];

  const featuredCards: {
    item: MenuItem;
    eyebrow: string;
    highlight: string;
    category: MenuCategory;
    spanClass: string;
  }[] = [
    heroBurger && {
      item: heroBurger,
      eyebrow: '01 · Smash Burgers',
      highlight: 'Bœuf Charolais · Truffe noire & brioche sésame',
      category: 'burgers',
      spanClass: 'lg:col-span-7',
    },
    heroPizza && {
      item: heroPizza,
      eyebrow: '02 · Pizzas sur pierre',
      highlight: 'Levain fermenté 72h · Miel infusé au piment',
      category: 'pizzas',
      spanClass: 'lg:col-span-5',
    },
    heroChicken && {
      item: heroChicken,
      eyebrow: '03 · Poulet Croustillant',
      highlight: 'Marinade babeurre 48h · Glaçage hot honey',
      category: 'chicken',
      spanClass: 'lg:col-span-12',
    },
  ].filter(Boolean) as {
    item: MenuItem;
    eyebrow: string;
    highlight: string;
    category: MenuCategory;
    spanClass: string;
  }[];

  return (
    <section
      id="specialites"
      className="scroll-mt-16 bg-[#F5F5F7] border-b border-zinc-200 py-10 sm:py-16 lg:py-24"
    >
      <div className="max-w-7xl xl:max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-10">
        {/* Section Heading */}
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.25 }}
          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-col md:flex-row md:items-end justify-between gap-4 sm:gap-6 mb-7 sm:mb-12"
        >
          <div className="max-w-2xl">
            <p className="text-[11px] sm:text-xs font-medium uppercase tracking-widest text-zinc-500 mb-2">
              Spécialités de la maison
            </p>
            <h2
              className="font-display text-2xl sm:text-3xl lg:text-4xl font-extrabold text-[#141414] tracking-tight"
              style={{ textWrap: 'balance' }}
            >
              Trois obsessions culinaires, cuites à la commande.
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

        {/* Asymmetric Editorial Bento Grid with 3D Pointer Tilt */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 lg:gap-8">
          {featuredCards.map((card, index) => {
            const isWideBanner = index === 2;
            return (
              <motion.div
                key={card.item.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.18 }}
                transition={{
                  duration: 0.45,
                  delay: index * 0.08,
                  ease: [0.16, 1, 0.3, 1],
                }}
                className={card.spanClass}
              >
                <TiltCard
                  maxTiltDeg={4}
                  darkSpotlight
                  className="group h-full bg-[#141414] rounded-2xl overflow-hidden border border-zinc-800/80 shadow-lg"
                >
                  <div
                    className={`grid h-full ${
                      isWideBanner ? 'grid-cols-1 lg:grid-cols-12 items-stretch' : 'grid-cols-1'
                    }`}
                  >
                    {/* Visual Surface */}
                    <button
                      type="button"
                      onClick={() => onSelectProduct(card.item)}
                      className={`relative overflow-hidden text-left cursor-pointer ${
                        isWideBanner
                          ? 'lg:col-span-7 aspect-[16/10] lg:aspect-auto lg:min-h-[320px]'
                          : 'aspect-[16/10] w-full'
                      }`}
                    >
                      <FoodImage
                        src={card.item.image}
                        alt={card.item.name}
                        className="w-full h-full object-cover group-hover:scale-[1.06] transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]"
                      />
                      <div
                        className={`absolute inset-0 ${
                          isWideBanner
                            ? 'bg-gradient-to-t lg:bg-gradient-to-r from-[#141414]/80 via-[#141414]/25 to-transparent'
                            : 'bg-gradient-to-t from-[#141414] via-[#141414]/35 to-transparent'
                        }`}
                      />
                    </button>

                    {/* Content Block */}
                    <div
                      className={`p-5 sm:p-7 lg:p-8 flex flex-col justify-between text-white ${
                        isWideBanner ? 'lg:col-span-5 justify-center' : ''
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between gap-3 text-[11px] sm:text-xs font-medium uppercase tracking-wider text-zinc-400 mb-2">
                          <span className="truncate">{card.eyebrow}</span>
                          <span className="font-mono tabular-nums text-zinc-200 shrink-0">
                            {formatMoney(card.item.priceUsd, currency)}
                          </span>
                        </div>

                        <h3 className="font-display text-lg sm:text-2xl font-bold text-white mb-1.5 sm:mb-2">
                          {card.item.name}
                        </h3>
                        <p className="text-xs sm:text-sm font-medium text-[#F59E0B] mb-2.5 sm:mb-3">
                          {card.highlight}
                        </p>
                        <p className="text-sm text-zinc-300 leading-relaxed line-clamp-2 mb-5 sm:mb-6">
                          {card.item.description}
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center justify-between sm:justify-start gap-2.5 sm:gap-3 pt-4 border-t border-zinc-800">
                        <button
                          type="button"
                          onClick={() => onSelectProduct(card.item)}
                          className="ms-btn-glint inline-flex items-center gap-2 px-4 py-2.5 min-h-[42px] bg-[#D92323] text-white text-xs sm:text-sm font-semibold rounded-lg hover:bg-[#B81C1C] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                        >
                          <span>Personnaliser</span>
                          <ArrowUpRight className="w-4 h-4" strokeWidth={2} />
                        </button>
                        <button
                          type="button"
                          onClick={() => onExploreCategory(card.category)}
                          className="inline-flex items-center gap-1.5 px-3 py-2.5 min-h-[42px] text-xs sm:text-sm font-semibold text-zinc-300 hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                        >
                          <span>Voir la catégorie</span>
                          <ArrowRight className="w-3.5 h-3.5" strokeWidth={2} />
                        </button>
                      </div>
                    </div>
                  </div>
                </TiltCard>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
