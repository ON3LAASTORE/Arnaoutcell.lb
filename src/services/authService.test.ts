import test from 'node:test';
import assert from 'node:assert/strict';
import {
  evaluatePasswordStrength,
  generateSalt,
  hashPasswordWithSalt,
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
