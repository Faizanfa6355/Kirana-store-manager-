import { Router, Response } from 'express';
import { db, Product, Sale, Purchase, Customer, Supplier, UdhaarTransaction, Expense, SaleItem } from './db.js';
import { authenticateToken, AuthRequest } from './auth.js';

const router = Router();

// Protect all /api/store/* routes
router.use(authenticateToken);

// Helper to format Date string YYYY-MM-DD
function getTodayDateStr(): string {
  const now = new Date();
  return now.toISOString().split('T')[0];
}

// ----------------------------------------------------
// 1. DASHBOARD OVERVIEW
// ----------------------------------------------------
router.get('/dashboard', (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  const database = db.get();
  const todayStr = getTodayDateStr();

  const userProducts = database.products.filter((p) => p.userId === userId);
  const userSales = database.sales.filter((s) => s.userId === userId);
  const userPurchases = database.purchases.filter((p) => p.userId === userId);
  const userCustomers = database.customers.filter((c) => c.userId === userId);
  const userSuppliers = database.suppliers.filter((s) => s.userId === userId);
  const userExpenses = database.expenses.filter((e) => e.userId === userId);
  const userUdhaar = database.udhaarTransactions.filter((u) => u.userId === userId);

  // Today's Sales
  const todaySalesList = userSales.filter((s) => s.date.startsWith(todayStr));
  const todaySalesTotal = todaySalesList.reduce((acc, s) => acc + s.grandTotal, 0);

  // Today's Purchases
  const todayPurchasesList = userPurchases.filter((p) => p.date.startsWith(todayStr));
  const todayPurchasesTotal = todayPurchasesList.reduce((acc, p) => acc + p.totalAmount, 0);

  // Today's Gross Profit from sales made today: Sum((sellingPrice - purchasePrice) * quantity) - discount
  let todayGrossProfit = 0;
  for (const sale of todaySalesList) {
    let saleItemProfit = 0;
    for (const item of sale.items) {
      const profitPerUnit = (item.sellingPrice || 0) - (item.purchasePrice || 0);
      saleItemProfit += profitPerUnit * (item.quantity || 0);
    }
    // Subtract discount applied to this sale
    saleItemProfit -= (sale.discount || 0);
    todayGrossProfit += saleItemProfit;
  }

  // Today's Expenses
  const todayExpensesList = userExpenses.filter((e) => e.date.startsWith(todayStr));
  const todayExpensesTotal = todayExpensesList.reduce((acc, e) => acc + e.amount, 0);

  // Today's Net Profit
  const todayNetProfit = todayGrossProfit - todayExpensesTotal;

  // Inventory stats
  const totalProducts = userProducts.length;
  const lowStockProducts = userProducts.filter(
    (p) => p.currentStock <= p.minStock && p.currentStock > 0
  ).length;
  const outOfStockProducts = userProducts.filter((p) => p.currentStock <= 0).length;
  const stockValue = userProducts.reduce((acc, p) => acc + (p.currentStock * p.purchasePrice), 0);

  // Customer Credit / Udhaar
  const totalCustomerCredit = userCustomers.reduce((acc, c) => acc + (c.creditBalance || 0), 0);
  const totalSupplierPayables = userSuppliers.reduce((acc, s) => acc + (s.outstandingBalance || 0), 0);

  // Recent 8 transactions across sales, purchases, and udhaar
  const recentSales = userSales.slice(-5).reverse().map((s) => ({
    id: s.id,
    type: 'sale',
    title: `Sale #${s.invoiceNo}`,
    subtitle: s.customerName ? `To ${s.customerName} (${s.paymentMethod})` : `Walk-in (${s.paymentMethod})`,
    amount: s.grandTotal,
    date: s.date,
    isIncome: true,
  }));

  const recentPurchases = userPurchases.slice(-5).reverse().map((p) => ({
    id: p.id,
    type: 'purchase',
    title: `Purchase: ${p.productName}`,
    subtitle: `From ${p.supplierName} (${p.quantity} ${p.unit})`,
    amount: p.totalAmount,
    date: p.date,
    isIncome: false,
  }));

  const recentExpenses = userExpenses.slice(-5).reverse().map((e) => ({
    id: e.id,
    type: 'expense',
    title: `Expense: ${e.category}`,
    subtitle: e.notes || 'Store expense',
    amount: e.amount,
    date: e.date,
    isIncome: false,
  }));

  const combinedRecent = [...recentSales, ...recentPurchases, ...recentExpenses]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 8);

  return res.json({
    todaySales: todaySalesTotal,
    todayPurchases: todayPurchasesTotal,
    todayGrossProfit: Math.round(todayGrossProfit * 100) / 100,
    todayExpenses: todayExpensesTotal,
    todayProfit: Math.round(todayNetProfit * 100) / 100,
    totalProducts,
    lowStockProducts,
    outOfStockProducts,
    stockValue: Math.round(stockValue * 100) / 100,
    totalCustomers: userCustomers.length,
    pendingPayments: Math.round(totalCustomerCredit * 100) / 100,
    supplierPayables: Math.round(totalSupplierPayables * 100) / 100,
    recentTransactions: combinedRecent,
  });
});

