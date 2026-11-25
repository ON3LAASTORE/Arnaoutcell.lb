import { Brand, Category, Language, Product } from '../types';
import {
  collectProductSchemaImages,
  resolveSchemaUrl,
  selectInventoryProductsForSchema,
} from './seoSchemaHelpers';

export interface RouteSeoMetadataParams {
  currentView: string;
  activeProduct?: Product;
  activeCategory?: Category;
  selectedBrandName?: string | null;
  searchQuery?: string;
  products: Product[];
  categories: Category[];
  brands?: Brand[];
  lang: Language;
  storeName: string;
  logoUrl: string;
  origin: string;
  pathname?: string;
}

export interface ResolvedOgImage {
  url: string;
  alt: string;
}

export interface RouteSeoMetadata {
  pageTitle: string;
  metaDescription: string;
  canonicalUrl: string;
  ogType: string;
  ogImage: string;
  ogImageAlt: string;
  robots: string;
}

const DEFAULT_OG_IMAGE_PATH = '/on-alaa-store-profile.png';
const MAX_META_DESCRIPTION_LENGTH = 160;

/**
 * Normalizes whitespace and trims descriptions cleanly without leaving dangling punctuation.
 */
export function truncateMetaDescription(
  raw: string,
  maxLength: number = MAX_META_DESCRIPTION_LENGTH
): string {
  const normalized = raw.replace(/\s+/g, ' ').trim();
  if (!normalized || normalized.length <= maxLength) {
    return normalized;
  }

  const sliceLimit = Math.max(20, maxLength - 1);
  const sliced = normalized.slice(0, sliceLimit);
  const lastSpace = sliced.lastIndexOf(' ');
  const trimmed =
    lastSpace >= Math.floor(sliceLimit * 0.6) ? sliced.slice(0, lastSpace) : sliced;

  return `${trimmed.replace(/[,:;.\-–—·\s]+$/, '')}…`;
}

function formatUsdPrice(price: number): string {
  const numeric = Number(price);
  if (!Number.isFinite(numeric)) return '$0';
  return Number.isInteger(numeric) ? `$${numeric}` : `$${numeric.toFixed(2)}`;
}

/**
 * Builds a concise, index-ready product-level meta description containing
 * product title, price/discount, stock availability, SKU, warranty, and highlights.
 */
export function buildProductMetaDescription(
  product: Product,
  lang: Language,
  storeName: string
): string {
  const localizedName = lang === 'ar' ? product.nameAr || product.name : product.name;
  const localizedDesc =
    lang === 'ar'
      ? product.descriptionAr || product.description || ''
      : product.description || '';
  const priceLabel = formatUsdPrice(product.price);
  const hasDiscount = Number(product.originalPrice) > Number(product.price);
  const discountPct = hasDiscount
    ? product.discountPercentage ||
      Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
    : 0;

  const firstSpec =
    Array.isArray(product.specifications) && product.specifications.length > 0
      ? `${product.specifications[0].label}: ${product.specifications[0].value}`
      : '';

  if (lang === 'ar') {
    const stockLabel = product.stock > 0 ? 'متوفر' : 'غير متوفر حالياً';
    const warrantyLabel =
      product.warrantyMonths > 0 ? `كفالة ${product.warrantyMonths} شهر` : 'منتج أصلي';
    const discountPart = discountPct > 0 ? ` (خصم ${discountPct}%)` : '';
    const skuPart = product.sku ? ` · SKU: ${product.sku}` : '';
    const base = `${localizedName} من ${product.brand} بسعر ${priceLabel}${discountPart} — ${stockLabel} مع ${warrantyLabel}${skuPart} في ${storeName}.`;

    if (base.length <= 135 && localizedDesc) {
      return truncateMetaDescription(`${base} ${localizedDesc}`);
    }
    return truncateMetaDescription(base);
  }

  const stockLabel = product.stock > 0 ? 'In Stock' : 'Out of Stock';
  const warrantyLabel =
    product.warrantyMonths > 0 ? `${product.warrantyMonths}-mo warranty` : 'Genuine stock';
  const discountPart = discountPct > 0 ? ` (${discountPct}% off)` : '';
  const skuPart = product.sku ? ` · SKU ${product.sku}` : '';
  const detailSnippet = firstSpec || localizedDesc;

  const core = `${localizedName} — ${priceLabel}${discountPart}, ${stockLabel}, ${warrantyLabel}${skuPart}.`;
  if (detailSnippet && core.length + detailSnippet.length + 1 <= MAX_META_DESCRIPTION_LENGTH) {
    return truncateMetaDescription(`${core} ${detailSnippet}`);
  }
  if (detailSnippet && core.length < 120) {
    return truncateMetaDescription(`${core} ${detailSnippet}`);
  }
  return truncateMetaDescription(`${core} Shop at ${storeName}, Lebanon.`);
}

