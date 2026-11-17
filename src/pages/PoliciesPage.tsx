import React, { useState, useEffect } from 'react';
import { useShop } from '../context/ShopContext';
import { ShieldCheck, Truck, RotateCcw, FileText, Lock } from 'lucide-react';

interface PoliciesPageProps {
  initialTab?: string;
}

export const PoliciesPage: React.FC<PoliciesPageProps> = ({ initialTab = 'delivery' }) => {
  const { lang, storeSettings } = useShop();
  const [activeTab, setActiveTab] = useState(initialTab.replace('policy-', ''));

  useEffect(() => {
    setActiveTab(initialTab.replace('policy-', ''));
  }, [initialTab]);

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
            {lang === 'ar' ? `سياسات وشروط ${storeSettings.storeNameAr || 'ON AlAA STORE'}` : `${storeSettings.storeName || 'ON AlAA STORE'} Terms & Policies`}
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

          <button
            onClick={() => setActiveTab('privacy')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'privacy'
                ? 'bg-[#007AFF] text-white shadow-xs shadow-[#007AFF]/20'
                : 'bg-[#F5F8FC] text-[#64748B] hover:text-[#172033] border border-[#DCE5F0]'
            }`}
          >
            <Lock className="w-3.5 h-3.5" />
            <span>{lang === 'ar' ? 'سياسة الخصوصية' : 'Privacy Policy'}</span>
          </button>
        </div>

        {/* Policy Content Body */}
        <div className="bg-white border border-[#DCE5F0] rounded-3xl p-6 sm:p-10 text-[#64748B] text-xs sm:text-sm leading-relaxed space-y-6 shadow-xs">
          {activeTab === 'delivery' && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-[#172033] flex items-center gap-2">
                <Truck className="w-5 h-5 text-[#007AFF]" />
                <span>{lang === 'ar' ? 'سياسة التوصيل الشاملة لجميع لبنان' : 'Online Store & All Lebanon Delivery Policy'}</span>
              </h2>
              <p>
                {lang === 'ar'
                  ? `يعمل متجر ${storeSettings.storeNameAr || 'ON AlAA STORE'} كمتجر إلكتروني رائد انطلاقاً من الشوف، مع خدمة توصيل سريعة وموثوقة متاحة لجميع المناطق اللبنانية.`
                  : `${storeSettings.storeName || 'ON AlAA STORE'} operates as an online store based in Chouf, with fast and reliable Cash on Delivery available across all regions of Lebanon.`}
              </p>

              <h3 className="font-bold text-[#172033] text-xs uppercase tracking-wider pt-2">
                {lang === 'ar' ? 'مناطق التوصيل في لبنان:' : 'Lebanon Delivery Coverage:'}
              </h3>
              <ul className="list-disc list-inside space-y-1.5 text-[#64748B]">
                <li>
                  <strong className="text-[#172033]">منطقة الشوف وجبل لبنان (Chouf & Mount Lebanon):</strong> توصيل سريع في نفس اليوم أو خلال 24 ساعة من مركز الانطلاق في الشوف.
                </li>
                <li>
                  <strong className="text-[#172033]">بيروت الكبرى والضواحي (Beirut & Suburbs):</strong> توصيل مؤمّن ومجاني للطلبات الكبيرة أو برسوم رمزية خلال 24 ساعة.
                </li>
                <li>
                  <strong className="text-[#172033]">جميع المحافظات اللبنانية (All Lebanon — North, South & Bekaa):</strong> توصيل متاح لكل لبنان خلال 24 إلى 48 ساعة مع فحص الطلب قبل الدفع.
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
                  ? `كافة الهواتف الذكية والأجهزة اللوحية واللابتوبات والإلكترونيات المباعة عبر ${storeSettings.storeNameAr || 'ON AlAA STORE'} مكفولة لمدة 12 أو 24 شهراً وفقاً للعلامة التجارية وشروط الوكيل المعتمد في لبنان.`
                  : `All smartphones, laptops, audio gear, and gadgets sold through ${storeSettings.storeName || 'ON AlAA STORE'} are covered by a 12 to 24 months official warranty depending on the manufacturer and regional distributor.`}
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
                  ? `في حال وجود عيب مصنعي، يتكفل متجر ${storeSettings.storeNameAr || 'ON AlAA STORE'} بفحص الجهاز أو استبداله فوراً دون أي تكاليف شحن إضافية.`
                  : `In case of a verified factory defect upon delivery, ${storeSettings.storeName || 'ON AlAA STORE'} covers complete return dispatch and replacement.`}
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
                  ? 'تخضع خدمات المحفظة الرقمية والتحويل عبر ويش موني (Whish Money) للقوانين المعمول بها في الجمهورية اللبنانية.'
                  : 'Digital wallet transfers via Whish Money comply strictly with applicable financial regulations in Lebanon.'}
              </p>
            </div>
          )}

          {activeTab === 'privacy' && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-[#172033] flex items-center gap-2">
                <Lock className="w-5 h-5 text-[#007AFF]" />
                <span>{lang === 'ar' ? 'سياسة الخصوصية وحماية البيانات' : 'Privacy Policy & Data Protection'}</span>
              </h2>
              <p>
                {lang === 'ar'
                  ? `يحترم متجر ${storeSettings.storeNameAr || 'ON AlAA STORE'} خصوصية عملائه في الشوف وكافة المناطق اللبنانية. تُستخدم معلومات التواصل والعنوان حصرياً لتأكيد الطلبات، التوصيل، وتفعيل الضمان الرسمي.`
                  : `${storeSettings.storeName || 'ON AlAA STORE'} respects customer privacy across Chouf and all Lebanon. Contact details and delivery addresses are collected solely to confirm orders, coordinate courier delivery, and register product warranty coverage.`}
              </p>
              <p>
                {lang === 'ar'
                  ? 'لا يتم بيع أو مشاركة بيانات العملاء مع أي أطراف تسويقية خارجية، وتُحفظ بيانات السجل السريع محلياً على جهازك لراحتك.'
                  : 'We never sell or share customer information with third-party advertisers. Quick search history is stored locally on your device for convenience and can be cleared anytime.'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
