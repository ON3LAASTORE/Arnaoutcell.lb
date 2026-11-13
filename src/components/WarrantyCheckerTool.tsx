import React, { useState } from 'react';
import {
  ShieldCheck,
  Search,
  CheckCircle2,
  AlertTriangle,
  Clock,
  XCircle,
  ClipboardCheck,
  Ban,
  Calendar,
  PackageCheck,
  Loader2,
  X,
  Phone,
  Database,
  QrCode,
} from 'lucide-react';
import { useShop } from '../context/ShopContext';
import { WhatsApp3DIcon } from './icons/ThreeDIcons';
import { WarrantyQrScannerModal } from './WarrantyQrScannerModal';
import { lookupWarrantyInFirestore } from '../services/warrantyFirestoreService';
import { parseScannedWarrantyCode } from '../utils/qrPayloadParser';
import {
  SAMPLE_WARRANTY_LOOKUPS,
  WarrantyCoverageStatus,
  WarrantyLookupResult,
  calculateWarrantyPeriod,
  formatWarrantyDate,
} from '../utils/warrantyCheckerHelpers';

export const WarrantyCheckerTool: React.FC = () => {
  const { lang, products } = useShop();
  const [queryInput, setQueryInput] = useState('');
  const [customPurchaseDate, setCustomPurchaseDate] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [result, setResult] = useState<WarrantyLookupResult | null>(null);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [scannedCodeNotice, setScannedCodeNotice] = useState<string | null>(null);

  const runLookup = async (rawQuery: string, purchaseDateOverride?: string) => {
    const trimmed = rawQuery.trim();
    if (!trimmed) return;

    setIsSearching(true);
    setLookupError(null);
    try {
      const effectiveDate = purchaseDateOverride !== undefined ? purchaseDateOverride : customPurchaseDate;
      const found = await lookupWarrantyInFirestore(trimmed, products, effectiveDate || undefined);
      setResult(found);
      setHasSearched(true);
    } catch (err) {
      console.warn('Warranty check notice:', err);
      setLookupError(
        lang === 'ar'
          ? 'تعذر إتمام الفحص حالياً. يرجى المحاولة مرة أخرى أو التواصل عبر واتساب \u206603 986 718\u2069.'
          : 'Unable to complete the check right now. Please try again or contact support on 03 986 718.'
      );
      setResult(null);
      setHasSearched(true);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setScannedCodeNotice(null);
    runLookup(queryInput);
  };

  const handleSampleClick = (sampleQuery: string) => {
    setScannedCodeNotice(null);
    setQueryInput(sampleQuery);
    setCustomPurchaseDate('');
    runLookup(sampleQuery, '');
  };

  const handleClear = () => {
    setQueryInput('');
    setCustomPurchaseDate('');
    setResult(null);
    setHasSearched(false);
    setLookupError(null);
    setScannedCodeNotice(null);
  };

  const handleQrDetected = (rawPayload: string) => {
    setIsScannerOpen(false);
    const parsed = parseScannedWarrantyCode(rawPayload);
    if (!parsed) return;
    setQueryInput(parsed.lookupValue);
    setCustomPurchaseDate('');
    setScannedCodeNotice(parsed.lookupValue);
    runLookup(parsed.lookupValue, '');
  };

  const handleCustomDateChange = (nextDate: string) => {
    setCustomPurchaseDate(nextDate);
    if (!result || result.matchType === 'order_id') return;

    // Recalculate remaining warranty period live when user supplies invoice purchase date
    setResult((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        coverageStartSource: nextDate ? 'custom_purchase_date' : 'catalog_policy',
        items: prev.items.map((item) => ({
          ...item,
          calculation: calculateWarrantyPeriod({
            startDateIso: nextDate ? new Date(`${nextDate}T00:00:00Z`).toISOString() : null,
            warrantyMonths: item.calculation.warrantyMonths,
          }),
        })),
      };
    });
  };

  const getStatusMeta = (
    status: WarrantyCoverageStatus,
    expiryDateIso?: string | null,
    claimInfo?: {
      status: 'claimed' | 'in_service' | 'replaced';
      claimedAt: string;
      claimReference?: string;
      resolution?: string;
      resolutionAr?: string;
    }
  ) => {
    switch (status) {
      case 'active':
        return {
          shortLabel: lang === 'ar' ? 'سارية (صالح)' : 'Valid',
          title: lang === 'ar' ? 'الكفالة سارية المفعول' : 'Valid Warranty',
          summary: expiryDateIso
            ? lang === 'ar'
              ? `تغطية كاملة سارية حتى ${formatWarrantyDate(expiryDateIso, lang)} ضد عيوب التصنيع.`
              : `Full official protection active through ${formatWarrantyDate(expiryDateIso, lang)}.`
            : lang === 'ar'
            ? 'كفالة المتجر الرسمية سارية المفعول ضد عيوب التصنيع.'
            : 'Official store warranty is active and valid.',
          badgeClasses:
            'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700/70',
          bannerClasses:
            'bg-emerald-50/70 dark:bg-emerald-950/35 border-emerald-200 dark:border-emerald-800/60',
          iconWrapClasses:
            'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-700/60',
          titleClasses: 'text-emerald-900 dark:text-emerald-200',
          barClass: 'bg-emerald-500',
          icon: <CheckCircle2 className="w-4 h-4 shrink-0" />,
          largeIcon: <CheckCircle2 className="w-5 h-5 shrink-0" />,
        };
      case 'expiring_soon':
        return {
          shortLabel: lang === 'ar' ? 'سارية · قريبة الانتهاء' : 'Valid · Expiring Soon',
          title: lang === 'ar' ? 'الكفالة سارية وتنتهي قريباً' : 'Valid Warranty (Expiring Soon)',
          summary: expiryDateIso
            ? lang === 'ar'
              ? `متبقي 30 يوماً أو أقل — تنتهي التغطية في ${formatWarrantyDate(expiryDateIso, lang)}.`
              : `30 days or fewer remaining — coverage expires on ${formatWarrantyDate(expiryDateIso, lang)}.`
            : lang === 'ar'
            ? 'تنتهي فترة الكفالة خلال أقل من شهر.'
            : 'Warranty period ends within 30 days.',
          badgeClasses:
            'bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-700/70',
          bannerClasses:
            'bg-amber-50/70 dark:bg-amber-950/35 border-amber-200 dark:border-amber-800/60',
          iconWrapClasses:
            'bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-700/60',
          titleClasses: 'text-amber-900 dark:text-amber-200',
          barClass: 'bg-amber-500',
          icon: <AlertTriangle className="w-4 h-4 shrink-0" />,
          largeIcon: <AlertTriangle className="w-5 h-5 shrink-0" />,
        };
      case 'expired':
        return {
          shortLabel: lang === 'ar' ? 'منتهية الصلاحية' : 'Expired',
          title: lang === 'ar' ? 'انتهت مدة الكفالة' : 'Warranty Expired',
          summary: expiryDateIso
            ? lang === 'ar'
              ? `انتهت فترة التغطية المجانية في ${formatWarrantyDate(expiryDateIso, lang)}. تتوفر خدمات صيانة مدفوعة في المتجر.`
              : `Coverage period ended on ${formatWarrantyDate(expiryDateIso, lang)}. Paid repair support remains available.`
            : lang === 'ar'
            ? 'انتهت فترة الكفالة الرسمية لهذا الجهاز.'
            : 'Official warranty coverage period has ended for this item.',
          badgeClasses:
            'bg-rose-50 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border-rose-300 dark:border-rose-700/70',
          bannerClasses:
            'bg-rose-50/70 dark:bg-rose-950/35 border-rose-200 dark:border-rose-800/60',
          iconWrapClasses:
            'bg-rose-100 dark:bg-rose-900/60 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-700/60',
          titleClasses: 'text-rose-900 dark:text-rose-200',
          barClass: 'bg-rose-500',
          icon: <XCircle className="w-4 h-4 shrink-0" />,
          largeIcon: <XCircle className="w-5 h-5 shrink-0" />,
        };
      case 'claimed':
        return {
          shortLabel: lang === 'ar' ? 'تمت المطالبة' : 'Claimed',
          title: lang === 'ar' ? 'تمت المطالبة بالكفالة واستيفاؤها' : 'Warranty Claimed',
          summary: claimInfo
            ? lang === 'ar'
              ? `تم تنفيذ المطالبة ${claimInfo.claimReference ? `(${claimInfo.claimReference}) ` : ''}بتاريخ ${formatWarrantyDate(claimInfo.claimedAt, lang)}${claimInfo.resolutionAr ? ` — ${claimInfo.resolutionAr}` : '.'}`
              : `Claim ${claimInfo.claimReference ? `#${claimInfo.claimReference} ` : ''}processed on ${formatWarrantyDate(claimInfo.claimedAt, lang)}${claimInfo.resolution ? ` — ${claimInfo.resolution}` : '.'}`
            : lang === 'ar'
            ? 'تمت معالجة مطالبة الكفالة لهذا الجهاز مسبقاً.'
            : 'Warranty entitlement for this item has already been claimed and serviced.',
          badgeClasses:
            'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-300 border-indigo-300 dark:border-indigo-700/70',
          bannerClasses:
            'bg-indigo-50/70 dark:bg-indigo-950/35 border-indigo-200 dark:border-indigo-800/60',
          iconWrapClasses:
            'bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-700/60',
          titleClasses: 'text-indigo-900 dark:text-indigo-200',
          barClass: 'bg-indigo-500',
          icon: <ClipboardCheck className="w-4 h-4 shrink-0" />,
          largeIcon: <ClipboardCheck className="w-5 h-5 shrink-0" />,
        };
      case 'pending_activation':
        return {
          shortLabel: lang === 'ar' ? 'قيد التفعيل' : 'Pending Delivery',
          title: lang === 'ar' ? 'تبدأ الكفالة فور التسليم' : 'Activates Upon Delivery',
          summary:
            lang === 'ar'
              ? 'الطلب قيد التجهيز أو التوصيل؛ يبدأ احتساب مدة الكفالة الرسمية من يوم الاستلام.'
              : 'Order is in transit; your official warranty coverage starts automatically upon delivery.',
          badgeClasses:
            'bg-[#EAF3FF] dark:bg-[#172540] text-[#007AFF] dark:text-[#38BDF8] border-[#93C5FD] dark:border-[#1E3A5F]',
          bannerClasses:
            'bg-[#EAF3FF]/70 dark:bg-[#172540]/60 border-[#BAE6FD] dark:border-[#1E3A5F]',
          iconWrapClasses:
            'bg-[#DBEAFE] dark:bg-[#1E3A5F] text-[#007AFF] dark:text-[#38BDF8] border-[#93C5FD] dark:border-[#1E3A5F]',
          titleClasses: 'text-[#0F294A] dark:text-[#E0F2FE]',
          barClass: 'bg-[#007AFF]',
          icon: <Clock className="w-4 h-4 shrink-0" />,
          largeIcon: <Clock className="w-5 h-5 shrink-0" />,
        };
      case 'cancelled_void':
        return {
          shortLabel: lang === 'ar' ? 'ملغاة' : 'Void',
          title: lang === 'ar' ? 'الكفالة ملغاة (طلب ملغى / مرتجع)' : 'Warranty Void (Cancelled / Returned)',
          summary:
            lang === 'ar'
              ? 'تم إلغاء هذا الطلب أو إرجاعه ولا تشمله تغطية الكفالة.'
              : 'This order was cancelled or returned and does not carry active warranty coverage.',
          badgeClasses:
            'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-600',
          bannerClasses:
            'bg-slate-100/80 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700',
          iconWrapClasses:
            'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-600',
          titleClasses: 'text-slate-900 dark:text-slate-100',
          barClass: 'bg-slate-400',
          icon: <Ban className="w-4 h-4 shrink-0" />,
          largeIcon: <Ban className="w-5 h-5 shrink-0" />,
        };
      case 'coverage_info_only':
        return {
          shortLabel: lang === 'ar' ? 'تغطية معتمدة' : 'Valid Policy • Add Date',
          title: lang === 'ar' ? 'الجهاز مشمول بالكفالة — أدخل تاريخ الفاتورة' : 'Eligible Coverage • Enter Purchase Date',
          summary:
            lang === 'ar'
              ? 'تم التحقق من فترة الكفالة القياسية لهذا المنتج. اختر تاريخ الشراء أعلاه لعرض الحالة النهائية (سارية / منتهية).'
              : 'Product verified in catalog. Select your invoice date above to check whether your coverage is Valid or Expired.',
          badgeClasses:
            'bg-[#EAF3FF] dark:bg-[#172540] text-[#007AFF] dark:text-[#38BDF8] border-[#93C5FD] dark:border-[#1E3A5F]',
          bannerClasses:
            'bg-[#EAF3FF]/70 dark:bg-[#172540]/60 border-[#BAE6FD] dark:border-[#1E3A5F]',
          iconWrapClasses:
            'bg-[#DBEAFE] dark:bg-[#1E3A5F] text-[#007AFF] dark:text-[#38BDF8] border-[#93C5FD] dark:border-[#1E3A5F]',
          titleClasses: 'text-[#0F294A] dark:text-[#E0F2FE]',
          barClass: 'bg-[#007AFF]',
          icon: <ShieldCheck className="w-4 h-4 shrink-0" />,
          largeIcon: <ShieldCheck className="w-5 h-5 shrink-0" />,
        };
    }
  };

  const formatRemainingDuration = (months: number, extraDays: number, totalDays: number) => {
    if (totalDays <= 0) {
      return lang === 'ar' ? '0 يوم متبقي' : '0 days left';
    }
    if (lang === 'ar') {
      if (months > 0) {
        return extraDays > 0
          ? `${months} شهر و ${extraDays} يوم (${totalDays} يوم)`
          : `${months} شهر (${totalDays} يوم)`;
      }
      return `${totalDays} يوم متبقي`;
    }
    if (months > 0) {
      const mLabel = months === 1 ? 'mo' : 'mos';
      const dLabel = extraDays === 1 ? 'day' : 'days';
      return extraDays > 0
        ? `${months} ${mLabel}, ${extraDays} ${dLabel} (${totalDays}d left)`
        : `${months} ${mLabel} (${totalDays}d left)`;
    }
    return `${totalDays} ${totalDays === 1 ? 'day' : 'days'} remaining`;
  };

  return (
    <section
      aria-labelledby="warranty-checker-heading"
      className="mt-16 sm:mt-20 pt-14 border-t border-[#DCE5F0] dark:border-[#1E293B]"
    >
      <div className="max-w-4xl mx-auto rounded-3xl bg-[#F5F8FC] dark:bg-[#111A2E] border border-[#DCE5F0] dark:border-[#1E293B] p-6 sm:p-8 md:p-10 shadow-xs">
        {/* Tool Header */}
        <div className="text-center max-w-2xl mx-auto mb-8 space-y-3">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#EAF3FF] dark:bg-[#0E1726] border border-[#BAE6FD] dark:border-[#1E293B] text-[#007AFF] dark:text-[#38BDF8] text-xs font-bold tracking-wider">
            <ShieldCheck className="w-4 h-4" />
            <span>{lang === 'ar' ? 'أداة التحقق المباشر من الكفالة' : 'OFFICIAL WARRANTY CHECKER'}</span>
          </div>
          <h2
            id="warranty-checker-heading"
            className="scroll-mt-24 text-2xl sm:text-3xl font-black text-[#172033] dark:text-[#F8FAFC] tracking-tight"
          >
            {lang === 'ar' ? 'فحص فترة الكفالة المتبقية' : 'Check Your Remaining Warranty'}
          </h2>
          <p className="text-xs sm:text-sm text-[#64748B] dark:text-slate-400 leading-relaxed">
            {lang === 'ar'
              ? 'أدخل رقم الطلب (مثل OAA-2027-1001) أو الرقم التسلسلي / الباركود / SKU للجهاز للتحقق الفوري من حالة الكفالة والمدة المتبقية عبر قاعدة بيانات المتجر.'
              : 'Enter your Order ID (e.g. OAA-2027-1001) or product Serial Number / Barcode / SKU to verify coverage and remaining warranty period against our store Firestore database.'}
          </p>
        </div>

        {/* Lookup Form */}
        <form onSubmit={handleSubmit} className="space-y-3">
          <label
            htmlFor="warranty-lookup-input"
            className="block text-xs font-bold text-[#172033] dark:text-slate-200"
          >
            {lang === 'ar' ? 'رقم الطلب أو الرقم التسلسلي / الباركود' : 'Order ID or Product Serial / Barcode / SKU'}
          </label>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-[#64748B] dark:text-slate-400 absolute left-4 rtl:left-auto rtl:right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                id="warranty-lookup-input"
                type="text"
                value={queryInput}
                onChange={(e) => setQueryInput(e.target.value)}
                placeholder={
                  lang === 'ar'
                    ? 'مثال: OAA-2027-1001 أو 195949038221'
                    : 'e.g. OAA-2027-1001, 195949038221, or ANK-737-24K'
                }
                dir="ltr"
                className="w-full bg-white dark:bg-[#0E1726] border border-[#DCE5F0] dark:border-[#1E293B] rounded-2xl pl-11 pr-10 rtl:pl-10 rtl:pr-11 py-3.5 text-xs sm:text-sm font-mono text-[#172033] dark:text-[#F8FAFC] placeholder:text-[#94A3B8] focus:outline-none focus:border-[#007AFF] dark:focus:border-[#38BDF8] transition-colors"
              />
              {queryInput && (
                <button
                  type="button"
                  onClick={handleClear}
                  aria-label={lang === 'ar' ? 'مسح البحث' : 'Clear warranty search'}
                  className="absolute right-3 rtl:right-auto rtl:left-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-[#64748B] flex items-center justify-center cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2.5 shrink-0">
              <button
                type="button"
                onClick={() => setIsScannerOpen(true)}
                aria-label={lang === 'ar' ? 'مسح رمز QR بالكاميرا' : 'Scan QR code with camera'}
                className="px-4 py-3.5 rounded-2xl bg-white dark:bg-[#0E1726] border border-[#DCE5F0] dark:border-[#1E293B] hover:border-[#007AFF] dark:hover:border-[#38BDF8] text-[#172033] dark:text-[#F8FAFC] font-bold text-xs sm:text-sm inline-flex items-center justify-center gap-2 transition-all cursor-pointer whitespace-nowrap shrink-0"
              >
                <QrCode className="w-4 h-4 text-[#007AFF] dark:text-[#38BDF8]" />
                <span>{lang === 'ar' ? 'مسح QR' : 'Scan QR'}</span>
              </button>

              <button
                type="submit"
                disabled={isSearching || !queryInput.trim()}
                className="flex-1 sm:flex-initial px-6 py-3.5 rounded-2xl bg-[#007AFF] hover:bg-[#0066D6] disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-xs sm:text-sm inline-flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm shadow-[#007AFF]/25 whitespace-nowrap shrink-0"
              >
                {isSearching ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{lang === 'ar' ? 'جاري الفحص...' : 'Checking...'}</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>{lang === 'ar' ? 'فحص الكفالة' : 'Check Warranty'}</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {scannedCodeNotice && (
            <div
              role="status"
              data-testid="qr-scanned-notice"
              className="px-3.5 py-2 rounded-xl bg-[#EAF3FF] dark:bg-[#172540] border border-[#BAE6FD] dark:border-[#1E3A5F] text-xs text-[#0F294A] dark:text-[#E0F2FE] flex items-center justify-between gap-2"
            >
              <span className="inline-flex items-center gap-2">
                <QrCode className="w-3.5 h-3.5 text-[#007AFF] dark:text-[#38BDF8] shrink-0" />
                <span>
                  {lang === 'ar' ? 'تمت قراءة الرمز بنجاح:' : 'Scanned code from sticker:'}{' '}
                  <strong dir="ltr" className="font-mono">
                    {scannedCodeNotice}
                  </strong>
                </span>
              </span>
            </div>
          )}
        </form>

        {/* Quick Sample Chips */}
        <div className="mt-4 flex flex-wrap items-center gap-2 text-[11px] text-[#64748B] dark:text-slate-400">
          <span className="font-semibold">
            {lang === 'ar' ? 'جرّب أمثلة سريعة:' : 'Try sample lookups:'}
          </span>
          {SAMPLE_WARRANTY_LOOKUPS.map((sample) => (
            <button
              key={sample.query}
              type="button"
              onClick={() => handleSampleClick(sample.query)}
              className="px-2.5 py-1 rounded-lg bg-white dark:bg-[#0E1726] border border-[#DCE5F0] dark:border-[#1E293B] hover:border-[#007AFF] dark:hover:border-[#38BDF8] text-[#007AFF] dark:text-[#38BDF8] font-mono transition-colors cursor-pointer"
            >
              {lang === 'ar' ? sample.labelAr : sample.labelEn}
            </button>
          ))}
        </div>

        {/* Lookup Results */}
        {hasSearched && (
          <div className="mt-8 space-y-5" aria-live="polite">
            {lookupError ? (
              <div className="p-6 rounded-2xl bg-white dark:bg-[#0E1726] border border-rose-200 dark:border-rose-900/60 text-center space-y-2">
                <AlertTriangle className="w-7 h-7 text-rose-500 mx-auto" />
                <p className="text-xs sm:text-sm font-semibold text-[#172033] dark:text-[#F8FAFC]">
                  {lookupError}
                </p>
              </div>
            ) : result ? (
              <div className="space-y-4">
                {/* Summary Banner */}
                <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#0E1726] border border-[#DCE5F0] dark:border-[#1E293B] flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#EAF3FF] dark:bg-[#172540] border border-[#BAE6FD] dark:border-[#1E3A5F] text-[#007AFF] dark:text-[#38BDF8] flex items-center justify-center shrink-0">
                      <PackageCheck className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-bold text-[#64748B] dark:text-slate-400">
                          {result.matchType === 'order_id'
                            ? lang === 'ar'
                              ? 'رقم الطلب:'
                              : 'Order Reference:'
                            : lang === 'ar'
                            ? 'تمت مطابقة الجهاز:'
                            : 'Matched Product Code:'}
                        </span>
                        <span dir="ltr" className="font-mono text-sm font-black text-[#172033] dark:text-[#F8FAFC]">
                          {result.query}
                        </span>
                      </div>
                      <p className="text-[11px] text-[#64748B] dark:text-slate-400 mt-0.5 flex items-center gap-1.5">
                        <Database className="w-3 h-3 text-[#007AFF] dark:text-[#38BDF8]" />
                        <span>
                          {result.dataSource === 'firestore'
                            ? lang === 'ar'
                              ? 'تم التحقق مباشرة من قاعدة بيانات Firestore'
                              : 'Verified via store Firestore database'
                            : lang === 'ar'
                            ? 'تم التحقق من سجل الطلبات المحلي المتزامن'
                            : 'Verified via synced local store record'}
                        </span>
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    {result.items.length === 1 && (() => {
                      const primaryCalc = result.items[0].calculation;
                      const summaryStatus = getStatusMeta(
                        primaryCalc.status,
                        primaryCalc.expiryDateIso,
                        primaryCalc.claimInfo
                      );
                      return (
                        <span
                          role="status"
                          data-testid="warranty-summary-status"
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold border whitespace-nowrap ${summaryStatus.badgeClasses}`}
                        >
                          {summaryStatus.icon}
                          <span>{summaryStatus.shortLabel}</span>
                        </span>
                      );
                    })()}
                    {result.orderDateIso && (
                      <div className="text-xs text-[#64748B] dark:text-slate-400 flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-[#007AFF]" />
                        <span>
                          {lang === 'ar' ? 'تاريخ الطلب:' : 'Order Date:'}{' '}
                          <strong className="text-[#172033] dark:text-[#F8FAFC]">
                            {formatWarrantyDate(result.orderDateIso, lang)}
                          </strong>
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Purchase Date Estimator for Serial / Barcode / SKU lookups */}
                {result.matchType !== 'order_id' && (
                  <div className="p-4 sm:p-5 rounded-2xl bg-[#EAF3FF]/70 dark:bg-[#0E1726] border border-[#BAE6FD] dark:border-[#1E293B] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-0.5">
                      <label
                        htmlFor="warranty-purchase-date"
                        className="block text-xs font-bold text-[#172033] dark:text-[#F8FAFC]"
                      >
                        {lang === 'ar'
                          ? 'أدخل تاريخ الشراء / الفاتورة لحساب الأيام المتبقية بدقة:'
                          : 'Enter your invoice / purchase date to calculate exact remaining days:'}
                      </label>
                      <p className="text-[11px] text-[#64748B] dark:text-slate-400">
                        {lang === 'ar'
                          ? 'أو أدخل رقم طلبك أعلاه (مثل OAA-2027-1001) للتحقق التلقائي من تاريخ التسليم.'
                          : 'Or enter your Order ID above (e.g. OAA-2027-1001) for automatic delivery-date verification.'}
                      </p>
                    </div>
                    <input
                      id="warranty-purchase-date"
                      type="date"
                      value={customPurchaseDate}
                      max={new Date().toISOString().slice(0, 10)}
                      onChange={(e) => handleCustomDateChange(e.target.value)}
                      dir="ltr"
                      className="bg-white dark:bg-[#111A2E] border border-[#DCE5F0] dark:border-[#1E293B] rounded-xl px-3.5 py-2 text-xs font-mono text-[#172033] dark:text-[#F8FAFC] focus:outline-none focus:border-[#007AFF] shrink-0"
                    />
                  </div>
                )}

                {/* Per-Item Warranty Breakdown Cards */}
                <div className="space-y-3">
                  {result.items.map((item, idx) => {
                    const statusMeta = getStatusMeta(
                      item.calculation.status,
                      item.calculation.expiryDateIso,
                      item.calculation.claimInfo
                    );
                    const hasComputedDates =
                      item.calculation.status === 'active' ||
                      item.calculation.status === 'expiring_soon' ||
                      item.calculation.status === 'expired';
                    const isClaimed = item.calculation.status === 'claimed';
                    const displayName =
                      lang === 'ar' && item.productNameAr ? item.productNameAr : item.productName;
                    const whatsappMessage = encodeURIComponent(
                      item.calculation.status === 'expired'
                        ? `Hello ON AlAA STORE, I checked warranty for ${result.query} (${item.productName}) which is expired, and would like to inquire about paid repair options.`
                        : isClaimed && item.calculation.claimInfo?.claimReference
                        ? `Hello ON AlAA STORE, I am following up on warranty claim ${item.calculation.claimInfo.claimReference} for ${result.query} (${item.productName}).`
                        : `Hello ON AlAA STORE, I checked warranty for ${result.query} (${item.productName}) and would like support regarding my warranty coverage.`
                    );

                    return (
                      <div
                        key={`${item.productId}-${idx}`}
                        data-warranty-status={item.calculation.status}
                        className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-[#0E1726] border border-[#DCE5F0] dark:border-[#1E293B] space-y-4 shadow-xs"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                          <div className="flex items-start gap-3.5 min-w-0">
                            {item.image && (
                              <img
                                src={item.image}
                                alt={displayName}
                                className="w-14 h-14 rounded-xl object-cover border border-[#DCE5F0] dark:border-[#1E293B] bg-[#F8FAFC] shrink-0"
                              />
                            )}
                            <div className="min-w-0 space-y-1">
                              <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold text-[#007AFF] dark:text-[#38BDF8]">
                                <span>{item.brand}</span>
                                {item.sku && (
                                  <span dir="ltr" className="font-mono text-[#64748B] dark:text-slate-400">
                                    • SKU: {item.sku}
                                  </span>
                                )}
                                {item.barcode && (
                                  <span dir="ltr" className="font-mono text-[#64748B] dark:text-slate-400">
                                    • SN: {item.barcode}
                                  </span>
                                )}
                              </div>
                              <h3 className="font-bold text-sm sm:text-base text-[#172033] dark:text-[#F8FAFC] leading-snug">
                                {displayName}
                              </h3>
                              {(item.color || item.variantName || item.quantity > 1) && (
                                <p className="text-[11px] text-[#64748B] dark:text-slate-400">
                                  {[
                                    item.color,
                                    item.variantName,
                                    item.quantity > 1 ? `Qty: ${item.quantity}` : null,
                                  ]
                                    .filter(Boolean)
                                    .join(' • ')}
                                </p>
                              )}
                            </div>
                          </div>

                          <span
                            role="status"
                            data-testid="warranty-item-status-badge"
                            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-extrabold border shrink-0 self-start whitespace-nowrap ${statusMeta.badgeClasses}`}
                          >
                            {statusMeta.icon}
                            <span>{statusMeta.shortLabel}</span>
                          </span>
                        </div>

                        {/* Visual Status Indicator Banner */}
                        <div
                          role="status"
                          data-testid="warranty-status-indicator"
                          className={`p-3.5 sm:p-4 rounded-xl border flex items-start sm:items-center gap-3.5 ${statusMeta.bannerClasses}`}
                        >
                          <div
                            className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${statusMeta.iconWrapClasses}`}
                          >
                            {statusMeta.largeIcon}
                          </div>
                          <div className="min-w-0 flex-1 space-y-0.5">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className={`text-xs sm:text-sm font-black ${statusMeta.titleClasses}`}>
                                {statusMeta.title}
                              </span>
                              {isClaimed && item.calculation.claimInfo?.claimReference && (
                                <span
                                  dir="ltr"
                                  className="px-2 py-0.5 rounded-md bg-white/80 dark:bg-[#0E1726]/80 border border-indigo-200 dark:border-indigo-700/60 font-mono text-[11px] font-bold text-indigo-700 dark:text-indigo-300"
                                >
                                  {item.calculation.claimInfo.claimReference}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-[#475569] dark:text-slate-300 leading-relaxed">
                              {statusMeta.summary}
                            </p>
                          </div>
                        </div>

                        {/* Warranty Metrics Grid */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-[#DCE5F0]/70 dark:border-[#1E293B]">
                          <div className="p-3 rounded-xl bg-[#F8FAFC] dark:bg-[#111A2E] border border-[#DCE5F0]/80 dark:border-[#1E293B]">
                            <span className="block text-[10px] font-semibold text-[#64748B] dark:text-slate-400 uppercase tracking-wider">
                              {lang === 'ar' ? 'مدة الكفالة' : 'Coverage Term'}
                            </span>
                            <span className="mt-1 block text-sm font-black tabular-nums text-[#172033] dark:text-[#F8FAFC]">
                              {item.calculation.warrantyMonths}{' '}
                              {lang === 'ar' ? 'شهراً' : 'Months'}
                            </span>
                          </div>

                          <div className="p-3 rounded-xl bg-[#F8FAFC] dark:bg-[#111A2E] border border-[#DCE5F0]/80 dark:border-[#1E293B]">
                            <span className="block text-[10px] font-semibold text-[#64748B] dark:text-slate-400 uppercase tracking-wider">
                              {lang === 'ar' ? 'بداية الكفالة' : 'Warranty Start'}
                            </span>
                            <span className="mt-1 block text-xs sm:text-sm font-bold text-[#172033] dark:text-[#F8FAFC]">
                              {formatWarrantyDate(item.calculation.startDateIso, lang)}
                            </span>
                          </div>

                          <div className="p-3 rounded-xl bg-[#F8FAFC] dark:bg-[#111A2E] border border-[#DCE5F0]/80 dark:border-[#1E293B]">
                            <span className="block text-[10px] font-semibold text-[#64748B] dark:text-slate-400 uppercase tracking-wider">
                              {isClaimed
                                ? lang === 'ar'
                                  ? 'تاريخ المطالبة'
                                  : 'Claimed On'
                                : lang === 'ar'
                                ? 'تاريخ الانتهاء'
                                : 'Expires On'}
                            </span>
                            <span className="mt-1 block text-xs sm:text-sm font-bold text-[#172033] dark:text-[#F8FAFC]">
                              {isClaimed && item.calculation.claimInfo?.claimedAt
                                ? formatWarrantyDate(item.calculation.claimInfo.claimedAt, lang)
                                : item.calculation.expiryDateIso
                                ? formatWarrantyDate(item.calculation.expiryDateIso, lang)
                                : item.calculation.status === 'cancelled_void'
                                ? '—'
                                : lang === 'ar'
                                ? 'يُحدد عند الفاتورة'
                                : 'Set on Invoice'}
                            </span>
                          </div>

                          <div className="p-3 rounded-xl bg-[#F8FAFC] dark:bg-[#111A2E] border border-[#DCE5F0]/80 dark:border-[#1E293B]">
                            <span className="block text-[10px] font-semibold text-[#64748B] dark:text-slate-400 uppercase tracking-wider">
                              {isClaimed
                                ? lang === 'ar'
                                  ? 'حالة المطالبة'
                                  : 'Claim Outcome'
                                : lang === 'ar'
                                ? 'الفترة المتبقية'
                                : 'Time Remaining'}
                            </span>
                            <span
                              className={`mt-1 block text-xs sm:text-sm font-black tabular-nums ${
                                item.calculation.status === 'expired'
                                  ? 'text-rose-600 dark:text-rose-400'
                                  : isClaimed
                                  ? 'text-indigo-600 dark:text-indigo-400'
                                  : item.calculation.status === 'expiring_soon'
                                  ? 'text-amber-600 dark:text-amber-400'
                                  : 'text-[#007AFF] dark:text-[#38BDF8]'
                              }`}
                            >
                              {isClaimed
                                ? lang === 'ar'
                                  ? item.calculation.claimInfo?.status === 'replaced'
                                    ? 'تم الاستبدال'
                                    : item.calculation.claimInfo?.status === 'in_service'
                                    ? 'قيد الصيانة'
                                    : 'تمت المطالبة'
                                  : item.calculation.claimInfo?.status === 'replaced'
                                  ? 'Replaced'
                                  : item.calculation.claimInfo?.status === 'in_service'
                                  ? 'In Service'
                                  : 'Claim Fulfilled'
                                : hasComputedDates
                                ? formatRemainingDuration(
                                    item.calculation.remainingMonthsApprox,
                                    item.calculation.remainingExtraDays,
                                    item.calculation.remainingDays
                                  )
                                : item.calculation.status === 'pending_activation'
                                ? `${item.calculation.warrantyMonths} ${lang === 'ar' ? 'شهراً كاملة' : 'Full Months'}`
                                : item.calculation.status === 'cancelled_void'
                                ? lang === 'ar'
                                  ? 'غير مشمول'
                                  : 'Void'
                                : `${item.calculation.warrantyMonths} ${lang === 'ar' ? 'شهراً' : 'Months'}`}
                            </span>
                          </div>
                        </div>

                        {/* Remaining Progress Bar (Active / Expiring Soon / Expired) or Claim Record Bar */}
                        {hasComputedDates && (
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between text-[11px] font-semibold text-[#64748B] dark:text-slate-400">
                              <span>
                                {item.calculation.status === 'expired'
                                  ? lang === 'ar'
                                    ? 'انتهت مدة الكفالة بالكامل'
                                    : 'Warranty Period Elapsed'
                                  : lang === 'ar'
                                  ? 'نسبة الكفالة المتبقية'
                                  : 'Remaining Warranty Period'}
                              </span>
                              <span
                                dir="ltr"
                                className={`font-mono tabular-nums ${
                                  item.calculation.status === 'expired'
                                    ? 'text-rose-600 dark:text-rose-400 font-bold'
                                    : 'text-[#172033] dark:text-[#F8FAFC]'
                                }`}
                              >
                                {item.calculation.percentRemaining}%
                              </span>
                            </div>
                            <div
                              role="progressbar"
                              aria-valuenow={item.calculation.percentRemaining}
                              aria-valuemin={0}
                              aria-valuemax={100}
                              aria-label={
                                lang === 'ar' ? 'نسبة الكفالة المتبقية' : 'Remaining warranty percentage'
                              }
                              className={`w-full h-2.5 rounded-full overflow-hidden ${
                                item.calculation.status === 'expired'
                                  ? 'bg-rose-100 dark:bg-rose-950/60'
                                  : 'bg-slate-200 dark:bg-slate-800'
                              }`}
                            >
                              <div
                                className={`h-full rounded-full transition-all duration-500 ${statusMeta.barClass}`}
                                style={{ width: `${item.calculation.percentRemaining}%` }}
                              />
                            </div>
                          </div>
                        )}

                        {isClaimed && (
                          <div className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-200/70 dark:border-indigo-800/50 text-[11px] text-indigo-800 dark:text-indigo-200">
                            <span className="font-semibold">
                              {lang === 'ar'
                                ? 'سجل الكفالة: تم استخدام تغطية الكفالة الرسمية لهذا الطلب'
                                : 'Coverage Log: Official warranty entitlement fulfilled for this record'}
                            </span>
                            <span dir="ltr" className="font-mono font-bold">
                              {item.calculation.claimInfo?.claimReference || 'CLAIMED'}
                            </span>
                          </div>
                        )}

                        {/* Official Terms & Direct Support Link */}
                        <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                          {(() => {
                            const hasArabicTerms =
                              Boolean(item.warrantyTerms) && /[\u0600-\u06FF]/.test(item.warrantyTerms || '');
                            const displayTerms =
                              lang === 'ar'
                                ? hasArabicTerms
                                  ? item.warrantyTerms
                                  : `كفالة رسمية لمدة ${item.calculation.warrantyMonths} شهراً من متجر \u2066ON AlAA STORE\u2069 ضد عيوب التصنيع والأعطال المصنعية.`
                                : item.warrantyTerms ||
                                  'Official ON AlAA STORE warranty covering verified manufacturing defects.';

                            return (
                              <p
                                dir={lang === 'ar' && hasArabicTerms ? 'rtl' : lang === 'ar' ? 'rtl' : 'ltr'}
                                className="text-[#64748B] dark:text-slate-400 leading-relaxed"
                              >
                                {displayTerms}
                              </p>
                            );
                          })()}
                          <div className="flex items-center gap-2 shrink-0">
                            <a
                              href="tel:03986718"
                              className="px-3 py-1.5 rounded-xl bg-[#F5F8FC] dark:bg-[#111A2E] border border-[#DCE5F0] dark:border-[#1E293B] text-[#172033] dark:text-[#F8FAFC] font-bold flex items-center gap-1.5 hover:border-[#007AFF] transition-colors whitespace-nowrap"
                            >
                              <Phone className="w-3.5 h-3.5 text-[#007AFF]" />
                              <span dir="ltr">03 986 718</span>
                            </a>
                            <a
                              href={`https://wa.me/9613986718?text=${whatsappMessage}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center gap-1.5 transition-colors shadow-xs whitespace-nowrap"
                            >
                              <WhatsApp3DIcon size={15} />
                              <span>
                                {item.calculation.status === 'expired'
                                  ? lang === 'ar'
                                    ? 'طلب صيانة مدفوعة'
                                    : 'Paid Repair Help'
                                  : isClaimed
                                  ? lang === 'ar'
                                    ? 'متابعة المطالبة'
                                    : 'Claim Follow-up'
                                  : lang === 'ar'
                                  ? 'طلب دعم الكفالة'
                                  : 'Warranty Claim'}
                              </span>
                            </a>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              /* Not Found Guidance */
              <div className="p-6 sm:p-8 rounded-2xl bg-white dark:bg-[#0E1726] border border-[#DCE5F0] dark:border-[#1E293B] text-center space-y-3">
                <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto" />
                <h3 className="font-bold text-sm sm:text-base text-[#172033] dark:text-[#F8FAFC]">
                  {lang === 'ar'
                    ? 'لم يتم العثور على سجل كفالة مطابق'
                    : 'No matching order or serial record found'}
                </h3>
                <p className="text-xs text-[#64748B] dark:text-slate-400 max-w-md mx-auto leading-relaxed">
                  {lang === 'ar'
                    ? 'يرجى التأكد من إدخال رقم الطلب (مثل OAA-2027-1001) أو الباركود / SKU الصحيح، أو التواصل مباشرة مع فريق ON AlAA STORE في الشوف عبر واتساب \u206603 986 718\u2069.'
                    : 'Please verify your Order ID (e.g. OAA-2027-1001) or product Barcode / SKU, or contact our Chouf support team on WhatsApp at 03 986 718 with your invoice.'}
                </p>
                <div className="pt-1 flex justify-center">
                  <a
                    href="https://wa.me/9613986718?text=Hello%20ON%20AlAA%20STORE%2C%20I%20would%20like%20help%20checking%20my%20device%20warranty."
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold inline-flex items-center gap-2 transition-colors"
                  >
                    <WhatsApp3DIcon size={16} />
                    <span>{lang === 'ar' ? 'تحقق عبر واتساب (03986718)' : 'Verify via WhatsApp (03986718)'}</span>
                  </a>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <WarrantyQrScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onDetected={handleQrDetected}
        lang={lang}
      />
    </section>
  );
};
