import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import {
  ADMIN_DEFAULT_BCRYPT_HASH,
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

test('ensureAdminUsersRegistry seeds Alaa and admin with valid bcrypt hashes, super_admin role, and full_stock permission', async () => {
  const usersPath = makeTempCredsPath('.admin_users.json');
  assert.equal(isValidBcryptHash(ALAA_DEFAULT_BCRYPT_HASH), true);
  assert.equal(isValidBcryptHash(ADMIN_DEFAULT_BCRYPT_HASH), true);

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

  assert.ok(registry.admin);
  assert.equal(registry.admin.username, 'admin');
  assert.equal(registry.admin.role, 'super_admin');
  assert.equal(registry.admin.email, 'admin@arnaoutcell.com');
  assert.equal(registry.admin.permissions.includes('full_stock'), true);
  assert.equal(registry.admin.permissions.includes('full_admin'), true);
  assert.equal(isValidBcryptHash(registry.admin.passwordHash), true);
});

test('verifyServerAdminUserLogin authenticates per-user record (case-insensitive) and rejects unknown usernames', async () => {
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

  const adminWithAlaaPass = await verifyServerAdminUserLogin({
    username: 'admin',
    candidate: testPass,
    usersFilePath: usersPath,
  });
  assert.equal(adminWithAlaaPass.accountFound, true);
  assert.equal(adminWithAlaaPass.valid, false);

  const unknownUser = await verifyServerAdminUserLogin({
    username: 'unknown_staff',
    candidate: testPass,
    usersFilePath: usersPath,
  });
  assert.equal(unknownUser.accountFound, false);
  assert.equal(unknownUser.valid, false);
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

test('verifyServerAdminUserLogin authenticates Alaa with default seeded password and upgrades stale seeded hashes', async () => {
  const usersPath = makeTempCredsPath('.admin_users.json');

  // Simulate legacy .admin_users.json containing an outdated seeded_hash
  const staleHash = await hashAdminPasswordBcrypt('LegacyOldPass!123', 8);
  fs.writeFileSync(
    usersPath,
    JSON.stringify(
      {
        users: {
          alaa: {
            id: 'admin-alaa',
            username: 'Alaa',
            name: 'Alaa',
            email: 'alaa@onalaastore.com',
            role: 'super_admin',
            permissions: ['full_stock'],
            algorithm: 'bcrypt',
            rounds: 8,
            passwordHash: staleHash,
            source: 'seeded_hash',
            updatedAt: '2026-01-01T00:00:00.000Z',
          },
        },
      },
      null,
      2
    ),
    'utf-8'
  );

  const ok = await verifyServerAdminUserLogin({
    username: 'Alaa',
    candidate: 'Alaa123321a',
    usersFilePath: usersPath,
  });
  assert.equal(ok.accountFound, true);
  assert.equal(ok.valid, true);
  assert.equal(ok.user?.username, 'Alaa');
  assert.equal(ok.user?.role, 'super_admin');
  assert.equal(ok.user?.permissions.includes('full_stock'), true);

  const okLower = await verifyServerAdminUserLogin({
    username: 'alaa',
    candidate: 'Alaa123321a',
    usersFilePath: usersPath,
  });
  assert.equal(okLower.valid, true);

  const wrong = await verifyServerAdminUserLogin({
    username: 'Alaa',
    candidate: 'A1234554321a',
    usersFilePath: usersPath,
  });
  assert.equal(wrong.accountFound, true);
  assert.equal(wrong.valid, false);
});

test('verifyServerAdminUserLogin authenticates admin with Admin123321 (case-insensitive) and upgrades stale env/seeded hashes', async () => {
  const usersPath = makeTempCredsPath('.admin_users.json');
  const staleHash = await hashAdminPasswordBcrypt('Alaahassan1', 8);

  fs.writeFileSync(
    usersPath,
    JSON.stringify(
      {
        users: {
          admin: {
            id: 'u-1',
            username: 'admin',
            name: '3Laa Hassan',
            email: 'admin@arnaoutcell.com',
            role: 'product_manager',
            permissions: ['manage_products'],
            algorithm: 'bcrypt',
            rounds: 8,
            passwordHash: staleHash,
            source: 'seeded_hash',
            updatedAt: '2026-01-01T00:00:00.000Z',
          },
        },
      },
      null,
      2
    ),
    'utf-8'
  );

  const okExact = await verifyServerAdminUserLogin({
    username: 'admin',
    candidate: 'Admin123321',
    usersFilePath: usersPath,
  });
  assert.equal(okExact.accountFound, true);
  assert.equal(okExact.valid, true);
  assert.equal(okExact.user?.username, 'admin');
  assert.equal(okExact.user?.role, 'super_admin');
  assert.equal(okExact.user?.permissions.includes('full_stock'), true);
  assert.equal(okExact.user?.permissions.includes('full_admin'), true);

  const okUpper = await verifyServerAdminUserLogin({
    username: 'ADMIN',
    candidate: 'Admin123321',
    usersFilePath: usersPath,
  });
  assert.equal(okUpper.valid, true);

  const oldRejected = await verifyServerAdminUserLogin({
    username: 'admin',
    candidate: 'Alaahassan1',
    usersFilePath: usersPath,
  });
  assert.equal(oldRejected.accountFound, true);
  assert.equal(oldRejected.valid, false);
});



