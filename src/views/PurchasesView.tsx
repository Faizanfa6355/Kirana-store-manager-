import React, { useState, useMemo, useEffect } from 'react';
import {
  Plus,
  Truck,
  Search,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Package,
  X,
  CreditCard,
  Building2,
} from 'lucide-react';
import { Purchase, Product, Supplier } from '../types.js';
import { useStore } from '../context/StoreContext.js';
import { api } from '../api/client.js';

export const PurchasesView: React.FC = () => {
  const { products, suppliers, refreshProducts, refreshSuppliers, refreshDashboard, showToast } = useStore();

  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    supplierId: '',
    supplierName: '',
    productId: '',
    productName: '',
    quantity: '',
    unit: 'piece',
    purchasePrice: '',
    date: new Date().toISOString().split('T')[0],
    paymentStatus: 'Paid' as 'Paid' | 'Credit' | 'Partial',
    amountPaid: '',
    notes: '',
  });

  const loadPurchases = async () => {
    setLoading(true);
    try {
      const data = await api.getPurchases();
      setPurchases(data);
    } catch (err: any) {
      showToast(err.message || 'Failed to load purchases', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPurchases();
  }, []);

  const handleOpenAdd = () => {
    setFormData({
      supplierId: '',
      supplierName: '',
      productId: '',
      productName: '',
      quantity: '',
      unit: 'piece',
      purchasePrice: '',
      date: new Date().toISOString().split('T')[0],
      paymentStatus: 'Paid',
      amountPaid: '',
      notes: '',
    });
    setIsModalOpen(true);
  };

  // When a product is selected from dropdown, pre-fill its unit and current purchase price
  const handleProductSelect = (prodId: string) => {
    const prod = products.find((p) => p.id === prodId);
    if (prod) {
      setFormData((prev) => ({
        ...prev,
        productId: prod.id,
        productName: prod.name,
        unit: prod.unit,
        purchasePrice: prod.purchasePrice.toString(),
      }));
    } else {
      setFormData((prev) => ({ ...prev, productId: '', productName: '' }));
    }
  };

  // When a supplier is selected, pre-fill supplierName
  const handleSupplierSelect = (suppId: string) => {
    const supp = suppliers.find((s) => s.id === suppId);
    if (supp) {
      setFormData((prev) => ({
        ...prev,
        supplierId: supp.id,
        supplierName: supp.name,
      }));
    } else {
      setFormData((prev) => ({ ...prev, supplierId: '', supplierName: '' }));
    }
  };

  const calculatedTotal = (parseFloat(formData.quantity) || 0) * (parseFloat(formData.purchasePrice) || 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.productName.trim() && !formData.productId) {
      showToast('Please select or specify a product', 'error');
      return;
    }

    const qty = parseFloat(formData.quantity) || 0;
    const price = parseFloat(formData.purchasePrice) || 0;

    if (qty <= 0 || price < 0) {
      showToast('Please enter valid quantity and price', 'error');
      return;
    }

    setSaving(true);
    try {
      await api.createPurchase({
        supplierId: formData.supplierId || undefined,
        supplierName: formData.supplierName || 'General Supplier',
        productId: formData.productId || undefined,
        productName: formData.productName,
        quantity: qty,
        unit: formData.unit,
        purchasePrice: price,
        date: formData.date,
        paymentStatus: formData.paymentStatus,
        amountPaid: parseFloat(formData.amountPaid) || 0,
        notes: formData.notes,
      });

      showToast(`Purchase recorded! Inventory increased by ${qty} ${formData.unit}`, 'success');
      await refreshProducts();
      await refreshSuppliers();
      await refreshDashboard();
      await loadPurchases();
      setIsModalOpen(false);
    } catch (err: any) {
      showToast(err.message || 'Failed to record purchase', 'error');
    } finally {
      setSaving(false);
    }
  };

  const filteredPurchases = useMemo(() => {
    if (!searchQuery.trim()) return purchases;
    const q = searchQuery.toLowerCase().trim();
    return purchases.filter(
      (p) =>
        p.productName.toLowerCase().includes(q) ||
        p.supplierName.toLowerCase().includes(q) ||
        (p.notes && p.notes.toLowerCase().includes(q))
    );
  }, [purchases, searchQuery]);

  return (
    <div className="space-y-4 pb-20 max-w-5xl mx-auto">
      {/* Header & Add Button */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-xs border border-slate-200/80 dark:border-slate-800 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Purchases (Stock In)</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Record supplier orders and automatically update stock
            </p>
          </div>
          <button
            id="add-purchase-btn"
            onClick={handleOpenAdd}
            className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Add Purchase</span>
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by product or supplier name..."
            className="w-full pl-9 pr-8 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-blue-600"
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
      </div>

      {/* Purchases List */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-xs border border-slate-200/80 dark:border-slate-800">
        <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">
          Purchase History ({filteredPurchases.length})
        </h3>

        {filteredPurchases.length === 0 ? (
          <div className="text-center py-10 text-slate-400">
            <Truck className="w-12 h-12 mx-auto mb-2 opacity-30" />
            <p className="text-xs font-semibold">No purchase records found</p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Click "Add Purchase" to log stock bought from wholesalers.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {filteredPurchases.map((p) => (
              <div key={p.id} className="py-3 flex items-center justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-900 dark:text-white">
                      {p.productName}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${
                        p.paymentStatus === 'Paid'
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                          : p.paymentStatus === 'Credit'
                          ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                          : 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                      }`}
                    >
                      {p.paymentStatus}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-1.5">
                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                      +{p.quantity} {p.unit}
                    </span>
                    <span>@ ₹{p.purchasePrice}/{p.unit}</span>
                    <span>• Supplier: {p.supplierName}</span>
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    {new Date(p.date).toLocaleDateString('en-IN', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })}
                    {p.notes && ` • ${p.notes}`}
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-sm font-extrabold text-slate-900 dark:text-white">
                    ₹{p.totalAmount.toFixed(2)}
                  </div>
                  {p.paymentStatus !== 'Paid' && (
                    <div className="text-[10px] text-rose-600 font-semibold">
                      Due: ₹{(p.totalAmount - (p.amountPaid || 0)).toFixed(2)}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Purchase Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 overflow-y-auto animate-in fade-in">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 flex flex-col my-auto max-h-[90vh]">
            <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base text-slate-900 dark:text-white">Record Purchase</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Stock will be added to your inventory automatically
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-3.5 overflow-y-auto">
              {/* Product Selection */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Product *
                </label>
                <select
                  value={formData.productId}
                  onChange={(e) => handleProductSelect(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-blue-600 mb-2"
                >
                  <option value="">-- Select from Existing Products --</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} (Current Stock: {p.currentStock} {p.unit})
                    </option>
                  ))}
                </select>

                {!formData.productId && (
                  <input
                    type="text"
                    required
                    value={formData.productName}
                    onChange={(e) => setFormData({ ...formData, productName: e.target.value })}
                    placeholder="Or type new product name to auto-create..."
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-blue-600"
                  />
                )}
              </div>

              {/* Quantity, Unit & Purchase Price */}
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Quantity *
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="0.01"
                    required
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                    placeholder="0"
                    className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-mono focus:outline-blue-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Unit *
                  </label>
                  <select
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    className="w-full px-2 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-blue-600"
                  >
                    <option value="kg">kg</option>
                    <option value="g">gram (g)</option>
                    <option value="litre">litre (L)</option>
                    <option value="ml">ml</option>
                    <option value="piece">piece</option>
                    <option value="packet">packet</option>
                    <option value="box">box</option>
                    <option value="dozen">dozen</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Cost Price (₹) *
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    required
                    value={formData.purchasePrice}
                    onChange={(e) => setFormData({ ...formData, purchasePrice: e.target.value })}
                    placeholder="₹ 0.00"
                    className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-mono focus:outline-blue-600"
                  />
                </div>
              </div>

              {/* Total Calculation Display */}
              <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 flex items-center justify-between text-xs">
                <span className="font-semibold text-blue-900 dark:text-blue-200">
                  Total Purchase Cost:
                </span>
                <span className="text-base font-extrabold font-mono text-blue-800 dark:text-blue-300">
                  ₹{calculatedTotal.toFixed(2)}
                </span>
              </div>

              {/* Supplier Selection */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Supplier (Wholesaler)
                </label>
                <select
                  value={formData.supplierId}
                  onChange={(e) => handleSupplierSelect(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-blue-600 mb-2"
                >
                  <option value="">-- Select Existing Supplier --</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} {s.phone ? `(${s.phone})` : ''}
                    </option>
                  ))}
                </select>

                {!formData.supplierId && (
                  <input
                    type="text"
                    value={formData.supplierName}
                    onChange={(e) => setFormData({ ...formData, supplierName: e.target.value })}
                    placeholder="Or type supplier / distributor name..."
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-blue-600"
                  />
                )}
              </div>

              {/* Payment Status & Amount Paid */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Payment Status
                  </label>
                  <select
                    value={formData.paymentStatus}
                    onChange={(e) => setFormData({ ...formData, paymentStatus: e.target.value as any })}
                    className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-blue-600"
                  >
                    <option value="Paid">Fully Paid</option>
                    <option value="Credit">Credit (Pay Later)</option>
                    <option value="Partial">Partial Payment</option>
                  </select>
                </div>

                {formData.paymentStatus === 'Partial' ? (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Amount Paid Now (₹)
                    </label>
                    <input
                      type="number"
                      step="any"
                      value={formData.amountPaid}
                      onChange={(e) => setFormData({ ...formData, amountPaid: e.target.value })}
                      placeholder="0"
                      className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-mono focus:outline-blue-600"
                    />
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Purchase Date
                    </label>
                    <input
                      type="date"
                      value={formData.date}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                      className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-blue-600"
                    />
                  </div>
                )}
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Notes (Invoice / Batch No.)
                </label>
                <input
                  type="text"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="e.g. Bill #4829, Batch exp 2027"
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-blue-600"
                />
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold shadow-xs flex items-center justify-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{saving ? 'Saving...' : 'Save Purchase'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
