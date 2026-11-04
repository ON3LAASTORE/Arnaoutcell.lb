import React, { useEffect } from 'react';
import { useShop } from '../context/ShopContext';

interface StoreLogoProps {
  size?: 'sm' | 'md' | 'lg';
  showTagline?: boolean;
  className?: string;
  onClick?: () => void;
  adminMode?: boolean;
}

export const StoreLogo: React.FC<StoreLogoProps> = ({
  size = 'md',
  showTagline = true,
  className = '',
  onClick,
  adminMode = false,
}) => {
  const { storeSettings, lang } = useShop();

  const logoUrl = storeSettings.logoUrl || '/m-arnaout-cell-logo.jpg';
  const storeName = storeSettings.storeName || 'SQUARE ARNAOUT CELL STORE';
  const tagline = lang === 'ar' ? storeSettings.taglineAr : storeSettings.tagline;

  // Dynamically synchronize favicon with custom store logo if available
  useEffect(() => {
    if (typeof document !== 'undefined' && logoUrl) {
      let link: HTMLLinkElement | null = document.querySelector("link[rel*='icon']");
      if (!link) {
        link = document.createElement('link');
        link.rel = 'shortcut icon';
        document.getElementsByTagName('head')[0].appendChild(link);
      }
      link.href = logoUrl;
    }
  }, [logoUrl]);

  const sizeClasses = {
    sm: {
      image: 'w-8 h-8',
      title: 'text-sm',
      tagline: 'text-[9px]',
    },
    md: {
      image: 'w-10 h-10',
      title: 'text-base sm:text-lg',
      tagline: 'text-[11px]',
    },
    lg: {
      image: 'w-12 h-12 sm:w-14 sm:h-14',
      title: 'text-xl sm:text-2xl',
      tagline: 'text-xs',
    },
  }[size];

  const parts = storeName.split(' ');
  const firstWord = parts[0] || 'SQUARE';
  const restWords = parts.slice(1).join(' ') || 'ARNAOUT CELL STORE';

  return (
    <div
      onClick={onClick}
      className={`inline-flex items-center gap-2.5 select-none transition-all ${
        onClick ? 'cursor-pointer group' : ''
      } ${className}`}
    >
      <div className="flex items-center gap-2.5">
        {/* 4K Official Circular Profile Emblem */}
        <div className="shrink-0 overflow-hidden rounded-full border border-slate-200/90 dark:border-slate-700 shadow-xs bg-white p-0.5 flex items-center justify-center transition-transform group-hover:scale-105">
          <img
            src={logoUrl}
            alt={storeName}
            className={`${sizeClasses.image} rounded-full object-cover`}
          />
        </div>

        <div className="leading-tight">
          <span
            className={`font-black tracking-tight text-[#172033] dark:text-[#F8FAFC] uppercase block group-hover:text-[#007AFF] transition-colors ${sizeClasses.title}`}
          >
            {firstWord} <span className="text-[#007AFF]">{restWords}</span>
              {adminMode && (
                <span className="ml-1.5 px-1.5 py-0.5 text-[10px] font-bold bg-[#EAF3FF] dark:bg-[#1E293B] text-[#007AFF] dark:text-[#38BDF8] border border-[#BAE6FD] dark:border-slate-700 rounded-md tracking-normal">
                  ADMIN
                </span>
              )}
            </span>
            {showTagline && tagline && (
              <span
                className={`text-[#64748B] dark:text-slate-400 font-medium block truncate max-w-[220px] sm:max-w-xs ${sizeClasses.tagline}`}
              >
                {tagline}
              </span>
            )}
          </div>
        </div>
    </div>
  );
};
