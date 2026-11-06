import React, { useState, useEffect, useRef } from 'react';

export interface LazyImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  /**
   * When true, bypasses intersection observation and loads immediately with high priority.
   * Use for critical above-the-fold content (e.g. Navbar StoreLogo, Hero visual, ProductDetailPage main image).
   */
  priority?: boolean;
  /**
   * Margin around the root. Default '200px 0px' to start fetching right before entering viewport.
   */
  rootMargin?: string;
  /**
   * Intersection threshold (default 0.01).
   */
  threshold?: number | number[];
  /**
   * Fallback image URL on loading error.
   */
  fallbackSrc?: string;
  /**
   * Outer wrapper container CSS classes.
   */
  wrapperClassName?: string;
  /**
   * Callback fired once image finishes downloading.
   */
  onLoaded?: () => void;
}

export const LazyImage: React.FC<LazyImageProps> = ({
  src,
  alt,
  priority = false,
  rootMargin = '200px 0px',
  threshold = 0.01,
  fallbackSrc = 'https://images.unsplash.com/photo-1511707171634-5f897ff02597?w=600&auto=format&fit=crop&q=80',
  className = '',
  wrapperClassName = '',
  style,
  onLoaded,
  onError,
  width,
  height,
  ...rest
}) => {
  const [isInView, setIsInView] = useState<boolean>(priority);
  const [isLoaded, setIsLoaded] = useState<boolean>(false);
  const [currentSrc, setCurrentSrc] = useState<string>(priority ? src : '');
  const [hasError, setHasError] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Synchronize src if it changes
  useEffect(() => {
    setHasError(false);
    if (priority || isInView) {
      setCurrentSrc(src);
    }
  }, [src, priority, isInView]);

  // Set up IntersectionObserver for non-priority images
  useEffect(() => {
    if (priority) {
      setIsInView(true);
      setCurrentSrc(src);
      return;
    }

    if (typeof window === 'undefined' || !('IntersectionObserver' in window)) {
      setIsInView(true);
      setCurrentSrc(src);
      return;
    }

    const element = containerRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry && entry.isIntersecting) {
          setIsInView(true);
          setCurrentSrc(src);
          observer.disconnect();
        }
      },
      {
        root: null,
        rootMargin,
        threshold,
      }
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [priority, rootMargin, threshold, src]);

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    setIsLoaded(true);
    if (onLoaded) {
      onLoaded();
    }
  };

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    if (!hasError && fallbackSrc && currentSrc !== fallbackSrc) {
      setHasError(true);
      setCurrentSrc(fallbackSrc);
    }
    if (onError) {
      onError(e);
    }
  };

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden inline-flex items-center justify-center ${wrapperClassName}`}
      style={{
        width: width ? (typeof width === 'number' ? `${width}px` : width) : undefined,
        height: height ? (typeof height === 'number' ? `${height}px` : height) : undefined,
      }}
    >
      {/* Smooth Shimmer Skeleton Placeholder while element is outside viewport or loading */}
      {!isLoaded && (
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-slate-200/60 dark:bg-slate-800/60 animate-pulse pointer-events-none rounded-inherit z-0"
        />
      )}

      {/* Actual Image rendered only after IntersectionObserver triggers or immediately if priority */}
      {isInView && currentSrc ? (
        <img
          src={currentSrc}
          alt={alt}
          width={width}
          height={height}
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
          {...(priority ? { fetchPriority: 'high' } : { fetchPriority: 'auto' })}
          onLoad={handleImageLoad}
          onError={handleImageError}
          style={style}
          className={`${className} transition-opacity duration-300 ${
            isLoaded ? 'opacity-100' : 'opacity-0'
          }`}
          {...rest}
        />
      ) : null}
    </div>
  );
};
