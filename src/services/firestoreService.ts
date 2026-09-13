import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  writeBatch,
} from 'firebase/firestore';
import { db, auth } from '../lib/firebase.js';
import {
  Product,
  Sale,
  Purchase,
  Customer,
  Supplier,
  Expense,
  UdhaarTransaction,
  StoreSettings,
  DashboardStats,
  ReportsData,
  RegisteredUser,
  AdminOverviewStats,
} from '../types.js';

function getUid(): string {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('User not authenticated. Please log in.');
  }
  return user.uid;
}

// ==================== USER PROFILE ====================

export interface UserProfileDoc {
  userId: string;
  fullName: string;
  email: string;
  profilePhoto: string | null;
  phone?: string;
  storeName?: string;
  createdAt: string;
  updatedAt: string;
}

export async function getUserProfile(uid: string): Promise<UserProfileDoc | null> {
  try {
    const ref = doc(db, 'users', uid);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      return snap.data() as UserProfileDoc;
    }
    return null;
  } catch (err) {
    console.error('Error getting user profile:', err);
    return null;
  }
}

export async function saveUserProfile(
  uid: string,
  data: Partial<UserProfileDoc>
): Promise<UserProfileDoc> {
  const existing = await getUserProfile(uid);
  const now = new Date().toISOString();

  const profile: UserProfileDoc = {
    userId: uid,
    fullName: data.fullName || existing?.fullName || 'Shopkeeper',
    email: data.email || existing?.email || '',
    profilePhoto: data.profilePhoto !== undefined ? data.profilePhoto : existing?.profilePhoto || null,
    phone: data.phone || existing?.phone || '',
    storeName: data.storeName || existing?.storeName || 'My Kirana Store',
    createdAt: existing?.createdAt || now,
    updatedAt: now,
  };

  const ref = doc(db, 'users', uid);
  await setDoc(ref, profile, { merge: true });
  return profile;
}

// ==================== STORE SETTINGS ====================

export async function getStoreSettings(uid?: string): Promise<StoreSettings> {
  const targetUid = uid || getUid();
  const defaultSettings: StoreSettings = {
    storeName: 'My Kirana Store',
    address: 'Main Market, Kirana Bazaar',
    phone: '',
    invoicePrefix: 'INV',
    invoiceFooter: 'Thank you for shopping with us! Please visit again.',
    currency: '₹',
    gstin: '',
  };

  try {
    const ref = doc(db, 'stores', targetUid, 'settings', 'profile');
    const snap = await getDoc(ref);
    if (snap.exists()) {
      return { ...defaultSettings, ...snap.data() } as StoreSettings;
    }
    // Initialize if absent
    await setDoc(ref, defaultSettings);
    return defaultSettings;
  } catch (err) {
    console.error('Error getting store settings:', err);
    return defaultSettings;
  }
}

export async function updateStoreSettings(newSettings: Partial<StoreSettings>): Promise<StoreSettings> {
  const uid = getUid();
  const ref = doc(db, 'stores', uid, 'settings', 'profile');
  const current = await getStoreSettings(uid);
  const updated = { ...current, ...newSettings };
  await setDoc(ref, updated, { merge: true });

  // If storeName updated, also sync user profile
  if (newSettings.storeName) {
    await setDoc(doc(db, 'users', uid), { storeName: newSettings.storeName, updatedAt: new Date().toISOString() }, { merge: true });
  }

  return updated;
}

// Default Kirana Starter Products
const DEFAULT_STARTER_PRODUCTS: Omit<Product, 'id' | 'userId' | 'createdAt' | 'updatedAt'>[] = [
  { name: 'Aashirvaad Shudh Chakki Atta (5kg)', category: 'Grains & Pulses', brand: 'Aashirvaad', purchasePrice: 210, sellingPrice: 245, currentStock: 25, unit: 'packet', minStock: 5, barcode: '890103000001', imageUrl: '' },
  { name: 'India Gate Basmati Rice Feast Rozzana (1kg)', category: 'Grains & Pulses', brand: 'India Gate', purchasePrice: 82, sellingPrice: 98, currentStock: 30, unit: 'packet', minStock: 8, barcode: '890103000002', imageUrl: '' },
  { name: 'Toor Dal Desi Premium (1kg)', category: 'Grains & Pulses', brand: 'Loose Desi', purchasePrice: 135, sellingPrice: 155, currentStock: 40, unit: 'kg', minStock: 10, barcode: '890103000003', imageUrl: '' },
  { name: 'Fortune Sunlite Sunflower Oil (1L)', category: 'Oils & Ghee', brand: 'Fortune', purchasePrice: 118, sellingPrice: 135, currentStock: 35, unit: 'litre', minStock: 6, barcode: '890103000004', imageUrl: '' },
  { name: 'Amul Butter Salted (100g)', category: 'Dairy & Bakery', brand: 'Amul', purchasePrice: 52, sellingPrice: 58, currentStock: 50, unit: 'piece', minStock: 12, barcode: '890103000005', imageUrl: '' },
  { name: 'Tata Salt Vacuum Evaporated (1kg)', category: 'Sugar & Salt', brand: 'Tata', purchasePrice: 24, sellingPrice: 28, currentStock: 60, unit: 'packet', minStock: 15, barcode: '890103000006', imageUrl: '' },
  { name: 'Madhur Pure & Hygienic Sugar (1kg)', category: 'Sugar & Salt', brand: 'Madhur', purchasePrice: 44, sellingPrice: 50, currentStock: 45, unit: 'kg', minStock: 10, barcode: '890103000007', imageUrl: '' },
  { name: 'Parle-G Original Gluco Biscuits (800g pack)', category: 'Snacks & Biscuits', brand: 'Parle', purchasePrice: 68, sellingPrice: 80, currentStock: 40, unit: 'packet', minStock: 10, barcode: '890103000008', imageUrl: '' },
  { name: 'Maggi 2-Minute Masala Noodles (70g)', category: 'Instant Food', brand: 'Nestle Maggi', purchasePrice: 12, sellingPrice: 14, currentStock: 80, unit: 'piece', minStock: 20, barcode: '890103000009', imageUrl: '' },
  { name: 'Red Label Strong Blend Tea (500g)', category: 'Beverages & Tea', brand: 'Brooke Bond', purchasePrice: 240, sellingPrice: 275, currentStock: 20, unit: 'packet', minStock: 5, barcode: '890103000010', imageUrl: '' },
];

