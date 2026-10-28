/**
 * Helper utilities for Store Locator section
 */

export interface StoreLocationData {
  name: string;
  nameAr: string;
  addressEn: string;
  addressAr: string;
  cityEn: string;
  cityAr: string;
  landmarkEn: string;
  landmarkAr: string;
  phone: string;
  whatsapp: string;
  openingHoursEn: string;
  openingHoursAr: string;
  latitude: number;
  longitude: number;
  googleMapsUrl: string;
  googleDirectionsUrl: string;
}

export const SAIDA_STORE_DATA: StoreLocationData = {
  name: 'ARNAOUT STORE Saida',
  nameAr: 'أرناؤوط ستور صيدا',
  addressEn: 'Nijme Square, Main Commercial Road',
  addressAr: 'ساحة النجمة، الشارع التجاري الرئيسي',
  cityEn: 'Saida, South Lebanon',
  cityAr: 'صيدا، جنوب لبنان',
  landmarkEn: 'Central Saida landmark, 2 minutes from Saida Serail & Sea Castle',
  landmarkAr: 'وسط مدينة صيدا، على بعد دقيقتين من السراي وقلعة صيدا البحرية',
  phone: '81900916',
  whatsapp: '96181900916',
  openingHoursEn: '8:00 AM – 1:00 AM (17 Hours Daily, 7 Days a Week)',
  openingHoursAr: '8:00 صباحاً – 1:00 بعد منتصف الليل (17 ساعة يومياً، 7 أيام في الأسبوع)',
  latitude: 33.5631,
  longitude: 35.3718,
  googleMapsUrl: 'https://www.google.com/maps/search/?api=1&query=Saida+Nijme+Square+Lebanon',
  googleDirectionsUrl: 'https://www.google.com/maps/dir/?api=1&destination=33.5631,35.3718',
};

/**
 * Generates Google Maps search URL with encoded query
 */
export function buildGoogleMapsUrl(query: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

/**
 * Generates pre-filled WhatsApp location request URL
 */
export function buildWhatsAppLocationUrl(phone: string, isArabic = false): string {
  const text = isArabic
    ? 'مرحباً أرناؤوط ستور! أود الحصول على موقع المحل الجغرافي (Live Location) على واتساب للوصول إليكم بساحة النجمة في صيدا.'
    : 'Hello ARNAOUT STORE! Please send your exact live GPS location on WhatsApp for directions to your Saida Nijme Square showroom.';
  return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
}
