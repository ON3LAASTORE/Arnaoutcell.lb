import React from 'react';
import { HeroSection } from '../components/HeroSection';
import { DeferredSection } from '../components/DeferredSection';
import { ReactBitsBackground } from '../components/animations/ReactBitsBackground';

// Lazy-load all below-the-fold sections so initial page load only parses & hydrates the above-the-fold LCP shell
const SpecialOffersColumn = React.lazy(() =>
  import('../components/SpecialOffersColumn').then((m) => ({ default: m.SpecialOffersColumn }))
);
const RecentlyViewedSection = React.lazy(() =>
  import('../components/RecentlyViewedSection').then((m) => ({ default: m.RecentlyViewedSection }))
);
const CategoryGrid = React.lazy(() =>
  import('../components/CategoryGrid').then((m) => ({ default: m.CategoryGrid }))
);
const BrandCarousel = React.lazy(() =>
  import('../components/BrandCarousel').then((m) => ({ default: m.BrandCarousel }))
);
const VideoShowcase = React.lazy(() =>
  import('../components/VideoShowcase').then((m) => ({ default: m.VideoShowcase }))
);
const TestimonialsSlider = React.lazy(() =>
  import('../components/TestimonialsSlider').then((m) => ({ default: m.TestimonialsSlider }))
);
const StoreLocatorSection = React.lazy(() =>
  import('../components/StoreLocatorSection').then((m) => ({ default: m.StoreLocatorSection }))
);
const ServiceSection = React.lazy(() =>
  import('../components/ServiceSection').then((m) => ({ default: m.ServiceSection }))
);
const CustomerTrust = React.lazy(() =>
  import('../components/CustomerTrust').then((m) => ({ default: m.CustomerTrust }))
);

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
  return (
    <ReactBitsBackground variant="combined" className="min-h-[100dvh]">
      <HeroSection />

      <React.Suspense fallback={<OffersSkeleton />}>
        <SpecialOffersColumn />
      </React.Suspense>

      <DeferredSection minHeight={355}>
        <RecentlyViewedSection />
      </DeferredSection>

      <DeferredSection minHeight={597}>
        <CategoryGrid />
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