// ----------------------------------------------------
// 2. PRODUCTS / INVENTORY
// ----------------------------------------------------
router.get('/products', (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  const database = db.get();
  const search = ((req.query.search as string) || '').toLowerCase().trim();
  const category = (req.query.category as string) || '';
  const filter = (req.query.filter as string) || ''; // 'low_stock', 'out_of_stock'

  let list = database.products.filter((p) => p.userId === userId);

  if (category && category !== 'All') {
    list = list.filter((p) => p.category.toLowerCase() === category.toLowerCase());
  }

  if (search) {
    list = list.filter(
      (p) =>
        p.name.toLowerCase().includes(search) ||
        (p.barcode && p.barcode.toLowerCase().includes(search)) ||
        (p.brand && p.brand.toLowerCase().includes(search)) ||
        p.category.toLowerCase().includes(search)
    );
  }

  if (filter === 'low_stock') {
    list = list.filter((p) => p.currentStock <= p.minStock && p.currentStock > 0);
  } else if (filter === 'out_of_stock') {
    list = list.filter((p) => p.currentStock <= 0);
  }

  // Sort by updatedAt descending
  list.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

  return res.json(list);
});

router.post('/products', (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  const {
    name,
    category,
    brand,
    purchasePrice,
    sellingPrice,
    currentStock,
    unit,
    minStock,
    barcode,
    imageUrl,
  } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Product name is required.' });
  }

  const pPrice = parseFloat(purchasePrice) || 0;
  const sPrice = parseFloat(sellingPrice) || 0;
  const stock = parseFloat(currentStock) || 0;
  const min = parseFloat(minStock) || 5;

  if (sPrice < 0 || pPrice < 0) {
    return res.status(400).json({ error: 'Prices cannot be negative.' });
  }

  const database = db.get();

  // Check unique barcode if provided
  if (barcode && barcode.trim()) {
    const duplicate = database.products.find(
      (p) => p.userId === userId && p.barcode && p.barcode.trim() === barcode.trim()
    );
    if (duplicate) {
      return res.status(400).json({ error: `Barcode already used by '${duplicate.name}'` });
    }
  }

  const newProduct: Product = {
    id: 'prod_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
    userId,
    name: name.trim(),
    category: (category || 'General').trim(),
    brand: (brand || '').trim(),
    purchasePrice: pPrice,
    sellingPrice: sPrice,
    currentStock: stock,
    unit: (unit || 'piece').trim(),
    minStock: min,
    barcode: (barcode || '').trim(),
    imageUrl: (imageUrl || '').trim(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  database.products.push(newProduct);
  db.save(database);

  return res.status(201).json(newProduct);
});

router.put('/products/:id', (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  const productId = req.params.id;
  const {
    name,
    category,
    brand,
    purchasePrice,
    sellingPrice,
    currentStock,
    unit,
    minStock,
    barcode,
    imageUrl,
  } = req.body;

  const database = db.get();
  const index = database.products.findIndex((p) => p.id === productId && p.userId === userId);

  if (index === -1) {
    return res.status(404).json({ error: 'Product not found.' });
  }

  if (barcode && barcode.trim()) {
    const duplicate = database.products.find(
      (p) => p.userId === userId && p.id !== productId && p.barcode && p.barcode.trim() === barcode.trim()
    );
    if (duplicate) {
      return res.status(400).json({ error: `Barcode already used by '${duplicate.name}'` });
    }
  }

  const existing = database.products[index];
  const updated: Product = {
    ...existing,
    name: name ? name.trim() : existing.name,
    category: category !== undefined ? category.trim() : existing.category,
    brand: brand !== undefined ? brand.trim() : existing.brand,
    purchasePrice: purchasePrice !== undefined ? parseFloat(purchasePrice) || 0 : existing.purchasePrice,
    sellingPrice: sellingPrice !== undefined ? parseFloat(sellingPrice) || 0 : existing.sellingPrice,
    currentStock: currentStock !== undefined ? parseFloat(currentStock) || 0 : existing.currentStock,
    unit: unit !== undefined ? unit.trim() : existing.unit,
    minStock: minStock !== undefined ? parseFloat(minStock) || 0 : existing.minStock,
    barcode: barcode !== undefined ? barcode.trim() : existing.barcode,
    imageUrl: imageUrl !== undefined ? imageUrl.trim() : existing.imageUrl,
    updatedAt: new Date().toISOString(),
  };

  database.products[index] = updated;
  db.save(database);

  return res.json(updated);
});

router.delete('/products/:id', (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  const productId = req.params.id;
  const database = db.get();

  const index = database.products.findIndex((p) => p.id === productId && p.userId === userId);
  if (index === -1) {
    return res.status(404).json({ error: 'Product not found.' });
  }

  const deleted = database.products.splice(index, 1)[0];
  db.save(database);

  return res.json({ message: 'Product deleted successfully', product: deleted });
});

// ----------------------------------------------------
// 3. SALES & BILLING
// ----------------------------------------------------
router.get('/sales', (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  const database = db.get();
  const sales = database.sales
    .filter((s) => s.userId === userId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return res.json(sales);
});

router.post('/sales', (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  const {
    items,
    discount = 0,
    discountType = 'flat',
    paymentMethod = 'Cash',
    customerId,
    customerName,
    customerPhone,
    notes,
  } = req.body;

  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'A sale must have at least one product.' });
  }

  const database = db.get();

  // Validate items and compute subtotal
  let subtotal = 0;
  const validatedItems: SaleItem[] = [];

  for (const it of items) {
    const qty = parseFloat(it.quantity) || 0;
    if (qty <= 0) {
      return res.status(400).json({ error: `Invalid quantity for ${it.name || 'item'}` });
    }

    const prod = database.products.find((p) => p.id === it.productId && p.userId === userId);
    const sPrice = prod ? prod.sellingPrice : parseFloat(it.sellingPrice) || 0;
    const pPrice = prod ? prod.purchasePrice : parseFloat(it.purchasePrice) || 0;
    const itemTotal = Math.round(qty * sPrice * 100) / 100;
    subtotal += itemTotal;

    validatedItems.push({
      productId: it.productId,
      name: prod ? prod.name : it.name,
      unit: prod ? prod.unit : (it.unit || 'piece'),
      quantity: qty,
      purchasePrice: pPrice,
      sellingPrice: sPrice,
      total: itemTotal,
    });
  }

  subtotal = Math.round(subtotal * 100) / 100;
  let finalDiscount = parseFloat(discount) || 0;
  if (discountType === 'percentage') {
    finalDiscount = Math.round((subtotal * finalDiscount / 100) * 100) / 100;
  }
  finalDiscount = Math.min(finalDiscount, subtotal);
  const grandTotal = Math.round((subtotal - finalDiscount) * 100) / 100;

  // Generate unique invoice number: INV-YYYYMMDD-XXXX
  const userSettings = database.settings[userId] || { invoicePrefix: 'INV' };
  const prefix = userSettings.invoicePrefix || 'INV';
  const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const userSaleCount = database.sales.filter((s) => s.userId === userId).length + 1;
  const invoiceNo = `${prefix}-${todayStr}-${String(userSaleCount).padStart(4, '0')}`;

  // Automatically reduce inventory stock
  for (const it of validatedItems) {
    const prodIndex = database.products.findIndex((p) => p.id === it.productId && p.userId === userId);
    if (prodIndex !== -1) {
      database.products[prodIndex].currentStock = Math.max(
        0,
        Math.round((database.products[prodIndex].currentStock - it.quantity) * 100) / 100
      );
      database.products[prodIndex].updatedAt = new Date().toISOString();
    }
  }

  // If customer provided or paymentMethod is Credit, handle Customer Udhaar
  let resolvedCustomerId = customerId;
  let resolvedCustomerName = customerName;
  let resolvedCustomerPhone = customerPhone;

  if (customerId) {
    const custIndex = database.customers.findIndex((c) => c.id === customerId && c.userId === userId);
    if (custIndex !== -1) {
      const cust = database.customers[custIndex];
      cust.totalPurchases = Math.round((cust.totalPurchases + grandTotal) * 100) / 100;
      resolvedCustomerName = cust.name;
      resolvedCustomerPhone = cust.phone;

      if (paymentMethod === 'Credit') {
        // Customer bought on Udhaar (credit)
        cust.creditBalance = Math.round((cust.creditBalance + grandTotal) * 100) / 100;

        database.udhaarTransactions.push({
          id: 'udh_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
          userId,
          partyType: 'customer',
          partyId: cust.id,
          partyName: cust.name,
          type: 'credit_given',
          amount: grandTotal,
          balanceAfter: cust.creditBalance,
          date: new Date().toISOString(),
          notes: `Sale Bill #${invoiceNo}`,
          createdAt: new Date().toISOString(),
        });
      } else {
        // Paid by Cash/UPI/Card
        cust.amountPaid = Math.round((cust.amountPaid + grandTotal) * 100) / 100;
      }
      database.customers[custIndex] = cust;
    }
  } else if (customerName && customerName.trim() && paymentMethod === 'Credit') {
    // New customer created on the fly for credit
    const newCust: Customer = {
      id: 'cust_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      userId,
      name: customerName.trim(),
      phone: (customerPhone || '').trim(),
      address: '',
      totalPurchases: grandTotal,
      amountPaid: 0,
      creditBalance: grandTotal,
      createdAt: new Date().toISOString(),
    };
    database.customers.push(newCust);
    resolvedCustomerId = newCust.id;

    database.udhaarTransactions.push({
      id: 'udh_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      userId,
      partyType: 'customer',
      partyId: newCust.id,
      partyName: newCust.name,
      type: 'credit_given',
      amount: grandTotal,
      balanceAfter: grandTotal,
      date: new Date().toISOString(),
      notes: `Sale Bill #${invoiceNo}`,
      createdAt: new Date().toISOString(),
    });
  }

  const newSale: Sale = {
    id: 'sale_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
    userId,
    invoiceNo,
    date: new Date().toISOString(),
    customerId: resolvedCustomerId,
    customerName: resolvedCustomerName,
    customerPhone: resolvedCustomerPhone,
    items: validatedItems,
    subtotal,
    discount: finalDiscount,
    discountType: discountType as 'flat' | 'percentage',
    grandTotal,
    paymentMethod,
    notes,
    createdAt: new Date().toISOString(),
  };

  database.sales.push(newSale);
  db.save(database);

  return res.status(201).json(newSale);
});

