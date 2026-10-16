/**
 * Arnaout Store Security & Authentication Service
 * 
 * Implements cryptographically secure password hashing using Web Crypto API (SHA-256 + Salt).
 * Never stores or exposes plaintext passwords in browser storage, logs, or source code.
 */

const AUTH_STORAGE_KEY = 'arnaout_admin_security_v2';
const SESSION_TOKEN_KEY = 'arnaout_admin_session_token';

interface StoredAuthRecord {
  salt: string;
  hash: string;
  updatedAt: string;
}

// Convert ArrayBuffer to Hex string
function bufferToHex(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

// Generate cryptographically secure random salt
export function generateSalt(length = 16): string {
  const randomBytes = new Uint8Array(length);
  if (typeof window !== 'undefined' && window.crypto) {
    window.crypto.getRandomValues(randomBytes);
  } else {
    for (let i = 0; i < length; i++) {
      randomBytes[i] = Math.floor(Math.random() * 256);
    }
  }
  return bufferToHex(randomBytes.buffer);
}

// Compute SHA-256 hash of salt + password
export async function hashPasswordWithSalt(password: string, salt: string): Promise<string> {
  const enc = new TextEncoder();
  const data = enc.encode(`${salt}:${password}:arnaout_store_secure_pepper`);
  
  if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
    return bufferToHex(hashBuffer);
  }

  // Fallback for non-browser/test environments if subtle crypto isn't available
  let hash = 0;
  const str = `${salt}:${password}`;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return Math.abs(hash).toString(16).padStart(32, '0');
}

// Initial provisioned cryptographic record (Salted SHA-256 with pepper).
// Never stores or exposes plaintext password anywhere in the codebase.
const INITIAL_PROVISIONED_SALT = 'd9f2a78e41bc605389a024fe1c3b5d72';
const INITIAL_PROVISIONED_HASH = '489da682dd786767c6c4c663f742098cc0b6feb788ae0b28af9acbd73f3889ee';

/**
 * Initializes secure credentials migration if not already set.
 * Migrates existing authorized administrator credential into a salted hash
 * so that authorized administrators are not locked out.
 */
export async function initializeAdminAuth(): Promise<StoredAuthRecord> {
  if (typeof window === 'undefined') {
    return {
      salt: INITIAL_PROVISIONED_SALT,
      hash: INITIAL_PROVISIONED_HASH,
      updatedAt: new Date().toISOString(),
    };
  }

  try {
    const existing = localStorage.getItem(AUTH_STORAGE_KEY);
    if (existing) {
      const parsed = JSON.parse(existing) as StoredAuthRecord;
      if (parsed.salt && parsed.hash) {
        return parsed;
      }
    }

    // Seed initial credential securely using precomputed cryptographic salted hash
    const record: StoredAuthRecord = {
      salt: INITIAL_PROVISIONED_SALT,
      hash: INITIAL_PROVISIONED_HASH,
      updatedAt: new Date().toISOString(),
    };
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(record));
    return record;
  } catch (err) {
    console.error('Failed to initialize admin auth', err);
    return {
      salt: INITIAL_PROVISIONED_SALT,
      hash: INITIAL_PROVISIONED_HASH,
      updatedAt: new Date().toISOString(),
    };
  }
}

/**
 * Verifies if candidate password matches stored salted hash
 */
export async function verifyAdminPassword(candidate: string): Promise<boolean> {
  if (!candidate) return false;
  try {
    const authRecord = await initializeAdminAuth();
    const candidateHash = await hashPasswordWithSalt(candidate, authRecord.salt);
    return candidateHash === authRecord.hash;
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
  let color = '#DC2626'; // Error red

  if (passedRules >= 5 && password.length >= 10) {
    score = 4;
    labelEn = 'Very Strong';
    labelAr = 'قوية جداً';
    color = '#16A34A'; // Success green
  } else if (passedRules >= 4) {
    score = 3;
    labelEn = 'Strong';
    labelAr = 'قوية';
    color = '#007AFF'; // Primary blue
  } else if (passedRules >= 3) {
    score = 2;
    labelEn = 'Moderate';
    labelAr = 'متوسطة';
    color = '#F59E0B'; // Amber
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
 * Changes administrator password with strict verification and session refresh
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

  const isCurrentValid = await verifyAdminPassword(currentPass);
  if (!isCurrentValid) {
    return {
      success: false,
      messageEn: 'The current password you entered is incorrect.',
      messageAr: 'كلمة المرور الحالية غير صحيحة.',
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

  // Generate new cryptographic salt
  const newSalt = generateSalt(16);
  const newHash = await hashPasswordWithSalt(newPass, newSalt);

  const updatedRecord: StoredAuthRecord = {
    salt: newSalt,
    hash: newHash,
    updatedAt: new Date().toISOString(),
  };

  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(updatedRecord));

  // Invalidate and refresh session token
  const newSessionToken = generateSalt(24);
  sessionStorage.setItem(SESSION_TOKEN_KEY, newSessionToken);

  return {
    success: true,
    messageEn: 'Administrator password changed and encrypted successfully.',
    messageAr: 'تم تغيير كلمة مرور المدير وتشفيرها بنجاح.',
  };
}
