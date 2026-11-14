import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_STORE_PROFILE_PICTURE,
  resolveStoreLogoUrl,
} from './storeSettingsHelpers';

test('resolveStoreLogoUrl defaults empty or missing values to Full HD profile picture', () => {
  assert.equal(resolveStoreLogoUrl(), DEFAULT_STORE_PROFILE_PICTURE);
  assert.equal(resolveStoreLogoUrl(''), DEFAULT_STORE_PROFILE_PICTURE);
  assert.equal(resolveStoreLogoUrl('   '), DEFAULT_STORE_PROFILE_PICTURE);
  assert.equal(DEFAULT_STORE_PROFILE_PICTURE, '/on-alaa-store-profile.png');
});

test('resolveStoreLogoUrl migrates legacy logo paths to the Full HD profile picture', () => {
  assert.equal(resolveStoreLogoUrl('/on-alaa-logo.svg'), '/on-alaa-store-profile.png');
  assert.equal(resolveStoreLogoUrl('/logo.jpg'), '/on-alaa-store-profile.png');
  assert.equal(resolveStoreLogoUrl('/m-arnaout-cell-logo.jpg'), '/on-alaa-store-profile.png');
  assert.equal(resolveStoreLogoUrl('/m-arnaout-cell-logo-4k.png'), '/on-alaa-store-profile.png');
});

test('resolveStoreLogoUrl preserves custom uploaded profile images and remote URLs', () => {
  const customDataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAAB';
  assert.equal(resolveStoreLogoUrl(customDataUrl), customDataUrl);
  assert.equal(
    resolveStoreLogoUrl('https://cdn.example.com/custom-profile.png'),
    'https://cdn.example.com/custom-profile.png'
  );
});
