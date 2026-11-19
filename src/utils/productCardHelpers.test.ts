import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildOfferBannerLabel,
  buildProductCardViewModel,
  buildProductWhatsAppUrl,
  computeProductPricingMetrics,
  formatUsdAmount,
  resolveProductSoldCountLabel,
} from './productCardHelpers';
import { Product } from '../types';

const BASE_PRODUCT: Product = {
  id: 'prod-101',
  sku: 'GL-MC-3800',
  name: 'Green Lion Muscle Care Massage Gun 3800 RPM',
  nameAr: 'مسدس مساج غرين لايون',
  category: 'Self Care & Beauty',
  brand: 'Green Lion',
  price: 25,
  originalPrice: 40,
  discountPercentage: 0,
  stock: 8,
  lowStockThreshold: 3,
  rating: 5,
  reviewCount: 1,
  warrantyMonths: 12,
  images: ['https://example.com/gun.jpg'],
  description: 'High torque massage gun.',
  specifications: [],
  isPublished: true,
  isBestSeller: true,
  isNewArrival: true,
  isSpecialOffer: true,
  createdAt: '2026-01-01T00:00:00.000Z',
};

test('formatUsdAmount formats integers cleanly and preserves cents when present', () => {
  assert.equal(formatUsdAmount(25), '25');
  assert.equal(formatUsdAmount(629), '629');
  assert.equal(formatUsdAmount(24.99), '24.99');
  assert.equal(formatUsdAmount(-5), '0');
});

test('computeProductPricingMetrics derives discount percentage and savings automatically from prices', () => {
  const metrics = computeProductPricingMetrics({
    price: 25,
    originalPrice: 40,
    discountPercentage: 0,
  });

  assert.equal(metrics.salePrice, 25);
  assert.equal(metrics.regularPrice, 40);
  assert.equal(metrics.discountPercent, 38);
  assert.equal(metrics.savingsAmount, 15);
  assert.equal(metrics.isDiscounted, true);
  assert.equal(metrics.formattedSalePrice, '$25');
  assert.equal(metrics.formattedRegularPrice, '$40');
  assert.equal(metrics.formattedSavings, '$15');
});

test('computeProductPricingMetrics handles non-discounted items cleanly', () => {
  const metrics = computeProductPricingMetrics({
    price: 199,
    originalPrice: 199,
    discountPercentage: 0,
  });

  assert.equal(metrics.regularPrice, null);
  assert.equal(metrics.discountPercent, 0);
  assert.equal(metrics.savingsAmount, 0);
  assert.equal(metrics.isDiscounted, false);
  assert.equal(metrics.formattedSavings, null);
});

test('buildProductWhatsAppUrl encodes dynamic title, price, and SKU for EN and AR', () => {
  const urlEn = buildProductWhatsAppUrl(BASE_PRODUCT, '+961 70 773 067', 'en');
  assert.ok(urlEn.startsWith('https://wa.me/96170773067?text='));
  assert.ok(decodeURIComponent(urlEn).includes('Green Lion Muscle Care Massage Gun 3800 RPM'));
  assert.ok(decodeURIComponent(urlEn).includes('$25 USD'));
  assert.ok(decodeURIComponent(urlEn).includes('prod-101'));

  const urlAr = buildProductWhatsAppUrl(BASE_PRODUCT, undefined, 'ar');
  assert.ok(urlAr.startsWith('https://wa.me/96170773067?text='));
  assert.ok(decodeURIComponent(urlAr).includes('مسدس مساج غرين لايون'));
});

test('buildProductCardViewModel produces consistent uppercased brand, stock flags, and rating', () => {
  const vm = buildProductCardViewModel(BASE_PRODUCT, 'en', '96170773067');
  assert.equal(vm.brandLabel, 'GREEN LION');
  assert.equal(vm.inStock, true);
  assert.equal(vm.isLowStock, false);
  assert.equal(vm.warrantyMonths, 12);
  assert.equal(vm.ratingValue, '5');
  assert.equal(vm.ratingDecimal, '5.0');
  assert.equal(vm.reviewCount, 1);
  assert.equal(vm.soldLabel, '50+ Sold');

  const outVm = buildProductCardViewModel({ ...BASE_PRODUCT, stock: 0 }, 'en');
  assert.equal(outVm.inStock, false);
  assert.equal(outVm.isOutOfStock, true);

  const lowVm = buildProductCardViewModel({ ...BASE_PRODUCT, stock: 2 }, 'en');
  assert.equal(lowVm.inStock, true);
  assert.equal(lowVm.isLowStock, true);
});

test('resolveProductSoldCountLabel derives deterministic social proof tiers in EN and AR', () => {
  assert.equal(
    resolveProductSoldCountLabel(
      { name: 'G.L SNAP GRIP MAGNETIC CAMERA GRIP', isBestSeller: false, reviewCount: 1 },
      'en'
    ),
    '100+ Sold'
  );
  assert.equal(
    resolveProductSoldCountLabel(
      { name: 'Fast Charge Power Bank M12', isBestSeller: true, reviewCount: 1 },
      'en'
    ),
    '50+ Sold'
  );
  assert.equal(
    resolveProductSoldCountLabel(
      { name: 'Universal Capacitive Pen V1', isBestSeller: false, reviewCount: 1 },
      'en'
    ),
    '20+ Sold'
  );
  assert.equal(
    resolveProductSoldCountLabel(
      { name: 'Custom Item', soldCount: 140, isBestSeller: false, reviewCount: 0 },
      'ar'
    ),
    'تم بيع +100'
  );
});

test('buildOfferBannerLabel displays UP TO 40% OFF for discounted and offer items', () => {
  assert.equal(
    buildOfferBannerLabel(
      { isSpecialOffer: true, price: 35, originalPrice: 50, discountPercentage: 30 },
      false,
      'en'
    ),
    'UP TO 40% OFF'
  );
  assert.equal(
    buildOfferBannerLabel(
      { isSpecialOffer: true, price: 35, originalPrice: 50, discountPercentage: 30 },
      false,
      'ar'
    ),
    'خصم حتى 40%'
  );
  assert.equal(
    buildOfferBannerLabel(
      { isSpecialOffer: false, price: 100, originalPrice: 100, discountPercentage: 0 },
      false,
      'en'
    ),
    null
  );
});
