import React, { useState, useEffect, useMemo } from 'react';
import {
  ShieldAlert,
  Users,
  Package,
  ShoppingBag,
  Truck,
  Building2,
  Receipt,
  BarChart3,
  Search,
  RefreshCw,
  Trash2,
  Edit2,
  Lock,
  Unlock,
  CheckCircle2,
  AlertTriangle,
  UserCheck,
  TrendingUp,
  DollarSign,
  Calendar,
  X,
  Plus,
  ArrowUpRight,
  ArrowDownLeft,
  Mail,
  Phone,
  Store,
  Eye,
  LogOut,
  Filter,
} from 'lucide-react';
import { useAuth, ADMIN_EMAIL } from '../context/AuthContext.js';
import { useStore } from '../context/StoreContext.js';
import {
  RegisteredUser,
  AdminOverviewStats,
  Product,
  Sale,
  Purchase,
  Customer,
  Supplier,
  Expense,
  ActiveTab,
} from '../types.js';
import {
  getAdminAllUsers,
  getAdminStoreData,
  updateAdminUser,
  deleteAdminUser,
  deleteProductAsAdmin,
  updateProductAsAdmin,
  deleteSaleAsAdmin,
  deleteCustomerAsAdmin,
  deleteSupplierAsAdmin,
  deleteExpenseAsAdmin,
} from '../services/firestoreService.js';

type AdminTab =
  | 'overview'
  | 'users'
  | 'products'
  | 'sales'
  | 'purchases'
  | 'customers'
  | 'suppliers'
  | 'expenses'
  | 'reports';

interface AdminDashboardViewProps {
  onNavigateToUserStore?: (tab: ActiveTab) => void;
}

