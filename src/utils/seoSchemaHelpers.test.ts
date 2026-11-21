import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildInventoryItemListSchema,
  buildProductSchema,
  buildStructuredDataGraph,
  collectProductSchemaImages,
  selectInventoryProductsForSchema,
} from './seoSchemaHelpers';
import { INITIAL_PRODUCTS, INITIAL_STORE_SETTINGS } from '../data/initialData';

test('buildProductSchema produces valid Schema.org Product with Offer, shipping, returns, specs, and GTIN', () => {
  const sample = INITIAL_PRODUCTS[0];
  const schema = buildProductSchema(sample, {
    origin: 'https://onalaastore.example.com',
    storeName: 'ON AlAA STORE',
    lang: 'en',
    fallbackImage: 'https://onalaastore.example.com/on-alaa-store-profile.png',
  });

  assert.equal(schema['@type'], 'Product');
  assert.equal(schema.name, sample.name);
  assert.equal(schema.sku, sample.sku);
  assert.equal(schema.mpn, sample.id);
  assert.equal(schema.gtin, sample.barcode);
  assert.deepEqual(schema.brand, { '@type': 'Brand', name: sample.brand });

  const offers = schema.offers as Record<string, unknown>;
  assert.equal(offers['@type'], 'Offer');
  assert.equal(offers.priceCurrency, 'USD');
  assert.equal(offers.price, sample.price);
  assert.equal(offers.availability, 'https://schema.org/InStock');
  assert.ok(offers.shippingDetails);
  assert.ok(offers.hasMerchantReturnPolicy);
  assert.ok(Array.isArray(schema.additionalProperty));
  assert.equal(schema.aggregateRating, undefined);
});

test('buildProductSchema includes aggregateRating and reviews when reviews exist and avoids data URLs', () => {
  const productWithReviews = {
    ...INITIAL_PRODUCTS[0],
    stock: 0,
    images: ['data:image/png;base64,AAAA', '/local-phone.png'],
    rating: 4.8,
    reviewCount: 2,
    reviews: [
      {
        id: 'rev-1',
        userName: 'Karim N.',
        rating: 5,
        comment: 'Original sealed box, delivered to Beirut same day.',
        date: '2026-11-10',
        verifiedPurchase: true,
      },
    ],
  };

  const images = collectProductSchemaImages(
    productWithReviews,
    'https://onalaastore.example.com',
    '/fallback.png'
  );
  assert.ok(images.every((url) => url.startsWith('https://')));
  assert.ok(images.includes('https://onalaastore.example.com/local-phone.png'));

  const schema = buildProductSchema(productWithReviews, {
    origin: 'https://onalaastore.example.com',
    storeName: 'ON AlAA STORE',
    lang: 'en',
  });

  const offers = schema.offers as Record<string, unknown>;
  assert.equal(offers.availability, 'https://schema.org/OutOfStock');
  assert.deepEqual(schema.aggregateRating, {
    '@type': 'AggregateRating',
    ratingValue: 4.8,
    reviewCount: 2,
    bestRating: 5,
    worstRating: 1,
  });
  const reviews = schema.review as Array<Record<string, unknown>>;
  assert.equal(reviews.length, 1);
  assert.equal(reviews[0]['@type'], 'Review');
});

test('buildStructuredDataGraph outputs ElectronicsStore, WebSite, and inventory ItemList of Product schemas on catalog views', () => {
  const graphDoc = buildStructuredDataGraph({
    currentView: 'home',
    products: INITIAL_PRODUCTS,
    lang: 'en',
    storeSettings: INITIAL_STORE_SETTINGS,
    origin: 'https://onalaastore.example.com',
    metaDescription: 'Official electronics store in Chouf.',
    canonicalUrl: 'https://onalaastore.example.com/',
    logoUrl: '/on-alaa-store-profile.png',
  });

  assert.equal(graphDoc['@context'], 'https://schema.org');
  const graph = graphDoc['@graph'] as Array<Record<string, unknown>>;
  assert.ok(graph.some((node) => node['@type'] === 'ElectronicsStore'));
  assert.ok(graph.some((node) => node['@type'] === 'WebSite'));

  const itemList = graph.find((node) => node['@type'] === 'ItemList');
  assert.ok(itemList);
  const elements = itemList!.itemListElement as Array<Record<string, unknown>>;
  assert.ok(elements.length > 0 && elements.length <= 24);
  assert.equal((elements[0].item as Record<string, unknown>)['@type'], 'Product');
});

test('buildStructuredDataGraph outputs Product and BreadcrumbList on product-detail view and filters unpublished items', () => {
  const unpublished = { ...INITIAL_PRODUCTS[0], id: 'hidden-prod', isPublished: false };
  const visibleOnly = selectInventoryProductsForSchema([unpublished, INITIAL_PRODUCTS[1]], {
    currentView: 'products',
  });
  assert.equal(visibleOnly.length, 1);
  assert.equal(visibleOnly[0].id, INITIAL_PRODUCTS[1].id);

  const listSchema = buildInventoryItemListSchema(visibleOnly, {
    origin: 'https://onalaastore.example.com',
    storeName: 'ON AlAA STORE',
    lang: 'en',
    listName: 'Store Inventory',
    listUrl: 'https://onalaastore.example.com/#/products',
  });
  assert.equal(listSchema.numberOfItems, 1);

  const detailGraphDoc = buildStructuredDataGraph({
    currentView: 'product-detail',
    activeProduct: INITIAL_PRODUCTS[1],
    products: INITIAL_PRODUCTS,
    lang: 'ar',
    storeSettings: INITIAL_STORE_SETTINGS,
    origin: 'https://onalaastore.example.com',
    metaDescription: 'Product detail',
    canonicalUrl: `https://onalaastore.example.com/#/product/${INITIAL_PRODUCTS[1].id}`,
    logoUrl: '/on-alaa-store-profile.png',
  });

  const graph = detailGraphDoc['@graph'] as Array<Record<string, unknown>>;
  const productNode = graph.find((node) => node['@type'] === 'Product');
  assert.ok(productNode);
  assert.equal(productNode!.name, INITIAL_PRODUCTS[1].nameAr);
  assert.ok(graph.some((node) => node['@type'] === 'BreadcrumbList'));
});
