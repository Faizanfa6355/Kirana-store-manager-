import React from 'react';
import {
  Users,
  Building2,
  BookOpen,
  Receipt,
  BarChart3,
  Settings as SettingsIcon,
  X,
  ChevronRight,
  ShieldCheck,
  AlertCircle,
} from 'lucide-react';
import { ActiveTab } from '../types.js';
import { useStore } from '../context/StoreContext.js';

interface MoreMenuModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTab: (tab: ActiveTab) => void;
  activeTab: ActiveTab;
}

export const MoreMenuModal: React.FC<MoreMenuModalProps> = ({
  isOpen,
  onClose,
  onSelectTab,
  activeTab,
}) => {
  const { dashboardStats } = useStore();

  if (!isOpen) return null;

  const menuItems = [
    {
      id: 'customers' as ActiveTab,
      title: 'Customers',
      subtitle: 'Customer directory & khata balances',
      icon: Users,
      badge: dashboardStats?.totalCustomers ? `${dashboardStats.totalCustomers} total` : undefined,
      color: 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50',
    },
    {
      id: 'suppliers' as ActiveTab,
      title: 'Suppliers',
      subtitle: 'Wholesalers & payable accounts',
      icon: Building2,
      color: 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50',
    },
    {
      id: 'udhaar' as ActiveTab,
      title: 'Udhaar / Khata Book',
      subtitle: 'Track customer credit & supplier payables',
      icon: BookOpen,
      badge: dashboardStats?.pendingPayments ? `₹${dashboardStats.pendingPayments} pending` : undefined,
      badgeColor: 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300',
      color: 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/50',
    },
    {
      id: 'expenses' as ActiveTab,
      title: 'Expenses',
      subtitle: 'Rent, electricity, salary & shop costs',
      icon: Receipt,
      color: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50',
    },
    {
      id: 'reports' as ActiveTab,
      title: 'Reports & Analytics',
      subtitle: 'Sales, profit, best sellers & stock audits',
      icon: BarChart3,
      color: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50',
    },
    {
      id: 'settings' as ActiveTab,
      title: 'Store Settings',
      subtitle: 'Shop details, invoice footer & backup',
      icon: SettingsIcon,
      color: 'text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in duration-200">
      <div
        className="w-full sm:max-w-md bg-white dark:bg-slate-900 rounded-t-2xl sm:rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 max-h-[85vh] flex flex-col overflow-hidden animate-in slide-in-from-bottom-5 duration-200"
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">More Management Tools</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">Quick access to store modules</p>
          </div>
          <button
            id="more-menu-close-btn"
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* List of items */}
        <div className="p-3 space-y-1.5 overflow-y-auto">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isCurrent = activeTab === item.id;
            return (
              <button
                key={item.id}
                id={`more-menu-item-${item.id}`}
                onClick={() => {
                  onSelectTab(item.id);
                  onClose();
                }}
                className={`w-full flex items-center justify-between p-3.5 rounded-xl text-left transition-all ${
                  isCurrent
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-100 font-semibold'
                    : 'hover:bg-slate-50 dark:hover:bg-slate-800/60 border border-transparent text-slate-800 dark:text-slate-200'
                }`}
              >
                <div className="flex items-center gap-3.5">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${item.color}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold flex items-center gap-2">
                      <span>{item.title}</span>
                      {item.badge && (
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            item.badgeColor || 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1">{item.subtitle}</div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 shrink-0 ml-2" />
              </button>
            );
          })}
        </div>

        {/* Footer info note */}
        <div className="px-5 py-3 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>Local store data encrypted and secured for your shop.</span>
        </div>
      </div>
    </div>
  );
};
