import React from 'react';
import { Globe } from 'lucide-react';
import { useShop } from '../context/ShopContext';
import { LANGUAGE_OPTIONS } from '../utils/languageToggleHelpers';
import { Language } from '../types';

interface LanguageToggleProps {
  variant?: 'compact' | 'full';
  className?: string;
  onSelectLanguage?: (lang: Language) => void;
}

export const LanguageToggle: React.FC<LanguageToggleProps> = ({
  variant = 'compact',
  className = '',
  onSelectLanguage,
}) => {
  const { lang, setLang } = useShop();

  const handleSelect = (nextLang: Language) => {
    if (nextLang !== lang) {
      setLang(nextLang);
    }
    onSelectLanguage?.(nextLang);
  };

  if (variant === 'full') {
    return (
      <div
        role="group"
        aria-label={lang === 'ar' ? 'اختيار اللغة' : 'Select language'}
        data-testid="language-toggle-full"
        className={`flex items-center justify-between gap-3 p-3 rounded-xl bg-[#F5F8FC] dark:bg-[#111A2E] border border-[#DCE5F0] dark:border-[#1E293B] ${className}`}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="p-1.5 rounded-lg bg-white dark:bg-[#1E293B] border border-[#DCE5F0] dark:border-slate-700 shadow-xs shrink-0">
            <Globe className="w-4 h-4 text-[#007AFF]" />
          </div>
          <div className="min-w-0">
            <div className="text-xs font-bold text-[#172033] dark:text-[#F8FAFC] truncate">
              {lang === 'ar' ? 'لغة الموقع واتجاه العرض' : 'Language & Layout'}
            </div>
            <div className="text-[10px] text-[#64748B] dark:text-slate-400 truncate">
              {lang === 'ar' ? 'العربية (من اليمين لليسار RTL)' : 'English (Left-to-Right LTR)'}
            </div>
          </div>
        </div>

        <div className="inline-flex items-center gap-1 p-1 rounded-lg bg-white dark:bg-[#0A0F1D] border border-[#DCE5F0] dark:border-[#1E293B] shrink-0">
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
                className={`px-2.5 py-1.5 rounded-md text-xs font-bold transition-colors duration-150 cursor-pointer whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#007AFF] ${
                  isActive
                    ? 'bg-[#007AFF] text-white shadow-xs'
                    : 'text-[#64748B] dark:text-slate-300 hover:text-[#172033] dark:hover:text-white'
                }`}
              >
                {option.nativeLabel}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div
      role="group"
      aria-label={lang === 'ar' ? 'تبديل اللغة بين الإنجليزية والعربية' : 'Switch language between English and Arabic'}
      data-testid="language-toggle"
      className={`inline-flex items-center gap-0.5 p-0.5 rounded-xl bg-[#F5F8FC] dark:bg-[#111A2E] border border-[#DCE5F0] dark:border-[#1E293B] shadow-xs shrink-0 ${className}`}
    >
      <span
        className="hidden sm:inline-flex items-center justify-center ps-1.5 pe-0.5 text-[#007AFF]"
        aria-hidden="true"
      >
        <Globe className="w-3.5 h-3.5" />
      </span>
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
            className={`px-2 sm:px-2.5 py-1 rounded-[10px] text-[11px] sm:text-xs font-bold transition-colors duration-150 cursor-pointer whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#007AFF] ${
              isActive
                ? 'bg-[#007AFF] text-white shadow-xs'
                : 'text-[#64748B] dark:text-slate-300 hover:text-[#172033] dark:hover:text-white hover:bg-[#EAF3FF]/70 dark:hover:bg-[#1E293B]'
            }`}
          >
            {option.shortLabel}
          </button>
        );
      })}
    </div>
  );
};
