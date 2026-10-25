import React from 'react';
import { HeroSection } from '../components/HeroSection';
import { SpecialOffersColumn } from '../components/SpecialOffersColumn';
import { CategoryGrid } from '../components/CategoryGrid';
import { BrandCarousel } from '../components/BrandCarousel';
import { VideoShowcase } from '../components/VideoShowcase';
import { ServiceSection } from '../components/ServiceSection';
import { CustomerTrust } from '../components/CustomerTrust';

export const HomePage: React.FC = () => {
  return (
    <div className="min-h-[100dvh] w-full">
      <HeroSection />
      <SpecialOffersColumn />
      <CategoryGrid />
      <BrandCarousel />
      <VideoShowcase />
      <ServiceSection />
      <CustomerTrust />
    </div>
  );
};
