/**
 * Helper utilities and types for the Customer Testimonial Slider
 */

export interface Testimonial {
  id: string;
  name: string;
  nameAr?: string;
  locationEn: string;
  locationAr: string;
  rating: number; // 1-5
  productPurchasedEn: string;
  productPurchasedAr: string;
  reviewEn: string;
  reviewAr: string;
  date: string;
  verified: boolean;
  avatarInitials: string;
  avatarColor: string;
}

/**
 * Calculates the next slide index given current index, total slides, and cards per view
 */
export function getNextSlideIndex(currentIndex: number, totalSlides: number): number {
  if (totalSlides <= 0) return 0;
  return (currentIndex + 1) % totalSlides;
}

/**
 * Calculates the previous slide index with wrap-around
 */
export function getPrevSlideIndex(currentIndex: number, totalSlides: number): number {
  if (totalSlides <= 0) return 0;
  return (currentIndex - 1 + totalSlides) % totalSlides;
}

/**
 * Determines responsive cards per view
 */
export function getCardsPerView(windowWidth: number): number {
  if (windowWidth < 640) return 1;
  if (windowWidth < 1024) return 2;
  return 3;
}

/**
 * Computes the total number of pagination pages given total items and cards per view
 */
export function getTotalPages(totalItems: number, cardsPerView: number): number {
  if (totalItems <= 0 || cardsPerView <= 0) return 1;
  return Math.ceil(totalItems / cardsPerView);
}

/**
 * Computes aggregate review rating average
 */
export function calculateAverageRating(testimonials: { rating: number }[]): number {
  if (!testimonials || testimonials.length === 0) return 5.0;
  const sum = testimonials.reduce((acc, t) => acc + t.rating, 0);
  return Number((sum / testimonials.length).toFixed(1));
}
