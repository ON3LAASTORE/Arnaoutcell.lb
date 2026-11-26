import React, { useState } from 'react';
import { ArrowRight, Package } from 'lucide-react';
import { BrandShowcaseBannerItem } from '../utils/brandShowcaseHelpers';
import { LazyImage } from './LazyImage';

interface BrandBannerCardProps {
  item: BrandShowcaseBannerItem;
  onSelect: (brandName: string) => void;
  priority?: boolean;
  lang: 'en' | 'ar';
}

export const BrandBannerCard: React.FC<BrandBannerCardProps> = ({
  item,
  onSelect,
  priority = false,
  lang,
}) => {
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});

  return (
    <button
      type="button"
      data-testid="brand-banner-card"
      data-brand-name={item.displayName}
      onClick={() => onSelect(item.displayName)}
      aria-label={item.ariaLabel}
      className="group oaa-brand-banner text-start"
    >
      {/* Left Side: Bold Brand Identity + Bottom-Left Navigation Arrow */}
      <div className="oaa-brand-info">
        <div>
          <h3 className="oaa-brand-heading">{item.displayName}</h3>
          {item.itemCount > 0 && (
            <span className="oaa-brand-count">
              {item.itemCount} {lang === 'ar' ? 'منتج' : 'Products'}
            </span>
          )}
        </div>

        <span className="oaa-brand-arrow" aria-hidden="true">
          <ArrowRight className="w-5 h-5 stroke-[2.1] rtl:rotate-180" />
        </span>
      </div>

      {/* Right Side: Clean Cluster of Real Brand Product Photography */}
      <div className="oaa-brand-showcase">
        {item.productVisuals.map((visual, idx) => {
          const isFailed = Boolean(failedImages[visual.id]);
          return (
            <div
              key={visual.id}
              className={`oaa-brand-product-slot oaa-brand-product-slot--${idx + 1}`}
            >
              {!isFailed && visual.imageUrl ? (
                <LazyImage
                  src={visual.imageUrl}
                  alt={visual.title}
                  width={240}
                  height={240}
                  responsiveSizes="(max-width: 640px) 96px, 140px"
                  priority={priority}
                  loading="lazy"
                  onError={() =>
                    setFailedImages((prev) => ({
                      ...prev,
                      [visual.id]: true,
                    }))
                  }
                  wrapperClassName="w-full h-full flex items-center justify-center"
                  className="oaa-brand-product-img"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-[#94A3B8]">
                  <Package className="w-6 h-6 opacity-60" />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </button>
  );
};
