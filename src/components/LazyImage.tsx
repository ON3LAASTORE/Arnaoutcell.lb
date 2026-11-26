import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  DEFAULT_FULL_RES_FALLBACK_IMAGE,
  resolveFullResolutionImageUrl,
  stripRestrictiveImageAttributes,
} from '../utils/imageResolutionHelpers';
import {
  DEFAULT_INTERSECTION_THRESHOLD,
  DEFAULT_VIEWPORT_ROOT_MARGIN,
  observeElementInViewport,
} from '../utils/lazyLoadingHelpers';
import {
  buildImageSrcSetAttributes,
  resolveExplicitImageDimensions,
  resolveImageLoadingConfig,
} from '../utils/webVitalsHelpers';

export interface LazyImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  /**
   * When true, bypasses intersection observation and loads immediately with high priority.
   * Use for critical above-the-fold content (e.g. Navbar StoreLogo, Hero visual, ProductDetailPage main image).
   */
  priority?: boolean;
  /**
   * Margin around the root. Default '0px' so images only load when entering the viewport.
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
   * Responsive sizes descriptor used for AVIF/WebP srcSet candidate selection.
   */
  responsiveSizes?: string;
  /**
   * Explicit fallback intrinsic width/height for CLS prevention when width/height props are omitted.
   */
  fallbackWidth?: number;
  fallbackHeight?: number;
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
  rootMargin = DEFAULT_VIEWPORT_ROOT_MARGIN,
  threshold = DEFAULT_INTERSECTION_THRESHOLD,
  fallbackSrc = DEFAULT_FULL_RES_FALLBACK_IMAGE,
  responsiveSizes,
  fallbackWidth = 800,
  fallbackHeight = 800,
  className = '',
  wrapperClassName = '',
  style,
  onLoaded,
  onError,
  width,
  height,
  loading: explicitLoading,
  decoding: explicitDecoding,
  fetchPriority: explicitFetchPriority,
  referrerPolicy: explicitReferrerPolicy,
  ...rest
}) => {
  const resolvedSrc = resolveFullResolutionImageUrl(src) || src;
  const resolvedFallbackSrc =
    resolveFullResolutionImageUrl(fallbackSrc) || DEFAULT_FULL_RES_FALLBACK_IMAGE;
  const cleanRestProps = stripRestrictiveImageAttributes(rest);

  const [isInView, setIsInView] = useState<boolean>(priority);
  const [isLoaded, setIsLoaded] = useState<boolean>(false);
  const [currentSrc, setCurrentSrc] = useState<string>(priority ? resolvedSrc : '');
  const [hasError, setHasError] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  const explicitDimensions = useMemo(
    () => resolveExplicitImageDimensions(width, height, fallbackWidth, fallbackHeight),
    [width, height, fallbackWidth, fallbackHeight]
  );

  const srcSetAttrs = useMemo(
    () =>
      buildImageSrcSetAttributes(
        currentSrc || resolvedSrc,
        responsiveSizes || rest.sizes,
        explicitDimensions.width
      ),
    [currentSrc, resolvedSrc, responsiveSizes, rest.sizes, explicitDimensions.width]
  );

  const loadingConfig = useMemo(
    () =>
      resolveImageLoadingConfig(
        priority,
        explicitLoading,
        explicitDecoding,
        explicitFetchPriority
      ),
    [priority, explicitLoading, explicitDecoding, explicitFetchPriority]
  );

  // Synchronize src if it changes
  useEffect(() => {
    setHasError(false);
    if (priority || isInView) {
      setCurrentSrc(resolvedSrc);
    }
  }, [resolvedSrc, priority, isInView]);

  // Handle instantaneously cached images
  useEffect(() => {
    if (imgRef.current && imgRef.current.complete && imgRef.current.naturalWidth > 0 && !isLoaded) {
      setIsLoaded(true);
      if (onLoaded) {
        onLoaded();
      }
    }
  }, [currentSrc, onLoaded, isLoaded]);

  // Observe viewport intersection using shared IntersectionObserver pool
  useEffect(() => {
    if (priority) {
      setIsInView(true);
      setCurrentSrc(resolvedSrc);
      return;
    }

    if (isInView) {
      return;
    }

    const element = containerRef.current;
    if (!element) return;

    return observeElementInViewport(
      element,
      { rootMargin, threshold },
      () => {
        setIsInView(true);
        setCurrentSrc(resolvedSrc);
      }
    );
  }, [priority, isInView, rootMargin, threshold, resolvedSrc]);

  const handleImageLoad = (_e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    setIsLoaded(true);
    if (onLoaded) {
      onLoaded();
    }
  };

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    if (!hasError && resolvedFallbackSrc && currentSrc !== resolvedFallbackSrc) {
      setHasError(true);
      setCurrentSrc(resolvedFallbackSrc);
    }
    if (onError) {
      onError(e);
    }
  };

  const hasResponsiveWidth = wrapperClassName.includes('w-');
  const hasResponsiveHeight = wrapperClassName.includes('h-');

  const wrapperStyle: React.CSSProperties = {
    ...style,
    width:
      style?.width ??
      (hasResponsiveWidth
        ? undefined
        : width
        ? typeof width === 'number'
          ? `${width}px`
          : width
        : undefined),
    height:
      style?.height ??
      (hasResponsiveHeight
        ? undefined
        : height
        ? typeof height === 'number'
          ? `${height}px`
          : height
        : undefined),
  };

  const imgStyle: React.CSSProperties = {
    imageRendering: 'high-quality' as React.CSSProperties['imageRendering'],
    ...style,
  };

  const lazyState = isLoaded ? 'loaded' : isInView ? 'loading' : 'deferred';

  return (
    <div
      ref={containerRef}
      data-lazy-state={lazyState}
      data-lazy-priority={priority ? 'true' : 'false'}
      className={`relative overflow-hidden inline-flex items-center justify-center ${wrapperClassName}`}
      style={wrapperStyle}
    >
      {/* Smooth Shimmer Skeleton Placeholder while element is outside viewport or loading */}
      <div
        aria-hidden="true"
        className={`product-card-skeleton absolute inset-0 pointer-events-none rounded-2xl transition-opacity duration-500 ease-out z-0 ${
          isLoaded ? 'opacity-0' : 'opacity-100'
        }`}
      />

      {/* Next-gen AVIF / WebP <picture> element mounts only when viewport intersection is triggered */}
      {isInView && currentSrc ? (
        <picture className="w-full h-full flex items-center justify-center relative z-[1]">
          {srcSetAttrs.avifSrcSet && (
            <source
              type="image/avif"
              srcSet={srcSetAttrs.avifSrcSet}
              sizes={srcSetAttrs.sizes}
            />
          )}
          {srcSetAttrs.webpSrcSet && (
            <source
              type="image/webp"
              srcSet={srcSetAttrs.webpSrcSet}
              sizes={srcSetAttrs.sizes}
            />
          )}
          <img
            ref={imgRef}
            src={currentSrc}
            srcSet={srcSetAttrs.srcSet}
            sizes={srcSetAttrs.sizes}
            width={explicitDimensions.width}
            height={explicitDimensions.height}
            alt={alt}
            loading={loadingConfig.loading}
            decoding={loadingConfig.decoding}
            referrerPolicy={explicitReferrerPolicy || 'no-referrer'}
            fetchPriority={loadingConfig.fetchPriority}
            onLoad={handleImageLoad}
            onError={handleImageError}
            style={imgStyle}
            className={`${className} transition-opacity duration-500 ease-out ${
              isLoaded ? 'opacity-100' : 'opacity-0'
            }`}
            {...cleanRestProps}
          />
        </picture>
      ) : null}
    </div>
  );
};
