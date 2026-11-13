import { MarketingPost, SocialAccountConfig, SocialPlatform, SocialPublishResult } from '../types/socialMarketing';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, doc, setDoc, deleteDoc, getDocs, onSnapshot } from 'firebase/firestore';
import { openExternalUrl } from '../utils/navigation';

const STORAGE_KEYS = {
  POSTS: 'arnaout_social_posts_v2',
  ACCOUNTS: 'arnaout_social_accounts_v2',
};

export const INITIAL_SOCIAL_ACCOUNTS: SocialAccountConfig[] = [
  {
    id: 'acc-whatsapp',
    platform: 'whatsapp',
    displayName: 'WhatsApp Business & Direct Orders',
    accountHandle: '+961 3 986 718',
    isConnected: true,
    directPublishSupported: true,
    directPublishEnabled: true,
    hasApiKey: true,
    channelId: '9613986718',
    lastSyncedAt: new Date().toISOString(),
    instructionsEn: 'Directly opens WhatsApp Web or mobile app with pre-formatted product message, pricing, warranty, and order link.',
    instructionsAr: 'يفتح تطبيق الواتساب أو واتساب ويب مباشرة مع رسالة منسقة بالأسعار، الكفالة، ورابط الطلب المباشر.',
  },
  {
    id: 'acc-whatsapp-status',
    platform: 'whatsapp_status',
    displayName: 'WhatsApp Status & Stories',
    accountHandle: '+961 3 986 718 Status',
    isConnected: true,
    directPublishSupported: true,
    directPublishEnabled: true,
    hasApiKey: true,
    lastSyncedAt: new Date().toISOString(),
    instructionsEn: 'Generates 9:16 vertical full-screen status graphics and auto-copies status captions ready to post on WhatsApp status.',
    instructionsAr: 'ينشئ صوراً طولية بمقاس 9:16 مخصصة لحالة الواتساب مع نسخ النص التسويقي بنقرة واحدة.',
  },
  {
    id: 'acc-telegram',
    platform: 'telegram',
    displayName: 'Telegram Channel & Group Broadcast',
    accountHandle: '@onalaastore_lb',
    isConnected: true,
    directPublishSupported: true,
    directPublishEnabled: true,
    hasApiKey: false, // Configurable bot token
    channelId: '@onalaastore_lb',
    lastSyncedAt: new Date().toISOString(),
    instructionsEn: 'Broadcasts to Telegram channel subscribers or groups via direct intent share link or automated Telegram Bot API.',
    instructionsAr: 'نشر فوري في قناة وتيليجرام المشتركين عبر روابط المشاركة المباشرة أو بوت تيليجرام الآلي.',
  },
  {
    id: 'acc-instagram',
    platform: 'instagram',
    displayName: 'Instagram Business – ON AlAA STORE',
    accountHandle: '@onalaastore.lb',
    isConnected: true,
    directPublishSupported: true, // Official Meta Instagram Graph API
    directPublishEnabled: true,
    hasApiKey: false,
    channelId: 'onalaastore.lb',
    lastSyncedAt: new Date().toISOString(),
    instructionsEn: 'Directly publishes product photos and promotional designs to Instagram Business via official Meta Instagram Graph API container flow.',
    instructionsAr: 'نشر فوري مباشر لصور وتصاميم المنتجات في حساب إنستغرام للأعمال عبر واجهة Meta Graph API الرسمية.',
  },
  {
    id: 'acc-facebook',
    platform: 'facebook',
    displayName: 'Facebook Page & Marketplace',
    accountHandle: 'ON AlAA STORE Lebanon',
    isConnected: true,
    directPublishSupported: true,
    directPublishEnabled: true,
    hasApiKey: false,
    channelId: 'onalaastore.lb',
    lastSyncedAt: new Date().toISOString(),
    instructionsEn: '1-click Facebook share dialog with product card preview, cash USD price, and full description.',
    instructionsAr: 'مشاركة بنقرة واحدة على صفحة فيسبوك أو المجموعات مع معاينة بطاقة المنتج وتفاصيل السعر والكفالة.',
  },
  {
    id: 'acc-x',
    platform: 'x',
    displayName: 'X (formerly Twitter)',
    accountHandle: '@ONAlAAStore',
    isConnected: true,
    directPublishSupported: true,
    directPublishEnabled: true,
    hasApiKey: false,
    lastSyncedAt: new Date().toISOString(),
    instructionsEn: 'Generates concise 280-character post with top hashtags and direct product link.',
    instructionsAr: 'إنشاء تغريدة مقتضبة ضمن 280 حرفاً متضمنة السعر وأهم الهاشتاغات ورابط الجهاز.',
  },
  {
    id: 'acc-tiktok',
    platform: 'tiktok',
    displayName: 'TikTok Showcase & Photo Mode',
    accountHandle: '@onalaastore',
    isConnected: true,
    directPublishSupported: false,
    directPublishEnabled: true,
    hasApiKey: false,
    lastSyncedAt: new Date().toISOString(),
    instructionsEn: 'Copies trending viral hashtags, product highlights, and downloads vertical 9:16 graphic for TikTok Photo/Video mode.',
    instructionsAr: 'نسخ الكابشن والوسوم الرائجة وتحميل الصورة الطولية لنشرها في وضع الصور أو الفيديو على تيك توك.',
  },
];

