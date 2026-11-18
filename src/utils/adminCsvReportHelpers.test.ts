import test from 'node:test';
import assert from 'node:assert/strict';
import {
  combinedInventoryAndSalesToCsv,
  computeCombinedReportSummary,
  escapeCsvCell,
  inventoryToCsv,
  salesOrdersToCsv,
} from './adminCsvReportHelpers.ts';
import type { Order, Product } from '../types';

const SAMPLE_PRODUCTS: Product[] = [
  {
    id: 'prod-1',
    sku: 'APL-IP16PM',
    name: 'Apple iPhone 16 Pro Max, 256GB',
    nameAr: 'آيفون 16 برو ماكس',
    brand: 'Apple',
    category: 'phones',
    originalPrice: 1299,
    price: 1249,
    discountPercentage: 4,
    isSpecialOffer: true,
    stock: 8,
    lowStockThreshold: 3,
    description: '',
    descriptionAr: '',
    specifications: [],
    images: [],
    warrantyMonths: 12,
    isFeatured: true,
    isBestSeller: true,
    isNewArrival: false,
    isPublished: true,
    rating: 5,
    reviewCount: 0,
    createdAt: '2026-11-01T00:00:00Z',
  },
  {
    id: 'prod-2',
    sku: 'ANK-737',
    name: 'Anker 737 Power Bank',
    nameAr: 'باور بانك انكر',
    brand: 'Anker',
    category: 'power-banks',
    originalPrice: 120,
    price: 120,
    isSpecialOffer: false,
    stock: 2,
    lowStockThreshold: 3,
    description: '',
    descriptionAr: '',
    specifications: [],
    images: [],
    warrantyMonths: 12,
    isFeatured: false,
    isBestSeller: false,
    isNewArrival: false,
    isPublished: true,
    rating: 5,
    reviewCount: 0,
    createdAt: '2026-11-01T00:00:00Z',
  },
  {
    id: 'prod-3',
    sku: 'SNY-XM5',
    name: 'Sony WH-1000XM5 "Midnight"',
    nameAr: 'سماعة سوني',
    brand: 'Sony',
    category: 'headphones',
    originalPrice: 320,
    price: 320,
    isSpecialOffer: false,
    stock: 0,
    lowStockThreshold: 2,
    description: '',
    descriptionAr: '',
    specifications: [],
    images: [],
    warrantyMonths: 12,
    isFeatured: false,
    isBestSeller: false,
    isNewArrival: false,
    isPublished: true,
    rating: 5,
    reviewCount: 0,
    createdAt: '2026-11-01T00:00:00Z',
  },
];

const SAMPLE_ORDERS: Order[] = [
  {
    id: 'ORD-100',
    customer: {
      fullName: 'Sami Khoury',
      phone: '03 123 456',
      cityArea: 'Chouf, Mount Lebanon',
      addressLine: 'Main Road',
    },
    items: [
      {
        productId: 'prod-1',
        productName: 'Apple iPhone 16 Pro Max, 256GB',
        brand: 'Apple',
        price: 1249,
        quantity: 2,
        image: '',
      },
    ],
    subtotal: 2498,
    discount: 0,
    deliveryFee: 2,
    total: 2500,
    currency: 'USD',
    status: 'delivered',
    paymentMethod: 'cod',
    paymentStatus: 'paid',
    orderDate: '2026-11-17T10:00:00Z',
    statusHistory: [],
  },
  {
    id: 'ORD-101',
    customer: {
      fullName: 'Cancelled Buyer',
      phone: '70 000 000',
      cityArea: 'Beirut',
      addressLine: 'Hamra',
    },
    items: [
      {
        productId: 'prod-2',
        productName: 'Anker 737 Power Bank',
        brand: 'Anker',
        price: 120,
        quantity: 5,
        image: '',
      },
    ],
    subtotal: 600,
    discount: 0,
    deliveryFee: 3,
    total: 603,
    currency: 'USD',
    status: 'cancelled',
    paymentMethod: 'cod',
    paymentStatus: 'pending',
    orderDate: '2026-11-18T09:00:00Z',
    statusHistory: [],
  },
];

