import React, { useState } from 'react';
import { useShop } from '../context/ShopContext';
import {
  Smartphone,
  Laptop,
  Headphones,
  Watch,
  Tablet,
  BatteryCharging,
  Zap,
  Cable,
  Speaker,
  Gamepad2,
  Gamepad,
  Mic2,
  Shield,
  Car,
  Maximize2,
  Briefcase,
  Camera,
  Mic,
  Keyboard,
  Cpu,
  HardDrive,
  Wifi,
  Home,
  Sun,
  Compass,
  Heart,
  Eye,
  Aperture,
  Printer,
  Battery,
  Wrench,
  Coffee,
  Hammer,
  Box,
  Layers,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

const ICON_MAP: Record<string, any> = {
  Smartphone,
  Laptop,
  Headphones,
  Watch,
  Tablet,
  BatteryCharging,
  Zap,
  Cable,
  Speaker,
  Gamepad2,
  Gamepad,
  Mic2,
  Shield,
  Car,
  Maximize2,
  Briefcase,
  Camera,
  Mic,
  Keyboard,
  Cpu,
  HardDrive,
  Wifi,
  Home,
  Sun,
  Compass,
  Heart,
  Eye,
  Aperture,
  Printer,
  Battery,
  Wrench,
  Coffee,
  Hammer,
  Box,
};

export const CategoryGrid: React.FC = () => {
  const { lang, categories, selectCategory, products } = useShop();
  const [showAll, setShowAll] = useState(false);

  // Show top featured or first 12 initially, and expand to all 35 on demand
  const visibleCategories = showAll ? categories : categories.slice(0, 12);

  const getProductCount = (categoryName: string) => {
    return products.filter((p) => p.category.toLowerCase() === categoryName.toLowerCase()).length;
  };

  return (
    <section className="py-16 md:py-24 bg-white border-b border-[#DCE5F0] relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EAF3FF] border border-[#BAE6FD] text-[#007AFF] text-xs font-bold tracking-wider mb-2">
              <Layers className="w-3.5 h-3.5" />
              <span>{lang === 'ar' ? '35 قسماً متخصصاً' : '35 SPECIALIZED DEPARTMENTS'}</span>
            </div>
            <h2 className="text-2xl sm:text-4xl font-black text-[#172033] tracking-tight">
              {lang === 'ar' ? 'تسوق حسب القسم' : 'Shop by Category'}
            </h2>
            <p className="text-[#64748B] text-sm sm:text-base mt-1">
              {lang === 'ar'
                ? 'استكشف كافة فئات الإلكترونيات، الملحقات والقطع التقنية من أرناؤوط ستور.'
                : 'Browse through all electronics categories, mobile accessories, and tech essentials.'}
            </p>
          </div>

          <button
            onClick={() => setShowAll(!showAll)}
            className="self-start sm:self-auto px-4 py-2 rounded-xl bg-[#F5F8FC] hover:bg-[#EAF3FF] border border-[#DCE5F0] hover:border-[#007AFF] text-[#172033] text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <span>
              {showAll
                ? lang === 'ar'
                  ? 'عرض الأقسام الرئيسية فقط'
                  : 'Show Fewer Categories'
                : lang === 'ar'
                ? `عرض جميع الأقسام (${categories.length})`
                : `Show All Categories (${categories.length})`}
            </span>
            {showAll ? <ChevronUp className="w-4 h-4 text-[#007AFF]" /> : <ChevronDown className="w-4 h-4 text-[#007AFF]" />}
          </button>
        </div>

        {/* Category Tiles Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3.5 sm:gap-4">
          {visibleCategories.map((cat) => {
            const IconComponent = ICON_MAP[cat.iconName] || Smartphone;
            const count = getProductCount(cat.name);

            return (
              <div
                key={cat.id}
                onClick={() => selectCategory(cat.slug)}
                className="group p-4 rounded-2xl bg-white hover:bg-[#F5F8FC] border border-[#DCE5F0] hover:border-[#007AFF] transition-all duration-300 cursor-pointer flex flex-col justify-between relative overflow-hidden shadow-xs hover:shadow-[0_6px_20px_-3px_rgba(0,122,255,0.1)]"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-[#F5F8FC] border border-[#DCE5F0] group-hover:bg-[#EAF3FF] group-hover:border-[#BAE6FD] flex items-center justify-center text-[#007AFF] group-hover:scale-110 transition-transform">
                    <IconComponent className="w-5 h-5" />
                  </div>
                  {count > 0 && (
                    <span className="text-[10px] font-bold text-[#007AFF] bg-[#EAF3FF] px-2 py-0.5 rounded-full border border-[#BAE6FD]">
                      {count}
                    </span>
                  )}
                </div>

                <div>
                  <h3 className="font-bold text-[#172033] group-hover:text-[#007AFF] text-xs sm:text-sm line-clamp-1 transition-colors">
                    {lang === 'ar' ? cat.nameAr : cat.name}
                  </h3>
                  {cat.subcategories && cat.subcategories.length > 0 && (
                    <p className="text-[10px] text-[#64748B] line-clamp-1 mt-0.5">
                      {cat.subcategories.slice(0, 2).join(', ')}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
