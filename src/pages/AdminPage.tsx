import React, { useState } from 'react';
import { useAdmin } from '../context/AdminContext';
import { AdminLogin } from '../components/admin/AdminLogin';
import { AdminLayout } from '../components/admin/AdminLayout';
import { AdminOverview } from '../components/admin/AdminOverview';
import { ChunkErrorBoundary } from '../components/ChunkErrorBoundary';
import { safeLazy } from '../utils/lazyImportHelpers';

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
  const { isAuthenticated } = useAdmin();
  const [activeTab, setActiveTab] = useState('overview');
  const [targetProductId, setTargetProductId] = useState<string | undefined>(undefined);

  const handleShareProduct = (productId: string) => {
    setTargetProductId(productId);
    setActiveTab('social_marketing');
  };

  if (!isAuthenticated) {
    return <AdminLogin />;
  }

  return (
    <AdminLayout activeTab={activeTab} setActiveTab={setActiveTab}>
      <ChunkErrorBoundary resetKey={activeTab} label={`admin-${activeTab}`}>
        <React.Suspense fallback={<AdminTabSpinner />}>
          {activeTab === 'overview' && <AdminOverview />}
          {activeTab === 'statistics' && <AdminStatistics />}
          {activeTab === 'products' && <AdminProducts onShareProduct={handleShareProduct} />}
          {activeTab === 'social_marketing' && (
            <AdminSocialMarketing initialProductId={targetProductId} />
          )}
          {activeTab === 'offers' && <AdminOffers onShareProduct={handleShareProduct} />}
          {activeTab === 'orders' && <AdminOrders />}
          {activeTab === 'inventory' && <AdminInventory />}
          {activeTab === 'categories' && <AdminCategoriesBrands />}
          {activeTab === 'content' && <AdminContent />}
          {activeTab === 'customers' && <AdminCustomers />}
          {activeTab === 'activity_log' && <AdminActivityLog />}
          {activeTab === 'settings' && <AdminSettings onNavigateTab={setActiveTab} />}
        </React.Suspense>
      </ChunkErrorBoundary>
    </AdminLayout>
  );
};
