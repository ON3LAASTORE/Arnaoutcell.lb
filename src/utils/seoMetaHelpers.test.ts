import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildProductMetaDescription,
  buildRouteSeoMetadata,
  resolveDynamicOgImage,
  truncateMetaDescription,
} from './seoMetaHelpers';
import { INITIAL_BRANDS, INITIAL_CATEGORIES, INITIAL_PRODUCTS } from '../data/initialData';

test('truncateMetaDescription enforces max length on word boundaries cleanly', () => {
  const short = 'Short clean description.';
  assert.equal(truncateMetaDescription(short, 160), short);

  const long =
    'Authentic Apple iPhone 16 Pro Max 256GB Desert Titanium flagship smartphone powered by A18 Pro chip with titanium enclosure, 48MP camera system, warranty and fast delivery.';
  const truncated = truncateMetaDescription(long, 160);
  assert.ok(truncated.length <= 160);
  assert.ok(truncated.endsWith('…'));
});

test('buildProductMetaDescription generates specific inventory details within 160 chars in EN and AR', () => {
  const sample = INITIAL_PRODUCTS[0];
  const enDesc = buildProductMetaDescription(sample, 'en', 'ON ALAA STORE');
  assert.ok(enDesc.length <= 160);
  assert.ok(enDesc.includes(sample.name));
  assert.ok(enDesc.includes(`$${sample.price}`));
  assert.ok(enDesc.includes(sample.sku));
  assert.ok(enDesc.includes('In Stock'));

  const outOfStockDiscounted = {
    ...sample,
    stock: 0,
    price: 999,
    originalPrice: 1200,
    discountPercentage: 17,
    warrantyMonths: 24,
  };
  const enOutDesc = buildProductMetaDescription(outOfStockDiscounted, 'en', 'ON ALAA STORE');
  assert.ok(enOutDesc.length <= 160);
  assert.ok(enOutDesc.includes('$999'));
  assert.ok(enOutDesc.includes('17% off'));
  assert.ok(enOutDesc.includes('Out of Stock'));
  assert.ok(enOutDesc.includes('24-mo warranty'));

  const arDesc = buildProductMetaDescription(sample, 'ar', 'ON ALAA STORE');
  assert.ok(arDesc.length <= 160);
  assert.ok(arDesc.includes(sample.sku));
  assert.ok(arDesc.includes(`$${sample.price}`));
});

test('resolveDynamicOgImage selects valid non-data product, color, variant, category, and offer images dynamically', () => {
  const origin = 'https://onalaastore.example.com';

  // Skips data: URL on images[0] and resolves variant image cleanly
  const dataImageProduct = {
    ...INITIAL_PRODUCTS[0],
    images: ['data:image/png;base64,iVBORw0KGgo='],
    colors: undefined,
    colorImages: undefined,
    variants: [
      { id: 'v1', name: '256GB', price: 1249, stock: 4, sku: 'APL-IP16PM-256', image: '/variant-phone.png' },
    ],
  };

  const productOg = resolveDynamicOgImage({
    currentView: 'product-detail',
    activeProduct: dataImageProduct,
    products: INITIAL_PRODUCTS,
    brands: INITIAL_BRANDS,
    logoUrl: '/on-alaa-store-profile.png',
    origin,
    lang: 'en',
    storeName: 'ON ALAA STORE',
  });
  assert.equal(productOg.url, 'https://onalaastore.example.com/variant-phone.png');
  assert.ok(productOg.alt.includes(dataImageProduct.name));

  // Category filter uses explicit category image when set, or top category product image
  const phonesCat = { ...INITIAL_CATEGORIES[0], image: '/banners/phones-hero.jpg' };
  const explicitCatOg = resolveDynamicOgImage({
    currentView: 'products',
    activeCategory: phonesCat,
    products: INITIAL_PRODUCTS,
    brands: INITIAL_BRANDS,
    logoUrl: '/on-alaa-store-profile.png',
    origin,
    lang: 'en',
    storeName: 'ON ALAA STORE',
  });
  assert.equal(explicitCatOg.url, 'https://onalaastore.example.com/banners/phones-hero.jpg');

  const noBannerCat = { ...INITIAL_CATEGORIES[0], image: undefined };
  const derivedCatOg = resolveDynamicOgImage({
    currentView: 'products',
    activeCategory: noBannerCat,
    products: INITIAL_PRODUCTS,
    brands: INITIAL_BRANDS,
    logoUrl: '/on-alaa-store-profile.png',
    origin,
    lang: 'en',
    storeName: 'ON ALAA STORE',
  });
  assert.ok(derivedCatOg.url.startsWith('https://'));
  assert.notEqual(derivedCatOg.url, `${origin}/on-alaa-store-profile.png`);

  // Offers view selects top discounted offer product image dynamically
  const offersOg = resolveDynamicOgImage({
    currentView: 'offers',
    products: INITIAL_PRODUCTS,
    brands: INITIAL_BRANDS,
    logoUrl: '/on-alaa-store-profile.png',
    origin,
    lang: 'en',
    storeName: 'ON ALAA STORE',
  });
  assert.ok(offersOg.url.startsWith('https://'));
  assert.notEqual(offersOg.url, `${origin}/on-alaa-store-profile.png`);
  assert.ok(offersOg.alt.includes('Flash Tech Deal'));
});

test('buildRouteSeoMetadata enforces robots noindex on private views and rich inventory meta on storefront views', () => {
  const origin = 'https://onalaastore.example.com';

  const checkoutSeo = buildRouteSeoMetadata({
    currentView: 'checkout',
    products: INITIAL_PRODUCTS,
    categories: INITIAL_CATEGORIES,
    brands: INITIAL_BRANDS,
    lang: 'en',
    storeName: 'ON ALAA STORE',
    logoUrl: '/on-alaa-store-profile.png',
    origin,
  });
  assert.equal(checkoutSeo.robots, 'noindex, nofollow');

  const adminSeo = buildRouteSeoMetadata({
    currentView: 'admin',
    products: INITIAL_PRODUCTS,
    categories: INITIAL_CATEGORIES,
    brands: INITIAL_BRANDS,
    lang: 'en',
    storeName: 'ON ALAA STORE',
    logoUrl: '/on-alaa-store-profile.png',
    origin,
  });
  assert.equal(adminSeo.robots, 'noindex, nofollow');

  const categorySeo = buildRouteSeoMetadata({
    currentView: 'products',
    activeCategory: INITIAL_CATEGORIES[0],
    products: INITIAL_PRODUCTS,
    categories: INITIAL_CATEGORIES,
    brands: INITIAL_BRANDS,
    lang: 'en',
    storeName: 'ON ALAA STORE',
    logoUrl: '/on-alaa-store-profile.png',
    origin,
  });
  assert.equal(categorySeo.robots, 'index, follow');
  assert.ok(categorySeo.metaDescription.length <= 160);
  assert.ok(categorySeo.metaDescription.includes(INITIAL_CATEGORIES[0].name));
});
