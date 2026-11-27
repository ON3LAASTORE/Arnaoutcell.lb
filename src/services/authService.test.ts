import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import {
  evaluatePasswordStrength,
  generateSalt,
  hashPasswordWithSalt,
  hashPasswordWithBcrypt,
  verifyPasswordWithBcrypt,
  purgeLegacyAdminAuthStorage,
} from './authService';

function createMemoryStorage(initial: Record<string, string> = {}) {
  const map = new Map<string, string>(Object.entries(initial));
  return {
    get length() {
      return map.size;
    },
    key(index: number) {
      return Array.from(map.keys())[index] ?? null;
    },
    getItem(k: string) {
      return map.has(k) ? map.get(k)! : null;
    },
    setItem(k: string, v: string) {
      map.set(k, String(v));
    },
    removeItem(k: string) {
      map.delete(k);
    },
  };
}

test('evaluatePasswordStrength identifies weak passwords', () => {
  const result = evaluatePasswordStrength('abc');
  assert.equal(result.score <= 1, true);
  assert.equal(result.hasMinLength, false);
});

test('evaluatePasswordStrength scores strong password with upper, lower, numbers and symbols', () => {
  const result = evaluatePasswordStrength('Arnaout!Safe2027#Tech');
  assert.equal(result.score >= 4, true);
  assert.equal(result.hasMinLength, true);
  assert.equal(result.hasUpper, true);
  assert.equal(result.hasLower, true);
  assert.equal(result.hasNumber, true);
  assert.equal(result.hasSpecial, true);
});

test('generateSalt returns hex string of specified length', () => {
  const salt = generateSalt(16);
  assert.equal(typeof salt, 'string');
  assert.equal(salt.length, 32); // 16 bytes = 32 hex chars
});

test('hashPasswordWithSalt is deterministic for same input and salt', async () => {
  const salt = 'random_hex_salt_12345';
  const hash1 = await hashPasswordWithSalt('SecretPassword123!', salt);
  const hash2 = await hashPasswordWithSalt('SecretPassword123!', salt);
  assert.equal(hash1, hash2);
  assert.notEqual(hash1, 'SecretPassword123!');
});

test('hashPasswordWithBcrypt and verifyPasswordWithBcrypt hash securely and reject legacy defaults', async () => {
  const hash = await hashPasswordWithBcrypt('Alaa123321a', 8);
  assert.notEqual(hash, 'Alaa123321a');
  assert.equal(hash.startsWith('$2'), true);
  assert.equal(await verifyPasswordWithBcrypt('Alaa123321a', hash), true);
  assert.equal(await verifyPasswordWithBcrypt('admin123', hash), false);
});

test('purgeLegacyAdminAuthStorage clears stale password/credential/token keys and upgrades cached admin profile', () => {
  const localStore = createMemoryStorage({
    arnaout_admin_password: 'legacy-cached-password',
    admin_password: 'old-password',
    arnaout_admin_security_v2: '{"hash":"old"}',
    onalaa_admin_credentials: '{"u":"admin"}',
    admin_custom_secret_v1: 'stale',
    arnaout_cart: '[{"id":"p1"}]',
    arnaout_admin_user: JSON.stringify({
      id: 'u-1',
      username: 'ADMIN',
      role: 'inventory_manager',
      password: 'legacy-inline-password',
      passwordHash: '$2b$12$stale',
      token: 'stale-token',
      permissions: ['manage_inventory'],
    }),
  });
  const sessionStore = createMemoryStorage({
    arnaout_admin_session_token: 'stale-session-jwt',
    onalaa_admin_password: 'stale-session-password',
  });

  const outcome = purgeLegacyAdminAuthStorage(localStore, sessionStore);
  assert.equal(outcome.migratedUserProfile, true);
  assert.equal(localStore.getItem('arnaout_admin_password'), null);
  assert.equal(localStore.getItem('admin_password'), null);
  assert.equal(localStore.getItem('arnaout_admin_security_v2'), null);
  assert.equal(localStore.getItem('onalaa_admin_credentials'), null);
  assert.equal(localStore.getItem('admin_custom_secret_v1'), null);
  assert.equal(sessionStore.getItem('arnaout_admin_session_token'), null);
  assert.equal(sessionStore.getItem('onalaa_admin_password'), null);
  // Non-auth storefront storage stays untouched
  assert.equal(localStore.getItem('arnaout_cart'), '[{"id":"p1"}]');

  const migratedUser = JSON.parse(localStore.getItem('arnaout_admin_user') || '{}');
  assert.equal(migratedUser.username, 'admin');
  assert.equal(migratedUser.role, 'super_admin');
  assert.equal(migratedUser.permissions.includes('full_stock'), true);
  assert.equal(migratedUser.permissions.includes('full_admin'), true);
  assert.equal('password' in migratedUser, false);
  assert.equal('passwordHash' in migratedUser, false);
  assert.equal('token' in migratedUser, false);
});

test('authService.ts contains no hardcoded plaintext administrator passwords', () => {
  const source = fs.readFileSync(path.resolve(process.cwd(), 'src/services/authService.ts'), 'utf-8');
  assert.equal(source.includes('admin123'), false);
  assert.equal(source.includes('Arnaout2027!'), false);
  assert.equal(source.includes('Alaa123321a'), false);
  assert.equal(source.includes('A1234554321alaa'), false);
  assert.equal(source.includes('Alaahassan1'), false);
  assert.equal(source.includes('Admin123321'), false);
});

