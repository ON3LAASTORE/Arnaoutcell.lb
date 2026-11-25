import React, { useEffect } from 'react';
import { useShop } from '../context/ShopContext';
import { resolveStoreLogoUrl } from '../utils/storeSettingsHelpers';
import { buildStructuredDataGraph } from '../utils/seoSchemaHelpers';
import { buildRouteSeoMetadata } from '../utils/seoMetaHelpers';

export const SEOHead: React.FC = () => {
  const {
    currentView,
    selectedProductId,
    selectedCategorySlug,
    selectedBrandName,
    searchQuery,
    lang,
    products,
    categories,
    brands,
    storeSettings,
  } = useShop();

  useEffect(() => {
    if (typeof document === 'undefined') return;

    const origin = window.location.origin;
    const storeName = storeSettings.storeName || 'ON ALAA STORE';
    const activeProduct = selectedProductId
      ? products.find((p) => p.id === selectedProductId)
      : undefined;
    const activeCategory = selectedCategorySlug
      ? categories.find((c) => c.slug === selectedCategorySlug)
      : undefined;
    const logoUrl = resolveStoreLogoUrl(storeSettings.logoUrl);

    const seo = buildRouteSeoMetadata({
      currentView,
      activeProduct,
      activeCategory,
      selectedBrandName,
      searchQuery,
      products,
      categories,
      brands,
      lang,
      storeName,
      logoUrl,
      origin,
      pathname: window.location.pathname,
    });

    // 1. Synchronize Document Title & Global Language Attribute
    document.documentElement.lang = lang;
    document.title = seo.pageTitle;

    // 2. Helper to update, create, or remove meta tags
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
    setMetaTag('name', 'robots', seo.robots);
    setMetaTag('name', 'description', seo.metaDescription);
    setMetaTag('property', 'og:title', seo.pageTitle);
    setMetaTag('property', 'og:description', seo.metaDescription);
    setMetaTag('property', 'og:locale', lang === 'ar' ? 'ar_LB' : 'en_US');
    setMetaTag('property', 'og:type', seo.ogType);
    setMetaTag('property', 'og:url', seo.canonicalUrl);
    setMetaTag('property', 'og:image', seo.ogImage);
    setMetaTag('property', 'og:image:alt', seo.ogImageAlt);
    if (seo.ogImage.startsWith('https://')) {
      setMetaTag('property', 'og:image:secure_url', seo.ogImage);
    } else {
      removeMetaTag('property', 'og:image:secure_url');
    }
    setMetaTag('property', 'og:site_name', storeName);
    setMetaTag('name', 'twitter:card', 'summary_large_image');
    setMetaTag('name', 'twitter:title', seo.pageTitle);
    setMetaTag('name', 'twitter:description', seo.metaDescription);
    setMetaTag('name', 'twitter:image', seo.ogImage);
    setMetaTag('name', 'twitter:image:alt', seo.ogImageAlt);

    if (currentView === 'product-detail' && activeProduct) {
      setMetaTag('property', 'product:price:amount', Number(activeProduct.price).toFixed(2));
      setMetaTag('property', 'product:price:currency', 'USD');
      setMetaTag(
        'property',
        'product:availability',
        activeProduct.stock > 0 ? 'in stock' : 'out of stock'
      );
      setMetaTag('property', 'product:brand', activeProduct.brand);
      setMetaTag('property', 'product:category', activeProduct.category);
      setMetaTag('property', 'product:condition', 'new');
      if (activeProduct.sku) {
        setMetaTag('property', 'product:retailer_item_id', activeProduct.sku);
      } else {
        removeMetaTag('property', 'product:retailer_item_id');
      }
    } else {
      removeMetaTag('property', 'product:price:amount');
      removeMetaTag('property', 'product:price:currency');
      removeMetaTag('property', 'product:availability');
      removeMetaTag('property', 'product:brand');
      removeMetaTag('property', 'product:category');
      removeMetaTag('property', 'product:condition');
      removeMetaTag('property', 'product:retailer_item_id');
    }

    // 3. Update Canonical Link
    let canonicalLink = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!canonicalLink) {
      canonicalLink = document.createElement('link');
      canonicalLink.setAttribute('rel', 'canonical');
      document.head.appendChild(canonicalLink);
    }
    canonicalLink.setAttribute('href', seo.canonicalUrl);

    // 4. Schema.org JSON-LD Structured Data (Product + Inventory ItemList + Store)
    const schemaJson = buildStructuredDataGraph({
      currentView,
      activeProduct,
      products,
      activeCategory,
      selectedBrandName,
      lang,
      storeSettings,
      origin,
      metaDescription: seo.metaDescription,
      canonicalUrl: seo.canonicalUrl,
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
    searchQuery,
    lang,
    products,
    categories,
    brands,
    storeSettings,
  ]);

  return null;
};
