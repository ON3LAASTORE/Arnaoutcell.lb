import React, { useState } from 'react';
import { useAdmin } from '../context/AdminContext';
import { AdminLogin } from '../components/admin/AdminLogin';
import { AdminLayout } from '../components/admin/AdminLayout';
import { AdminOverview } from '../components/admin/AdminOverview';

// Code-split admin modules to prevent downloading entire admin suite on initial open
const AdminProducts = React.lazy(() =>
  import('../components/admin/AdminProducts').then((m) => ({ default: m.AdminProducts }))
);
const AdminSocialMarketing = React.lazy(() =>
  import('../components/admin/AdminSocialMarketing').then((m) => ({ default: m.AdminSocialMarketing }))
);
const AdminOffers = React.lazy(() =>
  import('../components/admin/AdminOffers').then((m) => ({ default: m.AdminOffers }))
);
const AdminOrders = React.lazy(() =>
  import('../components/admin/AdminOrders').then((m) => ({ default: m.AdminOrders }))
);
const AdminInventory = React.lazy(() =>
  import('../components/admin/AdminInventory').then((m) => ({ default: m.AdminInventory }))
);
const AdminCategoriesBrands = React.lazy(() =>
  import('../components/admin/AdminCategoriesBrands').then((m) => ({ default: m.AdminCategoriesBrands }))
);
const AdminContent = React.lazy(() =>
  import('../components/admin/AdminContent').then((m) => ({ default: m.AdminContent }))
);
const AdminCustomers = React.lazy(() =>
  import('../components/admin/AdminCustomers').then((m) => ({ default: m.AdminCustomers }))
);
const AdminSettings = React.lazy(() =>
  import('../components/admin/AdminSettings').then((m) => ({ default: m.AdminSettings }))
);

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
      <React.Suspense fallback={<AdminTabSpinner />}>
        {activeTab === 'overview' && <AdminOverview onNavigateTab={setActiveTab} />}
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
        {activeTab === 'settings' && <AdminSettings />}
      </React.Suspense>
    </AdminLayout>
  );
};
