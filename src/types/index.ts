export type Language = 'en' | 'ar';

export type AdminRole = 'super_admin' | 'product_manager' | 'order_manager' | 'inventory_manager';

export interface AdminUser {
  id: string;
  username: string;
  name: string;
  role: AdminRole;
  email: string;
}

export interface ProductVariant {
  id: string;
  name: string; // e.g. "256GB - Titanium Black" or "Midnight Blue"
  price: number;
  stock: number;
  sku: string;
}

export interface ProductSpec {
  group?: string; // e.g. "Performance", "Display", "Battery"
  label: string;
  value: string;
}

export interface Review {
  id: string;
  userName: string;
  rating: number; // 1-5
  comment: string;
  date: string;
  verifiedPurchase: boolean;
}

export interface Product {
  id: string;
  name: string;
  nameAr?: string;
  brand: string;
  category: string;
  subcategory?: string;
  sku: string;
  barcode?: string;
  originalPrice: number;
  price: number; // selling price
  discountPercentage?: number;
  stock: number;
  lowStockThreshold?: number;
  images: string[];
  videoUrl?: string;
  description: string;
  descriptionAr?: string;
  specifications: ProductSpec[];
  variants?: ProductVariant[];
  colors?: string[];
  warrantyMonths: number;
  warrantyTerms?: string;
  isSpecialOffer?: boolean;
  offerExpiresAt?: string; // ISO date
  isFeatured?: boolean;
  isNewArrival?: boolean;
  isBestSeller?: boolean;
  isPublished: boolean;
  rating: number;
  reviewCount: number;
  reviews?: Review[];
  createdAt: string;
}

export interface Category {
  id: string;
  name: string;
  nameAr: string;
  slug: string;
  iconName: string;
  image?: string;
  description?: string;
  featured?: boolean;
  displayOrder: number;
  subcategories?: string[];
}

export interface Brand {
  id: string;
  name: string;
  logo: string;
  description?: string;
  featured?: boolean;
  productCount?: number;
}

export interface MarketingVideo {
  id: string;
  title: string;
  titleAr?: string;
  description: string;
  videoUrl: string;
  thumbnail: string;
  linkedProductIds: string[];
  isFeatured: boolean;
  isPublished: boolean;
  views?: number;
}

export interface CartItem {
  product: Product;
  quantity: number;
  selectedColor?: string;
  selectedVariant?: ProductVariant;
}

export type OrderStatus =
  | 'new'
  | 'confirmed'
  | 'preparing'
  | 'ready_for_delivery'
  | 'out_for_delivery'
  | 'delivered'
  | 'cancelled'
  | 'returned';

export type PaymentMethod =
  | 'cod' // Cash on Delivery (USD / LBP market rate)
  | 'store_pickup' // Pickup at Saida Store (Nijme Square)
  | 'whish_money' // Whish Money Transfer
  | 'omt_western_union'; // OMT / Western Union Service

export interface OrderItem {
  productId: string;
  productName: string;
  brand: string;
  price: number;
  quantity: number;
  image: string;
  color?: string;
  variantName?: string;
}

export interface CustomerDetails {
  fullName: string;
  phone: string;
  alternatePhone?: string;
  email?: string;
  cityArea: string; // e.g. "Saida", "Beirut", "Tripoli"
  addressLine: string;
  buildingFloor?: string;
  notes?: string;
}

export interface Order {
  id: string; // e.g. "ARN-2027-1042"
  customer: CustomerDetails;
  items: OrderItem[];
  subtotal: number;
  discount: number;
  deliveryFee: number;
  total: number;
  currency: 'USD';
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  paymentStatus: 'pending' | 'paid' | 'pay_on_delivery';
  orderDate: string;
  statusHistory: {
    status: OrderStatus;
    timestamp: string;
    note?: string;
  }[];
  adminNotes?: string;
}

export interface DeliveryZone {
  id: string;
  nameEn: string;
  nameAr: string;
  fee: number; // USD
  estimatedDays: string;
}

export interface StoreOpeningSchedule {
  openTime: string; // e.g. "08:00"
  closeTime: string; // e.g. "01:00"
  daysOpenEn: string; // e.g. "Monday – Sunday"
  daysOpenAr: string; // e.g. "الإثنين – الأحد"
  displayHours: boolean;
  customMessageEn: string; // e.g. "OPEN EVERY DAY — 17 HOURS DAILY"
  customMessageAr: string; // e.g. "مفتوح يومياً — 17 ساعة في اليوم"
  timezone: string; // e.g. "Asia/Beirut"
}

export interface StoreSettings {
  storeName: string;
  storeNameAr?: string;
  tagline: string;
  taglineAr: string;
  logoUrl?: string; // Persistent uploaded store logo (Base64 data URL or remote URL)
  phone: string;
  whatsapp: string;
  locationEn: string;
  locationAr: string;
  openingHoursEn: string;
  openingHoursAr: string;
  openingSchedule?: StoreOpeningSchedule;
  announcementBar: {
    enabled: boolean;
    textEn: string;
    textAr: string;
    bgColor: string;
    textColor: string;
    linkUrl?: string;
  };
  heroSlides: {
    id: string;
    titleEn: string;
    titleAr: string;
    subtitleEn: string;
    subtitleAr: string;
    badgeEn: string;
    badgeAr: string;
    image: string;
    ctaLink: string;
    ctaTextEn: string;
    ctaTextAr: string;
  }[];
  deliveryZones: DeliveryZone[];
}