router.get('/sales/:id', (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  const database = db.get();
  const sale = database.sales.find((s) => s.id === req.params.id && s.userId === userId);
  if (!sale) {
    return res.status(404).json({ error: 'Invoice not found.' });
  }
  return res.json(sale);
});

// ----------------------------------------------------
// 4. PURCHASES (STOCK IN)
// ----------------------------------------------------
router.get('/purchases', (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  const database = db.get();
  const purchases = database.purchases
    .filter((p) => p.userId === userId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return res.json(purchases);
});

router.post('/purchases', (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  const {
    supplierId,
    supplierName,
    productId,
    productName,
    quantity,
    unit,
    purchasePrice,
    paymentStatus = 'Paid',
    amountPaid,
    notes,
    date,
  } = req.body;

  const qty = parseFloat(quantity) || 0;
  const pPrice = parseFloat(purchasePrice) || 0;

  if (qty <= 0 || pPrice < 0) {
    return res.status(400).json({ error: 'Valid quantity and purchase price are required.' });
  }

  const database = db.get();
  const totalAmount = Math.round(qty * pPrice * 100) / 100;
  const actualPaid = paymentStatus === 'Paid'
    ? totalAmount
    : (paymentStatus === 'Credit' ? 0 : Math.min(parseFloat(amountPaid) || 0, totalAmount));

  // Find or update product stock
  let targetProduct = database.products.find((p) => p.id === productId && p.userId === userId);
  let resolvedProductName = productName;
  let resolvedUnit = unit || 'piece';

  if (targetProduct) {
    resolvedProductName = targetProduct.name;
    resolvedUnit = targetProduct.unit;
    // Automatically INCREASE stock
    targetProduct.currentStock = Math.round((targetProduct.currentStock + qty) * 100) / 100;
    // Update purchase price if shopkeeper recorded a new purchase price
    targetProduct.purchasePrice = pPrice;
    targetProduct.updatedAt = new Date().toISOString();
  } else if (productName && productName.trim()) {
    // If shopkeeper entered a new product during purchase, auto-create it in inventory!
    const newProd: Product = {
      id: 'prod_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      userId,
      name: productName.trim(),
      category: 'General',
      brand: '',
      purchasePrice: pPrice,
      sellingPrice: Math.round(pPrice * 1.15), // default 15% markup if not set
      currentStock: qty,
      unit: resolvedUnit,
      minStock: 5,
      barcode: '',
      imageUrl: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    database.products.push(newProd);
    targetProduct = newProd;
  }

  // Handle supplier balance if Credit or Partial
  let resolvedSupplierId = supplierId;
  let resolvedSupplierName = supplierName || 'General Supplier';

  if (supplierId) {
    const suppIndex = database.suppliers.findIndex((s) => s.id === supplierId && s.userId === userId);
    if (suppIndex !== -1) {
      const supp = database.suppliers[suppIndex];
      supp.totalPurchases = Math.round((supp.totalPurchases + totalAmount) * 100) / 100;
      supp.amountPaid = Math.round((supp.amountPaid + actualPaid) * 100) / 100;
      const unpaid = totalAmount - actualPaid;
      if (unpaid > 0) {
        supp.outstandingBalance = Math.round((supp.outstandingBalance + unpaid) * 100) / 100;

        database.udhaarTransactions.push({
          id: 'udh_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
          userId,
          partyType: 'supplier',
          partyId: supp.id,
          partyName: supp.name,
          type: 'payable_added',
          amount: unpaid,
          balanceAfter: supp.outstandingBalance,
          date: date || new Date().toISOString(),
          notes: `Purchase: ${resolvedProductName} (${qty} ${resolvedUnit})`,
          createdAt: new Date().toISOString(),
        });
      }
      resolvedSupplierName = supp.name;
    }
  } else if (supplierName && supplierName.trim() && (totalAmount - actualPaid) > 0) {
    // Auto create supplier with credit
    const unpaid = totalAmount - actualPaid;
    const newSupp: Supplier = {
      id: 'supp_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      userId,
      name: supplierName.trim(),
      phone: '',
      address: '',
      productsSupplied: resolvedProductName,
      totalPurchases: totalAmount,
      amountPaid: actualPaid,
      outstandingBalance: unpaid,
      createdAt: new Date().toISOString(),
    };
    database.suppliers.push(newSupp);
    resolvedSupplierId = newSupp.id;

    database.udhaarTransactions.push({
      id: 'udh_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      userId,
      partyType: 'supplier',
      partyId: newSupp.id,
      partyName: newSupp.name,
      type: 'payable_added',
      amount: unpaid,
      balanceAfter: unpaid,
      date: date || new Date().toISOString(),
      notes: `Purchase: ${resolvedProductName} (${qty} ${resolvedUnit})`,
      createdAt: new Date().toISOString(),
    });
  }

  const newPurchase: Purchase = {
    id: 'pur_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
    userId,
    supplierId: resolvedSupplierId,
    supplierName: resolvedSupplierName,
    productId: targetProduct ? targetProduct.id : (productId || ''),
    productName: resolvedProductName,
    quantity: qty,
    unit: resolvedUnit,
    purchasePrice: pPrice,
    totalAmount,
    date: date || new Date().toISOString(),
    paymentStatus: paymentStatus as 'Paid' | 'Credit' | 'Partial',
    amountPaid: actualPaid,
    notes,
    createdAt: new Date().toISOString(),
  };

  database.purchases.push(newPurchase);
  db.save(database);

  return res.status(201).json(newPurchase);
});

// ----------------------------------------------------
// 5. CUSTOMERS
// ----------------------------------------------------
router.get('/customers', (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  const database = db.get();
  const customers = database.customers
    .filter((c) => c.userId === userId)
    .sort((a, b) => (b.creditBalance || 0) - (a.creditBalance || 0));

  return res.json(customers);
});

router.post('/customers', (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  const { name, phone, address } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Customer name is required.' });
  }

  const database = db.get();
  const newCust: Customer = {
    id: 'cust_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
    userId,
    name: name.trim(),
    phone: (phone || '').trim(),
    address: (address || '').trim(),
    totalPurchases: 0,
    amountPaid: 0,
    creditBalance: 0,
    createdAt: new Date().toISOString(),
  };

  database.customers.push(newCust);
  db.save(database);

  return res.status(201).json(newCust);
});

router.put('/customers/:id', (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  const customerId = req.params.id;
  const { name, phone, address } = req.body;

  const database = db.get();
  const index = database.customers.findIndex((c) => c.id === customerId && c.userId === userId);
  if (index === -1) {
    return res.status(404).json({ error: 'Customer not found.' });
  }

  const existing = database.customers[index];
  existing.name = name ? name.trim() : existing.name;
  existing.phone = phone !== undefined ? phone.trim() : existing.phone;
  existing.address = address !== undefined ? address.trim() : existing.address;

  database.customers[index] = existing;
  db.save(database);

  return res.json(existing);
});

router.delete('/customers/:id', (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  const customerId = req.params.id;
  const database = db.get();

  const index = database.customers.findIndex((c) => c.id === customerId && c.userId === userId);
  if (index === -1) {
    return res.status(404).json({ error: 'Customer not found.' });
  }

  database.customers.splice(index, 1);
  db.save(database);

  return res.json({ message: 'Customer deleted' });
});

// Record customer payment (clearing Udhaar)
router.post('/customers/:id/payment', (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  const customerId = req.params.id;
  const { amount, date, notes } = req.body;

  const pAmount = parseFloat(amount) || 0;
  if (pAmount <= 0) {
    return res.status(400).json({ error: 'Payment amount must be greater than 0.' });
  }

  const database = db.get();
  const custIndex = database.customers.findIndex((c) => c.id === customerId && c.userId === userId);
  if (custIndex === -1) {
    return res.status(404).json({ error: 'Customer not found.' });
  }

  const cust = database.customers[custIndex];
  cust.amountPaid = Math.round((cust.amountPaid + pAmount) * 100) / 100;
  cust.creditBalance = Math.max(0, Math.round((cust.creditBalance - pAmount) * 100) / 100);

  const tx: UdhaarTransaction = {
    id: 'udh_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
    userId,
    partyType: 'customer',
    partyId: cust.id,
    partyName: cust.name,
    type: 'payment_received',
    amount: pAmount,
    balanceAfter: cust.creditBalance,
    date: date || new Date().toISOString(),
    notes: notes || 'Payment received',
    createdAt: new Date().toISOString(),
  };

  database.udhaarTransactions.push(tx);
  database.customers[custIndex] = cust;
  db.save(database);

  return res.json({ customer: cust, transaction: tx });
});

// Add manual credit transaction to customer
router.post('/customers/:id/credit', (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  const customerId = req.params.id;
  const { amount, date, notes } = req.body;

  const cAmount = parseFloat(amount) || 0;
  if (cAmount <= 0) {
    return res.status(400).json({ error: 'Credit amount must be greater than 0.' });
  }

  const database = db.get();
  const custIndex = database.customers.findIndex((c) => c.id === customerId && c.userId === userId);
  if (custIndex === -1) {
    return res.status(404).json({ error: 'Customer not found.' });
  }

  const cust = database.customers[custIndex];
  cust.creditBalance = Math.round((cust.creditBalance + cAmount) * 100) / 100;
  cust.totalPurchases = Math.round((cust.totalPurchases + cAmount) * 100) / 100;

  const tx: UdhaarTransaction = {
    id: 'udh_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
    userId,
    partyType: 'customer',
    partyId: cust.id,
    partyName: cust.name,
    type: 'credit_given',
    amount: cAmount,
    balanceAfter: cust.creditBalance,
    date: date || new Date().toISOString(),
    notes: notes || 'Manual Udhaar recorded',
    createdAt: new Date().toISOString(),
  };

  database.udhaarTransactions.push(tx);
  database.customers[custIndex] = cust;
  db.save(database);

  return res.json({ customer: cust, transaction: tx });
});

// ----------------------------------------------------
// 6. SUPPLIERS
// ----------------------------------------------------
router.get('/suppliers', (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  const database = db.get();
  const suppliers = database.suppliers
    .filter((s) => s.userId === userId)
    .sort((a, b) => (b.outstandingBalance || 0) - (a.outstandingBalance || 0));

  return res.json(suppliers);
});

router.post('/suppliers', (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  const { name, phone, address, productsSupplied } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Supplier name is required.' });
  }

  const database = db.get();
  const newSupp: Supplier = {
    id: 'supp_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
    userId,
    name: name.trim(),
    phone: (phone || '').trim(),
    address: (address || '').trim(),
    productsSupplied: (productsSupplied || '').trim(),
    totalPurchases: 0,
    amountPaid: 0,
    outstandingBalance: 0,
    createdAt: new Date().toISOString(),
  };

  database.suppliers.push(newSupp);
  db.save(database);

  return res.status(201).json(newSupp);
});

