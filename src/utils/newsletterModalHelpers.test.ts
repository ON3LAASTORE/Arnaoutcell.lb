import test from 'node:test';
import assert from 'node:assert/strict';
import {
  shouldShowTimedModal,
  generateWelcomeVoucherCode,
  MODAL_TRIGGER_DELAY_MS,
} from './newsletterModalHelpers.ts';

test('shouldShowTimedModal triggers when 15 seconds have elapsed on homepage and not dismissed', () => {
  const result = shouldShowTimedModal({
    isHomePage: true,
    isDismissedInSession: false,
    hasAlreadySubscribed: false,
    timeOnPageMs: 15000,
  });
  assert.equal(result, true);
});

test('shouldShowTimedModal suppresses modal if elapsed time is less than 15 seconds', () => {
  const result = shouldShowTimedModal({
    isHomePage: true,
    isDismissedInSession: false,
    hasAlreadySubscribed: false,
    timeOnPageMs: 14900,
  });
  assert.equal(result, false);
});

test('shouldShowTimedModal suppresses modal when not on homepage', () => {
  const result = shouldShowTimedModal({
    isHomePage: false,
    isDismissedInSession: false,
    hasAlreadySubscribed: false,
    timeOnPageMs: 20000,
  });
  assert.equal(result, false);
});

test('shouldShowTimedModal respects session dismissal', () => {
  const result = shouldShowTimedModal({
    isHomePage: true,
    isDismissedInSession: true,
    hasAlreadySubscribed: false,
    timeOnPageMs: 25000,
  });
  assert.equal(result, false);
});

test('shouldShowTimedModal respects existing subscriber status', () => {
  const result = shouldShowTimedModal({
    isHomePage: true,
    isDismissedInSession: false,
    hasAlreadySubscribed: true,
    timeOnPageMs: 30000,
  });
  assert.equal(result, false);
});

test('generateWelcomeVoucherCode returns valid voucher string', () => {
  const code = generateWelcomeVoucherCode();
  assert.equal(code, 'ARNAOUT-VIP15');
});

test('MODAL_TRIGGER_DELAY_MS is exactly 15000 milliseconds', () => {
  assert.equal(MODAL_TRIGGER_DELAY_MS, 15000);
});
