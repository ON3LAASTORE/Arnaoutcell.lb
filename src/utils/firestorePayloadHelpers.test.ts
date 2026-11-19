import test from 'node:test';
import assert from 'node:assert/strict';
import {
  FIRESTORE_MAX_DOCUMENT_BYTES,
  FIRESTORE_SAFE_PRODUCT_MAX_BYTES,
  estimateFirestorePayloadBytes,
  isFirestoreDocumentSizeError,
  sanitizeProductImagesForFirestore,
  enforceFirestoreProductPayloadLimit,
} from './firestorePayloadHelpers';
import { DEFAULT_FULL_RES_FALLBACK_IMAGE } from './imageResolutionHelpers';

test('isFirestoreDocumentSizeError identifies exact Firestore 1 MiB size error messages', () => {
  const exactError = new Error(
    `Document 'projects/gen-lang-client-0031383285/databases/ai-studio-marnaoutcellprem-6629f884-c968-499b-93cd-3c6b634467cb/documents/products/prod-1795017753220' cannot be written because its size (4,586,686 bytes) exceeds the maximum allowed size of 1,048,576 bytes.`
  );
  assert.equal(isFirestoreDocumentSizeError(exactError), true);
  assert.equal(isFirestoreDocumentSizeError(new Error('Permission denied')), false);
  assert.equal(isFirestoreDocumentSizeError(null), false);
});

test('enforceFirestoreProductPayloadLimit compacts a 4.58MB Base64 product payload well below Firestore 1 MiB limit', () => {
  // Simulate prod-1795017753220 carrying ~4.58MB of uncompressed Base64 image data
  const hugeImg1 = `data:image/png;base64,${'A'.repeat(2_300_000)}`;
  const hugeImg2 = `data:image/jpeg;base64,${'B'.repeat(2_280_000)}`;

  const oversizedPayload: Record<string, unknown> = {
    id: 'prod-1795017753220',
    name: 'Test Flagship Smartphone',
    brand: 'Apple',
    category: 'Phones',
    sku: 'APL-1795-TEST',
    price: 999,
    stock: 10,
    images: [hugeImg1, hugeImg2],
    description: 'Genuine flagship device with warranty.',
    isPublished: true,
  };

  assert.equal(estimateFirestorePayloadBytes(oversizedPayload) > FIRESTORE_MAX_DOCUMENT_BYTES, true);

  const result = enforceFirestoreProductPayloadLimit(oversizedPayload);
  assert.equal(result.wasCompacted, true);
  assert.equal(result.estimatedBytes <= FIRESTORE_SAFE_PRODUCT_MAX_BYTES, true);
  assert.equal(result.estimatedBytes < FIRESTORE_MAX_DOCUMENT_BYTES, true);
  assert.deepEqual(result.payload.images, [DEFAULT_FULL_RES_FALLBACK_IMAGE]);
  assert.equal(result.payload.id, 'prod-1795017753220');
  assert.equal(result.payload.sku, 'APL-1795-TEST');
});

test('enforceFirestoreProductPayloadLimit preserves valid HTTPS images alongside oversized Base64 uploads', () => {
  const hugeBase64 = `data:image/png;base64,${'X'.repeat(3_000_000)}`;
  const validHttps = 'https://images.unsplash.com/photo-1592750475338-74b7b21085ab';

  const result = enforceFirestoreProductPayloadLimit({
    id: 'prod-mixed',
    name: 'Mixed Gallery Item',
    brand: 'Samsung',
    category: 'Phones',
    sku: 'SAM-MIX-1',
    price: 750,
    stock: 5,
    images: [validHttps, hugeBase64],
    description: 'Clean phone',
    isPublished: true,
  });

  assert.equal(result.wasCompacted, true);
  assert.deepEqual(result.payload.images, [validHttps]);
  assert.equal(result.estimatedBytes <= FIRESTORE_SAFE_PRODUCT_MAX_BYTES, true);
});

test('enforceFirestoreProductPayloadLimit prunes cumulative medium inline data URLs that collectively breach budget', () => {
  // Five ~170KB data URLs = ~850KB total (> 750KB budget)
  const mediumImgs = Array.from({ length: 5 }, (_, idx) =>
    `data:image/webp;base64,${String(idx).repeat(170_000)}`
  );

  const result = enforceFirestoreProductPayloadLimit({
    id: 'prod-multi-medium',
    name: 'Gallery Heavy Item',
    brand: 'Sony',
    category: 'Audio',
    sku: 'SNY-GAL-5',
    price: 299,
    stock: 4,
    images: mediumImgs,
    description: 'Headphones with gallery.',
    isPublished: true,
  });

  assert.equal(result.wasCompacted, true);
  assert.equal(result.estimatedBytes <= FIRESTORE_SAFE_PRODUCT_MAX_BYTES, true);
  assert.equal(Array.isArray(result.payload.images), true);
  assert.equal((result.payload.images as string[]).length >= 1, true);
});

test('sanitizeProductImagesForFirestore deduplicates images and enforces fallback when empty', () => {
  const sanitized = sanitizeProductImagesForFirestore([
    'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=800&q=80',
    'https://images.unsplash.com/photo-1592750475338-74b7b21085ab',
  ]);
  assert.deepEqual(sanitized.images, [
    'https://images.unsplash.com/photo-1592750475338-74b7b21085ab',
  ]);

  const emptySanitized = sanitizeProductImagesForFirestore([]);
  assert.deepEqual(emptySanitized.images, [DEFAULT_FULL_RES_FALLBACK_IMAGE]);
});
