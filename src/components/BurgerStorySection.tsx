import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ArrowDown, ArrowRight } from 'lucide-react';
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

const CHAPTERS = [
  {
    id: '01',
    title: 'Double Smash Charolais 260°C',
    detail:
      'Deux boules de bœuf frais saisies sur plancha brûlante pour une croûte dentelée caramélisée sur pain potato toasté.',
    targetProgress: 0.2,
  },
  {
    id: '02',
    title: 'Double Cheddar Affiné Fondant',
    detail:
      'Deux tranches généreuses nappées entre les steaks fumants pour fondre au cœur de la croûte Maillard.',
    targetProgress: 0.45,
  },
  {
    id: '03',
    title: 'Tomate, Pickles & Romaine',
    detail:
      'Tranches de tomate cœur de bœuf, oignons rouges, pickles d’aneth croquants et laitue romaine fraîche.',
    targetProgress: 0.68,
  },
  {
    id: '04',
    title: 'Sauce Secrète & Brioche Sésame',
    detail:
      'Tourbillon de sauce fumée maison scellé par notre pain brioché doré aux graines de sésame torréfiées.',
    targetProgress: 0.94,
  },
];

export function BurgerStorySection({
  signatureItem,
  currency,
  onSelectProduct,
}: BurgerStorySectionProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
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

  const [activeStage, setActiveStage] = useState(0);
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
        setActiveStage(3);
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
          // Mobile keeps a compact, perfectly straight vertical stack inside its lane
          const spread = isMobile ? 0.28 : isTablet ? 0.56 : 0.92;

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

          const tl = gsap.timeline({
            defaults: { ease: 'power2.inOut' },
            scrollTrigger: {
              trigger: section,
              start: 'top top',
              end: 'bottom bottom',
              scrub: 0.6,
              onUpdate: (self) => {
                const p = self.progress;
                const nextStage = p < 0.25 ? 0 : p < 0.52 ? 1 : p < 0.78 ? 2 : 3;
                setActiveStage((prev) => (prev === nextStage ? prev : nextStage));
                const nextAssembled = p >= 0.85;
                setAssembled((prev) => (prev === nextAssembled ? prev : nextAssembled));
              },
            },
          });

          // Stage 1 (0 -> 0.30): Bottom bun & double smash patties lock onto the base
          tl.to(bottomBun, { y: 0, duration: 0.28 }, 0.04)
            .to(patties, { y: 0, duration: 0.3 }, 0.08)
            // Stage 2 (0.24 -> 0.52): Melting double cheddar settles over hot patties
            .to(cheddar, { y: 0, duration: 0.28 }, 0.25)
            // Stage 3 (0.42 -> 0.72): Tomato, onions & crisp greens drop into place
            .to(tomato, { y: 0, duration: 0.26 }, 0.42)
            .to(greens, { y: 0, duration: 0.26 }, 0.48)
            // Stage 4 (0.60 -> 0.86): Sauce & glazed sesame top bun seal the burger
            .to(sauce, { y: 0, scale: 1, opacity: 1, duration: 0.24 }, 0.58)
            .to(topBun, { y: 0, duration: 0.28 }, 0.62)
            // Stage 5 (0.84 -> 1.0): Dramatic centerpiece reveal with warm grill aura
            .to(
              stage,
              {
                scale: isMobile ? 1.03 : 1.07,
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
            tl.to(aura, { scale: 1.2, opacity: 0.65, duration: 0.35 }, 0.65);
          }
        }
      );
    }, sectionRef);

    return () => ctx.revert();
  }, [reducedMotion]);

  const scrollToStage = (targetProgress: number) => {
    const section = sectionRef.current;
    if (!section) return;
    const rect = section.getBoundingClientRect();
    const sectionTop = window.scrollY + rect.top;
    const scrollableDistance = Math.max(1, section.offsetHeight - window.innerHeight);
    window.scrollTo({
      top: sectionTop + scrollableDistance * targetProgress,
      behavior: reducedMotion ? 'auto' : 'smooth',
    });
  };

  const priceDisplay = signatureItem ? formatMoney(signatureItem.priceUsd, currency) : '$13.00';
  const currentChapter = CHAPTERS[activeStage] || CHAPTERS[0];

  return (
    <section
      id="burger-story"
      ref={sectionRef}
      aria-label="Assemblage signature du burger Maison Smash"
      className={`scroll-mt-16 relative bg-[#0E0E11] text-white border-b border-zinc-800/80 ${
        reducedMotion ? 'py-14 sm:py-24' : 'h-[230vh] sm:h-[265vh] lg:h-[310vh]'
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
              'radial-gradient(circle at 50% 44%, rgba(217,35,35,0.12) 0%, rgba(14,14,17,0.94) 62%, #0E0E11 100%)',
          }}
          aria-hidden="true"
        />

        <div className="relative z-10 w-full h-full max-w-7xl xl:max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-10 py-4 sm:py-6 lg:py-10 flex flex-col lg:grid lg:grid-cols-12 lg:gap-10 lg:items-center justify-between">
          {/* Mobile Header Row (strictly isolated above the burger stage so nothing ever overlaps) */}
          <div className="lg:hidden shrink-0 relative z-20 text-center">
            <p className="text-[11px] font-medium uppercase tracking-widest text-zinc-400">
              L’Atelier Maison Smash
            </p>
            <h2
              className="font-display text-xl sm:text-2xl font-extrabold text-white tracking-tight"
              style={{ textWrap: 'balance' }}
            >
              Chaque strate saisie à la seconde près.
            </h2>
          </div>

          {/* Center/Right 3D Burger Stage — sits in its own isolated flex lane on mobile */}
          <div className="lg:col-span-7 lg:order-2 flex-1 min-h-0 flex flex-col items-center justify-center relative py-9 sm:py-12 lg:py-0 overflow-hidden lg:overflow-visible">
            <div
              ref={stageRef}
              className="relative flex items-center justify-center will-change-transform"
            >
              <BurgerAssemblyArt setLayerRef={setLayerRef} />
            </div>

            {/* Desktop unboxed centerpiece caption */}
            <div
              className={`hidden lg:block mt-2 text-center transition-all duration-500 ${
                assembled ? 'opacity-100 translate-y-0' : 'opacity-70 translate-y-1'
              }`}
            >
              <p className="text-xs uppercase tracking-widest text-zinc-400">
                {assembled
                  ? 'Assemblage complet · Prêt à saisir'
                  : 'Défilez pour assembler les 7 strates'}
              </p>
              <p className="font-display text-lg font-bold text-white mt-0.5">
                Signature Maison Smash ·{' '}
                <span className="font-mono tabular-nums text-[#F59E0B]">{priceDisplay}</span>
              </p>
            </div>
          </div>

          {/* Left Narrative & Controls — strictly isolated below the burger stage on mobile */}
          <div className="lg:col-span-5 lg:order-1 shrink-0 relative z-20">
            <div className="hidden lg:block">
              <p className="text-xs font-medium uppercase tracking-widest text-zinc-400 mb-2.5">
                Anatomie du signature · Synchronisé au défilement
              </p>
              <h2
                className="font-display text-3xl lg:text-4xl font-extrabold text-white tracking-tight leading-[1.08] mb-3.5"
                style={{ textWrap: 'balance' }}
              >
                Chaque strate saisie à la seconde près.
              </h2>
              <p className="text-sm text-zinc-300 leading-relaxed mb-6 max-w-lg">
                Faites défiler pour assembler notre Signature Maison Smash couche par couche : de la
                croûte caramélisée sur plancha jusqu’à la brioche toastée.
              </p>
            </div>

            {/* Mobile / Tablet Compact Chapter Stepper + Active Detail Card */}
            <div className="lg:hidden space-y-2">
              <div
                className="grid grid-cols-4 gap-1.5"
                role="tablist"
                aria-label="Étapes de l’assemblage"
              >
                {CHAPTERS.map((chapter, idx) => {
                  const isActive = activeStage === idx;
                  const isPassed = activeStage > idx;
                  return (
                    <button
                      key={chapter.id}
                      type="button"
                      role="tab"
                      aria-selected={isActive}
                      onClick={() => scrollToStage(chapter.targetProgress)}
                      className={`min-h-[36px] rounded-lg border font-mono tabular-nums text-xs font-semibold transition-colors cursor-pointer ${
                        isActive
                          ? 'bg-[#D92323] border-[#D92323] text-white'
                          : isPassed
                            ? 'bg-zinc-900 border-zinc-700 text-zinc-200'
                            : 'bg-zinc-950/70 border-zinc-800 text-zinc-400'
                      }`}
                    >
                      {chapter.id}
                    </button>
                  );
                })}
              </div>

              <div className="bg-zinc-900/95 border border-zinc-800 rounded-xl p-3 sm:p-4">
                <div className="flex items-center justify-between gap-2 mb-0.5">
                  <span className="font-mono tabular-nums text-xs font-semibold text-[#D92323]">
                    Étape {currentChapter.id} / 04
                  </span>
                  <span className="text-[11px] font-medium text-zinc-400">
                    {assembled ? 'Assemblage complet' : 'Défilez pour assembler'}
                  </span>
                </div>
                <p className="font-display text-sm sm:text-base font-bold text-white leading-snug">
                  {currentChapter.title}
                </p>
                <p className="text-xs text-zinc-300 leading-relaxed mt-0.5 line-clamp-2">
                  {currentChapter.detail}
                </p>
              </div>
            </div>

            {/* Desktop 4 synchronized chapters list */}
            <div className="hidden lg:grid grid-cols-1 gap-3">
              {CHAPTERS.map((chapter, idx) => {
                const isActive = activeStage === idx;
                const isPassed = activeStage > idx;
                return (
                  <button
                    key={chapter.id}
                    type="button"
                    onClick={() => scrollToStage(chapter.targetProgress)}
                    className={`text-left p-3.5 rounded-xl border transition-all cursor-pointer ${
                      isActive
                        ? 'bg-zinc-900/95 border-[#D92323]/70 shadow-[0_8px_28px_-12px_rgba(217,35,35,0.45)]'
                        : isPassed
                          ? 'bg-zinc-900/45 border-zinc-800 text-zinc-300 hover:border-zinc-700'
                          : 'bg-zinc-950/40 border-zinc-800/70 text-zinc-400 hover:border-zinc-700'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="font-mono tabular-nums text-xs font-semibold text-[#D92323]">
                        {chapter.id}
                      </span>
                      <span className="text-[11px] font-medium text-zinc-400">
                        {isActive ? 'En cours' : isPassed ? 'Assemblé' : 'Étape'}
                      </span>
                    </div>
                    <p className="font-display text-sm font-bold text-white leading-snug">
                      {chapter.title}
                    </p>
                    <p
                      className={`text-xs text-zinc-400 leading-relaxed mt-1 ${
                        isActive ? 'opacity-100' : 'opacity-70'
                      }`}
                    >
                      {chapter.detail}
                    </p>
                  </button>
                );
              })}
            </div>

            {/* Action row */}
            <div className="mt-2.5 sm:mt-4 lg:mt-5 flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-2 sm:gap-3">
              {signatureItem && (
                <MagneticButton
                  wrapperClassName="w-full sm:w-auto inline-flex"
                  onClick={() => onSelectProduct(signatureItem)}
                  className={`ms-btn-glint w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 sm:px-5 py-2.5 sm:py-3 min-h-[44px] rounded-lg text-xs sm:text-sm font-semibold transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                    assembled
                      ? 'bg-[#D92323] text-white hover:bg-[#B81C1C] shadow-lg shadow-[#D92323]/25'
                      : 'bg-zinc-800 text-white hover:bg-zinc-700'
                  }`}
                >
                  <span>Commander ce burger</span>
                  <span className="font-mono tabular-nums text-xs opacity-90">
                    · {priceDisplay}
                  </span>
                  <ArrowRight className="w-4 h-4" strokeWidth={2} />
                </MagneticButton>
              )}
              <a
                href="#specialites"
                className="hidden sm:inline-flex items-center justify-center gap-1.5 px-4 py-3 min-h-[44px] text-xs sm:text-sm font-semibold text-zinc-300 hover:text-white transition-colors whitespace-nowrap shrink-0"
              >
                <span>Voir nos spécialités</span>
                <ArrowDown className="w-3.5 h-3.5" strokeWidth={2} />
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
