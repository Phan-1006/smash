import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ArrowDown, ArrowRight } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { formatMoney, MenuItem } from '../data/menu';
import type { CurrencyCode } from '../types/ecommerce';
import { BurgerAssemblyArt, BurgerLayerRefs } from './BurgerAssemblyArt';
import { MagneticButton } from './MagneticButton';

gsap.registerPlugin(ScrollTrigger);

interface BurgerStorySectionProps {
  signatureItem?: MenuItem;
  currency: CurrencyCode;
  onSelectProduct: (item: MenuItem) => void;
}

const WELCOME_SLIDES = [
  {
    index: '01',
    kicker: 'Bienvenue chez Maison Smash',
    headline: 'Ici, le goût commence à l’instant où vous entrez.',
    subline: 'Kinshasa, Gombe · Une maison dédiée au vrai smash',
  },
  {
    index: '02',
    kicker: 'Notre promesse',
    headline: 'Rien n’est préparé d’avance. Tout prend vie devant vous.',
    subline: 'Chaleur franche · Ingrédients frais du matin',
  },
  {
    index: '03',
    kicker: 'L’esprit du comptoir',
    headline: 'Installez-vous, respirez la braise, savourez l’instant.',
    subline: 'Hospitalité · Générosité · Précision',
  },
  {
    index: '04',
    kicker: 'Votre table est prête',
    headline: 'Bon appétit. Voici notre signature.',
    subline: 'Signature Maison Smash · Préparé à la minute',
  },
];

