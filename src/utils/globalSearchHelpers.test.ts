import test from 'node:test';
import assert from 'node:assert/strict';
import {
  filterProductsByNameOrBrand,
  filterProductsGlobally,
  getUniqueMatchingBrands,
  getUniqueMatchingCategories,
  matchesProductSearchQuery,
  getFilterModeLabels,
} from './globalSearchHelpers';
import type { Product, Brand, Category } from '../types';

const mockCategories: Category[] = [
  {
    id: 'cat-phones',
    name: 'Smartphones',
    nameAr: 'الهواتف الذكية',
    slug: 'smartphones',
    iconName: 'Smartphone',
    featured: true,
    displayOrder: 1,
    subcategories: ['Flagship Phones', '5G Devices'],
  },
  {
    id: 'cat-power',
    name: 'Chargers & Power',
    nameAr: 'شواحن وبنوك طاقة',
    slug: 'chargers-power',
    iconName: 'Zap',
    featured: true,
    displayOrder: 2,
    subcategories: ['GaN Chargers', 'Power Banks'],
  },
  {
    id: 'cat-audio',
    name: 'Audio',
    nameAr: 'سماعات وصوتيات',
    slug: 'audio',
    iconName: 'Headphones',
    featured: true,
    displayOrder: 3,
    subcategories: ['True Wireless', 'ANC Earbuds'],
  },
];

const mockProducts: Product[] = [
  {
    id: 'p1',
    name: 'Apple iPhone 16 Pro Max 256GB',
    nameAr: 'أبل آيفون 16 برو ماكس',
    brand: 'Apple',
    category: 'Smartphones',
    subcategory: 'Flagship Phones',
    price: 1199,
    originalPrice: 1299,
    stock: 5,
    rating: 4.9,
    reviewCount: 30,
    images: ['https://example.com/iphone.jpg'],
    description: 'A18 Pro Titanium flagship',
    specifications: [{ label: 'Chip', value: 'A18 Pro' }],
    colors: ['Desert Titanium', 'Black Titanium'],
    isNewArrival: true,
    isSpecialOffer: false,
    isPublished: true,
    sku: 'IPH-16-PM',
    warrantyMonths: 12,
    createdAt: '2026-09-20',
  },
  {
    id: 'p2',
    name: 'Samsung Galaxy S25 Ultra 512GB',
    nameAr: 'سامسونج جالاكسي اس 25 الترا',
    brand: 'Samsung',
    category: 'Smartphones',
    subcategory: 'Flagship Phones',
    price: 1299,
    originalPrice: 1399,
    stock: 2,
    rating: 4.8,
    reviewCount: 22,
    images: ['https://example.com/s25.jpg'],
    description: 'Snapdragon 8 Elite with S Pen',
    specifications: [{ label: 'Chip', value: 'Snapdragon 8 Elite' }],
    colors: ['Titanium Silver', 'Titanium Black'],
    isNewArrival: true,
    isSpecialOffer: true,
    isPublished: true,
    sku: 'SAM-S25-U',
    warrantyMonths: 12,
    createdAt: '2026-02-15',
  },
  {
    id: 'p3',
    name: 'Anker Prime 200W Power Bank',
    nameAr: 'شاحن متنقل انكر برايم 200 واط',
    brand: 'Anker',
    category: 'Chargers & Power',
    subcategory: 'Power Banks',
    price: 129,
    originalPrice: 149,
    stock: 0, // out of stock
    rating: 4.7,
    reviewCount: 15,
    images: ['https://example.com/anker.jpg'],
    description: '200W Output with smart display',
    specifications: [{ label: 'Power', value: '200W' }],
    colors: ['Black'],
    isNewArrival: false,
    isSpecialOffer: true,
    isPublished: true,
    sku: 'ANK-PRIME-200',
    warrantyMonths: 18,
    createdAt: '2026-01-10',
  },
  {
    id: 'p4',
    name: 'Draft Unpublished Phone',
    nameAr: 'هاتف مسودة غير منشور',
    brand: 'Apple',
    category: 'Smartphones',
    price: 999,
    originalPrice: 999,
    stock: 10,
    rating: 4.0,
    reviewCount: 1,
    images: [],
    description: 'Unpublished draft device',
    specifications: [],
    colors: [],
    isPublished: false, // draft
    sku: 'DRAFT-01',
    warrantyMonths: 0,
    createdAt: '2026-01-01',
  },
  {
    id: 'p5',
    name: 'Apple AirPods Pro 2 USB-C',
    nameAr: 'سماعات ابل ايربودز برو 2',
    brand: 'Apple',
    category: 'Audio',
    subcategory: 'ANC Earbuds',
    price: 239,
    originalPrice: 249,
    stock: 8,
    rating: 4.9,
    reviewCount: 45,
    images: ['https://example.com/airpods.jpg'],
    description: 'Active noise cancellation with USB-C case',
    specifications: [{ label: 'Connectivity', value: 'USB-C' }],
    colors: ['White'],
    isNewArrival: false,
    isSpecialOffer: false,
    isPublished: true,
    sku: 'APP-APP2',
    warrantyMonths: 12,
    createdAt: '2026-03-01',
  },
];

