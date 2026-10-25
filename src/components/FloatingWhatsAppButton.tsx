import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useShop } from '../context/ShopContext';
import { WhatsApp3DIcon } from './icons/ThreeDIcons';
import { MessageSquare, Sparkles, X, Send } from 'lucide-react';

export const FloatingWhatsAppButton: React.FC = () => {
  const { lang, storeSettings } = useShop();
  const [isHovered, setIsHovered] = useState(false);
  const [showTooltip, setShowTooltip] = useState(true);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [glare, setGlare] = useState({ x: 30, y: 30, opacity: 0.3 });
  const buttonRef = useRef<HTMLDivElement>(null);

  // Auto-dismiss initial tooltip after 8 seconds if untouched
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowTooltip(false);
    }, 8000);
    return () => clearTimeout(timer);
  }, []);

  // Mouse move handler for realistic 3D perspective tilt & specular reflection
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    // Calculate rotation (-18 to 18 deg)
    const rotateY = ((x - centerX) / centerX) * 16;
    const rotateX = -((y - centerY) / centerY) * 16;

    setTilt({ x: rotateX, y: rotateY });
    setGlare({
      x: (x / rect.width) * 100,
      y: (y / rect.height) * 100,
      opacity: 0.6,
    });
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    setTilt({ x: 0, y: 0 });
    setGlare({ x: 30, y: 30, opacity: 0.25 });
  };

  const handleWhatsAppClick = () => {
    const phone = storeSettings.whatsapp || '96181900916';
    const text = encodeURIComponent(
      lang === 'ar'
        ? `مرحباً أرناؤوط ستور! أنا أتواصل معكم من المتجر الإلكتروني بخصوص استفسار / طلب أجهزة وعروض.`
        : `Hello ARNAOUT STORE! I am reaching out from your website regarding products and special offers.`
    );
    window.open(`https://wa.me/${phone}?text=${text}`, '_blank');
  };

  return (
    <div
      style={{
        bottom: 'max(1.5rem, calc(env(safe-area-inset-bottom, 0px) + 1rem))',
        right: lang === 'ar' ? 'auto' : 'max(1.5rem, calc(env(safe-area-inset-right, 0px) + 1rem))',
        left: lang === 'ar' ? 'max(1.5rem, calc(env(safe-area-inset-left, 0px) + 1rem))' : 'auto',
      }}
      className={`fixed z-50 flex items-end gap-3 select-none pointer-events-auto transition-transform ${
        lang === 'ar' ? 'flex-row-reverse' : 'flex-row'
      }`}
    >
      {/* Interactive Engagement Tooltip Callout */}
      <AnimatePresence>
        {(showTooltip || isHovered) && (
          <motion.div
            initial={{ opacity: 0, scale: 0.85, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.85, y: 10 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            onClick={handleWhatsAppClick}
            className="cursor-pointer max-w-xs p-3.5 rounded-2xl bg-white/95 dark:bg-[#0E172A]/95 backdrop-blur-xl border border-emerald-500/30 dark:border-emerald-500/40 shadow-[0_12px_35px_-5px_rgba(18,140,126,0.35)] dark:shadow-[0_12px_35px_-5px_rgba(0,0,0,0.6)] mb-1"
          >
            <div className="flex items-start justify-between gap-2 mb-1">
              <div className="flex items-center gap-1.5">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
                </span>
                <span className="text-[11px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                  {lang === 'ar' ? 'خدمة صيدا المباشرة' : 'Saida Direct Chat'}
                </span>
              </div>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowTooltip(false);
                }}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors p-0.5"
                aria-label="Dismiss chat tooltip"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <p className="text-xs font-bold text-[#172033] dark:text-[#F8FAFC] leading-snug">
              {lang === 'ar'
                ? 'استفسار أو طلب فوري عبر واتساب 81900916'
                : 'Inquire or Order on WhatsApp (81900916)'}
            </p>

            <div className="mt-2 flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 pt-1.5 border-t border-slate-100 dark:border-slate-800">
              <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold">
                <Sparkles className="w-3 h-3" />
                {lang === 'ar' ? 'رد سريع وتوصيل لكافة لبنان' : 'Fast Reply • All Lebanon Delivery'}
              </span>
              <span className="font-mono font-bold text-slate-700 dark:text-slate-300">81 900 916</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 3D Floating Perspective Button Container */}
      <div
        ref={buttonRef}
        onMouseMove={handleMouseMove}
        onMouseEnter={() => {
          setIsHovered(true);
          setShowTooltip(true);
        }}
        onMouseLeave={handleMouseLeave}
        onClick={handleWhatsAppClick}
        style={{ perspective: 1000 }}
        className="relative group cursor-pointer"
      >
        {/* Subtle Pulse Radar Ripple Ring */}
        <span
          className="absolute -inset-2 rounded-full bg-emerald-500/30 dark:bg-emerald-400/25 animate-ping pointer-events-none"
          style={{ animationDuration: '2.4s' }}
        />

        {/* Ambient Floating Glow Ring */}
        <span
          className="absolute -inset-1 rounded-full bg-gradient-to-tr from-emerald-500 via-[#25D366] to-teal-400 blur-md opacity-70 group-hover:opacity-100 transition-opacity animate-pulse pointer-events-none"
          style={{ animationDuration: '3s' }}
        />

        {/* 3D Ground Shadow that floats beneath the button */}
        <div
          style={{
            transform: `translate3d(0, ${isHovered ? '28px' : '22px'}, -30px) scale(${isHovered ? 1.15 : 0.95})`,
            filter: 'blur(8px)',
          }}
          className="absolute inset-x-2 bottom-0 h-4 bg-emerald-950/60 dark:bg-black/80 rounded-full transition-transform duration-300 pointer-events-none"
        />

        {/* Realistic Floating 3D Button Sphere with CSS Perspective */}
        <motion.div
          animate={
            isHovered
              ? {
                  rotateX: tilt.x,
                  rotateY: tilt.y,
                  scale: 1.08,
                  y: -6,
                }
              : {
                  rotateX: [0, 4, -4, 0],
                  rotateY: [0, -6, 6, 0],
                  y: [0, -6, 2, 0],
                }
          }
          transition={
            isHovered
              ? { type: 'spring', stiffness: 350, damping: 20 }
              : { duration: 4.5, repeat: Infinity, ease: 'easeInOut' }
          }
          style={{
            transformStyle: 'preserve-3d',
          }}
          className="relative w-16 h-16 sm:w-17 sm:h-17 rounded-full bg-gradient-to-br from-[#4EFA8B] via-[#25D366] to-[#128C7E] p-0.5 shadow-[0_12px_28px_rgba(18,140,126,0.5),0_4px_12px_rgba(0,0,0,0.3)] border-2 border-emerald-200/60 dark:border-emerald-400/40 flex items-center justify-center transition-shadow duration-300 group-hover:shadow-[0_16px_36px_rgba(37,211,102,0.65),0_6px_16px_rgba(0,0,0,0.4)]"
          aria-label="Contact us on WhatsApp"
        >
          {/* Internal Specular Glass Dome Reflection Layer */}
          <div
            style={{
              transform: 'translateZ(18px)',
              background: `radial-gradient(circle at ${glare.x}% ${glare.y}%, rgba(255,255,255,${glare.opacity}) 0%, rgba(255,255,255,0) 65%)`,
            }}
            className="absolute inset-0 rounded-full pointer-events-none transition-opacity duration-150"
          />

          {/* 3D Elevated WhatsApp Icon in Forefront */}
          <div
            style={{
              transform: 'translateZ(26px)',
            }}
            className="flex items-center justify-center filter drop-shadow-[0_4px_8px_rgba(0,0,0,0.3)]"
          >
            <WhatsApp3DIcon size={36} />
          </div>

          {/* Online Notification Dot Badge on Rim */}
          <div
            style={{
              transform: 'translateZ(32px)',
            }}
            className="absolute -top-1 -right-1 rtl:-left-1 rtl:-right-auto w-5 h-5 rounded-full bg-white dark:bg-[#0B1120] border-2 border-emerald-500 flex items-center justify-center shadow-md"
          >
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          </div>
        </motion.div>
      </div>
    </div>
  );
};
