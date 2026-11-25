import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';
import { useShop } from '../context/ShopContext';
import { Product, ProductVariant } from '../types';
import { openExternalUrl } from '../utils/navigation';
import { ProductLuxuryShowcase } from './ProductLuxuryShowcase';

export const ProductQuickViewModal: React.FC = () => {
  const {
    lang,
    quickViewProduct,
    setQuickViewProduct,
    selectedVariantId,
    addToCart,
    viewProductDetail,
    setCurrentView,
    storeSettings,
    toggleWishlist,
    isInWishlist,
    isInCompare,
    addToCompare,
    removeFromCompare,
    setIsCompareModalOpen,
  } = useShop();

  const [copiedLink, setCopiedLink] = useState(false);

  // Close modal seamlessly on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setQuickViewProduct(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setQuickViewProduct]);

  useEffect(() => {
    setCopiedLink(false);
  }, [quickViewProduct?.id]);

  if (!quickViewProduct) return null;

  const product = quickViewProduct;

  const handleAddToCart = (
    prod: Product,
    qty: number,
    selectedColor?: string,
    selectedVariant?: ProductVariant,
    selectedColorImage?: string,
    colorPriceAdjustment?: number
  ) => {
    addToCart(prod, qty, selectedColor, selectedVariant, selectedColorImage, colorPriceAdjustment);
    setQuickViewProduct(null);
  };

  const handleDirectOrder = (
    prod: Product,
    qty: number,
    selectedColor?: string,
    selectedVariant?: ProductVariant,
    selectedColorImage?: string,
    colorPriceAdjustment?: number
  ) => {
    addToCart(prod, qty, selectedColor, selectedVariant, selectedColorImage, colorPriceAdjustment);
    setQuickViewProduct(null);
    setCurrentView('checkout');
  };

  const handleWhatsAppInquiry = (ctx: {
    fullTitle: string;
    activePrice: number;
    activeSku: string;
    selectedColor?: string;
    selectedCapacity?: string;
  }) => {
    const phone = (storeSettings.whatsapp || '96170773067').replace(/[^\d]/g, '') || '96170773067';
    const storeName = storeSettings.storeName || 'ON ALAA STORE';
    const text =
      `*Inquiry: ${ctx.fullTitle}*\n` +
      `Price: $${ctx.activePrice.toFixed(2)} USD\n` +
      `SKU: ${ctx.activeSku}\n` +
      (ctx.selectedColor ? `Color: ${ctx.selectedColor}\n` : '') +
      (ctx.selectedCapacity ? `Capacity: ${ctx.selectedCapacity}\n` : '') +
      `\nHello ${storeName}! Is this item available for delivery in Lebanon?`;
    openExternalUrl(`https://wa.me/${phone}?text=${encodeURIComponent(text)}`);
  };

  const handleShare = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href).catch(() => {});
      setCopiedLink(true);
      window.setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  return (
    <AnimatePresence>
      <div
        style={{
          paddingTop: 'max(env(safe-area-inset-top, 0px), 1rem)',
          paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 1rem)',
          paddingLeft: 'max(env(safe-area-inset-left, 0px), 1rem)',
          paddingRight: 'max(env(safe-area-inset-right, 0px), 1rem)',
        }}
        className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto"
        role="dialog"
        aria-modal="true"
        aria-label={lang === 'ar' ? product.nameAr || product.name : product.name}
      >
        {/* Minimal Dark Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setQuickViewProduct(null)}
          className="fixed inset-0 bg-[#0A0F2C]/45 backdrop-blur-xs"
        />

        {/* Pure White Luxury Container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.97, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.98, y: 8 }}
          transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-full max-w-5xl max-h-[92vh] overflow-y-auto bg-white dark:bg-[#0B1120] border border-[#E2E8F0] dark:border-slate-800 rounded-2xl shadow-lg p-6 sm:p-8 lg:p-10 z-10 my-auto"
        >
          {/* Minimal Modal Close Button */}
          <button
            type="button"
            onClick={() => setQuickViewProduct(null)}
            aria-label={lang === 'ar' ? 'إغلاق النافذة' : 'Close modal'}
            data-testid="quickview-close-btn"
            className="sticky sm:absolute top-0 sm:top-4 right-0 sm:right-4 rtl:sm:right-auto rtl:sm:left-4 ml-auto z-20 w-9 h-9 rounded-full bg-white dark:bg-[#111A2E] border border-[#E2E8F0] dark:border-slate-700 hover:border-[#0A0F2C] text-[#0A0F2C] dark:text-slate-200 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>

          <ProductLuxuryShowcase
            product={product}
            initialVariantId={selectedVariantId || undefined}
            lang={lang}
            mode="modal"
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
                  setQuickViewProduct(null);
                  setIsCompareModalOpen(true);
                }
              }
            }}
            onAddToCart={handleAddToCart}
            onDirectOrder={handleDirectOrder}
            onWhatsAppInquiry={handleWhatsAppInquiry}
            onOpenFullPage={() => {
              setQuickViewProduct(null);
              viewProductDetail(product.id, false);
            }}
            onShare={handleShare}
            shareCopied={copiedLink}
          />
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
