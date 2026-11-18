import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { motion } from 'motion/react';
import { FoodImage } from './FoodImage';
import { TiltCard } from './TiltCard';

gsap.registerPlugin(ScrollTrigger);

export function CraftSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const imageWrapRef = useRef<HTMLDivElement>(null);
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
    const imageWrap = imageWrapRef.current;
    if (!section || !imageWrap || reducedMotion) return;

    const ctx = gsap.context(() => {
      gsap.fromTo(
        imageWrap,
        { yPercent: -6, scale: 1.08 },
        {
          yPercent: 6,
          scale: 1.02,
          ease: 'none',
          scrollTrigger: {
            trigger: section,
            start: 'top bottom',
            end: 'bottom top',
            scrub: true,
          },
        }
      );
    }, sectionRef);

    return () => ctx.revert();
  }, [reducedMotion]);

  return (
    <section
      id="savoir-faire"
      ref={sectionRef}
      className="scroll-mt-16 bg-white border-b border-zinc-200 py-10 sm:py-16 lg:py-24 overflow-hidden"
    >
      <div className="max-w-7xl xl:max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-7 sm:gap-10 lg:gap-12 xl:gap-16 items-stretch">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.25 }}
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            className="lg:col-span-6"
          >
            <TiltCard maxTiltDeg={3.5} className="h-full rounded-2xl">
              <div className="group ms-card-media aspect-[4/3] lg:aspect-auto lg:h-full min-h-[210px] sm:min-h-[320px] lg:min-h-[450px] rounded-2xl overflow-hidden bg-zinc-200 shadow-lg">
                <div ref={imageWrapRef} className="w-full h-full will-change-transform">
                  <FoodImage
                    src="/src/assets/images/craft_kitchen_grill_1794856490008.jpg"
                    alt="Chef écrasant des steaks frais sur plancha en inox"
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            </TiltCard>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.25 }}
            transition={{ duration: 0.45, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
            className="lg:col-span-6 flex flex-col justify-center"
          >
            <p className="text-[11px] sm:text-xs font-medium uppercase tracking-widest text-zinc-500 mb-2.5 sm:mb-3">
              Expérience de marque · Cuisine ouverte
            </p>
            <h2
              className="font-display text-2xl sm:text-3xl lg:text-4xl font-extrabold text-[#141414] tracking-tight mb-3.5 sm:mb-5"
              style={{ textWrap: 'balance' }}
            >
              La réaction de Maillard au cœur de chaque burger et pizza.
            </h2>
            <p className="text-sm sm:text-base text-zinc-600 leading-relaxed mb-6 sm:mb-8">
              Plutôt que de griller des steaks épais à l’avance, nous écrasons des boules de bœuf
              frais haché du matin directement sur notre plancha à 260°C, pendant que nos pâtons
              fermentés 72 heures dorent sur pierre brûlante.
            </p>

            {/* Precision metrics strip */}
            <div className="grid grid-cols-3 gap-2.5 sm:gap-4 py-4 sm:py-5 border-y border-zinc-200 mb-6 sm:mb-7">
              <div>
                <p className="font-display text-lg sm:text-2xl font-extrabold text-[#141414] tabular-nums">
                  260°C
                </p>
                <p className="text-[11px] sm:text-xs text-zinc-500 mt-0.5 leading-snug">
                  Plancha inox saisie
                </p>
              </div>
              <div>
                <p className="font-display text-lg sm:text-2xl font-extrabold text-[#141414] tabular-nums">
                  72h
                </p>
                <p className="text-[11px] sm:text-xs text-zinc-500 mt-0.5 leading-snug">
                  Maturation levain
                </p>
              </div>
              <div>
                <p className="font-display text-lg sm:text-2xl font-extrabold text-[#141414] tabular-nums">
                  48h
                </p>
                <p className="text-[11px] sm:text-xs text-zinc-500 mt-0.5 leading-snug">
                  Marinade babeurre
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <h3 className="font-display text-base font-bold text-[#141414] mb-1">
                  01. Pain potato & ingrédients frais
                </h3>
                <p className="text-sm text-zinc-600 leading-relaxed">
                  Pain brioché à la pomme de terre toasté au beurre clarifié, tomates mûres et sauces
                  préparées chaque matin.
                </p>
              </div>
              <div>
                <h3 className="font-display text-base font-bold text-[#141414] mb-1">
                  02. Paiement instantané
                </h3>
                <p className="text-sm text-zinc-600 leading-relaxed">
                  Règlement sécurisé en USD ou Francs Congolais via M-Pesa, Airtel, Orange, Africell
                  et cartes Visa/Mastercard.
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
