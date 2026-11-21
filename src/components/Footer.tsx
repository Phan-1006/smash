import { DEFAULT_SITE_SETTINGS } from '../data/siteSettings';
import type { SiteSettingsDoc } from '../types/ecommerce';

interface FooterProps {
  siteSettings?: Omit<SiteSettingsDoc, 'updatedAt'>;
}

export function Footer({ siteSettings = DEFAULT_SITE_SETTINGS }: FooterProps) {
  return (
    <footer className="bg-[#141414] text-zinc-300 border-t border-zinc-800">
      <div className="max-w-7xl xl:max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-10 py-10 sm:py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 pb-8 sm:pb-10 border-b border-zinc-800">
          <div className="sm:col-span-2 lg:col-span-1">
            <p className="font-display text-xl font-extrabold text-white tracking-tight mb-3">
              {siteSettings.brandName}
            </p>
            <p className="text-sm text-zinc-400 leading-relaxed max-w-sm">
              Smash burgers saisis à la minute, pizzas sur pierre, poulet croustillant mariné 48h et
              frites coupées main.
            </p>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-3">
              Comptoir &amp; Horaires
            </p>
            <p className="text-sm text-zinc-300">{siteSettings.storeAddress}</p>
            <p className="text-sm text-zinc-400 mt-1">{siteSettings.openingHours}</p>
            {(siteSettings.contactPhone || siteSettings.contactEmail) && (
              <p className="text-xs text-zinc-400 mt-2 font-mono">
                {[siteSettings.contactPhone, siteSettings.contactEmail].filter(Boolean).join(' · ')}
              </p>
            )}
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-3">
              Paiements acceptés
            </p>
            <p className="text-sm text-zinc-300">
              M-Pesa, Airtel Money, Orange Money, Africell, Visa &amp; Mastercard.
            </p>
          </div>
        </div>

        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-zinc-500">
          <p className="text-center sm:text-left">
            © {new Date().getFullYear()} {siteSettings.brandName}. Tous droits réservés.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-6">
            <a
              href="#burger-story"
              className="ms-link-underline hover:text-white transition-colors py-1"
            >
              L’Atelier Burger
            </a>
            <a
              href="#pizzas"
              className="ms-link-underline hover:text-white transition-colors py-1"
            >
              Pizzas
            </a>
            <a
              href="#crispy-drinks"
              className="ms-link-underline hover:text-white transition-colors py-1"
            >
              Poulet &amp; Shakes
            </a>
            <a href="#menu" className="ms-link-underline hover:text-white transition-colors py-1">
              La Carte
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
