export interface SortableProduct {
  id: string;
  price: number;
  rating: number;
  reviewCount?: number;
  discountPercentage?: number;
  createdAt?: string;
  isNewArrival?: boolean;
}

export type SortKey = 'recommended' | 'price_asc' | 'price_desc' | 'newest' | 'discount';

export function sortProducts<T extends SortableProduct>(products: T[], sortOption: SortKey | string): T[] {
  return [...products].sort((a, b) => {
    // 1. Price: Low to High
    if (sortOption === 'price_asc') {
      return a.price - b.price;
    }
    // 2. Price: High to Low
    if (sortOption === 'price_desc') {
      return b.price - a.price;
    }
    // 3. Biggest Discount
    if (sortOption === 'discount') {
      return (b.discountPercentage || 0) - (a.discountPercentage || 0);
    }
    // 4. Newest Arrivals
    if (sortOption === 'newest') {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      if (dateB !== dateA) return dateB - dateA;
      if (b.isNewArrival && !a.isNewArrival) return 1;
      if (!b.isNewArrival && a.isNewArrival) return -1;
      return b.id.localeCompare(a.id);
    }
    // 5. Recommended (Rating & reviews)
    const ratingDiff = b.rating - a.rating;
    if (ratingDiff !== 0) return ratingDiff;
    return (b.reviewCount || 0) - (a.reviewCount || 0);
  });
}