router.put('/suppliers/:id', (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  const supplierId = req.params.id;
  const { name, phone, address, productsSupplied } = req.body;

  const database = db.get();
  const index = database.suppliers.findIndex((s) => s.id === supplierId && s.userId === userId);
  if (index === -1) {
    return res.status(404).json({ error: 'Supplier not found.' });
  }

  const existing = database.suppliers[index];
  existing.name = name ? name.trim() : existing.name;
  existing.phone = phone !== undefined ? phone.trim() : existing.phone;
  existing.address = address !== undefined ? address.trim() : existing.address;
  existing.productsSupplied = productsSupplied !== undefined ? productsSupplied.trim() : existing.productsSupplied;

  database.suppliers[index] = existing;
  db.save(database);

  return res.json(existing);
});

router.delete('/suppliers/:id', (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  const supplierId = req.params.id;
  const database = db.get();

  const index = database.suppliers.findIndex((s) => s.id === supplierId && s.userId === userId);
  if (index === -1) {
    return res.status(404).json({ error: 'Supplier not found.' });
  }

  database.suppliers.splice(index, 1);
  db.save(database);

  return res.json({ message: 'Supplier deleted' });
});

// Record payment to supplier
router.post('/suppliers/:id/payment', (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  const supplierId = req.params.id;
  const { amount, date, notes } = req.body;

  const pAmount = parseFloat(amount) || 0;
  if (pAmount <= 0) {
    return res.status(400).json({ error: 'Payment amount must be greater than 0.' });
  }

  const database = db.get();
  const suppIndex = database.suppliers.findIndex((s) => s.id === supplierId && s.userId === userId);
  if (suppIndex === -1) {
    return res.status(404).json({ error: 'Supplier not found.' });
  }

  const supp = database.suppliers[suppIndex];
  supp.amountPaid = Math.round((supp.amountPaid + pAmount) * 100) / 100;
  supp.outstandingBalance = Math.max(0, Math.round((supp.outstandingBalance - pAmount) * 100) / 100);

  const tx: UdhaarTransaction = {
    id: 'udh_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
    userId,
    partyType: 'supplier',
    partyId: supp.id,
    partyName: supp.name,
    type: 'payment_made',
    amount: pAmount,
    balanceAfter: supp.outstandingBalance,
    date: date || new Date().toISOString(),
    notes: notes || 'Paid to supplier',
    createdAt: new Date().toISOString(),
  };

  database.udhaarTransactions.push(tx);
  database.suppliers[suppIndex] = supp;
  db.save(database);

  return res.json({ supplier: supp, transaction: tx });
});

