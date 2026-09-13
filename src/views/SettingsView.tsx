import React, { useState } from 'react';
import {
  Store,
  Save,
  Download,
  FileSpreadsheet,
  Database,
  Lock,
  LogOut,
  CheckCircle2,
  Phone,
  MapPin,
  FileText,
  ShieldAlert,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.js';
import { useStore } from '../context/StoreContext.js';
import { api } from '../api/client.js';

export const SettingsView: React.FC = () => {
  const { user, settings, updateSettings, logout, sendResetEmail, isAdmin } = useAuth();
  const { showToast } = useStore();

  const [formData, setFormData] = useState({
    storeName: settings?.storeName || 'My Kirana Store',
    storeAddress: settings?.storeAddress || '',
    phone: settings?.phone || '',
    gstin: settings?.gstin || '',
    currency: settings?.currency || '₹',
    invoiceFooterNote: settings?.invoiceFooterNote || 'Thank you! Visit Again.',
  });

  const [savingSettings, setSavingSettings] = useState(false);
  const [sendingReset, setSendingReset] = useState(false);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    try {
      await updateSettings(formData);
      showToast('Store settings saved successfully', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to save settings', 'error');
    } finally {
      setSavingSettings(false);
    }
  };

  const handleSendResetEmail = async () => {
    if (!user?.email) {
      showToast('No registered email found for account.', 'error');
      return;
    }
    setSendingReset(true);
    try {
      await sendResetEmail(user.email);
      showToast(`Password reset link sent to ${user.email}. Check your inbox!`, 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to send reset email', 'error');
    } finally {
      setSendingReset(false);
    }
  };

  const handleDownloadCSV = async (type: 'products' | 'sales' | 'customers' | 'expenses') => {
    try {
      showToast(`Generating ${type}.csv...`, 'info');
      await api.downloadCSV(type);
      showToast(`Downloaded ${type}.csv`, 'success');
    } catch (err: any) {
      showToast(err.message || 'Export failed', 'error');
    }
  };

  const handleDownloadBackup = async () => {
    try {
      showToast('Generating full store JSON backup...', 'info');
      await api.downloadJSONBackup();
      showToast('Downloaded complete JSON backup', 'success');
    } catch (err: any) {
      showToast(err.message || 'Backup failed', 'error');
    }
  };

  return (
    <div className="space-y-4 pb-20 max-w-4xl mx-auto">
      {/* Store Profile Settings */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 shadow-xs border border-slate-200/80 dark:border-slate-800 space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
          <Store className="w-5 h-5 text-emerald-600" />
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">Kirana Store Profile</h2>
            <p className="text-xs text-slate-500">
              Information displayed on your bills and customer receipts
            </p>
          </div>
        </div>

        <form onSubmit={handleSaveSettings} className="space-y-3.5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Store Name *
              </label>
              <input
                type="text"
                required
                value={formData.storeName}
                onChange={(e) => setFormData({ ...formData, storeName: e.target.value })}
                placeholder="e.g. Shree Ganesh Kirana Store"
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-emerald-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Phone / Mobile Number *
              </label>
              <input
                type="tel"
                required
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="e.g. 9876543210"
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-mono focus:outline-emerald-600"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Store Address
            </label>
            <textarea
              rows={2}
              value={formData.storeAddress}
              onChange={(e) => setFormData({ ...formData, storeAddress: e.target.value })}
              placeholder="e.g. Shop 4, Main Market, Station Road, Delhi"
              className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-emerald-600 resize-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                GSTIN / Trade License (Optional)
              </label>
              <input
                type="text"
                value={formData.gstin}
                onChange={(e) => setFormData({ ...formData, gstin: e.target.value })}
                placeholder="e.g. 07AAAAA0000A1Z5"
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-mono focus:outline-emerald-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Currency Symbol
              </label>
              <input
                type="text"
                value={formData.currency}
                onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                placeholder="₹"
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-mono focus:outline-emerald-600"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Invoice Footer Greeting Note
            </label>
            <input
              type="text"
              value={formData.invoiceFooterNote}
              onChange={(e) => setFormData({ ...formData, invoiceFooterNote: e.target.value })}
              placeholder="e.g. Thank you for your business! Please visit again."
              className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-emerald-600"
            />
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              disabled={savingSettings}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-sm"
            >
              <Save className="w-4 h-4" />
              <span>{savingSettings ? 'Saving...' : 'Save Store Details'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Backup & CSV Exports */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 shadow-xs border border-slate-200/80 dark:border-slate-800 space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
          <Database className="w-5 h-5 text-blue-600" />
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">Data Export & Backup</h2>
            <p className="text-xs text-slate-500">
              Download your store records for offline bookkeeping or Excel
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <button
            onClick={() => handleDownloadCSV('products')}
            className="p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 text-left transition-all group"
          >
            <FileSpreadsheet className="w-5 h-5 text-emerald-600 mb-1.5 group-hover:scale-110 transition-transform" />
            <div className="text-xs font-bold text-slate-900 dark:text-white">Products CSV</div>
            <p className="text-[10px] text-slate-400">Inventory & Prices</p>
          </button>

          <button
            onClick={() => handleDownloadCSV('sales')}
            className="p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 text-left transition-all group"
          >
            <FileSpreadsheet className="w-5 h-5 text-blue-600 mb-1.5 group-hover:scale-110 transition-transform" />
            <div className="text-xs font-bold text-slate-900 dark:text-white">Sales CSV</div>
            <p className="text-[10px] text-slate-400">Bills & Invoices</p>
          </button>

          <button
            onClick={() => handleDownloadCSV('customers')}
            className="p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 text-left transition-all group"
          >
            <FileSpreadsheet className="w-5 h-5 text-rose-600 mb-1.5 group-hover:scale-110 transition-transform" />
            <div className="text-xs font-bold text-slate-900 dark:text-white">Customers CSV</div>
            <p className="text-[10px] text-slate-400">Khata & Udhaar</p>
          </button>

          <button
            onClick={() => handleDownloadCSV('expenses')}
            className="p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 text-left transition-all group"
          >
            <FileSpreadsheet className="w-5 h-5 text-amber-600 mb-1.5 group-hover:scale-110 transition-transform" />
            <div className="text-xs font-bold text-slate-900 dark:text-white">Expenses CSV</div>
            <p className="text-[10px] text-slate-400">Shop Overheads</p>
          </button>
        </div>

        {/* Full JSON Backup Button */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between flex-wrap gap-2">
          <div className="text-xs text-slate-500">
            Download complete snapshot of database as JSON file for full safety.
          </div>
          <button
            onClick={handleDownloadBackup}
            className="px-4 py-2 bg-slate-900 text-white dark:bg-white dark:text-slate-900 rounded-xl text-xs font-bold flex items-center gap-1.5 hover:opacity-90"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download Full JSON Backup</span>
          </button>
        </div>
      </div>

      {/* Account & Password Settings */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 shadow-xs border border-slate-200/80 dark:border-slate-800 space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
          <Lock className="w-5 h-5 text-purple-600" />
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">Account & Authentication</h2>
            <p className="text-xs text-slate-500">
              Authenticated via Firebase Authentication
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
          {user?.profilePhoto ? (
            <img
              src={user.profilePhoto}
              alt={user.fullName || 'User'}
              className="w-12 h-12 rounded-full object-cover border border-slate-300 dark:border-slate-600"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="w-12 h-12 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center text-base uppercase">
              {(user?.fullName || user?.name || 'K')[0]}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                {user?.fullName || user?.name || 'Shopkeeper'}
              </h3>
              {isAdmin && (
                <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 text-[10px] font-black uppercase tracking-wider border border-amber-300 dark:border-amber-800">
                  Admin
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
              {user?.email || 'No email attached'}
            </p>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 font-mono mt-0.5 truncate">
              UID: {user?.id || user?.userId}
            </p>
          </div>
        </div>

        <div className="p-3 bg-purple-50 dark:bg-purple-950/30 border border-purple-200/60 dark:border-purple-800/40 rounded-xl space-y-2">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h4 className="text-xs font-bold text-purple-900 dark:text-purple-300">
                Change or Reset Password
              </h4>
              <p className="text-[11px] text-purple-700 dark:text-purple-400">
                Send a secure Firebase password reset link to <strong>{user?.email}</strong>
              </p>
            </div>
            <button
              type="button"
              disabled={sendingReset || !user?.email}
              onClick={handleSendResetEmail}
              className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{sendingReset ? 'Sending...' : 'Send Reset Link'}</span>
            </button>
          </div>
        </div>

        <div className="pt-2 flex justify-between items-center border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={logout}
            className="px-4 py-2 rounded-xl border border-rose-200 dark:border-rose-900 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out of Store</span>
          </button>
        </div>
      </div>
    </div>
  );
};
