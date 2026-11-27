import test from 'node:test';
import assert from 'node:assert/strict';
import {
  collectRemovedMediaUrls,
  extractAllProductMediaUrls,
  isFirebaseStorageUrl,
  moveGalleryImage,
  removeGalleryImageAt,
  setPrimaryGalleryImage,
} from './productMediaHelpers';
import type { Product } from '../types';

test('removeGalleryImageAt deletes target photo and auto-promotes next photo when primary is removed', () => {
  const initial = ['https://example.com/1.jpg', 'https://example.com/2.jpg', 'https://example.com/3.jpg'];
  const afterRemovePrimary = removeGalleryImageAt(initial, 0);
  assert.deepEqual(afterRemovePrimary, ['https://example.com/2.jpg', 'https://example.com/3.jpg']);

  const afterRemoveLast = removeGalleryImageAt(['https://example.com/2.jpg'], 0);
  assert.deepEqual(afterRemoveLast, []);
});

test('setPrimaryGalleryImage promotes chosen photo to index 0 without losing others', () => {
  const initial = ['https://example.com/1.jpg', 'https://example.com/2.jpg', 'https://example.com/3.jpg'];
  assert.deepEqual(setPrimaryGalleryImage(initial, 2), [
    'https://example.com/3.jpg',
    'https://example.com/1.jpg',
    'https://example.com/2.jpg',
  ]);
  assert.deepEqual(setPrimaryGalleryImage(initial, 0), initial);
});

test('moveGalleryImage swaps positions safely and ignores out-of-range moves', () => {
  const initial = ['a.jpg', 'b.jpg', 'c.jpg'];
  assert.deepEqual(moveGalleryImage(initial, 0, 2), ['b.jpg', 'c.jpg', 'a.jpg']);
  assert.deepEqual(moveGalleryImage(initial, 2, 1), ['a.jpg', 'c.jpg', 'b.jpg']);
  assert.deepEqual(moveGalleryImage(initial, -1, 1), initial);
});

test('collectRemovedMediaUrls identifies removed Firebase Storage & URL assets still not referenced elsewhere', () => {
  const prev: Partial<Product> = {
    images: [
      'https://firebasestorage.googleapis.com/v0/b/my-bucket/o/img1.jpg?alt=media',
      'https://firebasestorage.googleapis.com/v0/b/my-bucket/o/img2.jpg?alt=media',
    ],
    colorImages: {
      Black: 'https://firebasestorage.googleapis.com/v0/b/my-bucket/o/img2.jpg?alt=media',
      Blue: 'https://firebasestorage.googleapis.com/v0/b/my-bucket/o/blue.jpg?alt=media',
    },
  };
  const next: Partial<Product> = {
    images: [],
    colorImages: {
      Black: 'https://firebasestorage.googleapis.com/v0/b/my-bucket/o/img2.jpg?alt=media',
    },
  };

  assert.equal(extractAllProductMediaUrls(prev).length, 3);
  const removed = collectRemovedMediaUrls(prev, next);
  assert.deepEqual(removed, [
    'https://firebasestorage.googleapis.com/v0/b/my-bucket/o/img1.jpg?alt=media',
    'https://firebasestorage.googleapis.com/v0/b/my-bucket/o/blue.jpg?alt=media',
  ]);
});

test('isFirebaseStorageUrl matches Firebase Storage endpoints and ignores external/data URLs', () => {
  assert.equal(
    isFirebaseStorageUrl('https://firebasestorage.googleapis.com/v0/b/bucket/o/test.png?alt=media'),
    true
  );
  assert.equal(isFirebaseStorageUrl('gs://my-app.appspot.com/products/p1.webp'), true);
  assert.equal(isFirebaseStorageUrl('https://my-app.firebasestorage.app/o/pic.jpg'), true);
  assert.equal(isFirebaseStorageUrl('https://images.unsplash.com/photo-1234'), false);
  assert.equal(isFirebaseStorageUrl('data:image/png;base64,AAAA'), false);
});
