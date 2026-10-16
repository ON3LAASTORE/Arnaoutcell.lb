import React, { useState } from 'react';
import { useShop } from '../../context/ShopContext';
import { Product, ProductSpec } from '../../types';
import { saveProduct, deleteProduct, readFileAsDataUrl } from '../../services/storageService';
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  Upload,
  X,
} from 'lucide-react';

export const AdminProducts: React.FC = () => {
  const { lang, products, categories, brands, refreshData } = useShop();

  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  // Form State
  const [formName, setFormName] = useState('');
  const [formNameAr, setFormNameAr] = useState('');
  const [formBrand, setFormBrand] = useState('Apple');
  const [formCategory, setFormCategory] = useState('Phones');
  const [formSubcategory, setFormSubcategory] = useState('');
  const [formSku, setFormSku] = useState('');
  const [formBarcode, setFormBarcode] = useState('');
  const [formOriginalPrice, setFormOriginalPrice] = useState(0);
  const [formPrice, setFormPrice] = useState(0);
  const [formStock, setFormStock] = useState(10);
  const [formLowStockThreshold, setFormLowStockThreshold] = useState(3);
  const [formImages, setFormImages] = useState<string[]>([]);
  const [newImageUrl, setNewImageUrl] = useState('');
  const [formVideoUrl, setFormVideoUrl] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formDescAr, setFormDescAr] = useState('');
  const [formWarrantyMonths, setFormWarrantyMonths] = useState(12);
  const [formColors, setFormColors] = useState<string[]>([]);
  const [newColorInput, setNewColorInput] = useState('');
  const [formSpecs, setFormSpecs] = useState<ProductSpec[]>([]);
  const [specLabel, setSpecLabel] = useState('');
  const [specValue, setSpecValue] = useState('');
  const [formIsOffer, setFormIsOffer] = useState(false);
  const [formIsFeatured, setFormIsFeatured] = useState(false);
  const [formIsNewArrival, setFormIsNewArrival] = useState(true);
  const [formIsPublished, setFormIsPublished] = useState(true);

  const openAddModal = () => {
    setEditingProduct(null);
    setFormName('');
    setFormNameAr('');
    setFormBrand(brands[0]?.name || 'Apple');
    setFormCategory(categories[0]?.name || 'Phones');
    setFormSubcategory('');
    setFormSku(`ARN-${Math.floor(1000 + Math.random() * 9000)}`);
    setFormBarcode('');
    setFormOriginalPrice(100);
    setFormPrice(89);
    setFormStock(15);
    setFormLowStockThreshold(3);
    setFormImages(['https://images.unsplash.com/photo-1511707171634-5f897ff02597?w=800']);
    setFormVideoUrl('');
    setFormDesc('');
    setFormDescAr('');
    setFormWarrantyMonths(12);
    setFormColors(['Black', 'Silver']);
    setFormSpecs([
      { label: 'Storage', value: '128GB' },
      { label: 'RAM', value: '8GB' },
      { label: 'Warranty', value: '12 Months Store Warranty' },
    ]);
    setFormIsOffer(false);
    setFormIsFeatured(true);
    setFormIsNewArrival(true);
    setFormIsPublished(true);
    setIsModalOpen(true);
  };

  const openEditModal = (p: Product) => {
    setEditingProduct(p);
    setFormName(p.name);
    setFormNameAr(p.nameAr || '');
    setFormBrand(p.brand);
    setFormCategory(p.category);
    setFormSubcategory(p.subcategory || '');
    setFormSku(p.sku);
    setFormBarcode(p.barcode || '');
    setFormOriginalPrice(p.originalPrice);
    setFormPrice(p.price);
    setFormStock(p.stock);
    setFormLowStockThreshold(p.lowStockThreshold || 3);
    setFormImages(p.images || []);
    setFormVideoUrl(p.videoUrl || '');
    setFormDesc(p.description);
    setFormDescAr(p.descriptionAr || '');
    setFormWarrantyMonths(p.warrantyMonths);
    setFormColors(p.colors || []);
    setFormSpecs(p.specifications || []);
    setFormIsOffer(Boolean(p.isSpecialOffer));
    setFormIsFeatured(Boolean(p.isFeatured));
    setFormIsNewArrival(Boolean(p.isNewArrival));
    setFormIsPublished(p.isPublished);
    setIsModalOpen(true);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      try {
        const base64 = await readFileAsDataUrl(files[0]);
        setFormImages((prev) => [...prev, base64]);
      } catch (err) {
        console.error('File read error', err);
      }
    }
  };

  const handleAddImageUrl = () => {
    if (newImageUrl.trim()) {
      setFormImages((prev) => [...prev, newImageUrl.trim()]);
      setNewImageUrl('');
    }
  };

  const handleRemoveImage = (index: number) => {
    setFormImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAddColor = () => {
    if (newColorInput.trim() && !formColors.includes(newColorInput.trim())) {
      setFormColors((prev) => [...prev, newColorInput.trim()]);
      setNewColorInput('');
    }
  };

  const handleRemoveColor = (col: string) => {
    setFormColors((prev) => prev.filter((c) => c !== col));
  };

  const handleAddSpec = () => {
    if (specLabel.trim() && specValue.trim()) {
      setFormSpecs((prev) => [...prev, { label: specLabel.trim(), value: specValue.trim() }]);
      setSpecLabel('');
      setSpecValue('');
    }
  };

  const handleRemoveSpec = (index: number) => {
    setFormSpecs((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formSku.trim()) {
      setFeedback({ type: 'error', msg: 'Product Name and SKU are required.' });
      return;
    }

    const discountPercentage =
      formOriginalPrice > formPrice
        ? Math.round(((formOriginalPrice - formPrice) / formOriginalPrice) * 100)
        : 0;

    const savedProduct: Product = {
      id: editingProduct ? editingProduct.id : `prod-${Date.now()}`,
      name: formName.trim(),
      nameAr: formNameAr.trim() || formName.trim(),
      brand: formBrand,
      category: formCategory,
      subcategory: formSubcategory.trim(),
      sku: formSku.trim(),
      barcode: formBarcode.trim() || formSku.trim(),
      price: formPrice,
      originalPrice: formOriginalPrice || formPrice,
      discountPercentage,
      stock: formStock,
      lowStockThreshold: formLowStockThreshold,
      images:
        formImages.length > 0
          ? formImages
          : ['https://images.unsplash.com/photo-1511707171634-5f897ff02597?w=800'],
      videoUrl: formVideoUrl.trim() || undefined,
      description: formDesc.trim() || 'Genuine device with full Lebanese store warranty.',
      descriptionAr:
        formDescAr.trim() || 'جهاز أصلي مع كفالة المتجر الرسمية في صيدا وتوصيل لكافة الأراضي اللبنانية.',
      specifications: formSpecs,
      colors: formColors,
      rating: editingProduct ? editingProduct.rating : 5.0,
      reviewCount: editingProduct ? editingProduct.reviewCount : 1,
      isSpecialOffer: formIsOffer,
      isFeatured: formIsFeatured,
      isNewArrival: formIsNewArrival,
      isPublished: formIsPublished,
      warrantyMonths: formWarrantyMonths,
      createdAt: editingProduct ? editingProduct.createdAt : new Date().toISOString(),
    };

    saveProduct(savedProduct);
    refreshData();
    setIsModalOpen(false);
    setFeedback({
      type: 'success',
      msg: `Product "${savedProduct.name}" saved successfully.`,
    });
    setTimeout(() => setFeedback(null), 3000);
  };

  const handleDelete = (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to delete "${name}"?`)) {
      deleteProduct(id);
      refreshData();
      setFeedback({ type: 'success', msg: `Product deleted.` });
      setTimeout(() => setFeedback(null), 3000);
    }
  };

  const filteredProducts = products.filter((p) => {
    const matchCategory = selectedCategory === 'all' || p.category === selectedCategory;
    const matchSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.sku.toLowerCase().includes(search.toLowerCase()) ||
      p.brand.toLowerCase().includes(search.toLowerCase());
    return matchCategory && matchSearch;
  });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#DCE5F0]">
        <div>
          <h1 className="text-2xl font-black text-[#172033]">
            {lang === 'ar' ? 'إدارة المنتجات والأجهزة' : 'Products & Catalog Management'}
          </h1>
          <p className="text-xs text-[#64748B] mt-1">
            {lang === 'ar'
              ? 'إضافة أجهزة جديدة، رفع الصور والفيديوهات، تعديل الأسعار، ومواصفات الكفالة.'
              : 'Add new items, upload persistent media, configure discounts and technical specifications.'}
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="px-4 py-2.5 rounded-xl bg-[#007AFF] hover:bg-[#0066D6] text-white font-bold text-xs flex items-center gap-2 cursor-pointer shadow-xs self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>{lang === 'ar' ? 'إضافة منتج جديد' : 'Add New Product'}</span>
        </button>
      </div>

      {feedback && (
        <div
          className={`p-3.5 rounded-xl text-xs font-semibold flex items-center justify-between ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border border-emerald-200 text-[#16A34A]'
              : 'bg-red-50 border border-red-200 text-[#DC2626]'
          }`}
        >
          <span>{feedback.msg}</span>
          <button onClick={() => setFeedback(null)} className="text-[#64748B] hover:text-[#172033]">
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
            placeholder={lang === 'ar' ? 'بحث بالاسم أو SKU أو الماركة...' : 'Search by name, SKU, or brand...'}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[#FFFFFF] border border-[#DCE5F0] rounded-xl pl-10 pr-3 rtl:pl-3 rtl:pr-10 py-2.5 text-xs text-[#172033] focus:outline-none focus:border-[#007AFF] shadow-xs"
          />
        </div>

        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="bg-white border border-[#DCE5F0] text-[#172033] text-xs rounded-xl px-3 py-2.5 focus:outline-none focus:border-[#007AFF] cursor-pointer shadow-xs font-medium"
        >
          <option value="all">All Categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.name}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {/* Products Table */}
      <div className="rounded-2xl border border-[#DCE5F0] bg-white overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left rtl:text-right text-xs">
            <thead className="bg-[#F5F8FC] text-[#64748B] uppercase tracking-wider text-[10px] border-b border-[#DCE5F0]">
              <tr>
                <th className="py-3 px-4">Product</th>
                <th className="py-3 px-4">Brand / Category</th>
                <th className="py-3 px-4">Price (USD)</th>
                <th className="py-3 px-4">Stock</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right rtl:text-left">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#DCE5F0] text-[#172033]">
              {filteredProducts.map((p) => (
                <tr key={p.id} className="hover:bg-[#F5F8FC] transition-colors">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <img
                        src={p.images[0]}
                        alt={p.name}
                        className="w-10 h-10 object-cover rounded-lg bg-[#F5F8FC] border border-[#DCE5F0] flex-shrink-0"
                      />
                      <div className="min-w-0">
                        <div className="font-bold text-[#172033] line-clamp-1">{p.name}</div>
                        <div className="text-[10px] text-[#64748B] font-mono">SKU: {p.sku}</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="font-semibold text-[#007AFF]">{p.brand}</div>
                    <div className="text-[10px] text-[#64748B]">{p.category}</div>
                  </td>
                  <td className="py-3 px-4 font-mono">
                    <span className="font-black text-[#172033]">${p.price}</span>
                    {p.originalPrice > p.price && (
                      <span className="text-[10px] text-[#DC2626] block">
                        -{p.discountPercentage}% OFF
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 font-mono">
                    {p.stock <= 0 ? (
                      <span className="text-[#DC2626] font-bold">Out of Stock (0)</span>
                    ) : p.stock <= (p.lowStockThreshold || 3) ? (
                      <span className="text-amber-600 font-bold">Low ({p.stock})</span>
                    ) : (
                      <span className="text-[#16A34A] font-bold">{p.stock}</span>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        p.isPublished
                          ? 'bg-emerald-50 text-[#16A34A] border border-emerald-200'
                          : 'bg-[#F5F8FC] text-[#64748B] border border-[#DCE5F0]'
                      }`}
                    >
                      {p.isPublished ? 'Live' : 'Hidden'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right rtl:text-left">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => openEditModal(p)}
                        className="p-1.5 rounded-lg bg-[#F5F8FC] hover:bg-[#EAF3FF] border border-[#DCE5F0] text-[#007AFF] transition-colors"
                        title="Edit"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(p.id, p.name)}
                        className="p-1.5 rounded-lg bg-[#F5F8FC] hover:bg-red-50 border border-[#DCE5F0] text-[#DC2626] transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal for Add / Edit Product */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="relative w-full max-w-3xl bg-white border border-[#DCE5F0] rounded-3xl p-6 sm:p-8 space-y-6 my-8 max-h-[90vh] overflow-y-auto shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-[#DCE5F0]">
              <h2 className="text-lg font-black text-[#172033]">
                {editingProduct
                  ? lang === 'ar'
                    ? 'تعديل بيانات المنتج'
                    : 'Edit Product Details'
                  : lang === 'ar'
                  ? 'إضافة منتج جديد للمتجر'
                  : 'Add New Product'}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg text-[#64748B] hover:text-[#172033] hover:bg-[#F5F8FC]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="space-y-5">
              {/* Names */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-[#172033] font-semibold block mb-1">
                    Product Name (English) *
                  </label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="w-full bg-[#FFFFFF] border border-[#DCE5F0] rounded-xl px-3 py-2 text-xs text-[#172033] focus:outline-none focus:border-[#007AFF]"
                  />
                </div>
                <div>
                  <label className="text-xs text-[#172033] font-semibold block mb-1">
                    اسم المنتج (بالعربية)
                  </label>
                  <input
                    type="text"
                    value={formNameAr}
                    onChange={(e) => setFormNameAr(e.target.value)}
                    className="w-full bg-[#FFFFFF] border border-[#DCE5F0] rounded-xl px-3 py-2 text-xs text-[#172033] focus:outline-none focus:border-[#007AFF]"
                  />
                </div>
              </div>

              {/* Brand & Category */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs text-[#172033] font-semibold block mb-1">Brand *</label>
                  <select
                    value={formBrand}
                    onChange={(e) => setFormBrand(e.target.value)}
                    className="w-full bg-[#FFFFFF] border border-[#DCE5F0] rounded-xl px-3 py-2 text-xs text-[#172033] focus:outline-none focus:border-[#007AFF] cursor-pointer"
                  >
                    {brands.map((b) => (
                      <option key={b.id} value={b.name}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs text-[#172033] font-semibold block mb-1">Category *</label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full bg-[#FFFFFF] border border-[#DCE5F0] rounded-xl px-3 py-2 text-xs text-[#172033] focus:outline-none focus:border-[#007AFF] cursor-pointer"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs text-[#172033] font-semibold block mb-1">Subcategory</label>
                  <input
                    type="text"
                    placeholder="e.g. Flagship Phones"
                    value={formSubcategory}
                    onChange={(e) => setFormSubcategory(e.target.value)}
                    className="w-full bg-[#FFFFFF] border border-[#DCE5F0] rounded-xl px-3 py-2 text-xs text-[#172033] focus:outline-none focus:border-[#007AFF]"
                  />
                </div>
              </div>

              {/* Pricing & Stock */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div>
                  <label className="text-xs text-[#172033] font-semibold block mb-1">Original Price ($)</label>
                  <input
                    type="number"
                    min="1"
                    value={formOriginalPrice}
                    onChange={(e) => setFormOriginalPrice(Number(e.target.value))}
                    className="w-full bg-[#FFFFFF] border border-[#DCE5F0] rounded-xl px-3 py-2 text-xs text-[#172033] focus:outline-none focus:border-[#007AFF] font-mono"
                  />
                </div>

                <div>
                  <label className="text-xs text-[#172033] font-semibold block mb-1">Selling Price ($) *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={formPrice}
                    onChange={(e) => setFormPrice(Number(e.target.value))}
                    className="w-full bg-[#FFFFFF] border border-[#DCE5F0] rounded-xl px-3 py-2 text-xs text-[#007AFF] font-bold focus:outline-none focus:border-[#007AFF] font-mono"
                  />
                </div>

                <div>
                  <label className="text-xs text-[#172033] font-semibold block mb-1">Stock Quantity *</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={formStock}
                    onChange={(e) => setFormStock(Number(e.target.value))}
                    className="w-full bg-[#FFFFFF] border border-[#DCE5F0] rounded-xl px-3 py-2 text-xs text-[#172033] focus:outline-none focus:border-[#007AFF] font-mono"
                  />
                </div>

                <div>
                  <label className="text-xs text-[#172033] font-semibold block mb-1">Low Stock Alert</label>
                  <input
                    type="number"
                    min="1"
                    value={formLowStockThreshold}
                    onChange={(e) => setFormLowStockThreshold(Number(e.target.value))}
                    className="w-full bg-[#FFFFFF] border border-[#DCE5F0] rounded-xl px-3 py-2 text-xs text-[#172033] focus:outline-none focus:border-[#007AFF] font-mono"
                  />
                </div>
              </div>

              {/* Multi-Image Manager */}
              <div className="p-4 rounded-2xl bg-[#F5F8FC] border border-[#DCE5F0] space-y-3">
                <span className="text-xs font-bold text-[#172033] block">
                  Product Images (Persistent Base64 & External URLs)
                </span>

                <div className="flex flex-wrap gap-3">
                  {formImages.map((img, idx) => (
                    <div key={idx} className="relative w-16 h-16 rounded-xl overflow-hidden border border-[#DCE5F0] group bg-white">
                      <img src={img} alt={`Product ${idx}`} className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => handleRemoveImage(idx)}
                        className="absolute inset-0 bg-red-900/80 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}

                  {/* Upload button from PC */}
                  <label className="w-16 h-16 rounded-xl border border-dashed border-[#BAE6FD] hover:border-[#007AFF] flex flex-col items-center justify-center text-[#007AFF] cursor-pointer bg-[#EAF3FF] transition-colors">
                    <Upload className="w-5 h-5 mb-0.5" />
                    <span className="text-[9px] font-bold">Upload</span>
                    <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
                  </label>
                </div>

                {/* Add by URL input */}
                <div className="flex gap-2">
                  <input
                    type="url"
                    placeholder="Or enter image URL (https://...)"
                    value={newImageUrl}
                    onChange={(e) => setNewImageUrl(e.target.value)}
                    className="flex-1 bg-white border border-[#DCE5F0] rounded-xl px-3 py-1.5 text-xs text-[#172033] focus:outline-none focus:border-[#007AFF]"
                  />
                  <button
                    type="button"
                    onClick={handleAddImageUrl}
                    className="px-3 py-1.5 bg-[#F5F8FC] border border-[#DCE5F0] hover:bg-[#EAF3FF] text-[#172033] hover:text-[#007AFF] text-xs font-semibold rounded-xl"
                  >
                    Add URL
                  </button>
                </div>
              </div>

              {/* Technical Specifications Custom Builder */}
              <div className="p-4 rounded-2xl bg-[#F5F8FC] border border-[#DCE5F0] space-y-3">
                <span className="text-xs font-bold text-[#172033] block">
                  Technical Specifications (Custom Key-Value)
                </span>

                <div className="space-y-1.5 max-h-36 overflow-y-auto">
                  {formSpecs.map((sp, i) => (
                    <div key={i} className="flex items-center justify-between text-xs p-2 bg-white border border-[#DCE5F0] rounded-lg">
                      <span>
                        <strong className="text-[#007AFF]">{sp.label}:</strong> {sp.value}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveSpec(i)}
                        className="text-[#64748B] hover:text-[#DC2626]"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Spec (e.g. Battery, RAM, Screen)"
                    value={specLabel}
                    onChange={(e) => setSpecLabel(e.target.value)}
                    className="flex-1 bg-white border border-[#DCE5F0] rounded-xl px-3 py-1.5 text-xs text-[#172033] focus:outline-none focus:border-[#007AFF]"
                  />
                  <input
                    type="text"
                    placeholder="Value (e.g. 5000 mAh, 16GB)"
                    value={specValue}
                    onChange={(e) => setSpecValue(e.target.value)}
                    className="flex-1 bg-white border border-[#DCE5F0] rounded-xl px-3 py-1.5 text-xs text-[#172033] focus:outline-none focus:border-[#007AFF]"
                  />
                  <button
                    type="button"
                    onClick={handleAddSpec}
                    className="px-3 py-1.5 bg-[#007AFF] text-white font-bold text-xs rounded-xl hover:bg-[#0066D6]"
                  >
                    Add
                  </button>
                </div>
              </div>

              {/* Toggles */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pt-2">
                <label className="flex items-center gap-2 cursor-pointer text-[#172033]">
                  <input
                    type="checkbox"
                    checked={formIsOffer}
                    onChange={(e) => setFormIsOffer(e.target.checked)}
                    className="rounded accent-[#007AFF] w-4 h-4"
                  />
                  <span>Special Offer 🔥</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-[#172033]">
                  <input
                    type="checkbox"
                    checked={formIsFeatured}
                    onChange={(e) => setFormIsFeatured(e.target.checked)}
                    className="rounded accent-[#007AFF] w-4 h-4"
                  />
                  <span>Featured ⭐</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-[#172033]">
                  <input
                    type="checkbox"
                    checked={formIsNewArrival}
                    onChange={(e) => setFormIsNewArrival(e.target.checked)}
                    className="rounded accent-[#007AFF] w-4 h-4"
                  />
                  <span>New Arrival 🚀</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-[#172033]">
                  <input
                    type="checkbox"
                    checked={formIsPublished}
                    onChange={(e) => setFormIsPublished(e.target.checked)}
                    className="rounded accent-[#007AFF] w-4 h-4"
                  />
                  <span>Published (Live)</span>
                </label>
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#DCE5F0]">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl bg-[#F5F8FC] border border-[#DCE5F0] text-[#172033] text-xs font-semibold hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-[#007AFF] hover:bg-[#0066D6] text-white text-xs font-black shadow-xs cursor-pointer"
                >
                  Save Product
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
