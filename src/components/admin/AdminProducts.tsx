import React, { useEffect, useRef, useState } from 'react';
import { useShop } from '../../context/ShopContext';
import { useAdmin } from '../../context/AdminContext';
import { Product, ProductSpec } from '../../types';
import { saveProductAsync, deleteProductAsync } from '../../services/storageService';
import { maybeTriggerRestockNotifications } from '../../services/stockNotificationService';
import { buildAdminProductRecord } from '../../utils/adminProductFormHelpers';
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  X,
  Share2,
  RotateCcw,
  Palette,
  ImagePlus,
  HardDrive,
  AlertCircle,
  Loader2,
  ImageOff,
  Star,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { LazyImage } from '../LazyImage';
import ProductImageUploader from './ProductImageUploader';
import { DEFAULT_FULL_RES_FALLBACK_IMAGE, resolveFullResolutionImageUrl } from '../../utils/imageResolutionHelpers';
import {
  collectRemovedMediaUrls,
  moveGalleryImage,
  removeGalleryImageAt,
  setPrimaryGalleryImage,
} from '../../utils/productMediaHelpers';
import { cleanupRemovedProductMedia } from '../../services/productMediaService';
import {
  buildCapacityVariantConfigs,
  buildColorVariantConfigs,
  CapacityVariantConfig,
  ColorVariantConfig,
  extractStructuredProductVariantsAndColors,
} from '../../utils/colorVariantHelpers';
import { optimizeUploadedImage } from '../../utils/imageCompression';
import { validateImageFile } from '../../utils/imageUploadHelpers';
import { ConfirmDialog } from '../ConfirmDialog';

interface AdminProductsProps {
  onShareProduct?: (productId: string) => void;
}

