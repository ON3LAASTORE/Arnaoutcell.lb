export type ServicesFaqCategory = 'all' | 'delivery' | 'payment' | 'warranty';

export interface ServicesFaqItem {
  id: string;
  category: Exclude<ServicesFaqCategory, 'all'>;
  questionEn: string;
  questionAr: string;
  answerEn: string;
  answerAr: string;
}

export const SERVICES_FAQ_CATEGORIES: Array<{
  id: ServicesFaqCategory;
  labelEn: string;
  labelAr: string;
}> = [
  { id: 'all', labelEn: 'All Questions', labelAr: 'كل الأسئلة' },
  { id: 'delivery', labelEn: 'Deliveries', labelAr: 'التوصيل' },
  { id: 'payment', labelEn: 'Payment Methods', labelAr: 'طرق الدفع' },
  { id: 'warranty', labelEn: 'Warranty Terms', labelAr: 'الكفالة والضمان' },
];

export const SERVICES_FAQS: ServicesFaqItem[] = [
  {
    id: 'faq-delivery-coverage',
    category: 'delivery',
    questionEn: 'Where do you deliver and how long does shipping take?',
    questionAr: 'ما هي مناطق التوصيل في لبنان وكم يستغرق وصول الطلب؟',
    answerEn:
      'ON AlAA STORE is an online store based in Chouf with fast door-to-door delivery available to all Lebanon. Chouf & Mount Lebanon orders arrive the same day or within 24 hours; Greater Beirut takes 1–2 business days; and North, South, and Bekaa regions arrive within 1–3 business days.',
    answerAr:
      'متجر ON AlAA STORE هو متجر إلكتروني مقره الشوف ويوفر التوصيل المتاح لجميع مناطق لبنان. تصل طلبات الشوف وجبل لبنان في نفس اليوم أو خلال 24 ساعة، بيروت الكبرى خلال 1–2 يوم عمل، والشمال والجنوب والبقاع خلال 1–3 أيام عمل.',
  },
  {
    id: 'faq-delivery-inspection',
    category: 'delivery',
    questionEn: 'Can I inspect my electronics order when it arrives?',
    questionAr: 'هل يمكنني معاينة الطلب عند الاستلام قبل الدفع؟',
    answerEn:
      'Yes. Every smartphone, laptop, and accessory is carefully packaged and dispatched with an official store invoice. You can verify the sealed model, SKU, and outer condition with our courier upon delivery before completing Cash on Delivery payment.',
    answerAr:
      'نعم، يتم تغليف كافة الهواتف والأجهزة وإرسالها مع فاتورة رسمية من المتجر، ويمكنكم التحقق من مطابقة الموديل وحالة التغليف عند الاستلام قبل تسديد المبلغ.',
  },
  {
    id: 'faq-payment-methods',
    category: 'payment',
    questionEn: 'What payment methods are accepted at ON AlAA STORE?',
    questionAr: 'ما هي طرق الدفع المتوفرة في متجر ON AlAA STORE؟',
    answerEn:
      'We accept Cash on Delivery (COD) across all Lebanon in Fresh USD or Lebanese Pounds (LBP) calculated at the daily market exchange rate, as well as direct digital wallet transfers via Whish Money prior to dispatch.',
    answerAr:
      'نقبل الدفع نقداً عند الاستلام (Cash on Delivery) بالدولار الأمريكي الفريش أو بالليرة اللبنانية وفق سعر الصرف اليومي، كما يمكنكم التحويل عبر محفظة ويش موني (Whish Money) قبل الشحن.',
  },
  {
    id: 'faq-payment-fees',
    category: 'payment',
    questionEn: 'Are prices in USD and are there any hidden fees?',
    questionAr: 'هل الأسعار بالدولار الأمريكي وهل توجد رسوم إضافية؟',
    answerEn:
      'All product prices are listed clearly in USD. Your checkout summary displays the exact product price, applicable nationwide delivery fee by zone (starting at $2 for Chouf & Mount Lebanon, $3 Beirut, $4 All Lebanon), and any promo discount upfront with zero hidden charges.',
    answerAr:
      'كافة أسعار المنتجات محددة بوضوح بالدولار الأمريكي. يظهر ملخص الطلب المبلغ الإجمالي شاملاً رسوم التوصيل حسب المنطقة ($2 الشوف وجبل لبنان، $3 بيروت، $4 كافة مناطق لبنان) دون أي رسوم مخفية.',
  },
  {
    id: 'faq-warranty-coverage',
    category: 'warranty',
    questionEn: 'What warranty is included on smartphones and electronics?',
    questionAr: 'ما هي مدة وشروط الكفالة على الهواتف والإلكترونيات؟',
    answerEn:
      'All brand-new smartphones, laptops, tablets, audio gear, and power accessories carry a 12 to 24-month official warranty depending on the manufacturer and authorized regional distributor. Verified manufacturing defects in hardware, display, or battery are covered, with a 7-day replacement guarantee for confirmed factory faults.',
    answerAr:
      'تشمل كافة الهواتف الذكية واللابتوبات والأجهزة اللوحية والسماعات والشواحن الأصلية كفالة رسمية لمدة 12 إلى 24 شهراً حسب العلامة التجارية والوكيل المعتمد، مع تغطية عيوب المصنع واستبدال فوري خلال 7 أيام في حال ثبوت أي خلل مصنعي.',
  },
  {
    id: 'faq-warranty-exclusions-claim',
    category: 'warranty',
    questionEn: 'What is excluded from warranty and how do I request support?',
    questionAr: 'ما الحالات غير المشمولة بالكفالة وكيف أطلب الصيانة أو الاستبدال؟',
    answerEn:
      'Warranty does not cover physical breakage from drops or impacts, liquid damage on non-waterproof devices, or repairs performed by unauthorized third-party workshops. For fast warranty or return assistance within 3 days on unopened items, contact our Chouf support team on 03 986 718 or WhatsApp with your invoice.',
    answerAr:
      'لا تشمل الكفالة الكسور الناتجة عن السقوط أو الصدمات، أو تلف السوائل، أو الصيانة في مراكز غير معتمدة. لطلب دعم الكفالة أو استبدال المنتجات غير المفتوحة خلال 3 أيام، تواصلوا معنا عبر الهاتف أو واتساب على الرقم \u206603 986 718\u2069 مع الفاتورة الرسمية.',
  },
];

export function filterServicesFaqs(
  category: ServicesFaqCategory,
  faqs: ServicesFaqItem[] = SERVICES_FAQS
): ServicesFaqItem[] {
  if (category === 'all') return faqs;
  return faqs.filter((item) => item.category === category);
}
