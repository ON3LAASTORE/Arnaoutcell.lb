import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildProductCardViewModel,
  buildProductWhatsAppUrl,
  computeProductPricingMetrics,
  formatUsdAmount,
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
  const urlEn = buildProductWhatsAppUrl(BASE_PRODUCT, '+961 3 986 718', 'en');
  assert.ok(urlEn.startsWith('https://wa.me/9613986718?text='));
  assert.ok(decodeURIComponent(urlEn).includes('Green Lion Muscle Care Massage Gun 3800 RPM'));
  assert.ok(decodeURIComponent(urlEn).includes('$25 USD'));
  assert.ok(decodeURIComponent(urlEn).includes('prod-101'));

  const urlAr = buildProductWhatsAppUrl(BASE_PRODUCT, undefined, 'ar');
  assert.ok(urlAr.startsWith('https://wa.me/9613986718?text='));
  assert.ok(decodeURIComponent(urlAr).includes('مسدس مساج غرين لايون'));
});

test('buildProductCardViewModel produces consistent uppercased brand, stock flags, and rating', () => {
  const vm = buildProductCardViewModel(BASE_PRODUCT, 'en', '9613986718');
  assert.equal(vm.brandLabel, 'GREEN LION');
  assert.equal(vm.inStock, true);
  assert.equal(vm.isLowStock, false);
  assert.equal(vm.warrantyMonths, 12);
  assert.equal(vm.ratingValue, '5');
  assert.equal(vm.reviewCount, 1);

  const outVm = buildProductCardViewModel({ ...BASE_PRODUCT, stock: 0 }, 'en');
  assert.equal(outVm.inStock, false);
  assert.equal(outVm.isOutOfStock, true);

  const lowVm = buildProductCardViewModel({ ...BASE_PRODUCT, stock: 2 }, 'en');
  assert.equal(lowVm.inStock, true);
  assert.equal(lowVm.isLowStock, true);
});
