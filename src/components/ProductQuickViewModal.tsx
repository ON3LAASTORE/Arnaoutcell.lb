import React, { useState, useEffect } from 'react';
import { useShop } from '../context/ShopContext';
import { X, Star, Shield, ShoppingCart, Zap, CheckCircle, ExternalLink } from 'lucide-react';

export const ProductQuickViewModal: React.FC = () => {
  const {
    lang,
    quickViewProduct,
    setQuickViewProduct,
    addToCart,
    viewProductDetail,
    setCurrentView,
  } = useShop();

  const [quantity, setQuantity] = useState(1);
  const [selectedColor, setSelectedColor] = useState<string | undefined>(
    quickViewProduct?.colors?.[0]
  );

  useEffect(() => {
    setSelectedColor(quickViewProduct?.colors?.[0]);
    setQuantity(1);
  }, [quickViewProduct?.id]);

  if (!quickViewProduct) return null;

  const product = quickViewProduct;
  const isOutOfStock = product.stock <= 0;

  const handleAddToCart = () => {
    if (isOutOfStock) return;
    addToCart(product, quantity, selectedColor);
    setQuickViewProduct(null);
  };

  const handleBuyNow = () => {
    if (isOutOfStock) return;
    addToCart(product, quantity, selectedColor);
    setQuickViewProduct(null);
    setCurrentView('checkout');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-white dark:bg-[#0E1726] border border-[#DCE5F0] dark:border-[#1E293B] rounded-3xl overflow-hidden shadow-2xl flex flex-col md:flex-row">
        {/* Close Button */}
        <button
          onClick={() => setQuickViewProduct(null)}
          className="absolute top-3.5 right-3.5 rtl:left-3.5 rtl:right-auto z-10 p-2 rounded-xl bg-white/90 dark:bg-[#111A2E]/90 hover:bg-white dark:hover:bg-[#1E293B] text-[#64748B] dark:text-slate-300 hover:text-[#172033] dark:hover:text-white border border-[#DCE5F0] dark:border-[#1E293B] shadow-xs transition-colors cursor-pointer"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Product Image */}
        <div className="md:w-1/2 bg-[#F5F8FC] dark:bg-[#0A0F1D] p-6 flex items-center justify-center relative border-b md:border-b-0 md:border-r rtl:md:border-r-0 rtl:md:border-l border-[#DCE5F0] dark:border-[#1E293B]">
          <img
            src={product.images[0]}
            alt={product.name}
            className="max-h-72 w-full object-contain"
          />
          {product.discountPercentage && product.discountPercentage > 0 ? (
            <span className="absolute top-4 left-4 rtl:right-4 rtl:left-auto px-2.5 py-1 rounded-md bg-[#DC2626] text-white font-black text-xs">
              -{product.discountPercentage}% OFF
            </span>
          ) : null}
        </div>

        {/* Product Details */}
        <div className="md:w-1/2 p-6 flex flex-col justify-between bg-white dark:bg-[#0E1726]">
          <div>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-[#007AFF] font-bold uppercase tracking-wider">
                {product.brand}
              </span>
              <span className="text-[#64748B] dark:text-slate-400 font-mono text-[11px]">{product.sku}</span>
            </div>

            <h3 className="text-lg font-bold text-[#172033] dark:text-[#F8FAFC] mb-2 leading-snug">
              {lang === 'ar' ? product.nameAr || product.name : product.name}
            </h3>

            {/* Price Row */}
            <div className="flex items-baseline gap-3 mb-3">
              <span className="text-2xl font-black text-[#007AFF]">${product.price}</span>
              {product.originalPrice > product.price && (
                <span className="text-sm text-[#64748B] dark:text-slate-400 line-through">${product.originalPrice}</span>
              )}
            </div>

            {/* Rating & Warranty */}
            <div className="flex items-center gap-3 text-xs mb-4">
              <div className="flex items-center gap-1 text-amber-500">
                <Star className="w-3.5 h-3.5 fill-current" />
                <span className="font-bold text-[#172033] dark:text-[#F8FAFC]">{product.rating}</span>
              </div>
              <span className="text-[#DCE5F0] dark:text-slate-700">•</span>
              <div className="flex items-center gap-1 text-[#64748B] dark:text-slate-400">
                <Shield className="w-3.5 h-3.5 text-[#007AFF]" />
                <span>{product.warrantyMonths} {lang === 'ar' ? 'أشهر كفالة' : 'Mo. Warranty'}</span>
              </div>
            </div>

            {/* Color Selector */}
            {product.colors && product.colors.length > 0 && (
              <div className="mb-4">
                <span className="text-xs text-[#64748B] dark:text-slate-400 block mb-1.5 font-semibold">
                  {lang === 'ar' ? 'اللون المتاح:' : 'Available Color:'}
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {product.colors.map((color) => (
                    <button
                      key={color}
                      onClick={() => setSelectedColor(color)}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                        selectedColor === color
                          ? 'bg-[#EAF3FF] dark:bg-[#1E293B] border-[#007AFF] text-[#007AFF] dark:text-[#38BDF8]'
                          : 'bg-[#F5F8FC] dark:bg-[#111A2E] border-[#DCE5F0] dark:border-[#1E293B] text-[#172033] dark:text-[#F8FAFC] hover:border-[#007AFF]'
                      }`}
                    >
                      {color}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Stock status */}
            <div className="flex items-center gap-1.5 text-xs mb-4">
              <CheckCircle className="w-3.5 h-3.5 text-[#16A34A]" />
              <span className="text-[#16A34A] dark:text-emerald-400 font-semibold">
                {lang === 'ar' ? `متوفر في متجر صيدا (${product.stock} قطع)` : `In Stock at Saida Hub (${product.stock} units)`}
              </span>
            </div>
          </div>

          {/* Quantity & Actions */}
          <div className="space-y-3 pt-3 border-t border-[#DCE5F0] dark:border-[#1E293B]">
            <div className="flex items-center justify-between">
              <span className="text-xs text-[#64748B] dark:text-slate-400 font-semibold">
                {lang === 'ar' ? 'الكمية:' : 'Quantity:'}
              </span>
              <div className="flex items-center bg-[#F5F8FC] dark:bg-[#111A2E] border border-[#DCE5F0] dark:border-[#1E293B] rounded-xl overflow-hidden">
                <button
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  className="px-3 py-1 text-[#172033] dark:text-[#F8FAFC] hover:bg-slate-200 dark:hover:bg-[#1E293B] transition-colors cursor-pointer"
                >
                  -
                </button>
                <span className="px-3 py-1 text-xs font-bold text-[#172033] dark:text-[#F8FAFC] min-w-[2rem] text-center">
                  {quantity}
                </span>
                <button
                  onClick={() => setQuantity((q) => Math.min(product.stock, q + 1))}
                  className="px-3 py-1 text-[#172033] dark:text-[#F8FAFC] hover:bg-slate-200 dark:hover:bg-[#1E293B] transition-colors cursor-pointer"
                >
                  +
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={handleAddToCart}
                disabled={isOutOfStock}
                className="py-2.5 px-3 rounded-xl bg-[#F5F8FC] dark:bg-[#111A2E] hover:bg-[#EAF3FF] dark:hover:bg-[#1E293B] text-[#172033] dark:text-[#F8FAFC] text-xs font-bold border border-[#DCE5F0] dark:border-[#1E293B] flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <ShoppingCart className="w-4 h-4 text-[#007AFF]" />
                <span>{lang === 'ar' ? 'أضف للسلة' : 'Add to Cart'}</span>
              </button>

              <button
                onClick={handleBuyNow}
                disabled={isOutOfStock}
                className="py-2.5 px-3 rounded-xl bg-[#007AFF] hover:bg-[#0066D6] text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-sm shadow-[#007AFF]/25 cursor-pointer"
              >
                <Zap className="w-4 h-4 fill-current" />
                <span>{lang === 'ar' ? 'شراء فوري' : 'Buy Now'}</span>
              </button>
            </div>

            <button
              onClick={() => {
                setQuickViewProduct(null);
                viewProductDetail(product.id);
              }}
              className="w-full text-center text-[11px] text-[#007AFF] dark:text-[#38BDF8] hover:underline flex items-center justify-center gap-1 cursor-pointer pt-1"
            >
              <span>{lang === 'ar' ? 'عرض الصفحة الكاملة والمواصفات الفنية' : 'View Full Details & Specs'}</span>
              <ExternalLink className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
