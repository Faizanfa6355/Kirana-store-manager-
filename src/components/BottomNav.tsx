import React from 'react';
import { LayoutDashboard, Package, ShoppingCart, Truck, MoreHorizontal } from 'lucide-react';
import { ActiveTab } from '../types.js';
import { useStore } from '../context/StoreContext.js';

interface BottomNavProps {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  onOpenMore: () => void;
  isMoreOpen: boolean;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  onSelectTab,
  onOpenMore,
  isMoreOpen,
}) => {
  const { dashboardStats } = useStore();

  const isMoreActive =
    isMoreOpen ||
    ['customers', 'suppliers', 'udhaar', 'expenses', 'reports', 'settings'].includes(activeTab);

  const lowStockCount = dashboardStats?.lowStockProducts || 0;
  const pendingCredit = dashboardStats?.pendingPayments || 0;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 shadow-[0_-4px_12px_rgba(0,0,0,0.05)] safe-area-pb">
      <div className="max-w-md mx-auto grid grid-cols-5 h-16 items-center px-1">
        {/* 1. Dashboard */}
        <button
          id="nav-dashboard-tab"
          onClick={() => onSelectTab('dashboard')}
          className={`flex flex-col items-center justify-center h-full w-full relative transition-colors ${
            activeTab === 'dashboard' && !isMoreOpen
              ? 'text-emerald-700 dark:text-emerald-400 font-bold'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          <LayoutDashboard className="w-5 h-5 mb-0.5" />
          <span className="text-[11px] tracking-tight">Dashboard</span>
        </button>

        {/* 2. Products */}
        <button
          id="nav-products-tab"
          onClick={() => onSelectTab('products')}
          className={`flex flex-col items-center justify-center h-full w-full relative transition-colors ${
            activeTab === 'products' && !isMoreOpen
              ? 'text-emerald-700 dark:text-emerald-400 font-bold'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          <div className="relative">
            <Package className="w-5 h-5 mb-0.5" />
            {lowStockCount > 0 && (
              <span className="absolute -top-1.5 -right-2 bg-amber-500 text-white text-[9px] font-extrabold px-1 rounded-full min-w-[14px] h-[14px] flex items-center justify-center">
                {lowStockCount > 9 ? '9+' : lowStockCount}
              </span>
            )}
          </div>
          <span className="text-[11px] tracking-tight">Products</span>
        </button>

        {/* 3. Sales (Billing) - Prominent Billing Button */}
        <button
          id="nav-sales-tab"
          onClick={() => onSelectTab('sales')}
          className="flex flex-col items-center justify-center h-full w-full -mt-2 group"
        >
          <div
            className={`w-12 h-12 rounded-full flex items-center justify-center shadow-md transition-transform active:scale-95 ${
              activeTab === 'sales' && !isMoreOpen
                ? 'bg-emerald-700 text-white ring-4 ring-emerald-100 dark:ring-emerald-950'
                : 'bg-emerald-600 text-white group-hover:bg-emerald-700'
            }`}
          >
            <ShoppingCart className="w-6 h-6" />
          </div>
          <span
            className={`text-[11px] tracking-tight mt-0.5 ${
              activeTab === 'sales' && !isMoreOpen
                ? 'text-emerald-700 dark:text-emerald-400 font-bold'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            Billing
          </span>
        </button>

        {/* 4. Purchases */}
        <button
          id="nav-purchases-tab"
          onClick={() => onSelectTab('purchases')}
          className={`flex flex-col items-center justify-center h-full w-full relative transition-colors ${
            activeTab === 'purchases' && !isMoreOpen
              ? 'text-emerald-700 dark:text-emerald-400 font-bold'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          <Truck className="w-5 h-5 mb-0.5" />
          <span className="text-[11px] tracking-tight">Purchases</span>
        </button>

        {/* 5. More */}
        <button
          id="nav-more-tab"
          onClick={onOpenMore}
          className={`flex flex-col items-center justify-center h-full w-full relative transition-colors ${
            isMoreActive
              ? 'text-emerald-700 dark:text-emerald-400 font-bold'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          <div className="relative">
            <MoreHorizontal className="w-5 h-5 mb-0.5" />
            {pendingCredit > 0 && (
              <span className="absolute -top-1 -right-1.5 w-2 h-2 rounded-full bg-rose-500" />
            )}
          </div>
          <span className="text-[11px] tracking-tight">More</span>
        </button>
      </div>
    </nav>
  );
};