export const AdminProducts: React.FC<AdminProductsProps> = ({ onShareProduct }) => {
  const { lang, products, categories, brands, refreshData } = useShop();
  const { selectableBrands, requirePermission } = useAdmin();

  // Unified list of selectable brand names guaranteeing all required brands are present
  const allSelectableBrandNames = Array.from(
    new Set([
      ...selectableBrands,
      ...(brands || []).map((b) => b?.name).filter((n): n is string => Boolean(n)),
    ])
  );

  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedBrand, setSelectedBrand] = useState('all');
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const isSavingRef = useRef(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const modalErrorRef = useRef<HTMLDivElement>(null);
  const modalScrollRef = useRef<HTMLDivElement>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  useEffect(() => {
    if (modalError) {
      if (modalScrollRef.current) {
        modalScrollRef.current.scrollTop = 0;
      }
      if (modalErrorRef.current) {
        modalErrorRef.current.scrollIntoView({ behavior: 'auto', block: 'nearest' });
      }
    }
  }, [modalError]);

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
  const [photoActionNotice, setPhotoActionNotice] = useState<string | null>(null);
  const [formVideoUrl, setFormVideoUrl] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formDescAr, setFormDescAr] = useState('');
  const [formWarrantyMonths, setFormWarrantyMonths] = useState(12);
  const [formColorVariants, setFormColorVariants] = useState<ColorVariantConfig[]>([]);
  const [formCapacityVariants, setFormCapacityVariants] = useState<CapacityVariantConfig[]>([]);
  const [newColorInput, setNewColorInput] = useState('');
  const [newCapacityInput, setNewCapacityInput] = useState('');
  const [colorUploadError, setColorUploadError] = useState<string | null>(null);
  const [formSpecs, setFormSpecs] = useState<ProductSpec[]>([]);
  const [specLabel, setSpecLabel] = useState('');
  const [specValue, setSpecValue] = useState('');
  const [formIsOffer, setFormIsOffer] = useState(false);
  const [formIsFeatured, setFormIsFeatured] = useState(false);
  const [formIsNewArrival, setFormIsNewArrival] = useState(true);
  const [formIsBestSeller, setFormIsBestSeller] = useState(false);
  const [formIsPublished, setFormIsPublished] = useState(true);

  const openAddModal = () => {
    if (
      !requirePermission(['full_stock', 'manage_products'], {
        actionEn: 'Add new catalog product',
        actionAr: 'إضافة منتج جديد للكتالوج',
      })
    ) {
      return;
    }
    setEditingProduct(null);
    setFormName('');
    setFormNameAr('');
    setFormBrand(brands[0]?.name || 'Apple');
    setFormCategory(categories[0]?.name || 'Phones');
    setFormSubcategory('');
    setFormSku(`OAA-${Math.floor(1000 + Math.random() * 9000)}`);
    setFormBarcode('');
    setFormOriginalPrice(100);
    setFormPrice(89);
    setFormStock(15);
    setFormLowStockThreshold(3);
    setFormImages([DEFAULT_FULL_RES_FALLBACK_IMAGE]);
    setNewImageUrl('');
    setPhotoActionNotice(null);
    setFormVideoUrl('');
    setFormDesc('');
    setFormDescAr('');
    setFormWarrantyMonths(12);
    setFormColorVariants([
      { id: 'color-black', color: 'Black', hex: '#111827', priceAdjustment: 0 },
      { id: 'color-silver', color: 'Silver', hex: '#CBD5E1', priceAdjustment: 0 },
    ]);
    setFormCapacityVariants([]);
    setNewColorInput('');
    setNewCapacityInput('');
    setColorUploadError(null);
    setFormSpecs([
      { label: 'Storage', value: '128GB' },
      { label: 'RAM', value: '8GB' },
      { label: 'Warranty', value: '12 Months Store Warranty' },
    ]);
    setFormIsOffer(false);
    setFormIsFeatured(true);
    setFormIsNewArrival(true);
    setFormIsBestSeller(false);
    setFormIsPublished(true);
    setModalError(null);
    setIsSaving(false);
    isSavingRef.current = false;
    setIsModalOpen(true);
  };

  const openEditModal = (p: Product) => {
    if (
      !requirePermission(['full_stock', 'manage_products'], {
        actionEn: `Edit product "${p.name}"`,
        actionAr: `تعديل المنتج "${p.nameAr || p.name}"`,
      })
    ) {
      return;
    }
    setEditingProduct(p);
    setFormName(p.name || '');
    setFormNameAr(p.nameAr || '');
    setFormBrand(p.brand || 'Apple');
    setFormCategory(p.category || 'Phones');
    setFormSubcategory(p.subcategory || '');
    setFormSku(p.sku || p.id);
    setFormBarcode(p.barcode || '');
    const safePrice = Number.isFinite(Number(p.price)) ? Number(p.price) : 0;
    const safeOrig = Number.isFinite(Number(p.originalPrice)) ? Number(p.originalPrice) : safePrice;
    const safeStock = Number.isFinite(Number(p.stock)) ? Number(p.stock) : 0;
    const safeWarranty = Number.isFinite(Number(p.warrantyMonths)) ? Number(p.warrantyMonths) : 12;
    setFormOriginalPrice(safeOrig);
    setFormPrice(safePrice);
    setFormStock(safeStock);
    setFormLowStockThreshold(Number.isFinite(Number(p.lowStockThreshold)) ? Number(p.lowStockThreshold) : 3);
    setFormImages(Array.isArray(p.images) ? p.images : []);
    setNewImageUrl('');
    setPhotoActionNotice(null);
    setFormVideoUrl(p.videoUrl || '');
    setFormDesc(p.description || '');
    setFormDescAr(p.descriptionAr || '');
    setFormWarrantyMonths(safeWarranty);
    setFormColorVariants(buildColorVariantConfigs(p));
    setFormCapacityVariants(buildCapacityVariantConfigs(p));
    setNewColorInput('');
    setNewCapacityInput('');
    setColorUploadError(null);
    setFormSpecs(Array.isArray(p.specifications) ? p.specifications : []);
    setFormIsOffer(Boolean(p.isSpecialOffer));
    setFormIsFeatured(Boolean(p.isFeatured));
    setFormIsNewArrival(Boolean(p.isNewArrival));
    setFormIsBestSeller(Boolean(p.isBestSeller));
    setFormIsPublished(p.isPublished !== false);
    setModalError(null);
    setIsSaving(false);
    isSavingRef.current = false;
    setIsModalOpen(true);
  };

  const handleAddImageUrl = () => {
    if (newImageUrl.trim()) {
      const resolved = resolveFullResolutionImageUrl(newImageUrl.trim()) || newImageUrl.trim();
      setFormImages((prev) => (prev.includes(resolved) ? prev : [...prev, resolved]));
      setNewImageUrl('');
      setPhotoActionNotice(null);
    }
  };

  const handleRemoveImage = (index: number) => {
    setFormImages((prev) => {
      const next = removeGalleryImageAt(prev, index);
      if (index === 0 && next.length > 0) {
        setPhotoActionNotice(
          lang === 'ar'
            ? 'تمت إزالة الصورة الرئيسية وترقية الصورة التالية تلقائياً. اضغط حفظ لتثبيت التغيير.'
            : 'Primary photo removed — next photo promoted automatically. Click Save to persist.'
        );
      } else if (next.length === 0) {
        setPhotoActionNotice(
          lang === 'ar'
            ? 'تمت إزالة كافة الصور. اضغط حفظ لتخزين المنتج بدون صور.'
            : 'All photos removed. Click Save to store product with no photos.'
        );
      } else {
        setPhotoActionNotice(
          lang === 'ar'
            ? 'تمت إزالة الصورة من المعرض. اضغط حفظ لتأكيد التغييرات.'
            : 'Photo removed from gallery. Click Save to persist changes.'
        );
      }
      return next;
    });
  };

  const handleSetPrimaryImage = (index: number) => {
    setFormImages((prev) => setPrimaryGalleryImage(prev, index));
    setPhotoActionNotice(
      lang === 'ar'
        ? 'تم تعيين الصورة كصورة رئيسية للمنتج. اضغط حفظ لتثبيت الترتيب.'
        : 'Updated primary storefront photo. Click Save to persist.'
    );
  };

  const handleMoveImage = (fromIndex: number, toIndex: number) => {
    setFormImages((prev) => moveGalleryImage(prev, fromIndex, toIndex));
    setPhotoActionNotice(null);
  };

  const handleClearAllImages = () => {
    setFormImages([]);
    setPhotoActionNotice(
      lang === 'ar'
        ? 'تمت إزالة جميع صور المعرض. اضغط حفظ لتخزين المنتج بدون صور.'
        : 'All gallery photos cleared. Click Save to persist empty gallery.'
    );
  };

  const handleAddColor = (presetColor?: string) => {
    const candidate = (presetColor ?? newColorInput).trim();
    if (!candidate) {
      // Allow creating a blank editable color row when clicking "+ Add Color" with empty input
      if (!presetColor) {
        setFormColorVariants((prev) => [
          ...prev,
          {
            id: `color-${Date.now()}-${prev.length + 1}`,
            color: '',
            priceAdjustment: 0,
          },
        ]);
      }
      return;
    }
    const exists = formColorVariants.some(
      (row) => row.color.trim().toLowerCase() === candidate.toLowerCase()
    );
    if (!exists) {
      const slug = candidate.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || `${Date.now()}`;
      setFormColorVariants((prev) => {
        const usedIds = new Set(prev.map((row) => row.id).filter(Boolean));
        let nextId = `color-${slug}`;
        let suffix = 2;
        while (usedIds.has(nextId)) {
          nextId = `color-${slug}-${suffix}`;
          suffix += 1;
        }
        return [
          ...prev,
          { id: nextId, color: candidate, priceAdjustment: 0 },
        ];
      });
    }
    if (!presetColor) {
      setNewColorInput('');
    }
    setColorUploadError(null);
  };

  const handleUpdateColorVariant = (index: number, patch: Partial<ColorVariantConfig>) => {
    setFormColorVariants((prev) =>
      prev.map((row, idx) => (idx === index ? { ...row, ...patch } : row))
    );
  };

  const handleToggleColorCapacity = (colorIdx: number, capId: string) => {
    setFormColorVariants((prev) =>
      prev.map((row, idx) => {
        if (idx !== colorIdx) return row;
        const allCapIds = formCapacityVariants.map((c) => c.id);
        const currentSelected =
          row.availableCapacities && row.availableCapacities.length > 0
            ? row.availableCapacities
            : allCapIds;
        const exists = currentSelected.includes(capId);
        const nextSelected = exists
          ? currentSelected.filter((id) => id !== capId)
          : [...currentSelected, capId];
        // If empty or all caps selected, omit restriction (defaults to all)
        return {
          ...row,
          availableCapacities:
            nextSelected.length === 0 || nextSelected.length >= allCapIds.length
              ? undefined
              : nextSelected,
        };
      })
    );
  };

  const handleAddCapacity = (presetCap?: string) => {
    const candidate = (presetCap ?? newCapacityInput).trim();
    const label = candidate || `Option ${formCapacityVariants.length + 1}`;
    const exists = formCapacityVariants.some(
      (c) => c.name.trim().toLowerCase() === label.toLowerCase()
    );
    if (exists && presetCap) return;
    const slug = label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || `${Date.now()}`;
    setFormCapacityVariants((prev) => [
      ...prev,
      {
        id: `var-cap-${slug}-${prev.length + 1}`,
        name: label,
        price: Number(formPrice) || 0,
        stock: Number(formStock) || 0,
        sku: formSku.trim() ? `${formSku.trim()}-${slug.toUpperCase()}` : '',
      },
    ]);
    if (!presetCap) setNewCapacityInput('');
  };

  const handleUpdateCapacity = (index: number, patch: Partial<CapacityVariantConfig>) => {
    setFormCapacityVariants((prev) =>
      prev.map((row, idx) => (idx === index ? { ...row, ...patch } : row))
    );
  };

  const handleRemoveCapacity = (index: number) => {
    const removed = formCapacityVariants[index];
    setFormCapacityVariants((prev) => prev.filter((_, idx) => idx !== index));
    if (removed) {
      setFormColorVariants((prev) =>
        prev.map((cRow) => ({
          ...cRow,
          availableCapacities: cRow.availableCapacities?.filter((id) => id !== removed.id),
        }))
      );
    }
  };

  const handleColorFileUpload = async (
    index: number,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    const validation = validateImageFile(file);
    if (!validation.valid) {
      setColorUploadError(validation.error || 'Invalid image file.');
      return;
    }

    setColorUploadError(null);
    try {
      const compactDataUrl = await optimizeUploadedImage(file, {
        maxDimension: 1200,
        maxDataUrlLength: 140_000,
        initialQuality: 0.85,
        preserveOriginal: false,
      });
      handleUpdateColorVariant(index, { image: compactDataUrl });
    } catch {
      setColorUploadError('Could not process color image file. Try a smaller PNG/JPEG.');
    }
  };

  const handleRemoveColor = (index: number) => {
    setFormColorVariants((prev) => prev.filter((_, idx) => idx !== index));
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

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSavingRef.current || isSaving) {
      return;
    }

    if (
      !requirePermission(['full_stock', 'manage_products'], {
        actionEn: editingProduct
          ? `Save changes to "${editingProduct.name}"`
          : 'Create new product',
        actionAr: editingProduct
          ? `حفظ تعديلات "${editingProduct.nameAr || editingProduct.name}"`
          : 'إنشاء منتج جديد',
      })
    ) {
      return;
    }

    setModalError(null);

    const extractedStructuredData = extractStructuredProductVariantsAndColors(
      formColorVariants,
      formCapacityVariants,
      {
        price: formPrice,
        sku: formSku.trim(),
        stock: formStock,
      }
    );

    const built = buildAdminProductRecord(
      {
        name: formName,
        nameAr: formNameAr,
        brand: formBrand,
        category: formCategory,
        subcategory: formSubcategory,
        sku: formSku,
        barcode: formBarcode,
        originalPrice: formOriginalPrice,
        price: formPrice,
        stock: formStock,
        lowStockThreshold: formLowStockThreshold,
        warrantyMonths: formWarrantyMonths,
        images: formImages,
        videoUrl: formVideoUrl,
        description: formDesc,
        descriptionAr: formDescAr,
        specifications: formSpecs,
        colors: extractedStructuredData.colors,
        colorImages: extractedStructuredData.colorImages,
        variants: extractedStructuredData.variants,
        isSpecialOffer: formIsOffer,
        isFeatured: formIsFeatured,
        isNewArrival: formIsNewArrival,
        isBestSeller: formIsBestSeller,
        isPublished: formIsPublished,
      },
      { existingProduct: editingProduct }
    );

    if (!built.ok) {
      const errorMsg = built.errors.join(' ');
      setModalError(errorMsg);
      setFeedback({ type: 'error', msg: errorMsg });
      return;
    }

    const savedProduct = built.product;
    const previousStock = editingProduct ? editingProduct.stock : savedProduct.stock;

    isSavingRef.current = true;
    setIsSaving(true);
    try {
      const result = await saveProductAsync(savedProduct);
      refreshData();

      if (!result.ok) {
        const errMsg =
          result.errorMessage ||
          'Unable to persist product to database. Please check permissions and retry.';
        console.error('Admin product save failed:', errMsg);
        setModalError(errMsg);
        setFeedback({ type: 'error', msg: errMsg });
        return;
      }

      if (editingProduct) {
        const removedMediaUrls = collectRemovedMediaUrls(editingProduct, savedProduct);
        if (removedMediaUrls.length > 0) {
          cleanupRemovedProductMedia(removedMediaUrls).catch(() => {});
        }
      }

      setIsModalOpen(false);
      setModalError(null);
      setPhotoActionNotice(null);
      setFeedback({
        type: 'success',
        msg:
          lang === 'ar'
            ? `تم حفظ المنتج "${savedProduct.name}" وتحديث المتجر بنجاح.`
            : `Product "${savedProduct.name}" saved and live in catalog.`,
      });

      if (editingProduct) {
        maybeTriggerRestockNotifications(previousStock, savedProduct)
          .then((dispatchResult) => {
            if (dispatchResult && dispatchResult.dispatchedCount > 0) {
              setFeedback({
                type: 'success',
                msg: `Product "${savedProduct.name}" restocked — Automated alert sent to ${dispatchResult.dispatchedCount} waiting subscriber(s)!`,
              });
            }
          })
          .catch(() => {
            // Non-critical
          });
      }

      setTimeout(() => setFeedback(null), 5000);
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'Unexpected error saving product.';
      console.error('Admin product save exception:', err);
      setModalError(errMsg);
      setFeedback({ type: 'error', msg: errMsg });
    } finally {
      isSavingRef.current = false;
      setIsSaving(false);
    }
  };

  const [pendingDelete, setPendingDelete] = useState<{ id: string; name: string } | null>(null);

  const handleDelete = (id: string, name: string) => {
    if (
      !requirePermission('full_stock', {
        actionEn: `Delete product "${name}" from catalog & inventory`,
        actionAr: `حذف المنتج "${name}" من الكتالوج والمخزون`,
        requiredRoles: ['super_admin'],
      })
    ) {
      return;
    }
    setPendingDelete({ id, name });
  };

  const confirmDeleteProduct = async () => {
    if (!pendingDelete) return;
    if (
      !requirePermission('full_stock', {
        actionEn: `Delete product "${pendingDelete.name}" from catalog & inventory`,
        actionAr: `حذف المنتج "${pendingDelete.name}" من الكتالوج والمخزون`,
        requiredRoles: ['super_admin'],
      })
    ) {
      setPendingDelete(null);
      return;
    }
    const target = pendingDelete;
    setPendingDelete(null);
    const result = await deleteProductAsync(target.id);
    refreshData();
    if (!result.ok) {
      setFeedback({
        type: 'error',
        msg: result.errorMessage || `Failed to delete "${target.name}".`,
      });
    } else {
      setFeedback({
        type: 'success',
        msg: `Product "${target.name}" deleted and removed from live database.`,
      });
    }
    setTimeout(() => setFeedback(null), 4000);
  };

  const q = search.toLowerCase();
  const filteredProducts = (products || []).filter((p) => {
    const matchCategory = selectedCategory === 'all' || p.category === selectedCategory;
    const pBrand = (p.brand || '').toLowerCase();
    const matchBrand = selectedBrand === 'all' || pBrand === selectedBrand.toLowerCase();
    const matchSearch =
      (p.name || '').toLowerCase().includes(q) ||
      (p.sku || '').toLowerCase().includes(q) ||
      pBrand.includes(q);
    return matchCategory && matchBrand && matchSearch;
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
          data-testid="admin-add-product-btn"
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
          <option value="all">{lang === 'ar' ? 'كافة الأقسام' : 'All Categories'}</option>
          {categories.map((c) => (
            <option key={c.id} value={c.name}>
              {c.name}
            </option>
          ))}
        </select>

        <select
          value={selectedBrand}
          onChange={(e) => setSelectedBrand(e.target.value)}
          className="bg-white border border-[#DCE5F0] text-[#172033] text-xs rounded-xl px-3 py-2.5 focus:outline-none focus:border-[#007AFF] cursor-pointer shadow-xs font-medium"
        >
          <option value="all">{lang === 'ar' ? 'كافة الماركات' : 'All Brands'}</option>
          {allSelectableBrandNames.map((brandName) => (
            <option key={brandName} value={brandName}>
              {brandName}
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
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 px-4 text-center text-xs text-[#64748B]">
                    {lang === 'ar'
                      ? 'لا توجد منتجات مطابقة للبحث أو التصنيف المحدد.'
                      : 'No products match the current search or category filter.'}
                  </td>
                </tr>
              ) : filteredProducts.map((p) => (
                <tr key={p.id} className="hover:bg-[#F5F8FC] transition-colors">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      {p.images?.[0] ? (
                        <LazyImage
                          src={p.images[0]}
                          alt={p.name || 'Product'}
                          width={40}
                          height={40}
                          responsiveSizes="40px"
                          priority={false}
                          loading="lazy"
                          wrapperClassName="w-10 h-10 rounded-lg overflow-hidden bg-[#F5F8FC] border border-[#DCE5F0] flex-shrink-0"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div
                          data-testid={`admin-product-no-photo-${p.id}`}
                          className="w-10 h-10 rounded-lg bg-[#F5F8FC] border border-dashed border-[#CBD5E1] text-[#94A3B8] flex items-center justify-center flex-shrink-0"
                          title={lang === 'ar' ? 'بدون صورة' : 'No photos attached'}
                        >
                          <ImageOff className="w-4 h-4" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="font-bold text-[#172033] line-clamp-1">{p.name}</div>
                        <div className="text-[10px] text-[#64748B] font-mono flex items-center gap-2">
                          <span>SKU: {p.sku}</span>
                          {(!p.images || p.images.length === 0) && (
                            <span className="text-amber-600 font-sans font-semibold">
                              • {lang === 'ar' ? 'بدون صور' : 'No photos'}
                            </span>
                          )}
                        </div>
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
                        onClick={() => onShareProduct && onShareProduct(p.id)}
                        className="p-1.5 rounded-lg bg-[#EAF3FF] hover:bg-[#007AFF] hover:text-white border border-[#BAE6FD] text-[#007AFF] transition-colors cursor-pointer"
                        title={lang === 'ar' ? 'تسويق ونشر عبر السوشال ميديا' : 'Share & Market on Social Media'}
                        aria-label={`Share ${p.name} on social media`}
                      >
                        <Share2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => openEditModal(p)}
                        className="p-1.5 rounded-lg bg-[#F5F8FC] hover:bg-[#EAF3FF] border border-[#DCE5F0] text-[#007AFF] transition-colors cursor-pointer"
                        title="Edit"
                        aria-label={`Edit ${p.name}`}
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(p.id, p.name)}
                        className="p-1.5 rounded-lg bg-[#F5F8FC] hover:bg-red-50 border border-[#DCE5F0] text-[#DC2626] transition-colors cursor-pointer"
                        title="Delete"
                        aria-label={`Delete ${p.name}`}
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
          <div
            ref={modalScrollRef}
            className="relative w-full max-w-3xl bg-white border border-[#DCE5F0] rounded-3xl p-6 sm:p-8 space-y-6 my-8 max-h-[90vh] overflow-y-auto shadow-2xl"
          >
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
                type="button"
                disabled={isSaving}
                onClick={() => {
                  setIsModalOpen(false);
                  setModalError(null);
                }}
                aria-label={lang === 'ar' ? 'إغلاق النافذة' : 'Close product modal'}
                className="p-1.5 rounded-lg text-[#64748B] hover:text-[#172033] hover:bg-[#F5F8FC] cursor-pointer disabled:opacity-50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} noValidate className="space-y-5">
              {modalError && (
                <div
                  ref={modalErrorRef}
                  role="alert"
                  data-testid="admin-product-modal-error"
                  className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-[#DC2626] text-xs font-semibold flex items-start gap-2.5"
                >
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span className="flex-1">{modalError}</span>
                </div>
              )}

              {/* Names */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-[#172033] font-semibold block mb-1">
                    Product Name (English) *
                  </label>
                  <input
                    type="text"
                    data-testid="admin-product-name-input"
                    value={formName}
                    onChange={(e) => {
                      setFormName(e.target.value);
                      if (modalError) setModalError(null);
                    }}
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
                    {allSelectableBrandNames.map((brandName) => (
                      <option key={brandName} value={brandName}>
                        {brandName}
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
                    min="0"
                    value={formOriginalPrice}
                    onChange={(e) => {
                      const n = e.target.value === '' ? 0 : Number(e.target.value);
                      setFormOriginalPrice(Number.isFinite(n) ? n : 0);
                    }}
                    className="w-full bg-[#FFFFFF] border border-[#DCE5F0] rounded-xl px-3 py-2 text-xs text-[#172033] focus:outline-none focus:border-[#007AFF] font-mono"
                  />
                </div>

                <div>
                  <label className="text-xs text-[#172033] font-semibold block mb-1">Selling Price ($) *</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={formPrice}
                    onChange={(e) => {
                      const n = e.target.value === '' ? 0 : Number(e.target.value);
                      setFormPrice(Number.isFinite(n) ? n : 0);
                    }}
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
                    onChange={(e) => {
                      const n = e.target.value === '' ? 0 : Number(e.target.value);
                      setFormStock(Number.isFinite(n) ? Math.max(0, Math.round(n)) : 0);
                    }}
                    className="w-full bg-[#FFFFFF] border border-[#DCE5F0] rounded-xl px-3 py-2 text-xs text-[#172033] focus:outline-none focus:border-[#007AFF] font-mono"
                  />
                </div>

                <div>
                  <label className="text-xs text-[#172033] font-semibold block mb-1">Low Stock Alert</label>
                  <input
                    type="number"
                    min="1"
                    value={formLowStockThreshold}
                    onChange={(e) => {
                      const n = e.target.value === '' ? 1 : Number(e.target.value);
                      setFormLowStockThreshold(Number.isFinite(n) ? Math.max(1, Math.round(n)) : 1);
                    }}
                    className="w-full bg-[#FFFFFF] border border-[#DCE5F0] rounded-xl px-3 py-2 text-xs text-[#172033] focus:outline-none focus:border-[#007AFF] font-mono"
                  />
                </div>
              </div>

              {/* SKU, Barcode & Warranty */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs text-[#172033] font-semibold block mb-1">
                    SKU *
                  </label>
                  <input
                    type="text"
                    data-testid="admin-product-sku-input"
                    placeholder="e.g. OAA-IP17P"
                    value={formSku}
                    onChange={(e) => {
                      setFormSku(e.target.value);
                      if (modalError) setModalError(null);
                    }}
                    className="w-full bg-[#FFFFFF] border border-[#DCE5F0] rounded-xl px-3 py-2 text-xs text-[#172033] focus:outline-none focus:border-[#007AFF] font-mono"
                  />
                </div>

                <div>
                  <label className="text-xs text-[#172033] font-semibold block mb-1">
                    Barcode (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="Auto-filled from SKU"
                    value={formBarcode}
                    onChange={(e) => setFormBarcode(e.target.value)}
                    className="w-full bg-[#FFFFFF] border border-[#DCE5F0] rounded-xl px-3 py-2 text-xs text-[#172033] focus:outline-none focus:border-[#007AFF] font-mono"
                  />
                </div>

                <div>
                  <label className="text-xs text-[#172033] font-semibold block mb-1">
                    Warranty (Months)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="120"
                    value={formWarrantyMonths}
                    onChange={(e) => {
                      const n = e.target.value === '' ? 0 : Number(e.target.value);
                      setFormWarrantyMonths(Number.isFinite(n) ? Math.max(0, Math.min(120, Math.round(n))) : 12);
                    }}
                    className="w-full bg-[#FFFFFF] border border-[#DCE5F0] rounded-xl px-3 py-2 text-xs text-[#172033] focus:outline-none focus:border-[#007AFF] font-mono"
                  />
                </div>
              </div>

              {/* Descriptions */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-[#172033] font-semibold block mb-1">
                    Product Description (English)
                  </label>
                  <textarea
                    rows={2}
                    data-testid="admin-product-desc-input"
                    placeholder="Key highlights, warranty, and box contents..."
                    value={formDesc}
                    onChange={(e) => setFormDesc(e.target.value)}
                    className="w-full bg-[#FFFFFF] border border-[#DCE5F0] rounded-xl px-3 py-2 text-xs text-[#172033] focus:outline-none focus:border-[#007AFF]"
                  />
                </div>
                <div>
                  <label className="text-xs text-[#172033] font-semibold block mb-1">
                    وصف المنتج (بالعربية)
                  </label>
                  <textarea
                    rows={2}
                    placeholder="أبرز المواصفات والكفالة..."
                    value={formDescAr}
                    onChange={(e) => setFormDescAr(e.target.value)}
                    className="w-full bg-[#FFFFFF] border border-[#DCE5F0] rounded-xl px-3 py-2 text-xs text-[#172033] focus:outline-none focus:border-[#007AFF]"
                  />
                </div>
              </div>

              {/* Multi-Image Manager */}
              <div
                data-testid="admin-product-images-section"
                className="p-4 rounded-2xl bg-[#F5F8FC] border border-[#DCE5F0] space-y-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <span
                      data-testid="admin-product-images-count"
                      className="text-xs font-bold text-[#172033] block"
                    >
                      {lang === 'ar'
                        ? `صور المنتج (${formImages.length} مرفقة)`
                        : `Product Images (${formImages.length} attached)`}
                    </span>
                    <span className="text-[10px] text-[#64748B] font-medium">
                      {lang === 'ar'
                        ? 'احذف أو أعد ترتيب الصور — الصورة الأولى هي الصورة الرئيسية في المتجر'
                        : 'Delete, promote, or reorder photos — Photo #1 is the primary storefront thumbnail'}
                    </span>
                  </div>
                  {formImages.length > 0 && (
                    <button
                      type="button"
                      data-testid="admin-clear-all-images"
                      onClick={handleClearAllImages}
                      className="px-2.5 py-1 rounded-lg bg-red-50 hover:bg-[#DC2626] text-[#DC2626] hover:text-white border border-red-200 text-[11px] font-bold inline-flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>{lang === 'ar' ? 'حذف الكل' : 'Remove All'}</span>
                    </button>
                  )}
                </div>

                {photoActionNotice && (
                  <div
                    role="status"
                    data-testid="admin-photo-action-notice"
                    className="px-3 py-2 rounded-xl bg-[#EAF3FF] border border-[#BAE6FD] text-[#0369A1] text-[11px] font-semibold"
                  >
                    {photoActionNotice}
                  </div>
                )}

                {formImages.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 rounded-xl bg-white border border-[#DCE5F0]">
                    {formImages.map((img, idx) => (
                      <div
                        key={`${idx}-${img.slice(0, 48)}`}
                        data-testid={`admin-image-card-${idx}`}
                        className={`relative rounded-xl overflow-hidden border bg-[#F8FAFC] flex flex-col ${
                          idx === 0 ? 'border-[#007AFF] ring-1 ring-[#007AFF]/20' : 'border-[#DCE5F0]'
                        }`}
                      >
                        <div className="relative aspect-square w-full bg-white overflow-hidden">
                          <LazyImage
                            src={img}
                            alt={`Product photo ${idx + 1}`}
                            width={140}
                            height={140}
                            responsiveSizes="140px"
                            priority={true}
                            loading="lazy"
                            wrapperClassName="w-full h-full flex items-center justify-center"
                            className="w-full h-full object-contain p-1"
                          />

                          {/* Primary / Index Badge */}
                          <span
                            data-testid={idx === 0 ? 'admin-primary-image-badge' : `admin-image-index-badge-${idx}`}
                            className={`absolute top-1.5 left-1.5 z-20 px-1.5 py-0.5 rounded-md text-[10px] font-bold shadow-2xs ${
                              idx === 0
                                ? 'bg-[#007AFF] text-white'
                                : 'bg-[#0F172A]/75 text-white'
                            }`}
                          >
                            {idx === 0 ? (lang === 'ar' ? 'رئيسية' : 'Primary') : `#${idx + 1}`}
                          </span>

                          {/* Always-Visible Delete Button */}
                          <button
                            type="button"
                            data-testid={`admin-remove-image-${idx}`}
                            onClick={() => handleRemoveImage(idx)}
                            aria-label={`Remove photo ${idx + 1}${idx === 0 ? ' (Primary)' : ''}`}
                            title={lang === 'ar' ? 'حذف هذه الصورة' : 'Remove this photo'}
                            className="absolute top-1.5 right-1.5 z-20 w-7 h-7 rounded-lg bg-red-600 hover:bg-red-700 text-white flex items-center justify-center shadow-sm cursor-pointer transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Reorder / Promote Toolbar */}
                        {formImages.length > 1 && (
                          <div className="flex items-center justify-between gap-1 px-1.5 py-1 border-t border-[#E2E8F0] bg-[#F8FAFC]">
                            <div className="flex items-center gap-0.5">
                              <button
                                type="button"
                                disabled={idx === 0}
                                data-testid={`admin-move-image-left-${idx}`}
                                onClick={() => handleMoveImage(idx, idx - 1)}
                                aria-label={`Move photo ${idx + 1} earlier`}
                                title="Move left"
                                className="p-1 rounded bg-white border border-[#DCE5F0] text-[#475569] hover:text-[#007AFF] disabled:opacity-35 disabled:cursor-not-allowed cursor-pointer"
                              >
                                <ChevronLeft className="w-3 h-3" />
                              </button>
                              <button
                                type="button"
                                disabled={idx === formImages.length - 1}
                                data-testid={`admin-move-image-right-${idx}`}
                                onClick={() => handleMoveImage(idx, idx + 1)}
                                aria-label={`Move photo ${idx + 1} later`}
                                title="Move right"
                                className="p-1 rounded bg-white border border-[#DCE5F0] text-[#475569] hover:text-[#007AFF] disabled:opacity-35 disabled:cursor-not-allowed cursor-pointer"
                              >
                                <ChevronRight className="w-3 h-3" />
                              </button>
                            </div>

                            {idx > 0 ? (
                              <button
                                type="button"
                                data-testid={`admin-set-primary-image-${idx}`}
                                onClick={() => handleSetPrimaryImage(idx)}
                                aria-label={`Make photo ${idx + 1} primary`}
                                title="Make Primary"
                                className="px-1.5 py-0.5 rounded bg-white hover:bg-[#EAF3FF] border border-[#DCE5F0] hover:border-[#007AFF] text-[10px] font-bold text-[#007AFF] inline-flex items-center gap-0.5 cursor-pointer"
                              >
                                <Star className="w-2.5 h-2.5" />
                                <span>{lang === 'ar' ? 'رئيسية' : 'Primary'}</span>
                              </button>
                            ) : (
                              <span className="text-[10px] font-bold text-[#16A34A] px-1">
                                {lang === 'ar' ? 'الأساسية' : 'Main'}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div
                    data-testid="admin-empty-images-state"
                    className="p-4 rounded-xl bg-white border border-dashed border-[#CBD5E1] text-center space-y-1"
                  >
                    <ImageOff className="w-6 h-6 text-[#94A3B8] mx-auto" />
                    <p className="text-xs font-semibold text-[#475569]">
                      {lang === 'ar'
                        ? 'لا توجد صور مرفقة حالياً بهذا المنتج.'
                        : 'No photos attached to this product.'}
                    </p>
                    <p className="text-[11px] text-[#64748B]">
                      {lang === 'ar'
                        ? 'يمكنك حفظ المنتج بدون صور أو رفع صورة / إضافة رابط أدناه.'
                        : 'Save now to store without photos, or upload / add a photo URL below.'}
                    </p>
                  </div>
                )}

                {/* Product Image Uploader Component */}
                <ProductImageUploader
                  title={lang === 'ar' ? 'رفع صورة منتج (Base64)' : 'Upload Product Image (Base64)'}
                  resetAfterUpload={true}
                  onImageConverted={(base64) => {
                    setFormImages((prev) => [...prev, base64]);
                    setPhotoActionNotice(null);
                  }}
                />

                {/* Add by URL input */}
                <div className="flex gap-2 pt-1">
                  <input
                    type="url"
                    data-testid="admin-add-image-url-input"
                    placeholder="Or enter image URL (https://...)"
                    value={newImageUrl}
                    onChange={(e) => setNewImageUrl(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddImageUrl();
                      }
                    }}
                    className="flex-1 bg-white border border-[#DCE5F0] rounded-xl px-3 py-1.5 text-xs text-[#172033] focus:outline-none focus:border-[#007AFF]"
                  />
                  <button
                    type="button"
                    data-testid="admin-add-image-url-btn"
                    onClick={handleAddImageUrl}
                    className="px-3 py-1.5 bg-white border border-[#DCE5F0] hover:bg-[#EAF3FF] text-[#172033] hover:text-[#007AFF] text-xs font-semibold rounded-xl cursor-pointer transition-colors"
                  >
                    Add URL
                  </button>
                </div>
              </div>

              {/* Capacity & Pricing (RAM / ROM) */}
              <div
                className="p-4 rounded-2xl bg-[#F5F8FC] border border-[#DCE5F0] space-y-3.5"
                data-testid="admin-capacity-pricing-section"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <HardDrive className="w-4 h-4 text-[#007AFF]" />
                    <span className="text-xs font-bold text-[#172033]">
                      {lang === 'ar'
                        ? `السعة والأسعار (RAM / ROM) (${formCapacityVariants.length})`
                        : `Capacity & Pricing (RAM / ROM) (${formCapacityVariants.length})`}
                    </span>
                  </div>
                  <span className="text-[10px] text-[#64748B] font-medium">
                    {lang === 'ar'
                      ? 'خيارات التخزين والذاكرة مع السعر والمخزون لكل فئة'
                      : 'Configure storage/RAM tiers with tier-specific pricing & SKU'}
                  </span>
                </div>

                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-1.5">
                    {['128GB', '256GB', '512GB', '1TB', '8GB / 256GB'].map((capPreset) => {
                      const alreadyAdded = formCapacityVariants.some(
                        (c) => c.name.trim().toLowerCase() === capPreset.toLowerCase()
                      );
                      return (
                        <button
                          key={capPreset}
                          type="button"
                          onClick={() => handleAddCapacity(capPreset)}
                          disabled={alreadyAdded}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-colors cursor-pointer ${
                            alreadyAdded
                              ? 'bg-[#EAF3FF] border-[#007AFF]/40 text-[#007AFF] opacity-60 cursor-default'
                              : 'bg-white border-[#DCE5F0] text-[#475569] hover:border-[#007AFF] hover:text-[#007AFF]'
                          }`}
                        >
                          + {capPreset}
                        </button>
                      );
                    })}
                  </div>

                  <div className="flex gap-2">
                    <input
                      type="text"
                      data-testid="admin-new-capacity-input"
                      placeholder={
                        lang === 'ar'
                          ? 'مثال: 128GB أو 8GB / 256GB'
                          : 'Add capacity tier (e.g. 128GB, 256GB, 12GB / 512GB)'
                      }
                      value={newCapacityInput}
                      onChange={(e) => setNewCapacityInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddCapacity();
                        }
                      }}
                      className="flex-1 bg-white border border-[#DCE5F0] rounded-xl px-3 py-1.5 text-xs text-[#172033] focus:outline-none focus:border-[#007AFF]"
                    />
                    <button
                      type="button"
                      data-testid="admin-add-capacity-btn"
                      onClick={() => handleAddCapacity()}
                      className="px-3.5 py-1.5 bg-[#007AFF] hover:bg-[#0066D6] text-white text-xs font-bold rounded-xl cursor-pointer transition-colors flex items-center gap-1.5"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>{lang === 'ar' ? 'إضافة سعة' : '+ Add Capacity'}</span>
                    </button>
                  </div>
                </div>

                {formCapacityVariants.length > 0 ? (
                  <div className="space-y-2 max-h-56 overflow-y-auto pr-0.5">
                    {formCapacityVariants.map((cap, idx) => (
                      <div
                        key={cap.id}
                        data-testid={`admin-capacity-row-${idx}`}
                        className="p-2.5 rounded-xl bg-white border border-[#DCE5F0] grid grid-cols-12 gap-2 items-center"
                      >
                        <div className="col-span-12 sm:col-span-4">
                          <label className="text-[10px] text-[#64748B] font-semibold block mb-0.5">
                            {lang === 'ar' ? 'السعة (RAM / ROM)' : 'Capacity Label'}
                          </label>
                          <input
                            type="text"
                            data-testid={`admin-capacity-name-${idx}`}
                            value={cap.name}
                            onChange={(e) => handleUpdateCapacity(idx, { name: e.target.value })}
                            placeholder="e.g. 256GB"
                            className="w-full bg-[#F8FAFC] border border-[#DCE5F0] rounded-lg px-2.5 py-1.5 text-xs font-bold text-[#172033] focus:outline-none focus:border-[#007AFF]"
                          />
                        </div>

                        <div className="col-span-4 sm:col-span-3">
                          <label className="text-[10px] text-[#64748B] font-semibold block mb-0.5">
                            {lang === 'ar' ? 'السعر ($)' : 'Price ($)'}
                          </label>
                          <input
                            type="number"
                            min="0"
                            step="any"
                            data-testid={`admin-capacity-price-${idx}`}
                            value={cap.price}
                            onChange={(e) => {
                              const n = e.target.value === '' ? 0 : Number(e.target.value);
                              handleUpdateCapacity(idx, {
                                price: Number.isFinite(n) ? Math.max(0, n) : 0,
                              });
                            }}
                            className="w-full bg-[#F8FAFC] border border-[#DCE5F0] rounded-lg px-2 py-1.5 text-xs font-mono font-bold text-[#007AFF] focus:outline-none focus:border-[#007AFF]"
                          />
                        </div>

                        <div className="col-span-4 sm:col-span-2">
                          <label className="text-[10px] text-[#64748B] font-semibold block mb-0.5">
                            {lang === 'ar' ? 'المخزون' : 'Stock'}
                          </label>
                          <input
                            type="number"
                            min="0"
                            data-testid={`admin-capacity-stock-${idx}`}
                            value={cap.stock}
                            onChange={(e) => {
                              const n = e.target.value === '' ? 0 : Number(e.target.value);
                              handleUpdateCapacity(idx, {
                                stock: Number.isFinite(n) ? Math.max(0, Math.round(n)) : 0,
                              });
                            }}
                            className="w-full bg-[#F8FAFC] border border-[#DCE5F0] rounded-lg px-2 py-1.5 text-xs font-mono text-[#172033] focus:outline-none focus:border-[#007AFF]"
                          />
                        </div>

                        <div className="col-span-3 sm:col-span-2">
                          <label className="text-[10px] text-[#64748B] font-semibold block mb-0.5">
                            SKU
                          </label>
                          <input
                            type="text"
                            data-testid={`admin-capacity-sku-${idx}`}
                            value={cap.sku}
                            onChange={(e) => handleUpdateCapacity(idx, { sku: e.target.value })}
                            placeholder={formSku || 'SKU'}
                            className="w-full bg-[#F8FAFC] border border-[#DCE5F0] rounded-lg px-2 py-1.5 text-[11px] font-mono text-[#172033] focus:outline-none focus:border-[#007AFF]"
                          />
                        </div>

                        <div className="col-span-1 flex justify-end pt-3.5">
                          <button
                            type="button"
                            onClick={() => handleRemoveCapacity(idx)}
                            data-testid={`admin-remove-capacity-${idx}`}
                            className="p-1.5 rounded-lg bg-[#F5F8FC] hover:bg-red-50 border border-[#DCE5F0] text-[#64748B] hover:text-[#DC2626] cursor-pointer"
                            title="Remove capacity tier"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[11px] text-[#64748B] text-center py-1.5">
                    {lang === 'ar'
                      ? 'لا توجد فئات سعة مضافة (يستخدم السعر الأساسي للمنتج).'
                      : 'No separate RAM/ROM tiers configured yet (product uses its base price).'}
                  </p>
                )}
              </div>

              {/* Color Variants & Dedicated Per-Color Images */}
              <div
                className="p-4 rounded-2xl bg-[#F5F8FC] border border-[#DCE5F0] space-y-3.5"
                data-testid="admin-color-variants-section"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Palette className="w-4 h-4 text-[#007AFF]" />
                    <span className="text-xs font-bold text-[#172033]">
                      {lang === 'ar'
                        ? `متغيرات الألوان وصور كل لون (${formColorVariants.length})`
                        : `Color Variants (${formColorVariants.length})`}
                    </span>
                  </div>
                  <span className="text-[10px] text-[#64748B] font-medium">
                    {lang === 'ar'
                      ? 'أضف اسم اللون وصورته المخصصة وتعديل السعر الاختياري'
                      : 'Assign color name, swatch color, dedicated image & optional price adjustment'}
                  </span>
                </div>

                {/* Quick Presets + Custom Color Input + "+ Add Color" Button */}
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-1.5">
                    {['Desert Titanium', 'Natural Titanium', 'White Titanium', 'Black Titanium'].map(
                      (preset) => {
                        const alreadyAdded = formColorVariants.some(
                          (row) => row.color.trim().toLowerCase() === preset.toLowerCase()
                        );
                        return (
                          <button
                            key={preset}
                            type="button"
                            onClick={() => handleAddColor(preset)}
                            disabled={alreadyAdded}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-colors cursor-pointer ${
                              alreadyAdded
                                ? 'bg-[#EAF3FF] border-[#007AFF]/40 text-[#007AFF] opacity-60 cursor-default'
                                : 'bg-white border-[#DCE5F0] text-[#475569] hover:border-[#007AFF] hover:text-[#007AFF]'
                            }`}
                          >
                            + {preset}
                          </button>
                        );
                      }
                    )}
                  </div>

                  <div className="flex gap-2">
                    <input
                      type="text"
                      data-testid="admin-new-color-input"
                      placeholder={
                        lang === 'ar'
                          ? 'اسم اللون (مثال: White Titanium, Black, Midnight)'
                          : 'Color name (e.g. Desert Titanium, Burgundy, Black)'
                      }
                      value={newColorInput}
                      onChange={(e) => setNewColorInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddColor();
                        }
                      }}
                      className="flex-1 bg-white border border-[#DCE5F0] rounded-xl px-3 py-1.5 text-xs text-[#172033] focus:outline-none focus:border-[#007AFF]"
                    />
                    <button
                      type="button"
                      data-testid="admin-add-color-btn"
                      onClick={() => handleAddColor()}
                      className="px-3.5 py-1.5 bg-[#007AFF] hover:bg-[#0066D6] text-white text-xs font-bold rounded-xl cursor-pointer transition-colors flex items-center gap-1.5"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>{lang === 'ar' ? '+ إضافة لون' : '+ Add Color'}</span>
                    </button>
                  </div>
                </div>

                {colorUploadError && (
                  <div className="p-2.5 rounded-xl bg-red-50 border border-red-200 text-[#DC2626] text-[11px] font-semibold">
                    {colorUploadError}
                  </div>
                )}

                {formColorVariants.length > 0 ? (
                  <div className="space-y-2.5 max-h-96 overflow-y-auto pr-0.5">
                    {formColorVariants.map((row, idx) => {
                      const previewSrc =
                        row.image || formImages[0] || DEFAULT_FULL_RES_FALLBACK_IMAGE;
                      const hasCustomImg = Boolean(row.image && row.image.trim());
                      const priceAdjValue =
                        typeof row.priceAdjustment === 'number' && Number.isFinite(row.priceAdjustment)
                          ? row.priceAdjustment
                          : 0;

                      return (
                        <div
                          key={`${row.id || 'color'}-${idx}`}
                          data-testid={`admin-color-row-${idx}`}
                          className="p-3 rounded-xl bg-white border border-[#DCE5F0] space-y-2.5 shadow-2xs"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                            {/* Square Thumbnail Preview */}
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <div className="w-12 h-12 rounded-xl border border-[#DCE5F0] bg-[#F8FAFC] overflow-hidden flex items-center justify-center p-1">
                                <LazyImage
                                  src={previewSrc}
                                  alt={row.color || `Color ${idx + 1}`}
                                  width={48}
                                  height={48}
                                  responsiveSizes="48px"
                                  priority={true}
                                  loading="lazy"
                                  wrapperClassName="w-full h-full flex items-center justify-center"
                                  className="w-full h-full object-contain"
                                />
                              </div>

                              {/* Optional Fallback Hex Swatch Picker */}
                              <div className="flex flex-col items-center gap-0.5">
                                <input
                                  type="color"
                                  aria-label={`Hex swatch for ${row.color || `color ${idx + 1}`}`}
                                  data-testid={`admin-color-hex-${idx}`}
                                  value={/^#[0-9a-fA-F]{6}$/.test(row.hex || '') ? row.hex : '#0A0F2C'}
                                  onChange={(e) =>
                                    handleUpdateColorVariant(idx, { hex: e.target.value })
                                  }
                                  className="w-7 h-7 rounded-lg border border-[#DCE5F0] cursor-pointer p-0.5 bg-white"
                                />
                                <span className="text-[9px] text-[#64748B] font-mono">HEX</span>
                              </div>
                            </div>

                            {/* Color Name & Per-Color Image URL + Upload + Delete */}
                            <div className="flex-1 grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                              <div className="sm:col-span-4">
                                <label className="text-[10px] text-[#64748B] font-semibold block mb-0.5">
                                  {lang === 'ar' ? 'اسم اللون *' : 'Color Name *'}
                                </label>
                                <input
                                  type="text"
                                  data-testid={`admin-color-label-${idx}`}
                                  value={row.color}
                                  onChange={(e) =>
                                    handleUpdateColorVariant(idx, { color: e.target.value })
                                  }
                                  placeholder="e.g. Black, Desert Titanium"
                                  className="w-full bg-[#F8FAFC] border border-[#DCE5F0] rounded-lg px-2.5 py-1.5 text-xs font-bold text-[#172033] focus:outline-none focus:border-[#007AFF]"
                                />
                              </div>

                              <div className="sm:col-span-8">
                                <label className="text-[10px] text-[#64748B] font-semibold block mb-0.5">
                                  {lang === 'ar' ? 'صورة اللون (رابط أو رفع)' : 'Color Image (URL or Upload)'}
                                </label>
                                <div className="flex items-center gap-1.5">
                                  <input
                                    type="text"
                                    data-testid={`admin-color-image-url-${idx}`}
                                    value={row.image || ''}
                                    onChange={(e) =>
                                      handleUpdateColorVariant(idx, {
                                        image: e.target.value,
                                      })
                                    }
                                    placeholder={
                                      lang === 'ar'
                                        ? 'رابط صورة مخصصة لهذا اللون'
                                        : 'https://... image URL for this color'
                                    }
                                    className="flex-1 bg-[#FFFFFF] border border-[#DCE5F0] rounded-lg px-2.5 py-1.5 text-xs text-[#172033] focus:outline-none focus:border-[#007AFF]"
                                  />

                                  <label
                                    className="px-2.5 py-1.5 rounded-lg bg-[#EAF3FF] hover:bg-[#007AFF] text-[#007AFF] hover:text-white border border-[#BAE6FD] text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors flex-shrink-0"
                                    title={lang === 'ar' ? 'رفع صورة لهذا اللون' : 'Upload image for this color'}
                                  >
                                    <ImagePlus className="w-3.5 h-3.5" />
                                    <span className="hidden md:inline">
                                      {lang === 'ar' ? 'رفع' : 'Upload'}
                                    </span>
                                    <input
                                      type="file"
                                      accept="image/png, image/jpeg, image/webp"
                                      className="hidden"
                                      onChange={(e) => handleColorFileUpload(idx, e)}
                                    />
                                  </label>

                                  {hasCustomImg && (
                                    <button
                                      type="button"
                                      onClick={() => handleUpdateColorVariant(idx, { image: '' })}
                                      className="p-1.5 rounded-lg bg-[#F5F8FC] hover:bg-slate-200 border border-[#DCE5F0] text-[#64748B] cursor-pointer"
                                      title="Clear dedicated image (revert to main image)"
                                      aria-label={`Clear dedicated image for color ${row.color || idx + 1}`}
                                    >
                                      <RotateCcw className="w-3.5 h-3.5" />
                                    </button>
                                  )}

                                  <button
                                    type="button"
                                    onClick={() => handleRemoveColor(idx)}
                                    data-testid={`admin-remove-color-${idx}`}
                                    className="p-1.5 rounded-lg bg-[#F5F8FC] hover:bg-red-50 border border-[#DCE5F0] text-[#64748B] hover:text-[#DC2626] cursor-pointer"
                                    title="Remove color variant"
                                    aria-label={`Remove color ${row.color || idx + 1}`}
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Optional Price Adjustment + Available Capacities + Legacy Per-Color Stock/SKU */}
                          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 pt-2 border-t border-[#F1F5F9] items-center">
                            <div className="sm:col-span-4 flex items-center gap-2">
                              <label
                                htmlFor={`color-price-adj-${idx}`}
                                className="text-[11px] font-semibold text-[#475569] whitespace-nowrap"
                              >
                                {lang === 'ar' ? 'تعديل السعر ($):' : 'Price Adj ($):'}
                              </label>
                              <input
                                id={`color-price-adj-${idx}`}
                                type="number"
                                step="any"
                                data-testid={`admin-color-price-adj-${idx}`}
                                value={priceAdjValue}
                                onChange={(e) => {
                                  const n = e.target.value === '' ? 0 : Number(e.target.value);
                                  handleUpdateColorVariant(idx, {
                                    priceAdjustment: Number.isFinite(n) ? n : 0,
                                  });
                                }}
                                placeholder="0"
                                className="w-24 bg-[#F8FAFC] border border-[#DCE5F0] rounded-lg px-2 py-1 text-xs font-mono font-bold text-[#172033] focus:outline-none focus:border-[#007AFF]"
                              />
                            </div>

                            {formCapacityVariants.length > 0 ? (
                              <div className="sm:col-span-8 flex flex-wrap items-center gap-1.5">
                                <span className="text-[10px] font-semibold text-[#64748B] mr-1">
                                  {lang === 'ar' ? 'السعات المتوفرة:' : 'Available Capacities:'}
                                </span>
                                {formCapacityVariants.map((cap) => {
                                  const isChecked =
                                    !row.availableCapacities ||
                                    row.availableCapacities.length === 0 ||
                                    row.availableCapacities.includes(cap.id);
                                  return (
                                    <label
                                      key={cap.id}
                                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold border cursor-pointer transition-colors ${
                                        isChecked
                                          ? 'bg-[#EAF3FF] border-[#007AFF]/40 text-[#007AFF]'
                                          : 'bg-white border-[#DCE5F0] text-[#64748B]'
                                      }`}
                                    >
                                      <input
                                        type="checkbox"
                                        checked={isChecked}
                                        onChange={() => handleToggleColorCapacity(idx, cap.id)}
                                        className="accent-[#007AFF] w-3 h-3"
                                      />
                                      <span>{cap.name || 'Tier'}</span>
                                    </label>
                                  );
                                })}
                              </div>
                            ) : (
                              <div className="sm:col-span-8 flex items-center justify-end">
                                <span
                                  className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                                    hasCustomImg
                                      ? 'bg-emerald-50 text-[#16A34A] border border-emerald-200'
                                      : 'bg-slate-100 text-[#64748B]'
                                  }`}
                                >
                                  {hasCustomImg ? 'Dedicated Image' : 'Uses Main Image Fallback'}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-[11px] text-[#64748B] text-center py-2">
                    {lang === 'ar'
                      ? 'لا توجد ألوان مضافة. أضف لوناً لربطه بصورة مخصصة.'
                      : 'No color variants configured yet. Click "+ Add Color" above to assign color options and images.'}
                  </p>
                )}
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
                        aria-label={`Remove specification ${sp.label}`}
                        className="text-[#64748B] hover:text-[#DC2626] cursor-pointer"
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
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs pt-2">
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
                    checked={formIsBestSeller}
                    onChange={(e) => setFormIsBestSeller(e.target.checked)}
                    className="rounded accent-[#007AFF] w-4 h-4"
                  />
                  <span>Bestseller 👑</span>
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
                  disabled={isSaving}
                  onClick={() => {
                    setIsModalOpen(false);
                    setModalError(null);
                  }}
                  className="px-5 py-2.5 rounded-xl bg-[#F5F8FC] border border-[#DCE5F0] text-[#172033] text-xs font-semibold hover:bg-slate-200 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  data-testid="admin-save-product-btn"
                  className="px-6 py-2.5 rounded-xl bg-[#007AFF] hover:bg-[#0066D6] text-white text-xs font-black shadow-xs cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed inline-flex items-center gap-2"
                >
                  {isSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>
                    {isSaving
                      ? lang === 'ar'
                        ? 'جارٍ الحفظ...'
                        : 'Saving...'
                      : 'Save Product'}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={Boolean(pendingDelete)}
        lang={lang}
        title={lang === 'ar' ? 'حذف المنتج' : 'Delete Product'}
        message={
          pendingDelete
            ? lang === 'ar'
              ? `هل أنت متأكد من حذف المنتج "${pendingDelete.name}" من قاعدة البيانات؟`
              : `Are you sure you want to delete "${pendingDelete.name}" from the live catalog?`
            : ''
        }
        confirmLabel={lang === 'ar' ? 'حذف المنتج' : 'Delete Product'}
        onConfirm={confirmDeleteProduct}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
};
