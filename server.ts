import express, { Request, Response } from 'express';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import fs from 'fs';
import compression from 'compression';
import {
  ensureAdminCredentialRecord,
  verifyServerAdminLogin,
  rotateServerAdminPassword,
} from './src/utils/adminAuthServerHelpers';
import {
  buildRestockNotificationEmail,
  buildStockNotificationDocId,
  StockNotificationRecord,
} from './src/utils/stockNotificationHelpers';

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
const RESTOCK_STORE_FILE = path.resolve(__dirname, '.restock_notifications.json');

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
  const PORT = parseInt(process.env.PORT || '3000', 10);

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
      if (!candidate) {
        res.status(400).json({ valid: false, error: 'Password is required.' });
        return;
      }

      const valid = await verifyServerAdminLogin({
        candidate,
        credentialsFilePath: ADMIN_CREDENTIALS_FILE,
        envAdminPassword: process.env.ADMIN_PASSWORD,
      });

      res.json({ valid });
    } catch {
      res.status(500).json({ valid: false, error: 'Authentication verification failed.' });
    }
  });

  app.post('/api/admin/auth/change-password', async (req: Request, res: Response) => {
    try {
      const currentPassword = typeof req.body?.currentPassword === 'string' ? req.body.currentPassword : '';
      const newPassword = typeof req.body?.newPassword === 'string' ? req.body.newPassword : '';
      const confirmPassword = typeof req.body?.confirmPassword === 'string' ? req.body.confirmPassword : '';

      const result = await rotateServerAdminPassword({
        currentPassword,
        newPassword,
        confirmPassword,
        credentialsFilePath: ADMIN_CREDENTIALS_FILE,
        envAdminPassword: process.env.ADMIN_PASSWORD,
      });

      res.status(result.success ? 200 : 400).json(result);
    } catch {
      res.status(500).json({
        success: false,
        messageEn: 'Failed to update administrator password.',
        messageAr: 'تعذر تحديث كلمة مرور المدير.',
      });
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

  app.get('/api/notifications/list', (_req: Request, res: Response) => {
    res.json({
      success: true,
      subscriptions: restockStore.subscriptions,
      logs: restockStore.logs,
    });
  });

  app.post('/api/notifications/restock', async (req: Request, res: Response) => {
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
  app.get('/api/social/accounts', (_req: Request, res: Response) => {
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
  app.post('/api/social/accounts/save', (req: Request, res: Response) => {
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
  app.post('/api/social/accounts/verify', async (req: Request, res: Response) => {
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
  app.post('/api/social/accounts/disconnect', (req: Request, res: Response) => {
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
  app.get('/api/social/instagram-status', (_req: Request, res: Response) => {
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
  app.post('/api/social/publish-instagram', async (req: Request, res: Response) => {
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

    try {
      // Step 1: Create Media Container POST /{ig-user-id}/media
      const containerRes = await fetch(`https://graph.facebook.com/v21.0/${igUserId}/media`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image_url: publicImageUrl,
          caption: caption,
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
        caption,
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
  app.post('/api/social/publish-direct', async (req: Request, res: Response) => {
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

    const results: Record<string, any> = {};

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
            formData.append('caption', caption || '');
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
                message: caption,
                link: productUrl,
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
              caption: caption,
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
            formData.append('caption', caption.slice(0, 1024)); // Telegram caption limit 1024 chars
            const blob = new Blob([new Uint8Array(imageBuffer)], { type: 'image/png' });
            formData.append('photo', blob, 'post.png');

            // Add interactive inline buttons
            formData.append('reply_markup', JSON.stringify({
              inline_keyboard: [
                [
                  { text: '💬 Order via WhatsApp (70773067)', url: 'https://wa.me/96170773067' },
                  { text: '🌐 View on Store', url: productUrl || 'https://onalaastore.com' }
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
            const tgRes = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                chat_id: chatId,
                text: `${caption}\n\n🔗 ${productUrl}`,
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
      caption,
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
  app.get('/api/social/logs', (_req: Request, res: Response) => {
    res.json({ success: true, logs: publishLogs });
  });

  // Developer & Meta API Setup Guide endpoint
  app.get('/api/social/setup-docs', (_req: Request, res: Response) => {
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

  // Health and System Status Endpoint
  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({
      status: 'healthy',
      store: 'ON AlAA STORE',
      version: '2027.1.0',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      database: 'ai-studio-onalaastore-6629f884-c968-499b-93cd-3c6b634467cb',
      instagramHandle: '@onalaastore.lb',
    });
  });

  const httpServer = http.createServer(app);

  // =========================================================================
  // 4. VITE DEV MIDDLEWARES OR PRODUCTION STATIC SERVING
  // =========================================================================
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const isHmrDisabled = process.env.DISABLE_HMR === 'true';
    const isCloudRun = Boolean(process.env.K_SERVICE);
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: isHmrDisabled
          ? false
          : {
              server: httpServer,
              protocol: (process.env.HMR_PROTOCOL as 'wss' | 'ws') || (isCloudRun ? 'wss' : undefined),
              clientPort: process.env.HMR_CLIENT_PORT
                ? Number(process.env.HMR_CLIENT_PORT)
                : (isCloudRun ? 443 : undefined),
            },
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Serve hashed assets with aggressive 1-year immutable caching
    app.use(
      '/assets',
      express.static(path.resolve(__dirname, 'dist', 'assets'), {
        maxAge: '1y',
        immutable: true,
      })
    );

    // Serve public static files (logo, favicon, images) with 1-day cache
    app.use(
      express.static(path.resolve(__dirname, 'dist'), {
        maxAge: '1d',
        setHeaders: (res, filePath) => {
          if (filePath.endsWith('index.html')) {
            res.setHeader('Cache-Control', 'no-cache');
          }
        },
      })
    );

    app.get('*', (_req: Request, res: Response) => {
      res.setHeader('Cache-Control', 'no-cache');
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 ON AlAA STORE Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Fatal server startup error:', err);
  process.exit(1);
});
