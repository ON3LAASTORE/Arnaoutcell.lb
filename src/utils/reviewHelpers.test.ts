import test from 'node:test';
import assert from 'node:assert/strict';
import {
  validateReviewSubmission,
  calculateNewRating,
  generateAvatarProps,
} from './reviewHelpers.ts';

test('validateReviewSubmission accepts valid payloads in English and Arabic', () => {
  const validEnglish = validateReviewSubmission({
    name: 'Ahmad Khalil',
    rating: 5,
    comment: 'Great smartphone, arrived sealed and genuine with official Lebanon warranty.',
  }, 'en');
  assert.equal(validEnglish.isValid, true);
  assert.equal(Object.keys(validEnglish.errors).length, 0);

  const validArabic = validateReviewSubmission({
    name: 'فادي سعد',
    rating: 4,
    comment: 'جهاز ممتاز وسرعة توصيل خيالية إلى الشوف وكل لبنان.',
  }, 'ar');
  assert.equal(validArabic.isValid, true);
});

test('validateReviewSubmission catches missing or too short fields', () => {
  const invalid = validateReviewSubmission({
    name: 'A',
    rating: 6,
    comment: 'Hi',
  }, 'en');
  assert.equal(invalid.isValid, false);
  assert.ok(invalid.errors.name);
  assert.ok(invalid.errors.rating);
  assert.ok(invalid.errors.comment);
});

test('calculateNewRating computes weighted average accurately', () => {
  // First review on brand new product (currentCount = 0)
  assert.equal(calculateNewRating(0, 0, 5), 5.0);
  assert.equal(calculateNewRating(5.0, 0, 4), 4.0);

  // Second review: current 5.0 (1 count) + new 4.0 -> (5+4)/2 = 4.5
  assert.equal(calculateNewRating(5.0, 1, 4), 4.5);

  // 10 reviews with average 4.8 + new review 5 -> (48 + 5) / 11 = 4.818 -> 4.8
  assert.equal(calculateNewRating(4.8, 10, 5), 4.8);
});

test('generateAvatarProps extracts proper initials and deterministic color', () => {
  const result = generateAvatarProps('Hassan Kanaan');
  assert.equal(result.initials, 'HK');
  assert.ok(result.color.startsWith('from-'));

  const singleName = generateAvatarProps('Rami');
  assert.equal(singleName.initials, 'RA');

  const empty = generateAvatarProps('');
  assert.equal(empty.initials, 'CS');
});
