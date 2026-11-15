import React, { useEffect } from 'react';
import { ShopProvider, useShop } from './context/ShopContext';
import { AdminProvider } from './context/AdminContext';
import { AnnouncementBar } from './components/AnnouncementBar';
import { Navbar } from './components/Navbar';
import { HomePage } from './pages/HomePage';
import { SEOHead } from './components/SEOHead';
import { DeferredSection } from './components/DeferredSection';
import { getDirectionTransitionClass } from './utils/languageToggleHelpers';

// Lazy-loaded chrome, overlays, animations, and secondary pages (eliminates render-blocking JS from initial bundle)
const Footer = React.lazy(() =>
  import('./components/Footer').then((m) => ({ default: m.Footer }))
);
const MobileBottomNav = React.lazy(() =>
  import('./components/MobileBottomNav').then((m) => ({ default: m.MobileBottomNav }))
);
const CartDrawer = React.lazy(() =>
  import('./components/CartDrawer').then((m) => ({ default: m.CartDrawer }))
);
const CompareFloatingBar = React.lazy(() =>
  import('./components/CompareFloatingBar').then((m) => ({ default: m.CompareFloatingBar }))
);
const FloatingWhatsAppButton = React.lazy(() =>
  import('./components/FloatingWhatsAppButton').then((m) => ({ default: m.FloatingWhatsAppButton }))
);
const GsapScrollLines = React.lazy(() =>
  import('./components/animations/GsapScrollLines').then((m) => ({ default: m.GsapScrollLines }))
);
const SpecialOffersColumn = React.lazy(() =>
  import('./components/SpecialOffersColumn').then((m) => ({ default: m.SpecialOffersColumn }))
);
const AdminPage = React.lazy(() =>
  import('./pages/AdminPage').then((m) => ({ default: m.AdminPage }))
);
const ProductsPage = React.lazy(() =>
  import('./pages/ProductsPage').then((m) => ({ default: m.ProductsPage }))
);
const ProductDetailPage = React.lazy(() =>
  import('./pages/ProductDetailPage').then((m) => ({ default: m.ProductDetailPage }))
);
const CategoriesPage = React.lazy(() =>
  import('./pages/CategoriesPage').then((m) => ({ default: m.CategoriesPage }))
);
const BrandsPage = React.lazy(() =>
  import('./pages/BrandsPage').then((m) => ({ default: m.BrandsPage }))
);
const VideosPage = React.lazy(() =>
  import('./pages/VideosPage').then((m) => ({ default: m.VideosPage }))
);
const CartPage = React.lazy(() =>
  import('./pages/CartPage').then((m) => ({ default: m.CartPage }))
);
const CheckoutPage = React.lazy(() =>
  import('./pages/CheckoutPage').then((m) => ({ default: m.CheckoutPage }))
);
const OrderConfirmationPage = React.lazy(() =>
  import('./pages/OrderConfirmationPage').then((m) => ({ default: m.OrderConfirmationPage }))
);
const TrackOrderPage = React.lazy(() =>
  import('./pages/TrackOrderPage').then((m) => ({ default: m.TrackOrderPage }))
);
const WishlistPage = React.lazy(() =>
  import('./pages/WishlistPage').then((m) => ({ default: m.WishlistPage }))
);
const ServicesPage = React.lazy(() =>
  import('./pages/ServicesPage').then((m) => ({ default: m.ServicesPage }))
);
const ContactPage = React.lazy(() =>
  import('./pages/ContactPage').then((m) => ({ default: m.ContactPage }))
);
const PoliciesPage = React.lazy(() =>
  import('./pages/PoliciesPage').then((m) => ({ default: m.PoliciesPage }))
);
const ProductCompareModal = React.lazy(() =>
  import('./components/ProductCompareModal').then((m) => ({ default: m.ProductCompareModal }))
);
const ProductQuickViewModal = React.lazy(() =>
  import('./components/ProductQuickViewModal').then((m) => ({ default: m.ProductQuickViewModal }))
);

const FastSpinner: React.FC = () => (
  <div className="flex items-center justify-center min-h-[35vh] w-full py-12">
    <div className="w-8 h-8 rounded-full border-3 border-[#007AFF] border-t-transparent animate-spin" />
  </div>
);

const AppContent: React.FC = () => {
  const { currentView, lang, isSwitchingLanguage, isCartOpen, compareList, quickViewProduct } = useShop();
  const dirClass = lang === 'ar' ? 'rtl' : 'ltr';
  const transitionClass = getDirectionTransitionClass(lang, isSwitchingLanguage);

  // Instant scroll-to-top on page or view transition
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  }, [currentView]);

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
        <React.Suspense fallback={<FastSpinner />}>
          <AdminPage />
        </React.Suspense>
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
      <React.Suspense fallback={null}>
        <GsapScrollLines showTopIndicator={true} showVerticalGuideLines={true} />
      </React.Suspense>
      <AnnouncementBar />
      <Navbar />

      <main className="flex-1 pb-16 md:pb-0">
        {currentView === 'home' ? (
          <HomePage />
        ) : (
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
        )}
      </main>

      <DeferredSection minHeight={1058} rootMargin="1200px 0px">
        <Footer />
      </DeferredSection>

      <React.Suspense fallback={null}>
        <MobileBottomNav />
        {isCartOpen && <CartDrawer />}
        {quickViewProduct && <ProductQuickViewModal />}
        {compareList.length > 0 && <CompareFloatingBar />}
        {compareList.length > 0 && <ProductCompareModal />}
        <FloatingWhatsAppButton />
      </React.Suspense>
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
