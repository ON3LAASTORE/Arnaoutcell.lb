import type { Language, Product } from '../types/index.ts';

export const MAX_COMPARE_LIMIT = 3;

export interface CompareValidationResult {
  canAdd: boolean;
  reason?: 'already_exists' | 'limit_reached' | 'valid';
  messageEn?: string;
  messageAr?: string;
}

export interface PriceComparisonSummary {
  priceA: number;
  priceB: number;
  originalPriceA: number;
  originalPriceB: number;
  savingsA: number;
  savingsB: number;
  discountPctA: number;
  discountPctB: number;
  absoluteDifferenceUsd: number;
  signedDifferenceAtoB: number;
  percentDifferenceFromHigher: number;
  percentDifferenceFromLower: number;
  cheaperProductId: 'tie' | string;
  higherDiscountProductId: 'tie' | string;
  higherRatedProductId: 'tie' | string;
  longerWarrantyProductId: 'tie' | string;
}

export interface ComparisonMatrixRow {
  key: string;
  label: string;
  values: string[];
  isDifferent: boolean;
  isNumericPrice?: boolean;
}

/**
 * Validates if a product can be added to the comparison list
 */
export function validateAddToCompare(
  currentList: Product[],
  product: Product,
  maxLimit: number = MAX_COMPARE_LIMIT
): CompareValidationResult {
  if (currentList.some((p) => p.id === product.id)) {
    return {
      canAdd: false,
      reason: 'already_exists',
      messageEn: 'Product is already in the comparison list.',
      messageAr: 'المنتج مضاف بالفعل إلى قائمة المقارنة.',
    };
  }

  if (currentList.length >= maxLimit) {
    return {
      canAdd: false,
      reason: 'limit_reached',
      messageEn: `You can compare up to ${maxLimit} products at a time.`,
      messageAr: `يمكنك مقارنة حتى ${maxLimit} منتجات كحد أقصى في وقت واحد.`,
    };
  }

  return {
    canAdd: true,
    reason: 'valid',
  };
}

/**
 * Toggles a product in the comparison list
 */
export function toggleCompareList(
  currentList: Product[],
  product: Product,
  maxLimit: number = MAX_COMPARE_LIMIT
): { updatedList: Product[]; added: boolean; error?: string } {
  const exists = currentList.some((p) => p.id === product.id);

  if (exists) {
    return {
      updatedList: currentList.filter((p) => p.id !== product.id),
      added: false,
    };
  }

  if (currentList.length >= maxLimit) {
    return {
      updatedList: currentList,
      added: false,
      error: `Maximum ${maxLimit} items can be compared.`,
    };
  }

  return {
    updatedList: [...currentList, product],
    added: true,
  };
}

/**
 * Assigns a product to slot 0 (left) or slot 1 (right) without creating duplicate entries.
 * If the chosen product is already in the opposite slot, swaps positions cleanly.
 */
export function assignCompareSlot(
  currentList: Product[],
  slotIndex: 0 | 1,
  product: Product
): Product[] {
  const existingIndex = currentList.findIndex((p) => p.id === product.id);
  const next = [...currentList];

  if (slotIndex === 0) {
    if (next.length === 0) return [product];
    if (existingIndex === 0) return next;
    if (existingIndex === 1) {
      return [next[1], next[0], ...next.slice(2)];
    }
    if (existingIndex > 1) {
      const displaced = next[0];
      next[0] = product;
      next[existingIndex] = displaced;
      return next;
    }
    next[0] = product;
    return next;
  }

  // slotIndex === 1
  if (next.length === 0) {
    return [product];
  }
  if (next.length === 1) {
    if (existingIndex === 0) return next;
    return [next[0], product];
  }
  if (existingIndex === 1) return next;
  if (existingIndex === 0) {
    return [next[1], next[0], ...next.slice(2)];
  }
  if (existingIndex > 1) {
    const displaced = next[1];
    next[1] = product;
    next[existingIndex] = displaced;
    return next;
  }
  next[1] = product;
  return next;
}

/**
 * Swaps the first two compared products cleanly.
 */
export function swapComparePair(currentList: Product[]): Product[] {
  if (currentList.length < 2) return currentList;
  return [currentList[1], currentList[0], ...currentList.slice(2)];
}

/**
 * Computes exact cash price, discount, rating, and warranty differences between two products.
 */