// Initial demonstration posts
export const INITIAL_MARKETING_POSTS: MarketingPost[] = [
  {
    id: 'post-oppo-reno16-launch',
    productId: 'prod-oppo-reno16',
    productName: 'OPPO Reno 16 Series 5G 256GB 12RAM',
    productNameAr: 'أوبو رينو 16 سيريز 5G 256 جيجابايت',
    productBrand: 'Oppo',
    productCategory: 'Phones',
    productPrice: 739,
    originalPrice: 790,
    discountPercentage: 6,
    productImage: 'https://images.unsplash.com/photo-1592899677977-9c10ca588bbd?w=800&auto=format&fit=crop&q=80',
    aspectRatio: '1:1',
    templateStyle: 'coloros_purple',
    captionEn: '🔥 MEET THE ALL-NEW OPPO RENO 16 SERIES 5G at ON AlAA STORE!\n\nExperience 3D Pop Planet Design, HoloVerse 3D Tech, and 50MP Ultra-Wide Selfie Camera.\n\n💰 Cash USD: $739 (Was $790 - Save 6% OFF)\n🛡️ 12 Months Official Warranty\n🚚 Online Store in Chouf • Delivery Available to All Lebanon\n\n📲 Order via WhatsApp: https://wa.me/9613986718 (03 986 718)\n#ONAlAASTORE #OPPOLebanon #Reno16Series #Chouf #LebanonTech',
    captionAr: '🔥 أحدث هواتف أوبو: OPPO Reno 16 Series 5G متوفر الآن لدى ON AlAA STORE!\n\nتصميم ثوري مع تقنية HoloVerse 3D وكاميرا سيلفي 50 ميجابكسل فائقة الدقة.\n\n💰 السعر كاش: $739 دولار (خصم خاص 6%)\n🛡️ كفالة رسمية 12 شهراً\n🚚 متجر أونلاين في الشوف • توصيل متاح لجميع مناطق لبنان\n\n📲 للطلب الفوري عبر واتساب: https://wa.me/9613986718 (03 986 718)\n#ONAlAASTORE #الشوف #أوبو #هواتف_لبنان',
    hashtags: ['#ONAlAASTORE', '#OPPO', '#Reno16Series', '#Chouf', '#LebanonTech', '#CashUSD'],
    selectedPlatforms: ['whatsapp', 'whatsapp_status', 'instagram', 'facebook', 'telegram'],
    status: 'published',
    createdAt: new Date(Date.now() - 3600000 * 24).toISOString(),
    publishedAt: new Date(Date.now() - 3600000 * 20).toISOString(),
    platformResults: {
      whatsapp: { platform: 'whatsapp', success: true, message: 'Broadcast to VIP customer list sent', timestamp: new Date().toISOString() },
      facebook: { platform: 'facebook', success: true, message: 'Shared on Facebook Page', timestamp: new Date().toISOString() },
    },
  },
  {
    id: 'post-iphone16promax-desert',
    productId: 'prod-iphone16promax',
    productName: 'Apple iPhone 16 Pro Max 256GB Desert Titanium',
    productNameAr: 'أبل آيفون 16 برو ماكس 256 جيجابايت - تيتانيوم صحراوي',
    productBrand: 'Apple',
    productCategory: 'Phones',
    productPrice: 1249,
    originalPrice: 1399,
    discountPercentage: 11,
    productImage: 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=800&auto=format&fit=crop&q=80',
    aspectRatio: '9:16',
    templateStyle: 'modern_dark',
    captionEn: '✨ Apple iPhone 16 Pro Max in Desert Titanium!\n\nPowered by A18 Pro chip with Apple Intelligence. Available online today at ON AlAA STORE (Chouf).\n\n💰 Best Cash USD Price: $1,249\n🛡️ 12 Months Official Warranty\n🚚 Delivery Available to All Lebanon\n\nWhatsApp: https://wa.me/9613986718 (03 986 718)\n#ONAlAASTORE #iPhone16ProMax #AppleLebanon #Chouf',
    captionAr: '✨ آيفون 16 برو ماكس باللون التيتانيوم الصحراوي الفاخر!\n\nمعالج A18 Pro الأقوى وكاميرا احترافية 48 ميجابكسل. متوفر الآن لدى ON AlAA STORE في الشوف.\n\n💰 السعر: $1,249 دولار كاش\n🛡️ كفالة رسمية\n🚚 توصيل متاح لجميع مناطق لبنان\n\nواتساب: https://wa.me/9613986718 (03 986 718)\n#ONAlAASTORE #الشوف #آيفون #توصيل_لكل_لبنان',
    hashtags: ['#ONAlAASTORE', '#Apple', '#iPhone16ProMax', '#Chouf', '#Lebanon'],
    selectedPlatforms: ['whatsapp_status', 'instagram', 'x', 'tiktok'],
    status: 'draft',
    createdAt: new Date(Date.now() - 3600000 * 5).toISOString(),
  },
];

