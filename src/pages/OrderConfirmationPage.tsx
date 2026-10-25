import React from 'react';
import { useShop } from '../context/ShopContext';
import {
  CheckCircle,
  Package,
  Printer,
  MessageSquare,
} from 'lucide-react';
import { StoreLogo } from '../components/StoreLogo';

export const OrderConfirmationPage: React.FC = () => {
  const { lang, t, lastCompletedOrder, setCurrentView, generateWhatsAppOrderUrl, storeSettings } = useShop();

  if (!lastCompletedOrder) {
    return (
      <div className="py-24 bg-[#F5F8FC] text-center min-h-[60vh] flex flex-col items-center justify-center">
        <h2 className="text-xl font-bold text-[#172033] mb-2">
          {lang === 'ar' ? 'لا يوجد طلب معروض' : 'No order to display'}
        </h2>
        <button
          onClick={() => setCurrentView('home')}
          className="px-6 py-2.5 rounded-xl bg-[#007AFF] text-white font-bold text-xs hover:bg-[#0066D6]"
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
    window.open(url, '_blank');
  };

  return (
    <div className="py-12 md:py-20 bg-[#FFFFFF] dark:bg-[#0A0F1D] min-h-[100dvh] w-full transition-colors duration-200">
      <div className="max-w-3xl mx-auto px-4 sm:px-6">
        {/* Success Header */}
        <div className="text-center space-y-4 mb-10">
          <div className="w-20 h-20 rounded-full bg-emerald-50 border-2 border-emerald-200 text-[#16A34A] flex items-center justify-center mx-auto shadow-sm animate-in zoom-in-75 duration-300">
            <CheckCircle className="w-10 h-10" />
          </div>

          <h1 className="text-2xl sm:text-3xl font-black text-[#172033]">{t.orderSuccessTitle}</h1>
          <p className="text-xs sm:text-sm text-[#64748B] max-w-md mx-auto leading-relaxed">
            {t.orderSuccessSub}
          </p>

          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-[#EAF3FF] border border-[#BAE6FD] text-[#007AFF] font-mono text-sm font-black shadow-xs">
            <span>{t.orderIdLabel}:</span>
            <span className="text-[#172033]">{order.id}</span>
          </div>
        </div>

        {/* Invoice / Printable Container */}
        <div className="bg-white border border-[#DCE5F0] rounded-3xl p-6 sm:p-8 space-y-6 shadow-sm print:border-none print:shadow-none">
          {/* Header row */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-[#DCE5F0] gap-4">
            <div>
              <StoreLogo size="sm" showTagline={false} />
              <span className="text-[11px] text-[#64748B] block mt-1">
                {lang === 'ar' ? storeSettings.locationAr : storeSettings.locationEn} • {storeSettings.phone}
              </span>
            </div>
            <div className="text-left sm:text-right rtl:sm:text-left text-xs text-[#64748B]">
              <p>Date: {new Date(order.orderDate).toLocaleDateString()}</p>
              <p className="font-semibold text-[#16A34A] mt-0.5">Status: {order.status.toUpperCase()}</p>
            </div>
          </div>

          {/* Customer & Delivery Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="p-4 rounded-2xl bg-[#F5F8FC] border border-[#DCE5F0] space-y-1">
              <span className="text-[10px] text-[#007AFF] font-bold uppercase tracking-wider block">
                {lang === 'ar' ? 'بيانات المستلم' : 'CUSTOMER INFO'}
              </span>
              <p className="font-bold text-[#172033] text-sm">{order.customer.fullName}</p>
              <p className="text-[#64748B]">{order.customer.phone}</p>
            </div>

            <div className="p-4 rounded-2xl bg-[#F5F8FC] border border-[#DCE5F0] space-y-1">
              <span className="text-[10px] text-[#007AFF] font-bold uppercase tracking-wider block">
                {lang === 'ar' ? 'عنوان وجهة التوصيل' : 'DELIVERY ADDRESS'}
              </span>
              <p className="font-bold text-[#172033]">{order.customer.cityArea}</p>
              <p className="text-[#64748B]">{order.customer.addressLine}</p>
              {order.customer.notes && <p className="text-[#64748B] italic">Note: {order.customer.notes}</p>}
            </div>
          </div>

          {/* Items Table */}
          <div className="border border-[#DCE5F0] rounded-2xl overflow-hidden">
            <table className="w-full text-left rtl:text-right text-xs">
              <thead className="bg-[#F5F8FC] text-[#64748B] uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4">{lang === 'ar' ? 'المنتج' : 'Item'}</th>
                  <th className="py-3 px-4 text-center">{lang === 'ar' ? 'الكمية' : 'Qty'}</th>
                  <th className="py-3 px-4 text-right rtl:text-left">{lang === 'ar' ? 'السعر' : 'Total'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#DCE5F0] text-[#172033]">
                {order.items.map((item, idx) => (
                  <tr key={idx}>
                    <td className="py-3 px-4">
                      <div className="font-bold text-[#172033]">{item.productName}</div>
                      {item.color && <div className="text-[10px] text-[#64748B]">{item.color}</div>}
                    </td>
                    <td className="py-3 px-4 text-center font-bold">x{item.quantity}</td>
                    <td className="py-3 px-4 text-right rtl:text-left font-black text-[#007AFF]">
                      ${item.price * item.quantity}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Financial Totals */}
          <div className="space-y-2 pt-2 border-t border-[#DCE5F0] text-xs">
            <div className="flex justify-between text-[#64748B]">
              <span>{t.subtotal}</span>
              <span className="font-bold text-[#172033]">${order.subtotal} USD</span>
            </div>
            <div className="flex justify-between text-[#64748B]">
              <span>{t.deliveryFee}</span>
              <span className="font-bold text-[#172033]">
                {order.deliveryFee === 0 ? 'FREE' : `$${order.deliveryFee} USD`}
              </span>
            </div>
            <div className="pt-2 border-t border-[#DCE5F0] flex justify-between items-baseline text-sm">
              <span className="font-bold text-[#172033]">{t.total}</span>
              <span className="text-2xl font-black text-[#007AFF]">${order.total} USD</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-3 mt-8">
          <button
            onClick={handlePrint}
            className="px-5 py-2.5 rounded-xl bg-white hover:bg-[#F5F8FC] border border-[#DCE5F0] text-[#172033] text-xs font-bold flex items-center gap-2 cursor-pointer shadow-xs"
          >
            <Printer className="w-4 h-4 text-[#007AFF]" />
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