export function computePriceComparison(
  productA: Product,
  productB: Product
): PriceComparisonSummary {
  const priceA = Math.max(0, Number(productA.price) || 0);
  const priceB = Math.max(0, Number(productB.price) || 0);
  const originalPriceA = Math.max(priceA, Number(productA.originalPrice) || priceA);
  const originalPriceB = Math.max(priceB, Number(productB.originalPrice) || priceB);

  const savingsA = Math.round(Math.max(0, originalPriceA - priceA) * 100) / 100;
  const savingsB = Math.round(Math.max(0, originalPriceB - priceB) * 100) / 100;

  const discountPctA =
    typeof productA.discountPercentage === 'number'
      ? Math.max(0, Math.round(productA.discountPercentage))
      : originalPriceA > priceA && originalPriceA > 0
      ? Math.round(((originalPriceA - priceA) / originalPriceA) * 100)
      : 0;

  const discountPctB =
    typeof productB.discountPercentage === 'number'
      ? Math.max(0, Math.round(productB.discountPercentage))
      : originalPriceB > priceB && originalPriceB > 0
      ? Math.round(((originalPriceB - priceB) / originalPriceB) * 100)
      : 0;

  const absoluteDifferenceUsd = Math.round(Math.abs(priceA - priceB) * 100) / 100;
  const signedDifferenceAtoB = Math.round((priceA - priceB) * 100) / 100;

  const higher = Math.max(priceA, priceB);
  const lower = Math.min(priceA, priceB);

  const percentDifferenceFromHigher =
    higher > 0 ? Math.round((absoluteDifferenceUsd / higher) * 1000) / 10 : 0;
  const percentDifferenceFromLower =
    lower > 0 ? Math.round((absoluteDifferenceUsd / lower) * 1000) / 10 : 0;

  const cheaperProductId =
    priceA < priceB ? productA.id : priceB < priceA ? productB.id : 'tie';

  const higherDiscountProductId =
    discountPctA > discountPctB
      ? productA.id
      : discountPctB > discountPctA
      ? productB.id
      : 'tie';

  const ratingA = Number(productA.rating) || 0;
  const ratingB = Number(productB.rating) || 0;
  const higherRatedProductId =
    ratingA > ratingB ? productA.id : ratingB > ratingA ? productB.id : 'tie';

  const warrantyA = Number(productA.warrantyMonths) || 0;
  const warrantyB = Number(productB.warrantyMonths) || 0;
  const longerWarrantyProductId =
    warrantyA > warrantyB ? productA.id : warrantyB > warrantyA ? productB.id : 'tie';

  return {
    priceA,
    priceB,
    originalPriceA,
    originalPriceB,
    savingsA,
    savingsB,
    discountPctA,
    discountPctB,
    absoluteDifferenceUsd,
    signedDifferenceAtoB,
    percentDifferenceFromHigher,
    percentDifferenceFromLower,
    cheaperProductId,
    higherDiscountProductId,
    higherRatedProductId,
    longerWarrantyProductId,
  };
}

/**
 * Extracts readable key feature highlights from a product's description and metadata.
 */
export function extractProductFeatureHighlights(
  product: Product,
  lang: Language = 'en'
): string[] {
  const highlights: string[] = [];
  const rawDescription =
    lang === 'ar'
      ? product.descriptionAr || product.description || ''
      : product.description || '';

  const chunks = rawDescription
    .split(/[\n•;|]+|(?<=\.)\s+|،\s*/)
    .map((s) => s.trim().replace(/^[–—-]\s*/, '').replace(/\.$/, ''))
    .filter((s) => s.length >= 8 && s.length <= 140);

  for (const chunk of chunks) {
    if (highlights.length >= 3) break;
    if (!highlights.some((h) => h.toLowerCase() === chunk.toLowerCase())) {
      highlights.push(chunk);
    }
  }

  if (product.isBestSeller && highlights.length < 4) {
    highlights.push(lang === 'ar' ? 'الأكثر مبيعاً في المتجر' : 'Store Best Seller');
  }
  if (product.isNewArrival && highlights.length < 4) {
    highlights.push(lang === 'ar' ? 'إصدار حديث' : 'New Arrival');
  }

  return highlights;
}

function areValuesDistinct(values: string[]): boolean {
  if (values.length < 2) return false;
  const normalized = values.map((v) => v.trim().toLowerCase());
  const first = normalized[0];
  return normalized.some((v) => v !== first);
}

/**
 * Builds normalized feature comparison rows for two or more compared products.
 */
