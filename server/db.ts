import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'kirana_store.json');

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  storeName: string;
  passwordHash: string;
  createdAt: string;
}

export interface StoreSettings {
  storeName: string;
  address: string;
  phone: string;
  invoicePrefix: string;
  invoiceFooter: string;
  currency: string;
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

export interface Expense {
  id: string;
  userId: string;
  category: string;
  amount: number;
  date: string;
  notes?: string;
  createdAt: string;
}

export interface DatabaseSchema {
  users: User[];
  settings: Record<string, StoreSettings>; // keyed by userId
  products: Product[];
  sales: Sale[];
  purchases: Purchase[];
  customers: Customer[];
  suppliers: Supplier[];
  udhaarTransactions: UdhaarTransaction[];
  expenses: Expense[];
}

const initialDb: DatabaseSchema = {
  users: [],
  settings: {},
  products: [],
  sales: [],
  purchases: [],
  customers: [],
  suppliers: [],
  udhaarTransactions: [],
  expenses: [],
};

// Ensure data folder and file exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function loadDb(): DatabaseSchema {
  try {
    if (!fs.existsSync(DB_FILE)) {
      fs.writeFileSync(DB_FILE, JSON.stringify(initialDb, null, 2), 'utf-8');
      return { ...initialDb };
    }
    const data = fs.readFileSync(DB_FILE, 'utf-8');
    const parsed = JSON.parse(data);
    return {
      users: parsed.users || [],
      settings: parsed.settings || {},
      products: parsed.products || [],
      sales: parsed.sales || [],
      purchases: parsed.purchases || [],
      customers: parsed.customers || [],
      suppliers: parsed.suppliers || [],
      udhaarTransactions: parsed.udhaarTransactions || [],
      expenses: parsed.expenses || [],
    };
  } catch (err) {
    console.error('Error reading database, creating new:', err);
    return { ...initialDb };
  }
}

function saveDb(data: DatabaseSchema): void {
  try {
    const tempFile = `${DB_FILE}.tmp`;
    fs.writeFileSync(tempFile, JSON.stringify(data, null, 2), 'utf-8');
    fs.renameSync(tempFile, DB_FILE);
  } catch (err) {
    console.error('Error writing database:', err);
  }
}

export const db = {
  get: loadDb,
  save: saveDb,
};
