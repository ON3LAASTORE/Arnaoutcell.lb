import { Product } from '../types';
import { isValidEmailFormat, normalizeEmail } from './newsletterHelpers';

export type StockNotificationStatus = 'pending' | 'notified';

export interface StockNotificationRecord {
  id: string;
  productId: string;
  productName: string;
  productNameAr?: string;
  productBrand?: string;
  productPrice: number;
  productImage?: string;
  email: string;
  lang: 'en' | 'ar';
  status: StockNotificationStatus;
  createdAt: string;
  notifiedAt?: string;
}

export interface StockNotificationEmailTemplate {
  subject: string;
  text: string;
  html: string;
}

const VALID_ID_REGEX = /^[a-zA-Z0-9_-]+$/;

/**
 * Sanitizes any identifier segment for Firestore document IDs (`^[a-zA-Z0-9_\-]+$`).
 */
export function sanitizeFirestoreIdSegment(value: string, maxLen: number = 64): string {
  const cleaned = String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');
  const fallback = cleaned || 'item';
  return fallback.slice(0, maxLen);
}

/**
 * Builds a deterministic Firestore-safe document ID combining productId and normalized email.
 * Guaranteed to match `^[a-zA-Z0-9_\-]+$` with length 1..128.
 */
export function buildStockNotificationDocId(productId: string, email: string): string {
  const safeProduct = sanitizeFirestoreIdSegment(productId, 48);
  const safeEmail = sanitizeFirestoreIdSegment(normalizeEmail(email), 76);
  const combined = `${safeProduct}__${safeEmail}`.slice(0, 128);
  return VALID_ID_REGEX.test(combined) ? combined : 'notif_fallback';
}

/**
 * Builds a strict StockNotification payload conforming verbatim to `firebase-blueprint.json`
 * and `firestore.rules` (`hasAll`/`hasOnly` + string bounds + positive number).
 */
export function buildStockNotificationPayload(params: {
  product: Pick<Product, 'id' | 'name' | 'nameAr' | 'brand' | 'price' | 'images'>;
  email: string;
  lang?: 'en' | 'ar';
  createdAt?: string;
}): StockNotificationRecord {
  const cleanEmail = normalizeEmail(params.email).slice(0, 128);
  if (!isValidEmailFormat(cleanEmail)) {
    throw new Error('Invalid email address for stock notification.');
  }

  const rawProductId = String(params.product?.id || '').trim();
  const safeProductId = VALID_ID_REGEX.test(rawProductId)
    ? rawProductId.slice(0, 128)
    : sanitizeFirestoreIdSegment(rawProductId, 128);

  const safeProductName = (String(params.product?.name || 'Product').trim() || 'Product').slice(0, 255);
  const safeProductNameAr = String(params.product?.nameAr || '').trim().slice(0, 255);
  const safeBrand = String(params.product?.brand || '').trim().slice(0, 64);
  const numericPrice = Number(params.product?.price);
  const safePrice = Number.isFinite(numericPrice) && numericPrice >= 0 ? numericPrice : 0;
  const firstImage =
    Array.isArray(params.product?.images) && typeof params.product.images[0] === 'string'
      ? params.product.images[0].trim().slice(0, 1024)
      : '';
  const safeLang: 'en' | 'ar' = params.lang === 'ar' ? 'ar' : 'en';
  const safeCreatedAt = (
    typeof params.createdAt === 'string' && params.createdAt.trim()
      ? params.createdAt.trim()
      : new Date().toISOString()
  ).slice(0, 64);

  const record: StockNotificationRecord = {
    id: buildStockNotificationDocId(safeProductId, cleanEmail),
    productId: safeProductId,
    productName: safeProductName,
    productPrice: safePrice,
    email: cleanEmail,
    lang: safeLang,
    status: 'pending',
    createdAt: safeCreatedAt,
  };

  if (safeProductNameAr) {
    record.productNameAr = safeProductNameAr;
  }
  if (safeBrand) {
    record.productBrand = safeBrand;
  }
  if (firstImage) {
    record.productImage = firstImage;
  }

  return record;
}

