import React, { useState } from 'react';
import { useShop } from '../context/ShopContext';
import {
  Phone,
  Clock,
  Send,
  CheckCircle,
  Truck,
  Sparkles,
  Share2,
  Check,
  ShieldCheck,
  Globe,
} from 'lucide-react';
import { WhatsApp3DIcon } from '../components/icons/ThreeDIcons';
import { StoreStatusBadge } from '../components/StoreStatusBadge';
import {
  CHOUF_STORE_DATA,
  buildSendToPhoneUrl,
  buildLocationShareData,
} from '../utils/storeLocatorHelpers';

export const ContactPage: React.FC = () => {
  const { lang, storeSettings } = useShop();
  const isArabic = lang === 'ar';

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [copiedShare, setCopiedShare] = useState(false);

  const handleShare = async () => {
    const shareData = buildLocationShareData(isArabic);
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: shareData.title,
          text: shareData.text,
          url: shareData.url,
        });
        return;
      } catch {
        // fallback
      }
    }

    try {
      await navigator.clipboard.writeText(shareData.fullMessage);
      setCopiedShare(true);
      setTimeout(() => setCopiedShare(false), 2500);
    } catch {
      // fallback
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim() || !message.trim()) return;
    setSubmitted(true);
    setName('');
    setPhone('');
    setMessage('');
  };

  return (
    <div className="py-12 md:py-20 bg-white dark:bg-[#0A0F1D] min-h-[100dvh] w-full transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-14 space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EAF3FF] dark:bg-[#132238] border border-[#BAE6FD] dark:border-[#1E3A5F] text-[#007AFF] text-xs font-bold tracking-wider">
            <Globe className="w-3.5 h-3.5" />
            <span>{isArabic ? 'متجر إلكتروني — مقره الشوف' : 'ONLINE TECH STORE — BASED IN CHOUF'}</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black text-[#172033] dark:text-white">
            {isArabic ? (storeSettings.storeNameAr || 'متجر ON AlAA') : (storeSettings.storeName || 'ON AlAA STORE')}
          </h1>

          <p className="text-[#64748B] dark:text-slate-400 text-xs sm:text-sm">
            {isArabic
              ? 'متجر إلكتروني رائد مقره الشوف مع خدمة توصيل سريع وموثوق لكافة الأراضي اللبنانية. تواصل معنا للاستفسار عن الأجهزة، الأسعار، أو الكفالة.'
              : 'Premier online tech store based in Chouf with fast express delivery available to all Lebanon. Contact us for product inquiries, pricing, and warranty.'}
          </p>

          {/* Dynamic Live Status Indicator */}
          <div className="pt-2 flex justify-center">
            <StoreStatusBadge
              schedule={storeSettings.openingSchedule}
              isArabic={isArabic}
              variant="pill"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Contact Information & Delivery Coverage Card */}
          <div className="lg:col-span-5 space-y-6">
            <div className="p-6 sm:p-7 rounded-3xl bg-white dark:bg-[#0E1726] border border-[#DCE5F0] dark:border-[#1E293B] space-y-5 shadow-xs">
              <div className="flex items-center justify-between border-b border-[#DCE5F0] dark:border-[#1E293B] pb-3">
                <h3 className="text-base font-bold text-[#172033] dark:text-white">
                  {isArabic ? 'معلومات المتجر والتواصل' : 'Store & Contact Information'}
                </h3>
                <span className="text-xs font-black px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                  {isArabic ? 'متجر إلكتروني' : 'Online Store'}
                </span>
              </div>

              {/* Dynamic Status Card */}
              <StoreStatusBadge
                schedule={storeSettings.openingSchedule}
                isArabic={isArabic}
                variant="detailed"
              />

              {/* Delivery Coverage Highlight Box */}
              <div className="p-4 rounded-2xl bg-[#EAF3FF] dark:bg-[#132238] border border-[#BAE6FD] dark:border-[#1E3A5F] space-y-2">
                <div className="flex items-center gap-2">
                  <Truck className="w-5 h-5 text-[#007AFF]" />
                  <span className="text-sm font-black text-[#172033] dark:text-white">
                    {isArabic ? 'التوصيل متاح لجميع مناطق لبنان 🚚' : 'Delivery Available to All Lebanon 🚚'}
                  </span>
                </div>
                <p className="text-xs text-[#64748B] dark:text-slate-300 leading-relaxed">
                  {isArabic
                    ? 'مركز التوزيع الرئيسي في الشوف، مع شحن سريع وآمن حتى باب منزلك في بيروت، جبل لبنان، الشمال، الجنوب، والبقاع.'
                    : 'Dispatch operations hub based in Chouf, delivering rapidly and securely door-to-door across Beirut, Mount Lebanon, North, South, and Bekaa.'}
                </p>
              </div>

              {/* Phone */}
              <div className="flex items-start gap-3.5 text-xs">
                <div className="w-9 h-9 rounded-xl bg-[#EAF3FF] dark:bg-[#1E293B] text-[#007AFF] flex items-center justify-center flex-shrink-0">
                  <Phone className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[#64748B] dark:text-slate-400 block font-semibold">
                    {isArabic ? 'الهاتف المباشر:' : 'Direct Phone:'}
                  </span>
                  <a
                    href="tel:03986718"
                    dir="ltr"
                    className="inline-block text-base font-black text-[#172033] dark:text-white hover:text-[#007AFF] transition-colors"
                  >
                    03 986 718
                  </a>
                </div>
              </div>

              {/* WhatsApp */}
              <div className="flex items-start gap-3.5 text-xs">
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center flex-shrink-0 shadow-sm">
                  <WhatsApp3DIcon size={24} />
                </div>
                <div>
                  <span className="text-[#64748B] dark:text-slate-400 block font-semibold">
                    {isArabic ? 'خدمة واتساب الرسمية للطلب والاستفسار:' : 'Official WhatsApp Inquiries & Orders:'}
                  </span>
                  <a
                    href="https://wa.me/9613986718"
                    target="_blank"
                    rel="noopener noreferrer"
                    dir="ltr"
                    className="inline-block text-sm font-bold text-[#16A34A] hover:underline"
                  >
                    https://wa.me/9613986718 (03 986 718)
                  </a>
                </div>
              </div>

              {/* Operating Format & Location */}
              <div className="flex items-start gap-3.5 text-xs">
                <div className="w-9 h-9 rounded-xl bg-[#EAF3FF] dark:bg-[#1E293B] text-[#007AFF] flex items-center justify-center flex-shrink-0">
                  <Globe className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[#64748B] dark:text-slate-400 block font-semibold">
                    {isArabic ? 'نوع المتجر والمقر:' : 'Store Format & Location:'}
                  </span>
                  <p className="text-[#172033] dark:text-white font-semibold leading-relaxed">
                    {isArabic ? CHOUF_STORE_DATA.addressAr : CHOUF_STORE_DATA.addressEn}
                  </p>
                  <p className="text-[11px] text-[#007AFF] font-bold">
                    {isArabic ? CHOUF_STORE_DATA.landmarkAr : CHOUF_STORE_DATA.landmarkEn}
                  </p>
                </div>
              </div>

              {/* Hours */}
              <div className="flex items-start gap-3.5 text-xs">
                <div className="w-9 h-9 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 flex items-center justify-center flex-shrink-0">
                  <Clock className="w-4 h-4" />
                </div>
                <div className="space-y-1">
                  <span className="text-[#64748B] dark:text-slate-400 block font-semibold">
                    {isArabic ? 'ساعات الطلبات وخدمة العملاء:' : 'Online Orders & Support Schedule:'}
                  </span>
                  <p className="text-xs font-black text-purple-600 dark:text-purple-400">
                    {isArabic ? 'الطلبات أونلاين: 24/7 (الدعم: 8:00 ص – 1:00 ص)' : 'Online Orders: 24/7 (Support: 8:00 AM – 1:00 AM)'}
                  </p>
                  <p className="text-xs font-semibold text-[#172033] dark:text-white">
                    {isArabic ? CHOUF_STORE_DATA.openingHoursAr : CHOUF_STORE_DATA.openingHoursEn}
                  </p>
                </div>
              </div>

              {/* Action Buttons: WhatsApp & Share */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2 border-t border-[#DCE5F0] dark:border-[#1E293B]">
                <a
                  href={buildSendToPhoneUrl('03986718', 'whatsapp', isArabic)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <WhatsApp3DIcon size={16} />
                  <span>{isArabic ? 'محادثة واتساب 03986718' : 'WhatsApp 03986718'}</span>
                </a>

                <button
                  onClick={handleShare}
                  className="px-3 py-2.5 rounded-xl bg-[#F1F5F9] dark:bg-[#1E293B] hover:bg-slate-200 text-[#172033] dark:text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {copiedShare ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Share2 className="w-3.5 h-3.5 text-[#007AFF]" />}
                  <span>{copiedShare ? (isArabic ? 'تم النسخ!' : 'Copied!') : (isArabic ? 'مشاركة' : 'Share')}</span>
                </button>
              </div>
            </div>

            {/* Nationwide Delivery Coverage Visual Card */}
            <div className="rounded-3xl p-6 border border-[#DCE5F0] dark:border-[#1E293B] bg-[#F5F8FC] dark:bg-[#0E1726] space-y-4 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#EAF3FF] dark:bg-[#132238] flex items-center justify-center text-[#007AFF]">
                  <Truck className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-[#172033] dark:text-white">
                    {isArabic ? 'تغطية التوصيل الشاملة في لبنان' : 'Nationwide Lebanon Delivery'}
                  </h4>
                  <p className="text-[11px] text-[#64748B] dark:text-slate-400">
                    {isArabic ? 'شحن سريع ومباشر إلى كافة المحافظات' : 'Fast door-to-door dispatch to all regions'}
                  </p>
                </div>
              </div>

              <div className="space-y-2 text-xs">
                <div className="p-3 rounded-xl bg-white dark:bg-[#162038] border border-[#DCE5F0] dark:border-[#1E293B] flex items-center justify-between">
                  <span className="font-semibold text-[#172033] dark:text-white">
                    {isArabic ? 'الشوف وجبل لبنان' : 'Chouf & Mount Lebanon'}
                  </span>
                  <span className="text-[#007AFF] font-bold">
                    {isArabic ? 'خلال 24 ساعة' : 'Within 24 Hours'}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-white dark:bg-[#162038] border border-[#DCE5F0] dark:border-[#1E293B] flex items-center justify-between">
                  <span className="font-semibold text-[#172033] dark:text-white">
                    {isArabic ? 'بيروت الكبرى وضواحيها' : 'Greater Beirut & Suburbs'}
                  </span>
                  <span className="text-[#007AFF] font-bold">
                    {isArabic ? '1-2 أيام' : '1-2 Days'}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-white dark:bg-[#162038] border border-[#DCE5F0] dark:border-[#1E293B] flex items-center justify-between">
                  <span className="font-semibold text-[#172033] dark:text-white">
                    {isArabic ? 'كافة المناطق اللبنانية (الشمال، الجنوب، البقاع)' : 'All Lebanon (North, South, Bekaa)'}
                  </span>
                  <span className="text-[#007AFF] font-bold">
                    {isArabic ? '1-3 أيام' : '1-3 Days'}
                  </span>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs text-emerald-600 font-bold">
                  <ShieldCheck className="w-4 h-4" />
                  <span>{isArabic ? 'كفالة رسمية معتمدة' : 'Official Warranty Guaranteed'}</span>
                </div>
                <a
                  href="https://wa.me/9613986718"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 rounded-xl bg-[#007AFF] text-white text-[11px] font-bold flex items-center gap-1"
                >
                  <span>{isArabic ? 'طلب توصيل' : 'Order Delivery'}</span>
                </a>
              </div>
            </div>
          </div>

          {/* Contact & Inquiry Form */}
          <div className="lg:col-span-7">
            <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-[#0E1726] border border-[#DCE5F0] dark:border-[#1E293B] shadow-xs space-y-6">
              <div>
                <h3 className="text-lg font-bold text-[#172033] dark:text-white mb-1">
                  {isArabic ? 'أرسل استفسارك أو طلبك' : 'Send an Inquiry or Order Request'}
                </h3>
                <p className="text-xs text-[#64748B] dark:text-slate-400">
                  {isArabic
                    ? 'سيقوم فريق الدعم الفني بالرد عليكم ومساعدتكم فوراً مع التوصيل لكافة الأراضي اللبنانية.'
                    : 'Fill in your details and our team will get in touch promptly with delivery available to all Lebanon.'}
                </p>
              </div>

              {submitted ? (
                <div className="p-6 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-center space-y-2">
                  <CheckCircle className="w-8 h-8 text-[#16A34A] mx-auto" />
                  <h4 className="text-sm font-bold text-[#172033] dark:text-white">
                    {isArabic ? 'تم إرسال رسالتكم بنجاح!' : 'Message Received!'}
                  </h4>
                  <p className="text-xs text-[#64748B] dark:text-slate-400">
                    {isArabic
                      ? 'شكراً لتواصلكم مع متجر ON AlAA. سنتصل بكم على الرقم المسجل في أقرب وقت مع خدمة التوصيل لكافة مناطق لبنان.'
                      : 'Thank you for contacting ON AlAA STORE. We will get back to you shortly with delivery to all Lebanon.'}
                  </p>
                  <button
                    onClick={() => setSubmitted(false)}
                    className="mt-3 px-4 py-2 rounded-xl bg-white dark:bg-[#1E293B] border border-[#DCE5F0] dark:border-[#334155] text-xs font-semibold text-[#172033] dark:text-white hover:bg-[#F5F8FC]"
                  >
                    {isArabic ? 'إرسال رسالة أخرى' : 'Send another message'}
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="text-xs text-[#172033] dark:text-slate-300 font-semibold block mb-1.5">
                      {isArabic ? 'الاسم الكريم' : 'Full Name'} <span className="text-[#DC2626]">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Walid S."
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full bg-[#FFFFFF] dark:bg-[#162038] border border-[#DCE5F0] dark:border-[#1E293B] rounded-xl px-3.5 py-2.5 text-xs text-[#172033] dark:text-white focus:outline-none focus:border-[#007AFF]"
                    />
                  </div>

                  <div>
                    <label className="text-xs text-[#172033] dark:text-slate-300 font-semibold block mb-1.5">
                      {isArabic ? 'رقم الهاتف اللبناني' : 'Phone Number'} <span className="text-[#DC2626]">*</span>
                    </label>
                    <input
                      type="tel"
                      required
                      placeholder="03 986 718 / 70 xxx xxx"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full bg-[#FFFFFF] dark:bg-[#162038] border border-[#DCE5F0] dark:border-[#1E293B] rounded-xl px-3.5 py-2.5 text-xs text-[#172033] dark:text-white focus:outline-none focus:border-[#007AFF] font-mono"
                    />
                  </div>

                  <div>
                    <label className="text-xs text-[#172033] dark:text-slate-300 font-semibold block mb-1.5">
                      {isArabic ? 'تفاصيل الاستفسار أو الجهاز المطلوب ومنطقة التوصيل' : 'Message / Requested Device & Delivery Area'} <span className="text-[#DC2626]">*</span>
                    </label>
                    <textarea
                      required
                      rows={4}
                      placeholder={isArabic ? 'اكتب استفسارك عن الأجهزة، الأسعار، أو عنوان التوصيل في لبنان...' : 'Enter your question about devices, pricing, or delivery in Lebanon...'}
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      className="w-full bg-[#FFFFFF] dark:bg-[#162038] border border-[#DCE5F0] dark:border-[#1E293B] rounded-xl px-3.5 py-2.5 text-xs text-[#172033] dark:text-white focus:outline-none focus:border-[#007AFF]"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3.5 px-4 rounded-xl bg-[#007AFF] hover:bg-[#0066D6] text-white font-bold text-xs shadow-md shadow-[#007AFF]/20 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                  >
                    <Send className="w-4 h-4" />
                    <span>{isArabic ? 'إرسال الرسالة الآن' : 'Send Message Now'}</span>
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
