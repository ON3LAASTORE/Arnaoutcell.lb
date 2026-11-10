/**
 * Pure helper functions for Customer Reviews and Store Feedback
 */

export interface ReviewSubmissionPayload {
  name: string;
  rating: number; // 1 to 5
  comment: string;
  location?: string;
  productPurchased?: string;
}

export interface ReviewValidationResult {
  isValid: boolean;
  errors: {
    name?: string;
    rating?: string;
    comment?: string;
  };
}

/**
 * Validates review and feedback submissions
 */
export function validateReviewSubmission(
  payload: ReviewSubmissionPayload,
  lang: 'en' | 'ar' = 'en'
): ReviewValidationResult {
  const isArabic = lang === 'ar';
  const errors: { name?: string; rating?: string; comment?: string } = {};

  const trimmedName = (payload.name || '').trim();
  const trimmedComment = (payload.comment || '').trim();
  const rating = Number(payload.rating);

  if (!trimmedName || trimmedName.length < 2) {
    errors.name = isArabic
      ? 'يرجى إدخال اسم صحيح (حرفين على الأقل)'
      : 'Please enter a valid name (at least 2 characters)';
  } else if (trimmedName.length > 80) {
    errors.name = isArabic
      ? 'الاسم طويل جداً (أقصى حد 80 حرف)'
      : 'Name is too long (max 80 characters)';
  }

  if (isNaN(rating) || rating < 1 || rating > 5) {
    errors.rating = isArabic
      ? 'يرجى تحديد تقييم بين 1 و 5 نجوم'
      : 'Please select a rating between 1 and 5 stars';
  }

  if (!trimmedComment || trimmedComment.length < 5) {
    errors.comment = isArabic
      ? 'يرجى كتابة رأيك أو تفاصيل تجربتك (5 أحرف على الأقل)'
      : 'Please write your review or feedback (at least 5 characters)';
  } else if (trimmedComment.length > 1000) {
    errors.comment = isArabic
      ? 'النص طويل جداً (أقصى حد 1000 حرف)'
      : 'Review text is too long (max 1000 characters)';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Computes the updated product rating when a new review is submitted
 */
export function calculateNewRating(
  currentRating: number,
  currentCount: number,
  newReviewRating: number
): number {
  if (currentCount <= 0 || !currentRating) {
    return Math.min(5, Math.max(1, Number(newReviewRating.toFixed(1))));
  }
  const totalScore = currentRating * currentCount + newReviewRating;
  const newCount = currentCount + 1;
  const calculated = totalScore / newCount;
  return Number(calculated.toFixed(1));
}

/**
 * Generates customer avatar initials and vibrant gradient color
 */
export function generateAvatarProps(name: string): { initials: string; color: string } {
  const clean = (name || '').trim();
  if (!clean) {
    return { initials: 'CS', color: 'from-blue-500 to-indigo-600' };
  }

  const parts = clean.split(/\s+/).filter(Boolean);
  let initials = '';
  if (parts.length >= 2) {
    initials = (parts[0][0] + parts[1][0]).toUpperCase();
  } else if (parts[0].length >= 2) {
    initials = parts[0].substring(0, 2).toUpperCase();
  } else {
    initials = parts[0][0].toUpperCase();
  }

  const gradientPairs = [
    'from-purple-500 to-indigo-600',
    'from-blue-500 to-cyan-600',
    'from-emerald-500 to-teal-600',
    'from-pink-500 to-rose-600',
    'from-amber-500 to-orange-600',
    'from-violet-500 to-purple-600',
    'from-teal-500 to-emerald-600',
    'from-sky-500 to-blue-600',
  ];

  let hash = 0;
  for (let i = 0; i < clean.length; i++) {
    hash = (hash << 5) - hash + clean.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % gradientPairs.length;

  return {
    initials,
    color: gradientPairs[index],
  };
}
