import type { SiteSettingsDoc } from '../types/ecommerce';
import { sanitizeImageUrl } from '../utils/imageUpload';

export const DEFAULT_SITE_SETTINGS: Omit<SiteSettingsDoc, 'updatedAt'> = {
  id: 'main',
  brandName: 'MAISON SMASH',
  storeCity: 'Kinshasa, Gombe',
  storeAddress: 'Boulevard du 30 Juin, Gombe, Kinshasa',
  openingHours: '11h00 – 23h30 · Tous les jours',
  contactPhone: '+243 81 000 0000',
  contactEmail: 'contact@maisonsmash.com',
  heroKicker: 'Comptoir Gastronomique · Fait minute',
  heroTitle: 'Saisi à 260°C. Servi à l’instant.',
  heroSubtitle:
    'La croûte dentelée du vrai smash burger Charolais, la pâte au levain fermentée 72 heures sur pierre brûlante, le poulet mariné au babeurre et nos milkshakes montés minute.',
  heroMainImage: '/src/assets/images/hero_cinematic_smash_1795260047387.jpg',
  heroMacroImage: '/src/assets/images/macro_maillard_sear_1795260048117.jpg',
  pizzaShowcaseImage: '/src/assets/images/pizza_overhead_editorial_1795265770611.jpg',
  crispyShowcaseImage: '/src/assets/images/crispy_chicken_campaign_1795265770266.jpg',
  friesShowcaseImage: '/src/assets/images/fries_loaded_box_1794856489833.jpg',
  drinksShowcaseImage: '/src/assets/images/milkshake_studio_campaign_1795265770716.jpg',
  deliveryFeeUsd: 2.5,
  freeDeliveryThresholdUsd: 30,
  usdToCdfRate: 2850,
  enableCdfCurrency: true,
};

function cleanBoundedString(val: unknown, fallback: string, minLen: number, maxLen: number): string {
  if (typeof val !== 'string') return fallback;
  const trimmed = val.trim().slice(0, maxLen);
  return trimmed.length >= minLen ? trimmed : fallback;
}

function cleanBoundedNumber(val: unknown, fallback: number, min: number, max: number): number {
  const num = typeof val === 'number' ? val : Number(val);
  if (!Number.isFinite(num)) return fallback;
  return Math.max(min, Math.min(max, num));
}

export function normalizeSiteSettings(raw: Partial<SiteSettingsDoc> | null | undefined): Omit<SiteSettingsDoc, 'updatedAt'> {
  const src = raw || {};
  return {
    id: 'main',
    brandName: cleanBoundedString(src.brandName, DEFAULT_SITE_SETTINGS.brandName, 1, 60),
    storeCity: cleanBoundedString(src.storeCity, DEFAULT_SITE_SETTINGS.storeCity, 1, 80),
    storeAddress: cleanBoundedString(src.storeAddress, DEFAULT_SITE_SETTINGS.storeAddress, 1, 240),
    openingHours: cleanBoundedString(src.openingHours, DEFAULT_SITE_SETTINGS.openingHours, 1, 80),
    contactPhone: cleanBoundedString(src.contactPhone, DEFAULT_SITE_SETTINGS.contactPhone, 0, 30),
    contactEmail: cleanBoundedString(src.contactEmail, DEFAULT_SITE_SETTINGS.contactEmail, 0, 160),
    heroKicker: cleanBoundedString(src.heroKicker, DEFAULT_SITE_SETTINGS.heroKicker, 1, 100),
    heroTitle: cleanBoundedString(src.heroTitle, DEFAULT_SITE_SETTINGS.heroTitle, 1, 140),
    heroSubtitle: cleanBoundedString(src.heroSubtitle, DEFAULT_SITE_SETTINGS.heroSubtitle, 1, 320),
    heroMainImage: sanitizeImageUrl(src.heroMainImage, DEFAULT_SITE_SETTINGS.heroMainImage),
    heroMacroImage: sanitizeImageUrl(src.heroMacroImage, DEFAULT_SITE_SETTINGS.heroMacroImage),
    pizzaShowcaseImage: sanitizeImageUrl(src.pizzaShowcaseImage, DEFAULT_SITE_SETTINGS.pizzaShowcaseImage),
    crispyShowcaseImage: sanitizeImageUrl(src.crispyShowcaseImage, DEFAULT_SITE_SETTINGS.crispyShowcaseImage),
    friesShowcaseImage: sanitizeImageUrl(src.friesShowcaseImage, DEFAULT_SITE_SETTINGS.friesShowcaseImage),
    drinksShowcaseImage: sanitizeImageUrl(src.drinksShowcaseImage, DEFAULT_SITE_SETTINGS.drinksShowcaseImage),
    deliveryFeeUsd: Number(cleanBoundedNumber(src.deliveryFeeUsd, DEFAULT_SITE_SETTINGS.deliveryFeeUsd, 0, 500).toFixed(2)),
    freeDeliveryThresholdUsd: Number(cleanBoundedNumber(src.freeDeliveryThresholdUsd, DEFAULT_SITE_SETTINGS.freeDeliveryThresholdUsd, 0, 5000).toFixed(2)),
    usdToCdfRate: Math.round(cleanBoundedNumber(src.usdToCdfRate, DEFAULT_SITE_SETTINGS.usdToCdfRate, 100, 100000)),
    enableCdfCurrency:
      typeof src.enableCdfCurrency === 'boolean'
        ? src.enableCdfCurrency
        : DEFAULT_SITE_SETTINGS.enableCdfCurrency,
  };
}
