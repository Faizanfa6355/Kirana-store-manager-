import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Product, Customer, Supplier, DashboardStats } from '../types.js';
import { api } from '../api/client.js';
import { useAuth } from './AuthContext.js';

interface Toast {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

interface StoreContextType {
  products: Product[];
  customers: Customer[];
  suppliers: Supplier[];
  dashboardStats: DashboardStats | null;
  loading: boolean;
  toasts: Toast[];
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  removeToast: (id: string) => void;
  refreshProducts: () => Promise<void>;
  refreshCustomers: () => Promise<void>;
  refreshSuppliers: () => Promise<void>;
  refreshDashboard: () => Promise<void>;
  refreshAll: () => Promise<void>;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, firebaseUser } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const refreshProducts = useCallback(async () => {
    if (!user || !firebaseUser) return;
    try {
      const data = await api.getProducts();
      setProducts(data);
    } catch (err: any) {
      console.warn('Could not refresh products:', err);
    }
  }, [user, firebaseUser]);

  const refreshCustomers = useCallback(async () => {
    if (!user || !firebaseUser) return;
    try {
      const data = await api.getCustomers();
      setCustomers(data);
    } catch (err: any) {
      console.warn('Could not refresh customers:', err);
    }
  }, [user, firebaseUser]);

  const refreshSuppliers = useCallback(async () => {
    if (!user || !firebaseUser) return;
    try {
      const data = await api.getSuppliers();
      setSuppliers(data);
    } catch (err: any) {
      console.warn('Could not refresh suppliers:', err);
    }
  }, [user, firebaseUser]);

  const refreshDashboard = useCallback(async () => {
    if (!user || !firebaseUser) return;
    try {
      const data = await api.getDashboard();
      setDashboardStats(data);
    } catch (err: any) {
      console.warn('Could not refresh dashboard stats:', err);
    }
  }, [user, firebaseUser]);

  const refreshAll = useCallback(async () => {
    if (!user || !firebaseUser) return;
    setLoading(true);
    try {
      await Promise.all([
        refreshProducts(),
        refreshCustomers(),
        refreshSuppliers(),
        refreshDashboard(),
      ]);
    } finally {
      setLoading(false);
    }
  }, [user, firebaseUser, refreshProducts, refreshCustomers, refreshSuppliers, refreshDashboard]);

  useEffect(() => {
    if (user && firebaseUser) {
      refreshAll();
    } else {
      setProducts([]);
      setCustomers([]);
      setSuppliers([]);
      setDashboardStats(null);
    }
  }, [user, firebaseUser, refreshAll]);

  return (
    <StoreContext.Provider
      value={{
        products,
        customers,
        suppliers,
        dashboardStats,
        loading,
        toasts,
        showToast,
        removeToast,
        refreshProducts,
        refreshCustomers,
        refreshSuppliers,
        refreshDashboard,
        refreshAll,
      }}
    >
      {children}
      {/* Toast Notification Overlay */}
      <div className="fixed top-4 right-4 left-4 sm:left-auto sm:w-80 z-50 pointer-events-none flex flex-col gap-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            id={`toast-${toast.id}`}
            className={`pointer-events-auto flex items-center justify-between px-4 py-3 rounded-lg shadow-lg border text-sm font-medium transition-all transform translate-y-0 ${
              toast.type === 'success'
                ? 'bg-emerald-900/95 text-emerald-100 border-emerald-700'
                : toast.type === 'error'
                ? 'bg-rose-900/95 text-rose-100 border-rose-700'
                : 'bg-slate-900/95 text-slate-100 border-slate-700'
            }`}
          >
            <span>{toast.message}</span>
            <button
              onClick={() => removeToast(toast.id)}
              className="ml-3 text-xs opacity-70 hover:opacity-100"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </StoreContext.Provider>
  );
};

export const useStore = () => {
  const context = useContext(StoreContext);
  if (!context) {
    throw new Error('useStore must be used within a StoreProvider');
  }
  return context;
};
