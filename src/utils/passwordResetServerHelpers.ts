import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { BCRYPT_SALT_ROUNDS, hashAdminPasswordBcrypt } from './adminAuthServerHelpers';

export const RESET_TOKEN_TTL_MINUTES = 15;
export const DEFAULT_ADMIN_RECOVERY_EMAILS = [
  'optimatech.lb@gmail.com',
  'admin@arnaoutcell.com',
];

export interface AdminResetTokenRecord {
  id: string;
  tokenHash: string;
  email: string;
  createdAt: string;
  expiresAt: string;
  usedAt?: string;
  invalidatedAt?: string;
}

export interface ResetTokenValidationResult {
  valid: boolean;
  reason?: 'missing' | 'not_found' | 'expired' | 'already_used' | 'invalidated';
  record?: AdminResetTokenRecord;
}

export function normalizeRecoveryEmail(email: unknown): string {
  return typeof email === 'string' ? email.trim().toLowerCase() : '';
}

export function isValidRecoveryEmailFormat(email: string): boolean {
  const normalized = normalizeRecoveryEmail(email);
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(normalized) && normalized.length <= 160;
}

export function getAuthorizedRecoveryEmails(envEmail?: string): string[] {
  const set = new Set<string>(DEFAULT_ADMIN_RECOVERY_EMAILS.map((e) => e.toLowerCase()));
  if (typeof envEmail === 'string') {
    for (const part of envEmail.split(',')) {
      const normalized = normalizeRecoveryEmail(part);
      if (normalized && isValidRecoveryEmailFormat(normalized)) {
        set.add(normalized);
      }
    }
  }
  return Array.from(set);
}

export function isAuthorizedRecoveryEmail(email: string, envEmail?: string): boolean {
  const normalized = normalizeRecoveryEmail(email);
  if (!normalized || !isValidRecoveryEmailFormat(normalized)) return false;
  return getAuthorizedRecoveryEmails(envEmail).includes(normalized);
}

export function generateSecureResetToken(): string {
  return crypto.randomBytes(32).toString('base64url');
}

export function hashResetToken(rawToken: string): string {
  const trimmed = typeof rawToken === 'string' ? rawToken.trim() : '';
  return crypto.createHash('sha256').update(`onalaa-reset:${trimmed}`, 'utf8').digest('hex');
}

export function buildAdminResetUrl(baseUrl: string | undefined, rawToken: string): string {
  const fallbackBase = 'http://localhost:3000';
  const candidate = typeof baseUrl === 'string' && baseUrl.trim() ? baseUrl.trim() : fallbackBase;
  try {
    const parsed = new URL(candidate);
    parsed.searchParams.set('adminResetToken', rawToken.trim());
    return parsed.toString();
  } catch {
    return `${fallbackBase}/?adminResetToken=${encodeURIComponent(rawToken.trim())}`;
  }
}

export function createResetTokenRecord(options: {
  email: string;
  rawToken?: string;
  nowMs?: number;
  ttlMinutes?: number;
}): { rawToken: string; record: AdminResetTokenRecord } {
  const nowMs = options.nowMs ?? Date.now();
  const ttlMinutes = options.ttlMinutes ?? RESET_TOKEN_TTL_MINUTES;
  const rawToken = options.rawToken?.trim() || generateSecureResetToken();
  const tokenHash = hashResetToken(rawToken);
  const createdAt = new Date(nowMs).toISOString();
  const expiresAt = new Date(nowMs + ttlMinutes * 60 * 1000).toISOString();

  return {
    rawToken,
    record: {
      id: `rst-${nowMs}-${crypto.randomBytes(4).toString('hex')}`,
      tokenHash,
      email: normalizeRecoveryEmail(options.email),
      createdAt,
      expiresAt,
    },
  };
}

