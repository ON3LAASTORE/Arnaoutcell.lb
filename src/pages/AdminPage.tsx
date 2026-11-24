import React, { useEffect, useState } from 'react';
import { useAdmin } from '../context/AdminContext';
import { useShop } from '../context/ShopContext';
import { AdminLogin } from '../components/admin/AdminLogin';
import { AdminLayout } from '../components/admin/AdminLayout';
import { AdminOverview } from '../components/admin/AdminOverview';
import { ChunkErrorBoundary } from '../components/ChunkErrorBoundary';
import { safeLazy } from '../utils/lazyImportHelpers';
import { auth } from '../firebase';
import { saveCategories, saveProducts } from '../services/storageService';
import {
  seedInitialProductsToCloud,
  subscribeToLiveProducts,
} from '../services/productFirestoreService';
import {
  seedInitialCategoriesToCloud,
  subscribeToLiveCategories,
} from '../services/categoryFirestoreService';

// Code-split admin modules to prevent downloading entire admin suite on initial open
const AdminStatistics = safeLazy(() => import('../components/admin/AdminStatistics'), 'AdminStatistics');
const AdminProducts = safeLazy(() => import('../components/admin/AdminProducts'), 'AdminProducts');
const AdminSocialMarketing = safeLazy(
  () => import('../components/admin/AdminSocialMarketing'),
  'AdminSocialMarketing'
);
const AdminOffers = safeLazy(() => import('../components/admin/AdminOffers'), 'AdminOffers');
const AdminOrders = safeLazy(() => import('../components/admin/AdminOrders'), 'AdminOrders');
const AdminInventory = safeLazy(() => import('../components/admin/AdminInventory'), 'AdminInventory');
const AdminCategoriesBrands = safeLazy(
  () => import('../components/admin/AdminCategoriesBrands'),
  'AdminCategoriesBrands'
);
const AdminContent = safeLazy(() => import('../components/admin/AdminContent'), 'AdminContent');
const AdminCustomers = safeLazy(() => import('../components/admin/AdminCustomers'), 'AdminCustomers');
const AdminActivityLog = safeLazy(() => import('../components/admin/AdminActivityLog'), 'AdminActivityLog');
const AdminSettings = safeLazy(() => import('../components/admin/AdminSettings'), 'AdminSettings');

const AdminTabSpinner: React.FC = () => (
  <div className="flex items-center justify-center min-h-[40vh] w-full">
    <div className="w-8 h-8 rounded-full border-3 border-[#007AFF] border-t-transparent animate-spin" />
  </div>
);

