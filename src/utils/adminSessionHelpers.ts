import crypto from 'node:crypto';

export const ADMIN_SESSION_COOKIE_NAME = 'onalaa_admin_session';
export const DEFAULT_SESSION_TTL_MS = 12 * 60 * 60 * 1000;

export type AdminSessionRole = 'super_admin' | 'manager' | 'editor';

export interface AdminSessionPayload {
  email: string;
  role: AdminSessionRole;
  authType: 'password' | 'firebase';
  iat: number;
  exp: number;
}

export interface FirebaseIdTokenClaims {
  iss: string;
  aud: string;
  sub: string;
  email?: string;
  email_verified?: boolean;
  exp: number;
  iat: number;
  auth_time?: number;
  name?: string;
}

let processEphemeralSecret: string | null = null;
let cachedCerts: { certs: Record<string, string>; expiresAtMs: number } | null = null;

/**
 * Uses the configured env secret when present, or generates a process-scoped
 * cryptographically random secret instead of ever falling back to a hardcoded literal.
 */
export function resolveEphemeralOrEnvSecret(envSecret?: string): string {
  const trimmed = typeof envSecret === 'string' ? envSecret.trim() : '';
  if (trimmed.length > 0) {
    return trimmed;
  }
  if (!processEphemeralSecret) {
    processEphemeralSecret = crypto.randomBytes(32).toString('hex');
  }
  return processEphemeralSecret;
}

function encodeBase64Url(input: Buffer | string): string {
  return Buffer.from(input).toString('base64url');
}

function decodeBase64Url(input: string): Buffer {
  return Buffer.from(input, 'base64url');
}

/**
 * Mints a compact HMAC-SHA256 signed admin session token.
 */
export function createAdminSessionToken(
  claims: Omit<AdminSessionPayload, 'iat' | 'exp'>,
  secret: string,
  nowMs: number = Date.now(),
  ttlMs: number = DEFAULT_SESSION_TTL_MS
): string {
  if (!secret) {
    throw new Error('Cannot sign admin session token without a signing secret.');
  }

  const headerSegment = encodeBase64Url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload: AdminSessionPayload = {
    email: claims.email,
    role: claims.role,
    authType: claims.authType,
    iat: nowMs,
    exp: nowMs + ttlMs,
  };
  const payloadSegment = encodeBase64Url(JSON.stringify(payload));
  const signingInput = `${headerSegment}.${payloadSegment}`;
  const signature = crypto.createHmac('sha256', secret).update(signingInput).digest('base64url');

  return `${signingInput}.${signature}`;
}

/**
 * Verifies an HMAC-SHA256 admin session token and checks expiration.
 */
export function verifyAdminSessionToken(
  token: string | undefined | null,
  secret: string,
  nowMs: number = Date.now()
): AdminSessionPayload | null {
  if (!token || !secret || typeof token !== 'string') {
    return null;
  }

  const parts = token.trim().split('.');
  if (parts.length !== 3) {
    return null;
  }

  const [headerSegment, payloadSegment, sigSegment] = parts;
  if (!headerSegment || !payloadSegment || !sigSegment) {
    return null;
  }

  try {
    const expectedSig = crypto
      .createHmac('sha256', secret)
      .update(`${headerSegment}.${payloadSegment}`)
      .digest();
    const providedSig = decodeBase64Url(sigSegment);

    if (expectedSig.length !== providedSig.length || !crypto.timingSafeEqual(expectedSig, providedSig)) {
      return null;
    }

    const parsedHeader = JSON.parse(decodeBase64Url(headerSegment).toString('utf8')) as { alg?: string };
    if (parsedHeader.alg !== 'HS256') {
      return null;
    }

    const parsedPayload = JSON.parse(decodeBase64Url(payloadSegment).toString('utf8')) as Partial<AdminSessionPayload>;
    if (
      typeof parsedPayload.email !== 'string' ||
      !parsedPayload.email ||
      (parsedPayload.role !== 'super_admin' &&
        parsedPayload.role !== 'manager' &&
        parsedPayload.role !== 'editor') ||
      (parsedPayload.authType !== 'password' && parsedPayload.authType !== 'firebase') ||
      typeof parsedPayload.iat !== 'number' ||
      typeof parsedPayload.exp !== 'number'
    ) {
      return null;
    }

    if (!Number.isFinite(parsedPayload.exp) || nowMs >= parsedPayload.exp) {
      return null;
    }

    return parsedPayload as AdminSessionPayload;
  } catch {
    return null;
  }
}

/**
 * Parses an HTTP Cookie header string into key-value pairs safely.
 */
export function parseCookies(cookieHeader: string | undefined): Record<string, string> {
  const cookies: Record<string, string> = {};
  if (!cookieHeader || typeof cookieHeader !== 'string') {
    return cookies;
  }

  for (const part of cookieHeader.split(';')) {
    const eqIndex = part.indexOf('=');
    if (eqIndex <= 0) continue;
    const key = part.slice(0, eqIndex).trim();
    const rawVal = part.slice(eqIndex + 1).trim();
    if (!key) continue;
    try {
      cookies[key] = decodeURIComponent(rawVal);
    } catch {
      cookies[key] = rawVal;
    }
  }

  return cookies;
}

/**
 * Extracts admin token from Bearer Authorization header first, falling back to HttpOnly cookie.
 */
export function extractBearerOrCookieToken(
  headers: { authorization?: string; cookie?: string },
  cookieName: string = ADMIN_SESSION_COOKIE_NAME
): { token: string | null; source: 'bearer' | 'cookie' | null } {
  const authHeader = headers.authorization;
  if (typeof authHeader === 'string') {
    const match = authHeader.match(/^Bearer\s+(.+)$/i);
    if (match && match[1]?.trim()) {
      return { token: match[1].trim(), source: 'bearer' };
    }
  }

  const cookies = parseCookies(headers.cookie);
  const cookieToken = cookies[cookieName];
  if (cookieToken && cookieToken.trim()) {
    return { token: cookieToken.trim(), source: 'cookie' };
  }

  return { token: null, source: null };
}

