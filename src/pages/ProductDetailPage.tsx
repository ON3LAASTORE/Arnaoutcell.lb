import React, { useState, useEffect } from 'react';
import { useShop } from '../context/ShopContext';
import { ProductCard } from '../components/ProductCard';
import { openExternalUrl } from '../utils/navigation';
import { addProductReview } from '../services/storageService';
import { RecentlyViewedCarousel } from '../components/RecentlyViewedCarousel';
import { ProductLuxuryShowcase } from '../components/ProductLuxuryShowcase';
import { ProductDetailAccordion } from '../components/ProductDetailAccordion';
import { Product, ProductVariant } from '../types';

export const ProductDetailPage: React.FC = () => {
  const {
    lang,
    t,
    products,
    categories,
    selectedProductId,
    addToCart,
    toggleWishlist,
    isInWishlist,
    setCurrentView,
    selectCategory,
    storeSettings,
    isInCompare,
    addToCompare,
    removeFromCompare,
    setIsCompareModalOpen,
    recordProductView,
    refreshData,
  } = useShop();

  const product = products.find((p) => p.id === selectedProductId) || products[0];

  const [copiedShare, setCopiedShare] = useState(false);

  // Review submission form state
  const [newReviewName, setNewReviewName] = useState('');
  const [newReviewRating, setNewReviewRating] = useState(5);
  const [newReviewComment, setNewReviewComment] = useState('');
  const [reviewSubmitted, setReviewSubmitted] = useState(false);

  useEffect(() => {
    setCopiedShare(false);
    setReviewSubmitted(false);
    if (product?.id) {
      recordProductView(product.id);
    }
  }, [product?.id]);

  if (!product) return null;

  const handleAddToCart = (
    prod: Product,
    qty: number,
    selectedColor?: string,
    selectedVariant?: ProductVariant
  ) => {
    addToCart(prod, qty, selectedColor, selectedVariant);
  };

  const handleDirectOrder = (
    prod: Product,
    qty: number,
    selectedColor?: string,
    selectedVariant?: ProductVariant
  ) => {
    addToCart(prod, qty, selectedColor, selectedVariant);
    setCurrentView('checkout');
  };

  const handleWhatsAppInquiry = (ctx: {
    fullTitle: string;
    activePrice: number;
    activeSku: string;
    selectedColor?: string;
    selectedCapacity?: string;
  }) => {
    const cleanPhone =
      (storeSettings.whatsapp || '96170773067').replace(/[^\d]/g, '') || '96170773067';
    const msg =
      `Hello ON AlAA STORE (${storeSettings.whatsapp || '70 773 067'})! I'm inquiring about: ` +
      `${ctx.fullTitle} (SKU: ${ctx.activeSku}, Price: $${ctx.activePrice.toFixed(2)}` +
      (ctx.selectedCapacity ? `, Capacity: ${ctx.selectedCapacity}` : '') +
      `). Is it available for delivery in Lebanon?`;
    openExternalUrl(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`);
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator
        .share({
          title: lang === 'ar' ? product.nameAr || product.name : product.name,
          url: window.location.href,
        })
        .catch(() => {});
    } else if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href).catch(() => {});
      setCopiedShare(true);
      window.setTimeout(() => setCopiedShare(false), 2000);
    }
  };

  const handleCategoryNavigation = () => {
    const matched = categories.find(
      (c) => c.name.toLowerCase() === product.category.toLowerCase()
    );
    if (matched) {
      selectCategory(matched.slug);
    } else {
      selectCategory(null);
      setCurrentView('products');
    }
  };

  const handleReviewSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReviewName.trim() || !newReviewComment.trim()) return;

    const res = addProductReview(product.id, {
      userName: newReviewName.trim(),
      rating: newReviewRating,
      comment: newReviewComment.trim(),
    });

    if (res) {
      refreshData();
    }

    setReviewSubmitted(true);
    setNewReviewName('');
    setNewReviewComment('');
  };

  const relatedProducts = products
    .filter(
      (p) => p.id !== product.id && (p.category === product.category || p.brand === product.brand)
    )
    .slice(0, 4);

  return (
    <div className="py-8 md:py-12 bg-[#FFFFFF] dark:bg-[#0B1120] min-h-[100dvh] w-full transition-colors duration-200">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Clean Minimal Breadcrumb */}
        <nav
          aria-label="Breadcrumb"
          className="flex items-center gap-2 text-xs text-[#64748B] dark:text-slate-400 mb-8 overflow-x-auto whitespace-nowrap pb-1"
        >
          <button
            type="button"
            onClick={() => setCurrentView('home')}
            className="hover:text-[#0A0F2C] dark:hover:text-white cursor-pointer transition-colors"
          >
            {lang === 'ar' ? 'الرئيسية' : 'Home'}
          </button>
          <span aria-hidden="true">/</span>
          <button
            type="button"
            onClick={handleCategoryNavigation}
            className="hover:text-[#0A0F2C] dark:hover:text-white cursor-pointer transition-colors"
          >
            {product.category}
          </button>
          <span aria-hidden="true">/</span>
          <span className="text-[#0A0F2C] dark:text-slate-200 font-semibold truncate max-w-xs">
            {product.brand}
          </span>
        </nav>

        {/* Above-the-Fold Clean Minimalist Luxury Product Showcase */}
        <ProductLuxuryShowcase
          product={product}
          lang={lang}
          mode="page"
          whatsappNumber={storeSettings.whatsapp}
          isFavorited={isInWishlist(product.id)}
          isCompared={isInCompare(product.id)}
          onToggleWishlist={() => toggleWishlist(product.id)}
          onToggleCompare={() => {
            if (isInCompare(product.id)) {
              removeFromCompare(product.id);
            } else {
              const res = addToCompare(product);
              if (res.success) {
                setIsCompareModalOpen(true);
              }
            }
          }}
          onAddToCart={handleAddToCart}
          onDirectOrder={handleDirectOrder}
          onWhatsAppInquiry={handleWhatsAppInquiry}
          onShare={handleShare}
          shareCopied={copiedShare}
        />

        {/* Below-the-Fold Full-Width Minimalist Collapsible Accordion */}
        <ProductDetailAccordion
          product={product}
          lang={lang}
          storeNameAr={storeSettings.storeNameAr}
          writeReviewLabel={t.writeReview}
          fullNameLabel={t.fullName}
          newReviewName={newReviewName}
          setNewReviewName={setNewReviewName}
          newReviewRating={newReviewRating}
          setNewReviewRating={setNewReviewRating}
          newReviewComment={newReviewComment}
          setNewReviewComment={setNewReviewComment}
          reviewSubmitted={reviewSubmitted}
          onResetReviewSubmitted={() => setReviewSubmitted(false)}
          onReviewSubmit={handleReviewSubmit}
        />

        <div className="mt-12 space-y-12">
          <RecentlyViewedCarousel excludeProductId={product.id} />

          {/* Related Products */}
          {relatedProducts.length > 0 && (
            <div className="space-y-6 pt-6 border-t border-[#E2E8F0] dark:border-slate-800">
              <h2 className="text-lg font-semibold text-[#0A0F2C] dark:text-[#F8FAFC]">
                {lang === 'ar' ? 'أجهزة ذات صلة قد تهمك' : 'Related Products'}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                {relatedProducts.map((rel) => (
                  <ProductCard key={rel.id} product={rel} />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