export function validateResetTokenRecord(
  records: readonly AdminResetTokenRecord[],
  rawToken: string,
  nowMs: number = Date.now()
): ResetTokenValidationResult {
  const trimmed = typeof rawToken === 'string' ? rawToken.trim() : '';
  if (!trimmed) {
    return { valid: false, reason: 'missing' };
  }

  const candidateHash = hashResetToken(trimmed);
  const match = records.find((r) => r.tokenHash === candidateHash);
  if (!match) {
    return { valid: false, reason: 'not_found' };
  }

  if (match.usedAt) {
    return { valid: false, reason: 'already_used', record: match };
  }

  if (match.invalidatedAt) {
    return { valid: false, reason: 'invalidated', record: match };
  }

  const expiresMs = Date.parse(match.expiresAt);
  if (Number.isNaN(expiresMs) || nowMs > expiresMs) {
    return { valid: false, reason: 'expired', record: match };
  }

  return { valid: true, record: match };
}

export function buildAdminPasswordResetEmail(options: {
  recipientEmail: string;
  resetUrl: string;
  rawToken: string;
  expiresMinutes?: number;
  lang?: 'en' | 'ar';
  storeName?: string;
}): { subject: string; html: string; text: string } {
  const expiresMinutes = options.expiresMinutes ?? RESET_TOKEN_TTL_MINUTES;
  const storeName = options.storeName || 'ON AlAA STORE';
  const isAr = options.lang === 'ar';

  if (isAr) {
    const subject = `استعادة كلمة مرور المدير — ${storeName}`;
    const text = [
      `${storeName} — استعادة كلمة مرور بوابة الإدارة`,
      '',
      `تم استلام طلب لإعادة تعيين كلمة مرور حساب المدير المرتبط بالبريد: ${options.recipientEmail}.`,
      '',
      'افتح الرابط الآمن أدناه لإعادة تعيين كلمة المرور (صالح لمرة واحدة فقط خلال ' +
        expiresMinutes +
        ' دقيقة):',
      options.resetUrl,
      '',
      `أو أدخل رمز الاستعادة المؤقت يدوياً: ${options.rawToken}`,
      '',
      'إذا لم تطلب هذا التغيير، يرجى تجاهل هذه الرسالة ومراجعة سجل النشاط الأمني.',
    ].join('\n');

    const html = `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<body style="margin:0;padding:24px;background:#F5F8FC;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#172033;">
  <div style="max-width:560px;margin:0 auto;background:#FFFFFF;border:1px solid #DCE5F0;border-radius:16px;padding:32px;">
    <h2 style="margin:0 0 8px;font-size:20px;color:#172033;">استعادة كلمة مرور المدير</h2>
    <p style="margin:0 0 20px;font-size:13px;color:#64748B;">${storeName} • بوابة الإدارة المركزية</p>
    <p style="margin:0 0 18px;font-size:14px;line-height:1.6;">تم استلام طلب لإعادة تعيين كلمة مرور حساب المدير (${options.recipientEmail}). هذا الرمز صالح للاستخدام <strong>مرة واحدة فقط</strong> وينتهي خلال <strong>${expiresMinutes} دقيقة</strong>.</p>
    <div style="margin:24px 0;">
      <a href="${options.resetUrl}" style="display:inline-block;background:#007AFF;color:#FFFFFF;text-decoration:none;font-weight:700;font-size:14px;padding:12px 24px;border-radius:10px;">إعادة تعيين كلمة المرور</a>
    </div>
    <div style="background:#F5F8FC;border:1px solid #DCE5F0;border-radius:10px;padding:14px;margin-bottom:18px;">
      <div style="font-size:11px;color:#64748B;margin-bottom:4px;">رمز التحقق لمرة واحدة (One-Time Token):</div>
      <code style="font-family:monospace;font-size:12px;color:#172033;word-break:break-all;">${options.rawToken}</code>
    </div>
    <p style="margin:0;font-size:12px;color:#64748B;line-height:1.5;">إذا لم تقم بطلب إعادة تعيين كلمة المرور، يمكنك تجاهل هذا البريد بأمان.</p>
  </div>
</body>
</html>`;
    return { subject, html, text };
  }

  const subject = `Administrator Password Reset — ${storeName}`;
  const text = [
    `${storeName} — Administrator Password Recovery`,
    '',
    `A password reset was requested for the administrator account (${options.recipientEmail}).`,
    '',
    `Open the secure one-time recovery link below (expires in ${expiresMinutes} minutes):`,
    options.resetUrl,
    '',
    `Or paste this one-time recovery token manually in the Admin Portal: ${options.rawToken}`,
    '',
    'If you did not request this reset, ignore this email and review your Admin Activity Log.',
  ].join('\n');

  const html = `<!DOCTYPE html>
<html lang="en">
<body style="margin:0;padding:24px;background:#F5F8FC;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#172033;">
  <div style="max-width:560px;margin:0 auto;background:#FFFFFF;border:1px solid #DCE5F0;border-radius:16px;padding:32px;">
    <h2 style="margin:0 0 8px;font-size:20px;color:#172033;">Administrator Password Reset</h2>
    <p style="margin:0 0 20px;font-size:13px;color:#64748B;">${storeName} · Central Security Portal</p>
    <p style="margin:0 0 18px;font-size:14px;line-height:1.6;">A password recovery request was initiated for <strong>${options.recipientEmail}</strong>. This recovery token is valid for <strong>single use only</strong> and expires in <strong>${expiresMinutes} minutes</strong>.</p>
    <div style="margin:24px 0;">
      <a href="${options.resetUrl}" style="display:inline-block;background:#007AFF;color:#FFFFFF;text-decoration:none;font-weight:700;font-size:14px;padding:12px 24px;border-radius:10px;">Reset Administrator Password</a>
    </div>
    <div style="background:#F5F8FC;border:1px solid #DCE5F0;border-radius:10px;padding:14px;margin-bottom:18px;">
      <div style="font-size:11px;color:#64748B;margin-bottom:4px;">One-Time Recovery Token:</div>
      <code style="font-family:monospace;font-size:12px;color:#172033;word-break:break-all;">${options.rawToken}</code>
    </div>
    <p style="margin:0;font-size:12px;color:#64748B;line-height:1.5;">If you did not request this password reset, please ignore this email and review the Security Activity Log.</p>
  </div>
</body>
</html>`;

  return { subject, html, text };
}

