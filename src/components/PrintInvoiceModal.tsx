import React from 'react';
import { Printer, X, CheckCircle2 } from 'lucide-react';
import { Sale, StoreSettings } from '../types.js';

interface PrintInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  sale: Sale | null;
  settings: StoreSettings | null;
}

export const PrintInvoiceModal: React.FC<PrintInvoiceModalProps> = ({
  isOpen,
  onClose,
  sale,
  settings,
}) => {
  if (!isOpen || !sale) return null;

  const handlePrint = () => {
    window.print();
  };

  const storeName = settings?.storeName || 'Kirana Store';
  const storePhone = settings?.phone || '';
  const storeAddress = settings?.address || '';
  const invoiceFooter = settings?.invoiceFooter || 'Thank you for shopping with us! Please visit again.';

  const formattedDate = new Date(sale.date).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-3 overflow-y-auto animate-in fade-in duration-200">
      <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 flex flex-col my-auto">
        {/* Modal Top Actions (hidden on print) */}
        <div className="no-print px-4 py-3 bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-semibold text-sm">
            <CheckCircle2 className="w-4 h-4" />
            <span>Bill Generated</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              id="invoice-print-btn"
              onClick={handlePrint}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              Print Bill
            </button>
            <button
              id="invoice-close-btn"
              onClick={onClose}
              className="w-7 h-7 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* The Printable Receipt Content */}
        <div id="printable-receipt" className="p-5 bg-white text-slate-900 font-mono text-xs leading-tight">
          {/* Store Header */}
          <div className="text-center border-b border-dashed border-slate-300 pb-3 mb-3">
            <h2 className="text-base font-extrabold uppercase tracking-tight text-black">{storeName}</h2>
            {storeAddress && <p className="text-[11px] text-slate-600 mt-0.5">{storeAddress}</p>}
            {storePhone && <p className="text-[11px] text-slate-600">Ph: {storePhone}</p>}
            <p className="text-[10px] text-slate-400 uppercase mt-1">Cash / Credit Retail Memo</p>
          </div>

          {/* Invoice Meta */}
          <div className="flex justify-between items-start text-[11px] border-b border-slate-200 pb-2 mb-3">
            <div>
              <div className="font-bold">Bill No: {sale.invoiceNo}</div>
              <div className="text-slate-600 text-[10px]">{formattedDate}</div>
            </div>
            <div className="text-right">
              {sale.customerName ? (
                <>
                  <div className="font-bold text-black">{sale.customerName}</div>
                  {sale.customerPhone && <div className="text-slate-600 text-[10px]">{sale.customerPhone}</div>}
                </>
              ) : (
                <div className="text-slate-500 italic">Walk-in Customer</div>
              )}
            </div>
          </div>

          {/* Line Items Table */}
          <div className="border-b border-slate-300 pb-2 mb-2">
            <div className="grid grid-cols-12 font-bold text-black border-b border-dashed border-slate-300 pb-1 mb-1.5 text-[11px]">
              <span className="col-span-6">Item</span>
              <span className="col-span-3 text-center">Qty</span>
              <span className="col-span-3 text-right">Amount</span>
            </div>
            <div className="space-y-1.5">
              {sale.items.map((item, idx) => (
                <div key={idx} className="grid grid-cols-12 text-[11px] items-center">
                  <div className="col-span-6 truncate pr-1">
                    <span className="font-semibold text-slate-900">{item.name}</span>
                    <div className="text-[10px] text-slate-500">@ ₹{item.sellingPrice}/{item.unit}</div>
                  </div>
                  <div className="col-span-3 text-center text-slate-700">
                    {item.quantity} {item.unit}
                  </div>
                  <div className="col-span-3 text-right font-semibold text-slate-900">
                    ₹{item.total.toFixed(2)}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Subtotal, Discount, Grand Total */}
          <div className="space-y-1 text-[11px] border-b border-dashed border-slate-300 pb-3 mb-3">
            <div className="flex justify-between text-slate-600">
              <span>Items Total ({sale.items.length} items):</span>
              <span>₹{sale.subtotal.toFixed(2)}</span>
            </div>
            {sale.discount > 0 && (
              <div className="flex justify-between text-emerald-700 font-semibold">
                <span>Discount Applied:</span>
                <span>-₹{sale.discount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between items-center text-sm font-extrabold text-black pt-1 border-t border-slate-300">
              <span>GRAND TOTAL:</span>
              <span>₹{sale.grandTotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-[11px] text-slate-600 pt-1">
              <span>Payment Mode:</span>
              <span className="font-bold text-slate-900 uppercase">[{sale.paymentMethod}]</span>
            </div>
          </div>

          {/* Receipt Footer */}
          <div className="text-center text-[10px] text-slate-500 space-y-0.5">
            <p className="font-medium text-slate-700">{invoiceFooter}</p>
            <p className="text-[9px] text-slate-400">Generated on Kirana Store Management</p>
          </div>
        </div>

        {/* Modal Bottom Footer (hidden on print) */}
        <div className="no-print p-4 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-200 dark:border-slate-700 flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 font-semibold rounded-xl text-sm"
          >
            Done
          </button>
          <button
            onClick={handlePrint}
            className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-sm flex items-center justify-center gap-1.5 shadow-sm"
          >
            <Printer className="w-4 h-4" />
            Print Receipt
          </button>
        </div>
      </div>
    </div>
  );
};
