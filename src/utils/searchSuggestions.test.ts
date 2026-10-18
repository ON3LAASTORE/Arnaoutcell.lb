import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeSearchTerm,
  querySearchSuggestions,
  POPULAR_SEARCH_TERMS,
} from './searchSuggestions.ts';
import { Product, Category } from '../types/index.ts';

const mockCategories: Category[] = [
  {
    id: 'cat-phones',
    name: 'Phones',
    nameAr: 'الهواتف الذكية',
    slug: 'phones',
    iconName: 'Smartphone',
    featured: true,
    displayOrder: 1,
    subcategories: ['Flagship Phones', 'Mid-Range'],
  },
  {
    id: 'cat-chargers',
    name: 'Chargers & Adapters',
    nameAr: 'شواحن ومحولات',
    slug: 'chargers-adapters',
    iconName: 'Zap',
    featured: true,
    displayOrder: 2,
    subcategories: ['GaN Chargers', 'Car Chargers'],
  },
  {
    id: 'cat-smartwatches',
    name: 'Smartwatches',
    nameAr: 'الساعات الذكية',
    slug: 'smartwatches',
    iconName: 'Watch',
    featured: true,
    displayOrder: 3,
    subcategories: ['Apple Watch', 'Galaxy Watch'],
  },
];

const mockProducts: Product[] = [
  {
    id: 'p-1',
    name: 'Samsung Galaxy S25 Ultra 512GB',
    nameAr: 'سامسونج جالاكسي S25 الترا',
    brand: 'Samsung',
    category: 'phones',
    sku: 'SAM-S25-512',
    originalPrice: 1299,
    price: 1199,
    stock: 8,
    images: ['https://example.com/s25.jpg'],
    description: 'Flagship Samsung phone',
    specifications: [{ label: 'Color', value: 'Titanium Black' }],
    warrantyMonths: 12,
    isPublished: true,
    rating: 4.9,
    reviewCount: 30,
    createdAt: '2026-01-01',
  },
  {
    id: 'p-2',
    name: 'Anker 737 GaN 140W Charger',
    nameAr: 'شاحن انكر 140 واط',
    brand: 'Anker',
    category: 'chargers-adapters',
    sku: 'ANK-737-GAN',
    originalPrice: 99,
    price: 79,
    stock: 15,
    images: ['https://example.com/anker.jpg'],
    description: 'Ultra fast multi-device GaN wall charger',
    specifications: [{ label: 'Power', value: '140W' }],
    warrantyMonths: 18,
    isPublished: true,
    rating: 4.8,
    reviewCount: 22,
    createdAt: '2026-01-02',
  },
  {
    id: 'p-3',
    name: 'Apple Watch Series 10 Titanium',
    nameAr: 'ابل واتش سيريس 10 تيتانيوم',
    brand: 'Apple',
    category: 'smartwatches',
    sku: 'APL-W10-TIT',
    originalPrice: 799,
    price: 749,
    stock: 0, // out of stock
    images: ['https://example.com/watch.jpg'],
    description: 'Latest premium Apple Watch',
    specifications: [{ label: 'Material', value: 'Titanium' }],
    warrantyMonths: 12,
    isPublished: true,
    rating: 4.7,
    reviewCount: 15,
    createdAt: '2026-01-03',
  },
  {
    id: 'p-4',
    name: 'Draft Hidden Product',
    brand: 'DraftBrand',
    category: 'phones',
    sku: 'DFT-001',
    originalPrice: 100,
    price: 80,
    stock: 5,
    images: [],
    description: 'Unpublished item',
    specifications: [],
    warrantyMonths: 0,
    isPublished: false, // Draft
    rating: 0,
    reviewCount: 0,
    createdAt: '2026-01-04',
  },
  {
    id: 'p-5',
    name: 'Samsung Galaxy Watch Titanium In-Stock',
    nameAr: 'سامسونج جالاكسي واتش تيتانيوم',
    brand: 'Samsung',
    category: 'smartwatches',
    sku: 'SAM-W-TIT',
    originalPrice: 399,
    price: 349,
    stock: 4, // in stock
    images: ['https://example.com/samwatch.jpg'],
    description: 'Samsung Watch Titanium',
    specifications: [{ label: 'Material', value: 'Titanium' }],
    warrantyMonths: 12,
    isPublished: true,
    rating: 4.8,
    reviewCount: 10,
    createdAt: '2026-01-05',
  },
];

test('normalizeSearchTerm trims, downcases and cleans diacritics', () => {
  assert.equal(normalizeSearchTerm('  SAMSUNG Galaxy  '), 'samsung galaxy');
  assert.equal(normalizeSearchTerm('سَامْسُونج'), 'سامسونج');
});

test('querySearchSuggestions returns empty lists on blank input', () => {
  const result = querySearchSuggestions('   ', mockProducts, mockCategories);
  assert.equal(result.query, '');
  assert.equal(result.categories.length, 0);
  assert.equal(result.products.length, 0);
  assert.equal(result.totalCategoryMatches, 0);
  assert.equal(result.totalProductMatches, 0);
});

test('querySearchSuggestions matches both categories and products when query applies to both', () => {
  // "phone" matches category "Phones" and product "Samsung Galaxy S25" (whose category is phones)
  const result = querySearchSuggestions('phone', mockProducts, mockCategories);
  assert.equal(result.categories.length, 1);
  assert.equal(result.categories[0].slug, 'phones');
  assert.equal(result.categories[0].productCount, 1); // 1 published product in phones
  assert.equal(result.products.length, 1);
  assert.equal(result.products[0].id, 'p-1');
});

test('querySearchSuggestions matches Arabic terms for categories and products', () => {
  // 'شاحن' matches both the category 'شواحن ومحولات' via synonym and 'شاحن انكر'
  const result = querySearchSuggestions('شاحن', mockProducts, mockCategories);
  assert.equal(result.categories.length, 1);
  assert.equal(result.categories[0].slug, 'chargers-adapters');
  assert.equal(result.products.length, 1);
  assert.equal(result.products[0].id, 'p-2');
});

test('querySearchSuggestions excludes unpublished draft products', () => {
  const result = querySearchSuggestions('Draft', mockProducts, mockCategories);
  assert.equal(result.products.length, 0);
});

test('querySearchSuggestions prioritizes in-stock items when both have title match', () => {
  const result = querySearchSuggestions('Titanium', mockProducts, mockCategories);
  // Both p-3 (Apple Watch Titanium, stock=0) and p-5 (Samsung Watch Titanium, stock=4) match title 'Titanium'
  // p-5 is in stock, so it must rank ahead of p-3
  assert.equal(result.products.length, 3); // p-5, p-3 (title match), and p-1 (spec match)
  assert.equal(result.products[0].id, 'p-5');
  assert.equal(result.products[1].id, 'p-3');
});

test('POPULAR_SEARCH_TERMS provides rich list of common queries', () => {
  assert.ok(POPULAR_SEARCH_TERMS.length >= 5);
  assert.ok(POPULAR_SEARCH_TERMS.includes('iPhone 16 Pro'));
});
