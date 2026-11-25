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

export interface StoredAdminAccountRecord {
  id: string;
  username: string;
  name: string;
  email: string;
  role: 'super_admin' | 'product_manager' | 'order_manager' | 'inventory_manager';
  permissions: string[];
  algorithm: 'bcrypt';
  rounds: number;
  passwordHash: string;
  source: 'seeded_hash' | 'env' | 'user';
  updatedAt: string;
}

// Precomputed salted cost-12 bcrypt hash for provisioned Super Admin 'Alaa' (no plaintext stored)
export const ALAA_DEFAULT_BCRYPT_HASH =
  '$2b$12$IbCM9phCaoKjLNSeozHWhuD0POXeuaRVgRCDdSfTDJu4UDO4p5JfS';

const ALAA_FULL_PERMISSIONS: string[] = [
  'full_stock',
  'full_admin',
  'manage_products',
  'manage_orders',
  'manage_inventory',
  'manage_categories',
  'manage_content',
  'manage_customers',
  'manage_settings',
  'view_analytics',
  'view_audit_logs',
];

function writeUsersRegistry(filePath: string, users: Record<string, StoredAdminAccountRecord>): void {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(filePath, JSON.stringify({ users }, null, 2), 'utf-8');
}

function readUsersRegistry(filePath: string): Record<string, StoredAdminAccountRecord> {
  try {
    if (!fs.existsSync(filePath)) return {};
    const parsed = JSON.parse(fs.readFileSync(filePath, 'utf-8')) as {
      users?: Record<string, Partial<StoredAdminAccountRecord>>;
    };
    const result: Record<string, StoredAdminAccountRecord> = {};
    if (parsed && parsed.users && typeof parsed.users === 'object') {
      for (const [key, rec] of Object.entries(parsed.users)) {
        if (
          rec &&
          typeof rec.username === 'string' &&
          typeof rec.email === 'string' &&
          typeof rec.role === 'string' &&
          isValidBcryptHash(rec.passwordHash)
        ) {
          result[key.toLowerCase()] = {
            id: typeof rec.id === 'string' && rec.id ? rec.id : `admin-${key.toLowerCase()}`,
            username: rec.username,
            name: typeof rec.name === 'string' && rec.name ? rec.name : rec.username,
            email: rec.email,
            role: rec.role as StoredAdminAccountRecord['role'],
            permissions: Array.isArray(rec.permissions) ? rec.permissions.map(String) : [],
            algorithm: 'bcrypt',
            rounds: typeof rec.rounds === 'number' ? rec.rounds : BCRYPT_SALT_ROUNDS,
            passwordHash: rec.passwordHash,
            source:
              rec.source === 'user' || rec.source === 'env' ? rec.source : 'seeded_hash',
            updatedAt: rec.updatedAt || new Date().toISOString(),
          };
        }
      }
    }
    return result;
  } catch {
    return {};
  }
}

/**
 * Ensures the server-side `.admin_users.json` registry exists and contains
 * the provisioned Super Admin account for `Alaa` (`full_stock` + `super_admin`),
 * hashed strictly with bcrypt. Supports optional `envAlaaPassword` override.
 */
export async function ensureAdminUsersRegistry(options: {
  usersFilePath: string;
  envAlaaPassword?: string;
  defaultAlaaHash?: string;
  rounds?: number;
}): Promise<Record<string, StoredAdminAccountRecord>> {
  const {
    usersFilePath,
    envAlaaPassword,
    defaultAlaaHash = ALAA_DEFAULT_BCRYPT_HASH,
    rounds = BCRYPT_SALT_ROUNDS,
  } = options;

  const trimmedEnvPassword = typeof envAlaaPassword === 'string' ? envAlaaPassword.trim() : '';
  const registry = readUsersRegistry(usersFilePath);
  let dirty = false;

  const existingAlaa = registry.alaa;
  if (!existingAlaa) {
    const passwordHash = trimmedEnvPassword
      ? await hashAdminPasswordBcrypt(trimmedEnvPassword, rounds)
      : defaultAlaaHash;

    registry.alaa = {
      id: 'admin-alaa',
      username: 'Alaa',
      name: 'Alaa',
      email: 'alaa@onalaastore.com',
      role: 'super_admin',
      permissions: [...ALAA_FULL_PERMISSIONS],
      algorithm: 'bcrypt',
      rounds,
      passwordHash,
      source: trimmedEnvPassword ? 'env' : 'seeded_hash',
      updatedAt: new Date().toISOString(),
    };
    dirty = true;
  } else {
    if (existingAlaa.role !== 'super_admin') {
      existingAlaa.role = 'super_admin';
      dirty = true;
    }
    for (const perm of ALAA_FULL_PERMISSIONS) {
      if (!existingAlaa.permissions.includes(perm)) {
        existingAlaa.permissions.push(perm);
        dirty = true;
      }
    }
    if (trimmedEnvPassword && existingAlaa.source !== 'user') {
      const matchesCurrentEnv = await bcrypt.compare(
        trimmedEnvPassword,
        existingAlaa.passwordHash
      );
      if (!matchesCurrentEnv) {
        existingAlaa.passwordHash = await hashAdminPasswordBcrypt(trimmedEnvPassword, rounds);
        existingAlaa.rounds = rounds;
        existingAlaa.source = 'env';
        existingAlaa.updatedAt = new Date().toISOString();
        dirty = true;
      }
    } else if (
      !trimmedEnvPassword &&
      existingAlaa.source === 'seeded_hash' &&
      existingAlaa.passwordHash !== defaultAlaaHash
    ) {
      existingAlaa.passwordHash = defaultAlaaHash;
      existingAlaa.rounds = rounds;
      existingAlaa.updatedAt = new Date().toISOString();
      dirty = true;
    }
  }

  if (dirty || !fs.existsSync(usersFilePath)) {
    writeUsersRegistry(usersFilePath, registry);
  }

  return registry;
}

