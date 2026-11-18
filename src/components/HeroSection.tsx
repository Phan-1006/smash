import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ArrowDown, ArrowRight } from 'lucide-react';
import { motion } from 'motion/react';
import { formatMoney, MenuItem } from '../data/menu';
import type { CurrencyCode } from '../types/ecommerce';
import { FoodImage } from './FoodImage';
import { MagneticButton } from './MagneticButton';
import { TiltCard } from './TiltCard';

gsap.registerPlugin(ScrollTrigger);

interface HeroSectionProps {
  signatureItem?: MenuItem;
  currency: CurrencyCode;
  onSelectProduct?: (item: MenuItem) => void;
}

export function HeroSection({ signatureItem, currency, onSelectProduct }: HeroSectionProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const mediaParallaxRef = useRef<HTMLDivElement>(null);
  const ambientGlowRef = useRef<HTMLDivElement>(null);
  const [reducedMotion, setReducedMotion] = useState(false);

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
    const media = mediaParallaxRef.current;
    const glow = ambientGlowRef.current;
    if (!section || !media || reducedMotion) return;

    const ctx = gsap.context(() => {
      gsap.to(media, {
        yPercent: 8,
        ease: 'none',
        scrollTrigger: {
          trigger: section,
          start: 'top top',
          end: 'bottom top',
          scrub: true,
        },
      });

      if (glow) {
        gsap.to(glow, {
          yPercent: 18,
          opacity: 0.35,
          ease: 'none',
          scrollTrigger: {
            trigger: section,
            start: 'top top',
            end: 'bottom top',
            scrub: true,
          },
        });
      }
    }, sectionRef);

    return () => ctx.revert();
  }, [reducedMotion]);

  const priceText = signatureItem ? formatMoney(signatureItem.priceUsd, currency) : '$13.00';

  return (
    <section
      id="top"
      ref={sectionRef}
      className="relative bg-[#0E0E11] text-white border-b border-zinc-800/80 overflow-hidden"
    >
      {/* Subtle studio atmosphere */}
      <div
        ref={ambientGlowRef}
        className="absolute -top-32 right-0 w-[620px] h-[620px] rounded-full pointer-events-none opacity-65 will-change-transform"
        style={{
          background:
            'radial-gradient(circle, rgba(217, 35, 35, 0.22) 0%, rgba(245, 158, 11, 0.08) 42%, transparent 72%)',
        }}
        aria-hidden="true"
      />

      <div className="relative z-10 max-w-7xl xl:max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-10 py-7 sm:py-12 lg:py-20 xl:py-24">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 lg:gap-12 xl:gap-14 items-stretch">
          {/* Left editorial copy column */}
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            className="lg:col-span-6 flex flex-col justify-center"
          >
            <p className="text-[11px] sm:text-xs font-medium uppercase tracking-widest text-zinc-400 mb-2.5 sm:mb-4">
              Kinshasa, Gombe · Smash Burgers · Pizzas sur pierre
            </p>
            <h1
              className="font-display font-extrabold text-white tracking-tight leading-[1.04] mb-3.5 sm:mb-5"
              style={{ fontSize: 'clamp(1.85rem, 6.2vw, 4.15rem)', textWrap: 'balance' }}
            >
              Le vrai smash burger & nos pizzas au feu de pierre.
            </h1>
            <p className="text-sm sm:text-base lg:text-lg text-zinc-300 leading-relaxed max-w-xl mb-5 sm:mb-8">
              Des steaks frais écrasés à 260°C sur plancha brûlante, des pâtons fermentés 72 heures
              et du poulet mariné au babeurre. Commandez en ligne et réglez par Mobile Money ou
              carte bancaire.
            </p>

            <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-2.5 sm:gap-4">
              <MagneticButton
                href="#menu"
                wrapperClassName="w-full sm:w-auto inline-flex"
                className="ms-btn-glint group w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-6 py-3.5 min-h-[46px] bg-[#D92323] text-white text-sm font-semibold rounded-lg hover:bg-[#B81C1C] transition-colors whitespace-nowrap shrink-0 shadow-lg shadow-[#D92323]/25 cursor-pointer"
              >
                <span>Commander maintenant</span>
                <ArrowRight
                  className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1"
                  strokeWidth={2}
                />
              </MagneticButton>

              <a
                href="#burger-story"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3.5 min-h-[46px] border border-zinc-700 text-zinc-200 text-sm font-semibold rounded-lg hover:bg-zinc-900 hover:border-zinc-500 hover:text-white transition-colors active:scale-[0.98] whitespace-nowrap shrink-0"
              >
                <span>Découvrir l’assemblage</span>
                <ArrowDown className="w-4 h-4" strokeWidth={2} />
              </a>
            </div>
          </motion.div>

          {/* Right hero visual with 3D tilt + scroll parallax */}
          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
            className="lg:col-span-6"
          >
            <TiltCard maxTiltDeg={4} darkSpotlight className="h-full rounded-2xl">
              <button
                type="button"
                onClick={() => signatureItem && onSelectProduct?.(signatureItem)}
                className="group relative block w-full text-left aspect-[16/10] sm:aspect-[16/9] lg:aspect-auto lg:h-full min-h-[210px] sm:min-h-[320px] lg:min-h-[440px] xl:min-h-[500px] rounded-2xl overflow-hidden bg-[#18181B] border border-zinc-800/90 shadow-2xl cursor-pointer"
              >
                <div ref={mediaParallaxRef} className="w-full h-full will-change-transform">
                  <FoodImage
                    src="/src/assets/images/hero_smash_burger_1794856487440.jpg"
                    alt="Double smash burger avec cheddar fondant et croûte caramélisée"
                    className="ms-hero-ken-burns w-full h-full object-cover"
                  />
                </div>
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/45 to-transparent p-4 sm:p-7">
                  <div className="flex items-end justify-between gap-3 sm:gap-4 text-white">
                    <div className="min-w-0">
                      <p className="text-[11px] sm:text-xs uppercase tracking-wider text-zinc-300 mb-0.5 sm:mb-1 truncate">
                        Best-seller{' '}
                        <span className="hidden sm:inline">du comptoir · Personnaliser</span>
                      </p>
                      <p className="font-display text-base sm:text-xl font-bold truncate">
                        Signature Maison Smash
                      </p>
                    </div>
                    <p className="font-mono tabular-nums text-sm sm:text-lg font-semibold text-[#F59E0B] shrink-0">
                      {priceText}
                    </p>
                  </div>
                </div>
              </button>
            </TiltCard>
          </motion.div>
        </div>

        {/* Full-width 4-column culinary metrics bar below hero split */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="mt-7 sm:mt-12 pt-5 sm:pt-8 border-t border-zinc-800 grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-8"
        >
          <div className="ms-metric-item pt-2 sm:pt-3">
            <p className="text-[11px] sm:text-xs uppercase tracking-wider text-zinc-400 mb-0.5 sm:mb-1">
              Préparation minute
            </p>
            <p className="font-display text-sm sm:text-lg font-bold text-white tabular-nums">
              12 minutes
            </p>
          </div>
          <div className="ms-metric-item pt-2 sm:pt-3">
            <p className="text-[11px] sm:text-xs uppercase tracking-wider text-zinc-400 mb-0.5 sm:mb-1">
              Pâte & Viande
            </p>
            <p className="font-display text-sm sm:text-lg font-bold text-white">
              Frais chaque matin
            </p>
          </div>
          <div className="ms-metric-item pt-2 sm:pt-3">
            <p className="text-[11px] sm:text-xs uppercase tracking-wider text-zinc-400 mb-0.5 sm:mb-1">
              Règlement en ligne
            </p>
            <p className="font-display text-sm sm:text-lg font-bold text-white">
              Mobile Money & Cartes
            </p>
          </div>
          <div className="ms-metric-item pt-2 sm:pt-3">
            <p className="text-[11px] sm:text-xs uppercase tracking-wider text-zinc-400 mb-0.5 sm:mb-1">
              Livraison express
            </p>
            <p className="font-display text-sm sm:text-lg font-bold text-white tabular-nums">
              Gratuite dès $30
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