export async function seedStarterProductsIfEmpty(uid: string): Promise<void> {
  try {
    const productsRef = collection(db, 'stores', uid, 'products');
    const snap = await getDocs(productsRef);
    if (snap.empty) {
      const batch = writeBatch(db);
      const now = new Date().toISOString();
      for (const item of DEFAULT_STARTER_PRODUCTS) {
        const prodId = 'prod_' + Math.random().toString(36).substring(2, 9);
        const ref = doc(db, 'stores', uid, 'products', prodId);
        batch.set(ref, {
          ...item,
          id: prodId,
          userId: uid,
          createdAt: now,
          updatedAt: now,
        });
      }
      await batch.commit();
    }
  } catch (err) {
    console.error('Error seeding starter products:', err);
  }
}

// ==================== PRODUCTS ====================

export async function getProducts(params?: { search?: string; category?: string; filter?: string }): Promise<Product[]> {
  const uid = getUid();
  const productsRef = collection(db, 'stores', uid, 'products');
  const snap = await getDocs(productsRef);
  let list = snap.docs.map((d) => d.data() as Product);

  // If newly created user with no products, seed starter products
  if (list.length === 0 && !params?.search && !params?.category) {
    await seedStarterProductsIfEmpty(uid);
    const refreshedSnap = await getDocs(productsRef);
    list = refreshedSnap.docs.map((d) => d.data() as Product);
  }

  // Filter in memory for maximum search flexibility
  if (params?.search) {
    const s = params.search.toLowerCase().trim();
    list = list.filter(
      (p) =>
        p.name.toLowerCase().includes(s) ||
        (p.barcode && p.barcode.includes(s)) ||
        (p.brand && p.brand.toLowerCase().includes(s))
    );
  }

  if (params?.category && params.category !== 'All') {
    list = list.filter((p) => p.category === params.category);
  }

  if (params?.filter === 'low_stock') {
    list = list.filter((p) => p.currentStock <= p.minStock && p.currentStock > 0);
  } else if (params?.filter === 'out_of_stock') {
    list = list.filter((p) => p.currentStock <= 0);
  }

  list.sort((a, b) => a.name.localeCompare(b.name));
  return list;
}

export async function createProduct(data: Omit<Product, 'id' | 'userId' | 'createdAt' | 'updatedAt'>): Promise<Product> {
  const uid = getUid();
  const id = 'prod_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
  const now = new Date().toISOString();

  const product: Product = {
    ...data,
    id,
    userId: uid,
    purchasePrice: Number(data.purchasePrice) || 0,
    sellingPrice: Number(data.sellingPrice) || 0,
    currentStock: Number(data.currentStock) || 0,
    minStock: Number(data.minStock) || 5,
    barcode: data.barcode || '',
    brand: data.brand || '',
    imageUrl: data.imageUrl || '',
    createdAt: now,
    updatedAt: now,
  };

  const ref = doc(db, 'stores', uid, 'products', id);
  await setDoc(ref, product);
  return product;
}

export async function updateProduct(id: string, updates: Partial<Product>): Promise<Product> {
  const uid = getUid();
  const ref = doc(db, 'stores', uid, 'products', id);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    throw new Error('Product not found');
  }

  const existing = snap.data() as Product;
  const updated: Product = {
    ...existing,
    ...updates,
    purchasePrice: updates.purchasePrice !== undefined ? Number(updates.purchasePrice) : existing.purchasePrice,
    sellingPrice: updates.sellingPrice !== undefined ? Number(updates.sellingPrice) : existing.sellingPrice,
    currentStock: updates.currentStock !== undefined ? Number(updates.currentStock) : existing.currentStock,
    minStock: updates.minStock !== undefined ? Number(updates.minStock) : existing.minStock,
    updatedAt: new Date().toISOString(),
  };

  await setDoc(ref, updated, { merge: true });
  return updated;
}

export async function deleteProduct(id: string): Promise<void> {
  const uid = getUid();
  const ref = doc(db, 'stores', uid, 'products', id);
  await deleteDoc(ref);
}

// ==================== SALES ====================

export async function getSales(): Promise<Sale[]> {
  const uid = getUid();
  const ref = collection(db, 'stores', uid, 'sales');
  const snap = await getDocs(ref);
  const sales = snap.docs.map((d) => d.data() as Sale);
  sales.sort((a, b) => new Date(b.date || b.createdAt).getTime() - new Date(a.date || a.createdAt).getTime());
  return sales;
}

