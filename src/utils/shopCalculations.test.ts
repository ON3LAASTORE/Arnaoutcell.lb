import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateSubtotal,
  calculateOrderTotal,
  calculateDiscountPercentage,
  validateStockAvailability,
  formatLebanesePhoneNumber,
} from './shopCalculations.ts';

test('calculateSubtotal handles multiple items and quantities', () => {
  const items = [
    { price: 1200, quantity: 1 },
    { price: 45, quantity: 2 },
    { price: 15, quantity: 4 },
  ];
  assert.equal(calculateSubtotal(items), 1200 + 90 + 60);
});

test('calculateOrderTotal computes subtotal plus delivery minus discount accurately', () => {
  assert.equal(calculateOrderTotal(100, 3, 10), 93);
  assert.equal(calculateOrderTotal(50, 0, 0), 50);
});

test('calculateDiscountPercentage calculates accurate integer percentage', () => {
  assert.equal(calculateDiscountPercentage(100, 80), 20);
  assert.equal(calculateDiscountPercentage(1249, 1149), 8);
  assert.equal(calculateDiscountPercentage(50, 50), 0);
  assert.equal(calculateDiscountPercentage(50, 60), 0);
});

test('validateStockAvailability checks limits safely', () => {
  assert.deepEqual(validateStockAvailability(2, 5), { valid: true, allowedQuantity: 2 });
  assert.equal(validateStockAvailability(6, 5).valid, false);
  assert.equal(validateStockAvailability(6, 5).allowedQuantity, 5);
  assert.equal(validateStockAvailability(0, 5).valid, false);
  assert.equal(validateStockAvailability(1, 0).valid, false);
});

test('formatLebanesePhoneNumber formats standard 8-digit or international numbers', () => {
  assert.equal(formatLebanesePhoneNumber('81900916'), '81 900 916');
  assert.equal(formatLebanesePhoneNumber('+961 81 900916'), '81 900 916');
  assert.equal(formatLebanesePhoneNumber('96181900916'), '81 900 916');
});
