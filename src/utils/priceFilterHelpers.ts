export interface BudgetTier {
  id: string;
  min: number;
  max: number | null; // null for no upper bound
  labelEn: string;
  labelAr: string;
}

export const BUDGET_TIERS: BudgetTier[] = [
  { id: 'under-50', min: 0, max: 50, labelEn: 'Under $50', labelAr: 'أقل من $50' },
  { id: '50-150', min: 50, max: 150, labelEn: '$50 – $150', labelAr: '$50 – $150' },
  { id: '150-400', min: 150, max: 400, labelEn: '$150 – $400', labelAr: '$150 – $400' },
  { id: '400-800', min: 400, max: 800, labelEn: '$400 – $800', labelAr: '$400 – $800' },
  { id: '800-1500', min: 800, max: 1500, labelEn: '$800 – $1,500', labelAr: '$800 – $1,500' },
  { id: '1500-plus', min: 1500, max: null, labelEn: '$1,500 & Above', labelAr: '$1,500 فما فوق' },
];

/**
 * Checks whether a given price fits inside the active budget tiers and min/max range.
 */
export function matchesPriceFilter(
  price: number,
  minPrice: number,
  maxPrice: number,
  selectedTierIds: string[] = []
): boolean {
  if (price < minPrice || price > maxPrice) {
    return false;
  }

  // If specific budget checkboxes are selected, price must match at least one selected tier
  if (selectedTierIds.length > 0) {
    const activeTiers = BUDGET_TIERS.filter((t) => selectedTierIds.includes(t.id));
    const inAnyTier = activeTiers.some((tier) => {
      if (tier.max === null) {
        return price >= tier.min;
      }
      return price >= tier.min && price <= tier.max;
    });
    if (!inAnyTier) {
      return false;
    }
  }

  return true;
}

/**
 * Counts the number of products that fall into each budget tier.
 */
export function countProductsPerTier(
  products: Array<{ price: number; isPublished?: boolean }>
): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const tier of BUDGET_TIERS) {
    counts[tier.id] = 0;
  }

  for (const p of products) {
    if (p.isPublished === false) continue;
    const price = p.price;
    for (const tier of BUDGET_TIERS) {
      if (tier.max === null) {
        if (price >= tier.min) counts[tier.id]++;
      } else {
        if (price >= tier.min && price <= tier.max) counts[tier.id]++;
      }
    }
  }

  return counts;
}
