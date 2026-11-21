import { useEffect, useState } from 'react';
import { User } from 'firebase/auth';
import { Check, Loader2, LogOut, MapPin, RefreshCw, ShieldCheck, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { updateOrderPaymentState, updateUserDeliveryProfile } from '../services/storefrontService';
import { isAdminUser, OrderDoc, UserProfileDoc } from '../types/ecommerce';
import { apiUrl, parseJsonSafe } from '../utils/api';
import { detectCongoleseMobileNetwork } from '../utils/mobileNetwork';

interface OrdersPanelProps {
  open: boolean;
  user: User | null;
  profile: UserProfileDoc | null;
  orders: OrderDoc[];
  defaultCity?: string;
  contactPhonePlaceholder?: string;
  onClose: () => void;
  onOpenAdmin: () => void;
  onSignInGoogle: () => Promise<string | null>;
  onSignOut: () => Promise<void>;
}

const ORDER_STATUS_LABELS: Record<OrderDoc['orderStatus'], string> = {
  AWAITING_PAYMENT: 'Paiement en attente',
  PREPARING: 'En préparation',
  READY: 'Prête au comptoir',
  DELIVERING: 'En cours de livraison',
  DELIVERED: 'Livrée',
  CANCELLED: 'Annulée',
};

const PAYMENT_STATUS_LABELS: Record<OrderDoc['paymentStatus'], string> = {
  PENDING: 'En attente',
  PAID: 'Payé',
  FAILED: 'Échoué',
};

export function OrdersPanel({
  open,
  user,
  profile,
  orders,
  defaultCity = 'Kinshasa, Gombe',
  contactPhonePlaceholder = '+243 81 000 0000',
  onClose,
  onOpenAdmin,
  onSignInGoogle,
  onSignOut,
}: OrdersPanelProps) {
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState(defaultCity);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savedNotice, setSavedNotice] = useState(false);
  const [checkingRef, setCheckingRef] = useState<string | null>(null);
  const [authBusy, setAuthBusy] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    if (profile) {
      setPhone(profile.phone || '');
      setAddress(profile.defaultAddress || '');
      setCity(profile.defaultCity || defaultCity);
    } else {
      setCity(defaultCity);
    }
  }, [profile, defaultCity]);

  if (!open) return null;

  const admin = isAdminUser(user);
  const detectedNetwork = detectCongoleseMobileNetwork(phone);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSavingProfile(true);
    setSavedNotice(false);
    try {
      await updateUserDeliveryProfile(user.uid, {
        displayName: user.displayName || profile?.displayName || 'Client',
        email: user.email || profile?.email || '',
        phone,
        defaultAddress: address,
        defaultCity: city,
      });
      setSavedNotice(true);
      window.setTimeout(() => setSavedNotice(false), 2500);
    } finally {
      setSavingProfile(false);
    }
  };

  const handleVerifyPayment = async (order: OrderDoc) => {
    setCheckingRef(order.id);
    try {
      const res = await fetch(
        apiUrl(`/api/payments/maishapay/status/${encodeURIComponent(order.transactionReference)}`)
      );
      if (!res.ok) return;
      const data = await parseJsonSafe<{ status: 'PENDING' | 'PAID' | 'FAILED' }>(res);
      if (!data) return;
      if (data.status === 'PAID') {
        await updateOrderPaymentState(order.id, 'PAID', 'PREPARING');
      } else if (data.status === 'FAILED') {
        await updateOrderPaymentState(order.id, 'FAILED', 'CANCELLED');
      }
    } finally {
      setCheckingRef(null);
    }
  };

  const handleCancelUnpaid = async (order: OrderDoc) => {
    await updateOrderPaymentState(order.id, 'PENDING', 'CANCELLED');
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex justify-end">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/45 backdrop-blur-xs"
        />

        <motion.aside
          role="dialog"
          aria-modal="true"
          aria-label="Mon compte et mes commandes"
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          className="relative z-10 w-full max-w-lg bg-white h-[100dvh] flex flex-col shadow-2xl border-l border-zinc-200"
        >
          <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-zinc-200 flex items-center justify-between gap-4 shrink-0">
            <h2 className="font-display text-lg sm:text-xl font-extrabold text-[#141414]">
              Compte & Commandes
            </h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Fermer"
              className="p-2.5 min-w-[44px] min-h-[44px] inline-flex items-center justify-center text-zinc-500 hover:text-[#141414] hover:bg-[#F5F5F7] rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" strokeWidth={2} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 sm:space-y-8">
            {!user ? (
              <div className="bg-[#F5F5F7] rounded-2xl p-6 text-center space-y-4">
                <h3 className="font-display text-lg font-bold text-[#141414]">
                  Connectez-vous avec Google
                </h3>
                <p className="text-sm text-zinc-600">
                  Retrouvez vos adresses enregistrées, votre panier synchronisé et le suivi en
                  direct de vos commandes.
                </p>
                <button
                  type="button"
                  disabled={authBusy}
                  onClick={async () => {
                    if (authBusy) return;
                    setAuthBusy(true);
                    setAuthError(null);
                    try {
                      const errMsg = await onSignInGoogle();
                      if (errMsg) setAuthError(errMsg);
                    } finally {
                      setAuthBusy(false);
                    }
                  }}
                  className="inline-flex items-center justify-center gap-2 px-5 py-3 min-h-[44px] bg-[#141414] text-white text-sm font-semibold rounded-lg hover:bg-zinc-800 transition-colors cursor-pointer disabled:opacity-50"
                >
                  {authBusy && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>Se connecter avec Google</span>
                </button>
                {authError && <p className="text-xs text-[#D92323] font-medium">{authError}</p>}
              </div>
            ) : (
              <>
                {/* Google Profile Card */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-4 p-4 bg-[#F5F5F7] rounded-2xl">
                    <div className="flex items-center gap-3.5 min-w-0">
                      {user.photoURL ? (
                        <img
                          src={user.photoURL}
                          alt={user.displayName || 'Profil'}
                          referrerPolicy="no-referrer"
                          className="w-11 h-11 rounded-full object-cover shrink-0"
                        />
                      ) : (
                        <div className="w-11 h-11 rounded-full bg-[#141414] text-white flex items-center justify-center font-display font-bold shrink-0">
                          {(user.displayName || 'U')[0]}
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="font-display text-sm font-bold text-[#141414] truncate">
                          {user.displayName}
                        </p>
                        <p className="text-xs text-zinc-600 truncate">{user.email}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={onSignOut}
                      className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-zinc-700 hover:text-[#D92323] hover:bg-white rounded-lg transition-colors shrink-0 cursor-pointer"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Déconnexion</span>
                    </button>
                  </div>

                  {admin && (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onOpenAdmin();
                      }}
                      className="w-full py-3 px-4 bg-[#141414] text-white text-xs font-semibold rounded-xl hover:bg-[#D92323] transition-colors flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <ShieldCheck className="w-4 h-4" />
                      <span>Ouvrir le Panel Admin (Produits & Commandes)</span>
                    </button>
                  )}
                </div>

                {/* Delivery Preferences Form */}
                <form onSubmit={handleSaveProfile} className="space-y-4">
                  <h3 className="font-display text-sm font-bold uppercase tracking-wider text-zinc-500">
                    Coordonnées de livraison
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <input
                        type="tel"
                        maxLength={30}
                        placeholder={`Téléphone (${contactPhonePlaceholder})`}
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="w-full min-h-[44px] px-3.5 py-2.5 text-base sm:text-sm border border-zinc-200 rounded-lg focus:border-[#141414] focus:outline-none font-mono"
                      />
                      {detectedNetwork && (
                        <p
                          key={detectedNetwork.provider}
                          className="ms-pop-in text-xs font-medium text-zinc-600 mt-1"
                        >
                          Réseau :{' '}
                          <span className={`font-semibold ${detectedNetwork.accentClass}`}>
                            {detectedNetwork.brandName}
                          </span>
                        </p>
                      )}
                    </div>
                    <input
                      type="text"
                      maxLength={80}
                      placeholder="Ville"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className="min-h-[44px] px-3.5 py-2.5 text-base sm:text-sm border border-zinc-200 rounded-lg focus:border-[#141414] focus:outline-none self-start"
                    />
                  </div>
                  <input
                    type="text"
                    maxLength={240}
                    placeholder="Adresse de livraison par défaut"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full min-h-[44px] px-3.5 py-2.5 text-base sm:text-sm border border-zinc-200 rounded-lg focus:border-[#141414] focus:outline-none"
                  />
                  <div className="flex items-center justify-between">
                    <button
                      type="submit"
                      disabled={savingProfile}
                      className="px-4 py-2 bg-[#141414] text-white text-xs font-semibold rounded-lg hover:bg-zinc-800 transition-colors inline-flex items-center gap-2 cursor-pointer disabled:opacity-60"
                    >
                      {savingProfile && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                      <span>Enregistrer</span>
                    </button>
                    {savedNotice && (
                      <span className="text-xs font-medium text-emerald-700 inline-flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" /> Enregistré
                      </span>
                    )}
                  </div>
                </form>

                {/* Orders History */}
                <div className="space-y-4">
                  <h3 className="font-display text-sm font-bold uppercase tracking-wider text-zinc-500">
                    Historique des commandes ({orders.length})
                  </h3>

                  {orders.length === 0 ? (
                    <p className="text-sm text-zinc-500 py-6 border border-dashed border-zinc-200 rounded-xl text-center">
                      Aucune commande passée pour le moment.
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {orders.map((order) => (
                        <div
                          key={order.id}
                          className="border border-zinc-200 rounded-xl p-4 space-y-3"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="font-mono text-xs text-zinc-500">
                                {order.transactionReference}
                              </p>
                              <p className="font-display text-sm font-bold text-[#141414] mt-0.5">
                                {ORDER_STATUS_LABELS[order.orderStatus]}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="font-mono tabular-nums text-sm font-bold text-[#141414]">
                                {order.currency === 'CDF'
                                  ? `${order.totalAmount.toLocaleString('fr-FR')} FC`
                                  : `$${order.totalAmount.toFixed(2)}`}
                              </p>
                              <p
                                className={`text-xs font-semibold ${
                                  order.paymentStatus === 'PAID'
                                    ? 'text-emerald-700'
                                    : order.paymentStatus === 'FAILED'
                                    ? 'text-[#D92323]'
                                    : 'text-amber-700'
                                }`}
                              >
                                {order.paymentProvider} · {PAYMENT_STATUS_LABELS[order.paymentStatus]}
                              </p>
                            </div>
                          </div>

                          <ul className="text-xs text-zinc-600 space-y-1 border-t border-zinc-100 pt-2.5">
                            {order.itemsSummary.map((line, idx) => (
                              <li key={idx}>{line}</li>
                            ))}
                          </ul>

                          {typeof order.deliveryLat === 'number' &&
                            typeof order.deliveryLng === 'number' && (
                              <p className="text-xs text-zinc-500 inline-flex items-center gap-1.5">
                                <MapPin className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                                <span>
                                  Position GPS transmise (
                                  <span className="font-mono tabular-nums">
                                    {order.deliveryLat.toFixed(5)}, {order.deliveryLng.toFixed(5)}
                                  </span>
                                  )
                                </span>
                              </p>
                            )}

                          {order.paymentStatus === 'PENDING' && order.orderStatus !== 'CANCELLED' && (
                            <div className="pt-2 border-t border-zinc-100 flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => handleVerifyPayment(order)}
                                disabled={checkingRef === order.id}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-[#F5F5F7] text-[#141414] rounded-lg hover:bg-zinc-200 transition-colors cursor-pointer"
                              >
                                <RefreshCw
                                  className={`w-3 h-3 ${checkingRef === order.id ? 'animate-spin' : ''}`}
                                />
                                <span>Actualiser statut</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleCancelUnpaid(order)}
                                className="px-3 py-1.5 text-xs font-semibold text-zinc-500 hover:text-[#D92323] cursor-pointer"
                              >
                                Annuler
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </motion.aside>
      </div>
    </AnimatePresence>
  );
}
