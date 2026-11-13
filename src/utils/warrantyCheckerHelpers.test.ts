import test from 'node:test';
import assert from 'node:assert/strict';
import {
  addWarrantyMonths,
  calculateWarrantyPeriod,
  evaluateOrderWarranty,
  evaluateSerialWarranty,
  isValidFirestoreDocId,
  normalizeLookupQuery,
  resolveOrderWarrantyStartDate,
  SAMPLE_WARRANTY_LOOKUPS,
} from './warrantyCheckerHelpers';
import { Order, Product } from '../types';

const SAMPLE_PRODUCT: Product = {
  id: 'prod-iphone16promax',
  name: 'Apple iPhone 16 Pro Max 256GB Desert Titanium',
  nameAr: 'أبل آيفون 16 برو ماكس 256 جيجابايت',
  brand: 'Apple',
  category: 'Phones',
  sku: 'APL-IP16PM-256',
  barcode: '195949038221',
  originalPrice: 1399,
  price: 1249,
  stock: 10,
  images: ['https://example.com/iphone.jpg'],
  description: 'Flagship phone',
  specifications: [],
  warrantyMonths: 12,
  warrantyTerms: 'Official 1-Year Apple warranty with ON AlAA STORE support.',
  isPublished: true,
  rating: 5,
  reviewCount: 0,
  createdAt: '2026-09-15',
};

const DELIVERED_ORDER: Order = {
  id: 'OAA-2027-1001',
  customer: {
    fullName: 'Sami Khoury',
    phone: '03 123 456',
    cityArea: 'Chouf',
    addressLine: 'Main Road',
  },
  items: [
    {
      productId: 'prod-iphone16promax',
      productName: 'Apple iPhone 16 Pro Max 256GB Desert Titanium',
      brand: 'Apple',
      price: 1249,
      quantity: 1,
      image: 'https://example.com/iphone.jpg',
    },
  ],
  subtotal: 1249,
  discount: 0,
  deliveryFee: 2,
  total: 1251,
  currency: 'USD',
  status: 'delivered',
  paymentMethod: 'cod',
  paymentStatus: 'paid',
  orderDate: '2026-10-10T14:20:00Z',
  statusHistory: [
    { status: 'new', timestamp: '2026-10-10T14:20:00Z' },
    { status: 'delivered', timestamp: '2026-10-10T17:10:00Z', note: 'Delivered in Chouf' },
  ],
};

test('normalizeLookupQuery trims whitespace, strips leading hashes, and validates Firestore IDs', () => {
  assert.equal(normalizeLookupQuery('  #OAA-2027-1001  '), 'OAA-2027-1001');
  assert.equal(isValidFirestoreDocId('OAA-2027-1001'), true);
  assert.equal(isValidFirestoreDocId('SN 123/456'), false);
  assert.equal(isValidFirestoreDocId(''), false);
});

test('addWarrantyMonths safely handles month-end clamping and leap years', () => {
  const jan31Plus1 = addWarrantyMonths('2026-01-31T00:00:00Z', 1);
  assert.equal(jan31Plus1.toISOString().slice(0, 10), '2026-02-28');

  const leapPlus12 = addWarrantyMonths('2024-02-29T00:00:00Z', 12);
  assert.equal(leapPlus12.toISOString().slice(0, 10), '2025-02-28');
});

test('calculateWarrantyPeriod classifies active, expiring_soon, expired, pending_activation, and cancelled_void accurately', () => {
  const now = new Date('2026-11-13T12:00:00Z');

  // Active (> 30 days remaining)
  const active = calculateWarrantyPeriod({
    startDateIso: '2026-10-10T17:10:00Z',
    warrantyMonths: 12,
    nowDate: now,
    orderStatus: 'delivered',
  });
  assert.equal(active.status, 'active');
  assert.ok(active.remainingDays > 300);
  assert.ok(active.percentRemaining > 80 && active.percentRemaining <= 100);

  // Expiring soon (<= 30 days left)
  const expiringSoon = calculateWarrantyPeriod({
    startDateIso: '2025-12-01T00:00:00Z',
    warrantyMonths: 12,
    nowDate: now,
    orderStatus: 'delivered',
  });
  assert.equal(expiringSoon.status, 'expiring_soon');
  assert.ok(expiringSoon.remainingDays > 0 && expiringSoon.remainingDays <= 30);

  // Expired
  const expired = calculateWarrantyPeriod({
    startDateIso: '2024-01-01T00:00:00Z',
    warrantyMonths: 12,
    nowDate: now,
    orderStatus: 'delivered',
  });
  assert.equal(expired.status, 'expired');
  assert.equal(expired.remainingDays, 0);
  assert.equal(expired.percentRemaining, 0);

  // Pending activation before delivery
  const pending = calculateWarrantyPeriod({
    startDateIso: '2026-10-14T09:15:00Z',
    warrantyMonths: 18,
    nowDate: now,
    orderStatus: 'out_for_delivery',
  });
  assert.equal(pending.status, 'pending_activation');
  assert.equal(pending.expiryDateIso, null);

  // Cancelled or returned order
  const cancelled = calculateWarrantyPeriod({
    startDateIso: '2026-10-10T14:20:00Z',
    warrantyMonths: 12,
    nowDate: now,
    orderStatus: 'cancelled',
  });
  assert.equal(cancelled.status, 'cancelled_void');
  assert.equal(cancelled.remainingDays, 0);
});