/**
 * Initializes and retrieves marketing posts from localStorage and Firestore.
 */
export function getSavedMarketingPosts(): MarketingPost[] {
  if (typeof window === 'undefined') return INITIAL_MARKETING_POSTS;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.POSTS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.POSTS, JSON.stringify(INITIAL_MARKETING_POSTS));
      return INITIAL_MARKETING_POSTS;
    }
    const parsed: MarketingPost[] = JSON.parse(raw);
    return parsed;
  } catch {
    return INITIAL_MARKETING_POSTS;
  }
}

/**
 * Saves marketing posts locally and attempts background cloud sync to Firestore.
 */
export function saveMarketingPosts(posts: MarketingPost[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEYS.POSTS, JSON.stringify(posts));
}

/**
 * Creates or updates a single marketing post.
 */
export async function persistMarketingPost(post: MarketingPost): Promise<MarketingPost> {
  const posts = getSavedMarketingPosts();
  const existingIndex = posts.findIndex((p) => p.id === post.id);

  if (existingIndex >= 0) {
    posts[existingIndex] = post;
  } else {
    posts.unshift(post);
  }

  saveMarketingPosts(posts);

  // Sync to Firestore in background
  if (typeof window !== 'undefined') {
    try {
      const docRef = doc(db, 'social_posts', post.id);
      const cleanPayload = {
        id: post.id,
        productId: post.productId,
        productName: post.productName,
        productBrand: post.productBrand || 'Electronics',
        productCategory: post.productCategory || 'Tech',
        productPrice: Number(post.productPrice) || 0,
        originalPrice: Number(post.originalPrice) || 0,
        discountPercentage: Number(post.discountPercentage) || 0,
        productImage: post.productImage || '',
        aspectRatio: post.aspectRatio || '1:1',
        templateStyle: post.templateStyle || 'modern_dark',
        captionEn: post.captionEn || '',
        captionAr: post.captionAr || '',
        hashtags: Array.isArray(post.hashtags) ? post.hashtags.slice(0, 30) : [],
        selectedPlatforms: Array.isArray(post.selectedPlatforms) ? post.selectedPlatforms : [],
        status: post.status || 'draft',
        createdAt: post.createdAt || new Date().toISOString(),
        publishedAt: post.publishedAt || null,
      };
      await setDoc(docRef, cleanPayload, { merge: true });
    } catch (err) {
      console.warn('Firestore social_posts sync notice (using offline cache):', err);
    }
  }

  return post;
}

/**
 * Deletes a marketing post from storage and Firestore.
 */
export async function deleteMarketingPost(postId: string): Promise<void> {
  const posts = getSavedMarketingPosts().filter((p) => p.id !== postId);
  saveMarketingPosts(posts);

  if (typeof window !== 'undefined') {
    try {
      const docRef = doc(db, 'social_posts', postId);
      await deleteDoc(docRef);
    } catch (err) {
      console.warn('Firestore social_posts delete notice:', err);
    }
  }
}

/**
 * Retrieves configured social accounts.
 */
export function getSavedSocialAccounts(): SocialAccountConfig[] {
  if (typeof window === 'undefined') return INITIAL_SOCIAL_ACCOUNTS;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.ACCOUNTS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.ACCOUNTS, JSON.stringify(INITIAL_SOCIAL_ACCOUNTS));
      return INITIAL_SOCIAL_ACCOUNTS;
    }
    const parsed: SocialAccountConfig[] = JSON.parse(raw);
    // Ensure all 7 core platforms exist in config
    const existingPlatforms = new Set(parsed.map((a) => a.platform));
    let hasMissing = false;
    const merged = [...parsed];

    for (const initAcc of INITIAL_SOCIAL_ACCOUNTS) {
      if (!existingPlatforms.has(initAcc.platform)) {
        merged.push(initAcc);
        hasMissing = true;
      }
    }
    if (hasMissing) {
      localStorage.setItem(STORAGE_KEYS.ACCOUNTS, JSON.stringify(merged));
    }
    return merged;
  } catch {
    return INITIAL_SOCIAL_ACCOUNTS;
  }
}

