import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isQuotaExceededError,
  safeStorageSetItem,
  purgeStaleFirestoreWebStorageKeys,
  compactStoreSettingsPayload,
  compactProductsForStorage,
  compactProductsProgressively,
  StorageLike,
} from './storageQuotaHelpers';
import { INITIAL_STORE_SETTINGS, INITIAL_PRODUCTS } from '../data/initialData';

function createQuotaMockStorage(options: {
  maxBytes: number;
  initial?: Record<string, string>;
}): StorageLike & { store: Map<string, string> } {
  const store = new Map<string, string>(Object.entries(options.initial || {}));

  const currentBytes = (excludingKey?: string) => {
    let total = 0;
    for (const [k, v] of store.entries()) {
      if (k !== excludingKey) {
        total += k.length + v.length;
      }
    }
    return total;
  };

  return {
    store,
    get length() {
      return store.size;
    },
    key: (index: number) => Array.from(store.keys())[index] ?? null,
    getItem: (key: string) => store.get(key) ?? null,
    removeItem: (key: string) => {
      store.delete(key);
    },
    setItem: (key: string, value: string) => {
      const projected = currentBytes(key) + key.length + value.length;
      if (projected > options.maxBytes) {
        const err = new Error("Failed to execute 'setItem' on 'Storage': exceeded the quota.");
        err.name = 'QuotaExceededError';
        throw err;
      }
      store.set(key, value);
    },
  };
}

test('isQuotaExceededError detects DOMException QuotaExceededError and legacy codes', () => {
  const domErr = new Error('Quota exceeded');
  domErr.name = 'QuotaExceededError';
  assert.equal(isQuotaExceededError(domErr), true);

  const firefoxErr = new Error('Storage full');
  firefoxErr.name = 'NS_ERROR_DOM_QUOTA_REACHED';
  assert.equal(isQuotaExceededError(firefoxErr), true);

  assert.equal(isQuotaExceededError({ code: 22 }), true);
  assert.equal(isQuotaExceededError({ code: 1014 }), true);
  assert.equal(isQuotaExceededError(new Error('Network offline')), false);
  assert.equal(isQuotaExceededError(null), false);
});

test('safeStorageSetItem evicts legacy keys to recover from QuotaExceededError without throwing', () => {
  const mock = createQuotaMockStorage({
    maxBytes: 120,
    initial: {
      arnaout_cell_products_v1: 'x'.repeat(80),
    },
  });

  const result = safeStorageSetItem(mock, 'arnaout_cell_settings_v2', '{"storeName":"ON AlAA STORE"}');
  assert.equal(result.ok, true);
  assert.equal(result.recovered, true);
  assert.equal(mock.getItem('arnaout_cell_products_v1'), null);
  assert.equal(mock.getItem('arnaout_cell_settings_v2'), '{"storeName":"ON AlAA STORE"}');
});

test('safeStorageSetItem invokes onQuotaRecovery compaction when evicting legacy keys is insufficient', () => {
  const mock = createQuotaMockStorage({
    maxBytes: 130,
    initial: {
      other_active_key: 'a'.repeat(40),
    },
  });

  const oversized = JSON.stringify({ logoUrl: `data:image/png;base64,${'A'.repeat(200)}` });
  const compacted = JSON.stringify({ logoUrl: '/on-alaa-store-profile.png' });

  const result = safeStorageSetItem(mock, 'arnaout_cell_settings_v2', oversized, {
    onQuotaRecovery: () => compacted,
  });

  assert.equal(result.ok, true);
  assert.equal(result.recovered, true);
  assert.equal(mock.getItem('arnaout_cell_settings_v2'), compacted);
});

test('safeStorageSetItem never throws when storage remains completely full', () => {
  const mock = createQuotaMockStorage({
    maxBytes: 10,
  });

  const result = safeStorageSetItem(mock, 'arnaout_cell_settings_v2', 'too-large-payload-even-after-compaction');
  assert.equal(result.ok, false);
  assert.equal(result.reason, 'quota_exceeded');
});

