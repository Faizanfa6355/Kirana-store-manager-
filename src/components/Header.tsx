import React from 'react';
import { Store, LogOut, Sun, Moon, RefreshCw, UserCheck, ShieldAlert } from 'lucide-react';
import { useAuth } from '../context/AuthContext.js';
import { useStore } from '../context/StoreContext.js';

import { ActiveTab } from '../types.js';

interface HeaderProps {
  activeTab?: ActiveTab;
  onNavigate?: (tab: ActiveTab) => void;
  onOpenMore?: () => void;
  darkMode?: boolean;
  setDarkMode?: (val: boolean | ((prev: boolean) => boolean)) => void;
  onOpenSettings?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  onNavigate,
  onOpenMore,
  darkMode = false,
  setDarkMode,
  onOpenSettings,
}) => {
  const { user, settings, logout, isAdmin } = useAuth();
  const { refreshAll, loading } = useStore();

  const storeDisplayName = isAdmin ? 'Admin Control Center' : (settings?.storeName || user?.storeName || 'Kirana Store');

  return (
    <header className="sticky top-0 z-30 bg-emerald-700 text-white shadow-md border-b border-emerald-800 transition-colors">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
        {/* Store Brand & Shopkeeper info */}
        <div className="flex items-center gap-2.5 truncate">
          <div className="w-9 h-9 rounded-lg bg-emerald-800/80 flex items-center justify-center text-white shrink-0 shadow-inner">
            <Store className="w-5 h-5" />
          </div>
          <div className="truncate">
            <h1 className="font-bold text-base leading-tight truncate tracking-tight text-white flex items-center gap-1.5">
              {storeDisplayName}
            </h1>
            <p className="text-[11px] text-emerald-100/80 leading-none truncate flex items-center gap-1">
              <UserCheck className="w-3 h-3" />
              <span>{user?.name || 'Shopkeeper'}</span>
              {settings?.phone && <span>• {settings.phone}</span>}
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1 shrink-0">
          {/* Refresh Data */}
          <button
            id="header-refresh-btn"
            onClick={() => refreshAll()}
            disabled={loading}
            title="Refresh Store Data"
            aria-label="Refresh data"
            className="w-8 h-8 rounded-full flex items-center justify-center text-emerald-100 hover:bg-emerald-800 active:scale-95 transition-all"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          {/* Admin Switch Button */}
          {isAdmin && onNavigate && (
            <button
              id="header-admin-panel-btn"
              onClick={() => onNavigate('admin')}
              title="Open Admin Panel"
              className={`px-2.5 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 transition-all ${
                activeTab === 'admin'
                  ? 'bg-amber-400 text-amber-950 shadow-xs'
                  : 'bg-emerald-800/90 text-amber-300 hover:bg-emerald-900'
              }`}
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Admin</span>
            </button>
          )}

          {/* Dark / Light toggle */}
          {setDarkMode && (
            <button
              id="header-theme-toggle-btn"
              onClick={() => setDarkMode((prev) => !prev)}
              title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              aria-label="Toggle theme"
              className="w-8 h-8 rounded-full flex items-center justify-center text-emerald-100 hover:bg-emerald-800 active:scale-95 transition-all"
            >
              {darkMode ? <Sun className="w-4 h-4 text-amber-300" /> : <Moon className="w-4 h-4" />}
            </button>
          )}

          {/* Logout */}
          <button
            id="header-logout-btn"
            onClick={logout}
            title="Logout"
            aria-label="Logout"
            className="w-8 h-8 rounded-full flex items-center justify-center text-emerald-100 hover:bg-emerald-800 hover:text-rose-200 active:scale-95 transition-all ml-1"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
