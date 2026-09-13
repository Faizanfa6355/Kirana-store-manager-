import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  TrendingUp,
  AlertTriangle,
  Award,
  Users,
  Receipt,
  Download,
  Calendar,
  Layers,
  ArrowUpRight,
  ArrowDownLeft,
} from 'lucide-react';
import { ReportsData } from '../types.js';
import { api } from '../api/client.js';
import { useStore } from '../context/StoreContext.js';

export const ReportsView: React.FC = () => {
  const { showToast } = useStore();
  const [reports, setReports] = useState<ReportsData | null>(null);
  const [loading, setLoading] = useState(true);

  const loadReports = async () => {
    setLoading(true);
    try {
      const data = await api.getReports();
      setReports(data);
    } catch (err: any) {
      showToast(err.message || 'Failed to load store reports', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, []);

  const handleExportCSV = async (type: 'products' | 'sales' | 'customers' | 'expenses') => {
    try {
      showToast(`Generating ${type}.csv report...`, 'info');
      await api.downloadCSV(type);
      showToast(`Downloaded ${type}.csv report`, 'success');
    } catch (err: any) {
      showToast(err.message || 'Export failed', 'error');
    }
  };

  if (loading || !reports) {
    return (
      <div className="py-20 text-center text-slate-400 max-w-5xl mx-auto">
        <BarChart3 className="w-10 h-10 mx-auto mb-2 animate-pulse text-emerald-600" />
        <p className="text-xs font-semibold">Calculating store performance metrics...</p>
      </div>
    );
  }

  const { summary, dailyTrend, bestSellingProducts, lowStockList, topDebtors, expensesByCategory } = reports;

  // Find max sales value for relative chart bar heights
  const maxDaySale = Math.max(1, ...dailyTrend.map((d) => d.sales));

  return (
    <div className="space-y-4 pb-20 max-w-5xl mx-auto">
      {/* Top Header */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-xs border border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">Store Analytics & Reports</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Real-time profit & loss, inventory health, and fast-moving goods
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => handleExportCSV('sales')}
            className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5 text-emerald-600" />
            <span>Sales CSV</span>
          </button>
          <button
            onClick={loadReports}
            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Profit & Loss Overview */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-xs border border-slate-200/80 dark:border-slate-800 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Profit & Loss Summary
          </h3>
          <span className="text-[11px] text-slate-400">Total {summary.totalOrders} Orders</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 rounded-xl">
            <span className="text-[10px] uppercase font-bold text-emerald-700 dark:text-emerald-400 block">
              Gross Sales
            </span>
            <div className="text-lg font-extrabold font-mono text-emerald-900 dark:text-emerald-200 mt-0.5">
              ₹{summary.totalSalesRevenue.toLocaleString('en-IN')}
            </div>
          </div>

          <div className="p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 rounded-xl">
            <span className="text-[10px] uppercase font-bold text-blue-700 dark:text-blue-400 block">
              Purchases
            </span>
            <div className="text-lg font-extrabold font-mono text-blue-900 dark:text-blue-200 mt-0.5">
              ₹{summary.totalPurchasesCost.toLocaleString('en-IN')}
            </div>
          </div>

          <div className="p-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 rounded-xl">
            <span className="text-[10px] uppercase font-bold text-rose-700 dark:text-rose-400 block">
              Expenses
            </span>
            <div className="text-lg font-extrabold font-mono text-rose-900 dark:text-rose-200 mt-0.5">
              ₹{summary.totalExpenses.toLocaleString('en-IN')}
            </div>
          </div>

          <div
            className={`p-3 border rounded-xl ${
              summary.totalNetProfit >= 0
                ? 'bg-emerald-100/60 dark:bg-emerald-900/40 border-emerald-300 dark:border-emerald-700'
                : 'bg-rose-100/60 dark:bg-rose-900/40 border-rose-300 dark:border-rose-700'
            }`}
          >
            <span
              className={`text-[10px] uppercase font-bold block ${
                summary.totalNetProfit >= 0
                  ? 'text-emerald-800 dark:text-emerald-300'
                  : 'text-rose-800 dark:text-rose-300'
              }`}
            >
              Net Profit
            </span>
            <div
              className={`text-lg font-extrabold font-mono mt-0.5 ${
                summary.totalNetProfit >= 0
                  ? 'text-emerald-900 dark:text-emerald-100'
                  : 'text-rose-900 dark:text-rose-100'
              }`}
            >
              ₹{summary.totalNetProfit.toLocaleString('en-IN')}
            </div>
          </div>
        </div>
      </div>

      {/* Daily Sales Trend Chart */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-xs border border-slate-200/80 dark:border-slate-800 space-y-3">
        <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
          Last 7 Days Sales Trend
        </h3>

        <div className="pt-4 pb-2">
          <div className="grid grid-cols-7 gap-2 items-end h-32">
            {dailyTrend.map((day) => {
              const heightPercent = Math.max(8, Math.round((day.sales / maxDaySale) * 100));

              return (
                <div key={day.date} className="flex flex-col items-center h-full justify-end group">
                  <div className="text-[10px] font-mono font-bold text-slate-600 dark:text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity mb-1">
                    ₹{day.sales}
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-t-lg overflow-hidden flex items-end h-24">
                    <div
                      style={{ height: `${heightPercent}%` }}
                      className="w-full bg-emerald-600 dark:bg-emerald-500 rounded-t-lg transition-all"
                    />
                  </div>
                  <span className="text-[10px] font-semibold text-slate-400 mt-2 truncate w-full text-center">
                    {day.date}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Two columns: Best-Selling Products & Low Stock Alerts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Best-Selling Products */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-xs border border-slate-200/80 dark:border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Award className="w-4 h-4 text-amber-500" />
              <span>Top Fast-Moving Items</span>
            </h3>
          </div>

          {bestSellingProducts.length === 0 ? (
            <p className="text-xs text-slate-400 py-6 text-center">No sales recorded yet</p>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {bestSellingProducts.map((p, idx) => (
                <div key={idx} className="py-2.5 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-slate-100 dark:bg-slate-800 text-[10px] font-bold text-slate-600 dark:text-slate-300 flex items-center justify-center">
                      {idx + 1}
                    </span>
                    <div>
                      <div className="text-xs font-bold text-slate-900 dark:text-white">{p.name}</div>
                      <div className="text-[10px] text-slate-400">
                        Sold: {p.quantity} {p.unit}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-extrabold font-mono text-emerald-600 dark:text-emerald-400">
                      ₹{p.revenue.toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Low Stock Alerts */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-xs border border-slate-200/80 dark:border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <span>Low-Stock Inventory Alerts</span>
            </h3>
            <span className="text-xs font-bold text-amber-600">{lowStockList.length} items</span>
          </div>

          {lowStockList.length === 0 ? (
            <p className="text-xs text-emerald-600 py-6 text-center font-medium">
              All products are well stocked above their minimum thresholds!
            </p>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-64 overflow-y-auto">
              {lowStockList.map((p) => (
                <div key={p.id} className="py-2 flex items-center justify-between gap-2 text-xs">
                  <div>
                    <span className="font-bold text-slate-900 dark:text-white block truncate">
                      {p.name}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      Threshold min: {p.minStock} {p.unit}
                    </span>
                  </div>
                  <div className="text-right">
                    <span
                      className={`font-extrabold font-mono ${
                        p.currentStock <= 0 ? 'text-rose-600' : 'text-amber-600'
                      }`}
                    >
                      {p.currentStock} {p.unit}
                    </span>
                    <span className="block text-[9px] uppercase font-bold text-rose-500">
                      {p.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Top Debtors & Expense Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Top Debtors */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-xs border border-slate-200/80 dark:border-slate-800 space-y-3">
          <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Users className="w-4 h-4 text-rose-600" />
            <span>Highest Customer Udhaar Balances</span>
          </h3>

          {topDebtors.length === 0 ? (
            <p className="text-xs text-slate-400 py-6 text-center">No pending customer credit</p>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {topDebtors.map((c) => (
                <div key={c.id} className="py-2 flex items-center justify-between text-xs">
                  <div>
                    <div className="font-bold text-slate-900 dark:text-white">{c.name}</div>
                    <div className="text-[10px] text-slate-400">{c.phone || 'No phone'}</div>
                  </div>
                  <span className="font-extrabold font-mono text-rose-600 dark:text-rose-400">
                    ₹{(c.creditBalance || 0).toLocaleString('en-IN')}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Expense Breakdown */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-xs border border-slate-200/80 dark:border-slate-800 space-y-3">
          <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Receipt className="w-4 h-4 text-slate-500" />
            <span>Expense Distribution</span>
          </h3>

          {expensesByCategory.length === 0 ? (
            <p className="text-xs text-slate-400 py-6 text-center">No expenses recorded yet</p>
          ) : (
            <div className="space-y-2.5">
              {expensesByCategory.map((e) => (
                <div key={e.category} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-medium text-slate-700 dark:text-slate-300">
                      {e.category}
                    </span>
                    <span className="font-bold font-mono text-slate-900 dark:text-white">
                      ₹{e.amount.toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                    <div
                      style={{
                        width: `${Math.min(
                          100,
                          summary.totalExpenses > 0 ? (e.amount / summary.totalExpenses) * 100 : 0
                        )}%`,
                      }}
                      className="bg-rose-500 h-full rounded-full"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