// ----------------------------------------------------
// 7. UDHAAR / CREDIT KHATA
// ----------------------------------------------------
router.get('/udhaar', (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  const database = db.get();
  const partyType = req.query.partyType as string; // 'customer' | 'supplier'

  let list = database.udhaarTransactions.filter((u) => u.userId === userId);
  if (partyType) {
    list = list.filter((u) => u.partyType === partyType);
  }

  list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  return res.json(list);
});

// ----------------------------------------------------
// 8. EXPENSES
// ----------------------------------------------------
router.get('/expenses', (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  const database = db.get();
  const expenses = database.expenses
    .filter((e) => e.userId === userId)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return res.json(expenses);
});

router.post('/expenses', (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  const { category, amount, date, notes } = req.body;

  const expAmount = parseFloat(amount) || 0;
  if (expAmount <= 0) {
    return res.status(400).json({ error: 'Expense amount must be greater than 0.' });
  }

  if (!category || !category.trim()) {
    return res.status(400).json({ error: 'Expense category is required.' });
  }

  const database = db.get();
  const newExp: Expense = {
    id: 'exp_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
    userId,
    category: category.trim(),
    amount: expAmount,
    date: date || new Date().toISOString(),
    notes: (notes || '').trim(),
    createdAt: new Date().toISOString(),
  };

  database.expenses.push(newExp);
  db.save(database);

  return res.status(201).json(newExp);
});

