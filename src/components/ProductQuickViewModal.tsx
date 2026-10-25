import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useShop } from '../context/ShopContext';
import { Product, ProductVariant } from '../types';
import {
  X,
  Star,
  Shield,
  ShoppingCart,
  Zap,
  CheckCircle2,
  AlertTriangle,
  Truck,
  MapPin,
  MessageSquare,
  ExternalLink,
  RotateCcw,
  Orbit,
  ZoomIn,
  Award,
  BatteryCharging,
  Cpu,
  Layers,
  Clock,
  Sparkles,
  Share2,
  Check,
} from 'lucide-react';
import { WhatsApp3DIcon, Cart3DIcon, Zap3DIcon, Orbit3DIcon } from './icons/ThreeDIcons';

export const ProductQuickViewModal: React.FC = () => {
  const {
    lang,
    t,
    quickViewProduct,
    setQuickViewProduct,
    addToCart,
    viewProductDetail,
    setCurrentView,
    storeSettings,
  } = useShop();

  const [activeTab, setActiveTab] = useState<'overview' | 'specs' | 'delivery' | 'reviews'>('overview');
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [selectedColor, setSelectedColor] = useState<string | undefined>(undefined);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | undefined>(undefined);
  const [isAddedToast, setIsAddedToast] = useState(false);

  // 3D Stage State
  const [rotateX, setRotateX] = useState(0);
  const [rotateY, setRotateY] = useState(0);
  const [glare, setGlare] = useState({ x: 50, y: 50, opacity: 0 });
  const [isAutoOrbit, setIsAutoOrbit] = useState(false);
  const [isZoomed, setIsZoomed] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const stageRef = useRef<HTMLDivElement>(null);
  const autoOrbitRef = useRef<number | null>(null);

  // Reset states when product changes
  useEffect(() => {
    if (quickViewProduct) {
      setSelectedColor(quickViewProduct.colors?.[0]);
      setSelectedVariant(quickViewProduct.variants?.[0]);
      setSelectedImageIndex(0);
      setQuantity(1);
      setActiveTab('overview');
      setRotateX(0);
      setRotateY(0);
      setIsZoomed(false);
      setIsAutoOrbit(false);
    }
  }, [quickViewProduct?.id]);

  // Handle escape key to close modal seamlessly
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setQuickViewProduct(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setQuickViewProduct]);

  // Auto-Orbit animation
  useEffect(() => {
    if (!isAutoOrbit) {
      if (autoOrbitRef.current) cancelAnimationFrame(autoOrbitRef.current);
      return;
    }

    let angle = 0;
    const animate = () => {
      angle += 0.025;
      setRotateY(Math.sin(angle) * 18);
      setRotateX(Math.cos(angle * 0.8) * 12);
      setGlare({
        x: 50 + Math.sin(angle) * 35,
        y: 50 + Math.cos(angle) * 35,
        opacity: 0.35,
      });
      autoOrbitRef.current = requestAnimationFrame(animate);
    };

    autoOrbitRef.current = requestAnimationFrame(animate);
    return () => {
      if (autoOrbitRef.current) cancelAnimationFrame(autoOrbitRef.current);
    };
  }, [isAutoOrbit]);

  if (!quickViewProduct) return null;

  const product = quickViewProduct;
  const isOutOfStock = product.stock <= 0;
  const isLowStock = product.stock > 0 && product.stock <= (product.lowStockThreshold || 3);
  const activePrice = selectedVariant ? selectedVariant.price : product.price;
  const discountAmount = product.originalPrice > activePrice ? product.originalPrice - activePrice : 0;
  const images = product.images && product.images.length > 0 ? product.images : [
    'https://images.unsplash.com/photo-1511707171634-5f897ff02597?w=800'
  ];

  // 3D Tilt handlers
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isAutoOrbit || !stageRef.current) return;
    const rect = stageRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const rY = ((x - centerX) / centerX) * 20; // -20 to +20 deg
    const rX = -((y - centerY) / centerY) * 16; // -16 to +16 deg

    setRotateX(rX);
    setRotateY(rY);
    setGlare({
      x: (x / rect.width) * 100,
      y: (y / rect.height) * 100,
      opacity: 0.45,
    });
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (isAutoOrbit || !stageRef.current || e.touches.length === 0) return;
    const touch = e.touches[0];
    const rect = stageRef.current.getBoundingClientRect();
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;

    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const rY = ((x - centerX) / centerX) * 18;
    const rX = -((y - centerY) / centerY) * 14;

    setRotateX(rX);
    setRotateY(rY);
    setGlare({
      x: (x / rect.width) * 100,
      y: (y / rect.height) * 100,
      opacity: 0.4,
    });
  };

  const handleMouseLeave = () => {
    if (isAutoOrbit) return;
    setRotateX(0);
    setRotateY(0);
    setGlare((prev) => ({ ...prev, opacity: 0 }));
  };

  const handleReset3D = () => {
    setIsAutoOrbit(false);
    setRotateX(0);
    setRotateY(0);
    setGlare({ x: 50, y: 50, opacity: 0 });
    setIsZoomed(false);
  };

  const handleAddToCart = () => {
    if (isOutOfStock) return;
    addToCart(product, quantity, selectedColor, selectedVariant);
    setIsAddedToast(true);
    setTimeout(() => setIsAddedToast(false), 2400);
  };

  const handleBuyNow = () => {
    if (isOutOfStock) return;
    addToCart(product, quantity, selectedColor, selectedVariant);
    setQuickViewProduct(null);
    setCurrentView('checkout');
  };

  const handleWhatsAppInquiry = () => {
    const phone = storeSettings.whatsapp || '96181900916';
    const storeName = storeSettings.storeName || 'ARNAOUT STORE';
    const text = `*Inquiry: ${product.name}*\n` +
      `Price: $${activePrice} USD\n` +
      `SKU: ${product.sku}\n` +
      (selectedColor ? `Color: ${selectedColor}\n` : '') +
      `\nHello ${storeName}! Is this item available for immediate pickup at your Saida store or fast dispatch?`;
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(text)}`, '_blank');
  };

  const handleShare = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  return (
    <AnimatePresence>
      <div
        style={{
          paddingTop: 'max(env(safe-area-inset-top, 0px), 0.75rem)',
          paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 0.75rem)',
          paddingLeft: 'max(env(safe-area-inset-left, 0px), 0.75rem)',
          paddingRight: 'max(env(safe-area-inset-right, 0px), 0.75rem)',
        }}
        className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto"
      >
        {/* Layered Glassmorphic Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setQuickViewProduct(null)}
          className="fixed inset-0 bg-black/70 backdrop-blur-md"
        />

        {/* Modal Window Container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 24 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 16 }}
          transition={{ type: 'spring', damping: 26, stiffness: 280 }}
          className="relative w-full max-w-5xl max-h-[92vh] bg-white dark:bg-[#0B1120] border border-[#DCE5F0] dark:border-[#1E293B] rounded-[2rem] shadow-[0_25px_70px_-15px_rgba(0,122,255,0.25)] flex flex-col lg:flex-row overflow-hidden z-10 my-auto"
        >
          {/* Top Bar Controls */}
          <div className="absolute top-4 right-4 rtl:left-4 rtl:right-auto z-30 flex items-center gap-2">
            <button
              onClick={handleShare}
              className="p-2.5 rounded-full bg-white/90 dark:bg-[#152033]/90 hover:bg-[#F5F8FC] dark:hover:bg-[#1E293B] text-[#64748B] dark:text-slate-300 hover:text-[#007AFF] border border-[#DCE5F0] dark:border-[#1E293B] shadow-sm backdrop-blur-md transition-all cursor-pointer"
              title="Share or copy link"
            >
              {copiedLink ? <Check className="w-4 h-4 text-[#16A34A]" /> : <Share2 className="w-4 h-4" />}
            </button>

            <button
              onClick={() => setQuickViewProduct(null)}
              className="p-2.5 rounded-full bg-white/90 dark:bg-[#152033]/90 hover:bg-[#DC2626] hover:text-white text-[#64748B] dark:text-slate-300 border border-[#DCE5F0] dark:border-[#1E293B] shadow-sm backdrop-blur-md transition-all cursor-pointer group"
              aria-label="Close modal"
            >
              <X className="w-4 h-4 group-hover:rotate-90 transition-transform duration-200" />
            </button>
          </div>

          {/* Left Column: 3D Interactive Stage */}
          <div className="lg:w-1/2 p-5 sm:p-7 flex flex-col justify-between bg-gradient-to-b from-[#F5F8FC] via-white to-[#EEF5FF] dark:from-[#070C16] dark:via-[#0B1120] dark:to-[#0F172A] border-b lg:border-b-0 lg:border-r rtl:lg:border-r-0 rtl:lg:border-l border-[#DCE5F0] dark:border-[#1E293B] relative select-none">
            {/* Category Accent Eyebrow */}
            <div className="flex items-center justify-between gap-3 text-xs mb-3">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#007AFF]/10 dark:bg-[#007AFF]/20 text-[#007AFF] dark:text-[#38BDF8] font-bold tracking-wider uppercase text-[10px]">
                <Sparkles className="w-3 h-3" />
                {product.brand} • {product.category}
              </span>
              <span className="text-[#64748B] dark:text-slate-400 font-mono text-[11px]">
                SKU: {product.sku}
              </span>
            </div>

            {/* 3D Perspective Card Stage */}
            <div
              ref={stageRef}
              onMouseMove={handleMouseMove}
              onTouchMove={handleTouchMove}
              onMouseLeave={handleMouseLeave}
              style={{ perspective: 1200 }}
              className="relative w-full h-72 sm:h-84 md:h-96 flex items-center justify-center cursor-grab active:cursor-grabbing group"
            >
              {/* Dynamic 3D Transform Object */}
              <div
                style={{
                  transformStyle: 'preserve-3d',
                  transform: `rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(${isZoomed ? 1.4 : 1})`,
                  transition: isAutoOrbit ? 'none' : 'transform 0.15s ease-out',
                }}
                className="relative w-full h-full max-w-sm max-h-80 flex items-center justify-center"
              >
                {/* 3D Floating Ground Pedestal Shadow */}
                <div
                  style={{
                    transform: `translateZ(-30px) translateY(${rotateX * 0.8}px) translateX(${-rotateY * 0.8}px)`,
                  }}
                  className="absolute bottom-6 w-3/4 h-8 bg-black/25 dark:bg-black/60 rounded-full blur-xl pointer-events-none"
                />

                {/* Floating Authenticity Badge (3D Layer) */}
                <div
                  style={{ transform: 'translateZ(55px)' }}
                  className="absolute top-4 left-4 z-20 pointer-events-none"
                >
                  {product.discountPercentage && product.discountPercentage > 0 ? (
                    <span className="px-3 py-1 rounded-xl bg-[#DC2626] text-white font-black text-xs shadow-lg shadow-[#DC2626]/30">
                      -{product.discountPercentage}% OFF
                    </span>
                  ) : (
                    <span className="px-3 py-1 rounded-xl bg-[#007AFF] text-white font-bold text-xs shadow-lg shadow-[#007AFF]/30 flex items-center gap-1">
                      <Award className="w-3.5 h-3.5" />
                      {lang === 'ar' ? 'وكيل رسمي' : 'Official Agent'}
                    </span>
                  )}
                </div>

                {/* Main Product Image with 3D Depth */}
                <img
                  src={images[selectedImageIndex] || images[0]}
                  alt={product.name}
                  style={{
                    transform: 'translateZ(40px)',
                    filter: 'drop-shadow(0 20px 25px rgba(0,0,0,0.22))',
                  }}
                  className="max-h-64 sm:max-h-76 w-auto object-contain pointer-events-none transition-all duration-300"
                />

                {/* Specular Light Reflection / Glare Overlay */}
                <div
                  style={{
                    transform: 'translateZ(65px)',
                    background: `radial-gradient(circle at ${glare.x}% ${glare.y}%, rgba(255,255,255,${glare.opacity}) 0%, rgba(255,255,255,0) 60%)`,
                  }}
                  className="absolute inset-0 rounded-3xl pointer-events-none transition-opacity duration-150"
                />
              </div>

              {/* 3D Hint Toast at Bottom of Stage */}
              <div className="absolute bottom-2 inset-x-0 flex justify-center pointer-events-none">
                <span className="px-3 py-1 rounded-full bg-white/80 dark:bg-[#152033]/85 backdrop-blur-md border border-[#DCE5F0] dark:border-[#1E293B] text-[10px] font-semibold text-[#64748B] dark:text-slate-300 shadow-xs flex items-center gap-1.5">
                  <Orbit className="w-3 h-3 text-[#007AFF]" />
                  {lang === 'ar' ? 'حرّك الفأرة أو اسحب للمعاينة ثلاثية الأبعاد 3D' : 'Hover or drag to inspect in interactive 3D'}
                </span>
              </div>
            </div>

            {/* 3D Interactive Controls & Gallery Ribbon */}
            <div className="pt-3 space-y-3">
              {/* Controls bar */}
              <div className="flex items-center justify-between gap-2 bg-white/80 dark:bg-[#111A2E]/80 border border-[#DCE5F0] dark:border-[#1E293B] rounded-2xl p-1.5 backdrop-blur-md">
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setIsAutoOrbit(!isAutoOrbit)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                      isAutoOrbit
                        ? 'bg-[#007AFF] text-white shadow-xs'
                        : 'text-[#64748B] dark:text-slate-300 hover:text-[#007AFF] hover:bg-[#EAF3FF] dark:hover:bg-[#1E293B]'
                    }`}
                  >
                    <Orbit className="w-3.5 h-3.5" />
                    <span>{lang === 'ar' ? 'دوران تلقائي' : '360° Orbit'}</span>
                  </button>

                  <button
                    onClick={() => setIsZoomed(!isZoomed)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                      isZoomed
                        ? 'bg-[#007AFF] text-white shadow-xs'
                        : 'text-[#64748B] dark:text-slate-300 hover:text-[#007AFF] hover:bg-[#EAF3FF] dark:hover:bg-[#1E293B]'
                    }`}
                  >
                    <ZoomIn className="w-3.5 h-3.5" />
                    <span>{lang === 'ar' ? 'تكبير' : 'Zoom Lens'}</span>
                  </button>
                </div>

                <button
                  onClick={handleReset3D}
                  className="px-2.5 py-1.5 rounded-xl text-xs font-semibold text-[#64748B] dark:text-slate-400 hover:text-[#172033] dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#1E293B] transition-colors flex items-center gap-1 cursor-pointer"
                  title="Reset 3D perspective"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span className="text-[11px]">{lang === 'ar' ? 'إعادة ضبط' : 'Reset'}</span>
                </button>
              </div>

              {/* Thumbnail Gallery Bar */}
              {images.length > 1 && (
                <div className="flex items-center justify-center gap-2 overflow-x-auto py-1">
                  {images.map((imgUrl, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setSelectedImageIndex(idx);
                        handleReset3D();
                      }}
                      className={`relative w-14 h-14 rounded-xl overflow-hidden border-2 transition-all cursor-pointer flex-shrink-0 bg-white dark:bg-[#111A2E] ${
                        selectedImageIndex === idx
                          ? 'border-[#007AFF] shadow-md scale-105'
                          : 'border-[#DCE5F0] dark:border-[#1E293B] hover:border-[#007AFF]/50 opacity-70 hover:opacity-100'
                      }`}
                    >
                      <img src={imgUrl} alt={`Thumbnail ${idx + 1}`} className="w-full h-full object-contain p-1" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Scannable Details, Specs & Purchase Engine */}
          <div className="lg:w-1/2 flex flex-col justify-between p-5 sm:p-7 bg-white dark:bg-[#0B1120] overflow-y-auto">
            <div className="space-y-4">
              {/* Product Header */}
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-[#172033] dark:text-[#F8FAFC] leading-snug tracking-tight mb-2">
                  {lang === 'ar' ? product.nameAr || product.name : product.name}
                </h2>

                {/* Rating & Warranty Strip */}
                <div className="flex flex-wrap items-center gap-3 text-xs text-[#64748B] dark:text-slate-400">
                  <div className="flex items-center gap-1 text-amber-500 font-bold">
                    <Star className="w-4 h-4 fill-current" />
                    <span className="text-[#172033] dark:text-slate-200">{product.rating}</span>
                    <span className="text-[#64748B] dark:text-slate-400 font-normal">
                      ({product.reviewCount || 12} {lang === 'ar' ? 'تقييم موثق' : 'verified reviews'})
                    </span>
                  </div>

                  <span className="text-[#DCE5F0] dark:text-slate-700">•</span>

                  <div className="flex items-center gap-1 text-[#007AFF] font-semibold">
                    <Shield className="w-3.5 h-3.5" />
                    <span>{product.warrantyMonths} {lang === 'ar' ? 'شهر كفالة وكيل' : 'Mo. Agent Warranty'}</span>
                  </div>

                  <span className="text-[#DCE5F0] dark:text-slate-700">•</span>

                  {/* Stock status indicator */}
                  <div className="flex items-center gap-1.5 font-bold">
                    {isOutOfStock ? (
                      <span className="text-[#DC2626] flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        {lang === 'ar' ? 'نفذت الكمية مؤقتاً' : 'Temporarily Out of Stock'}
                      </span>
                    ) : isLowStock ? (
                      <span className="text-amber-600 dark:text-amber-400 flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                        {lang === 'ar' ? `باقي ${product.stock} قطع في صيدا!` : `Only ${product.stock} left in Saida!`}
                      </span>
                    ) : (
                      <span className="text-[#16A34A] dark:text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        {lang === 'ar' ? `متوفر في صيدا (${product.stock} قطع)` : `In Stock in Saida (${product.stock} units)`}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Price Banner */}
              <div className="p-3.5 rounded-2xl bg-[#F5F8FC] dark:bg-[#111A2E] border border-[#DCE5F0] dark:border-[#1E293B] flex items-baseline justify-between">
                <div>
                  <div className="flex items-baseline gap-2.5">
                    <span className="text-3xl font-black text-[#007AFF] tracking-tight">
                      ${activePrice}
                    </span>
                    {product.originalPrice > activePrice && (
                      <span className="text-sm text-[#64748B] dark:text-slate-400 line-through font-semibold">
                        ${product.originalPrice}
                      </span>
                    )}
                  </div>
                  {discountAmount > 0 && (
                    <span className="text-[11px] font-bold text-[#16A34A] dark:text-emerald-400 block mt-0.5">
                      {lang === 'ar' ? `وفّر $${discountAmount} فوريّاً` : `Instant Savings: $${discountAmount} USD`}
                    </span>
                  )}
                </div>

                <div className="text-right rtl:text-left text-[11px] text-[#64748B] dark:text-slate-400">
                  <span className="font-bold text-[#172033] dark:text-[#F8FAFC] block">
                    {lang === 'ar' ? 'شحن فوري أو استلام' : 'Fast Courier / Pickup'}
                  </span>
                  <span>{lang === 'ar' ? 'الدفع نقداً أو Whish' : 'COD / Whish / OMT'}</span>
                </div>
              </div>

              {/* Scannable Tab Navigation */}
              <div className="flex items-center gap-1 border-b border-[#DCE5F0] dark:border-[#1E293B] pb-1 text-xs">
                <button
                  onClick={() => setActiveTab('overview')}
                  className={`px-3 py-2 rounded-xl font-bold transition-all cursor-pointer ${
                    activeTab === 'overview'
                      ? 'bg-[#007AFF] text-white shadow-xs'
                      : 'text-[#64748B] dark:text-slate-400 hover:text-[#172033] dark:hover:text-white'
                  }`}
                >
                  {lang === 'ar' ? 'نظرة عامة' : 'Overview'}
                </button>
                <button
                  onClick={() => setActiveTab('specs')}
                  className={`px-3 py-2 rounded-xl font-bold transition-all cursor-pointer ${
                    activeTab === 'specs'
                      ? 'bg-[#007AFF] text-white shadow-xs'
                      : 'text-[#64748B] dark:text-slate-400 hover:text-[#172033] dark:hover:text-white'
                  }`}
                >
                  {lang === 'ar' ? 'المواصفات الفنية' : 'Hardware Specs'}
                </button>
                <button
                  onClick={() => setActiveTab('delivery')}
                  className={`px-3 py-2 rounded-xl font-bold transition-all cursor-pointer ${
                    activeTab === 'delivery'
                      ? 'bg-[#007AFF] text-white shadow-xs'
                      : 'text-[#64748B] dark:text-slate-400 hover:text-[#172033] dark:hover:text-white'
                  }`}
                >
                  {lang === 'ar' ? 'التوصيل وصيدا' : 'Delivery & Pickup'}
                </button>
                <button
                  onClick={() => setActiveTab('reviews')}
                  className={`px-3 py-2 rounded-xl font-bold transition-all cursor-pointer ${
                    activeTab === 'reviews'
                      ? 'bg-[#007AFF] text-white shadow-xs'
                      : 'text-[#64748B] dark:text-slate-400 hover:text-[#172033] dark:hover:text-white'
                  }`}
                >
                  {lang === 'ar' ? 'التقييمات' : 'Reviews'}
                </button>
              </div>

              {/* Tab Contents */}
              <div className="min-h-[140px]">
                {/* 1. Overview Tab */}
                {activeTab === 'overview' && (
                  <div className="space-y-3.5">
                    <p className="text-xs sm:text-sm text-[#475569] dark:text-slate-300 leading-relaxed">
                      {lang === 'ar'
                        ? product.descriptionAr || product.description
                        : product.description}
                    </p>

                    {/* Quick Feature Badges */}
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="p-2.5 rounded-xl bg-[#F5F8FC] dark:bg-[#111A2E] border border-[#DCE5F0] dark:border-[#1E293B] flex items-center gap-2">
                        <Award className="w-4 h-4 text-[#007AFF] flex-shrink-0" />
                        <div>
                          <span className="font-bold text-[#172033] dark:text-[#F8FAFC] block text-[11px]">
                            {lang === 'ar' ? 'منتج أصلي 100%' : '100% Genuine'}
                          </span>
                          <span className="text-[10px] text-[#64748B] dark:text-slate-400">
                            {lang === 'ar' ? 'كفالة رسمية مختومة' : 'Direct Agent Import'}
                          </span>
                        </div>
                      </div>

                      <div className="p-2.5 rounded-xl bg-[#F5F8FC] dark:bg-[#111A2E] border border-[#DCE5F0] dark:border-[#1E293B] flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-[#16A34A] flex-shrink-0" />
                        <div>
                          <span className="font-bold text-[#172033] dark:text-[#F8FAFC] block text-[11px]">
                            {lang === 'ar' ? 'استلام فوري بصيدا' : 'Saida Store Pickup'}
                          </span>
                          <span className="text-[10px] text-[#64748B] dark:text-slate-400">
                            {lang === 'ar' ? 'ساحة النجمة (مجاناً)' : 'Nijme Square (Free)'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Color Swatches */}
                    {product.colors && product.colors.length > 0 && (
                      <div>
                        <span className="text-xs font-bold text-[#172033] dark:text-[#F8FAFC] block mb-1.5">
                          {lang === 'ar' ? 'اختر اللون:' : 'Choose Color:'} {selectedColor && <span className="text-[#007AFF]">({selectedColor})</span>}
                        </span>
                        <div className="flex flex-wrap gap-2">
                          {product.colors.map((color) => (
                            <button
                              key={color}
                              onClick={() => setSelectedColor(color)}
                              className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                                selectedColor === color
                                  ? 'bg-[#007AFF] border-[#007AFF] text-white shadow-xs'
                                  : 'bg-[#F5F8FC] dark:bg-[#111A2E] border-[#DCE5F0] dark:border-[#1E293B] text-[#172033] dark:text-[#F8FAFC] hover:border-[#007AFF]'
                              }`}
                            >
                              {color}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Variant Selector */}
                    {product.variants && product.variants.length > 0 && (
                      <div>
                        <span className="text-xs font-bold text-[#172033] dark:text-[#F8FAFC] block mb-1.5">
                          {lang === 'ar' ? 'السعة أو الخيار:' : 'Storage / Variant:'}
                        </span>
                        <div className="flex flex-wrap gap-2">
                          {product.variants.map((v) => (
                            <button
                              key={v.id}
                              onClick={() => setSelectedVariant(v)}
                              className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                                selectedVariant?.id === v.id
                                  ? 'bg-[#007AFF] border-[#007AFF] text-white shadow-xs'
                                  : 'bg-[#F5F8FC] dark:bg-[#111A2E] border-[#DCE5F0] dark:border-[#1E293B] text-[#172033] dark:text-[#F8FAFC] hover:border-[#007AFF]'
                              }`}
                            >
                              {v.name} — ${v.price}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* 2. Specs Tab */}
                {activeTab === 'specs' && (
                  <div className="space-y-2.5">
                    {product.specifications && product.specifications.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        {product.specifications.map((spec, idx) => (
                          <div
                            key={idx}
                            className="p-2.5 rounded-xl bg-[#F5F8FC] dark:bg-[#111A2E] border border-[#DCE5F0] dark:border-[#1E293B] flex items-center justify-between"
                          >
                            <span className="text-[#64748B] dark:text-slate-400 font-semibold">{spec.label}</span>
                            <span className="font-bold text-[#172033] dark:text-[#F8FAFC]">{spec.value}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-4 rounded-xl bg-[#F5F8FC] dark:bg-[#111A2E] border border-[#DCE5F0] dark:border-[#1E293B] text-xs text-[#64748B] text-center">
                        {lang === 'ar' ? 'المواصفات الأساسية تتضمن كفالة الوكيل المعتمدة في لبنان.' : 'Standard authentic agent specifications with verified Lebanese warranty.'}
                      </div>
                    )}

                    <div className="grid grid-cols-3 gap-2 pt-2 text-[11px] text-center">
                      <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 text-[#007AFF]">
                        <Cpu className="w-4 h-4 mx-auto mb-1" />
                        <span className="font-bold block">{lang === 'ar' ? 'فحص أصالة' : 'Inspected'}</span>
                      </div>
                      <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-900 text-purple-600 dark:text-purple-400">
                        <BatteryCharging className="w-4 h-4 mx-auto mb-1" />
                        <span className="font-bold block">{lang === 'ar' ? 'شحن فائق' : 'Fast Charge'}</span>
                      </div>
                      <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 text-[#16A34A] dark:text-emerald-400">
                        <Layers className="w-4 h-4 mx-auto mb-1" />
                        <span className="font-bold block">{lang === 'ar' ? 'علبة المصنع' : 'Sealed Box'}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* 3. Delivery & Saida Pickup Tab */}
                {activeTab === 'delivery' && (
                  <div className="space-y-3 text-xs">
                    <div className="p-3 rounded-2xl bg-[#EAF3FF] dark:bg-[#1E293B] border border-[#BAE6FD] dark:border-blue-900 flex items-start gap-3">
                      <MapPin className="w-5 h-5 text-[#007AFF] flex-shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold text-[#172033] dark:text-[#F8FAFC] block text-sm">
                          {lang === 'ar' ? 'استلام مجاني من فرع صيدا (ساحة النجمة)' : 'Free Instant Pickup at Saida Showroom'}
                        </span>
                        <p className="text-[#64748B] dark:text-slate-300 text-xs mt-0.5">
                          {lang === 'ar'
                            ? 'يمكنكم حجز القطعة واستلامها خلال 15 دقيقة من محلنا في ساحة النجمة، صيدا. مفتوح 17 ساعة يومياً (8:00 صباحاً – 1:00 بعد منتصف الليل).'
                            : 'Reserve your device online and pick it up in 15 minutes at Nijme Square, Saida. Open 17 hours daily (8:00 AM – 1:00 AM).'}
                        </p>
                      </div>
                    </div>

                    <div className="p-3 rounded-2xl bg-[#F5F8FC] dark:bg-[#111A2E] border border-[#DCE5F0] dark:border-[#1E293B] flex items-start gap-3">
                      <Truck className="w-5 h-5 text-[#16A34A] flex-shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold text-[#172033] dark:text-[#F8FAFC] block text-sm">
                          {lang === 'ar' ? 'توصيل سريع لكافة الأراضي اللبنانية' : 'Express Delivery Across All Lebanon'}
                        </span>
                        <p className="text-[#64748B] dark:text-slate-400 text-xs mt-0.5">
                          {lang === 'ar'
                            ? 'توصيل خلال نفس اليوم في صيدا والجنوب، وخلال 24-48 ساعة لبيروت والشمال والبقاع مع الدفع عند الاستلام.'
                            : 'Same-day delivery for Saida and South; 24-48 hours for Greater Beirut, North, and Bekaa with Cash on Delivery.'}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* 4. Reviews Tab */}
                {activeTab === 'reviews' && (
                  <div className="space-y-2.5 max-h-48 overflow-y-auto pr-1">
                    {product.reviews && product.reviews.length > 0 ? (
                      product.reviews.map((rev) => (
                        <div
                          key={rev.id}
                          className="p-3 rounded-xl bg-[#F5F8FC] dark:bg-[#111A2E] border border-[#DCE5F0] dark:border-[#1E293B] space-y-1"
                        >
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-[#172033] dark:text-[#F8FAFC]">{rev.userName}</span>
                            <div className="flex items-center gap-0.5 text-amber-500">
                              {Array.from({ length: 5 }).map((_, i) => (
                                <Star
                                  key={i}
                                  className={`w-3 h-3 ${i < rev.rating ? 'fill-current' : 'text-slate-300'}`}
                                />
                              ))}
                            </div>
                          </div>
                          <p className="text-xs text-[#64748B] dark:text-slate-400">{rev.comment}</p>
                          <span className="text-[10px] text-[#94A3B8] block">{rev.date} • Verified Lebanese Buyer</span>
                        </div>
                      ))
                    ) : (
                      <div className="p-4 text-center text-xs text-[#64748B] dark:text-slate-400">
                        {lang === 'ar' ? 'كن أول من يقيم هذا المنتج من فرعنا بصيدا!' : 'Be the first to review this genuine item!'}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Sticky/Contiguous Action Module */}
            <div className="pt-4 mt-4 border-t border-[#DCE5F0] dark:border-[#1E293B] space-y-3">
              {/* Quantity Stepper & Subtotal */}
              <div className="flex items-center justify-between">
                <span className="text-xs text-[#64748B] dark:text-slate-400 font-bold">
                  {lang === 'ar' ? 'الكمية المطلوبة:' : 'Quantity Selected:'}
                </span>

                <div className="flex items-center bg-[#F5F8FC] dark:bg-[#111A2E] border border-[#DCE5F0] dark:border-[#1E293B] rounded-xl overflow-hidden p-0.5">
                  <button
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    className="w-8 h-8 rounded-lg text-sm font-bold text-[#172033] dark:text-[#F8FAFC] hover:bg-white dark:hover:bg-[#1E293B] transition-colors flex items-center justify-center cursor-pointer"
                  >
                    -
                  </button>
                  <span className="px-3 text-xs font-black text-[#172033] dark:text-[#F8FAFC] min-w-[2rem] text-center font-mono">
                    {quantity}
                  </span>
                  <button
                    onClick={() => setQuantity((q) => Math.min(product.stock, q + 1))}
                    className="w-8 h-8 rounded-lg text-sm font-bold text-[#172033] dark:text-[#F8FAFC] hover:bg-white dark:hover:bg-[#1E293B] transition-colors flex items-center justify-center cursor-pointer"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  onClick={handleAddToCart}
                  disabled={isOutOfStock}
                  className={`py-3 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer group ${
                    isOutOfStock
                      ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                      : 'bg-[#F5F8FC] dark:bg-[#111A2E] hover:bg-[#EAF3FF] dark:hover:bg-[#1E293B] text-[#172033] dark:text-[#F8FAFC] border border-[#DCE5F0] dark:border-[#1E293B] hover:border-[#007AFF] shadow-xs active:scale-[0.98]'
                  }`}
                >
                  <Cart3DIcon size={18} />
                  <span>
                    {isAddedToast
                      ? (lang === 'ar' ? 'تمت الإضافة بنجاح! 🛍️' : 'Packed into Bag! 🛍️')
                      : (lang === 'ar' ? 'احجز قطعتك الآن 🛍️' : 'Pack It For Me 🛍️')}
                  </span>
                </button>

                <button
                  onClick={handleBuyNow}
                  disabled={isOutOfStock}
                  className={`py-3 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md group ${
                    isOutOfStock
                      ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                      : 'bg-gradient-to-r from-[#007AFF] to-[#0055D6] hover:from-[#0066D6] hover:to-[#0048B8] text-white shadow-[#007AFF]/25 active:scale-[0.98]'
                  }`}
                >
                  <Zap3DIcon size={18} />
                  <span>{lang === 'ar' ? 'شراء فوري مباشر ⚡' : 'Direct Order ⚡'}</span>
                </button>
              </div>

              {/* WhatsApp Fast Inquiry Button with Real 3D Icon */}
              <button
                onClick={handleWhatsAppInquiry}
                className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-50 via-green-50 to-emerald-100 hover:from-emerald-100 hover:to-green-100 dark:from-emerald-950/40 dark:via-emerald-900/40 dark:to-emerald-950/60 border border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-300 font-extrabold text-xs flex items-center justify-center gap-2.5 transition-all cursor-pointer shadow-sm hover:shadow-md hover:shadow-emerald-500/20 group"
              >
                <WhatsApp3DIcon size={22} />
                <span>
                  {lang === 'ar'
                    ? 'استفسار / طلب عبر واتساب (81900916)'
                    : 'Inquire / Order on WhatsApp (81900916)'}
                </span>
              </button>

              {/* Dedicated Page Option */}
              <div className="flex items-center justify-between text-[11px] text-[#64748B] dark:text-slate-400 pt-1">
                <span>{lang === 'ar' ? 'كفالة رسمية صيدا - ساحة النجمة' : 'Official Warranty • Saida Nijme Square'}</span>
                <button
                  onClick={() => {
                    setQuickViewProduct(null);
                    viewProductDetail(product.id, false);
                  }}
                  className="text-[#007AFF] dark:text-[#38BDF8] hover:underline font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <span>{lang === 'ar' ? 'فتح الصفحة الكاملة' : 'Open Dedicated Page'}</span>
                  <ExternalLink className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
