import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.js';
import { StoreProvider } from './context/StoreContext.js';
import { ActiveTab } from './types.js';
import { Header } from './components/Header.js';
import { BottomNav } from './components/BottomNav.js';
import { MoreMenuModal } from './components/MoreMenuModal.js';
import { AuthView } from './views/AuthView.js';
import { DashboardView } from './views/DashboardView.js';
import { ProductsView } from './views/ProductsView.js';
import { SalesBillingView } from './views/SalesBillingView.js';
import { PurchasesView } from './views/PurchasesView.js';
import { CustomersView } from './views/CustomersView.js';
import { SuppliersView } from './views/SuppliersView.js';
import { UdhaarView } from './views/UdhaarView.js';
import { ExpensesView } from './views/ExpensesView.js';
import { ReportsView } from './views/ReportsView.js';
import { SettingsView } from './views/SettingsView.js';
import { AdminDashboardView } from './views/AdminDashboardView.js';
import { BannerAd } from './components/BannerAd.js';

const AppContent: React.FC = () => {
  const { isAuthenticated, loading: authLoading } = useAuth();

  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const [isQuickAddProductOpen, setIsQuickAddProductOpen] = useState(false);
  const [isQuickAddCustomerOpen, setIsQuickAddCustomerOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem('kirana_theme') === 'dark';
  });

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('kirana_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('kirana_theme', 'light');
    }
  }, [darkMode]);

  // Ensure default view is dashboard on authentication
  useEffect(() => {
    if (isAuthenticated) {
      setActiveTab((prev) => prev || 'dashboard');
    }
  }, [isAuthenticated]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-4">
        <div className="w-10 h-10 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Checking authentication...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <AuthView />;
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col selection:bg-emerald-500 selection:text-white">
      {/* Header */}
      <Header
        activeTab={activeTab}
        onNavigate={setActiveTab}
        onOpenMore={() => setIsMoreOpen(true)}
        darkMode={darkMode}
        setDarkMode={setDarkMode}
        onOpenSettings={() => setActiveTab('settings')}
      />

      {/* Main Container */}
      <main className="flex-1 px-3 sm:px-6 pt-4 pb-24 max-w-6xl w-full mx-auto">
        {activeTab === 'dashboard' && (
          <DashboardView
            onNavigate={setActiveTab}
            onOpenAddProduct={() => {
              setActiveTab('products');
              setIsQuickAddProductOpen(true);
            }}
            onOpenAddCustomer={() => {
              setActiveTab('customers');
              setIsQuickAddCustomerOpen(true);
            }}
          />
        )}

        {activeTab === 'products' && (
          <ProductsView
            isAddModalOpen={isQuickAddProductOpen}
            onCloseAddModal={() => setIsQuickAddProductOpen(false)}
          />
        )}

        {activeTab === 'sales' && <SalesBillingView />}

        {activeTab === 'purchases' && <PurchasesView />}

        {activeTab === 'customers' && (
          <CustomersView
            isAddModalOpen={isQuickAddCustomerOpen}
            onCloseAddModal={() => setIsQuickAddCustomerOpen(false)}
          />
        )}

        {activeTab === 'suppliers' && <SuppliersView />}

        {activeTab === 'udhaar' && <UdhaarView />}

        {activeTab === 'expenses' && <ExpensesView />}

        {activeTab === 'reports' && <ReportsView />}

        {activeTab === 'settings' && <SettingsView />}

        {activeTab === 'admin' && (
          <AdminDashboardView onNavigateToUserStore={(tab) => setActiveTab(tab)} />
        )}

        {/* Google AdMob / AdSense Banner Ad */}
        <BannerAd className="mt-6" />
      </main>

      {/* Bottom Navigation */}
      <BottomNav
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onOpenMore={() => setIsMoreOpen(true)}
      />

      {/* More Menu Modal */}
      <MoreMenuModal
        isOpen={isMoreOpen}
        onClose={() => setIsMoreOpen(false)}
        activeTab={activeTab}
        onSelectTab={setActiveTab}
      />
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <StoreProvider>
        <AppContent />
      </StoreProvider>
    </AuthProvider>
  );
}
