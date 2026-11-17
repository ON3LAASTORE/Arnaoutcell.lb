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
} from './authService.ts';

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

test('authService.ts contains no hardcoded plaintext administrator passwords', () => {
  const source = fs.readFileSync(path.resolve(process.cwd(), 'src/services/authService.ts'), 'utf-8');
  assert.equal(source.includes('admin123'), false);
  assert.equal(source.includes('Arnaout2027!'), false);
  assert.equal(source.includes('Alaa123321a'), false);
  assert.equal(source.includes('A1234554321alaa'), false);
});
