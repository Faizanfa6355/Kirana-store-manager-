import React, { useState, useEffect, useMemo } from 'react';
import {
  BookOpen,
  Search,
  ArrowDownLeft,
  ArrowUpRight,
  Users,
  Building2,
  Calendar,
  History,
  CheckCircle2,
  X,
  CreditCard,
  Plus,
} from 'lucide-react';
import { Customer, Supplier, CreditTransaction } from '../types.js';
import { useStore } from '../context/StoreContext.js';
import { api } from '../api/client.js';

export const UdhaarView: React.FC = () => {
  const { customers, suppliers, refreshCustomers, refreshSuppliers, refreshDashboard, showToast } = useStore();

  const [activeTab, setActiveTab] = useState<'customers' | 'suppliers' | 'history'>('customers');
  const [searchQuery, setSearchQuery] = useState('');
  const [historyList, setHistoryList] = useState<CreditTransaction[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Quick Action Modal State
  const [actionPartyType, setActionPartyType] = useState<'customer' | 'supplier'>('customer');
  const [selectedPartyId, setSelectedPartyId] = useState<string>('');
  const [actionKind, setActionKind] = useState<'payment' | 'credit'>('payment');
  const [actionAmount, setActionAmount] = useState('');
  const [actionNotes, setActionNotes] = useState('');
  const [isActionModalOpen, setIsActionModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadHistory = async () => {
    setLoadingHistory(true);
    try {
      const data = await api.getUdhaarTransactions();
      setHistoryList(data);
    } catch (err: any) {
      showToast(err.message || 'Failed to load ledger transactions', 'error');
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'history') {
      loadHistory();
    }
  }, [activeTab]);

  // Overall calculations
  const totalCustomerCredit = useMemo(() => {
    return customers.reduce((sum, c) => sum + (c.creditBalance || 0), 0);
  }, [customers]);

  const totalSupplierPayables = useMemo(() => {
    return suppliers.reduce((sum, s) => sum + (s.outstandingBalance || 0), 0);
  }, [suppliers]);

  // Customers with pending credit
  const filteredCustomers = useMemo(() => {
    return customers
      .filter((c) => (c.creditBalance || 0) > 0 || !searchQuery)
      .filter((c) => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase().trim();
        return c.name.toLowerCase().includes(q) || (c.phone || '').includes(q);
      });
  }, [customers, searchQuery]);

  // Suppliers with pending payables
  const filteredSuppliers = useMemo(() => {
    return suppliers
      .filter((s) => (s.outstandingBalance || 0) > 0 || !searchQuery)
      .filter((s) => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase().trim();
        return s.name.toLowerCase().includes(q) || (s.phone || '').includes(q);
      });
  }, [suppliers, searchQuery]);

  const openCustomerAction = (customerId: string, kind: 'payment' | 'credit') => {
    setActionPartyType('customer');
    setSelectedPartyId(customerId);
    setActionKind(kind);
    setActionAmount('');
    setActionNotes('');
    setIsActionModalOpen(true);
  };

  const openSupplierAction = (supplierId: string) => {
    setActionPartyType('supplier');
    setSelectedPartyId(supplierId);
    setActionKind('payment');
    setActionAmount('');
    setActionNotes('');
    setIsActionModalOpen(true);
  };

  const handleActionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(actionAmount) || 0;
    if (amount <= 0) {
      showToast('Please enter a valid amount', 'error');
      return;
    }

    setSaving(true);
    try {
      if (actionPartyType === 'customer') {
        if (actionKind === 'payment') {
          await api.addCustomerPayment(selectedPartyId, {
            amount,
            notes: actionNotes || 'Payment received',
          });
          showToast(`Recorded ₹${amount} payment received`, 'success');
        } else {
          await api.addCustomerCredit(selectedPartyId, {
            amount,
            notes: actionNotes || 'Credit given',
          });
          showToast(`Recorded ₹${amount} credit added`, 'success');
        }
        await refreshCustomers();
      } else {
        await api.addSupplierPayment(selectedPartyId, {
          amount,
          notes: actionNotes || 'Paid to supplier',
        });
        showToast(`Recorded ₹${amount} paid to supplier`, 'success');
        await refreshSuppliers();
      }

      await refreshDashboard();
      if (activeTab === 'history') await loadHistory();
      setIsActionModalOpen(false);
    } catch (err: any) {
      showToast(err.message || 'Failed to update transaction', 'error');
    } finally {
      setSaving(false);
    }
  };

  const selectedCustomerObj = customers.find((c) => c.id === selectedPartyId);
  const selectedSupplierObj = suppliers.find((s) => s.id === selectedPartyId);

  return (
    <div className="space-y-4 pb-20 max-w-5xl mx-auto">
      {/* Udhaar Top Summary Cards */}
      <div className="grid grid-cols-2 gap-3">
        {/* Customer Credit Card */}
        <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-rose-700 dark:text-rose-400">
              Customer Udhaar (Lene Hain)
            </span>
            <ArrowDownLeft className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-2xl font-extrabold font-mono text-rose-800 dark:text-rose-200">
            ₹{totalCustomerCredit.toLocaleString('en-IN')}
          </div>
          <p className="text-[11px] text-rose-700/80 dark:text-rose-300/80 mt-1">
            Pending from customers
          </p>
        </div>

        {/* Supplier Payable Card */}
        <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-400">
              Supplier Payable (Dene Hain)
            </span>
            <ArrowUpRight className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-extrabold font-mono text-amber-800 dark:text-amber-200">
            ₹{totalSupplierPayables.toLocaleString('en-IN')}
          </div>
          <p className="text-[11px] text-amber-700/80 dark:text-amber-300/80 mt-1">
            Pending to wholesalers
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl text-xs font-semibold">
        <button
          onClick={() => setActiveTab('customers')}
          className={`flex-1 py-2 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
            activeTab === 'customers'
              ? 'bg-white dark:bg-slate-900 text-rose-700 dark:text-rose-400 shadow-xs'
              : 'text-slate-600 dark:text-slate-400'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Customer Khata</span>
        </button>

        <button
          onClick={() => setActiveTab('suppliers')}
          className={`flex-1 py-2 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
            activeTab === 'suppliers'
              ? 'bg-white dark:bg-slate-900 text-amber-700 dark:text-amber-400 shadow-xs'
              : 'text-slate-600 dark:text-slate-400'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Supplier Payables</span>
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`flex-1 py-2 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
            activeTab === 'history'
              ? 'bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 shadow-xs'
              : 'text-slate-600 dark:text-slate-400'
          }`}
        >
          <History className="w-4 h-4" />
          <span>Ledger History</span>
        </button>
      </div>

      {/* Main Tab Content */}
      {activeTab === 'customers' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-xs border border-slate-200/80 dark:border-slate-800 space-y-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search customer by name or phone..."
              className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-rose-600"
            />
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {filteredCustomers.length === 0 ? (
              <div className="text-center py-8 text-slate-400">
                <p className="text-xs">No customer udhaar records found</p>
              </div>
            ) : (
              filteredCustomers.map((c) => (
                <div key={c.id} className="py-3 flex items-center justify-between gap-2">
                  <div>
                    <div className="text-xs font-bold text-slate-900 dark:text-white">{c.name}</div>
                    <div className="text-[11px] text-slate-500">{c.phone || 'No phone'}</div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <span className="text-xs text-slate-400 block">Due:</span>
                      <span className="text-sm font-extrabold font-mono text-rose-600 dark:text-rose-400">
                        ₹{(c.creditBalance || 0).toLocaleString('en-IN')}
                      </span>
                    </div>

                    <div className="flex gap-1">
                      <button
                        onClick={() => openCustomerAction(c.id, 'payment')}
                        className="px-2.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200 text-xs font-bold transition-colors"
                      >
                        Receive
                      </button>
                      <button
                        onClick={() => openCustomerAction(c.id, 'credit')}
                        className="px-2.5 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-200 text-xs font-bold transition-colors"
                      >
                        + Udhaar
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {activeTab === 'suppliers' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-xs border border-slate-200/80 dark:border-slate-800 space-y-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search supplier..."
              className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-amber-600"
            />
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {filteredSuppliers.length === 0 ? (
              <div className="text-center py-8 text-slate-400">
                <p className="text-xs">No supplier payables due</p>
              </div>
            ) : (
              filteredSuppliers.map((s) => (
                <div key={s.id} className="py-3 flex items-center justify-between gap-2">
                  <div>
                    <div className="text-xs font-bold text-slate-900 dark:text-white">{s.name}</div>
                    <div className="text-[11px] text-slate-500">{s.phone || 'No phone'}</div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <span className="text-xs text-slate-400 block">Payable:</span>
                      <span className="text-sm font-extrabold font-mono text-amber-600 dark:text-amber-400">
                        ₹{(s.outstandingBalance || 0).toLocaleString('en-IN')}
                      </span>
                    </div>

                    <button
                      onClick={() => openSupplierAction(s.id)}
                      className="px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200 text-xs font-bold transition-colors"
                    >
                      Pay Now
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {activeTab === 'history' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-xs border border-slate-200/80 dark:border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Recent Khata Ledger Entries
            </h3>
            <button
              onClick={loadHistory}
              disabled={loadingHistory}
              className="text-xs text-emerald-600 font-semibold hover:underline"
            >
              {loadingHistory ? 'Loading...' : 'Refresh'}
            </button>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {historyList.length === 0 ? (
              <div className="text-center py-8 text-slate-400">
                <BookOpen className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p className="text-xs">No ledger entries recorded yet</p>
              </div>
            ) : (
              historyList.map((entry) => (
                <div key={entry.id} className="py-2.5 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                        entry.type === 'payment_received'
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                          : entry.type === 'payment_made'
                          ? 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                          : 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                      }`}
                    >
                      {entry.type === 'payment_received' || entry.type === 'payment_made' ? (
                        <ArrowDownLeft className="w-4 h-4" />
                      ) : (
                        <ArrowUpRight className="w-4 h-4" />
                      )}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900 dark:text-white">
                        {entry.partyName}
                      </div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400">
                        {entry.type.replace('_', ' ').toUpperCase()} •{' '}
                        {new Date(entry.date).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                        {entry.notes && ` • ${entry.notes}`}
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div
                      className={`text-sm font-extrabold font-mono ${
                        entry.type === 'credit_given'
                          ? 'text-rose-600 dark:text-rose-400'
                          : 'text-emerald-600 dark:text-emerald-400'
                      }`}
                    >
                      ₹{entry.amount.toFixed(2)}
                    </div>
                    <div className="text-[10px] text-slate-400">
                      Balance: ₹{entry.balanceAfter.toFixed(2)}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Quick Action Modal */}
      {isActionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 overflow-y-auto animate-in fade-in">
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 flex flex-col my-auto">
            <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base text-slate-900 dark:text-white">
                  {actionPartyType === 'customer'
                    ? actionKind === 'payment'
                      ? 'Receive Payment'
                      : 'Give Udhaar'
                    : 'Pay Supplier'}
                </h3>
                <p className="text-xs text-slate-500">
                  {actionPartyType === 'customer'
                    ? selectedCustomerObj?.name
                    : selectedSupplierObj?.name}
                </p>
              </div>
              <button
                onClick={() => setIsActionModalOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleActionSubmit} className="p-5 space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Amount (₹) *
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
                  Note / Reference
                </label>
                <input
                  type="text"
                  value={actionNotes}
                  onChange={(e) => setActionNotes(e.target.value)}
                  placeholder="e.g. UPI, cash, partial payment"
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-emerald-600"
                />
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsActionModalOpen(false)}
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
                  <span>{saving ? 'Saving...' : 'Save Entry'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