export function BurgerStorySection({
  signatureItem,
  currency,
  onSelectProduct,
}: BurgerStorySectionProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);
  const layersRef = useRef<BurgerLayerRefs>({
    topBun: null,
    sauce: null,
    greens: null,
    tomato: null,
    cheddar: null,
    patties: null,
    bottomBun: null,
    shadow: null,
    aura: null,
  });

  const [activeSlide, setActiveSlide] = useState(0);
  const [assembled, setAssembled] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  const setLayerRef = (key: keyof BurgerLayerRefs) => (el: HTMLDivElement | null) => {
    layersRef.current[key] = el;
  };

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => {
      setReducedMotion(mq.matches);
      if (mq.matches) {
        setActiveSlide(3);
        setAssembled(true);
      }
    };
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  useLayoutEffect(() => {
    const section = sectionRef.current;
    const stage = stageRef.current;
    const layers = layersRef.current;
    if (!section || !stage || reducedMotion) return;

    const { topBun, sauce, greens, tomato, cheddar, patties, bottomBun, shadow, aura } = layers;
    if (!topBun || !sauce || !greens || !tomato || !cheddar || !patties || !bottomBun) return;

    const ctx = gsap.context(() => {
      const mm = gsap.matchMedia();

      mm.add(
        {
          isDesktop: '(min-width: 1024px)',
          isTablet: '(min-width: 640px) and (max-width: 1023px)',
          isMobile: '(max-width: 639px)',
        },
        (context) => {
          const isMobile = Boolean(context.conditions?.isMobile);
          const isTablet = Boolean(context.conditions?.isTablet);
          const spread = isMobile ? 0.28 : isTablet ? 0.54 : 0.9;

          gsap.set(topBun, { y: -150 * spread, x: 0, rotationZ: 0, scale: 1 });
          gsap.set(sauce, { y: -102 * spread, x: 0, rotationZ: 0, scale: 0.98, opacity: 0.95 });
          gsap.set(greens, { y: -56 * spread, x: 0, rotationZ: 0, scale: 1 });
          gsap.set(tomato, { y: -12 * spread, x: 0, rotationZ: 0, scale: 1 });
          gsap.set(cheddar, { y: 34 * spread, x: 0, rotationZ: 0, scale: 1 });
          gsap.set(patties, { y: 86 * spread, x: 0, rotationZ: 0, scale: 1 });
          gsap.set(bottomBun, { y: 142 * spread, x: 0, rotationZ: 0, scale: 1 });

          if (shadow) gsap.set(shadow, { scale: 0.72, opacity: 0.35 });
          if (aura) gsap.set(aura, { scale: 0.75, opacity: 0.16 });
          gsap.set(stage, { scale: 0.98, y: 0 });
          if (progressBarRef.current) {
            gsap.set(progressBarRef.current, { scaleX: 0.05 });
          }

          const tl = gsap.timeline({
            defaults: { ease: 'power2.inOut' },
            scrollTrigger: {
              trigger: section,
              start: 'top top',
              end: 'bottom bottom',
              scrub: 0.6,
              onUpdate: (self) => {
                const p = self.progress;
                if (progressBarRef.current) {
                  progressBarRef.current.style.transform = `scaleX(${Math.max(0.05, p)})`;
                }
                const nextSlide = p < 0.25 ? 0 : p < 0.52 ? 1 : p < 0.78 ? 2 : 3;
                setActiveSlide((prev) => (prev === nextSlide ? prev : nextSlide));
                const nextAssembled = p >= 0.85;
                setAssembled((prev) => (prev === nextAssembled ? prev : nextAssembled));
              },
            },
          });

          tl.to(bottomBun, { y: 0, duration: 0.28 }, 0.04)
            .to(patties, { y: 0, duration: 0.3 }, 0.08)
            .to(cheddar, { y: 0, duration: 0.28 }, 0.25)
            .to(tomato, { y: 0, duration: 0.26 }, 0.42)
            .to(greens, { y: 0, duration: 0.26 }, 0.48)
            .to(sauce, { y: 0, scale: 1, opacity: 1, duration: 0.24 }, 0.58)
            .to(topBun, { y: 0, duration: 0.28 }, 0.62)
            .to(
              stage,
              {
                scale: isMobile ? 1.04 : 1.08,
                y: 0,
                duration: 0.16,
                ease: 'power2.out',
              },
              0.84
            );

          if (shadow) {
            tl.to(shadow, { scale: 1.05, opacity: 0.88, duration: 0.55 }, 0.35);
          }
          if (aura) {
            tl.to(aura, { scale: 1.24, opacity: 0.68, duration: 0.35 }, 0.65);
          }
        }
      );
    }, sectionRef);

    return () => ctx.revert();
  }, [reducedMotion]);

  const priceDisplay = signatureItem ? formatMoney(signatureItem.priceUsd, currency) : '$13.00';
  const currentSlide = WELCOME_SLIDES[activeSlide] || WELCOME_SLIDES[0];

  return (
    <section
      id="burger-story"
      ref={sectionRef}
      aria-label="Accueil et présentation Maison Smash"
      className={`scroll-mt-16 relative bg-[#0E0E11] text-white border-b border-zinc-800/80 ${
        reducedMotion ? 'py-14 sm:py-24' : 'h-[250vh] sm:h-[280vh] lg:h-[310vh]'
      }`}
    >
      <div
        className={
          reducedMotion
            ? 'max-w-7xl xl:max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-10'
            : 'sticky top-16 h-[calc(100svh-4rem)] lg:min-h-[580px] flex flex-col justify-center overflow-hidden'
        }
      >
        {/* Subtle studio atmosphere backdrop */}
        <div
          className="absolute inset-0 pointer-events-none opacity-65"
          style={{
            background:
              'radial-gradient(circle at 60% 48%, rgba(217,35,35,0.13) 0%, rgba(14,14,17,0.94) 60%, #0E0E11 100%)',
          }}
          aria-hidden="true"
        />

        <div className="relative z-10 w-full h-full max-w-7xl xl:max-w-[1400px] mx-auto px-5 sm:px-6 lg:px-10 py-5 sm:py-8 lg:py-10 flex flex-col lg:grid lg:grid-cols-12 lg:gap-12 lg:items-center justify-between">
          {/* Typographic Welcome Slideshow (No buttons, no boxes — pure floating words) */}
          <div className="lg:col-span-6 lg:order-1 shrink-0 relative z-20 flex flex-col justify-center text-center lg:text-left">
            <div className="min-h-[120px] sm:min-h-[145px] lg:min-h-[250px] flex flex-col justify-center">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentSlide.index}
                  initial={
                    reducedMotion
                      ? { opacity: 1 }
                      : { opacity: 0, y: 20, filter: 'blur(6px)' }
                  }
                  animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                  exit={
                    reducedMotion
                      ? { opacity: 1 }
                      : { opacity: 0, y: -16, filter: 'blur(6px)' }
                  }
                  transition={{ duration: 0.42, ease: [0.16, 1, 0.3, 1] }}
                >
                  <p className="text-[11px] sm:text-xs font-medium uppercase tracking-[0.22em] text-[#F59E0B] mb-2.5 sm:mb-4">
                    {currentSlide.kicker}
                  </p>

                  <h2
                    className="font-display font-extrabold text-white tracking-tight leading-[1.06] mb-3 sm:mb-5 mx-auto lg:mx-0 max-w-xl"
                    style={{
                      fontSize: 'clamp(1.5rem, 3.8vw, 3.35rem)',
                      textWrap: 'balance',
                    }}
                  >
                    {currentSlide.headline}
                  </h2>

                  <p className="text-xs sm:text-sm lg:text-base text-zinc-400 tracking-wide">
                    {currentSlide.subline}
                  </p>
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Quiet hairline scroll progress + index (desktop) */}
            <div className="hidden lg:flex items-center gap-4 mt-8 max-w-md">
              <span className="font-mono tabular-nums text-xs text-zinc-400">
                {currentSlide.index} / 04
              </span>
              <div className="flex-1 h-[1.5px] bg-zinc-800 overflow-hidden">
                <div
                  ref={progressBarRef}
                  className="h-full bg-[#D92323] origin-left will-change-transform"
                  style={{ transform: reducedMotion ? 'scaleX(1)' : 'scaleX(0.05)' }}
                />
              </div>
              <span className="text-xs text-zinc-500">
                {assembled ? 'Prêt' : 'Défilez'}
              </span>
            </div>

            {/* Desktop action row */}
            <div className="hidden lg:flex flex-wrap items-center gap-4 mt-8">
              {signatureItem && (
                <MagneticButton
                  onClick={() => onSelectProduct(signatureItem)}
                  className={`ms-btn-glint inline-flex items-center gap-2.5 px-6 py-3.5 min-h-[46px] rounded-lg text-sm font-semibold transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                    assembled
                      ? 'bg-[#D92323] text-white hover:bg-[#B81C1C] shadow-lg shadow-[#D92323]/25'
                      : 'bg-zinc-800/90 text-white hover:bg-zinc-700'
                  }`}
                >
                  <span>Commander le signature</span>
                  <span className="font-mono tabular-nums text-xs opacity-90">
                    · {priceDisplay}
                  </span>
                  <ArrowRight className="w-4 h-4" strokeWidth={2} />
                </MagneticButton>
              )}
              <a
                href="#specialites"
                className="inline-flex items-center gap-1.5 px-4 py-3 min-h-[46px] text-sm font-semibold text-zinc-300 hover:text-white transition-colors whitespace-nowrap shrink-0"
              >
                <span>Découvrir nos spécialités</span>
                <ArrowDown className="w-4 h-4" strokeWidth={2} />
              </a>
            </div>
          </div>

          {/* Straight Centered 3D Burger Stage */}
          <div className="lg:col-span-6 lg:order-2 flex-1 min-h-0 flex flex-col items-center justify-center relative py-8 sm:py-10 lg:py-0 overflow-hidden lg:overflow-visible">
            <div
              ref={stageRef}
              className="relative flex items-center justify-center will-change-transform"
            >
              <BurgerAssemblyArt setLayerRef={setLayerRef} />
            </div>

            {/* Desktop subtle signature line beneath assembled burger */}
            <div
              className={`hidden lg:block mt-3 text-center transition-opacity duration-500 ${
                assembled ? 'opacity-100' : 'opacity-50'
              }`}
            >
              <p className="font-display text-base font-bold text-white">
                Signature Maison Smash ·{' '}
                <span className="font-mono tabular-nums text-[#F59E0B]">{priceDisplay}</span>
              </p>
            </div>
          </div>

          {/* Mobile compact footer action */}
          <div className="lg:hidden shrink-0 relative z-20 flex flex-col items-center gap-2.5 pt-1">
            <div className="flex items-center gap-3 w-full max-w-xs">
              <span className="font-mono tabular-nums text-[11px] text-zinc-400">
                {currentSlide.index} / 04
              </span>
              <div className="flex-1 h-[1.5px] bg-zinc-800 overflow-hidden">
                <div
                  className="h-full bg-[#D92323] origin-left transition-transform duration-300"
                  style={{ transform: `scaleX(${(activeSlide + 1) / 4})` }}
                />
              </div>
              <span className="text-[11px] text-zinc-400">
                {assembled ? 'Prêt' : 'Défilez'}
              </span>
            </div>

            {signatureItem && (
              <MagneticButton
                wrapperClassName="w-full max-w-xs inline-flex"
                onClick={() => onSelectProduct(signatureItem)}
                className={`ms-btn-glint w-full inline-flex items-center justify-center gap-2 px-5 py-3 min-h-[44px] rounded-lg text-xs sm:text-sm font-semibold transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                  assembled
                    ? 'bg-[#D92323] text-white hover:bg-[#B81C1C] shadow-lg shadow-[#D92323]/25'
                    : 'bg-zinc-800/90 text-white hover:bg-zinc-700'
                }`}
              >
                <span>Commander le signature</span>
                <span className="font-mono tabular-nums text-xs opacity-90">
                  · {priceDisplay}
                </span>
                <ArrowRight className="w-4 h-4" strokeWidth={2} />
              </MagneticButton>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
