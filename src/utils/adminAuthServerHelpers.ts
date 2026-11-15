import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';

export const BCRYPT_SALT_ROUNDS = 12;

export interface StoredAdminCredentialRecord {
  algorithm: 'bcrypt';
  rounds: number;
  passwordHash: string;
  source: 'env' | 'user';
  updatedAt: string;
}

export function isValidBcryptHash(hash: unknown): hash is string {
  return typeof hash === 'string' && /^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/.test(hash);
}

export async function hashAdminPasswordBcrypt(
  rawPassword: string,
  rounds: number = BCRYPT_SALT_ROUNDS
): Promise<string> {
  if (!rawPassword || typeof rawPassword !== 'string') {
    throw new Error('Administrator password must be a non-empty string.');
  }
  return bcrypt.hash(rawPassword, rounds);
}

export async function verifyAdminPasswordBcrypt(
  candidate: string,
  storedHash: string
): Promise<boolean> {
  if (!candidate || typeof candidate !== 'string' || !isValidBcryptHash(storedHash)) {
    return false;
  }
  return bcrypt.compare(candidate, storedHash);
}

/**
 * Ensures the server-side admin credential file exists and contains a valid bcrypt hash.
 * Raw passwords from `.env` (`ADMIN_PASSWORD`) are hashed immediately with bcrypt and
 * NEVER persisted in plaintext. If `source === 'env'` and `.env`'s ADMIN_PASSWORD changes,
 * the stored bcrypt hash automatically synchronizes to match the updated `.env` credential.
 */
export async function ensureAdminCredentialRecord(options: {
  credentialsFilePath: string;
  envAdminPassword?: string;
  rounds?: number;
}): Promise<StoredAdminCredentialRecord | null> {
  const {
    credentialsFilePath,
    envAdminPassword,
    rounds = BCRYPT_SALT_ROUNDS,
  } = options;

  const trimmedEnvPassword = typeof envAdminPassword === 'string' ? envAdminPassword.trim() : '';

  let existing: StoredAdminCredentialRecord | null = null;
  try {
    if (fs.existsSync(credentialsFilePath)) {
      const raw = fs.readFileSync(credentialsFilePath, 'utf-8');
      const parsed = JSON.parse(raw) as Partial<StoredAdminCredentialRecord>;
      if (parsed.algorithm === 'bcrypt' && isValidBcryptHash(parsed.passwordHash)) {
        existing = {
          algorithm: 'bcrypt',
          rounds: typeof parsed.rounds === 'number' ? parsed.rounds : rounds,
          passwordHash: parsed.passwordHash,
          source: parsed.source === 'user' ? 'user' : 'env',
          updatedAt: parsed.updatedAt || new Date().toISOString(),
        };
      }
    }
  } catch {
    existing = null;
  }

  if (existing) {
    if (existing.source === 'env' && trimmedEnvPassword) {
      const matchesCurrentEnv = await bcrypt.compare(trimmedEnvPassword, existing.passwordHash);
      if (!matchesCurrentEnv) {
        const updatedHash = await hashAdminPasswordBcrypt(trimmedEnvPassword, rounds);
        const syncedRecord: StoredAdminCredentialRecord = {
          algorithm: 'bcrypt',
          rounds,
          passwordHash: updatedHash,
          source: 'env',
          updatedAt: new Date().toISOString(),
        };
        writeCredentialRecord(credentialsFilePath, syncedRecord);
        return syncedRecord;
      }
    }
    return existing;
  }

  if (!trimmedEnvPassword) {
    return null;
  }

  const passwordHash = await hashAdminPasswordBcrypt(trimmedEnvPassword, rounds);
  const seededRecord: StoredAdminCredentialRecord = {
    algorithm: 'bcrypt',
    rounds,
    passwordHash,
    source: 'env',
    updatedAt: new Date().toISOString(),
  };

  writeCredentialRecord(credentialsFilePath, seededRecord);
  return seededRecord;
}

function writeCredentialRecord(filePath: string, record: StoredAdminCredentialRecord): void {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(filePath, JSON.stringify(record, null, 2), 'utf-8');
}

export async function verifyServerAdminLogin(options: {
  candidate: string;
  credentialsFilePath: string;
  envAdminPassword?: string;
}): Promise<boolean> {
  const { candidate, credentialsFilePath, envAdminPassword } = options;
  if (!candidate || typeof candidate !== 'string') {
    return false;
  }

  const record = await ensureAdminCredentialRecord({
    credentialsFilePath,
    envAdminPassword,
  });

  if (!record) {
    return false;
  }

  return verifyAdminPasswordBcrypt(candidate, record.passwordHash);
}

export async function rotateServerAdminPassword(options: {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
  credentialsFilePath: string;
  envAdminPassword?: string;
  rounds?: number;
}): Promise<{ success: boolean; messageEn: string; messageAr: string }> {
  const {
    currentPassword,
    newPassword,
    confirmPassword,
    credentialsFilePath,
    envAdminPassword,
    rounds = BCRYPT_SALT_ROUNDS,
  } = options;

  if (!currentPassword) {
    return {
      success: false,
      messageEn: 'Current password is required.',
      messageAr: 'يرجى إدخال كلمة المرور الحالية.',
    };
  }

  const isCurrentValid = await verifyServerAdminLogin({
    candidate: currentPassword,
    credentialsFilePath,
    envAdminPassword,
  });

  if (!isCurrentValid) {
    return {
      success: false,
      messageEn: 'The current password you entered is incorrect.',
      messageAr: 'كلمة المرور الحالية غير صحيحة.',
    };
  }

  if (newPassword !== confirmPassword) {
    return {
      success: false,
      messageEn: 'New password and confirmation do not match.',
      messageAr: 'كلمة المرور الجديدة وتأكيدها غير متطابقين.',
    };
  }

  if (currentPassword === newPassword) {
    return {
      success: false,
      messageEn: 'New password must be different from current password.',
      messageAr: 'يجب أن تكون كلمة المرور الجديدة مختلفة عن كلمة المرور الحالية.',
    };
  }

  if (newPassword.length < 8) {
    return {
      success: false,
      messageEn: 'New password must contain at least 8 characters.',
      messageAr: 'يجب أن تتكون كلمة المرور الجديدة من 8 أحرف على الأقل.',
    };
  }

  const passwordHash = await hashAdminPasswordBcrypt(newPassword, rounds);
  const updatedRecord: StoredAdminCredentialRecord = {
    algorithm: 'bcrypt',
    rounds,
    passwordHash,
    source: 'user',
    updatedAt: new Date().toISOString(),
  };

  writeCredentialRecord(credentialsFilePath, updatedRecord);

  return {
    success: true,
    messageEn: 'Administrator password changed and hashed with bcrypt successfully.',
    messageAr: 'تم تغيير كلمة مرور المدير وتشفيرها باستخدام bcrypt بنجاح.',
  };
}
