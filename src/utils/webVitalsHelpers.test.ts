import test from 'node:test';
import assert from 'node:assert/strict';
import {
  RESPONSIVE_IMAGE_WIDTHS,
  DEFAULT_RESPONSIVE_SIZES,
  buildNextGenResponsiveSources,
  buildImageSrcSetAttributes,
  resolveImageLoadingConfig,
  resolveExplicitImageDimensions,
  shouldDeferMediaDownload,
} from './webVitalsHelpers';

test('buildNextGenResponsiveSources generates AVIF, WebP, and 4K fallback srcsets for Unsplash CDN URLs', () => {
  const result = buildNextGenResponsiveSources(
    'https://images.unsplash.com/photo-1695048133142-1a20484d2569'
  );

  assert.equal(result.isResponsiveSupported, true);
  assert.equal(result.sizes, DEFAULT_RESPONSIVE_SIZES);
  assert.ok(RESPONSIVE_IMAGE_WIDTHS.includes(320));

  for (const width of RESPONSIVE_IMAGE_WIDTHS) {
    assert.ok(result.avifSrcSet.includes(`fm=avif`), 'avifSrcSet includes fm=avif');
    assert.ok(result.avifSrcSet.includes(`w=${width}`), `avifSrcSet includes w=${width}`);
    assert.ok(result.avifSrcSet.includes(` ${width}w`), `avifSrcSet includes ${width}w descriptor`);

    assert.ok(result.webpSrcSet.includes(`fm=webp`), 'webpSrcSet includes fm=webp');
    assert.ok(result.webpSrcSet.includes(`w=${width}`), `webpSrcSet includes w=${width}`);
    assert.ok(result.webpSrcSet.includes(` ${width}w`), `webpSrcSet includes ${width}w descriptor`);

    assert.ok(result.fallbackSrcSet.includes(`w=${width}`), `fallbackSrcSet includes w=${width}`);
    assert.equal(result.fallbackSrcSet.includes('fm='), false);
  }
});

test('buildNextGenResponsiveSources preserves 3840w 4K candidate and accepts custom sizes', () => {
  const result = buildNextGenResponsiveSources(
    'https://images.unsplash.com/photo-1598327105666-5b89351aff97',
    '(max-width: 768px) 100vw, 33vw'
  );

  assert.equal(result.sizes, '(max-width: 768px) 100vw, 33vw');
  assert.ok(result.avifSrcSet.endsWith('3840w'));
  assert.ok(result.webpSrcSet.endsWith('3840w'));
  assert.ok(result.fallbackSrcSet.endsWith('3840w'));
});

test('buildNextGenResponsiveSources skips local, data, and non-CDN URLs safely', () => {
  for (const url of [
    '/on-alaa-store-profile.png',
    'data:image/png;base64,iVBORw0',
    'blob:https://example.com/123',
    'https://cdn.example.com/device.png',
    '',
  ]) {
    const res = buildNextGenResponsiveSources(url);
    assert.equal(res.isResponsiveSupported, false);
    assert.equal(res.avifSrcSet, '');
    assert.equal(res.webpSrcSet, '');
    assert.equal(res.fallbackSrcSet, '');
  }
});

test('buildImageSrcSetAttributes emits responsive srcSet for Unsplash, local, and external URLs while skipping data/blob URIs', () => {
  const unsplash = buildImageSrcSetAttributes(
    'https://images.unsplash.com/photo-1598327105666-5b89351aff97',
    '(max-width: 640px) 50vw, 25vw',
    800
  );
  assert.ok(unsplash.avifSrcSet?.includes('320w'));
  assert.ok(unsplash.webpSrcSet?.includes('3840w'));
  assert.ok(unsplash.srcSet?.includes('320w'));
  assert.equal(unsplash.sizes, '(max-width: 640px) 50vw, 25vw');

  const localProduct = buildImageSrcSetAttributes(
    '/images/tecno_spark_black_1795262250150.jpg',
    '(max-width: 640px) 50vw, 25vw',
    800
  );
  assert.equal(localProduct.avifSrcSet, undefined);
  assert.equal(localProduct.srcSet, '/images/tecno_spark_black_1795262250150.jpg 800w');
  assert.equal(localProduct.sizes, '(max-width: 640px) 50vw, 25vw');

  const externalBrand = buildImageSrcSetAttributes('https://cdn.example.com/brand logo.png', '140px', 240);
  assert.equal(externalBrand.srcSet, 'https://cdn.example.com/brand%20logo.png 240w');
  assert.equal(externalBrand.sizes, '140px');

  assert.deepEqual(buildImageSrcSetAttributes('data:image/png;base64,abc,def', '64px', 64), {});
  assert.deepEqual(buildImageSrcSetAttributes('blob:https://example.com/id', '64px', 64), {});
  assert.deepEqual(buildImageSrcSetAttributes('', '64px', 64), {});
});

test('resolveImageLoadingConfig avoids contradictory lazy + high fetchPriority combinations', () => {
  assert.deepEqual(resolveImageLoadingConfig(false), {
    loading: 'lazy',
    decoding: 'async',
    fetchPriority: 'low',
  });
  assert.deepEqual(resolveImageLoadingConfig(true), {
    loading: 'eager',
    decoding: 'sync',
    fetchPriority: 'high',
  });
  assert.deepEqual(resolveImageLoadingConfig(true, 'lazy'), {
    loading: 'lazy',
    decoding: 'async',
    fetchPriority: 'low',
  });
  assert.deepEqual(resolveImageLoadingConfig(false, 'eager'), {
    loading: 'eager',
    decoding: 'async',
    fetchPriority: 'low',
  });
});

test('resolveExplicitImageDimensions provides non-zero HTML dimensions and aspectRatio for CLS prevention', () => {
  assert.deepEqual(resolveExplicitImageDimensions(undefined, undefined), {
    width: 800,
    height: 800,
    aspectRatio: '800 / 800',
  });

  assert.deepEqual(resolveExplicitImageDimensions(48, 48), {
    width: 48,
    height: 48,
    aspectRatio: '48 / 48',
  });

  assert.deepEqual(resolveExplicitImageDimensions('640', undefined, 16, 9), {
    width: 640,
    height: 360,
    aspectRatio: '640 / 360',
  });

  assert.deepEqual(resolveExplicitImageDimensions(0, -10, 400, 300), {
    width: 400,
    height: 300,
    aspectRatio: '400 / 300',
  });
});

test('shouldDeferMediaDownload defers non-priority offscreen media cleanly', () => {
  assert.equal(shouldDeferMediaDownload(false, false), true);
  assert.equal(shouldDeferMediaDownload(false, true), false);
  assert.equal(shouldDeferMediaDownload(true, false), false);
  assert.equal(shouldDeferMediaDownload(true, true), false);
});
