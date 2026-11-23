import test from 'node:test';
import assert from 'node:assert/strict';
import {
  validateAndCalculatePromoDiscount,
  calculateOrderGrandTotal,
  resolveCartItemImage,
  resolveCartItemUnitPrice,
  aggregateOrderItemQuantities,
  applyOrderStockDelta,
  sanitizeProductReviewsForStorage,
  addProductReviewPure,
  resolveDefaultCartSelection,
  stripUndefinedDeep,
  sanitizeCartQuantity,
  validateCartBeforeCheckout,
} from './checkoutHelpers';
import { Product } from '../types';

function makeProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: 'prod-1',
    name: 'Test Phone',
    brand: 'Apple',
    category: 'Smartphones',
    sku: 'SKU-1',
    originalPrice: 1000,
    price: 900,
    stock: 10,
    images: ['https://example.com/main.png', 'https://example.com/alt-silver.png'],
    description: 'Flagship smartphone',
    specifications: [],
    warrantyMonths: 12,
    isPublished: true,
    rating: 5,
    reviewCount: 0,
    colors: ['Desert Titanium', 'White Titanium'],
    colorImages: {
      'White Titanium': 'https://example.com/white-titanium.png',
    },
    variants: [
      {
        id: 'var-color-white-titanium',
        name: 'White Titanium',
        color: 'White Titanium',
        price: 920,
        stock: 4,
        sku: 'SKU-WT',
        image: 'https://example.com/white-variant.png',
      },
      {
        id: 'var-color-desert-titanium',
        name: 'Desert Titanium',
        color: 'Desert Titanium',
        price: 900,
        stock: 6,
        sku: 'SKU-DT',
      },
    ],
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

test('validateAndCalculatePromoDiscount handles valid percentage, free ship, and invalid codes', () => {
  const tenPct = validateAndCalculatePromoDiscount(' onalaa10 ', 250);
  assert.equal(tenPct.isValid, true);
  assert.equal(tenPct.normalizedCode, 'ONALAA10');
  assert.equal(tenPct.discount, 25);

  const welcomePct = validateAndCalculatePromoDiscount('WELCOME10', 99);
  assert.equal(welcomePct.isValid, true);
  assert.equal(welcomePct.discount, 10);

  const freeshipCart = validateAndCalculatePromoDiscount('freeship', 120);
  assert.equal(freeshipCart.isValid, true);
  assert.equal(freeshipCart.discount, 3);

  const freeshipCheckout = validateAndCalculatePromoDiscount('FREESHIP', 120, 5);
  assert.equal(freeshipCheckout.isValid, true);
  assert.equal(freeshipCheckout.discount, 5);

  const invalid = validateAndCalculatePromoDiscount('BOGUS', 120);
  assert.equal(invalid.isValid, false);
  assert.equal(invalid.discount, 0);

  const empty = validateAndCalculatePromoDiscount('   ', 120);
  assert.equal(empty.isValid, false);
  assert.equal(empty.discount, 0);
});

test('calculateOrderGrandTotal subtracts discount and never drops below 0', () => {
  assert.equal(calculateOrderGrandTotal(200, 20, 4), 184);
  assert.equal(calculateOrderGrandTotal(10, 50, 2), 0);
});

test('resolveCartItemImage prioritizes variant image, then color showcase image, then primary product image', () => {
  const product = makeProduct();

  const withVariant = resolveCartItemImage({
    product,
    selectedColor: 'White Titanium',
    selectedVariant: product.variants![0],
  });
  assert.equal(withVariant, 'https://example.com/white-variant.png');

  const withColorMap = resolveCartItemImage({
    product,
    selectedColor: 'White Titanium',
  });
  assert.equal(withColorMap, 'https://example.com/white-titanium.png');

  const fallbackMain = resolveCartItemImage({
    product: makeProduct({ colorImages: undefined, variants: [] }),
    selectedColor: undefined,
  });
  assert.equal(fallbackMain, 'https://example.com/main.png');
});