test('compactStoreSettingsPayload offloads oversized inline data URLs while preserving all store settings', () => {
  const hugeDataUrl = `data:image/png;base64,${'B'.repeat(260_000)}`;
  const input = {
    ...INITIAL_STORE_SETTINGS,
    storeName: 'ON AlAA STORE',
    logoUrl: hugeDataUrl,
    phone: '70773067',
  };

  const { compacted, offloadedLogoDataUrl } = compactStoreSettingsPayload(input);
  assert.equal(offloadedLogoDataUrl, hugeDataUrl);
  assert.equal(compacted.logoUrl, '/on-alaa-store-profile.png');
  assert.equal(compacted.storeName, 'ON AlAA STORE');
  assert.equal(compacted.phone, '70773067');
});

test('compactProductsForStorage strips huge inline data URLs cleanly', () => {
  const baseProduct = INITIAL_PRODUCTS[0];
  const hugeImage = `data:image/jpeg;base64,${'C'.repeat(150_000)}`;
  const compacted = compactProductsForStorage([
    { ...baseProduct, images: [hugeImage] },
    { ...baseProduct, id: 'prod-empty-imgs', images: [] },
  ]);
  assert.equal(compacted.length, 2);
  assert.equal(compacted[0].images[0].startsWith('https://'), true);
  assert.deepEqual(compacted[1].images, []);
});

test('purgeStaleFirestoreWebStorageKeys removes legacy firestore multi-tab keys while preserving storefront data', () => {
  const mock = createQuotaMockStorage({
    maxBytes: 1000,
    initial: {
      'firestore_mutations_firestore/[DEFAULT]/db/_78': '{"pending":true}',
      'firestore_clients_firestore/[DEFAULT]/db': '{"clientId":"1"}',
      'firestore_online_state_firestore/[DEFAULT]/db': '{"state":"Online"}',
      arnaout_cell_products_v2: '[{"id":"1"}]',
    },
  });

  const removed = purgeStaleFirestoreWebStorageKeys(mock);
  assert.equal(removed, 3);
  assert.equal(mock.getItem('arnaout_cell_products_v2'), '[{"id":"1"}]');
  assert.equal(mock.getItem('firestore_mutations_firestore/[DEFAULT]/db/_78'), null);
});

test('safeStorageSetItem recovers quota by purging bloated firestore_mutations keys', () => {
  const mock = createQuotaMockStorage({
    maxBytes: 140,
    initial: {
      'firestore_mutations_firestore/[DEFAULT]/db/_78': 'z'.repeat(80),
    },
  });

  const result = safeStorageSetItem(mock, 'arnaout_cell_cart_v2', '[{"id":"item-1"}]');
  assert.equal(result.ok, true);
  assert.equal(result.recovered, true);
  assert.equal(mock.getItem('firestore_mutations_firestore/[DEFAULT]/db/_78'), null);
});

test('compactProductsProgressively falls back through smaller thresholds so tight localStorage persists the product record', () => {
  const baseProduct = INITIAL_PRODUCTS[0];
  const mediumInlineImage = `data:image/jpeg;base64,${'D'.repeat(50_000)}`;
  const targetList = [{ ...baseProduct, id: 'prod-tight-quota', name: 'Tight Quota Item', images: [mediumInlineImage] }];
  const tiers = compactProductsProgressively(targetList);
  assert.equal(tiers.length, 3);

  // Storage cap allows stripped tier (tiers[2]) while rejecting full & 120KB tier
  const mock = createQuotaMockStorage({
    maxBytes: tiers[2].length + 100,
  });

  const result = safeStorageSetItem(mock, 'arnaout_cell_products_v2', JSON.stringify(targetList), {
    onQuotaRecovery: () => compactProductsProgressively(targetList),
  });

  assert.equal(result.ok, true);
  assert.equal(result.recovered, true);
  const storedRaw = mock.getItem('arnaout_cell_products_v2');
  assert.ok(storedRaw);
  const parsed = JSON.parse(storedRaw);
  assert.equal(parsed[0].id, 'prod-tight-quota');
  assert.equal(parsed[0].name, 'Tight Quota Item');
});
