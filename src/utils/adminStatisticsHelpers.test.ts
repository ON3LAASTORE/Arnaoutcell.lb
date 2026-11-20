import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildDailySalesAndTrafficSeries,
  computeCategorySalesBreakdown,
  dailyStatsToCsv,
  generateDateKeysWindow,
  summarizeDailySalesAndTraffic,
} from './adminStatisticsHelpers.ts';
import type { Order, Product } from '../types';

const SAMPLE_DATE = new Date('2026-11-18T12:00:00Z');

test('generateDateKeysWindow builds exact chronological YYYY-MM-DD sequence', () => {
  const keys = generateDateKeysWindow(7, SAMPLE_DATE);
  assert.equal(keys.length, 7);
  assert.equal(keys[0], '2026-11-12');
  assert.equal(keys[6], '2026-11-18');
});

test('buildDailySalesAndTrafficSeries aggregates live orders and traffic in live_only mode and ignores cancelled orders', () => {
  const orders: Order[] = [
    {
      id: 'ORD-1',
      customer: { fullName: 'A', phone: '03', cityArea: 'Chouf', addressLine: 'X' },
      items: [
        { productId: 'p1', productName: 'iPhone', brand: 'Apple', price: 1000, quantity: 2, image: '' },
      ],
      subtotal: 2000,
      discount: 0,
      deliveryFee: 0,
      total: 2000,
      currency: 'USD',
      status: 'delivered',
      paymentMethod: 'cod',
      paymentStatus: 'paid',
      orderDate: '2026-11-18T10:00:00Z',
      statusHistory: [],
    },
    {
      id: 'ORD-CANCELLED',
      customer: { fullName: 'B', phone: '03', cityArea: 'Beirut', addressLine: 'Y' },
      items: [
        { productId: 'p1', productName: 'iPhone', brand: 'Apple', price: 900, quantity: 1, image: '' },
      ],
      subtotal: 900,
      discount: 0,
      deliveryFee: 0,
      total: 900,
      currency: 'USD',
      status: 'cancelled',
      paymentMethod: 'cod',
      paymentStatus: 'pending',
      orderDate: '2026-11-18T11:00:00Z',
      statusHistory: [],
    },
  ];

  const series = buildDailySalesAndTrafficSeries({
    orders,
    trafficStore: {
      '2026-11-18': { visits: 24, productViews: 40 },
    },
    searchEvents: [
      {
        id: 's1',
        term: 'iphone',
        normalizedTerm: 'iphone',
        timestamp: '2026-11-18T09:00:00Z',
        source: 'desktop_input_submit',
        intentPattern: 'flagship_smartphones',
        categoryMatchesCount: 1,
        productMatchesCount: 2,
        hasResults: true,
      },
    ],
    rangeDays: 7,
    dataMode: 'live_only',
    now: SAMPLE_DATE,
  });

  assert.equal(series.length, 7);
  const today = series[6];
  assert.equal(today.dateKey, '2026-11-18');
  assert.equal(today.revenueUsd, 2000);
  assert.equal(today.unitsSold, 2);
  assert.equal(today.ordersCount, 1);
  assert.equal(today.visits, 25); // 24 visits + 1 search
  assert.equal(today.productViews, 41); // 40 views + 1 search
  assert.equal(today.conversionRate, 4.0);
});

test('buildDailySalesAndTrafficSeries starts cleanly at zero when no real orders or traffic exist', () => {
  const series = buildDailySalesAndTrafficSeries({
    orders: [],
    trafficStore: {},
    searchEvents: [],
    rangeDays: 14,
    now: SAMPLE_DATE,
  });

  assert.equal(series.length, 14);
  assert.ok(series.every((pt) => pt.revenueUsd === 0 && pt.ordersCount === 0 && pt.unitsSold === 0));

  const summary = summarizeDailySalesAndTraffic(series);
  assert.equal(summary.totalRevenueUsd, 0);
  assert.equal(summary.totalOrdersCount, 0);
  assert.equal(summary.avgOrderValueUsd, 0);
  assert.equal(summary.peakSalesDate, '');

  const emptyCats = computeCategorySalesBreakdown([], [] as unknown as Product[], 6);
  assert.equal(emptyCats.length, 0);
});

test('summarizeDailySalesAndTraffic computes totals, conversion rate, and peak date', () => {
  const summary = summarizeDailySalesAndTraffic([
    {
      dateKey: '2026-11-17',
      labelEn: 'Nov 17',
      labelAr: '17/11',
      revenueUsd: 500,
      unitsSold: 2,
      ordersCount: 1,
      visits: 50,
      productViews: 90,
      searchesCount: 0,
      conversionRate: 2.0,
    },
    {
      dateKey: '2026-11-18',
      labelEn: 'Nov 18',
      labelAr: '18/11',
      revenueUsd: 1500,
      unitsSold: 4,
      ordersCount: 3,
      visits: 150,
      productViews: 260,
      searchesCount: 2,
      conversionRate: 2.0,
    },
  ]);

  assert.equal(summary.totalRevenueUsd, 2000);
  assert.equal(summary.totalUnitsSold, 6);
  assert.equal(summary.totalOrdersCount, 4);
  assert.equal(summary.totalVisits, 200);
  assert.equal(summary.totalProductViews, 350);
  assert.equal(summary.avgConversionRate, 2.0);
  assert.equal(summary.avgOrderValueUsd, 500);
  assert.equal(summary.peakSalesDate, '2026-11-18');
});

test('computeCategorySalesBreakdown groups active orders by matched catalog category', () => {
  const products = [
    { id: 'p1', category: 'smartphones', price: 1200 },
    { id: 'p2', category: 'power-banks', price: 100 },
  ] as unknown as Product[];

  const orders: Order[] = [
    {
      id: 'o1',
      customer: { fullName: 'A', phone: '1', cityArea: 'C', addressLine: 'A' },
      items: [
        { productId: 'p1', productName: 'Phone', brand: 'Apple', price: 1200, quantity: 1, image: '' },
        { productId: 'p2', productName: 'Bank', brand: 'Anker', price: 100, quantity: 3, image: '' },
      ],
      subtotal: 1500,
      discount: 0,
      deliveryFee: 0,
      total: 1500,
      currency: 'USD',
      status: 'delivered',
      paymentMethod: 'cod',
      paymentStatus: 'paid',
      orderDate: '2026-11-18T10:00:00Z',
      statusHistory: [],
    },
  ];

  const categories = computeCategorySalesBreakdown(orders, products, 5);
  assert.equal(categories.length, 2);
  assert.equal(categories[0].categoryLabel, 'Smartphones');
  assert.equal(categories[0].revenueUsd, 1200);
  assert.equal(categories[1].categoryLabel, 'Power Banks');
  assert.equal(categories[1].unitsSold, 3);
});

test('dailyStatsToCsv produces valid CSV header and formatted numeric rows', () => {
  const csv = dailyStatsToCsv([
    {
      dateKey: '2026-11-18',
      labelEn: 'Nov 18',
      labelAr: '18/11',
      revenueUsd: 1250.5,
      unitsSold: 5,
      ordersCount: 3,
      visits: 180,
      productViews: 320,
      searchesCount: 4,
      conversionRate: 1.7,
    },
  ]);

  const lines = csv.split('\n');
  assert.equal(lines.length, 2);
  assert.match(lines[0], /Date,Revenue \(USD\),Units Sold/);
  assert.equal(lines[1], '2026-11-18,1250.50,5,3,180,320,4,1.7');
});
