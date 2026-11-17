import { User } from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import type { MenuItem } from '../data/menu';
import { db, handleFirestoreError, OperationType } from '../firebase';
import type {
  CartItemDoc,
  OrderDoc,
  OrderStatusType,
  PaymentStatusType,
  ProductDoc,
  UserProfileDoc,
} from '../types/ecommerce';

export function sanitizeId(raw: string, maxLen = 64): string {
  const cleaned = raw.replace(/[^a-zA-Z0-9_-]/g, '_');
  return cleaned.slice(0, maxLen) || 'item_1';
}

// ==========================================
// PRODUCTS CATALOG (PUBLIC READ, ADMIN WRITE)
// ==========================================

export function subscribeProducts(onData: (products: ProductDoc[]) => void): () => void {
  const path = 'products';
  const q = query(collection(db, 'products'), orderBy('category', 'asc'));
  return onSnapshot(
    q,
    (snap) => {
      const list = snap.docs.map((d) => d.data() as ProductDoc);
      onData(list);
    },
    (err) => {
      handleFirestoreError(err, OperationType.LIST, path);
    }
  );
}

export async function upsertProduct(
  product: Omit<ProductDoc, 'createdAt' | 'updatedAt'>,
  isNew: boolean
): Promise<void> {
  const cleanId = sanitizeId(product.id, 64);
  const path = `products/${cleanId}`;
  const ref = doc(db, 'products', cleanId);
  try {
    const cleanAddons = product.addons.slice(0, 10).map((a) => ({
      id: sanitizeId(a.id, 40),
      label: a.label.trim().slice(0, 80),
      priceUsd: Number(a.priceUsd.toFixed(2)),
    }));

    const payload: Record<string, unknown> = {
      id: cleanId,
      name: product.name.trim().slice(0, 100),
      category: product.category,
      categoryLabel: product.categoryLabel.trim().slice(0, 50),
      calories: product.calories.trim().slice(0, 30),
      description: product.description.trim().slice(0, 400),
      priceUsd: Number(Math.max(0.5, Math.min(500, product.priceUsd)).toFixed(2)),
      image: product.image.trim().slice(0, 240),
      available: Boolean(product.available),
      supportsCombo: Boolean(product.supportsCombo),
      comboExtraUsd: Number(Math.max(0, Math.min(50, product.comboExtraUsd)).toFixed(2)),
      addons: cleanAddons,
      updatedAt: serverTimestamp(),
    };

    payload.tag = product.tag ? product.tag.trim().slice(0, 30) : '';

    if (isNew) {
      payload.createdAt = serverTimestamp();
      await setDoc(ref, payload);
    } else {
      const existing = await getDoc(ref);
      if (!existing.exists()) {
        payload.createdAt = serverTimestamp();
        await setDoc(ref, payload);
      } else {
        await updateDoc(ref, payload);
      }
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function deleteProduct(productId: string): Promise<void> {
  const cleanId = sanitizeId(productId, 64);
  const path = `products/${cleanId}`;
  try {
    await deleteDoc(doc(db, 'products', cleanId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

export async function seedCatalogToFirestore(items: MenuItem[]): Promise<void> {
  const path = 'products';
  try {
    const existingSnap = await getDocs(collection(db, 'products'));
    const existingIds = new Set(existingSnap.docs.map((d) => d.id));
    const batch = writeBatch(db);
    let pendingCount = 0;

    for (const item of items) {
      const cleanId = sanitizeId(item.id, 64);
      if (existingIds.has(cleanId)) {
        continue;
      }
      const ref = doc(db, 'products', cleanId);
      const docData: Record<string, unknown> = {
        id: cleanId,
        name: item.name.slice(0, 100),
        category: item.category,
        categoryLabel: item.categoryLabel.slice(0, 50),
        calories: item.calories.slice(0, 30),
        description: item.description.slice(0, 400),
        priceUsd: Number(item.priceUsd.toFixed(2)),
        image: item.image.slice(0, 240),
        available: item.available,
        supportsCombo: item.supportsCombo,
        comboExtraUsd: Number(item.comboExtraUsd.toFixed(2)),
        addons: item.addons.slice(0, 10).map((a) => ({
          id: sanitizeId(a.id, 40),
          label: a.label.trim().slice(0, 80),
          priceUsd: Number(a.priceUsd.toFixed(2)),
        })),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      if (item.tag) {
        docData.tag = item.tag.slice(0, 30);
      }
      batch.set(ref, docData);
      pendingCount++;
    }

    if (pendingCount > 0) {
      await batch.commit();
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

// ==========================================
// USER PROFILE
// ==========================================

export async function ensureUserProfile(user: User): Promise<void> {
  const path = `users/${user.uid}`;
  const ref = doc(db, 'users', user.uid);
  try {
    const snap = await getDoc(ref);
    const displayName = (user.displayName || user.email?.split('@')[0] || 'Client').slice(0, 80);
    const email = (user.email || 'client@maisonsmash.com').slice(0, 160);

    if (!snap.exists()) {
      await setDoc(ref, {
        uid: user.uid,
        displayName,
        email,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      await updateDoc(ref, {
        displayName,
        email,
        updatedAt: serverTimestamp(),
      });
    }
  } catch (err) {
    const code =
      typeof err === 'object' && err !== null && 'code' in err
        ? String((err as { code?: unknown }).code)
        : '';
    const msg = err instanceof Error ? err.message : String(err);
    if (code === 'unavailable' || msg.toLowerCase().includes('offline')) {
      console.warn('Firestore hors ligne temporaire lors de la synchronisation du profil.');
      return;
    }
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function updateUserDeliveryProfile(
  uid: string,
  payload: {
    displayName: string;
    email: string;
    phone: string;
    defaultAddress: string;
    defaultCity: string;
  }
): Promise<void> {
  const path = `users/${uid}`;
  const ref = doc(db, 'users', uid);
  try {
    await updateDoc(ref, {
      displayName: payload.displayName.trim().slice(0, 80),
      email: payload.email.trim().slice(0, 160),
      phone: payload.phone.trim().slice(0, 30),
      defaultAddress: payload.defaultAddress.trim().slice(0, 240),
      defaultCity: payload.defaultCity.trim().slice(0, 80),
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

export function subscribeUserProfile(
  uid: string,
  onData: (profile: UserProfileDoc | null) => void
): () => void {
  const path = `users/${uid}`;
  return onSnapshot(
    doc(db, 'users', uid),
    (snap) => {
      onData(snap.exists() ? (snap.data() as UserProfileDoc) : null);
    },
    (err) => {
      handleFirestoreError(err, OperationType.GET, path);
    }
  );
}

// ==========================================
// CART
// ==========================================

export function subscribeUserCart(
  uid: string,
  onData: (items: CartItemDoc[]) => void
): () => void {
  const path = `users/${uid}/cart`;
  const q = query(collection(db, 'users', uid, 'cart'), orderBy('updatedAt', 'desc'));
  return onSnapshot(
    q,
    (snap) => {
      const list = snap.docs.map((d) => d.data() as CartItemDoc);
      onData(list);
    },
    (err) => {
      handleFirestoreError(err, OperationType.LIST, path);
    }
  );
}

export async function upsertCartItem(uid: string, item: CartItemDoc): Promise<void> {
  const itemId = sanitizeId(item.id, 64);
  const path = `users/${uid}/cart/${itemId}`;
  const ref = doc(db, 'users', uid, 'cart', itemId);
  try {
    const cleanAddons = item.addons.slice(0, 8).map((a) => a.slice(0, 80));
    const docPayload: Record<string, unknown> = {
      id: itemId,
      userId: uid,
      productId: sanitizeId(item.productId, 64),
      productName: item.productName.slice(0, 100),
      unitPriceUsd: Number(item.unitPriceUsd.toFixed(2)),
      quantity: Math.max(1, Math.min(50, Math.round(item.quantity))),
      variant: item.variant,
      addons: cleanAddons,
      image: item.image.slice(0, 240),
      updatedAt: serverTimestamp(),
    };
    if (item.notes && item.notes.trim().length > 0) {
      docPayload.notes = item.notes.trim().slice(0, 180);
    }
    await setDoc(ref, docPayload);
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function updateCartItemQty(
  uid: string,
  itemId: string,
  quantity: number
): Promise<void> {
  const cleanId = sanitizeId(itemId, 64);
  const path = `users/${uid}/cart/${cleanId}`;
  const ref = doc(db, 'users', uid, 'cart', cleanId);
  try {
    await updateDoc(ref, {
      quantity: Math.max(1, Math.min(50, Math.round(quantity))),
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

export async function removeCartItem(uid: string, itemId: string): Promise<void> {
  const cleanId = sanitizeId(itemId, 64);
  const path = `users/${uid}/cart/${cleanId}`;
  try {
    await deleteDoc(doc(db, 'users', uid, 'cart', cleanId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

export async function clearUserCart(uid: string, itemIds: string[]): Promise<void> {
  if (itemIds.length === 0) return;
  const path = `users/${uid}/cart`;
  try {
    const batch = writeBatch(db);
    itemIds.forEach((id) => {
      batch.delete(doc(db, 'users', uid, 'cart', sanitizeId(id, 64)));
    });
    await batch.commit();
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

// ==========================================
// ORDERS (CUSTOMER + ADMIN)
// ==========================================

export async function createOrderRecord(
  order: Omit<OrderDoc, 'createdAt' | 'updatedAt'>
): Promise<void> {
  const orderId = sanitizeId(order.id, 64);
  const path = `orders/${orderId}`;
  try {
    const payload: Record<string, unknown> = {
      id: orderId,
      userId: order.userId,
      customerName: order.customerName.trim().slice(0, 80),
      customerEmail: order.customerEmail.trim().slice(0, 160),
      customerPhone: order.customerPhone.trim().slice(0, 30),
      deliveryMode: order.deliveryMode,
      deliveryAddress: order.deliveryAddress.trim().slice(0, 240),
      currency: order.currency,
      subtotalUsd: Number(order.subtotalUsd.toFixed(2)),
      deliveryFeeUsd: Number(order.deliveryFeeUsd.toFixed(2)),
      totalAmount: order.totalAmount,
      paymentMethod: order.paymentMethod,
      paymentProvider: order.paymentProvider,
      transactionReference: sanitizeId(order.transactionReference, 80),
      itemsSummary: order.itemsSummary.slice(0, 30).map((line) => line.slice(0, 200)),
      paymentStatus: 'PENDING',
      orderStatus: 'AWAITING_PAYMENT',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    if (
      typeof order.deliveryLat === 'number' &&
      Number.isFinite(order.deliveryLat) &&
      order.deliveryLat >= -90 &&
      order.deliveryLat <= 90 &&
      typeof order.deliveryLng === 'number' &&
      Number.isFinite(order.deliveryLng) &&
      order.deliveryLng >= -180 &&
      order.deliveryLng <= 180
    ) {
      payload.deliveryLat = Number(order.deliveryLat.toFixed(6));
      payload.deliveryLng = Number(order.deliveryLng.toFixed(6));
      if (
        typeof order.deliveryAccuracy === 'number' &&
        Number.isFinite(order.deliveryAccuracy) &&
        order.deliveryAccuracy >= 0
      ) {
        payload.deliveryAccuracy = Math.min(50000, Math.round(order.deliveryAccuracy));
      }
    }
    if (typeof order.discountUsd === 'number' && order.discountUsd > 0) {
      payload.discountUsd = Number(order.discountUsd.toFixed(2));
    }
    if (order.promoCode && order.promoCode.trim().length > 0) {
      payload.promoCode = order.promoCode.trim().slice(0, 24);
    }

    await setDoc(doc(db, 'orders', orderId), payload);
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }
}

export async function updateOrderPaymentState(
  orderId: string,
  paymentStatus: PaymentStatusType,
  orderStatus: OrderStatusType
): Promise<void> {
  const cleanId = sanitizeId(orderId, 64);
  const path = `orders/${cleanId}`;
  try {
    await updateDoc(doc(db, 'orders', cleanId), {
      paymentStatus,
      orderStatus,
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

export function subscribeUserOrders(
  uid: string,
  onData: (orders: OrderDoc[]) => void
): () => void {
  const path = 'orders';
  const q = query(
    collection(db, 'orders'),
    where('userId', '==', uid),
    orderBy('createdAt', 'desc')
  );
  return onSnapshot(
    q,
    (snap) => {
      onData(snap.docs.map((d) => d.data() as OrderDoc));
    },
    (err) => {
      handleFirestoreError(err, OperationType.LIST, path);
    }
  );
}

export function subscribeAllOrdersForAdmin(onData: (orders: OrderDoc[]) => void): () => void {
  const path = 'orders';
  const q = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));
  return onSnapshot(
    q,
    (snap) => {
      onData(snap.docs.map((d) => d.data() as OrderDoc));
    },
    (err) => {
      handleFirestoreError(err, OperationType.LIST, path);
    }
  );
}
