import React from 'react';
import { ShopProvider, useShop } from './context/ShopContext';
import { AdminProvider } from './context/AdminContext';
import { AnnouncementBar } from './components/AnnouncementBar';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { CartDrawer } from './components/CartDrawer';
import { ProductQuickViewModal } from './components/ProductQuickViewModal';
import { FloatingWhatsAppButton } from './components/FloatingWhatsAppButton';

// Pages
import { HomePage } from './pages/HomePage';
import { ProductsPage } from './pages/ProductsPage';
import { ProductDetailPage } from './pages/ProductDetailPage';
import { CategoriesPage } from './pages/CategoriesPage';
import { BrandsPage } from './pages/BrandsPage';
import { SpecialOffersColumn } from './components/SpecialOffersColumn';
import { VideosPage } from './pages/VideosPage';
import { CartPage } from './pages/CartPage';
import { CheckoutPage } from './pages/CheckoutPage';
import { OrderConfirmationPage } from './pages/OrderConfirmationPage';
import { TrackOrderPage } from './pages/TrackOrderPage';
import { WishlistPage } from './pages/WishlistPage';
import { ServicesPage } from './pages/ServicesPage';
import { ContactPage } from './pages/ContactPage';
import { PoliciesPage } from './pages/PoliciesPage';
import { AdminPage } from './pages/AdminPage';
import { SEOHead } from './components/SEOHead';

const AppContent: React.FC = () => {
  const { currentView } = useShop();

  // If in admin view, AdminPage has its own dedicated dashboard shell
  if (currentView === 'admin') {
    return (
      <>
        <SEOHead />
        <AdminPage />
      </>
    );
  }

  return (
    <div className="flex flex-col min-h-[100dvh] w-full overflow-x-hidden bg-[#FFFFFF] dark:bg-[#0A0F1D] text-[#172033] dark:text-[#F8FAFC] selection:bg-[#007AFF] selection:text-white transition-colors duration-200">
      <SEOHead />
      <AnnouncementBar />
      <Navbar />

      <main className="flex-1">
        {currentView === 'home' && <HomePage />}
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
      </main>

      <Footer />
      <CartDrawer />
      <ProductQuickViewModal />
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
