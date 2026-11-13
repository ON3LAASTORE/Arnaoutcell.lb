import test from 'node:test';
import assert from 'node:assert/strict';
import {
  shouldShowNewBadge,
  shouldShowBestsellerBadge,
  shouldShowLowStockBadge,
  isProductOutOfStock,
  getLowStockLabel,
  getProductBadges,
  hasProductDiscount,
} from './productBadgeHelpers';

test('shouldShowNewBadge detects new arrivals correctly', () => {
  assert.equal(shouldShowNewBadge({ isNewArrival: true }), true);
  assert.equal(shouldShowNewBadge({ isNewArrival: false }), false);
  assert.equal(shouldShowNewBadge({}), false);
});

test('shouldShowBestsellerBadge detects bestsellers correctly', () => {
  assert.equal(shouldShowBestsellerBadge({ isBestSeller: true }), true);
  assert.equal(shouldShowBestsellerBadge({ isBestSeller: false }), false);
  assert.equal(shouldShowBestsellerBadge({}), false);
});

test('shouldShowLowStockBadge uses default threshold of 3 when unspecified', () => {
  assert.equal(shouldShowLowStockBadge({ stock: 3 }), true);
  assert.equal(shouldShowLowStockBadge({ stock: 1 }), true);
  assert.equal(shouldShowLowStockBadge({ stock: 4 }), false);
  assert.equal(shouldShowLowStockBadge({ stock: 0 }), false); // 0 is out of stock, not low stock
});

test('shouldShowLowStockBadge respects custom threshold', () => {
  assert.equal(shouldShowLowStockBadge({ stock: 5, lowStockThreshold: 5 }), true);
  assert.equal(shouldShowLowStockBadge({ stock: 6, lowStockThreshold: 5 }), false);
});

test('isProductOutOfStock identifies zero and negative stock', () => {
  assert.equal(isProductOutOfStock({ stock: 0 }), true);
  assert.equal(isProductOutOfStock({ stock: -1 }), true);
  assert.equal(isProductOutOfStock({ stock: 1 }), false);
});

test('getLowStockLabel produces localized copy for English and Arabic', () => {
  assert.equal(getLowStockLabel({ stock: 1 }, 'en'), 'Only 1 left!');
  assert.equal(getLowStockLabel({ stock: 2 }, 'en'), 'Low Stock: 2 left');
  assert.equal(getLowStockLabel({ stock: 1 }, 'ar'), 'بقي قطعة واحدة!');
  assert.equal(getLowStockLabel({ stock: 2 }, 'ar'), 'بقي 2 فقط');
});

test('getProductBadges aggregates multiple badges in correct priority order', () => {
  const product = {
    discountPercentage: 15,
    isNewArrival: true,
    isBestSeller: true,
    stock: 2,
    lowStockThreshold: 3,
  };

  const badgesEn = getProductBadges(product, 'en');
  assert.equal(badgesEn.length, 4);
  assert.equal(badgesEn[0].id, 'discount');
  assert.equal(badgesEn[1].id, 'new');
  assert.equal(badgesEn[2].id, 'bestseller');
  assert.equal(badgesEn[3].id, 'low_stock');

  const badgesAr = getProductBadges(product, 'ar');
  assert.equal(badgesAr[1].label, 'وصل حديثاً');
  assert.equal(badgesAr[2].label, 'الأكثر مبيعاً 🔥');
  assert.equal(badgesAr[3].label, 'بقي 2 فقط');
});

test('getProductBadges includes out of stock badge when stock is 0', () => {
  const product = {
    stock: 0,
    isNewArrival: false,
    isBestSeller: true,
  };

  const badges = getProductBadges(product, 'en');
  assert.equal(badges.some((b) => b.id === 'out_of_stock'), true);
  assert.equal(badges.some((b) => b.id === 'low_stock'), false);
});

test('hasProductDiscount correctly identifies discounted products', () => {
  assert.equal(hasProductDiscount({ discountPercentage: 10, price: 100 }), true);
  assert.equal(hasProductDiscount({ price: 80, originalPrice: 100 }), true);
  assert.equal(hasProductDiscount({ price: 100, originalPrice: 100 }), false);
  assert.equal(hasProductDiscount({ price: 100, originalPrice: 90 }), false);
  assert.equal(hasProductDiscount({ discountPercentage: 0, price: 100 }), false);
  assert.equal(hasProductDiscount({}), false);
});

