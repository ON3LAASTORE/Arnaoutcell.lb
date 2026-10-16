import React, { useState } from 'react';
import { useShop } from '../context/ShopContext';
import { getOrders } from '../services/storageService';
import { Order, OrderStatus } from '../types';
import {
  Search,
  Package,
  CheckCircle2,
  Clock,
  Phone,
  AlertCircle,
} from 'lucide-react';

const STATUS_STEPS: { status: OrderStatus; labelEn: string; labelAr: string; descEn: string; descAr: string }[] = [
  { status: 'new', labelEn: 'New Order', labelAr: 'تم استلام الطلب', descEn: 'Order placed online', descAr: 'تم تسجيل الطلب في النظام' },
  { status: 'confirmed', labelEn: 'Confirmed', labelAr: 'تم التأكيد', descEn: 'Store confirmed availability', descAr: 'تم التأكد من توفر الأجهزة والكفالة' },
  { status: 'preparing', labelEn: 'Preparing', labelAr: 'جاري التجهيز', descEn: 'Packaging and quality check', descAr: 'فحص الجودة والتغليف الآمن' },
  { status: 'ready_for_delivery', labelEn: 'Ready', labelAr: 'جاهز للشحن / الاستلام', descEn: 'Packed and staged for dispatch', descAr: 'جاهز مع فواتير الكفالة الرسمية' },
  { status: 'out_for_delivery', labelEn: 'Out for Delivery', labelAr: 'مع مندوب التوصيل', descEn: 'Courier on transit to address', descAr: 'المندوب في طريقه لعنوانكم' },
  { status: 'delivered', labelEn: 'Delivered', labelAr: 'تم التسليم بنجاح', descEn: 'Completed and verified', descAr: 'تم تسليم الطلب واستلام المبلغ' },
];

