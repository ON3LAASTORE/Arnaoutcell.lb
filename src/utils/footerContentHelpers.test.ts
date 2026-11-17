import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  getFooterPhones,
  getFooterLocations,
  getFooterPolicyLinks,
  getFooterOpeningHours,
} from './footerContentHelpers';

describe('footerContentHelpers', () => {
  it('uses official store phone +961 70 773 067 and omits 71135241', () => {
    const phones = getFooterPhones();
    assert.equal(phones.length, 1);
    assert.equal(phones[0].display, '+961 70 773 067');
    assert.equal(phones[0].telHref, 'tel:+96170773067');
    assert.equal(phones.some((p) => /71.?135.?241/.test(p.display) || /71135241/.test(p.telHref)), false);
  });

  it('returns Chouf, Lebanon location lines in English and Arabic without Jadra', () => {
    const enLocs = getFooterLocations('en');
    const arLocs = getFooterLocations('ar');

    assert.equal(enLocs.length, 2);
    assert.equal(enLocs[0].text, 'Chouf, Lebanon');
    assert.equal(enLocs.some((l) => /jadra/i.test(l.text)), false);
    assert.equal(arLocs.length, 2);
    assert.equal(arLocs[0].text, 'الشوف، لبنان');
    assert.equal(arLocs.some((l) => /جدرا/.test(l.text)), false);
  });

  it('returns the exact 6 required quick & policy links with valid route targets', () => {
    const enLinks = getFooterPolicyLinks('en');
    assert.deepEqual(
      enLinks.map((l) => l.label),
      [
        'About Us',
        'Contact us',
        'Terms and Conditions',
        'Privacy Policy',
        'Return & Refund Policy',
        'Shipping Policy',
      ]
    );
    assert.equal(enLinks.find((l) => l.id === 'privacy')?.targetView, 'policy-privacy');

    const arLinks = getFooterPolicyLinks('ar');
    assert.equal(arLinks.length, 6);
  });

  it('returns structured physical store opening hours for Mon-Fri, Sat, and Sun', () => {
    const enHours = getFooterOpeningHours('en');
    assert.deepEqual(enHours, [
      { dayLabel: 'Mon - Fri', hoursLabel: '09:30 - 19:00' },
      { dayLabel: 'Sat', hoursLabel: '09:30 - 18:00' },
      {
        dayLabel: 'Sun',
        hoursLabel: 'Opened - Exclusively on Holidays',
        isSpecial: true,
      },
    ]);

    const arHours = getFooterOpeningHours('ar');
    assert.equal(arHours.length, 3);
    assert.equal(arHours[0].hoursLabel, '09:30 - 19:00');
  });
});
