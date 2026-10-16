import React, { useState } from 'react';
import { useShop } from '../../context/ShopContext';
import { saveCategories, saveBrands, readFileAsDataUrl } from '../../services/storageService';
import { Category, Brand } from '../../types';
import { Plus, Trash2, Upload } from 'lucide-react';

export const AdminCategoriesBrands: React.FC = () => {
  const { lang, categories, brands, refreshData } = useShop();

  const [activeTab, setActiveTab] = useState<'categories' | 'brands'>('categories');
  const [feedback, setFeedback] = useState('');

  // Category Form
  const [newCatName, setNewCatName] = useState('');
  const [newCatNameAr, setNewCatNameAr] = useState('');
  const [newCatSub, setNewCatSub] = useState('');

  // Brand Form
  const [newBrandName, setNewBrandName] = useState('');
  const [newBrandLogo, setNewBrandLogo] = useState('');
  const [newBrandDesc, setNewBrandDesc] = useState('');

  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;

    const slug = newCatName.toLowerCase().replace(/[^a-z0-9]/g, '-');
    const subcats = newCatSub
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    const newCat: Category = {
      id: `cat-${Date.now()}`,
      name: newCatName.trim(),
      nameAr: newCatNameAr.trim() || newCatName.trim(),
      slug,
      iconName: 'Box',
      displayOrder: categories.length + 1,
      subcategories: subcats,
    };

    const updated = [...categories, newCat];
    saveCategories(updated);
    refreshData();
    setNewCatName('');
    setNewCatNameAr('');
    setNewCatSub('');
    setFeedback(`Category "${newCat.name}" added successfully.`);
    setTimeout(() => setFeedback(''), 3000);
  };

  const handleDeleteCategory = (catId: string, name: string) => {
    if (window.confirm(`Delete category "${name}"?`)) {
      const updated = categories.filter((c) => c.id !== catId);
      saveCategories(updated);
      refreshData();
    }
  };

  const handleAddBrand = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBrandName.trim()) return;

    const newBrand: Brand = {
      id: `b-${Date.now()}`,
      name: newBrandName.trim(),
      logo:
        newBrandLogo.trim() ||
        'https://images.unsplash.com/photo-1611186871348-b1ce696e52c9?w=160&auto=format&fit=crop&q=80',
      description: newBrandDesc.trim(),
      featured: true,
      productCount: 0,
    };

    const updated = [...brands, newBrand];
    saveBrands(updated);
    refreshData();
    setNewBrandName('');
    setNewBrandLogo('');
    setNewBrandDesc('');
    setFeedback(`Brand "${newBrand.name}" added successfully.`);
    setTimeout(() => setFeedback(''), 3000);
  };

  const handleBrandLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const url = await readFileAsDataUrl(files[0]);
      setNewBrandLogo(url);
    }
  };

  const handleDeleteBrand = (brandId: string, name: string) => {
    if (window.confirm(`Delete brand "${name}"?`)) {
      const updated = brands.filter((b) => b.id !== brandId);
      saveBrands(updated);
      refreshData();
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#DCE5F0]">
        <div>
          <h1 className="text-2xl font-black text-[#172033]">
            {lang === 'ar' ? 'إدارة الأقسام والماركات العالمية' : 'Categories & Brands Administration'}
          </h1>
          <p className="text-xs text-[#64748B] mt-1">
            {lang === 'ar'
              ? 'التحكم بكافة الأقسام الـ 35، إضافة تصنيفات فرعية، وتحديث شعارات الماركات.'
              : 'Manage specialized catalog departments, subcategories, and manufacturer logos.'}
          </p>
        </div>

        {/* Tab switcher */}
        <div className="flex items-center gap-1 p-1 bg-[#F5F8FC] border border-[#DCE5F0] rounded-xl">
          <button
            onClick={() => setActiveTab('categories')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'categories' ? 'bg-[#007AFF] text-white shadow-xs' : 'text-[#64748B] hover:text-[#172033]'
            }`}
          >
            {lang === 'ar' ? 'الأقسام (35)' : 'Categories'}
          </button>
          <button
            onClick={() => setActiveTab('brands')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'brands' ? 'bg-[#007AFF] text-white shadow-xs' : 'text-[#64748B] hover:text-[#172033]'
            }`}
          >
            {lang === 'ar' ? 'الماركات' : 'Brands'}
          </button>
        </div>
      </div>

      {feedback && (
        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-[#16A34A] text-xs font-semibold">
          {feedback}
        </div>
      )}

      {activeTab === 'categories' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Add Category Form */}
          <div className="lg:col-span-5 p-6 rounded-3xl bg-white border border-[#DCE5F0] shadow-xs space-y-4">
            <h3 className="font-bold text-[#172033] text-sm pb-2 border-b border-[#DCE5F0] flex items-center gap-2">
              <Plus className="w-4 h-4 text-[#007AFF]" />
              <span>{lang === 'ar' ? 'إضافة قسم جديد' : 'Create New Category'}</span>
            </h3>

            <form onSubmit={handleAddCategory} className="space-y-3">
              <div>
                <label className="text-xs text-[#172033] font-semibold block mb-1">
                  Category Name (English) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Smart Projectors"
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  className="w-full bg-[#FFFFFF] border border-[#DCE5F0] rounded-xl px-3 py-2 text-xs text-[#172033] focus:outline-none focus:border-[#007AFF]"
                />
              </div>

              <div>
                <label className="text-xs text-[#172033] font-semibold block mb-1">
                  اسم القسم (بالعربية) *
                </label>
                <input
                  type="text"
                  placeholder="مثال: أجهزة العرض الذكية"
                  value={newCatNameAr}
                  onChange={(e) => setNewCatNameAr(e.target.value)}
                  className="w-full bg-[#FFFFFF] border border-[#DCE5F0] rounded-xl px-3 py-2 text-xs text-[#172033] focus:outline-none focus:border-[#007AFF]"
                />
              </div>

              <div>
                <label className="text-xs text-[#172033] font-semibold block mb-1">
                  Subcategories (Comma separated)
                </label>
                <input
                  type="text"
                  placeholder="e.g. 4K, Mini Portable, Laser"
                  value={newCatSub}
                  onChange={(e) => setNewCatSub(e.target.value)}
                  className="w-full bg-[#FFFFFF] border border-[#DCE5F0] rounded-xl px-3 py-2 text-xs text-[#172033] focus:outline-none focus:border-[#007AFF]"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-[#007AFF] hover:bg-[#0066D6] text-white font-bold text-xs shadow-xs cursor-pointer"
              >
                Add Category
              </button>
            </form>
          </div>

          {/* Existing Categories List */}
          <div className="lg:col-span-7 space-y-2">
            <h3 className="font-bold text-[#172033] text-sm mb-3">
              {lang === 'ar' ? 'الأقسام المسجلة في المتجر' : 'Active Catalog Categories'} ({categories.length})
            </h3>
            <div className="max-h-[500px] overflow-y-auto space-y-2 pr-1">
              {categories.map((c) => (
                <div
                  key={c.id}
                  className="p-3.5 rounded-xl bg-white border border-[#DCE5F0] flex items-center justify-between text-xs hover:border-[#007AFF] shadow-xs transition-colors"
                >
                  <div>
                    <h4 className="font-bold text-[#172033]">{c.name}</h4>
                    <span className="text-[10px] text-[#007AFF] font-medium block">{c.nameAr}</span>
                    {c.subcategories && c.subcategories.length > 0 && (
                      <span className="text-[10px] text-[#64748B] block mt-0.5">
                        {c.subcategories.join(', ')}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => handleDeleteCategory(c.id, c.name)}
                    className="p-1.5 text-[#64748B] hover:text-[#DC2626] transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Add Brand Form */}
          <div className="lg:col-span-5 p-6 rounded-3xl bg-white border border-[#DCE5F0] shadow-xs space-y-4">
            <h3 className="font-bold text-[#172033] text-sm pb-2 border-b border-[#DCE5F0] flex items-center gap-2">
              <Plus className="w-4 h-4 text-[#007AFF]" />
              <span>{lang === 'ar' ? 'إضافة ماركة جديدة' : 'Add New Brand'}</span>
            </h3>

            <form onSubmit={handleAddBrand} className="space-y-3">
              <div>
                <label className="text-xs text-[#172033] font-semibold block mb-1">
                  Brand Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Nothing Phone"
                  value={newBrandName}
                  onChange={(e) => setNewBrandName(e.target.value)}
                  className="w-full bg-[#FFFFFF] border border-[#DCE5F0] rounded-xl px-3 py-2 text-xs text-[#172033] focus:outline-none focus:border-[#007AFF]"
                />
              </div>

              <div>
                <label className="text-xs text-[#172033] font-semibold block mb-1">
                  Brand Logo URL or File
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    placeholder="https://..."
                    value={newBrandLogo}
                    onChange={(e) => setNewBrandLogo(e.target.value)}
                    className="flex-1 bg-[#FFFFFF] border border-[#DCE5F0] rounded-xl px-3 py-2 text-xs text-[#172033] focus:outline-none focus:border-[#007AFF]"
                  />
                  <label className="p-2 rounded-xl bg-[#F5F8FC] border border-[#DCE5F0] text-[#007AFF] hover:bg-[#EAF3FF] cursor-pointer">
                    <Upload className="w-4 h-4" />
                    <input type="file" accept="image/*" onChange={handleBrandLogoUpload} className="hidden" />
                  </label>
                </div>
              </div>

              <div>
                <label className="text-xs text-[#172033] font-semibold block mb-1">
                  Short Description
                </label>
                <input
                  type="text"
                  placeholder="e.g. Glyph interface smartphones & transparent audio"
                  value={newBrandDesc}
                  onChange={(e) => setNewBrandDesc(e.target.value)}
                  className="w-full bg-[#FFFFFF] border border-[#DCE5F0] rounded-xl px-3 py-2 text-xs text-[#172033] focus:outline-none focus:border-[#007AFF]"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-[#007AFF] hover:bg-[#0066D6] text-white font-bold text-xs shadow-xs cursor-pointer"
              >
                Add Brand
              </button>
            </form>
          </div>

          {/* Existing Brands Grid */}
          <div className="lg:col-span-7">
            <h3 className="font-bold text-[#172033] text-sm mb-3">
              {lang === 'ar' ? 'الماركات العالمية المعتمدة' : 'Official Brands Directory'} ({brands.length})
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[500px] overflow-y-auto pr-1">
              {brands.map((b) => (
                <div
                  key={b.id}
                  className="p-3.5 rounded-xl bg-white border border-[#DCE5F0] flex items-center justify-between text-xs hover:border-[#007AFF] shadow-xs transition-colors"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <img
                      src={b.logo}
                      alt={b.name}
                      className="w-8 h-8 rounded-full object-cover bg-[#F5F8FC] border border-[#DCE5F0] flex-shrink-0"
                    />
                    <span className="font-bold text-[#172033] truncate">{b.name}</span>
                  </div>
                  <button
                    onClick={() => handleDeleteBrand(b.id, b.name)}
                    className="p-1 text-[#64748B] hover:text-[#DC2626] transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
