import React, { useId } from 'react';
import { Globe, ArrowLeftRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useShop } from '../context/ShopContext';
import {
  LANGUAGE_OPTIONS,
  getLanguageOptionMeta,
  getOppositeLanguage,
} from '../utils/languageToggleHelpers';
import { Language } from '../types';

interface LanguageToggleProps {
  variant?: 'compact' | 'full';
  className?: string;
  onSelectLanguage?: (lang: Language) => void;
}

/**
 * Crisp SVG vector flag emblem so English (US) and Arabic (Lebanon)
 * indicators render identically across all desktop & mobile platforms.
 */
const FlagIndicator: React.FC<{ flagCode: 'us' | 'lb'; isActive?: boolean }> = ({
  flagCode,
  isActive = false,
}) => {
  const clipId = useId();

  if (flagCode === 'lb') {
    return (
      <svg
        viewBox="0 0 24 24"
        className={`w-3.5 h-3.5 rounded-full shrink-0 ring-1 transition-transform duration-200 ${
          isActive
            ? 'ring-white/60 scale-105'
            : 'ring-black/10 dark:ring-white/15'
        }`}
        aria-hidden="true"
      >
        <clipPath id={clipId}>
          <circle cx="12" cy="12" r="12" />
        </clipPath>
        <g clipPath={`url(#${clipId})`}>
          <rect width="24" height="6" y="0" fill="#ED1C24" />
          <rect width="24" height="12" y="6" fill="#FFFFFF" />
          <rect width="24" height="6" y="18" fill="#ED1C24" />
          {/* Lebanese Cedar emblem */}
          <path
            d="M12 7.2L9.4 11.4h1.7l-1.9 2.6h2.2v1.9h1.2v-1.9h2.2l-1.9-2.6h1.7L12 7.2z"
            fill="#00A651"
          />
        </g>
      </svg>
    );
  }

  return (
    <svg
      viewBox="0 0 24 24"
      className={`w-3.5 h-3.5 rounded-full shrink-0 ring-1 transition-transform duration-200 ${
        isActive
          ? 'ring-white/60 scale-105'
          : 'ring-black/10 dark:ring-white/15'
      }`}
      aria-hidden="true"
    >
      <clipPath id={clipId}>
        <circle cx="12" cy="12" r="12" />
      </clipPath>
      <g clipPath={`url(#${clipId})`}>
        <rect width="24" height="24" fill="#FFFFFF" />
        <rect width="24" height="3.4" y="0" fill="#B22234" />
        <rect width="24" height="3.4" y="6.8" fill="#B22234" />
        <rect width="24" height="3.4" y="13.6" fill="#B22234" />
        <rect width="24" height="3.6" y="20.4" fill="#B22234" />
        <rect width="12" height="12" x="0" y="0" fill="#3C3B6E" />
        <circle cx="3.5" cy="3.5" r="0.9" fill="#FFFFFF" />
        <circle cx="7.5" cy="3.5" r="0.9" fill="#FFFFFF" />
        <circle cx="5.5" cy="6.2" r="0.9" fill="#FFFFFF" />
        <circle cx="3.5" cy="9" r="0.9" fill="#FFFFFF" />
        <circle cx="7.5" cy="9" r="0.9" fill="#FFFFFF" />
      </g>
    </svg>
  );
};

