import React, { useState, useEffect } from 'react';
import {
  ArrowRight,
  Check,
  CreditCard,
  ShieldCheck,
  Sparkles,
  Star,
  Truck,
  X,
} from 'lucide-react';
import { Language, Product } from '../types';
import {
  buildQuickReadSummary,
  splitDescriptionParagraphs,
} from '../utils/productLuxuryDetailHelpers';

export type ProductDetailTabKey = 'description' | 'shipping' | 'warranty';

interface ProductDetailTabsProps {
  product: Product;
  lang: Language;
  storeNameAr?: string;
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

export const ProductDetailTabs: React.FC<ProductDetailTabsProps> = ({
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
  const [activeTab, setActiveTab] = useState<ProductDetailTabKey>('description');
  const [quickReadOpen, setQuickReadOpen] = useState<boolean>(false);
  const [showReviewForm, setShowReviewForm] = useState<boolean>(false);

  useEffect(() => {
    setActiveTab('description');
    setQuickReadOpen(false);
    setShowReviewForm(false);
  }, [product.id]);

  const descriptionText =
    lang === 'ar'
      ? product.descriptionAr || product.description
      : product.description || product.descriptionAr;

  const paragraphs = splitDescriptionParagraphs(descriptionText);
  const quickRead = buildQuickReadSummary(product, lang);

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
  const warrantyMonths = Number(product.warrantyMonths) || 12;

  const tabs: { key: ProductDetailTabKey; label: string }[] = [
    { key: 'description', label: lang === 'ar' ? 'الوصف' : 'Description' },
    { key: 'shipping', label: lang === 'ar' ? 'الشحن والاستبدال' : 'Shipping & Exchange' },
    { key: 'warranty', label: lang === 'ar' ? 'الكفالة' : 'Warranty' },
  ];

  return (
    <section
      aria-label={lang === 'ar' ? 'تفاصيل المنتج والضمان' : 'Product description, shipping, and warranty'}
      data-testid="pdp-tabs-section"
      className="mt-12 sm:mt-16 pt-2 bg-[#FFFFFF] dark:bg-[#0B1120]"
    >
      {/* Full-Width Navigation Bar (Description / Shipping & Exchange / Warranty) */}
      <div
        role="tablist"
        aria-label={lang === 'ar' ? 'أقسام تفاصيل المنتج' : 'Product detail tabs'}
        className="flex items-center gap-6 sm:gap-8 border-b border-[#E2E8F0] dark:border-slate-800 overflow-x-auto"
      >
        {tabs.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-controls={`pdp-tabpanel-${tab.key}`}
              id={`pdp-tab-${tab.key}`}
              data-testid={`pdp-tab-${tab.key}`}
              onClick={() => setActiveTab(tab.key)}
              className={`relative pb-3.5 pt-2 text-sm sm:text-[15px] whitespace-nowrap shrink-0 cursor-pointer transition-colors border-b-2 -mb-[1px] ${
                isActive
                  ? 'border-[#0A0F2C] dark:border-white text-[#0A0F2C] dark:text-white font-semibold'
                  : 'border-transparent text-[#64748B] dark:text-slate-400 hover:text-[#0A0F2C] dark:hover:text-slate-200 font-medium'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content Area */}
      <div className="pt-7 sm:pt-8">
        {activeTab === 'description' && (
          <div
            role="tabpanel"
            id="pdp-tabpanel-description"
            aria-labelledby="pdp-tab-description"
            data-testid="pdp-tabpanel-description"
            className="space-y-8"
          >
            {/* QUICK READ / 961 Sidekick Banner Card */}
            <div
              className="rounded-xl border border-[#E2E8F0] dark:border-slate-700 overflow-hidden bg-white dark:bg-[#111A2E]"
              data-testid="pdp-quick-read-card"
            >
              <div className="bg-[#0A0F2C] text-white px-4 sm:px-5 py-2 flex items-center justify-between text-[11px] font-semibold tracking-wider">
                <span className="inline-flex items-center gap-1.5 uppercase">
                  <Sparkles className="w-3 h-3" />
                  <span>{lang === 'ar' ? 'قراءة سريعة' : 'QUICK READ'}</span>
                </span>
                <div className="flex items-center gap-3">
                  <span>961 Sidekick</span>
                  {quickReadOpen && (
                    <button
                      type="button"
                      onClick={() => setQuickReadOpen(false)}
                      aria-label={lang === 'ar' ? 'إغلاق القراءة السريعة' : 'Close quick read'}
                      className="text-white/80 hover:text-white cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              <div className="px-4 sm:px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-[#111A2E]">
                <p className="text-xs sm:text-sm font-medium text-[#0A0F2C] dark:text-slate-200 m-0">
                  {lang === 'ar'
                    ? 'التفاصيل المهمة فقط. تلخيص الوصف الكامل إلى نقاط واضحة ومباشرة.'
                    : 'Just the useful details. Reduce the full description to a clear, concise read'}
                </p>
                <button
                  type="button"
                  onClick={() => setQuickReadOpen((prev) => !prev)}
                  data-testid="pdp-quick-read-btn"
                  aria-expanded={quickReadOpen}
                  className="px-4 py-2 rounded-lg bg-[#0A0F2C] hover:bg-[#16204A] dark:bg-white dark:text-[#0A0F2C] dark:hover:bg-slate-100 text-white text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 self-start sm:self-auto cursor-pointer transition-colors"
                >
                  <span>
                    {quickReadOpen
                      ? lang === 'ar'
                        ? 'إخفاء الملخص'
                        : 'Hide summary'
                      : lang === 'ar'
                      ? 'قراءة سريعة'
                      : 'Quick read'}
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 rtl:rotate-180" />
                </button>
              </div>

              {quickReadOpen && (
                <div
                  className="border-t border-[#E2E8F0] dark:border-slate-700 bg-[#F8FAFC] dark:bg-[#0B1120] px-4 sm:px-5 py-4 space-y-3"
                  data-testid="pdp-quick-read-panel"
                >
                  <p className="text-xs sm:text-[13.5px] font-semibold text-[#0A0F2C] dark:text-white leading-relaxed m-0">
                    {quickRead.headline}
                  </p>
                  {quickRead.takeaways.length > 0 && (
                    <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2 pt-1">
                      {quickRead.takeaways.map((point, idx) => (
                        <li
                          key={idx}
                          className="flex items-start gap-2 text-xs text-[#334155] dark:text-slate-300 font-medium"
                        >
                          <span className="mt-0.5 w-4 h-4 rounded-full bg-white dark:bg-[#111A2E] border border-[#E2E8F0] dark:border-slate-700 flex items-center justify-center shrink-0">
                            <Check className="w-2.5 h-2.5 text-[#0A0F2C] dark:text-white stroke-[2.5]" />
                          </span>
                          <span>{point}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>

            {/* Structured Multi-Paragraph Description Copy */}
            {paragraphs.length > 0 && (
              <div
                className="space-y-4 max-w-4xl"
                data-testid="pdp-overview-description"
              >
                {paragraphs.map((paragraph, index) => (
                  <p
                    key={index}
                    className="text-sm sm:text-[15px] leading-[1.75] text-[#334155] dark:text-slate-300 m-0"
                  >
                    {paragraph}
                  </p>
                ))}
              </div>
            )}

            {/* Clean Technical Specifications Table */}
            {validSpecs.length > 0 && (
              <div className="pt-2 space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-[0.08em] text-[#64748B] dark:text-slate-400">
                  {lang === 'ar' ? 'المواصفات الفنية' : 'Technical Specifications'}
                </h3>
                <div
                  className="border-t border-b border-[#E2E8F0] dark:border-slate-800 divide-y divide-[#E2E8F0] dark:divide-slate-800"
                  data-testid="pdp-specs-list"
                >
                  {validSpecs.map((spec, idx) => (
                    <div
                      key={`${spec.label}-${idx}`}
                      className="grid grid-cols-1 sm:grid-cols-12 gap-1 sm:gap-6 py-3 text-xs sm:text-[13.5px]"
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
              </div>
            )}
          </div>
        )}

        {activeTab === 'shipping' && (
          <div
            role="tabpanel"
            id="pdp-tabpanel-shipping"
            aria-labelledby="pdp-tab-shipping"
            data-testid="pdp-tabpanel-shipping"
            className="grid grid-cols-1 md:grid-cols-3 gap-6"
          >
            <div className="p-5 rounded-xl border border-[#E2E8F0] dark:border-slate-800 bg-white dark:bg-[#0E1726] space-y-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-[#0A0F2C] dark:text-white">
                <Truck className="w-4 h-4 shrink-0 text-[#0A0F2C] dark:text-slate-200" />
                <span>
                  {lang === 'ar' ? 'التوصيل لجميع مناطق لبنان' : 'All-Lebanon Express Delivery'}
                </span>
              </div>
              <p className="text-xs text-[#475569] dark:text-slate-300 leading-relaxed m-0">
                {lang === 'ar'
                  ? 'توصيل في نفس اليوم أو خلال 24 ساعة في الشوف وجبل لبنان، و1–3 أيام إلى بيروت والشمال والجنوب والبقاع.'
                  : 'Same-day / 24h courier dispatch across Chouf & Mount Lebanon, and 1–3 business days across Greater Beirut, North, South, and Bekaa.'}
              </p>
            </div>

            <div className="p-5 rounded-xl border border-[#E2E8F0] dark:border-slate-800 bg-white dark:bg-[#0E1726] space-y-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-[#0A0F2C] dark:text-white">
                <CreditCard className="w-4 h-4 shrink-0 text-[#0A0F2C] dark:text-slate-200" />
                <span>
                  {lang === 'ar' ? 'الدفع عند الاستلام أو Whish Money' : 'Cash on Delivery & Whish Money'}
                </span>
              </div>
              <p className="text-xs text-[#475569] dark:text-slate-300 leading-relaxed m-0">
                {lang === 'ar'
                  ? 'يمكنك فحص الجهاز عند الاستلام والدفع نقداً بالدولار أو بالليرة أو عبر Whish Money.'
                  : 'Inspect your sealed package at your doorstep before paying Cash on Delivery (USD) or settle cleanly via Whish Money.'}
              </p>
            </div>

            <div className="p-5 rounded-xl border border-[#E2E8F0] dark:border-slate-800 bg-white dark:bg-[#0E1726] space-y-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-[#0A0F2C] dark:text-white">
                <ShieldCheck className="w-4 h-4 shrink-0 text-[#0A0F2C] dark:text-slate-200" />
                <span>
                  {lang === 'ar' ? 'سياسة الاستبدال المضمونة' : '3-Day Exchange Guarantee'}
                </span>
              </div>
              <p className="text-xs text-[#475569] dark:text-slate-300 leading-relaxed m-0">
                {lang === 'ar'
                  ? 'استبدال مباشر خلال 3 أيام لأي خلل مصنعي مؤكد مع الاحتفاظ بالعلبة الأصلية والملحقات.'
                  : 'Direct replacement or exchange within 3 days of delivery for verified factory defects or sealed unopened returns.'}
              </p>
            </div>
          </div>
        )}

        {activeTab === 'warranty' && (
          <div
            role="tabpanel"
            id="pdp-tabpanel-warranty"
            aria-labelledby="pdp-tab-warranty"
            data-testid="pdp-tabpanel-warranty"
            className="grid grid-cols-1 md:grid-cols-2 gap-6"
          >
            <div className="p-5 rounded-xl border border-[#E2E8F0] dark:border-slate-800 bg-white dark:bg-[#0E1726] space-y-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-[#0A0F2C] dark:text-white">
                <ShieldCheck className="w-4 h-4 shrink-0 text-[#16A34A]" />
                <span>
                  {lang === 'ar'
                    ? `كفالة وكيل رسمية لمدة ${warrantyMonths} شهراً`
                    : `${warrantyMonths}-Month Official Agent Warranty`}
                </span>
              </div>
              <p className="text-xs sm:text-[13px] text-[#475569] dark:text-slate-300 leading-relaxed m-0">
                {product.warrantyTerms?.trim()
                  ? product.warrantyTerms.trim()
                  : lang === 'ar'
                  ? 'منتج أصلي 100% ومكفول ضد العيوب المصنعية مع متابعة مباشرة عبر مركز الصيانة المعتمد في لبنان.'
                  : '100% authentic factory-sealed hardware backed by official Lebanese agent coverage for verified manufacturing defects.'}
              </p>
            </div>

            <div className="p-5 rounded-xl border border-[#E2E8F0] dark:border-slate-800 bg-white dark:bg-[#0E1726] space-y-2">
              <div className="text-xs font-semibold text-[#0A0F2C] dark:text-white">
                {lang === 'ar' ? 'التحقق والدعم الفني' : 'Authenticity & Warranty Support'}
              </div>
              <p className="text-xs sm:text-[13px] text-[#475569] dark:text-slate-300 leading-relaxed m-0">
                {lang === 'ar'
                  ? 'كل طلب يحصل على رقم فاتورة وتغطية ضمان موثقة. للتفعيل أو الاستفسار تواصل معنا على 70773067.'
                  : 'Every order includes a recorded invoice and serial-backed coverage. Contact our Chouf dispatch support anytime on WhatsApp 70773067.'}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Customer Reviews Section (Preserved Cleanly Below Tabs) */}
      <div
        className="mt-12 pt-8 border-t border-[#E2E8F0] dark:border-slate-800 space-y-6"
        data-testid="pdp-reviews-panel"
      >
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <h2 className="text-base sm:text-lg font-semibold text-[#0A0F2C] dark:text-white m-0">
              {lang === 'ar'
                ? `تقييمات العملاء (${totalReviewCount})`
                : `Customer Reviews (${totalReviewCount})`}
            </h2>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-[#E2E8F0] dark:border-slate-700 text-xs font-semibold text-[#0A0F2C] dark:text-white tabular-nums">
              <Star className="w-3.5 h-3.5 text-amber-500 fill-current" />
              <span>{product.rating || 5} / 5</span>
            </div>
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
                        i < rev.rating ? 'fill-current' : 'text-slate-300 dark:text-slate-600'
                      }`}
                    />
                  ))}
                  {rev.verifiedPurchase && (
                    <span className="text-[10px] text-[#16A34A] dark:text-emerald-400 ml-2 font-semibold">
                      ✓ {lang === 'ar' ? 'شراء مؤكد' : 'Verified Buyer'}
                    </span>
                  )}
                </div>
                <p className="text-xs text-[#475569] dark:text-slate-300 leading-relaxed m-0">
                  {rev.comment}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-[#64748B] dark:text-slate-400 m-0">
            {lang === 'ar'
              ? `لا توجد تقييمات سابقة لهذا المنتج على ${storeNameAr || 'ON AlAA STORE'} بعد.`
              : 'No customer reviews yet. Be the first to share your experience with this device.'}
          </p>
        )}

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
                  className="px-5 py-2.5 rounded-lg bg-[#0A0F2C] hover:bg-[#16204A] dark:bg-white dark:text-[#0A0F2C] dark:hover:bg-slate-100 text-white font-semibold text-xs cursor-pointer transition-colors"
                >
                  {lang === 'ar' ? 'نشر التقييم' : 'Submit Review'}
                </button>
              </form>
            )}
          </div>
        )}
      </div>
    </section>
  );
};
