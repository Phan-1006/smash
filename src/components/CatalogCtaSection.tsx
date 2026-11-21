import { ArrowDown, ArrowUp, Flame } from 'lucide-react';
import { motion } from 'motion/react';
import { MenuCategory } from '../data/menu';
import { DEFAULT_SITE_SETTINGS } from '../data/siteSettings';
import type { SiteSettingsDoc } from '../types/ecommerce';
import { MagneticButton } from './MagneticButton';

interface CatalogCtaSectionProps {
  siteSettings?: Omit<SiteSettingsDoc, 'updatedAt'>;
  onExploreCategory: (category: MenuCategory) => void;
}

const QUICK_FILTERS: { id: MenuCategory; label: string }[] = [
  { id: 'burgers', label: 'Smash Burgers' },
  { id: 'pizzas', label: 'Pizzas Artisanales' },
  { id: 'chicken', label: 'Poulet Croustillant' },
  { id: 'sides', label: 'Frites & Sides' },
  { id: 'drinks', label: 'Boissons & Shakes' },
];

export function CatalogCtaSection({
  siteSettings = DEFAULT_SITE_SETTINGS,
  onExploreCategory,
}: CatalogCtaSectionProps) {
  return (
    <section className="relative bg-[#141414] text-white py-14 sm:py-20 lg:py-24 overflow-hidden border-t border-zinc-800/80">
      {/* Subtle warm radial ember ambient light */}
      <div
        className="absolute inset-0 pointer-events-none opacity-65"
        style={{
          background:
            'radial-gradient(ellipse 70% 80% at 50% 100%, rgba(217, 35, 35, 0.24), transparent 72%)',
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
          <p className="inline-flex items-center gap-2 text-[11px] sm:text-xs font-medium uppercase tracking-[0.22em] text-[#F59E0B] mb-3">
            <Flame className="w-3.5 h-3.5 text-[#D92323]" strokeWidth={2} />
            <span>
              {siteSettings.storeCity} · {siteSettings.openingHours}
            </span>
          </p>

          <h2
            className="font-display text-2xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white mb-3 sm:mb-4"
            style={{ textWrap: 'balance' }}
          >
            Prêt pour votre prochain smash ?
          </h2>

          <p className="text-sm sm:text-base text-zinc-300 leading-relaxed max-w-2xl mx-auto mb-7 sm:mb-9">
            Commandez à emporter ou en livraison express à {siteSettings.storeCity}. Paiement
            sécurisé en {siteSettings.enableCdfCurrency ? 'USD ou Francs Congolais' : 'USD'} par
            Mobile Money et cartes Visa / Mastercard.
          </p>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 sm:gap-4 mb-7 sm:mb-9">
            <MagneticButton
              href="#menu"
              wrapperClassName="w-full sm:w-auto inline-flex"
              onClick={() => onExploreCategory('all')}
              className="ms-btn-glint w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-7 py-3.5 sm:py-4 min-h-[48px] bg-[#D92323] text-white text-sm font-semibold rounded-lg hover:bg-[#B81C1C] transition-colors whitespace-nowrap shrink-0 cursor-pointer shadow-lg shadow-[#D92323]/25"
            >
              <span>Commander sur la carte</span>
              <ArrowUp className="w-4 h-4" strokeWidth={2} />
            </MagneticButton>

            <a
              href="#burger-story"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3.5 sm:py-4 min-h-[48px] border border-zinc-700 text-zinc-200 text-sm font-semibold rounded-lg hover:bg-zinc-900 hover:border-zinc-500 hover:text-white transition-colors whitespace-nowrap shrink-0"
            >
              <span>Revoir l’atelier burger</span>
              <ArrowDown className="w-4 h-4 rotate-180" strokeWidth={2} />
            </a>
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
