import express, { NextFunction, Request, Response } from 'express';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import fs from 'fs';
import compression from 'compression';
import { GoogleGenAI } from '@google/genai';
import {
  ensureAdminCredentialRecord,
  verifyServerAdminLogin,
  rotateServerAdminPassword,
} from './src/utils/adminAuthServerHelpers';
import {
  ADMIN_SESSION_COOKIE_NAME,
  AdminSessionRole,
  DEFAULT_SESSION_TTL_MS,
  createAdminSessionToken,
  extractBearerOrCookieToken,
  isSameOriginMutationRequest,
  resolveEphemeralOrEnvSecret,
  verifyAdminSessionToken,
  verifyFirebaseAdminIdToken,
} from './src/utils/adminSessionHelpers';
import {
  buildRestockNotificationEmail,
  buildStockNotificationDocId,
  StockNotificationRecord,
} from './src/utils/stockNotificationHelpers';
import {
  ActivityLogEntry,
  CreateActivityLogInput,
  filterActivityLogs,
  mergeActivityLogs,
  sanitizeActivityLogEntry,
} from './src/utils/activityLogHelpers';
import {
  RESET_TOKEN_TTL_MINUTES,
  buildAdminPasswordResetEmail,
  buildAdminResetUrl,
  consumeResetTokenAndRotatePassword,
  createResetTokenRecord,
  isAuthorizedRecoveryEmail,
  isValidRecoveryEmailFormat,
  loadResetTokenStore,
  normalizeRecoveryEmail,
  saveResetTokenStore,
  sendResendPasswordResetEmail,
  validateResetTokenRecord,
} from './src/utils/passwordResetServerHelpers';
import {
  executeWithGeminiRetryAndFallback,
  parseGeminiSdkError,
} from './src/utils/geminiErrorHelpers';

// Load environment variables (override stale process values when .env is updated)
dotenv.config({ override: true });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// In-memory media store for rendered canvas marketing images (serves public URLs for Meta Graph API)
interface StoredMedia {
  id: string;
  buffer: Buffer;
  contentType: string;
  createdAt: number;
}
const mediaRegistry = new Map<string, StoredMedia>();

// Secure file-based or memory credential store for Social Accounts (tokens never exposed to frontend)
interface SecureSocialAccount {
  platform: 'facebook' | 'instagram' | 'telegram' | 'x' | 'whatsapp' | 'whatsapp_status' | 'tiktok';
  displayName: string;
  accountHandle?: string;
  isConnected: boolean;
  directPublishSupported: boolean;
  directPublishEnabled: boolean;
  // Facebook / Instagram credentials
  pageId?: string;
  pageName?: string;
  pageAccessToken?: string;
  instagramAccountId?: string;
  instagramUsername?: string;
  appId?: string;
  appSecret?: string;
  // Telegram credentials
  telegramBotToken?: string;
  telegramChannelId?: string;
  // X (Twitter) credentials
  twitterApiKey?: string;
  twitterApiSecret?: string;
  twitterAccessToken?: string;
  twitterAccessSecret?: string;
  lastSyncedAt?: string;
  lastVerifiedAt?: string;
  permissions?: string[];
}

const SECURE_STORE_FILE = path.resolve(__dirname, '.social_credentials.json');

function loadSecureAccounts(): Map<string, SecureSocialAccount> {
  const map = new Map<string, SecureSocialAccount>();
  try {
    if (fs.existsSync(SECURE_STORE_FILE)) {
      const raw = fs.readFileSync(SECURE_STORE_FILE, 'utf-8');
      const data = JSON.parse(raw);
      if (Array.isArray(data)) {
        for (const item of data) {
          map.set(item.platform, item);
        }
      }
    }
  } catch (err) {
    console.warn('Notice: initialized fresh social credentials store.');
  }

  // Fallback defaults from environment variables if present
  if (!map.has('facebook')) {
    map.set('facebook', {
      platform: 'facebook',
      displayName: 'Facebook Page & Marketplace',
      accountHandle: process.env.FACEBOOK_PAGE_NAME || 'ON AlAA STORE Lebanon',
      pageId: process.env.FACEBOOK_PAGE_ID || '',
      pageAccessToken: process.env.FACEBOOK_PAGE_ACCESS_TOKEN || '',
      isConnected: Boolean(process.env.FACEBOOK_PAGE_ACCESS_TOKEN),
      directPublishSupported: true,
      directPublishEnabled: true,
    });
  }

  const existingIg = map.get('instagram');
  if (!existingIg || !existingIg.accountHandle || existingIg.accountHandle === '@arnaoutstore' || existingIg.accountHandle === '@m.arnaoutcell') {
    map.set('instagram', {
      platform: 'instagram',
      displayName: 'Instagram Business – ON AlAA STORE',
      accountHandle: '@onalaastore.lb',
      instagramAccountId: existingIg?.instagramAccountId || process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID || '',
      pageAccessToken: existingIg?.pageAccessToken || process.env.INSTAGRAM_ACCESS_TOKEN || process.env.FACEBOOK_PAGE_ACCESS_TOKEN || '',
      isConnected: Boolean((existingIg?.instagramAccountId || process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID) && (existingIg?.pageAccessToken || process.env.INSTAGRAM_ACCESS_TOKEN || process.env.FACEBOOK_PAGE_ACCESS_TOKEN)),
      directPublishSupported: true,
      directPublishEnabled: true,
      pageName: 'ON AlAA STORE',
    });
  }

  if (!map.has('telegram')) {
    map.set('telegram', {
      platform: 'telegram',
      displayName: 'Telegram Channel Broadcast',
      accountHandle: process.env.TELEGRAM_CHANNEL_ID || '@onalaastore_lb',
      telegramBotToken: process.env.TELEGRAM_BOT_TOKEN || '',
      telegramChannelId: process.env.TELEGRAM_CHANNEL_ID || '',
      isConnected: Boolean(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHANNEL_ID),
      directPublishSupported: true,
      directPublishEnabled: true,
    });
  }

  return map;
}

