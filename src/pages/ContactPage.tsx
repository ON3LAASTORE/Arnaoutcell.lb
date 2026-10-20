import React, { useState } from 'react';
import { useShop } from '../context/ShopContext';
import {
  MapPin,
  Phone,
  Clock,
  MessageSquare,
  Send,
  CheckCircle,
  Building2,
  Sparkles,
} from 'lucide-react';
import { checkStoreOpenStatus } from '../utils/storeSchedule';

export const ContactPage: React.FC = () => {
  const { lang, storeSettings } = useShop();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const scheduleInfo = checkStoreOpenStatus(storeSettings.openingSchedule);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim() || !message.trim()) return;
    setSubmitted(true);
    setName('');
    setPhone('');
    setMessage('');
  };

  return (
    <div className="py-12 md:py-20 bg-white min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-14 space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EAF3FF] border border-[#BAE6FD] text-[#007AFF] text-xs font-bold tracking-wider mb-2">
            <Building2 className="w-3.5 h-3.5" />
            <span>{lang === 'ar' ? 'صيدا — ساحة النجمة' : 'SAIDA FLAGSHIP STORE'}</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-black text-[#172033]">
            {lang === 'ar' ? `تواصل مع ${storeSettings.storeNameAr || 'أرناؤوط ستور'}` : `Contact ${storeSettings.storeName}`}
          </h1>
          <p className="text-[#64748B] text-xs sm:text-sm">
            {lang === 'ar'
              ? 'نحن هنا لخدمتكم ومساعدتكم في اختيار أفضل الأجهزة والخدمات.'
              : 'Our technical team is ready to answer your inquiries and coordinate your orders.'}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Contact Information & Map */}
          <div className="lg:col-span-5 space-y-6">
            <div className="p-6 rounded-3xl bg-white border border-[#DCE5F0] space-y-5 shadow-xs">
              <h3 className="text-base font-bold text-[#172033] border-b border-[#DCE5F0] pb-3">
                {lang === 'ar' ? 'معلومات الاتصال المباشر' : 'Store Information'}
              </h3>

              {/* Phone */}
              <div className="flex items-start gap-3.5 text-xs">
                <div className="w-9 h-9 rounded-xl bg-[#EAF3FF] text-[#007AFF] flex items-center justify-center flex-shrink-0">
                  <Phone className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[#64748B] block font-semibold">{lang === 'ar' ? 'الهاتف المباشر:' : 'Direct Call:'}</span>
                  <a href="tel:81900916" className="text-base font-black text-[#172033] hover:text-[#007AFF] transition-colors">
                    81 900 916
                  </a>
                </div>
              </div>

              {/* WhatsApp */}
              <div className="flex items-start gap-3.5 text-xs">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 text-[#16A34A] flex items-center justify-center flex-shrink-0">
                  <MessageSquare className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[#64748B] block font-semibold">{lang === 'ar' ? 'خدمة واتساب الرسمية:' : 'Official WhatsApp:'}</span>
                  <a
                    href="https://wa.me/96181900916"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-bold text-[#16A34A] hover:underline"
                  >
                    +961 81 900 916
                  </a>
                </div>
              </div>

              {/* Location */}
              <div className="flex items-start gap-3.5 text-xs">
                <div className="w-9 h-9 rounded-xl bg-[#EAF3FF] text-[#007AFF] flex items-center justify-center flex-shrink-0">
                  <MapPin className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[#64748B] block font-semibold">{lang === 'ar' ? 'العنوان الجغرافي:' : 'Physical Address:'}</span>
                  <p className="text-[#172033] font-semibold leading-relaxed">
                    {lang === 'ar' ? storeSettings.locationAr : storeSettings.locationEn}
                  </p>
                </div>
              </div>

              {/* Hours */}
              <div className="flex items-start gap-3.5 text-xs">
                <div className="w-9 h-9 rounded-xl bg-[#F5F8FC] border border-[#DCE5F0] text-[#007AFF] flex items-center justify-center flex-shrink-0">
                  <Clock className="w-4 h-4" />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[#64748B] block font-semibold">
                      {lang === 'ar' ? 'ساعات العمل الرسمية:' : 'Store Opening Schedule:'}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        scheduleInfo.isOpen
                          ? 'bg-emerald-50 text-[#16A34A] border-emerald-200'
                          : 'bg-amber-50 text-amber-700 border-amber-200'
                      }`}
                    >
                      {lang === 'ar' ? scheduleInfo.statusBadgeAr : scheduleInfo.statusBadgeEn}
                    </span>
                  </div>
                  <p className="text-xs font-bold text-[#007AFF]">
                    {lang === 'ar'
                      ? (storeSettings.openingSchedule?.customMessageAr || 'مفتوح يومياً — 17 ساعة يومياً')
                      : (storeSettings.openingSchedule?.customMessageEn || 'OPEN EVERY DAY — 17 HOURS DAILY')}
                  </p>
                  <p className="text-xs font-semibold text-[#172033]">
                    {lang === 'ar' ? storeSettings.openingHoursAr : storeSettings.openingHoursEn}
                  </p>
                  <p className="text-[11px] text-[#64748B]">
                    {lang === 'ar'
                      ? 'يفتح المتجر الساعة 8:00 صباحاً ويغلق الساعة 1:00 بعد منتصف الليل (17 ساعة متواصلة).'
                      : 'Opens at 8:00 AM and closes at 1:00 AM the following calendar day (17 continuous hours).'}
                  </p>
                </div>
              </div>
            </div>

            {/* Interactive Saida Map Visual Card */}
            <div className="rounded-3xl overflow-hidden border border-[#DCE5F0] bg-[#F5F8FC] relative h-60">
              <div className="relative h-full flex flex-col items-center justify-center text-center p-6 space-y-2">
                <div className="w-12 h-12 rounded-full bg-[#EAF3FF] text-[#007AFF] border border-[#BAE6FD] flex items-center justify-center shadow-xs">
                  <MapPin className="w-6 h-6" />
                </div>
                <h4 className="font-bold text-[#172033] text-sm">
                  {lang === 'ar' ? 'صيدا — ساحة النجمة، الشارع الرئيسي' : 'Saida — Nijme Square, Main Road'}
                </h4>
                <p className="text-[11px] text-[#64748B] max-w-xs">
                  {lang === 'ar' ? 'موقع استراتيجي وسط مدينة صيدا بالقرب من كافة المرافق العامة' : 'Central landmark in Saida city center with easy parking and street access.'}
                </p>
                <a
                  href="https://maps.google.com/?q=Saida+Nijme+Square"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 px-4 py-2 rounded-xl bg-[#007AFF] hover:bg-[#0066D6] text-white font-bold text-xs transition-colors shadow-xs"
                >
                  {lang === 'ar' ? 'فتح في خرائط جوجل' : 'Open in Google Maps'}
                </a>
              </div>
            </div>
          </div>

          {/* Contact & Inquiry Form */}
          <div className="lg:col-span-7">
            <div className="p-6 sm:p-8 rounded-3xl bg-white border border-[#DCE5F0] shadow-xs space-y-6">
              <div>
                <h3 className="text-lg font-bold text-[#172033] mb-1">
                  {lang === 'ar' ? 'أرسل استفسارك أو طلبك' : 'Send an Inquiry or Feedback'}
                </h3>
                <p className="text-xs text-[#64748B]">
                  {lang === 'ar'
                    ? 'سيقوم فريق الدعم الفني بالرد عليكم ومساعدتكم فوراً.'
                    : 'Fill in your details and our team will get in touch promptly.'}
                </p>
              </div>

              {submitted ? (
                <div className="p-6 rounded-2xl bg-emerald-50 border border-emerald-200 text-center space-y-2">
                  <CheckCircle className="w-8 h-8 text-[#16A34A] mx-auto" />
                  <h4 className="text-sm font-bold text-[#172033]">
                    {lang === 'ar' ? 'تم إرسال رسالتكم بنجاح!' : 'Message Received!'}
                  </h4>
                  <p className="text-xs text-[#64748B]">
                    {lang === 'ar'
                      ? `شكراً لتواصلكم مع ${storeSettings.storeNameAr || 'أرناؤوط ستور'}. سنتصل بكم على الرقم المسجل في أقرب وقت.`
                      : `Thank you for contacting ${storeSettings.storeName}. We will get back to you shortly.`}
                  </p>
                  <button
                    onClick={() => setSubmitted(false)}
                    className="mt-3 px-4 py-2 rounded-xl bg-white border border-[#DCE5F0] text-xs font-semibold text-[#172033] hover:bg-[#F5F8FC]"
                  >
                    {lang === 'ar' ? 'إرسال رسالة أخرى' : 'Send another message'}
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="text-xs text-[#172033] font-semibold block mb-1.5">
                      {lang === 'ar' ? 'الاسم الكريم' : 'Full Name'} <span className="text-[#DC2626]">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Walid S."
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full bg-[#FFFFFF] border border-[#DCE5F0] rounded-xl px-3.5 py-2.5 text-xs text-[#172033] focus:outline-none focus:border-[#007AFF]"
                    />
                  </div>

                  <div>
                    <label className="text-xs text-[#172033] font-semibold block mb-1.5">
                      {lang === 'ar' ? 'رقم الهاتف اللبناني' : 'Phone Number'} <span className="text-[#DC2626]">*</span>
                    </label>
                    <input
                      type="tel"
                      required
                      placeholder="81 900 916 / 70 xxx xxx"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full bg-[#FFFFFF] border border-[#DCE5F0] rounded-xl px-3.5 py-2.5 text-xs text-[#172033] focus:outline-none focus:border-[#007AFF] font-mono"
                    />
                  </div>

                  <div>
                    <label className="text-xs text-[#172033] font-semibold block mb-1.5">
                      {lang === 'ar' ? 'تفاصيل الاستفسار أو الجهاز المطلوب' : 'Message / Requested Gadget'} <span className="text-[#DC2626]">*</span>
                    </label>
                    <textarea
                      required
                      rows={4}
                      placeholder={lang === 'ar' ? 'اكتب استفسارك عن الأسعار، الصيانة، أو خدمات OMT...' : 'Enter your question about products, warranty, or OMT services...'}
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      className="w-full bg-[#FFFFFF] border border-[#DCE5F0] rounded-xl px-3.5 py-2.5 text-xs text-[#172033] focus:outline-none focus:border-[#007AFF]"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3.5 px-4 rounded-xl bg-[#007AFF] hover:bg-[#0066D6] text-white font-bold text-xs shadow-md shadow-[#007AFF]/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Send className="w-4 h-4" />
                    <span>{lang === 'ar' ? 'إرسال الرسالة الآن' : 'Send Message Now'}</span>
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