router.delete('/expenses/:id', (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  const expenseId = req.params.id;
  const database = db.get();

  const index = database.expenses.findIndex((e) => e.id === expenseId && e.userId === userId);
  if (index === -1) {
    return res.status(404).json({ error: 'Expense not found.' });
  }

  database.expenses.splice(index, 1);
  db.save(database);

  return res.json({ message: 'Expense deleted' });
});

// ----------------------------------------------------
// 9. REPORTS & ANALYTICS
// ----------------------------------------------------
router.get('/reports', (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  const database = db.get();

  const userSales = database.sales.filter((s) => s.userId === userId);
  const userPurchases = database.purchases.filter((p) => p.userId === userId);
  const userExpenses = database.expenses.filter((e) => e.userId === userId);
  const userProducts = database.products.filter((p) => p.userId === userId);
  const userCustomers = database.customers.filter((c) => c.userId === userId);
  const userSuppliers = database.suppliers.filter((s) => s.userId === userId);

  // 1. Overall Calculations
  const totalSalesRevenue = userSales.reduce((acc, s) => acc + s.grandTotal, 0);
  const totalPurchasesCost = userPurchases.reduce((acc, p) => acc + p.totalAmount, 0);
  const totalExpenses = userExpenses.reduce((acc, e) => acc + e.amount, 0);

  // Gross Profit = Sum of ((sellingPrice - purchasePrice) * qty) - discount across all sales
  let totalGrossProfit = 0;
  for (const s of userSales) {
    let saleProfit = 0;
    for (const item of s.items) {
      saleProfit += ((item.sellingPrice || 0) - (item.purchasePrice || 0)) * (item.quantity || 0);
    }
    saleProfit -= (s.discount || 0);
    totalGrossProfit += saleProfit;
  }
  totalGrossProfit = Math.round(totalGrossProfit * 100) / 100;
  const totalNetProfit = Math.round((totalGrossProfit - totalExpenses) * 100) / 100;

  // 2. Daily Sales (last 7 days)
  const last7Days: { date: string; sales: number; profit: number; purchases: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];

    const daySales = userSales.filter((s) => s.date.startsWith(dateStr));
    const daySalesTotal = daySales.reduce((acc, s) => acc + s.grandTotal, 0);

    let dayProfit = 0;
    for (const s of daySales) {
      let sp = 0;
      for (const item of s.items) {
        sp += ((item.sellingPrice || 0) - (item.purchasePrice || 0)) * (item.quantity || 0);
      }
      sp -= (s.discount || 0);
      dayProfit += sp;
    }

    const dayExpenses = userExpenses.filter((e) => e.date.startsWith(dateStr)).reduce((acc, e) => acc + e.amount, 0);
    const dayPurchases = userPurchases.filter((p) => p.date.startsWith(dateStr)).reduce((acc, p) => acc + p.totalAmount, 0);

    last7Days.push({
      date: dateStr.slice(5), // MM-DD
      sales: Math.round(daySalesTotal),
      profit: Math.round(dayProfit - dayExpenses),
      purchases: Math.round(dayPurchases),
    });
  }

  // 3. Best-Selling Products
  const productSalesMap: Record<string, { name: string; quantity: number; revenue: number; unit: string }> = {};
  for (const s of userSales) {
    for (const item of s.items) {
      if (!productSalesMap[item.productId]) {
        productSalesMap[item.productId] = {
          name: item.name,
          quantity: 0,
          revenue: 0,
          unit: item.unit,
        };
      }
      productSalesMap[item.productId].quantity += item.quantity;
      productSalesMap[item.productId].revenue += item.total;
    }
  }

  const bestSellingProducts = Object.values(productSalesMap)
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 8);

  // 4. Low-stock list
  const lowStockList = userProducts
    .filter((p) => p.currentStock <= p.minStock)
    .map((p) => ({
      id: p.id,
      name: p.name,
      currentStock: p.currentStock,
      minStock: p.minStock,
      unit: p.unit,
      status: p.currentStock <= 0 ? 'Out of Stock' : 'Low Stock',
    }));

  // 5. Customer Credit List (Top debtors)
  const topDebtors = userCustomers
    .filter((c) => (c.creditBalance || 0) > 0)
    .sort((a, b) => b.creditBalance - a.creditBalance)
    .slice(0, 10);

  // 6. Supplier Payables List
  const topPayables = userSuppliers
    .filter((s) => (s.outstandingBalance || 0) > 0)
    .sort((a, b) => b.outstandingBalance - a.outstandingBalance)
    .slice(0, 10);

  // 7. Expense breakdown by category
  const expenseCategoryMap: Record<string, number> = {};
  for (const exp of userExpenses) {
    expenseCategoryMap[exp.category] = (expenseCategoryMap[exp.category] || 0) + exp.amount;
  }
  const expensesByCategory = Object.entries(expenseCategoryMap).map(([category, amount]) => ({
    category,
    amount,
  }));

  return res.json({
    summary: {
      totalSalesRevenue: Math.round(totalSalesRevenue * 100) / 100,
      totalPurchasesCost: Math.round(totalPurchasesCost * 100) / 100,
      totalGrossProfit,
      totalExpenses: Math.round(totalExpenses * 100) / 100,
      totalNetProfit,
      totalOrders: userSales.length,
    },
    dailyTrend: last7Days,
    bestSellingProducts,
    lowStockList,
    topDebtors,
    topPayables,
    expensesByCategory,
  });
});

