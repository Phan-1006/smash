import { ArrowRight } from 'lucide-react';
import { motion } from 'motion/react';
import { FoodImage } from './FoodImage';

export function HeroSection() {
  return (
    <section id="top" className="bg-white border-b border-zinc-200">
      <div className="max-w-7xl xl:max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-10 py-8 sm:py-12 lg:py-16 xl:py-20">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 xl:gap-14 items-stretch">
          {/* Left editorial copy column */}
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            className="lg:col-span-6 flex flex-col justify-center"
          >
            <p className="text-xs font-medium uppercase tracking-widest text-zinc-500 mb-3 sm:mb-4">
              Smash Burgers · Pizzas sur pierre · Poulet croustillant
            </p>
            <h1
              className="font-display font-extrabold text-[#141414] tracking-tight leading-[1.04] mb-4 sm:mb-5"
              style={{ fontSize: 'clamp(2rem, 4.2vw, 3.85rem)', textWrap: 'balance' }}
            >
              Le vrai smash burger & nos pizzas au feu de pierre.
            </h1>
            <p className="text-sm sm:text-base lg:text-lg text-zinc-600 leading-relaxed max-w-xl mb-6 sm:mb-8">
              Des steaks frais écrasés sur plancha brûlante, des pâtes fermentées 72 heures et du
              poulet mariné au babeurre. Commandez en ligne et réglez par Mobile Money ou carte
              bancaire.
            </p>

            <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-3 sm:gap-4">
              <a
                href="#menu"
                className="ms-btn-glint group inline-flex items-center justify-center gap-2.5 px-6 py-3.5 min-h-[46px] bg-[#D92323] text-white text-sm font-semibold rounded-lg hover:bg-[#B81C1C] transition-all active:scale-[0.98] whitespace-nowrap shrink-0"
              >
                <span>Commander maintenant</span>
                <ArrowRight
                  className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1"
                  strokeWidth={2}
                />
              </a>
              <a
                href="#savoir-faire"
                className="inline-flex items-center justify-center px-5 py-3.5 min-h-[46px] border border-zinc-300 text-[#141414] text-sm font-semibold rounded-lg hover:bg-zinc-50 hover:border-zinc-400 transition-colors active:scale-[0.98] whitespace-nowrap shrink-0"
              >
                Notre cuisine
              </a>
            </div>
          </motion.div>

          {/* Right hero visual */}
          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
            className="lg:col-span-6"
          >
            <div className="group relative aspect-[16/10] sm:aspect-[16/9] lg:aspect-auto lg:h-full min-h-[240px] sm:min-h-[320px] lg:min-h-[430px] xl:min-h-[480px] rounded-2xl overflow-hidden bg-[#141414] shadow-xl">
              <FoodImage
                src="/src/assets/images/hero_smash_burger_1794856487440.jpg"
                alt="Double smash burger avec cheddar fondant et croûte caramélisée"
                className="ms-hero-ken-burns w-full h-full object-cover"
              />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent p-4 sm:p-6">
                <div className="flex items-end justify-between gap-4 text-white">
                  <div className="min-w-0">
                    <p className="text-[11px] sm:text-xs uppercase tracking-wider text-zinc-300 mb-0.5 sm:mb-1">
                      Best-seller du comptoir
                    </p>
                    <p className="font-display text-base sm:text-lg font-bold truncate">
                      Signature Maison Smash
                    </p>
                  </div>
                  <p className="font-mono tabular-nums text-sm sm:text-base font-semibold shrink-0">
                    $13.00
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Full-width 4-column culinary metrics bar below hero split */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="mt-8 sm:mt-10 pt-6 sm:pt-8 border-t border-zinc-200 grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-8"
        >
          <div className="ms-metric-item pt-3">
            <p className="text-[11px] sm:text-xs uppercase tracking-wider text-zinc-500 mb-1">
              Préparation
            </p>
            <p className="font-display text-base sm:text-lg font-bold text-[#141414] tabular-nums">
              12 minutes
            </p>
          </div>
          <div className="ms-metric-item pt-3">
            <p className="text-[11px] sm:text-xs uppercase tracking-wider text-zinc-500 mb-1">
              Pâte & Viande
            </p>
            <p className="font-display text-base sm:text-lg font-bold text-[#141414]">
              Frais chaque matin
            </p>
          </div>
          <div className="ms-metric-item pt-3">
            <p className="text-[11px] sm:text-xs uppercase tracking-wider text-zinc-500 mb-1">
              Règlement en ligne
            </p>
            <p className="font-display text-base sm:text-lg font-bold text-[#141414]">
              Mobile Money & Cartes
            </p>
          </div>
          <div className="ms-metric-item pt-3">
            <p className="text-[11px] sm:text-xs uppercase tracking-wider text-zinc-500 mb-1">
              Livraison express
            </p>
            <p className="font-display text-base sm:text-lg font-bold text-[#141414] tabular-nums">
              Gratuite dès $30
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
