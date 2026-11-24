import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import {
  ALAA_DEFAULT_BCRYPT_HASH,
  isValidBcryptHash,
  hashAdminPasswordBcrypt,
  verifyAdminPasswordBcrypt,
  ensureAdminCredentialRecord,
  verifyServerAdminLogin,
  rotateServerAdminPassword,
  ensureAdminUsersRegistry,
  verifyServerAdminUserLogin,
  rotateServerAdminUserPassword,
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

test('ensureAdminUsersRegistry seeds Alaa with valid bcrypt hash, super_admin role, and full_stock permission', async () => {
  const usersPath = makeTempCredsPath('.admin_users.json');
  assert.equal(isValidBcryptHash(ALAA_DEFAULT_BCRYPT_HASH), true);

  const registry = await ensureAdminUsersRegistry({
    usersFilePath: usersPath,
    rounds: 8,
  });

  assert.ok(registry.alaa);
  assert.equal(registry.alaa.username, 'Alaa');
  assert.equal(registry.alaa.role, 'super_admin');
  assert.equal(registry.alaa.email, 'alaa@onalaastore.com');
  assert.equal(registry.alaa.permissions.includes('full_stock'), true);
  assert.equal(isValidBcryptHash(registry.alaa.passwordHash), true);
});

test('verifyServerAdminUserLogin authenticates per-user record (case-insensitive) and isolates from legacy usernames', async () => {
  const usersPath = makeTempCredsPath('.admin_users.json');
  const testPass = 'TempAlaaTestPass#2027';

  await ensureAdminUsersRegistry({
    usersFilePath: usersPath,
    envAlaaPassword: testPass,
    rounds: 8,
  });

  const okExact = await verifyServerAdminUserLogin({
    username: 'Alaa',
    candidate: testPass,
    usersFilePath: usersPath,
  });
  assert.equal(okExact.accountFound, true);
  assert.equal(okExact.valid, true);
  assert.equal(okExact.user?.role, 'super_admin');
  assert.equal(okExact.user?.permissions.includes('full_stock'), true);

  const badPass = await verifyServerAdminUserLogin({
    username: 'alaa',
    candidate: 'wrong-pass',
    usersFilePath: usersPath,
  });
  assert.equal(badPass.accountFound, true);
  assert.equal(badPass.valid, false);
  assert.equal(badPass.user, undefined);

  const legacyFallback = await verifyServerAdminUserLogin({
    username: 'admin',
    candidate: testPass,
    usersFilePath: usersPath,
  });
  assert.equal(legacyFallback.accountFound, false);
  assert.equal(legacyFallback.valid, false);
});

test('rotateServerAdminUserPassword updates only the targeted user bcrypt hash', async () => {
  const usersPath = makeTempCredsPath('.admin_users.json');
  const initialPass = 'TempAlaaInitial#2027';
  const nextPass = 'TempAlaaRotated#2028';

  await ensureAdminUsersRegistry({
    usersFilePath: usersPath,
    envAlaaPassword: initialPass,
    rounds: 8,
  });

  const rotated = await rotateServerAdminUserPassword({
    username: 'Alaa',
    currentPassword: initialPass,
    newPassword: nextPass,
    confirmPassword: nextPass,
    usersFilePath: usersPath,
    rounds: 8,
  });
  assert.equal(rotated.success, true);

  const oldCheck = await verifyServerAdminUserLogin({
    username: 'alaa',
    candidate: initialPass,
    usersFilePath: usersPath,
  });
  assert.equal(oldCheck.valid, false);

  const newCheck = await verifyServerAdminUserLogin({
    username: 'Alaa',
    candidate: nextPass,
    usersFilePath: usersPath,
  });
  assert.equal(newCheck.valid, true);

  const rawFile = fs.readFileSync(usersPath, 'utf-8');
  assert.equal(rawFile.includes(nextPass), false);
});

