/**
 * ON AlAA STORE Security & Authentication Service
 *
 * Delegates administrator credential verification and rotation to the server-side
 * bcrypt authentication controller (`/api/admin/auth/*`), which hashes the `.env`
 * `ADMIN_PASSWORD` using bcrypt rather than storing or checking plaintext passwords
 * in client code, browser storage, or databases.
 */

import bcrypt from 'bcryptjs';

const LEGACY_AUTH_STORAGE_KEY = 'arnaout_admin_security_v2';
const SESSION_TOKEN_KEY = 'arnaout_admin_session_token';

// Convert ArrayBuffer / Uint8Array to Hex string
function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

// Generate cryptographically secure random salt
export function generateSalt(length = 16): string {
  const randomBytes = new Uint8Array(length);
  if (typeof globalThis !== 'undefined' && globalThis.crypto?.getRandomValues) {
    globalThis.crypto.getRandomValues(randomBytes);
  } else {
    for (let i = 0; i < length; i++) {
      randomBytes[i] = Math.floor(Math.random() * 256);
    }
  }
  return bytesToHex(randomBytes);
}

// Compute cryptographic hash using salted SHA-256 (utility helper)
export async function hashPasswordWithSalt(password: string, salt: string): Promise<string> {
  const enc = new TextEncoder();
  const data = enc.encode(`${salt}:${password}:onalaa_store_secure_pepper`);

  if (typeof globalThis !== 'undefined' && globalThis.crypto?.subtle) {
    const hashBuffer = await globalThis.crypto.subtle.digest('SHA-256', data);
    return bytesToHex(new Uint8Array(hashBuffer));
  }

  let hash = 0;
  const str = `${salt}:${password}`;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return Math.abs(hash).toString(16).padStart(32, '0');
}

// Bcrypt hashing helper
export async function hashPasswordWithBcrypt(password: string, rounds = 12): Promise<string> {
  return bcrypt.hash(password, rounds);
}

export async function verifyPasswordWithBcrypt(candidate: string, hash: string): Promise<boolean> {
  if (!candidate || !hash) return false;
  return bcrypt.compare(candidate, hash);
}

/**
 * Ensures any legacy client-side credential artifacts are removed and confirms
 * server-side bcrypt auth store readiness.
 */
export async function initializeAdminAuth(): Promise<{ initialized: boolean; algorithm: string }> {
  if (typeof window !== 'undefined') {
    try {
      localStorage.removeItem(LEGACY_AUTH_STORAGE_KEY);
    } catch {
      // ignore
    }
  }

  if (typeof fetch === 'undefined') {
    return { initialized: true, algorithm: 'bcrypt' };
  }

  try {
    const response = await fetch('/api/admin/auth/status', {
      method: 'GET',
      credentials: 'same-origin',
    });
    if (!response.ok) {
      return { initialized: false, algorithm: 'bcrypt' };
    }
    return (await response.json()) as { initialized: boolean; algorithm: string };
  } catch {
    return { initialized: false, algorithm: 'bcrypt' };
  }
}

/**
 * Verifies administrator candidate password against the backend bcrypt hash.
 */
export async function verifyAdminPassword(candidate: string): Promise<boolean> {
  if (!candidate || typeof candidate !== 'string') return false;

  try {
    const response = await fetch('/api/admin/auth/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ password: candidate }),
    });

    if (!response.ok) return false;
    const data = (await response.json()) as { valid?: boolean };
    return data.valid === true;
  } catch {
    return false;
  }
}

/**
 * Password strength evaluator
 */
export interface PasswordStrength {
  score: number; // 0 to 4
  labelEn: string;
  labelAr: string;
  color: string;
  hasMinLength: boolean;
  hasUpper: boolean;
  hasLower: boolean;
  hasNumber: boolean;
  hasSpecial: boolean;
  feedbackEn: string[];
  feedbackAr: string[];
}

