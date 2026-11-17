export interface FooterPhoneItem {
  display: string;
  telHref: string;
}

export interface FooterLocationItem {
  text: string;
}

export interface FooterPolicyLink {
  id: string;
  label: string;
  targetView: string;
}

export interface FooterOpeningHourRow {
  dayLabel: string;
  hoursLabel: string;
  isSpecial?: boolean;
}

export const FOOTER_HOTLINE_DISPLAY = '+961 70 773 067';

export function getFooterPhones(): FooterPhoneItem[] {
  return [
    {
      display: FOOTER_HOTLINE_DISPLAY,
      telHref: 'tel:+96170773067',
    },
  ];
}

export function getFooterLocations(lang: 'en' | 'ar'): FooterLocationItem[] {
  if (lang === 'ar') {
    return [
      { text: 'الشوف، لبنان' },
      { text: 'توصيل سريع لجميع مناطق لبنان (بيروت، جبل لبنان، الشمال والجنوب)' },
    ];
  }

  return [
    { text: 'Chouf, Lebanon' },
    { text: 'All Lebanon Delivery — Beirut, Mount Lebanon, North & South' },
  ];
}

export function getFooterPolicyLinks(lang: 'en' | 'ar'): FooterPolicyLink[] {
  if (lang === 'ar') {
    return [
      { id: 'about', label: 'من نحن', targetView: 'services' },
      { id: 'contact', label: 'اتصل بنا', targetView: 'contact' },
      { id: 'terms', label: 'الشروط والأحكام', targetView: 'policy-terms' },
      { id: 'privacy', label: 'سياسة الخصوصية', targetView: 'policy-privacy' },
      { id: 'returns', label: 'سياسة الاسترجاع والاسترداد', targetView: 'policy-returns' },
      { id: 'shipping', label: 'سياسة الشحن والتوصيل', targetView: 'policy-delivery' },
    ];
  }

  return [
    { id: 'about', label: 'About Us', targetView: 'services' },
    { id: 'contact', label: 'Contact us', targetView: 'contact' },
    { id: 'terms', label: 'Terms and Conditions', targetView: 'policy-terms' },
    { id: 'privacy', label: 'Privacy Policy', targetView: 'policy-privacy' },
    { id: 'returns', label: 'Return & Refund Policy', targetView: 'policy-returns' },
    { id: 'shipping', label: 'Shipping Policy', targetView: 'policy-delivery' },
  ];
}

export function getFooterOpeningHours(lang: 'en' | 'ar'): FooterOpeningHourRow[] {
  if (lang === 'ar') {
    return [
      { dayLabel: 'الإثنين - الجمعة', hoursLabel: '09:30 - 19:00' },
      { dayLabel: 'السبت', hoursLabel: '09:30 - 18:00' },
      { dayLabel: 'الأحد', hoursLabel: 'مفتوح — حصرياً في أيام العطل', isSpecial: true },
    ];
  }

  return [
    { dayLabel: 'Mon - Fri', hoursLabel: '09:30 - 19:00' },
    { dayLabel: 'Sat', hoursLabel: '09:30 - 18:00' },
    { dayLabel: 'Sun', hoursLabel: 'Opened - Exclusively on Holidays', isSpecial: true },
  ];
}
