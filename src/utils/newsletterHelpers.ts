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

export function isValidEmailFormat(email: string): boolean {
  if (!email || typeof email !== 'string') return false;
  const trimmed = email.trim();
  // Standard RFC 5322 compatible email pattern
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)+$/;
  return emailRegex.test(trimmed) && trimmed.length >= 3 && trimmed.length <= 128;
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
      title: 'تم تأكيد اشتراكك في نشرة ON AlAA STORE',
      subtitle: `تم تسجيل بريدك الإلكتروني (${cleanEmail}) بنجاح. ستصلك عروض التقنية والتخفيضات الحصرية فور توفرها.`,
    };
  }
  return {
    title: 'Welcome to ON AlAA STORE Updates',
    subtitle: `Your email (${cleanEmail}) is registered for marketing updates, flash discounts, and 2027 tech drops.`,
  };
}
