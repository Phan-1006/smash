import type { User } from 'firebase/auth';
import type { Timestamp } from 'firebase/firestore';
import type { MenuAddon, MenuCategory } from '../data/menu';

export const ADMIN_EMAIL = 'p9695009@gmail.com';

export function isAdminUser(user: User | null): boolean {
  return Boolean(
    user &&
      user.emailVerified &&
      user.email &&
      user.email.toLowerCase() === ADMIN_EMAIL.toLowerCase()
  );
}

export type CurrencyCode = 'USD' | 'CDF';
export type DeliveryMode = 'delivery' | 'pickup';
export type PaymentMethodType = 'MOBILEMONEY' | 'CARD';
export type PaymentProviderType =
  | 'MPESA'
  | 'AIRTEL'
  | 'ORANGE'
  | 'AFRICELL'
  | 'VISA_MASTERCARD';

export type PaymentStatusType = 'PENDING' | 'PAID' | 'FAILED';
export type OrderStatusType =
  | 'AWAITING_PAYMENT'
  | 'PREPARING'
  | 'READY'
  | 'DELIVERING'
  | 'DELIVERED'
  | 'CANCELLED';

export interface ProductDoc {
  id: string;
  name: string;
  category: Exclude<MenuCategory, 'all'>;
  categoryLabel: string;
  calories: string;
  description: string;
  priceUsd: number;
  image: string;
  tag?: string;
  available: boolean;
  supportsCombo: boolean;
  comboExtraUsd: number;
  addons: MenuAddon[];
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface UserProfileDoc {
  uid: string;
  displayName: string;
  email: string;
  phone?: string;
  defaultAddress?: string;
  defaultCity?: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface CartItemDoc {
  id: string;
  userId: string;
  productId: string;
  productName: string;
  unitPriceUsd: number;
  quantity: number;
  variant: 'Solo' | 'Menu Complet';
  addons: string[];
  notes?: string;
  image: string;
  updatedAt?: Timestamp;
}

export interface OrderDoc {
  id: string;
  userId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  deliveryMode: DeliveryMode;
  deliveryAddress: string;
  currency: CurrencyCode;
  subtotalUsd: number;
  discountUsd?: number;
  promoCode?: string;
  deliveryFeeUsd: number;
  totalAmount: number;
  paymentMethod: PaymentMethodType;
  paymentProvider: PaymentProviderType;
  transactionReference: string;
  paymentStatus: PaymentStatusType;
  orderStatus: OrderStatusType;
  itemsSummary: string[];
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface MaishaPayConfigResponse {
  configured: boolean;
  gatewayMode: string;
  modeLabel: 'LIVE' | 'SANDBOX';
  supportedMobileProviders: string[];
}