// ----------------------------------------------------
// 10. SETTINGS
// ----------------------------------------------------
router.get('/settings', (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  const database = db.get();
  const settings = database.settings[userId] || {
    storeName: 'My Kirana Store',
    address: '',
    phone: '',
    invoicePrefix: 'INV',
    invoiceFooter: 'Thank you for shopping with us! Please visit again.',
    currency: '₹',
  };

  return res.json(settings);
});

router.put('/settings', (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  const { storeName, address, phone, invoicePrefix, invoiceFooter, currency } = req.body;
  const database = db.get();

  const existing = database.settings[userId] || {
    storeName: 'My Kirana Store',
    address: '',
    phone: '',
    invoicePrefix: 'INV',
    invoiceFooter: 'Thank you for shopping with us! Please visit again.',
    currency: '₹',
  };

  const updated = {
    ...existing,
    storeName: storeName !== undefined ? storeName.trim() : existing.storeName,
    address: address !== undefined ? address.trim() : existing.address,
    phone: phone !== undefined ? phone.trim() : existing.phone,
    invoicePrefix: invoicePrefix !== undefined ? invoicePrefix.trim() : existing.invoicePrefix,
    invoiceFooter: invoiceFooter !== undefined ? invoiceFooter.trim() : existing.invoiceFooter,
    currency: currency !== undefined ? currency.trim() : existing.currency,
  };

  database.settings[userId] = updated;

  // Also update user's storeName
  const user = database.users.find((u) => u.id === userId);
  if (user && storeName) {
    user.storeName = storeName.trim();
  }

  db.save(database);
  return res.json(updated);
});

