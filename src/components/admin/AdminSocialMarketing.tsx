import React, { useState, useEffect } from 'react';
import { useShop } from '../../context/ShopContext';
import { Product } from '../../types';
import {
  SocialPlatform,
  SocialAspectRatio,
  SocialGraphicTemplate,
  MarketingPost,
  SocialPublishResult,
} from '../../types/socialMarketing';
import {
  generateSocialCaptions,
  generateProductHashtags,
  validateMarketingPost,
  STORE_PHONE_DISPLAY,
} from '../../utils/socialMarketingHelpers';
import {
  persistMarketingPost,
  publishDirectViaBackend,
  fetchBackendSocialAccounts,
  publishToInstagramDirectly,
} from '../../services/socialMarketingService';
import { SocialImageCanvas } from './social/SocialImageCanvas';
import { SocialPreviewCard } from './social/SocialPreviewCard';
import { SocialAccountsManager } from './social/SocialAccountsManager';
import { SocialPostHistory } from './social/SocialPostHistory';
import {
  Share2,
  Sparkles,
  Send,
  Download,
  Copy,
  Check,
  CheckCircle2,
  Clock,
  Layers,
  Save,
  Eye,
  Sliders,
  Settings,
  ShieldCheck,
  MessageSquare,
  Instagram,
  Facebook,
  Twitter,
  Music2,
  Smartphone,
  Globe,
  FileText,
  AlertCircle,
  ExternalLink,
  RotateCw,
  X,
  Zap,
} from 'lucide-react';
import { LazyImage } from '../LazyImage';
import { WhatsApp3DIcon } from '../icons/ThreeDIcons';

interface AdminSocialMarketingProps {
  initialProductId?: string;
}