export function buildComparisonFeatureRows(
  products: Product[],
  lang: Language = 'en'
): ComparisonMatrixRow[] {
  const isArabic = lang === 'ar';
  const rows: ComparisonMatrixRow[] = [];

  const brandValues = products.map((p) =>
    p.subcategory ? `${p.brand} · ${p.category} (${p.subcategory})` : `${p.brand} · ${p.category}`
  );
  rows.push({
    key: 'brand_category',
    label: isArabic ? 'العلامة والفئة' : 'Brand & Category',
    values: brandValues,
    isDifferent: areValuesDistinct(brandValues),
  });

  const ratingValues = products.map((p) => {
    const rating = (Number(p.rating) || 0).toFixed(1);
    const reviews = Number(p.reviewCount) || 0;
    return isArabic ? `${rating} / 5 (${reviews} تقييم)` : `${rating} / 5 (${reviews} reviews)`;
  });
  rows.push({
    key: 'rating',
    label: isArabic ? 'تقييم العملاء' : 'Customer Rating',
    values: ratingValues,
    isDifferent: areValuesDistinct(products.map((p) => (Number(p.rating) || 0).toFixed(1))),
  });

  const warrantyValues = products.map((p) => {
    const months = p.warrantyMonths || 0;
    if (months <= 0) return isArabic ? 'بدون كفالة إضافية' : 'Standard Store Check';
    return isArabic ? `${months} شهراً كفالة رسمية` : `${months} Months Official Warranty`;
  });
  rows.push({
    key: 'warranty',
    label: isArabic ? 'الضمان والكفالة' : 'Warranty Coverage',
    values: warrantyValues,
    isDifferent: areValuesDistinct(products.map((p) => String(p.warrantyMonths || 0))),
  });

  const availabilityValues = products.map((p) =>
    p.stock > 0
      ? isArabic
        ? `متوفر (${p.stock} قطع)`
        : `In Stock (${p.stock} units)`
      : isArabic
      ? 'غير متوفر حالياً'
      : 'Out of Stock'
  );
  rows.push({
    key: 'availability',
    label: isArabic ? 'التوفر في المستودع' : 'Stock Availability',
    values: availabilityValues,
    isDifferent: areValuesDistinct(products.map((p) => (p.stock > 0 ? 'in_stock' : 'out_of_stock'))),
  });

  const colorValues = products.map((p) =>
    p.colors && p.colors.length > 0 ? p.colors.join(', ') : isArabic ? 'القياسي' : 'Standard'
  );
  rows.push({
    key: 'colors',
    label: isArabic ? 'خيارات الألوان' : 'Available Colors',
    values: colorValues,
    isDifferent: areValuesDistinct(colorValues),
  });

  const variantValues = products.map((p) =>
    p.variants && p.variants.length > 0
      ? p.variants.map((v) => v.name).join(' · ')
      : '—'
  );
  if (variantValues.some((v) => v !== '—')) {
    rows.push({
      key: 'variants',
      label: isArabic ? 'السعات والنسخ' : 'Configurations / Variants',
      values: variantValues,
      isDifferent: areValuesDistinct(variantValues),
    });
  }

  return rows;
}

/**
 * Extracts a unified list of specification labels from all compared products
 */
export function extractComparisonSpecLabels(products: Product[]): string[] {
  const labelsSet = new Set<string>();

  // Standard tech specs to always prioritize
  const prioritySpecs = [
    'Chipset',
    'Processor',
    'Screen',
    'Display',
    'Camera',
    'Primary System',
    'Selfie Camera',
    'Battery',
    'Charging Power',
    'Fast Charge',
    'Storage',
    'Internal Storage',
    'RAM',
    'Material',
    'Chassis',
    'Craftsmanship',
    'AI Features',
    'Connectivity',
    'Audio',
  ];

  prioritySpecs.forEach((spec) => {
    const isPresent = products.some((p) =>
      p.specifications?.some((s) => s.label.toLowerCase() === spec.toLowerCase())
    );
    if (isPresent) labelsSet.add(spec);
  });

  // Add any additional specs found in products
  products.forEach((p) => {
    p.specifications?.forEach((s) => {
      if (s.label) {
        const existing = Array.from(labelsSet).find(
          (l) => l.toLowerCase() === s.label.toLowerCase()
        );
        if (!existing) {
          labelsSet.add(s.label);
        }
      }
    });
  });

  return Array.from(labelsSet);
}

/**
 * Retrieves the value of a specific specification for a product
 */
export function getProductSpecValue(product: Product, label: string): string {
  if (!product.specifications || product.specifications.length === 0) {
    return '—';
  }

  const spec = product.specifications.find(
    (s) => s.label.toLowerCase() === label.toLowerCase()
  );

  return spec ? spec.value : '—';
}

/**
 * Builds unified specification matrix rows with difference detection and optional filtering.
 */
export function buildComparisonSpecRows(
  products: Product[],
  differencesOnly = false
): ComparisonMatrixRow[] {
  const labels = extractComparisonSpecLabels(products);
  const rows: ComparisonMatrixRow[] = labels.map((label) => {
    const values = products.map((p) => getProductSpecValue(p, label));
    return {
      key: `spec:${label.toLowerCase()}`,
      label,
      values,
      isDifferent: areValuesDistinct(values),
    };
  });

  return differencesOnly ? rows.filter((row) => row.isDifferent) : rows;
}
