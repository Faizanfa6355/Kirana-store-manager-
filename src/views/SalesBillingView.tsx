import React, { useState, useMemo } from 'react';
import {
  Search,
  Camera,
  Plus,
  Minus,
  Trash2,
  Receipt,
  Printer,
  CheckCircle2,
  CreditCard,
  Banknote,
  QrCode,
  BookOpen,
  User,
  Percent,
  History,
  ShoppingCart,
  X,
  ArrowRight,
} from 'lucide-react';
import { Product, Customer, Sale, SaleItem } from '../types.js';
import { useStore } from '../context/StoreContext.js';
import { useAuth } from '../context/AuthContext.js';
import { api } from '../api/client.js';
import { BarcodeScannerModal } from '../components/BarcodeScannerModal.js';
import { PrintInvoiceModal } from '../components/PrintInvoiceModal.js';

interface CartItem {
  product: Product;
  quantity: number;
  sellingPrice: number;
  total: number;
}

export const SalesBillingView: React.FC = () => {
  const { products, customers, refreshProducts, refreshCustomers, refreshDashboard, showToast } = useStore();
  const { settings } = useAuth();

  // Active view mode: 'billing' or 'history'
  const [activeSubTab, setActiveSubTab] = useState<'billing' | 'history'>('billing');

  // Search & Cart State
  const [searchQuery, setSearchQuery] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [discount, setDiscount] = useState<string>('0');
  const [discountType, setDiscountType] = useState<'flat' | 'percentage'>('flat');
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'UPI' | 'Card' | 'Credit'>('Cash');

  // Customer Selection State
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [customCustomerName, setCustomCustomerName] = useState<string>('');
  const [customCustomerPhone, setCustomCustomerPhone] = useState<string>('');
  const [saleNotes, setSaleNotes] = useState('');

  // Modals
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isInvoiceOpen, setIsInvoiceOpen] = useState(false);
  const [completedSale, setCompletedSale] = useState<Sale | null>(null);
  const [savingSale, setSavingSale] = useState(false);

  // Sales History State
  const [salesHistory, setSalesHistory] = useState<Sale[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Load Sales History
  const loadHistory = async () => {
    setLoadingHistory(true);
    try {
      const data = await api.getSales();
      setSalesHistory(data);
    } catch (err: any) {
      showToast(err.message || 'Failed to load sales history', 'error');
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleSubTabChange = (tab: 'billing' | 'history') => {
    setActiveSubTab(tab);
    if (tab === 'history') {
      loadHistory();
    }
  };

  // Live product search matches
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase().trim();
    return products
      .filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.barcode && p.barcode.toLowerCase().includes(q)) ||
          (p.brand && p.brand.toLowerCase().includes(q)) ||
          p.category.toLowerCase().includes(q)
      )
      .slice(0, 6);
  }, [products, searchQuery]);

  // Add product to cart
  const addToCart = (product: Product, qty: number = 1) => {
    setCart((prev) => {
      const existingIndex = prev.findIndex((item) => item.product.id === product.id);
      if (existingIndex > -1) {
        const updated = [...prev];
        const newQty = Math.round((updated[existingIndex].quantity + qty) * 100) / 100;
        updated[existingIndex] = {
          ...updated[existingIndex],
          quantity: newQty,
          total: Math.round(newQty * updated[existingIndex].sellingPrice * 100) / 100,
        };
        return updated;
      } else {
        return [
          ...prev,
          {
            product,
            quantity: qty,
            sellingPrice: product.sellingPrice,
            total: Math.round(qty * product.sellingPrice * 100) / 100,
          },
        ];
      }
    });
    setSearchQuery('');
  };

  // Update item quantity in cart
  const updateQuantity = (productId: string, newQty: number) => {
    if (newQty <= 0) {
      removeFromCart(productId);
      return;
    }
    setCart((prev) =>
      prev.map((item) => {
        if (item.product.id === productId) {
          const cleanQty = Math.round(newQty * 100) / 100;
          return {
            ...item,
            quantity: cleanQty,
            total: Math.round(cleanQty * item.sellingPrice * 100) / 100,
          };
        }
        return item;
      })
    );
  };

  // Update custom selling price in cart
  const updatePrice = (productId: string, newPrice: number) => {
    if (newPrice < 0) return;
    setCart((prev) =>
      prev.map((item) => {
        if (item.product.id === productId) {
          return {
            ...item,
            sellingPrice: newPrice,
            total: Math.round(item.quantity * newPrice * 100) / 100,
          };
        }
        return item;
      })
    );
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
  };

  const clearCart = () => {
    setCart([]);
    setDiscount('0');
    setSelectedCustomerId('');
    setCustomCustomerName('');
    setCustomCustomerPhone('');
    setSaleNotes('');
  };

  // Handle scanned barcode
  const handleBarcodeScanned = (barcode: string) => {
    const matched = products.find(
      (p) => p.barcode && p.barcode.trim().toLowerCase() === barcode.trim().toLowerCase()
    );
    if (matched) {
      addToCart(matched, 1);
      showToast(`Added "${matched.name}" to bill`, 'success');
    } else {
      setSearchQuery(barcode);
      showToast(`No product matched barcode "${barcode}". Add it or search.`, 'info');
    }
  };

  // Calculations
  const subtotal = useMemo(() => {
    return cart.reduce((acc, item) => acc + item.total, 0);
  }, [cart]);

  const calculatedDiscount = useMemo(() => {
    const rawDisc = parseFloat(discount) || 0;
    if (rawDisc <= 0) return 0;
    if (discountType === 'percentage') {
      return Math.min(subtotal, Math.round((subtotal * rawDisc / 100) * 100) / 100);
    }
    return Math.min(subtotal, rawDisc);
  }, [subtotal, discount, discountType]);

  const grandTotal = Math.max(0, Math.round((subtotal - calculatedDiscount) * 100) / 100);

  // Selected customer details
  const selectedCustomer = customers.find((c) => c.id === selectedCustomerId);

  // Complete Sale
  const handleCompleteSale = async () => {
    if (cart.length === 0) {
      showToast('Please add products to the bill first.', 'error');
      return;
    }

    if (paymentMethod === 'Credit' && !selectedCustomerId && !customCustomerName.trim()) {
      showToast('Please select or enter customer name for Credit (Udhaar) sale.', 'error');
      return;
    }

    setSavingSale(true);
    try {
      const itemsPayload = cart.map((item) => ({
        productId: item.product.id,
        name: item.product.name,
        unit: item.product.unit,
        quantity: item.quantity,
        purchasePrice: item.product.purchasePrice,
        sellingPrice: item.sellingPrice,
        total: item.total,
      }));

      const created = await api.createSale({
        items: itemsPayload,
        discount: parseFloat(discount) || 0,
        discountType,
        paymentMethod,
        customerId: selectedCustomerId || undefined,
        customerName: selectedCustomer ? selectedCustomer.name : customCustomerName || undefined,
        customerPhone: selectedCustomer ? selectedCustomer.phone : customCustomerPhone || undefined,
        notes: saleNotes,
      });

      setCompletedSale(created);
      setIsInvoiceOpen(true);
      showToast(`Sale recorded successfully! Bill #${created.invoiceNo}`, 'success');

      // Refresh store data
      await refreshProducts();
      await refreshCustomers();
      await refreshDashboard();

      // Reset cart
      clearCart();
    } catch (err: any) {
      showToast(err.message || 'Failed to save sale', 'error');
    } finally {
      setSavingSale(false);
    }
  };

  return (
    <div className="space-y-4 pb-20 max-w-5xl mx-auto">
      {/* Sub tabs: Billing Screen / Sales History */}
      <div className="flex bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl text-xs font-semibold">
        <button
          onClick={() => handleSubTabChange('billing')}
          className={`flex-1 py-2 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
            activeSubTab === 'billing'
              ? 'bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 shadow-xs'
              : 'text-slate-600 dark:text-slate-400'
          }`}
        >
          <ShoppingCart className="w-4 h-4" />
          <span>Fast Billing Screen</span>
        </button>
        <button
          onClick={() => handleSubTabChange('history')}
          className={`flex-1 py-2 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
            activeSubTab === 'history'
              ? 'bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 shadow-xs'
              : 'text-slate-600 dark:text-slate-400'
          }`}
        >
          <History className="w-4 h-4" />
          <span>Past Bills & Receipts</span>
        </button>
      </div>

      {activeSubTab === 'history' ? (
        /* Sales Invoices History View */
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-xs border border-slate-200/80 dark:border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Past Sales Invoices</h3>
              <p className="text-xs text-slate-500">View and print past customer receipts</p>
            </div>
            <button
              onClick={loadHistory}
              disabled={loadingHistory}
              className="text-xs text-emerald-600 font-semibold hover:underline"
            >
              {loadingHistory ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>

          {salesHistory.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <Receipt className="w-12 h-12 mx-auto mb-2 opacity-30" />
              <p className="text-sm font-medium">No sales recorded yet</p>
              <p className="text-xs mt-1">Switch to Billing tab to generate your first bill.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {salesHistory.map((s) => (
                <div key={s.id} className="py-3 flex items-center justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-slate-900 dark:text-white">
                        #{s.invoiceNo}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${
                          s.paymentMethod === 'Credit'
                            ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                            : s.paymentMethod === 'UPI'
                            ? 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                            : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                        }`}
                      >
                        {s.paymentMethod}
                      </span>
                    </div>
                    <div className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                      {s.customerName || 'Walk-in Customer'} • {s.items.length} items
                    </div>
                    <div className="text-[10px] text-slate-400">
                      {new Date(s.date).toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <span className="text-sm font-extrabold text-slate-900 dark:text-white">
                        ₹{s.grandTotal.toFixed(2)}
                      </span>
                      {s.discount > 0 && (
                        <div className="text-[10px] text-emerald-600">Disc -₹{s.discount}</div>
                      )}
                    </div>
                    <button
                      onClick={() => {
                        setCompletedSale(s);
                        setIsInvoiceOpen(true);
                      }}
                      title="View / Print Receipt"
                      className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-300"
                    >
                      <Printer className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* Fast Billing Interface */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Left Column: Product Search & Quick Add */}
          <div className="lg:col-span-7 space-y-3">
            {/* Live Search & Barcode Scan Card */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-xs border border-slate-200/80 dark:border-slate-800 space-y-2 relative">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                Scan or Search Item to Add to Bill
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    id="billing-search-input"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Type name, barcode (e.g. Sugar, Tata Salt)..."
                    className="w-full pl-9 pr-8 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-emerald-600"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <button
                  id="billing-barcode-scan-btn"
                  onClick={() => setIsScannerOpen(true)}
                  className="px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shrink-0 shadow-xs"
                >
                  <Camera className="w-4 h-4" />
                  <span>Scan</span>
                </button>
              </div>

              {/* Instant Search Results Dropdown */}
              {searchResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1.5 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 z-20 overflow-hidden divide-y divide-slate-100 dark:divide-slate-800">
                  {searchResults.map((prod) => (
                    <button
                      key={prod.id}
                      onClick={() => addToCart(prod, 1)}
                      className="w-full px-4 py-2.5 flex items-center justify-between text-left hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors"
                    >
                      <div>
                        <div className="text-xs font-bold text-slate-900 dark:text-white">{prod.name}</div>
                        <div className="text-[10px] text-slate-500">
                          {prod.category} • Stock: {prod.currentStock} {prod.unit}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs font-extrabold text-emerald-700 dark:text-emerald-400">
                          ₹{prod.sellingPrice}/{prod.unit}
                        </div>
                        <span className="text-[10px] text-emerald-600 font-bold">+ Add to Bill</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Cart Items List */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-xs border border-slate-200/80 dark:border-slate-800">
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 dark:text-white">
                  <ShoppingCart className="w-4 h-4 text-emerald-600" />
                  <span>Current Bill Items ({cart.length})</span>
                </div>
                {cart.length > 0 && (
                  <button
                    onClick={clearCart}
                    className="text-[11px] text-rose-600 dark:text-rose-400 hover:underline font-semibold"
                  >
                    Clear All
                  </button>
                )}
              </div>

              {cart.length === 0 ? (
                <div className="text-center py-10 text-slate-400">
                  <ShoppingCart className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p className="text-xs font-semibold">Bill is currently empty</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Scan a product barcode or search by name above.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-[380px] overflow-y-auto pr-1">
                  {cart.map((item) => (
                    <div key={item.product.id} className="py-2.5 flex items-center justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                          {item.product.name}
                        </div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                          <span>₹{item.sellingPrice}/{item.product.unit}</span>
                          <span>•</span>
                          <span className="font-mono font-semibold text-slate-700 dark:text-slate-300">
                            {item.quantity} {item.product.unit} = ₹{item.total.toFixed(2)}
                          </span>
                        </div>
                      </div>

                      {/* Quantity Modifier (+ / - / input) */}
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                          className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-200"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <input
                          type="number"
                          step="any"
                          min="0.01"
                          value={item.quantity}
                          onChange={(e) =>
                            updateQuantity(item.product.id, parseFloat(e.target.value) || 0)
                          }
                          className="w-14 text-center py-1 text-xs font-bold font-mono bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-emerald-600"
                        />
                        <button
                          onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                          className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-200"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => removeFromCart(item.product.id)}
                          className="w-7 h-7 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 flex items-center justify-center ml-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Customer, Payment Mode, Totals & Save Bill */}
          <div className="lg:col-span-5 space-y-3">
            {/* Customer Section */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-xs border border-slate-200/80 dark:border-slate-800 space-y-2.5">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                Customer Details (Optional / Required for Udhaar)
              </label>

              {/* Select Existing Customer */}
              <select
                value={selectedCustomerId}
                onChange={(e) => {
                  setSelectedCustomerId(e.target.value);
                  if (e.target.value) {
                    setCustomCustomerName('');
                    setCustomCustomerPhone('');
                  }
                }}
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-emerald-600"
              >
                <option value="">-- Select Existing Customer (or Walk-in) --</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.phone ? `(${c.phone})` : ''} • Udhaar: ₹{c.creditBalance || 0}
                  </option>
                ))}
              </select>

              {/* If walk-in or new customer */}
              {!selectedCustomerId && (
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <input
                    type="text"
                    value={customCustomerName}
                    onChange={(e) => setCustomCustomerName(e.target.value)}
                    placeholder="Customer Name"
                    className="px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-emerald-600"
                  />
                  <input
                    type="tel"
                    value={customCustomerPhone}
                    onChange={(e) => setCustomCustomerPhone(e.target.value)}
                    placeholder="Mobile No."
                    className="px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-emerald-600 font-mono"
                  />
                </div>
              )}

              {/* Credit warning / current balance if customer selected */}
              {selectedCustomer && (
                <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-xs flex justify-between items-center text-blue-900 dark:text-blue-200">
                  <span>Current Udhaar Balance:</span>
                  <span className="font-bold font-mono">
                    ₹{(selectedCustomer.creditBalance || 0).toLocaleString('en-IN')}
                  </span>
                </div>
              )}
            </div>

            {/* Payment Method Selector */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-xs border border-slate-200/80 dark:border-slate-800 space-y-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                Payment Method *
              </label>
              <div className="grid grid-cols-2 gap-2">
                {/* Cash */}
                <button
                  type="button"
                  onClick={() => setPaymentMethod('Cash')}
                  className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                    paymentMethod === 'Cash'
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                      : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <Banknote className="w-4 h-4" />
                  <span>Cash</span>
                </button>

                {/* UPI (GPay/PhonePe) */}
                <button
                  type="button"
                  onClick={() => setPaymentMethod('UPI')}
                  className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                    paymentMethod === 'UPI'
                      ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                      : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <QrCode className="w-4 h-4" />
                  <span>UPI / QR</span>
                </button>

                {/* Card */}
                <button
                  type="button"
                  onClick={() => setPaymentMethod('Card')}
                  className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                    paymentMethod === 'Card'
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                      : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <CreditCard className="w-4 h-4" />
                  <span>Card</span>
                </button>

                {/* Udhaar / Credit */}
                <button
                  type="button"
                  onClick={() => setPaymentMethod('Credit')}
                  className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                    paymentMethod === 'Credit'
                      ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                      : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-rose-700 dark:text-rose-300'
                  }`}
                >
                  <BookOpen className="w-4 h-4" />
                  <span>Udhaar (Credit)</span>
                </button>
              </div>
            </div>

            {/* Discount & Totals Breakdown Card */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-xs border border-slate-200/80 dark:border-slate-800 space-y-3">
              {/* Discount Input */}
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Apply Discount
                  </label>
                  <div className="flex gap-1">
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={discount}
                      onChange={(e) => setDiscount(e.target.value)}
                      placeholder="0"
                      className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-mono focus:outline-emerald-600"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setDiscountType((prev) => (prev === 'flat' ? 'percentage' : 'flat'))
                      }
                      className="px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300"
                    >
                      {discountType === 'flat' ? '₹' : '%'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Totals Summary */}
              <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                  <span>Subtotal ({cart.length} items):</span>
                  <span className="font-mono font-semibold">₹{subtotal.toFixed(2)}</span>
                </div>
                {calculatedDiscount > 0 && (
                  <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-semibold">
                    <span>Discount:</span>
                    <span className="font-mono">-₹{calculatedDiscount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between items-center text-base font-extrabold text-slate-900 dark:text-white pt-2 border-t border-slate-200 dark:border-slate-700">
                  <span>Grand Total:</span>
                  <span className="text-xl font-mono text-emerald-700 dark:text-emerald-400">
                    ₹{grandTotal.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Complete Sale Button */}
              <button
                id="complete-sale-btn"
                onClick={handleCompleteSale}
                disabled={cart.length === 0 || savingSale}
                className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold rounded-xl text-sm shadow-md flex items-center justify-center gap-2 transition-all active:scale-[0.99]"
              >
                <CheckCircle2 className="w-5 h-5" />
                <span>
                  {savingSale
                    ? 'Recording Bill...'
                    : `Save Bill • ₹${grandTotal.toFixed(2)} (${paymentMethod})`}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Barcode Scanner Modal */}
      <BarcodeScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScan={handleBarcodeScanned}
        title="Scan Barcode to Add Item"
      />

      {/* Printable Digital Invoice Receipt Modal */}
      <PrintInvoiceModal
        isOpen={isInvoiceOpen}
        onClose={() => setIsInvoiceOpen(false)}
        sale={completedSale}
        settings={settings}
      />
    </div>
  );
};
