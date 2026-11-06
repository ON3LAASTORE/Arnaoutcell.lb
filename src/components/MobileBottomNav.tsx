import React from 'react';
import { motion } from 'motion/react';
import { Home, LayoutGrid, Flame, Heart, ShoppingBag } from 'lucide-react';
import { useShop } from '../context/ShopContext';

export const MobileBottomNav: React.FC = () => {
  const { currentView, setCurrentView, lang, cartCount, wishlist, setIsCartOpen } = useShop();

  const navItems = [
    {
      id: 'home',
      label: lang === 'ar' ? 'الرئيسية' : 'Home',
      icon: Home,
      action: () => setCurrentView('home'),
      isActive: currentView === 'home',
    },
    {
      id: 'categories',
      label: lang === 'ar' ? 'الأقسام' : 'Categories',
      icon: LayoutGrid,
      action: () => setCurrentView('categories'),
      isActive: currentView === 'categories',
    },
    {
      id: 'offers',
      label: lang === 'ar' ? 'العروض' : 'Offers',
      icon: Flame,
      badge: lang === 'ar' ? 'خصم' : 'HOT',
      badgeColor: 'bg-red-500 text-white',
      action: () => setCurrentView('offers'),
      isActive: currentView === 'offers',
    },
    {
      id: 'wishlist',
      label: lang === 'ar' ? 'المفضلة' : 'Wishlist',
      icon: Heart,
      badge: wishlist.length > 0 ? wishlist.length : null,
      badgeColor: 'bg-[#DC2626] text-white',
      action: () => setCurrentView('wishlist'),
      isActive: currentView === 'wishlist',
    },
    {
      id: 'cart',
      label: lang === 'ar' ? 'السلة' : 'Cart',
      icon: ShoppingBag,
      badge: cartCount > 0 ? cartCount : null,
      badgeColor: 'bg-[#007AFF] text-white',
      action: () => setIsCartOpen(true),
      isActive: false,
    },
  ];

  return (
    <nav
      aria-label="Mobile Navigation"
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-[#0A0F1D]/95 backdrop-blur-xl border-t border-[#DCE5F0] dark:border-[#1E293B] shadow-[0_-4px_20px_rgba(0,0,0,0.06)] dark:shadow-[0_-4px_20px_rgba(0,0,0,0.3)] transition-colors duration-200 select-none"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div className="grid grid-cols-5 h-16 items-center px-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = item.isActive;

          return (
            <motion.button
              key={item.id}
              onClick={item.action}
              whileTap={{ scale: 0.88, transition: { duration: 0.1 } }}
              className={`relative flex flex-col items-center justify-center h-full w-full py-1 cursor-pointer transition-colors ${
                isActive
                  ? 'text-[#007AFF] dark:text-[#38BDF8]'
                  : 'text-[#64748B] dark:text-slate-400 hover:text-[#172033] dark:hover:text-white'
              }`}
            >
              <div className="relative flex items-center justify-center">
                <Icon
                  className={`w-5 h-5 transition-transform duration-150 ${
                    isActive ? 'scale-110 stroke-[2.4]' : 'stroke-[1.8]'
                  }`}
                />

                {item.badge !== null && item.badge !== undefined && (
                  <span
                    className={`absolute -top-1.5 -right-2.5 min-w-[16px] h-4 px-1 rounded-full text-[9px] font-black flex items-center justify-center shadow-xs ${item.badgeColor}`}
                  >
                    {item.badge}
                  </span>
                )}
              </div>

              <span
                className={`text-[10px] mt-1 font-bold tracking-tight transition-all truncate max-w-[64px] ${
                  isActive ? 'font-black' : 'font-medium'
                }`}
              >
                {item.label}
              </span>

              {isActive && (
                <motion.div
                  layoutId="activeTabIndicator"
                  className="absolute bottom-1 w-4 h-1 rounded-full bg-[#007AFF] dark:bg-[#38BDF8]"
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                />
              )}
            </motion.button>
          );
        })}
      </div>
    </nav>
  );
};
