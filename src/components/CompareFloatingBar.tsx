import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useShop } from '../context/ShopContext';
import { Scale, X, ArrowRight, Trash2, Smartphone } from 'lucide-react';
import { MAX_COMPARE_LIMIT } from '../utils/compareHelpers';
import { LazyImage } from './LazyImage';

export const CompareFloatingBar: React.FC = () => {
  const {
    lang,
    compareList,
    removeFromCompare,
    clearCompareList,
    setIsCompareModalOpen,
  } = useShop();

  const isArabic = lang === 'ar';

  if (compareList.length === 0) return null;

  return (
    <AnimatePresence>
      <motion.div
        data-testid="compare-floating-bar"
        initial={{ y: 80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 80, opacity: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="fixed bottom-5 left-1/2 -translate-x-1/2 z-40 w-[95%] max-w-2xl px-4 py-3 rounded-2xl sm:rounded-full bg-[#0E1726]/95 dark:bg-[#070C16]/95 text-white backdrop-blur-xl border border-white/20 shadow-2xl shadow-black/50 flex flex-col sm:flex-row items-center justify-between gap-3"
      >
        {/* Left: Counter & Selected Thumbnails */}
        <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-start">
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="w-8 h-8 rounded-full bg-[#007AFF] text-white flex items-center justify-center shadow-md shadow-[#007AFF]/40">
              <Scale className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-black block">
                {isArabic ? 'المقارنة الفنية' : 'Compare'}
              </span>
              <span className="text-[10px] text-slate-300 font-bold">
                {compareList.length} / {MAX_COMPARE_LIMIT}{' '}
                {isArabic ? 'أجهزة مختارة' : 'Selected'}
              </span>
            </div>
          </div>

          {/* Product Thumbnails */}
          <div className="flex items-center gap-2">
            {compareList.map((product) => (
              <div
                key={product.id}
                className="relative group w-10 h-10 rounded-xl bg-white/10 border border-white/20 p-1 flex items-center justify-center"
                title={isArabic ? product.nameAr || product.name : product.name}
              >
                <LazyImage
                  src={product.images[0] || 'https://images.unsplash.com/photo-1511707171634-5f897ff02597?w=100'}
                  alt={product.name}
                  width={36}
                  height={36}
                  priority={true}
                  wrapperClassName="w-full h-full flex items-center justify-center"
                  className="w-full h-full object-contain"
                />
                <button
                  type="button"
                  onClick={() => removeFromCompare(product.id)}
                  aria-label="Remove from compare"
                  className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-rose-600 hover:bg-rose-700 text-white flex items-center justify-center text-[10px] transition-transform hover:scale-110 cursor-pointer shadow-sm"
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              </div>
            ))}

            {/* Empty Slots Indicator */}
            {compareList.length < MAX_COMPARE_LIMIT && (
              <div className="w-10 h-10 rounded-xl border border-dashed border-white/30 text-white/40 flex items-center justify-center text-xs font-bold">
                +{MAX_COMPARE_LIMIT - compareList.length}
              </div>
            )}
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
          <button
            type="button"
            onClick={clearCompareList}
            className="text-[11px] font-bold text-slate-400 hover:text-white px-2.5 py-1.5 transition-colors cursor-pointer flex items-center gap-1"
          >
            <Trash2 className="w-3 h-3" />
            <span>{isArabic ? 'مسح' : 'Clear'}</span>
          </button>

          <button
            type="button"
            onClick={() => setIsCompareModalOpen(true)}
            className="px-5 py-2.5 rounded-full bg-gradient-to-r from-[#007AFF] to-[#0051B3] hover:from-[#0066D6] hover:to-[#004199] text-white font-black text-xs shadow-lg shadow-[#007AFF]/30 transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
          >
            <span>{isArabic ? 'مقارنة المواصفات' : 'Compare Now'}</span>
            <ArrowRight className="w-3.5 h-3.5 rtl:rotate-180" />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