export async function getSaleById(id: string): Promise<Sale | null> {
  const uid = getUid();
  const ref = doc(db, 'stores', uid, 'sales', id);
  const snap = await getDoc(ref);
  if (snap.exists()) {
    return snap.data() as Sale;
  }
  return null;
}

export async function createSale(data: {
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
  items: Array<{ productId: string; name: string; unit: string; quantity: number; purchasePrice: number; sellingPrice: number; total: number }>;
  discount?: number;
  discountType?: 'flat' | 'percentage';
  paymentMethod: 'Cash' | 'UPI' | 'Card' | 'Credit';
  notes?: string;
}): Promise<Sale> {
  const uid = getUid();
  const id = 'sale_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
  const now = new Date().toISOString();

  // Calculate totals
  const subtotal = data.items.reduce((sum, item) => sum + item.total, 0);
  const discountVal = Number(data.discount) || 0;
  const discountType = data.discountType || 'flat';
  let grandTotal = subtotal;

  if (discountType === 'percentage') {
    grandTotal = subtotal - (subtotal * discountVal) / 100;
  } else {
    grandTotal = Math.max(0, subtotal - discountVal);
  }

  // Invoice Number
  const settings = await getStoreSettings(uid);
  const prefix = settings.invoicePrefix || 'INV';
  const invoiceNo = `${prefix}-${Date.now().toString().slice(-6)}`;

  const sale: Sale = {
    id,
    userId: uid,
    invoiceNo,
    date: now,
    customerId: data.customerId || '',
    customerName: data.customerName || (data.customerId ? '' : 'Walk-in Customer'),
    customerPhone: data.customerPhone || '',
    items: data.items,
    subtotal,
    discount: discountVal,
    discountType,
    grandTotal,
    paymentMethod: data.paymentMethod,
    notes: data.notes || '',
    createdAt: now,
  };

  const batch = writeBatch(db);

  // 1. Save Sale doc
  const saleRef = doc(db, 'stores', uid, 'sales', id);
  batch.set(saleRef, sale);

  // 2. Decrement stock for sold products
  for (const item of data.items) {
    if (item.productId) {
      const prodRef = doc(db, 'stores', uid, 'products', item.productId);
      const prodSnap = await getDoc(prodRef);
      if (prodSnap.exists()) {
        const currentStock = prodSnap.data().currentStock || 0;
        const newStock = Math.max(0, currentStock - Number(item.quantity));
        batch.update(prodRef, { currentStock: newStock, updatedAt: now });
      }
    }
  }

  // 3. If credit sale, update Customer creditBalance & record transaction
  if (data.paymentMethod === 'Credit' && data.customerId) {
    const custRef = doc(db, 'stores', uid, 'customers', data.customerId);
    const custSnap = await getDoc(custRef);
    if (custSnap.exists()) {
      const custData = custSnap.data() as Customer;
      const newCreditBalance = (custData.creditBalance || 0) + grandTotal;
      const totalPurchases = (custData.totalPurchases || 0) + grandTotal;
      batch.update(custRef, {
        creditBalance: newCreditBalance,
        totalPurchases,
      });

      // Credit transaction log
      const txId = 'tx_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
      const txRef = doc(db, 'stores', uid, 'creditTransactions', txId);
      const tx: UdhaarTransaction = {
        id: txId,
        userId: uid,
        partyType: 'customer',
        partyId: data.customerId,
        partyName: custData.name,
        type: 'credit_given',
        amount: grandTotal,
        balanceAfter: newCreditBalance,
        date: now,
        notes: `Bill #${invoiceNo}`,
        createdAt: now,
      };
      batch.set(txRef, tx);
    }
  }

  await batch.commit();
  return sale;
}

// ==================== PURCHASES ====================

export async function getPurchases(): Promise<Purchase[]> {
  const uid = getUid();
  const ref = collection(db, 'stores', uid, 'purchases');
  const snap = await getDocs(ref);
  const purchases = snap.docs.map((d) => d.data() as Purchase);
  purchases.sort((a, b) => new Date(b.date || b.createdAt).getTime() - new Date(a.date || a.createdAt).getTime());
  return purchases;
}

