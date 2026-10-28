import { db } from '../firebase';
import { doc, setDoc } from 'firebase/firestore';
import { isValidEmailFormat, sanitizeSubscriberId } from '../utils/newsletterHelpers';

export { isValidEmailFormat, sanitizeSubscriberId } from '../utils/newsletterHelpers';

const STORAGE_KEY = 'arnaout_newsletter_subscribers';

export interface NewsletterSubscriptionResult {
  success: boolean;
  messageEn: string;
  messageAr: string;
  alreadySubscribed?: boolean;
}

export function getLocalSubscribers(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export async function subscribeToNewsletter(
  email: string,
  lang: 'en' | 'ar' = 'en',
  source: string = 'footer'
): Promise<NewsletterSubscriptionResult> {
  const cleanEmail = email.trim().toLowerCase();

  if (!isValidEmailFormat(cleanEmail)) {
    return {
      success: false,
      messageEn: 'Please enter a valid email address (e.g. name@domain.com).',
      messageAr: 'يرجى إدخال بريد إلكتروني صحيح (مثال: name@domain.com).',
    };
  }

  // Check local cache for duplicates
  const existingSubscribers = getLocalSubscribers();
  if (existingSubscribers.includes(cleanEmail)) {
    return {
      success: true,
      alreadySubscribed: true,
      messageEn: "You are already subscribed to ARNAOUT STORE VIP updates! Thank you.",
      messageAr: 'أنت مشترك بالفعل في نشرة أرناؤوط ستور الإخبارية! شكراً لولائك.',
    };
  }

  // Save to local cache
  try {
    const updated = [...existingSubscribers, cleanEmail];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch {
    // Non-critical local storage fallback
  }

  const subscriberId = sanitizeSubscriberId(cleanEmail);
  const subscriberData = {
    id: subscriberId,
    email: cleanEmail,
    subscribedAt: new Date().toISOString(),
    lang,
    source,
  };

  // Sync to Firestore in background
  if (typeof window !== 'undefined') {
    try {
      await setDoc(doc(db, 'newsletter_subscribers', subscriberId), subscriberData);
    } catch (err) {
      console.warn('Firestore newsletter subscription sync:', err);
    }
  }

  return {
    success: true,
    alreadySubscribed: false,
    messageEn: '🎉 Welcome to ARNAOUT STORE VIP Club! Check your inbox for exclusive deals and fresh tech drops.',
    messageAr: '🎉 أهلاً بك في نادي أرناؤوط ستور VIP! ستصلك أقوى العروض والتخفيضات الحصرية على بريدك.',
  };
}
