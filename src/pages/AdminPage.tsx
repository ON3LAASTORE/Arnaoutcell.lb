import React, { useState } from 'react';
import { useAdmin } from '../context/AdminContext';
import { AdminLogin } from '../components/admin/AdminLogin';
import { AdminLayout } from '../components/admin/AdminLayout';
import { AdminOverview } from '../components/admin/AdminOverview';
import { AdminProducts } from '../components/admin/AdminProducts';
import { AdminOffers } from '../components/admin/AdminOffers';
import { AdminOrders } from '../components/admin/AdminOrders';
import { AdminInventory } from '../components/admin/AdminInventory';
import { AdminCategoriesBrands } from '../components/admin/AdminCategoriesBrands';
import { AdminContent } from '../components/admin/AdminContent';
import { AdminCustomers } from '../components/admin/AdminCustomers';
import { AdminSettings } from '../components/admin/AdminSettings';

export const AdminPage: React.FC = () => {
  const { isAuthenticated } = useAdmin();
  const [activeTab, setActiveTab] = useState('overview');

  if (!isAuthenticated) {
    return <AdminLogin />;
  }

  return (
    <AdminLayout activeTab={activeTab} setActiveTab={setActiveTab}>
      {activeTab === 'overview' && <AdminOverview onNavigateTab={setActiveTab} />}
      {activeTab === 'products' && <AdminProducts />}
      {activeTab === 'offers' && <AdminOffers />}
      {activeTab === 'orders' && <AdminOrders />}
      {activeTab === 'inventory' && <AdminInventory />}
      {activeTab === 'categories' && <AdminCategoriesBrands />}
      {activeTab === 'content' && <AdminContent />}
      {activeTab === 'customers' && <AdminCustomers />}
      {activeTab === 'settings' && <AdminSettings />}
    </AdminLayout>
  );
};