export function evaluatePasswordStrength(password: string): PasswordStrength {
  const hasMinLength = password.length >= 8;
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);

  let passedRules = 0;
  if (hasMinLength) passedRules++;
  if (hasUpper) passedRules++;
  if (hasLower) passedRules++;
  if (hasNumber) passedRules++;
  if (hasSpecial) passedRules++;

  const feedbackEn: string[] = [];
  const feedbackAr: string[] = [];

  if (!hasMinLength) {
    feedbackEn.push('At least 8 characters');
    feedbackAr.push('على الأقل 8 أحرف');
  }
  if (!hasUpper) {
    feedbackEn.push('At least one uppercase letter (A-Z)');
    feedbackAr.push('حرف كبير واحد على الأقل (A-Z)');
  }
  if (!hasLower) {
    feedbackEn.push('At least one lowercase letter (a-z)');
    feedbackAr.push('حرف صغير واحد على الأقل (a-z)');
  }
  if (!hasNumber) {
    feedbackEn.push('At least one number (0-9)');
    feedbackAr.push('رقم واحد على الأقل (0-9)');
  }
  if (!hasSpecial) {
    feedbackEn.push('At least one special symbol (!@#$%^&*)');
    feedbackAr.push('رمز خاص واحد على الأقل (!@#$%^&*)');
  }

  let score = 0;
  let labelEn = 'Very Weak';
  let labelAr = 'ضعيفة جداً';
  let color = '#DC2626';

  if (passedRules >= 5 && password.length >= 10) {
    score = 4;
    labelEn = 'Very Strong';
    labelAr = 'قوية جداً';
    color = '#16A34A';
  } else if (passedRules >= 4) {
    score = 3;
    labelEn = 'Strong';
    labelAr = 'قوية';
    color = '#007AFF';
  } else if (passedRules >= 3) {
    score = 2;
    labelEn = 'Moderate';
    labelAr = 'متوسطة';
    color = '#F59E0B';
  } else if (passedRules >= 2) {
    score = 1;
    labelEn = 'Weak';
    labelAr = 'ضعيفة';
    color = '#EF4444';
  }

  return {
    score,
    labelEn,
    labelAr,
    color,
    hasMinLength,
    hasUpper,
    hasLower,
    hasNumber,
    hasSpecial,
    feedbackEn,
    feedbackAr,
  };
}

/**
 * Changes administrator password via backend bcrypt rotation controller and refreshes session token.
 */
export async function changeAdminPassword(
  currentPass: string,
  newPass: string,
  confirmPass: string
): Promise<{ success: boolean; messageEn: string; messageAr: string }> {
  if (!currentPass) {
    return {
      success: false,
      messageEn: 'Current password is required.',
      messageAr: 'يرجى إدخال كلمة المرور الحالية.',
    };
  }

  if (newPass !== confirmPass) {
    return {
      success: false,
      messageEn: 'New password and confirmation do not match.',
      messageAr: 'كلمة المرور الجديدة وتأكيدها غير متطابقين.',
    };
  }

  if (currentPass === newPass) {
    return {
      success: false,
      messageEn: 'New password must be different from current password.',
      messageAr: 'يجب أن تكون كلمة المرور الجديدة مختلفة عن كلمة المرور الحالية.',
    };
  }

  const strength = evaluatePasswordStrength(newPass);
  if (strength.score < 2 || !strength.hasMinLength) {
    return {
      success: false,
      messageEn: 'New password does not meet security requirements: ' + strength.feedbackEn.join(', '),
      messageAr: 'كلمة المرور الجديدة لا تستوفي متطلبات الأمان المطلوبة: ' + strength.feedbackAr.join('، '),
    };
  }

  try {
    const response = await fetch('/api/admin/auth/change-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({
        currentPassword: currentPass,
        newPassword: newPass,
        confirmPassword: confirmPass,
      }),
    });

    const data = (await response.json()) as {
      success: boolean;
      messageEn?: string;
      messageAr?: string;
    };

    if (!response.ok || !data.success) {
      return {
        success: false,
        messageEn: data.messageEn || 'Failed to update administrator password.',
        messageAr: data.messageAr || 'تعذر تحديث كلمة مرور المدير.',
      };
    }

    if (typeof window !== 'undefined') {
      try {
        const newSessionToken = generateSalt(24);
        sessionStorage.setItem(SESSION_TOKEN_KEY, newSessionToken);
      } catch {
        // ignore
      }
    }

    return {
      success: true,
      messageEn: data.messageEn || 'Administrator password changed and encrypted with bcrypt successfully.',
      messageAr: data.messageAr || 'تم تغيير كلمة مرور المدير وتشفيرها باستخدام bcrypt بنجاح.',
    };
  } catch {
    return {
      success: false,
      messageEn: 'Network error while updating administrator password.',
      messageAr: 'حدث خطأ في الشبكة أثناء تحديث كلمة مرور المدير.',
    };
  }
}
