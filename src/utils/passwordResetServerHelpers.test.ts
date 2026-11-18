import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import bcrypt from 'bcryptjs';
import {
  buildAdminPasswordResetEmail,
  buildAdminResetUrl,
  consumeResetTokenAndRotatePassword,
  createResetTokenRecord,
  getAuthorizedRecoveryEmails,
  hashResetToken,
  isAuthorizedRecoveryEmail,
  isValidRecoveryEmailFormat,
  loadResetTokenStore,
  saveResetTokenStore,
  sendResendPasswordResetEmail,
  validateResetTokenRecord,
} from './passwordResetServerHelpers';

test('hashResetToken hashes raw tokens deterministically with SHA-256 and never stores plaintext', () => {
  const { rawToken, record } = createResetTokenRecord({
    email: 'OptimaTech.LB@gmail.com',
    nowMs: 1_700_000_000_000,
    ttlMinutes: 15,
  });

  assert.ok(rawToken.length >= 32);
  assert.notEqual(record.tokenHash, rawToken);
  assert.equal(record.tokenHash.length, 64);
  assert.equal(record.tokenHash, hashResetToken(rawToken));
  assert.equal(record.email, 'optimatech.lb@gmail.com');
});

test('authorized recovery email checks normalize case and validate format', () => {
  assert.equal(isValidRecoveryEmailFormat('optimatech.lb@gmail.com'), true);
  assert.equal(isValidRecoveryEmailFormat('bad-email'), false);

  const list = getAuthorizedRecoveryEmails('security@onalaa.com');
  assert.ok(list.includes('optimatech.lb@gmail.com'));
  assert.ok(list.includes('admin@arnaoutcell.com'));
  assert.ok(list.includes('security@onalaa.com'));

  assert.equal(isAuthorizedRecoveryEmail('OPTIMATECH.LB@GMAIL.COM'), true);
  assert.equal(isAuthorizedRecoveryEmail('intruder@example.com'), false);
});

test('validateResetTokenRecord rejects missing, unknown, expired, used, and invalidated tokens', () => {
  const now = 1_700_000_000_000;
  const { rawToken, record } = createResetTokenRecord({
    email: 'optimatech.lb@gmail.com',
    nowMs: now,
    ttlMinutes: 15,
  });

  assert.equal(validateResetTokenRecord([record], rawToken, now + 60_000).valid, true);
  assert.equal(validateResetTokenRecord([record], '', now).reason, 'missing');
  assert.equal(validateResetTokenRecord([record], 'wrong-token', now).reason, 'not_found');
  assert.equal(
    validateResetTokenRecord([record], rawToken, now + 16 * 60_000).reason,
    'expired'
  );
  assert.equal(
    validateResetTokenRecord([{ ...record, usedAt: new Date(now).toISOString() }], rawToken, now).reason,
    'already_used'
  );
  assert.equal(
    validateResetTokenRecord([{ ...record, invalidatedAt: new Date(now).toISOString() }], rawToken, now)
      .reason,
    'invalidated'
  );
});

test('buildAdminResetUrl and buildAdminPasswordResetEmail produce complete EN and AR payloads', () => {
  const url = buildAdminResetUrl('https://onalaa.example.com/', 'tok_abc123');
  assert.equal(url, 'https://onalaa.example.com/?adminResetToken=tok_abc123');

  const enEmail = buildAdminPasswordResetEmail({
    recipientEmail: 'optimatech.lb@gmail.com',
    resetUrl: url,
    rawToken: 'tok_abc123',
    expiresMinutes: 15,
    lang: 'en',
  });
  assert.ok(enEmail.subject.includes('Administrator Password Reset'));
  assert.ok(enEmail.html.includes(url));
  assert.ok(enEmail.text.includes('tok_abc123'));

  const arEmail = buildAdminPasswordResetEmail({
    recipientEmail: 'optimatech.lb@gmail.com',
    resetUrl: url,
    rawToken: 'tok_abc123',
    expiresMinutes: 15,
    lang: 'ar',
  });
  assert.ok(arEmail.subject.includes('استعادة كلمة مرور المدير'));
  assert.ok(arEmail.html.includes('dir="rtl"'));
});