test('aggregateOrderItemQuantities and applyOrderStockDelta handle multiple variants of the same product', () => {
  const product = makeProduct({ stock: 10 });
  const orderItems = [
    {
      productId: 'prod-1',
      productName: 'Test Phone',
      quantity: 2,
      color: 'White Titanium',
      variantName: 'White Titanium',
    },
    {
      productId: 'prod-1',
      productName: 'Test Phone',
      quantity: 3,
      color: 'Desert Titanium',
      variantName: 'Desert Titanium',
    },
  ];

  const agg = aggregateOrderItemQuantities(orderItems);
  assert.equal(agg.get('prod-1'), 5);

  const deducted = applyOrderStockDelta([product], orderItems, 'deduct');
  assert.equal(deducted[0].stock, 5);
  assert.equal(deducted[0].variants![0].stock, 2);
  assert.equal(deducted[0].variants![1].stock, 3);
  // Ensure original product was not mutated
  assert.equal(product.stock, 10);

  const restored = applyOrderStockDelta(deducted, orderItems, 'restore');
  assert.equal(restored[0].stock, 10);
  assert.equal(restored[0].variants![0].stock, 4);
  assert.equal(restored[0].variants![1].stock, 6);
});

test('applyOrderStockDelta throws when combined quantity across two variants exceeds total stock', () => {
  const product = makeProduct({ stock: 4 });
  assert.throws(() => {
    applyOrderStockDelta(
      [product],
      [
        { productId: 'prod-1', productName: 'Test Phone', quantity: 3, color: 'White Titanium' },
        { productId: 'prod-1', productName: 'Test Phone', quantity: 2, color: 'Desert Titanium' },
      ],
      'deduct'
    );
  }, /Insufficient stock/);
});

test('sanitizeProductReviewsForStorage and addProductReviewPure compute rating without mutating input', () => {
  const original = makeProduct({
    reviews: [
      {
        id: 'rev-1',
        userName: 'Karim',
        rating: 4,
        comment: 'Solid build',
        date: '2026-01-05',
        verifiedPurchase: true,
      },
    ],
    reviewCount: 1,
    rating: 4,
  });

  const result = addProductReviewPure(
    original,
    { userName: '  Layla  ', rating: 5, comment: '  Great screen  ' },
    new Date('2026-02-10T12:00:00Z')
  );

  assert.equal(result.updatedProduct.reviewCount, 2);
  assert.equal(result.updatedProduct.rating, 4.5);
  assert.equal(result.review.userName, 'Layla');
  assert.equal(result.review.comment, 'Great screen');
  assert.equal(result.review.date, '2026-02-10');
  // Original untouched
  assert.equal(original.reviewCount, 1);
  assert.equal(original.reviews?.length, 1);

  const cleaned = sanitizeProductReviewsForStorage([
    { id: 'r1', userName: '', comment: 'Empty name' },
    { id: 'r2', userName: 'Omar', rating: 99, comment: 'Clamped rating' },
  ]);
  assert.equal(cleaned.length, 1);
  assert.equal(cleaned[0].rating, 5);
});

test('resolveCartItemUnitPrice combines capacity variant price with structured color priceAdjustment and prioritizes selectedColorImage', () => {
  const product = makeProduct({
    price: 190,
    colors: [
      { id: 'c-1', name: 'Midnight Black', imageUrl: 'https://example.com/black.png' },
      { id: 'c-2', name: 'Desert Gold', imageUrl: 'https://example.com/gold.png', priceAdjustment: 25 },
    ],
    variants: [
      { id: 'var-cap-1', name: '256GB', price: 230, stock: 5, sku: 'SKU-256' },
    ],
  });

  assert.equal(
    resolveCartItemUnitPrice({
      product,
      selectedColor: 'Desert Gold',
      selectedVariant: product.variants![0],
      colorPriceAdjustment: 25,
    }),
    255
  );

  // Even without explicit colorPriceAdjustment passed, lookup falls back to matching structured ProductColorOption
  assert.equal(
    resolveCartItemUnitPrice({
      product,
      selectedColor: 'Desert Gold',
      selectedVariant: product.variants![0],
    }),
    255
  );

  assert.equal(
    resolveCartItemImage({
      product,
      selectedColor: 'Desert Gold',
      selectedColorImage: 'https://example.com/gold.png',
      selectedVariant: product.variants![0],
    }),
    'https://example.com/gold.png'
  );
});

