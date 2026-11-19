import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildPdpColorSwatches,
  buildPdpGalleryItems,
  buildPdpPurchaseMetrics,
  buildPdpSocialProof,
  buildPdpTitleWithColor,
  getPdpServiceFeatures,
} from './productDetailHelpers';

test('buildPdpPurchaseMetrics calculates exact Save % tag from $19 vs $30 (37%)', () => {
  const metrics = buildPdpPurchaseMetrics(
    { price: 19, originalPrice: 30, discountPercentage: 37 },
    undefined,
    'en'
  );
  assert.equal(metrics.activePrice, 19);
  assert.equal(metrics.regularPrice, 30);
  assert.equal(metrics.discountPercent, 37);
  assert.equal(metrics.formattedActivePrice, '$19');
  assert.equal(metrics.formattedRegularPrice, '$30');
  assert.equal(metrics.savePercentLabel, 'Save 37%');

  const arMetrics = buildPdpPurchaseMetrics(
    { price: 19, originalPrice: 30, discountPercentage: 37 },
    undefined,
    'ar'
  );
  assert.equal(arMetrics.savePercentLabel, 'وفّر 37%');
});

test('buildPdpPurchaseMetrics adjusts pricing cleanly when variant is selected', () => {
  const metrics = buildPdpPurchaseMetrics(
    { price: 19, originalPrice: 30, discountPercentage: 37 },
    { price: 24 },
    'en'
  );
  assert.equal(metrics.activePrice, 24);
  assert.equal(metrics.discountPercent, 20);
  assert.equal(metrics.savePercentLabel, 'Save 20%');
});

test('buildPdpTitleWithColor appends active color cleanly without duplication', () => {
  assert.equal(
    buildPdpTitleWithColor('ACEFAST N8 NECK EARPHONES WIRELESS', 'Black'),
    'ACEFAST N8 NECK EARPHONES WIRELESS - Black'
  );
  assert.equal(
    buildPdpTitleWithColor('ACEFAST N8 NECK EARPHONES WIRELESS - Black', 'Black'),
    'ACEFAST N8 NECK EARPHONES WIRELESS - Black'
  );
  assert.equal(
    buildPdpTitleWithColor('Universal Capacitive Pen V1', undefined),
    'Universal Capacitive Pen V1'
  );
});

test('buildPdpGalleryItems orders hero image, video preview slot, and secondary images cleanly', () => {
  const items = buildPdpGalleryItems({
    id: 'prod-n8',
    name: 'ACEFAST N8 NECK EARPHONES WIRELESS',
    images: ['https://example.com/1.jpg', 'https://example.com/2.jpg', 'https://example.com/3.jpg'],
    videoUrl: 'https://youtube.com/watch?v=demo',
  });

  assert.equal(items.length, 4);
  assert.equal(items[0].kind, 'image');
  assert.equal(items[1].kind, 'video');
  assert.equal(items[1].videoUrl, 'https://youtube.com/watch?v=demo');
  assert.equal(items[2].kind, 'image');
  assert.equal(items[3].kind, 'image');
});

test('buildPdpColorSwatches maps miniature thumbnails and formatted price per color', () => {
  const swatches = buildPdpColorSwatches(
    {
      colors: ['Black', 'Silver'],
      images: ['https://example.com/black.jpg'],
    },
    19
  );

  assert.equal(swatches.length, 2);
  assert.equal(swatches[0].color, 'Black');
  assert.equal(swatches[0].formattedPrice, '$19');
  assert.equal(swatches[0].isLightTone, false);
  assert.equal(swatches[1].color, 'Silver');
  assert.equal(swatches[1].isLightTone, true);

  const customSwatches = buildPdpColorSwatches(
    {
      colors: ['Desert Titanium', 'White Titanium'],
      images: ['https://example.com/desert.jpg'],
      colorImages: { 'White Titanium': 'https://example.com/white-titanium.jpg' },
      variants: [
        { id: 'var-color-white', name: 'White Titanium', color: 'White Titanium', price: 1299, stock: 3, sku: 'WHT' },
      ],
    },
    1199
  );
  assert.equal(customSwatches[0].thumbnailUrl, 'https://example.com/desert.jpg');
  assert.equal(customSwatches[0].formattedPrice, '$1199');
  assert.equal(customSwatches[1].thumbnailUrl, 'https://example.com/white-titanium.jpg');
  assert.equal(customSwatches[1].isLightTone, false);
  assert.equal(customSwatches[1].formattedPrice, '$1299');
});

test('buildPdpSocialProof and getPdpServiceFeatures format EN and AR social proof cleanly', () => {
  const proofEn = buildPdpSocialProof(
    {
      name: 'ACEFAST N8 NECK EARPHONES WIRELESS',
      category: 'Earphones & Headphones',
      isBestSeller: true,
      reviewCount: 1,
      rating: 5,
    },
    'en'
  );
  assert.equal(proofEn.topSellingLabel, 'Top Selling in Earphones & Headphones');
  assert.equal(proofEn.reviewsText, '(1 Reviews)');
  assert.equal(proofEn.soldText, '100+ Sold');

  const servicesEn = getPdpServiceFeatures('en');
  assert.equal(servicesEn.length, 3);
  assert.equal(servicesEn[0].title, 'Express Delivery');
  assert.equal(servicesEn[1].title, 'Return Eligible');
  assert.equal(servicesEn[2].title, 'Trusted Shipping');

  const servicesAr = getPdpServiceFeatures('ar');
  assert.equal(servicesAr.length, 3);
});
