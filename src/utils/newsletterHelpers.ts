export function isValidEmailFormat(email: string): boolean {
  if (!email || typeof email !== 'string') return false;
  const trimmed = email.trim();
  // Standard RFC 5322 compatible email pattern
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)+$/;
  return emailRegex.test(trimmed) && trimmed.length <= 128;
}

export function sanitizeSubscriberId(email: string): string {
  return email.trim().toLowerCase().replace(/[^a-zA-Z0-9_-]/g, '_');
}

export function formatNewsletterWelcome(
  email: string,
  lang: 'en' | 'ar'
): { title: string; subtitle: string } {
  if (lang === 'ar') {
    return {
      title: '🎉 شكراً لاشتراكك في نادي أرناؤوط ستور VIP!',
      subtitle: `تم تسجيل بريدك الإلكتروني (${email}) بنجاح. ستصلك عروضنا وأحدث الأجهزة فور توفرها.`,
    };
  }
  return {
    title: '🎉 Welcome to ARNAOUT STORE VIP Club!',
    subtitle: `Your email (${email}) is registered. Watch your inbox for exclusive deals, flash discounts, and 2027 tech drops.`,
  };
}
