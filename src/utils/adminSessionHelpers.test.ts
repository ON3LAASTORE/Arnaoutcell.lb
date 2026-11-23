import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {
  ADMIN_SESSION_COOKIE_NAME,
  resolveEphemeralOrEnvSecret,
  createAdminSessionToken,
  verifyAdminSessionToken,
  parseCookies,
  extractBearerOrCookieToken,
  isSameOriginMutationRequest,
  verifyFirebaseAdminIdTokenWithCerts,
} from './adminSessionHelpers';

test('resolveEphemeralOrEnvSecret uses env secret when provided or generates random secret', () => {
  assert.equal(resolveEphemeralOrEnvSecret('  my-custom-secret  '), 'my-custom-secret');
  const randomA = resolveEphemeralOrEnvSecret('');
  const randomB = resolveEphemeralOrEnvSecret(undefined);
  assert.ok(randomA.length >= 32);
  assert.equal(randomA, randomB);
});

test('createAdminSessionToken and verifyAdminSessionToken enforce signature and expiry', () => {
  const secret = 'test-hmac-secret-key-123';
  const now = 1_700_000_000_000;
  const token = createAdminSessionToken(
    { email: 'admin@onalaastore.com', role: 'super_admin', authType: 'password' },
    secret,
    now,
    60_000
  );

  const valid = verifyAdminSessionToken(token, secret, now + 30_000);
  assert.ok(valid);
  assert.equal(valid.email, 'admin@onalaastore.com');
  assert.equal(valid.role, 'super_admin');

  // Expired
  assert.equal(verifyAdminSessionToken(token, secret, now + 60_001), null);

  // Tampered signature or wrong secret
  assert.equal(verifyAdminSessionToken(token, 'wrong-secret', now + 10_000), null);
  const parts = token.split('.');
  const tamperedPayload = Buffer.from(
    JSON.stringify({ email: 'evil@attacker.com', role: 'super_admin', authType: 'password', iat: now, exp: now + 60_000 })
  ).toString('base64url');
  assert.equal(verifyAdminSessionToken(`${parts[0]}.${tamperedPayload}.${parts[2]}`, secret, now + 1000), null);
});

test('parseCookies and extractBearerOrCookieToken prioritize Bearer over cookie', () => {
  const cookies = parseCookies(`foo=bar; ${ADMIN_SESSION_COOKIE_NAME}=cookie.tok.en; encoded=a%20b`);
  assert.equal(cookies.foo, 'bar');
  assert.equal(cookies.encoded, 'a b');

  assert.deepEqual(
    extractBearerOrCookieToken({
      authorization: 'Bearer bearer.tok.en',
      cookie: `${ADMIN_SESSION_COOKIE_NAME}=cookie.tok.en`,
    }),
    { token: 'bearer.tok.en', source: 'bearer' }
  );

  assert.deepEqual(
    extractBearerOrCookieToken({
      cookie: `${ADMIN_SESSION_COOKIE_NAME}=cookie.tok.en`,
    }),
    { token: 'cookie.tok.en', source: 'cookie' }
  );
});

test('isSameOriginMutationRequest validates Origin/Referer against Host and blocks cross-site', () => {
  assert.equal(
    isSameOriginMutationRequest({
      host: 'shop.onalaa.run.app',
      origin: 'https://shop.onalaa.run.app',
    }),
    true
  );

  assert.equal(
    isSameOriginMutationRequest({
      'x-forwarded-host': 'shop.onalaa.run.app',
      host: 'localhost:3000',
      origin: 'https://shop.onalaa.run.app',
    }),
    true
  );

  assert.equal(
    isSameOriginMutationRequest({
      host: 'shop.onalaa.run.app',
      origin: 'https://evil.example',
    }),
    false
  );

  assert.equal(
    isSameOriginMutationRequest({
      host: 'shop.onalaa.run.app',
      'sec-fetch-site': 'cross-site',
    }),
    false
  );

  assert.equal(
    isSameOriginMutationRequest({
      host: 'shop.onalaa.run.app',
      'x-requested-with': 'XMLHttpRequest',
    }),
    true
  );
});

test('verifyFirebaseAdminIdTokenWithCerts validates RS256 signature, claims, and email verification', () => {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
  const publicPem = publicKey.export({ type: 'spki', format: 'pem' }).toString();
  const nowSec = Math.floor(Date.now() / 1000);
  const projectId = 'gen-lang-client-0031383285';

  const signJwt = (claims: Record<string, unknown>, kid = 'kid-1') => {
    const h = Buffer.from(JSON.stringify({ alg: 'RS256', kid })).toString('base64url');
    const p = Buffer.from(JSON.stringify(claims)).toString('base64url');
    const sig = crypto.sign('RSA-SHA256', Buffer.from(`${h}.${p}`), privateKey).toString('base64url');
    return `${h}.${p}.${sig}`;
  };

  const validToken = signJwt({
    iss: `https://securetoken.google.com/${projectId}`,
    aud: projectId,
    sub: 'uid-123',
    email: 'optimatech.lb@gmail.com',
    email_verified: true,
    iat: nowSec - 10,
    exp: nowSec + 3600,
  });

  const verified = verifyFirebaseAdminIdTokenWithCerts(
    validToken,
    { 'kid-1': publicPem },
    projectId,
    nowSec
  );
  assert.ok(verified);
  assert.equal(verified.email, 'optimatech.lb@gmail.com');

  // Unverified email rejected
  const unverifiedEmailToken = signJwt({
    iss: `https://securetoken.google.com/${projectId}`,
    aud: projectId,
    sub: 'uid-123',
    email: 'optimatech.lb@gmail.com',
    email_verified: false,
    iat: nowSec - 10,
    exp: nowSec + 3600,
  });
  assert.equal(
    verifyFirebaseAdminIdTokenWithCerts(unverifiedEmailToken, { 'kid-1': publicPem }, projectId, nowSec),
    null
  );

  // Wrong aud rejected
  const wrongAudToken = signJwt({
    iss: `https://securetoken.google.com/${projectId}`,
    aud: 'other-project',
    sub: 'uid-123',
    email: 'optimatech.lb@gmail.com',
    email_verified: true,
    iat: nowSec - 10,
    exp: nowSec + 3600,
  });
  assert.equal(
    verifyFirebaseAdminIdTokenWithCerts(wrongAudToken, { 'kid-1': publicPem }, projectId, nowSec),
    null
  );
});
