import React from 'react';
import { HeroSection } from '../components/HeroSection';
import { SpecialOffersColumn } from '../components/SpecialOffersColumn';
import { RecentlyViewedSection } from '../components/RecentlyViewedSection';
import { CategoryGrid } from '../components/CategoryGrid';
import { BrandCarousel } from '../components/BrandCarousel';
import { VideoShowcase } from '../components/VideoShowcase';
import { TestimonialsSlider } from '../components/TestimonialsSlider';
import { StoreLocatorSection } from '../components/StoreLocatorSection';
import { ServiceSection } from '../components/ServiceSection';
import { CustomerTrust } from '../components/CustomerTrust';
import { ReactBitsBackground } from '../components/animations/ReactBitsBackground';

export const HomePage: React.FC = () => {
  return (
    <ReactBitsBackground variant="combined" className="min-h-[100dvh]">
      <HeroSection />
      <SpecialOffersColumn />
      <RecentlyViewedSection />
      <CategoryGrid />
      <BrandCarousel />
      <VideoShowcase />
      <TestimonialsSlider />
      <StoreLocatorSection />
      <ServiceSection />
      <CustomerTrust />
    </ReactBitsBackground>
  );
};
