import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildRestockNotificationEmail,
  buildStockNotificationDocId,
  buildStockNotificationPayload,
  didProductRestock,
} from './stockNotificationHelpers';

test('buildStockNotificationDocId produces Firestore-safe bounded IDs', () => {
  const id = buildStockNotificationDocId('prod-iphone16promax', 'Buyer.One+vip@Example.COM ');
  assert.match(id, /^[a-zA-Z0-9_-]+$/);
  assert.ok(id.length > 0 && id.length <= 128);
  assert.equal(
    id,
    buildStockNotificationDocId('prod-iphone16promax', 'buyer.one+vip@example.com')
  );

  const oversizedId = buildStockNotificationDocId('a'.repeat(80), 'user@' + 'b'.repeat(200) + '.com');
  assert.ok(oversizedId.length <= 128);
  assert.match(oversizedId, /^[a-zA-Z0-9_-]+$/);
});

test('buildStockNotificationPayload builds strict blueprint-compliant pending payload', () => {
  const payload = buildStockNotificationPayload({
    product: {
      id: 'prod-123',
      name: 'Sony WH-1000XM5 Wireless Headphones',
      nameAr: 'سماعات سوني لاسلكية',
      brand: 'Sony',
      price: 349,
      images: ['https://example.com/sony.jpg'],
    },
    email: '  Customer@Gmail.com ',
    lang: 'ar',
    createdAt: '2026-11-15T12:00:00.000Z',
  });

  assert.equal(payload.status, 'pending');
  assert.equal(payload.email, 'customer@gmail.com');
  assert.equal(payload.productId, 'prod-123');
  assert.equal(payload.productPrice, 349);
  assert.equal(payload.lang, 'ar');
  assert.equal(payload.notifiedAt, undefined);
  assert.ok(payload.id.startsWith('prod-123__'));
});

test('buildStockNotificationPayload rejects invalid emails', () => {
  assert.throws(() => {
    buildStockNotificationPayload({
      product: {
        id: 'prod-1',
        name: 'Test',
        brand: 'Apple',
        price: 100,
        images: [],
      },
      email: 'not-an-email',
    });
  });
});

test('didProductRestock detects transition strictly from out-of-stock to available', () => {
  assert.equal(didProductRestock(0, 1), true);
  assert.equal(didProductRestock(0, 10), true);
  assert.equal(didProductRestock(-1, 5), true);
  assert.equal(didProductRestock(2, 5), false);
  assert.equal(didProductRestock(0, 0), false);
  assert.equal(didProductRestock(5, 0), false);
});

test('buildRestockNotificationEmail generates escaped EN and AR restock templates', () => {
  const enEmail = buildRestockNotificationEmail({
    productName: 'Apple iPhone <16> Pro',
    productPrice: 1199,
    lang: 'en',
  });
  assert.match(enEmail.subject, /Back in Stock: Apple iPhone <16> Pro/);
  assert.match(enEmail.text, /\$1199 USD/);
  assert.ok(!enEmail.html.includes('<16>'));
  assert.ok(enEmail.html.includes('&lt;16&gt;'));

  const arEmail = buildRestockNotificationEmail({
    productName: 'iPhone 16',
    productNameAr: 'آيفون 16 برو',
    productPrice: 1199,
    lang: 'ar',
  });
  assert.match(arEmail.subject, /توفر من جديد: آيفون 16 برو/);
  assert.match(arEmail.html, /dir="rtl"/);
});
