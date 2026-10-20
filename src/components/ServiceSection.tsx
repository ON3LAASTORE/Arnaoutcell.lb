import React from 'react';
import { useShop } from '../context/ShopContext';
import {
  Banknote,
  Send,
  Smartphone,
  CreditCard,
  MapPin,
  Phone,
  MessageSquare,
  CheckCircle,
} from 'lucide-react';

export const ServiceSection: React.FC = () => {
  const { lang, setCurrentView } = useShop();

  const services = [
    {
      id: 'omt',
      titleEn: 'OMT Services',
      titleAr: 'خدمات OMT المالية',
      badge: 'Official OMT Agent',
      badgeAr: 'وكيل OMT معتمد',
      icon: Banknote,
      color: 'text-[#007AFF] bg-[#EAF3FF] border-[#BAE6FD]',
      descriptionEn:
        'Fast domestic & worldwide money transfers via OMT Intra and Western Union. Pay official utility bills, mechanic fees, and municipal dues in Saida.',
      descriptionAr:
        'إرسال واستلام الأموال فورياً داخل وخارج لبنان عبر شبكة OMT وويسترن يونيون، تسديد الرسوم الميكانيكية، وفواتير المياه والكهرباء والاتصالات.',
      featuresEn: [
        'Instant cash collection & payout in USD or LBP',
        'Gov & Telecom bill settlements',
        'Official Western Union transactions',
      ],
      featuresAr: [
        'استلام وتسليم نقدي فوري بالدولار أو الليرة',
        'دفع فواتير الدولة ورسوم الميكانيك',
        'حوالات ويسترن يونيون الدولية المعتمدة',
      ],
    },
    {
      id: 'western-union',
      titleEn: 'Western Union',
      titleAr: 'خدمات ويسترن يونيون (Western Union)',
      badge: 'Global Transfers',
      badgeAr: 'حوالات عالمية',
      icon: Send,
      color: 'text-[#007AFF] bg-[#EAF3FF] border-[#BAE6FD]',
      descriptionEn:
        'Reliable cross-border remittances to over 200 countries worldwide. Immediate payout to beneficiaries with zero delay at our Nijme Square branch.',
      descriptionAr:
        'تحويل واستلام الأموال مع أكثر من 200 دولة حول العالم بأعلى موثوقية وأمان مع تسليم المبالغ فوراً في فرعنا بساحة النجمة.',
      featuresEn: [
        'International remittances in fresh USD',
        'MTCN live tracking assistance',
        'Friendly support for family transfers',
      ],
      featuresAr: [
        'حوالات دولية فورية بالدولار الكاش',
        'مساعدة في تتبع رقم الحوالة MTCN',
        'خدمة سريعة بدون انتظار طويل',
      ],
    },
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
            <Banknote className="w-4 h-4" />
            <span>{lang === 'ar' ? 'الخدمات المالية والاتصالات المعتمدة' : 'FINANCIAL & TELECOM SERVICES'}</span>
          </div>
          <h2 className="text-2xl sm:text-4xl font-black text-[#172033] tracking-tight">
            {lang === 'ar' ? 'كل ما تحتاجه في مكان واحد' : 'Your Complete In-Store Service Hub'}
          </h2>
          <p className="text-[#64748B] text-sm sm:text-base mt-2">
            {lang === 'ar'
              ? 'إلى جانب أحدث الإلكترونيات، نوفر لزبائننا في صيدا كافة المعاملات المالية والشحن والاتصالات تحت سقف واحد في ساحة النجمة.'
              : 'Beyond electronics retail, visit our Saida store for certified money transfers, telecom services, and bill settlements.'}
          </p>
        </div>

        {/* 4 Service Cards */}
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

              {/* Saida Branch Location & Contact CTA */}
              <div className="pt-4 border-t border-[#DCE5F0] flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-1.5 text-[#64748B]">
                  <MapPin className="w-3.5 h-3.5 text-[#007AFF] flex-shrink-0" />
                  <span>{lang === 'ar' ? 'صيدا - ساحة النجمة' : 'Saida, Nijme Square'}</span>
                </div>

                <a
                  href="tel:81900916"
                  className="px-4 py-2 rounded-xl bg-[#F5F8FC] hover:bg-[#EAF3FF] border border-[#DCE5F0] text-[#172033] font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Phone className="w-3.5 h-3.5 text-[#007AFF]" />
                  <span>81 900 916</span>
                </a>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom Banner with WhatsApp prompt */}
        <div className="mt-12 rounded-3xl p-6 sm:p-8 bg-[#EAF3FF] border border-[#BAE6FD] flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="space-y-1 text-center sm:text-left rtl:sm:text-right">
            <h4 className="text-lg font-bold text-[#172033]">
              {lang === 'ar' ? 'هل لديك أي استفسار حول خدمات التحويل أو الاتصالات؟' : 'Questions regarding money transfers or telecom services?'}
            </h4>
            <p className="text-xs sm:text-sm text-[#64748B]">
              {lang === 'ar'
                ? 'فريق أرناؤوط ستور جاهز لإرشادكم والإجابة على مدار ساعات العمل الرسمية عبر واتساب أو الهاتف.'
                : 'Our Saida team is ready to assist you during business hours via WhatsApp or direct call.'}
            </p>
          </div>

          <div className="flex items-center gap-3 flex-shrink-0">
            <a
              href="https://wa.me/96181900916?text=Hello%20ARNAOUT%20STORE%2C%20I%20have%20an%20inquiry%20regarding%20store%20services"
              target="_blank"
              rel="noopener noreferrer"
              className="px-5 py-3 rounded-xl bg-[#16A34A] hover:bg-[#15803D] text-white text-xs font-bold shadow-sm transition-all flex items-center gap-2 cursor-pointer"
            >
              <MessageSquare className="w-4 h-4" />
              <span>{lang === 'ar' ? 'محادثة عبر واتساب 81 900 916' : 'WhatsApp 81 900 916'}</span>
            </a>

            <button
              onClick={() => setCurrentView('contact')}
              className="px-4 py-3 rounded-xl bg-white hover:bg-[#F5F8FC] border border-[#DCE5F0] text-[#172033] text-xs font-bold transition-all cursor-pointer shadow-xs"
            >
              {lang === 'ar' ? 'موقع المحل وساعات العمل' : 'Store Location & Hours'}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};
