import test from 'node:test';
import assert from 'node:assert/strict';
import {
  SAIDA_STORE_DATA,
  buildGoogleMapsUrl,
  buildWhatsAppLocationUrl,
} from './storeLocatorHelpers.ts';

test('SAIDA_STORE_DATA contains valid store coordinates and details', () => {
  assert.equal(SAIDA_STORE_DATA.phone, '81900916');
  assert.ok(SAIDA_STORE_DATA.googleMapsUrl.includes('google.com/maps'));
  assert.equal(SAIDA_STORE_DATA.latitude, 33.5631);
  assert.equal(SAIDA_STORE_DATA.longitude, 35.3718);
});

test('buildGoogleMapsUrl encodes query properly', () => {
  const url = buildGoogleMapsUrl('Saida Nijme Square');
  assert.equal(url, 'https://www.google.com/maps/search/?api=1&query=Saida%20Nijme%20Square');
});

test('buildWhatsAppLocationUrl generates WhatsApp link with valid phone and location message', () => {
  const urlEn = buildWhatsAppLocationUrl('96181900916', false);
  assert.ok(urlEn.includes('https://wa.me/96181900916'));
  assert.ok(urlEn.includes('location'));

  const urlAr = buildWhatsAppLocationUrl('96181900916', true);
  assert.ok(urlAr.includes('https://wa.me/96181900916'));
  assert.ok(urlAr.includes('%D8%B5%D9%8A%D8%AF%D8%A7')); // contains Saida in arabic
});
