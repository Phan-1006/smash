# Security Specification & Payload-First TDD — Maison Smash

## 1. Data Invariants
1. **Identity & PII Isolation**: A `UserProfile` at `/users/{userId}` can only be read, created, or updated by the authenticated, email-verified user whose `request.auth.uid == userId` and `incoming().uid == userId`. No user can list `/users`.
2. **Cart Ownership (Master Gate)**: A `CartItem` at `/users/{userId}/cart/{itemId}` belongs exclusively to `{userId}`. Reads, lists, creates, updates, and deletes require `request.auth.uid == userId`, verified email, valid ID format, and bounded array/string sizes.
3. **Order Integrity & Terminal State Locking**: An `Order` at `/orders/{orderId}` can only be created by an authenticated, email-verified user setting `userId == request.auth.uid`, `paymentStatus == 'PENDING'`, and `orderStatus == 'AWAITING_PAYMENT'`, with server timestamps (`request.time`). List queries are strictly enforced via `resource.data.userId == request.auth.uid`. Once `orderStatus` reaches `'DELIVERED'` or `'CANCELLED'`, all further client updates are denied.
4. **Storefront Settings Governance**: `SiteSettings` at `/site_settings/main` is publicly gettable (no blanket listing) so all shoppers see customized address/branding/posters, while `create` and `update` require verified `isAdmin()` with strict field schema/length bounds and server `request.time`. Deletes and arbitrary doc IDs (`settingId != 'main'`) are denied.

## 2. The "Dirty Dozen" Attack Payloads
1. **Unauthenticated Order Creation**: `{ "id": "ord_1", "userId": "anon", ... }` -> `PERMISSION_DENIED` (`isSignedIn()`).
2. **Identity Spoofing on Order**: Authenticated as `userA`, sending `{ "userId": "userB", ... }` -> `PERMISSION_DENIED` (`data.userId == request.auth.uid`).
3. **Pre-Paid Order Bypass**: Creating an order with `paymentStatus: "PAID"` and `orderStatus: "PREPARING"` directly from client -> `PERMISSION_DENIED` (create enforces `PENDING` / `AWAITING_PAYMENT`).
4. **Shadow Field Injection on Profile**: Creating `/users/userA` with extra ghost key `"isAdmin": true` -> `PERMISSION_DENIED` (`hasOnly` check).
5. **Unverified Email Bypass**: Authenticated user with `email_verified == false` attempting to create an order -> `PERMISSION_DENIED`.
6. **ID Poisoning**: Creating `/orders/invalid$id!with*1500chars...` -> `PERMISSION_DENIED` (`isValidId(orderId)`).
7. **Timestamp Forgery**: Creating an order with backdated `createdAt` instead of `request.time` -> `PERMISSION_DENIED`.
8. **Cross-User Cart Read/Write**: `userA` reading `/users/userB/cart/item1` -> `PERMISSION_DENIED`.
9. **Blanket Order List Scraping**: `userA` executing `getDocs(collection(db, 'orders'))` without `where('userId', '==', 'userA')` -> `PERMISSION_DENIED` (`allow list` evaluates `resource.data.userId == request.auth.uid`).
10. **Terminal State Resurrection**: Updating an order whose `orderStatus == 'CANCELLED'` back to `'PREPARING'` -> `PERMISSION_DENIED`.
11. **Value Poisoning on Update**: Updating `paymentStatus` to `12345` (number) or invalid string `'HACKED'` -> `PERMISSION_DENIED` (`isValidOrder` runs on update).
12. **Unbounded Array / Denial-of-Wallet**: Submitting `itemsSummary` with 100 entries or a 10KB string -> `PERMISSION_DENIED`.
13. **Non-Admin SiteSettings Tampering**: Authenticated customer attempting to write `/site_settings/main` or inject oversized image base64 (>240 chars) -> `PERMISSION_DENIED`.

