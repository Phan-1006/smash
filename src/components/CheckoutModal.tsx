import { useEffect, useState } from 'react';
import { User } from 'firebase/auth';
import {
  AlertCircle,
  CheckCircle2,
  CreditCard,
  ExternalLink,
  Loader2,
  Lock,
  MapPin,
  Smartphone,
  X,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import {
  convertUsdAmount,
  formatMoney,
  PROMO_CODES,
} from '../data/menu';
import { DEFAULT_SITE_SETTINGS } from '../data/siteSettings';
import {
  createOrderRecord,
  sanitizeId,
  updateOrderPaymentState,
} from '../services/storefrontService';
import type {
  CartItemDoc,
  CurrencyCode,
  DeliveryMode,
  MaishaPayConfigResponse,
  PaymentMethodType,
  PaymentProviderType,
  SiteSettingsDoc,
  UserProfileDoc,
} from '../types/ecommerce';
import { apiUrl, parseJsonSafe } from '../utils/api';
import {
  detectCongoleseMobileNetwork,
  extractNationalDigits,
  type DetectedMobileNetwork,
} from '../utils/mobileNetwork';

interface CheckoutModalProps {
  open: boolean;
  user: User | null;
  profile: UserProfileDoc | null;
  items: CartItemDoc[];
  currency: CurrencyCode;
  deliveryMode: DeliveryMode;
  promoCode: string | null;
  siteSettings?: Omit<SiteSettingsDoc, 'updatedAt'>;
  onChangeCurrency: (c: CurrencyCode) => void;
  onSignInGoogle: () => Promise<string | null>;
  onClearCart: () => Promise<void>;
  onClose: () => void;
  onOrderCompleted: () => void;
}

const MOBILE_PROVIDERS: { id: Exclude<PaymentProviderType, 'VISA_MASTERCARD'>; label: string }[] = [
  { id: 'MPESA', label: 'M-Pesa' },
  { id: 'AIRTEL', label: 'Airtel Money' },
  { id: 'ORANGE', label: 'Orange Money' },
  { id: 'AFRICELL', label: 'Africell Money' },
];

export function CheckoutModal({
  open,
  user,
  profile,
  items,
  currency,
  deliveryMode,
  promoCode,
  siteSettings = DEFAULT_SITE_SETTINGS,
  onChangeCurrency,
  onSignInGoogle,
  onClearCart,
  onClose,
  onOrderCompleted,
}: CheckoutModalProps) {
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodType>('MOBILEMONEY');
  const [mobileProvider, setMobileProvider] =
    useState<Exclude<PaymentProviderType, 'VISA_MASTERCARD'>>('MPESA');
  const [detectedNetwork, setDetectedNetwork] = useState<DetectedMobileNetwork | null>(null);
  const [sharedLocation, setSharedLocation] = useState<{
    lat: number;
    lng: number;
    accuracy: number;
  } | null>(null);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  const [gatewayConfig, setGatewayConfig] = useState<MaishaPayConfigResponse | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [authBusy, setAuthBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [activeTxRef, setActiveTxRef] = useState<string | null>(null);
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null);
  const [gatewayMessage, setGatewayMessage] = useState<string | null>(null);
  const [paymentPageUrl, setPaymentPageUrl] = useState<string | null>(null);
  const [paymentPhase, setPaymentPhase] = useState<
    'form' | 'awaiting_confirmation' | 'paid' | 'failed'
  >('form');

  useEffect(() => {
    if (!open) return;
    setErrorMessage(null);
    setLocationError(null);
    setPaymentPhase('form');
    setActiveTxRef(null);
    setActiveOrderId(null);
    setPaymentPageUrl(null);
    setGatewayMessage(null);

    if (user) {
      setCustomerName((prev) => prev || profile?.displayName || user.displayName || '');
      const initialPhone = customerPhone || profile?.phone || '';
      if (!customerPhone && profile?.phone) {
        setCustomerPhone(profile.phone);
      }
      const initialDetected = detectCongoleseMobileNetwork(initialPhone);
      setDetectedNetwork(initialDetected);
      if (initialDetected) {
        setMobileProvider(initialDetected.provider);
      }
      setDeliveryAddress(
        (prev) =>
          prev ||
          (deliveryMode === 'pickup'
            ? `Comptoir ${siteSettings.brandName} — ${siteSettings.storeAddress}`
            : profile?.defaultAddress || '')
      );
    }

    fetch(apiUrl('/api/payments/maishapay/config'))
      .then((res) => parseJsonSafe<MaishaPayConfigResponse>(res))
      .then((data) => setGatewayConfig(data))
      .catch(() => setGatewayConfig(null));
  }, [open, user, profile, deliveryMode, siteSettings.brandName, siteSettings.storeAddress]);

  // Poll transaction status when awaiting Mobile Money / Card confirmation
  useEffect(() => {
    if (paymentPhase !== 'awaiting_confirmation' || !activeTxRef || !activeOrderId) {
      return;
    }

    const timer = window.setInterval(async () => {
      try {
        const res = await fetch(
          apiUrl(`/api/payments/maishapay/status/${encodeURIComponent(activeTxRef)}`)
        );
        if (!res.ok) return;
        const data = await parseJsonSafe<{
          status: 'PENDING' | 'PAID' | 'FAILED';
          gatewayMessage?: string;
        }>(res);
        if (!data) return;
        if (data.status === 'PAID') {
          await updateOrderPaymentState(activeOrderId, 'PAID', 'PREPARING');
          await onClearCart();
          setGatewayMessage(data.gatewayMessage || 'Paiement confirmé.');
          setPaymentPhase('paid');
        } else if (data.status === 'FAILED') {
          await updateOrderPaymentState(activeOrderId, 'FAILED', 'CANCELLED');
          setGatewayMessage(data.gatewayMessage || 'La transaction a été refusée ou annulée.');
          setPaymentPhase('failed');
        }
      } catch {
        // Keep polling quietly
      }
    }, 3500);

    return () => window.clearInterval(timer);
  }, [paymentPhase, activeTxRef, activeOrderId, onClearCart]);

  if (!open) return null;

  const subtotalUsd = items.reduce((sum, item) => sum + item.unitPriceUsd * item.quantity, 0);
  const promoInfo = promoCode ? PROMO_CODES[promoCode] : undefined;
  const discountUsd = promoInfo ? Number((subtotalUsd * promoInfo.rate).toFixed(2)) : 0;
  const discountedSubtotalUsd = Math.max(0, subtotalUsd - discountUsd);

  const qualifiesFreeDelivery =
    siteSettings.deliveryFeeUsd <= 0 ||
    siteSettings.freeDeliveryThresholdUsd <= 0 ||
    subtotalUsd >= siteSettings.freeDeliveryThresholdUsd;
  const deliveryFeeUsd =
    deliveryMode === 'pickup' || items.length === 0 || qualifiesFreeDelivery
      ? 0
      : siteSettings.deliveryFeeUsd;
  const totalUsd = discountedSubtotalUsd + deliveryFeeUsd;
  const totalInCurrency = convertUsdAmount(totalUsd, currency, siteSettings.usdToCdfRate);

  const handlePhoneChange = (nextValue: string) => {
    setCustomerPhone(nextValue);
    const matched = detectCongoleseMobileNetwork(nextValue);
    setDetectedNetwork(matched);
    if (matched) {
      setMobileProvider(matched.provider);
    }
  };

  const handleShareLocation = () => {
    if (locating) return;
    if (!('geolocation' in navigator)) {
      setLocationError(
        'La géolocalisation n’est pas prise en charge par ce navigateur. Saisissez votre adresse manuellement.'
      );
      return;
    }

    setLocating(true);
    setLocationError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = Number(position.coords.latitude.toFixed(6));
        const lng = Number(position.coords.longitude.toFixed(6));
        const accuracy = Math.max(1, Math.round(position.coords.accuracy || 20));

        setSharedLocation({ lat, lng, accuracy });
        setDeliveryAddress((prev) =>
          prev.trim().length === 0
            ? `Position GPS partagée (${lat.toFixed(5)}, ${lng.toFixed(5)})`
            : prev
        );
        setLocating(false);
      },
      (geoError) => {
        if (geoError.code === geoError.PERMISSION_DENIED) {
          setLocationError(
            'Accès à la position refusé. Autorisez la localisation dans votre navigateur ou indiquez votre adresse ci-dessus.'
          );
        } else if (geoError.code === geoError.TIMEOUT) {
          setLocationError(
            'Délai de localisation dépassé. Vérifiez votre signal GPS et réessayez.'
          );
        } else {
          setLocationError(
            'Impossible de récupérer votre position actuelle. Indiquez votre adresse ci-dessus.'
          );
        }
        setLocating(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
      }
    );
  };

  const handleGoogleAuth = async () => {
    if (authBusy) return;
    setAuthBusy(true);
    setErrorMessage(null);
    try {
      const errMsg = await onSignInGoogle();
      if (errMsg) {
        setErrorMessage(errMsg);
      }
    } finally {
      setAuthBusy(false);
    }
  };

  const handleCheckStatusNow = async () => {
    if (!activeTxRef || !activeOrderId) return;
    try {
      const res = await fetch(
        apiUrl(`/api/payments/maishapay/status/${encodeURIComponent(activeTxRef)}`)
      );
      if (!res.ok) return;
      const data = await parseJsonSafe<{
        status: 'PENDING' | 'PAID' | 'FAILED';
        gatewayMessage?: string;
      }>(res);
      if (!data) return;
      if (data.status === 'PAID') {
        await updateOrderPaymentState(activeOrderId, 'PAID', 'PREPARING');
        await onClearCart();
        setGatewayMessage(data.gatewayMessage || 'Paiement confirmé.');
        setPaymentPhase('paid');
      } else if (data.status === 'FAILED') {
        await updateOrderPaymentState(activeOrderId, 'FAILED', 'CANCELLED');
        setGatewayMessage(
          data.gatewayMessage || 'La transaction a été refusée ou expirée côté opérateur.'
        );
        setPaymentPhase('failed');
      } else {
        setGatewayMessage(
          data.gatewayMessage ||
            'Toujours en attente de validation sur votre téléphone ou banque.'
        );
      }
    } catch {
      setErrorMessage('Impossible de vérifier le statut auprès du serveur.');
    }
  };

  const handleSubmitPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      setErrorMessage('Connectez-vous avec Google avant de valider la commande.');
      return;
    }
    if (items.length === 0) {
      setErrorMessage('Votre panier est vide.');
      return;
    }
    if (customerName.trim().length < 2) {
      setErrorMessage('Veuillez renseigner votre nom complet.');
      return;
    }
    if (customerPhone.trim().length < 8) {
      setErrorMessage('Veuillez saisir un numéro de téléphone valide (ex. +243 81 234 5678).');
      return;
    }
    if (paymentMethod === 'MOBILEMONEY') {
      const digitsOnly = customerPhone.replace(/\D/g, '');
      const national = extractNationalDigits(customerPhone);
      const isDrcInput =
        digitsOnly.startsWith('243') ||
        digitsOnly.startsWith('00243') ||
        digitsOnly.startsWith('08') ||
        digitsOnly.startsWith('09') ||
        /^[89]/.test(digitsOnly);
      if (isDrcInput && !/^[89]\d{8}$/.test(national)) {
        setErrorMessage(
          'Numéro Mobile Money incomplet : indiquez les 9 chiffres après 0 ou +243 (ex. +243 81 234 5678).'
        );
        return;
      }
    }
    if (deliveryMode === 'delivery' && deliveryAddress.trim().length < 4) {
      setErrorMessage('Veuillez saisir une adresse de livraison précise.');
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);

    const randSuffix = Math.random().toString(36).slice(2, 8).toUpperCase();
    const orderId = sanitizeId(`ORD_${Date.now()}_${randSuffix}`, 64);
    const txRef = sanitizeId(`MS-${Date.now()}-${randSuffix}`, 80);
    const provider: PaymentProviderType =
      paymentMethod === 'CARD' ? 'VISA_MASTERCARD' : mobileProvider;

    const itemsSummary = items.map((item) => {
      const lineUsd = (item.unitPriceUsd * item.quantity).toFixed(2);
      const addonsText = item.addons.length > 0 ? ` [${item.addons.join(', ')}]` : '';
      return `${item.quantity}x ${item.productName} (${item.variant})${addonsText} - $${lineUsd}`;
    });

    try {
      await createOrderRecord({
        id: orderId,
        userId: user.uid,
        customerName: customerName.trim(),
        customerEmail: user.email || 'client@maisonsmash.com',
        customerPhone: customerPhone.trim(),
        deliveryMode,
        deliveryAddress:
          deliveryMode === 'pickup'
            ? `Comptoir ${siteSettings.brandName} — ${siteSettings.storeAddress}`.slice(0, 240)
            : deliveryAddress.trim(),
        deliveryLat:
          deliveryMode === 'delivery' && sharedLocation ? sharedLocation.lat : undefined,
        deliveryLng:
          deliveryMode === 'delivery' && sharedLocation ? sharedLocation.lng : undefined,
        deliveryAccuracy:
          deliveryMode === 'delivery' && sharedLocation ? sharedLocation.accuracy : undefined,
        currency,
        subtotalUsd: Number(subtotalUsd.toFixed(2)),
        discountUsd: discountUsd > 0 ? discountUsd : undefined,
        promoCode: promoCode || undefined,
        deliveryFeeUsd: Number(deliveryFeeUsd.toFixed(2)),
        totalAmount: totalInCurrency,
        paymentMethod,
        paymentProvider: provider,
        transactionReference: txRef,
        paymentStatus: 'PENDING',
        orderStatus: 'AWAITING_PAYMENT',
        itemsSummary,
      });

      setActiveOrderId(orderId);
      setActiveTxRef(txRef);

      const endpoint =
        paymentMethod === 'CARD'
          ? '/api/payments/maishapay/card'
          : '/api/payments/maishapay/mobile-money';

      const response = await fetch(apiUrl(endpoint), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: totalInCurrency,
          currency,
          customerFullName: customerName.trim(),
          customerPhoneNumber: customerPhone.trim(),
          customerEmail: user.email || 'client@maisonsmash.com',
          provider: mobileProvider,
          transactionReference: txRef,
        }),
      });

      const result = await parseJsonSafe<{
        error?: string;
        status?: 'PENDING' | 'PAID' | 'FAILED';
        gatewayMessage?: string;
        paymentPageUrl?: string;
      }>(response);

      if (!response.ok || !result) {
        await updateOrderPaymentState(orderId, 'FAILED', 'CANCELLED');
        const fallbackError =
          response.status === 404
            ? 'Service de paiement introuvable (/api). Redéployez avec les routes API et vos clés serveur.'
            : `Le paiement a échoué (HTTP ${response.status}). Vérifiez vos informations et la configuration serveur.`;
        setErrorMessage(result?.error || fallbackError);
        setSubmitting(false);
        return;
      }

      setGatewayMessage(result.gatewayMessage || null);
      if (result.paymentPageUrl && /^https:\/\//i.test(result.paymentPageUrl)) {
        setPaymentPageUrl(result.paymentPageUrl);
      }

      if (result.status === 'PAID') {
        await updateOrderPaymentState(orderId, 'PAID', 'PREPARING');
        await onClearCart();
        setPaymentPhase('paid');
      } else if (result.status === 'FAILED') {
        await updateOrderPaymentState(orderId, 'FAILED', 'CANCELLED');
        setPaymentPhase('failed');
      } else {
        setPaymentPhase('awaiting_confirmation');
      }
    } catch (err) {
      const rawMsg = err instanceof Error ? err.message : '';
      if (rawMsg.startsWith('{')) {
        setErrorMessage(
          'Impossible d’enregistrer la commande dans votre compte. Vérifiez votre connexion Google et réessayez.'
        );
      } else {
        setErrorMessage(
          rawMsg || 'Erreur lors de la création de commande ou de la validation du paiement.'
        );
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-6">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/55 backdrop-blur-xs"
        />

        <motion.div
          role="dialog"
          aria-modal="true"
          aria-labelledby="checkout-modal-title"
          initial={{ opacity: 0, scale: 0.96, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 20 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="relative z-10 w-full max-w-2xl bg-white rounded-t-2xl sm:rounded-2xl border border-zinc-200 shadow-2xl overflow-hidden max-h-[94dvh] sm:max-h-[92vh] flex flex-col"
        >
          {/* Clean Header (no gateway spam) */}
          <div className="px-4 py-4 sm:px-6 sm:py-5 border-b border-zinc-200 flex items-center justify-between gap-4 shrink-0">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
                Paiement en ligne · Mobile Money & Cartes
              </p>
              <h2
                id="checkout-modal-title"
                className="font-display text-xl sm:text-2xl font-extrabold text-[#141414]"
              >
                Finaliser la commande
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Fermer le paiement"
              className="p-2.5 min-w-[44px] min-h-[44px] inline-flex items-center justify-center text-zinc-500 hover:text-[#141414] hover:bg-[#F5F5F7] rounded-lg transition-colors shrink-0 cursor-pointer"
            >
              <X className="w-5 h-5" strokeWidth={2} />
            </button>
          </div>

          <div className="p-4 sm:p-6 overflow-y-auto space-y-5 sm:space-y-6">
            {!user ? (
              <div className="bg-[#F5F5F7] rounded-2xl p-6 text-center">
                <p className="font-display text-lg font-bold text-[#141414] mb-2">
                  Connectez-vous avec Google pour commander
                </p>
                <p className="text-sm text-zinc-600 max-w-md mx-auto mb-6">
                  Votre compte Google permet de lier vos commandes, recevoir le suivi en temps réel
                  et sécuriser votre règlement.
                </p>
                <button
                  type="button"
                  onClick={handleGoogleAuth}
                  disabled={authBusy}
                  className="inline-flex items-center justify-center gap-3 px-6 py-3 bg-[#141414] text-white text-sm font-semibold rounded-lg hover:bg-zinc-800 transition-colors cursor-pointer disabled:opacity-50"
                >
                  {authBusy ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
                      <path
                        fill="#EA4335"
                        d="M12 5c1.6 0 3.1.6 4.2 1.7l3.1-3.1C17.4 1.8 14.9 1 12 1 7.4 1 3.4 3.6 1.5 7.4l3.7 2.8C6.1 7.2 8.8 5 12 5z"
                      />
                      <path
                        fill="#4285F4"
                        d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.6l3.7 2.9c2.2-2 3.7-5 3.7-8.7z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.2 14.8c-.2-.8-.4-1.8-.4-2.8s.2-2 .4-2.8L1.5 6.4C.5 8.1 0 10 0 12s.5 3.9 1.5 5.6l3.7-2.8z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3.2 0-5.9-2.2-6.8-5.1l-3.7 2.8C3.4 20.4 7.4 23 12 23z"
                      />
                    </svg>
                  )}
                  <span>Continuer avec Google</span>
                </button>
                {errorMessage && (
                  <p className="mt-4 text-xs text-[#D92323] font-medium">{errorMessage}</p>
                )}
              </div>
            ) : paymentPhase === 'paid' ? (
              <div className="py-8 text-center space-y-4">
                <div className="w-14 h-14 mx-auto rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <CheckCircle2 className="w-8 h-8" strokeWidth={2} />
                </div>
                <h3 className="font-display text-2xl font-extrabold text-[#141414]">
                  Paiement confirmé, commande en cuisine
                </h3>
                <p className="text-sm text-zinc-600 max-w-md mx-auto">
                  Votre commande ({activeTxRef}) a été validée. Nos équipes préparent vos plats à la
                  minute.
                </p>
                <div className="pt-2 flex items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOrderCompleted();
                    }}
                    className="px-6 py-3 bg-[#141414] text-white text-sm font-semibold rounded-lg hover:bg-zinc-800 transition-colors cursor-pointer"
                  >
                    Suivre ma commande
                  </button>
                </div>
              </div>
            ) : paymentPhase === 'awaiting_confirmation' ? (
              <div className="py-6 space-y-5 text-center">
                <div className="w-12 h-12 mx-auto rounded-xl bg-[#F5F5F7] text-[#D92323] flex items-center justify-center">
                  <Loader2 className="w-6 h-6 animate-spin" />
                </div>
                <div>
                  <h3 className="font-display text-xl font-extrabold text-[#141414] mb-1">
                    {paymentMethod === 'CARD' || paymentPageUrl
                      ? 'Finalisez le paiement sur la page sécurisée'
                      : 'Confirmez le push USSD sur votre téléphone'}
                  </h3>
                  <p className="text-sm text-zinc-600 max-w-md mx-auto">
                    {gatewayMessage ||
                      'Veuillez saisir votre code PIN Mobile Money sur votre téléphone pour autoriser le débit.'}
                  </p>
                  <p className="font-mono text-xs text-zinc-500 mt-2">
                    Référence : {activeTxRef} · Montant :{' '}
                    {formatMoney(totalUsd, currency, siteSettings.usdToCdfRate)}
                  </p>
                </div>

                {paymentPageUrl && (
                  <a
                    href={paymentPageUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ms-btn-glint inline-flex items-center gap-2 px-5 py-3 bg-[#D92323] text-white text-sm font-semibold rounded-lg hover:bg-[#B81C1C] transition-colors"
                  >
                    <span>Ouvrir la page de paiement sécurisée</span>
                    <ExternalLink className="w-4 h-4" />
                  </a>
                )}

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={handleCheckStatusNow}
                    className="px-4 py-2.5 min-h-[44px] border border-zinc-300 text-sm font-semibold text-[#141414] rounded-lg hover:bg-zinc-50 transition-colors cursor-pointer"
                  >
                    Vérifier le statut maintenant
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOrderCompleted();
                    }}
                    className="px-4 py-2.5 min-h-[44px] text-sm font-semibold text-zinc-600 hover:text-[#141414] cursor-pointer"
                  >
                    Voir dans Mes Commandes
                  </button>
                </div>
              </div>
            ) : paymentPhase === 'failed' ? (
              <div className="py-8 text-center space-y-4">
                <div className="w-14 h-14 mx-auto rounded-full bg-red-50 text-[#D92323] flex items-center justify-center">
                  <AlertCircle className="w-8 h-8" strokeWidth={2} />
                </div>
                <h3 className="font-display text-xl font-extrabold text-[#141414]">
                  Transaction non aboutie
                </h3>
                <p className="text-sm text-zinc-600 max-w-md mx-auto">
                  {gatewayMessage ||
                    'Le paiement a été refusé ou expiré. Aucun montant n’a été débité.'}
                </p>
                <button
                  type="button"
                  onClick={() => setPaymentPhase('form')}
                  className="px-6 py-3 bg-[#141414] text-white text-sm font-semibold rounded-lg hover:bg-zinc-800 transition-colors cursor-pointer"
                >
                  Réessayer le paiement
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmitPayment} className="space-y-6">
                {/* Signed in user summary */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 sm:p-4 bg-[#F5F5F7] rounded-xl">
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-zinc-500">Compte Google vérifié</p>
                    <p className="text-sm font-semibold text-[#141414] truncate">
                      {user.displayName} · {user.email}
                    </p>
                  </div>
                  {siteSettings.enableCdfCurrency && (
                    <div className="inline-flex self-start sm:self-auto items-center p-1 bg-white rounded-lg border border-zinc-200 shrink-0">
                      {(['USD', 'CDF'] as const).map((code) => (
                        <button
                          key={code}
                          type="button"
                          onClick={() => onChangeCurrency(code)}
                          className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                            currency === code
                              ? 'bg-[#141414] text-white'
                              : 'text-zinc-600 hover:text-[#141414]'
                          }`}
                        >
                          {code}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Delivery details */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label
                      htmlFor="checkout-name"
                      className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-1.5"
                    >
                      Nom complet
                    </label>
                    <input
                      id="checkout-name"
                      type="text"
                      required
                      maxLength={80}
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className="w-full min-h-[44px] px-3.5 py-2.5 text-base sm:text-sm border border-zinc-300 rounded-lg focus:border-[#141414] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="checkout-phone"
                      className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-1.5"
                    >
                      Téléphone Mobile Money / Contact
                    </label>
                    <input
                      id="checkout-phone"
                      type="tel"
                      required
                      maxLength={30}
                      placeholder={siteSettings.contactPhone || '+243 81 000 0000'}
                      value={customerPhone}
                      onChange={(e) => handlePhoneChange(e.target.value)}
                      className="w-full min-h-[44px] px-3.5 py-2.5 text-base sm:text-sm border border-zinc-300 rounded-lg focus:border-[#141414] focus:outline-none font-mono"
                    />
                    {detectedNetwork && (
                      <p
                        key={detectedNetwork.provider}
                        className="ms-pop-in text-xs font-medium text-zinc-600 mt-1.5"
                      >
                        Réseau reconnu ·{' '}
                        <span className={`font-semibold ${detectedNetwork.accentClass}`}>
                          {detectedNetwork.brandName} ({detectedNetwork.prefix})
                        </span>
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="checkout-address"
                    className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-1.5"
                  >
                    {deliveryMode === 'pickup' ? 'Point de retrait' : 'Adresse de livraison'}
                  </label>
                  <input
                    id="checkout-address"
                    type="text"
                    required
                    maxLength={240}
                    readOnly={deliveryMode === 'pickup'}
                    placeholder="Commune, avenue, numéro et point de repère"
                    value={deliveryAddress}
                    onChange={(e) => setDeliveryAddress(e.target.value)}
                    className="w-full min-h-[44px] px-3.5 py-2.5 text-base sm:text-sm border border-zinc-300 rounded-lg focus:border-[#141414] focus:outline-none read-only:bg-[#F5F5F7]"
                  />

                  {deliveryMode === 'delivery' && (
                    <div className="mt-3 p-3.5 rounded-xl bg-[#F5F5F7] border border-zinc-200/80 space-y-2">
                      {sharedLocation ? (
                        <div className="ms-pop-in flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                          <div className="flex items-start gap-2.5 min-w-0">
                            <MapPin
                              className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5"
                              strokeWidth={2}
                            />
                            <div className="min-w-0">
                              <p className="text-xs font-semibold text-[#141414]">
                                Position GPS partagée avec le livreur
                              </p>
                              <p className="font-mono tabular-nums text-[11px] text-zinc-600 truncate">
                                {sharedLocation.lat.toFixed(5)}, {sharedLocation.lng.toFixed(5)} ·
                                Précision ±{sharedLocation.accuracy} m
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              type="button"
                              onClick={handleShareLocation}
                              disabled={locating}
                              className="px-2.5 py-1.5 min-h-[34px] text-xs font-semibold bg-white border border-zinc-200 rounded-lg text-[#141414] hover:border-zinc-400 transition-colors cursor-pointer disabled:opacity-50"
                            >
                              {locating ? 'Actualisation...' : 'Actualiser'}
                            </button>
                            <button
                              type="button"
                              onClick={() => setSharedLocation(null)}
                              className="px-2.5 py-1.5 min-h-[34px] text-xs font-semibold text-zinc-600 hover:text-[#D92323] transition-colors cursor-pointer"
                            >
                              Retirer
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                          <div className="flex items-start gap-2.5">
                            <MapPin
                              className="w-4 h-4 text-zinc-500 shrink-0 mt-0.5"
                              strokeWidth={2}
                            />
                            <div>
                              <p className="text-xs font-semibold text-[#141414]">
                                Partage de localisation (facultatif)
                              </p>
                              <p className="text-[11px] text-zinc-500">
                                Envoyez votre position GPS exacte pour guider le livreur sans
                                erreur.
                              </p>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={handleShareLocation}
                            disabled={locating}
                            className="inline-flex items-center justify-center gap-2 px-3.5 py-2 min-h-[40px] bg-white border border-zinc-300 text-xs font-semibold text-[#141414] rounded-lg hover:border-[#141414] hover:bg-zinc-50 transition-colors shrink-0 cursor-pointer disabled:opacity-60"
                          >
                            {locating ? (
                              <>
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                <span>Localisation...</span>
                              </>
                            ) : (
                              <>
                                <MapPin className="w-3.5 h-3.5 text-[#D92323]" />
                                <span>Partager ma position</span>
                              </>
                            )}
                          </button>
                        </div>
                      )}

                      {locationError && (
                        <p className="text-xs text-[#D92323] font-medium">{locationError}</p>
                      )}
                    </div>
                  )}
                </div>

                {/* Payment Method Selector (clean labels) */}
                <div className="space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                    Mode de règlement
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('MOBILEMONEY')}
                      className={`p-4 rounded-xl border text-left transition-colors flex items-start gap-3 cursor-pointer ${
                        paymentMethod === 'MOBILEMONEY'
                          ? 'border-[#141414] bg-[#141414] text-white'
                          : 'border-zinc-200 hover:border-zinc-400 text-[#141414]'
                      }`}
                    >
                      <Smartphone className="w-5 h-5 mt-0.5 shrink-0" strokeWidth={1.8} />
                      <div>
                        <p className="text-sm font-semibold">Mobile Money</p>
                        <p
                          className={`text-xs mt-0.5 ${
                            paymentMethod === 'MOBILEMONEY' ? 'text-zinc-300' : 'text-zinc-500'
                          }`}
                        >
                          M-Pesa, Airtel, Orange, Africell
                        </p>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPaymentMethod('CARD')}
                      className={`p-4 rounded-xl border text-left transition-colors flex items-start gap-3 cursor-pointer ${
                        paymentMethod === 'CARD'
                          ? 'border-[#141414] bg-[#141414] text-white'
                          : 'border-zinc-200 hover:border-zinc-400 text-[#141414]'
                      }`}
                    >
                      <CreditCard className="w-5 h-5 mt-0.5 shrink-0" strokeWidth={1.8} />
                      <div>
                        <p className="text-sm font-semibold">Carte Bancaire</p>
                        <p
                          className={`text-xs mt-0.5 ${
                            paymentMethod === 'CARD' ? 'text-zinc-300' : 'text-zinc-500'
                          }`}
                        >
                          Visa & Mastercard (3D Secure)
                        </p>
                      </div>
                    </button>
                  </div>

                  {paymentMethod === 'MOBILEMONEY' && (
                    <div className="space-y-2 pt-1">
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {MOBILE_PROVIDERS.map((prov) => {
                          const isSelected = mobileProvider === prov.id;
                          const isAutoMatched = detectedNetwork?.provider === prov.id;
                          return (
                            <button
                              key={prov.id}
                              type="button"
                              onClick={() => setMobileProvider(prov.id)}
                              className={`py-2.5 px-3 text-xs font-semibold rounded-lg border transition-all duration-200 cursor-pointer active:scale-[0.97] ${
                                isSelected
                                  ? 'border-[#D92323] bg-red-50 text-[#D92323] shadow-xs'
                                  : 'border-zinc-200 text-zinc-700 hover:border-zinc-300'
                              }`}
                            >
                              <span>{prov.label}</span>
                              {isAutoMatched && isSelected && (
                                <span className="block text-[10px] font-medium text-zinc-500 mt-0.5">
                                  Auto-détecté
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                      {detectedNetwork && detectedNetwork.provider !== mobileProvider && (
                        <p className="text-[11px] font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                          Le préfixe {detectedNetwork.prefix} correspond habituellement à{' '}
                          <span className="font-semibold">{detectedNetwork.brandName}</span>.
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {gatewayConfig && !gatewayConfig.configured && (
                  <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 leading-relaxed">
                    Configuration serveur de paiement requise dans les secrets d’environnement.
                  </div>
                )}

                {errorMessage && (
                  <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs text-[#D92323] font-medium flex items-start gap-2.5">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                {/* Order Total & Submit */}
                <div className="pt-4 border-t border-zinc-200 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <p className="text-xs text-zinc-500">
                        Total à régler ({currency})
                        {discountUsd > 0 && ` · Code ${promoCode} appliqué`}
                      </p>
                      <p className="font-mono tabular-nums text-xl font-bold text-[#141414]">
                        {formatMoney(totalUsd, currency, siteSettings.usdToCdfRate)}
                      </p>
                    </div>

                    <button
                      type="submit"
                      disabled={submitting}
                      className="ms-btn-glint px-6 py-3.5 min-h-[46px] bg-[#D92323] text-white text-sm font-semibold rounded-lg hover:bg-[#B81C1C] transition-colors inline-flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 active:scale-[0.98]"
                    >
                      {submitting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Traitement en cours...</span>
                        </>
                      ) : (
                        <>
                          <Lock className="w-4 h-4" />
                          <span>Confirmer et payer</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Single discreet partnership mention */}
                  <p className="text-[11px] text-zinc-400 flex items-center justify-center gap-1.5 pt-1">
                    <Lock className="w-3 h-3" />
                    <span>Paiement sécurisé avec MaishaPay</span>
                  </p>
                </div>
              </form>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