export const AdminPage: React.FC = () => {
  const { isAuthenticated, loading, hasRole, hasPermission, reportPermissionDenied } = useAdmin();
  const { refreshData } = useShop();
  const [activeTab, setActiveTab] = useState('overview');
  const [targetProductId, setTargetProductId] = useState<string | undefined>(undefined);

  const canSeedProducts =
    isAuthenticated &&
    Boolean(auth.currentUser) &&
    hasRole(['super_admin']) &&
    hasPermission('full_stock');
  const canSeedCategories =
    isAuthenticated &&
    Boolean(auth.currentUser) &&
    (hasRole(['super_admin', 'product_manager']) ||
      hasPermission(['full_stock', 'manage_categories']));

  // Isolated Admin real-time sync: only runs while Admin Dashboard is mounted & authenticated,
  // preserving storefront read quota and cleanly unsubscribing on unmount.
  useEffect(() => {
    if (!isAuthenticated) return;

    const unsubscribeProducts = subscribeToLiveProducts(
      (liveProducts) => {
        if (liveProducts && liveProducts.length > 0) {
          saveProducts(liveProducts);
          refreshData();
        }
      },
      () => {
        if (canSeedProducts) {
          seedInitialProductsToCloud().catch(console.error);
        }
      }
    );

    const unsubscribeCategories = subscribeToLiveCategories(
      (liveCategories) => {
        if (liveCategories && liveCategories.length > 0) {
          saveCategories(liveCategories);
          refreshData();
        }
      },
      () => {
        if (canSeedCategories) {
          seedInitialCategoriesToCloud().catch(console.error);
        }
      }
    );

    return () => {
      unsubscribeProducts();
      unsubscribeCategories();
    };
  }, [isAuthenticated, canSeedProducts, canSeedCategories, refreshData]);

  const handleShareProduct = (productId: string) => {
    setTargetProductId(productId);
    setActiveTab('social_marketing');
  };

  const canAccessTab = (tab: string): boolean => {
    switch (tab) {
      case 'overview':
        return true;
      case 'statistics':
        return hasRole(['super_admin', 'product_manager', 'order_manager']) || hasPermission('view_analytics');
      case 'products':
      case 'offers':
        return hasRole(['super_admin', 'product_manager']) || hasPermission(['full_stock', 'manage_products']);
      case 'categories':
        return hasRole(['super_admin', 'product_manager']) || hasPermission(['full_stock', 'manage_categories']);
      case 'social_marketing':
      case 'content':
        return hasRole(['super_admin', 'product_manager']) || hasPermission('manage_content');
      case 'orders':
        return hasRole(['super_admin', 'order_manager']) || hasPermission('manage_orders');
      case 'customers':
        return hasRole(['super_admin', 'order_manager']) || hasPermission('manage_customers');
      case 'inventory':
        return hasRole(['super_admin', 'inventory_manager']) || hasPermission(['full_stock', 'manage_inventory']);
      case 'activity_log':
        return hasRole(['super_admin']) || hasPermission('view_audit_logs');
      case 'settings':
        return hasRole(['super_admin']) || hasPermission('manage_settings');
      default:
        return false;
    }
  };

  const handleSelectTab = (tab: string) => {
    if (!canAccessTab(tab)) {
      reportPermissionDenied({
        requiredPermissions:
          tab === 'inventory'
            ? ['full_stock', 'manage_inventory']
            : tab === 'settings'
            ? ['manage_settings']
            : tab === 'activity_log'
            ? ['view_audit_logs']
            : ['full_admin'],
        actionEn: `Open restricted section (${tab})`,
        actionAr: `فتح قسم مقيد (${tab})`,
      });
      return;
    }
    setActiveTab(tab);
  };

  if (!isAuthenticated && loading) {
    return <AdminTabSpinner />;
  }

  if (!isAuthenticated) {
    return <AdminLogin />;
  }

  const resolvedTab = canAccessTab(activeTab) ? activeTab : 'overview';

  return (
    <AdminLayout activeTab={resolvedTab} setActiveTab={handleSelectTab}>
      <ChunkErrorBoundary resetKey={resolvedTab} label={`admin-${resolvedTab}`}>
        <React.Suspense fallback={<AdminTabSpinner />}>
          {resolvedTab === 'overview' && <AdminOverview />}
          {resolvedTab === 'statistics' && <AdminStatistics />}
          {resolvedTab === 'products' && <AdminProducts onShareProduct={handleShareProduct} />}
          {resolvedTab === 'social_marketing' && (
            <AdminSocialMarketing initialProductId={targetProductId} />
          )}
          {resolvedTab === 'offers' && <AdminOffers onShareProduct={handleShareProduct} />}
          {resolvedTab === 'orders' && <AdminOrders />}
          {resolvedTab === 'inventory' && <AdminInventory />}
          {resolvedTab === 'categories' && <AdminCategoriesBrands />}
          {resolvedTab === 'content' && <AdminContent />}
          {resolvedTab === 'customers' && <AdminCustomers />}
          {resolvedTab === 'activity_log' && <AdminActivityLog />}
          {resolvedTab === 'settings' && <AdminSettings onNavigateTab={handleSelectTab} />}
        </React.Suspense>
      </ChunkErrorBoundary>
    </AdminLayout>
  );
};
