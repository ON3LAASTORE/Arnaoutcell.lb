import { Category, Language, Product, StoreSettings } from '../types';
import { getProductColorNames, isStructuredColorOption } from './colorVariantHelpers';

export interface ProductSchemaBuildOptions {
  origin: string;
  storeName: string;
  lang: Language;
  fallbackImage?: string;
}

export interface StructuredDataGraphParams {
  currentView: string;
  activeProduct?: Product;
  products: Product[];
  activeCategory?: Category;
  selectedBrandName?: string | null;
  lang: Language;
  storeSettings: StoreSettings;
  origin: string;
  metaDescription: string;
  canonicalUrl: string;
  logoUrl: string;
}

const VALID_GTIN_REGEX = /^\d{8}(\d{4,6})?$/;

export function resolveSchemaUrl(url: string | undefined, origin: string): string | undefined {
  if (!url || typeof url !== 'string') return undefined;
  const trimmed = url.trim();
  if (!trimmed || trimmed.startsWith('data:')) return undefined;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (trimmed.startsWith('//')) return `https:${trimmed}`;
  const cleanOrigin = origin.replace(/\/+$/, '');
  return trimmed.startsWith('/') ? `${cleanOrigin}${trimmed}` : `${cleanOrigin}/${trimmed}`;
}

export function collectProductSchemaImages(
  product: Product,
  origin: string,
  fallbackImage?: string
): string[] {
  const seen = new Set<string>();
  const add = (candidate?: string) => {
    const resolved = resolveSchemaUrl(candidate, origin);
    if (resolved && !seen.has(resolved)) {
      seen.add(resolved);
    }
  };

  if (Array.isArray(product.images)) {
    product.images.forEach(add);
  }
  if (Array.isArray(product.colors)) {
    product.colors.forEach((entry) => {
      if (isStructuredColorOption(entry) && entry.imageUrl) {
        add(entry.imageUrl);
      }
    });
  }
  if (product.colorImages && typeof product.colorImages === 'object') {
    Object.values(product.colorImages).forEach(add);
  }
  if (Array.isArray(product.variants)) {
    product.variants.forEach((v) => add(v.image));
  }
  if (seen.size === 0 && fallbackImage) {
    add(fallbackImage);
  }
  return Array.from(seen);
}

export function buildProductOfferSchema(
  product: Product,
  options: ProductSchemaBuildOptions
): Record<string, unknown> {
  const cleanOrigin = options.origin.replace(/\/+$/, '');
  const productUrl = `${cleanOrigin}/#/product/${product.id}`;
  const priceValidUntil =
    product.offerExpiresAt && /^\d{4}-\d{2}-\d{2}/.test(product.offerExpiresAt)
      ? product.offerExpiresAt.slice(0, 10)
      : '2027-12-31';

  return {
    '@type': 'Offer',
    url: productUrl,
    priceCurrency: 'USD',
    price: Number(Number(product.price || 0).toFixed(2)),
    priceValidUntil,
    itemCondition: 'https://schema.org/NewCondition',
    availability:
      product.stock > 0
        ? 'https://schema.org/InStock'
        : 'https://schema.org/OutOfStock',
    seller: {
      '@type': 'ElectronicsStore',
      '@id': `${cleanOrigin}/#organization`,
      name: options.storeName,
    },
    shippingDetails: {
      '@type': 'OfferShippingDetails',
      shippingDestination: {
        '@type': 'DefinedRegion',
        addressCountry: 'LB',
      },
      deliveryTime: {
        '@type': 'ShippingDeliveryTime',
        handlingTime: {
          '@type': 'QuantitativeValue',
          minValue: 0,
          maxValue: 1,
          unitCode: 'DAY',
        },
        transitTime: {
          '@type': 'QuantitativeValue',
          minValue: 1,
          maxValue: 2,
          unitCode: 'DAY',
        },
      },
    },
    hasMerchantReturnPolicy: {
      '@type': 'MerchantReturnPolicy',
      applicableCountry: 'LB',
      returnPolicyCategory: 'https://schema.org/MerchantReturnFiniteReturnWindow',
      merchantReturnDays: 3,
      returnMethod: 'https://schema.org/ReturnInStore',
    },
  };
}

