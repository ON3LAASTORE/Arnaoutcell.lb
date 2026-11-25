export interface NewsletterSubscriberPayload {
  id: string;
  email: string;
  subscribedAt: string;
  lang: 'en' | 'ar';
  source: string;
}

export function normalizeEmail(email: string): string {
  if (!email || typeof email !== 'string') return '';
  return email.trim().toLowerCase();
}

export interface NewsletterValidationResult {
  valid: boolean;
  normalizedEmail: string;
  errorEn?: string;
  errorAr?: string;
}

export function isValidEmailFormat(email: string): boolean {
  if (!email || typeof email !== 'string') return false;
  const trimmed = email.trim();
  if (trimmed.length < 3 || trimmed.length > 128) return false;
  if (trimmed.includes('..') || /\s/.test(trimmed)) return false;

  const atIndex = trimmed.indexOf('@');
  if (atIndex <= 0 || atIndex !== trimmed.lastIndexOf('@')) return false;

  const localPart = trimmed.slice(0, atIndex);
  const domainPart = trimmed.slice(atIndex + 1);

  if (localPart.startsWith('.') || localPart.endsWith('.')) return false;
  if (domainPart.startsWith('.') || domainPart.endsWith('.') || domainPart.startsWith('-') || domainPart.endsWith('-')) {
    return false;
  }

  // Standard RFC-compatible email pattern with at least 2-char TLD
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*\.[a-zA-Z]{2,}$/;
  return emailRegex.test(trimmed);
}

export function validateNewsletterEmail(email: string): NewsletterValidationResult {
  const normalizedEmail = normalizeEmail(email);

  if (!normalizedEmail) {
    return {
      valid: false,
      normalizedEmail,
      errorEn: 'Please enter your email address.',
      errorAr: 'يرجى إدخال بريدك الإلكتروني.',
    };
  }

  if (!isValidEmailFormat(normalizedEmail)) {
    return {
      valid: false,
      normalizedEmail,
      errorEn: 'Please enter a valid email address (e.g. name@domain.com).',
      errorAr: 'يرجى إدخال بريد إلكتروني صحيح (مثال: name@domain.com).',
    };
  }

  return {
    valid: true,
    normalizedEmail,
  };
}

export function sanitizeSubscriberId(email: string): string {
  const sanitized = normalizeEmail(email).replace(/[^a-zA-Z0-9_-]/g, '_');
  return sanitized.slice(0, 128);
}

export function buildSubscriberPayload(
  email: string,
  lang: 'en' | 'ar' = 'en',
  source: string = 'footer',
  subscribedAt: string = new Date().toISOString()
): NewsletterSubscriberPayload {
  const cleanEmail = normalizeEmail(email).slice(0, 128);
  const safeLang: 'en' | 'ar' = lang === 'ar' ? 'ar' : 'en';
  const cleanSource = (typeof source === 'string' && source.trim() ? source.trim() : 'footer').slice(0, 64);
  const cleanTimestamp = (typeof subscribedAt === 'string' && subscribedAt.trim() ? subscribedAt.trim() : new Date().toISOString()).slice(0, 64);

  return {
    id: sanitizeSubscriberId(cleanEmail),
    email: cleanEmail,
    subscribedAt: cleanTimestamp,
    lang: safeLang,
    source: cleanSource,
  };
}

export function formatNewsletterWelcome(
  email: string,
  lang: 'en' | 'ar'
): { title: string; subtitle: string } {
  const cleanEmail = normalizeEmail(email);
  if (lang === 'ar') {
    return {
      title: 'تم تأكيد اشتراكك في نشرة ON ALAA STORE',
      subtitle: `تم تسجيل بريدك الإلكتروني (${cleanEmail}) بنجاح. ستصلك عروض التقنية والتخفيضات الحصرية فور توفرها.`,
    };
  }
  return {
    title: 'Welcome to ON ALAA STORE Updates',
    subtitle: `Your email (${cleanEmail}) is registered for marketing updates, flash discounts, and 2027 tech drops.`,
  };
}