/**
 * Returns true strictly when a product transitions from out-of-stock (<= 0) to in-stock (> 0).
 */
export function didProductRestock(previousStock: number, nextStock: number): boolean {
  const prev = Number(previousStock);
  const next = Number(nextStock);
  if (!Number.isFinite(prev) || !Number.isFinite(next)) {
    return false;
  }
  return prev <= 0 && next > 0;
}

function escapeHtml(text: string): string {
  return String(text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Generates localized EN or AR restock email subject, plain-text, and HTML body
 * sent when an out-of-stock product becomes available again.
 */
export function buildRestockNotificationEmail(params: {
  productName: string;
  productNameAr?: string;
  productPrice: number;
  lang: 'en' | 'ar';
  storeName?: string;
  storeUrl?: string;
}): StockNotificationEmailTemplate {
  const storeName = params.storeName?.trim() || 'ON AlAA STORE';
  const storeUrl = params.storeUrl?.trim() || 'https://onalaastore.com';
  const priceLabel = `$${Number.isFinite(params.productPrice) ? params.productPrice : 0} USD`;

  if (params.lang === 'ar') {
    const title = params.productNameAr?.trim() || params.productName;
    const safeTitle = escapeHtml(title);
    const safeStore = escapeHtml(storeName);
    const safeUrl = escapeHtml(storeUrl);

    return {
      subject: `توفر من جديد: ${title} — ${storeName}`,
      text: `مرحباً،\n\nيسعدنا إبلاغك بأن المنتج "${title}" أصبح متوفراً الآن في ${storeName} بسعر ${priceLabel}.\nاطلبه الآن قبل نفاد الكمية: ${storeUrl}\nللاستفسار السريع: 70 773 067`,
      html: `<div dir="rtl" style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;border:1px solid #e2e8f0;border-radius:16px;background:#ffffff;color:#172033;">
  <p style="font-size:12px;font-weight:700;color:#007AFF;margin:0 0 8px;">${safeStore}</p>
  <h2 style="margin:0 0 12px;font-size:20px;">المنتج الذي تنتظره توفر الآن!</h2>
  <p style="font-size:14px;line-height:1.6;margin:0 0 16px;">أصبح <strong>${safeTitle}</strong> متاحاً للشحن الفوري في جميع مناطق لبنان بسعر <strong>${escapeHtml(priceLabel)}</strong>.</p>
  <a href="${safeUrl}" style="display:inline-block;padding:12px 20px;background:#007AFF;color:#ffffff;text-decoration:none;border-radius:10px;font-weight:700;font-size:14px;">اطلب الآن</a>
</div>`,
    };
  }

  const title = params.productName;
  const safeTitle = escapeHtml(title);
  const safeStore = escapeHtml(storeName);
  const safeUrl = escapeHtml(storeUrl);

  return {
    subject: `Back in Stock: ${title} — ${storeName}`,
    text: `Good news!\n\n"${title}" is back in stock at ${storeName} for ${priceLabel} with official warranty and delivery across all Lebanon.\nShop now before this batch sells out: ${storeUrl}\nQuestions? Call or WhatsApp 70 773 067.`,
    html: `<div dir="ltr" style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;border:1px solid #e2e8f0;border-radius:16px;background:#ffffff;color:#172033;">
  <p style="font-size:12px;font-weight:700;color:#007AFF;margin:0 0 8px;">${safeStore}</p>
  <h2 style="margin:0 0 12px;font-size:20px;">Back in Stock & Ready to Ship</h2>
  <p style="font-size:14px;line-height:1.6;margin:0 0 16px;"><strong>${safeTitle}</strong> is available again for <strong>${escapeHtml(priceLabel)}</strong> with official store warranty and fast delivery across all Lebanon.</p>
  <a href="${safeUrl}" style="display:inline-block;padding:12px 20px;background:#007AFF;color:#ffffff;text-decoration:none;border-radius:10px;font-weight:700;font-size:14px;">Shop Now</a>
</div>`,
  };
}
