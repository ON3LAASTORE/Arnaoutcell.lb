import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useShop } from '../context/ShopContext';
import {
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Truck,
  Clock,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Camera,
  Zap,
  Smartphone,
  CheckCircle,
  X,
  Layers,
  ChevronRight,
} from 'lucide-react';
import { WhatsApp3DIcon, Orbit3DIcon } from './icons/ThreeDIcons';
import { Product } from '../types';

export const HeroSection: React.FC = () => {
  const {
    lang,
    storeSettings,
    setCurrentView,
    selectBrand,
    products,
    setQuickViewProduct,
  } = useShop();

  // Video element ref & state
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [isInteractiveModalOpen, setIsInteractiveModalOpen] = useState(false);

  // Reno 16 Series 5G product from inventory
  const renoProduct: Product | undefined =
    products.find((p) => p.id === 'prod-oppo-reno16-series-5g' && p.isPublished) ||
    products.find((p) => p.brand.toLowerCase() === 'oppo' && p.isPublished) ||
    products[0];

  // Toggle Video Playback
  const togglePlay = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play().catch(() => {});
      setIsPlaying(true);
    }
  };

  // Toggle Video Audio Mute
  const toggleMute = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!videoRef.current) return;
    const nextMuted = !isMuted;
    videoRef.current.muted = nextMuted;
    setIsMuted(nextMuted);

    // If video was paused, unmuting should play it
    if (videoRef.current.paused) {
      videoRef.current.play().catch(() => {});
      setIsPlaying(true);
    }
  };

  // Auto-play on mount
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = true;
      videoRef.current.play().catch(() => {
        setIsPlaying(false);
      });
    }
  }, []);

  const handleExploreReno = () => {
    selectBrand('Oppo');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleWhatsAppBuyNow = () => {
    const phone = storeSettings.whatsapp || '96181900916';
    const text = encodeURIComponent(
      lang === 'ar'
        ? `مرحباً أرناؤوط ستور! أود طلب وشراء هاتف OPPO Reno 16 Series 5G الجديد (إصدار 3D Pop Planet):\n- السعر: $${renoProduct?.price || 629} USD\n- الكفالة: كفالة رسمية معتمدة 12 شهراً\nالرجاء تأكيد التوفر والتوصيل في صيدا / لبنان.`
        : `Hello ARNAOUT STORE! I want to buy the all-new OPPO Reno 16 Series 5G (3D Pop Planet Edition):\n- Price: $${renoProduct?.price || 629} USD\n- Warranty: 1-Year Official Lebanon Warranty\nPlease confirm availability and express delivery across Lebanon.`
    );
    window.open(`https://wa.me/${phone}?text=${text}`, '_blank');
  };

  return (
    <>
      <section className="relative w-full min-h-[100dvh] lg:min-h-[780px] flex items-center justify-center overflow-hidden bg-[#0A0718] dark:bg-[#060410] text-white selection:bg-[#9333EA] selection:text-white pt-8 pb-14 md:py-16 border-b border-purple-950/40">
        {/* =========================================================================
            1. DYNAMIC COLOROS 16 AMBIENT PURPLE & VIOLET GLOWS
        ========================================================================== */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {/* Subtle Grid Matrix */}
          <div className="absolute inset-0 bg-[radial-gradient(#9333EA_1px,transparent_1px)] [background-size:32px_32px] opacity-15" />

          {/* Deep Violet / Cosmic Purple Radial Glows */}
          <div className="absolute top-1/4 -left-20 w-[600px] h-[600px] bg-purple-600/20 blur-[160px] rounded-full" />
          <div className="absolute top-1/3 -right-20 w-[600px] h-[600px] bg-violet-600/25 blur-[170px] rounded-full" />
          <div className="absolute -bottom-20 left-1/3 w-[500px] h-[500px] bg-fuchsia-600/15 blur-[160px] rounded-full" />
          <div className="absolute top-10 left-1/2 -translate-x-1/2 w-[700px] h-[260px] bg-indigo-500/10 blur-[130px] rounded-full" />

          {/* 3D Pop Planet Ambient Orbit Ring */}
          <div className="hidden lg:block absolute right-12 top-1/2 -translate-y-1/2 w-[550px] h-[550px] rounded-full border border-purple-400/15 animate-[spin_60s_linear_infinite]" />
          <div className="hidden lg:block absolute right-24 top-1/2 -translate-y-1/2 w-[430px] h-[430px] rounded-full border border-violet-400/10 animate-[spin_40s_linear_infinite_reverse]" />
        </div>

        {/* =========================================================================
            2. MAIN HERO CONTAINER (RESPONSIVE SPLIT ON DESKTOP, MOBILE-FIRST TOUCH)
        ========================================================================== */}
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
            {/* -----------------------------------------------------------------------
                LEFT COLUMN: COPYWRITING, 3 BADGES, AND CTA BUTTONS
            ------------------------------------------------------------------------ */}
            <div className="lg:col-span-7 space-y-6 text-center lg:text-left rtl:lg:text-right order-2 lg:order-1">
              {/* Brand Kicker / Star Badge */}
              <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-purple-500/15 border border-purple-400/30 text-[#C084FC] text-xs font-black tracking-wider uppercase backdrop-blur-md shadow-sm shadow-purple-950/30">
                <span className="w-2 h-2 rounded-full bg-[#C084FC] animate-ping" />
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span>
                  {lang === 'ar'
                    ? 'هاتف الذكاء الاصطناعي • COLOROS 16'
                    : 'OPPO AI PHONE • POWERED BY COLOROS 16'}
                </span>
              </div>

              {/* Main Heading */}
              <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-[1.1]">
                {lang === 'ar' ? (
                  <>
                    <span className="block text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-100 to-purple-200">
                      تعرّف على سلسلة
                    </span>
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#C084FC] via-[#A855F7] to-[#E879F9]">
                      أوبو رينو 16 الجديدة كلياً 5G
                    </span>
                  </>
                ) : (
                  <>
                    <span className="block text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-100 to-purple-200">
                      Meet the All-New
                    </span>
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#C084FC] via-[#A855F7] to-[#E879F9]">
                      OPPO Reno 16 Series 5G
                    </span>
                  </>
                )}
              </h1>

              {/* Subtitle */}
              <p className="text-slate-200 text-sm sm:text-base lg:text-lg leading-relaxed max-w-2xl font-normal drop-shadow-sm mx-auto lg:mx-0">
                {lang === 'ar'
                  ? 'اكتشف تصميم 3D Pop Planet الفريد، تقنية HoloVerse 3D، وأحدث ميزات كاميرا الذكاء الاصطناعي.'
                  : 'Experience 3D Pop Planet Design, HoloVerse 3D Tech, and Advanced AI Camera Features.'}
              </p>

              {/* ===================================================================
                  FEATURE BADGES (THE 3 MANDATORY HIGHLIGHTS)
              ==================================================================== */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-left rtl:text-right">
                {/* Badge 1: 3D Pop Planet & HoloVerse Tech */}
                <div className="p-3.5 rounded-2xl bg-white/5 dark:bg-[#130E26]/80 border border-purple-400/25 backdrop-blur-md shadow-sm hover:border-purple-400/60 transition-all group">
                  <div className="flex items-center gap-2.5 mb-1.5">
                    <span className="text-base">✨</span>
                    <h4 className="text-xs font-black text-white leading-tight">
                      {lang === 'ar'
                        ? 'تصميم 3D Pop Planet وتقنية HoloVerse'
                        : '3D Pop Planet & HoloVerse Tech'}
                    </h4>
                  </div>
                  <p className="text-[11px] text-purple-200/80 leading-snug">
                    {lang === 'ar'
                      ? 'طبقات ثلاثية الأبعاد انسيابية تعكس الضوء والأناقة'
                      : 'Futuristic floating planet finish & holographic 3D depth'}
                  </p>
                </div>

                {/* Badge 2: 50MP Ultra-Wide Selfie Camera & AI Remix Collage */}
                <div className="p-3.5 rounded-2xl bg-white/5 dark:bg-[#130E26]/80 border border-purple-400/25 backdrop-blur-md shadow-sm hover:border-purple-400/60 transition-all group">
                  <div className="flex items-center gap-2.5 mb-1.5">
                    <span className="text-base">📸</span>
                    <h4 className="text-xs font-black text-white leading-tight">
                      {lang === 'ar'
                        ? 'كاميرا سيلفي 50MP وكولاج AI Remix'
                        : '50MP Ultra-Wide Selfie Camera & AI Remix Collage'}
                    </h4>
                  </div>
                  <p className="text-[11px] text-purple-200/80 leading-snug">
                    {lang === 'ar'
                      ? 'تصوير بورتريه سينمائي فائق الدقة بالذكاء الاصطناعي'
                      : 'AI portrait engine with instant smart composition'}
                  </p>
                </div>

                {/* Badge 3: Ultra-Slim One-Piece Body */}
                <div className="p-3.5 rounded-2xl bg-white/5 dark:bg-[#130E26]/80 border border-purple-400/25 backdrop-blur-md shadow-sm hover:border-purple-400/60 transition-all group">
                  <div className="flex items-center gap-2.5 mb-1.5">
                    <span className="text-base">⚡</span>
                    <h4 className="text-xs font-black text-white leading-tight">
                      {lang === 'ar'
                        ? 'هيكل انسيابي فائق النحافة'
                        : 'Ultra-Slim One-Piece Body'}
                    </h4>
                  </div>
                  <p className="text-[11px] text-purple-200/80 leading-snug">
                    {lang === 'ar'
                      ? 'ملمس ناعم بدون حواف حادة مع خفة وزن مذهلة'
                      : 'One-piece sculpted glass with aerospace lightweight alloy'}
                  </p>
                </div>
              </div>

              {/* ===================================================================
                  ACTION BUTTONS (PRIMARY & SECONDARY CTAs)
              ==================================================================== */}
              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 pt-3">
                {/* Primary Button: Explore Reno 16 Series */}
                <button
                  type="button"
                  onClick={handleExploreReno}
                  className="w-full sm:w-auto px-7 py-4 rounded-2xl bg-gradient-to-r from-[#9333EA] via-[#A855F7] to-[#7E22CE] hover:from-[#A855F7] hover:to-[#9333EA] text-white font-black text-sm shadow-xl shadow-purple-600/35 hover:shadow-purple-600/50 transition-all flex items-center justify-center gap-2.5 cursor-pointer transform hover:-translate-y-0.5 active:scale-98 group"
                >
                  <span>{lang === 'ar' ? 'استكشف سلسلة Reno 16' : 'Explore Reno 16 Series'}</span>
                  <ArrowRight className="w-4 h-4 rtl:rotate-180 group-hover:translate-x-1 rtl:group-hover:-translate-x-1 transition-transform" />
                </button>

                {/* Secondary Button: Buy Now via WhatsApp */}
                <button
                  type="button"
                  onClick={handleWhatsAppBuyNow}
                  className="w-full sm:w-auto px-6 py-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-green-700 hover:from-emerald-700 hover:to-green-800 text-white font-black text-sm shadow-lg shadow-emerald-700/30 hover:shadow-emerald-700/50 transition-all flex items-center justify-center gap-2.5 cursor-pointer transform hover:-translate-y-0.5 active:scale-98"
                >
                  <WhatsApp3DIcon size={20} />
                  <span>{lang === 'ar' ? 'شراء فوري عبر واتساب' : 'Buy Now via WhatsApp'}</span>
                </button>

                {/* 3D Model Quick Trigger */}
                {renoProduct && (
                  <button
                    type="button"
                    onClick={() => setQuickViewProduct(renoProduct)}
                    className="w-full sm:w-auto px-4 py-4 rounded-2xl bg-white/10 hover:bg-white/20 text-purple-200 hover:text-white font-bold text-xs border border-purple-400/30 backdrop-blur-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                    title="Interactive 3D View"
                  >
                    <Orbit3DIcon size={18} />
                    <span className="hidden sm:inline">{lang === 'ar' ? 'معاينة 3D' : '3D View'}</span>
                  </button>
                )}
              </div>

              {/* Trust & Saida Delivery Guarantees */}
              <div className="grid grid-cols-3 gap-2 pt-3 border-t border-purple-900/30 text-[11px] text-purple-200/80">
                <div className="flex items-center justify-center lg:justify-start gap-1.5">
                  <Truck className="w-3.5 h-3.5 text-[#38BDF8] flex-shrink-0" />
                  <span className="truncate">{lang === 'ar' ? 'توصيل لكافة لبنان' : 'Lebanon Express'}</span>
                </div>
                <div className="flex items-center justify-center lg:justify-start gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                  <span className="truncate">{lang === 'ar' ? 'كفالة معتمدة 12 شهر' : '1-Year Warranty'}</span>
                </div>
                <div className="flex items-center justify-center lg:justify-start gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-amber-300 flex-shrink-0" />
                  <span className="truncate">{lang === 'ar' ? 'صيدا ساحة النجمة' : 'Saida Showroom'}</span>
                </div>
              </div>
            </div>

            {/* -----------------------------------------------------------------------
                RIGHT COLUMN: GLASSMORPHISM DEVICE FRAME (9:16 VERTICAL PROMOTIONAL VIDEO)
            ------------------------------------------------------------------------ */}
            <div className="lg:col-span-5 flex flex-col items-center justify-center relative order-1 lg:order-2">
              {/* Outer Cosmic Halo */}
              <div className="absolute w-[320px] sm:w-[420px] h-[540px] sm:h-[680px] bg-gradient-to-tr from-purple-600/30 via-violet-600/20 to-pink-600/25 blur-[90px] rounded-full pointer-events-none" />

              {/* Floating Holographic Badge */}
              <div className="relative mb-3 flex items-center justify-between w-full max-w-[280px] sm:max-w-[340px] px-2 text-xs">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/20 border border-purple-400/40 text-purple-200 font-extrabold text-[11px] shadow-sm backdrop-blur-md">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>OPPO RENO 16 SERIES 5G</span>
                </span>
                <span className="text-[11px] font-mono text-purple-300 font-bold bg-black/40 px-2 py-0.5 rounded-md border border-white/10">
                  ${renoProduct?.price || 629} USD
                </span>
              </div>

              {/* ===================================================================
                  THE GLASSMORPHISM SMARTPHONE DEVICE FRAME (9:16 RATIO)
              ==================================================================== */}
              <div
                className="relative aspect-[9/16] w-[270px] sm:w-[320px] md:w-[350px] lg:w-[370px] rounded-[44px] sm:rounded-[52px] p-[6px] sm:p-[8px] bg-gradient-to-b from-purple-300/40 via-purple-900/30 to-violet-500/40 border-2 border-purple-300/50 shadow-[0_20px_70px_-15px_rgba(168,85,247,0.55)] backdrop-blur-2xl group transition-transform duration-500 hover:scale-[1.01]"
              >
                {/* Sleek Inner Metallic Frame Rim */}
                <div className="relative w-full h-full rounded-[38px] sm:rounded-[46px] overflow-hidden bg-black shadow-inner border border-white/20 flex items-center justify-center">
                  {/* Dynamic Island / Front Camera Punch Hole */}
                  <div className="absolute top-3 left-1/2 -translate-x-1/2 z-30 w-24 h-4 bg-black/80 rounded-full border border-white/15 flex items-center justify-center gap-2 px-2 pointer-events-none">
                    <span className="w-2 h-2 rounded-full bg-emerald-400/90" />
                    <span className="text-[8px] font-mono tracking-wider text-purple-200">OPPO AI</span>
                  </div>

                  {/* High Quality 9:16 Video Player */}
                  <video
                    ref={videoRef}
                    autoPlay
                    loop
                    muted={isMuted}
                    playsInline
                    preload="auto"
                    onLoadedData={() => setVideoLoaded(true)}
                    className="w-full h-full object-cover object-center cursor-pointer"
                    onClick={togglePlay}
                  >
                    <source src="/videos/oppo-reno16-series-5g.mp4" type="video/mp4" />
                    <source
                      src="/assets/aistudio/____..._________________________________________________OPPO_Reno16_F_5G__OPPOReno16Series__1__4ef3f86a.mp4"
                      type="video/mp4"
                    />
                  </video>

                  {/* Gradient Overlay for Edge Depth */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20 pointer-events-none z-10" />

                  {/* Custom Sleek Sound Toggle Overlay (Prominent button with state feedback) */}
                  <button
                    type="button"
                    onClick={toggleMute}
                    aria-label={isMuted ? 'Unmute video sound' : 'Mute video sound'}
                    className={`absolute bottom-4 right-4 rtl:right-auto rtl:left-4 z-30 p-2.5 sm:p-3 rounded-full backdrop-blur-xl border transition-all cursor-pointer shadow-lg active:scale-95 flex items-center gap-2 group ${
                      isMuted
                        ? 'bg-black/75 hover:bg-black/90 text-slate-200 border-white/25 hover:border-purple-400/60'
                        : 'bg-gradient-to-r from-purple-600 to-violet-600 text-white border-purple-300 shadow-purple-600/50'
                    }`}
                  >
                    {isMuted ? (
                      <>
                        <VolumeX className="w-4 h-4 text-purple-300 group-hover:scale-110 transition-transform" />
                        <span className="text-[10px] font-bold tracking-tight pr-1 rtl:pr-0 rtl:pl-1">
                          {lang === 'ar' ? 'تشغيل الصوت' : 'Unmute'}
                        </span>
                      </>
                    ) : (
                      <>
                        <Volume2 className="w-4 h-4 text-white animate-pulse" />
                        <span className="text-[10px] font-bold tracking-tight pr-1 rtl:pr-0 rtl:pl-1">
                          {lang === 'ar' ? 'الصوت يعمل' : 'Sound On'}
                        </span>
                      </>
                    )}
                  </button>

                  {/* Play/Pause Minimal Indicator Overlay */}
                  <button
                    type="button"
                    onClick={togglePlay}
                    aria-label={isPlaying ? 'Pause video' : 'Play video'}
                    className="absolute bottom-4 left-4 rtl:left-auto rtl:right-4 z-30 p-2.5 rounded-full bg-black/60 hover:bg-black/80 text-white border border-white/20 backdrop-blur-md transition-all cursor-pointer opacity-70 hover:opacity-100"
                  >
                    {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                  </button>

                  {/* Glass Reflection Highlight */}
                  <div className="absolute top-0 right-0 w-2/3 h-full bg-gradient-to-bl from-white/10 via-transparent to-transparent pointer-events-none z-20" />
                </div>
              </div>

              {/* Under-Frame Quick Caption */}
              <div className="mt-3 text-center text-xs text-purple-200/90 font-medium flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span>
                  {lang === 'ar'
                    ? 'فيديو ترويجي رسمي • اضغط لتشغيل الصوت والموسيقى'
                    : 'Official Promo Reel • Tap video frame for audio'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
};