export async function createPurchase(data: {
  supplierId?: string;
  supplierName: string;
  productId: string;
  productName: string;
  quantity: number;
  unit: string;
  purchasePrice: number;
  totalAmount: number;
  date?: string;
  paymentStatus: 'Paid' | 'Credit' | 'Partial';
  amountPaid: number;
  notes?: string;
}): Promise<Purchase> {
  const uid = getUid();
  const id = 'purch_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
  const now = new Date().toISOString();

  const purchase: Purchase = {
    id,
    userId: uid,
    supplierId: data.supplierId || '',
    supplierName: data.supplierName || 'General Distributor',
    productId: data.productId,
    productName: data.productName,
    quantity: Number(data.quantity) || 0,
    unit: data.unit,
    purchasePrice: Number(data.purchasePrice) || 0,
    totalAmount: Number(data.totalAmount) || 0,
    date: data.date || now,
    paymentStatus: data.paymentStatus,
    amountPaid: Number(data.amountPaid) || 0,
    notes: data.notes || '',
    createdAt: now,
  };

  const batch = writeBatch(db);

  // 1. Save purchase doc
  const purchRef = doc(db, 'stores', uid, 'purchases', id);
  batch.set(purchRef, purchase);

  // 2. Increment stock of the purchased product
  if (data.productId) {
    const prodRef = doc(db, 'stores', uid, 'products', data.productId);
    const prodSnap = await getDoc(prodRef);
    if (prodSnap.exists()) {
      const cur = prodSnap.data().currentStock || 0;
      batch.update(prodRef, {
        currentStock: cur + purchase.quantity,
        purchasePrice: purchase.purchasePrice,
        updatedAt: now,
      });
    }
  }

  // 3. Update supplier balance if Credit or Partial
  if (data.supplierId && (data.paymentStatus === 'Credit' || data.paymentStatus === 'Partial')) {
    const remaining = purchase.totalAmount - purchase.amountPaid;
    if (remaining > 0) {
      const supRef = doc(db, 'stores', uid, 'suppliers', data.supplierId);
      const supSnap = await getDoc(supRef);
      if (supSnap.exists()) {
        const supData = supSnap.data() as Supplier;
        const newBalance = (supData.outstandingBalance || 0) + remaining;
        batch.update(supRef, {
          outstandingBalance: newBalance,
          totalPurchases: (supData.totalPurchases || 0) + purchase.totalAmount,
          amountPaid: (supData.amountPaid || 0) + purchase.amountPaid,
        });

        // Log transaction
        const txId = 'tx_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
        const txRef = doc(db, 'stores', uid, 'creditTransactions', txId);
        const tx: UdhaarTransaction = {
          id: txId,
          userId: uid,
          partyType: 'supplier',
          partyId: data.supplierId,
          partyName: supData.name,
          type: 'payable_added',
          amount: remaining,
          balanceAfter: newBalance,
          date: now,
          notes: `Stock Purchase: ${purchase.productName}`,
          createdAt: now,
        };
        batch.set(txRef, tx);
      }
    }
  }

  await batch.commit();
  return purchase;
}

// ==================== CUSTOMERS ====================

export async function getCustomers(): Promise<Customer[]> {
  const uid = getUid();
  const ref = collection(db, 'stores', uid, 'customers');
  const snap = await getDocs(ref);
  const customers = snap.docs.map((d) => d.data() as Customer);
  customers.sort((a, b) => a.name.localeCompare(b.name));
  return customers;
}

export async function createCustomer(data: Omit<Customer, 'id' | 'userId' | 'createdAt'>): Promise<Customer> {
  const uid = getUid();
  const id = 'cust_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
  const now = new Date().toISOString();

  const customer: Customer = {
    ...data,
    id,
    userId: uid,
    totalPurchases: Number(data.totalPurchases) || 0,
    amountPaid: Number(data.amountPaid) || 0,
    creditBalance: Number(data.creditBalance) || 0,
    createdAt: now,
  };

  const ref = doc(db, 'stores', uid, 'customers', id);
  await setDoc(ref, customer);
  return customer;
}

export async function updateCustomer(id: string, data: Partial<Customer>): Promise<Customer> {
  const uid = getUid();
  const ref = doc(db, 'stores', uid, 'customers', id);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    throw new Error('Customer not found');
  }

  const existing = snap.data() as Customer;
  const updated: Customer = {
    ...existing,
    ...data,
    creditBalance: data.creditBalance !== undefined ? Number(data.creditBalance) : existing.creditBalance,
    totalPurchases: data.totalPurchases !== undefined ? Number(data.totalPurchases) : existing.totalPurchases,
    amountPaid: data.amountPaid !== undefined ? Number(data.amountPaid) : existing.amountPaid,
  };

  await setDoc(ref, updated, { merge: true });
  return updated;
}

export async function deleteCustomer(id: string): Promise<void> {
  const uid = getUid();
  const ref = doc(db, 'stores', uid, 'customers', id);
  await deleteDoc(ref);
}

export async function addCustomerPayment(id: string, body: { amount: number; notes?: string }): Promise<Customer> {
  const uid = getUid();
  const ref = doc(db, 'stores', uid, 'customers', id);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    throw new Error('Customer not found');
  }

  const customer = snap.data() as Customer;
  const payAmount = Number(body.amount) || 0;
  const newCreditBalance = Math.max(0, (customer.creditBalance || 0) - payAmount);
  const newAmountPaid = (customer.amountPaid || 0) + payAmount;
  const now = new Date().toISOString();

  const batch = writeBatch(db);
  batch.update(ref, {
    creditBalance: newCreditBalance,
    amountPaid: newAmountPaid,
  });

  // Record Khata transaction
  const txId = 'tx_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
  const txRef = doc(db, 'stores', uid, 'creditTransactions', txId);
  const tx: UdhaarTransaction = {
    id: txId,
    userId: uid,
    partyType: 'customer',
    partyId: customer.id,
    partyName: customer.name,
    type: 'payment_received',
    amount: payAmount,
    balanceAfter: newCreditBalance,
    date: now,
    notes: body.notes || 'Payment Received',
    createdAt: now,
  };
  batch.set(txRef, tx);

  await batch.commit();
  return { ...customer, creditBalance: newCreditBalance, amountPaid: newAmountPaid };
}

