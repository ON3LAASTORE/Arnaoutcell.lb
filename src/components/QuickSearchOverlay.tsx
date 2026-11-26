import React, { useState, useEffect, useRef, useMemo, useCallback, useDeferredValue } from 'react';
import { createPortal } from 'react-dom';
import { useShop } from '../context/ShopContext';
import {
  Search,
  X,
  Clock,
  TrendingUp,
  Trash2,
  Folder,
  Tag,
  Box,
  ArrowRight,
  ArrowLeft,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  AlertTriangle,
  Smartphone,
  SlidersHorizontal,
  Mic,
  Square,
  QrCode,
  ShoppingBag,
  Check,
  Eye,
  ArrowUpDown,
} from 'lucide-react';
import { LazyImage } from './LazyImage';
import {
  filterProductsGlobally,
  getUniqueMatchingBrands,
  getUniqueMatchingCategories,
  getFilterModeLabels,
  findProductSkuMatch,
  findExactSkuProductMatch,
  SearchFilterMode,
  MatchedCategoryInfo,
} from '../utils/globalSearchHelpers';
import {
  resolveAutocompleteBrands,
  resolveAutocompleteCategories,
} from '../utils/productAutocompleteHelpers';
import {
  getSearchHistory,
  addSearchHistoryTerm,
  removeSearchHistoryTerm,
  clearSearchHistory,
  getPopularSearchKeywords,
  splitHighlightedTextSegments,
  computeOverlayFacetCounts,
  filterOverlayResultsByFacets,
  OverlaySortOption,
} from '../utils/quickSearchOverlayHelpers';
import { recordRecentSkuSearch } from '../utils/recentSkuSearches';
import {
  getSpeechRecognitionConstructor,
  getVoiceRecognitionLang,
  extractTranscriptFromEvent,
  mapVoiceSearchError,
  SpeechRecognitionInstanceLike,
} from '../utils/voiceSearchHelpers';
import { trackSearchQuery } from '../services/searchAnalyticsService';
import { resolveDefaultCartSelection } from '../utils/checkoutHelpers';
import { Product, ProductVariant } from '../types';

interface QuickSearchOverlayProps {
  isOpen: boolean;
  onClose: () => void;
}