test('resolveOrderWarrantyStartDate prefers delivered timestamp over initial orderDate', () => {
  const res = resolveOrderWarrantyStartDate(DELIVERED_ORDER);
  assert.equal(res.source, 'delivered');
  assert.equal(res.dateIso, '2026-10-10T17:10:00Z');
});

test('evaluateOrderWarranty computes item warranty period from matched catalog product', () => {
  const now = new Date('2026-11-13T12:00:00Z');
  const result = evaluateOrderWarranty(DELIVERED_ORDER, [SAMPLE_PRODUCT], 'firestore', now);

  assert.equal(result.matchType, 'order_id');
  assert.equal(result.dataSource, 'firestore');
  assert.equal(result.items.length, 1);
  assert.equal(result.items[0].calculation.warrantyMonths, 12);
  assert.equal(result.items[0].calculation.status, 'active');
  assert.equal(result.items[0].barcode, '195949038221');
});

test('evaluateSerialWarranty supports catalog coverage preview and custom purchase date estimation', () => {
  const now = new Date('2026-11-13T12:00:00Z');

  const catalogOnly = evaluateSerialWarranty({
    query: '195949038221',
    product: SAMPLE_PRODUCT,
    matchType: 'serial_barcode',
    dataSource: 'firestore',
    nowDate: now,
  });
  assert.equal(catalogOnly.coverageStartSource, 'catalog_policy');
  assert.equal(catalogOnly.items[0].calculation.status, 'coverage_info_only');

  const withCustomDate = evaluateSerialWarranty({
    query: '195949038221',
    product: SAMPLE_PRODUCT,
    matchType: 'serial_barcode',
    dataSource: 'firestore',
    customPurchaseDateIso: '2026-06-01',
    nowDate: now,
  });
  assert.equal(withCustomDate.coverageStartSource, 'custom_purchase_date');
  assert.equal(withCustomDate.items[0].calculation.status, 'active');
  assert.ok(withCustomDate.items[0].calculation.remainingDays > 180);
});

test('SAMPLE_WARRANTY_LOOKUPS exposes Valid, Expired, Claimed, and Serial sample entries', () => {
  assert.ok(SAMPLE_WARRANTY_LOOKUPS.length >= 4);
  assert.ok(SAMPLE_WARRANTY_LOOKUPS.some((s) => s.query === 'OAA-2027-1001'));
  assert.ok(SAMPLE_WARRANTY_LOOKUPS.some((s) => s.query === 'OAA-2025-0412'));
  assert.ok(SAMPLE_WARRANTY_LOOKUPS.some((s) => s.query === 'OAA-2026-0884'));
  assert.ok(SAMPLE_WARRANTY_LOOKUPS.some((s) => s.query === '195949038221'));
});

test('calculateWarrantyPeriod and evaluateOrderWarranty support Claimed status and item-scoped claims', () => {
  const now = new Date('2026-11-13T12:00:00Z');
  const claimedCalc = calculateWarrantyPeriod({
    startDateIso: '2026-04-15T16:45:00Z',
    warrantyMonths: 12,
    nowDate: now,
    orderStatus: 'delivered',
    claimInfo: {
      status: 'replaced',
      claimedAt: '2026-09-18T13:20:00Z',
      claimReference: 'WCL-2026-084',
      resolution: 'Replaced under official warranty',
    },
  });
  assert.equal(claimedCalc.status, 'claimed');
  assert.equal(claimedCalc.remainingDays, 0);
  assert.equal(claimedCalc.claimInfo?.claimReference, 'WCL-2026-084');

  const multiItemOrderWithScopedClaim: Order = {
    ...DELIVERED_ORDER,
    id: 'OAA-2026-0884',
    items: [
      ...DELIVERED_ORDER.items,
      {
        productId: 'prod-anker737',
        productName: 'Anker 737 Power Bank',
        brand: 'Anker',
        price: 119,
        quantity: 1,
        image: 'https://example.com/anker.jpg',
      },
    ],
    warrantyClaim: {
      status: 'replaced',
      claimedAt: '2026-09-18T13:20:00Z',
      claimReference: 'WCL-2026-084',
      claimedProductIds: ['prod-iphone16promax'],
    },
  };

  const result = evaluateOrderWarranty(multiItemOrderWithScopedClaim, [SAMPLE_PRODUCT], 'firestore', now);
  assert.equal(result.items[0].calculation.status, 'claimed');
  assert.equal(result.items[1].calculation.status, 'active');
});

test('sanitizeWarrantyTerms normalizes legacy store names and contacts to ON AlAA STORE', async () => {
  const { sanitizeWarrantyTerms } = await import('./warrantyCheckerHelpers');
  assert.equal(
    sanitizeWarrantyTerms(
      'Official 1-Year Apple warranty with direct replacement at ARNAOUT STORE for hardware defects.'
    ),
    'Official 1-Year Apple warranty with direct replacement at ON AlAA STORE for hardware defects.'
  );
  assert.equal(
    sanitizeWarrantyTerms('M. ARNAOUT CELL in Saida - call 03099889'),
    'ON AlAA STORE in Chouf - call 03 986 718'
  );
  assert.equal(sanitizeWarrantyTerms('', 'Default ON AlAA STORE terms.'), 'Default ON AlAA STORE terms.');
});

