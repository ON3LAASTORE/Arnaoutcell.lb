import test from 'node:test';
import assert from 'node:assert/strict';
import {
  SAIDA_STORE_DATA,
  buildGoogleMapsUrl,
  buildWhatsAppLocationUrl,
  buildLiveRouteUrl,
  buildSendToPhoneUrl,
  buildLocationShareData,
} from './storeLocatorHelpers.ts';

test('SAIDA_STORE_DATA contains valid store coordinates, Plus Code, and details', () => {
  assert.equal(SAIDA_STORE_DATA.name, 'SQUARE ARNAOUT CELL STORE, SAIDA - NEJMEH, Sidon');
  assert.equal(SAIDA_STORE_DATA.plusCode, 'H97G+W2P, Sidon');
  assert.equal(SAIDA_STORE_DATA.phone, '81900916');
  assert.equal(SAIDA_STORE_DATA.operatingDuration, 'Open 17 hours');
  assert.ok(SAIDA_STORE_DATA.googleMapsUrl.includes('H97G%2BW2P'));
  assert.ok(SAIDA_STORE_DATA.googleDirectionsUrl.includes('H97G%2BW2P'));
  assert.equal(SAIDA_STORE_DATA.latitude, 33.5623);
  assert.equal(SAIDA_STORE_DATA.longitude, 35.3722);
});

test('buildGoogleMapsUrl encodes query properly', () => {
  const url = buildGoogleMapsUrl('H97G+W2P, Sidon');
  assert.equal(url, 'https://www.google.com/maps/search/?api=1&query=H97G%2BW2P%2C%20Sidon');
});

test('buildLiveRouteUrl generates valid directions URL with Plus Code', () => {
  const url = buildLiveRouteUrl();
  assert.equal(url, 'https://www.google.com/maps/dir/?api=1&destination=H97G%2BW2P%2C%20Sidon');
});

test('buildWhatsAppLocationUrl generates WhatsApp link with valid phone and location message', () => {
  const urlEn = buildWhatsAppLocationUrl('96181900916', false);
  assert.ok(urlEn.includes('https://wa.me/96181900916'));
  assert.ok(urlEn.includes('H97G%2BW2P'));

  const urlAr = buildWhatsAppLocationUrl('96181900916', true);
  assert.ok(urlAr.includes('https://wa.me/96181900916'));
  assert.ok(urlAr.includes('H97G%2BW2P'));
});

test('buildSendToPhoneUrl supports WhatsApp and SMS modes with phone 81900916', () => {
  const waUrl = buildSendToPhoneUrl('81900916', 'whatsapp', false);
  assert.ok(waUrl.startsWith('https://wa.me/96181900916'));
  assert.ok(waUrl.includes('H97G%2BW2P'));
  assert.ok(waUrl.includes('81900916'));

  const smsUrl = buildSendToPhoneUrl('81900916', 'sms', false);
  assert.ok(smsUrl.startsWith('sms:+96181900916'));
  assert.ok(smsUrl.includes('H97G%2BW2P'));
});

test('buildLocationShareData returns complete share title, text, and full message', () => {
  const shareEn = buildLocationShareData(false);
  assert.equal(shareEn.title, 'SQUARE ARNAOUT CELL STORE, SAIDA - NEJMEH, Sidon');
  assert.ok(shareEn.text.includes('H97G+W2P, Sidon'));
  assert.ok(shareEn.fullMessage.includes('Open 17 hours'));
  assert.ok(shareEn.fullMessage.includes('81900916'));

  const shareAr = buildLocationShareData(true);
  assert.ok(shareAr.fullMessage.includes('H97G+W2P, Sidon'));
  assert.ok(shareAr.fullMessage.includes('81900916'));
});
