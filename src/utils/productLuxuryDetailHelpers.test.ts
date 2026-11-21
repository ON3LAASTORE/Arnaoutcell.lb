import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildCapacityOptions,
  buildLuxuryCarouselImages,
  buildQuickReadSummary,
  computeLuxurySubtotal,
  extractOverviewHighlights,
  findCarouselIndexForColor,
  findColorForCarouselImage,
  formatLuxuryUsdPrice,
  getSidekickQuickPrompts,
  resolveAvailableAccordionSections,
  splitDescriptionParagraphs,
  stepCarouselIndex,
  toggleAccordionSection,
} from './productLuxuryDetailHelpers';

test('formatLuxuryUsdPrice formats integer and decimal USD amounts with 2 decimals', () => {
  assert.equal(formatLuxuryUsdPrice(190), '$190.00');
  assert.equal(formatLuxuryUsdPrice(1249.5), '$1,249.50');
  assert.equal(formatLuxuryUsdPrice(-10), '$0.00');
});

test('computeLuxurySubtotal multiplies price by clamped quantity accurately', () => {
  assert.equal(computeLuxurySubtotal(190, 1), 190);
  assert.equal(computeLuxurySubtotal(190, 3), 570);
  assert.equal(computeLuxurySubtotal(19.99, 2), 39.98);
  assert.equal(computeLuxurySubtotal(190, 0), 190);
});

test('buildLuxuryCarouselImages deduplicates gallery images and appends custom color images', () => {
  const images = buildLuxuryCarouselImages({
    images: ['https://example.com/front.jpg', 'https://example.com/front.jpg', 'https://example.com/back.jpg'],
    colorImages: {
      Blue: 'https://example.com/blue.jpg',
      Black: 'https://example.com/front.jpg',
    },
    variants: [],
  });
  assert.deepEqual(images, [
    'https://example.com/front.jpg',
    'https://example.com/back.jpg',
    'https://example.com/blue.jpg',
  ]);
});

test('stepCarouselIndex wraps forward and backward cleanly across carousel bounds', () => {
  assert.equal(stepCarouselIndex(0, 1, 3), 1);
  assert.equal(stepCarouselIndex(2, 1, 3), 0);
  assert.equal(stepCarouselIndex(0, -1, 3), 2);
  assert.equal(stepCarouselIndex(0, 1, 1), 0);
});

test('findCarouselIndexForColor locates the matching color image index in carouselImages', () => {
  const product = {
    colors: ['White', 'Purple'],
    images: ['https://example.com/white.jpg', 'https://example.com/purple.jpg'],
    colorImages: {},
    variants: [],
  };
  const carousel = buildLuxuryCarouselImages(product);
  assert.equal(findCarouselIndexForColor(product, carousel, 'White'), 0);
  assert.equal(findCarouselIndexForColor(product, carousel, 'Purple'), 1);
  assert.equal(findColorForCarouselImage(product, 'https://example.com/purple.jpg'), 'Purple');
  assert.equal(findColorForCarouselImage(product, 'https://example.com/other.jpg'), undefined);
});

test('buildCapacityOptions uses explicit non-color variants first and extracts storage spec fallback cleanly', () => {
  const withVariants = buildCapacityOptions({
    name: 'iPhone 16 Pro Max',
    price: 1199,
    specifications: [],
    variants: [
      { id: 'v-256', name: '256GB', price: 1199, stock: 5, sku: '256' },
      { id: 'v-512', name: '512GB', price: 1399, stock: 3, sku: '512' },
      { id: 'var-color-white', name: 'White', color: 'White', price: 1199, stock: 4, sku: 'WHT' },
    ],
  });
  assert.equal(withVariants.length, 2);
  assert.equal(withVariants[0].label, '256GB');
  assert.equal(withVariants[1].price, 1399);

  const specDerived = buildCapacityOptions({
    name: 'Tecno Spark 50C - 4GB Ram - 128GB Storage',
    price: 190,
    specifications: [],
    variants: [],
  });
  assert.equal(specDerived.length, 1);
  assert.equal(specDerived[0].label, '128GB');
  assert.equal(specDerived[0].isSpecDerived, true);
});

