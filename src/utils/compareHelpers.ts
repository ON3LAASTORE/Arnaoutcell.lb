import type { Product } from '../types/index.ts';

export const MAX_COMPARE_LIMIT = 3;

export interface CompareValidationResult {
  canAdd: boolean;
  reason?: 'already_exists' | 'limit_reached' | 'valid';
  messageEn?: string;
  messageAr?: string;
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
 * Extracts a unified list of specification labels from all compared products
 */
export function extractComparisonSpecLabels(products: Product[]): string[] {
  const labelsSet = new Set<string>();

  // Standard tech specs to always prioritize
  const prioritySpecs = [
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
    'RAM',
    'Material',
    'Chassis',
    'Craftsmanship',
    'AI Features',
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
        // Find existing case-insensitive match or add new
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