export async function addCustomerCredit(id: string, body: { amount: number; notes?: string }): Promise<Customer> {
  const uid = getUid();
  const ref = doc(db, 'stores', uid, 'customers', id);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    throw new Error('Customer not found');
  }

  const customer = snap.data() as Customer;
  const creditAmount = Number(body.amount) || 0;
  const newCreditBalance = (customer.creditBalance || 0) + creditAmount;
  const newTotalPurchases = (customer.totalPurchases || 0) + creditAmount;
  const now = new Date().toISOString();

  const batch = writeBatch(db);
  batch.update(ref, {
    creditBalance: newCreditBalance,
    totalPurchases: newTotalPurchases,
  });

  const txId = 'tx_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
  const txRef = doc(db, 'stores', uid, 'creditTransactions', txId);
  const tx: UdhaarTransaction = {
    id: txId,
    userId: uid,
    partyType: 'customer',
    partyId: customer.id,
    partyName: customer.name,
    type: 'credit_given',
    amount: creditAmount,
    balanceAfter: newCreditBalance,
    date: now,
    notes: body.notes || 'Manual Credit added',
    createdAt: now,
  };
  batch.set(txRef, tx);

  await batch.commit();
  return { ...customer, creditBalance: newCreditBalance, totalPurchases: newTotalPurchases };
}

// ==================== SUPPLIERS ====================

export async function getSuppliers(): Promise<Supplier[]> {
  const uid = getUid();
  const ref = collection(db, 'stores', uid, 'suppliers');
  const snap = await getDocs(ref);
  const suppliers = snap.docs.map((d) => d.data() as Supplier);
  suppliers.sort((a, b) => a.name.localeCompare(b.name));
  return suppliers;
}

export async function createSupplier(data: Omit<Supplier, 'id' | 'userId' | 'createdAt'>): Promise<Supplier> {
  const uid = getUid();
  const id = 'sup_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
  const now = new Date().toISOString();

  const supplier: Supplier = {
    ...data,
    id,
    userId: uid,
    totalPurchases: Number(data.totalPurchases) || 0,
    amountPaid: Number(data.amountPaid) || 0,
    outstandingBalance: Number(data.outstandingBalance) || 0,
    createdAt: now,
  };

  const ref = doc(db, 'stores', uid, 'suppliers', id);
  await setDoc(ref, supplier);
  return supplier;
}

export async function updateSupplier(id: string, data: Partial<Supplier>): Promise<Supplier> {
  const uid = getUid();
  const ref = doc(db, 'stores', uid, 'suppliers', id);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    throw new Error('Supplier not found');
  }

  const existing = snap.data() as Supplier;
  const updated: Supplier = {
    ...existing,
    ...data,
    outstandingBalance: data.outstandingBalance !== undefined ? Number(data.outstandingBalance) : existing.outstandingBalance,
    totalPurchases: data.totalPurchases !== undefined ? Number(data.totalPurchases) : existing.totalPurchases,
    amountPaid: data.amountPaid !== undefined ? Number(data.amountPaid) : existing.amountPaid,
  };

  await setDoc(ref, updated, { merge: true });
  return updated;
}

export async function deleteSupplier(id: string): Promise<void> {
  const uid = getUid();
  const ref = doc(db, 'stores', uid, 'suppliers', id);
  await deleteDoc(ref);
}

export async function addSupplierPayment(id: string, body: { amount: number; notes?: string }): Promise<Supplier> {
  const uid = getUid();
  const ref = doc(db, 'stores', uid, 'suppliers', id);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    throw new Error('Supplier not found');
  }

  const supplier = snap.data() as Supplier;
  const payAmount = Number(body.amount) || 0;
  const newOutstanding = Math.max(0, (supplier.outstandingBalance || 0) - payAmount);
  const newAmountPaid = (supplier.amountPaid || 0) + payAmount;
  const now = new Date().toISOString();

  const batch = writeBatch(db);
  batch.update(ref, {
    outstandingBalance: newOutstanding,
    amountPaid: newAmountPaid,
  });

  // Log transaction
  const txId = 'tx_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
  const txRef = doc(db, 'stores', uid, 'creditTransactions', txId);
  const tx: UdhaarTransaction = {
    id: txId,
    userId: uid,
    partyType: 'supplier',
    partyId: supplier.id,
    partyName: supplier.name,
    type: 'payment_made',
    amount: payAmount,
    balanceAfter: newOutstanding,
    date: now,
    notes: body.notes || 'Payment Made to Supplier',
    createdAt: now,
  };
  batch.set(txRef, tx);

  await batch.commit();
  return { ...supplier, outstandingBalance: newOutstanding, amountPaid: newAmountPaid };
}

// ==================== UDHAAR & KHATA ====================

export async function getUdhaarTransactions(partyType?: string): Promise<UdhaarTransaction[]> {
  const uid = getUid();
  const ref = collection(db, 'stores', uid, 'creditTransactions');
  const snap = await getDocs(ref);
  let list = snap.docs.map((d) => d.data() as UdhaarTransaction);

  if (partyType) {
    list = list.filter((t) => t.partyType === partyType);
  }

  list.sort((a, b) => new Date(b.date || b.createdAt).getTime() - new Date(a.date || a.createdAt).getTime());
  return list;
}

// ==================== EXPENSES ====================

export async function getExpenses(): Promise<Expense[]> {
  const uid = getUid();
  const ref = collection(db, 'stores', uid, 'expenses');
  const snap = await getDocs(ref);
  const list = snap.docs.map((d) => d.data() as Expense);
  list.sort((a, b) => new Date(b.date || b.createdAt).getTime() - new Date(a.date || a.createdAt).getTime());
  return list;
}

