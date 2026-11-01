import test from 'node:test';
import assert from 'node:assert/strict';
import {
  generateProductHashtags,
  generateSocialCaptions,
  generatePlatformSpecificText,
  buildPlatformShareUrl,
  validateMarketingPost,
  getCanvasDimensions,
  STORE_PHONE_DISPLAY,
  STORE_PHONE_INTL,
} from './socialMarketingHelpers.ts';
import type { Product, StoreSettings } from '../types/index.ts';

const mockProduct: Product = {
  id: 'prod-oppo-reno16-test',
  name: 'OPPO Reno 16 Series 5G 256GB 12RAM',
  nameAr: 'أوبو رينو 16 سيريز 5G 256 جيجابايت',
  brand: 'Oppo',
  category: 'Phones',
  sku: 'OPP-R16-5G',
  price: 739,
  originalPrice: 790,
  discountPercentage: 6,
  stock: 20,
  images: ['https://example.com/reno16.png'],
  description: 'Experience 3D Pop Planet Design and HoloVerse 3D tech.',
  descriptionAr: 'تصميم بوب بلانيت ثلاثي الأبعاد مع كاميرا 50 ميجابكسل وكفالة رسمية.',
  specifications: [
    { label: 'Display', value: '6.78" 1.5K AMOLED 120Hz' },
    { label: 'Storage', value: '256GB UFS 3.1' },
    { label: 'RAM', value: '12GB LPDDR5X' },
  ],
  warrantyMonths: 12,
  isPublished: true,
  rating: 5,
  reviewCount: 1,
  createdAt: '2026-10-29T00:00:00.000Z',
};

const mockSettings: StoreSettings = {
  storeName: 'ARNAOUT STORE',
  tagline: 'Your Home in Electronics 🏠',
  taglineAr: 'بيتك في عالم الإلكترونيات 🏠',
  phone: '81 900 916',
  whatsapp: '96181900916',
  locationEn: 'Saida — Nijme Square, Main Road',
  locationAr: 'صيدا — ساحة النجمة، الشارع الرئيسي',
  openingHoursEn: 'Monday – Sunday: 8:00 AM – 1:00 AM',
  openingHoursAr: 'الإثنين – الأحد: 8:00 صباحاً – 1:00 بعد منتصف الليل',
  announcementBar: { enabled: true, textEn: '', textAr: '', bgColor: '', textColor: '' },
  heroSlides: [],
  deliveryZones: [],
};

test('generateProductHashtags includes brand, category, store, and Lebanon tags', () => {
  const tags = generateProductHashtags(mockProduct);
  assert.ok(tags.includes('#ArnaoutStore'));
  assert.ok(tags.includes('#Oppo') || tags.includes('#OPPOLebanon'));
  assert.ok(tags.includes('#Phones'));
  assert.ok(tags.includes('#Saida'));
  assert.ok(tags.includes('#HotDeal') || tags.includes('#LebanonDeals'));
});

test('generateSocialCaptions creates complete English and Arabic copy with real product attributes', () => {
  const { captionEn, captionAr, bilingual } = generateSocialCaptions(mockProduct, mockSettings);

  // English Caption checks
  assert.ok(captionEn.includes('OPPO Reno 16 Series 5G'));
  assert.ok(captionEn.includes('$739 USD'));
  assert.ok(captionEn.includes('12 Months'));
  assert.ok(captionEn.includes('Saida — Nijme Square'));
  assert.ok(captionEn.includes('https://wa.me/96181900916'));
  assert.ok(captionEn.includes('prod-oppo-reno16-test'));

  // Arabic Caption checks
  assert.ok(captionAr.includes('أوبو رينو 16'));
  assert.ok(captionAr.includes('$739'));
  assert.ok(captionAr.includes('12 شهراً') || captionAr.includes('12'));
  assert.ok(captionAr.includes('صيدا — ساحة النجمة'));
  assert.ok(captionAr.includes('https://wa.me/96181900916'));

  // Bilingual checks
  assert.ok(bilingual.includes('Cash Price'));
  assert.ok(bilingual.includes('ARNAOUT STORE'));
});

test('generatePlatformSpecificText applies platform-specific rules', () => {
  const post = {
    productId: mockProduct.id,
    productName: mockProduct.name,
    productPrice: mockProduct.price,
    originalPrice: mockProduct.originalPrice,
    discountPercentage: mockProduct.discountPercentage,
    hashtags: ['#ArnaoutStore', '#OPPO'],
  };

  // WhatsApp formatting should include bold asterisks
  const waText = generatePlatformSpecificText('whatsapp', post, mockSettings);
  assert.ok(waText.includes('*ARNAOUT STORE'));
  assert.ok(waText.includes('*$739 USD*') || waText.includes('$739 USD'));

  // WhatsApp status should be punchy
  const statusText = generatePlatformSpecificText('whatsapp_status', post, mockSettings);
  assert.ok(statusText.includes(STORE_PHONE_DISPLAY));

  // X (Twitter) must be within 280 character limit
  const xText = generatePlatformSpecificText('x', post, mockSettings);
  assert.ok(xText.length <= 280, `X post length ${xText.length} exceeded 280 characters`);
  assert.ok(xText.includes('$739 USD'));

  // Telegram formatting
  const tgText = generatePlatformSpecificText('telegram', post, mockSettings);
  assert.ok(tgText.includes('**ARNAOUT STORE'));
});

test('buildPlatformShareUrl constructs proper intent URLs for each network', () => {
  const text = 'Check out this new device!';
  const url = 'https://arnaoutstore.com/?product=prod-123';

  const wa = buildPlatformShareUrl('whatsapp', text, url);
  assert.ok(wa.shareUrl.startsWith('https://wa.me/?text='));

  const tg = buildPlatformShareUrl('telegram', text, url);
  assert.ok(tg.shareUrl.includes('https://t.me/share/url?'));
  assert.ok(tg.shareUrl.includes(encodeURIComponent(url)));

  const x = buildPlatformShareUrl('x', text, url);
  assert.ok(x.shareUrl.includes('https://twitter.com/intent/tweet?'));

  const fb = buildPlatformShareUrl('facebook', text, url);
  assert.ok(fb.shareUrl.includes('https://www.facebook.com/sharer/sharer.php?'));
});

test('validateMarketingPost enforces required attributes', () => {
  const invalid = validateMarketingPost({});
  assert.equal(invalid.valid, false);
  assert.ok(invalid.errors.length >= 3);

  const valid = validateMarketingPost({
    productId: 'prod-123',
    productName: 'Sample Gadget',
    productPrice: 49,
    captionEn: 'Sample caption',
    selectedPlatforms: ['whatsapp', 'instagram'],
  });
  assert.equal(valid.valid, true);
  assert.equal(valid.errors.length, 0);
});

test('getCanvasDimensions returns correct aspect ratio geometries', () => {
  const square = getCanvasDimensions('1:1');
  assert.equal(square.width, 1080);
  assert.equal(square.height, 1080);

  const story = getCanvasDimensions('9:16');
  assert.equal(story.width, 1080);
  assert.equal(story.height, 1920);

  const banner = getCanvasDimensions('16:9');
  assert.equal(banner.width, 1200);
  assert.equal(banner.height, 675);
});
