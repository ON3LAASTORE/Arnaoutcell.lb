import React, { useCallback, useEffect, useState } from 'react';
import { HeroSection } from '../components/HeroSection';
import { DeferredSection } from '../components/DeferredSection';
import { ChunkErrorBoundary } from '../components/ChunkErrorBoundary';
import { ReactBitsBackground } from '../components/animations/ReactBitsBackground';
import { safeLazy } from '../utils/lazyImportHelpers';
import { useShop } from '../context/ShopContext';
import { fetchDynamicCategories } from '../services/categoryFirestoreService';
import { Category } from '../types';

// Lazy-load all below-the-fold sections so initial page load only parses & hydrates the above-the-fold LCP shell
const SpecialOffersColumn = safeLazy(
  () => import('../components/SpecialOffersColumn'),
  'SpecialOffersColumn'
);
const RecentlyViewedSection = safeLazy(
  () => import('../components/RecentlyViewedSection'),
  'RecentlyViewedSection'
);
const CategoryGrid = safeLazy(() => import('../components/CategoryGrid'), 'CategoryGrid');
const BrandCarousel = safeLazy(() => import('../components/BrandCarousel'), 'BrandCarousel');
const VideoShowcase = safeLazy(() => import('../components/VideoShowcase'), 'VideoShowcase');
const TestimonialsSlider = safeLazy(
  () => import('../components/TestimonialsSlider'),
  'TestimonialsSlider'
);
const StoreLocatorSection = safeLazy(
  () => import('../components/StoreLocatorSection'),
  'StoreLocatorSection'
);
const ServiceSection = safeLazy(() => import('../components/ServiceSection'), 'ServiceSection');
const CustomerTrust = safeLazy(() => import('../components/CustomerTrust'), 'CustomerTrust');

const OffersSkeleton: React.FC = () => (
  <div
    aria-hidden="true"
    className="min-h-[3980px] py-14 md:py-20 bg-[#F5F8FC] dark:bg-[#070C16] border-b border-[#DCE5F0] dark:border-[#1E293B]"
  >
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 animate-pulse space-y-8">
      <div className="h-10 w-72 rounded-xl bg-[#EAF3FF] dark:bg-[#111A2E]" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-80 rounded-2xl bg-white dark:bg-[#111A2E] border border-[#DCE5F0] dark:border-[#1E293B]"
          />
        ))}
      </div>
    </div>
  </div>
);

export const HomePage: React.FC = () => {
  const {
    categories: liveCategories,
    products,
    categoriesLoading,
    categoriesError,
    refreshCategories,
    selectCategory,
  } = useShop();

  const [fetchedCategories, setFetchedCategories] = useState<Category[]>(liveCategories);
  const [isFetchingCategories, setIsFetchingCategories] = useState<boolean>(
    categoriesLoading && liveCategories.length === 0
  );
  const [categoryError, setCategoryError] = useState<string | null>(categoriesError);

  const loadCategories = useCallback(async () => {
    setIsFetchingCategories(true);
    setCategoryError(null);
    try {
      const result = await fetchDynamicCategories();
      if (result.length > 0) {
        setFetchedCategories(result);
      }
      await refreshCategories();
    } catch (err) {
      setCategoryError(err instanceof Error ? err.message : 'Unable to fetch categories.');
    } finally {
      setIsFetchingCategories(false);
    }
  }, [refreshCategories]);

  useEffect(() => {
    let active = true;
    setIsFetchingCategories(true);
    fetchDynamicCategories()
      .then((result) => {
        if (!active) return;
        if (result.length > 0) {
          setFetchedCategories(result);
        }
        setCategoryError(null);
      })
      .catch((err) => {
        if (!active) return;
        setCategoryError(err instanceof Error ? err.message : 'Unable to fetch categories.');
      })
      .finally(() => {
        if (active) {
          setIsFetchingCategories(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  // Keep synchronized with real-time ShopContext category subscription updates
  useEffect(() => {
    if (liveCategories.length > 0) {
      setFetchedCategories(liveCategories);
    }
  }, [liveCategories]);

  const resolvedCategories = fetchedCategories.length > 0 ? fetchedCategories : liveCategories;

  return (
    <ReactBitsBackground variant="combined" className="min-h-[100dvh]">
      <HeroSection />

      <ChunkErrorBoundary label="special-offers">
        <React.Suspense fallback={<OffersSkeleton />}>
          <SpecialOffersColumn />
        </React.Suspense>
      </ChunkErrorBoundary>

      <DeferredSection minHeight={355}>
        <RecentlyViewedSection />
      </DeferredSection>

      <DeferredSection minHeight={1060}>
        <CategoryGrid
          categories={resolvedCategories}
          products={products}
          isLoading={isFetchingCategories && resolvedCategories.length === 0}
          error={categoryError || categoriesError}
          onRetry={loadCategories}
          onSelectCategory={selectCategory}
        />
      </DeferredSection>

      <DeferredSection minHeight={827}>
        <BrandCarousel />
      </DeferredSection>

      <DeferredSection minHeight={763}>
        <VideoShowcase />
      </DeferredSection>

      <DeferredSection minHeight={761}>
        <TestimonialsSlider />
      </DeferredSection>

      <DeferredSection minHeight={1134}>
        <StoreLocatorSection />
      </DeferredSection>

      <DeferredSection minHeight={936}>
        <ServiceSection />
      </DeferredSection>

      <DeferredSection minHeight={623}>
        <CustomerTrust />
      </DeferredSection>
    </ReactBitsBackground>
  );
};
