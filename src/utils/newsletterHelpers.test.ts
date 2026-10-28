import test from 'node:test';
import assert from 'node:assert';
import {
  isValidEmailFormat,
  sanitizeSubscriberId,
  formatNewsletterWelcome,
} from './newsletterHelpers.ts';

test('isValidEmailFormat validates correct emails', () => {
  assert.strictEqual(isValidEmailFormat('user@example.com'), true);
  assert.strictEqual(isValidEmailFormat('client.tech@saida-store.lb'), true);
  assert.strictEqual(isValidEmailFormat('optimatech.lb@gmail.com'), true);
  assert.strictEqual(isValidEmailFormat('ahmad+deals@domain.org'), true);
});

test('isValidEmailFormat rejects invalid formats', () => {
  assert.strictEqual(isValidEmailFormat(''), false);
  assert.strictEqual(isValidEmailFormat('not-an-email'), false);
  assert.strictEqual(isValidEmailFormat('user@domain'), false);
  assert.strictEqual(isValidEmailFormat('user@.com'), false);
  assert.strictEqual(isValidEmailFormat('@domain.com'), false);
  assert.strictEqual(isValidEmailFormat('   '), false);
});

test('sanitizeSubscriberId formats safe Firestore document IDs', () => {
  assert.strictEqual(sanitizeSubscriberId('user@example.com'), 'user_example_com');
  assert.strictEqual(sanitizeSubscriberId('Ahmad.Tech@Domain.LB'), 'ahmad_tech_domain_lb');
  assert.strictEqual(sanitizeSubscriberId('test+alias@gmail.com'), 'test_alias_gmail_com');
});

test('formatNewsletterWelcome provides localized welcome messages', () => {
  const en = formatNewsletterWelcome('vip@lebanon.com', 'en');
  assert.strictEqual(en.title.includes('VIP Club'), true);
  assert.strictEqual(en.subtitle.includes('vip@lebanon.com'), true);

  const ar = formatNewsletterWelcome('vip@lebanon.com', 'ar');
  assert.strictEqual(ar.title.includes('أرناؤوط ستور'), true);
  assert.strictEqual(ar.subtitle.includes('vip@lebanon.com'), true);
});
