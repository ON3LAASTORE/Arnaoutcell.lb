import test from 'node:test';
import assert from 'node:assert/strict';
import {
  SERVICES_FAQS,
  SERVICES_FAQ_CATEGORIES,
  filterServicesFaqs,
} from './servicesFaqHelpers.ts';

test('SERVICES_FAQS covers delivery, payment, and warranty topics with bilingual content', () => {
  const categories = new Set(SERVICES_FAQS.map((item) => item.category));
  assert.equal(categories.has('delivery'), true);
  assert.equal(categories.has('payment'), true);
  assert.equal(categories.has('warranty'), true);

  for (const item of SERVICES_FAQS) {
    assert.ok(item.questionEn.trim().length > 10);
    assert.ok(item.questionAr.trim().length > 10);
    assert.ok(item.answerEn.trim().length > 30);
    assert.ok(item.answerAr.trim().length > 30);
    // Ensure consistent store branding & updated phone number
    assert.equal(item.answerEn.includes('Saida'), false);
    assert.equal(item.answerAr.includes('صيدا'), false);
    assert.equal(item.answerEn.includes('81900916'), false);
    assert.equal(item.answerEn.includes('03099889'), false);
  }
});

test('filterServicesFaqs returns all FAQs when category is "all" and filters accurately by topic', () => {
  assert.equal(filterServicesFaqs('all').length, SERVICES_FAQS.length);

  const deliveryFaqs = filterServicesFaqs('delivery');
  assert.ok(deliveryFaqs.length >= 2);
  assert.ok(deliveryFaqs.every((f) => f.category === 'delivery'));

  const paymentFaqs = filterServicesFaqs('payment');
  assert.ok(paymentFaqs.length >= 2);
  assert.ok(paymentFaqs.every((f) => f.category === 'payment'));

  const warrantyFaqs = filterServicesFaqs('warranty');
  assert.ok(warrantyFaqs.length >= 2);
  assert.ok(warrantyFaqs.every((f) => f.category === 'warranty'));
});

test('SERVICES_FAQ_CATEGORIES exposes All, Deliveries, Payment Methods, and Warranty Terms filters', () => {
  assert.deepEqual(
    SERVICES_FAQ_CATEGORIES.map((c) => c.id),
    ['all', 'delivery', 'payment', 'warranty']
  );
});