function getHeaderString(
  headers: Record<string, string | string[] | undefined>,
  name: string
): string {
  const lower = name.toLowerCase();
  for (const [k, v] of Object.entries(headers)) {
    if (k.toLowerCase() === lower) {
      if (Array.isArray(v)) return v[0] || '';
      return typeof v === 'string' ? v : '';
    }
  }
  return '';
}

/**
 * CSRF defense-in-depth for cookie-authenticated mutations.
 * Blocks cross-site origins/referers and requires same-origin match or XMLHttpRequest header.
 */
export function isSameOriginMutationRequest(
  headers: Record<string, string | string[] | undefined>
): boolean {
  const secFetchSite = getHeaderString(headers, 'sec-fetch-site').trim().toLowerCase();
  if (secFetchSite === 'cross-site') {
    return false;
  }

  const forwardedHost = getHeaderString(headers, 'x-forwarded-host').split(',')[0].trim().toLowerCase();
  const host = (forwardedHost || getHeaderString(headers, 'host').split(',')[0].trim().toLowerCase());

  const origin = getHeaderString(headers, 'origin').trim();
  if (origin) {
    if (origin === 'null' || !host) return false;
    try {
      const originHost = new URL(origin).host.toLowerCase();
      return originHost === host;
    } catch {
      return false;
    }
  }

  const referer = getHeaderString(headers, 'referer').trim();
  if (referer) {
    if (!host) return false;
    try {
      const refererHost = new URL(referer).host.toLowerCase();
      return refererHost === host;
    } catch {
      return false;
    }
  }

  const xRequestedWith = getHeaderString(headers, 'x-requested-with').trim();
  if (xRequestedWith) {
    return true;
  }

  if (secFetchSite === 'same-origin' || secFetchSite === 'none') {
    return true;
  }

  return false;
}

/**
 * Cryptographically verifies a Firebase ID token against Google's x509 PEM certificates.
 */
export function verifyFirebaseAdminIdTokenWithCerts(
  idToken: string,
  certsByKid: Record<string, string>,
  projectId: string,
  nowSeconds: number = Math.floor(Date.now() / 1000)
): FirebaseIdTokenClaims | null {
  if (!idToken || !projectId || typeof idToken !== 'string') {
    return null;
  }

  const parts = idToken.trim().split('.');
  if (parts.length !== 3) {
    return null;
  }

  const [headerSegment, payloadSegment, sigSegment] = parts;
  if (!headerSegment || !payloadSegment || !sigSegment) {
    return null;
  }

  try {
    const header = JSON.parse(decodeBase64Url(headerSegment).toString('utf8')) as {
      alg?: string;
      kid?: string;
    };
    if (header.alg !== 'RS256' || typeof header.kid !== 'string' || !header.kid) {
      return null;
    }

    const certPem = certsByKid[header.kid];
    if (!certPem) {
      return null;
    }

    const signingInput = Buffer.from(`${headerSegment}.${payloadSegment}`, 'utf8');
    const signatureBuf = decodeBase64Url(sigSegment);
    const signatureValid = crypto.verify('RSA-SHA256', signingInput, certPem, signatureBuf);
    if (!signatureValid) {
      return null;
    }

    const claims = JSON.parse(decodeBase64Url(payloadSegment).toString('utf8')) as Partial<FirebaseIdTokenClaims>;
    const expectedIss = `https://securetoken.google.com/${projectId}`;

    if (
      claims.aud !== projectId ||
      claims.iss !== expectedIss ||
      typeof claims.sub !== 'string' ||
      claims.sub.trim() === '' ||
      typeof claims.exp !== 'number' ||
      typeof claims.iat !== 'number' ||
      claims.exp <= nowSeconds ||
      claims.iat > nowSeconds + 300 ||
      claims.email_verified !== true ||
      typeof claims.email !== 'string' ||
      claims.email.trim() === ''
    ) {
      return null;
    }

    return claims as FirebaseIdTokenClaims;
  } catch {
    return null;
  }
}

async function fetchGoogleSecureTokenCerts(): Promise<Record<string, string>> {
  const now = Date.now();
  if (cachedCerts && now < cachedCerts.expiresAtMs) {
    return cachedCerts.certs;
  }

  const response = await fetch(
    'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com'
  );
  if (!response.ok) {
    throw new Error(`Failed to fetch Google x509 certificates (${response.status})`);
  }

  const cacheControl = response.headers.get('cache-control') || '';
  const maxAgeMatch = cacheControl.match(/max-age=(\d+)/i);
  const maxAgeSeconds = maxAgeMatch ? Math.max(60, Number(maxAgeMatch[1])) : 3600;
  const certs = (await response.json()) as Record<string, string>;

  cachedCerts = {
    certs,
    expiresAtMs: now + maxAgeSeconds * 1000,
  };
  return certs;
}

/**
 * Verifies a Firebase Auth ID token online using Google's rotating x509 signing certificates.
 */
export async function verifyFirebaseAdminIdToken(
  idToken: string,
  projectId: string,
  nowSeconds: number = Math.floor(Date.now() / 1000)
): Promise<FirebaseIdTokenClaims | null> {
  try {
    const certs = await fetchGoogleSecureTokenCerts();
    return verifyFirebaseAdminIdTokenWithCerts(idToken, certs, projectId, nowSeconds);
  } catch {
    return null;
  }
}
