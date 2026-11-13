export type ScannedCodeKind = 'order_id' | 'serial_barcode' | 'sku' | 'product_id' | 'unknown';

export interface ParsedWarrantyQrPayload {
  lookupValue: string;
  detectedKind: ScannedCodeKind;
  rawText: string;
}

export interface CameraErrorFeedback {
  reason: 'permission_denied' | 'no_camera' | 'in_use' | 'unsupported' | 'unknown';
  title: string;
  detail: string;
}

const ORDER_ID_PATTERN = /\b((?:OAA|ARN|ORD)-[A-Z0-9-]{3,})\b/i;
const PRODUCT_ID_PATTERN = /\b(prod-[a-z0-9_-]{2,})\b/i;
const LABELED_VALUE_PATTERN =
  /(?:^|[\n\r|,;])\s*(?:s\/n|sn|serial(?:\s*(?:no|number|id))?|barcode|ean|upc|order(?:\s*id)?|sku|imei)\s*[:=#-]\s*([a-zA-Z0-9_-]{4,64})/i;
const URL_QUERY_KEYS = ['serial', 'sn', 'barcode', 'orderId', 'order', 'sku', 'code', 'q', 'id'];

export function classifyWarrantyCode(value: string): ScannedCodeKind {
  const trimmed = value.trim();
  if (/^(OAA|ARN|ORD)-/i.test(trimmed)) return 'order_id';
  if (/^prod-/i.test(trimmed)) return 'product_id';
  if (/^\d{8,18}$/.test(trimmed)) return 'serial_barcode';
  if (/^[A-Z0-9]+(?:-[A-Z0-9]+)+$/i.test(trimmed)) return 'sku';
  return trimmed.length >= 4 ? 'serial_barcode' : 'unknown';
}

function cleanCandidate(raw: string): string {
  return raw.trim().replace(/^#+/, '').replace(/\s+/g, '');
}

/**
 * Extracts a clean Order ID, product Serial/Barcode, SKU, or Product ID
 * from QR code and barcode strings printed on product boxes or warranty stickers.
 */
export function parseScannedWarrantyCode(rawPayload: string): ParsedWarrantyQrPayload | null {
  if (typeof rawPayload !== 'string') return null;
  const rawText = rawPayload.trim();
  if (!rawText) return null;

  // 1. JSON payload (e.g. {"serial":"195949038221"} or {"orderId":"OAA-2027-1001"})
  if (rawText.startsWith('{') && rawText.endsWith('}')) {
    try {
      const parsed = JSON.parse(rawText) as Record<string, unknown>;
      const priorityKeys = ['orderId', 'serial', 'sn', 'serialNumber', 'barcode', 'sku', 'productId', 'code', 'id'];
      for (const key of priorityKeys) {
        const val = parsed[key];
        if (typeof val === 'string' && val.trim().length > 0) {
          const lookupValue = cleanCandidate(val);
          return {
            lookupValue,
            detectedKind: classifyWarrantyCode(lookupValue),
            rawText,
          };
        }
      }
    } catch {
      // Fall through to text / URL parsers
    }
  }

  // 2. URL payload (e.g. https://onalaastore.com/#/warranty?sn=195949038221 or .../product/prod-iphone16promax)
  if (/^https?:\/\//i.test(rawText)) {
    try {
      const url = new URL(rawText);
      const searchSources = [url.searchParams];

      // Support hash-routed query strings like #/services?sn=...
      const hashQueryIdx = url.hash.indexOf('?');
      if (hashQueryIdx >= 0) {
        searchSources.push(new URLSearchParams(url.hash.slice(hashQueryIdx + 1)));
      }

      for (const params of searchSources) {
        for (const key of URL_QUERY_KEYS) {
          const val = params.get(key);
          if (val && val.trim().length > 0) {
            const lookupValue = cleanCandidate(val);
            return {
              lookupValue,
              detectedKind: classifyWarrantyCode(lookupValue),
              rawText,
            };
          }
        }
      }

      const prodMatch = rawText.match(PRODUCT_ID_PATTERN);
      if (prodMatch) {
        return {
          lookupValue: prodMatch[1],
          detectedKind: 'product_id',
          rawText,
        };
      }

      const orderInUrl = rawText.match(ORDER_ID_PATTERN);
      if (orderInUrl) {
        return {
          lookupValue: orderInUrl[1].toUpperCase(),
          detectedKind: 'order_id',
          rawText,
        };
      }
    } catch {
      // Fall through
    }
  }

  // 3. Explicit labeled sticker text (e.g. "S/N: 195949038221", "ORDER: OAA-2027-1001")
  const labeledMatch = rawText.match(LABELED_VALUE_PATTERN);
  if (labeledMatch && labeledMatch[1]) {
    const lookupValue = cleanCandidate(labeledMatch[1]);
    return {
      lookupValue,
      detectedKind: classifyWarrantyCode(lookupValue),
      rawText,
    };
  }

  // 4. Direct Order ID or Product ID embedded anywhere in multi-line sticker text
  const orderMatch = rawText.match(ORDER_ID_PATTERN);
  if (orderMatch) {
    return {
      lookupValue: orderMatch[1].toUpperCase(),
      detectedKind: 'order_id',
      rawText,
    };
  }

  const productMatch = rawText.match(PRODUCT_ID_PATTERN);
  if (productMatch) {
    return {
      lookupValue: productMatch[1],
      detectedKind: 'product_id',
      rawText,
    };
  }

  // 5. Clean single token / plain serial barcode
  const singleLine = rawText.split(/[\r\n]+/)[0].trim().replace(/^#+/, '');
  if (!singleLine) return null;

  return {
    lookupValue: singleLine,
    detectedKind: classifyWarrantyCode(singleLine),
    rawText,
  };
}

/**
 * Translates WebRTC getUserMedia camera errors into clear EN / AR user instructions.
 */
export function mapCameraErrorToMessage(error: unknown, lang: 'en' | 'ar'): CameraErrorFeedback {
  const errName = error instanceof Error ? error.name : '';
  const errMsg = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();

  if (
    errName === 'NotAllowedError' ||
    errName === 'PermissionDeniedError' ||
    errMsg.includes('permission') ||
    errMsg.includes('denied')
  ) {
    return {
      reason: 'permission_denied',
      title: lang === 'ar' ? 'تم رفض إذن الكاميرا' : 'Camera Access Denied',
      detail:
        lang === 'ar'
          ? 'يرجى السماح بالوصول إلى الكاميرا من إعدادات المتصفح ثم الضغط على إعادة المحاولة، أو استخدام خيار رفع صورة الملصق أدناه.'
          : 'Please allow camera permission in your browser settings and retry, or scan by uploading a photo of the sticker below.',
    };
  }

  if (
    errName === 'NotFoundError' ||
    errName === 'DevicesNotFoundError' ||
    errName === 'OverconstrainedError' ||
    errMsg.includes('not found') ||
    errMsg.includes('no camera')
  ) {
    return {
      reason: 'no_camera',
      title: lang === 'ar' ? 'لم يتم العثور على كاميرا متاحة' : 'No Camera Detected',
      detail:
        lang === 'ar'
          ? 'لم نتمكن من العثور على كاميرا متصلة على هذا الجهاز. يمكنك رفع صورة واضحة لرمز QR أو إدخال الرقم التسلسلي يدوياً.'
          : 'No active camera was found on this device. You can upload a clear photo of the QR sticker or enter the serial number manually.',
    };
  }

  if (errName === 'NotReadableError' || errName === 'TrackStartError') {
    return {
      reason: 'in_use',
      title: lang === 'ar' ? 'الكاميرا قيد الاستخدام حالياً' : 'Camera Currently Busy',
      detail:
        lang === 'ar'
          ? 'يبدو أن الكاميرا مستخدمة في تطبيق أو نافذة أخرى. أغلق التطبيق الآخر ثم أعد المحاولة.'
          : 'Your camera is currently in use by another app or tab. Close it and retry, or upload a sticker photo.',
    };
  }

  if (errMsg.includes('mediadevices') || errMsg.includes('unsupported') || errMsg.includes('secure')) {
    return {
      reason: 'unsupported',
      title: lang === 'ar' ? 'الكاميرا غير مدعومة هنا' : 'Live Camera Unavailable',
      detail:
        lang === 'ar'
          ? 'البث المباشر للكاميرا غير مدعوم في هذا المتصفح. يمكنك التقاط أو رفع صورة لرمز QR للفحص الفوري.'
          : 'Live camera streaming is unsupported in this context. You can still upload or capture a photo of the QR sticker below.',
    };
  }

  return {
    reason: 'unknown',
    title: lang === 'ar' ? 'تعذر تشغيل الماسح الضوئي' : 'Unable to Start Camera',
    detail:
      lang === 'ar'
        ? 'حدث خطأ غير متوقع أثناء فتح الكاميرا. أعد المحاولة أو ارفع صورة ملصق الكفالة.'
        : 'An unexpected error occurred while accessing the camera. Try again or upload a photo of your device sticker.',
  };
}
