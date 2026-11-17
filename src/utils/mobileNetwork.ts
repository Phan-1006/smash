import type { PaymentProviderType } from '../types/ecommerce';

export type MobileProviderId = Exclude<PaymentProviderType, 'VISA_MASTERCARD'>;

export interface DetectedMobileNetwork {
  provider: MobileProviderId;
  brandName: string;
  shortLabel: string;
  prefix: string;
  accentClass: string;
}

const PREFIX_MAP: {
  prefixes: string[];
  provider: MobileProviderId;
  brandName: string;
  shortLabel: string;
  accentClass: string;
}[] = [
  {
    prefixes: ['81', '82', '83'],
    provider: 'MPESA',
    brandName: 'Vodacom M-Pesa',
    shortLabel: 'M-Pesa',
    accentClass: 'text-[#E60000]',
  },
  {
    prefixes: ['97', '98', '99'],
    provider: 'AIRTEL',
    brandName: 'Airtel Money',
    shortLabel: 'Airtel Money',
    accentClass: 'text-[#D92323]',
  },
  {
    prefixes: ['80', '84', '85', '89'],
    provider: 'ORANGE',
    brandName: 'Orange Money',
    shortLabel: 'Orange Money',
    accentClass: 'text-[#EA580C]',
  },
  {
    prefixes: ['90', '91'],
    provider: 'AFRICELL',
    brandName: 'Africell Money',
    shortLabel: 'Africell Money',
    accentClass: 'text-[#7C3AED]',
  },
];

/**
 * Extracts the national subscriber digits (e.g. "812345678") from inputs like:
 * "+243 81 234 5678", "00243812345678", "243812345678", "0812345678", "812345678"
 */
export function extractNationalDigits(rawPhone: string): string {
  let digits = rawPhone.replace(/\D/g, '');
  if (!digits) return '';

  if (digits.startsWith('00243')) {
    digits = digits.slice(5);
  } else if (digits.startsWith('243')) {
    digits = digits.slice(3);
  }

  if (digits.startsWith('0')) {
    digits = digits.slice(1);
  }

  return digits;
}

export function detectCongoleseMobileNetwork(rawPhone: string): DetectedMobileNetwork | null {
  const national = extractNationalDigits(rawPhone);
  if (national.length < 2) return null;

  const twoDigits = national.slice(0, 2);
  for (const entry of PREFIX_MAP) {
    if (entry.prefixes.includes(twoDigits)) {
      return {
        provider: entry.provider,
        brandName: entry.brandName,
        shortLabel: entry.shortLabel,
        prefix: `0${twoDigits}`,
        accentClass: entry.accentClass,
      };
    }
  }

  return null;
}
