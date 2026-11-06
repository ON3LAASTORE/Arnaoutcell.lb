import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isAboveTheFold,
  resolveImageSource,
  getRecommendedRootMargin,
} from './lazyLoadingHelpers';

test('isAboveTheFold correctly flags critical initial items', () => {
  // Default limit = 2
  assert.equal(isAboveTheFold({ index: 0 }), true);
  assert.equal(isAboveTheFold({ index: 1 }), true);
  assert.equal(isAboveTheFold({ index: 2 }), false);
  assert.equal(isAboveTheFold({ index: 5 }), false);

  // Custom limit = 4 (e.g. desktop hero grid)
  assert.equal(isAboveTheFold({ index: 3, viewportItemLimit: 4 }), true);
  assert.equal(isAboveTheFold({ index: 4, viewportItemLimit: 4 }), false);
});

test('resolveImageSource handles valid and empty strings gracefully', () => {
  const fallback = 'https://images.unsplash.com/default.jpg';

  assert.equal(resolveImageSource('https://example.com/phone.png', fallback), 'https://example.com/phone.png');
  assert.equal(resolveImageSource('', fallback), fallback);
  assert.equal(resolveImageSource('   ', fallback), fallback);
  assert.equal(resolveImageSource(null, fallback), fallback);
  assert.equal(resolveImageSource(undefined, fallback), fallback);
});

test('getRecommendedRootMargin adjusts margin for mobile flick scroll', () => {
  assert.equal(getRecommendedRootMargin(false), '200px 0px');
  assert.equal(getRecommendedRootMargin(true), '300px 0px');
});