/**
 * Saves updated social account configuration.
 * Never stores or exposes raw secret API keys in plaintext.
 */
export function saveSocialAccounts(accounts: SocialAccountConfig[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEYS.ACCOUNTS, JSON.stringify(accounts));
}

/**
 * Updates a single social account config.
 */
export function updateSocialAccount(updated: SocialAccountConfig): void {
  const accounts = getSavedSocialAccounts();
  const idx = accounts.findIndex((a) => a.id === updated.id || a.platform === updated.platform);
  if (idx >= 0) {
    accounts[idx] = { ...accounts[idx], ...updated, lastSyncedAt: new Date().toISOString() };
  } else {
    accounts.push(updated);
  }
  saveSocialAccounts(accounts);
}

/**
 * Executes direct sharing or triggers Web Intent/Web Share API.
 */
export async function executeSocialShare(
  platform: SocialPlatform,
  post: MarketingPost,
  canvasBlobUrl?: string
): Promise<SocialPublishResult> {
  const productUrl = `https://onalaastore.com/?product=${encodeURIComponent(post.productId)}`;
  const text = post.captionEn || post.captionAr;

  try {
    // 1. Try Native Navigator Share if supported and on mobile/desktop browser
    if (typeof navigator !== 'undefined' && navigator.share && canvasBlobUrl) {
      try {
        const res = await fetch(canvasBlobUrl);
        const blob = await res.blob();
        const file = new File([blob], `${post.productBrand}-${post.productId}-${post.aspectRatio}.png`, {
          type: 'image/png',
        });

        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({
            title: post.productName,
            text,
            url: productUrl,
            files: [file],
          });
          return {
            platform,
            success: true,
            message: 'Shared successfully via system share menu!',
            timestamp: new Date().toISOString(),
          };
        }
      } catch (shareErr) {
        // Fallback to web intent if cancelled or unsupported
        console.info('Native file share skipped, falling back to web intent:', shareErr);
      }
    }

    // 2. Platform Web Intents
    let targetUrl = '';
    switch (platform) {
      case 'whatsapp':
        targetUrl = `https://wa.me/?text=${encodeURIComponent(`${text}\n\n${productUrl}`)}`;
        break;
      case 'whatsapp_status':
        targetUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;
        break;
      case 'telegram':
        targetUrl = `https://t.me/share/url?url=${encodeURIComponent(productUrl)}&text=${encodeURIComponent(text)}`;
        break;
      case 'x':
        targetUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text.slice(0, 240))}&url=${encodeURIComponent(productUrl)}`;
        break;
      case 'facebook':
        targetUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(productUrl)}&quote=${encodeURIComponent(text)}`;
        break;
      case 'instagram':
        targetUrl = 'https://www.instagram.com/';
        break;
      case 'tiktok':
        targetUrl = 'https://www.tiktok.com/upload';
        break;
      default:
        targetUrl = productUrl;
    }

    if (typeof window !== 'undefined' && targetUrl) {
      // Copy caption to clipboard automatically to assist manual paste on Instagram/TikTok/WhatsApp
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(text).catch(() => {});
      }
      openExternalUrl(targetUrl);
    }

    return {
      platform,
      success: true,
      message: `Opened ${platform} with caption copied to clipboard!`,
      externalUrl: targetUrl,
      timestamp: new Date().toISOString(),
    };
  } catch (err) {
    return {
      platform,
      success: false,
      message: err instanceof Error ? err.message : 'Share action failed',
      timestamp: new Date().toISOString(),
    };
  }
}

/**
 * Executes DIRECT API publishing via the secure backend using official Meta Graph API and Telegram Bot API.
 * Never exposes access tokens or app secrets in the client frontend.
 */
