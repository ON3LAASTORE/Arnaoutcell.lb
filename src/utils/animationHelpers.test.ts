import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateScrollProgress,
  calculate3DTilt,
  calculateSpotlightPosition,
  calculateStaggerDelay,
  calculateBeamPosition,
} from './animationHelpers';

test('calculateScrollProgress returns 0 when page cannot scroll', () => {
  assert.equal(calculateScrollProgress(0, 800, 800), 0);
  assert.equal(calculateScrollProgress(100, 500, 800), 0);
});

test('calculateScrollProgress accurately calculates normalized progress', () => {
  // scrollHeight 2000, clientHeight 1000 => maxScroll 1000
  assert.equal(calculateScrollProgress(0, 2000, 1000), 0);
  assert.equal(calculateScrollProgress(500, 2000, 1000), 0.5);
  assert.equal(calculateScrollProgress(1000, 2000, 1000), 1);
});

test('calculateScrollProgress clamps out-of-bounds scroll values', () => {
  assert.equal(calculateScrollProgress(-50, 2000, 1000), 0);
  assert.equal(calculateScrollProgress(1500, 2000, 1000), 1);
});

test('calculate3DTilt handles zero dimensions gracefully', () => {
  const result = calculate3DTilt(50, 50, 0, 0);
  assert.equal(result.rotateX, 0);
  assert.equal(result.rotateY, 0);
  assert.equal(result.percentX, 50);
  assert.equal(result.percentY, 50);
});

test('calculate3DTilt calculates correct angles for centered, top-left, and bottom-right points', () => {
  // Center of 200x200 element
  const center = calculate3DTilt(100, 100, 200, 200, 10);
  assert.equal(center.rotateX, 0);
  assert.equal(center.rotateY, 0);
  assert.equal(center.percentX, 50);
  assert.equal(center.percentY, 50);

  // Top-left (0, 0): normX = -1, normY = -1
  // rotateX = -(-1) * 10 = 10, rotateY = -1 * 10 = -10
  const topLeft = calculate3DTilt(0, 0, 200, 200, 10);
  assert.equal(topLeft.rotateX, 10);
  assert.equal(topLeft.rotateY, -10);
  assert.equal(topLeft.percentX, 0);
  assert.equal(topLeft.percentY, 0);

  // Bottom-right (200, 200): normX = 1, normY = 1
  // rotateX = -(1) * 10 = -10, rotateY = 1 * 10 = 10
  const bottomRight = calculate3DTilt(200, 200, 200, 200, 10);
  assert.equal(bottomRight.rotateX, -10);
  assert.equal(bottomRight.rotateY, 10);
  assert.equal(bottomRight.percentX, 100);
  assert.equal(bottomRight.percentY, 100);
});

test('calculateSpotlightPosition clamps cursor within element bounds', () => {
  const within = calculateSpotlightPosition(75, 120, 300, 400);
  assert.equal(within.x, 75);
  assert.equal(within.y, 120);
  assert.equal(within.percentX, 25);
  assert.equal(within.percentY, 30);

  const outside = calculateSpotlightPosition(-50, 500, 300, 400);
  assert.equal(outside.x, 0);
  assert.equal(outside.y, 400);
  assert.equal(outside.percentX, 0);
  assert.equal(outside.percentY, 100);
});

test('calculateStaggerDelay produces progressive, predictable delays', () => {
  assert.equal(calculateStaggerDelay(0, 0.1, 0.05), 0.1);
  assert.equal(calculateStaggerDelay(1, 0.1, 0.05), 0.15);
  assert.equal(calculateStaggerDelay(4, 0.1, 0.05), 0.3);
  assert.equal(calculateStaggerDelay(-1, 0.1, 0.05), 0.1);
});

test('calculateBeamPosition provides smooth phase-shifted vertical offsets and fades', () => {
  const beam0 = calculateBeamPosition(0.5, 0);
  assert.ok(beam0.yPercent >= 0 && beam0.yPercent <= 100);
  assert.ok(beam0.opacity >= 0 && beam0.opacity <= 1);

  const beam1 = calculateBeamPosition(0.5, 1);
  // Different line indices have different phase offsets
  assert.notEqual(beam0.yPercent, beam1.yPercent);
});
