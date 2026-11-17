import test from 'node:test';
import assert from 'node:assert/strict';
import { INITIAL_CATEGORIES, INITIAL_PRODUCTS } from '../data/initialData';
import {
  filterHeaderSearchProducts,
  getHeaderSubNavLinks,
  isHeaderSubNavActive,
} from './headerSearchHelpers';

test('getHeaderSubNavLinks returns streamlined sub-navbar links in EN and AR', () => {
  const enLinks = getHeaderSubNavLinks('en');
  assert.deepEqual(
    enLinks.map((l) => l.label),
    ['Home', 'Categories', 'Hot Deals', 'Shop', 'Brands', 'Track Order', 'Contact Us']
  );

  const arLinks = getHeaderSubNavLinks('ar');
  assert.equal(arLinks.length, enLinks.length);
  assert.ok(arLinks.every((l) => l.label.trim().length > 0));
});

test('isHeaderSubNavActive highlights the active sub-navbar item accurately', () => {
  const links = getHeaderSubNavLinks('en');
  const home = links.find((l) => l.id === 'home')!;
  const shop = links.find((l) => l.id === 'shop')!;
  const hotDeals = links.find((l) => l.id === 'hot-deals')!;

  assert.equal(isHeaderSubNavActive(home, 'home', 'all'), true);
  assert.equal(isHeaderSubNavActive(shop, 'products', 'all'), true);
  assert.equal(isHeaderSubNavActive(hotDeals, 'offers', 'all'), true);
  assert.equal(isHeaderSubNavActive(home, 'offers', 'all'), false);
});

test('filterHeaderSearchProducts scopes results by selected category slug and search query', () => {
  const allMatch = filterHeaderSearchProducts(
    INITIAL_PRODUCTS,
    INITIAL_CATEGORIES,
    'iPhone',
    'all'
  );
  assert.ok(allMatch.length > 0);
  assert.ok(
    allMatch.every((p) =>
      [p.name, p.nameAr || '', p.brand, p.category, p.subcategory || '', p.sku || '', p.description || '']
        .some((field) => field.toLowerCase().includes('iphone'))
    )
  );

  const scopedPhones = filterHeaderSearchProducts(
    INITIAL_PRODUCTS,
    INITIAL_CATEGORIES,
    'iPhone',
    'phones'
  );
  assert.ok(scopedPhones.length > 0);
  assert.ok(scopedPhones.length <= allMatch.length);
  assert.ok(scopedPhones.every((p) => p.category.toLowerCase() === 'phones'));

  const mismatchedScope = filterHeaderSearchProducts(
    INITIAL_PRODUCTS,
    INITIAL_CATEGORIES,
    'iPhone',
    'laptops'
  );
  assert.equal(mismatchedScope.length, 0);
});