test('resolveDefaultCartSelection resolves structured color, capacity, and fallback defaults accurately', () => {
  const structuredProduct = makeProduct({
    price: 190,
    colors: [
      {
        id: 'color-black',
        name: 'Black',
        imageUrl: '/images/tecno_spark_black.jpg',
        availableCapacities: ['var-256'],
        priceAdjustment: 10,
      },
      {
        id: 'color-gray',
        name: 'Gray',
        imageUrl: '/images/tecno_spark_gray.jpg',
      },
    ],
    colorImages: undefined,
    variants: [
      { id: 'var-128', name: '128GB', price: 190, stock: 10, sku: 'SKU-128' },
      { id: 'var-256', name: '256GB', price: 220, stock: 5, sku: 'SKU-256' },
    ],
  });

  // Respects color restriction (Black only allows var-256) + includes thumbnail and price adjustment
  const blackDefault = resolveDefaultCartSelection(structuredProduct);
  assert.equal(blackDefault.selectedColor, 'Black');
  assert.equal(blackDefault.selectedVariant?.id, 'var-256');
  assert.equal(blackDefault.selectedColorImage, '/images/tecno_spark_black.jpg');
  assert.equal(blackDefault.colorPriceAdjustment, 10);

  // Respects explicit preferred variant
  const explicitCap = resolveDefaultCartSelection(
    structuredProduct,
    structuredProduct.variants![1]
  );
  assert.equal(explicitCap.selectedVariant?.id, 'var-256');

  // Handles legacy product with no colors and no variants cleanly
  const plainProduct = makeProduct({
    colors: undefined,
    colorImages: undefined,
    variants: undefined,
  });
  const plainDefault = resolveDefaultCartSelection(plainProduct);
  assert.equal(plainDefault.selectedColor, undefined);
  assert.equal(plainDefault.selectedVariant, undefined);
  assert.equal(plainDefault.colorPriceAdjustment, 0);
});

test('stripUndefinedDeep removes undefined keys recursively while keeping zeros, booleans, and nested arrays intact', () => {
  const cleaned = stripUndefinedDeep({
    id: 'OAA-2027-1001',
    discount: 0,
    customer: {
      fullName: 'Nadine Haddad',
      alternatePhone: undefined,
      notes: undefined,
    },
    items: [
      {
        productId: 'p1',
        color: undefined,
        variantName: '512GB',
        colorImage: undefined,
      },
      undefined,
    ],
  });

  assert.equal('alternatePhone' in cleaned.customer, false);
  assert.equal('notes' in cleaned.customer, false);
  assert.equal(cleaned.discount, 0);
  assert.equal(cleaned.items.length, 1);
  assert.equal('color' in (cleaned.items[0] as Record<string, unknown>), false);
  assert.equal((cleaned.items[0] as Record<string, unknown>).variantName, '512GB');
});

test('sanitizeCartQuantity enforces integer bounds and handles zero/negative stock', () => {
  assert.equal(sanitizeCartQuantity(3.8, 10), 3);
  assert.equal(sanitizeCartQuantity(15, 5), 5);
  assert.equal(sanitizeCartQuantity(2, 0), 0);
  assert.equal(sanitizeCartQuantity(-2, 5), 0);
  assert.equal(sanitizeCartQuantity('NaN', 5), 0);
});

test('validateCartBeforeCheckout rejects empty cart, out-of-stock items, and multi-variant overselling', () => {
  const emptyRes = validateCartBeforeCheckout([], []);
  assert.equal(emptyRes.valid, false);
  assert.equal(emptyRes.issues[0].reason, 'empty_cart');

  const product = makeProduct({ stock: 5 });
  const overStockRes = validateCartBeforeCheckout(
    [
      { product, quantity: 3, selectedVariant: product.variants![0] },
      { product, quantity: 4, selectedVariant: product.variants![1] },
    ],
    [product]
  );
  assert.equal(overStockRes.valid, false);
  assert.equal(overStockRes.issues[0].reason, 'exceeds_stock');

  const validRes = validateCartBeforeCheckout(
    [{ product, quantity: 2, selectedVariant: product.variants![0] }],
    [product]
  );
  assert.equal(validRes.valid, true);
});

