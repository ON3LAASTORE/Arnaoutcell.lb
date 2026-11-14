import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeEmail,
  isValidEmailFormat,
  sanitizeSubscriberId,
  buildSubscriberPayload,
  formatNewsletterWelcome,
} from './newsletterHelpers';

test('normalizeEmail trims whitespace and lowercases email', () => {
  assert.equal(normalizeEmail('  VIP.Client@Example.COM  '), 'vip.client@example.com');
  assert.equal(normalizeEmail(''), '');
});

test('isValidEmailFormat validates correct emails', () => {
  assert.equal(isValidEmailFormat('user@example.com'), true);
  assert.equal(isValidEmailFormat('client.tech@onalaastore.lb'), true);
  assert.equal(isValidEmailFormat('optimatech.lb@gmail.com'), true);
  assert.equal(isValidEmailFormat('ahmad+deals@domain.org'), true);
});

test('isValidEmailFormat rejects invalid and oversized formats', () => {
  assert.equal(isValidEmailFormat(''), false);
  assert.equal(isValidEmailFormat('not-an-email'), false);
  assert.equal(isValidEmailFormat('user@domain'), false);
  assert.equal(isValidEmailFormat('user@.com'), false);
  assert.equal(isValidEmailFormat('@domain.com'), false);
  assert.equal(isValidEmailFormat('   '), false);
  assert.equal(isValidEmailFormat(`${'a'.repeat(120)}@example.com`), false);
});

test('sanitizeSubscriberId formats safe Firestore document IDs bounded to 128 chars', () => {
  assert.equal(sanitizeSubscriberId('user@example.com'), 'user_example_com');
  assert.equal(sanitizeSubscriberId('Ahmad.Tech@Domain.LB'), 'ahmad_tech_domain_lb');
  assert.equal(sanitizeSubscriberId('test+alias@gmail.com'), 'test_alias_gmail_com');
  const longId = sanitizeSubscriberId(`${'x'.repeat(140)}@example.com`);
  assert.equal(longId.length <= 128, true);
  assert.match(longId, /^[a-zA-Z0-9_-]+$/);
});

test('buildSubscriberPayload constructs blueprint-compliant subscriber objects', () => {
  const payload = buildSubscriberPayload('  Buyer@ChoufTech.LB ', 'en', 'footer', '2026-11-14T12:00:00.000Z');
  assert.deepEqual(payload, {
    id: 'buyer_chouftech_lb',
    email: 'buyer@chouftech.lb',
    subscribedAt: '2026-11-14T12:00:00.000Z',
    lang: 'en',
    source: 'footer',
  });

  const arPayload = buildSubscriberPayload('arabic@test.com', 'ar', '   ');
  assert.equal(arPayload.lang, 'ar');
  assert.equal(arPayload.source, 'footer');
  assert.equal(arPayload.id, 'arabic_test_com');
});

test('formatNewsletterWelcome provides localized welcome messages', () => {
  const en = formatNewsletterWelcome('vip@lebanon.com', 'en');
  assert.equal(en.title.includes('ON AlAA STORE'), true);
  assert.equal(en.subtitle.includes('vip@lebanon.com'), true);

  const ar = formatNewsletterWelcome('vip@lebanon.com', 'ar');
  assert.equal(ar.title.includes('ON AlAA STORE'), true);
  assert.equal(ar.subtitle.includes('vip@lebanon.com'), true);
});