export const AdminDashboardView: React.FC<AdminDashboardViewProps> = ({ onNavigateToUserStore }) => {
  const { user, firebaseUser, isAdmin, logout } = useAuth();
  const { showToast } = useStore();

  const [activeAdminTab, setActiveAdminTab] = useState<AdminTab>('overview');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Raw Admin Data
  const [users, setUsers] = useState<RegisteredUser[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [stats, setStats] = useState<AdminOverviewStats>({
    totalUsers: 0,
    totalProducts: 0,
    totalSales: 0,
    totalPurchases: 0,
    totalCustomers: 0,
    totalSuppliers: 0,
    totalExpenses: 0,
    totalSalesRevenue: 0,
    totalPurchasesCost: 0,
    totalExpensesAmount: 0,
    totalCreditOutstanding: 0,
  });

  // Filters
  const [selectedUserFilter, setSelectedUserFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Editing Modals State
  const [editingUser, setEditingUser] = useState<RegisteredUser | null>(null);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [selectedSaleDetails, setSelectedSaleDetails] = useState<Sale | null>(null);

  // Load all system data across Firestore
  const loadAdminData = async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);

    try {
      const allUsers = await getAdminAllUsers();
      setUsers(allUsers);

      const storeData = await getAdminStoreData(
        selectedUserFilter === 'all' ? undefined : selectedUserFilter
      );
      setProducts(storeData.products);
      setSales(storeData.sales);
      setPurchases(storeData.purchases);
      setCustomers(storeData.customers);
      setSuppliers(storeData.suppliers);
      setExpenses(storeData.expenses);
      setStats(storeData.stats);
    } catch (err: any) {
      console.error('Error loading admin portal data:', err);
      showToast(err.message || 'Failed to fetch admin system data', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadAdminData();
  }, [selectedUserFilter]);

  // Authorization Protection
  if (!isAdmin) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center max-w-md mx-auto">
        <div className="w-16 h-16 rounded-3xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 flex items-center justify-center mb-4 shadow-md">
          <ShieldAlert className="w-9 h-9" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">
          Access Denied: Admin Account Required
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 mb-6">
          This control dashboard is strictly restricted to <span className="font-mono text-emerald-600 dark:text-emerald-400 font-semibold">{ADMIN_EMAIL}</span>.
        </p>
        <button
          onClick={logout}
          className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-xl shadow-md transition-all cursor-pointer"
        >
          Sign Out of Current Account
        </button>
      </div>
    );
  }

  // --- Handlers: User Management ---
  const handleToggleDisableUser = async (u: RegisteredUser) => {
    try {
      const nextStatus = !u.disabled;
      await updateAdminUser(u.userId, { disabled: nextStatus });
      setUsers((prev) =>
        prev.map((item) => (item.userId === u.userId ? { ...item, disabled: nextStatus } : item))
      );
      showToast(
        `User ${u.email} has been ${nextStatus ? 'disabled' : 'enabled'}.`,
        nextStatus ? 'info' : 'success'
      );
    } catch (err: any) {
      showToast(err.message || 'Failed to update user status', 'error');
    }
  };

  const handleDeleteUser = async (u: RegisteredUser) => {
    if (u.email.toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
      showToast('The primary administrator account cannot be deleted.', 'error');
      return;
    }
    const confirmed = window.confirm(
      `Are you sure you want to delete user account "${u.fullName} (${u.email})"? This action is irreversible.`
    );
    if (!confirmed) return;

    try {
      await deleteAdminUser(u.userId);
      setUsers((prev) => prev.filter((item) => item.userId !== u.userId));
      showToast(`User ${u.email} removed from system.`, 'success');
      loadAdminData(true);
    } catch (err: any) {
      showToast(err.message || 'Failed to delete user profile', 'error');
    }
  };

  // --- Handlers: Product Management ---
  const handleDeleteProduct = async (prod: Product) => {
    const confirmed = window.confirm(`Delete product "${prod.name}" across user store?`);
    if (!confirmed) return;
    try {
      await deleteProductAsAdmin(prod.userId, prod.id);
      setProducts((prev) => prev.filter((p) => p.id !== prod.id));
      showToast(`Product "${prod.name}" deleted.`, 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to delete product', 'error');
    }
  };

  const handleSaveProductEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;
    try {
      await updateProductAsAdmin(editingProduct.userId, editingProduct.id, {
        name: editingProduct.name,
        category: editingProduct.category,
        brand: editingProduct.brand,
        purchasePrice: Number(editingProduct.purchasePrice) || 0,
        sellingPrice: Number(editingProduct.sellingPrice) || 0,
        currentStock: Number(editingProduct.currentStock) || 0,
        minStock: Number(editingProduct.minStock) || 5,
        barcode: editingProduct.barcode || '',
      });
      setProducts((prev) =>
        prev.map((p) => (p.id === editingProduct.id ? editingProduct : p))
      );
      setEditingProduct(null);
      showToast('Product updated successfully.', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to update product', 'error');
    }
  };

  // --- Handlers: Sales, Customers, Suppliers, Expenses Deletion ---
  const handleDeleteSale = async (s: Sale) => {
    const confirmed = window.confirm(`Delete Invoice #${s.invoiceNo}?`);
    if (!confirmed) return;
    try {
      await deleteSaleAsAdmin(s.userId, s.id);
      setSales((prev) => prev.filter((item) => item.id !== s.id));
      showToast(`Invoice #${s.invoiceNo} deleted.`, 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to delete sale', 'error');
    }
  };

  const handleDeleteCustomer = async (c: Customer) => {
    const confirmed = window.confirm(`Delete customer "${c.name}"?`);
    if (!confirmed) return;
    try {
      await deleteCustomerAsAdmin(c.userId, c.id);
      setCustomers((prev) => prev.filter((item) => item.id !== c.id));
      showToast(`Customer "${c.name}" deleted.`, 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to delete customer', 'error');
    }
  };

  const handleDeleteSupplier = async (supp: Supplier) => {
    const confirmed = window.confirm(`Delete supplier "${supp.name}"?`);
    if (!confirmed) return;
    try {
      await deleteSupplierAsAdmin(supp.userId, supp.id);
      setSuppliers((prev) => prev.filter((item) => item.id !== supp.id));
      showToast(`Supplier "${supp.name}" deleted.`, 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to delete supplier', 'error');
    }
  };

  const handleDeleteExpense = async (exp: Expense) => {
    const confirmed = window.confirm(`Delete expense record of ₹${exp.amount}?`);
    if (!confirmed) return;
    try {
      await deleteExpenseAsAdmin(exp.userId, exp.id);
      setExpenses((prev) => prev.filter((item) => item.id !== exp.id));
      showToast(`Expense of ₹${exp.amount} deleted.`, 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to delete expense', 'error');
    }
  };

  // Filtered Lists
  const filteredUsers = useMemo(() => {
    if (!searchQuery) return users;
    const q = searchQuery.toLowerCase();
    return users.filter(
      (u) =>
        u.fullName.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        (u.storeName && u.storeName.toLowerCase().includes(q))
    );
  }, [users, searchQuery]);

  const filteredProducts = useMemo(() => {
    if (!searchQuery) return products;
    const q = searchQuery.toLowerCase();
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        (p.barcode && p.barcode.includes(q))
    );
  }, [products, searchQuery]);

  const filteredSales = useMemo(() => {
    if (!searchQuery) return sales;
    const q = searchQuery.toLowerCase();
    return sales.filter(
      (s) =>
        s.invoiceNo.toLowerCase().includes(q) ||
        (s.customerName && s.customerName.toLowerCase().includes(q)) ||
        s.paymentMethod.toLowerCase().includes(q)
    );
  }, [sales, searchQuery]);

  const filteredPurchases = useMemo(() => {
    if (!searchQuery) return purchases;
    const q = searchQuery.toLowerCase();
    return purchases.filter(
      (p) =>
        p.productName.toLowerCase().includes(q) ||
        (p.supplierName && p.supplierName.toLowerCase().includes(q))
    );
  }, [purchases, searchQuery]);

  const filteredCustomers = useMemo(() => {
    if (!searchQuery) return customers;
    const q = searchQuery.toLowerCase();
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.phone && c.phone.includes(q))
    );
  }, [customers, searchQuery]);

  const filteredSuppliers = useMemo(() => {
    if (!searchQuery) return suppliers;
    const q = searchQuery.toLowerCase();
    return suppliers.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        (s.phone && s.phone.includes(q))
    );
  }, [suppliers, searchQuery]);

  const filteredExpenses = useMemo(() => {
    if (!searchQuery) return expenses;
    const q = searchQuery.toLowerCase();
    return expenses.filter(
      (e) =>
        e.category.toLowerCase().includes(q) ||
        (e.notes && e.notes.toLowerCase().includes(q))
    );
  }, [expenses, searchQuery]);

  // Tab definitions
  const adminTabs: Array<{ id: AdminTab; label: string; icon: React.FC<{ className?: string }>; count?: number }> = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'users', label: 'User Accounts', icon: Users, count: users.length },
    { id: 'products', label: 'Products', icon: Package, count: products.length },
    { id: 'sales', label: 'Sales & Bills', icon: ShoppingBag, count: sales.length },
    { id: 'purchases', label: 'Purchases', icon: Truck, count: purchases.length },
    { id: 'customers', label: 'Customers', icon: UserCheck, count: customers.length },
    { id: 'suppliers', label: 'Suppliers', icon: Building2, count: suppliers.length },
    { id: 'expenses', label: 'Expenses', icon: Receipt, count: expenses.length },
    { id: 'reports', label: 'System Reports', icon: TrendingUp },
  ];

  return (
    <div className="space-y-5 pb-20 max-w-6xl mx-auto">
      {/* Top Admin Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-emerald-950 to-slate-900 rounded-2xl p-5 text-white shadow-lg border border-emerald-800/40">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-extrabold uppercase tracking-wider border border-amber-500/30">
                  Global System Administrator
                </span>
                <span className="text-xs text-slate-400 font-mono hidden md:inline">
                  {firebaseUser?.email}
                </span>
              </div>
              <h1 className="text-2xl font-black tracking-tight text-white mt-0.5">
                Admin Control Center
              </h1>
              <p className="text-xs text-slate-300/80">
                Complete oversight of stores, shopkeeper accounts, inventory & ledger transactions
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => loadAdminData(true)}
              disabled={refreshing}
              className="px-3 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-all border border-slate-700 cursor-pointer disabled:opacity-50"
              title="Refresh all store metrics"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              <span>{refreshing ? 'Syncing...' : 'Sync All'}</span>
            </button>

            {onNavigateToUserStore && (
              <button
                onClick={() => onNavigateToUserStore('dashboard')}
                className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
                title="Switch to personal shopkeeper view"
              >
                <Store className="w-3.5 h-3.5" />
                <span>Shop View</span>
              </button>
            )}

            <button
              onClick={logout}
              className="px-3 py-2 rounded-xl bg-rose-900/40 hover:bg-rose-900/80 text-rose-300 text-xs font-semibold flex items-center gap-1.5 transition-all border border-rose-800/60 cursor-pointer"
              title="Sign out of Admin account"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </div>

      {/* Scope Filter & Global Search */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-xs border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* User Scope Dropdown */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-slate-400 shrink-0" />
          <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 whitespace-nowrap">
            Scope Store:
          </span>
          <select
            id="admin-store-filter-select"
            value={selectedUserFilter}
            onChange={(e) => setSelectedUserFilter(e.target.value)}
            className="w-full sm:w-64 px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="all">All Stores Across Platform ({users.length} Users)</option>
            {users.map((u) => (
              <option key={u.userId} value={u.userId}>
                {u.storeName || 'Kirana'} • {u.fullName} ({u.email})
              </option>
            ))}
          </select>
        </div>

        {/* Search Bar */}
        {activeAdminTab !== 'overview' && activeAdminTab !== 'reports' && (
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={`Search ${activeAdminTab}...`}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        )}
      </div>

      {/* Navigation Tabs Bar */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {adminTabs.map((t) => {
          const Icon = t.icon;
          const isActive = activeAdminTab === t.id;
          return (
            <button
              key={t.id}
              id={`admin-tab-btn-${t.id}`}
              onClick={() => {
                setActiveAdminTab(t.id);
                setSearchQuery('');
              }}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap flex items-center gap-2 transition-all cursor-pointer ${
                isActive
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{t.label}</span>
              {t.count !== undefined && (
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    isActive
                      ? 'bg-white/20 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {t.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Loading state indicator */}
      {loading ? (
        <div className="py-24 text-center text-slate-400">
          <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs font-semibold">Loading system registry data...</p>
        </div>
      ) : (
        <>
          {/* ========================================================
              TAB 1: OVERVIEW METRICS
             ======================================================== */}
          {activeAdminTab === 'overview' && (
            <div className="space-y-5 animate-in fade-in">
              {/* Top 4 KPI Metrics */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-xs">
                  <div className="flex items-center justify-between text-slate-500 mb-2">
                    <span className="text-xs font-semibold">Registered Stores</span>
                    <Users className="w-4 h-4 text-blue-500" />
                  </div>
                  <div className="text-2xl font-black text-slate-900 dark:text-white">
                    {stats.totalUsers}
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">Firebase user records</p>
                </div>

                <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-xs">
                  <div className="flex items-center justify-between text-slate-500 mb-2">
                    <span className="text-xs font-semibold">Total Platform Sales</span>
                    <TrendingUp className="w-4 h-4 text-emerald-500" />
                  </div>
                  <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                    ₹{stats.totalSalesRevenue.toLocaleString('en-IN')}
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">{stats.totalSales} total bills generated</p>
                </div>

                <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-xs">
                  <div className="flex items-center justify-between text-slate-500 mb-2">
                    <span className="text-xs font-semibold">Total Stock Purchases</span>
                    <Truck className="w-4 h-4 text-indigo-500" />
                  </div>
                  <div className="text-2xl font-black text-slate-900 dark:text-white">
                    ₹{stats.totalPurchasesCost.toLocaleString('en-IN')}
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">{stats.totalPurchases} vendor orders</p>
                </div>

                <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-xs">
                  <div className="flex items-center justify-between text-slate-500 mb-2">
                    <span className="text-xs font-semibold">Outstanding Khata</span>
                    <AlertTriangle className="w-4 h-4 text-amber-500" />
                  </div>
                  <div className="text-2xl font-black text-amber-600 dark:text-amber-400">
                    ₹{stats.totalCreditOutstanding.toLocaleString('en-IN')}
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">Customer receivables pending</p>
                </div>
              </div>

              {/* Breakdown Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-800">
                  <span className="text-xs text-slate-400 font-medium">Catalog Products</span>
                  <p className="text-lg font-bold text-slate-800 dark:text-slate-100">{stats.totalProducts}</p>
                </div>
                <div className="p-3.5 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-800">
                  <span className="text-xs text-slate-400 font-medium">Customer Directory</span>
                  <p className="text-lg font-bold text-slate-800 dark:text-slate-100">{stats.totalCustomers}</p>
                </div>
                <div className="p-3.5 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-800">
                  <span className="text-xs text-slate-400 font-medium">Suppliers / Vendors</span>
                  <p className="text-lg font-bold text-slate-800 dark:text-slate-100">{stats.totalSuppliers}</p>
                </div>
                <div className="p-3.5 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-800">
                  <span className="text-xs text-slate-400 font-medium">Recorded Expenses</span>
                  <p className="text-lg font-bold text-slate-800 dark:text-slate-100">
                    ₹{stats.totalExpensesAmount.toLocaleString('en-IN')}
                  </p>
                </div>
              </div>

              {/* Recent Activity Table */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      Recent Invoices Across Stores
                    </h3>
                    <p className="text-xs text-slate-400">Live transaction stream</p>
                  </div>
                  <button
                    onClick={() => setActiveAdminTab('sales')}
                    className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline"
                  >
                    View All Sales →
                  </button>
                </div>

                {sales.length === 0 ? (
                  <p className="text-xs text-slate-400 py-6 text-center">No sales recorded yet.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead className="text-slate-400 font-semibold border-b border-slate-100 dark:border-slate-800 pb-2">
                        <tr>
                          <th className="pb-2">Invoice #</th>
                          <th className="pb-2">Date</th>
                          <th className="pb-2">Customer</th>
                          <th className="pb-2">Items</th>
                          <th className="pb-2">Payment</th>
                          <th className="pb-2 text-right">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-slate-700 dark:text-slate-300">
                        {sales.slice(0, 6).map((s) => (
                          <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                            <td className="py-2.5 font-mono font-semibold text-slate-900 dark:text-white">
                              {s.invoiceNo}
                            </td>
                            <td className="py-2.5 text-slate-500">{new Date(s.date || s.createdAt).toLocaleDateString()}</td>
                            <td className="py-2.5">{s.customerName || 'Walk-in'}</td>
                            <td className="py-2.5">{s.items.length} items</td>
                            <td className="py-2.5">
                              <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 font-medium">
                                {s.paymentMethod}
                              </span>
                            </td>
                            <td className="py-2.5 text-right font-bold text-emerald-600 dark:text-emerald-400">
                              ₹{s.grandTotal.toLocaleString('en-IN')}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ========================================================
              TAB 2: USER MANAGEMENT
             ======================================================== */}
          {activeAdminTab === 'users' && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-4 animate-in fade-in">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Platform User Management ({filteredUsers.length})
                  </h3>
                  <p className="text-xs text-slate-400">
                    Registered storekeeper accounts stored in Firebase Authentication & Firestore
                  </p>
                </div>
                <div className="text-xs text-slate-500">
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                    {users.filter((u) => !u.disabled).length} Active
                  </span>{' '}
                  • {users.filter((u) => u.disabled).length} Disabled
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="text-slate-400 font-semibold border-b border-slate-100 dark:border-slate-800 pb-2">
                    <tr>
                      <th className="pb-2.5">Shopkeeper / Store</th>
                      <th className="pb-2.5">Email</th>
                      <th className="pb-2.5">Phone</th>
                      <th className="pb-2.5">Registered</th>
                      <th className="pb-2.5">Status</th>
                      <th className="pb-2.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                    {filteredUsers.map((u) => {
                      const isSelf = u.email.toLowerCase() === ADMIN_EMAIL.toLowerCase();
                      return (
                        <tr key={u.userId} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                          <td className="py-3">
                            <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                              <span>{u.fullName}</span>
                              {isSelf && (
                                <span className="px-1.5 py-0.2 bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 rounded text-[9px] font-extrabold uppercase">
                                  Admin
                                </span>
                              )}
                            </div>
                            <div className="text-slate-400 text-[11px]">{u.storeName || 'Kirana Store'}</div>
                          </td>
                          <td className="py-3 font-mono">{u.email}</td>
                          <td className="py-3 text-slate-500">{u.phone || '—'}</td>
                          <td className="py-3 text-slate-500">
                            {new Date(u.createdAt).toLocaleDateString()}
                          </td>
                          <td className="py-3">
                            {u.disabled ? (
                              <span className="px-2 py-0.5 bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300 rounded-full font-semibold text-[10px]">
                                Disabled
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 rounded-full font-semibold text-[10px]">
                                Active
                              </span>
                            )}
                          </td>
                          <td className="py-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {!isSelf && (
                                <>
                                  <button
                                    onClick={() => handleToggleDisableUser(u)}
                                    title={u.disabled ? 'Enable user' : 'Disable user'}
                                    className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                                      u.disabled
                                        ? 'border-emerald-300 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950'
                                        : 'border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
                                    }`}
                                  >
                                    {u.disabled ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                                  </button>
                                  <button
                                    onClick={() => handleDeleteUser(u)}
                                    title="Delete user profile"
                                    className="p-1.5 rounded-lg border border-rose-200 dark:border-rose-900/60 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors cursor-pointer"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ========================================================
              TAB 3: PRODUCTS CATALOG
             ======================================================== */}
          {activeAdminTab === 'products' && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-4 animate-in fade-in">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Platform Product Inventory ({filteredProducts.length})
                  </h3>
                  <p className="text-xs text-slate-400">All catalog items across shopkeeper databases</p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="text-slate-400 font-semibold border-b border-slate-100 dark:border-slate-800 pb-2">
                    <tr>
                      <th className="pb-2.5">Product Name</th>
                      <th className="pb-2.5">Category</th>
                      <th className="pb-2.5">Purchase Price</th>
                      <th className="pb-2.5">Selling Price</th>
                      <th className="pb-2.5">Stock</th>
                      <th className="pb-2.5">Barcode</th>
                      <th className="pb-2.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                    {filteredProducts.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td className="py-2.5">
                          <div className="font-bold text-slate-900 dark:text-white">{p.name}</div>
                          {p.brand && <div className="text-[11px] text-slate-400">{p.brand}</div>}
                        </td>
                        <td className="py-2.5">{p.category}</td>
                        <td className="py-2.5">₹{p.purchasePrice}</td>
                        <td className="py-2.5 font-bold text-emerald-600 dark:text-emerald-400">₹{p.sellingPrice}</td>
                        <td className="py-2.5">
                          <span
                            className={`px-2 py-0.5 rounded-full font-semibold text-[10px] ${
                              p.currentStock <= 0
                                ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                                : p.currentStock <= p.minStock
                                ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                            }`}
                          >
                            {p.currentStock} {p.unit}
                          </span>
                        </td>
                        <td className="py-2.5 font-mono text-slate-500">{p.barcode || '—'}</td>
                        <td className="py-2.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => setEditingProduct({ ...p })}
                              title="Edit product"
                              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteProduct(p)}
                              title="Delete product"
                              className="p-1.5 rounded-lg border border-rose-200 dark:border-rose-900/60 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ========================================================
              TAB 4: SALES MANAGEMENT
             ======================================================== */}
          {activeAdminTab === 'sales' && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-4 animate-in fade-in">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Sales & Invoices Management ({filteredSales.length})
                </h3>
                <p className="text-xs text-slate-400">All registered point-of-sale customer receipts</p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="text-slate-400 font-semibold border-b border-slate-100 dark:border-slate-800 pb-2">
                    <tr>
                      <th className="pb-2.5">Invoice #</th>
                      <th className="pb-2.5">Date</th>
                      <th className="pb-2.5">Customer</th>
                      <th className="pb-2.5">Items Count</th>
                      <th className="pb-2.5">Payment</th>
                      <th className="pb-2.5">Grand Total</th>
                      <th className="pb-2.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                    {filteredSales.map((s) => (
                      <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td className="py-2.5 font-mono font-bold text-slate-900 dark:text-white">{s.invoiceNo}</td>
                        <td className="py-2.5 text-slate-500">{new Date(s.date || s.createdAt).toLocaleDateString()}</td>
                        <td className="py-2.5">{s.customerName || 'Walk-in'}</td>
                        <td className="py-2.5">{s.items.length} items</td>
                        <td className="py-2.5">
                          <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 font-medium">
                            {s.paymentMethod}
                          </span>
                        </td>
                        <td className="py-2.5 font-bold text-emerald-600 dark:text-emerald-400">
                          ₹{s.grandTotal.toLocaleString('en-IN')}
                        </td>
                        <td className="py-2.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => setSelectedSaleDetails(s)}
                              title="View invoice details"
                              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteSale(s)}
                              title="Delete sale"
                              className="p-1.5 rounded-lg border border-rose-200 dark:border-rose-900/60 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ========================================================
              TAB 5: PURCHASES MANAGEMENT
             ======================================================== */}
          {activeAdminTab === 'purchases' && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-4 animate-in fade-in">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Stock Purchases & Inward Orders ({filteredPurchases.length})
                </h3>
                <p className="text-xs text-slate-400">Supplier inventory restocking records</p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="text-slate-400 font-semibold border-b border-slate-100 dark:border-slate-800 pb-2">
                    <tr>
                      <th className="pb-2.5">Date</th>
                      <th className="pb-2.5">Product</th>
                      <th className="pb-2.5">Supplier</th>
                      <th className="pb-2.5">Quantity</th>
                      <th className="pb-2.5">Total Cost</th>
                      <th className="pb-2.5">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                    {filteredPurchases.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td className="py-2.5 text-slate-500">{new Date(p.date || p.createdAt).toLocaleDateString()}</td>
                        <td className="py-2.5 font-bold text-slate-900 dark:text-white">{p.productName}</td>
                        <td className="py-2.5">{p.supplierName}</td>
                        <td className="py-2.5">{p.quantity} {p.unit}</td>
                        <td className="py-2.5 font-bold">₹{p.totalAmount.toLocaleString('en-IN')}</td>
                        <td className="py-2.5">
                          <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 text-[10px] font-semibold">
                            {p.paymentStatus}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ========================================================
              TAB 6: CUSTOMERS / KHATA DIRECTORY
             ======================================================== */}
          {activeAdminTab === 'customers' && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-4 animate-in fade-in">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Customer & Khata Ledger ({filteredCustomers.length})
                </h3>
                <p className="text-xs text-slate-400">Customer directory and outstanding credit balances</p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="text-slate-400 font-semibold border-b border-slate-100 dark:border-slate-800 pb-2">
                    <tr>
                      <th className="pb-2.5">Customer Name</th>
                      <th className="pb-2.5">Phone</th>
                      <th className="pb-2.5">Total Purchases</th>
                      <th className="pb-2.5">Paid Amount</th>
                      <th className="pb-2.5">Khata Due</th>
                      <th className="pb-2.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                    {filteredCustomers.map((c) => (
                      <tr key={c.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td className="py-2.5 font-bold text-slate-900 dark:text-white">{c.name}</td>
                        <td className="py-2.5 font-mono text-slate-500">{c.phone || '—'}</td>
                        <td className="py-2.5">₹{(c.totalPurchases || 0).toLocaleString('en-IN')}</td>
                        <td className="py-2.5">₹{(c.amountPaid || 0).toLocaleString('en-IN')}</td>
                        <td className="py-2.5">
                          <span
                            className={`font-bold ${
                              (c.creditBalance || 0) > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600'
                            }`}
                          >
                            ₹{(c.creditBalance || 0).toLocaleString('en-IN')}
                          </span>
                        </td>
                        <td className="py-2.5 text-right">
                          <button
                            onClick={() => handleDeleteCustomer(c)}
                            title="Delete customer"
                            className="p-1.5 rounded-lg border border-rose-200 dark:border-rose-900/60 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ========================================================
              TAB 7: SUPPLIERS DIRECTORY
             ======================================================== */}
          {activeAdminTab === 'suppliers' && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-4 animate-in fade-in">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Wholesalers & Suppliers ({filteredSuppliers.length})
                </h3>
                <p className="text-xs text-slate-400">Supplier records and vendor payables</p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="text-slate-400 font-semibold border-b border-slate-100 dark:border-slate-800 pb-2">
                    <tr>
                      <th className="pb-2.5">Supplier Name</th>
                      <th className="pb-2.5">Phone</th>
                      <th className="pb-2.5">Supplies</th>
                      <th className="pb-2.5">Outstanding Payable</th>
                      <th className="pb-2.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                    {filteredSuppliers.map((s) => (
                      <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td className="py-2.5 font-bold text-slate-900 dark:text-white">{s.name}</td>
                        <td className="py-2.5 font-mono text-slate-500">{s.phone || '—'}</td>
                        <td className="py-2.5 text-slate-500">{s.productsSupplied || 'General Goods'}</td>
                        <td className="py-2.5 font-bold text-amber-600 dark:text-amber-400">
                          ₹{(s.outstandingBalance || 0).toLocaleString('en-IN')}
                        </td>
                        <td className="py-2.5 text-right">
                          <button
                            onClick={() => handleDeleteSupplier(s)}
                            title="Delete supplier"
                            className="p-1.5 rounded-lg border border-rose-200 dark:border-rose-900/60 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ========================================================
              TAB 8: EXPENSES
             ======================================================== */}
          {activeAdminTab === 'expenses' && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-4 animate-in fade-in">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Store Operating Expenses ({filteredExpenses.length})
                </h3>
                <p className="text-xs text-slate-400">Shop rents, electricity, wages & miscellaneous bills</p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="text-slate-400 font-semibold border-b border-slate-100 dark:border-slate-800 pb-2">
                    <tr>
                      <th className="pb-2.5">Date</th>
                      <th className="pb-2.5">Category</th>
                      <th className="pb-2.5">Notes</th>
                      <th className="pb-2.5">Amount</th>
                      <th className="pb-2.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                    {filteredExpenses.map((e) => (
                      <tr key={e.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td className="py-2.5 text-slate-500">{new Date(e.date || e.createdAt).toLocaleDateString()}</td>
                        <td className="py-2.5 font-semibold text-slate-900 dark:text-white">{e.category}</td>
                        <td className="py-2.5 text-slate-400">{e.notes || '—'}</td>
                        <td className="py-2.5 font-bold text-rose-600 dark:text-rose-400">
                          ₹{(e.amount || 0).toLocaleString('en-IN')}
                        </td>
                        <td className="py-2.5 text-right">
                          <button
                            onClick={() => handleDeleteExpense(e)}
                            title="Delete expense"
                            className="p-1.5 rounded-lg border border-rose-200 dark:border-rose-900/60 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ========================================================
              TAB 9: REPORTS & SUMMARY
             ======================================================== */}
          {activeAdminTab === 'reports' && (
            <div className="space-y-4 animate-in fade-in">
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs">
                <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">
                  Global Financial Audit Summary
                </h3>
                <p className="text-xs text-slate-400 mb-4">
                  Aggregated financial ledger across all registered Kirana stores
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800">
                    <span className="text-xs font-semibold text-emerald-800 dark:text-emerald-300">
                      Total Sales Revenue
                    </span>
                    <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
                      ₹{stats.totalSalesRevenue.toLocaleString('en-IN')}
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700">
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Total Procurement Cost
                    </span>
                    <div className="text-2xl font-black text-slate-800 dark:text-slate-100 mt-1">
                      ₹{stats.totalPurchasesCost.toLocaleString('en-IN')}
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800">
                    <span className="text-xs font-semibold text-rose-800 dark:text-rose-300">
                      Total Operating Expenses
                    </span>
                    <div className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-1">
                      ₹{stats.totalExpensesAmount.toLocaleString('en-IN')}
                    </div>
                  </div>
                </div>

                <div className="mt-5 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs space-y-2">
                  <div className="flex justify-between items-center text-slate-600 dark:text-slate-300">
                    <span>Estimated Net Business Revenue (Sales - Purchases - Expenses):</span>
                    <span className="font-bold text-slate-900 dark:text-white">
                      ₹{(stats.totalSalesRevenue - stats.totalPurchasesCost - stats.totalExpensesAmount).toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-slate-600 dark:text-slate-300">
                    <span>Outstanding Customer Khata Receivables:</span>
                    <span className="font-bold text-amber-600 dark:text-amber-400">
                      ₹{stats.totalCreditOutstanding.toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* ========================================================
          MODAL: PRODUCT EDIT
         ======================================================== */}
      {editingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl p-5 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-base text-slate-900 dark:text-white">Edit Product (Admin)</h3>
              <button
                onClick={() => setEditingProduct(null)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProductEdit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  Product Name
                </label>
                <input
                  type="text"
                  value={editingProduct.name}
                  onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })}
                  required
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    Purchase Price (₹)
                  </label>
                  <input
                    type="number"
                    value={editingProduct.purchasePrice}
                    onChange={(e) =>
                      setEditingProduct({ ...editingProduct, purchasePrice: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    Selling Price (₹)
                  </label>
                  <input
                    type="number"
                    value={editingProduct.sellingPrice}
                    onChange={(e) =>
                      setEditingProduct({ ...editingProduct, sellingPrice: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    Current Stock
                  </label>
                  <input
                    type="number"
                    value={editingProduct.currentStock}
                    onChange={(e) =>
                      setEditingProduct({ ...editingProduct, currentStock: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    Barcode
                  </label>
                  <input
                    type="text"
                    value={editingProduct.barcode || ''}
                    onChange={(e) => setEditingProduct({ ...editingProduct, barcode: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setEditingProduct(null)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL: SALE DETAILS
         ======================================================== */}
      {selectedSaleDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl p-5 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="font-bold text-base text-slate-900 dark:text-white">
                  Invoice #{selectedSaleDetails.invoiceNo}
                </h3>
                <p className="text-xs text-slate-400">
                  {new Date(selectedSaleDetails.date || selectedSaleDetails.createdAt).toLocaleString()}
                </p>
              </div>
              <button
                onClick={() => setSelectedSaleDetails(null)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-400">Customer:</span>
                <span className="font-semibold">{selectedSaleDetails.customerName || 'Walk-in Customer'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Payment Mode:</span>
                <span className="font-semibold">{selectedSaleDetails.paymentMethod}</span>
              </div>
            </div>

            <div className="border-t border-b border-slate-100 dark:border-slate-800 py-3 space-y-2">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Items Sold:</span>
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {selectedSaleDetails.items.map((item, idx) => (
                  <div key={idx} className="flex justify-between text-xs">
                    <span>
                      {item.name} × {item.quantity} {item.unit}
                    </span>
                    <span className="font-medium">₹{item.total}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-between text-sm font-bold text-slate-900 dark:text-white pt-1">
              <span>Grand Total:</span>
              <span className="text-emerald-600 dark:text-emerald-400">
                ₹{selectedSaleDetails.grandTotal.toLocaleString('en-IN')}
              </span>
            </div>

            <div className="pt-2">
              <button
                onClick={() => setSelectedSaleDetails(null)}
                className="w-full py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