const mockBrands: Brand[] = [
  {
    id: 'b1',
    name: 'Apple',
    logo: 'https://example.com/apple-logo.png',
    description: 'Cupertino California tech innovation',
    featured: true,
    productCount: 2,
  },
  {
    id: 'b2',
    name: 'Samsung',
    logo: 'https://example.com/samsung-logo.png',
    description: 'Galaxy devices and displays',
    featured: true,
    productCount: 1,
  },
  {
    id: 'b3',
    name: 'Anker',
    logo: 'https://example.com/anker-logo.png',
    description: 'Charging technology leader',
    featured: true,
    productCount: 1,
  },
];

test('filterProductsByNameOrBrand returns empty array on empty query', () => {
  const result = filterProductsByNameOrBrand(mockProducts, '');
  assert.equal(result.length, 0);

  const resultSpaces = filterProductsByNameOrBrand(mockProducts, '   ');
  assert.equal(resultSpaces.length, 0);
});

test('filterProductsByNameOrBrand filters products by name in English', () => {
  const results = filterProductsByNameOrBrand(mockProducts, 'iPhone', 'all');
  assert.equal(results.length, 1);
  assert.equal(results[0].id, 'p1');
});

test('filterProductsByNameOrBrand filters products by name in Arabic', () => {
  const results = filterProductsByNameOrBrand(mockProducts, 'سامسونج', 'all');
  assert.equal(results.length, 1);
  assert.equal(results[0].id, 'p2');
});

test('filterProductsByNameOrBrand filters products by brand name', () => {
  const results = filterProductsByNameOrBrand(mockProducts, 'Apple', 'all');
  // p1 and p5 are published Apple products, p4 is unpublished so excluded
  assert.equal(results.length, 2);
  const ids = results.map((p) => p.id);
  assert.ok(ids.includes('p1'));
  assert.ok(ids.includes('p5'));
  assert.ok(!ids.includes('p4')); // unpublished
});

test('filterProductsByNameOrBrand respects mode="brand"', () => {
  const brandResults = filterProductsByNameOrBrand(mockProducts, 'Apple', 'brand');
  assert.equal(brandResults.length, 2);

  const iphoneResults = filterProductsByNameOrBrand(mockProducts, 'iPhone', 'brand');
  assert.equal(iphoneResults.length, 0);
});

test('filterProductsByNameOrBrand respects mode="name"', () => {
  const iphoneResults = filterProductsByNameOrBrand(mockProducts, 'iPhone', 'name');
  assert.equal(iphoneResults.length, 1);
  assert.equal(iphoneResults[0].id, 'p1');

  const nameOnly = filterProductsByNameOrBrand(mockProducts, 'AirPods', 'name');
  assert.equal(nameOnly.length, 1);
  assert.equal(nameOnly[0].id, 'p5');
});

