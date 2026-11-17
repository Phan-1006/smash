import { motion } from 'motion/react';
import { FoodImage } from './FoodImage';

export function CraftSection() {
  return (
    <section
      id="savoir-faire"
      className="bg-[#F5F5F7] border-t border-zinc-200 py-12 sm:py-16 lg:py-20 overflow-hidden"
    >
      <div className="max-w-7xl xl:max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 xl:gap-14 items-stretch">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.25 }}
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            className="lg:col-span-6"
          >
            <div className="group ms-scroll-curtain ms-card-media aspect-[4/3] lg:aspect-auto lg:h-full min-h-[240px] sm:min-h-[320px] lg:min-h-[420px] rounded-2xl overflow-hidden bg-zinc-200">
              <FoodImage
                src="/src/assets/images/craft_kitchen_grill_1794856490008.jpg"
                alt="Chef écrasant des steaks frais sur plancha en inox"
                className="w-full h-full object-cover group-hover:scale-[1.04] transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]"
              />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.25 }}
            transition={{ duration: 0.45, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
            className="ms-scroll-reveal lg:col-span-6 flex flex-col justify-center"
          >
            <p className="text-xs font-medium uppercase tracking-widest text-zinc-500 mb-3">
              Savoir-faire en cuisine ouverte
            </p>
            <h2
              className="font-display text-2xl sm:text-3xl lg:text-4xl font-extrabold text-[#141414] tracking-tight mb-4 sm:mb-5"
              style={{ textWrap: 'balance' }}
            >
              La réaction de Maillard au cœur de chaque burger et pizza.
            </h2>
            <p className="text-sm sm:text-base text-zinc-600 leading-relaxed mb-6 sm:mb-8">
              Plutôt que de griller des steaks épais à l’avance, nous écrasons des boules de bœuf
              frais haché du matin directement sur notre plancha à 260°C, pendant que nos pâtons
              fermentés 72 heures dorent sur pierre brûlante.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-6 border-t border-zinc-300/70">
              <div>
                <h3 className="font-display text-base font-bold text-[#141414] mb-1">
                  01. Pain potato & levain 72h
                </h3>
                <p className="text-sm text-zinc-600 leading-relaxed">
                  Pain brioché à la pomme de terre toasté au beurre clarifié et pâte à pizza
                  maturée lentement.
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
