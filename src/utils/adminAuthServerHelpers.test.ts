import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import {
  isValidBcryptHash,
  hashAdminPasswordBcrypt,
  verifyAdminPasswordBcrypt,
  ensureAdminCredentialRecord,
  verifyServerAdminLogin,
  rotateServerAdminPassword,
} from './adminAuthServerHelpers';

function makeTempCredsPath(name: string): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'admin-auth-test-'));
  return path.join(dir, name);
}

test('hashAdminPasswordBcrypt produces valid bcrypt hash never equal to plaintext', async () => {
  const hash = await hashAdminPasswordBcrypt('Alaa123321a', 8);
  assert.equal(isValidBcryptHash(hash), true);
  assert.notEqual(hash, 'Alaa123321a');
  assert.equal(hash.includes('Alaa123321a'), false);
  assert.equal(await verifyAdminPasswordBcrypt('Alaa123321a', hash), true);
  assert.equal(await verifyAdminPasswordBcrypt('admin123', hash), false);
});

test('ensureAdminCredentialRecord hashes env password with bcrypt and never stores plaintext on disk', async () => {
  const credsPath = makeTempCredsPath('.admin_credentials.json');
  const record = await ensureAdminCredentialRecord({
    credentialsFilePath: credsPath,
    envAdminPassword: 'Alaa123321a',
    rounds: 8,
  });

  assert.ok(record);
  assert.equal(record.algorithm, 'bcrypt');
  assert.equal(record.source, 'env');
  assert.equal(isValidBcryptHash(record.passwordHash), true);

  const fileText = fs.readFileSync(credsPath, 'utf-8');
  assert.equal(fileText.includes('Alaa123321a'), false);
  assert.equal(fileText.includes('admin123'), false);
});

test('verifyServerAdminLogin rejects legacy passwords (admin123, admin, Arnaout2027!) and accepts configured password', async () => {
  const credsPath = makeTempCredsPath('.admin_credentials.json');
  await ensureAdminCredentialRecord({
    credentialsFilePath: credsPath,
    envAdminPassword: 'Alaa123321a',
    rounds: 8,
  });

  assert.equal(
    await verifyServerAdminLogin({ candidate: 'Alaa123321a', credentialsFilePath: credsPath, envAdminPassword: 'Alaa123321a' }),
    true
  );
  assert.equal(
    await verifyServerAdminLogin({ candidate: 'admin123', credentialsFilePath: credsPath, envAdminPassword: 'Alaa123321a' }),
    false
  );
  assert.equal(
    await verifyServerAdminLogin({ candidate: 'admin', credentialsFilePath: credsPath, envAdminPassword: 'Alaa123321a' }),
    false
  );
  assert.equal(
    await verifyServerAdminLogin({ candidate: 'Arnaout2027!', credentialsFilePath: credsPath, envAdminPassword: 'Alaa123321a' }),
    false
  );
  assert.equal(
    await verifyServerAdminLogin({ candidate: '', credentialsFilePath: credsPath, envAdminPassword: 'Alaa123321a' }),
    false
  );
});

test('rotateServerAdminPassword validates current password, updates bcrypt hash, and rejects old password', async () => {
  const credsPath = makeTempCredsPath('.admin_credentials.json');
  await ensureAdminCredentialRecord({
    credentialsFilePath: credsPath,
    envAdminPassword: 'Alaa123321a',
    rounds: 8,
  });

  const badCurrent = await rotateServerAdminPassword({
    currentPassword: 'admin123',
    newPassword: 'NewStrongPass99!',
    confirmPassword: 'NewStrongPass99!',
    credentialsFilePath: credsPath,
    envAdminPassword: 'Alaa123321a',
    rounds: 8,
  });
  assert.equal(badCurrent.success, false);

  const rotated = await rotateServerAdminPassword({
    currentPassword: 'Alaa123321a',
    newPassword: 'NewStrongPass99!',
    confirmPassword: 'NewStrongPass99!',
    credentialsFilePath: credsPath,
    envAdminPassword: 'Alaa123321a',
    rounds: 8,
  });
  assert.equal(rotated.success, true);

  assert.equal(
    await verifyServerAdminLogin({ candidate: 'Alaa123321a', credentialsFilePath: credsPath, envAdminPassword: 'Alaa123321a' }),
    false
  );
  assert.equal(
    await verifyServerAdminLogin({ candidate: 'NewStrongPass99!', credentialsFilePath: credsPath, envAdminPassword: 'Alaa123321a' }),
    true
  );

  const fileText = fs.readFileSync(credsPath, 'utf-8');
  assert.equal(fileText.includes('NewStrongPass99!'), false);
});
