import test from 'node:test';
import assert from 'node:assert/strict';
import {
  classifyWarrantyCode,
  mapCameraErrorToMessage,
  parseScannedWarrantyCode,
} from './qrPayloadParser';

test('parseScannedWarrantyCode handles plain serials, SKUs, and Order IDs', () => {
  const serial = parseScannedWarrantyCode('  195949038221  ');
  assert.deepEqual(serial, {
    lookupValue: '195949038221',
    detectedKind: 'serial_barcode',
    rawText: '195949038221',
  });

  const order = parseScannedWarrantyCode('#OAA-2027-1001');
  assert.equal(order?.lookupValue, 'OAA-2027-1001');
  assert.equal(order?.detectedKind, 'order_id');

  assert.equal(parseScannedWarrantyCode('   '), null);
});

test('parseScannedWarrantyCode extracts identifiers from JSON, URLs, and labeled stickers', () => {
  const fromJson = parseScannedWarrantyCode('{"serial":"195949038221","brand":"Apple"}');
  assert.equal(fromJson?.lookupValue, '195949038221');
  assert.equal(fromJson?.detectedKind, 'serial_barcode');

  const fromUrl = parseScannedWarrantyCode('https://onalaastore.com/#/services?orderId=OAA-2026-0884');
  assert.equal(fromUrl?.lookupValue, 'OAA-2026-0884');
  assert.equal(fromUrl?.detectedKind, 'order_id');

  const fromStickerLabel = parseScannedWarrantyCode('Model: WH-1000XM5\nS/N: 4548736132573\nMade in Malaysia');
  assert.equal(fromStickerLabel?.lookupValue, '4548736132573');
  assert.equal(fromStickerLabel?.detectedKind, 'serial_barcode');

  const fromUrlProd = parseScannedWarrantyCode('https://onalaastore.com/#/product/prod-iphone16promax');
  assert.equal(fromUrlProd?.lookupValue, 'prod-iphone16promax');
  assert.equal(fromUrlProd?.detectedKind, 'product_id');
});

test('classifyWarrantyCode distinguishes order IDs, product IDs, barcodes, and SKUs', () => {
  assert.equal(classifyWarrantyCode('OAA-2025-0412'), 'order_id');
  assert.equal(classifyWarrantyCode('prod-anker737'), 'product_id');
  assert.equal(classifyWarrantyCode('195949038221'), 'serial_barcode');
  assert.equal(classifyWarrantyCode('ANK-737-24K'), 'sku');
});

test('mapCameraErrorToMessage maps permission, missing camera, and busy errors clearly', () => {
  const denied = new Error('Permission denied by user');
  denied.name = 'NotAllowedError';
  assert.equal(mapCameraErrorToMessage(denied, 'en').reason, 'permission_denied');
  assert.equal(mapCameraErrorToMessage(denied, 'ar').reason, 'permission_denied');

  const notFound = new Error('Requested device not found');
  notFound.name = 'NotFoundError';
  assert.equal(mapCameraErrorToMessage(notFound, 'en').reason, 'no_camera');

  const busy = new Error('Could not start video source');
  busy.name = 'NotReadableError';
  assert.equal(mapCameraErrorToMessage(busy, 'en').reason, 'in_use');
});
