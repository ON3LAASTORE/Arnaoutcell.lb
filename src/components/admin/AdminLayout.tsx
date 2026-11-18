import React, { useState } from 'react';
import { useAdmin } from '../../context/AdminContext';
import { useShop } from '../../context/ShopContext';
import { formatCountdownMmSs } from '../../utils/adminSessionTimerHelpers';
import {
  LayoutDashboard,
  Package,
  Flame,
  Layers,
  ShoppingBag,
  Warehouse,
  Video,
  Users,
  Settings,
  LogOut,
  ExternalLink,
  Menu,
  X,
  Share2,
  History,
  Clock,
  BarChart3,
} from 'lucide-react';
import { StoreLogo } from '../StoreLogo';
import { SessionTimeoutWarningModal } from './SessionTimeoutWarningModal';

interface AdminLayoutProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  children: React.ReactNode;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({
  activeTab,
  setActiveTab,
  children,
}) => {
  const { user, logout, hasRole, sessionRemainingMs, showTimeoutWarning, extendSession } =
    useAdmin();
  const { lang, setCurrentView } = useShop();
  const [mobileOpen, setMobileOpen] = useState(false);
  const isAr = lang === 'ar';

  const countdownLabel = formatCountdownMmSs(sessionRemainingMs);

  const navItems = [
    { id: 'overview', labelEn: 'Overview', labelAr: 'نظرة عامة', icon: LayoutDashboard, roles: ['super_admin', 'product_manager', 'order_manager', 'inventory_manager'] },
    { id: 'statistics', labelEn: 'Statistics', labelAr: 'الإحصائيات', icon: BarChart3, roles: ['super_admin', 'product_manager', 'order_manager'] },
    { id: 'products', labelEn: 'Products', labelAr: 'إدارة المنتجات', icon: Package, roles: ['super_admin', 'product_manager'] },
    { id: 'social_marketing', labelEn: 'Social Media Manager', labelAr: 'مدير وسائل التواصل', icon: Share2, roles: ['super_admin', 'product_manager'] },
    { id: 'offers', labelEn: 'Offers & Deals', labelAr: 'العروض والخصومات', icon: Flame, roles: ['super_admin', 'product_manager'] },
    { id: 'orders', labelEn: 'Orders & Sales', labelAr: 'الطلبات والمبيعات', icon: ShoppingBag, roles: ['super_admin', 'order_manager'] },
    { id: 'inventory', labelEn: 'Inventory', labelAr: 'المستودع والمخزون', icon: Warehouse, roles: ['super_admin', 'inventory_manager'] },
    { id: 'categories', labelEn: 'Categories & Brands', labelAr: 'الأقسام والماركات', icon: Layers, roles: ['super_admin', 'product_manager'] },
    { id: 'content', labelEn: 'Banners & Videos', labelAr: 'البانرات والفيديوهات', icon: Video, roles: ['super_admin', 'product_manager'] },
    { id: 'customers', labelEn: 'Customers', labelAr: 'قاعدة العملاء', icon: Users, roles: ['super_admin', 'order_manager'] },
    { id: 'activity_log', labelEn: 'Activity Log', labelAr: 'سجل النشاط الأمني', icon: History, roles: ['super_admin'] },
    { id: 'settings', labelEn: 'Settings & Security', labelAr: 'الإعدادات والأمان', icon: Settings, roles: ['super_admin'] },
  ];

  return (
    <div className="min-h-[100dvh] w-full bg-[#F5F8FC] text-[#172033] flex flex-col lg:flex-row">
      {/* Mobile Top Header */}
      <div className="lg:hidden bg-white border-b border-[#DCE5F0] p-4 flex items-center justify-between sticky top-0 z-30 shadow-xs">
        <div className="flex items-center gap-2">
          <StoreLogo size="sm" adminMode={true} showTagline={false} />
        </div>
        <div className="flex items-center gap-2">
          <span
            data-testid="mobile-session-countdown"
            className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg border text-[11px] font-mono tabular-nums font-semibold ${
              showTimeoutWarning
                ? 'bg-amber-50 border-amber-200 text-[#B45309]'
                : 'bg-[#F5F8FC] border-[#DCE5F0] text-[#475569]'
            }`}
          >
            <Clock className="w-3 h-3" />
            <span>{countdownLabel}</span>
          </span>
          <button
            type="button"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label={mobileOpen ? 'Close navigation' : 'Open navigation'}
            className="p-2 rounded-xl bg-[#F5F8FC] border border-[#DCE5F0] text-[#64748B] hover:text-[#007AFF] cursor-pointer"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Sidebar */}
      <aside
        className={`fixed lg:sticky top-0 inset-y-0 left-0 rtl:left-auto rtl:right-0 z-40 w-64 bg-white border-r rtl:border-r-0 rtl:border-l border-[#DCE5F0] p-5 flex flex-col justify-between transform transition-transform duration-200 lg:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full rtl:translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="space-y-6">
          {/* Logo & Portal title */}
          <div className="pb-4 border-b border-[#DCE5F0]">
            <StoreLogo size="sm" adminMode={true} showTagline={true} />

            {/* Current user, role & inactivity countdown */}
            {user && (
              <div className="mt-4 p-2.5 rounded-xl bg-[#F5F8FC] border border-[#DCE5F0] text-xs">
                <p className="font-bold text-[#172033] truncate">{user.name}</p>
                <span className="inline-block mt-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#EAF3FF] text-[#007AFF] border border-[#BAE6FD] uppercase">
                  {user.role.replace('_', ' ')}
                </span>
                <div className="mt-2.5 pt-2 border-t border-[#DCE5F0] flex items-center justify-between text-[11px]">
                  <span className="inline-flex items-center gap-1.5 text-[#64748B] font-medium">
                    <Clock className="w-3 h-3" />
                    <span>{isAr ? 'انتهاء الجلسة' : 'Auto-logout'}</span>
                  </span>
                  <span
                    data-testid="sidebar-session-countdown"
                    className={`font-mono tabular-nums font-bold ${
                      showTimeoutWarning ? 'text-[#B45309]' : 'text-[#172033]'
                    }`}
                  >
                    {countdownLabel}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Nav Items */}
          <nav className="space-y-1">
            {navItems.map((item) => {
              const allowed = hasRole(item.roles as any);
              if (!allowed) return null;

              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id);
                    setMobileOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    isActive
                      ? 'bg-[#007AFF] text-white shadow-sm shadow-[#007AFF]/25'
                      : 'text-[#64748B] hover:text-[#007AFF] hover:bg-[#EAF3FF]/60'
                  }`}
                >
                  <item.icon className="w-4 h-4" />
                  <span>{isAr ? item.labelAr : item.labelEn}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Footer */}
        <div className="pt-4 border-t border-[#DCE5F0] space-y-2 text-xs">
          <button
            onClick={() => setCurrentView('home')}
            className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-[#64748B] hover:text-[#007AFF] hover:bg-[#EAF3FF]/50 transition-colors cursor-pointer"
          >
            <span>{isAr ? 'عرض المتجر للزبائن' : 'Public Storefront'}</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => logout('manual')}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-[#DC2626] hover:bg-red-50 transition-colors cursor-pointer font-bold"
          >
            <LogOut className="w-4 h-4" />
            <span>{isAr ? 'تسجيل الخروج' : 'Sign Out'}</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-4 sm:p-8 lg:p-10 max-w-7xl mx-auto w-full">
        {children}
      </main>

      {/* Pre-Logout Inactivity Warning Dialog */}
      <SessionTimeoutWarningModal
        isOpen={Boolean(showTimeoutWarning && user)}
        remainingMs={sessionRemainingMs}
        isAr={isAr}
        onExtendSession={extendSession}
        onSignOut={() => logout('manual')}
      />
    </div>
  );
};
