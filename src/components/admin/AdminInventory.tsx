import React, { useState } from 'react';
import { useShop } from '../../context/ShopContext';
import { useAdmin } from '../../context/AdminContext';
import { saveProduct } from '../../services/storageService';
import { Product } from '../../types';
import { Warehouse, AlertTriangle, Search } from 'lucide-react';

export const AdminInventory: React.FC = () => {
  const { lang, products, brands, refreshData } = useShop();
  const { selectableBrands } = useAdmin();
  const allBrandNames = Array.from(new Set([...selectableBrands, ...brands.map((b) => b.name)]));

  const [search, setSearch] = useState('');
  const [selectedBrand, setSelectedBrand] = useState('all');
  const [feedback, setFeedback] = useState('');

  const handleAdjustStock = (product: Product, delta: number) => {
    const newStock = Math.max(0, product.stock + delta);
    const updated: Product = {
      ...product,
      stock: newStock,
    };
    saveProduct(updated);
    refreshData();
    setFeedback(`Updated stock for ${product.name} to ${newStock} units`);
    setTimeout(() => setFeedback(''), 3000);
  };

  const filtered = products.filter((p) => {
    const matchBrand = selectedBrand === 'all' || p.brand.toLowerCase() === selectedBrand.toLowerCase();
    const matchSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.sku.toLowerCase().includes(search.toLowerCase()) ||
      p.brand.toLowerCase().includes(search.toLowerCase());
    return matchBrand && matchSearch;
  });

  const lowStockCount = products.filter((p) => p.stock <= (p.lowStockThreshold || 3)).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#DCE5F0]">
        <div>
          <h1 className="text-2xl font-black text-[#172033] flex items-center gap-2">
            <Warehouse className="w-6 h-6 text-[#007AFF]" />
            <span>{lang === 'ar' ? 'المستودع ومراقبة المخزون' : 'Saida Warehouse & Stock Management'}</span>
          </h1>
          <p className="text-xs text-[#64748B] mt-1">
            {lang === 'ar'
              ? 'مراقبة كميات الأجهزة الحقيقية، تنبيهات النقص، وتعديل كميات الشحن والاستلام.'
              : 'Monitor real stock levels, low-quantity triggers, and rapid warehouse adjustments.'}
          </p>
        </div>

        {lowStockCount > 0 && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 text-xs font-bold self-start sm:self-auto">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <span>{lowStockCount} {lang === 'ar' ? 'منتجات تحتاج لإعادة تزويد' : 'Products need Restock'}</span>
          </div>
        )}
      </div>

      {feedback && (
        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-[#16A34A] text-xs font-semibold">
          {feedback}
        </div>
      )}

      {/* Search & Brand Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-[#64748B] absolute left-3.5 top-1/2 -translate-y-1/2 rtl:left-auto rtl:right-3.5" />
          <input
            type="text"
            placeholder={lang === 'ar' ? 'بحث بالاسم، SKU أو الماركة...' : 'Filter inventory by name, SKU, or brand...'}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[#FFFFFF] border border-[#DCE5F0] rounded-xl pl-10 pr-3 rtl:pl-3 rtl:pr-10 py-2.5 text-xs text-[#172033] focus:outline-none focus:border-[#007AFF] font-mono shadow-xs"
          />
        </div>

        <select
          value={selectedBrand}
          onChange={(e) => setSelectedBrand(e.target.value)}
          className="bg-white border border-[#DCE5F0] text-[#172033] text-xs rounded-xl px-3 py-2.5 focus:outline-none focus:border-[#007AFF] cursor-pointer shadow-xs font-medium"
        >
          <option value="all">{lang === 'ar' ? 'كافة الماركات' : 'All Brands'}</option>
          {allBrandNames.map((bName) => (
            <option key={bName} value={bName}>
              {bName}
            </option>
          ))}
        </select>
      </div>

      {/* Inventory Table */}
      <div className="rounded-2xl border border-[#DCE5F0] bg-white overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left rtl:text-right text-xs">
            <thead className="bg-[#F5F8FC] text-[#64748B] uppercase tracking-wider text-[10px] border-b border-[#DCE5F0]">
              <tr>
                <th className="py-3 px-4">Item Details</th>
                <th className="py-3 px-4">SKU / Barcode</th>
                <th className="py-3 px-4">Current Stock</th>
                <th className="py-3 px-4">Threshold</th>
                <th className="py-3 px-4 text-right rtl:text-left">Quick Stock Adjust</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#DCE5F0] text-[#172033]">
              {filtered.map((p) => {
                const isLow = p.stock <= (p.lowStockThreshold || 3);
                const isOut = p.stock <= 0;

                return (
                  <tr key={p.id} className="hover:bg-[#F5F8FC] transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={p.images[0]}
                          alt={p.name}
                          className="w-10 h-10 object-cover rounded-lg bg-[#F5F8FC] border border-[#DCE5F0]"
                        />
                        <div>
                          <div className="font-bold text-[#172033] line-clamp-1">{p.name}</div>
                          <div className="text-[10px] text-[#007AFF] font-medium">{p.brand} • {p.category}</div>
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-4 font-mono text-[#64748B]">{p.sku}</td>

                    <td className="py-3 px-4 font-mono font-bold">
                      {isOut ? (
                        <span className="text-[#DC2626]">0 (Out of Stock)</span>
                      ) : isLow ? (
                        <span className="text-amber-600 font-black">{p.stock} (Low Stock)</span>
                      ) : (
                        <span className="text-[#16A34A]">{p.stock} units</span>
                      )}
                    </td>

                    <td className="py-3 px-4 text-[#64748B] font-mono">
                      ≤ {p.lowStockThreshold || 3}
                    </td>

                    <td className="py-3 px-4 text-right rtl:text-left">
                      <div className="flex items-center justify-end gap-1.5 font-mono">
                        <button
                          onClick={() => handleAdjustStock(p, -1)}
                          className="px-2.5 py-1 rounded-lg bg-[#F5F8FC] hover:bg-slate-200 border border-[#DCE5F0] text-[#172033] font-bold"
                          title="Deduct 1"
                        >
                          -1
                        </button>
                        <button
                          onClick={() => handleAdjustStock(p, 5)}
                          className="px-2.5 py-1 rounded-lg bg-[#EAF3FF] hover:bg-[#007AFF] hover:text-white border border-[#BAE6FD] text-[#007AFF] font-bold transition-colors"
                          title="Restock 5"
                        >
                          +5
                        </button>
                        <button
                          onClick={() => handleAdjustStock(p, 10)}
                          className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-[#16A34A] hover:text-white border border-emerald-200 text-[#16A34A] font-bold transition-colors"
                          title="Restock 10"
                        >
                          +10
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
