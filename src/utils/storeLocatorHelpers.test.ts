import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CHOUF_STORE_DATA,
  SAIDA_STORE_DATA,
  buildGoogleMapsUrl,
  buildWhatsAppLocationUrl,
  buildLiveRouteUrl,
  buildSendToPhoneUrl,
  buildLocationShareData,
} from './storeLocatorHelpers.ts';

test('CHOUF_STORE_DATA contains valid Chouf online store info, all-Lebanon coverage, and phone 70773067', () => {
  assert.equal(CHOUF_STORE_DATA.name, 'ON AlAA STORE — Online Store based in Chouf, Lebanon');
  assert.equal(CHOUF_STORE_DATA.shortName, 'ON AlAA STORE');
  assert.equal(CHOUF_STORE_DATA.cityEn, 'Chouf, Mount Lebanon');
  assert.equal(CHOUF_STORE_DATA.phone, '70773067');
  assert.equal(CHOUF_STORE_DATA.phoneFormatted, '70 773 067');
  assert.equal(CHOUF_STORE_DATA.whatsapp, '96170773067');
  assert.equal(CHOUF_STORE_DATA.plusCodeUrl, 'https://wa.me/96170773067');
  assert.equal(SAIDA_STORE_DATA.phone, '70773067');
});

test('buildGoogleMapsUrl encodes query properly', () => {
  const url = buildGoogleMapsUrl('Chouf, Lebanon');
  assert.equal(url, 'https://www.google.com/maps/search/?api=1&query=Chouf%2C%20Lebanon');
});

test('buildLiveRouteUrl returns official WhatsApp direct link for delivery coordination', () => {
  const url = buildLiveRouteUrl();
  assert.equal(url, 'https://wa.me/96170773067');
});

test('buildWhatsAppLocationUrl generates WhatsApp link with valid phone 96170773067 and delivery inquiry message', () => {
  const urlEn = buildWhatsAppLocationUrl('96170773067', false);
  assert.ok(urlEn.includes('https://wa.me/96170773067'));
  assert.ok(urlEn.includes('ON%20AlAA%20STORE'));

  const urlAr = buildWhatsAppLocationUrl('96170773067', true);
  assert.ok(urlAr.includes('https://wa.me/96170773067'));
  assert.ok(urlAr.includes('ON%20AlAA'));
});

test('buildSendToPhoneUrl supports WhatsApp and SMS modes with phone 70773067', () => {
  const waUrl = buildSendToPhoneUrl('70773067', 'whatsapp', false);
  assert.ok(waUrl.startsWith('https://wa.me/96170773067'));
  assert.ok(waUrl.includes('Chouf'));
  assert.ok(waUrl.includes('All%20Lebanon'));
  assert.ok(waUrl.includes('70773067'));

  const smsUrl = buildSendToPhoneUrl('70773067', 'sms', false);
  assert.ok(smsUrl.startsWith('sms:+96170773067'));
  assert.ok(smsUrl.includes('70773067'));
});

test('buildLocationShareData returns complete share title, text, and full message', () => {
  const shareEn = buildLocationShareData(false);
  assert.equal(shareEn.title, 'ON AlAA STORE — Online Store based in Chouf, Lebanon');
  assert.equal(shareEn.url, 'https://wa.me/96170773067');
  assert.ok(shareEn.text.includes('Chouf'));
  assert.ok(shareEn.text.includes('All Lebanon'));
  assert.ok(shareEn.fullMessage.includes('70773067'));
  assert.ok(shareEn.fullMessage.includes('https://wa.me/96170773067'));

  const shareAr = buildLocationShareData(true);
  assert.ok(shareAr.fullMessage.includes('الشوف'));
  assert.ok(shareAr.fullMessage.includes('70773067'));
  assert.ok(shareAr.fullMessage.includes('https://wa.me/96170773067'));
});
