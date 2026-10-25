import React, { useState } from 'react';
import { useShop } from '../context/ShopContext';
import { ShieldCheck, Truck, RotateCcw, FileText } from 'lucide-react';

interface PoliciesPageProps {
  initialTab?: string;
}

export const PoliciesPage: React.FC<PoliciesPageProps> = ({ initialTab = 'delivery' }) => {
  const { lang, storeSettings } = useShop();
  const [activeTab, setActiveTab] = useState(initialTab.replace('policy-', ''));

  return (
    <div className="py-12 md:py-20 bg-white dark:bg-[#0A0F1D] min-h-[100dvh] w-full transition-colors duration-200">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-10 space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EAF3FF] border border-[#BAE6FD] text-[#007AFF] text-xs font-bold tracking-wider mb-2">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>{lang === 'ar' ? 'السياسات والشروط المعتمدة' : 'OFFICIAL STORE POLICIES'}</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-black text-[#172033]">
            {lang === 'ar' ? `سياسات وشروط ${storeSettings.storeNameAr || 'أرناؤوط ستور'}` : `${storeSettings.storeName} Terms & Policies`}
          </h1>
          <p className="text-xs sm:text-sm text-[#64748B]">
            {lang === 'ar'
              ? `${storeSettings.locationAr} • هاتف: ${storeSettings.phone}`
              : `${storeSettings.locationEn} • Phone: ${storeSettings.phone}`}
          </p>
        </div>

        {/* Policy Tabs */}
        <div className="flex flex-wrap items-center justify-center gap-2 mb-10 border-b border-[#DCE5F0] pb-4">
          <button
            onClick={() => setActiveTab('delivery')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'delivery'
                ? 'bg-[#007AFF] text-white shadow-xs shadow-[#007AFF]/20'
                : 'bg-[#F5F8FC] text-[#64748B] hover:text-[#172033] border border-[#DCE5F0]'
            }`}
          >
            <Truck className="w-3.5 h-3.5" />
            <span>{lang === 'ar' ? 'سياسة التوصيل' : 'Delivery Policy'}</span>
          </button>

          <button
            onClick={() => setActiveTab('warranty')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'warranty'
                ? 'bg-[#007AFF] text-white shadow-xs shadow-[#007AFF]/20'
                : 'bg-[#F5F8FC] text-[#64748B] hover:text-[#172033] border border-[#DCE5F0]'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>{lang === 'ar' ? 'سياسة الكفالة والضمان' : 'Warranty Policy'}</span>
          </button>

          <button
            onClick={() => setActiveTab('returns')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'returns'
                ? 'bg-[#007AFF] text-white shadow-xs shadow-[#007AFF]/20'
                : 'bg-[#F5F8FC] text-[#64748B] hover:text-[#172033] border border-[#DCE5F0]'
            }`}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>{lang === 'ar' ? 'الاسترجاع والاستبدال' : 'Returns & Refunds'}</span>
          </button>

          <button
            onClick={() => setActiveTab('terms')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'terms'
                ? 'bg-[#007AFF] text-white shadow-xs shadow-[#007AFF]/20'
                : 'bg-[#F5F8FC] text-[#64748B] hover:text-[#172033] border border-[#DCE5F0]'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>{lang === 'ar' ? 'الشروط والأحكام' : 'Terms & Conditions'}</span>
          </button>
        </div>

        {/* Policy Content Body */}
        <div className="bg-white border border-[#DCE5F0] rounded-3xl p-6 sm:p-10 text-[#64748B] text-xs sm:text-sm leading-relaxed space-y-6 shadow-xs">
          {activeTab === 'delivery' && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-[#172033] flex items-center gap-2">
                <Truck className="w-5 h-5 text-[#007AFF]" />
                <span>{lang === 'ar' ? 'سياسة الشحن والتوصيل في لبنان' : 'Lebanon Shipping & Delivery Policy'}</span>
              </h2>
              <p>
                {lang === 'ar'
                  ? `يقدم متجر ${storeSettings.storeNameAr || 'أرناؤوط ستور'} خدمة التوصيل السريع إلى كافة الأراضي اللبنانية مع خيار الاستلام المجاني المباشر من فرعنا في صيدا — ساحة النجمة.`
                  : `${storeSettings.storeName} provides fast delivery across all governorates in Lebanon, in addition to free in-store pickup at our Saida store located at Nijme Square.`}
              </p>

              <h3 className="font-bold text-[#172033] text-xs uppercase tracking-wider pt-2">
                {lang === 'ar' ? 'المناطق ومواعيد التوصيل التقديرية:' : 'Zones & Delivery Timelines:'}
              </h3>
              <ul className="list-disc list-inside space-y-1.5 text-[#64748B]">
                <li>
                  <strong className="text-[#172033]">صيدا وضواحيها (Saida):</strong> توصيل في نفس اليوم (خلال ساعتين إلى 4 ساعات) أو استلام فوري مجاني.
                </li>
                <li>
                  <strong className="text-[#172033]">بيروت وجبل لبنان (Beirut & Mount Lebanon):</strong> توصيل خلال 24 إلى 48 ساعة كحد أقصى.
                </li>
                <li>
                  <strong className="text-[#172033]">الجنوب والنبطية (South & Nabatieh):</strong> توصيل خلال 24 إلى 48 ساعة.
                </li>
                <li>
                  <strong className="text-[#172033]">الشمال والبقاع (North & Bekaa):</strong> توصيل خلال يومين إلى 3 أيام عمل.
                </li>
              </ul>

              <p className="pt-2">
                {lang === 'ar'
                  ? 'يتم فحص وتغليف كافة الأجهزة بحرص تام لضمان وصولها بحالتها الأصلية مع الفاتورة الرسمية.'
                  : 'Every electronic device is safely packaged and dispatched with an official invoice and warranty receipt.'}
              </p>
            </div>
          )}

          {activeTab === 'warranty' && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-[#172033] flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-[#16A34A]" />
                <span>{lang === 'ar' ? 'شروط الكفالة الرسمية والضمان' : 'Official Warranty & Conditions'}</span>
              </h2>
              <p>
                {lang === 'ar'
                  ? `كافة الهواتف الذكية والأجهزة اللوحية واللابتوبات والإلكترونيات المباعة عبر ${storeSettings.storeNameAr || 'أرناؤوط ستور'} مكفولة لمدة 12 أو 24 شهراً وفقاً للعلامة التجارية وشروط الوكيل المعتمد في لبنان.`
                  : `All smartphones, laptops, audio gear, and gadgets sold through ${storeSettings.storeName} are covered by a 12 to 24 months official warranty depending on the manufacturer and regional distributor.`}
              </p>

              <h3 className="font-bold text-[#172033] text-xs uppercase tracking-wider pt-2">
                {lang === 'ar' ? 'ما تشمله الكفالة:' : 'What is Covered:'}
              </h3>
              <ul className="list-disc list-inside space-y-1 text-[#64748B]">
                <li>عيوب المصنع في اللوحة الأم، المعالج والشاشات الأصلية.</li>
                <li>خلل الشحن والبطارية غير الناتج عن سوء الاستخدام.</li>
                <li>استبدال فوري للجهاز في حال ثبوت عيب مصنعي خلال أول 7 أيام من تاريخ الشراء.</li>
              </ul>

              <h3 className="font-bold text-[#172033] text-xs uppercase tracking-wider pt-2">
                {lang === 'ar' ? 'ما لا تشمله الكفالة:' : 'Exclusions:'}
              </h3>
              <ul className="list-disc list-inside space-y-1 text-[#64748B]">
                <li>الكسور الناتجة عن السقوط أو الصدمات الميكانيكية.</li>
                <li>دخول السوائل أو الغرق للأجهزة غير المقاومة للماء.</li>
                <li>محاولات الصيانة أو الفتح في ورش خارجية غير معتمدة.</li>
              </ul>
            </div>
          )}

          {activeTab === 'returns' && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-[#172033] flex items-center gap-2">
                <RotateCcw className="w-5 h-5 text-[#007AFF]" />
                <span>{lang === 'ar' ? 'سياسة الاستبدال والاسترجاع' : 'Returns & Exchange Policy'}</span>
              </h2>
              <p>
                {lang === 'ar'
                  ? 'يحق للعميل استبدال أي ملحق أو جهاز غير مستخدم خلال 3 أيام من تاريخ الاستلام، شريطة أن يكون المنتج في علبته الأصلية المغلقة وبحالة المصنع.'
                  : 'Customers may exchange any unopened accessory or gadget within 3 days of delivery, provided the product remains in its sealed original retail box.'}
              </p>
              <p>
                {lang === 'ar'
                  ? `في حال وجود عيب مصنعي، يتكفل متجر ${storeSettings.storeNameAr || 'أرناؤوط ستور'} بفحص الجهاز أو استبداله فوراً دون أي تكاليف شحن إضافية.`
                  : `In case of a verified factory defect upon delivery, ${storeSettings.storeName} covers complete return dispatch and replacement.`}
              </p>
            </div>
          )}

          {activeTab === 'terms' && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-[#172033] flex items-center gap-2">
                <FileText className="w-5 h-5 text-[#007AFF]" />
                <span>{lang === 'ar' ? 'الشروط والأحكام العامة' : 'Terms & Conditions'}</span>
              </h2>
              <p>
                {lang === 'ar'
                  ? 'تخضع كافة الأسعار المذكورة بالدولار الأمريكي (USD) وتُقبل الدفعات نقداً بالدولار الفريش أو بالليرة اللبنانية بسعر الصرف المعتمد في المتجر وقت المعاملة.'
                  : 'All listed prices are denominated in USD. Payments are accepted in Fresh USD cash or Lebanese Pounds (LBP) according to the daily rate.'}
              </p>
              <p>
                {lang === 'ar'
                  ? 'تخضع خدمات ويسترن يونيون و OMT للقوانين المصرفية المعمول بها في الجمهورية اللبنانية ويتوجب إبراز بطاقة الهوية الرسمية.'
                  : 'Financial services via Western Union and OMT comply strictly with regulatory guidelines set by Banque du Liban.'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
