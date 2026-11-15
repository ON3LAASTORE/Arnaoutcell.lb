import test from 'node:test';
import assert from 'node:assert/strict';
import {
  RESPONSIVE_IMAGE_WIDTHS,
  DEFAULT_RESPONSIVE_SIZES,
  buildNextGenResponsiveSources,
  resolveExplicitImageDimensions,
  shouldDeferMediaDownload,
} from './webVitalsHelpers';

test('buildNextGenResponsiveSources generates AVIF, WebP, and 4K fallback srcsets for Unsplash CDN URLs', () => {
  const result = buildNextGenResponsiveSources(
    'https://images.unsplash.com/photo-1695048133142-1a20484d2569'
  );

  assert.equal(result.isResponsiveSupported, true);
  assert.equal(result.sizes, DEFAULT_RESPONSIVE_SIZES);

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