test('sendResendPasswordResetEmail posts authorized Bearer payload to Resend API and handles errors', async () => {
  let capturedUrl = '';
  let capturedAuth = '';
  let capturedBody: Record<string, unknown> = {};

  const okRes = await sendResendPasswordResetEmail({
    apiKey: 're_test_12345',
    from: 'ON AlAA STORE <alerts@onalaastore.com>',
    to: 'optimatech.lb@gmail.com',
    subject: 'Reset Password',
    html: '<p>Reset</p>',
    text: 'Reset',
    fetchImpl: (async (url, init) => {
      capturedUrl = String(url);
      capturedAuth = String((init?.headers as Record<string, string>)?.Authorization || '');
      capturedBody = JSON.parse(String(init?.body || '{}'));
      return new Response(JSON.stringify({ id: 'email_resend_999' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }) as typeof fetch,
  });

  assert.equal(capturedUrl, 'https://api.resend.com/emails');
  assert.equal(capturedAuth, 'Bearer re_test_12345');
  assert.deepEqual(capturedBody.to, ['optimatech.lb@gmail.com']);
  assert.equal(okRes.ok, true);
  assert.equal(okRes.emailId, 'email_resend_999');

  const failRes = await sendResendPasswordResetEmail({
    apiKey: 're_bad',
    from: 'ON AlAA STORE <alerts@onalaastore.com>',
    to: 'optimatech.lb@gmail.com',
    subject: 'Reset Password',
    html: '<p>Reset</p>',
    text: 'Reset',
    fetchImpl: (async () =>
      new Response(JSON.stringify({ message: 'Invalid API key' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })) as typeof fetch,
  });

  assert.equal(failRes.ok, false);
  assert.equal(failRes.error, 'Invalid API key');
});

test('consumeResetTokenAndRotatePassword enforces single-use token and hashes new password with bcrypt', async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'onalaa-reset-test-'));
  const tokenFile = path.join(tmpDir, 'reset_tokens.json');
  const credFile = path.join(tmpDir, 'admin_creds.json');
  const now = 1_700_000_000_000;

  try {
    const { rawToken, record } = createResetTokenRecord({
      email: 'optimatech.lb@gmail.com',
      nowMs: now,
    });
    saveResetTokenStore(tokenFile, [record], now);

    const firstAttempt = await consumeResetTokenAndRotatePassword({
      rawToken,
      newPassword: 'StrongNewPass!2026',
      confirmPassword: 'StrongNewPass!2026',
      tokenFilePath: tokenFile,
      credentialsFilePath: credFile,
      nowMs: now + 30_000,
    });

    assert.equal(firstAttempt.success, true);
    assert.equal(firstAttempt.email, 'optimatech.lb@gmail.com');

    const storedCred = JSON.parse(fs.readFileSync(credFile, 'utf8'));
    assert.equal(storedCred.algorithm, 'bcrypt');
    assert.equal(storedCred.source, 'user');
    assert.equal(bcrypt.compareSync('StrongNewPass!2026', storedCred.passwordHash), true);

    const tokensAfter = loadResetTokenStore(tokenFile);
    assert.ok(tokensAfter[0].usedAt);

    // Replay same one-time token MUST be rejected
    const replayAttempt = await consumeResetTokenAndRotatePassword({
      rawToken,
      newPassword: 'AnotherPass!2026',
      confirmPassword: 'AnotherPass!2026',
      tokenFilePath: tokenFile,
      credentialsFilePath: credFile,
      nowMs: now + 60_000,
    });

    assert.equal(replayAttempt.success, false);
    assert.equal(replayAttempt.reason, 'already_used');
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});