export const AdminSocialMarketing: React.FC<AdminSocialMarketingProps> = ({
  initialProductId,
}) => {
  const { lang, products, storeSettings } = useShop();
  const isArabic = lang === 'ar';

  const [activeSubTab, setActiveSubTab] = useState<'create' | 'history' | 'channels'>('create');
  const [selectedProduct, setSelectedProduct] = useState<Product>(() => {
    if (initialProductId) {
      const match = products.find((p) => p.id === initialProductId);
      if (match) return match;
    }
    return products[0] || ({} as Product);
  });

  // Post Creator State
  const [aspectRatio, setAspectRatio] = useState<SocialAspectRatio>('1:1');
  const [template, setTemplate] = useState<SocialGraphicTemplate>('modern_dark');
  const [captionEn, setCaptionEn] = useState('');
  const [captionAr, setCaptionAr] = useState('');
  const [hashtags, setHashtags] = useState<string[]>([]);
  const [selectedPlatforms, setSelectedPlatforms] = useState<SocialPlatform[]>([
    'facebook',
    'instagram',
    'whatsapp',
    'telegram',
  ]);
  const [activePreviewPlatform, setActivePreviewPlatform] = useState<SocialPlatform>('facebook');
  const [activeLangTab, setActiveLangTab] = useState<'en' | 'ar' | 'bilingual'>('bilingual');
  const [generatedImageDataUrl, setGeneratedImageDataUrl] = useState<string>('');
  const [headlineOverride, setHeadlineOverride] = useState('');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [copiedCaption, setCopiedCaption] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isPublishingInstagram, setIsPublishingInstagram] = useState(false);

  // Dedicated Instagram Publishing Modal for ON AlAA STORE
  const [instagramModal, setInstagramModal] = useState<{
    isOpen: boolean;
    stage: 'idle' | 'uploading' | 'container' | 'publishing' | 'done' | 'error';
    postId?: string;
    postUrl?: string;
    errorMsg?: string;
    errorDetails?: string;
    needsSetup?: boolean;
    metaCode?: number;
  } | null>(null);

  // Live Publishing Results Modal State
  const [publishResultModal, setPublishResultModal] = useState<{
    isOpen: boolean;
    productName: string;
    results: Record<string, SocialPublishResult>;
  } | null>(null);

  // Auto-generate captions and hashtags when product changes
  useEffect(() => {
    if (selectedProduct && selectedProduct.id) {
      const captions = generateSocialCaptions(selectedProduct, storeSettings);
      setCaptionEn(captions.captionEn);
      setCaptionAr(captions.captionAr);
      setHashtags(generateProductHashtags(selectedProduct));

      // Auto-pick suitable template
      if (selectedProduct.brand?.toLowerCase() === 'oppo') {
        setTemplate('coloros_purple');
      } else if (selectedProduct.isSpecialOffer || (selectedProduct.discountPercentage && selectedProduct.discountPercentage > 0)) {
        setTemplate('hot_deal');
      } else {
        setTemplate('modern_dark');
      }
    }
  }, [selectedProduct, storeSettings]);

  const handleCopyCaption = async () => {
    const textToCopy =
      activeLangTab === 'ar'
        ? captionAr
        : activeLangTab === 'en'
        ? captionEn
        : `${captionEn}\n\n---\n\n${captionAr}`;

    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopiedCaption(true);
      setTimeout(() => setCopiedCaption(false), 2000);
    } catch {
      // fallback
    }
  };

  const handleSaveDraft = async () => {
    if (!selectedProduct) return;

    const postPayload: MarketingPost = {
      id: `post-${Date.now()}`,
      productId: selectedProduct.id,
      productName: selectedProduct.name,
      productNameAr: selectedProduct.nameAr,
      productBrand: selectedProduct.brand,
      productCategory: selectedProduct.category,
      productPrice: selectedProduct.price,
      originalPrice: selectedProduct.originalPrice,
      discountPercentage: selectedProduct.discountPercentage,
      productImage: selectedProduct.images?.[0] || '',
      aspectRatio,
      templateStyle: template,
      captionEn,
      captionAr,
      hashtags,
      selectedPlatforms,
      status: 'draft',
      createdAt: new Date().toISOString(),
      headlineOverride: headlineOverride || undefined,
    };

    const validation = validateMarketingPost(postPayload);
    if (!validation.valid) {
      setFeedback({ type: 'error', msg: validation.errors[0] });
      return;
    }

    await persistMarketingPost(postPayload);
    setFeedback({
      type: 'success',
      msg: isArabic ? 'تم حفظ مسودة المنشور بنجاح.' : 'Marketing post draft saved successfully.',
    });
    setTimeout(() => setFeedback(null), 3500);
  };

  const handlePublishDirect = async () => {
    if (!selectedProduct) return;
    if (selectedPlatforms.length === 0) {
      setFeedback({
        type: 'error',
        msg: isArabic ? 'يرجى اختيار منصة واحدة على الأقل للنشر.' : 'Please select at least one social media platform.',
      });
      return;
    }

    setIsPublishing(true);

    const postPayload: MarketingPost = {
      id: `post-${Date.now()}`,
      productId: selectedProduct.id,
      productName: selectedProduct.name,
      productNameAr: selectedProduct.nameAr,
      productBrand: selectedProduct.brand,
      productCategory: selectedProduct.category,
      productPrice: selectedProduct.price,
      originalPrice: selectedProduct.originalPrice,
      discountPercentage: selectedProduct.discountPercentage,
      productImage: selectedProduct.images?.[0] || '',
      aspectRatio,
      templateStyle: template,
      captionEn,
      captionAr,
      hashtags,
      selectedPlatforms,
      status: 'published',
      createdAt: new Date().toISOString(),
      publishedAt: new Date().toISOString(),
      headlineOverride: headlineOverride || undefined,
    };

    try {
      // Call secure backend publishing endpoint for real Meta Graph API + Telegram execution
      const targetCaption =
        activeLangTab === 'ar'
          ? captionAr
          : activeLangTab === 'en'
          ? captionEn
          : `${captionEn}\n\n---\n\n${captionAr}`;

      const publishResponse = await publishDirectViaBackend({
        postId: postPayload.id,
        productId: selectedProduct.id,
        productName: selectedProduct.name,
        platforms: selectedPlatforms,
        caption: targetCaption,
        imageBase64: generatedImageDataUrl,
        productUrl: `https://onalaastore.com/?product=${encodeURIComponent(selectedProduct.id)}`,
        fallbackImageUrl: selectedProduct.images?.[0],
      });

      postPayload.platformResults = publishResponse.results;
      const hasAnySuccess = Object.values(publishResponse.results).some((r: any) => r.success);
      postPayload.status = hasAnySuccess ? 'published' : 'draft';

      await persistMarketingPost(postPayload);

      // Open detailed result modal
      setPublishResultModal({
        isOpen: true,
        productName: selectedProduct.name,
        results: publishResponse.results,
      });

      setFeedback({
        type: hasAnySuccess ? 'success' : 'error',
        msg: hasAnySuccess
          ? isArabic
            ? 'تم إرسال الحملة إلى المنصات المحددة!'
            : 'Marketing campaign dispatched to selected channels!'
          : isArabic
          ? 'تعذر النشر المباشر. يرجى مراجعة إعدادات وتصاريح الحسابات.'
          : 'Direct publishing completed with errors. See details below.',
      });
    } catch (err) {
      setFeedback({
        type: 'error',
        msg: err instanceof Error ? err.message : 'Publish execution failed.',
      });
    } finally {
      setIsPublishing(false);
      setTimeout(() => setFeedback(null), 5000);
    }
  };

  const handlePublishToInstagram = async () => {
    if (!selectedProduct || !selectedProduct.id) return;
    setIsPublishingInstagram(true);
    setInstagramModal({
      isOpen: true,
      stage: 'uploading',
    });

    const activeCaption =
      activeLangTab === 'ar'
        ? captionAr
        : activeLangTab === 'en'
        ? captionEn
        : `${captionEn}\n\n---\n\n${captionAr}`;

    try {
      setInstagramModal((prev) => (prev ? { ...prev, stage: 'container' } : null));

      const res = await publishToInstagramDirectly({
        productId: selectedProduct.id,
        productName: selectedProduct.name,
        caption: activeCaption,
        imageBase64: generatedImageDataUrl,
        fallbackImageUrl: selectedProduct.images?.[0],
      });

      if (res.success) {
        setInstagramModal({
          isOpen: true,
          stage: 'done',
          postId: res.postId,
          postUrl: res.postUrl || 'https://www.instagram.com/onalaastore.lb/',
        });
      } else {
        setInstagramModal({
          isOpen: true,
          stage: 'error',
          errorMsg: res.message,
          errorDetails: res.errorDetails,
          needsSetup: res.needsSetup,
          metaCode: res.metaCode,
        });
      }
    } catch (err) {
      setInstagramModal({
        isOpen: true,
        stage: 'error',
        errorMsg: err instanceof Error ? err.message : 'Instagram publish failed',
      });
    } finally {
      setIsPublishingInstagram(false);
    }
  };

  const handleEditFromHistory = (post: MarketingPost) => {
    const matched = products.find((p) => p.id === post.productId);
    if (matched) {
      setSelectedProduct(matched);
    }
    setCaptionEn(post.captionEn);
    setCaptionAr(post.captionAr);
    setHashtags(post.hashtags || []);
    setAspectRatio(post.aspectRatio || '1:1');
    setTemplate(post.templateStyle || 'modern_dark');
    setSelectedPlatforms(post.selectedPlatforms || ['facebook', 'instagram']);
    setActiveSubTab('create');
  };

  const togglePlatform = (p: SocialPlatform) => {
    if (selectedPlatforms.includes(p)) {
      setSelectedPlatforms(selectedPlatforms.filter((item) => item !== p));
    } else {
      setSelectedPlatforms([...selectedPlatforms, p]);
    }
  };

  const selectPlatformPreset = (preset: 'all' | 'meta' | 'chat') => {
    if (preset === 'all') {
      setSelectedPlatforms(['facebook', 'instagram', 'whatsapp', 'whatsapp_status', 'telegram', 'x', 'tiktok']);
    } else if (preset === 'meta') {
      setSelectedPlatforms(['facebook', 'instagram']);
    } else if (preset === 'chat') {
      setSelectedPlatforms(['whatsapp', 'whatsapp_status', 'telegram']);
    }
  };

  return (
    <div className="space-y-6">
      {/* =========================================================================
          1. MAIN SECTION HEADER: SOCIAL MEDIA MANAGER
      ========================================================================== */}
      <div className="p-6 sm:p-8 rounded-3xl bg-white border border-[#DCE5F0] shadow-xs flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#EAF3FF] border border-[#BAE6FD] text-[#007AFF] text-xs font-bold tracking-wider uppercase">
            <Share2 className="w-3.5 h-3.5" />
            <span>{isArabic ? 'مدير وسائل التواصل والنشر' : 'SOCIAL MEDIA MANAGER'}</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black text-[#172033]">
            {isArabic ? 'نشر وإدارة إعلانات المنتجات على السوشيال ميديا' : 'Social Media Marketing & Direct Publishing'}
          </h1>

          <p className="text-xs sm:text-sm text-[#64748B] max-w-2xl leading-relaxed">
            {isArabic
              ? 'إنشاء ونشر إعلانات المنتجات مباشرة عبر Meta Graph API لصفحات فيسبوك وإنستغرام للأعمال وقنوات تيليجرام بنقرة واحدة.'
              : 'Directly publish professional product advertisements to Facebook Pages, Instagram Business accounts, Telegram, and WhatsApp using official APIs.'}
          </p>

          {/* Platform API Readiness Badges */}
          <div className="flex flex-wrap items-center gap-2 pt-2 text-[11px] font-bold">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 text-[#1877F2] border border-blue-200">
              <Facebook className="w-3.5 h-3.5" />
              <span>Meta Graph API: Ready</span>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-purple-50 text-purple-700 border border-purple-200">
              <Instagram className="w-3.5 h-3.5" />
              <span>Instagram Professional</span>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-sky-50 text-[#2AABEE] border border-sky-200">
              <Send className="w-3.5 h-3.5" />
              <span>Telegram Bot API</span>
            </div>
          </div>
        </div>

        {/* Sub-Tabs Navigation */}
        <div className="flex items-center gap-1.5 p-1.5 bg-[#F5F8FC] border border-[#DCE5F0] rounded-2xl shadow-xs self-stretch lg:self-auto justify-center">
          <button
            onClick={() => setActiveSubTab('create')}
            className={`px-4 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
              activeSubTab === 'create'
                ? 'bg-[#007AFF] text-white shadow-sm'
                : 'text-[#64748B] hover:text-[#007AFF]'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>{isArabic ? 'إنشاء ونشر الإعلان' : 'Create & Publish'}</span>
          </button>

          <button
            onClick={() => setActiveSubTab('history')}
            className={`px-4 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
              activeSubTab === 'history'
                ? 'bg-[#007AFF] text-white shadow-sm'
                : 'text-[#64748B] hover:text-[#007AFF]'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>{isArabic ? 'سجل المنشورات والحملات' : 'Publishing History'}</span>
          </button>

          <button
            onClick={() => setActiveSubTab('channels')}
            className={`px-4 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
              activeSubTab === 'channels'
                ? 'bg-[#007AFF] text-white shadow-sm'
                : 'text-[#64748B] hover:text-[#007AFF]'
            }`}
          >
            <Settings className="w-4 h-4" />
            <span>{isArabic ? 'ربط الحسابات والتصاريح' : 'Accounts & API'}</span>
          </button>
        </div>
      </div>

      {feedback && (
        <div
          className={`p-4 rounded-2xl border text-xs font-bold flex items-center justify-between animate-in fade-in ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-[#16A34A]'
              : 'bg-red-50 border-red-200 text-[#DC2626]'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            <span>{feedback.msg}</span>
          </div>
          <button onClick={() => setFeedback(null)}>
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* =========================================================================
          TAB 1: CREATE & PUBLISH STUDIO
      ========================================================================== */}
      {activeSubTab === 'create' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* LEFT COLUMN: Controls & Content Editor */}
          <div className="lg:col-span-7 space-y-6">
            {/* 1. Product Selector Card */}
            <div className="p-6 rounded-3xl bg-white border border-[#DCE5F0] shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-[#DCE5F0] pb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-[#64748B]">
                  {isArabic ? '١. اختيار المنتج المراد تسويقه:' : '1. Select Product to Advertise:'}
                </span>
                <span className="text-[10px] text-[#007AFF] font-bold">
                  {products.length} {isArabic ? 'منتج متاح' : 'Products Available'}
                </span>
              </div>

              <div>
                <select
                  value={selectedProduct?.id || ''}
                  onChange={(e) => {
                    const match = products.find((p) => p.id === e.target.value);
                    if (match) setSelectedProduct(match);
                  }}
                  className="w-full bg-[#FFFFFF] border border-[#DCE5F0] rounded-xl px-3.5 py-3 text-xs text-[#172033] font-bold focus:outline-none focus:border-[#007AFF] shadow-2xs"
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      [{p.brand}] {p.name} — ${p.price} USD {p.stock <= 3 ? '(Low Stock)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Product Quick Snapshot Card */}
              {selectedProduct && selectedProduct.id && (
                <div className="p-3.5 rounded-2xl bg-[#F8FAFC] border border-[#DCE5F0] flex items-center gap-3">
                  <LazyImage
                    src={selectedProduct.images?.[0] || 'https://images.unsplash.com/photo-1511707171634-5f897ff02597?w=800'}
                    alt={selectedProduct.name}
                    width={56}
                    height={56}
                    priority={true}
                    wrapperClassName="w-14 h-14 rounded-xl overflow-hidden border border-[#DCE5F0] bg-white flex-shrink-0"
                    className="w-full h-full object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <h4 className="font-bold text-xs text-[#172033] line-clamp-1">{selectedProduct.name}</h4>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-sm font-black text-[#007AFF]">${selectedProduct.price} USD</span>
                      {selectedProduct.originalPrice && selectedProduct.originalPrice > selectedProduct.price && (
                        <>
                          <span className="text-[11px] text-[#94A3B8] line-through">
                            ${selectedProduct.originalPrice}
                          </span>
                          <span className="text-[10px] font-bold text-[#DC2626] bg-red-50 border border-red-200 px-1.5 py-0.5 rounded">
                            -{selectedProduct.discountPercentage}% OFF
                          </span>
                        </>
                      )}
                    </div>
                    <div className="text-[10px] text-[#64748B] mt-0.5">
                      Warranty: 12M Official • Online Store in Chouf • Delivery Available to All Lebanon
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 2. Visual Style & Aspect Ratio Customizer */}
            <div className="p-6 rounded-3xl bg-white border border-[#DCE5F0] shadow-xs space-y-5">
              <span className="text-xs font-bold uppercase tracking-wider text-[#64748B] block">
                {isArabic ? '٢. تصميم الإعلان والأبعاد البصرية:' : '2. Ad Layout & Design Style:'}
              </span>

              {/* Aspect Ratio Selector */}
              <div>
                <label className="text-xs font-bold text-[#172033] block mb-2">
                  {isArabic ? 'مقاس ونسبة العرض (Aspect Ratio):' : 'Aspect Ratio:'}
                </label>
                <div className="grid grid-cols-3 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setAspectRatio('1:1')}
                    className={`p-3 rounded-2xl border text-xs font-bold flex flex-col items-center gap-1 transition-all cursor-pointer ${
                      aspectRatio === '1:1'
                        ? 'bg-[#007AFF] text-white border-[#007AFF] shadow-xs'
                        : 'bg-white border-[#DCE5F0] text-[#172033] hover:border-[#007AFF]'
                    }`}
                  >
                    <span className="w-5 h-5 rounded-md border-2 border-current" />
                    <span>1:1 Square</span>
                    <span className="text-[10px] opacity-80">Feed & Carousel</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAspectRatio('9:16')}
                    className={`p-3 rounded-2xl border text-xs font-bold flex flex-col items-center gap-1 transition-all cursor-pointer ${
                      aspectRatio === '9:16'
                        ? 'bg-[#007AFF] text-white border-[#007AFF] shadow-xs'
                        : 'bg-white border-[#DCE5F0] text-[#172033] hover:border-[#007AFF]'
                    }`}
                  >
                    <span className="w-3.5 h-6 rounded-md border-2 border-current" />
                    <span>9:16 Vertical</span>
                    <span className="text-[10px] opacity-80">Stories, Reels & Status</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAspectRatio('16:9')}
                    className={`p-3 rounded-2xl border text-xs font-bold flex flex-col items-center gap-1 transition-all cursor-pointer ${
                      aspectRatio === '16:9'
                        ? 'bg-[#007AFF] text-white border-[#007AFF] shadow-xs'
                        : 'bg-white border-[#DCE5F0] text-[#172033] hover:border-[#007AFF]'
                    }`}
                  >
                    <span className="w-6 h-3.5 rounded-md border-2 border-current" />
                    <span>16:9 Landscape</span>
                    <span className="text-[10px] opacity-80">Facebook & Web Banners</span>
                  </button>
                </div>
              </div>

              {/* Graphic Template Themes */}
              <div>
                <label className="text-xs font-bold text-[#172033] block mb-2">
                  {isArabic ? 'قالب التصميم الجرافيكي:' : 'Graphic Theme:'}
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: 'modern_dark', label: 'Dark Titanium', bg: 'bg-slate-900 text-white' },
                    { id: 'minimal_white', label: 'Minimal White', bg: 'bg-white text-slate-900 border border-slate-300' },
                    { id: 'hot_deal', label: 'Hot Deals Red', bg: 'bg-gradient-to-r from-red-600 to-rose-700 text-white' },
                    { id: 'coloros_purple', label: 'Reno 16 Violet', bg: 'bg-gradient-to-r from-purple-800 to-indigo-900 text-white' },
                  ].map((tpl) => (
                    <button
                      key={tpl.id}
                      type="button"
                      onClick={() => setTemplate(tpl.id as any)}
                      className={`p-2.5 rounded-xl text-xs font-bold transition-all text-center cursor-pointer border ${tpl.bg} ${
                        template === tpl.id ? 'ring-2 ring-[#007AFF] ring-offset-2 scale-102' : 'opacity-80 hover:opacity-100'
                      }`}
                    >
                      {tpl.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Headline Override */}
              <div>
                <label className="text-xs font-bold text-[#172033] block mb-1">
                  {isArabic ? 'عنوان الإعلان المخصص (Headline Banner):' : 'Custom Ad Headline (Optional):'}
                </label>
                <input
                  type="text"
                  placeholder="e.g. 🔥 OFFICIAL LEBANON WARRANTY • CASH USD SPECIAL"
                  value={headlineOverride}
                  onChange={(e) => setHeadlineOverride(e.target.value)}
                  className="w-full bg-[#FFFFFF] border border-[#DCE5F0] rounded-xl px-3.5 py-2 text-xs text-[#172033] focus:outline-none focus:border-[#007AFF]"
                />
              </div>
            </div>

            {/* 3. Captions, Hashtags & Copy Studio */}
            <div className="p-6 rounded-3xl bg-white border border-[#DCE5F0] shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-[#DCE5F0] pb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-[#64748B]">
                  {isArabic ? '٣. صياغة النص التسويقي والهاشتاغات:' : '3. Marketing Captions & Hashtags:'}
                </span>

                {/* Language Switcher Tabs */}
                <div className="flex items-center gap-1 p-1 bg-[#F5F8FC] border border-[#DCE5F0] rounded-xl">
                  {(['bilingual', 'en', 'ar'] as const).map((langTab) => (
                    <button
                      key={langTab}
                      type="button"
                      onClick={() => setActiveLangTab(langTab)}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase cursor-pointer transition-colors ${
                        activeLangTab === langTab
                          ? 'bg-[#007AFF] text-white shadow-2xs'
                          : 'text-[#64748B] hover:text-[#007AFF]'
                      }`}
                    >
                      {langTab === 'bilingual' ? 'Bilingual' : langTab.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              {/* English Caption Field */}
              {(activeLangTab === 'en' || activeLangTab === 'bilingual') && (
                <div>
                  <label className="text-xs font-bold text-[#172033] block mb-1">
                    English Marketing Copy:
                  </label>
                  <textarea
                    rows={4}
                    value={captionEn}
                    onChange={(e) => setCaptionEn(e.target.value)}
                    className="w-full bg-[#FFFFFF] border border-[#DCE5F0] rounded-xl p-3 text-xs text-[#172033] focus:outline-none focus:border-[#007AFF]"
                  />
                </div>
              )}

              {/* Arabic Caption Field */}
              {(activeLangTab === 'ar' || activeLangTab === 'bilingual') && (
                <div>
                  <label className="text-xs font-bold text-[#172033] block mb-1">
                    النص التسويقي بالعربية:
                  </label>
                  <textarea
                    rows={4}
                    value={captionAr}
                    onChange={(e) => setCaptionAr(e.target.value)}
                    dir="rtl"
                    className="w-full bg-[#FFFFFF] border border-[#DCE5F0] rounded-xl p-3 text-xs text-[#172033] focus:outline-none focus:border-[#007AFF]"
                  />
                </div>
              )}

              {/* Hashtags Editor */}
              <div>
                <label className="text-xs font-bold text-[#172033] block mb-1.5">
                  Generated Hashtags:
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {hashtags.map((tag, idx) => (
                    <span
                      key={idx}
                      className="px-2.5 py-1 rounded-lg bg-[#EAF3FF] text-[#007AFF] text-[11px] font-bold border border-[#BAE6FD]"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* 4. Multi-Platform Selection & Publish Actions */}
            <div className="p-6 rounded-3xl bg-white border border-[#DCE5F0] shadow-xs space-y-5">
              <div className="flex items-center justify-between border-b border-[#DCE5F0] pb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-[#64748B]">
                  {isArabic ? '٤. منصات النشر المحددة:' : '4. Target Publishing Channels:'}
                </span>

                <div className="flex items-center gap-1.5 text-[10px]">
                  <button
                    type="button"
                    onClick={() => selectPlatformPreset('meta')}
                    className="px-2 py-1 rounded-md bg-blue-50 text-[#1877F2] font-bold hover:bg-blue-100"
                  >
                    Meta Only (FB+IG)
                  </button>
                  <button
                    type="button"
                    onClick={() => selectPlatformPreset('all')}
                    className="px-2 py-1 rounded-md bg-slate-100 text-slate-700 font-bold hover:bg-slate-200"
                  >
                    Select All
                  </button>
                </div>
              </div>

              {/* Platforms Checkboxes Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {[
                  { id: 'facebook', label: 'Facebook Page', icon: Facebook, color: 'text-[#1877F2]' },
                  { id: 'instagram', label: 'Instagram Feed', icon: Instagram, color: 'text-rose-500' },
                  { id: 'telegram', label: 'Telegram Channel', icon: Send, color: 'text-[#2AABEE]' },
                  { id: 'whatsapp', label: 'WhatsApp Direct', icon: Smartphone, color: 'text-[#25D366]' },
                  { id: 'whatsapp_status', label: 'WhatsApp Status', icon: Smartphone, color: 'text-[#25D366]' },
                  { id: 'x', label: 'X (Twitter)', icon: Twitter, color: 'text-black' },
                  { id: 'tiktok', label: 'TikTok Showcase', icon: Music2, color: 'text-slate-800' },
                ].map((item) => {
                  const isChecked = selectedPlatforms.includes(item.id as any);
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => togglePlatform(item.id as any)}
                      className={`p-3 rounded-2xl border text-left rtl:text-right flex items-center justify-between transition-all cursor-pointer ${
                        isChecked
                          ? 'bg-[#EAF3FF] border-[#007AFF] text-[#007AFF] shadow-xs'
                          : 'bg-white border-[#DCE5F0] text-[#64748B] hover:border-slate-400'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <Icon className={`w-4 h-4 ${item.color}`} />
                        <span className="text-xs font-bold truncate">{item.label}</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {}}
                        className="w-3.5 h-3.5 accent-[#007AFF] pointer-events-none"
                      />
                    </button>
                  );
                })}
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={handleSaveDraft}
                  className="w-full sm:w-auto px-5 py-3 rounded-2xl bg-[#F5F8FC] hover:bg-[#EAF3FF] border border-[#DCE5F0] text-[#172033] font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-colors"
                >
                  <Save className="w-4 h-4 text-[#007AFF]" />
                  <span>{isArabic ? 'حفظ كمسودة' : 'Save as Draft'}</span>
                </button>

                <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={handleCopyCaption}
                    className="px-4 py-3 rounded-2xl bg-white hover:bg-slate-50 border border-[#DCE5F0] text-[#172033] font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    {copiedCaption ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                    <span>{copiedCaption ? 'Copied!' : 'Copy Caption'}</span>
                  </button>

                  {/* Dedicated Publish to Instagram Button */}
                  <button
                    type="button"
                    onClick={handlePublishToInstagram}
                    disabled={isPublishing || isPublishingInstagram}
                    className="px-5 py-3 rounded-2xl bg-gradient-to-r from-purple-600 via-pink-600 to-amber-500 hover:opacity-95 text-white font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-pink-500/25 transition-all cursor-pointer disabled:opacity-50 active:scale-95"
                  >
                    <Instagram className={`w-4 h-4 ${isPublishingInstagram ? 'animate-spin' : ''}`} />
                    <span>
                      {isPublishingInstagram
                        ? isArabic ? 'جاري النشر لـ @onalaastore.lb...' : 'Publishing to @onalaastore.lb...'
                        : isArabic ? 'نشر على إنستغرام (@onalaastore.lb)' : 'Publish to Instagram'}
                    </span>
                  </button>

                  {/* Primary Direct Publishing Button */}
                  <button
                    type="button"
                    onClick={handlePublishDirect}
                    disabled={isPublishing || isPublishingInstagram}
                    className="flex-1 sm:flex-none px-6 py-3 rounded-2xl bg-[#007AFF] hover:bg-[#0066D6] text-white font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-[#007AFF]/25 transition-all cursor-pointer disabled:opacity-50 active:scale-95"
                  >
                    <Send className={`w-4 h-4 ${isPublishing ? 'animate-bounce' : ''}`} />
                    <span>
                      {isPublishing
                        ? isArabic
                          ? 'جاري النشر عبر Meta API...'
                          : 'Publishing via Official APIs...'
                        : isArabic
                        ? `نشر فوري للمنصات (${selectedPlatforms.length})`
                        : `Direct Publish (${selectedPlatforms.length} Channels)`}
                    </span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Live Visual Canvas & Realistic Platform Mockup */}
          <div className="lg:col-span-5 space-y-6">
            {/* Visual Canvas Designer */}
            <div className="p-6 rounded-3xl bg-white border border-[#DCE5F0] shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-[#DCE5F0] pb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-[#64748B]">
                  {isArabic ? 'معاينة التصميم الإعلاني المولد:' : 'Live Rendered Ad Graphic:'}
                </span>

                <span className="text-[10px] font-mono text-[#007AFF] bg-[#EAF3FF] px-2 py-0.5 rounded">
                  {aspectRatio} • {template}
                </span>
              </div>

              {/* Canvas Component */}
              <SocialImageCanvas
                product={selectedProduct}
                aspectRatio={aspectRatio}
                template={template}
                headlineOverride={headlineOverride}
                onImageGenerated={(dataUrl) => setGeneratedImageDataUrl(dataUrl)}
              />
            </div>

            {/* Instagram Business Dedicated Target Callout */}
            <div className="p-4 rounded-3xl bg-gradient-to-r from-purple-50 via-pink-50 to-amber-50 border border-purple-200/80 shadow-xs flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 flex items-center justify-center text-white flex-shrink-0 shadow-xs">
                  <Instagram className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-black text-xs text-[#172033]">ON AlAA STORE</span>
                    <span className="text-[10px] font-bold text-purple-700 bg-purple-100 px-1.5 py-0.5 rounded">Instagram Business</span>
                  </div>
                  <a
                    href="https://www.instagram.com/onalaastore.lb/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] font-bold text-purple-600 hover:underline flex items-center gap-1 truncate"
                  >
                    <span>@onalaastore.lb</span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                </div>
              </div>

              <button
                type="button"
                onClick={handlePublishToInstagram}
                disabled={isPublishingInstagram || isPublishing}
                className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-purple-600 via-pink-600 to-amber-500 hover:opacity-95 text-white font-bold text-[11px] flex items-center gap-1.5 shadow-sm shadow-purple-500/25 cursor-pointer disabled:opacity-50 flex-shrink-0"
              >
                <Instagram className={`w-3.5 h-3.5 ${isPublishingInstagram ? 'animate-spin' : ''}`} />
                <span>{isPublishingInstagram ? (isArabic ? 'جاري النشر...' : 'Publishing...') : (isArabic ? 'نشر فوري' : 'Publish to Instagram')}</span>
              </button>
            </div>

            {/* Social Post Preview with Platform Switcher */}
            <div className="p-6 rounded-3xl bg-white border border-[#DCE5F0] shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-[#DCE5F0] pb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-[#64748B]">
                  {isArabic ? 'معاينة شكل المنشور على المنصة:' : 'Real Social Media Post Preview:'}
                </span>

                {/* Platform Preview Selector */}
                <select
                  value={activePreviewPlatform}
                  onChange={(e) => setActivePreviewPlatform(e.target.value as any)}
                  className="bg-[#F5F8FC] border border-[#DCE5F0] rounded-xl px-2.5 py-1 text-[11px] font-bold text-[#007AFF] focus:outline-none"
                >
                  <option value="facebook">Facebook Feed</option>
                  <option value="instagram">Instagram Post</option>
                  <option value="whatsapp">WhatsApp Chat</option>
                  <option value="telegram">Telegram Broadcast</option>
                  <option value="x">X (Twitter)</option>
                </select>
              </div>

              <SocialPreviewCard
                platform={activePreviewPlatform}
                product={selectedProduct}
                imageDataUrl={generatedImageDataUrl}
                caption={
                  activeLangTab === 'ar'
                    ? captionAr
                    : activeLangTab === 'en'
                    ? captionEn
                    : `${captionEn}\n\n---\n\n${captionAr}`
                }
              />
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 2: PUBLISHING HISTORY & STATUS MANAGEMENT
      ========================================================================== */}
      {activeSubTab === 'history' && (
        <SocialPostHistory
          onEditPost={handleEditFromHistory}
          lang={isArabic ? 'ar' : 'en'}
        />
      )}

      {/* =========================================================================
          TAB 3: CONNECTED SOCIAL ACCOUNTS & SECURE API CONFIGURATION
      ========================================================================== */}
      {activeSubTab === 'channels' && (
        <SocialAccountsManager lang={isArabic ? 'ar' : 'en'} />
      )}

      {/* =========================================================================
          PUBLISHING RESULT DIALOG MODAL
      ========================================================================== */}
      {publishResultModal?.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="relative w-full max-w-lg bg-white border border-[#DCE5F0] rounded-3xl p-6 sm:p-8 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#DCE5F0] pb-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <h3 className="font-black text-sm sm:text-base text-[#172033]">
                  {isArabic ? 'نتائج النشر المباشر للحملة' : 'Direct Publishing Results'}
                </h3>
              </div>
              <button
                onClick={() => setPublishResultModal(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-[#64748B]">
              Campaign for <strong>{publishResultModal.productName}</strong> dispatched:
            </p>

            <div className="space-y-2 max-h-60 overflow-y-auto">
              {Object.entries(publishResultModal.results).map(([plt, res]: [string, any]) => (
                <div
                  key={plt}
                  className={`p-3 rounded-2xl border text-xs flex items-center justify-between gap-3 ${
                    res.success ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-rose-50 border-rose-200 text-rose-900'
                  }`}
                >
                  <div className="space-y-0.5 min-w-0">
                    <span className="font-black uppercase tracking-wider block text-[11px]">{plt}</span>
                    <p className="text-[11px] opacity-90 truncate">{res.message}</p>
                  </div>

                  {res.success && res.postUrl && (
                    <a
                      href={res.postUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 rounded-xl bg-white border border-emerald-300 text-emerald-700 font-bold text-[11px] flex items-center gap-1 hover:bg-emerald-50 flex-shrink-0"
                    >
                      <span>View</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              ))}
            </div>

            <div className="pt-3 border-t border-[#DCE5F0] flex justify-end">
              <button
                onClick={() => setPublishResultModal(null)}
                className="px-5 py-2.5 rounded-xl bg-[#007AFF] text-white text-xs font-bold hover:bg-[#0066D6] cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          INSTAGRAM DIRECT PUBLISHING MODAL FOR ON AlAA STORE
      ========================================================================== */}
      {instagramModal?.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg bg-white border border-[#DCE5F0] rounded-3xl p-6 sm:p-8 space-y-5 shadow-2xl my-8">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-[#DCE5F0] pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 flex items-center justify-center text-white shadow-md shadow-pink-500/20">
                  <Instagram className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-sm sm:text-base text-[#172033] flex items-center gap-1.5">
                    <span>{isArabic ? 'النشر على إنستغرام للأعمال' : 'Publish to Instagram Business'}</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">Meta v21.0</span>
                  </h3>
                  <a
                    href="https://www.instagram.com/onalaastore.lb/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-bold text-purple-600 hover:underline flex items-center gap-1"
                  >
                    <span>ON AlAA STORE (@onalaastore.lb)</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>

              <button
                onClick={() => setInstagramModal(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Target Product Summary */}
            <div className="p-3.5 rounded-2xl bg-[#F5F8FC] border border-[#DCE5F0] flex items-center gap-3">
              {selectedProduct.images?.[0] && (
                <LazyImage
                  src={selectedProduct.images[0]}
                  alt={selectedProduct.name}
                  width={48}
                  height={48}
                  priority={true}
                  wrapperClassName="w-12 h-12 rounded-xl overflow-hidden bg-white border border-[#DCE5F0] p-1 flex-shrink-0"
                  className="w-full h-full object-contain"
                />
              )}
              <div className="min-w-0 flex-1">
                <h4 className="text-xs font-bold text-[#172033] truncate">{selectedProduct.name}</h4>
                <div className="text-[11px] text-[#007AFF] font-bold">
                  ${selectedProduct.price} USD • Cash on Delivery Across All Lebanon
                </div>
              </div>
            </div>

            {/* Progress / State Steps */}
            {(instagramModal.stage === 'uploading' || instagramModal.stage === 'container' || instagramModal.stage === 'publishing') && (
              <div className="p-5 rounded-2xl bg-purple-50/60 border border-purple-200/60 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 border-2 border-purple-600 border-t-transparent rounded-full animate-spin flex-shrink-0" />
                  <span className="text-xs font-bold text-purple-900">
                    {instagramModal.stage === 'uploading' && (isArabic ? 'جاري تجهيز الصورة الإعلانية فائقة الدقة...' : 'Processing high-resolution promotional image...')}
                    {instagramModal.stage === 'container' && (isArabic ? 'جاري إنشاء حاوية وسائط Meta Instagram Container...' : 'Creating Instagram Media Container via Meta Graph API...')}
                    {instagramModal.stage === 'publishing' && (isArabic ? 'جاري نشر الحاوية في موجز @onalaastore.lb...' : 'Publishing container to @onalaastore.lb feed...')}
                  </span>
                </div>
                <div className="text-[11px] text-purple-700 font-mono">
                  Endpoint: POST https://graph.facebook.com/v21.0/&#123;ig-user-id&#125;/media
                </div>
              </div>
            )}

            {/* Success State */}
            {instagramModal.stage === 'done' && (
              <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-950 space-y-3">
                <div className="flex items-center gap-2 text-emerald-700 font-black text-sm">
                  <CheckCircle2 className="w-5 h-5" />
                  <span>{isArabic ? 'تم النشر بنجاح على إنستغرام!' : 'Published Successfully to @onalaastore.lb!'}</span>
                </div>
                <p className="text-xs text-emerald-800 leading-relaxed">
                  {isArabic
                    ? 'تم نشر تصميم المنتج والنص التسويقي والكفالة مباشرة في حساب إنستغرام الرسمي لـ ON AlAA STORE.'
                    : 'Your product graphic, pricing, warranty, and hashtags have been published directly to ON AlAA STORE on Instagram.'}
                </p>
                {instagramModal.postId && (
                  <div className="text-[11px] font-mono text-emerald-800 bg-emerald-100/60 p-2 rounded-xl">
                    Meta Container / Media ID: {instagramModal.postId}
                  </div>
                )}
                <div className="pt-2 flex items-center gap-2">
                  <a
                    href="https://www.instagram.com/onalaastore.lb/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold text-xs flex items-center justify-center gap-1.5 hover:opacity-95 shadow-md shadow-pink-500/20"
                  >
                    <span>View on Instagram (@onalaastore.lb)</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            )}

            {/* Error / Setup Required State */}
            {instagramModal.stage === 'error' && (
              <div className="p-5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-950 space-y-3">
                <div className="flex items-center gap-2 text-rose-700 font-black text-sm">
                  <AlertCircle className="w-5 h-5 flex-shrink-0" />
                  <span>
                    {instagramModal.needsSetup
                      ? isArabic ? 'إعدادات ربط @onalaastore.lb مطلوبة' : 'Meta API Connection Setup Required'
                      : isArabic ? 'تعذر النشر على إنستغرام' : 'Instagram Publishing Error'}
                  </span>
                </div>

                <p className="text-xs text-rose-900 leading-relaxed">
                  {instagramModal.errorMsg || 'Could not complete Instagram Graph API publishing.'}
                </p>

                {instagramModal.errorDetails && (
                  <div className="p-3 bg-white/80 rounded-xl border border-rose-200/80 text-[11px] font-mono text-rose-800 break-words">
                    {instagramModal.errorDetails}
                    {instagramModal.metaCode && ` (Meta Code: ${instagramModal.metaCode})`}
                  </div>
                )}

                <div className="p-3 bg-purple-50/70 border border-purple-200/70 rounded-xl space-y-1.5 text-xs text-purple-900">
                  <span className="font-bold block text-[11px] uppercase tracking-wider text-purple-800">
                    {isArabic ? 'المتطلبات الرسمية لـ Meta Graph API:' : 'Required Meta Developer Setup:'}
                  </span>
                  <ul className="list-disc list-inside space-y-0.5 text-[11px] text-purple-800/90">
                    <li>Link Instagram Business account <strong>@onalaastore.lb</strong> to your Facebook Page</li>
                    <li>Generate a Page Access Token with <code>instagram_content_publish</code> & <code>instagram_basic</code></li>
                    <li>Enter your Instagram Business Account ID in <em>Accounts & API</em></li>
                  </ul>
                </div>

                <div className="pt-2 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setInstagramModal(null);
                      setActiveSubTab('channels');
                    }}
                    className="flex-1 py-2.5 px-4 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                  >
                    <Settings className="w-3.5 h-3.5" />
                    <span>{isArabic ? 'إعداد مفاتيح وتصاريح @onalaastore.lb' : 'Configure @onalaastore.lb Credentials'}</span>
                  </button>
                </div>
              </div>
            )}

            {/* Modal Footer Close */}
            <div className="pt-3 border-t border-[#DCE5F0] flex justify-end">
              <button
                type="button"
                onClick={() => setInstagramModal(null)}
                className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold cursor-pointer"
              >
                {isArabic ? 'إغلاق' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
