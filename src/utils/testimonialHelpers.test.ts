import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getNextSlideIndex,
  getPrevSlideIndex,
  getCardsPerView,
  getTotalPages,
  calculateAverageRating,
} from './testimonialHelpers.ts';

test('getNextSlideIndex increments and wraps around', () => {
  assert.equal(getNextSlideIndex(0, 5), 1);
  assert.equal(getNextSlideIndex(3, 5), 4);
  assert.equal(getNextSlideIndex(4, 5), 0);
  assert.equal(getNextSlideIndex(0, 0), 0);
});

test('getPrevSlideIndex decrements and wraps around', () => {
  assert.equal(getPrevSlideIndex(0, 5), 4);
  assert.equal(getPrevSlideIndex(3, 5), 2);
  assert.equal(getPrevSlideIndex(1, 5), 0);
  assert.equal(getPrevSlideIndex(0, 0), 0);
});

test('getCardsPerView returns responsive numbers based on viewport width', () => {
  assert.equal(getCardsPerView(375), 1); // mobile
  assert.equal(getCardsPerView(768), 2); // tablet
  assert.equal(getCardsPerView(1200), 3); // desktop
});

test('getTotalPages computes accurate pages for carousel', () => {
  assert.equal(getTotalPages(6, 3), 2);
  assert.equal(getTotalPages(7, 3), 3);
  assert.equal(getTotalPages(6, 1), 6);
  assert.equal(getTotalPages(0, 3), 1);
});

test('calculateAverageRating computes accurate 1-decimal average', () => {
  const reviews = [
    { rating: 5 },
    { rating: 5 },
    { rating: 4 },
    { rating: 5 },
    { rating: 5 },
  ];
  assert.equal(calculateAverageRating(reviews), 4.8);
  assert.equal(calculateAverageRating([]), 5.0);
});
