/**
 * Helper utilities for Store Locator & Delivery Coverage
 * 
 * Target Store:
 * ON AlAA STORE — Online Store based in Chouf, Lebanon
 * Delivery Coverage: Available to All Lebanon
 * Phone / WhatsApp: 03986718 (+961 3 986 718)
 * Schedule: Open 17 hours (8:00 AM – 1:00 AM Daily)
 */

export interface StoreLocationData {
  name: string;
  nameAr: string;
  shortName: string;
  shortNameAr: string;
  addressEn: string;
  addressAr: string;
  cityEn: string;
  cityAr: string;
  landmarkEn: string;
  landmarkAr: string;
  phone: string;
  phoneFormatted: string;
  internationalPhone: string;
  whatsapp: string;
  plusCode: string;
  plusCodeUrl: string;
  operatingDuration: string;
  operatingDurationEn: string;
  operatingDurationAr: string;
  openingHoursEn: string;
  openingHoursAr: string;
  latitude: number;
  longitude: number;
  googleMapsUrl: string;
  googleDirectionsUrl: string;
  appleMapsUrl: string;
}

export const CHOUF_STORE_DATA: StoreLocationData = {
  name: 'ON AlAA STORE — Online Store based in Chouf, Lebanon',
  nameAr: 'متجر ON AlAA — متجر إلكتروني - مقرنا في الشوف، لبنان',
  shortName: 'ON AlAA STORE',
  shortNameAr: 'متجر ON AlAA',
  addressEn: 'Online Store based in Chouf, Mount Lebanon • Delivery Available to All Lebanon',
  addressAr: 'متجر إلكتروني - مقرنا في قضاء الشوف، جبل لبنان • التوصيل متاح لجميع المناطق اللبنانية',
  cityEn: 'Chouf, Mount Lebanon',
  cityAr: 'قضاء الشوف، جبل لبنان',
  landmarkEn: 'Online Hub based in Chouf • Express Delivery to All Lebanon',
  landmarkAr: 'مركز المبيعات الإلكترونية بالشوف • توصيل سريع لكافة الأراضي اللبنانية',
  phone: '03986718',
  phoneFormatted: '03 986 718',
  internationalPhone: '+961 3 986718',
  whatsapp: '9613986718',
  plusCode: 'Chouf, Lebanon',
  plusCodeUrl: 'https://wa.me/9613986718',
  operatingDuration: 'Open Daily (8:00 AM – 1:00 AM)',
  operatingDurationEn: 'Online Orders & Support: 8:00 AM – 1:00 AM Daily',
  operatingDurationAr: 'الطلبات أونلاين والدعم: 8:00 صباحاً – 1:00 بعد منتصف الليل يومياً',
  openingHoursEn: '8:00 AM – 1:00 AM Daily (Online Orders & Lebanon-Wide Delivery)',
  openingHoursAr: '8:00 صباحاً – 1:00 بعد منتصف الليل (طلبات أونلاين وتوصيل لجميع مناطق لبنان)',
  latitude: 33.6967,
  longitude: 35.5817,
  googleMapsUrl: 'https://wa.me/9613986718',
  googleDirectionsUrl: 'https://wa.me/9613986718',
  appleMapsUrl: 'https://wa.me/9613986718',
};

// Aliased for seamless compatibility across existing components
export const SAIDA_STORE_DATA: StoreLocationData = CHOUF_STORE_DATA;

/**
 * Generates Google Maps search URL with encoded query
 */
export function buildGoogleMapsUrl(query: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

/**
 * Generates direct Live Route navigation URL using Plus Code or coordinates
 */
export function buildLiveRouteUrl(destination = 'Chouf, Lebanon'): string {
  return `https://wa.me/9613986718`;
}

/**
 * Generates pre-filled WhatsApp location request / pin URL
 */
export function buildWhatsAppLocationUrl(phone = '9613986718', isArabic = false): string {
  const cleanPhone = phone.replace(/\D/g, '');
  const text = isArabic
    ? 'مرحباً متجر ON AlAA! أود الاستفسار عن خدمة التوصيل لموقعي في لبنان (متجركم الإلكتروني بالشوف).'
    : 'Hello ON AlAA STORE! I would like to inquire about express delivery to my location in Lebanon.';
  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`;
}

/**
 * Builds "Send to phone 03986718" intent URLs for WhatsApp or SMS
 */
export function buildSendToPhoneUrl(
  phoneNumber = '03986718',
  type: 'whatsapp' | 'sms' = 'whatsapp',
  isArabic = false
): string {
  const cleanNumber = phoneNumber.replace(/\D/g, '');
  const targetNumber = cleanNumber.startsWith('961') ? cleanNumber : `961${cleanNumber.startsWith('0') ? cleanNumber.slice(1) : cleanNumber}`;
  
  const bodyText = isArabic
    ? `📍 متجر ON AlAA الإلكتروني:\n• مقرنا: الشوف، جبل لبنان\n• التوصيل: متاح لجميع المناطق اللبنانية\n• دوام الطلبات والدعم: 8:00 ص – 1:00 ص يومياً\n• هاتف / واتساب: 03986718 (9613986718+)\n• رابط التواصل والطلب: https://wa.me/9613986718`
    : `📍 ON AlAA STORE — Online Store:\n• Based in: Chouf, Mount Lebanon\n• Delivery: Available to All Lebanon\n• Orders & Support: 8:00 AM – 1:00 AM Daily\n• Phone / WhatsApp: 03986718 (+961 3 986718)\n• Chat & Order: https://wa.me/9613986718`;

  if (type === 'sms') {
    return `sms:+${targetNumber}?body=${encodeURIComponent(bodyText)}`;
  }

  return `https://wa.me/${targetNumber}?text=${encodeURIComponent(bodyText)}`;
}

/**
 * Builds structured data payload for the Web Share API or clipboard copy
 */
export function buildLocationShareData(isArabic = false): {
  title: string;
  text: string;
  url: string;
  fullMessage: string;
} {
  const title = isArabic
    ? 'متجر ON AlAA — متجر إلكتروني - مقرنا في الشوف، لبنان'
    : 'ON AlAA STORE — Online Store based in Chouf, Lebanon';

  const text = isArabic
    ? `متجر ON AlAA الإلكتروني - مقرنا في الشوف • التوصيل متاح لجميع مناطق لبنان • هاتف وواتساب: 03986718`
    : `ON AlAA STORE — Online Store based in Chouf, Lebanon • Delivery Available to All Lebanon • Phone & WhatsApp: 03986718`;

  const url = 'https://wa.me/9613986718';

  const fullMessage = isArabic
    ? `📍 ${title}\n` +
      `📌 المقر: الشوف، جبل لبنان\n` +
      `🚚 التوصيل: متاح لجميع المناطق اللبنانية\n` +
      `⏰ الدوام: خدمة العملاء والطلبات من 8:00 ص إلى 1:00 ص يومياً\n` +
      `📞 هاتف: 03986718 (+961 3 986718)\n` +
      `📲 واتساب مباشر: https://wa.me/9613986718`
    : `📍 ${title}\n` +
      `📌 Hub: Chouf, Mount Lebanon\n` +
      `🚚 Delivery: Available to All Lebanon\n` +
      `⏰ Hours: Customer Support & Orders: 8:00 AM – 1:00 AM Daily\n` +
      `📞 Phone: 03986718 (+961 3 986718)\n` +
      `📲 WhatsApp Direct: https://wa.me/9613986718`;

  return { title, text, url, fullMessage };
}