export const LanguageToggle: React.FC<LanguageToggleProps> = ({
  variant = 'compact',
  className = '',
  onSelectLanguage,
}) => {
  const { lang, setLang, isSwitchingLanguage } = useShop();
  const nextLang = getOppositeLanguage(lang);
  const nextOption = getLanguageOptionMeta(nextLang);

  const handleSelect = (selectedLang: Language) => {
    if (selectedLang !== lang) {
      setLang(selectedLang);
    }
    onSelectLanguage?.(selectedLang);
  };

  if (variant === 'full') {
    return (
      <div
        role="group"
        aria-label={lang === 'ar' ? 'اختيار اللغة' : 'Select language'}
        data-testid="language-toggle-full"
        data-switching={isSwitchingLanguage ? 'true' : 'false'}
        className={`flex flex-col gap-2.5 p-3 rounded-xl bg-[#F5F8FC] dark:bg-[#111A2E] border border-[#DCE5F0] dark:border-[#1E293B] transition-colors duration-200 ${className}`}
      >
        <div className="flex items-center justify-between gap-2 min-w-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <motion.div
              animate={{ rotate: lang === 'ar' ? 180 : 0, scale: isSwitchingLanguage ? 1.1 : 1 }}
              transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
              className="p-1.5 rounded-lg bg-white dark:bg-[#1E293B] border border-[#DCE5F0] dark:border-slate-700 shadow-xs shrink-0"
            >
              <Globe className="w-4 h-4 text-[#007AFF]" />
            </motion.div>
            <div className="min-w-0">
              <div className="text-xs font-bold text-[#172033] dark:text-[#F8FAFC] flex items-center gap-1.5">
                <span>{lang === 'ar' ? 'لغة الموقع واتجاه العرض' : 'Language & Layout Direction'}</span>
                {isSwitchingLanguage && (
                  <ArrowLeftRight
                    className="w-3 h-3 text-[#007AFF] animate-pulse shrink-0"
                    aria-hidden="true"
                  />
                )}
              </div>
              <div className="text-[10px] text-[#64748B] dark:text-slate-400">
                {lang === 'ar' ? 'العربية (من اليمين لليسار RTL)' : 'English (Left-to-Right LTR)'}
              </div>
            </div>
          </div>
          <span className="text-[10px] font-bold text-[#007AFF] dark:text-[#38BDF8] uppercase tracking-wider shrink-0">
            {lang === 'ar' ? 'RTL' : 'LTR'}
          </span>
        </div>

        <div className="relative grid grid-cols-2 gap-1 p-1 rounded-lg bg-white dark:bg-[#0A0F1D] border border-[#DCE5F0] dark:border-[#1E293B]">
          {LANGUAGE_OPTIONS.map((option) => {
            const isActive = lang === option.code;
            return (
              <button
                key={option.code}
                type="button"
                onClick={() => handleSelect(option.code)}
                aria-pressed={isActive}
                aria-label={option.ariaLabel}
                lang={option.code}
                className={`relative z-10 inline-flex items-center justify-center gap-2 px-3 py-2 rounded-md text-xs font-bold transition-colors duration-150 cursor-pointer whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#007AFF] ${
                  isActive
                    ? 'text-white'
                    : 'text-[#64748B] dark:text-slate-300 hover:text-[#172033] dark:hover:text-white'
                }`}
              >
                {isActive && (
                  <motion.span
                    layoutId="language-toggle-full-pill"
                    transition={{ type: 'spring', stiffness: 460, damping: 32 }}
                    className="absolute inset-0 rounded-md bg-[#007AFF] shadow-xs -z-10"
                  />
                )}
                <FlagIndicator flagCode={option.flagCode} isActive={isActive} />
                <span>{option.nativeLabel}</span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`inline-flex items-center shrink-0 ${className}`}
      data-testid="language-toggle-wrapper"
    >
      {/* Mobile compact single-tap switcher so brand header keeps clean breathing room at 390px */}
      <button
        type="button"
        onClick={() => handleSelect(nextLang)}
        aria-label={nextOption.ariaLabel}
        title={lang === 'en' ? 'Switch to Arabic (RTL)' : 'التبديل إلى الإنجليزية (LTR)'}
        data-testid="language-toggle-mobile"
        data-switching={isSwitchingLanguage ? 'true' : 'false'}
        className="sm:hidden inline-flex items-center gap-1.5 px-2 py-1.5 rounded-xl bg-[#F5F8FC] dark:bg-[#111A2E] hover:bg-[#EAF3FF] dark:hover:bg-[#1E293B] border border-[#DCE5F0] dark:border-[#1E293B] hover:border-[#007AFF] text-xs font-bold text-[#172033] dark:text-[#F8FAFC] transition-transform duration-150 active:scale-95 cursor-pointer whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#007AFF]"
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={nextOption.code}
            initial={{ opacity: 0, rotate: -18, scale: 0.85 }}
            animate={{ opacity: 1, rotate: 0, scale: 1 }}
            exit={{ opacity: 0, rotate: 18, scale: 0.85 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className="inline-flex items-center gap-1"
          >
            <FlagIndicator flagCode={nextOption.flagCode} />
            <span>{nextOption.code === 'ar' ? 'AR' : 'EN'}</span>
          </motion.span>
        </AnimatePresence>
      </button>

      {/* Desktop / tablet segmented switcher with animated Globe, SVG flags & sliding active highlight */}
      <div
        role="group"
        aria-label={lang === 'ar' ? 'تبديل اللغة بين الإنجليزية والعربية' : 'Switch language between English and Arabic'}
        data-testid="language-toggle"
        data-switching={isSwitchingLanguage ? 'true' : 'false'}
        className="hidden sm:inline-flex items-center gap-0.5 p-0.5 rounded-xl bg-[#F5F8FC] dark:bg-[#111A2E] border border-[#DCE5F0] dark:border-[#1E293B] shadow-xs shrink-0 transition-colors duration-200"
      >
        <motion.span
          animate={{
            rotate: lang === 'ar' ? 180 : 0,
            scale: isSwitchingLanguage ? 1.15 : 1,
          }}
          transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
          className="inline-flex items-center justify-center ps-1.5 pe-0.5 text-[#007AFF]"
          aria-hidden="true"
        >
          <Globe className="w-3.5 h-3.5" />
        </motion.span>
        {LANGUAGE_OPTIONS.map((option) => {
          const isActive = lang === option.code;
          return (
            <button
              key={option.code}
              type="button"
              onClick={() => handleSelect(option.code)}
              aria-pressed={isActive}
              aria-label={option.ariaLabel}
              lang={option.code}
              className={`relative z-10 inline-flex items-center gap-1 px-2.5 py-1 rounded-[10px] text-xs font-bold transition-colors duration-150 cursor-pointer whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#007AFF] ${
                isActive
                  ? 'text-white'
                  : 'text-[#64748B] dark:text-slate-300 hover:text-[#172033] dark:hover:text-white'
              }`}
            >
              {isActive && (
                <motion.span
                  layoutId="language-toggle-compact-pill"
                  transition={{ type: 'spring', stiffness: 460, damping: 32 }}
                  className="absolute inset-0 rounded-[10px] bg-[#007AFF] shadow-xs -z-10"
                />
              )}
              <FlagIndicator flagCode={option.flagCode} isActive={isActive} />
              <span>{option.shortLabel}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