export const QuickSearchOverlay: React.FC<QuickSearchOverlayProps> = ({
  isOpen,
  onClose,
}) => {
  const {
    lang,
    t,
    products,
    brands,
    categories,
    selectBrand,
    selectCategory,
    applyCatalogFilters,
    viewProductDetail,
    setQuickViewProduct,
    addToCart,
    setSearchQuery,
    setCurrentView,
    setIsQrScannerOpen,
  } = useShop();

  const isArabic = lang === 'ar';
  const ArrowIcon = isArabic ? ArrowLeft : ArrowRight;
  const ChevronIcon = isArabic ? ChevronLeft : ChevronRight;

  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query);
  const [filterMode, setFilterMode] = useState<SearchFilterMode>('all');
  const [selectedFacetBrand, setSelectedFacetBrand] = useState<string | null>(null);
  const [selectedFacetCategorySlug, setSelectedFacetCategorySlug] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<OverlaySortOption>('relevance');
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [searchHistory, setSearchHistory] = useState<string[]>(() => getSearchHistory());
  const [recentlyAddedId, setRecentlyAddedId] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [voiceInterim, setVoiceInterim] = useState('');
  const [voiceError, setVoiceError] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<SpeechRecognitionInstanceLike | null>(null);
  const itemRefs = useRef<Record<number, HTMLElement | null>>({});

  const stopVoiceRecognition = useCallback((abort = false) => {
    const rec = recognitionRef.current;
    recognitionRef.current = null;
    if (rec) {
      rec.onstart = null;
      rec.onresult = null;
      rec.onerror = null;
      rec.onend = null;
      try {
        if (abort) {
          rec.abort();
        } else {
          rec.stop();
        }
      } catch {
        // Ignore already-stopped recognition errors
      }
    }
    setIsListening(false);
    setVoiceInterim('');
  }, []);

  // Refresh history & auto-focus input whenever overlay opens; reset transient filters and stop voice on close
  useEffect(() => {
    if (!isOpen) {
      stopVoiceRecognition(true);
      setVoiceError(null);
      setQuery('');
      setFilterMode('all');
      setSelectedFacetBrand(null);
      setSelectedFacetCategorySlug(null);
      setSortBy('relevance');
      setSelectedIndex(-1);
      return;
    }

    setSearchHistory(getSearchHistory());
    setSelectedIndex(-1);
    setVoiceError(null);

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const focusTimer = window.setTimeout(() => {
      inputRef.current?.focus();
    }, 25);

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        stopVoiceRecognition(true);
        onClose();
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => {
      window.clearTimeout(focusTimer);
      window.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = prevOverflow;
      stopVoiceRecognition(true);
    };
  }, [isOpen, onClose, stopVoiceRecognition]);

  useEffect(() => {
    setSelectedIndex(-1);
  }, [deferredQuery, filterMode, selectedFacetBrand, selectedFacetCategorySlug, sortBy]);

  useEffect(() => {
    if (selectedIndex >= 0) {
      itemRefs.current[selectedIndex]?.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex]);

  const popularKeywords = useMemo(
    () => getPopularSearchKeywords(lang, products, undefined, 8),
    [lang, products]
  );

  const publishedCategoryKeys = useMemo(() => {
    const set = new Set<string>();
    for (const p of products) {
      if (p.isPublished !== false && p.category?.trim()) {
        const raw = p.category.trim().toLowerCase();
        set.add(raw);
        set.add(raw.replace(/[^a-z0-9]+/g, '-'));
      }
    }
    return set;
  }, [products]);

  const publishedBrandKeys = useMemo(() => {
    const set = new Set<string>();
    for (const p of products) {
      if (p.isPublished !== false && p.brand?.trim()) {
        set.add(p.brand.trim().toLowerCase());
      }
    }
    return set;
  }, [products]);

  const featuredCategories = useMemo(() => {
    const withInventory = categories.filter(
      (c) =>
        publishedCategoryKeys.has(c.name.toLowerCase()) ||
        publishedCategoryKeys.has(c.slug.toLowerCase())
    );
    const featuredWithInventory = withInventory.filter((c) => c.featured);
    const pool =
      featuredWithInventory.length > 0
        ? featuredWithInventory
        : withInventory.length > 0
        ? withInventory
        : categories.filter((c) => c.featured);
    return pool.slice(0, 6);
  }, [categories, publishedCategoryKeys]);

  const featuredBrands = useMemo(() => {
    const withInventory = brands.filter((b) => publishedBrandKeys.has(b.name.toLowerCase()));
    const featuredWithInventory = withInventory.filter((b) => b.featured);
    const pool =
      featuredWithInventory.length > 0
        ? featuredWithInventory
        : withInventory.length > 0
        ? withInventory
        : brands.filter((b) => b.featured);
    return pool.slice(0, 6);
  }, [brands, publishedBrandKeys]);

  const hasQuery = deferredQuery.trim().length > 0;
  const hasFacetFilter = Boolean(selectedFacetBrand || selectedFacetCategorySlug);
  const isSearchActive = hasQuery || hasFacetFilter;

  const baseMatchingProducts = useMemo(() => {
    if (!isSearchActive) return [];
    if (hasQuery) {
      return filterProductsGlobally(products, deferredQuery, filterMode, categories);
    }
    // Browsing directly by brand or category facet inside the overlay
    return products.filter((p) => p.isPublished !== false);
  }, [isSearchActive, hasQuery, products, deferredQuery, filterMode, categories]);

  const matchingCategories = useMemo(() => {
    if (!hasQuery || filterMode === 'name' || filterMode === 'brand' || filterMode === 'sku') {
      return [];
    }
    return resolveAutocompleteCategories({
      products,
      rankedProducts: baseMatchingProducts,
      categories,
      query: deferredQuery,
      filterMode,
      maxResults: 4,
    }).suggestions;
  }, [hasQuery, products, baseMatchingProducts, categories, deferredQuery, filterMode]);

  const matchingBrands = useMemo(() => {
    if (!hasQuery || filterMode === 'name' || filterMode === 'category' || filterMode === 'sku') {
      return [];
    }
    return resolveAutocompleteBrands({
      products,
      rankedProducts: baseMatchingProducts,
      brands,
      query: deferredQuery,
      filterMode,
      maxResults: 4,
    }).suggestions;
  }, [hasQuery, products, baseMatchingProducts, brands, deferredQuery, filterMode]);

  const availableFacets = useMemo(() => {
    if (!isSearchActive) return { brands: [], categories: [] };
    return computeOverlayFacetCounts(baseMatchingProducts, categories);
  }, [isSearchActive, baseMatchingProducts, categories]);

  const refinedProducts = useMemo(() => {
    if (!isSearchActive) return [];
    return filterOverlayResultsByFacets(baseMatchingProducts, categories, {
      selectedBrand: selectedFacetBrand,
      selectedCategorySlug: selectedFacetCategorySlug,
      sortBy,
    });
  }, [
    isSearchActive,
    baseMatchingProducts,
    categories,
    selectedFacetBrand,
    selectedFacetCategorySlug,
    sortBy,
  ]);

  const visibleProducts = useMemo(() => refinedProducts.slice(0, 12), [refinedProducts]);

  const selectedFacetCategoryRecord = useMemo(() => {
    if (!selectedFacetCategorySlug) return null;
    return categories.find((c) => c.slug === selectedFacetCategorySlug) || null;
  }, [categories, selectedFacetCategorySlug]);

  const totalInteractiveItems =
    matchingCategories.length + matchingBrands.length + visibleProducts.length;

  const scopeTabs = useMemo(() => {
    return getFilterModeLabels(lang).map((tab) => {
      if (tab.mode === 'name') {
        return {
          ...tab,
          label: isArabic ? 'بالكلمة / الاسم' : 'By Keyword',
        };
      }
      return tab;
    });
  }, [lang, isArabic]);

  const hasResults =
    matchingCategories.length > 0 ||
    matchingBrands.length > 0 ||
    visibleProducts.length > 0;

  const renderHighlightedText = useCallback(
    (text: string) => {
      if (!hasQuery || !text) return text;
      const segments = splitHighlightedTextSegments(text, deferredQuery);
      return segments.map((seg, idx) =>
        seg.isMatch ? (
          <mark
            key={idx}
            className="bg-[#EAF3FF] dark:bg-[#1E3A5F] text-[#0070F3] dark:text-[#38BDF8] font-bold rounded-xs px-0.5"
          >
            {seg.text}
          </mark>
        ) : (
          <React.Fragment key={idx}>{seg.text}</React.Fragment>
        )
      );
    },
    [hasQuery, deferredQuery]
  );

  const recordTermInHistory = useCallback((term: string) => {
    const clean = term.trim();
    if (!clean) return;
    setSearchHistory(addSearchHistoryTerm(clean));
  }, []);

  const handleSelectProduct = useCallback(
    (product: Product, matchedVariantId?: string) => {
      const trimmedQuery = query.trim();
      const skuHit = trimmedQuery ? findProductSkuMatch(product, trimmedQuery) : null;
      const resolvedVariant =
        skuHit?.matchedVariant ||
        (matchedVariantId && Array.isArray(product.variants)
          ? product.variants.find((v) => v.id === matchedVariantId)
          : undefined);
      const canonicalSku =
        skuHit?.matchedSku || resolvedVariant?.sku?.trim() || product.sku?.trim();

      if ((skuHit || filterMode === 'sku') && canonicalSku) {
        recordRecentSkuSearch({
          sku: canonicalSku,
          product,
          variant: resolvedVariant,
        });
      }

      const historyTerm = trimmedQuery || (isArabic ? product.nameAr || product.name : product.name);
      recordTermInHistory(historyTerm);
      trackSearchQuery({
        term: historyTerm,
        source: 'product_suggestion_click',
        selectedEntityTitle: product.name,
        categoryMatchesCount: matchingCategories.length,
        productMatchesCount: refinedProducts.length,
      });
      viewProductDetail(product.id, false, matchedVariantId);
      setQuery('');
      setSelectedFacetBrand(null);
      setSelectedFacetCategorySlug(null);
      onClose();
    },
    [
      query,
      filterMode,
      isArabic,
      recordTermInHistory,
      matchingCategories.length,
      refinedProducts.length,
      viewProductDetail,
      onClose,
    ]
  );

  const handleQuickAddToCart = useCallback(
    (e: React.MouseEvent, product: Product, matchedVariant?: ProductVariant) => {
      e.stopPropagation();
      const effectiveStock =
        matchedVariant && typeof matchedVariant.stock === 'number'
          ? matchedVariant.stock
          : product.stock;
      if (effectiveStock <= 0) return;
      const defaults = resolveDefaultCartSelection(product, matchedVariant);
      addToCart(
        product,
        1,
        defaults.selectedColor,
        defaults.selectedVariant,
        defaults.selectedColorImage,
        defaults.colorPriceAdjustment
      );
      setRecentlyAddedId(product.id);
      window.setTimeout(() => {
        setRecentlyAddedId((prev) => (prev === product.id ? null : prev));
      }, 1500);
    },
    [addToCart]
  );

  const handleQuickViewFromOverlay = useCallback(
    (e: React.MouseEvent, product: Product) => {
      e.stopPropagation();
      if (query.trim()) {
        recordTermInHistory(query.trim());
      }
      onClose();
      setQuickViewProduct(product);
    },
    [query, recordTermInHistory, onClose, setQuickViewProduct]
  );

  const handleSelectBrand = useCallback(
    (brandName: string) => {
      const historyTerm = query.trim() || brandName;
      recordTermInHistory(historyTerm);
      trackSearchQuery({
        term: historyTerm,
        source: 'desktop_input_submit',
        selectedEntityTitle: brandName,
        categoryMatchesCount: matchingCategories.length,
        productMatchesCount: refinedProducts.length,
      });
      selectBrand(brandName);
      setCurrentView('products');
      setQuery('');
      setSelectedFacetBrand(null);
      setSelectedFacetCategorySlug(null);
      onClose();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    [
      query,
      recordTermInHistory,
      matchingCategories.length,
      refinedProducts.length,
      selectBrand,
      setCurrentView,
      onClose,
    ]
  );

  const handleSelectCategory = useCallback(
    (cat: Pick<MatchedCategoryInfo, 'slug' | 'name' | 'nameAr'>) => {
      const displayName = isArabic ? cat.nameAr || cat.name : cat.name;
      const historyTerm = query.trim() || displayName;
      recordTermInHistory(historyTerm);
      trackSearchQuery({
        term: historyTerm,
        source: 'category_suggestion_click',
        selectedEntityTitle: cat.name,
        categoryMatchesCount: matchingCategories.length,
        productMatchesCount: refinedProducts.length,
      });
      selectCategory(cat.slug);
      setCurrentView('products');
      setQuery('');
      setSelectedFacetBrand(null);
      setSelectedFacetCategorySlug(null);
      onClose();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    [
      query,
      isArabic,
      recordTermInHistory,
      matchingCategories.length,
      refinedProducts.length,
      selectCategory,
      setCurrentView,
      onClose,
    ]
  );

  const executeTermSearch = useCallback(
    (rawTerm: string, source: 'desktop_input_submit' | 'trending_term_click' = 'desktop_input_submit') => {
      const trimmed = rawTerm.trim();
      if (!trimmed) {
        if (selectedFacetBrand || selectedFacetCategorySlug) {
          applyCatalogFilters({
            categorySlug: selectedFacetCategorySlug || null,
            brandName: selectedFacetBrand || null,
            searchQuery: '',
            searchFilterMode: 'all',
          });
          setSelectedFacetBrand(null);
          setSelectedFacetCategorySlug(null);
          onClose();
          return;
        }
        selectCategory(null);
        setSearchQuery('');
        setCurrentView('products');
        onClose();
        return;
      }

      recordTermInHistory(trimmed);

      const catHits = getUniqueMatchingCategories(products, categories, trimmed);
      const brandHits = getUniqueMatchingBrands(products, brands, trimmed);
      const prodHits = filterProductsGlobally(products, trimmed, filterMode, categories);

      trackSearchQuery({
        term: trimmed,
        source,
        categoryMatchesCount: catHits.length,
        productMatchesCount: prodHits.length,
      });

      // Fast-path direct navigation on exact SKU match
      if (filterMode !== 'brand' && filterMode !== 'category') {
        const exactSkuHit = findExactSkuProductMatch(products, trimmed);
        if (exactSkuHit) {
          recordRecentSkuSearch({
            sku: exactSkuHit.matchedSku,
            product: exactSkuHit.product,
            variant: exactSkuHit.matchedVariant,
          });
          viewProductDetail(exactSkuHit.product.id, false, exactSkuHit.matchedVariant?.id);
          setQuery('');
          setSelectedFacetBrand(null);
          setSelectedFacetCategorySlug(null);
          onClose();
          return;
        }
        if (filterMode === 'sku' && prodHits.length === 1) {
          const singleSkuHit = findProductSkuMatch(prodHits[0], trimmed);
          const resolvedSku = singleSkuHit?.matchedSku || prodHits[0].sku?.trim();
          if (resolvedSku) {
            recordRecentSkuSearch({
              sku: resolvedSku,
              product: prodHits[0],
              variant: singleSkuHit?.matchedVariant,
            });
          }
          viewProductDetail(prodHits[0].id, false, singleSkuHit?.matchedVariant?.id);
          setQuery('');
          setSelectedFacetBrand(null);
          setSelectedFacetCategorySlug(null);
          onClose();
          return;
        }
      }

      const lower = trimmed.toLowerCase();
      const matchedBrand = brands.find((b) => b.name.toLowerCase() === lower);
      const matchedCategory = categories.find(
        (c) =>
          c.name.toLowerCase() === lower ||
          (c.nameAr && c.nameAr.toLowerCase() === lower) ||
          c.slug.toLowerCase() === lower
      );

      if (filterMode === 'brand' && (matchedBrand || brandHits.length === 1) && !selectedFacetCategorySlug) {
        selectBrand(matchedBrand ? matchedBrand.name : brandHits[0].name);
      } else if (filterMode === 'category' && (matchedCategory || catHits.length === 1) && !selectedFacetBrand) {
        const target = matchedCategory || catHits[0];
        selectCategory(target.slug);
      } else if (filterMode === 'all' && matchedBrand && !selectedFacetCategorySlug) {
        selectBrand(matchedBrand.name);
      } else if (filterMode === 'all' && matchedCategory && !selectedFacetBrand) {
        selectCategory(matchedCategory.slug);
      } else {
        applyCatalogFilters({
          categorySlug: selectedFacetCategorySlug || null,
          brandName: selectedFacetBrand || null,
          searchQuery: trimmed,
          searchFilterMode: filterMode,
        });
      }

      setQuery('');
      setSelectedFacetBrand(null);
      setSelectedFacetCategorySlug(null);
      onClose();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    [
      applyCatalogFilters,
      brands,
      categories,
      filterMode,
      onClose,
      products,
      recordTermInHistory,
      selectBrand,
      selectCategory,
      selectedFacetBrand,
      selectedFacetCategorySlug,
      setCurrentView,
      setSearchQuery,
      viewProductDetail,
    ]
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (selectedIndex >= 0 && selectedIndex < totalInteractiveItems) {
      if (selectedIndex < matchingCategories.length) {
        handleSelectCategory(matchingCategories[selectedIndex]);
        return;
      }
      if (selectedIndex < matchingCategories.length + matchingBrands.length) {
        const bIdx = selectedIndex - matchingCategories.length;
        handleSelectBrand(matchingBrands[bIdx].name);
        return;
      }
      const pIdx = selectedIndex - matchingCategories.length - matchingBrands.length;
      const picked = visibleProducts[pIdx];
      const skuHit = findProductSkuMatch(picked, query);
      handleSelectProduct(picked, skuHit?.matchedVariant?.id);
      return;
    }

    executeTermSearch(query, 'desktop_input_submit');
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (totalInteractiveItems > 0) {
        setSelectedIndex((prev) => (prev + 1) % totalInteractiveItems);
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (totalInteractiveItems > 0) {
        setSelectedIndex((prev) => (prev <= 0 ? totalInteractiveItems - 1 : prev - 1));
      }
    }
  };

  const handleRemoveHistoryItem = (term: string) => {
    setSearchHistory(removeSearchHistoryTerm(term));
  };

  const handleClearHistory = () => {
    setSearchHistory(clearSearchHistory());
  };

  const handleClearAllFilters = () => {
    setQuery('');
    setSelectedFacetBrand(null);
    setSelectedFacetCategorySlug(null);
    setSortBy('relevance');
    setFilterMode('all');
    inputRef.current?.focus();
  };

  const handleToggleVoiceSearch = () => {
    setVoiceError(null);

    if (isListening) {
      stopVoiceRecognition(false);
      return;
    }

    const RecognitionCtor = getSpeechRecognitionConstructor();
    if (!RecognitionCtor) {
      setVoiceError(mapVoiceSearchError('unsupported', lang));
      return;
    }

    try {
      const recognition = new RecognitionCtor();
      recognition.lang = getVoiceRecognitionLang(lang);
      recognition.interimResults = true;
      recognition.continuous = false;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setIsListening(true);
        setVoiceInterim('');
        setVoiceError(null);
      };

      recognition.onresult = (event) => {
        const extracted = extractTranscriptFromEvent(event);
        if (!extracted.transcript) return;

        setVoiceInterim(extracted.interimTranscript);
        setQuery(extracted.transcript);

        if (extracted.hasFinal) {
          setVoiceInterim('');
          setQuery(extracted.finalTranscript || extracted.transcript);
          inputRef.current?.focus();
        }
      };

      recognition.onerror = (event) => {
        const mapped = mapVoiceSearchError(event.error, lang);
        if (mapped) {
          setVoiceError(mapped);
        }
        stopVoiceRecognition(true);
      };

      recognition.onend = () => {
        recognitionRef.current = null;
        setIsListening(false);
        setVoiceInterim('');
      };

      recognitionRef.current = recognition;
      setIsListening(true);
      recognition.start();
    } catch {
      stopVoiceRecognition(true);
      setVoiceError(mapVoiceSearchError('default', lang));
    }
  };

  if (!isOpen || typeof document === 'undefined') return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={isArabic ? 'البحث السريع في المتجر' : 'Quick Store Search Overlay'}
      data-testid="quick-search-overlay"
      onMouseDown={(e) => {
        if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
          onClose();
        }
      }}
      className="fixed inset-0 z-[100] bg-white/[0.97] dark:bg-[#070C17]/[0.97] backdrop-blur-2xl overflow-y-auto animate-in fade-in duration-150"
    >
      <div
        ref={panelRef}
        className="w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-5 sm:pt-8 pb-16"
      >
        {/* Top Overlay Header */}
        <div className="flex items-center justify-between gap-4 mb-5">
          <div className="flex items-center gap-3 min-w-0">
            <span className="w-9 h-9 rounded-xl bg-[#0A0F2C] dark:bg-[#132238] text-white dark:text-[#38BDF8] border border-[#E2E8F0] dark:border-[#1E3A5F] flex items-center justify-center shrink-0">
              <Search className="w-4 h-4" />
            </span>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-bold text-[#0A0F2C] dark:text-white tracking-tight truncate">
                {isArabic ? 'البحث الفوري في المتجر' : 'Instant Product Search'}
              </h2>
              <p className="text-[11px] sm:text-xs text-[#64748B] dark:text-slate-400 truncate">
                {isArabic
                  ? 'ابحث أثناء الكتابة بالماركة، القسم، الكلمة المفتاحية أو رمز SKU'
                  : 'Search as you type by brand, category, keyword, or SKU'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <kbd className="hidden sm:inline-flex items-center px-2 py-1 rounded-lg text-[11px] font-semibold text-[#64748B] dark:text-slate-400 bg-[#F1F5F9] dark:bg-[#111A2E] border border-[#E2E8F0] dark:border-[#1E293B]">
              ESC
            </kbd>
            <button
              type="button"
              onClick={onClose}
              data-testid="quick-search-close-btn"
              aria-label={isArabic ? 'إغلاق البحث السريع' : 'Close quick search'}
              className="w-10 h-10 rounded-xl bg-[#F8FAFC] dark:bg-[#111A2E] hover:bg-[#E2E8F0] dark:hover:bg-[#1E293B] border border-[#E2E8F0] dark:border-[#1E293B] text-[#0A0F2C] dark:text-slate-200 flex items-center justify-center transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Full-Width Search-As-You-Type Input Form */}
        <form onSubmit={handleSubmit} className="mb-4">
          <div
            className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 bg-[#F8FAFC] dark:bg-[#10182B] border rounded-2xl transition-all shadow-xs ${
              isListening
                ? 'border-rose-500 ring-4 ring-rose-500/15 bg-white dark:bg-[#131F36]'
                : 'border-[#DCE5F0] dark:border-[#1E293B] focus-within:bg-white dark:focus-within:bg-[#131F36] focus-within:border-[#0070F3] focus-within:ring-4 focus-within:ring-[#0070F3]/12'
            }`}
          >
            <Search
              className="w-5 h-5 text-[#0070F3] dark:text-[#38BDF8] shrink-0 pointer-events-none"
              aria-hidden="true"
            />
            <input
              ref={inputRef}
              type="search"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                if (voiceError) setVoiceError(null);
              }}
              onKeyDown={handleInputKeyDown}
              data-testid="quick-search-input"
              placeholder={
                isListening
                  ? isArabic
                    ? 'جاري الاستماع... انطق اسم المنتج'
                    : 'Listening... Speak product name'
                  : filterMode === 'sku'
                  ? isArabic
                    ? 'أدخل رمز SKU للمنتج (مثال: APL-IP16PM-256)...'
                    : 'Enter SKU code (e.g. APL-IP16PM-256)...'
                  : filterMode === 'brand'
                  ? isArabic
                    ? 'ابحث بالماركة (Apple, Samsung, Anker, Tecno...)'
                    : 'Type a brand (Apple, Samsung, Anker, Tecno...)'
                  : filterMode === 'category'
                  ? isArabic
                    ? 'ابحث بالقسم (الهواتف، الشواحن، السماعات...)'
                    : 'Type a category (Smartphones, Audio, Chargers...)'
                  : filterMode === 'name'
                  ? isArabic
                    ? 'ابحث بكلمة مفتاحية أو مواصفة (120Hz, 200W, Titanium...)'
                    : 'Search by keyword, feature, or spec (120Hz, 200W, Titanium...)'
                  : isArabic
                  ? 'ابحث أثناء الكتابة بالاسم، الماركة، القسم، الكلمة المفتاحية أو SKU...'
                  : 'Search as you type: brand, category, keyword, or SKU...'
              }
              aria-label={t.searchPlaceholder || 'Search products by brand, category, or keyword'}
              className="flex-1 min-w-0 bg-transparent text-[#0A0F2C] dark:text-white placeholder-[#64748B] dark:placeholder-slate-400 text-[13px] sm:text-base font-medium py-3.5 sm:py-4 focus:outline-none [&::-webkit-search-cancel-button]:hidden"
            />

            {(query || hasFacetFilter) && (
              <button
                type="button"
                onClick={handleClearAllFilters}
                data-testid="quick-search-clear-input-btn"
                aria-label={isArabic ? 'مسح البحث والفلاتر' : 'Clear search and filters'}
                className="p-2 rounded-lg text-[#64748B] hover:text-[#0A0F2C] dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            )}

            {/* Voice-to-Text Microphone Trigger */}
            <button
              type="button"
              onClick={handleToggleVoiceSearch}
              data-testid="quick-search-voice-btn"
              aria-pressed={isListening}
              aria-label={
                isListening
                  ? isArabic
                    ? 'إيقاف البحث الصوتي'
                    : 'Stop voice search'
                  : isArabic
                  ? 'البحث الصوتي عن منتج'
                  : 'Search by voice'
              }
              title={
                isListening
                  ? isArabic
                    ? 'إيقاف الاستماع'
                    : 'Stop listening'
                  : isArabic
                  ? 'تحدث للبحث عن منتج'
                  : 'Speak product name to search'
              }
              className={`relative flex items-center justify-center w-10 h-10 rounded-xl border transition-all cursor-pointer shrink-0 ${
                isListening
                  ? 'bg-rose-500 border-rose-500 text-white shadow-sm shadow-rose-500/30'
                  : 'bg-white dark:bg-[#162038] border-[#DCE5F0] dark:border-[#1E293B] text-[#475569] dark:text-slate-300 hover:text-[#0070F3] dark:hover:text-[#38BDF8] hover:border-[#0070F3]'
              }`}
            >
              {isListening && (
                <span
                  aria-hidden="true"
                  className="absolute inset-0 rounded-xl bg-rose-500/40 animate-ping"
                />
              )}
              {isListening ? (
                <Square className="w-3.5 h-3.5 relative z-10 fill-current" />
              ) : (
                <Mic className="w-4 h-4 relative z-10" />
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                stopVoiceRecognition(true);
                onClose();
                setIsQrScannerOpen(true);
              }}
              data-testid="quick-search-qr-btn"
              aria-label={isArabic ? 'مسح رمز QR للمنتج' : 'Scan Product QR Code'}
              title={isArabic ? 'مسح رمز QR للمنتج' : 'Scan Product QR Code'}
              className="flex items-center justify-center w-10 h-10 rounded-xl border bg-white dark:bg-[#162038] border-[#DCE5F0] dark:border-[#1E293B] text-[#475569] dark:text-slate-300 hover:text-[#0070F3] dark:hover:text-[#38BDF8] hover:border-[#0070F3] transition-all cursor-pointer shrink-0"
            >
              <QrCode className="w-4 h-4" />
            </button>

            <button
              type="submit"
              data-testid="quick-search-submit-btn"
              className="bg-[#0A0F2C] hover:bg-[#16204A] dark:bg-[#0070F3] dark:hover:bg-[#0051D5] active:scale-[0.98] text-white text-xs sm:text-sm font-semibold px-4 sm:px-5 h-10 rounded-xl transition-all cursor-pointer whitespace-nowrap shrink-0"
            >
              {isArabic ? 'بحث' : 'Search'}
            </button>
          </div>

          {/* Live Voice Listening Status Strip */}
          {isListening && (
            <div
              role="status"
              aria-live="polite"
              data-testid="quick-search-voice-status"
              className="mt-2.5 px-3.5 py-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/35 border border-rose-200 dark:border-rose-800/60 flex items-center justify-between gap-3"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse shrink-0" />
                <span className="text-xs sm:text-[13px] font-semibold text-rose-700 dark:text-rose-300 truncate">
                  {voiceInterim
                    ? `"${voiceInterim}"`
                    : isArabic
                    ? 'جاري الاستماع... تحدث باسم المنتج أو الماركة'
                    : 'Listening... Speak a product name, brand, or category'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => stopVoiceRecognition(false)}
                className="text-xs font-bold text-rose-700 dark:text-rose-300 hover:underline cursor-pointer whitespace-nowrap shrink-0"
              >
                {isArabic ? 'إيقاف' : 'Stop'}
              </button>
            </div>
          )}

          {/* Recoverable Voice Notice / Permission Error */}
          {voiceError && !isListening && (
            <div
              role="alert"
              data-testid="quick-search-voice-error"
              className="mt-2.5 px-3.5 py-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/35 border border-amber-200 dark:border-amber-800/60 flex items-center justify-between gap-3"
            >
              <div className="flex items-center gap-2 min-w-0">
                <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                <span className="text-xs sm:text-[13px] font-medium text-amber-800 dark:text-amber-200">
                  {voiceError}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setVoiceError(null)}
                aria-label={isArabic ? 'إغلاق التنبيه' : 'Dismiss voice notice'}
                className="p-1 text-amber-700 dark:text-amber-300 hover:text-amber-900 cursor-pointer shrink-0"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </form>

        {/* Search Scope Selector Tabs + Live Search-As-You-Type Summary */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 mb-5 border-b border-[#E2E8F0] dark:border-[#1E293B]">
          <div className="flex flex-wrap items-center gap-2 text-xs text-[#64748B] dark:text-slate-400">
            <SlidersHorizontal className="w-3.5 h-3.5 text-[#0070F3]" aria-hidden="true" />
            <span className="font-semibold">{isArabic ? 'نطاق البحث:' : 'Search by:'}</span>
            {isSearchActive && (
              <span
                role="status"
                aria-live="polite"
                data-testid="quick-search-live-count"
                className="inline-flex items-center flex-wrap gap-x-1.5 gap-y-0.5 pl-2 rtl:pl-0 rtl:pr-2 border-l rtl:border-l-0 rtl:border-r border-[#E2E8F0] dark:border-[#1E293B] text-xs font-medium text-[#0A0F2C] dark:text-slate-200 tabular-nums"
              >
                <span>
                  {isArabic
                    ? `${refinedProducts.length} منتج`
                    : `${refinedProducts.length} ${refinedProducts.length === 1 ? 'product' : 'products'}`}
                </span>
                {hasQuery && matchingBrands.length > 0 && (
                  <>
                    <span aria-hidden="true" className="text-[#94A3B8]">·</span>
                    <span>
                      {isArabic
                        ? `${matchingBrands.length} ماركة`
                        : `${matchingBrands.length} ${matchingBrands.length === 1 ? 'brand' : 'brands'}`}
                    </span>
                  </>
                )}
                {hasQuery && matchingCategories.length > 0 && (
                  <>
                    <span aria-hidden="true" className="text-[#94A3B8]">·</span>
                    <span>
                      {isArabic
                        ? `${matchingCategories.length} قسم`
                        : `${matchingCategories.length} ${matchingCategories.length === 1 ? 'category' : 'categories'}`}
                    </span>
                  </>
                )}
              </span>
            )}
          </div>

          <div
            role="tablist"
            aria-label={isArabic ? 'نطاق البحث' : 'Search scope'}
            className="flex flex-wrap items-center gap-1 bg-[#F1F5F9] dark:bg-[#10182B] p-1 rounded-xl border border-[#E2E8F0] dark:border-[#1E293B] w-full sm:w-auto"
          >
            {scopeTabs.map((tab) => {
              const isActive = filterMode === tab.mode;
              return (
                <button
                  key={tab.mode}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  data-testid={`quick-search-scope-${tab.mode}`}
                  onClick={() => {
                    setFilterMode(tab.mode);
                    inputRef.current?.focus();
                  }}
                  className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-[11px] sm:text-xs font-semibold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                    isActive
                      ? 'bg-[#0A0F2C] dark:bg-[#0070F3] text-white shadow-xs'
                      : 'text-[#64748B] dark:text-slate-400 hover:text-[#0A0F2C] dark:hover:text-white'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* BODY STATE 1: Empty Query & No Active Facet -> Discovery Hub */}
        {!isSearchActive ? (
          <div className="space-y-8">
            {/* Search History */}
            <section
              aria-labelledby="quick-search-history-heading"
              data-testid="quick-search-history-section"
            >
              <div className="flex items-center justify-between gap-3 mb-3">
                <h3
                  id="quick-search-history-heading"
                  className="text-xs font-bold uppercase tracking-wider text-[#64748B] dark:text-slate-400 flex items-center gap-2"
                >
                  <Clock className="w-3.5 h-3.5 text-[#0070F3]" aria-hidden="true" />
                  <span>{isArabic ? 'سجل البحث الأخير' : 'Recent Searches'}</span>
                </h3>

                {searchHistory.length > 0 && (
                  <button
                    type="button"
                    onClick={handleClearHistory}
                    data-testid="quick-search-clear-history"
                    className="inline-flex items-center gap-1 text-xs font-semibold text-[#64748B] dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>{isArabic ? 'مسح الكل' : 'Clear All'}</span>
                  </button>
                )}
              </div>

              {searchHistory.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {searchHistory.map((term) => (
                    <div
                      key={term}
                      className="inline-flex items-center rounded-xl bg-[#F8FAFC] dark:bg-[#10182B] border border-[#E2E8F0] dark:border-[#1E293B] hover:border-[#0070F3] transition-colors group"
                    >
                      <button
                        type="button"
                        onClick={() => {
                          setQuery(term);
                          inputRef.current?.focus();
                        }}
                        className="inline-flex items-center gap-1.5 pl-3 pr-2 py-2 text-xs sm:text-[13px] font-medium text-[#0A0F2C] dark:text-slate-200 group-hover:text-[#0070F3] dark:group-hover:text-[#38BDF8] cursor-pointer whitespace-nowrap"
                      >
                        <Clock className="w-3.5 h-3.5 text-[#94A3B8] shrink-0" aria-hidden="true" />
                        <span>{term}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveHistoryItem(term)}
                        aria-label={
                          isArabic ? `إزالة ${term} من السجل` : `Remove ${term} from search history`
                        }
                        className="pr-2.5 pl-1 py-2 text-[#94A3B8] hover:text-rose-500 transition-colors cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs sm:text-[13px] text-[#64748B] dark:text-slate-400 py-1">
                  {isArabic
                    ? 'اكتب اسم المنتج أو الماركة أو القسم لتظهر النتائج فوراً أثناء الكتابة.'
                    : 'Start typing a product, brand, category, or SKU to see instant live results.'}
                </p>
              )}
            </section>

            {/* Popular Keywords (populates live search-as-you-type immediately) */}
            <section
              aria-labelledby="quick-search-popular-heading"
              data-testid="quick-search-popular-section"
            >
              <div className="flex items-center justify-between gap-3 mb-3">
                <h3
                  id="quick-search-popular-heading"
                  className="text-xs font-bold uppercase tracking-wider text-[#64748B] dark:text-slate-400 flex items-center gap-2"
                >
                  <TrendingUp className="w-3.5 h-3.5 text-[#0070F3]" aria-hidden="true" />
                  <span>{isArabic ? 'كلمات البحث الشائعة' : 'Popular Keywords'}</span>
                </h3>
              </div>

              <div className="flex flex-wrap gap-2">
                {popularKeywords.map((item) => (
                  <button
                    key={item.term}
                    type="button"
                    data-testid={`quick-search-keyword-${item.term}`}
                    onClick={() => {
                      setQuery(item.term);
                      inputRef.current?.focus();
                    }}
                    className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white dark:bg-[#0E1726] hover:bg-[#EFF6FF] dark:hover:bg-[#162742] border border-[#E2E8F0] dark:border-[#1E293B] hover:border-[#0070F3] text-xs sm:text-[13px] font-semibold text-[#0A0F2C] dark:text-slate-200 hover:text-[#0070F3] dark:hover:text-[#38BDF8] transition-all cursor-pointer whitespace-nowrap"
                  >
                    <TrendingUp
                      className={`w-3.5 h-3.5 shrink-0 ${
                        item.isTrending ? 'text-[#0070F3] dark:text-[#38BDF8]' : 'text-[#94A3B8]'
                      }`}
                      aria-hidden="true"
                    />
                    <span>{item.term}</span>
                  </button>
                ))}
              </div>
            </section>

            {/* Quick Departments & Featured Brands (Filter right inside overlay!) */}
            {(featuredCategories.length > 0 || featuredBrands.length > 0) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-[#E2E8F0] dark:border-[#1E293B]">
                {featuredCategories.length > 0 && (
                  <section>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-[#64748B] dark:text-slate-400 flex items-center gap-2 mb-3">
                      <Folder className="w-3.5 h-3.5 text-[#0070F3]" aria-hidden="true" />
                      <span>{isArabic ? 'تصفح حسب القسم' : 'Browse by Category'}</span>
                    </h3>
                    <div className="grid grid-cols-2 gap-2">
                      {featuredCategories.map((cat) => (
                        <button
                          key={cat.id}
                          type="button"
                          data-testid={`quick-search-browse-category-${cat.slug}`}
                          onClick={() => {
                            setSelectedFacetCategorySlug(cat.slug);
                            setSelectedFacetBrand(null);
                            inputRef.current?.focus();
                          }}
                          className="p-2.5 rounded-xl bg-[#F8FAFC] dark:bg-[#10182B] hover:bg-[#EFF6FF] dark:hover:bg-[#162742] border border-[#E2E8F0] dark:border-[#1E293B] hover:border-[#0070F3] text-left rtl:text-right transition-all cursor-pointer group flex items-center justify-between gap-2"
                        >
                          <span className="text-xs font-semibold text-[#0A0F2C] dark:text-slate-200 group-hover:text-[#0070F3] dark:group-hover:text-[#38BDF8] truncate">
                            {isArabic ? cat.nameAr : cat.name}
                          </span>
                          <ChevronIcon className="w-3.5 h-3.5 text-[#94A3B8] group-hover:text-[#0070F3] shrink-0" />
                        </button>
                      ))}
                    </div>
                  </section>
                )}

                {featuredBrands.length > 0 && (
                  <section>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-[#64748B] dark:text-slate-400 flex items-center gap-2 mb-3">
                      <Tag className="w-3.5 h-3.5 text-[#0070F3]" aria-hidden="true" />
                      <span>{isArabic ? 'تصفح حسب الماركة' : 'Browse by Brand'}</span>
                    </h3>
                    <div className="grid grid-cols-3 gap-2">
                      {featuredBrands.map((b) => (
                        <button
                          key={b.id}
                          type="button"
                          data-testid={`quick-search-browse-brand-${b.name}`}
                          onClick={() => {
                            setSelectedFacetBrand(b.name);
                            setSelectedFacetCategorySlug(null);
                            inputRef.current?.focus();
                          }}
                          className="p-2.5 rounded-xl bg-[#F8FAFC] dark:bg-[#10182B] hover:bg-[#EFF6FF] dark:hover:bg-[#162742] border border-[#E2E8F0] dark:border-[#1E293B] hover:border-[#0070F3] text-center transition-all cursor-pointer group"
                        >
                          <span className="text-xs font-bold text-[#0A0F2C] dark:text-slate-200 group-hover:text-[#0070F3] dark:group-hover:text-[#38BDF8] truncate block">
                            {b.name}
                          </span>
                        </button>
                      ))}
                    </div>
                  </section>
                )}
              </div>
            )}
          </div>
        ) : hasResults ? (
          /* BODY STATE 2: Live Search-As-You-Type & Facet Refinement Results */
          <div className="space-y-6">
            {/* Interactive Brand & Category Facet Refinement Bar + Sort */}
            {(availableFacets.brands.length > 0 ||
              availableFacets.categories.length > 0 ||
              hasFacetFilter) && (
              <div
                className="p-3 rounded-xl bg-[#F8FAFC] dark:bg-[#0E1726] border border-[#E2E8F0] dark:border-[#1E293B] space-y-2.5"
                data-testid="quick-search-facet-bar"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#64748B] dark:text-slate-400">
                      {isArabic ? 'تصفية فورية:' : 'Refine:'}
                    </span>

                    {selectedFacetBrand && (
                      <button
                        type="button"
                        onClick={() => setSelectedFacetBrand(null)}
                        data-testid="quick-search-active-brand-chip"
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#0A0F2C] dark:bg-[#0070F3] text-white text-xs font-semibold cursor-pointer whitespace-nowrap"
                      >
                        <span>
                          {isArabic ? 'الماركة:' : 'Brand:'} {selectedFacetBrand}
                        </span>
                        <X className="w-3 h-3" />
                      </button>
                    )}

                    {selectedFacetCategoryRecord && (
                      <button
                        type="button"
                        onClick={() => setSelectedFacetCategorySlug(null)}
                        data-testid="quick-search-active-category-chip"
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#0A0F2C] dark:bg-[#0070F3] text-white text-xs font-semibold cursor-pointer whitespace-nowrap"
                      >
                        <span>
                          {isArabic
                            ? selectedFacetCategoryRecord.nameAr
                            : selectedFacetCategoryRecord.name}
                        </span>
                        <X className="w-3 h-3" />
                      </button>
                    )}

                    {hasFacetFilter && (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedFacetBrand(null);
                          setSelectedFacetCategorySlug(null);
                        }}
                        className="text-xs font-semibold text-[#64748B] hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 underline cursor-pointer"
                      >
                        {isArabic ? 'إعادة ضبط' : 'Reset'}
                      </button>
                    )}
                  </div>

                  {/* Quick Price Sort Toggle */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <ArrowUpDown className="w-3.5 h-3.5 text-[#64748B]" aria-hidden="true" />
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as OverlaySortOption)}
                      aria-label={isArabic ? 'ترتيب النتائج' : 'Sort search results'}
                      data-testid="quick-search-sort-select"
                      className="text-xs font-semibold bg-white dark:bg-[#111A2E] text-[#0A0F2C] dark:text-slate-200 border border-[#E2E8F0] dark:border-[#1E293B] rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-[#0070F3] cursor-pointer"
                    >
                      <option value="relevance">{isArabic ? 'الأكثر تطابقاً' : 'Best Match'}</option>
                      <option value="price_asc">{isArabic ? 'السعر: الأقل أولاً' : 'Price: Low → High'}</option>
                      <option value="price_desc">{isArabic ? 'السعر: الأعلى أولاً' : 'Price: High → Low'}</option>
                    </select>
                  </div>
                </div>

                {/* Clickable Brand & Category Refinement Buttons */}
                {(availableFacets.brands.length > 1 ||
                  availableFacets.categories.length > 1 ||
                  (!hasFacetFilter &&
                    (availableFacets.brands.length > 0 || availableFacets.categories.length > 0))) && (
                  <div className="flex flex-wrap items-center gap-1.5">
                    {availableFacets.brands.slice(0, 6).map((b) => {
                      const active =
                        selectedFacetBrand?.toLowerCase() === b.name.toLowerCase();
                      return (
                        <button
                          key={`facet-brand-${b.name}`}
                          type="button"
                          data-testid={`quick-search-facet-brand-${b.name}`}
                          onClick={() =>
                            setSelectedFacetBrand(active ? null : b.name)
                          }
                          className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors cursor-pointer whitespace-nowrap tabular-nums ${
                            active
                              ? 'bg-[#0070F3] text-white border-[#0070F3]'
                              : 'bg-white dark:bg-[#111A2E] text-[#0A0F2C] dark:text-slate-200 border-[#E2E8F0] dark:border-[#1E293B] hover:border-[#0070F3]'
                          }`}
                        >
                          {b.name} ({b.count})
                        </button>
                      );
                    })}

                    {availableFacets.categories.slice(0, 5).map((cat) => {
                      const active = selectedFacetCategorySlug === cat.slug;
                      return (
                        <button
                          key={`facet-cat-${cat.slug}`}
                          type="button"
                          data-testid={`quick-search-facet-cat-${cat.slug}`}
                          onClick={() =>
                            setSelectedFacetCategorySlug(active ? null : cat.slug)
                          }
                          className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors cursor-pointer whitespace-nowrap tabular-nums ${
                            active
                              ? 'bg-[#0A0F2C] dark:bg-[#0070F3] text-white border-[#0A0F2C] dark:border-[#0070F3]'
                              : 'bg-white dark:bg-[#111A2E] text-[#475569] dark:text-slate-300 border-[#E2E8F0] dark:border-[#1E293B] hover:border-[#0A0F2C]'
                          }`}
                        >
                          {isArabic ? cat.nameAr : cat.name} ({cat.count})
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Matching Categories */}
            {matchingCategories.length > 0 && (
              <section>
                <div className="text-xs font-bold uppercase tracking-wider text-[#64748B] dark:text-slate-400 flex items-center gap-2 mb-2.5">
                  <Folder className="w-3.5 h-3.5 text-[#0070F3]" aria-hidden="true" />
                  <span>{isArabic ? 'الأقسام المطابقة' : 'Matching Categories'}</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {matchingCategories.map((cat, catIdx) => {
                    const isHighlighted = selectedIndex === catIdx;
                    return (
                      <button
                        key={cat.id}
                        ref={(el) => {
                          itemRefs.current[catIdx] = el;
                        }}
                        type="button"
                        onClick={() => handleSelectCategory(cat)}
                        className={`w-full text-left rtl:text-right p-3 rounded-xl border transition-all flex items-center justify-between gap-3 cursor-pointer group ${
                          isHighlighted
                            ? 'bg-[#EFF6FF] dark:bg-[#162742] border-[#0070F3] text-[#0070F3] dark:text-[#38BDF8]'
                            : 'bg-white dark:bg-[#0E1726] border-[#E2E8F0] dark:border-[#1E293B] hover:border-[#0070F3]'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 rounded-lg bg-[#EFF6FF] dark:bg-[#132238] border border-[#E2E8F0] dark:border-[#1E293B] text-[#0070F3] dark:text-[#38BDF8] flex items-center justify-center shrink-0 overflow-hidden">
                            {cat.image ? (
                              <LazyImage
                                src={cat.image}
                                alt={isArabic ? cat.nameAr : cat.name}
                                priority={true}
                                loading="lazy"
                                width={40}
                                height={40}
                                responsiveSizes="40px"
                                wrapperClassName="w-full h-full flex items-center justify-center"
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                              />
                            ) : (
                              <Folder className="w-4 h-4" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs sm:text-sm font-bold text-[#0A0F2C] dark:text-white truncate">
                              {renderHighlightedText(isArabic ? cat.nameAr : cat.name)}
                            </p>
                            <p className="text-[11px] text-[#64748B] dark:text-slate-400 truncate">
                              {isArabic ? cat.name : cat.nameAr}
                            </p>
                          </div>
                        </div>
                        <span className="text-xs font-semibold text-[#0070F3] dark:text-[#38BDF8] tabular-nums whitespace-nowrap shrink-0">
                          {isArabic
                            ? `${cat.count} منتج`
                            : cat.count === 1
                            ? '1 item'
                            : `${cat.count} items`}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </section>
            )}

            {/* Matching Brands */}
            {matchingBrands.length > 0 && (
              <section>
                <div className="text-xs font-bold uppercase tracking-wider text-[#64748B] dark:text-slate-400 flex items-center gap-2 mb-2.5">
                  <Tag className="w-3.5 h-3.5 text-emerald-600" aria-hidden="true" />
                  <span>{isArabic ? 'الماركات المطابقة' : 'Matching Brands'}</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {matchingBrands.map((b, bIdx) => {
                    const globalIdx = matchingCategories.length + bIdx;
                    const isHighlighted = selectedIndex === globalIdx;
                    return (
                      <button
                        key={b.name}
                        ref={(el) => {
                          itemRefs.current[globalIdx] = el;
                        }}
                        type="button"
                        onClick={() => handleSelectBrand(b.name)}
                        className={`w-full text-left rtl:text-right p-3 rounded-xl border transition-all flex items-center justify-between gap-3 cursor-pointer group ${
                          isHighlighted
                            ? 'bg-[#EFF6FF] dark:bg-[#162742] border-[#0070F3]'
                            : 'bg-white dark:bg-[#0E1726] border-[#E2E8F0] dark:border-[#1E293B] hover:border-[#0070F3]'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-9 h-9 rounded-lg bg-[#F8FAFC] dark:bg-[#132238] border border-[#E2E8F0] dark:border-[#1E293B] flex items-center justify-center p-1 shrink-0 overflow-hidden">
                            {b.logo ? (
                              <LazyImage
                                src={b.logo}
                                alt={b.name}
                                priority={true}
                                loading="lazy"
                                width={28}
                                height={28}
                                responsiveSizes="28px"
                                wrapperClassName="w-full h-full flex items-center justify-center"
                                className="w-full h-full object-contain"
                              />
                            ) : (
                              <Tag className="w-4 h-4 text-emerald-600" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs sm:text-sm font-bold text-[#0A0F2C] dark:text-white truncate">
                              {renderHighlightedText(b.name)}
                            </p>
                            <p className="text-[11px] text-[#64748B] dark:text-slate-400 truncate">
                              {isArabic ? `تصفح منتجات ${b.name}` : `Explore ${b.name}`}
                            </p>
                          </div>
                        </div>
                        {b.count > 0 && (
                          <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums whitespace-nowrap shrink-0">
                            {isArabic
                              ? `${b.count} منتج`
                              : b.count === 1
                              ? '1 item'
                              : `${b.count} items`}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </section>
            )}

            {/* Matching Products (Search-As-You-Type Cards with Highlighting + Quick Add) */}
            {visibleProducts.length > 0 && (
              <section>
                <div className="flex items-center justify-between gap-2 mb-2.5">
                  <div className="text-xs font-bold uppercase tracking-wider text-[#64748B] dark:text-slate-400 flex items-center gap-2">
                    <Box className="w-3.5 h-3.5 text-[#0070F3]" aria-hidden="true" />
                    <span>{isArabic ? 'المنتجات المطابقة' : 'Matching Products'}</span>
                  </div>
                  {refinedProducts.length > visibleProducts.length && (
                    <span className="text-[11px] font-medium text-[#64748B] dark:text-slate-400 tabular-nums">
                      {isArabic
                        ? `عرض ${visibleProducts.length} من ${refinedProducts.length}`
                        : `Showing ${visibleProducts.length} of ${refinedProducts.length}`}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  {visibleProducts.map((p, pIdx) => {
                    const globalIdx = matchingCategories.length + matchingBrands.length + pIdx;
                    const isHighlighted = selectedIndex === globalIdx;
                    const skuMatch = hasQuery ? findProductSkuMatch(p, deferredQuery) : null;
                    const displayPrice =
                      skuMatch?.matchedVariant && Number.isFinite(skuMatch.matchedVariant.price)
                        ? skuMatch.matchedVariant.price
                        : p.price;
                    const displayStock =
                      skuMatch?.matchedVariant && typeof skuMatch.matchedVariant.stock === 'number'
                        ? skuMatch.matchedVariant.stock
                        : p.stock;
                    const displaySku = skuMatch ? skuMatch.matchedSku : p.sku;
                    const hasDiscount = !skuMatch?.matchedVariant && p.originalPrice > p.price;
                    const isLowStock = displayStock > 0 && displayStock <= (p.lowStockThreshold || 3);
                    const isOutOfStock = displayStock <= 0;
                    const isJustAdded = recentlyAddedId === p.id;
                    const productTitle = isArabic ? p.nameAr || p.name : p.name;

                    return (
                      <div
                        key={p.id}
                        ref={(el) => {
                          itemRefs.current[globalIdx] = el;
                        }}
                        data-testid={`quick-search-result-${p.id}`}
                        className={`rounded-xl border transition-all flex items-stretch gap-2 p-2.5 ${
                          isHighlighted
                            ? 'bg-[#EFF6FF] dark:bg-[#162742] border-[#0070F3]'
                            : 'bg-white dark:bg-[#0E1726] border-[#E2E8F0] dark:border-[#1E293B] hover:border-[#0070F3]'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => handleSelectProduct(p, skuMatch?.matchedVariant?.id)}
                          className="flex-1 min-w-0 text-left rtl:text-right flex items-center gap-3 cursor-pointer group"
                        >
                          <div className="w-14 h-14 rounded-xl bg-[#F8FAFC] dark:bg-[#111A2E] border border-[#E2E8F0] dark:border-[#1E293B] overflow-hidden flex-shrink-0 flex items-center justify-center relative p-1">
                            {p.images && p.images[0] ? (
                              <LazyImage
                                src={p.images[0]}
                                alt={productTitle}
                                priority={true}
                                loading="lazy"
                                width={52}
                                height={52}
                                responsiveSizes="52px"
                                wrapperClassName="w-full h-full flex items-center justify-center"
                                className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-200"
                              />
                            ) : (
                              <Smartphone className="w-5 h-5 text-[#64748B]" />
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 text-[11px] mb-0.5 truncate">
                              <span className="font-bold text-[#0070F3] dark:text-[#38BDF8] truncate">
                                {renderHighlightedText(p.brand)}
                              </span>
                              <span aria-hidden="true" className="text-[#94A3B8]">
                                ·
                              </span>
                              <span className="text-[#64748B] dark:text-slate-400 truncate">
                                {renderHighlightedText(p.category)}
                              </span>
                              <span aria-hidden="true" className="text-[#94A3B8]">
                                ·
                              </span>
                              {isOutOfStock ? (
                                <span className="font-semibold text-rose-500 whitespace-nowrap">
                                  {isArabic ? 'نفذت الكمية' : 'Out of stock'}
                                </span>
                              ) : isLowStock ? (
                                <span className="font-semibold text-amber-600 dark:text-amber-400 inline-flex items-center gap-0.5 whitespace-nowrap">
                                  <AlertTriangle className="w-3 h-3" />
                                  <span>{isArabic ? 'كمية محدودة' : 'Low stock'}</span>
                                </span>
                              ) : (
                                <span className="font-semibold text-emerald-600 dark:text-emerald-400 inline-flex items-center gap-0.5 whitespace-nowrap">
                                  <CheckCircle2 className="w-3 h-3" />
                                  <span>{isArabic ? 'متوفر' : 'In stock'}</span>
                                </span>
                              )}
                            </div>

                            <p className="text-xs sm:text-sm font-semibold text-[#0A0F2C] dark:text-white group-hover:text-[#0070F3] dark:group-hover:text-[#38BDF8] truncate">
                              {renderHighlightedText(productTitle)}
                              {skuMatch?.matchedVariant ? ` · ${skuMatch.matchedVariant.name}` : ''}
                            </p>

                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              <span className="text-xs sm:text-sm font-extrabold text-[#0A0F2C] dark:text-[#38BDF8] tabular-nums">
                                ${displayPrice}
                              </span>
                              {hasDiscount && (
                                <span className="text-[11px] text-[#94A3B8] line-through tabular-nums">
                                  ${p.originalPrice}
                                </span>
                              )}
                              {displaySku && (
                                <span className="font-mono text-[10px] text-[#64748B] dark:text-slate-400">
                                  SKU: {renderHighlightedText(displaySku)}
                                </span>
                              )}
                            </div>
                          </div>
                        </button>

                        {/* Quick Actions: Quick View + 1-Click Add to Cart */}
                        <div className="flex flex-col justify-center gap-1.5 shrink-0 border-l rtl:border-l-0 rtl:border-r border-[#E2E8F0] dark:border-[#1E293B] pl-2 rtl:pl-0 rtl:pr-2">
                          <button
                            type="button"
                            onClick={(e) => handleQuickViewFromOverlay(e, p)}
                            data-testid={`overlay-quick-view-${p.id}`}
                            aria-label={isArabic ? `معاينة سريعة: ${productTitle}` : `Quick view ${productTitle}`}
                            title={isArabic ? 'معاينة سريعة' : 'Quick View'}
                            className="w-8 h-8 rounded-lg border border-[#E2E8F0] dark:border-[#1E293B] bg-[#F8FAFC] dark:bg-[#111A2E] hover:border-[#0070F3] text-[#475569] dark:text-slate-300 hover:text-[#0070F3] flex items-center justify-center transition-colors cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            disabled={isOutOfStock}
                            onClick={(e) => handleQuickAddToCart(e, p, skuMatch?.matchedVariant)}
                            data-testid={`overlay-quick-add-${p.id}`}
                            aria-label={
                              isOutOfStock
                                ? isArabic
                                  ? 'غير متوفر'
                                  : 'Out of stock'
                                : isArabic
                                ? `أضف ${productTitle} إلى السلة`
                                : `Add ${productTitle} to cart`
                            }
                            title={
                              isOutOfStock
                                ? isArabic
                                  ? 'نفذت الكمية'
                                  : 'Out of stock'
                                : isArabic
                                ? 'إضافة سريعة للسلة'
                                : 'Quick add to cart'
                            }
                            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                              isOutOfStock
                                ? 'bg-slate-100 dark:bg-slate-900 text-slate-400 cursor-not-allowed'
                                : isJustAdded
                                ? 'bg-[#16A34A] text-white cursor-pointer'
                                : 'bg-[#0A0F2C] dark:bg-[#0070F3] hover:bg-[#16204A] dark:hover:bg-[#0051D5] text-white cursor-pointer'
                            }`}
                          >
                            {isJustAdded ? (
                              <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                            ) : (
                              <ShoppingBag className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* Footer CTA: View All Results in Storefront */}
            <div className="pt-4 border-t border-[#E2E8F0] dark:border-[#1E293B]">
              <button
                type="button"
                data-testid="quick-search-view-all-btn"
                onClick={() => {
                  if (hasQuery && refinedProducts.length === 0) {
                    if (matchingBrands.length > 0) {
                      handleSelectBrand(matchingBrands[0].name);
                      return;
                    }
                    if (matchingCategories.length > 0) {
                      handleSelectCategory(matchingCategories[0]);
                      return;
                    }
                  }
                  executeTermSearch(query, 'desktop_input_submit');
                }}
                className="w-full py-3 px-4 rounded-xl bg-[#0A0F2C] hover:bg-[#16204A] dark:bg-[#0070F3] dark:hover:bg-[#0051D5] text-white text-xs sm:text-sm font-bold transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>
                  {hasQuery
                    ? refinedProducts.length > 0
                      ? isArabic
                        ? `عرض كافة النتائج لـ "${query}" في المتجر (${refinedProducts.length})`
                        : `View all ${refinedProducts.length} results for "${query}" in Catalog`
                      : matchingBrands.length > 0
                      ? isArabic
                        ? `استكشف منتجات ${matchingBrands[0].name} في المتجر`
                        : `Explore ${matchingBrands[0].name} products in Catalog`
                      : matchingCategories.length > 0
                      ? isArabic
                        ? `استكشف قسم ${matchingCategories[0].nameAr || matchingCategories[0].name} في المتجر`
                        : `Explore ${matchingCategories[0].name} in Catalog`
                      : isArabic
                      ? `البحث عن "${query}" في المتجر`
                      : `Search "${query}" in Catalog`
                    : selectedFacetBrand
                    ? isArabic
                      ? `عرض كافة منتجات ${selectedFacetBrand} في المتجر`
                      : `Explore all ${selectedFacetBrand} products in Store`
                    : isArabic
                    ? 'عرض كافة منتجات القسم في المتجر'
                    : 'Explore this department in Store'}
                </span>
                <ArrowIcon className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          /* BODY STATE 3: No Results */
          <div
            data-testid="quick-search-empty-state"
            className="py-12 text-center bg-[#F8FAFC] dark:bg-[#0E1726] rounded-2xl border border-[#E2E8F0] dark:border-[#1E293B] px-4"
          >
            <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-500 flex items-center justify-center mx-auto mb-3">
              <Search className="w-6 h-6" />
            </div>
            <p className="text-sm font-bold text-[#0A0F2C] dark:text-white mb-1">
              {hasQuery
                ? isArabic
                  ? `لم نجد نتائج تطابق "${query}"`
                  : `No results matching "${query}"`
                : isArabic
                ? 'لا توجد منتجات مطابقة للفلاتر المختارة'
                : 'No products match the selected filters'}
            </p>
            <p className="text-xs text-[#64748B] dark:text-slate-400 max-w-md mx-auto mb-4">
              {isArabic
                ? 'جرب مسح الفلاتر أو البحث باسم المنتج، الماركة (Apple, Samsung, Anker)، أو القسم.'
                : 'Try clearing active filters or searching by product keyword, brand (Apple, Samsung, Anker), or category.'}
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2">
              <button
                type="button"
                onClick={handleClearAllFilters}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-[#E2E8F0] dark:border-[#1E293B] bg-white dark:bg-[#111A2E] hover:border-[#0070F3] text-[#0A0F2C] dark:text-white text-xs font-bold transition-colors cursor-pointer"
              >
                <span>{isArabic ? 'مسح البحث والفلاتر' : 'Reset Search & Filters'}</span>
              </button>
              <button
                type="button"
                onClick={() => executeTermSearch(query, 'desktop_input_submit')}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#0A0F2C] dark:bg-[#0070F3] hover:bg-[#16204A] dark:hover:bg-[#0051D5] text-white text-xs font-bold transition-colors cursor-pointer"
              >
                <span>{isArabic ? 'تصفح كامل الكتالوج' : 'Browse Full Catalog'}</span>
                <ArrowIcon className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};