// ----------------------------------------------------
// 11. EXPORT & BACKUP
// ----------------------------------------------------
router.get('/export/:type', (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  const type = req.params.type;
  const database = db.get();

  let csvContent = '';

  if (type === 'products') {
    const list = database.products.filter((p) => p.userId === userId);
    csvContent = 'ID,Name,Category,Brand,PurchasePrice,SellingPrice,CurrentStock,Unit,MinStock,Barcode\n' +
      list.map((p) => `"${p.id}","${p.name}","${p.category}","${p.brand || ''}",${p.purchasePrice},${p.sellingPrice},${p.currentStock},"${p.unit}",${p.minStock},"${p.barcode || ''}"`).join('\n');
    res.header('Content-Type', 'text/csv');
    res.attachment(`kirana_products_${getTodayDateStr()}.csv`);
    return res.send(csvContent);
  }

  if (type === 'sales') {
    const list = database.sales.filter((s) => s.userId === userId);
    csvContent = 'InvoiceNo,Date,CustomerName,ItemsCount,Subtotal,Discount,GrandTotal,PaymentMethod\n' +
      list.map((s) => `"${s.invoiceNo}","${s.date}","${s.customerName || 'Walk-in'}",${s.items.length},${s.subtotal},${s.discount},${s.grandTotal},"${s.paymentMethod}"`).join('\n');
    res.header('Content-Type', 'text/csv');
    res.attachment(`kirana_sales_${getTodayDateStr()}.csv`);
    return res.send(csvContent);
  }

  if (type === 'customers') {
    const list = database.customers.filter((c) => c.userId === userId);
    csvContent = 'Name,Phone,Address,TotalPurchases,AmountPaid,CreditBalance\n' +
      list.map((c) => `"${c.name}","${c.phone || ''}","${c.address || ''}",${c.totalPurchases},${c.amountPaid},${c.creditBalance}`).join('\n');
    res.header('Content-Type', 'text/csv');
    res.attachment(`kirana_customers_${getTodayDateStr()}.csv`);
    return res.send(csvContent);
  }

  if (type === 'expenses') {
    const list = database.expenses.filter((e) => e.userId === userId);
    csvContent = 'Category,Amount,Date,Notes\n' +
      list.map((e) => `"${e.category}",${e.amount},"${e.date}","${e.notes || ''}"`).join('\n');
    res.header('Content-Type', 'text/csv');
    res.attachment(`kirana_expenses_${getTodayDateStr()}.csv`);
    return res.send(csvContent);
  }

  return res.status(400).json({ error: 'Invalid export type. Supported: products, sales, customers, expenses' });
});

// Full JSON backup
router.get('/backup/full', (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  const database = db.get();

  const backupData = {
    version: '1.0',
    exportedAt: new Date().toISOString(),
    settings: database.settings[userId] || {},
    products: database.products.filter((p) => p.userId === userId),
    sales: database.sales.filter((s) => s.userId === userId),
    purchases: database.purchases.filter((p) => p.userId === userId),
    customers: database.customers.filter((c) => c.userId === userId),
    suppliers: database.suppliers.filter((s) => s.userId === userId),
    udhaarTransactions: database.udhaarTransactions.filter((u) => u.userId === userId),
    expenses: database.expenses.filter((e) => e.userId === userId),
  };

  res.header('Content-Type', 'application/json');
  res.attachment(`kirana_backup_${getTodayDateStr()}.json`);
  return res.send(JSON.stringify(backupData, null, 2));
});

export default router;