export async function createExpense(data: { category: string; amount: number; date?: string; notes?: string }): Promise<Expense> {
  const uid = getUid();
  const id = 'exp_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
  const now = new Date().toISOString();

  const expense: Expense = {
    id,
    userId: uid,
    category: data.category,
    amount: Number(data.amount) || 0,
    date: data.date || now,
    notes: data.notes || '',
    createdAt: now,
  };

  const ref = doc(db, 'stores', uid, 'expenses', id);
  await setDoc(ref, expense);
  return expense;
}

export async function deleteExpense(id: string): Promise<void> {
  const uid = getUid();
  const ref = doc(db, 'stores', uid, 'expenses', id);
  await deleteDoc(ref);
}

// ==================== DASHBOARD STATS ====================

export async function getDashboardStats(): Promise<DashboardStats> {
  const uid = getUid();

  const [products, sales, purchases, customers, suppliers, expenses] = await Promise.all([
    getProducts(),
    getSales(),
    getPurchases(),
    getCustomers(),
    getSuppliers(),
    getExpenses(),
  ]);

  const todayStr = new Date().toISOString().split('T')[0];

  const todaySalesList = sales.filter((s) => s.date?.startsWith(todayStr));
  const todayPurchasesList = purchases.filter((p) => p.date?.startsWith(todayStr));
  const todayExpensesList = expenses.filter((e) => e.date?.startsWith(todayStr));

  const todaySales = todaySalesList.reduce((sum, s) => sum + (s.grandTotal || 0), 0);
  const todayPurchases = todayPurchasesList.reduce((sum, p) => sum + (p.totalAmount || 0), 0);
  const todayExpenses = todayExpensesList.reduce((sum, e) => sum + (e.amount || 0), 0);

  // Today Gross Profit = Today revenue - estimated cost of goods sold
  let todayCOGS = 0;
  for (const s of todaySalesList) {
    for (const item of s.items) {
      todayCOGS += (item.purchasePrice || 0) * (item.quantity || 0);
    }
  }
  const todayGrossProfit = Math.max(0, todaySales - todayCOGS);
  const todayProfit = todayGrossProfit - todayExpenses;

  const lowStockProducts = products.filter((p) => p.currentStock <= p.minStock && p.currentStock > 0).length;
  const outOfStockProducts = products.filter((p) => p.currentStock <= 0).length;
  const stockValue = products.reduce((sum, p) => sum + (p.purchasePrice || 0) * (p.currentStock || 0), 0);

  const pendingPayments = customers.reduce((sum, c) => sum + (c.creditBalance || 0), 0);
  const supplierPayables = suppliers.reduce((sum, s) => sum + (s.outstandingBalance || 0), 0);

  // Recent transactions list
  const recentTransactions: DashboardStats['recentTransactions'] = [];

  sales.slice(0, 5).forEach((s) => {
    recentTransactions.push({
      id: s.id,
      type: 'sale',
      title: `Sale #${s.invoiceNo}`,
      subtitle: `${s.customerName || 'Walk-in'} • ${s.paymentMethod}`,
      amount: s.grandTotal,
      date: s.date || s.createdAt,
      isIncome: true,
    });
  });

  purchases.slice(0, 3).forEach((p) => {
    recentTransactions.push({
      id: p.id,
      type: 'purchase',
      title: `Purchase: ${p.productName}`,
      subtitle: `${p.supplierName} • Qty: ${p.quantity} ${p.unit}`,
      amount: p.totalAmount,
      date: p.date || p.createdAt,
      isIncome: false,
    });
  });

  expenses.slice(0, 3).forEach((e) => {
    recentTransactions.push({
      id: e.id,
      type: 'expense',
      title: `Expense: ${e.category}`,
      subtitle: e.notes || 'Shop Expense',
      amount: e.amount,
      date: e.date || e.createdAt,
      isIncome: false,
    });
  });

  recentTransactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return {
    todaySales,
    todayPurchases,
    todayGrossProfit,
    todayExpenses,
    todayProfit,
    totalProducts: products.length,
    lowStockProducts,
    outOfStockProducts,
    stockValue,
    totalCustomers: customers.length,
    pendingPayments,
    supplierPayables,
    recentTransactions: recentTransactions.slice(0, 8),
  };
}

// ==================== REPORTS DATA ====================

