import React, { useEffect } from 'react';
import { motion } from 'motion/react';
import { ShopProvider, useShop } from './context/ShopContext';
import { AdminProvider } from './context/AdminContext';
import { AnnouncementBar } from './components/AnnouncementBar';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { MobileBottomNav } from './components/MobileBottomNav';
import { CartDrawer } from './components/CartDrawer';
import { CompareFloatingBar } from './components/CompareFloatingBar';
import { FloatingWhatsAppButton } from './components/FloatingWhatsAppButton';
// Eager primary layout and homepage components for instant first paint
import { HomePage } from './pages/HomePage';
import { SpecialOffersColumn } from './components/SpecialOffersColumn';
import { SEOHead } from './components/SEOHead';
import { GsapScrollLines } from './components/animations/GsapScrollLines';

// Lazy-loaded secondary pages and modals (reduces initial bundle size by over 60%)
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
  const { currentView, lang } = useShop();
  const dirClass = lang === 'ar' ? 'rtl' : 'ltr';

  // Instant scroll-to-top on page or view transition
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  }, [currentView]);

  // If in admin view, AdminPage has its own dedicated dashboard shell
  if (currentView === 'admin') {
    return (
      <div className={dirClass} dir={dirClass}>
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
      className={`${dirClass} flex flex-col min-h-[100dvh] w-full overflow-x-hidden bg-[#FFFFFF] dark:bg-[#0A0F1D] text-[#172033] dark:text-[#F8FAFC] selection:bg-[#007AFF] selection:text-white transition-colors duration-200`}
    >
      <SEOHead />
      <GsapScrollLines showTopIndicator={true} showVerticalGuideLines={true} />
      <AnnouncementBar />
      <Navbar />

      <main className="flex-1 pb-16 md:pb-0">
        <motion.div
          key={currentView}
          initial={{ opacity: 0, y: 3 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.12, ease: 'easeOut' }}
        >
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
        </motion.div>
      </main>

      <Footer />
      <MobileBottomNav />
      <CartDrawer />
      <React.Suspense fallback={null}>
        <ProductQuickViewModal />
        <CompareFloatingBar />
        <ProductCompareModal />
      </React.Suspense>
      <FloatingWhatsAppButton />
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