export function buildProductSchema(
  product: Product,
  options: ProductSchemaBuildOptions
): Record<string, unknown> {
  const cleanOrigin = options.origin.replace(/\/+$/, '');
  const productUrl = `${cleanOrigin}/#/product/${product.id}`;
  const localizedName =
    options.lang === 'ar' ? product.nameAr || product.name : product.name;
  const localizedDescription =
    options.lang === 'ar'
      ? product.descriptionAr || product.description
      : product.description;

  const images = collectProductSchemaImages(product, cleanOrigin, options.fallbackImage);

  const schema: Record<string, unknown> = {
    '@type': 'Product',
    '@id': `${productUrl}#product`,
    name: localizedName,
    url: productUrl,
    description:
      localizedDescription ||
      `${product.name} by ${product.brand} — Genuine electronics with official warranty from ${options.storeName}.`,
    sku: product.sku,
    mpn: product.id,
    category: product.subcategory
      ? `${product.category} > ${product.subcategory}`
      : product.category,
    brand: {
      '@type': 'Brand',
      name: product.brand,
    },
    offers: buildProductOfferSchema(product, options),
  };

  if (images.length > 0) {
    schema.image = images;
  }

  if (product.barcode && VALID_GTIN_REGEX.test(product.barcode.trim())) {
    schema.gtin = product.barcode.trim();
  }

  const colorNames = getProductColorNames(product);
  if (colorNames.length > 0) {
    schema.color = colorNames.length === 1 ? colorNames[0] : colorNames;
  }

  if (Array.isArray(product.specifications) && product.specifications.length > 0) {
    schema.additionalProperty = product.specifications.slice(0, 20).map((spec) => ({
      '@type': 'PropertyValue',
      ...(spec.group ? { propertyID: spec.group } : {}),
      name: spec.label,
      value: spec.value,
    }));
  }

  const storedReviews = Array.isArray(product.reviews) ? product.reviews : [];
  const effectiveReviewCount = Math.max(
    Number(product.reviewCount) || 0,
    storedReviews.length
  );

  if (effectiveReviewCount > 0) {
    schema.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: Number(Number(product.rating || 5).toFixed(1)),
      reviewCount: effectiveReviewCount,
      bestRating: 5,
      worstRating: 1,
    };
  }

  if (storedReviews.length > 0) {
    schema.review = storedReviews.slice(0, 10).map((rev) => ({
      '@type': 'Review',
      author: {
        '@type': 'Person',
        name: rev.userName || 'Verified Customer',
      },
      datePublished: rev.date,
      reviewBody: rev.comment,
      reviewRating: {
        '@type': 'Rating',
        ratingValue: Math.min(5, Math.max(1, Number(rev.rating) || 5)),
        bestRating: 5,
        worstRating: 1,
      },
    }));
  }

  return schema;
}

export function selectInventoryProductsForSchema(
  products: Product[],
  options: {
    currentView: string;
    activeCategory?: Category;
    selectedBrandName?: string | null;
    maxItems?: number;
  }
): Product[] {
  const maxItems = options.maxItems ?? 24;
  let list = products.filter((p) => p.isPublished !== false);

  if (options.currentView === 'offers') {
    const discounted = list.filter(
      (p) => p.isSpecialOffer || (p.discountPercentage || 0) > 0 || p.originalPrice > p.price
    );
    if (discounted.length > 0) list = discounted;
  } else if (options.currentView === 'products') {
    if (options.activeCategory) {
      const catMatches = list.filter(
        (p) => p.category.toLowerCase() === options.activeCategory!.name.toLowerCase()
      );
      if (catMatches.length > 0) list = catMatches;
    }
    if (options.selectedBrandName) {
      const brandMatches = list.filter(
        (p) => p.brand.toLowerCase() === options.selectedBrandName!.toLowerCase()
      );
      if (brandMatches.length > 0) list = brandMatches;
    }
  }

  const prioritized = [...list].sort((a, b) => {
    const score = (p: Product) =>
      (p.isFeatured ? 4 : 0) + (p.isBestSeller ? 2 : 0) + (p.stock > 0 ? 1 : 0);
    return score(b) - score(a);
  });

  return prioritized.slice(0, maxItems);
}