test('filterProductsGlobally finds products by English and Arabic category names and respects mode="category"', () => {
  // Query "Smartphones" finds p1 and p2 (excluding draft p4)
  const enCat = filterProductsGlobally(mockProducts, 'Smartphones', 'category', mockCategories);
  assert.equal(enCat.length, 2);
  assert.ok(enCat.every((p) => p.category === 'Smartphones'));

  // Query "Audio" in category mode matches p5, whereas "iPhone" does not match category
  const audioCat = filterProductsGlobally(mockProducts, 'Audio', 'category', mockCategories);
  assert.equal(audioCat.length, 1);
  assert.equal(audioCat[0].id, 'p5');

  const nonCatQuery = filterProductsGlobally(mockProducts, 'iPhone', 'category', mockCategories);
  assert.equal(nonCatQuery.length, 0);

  // Arabic category name match: "الهواتف" matches cat-phones -> p1, p2
  const arCat = filterProductsGlobally(mockProducts, 'الهواتف', 'category', mockCategories);
  assert.equal(arCat.length, 2);
});

test('filterProductsGlobally finds products by subcategory and SKU in mode="all"', () => {
  const subcat = filterProductsGlobally(mockProducts, 'ANC Earbuds', 'all', mockCategories);
  assert.equal(subcat.length, 1);
  assert.equal(subcat[0].id, 'p5');

  const skuMatch = filterProductsGlobally(mockProducts, 'SAM-S25-U', 'all', mockCategories);
  assert.equal(skuMatch.length, 1);
  assert.equal(skuMatch[0].id, 'p2');
});

test('getUniqueMatchingCategories finds matching categories in EN/AR and counts published items', () => {
  const enMatches = getUniqueMatchingCategories(mockProducts, mockCategories, 'Smartphones');
  assert.equal(enMatches.length, 1);
  assert.equal(enMatches[0].slug, 'smartphones');
  assert.equal(enMatches[0].count, 2); // excludes draft p4

  const arMatches = getUniqueMatchingCategories(mockProducts, mockCategories, 'شواحن');
  assert.equal(arMatches.length, 1);
  assert.equal(arMatches[0].slug, 'chargers-power');
  assert.equal(arMatches[0].count, 1);
});

test('matchesProductSearchQuery validates single product against name, brand, or category', () => {
  assert.equal(matchesProductSearchQuery(mockProducts[0], '', mockCategories), true);
  assert.equal(matchesProductSearchQuery(mockProducts[0], 'Apple', mockCategories), true);
  assert.equal(matchesProductSearchQuery(mockProducts[0], 'Smartphones', mockCategories), true);
  assert.equal(matchesProductSearchQuery(mockProducts[0], 'الهواتف', mockCategories), true);
  assert.equal(matchesProductSearchQuery(mockProducts[0], 'Sony', mockCategories), false);
});

test('filterProductsByNameOrBrand prioritizes in-stock items over out-of-stock items', () => {
  const results = filterProductsByNameOrBrand(mockProducts, 'Power', 'all');
  assert.equal(results.length, 1);
  assert.equal(results[0].id, 'p3');
});

test('getUniqueMatchingBrands finds brands and calculates accurate product count', () => {
  const matching = getUniqueMatchingBrands(mockProducts, mockBrands, 'app');
  assert.ok(matching.length >= 1);
  assert.equal(matching[0].name, 'Apple');
  assert.equal(matching[0].count, 2);
});

test('getFilterModeLabels returns English and Arabic configurations for all 4 search scopes', () => {
  const en = getFilterModeLabels('en');
  assert.equal(en.length, 4);
  assert.equal(en[0].mode, 'all');
  assert.equal(en[1].mode, 'name');
  assert.equal(en[2].mode, 'brand');
  assert.equal(en[3].mode, 'category');

  const ar = getFilterModeLabels('ar');
  assert.equal(ar.length, 4);
  assert.equal(ar[0].label, 'الكل');
  assert.equal(ar[1].label, 'بالاسم');
  assert.equal(ar[2].label, 'بالماركة');
  assert.equal(ar[3].label, 'بالقسم');
});