export async function sendResendPasswordResetEmail(options: {
  apiKey: string;
  from: string;
  to: string;
  subject: string;
  html: string;
  text: string;
  fetchImpl?: typeof fetch;
}): Promise<{ ok: boolean; emailId?: string; error?: string }> {
  const fetchFn = options.fetchImpl ?? fetch;
  try {
    const response = await fetchFn('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${options.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: options.from,
        to: [options.to],
        subject: options.subject,
        html: options.html,
        text: options.text,
      }),
    });

    const body = (await response.json().catch(() => ({}))) as {
      id?: string;
      message?: string;
      error?: string;
    };

    if (!response.ok) {
      return {
        ok: false,
        error: body.message || body.error || `Resend API responded with HTTP ${response.status}`,
      };
    }

    return {
      ok: true,
      emailId: body.id,
    };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Failed to reach Resend email service.',
    };
  }
}

export function loadResetTokenStore(filePath: string): AdminResetTokenRecord[] {
  try {
    if (!fs.existsSync(filePath)) return [];
    const parsed = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    return Array.isArray(parsed) ? (parsed as AdminResetTokenRecord[]) : [];
  } catch {
    return [];
  }
}

export function saveResetTokenStore(
  filePath: string,
  records: AdminResetTokenRecord[],
  nowMs: number = Date.now()
): void {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  // Prune records older than 7 days while retaining recent audit state
  const cutoffMs = nowMs - 7 * 24 * 60 * 60 * 1000;
  const pruned = records.filter((r) => (Date.parse(r.createdAt) || nowMs) >= cutoffMs).slice(0, 100);
  fs.writeFileSync(filePath, JSON.stringify(pruned, null, 2), 'utf-8');
}