/**
 * Resolves the highest-priority valid non-data Open Graph image and accessible alt text
 * dynamically for product pages, category/brand filters, flash offers, and store sections.
 */
export function resolveDynamicOgImage(params: {
  currentView: string;
  activeProduct?: Product;
  activeCategory?: Category;
  selectedBrandName?: string | null;
  products: Product[];
  brands?: Brand[];
  logoUrl: string;
  origin: string;
  lang: Language;
  storeName: string;
}): ResolvedOgImage {
  const cleanOrigin = params.origin.replace(/\/+$/, '');
  const fallbackLogo =
    resolveSchemaUrl(params.logoUrl, cleanOrigin) || `${cleanOrigin}${DEFAULT_OG_IMAGE_PATH}`;
  const defaultAlt = `${params.storeName} — Online Tech Store in Lebanon`;

  if (params.currentView === 'product-detail' && params.activeProduct) {
    const productImages = collectProductSchemaImages(params.activeProduct, cleanOrigin);
    const localizedName =
      params.lang === 'ar'
        ? params.activeProduct.nameAr || params.activeProduct.name
        : params.activeProduct.name;

    if (productImages.length > 0) {
      return {
        url: productImages[0],
        alt: `${localizedName} (${params.activeProduct.brand}) — ${params.storeName}`,
      };
    }

    const brandMatch = params.brands?.find(
      (b) => b.name.toLowerCase() === params.activeProduct!.brand.toLowerCase()
    );
    const resolvedBrandLogo = resolveSchemaUrl(brandMatch?.logo, cleanOrigin);
    if (resolvedBrandLogo) {
      return {
        url: resolvedBrandLogo,
        alt: `${localizedName} — ${params.activeProduct.brand}`,
      };
    }

    return {
      url: fallbackLogo,
      alt: `${localizedName} — ${params.storeName}`,
    };
  }

  if (params.currentView === 'products') {
    const explicitCatImage = resolveSchemaUrl(params.activeCategory?.image, cleanOrigin);
    if (explicitCatImage) {
      const catTitle = params.activeCategory
        ? params.lang === 'ar'
          ? params.activeCategory.nameAr
          : params.activeCategory.name
        : params.storeName;
      return {
        url: explicitCatImage,
        alt: `${catTitle} — ${params.storeName}`,
      };
    }

    const matchingInventory = selectInventoryProductsForSchema(params.products, {
      currentView: 'products',
      activeCategory: params.activeCategory,
      selectedBrandName: params.selectedBrandName,
      maxItems: 8,
    });

    for (const candidate of matchingInventory) {
      const imgs = collectProductSchemaImages(candidate, cleanOrigin);
      if (imgs.length > 0) {
        const subject = params.activeCategory
          ? params.lang === 'ar'
            ? params.activeCategory.nameAr
            : params.activeCategory.name
          : params.selectedBrandName || candidate.name;
        return {
          url: imgs[0],
          alt: `${subject} — ${candidate.name} | ${params.storeName}`,
        };
      }
    }

    if (params.selectedBrandName) {
      const brandMeta = params.brands?.find(
        (b) => b.name.toLowerCase() === params.selectedBrandName!.toLowerCase()
      );
      const brandLogo = resolveSchemaUrl(brandMeta?.logo, cleanOrigin);
      if (brandLogo) {
        return {
          url: brandLogo,
          alt: `${params.selectedBrandName} Authorized Tech — ${params.storeName}`,
        };
      }
    }
  }

  if (params.currentView === 'offers') {
    const topOffers = selectInventoryProductsForSchema(params.products, {
      currentView: 'offers',
      maxItems: 6,
    });
    for (const offerProd of topOffers) {
      const imgs = collectProductSchemaImages(offerProd, cleanOrigin);
      if (imgs.length > 0) {
        return {
          url: imgs[0],
          alt: `Flash Tech Deal: ${offerProd.name} ($${offerProd.price}) — ${params.storeName}`,
        };
      }
    }
  }

  if (params.currentView === 'categories' || params.currentView === 'brands') {
    const flagshipInventory = selectInventoryProductsForSchema(params.products, {
      currentView: params.currentView,
      maxItems: 6,
    });
    for (const item of flagshipInventory) {
      const imgs = collectProductSchemaImages(item, cleanOrigin);
      if (imgs.length > 0) {
        return {
          url: imgs[0],
          alt: `${item.brand} ${item.name} — ${params.storeName}`,
        };
      }
    }
  }

  return {
    url: fallbackLogo,
    alt: defaultAlt,
  };
}