export function buildInventoryItemListSchema(
  products: Product[],
  options: ProductSchemaBuildOptions & { listName: string; listUrl: string }
): Record<string, unknown> {
  const cleanOrigin = options.origin.replace(/\/+$/, '');
  return {
    '@type': 'ItemList',
    '@id': `${options.listUrl}#inventory`,
    name: options.listName,
    numberOfItems: products.length,
    itemListOrder: 'https://schema.org/ItemListOrderDescending',
    itemListElement: products.map((product, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      url: `${cleanOrigin}/#/product/${product.id}`,
      item: buildProductSchema(product, options),
    })),
  };
}

export function buildStructuredDataGraph(
  params: StructuredDataGraphParams
): Record<string, unknown> {
  const cleanOrigin = params.origin.replace(/\/+$/, '');
  const storeName = params.storeSettings.storeName || 'ON AlAA STORE';
  const resolvedLogo = resolveSchemaUrl(params.logoUrl, cleanOrigin) || `${cleanOrigin}/on-alaa-store-profile.png`;

  const organizationNode: Record<string, unknown> = {
    '@type': 'ElectronicsStore',
    '@id': `${cleanOrigin}/#organization`,
    inLanguage: params.lang,
    name: storeName,
    alternateName: params.storeSettings.storeNameAr || 'متجر ON AlAA STORE',
    description: params.metaDescription,
    url: cleanOrigin,
    telephone: '+96170773067',
    priceRange: '$$',
    image: resolvedLogo,
    logo: resolvedLogo,
    address: {
      '@type': 'PostalAddress',
      addressLocality: 'Chouf',
      addressRegion: 'Mount Lebanon',
      addressCountry: 'LB',
    },
    areaServed: {
      '@type': 'Country',
      name: 'Lebanon',
    },
    openingHoursSpecification: [
      {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: [
          'Monday',
          'Tuesday',
          'Wednesday',
          'Thursday',
          'Friday',
          'Saturday',
          'Sunday',
        ],
        opens: params.storeSettings.openingSchedule?.openTime || '10:00',
        closes: params.storeSettings.openingSchedule?.closeTime || '01:00',
      },
    ],
    paymentAccepted: 'Cash on Delivery, Whish Money',
    currenciesAccepted: 'USD, LBP',
  };

  const websiteNode: Record<string, unknown> = {
    '@type': 'WebSite',
    '@id': `${cleanOrigin}/#website`,
    url: cleanOrigin,
    name: storeName,
    inLanguage: params.lang,
    publisher: {
      '@id': `${cleanOrigin}/#organization`,
    },
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${cleanOrigin}/#/products?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  };

  const graph: Record<string, unknown>[] = [organizationNode, websiteNode];

  const schemaOptions: ProductSchemaBuildOptions = {
    origin: cleanOrigin,
    storeName,
    lang: params.lang,
    fallbackImage: resolvedLogo,
  };

  if (params.currentView === 'product-detail' && params.activeProduct) {
    const productNode = buildProductSchema(params.activeProduct, schemaOptions);
    graph.push(productNode);

    graph.push({
      '@type': 'BreadcrumbList',
      itemListElement: [
        {
          '@type': 'ListItem',
          position: 1,
          name: storeName,
          item: `${cleanOrigin}/`,
        },
        {
          '@type': 'ListItem',
          position: 2,
          name: params.activeProduct.category,
          item: `${cleanOrigin}/#/products`,
        },
        {
          '@type': 'ListItem',
          position: 3,
          name:
            params.lang === 'ar'
              ? params.activeProduct.nameAr || params.activeProduct.name
              : params.activeProduct.name,
          item: params.canonicalUrl,
        },
      ],
    });
  } else {
    const inventorySlice = selectInventoryProductsForSchema(params.products, {
      currentView: params.currentView,
      activeCategory: params.activeCategory,
      selectedBrandName: params.selectedBrandName,
      maxItems: 24,
    });

    if (inventorySlice.length > 0) {
      const listName = params.activeCategory
        ? `${params.activeCategory.name} — ${storeName}`
        : params.selectedBrandName
        ? `${params.selectedBrandName} Inventory — ${storeName}`
        : params.currentView === 'offers'
        ? `Special Offers & Tech Deals — ${storeName}`
        : `${storeName} Electronics Inventory`;

      graph.push(
        buildInventoryItemListSchema(inventorySlice, {
          ...schemaOptions,
          listName,
          listUrl: params.canonicalUrl,
        })
      );
    }
  }

  return {
    '@context': 'https://schema.org',
    '@graph': graph,
  };
}
