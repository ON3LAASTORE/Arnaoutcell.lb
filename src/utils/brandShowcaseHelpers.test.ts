import test from 'node:test';
import assert from 'node:assert/strict';
import { buildBrandShowcaseBanners } from './brandShowcaseHelpers';
import { Brand, Product } from '../types';

const BRANDS: Brand[] = [
  {
    id: 'b-apple',
    name: 'Apple',
    logo: 'https://example.com/apple-logo.jpg',
    description: 'iPhones, iPads and Macs',
    featured: true,
    productCount: 38,
  },
  {
    id: 'b-sony',
    name: 'Sony',
    logo: 'https://example.com/sony-logo.jpg',
    description: 'Audio and PlayStation',
    featured: true,
    productCount: 21,
  },
  {
    id: 'b-hoco',
    name: 'Hoco',
    logo: 'https://example.com/hoco-logo.jpg',
    description: 'Everyday cables and stands',
    featured: false,
    productCount: 12,
  },
];

const PRODUCTS: Product[] = [
  {
    id: 'p-iphone16',
    sku: 'APL-16PM',
    name: 'iPhone 16 Pro Max',
    nameAr: 'آيفون 16 برو ماكس',
    brand: 'Apple',
    category: 'Smartphones',
    price: 1149,
    originalPrice: 1249,
    stock: 6,
    images: ['https://example.com/iphone16.jpg'],
    description: 'Flagship Apple iPhone',
    specifications: [],
    warrantyMonths: 12,
    isPublished: true,
    isBestSeller: true,
    rating: 5,
    reviewCount: 4,
    createdAt: '2026-01-01',
  },
  {
    id: 'p-airpods',
    sku: 'APL-APP2',
    name: 'AirPods Pro 2',
    brand: 'Apple',
    category: 'Audio',
    price: 229,
    originalPrice: 249,
    stock: 10,
    images: ['https://example.com/airpods.jpg'],
    description: 'Active Noise Cancellation earbuds',
    specifications: [],
    warrantyMonths: 12,
    isPublished: true,
    isSpecialOffer: true,
    rating: 5,
    reviewCount: 2,
    createdAt: '2026-01-02',
  },
  {
    id: 'p-hidden-apple',
    sku: 'APL-OLD',
    name: 'Unpublished Apple Item',
    brand: 'Apple',
    category: 'Smartphones',
    price: 500,
    originalPrice: 500,
    stock: 0,
    images: ['https://example.com/unpublished.jpg'],
    description: 'Hidden product',
    specifications: [],
    warrantyMonths: 12,
    isPublished: false,
    rating: 4,
    reviewCount: 0,
    createdAt: '2026-01-03',
  },
];

test('buildBrandShowcaseBanners matches live published products first and deduplicates images', () => {
  const items = buildBrandShowcaseBanners(BRANDS, PRODUCTS, {
    visualsPerBrand: 3,
    lang: 'en',
  });

  assert.equal(items.length, 3);
  const apple = items[0];
  assert.equal(apple.displayName, 'Apple');
  assert.equal(apple.itemCount, 38);
  assert.equal(apple.productVisuals.length, 3);
  assert.equal(apple.productVisuals[0].imageUrl, 'https://example.com/iphone16.jpg');
  assert.equal(apple.productVisuals[1].imageUrl, 'https://example.com/airpods.jpg');
  // Unpublished item is excluded; 3rd slot falls back cleanly without duplicating URLs
  assert.notEqual(apple.productVisuals[2].imageUrl, 'https://example.com/unpublished.jpg');
  const uniqueUrls = new Set(apple.productVisuals.map((v) => v.imageUrl));
  assert.equal(uniqueUrls.size, 3);
});

test('buildBrandShowcaseBanners respects featuredOnly and limit options and Arabic labels', () => {
  const limited = buildBrandShowcaseBanners(BRANDS, PRODUCTS, {
    featuredOnly: true,
    limit: 2,
    lang: 'ar',
  });

  assert.equal(limited.length, 2);
  assert.ok(limited.every((item) => item.brand.featured));
  assert.ok(limited[0].ariaLabel.includes('Apple'));
  assert.ok(limited[0].ariaLabel.includes('منتج'));
});
