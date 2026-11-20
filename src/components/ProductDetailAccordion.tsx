import React, { useState, useEffect } from 'react';
import {
  ChevronDown,
  ShieldCheck,
  Truck,
  CreditCard,
  Star,
  Check,
} from 'lucide-react';
import { Language, Product } from '../types';
import {
  AccordionSectionKey,
  extractOverviewHighlights,
  resolveAvailableAccordionSections,
  toggleAccordionSection,
} from '../utils/productLuxuryDetailHelpers';

interface ProductDetailAccordionProps {
  product: Product;
  lang: Language;
  storeNameAr?: string;
  reviewCountLabel?: string;
  writeReviewLabel: string;
  fullNameLabel: string;
  newReviewName: string;
  setNewReviewName: (val: string) => void;
  newReviewRating: number;
  setNewReviewRating: (val: number) => void;
  newReviewComment: string;
  setNewReviewComment: (val: string) => void;
  reviewSubmitted: boolean;
  onResetReviewSubmitted?: () => void;
  onReviewSubmit: (e: React.FormEvent) => void;
}

export const ProductDetailAccordion: React.FC<ProductDetailAccordionProps> = ({
  product,
  lang,
  storeNameAr,
  writeReviewLabel,
  fullNameLabel,
  newReviewName,
  setNewReviewName,
  newReviewRating,
  setNewReviewRating,
  newReviewComment,
  setNewReviewComment,
  reviewSubmitted,
  onResetReviewSubmitted,
  onReviewSubmit,
}) => {
  const availableSections = resolveAvailableAccordionSections(product, {
    hasStoreDelivery: true,
    allowReviewSubmission: true,
  });

  const [openSections, setOpenSections] = useState<Set<AccordionSectionKey>>(
    () => new Set(availableSections.length > 0 ? [availableSections[0]] : [])
  );
  const [showReviewForm, setShowReviewForm] = useState<boolean>(false);

  // Reset default expanded first section whenever viewing a different product
  useEffect(() => {
    const nextSections = resolveAvailableAccordionSections(product, {
      hasStoreDelivery: true,
      allowReviewSubmission: true,
    });
    setOpenSections(new Set(nextSections.length > 0 ? [nextSections[0]] : []));
    setShowReviewForm(false);
  }, [product.id]);

  if (availableSections.length === 0) return null;

  const descriptionText =
    lang === 'ar'
      ? product.descriptionAr || product.description
      : product.description || product.descriptionAr;

  const highlights = extractOverviewHighlights(product, lang);

  const validSpecs = Array.isArray(product.specifications)
    ? product.specifications.filter(
        (s) =>
          typeof s?.label === 'string' &&
          s.label.trim().length > 0 &&
          typeof s?.value === 'string' &&
          s.value.trim().length > 0
      )
    : [];

  const reviewList = Array.isArray(product.reviews) ? product.reviews : [];
  const totalReviewCount = Math.max(reviewList.length, Number(product.reviewCount) || 0);
  const warrantyMonths = Number(product.warrantyMonths) || 0;

  const handleToggle = (key: AccordionSectionKey) => {
    setOpenSections((prev) => toggleAccordionSection(prev, key));
  };

  const getSectionTitle = (key: AccordionSectionKey): string => {
    switch (key) {
      case 'overview':
        return lang === 'ar' ? 'نظرة عامة والوصف' : 'Overview & Description';
      case 'specs':
        return lang === 'ar' ? 'المواصفات الفنية' : 'Hardware Specifications';
      case 'delivery':
        return lang === 'ar' ? 'التوصيل والكفالة' : 'Delivery & Warranty';
      case 'reviews':
        return lang === 'ar'
          ? `تقييمات العملاء (${totalReviewCount})`
          : `Customer Reviews (${totalReviewCount})`;
    }
  };

  const renderSectionBody = (key: AccordionSectionKey) => {
    switch (key) {
      case 'overview':
        return (
          <div className="space-y-4">
            {descriptionText && (
              <p
                className="text-sm leading-relaxed text-[#475569] dark:text-slate-300 max-w-4xl"
                data-testid="pdp-overview-description"
              >
                {descriptionText}
              </p>
            )}
            {highlights.length > 0 && (
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2.5 pt-1">
                {highlights.map((item, idx) => (
                  <li
                    key={idx}
                    className="flex items-start gap-2.5 text-xs sm:text-[13px] text-[#0A0F2C] dark:text-slate-200 font-medium"
                  >
                    <span className="mt-0.5 w-4 h-4 rounded-full bg-[#F8FAFC] dark:bg-[#111A2E] border border-[#E2E8F0] dark:border-slate-700 flex items-center justify-center shrink-0">
                      <Check className="w-2.5 h-2.5 text-[#0A0F2C] dark:text-white stroke-[2.5]" />
                    </span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        );

      case 'specs':
        return (
          <div
            className="border-t border-[#E2E8F0] dark:border-slate-800 divide-y divide-[#E2E8F0] dark:divide-slate-800"
            data-testid="pdp-specs-list"
          >
            {validSpecs.map((spec, idx) => (
              <div
                key={`${spec.label}-${idx}`}
                className="grid grid-cols-1 sm:grid-cols-12 gap-1 sm:gap-6 py-3 text-xs sm:text-[13px]"
              >
                <div className="sm:col-span-4 font-medium text-[#64748B] dark:text-slate-400">
                  {spec.label}
                </div>
                <div className="sm:col-span-8 font-semibold text-[#0A0F2C] dark:text-slate-100">
                  {spec.value}
                </div>
              </div>
            ))}
          </div>
        );

      case 'delivery':
        return (
          <div
            className="grid grid-cols-1 md:grid-cols-3 gap-6"
            data-testid="pdp-delivery-warranty-grid"
          >
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-xs font-semibold text-[#0A0F2C] dark:text-white">
                <ShieldCheck className="w-4 h-4 shrink-0 text-[#0A0F2C] dark:text-slate-200" />
                <span>
                  {warrantyMonths > 0
                    ? lang === 'ar'
                      ? `كفالة وكيل لمدة ${warrantyMonths} شهراً`
                      : `${warrantyMonths} Mo. Agent Warranty`
                    : lang === 'ar'
                    ? 'ضمان أصالة المنتج'
                    : 'Official Authenticity Guarantee'}
                </span>
              </div>
              <p className="text-xs text-[#64748B] dark:text-slate-400 leading-relaxed">
                {product.warrantyTerms?.trim()
                  ? product.warrantyTerms.trim()
                  : lang === 'ar'
                  ? 'منتج أصلي 100% — استيراد مباشر من الوكيل المعتمد.'
                  : '100% Genuine — Direct Agent Import with full verification.'}
              </p>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-xs font-semibold text-[#0A0F2C] dark:text-white">
                <Truck className="w-4 h-4 shrink-0 text-[#0A0F2C] dark:text-slate-200" />
                <span>
                  {lang === 'ar'
                    ? 'التوصيل لجميع مناطق لبنان'
                    : 'All-Lebanon Delivery'}
                </span>
              </div>
              <p className="text-xs text-[#64748B] dark:text-slate-400 leading-relaxed">
                {lang === 'ar'
                  ? 'شحن سريع ومؤمن من مركز الشوف إلى بيروت، الجبل، الشمال، الجنوب، والبقاع.'
                  : 'Fast door-to-door courier delivery from our Chouf hub across Beirut, Mount Lebanon, North, South, and Bekaa.'}
              </p>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-xs font-semibold text-[#0A0F2C] dark:text-white">
                <CreditCard className="w-4 h-4 shrink-0 text-[#0A0F2C] dark:text-slate-200" />
                <span>
                  {lang === 'ar'
                    ? 'الدفع: عند الاستلام أو Whish Money'
                    : 'Payment: COD / Whish Money'}
                </span>
              </div>
              <p className="text-xs text-[#64748B] dark:text-slate-400 leading-relaxed">
                {lang === 'ar'
                  ? 'ادفع نقداً عند الاستلام أو عبر خدمة Whish Money بكل سهولة وأمان.'
                  : 'Pay Cash on Delivery (USD) upon inspection or via instant Whish Money transfer.'}
              </p>
            </div>
          </div>
        );

      case 'reviews':
        return (
          <div className="space-y-6" data-testid="pdp-reviews-panel">
            {/* Rating Summary & Write Review Toggle */}
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E2E8F0] dark:border-slate-700 text-xs font-semibold text-[#0A0F2C] dark:text-white tabular-nums">
                  <Star className="w-3.5 h-3.5 text-amber-500 fill-current" />
                  <span>{product.rating || 5} / 5</span>
                </div>
                <span className="text-xs text-[#64748B] dark:text-slate-400">
                  {lang === 'ar'
                    ? `آراء العملاء الموثقين في ${storeNameAr || 'ON AlAA STORE'}`
                    : 'Verified customer ratings across Lebanon'}
                </span>
              </div>

              <button
                type="button"
                onClick={() => {
                  if (reviewSubmitted && onResetReviewSubmitted) {
                    onResetReviewSubmitted();
                    setShowReviewForm(true);
                  } else {
                    setShowReviewForm((prev) => !prev);
                  }
                }}
                data-testid="pdp-toggle-review-form-btn"
                className="px-4 py-2 rounded-lg border border-[#E2E8F0] dark:border-slate-700 hover:border-[#0A0F2C] dark:hover:border-white text-xs font-semibold text-[#0A0F2C] dark:text-white transition-colors cursor-pointer"
              >
                {showReviewForm && !reviewSubmitted
                  ? lang === 'ar'
                    ? 'إخفاء النموذج'
                    : 'Hide Form'
                  : writeReviewLabel}
              </button>
            </div>

            {/* Existing Customer Reviews List */}
            {reviewList.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {reviewList.map((rev) => (
                  <div
                    key={rev.id}
                    className="p-4 rounded-xl bg-[#FFFFFF] dark:bg-[#0E1726] border border-[#E2E8F0] dark:border-slate-800 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-[#0A0F2C] dark:text-white text-xs">
                        {rev.userName}
                      </span>
                      <span className="text-[11px] text-[#64748B] dark:text-slate-400">
                        {rev.date}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-amber-500">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`w-3 h-3 ${
                            i < rev.rating
                              ? 'fill-current'
                              : 'text-slate-300 dark:text-slate-600'
                          }`}
                        />
                      ))}
                      {rev.verifiedPurchase && (
                        <span className="text-[10px] text-[#16A34A] dark:text-emerald-400 ml-2 font-semibold">
                          ✓ {lang === 'ar' ? 'شراء مؤكد' : 'Verified Buyer'}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[#475569] dark:text-slate-300 leading-relaxed">
                      {rev.comment}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-[#64748B] dark:text-slate-400">
                {lang === 'ar'
                  ? 'لا توجد تقييمات سابقة لهذا المنتج بعد. كن أول من يشاركنا تجربته.'
                  : 'No customer reviews yet. Be the first to share your experience with this device.'}
              </p>
            )}

            {/* Collapsible Write a Review Form */}
            {(showReviewForm || reviewSubmitted) && (
              <div className="p-5 rounded-xl bg-[#FFFFFF] dark:bg-[#0E1726] border border-[#E2E8F0] dark:border-slate-800 max-w-xl">
                <h3 className="text-sm font-semibold text-[#0A0F2C] dark:text-white mb-3">
                  {writeReviewLabel}
                </h3>
                {reviewSubmitted ? (
                  <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-[#16A34A] dark:text-emerald-300 text-xs font-semibold">
                    {lang === 'ar'
                      ? 'شكراً لك! تم إضافة تقييمك بنجاح.'
                      : 'Thank you! Your review has been posted.'}
                  </div>
                ) : (
                  <form onSubmit={onReviewSubmit} className="space-y-3">
                    <div>
                      <label className="text-xs text-[#0A0F2C] dark:text-slate-200 block mb-1 font-medium">
                        {fullNameLabel}
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Fadi S."
                        value={newReviewName}
                        onChange={(e) => setNewReviewName(e.target.value)}
                        className="w-full bg-white dark:bg-[#111A2E] border border-[#E2E8F0] dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-[#0A0F2C] dark:text-white focus:outline-none focus:border-[#0A0F2C]"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-[#0A0F2C] dark:text-slate-200 block mb-1 font-medium">
                        {lang === 'ar' ? 'التقييم:' : 'Rating:'}
                      </label>
                      <select
                        value={newReviewRating}
                        onChange={(e) => setNewReviewRating(Number(e.target.value))}
                        className="w-full bg-white dark:bg-[#111A2E] border border-[#E2E8F0] dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-[#0A0F2C] dark:text-white focus:outline-none focus:border-[#0A0F2C]"
                      >
                        <option value={5}>5 / 5</option>
                        <option value={4}>4 / 5</option>
                        <option value={3}>3 / 5</option>
                        <option value={2}>2 / 5</option>
                        <option value={1}>1 / 5</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-[#0A0F2C] dark:text-slate-200 block mb-1 font-medium">
                        {lang === 'ar' ? 'رأيك بالمنتج:' : 'Your Feedback:'}
                      </label>
                      <textarea
                        required
                        rows={3}
                        value={newReviewComment}
                        onChange={(e) => setNewReviewComment(e.target.value)}
                        placeholder={
                          lang === 'ar'
                            ? 'صف تجربتك مع الجهاز...'
                            : 'Describe device performance and build quality...'
                        }
                        className="w-full bg-white dark:bg-[#111A2E] border border-[#E2E8F0] dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-[#0A0F2C] dark:text-white focus:outline-none focus:border-[#0A0F2C]"
                      />
                    </div>
                    <button
                      type="submit"
                      className="px-5 py-2.5 rounded-lg bg-[#0A0F2C] hover:bg-[#16204A] text-white font-semibold text-xs cursor-pointer transition-colors"
                    >
                      {lang === 'ar' ? 'نشر التقييم' : 'Submit Review'}
                    </button>
                  </form>
                )}
              </div>
            )}
          </div>
        );
    }
  };

  return (
    <section
      aria-label={lang === 'ar' ? 'تفاصيل المنتج والمواصفات' : 'Product details and specifications'}
      data-testid="pdp-accordion-section"
      className="mt-14 sm:mt-16 pt-2 border-t border-[#E2E8F0] dark:border-slate-800 bg-[#FFFFFF] dark:bg-[#0B1120]"
    >
      <div className="divide-y divide-[#E2E8F0] dark:divide-slate-800">
        {availableSections.map((key) => {
          const isOpen = openSections.has(key);
          const panelId = `pdp-accordion-panel-${key}`;
          const headerId = `pdp-accordion-header-${key}`;

          return (
            <div key={key} data-testid={`pdp-accordion-item-${key}`}>
              <h2 className="m-0">
                <button
                  id={headerId}
                  type="button"
                  aria-expanded={isOpen}
                  aria-controls={panelId}
                  data-testid={`pdp-accordion-trigger-${key}`}
                  onClick={() => handleToggle(key)}
                  className="w-full py-5 flex items-center justify-between gap-4 text-left rtl:text-right text-[#0A0F2C] dark:text-[#F8FAFC] hover:text-[#16204A] dark:hover:text-white transition-colors cursor-pointer"
                >
                  <span className="text-[15px] sm:text-base font-semibold tracking-tight">
                    {getSectionTitle(key)}
                  </span>
                  <ChevronDown
                    aria-hidden="true"
                    className={`w-4 h-4 shrink-0 text-[#0A0F2C] dark:text-slate-300 transition-transform duration-200 ease-out ${
                      isOpen ? 'rotate-180' : 'rotate-0'
                    }`}
                  />
                </button>
              </h2>

              <div
                id={panelId}
                role="region"
                aria-labelledby={headerId}
                aria-hidden={!isOpen}
                className={`grid transition-[grid-template-rows,opacity] duration-200 ease-out ${
                  isOpen
                    ? 'grid-rows-[1fr] opacity-100'
                    : 'grid-rows-[0fr] opacity-0 pointer-events-none'
                }`}
              >
                <div className="overflow-hidden">
                  <div className="pb-6 pt-1">{renderSectionBody(key)}</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};
