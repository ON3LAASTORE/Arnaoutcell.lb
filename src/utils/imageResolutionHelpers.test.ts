import test from 'node:test';
import assert from 'node:assert/strict';
import {
  FOUR_K_MAX_WIDTH,
  FOUR_K_MAX_HEIGHT,
  DEFAULT_FULL_RES_FALLBACK_IMAGE,
  resolveFullResolutionImageUrl,
  stripRestrictiveImageAttributes,
  preserveDimensionsUpToFourK,
} from './imageResolutionHelpers';

test('4K constants match standard 3840x2160 resolution', () => {
  assert.equal(FOUR_K_MAX_WIDTH, 3840);
  assert.equal(FOUR_K_MAX_HEIGHT, 2160);
  assert.equal(
    DEFAULT_FULL_RES_FALLBACK_IMAGE,
    'https://images.unsplash.com/photo-1598327105666-5b89351aff97'
  );
});

test('resolveFullResolutionImageUrl strips Unsplash downscaling and compression params', () => {
  assert.equal(
    resolveFullResolutionImageUrl(
      'https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=800&auto=format&fit=crop&q=80'
    ),
    'https://images.unsplash.com/photo-1695048133142-1a20484d2569'
  );

  assert.equal(
    resolveFullResolutionImageUrl(
      'https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=160&q=80&dpr=2'
    ),
    'https://images.unsplash.com/photo-1598327105666-5b89351aff97'
  );

  assert.equal(
    resolveFullResolutionImageUrl(
      'https://images.unsplash.com/photo-1511707171634-5f897ff02597?w=800'
    ),
    'https://images.unsplash.com/photo-1598327105666-5b89351aff97'
  );
});

test('resolveFullResolutionImageUrl preserves non-thumbnail params, data URLs, and local assets', () => {
  assert.equal(
    resolveFullResolutionImageUrl('/on-alaa-store-profile.png'),
    '/on-alaa-store-profile.png'
  );
  assert.equal(
    resolveFullResolutionImageUrl('data:image/png;base64,abc123'),
    'data:image/png;base64,abc123'
  );
  assert.equal(
    resolveFullResolutionImageUrl('https://cdn.example.com/hero.png?version=2'),
    'https://cdn.example.com/hero.png?version=2'
  );
  assert.equal(resolveFullResolutionImageUrl('   '), '');
  assert.equal(resolveFullResolutionImageUrl(null), '');
});

test('stripRestrictiveImageAttributes removes srcSet, srcset, and sizes while keeping valid props', () => {
  const input = {
    srcSet: 'small.jpg 400w, medium.jpg 800w',
    srcset: 'thumb.jpg 200w',
    sizes: '(max-width: 600px) 100vw, 500px',
    referrerPolicy: 'no-referrer',
    id: 'product-hero',
  };

  const result = stripRestrictiveImageAttributes(input);
  assert.equal('srcSet' in result, false);
  assert.equal('srcset' in result, false);
  assert.equal('sizes' in result, false);
  assert.equal(result.referrerPolicy, 'no-referrer');
  assert.equal(result.id, 'product-hero');
});

test('preserveDimensionsUpToFourK never downscales images at or below 3840x2160', () => {
  assert.deepEqual(preserveDimensionsUpToFourK(3840, 2160), { width: 3840, height: 2160 });
  assert.deepEqual(preserveDimensionsUpToFourK(1920, 1080), { width: 1920, height: 1080 });
  assert.deepEqual(preserveDimensionsUpToFourK(1254, 1254), { width: 1254, height: 1254 });
  // Only scales proportionally if exceeding 4K bounds
  assert.deepEqual(preserveDimensionsUpToFourK(7680, 4320), { width: 3840, height: 2160 });
});
