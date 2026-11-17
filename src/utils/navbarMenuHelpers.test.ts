import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getHamburgerMenuItems,
  isHamburgerMenuItemActive,
} from './navbarMenuHelpers';

test('getHamburgerMenuItems returns all 8 navigation items in exact priority order (EN)', () => {
  const items = getHamburgerMenuItems('en');
  assert.equal(items.length, 8);
  assert.deepEqual(
    items.map((item) => item.label),
    [
      'Special Offers',
      'New Arrivals',
      'Best Sellers',
      'Brands',
      'Product Videos',
      'Services & Support',
      'Track Order',
      'Contact Us',
    ]
  );

  assert.equal(items[0].iconType, 'flame');
  assert.equal(items[0].isHighlighted, true);
  assert.equal(items[1].filterPreset, 'new');
  assert.equal(items[2].filterPreset, 'bestseller');
  assert.equal(items[4].iconType, 'video');
});

test('getHamburgerMenuItems returns full Arabic localization (AR)', () => {
  const items = getHamburgerMenuItems('ar');
  assert.equal(items.length, 8);
  assert.equal(items[0].isHighlighted, true);
  assert.equal(items[0].iconType, 'flame');
  assert.equal(items[4].iconType, 'video');
  assert.ok(items.every((item) => item.label.trim().length > 0));
});

test('isHamburgerMenuItemActive distinguishes views and New Arrivals vs Best Sellers presets', () => {
  const items = getHamburgerMenuItems('en');
  const offers = items[0];
  const newArrivals = items[1];
  const bestSellers = items[2];
  const brands = items[3];

  assert.equal(isHamburgerMenuItemActive(offers, 'offers', 'all'), true);
  assert.equal(isHamburgerMenuItemActive(brands, 'offers', 'all'), false);

  assert.equal(isHamburgerMenuItemActive(newArrivals, 'products', 'new'), true);
  assert.equal(isHamburgerMenuItemActive(bestSellers, 'products', 'new'), false);
  assert.equal(isHamburgerMenuItemActive(bestSellers, 'products', 'bestseller'), true);
  assert.equal(isHamburgerMenuItemActive(newArrivals, 'products', 'all'), false);
});
