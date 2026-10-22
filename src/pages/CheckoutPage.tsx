import React, { useState } from 'react';
import { useShop } from '../context/ShopContext';
import { PaymentMethod } from '../types';
import {
  ShieldCheck,
  Truck,
  MapPin,
  Phone,
  Banknote,
  MessageSquare,
  CheckCircle2,
  Lock,
  AlertCircle,
} from 'lucide-react';
import { WhatsApp3DIcon } from '../components/icons/ThreeDIcons';

export const CheckoutPage: React.FC = () => {
  const {
    lang,
    t,
    cart,
    cartSubtotal,
    storeSettings,
    submitOrder,
    setCurrentView,
    generateWhatsAppOrderUrl,
  } = useShop();

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [alternatePhone, setAlternatePhone] = useState('');
  const [selectedZoneId, setSelectedZoneId] = useState(
    storeSettings.deliveryZones[0]?.id || 'zone-saida-pickup'
  );
  const [addressLine, setAddressLine] = useState('');
  const [notes, setNotes] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cod');
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedZone =
    storeSettings.deliveryZones.find((z) => z.id === selectedZoneId) ||
    storeSettings.deliveryZones[0];

  const deliveryFee = selectedZone ? selectedZone.fee : 0;
  const grandTotal = cartSubtotal + deliveryFee;

  if (cart.length === 0) {
    return (
      <div className="py-24 bg-[#F5F8FC] text-center min-h-[60vh] flex flex-col items-center justify-center">
        <h2 className="text-xl font-bold text-[#172033] mb-2">{t.emptyCart}</h2>
        <button
          onClick={() => setCurrentView('products')}
          className="px-6 py-2.5 rounded-xl bg-[#007AFF] text-white font-bold text-xs hover:bg-[#0066D6]"
        >
          {t.continueShopping}
        </button>
      </div>
    );
  }

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!fullName.trim()) {
      setErrorMessage(lang === 'ar' ? 'يرجى إدخال الاسم الكريم' : 'Please provide your full name');
      return;
    }

    if (!phone.trim() || phone.replace(/\D/g, '').length < 7) {
      setErrorMessage(
        lang === 'ar'
          ? 'يرجى إدخال رقم هاتف لبناني صالح (مثال: 81 900 916 أو 70 xxx xxx)'
          : 'Please provide a valid Lebanese phone number (e.g. 81 900 916)'
      );
      return;
    }

    if (!addressLine.trim()) {
      setErrorMessage(
        lang === 'ar'
          ? 'يرجى توضيح تفاصيل العنوان (الشارع، البناية، أو نقطة علامة)'
          : 'Please enter detailed address information'
      );
      return;
    }

    try {
      setIsSubmitting(true);

      const orderItems = cart.map((item) => ({
        productId: item.product.id,
        productName: item.product.name,
        brand: item.product.brand,
        price: item.selectedVariant ? item.selectedVariant.price : item.product.price,
        quantity: item.quantity,
        image: item.product.images[0],
        color: item.selectedColor,
        variantName: item.selectedVariant?.name,
      }));

      submitOrder({
        customer: {
          fullName: fullName.trim(),
          phone: phone.trim(),
          alternatePhone: alternatePhone.trim() || undefined,
          cityArea: lang === 'ar' ? selectedZone.nameAr : selectedZone.nameEn,
          addressLine: addressLine.trim(),
          notes: notes.trim() || undefined,
        },
        items: orderItems,
        subtotal: cartSubtotal,
        discount: 0,
        deliveryFee,
        total: grandTotal,
        currency: 'USD',
        status: 'new',
        paymentMethod,
        paymentStatus: paymentMethod === 'store_pickup' ? 'pending' : 'pay_on_delivery',
      });

      setCurrentView('order-confirmation');
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to place order. Please try again.');
      setIsSubmitting(false);
    }
  };

  const handleWhatsAppInstantOrder = () => {
    if (!fullName.trim() || !phone.trim()) {
      setErrorMessage(lang === 'ar' ? 'يرجى ملء الاسم ورقم الهاتف أولاً' : 'Please fill in Name and Phone first');
      return;
    }

    const previewOrder = {
      customer: {
        fullName,
        phone,
        cityArea: lang === 'ar' ? selectedZone.nameAr : selectedZone.nameEn,
        addressLine: addressLine || 'Saida Pickup',
      },
      items: cart,
      total: grandTotal,
      paymentMethod,
    };

    const url = generateWhatsAppOrderUrl(previewOrder);
    window.open(url, '_blank');
  };

  return (
    <div className="py-10 md:py-16 bg-[#FFFFFF] dark:bg-[#0A0F1D] text-[#172033] dark:text-[#F8FAFC] min-h-screen transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#EAF3FF] dark:bg-[#1E293B] border border-[#BAE6FD] dark:border-[#007AFF]/40 text-[#007AFF] dark:text-[#38BDF8] text-xs font-bold tracking-wider mb-2">
            <Lock className="w-3.5 h-3.5" />
            <span>{lang === 'ar' ? 'إتمام الطلب السريع والآمن' : 'FAST & SECURE CHECKOUT'}</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-black text-[#172033] dark:text-[#F8FAFC]">{t.checkout}</h1>
          <p className="text-xs sm:text-sm text-[#64748B] dark:text-slate-400 mt-1">
            {lang === 'ar'
              ? 'توصيل لكافة الأراضي اللبنانية أو استلام مجاني من فرعنا في صيدا ساحة النجمة.'
              : 'Direct delivery across Lebanon or free pickup at our Saida Nijme Square branch.'}
          </p>
        </div>

        {errorMessage && (
          <div className="mb-6 p-4 rounded-2xl bg-red-50 dark:bg-rose-950/40 border border-red-200 dark:border-rose-900 text-[#DC2626] dark:text-rose-400 text-xs flex items-center gap-2.5 font-medium">
            <AlertCircle className="w-4 h-4 flex-shrink-0 text-[#DC2626]" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleFormSubmit}>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Customer & Delivery Information */}
            <div className="lg:col-span-7 space-y-6">
              {/* Customer Box */}
              <div className="p-6 rounded-3xl bg-white dark:bg-[#0E1726] border border-[#DCE5F0] dark:border-[#1E293B] shadow-xs space-y-4">
                <h3 className="text-sm font-bold text-[#172033] dark:text-[#F8FAFC] flex items-center gap-2 pb-2 border-b border-[#DCE5F0] dark:border-[#1E293B]">
                  <Phone className="w-4 h-4 text-[#007AFF]" />
                  <span>{t.customerDetails}</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="text-xs text-[#172033] dark:text-[#F8FAFC] font-semibold block mb-1.5">
                      {t.fullName} <span className="text-[#DC2626]">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Rami Al-Baba"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full bg-white dark:bg-[#111A2E] border border-[#DCE5F0] dark:border-[#1E293B] rounded-xl px-3.5 py-2.5 text-xs text-[#172033] dark:text-[#F8FAFC] focus:outline-none focus:border-[#007AFF] focus:ring-2 focus:ring-[#007AFF]/15 transition-all"
                    />
                  </div>

                  <div>
                    <label className="text-xs text-[#172033] dark:text-[#F8FAFC] font-semibold block mb-1.5">
                      {t.phoneNumber} <span className="text-[#DC2626]">*</span>
                    </label>
                    <input
                      type="tel"
                      required
                      placeholder="81 900 916 / 70 xxx xxx"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full bg-white dark:bg-[#111A2E] border border-[#DCE5F0] dark:border-[#1E293B] rounded-xl px-3.5 py-2.5 text-xs text-[#172033] dark:text-[#F8FAFC] focus:outline-none focus:border-[#007AFF] focus:ring-2 focus:ring-[#007AFF]/15 font-mono transition-all"
                    />
                  </div>

                  <div>
                    <label className="text-xs text-[#172033] dark:text-[#F8FAFC] font-semibold block mb-1.5">
                      {t.alternatePhone}
                    </label>
                    <input
                      type="tel"
                      placeholder="07 72x xxx (Optional)"
                      value={alternatePhone}
                      onChange={(e) => setAlternatePhone(e.target.value)}
                      className="w-full bg-white dark:bg-[#111A2E] border border-[#DCE5F0] dark:border-[#1E293B] rounded-xl px-3.5 py-2.5 text-xs text-[#172033] dark:text-[#F8FAFC] focus:outline-none focus:border-[#007AFF] focus:ring-2 focus:ring-[#007AFF]/15 font-mono transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* Delivery Zone & Address */}
              <div className="p-6 rounded-3xl bg-white dark:bg-[#0E1726] border border-[#DCE5F0] dark:border-[#1E293B] shadow-xs space-y-4">
                <h3 className="text-sm font-bold text-[#172033] dark:text-[#F8FAFC] flex items-center gap-2 pb-2 border-b border-[#DCE5F0] dark:border-[#1E293B]">
                  <Truck className="w-4 h-4 text-[#007AFF]" />
                  <span>{lang === 'ar' ? 'منطقة التوصيل ورسوم الشحن' : 'Delivery Area & Fees'}</span>
                </h3>

                <div>
                  <label className="text-xs text-[#172033] dark:text-[#F8FAFC] font-semibold block mb-1.5">
                    {t.deliveryArea} <span className="text-[#DC2626]">*</span>
                  </label>
                  <select
                    value={selectedZoneId}
                    onChange={(e) => setSelectedZoneId(e.target.value)}
                    className="w-full bg-white dark:bg-[#111A2E] border border-[#DCE5F0] dark:border-[#1E293B] rounded-xl px-3.5 py-2.5 text-xs text-[#172033] dark:text-[#F8FAFC] focus:outline-none focus:border-[#007AFF] cursor-pointer"
                  >
                    {storeSettings.deliveryZones.map((zone) => (
                      <option key={zone.id} value={zone.id} className="dark:bg-[#111A2E]">
                        {lang === 'ar' ? zone.nameAr : zone.nameEn} —{' '}
                        {zone.fee === 0 ? (lang === 'ar' ? 'مجاني' : 'FREE') : `$${zone.fee} USD`} ({zone.estimatedDays})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs text-[#172033] dark:text-[#F8FAFC] font-semibold block mb-1.5">
                    {t.addressDetails} <span className="text-[#DC2626]">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder={lang === 'ar' ? 'مثال: صيدا، شارع المصارف، بناية النور، الطابق الثالث' : 'Street name, Building, Floor, Landmark'}
                    value={addressLine}
                    onChange={(e) => setAddressLine(e.target.value)}
                    className="w-full bg-white dark:bg-[#111A2E] border border-[#DCE5F0] dark:border-[#1E293B] rounded-xl px-3.5 py-2.5 text-xs text-[#172033] dark:text-[#F8FAFC] focus:outline-none focus:border-[#007AFF]"
                  />
                </div>

                <div>
                  <label className="text-xs text-[#172033] dark:text-[#F8FAFC] font-semibold block mb-1.5">
                    {t.orderNotes}
                  </label>
                  <textarea
                    rows={2}
                    placeholder={lang === 'ar' ? 'ملاحظات للسائق، وقت الاتصال المفضل...' : 'Delivery instructions, preferred delivery hours...'}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full bg-white dark:bg-[#111A2E] border border-[#DCE5F0] dark:border-[#1E293B] rounded-xl px-3.5 py-2 text-xs text-[#172033] dark:text-[#F8FAFC] focus:outline-none focus:border-[#007AFF]"
                  />
                </div>
              </div>

              {/* Payment Methods */}
              <div className="p-6 rounded-3xl bg-white dark:bg-[#0E1726] border border-[#DCE5F0] dark:border-[#1E293B] shadow-xs space-y-4">
                <h3 className="text-sm font-bold text-[#172033] dark:text-[#F8FAFC] flex items-center gap-2 pb-2 border-b border-[#DCE5F0] dark:border-[#1E293B]">
                  <Banknote className="w-4 h-4 text-[#007AFF]" />
                  <span>{t.paymentMethod}</span>
                </h3>

                <div className="space-y-3">
                  {/* COD */}
                  <label
                    className={`flex items-start gap-3 p-3.5 rounded-2xl border transition-all cursor-pointer ${
                      paymentMethod === 'cod'
                        ? 'bg-[#EAF3FF] dark:bg-[#1E293B] border-[#007AFF] text-[#172033] dark:text-[#F8FAFC]'
                        : 'bg-[#F5F8FC] dark:bg-[#111A2E] border-[#DCE5F0] dark:border-[#1E293B] text-[#172033] dark:text-[#F8FAFC] hover:border-[#007AFF]'
                    }`}
                  >
                    <input
                      type="radio"
                      name="payment"
                      value="cod"
                      checked={paymentMethod === 'cod'}
                      onChange={() => setPaymentMethod('cod')}
                      className="mt-1 accent-[#007AFF]"
                    />
                    <div>
                      <span className="text-xs font-bold block">{t.cod}</span>
                      <span className="text-[11px] text-[#64748B] dark:text-slate-400 block mt-0.5">
                        {lang === 'ar'
                          ? 'ادفع نقداً عند استلام ومعاينة الطلب (بالدولار كاش أو بالليرة بسعر الصرف المعتمد).'
                          : 'Pay cash upon delivery after inspecting your items in USD or daily market rate.'}
                      </span>
                    </div>
                  </label>

                  {/* Saida Store Pickup */}
                  <label
                    className={`flex items-start gap-3 p-3.5 rounded-2xl border transition-all cursor-pointer ${
                      paymentMethod === 'store_pickup'
                        ? 'bg-[#EAF3FF] dark:bg-[#1E293B] border-[#007AFF] text-[#172033] dark:text-[#F8FAFC]'
                        : 'bg-[#F5F8FC] dark:bg-[#111A2E] border-[#DCE5F0] dark:border-[#1E293B] text-[#172033] dark:text-[#F8FAFC] hover:border-[#007AFF]'
                    }`}
                  >
                    <input
                      type="radio"
                      name="payment"
                      value="store_pickup"
                      checked={paymentMethod === 'store_pickup'}
                      onChange={() => setPaymentMethod('store_pickup')}
                      className="mt-1 accent-[#007AFF]"
                    />
                    <div>
                      <span className="text-xs font-bold block">{t.storePickup}</span>
                      <span className="text-[11px] text-[#64748B] dark:text-slate-400 block mt-0.5">
                        {lang === 'ar'
                          ? `استلم طلبك مجاناً مباشرة من فرعنا في صيدا، ساحة النجمة، الشارع الرئيسي.`
                          : `Free pickup at ${storeSettings.storeName} Saida store (Nijme Square, Main Road).`}
                      </span>
                    </div>
                  </label>

                  {/* Whish Money */}
                  <label
                    className={`flex items-start gap-3 p-3.5 rounded-2xl border transition-all cursor-pointer ${
                      paymentMethod === 'whish_money'
                        ? 'bg-[#EAF3FF] dark:bg-[#1E293B] border-[#007AFF] text-[#172033] dark:text-[#F8FAFC]'
                        : 'bg-[#F5F8FC] dark:bg-[#111A2E] border-[#DCE5F0] dark:border-[#1E293B] text-[#172033] dark:text-[#F8FAFC] hover:border-[#007AFF]'
                    }`}
                  >
                    <input
                      type="radio"
                      name="payment"
                      value="whish_money"
                      checked={paymentMethod === 'whish_money'}
                      onChange={() => setPaymentMethod('whish_money')}
                      className="mt-1 accent-[#007AFF]"
                    />
                    <div>
                      <span className="text-xs font-bold block">{t.whishTransfer}</span>
                      <span className="text-[11px] text-[#64748B] dark:text-slate-400 block mt-0.5">
                        {lang === 'ar'
                          ? `تحويل عبر تطبيق ويش موني إلى حساب ${storeSettings.storeNameAr || 'أرناؤوط ستور'} وتأكيد الإشعار.`
                          : 'Transfer via Whish Money app to our verified store account before dispatch.'}
                      </span>
                    </div>
                  </label>

                  {/* OMT */}
                  <label
                    className={`flex items-start gap-3 p-3.5 rounded-2xl border transition-all cursor-pointer ${
                      paymentMethod === 'omt_western_union'
                        ? 'bg-[#EAF3FF] dark:bg-[#1E293B] border-[#007AFF] text-[#172033] dark:text-[#F8FAFC]'
                        : 'bg-[#F5F8FC] dark:bg-[#111A2E] border-[#DCE5F0] dark:border-[#1E293B] text-[#172033] dark:text-[#F8FAFC] hover:border-[#007AFF]'
                    }`}
                  >
                    <input
                      type="radio"
                      name="payment"
                      value="omt_western_union"
                      checked={paymentMethod === 'omt_western_union'}
                      onChange={() => setPaymentMethod('omt_western_union')}
                      className="mt-1 accent-[#007AFF]"
                    />
                    <div>
                      <span className="text-xs font-bold block">{t.omtTransfer}</span>
                      <span className="text-[11px] text-[#64748B] dark:text-slate-400 block mt-0.5">
                        {lang === 'ar'
                          ? 'إرسال حوالة OMT Intra أو ويسترن يونيون وتزويدنا برقم الإيصال MTCN.'
                          : 'Send an OMT Intra / Western Union remittance with MTCN tracking.'}
                      </span>
                    </div>
                  </label>
                </div>
              </div>
            </div>

            {/* Order Review Sidebar */}
            <div className="lg:col-span-5">
              <div className="p-6 rounded-3xl bg-white dark:bg-[#0E1726] border border-[#DCE5F0] dark:border-[#1E293B] sticky top-28 space-y-5 shadow-sm">
                <h3 className="text-base font-bold text-[#172033] dark:text-[#F8FAFC] pb-3 border-b border-[#DCE5F0] dark:border-[#1E293B]">
                  {t.orderSummary} ({cart.length} {lang === 'ar' ? 'عناصر' : 'items'})
                </h3>

                {/* Items preview list */}
                <div className="max-h-60 overflow-y-auto space-y-3 divide-y divide-[#DCE5F0] dark:divide-[#1E293B] pr-1">
                  {cart.map((item, idx) => {
                    const price = item.selectedVariant ? item.selectedVariant.price : item.product.price;
                    return (
                      <div key={idx} className="pt-2 first:pt-0 flex items-center justify-between gap-3 text-xs">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <img
                            src={item.product.images[0]}
                            alt={item.product.name}
                            className="w-10 h-10 object-cover rounded-lg bg-[#F5F8FC] dark:bg-[#111A2E] border border-[#DCE5F0] dark:border-[#1E293B] flex-shrink-0"
                          />
                          <div className="truncate">
                            <span className="font-semibold text-[#172033] dark:text-[#F8FAFC] block truncate">
                              {lang === 'ar' ? item.product.nameAr || item.product.name : item.product.name}
                            </span>
                            <span className="text-[10px] text-[#64748B] dark:text-slate-400">
                              x{item.quantity} {item.selectedColor ? `• ${item.selectedColor}` : ''}
                            </span>
                          </div>
                        </div>
                        <span className="font-black text-[#007AFF] dark:text-[#38BDF8] flex-shrink-0">
                          ${price * item.quantity}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Totals */}
                <div className="space-y-2 pt-3 border-t border-[#DCE5F0] dark:border-[#1E293B] text-xs">
                  <div className="flex justify-between text-[#172033] dark:text-[#F8FAFC]">
                    <span>{t.subtotal}</span>
                    <span className="font-bold">${cartSubtotal} USD</span>
                  </div>

                  <div className="flex justify-between text-[#172033] dark:text-[#F8FAFC]">
                    <span>{t.deliveryFee} ({selectedZone ? (lang === 'ar' ? selectedZone.nameAr : selectedZone.nameEn) : ''})</span>
                    <span className="font-bold text-[#007AFF] dark:text-[#38BDF8]">
                      {deliveryFee === 0 ? (lang === 'ar' ? 'مجاني' : 'FREE') : `$${deliveryFee} USD`}
                    </span>
                  </div>

                  <div className="pt-3 border-t border-[#DCE5F0] dark:border-[#1E293B] flex items-baseline justify-between">
                    <span className="text-sm font-bold text-[#172033] dark:text-[#F8FAFC]">{t.total}</span>
                    <span className="text-2xl font-black text-[#007AFF] dark:text-[#38BDF8]">${grandTotal} USD</span>
                  </div>
                </div>

                {/* Order Submit CTA */}
                <div className="space-y-2.5 pt-2">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-4 px-4 rounded-xl bg-[#007AFF] hover:bg-[#0066D6] text-white font-bold text-sm shadow-md shadow-[#007AFF]/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    <CheckCircle2 className="w-5 h-5" />
                    <span>{isSubmitting ? (lang === 'ar' ? 'جاري التثبيت...' : 'Processing...') : t.placeOrder}</span>
                  </button>

                  {/* 1-Click WhatsApp Order Option */}
                  <button
                    type="button"
                    onClick={handleWhatsAppInstantOrder}
                    className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-50 via-green-50 to-emerald-100 hover:from-emerald-100 hover:to-green-100 dark:from-emerald-950/40 dark:via-emerald-900/40 dark:to-emerald-950/60 border border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-300 font-extrabold text-xs flex items-center justify-center gap-2.5 transition-all cursor-pointer shadow-sm hover:shadow-md hover:shadow-emerald-500/20 group active:scale-98"
                  >
                    <WhatsApp3DIcon size={22} />
                    <span>{lang === 'ar' ? 'استفسار / طلب عبر واتساب (81900916)' : 'Inquire / Order on WhatsApp (81900916)'}</span>
                  </button>
                </div>

                <div className="pt-2 text-[10px] text-[#64748B] dark:text-slate-400 text-center">
                  {lang === 'ar'
                    ? 'سيصلكم إشعار وتواصل هاتفي لتأكيد موعد استلام أو وصول الطلب.'
                    : 'Our Saida dispatch team will call to confirm delivery schedule.'}
                </div>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
