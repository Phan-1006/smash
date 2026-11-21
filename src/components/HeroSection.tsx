import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ArrowDown, ArrowRight, ArrowUpRight } from 'lucide-react';
import { motion } from 'motion/react';
import { formatMoney, MenuItem } from '../data/menu';
import { DEFAULT_SITE_SETTINGS } from '../data/siteSettings';
import type { CurrencyCode, SiteSettingsDoc } from '../types/ecommerce';
import { FoodImage } from './FoodImage';
import { MagneticButton } from './MagneticButton';
import { TiltCard } from './TiltCard';

gsap.registerPlugin(ScrollTrigger);

interface HeroSectionProps {
  signatureItem?: MenuItem;
  currency: CurrencyCode;
  siteSettings?: Omit<SiteSettingsDoc, 'updatedAt'>;
  onSelectProduct?: (item: MenuItem) => void;
}

const FAMILY_JUMPS = [
  { label: 'Burgers', href: '#burger-story' },
  { label: 'Pizzas', href: '#pizzas' },
  { label: 'Poulet & Frites', href: '#crispy-drinks' },
  { label: 'Milkshakes', href: '#crispy-drinks' },
];

export function HeroSection({
  signatureItem,
  currency,
  siteSettings = DEFAULT_SITE_SETTINGS,
  onSelectProduct,
}: HeroSectionProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const mainFrameRef = useRef<HTMLDivElement>(null);
  const macroFloatRef = useRef<HTMLDivElement>(null);
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
    const mainFrame = mainFrameRef.current;
    const macroFloat = macroFloatRef.current;
    if (!section || !mainFrame || reducedMotion) return;

    const ctx = gsap.context(() => {
      gsap.fromTo(
        mainFrame,
        { yPercent: 0 },
        {
          yPercent: 8,
          ease: 'none',
          scrollTrigger: {
            trigger: section,
            start: 'top top',
            end: 'bottom top',
            scrub: true,
          },
        }
      );

      if (macroFloat) {
        gsap.fromTo(
          macroFloat,
          { yPercent: 6 },
          {
            yPercent: -12,
            ease: 'none',
            scrollTrigger: {
              trigger: section,
              start: 'top top',
              end: 'bottom top',
              scrub: true,
            },
          }
        );
      }
    }, sectionRef);

    return () => ctx.revert();
  }, [reducedMotion]);

  const priceText = signatureItem
    ? formatMoney(signatureItem.priceUsd, currency, siteSettings.usdToCdfRate)
    : formatMoney(13, currency, siteSettings.usdToCdfRate);

  return (
    <section
      id="top"
      ref={sectionRef}
      className="relative bg-white text-[#141414] border-b border-zinc-200 overflow-hidden"
    >
      <div className="max-w-7xl xl:max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-10 pt-8 sm:pt-12 lg:pt-16 pb-10 sm:pb-14 lg:pb-16">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 sm:gap-10 lg:gap-12 items-center">
          {/* Left Editorial Column */}
          <div className="lg:col-span-6 xl:col-span-6">
            <motion.p
              initial={reducedMotion ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className="text-[11px] sm:text-xs font-semibold uppercase tracking-[0.22em] text-[#D92323] mb-3 sm:mb-4"
            >
              {siteSettings.storeCity} · {siteSettings.heroKicker}
            </motion.p>

            <motion.h1
              initial={reducedMotion ? false : { opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.06, ease: [0.16, 1, 0.3, 1] }}
              className="font-display font-extrabold text-[#141414] tracking-tight leading-[1.02] mb-4 sm:mb-6"
              style={{ fontSize: 'clamp(2.25rem, 4.7vw, 4.15rem)', textWrap: 'balance' }}
            >
              {siteSettings.heroTitle}
            </motion.h1>

            <motion.p
              initial={reducedMotion ? false : { opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.12, ease: [0.16, 1, 0.3, 1] }}
              className="text-sm sm:text-base lg:text-lg text-zinc-600 leading-relaxed max-w-xl mb-6 sm:mb-8"
            >
              {siteSettings.heroSubtitle}
            </motion.p>

            {/* Primary & Signature CTAs */}
            <motion.div
              initial={reducedMotion ? false : { opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.18, ease: [0.16, 1, 0.3, 1] }}
              className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-3 sm:gap-4 mb-7 sm:mb-9"
            >
              <MagneticButton
                href="#menu"
                wrapperClassName="w-full sm:w-auto inline-flex"
                className="ms-btn-glint group w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-6 sm:px-7 py-3.5 min-h-[48px] bg-[#D92323] text-white text-sm font-semibold rounded-lg hover:bg-[#B81C1C] transition-colors whitespace-nowrap shrink-0 shadow-lg shadow-[#D92323]/20 cursor-pointer"
              >
                <span>Découvrir la carte</span>
                <ArrowRight
                  className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1"
                  strokeWidth={2}
                />
              </MagneticButton>

              {signatureItem && (
                <button
                  type="button"
                  onClick={() => onSelectProduct?.(signatureItem)}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-5 py-3.5 min-h-[48px] border border-zinc-300 bg-[#FAF7F2] text-[#141414] text-sm font-semibold rounded-lg hover:border-[#141414] hover:bg-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <span>{signatureItem.name}</span>
                  <span className="font-mono tabular-nums text-[#D92323]">{priceText}</span>
                  <ArrowUpRight className="w-4 h-4 text-zinc-500" strokeWidth={2} />
                </button>
              )}
            </motion.div>

            {/* Clean 4-Family Editorial Quick-Jump Strip */}
            <div className="pt-5 border-t border-zinc-200 flex flex-wrap items-center gap-x-5 sm:gap-x-7 gap-y-2 text-xs sm:text-sm font-semibold text-zinc-700">
              <span className="text-[11px] uppercase tracking-[0.18em] text-zinc-400">
                Explorer :
              </span>
              {FAMILY_JUMPS.map((jump) => (
                <a
                  key={jump.label}
                  href={jump.href}
                  className="ms-link-underline inline-flex items-center gap-1.5 py-1.5 min-h-[36px] hover:text-[#D92323] transition-colors whitespace-nowrap shrink-0"
                >
                  <span>{jump.label}</span>
                  <ArrowDown className="w-3 h-3 text-zinc-400" strokeWidth={2} />
                </a>
              ))}
            </div>
          </div>

          {/* Right Layered 2.5D Photographic Stage */}
          <div className="lg:col-span-6 xl:col-span-6 relative pb-4 sm:pb-8 lg:pb-6">
            <div ref={mainFrameRef} className="will-change-transform">
              <TiltCard maxTiltDeg={3.5} darkSpotlight className="rounded-2xl shadow-2xl">
                <div className="relative aspect-[4/3] sm:aspect-[16/12] rounded-2xl overflow-hidden bg-[#141414]">
                  <FoodImage
                    src={siteSettings.heroMainImage}
                    alt="Double smash burger artisanal saisi à haute température"
                    className="ms-hero-ken-burns w-full h-full object-cover"
                  />
                  <div
                    className="absolute inset-0 bg-gradient-to-t from-[#141414]/85 via-transparent to-transparent pointer-events-none"
                    aria-hidden="true"
                  />

                  {/* Quiet integrated bottom editorial caption */}
                  {signatureItem && (
                    <button
                      type="button"
                      onClick={() => onSelectProduct?.(signatureItem)}
                      className="absolute inset-x-0 bottom-0 p-4 sm:p-6 flex items-end justify-between gap-4 text-left text-white cursor-pointer group"
                    >
                      <div className="min-w-0">
                        <p className="text-[11px] uppercase tracking-[0.18em] text-[#F59E0B] font-semibold">
                          Recette vedette du comptoir
                        </p>
                        <p className="font-display text-lg sm:text-xl font-bold truncate group-hover:text-[#F59E0B] transition-colors">
                          {signatureItem.name}
                        </p>
                      </div>
                      <span className="font-mono tabular-nums text-sm sm:text-base font-bold px-3 py-1.5 rounded-lg bg-white/12 backdrop-blur-sm border border-white/15 shrink-0">
                        {priceText}
                      </span>
                    </button>
                  )}
                </div>
              </TiltCard>
            </div>

            {/* Opposing 2.5D macro crop layer (tablet & desktop) */}
            <div
              ref={macroFloatRef}
              className="hidden sm:block sm:w-[44%] sm:ml-auto lg:w-[42%] -mt-14 lg:-mt-16 mr-3 sm:mr-5 relative z-10 will-change-transform"
            >
              <TiltCard maxTiltDeg={4} darkSpotlight className="rounded-xl shadow-xl">
                <div className="aspect-[16/10] rounded-xl overflow-hidden bg-[#141414] border-4 border-white">
                  <FoodImage
                    src={siteSettings.heroMacroImage}
                    alt="Détail culinaire : croûte smash caramélisée et cheddar affiné"
                    className="w-full h-full object-cover"
                  />
                </div>
              </TiltCard>
            </div>
          </div>
        </div>

        {/* Bottom Editorial Metrics Bar */}
        <div className="mt-8 sm:mt-10 pt-6 border-t border-zinc-200 grid grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-8">
          <div className="ms-metric-item pt-1">
            <p className="text-[11px] uppercase tracking-wider text-zinc-500">Cuisson minute</p>
            <p className="font-display text-lg sm:text-xl font-bold text-[#141414] tabular-nums mt-0.5">
              12 minutes
            </p>
          </div>
          <div className="ms-metric-item pt-1">
            <p className="text-[11px] uppercase tracking-wider text-zinc-500">Frais du matin</p>
            <p className="font-display text-lg sm:text-xl font-bold text-[#141414] mt-0.5">
              Bœuf &amp; Levain 72h
            </p>
          </div>
          <div className="ms-metric-item pt-1">
            <p className="text-[11px] uppercase tracking-wider text-zinc-500">Livraison offerte</p>
            <p className="font-display text-lg sm:text-xl font-bold text-[#141414] tabular-nums mt-0.5">
              {siteSettings.freeDeliveryThresholdUsd <= 0 || siteSettings.deliveryFeeUsd <= 0
                ? 'Offerte dès $0'
                : `Dès $${siteSettings.freeDeliveryThresholdUsd.toFixed(0)}`}
            </p>
          </div>
          <div className="ms-metric-item pt-1">
            <p className="text-[11px] uppercase tracking-wider text-zinc-500">Paiement en ligne</p>
            <p className="font-display text-lg sm:text-xl font-bold text-[#141414] mt-0.5">
              {siteSettings.enableCdfCurrency
                ? 'USD & CDF Mobile Money'
                : 'Mobile Money & Cartes'}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
