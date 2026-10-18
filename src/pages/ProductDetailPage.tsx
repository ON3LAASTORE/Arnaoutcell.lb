import React, { useState } from 'react';
import { useShop } from '../context/ShopContext';
import { ProductCard } from '../components/ProductCard';
import {
  Star,
  Shield,
  Truck,
  Heart,
  ShoppingCart,
  Zap,
  MessageSquare,
  Share2,
  CheckCircle,
  AlertTriangle,
  Play,
  Sparkles,
} from 'lucide-react';

export const ProductDetailPage: React.FC = () => {
  const {
    lang,
    t,
    products,
    selectedProductId,
    addToCart,
    toggleWishlist,
    isInWishlist,
    setCurrentView,
    storeSettings,
  } = useShop();

  const product = products.find((p) => p.id === selectedProductId) || products[0];

  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [selectedColor, setSelectedColor] = useState<string | undefined>(product?.colors?.[0]);
  const [selectedVariant, setSelectedVariant] = useState(product?.variants?.[0]);
  const [quantity, setQuantity] = useState(1);
  const [zoomStyle, setZoomStyle] = useState<{ display: string; x: number; y: number }>({
    display: 'none',
    x: 0,
    y: 0,
  });

  // Review submission form state
  const [newReviewName, setNewReviewName] = useState('');
  const [newReviewRating, setNewReviewRating] = useState(5);
  const [newReviewComment, setNewReviewComment] = useState('');
  const [reviewSubmitted, setReviewSubmitted] = useState(false);

  // Synchronize variant, color, and image when viewing a different product
  React.useEffect(() => {
    setActiveImageIndex(0);
    setSelectedColor(product?.colors?.[0]);
    setSelectedVariant(product?.variants?.[0]);
    setQuantity(1);
    setReviewSubmitted(false);
  }, [product?.id]);

  if (!product) return null;

  const isFavorited = isInWishlist(product.id);
  const isOutOfStock = product.stock <= 0;
  const isLowStock = product.stock > 0 && product.stock <= (product.lowStockThreshold || 3);
  const activePrice = selectedVariant ? selectedVariant.price : product.price;

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const { left, top, width, height } = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - left) / width) * 100;
    const y = ((e.clientY - top) / height) * 100;
    setZoomStyle({ display: 'block', x, y });
  };

  const handleMouseLeave = () => {
    setZoomStyle({ display: 'none', x: 0, y: 0 });
  };

  const handleAddToCart = () => {
    if (isOutOfStock) return;
    addToCart(product, quantity, selectedColor, selectedVariant);
  };

  const handleBuyNow = () => {
    if (isOutOfStock) return;
    addToCart(product, quantity, selectedColor, selectedVariant);
    setCurrentView('checkout');
  };

  const handleWhatsAppInquiry = () => {
    const msg = `Hello ${storeSettings.storeName} (${storeSettings.phone})! I'm inquiring about: ${product.name} (SKU: ${product.sku}, Price: $${activePrice}). Is it available at your Saida store for immediate pickup or delivery?`;
    window.open(`https://wa.me/${storeSettings.whatsapp || '96103099889'}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: product.name,
        text: `Check out ${product.name} at ${storeSettings.storeName} Saida for $${activePrice}!`,
        url: window.location.href,
      }).catch(() => {});
    } else if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
    }
  };

  const handleReviewSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReviewName.trim() || !newReviewComment.trim()) return;

    if (!product.reviews) product.reviews = [];
    product.reviews.unshift({
      id: `rev-${Date.now()}`,
      userName: newReviewName.trim(),
      rating: newReviewRating,
      comment: newReviewComment.trim(),
      date: new Date().toISOString().split('T')[0],
      verifiedPurchase: true,
    });
    product.reviewCount = (product.reviewCount || 0) + 1;

    setReviewSubmitted(true);
    setNewReviewName('');
    setNewReviewComment('');
  };

  // Related products
  const relatedProducts = products
    .filter((p) => p.id !== product.id && (p.category === product.category || p.brand === product.brand))
    .slice(0, 4);

  return (
    <div className="py-10 md:py-16 bg-[#FFFFFF] min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Breadcrumb Navigation */}
        <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-[#64748B] mb-8 overflow-x-auto whitespace-nowrap pb-2">
          <button onClick={() => setCurrentView('home')} className="hover:text-[#007AFF] cursor-pointer">
            {lang === 'ar' ? 'الرئيسية' : 'Home'}
          </button>
          <span>/</span>
          <button onClick={() => setCurrentView('products')} className="hover:text-[#007AFF] cursor-pointer">
            {product.category}
          </button>
          <span>/</span>
          <span className="text-[#172033] font-semibold truncate max-w-xs">{product.brand}</span>
        </nav>

        {/* Main Product Showcase Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12">
          {/* Gallery with Image Zoom */}
          <div className="lg:col-span-6 space-y-4">
            {/* Main Image with Zoom Viewport */}
            <div
              className="relative w-full h-80 sm:h-[460px] rounded-3xl bg-[#F5F8FC] border border-[#DCE5F0] overflow-hidden flex items-center justify-center p-6 cursor-crosshair group shadow-xs"
              onMouseMove={handleMouseMove}
              onMouseLeave={handleMouseLeave}
            >
              <img
                src={product.images[activeImageIndex] || product.images[0]}
                alt={product.name}
                className="max-h-full max-w-full object-contain select-none"
              />

              {/* Magnified Lens Portal */}
              {zoomStyle.display === 'block' && (
                <div
                  className="absolute inset-0 pointer-events-none rounded-3xl overflow-hidden hidden md:block bg-no-repeat bg-cover z-20"
                  style={{
                    backgroundImage: `url(${product.images[activeImageIndex] || product.images[0]})`,
                    backgroundPosition: `${zoomStyle.x}% ${zoomStyle.y}%`,
                    backgroundSize: '220%',
                  }}
                />
              )}

              {/* Badges */}
              <div className="absolute top-4 left-4 flex flex-col gap-1.5 z-10">
                {product.discountPercentage && product.discountPercentage > 0 ? (
                  <span className="px-3 py-1 rounded-lg bg-[#DC2626] text-white font-black text-xs shadow-xs">
                    -{product.discountPercentage}% OFF
                  </span>
                ) : null}
                {product.isSpecialOffer && (
                  <span className="px-3 py-1 rounded-lg bg-[#007AFF] text-white font-bold text-xs shadow-xs">
                    {lang === 'ar' ? 'عرض خاص' : 'SPECIAL OFFER'}
                  </span>
                )}
              </div>

              {/* Share & Wishlist quick actions */}
              <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
                <button
                  onClick={handleShare}
                  className="p-2.5 rounded-xl bg-white/90 hover:bg-white text-[#64748B] hover:text-[#172033] border border-[#DCE5F0] shadow-xs transition-colors cursor-pointer"
                  title="Share"
                >
                  <Share2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => toggleWishlist(product.id)}
                  className={`p-2.5 rounded-xl transition-colors cursor-pointer border ${
                    isFavorited
                      ? 'bg-[#DC2626] text-white border-[#DC2626] shadow-sm'
                      : 'bg-white/90 hover:bg-white text-[#64748B] hover:text-[#DC2626] border-[#DCE5F0]'
                  }`}
                  title="Wishlist"
                >
                  <Heart className={`w-4 h-4 ${isFavorited ? 'fill-current' : ''}`} />
                </button>
              </div>
            </div>

            {/* Thumbnail Strip */}
            {product.images.length > 1 && (
              <div className="flex items-center gap-3 overflow-x-auto pb-2">
                {product.images.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActiveImageIndex(idx)}
                    className={`relative w-20 h-20 rounded-2xl overflow-hidden bg-[#F5F8FC] border-2 transition-all flex-shrink-0 cursor-pointer p-1 ${
                      activeImageIndex === idx ? 'border-[#007AFF] shadow-sm' : 'border-[#DCE5F0] opacity-70 hover:opacity-100'
                    }`}
                  >
                    <img src={img} alt={`${product.name} thumb ${idx}`} className="w-full h-full object-contain" />
                  </button>
                ))}
              </div>
            )}

            {/* Video preview link if available */}
            {product.videoUrl && (
              <div className="p-3.5 rounded-2xl bg-[#EAF3FF] border border-[#BAE6FD] flex items-center justify-between gap-4">
                <div className="flex items-center gap-2 text-xs font-semibold text-[#007AFF]">
                  <Play className="w-4 h-4 text-[#007AFF]" />
                  <span>{lang === 'ar' ? 'فيديو مخصص لمعاينة هذا الجهاز' : 'Watch Official Product Video'}</span>
                </div>
                <a
                  href={product.videoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 rounded-lg bg-[#007AFF] hover:bg-[#0066D6] text-white text-xs font-bold transition-colors"
                >
                  {lang === 'ar' ? 'مشاهدة' : 'Watch'}
                </a>
              </div>
            )}
          </div>

          {/* Product Details & Actions */}
          <div className="lg:col-span-6 space-y-6">
            <div>
              {/* Brand, Category & SKU */}
              <div className="flex items-center justify-between text-xs mb-2">
                <span className="font-extrabold text-[#007AFF] uppercase tracking-widest text-sm">
                  {product.brand}
                </span>
                <span className="text-[#64748B] font-mono text-[11px]">SKU: {product.sku}</span>
              </div>

              {/* Title */}
              <h1 className="text-2xl sm:text-3xl font-black text-[#172033] leading-snug">
                {lang === 'ar' ? product.nameAr || product.name : product.name}
              </h1>

              {/* Rating & Review summary */}
              <div className="flex items-center gap-3 mt-3 text-xs">
                <div className="flex items-center gap-1 text-amber-500">
                  <Star className="w-4 h-4 fill-current" />
                  <span className="font-bold text-[#172033] text-sm">{product.rating}</span>
                </div>
                <span className="text-[#DCE5F0]">•</span>
                <span className="text-[#64748B]">
                  {product.reviewCount} {lang === 'ar' ? 'تقييم موثق من عملاء صيدا ولبنان' : 'Verified Reviews'}
                </span>
                <span className="text-[#DCE5F0]">•</span>
                <span className="text-[#16A34A] font-semibold">{t.warranty}</span>
              </div>
            </div>

            {/* Price Box */}
            <div className="p-4 sm:p-5 rounded-2xl bg-[#F5F8FC] border border-[#DCE5F0] flex items-baseline justify-between shadow-xs">
              <div>
                <span className="text-xs text-[#64748B] block mb-1">
                  {lang === 'ar' ? 'السعر النقدي بالدولار (USD)' : 'Price in USD (Fresh Cash):'}
                </span>
                <div className="flex items-baseline gap-3">
                  <span className="text-3xl sm:text-4xl font-black text-[#007AFF] tracking-tight">
                    ${activePrice}
                  </span>
                  {product.originalPrice > activePrice && (
                    <span className="text-base text-[#64748B] line-through">
                      ${product.originalPrice}
                    </span>
                  )}
                </div>
              </div>

              {product.originalPrice > activePrice && (
                <div className="text-right rtl:text-left">
                  <span className="px-3 py-1 rounded-full bg-emerald-50 text-[#16A34A] border border-emerald-200 text-xs font-bold block">
                    {lang === 'ar'
                      ? `وفّر $${product.originalPrice - activePrice}`
                      : `Save $${product.originalPrice - activePrice}`}
                  </span>
                </div>
              )}
            </div>

            {/* Color Selector */}
            {product.colors && product.colors.length > 0 && (
              <div>
                <span className="text-xs font-bold text-[#172033] block mb-2">
                  {lang === 'ar' ? 'اختر اللون:' : 'Select Color:'}{' '}
                  <strong className="text-[#007AFF]">{selectedColor}</strong>
                </span>
                <div className="flex flex-wrap gap-2">
                  {product.colors.map((color) => (
                    <button
                      key={color}
                      onClick={() => setSelectedColor(color)}
                      className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                        selectedColor === color
                          ? 'bg-[#EAF3FF] border-[#007AFF] text-[#007AFF]'
                          : 'bg-white border-[#DCE5F0] text-[#172033] hover:border-[#007AFF]'
                      }`}
                    >
                      {color}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Variants Selector */}
            {product.variants && product.variants.length > 0 && (
              <div>
                <span className="text-xs font-bold text-[#172033] block mb-2">
                  {lang === 'ar' ? 'اختر السعة / الفئة:' : 'Select Configuration / Capacity:'}
                </span>
                <div className="grid grid-cols-2 gap-2">
                  {product.variants.map((v) => (
                    <button
                      key={v.id}
                      onClick={() => setSelectedVariant(v)}
                      className={`p-3 rounded-xl text-left rtl:text-right border transition-all cursor-pointer ${
                        selectedVariant?.id === v.id
                          ? 'bg-[#EAF3FF] border-[#007AFF] text-[#007AFF]'
                          : 'bg-white border-[#DCE5F0] text-[#172033] hover:border-[#007AFF]'
                      }`}
                    >
                      <span className="block text-xs font-bold">{v.name}</span>
                      <span className="block text-xs font-black text-[#007AFF] mt-1">${v.price}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Stock status indicator */}
            <div className="p-3.5 rounded-2xl bg-[#F5F8FC] border border-[#DCE5F0] flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                {isOutOfStock ? (
                  <>
                    <AlertTriangle className="w-4 h-4 text-[#DC2626]" />
                    <span className="text-[#DC2626] font-bold">{t.outOfStock}</span>
                  </>
                ) : isLowStock ? (
                  <>
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    <span className="text-amber-600 font-bold">
                      {lang === 'ar' ? `كمية محدودة جداً (${product.stock} متوفرة)` : `Low Stock: Only ${product.stock} left in Saida`}
                    </span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 text-[#16A34A]" />
                    <span className="text-[#16A34A] font-bold">
                      {lang === 'ar' ? `متوفر في متجر صيدا (${product.stock} قطع)` : `In Stock at Nijme Square Saida (${product.stock} units)`}
                    </span>
                  </>
                )}
              </div>
              <span className="text-[#64748B] font-semibold">{lang === 'ar' ? 'توصيل فوري' : 'Instant Dispatch'}</span>
            </div>

            {/* Quantity Stepper & Primary Actions */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center gap-4">
                <span className="text-xs text-[#172033] font-bold">{lang === 'ar' ? 'الكمية:' : 'Quantity:'}</span>
                <div className="flex items-center bg-[#F5F8FC] border border-[#DCE5F0] rounded-xl overflow-hidden">
                  <button
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    className="px-3.5 py-1.5 text-[#172033] hover:bg-slate-200 transition-colors cursor-pointer"
                  >
                    -
                  </button>
                  <span className="px-4 py-1.5 text-xs font-bold text-[#172033] min-w-[2.5rem] text-center">
                    {quantity}
                  </span>
                  <button
                    onClick={() => setQuantity((q) => Math.min(product.stock, q + 1))}
                    className="px-3.5 py-1.5 text-[#172033] hover:bg-slate-200 transition-colors cursor-pointer"
                  >
                    +
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  onClick={handleAddToCart}
                  disabled={isOutOfStock}
                  className={`py-3.5 px-4 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    isOutOfStock
                      ? 'bg-slate-100 text-slate-400 cursor-not-allowed border-slate-200'
                      : 'bg-[#F5F8FC] hover:bg-[#EAF3FF] text-[#172033] border-[#DCE5F0] hover:border-[#007AFF]'
                  }`}
                >
                  <ShoppingCart className="w-4 h-4 text-[#007AFF]" />
                  <span>{t.addToCart}</span>
                </button>

                <button
                  onClick={handleBuyNow}
                  disabled={isOutOfStock}
                  className={`py-3.5 px-4 rounded-xl text-xs font-bold shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    isOutOfStock
                      ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                      : 'bg-[#007AFF] hover:bg-[#0066D6] text-white shadow-[#007AFF]/25'
                  }`}
                >
                  <Zap className="w-4 h-4 fill-current" />
                  <span>{t.buyNow}</span>
                </button>
              </div>

              {/* WhatsApp direct inquiry button */}
              <button
                onClick={handleWhatsAppInquiry}
                className="w-full py-3 px-4 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-[#16A34A] font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <MessageSquare className="w-4 h-4" />
                <span>{lang === 'ar' ? 'استفسر أو اطلب فورياً عبر واتساب (03 099 889)' : 'Inquire / Order on WhatsApp (03 099 889)'}</span>
              </button>
            </div>

            {/* Quick Guarantees */}
            <div className="grid grid-cols-2 gap-3 pt-4 border-t border-[#DCE5F0] text-xs text-[#64748B]">
              <div className="flex items-center gap-2">
                <Truck className="w-4 h-4 text-[#007AFF] flex-shrink-0" />
                <span>{lang === 'ar' ? 'توصيل لكافة المحافظات' : 'Lebanon Fast Delivery'}</span>
              </div>
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-[#16A34A] flex-shrink-0" />
                <span>
                  {product.warrantyMonths} {lang === 'ar' ? 'أشهر كفالة معتمدة' : 'Mo. Store Warranty'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Technical Specifications & Description */}
        <div className="mt-16 pt-12 border-t border-[#DCE5F0] space-y-12">
          {/* Description */}
          <div className="space-y-4 max-w-4xl">
            <h3 className="text-xl font-bold text-[#172033] flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-[#007AFF]" />
              <span>{lang === 'ar' ? 'تفاصيل ومميزات المنتج' : 'Product Overview'}</span>
            </h3>
            <p className="text-[#64748B] text-sm leading-relaxed whitespace-pre-line">
              {lang === 'ar' ? product.descriptionAr || product.description : product.description}
            </p>
          </div>

          {/* Full Technical Specifications Custom Table */}
          {product.specifications && product.specifications.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-xl font-bold text-[#172033]">
                {lang === 'ar' ? 'المواصفات الفنية الكاملة' : 'Full Technical Specifications'}
              </h3>
              <div className="rounded-2xl border border-[#DCE5F0] overflow-hidden bg-white shadow-xs">
                <table className="w-full text-left rtl:text-right text-xs">
                  <tbody className="divide-y divide-[#DCE5F0]">
                    {product.specifications.map((spec, idx) => (
                      <tr key={idx} className="hover:bg-[#F5F8FC] transition-colors">
                        <td className="py-3 px-4 font-bold text-[#64748B] w-1/3 sm:w-1/4 bg-[#F5F8FC]">
                          {spec.label}
                        </td>
                        <td className="py-3 px-4 font-semibold text-[#172033]">{spec.value}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Customer Reviews Section */}
          <div className="space-y-6 pt-6 border-t border-[#DCE5F0]">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-[#172033]">{t.customerReviews}</h3>
                <p className="text-xs text-[#64748B] mt-0.5">
                  {lang === 'ar'
                    ? `تقييمات واقعية وموثقة من عملاء ${storeSettings.storeNameAr || 'أرناؤوط ستور'}.`
                    : 'Authentic customer feedback from verified buyers in Lebanon.'}
                </p>
              </div>

              <div className="flex items-center gap-2 text-amber-500 bg-amber-50 px-3 py-1.5 rounded-xl border border-amber-200">
                <Star className="w-4 h-4 fill-current" />
                <span className="font-bold text-sm text-[#172033]">{product.rating} / 5</span>
              </div>
            </div>

            {/* Existing Reviews */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {product.reviews && product.reviews.length > 0 ? (
                product.reviews.map((rev) => (
                  <div key={rev.id} className="p-4 rounded-xl bg-[#F5F8FC] border border-[#DCE5F0] space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[#172033] text-xs">{rev.userName}</span>
                      <span className="text-[10px] text-[#64748B]">{rev.date}</span>
                    </div>
                    <div className="flex items-center gap-1 text-amber-500">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`w-3 h-3 ${i < rev.rating ? 'fill-current' : 'text-slate-300'}`}
                        />
                      ))}
                      {rev.verifiedPurchase && (
                        <span className="text-[10px] text-[#16A34A] ml-2 font-semibold">
                          ✓ {lang === 'ar' ? 'شراء مؤكد' : 'Verified Buyer'}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[#64748B] leading-relaxed">{rev.comment}</p>
                  </div>
                ))
              ) : (
                <div className="col-span-2 text-center py-8 text-xs text-[#64748B]">
                  {lang === 'ar' ? 'كن أول من يكتب تقييماً لهذا المنتج' : 'Be the first to review this product'}
                </div>
              )}
            </div>

            {/* Write a Review Form */}
            <div className="p-6 rounded-2xl bg-white border border-[#DCE5F0] max-w-xl shadow-xs">
              <h4 className="text-sm font-bold text-[#172033] mb-3">{t.writeReview}</h4>
              {reviewSubmitted ? (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-[#16A34A] text-xs font-semibold">
                  {lang === 'ar' ? 'شكراً لك! تم إضافة تقييمك بنجاح.' : 'Thank you! Your verified review has been posted.'}
                </div>
              ) : (
                <form onSubmit={handleReviewSubmit} className="space-y-3">
                  <div>
                    <label className="text-xs text-[#172033] block mb-1 font-semibold">{t.fullName}</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Fadi S."
                      value={newReviewName}
                      onChange={(e) => setNewReviewName(e.target.value)}
                      className="w-full bg-[#F5F8FC] border border-[#DCE5F0] rounded-xl px-3 py-2 text-xs text-[#172033] focus:outline-none focus:border-[#007AFF]"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-[#172033] block mb-1 font-semibold">
                      {lang === 'ar' ? 'التقييم:' : 'Rating:'}
                    </label>
                    <select
                      value={newReviewRating}
                      onChange={(e) => setNewReviewRating(Number(e.target.value))}
                      className="w-full bg-[#F5F8FC] border border-[#DCE5F0] rounded-xl px-3 py-2 text-xs text-[#172033] focus:outline-none focus:border-[#007AFF]"
                    >
                      <option value={5}>⭐⭐⭐⭐⭐ 5/5</option>
                      <option value={4}>⭐⭐⭐⭐ 4/5</option>
                      <option value={3}>⭐⭐⭐ 3/5</option>
                      <option value={2}>⭐⭐ 2/5</option>
                      <option value={1}>⭐ 1/5</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-[#172033] block mb-1 font-semibold">
                      {lang === 'ar' ? 'رأيك بالمنتج:' : 'Your Feedback:'}
                    </label>
                    <textarea
                      required
                      rows={3}
                      value={newReviewComment}
                      onChange={(e) => setNewReviewComment(e.target.value)}
                      placeholder={lang === 'ar' ? 'صف تجربتك مع الجهاز وسرعة التوصيل...' : 'Describe device performance and build quality...'}
                      className="w-full bg-[#F5F8FC] border border-[#DCE5F0] rounded-xl px-3 py-2 text-xs text-[#172033] focus:outline-none focus:border-[#007AFF]"
                    />
                  </div>
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl bg-[#007AFF] hover:bg-[#0066D6] text-white font-bold text-xs cursor-pointer shadow-sm shadow-[#007AFF]/25"
                  >
                    {lang === 'ar' ? 'نشر التقييم' : 'Submit Review'}
                  </button>
                </form>
              )}
            </div>
          </div>

          {/* Related Products Carousel */}
          {relatedProducts.length > 0 && (
            <div className="pt-10 border-t border-[#DCE5F0]">
              <h3 className="text-xl font-bold text-[#172033] mb-6">{t.relatedProducts}</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                {relatedProducts.map((p) => (
                  <ProductCard key={p.id} product={p} layout="grid" />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