export const TrackOrderPage: React.FC = () => {
  const { lang, t, storeSettings } = useShop();
  const [orderQuery, setOrderQuery] = useState('');
  const [searchedOrder, setSearchedOrder] = useState<Order | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderQuery.trim()) return;

    const orders = getOrders();
    const cleanId = orderQuery.trim().toUpperCase();
    const found = orders.find(
      (o) => o.id.toUpperCase() === cleanId || o.customer.phone.includes(orderQuery.trim())
    );

    setSearchedOrder(found || null);
    setHasSearched(true);
  };

  const getStepIndex = (status: OrderStatus) => {
    if (status === 'cancelled' || status === 'returned') return -1;
    return STATUS_STEPS.findIndex((s) => s.status === status);
  };

  const currentStepIdx = searchedOrder ? getStepIndex(searchedOrder.status) : 0;

  return (
    <div className="py-12 md:py-20 bg-[#FFFFFF] min-h-screen">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center max-w-xl mx-auto mb-10 space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-[#EAF3FF] border border-[#BAE6FD] text-[#007AFF] flex items-center justify-center mx-auto mb-3 shadow-xs">
            <Package className="w-7 h-7" />
          </div>
          <h1 className="text-2xl sm:text-4xl font-black text-[#172033]">{t.trackOrder}</h1>
          <p className="text-xs sm:text-sm text-[#64748B] leading-relaxed">
            {t.trackOrderPrompt}
          </p>
        </div>

        {/* Search Bar */}
        <div className="p-6 rounded-3xl bg-[#F5F8FC] border border-[#DCE5F0] mb-10 shadow-xs">
          <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-[#64748B] absolute left-4 top-1/2 -translate-y-1/2 rtl:left-auto rtl:right-4" />
              <input
                type="text"
                placeholder={lang === 'ar' ? 'أدخل رقم الطلب (مثلاً: ARN-2027-1001 أو رقم الهاتف)' : 'Enter Order ID (e.g. ARN-2027-1001 or Phone)'}
                value={orderQuery}
                onChange={(e) => setOrderQuery(e.target.value)}
                className="w-full bg-white border border-[#DCE5F0] rounded-2xl pl-11 pr-4 rtl:pl-4 rtl:pr-11 py-3 text-xs sm:text-sm text-[#172033] focus:outline-none focus:border-[#007AFF] font-mono"
              />
            </div>
            <button
              type="submit"
              className="px-6 py-3 rounded-2xl bg-[#007AFF] hover:bg-[#0066D6] text-white font-bold text-xs sm:text-sm transition-all cursor-pointer shadow-sm shadow-[#007AFF]/25"
            >
              {lang === 'ar' ? 'تتبع الآن' : 'Track Status'}
            </button>
          </form>

          {/* Quick Demo links */}
          <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-[#64748B]">
            <span>{lang === 'ar' ? 'أرقام طلبات تجريبية:' : 'Try sample orders:'}</span>
            <button
              type="button"
              onClick={() => {
                setOrderQuery('ARN-2027-1001');
              }}
              className="font-mono text-[#007AFF] hover:underline bg-white px-2 py-0.5 rounded border border-[#DCE5F0]"
            >
              ARN-2027-1001 (Saida)
            </button>
            <button
              type="button"
              onClick={() => {
                setOrderQuery('ARN-2027-1002');
              }}
              className="font-mono text-[#007AFF] hover:underline bg-white px-2 py-0.5 rounded border border-[#DCE5F0]"
            >
              ARN-2027-1002 (Beirut)
            </button>
          </div>
        </div>

        {/* Tracking Result */}
        {hasSearched && (
          <div>
            {searchedOrder ? (
              <div className="bg-white border border-[#DCE5F0] rounded-3xl p-6 sm:p-8 space-y-8 shadow-sm">
                {/* Order Top Meta */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-[#DCE5F0] gap-4">
                  <div>
                    <span className="text-xs text-[#64748B] block font-semibold">{t.orderIdLabel}</span>
                    <h3 className="text-xl font-black text-[#172033] font-mono">{searchedOrder.id}</h3>
                    <p className="text-xs text-[#64748B] mt-0.5">
                      {lang === 'ar' ? 'تاريخ الطلب:' : 'Ordered on:'}{' '}
                      {new Date(searchedOrder.orderDate).toLocaleString()}
                    </p>
                  </div>

                  <div className="text-left sm:text-right rtl:sm:text-left">
                    <span className="text-xs text-[#64748B] block font-semibold">{t.orderStatus}</span>
                    <span className="inline-block mt-1 px-3 py-1 rounded-full bg-[#EAF3FF] text-[#007AFF] border border-[#BAE6FD] text-xs font-black uppercase">
                      {searchedOrder.status.replace(/_/g, ' ')}
                    </span>
                  </div>
                </div>

                {/* Progress Stepper Timeline */}
                <div>
                  <h4 className="text-xs font-bold text-[#64748B] uppercase tracking-wider mb-6">
                    {lang === 'ar' ? 'مراحل التوصيل والتجهيز' : 'Live Order Timeline'}
                  </h4>

                  <div className="relative">
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                      {STATUS_STEPS.map((step, idx) => {
                        const isDone = idx <= currentStepIdx;
                        const isCurrent = idx === currentStepIdx;

                        return (
                          <div
                            key={step.status}
                            className={`p-3.5 rounded-2xl border text-center transition-all ${
                              isCurrent
                                ? 'bg-[#EAF3FF] border-[#007AFF] shadow-sm'
                                : isDone
                                ? 'bg-emerald-50 border-emerald-200'
                                : 'bg-[#F5F8FC] border-[#DCE5F0] opacity-60'
                            }`}
                          >
                            <div
                              className={`w-8 h-8 rounded-full flex items-center justify-center mx-auto mb-2 text-xs font-bold ${
                                isCurrent
                                  ? 'bg-[#007AFF] text-white'
                                  : isDone
                                  ? 'bg-[#16A34A] text-white'
                                  : 'bg-slate-200 text-[#64748B]'
                              }`}
                            >
                              {isDone ? <CheckCircle2 className="w-4 h-4" /> : idx + 1}
                            </div>
                            <h5 className="font-bold text-[#172033] text-xs">
                              {lang === 'ar' ? step.labelAr : step.labelEn}
                            </h5>
                            <p className="text-[10px] text-[#64748B] mt-1 line-clamp-2">
                              {lang === 'ar' ? step.descAr : step.descEn}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Status History Logs */}
                {searchedOrder.statusHistory && searchedOrder.statusHistory.length > 0 && (
                  <div className="pt-6 border-t border-[#DCE5F0]">
                    <h4 className="text-xs font-bold text-[#64748B] uppercase tracking-wider mb-3">
                      {lang === 'ar' ? 'سجل التحديثات' : 'Activity Logs'}
                    </h4>
                    <div className="space-y-2">
                      {searchedOrder.statusHistory.map((h, i) => (
                        <div
                          key={i}
                          className="flex items-center justify-between text-xs p-3 rounded-xl bg-[#F5F8FC] border border-[#DCE5F0]"
                        >
                          <div className="flex items-center gap-2">
                            <Clock className="w-3.5 h-3.5 text-[#007AFF]" />
                            <span className="font-semibold text-[#172033] capitalize">{h.status.replace(/_/g, ' ')}</span>
                            {h.note && <span className="text-[#64748B] text-[11px]">— {h.note}</span>}
                          </div>
                          <span className="text-[11px] text-[#64748B]">
                            {new Date(h.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Items & Recipient Details */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-[#DCE5F0] text-xs">
                  <div className="p-4 rounded-2xl bg-[#F5F8FC] border border-[#DCE5F0] space-y-1.5">
                    <span className="text-[#007AFF] font-bold uppercase tracking-wider text-[10px] block">
                      {t.customerDetails}
                    </span>
                    <p className="font-bold text-[#172033]">{searchedOrder.customer.fullName}</p>
                    <p className="text-[#64748B]">{searchedOrder.customer.phone}</p>
                    <p className="text-[#64748B]">{searchedOrder.customer.cityArea}</p>
                    <p className="text-[#64748B]">{searchedOrder.customer.addressLine}</p>
                  </div>

                  <div className="p-4 rounded-2xl bg-[#F5F8FC] border border-[#DCE5F0] space-y-1.5">
                    <span className="text-[#007AFF] font-bold uppercase tracking-wider text-[10px] block">
                      {lang === 'ar' ? 'المنتجات المطلوبة' : 'Items'}
                    </span>
                    {searchedOrder.items.map((it, idx) => (
                      <div key={idx} className="flex justify-between text-[#172033]">
                        <span className="truncate max-w-[200px]">{it.productName} x{it.quantity}</span>
                        <span className="font-bold text-[#172033]">${it.price * it.quantity}</span>
                      </div>
                    ))}
                    <div className="pt-2 border-t border-[#DCE5F0] flex justify-between font-bold text-[#172033]">
                      <span>{t.total}</span>
                      <span className="text-[#007AFF] font-black">${searchedOrder.total} USD</span>
                    </div>
                  </div>
                </div>

                {/* Help button */}
                <div className="text-center pt-2">
                  <a
                    href="tel:03099889"
                    className="inline-flex items-center gap-2 text-xs text-[#007AFF] hover:underline font-semibold"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    <span>{lang === 'ar' ? 'هل تحتاج لمساعدة بخصوص طلبك؟ اتصل بنا: 03 099 889' : 'Need help with this order? Call us: 03 099 889'}</span>
                  </a>
                </div>
              </div>
            ) : (
              <div className="p-8 text-center bg-white rounded-3xl border border-[#DCE5F0] shadow-sm space-y-3">
                <AlertCircle className="w-8 h-8 text-[#DC2626] mx-auto" />
                <h3 className="font-bold text-[#172033] text-base">
                  {lang === 'ar' ? 'لم يتم العثور على طلب بهذا الرقم' : 'No order found with this reference'}
                </h3>
                <p className="text-xs text-[#64748B] max-w-sm mx-auto">
                  {lang === 'ar'
                    ? `يرجى التحقق من رقم الطلب (مثال: ARN-2027-1001) أو التواصل مع خدمة عملاء ${storeSettings.storeNameAr || 'أرناؤوط ستور'}.`
                    : `Please verify your Order ID or contact ${storeSettings.storeName} Saida support on ${storeSettings.phone}.`}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
