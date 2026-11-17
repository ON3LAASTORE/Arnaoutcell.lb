import test from 'node:test';
import assert from 'node:assert/strict';
import { INITIAL_CATEGORIES, INITIAL_PRODUCTS } from '../data/initialData';
import {
  buildCategoryBannerItems,
  mergeDynamicCategories,
  resolveCategoryBannerTheme,
  sortDynamicCategories,
} from './categoryBannerHelpers';

test('resolveCategoryBannerTheme maps hardware categories to distinct editorial visual themes', () => {
  const phones = INITIAL_CATEGORIES.find((c) => c.slug === 'phones')!;
  const laptops = INITIAL_CATEGORIES.find((c) => c.slug === 'laptops')!;
  const audio = INITIAL_CATEGORIES.find((c) => c.slug === 'airpods-wireless-earbuds')!;
  const watches = INITIAL_CATEGORIES.find((c) => c.slug === 'smartwatches')!;
  const power = INITIAL_CATEGORIES.find((c) => c.slug === 'power-banks')!;
  const speakers = INITIAL_CATEGORIES.find((c) => c.slug === 'speakers')!;

  assert.equal(resolveCategoryBannerTheme(phones), 'phones');
  assert.equal(resolveCategoryBannerTheme(laptops), 'laptops');
  assert.equal(resolveCategoryBannerTheme(audio), 'audio');
  assert.equal(resolveCategoryBannerTheme(watches), 'wearables');
  assert.equal(resolveCategoryBannerTheme(power), 'power');
  assert.equal(resolveCategoryBannerTheme(speakers), 'smarthome');
});

test('buildCategoryBannerItems returns 6 balanced featured visual banners by default', () => {
  const items = buildCategoryBannerItems(INITIAL_CATEGORIES, INITIAL_PRODUCTS, false);
  assert.equal(items.length, 6);

  const uniqueThemes = new Set(items.map((item) => item.theme));
  assert.equal(uniqueThemes.size, 6);

  items.forEach((item) => {
    assert.ok(item.titleEn.length > 0);
    assert.ok(item.titleAr.length > 0);
    assert.ok(item.subtitleEn.length > 0);
    assert.ok(item.subtitleAr.length > 0);
  });
});

test('buildCategoryBannerItems returns all categories when showAll is enabled', () => {
  const items = buildCategoryBannerItems(INITIAL_CATEGORIES, INITIAL_PRODUCTS, true);
  assert.equal(items.length, INITIAL_CATEGORIES.length);
});

test('sortDynamicCategories and mergeDynamicCategories preserve Firestore overrides cleanly', () => {
  const cloudCat = {
    id: 'cat-vr',
    name: 'VR Headsets',
    nameAr: 'نظارات الواقع الافتراضي',
    slug: 'vr-headsets',
    iconName: 'Eye',
    image: 'https://example.com/vr.jpg',
    description: 'Immersive spatial headsets',
    featured: true,
    displayOrder: 2,
    subcategories: ['Mixed Reality', 'Controllers'],
  };

  const merged = mergeDynamicCategories([cloudCat], INITIAL_CATEGORIES.slice(0, 2));
  assert.equal(merged.length, 3);
  assert.equal(merged[0].id, 'cat-phones');
  assert.equal(merged[1].id, 'cat-laptops');
  assert.equal(merged[2].id, 'cat-vr');

  const sorted = sortDynamicCategories([
    { ...cloudCat, displayOrder: 0 },
    INITIAL_CATEGORIES[0],
  ]);
  assert.equal(sorted[0].id, 'cat-vr');

  const items = buildCategoryBannerItems(merged, INITIAL_PRODUCTS, true);
  const vrBanner = items.find((i) => i.category.id === 'cat-vr')!;
  assert.equal(vrBanner.imageUrl, 'https://example.com/vr.jpg');
  assert.equal(vrBanner.subtitleEn, 'Immersive spatial headsets');
});