export async function consumeResetTokenAndRotatePassword(options: {
  rawToken: string;
  newPassword: string;
  confirmPassword: string;
  tokenFilePath: string;
  credentialsFilePath: string;
  nowMs?: number;
}): Promise<{
  success: boolean;
  email?: string;
  messageEn: string;
  messageAr: string;
  reason?: ResetTokenValidationResult['reason'] | 'validation';
}> {
  const nowMs = options.nowMs ?? Date.now();

  if (!options.newPassword || options.newPassword.length < 8) {
    return {
      success: false,
      reason: 'validation',
      messageEn: 'New password must contain at least 8 characters.',
      messageAr: 'يجب أن تتكون كلمة المرور الجديدة من 8 أحرف على الأقل.',
    };
  }

  if (options.newPassword !== options.confirmPassword) {
    return {
      success: false,
      reason: 'validation',
      messageEn: 'New password and confirmation do not match.',
      messageAr: 'كلمة المرور الجديدة وتأكيدها غير متطابقين.',
    };
  }

  const records = loadResetTokenStore(options.tokenFilePath);
  const validation = validateResetTokenRecord(records, options.rawToken, nowMs);

  if (!validation.valid || !validation.record) {
    if (validation.reason === 'expired') {
      return {
        success: false,
        reason: 'expired',
        messageEn: 'This password reset token has expired. Please request a new recovery email.',
        messageAr: 'انتهت صلاحية رمز استعادة كلمة المرور. يرجى طلب رمز جديد.',
      };
    }
    if (validation.reason === 'already_used' || validation.reason === 'invalidated') {
      return {
        success: false,
        reason: validation.reason,
        messageEn: 'This password reset token has already been used or superseded.',
        messageAr: 'تم استخدام رمز استعادة كلمة المرور مسبقاً أو تم استبداله.',
      };
    }
    return {
      success: false,
      reason: 'not_found',
      messageEn: 'Invalid password reset token. Please check the code from your email.',
      messageAr: 'رمز استعادة كلمة المرور غير صالح. يرجى التحقق من الرمز المرسل لبريدك.',
    };
  }

  const matchedEmail = validation.record.email;
  const usedTimestamp = new Date(nowMs).toISOString();

  // Hash new password with bcrypt (12 rounds) and persist into .admin_credentials.json
  const passwordHash = await hashAdminPasswordBcrypt(options.newPassword, BCRYPT_SALT_ROUNDS);
  const dir = path.dirname(options.credentialsFilePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(
    options.credentialsFilePath,
    JSON.stringify(
      {
        algorithm: 'bcrypt',
        rounds: BCRYPT_SALT_ROUNDS,
        passwordHash,
        source: 'user',
        updatedAt: usedTimestamp,
      },
      null,
      2
    ),
    'utf-8'
  );

  // Mark consumed token used AND invalidate all other open tokens for strict one-time hygiene
  const updatedRecords = records.map((rec) => {
    if (rec.id === validation.record!.id) {
      return { ...rec, usedAt: usedTimestamp };
    }
    if (!rec.usedAt && !rec.invalidatedAt) {
      return { ...rec, invalidatedAt: usedTimestamp };
    }
    return rec;
  });
  saveResetTokenStore(options.tokenFilePath, updatedRecords, nowMs);

  return {
    success: true,
    email: matchedEmail,
    messageEn: 'Administrator password has been reset and encrypted with bcrypt successfully.',
    messageAr: 'تمت إعادة تعيين كلمة مرور المدير وتشفيرها بنجاح. يمكنك تسجيل الدخول الآن.',
  };
}
