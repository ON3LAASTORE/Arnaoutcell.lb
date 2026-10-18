import test from 'node:test';
import assert from 'node:assert/strict';
import {
  classifyUserIntent,
  normalizeAnalyticsTerm,
  trackSearchQuery,
  computeSearchAnalyticsSummary,
  clearSearchAnalytics,
  SearchAnalyticsEvent,
} from './searchAnalyticsService.ts';

test('classifyUserIntent detects smartphone terms in English and Arabic', () => {
  assert.equal(classifyUserIntent('iPhone 16 Pro Max'), 'flagship_smartphones');
  assert.equal(classifyUserIntent('Samsung Galaxy S25 Ultra'), 'flagship_smartphones');
  assert.equal(classifyUserIntent('هاتف ريدمي جديد'), 'flagship_smartphones');
  assert.equal(classifyUserIntent('سامسونج'), 'flagship_smartphones');
});

test('classifyUserIntent detects charging and power accessories', () => {
  assert.equal(classifyUserIntent('Anker 140W GaN charger'), 'charging_and_power');
  assert.equal(classifyUserIntent('Power bank 24000mAh'), 'charging_and_power');
  assert.equal(classifyUserIntent('شاحن سريع اصلي'), 'charging_and_power');
  assert.equal(classifyUserIntent('وصلة type-c'), 'charging_and_power');
});

test('classifyUserIntent detects wearables and audio gear', () => {
  assert.equal(classifyUserIntent('AirPods Pro 2'), 'wearables_and_audio');
  assert.equal(classifyUserIntent('Galaxy Watch Ultra'), 'wearables_and_audio');
  assert.equal(classifyUserIntent('سماعات رأس لاسلكية'), 'wearables_and_audio');
});

test('classifyUserIntent detects laptops and tablets', () => {
  assert.equal(classifyUserIntent('MacBook Pro M4'), 'laptops_and_computing');
  assert.equal(classifyUserIntent('iPad Air 13'), 'laptops_and_computing');
  assert.equal(classifyUserIntent('لابتوب ديل'), 'laptops_and_computing');
});

test('classifyUserIntent classifies empty or generic queries', () => {
  assert.equal(classifyUserIntent(''), 'general_discovery');
  assert.equal(classifyUserIntent('something random 123'), 'general_discovery');
});

test('normalizeAnalyticsTerm cleans punctuation and excess whitespace', () => {
  assert.equal(
    normalizeAnalyticsTerm('  iPhone 16 Pro???  '),
    'iphone 16 pro'
  );
  assert.equal(
    normalizeAnalyticsTerm('Anker... 737!! (PowerCore)'),
    'anker 737 powercore'
  );
});

test('trackSearchQuery records search event and stores it', async () => {
  clearSearchAnalytics();

  const event = await trackSearchQuery({
    term: 'iPhone 16 Pro',
    source: 'desktop_input_submit',
    categoryMatchesCount: 1,
    productMatchesCount: 3,
  });

  assert.ok(event);
  assert.equal(event?.term, 'iPhone 16 Pro');
  assert.equal(event?.normalizedTerm, 'iphone 16 pro');
  assert.equal(event?.intentPattern, 'flagship_smartphones');
  assert.equal(event?.hasResults, true);
  assert.equal(event?.source, 'desktop_input_submit');
});

test('trackSearchQuery returns null on blank or whitespace queries', async () => {
  const result = await trackSearchQuery({
    term: '   ',
    source: 'desktop_input_submit',
  });
  assert.equal(result, null);
});

test('computeSearchAnalyticsSummary computes accurate ranking and intent distribution', () => {
  const mockEvents: SearchAnalyticsEvent[] = [
    {
      id: '1',
      term: 'iPhone 16 Pro',
      normalizedTerm: 'iphone 16 pro',
      timestamp: '2026-10-18T10:00:00Z',
      source: 'desktop_input_submit',
      intentPattern: 'flagship_smartphones',
      categoryMatchesCount: 1,
      productMatchesCount: 2,
      hasResults: true,
    },
    {
      id: '2',
      term: 'iphone 16 pro',
      normalizedTerm: 'iphone 16 pro',
      timestamp: '2026-10-18T10:05:00Z',
      source: 'mobile_input_submit',
      intentPattern: 'flagship_smartphones',
      categoryMatchesCount: 1,
      productMatchesCount: 2,
      hasResults: true,
    },
    {
      id: '3',
      term: 'Anker 737 Charger',
      normalizedTerm: 'anker 737 charger',
      timestamp: '2026-10-18T10:10:00Z',
      source: 'trending_term_click',
      intentPattern: 'charging_and_power',
      categoryMatchesCount: 1,
      productMatchesCount: 1,
      hasResults: true,
    },
    {
      id: '4',
      term: 'AirPods Pro',
      normalizedTerm: 'airpods pro',
      timestamp: '2026-10-18T10:15:00Z',
      source: 'product_suggestion_click',
      intentPattern: 'wearables_and_audio',
      categoryMatchesCount: 1,
      productMatchesCount: 1,
      hasResults: true,
    },
  ];

  const summary = computeSearchAnalyticsSummary(mockEvents, 5);

  assert.equal(summary.totalSearches, 4);
  assert.equal(summary.uniqueTermsCount, 3);

  // Top term must be iPhone 16 Pro with count 2
  assert.equal(summary.topTerms[0].term, 'iPhone 16 Pro');
  assert.equal(summary.topTerms[0].count, 2);
  assert.equal(summary.topTerms[0].primaryIntent, 'flagship_smartphones');

  // Intent distribution
  const flagshipIntent = summary.intentDistribution.find(
    (d) => d.intent === 'flagship_smartphones'
  );
  assert.ok(flagshipIntent);
  assert.equal(flagshipIntent?.count, 2);
  assert.equal(flagshipIntent?.percentage, 50); // 2 out of 4 = 50%
});
