import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ArrowRight, ArrowUpRight } from 'lucide-react';
import { motion } from 'motion/react';
import { formatMoney, MenuCategory, MenuItem } from '../data/menu';
import type { CurrencyCode } from '../types/ecommerce';
import { FoodImage } from './FoodImage';
import { MagneticButton } from './MagneticButton';

gsap.registerPlugin(ScrollTrigger);

interface PizzaExperienceSectionProps {
  items: MenuItem[];
  currency: CurrencyCode;
  pizzaShowcaseImage?: string;
  usdToCdfRate?: number;
  onSelectProduct: (item: MenuItem) => void;
  onExploreCategory: (category: MenuCategory) => void;
}

const PIZZA_CRAFT_NOTES = [
  {
    index: '01',
    title: 'Levain 72 heures',
    detail: 'Hydratation 68% fermentée à froid pour une cornicione alvéolée et digeste.',
  },
  {
    index: '02',
    title: 'Cuisson sur pierre',
    detail: 'Sole volcanique saisie à haute température en moins de 3 minutes chrono.',
  },
  {
    index: '03',
    title: 'San Marzano & Burrata',
    detail: 'Tomates concassées à vif, fior di latte et burrata crémeuse posée à la sortie.',
  },
  {
    index: '04',
    title: 'Miel pimenté maison',
    detail: 'Infusion lente de piment doux dans un miel floral sur nos coupelles de pepperoni.',
  },
];

