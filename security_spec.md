# Firestore Security Specification & Hardened Red Team Audit

## 1. Data Invariants

1. **Orders Integrity**: An order document in `/orders/{orderId}` must have a valid Lebanese customer telephone, non-negative subtotal, non-negative discount bounded by subtotal, non-negative delivery fee and total, a recognized payment method (`cod`, `whish_money`, `store_pickup`, `omt_western_union`), valid currency (`USD`), valid payment status (`pending`, `paid`, `pay_on_delivery`), and valid fulfillment status (`new`, `confirmed`, `preparing`, `ready_for_delivery`, `out_for_delivery`, `dispatched`, `delivered`, `cancelled`, `returned`).
2. **Order Immutability**: Customers or non-admins cannot mutate order amounts, delivery fees, or item collections once created.
3. **Status Transitions**: State transitions from `delivered` or `cancelled` are terminal states that cannot be reverted by non-admin users.
4. **Products Reviews & Sold Count Integrity**: Public product documents in `/products/{productId}` enforce bounded `reviews` arrays (max 50), valid `rating` (`0-5`), non-negative `reviewCount`/`soldCount`, and strict key allowlists (`hasAll`/`hasOnly`).
4. **Admin Protection**: Admin records in `/admins/{adminUid}` can only be read by authenticated staff and can never be written or created by unauthenticated or non-admin clients (preventing self-promotion).
5. **Search Analytics**: Anonymous or client queries may write search events if conforming to payload size limits (terms <= 200 chars), but can only be read/analyzed by authenticated admins.
6. **Stock Notifications PII Isolation**: Out-of-stock alert requests in `/stock_notifications/{notificationId}` contain customer email addresses (`email`), target `productId`, and `status` (`pending` or `notified`). Only authenticated admins may `get`, `list`, `delete`, or transition `status` to `notified`. Public/anonymous users may only `create` valid requests with `status == 'pending'` and strict field allowlists (`hasAll`/`hasOnly`), or refresh their own `pending` metadata without mutating `email`, `productId`, or `status`.
7. **Dynamic Categories Integrity**: Storefront category records in `/categories/{categoryId}` contain zero PII, allow public read/list for homepage/navigation rendering, and enforce `isValidId` plus `isValidCategory` (`hasAll`/`hasOnly`, bounded strings/displayOrder, and bounded `subcategories` arrays) on every write.
8. **Immutable Admin Activity Logs**: Security & sensitive change audit records in `/admin_activity_logs/{logId}` are append-only (`allow update, delete: if false;`), strictly readable and creatable only by verified admins (`isAdmin()`), validated via `isValidId(logId)` + `isValidAdminActivityLog`, and never contain plaintext secrets or credentials.
9. **User Profiles Self-Promotion Prevention (`/users/{userId}`)**: Users may read and create/update only their own non-privileged profile (`role == 'customer'`, `permissions.size() == 0`), and cannot mutate `role`, `permissions`, `uid`, or `isActive`. Only verified admins (`isAdmin()`) may assign privileged roles (`super_admin`, `full_stock`).
10. **Inventory & Catalog Stock Protection (`/inventory/{inventoryId}` & `/products/{productId}`)**: While authenticated users may read `/inventory` and storefront visitors may read `/products`, `create`, `update`, and `delete` on `/inventory` and catalog/stock mutations on `/products` are strictly restricted to signed-in users whose Firestore `/users/{uid}` (or `/admins/{uid}`) profile holds `role == 'super_admin'`, `isActive != false`, and `'full_stock' in permissions`. Non-Super-Admin or non-Full-Stock callers receive `PERMISSION_DENIED`.

---

## 2. The "Dirty Dozen" Malicious Payloads

1. **Payload 1 (Ghost Field Injection / Shadow Update)**:
   Attempt to update an order with `isFreeOrder: true` or `bypassedPayment: true`.
   *Expected: REJECT (strict keys check).*

2. **Payload 2 (Order Amount Tampering)**:
   Attempt to update `total: 0` on an order worth $1249.
   *Expected: REJECT (immutable financial fields).*

3. **Payload 3 (Role Self-Assignment)**:
   Attempt to write to `/admins/{attackerUid}` with `{ role: "super_admin", email: "attacker@evil.com" }`.
   *Expected: REJECT (read-only for unprivileged users; only existing admins).*

4. **Payload 4 (Oversized Search Term Denial-of-Wallet Attack)**:
   Attempt to write search event with `term: "A".repeat(5000)`.
   *Expected: REJECT (maxLength 200 constraint).*

5. **Payload 5 (ID Injection Attack)**:
   Attempt to create document with 2KB junk character ID `../../root/etc`.
   *Expected: REJECT (`isValidId` regex guard).*

6. **Payload 6 (Invalid Payment Method Injection)**:
   Attempt to write order with `paymentMethod: "stolen_credit_card"`.
   *Expected: REJECT (enum restriction).*

7. **Payload 7 (Negative Price Manipulation)**:
   Attempt to create order with `total: -500`.
   *Expected: REJECT (boundary limit check `total >= 0`).*

8. **Payload 8 (Terminal Status Reversal)**:
   Attempt to change status from `delivered` back to `new`.
   *Expected: REJECT (terminal state lock).*

9. **Payload 9 (Unauthenticated Admin Access)**:
   Attempt to read `/admins` without auth tokens.
   *Expected: REJECT (auth gate).*

10. **Payload 10 (Spoofed User ID in Order)**:
    Attempt to create order with `userId: "victim_uid"` while authenticated as `"attacker_uid"`.
    *Expected: REJECT (identity integrity `userId == request.auth.uid`).*

11. **Payload 11 (Arbitrary List Query Scraping)**:
    Attempt to run blanket read on `/orders` without specifying ownership or admin credentials.
    *Expected: REJECT (query enforcer).*

12. **Payload 12 (Client-Forged Timestamp Manipulation)**:
    Attempt to set future timestamp `orderDate: "2099-01-01"`.
    *Expected: REJECT (temporal integrity check).*

---

## 3. Test Runner Invariant Assertions
All 12 adversarial test cases assert that the security rules return `PERMISSION_DENIED`.