export async function getReportsData(): Promise<ReportsData> {
  const [products, sales, purchases, customers, suppliers, expenses] = await Promise.all([
    getProducts(),
    getSales(),
    getPurchases(),
    getCustomers(),
    getSuppliers(),
    getExpenses(),
  ]);

  const totalSalesRevenue = sales.reduce((sum, s) => sum + (s.grandTotal || 0), 0);
  const totalPurchasesCost = purchases.reduce((sum, p) => sum + (p.totalAmount || 0), 0);
  const totalExpenses = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);

  let totalCOGS = 0;
  for (const s of sales) {
    for (const item of s.items) {
      totalCOGS += (item.purchasePrice || 0) * (item.quantity || 0);
    }
  }
  const totalGrossProfit = Math.max(0, totalSalesRevenue - totalCOGS);
  const totalNetProfit = totalGrossProfit - totalExpenses;

  // Daily trend last 7 days
  const dailyMap: Record<string, { sales: number; purchases: number; profit: number }> = {};
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    dailyMap[dateStr] = { sales: 0, purchases: 0, profit: 0 };
  }

  for (const s of sales) {
    const dateStr = (s.date || s.createdAt).split('T')[0];
    if (dailyMap[dateStr]) {
      dailyMap[dateStr].sales += s.grandTotal || 0;
      let cost = 0;
      for (const item of s.items) {
        cost += (item.purchasePrice || 0) * (item.quantity || 0);
      }
      dailyMap[dateStr].profit += Math.max(0, (s.grandTotal || 0) - cost);
    }
  }

  for (const p of purchases) {
    const dateStr = (p.date || p.createdAt).split('T')[0];
    if (dailyMap[dateStr]) {
      dailyMap[dateStr].purchases += p.totalAmount || 0;
    }
  }

  const dailyTrend = Object.entries(dailyMap).map(([date, data]) => ({
    date: new Date(date).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' }),
    sales: data.sales,
    purchases: data.purchases,
    profit: data.profit,
  }));

  // Best selling products
  const productSalesCount: Record<string, { name: string; quantity: number; revenue: number; unit: string }> = {};
  for (const s of sales) {
    for (const item of s.items) {
      if (!productSalesCount[item.name]) {
        productSalesCount[item.name] = { name: item.name, quantity: 0, revenue: 0, unit: item.unit || 'unit' };
      }
      productSalesCount[item.name].quantity += Number(item.quantity) || 0;
      productSalesCount[item.name].revenue += Number(item.total) || 0;
    }
  }

  const bestSellingProducts = Object.values(productSalesCount)
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 5);

  const lowStockList = products
    .filter((p) => p.currentStock <= p.minStock)
    .map((p) => ({
      id: p.id,
      name: p.name,
      currentStock: p.currentStock,
      minStock: p.minStock,
      unit: p.unit,
      status: p.currentStock <= 0 ? 'Out of Stock' : 'Low Stock',
    }));

  const topDebtors = [...customers].sort((a, b) => (b.creditBalance || 0) - (a.creditBalance || 0)).slice(0, 5);
  const topPayables = [...suppliers].sort((a, b) => (b.outstandingBalance || 0) - (a.outstandingBalance || 0)).slice(0, 5);

  const expenseCategoryMap: Record<string, number> = {};
  for (const e of expenses) {
    expenseCategoryMap[e.category] = (expenseCategoryMap[e.category] || 0) + (e.amount || 0);
  }
  const expensesByCategory = Object.entries(expenseCategoryMap).map(([category, amount]) => ({
    category,
    amount,
  }));

  return {
    summary: {
      totalSalesRevenue,
      totalPurchasesCost,
      totalGrossProfit,
      totalExpenses,
      totalNetProfit,
      totalOrders: sales.length,
    },
    dailyTrend,
    bestSellingProducts,
    lowStockList,
    topDebtors,
    topPayables,
    expensesByCategory,
  };
}

// ==================== ADMIN OPERATIONS ====================

export const ADMIN_EMAIL_ADDRESS = 'fa635588@gmail.com';

export function verifyAdminAccess(): void {
  const user = auth.currentUser;
  if (!user || user.email?.toLowerCase() !== ADMIN_EMAIL_ADDRESS.toLowerCase()) {
    throw new Error('Access denied. Admin account required.');
  }
}

/**
 * Fetch all registered users from Firestore /users collection
 */
export async function getAdminAllUsers(): Promise<RegisteredUser[]> {
  verifyAdminAccess();
  const usersRef = collection(db, 'users');
  const snap = await getDocs(usersRef);
  const users: RegisteredUser[] = snap.docs.map((docSnap) => {
    const data = docSnap.data();
    return {
      id: docSnap.id,
      userId: data.userId || docSnap.id,
      fullName: data.fullName || 'Shopkeeper',
      email: data.email || '',
      phone: data.phone || '',
      storeName: data.storeName || 'My Kirana Store',
      profilePhoto: data.profilePhoto || null,
      createdAt: data.createdAt || new Date().toISOString(),
      updatedAt: data.updatedAt || new Date().toISOString(),
      disabled: Boolean(data.disabled),
    };
  });

  // Sort by createdAt desc
  users.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return users;
}

/**
 * Update user status or details as admin
 */
export async function updateAdminUser(
  userId: string,
  updates: Partial<RegisteredUser>
): Promise<void> {
  verifyAdminAccess();
  const userRef = doc(db, 'users', userId);
  await updateDoc(userRef, {
    ...updates,
    updatedAt: new Date().toISOString(),
  });
}

/**
 * Delete a user profile and their store data
 */
export async function deleteAdminUser(userId: string): Promise<void> {
  verifyAdminAccess();
  const userRef = doc(db, 'users', userId);
  await deleteDoc(userRef);
}

/**
 * Fetch all data for all users or a specific user for admin review
 */
