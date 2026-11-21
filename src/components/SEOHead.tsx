import React, { useEffect } from 'react';
import { useShop } from '../context/ShopContext';
import { resolveStoreLogoUrl } from '../utils/storeSettingsHelpers';
import { buildStructuredDataGraph, resolveSchemaUrl } from '../utils/seoSchemaHelpers';

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

    const origin = window.location.origin;
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
    let canonicalUrl = origin + window.location.pathname;
    let ogType = 'website';
    const logoUrl = resolveStoreLogoUrl(storeSettings.logoUrl);
    let ogImage = resolveSchemaUrl(logoUrl, origin) || `${origin}/on-alaa-store-profile.png`;

    // 1. Dynamic Titles & Descriptions by Route/View
    switch (currentView) {
      case 'product-detail':
        if (activeProduct) {
          const prodTitle = lang === 'ar' ? (activeProduct.nameAr || activeProduct.name) : activeProduct.name;
          pageTitle = `${prodTitle} | ${activeProduct.brand} – ${storeName}`;
          metaDescription = lang === 'ar'
            ? `اشتري ${prodTitle} أونلاين من ${storeName} في الشوف. جهاز أصلي مع كفالة رسمية وسعر $${activeProduct.price} مع خدمة توصيل متاحة لجميع مناطق لبنان.`
            : `Buy ${activeProduct.name} by ${activeProduct.brand} online from ${storeName} based in Chouf. Genuine stock with official warranty, starting at $${activeProduct.price} fresh USD with delivery available to all Lebanon.`;
          canonicalUrl = `${origin}/#/product/${activeProduct.id}`;
          ogType = 'product';
          const firstResolved =
            activeProduct.images && activeProduct.images.length > 0
              ? resolveSchemaUrl(activeProduct.images[0], origin)
              : undefined;
          if (firstResolved) {
            ogImage = firstResolved;
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
        canonicalUrl = `${origin}/#/products`;
        break;

      case 'categories':
        pageTitle = `All ${categories.length} Electronic Departments | ${storeName}`;
        metaDescription = `Discover all ${categories.length} specialized electronic and tech categories at ${storeName}. Online store based in Chouf delivering smartphones, GaN chargers, gaming gear, and audio to all Lebanon.`;
        canonicalUrl = `${origin}/#/categories`;
        break;

      case 'brands':
        pageTitle = `Authorized Tech Brands | Apple, Samsung, Xiaomi, Anker | ${storeName}`;
        metaDescription = `Shop top global electronics brands in Lebanon: Apple, Samsung, Xiaomi, Anker, JBL, Baseus, and more. 100% genuine products delivered to all Lebanon.`;
        canonicalUrl = `${origin}/#/brands`;
        break;

      case 'offers':
        pageTitle = `Exclusive Tech Offers & Flash Deals | ${storeName}`;
        metaDescription = `Curated daily discounts and special offers on flagship smartphones, power banks, and accessories. Order online from our Chouf store with delivery across all Lebanon.`;
        canonicalUrl = `${origin}/#/offers`;
        break;

      case 'services':
        pageTitle = `Touch Telecom & Whish Money Hub | ${storeName}`;
        metaDescription = `Official digital wallet and telecom support at ${storeName} (Chouf): Touch & Alfa line renewal and Whish Money assistance open 10:00 AM – 1:00 AM daily.`;
        canonicalUrl = `${origin}/#/services`;
        break;

      case 'track-order':
        pageTitle = `Track Your Order | All Lebanon Delivery | ${storeName}`;
        metaDescription = `Track your order in real-time. Enter your order ID (e.g., OAA-2027-1001) for instant fulfillment status and courier updates across all Lebanon.`;
        canonicalUrl = `${origin}/#/track-order`;
        break;

      case 'cart':
      case 'checkout':
        pageTitle = `Secure Fresh Cash Checkout | ${storeName}`;
        metaDescription = `Complete your electronics purchase with Cash on Delivery (COD) or Whish Money. Dispatched from Chouf with delivery available to all Lebanon.`;
        canonicalUrl = `${origin}/#/checkout`;
        break;

      case 'contact':
        pageTitle = `Contact Online Store (Chouf) | ${storeName} (70 773 067)`;
        metaDescription = `Contact ${storeName} — Online Store based in Chouf with delivery available to all Lebanon. Open 10:00 AM - 1:00 AM daily. Call or WhatsApp 70 773 067.`;
        canonicalUrl = `${origin}/#/contact`;
        break;

      default:
        pageTitle = `${storeName} | Online Tech Store Based in Chouf • All Lebanon Delivery`;
        metaDescription = `Premier online electronics store based in Chouf, Lebanon. Flagship smartphones, GaN fast chargers, audio gear, and delivery available to all Lebanon. Call or WhatsApp 70 773 067.`;
        canonicalUrl = `${origin}/`;
        break;
    }

    // 2. Synchronize Document Title & Global Language Attribute
    document.documentElement.lang = lang;
    document.title = pageTitle;

    // 3. Helper to update, create, or remove meta tags
    const setMetaTag = (attr: 'name' | 'property' | 'http-equiv', key: string, content: string) => {
      let element = document.querySelector(`meta[${attr}="${key}"]`);
      if (!element) {
        element = document.createElement('meta');
        element.setAttribute(attr, key);
        document.head.appendChild(element);
      }
      element.setAttribute('content', content);
    };

    const removeMetaTag = (attr: 'name' | 'property', key: string) => {
      const element = document.querySelector(`meta[${attr}="${key}"]`);
      if (element) {
        element.remove();
      }
    };

    setMetaTag('http-equiv', 'content-language', lang);
    setMetaTag('name', 'description', metaDescription);
    setMetaTag('property', 'og:title', pageTitle);
    setMetaTag('property', 'og:description', metaDescription);
    setMetaTag('property', 'og:locale', lang === 'ar' ? 'ar_LB' : 'en_US');
    setMetaTag('property', 'og:type', ogType);
    setMetaTag('property', 'og:url', canonicalUrl);
    setMetaTag('property', 'og:image', ogImage);
    setMetaTag('property', 'og:site_name', storeName);
    setMetaTag('name', 'twitter:card', 'summary_large_image');
    setMetaTag('name', 'twitter:title', pageTitle);
    setMetaTag('name', 'twitter:description', metaDescription);
    setMetaTag('name', 'twitter:image', ogImage);

    if (currentView === 'product-detail' && activeProduct) {
      setMetaTag('property', 'product:price:amount', Number(activeProduct.price).toFixed(2));
      setMetaTag('property', 'product:price:currency', 'USD');
      setMetaTag(
        'property',
        'product:availability',
        activeProduct.stock > 0 ? 'in stock' : 'out of stock'
      );
      setMetaTag('property', 'product:brand', activeProduct.brand);
    } else {
      removeMetaTag('property', 'product:price:amount');
      removeMetaTag('property', 'product:price:currency');
      removeMetaTag('property', 'product:availability');
      removeMetaTag('property', 'product:brand');
    }

    // 4. Update Canonical Link
    let canonicalLink = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!canonicalLink) {
      canonicalLink = document.createElement('link');
      canonicalLink.setAttribute('rel', 'canonical');
      document.head.appendChild(canonicalLink);
    }
    canonicalLink.setAttribute('href', canonicalUrl);

    // 5. Schema.org JSON-LD Structured Data (Product + Inventory ItemList + Store)
    const schemaJson = buildStructuredDataGraph({
      currentView,
      activeProduct,
      products,
      activeCategory,
      selectedBrandName,
      lang,
      storeSettings,
      origin,
      metaDescription,
      canonicalUrl,
      logoUrl,
    });

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