test('getSidekickQuickPrompts returns localized prompts for EN and AR', () => {
  assert.equal(getSidekickQuickPrompts('en').length, 3);
  assert.equal(getSidekickQuickPrompts('ar').length, 3);
});

test('resolveAvailableAccordionSections only includes sections backed by product data', () => {
  const minimalProduct = {
    description: '',
    descriptionAr: '',
    specifications: [],
    warrantyMonths: 0,
    warrantyTerms: '',
    reviews: [],
    reviewCount: 0,
  };
  assert.deepEqual(resolveAvailableAccordionSections(minimalProduct), []);

  const fullProduct = {
    description: 'Flagship titanium smartphone.',
    descriptionAr: 'هاتف رائد.',
    specifications: [{ label: 'Chip', value: 'A18 Pro' }],
    warrantyMonths: 12,
    warrantyTerms: '12 Mo. Agent Warranty',
    reviews: [{ id: 'r1', userName: 'Karim', rating: 5, comment: 'Great', date: '2026-11-01', verifiedPurchase: true }],
    reviewCount: 1,
  };
  assert.deepEqual(resolveAvailableAccordionSections(fullProduct), [
    'overview',
    'specs',
    'delivery',
    'reviews',
  ]);
});

test('extractOverviewHighlights pulls genuine brand, top specs, and warranty highlights', () => {
  const highlights = extractOverviewHighlights(
    {
      brand: 'Apple',
      category: 'Phones',
      warrantyMonths: 12,
      specifications: [
        { label: 'Display', value: '6.9" OLED' },
        { label: 'Chip', value: 'A18 Pro' },
      ],
    },
    'en'
  );
  assert.equal(highlights.length, 4);
  assert.equal(highlights[0].includes('Apple'), true);
  assert.equal(highlights[1], 'Display: 6.9" OLED');
  assert.equal(highlights[3].includes('12 Mo.'), true);
});

test('toggleAccordionSection immutably toggles section keys open and closed', () => {
  const initial = new Set<'overview' | 'specs' | 'delivery' | 'reviews'>(['overview']);
  const openedSpecs = toggleAccordionSection(initial, 'specs');
  assert.equal(openedSpecs.has('overview'), true);
  assert.equal(openedSpecs.has('specs'), true);

  const closedOverview = toggleAccordionSection(openedSpecs, 'overview');
  assert.equal(closedOverview.has('overview'), false);
  assert.equal(closedOverview.has('specs'), true);
});

test('splitDescriptionParagraphs splits double-newline structured copy cleanly', () => {
  const copy =
    'First paragraph about 120Hz display.\n\nSecond paragraph about IP68 & IP69 and 5200mAh battery.';
  const paragraphs = splitDescriptionParagraphs(copy);
  assert.equal(paragraphs.length, 2);
  assert.equal(paragraphs[0].includes('120Hz display'), true);
  assert.equal(paragraphs[1].includes('5200mAh'), true);
  assert.deepEqual(splitDescriptionParagraphs(''), []);
});

test('buildQuickReadSummary distills lead sentence, top specs, and warranty into concise takeaways', () => {
  const summary = buildQuickReadSummary(
    {
      name: 'Tecno Spark 50C - 4GB Ram - 128GB Storage',
      nameAr: 'تكنو سبارك 50C',
      brand: 'Tecno',
      description:
        'The TECNO SPARK 50C combines a 120Hz 6.78-inch display with a MediaTek Helio G81 octa-core processor. Built for daily endurance.',
      descriptionAr: '',
      specifications: [
        { label: 'Display', value: '6.78-inch 120Hz' },
        { label: 'Protection', value: 'IP68 & IP69' },
        { label: 'Battery', value: '5200mAh' },
      ],
      warrantyMonths: 12,
    },
    'en'
  );
  assert.equal(
    summary.headline,
    'The TECNO SPARK 50C combines a 120Hz 6.78-inch display with a MediaTek Helio G81 octa-core processor.'
  );
  assert.equal(summary.takeaways.length, 4);
  assert.equal(summary.takeaways[0], 'Display: 6.78-inch 120Hz');
  assert.equal(summary.takeaways[3].includes('12-Month Official Agent Warranty'), true);
});