function saveSecureAccounts(map: Map<string, SecureSocialAccount>) {
  try {
    const list = Array.from(map.values());
    fs.writeFileSync(SECURE_STORE_FILE, JSON.stringify(list, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to persist secure credentials:', err);
  }
}

const secureAccounts = loadSecureAccounts();

// Post History Logs
interface SocialPublishLog {
  id: string;
  postId: string;
  productId: string;
  productName: string;
  platforms: string[];
  results: Record<string, {
    success: boolean;
    message: string;
    postId?: string;
    postUrl?: string;
    timestamp: string;
    errorDetails?: string;
  }>;
  caption: string;
  imageUrl?: string;
  createdAt: string;
}

const PUBLISH_LOGS_FILE = path.resolve(__dirname, '.social_publish_logs.json');
function loadPublishLogs(): SocialPublishLog[] {
  try {
    if (fs.existsSync(PUBLISH_LOGS_FILE)) {
      return JSON.parse(fs.readFileSync(PUBLISH_LOGS_FILE, 'utf-8'));
    }
  } catch {}
  return [];
}

function savePublishLogs(logs: SocialPublishLog[]) {
  try {
    fs.writeFileSync(PUBLISH_LOGS_FILE, JSON.stringify(logs.slice(0, 100), null, 2), 'utf-8');
  } catch {}
}

let publishLogs: SocialPublishLog[] = loadPublishLogs();

const ADMIN_CREDENTIALS_FILE = path.resolve(__dirname, '.admin_credentials.json');
const ADMIN_ACTIVITY_LOGS_FILE = path.resolve(__dirname, '.admin_activity_logs.json');
const ADMIN_RESET_TOKENS_FILE = path.resolve(__dirname, '.admin_reset_tokens.json');
const ADMIN_EMAIL_OUTBOX_FILE = path.resolve(__dirname, '.admin_email_outbox.json');
const RESTOCK_STORE_FILE = path.resolve(__dirname, '.restock_notifications.json');
const MAX_SERVER_ACTIVITY_LOGS = 1000;

function loadAdminActivityLogs(): ActivityLogEntry[] {
  try {
    if (fs.existsSync(ADMIN_ACTIVITY_LOGS_FILE)) {
      const parsed = JSON.parse(fs.readFileSync(ADMIN_ACTIVITY_LOGS_FILE, 'utf-8'));
      if (Array.isArray(parsed)) {
        return mergeActivityLogs(
          parsed.map((item) => sanitizeActivityLogEntry(item)),
          [],
          MAX_SERVER_ACTIVITY_LOGS
        );
      }
    }
  } catch {
    // Fallback to clean seed inspection
  }

  // Initial seed: if .admin_credentials.json already holds a rotated user credential,
  // record its verified timestamp in the security audit trail on first boot.
  const seeded: ActivityLogEntry[] = [];
  try {
    if (fs.existsSync(ADMIN_CREDENTIALS_FILE)) {
      const credRaw = JSON.parse(fs.readFileSync(ADMIN_CREDENTIALS_FILE, 'utf-8')) as {
        source?: string;
        updatedAt?: string;
        algorithm?: string;
      };
      if (credRaw?.source === 'user' && credRaw?.updatedAt) {
        seeded.push(
          sanitizeActivityLogEntry({
            id: `audit-seed-pwd-${Date.parse(credRaw.updatedAt) || Date.now()}`,
            action: 'password_changed',
            titleEn: 'Administrator password updated',
            titleAr: 'تم تحديث كلمة مرور المدير',
            category: 'security',
            severity: 'critical',
            target: 'Administrator Account (admin)',
            details: `Credential rotated and salted with ${credRaw.algorithm || 'bcrypt'} (cost factor 12). Plaintext never stored.`,
            actor: {
              name: '3Laa Hassan',
              username: 'admin',
              role: 'super_admin',
              email: 'admin@arnaoutcell.com',
            },
            source: 'server',
            timestamp: credRaw.updatedAt,
          })
        );
      }
    }
  } catch {
    // Ignore seed lookup errors
  }

  return seeded;
}

function saveAdminActivityLogs(logs: ActivityLogEntry[]): void {
  try {
    fs.writeFileSync(
      ADMIN_ACTIVITY_LOGS_FILE,
      JSON.stringify(logs.slice(0, MAX_SERVER_ACTIVITY_LOGS), null, 2),
      'utf-8'
    );
  } catch (err) {
    console.warn('Notice: could not persist admin activity logs store:', err);
  }
}

let adminActivityLogs: ActivityLogEntry[] = loadAdminActivityLogs();
if (adminActivityLogs.length > 0 && !fs.existsSync(ADMIN_ACTIVITY_LOGS_FILE)) {
  saveAdminActivityLogs(adminActivityLogs);
}

function appendServerActivityLog(input: CreateActivityLogInput): ActivityLogEntry {
  const entry = sanitizeActivityLogEntry({
    ...input,
    source: input.source || 'server',
  });
  adminActivityLogs = mergeActivityLogs([entry], adminActivityLogs, MAX_SERVER_ACTIVITY_LOGS);
  saveAdminActivityLogs(adminActivityLogs);
  return entry;
}

interface ServerRestockDispatchLog {
  id: string;
  productId: string;
  productName: string;
  recipientCount: number;
  emails: string[];
  channel: 'resend' | 'webhook' | 'automated_queue';
  subjectSample?: string;
  dispatchedAt: string;
}

interface RestockStoreState {
  subscriptions: StockNotificationRecord[];
  logs: ServerRestockDispatchLog[];
}

function loadRestockStore(): RestockStoreState {
  try {
    if (fs.existsSync(RESTOCK_STORE_FILE)) {
      const parsed = JSON.parse(fs.readFileSync(RESTOCK_STORE_FILE, 'utf-8'));
      return {
        subscriptions: Array.isArray(parsed?.subscriptions) ? parsed.subscriptions : [],
        logs: Array.isArray(parsed?.logs) ? parsed.logs : [],
      };
    }
  } catch {
    // Fallback to clean state
  }
  return { subscriptions: [], logs: [] };
}

function saveRestockStore(state: RestockStoreState): void {
  try {
    fs.writeFileSync(
      RESTOCK_STORE_FILE,
      JSON.stringify(
        {
          subscriptions: state.subscriptions.slice(0, 1000),
          logs: state.logs.slice(0, 200),
        },
        null,
        2
      ),
      'utf-8'
    );
  } catch (err) {
    console.warn('Notice: could not persist restock notification store:', err);
  }
}

const restockStore = loadRestockStore();

async function startServer() {
  const app = express();
  app.set('trust proxy', 1);
  const PORT = parseInt(process.env.PORT || '3000', 10);
  const adminSessionSecret = resolveEphemeralOrEnvSecret(process.env.ADMIN_SESSION_SECRET);

  const resolveFirebaseProjectId = (): string => {
    const envProject = process.env.VITE_FIREBASE_PROJECT_ID?.trim();
    if (envProject) return envProject;
    try {
      const cfgRaw = fs.readFileSync(path.resolve(__dirname, 'firebase-applet-config.json'), 'utf8');
      const cfg = JSON.parse(cfgRaw) as { projectId?: string };
      if (typeof cfg?.projectId === 'string' && cfg.projectId.trim()) {
        return cfg.projectId.trim();
      }
    } catch {
      // Fallback to default project ID
    }
    return 'gen-lang-client-0031383285';
  };

  const resolveAdminSessionRole = (rawRole?: string): AdminSessionRole => {
    if (rawRole === 'super_admin' || rawRole === 'manager' || rawRole === 'editor') {
      return rawRole;
    }
    if (rawRole === 'order_manager' || rawRole === 'inventory_manager') {
      return 'manager';
    }
    if (rawRole === 'product_manager') {
      return 'editor';
    }
    return 'super_admin';
  };

  const isHttpsRequest = (req: Request): boolean => {
    const forwardedProto = req.get('x-forwarded-proto')?.split(',')[0]?.trim().toLowerCase();
    return Boolean(req.secure || req.protocol === 'https' || forwardedProto === 'https');
  };

  const setAdminSessionCookie = (req: Request, res: Response, token: string): void => {
    const isHttps = isHttpsRequest(req);
    const attrs = [
      `${ADMIN_SESSION_COOKIE_NAME}=${encodeURIComponent(token)}`,
      'Path=/',
      `Max-Age=${Math.floor(DEFAULT_SESSION_TTL_MS / 1000)}`,
      'HttpOnly',
    ];
    if (isHttps) {
      attrs.push('Secure', 'SameSite=None', 'Partitioned');
    } else {
      attrs.push('SameSite=Lax');
    }
    res.setHeader('Set-Cookie', attrs.join('; '));
  };

  const clearAdminSessionCookie = (req: Request, res: Response): void => {
    const isHttps = isHttpsRequest(req);
    const attrs = [
      `${ADMIN_SESSION_COOKIE_NAME}=`,
      'Path=/',
      'Max-Age=0',
      'HttpOnly',
    ];
    if (isHttps) {
      attrs.push('Secure', 'SameSite=None', 'Partitioned');
    } else {
      attrs.push('SameSite=Lax');
    }
    res.setHeader('Set-Cookie', attrs.join('; '));
  };

  const requireAdminAuth = (req: Request, res: Response, next: NextFunction): void => {
    const { token, source } = extractBearerOrCookieToken({
      authorization: typeof req.headers.authorization === 'string' ? req.headers.authorization : undefined,
      cookie: typeof req.headers.cookie === 'string' ? req.headers.cookie : undefined,
    });

    if (!token || !source) {
      res.status(401).json({ success: false, error: 'Administrator authentication required.' });
      return;
    }

    if (
      source === 'cookie' &&
      !['GET', 'HEAD', 'OPTIONS'].includes(req.method.toUpperCase()) &&
      !isSameOriginMutationRequest(req.headers)
    ) {
      res.status(403).json({ success: false, error: 'Cross-site mutation request rejected.' });
      return;
    }

    const payload = verifyAdminSessionToken(token, adminSessionSecret);
    if (!payload) {
      res.status(401).json({ success: false, error: 'Invalid or expired administrator session.' });
      return;
    }

    next();
  };

  // Hash ADMIN_PASSWORD from .env into bcrypt store on boot (never stores plaintext)
  await ensureAdminCredentialRecord({
    credentialsFilePath: ADMIN_CREDENTIALS_FILE,
    envAdminPassword: process.env.ADMIN_PASSWORD,
  });

  // Enable gzip/deflate compression for all API and static responses (> 1KB)
  app.use(compression({ level: 6, threshold: 1024 }));

  // Body parsers with large limit for canvas image uploads
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // =========================================================================
  // 0. ADMIN AUTHENTICATION ROUTES (bcrypt-hashed .env credentials)
  // =========================================================================
  app.get('/api/admin/auth/status', async (_req: Request, res: Response) => {
    try {
      const record = await ensureAdminCredentialRecord({
        credentialsFilePath: ADMIN_CREDENTIALS_FILE,
        envAdminPassword: process.env.ADMIN_PASSWORD,
      });
      res.json({
        initialized: Boolean(record),
        algorithm: 'bcrypt',
      });
    } catch {
      res.status(500).json({ initialized: false, algorithm: 'bcrypt' });
    }
  });

  app.post('/api/admin/auth/verify', async (req: Request, res: Response) => {
    try {
      const candidate = typeof req.body?.password === 'string' ? req.body.password : '';
      const requestedUsername =
        typeof req.body?.username === 'string' && req.body.username.trim()
          ? req.body.username.trim().toLowerCase()
          : 'admin';
      const requestedRole = typeof req.body?.role === 'string' ? req.body.role : 'super_admin';

      if (!candidate) {
        res.status(400).json({ valid: false, error: 'Password is required.' });
        return;
      }

      const valid = await verifyServerAdminLogin({
        candidate,
        credentialsFilePath: ADMIN_CREDENTIALS_FILE,
        envAdminPassword: process.env.ADMIN_PASSWORD,
      });

      if (valid) {
        appendServerActivityLog({
          action: 'auth_login_success',
          titleEn: 'Administrator signed in',
          titleAr: 'تم تسجيل دخول المدير بنجاح',
          category: 'security',
          severity: 'info',
          target: `Admin Portal (${requestedUsername})`,
          details: 'Verified bcrypt credential authentication succeeded.',
          actor: {
            name: requestedUsername === 'admin' ? '3Laa Hassan' : requestedUsername,
            username: requestedUsername,
            role: requestedRole as ActivityLogEntry['actor']['role'],
          },
          source: 'server',
        });

        const token = createAdminSessionToken(
          {
            email: `${requestedUsername}@onalaastore.com`,
            role: resolveAdminSessionRole(requestedRole),
            authType: 'password',
          },
          adminSessionSecret
        );
        setAdminSessionCookie(req, res, token);
        res.json({ valid: true, token });
        return;
      } else {
        appendServerActivityLog({
          action: 'auth_login_failed',
          titleEn: 'Failed administrator login attempt',
          titleAr: 'محاولة تسجيل دخول فاشلة للمدير',
          category: 'security',
          severity: 'warning',
          target: `Admin Portal (${requestedUsername})`,
          details: 'Invalid administrator password submitted during authentication check.',
          actor: {
            name: requestedUsername === 'admin' ? '3Laa Hassan' : requestedUsername,
            username: requestedUsername,
            role: requestedRole as ActivityLogEntry['actor']['role'],
          },
          source: 'server',
        });
      }

      res.json({ valid: false });
    } catch {
      res.status(500).json({ valid: false, error: 'Authentication verification failed.' });
    }
  });

  app.post('/api/admin/auth/firebase-session', async (req: Request, res: Response) => {
    try {
      const idToken = typeof req.body?.idToken === 'string' ? req.body.idToken.trim() : '';
      if (!idToken) {
        res.status(400).json({ success: false, error: 'Firebase ID token is required.' });
        return;
      }

      const projectId = resolveFirebaseProjectId();
      const claims = await verifyFirebaseAdminIdToken(idToken, projectId);
      if (!claims || claims.email?.toLowerCase() !== 'optimatech.lb@gmail.com') {
        res.status(403).json({ success: false, error: 'Unauthorized Firebase administrator account.' });
        return;
      }

      const token = createAdminSessionToken(
        {
          email: claims.email,
          role: 'super_admin',
          authType: 'firebase',
        },
        adminSessionSecret
      );
      setAdminSessionCookie(req, res, token);
      res.json({ success: true, token, email: claims.email, role: 'super_admin' });
    } catch {
      res.status(500).json({ success: false, error: 'Failed to verify Firebase admin session.' });
    }
  });

  app.post('/api/admin/auth/logout', (req: Request, res: Response) => {
    clearAdminSessionCookie(req, res);
    res.json({ success: true });
  });

  app.post('/api/admin/auth/change-password', requireAdminAuth, async (req: Request, res: Response) => {
    try {
      const currentPassword = typeof req.body?.currentPassword === 'string' ? req.body.currentPassword : '';
      const newPassword = typeof req.body?.newPassword === 'string' ? req.body.newPassword : '';
      const confirmPassword = typeof req.body?.confirmPassword === 'string' ? req.body.confirmPassword : '';
      const actorMeta = req.body?.actor as Partial<ActivityLogEntry['actor']> | undefined;

      const result = await rotateServerAdminPassword({
        currentPassword,
        newPassword,
        confirmPassword,
        credentialsFilePath: ADMIN_CREDENTIALS_FILE,
        envAdminPassword: process.env.ADMIN_PASSWORD,
      });

      if (result.success) {
        appendServerActivityLog({
          action: 'password_changed',
          titleEn: 'Administrator password updated',
          titleAr: 'تم تغيير كلمة مرور المدير',
          category: 'security',
          severity: 'critical',
          target: `Administrator Account (${actorMeta?.username || 'admin'})`,
          details: 'Administrator credential rotated via Settings → Security and re-hashed with bcrypt (12 rounds).',
          actor: {
            name: actorMeta?.name || '3Laa Hassan',
            username: actorMeta?.username || 'admin',
            role: actorMeta?.role || 'super_admin',
            ...(actorMeta?.email ? { email: actorMeta.email } : {}),
          },
          source: 'server',
        });

        const token = createAdminSessionToken(
          {
            email: actorMeta?.email || `${actorMeta?.username || 'admin'}@onalaastore.com`,
            role: resolveAdminSessionRole(actorMeta?.role),
            authType: 'password',
          },
          adminSessionSecret
        );
        setAdminSessionCookie(req, res, token);
        res.status(200).json({ ...result, token });
        return;
      } else {
        appendServerActivityLog({
          action: 'password_change_failed',
          titleEn: 'Failed password update attempt',
          titleAr: 'فشل محاولة تحديث كلمة مرور المدير',
          category: 'security',
          severity: 'warning',
          target: `Administrator Account (${actorMeta?.username || 'admin'})`,
          details: result.messageEn || 'Password update rejected by security validation.',
          actor: {
            name: actorMeta?.name || '3Laa Hassan',
            username: actorMeta?.username || 'admin',
            role: actorMeta?.role || 'super_admin',
            ...(actorMeta?.email ? { email: actorMeta.email } : {}),
          },
          source: 'server',
        });
      }

      res.status(400).json(result);
    } catch {
      res.status(500).json({
        success: false,
        messageEn: 'Failed to update administrator password.',
        messageAr: 'تعذر تحديث كلمة مرور المدير.',
      });
    }
  });

  app.post('/api/admin/auth/forgot-password', async (req: Request, res: Response) => {
    try {
      const email = normalizeRecoveryEmail(req.body?.email);
      const lang = req.body?.lang === 'ar' ? 'ar' : 'en';
      const appOrigin =
        typeof req.body?.appOrigin === 'string' && /^https?:\/\//i.test(req.body.appOrigin)
          ? req.body.appOrigin
          : undefined;

      if (!email || !isValidRecoveryEmailFormat(email)) {
        res.status(400).json({
          success: false,
          messageEn: 'Please enter a valid administrator email address.',
          messageAr: 'يرجى إدخال عنوان بريد إلكتروني صحيح للمدير.',
        });
        return;
      }

      if (!isAuthorizedRecoveryEmail(email, process.env.ADMIN_RECOVERY_EMAIL)) {
        appendServerActivityLog({
          action: 'password_reset_denied',
          titleEn: 'Password recovery denied for unrecognized email',
          titleAr: 'رفض طلب استعادة كلمة المرور لبريد غير مصرح',
          category: 'security',
          severity: 'warning',
          target: `Recovery Request (${email})`,
          details: 'Password reset requested for an email not matching configured administrator recovery addresses.',
          actor: {
            name: 'Unauthenticated Caller',
            username: email,
            role: 'system',
            email,
          },
          source: 'server',
        });

        res.json({
          success: true,
          deliveryChannel: 'none',
          expiresMinutes: RESET_TOKEN_TTL_MINUTES,
          messageEn:
            'If this email is registered as an administrator recovery address, a one-time reset link has been sent.',
          messageAr:
            'إذا كان هذا البريد مسجلاً كعنوان استعادة للمدير، فقد تم إرسال رابط استعادة صالح لمرة واحدة.',
        });
        return;
      }

      const nowMs = Date.now();
      const nowIso = new Date(nowMs).toISOString();
      const existingTokens = loadResetTokenStore(ADMIN_RESET_TOKENS_FILE).map((rec) =>
        !rec.usedAt && !rec.invalidatedAt ? { ...rec, invalidatedAt: nowIso } : rec
      );

      const { rawToken, record } = createResetTokenRecord({
        email,
        nowMs,
        ttlMinutes: RESET_TOKEN_TTL_MINUTES,
      });
      saveResetTokenStore(ADMIN_RESET_TOKENS_FILE, [record, ...existingTokens], nowMs);

      const baseUrl = process.env.APP_URL?.trim() || appOrigin || `http://localhost:${PORT}`;
      const resetUrl = buildAdminResetUrl(baseUrl, rawToken);
      const emailPayload = buildAdminPasswordResetEmail({
        recipientEmail: email,
        resetUrl,
        rawToken,
        expiresMinutes: RESET_TOKEN_TTL_MINUTES,
        lang,
        storeName: 'ON AlAA STORE',
      });

      const resendKey = process.env.RESEND_API_KEY?.trim();
      const fromEmail =
        process.env.RESEND_FROM_EMAIL?.trim() || 'ON AlAA STORE <alerts@onalaastore.com>';

      if (resendKey) {
        const sendResult = await sendResendPasswordResetEmail({
          apiKey: resendKey,
          from: fromEmail,
          to: email,
          subject: emailPayload.subject,
          html: emailPayload.html,
          text: emailPayload.text,
        });

        if (!sendResult.ok) {
          appendServerActivityLog({
            action: 'password_reset_failed',
            titleEn: 'Resend password recovery delivery failed',
            titleAr: 'فشل إرسال بريد استعادة كلمة المرور عبر Resend',
            category: 'security',
            severity: 'critical',
            target: `Administrator Account (${email})`,
            details: sendResult.error || 'Resend API rejected recovery email dispatch.',
            actor: {
              name: '3Laa Hassan',
              username: 'admin',
              role: 'super_admin',
              email,
            },
            source: 'server',
          });

          res.status(502).json({
            success: false,
            messageEn:
              sendResult.error ||
              'Failed to send password recovery email via Resend. Check RESEND_API_KEY and sender domain.',
            messageAr:
              'تعذر إرسال بريد استعادة كلمة المرور عبر خدمة Resend. يرجى التحقق من إعدادات الإرسال.',
          });
          return;
        }

        appendServerActivityLog({
          action: 'password_reset_requested',
          titleEn: 'Administrator password recovery email sent via Resend',
          titleAr: 'تم إرسال رابط استعادة كلمة مرور المدير عبر Resend',
          category: 'security',
          severity: 'warning',
          target: `Administrator Account (${email})`,
          details: `Single-use SHA-256 recovery token issued (${RESET_TOKEN_TTL_MINUTES}m TTL) and dispatched via Resend${sendResult.emailId ? ` (ID: ${sendResult.emailId})` : ''}.`,
          actor: {
            name: '3Laa Hassan',
            username: 'admin',
            role: 'super_admin',
            email,
          },
          source: 'server',
        });

        res.json({
          success: true,
          deliveryChannel: 'resend',
          expiresMinutes: RESET_TOKEN_TTL_MINUTES,
          messageEn:
            'A one-time password reset link has been sent to your administrator inbox via Resend. Check your email or enter the recovery token below.',
          messageAr:
            'تم إرسال رابط إعادة تعيين كلمة المرور الصالح لمرة واحدة إلى بريدك عبر Resend. تحقق من بريدك أو أدخل رمز الاستعادة أدناه.',
        });
        return;
      }

      // Local sandbox outbox staging when RESEND_API_KEY is not configured
      try {
        const existingOutbox = fs.existsSync(ADMIN_EMAIL_OUTBOX_FILE)
          ? (JSON.parse(fs.readFileSync(ADMIN_EMAIL_OUTBOX_FILE, 'utf-8')) as unknown[])
          : [];
        const nextOutbox = [
          {
            id: record.id,
            to: email,
            from: fromEmail,
            subject: emailPayload.subject,
            text: emailPayload.text,
            createdAt: nowIso,
            expiresAt: record.expiresAt,
            channel: 'local_outbox',
          },
          ...(Array.isArray(existingOutbox) ? existingOutbox : []),
        ].slice(0, 25);
        fs.writeFileSync(ADMIN_EMAIL_OUTBOX_FILE, JSON.stringify(nextOutbox, null, 2), 'utf-8');
      } catch {
        // Non-fatal outbox file error
      }

      appendServerActivityLog({
        action: 'password_reset_requested',
        titleEn: 'Administrator recovery token issued (Resend key unconfigured)',
        titleAr: 'تم إصدار رمز استعادة كلمة المرور (بانتظار تفعيل مفتاح Resend)',
        category: 'security',
        severity: 'warning',
        target: `Administrator Account (${email})`,
        details: `Single-use SHA-256 recovery token generated (${RESET_TOKEN_TTL_MINUTES}m TTL) and staged in local server outbox because RESEND_API_KEY is unset.`,
        actor: {
          name: '3Laa Hassan',
          username: 'admin',
          role: 'super_admin',
          email,
        },
        source: 'server',
      });

      res.json({
        success: true,
        deliveryChannel: 'local_outbox',
        expiresMinutes: RESET_TOKEN_TTL_MINUTES,
        messageEn:
          'One-time recovery token generated cleanly. Note: RESEND_API_KEY is not set in server environment secrets, so the email payload was staged in the server outbox log.',
        messageAr:
          'تم إنشاء رمز الاستعادة المؤقت بنجاح. ملاحظة: لم يتم ضبط مفتاح RESEND_API_KEY في متغيرات الخادم، لذا تم حفظ رسالة البريد في سجل الإرسال المحلي.',
      });
    } catch {
      res.status(500).json({
        success: false,
        messageEn: 'Failed to initiate administrator password recovery.',
        messageAr: 'تعذر بدء عملية استعادة كلمة مرور المدير.',
      });
    }
  });

  app.post('/api/admin/auth/reset-password/verify-token', (req: Request, res: Response) => {
    try {
      const token = typeof req.body?.token === 'string' ? req.body.token : '';
      const records = loadResetTokenStore(ADMIN_RESET_TOKENS_FILE);
      const validation = validateResetTokenRecord(records, token);
      res.json({
        valid: validation.valid,
        reason: validation.reason,
        expiresAt: validation.record?.expiresAt,
      });
    } catch {
      res.status(500).json({ valid: false, reason: 'server_error' });
    }
  });

  app.post('/api/admin/auth/reset-password', async (req: Request, res: Response) => {
    try {
      const token = typeof req.body?.token === 'string' ? req.body.token : '';
      const newPassword = typeof req.body?.newPassword === 'string' ? req.body.newPassword : '';
      const confirmPassword =
        typeof req.body?.confirmPassword === 'string' ? req.body.confirmPassword : '';

      const result = await consumeResetTokenAndRotatePassword({
        rawToken: token,
        newPassword,
        confirmPassword,
        tokenFilePath: ADMIN_RESET_TOKENS_FILE,
        credentialsFilePath: ADMIN_CREDENTIALS_FILE,
      });

      if (result.success) {
        appendServerActivityLog({
          action: 'password_reset_completed',
          titleEn: 'Administrator password reset completed via recovery token',
          titleAr: 'تمت إعادة تعيين كلمة مرور المدير باستخدام رمز الاستعادة',
          category: 'security',
          severity: 'critical',
          target: `Administrator Account (${result.email || 'admin'})`,
          details: 'One-time recovery token verified and consumed; administrator credential re-hashed with bcrypt (12 rounds).',
          actor: {
            name: '3Laa Hassan',
            username: 'admin',
            role: 'super_admin',
            email: result.email || 'optimatech.lb@gmail.com',
          },
          source: 'server',
        });
      } else {
        appendServerActivityLog({
          action: 'password_reset_failed',
          titleEn: 'Failed password reset token submission',
          titleAr: 'فشل محاولة إعادة تعيين كلمة المرور برمز الاستعادة',
          category: 'security',
          severity: 'warning',
          target: 'Administrator Recovery Token',
          details: result.messageEn,
          actor: {
            name: '3Laa Hassan',
            username: 'admin',
            role: 'super_admin',
          },
          source: 'server',
        });
      }

      res.status(result.success ? 200 : 400).json(result);
    } catch {
      res.status(500).json({
        success: false,
        messageEn: 'Failed to reset administrator password.',
        messageAr: 'تعذر إعادة تعيين كلمة مرور المدير.',
      });
    }
  });

  // =========================================================================
  // 0A. ADMIN SECURITY & SENSITIVE CHANGE ACTIVITY LOG ROUTES
  // =========================================================================
  app.get('/api/admin/activity-logs', requireAdminAuth, (req: Request, res: Response) => {
    try {
      const limitParam = Math.min(MAX_SERVER_ACTIVITY_LOGS, Math.max(1, parseInt(String(req.query?.limit || '500'), 10) || 500));
      const search = typeof req.query?.search === 'string' ? req.query.search : '';
      const category = typeof req.query?.category === 'string' ? (req.query.category as ActivityLogEntry['category'] | 'all') : 'all';
      const severity = typeof req.query?.severity === 'string' ? (req.query.severity as ActivityLogEntry['severity'] | 'all') : 'all';

      const filtered = filterActivityLogs(adminActivityLogs, { search, category, severity }).slice(0, limitParam);
      res.json({
        success: true,
        total: adminActivityLogs.length,
        logs: filtered,
      });
    } catch {
      res.status(500).json({ success: false, logs: [], error: 'Failed to load admin activity logs.' });
    }
  });

  app.post('/api/admin/activity-logs', requireAdminAuth, (req: Request, res: Response) => {
    try {
      const body = (req.body || {}) as Partial<CreateActivityLogInput>;
      if (!body.action && !body.titleEn) {
        res.status(400).json({ success: false, error: 'action or titleEn is required.' });
        return;
      }

      const saved = appendServerActivityLog({
        id: typeof body.id === 'string' ? body.id : undefined,
        action: String(body.action || 'admin_event'),
        titleEn: String(body.titleEn || body.action || 'Admin Event'),
        titleAr: typeof body.titleAr === 'string' ? body.titleAr : undefined,
        category: body.category || 'security',
        severity: body.severity || 'info',
        target: typeof body.target === 'string' ? body.target : undefined,
        details: typeof body.details === 'string' ? body.details : undefined,
        actor: body.actor,
        source: body.source || 'client',
        timestamp: typeof body.timestamp === 'string' ? body.timestamp : undefined,
      });

      res.status(201).json({ success: true, entry: saved });
    } catch {
      res.status(500).json({ success: false, error: 'Failed to record admin activity log.' });
    }
  });

  // =========================================================================
  // 0B. OUT-OF-STOCK RESTOCK NOTIFICATION ROUTES
  // =========================================================================
  app.post('/api/notifications/subscribe', (req: Request, res: Response) => {
    try {
      const body = req.body as Partial<StockNotificationRecord>;
      const productId = typeof body?.productId === 'string' ? body.productId.trim() : '';
      const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
      const productName = typeof body?.productName === 'string' ? body.productName.trim() : '';

      if (!productId || !email || !productName) {
        res.status(400).json({ success: false, error: 'productId, productName, and email are required.' });
        return;
      }

      const id =
        typeof body?.id === 'string' && body.id.trim()
          ? body.id.trim()
          : buildStockNotificationDocId(productId, email);

      const record: StockNotificationRecord = {
        id,
        productId,
        productName: productName.slice(0, 255),
        productNameAr: typeof body?.productNameAr === 'string' ? body.productNameAr.slice(0, 255) : undefined,
        productBrand: typeof body?.productBrand === 'string' ? body.productBrand.slice(0, 64) : undefined,
        productPrice: Number.isFinite(Number(body?.productPrice)) ? Number(body.productPrice) : 0,
        productImage: typeof body?.productImage === 'string' ? body.productImage.slice(0, 1024) : undefined,
        email: email.slice(0, 128),
        lang: body?.lang === 'ar' ? 'ar' : 'en',
        status: 'pending',
        createdAt: typeof body?.createdAt === 'string' ? body.createdAt : new Date().toISOString(),
      };

      const existingIdx = restockStore.subscriptions.findIndex((s) => s.id === record.id);
      if (existingIdx >= 0) {
        restockStore.subscriptions[existingIdx] = record;
      } else {
        restockStore.subscriptions.unshift(record);
      }
      saveRestockStore(restockStore);

      res.json({ success: true, subscription: record });
    } catch {
      res.status(500).json({ success: false, error: 'Failed to save stock notification request.' });
    }
  });

  app.get('/api/notifications/list', requireAdminAuth, (_req: Request, res: Response) => {
    res.json({
      success: true,
      subscriptions: restockStore.subscriptions,
      logs: restockStore.logs,
    });
  });

  app.post('/api/notifications/restock', requireAdminAuth, async (req: Request, res: Response) => {
    try {
      const { productId, productName, productNameAr, productPrice, storeUrl, extraSubscribers } = req.body || {};
      if (typeof productId !== 'string' || !productId.trim()) {
        res.status(400).json({ success: false, dispatchedCount: 0, emails: [], error: 'productId is required' });
        return;
      }

      // Merge any extra pending subscribers passed from Firestore client query
      if (Array.isArray(extraSubscribers)) {
        for (const candidate of extraSubscribers) {
          if (candidate?.id && candidate?.email && candidate?.productId === productId) {
            const exists = restockStore.subscriptions.some((s) => s.id === candidate.id);
            if (!exists) {
              restockStore.subscriptions.unshift({
                id: String(candidate.id),
                productId: String(candidate.productId),
                productName: String(candidate.productName || productName || 'Product'),
                productNameAr: candidate.productNameAr ? String(candidate.productNameAr) : undefined,
                productBrand: candidate.productBrand ? String(candidate.productBrand) : undefined,
                productPrice: Number(candidate.productPrice) || Number(productPrice) || 0,
                email: String(candidate.email).trim().toLowerCase(),
                lang: candidate.lang === 'ar' ? 'ar' : 'en',
                status: 'pending',
                createdAt: String(candidate.createdAt || new Date().toISOString()),
              });
            }
          }
        }
      }

      const pendingForProduct = restockStore.subscriptions.filter(
        (s) => s.productId === productId && s.status === 'pending'
      );

      if (pendingForProduct.length === 0) {
        res.json({ success: true, dispatchedCount: 0, emails: [] });
        return;
      }

      const notifiedAt = new Date().toISOString();
      const resendKey = process.env.RESEND_API_KEY?.trim();
      const webhookUrl = process.env.RESTOCK_WEBHOOK_URL?.trim();
      const fromEmail = process.env.RESEND_FROM_EMAIL?.trim() || 'ON AlAA STORE <alerts@onalaastore.com>';

      let channel: ServerRestockDispatchLog['channel'] = 'automated_queue';
      let subjectSample = '';

      const emailPayloads = pendingForProduct.map((sub) => {
        const rendered = buildRestockNotificationEmail({
          productName: String(productName || sub.productName),
          productNameAr: String(productNameAr || sub.productNameAr || ''),
          productPrice: Number(productPrice) || sub.productPrice || 0,
          lang: sub.lang,
          storeUrl: typeof storeUrl === 'string' ? storeUrl : process.env.APP_URL,
        });
        if (!subjectSample) subjectSample = rendered.subject;
        return { sub, rendered };
      });

      if (resendKey) {
        channel = 'resend';
        for (const item of emailPayloads) {
          try {
            await fetch('https://api.resend.com/emails', {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${resendKey}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                from: fromEmail,
                to: [item.sub.email],
                subject: item.rendered.subject,
                html: item.rendered.html,
                text: item.rendered.text,
              }),
            });
          } catch (err) {
            console.warn('Resend restock email attempt warning:', err);
          }
        }
      } else if (webhookUrl) {
        channel = 'webhook';
        try {
          await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              event: 'product_restocked',
              productId,
              productName: productName || pendingForProduct[0].productName,
              productPrice,
              recipients: emailPayloads.map((p) => ({
                email: p.sub.email,
                lang: p.sub.lang,
                subject: p.rendered.subject,
                text: p.rendered.text,
                html: p.rendered.html,
              })),
              dispatchedAt: notifiedAt,
            }),
          });
        } catch (err) {
          console.warn('Restock webhook dispatch warning:', err);
        }
      }

      const recipientEmails = pendingForProduct.map((s) => s.email);
      const pendingIds = new Set(pendingForProduct.map((s) => s.id));
      restockStore.subscriptions = restockStore.subscriptions.map((s) =>
        pendingIds.has(s.id) ? { ...s, status: 'notified', notifiedAt } : s
      );

      const logEntry: ServerRestockDispatchLog = {
        id: `restock-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        productId,
        productName: String(productName || pendingForProduct[0].productName),
        recipientCount: recipientEmails.length,
        emails: recipientEmails,
        channel,
        subjectSample,
        dispatchedAt: notifiedAt,
      };
      restockStore.logs.unshift(logEntry);
      saveRestockStore(restockStore);

      res.json({
        success: true,
        dispatchedCount: recipientEmails.length,
        emails: recipientEmails,
        channel,
        log: logEntry,
      });
    } catch {
      res.status(500).json({ success: false, dispatchedCount: 0, emails: [], error: 'Failed to dispatch restock alerts.' });
    }
  });

  // =========================================================================
  // 1. PUBLIC MEDIA SERVING ROUTE (For Meta Graph API Image Ingestion)
  // =========================================================================
  app.get('/api/social/media/:id', (req: Request, res: Response) => {
    const mediaId = req.params.id.replace(/\.[^/.]+$/, ''); // remove extension
    const media = mediaRegistry.get(mediaId);

    if (!media) {
      res.status(404).send('Image asset not found or expired.');
      return;
    }

    res.setHeader('Content-Type', media.contentType);
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.send(media.buffer);
  });

  // =========================================================================
  // 2. SOCIAL ACCOUNTS MANAGEMENT (Safe public representation, NO SECRETS EXPOSED)
  // =========================================================================
  app.get('/api/social/accounts', requireAdminAuth, (_req: Request, res: Response) => {
    const safeAccounts = Array.from(secureAccounts.values()).map((acc) => ({
      id: `acc-${acc.platform}`,
      platform: acc.platform,
      displayName: acc.displayName,
      accountHandle: acc.accountHandle,
      isConnected: acc.isConnected,
      directPublishSupported: acc.directPublishSupported,
      directPublishEnabled: acc.directPublishEnabled,
      hasToken: Boolean(acc.pageAccessToken || acc.telegramBotToken || acc.twitterAccessToken),
      pageId: acc.pageId,
      pageName: acc.pageName || acc.accountHandle,
      instagramAccountId: acc.instagramAccountId,
      telegramChannelId: acc.telegramChannelId,
      lastSyncedAt: acc.lastSyncedAt,
      lastVerifiedAt: acc.lastVerifiedAt,
      permissions: acc.permissions || [],
    }));

    res.json({ success: true, accounts: safeAccounts });
  });

  // Connect or update credentials securely
  app.post('/api/social/accounts/save', requireAdminAuth, (req: Request, res: Response) => {
    const {
      platform,
      displayName,
      accountHandle,
      pageId,
      pageName,
      pageAccessToken,
      instagramAccountId,
      telegramBotToken,
      telegramChannelId,
      twitterApiKey,
      twitterApiSecret,
      twitterAccessToken,
      twitterAccessSecret,
      directPublishEnabled,
    } = req.body;

    if (!platform) {
      res.status(400).json({ success: false, error: 'Platform is required' });
      return;
    }

    const existing: SecureSocialAccount = secureAccounts.get(platform) || {
      platform,
      displayName: displayName || platform,
      accountHandle: accountHandle || '',
      isConnected: false,
      directPublishSupported: true,
      directPublishEnabled: true,
    };

    const updated: SecureSocialAccount = {
      ...existing,
      displayName: displayName || existing.displayName,
      accountHandle: accountHandle !== undefined ? accountHandle : existing.accountHandle,
      directPublishEnabled: directPublishEnabled !== undefined ? directPublishEnabled : existing.directPublishEnabled,
      lastSyncedAt: new Date().toISOString(),
    };

    if (pageId !== undefined) updated.pageId = pageId;
    if (pageName !== undefined) updated.pageName = pageName;
    if (pageAccessToken && !pageAccessToken.includes('••••')) updated.pageAccessToken = pageAccessToken;
    if (instagramAccountId !== undefined) updated.instagramAccountId = instagramAccountId;
    if (telegramBotToken && !telegramBotToken.includes('••••')) updated.telegramBotToken = telegramBotToken;
    if (telegramChannelId !== undefined) updated.telegramChannelId = telegramChannelId;
    if (twitterApiKey && !twitterApiKey.includes('••••')) updated.twitterApiKey = twitterApiKey;
    if (twitterApiSecret && !twitterApiSecret.includes('••••')) updated.twitterApiSecret = twitterApiSecret;
    if (twitterAccessToken && !twitterAccessToken.includes('••••')) updated.twitterAccessToken = twitterAccessToken;
    if (twitterAccessSecret && !twitterAccessSecret.includes('••••')) updated.twitterAccessSecret = twitterAccessSecret;

    // Check connectivity flag
    if (platform === 'facebook') {
      updated.isConnected = Boolean(updated.pageAccessToken && updated.pageId);
    } else if (platform === 'instagram') {
      updated.isConnected = Boolean(updated.pageAccessToken && updated.instagramAccountId);
    } else if (platform === 'telegram') {
      updated.isConnected = Boolean(updated.telegramBotToken && updated.telegramChannelId);
    } else {
      updated.isConnected = true;
    }

    secureAccounts.set(platform, updated);
    saveSecureAccounts(secureAccounts);

    res.json({
      success: true,
      message: `Account settings for ${updated.displayName} saved securely.`,
    });
  });

  // Verify connection with live Meta Graph API or Telegram API ping
  app.post('/api/social/accounts/verify', requireAdminAuth, async (req: Request, res: Response) => {
    const { platform } = req.body;
    const account = secureAccounts.get(platform);

    if (!account) {
      res.status(404).json({ success: false, error: 'Account not found' });
      return;
    }

    try {
      if (platform === 'facebook') {
        const token = account.pageAccessToken;
        const pageId = account.pageId;

        if (!token) {
          res.json({
            success: false,
            error: 'No Page Access Token configured. Please paste a valid token from Meta Developer Portal.',
          });
          return;
        }

        // Call Meta Graph API to verify token and retrieve page info
        const targetUrl = pageId
          ? `https://graph.facebook.com/v21.0/${encodeURIComponent(pageId)}?fields=name,id,tasks,instagram_business_account&access_token=${encodeURIComponent(token)}`
          : `https://graph.facebook.com/v21.0/me?fields=name,id&access_token=${encodeURIComponent(token)}`;

        const fbRes = await fetch(targetUrl);
        const fbData = await fbRes.json();

        if (fbData.error) {
          res.json({
            success: false,
            error: `Meta Graph API Error (${fbData.error.code}): ${fbData.error.message}`,
            details: fbData.error,
          });
          return;
        }

        account.isConnected = true;
        account.pageName = fbData.name;
        account.pageId = fbData.id;
        account.lastVerifiedAt = new Date().toISOString();
        if (fbData.instagram_business_account?.id) {
          account.instagramAccountId = fbData.instagram_business_account.id;
          // Also link instagram account config
          const igAcc = secureAccounts.get('instagram');
          if (igAcc) {
            igAcc.instagramAccountId = fbData.instagram_business_account.id;
            igAcc.pageAccessToken = token;
            igAcc.isConnected = true;
            igAcc.lastVerifiedAt = new Date().toISOString();
          }
        }
        saveSecureAccounts(secureAccounts);

        res.json({
          success: true,
          message: `Connected to Facebook Page "${fbData.name}" (ID: ${fbData.id})`,
          data: fbData,
        });
        return;
      }

      if (platform === 'instagram') {
        const token = account.pageAccessToken || secureAccounts.get('facebook')?.pageAccessToken;
        const igId = account.instagramAccountId;

        if (!token || !igId) {
          res.json({
            success: false,
            error: 'Instagram requires both a Page Access Token and an Instagram Business Account ID.',
          });
          return;
        }

        const igUrl = `https://graph.facebook.com/v21.0/${encodeURIComponent(igId)}?fields=name,username,profile_picture_url&access_token=${encodeURIComponent(token)}`;
        const igRes = await fetch(igUrl);
        const igData = await igRes.json();

        if (igData.error) {
          res.json({
            success: false,
            error: `Instagram Graph API Error (${igData.error.code}): ${igData.error.message}`,
            details: igData.error,
          });
          return;
        }

        account.isConnected = true;
        account.accountHandle = `@${igData.username || igData.name}`;
        account.lastVerifiedAt = new Date().toISOString();
        saveSecureAccounts(secureAccounts);

        res.json({
          success: true,
          message: `Connected to Instagram Professional Account @${igData.username || igData.name}`,
          data: igData,
        });
        return;
      }

      if (platform === 'telegram') {
        const botToken = account.telegramBotToken;
        if (!botToken) {
          res.json({ success: false, error: 'Telegram Bot Token not configured' });
          return;
        }

        const tgRes = await fetch(`https://api.telegram.org/bot${botToken}/getMe`);
        const tgData = await tgRes.json();

        if (!tgData.ok) {
          res.json({ success: false, error: tgData.description || 'Invalid Telegram Bot Token' });
          return;
        }

        account.isConnected = true;
        account.lastVerifiedAt = new Date().toISOString();
        saveSecureAccounts(secureAccounts);

        res.json({
          success: true,
          message: `Connected to Telegram Bot @${tgData.result.username}`,
          data: tgData.result,
        });
        return;
      }

      res.json({ success: true, message: `Platform ${platform} verified.` });
    } catch (err) {
      res.status(500).json({
        success: false,
        error: err instanceof Error ? err.message : 'Verification failed',
      });
    }
  });

  // Disconnect account
  app.post('/api/social/accounts/disconnect', requireAdminAuth, (req: Request, res: Response) => {
    const { platform } = req.body;
    const account = secureAccounts.get(platform);
    if (account) {
      account.isConnected = false;
      account.pageAccessToken = '';
      account.telegramBotToken = '';
      account.twitterAccessToken = '';
      saveSecureAccounts(secureAccounts);
    }
    res.json({ success: true, message: `Disconnected ${platform}.` });
  });

  // Dedicated Instagram Status Endpoint for ON AlAA STORE
  app.get('/api/social/instagram-status', requireAdminAuth, (_req: Request, res: Response) => {
    const igAcc = secureAccounts.get('instagram');
    const fbAcc = secureAccounts.get('facebook');
    const token = igAcc?.pageAccessToken || fbAcc?.pageAccessToken;
    const igUserId = igAcc?.instagramAccountId;

    res.json({
      success: true,
      account: igAcc?.accountHandle || '@onalaastore.lb',
      targetUrl: 'https://www.instagram.com/onalaastore.lb/',
      displayName: igAcc?.displayName || 'Instagram Business – ON AlAA STORE',
      isConnected: Boolean(igAcc?.isConnected && token && igUserId),
      hasToken: Boolean(token),
      hasAccountId: Boolean(igUserId),
      instagramAccountId: igUserId ? `${igUserId.substring(0, 4)}...${igUserId.slice(-4)}` : '',
      lastVerifiedAt: igAcc?.lastVerifiedAt || null,
      directPublishSupported: true,
    });
  });

  // Dedicated Instagram Direct Publishing for ON AlAA STORE
  app.post('/api/social/publish-instagram', requireAdminAuth, async (req: Request, res: Response) => {
    const {
      productId,
      productName,
      caption,
      imageBase64,
      fallbackImageUrl,
    } = req.body;

    const igAcc = secureAccounts.get('instagram');
    const fbAcc = secureAccounts.get('facebook');
    const token = igAcc?.pageAccessToken || fbAcc?.pageAccessToken;
    const igUserId = igAcc?.instagramAccountId;

    if (!token || !igUserId) {
      res.status(400).json({
        success: false,
        needsSetup: true,
        account: '@onalaastore.lb',
        instagramUrl: 'https://www.instagram.com/onalaastore.lb/',
        message: 'Instagram Business credentials for @onalaastore.lb are not configured.',
        errorDetails: 'Requires Meta Page Access Token with instagram_content_publish permission and Instagram Business Account ID. Configure in Social Media Manager > Accounts & API.',
      });
      return;
    }

    // Process image into public media registry
    let publicImageUrl = fallbackImageUrl || '';
    if (imageBase64 && imageBase64.startsWith('data:image/')) {
      try {
        const matches = imageBase64.match(/^data:([A-Za-z-+/]+);base64,(.+)$/);
        if (matches) {
          const contentType = matches[1];
          const imageBuffer = Buffer.from(matches[2], 'base64');
          const mediaId = `ig-post-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
          mediaRegistry.set(mediaId, {
            id: mediaId,
            buffer: imageBuffer,
            contentType,
            createdAt: Date.now(),
          });
          const host = process.env.APP_URL || `${req.protocol}://${req.get('host')}`;
          publicImageUrl = `${host}/api/social/media/${mediaId}.png`;
        }
      } catch (err) {
        console.warn('Could not parse image for Instagram:', err);
      }
    }

    if (!publicImageUrl) {
      res.status(400).json({
        success: false,
        message: 'Instagram Graph API requires a valid image for media container creation.',
        errorDetails: 'Please provide or render a product promotional graphic before publishing.',
      });
      return;
    }

    const safeCaption = typeof caption === 'string' ? caption : '';

    try {
      // Step 1: Create Media Container POST /{ig-user-id}/media
      const containerRes = await fetch(`https://graph.facebook.com/v21.0/${igUserId}/media`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image_url: publicImageUrl,
          caption: safeCaption,
          access_token: token,
        }),
      });
      const containerData = await containerRes.json();

      if (containerData.error || !containerData.id) {
        res.status(400).json({
          success: false,
          message: `Meta Instagram API Error: ${containerData.error?.message || 'Failed to create media container'}`,
          errorDetails: containerData.error?.error_user_msg || containerData.error?.message || 'Check token permissions and aspect ratio.',
          metaCode: containerData.error?.code,
          metaSubcode: containerData.error?.error_subcode,
        });
        return;
      }

      const creationId = containerData.id;

      // Poll container status briefly if needed
      let statusCode = 'IN_PROGRESS';
      let attempts = 0;
      while (statusCode === 'IN_PROGRESS' && attempts < 4) {
        await new Promise((resolve) => setTimeout(resolve, 1200));
        try {
          const statusRes = await fetch(`https://graph.facebook.com/v21.0/${creationId}?fields=status_code&access_token=${token}`);
          const statusJson = await statusRes.json();
          statusCode = statusJson.status_code || 'FINISHED';
          if (statusCode === 'ERROR') {
            throw new Error(statusJson.status || 'Instagram media container processing failed');
          }
        } catch {
          statusCode = 'FINISHED';
        }
        attempts++;
      }

      // Step 2: Publish Container POST /{ig-user-id}/media_publish
      const publishRes = await fetch(`https://graph.facebook.com/v21.0/${igUserId}/media_publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          creation_id: creationId,
          access_token: token,
        }),
      });
      const publishData = await publishRes.json();

      if (publishData.error) {
        res.status(400).json({
          success: false,
          message: `Meta Publish Error: ${publishData.error.message}`,
          errorDetails: publishData.error.error_user_msg || publishData.error.message,
          metaCode: publishData.error.code,
        });
        return;
      }

      // Record to logs
      const logEntry: SocialPublishLog = {
        id: `log-${Date.now()}`,
        postId: publishData.id,
        productId: productId || 'item',
        productName: productName || 'Product',
        platforms: ['instagram'],
        results: {
          instagram: {
            success: true,
            message: 'Published directly to Instagram Business account (@onalaastore.lb)!',
            postId: publishData.id,
            postUrl: 'https://www.instagram.com/onalaastore.lb/',
            timestamp: new Date().toISOString(),
          },
        },
        caption: safeCaption,
        imageUrl: publicImageUrl,
        createdAt: new Date().toISOString(),
      };
      publishLogs.unshift(logEntry);
      savePublishLogs(publishLogs);

      res.json({
        success: true,
        message: 'Successfully published directly to Instagram (@onalaastore.lb)!',
        postId: publishData.id,
        creationId,
        postUrl: 'https://www.instagram.com/onalaastore.lb/',
        account: '@onalaastore.lb',
        publicImageUrl,
      });
    } catch (err) {
      res.status(500).json({
        success: false,
        message: 'Unexpected error during Instagram publication',
        errorDetails: err instanceof Error ? err.message : 'Unknown server error',
      });
    }
  });

  // =========================================================================
  // 3. DIRECT PUBLISHING API VIA OFFICIAL META GRAPH API & TELEGRAM API
  // =========================================================================
  app.post('/api/social/publish-direct', requireAdminAuth, async (req: Request, res: Response) => {
    const {
      postId,
      productId,
      productName,
      platforms,
      caption,
      imageBase64,
      productUrl,
      fallbackImageUrl,
    } = req.body;

    const safeCaption = typeof caption === 'string' ? caption : '';
    const safeProductUrl =
      typeof productUrl === 'string' && productUrl.trim() ? productUrl.trim() : 'https://onalaastore.com';

    if (!Array.isArray(platforms) || platforms.length === 0) {
      res.status(400).json({ success: false, error: 'At least one platform must be selected' });
      return;
    }

    // Register image in public media registry if Base64 provided
    let publicImageUrl = fallbackImageUrl || '';
    let imageBuffer: Buffer | null = null;

    if (imageBase64 && imageBase64.startsWith('data:image/')) {
      try {
        const matches = imageBase64.match(/^data:([A-Za-z-+/]+);base64,(.+)$/);
        if (matches) {
          const contentType = matches[1];
          imageBuffer = Buffer.from(matches[2], 'base64');
          const mediaId = `post-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
          mediaRegistry.set(mediaId, {
            id: mediaId,
            buffer: imageBuffer,
            contentType,
            createdAt: Date.now(),
          });

          // Build public URL (uses APP_URL if in production, or relative/host)
          const host = process.env.APP_URL || `${req.protocol}://${req.get('host')}`;
          publicImageUrl = `${host}/api/social/media/${mediaId}.png`;
        }
      } catch (err) {
        console.warn('Could not parse imageBase64 for public URL:', err);
      }
    }

    const results: Record<string, SocialPublishLog['results'][string]> = {};

    for (const platform of platforms) {
      try {
        // -------------------------------------------------------------------
        // FACEBOOK PAGE DIRECT PUBLISHING (Meta Graph API)
        // -------------------------------------------------------------------
        if (platform === 'facebook') {
          const fbAcc = secureAccounts.get('facebook');
          const token = fbAcc?.pageAccessToken;
          const pageId = fbAcc?.pageId;

          if (!token || !pageId) {
            results.facebook = {
              success: false,
              message: 'Facebook Page credentials not configured. Please connect your Facebook Page in Settings.',
              errorDetails: 'Missing pageId or pageAccessToken. Go to Social Media Manager > Accounts to connect.',
              timestamp: new Date().toISOString(),
            };
            continue;
          }

          // Case 1: Post with Photo via Graph API /{page-id}/photos
          if (imageBuffer) {
            const formData = new FormData();
            formData.append('access_token', token);
            formData.append('caption', safeCaption);
            const blob = new Blob([new Uint8Array(imageBuffer)], { type: 'image/png' });
            formData.append('source', blob, 'product-post.png');

            const fbPhotoRes = await fetch(`https://graph.facebook.com/v21.0/${pageId}/photos`, {
              method: 'POST',
              body: formData,
            });
            const fbPhotoData = await fbPhotoRes.json();

            if (fbPhotoData.error) {
              results.facebook = {
                success: false,
                message: `Meta API Error: ${fbPhotoData.error.message}`,
                errorDetails: `Code ${fbPhotoData.error.code} (${fbPhotoData.error.type}): ${fbPhotoData.error.message}`,
                timestamp: new Date().toISOString(),
              };
            } else {
              results.facebook = {
                success: true,
                message: 'Published directly to Facebook Page!',
                postId: fbPhotoData.id || fbPhotoData.post_id,
                postUrl: `https://facebook.com/${fbPhotoData.post_id || fbPhotoData.id}`,
                timestamp: new Date().toISOString(),
              };
            }
          } else {
            // Case 2: Post to Feed via Graph API /{page-id}/feed
            const fbFeedRes = await fetch(`https://graph.facebook.com/v21.0/${pageId}/feed`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                message: safeCaption,
                link: safeProductUrl,
                access_token: token,
              }),
            });
            const fbFeedData = await fbFeedRes.json();

            if (fbFeedData.error) {
              results.facebook = {
                success: false,
                message: `Meta API Error: ${fbFeedData.error.message}`,
                errorDetails: fbFeedData.error.message,
                timestamp: new Date().toISOString(),
              };
            } else {
              results.facebook = {
                success: true,
                message: 'Published to Facebook Page Feed!',
                postId: fbFeedData.id,
                postUrl: `https://facebook.com/${fbFeedData.id}`,
                timestamp: new Date().toISOString(),
              };
            }
          }
        }

        // -------------------------------------------------------------------
        // INSTAGRAM BUSINESS DIRECT PUBLISHING (Official Graph API Container Flow)
        // -------------------------------------------------------------------
        else if (platform === 'instagram') {
          const igAcc = secureAccounts.get('instagram');
          const fbAcc = secureAccounts.get('facebook');
          const token = igAcc?.pageAccessToken || fbAcc?.pageAccessToken;
          const igUserId = igAcc?.instagramAccountId;

          if (!token || !igUserId) {
            results.instagram = {
              success: false,
              message: 'Instagram Professional account not connected or missing permissions.',
              errorDetails: 'Requires instagram_content_publish permission and connected Instagram Business Account ID.',
              timestamp: new Date().toISOString(),
            };
            continue;
          }

          if (!publicImageUrl) {
            results.instagram = {
              success: false,
              message: 'Instagram Graph API requires a valid image URL for media container creation.',
              timestamp: new Date().toISOString(),
            };
            continue;
          }

          // Step 1: Create Media Container POST /{ig-user-id}/media
          const containerRes = await fetch(`https://graph.facebook.com/v21.0/${igUserId}/media`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              image_url: publicImageUrl,
              caption: safeCaption,
              access_token: token,
            }),
          });
          const containerData = await containerRes.json();

          if (containerData.error || !containerData.id) {
            results.instagram = {
              success: false,
              message: `Instagram Container Error: ${containerData.error?.message || 'Failed to create container'}`,
              errorDetails: containerData.error?.message || 'Check image aspect ratio and token permissions.',
              timestamp: new Date().toISOString(),
            };
            continue;
          }

          const creationId = containerData.id;

          // Step 2: Publish Media Container POST /{ig-user-id}/media_publish
          const publishRes = await fetch(`https://graph.facebook.com/v21.0/${igUserId}/media_publish`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              creation_id: creationId,
              access_token: token,
            }),
          });
          const publishData = await publishRes.json();

          if (publishData.error) {
            results.instagram = {
              success: false,
              message: `Instagram Publish Error: ${publishData.error.message}`,
              errorDetails: publishData.error.message,
              timestamp: new Date().toISOString(),
            };
          } else {
            results.instagram = {
              success: true,
              message: 'Published directly to Instagram Business account (@onalaastore.lb)!',
              postId: publishData.id,
              postUrl: 'https://www.instagram.com/onalaastore.lb/',
              timestamp: new Date().toISOString(),
            };
          }
        }

        // -------------------------------------------------------------------
        // TELEGRAM CHANNEL DIRECT BROADCAST (Telegram Bot API)
        // -------------------------------------------------------------------
        else if (platform === 'telegram') {
          const tgAcc = secureAccounts.get('telegram');
          const botToken = tgAcc?.telegramBotToken;
          const chatId = tgAcc?.telegramChannelId;

          if (!botToken || !chatId) {
            results.telegram = {
              success: false,
              message: 'Telegram Bot credentials not configured.',
              errorDetails: 'Missing bot token or channel ID. Configure in Settings.',
              timestamp: new Date().toISOString(),
            };
            continue;
          }

          if (imageBuffer) {
            const formData = new FormData();
            formData.append('chat_id', chatId);
            formData.append('caption', safeCaption.slice(0, 1024)); // Telegram caption limit 1024 chars
            const blob = new Blob([new Uint8Array(imageBuffer)], { type: 'image/png' });
            formData.append('photo', blob, 'post.png');

            // Add interactive inline buttons
            formData.append('reply_markup', JSON.stringify({
              inline_keyboard: [
                [
                  { text: '💬 Order via WhatsApp (70773067)', url: 'https://wa.me/96170773067' },
                  { text: '🌐 View on Store', url: safeProductUrl }
                ]
              ]
            }));

            const tgRes = await fetch(`https://api.telegram.org/bot${botToken}/sendPhoto`, {
              method: 'POST',
              body: formData,
            });
            const tgData = await tgRes.json();

            if (!tgData.ok) {
              results.telegram = {
                success: false,
                message: `Telegram Error: ${tgData.description}`,
                errorDetails: tgData.description,
                timestamp: new Date().toISOString(),
              };
            } else {
              const cleanChannel = chatId.replace('@', '');
              results.telegram = {
                success: true,
                message: `Broadcasted to Telegram channel ${chatId}!`,
                postId: String(tgData.result.message_id),
                postUrl: `https://t.me/${cleanChannel}/${tgData.result.message_id}`,
                timestamp: new Date().toISOString(),
              };
            }
          } else {
            const tgText = [safeCaption, safeProductUrl ? `🔗 ${safeProductUrl}` : '']
              .filter(Boolean)
              .join('\n\n')
              .slice(0, 4096);
            const tgRes = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                chat_id: chatId,
                text: tgText,
              }),
            });
            const tgData = await tgRes.json();

            if (!tgData.ok) {
              results.telegram = {
                success: false,
                message: `Telegram Error: ${tgData.description}`,
                timestamp: new Date().toISOString(),
              };
            } else {
              results.telegram = {
                success: true,
                message: `Sent to Telegram channel!`,
                postId: String(tgData.result.message_id),
                timestamp: new Date().toISOString(),
              };
            }
          }
        }

        // -------------------------------------------------------------------
        // OTHER PLATFORMS (WhatsApp, WhatsApp Status, X, TikTok)
        // -------------------------------------------------------------------
        else {
          results[platform] = {
            success: true,
            message: `Ready for 1-click sharing via official ${platform} protocol.`,
            timestamp: new Date().toISOString(),
          };
        }
      } catch (platformErr) {
        results[platform] = {
          success: false,
          message: platformErr instanceof Error ? platformErr.message : 'Publish execution error',
          timestamp: new Date().toISOString(),
        };
      }
    }

    // Save publish log
    const logEntry: SocialPublishLog = {
      id: `log-${Date.now()}`,
      postId: postId || `post-${Date.now()}`,
      productId: productId || 'unknown',
      productName: productName || 'Product',
      platforms,
      results,
      caption: safeCaption,
      imageUrl: publicImageUrl,
      createdAt: new Date().toISOString(),
    };

    publishLogs.unshift(logEntry);
    savePublishLogs(publishLogs);

    res.json({
      success: true,
      results,
      logId: logEntry.id,
      publicImageUrl,
    });
  });

  // Get publishing history and logs
  app.get('/api/social/logs', requireAdminAuth, (_req: Request, res: Response) => {
    res.json({ success: true, logs: publishLogs });
  });

  // Developer & Meta API Setup Guide endpoint
  app.get('/api/social/setup-docs', requireAdminAuth, (_req: Request, res: Response) => {
    res.json({
      success: true,
      metaApiVersion: 'v21.0',
      requiredPermissions: [
        { permission: 'pages_show_list', purpose: 'List authorized Facebook Pages' },
        { permission: 'pages_read_engagement', purpose: 'Read Page status and performance' },
        { permission: 'pages_manage_posts', purpose: 'Directly publish photos and feed updates to Page' },
        { permission: 'instagram_basic', purpose: 'Access linked Instagram Professional Account ID' },
        { permission: 'instagram_content_publish', purpose: 'Create and publish Instagram Media Containers directly' },
      ],
      steps: [
        '1. Go to developers.facebook.com and create a Business App.',
        '2. Add "Facebook Login for Business" and "Instagram Graph API" products.',
        '3. In Graph API Explorer, select your App and request the required permissions.',
        '4. Generate a Never-Expiring Page Access Token.',
        '5. Connect your Instagram Professional account to your Facebook Page.',
        '6. Paste your Page ID and Page Access Token into Social Media Manager > Accounts in Admin.',
      ],
    });
  });

  // Product Sidekick Assistant endpoint (server-side Gemini API)
  app.post('/api/sidekick/ask', async (req: Request, res: Response) => {
    const apiKey = process.env.GEMINI_API_KEY?.trim();
    if (!apiKey) {
      return res.status(503).json({
        success: false,
        error:
          'Sidekick AI is currently unavailable because GEMINI_API_KEY is not configured in server environment settings.',
      });
    }

    const {
      productName = '',
      brand = '',
      category = '',
      price = 0,
      selectedColor = '',
      selectedCapacity = '',
      warrantyMonths = 12,
      description = '',
      specifications = [],
      question = '',
      lang = 'en',
    } = req.body || {};

    const cleanQuestion = typeof question === 'string' ? question.trim() : '';
    if (!cleanQuestion) {
      return res.status(400).json({
        success: false,
        error: 'Please enter a question about this product.',
      });
    }

    try {
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });

      const specLines = Array.isArray(specifications)
        ? specifications
            .slice(0, 14)
            .map((s: { label?: string; value?: string }) => `- ${s.label || 'Spec'}: ${s.value || ''}`)
            .join('\n')
        : '';

      const productContext = [
        `Product: ${productName}`,
        `Brand: ${brand}`,
        `Category: ${category}`,
        `Unit Price: $${Number(price) || 0} USD`,
        selectedColor ? `Selected Color: ${selectedColor}` : '',
        selectedCapacity ? `Selected Capacity/Edition: ${selectedCapacity}` : '',
        `Official Warranty: ${Number(warrantyMonths) || 12} months`,
        description ? `Overview: ${description}` : '',
        specLines ? `Specifications:\n${specLines}` : '',
      ]
        .filter(Boolean)
        .join('\n');

      const { result: response, modelUsed } = await executeWithGeminiRetryAndFallback({
        primaryModel: 'gemini-4-hydrogen',
        fallbackModel: 'gemini-3.1-flash-lite',
        maxPrimaryAttempts: 2,
        maxFallbackAttempts: 2,
        baseDelayMs: 450,
        invoke: (model) =>
          ai.models.generateContent({
            model,
            contents: `Product Context:\n${productContext}\n\nShopper Question: ${cleanQuestion}`,
            config: {
              systemInstruction:
                lang === 'ar'
                  ? 'أنت مساعد ON AlAA Sidekick المختص بالمنتجات التقنية في لبنان. أجب باختصار ودقة عالية (2-4 جمل أو نقاط موجزة) اعتماداً على مواصفات المنتج المقدمة فقط، وباللغة العربية الواضحة.'
                  : 'You are ON AlAA Sidekick, a concise luxury tech shopping advisor in Lebanon (based in Chouf, all-Lebanon delivery, WhatsApp 70773067). Answer in 2-4 crisp, helpful sentences based strictly on the provided product facts.',
            },
          }),
      });

      const answer = (response.text || '').trim();
      if (!answer) {
        return res.status(502).json({
          success: false,
          error: 'Sidekick received an empty response from the model. Please try again.',
        });
      }

      return res.json({ success: true, answer, model: modelUsed });
    } catch (error: unknown) {
      const parsed = parseGeminiSdkError(error);
      return res.status(parsed.httpStatus).json({
        success: false,
        error: parsed.userMessage,
      });
    }
  });

  // Health and System Status Endpoint
  app.get('/api/health', (_req: Request, res: Response) => {
    let activeDbId = 'ai-studio-marnaoutcellprem-6629f884-c968-499b-93cd-3c6b634467cb';
    try {
      const cfgRaw = fs.readFileSync(path.resolve(__dirname, 'firebase-applet-config.json'), 'utf8');
      const cfg = JSON.parse(cfgRaw);
      if (typeof cfg?.firestoreDatabaseId === 'string' && cfg.firestoreDatabaseId.trim()) {
        activeDbId = cfg.firestoreDatabaseId.trim();
      }
    } catch {
      // Fallback to default database id
    }
    res.json({
      status: 'healthy',
      store: 'ON AlAA STORE',
      version: '2027.1.0',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      database: activeDbId,
      instagramHandle: '@onalaastore.lb',
    });
  });

  // Unmatched /api/* routes always return JSON 404 rather than HTML SPA fallback
  app.all('/api/*', (_req: Request, res: Response) => {
    res.status(404).json({ success: false, error: 'API route not found' });
  });

  const httpServer = http.createServer(app);

  // =========================================================================
  // 4. VITE DEV MIDDLEWARES OR PRODUCTION STATIC SERVING
  // =========================================================================
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const isHmrDisabled = process.env.DISABLE_HMR === 'true';
    const isCloudRun = Boolean(process.env.K_SERVICE);
    const enableHmr = !isHmrDisabled && (!isCloudRun || process.env.ENABLE_HMR === 'true');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: enableHmr
          ? {
              server: httpServer,
              protocol: (process.env.HMR_PROTOCOL as 'wss' | 'ws') || (isCloudRun ? 'wss' : undefined),
              clientPort: process.env.HMR_CLIENT_PORT
                ? Number(process.env.HMR_CLIENT_PORT)
                : isCloudRun
                ? 443
                : undefined,
            }
          : false,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    const distIndexPath = path.resolve(distDir, 'index.html');

    // Serve hashed assets with aggressive 1-year immutable caching
    app.use(
      '/assets',
      express.static(path.resolve(distDir, 'assets'), {
        maxAge: '1y',
        immutable: true,
      })
    );

    // Serve public static files (logo, favicon, images) with 1-day cache
    app.use(
      express.static(distDir, {
        maxAge: '1d',
        setHeaders: (res, filePath) => {
          if (filePath.endsWith('index.html')) {
            res.setHeader('Cache-Control', 'no-cache');
          }
        },
      })
    );

    app.get('*', (_req: Request, res: Response) => {
      if (!fs.existsSync(distIndexPath)) {
        res.status(503).send('Production build unavailable. Please run npm run build.');
        return;
      }
      res.setHeader('Cache-Control', 'no-cache');
      res.sendFile(distIndexPath);
    });
  }

  // Final Express error middleware returning JSON for /api/* routes
  app.use((err: unknown, req: Request, res: Response, _next: NextFunction) => {
    console.error('Unhandled server error:', err);
    if (res.headersSent) {
      return;
    }
    const status =
      typeof (err as { status?: unknown })?.status === 'number'
        ? Number((err as { status?: number }).status)
        : 500;
    if (req.path.startsWith('/api/')) {
      res.status(status).json({
        success: false,
        error: err instanceof Error ? err.message : 'Internal server error.',
      });
      return;
    }
    res.status(status).send('Internal server error.');
  });

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 ON AlAA STORE Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Fatal server startup error:', err);
  process.exit(1);
});
