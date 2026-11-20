import React from 'react';
import { useShop } from '../context/ShopContext';
import {
  CheckCircle,
  Package,
  Printer,
  MessageSquare,
} from 'lucide-react';
import { StoreLogo } from '../components/StoreLogo';
import { openExternalUrl } from '../utils/navigation';

export const OrderConfirmationPage: React.FC = () => {
  const { lang, t, lastCompletedOrder, setCurrentView, generateWhatsAppOrderUrl, storeSettings } = useShop();

  if (!lastCompletedOrder) {
    return (
      <div className="py-24 bg-[#F5F8FC] dark:bg-[#0A0F1D] text-center min-h-[60vh] flex flex-col items-center justify-center">
        <h2 className="text-xl font-bold text-[#172033] dark:text-[#F8FAFC] mb-2">
          {lang === 'ar' ? 'لا يوجد طلب معروض' : 'No order to display'}
        </h2>
        <button
          onClick={() => setCurrentView('home')}
          className="px-6 py-2.5 rounded-xl bg-[#007AFF] text-white font-bold text-xs hover:bg-[#0066D6] cursor-pointer"
        >
          {t.backToHome}
        </button>
      </div>
    );
  }

  const order = lastCompletedOrder;

  const handlePrint = () => {
    window.print();
  };

  const handleWhatsApp = () => {
    const url = generateWhatsAppOrderUrl(order);
    openExternalUrl(url);
  };

  return (
    <div className="py-12 md:py-20 bg-[#FFFFFF] dark:bg-[#0A0F1D] min-h-[100dvh] w-full transition-colors duration-200">
      <div className="max-w-3xl mx-auto px-4 sm:px-6">
        {/* Success Header */}
        <div className="text-center space-y-4 mb-10">
          <div className="w-20 h-20 rounded-full bg-emerald-50 dark:bg-emerald-950/50 border-2 border-emerald-200 dark:border-emerald-800 text-[#16A34A] dark:text-emerald-400 flex items-center justify-center mx-auto shadow-sm animate-in zoom-in-75 duration-300">
            <CheckCircle className="w-10 h-10" />
          </div>

          <h1 className="text-2xl sm:text-3xl font-black text-[#172033] dark:text-[#F8FAFC]">{t.orderSuccessTitle}</h1>
          <p className="text-xs sm:text-sm text-[#64748B] dark:text-slate-400 max-w-md mx-auto leading-relaxed">
            {t.orderSuccessSub}
          </p>

          <div
            data-testid="confirmation-order-id"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-[#EAF3FF] dark:bg-[#1E293B] border border-[#BAE6FD] dark:border-[#007AFF]/40 text-[#007AFF] dark:text-[#38BDF8] font-mono text-sm font-black shadow-xs"
          >
            <span>{t.orderIdLabel}:</span>
            <span className="text-[#172033] dark:text-[#F8FAFC]">{order.id}</span>
          </div>
        </div>

        {/* Invoice / Printable Container */}
        <div className="bg-white dark:bg-[#0E1726] border border-[#DCE5F0] dark:border-[#1E293B] rounded-3xl p-6 sm:p-8 space-y-6 shadow-sm print:border-none print:shadow-none">
          {/* Header row */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-[#DCE5F0] dark:border-[#1E293B] gap-4">
            <div>
              <StoreLogo size="sm" showTagline={false} />
              <span className="text-[11px] text-[#64748B] dark:text-slate-400 block mt-1">
                {lang === 'ar' ? storeSettings.locationAr : storeSettings.locationEn} • {storeSettings.phone}
              </span>
            </div>
            <div className="text-left sm:text-right rtl:sm:text-left text-xs text-[#64748B] dark:text-slate-400">
              <p>Date: {new Date(order.orderDate).toLocaleDateString()}</p>
              <p className="font-semibold text-[#16A34A] dark:text-emerald-400 mt-0.5">
                Status: {order.status.toUpperCase()}
              </p>
            </div>
          </div>

          {/* Customer & Delivery Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="p-4 rounded-2xl bg-[#F5F8FC] dark:bg-[#111A2E] border border-[#DCE5F0] dark:border-[#1E293B] space-y-1">
              <span className="text-[10px] text-[#007AFF] dark:text-[#38BDF8] font-bold uppercase tracking-wider block">
                {lang === 'ar' ? 'بيانات المستلم' : 'CUSTOMER INFO'}
              </span>
              <p className="font-bold text-[#172033] dark:text-[#F8FAFC] text-sm">{order.customer.fullName}</p>
              <p className="text-[#64748B] dark:text-slate-400">{order.customer.phone}</p>
            </div>

            <div className="p-4 rounded-2xl bg-[#F5F8FC] dark:bg-[#111A2E] border border-[#DCE5F0] dark:border-[#1E293B] space-y-1">
              <span className="text-[10px] text-[#007AFF] dark:text-[#38BDF8] font-bold uppercase tracking-wider block">
                {lang === 'ar' ? 'عنوان وجهة التوصيل' : 'DELIVERY ADDRESS'}
              </span>
              <p className="font-bold text-[#172033] dark:text-[#F8FAFC]">{order.customer.cityArea}</p>
              <p className="text-[#64748B] dark:text-slate-400">{order.customer.addressLine}</p>
              {order.customer.notes && <p className="text-[#64748B] dark:text-slate-400 italic">Note: {order.customer.notes}</p>}
            </div>
          </div>

          {/* Items Table */}
          <div className="border border-[#DCE5F0] dark:border-[#1E293B] rounded-2xl overflow-hidden">
            <table className="w-full text-left rtl:text-right text-xs">
              <thead className="bg-[#F5F8FC] dark:bg-[#111A2E] text-[#64748B] dark:text-slate-400 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4">{lang === 'ar' ? 'المنتج' : 'Item'}</th>
                  <th className="py-3 px-4 text-center">{lang === 'ar' ? 'الكمية' : 'Qty'}</th>
                  <th className="py-3 px-4 text-right rtl:text-left">{lang === 'ar' ? 'السعر' : 'Total'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#DCE5F0] dark:divide-[#1E293B] text-[#172033] dark:text-[#F8FAFC]">
                {order.items.map((item, idx) => (
                  <tr key={idx}>
                    <td className="py-3 px-4">
                      <div className="font-bold text-[#172033] dark:text-[#F8FAFC]">{item.productName}</div>
                      {item.color && <div className="text-[10px] text-[#64748B] dark:text-slate-400">{item.color}</div>}
                    </td>
                    <td className="py-3 px-4 text-center font-bold">x{item.quantity}</td>
                    <td className="py-3 px-4 text-right rtl:text-left font-black text-[#007AFF] dark:text-[#38BDF8]">
                      ${item.price * item.quantity}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Financial Totals */}
          <div className="space-y-2 pt-2 border-t border-[#DCE5F0] dark:border-[#1E293B] text-xs">
            <div className="flex justify-between text-[#64748B] dark:text-slate-400">
              <span>{t.subtotal}</span>
              <span className="font-bold text-[#172033] dark:text-[#F8FAFC]">${order.subtotal} USD</span>
            </div>
            {order.discount > 0 && (
              <div
                data-testid="confirmation-discount-row"
                className="flex justify-between text-[#16A34A] dark:text-emerald-400 font-bold"
              >
                <span>{lang === 'ar' ? 'الخصم' : 'Discount'}</span>
                <span>-${order.discount} USD</span>
              </div>
            )}
            <div className="flex justify-between text-[#64748B] dark:text-slate-400">
              <span>{t.deliveryFee}</span>
              <span className="font-bold text-[#172033] dark:text-[#F8FAFC]">
                {order.deliveryFee === 0 ? 'FREE' : `$${order.deliveryFee} USD`}
              </span>
            </div>
            <div className="pt-2 border-t border-[#DCE5F0] dark:border-[#1E293B] flex justify-between items-baseline text-sm">
              <span className="font-bold text-[#172033] dark:text-[#F8FAFC]">{t.total}</span>
              <span className="text-2xl font-black text-[#007AFF] dark:text-[#38BDF8]">${order.total} USD</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-3 mt-8">
          <button
            onClick={handlePrint}
            className="px-5 py-2.5 rounded-xl bg-white dark:bg-[#0E1726] hover:bg-[#F5F8FC] dark:hover:bg-[#111A2E] border border-[#DCE5F0] dark:border-[#1E293B] text-[#172033] dark:text-[#F8FAFC] text-xs font-bold flex items-center gap-2 cursor-pointer shadow-xs"
          >
            <Printer className="w-4 h-4 text-[#007AFF] dark:text-[#38BDF8]" />
            <span>{lang === 'ar' ? 'طباعة الفاتورة' : 'Print Invoice'}</span>
          </button>

          <button
            onClick={handleWhatsApp}
            className="px-5 py-2.5 rounded-xl bg-[#16A34A] hover:bg-[#15803D] text-white text-xs font-bold flex items-center gap-2 shadow-sm cursor-pointer"
          >
            <MessageSquare className="w-4 h-4" />
            <span>{lang === 'ar' ? 'تأكيد الحجز عبر واتساب' : 'Confirm on WhatsApp'}</span>
          </button>

          <button
            onClick={() => setCurrentView('track-order')}
            className="px-5 py-2.5 rounded-xl bg-[#007AFF] hover:bg-[#0066D6] text-white text-xs font-bold flex items-center gap-2 cursor-pointer shadow-sm shadow-[#007AFF]/25"
          >
            <Package className="w-4 h-4" />
            <span>{t.trackOrder}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
