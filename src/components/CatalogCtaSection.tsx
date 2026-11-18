import { ArrowDown, Flame } from 'lucide-react';
import { motion } from 'motion/react';
import { MenuCategory } from '../data/menu';
import { MagneticButton } from './MagneticButton';

interface CatalogCtaSectionProps {
  onExploreCategory: (category: MenuCategory) => void;
}

const QUICK_FILTERS: { id: MenuCategory; label: string }[] = [
  { id: 'burgers', label: 'Smash Burgers' },
  { id: 'pizzas', label: 'Pizzas sur pierre' },
  { id: 'chicken', label: 'Poulet Croustillant' },
  { id: 'sides', label: 'Frites & Shakes' },
];

export function CatalogCtaSection({ onExploreCategory }: CatalogCtaSectionProps) {
  return (
    <section className="relative bg-[#141414] text-white py-11 sm:py-20 overflow-hidden">
      {/* Subtle warm radial ember ambient light */}
      <div
        className="absolute inset-0 pointer-events-none opacity-60"
        style={{
          background:
            'radial-gradient(ellipse 70% 80% at 50% 100%, rgba(217, 35, 35, 0.22), transparent 72%)',
        }}
        aria-hidden="true"
      />

      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-10 text-center">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        >
          <p className="inline-flex items-center gap-2 text-[11px] sm:text-xs font-medium uppercase tracking-widest text-zinc-400 mb-2.5 sm:mb-3">
            <Flame className="w-3.5 h-3.5 text-[#D92323]" strokeWidth={2} />
            <span>Cuisine ouverte · Préparation minute</span>
          </p>

          <h2
            className="font-display text-2xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white mb-3 sm:mb-4"
            style={{ textWrap: 'balance' }}
          >
            Composez votre commande maintenant.
          </h2>

          <p className="text-sm sm:text-base text-zinc-300 leading-relaxed max-w-2xl mx-auto mb-6 sm:mb-8">
            Retrouvez l’ensemble de notre carte ci-dessous, choisissez vos suppléments, passez en
            menu et réglez en quelques secondes par Mobile Money ou carte bancaire.
          </p>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 sm:gap-4 mb-6 sm:mb-8">
            <MagneticButton
              href="#menu"
              wrapperClassName="w-full sm:w-auto inline-flex"
              onClick={() => onExploreCategory('all')}
              className="ms-btn-glint w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-7 py-3.5 sm:py-4 min-h-[48px] bg-[#D92323] text-white text-sm font-semibold rounded-lg hover:bg-[#B81C1C] transition-colors whitespace-nowrap shrink-0 cursor-pointer shadow-lg shadow-[#D92323]/25"
            >
              <span>Découvrir toute la carte</span>
              <ArrowDown className="w-4 h-4" strokeWidth={2} />
            </MagneticButton>
          </div>

          {/* Clean unboxed category shortcut links */}
          <div className="flex flex-wrap items-center justify-center gap-x-4 sm:gap-x-6 gap-y-2 text-xs sm:text-sm font-medium text-zinc-400">
            {QUICK_FILTERS.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => onExploreCategory(cat.id)}
                className="ms-link-underline hover:text-white transition-colors py-1.5 px-1 min-h-[36px] cursor-pointer whitespace-nowrap shrink-0"
              >
                {cat.label}
              </button>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
