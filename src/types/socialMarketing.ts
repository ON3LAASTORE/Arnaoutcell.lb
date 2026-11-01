export type SocialPlatform =
  | 'facebook'
  | 'instagram'
  | 'whatsapp'
  | 'whatsapp_status'
  | 'tiktok'
  | 'telegram'
  | 'x';

export type SocialAspectRatio = '1:1' | '9:16' | '16:9';

export type SocialGraphicTemplate =
  | 'modern_dark'
  | 'minimal_white'
  | 'hot_deal'
  | 'coloros_purple';

export interface SocialPublishResult {
  platform: SocialPlatform;
  success: boolean;
  message: string;
  postId?: string;
  postUrl?: string;
  externalUrl?: string;
  errorDetails?: string;
  timestamp: string;
}

export interface MarketingPost {
  id: string;
  productId: string;
  productName: string;
  productNameAr?: string;
  productBrand: string;
  productCategory: string;
  productPrice: number;
  originalPrice?: number;
  discountPercentage?: number;
  productImage: string;
  aspectRatio: SocialAspectRatio;
  templateStyle: SocialGraphicTemplate;
  captionEn: string;
  captionAr: string;
  hashtags: string[];
  selectedPlatforms: SocialPlatform[];
  status: 'draft' | 'published' | 'scheduled';
  createdAt: string;
  publishedAt?: string;
  platformResults?: Partial<Record<SocialPlatform, SocialPublishResult>>;
  notes?: string;
  headlineOverride?: string;
}

export interface SocialAccountConfig {
  id: string;
  platform: SocialPlatform;
  displayName: string;
  accountHandle?: string;
  isConnected: boolean;
  directPublishSupported: boolean;
  directPublishEnabled: boolean;
  channelId?: string; // Telegram channel, FB Page ID, etc.
  hasApiKey: boolean; // Indicates key is set without exposing the secret
  lastSyncedAt?: string;
  webhookUrl?: string;
  instructionsEn: string;
  instructionsAr: string;
}
