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

    const storeName = storeSettings.storeName || 'ON AlAA STORE';
    const activeProduct = selectedProductId
      ? products.find((p) => p.id === selectedProductId)
      : undefined;
    const activeCategory = selectedCategorySlug
      ? categories.find((c) => c.slug === selectedCategorySlug)
      : undefined;

    let pageTitle = `${storeName} | Online Tech Store Based in Chouf • Delivery to All Lebanon`;
    let metaDescription =
      'Official ON AlAA STORE online electronics store based in Chouf. Shop authentic smartphones, laptops, GaN fast chargers, and audio gear with delivery available to all Lebanon.';
    let canonicalUrl = window.location.origin + window.location.pathname;
    let ogType = 'website';
    let ogImage =
      'https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=1200&auto=format&fit=crop&q=80';

    // 1. Dynamic Titles & Descriptions by Route/View
    switch (currentView) {
      case 'product-detail':
        if (activeProduct) {
          const prodTitle = lang === 'ar' ? (activeProduct.nameAr || activeProduct.name) : activeProduct.name;
          pageTitle = `${prodTitle} | ${activeProduct.brand} – ${storeName}`;
          metaDescription = lang === 'ar'
            ? `اشتري ${prodTitle} أونلاين من ${storeName} في الشوف. جهاز أصلي مع كفالة رسمية وسعر $${activeProduct.price} مع خدمة توصيل متاحة لجميع مناطق لبنان.`
            : `Buy ${activeProduct.name} by ${activeProduct.brand} online from ${storeName} based in Chouf. Genuine stock with official warranty, starting at $${activeProduct.price} fresh USD with delivery available to all Lebanon.`;
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
          metaDescription = `Browse the latest ${activeCategory.name} online at ${storeName} (based in Chouf). Official warranty, competitive fresh cash prices, and delivery available to all Lebanon.`;
        } else if (selectedBrandName) {
          pageTitle = `${selectedBrandName} Tech & Devices | ${storeName}`;
          metaDescription = `Explore official ${selectedBrandName} devices, accessories, and gear online at ${storeName}. 100% genuine with warranty and fast delivery across all Lebanon.`;
        } else {
          pageTitle = `All Electronics & Tech Catalog | ${storeName}`;
          metaDescription = `Explore our comprehensive online catalog of smartphones, chargers, laptops, gaming gear, and tech accessories based in Chouf with delivery available to all Lebanon.`;
        }
        canonicalUrl = `${window.location.origin}/#/products`;
        break;

      case 'categories':
        pageTitle = `All 35 Electronic Departments | ${storeName}`;
        metaDescription = `Discover all 35 specialized electronic and tech categories at ${storeName}. Online store based in Chouf delivering smartphones, GaN chargers, gaming gear, and audio to all Lebanon.`;
        canonicalUrl = `${window.location.origin}/#/categories`;
        break;

      case 'brands':
        pageTitle = `Authorized Tech Brands | Apple, Samsung, Xiaomi, Anker | ${storeName}`;
        metaDescription = `Shop top global electronics brands in Lebanon: Apple, Samsung, Xiaomi, Anker, JBL, Baseus, and more. 100% genuine products delivered to all Lebanon.`;
        canonicalUrl = `${window.location.origin}/#/brands`;
        break;

      case 'offers':
        pageTitle = `Exclusive Tech Offers & Flash Deals | ${storeName}`;
        metaDescription = `Curated daily discounts and special offers on flagship smartphones, power banks, and accessories. Order online from our Chouf store with delivery across all Lebanon.`;
        canonicalUrl = `${window.location.origin}/#/offers`;
        break;

      case 'services':
        pageTitle = `Touch Telecom & Whish Money Hub | ${storeName}`;
        metaDescription = `Official digital wallet and telecom support at ${storeName} (Chouf): Touch & Alfa line renewal and Whish Money assistance open 8:00 AM – 1:00 AM daily.`;
        canonicalUrl = `${window.location.origin}/#/services`;
        break;

      case 'track-order':
        pageTitle = `Track Your Order | All Lebanon Delivery | ${storeName}`;
        metaDescription = `Track your order in real-time. Enter your order ID (e.g., OAA-2027-1001) for instant fulfillment status and courier updates across all Lebanon.`;
        canonicalUrl = `${window.location.origin}/#/track-order`;
        break;

      case 'cart':
      case 'checkout':
        pageTitle = `Secure Fresh Cash Checkout | ${storeName}`;
        metaDescription = `Complete your electronics purchase with Cash on Delivery (COD), Whish Money, or OMT. Dispatched from Chouf with delivery available to all Lebanon.`;
        canonicalUrl = `${window.location.origin}/#/checkout`;
        break;

      case 'contact':
        pageTitle = `Contact Online Store (Chouf) | ${storeName} (03 986 718)`;
        metaDescription = `Contact ${storeName} — Online Store based in Chouf with delivery available to all Lebanon. Open 8:00 AM - 1:00 AM daily. Call or WhatsApp 03 986 718.`;
        canonicalUrl = `${window.location.origin}/#/contact`;
        break;

      default:
        pageTitle = `${storeName} | Online Tech Store Based in Chouf • All Lebanon Delivery`;
        metaDescription = `Premier online electronics store based in Chouf, Lebanon. Flagship smartphones, GaN fast chargers, audio gear, and delivery available to all Lebanon. Call or WhatsApp 03 986 718.`;
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
      // Online Electronics Store Schema
      schemaJson = {
        '@context': 'https://schema.org',
        '@type': 'ElectronicsStore',
        name: storeName,
        alternateName: 'ON AlAA STORE',
        description: metaDescription,
        url: window.location.origin,
        telephone: '+9613986718',
        priceRange: '$$',
        image: ogImage,
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