test('escapeCsvCell handles quotes, commas, newlines, Arabic text, and formula injection', () => {
  assert.equal(escapeCsvCell('simple'), 'simple');
  assert.equal(escapeCsvCell('Chouf, Lebanon'), '"Chouf, Lebanon"');
  assert.equal(escapeCsvCell('Sony "Midnight"'), '"Sony ""Midnight"""');
  assert.equal(escapeCsvCell('Line1\nLine2'), '"Line1\nLine2"');
  assert.equal(escapeCsvCell('آيفون 16'), 'آيفون 16');
  assert.equal(escapeCsvCell('=CMD()'), "'=CMD()");
  assert.equal(escapeCsvCell('+12345'), "'+12345");
});

test('computeCombinedReportSummary calculates valuation, low/out stock, and active sales totals accurately', () => {
  const fixedNow = new Date('2026-11-18T12:00:00Z');
  const summary = computeCombinedReportSummary(SAMPLE_PRODUCTS, SAMPLE_ORDERS, fixedNow);

  assert.equal(summary.generatedAt, '2026-11-18T12:00:00.000Z');
  assert.equal(summary.totalProducts, 3);
  assert.equal(summary.totalStockUnits, 10); // 8 + 2 + 0
  assert.equal(summary.totalInventoryValueUsd, 8 * 1249 + 2 * 120); // 10232
  assert.equal(summary.lowStockCount, 1);
  assert.equal(summary.outOfStockCount, 1);
  assert.equal(summary.activeOrdersCount, 1);
  assert.equal(summary.cancelledOrReturnedOrdersCount, 1);
  assert.equal(summary.totalUnitsSold, 2);
  assert.equal(summary.totalSalesRevenueUsd, 2500);
});

test('inventoryToCsv serializes stock status, effective sale pricing, and active sold units', () => {
  const csv = inventoryToCsv(SAMPLE_PRODUCTS, SAMPLE_ORDERS);
  const lines = csv.split('\n');
  assert.equal(lines.length, 4); // header + 3 products
  assert.match(lines[0], /^Product ID,SKU,Product Name/);
  assert.match(lines[1], /APL-IP16PM,"Apple iPhone 16 Pro Max, 256GB".*1299\.00,1249\.00,4%,8,3,In Stock,9992\.00,2,Yes$/);
  assert.match(lines[2], /ANK-737.*Low Stock,240\.00,0,No$/);
  assert.match(lines[3], /SNY-XM5.*Out of Stock,0\.00,0,No$/);
});

test('salesOrdersToCsv sorts orders newest-first and escapes commas cleanly', () => {
  const csv = salesOrdersToCsv(SAMPLE_ORDERS);
  const lines = csv.split('\n');
  assert.equal(lines.length, 3);
  assert.match(lines[0], /^Order ID,Order Date,Customer Name/);
  // ORD-101 (Nov 18) comes before ORD-100 (Nov 17)
  assert.match(lines[1], /^ORD-101,/);
  assert.match(lines[2], /^ORD-100,.*"Chouf, Mount Lebanon".*,2,2498\.00,0\.00,2\.00,2500\.00$/);
});

test('combinedInventoryAndSalesToCsv includes EXECUTIVE SUMMARY, CURRENT INVENTORY, and SALES & ORDERS sections', () => {
  const csv = combinedInventoryAndSalesToCsv(
    SAMPLE_PRODUCTS,
    SAMPLE_ORDERS,
    new Date('2026-11-18T12:00:00Z')
  );
  assert.match(csv, /REPORT SECTION,EXECUTIVE SUMMARY/);
  assert.match(csv, /Total Inventory Valuation \(USD\),10232\.00/);
  assert.match(csv, /Total Verified Sales Revenue \(USD\),2500\.00/);
  assert.match(csv, /REPORT SECTION,CURRENT INVENTORY/);
  assert.match(csv, /REPORT SECTION,SALES & ORDERS/);
});
