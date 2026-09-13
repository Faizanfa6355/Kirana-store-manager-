import React, { useState, useMemo } from 'react';
import {
  Plus,
  Search,
  Users,
  Phone,
  MapPin,
  CreditCard,
  Edit2,
  Trash2,
  X,
  CheckCircle2,
  ArrowDownLeft,
  ArrowUpRight,
  Receipt,
  BookOpen,
} from 'lucide-react';
import { Customer } from '../types.js';
import { useStore } from '../context/StoreContext.js';
import { api } from '../api/client.js';

interface CustomersViewProps {
  isAddModalOpen?: boolean;
  onCloseAddModal?: () => void;
}

export const CustomersView: React.FC<CustomersViewProps> = ({
  isAddModalOpen: externalAddOpen,
  onCloseAddModal: externalCloseAdd,
}) => {
  const { customers, refreshCustomers, refreshDashboard, showToast } = useStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterCreditOnly, setFilterCreditOnly] = useState(false);

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [paymentModalCustomer, setPaymentModalCustomer] = useState<Customer | null>(null);
  const [creditModalCustomer, setCreditModalCustomer] = useState<Customer | null>(null);
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    address: '',
  });

  // Payment / Credit Action Amount State
  const [actionAmount, setActionAmount] = useState('');
  const [actionNotes, setActionNotes] = useState('');

  const isFormOpen = externalAddOpen || isModalOpen;

  const handleOpenAdd = () => {
    setEditingCustomer(null);
    setFormData({ name: '', phone: '', address: '' });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (c: Customer) => {
    setEditingCustomer(c);
    setFormData({
      name: c.name,
      phone: c.phone || '',
      address: c.address || '',
    });
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingCustomer(null);
    if (externalCloseAdd) externalCloseAdd();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      showToast('Customer name is required', 'error');
      return;
    }

    setSaving(true);
    try {
      if (editingCustomer) {
        await api.updateCustomer(editingCustomer.id, formData);
        showToast(`Updated "${formData.name}"`, 'success');
      } else {
        await api.createCustomer(formData);
        showToast(`Added customer "${formData.name}"`, 'success');
      }
      await refreshCustomers();
      await refreshDashboard();
      handleCloseModal();
    } catch (err: any) {
      showToast(err.message || 'Failed to save customer', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    try {
      await api.deleteCustomer(id);
      showToast(`Deleted customer "${name}"`, 'success');
      await refreshCustomers();
      await refreshDashboard();
      setIsDeletingId(null);
    } catch (err: any) {
      showToast(err.message || 'Failed to delete customer', 'error');
    }
  };

  // Record customer payment (Udhaar recovery)
  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentModalCustomer) return;

    const amount = parseFloat(actionAmount) || 0;
    if (amount <= 0) {
      showToast('Please enter a valid payment amount', 'error');
      return;
    }

    setSaving(true);
    try {
      await api.addCustomerPayment(paymentModalCustomer.id, {
        amount,
        notes: actionNotes || 'Payment received',
      });
      showToast(`Recorded ₹${amount} payment from ${paymentModalCustomer.name}`, 'success');
      await refreshCustomers();
      await refreshDashboard();
      setPaymentModalCustomer(null);
      setActionAmount('');
      setActionNotes('');
    } catch (err: any) {
      showToast(err.message || 'Failed to record payment', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Add manual credit
  const handleAddCredit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!creditModalCustomer) return;

    const amount = parseFloat(actionAmount) || 0;
    if (amount <= 0) {
      showToast('Please enter a valid credit amount', 'error');
      return;
    }

    setSaving(true);
    try {
      await api.addCustomerCredit(creditModalCustomer.id, {
        amount,
        notes: actionNotes || 'Manual Udhaar recorded',
      });
      showToast(`Added ₹${amount} credit to ${creditModalCustomer.name}`, 'success');
      await refreshCustomers();
      await refreshDashboard();
      setCreditModalCustomer(null);
      setActionAmount('');
      setActionNotes('');
    } catch (err: any) {
      showToast(err.message || 'Failed to add credit', 'error');
    } finally {
      setSaving(false);
    }
  };

  const filteredCustomers = useMemo(() => {
    return customers.filter((c) => {
      if (filterCreditOnly && (c.creditBalance || 0) <= 0) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = c.name.toLowerCase().includes(q);
        const matchPhone = (c.phone || '').includes(q);
        const matchAddress = (c.address || '').toLowerCase().includes(q);
        return matchName || matchPhone || matchAddress;
      }
      return true;
    });
  }, [customers, filterCreditOnly, searchQuery]);

  const totalOutstanding = useMemo(() => {
    return customers.reduce((acc, c) => acc + (c.creditBalance || 0), 0);
  }, [customers]);

  return (
    <div className="space-y-4 pb-20 max-w-5xl mx-auto">
      {/* Top Header Card */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-xs border border-slate-200/80 dark:border-slate-800 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Customer Khata</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Manage regular customer accounts and track pending balances
            </p>
          </div>
          <button
            id="add-customer-btn"
            onClick={handleOpenAdd}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Add Customer</span>
          </button>
        </div>

        {/* Outstanding credit highlight banner */}
        <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-xl flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-rose-800 dark:text-rose-200 font-medium">
            <BookOpen className="w-4 h-4 text-rose-600" />
            <span>Total Customer Udhaar Pending:</span>
          </div>
          <span className="text-base font-extrabold font-mono text-rose-700 dark:text-rose-300">
            ₹{totalOutstanding.toLocaleString('en-IN')}
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
              placeholder="Search customer by name or phone..."
              className="w-full pl-9 pr-8 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-emerald-600"
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
            onClick={() => setFilterCreditOnly((prev) => !prev)}
            className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${
              filterCreditOnly
                ? 'bg-rose-600 text-white border-rose-600'
                : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
            }`}
          >
            {filterCreditOnly ? 'With Due Only' : 'All Customers'}
          </button>
        </div>
      </div>

      {/* Customer List */}
      {filteredCustomers.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-10 text-center border border-slate-200/80 dark:border-slate-800">
          <Users className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">No customers found</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {searchQuery
              ? 'No customer matched your search terms.'
              : 'Add your first customer to keep track of their purchases and credit khata.'}
          </p>
          <button
            onClick={handleOpenAdd}
            className="mt-3 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            Add Customer
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {filteredCustomers.map((c) => {
            const hasCredit = (c.creditBalance || 0) > 0;

            return (
              <div
                key={c.id}
                id={`customer-card-${c.id}`}
                className={`bg-white dark:bg-slate-900 rounded-2xl p-4 border shadow-xs transition-all relative ${
                  hasCredit
                    ? 'border-rose-300 dark:border-rose-900/60 bg-rose-50/15'
                    : 'border-slate-200/80 dark:border-slate-800'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-sm text-slate-900 dark:text-white truncate">
                      {c.name}
                    </h3>
                    <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {c.phone ? (
                        <span className="flex items-center gap-1 font-mono">
                          <Phone className="w-3 h-3 text-slate-400" />
                          {c.phone}
                        </span>
                      ) : (
                        <span>No phone</span>
                      )}
                      {c.address && (
                        <span className="flex items-center gap-0.5 truncate">
                          • <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                          {c.address}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => handleOpenEdit(c)}
                      title="Edit Customer"
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setIsDeletingId(c.id)}
                      title="Delete Customer"
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Balance & Stats Row */}
                <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 block leading-tight">Total Purchases</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-300 font-mono">
                      ₹{(c.totalPurchases || 0).toLocaleString('en-IN')}
                    </span>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 block leading-tight">Udhaar Due</span>
                    <span
                      className={`text-base font-extrabold font-mono ${
                        hasCredit
                          ? 'text-rose-600 dark:text-rose-400'
                          : 'text-emerald-600 dark:text-emerald-400'
                      }`}
                    >
                      ₹{(c.creditBalance || 0).toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>

                {/* Quick Payment / Add Credit buttons */}
                <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 grid grid-cols-2 gap-2">
                  <button
                    onClick={() => {
                      setPaymentModalCustomer(c);
                      setActionAmount(c.creditBalance ? c.creditBalance.toString() : '');
                    }}
                    className="py-1.5 px-2 rounded-xl bg-emerald-50 hover:bg-emerald-100/80 dark:bg-emerald-950/50 dark:hover:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800 text-[11px] font-bold flex items-center justify-center gap-1 transition-colors"
                  >
                    <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Receive Payment</span>
                  </button>

                  <button
                    onClick={() => {
                      setCreditModalCustomer(c);
                      setActionAmount('');
                    }}
                    className="py-1.5 px-2 rounded-xl bg-rose-50 hover:bg-rose-100/80 dark:bg-rose-950/50 dark:hover:bg-rose-900/60 text-rose-800 dark:text-rose-200 border border-rose-200 dark:border-rose-800 text-[11px] font-bold flex items-center justify-center gap-1 transition-colors"
                  >
                    <ArrowUpRight className="w-3.5 h-3.5 text-rose-600" />
                    <span>Give Udhaar</span>
                  </button>
                </div>

                {/* Delete Confirmation */}
                {isDeletingId === c.id && (
                  <div className="absolute inset-0 bg-white/95 dark:bg-slate-900/95 rounded-2xl p-4 flex flex-col items-center justify-center text-center z-10 animate-in fade-in">
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                      Delete customer "{c.name}"?
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-3">
                      This will remove their contact record.
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setIsDeletingId(null)}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleDelete(c.id, c.name)}
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

      {/* Add / Edit Customer Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 overflow-y-auto animate-in fade-in">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 flex flex-col my-auto">
            <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base text-slate-900 dark:text-white">
                  {editingCustomer ? 'Edit Customer' : 'Add New Customer'}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Save customer profile for credit records & billing
                </p>
              </div>
              <button
                onClick={handleCloseModal}
                className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Customer Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Ramesh Kumar"
                  className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-emerald-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Mobile Number (Optional)
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="e.g. 9876543210"
                  className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-mono focus:outline-emerald-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Address / Locality (Optional)
                </label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="e.g. Flat 203, Main Bazar"
                  className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-emerald-600"
                />
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold shadow-xs flex items-center justify-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{saving ? 'Saving...' : editingCustomer ? 'Update' : 'Save Customer'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Record Payment Modal */}
      {paymentModalCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 overflow-y-auto animate-in fade-in">
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 flex flex-col my-auto">
            <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base text-slate-900 dark:text-white">Receive Payment</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  From: {paymentModalCustomer.name}
                </p>
              </div>
              <button
                onClick={() => setPaymentModalCustomer(null)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRecordPayment} className="p-5 space-y-3.5">
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl border border-emerald-200 dark:border-emerald-800 text-xs flex justify-between items-center">
                <span className="text-emerald-900 dark:text-emerald-200 font-medium">
                  Current Udhaar Due:
                </span>
                <span className="font-bold font-mono text-emerald-800 dark:text-emerald-300">
                  ₹{(paymentModalCustomer.creditBalance || 0).toLocaleString('en-IN')}
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Amount Received (₹) *
                </label>
                <input
                  type="number"
                  step="any"
                  min="0.01"
                  required
                  autoFocus
                  value={actionAmount}
                  onChange={(e) => setActionAmount(e.target.value)}
                  placeholder="₹ 0.00"
                  className="w-full px-3 py-2 text-base font-bold font-mono bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-emerald-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Payment Mode / Note
                </label>
                <input
                  type="text"
                  value={actionNotes}
                  onChange={(e) => setActionNotes(e.target.value)}
                  placeholder="e.g. Cash, GPay, partial payment"
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-emerald-600"
                />
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setPaymentModalCustomer(null)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold shadow-xs flex items-center justify-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{saving ? 'Recording...' : 'Record Payment'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Give Manual Credit Modal */}
      {creditModalCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 overflow-y-auto animate-in fade-in">
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 flex flex-col my-auto">
            <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base text-slate-900 dark:text-white">Give Udhaar (Credit)</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  To: {creditModalCustomer.name}
                </p>
              </div>
              <button
                onClick={() => setCreditModalCustomer(null)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddCredit} className="p-5 space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Credit Amount (₹) *
                </label>
                <input
                  type="number"
                  step="any"
                  min="0.01"
                  required
                  autoFocus
                  value={actionAmount}
                  onChange={(e) => setActionAmount(e.target.value)}
                  placeholder="₹ 0.00"
                  className="w-full px-3 py-2 text-base font-bold font-mono bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-rose-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Reason / Item Description
                </label>
                <input
                  type="text"
                  value={actionNotes}
                  onChange={(e) => setActionNotes(e.target.value)}
                  placeholder="e.g. Atta & Oil took on credit"
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-rose-600"
                />
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setCreditModalCustomer(null)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-xs font-bold shadow-xs flex items-center justify-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{saving ? 'Saving...' : 'Add Udhaar'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
