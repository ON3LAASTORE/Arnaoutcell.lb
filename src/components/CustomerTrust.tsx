import React from 'react';
import { useShop } from '../context/ShopContext';
import { ShieldCheck, Truck, MapPin, Headphones, RefreshCw, Check } from 'lucide-react';

export const CustomerTrust: React.FC = () => {
  const { lang, setCurrentView, storeSettings } = useShop();

  const trustPoints = [
    {
      icon: ShieldCheck,
      color: 'text-[#007AFF] bg-[#EAF3FF] border-[#BAE6FD]',
      titleEn: '100% Genuine Guaranteed',
      titleAr: 'أجهزة أصلية 100% ومكفولة',
      descEn:
        'All smartphones, laptops, audio gear, and tech accessories are brand new and sourced from authorized regional distributors.',
      descAr:
        'كافة الهواتف الذكية وأجهزة اللابتوب والملحقات أصلية ومستوردة من الوكلاء المعتمدين مع فواتير وكفالات واضحة.',
    },
    {
      icon: Truck,
      color: 'text-[#007AFF] bg-[#EAF3FF] border-[#BAE6FD]',
      titleEn: 'Delivery Available to All Lebanon',
      titleAr: 'التوصيل متاح لجميع مناطق لبنان',
      descEn:
        'Fast and reliable door-to-door delivery across all Lebanese cities and towns, dispatched carefully from our Chouf hub.',
      descAr:
        'خدمة توصيل سريعة وموثوقة حتى باب بيتك في كافة المحافظات والمناطق اللبنانية، مع تجهيز فوري من مركزنا في الشوف.',
    },
    {
      icon: RefreshCw,
      color: 'text-[#16A34A] bg-emerald-50 border-emerald-200',
      titleEn: 'Store & Agent Warranty',
      titleAr: 'كفالة الوكيل والمتجر',
      descEn:
        'Hardware defect coverage up to 12-24 months. Dedicated tech specialists to assist with inquiries, repairs, and official warranty claims.',
      descAr:
        'كفالة رسمية من 12 إلى 24 شهراً ضد عيوب المصنع مع فريق تقني متخصص لمتابعة كافة الاستفسارات والكفالات المعتمدة.',
    },
    {
      icon: Headphones,
      color: 'text-purple-600 bg-purple-50 border-purple-200',
      titleEn: 'Friendly Lebanese Support',
      titleAr: 'خدمة عملاء مباشرة 03 986 718',
      descEn:
        'Need advice before purchasing? Reach our experienced technicians directly via call or WhatsApp at 03 986 718.',
      descAr:
        'استشارة تقنية صادقة وسريعة لاختيار الجهاز والملحقات المناسبة لميزانيتك واحتياجاتك عبر الهاتف أو واتساب على 03 986 718.',
    },
  ];

  return (
    <section className="py-16 md:py-20 bg-white border-b border-[#DCE5F0]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {trustPoints.map((item, idx) => (
            <div
              key={idx}
              className="p-6 rounded-2xl bg-white border border-[#DCE5F0] hover:border-[#007AFF] shadow-xs hover:shadow-[0_4px_16px_-2px_rgba(0,122,255,0.1)] transition-all flex flex-col justify-between"
            >
              <div>
                <div
                  className={`w-12 h-12 rounded-xl flex items-center justify-center border mb-4 ${item.color}`}
                >
                  <item.icon className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-[#172033] text-base mb-2">
                  {lang === 'ar' ? item.titleAr : item.titleEn}
                </h3>
                <p className="text-xs text-[#64748B] leading-relaxed">
                  {lang === 'ar' ? item.descAr : item.descEn}
                </p>
              </div>

              <div className="pt-4 mt-4 border-t border-[#DCE5F0] flex items-center gap-1.5 text-[11px] font-semibold text-[#16A34A]">
                <Check className="w-3.5 h-3.5" />
                <span>{lang === 'ar' ? 'معتمد رسمياً' : 'Verified Standard'}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Chouf Online Store & Nationwide Delivery Hub */}
        <div className="mt-12 p-6 sm:p-8 rounded-3xl bg-[#F5F8FC] border border-[#DCE5F0] flex flex-col lg:flex-row items-center justify-between gap-6 shadow-xs">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-[#EAF3FF] border border-[#BAE6FD] flex items-center justify-center text-[#007AFF] flex-shrink-0">
              <Truck className="w-7 h-7" />
            </div>
            <div>
              <span className="text-[11px] font-bold text-[#007AFF] tracking-wider uppercase">
                {lang === 'ar' ? 'متجر إلكتروني — مقره الشوف' : 'ONLINE TECH STORE — BASED IN CHOUF'}
              </span>
              <h4 className="text-lg sm:text-xl font-bold text-[#172033]">
                {lang === 'ar' ? 'التوصيل متاح لجميع مناطق لبنان 🚚' : 'Delivery Available to All Lebanon 🚚'}
              </h4>
              <p className="text-xs text-[#64748B] mt-0.5">
                {lang === 'ar' ? storeSettings.openingHoursAr : storeSettings.openingHoursEn}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <a
              href="https://wa.me/9613986718"
              target="_blank"
              rel="noopener noreferrer"
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition-colors cursor-pointer flex items-center gap-2"
            >
              <span>{lang === 'ar' ? 'طلب فوري عبر واتساب' : 'Order via WhatsApp'}</span>
            </a>
            <a
              href="tel:03986718"
              className="px-5 py-2.5 rounded-xl bg-white hover:bg-[#EAF3FF] text-[#172033] font-bold text-xs border border-[#DCE5F0] transition-colors"
            >
              03 986 718
            </a>
          </div>
        </div>
      </div>
    </section>
  );
};
