import React from 'react';
import { useShop } from '../context/ShopContext';
import {
  Banknote,
  Send,
  CreditCard,
  Smartphone,
  MapPin,
  Phone,
  MessageSquare,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import { WhatsApp3DIcon } from '../components/icons/ThreeDIcons';

export const ServicesPage: React.FC = () => {
  const { lang, storeSettings } = useShop();

  return (
    <div className="py-12 md:py-20 bg-white dark:bg-[#0A0F1D] min-h-[100dvh] w-full transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-14 space-y-3">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#EAF3FF] border border-[#BAE6FD] text-[#007AFF] text-xs font-bold tracking-wider">
            <Banknote className="w-4 h-4" />
            <span>{lang === 'ar' ? 'المركز المالي والاتصالات في صيدا' : 'SAIDA FINANCIAL & TELECOM HUB'}</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-black text-[#172033]">
            {lang === 'ar' ? 'خدمات OMT، ويسترن يونيون، ويش موني وتوتش' : 'OMT, Western Union, Whish & Touch Services'}
          </h1>
          <p className="text-[#64748B] text-sm sm:text-base leading-relaxed">
            {lang === 'ar'
              ? 'في متجر أرناؤوط ستور بساحة النجمة في صيدا، نوفر كافة المعاملات المالية والشحن والاتصالات تحت سقف واحد بأعلى معايير السرعة والأمان.'
              : 'At our flagship Nijme Square store in Saida, we offer authorized cash remittances, bill payments, and telecom line activations.'}
          </p>
        </div>

        {/* Store Location Notice */}
        <div className="p-6 rounded-3xl bg-[#F5F8FC] border border-[#DCE5F0] mb-12 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-xs">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-[#EAF3FF] text-[#007AFF] flex items-center justify-center flex-shrink-0 border border-[#BAE6FD]">
              <MapPin className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-bold text-[#172033] text-base">
                {lang === 'ar' ? 'موقع الفرع في صيدا' : 'Physical Store in Saida'}
              </h4>
              <p className="text-xs text-[#64748B] mt-0.5">
                {lang === 'ar' ? storeSettings.locationAr : storeSettings.locationEn}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <a
              href="tel:81900916"
              className="px-5 py-2.5 rounded-xl bg-[#007AFF] hover:bg-[#0066D6] text-white font-bold text-xs flex items-center gap-1.5 transition-colors shadow-xs"
            >
              <Phone className="w-4 h-4" />
              <span>81 900 916</span>
            </a>
            <a
              href="https://wa.me/96181900916?text=Hello%20Arnaout%20Cell%2C%20I%20have%20an%20inquiry%20regarding%20OMT%2FWhish%20services"
              target="_blank"
              rel="noopener noreferrer"
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-green-700 hover:from-emerald-700 hover:to-green-800 text-white font-black text-xs flex items-center gap-2 transition-all shadow-md shadow-emerald-700/30 active:scale-95 group"
            >
              <WhatsApp3DIcon size={18} />
              <span>{lang === 'ar' ? 'استفسار / طلب عبر واتساب (81900916)' : 'Inquire / Order on WhatsApp (81900916)'}</span>
            </a>
          </div>
        </div>

        {/* 4 Deep Dive Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* OMT */}
          <div className="p-8 rounded-3xl bg-white border border-[#DCE5F0] hover:border-[#007AFF] shadow-xs hover:shadow-[0_4px_20px_-4px_rgba(0,122,255,0.12)] transition-all space-y-4">
            <div className="flex items-center justify-between">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center">
                <Banknote className="w-6 h-6" />
              </div>
              <span className="text-xs font-bold text-amber-700 px-3 py-1 rounded-full bg-amber-50 border border-amber-200">
                OMT Intra & Services
              </span>
            </div>

            <h3 className="text-xl font-bold text-[#172033]">
              {lang === 'ar' ? 'خدمات OMT المالية المعتمدة' : 'Official OMT Remittances'}
            </h3>
            <p className="text-xs text-[#64748B] leading-relaxed">
              {lang === 'ar'
                ? 'تحويل واستلام فوري للأموال النقدية بين كافة المناطق اللبنانية، تسديد رسوم الميكانيك، فواتير الهاتف الثابت والخلوي (Alfa & Touch)، وفواتير المياه والكهرباء.'
                : 'Instant cash transfers between all regions in Lebanon, mechanic fees settlement, fixed line and mobile bill payments (Touch & Alfa).'}
            </p>

            <div className="space-y-2 pt-2 text-xs text-[#172033]">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-[#16A34A]" />
                <span>{lang === 'ar' ? 'تسليم نقدي فوري بالدولار الفريش أو الليرة' : 'Cash payout in Fresh USD or LBP'}</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-[#16A34A]" />
                <span>{lang === 'ar' ? 'دفع كافة الرسوم والضرائب الرسمية' : 'All official government fees settlements'}</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-[#16A34A]" />
                <span>{lang === 'ar' ? 'مطلوب إبراز الهوية أو جواز السفر الأصلي' : 'Valid original ID or Passport required'}</span>
              </div>
            </div>
          </div>

          {/* Western Union */}
          <div className="p-8 rounded-3xl bg-white border border-[#DCE5F0] hover:border-[#007AFF] shadow-xs hover:shadow-[0_4px_20px_-4px_rgba(0,122,255,0.12)] transition-all space-y-4">
            <div className="flex items-center justify-between">
              <div className="w-12 h-12 rounded-2xl bg-yellow-50 text-yellow-600 border border-yellow-200 flex items-center justify-center">
                <Send className="w-6 h-6" />
              </div>
              <span className="text-xs font-bold text-yellow-700 px-3 py-1 rounded-full bg-yellow-50 border border-yellow-200">
                Western Union Global
              </span>
            </div>

            <h3 className="text-xl font-bold text-[#172033]">
              {lang === 'ar' ? 'ويسترن يونيون — حوالات دولية' : 'Western Union Money Transfer'}
            </h3>
            <p className="text-xs text-[#64748B] leading-relaxed">
              {lang === 'ar'
                ? 'إرسال واستقبال الحوالات المالية الدولية من وإلى أكثر من 200 دولة وإقليم حول العالم مع توفر السيولة النقدية الفورية بالدولار الأمريكي.'
                : 'Send and receive money globally to and from over 200 countries with guaranteed USD cash liquidity in Saida.'}
            </p>

            <div className="space-y-2 pt-2 text-xs text-[#172033]">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-[#16A34A]" />
                <span>{lang === 'ar' ? 'رقم تتبع الحوالة MTCN الفوري' : 'Instant MTCN tracking number provided'}</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-[#16A34A]" />
                <span>{lang === 'ar' ? 'إجراءات سريعة وبدون انتظار' : 'Minimal wait time & swift cash handout'}</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-[#16A34A]" />
                <span>{lang === 'ar' ? 'دعم كامل للمغتربين وعائلاتهم' : 'Support for diaspora remittances'}</span>
              </div>
            </div>

            {/* Direct Line for Western Union: 03 099 899 */}
            <div className="pt-4 border-t border-[#DCE5F0] flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="text-[#64748B] font-semibold">{lang === 'ar' ? 'الخط المباشر لويسترن يونيون:' : 'Western Union Direct Line:'}</span>
              <div className="flex items-center gap-2">
                <a
                  href="tel:03099899"
                  className="px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-900 font-bold flex items-center gap-1.5 transition-colors"
                >
                  <Phone className="w-3.5 h-3.5 text-amber-700" />
                  <span>03 099 899</span>
                </a>
                <a
                  href="https://wa.me/96103099899?text=Hello%20Arnaout%20Cell%2C%20I%20have%20an%20inquiry%20regarding%20Western%20Union%20money%20transfers"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-2.5 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-800 font-bold flex items-center gap-1 transition-all"
                  title="WhatsApp: 03 099 899"
                >
                  <WhatsApp3DIcon size={16} />
                  <span>واتساب</span>
                </a>
              </div>
            </div>
          </div>

          {/* Whish Money */}
          <div className="p-8 rounded-3xl bg-white border border-[#DCE5F0] hover:border-[#007AFF] shadow-xs hover:shadow-[0_4px_20px_-4px_rgba(0,122,255,0.12)] transition-all space-y-4">
            <div className="flex items-center justify-between">
              <div className="w-12 h-12 rounded-2xl bg-[#EAF3FF] text-[#007AFF] border border-[#BAE6FD] flex items-center justify-center">
                <CreditCard className="w-6 h-6" />
              </div>
              <span className="text-xs font-bold text-[#007AFF] px-3 py-1 rounded-full bg-[#EAF3FF] border border-[#BAE6FD]">
                Whish Money Agent
              </span>
            </div>

            <h3 className="text-xl font-bold text-[#172033]">
              {lang === 'ar' ? 'ويش موني — المحفظة الرقمية' : 'Whish Money Hub'}
            </h3>
            <p className="text-xs text-[#64748B] leading-relaxed">
              {lang === 'ar'
                ? 'شحن رصيد المحفظة الإلكترونية وسحب الكاش بدون تعقيدات، شراء بطاقات الألعاب الرقمية (PlayStation, PUBG, Steam, Xbox)، وشحن اشتراكات الإنترنت.'
                : 'Top-up your Whish digital wallet, cash-out, and buy online gaming cards and digital streaming subscriptions.'}
            </p>

            <div className="space-y-2 pt-2 text-xs text-[#172033]">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-[#16A34A]" />
                <span>{lang === 'ar' ? 'سحب وتعبئة كاش فوري' : 'Zero hassle Cash-In and Cash-Out'}</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-[#16A34A]" />
                <span>{lang === 'ar' ? 'كافة بطاقات الألعاب والتطبيقات' : 'Gaming vouchers and digital gift cards'}</span>
              </div>
            </div>
          </div>

          {/* Touch Store */}
          <div className="p-8 rounded-3xl bg-white border border-[#DCE5F0] hover:border-[#007AFF] shadow-xs hover:shadow-[0_4px_20px_-4px_rgba(0,122,255,0.12)] transition-all space-y-4">
            <div className="flex items-center justify-between">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-[#16A34A] border border-emerald-200 flex items-center justify-center">
                <Smartphone className="w-6 h-6" />
              </div>
              <span className="text-xs font-bold text-[#16A34A] px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200">
                Touch Store Certified
              </span>
            </div>

            <h3 className="text-xl font-bold text-[#172033]">
              {lang === 'ar' ? 'توتش ستور وخدمات الخطوط' : 'Touch Store & Mobile Services'}
            </h3>
            <p className="text-xs text-[#64748B] leading-relaxed">
              {lang === 'ar'
                ? 'خدمات خطوط الهاتف المحمول المعتمدة: شراء خطوط مسبقة ولاحقة الدفع، استخراج بدل ضائع، تجديد وتمديد صلاحية الأيام، وتفعيل باقات الـ 4G/5G.'
                : 'Authorized Touch and Alfa line services: new SIM cards, replacement SIMs, prepaid line validity extension, and 4G/5G data packs.'}
            </p>

            <div className="space-y-2 pt-2 text-xs text-[#172033]">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-[#16A34A]" />
                <span>{lang === 'ar' ? 'تبديل شرائح SIM وبدل ضائع فوري' : 'Immediate replacement SIM activation'}</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-[#16A34A]" />
                <span>{lang === 'ar' ? 'شحن فوري للأيام والدولارات' : 'Instant days and recharge top-ups'}</span>
              </div>
            </div>

            {/* Direct Line for Touch Store: 03 099 899 */}
            <div className="pt-4 border-t border-[#DCE5F0] flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="text-[#64748B] font-semibold">{lang === 'ar' ? 'الخط المباشر لتوتش ستور:' : 'Touch Store Direct Line:'}</span>
              <div className="flex items-center gap-2">
                <a
                  href="tel:03099899"
                  className="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-900 font-bold flex items-center gap-1.5 transition-colors"
                >
                  <Phone className="w-3.5 h-3.5 text-emerald-700" />
                  <span>03 099 899</span>
                </a>
                <a
                  href="https://wa.me/96103099899?text=Hello%20Arnaout%20Cell%2C%20I%20have%20an%20inquiry%20regarding%20Touch%20telecom%20services"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-2.5 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-800 font-bold flex items-center gap-1 transition-all"
                  title="WhatsApp: 03 099 899"
                >
                  <WhatsApp3DIcon size={16} />
                  <span>واتساب</span>
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Requirements Banner */}
        <div className="mt-12 p-6 rounded-3xl bg-[#F5F8FC] border border-[#DCE5F0] text-xs text-[#64748B] flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-[#007AFF] flex-shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            {lang === 'ar'
              ? 'تنويه قانوني: تتطلب كافة المعاملات المالية (ويسترن يونيون و OMT) إبراز بطاقة الهوية اللبنانية الأصلية الصالحة أو جواز السفر الأصلي وفقاً لتعليمات مصرف لبنان والجهات المنظمة.'
              : 'Regulatory Notice: All money transfers and remittances require a valid physical Lebanese National ID or original Passport in compliance with Central Bank regulations.'}
          </p>
        </div>
      </div>
    </div>
  );
};