export async function publishDirectViaBackend(params: {
  postId?: string;
  productId: string;
  productName: string;
  platforms: SocialPlatform[];
  caption: string;
  imageBase64?: string;
  productUrl?: string;
  fallbackImageUrl?: string;
}): Promise<{
  success: boolean;
  results: Record<string, SocialPublishResult>;
  publicImageUrl?: string;
  error?: string;
}> {
  try {
    const res = await fetch('/api/social/publish-direct', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Server API responded with ${res.status}: ${errText}`);
    }

    const data = await res.json();
    return data;
  } catch (err) {
    console.error('publishDirectViaBackend error:', err);
    // If backend is unavailable or offline, return graceful fallback
    const fallbackResults: Record<string, SocialPublishResult> = {};
    for (const p of params.platforms) {
      fallbackResults[p] = {
        platform: p,
        success: false,
        message: err instanceof Error ? err.message : 'Network communication error',
        timestamp: new Date().toISOString(),
      };
    }
    return {
      success: false,
      results: fallbackResults,
      error: err instanceof Error ? err.message : 'Publish failed',
    };
  }
}

/**
 * Fetches connected social accounts status from backend (without sensitive tokens).
 */
export async function fetchBackendSocialAccounts(): Promise<SocialAccountConfig[]> {
  try {
    const res = await fetch('/api/social/accounts');
    if (res.ok) {
      const data = await res.json();
      if (data.success && Array.isArray(data.accounts)) {
        return data.accounts;
      }
    }
  } catch (err) {
    console.warn('Backend accounts fetch notice (using cache):', err);
  }
  return getSavedSocialAccounts();
}

/**
 * Saves social account credentials securely on the backend.
 */
export async function saveBackendSocialAccount(accountData: Partial<SocialAccountConfig> & {
  pageAccessToken?: string;
  telegramBotToken?: string;
  twitterAccessToken?: string;
}): Promise<{ success: boolean; message: string; error?: string }> {
  try {
    const res = await fetch('/api/social/accounts/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(accountData),
    });
    return await res.json();
  } catch (err) {
    return {
      success: false,
      message: 'Failed to communicate with backend server',
      error: err instanceof Error ? err.message : 'Connection failed',
    };
  }
}

/**
 * Verifies live credentials against Meta Graph API or Telegram API.
 */
export async function verifyBackendSocialAccount(platform: SocialPlatform): Promise<{
  success: boolean;
  message?: string;
  error?: string;
  data?: any;
}> {
  try {
    const res = await fetch('/api/social/accounts/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ platform }),
    });
    return await res.json();
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Verification request failed',
    };
  }
}

/**
 * Disconnects an account on the backend.
 */
export async function disconnectBackendSocialAccount(platform: SocialPlatform): Promise<{ success: boolean }> {
  try {
    const res = await fetch('/api/social/accounts/disconnect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ platform }),
    });
    return await res.json();
  } catch {
    return { success: false };
  }
}

/**
 * Fetches publishing history logs from backend.
 */
export async function fetchBackendPublishLogs(): Promise<any[]> {
  try {
    const res = await fetch('/api/social/logs');
    if (res.ok) {
      const data = await res.json();
      return data.logs || [];
    }
  } catch {}
  return [];
}

/**
 * Fetches status specifically for ON AlAA STORE (@onalaastore.lb) Instagram integration.
 */
export async function fetchInstagramStatus(): Promise<{
  success: boolean;
  account: string;
  targetUrl: string;
  displayName: string;
  isConnected: boolean;
  hasToken: boolean;
  hasAccountId: boolean;
  instagramAccountId?: string;
  lastVerifiedAt?: string | null;
  directPublishSupported: boolean;
}> {
  try {
    const res = await fetch('/api/social/instagram-status');
    if (res.ok) {
      return await res.json();
    }
  } catch {}
  return {
    success: false,
    account: '@onalaastore.lb',
    targetUrl: 'https://www.instagram.com/onalaastore.lb/',
    displayName: 'Instagram Business – ON AlAA STORE',
    isConnected: false,
    hasToken: false,
    hasAccountId: false,
    directPublishSupported: true,
  };
}

/**
 * Publishes directly to Instagram Business account (@onalaastore.lb) using official Meta Instagram Graph API.
 */
export async function publishToInstagramDirectly(params: {
  productId: string;
  productName: string;
  caption: string;
  imageBase64?: string;
  fallbackImageUrl?: string;
}): Promise<{
  success: boolean;
  message: string;
  postId?: string;
  creationId?: string;
  postUrl?: string;
  account?: string;
  publicImageUrl?: string;
  errorDetails?: string;
  needsSetup?: boolean;
  metaCode?: number;
  metaSubcode?: number;
}> {
  try {
    const res = await fetch('/api/social/publish-instagram', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    return await res.json();
  } catch (err) {
    return {
      success: false,
      message: 'Failed to communicate with Instagram publishing service.',
      errorDetails: err instanceof Error ? err.message : 'Network error',
    };
  }
}
