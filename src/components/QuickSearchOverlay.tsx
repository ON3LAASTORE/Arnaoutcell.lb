import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
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
} from 'lucide-react';
import { LazyImage } from './LazyImage';
import {
  filterProductsGlobally,
  getUniqueMatchingBrands,
  getUniqueMatchingCategories,
  getFilterModeLabels,
  SearchFilterMode,
  MatchedCategoryInfo,
} from '../utils/globalSearchHelpers';
import {
  getSearchHistory,
  addSearchHistoryTerm,
  removeSearchHistoryTerm,
  clearSearchHistory,
  getPopularSearchKeywords,
} from '../utils/quickSearchOverlayHelpers';
import {
  getSpeechRecognitionConstructor,
  getVoiceRecognitionLang,
  extractTranscriptFromEvent,
  mapVoiceSearchError,
  SpeechRecognitionInstanceLike,
} from '../utils/voiceSearchHelpers';
import { trackSearchQuery } from '../services/searchAnalyticsService';
import { Product } from '../types';

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
    viewProductDetail,
    setSearchQuery,
    setCurrentView,
    setIsQrScannerOpen,
  } = useShop();

  const isArabic = lang === 'ar';
  const ArrowIcon = isArabic ? ArrowLeft : ArrowRight;
  const ChevronIcon = isArabic ? ChevronLeft : ChevronRight;

  const [query, setQuery] = useState('');
  const [filterMode, setFilterMode] = useState<SearchFilterMode>('all');
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [searchHistory, setSearchHistory] = useState<string[]>(() => getSearchHistory());
  const [isListening, setIsListening] = useState(false);
  const [voiceInterim, setVoiceInterim] = useState('');
  const [voiceError, setVoiceError] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<SpeechRecognitionInstanceLike | null>(null);

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

  // Refresh history & auto-focus input whenever overlay opens; clean up voice listener on close
  useEffect(() => {
    if (!isOpen) {
      stopVoiceRecognition(true);
      setVoiceError(null);
      return;
    }

    setSearchHistory(getSearchHistory());
    setSelectedIndex(-1);
    setVoiceError(null);

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const focusTimer = window.setTimeout(() => {
      inputRef.current?.focus();
    }, 30);

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
  }, [query, filterMode]);

  const popularKeywords = useMemo(
    () => getPopularSearchKeywords(lang, products, undefined, 8),
    [lang, products]
  );

  const featuredCategories = useMemo(
    () => categories.filter((c) => c.featured).slice(0, 6),
    [categories]
  );

  const featuredBrands = useMemo(
    () => brands.filter((b) => b.featured).slice(0, 6),
    [brands]
  );

  const matchingCategories = useMemo(() => {
    if (filterMode === 'name' || filterMode === 'brand') return [];
    return getUniqueMatchingCategories(products, categories, query).slice(0, 4);
  }, [products, categories, query, filterMode]);

  const matchingBrands = useMemo(() => {
    if (filterMode === 'name' || filterMode === 'category') return [];
    return getUniqueMatchingBrands(products, brands, query).slice(0, 4);
  }, [products, brands, query, filterMode]);

  const matchingProducts = useMemo(() => {
    return filterProductsGlobally(products, query, filterMode, categories).slice(0, 8);
  }, [products, categories, query, filterMode]);

  const totalInteractiveItems =
    matchingCategories.length + matchingBrands.length + matchingProducts.length;

  const filterTabs = getFilterModeLabels(lang);
  const hasQuery = query.trim().length > 0;
  const hasResults =
    matchingCategories.length > 0 || matchingBrands.length > 0 || matchingProducts.length > 0;

  const recordTermInHistory = useCallback((term: string) => {
    const clean = term.trim();
    if (!clean) return;
    setSearchHistory(addSearchHistoryTerm(clean));
  }, []);

  const handleSelectProduct = useCallback(
    (product: Product) => {
      const historyTerm = query.trim() || (isArabic ? product.nameAr || product.name : product.name);
      recordTermInHistory(historyTerm);
      trackSearchQuery({
        term: historyTerm,
        source: 'product_suggestion_click',
        selectedEntityTitle: product.name,
        categoryMatchesCount: matchingCategories.length,
        productMatchesCount: matchingProducts.length,
      });
      viewProductDetail(product.id);
      setQuery('');
      onClose();
    },
    [
      query,
      isArabic,
      recordTermInHistory,
      matchingCategories.length,
      matchingProducts.length,
      viewProductDetail,
      onClose,
    ]
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
        productMatchesCount: matchingProducts.length,
      });
      selectBrand(brandName);
      setCurrentView('products');
      setQuery('');
      onClose();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    [
      query,
      recordTermInHistory,
      matchingCategories.length,
      matchingProducts.length,
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
        productMatchesCount: matchingProducts.length,
      });
      selectCategory(cat.slug);
      setCurrentView('products');
      setQuery('');
      onClose();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    [
      query,
      isArabic,
      recordTermInHistory,
      matchingCategories.length,
      matchingProducts.length,
      selectCategory,
      setCurrentView,
      onClose,
    ]
  );

  const executeTermSearch = useCallback(
    (rawTerm: string, source: 'desktop_input_submit' | 'trending_term_click' = 'desktop_input_submit') => {
      const trimmed = rawTerm.trim();
      if (!trimmed) {
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

      const lower = trimmed.toLowerCase();
      const matchedBrand = brands.find((b) => b.name.toLowerCase() === lower);
      const matchedCategory = categories.find(
        (c) =>
          c.name.toLowerCase() === lower ||
          (c.nameAr && c.nameAr.toLowerCase() === lower) ||
          c.slug.toLowerCase() === lower
      );

      if (filterMode === 'brand' && (matchedBrand || brandHits.length > 0)) {
        selectBrand(matchedBrand ? matchedBrand.name : brandHits[0].name);
      } else if (filterMode === 'category' && (matchedCategory || catHits.length === 1)) {
        const target = matchedCategory || catHits[0];
        selectCategory(target.slug);
      } else if (filterMode === 'all' && matchedBrand) {
        selectBrand(matchedBrand.name);
      } else if (filterMode === 'all' && matchedCategory) {
        selectCategory(matchedCategory.slug);
      } else {
        selectCategory(null);
        setSearchQuery(trimmed);
        setCurrentView('products');
      }

      setQuery('');
      onClose();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    [
      brands,
      categories,
      filterMode,
      onClose,
      products,
      recordTermInHistory,
      selectBrand,
      selectCategory,
      setCurrentView,
      setSearchQuery,
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
      handleSelectProduct(matchingProducts[pIdx]);
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
      aria-label={isArabic ? 'البحث السريع في المتجر' : 'Quick Store Search'}
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
        className="w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-5 sm:pt-8 pb-12"
      >
        {/* Top Overlay Header */}
        <div className="flex items-center justify-between gap-4 mb-5 sm:mb-7">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="w-9 h-9 rounded-xl bg-[#EFF6FF] dark:bg-[#132238] text-[#0070F3] dark:text-[#38BDF8] border border-[#DCE5F0] dark:border-[#1E3A5F] flex items-center justify-center shrink-0">
              <Search className="w-4 h-4" />
            </span>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-bold text-[#0F172A] dark:text-white tracking-tight truncate">
                {isArabic ? 'البحث السريع' : 'Quick Search'}
              </h2>
              <p className="text-[11px] sm:text-xs text-[#64748B] dark:text-slate-400 truncate">
                {isArabic
                  ? 'ابحث عن الهواتف، الإكسسوارات، الماركات والأقسام'
                  : 'Find phones, accessories, brands, and departments'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <kbd className="hidden sm:inline-flex items-center px-2 py-1 rounded-lg text-[11px] font-semibold text-[#64748B] dark:text-slate-400 bg-[#F1F5F9] dark:bg-[#111A2E] border border-[#E5E7EB] dark:border-[#1E293B]">
              ESC
            </kbd>
            <button
              type="button"
              onClick={onClose}
              data-testid="quick-search-close-btn"
              aria-label={isArabic ? 'إغلاق البحث السريع' : 'Close quick search'}
              className="w-10 h-10 rounded-xl bg-[#F5F8FC] dark:bg-[#111A2E] hover:bg-[#E2E8F0] dark:hover:bg-[#1E293B] border border-[#DCE5F0] dark:border-[#1E293B] text-[#1E293B] dark:text-slate-200 flex items-center justify-center transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Full-Width Search Input Form */}
        <form onSubmit={handleSubmit} className="mb-4">
          <div
            className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 bg-[#F8FAFC] dark:bg-[#10182B] border rounded-2xl transition-all shadow-sm ${
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
                  : filterMode === 'brand'
                  ? isArabic
                    ? 'ابحث بالماركة (Apple, Samsung...)'
                    : 'Search by brand (Apple, Samsung...)'
                  : filterMode === 'category'
                  ? isArabic
                    ? 'ابحث بالقسم (الهواتف، الشواحن...)'
                    : 'Search by category (Phones, Chargers...)'
                  : filterMode === 'name'
                  ? isArabic
                    ? 'ابحث باسم المنتج أو الجهاز...'
                    : 'Search by product name...'
                  : isArabic
                  ? 'ابحث بالاسم أو الماركة أو القسم...'
                  : 'Search products, brands, categories...'
              }
              aria-label={t.searchPlaceholder || 'Search products by name, brand, or category'}
              className="flex-1 min-w-0 bg-transparent text-[#0F172A] dark:text-white placeholder-[#64748B] dark:placeholder-slate-400 text-[13px] sm:text-base font-medium py-3.5 sm:py-4 focus:outline-none [&::-webkit-search-cancel-button]:hidden"
            />

            {query && (
              <button
                type="button"
                onClick={() => {
                  setQuery('');
                  setSelectedIndex(-1);
                  inputRef.current?.focus();
                }}
                aria-label={isArabic ? 'مسح نص البحث' : 'Clear search input'}
                className="p-1.5 rounded-lg text-[#64748B] hover:text-[#0F172A] dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer shrink-0"
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
              className={`relative flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-xl border transition-all cursor-pointer shrink-0 ${
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
              className="flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-xl border bg-white dark:bg-[#162038] border-[#DCE5F0] dark:border-[#1E293B] text-[#475569] dark:text-slate-300 hover:text-[#0070F3] dark:hover:text-[#38BDF8] hover:border-[#0070F3] transition-all cursor-pointer shrink-0"
            >
              <QrCode className="w-4 h-4" />
            </button>

            <button
              type="submit"
              className="bg-[#0070F3] hover:bg-[#0051D5] active:scale-[0.98] text-white text-xs sm:text-sm font-bold px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl transition-all cursor-pointer shadow-xs whitespace-nowrap shrink-0"
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

        {/* Search Scope Selector Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-2 pb-5 mb-6 border-b border-[#E5E7EB] dark:border-[#1E293B]">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-[#64748B] dark:text-slate-400">
            <SlidersHorizontal className="w-3.5 h-3.5 text-[#0070F3]" aria-hidden="true" />
            <span>{isArabic ? 'نطاق البحث:' : 'Search scope:'}</span>
          </div>

          <div className="flex items-center gap-1 bg-[#F5F8FC] dark:bg-[#10182B] p-1 rounded-xl border border-[#DCE5F0] dark:border-[#1E293B] overflow-x-auto max-w-full">
            {filterTabs.map((tab) => {
              const isActive = filterMode === tab.mode;
              return (
                <button
                  key={tab.mode}
                  type="button"
                  onClick={() => {
                    setFilterMode(tab.mode);
                    inputRef.current?.focus();
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                    isActive
                      ? 'bg-[#0070F3] text-white shadow-xs'
                      : 'text-[#64748B] dark:text-slate-400 hover:text-[#0F172A] dark:hover:text-white'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* BODY STATE 1: Empty Query -> Search History + Popular Keywords + Quick Departments/Brands */}
        {!hasQuery ? (
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
                  <span>{isArabic ? 'سجل البحث الأخير' : 'Search History'}</span>
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
                      className="inline-flex items-center rounded-xl bg-[#F5F8FC] dark:bg-[#10182B] border border-[#DCE5F0] dark:border-[#1E293B] hover:border-[#0070F3] transition-colors group"
                    >
                      <button
                        type="button"
                        onClick={() => executeTermSearch(term, 'desktop_input_submit')}
                        className="inline-flex items-center gap-1.5 pl-3 pr-2 py-2 text-xs sm:text-[13px] font-medium text-[#1E293B] dark:text-slate-200 group-hover:text-[#0070F3] dark:group-hover:text-[#38BDF8] cursor-pointer"
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
                <p className="text-xs sm:text-[13px] text-[#64748B] dark:text-slate-400 py-2">
                  {isArabic
                    ? 'ستظهر هنا عبارات البحث الأخيرة للوصول السريع إليها.'
                    : 'Your recent searches will appear here for one-tap access.'}
                </p>
              )}
            </section>

            {/* Popular Keywords */}
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
                  <span>{isArabic ? 'الكلمات الشائعة' : 'Popular Keywords'}</span>
                </h3>
              </div>

              <div className="flex flex-wrap gap-2">
                {popularKeywords.map((item) => (
                  <button
                    key={item.term}
                    type="button"
                    onClick={() => executeTermSearch(item.term, 'trending_term_click')}
                    className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white dark:bg-[#0E1726] hover:bg-[#EFF6FF] dark:hover:bg-[#162742] border border-[#E5E7EB] dark:border-[#1E293B] hover:border-[#0070F3] text-xs sm:text-[13px] font-semibold text-[#1E293B] dark:text-slate-200 hover:text-[#0070F3] dark:hover:text-[#38BDF8] shadow-[0_2px_8px_rgba(0,0,0,0.03)] transition-all cursor-pointer"
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

            {/* Quick Departments & Featured Brands */}
            {(featuredCategories.length > 0 || featuredBrands.length > 0) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-[#E5E7EB] dark:border-[#1E293B]">
                {featuredCategories.length > 0 && (
                  <section>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-[#64748B] dark:text-slate-400 flex items-center gap-2 mb-3">
                      <Folder className="w-3.5 h-3.5 text-[#0070F3]" aria-hidden="true" />
                      <span>{isArabic ? 'أقسام مختارة' : 'Browse Departments'}</span>
                    </h3>
                    <div className="grid grid-cols-2 gap-2">
                      {featuredCategories.map((cat) => (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => handleSelectCategory(cat)}
                          className="p-2.5 rounded-xl bg-[#F8FAFC] dark:bg-[#10182B] hover:bg-[#EFF6FF] dark:hover:bg-[#162742] border border-[#E5E7EB] dark:border-[#1E293B] hover:border-[#0070F3] text-left rtl:text-right transition-all cursor-pointer group flex items-center justify-between gap-2"
                        >
                          <span className="text-xs font-semibold text-[#1E293B] dark:text-slate-200 group-hover:text-[#0070F3] dark:group-hover:text-[#38BDF8] truncate">
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
                      <span>{isArabic ? 'أشهر الماركات' : 'Featured Brands'}</span>
                    </h3>
                    <div className="grid grid-cols-3 gap-2">
                      {featuredBrands.map((b) => (
                        <button
                          key={b.id}
                          type="button"
                          onClick={() => handleSelectBrand(b.name)}
                          className="p-2.5 rounded-xl bg-[#F8FAFC] dark:bg-[#10182B] hover:bg-[#EFF6FF] dark:hover:bg-[#162742] border border-[#E5E7EB] dark:border-[#1E293B] hover:border-[#0070F3] text-center transition-all cursor-pointer group"
                        >
                          <span className="text-xs font-bold text-[#1E293B] dark:text-slate-200 group-hover:text-[#0070F3] dark:group-hover:text-[#38BDF8] truncate block">
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
          /* BODY STATE 2: Live Matching Results */
          <div className="space-y-6">
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
                        type="button"
                        onClick={() => handleSelectCategory(cat)}
                        className={`w-full text-left rtl:text-right p-3 rounded-xl border transition-all flex items-center justify-between gap-3 cursor-pointer group ${
                          isHighlighted
                            ? 'bg-[#EFF6FF] dark:bg-[#162742] border-[#0070F3] text-[#0070F3] dark:text-[#38BDF8]'
                            : 'bg-white dark:bg-[#0E1726] border-[#E5E7EB] dark:border-[#1E293B] hover:border-[#0070F3]'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-9 h-9 rounded-lg bg-[#EFF6FF] dark:bg-[#132238] text-[#0070F3] dark:text-[#38BDF8] flex items-center justify-center shrink-0">
                            <Folder className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs sm:text-sm font-bold text-[#0F172A] dark:text-white truncate">
                              {isArabic ? cat.nameAr : cat.name}
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
                        type="button"
                        onClick={() => handleSelectBrand(b.name)}
                        className={`w-full text-left rtl:text-right p-3 rounded-xl border transition-all flex items-center justify-between gap-3 cursor-pointer group ${
                          isHighlighted
                            ? 'bg-[#EFF6FF] dark:bg-[#162742] border-[#0070F3]'
                            : 'bg-white dark:bg-[#0E1726] border-[#E5E7EB] dark:border-[#1E293B] hover:border-[#0070F3]'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-9 h-9 rounded-lg bg-[#F8FAFC] dark:bg-[#132238] border border-[#E5E7EB] dark:border-[#1E293B] flex items-center justify-center p-1 shrink-0 overflow-hidden">
                            {b.logo ? (
                              <LazyImage
                                src={b.logo}
                                alt={b.name}
                                priority={true}
                                width={28}
                                height={28}
                                wrapperClassName="w-full h-full flex items-center justify-center"
                                className="w-full h-full object-contain"
                              />
                            ) : (
                              <Tag className="w-4 h-4 text-emerald-600" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs sm:text-sm font-bold text-[#0F172A] dark:text-white truncate">
                              {b.name}
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

            {/* Matching Products */}
            {matchingProducts.length > 0 && (
              <section>
                <div className="text-xs font-bold uppercase tracking-wider text-[#64748B] dark:text-slate-400 flex items-center gap-2 mb-2.5">
                  <Box className="w-3.5 h-3.5 text-[#0070F3]" aria-hidden="true" />
                  <span>{isArabic ? 'المنتجات المطابقة' : 'Matching Products'}</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {matchingProducts.map((p, pIdx) => {
                    const globalIdx = matchingCategories.length + matchingBrands.length + pIdx;
                    const isHighlighted = selectedIndex === globalIdx;
                    const hasDiscount = p.originalPrice > p.price;
                    const isLowStock = p.stock > 0 && p.stock <= (p.lowStockThreshold || 3);
                    const isOutOfStock = p.stock === 0;

                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => handleSelectProduct(p)}
                        className={`w-full text-left rtl:text-right p-3 rounded-xl border transition-all flex items-center gap-3 cursor-pointer group ${
                          isHighlighted
                            ? 'bg-[#EFF6FF] dark:bg-[#162742] border-[#0070F3]'
                            : 'bg-white dark:bg-[#0E1726] border-[#E5E7EB] dark:border-[#1E293B] hover:border-[#0070F3]'
                        }`}
                      >
                        <div className="w-14 h-14 rounded-xl bg-[#F8FAFC] dark:bg-[#111A2E] border border-[#E5E7EB] dark:border-[#1E293B] overflow-hidden flex-shrink-0 flex items-center justify-center relative p-1">
                          {p.images && p.images[0] ? (
                            <LazyImage
                              src={p.images[0]}
                              alt={p.name}
                              priority={true}
                              width={52}
                              height={52}
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
                              {p.brand}
                            </span>
                            <span aria-hidden="true" className="text-[#94A3B8]">
                              ·
                            </span>
                            <span className="text-[#64748B] dark:text-slate-400 truncate">
                              {p.category}
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

                          <p className="text-xs sm:text-sm font-semibold text-[#0F172A] dark:text-white group-hover:text-[#0070F3] dark:group-hover:text-[#38BDF8] truncate">
                            {isArabic ? p.nameAr || p.name : p.name}
                          </p>

                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs sm:text-sm font-extrabold text-[#0070F3] dark:text-[#38BDF8] tabular-nums">
                              ${p.price}
                            </span>
                            {hasDiscount && (
                              <span className="text-[11px] text-[#94A3B8] line-through tabular-nums">
                                ${p.originalPrice}
                              </span>
                            )}
                          </div>
                        </div>

                        <ChevronIcon className="w-4 h-4 text-[#94A3B8] group-hover:text-[#0070F3] shrink-0" />
                      </button>
                    );
                  })}
                </div>
              </section>
            )}

            {/* Footer CTA: View All Results */}
            <div className="pt-4 border-t border-[#E5E7EB] dark:border-[#1E293B]">
              <button
                type="button"
                onClick={() => executeTermSearch(query, 'desktop_input_submit')}
                className="w-full py-3 px-4 rounded-xl bg-[#0070F3] hover:bg-[#0051D5] text-white text-xs sm:text-sm font-bold transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-sm"
              >
                <span>
                  {isArabic
                    ? `عرض كافة النتائج لـ "${query}" في المتجر`
                    : `View all results for "${query}" in Catalog`}
                </span>
                <ArrowIcon className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          /* BODY STATE 3: No Results */
          <div className="py-12 text-center bg-[#F8FAFC] dark:bg-[#0E1726] rounded-2xl border border-[#E5E7EB] dark:border-[#1E293B] px-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-500 flex items-center justify-center mx-auto mb-3">
              <Search className="w-6 h-6" />
            </div>
            <p className="text-sm font-bold text-[#0F172A] dark:text-white mb-1">
              {isArabic ? `لم نجد نتائج تطابق "${query}"` : `No results matching "${query}"`}
            </p>
            <p className="text-xs text-[#64748B] dark:text-slate-400 max-w-md mx-auto mb-4">
              {isArabic
                ? 'جرب البحث باسم المنتج، الماركة (Apple, Samsung, Anker)، أو اختر من الكلمات الشائعة.'
                : 'Try searching by product name, brand (Apple, Samsung, Anker), or pick a popular keyword.'}
            </p>
            <button
              type="button"
              onClick={() => executeTermSearch(query, 'desktop_input_submit')}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#0070F3] hover:bg-[#0051D5] text-white text-xs font-bold transition-colors cursor-pointer"
            >
              <span>{isArabic ? 'البحث في كامل الكتالوج' : 'Search Full Catalog'}</span>
              <ArrowIcon className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};
