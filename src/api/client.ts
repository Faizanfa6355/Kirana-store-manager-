import {
  getProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  getSales,
  getSaleById,
  createSale,
  getPurchases,
  createPurchase,
  getCustomers,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  addCustomerPayment,
  addCustomerCredit,
  getSuppliers,
  createSupplier,
  updateSupplier,
  deleteSupplier,
  addSupplierPayment,
  getUdhaarTransactions,
  getExpenses,
  createExpense,
  deleteExpense,
  getDashboardStats,
  getReportsData,
  getStoreSettings,
  updateStoreSettings,
} from '../services/firestoreService.js';

function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export const api = {
  // Products
  getProducts: (params?: { search?: string; category?: string; filter?: string }) =>
    getProducts(params),
  createProduct: (body: any) => createProduct(body),
  updateProduct: (id: string, body: any) => updateProduct(id, body),
  deleteProduct: (id: string) => deleteProduct(id),

  // Sales
  getSales: () => getSales(),
  getSaleById: (id: string) => getSaleById(id),
  createSale: (body: any) => createSale(body),

  // Purchases
  getPurchases: () => getPurchases(),
  createPurchase: (body: any) => createPurchase(body),

  // Customers
  getCustomers: () => getCustomers(),
  createCustomer: (body: any) => createCustomer(body),
  updateCustomer: (id: string, body: any) => updateCustomer(id, body),
  deleteCustomer: (id: string) => deleteCustomer(id),
  addCustomerPayment: (id: string, body: any) => addCustomerPayment(id, body),
  addCustomerCredit: (id: string, body: any) => addCustomerCredit(id, body),

  // Suppliers
  getSuppliers: () => getSuppliers(),
  createSupplier: (body: any) => createSupplier(body),
  updateSupplier: (id: string, body: any) => updateSupplier(id, body),
  deleteSupplier: (id: string) => deleteSupplier(id),
  addSupplierPayment: (id: string, body: any) => addSupplierPayment(id, body),

  // Udhaar
  getUdhaar: (partyType?: string) => getUdhaarTransactions(partyType),
  getUdhaarTransactions: (partyType?: string) => getUdhaarTransactions(partyType),

  // Expenses
  getExpenses: () => getExpenses(),
  createExpense: (body: any) => createExpense(body),
  deleteExpense: (id: string) => deleteExpense(id),

  // Dashboard & Reports
  getDashboard: () => getDashboardStats(),
  getReports: () => getReportsData(),

  // Settings
  getSettings: () => getStoreSettings(),
  updateSettings: (body: any) => updateStoreSettings(body),

  // Exports & Backups directly from Firestore
  downloadCSV: async (type: 'products' | 'sales' | 'customers' | 'expenses') => {
    let csv = '';
    const dateStr = new Date().toISOString().split('T')[0];

    if (type === 'products') {
      const items = await getProducts();
      csv = 'ID,Name,Category,Brand,CostPrice,SellingPrice,CurrentStock,Unit,MinStock,Barcode\n';
      items.forEach((p) => {
        csv += `"${p.id}","${p.name.replace(/"/g, '""')}","${p.category}","${p.brand || ''}",${p.purchasePrice},${p.sellingPrice},${p.currentStock},"${p.unit}",${p.minStock},"${p.barcode || ''}"\n`;
      });
      downloadFile(csv, `kirana_products_${dateStr}.csv`, 'text/csv;charset=utf-8;');
    } else if (type === 'sales') {
      const sales = await getSales();
      csv = 'ID,InvoiceNo,Date,Customer,Subtotal,Discount,GrandTotal,PaymentMethod\n';
      sales.forEach((s) => {
        csv += `"${s.id}","${s.invoiceNo}","${s.date}","${(s.customerName || 'Walk-in').replace(/"/g, '""')}",${s.subtotal},${s.discount},${s.grandTotal},"${s.paymentMethod}"\n`;
      });
      downloadFile(csv, `kirana_sales_${dateStr}.csv`, 'text/csv;charset=utf-8;');
    } else if (type === 'customers') {
      const customers = await getCustomers();
      csv = 'ID,Name,Phone,Address,TotalPurchases,AmountPaid,CreditBalance\n';
      customers.forEach((c) => {
        csv += `"${c.id}","${c.name.replace(/"/g, '""')}","${c.phone || ''}","${(c.address || '').replace(/"/g, '""')}",${c.totalPurchases},${c.amountPaid},${c.creditBalance}\n`;
      });
      downloadFile(csv, `kirana_customers_${dateStr}.csv`, 'text/csv;charset=utf-8;');
    } else if (type === 'expenses') {
      const expenses = await getExpenses();
      csv = 'ID,Date,Category,Amount,Notes\n';
      expenses.forEach((e) => {
        csv += `"${e.id}","${e.date}","${e.category}",${e.amount},"${(e.notes || '').replace(/"/g, '""')}"\n`;
      });
      downloadFile(csv, `kirana_expenses_${dateStr}.csv`, 'text/csv;charset=utf-8;');
    }
  },

  downloadJSONBackup: async () => {
    const [products, sales, purchases, customers, suppliers, expenses, settings, creditTransactions] = await Promise.all([
      getProducts(),
      getSales(),
      getPurchases(),
      getCustomers(),
      getSuppliers(),
      getExpenses(),
      getStoreSettings(),
      getUdhaarTransactions(),
    ]);

    const backupData = {
      backupDate: new Date().toISOString(),
      version: '1.0',
      settings,
      products,
      sales,
      purchases,
      customers,
      suppliers,
      expenses,
      creditTransactions,
    };

    const dateStr = new Date().toISOString().split('T')[0];
    downloadFile(
      JSON.stringify(backupData, null, 2),
      `kirana_backup_${dateStr}.json`,
      'application/json;charset=utf-8;'
    );
  },
};
