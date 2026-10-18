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

  const logoUrl = storeSettings.logoUrl;
  const storeName = storeSettings.storeName || 'ARNAOUT STORE';
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
      image: 'max-h-7 max-w-[130px]',
      badge: 'w-7 h-7 text-xs rounded-lg',
      title: 'text-sm',
      tagline: 'text-[9px]',
    },
    md: {
      image: 'max-h-10 max-w-[180px]',
      badge: 'w-10 h-10 text-sm font-black rounded-xl',
      title: 'text-base sm:text-lg',
      tagline: 'text-[11px]',
    },
    lg: {
      image: 'max-h-14 max-w-[240px]',
      badge: 'w-12 h-12 text-base font-black rounded-2xl',
      title: 'text-xl sm:text-2xl',
      tagline: 'text-xs',
    },
  }[size];

  // Derive initial abbreviation from store name (e.g. "ARNAOUT STORE" -> "AS")
  const initials = storeName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('') || 'AS';

  const parts = storeName.split(' ');
  const firstWord = parts[0] || 'ARNAOUT';
  const restWords = parts.slice(1).join(' ') || 'STORE';

  return (
    <div
      onClick={onClick}
      className={`inline-flex items-center gap-2.5 select-none transition-all ${
        onClick ? 'cursor-pointer group' : ''
      } ${className}`}
    >
      {logoUrl ? (
        <div className="flex items-center">
          <img
            src={logoUrl}
            alt={storeName}
            className={`${sizeClasses.image} object-contain transition-transform group-hover:scale-102`}
            style={{ imageRendering: 'auto' }}
          />
        </div>
      ) : (
        <div className="flex items-center gap-2.5">
          {/* Default Apple-style Blue Gradient Badge */}
          <div
            className={`${sizeClasses.badge} bg-gradient-to-tr from-[#0066D6] to-[#007AFF] text-white flex items-center justify-center font-black tracking-tight shadow-sm shadow-[#007AFF]/25 shrink-0 transition-transform group-hover:scale-105`}
          >
            <span>{initials}</span>
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
      )}
    </div>
  );
};
