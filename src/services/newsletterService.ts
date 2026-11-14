import { doc, setDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import {
  buildSubscriberPayload,
  isValidEmailFormat,
  normalizeEmail,
} from '../utils/newsletterHelpers';

export {
  buildSubscriberPayload,
  isValidEmailFormat,
  normalizeEmail,
  sanitizeSubscriberId,
} from '../utils/newsletterHelpers';

const STORAGE_KEY = 'arnaout_newsletter_subscribers';

export interface NewsletterSubscriptionResult {
  success: boolean;
  messageEn: string;
  messageAr: string;
  alreadySubscribed?: boolean;
  email?: string;
}

export function getLocalSubscribers(): string[] {
  try {
    if (typeof window === 'undefined') return [];
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === 'string')
      : [];
  } catch {
    return [];
  }
}

export async function subscribeToNewsletter(
  email: string,
  lang: 'en' | 'ar' = 'en',
  source: string = 'footer'
): Promise<NewsletterSubscriptionResult> {
  const cleanEmail = normalizeEmail(email);

  if (!isValidEmailFormat(cleanEmail)) {
    return {
      success: false,
      messageEn: 'Please enter a valid email address (e.g. name@domain.com).',
      messageAr: 'يرجى إدخال بريد إلكتروني صحيح (مثال: name@domain.com).',
    };
  }

  const existingSubscribers = getLocalSubscribers();
  if (existingSubscribers.includes(cleanEmail)) {
    return {
      success: true,
      alreadySubscribed: true,
      email: cleanEmail,
      messageEn: `You are already subscribed with ${cleanEmail} for ON AlAA STORE marketing updates and special tech deals.`,
      messageAr: `البريد الإلكتروني ${cleanEmail} مشترك بالفعل في نشرة ON AlAA STORE للعروض والتحديثات الحصرية.`,
    };
  }

  const subscriberData = buildSubscriberPayload(cleanEmail, lang, source);

  if (typeof window !== 'undefined') {
    try {
      await setDoc(doc(db, 'newsletter_subscribers', subscriberData.id), subscriberData);
    } catch (err) {
      const msg = err instanceof Error ? err.message.toLowerCase() : String(err).toLowerCase();
      if (msg.includes('permission') || msg.includes('missing or insufficient permissions')) {
        handleFirestoreError(err, OperationType.WRITE, `newsletter_subscribers/${subscriberData.id}`);
      }
      console.warn('Firestore newsletter subscription sync deferred:', err);
    }
  }

  try {
    const updated = [...existingSubscribers, cleanEmail];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch {
    // Non-critical local storage fallback
  }

  return {
    success: true,
    alreadySubscribed: false,
    email: cleanEmail,
    messageEn: `Subscribed ${cleanEmail}. Watch your inbox for marketing updates, flash discounts, and special tech deals.`,
    messageAr: `تم تسجيل ${cleanEmail} بنجاح. ستصلك أحدث العروض التقنية والتخفيضات الحصرية عبر البريد الإلكتروني.`,
  };
}
