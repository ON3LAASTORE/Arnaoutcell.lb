import React from 'react';
import { useShop } from '../context/ShopContext';
import {
  Smartphone,
  CreditCard,
  MapPin,
  Phone,
  CheckCircle,
} from 'lucide-react';
import { WhatsApp3DIcon } from './icons/ThreeDIcons';

export const ServiceSection: React.FC = () => {
  const { lang, setCurrentView } = useShop();

  const services = [
    {
      id: 'whish-money',
      titleEn: 'Whish Money',
      titleAr: 'خدمات ويش موني (Whish Money)',
      badge: 'Digital Wallet Hub',
      badgeAr: 'محفظة رقمية ذكية',
      icon: CreditCard,
      color: 'text-[#007AFF] bg-[#EAF3FF] border-[#BAE6FD]',
      descriptionEn:
        'Cash-in and Cash-out for your Whish Wallet with 0% hassle. Buy online gaming cards (PlayStation, Steam, PUBG, iTunes) and e-vouchers.',
      descriptionAr:
        'تغذية وسحب كاش من محفظة ويش موني فورياً، شراء بطاقات الألعاب الإلكترونية (بلايستيشن، ستيم، شدات ببجي) وبطاقات التسوق عبر الإنترنت.',
      featuresEn: [
        'Instant Whish Wallet cash top-up & withdrawals',
        'Digital gaming & streaming cards',
        'QR payments & contactless vouchers',
      ],
      featuresAr: [
        'شحن وسحب فوري من رصيد محفظة Whish',
        'بطاقات ألعاب واشتراكات رقمية متكاملة',
        'دفع سريع عبر الـ QR كود',
      ],
    },
    {
      id: 'touch-store',
      titleEn: 'Touch Store & Telecom Services',
      titleAr: 'توتش ستور وخدمات الاتصالات',
      badge: 'Touch Telecom',
      badgeAr: 'خدمات الخطوط الرسمية',
      icon: Smartphone,
      color: 'text-[#007AFF] bg-[#EAF3FF] border-[#BAE6FD]',
      descriptionEn:
        'Official Touch and Alfa mobile line services: new SIM cards, replacement SIMs, line renewals, and 4G/5G mobile internet bundle activations.',
      descriptionAr:
        'خدمات خطوط توتش وألفا المعتمدة: شراء شرائح جديدة، استخراج بدل ضائع، تجديد صلاحية الخطوط، وتفعيل باقات الإنترنت 4G/5G بأسعار رسمية.',
      featuresEn: [
        'Touch & Alfa SIM card replacement & registration',
        'Prepaid & Postpaid line renewals',
        'High-speed 4G / 5G data bundles',
      ],
      featuresAr: [
        'استخراج شرائح بدل ضائع وتثبيت الخطوط',
        'تجديد صلاحية الخطوط ودفع الفواتير',
        'شحن باقات إنترنت فائقة السرعة',
      ],
    },
  ];

  return (
    <section className="py-16 md:py-24 bg-[#F5F8FC] border-b border-[#DCE5F0] relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-14">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#EAF3FF] border border-[#BAE6FD] text-[#007AFF] text-xs font-bold tracking-wider mb-3">
            <CreditCard className="w-4 h-4" />
            <span>{lang === 'ar' ? 'خدمات المحفظة الرقمية والاتصالات' : 'DIGITAL WALLET & TELECOM SERVICES'}</span>
          </div>
          <h2 className="text-2xl sm:text-4xl font-black text-[#172033] tracking-tight">
            {lang === 'ar' ? 'كل ما تحتاجه في متجر واحد' : 'Your Complete Online Service Hub'}
          </h2>
          <p className="text-[#64748B] text-sm sm:text-base mt-2">
            {lang === 'ar'
              ? 'إلى جانب أحدث الإلكترونيات والتوصيل لجميع مناطق لبنان من مقرنا في الشوف، نوفر خدمات ويش موني والاتصالات.'
              : 'Beyond electronics retail with delivery across all Lebanon from our Chouf hub, get Whish Money wallet support and Touch/Alfa telecom services.'}
          </p>
        </div>

        {/* Service Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {services.map((svc) => (
            <div
              key={svc.id}
              className="rounded-3xl p-6 sm:p-8 bg-white border border-[#DCE5F0] hover:border-[#007AFF] transition-all duration-300 hover:shadow-[0_8px_24px_-4px_rgba(0,122,255,0.12)] shadow-xs flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border ${svc.color}`}>
                    <svc.icon className="w-6 h-6" />
                  </div>
                  <span className="text-[11px] font-bold px-3 py-1 rounded-full bg-[#EAF3FF] text-[#007AFF] border border-[#BAE6FD] uppercase tracking-wider">
                    {lang === 'ar' ? svc.badgeAr : svc.badge}
                  </span>
                </div>

                <h3 className="text-xl font-bold text-[#172033] mb-2">
                  {lang === 'ar' ? svc.titleAr : svc.titleEn}
                </h3>
                <p className="text-sm text-[#64748B] leading-relaxed mb-5">
                  {lang === 'ar' ? svc.descriptionAr : svc.descriptionEn}
                </p>

                {/* Bullet Points */}
                <div className="space-y-2 mb-6">
                  {(lang === 'ar' ? svc.featuresAr : svc.featuresEn).map((feat, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-xs text-[#172033]">
                      <CheckCircle className="w-4 h-4 text-[#007AFF] flex-shrink-0" />
                      <span>{feat}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Chouf Online Hub Location & Contact CTA */}
              <div className="pt-4 border-t border-[#DCE5F0] flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-1.5 text-[#64748B]">
                  <MapPin className="w-3.5 h-3.5 text-[#007AFF] flex-shrink-0" />
                  <span>{lang === 'ar' ? 'الشوف • توصيل لكل لبنان' : 'Chouf Hub • All Lebanon'}</span>
                </div>

                <div className="flex items-center gap-2">
                  <a
                    href="tel:03986718"
                    className="px-3 py-1.5 rounded-xl border font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer bg-[#F5F8FC] dark:bg-[#111A2E] hover:bg-[#EAF3FF] border-[#DCE5F0] dark:border-[#1E293B] text-[#172033] dark:text-[#F8FAFC]"
                    title="ON AlAA STORE Hotline: 03 986 718"
                  >
                    <Phone className="w-3.5 h-3.5 text-[#007AFF]" />
                    <span dir="ltr">03 986 718</span>
                  </a>
                  <a
                    href="https://wa.me/9613986718?text=Hello%20ON%20AlAA%20STORE%2C%20I%20have%20an%20inquiry%20regarding%20your%20services"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-2.5 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 border border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-300 font-bold text-xs flex items-center gap-1 transition-all"
                    title="WhatsApp: 03 986 718"
                  >
                    <WhatsApp3DIcon size={16} />
                    <span className="text-[11px]">WhatsApp</span>
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom Banner with WhatsApp prompt */}
        <div className="mt-12 rounded-3xl p-6 sm:p-8 bg-[#EAF3FF] border border-[#BAE6FD] flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="space-y-1 text-center sm:text-left rtl:sm:text-right">
            <h4 className="text-lg font-bold text-[#172033]">
              {lang === 'ar' ? 'هل لديك أي استفسار حول خدمات ويش موني أو الاتصالات؟' : 'Questions regarding Whish Money or telecom services?'}
            </h4>
            <p className="text-xs sm:text-sm text-[#64748B]">
              {lang === 'ar'
                ? 'فريق ON AlAA STORE في الشوف جاهز لإرشادكم وتأكيد الطلبات مع توصيل لكافة مناطق لبنان.'
                : 'Our Chouf-based online team is ready to assist customers across all Lebanon via WhatsApp or direct call.'}
            </p>
          </div>

          <div className="flex items-center gap-3 flex-shrink-0">
            <a
              href="https://wa.me/9613986718?text=Hello%20ON%20AlAA%20STORE%2C%20I%20have%20an%20inquiry%20regarding%20store%20services"
              target="_blank"
              rel="noopener noreferrer"
              className="px-5 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-green-700 hover:from-emerald-700 hover:to-green-800 text-white text-xs font-black shadow-md shadow-emerald-700/30 transition-all flex items-center gap-2.5 cursor-pointer group active:scale-95"
            >
              <WhatsApp3DIcon size={20} />
              <span>{lang === 'ar' ? 'استفسار / طلب عبر واتساب (03986718)' : 'Inquire / Order on WhatsApp (03986718)'}</span>
            </a>

            <button
              onClick={() => setCurrentView('contact')}
              className="px-4 py-3 rounded-xl bg-white hover:bg-[#F5F8FC] border border-[#DCE5F0] text-[#172033] text-xs font-bold transition-all cursor-pointer shadow-xs"
            >
              {lang === 'ar' ? 'التواصل ونطاق التوصيل' : 'Contact & Delivery Coverage'}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};
