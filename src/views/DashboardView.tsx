import React from 'react';
import {
  TrendingUp,
  ShoppingBag,
  Package,
  Users,
  AlertTriangle,
  PlusCircle,
  ArrowUpRight,
  ArrowDownLeft,
  CreditCard,
  Receipt,
  Wallet,
  Coins,
} from 'lucide-react';
import { useStore } from '../context/StoreContext.js';
import { ActiveTab } from '../types.js';
import { NativeAd } from '../components/NativeAd.js';

interface DashboardViewProps {
  onNavigate: (tab: ActiveTab) => void;
  onOpenAddProduct: () => void;
  onOpenAddCustomer: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  onNavigate,
  onOpenAddProduct,
  onOpenAddCustomer,
}) => {
  const { dashboardStats, loading } = useStore();

  const stats = dashboardStats || {
    todaySales: 0,
    todayPurchases: 0,
    todayGrossProfit: 0,
    todayExpenses: 0,
    todayProfit: 0,
    totalProducts: 0,
    lowStockProducts: 0,
    outOfStockProducts: 0,
    stockValue: 0,
    totalCustomers: 0,
    pendingPayments: 0,
    supplierPayables: 0,
    recentTransactions: [],
  };

  return (
    <div className="space-y-4 pb-20 max-w-5xl mx-auto">
      {/* Top Welcome / Today Banner */}
      <div className="bg-gradient-to-br from-emerald-700 via-emerald-800 to-teal-900 rounded-2xl p-5 text-white shadow-md">
        <div className="flex items-center justify-between mb-3">
          <div>
            <span className="text-xs font-semibold tracking-wider uppercase text-emerald-200">
              Today's Overview
            </span>
            <h2 className="text-2xl font-extrabold tracking-tight mt-0.5">
              ₹{stats.todaySales.toLocaleString('en-IN')}
            </h2>
            <p className="text-xs text-emerald-100/90">Total Sales Recorded Today</p>
          </div>
          <div className="text-right">
            <span className="text-xs font-semibold tracking-wider uppercase text-emerald-200">
              Today's Net Profit
            </span>
            <div
              className={`text-xl font-bold flex items-center justify-end gap-1 ${
                stats.todayProfit >= 0 ? 'text-emerald-300' : 'text-rose-300'
              }`}
            >
              <TrendingUp className="w-4 h-4" />
              <span>₹{stats.todayProfit.toLocaleString('en-IN')}</span>
            </div>
            <p className="text-[11px] text-emerald-200/80">Gross Profit - Expenses</p>
          </div>
        </div>

        {/* Mini stats row */}
        <div className="grid grid-cols-2 gap-2 pt-3 border-t border-emerald-600/60 text-xs">
          <div className="flex items-center justify-between bg-emerald-900/40 px-3 py-2 rounded-xl">
            <span className="text-emerald-200">Today Purchases:</span>
            <span className="font-bold text-white">₹{stats.todayPurchases.toLocaleString('en-IN')}</span>
          </div>
          <div className="flex items-center justify-between bg-emerald-900/40 px-3 py-2 rounded-xl">
            <span className="text-emerald-200">Today Expenses:</span>
            <span className="font-bold text-white">₹{stats.todayExpenses.toLocaleString('en-IN')}</span>
          </div>
        </div>
      </div>

      {/* Quick Action Buttons (Add Sale, Add Purchase, Add Product, Add Customer) */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-xs border border-slate-200/80 dark:border-slate-800">
        <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">
          Quick Actions
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {/* Add Sale */}
          <button
            id="dash-quick-add-sale"
            onClick={() => onNavigate('sales')}
            className="flex flex-col items-center justify-center p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 hover:bg-emerald-100/80 active:scale-95 transition-all text-center group"
          >
            <div className="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center mb-1.5 shadow-sm group-hover:scale-105 transition-transform">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold leading-tight">New Sale</span>
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400">Fast Billing</span>
          </button>

          {/* Add Purchase */}
          <button
            id="dash-quick-add-purchase"
            onClick={() => onNavigate('purchases')}
            className="flex flex-col items-center justify-center p-3 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200 hover:bg-blue-100/80 active:scale-95 transition-all text-center group"
          >
            <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center mb-1.5 shadow-sm group-hover:scale-105 transition-transform">
              <PlusCircle className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold leading-tight">Add Purchase</span>
            <span className="text-[10px] text-blue-600 dark:text-blue-400">Stock In</span>
          </button>

          {/* Add Product */}
          <button
            id="dash-quick-add-product"
            onClick={onOpenAddProduct}
            className="flex flex-col items-center justify-center p-3 rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 text-purple-800 dark:text-purple-200 hover:bg-purple-100/80 active:scale-95 transition-all text-center group"
          >
            <div className="w-10 h-10 rounded-full bg-purple-600 text-white flex items-center justify-center mb-1.5 shadow-sm group-hover:scale-105 transition-transform">
              <Package className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold leading-tight">Add Product</span>
            <span className="text-[10px] text-purple-600 dark:text-purple-400">Inventory</span>
          </button>

          {/* Add Customer */}
          <button
            id="dash-quick-add-customer"
            onClick={onOpenAddCustomer}
            className="flex flex-col items-center justify-center p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 hover:bg-amber-100/80 active:scale-95 transition-all text-center group"
          >
            <div className="w-10 h-10 rounded-full bg-amber-600 text-white flex items-center justify-center mb-1.5 shadow-sm group-hover:scale-105 transition-transform">
              <Users className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold leading-tight">Add Customer</span>
            <span className="text-[10px] text-amber-600 dark:text-amber-400">Udhaar Khata</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Total Products */}
        <div
          onClick={() => onNavigate('products')}
          className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs cursor-pointer hover:border-emerald-500 transition-colors"
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Products</span>
            <Package className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="text-xl font-bold text-slate-900 dark:text-white">
            {stats.totalProducts}
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 truncate">
            Stock Val: ₹{stats.stockValue.toLocaleString('en-IN')}
          </p>
        </div>

        {/* Low-stock products */}
        <div
          onClick={() => onNavigate('products')}
          className={`p-4 rounded-2xl border shadow-xs cursor-pointer transition-colors ${
            stats.lowStockProducts > 0 || stats.outOfStockProducts > 0
              ? 'bg-amber-50/70 dark:bg-amber-950/30 border-amber-300 dark:border-amber-800/80'
              : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800'
          }`}
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs text-amber-700 dark:text-amber-400 font-semibold">Low Stock</span>
            <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="text-xl font-bold text-amber-900 dark:text-amber-200">
            {stats.lowStockProducts}
          </div>
          <p className="text-[11px] text-amber-700 dark:text-amber-400 mt-1">
            {stats.outOfStockProducts > 0 ? `${stats.outOfStockProducts} out of stock` : 'Restock alert'}
          </p>
        </div>

        {/* Total Customers */}
        <div
          onClick={() => onNavigate('customers')}
          className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs cursor-pointer hover:border-blue-500 transition-colors"
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Customers</span>
            <Users className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="text-xl font-bold text-slate-900 dark:text-white">
            {stats.totalCustomers}
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Saved accounts</p>
        </div>

        {/* Pending Payments / Udhaar */}
        <div
          onClick={() => onNavigate('udhaar')}
          className={`p-4 rounded-2xl border shadow-xs cursor-pointer transition-colors ${
            stats.pendingPayments > 0
              ? 'bg-rose-50/70 dark:bg-rose-950/30 border-rose-300 dark:border-rose-800/80'
              : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800'
          }`}
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs text-rose-700 dark:text-rose-400 font-semibold">Udhaar Due</span>
            <CreditCard className="w-4 h-4 text-rose-600 dark:text-rose-400" />
          </div>
          <div className="text-xl font-bold text-rose-900 dark:text-rose-200">
            ₹{stats.pendingPayments.toLocaleString('en-IN')}
          </div>
          <p className="text-[11px] text-rose-700 dark:text-rose-400 mt-1">Customer balance</p>
        </div>
      </div>

      {/* Google Native Ad Placement */}
      <NativeAd className="my-3" />

      {/* Recent Transactions List */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-xs border border-slate-200/80 dark:border-slate-800">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">Recent Transactions</h3>
          <button
            onClick={() => onNavigate('reports')}
            className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline"
          >
            View Reports
          </button>
        </div>

        {stats.recentTransactions.length === 0 ? (
          <div className="text-center py-8 text-slate-400 dark:text-slate-500">
            <ShoppingBag className="w-10 h-10 mx-auto mb-2 opacity-40" />
            <p className="text-sm font-medium">No transactions recorded yet today</p>
            <p className="text-xs mt-1 text-slate-400">
              Tap "New Sale" or "Add Purchase" above to record store activity.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {stats.recentTransactions.map((tx) => (
              <div key={tx.id} className="py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                      tx.type === 'sale'
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                        : tx.type === 'purchase'
                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                        : 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                    }`}
                  >
                    {tx.type === 'sale' ? (
                      <ArrowDownLeft className="w-4 h-4" />
                    ) : tx.type === 'purchase' ? (
                      <ArrowUpRight className="w-4 h-4" />
                    ) : (
                      <Receipt className="w-4 h-4" />
                    )}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900 dark:text-white">{tx.title}</div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-[180px] sm:max-w-xs">
                      {tx.subtitle}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div
                    className={`text-sm font-bold ${
                      tx.isIncome
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-slate-900 dark:text-white'
                    }`}
                  >
                    {tx.isIncome ? '+' : '-'}₹{tx.amount.toLocaleString('en-IN')}
                  </div>
                  <div className="text-[10px] text-slate-400">
                    {new Date(tx.date).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
