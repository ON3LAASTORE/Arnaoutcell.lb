import { Category, Product } from '../types';

export type CategoryBannerTheme =
  | 'phones'
  | 'laptops'
  | 'audio'
  | 'wearables'
  | 'power'
  | 'smarthome';

export interface CategoryBannerMetadata {
  theme: CategoryBannerTheme;
  displayTitleEn: string;
  displayTitleAr: string;
  subtitleEn: string;
  subtitleAr: string;
}

export interface CategoryBannerCardItem {
  category: Category;
  theme: CategoryBannerTheme;
  titleEn: string;
  titleAr: string;
  subtitleEn: string;
  subtitleAr: string;
  imageUrl?: string;
  productCount: number;
}

const FEATURED_BANNER_SLUGS = [
  'phones',
  'laptops',
  'airpods-wireless-earbuds',
  'smartwatches',
  'power-banks',
  'speakers',
];

const CURATED_BANNER_OVERRIDES: Record<string, CategoryBannerMetadata> = {
  phones: {
    theme: 'phones',
    displayTitleEn: 'Mobiles & Tablets',
    displayTitleAr: 'الهواتف الذكية والأجهزة اللوحية',
    subtitleEn: 'Great deals and flagship offers on all mobile phones',
    subtitleAr: 'أفضل العروض والأسعار على أحدث الهواتف الذكية والرائدة',
  },
  tablets: {
    theme: 'phones',
    displayTitleEn: 'Tablets & iPads',
    displayTitleAr: 'الأجهزة اللوحية (تابلت وآيباد)',
    subtitleEn: 'Ultra-sharp displays built for work, creativity, and study',
    subtitleAr: 'شاشات فائقة الدقة للعمل الإبداعي والدراسة والترفيه',
  },
  laptops: {
    theme: 'laptops',
    displayTitleEn: 'Computers, Laptops & Peripherals',
    displayTitleAr: 'أجهزة اللابتوب والكمبيوتر',
    subtitleEn: 'High-performance ultrabooks, MacBooks, and workstation gear',
    subtitleAr: 'أجهزة لابتوب وماك بوك فائقة الأداء للعمل والألعاب',
  },
  'computers-gaming': {
    theme: 'laptops',
    displayTitleEn: 'Computers & Gaming Rigs',
    displayTitleAr: 'الكمبيوتر وأجهزة الجيمنغ',
    subtitleEn: 'Custom rigs, high-refresh monitors, and pro gaming hardware',
    subtitleAr: 'تجميعات احترافية، شاشات سريعة، وعتاد جيمنغ متكامل',
  },
  'airpods-wireless-earbuds': {
    theme: 'audio',
    displayTitleEn: 'AirPods & Audio Gear',
    displayTitleAr: 'سماعات إيربودز والصوتيات',
    subtitleEn: 'Connected with style — spatial audio & crystal-clear ANC',
    subtitleAr: 'صوت نقي وعزل ضوضاء فائق بتصاميم لاسلكية أنيقة',
  },
  headphones: {
    theme: 'audio',
    displayTitleEn: 'Studio & ANC Headphones',
    displayTitleAr: 'سماعات الرأس الاحترافية',
    subtitleEn: 'Over-ear wireless precision with deep studio acoustics',
    subtitleAr: 'عزل ضوضاء متقدم وجودة صوت استوديو لاسلكية',
  },
  smartwatches: {
    theme: 'wearables',
    displayTitleEn: 'Smartwatches & Wearables',
    displayTitleAr: 'الساعات الذكية والأجهزة القابلة للارتداء',
    subtitleEn: 'Precision health tracking, fitness metrics & seamless alerts',
    subtitleAr: 'متابعة صحية دقيقة وإشعارات فورية بتصاميم عصرية متينة',
  },
  'power-banks': {
    theme: 'power',
    displayTitleEn: 'Gadgets & Power Accessories',
    displayTitleAr: 'بنوك الطاقة والإكسسوارات الذكية',
    subtitleEn: 'MagSafe batteries, GaN fast charging & everyday tech essentials',
    subtitleAr: 'شواحن سريعة وبطاريات MagSafe وملحقات طاقة موثوقة',
  },
  'chargers-adapters': {
    theme: 'power',
    displayTitleEn: 'Chargers, GaN & Adapters',
    displayTitleAr: 'شواحن سريعة ومحولات الطاقة',
    subtitleEn: 'Compact multi-port GaN power built for phones and laptops',
    subtitleAr: 'تقنية GaN لشحن فائق السرعة للهواتف واللابتوب بأمان',
  },
  speakers: {
    theme: 'smarthome',
    displayTitleEn: 'Speakers & Home Appliances',
    displayTitleAr: 'مكبرات الصوت وأجهزة المنزل الذكي',
    subtitleEn: 'Smart home audio, wireless speakers & modern electronics',
    subtitleAr: 'أنظمة صوت لاسلكية وإلكترونيات ذكية للمنزل العصري',
  },
  'smart-home-devices': {
    theme: 'smarthome',
    displayTitleEn: 'Smart Home & Electrical Appliances',
    displayTitleAr: 'أجهزة المنزل الذكي والكهربائيات',
    subtitleEn: 'Connected home automation, lighting, and smart cleaning',
    subtitleAr: 'حلول أتمتة ذكية وإضاءة وأجهزة منزلية حديثة',
  },
};