export function PizzaExperienceSection({
  items,
  currency,
  pizzaShowcaseImage = '/src/assets/images/pizza_overhead_editorial_1795265770611.jpg',
  usdToCdfRate,
  onSelectProduct,
  onExploreCategory,
}: PizzaExperienceSectionProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const pizzaWheelRef = useRef<HTMLDivElement>(null);
  const [reducedMotion, setReducedMotion] = useState(false);

  const pizzas = useMemo(
    () => items.filter((item) => item.category === 'pizzas'),
    [items]
  );

  const [selectedPizzaId, setSelectedPizzaId] = useState<string>('');
  const activePizza = useMemo(() => {
    if (pizzas.length === 0) return undefined;
    return pizzas.find((p) => p.id === selectedPizzaId) || pizzas[0];
  }, [pizzas, selectedPizzaId]);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => setReducedMotion(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  useLayoutEffect(() => {
    const section = sectionRef.current;
    const wheel = pizzaWheelRef.current;
    if (!section || !wheel || reducedMotion) return;

    const ctx = gsap.context(() => {
      gsap.fromTo(
        wheel,
        { scale: 0.88, rotation: -12 },
        {
          scale: 1.03,
          rotation: 6,
          ease: 'none',
          scrollTrigger: {
            trigger: section,
            start: 'top 82%',
            end: 'bottom 25%',
            scrub: 0.6,
          },
        }
      );
    }, sectionRef);

    return () => ctx.revert();
  }, [reducedMotion]);

  if (pizzas.length === 0) return null;

  // Use the admin-configured showcase visual by default, or switch to the chosen pizza's photo
  const usingDefaultSpotlight = !selectedPizzaId;
  const wheelImageSrc = usingDefaultSpotlight
    ? pizzaShowcaseImage
    : activePizza?.image || pizzaShowcaseImage;

  return (
    <section
      id="pizzas"
      ref={sectionRef}
      className="scroll-mt-16 bg-[#FAF7F2] text-[#141414] border-b border-zinc-200/80 py-14 sm:py-20 lg:py-28 overflow-hidden"
    >
      <div className="max-w-7xl xl:max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-10">
        {/* Editorial Heading */}
        <motion.div
          initial={reducedMotion ? false : { opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-10 sm:mb-14"
        >
          <div className="max-w-2xl">
            <p className="text-[11px] sm:text-xs font-semibold uppercase tracking-[0.22em] text-[#D92323] mb-2.5">
              Expérience Pizza · Pâte vivante 72h
            </p>
            <h2
              className="font-display font-extrabold text-[#141414] tracking-tight leading-[1.03]"
              style={{ fontSize: 'clamp(1.95rem, 4.3vw, 3.6rem)', textWrap: 'balance' }}
            >
              Pâte au levain fermentée 72h. Cuite sur pierre brûlante.
            </h2>
          </div>

          <button
            type="button"
            onClick={() => onExploreCategory('pizzas')}
            className="inline-flex items-center gap-2 text-sm font-semibold text-[#141414] hover:text-[#D92323] transition-colors self-start lg:self-auto whitespace-nowrap shrink-0 cursor-pointer min-h-[44px]"
          >
            <span>Voir les {pizzas.length} pizzas à la carte</span>
            <ArrowRight className="w-4 h-4" strokeWidth={2} />
          </button>
        </motion.div>

        {/* Main Pizza Stage: Giant Overhead Rotating Pizza + Real Pizza Selector */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
          {/* Giant Overhead Pizza Visual */}
          <div className="lg:col-span-6 flex flex-col items-center justify-center relative">
            <div
              ref={pizzaWheelRef}
              className="relative w-[270px] sm:w-[370px] lg:w-[460px] aspect-square rounded-full overflow-hidden shadow-2xl border-8 border-white bg-[#141414] will-change-transform"
            >
              <FoodImage
                src={wheelImageSrc}
                alt={activePizza?.name || 'Pizza artisanale Maison Smash'}
                className="w-full h-full object-cover"
              />
            </div>

            {activePizza && (
              <div className="mt-5 text-center">
                <p className="font-display text-lg sm:text-xl font-bold text-[#141414]">
                  {activePizza.name} ·{' '}
                  <span className="font-mono tabular-nums text-[#D92323]">
                    {formatMoney(activePizza.priceUsd, currency, usdToCdfRate)}
                  </span>
                </p>
                <p className="text-xs text-zinc-500 mt-1 tabular-nums">
                  {activePizza.calories}
                  {activePizza.supportsCombo
                    ? ` · Option Menu +${formatMoney(activePizza.comboExtraUsd, currency, usdToCdfRate)}`
                    : ''}
                </p>
              </div>
            )}
          </div>

          {/* Right Column: Interactive Real Pizza Selector + 4 Highlighted Ingredients */}
          <div className="lg:col-span-6 space-y-8">
            {/* Real catalog pizza selector */}
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                Sélectionner une recette du four
              </p>

              <div className="divide-y divide-zinc-300/80 border-y border-zinc-300/80">
                {pizzas.map((pizza) => {
                  const isActive = activePizza?.id === pizza.id;
                  return (
                    <div
                      key={pizza.id}
                      className={`py-4 transition-colors ${
                        isActive ? 'bg-white/75 -mx-3 px-3 rounded-xl' : ''
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <button
                          type="button"
                          onClick={() => setSelectedPizzaId(pizza.id)}
                          className="text-left flex-1 min-w-0 cursor-pointer group"
                        >
                          <div className="flex items-center gap-2.5">
                            <span
                              className={`font-display text-base sm:text-lg font-bold transition-colors ${
                                isActive
                                  ? 'text-[#D92323]'
                                  : 'text-[#141414] group-hover:text-[#D92323]'
                              }`}
                            >
                              {pizza.name}
                            </span>
                            {pizza.tag && (
                              <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                                · {pizza.tag}
                              </span>
                            )}
                          </div>
                          <p className="text-xs sm:text-sm text-zinc-600 leading-relaxed line-clamp-2 mt-1">
                            {pizza.description}
                          </p>
                        </button>

                        <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                          <span className="font-mono tabular-nums text-sm sm:text-base font-bold text-[#141414]">
                            {formatMoney(pizza.priceUsd, currency, usdToCdfRate)}
                          </span>
                          <MagneticButton
                            onClick={() => onSelectProduct(pizza)}
                            className="ms-btn-glint inline-flex items-center gap-1.5 px-3.5 py-2 min-h-[40px] bg-[#141414] text-white text-xs font-semibold rounded-lg hover:bg-[#D92323] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                          >
                            <span>Personnaliser</span>
                            <ArrowUpRight className="w-3.5 h-3.5" strokeWidth={2} />
                          </MagneticButton>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 4 Unboxed Editorial Ingredient Highlights */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-2">
              {PIZZA_CRAFT_NOTES.map((note) => (
                <div key={note.index} className="border-t border-zinc-300/80 pt-3">
                  <p className="text-xs font-mono text-[#D92323] font-semibold">
                    {note.index} · {note.title}
                  </p>
                  <p className="text-xs sm:text-sm text-zinc-600 leading-relaxed mt-1">
                    {note.detail}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
