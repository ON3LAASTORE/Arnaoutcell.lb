# Firestore Security Specification & Hardened Red Team Audit

## 1. Data Invariants

1. **Orders Integrity**: An order document in `/orders/{orderId}` must have a valid Lebanese customer telephone, non-negative subtotal and total, a recognized payment method (`cod`, `whish_money`, `omt_western_union`), and initial status `new`.
2. **Order Immutability**: Customers or non-admins cannot mutate order amounts, delivery fees, or item collections once created.
3. **Status Transitions**: State transitions from `delivered` or `cancelled` are terminal states that cannot be reverted by non-admin users.
4. **Admin Protection**: Admin records in `/admins/{adminUid}` can only be read by authenticated staff and can never be written or created by unauthenticated or non-admin clients (preventing self-promotion).
5. **Search Analytics**: Anonymous or client queries may write search events if conforming to payload size limits (terms <= 200 chars), but can only be read/analyzed by authenticated admins.

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
