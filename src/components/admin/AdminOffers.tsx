import React, { useState } from 'react';
import { useShop } from '../../context/ShopContext';
import { useAdmin } from '../../context/AdminContext';
import { saveProductAsync } from '../../services/storageService';
import { Product } from '../../types';
import { Flame, Search, Share2 } from 'lucide-react';
import { LazyImage } from '../LazyImage';
import { DEFAULT_FULL_RES_FALLBACK_IMAGE } from '../../utils/imageResolutionHelpers';

interface AdminOffersProps {
  onShareProduct?: (productId: string) => void;
}

export const AdminOffers: React.FC<AdminOffersProps> = ({ onShareProduct }) => {
  const { lang, products, refreshData } = useShop();
  const { requirePermission } = useAdmin();
  const [search, setSearch] = useState('');
  const [feedback, setFeedback] = useState('');
  const [offerError, setOfferError] = useState('');

  const safeProducts = products || [];
  const offerProducts = safeProducts.filter((p) => p.isSpecialOffer);

  const handleToggleOffer = async (product: Product) => {
    if (
      !requirePermission(['full_stock', 'manage_products'], {
        actionEn: `Update promotional offer status for "${product.name}"`,
        actionAr: `تعديل حالة العرض للمنتج "${product.nameAr || product.name}"`,
      })
    ) {
      return;
    }
    setOfferError('');
    const updated: Product = {
      ...product,
      isSpecialOffer: !product.isSpecialOffer,
    };
    const result = await saveProductAsync(updated);
    refreshData();
    if (!result.ok) {
      setOfferError(result.errorMessage || `Failed to update offer status for ${product.name}.`);
      return;
    }
    setFeedback(`Updated offer status for ${product.name}`);
    setTimeout(() => setFeedback(''), 3000);
  };

  const handleUpdateDiscount = async (product: Product, newDiscountPercent: number) => {
    if (
      !requirePermission(['full_stock', 'manage_products'], {
        actionEn: `Update discount percentage for "${product.name}"`,
        actionAr: `تعديل نسبة الخصم للمنتج "${product.nameAr || product.name}"`,
      })
    ) {
      return;
    }
    setOfferError('');
    const clampedPercent = Number.isFinite(newDiscountPercent)
      ? Math.min(90, Math.max(0, Math.round(newDiscountPercent)))
      : 0;
    const orig = Number(product.originalPrice);
    const curr = Number(product.price);
    const basePrice = Number.isFinite(orig) && orig > 0 ? orig : (Number.isFinite(curr) ? curr : 0);
    const discountedPrice = Math.max(0, Math.round(basePrice * (1 - clampedPercent / 100)));
    const updated: Product = {
      ...product,
      originalPrice: basePrice,
      discountPercentage: clampedPercent,
      price: discountedPrice,
    };
    const result = await saveProductAsync(updated);
    refreshData();
    if (!result.ok) {
      setOfferError(result.errorMessage || `Failed to update discount for ${product.name}.`);
    }
  };

  const q = search.toLowerCase();
  const filtered = safeProducts.filter((p) =>
    (p.name || '').toLowerCase().includes(q) ||
    (p.brand || '').toLowerCase().includes(q)
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#DCE5F0]">
        <div>
          <h1 className="text-2xl font-black text-[#172033] flex items-center gap-2">
            <Flame className="w-6 h-6 text-[#DC2626] fill-current" />
            <span>{lang === 'ar' ? 'إدارة العروض الخاصة والتخفيضات' : 'Promotions & Flash Sales Manager'}</span>
          </h1>
          <p className="text-xs text-[#64748B] mt-1">
            {lang === 'ar'
              ? 'تحديد المنتجات المعروضة في الصفحة الرئيسية بالعمود الرأسي وجدولة نسب الخصم.'
              : 'Select products featured on the homepage vertical offer columns and configure discounts.'}
          </p>
        </div>

        <span className="text-xs font-bold text-[#DC2626] bg-red-50 px-3 py-1.5 rounded-xl border border-red-200">
          {offerProducts.length} {lang === 'ar' ? 'عروض نشطة' : 'Active Offers'}
        </span>
      </div>

      {feedback && (
        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-[#16A34A] text-xs font-semibold">
          {feedback}
        </div>
      )}

      {offerError && (
        <div role="alert" className="p-3 rounded-xl bg-red-50 border border-red-200 text-[#DC2626] text-xs font-semibold">
          {offerError}
        </div>
      )}

      {/* Search Bar */}
      <div className="relative">
        <Search className="w-4 h-4 text-[#64748B] absolute left-3.5 top-1/2 -translate-y-1/2 rtl:left-auto rtl:right-3.5" />
        <input
          type="text"
          placeholder="Search products to toggle promotion..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-[#FFFFFF] border border-[#DCE5F0] rounded-xl pl-10 pr-3 rtl:pl-3 rtl:pr-10 py-2.5 text-xs text-[#172033] focus:outline-none focus:border-[#007AFF] shadow-xs"
        />
      </div>

      {/* Offers Product List */}
      <div className="rounded-2xl border border-[#DCE5F0] bg-white overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left rtl:text-right text-xs">
            <thead className="bg-[#F5F8FC] text-[#64748B] uppercase tracking-wider text-[10px] border-b border-[#DCE5F0]">
              <tr>
                <th className="py-3 px-4">Product</th>
                <th className="py-3 px-4">Original Price</th>
                <th className="py-3 px-4">Discount %</th>
                <th className="py-3 px-4">Sale Price</th>
                <th className="py-3 px-4">Featured on First Page</th>
                <th className="py-3 px-4 text-right rtl:text-left">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#DCE5F0] text-[#172033]">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 px-4 text-center text-xs text-[#64748B]">
                    {lang === 'ar'
                      ? 'لا توجد منتجات مطابقة لبحث العروض.'
                      : 'No products match the promotions search.'}
                  </td>
                </tr>
              ) : filtered.map((p) => (
                <tr key={p.id} className="hover:bg-[#F5F8FC] transition-colors">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <LazyImage
                        src={p.images?.[0] || DEFAULT_FULL_RES_FALLBACK_IMAGE}
                        alt={p.name || 'Product'}
                        width={40}
                        height={40}
                        responsiveSizes="40px"
                        priority={false}
                        loading="lazy"
                        wrapperClassName="w-10 h-10 rounded-lg overflow-hidden bg-[#F5F8FC] border border-[#DCE5F0] flex-shrink-0"
                        className="w-full h-full object-cover"
                      />
                      <div>
                        <div className="font-bold text-[#172033] line-clamp-1">{p.name}</div>
                        <div className="text-[10px] text-[#64748B]">{p.brand}</div>
                      </div>
                    </div>
                  </td>

                  <td className="py-3 px-4 font-mono font-bold">${p.originalPrice}</td>

                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="0"
                        max="90"
                        aria-label={`Discount percentage for ${p.name}`}
                        value={p.discountPercentage || 0}
                        onChange={(e) => handleUpdateDiscount(p, Number(e.target.value))}
                        className="w-16 bg-[#FFFFFF] border border-[#DCE5F0] rounded-lg px-2 py-1 text-xs text-[#DC2626] font-bold font-mono focus:outline-none focus:border-[#007AFF]"
                      />
                      <span className="text-[#64748B]">%</span>
                    </div>
                  </td>

                  <td className="py-3 px-4 font-mono font-black text-[#007AFF]">
                    ${p.price}
                  </td>

                  <td className="py-3 px-4">
                    <button
                      onClick={() => handleToggleOffer(p)}
                      className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                        p.isSpecialOffer
                          ? 'bg-red-50 text-[#DC2626] border border-red-200'
                          : 'bg-[#F5F8FC] text-[#64748B] border border-[#DCE5F0] hover:text-[#172033]'
                      }`}
                    >
                      {p.isSpecialOffer ? '🔥 Active Offer' : 'Not Featured'}
                    </button>
                  </td>

                  <td className="py-3 px-4 text-right rtl:text-left">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => onShareProduct && onShareProduct(p.id)}
                        className="p-1.5 rounded-xl bg-[#EAF3FF] hover:bg-[#007AFF] hover:text-white border border-[#BAE6FD] text-[#007AFF] transition-colors cursor-pointer"
                        title={lang === 'ar' ? 'تسويق ونشر العرض' : 'Share Offer Campaign'}
                        aria-label={`Share offer campaign for ${p.name}`}
                      >
                        <Share2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleToggleOffer(p)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition-colors ${
                          p.isSpecialOffer
                            ? 'bg-red-50 text-[#DC2626] hover:bg-red-100 border border-red-200'
                            : 'bg-[#EAF3FF] text-[#007AFF] hover:bg-[#007AFF] hover:text-white border border-[#BAE6FD]'
                        }`}
                      >
                        {p.isSpecialOffer ? 'Remove' : 'Make Offer'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
