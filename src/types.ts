export type UnitType = 'kg' | 'g' | 'litre' | 'ml' | 'piece' | 'packet' | 'box' | 'dozen';

export const STORE_CATEGORIES = [
  'All',
  'Grains & Pulses',
  'Oils & Ghee',
  'Spices & Masala',
  'Dairy & Bakery',
  'Snacks & Biscuits',
  'Beverages & Tea',
  'Personal Care',
  'Cleaning & Household',
  'Sugar & Salt',
  'Instant Food',
  'Pooja Items',
  'General',
] as const;

export const COMMON_EXPENSE_CATEGORIES = [
  'Electricity',
  'Shop Rent',
  'Transport & Freight',
  'Staff Salary',
  'Packaging Materials',
  'Shop Maintenance',
  'Tea & Refreshments',
  'Taxes & Municipal Fees',
  'Other Expenses',
];

export const EXPENSE_CATEGORIES = COMMON_EXPENSE_CATEGORIES;

export interface User {
  id: string; // Firebase UID
  userId?: string;
  name: string;
  fullName?: string;
  email: string;
  profilePhoto?: string | null;
  phone?: string;
  storeName?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface StoreSettings {
  storeName: string;
  address?: string;
  storeAddress?: string;
  phone?: string;
  invoicePrefix?: string;
  invoiceFooter?: string;
  invoiceFooterNote?: string;
  currency?: string;
  gstin?: string;
}

export interface Product {
  id: string;
  userId: string;
  name: string;
  category: string;
  brand: string;
  purchasePrice: number;
  sellingPrice: number;
  currentStock: number;
  unit: string;
  minStock: number;
  barcode: string;
  imageUrl: string;
  createdAt: string;
  updatedAt: string;
}

export interface SaleItem {
  productId: string;
  name: string;
  unit: string;
  quantity: number;
  purchasePrice: number;
  sellingPrice: number;
  total: number;
}

export interface Sale {
  id: string;
  userId: string;
  invoiceNo: string;
  date: string;
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
  items: SaleItem[];
  subtotal: number;
  discount: number;
  discountType: 'flat' | 'percentage';
  grandTotal: number;
  paymentMethod: 'Cash' | 'UPI' | 'Card' | 'Credit';
  notes?: string;
  createdAt: string;
}

export interface Purchase {
  id: string;
  userId: string;
  supplierId?: string;
  supplierName: string;
  productId: string;
  productName: string;
  quantity: number;
  unit: string;
  purchasePrice: number;
  totalAmount: number;
  date: string;
  paymentStatus: 'Paid' | 'Credit' | 'Partial';
  amountPaid: number;
  notes?: string;
  createdAt: string;
}

export interface Customer {
  id: string;
  userId: string;
  name: string;
  phone: string;
  address: string;
  totalPurchases: number;
  amountPaid: number;
  creditBalance: number;
  createdAt: string;
}

export interface Supplier {
  id: string;
  userId: string;
  name: string;
  phone: string;
  address: string;
  productsSupplied: string;
  totalPurchases: number;
  amountPaid: number;
  outstandingBalance: number;
  createdAt: string;
}

export interface UdhaarTransaction {
  id: string;
  userId: string;
  partyType: 'customer' | 'supplier';
  partyId: string;
  partyName: string;
  type: 'credit_given' | 'payment_received' | 'payable_added' | 'payment_made';
  amount: number;
  balanceAfter: number;
  date: string;
  notes?: string;
  createdAt: string;
}

export type CreditTransaction = UdhaarTransaction;

export interface Expense {
  id: string;
  userId: string;
  category: string;
  amount: number;
  date: string;
  notes?: string;
  createdAt: string;
}

export interface DashboardStats {
  todaySales: number;
  todayPurchases: number;
  todayGrossProfit: number;
  todayExpenses: number;
  todayProfit: number;
  totalProducts: number;
  lowStockProducts: number;
  outOfStockProducts: number;
  stockValue: number;
  totalCustomers: number;
  pendingPayments: number;
  supplierPayables: number;
  recentTransactions: Array<{
    id: string;
    type: 'sale' | 'purchase' | 'expense';
    title: string;
    subtitle: string;
    amount: number;
    date: string;
    isIncome: boolean;
  }>;
}

export interface ReportsData {
  summary: {
    totalSalesRevenue: number;
    totalPurchasesCost: number;
    totalGrossProfit: number;
    totalExpenses: number;
    totalNetProfit: number;
    totalOrders: number;
  };
  dailyTrend: Array<{
    date: string;
    sales: number;
    profit: number;
    purchases: number;
  }>;
  bestSellingProducts: Array<{
    name: string;
    quantity: number;
    revenue: number;
    unit: string;
  }>;
  lowStockList: Array<{
    id: string;
    name: string;
    currentStock: number;
    minStock: number;
    unit: string;
    status: string;
  }>;
  topDebtors: Customer[];
  topPayables: Supplier[];
  expensesByCategory: Array<{
    category: string;
    amount: number;
  }>;
}

export type ActiveTab =
  | 'dashboard'
  | 'products'
  | 'sales'
  | 'purchases'
  | 'more'
  // More items:
  | 'customers'
  | 'suppliers'
  | 'udhaar'
  | 'expenses'
  | 'reports'
  | 'settings';
