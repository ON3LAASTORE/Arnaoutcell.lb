/**
 * Helper utilities for Store Locator & GPS Navigation
 * 
 * Target Location:
 * SQUARE ARNAOUT CELL STORE, SAIDA - NEJMEH, Sidon
 * Plus Code: H97G+W2P, Sidon
 * Coordinates: 33.5623° N, 35.3722° E (Nejmeh Square, Saida, Lebanon)
 * Phone: 81900916 (+961 81 900 916)
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

export const SAIDA_STORE_DATA: StoreLocationData = {
  name: 'SQUARE ARNAOUT CELL STORE, SAIDA - NEJMEH, Sidon',
  nameAr: 'سكوير أرناؤوط سيل ستور، صيدا - ساحة النجمة، صيدا',
  shortName: 'SQUARE ARNAOUT CELL STORE',
  shortNameAr: 'سكوير أرناؤوط سيل ستور',
  addressEn: 'Nejmeh Square (Saha), Main Commercial Boulevard, Sidon (Saida), Lebanon',
  addressAr: 'ساحة النجمة، البولفار التجاري الرئيسي، صيدا، لبنان',
  cityEn: 'Sidon (Saida), South Lebanon',
  cityAr: 'صيدا، جنوب لبنان',
  landmarkEn: 'Nejmeh Square (Saha), Central Sidon Commercial Hub, 2 minutes from Sea Castle & Serail',
  landmarkAr: 'ساحة النجمة (الساحة)، مركز صيدا التجاري الرئيسي، على بعد دقيقتين من القلعة البحرية والسراي',
  phone: '81900916',
  phoneFormatted: '81 900 916',
  internationalPhone: '+961 81 900 916',
  whatsapp: '96181900916',
  plusCode: 'H97G+W2P, Sidon',
  plusCodeUrl: 'https://plus.codes/8G7PH97G+W2P',
  operatingDuration: 'Open 17 hours',
  operatingDurationEn: 'Open 17 hours (8:00 AM – 1:00 AM Daily)',
  operatingDurationAr: 'مفتوح 17 ساعة (8:00 صباحاً – 1:00 بعد منتصف الليل يومياً)',
  openingHoursEn: '8:00 AM – 1:00 AM (17 Hours Daily, 7 Days a Week)',
  openingHoursAr: '8:00 صباحاً – 1:00 بعد منتصف الليل (17 ساعة يومياً، 7 أيام في الأسبوع)',
  latitude: 33.5623,
  longitude: 35.3722,
  googleMapsUrl: 'https://maps.google.com/?q=H97G%2BW2P,+Sidon',
  googleDirectionsUrl: 'https://www.google.com/maps/dir/?api=1&destination=H97G%2BW2P,+Sidon',
  appleMapsUrl: 'http://maps.apple.com/?daddr=33.5623,35.3722&q=SQUARE+ARNAOUT+CELL+STORE+SAIDA+-+NEJMEH',
};

/**
 * Generates Google Maps search URL with encoded query
 */
export function buildGoogleMapsUrl(query: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

/**
 * Generates direct Live Route navigation URL using Plus Code or coordinates
 */
export function buildLiveRouteUrl(destination = 'H97G+W2P, Sidon'): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`;
}

/**
 * Generates pre-filled WhatsApp location request / pin URL
 */
export function buildWhatsAppLocationUrl(phone = '96181900916', isArabic = false): string {
  const cleanPhone = phone.replace(/\D/g, '');
  const text = isArabic
    ? 'مرحباً سكوير أرناؤوط سيل ستور صيدا! أود الحصول على موقع المحل الجغرافي (Live Location) على واتساب للوصول إليكم في ساحة النجمة صيدا (رمز بلس: H97G+W2P, Sidon).'
    : 'Hello SQUARE ARNAOUT CELL STORE! Please send your exact live GPS location pin on WhatsApp for directions to your Saida Nejmeh Square showroom (Plus Code: H97G+W2P, Sidon).';
  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`;
}

/**
 * Builds "Send to phone 81900916" intent URLs for WhatsApp or SMS
 */
export function buildSendToPhoneUrl(
  phoneNumber = '81900916',
  type: 'whatsapp' | 'sms' = 'whatsapp',
  isArabic = false
): string {
  const cleanNumber = phoneNumber.replace(/\D/g, '');
  const targetNumber = cleanNumber.startsWith('961') ? cleanNumber : `961${cleanNumber}`;
  
  const bodyText = isArabic
    ? `📍 موقع سكوير أرناؤوط سيل ستور:\n• صيدا - ساحة النجمة، صيدا\n• رمز بلس: H97G+W2P, Sidon\n• الإحداثيات: 33.5623°N, 35.3722°E\n• دوام العمل: مفتوح 17 ساعة (8:00 ص – 1:00 ص)\n• هاتف: 81900916\n• رابط الطريق المباشر: ${SAIDA_STORE_DATA.googleDirectionsUrl}`
    : `📍 SQUARE ARNAOUT CELL STORE Location:\n• Saida - Nejmeh Square, Sidon\n• Plus Code: H97G+W2P, Sidon\n• GPS: 33.5623°N, 35.3722°E\n• Hours: Open 17 hours (8:00 AM – 1:00 AM)\n• Phone: 81900916\n• Live Route: ${SAIDA_STORE_DATA.googleDirectionsUrl}`;

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
    ? 'سكوير أرناؤوط سيل ستور، صيدا - ساحة النجمة، صيدا'
    : 'SQUARE ARNAOUT CELL STORE, SAIDA - NEJMEH, Sidon';

  const text = isArabic
    ? `سكوير أرناؤوط سيل ستور - صيدا ساحة النجمة (رمز بلس: H97G+W2P, Sidon) • مفتوح 17 ساعة يومياً • هاتف: 81900916`
    : `SQUARE ARNAOUT CELL STORE, SAIDA - NEJMEH, Sidon (Plus Code: H97G+W2P, Sidon) • Open 17 hours daily • Phone: 81900916`;

  const url = SAIDA_STORE_DATA.googleMapsUrl;

  const fullMessage = isArabic
    ? `📍 ${title}\n` +
      `📌 العنوان: ساحة النجمة، صيدا، لبنان\n` +
      `🌐 رمز بلس: H97G+W2P, Sidon\n` +
      `🧭 الإحداثيات: 33.5623° N, 35.3722° E\n` +
      `⏰ الدوام: مفتوح 17 ساعة (8:00 صباحاً – 1:00 بعد منتصف الليل يومياً)\n` +
      `📞 هاتف: 81900916 (+961 81 900 916)\n` +
      `🚗 خريطة وتوجيه حي: ${SAIDA_STORE_DATA.googleDirectionsUrl}`
    : `📍 ${title}\n` +
      `📌 Address: Nejmeh Square, Sidon (Saida), Lebanon\n` +
      `🌐 Plus Code: H97G+W2P, Sidon\n` +
      `🧭 GPS: 33.5623° N, 35.3722° E\n` +
      `⏰ Hours: Open 17 hours (8:00 AM – 1:00 AM Daily)\n` +
      `📞 Phone: 81900916 (+961 81 900 916)\n` +
      `🚗 Live Route: ${SAIDA_STORE_DATA.googleDirectionsUrl}`;

  return { title, text, url, fullMessage };
}