export async function getAdminStoreData(targetUserId?: string): Promise<{
  products: Product[];
  sales: Sale[];
  purchases: Purchase[];
  customers: Customer[];
  suppliers: Supplier[];
  expenses: Expense[];
  stats: AdminOverviewStats;
}> {
  verifyAdminAccess();
  const allUsers = await getAdminAllUsers();
  const uidsToQuery = targetUserId
    ? [targetUserId]
    : allUsers.map((u) => u.userId);

  // If no users exist, return empty
  if (uidsToQuery.length === 0) {
    return {
      products: [],
      sales: [],
      purchases: [],
      customers: [],
      suppliers: [],
      expenses: [],
      stats: {
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
      },
    };
  }

  const allProducts: Product[] = [];
  const allSales: Sale[] = [];
  const allPurchases: Purchase[] = [];
  const allCustomers: Customer[] = [];
  const allSuppliers: Supplier[] = [];
  const allExpenses: Expense[] = [];

  // Query each store collection
  for (const uid of uidsToQuery) {
    try {
      const [prodSnap, saleSnap, purchSnap, custSnap, suppSnap, expSnap] = await Promise.all([
        getDocs(collection(db, 'stores', uid, 'products')),
        getDocs(collection(db, 'stores', uid, 'sales')),
        getDocs(collection(db, 'stores', uid, 'purchases')),
        getDocs(collection(db, 'stores', uid, 'customers')),
        getDocs(collection(db, 'stores', uid, 'suppliers')),
        getDocs(collection(db, 'stores', uid, 'expenses')),
      ]);

      prodSnap.docs.forEach((d) => allProducts.push({ ...(d.data() as Product), id: d.id, userId: uid }));
      saleSnap.docs.forEach((d) => allSales.push({ ...(d.data() as Sale), id: d.id, userId: uid }));
      purchSnap.docs.forEach((d) => allPurchases.push({ ...(d.data() as Purchase), id: d.id, userId: uid }));
      custSnap.docs.forEach((d) => allCustomers.push({ ...(d.data() as Customer), id: d.id, userId: uid }));
      suppSnap.docs.forEach((d) => allSuppliers.push({ ...(d.data() as Supplier), id: d.id, userId: uid }));
      expSnap.docs.forEach((d) => allExpenses.push({ ...(d.data() as Expense), id: d.id, userId: uid }));
    } catch (storeErr) {
      console.warn(`Could not read store data for ${uid}:`, storeErr);
    }
  }

  // Sort
  allSales.sort((a, b) => new Date(b.date || b.createdAt).getTime() - new Date(a.date || a.createdAt).getTime());
  allPurchases.sort((a, b) => new Date(b.date || b.createdAt).getTime() - new Date(a.date || a.createdAt).getTime());
  allExpenses.sort((a, b) => new Date(b.date || b.createdAt).getTime() - new Date(a.date || a.createdAt).getTime());
  allProducts.sort((a, b) => a.name.localeCompare(b.name));

  const totalSalesRevenue = allSales.reduce((acc, s) => acc + (s.grandTotal || 0), 0);
  const totalPurchasesCost = allPurchases.reduce((acc, p) => acc + (p.totalAmount || 0), 0);
  const totalExpensesAmount = allExpenses.reduce((acc, e) => acc + (e.amount || 0), 0);
  const totalCreditOutstanding = allCustomers.reduce((acc, c) => acc + (c.creditBalance || 0), 0);

  const stats: AdminOverviewStats = {
    totalUsers: allUsers.length,
    totalProducts: allProducts.length,
    totalSales: allSales.length,
    totalPurchases: allPurchases.length,
    totalCustomers: allCustomers.length,
    totalSuppliers: allSuppliers.length,
    totalExpenses: allExpenses.length,
    totalSalesRevenue,
    totalPurchasesCost,
    totalExpensesAmount,
    totalCreditOutstanding,
  };

  return {
    products: allProducts,
    sales: allSales,
    purchases: allPurchases,
    customers: allCustomers,
    suppliers: allSuppliers,
    expenses: allExpenses,
    stats,
  };
}

/**
 * Admin delete product across any store
 */
export async function deleteProductAsAdmin(userId: string, productId: string): Promise<void> {
  verifyAdminAccess();
  const ref = doc(db, 'stores', userId, 'products', productId);
  await deleteDoc(ref);
}

/**
 * Admin update product across any store
 */
export async function updateProductAsAdmin(
  userId: string,
  productId: string,
  updates: Partial<Product>
): Promise<void> {
  verifyAdminAccess();
  const ref = doc(db, 'stores', userId, 'products', productId);
  await setDoc(ref, { ...updates, updatedAt: new Date().toISOString() }, { merge: true });
}

/**
 * Admin delete sale
 */
export async function deleteSaleAsAdmin(userId: string, saleId: string): Promise<void> {
  verifyAdminAccess();
  const ref = doc(db, 'stores', userId, 'sales', saleId);
  await deleteDoc(ref);
}

/**
 * Admin delete customer
 */
export async function deleteCustomerAsAdmin(userId: string, customerId: string): Promise<void> {
  verifyAdminAccess();
  const ref = doc(db, 'stores', userId, 'customers', customerId);
  await deleteDoc(ref);
}

/**
 * Admin delete supplier
 */
export async function deleteSupplierAsAdmin(userId: string, supplierId: string): Promise<void> {
  verifyAdminAccess();
  const ref = doc(db, 'stores', userId, 'suppliers', supplierId);
  await deleteDoc(ref);
}

/**
 * Admin delete expense
 */
export async function deleteExpenseAsAdmin(userId: string, expenseId: string): Promise<void> {
  verifyAdminAccess();
  const ref = doc(db, 'stores', userId, 'expenses', expenseId);
  await deleteDoc(ref);
}
