import React, { useEffect, useState } from 'react';
import { ShopProvider, useShop } from './context/ShopContext';
import { AdminProvider } from './context/AdminContext';
import { AnnouncementBar } from './components/AnnouncementBar';
import { Navbar } from './components/Navbar';
import { HomePage } from './pages/HomePage';
import { SEOHead } from './components/SEOHead';
import { DeferredSection } from './components/DeferredSection';
import { ChunkErrorBoundary } from './components/ChunkErrorBoundary';
import { safeLazy } from './utils/lazyImportHelpers';
import { getDirectionTransitionClass } from './utils/languageToggleHelpers';
import { recordStorefrontTrafficEvent } from './services/trafficAnalyticsService';

const EmptyOverlayFallback: React.FC<any> = () => null;

// Lazy-loaded chrome, overlays, animations, and secondary pages (eliminates render-blocking JS from initial bundle)
const Footer = safeLazy(() => import('./components/Footer'), 'Footer');
const MobileBottomNav = safeLazy(() => import('./components/MobileBottomNav'), 'MobileBottomNav', {
  fallbackComponent: EmptyOverlayFallback,
});
const CartDrawer = safeLazy(() => import('./components/CartDrawer'), 'CartDrawer');
const CompareFloatingBar = safeLazy(
  () => import('./components/CompareFloatingBar'),
  'CompareFloatingBar',
  { fallbackComponent: EmptyOverlayFallback }
);
const FloatingWhatsAppButton = safeLazy(
  () => import('./components/FloatingWhatsAppButton'),
  'FloatingWhatsAppButton',
  { fallbackComponent: EmptyOverlayFallback }
);
const GsapScrollLines = safeLazy(
  () => import('./components/animations/GsapScrollLines'),
  'GsapScrollLines',
  { fallbackComponent: EmptyOverlayFallback }
);
const SpecialOffersColumn = safeLazy(
  () => import('./components/SpecialOffersColumn'),
  'SpecialOffersColumn'
);
const AdminPage = safeLazy(() => import('./pages/AdminPage'), 'AdminPage');
const ProductsPage = safeLazy(() => import('./pages/ProductsPage'), 'ProductsPage');
const ProductDetailPage = safeLazy(
  () => import('./pages/ProductDetailPage'),
  'ProductDetailPage'
);
const CategoriesPage = safeLazy(() => import('./pages/CategoriesPage'), 'CategoriesPage');
const BrandsPage = safeLazy(() => import('./pages/BrandsPage'), 'BrandsPage');
const VideosPage = safeLazy(() => import('./pages/VideosPage'), 'VideosPage');
const CartPage = safeLazy(() => import('./pages/CartPage'), 'CartPage');
const CheckoutPage = safeLazy(() => import('./pages/CheckoutPage'), 'CheckoutPage');
const OrderConfirmationPage = safeLazy(
  () => import('./pages/OrderConfirmationPage'),
  'OrderConfirmationPage'
);
const TrackOrderPage = safeLazy(() => import('./pages/TrackOrderPage'), 'TrackOrderPage');
const WishlistPage = safeLazy(() => import('./pages/WishlistPage'), 'WishlistPage');
const ServicesPage = safeLazy(() => import('./pages/ServicesPage'), 'ServicesPage');
const ContactPage = safeLazy(() => import('./pages/ContactPage'), 'ContactPage');
const PoliciesPage = safeLazy(() => import('./pages/PoliciesPage'), 'PoliciesPage');
const ProductCompareModal = safeLazy(
  () => import('./components/ProductCompareModal'),
  'ProductCompareModal'
);
const ProductQuickViewModal = safeLazy(
  () => import('./components/ProductQuickViewModal'),
  'ProductQuickViewModal'
);
const ProductQrScannerModal = safeLazy(
  () => import('./components/ProductQrScannerModal'),
  'ProductQrScannerModal',
  { fallbackComponent: EmptyOverlayFallback }
);

const FastSpinner: React.FC = () => (
  <div className="flex items-center justify-center min-h-[35vh] w-full py-12">
    <div className="w-8 h-8 rounded-full border-3 border-[#007AFF] border-t-transparent animate-spin" />
  </div>
);