export async function verifyServerAdminUserLogin(options: {
  username: string;
  candidate: string;
  usersFilePath: string;
  envAlaaPassword?: string;
}): Promise<{
  accountFound: boolean;
  valid: boolean;
  user?: Pick<StoredAdminAccountRecord, 'id' | 'username' | 'name' | 'email' | 'role' | 'permissions'>;
}> {
  const normalizedUsername =
    typeof options.username === 'string' ? options.username.trim().toLowerCase() : '';
  if (!normalizedUsername || !options.candidate || typeof options.candidate !== 'string') {
    return { accountFound: false, valid: false };
  }

  const registry = await ensureAdminUsersRegistry({
    usersFilePath: options.usersFilePath,
    envAlaaPassword: options.envAlaaPassword,
  });

  const record = registry[normalizedUsername];
  if (!record) {
    return { accountFound: false, valid: false };
  }

  const valid = await verifyAdminPasswordBcrypt(options.candidate, record.passwordHash);
  if (!valid) {
    return { accountFound: true, valid: false };
  }

  return {
    accountFound: true,
    valid: true,
    user: {
      id: record.id,
      username: record.username,
      name: record.name,
      email: record.email,
      role: record.role,
      permissions: [...record.permissions],
    },
  };
}

export async function rotateServerAdminUserPassword(options: {
  username: string;
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
  usersFilePath: string;
  envAlaaPassword?: string;
  rounds?: number;
}): Promise<{ success: boolean; messageEn: string; messageAr: string }> {
  const normalizedUsername =
    typeof options.username === 'string' ? options.username.trim().toLowerCase() : '';
  const rounds = options.rounds ?? BCRYPT_SALT_ROUNDS;

  if (!normalizedUsername) {
    return {
      success: false,
      messageEn: 'Administrator username is required.',
      messageAr: 'يرجى تحديد اسم المستخدم.',
    };
  }

  if (!options.currentPassword) {
    return {
      success: false,
      messageEn: 'Current password is required.',
      messageAr: 'يرجى إدخال كلمة المرور الحالية.',
    };
  }

  const verified = await verifyServerAdminUserLogin({
    username: normalizedUsername,
    candidate: options.currentPassword,
    usersFilePath: options.usersFilePath,
    envAlaaPassword: options.envAlaaPassword,
  });

  if (!verified.accountFound || !verified.valid) {
    return {
      success: false,
      messageEn: 'The current password you entered is incorrect.',
      messageAr: 'كلمة المرور الحالية غير صحيحة.',
    };
  }

  if (options.newPassword !== options.confirmPassword) {
    return {
      success: false,
      messageEn: 'New password and confirmation do not match.',
      messageAr: 'كلمة المرور الجديدة وتأكيدها غير متطابقين.',
    };
  }

  if (options.currentPassword === options.newPassword) {
    return {
      success: false,
      messageEn: 'New password must be different from current password.',
      messageAr: 'يجب أن تكون كلمة المرور الجديدة مختلفة عن كلمة المرور الحالية.',
    };
  }

  if (options.newPassword.length < 8) {
    return {
      success: false,
      messageEn: 'New password must contain at least 8 characters.',
      messageAr: 'يجب أن تتكون كلمة المرور الجديدة من 8 أحرف على الأقل.',
    };
  }

  const registry = readUsersRegistry(options.usersFilePath);
  const existing = registry[normalizedUsername];
  if (!existing) {
    return {
      success: false,
      messageEn: 'Administrator user record not found.',
      messageAr: 'لم يتم العثور على سجل المدير.',
    };
  }

  existing.passwordHash = await hashAdminPasswordBcrypt(options.newPassword, rounds);
  existing.rounds = rounds;
  existing.source = 'user';
  existing.updatedAt = new Date().toISOString();
  writeUsersRegistry(options.usersFilePath, registry);

  return {
    success: true,
    messageEn: 'Administrator password changed and hashed with bcrypt successfully.',
    messageAr: 'تم تغيير كلمة مرور المدير وتشفيرها باستخدام bcrypt بنجاح.',
  };
}

