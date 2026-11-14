import React, { useEffect } from 'react';
import { useShop } from '../context/ShopContext';
import { LazyImage } from './LazyImage';
import { DEFAULT_STORE_PROFILE_PICTURE, resolveStoreLogoUrl } from '../utils/storeSettingsHelpers';

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

  const logoUrl = resolveStoreLogoUrl(storeSettings.logoUrl);
  const storeName = storeSettings.storeName || 'ON AlAA STORE';
  const tagline = lang === 'ar' ? storeSettings.taglineAr : storeSettings.tagline;

  // Dynamically synchronize favicon & mobile home-screen icon with active store logo
  useEffect(() => {
    if (typeof document !== 'undefined' && logoUrl) {
      const isDefaultOfficial = logoUrl === DEFAULT_STORE_PROFILE_PICTURE;
      const faviconHref = isDefaultOfficial ? '/favicon.png' : logoUrl;
      const appleHref = isDefaultOfficial ? '/apple-touch-icon.png' : logoUrl;

      document.querySelectorAll("link[rel*='icon']").forEach((el) => {
        if (el instanceof HTMLLinkElement && el.rel !== 'apple-touch-icon' && el.getAttribute('href') !== '/favicon.ico') {
          if (!isDefaultOfficial || el.getAttribute('sizes') === '64x64' || !el.getAttribute('sizes')) {
            el.href = faviconHref;
          }
        }
      });

      const appleLink = document.querySelector("link[rel='apple-touch-icon']");
      if (appleLink instanceof HTMLLinkElement) {
        appleLink.href = appleHref;
      }
    }
  }, [logoUrl]);

  const sizeClasses = {
    sm: {
      image: 'w-8 h-8 sm:w-9 sm:h-9',
      title: 'text-xs',
      tagline: 'text-[9px]',
    },
    md: {
      image: 'w-9 h-9 sm:w-11 sm:h-11',
      title: 'text-xs sm:text-base lg:text-lg',
      tagline: 'text-[10px] sm:text-[11px]',
    },
    lg: {
      image: 'w-12 h-12 sm:w-16 sm:h-16',
      title: 'text-lg sm:text-2xl',
      tagline: 'text-xs',
    },
  }[size];

  const parts = storeName.split(' ');
  const firstWord = parts[0] || 'ON';
  const restWords = parts.slice(1).join(' ') || 'AlAA STORE';

  return (
    <div
      onClick={onClick}
      className={`inline-flex items-center gap-2 sm:gap-2.5 select-none transition-all min-w-0 sm:shrink-0 ${
        onClick ? 'cursor-pointer group' : ''
      } ${className}`}
    >
      <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
        {/* Official Circular Profile Emblem on deep dark backing so neon glow and metallic outer ring never clip */}
        <div className="shrink-0 overflow-hidden rounded-full bg-[#000000] p-[1.5px] border border-[#1E3A5F]/85 dark:border-[#38BDF8]/45 ring-1 ring-[#007AFF]/30 shadow-[0_0_12px_rgba(0,122,255,0.24)] flex items-center justify-center transition-transform group-hover:scale-105">
          <LazyImage
            src={logoUrl}
            alt={storeName}
            width={size === 'sm' ? 36 : size === 'lg' ? 64 : 44}
            height={size === 'sm' ? 36 : size === 'lg' ? 64 : 44}
            priority={true}
            wrapperClassName={`${sizeClasses.image} rounded-full overflow-hidden bg-[#000000]`}
            className="w-full h-full rounded-full object-contain object-center"
          />
        </div>

        <div className="leading-tight min-w-0">
          <span
            className={`font-black tracking-tight text-[#172033] dark:text-[#F8FAFC] block whitespace-nowrap truncate group-hover:text-[#007AFF] transition-colors ${sizeClasses.title}`}
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
                className={`text-[#64748B] dark:text-slate-400 font-medium block truncate max-w-[115px] sm:max-w-[290px] lg:max-w-[340px] ${sizeClasses.tagline}`}
              >
                {tagline}
              </span>
            )}
          </div>
        </div>
    </div>
  );
};