const AppContent: React.FC = () => {
  const {
    currentView,
    lang,
    isSwitchingLanguage,
    isCartOpen,
    compareList,
    isCompareModalOpen,
    isQrScannerOpen,
    quickViewProduct,
  } = useShop();
  const dirClass = lang === 'ar' ? 'rtl' : 'ltr';
  const transitionClass = getDirectionTransitionClass(lang, isSwitchingLanguage);
  const [mountScrollLines, setMountScrollLines] = useState(false);

  // Instant scroll-to-top and record storefront traffic on page or view transition
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
    if (currentView !== 'admin') {
      recordStorefrontTrafficEvent(currentView === 'product-detail' ? 'product_view' : 'page_view');
    }
  }, [currentView]);

  useEffect(() => {
    if (quickViewProduct) {
      recordStorefrontTrafficEvent('product_view');
    }
  }, [quickViewProduct]);

  // Defer decorative scroll-lines module load until after first paint settles
  useEffect(() => {
    let cancelled = false;
    const schedule = () => {
      if (!cancelled) setMountScrollLines(true);
    };

    const win = window as Window & {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
      cancelIdleCallback?: (id: number) => void;
    };

    if (typeof win.requestIdleCallback === 'function') {
      const id = win.requestIdleCallback(schedule, { timeout: 600 });
      return () => {
        cancelled = true;
        win.cancelIdleCallback?.(id);
      };
    }

    const timer = window.setTimeout(schedule, 120);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, []);

  // If in admin view, AdminPage has its own dedicated dashboard shell
  if (currentView === 'admin') {
    return (
      <div
        dir={dirClass}
        data-layout-dir={dirClass}
        data-direction-transitioning={isSwitchingLanguage ? 'true' : 'false'}
        className={`${dirClass} ${transitionClass}`.trim()}
      >
        <SEOHead />
        <ChunkErrorBoundary resetKey={currentView} label="admin-page">
          <React.Suspense fallback={<FastSpinner />}>
            <AdminPage />
          </React.Suspense>
        </ChunkErrorBoundary>
      </div>
    );
  }

  return (
    <div
      dir={dirClass}
      data-layout-dir={dirClass}
      data-direction-transitioning={isSwitchingLanguage ? 'true' : 'false'}
      className={`${dirClass} ${transitionClass} flex flex-col min-h-[100dvh] w-full overflow-x-hidden bg-[#FFFFFF] dark:bg-[#0A0F1D] text-[#172033] dark:text-[#F8FAFC] selection:bg-[#007AFF] selection:text-white transition-colors duration-200`}
    >
      <SEOHead />
      {mountScrollLines && (
        <ChunkErrorBoundary silent label="scroll-lines">
          <React.Suspense fallback={null}>
            <GsapScrollLines showTopIndicator={true} showVerticalGuideLines={true} />
          </React.Suspense>
        </ChunkErrorBoundary>
      )}
      <AnnouncementBar />
      <Navbar />

      <main className="flex-1 pb-16 md:pb-0">
        {currentView === 'home' ? (
          <HomePage />
        ) : (
          <ChunkErrorBoundary resetKey={currentView} label={`route-${currentView}`}>
            <React.Suspense fallback={<FastSpinner />}>
              {currentView === 'products' && <ProductsPage />}
              {currentView === 'product-detail' && <ProductDetailPage />}
              {currentView === 'categories' && <CategoriesPage />}
              {currentView === 'brands' && <BrandsPage />}
              {currentView === 'offers' && (
                <div className="py-8">
                  <SpecialOffersColumn />
                </div>
              )}
              {currentView === 'videos' && <VideosPage />}
              {currentView === 'cart' && <CartPage />}
              {currentView === 'checkout' && <CheckoutPage />}
              {currentView === 'order-confirmation' && <OrderConfirmationPage />}
              {currentView === 'track-order' && <TrackOrderPage />}
              {currentView === 'wishlist' && <WishlistPage />}
              {currentView === 'services' && <ServicesPage />}
              {currentView === 'contact' && <ContactPage />}
              {currentView.startsWith('policy') && <PoliciesPage initialTab={currentView} />}
            </React.Suspense>
          </ChunkErrorBoundary>
        )}
      </main>

      <DeferredSection minHeight={400} rootMargin="1200px 0px">
        <Footer />
      </DeferredSection>

      <ChunkErrorBoundary silent label="overlays">
        <React.Suspense fallback={null}>
          <MobileBottomNav />
          {isCartOpen && <CartDrawer />}
          {quickViewProduct && <ProductQuickViewModal />}
          {compareList.length > 0 && <CompareFloatingBar />}
          {isCompareModalOpen && <ProductCompareModal />}
          {isQrScannerOpen && <ProductQrScannerModal />}
          <FloatingWhatsAppButton />
        </React.Suspense>
      </ChunkErrorBoundary>
    </div>
  );
};

export default function App() {
  return (
    <ShopProvider>
      <AdminProvider>
        <AppContent />
      </AdminProvider>
    </ShopProvider>
  );
}
