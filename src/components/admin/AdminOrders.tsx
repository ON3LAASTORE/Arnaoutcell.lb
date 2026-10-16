import React, { useState } from 'react';
import { useShop } from '../../context/ShopContext';
import { getOrders, updateOrderStatus } from '../../services/storageService';
import { Order, OrderStatus } from '../../types';
import { Search, Printer, X } from 'lucide-react';

const ALL_STATUSES: OrderStatus[] = [
  'new',
  'confirmed',
  'preparing',
  'ready_for_delivery',
  'out_for_delivery',
  'delivered',
  'cancelled',
  'returned',
];

export const AdminOrders: React.FC = () => {
  const { lang, refreshData, storeSettings } = useShop();
  const [orders, setOrders] = useState<Order[]>(() => getOrders());
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [selectedOrderForInvoice, setSelectedOrderForInvoice] = useState<Order | null>(null);
  const [statusUpdateMsg, setStatusUpdateMsg] = useState('');

  const reloadOrders = () => {
    setOrders(getOrders());
    refreshData();
  };

  const handleStatusChange = (orderId: string, newStatus: OrderStatus) => {
    const updated = updateOrderStatus(orderId, newStatus);
    if (updated) {
      reloadOrders();
      setStatusUpdateMsg(`Order ${orderId} updated to ${newStatus}. Inventory synced.`);
      setTimeout(() => setStatusUpdateMsg(''), 4000);
    }
  };

  const filteredOrders = orders.filter((o) => {
    const matchStatus = statusFilter === 'all' || o.status === statusFilter;
    const matchSearch =
      o.id.toLowerCase().includes(search.toLowerCase()) ||
      o.customer.fullName.toLowerCase().includes(search.toLowerCase()) ||
      o.customer.phone.includes(search);
    return matchStatus && matchSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#DCE5F0]">
        <div>
          <h1 className="text-2xl font-black text-[#172033]">
            {lang === 'ar' ? 'إدارة الطلبات والشحن' : 'Customer Orders & Fulfillment'}
          </h1>
          <p className="text-xs text-[#64748B] mt-1">
            {lang === 'ar'
              ? 'تحديث حالات الطلبات، طباعة الفواتير، ومزامنة حركة المخزون التلقائية.'
              : 'Update order progress, print tax invoices, and maintain automatic inventory adjustments.'}
          </p>
        </div>

        <span className="text-xs font-bold text-[#007AFF] bg-[#EAF3FF] px-3 py-1.5 rounded-xl border border-[#BAE6FD] self-start sm:self-auto">
          {filteredOrders.length} {lang === 'ar' ? 'طلبات مطابقة' : 'Orders'}
        </span>
      </div>

      {statusUpdateMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-[#16A34A] text-xs font-semibold flex items-center justify-between">
          <span>{statusUpdateMsg}</span>
          <button onClick={() => setStatusUpdateMsg('')}>
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-[#64748B] absolute left-3.5 top-1/2 -translate-y-1/2 rtl:left-auto rtl:right-3.5" />
          <input
            type="text"
            placeholder={lang === 'ar' ? 'بحث برقم الطلب أو اسم العميل أو الهاتف...' : 'Search by Order ID, Customer, or Phone...'}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[#FFFFFF] border border-[#DCE5F0] rounded-xl pl-10 pr-3 rtl:pl-3 rtl:pr-10 py-2.5 text-xs text-[#172033] focus:outline-none focus:border-[#007AFF] font-mono shadow-xs"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-white border border-[#DCE5F0] text-[#172033] text-xs rounded-xl px-3 py-2.5 focus:outline-none focus:border-[#007AFF] cursor-pointer shadow-xs font-medium"
        >
          <option value="all">All Statuses</option>
          {ALL_STATUSES.map((st) => (
            <option key={st} value={st}>
              {st.replace(/_/g, ' ').toUpperCase()}
            </option>
          ))}
        </select>
      </div>

      {/* Orders Table */}
      <div className="rounded-2xl border border-[#DCE5F0] bg-white overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left rtl:text-right text-xs">
            <thead className="bg-[#F5F8FC] text-[#64748B] uppercase tracking-wider text-[10px] border-b border-[#DCE5F0]">
              <tr>
                <th className="py-3 px-4">Order ID & Date</th>
                <th className="py-3 px-4">Customer & Area</th>
                <th className="py-3 px-4">Items</th>
                <th className="py-3 px-4">Total (USD)</th>
                <th className="py-3 px-4">Status & Workflow</th>
                <th className="py-3 px-4 text-right rtl:text-left">Invoice</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#DCE5F0] text-[#172033]">
              {filteredOrders.map((ord) => (
                <tr key={ord.id} className="hover:bg-[#F5F8FC] transition-colors">
                  <td className="py-3 px-4">
                    <span className="font-mono font-bold text-[#007AFF] block">{ord.id}</span>
                    <span className="text-[10px] text-[#64748B]">
                      {new Date(ord.orderDate).toLocaleDateString()}
                    </span>
                  </td>

                  <td className="py-3 px-4">
                    <div className="font-bold text-[#172033]">{ord.customer.fullName}</div>
                    <div className="text-[10px] text-[#64748B] font-mono">{ord.customer.phone}</div>
                    <div className="text-[10px] text-[#64748B] truncate max-w-[150px]">{ord.customer.cityArea}</div>
                  </td>

                  <td className="py-3 px-4">
                    <div className="max-w-[200px]">
                      {ord.items.map((it, idx) => (
                        <div key={idx} className="truncate text-[11px] text-[#64748B]">
                          {it.quantity}x {it.productName}
                        </div>
                      ))}
                    </div>
                  </td>

                  <td className="py-3 px-4 font-mono">
                    <span className="font-black text-[#172033]">${ord.total}</span>
                    <span className="text-[10px] text-[#64748B] block uppercase">{ord.paymentMethod}</span>
                  </td>

                  <td className="py-3 px-4">
                    <select
                      value={ord.status}
                      onChange={(e) => handleStatusChange(ord.id, e.target.value as OrderStatus)}
                      className={`text-xs font-bold rounded-lg px-2.5 py-1 border focus:outline-none cursor-pointer uppercase ${
                        ord.status === 'delivered'
                          ? 'bg-emerald-50 text-[#16A34A] border-emerald-200'
                          : ord.status === 'cancelled' || ord.status === 'returned'
                          ? 'bg-red-50 text-[#DC2626] border-red-200'
                          : 'bg-[#EAF3FF] text-[#007AFF] border-[#BAE6FD]'
                      }`}
                    >
                      {ALL_STATUSES.map((st) => (
                        <option key={st} value={st} className="bg-white text-[#172033]">
                          {st.replace(/_/g, ' ').toUpperCase()}
                        </option>
                      ))}
                    </select>
                  </td>

                  <td className="py-3 px-4 text-right rtl:text-left">
                    <button
                      onClick={() => setSelectedOrderForInvoice(ord)}
                      className="p-1.5 rounded-lg bg-[#F5F8FC] hover:bg-[#EAF3FF] border border-[#DCE5F0] text-[#007AFF] transition-colors"
                      title="View & Print Invoice"
                    >
                      <Printer className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Invoice Modal */}
      {selectedOrderForInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="relative w-full max-w-2xl bg-white border border-[#DCE5F0] rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-[#DCE5F0]">
              <h2 className="text-base font-bold text-[#172033] flex items-center gap-2">
                <Printer className="w-5 h-5 text-[#007AFF]" />
                <span>Invoice: {selectedOrderForInvoice.id}</span>
              </h2>
              <button
                onClick={() => setSelectedOrderForInvoice(null)}
                className="p-1.5 rounded-lg text-[#64748B] hover:text-[#172033]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Printable Body */}
            <div className="p-6 rounded-2xl bg-[#F5F8FC] border border-[#DCE5F0] space-y-4 text-xs">
              <div className="flex justify-between border-b border-[#DCE5F0] pb-3">
                <div>
                  <h3 className="font-black text-[#172033] text-base">{storeSettings.storeName}</h3>
                  <p className="text-[#64748B]">{lang === 'ar' ? storeSettings.locationAr : storeSettings.locationEn} • {storeSettings.phone}</p>
                </div>
                <div className="text-right rtl:text-left font-mono">
                  <p className="font-bold text-[#007AFF]">{selectedOrderForInvoice.id}</p>
                  <p className="text-[#64748B]">{new Date(selectedOrderForInvoice.orderDate).toLocaleDateString()}</p>
                </div>
              </div>

              <div>
                <p className="font-bold text-[#172033]">{selectedOrderForInvoice.customer.fullName}</p>
                <p className="text-[#64748B]">{selectedOrderForInvoice.customer.phone}</p>
                <p className="text-[#64748B]">{selectedOrderForInvoice.customer.cityArea} — {selectedOrderForInvoice.customer.addressLine}</p>
              </div>

              <div className="border border-[#DCE5F0] rounded-xl overflow-hidden bg-white">
                <table className="w-full text-left rtl:text-right">
                  <thead className="bg-[#F5F8FC] text-[10px] text-[#64748B] uppercase border-b border-[#DCE5F0]">
                    <tr>
                      <th className="p-2">Item</th>
                      <th className="p-2 text-center">Qty</th>
                      <th className="p-2 text-right rtl:text-left">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#DCE5F0] text-[#172033]">
                    {selectedOrderForInvoice.items.map((it, idx) => (
                      <tr key={idx}>
                        <td className="p-2">{it.productName}</td>
                        <td className="p-2 text-center">{it.quantity}</td>
                        <td className="p-2 text-right rtl:text-left font-bold text-[#007AFF]">${it.price * it.quantity}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-between pt-2 border-t border-[#DCE5F0] font-bold text-sm text-[#172033]">
                <span>Grand Total:</span>
                <span className="text-[#007AFF] font-mono">${selectedOrderForInvoice.total} USD</span>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => window.print()}
                className="px-5 py-2.5 rounded-xl bg-[#007AFF] hover:bg-[#0066D6] text-white font-bold text-xs shadow-xs"
              >
                Print Invoice
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
