import { Product } from '../types';

export type ProductQrMatchReason =
  | 'product_id'
  | 'sku'
  | 'variant_sku'
  | 'barcode'
  | 'fuzzy_sku_or_name';

export interface ParsedProductQrPayload {
  lookupValue: string;
  detectedField: 'product_id' | 'sku' | 'barcode' | 'query';
  rawText: string;
}

export interface ProductQrLookupResult {
  matchedProduct: Product | null;
  parsed: ParsedProductQrPayload | null;
  matchReason?: ProductQrMatchReason;
}

const PRODUCT_ID_REGEX = /\b(prod-[a-z0-9_-]{2,})\b/i;
const LABELED_PRODUCT_TOKEN_REGEX =
  /(?:^|[\n\r|,;])\s*(?:product(?:\s*id)?|prod(?:uct)?|sku|item(?:\s*code)?|barcode|ean|upc|s\/n|sn|serial|model)\s*[:=#]\s*([a-zA-Z0-9._-]{2,80})/i;
const URL_PRODUCT_PARAM_KEYS = ['product', 'productId', 'id', 'sku', 'barcode', 'ean', 'upc', 'code', 'q'];

function normalizeToken(value: string): string {
  return value.trim().replace(/^#+/, '').toLowerCase();
}

function normalizeAlphanumeric(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * Generates a canonical storefront QR URL payload for a product so QR labels/shares
 * resolve seamlessly when scanned by the in-store QR scanner.
 */
export function buildProductQrPayload(product: Pick<Product, 'id'>, origin?: string): string {
  const cleanOrigin = origin && origin.trim() ? origin.trim().replace(/\/+$/, '') : '';
  if (cleanOrigin) {
    return `${cleanOrigin}/?product=${encodeURIComponent(product.id)}`;
  }
  return `onalaa://product/${encodeURIComponent(product.id)}`;
}

/**
 * Extracts a product identifier (Product ID, SKU, Barcode, or search keyword)
 * from raw QR/barcode text encoded in store labels, URLs, JSON payloads, or product stickers.
 */
export function parseProductQrPayload(rawPayload: string): ParsedProductQrPayload | null {
  if (typeof rawPayload !== 'string') return null;
  const rawText = rawPayload.trim();
  if (!rawText) return null;

  // 1. JSON QR payload (e.g. {"productId":"prod-iphone16promax"} or {"sku":"APL-IP16PM-256"})
  if (rawText.startsWith('{') && rawText.endsWith('}')) {
    try {
      const parsed = JSON.parse(rawText) as Record<string, unknown>;
      const keyMap: Array<[string, ParsedProductQrPayload['detectedField']]> = [
        ['productId', 'product_id'],
        ['product_id', 'product_id'],
        ['id', 'product_id'],
        ['sku', 'sku'],
        ['barcode', 'barcode'],
        ['ean', 'barcode'],
        ['upc', 'barcode'],
        ['code', 'sku'],
        ['q', 'query'],
      ];
      for (const [key, field] of keyMap) {
        const val = parsed[key];
        if (typeof val === 'string' && val.trim()) {
          const cleanVal = val.trim();
          return {
            lookupValue: cleanVal,
            detectedField: /^prod-/i.test(cleanVal) ? 'product_id' : field,
            rawText,
          };
        }
      }
    } catch {
      // Fall through to URL/text parsing
    }
  }

  // 2. Storefront or manufacturer URL (e.g. https://site/?product=prod-..., #/product/prod-..., onalaa://product/prod-...)
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(rawText) || rawText.startsWith('/')) {
    try {
      const normalizedUrlInput = rawText.startsWith('/') ? `https://store.local${rawText}` : rawText;
      const url = new URL(normalizedUrlInput);
      const paramSources = [url.searchParams];

      const hashQueryIndex = url.hash.indexOf('?');
      if (hashQueryIndex >= 0) {
        paramSources.push(new URLSearchParams(url.hash.slice(hashQueryIndex + 1)));
      }

      for (const params of paramSources) {
        for (const key of URL_PRODUCT_PARAM_KEYS) {
          const val = params.get(key);
          if (val && val.trim()) {
            const cleanVal = decodeURIComponent(val.trim());
            const detectedField: ParsedProductQrPayload['detectedField'] =
              key === 'barcode' || key === 'ean' || key === 'upc'
                ? 'barcode'
                : key === 'sku' || key === 'code'
                ? 'sku'
                : key === 'product' || key === 'productId' || /^prod-/i.test(cleanVal)
                ? 'product_id'
                : 'query';
            return {
              lookupValue: cleanVal,
              detectedField,
              rawText,
            };
          }
        }
      }

      // Check path segments (e.g. /product/prod-iphone16promax or #/product/prod-iphone16promax)
      const combinedPath = `${url.pathname} ${url.hash}`;
      const prodIdMatch = combinedPath.match(PRODUCT_ID_REGEX);
      if (prodIdMatch) {
        return {
          lookupValue: prodIdMatch[1],
          detectedField: 'product_id',
          rawText,
        };
      }

      const pathProductMatch = combinedPath.match(/\/product\/([a-zA-Z0-9._-]{2,80})/i);
      if (pathProductMatch && pathProductMatch[1]) {
        const token = decodeURIComponent(pathProductMatch[1]);
        return {
          lookupValue: token,
          detectedField: /^prod-/i.test(token) ? 'product_id' : 'sku',
          rawText,
        };
      }
    } catch {
      // Fall through to generic pattern extraction
    }
  }

  // 3. Explicit prod-* identifier embedded anywhere in raw payload
  const prodMatch = rawText.match(PRODUCT_ID_REGEX);
  if (prodMatch) {
    return {
      lookupValue: prodMatch[1],
      detectedField: 'product_id',
      rawText,
    };
  }

  // 4. Key-value sticker format (e.g. "SKU: APL-IP16PM-256\nModel: iPhone 16 Pro Max")
  const labeledMatch = rawText.match(LABELED_PRODUCT_TOKEN_REGEX);
  if (labeledMatch && labeledMatch[1]) {
    const token = labeledMatch[1].trim();
    const detectedField: ParsedProductQrPayload['detectedField'] = /^\d{8,18}$/.test(token)
      ? 'barcode'
      : /^prod-/i.test(token)
      ? 'product_id'
      : 'sku';
    return {
      lookupValue: token,
      detectedField,
      rawText,
    };
  }

  // 5. Plain barcode / SKU / keyword
  const firstLine = rawText.split(/[\r\n]+/)[0].trim().replace(/^#+/, '');
  if (!firstLine) return null;

  const detectedField: ParsedProductQrPayload['detectedField'] = /^\d{8,18}$/.test(firstLine)
    ? 'barcode'
    : /^[A-Z0-9]+(?:-[A-Z0-9]+)+$/i.test(firstLine)
    ? 'sku'
    : 'query';

  return {
    lookupValue: firstLine,
    detectedField,
    rawText,
  };
}

/**
 * Resolves scanned QR / barcode text against the store's product catalog in strict priority order:
 * 1. Exact Product ID
 * 2. Exact Product SKU or Variant SKU
 * 3. Exact Product Barcode
 * 4. Normalized alphanumeric SKU/ID/Barcode match
 * 5. Exact/unique SKU or model substring fallback (minimum 4 chars)
 */
export function findProductByQrPayload(
  rawPayload: string,
  products: Product[],
  options?: { includeUnpublished?: boolean }
): ProductQrLookupResult {
  const parsed = parseProductQrPayload(rawPayload);
  if (!parsed || !Array.isArray(products) || products.length === 0) {
    return { matchedProduct: null, parsed };
  }

  const publishedPool = options?.includeUnpublished
    ? products
    : products.filter((p) => p.isPublished !== false);
  const searchPool = publishedPool.length > 0 ? publishedPool : products;

  const needleLower = normalizeToken(parsed.lookupValue);
  const needleAlpha = normalizeAlphanumeric(parsed.lookupValue);

  if (!needleLower) {
    return { matchedProduct: null, parsed };
  }

  // 1. Exact Product ID match
  const byId = searchPool.find((p) => normalizeToken(p.id) === needleLower);
  if (byId) {
    return { matchedProduct: byId, parsed, matchReason: 'product_id' };
  }

  // 2. Exact SKU or Variant SKU match
  const bySku = searchPool.find((p) => p.sku && normalizeToken(p.sku) === needleLower);
  if (bySku) {
    return { matchedProduct: bySku, parsed, matchReason: 'sku' };
  }

  const byVariantSku = searchPool.find(
    (p) => Array.isArray(p.variants) && p.variants.some((v) => v.sku && normalizeToken(v.sku) === needleLower)
  );
  if (byVariantSku) {
    return { matchedProduct: byVariantSku, parsed, matchReason: 'variant_sku' };
  }

  // 3. Exact Barcode match
  const byBarcode = searchPool.find((p) => p.barcode && normalizeToken(p.barcode) === needleLower);
  if (byBarcode) {
    return { matchedProduct: byBarcode, parsed, matchReason: 'barcode' };
  }

  // 4. Alphanumeric normalized match (ignoring dashes/spaces)
  if (needleAlpha.length >= 4) {
    const byAlpha = searchPool.find((p) => {
      if (normalizeAlphanumeric(p.id) === needleAlpha) return true;
      if (p.sku && normalizeAlphanumeric(p.sku) === needleAlpha) return true;
      if (p.barcode && normalizeAlphanumeric(p.barcode) === needleAlpha) return true;
      return (
        Array.isArray(p.variants) &&
        p.variants.some((v) => v.sku && normalizeAlphanumeric(v.sku) === needleAlpha)
      );
    });

    if (byAlpha) {
      return {
        matchedProduct: byAlpha,
        parsed,
        matchReason: byAlpha.barcode && normalizeAlphanumeric(byAlpha.barcode) === needleAlpha ? 'barcode' : 'sku',
      };
    }

    // 5. Fallback partial model / SKU / name token match
    const partialMatches = searchPool.filter((p) => {
      const haystack = `${p.id} ${p.sku} ${p.barcode || ''} ${p.name} ${p.nameAr || ''}`.toLowerCase();
      return haystack.includes(needleLower);
    });

    if (partialMatches.length === 1) {
      return { matchedProduct: partialMatches[0], parsed, matchReason: 'fuzzy_sku_or_name' };
    }
  }

  return { matchedProduct: null, parsed };
}