function summarizeTopProductNames(products: Product[], lang: Language, maxCount = 2): string {
  return products
    .slice(0, maxCount)
    .map((p) => (lang === 'ar' ? p.nameAr || p.name : p.name))
    .filter(Boolean)
    .join(', ');
}

/**
 * Computes complete route-level SEO tags (title, specific meta description, canonical URL,
 * dynamic OG image + alt, robots directive) across storefront and admin views.
 */
export function buildRouteSeoMetadata(params: RouteSeoMetadataParams): RouteSeoMetadata {
  const cleanOrigin = params.origin.replace(/\/+$/, '');
  const storeName = params.storeName || 'ON ALAA STORE';
  const publishedProducts = params.products.filter((p) => p.isPublished !== false);
  const ogImage = resolveDynamicOgImage({
    currentView: params.currentView,
    activeProduct: params.activeProduct,
    activeCategory: params.activeCategory,
    selectedBrandName: params.selectedBrandName,
    products: params.products,
    brands: params.brands,
    logoUrl: params.logoUrl,
    origin: cleanOrigin,
    lang: params.lang,
    storeName,
  });

  let pageTitle = `${storeName} | Online Tech Store Based in Chouf • Delivery to All Lebanon`;
  let metaDescription = truncateMetaDescription(
    `Shop authentic smartphones, laptops, GaN fast chargers, and audio gear at ${storeName} with official warranty and delivery across all Lebanon.`
  );
  let canonicalUrl = `${cleanOrigin}${params.pathname || '/'}`;
  let ogType = 'website';
  let robots = 'index, follow';

  switch (params.currentView) {
    case 'product-detail':
      if (params.activeProduct) {
        const prodTitle =
          params.lang === 'ar'
            ? params.activeProduct.nameAr || params.activeProduct.name
            : params.activeProduct.name;
        pageTitle = `${prodTitle} | ${params.activeProduct.brand} – ${storeName}`;
        metaDescription = buildProductMetaDescription(
          params.activeProduct,
          params.lang,
          storeName
        );
        canonicalUrl = `${cleanOrigin}/#/product/${params.activeProduct.id}`;
        ogType = 'product';
      }
      break;

    case 'products': {
      const matchingSlice = selectInventoryProductsForSchema(params.products, {
        currentView: 'products',
        activeCategory: params.activeCategory,
        selectedBrandName: params.selectedBrandName,
        maxItems: 24,
      });
      const sampleNames = summarizeTopProductNames(matchingSlice, params.lang, 2);

      if (params.searchQuery && params.searchQuery.trim()) {
        const q = params.searchQuery.trim();
        pageTitle = `Search "${q}" | ${storeName}`;
        metaDescription = truncateMetaDescription(
          sampleNames
            ? `Search results for "${q}" at ${storeName}: ${sampleNames}. Authentic tech with warranty and fast Lebanon delivery.`
            : `Browse matching electronics for "${q}" at ${storeName} with official warranty and Lebanon delivery.`
        );
      } else if (params.activeCategory) {
        const catTitle =
          params.lang === 'ar' ? params.activeCategory.nameAr : params.activeCategory.name;
        const countLabel = matchingSlice.length > 0 ? `${matchingSlice.length} ` : '';
        pageTitle = `${catTitle} in Lebanon | ${storeName}`;
        metaDescription = truncateMetaDescription(
          sampleNames
            ? `Explore ${countLabel}${catTitle} at ${storeName} — including ${sampleNames}. Official warranty and fast delivery across Lebanon.`
            : `Browse genuine ${catTitle} online at ${storeName} with official warranty and fast delivery to all Lebanon.`
        );
      } else if (params.selectedBrandName) {
        pageTitle = `${params.selectedBrandName} Tech & Devices | ${storeName}`;
        metaDescription = truncateMetaDescription(
          sampleNames
            ? `Shop official ${params.selectedBrandName} gear at ${storeName} (${sampleNames}). 100% genuine warranty & Lebanon delivery.`
            : `Explore official ${params.selectedBrandName} devices and accessories at ${storeName} with warranty and Lebanon delivery.`
        );
      } else {
        pageTitle = `All Electronics & Tech Catalog | ${storeName}`;
        metaDescription = truncateMetaDescription(
          sampleNames
            ? `Browse ${publishedProducts.length} genuine tech products at ${storeName} — featuring ${sampleNames}. Official warranty & Lebanon delivery.`
            : `Explore our comprehensive online catalog of smartphones, laptops, GaN chargers, and tech accessories with delivery to all Lebanon.`
        );
      }
      canonicalUrl = `${cleanOrigin}/#/products`;
      break;
    }

    case 'categories':
      pageTitle = `All ${params.categories.length} Electronic Departments | ${storeName}`;
      metaDescription = truncateMetaDescription(
        `Discover ${params.categories.length} electronics departments & ${publishedProducts.length} stocked items at ${storeName}: smartphones, GaN chargers, gaming gear & audio.`
      );
      canonicalUrl = `${cleanOrigin}/#/categories`;
      break;

    case 'brands':
      pageTitle = `Authorized Tech Brands | Apple, Samsung, Xiaomi, Anker | ${storeName}`;
      metaDescription = truncateMetaDescription(
        `Shop ${params.brands?.length || 12}+ top electronics brands at ${storeName} in Lebanon: Apple, Samsung, Xiaomi, Anker, JBL & Baseus with official warranty.`
      );
      canonicalUrl = `${cleanOrigin}/#/brands`;
      break;

    case 'offers': {
      const offerProducts = selectInventoryProductsForSchema(params.products, {
        currentView: 'offers',
        maxItems: 24,
      });
      const offerSample = summarizeTopProductNames(offerProducts, params.lang, 2);
      const maxDiscount = offerProducts.reduce((best, p) => {
        const pct =
          p.discountPercentage ||
          (p.originalPrice > p.price
            ? Math.round(((p.originalPrice - p.price) / p.originalPrice) * 100)
            : 0);
        return Math.max(best, pct);
      }, 0);
      pageTitle = `Exclusive Tech Offers & Flash Deals | ${storeName}`;
      metaDescription = truncateMetaDescription(
        offerSample
          ? `Save${maxDiscount > 0 ? ` up to ${maxDiscount}%` : ''} on ${offerProducts.length} live deals at ${storeName}: ${offerSample}. Fast Lebanon delivery.`
          : `Curated daily discounts and flash deals on flagship smartphones, power banks, and tech accessories at ${storeName} across Lebanon.`
      );
      canonicalUrl = `${cleanOrigin}/#/offers`;
      break;
    }

    case 'services':
      pageTitle = `Touch Telecom & Whish Money Hub | ${storeName}`;
      metaDescription = truncateMetaDescription(
        `Official telecom and Whish Money support at ${storeName} (Chouf): Touch & Alfa line renewal and digital wallet help open 10:00 AM – 1:00 AM.`
      );
      canonicalUrl = `${cleanOrigin}/#/services`;
      break;

    case 'track-order':
      pageTitle = `Track Your Order | All Lebanon Delivery | ${storeName}`;
      metaDescription = truncateMetaDescription(
        `Track your ${storeName} order in real time. Enter your order ID (e.g., OAA-2027-1001) for instant courier updates across all Lebanon.`
      );
      canonicalUrl = `${cleanOrigin}/#/track-order`;
      break;

    case 'cart':
    case 'checkout':
      pageTitle = `Secure Fresh Cash Checkout | ${storeName}`;
      metaDescription = truncateMetaDescription(
        `Complete your ${storeName} electronics purchase with Cash on Delivery or Whish Money. Dispatched from Chouf across Lebanon.`
      );
      canonicalUrl = `${cleanOrigin}/#/checkout`;
      robots = 'noindex, nofollow';
      break;

    case 'admin':
      pageTitle = `Central Management Portal | ${storeName}`;
      metaDescription = truncateMetaDescription(
        `${storeName} Central Management & Inventory Control Portal.`
      );
      canonicalUrl = `${cleanOrigin}/#/admin`;
      robots = 'noindex, nofollow';
      break;

    case 'contact':
      pageTitle = `Contact Online Store (Chouf) | ${storeName} (70 773 067)`;
      metaDescription = truncateMetaDescription(
        `Contact ${storeName} in Chouf for Lebanon-wide tech delivery. Open 10:00 AM – 1:00 AM daily. Call or WhatsApp 70 773 067.`
      );
      canonicalUrl = `${cleanOrigin}/#/contact`;
      break;

    default: {
      const featuredNames = summarizeTopProductNames(
        selectInventoryProductsForSchema(params.products, {
          currentView: 'home',
          maxItems: 4,
        }),
        params.lang,
        2
      );
      pageTitle = `${storeName} | Online Tech Store Based in Chouf • All Lebanon Delivery`;
      metaDescription = truncateMetaDescription(
        featuredNames
          ? `Shop ${publishedProducts.length} authentic tech products at ${storeName} (Chouf): ${featuredNames} & more with official warranty across Lebanon.`
          : `Premier online electronics store based in Chouf, Lebanon. Flagship smartphones, GaN fast chargers, audio gear, and delivery to all Lebanon.`
      );
      canonicalUrl = `${cleanOrigin}/`;
      break;
    }
  }

  return {
    pageTitle,
    metaDescription,
    canonicalUrl,
    ogType,
    ogImage: ogImage.url,
    ogImageAlt: ogImage.alt,
    robots,
  };
}
