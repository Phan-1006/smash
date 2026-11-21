import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ArrowRight, ArrowUpRight } from 'lucide-react';
import { motion } from 'motion/react';
import { formatMoney, MenuCategory, MenuItem } from '../data/menu';
import type { CurrencyCode } from '../types/ecommerce';
import { FoodImage } from './FoodImage';
import { MagneticButton } from './MagneticButton';
import { TiltCard } from './TiltCard';

gsap.registerPlugin(ScrollTrigger);

interface CrispyAndDrinksSectionProps {
  items: MenuItem[];
  currency: CurrencyCode;
  crispyShowcaseImage?: string;
  friesShowcaseImage?: string;
  drinksShowcaseImage?: string;
  usdToCdfRate?: number;
  onSelectProduct: (item: MenuItem) => void;
  onExploreCategory: (category: MenuCategory) => void;
}

export function CrispyAndDrinksSection({
  items,
  currency,
  crispyShowcaseImage = '/src/assets/images/crispy_chicken_campaign_1795265770266.jpg',
  friesShowcaseImage = '/src/assets/images/fries_loaded_box_1794856489833.jpg',
  drinksShowcaseImage = '/src/assets/images/milkshake_studio_campaign_1795265770716.jpg',
  usdToCdfRate,
  onSelectProduct,
  onExploreCategory,
}: CrispyAndDrinksSectionProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const crispyMaskRef = useRef<HTMLDivElement>(null);
  const crispyParallaxRef = useRef<HTMLDivElement>(null);
  const drinkParallaxRef = useRef<HTMLDivElement>(null);
  const [reducedMotion, setReducedMotion] = useState(false);

  const crispyAndSides = useMemo(
    () => items.filter((item) => item.category === 'chicken' || item.category === 'sides'),
    [items]
  );
  const drinks = useMemo(
    () => items.filter((item) => item.category === 'drinks'),
    [items]
  );

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => setReducedMotion(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  useLayoutEffect(() => {
    const root = containerRef.current;
    const crispyMask = crispyMaskRef.current;
    const crispyParallax = crispyParallaxRef.current;
    const drinkParallax = drinkParallaxRef.current;
    if (!root || reducedMotion) return;

    const ctx = gsap.context(() => {
      if (crispyMask) {
        gsap.fromTo(
          crispyMask,
          { clipPath: 'inset(10% 0% 10% 0% round 1rem)' },
          {
            clipPath: 'inset(0% 0% 0% 0% round 1rem)',
            duration: 0.85,
            ease: 'power3.out',
            scrollTrigger: {
              trigger: crispyMask,
              start: 'top 84%',
              once: true,
            },
          }
        );
      }

      if (crispyParallax) {
        gsap.fromTo(
          crispyParallax,
          { yPercent: 8 },
          {
            yPercent: -8,
            ease: 'none',
            scrollTrigger: {
              trigger: crispyParallax,
              start: 'top bottom',
              end: 'bottom top',
              scrub: true,
            },
          }
        );
      }

      if (drinkParallax) {
        gsap.fromTo(
          drinkParallax,
          { yPercent: 6 },
          {
            yPercent: -7,
            ease: 'none',
            scrollTrigger: {
              trigger: drinkParallax,
              start: 'top bottom',
              end: 'bottom top',
              scrub: true,
            },
          }
        );
      }
    }, containerRef);

    return () => ctx.revert();
  }, [reducedMotion]);

  if (crispyAndSides.length === 0 && drinks.length === 0) return null;

  return (
    <div id="crispy-drinks" ref={containerRef} className="scroll-mt-16">
      {/* UPPER DARK STAGE — CRISPY CHICKEN & HAND-CUT FRIES */}
      {crispyAndSides.length > 0 && (
        <section className="bg-[#141414] text-white py-14 sm:py-20 lg:py-28 border-b border-zinc-800/80 overflow-hidden">
          <div className="max-w-7xl xl:max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-10">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
              {/* Left Asymmetric Editorial Photography Stage */}
              <div className="lg:col-span-7 relative pb-6 sm:pb-10">
                <TiltCard maxTiltDeg={3} darkSpotlight className="rounded-2xl shadow-2xl">
                  <div
                    ref={crispyMaskRef}
                    className="group ms-card-media aspect-[4/3] rounded-2xl overflow-hidden bg-zinc-900 will-change-transform"
                  >
                    <FoodImage
                      src={crispyShowcaseImage}
                      alt="Poulet croustillant mariné au babeurre 48h, tenders dorés et frites coupées main"
                      className="w-full h-full object-cover group-hover:scale-[1.05] transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]"
                    />
                  </div>
                </TiltCard>

                {/* Opposing parallax secondary craft detail (tablet & desktop) */}
                <div
                  ref={crispyParallaxRef}
                  className="hidden sm:block sm:w-[46%] sm:ml-auto -mt-16 mr-4 relative z-10 will-change-transform"
                >
                  <TiltCard maxTiltDeg={4} darkSpotlight className="rounded-xl shadow-2xl">
                    <div className="aspect-[16/10] rounded-xl overflow-hidden bg-[#0E0E11] border-4 border-[#141414]">
                      <FoodImage
                        src={friesShowcaseImage}
                        alt="Frites coupées main double cuisson et mayonnaise épicée maison"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </TiltCard>
                </div>
              </div>

              {/* Right Content + All Real Crispy & Sides Products */}
              <div className="lg:col-span-5 space-y-6">
                <motion.div
                  initial={reducedMotion ? false : { opacity: 0, y: 18 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.25 }}
                  transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                >
                  <p className="text-[11px] sm:text-xs font-semibold uppercase tracking-[0.22em] text-[#F59E0B] mb-2.5">
                    Expérience Crispy &amp; Frites · Marinade 48h
                  </p>
                  <h2
                    className="font-display font-extrabold text-white tracking-tight leading-[1.04] mb-4"
                    style={{ fontSize: 'clamp(1.9rem, 3.8vw, 3.2rem)', textWrap: 'balance' }}
                  >
                    Croustillant bruité. Tendreté babeurre.
                  </h2>
                  <p className="text-sm sm:text-base text-zinc-300 leading-relaxed">
                    Haut de cuisse fermier mariné 48h au babeurre, chapelure minute et pommes de
                    terre fraîches coupées chaque matin en double bain croustillant.
                  </p>
                </motion.div>

                {/* Real Crispy & Sides Catalog List */}
                <div className="divide-y divide-zinc-800 border-y border-zinc-800">
                  {crispyAndSides.map((dish) => (
                    <div
                      key={dish.id}
                      className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-zinc-400">
                          <span>{dish.categoryLabel}</span>
                          <span aria-hidden="true">·</span>
                          <span className="tabular-nums">{dish.calories}</span>
                        </div>
                        <h3 className="font-display text-base sm:text-lg font-bold text-white mt-0.5">
                          {dish.name}
                        </h3>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                        <span className="font-mono tabular-nums text-sm sm:text-base font-bold text-[#F59E0B]">
                          {formatMoney(dish.priceUsd, currency, usdToCdfRate)}
                        </span>
                        <button
                          type="button"
                          onClick={() => onSelectProduct(dish)}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 min-h-[40px] bg-white text-[#141414] text-xs font-semibold rounded-lg hover:bg-[#D92323] hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                        >
                          <span>Personnaliser</span>
                          <ArrowUpRight className="w-3.5 h-3.5" strokeWidth={2} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex flex-wrap items-center gap-5 pt-1">
                  <button
                    type="button"
                    onClick={() => onExploreCategory('chicken')}
                    className="ms-link-underline inline-flex items-center gap-2 text-sm font-semibold text-white hover:text-[#F59E0B] transition-colors py-1.5 cursor-pointer"
                  >
                    <span>Explorer Poulet Croustillant</span>
                    <ArrowRight className="w-4 h-4" strokeWidth={2} />
                  </button>
                  <button
                    type="button"
                    onClick={() => onExploreCategory('sides')}
                    className="ms-link-underline inline-flex items-center gap-2 text-sm font-semibold text-zinc-300 hover:text-white transition-colors py-1.5 cursor-pointer"
                  >
                    <span>Voir Frites &amp; Sides</span>
                    <ArrowRight className="w-4 h-4" strokeWidth={2} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* LOWER LIGHT CONTRAST STAGE — DRINKS & MILKSHAKES WITH 2.5D FLOAT */}
      {drinks.length > 0 && (
        <section className="bg-[#F5F5F7] text-[#141414] py-14 sm:py-20 lg:py-24 border-b border-zinc-200 overflow-hidden">
          <div className="max-w-7xl xl:max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-10">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
              {/* Left Copy + Real Drinks List */}
              <div className="lg:col-span-7 lg:order-1 order-2 space-y-6">
                <motion.div
                  initial={reducedMotion ? false : { opacity: 0, y: 18 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.25 }}
                  transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                >
                  <p className="text-[11px] sm:text-xs font-semibold uppercase tracking-[0.22em] text-[#D92323] mb-2.5">
                    Expérience Boissons &amp; Shakes · Turbiné minute
                  </p>
                  <h2
                    className="font-display font-extrabold text-[#141414] tracking-tight leading-[1.04] mb-4"
                    style={{ fontSize: 'clamp(1.9rem, 3.8vw, 3.2rem)', textWrap: 'balance' }}
                  >
                    Gousse de vanille de Madagascar &amp; caramel salé.
                  </h2>
                  <p className="text-sm sm:text-base text-zinc-600 leading-relaxed max-w-xl">
                    Crème glacée artisanale montée à la commande, nappage caramel au beurre salé et
                    chantilly aérienne pour équilibrer la chaleur du smash.
                  </p>
                </motion.div>

                <div className="divide-y divide-zinc-300 border-y border-zinc-300">
                  {drinks.map((drink) => (
                    <div
                      key={drink.id}
                      className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <p className="text-[11px] uppercase tracking-wider text-zinc-500 tabular-nums">
                          {drink.categoryLabel} · {drink.calories}
                        </p>
                        <h3 className="font-display text-lg font-bold text-[#141414] mt-0.5">
                          {drink.name}
                        </h3>
                        <p className="text-xs sm:text-sm text-zinc-600 line-clamp-2 mt-1">
                          {drink.description}
                        </p>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                        <span className="font-mono tabular-nums text-base font-bold text-[#141414]">
                          {formatMoney(drink.priceUsd, currency, usdToCdfRate)}
                        </span>
                        <MagneticButton
                          onClick={() => onSelectProduct(drink)}
                          className="ms-btn-glint inline-flex items-center gap-1.5 px-4 py-2.5 min-h-[42px] bg-[#D92323] text-white text-xs font-semibold rounded-lg hover:bg-[#B81C1C] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                        >
                          <span>Personnaliser</span>
                          <ArrowUpRight className="w-3.5 h-3.5" strokeWidth={2} />
                        </MagneticButton>
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => onExploreCategory('drinks')}
                  className="ms-link-underline inline-flex items-center gap-2 text-sm font-semibold text-[#141414] hover:text-[#D92323] transition-colors py-1.5 cursor-pointer"
                >
                  <span>Accéder au rayon boissons de la carte</span>
                  <ArrowRight className="w-4 h-4" strokeWidth={2} />
                </button>
              </div>

              {/* Right Tall Portrait Milkshake Stage with Subtle 2.5D Float */}
              <div className="lg:col-span-5 lg:order-2 order-1 flex justify-center">
                <div ref={drinkParallaxRef} className="w-full max-w-sm will-change-transform">
                  <div className="ms-float-slow">
                    <TiltCard maxTiltDeg={4} darkSpotlight className="rounded-2xl shadow-2xl">
                      <div className="aspect-[3/4] rounded-2xl overflow-hidden bg-[#141414] border-8 border-white">
                        <FoodImage
                          src={drinksShowcaseImage}
                          alt="Milkshake artisanal à la vanille de Madagascar et caramel au beurre salé"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </TiltCard>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
