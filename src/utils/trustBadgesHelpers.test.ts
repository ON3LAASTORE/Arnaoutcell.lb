import test from 'node:test';
import assert from 'node:assert/strict';
import { getFooterTrustBadges } from './trustBadgesHelpers';

test('getFooterTrustBadges returns all required payment methods in English', () => {
  const content = getFooterTrustBadges('en');
  assert.equal(content.heading, 'Trusted & Secure Payments');
  assert.equal(content.badges.length, 4);

  const ids = content.badges.map((b) => b.id);
  assert.deepEqual(ids, ['omt', 'whish', 'western_union', 'cod']);

  content.badges.forEach((badge) => {
    assert.ok(badge.name.length > 0);
    assert.ok(badge.label.length > 0);
    assert.ok(badge.description.length > 0);
  });
  assert.equal(content.assuranceItems.length, 3);
});

test('getFooterTrustBadges returns complete Arabic localization for RTL footer', () => {
  const content = getFooterTrustBadges('ar');
  assert.equal(content.heading, 'وسائل دفع موثوقة وآمنة');
  assert.equal(content.badges.length, 4);

  const ids = content.badges.map((b) => b.id);
  assert.deepEqual(ids, ['omt', 'whish', 'western_union', 'cod']);

  content.badges.forEach((badge) => {
    assert.ok(badge.label.length > 0);
    assert.ok(badge.description.length > 0);
  });
  assert.equal(content.assuranceItems.length, 3);
});
