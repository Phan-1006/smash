import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { motion } from 'motion/react';
import { FoodImage } from './FoodImage';
import { TiltCard } from './TiltCard';

gsap.registerPlugin(ScrollTrigger);

export function CraftSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const primaryMaskRef = useRef<HTMLDivElement>(null);
  const primaryImgRef = useRef<HTMLDivElement>(null);
  const macroMaskRef = useRef<HTMLDivElement>(null);
  const macroParallaxRef = useRef<HTMLDivElement>(null);
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
    const primaryMask = primaryMaskRef.current;
    const primaryImg = primaryImgRef.current;
    const macroMask = macroMaskRef.current;
    const macroParallax = macroParallaxRef.current;
    if (!section || !primaryMask || !primaryImg || reducedMotion) return;

    const ctx = gsap.context(() => {
      // Mask reveal on main culinary frame
      gsap.fromTo(
        primaryMask,
        { clipPath: 'inset(12% 0% 12% 0% round 1rem)' },
        {
          clipPath: 'inset(0% 0% 0% 0% round 1rem)',
          duration: 0.9,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: primaryMask,
            start: 'top 82%',
            once: true,
          },
        }
      );

      // Cinematic zoom & controlled parallax on main photograph
      gsap.fromTo(
        primaryImg,
        { yPercent: -7, scale: 1.1 },
        {
          yPercent: 7,
          scale: 1.0,
          ease: 'none',
          scrollTrigger: {
            trigger: section,
            start: 'top bottom',
            end: 'bottom top',
            scrub: true,
          },
        }
      );

      if (macroMask) {
        gsap.fromTo(
          macroMask,
          { clipPath: 'inset(18% 8% 0% 8% round 1rem)', opacity: 0.4 },
          {
            clipPath: 'inset(0% 0% 0% 0% round 1rem)',
            opacity: 1,
            duration: 0.85,
            ease: 'power3.out',
            scrollTrigger: {
              trigger: macroMask,
              start: 'top 88%',
              once: true,
            },
          }
        );
      }

      if (macroParallax) {
        gsap.fromTo(
          macroParallax,
          { yPercent: 10 },
          {
            yPercent: -10,
            ease: 'none',
            scrollTrigger: {
              trigger: section,
              start: 'top bottom',
              end: 'bottom top',
              scrub: true,
            },
          }
        );
      }
    }, sectionRef);

    return () => ctx.revert();
  }, [reducedMotion]);

  return (
    <section
      id="savoir-faire"
      ref={sectionRef}
      data-nav-theme="light"
      className="scroll-mt-16 bg-[#FAF7F2] text-[#141414] border-b border-zinc-200/80 py-14 sm:py-20 lg:py-28 overflow-hidden"
    >
      <div className="max-w-7xl xl:max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-10">
        {/* Top Editorial Intro Band */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-14 items-end mb-10 sm:mb-14">
          <motion.div
            initial={reducedMotion ? false : { opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.25 }}
            transition={{ duration: 0.48, ease: [0.16, 1, 0.3, 1] }}
            className="lg:col-span-7"
          >
            <p className="text-[11px] sm:text-xs font-medium uppercase tracking-[0.22em] text-[#D92323] mb-3">
              Savoir-Faire · Gros plan culinaire
            </p>
            <h2
              className="font-display font-extrabold text-[#141414] tracking-tight leading-[1.04]"
              style={{ fontSize: 'clamp(2rem, 4.4vw, 3.6rem)', textWrap: 'balance' }}
            >
              La flamme, la croûte dorée et la patience du levain.
            </h2>
          </motion.div>

          <motion.p
            initial={reducedMotion ? false : { opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.25 }}
            transition={{ duration: 0.48, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
            className="lg:col-span-5 text-sm sm:text-base text-zinc-600 leading-relaxed"
          >
            Chaque geste en cuisine répond à une exigence de texture : la réaction de Maillard
            saisie à 260°C pour caraméliser les bords du bœuf, tandis que nos pâtons fermentés 72
            heures cloquent sur pierre brûlante.
          </motion.p>
        </div>

        {/* Main Visual Storytelling Stage: Large Format Kitchen + Overlapping Macro Close-Up */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 sm:gap-10 lg:gap-12 items-center">
          {/* Left: Dual-layered masked food photography */}
          <div className="lg:col-span-7 relative pb-8 sm:pb-12 lg:pb-10">
            <TiltCard maxTiltDeg={3} className="rounded-2xl">
              <div
                ref={primaryMaskRef}
                className="group ms-card-media aspect-[16/11] sm:aspect-[16/10] rounded-2xl overflow-hidden bg-zinc-200 shadow-xl will-change-transform"
              >
                <div ref={primaryImgRef} className="w-full h-full will-change-transform">
                  <FoodImage
                    src="/src/assets/images/craft_kitchen_grill_1794856490008.jpg"
                    alt="Chef saisissant des boules de bœuf frais à 260°C sur plancha inox"
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            </TiltCard>

            {/* Floating macro close-up card with opposite parallax */}
            <div
              ref={macroParallaxRef}
              className="mt-5 sm:mt-0 sm:w-[56%] sm:ml-auto lg:w-[52%] lg:-mt-28 lg:mr-6 relative z-10 will-change-transform"
            >
              <TiltCard maxTiltDeg={4} darkSpotlight className="rounded-2xl">
                <div
                  ref={macroMaskRef}
                  className="aspect-[4/3] rounded-2xl overflow-hidden bg-[#141414] border-4 border-[#FAF7F2] shadow-2xl will-change-transform"
                >
                  <FoodImage
                    src="/src/assets/images/macro_maillard_sear_1795260048117.jpg"
                    alt="Gros plan sur cheddar fondant, croûte smash caramélisée et pâte au levain"
                    className="w-full h-full object-cover hover:scale-[1.06] transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]"
                  />
                </div>
              </TiltCard>
            </div>
          </div>

          {/* Right: Editorial chapters + Precision Culinary Metrics */}
          <motion.div
            initial={reducedMotion ? false : { opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.25 }}
            transition={{ duration: 0.45, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
            className="lg:col-span-5 flex flex-col justify-center"
          >
            {/* Precision metrics strip */}
            <div className="grid grid-cols-3 gap-3 sm:gap-5 py-5 border-y border-zinc-300/80 mb-7">
              <div>
                <p className="font-display text-2xl sm:text-3xl font-extrabold text-[#141414] tabular-nums">
                  260°C
                </p>
                <p className="text-xs text-zinc-600 mt-1">Plancha inox saisie</p>
              </div>
              <div>
                <p className="font-display text-2xl sm:text-3xl font-extrabold text-[#D92323] tabular-nums">
                  72h
                </p>
                <p className="text-xs text-zinc-600 mt-1">Maturation levain</p>
              </div>
              <div>
                <p className="font-display text-2xl sm:text-3xl font-extrabold text-[#D97706] tabular-nums">
                  48h
                </p>
                <p className="text-xs text-zinc-600 mt-1">Marinade babeurre</p>
              </div>
            </div>

            <div className="space-y-6">
              <div className="pb-5 border-b border-zinc-200">
                <h3 className="font-display text-base sm:text-lg font-bold text-[#141414] mb-1.5">
                  01. Bœuf Charolais écrasé minute
                </h3>
                <p className="text-sm text-zinc-600 leading-relaxed">
                  Haché chaque matin, écrasé finement sur acier brûlant pour obtenir une dentelle
                  croustillante tout en gardant un cœur juteux.
                </p>
              </div>

              <div className="pb-5 border-b border-zinc-200">
                <h3 className="font-display text-base sm:text-lg font-bold text-[#141414] mb-1.5">
                  02. Pâte vivante & cuisson sur pierre
                </h3>
                <p className="text-sm text-zinc-600 leading-relaxed">
                  Trois jours de fermentation lente à froid avant d’effleurer la sole brûlante avec
                  San Marzano, mozzarella fior di latte et burrata.
                </p>
              </div>

              <div>
                <h3 className="font-display text-base sm:text-lg font-bold text-[#141414] mb-1.5">
                  03. Sauces maison & pain potato
                </h3>
                <p className="text-sm text-zinc-600 leading-relaxed">
                  Pain brioché à la pomme de terre toasté au beurre clarifié, pickles d’aneth et
                  sauces préparées chaque matin au comptoir.
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
