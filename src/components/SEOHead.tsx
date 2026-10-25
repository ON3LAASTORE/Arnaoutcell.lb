import React, { useEffect } from 'react';
import { useShop } from '../context/ShopContext';
import { Product } from '../types';

export const SEOHead: React.FC = () => {
  const {
    currentView,
    selectedProductId,
    selectedCategorySlug,
    selectedBrandName,
    lang,
    products,
    categories,
    storeSettings,
  } = useShop();

  useEffect(() => {
    if (typeof document === 'undefined') return;

    const storeName = storeSettings.storeName || 'ARNAOUT STORE';
    const activeProduct = selectedProductId
      ? products.find((p) => p.id === selectedProductId)
      : undefined;
    const activeCategory = selectedCategorySlug
      ? categories.find((c) => c.slug === selectedCategorySlug)
      : undefined;

    let pageTitle = `${storeName} | Your Home in Electronics 🏠`;
    let metaDescription =
      "Lebanon's premier tech and electronics destination in Saida. Shop authentic smartphones, laptops, GaN fast chargers, audio gear, and certified store services with fast nationwide delivery.";
    let canonicalUrl = window.location.origin + window.location.pathname;
    let ogType = 'website';
    let ogImage =
      'https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=1200&auto=format&fit=crop&q=80';

    // 1. Dynamic Titles & Descriptions by Route/View
    switch (currentView) {
      case 'product-detail':
        if (activeProduct) {
          const prodTitle = lang === 'ar' ? (activeProduct.nameAr || activeProduct.name) : activeProduct.name;
          pageTitle = `${prodTitle} | ${activeProduct.brand} – ${storeName} Lebanon`;
          metaDescription = lang === 'ar'
            ? `اشتري ${prodTitle} من ${storeName} صيدا. جهاز أصلي مع كفالة رسمية وسعر $${activeProduct.price} مع خدمة التوصيل السريع لكافة المناطق اللبنانية.`
            : `Buy ${activeProduct.name} by ${activeProduct.brand} at ${storeName} in Saida. Genuine stock with official store warranty, starting at $${activeProduct.price} fresh USD. Delivery across Lebanon.`;
          canonicalUrl = `${window.location.origin}/#/product/${activeProduct.id}`;
          ogType = 'product';
          if (activeProduct.images && activeProduct.images.length > 0) {
            ogImage = activeProduct.images[0];
          }
        }
        break;

      case 'products':
        if (activeCategory) {
          pageTitle = `${lang === 'ar' ? activeCategory.nameAr : activeCategory.name} in Lebanon | ${storeName}`;
          metaDescription = `Browse the latest ${activeCategory.name} in Lebanon at ${storeName}. Official warranty, competitive fresh cash prices, and fast dispatch across all governorates.`;
        } else if (selectedBrandName) {
          pageTitle = `${selectedBrandName} Tech & Devices | ${storeName} Saida Lebanon`;
          metaDescription = `Explore official ${selectedBrandName} devices, accessories, and gear in Lebanon. 100% genuine with local warranty and express delivery.`;
        } else {
          pageTitle = `All Electronics & Tech Catalog | ${storeName} Saida Lebanon`;
          metaDescription = `Explore our comprehensive catalog of 2027 smartphones, chargers, laptops, gaming gear, and tech accessories with nationwide Lebanon delivery.`;
        }
        canonicalUrl = `${window.location.origin}/#/products`;
        break;

      case 'categories':
        pageTitle = `All 35 Electronic Departments | ${storeName} Saida`;
        metaDescription = `Discover all 35 specialized electronic and tech categories at ${storeName}. Smartphones, GaN chargers, gaming gear, audio, and certified OMT services in Saida.`;
        canonicalUrl = `${window.location.origin}/#/categories`;
        break;

      case 'brands':
        pageTitle = `Authorized Tech Brands | Apple, Samsung, Xiaomi, Anker | ${storeName}`;
        metaDescription = `Shop top global electronics brands in Lebanon: Apple, Samsung, Xiaomi, Anker, JBL, Baseus, and more. 100% genuine products with manufacturer warranty.`;
        canonicalUrl = `${window.location.origin}/#/brands`;
        break;

      case 'offers':
        pageTitle = `Exclusive Tech Offers & Flash Deals | ${storeName} Lebanon`;
        metaDescription = `Curated daily discounts and special offers on flagship smartphones, power banks, and accessories. Save big with express delivery across Lebanon.`;
        canonicalUrl = `${window.location.origin}/#/offers`;
        break;

      case 'services':
        pageTitle = `Touch Telecom, OMT & Whish Money Hub | ${storeName} Saida`;
        metaDescription = `Official financial and telecom services in Saida: Touch line renewal, cash deposits, Western Union, OMT, and Whish Money services open 8:00 AM – 1:00 AM daily.`;
        canonicalUrl = `${window.location.origin}/#/services`;
        break;

      case 'track-order':
        pageTitle = `Track Your Order | Lebanon Express Delivery | ${storeName}`;
        metaDescription = `Track your order in real-time. Enter your order ID (e.g., ARN-2027-1001) for instant fulfillment status and Lebanese courier tracking updates.`;
        canonicalUrl = `${window.location.origin}/#/track-order`;
        break;

      case 'cart':
      case 'checkout':
        pageTitle = `Secure Fresh Cash Checkout | ${storeName} Lebanon`;
        metaDescription = `Complete your electronics purchase with Cash on Delivery (COD), Whish Money, or OMT. Fast express dispatch across all Lebanese governorates.`;
        canonicalUrl = `${window.location.origin}/#/checkout`;
        break;

      case 'contact':
        pageTitle = `Visit & Contact Saida Store | ${storeName} (81 900 916)`;
        metaDescription = `Contact ${storeName} located at Saida Nijme Square Main Road. Open 17 hours daily (8:00 AM - 1:00 AM). Call 81 900 916 or service line 03 099 899.`;
        canonicalUrl = `${window.location.origin}/#/contact`;
        break;

      default:
        pageTitle = `${storeName} | Your Home in Electronics 🏠 – Saida, Lebanon`;
        metaDescription = `Lebanon premier 2027 tech & electronics destination in Saida. Flagship smartphones, GaN fast chargers, audio gear, certified OMT services, and fast Lebanon-wide delivery.`;
        canonicalUrl = `${window.location.origin}/`;
        break;
    }

    // 2. Set Document Title
    document.title = pageTitle;

    // 3. Helper to update or create meta tags
    const setMetaTag = (attr: 'name' | 'property', key: string, content: string) => {
      let element = document.querySelector(`meta[${attr}="${key}"]`);
      if (!element) {
        element = document.createElement('meta');
        element.setAttribute(attr, key);
        document.head.appendChild(element);
      }
      element.setAttribute('content', content);
    };

    setMetaTag('name', 'description', metaDescription);
    setMetaTag('property', 'og:title', pageTitle);
    setMetaTag('property', 'og:description', metaDescription);
    setMetaTag('property', 'og:type', ogType);
    setMetaTag('property', 'og:url', canonicalUrl);
    setMetaTag('property', 'og:image', ogImage);
    setMetaTag('property', 'og:site_name', storeName);
    setMetaTag('name', 'twitter:card', 'summary_large_image');
    setMetaTag('name', 'twitter:title', pageTitle);
    setMetaTag('name', 'twitter:description', metaDescription);
    setMetaTag('name', 'twitter:image', ogImage);

    // 4. Update Canonical Link
    let canonicalLink = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!canonicalLink) {
      canonicalLink = document.createElement('link');
      canonicalLink.setAttribute('rel', 'canonical');
      document.head.appendChild(canonicalLink);
    }
    canonicalLink.setAttribute('href', canonicalUrl);

    // 5. Schema.org JSON-LD Structured Data
    let schemaJson: Record<string, unknown>;

    if (currentView === 'product-detail' && activeProduct) {
      // Product Schema
      schemaJson = {
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: activeProduct.name,
        image: activeProduct.images || [ogImage],
        description: activeProduct.description,
        sku: activeProduct.sku,
        mpn: activeProduct.id,
        brand: {
          '@type': 'Brand',
          name: activeProduct.brand,
        },
        offers: {
          '@type': 'Offer',
          url: canonicalUrl,
          priceCurrency: 'USD',
          price: activeProduct.price,
          priceValidUntil: '2027-12-31',
          itemCondition: 'https://schema.org/NewCondition',
          availability: activeProduct.stock > 0
            ? 'https://schema.org/InStock'
            : 'https://schema.org/OutOfStock',
          seller: {
            '@type': 'ElectronicsStore',
            name: storeName,
          },
        },
        aggregateRating: {
          '@type': 'AggregateRating',
          ratingValue: activeProduct.rating || 5.0,
          reviewCount: activeProduct.reviewCount || 1,
        },
      };
    } else {
      // Local Business / Electronics Store Schema
      schemaJson = {
        '@context': 'https://schema.org',
        '@type': 'ElectronicsStore',
        name: storeName,
        alternateName: 'أرناؤوط ستور',
        description: metaDescription,
        url: window.location.origin,
        telephone: '+96181900916',
        priceRange: '$$',
        image: ogImage,
        address: {
          '@type': 'PostalAddress',
          streetAddress: 'Nijme Square, Main Commercial Road',
          addressLocality: 'Saida',
          addressRegion: 'South Governorate',
          addressCountry: 'LB',
        },
        geo: {
          '@type': 'GeoCoordinates',
          latitude: 33.5631,
          longitude: 35.3725,
        },
        openingHoursSpecification: [
          {
            '@type': 'OpeningHoursSpecification',
            dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
            opens: '08:00',
            closes: '01:00',
          },
        ],
        paymentAccepted: 'Cash on Delivery, Whish Money, OMT, Western Union',
        currenciesAccepted: 'USD, LBP',
      };
    }

    let scriptTag = document.getElementById('schema-structured-data') as HTMLScriptElement | null;
    if (!scriptTag) {
      scriptTag = document.createElement('script');
      scriptTag.id = 'schema-structured-data';
      scriptTag.type = 'application/ld+json';
      document.head.appendChild(scriptTag);
    }
    scriptTag.textContent = JSON.stringify(schemaJson);
  }, [
    currentView,
    selectedProductId,
    selectedCategorySlug,
    selectedBrandName,
    lang,
    products,
    categories,
    storeSettings,
  ]);

  return null;
};
