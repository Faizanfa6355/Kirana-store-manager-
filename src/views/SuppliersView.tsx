import React, { useState, useMemo } from 'react';
import {
  Plus,
  Search,
  Building2,
  Phone,
  MapPin,
  Package,
  Edit2,
  Trash2,
  X,
  CheckCircle2,
  ArrowDownLeft,
  Truck,
} from 'lucide-react';
import { Supplier } from '../types.js';
import { useStore } from '../context/StoreContext.js';
import { api } from '../api/client.js';

export const SuppliersView: React.FC = () => {
  const { suppliers, refreshSuppliers, refreshDashboard, showToast } = useStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterDueOnly, setFilterDueOnly] = useState(false);

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [paymentModalSupplier, setPaymentModalSupplier] = useState<Supplier | null>(null);
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    address: '',
    productsSupplied: '',
  });

  const [payAmount, setPayAmount] = useState('');
  const [payNotes, setPayNotes] = useState('');

  const handleOpenAdd = () => {
    setEditingSupplier(null);
    setFormData({ name: '', phone: '', address: '', productsSupplied: '' });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (s: Supplier) => {
    setEditingSupplier(s);
    setFormData({
      name: s.name,
      phone: s.phone || '',
      address: s.address || '',
      productsSupplied: s.productsSupplied || '',
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      showToast('Supplier name is required', 'error');
      return;
    }

    setSaving(true);
    try {
      if (editingSupplier) {
        await api.updateSupplier(editingSupplier.id, formData);
        showToast(`Updated "${formData.name}"`, 'success');
      } else {
        await api.createSupplier(formData);
        showToast(`Added supplier "${formData.name}"`, 'success');
      }
      await refreshSuppliers();
      await refreshDashboard();
      setIsModalOpen(false);
    } catch (err: any) {
      showToast(err.message || 'Failed to save supplier', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    try {
      await api.deleteSupplier(id);
      showToast(`Deleted supplier "${name}"`, 'success');
      await refreshSuppliers();
      await refreshDashboard();
      setIsDeletingId(null);
    } catch (err: any) {
      showToast(err.message || 'Failed to delete supplier', 'error');
    }
  };

  // Pay supplier
  const handlePaySupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentModalSupplier) return;

    const amount = parseFloat(payAmount) || 0;
    if (amount <= 0) {
      showToast('Please enter a valid payment amount', 'error');
      return;
    }

    setSaving(true);
    try {
      await api.addSupplierPayment(paymentModalSupplier.id, {
        amount,
        notes: payNotes || 'Payment to supplier',
      });
      showToast(`Recorded ₹${amount} payment to ${paymentModalSupplier.name}`, 'success');
      await refreshSuppliers();
      await refreshDashboard();
      setPaymentModalSupplier(null);
      setPayAmount('');
      setPayNotes('');
    } catch (err: any) {
      showToast(err.message || 'Failed to record payment', 'error');
    } finally {
      setSaving(false);
    }
  };

  const filteredSuppliers = useMemo(() => {
    return suppliers.filter((s) => {
      if (filterDueOnly && (s.outstandingBalance || 0) <= 0) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = s.name.toLowerCase().includes(q);
        const matchPhone = (s.phone || '').includes(q);
        const matchProducts = (s.productsSupplied || '').toLowerCase().includes(q);
        return matchName || matchPhone || matchProducts;
      }
      return true;
    });
  }, [suppliers, filterDueOnly, searchQuery]);

  const totalPayable = useMemo(() => {
    return suppliers.reduce((acc, s) => acc + (s.outstandingBalance || 0), 0);
  }, [suppliers]);

  return (
    <div className="space-y-4 pb-20 max-w-5xl mx-auto">
      {/* Top Header Card */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-xs border border-slate-200/80 dark:border-slate-800 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Wholesalers & Suppliers</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Manage inventory vendors and track outstanding supplier bills
            </p>
          </div>
          <button
            id="add-supplier-btn"
            onClick={handleOpenAdd}
            className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Add Supplier</span>
          </button>
        </div>

        {/* Total Payable banner */}
        <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 rounded-xl flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-amber-900 dark:text-amber-200 font-medium">
            <Truck className="w-4 h-4 text-amber-600" />
            <span>Total Outstanding Due to Suppliers:</span>
          </div>
          <span className="text-base font-extrabold font-mono text-amber-800 dark:text-amber-300">
            ₹{totalPayable.toLocaleString('en-IN')}
          </span>
        </div>

        {/* Search and Filters */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by supplier name, phone, or supplied goods..."
              className="w-full pl-9 pr-8 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-blue-600"
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
            onClick={() => setFilterDueOnly((prev) => !prev)}
            className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${
              filterDueOnly
                ? 'bg-amber-600 text-white border-amber-600'
                : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
            }`}
          >
            {filterDueOnly ? 'With Due Only' : 'All Suppliers'}
          </button>
        </div>
      </div>

      {/* Supplier List */}
      {filteredSuppliers.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-10 text-center border border-slate-200/80 dark:border-slate-800">
          <Building2 className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">No suppliers found</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Add wholesale distributors and vendors you purchase goods from.
          </p>
          <button
            onClick={handleOpenAdd}
            className="mt-3 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            Add First Supplier
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {filteredSuppliers.map((s) => {
            const hasDue = (s.outstandingBalance || 0) > 0;

            return (
              <div
                key={s.id}
                id={`supplier-card-${s.id}`}
                className={`bg-white dark:bg-slate-900 rounded-2xl p-4 border shadow-xs transition-all relative ${
                  hasDue
                    ? 'border-amber-300 dark:border-amber-900/60 bg-amber-50/15'
                    : 'border-slate-200/80 dark:border-slate-800'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-sm text-slate-900 dark:text-white truncate">
                      {s.name}
                    </h3>
                    <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {s.phone ? (
                        <span className="flex items-center gap-1 font-mono">
                          <Phone className="w-3 h-3 text-slate-400" />
                          {s.phone}
                        </span>
                      ) : (
                        <span>No phone</span>
                      )}
                      {s.address && (
                        <span className="flex items-center gap-0.5 truncate">
                          • <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                          {s.address}
                        </span>
                      )}
                    </div>
                    {s.productsSupplied && (
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1">
                        <Package className="w-3 h-3 text-slate-400 shrink-0" />
                        <span className="truncate">{s.productsSupplied}</span>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => handleOpenEdit(s)}
                      title="Edit Supplier"
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setIsDeletingId(s.id)}
                      title="Delete Supplier"
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Outstanding & Total purchases */}
                <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 block leading-tight">Total Purchases</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-300 font-mono">
                      ₹{(s.totalPurchases || 0).toLocaleString('en-IN')}
                    </span>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 block leading-tight">Payable Due</span>
                    <span
                      className={`text-base font-extrabold font-mono ${
                        hasDue
                          ? 'text-amber-600 dark:text-amber-400'
                          : 'text-emerald-600 dark:text-emerald-400'
                      }`}
                    >
                      ₹{(s.outstandingBalance || 0).toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>

                {/* Pay Supplier Button */}
                {hasDue && (
                  <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800">
                    <button
                      onClick={() => {
                        setPaymentModalSupplier(s);
                        setPayAmount(s.outstandingBalance.toString());
                      }}
                      className="w-full py-1.5 px-3 rounded-xl bg-blue-50 hover:bg-blue-100/80 dark:bg-blue-950/50 dark:hover:bg-blue-900/60 text-blue-800 dark:text-blue-200 border border-blue-200 dark:border-blue-800 text-[11px] font-bold flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <ArrowDownLeft className="w-3.5 h-3.5 text-blue-600" />
                      <span>Pay Supplier (Clear Due)</span>
                    </button>
                  </div>
                )}

                {/* Delete Confirmation */}
                {isDeletingId === s.id && (
                  <div className="absolute inset-0 bg-white/95 dark:bg-slate-900/95 rounded-2xl p-4 flex flex-col items-center justify-center text-center z-10 animate-in fade-in">
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                      Delete supplier "{s.name}"?
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-3">
                      This will remove their vendor profile.
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setIsDeletingId(null)}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleDelete(s.id, s.name)}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-600 text-white"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Supplier Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 overflow-y-auto animate-in fade-in">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 flex flex-col my-auto">
            <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base text-slate-900 dark:text-white">
                  {editingSupplier ? 'Edit Supplier' : 'Add New Supplier'}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Wholesaler / distributor details
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Supplier / Agency Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Mahalakshmi Traders"
                  className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-blue-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="e.g. 9822011223"
                  className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-mono focus:outline-blue-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Address / Wholesale Market
                </label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="e.g. Grain Market, Yard 4"
                  className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-blue-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Products Supplied
                </label>
                <input
                  type="text"
                  value={formData.productsSupplied}
                  onChange={(e) => setFormData({ ...formData, productsSupplied: e.target.value })}
                  placeholder="e.g. Rice, Pulses, Mustard Oil"
                  className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-blue-600"
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
                  <span>{saving ? 'Saving...' : editingSupplier ? 'Update' : 'Save Supplier'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Pay Supplier Modal */}
      {paymentModalSupplier && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 overflow-y-auto animate-in fade-in">
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 flex flex-col my-auto">
            <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base text-slate-900 dark:text-white">Pay Supplier</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Pay to: {paymentModalSupplier.name}
                </p>
              </div>
              <button
                onClick={() => setPaymentModalSupplier(null)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handlePaySupplier} className="p-5 space-y-3.5">
              <div className="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-xl border border-amber-200 dark:border-amber-800 text-xs flex justify-between items-center">
                <span className="text-amber-900 dark:text-amber-200 font-medium">
                  Current Balance Due:
                </span>
                <span className="font-bold font-mono text-amber-800 dark:text-amber-300">
                  ₹{(paymentModalSupplier.outstandingBalance || 0).toLocaleString('en-IN')}
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Payment Amount (₹) *
                </label>
                <input
                  type="number"
                  step="any"
                  min="0.01"
                  required
                  autoFocus
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  placeholder="₹ 0.00"
                  className="w-full px-3 py-2 text-base font-bold font-mono bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-blue-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Payment Note (Cheque / RTGS / Cash)
                </label>
                <input
                  type="text"
                  value={payNotes}
                  onChange={(e) => setPayNotes(e.target.value)}
                  placeholder="e.g. Bank transfer, Ref #19203"
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-blue-600"
                />
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setPaymentModalSupplier(null)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold shadow-xs flex items-center justify-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{saving ? 'Recording...' : 'Confirm Payment'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
