import React, { useState } from 'react';
import { useShop } from '../../context/ShopContext';
import { getOrders } from '../../services/storageService';
import { Users, Search } from 'lucide-react';

export const AdminCustomers: React.FC = () => {
  const { lang } = useShop();
  const orders = getOrders();
  const [search, setSearch] = useState('');

  // Extract unique customers based on phone number
  const customerMap: Record<
    string,
    {
      name: string;
      phone: string;
      area: string;
      address: string;
      ordersCount: number;
      totalSpend: number;
      lastOrder: string;
    }
  > = {};

  orders.forEach((o) => {
    const key = o.customer.phone.trim();
    if (!customerMap[key]) {
      customerMap[key] = {
        name: o.customer.fullName,
        phone: o.customer.phone,
        area: o.customer.cityArea,
        address: o.customer.addressLine,
        ordersCount: 0,
        totalSpend: 0,
        lastOrder: o.orderDate,
      };
    }
    customerMap[key].ordersCount += 1;
    if (o.status !== 'cancelled' && o.status !== 'returned') {
      customerMap[key].totalSpend += o.total;
    }
  });

  const customers = Object.values(customerMap).filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.phone.includes(search) ||
      c.area.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#DCE5F0]">
        <div>
          <h1 className="text-2xl font-black text-[#172033] flex items-center gap-2">
            <Users className="w-6 h-6 text-[#007AFF]" />
            <span>{lang === 'ar' ? 'سجل وقاعدة بيانات العملاء' : 'Customer Relationship Directory'}</span>
          </h1>
          <p className="text-xs text-[#64748B] mt-1">
            {lang === 'ar'
              ? 'قائمة العملاء الحقيقيين، إجمالي مشترياتهم، وتاريخ طلباتهم.'
              : 'Verified customers recorded from genuine store orders and deliveries.'}
          </p>
        </div>

        <span className="text-xs font-bold text-[#007AFF] bg-[#EAF3FF] px-3 py-1.5 rounded-xl border border-[#BAE6FD]">
          {customers.length} {lang === 'ar' ? 'عملاء مسجلين' : 'Customers'}
        </span>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="w-4 h-4 text-[#64748B] absolute left-3.5 top-1/2 -translate-y-1/2 rtl:left-auto rtl:right-3.5" />
        <input
          type="text"
          placeholder="Search by customer name, phone, or governorate..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-[#FFFFFF] border border-[#DCE5F0] rounded-xl pl-10 pr-3 rtl:pl-3 rtl:pr-10 py-2.5 text-xs text-[#172033] focus:outline-none focus:border-[#007AFF] shadow-xs"
        />
      </div>

      {/* Customers Table */}
      <div className="rounded-2xl border border-[#DCE5F0] bg-white overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left rtl:text-right text-xs">
            <thead className="bg-[#F5F8FC] text-[#64748B] uppercase tracking-wider text-[10px] border-b border-[#DCE5F0]">
              <tr>
                <th className="py-3 px-4">Customer Name</th>
                <th className="py-3 px-4">Lebanese Phone</th>
                <th className="py-3 px-4">Delivery Governorate</th>
                <th className="py-3 px-4">Orders Count</th>
                <th className="py-3 px-4">Total Purchases</th>
                <th className="py-3 px-4 text-right rtl:text-left">Last Active</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#DCE5F0] text-[#172033]">
              {customers.map((c, idx) => (
                <tr key={idx} className="hover:bg-[#F5F8FC] transition-colors">
                  <td className="py-3 px-4 font-bold text-[#172033]">{c.name}</td>
                  <td className="py-3 px-4 font-mono text-[#007AFF] font-semibold">{c.phone}</td>
                  <td className="py-3 px-4 text-[#64748B]">{c.area}</td>
                  <td className="py-3 px-4 font-bold text-center sm:text-left rtl:sm:text-right">
                    {c.ordersCount} orders
                  </td>
                  <td className="py-3 px-4 font-mono font-black text-[#172033]">${c.totalSpend} USD</td>
                  <td className="py-3 px-4 text-right rtl:text-left text-[#64748B] font-mono text-[11px]">
                    {new Date(c.lastOrder).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
