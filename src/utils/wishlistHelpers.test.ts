import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getWishlistButtonCopy,
  parseStoredWishlistIds,
  toggleWishlistProductId,
} from './wishlistHelpers';

test('parseStoredWishlistIds deduplicates valid IDs and handles malformed input safely', () => {
  assert.deepEqual(parseStoredWishlistIds(null), []);
  assert.deepEqual(parseStoredWishlistIds('not-json'), []);
  assert.deepEqual(parseStoredWishlistIds('{"id":1}'), []);
  assert.deepEqual(
    parseStoredWishlistIds('["prod-1", "prod-2", "prod-1", "", 42, "  prod-3  "]'),
    ['prod-1', 'prod-2', 'prod-3']
  );
});

test('toggleWishlistProductId adds missing IDs and removes existing IDs immutably', () => {
  const initial = ['prod-1'];
  const added = toggleWishlistProductId(initial, 'prod-2');
  assert.deepEqual(added, ['prod-1', 'prod-2']);
  assert.deepEqual(initial, ['prod-1']);

  const removed = toggleWishlistProductId(added, 'prod-1');
  assert.deepEqual(removed, ['prod-2']);

  assert.deepEqual(toggleWishlistProductId(removed, '   '), ['prod-2']);
});

test('getWishlistButtonCopy provides dynamic EN and AR labels and product-specific aria-labels', () => {
  const addEn = getWishlistButtonCopy(false, 'en', 'ACEFAST M12');
  assert.equal(addEn.label, 'Add to Wishlist');
  assert.equal(addEn.ariaLabel, 'Add ACEFAST M12 to Wishlist');

  const removeEn = getWishlistButtonCopy(true, 'en', 'ACEFAST M12');
  assert.equal(removeEn.label, 'Remove from Wishlist');
  assert.equal(removeEn.ariaLabel, 'Remove ACEFAST M12 from Wishlist');

  const addAr = getWishlistButtonCopy(false, 'ar');
  assert.equal(addAr.label, 'إضافة للمفضلة');
  assert.equal(addAr.ariaLabel, 'إضافة للمفضلة');

  const removeAr = getWishlistButtonCopy(true, 'ar', 'ACEFAST M12');
  assert.equal(removeAr.label, 'إزالة من المفضلة');
  assert.equal(removeAr.ariaLabel, 'إزالة ACEFAST M12 من المفضلة');
});