export function sortDynamicCategories(categories: readonly Category[]): Category[] {
  return [...categories].sort((a, b) => {
    const orderA =
      typeof a.displayOrder === 'number' && Number.isFinite(a.displayOrder)
        ? a.displayOrder
        : 999;
    const orderB =
      typeof b.displayOrder === 'number' && Number.isFinite(b.displayOrder)
        ? b.displayOrder
        : 999;
    if (orderA !== orderB) return orderA - orderB;
    return a.name.localeCompare(b.name);
  });
}

/**
 * Merges live dynamic categories from Firestore with baseline defaults without duplicating
 * slugs or IDs, preserving Firestore overrides and sorting by displayOrder.
 */
export function mergeDynamicCategories(
  primary: readonly Category[],
  baseline: readonly Category[]
): Category[] {
  const bySlug = new Map<string, Category>();
  const byId = new Set<string>();

  for (const cat of primary) {
    if (!cat || !cat.name || !cat.slug) continue;
    const key = cat.slug.toLowerCase();
    if (!bySlug.has(key) && !byId.has(cat.id)) {
      bySlug.set(key, cat);
      byId.add(cat.id);
    }
  }

  for (const baseCat of baseline) {
    const key = baseCat.slug.toLowerCase();
    if (!bySlug.has(key) && !byId.has(baseCat.id)) {
      bySlug.set(key, baseCat);
      byId.add(baseCat.id);
    }
  }

  return sortDynamicCategories(Array.from(bySlug.values()));
}

export function resolveCategoryBannerTheme(category: Category): CategoryBannerTheme {
  const slug = category.slug.toLowerCase();
  const override = CURATED_BANNER_OVERRIDES[slug];
  if (override) {
    return override.theme;
  }

  if (slug.includes('phone') || slug.includes('tablet') || slug.includes('cover')) {
    return 'phones';
  }
  if (
    slug.includes('laptop') ||
    slug.includes('computer') ||
    slug.includes('keyboard') ||
    slug.includes('printer') ||
    slug.includes('bag') ||
    slug.includes('storage') ||
    slug.includes('gaming')
  ) {
    return 'laptops';
  }
  if (
    slug.includes('earbud') ||
    slug.includes('headphone') ||
    slug.includes('earphone') ||
    slug.includes('mic')
  ) {
    return 'audio';
  }
  if (slug.includes('watch') || slug.includes('glass') || slug.includes('personal-care')) {
    return 'wearables';
  }
  if (
    slug.includes('speaker') ||
    slug.includes('smart-home') ||
    slug.includes('lighting') ||
    slug.includes('kitchen') ||
    slug.includes('camera') ||
    slug.includes('drone') ||
    slug.includes('router')
  ) {
    return 'smarthome';
  }
  return 'power';
}

export function buildCategoryBannerItems(
  categories: readonly Category[],
  products: readonly Product[],
  showAll: boolean
): CategoryBannerCardItem[] {
  const sortedCategories = sortDynamicCategories(categories);

  const orderedSource = showAll
    ? sortedCategories
    : (() => {
        const picked: Category[] = [];
        for (const slug of FEATURED_BANNER_SLUGS) {
          const match = sortedCategories.find((c) => c.slug === slug);
          if (match) picked.push(match);
        }
        if (picked.length < 6) {
          for (const cat of sortedCategories) {
            if (!picked.some((p) => p.id === cat.id)) {
              picked.push(cat);
            }
            if (picked.length >= 6) break;
          }
        }
        return picked;
      })();

  return orderedSource.map((category) => {
    const override = CURATED_BANNER_OVERRIDES[category.slug];
    const theme = resolveCategoryBannerTheme(category);
    const productCount = products.filter(
      (p) =>
        p.isPublished !== false &&
        (p.category.toLowerCase() === category.name.toLowerCase() ||
          p.category.toLowerCase() === category.slug.toLowerCase())
    ).length;

    const customDescription =
      typeof category.description === 'string' && category.description.trim().length > 0
        ? category.description.trim()
        : undefined;

    const fallbackSubEn =
      customDescription ||
      (category.subcategories && category.subcategories.length > 0
        ? `Explore ${category.subcategories.slice(0, 3).join(', ')} and more`
        : 'Genuine electronics & accessories with warranty across Lebanon');

    const fallbackSubAr =
      customDescription || 'منتجات أصلية ومكفولة مع توصيل سريع لجميع مناطق لبنان';

    return {
      category,
      theme,
      titleEn: override?.displayTitleEn || category.name,
      titleAr: override?.displayTitleAr || category.nameAr,
      subtitleEn: customDescription || override?.subtitleEn || fallbackSubEn,
      subtitleAr: override?.subtitleAr || fallbackSubAr,
      imageUrl:
        typeof category.image === 'string' && category.image.trim().length > 0
          ? category.image.trim()
          : undefined,
      productCount,
    };
  });
}
