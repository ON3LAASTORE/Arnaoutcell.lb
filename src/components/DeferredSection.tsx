import React, { useEffect, useRef, useState } from 'react';
import { observeElementInViewport } from '../utils/lazyLoadingHelpers';

export interface DeferredSectionProps {
  children: React.ReactNode;
  minHeight?: number | string;
  rootMargin?: string;
  className?: string;
  sectionId?: string;
}

const SectionFallbackSkeleton: React.FC<{ minHeight: string }> = ({ minHeight }) => (
  <div
    aria-hidden="true"
    style={{ minHeight }}
    className="w-full flex items-center justify-center py-12"
  >
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-4 animate-pulse">
      <div className="h-6 w-48 rounded-lg bg-[#EAF3FF] dark:bg-[#111A2E]" />
      <div className="h-10 w-80 max-w-full rounded-xl bg-[#F5F8FC] dark:bg-[#0E1726]" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4">
        <div className="h-36 rounded-2xl bg-[#F5F8FC] dark:bg-[#0E1726] border border-[#DCE5F0]/50 dark:border-[#1E293B]" />
        <div className="h-36 rounded-2xl bg-[#F5F8FC] dark:bg-[#0E1726] border border-[#DCE5F0]/50 dark:border-[#1E293B]" />
        <div className="h-36 rounded-2xl bg-[#F5F8FC] dark:bg-[#0E1726] border border-[#DCE5F0]/50 dark:border-[#1E293B] hidden md:block" />
        <div className="h-36 rounded-2xl bg-[#F5F8FC] dark:bg-[#0E1726] border border-[#DCE5F0]/50 dark:border-[#1E293B] hidden md:block" />
      </div>
    </div>
  </div>
);

/**
 * Defers chunk downloading, mounting, and React hydration of heavy offscreen sections
 * until the user scrolls within rootMargin, while reserving explicit minHeight to eliminate CLS.
 */
export const DeferredSection: React.FC<DeferredSectionProps> = ({
  children,
  minHeight = 360,
  rootMargin = '1200px 0px',
  className = '',
  sectionId,
}) => {
  const [shouldRender, setShouldRender] = useState(false);
  const hostRef = useRef<HTMLDivElement>(null);

  const normalizedMinHeight =
    typeof minHeight === 'number' ? `${minHeight}px` : minHeight;

  useEffect(() => {
    if (shouldRender) return;
    const target = hostRef.current;
    if (!target) return;

    return observeElementInViewport(
      target,
      { rootMargin, threshold: 0.01 },
      () => {
        setShouldRender(true);
      }
    );
  }, [shouldRender, rootMargin]);

  return (
    <div
      id={sectionId}
      ref={hostRef}
      data-deferred-section={shouldRender ? 'hydrated' : 'deferred'}
      className={className}
      style={{
        minHeight: shouldRender ? undefined : normalizedMinHeight,
        contentVisibility: 'auto',
        containIntrinsicSize: `auto ${normalizedMinHeight}`,
      }}
    >
      {shouldRender ? (
        <React.Suspense fallback={<SectionFallbackSkeleton minHeight={normalizedMinHeight} />}>
          {children}
        </React.Suspense>
      ) : (
        <SectionFallbackSkeleton minHeight={normalizedMinHeight} />
      )}
    </div>
  );
};
