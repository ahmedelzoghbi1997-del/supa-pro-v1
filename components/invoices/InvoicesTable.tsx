import React from 'react';
import type { Invoice } from '../../types';
import { formatCurrency, calculateInvoiceTotal } from '../../utils/helpers';
import { PencilIcon, TrashIcon, ClipboardIcon } from '../Icons';

interface InvoicesTableProps {
  invoices: Invoice[];
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}

const InvoicesTable: React.FC<InvoicesTableProps> = ({ invoices, onEdit, onDelete }) => {
  const headClasses = "p-3.5 text-right text-[11px] font-black uppercase tracking-wider text-neutral-500 dark:text-neutral-400 select-none border-b border-neutral-200 dark:border-neutral-800";
  const cellClasses = "p-3.5 text-sm text-neutral-800 dark:text-neutral-200 align-middle";
  
  return (
    <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-none overflow-hidden">
      <div className="max-h-[65vh] overflow-auto custom-scrollbar">
        <table className="w-full min-w-[650px] border-collapse text-right">
          <thead className="sticky top-0 z-10 bg-neutral-100 dark:bg-neutral-900 shadow-[0_1px_0_0_rgba(0,0,0,0.05)] dark:shadow-[0_1px_0_0_rgba(255,255,255,0.05)]">
            <tr>
              <th className={headClasses}>التاريخ</th>
              <th className={headClasses}>العروة</th>
              <th className={headClasses}>السوق</th>
              <th className={`${headClasses} text-left`}>الإجمالي</th>
              <th className={`${headClasses} w-28 text-center`}>الإجراءات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-200/80 dark:divide-neutral-800/80">
            {invoices.map((invoice) => {
              // FIX: Property 'discount' does not exist on type 'Invoice'. Replaced with 'deductions'.
              const total = calculateInvoiceTotal(invoice.price_items, invoice.deductions);
              return (
                <tr 
                  key={invoice.id} 
                  className="group even:bg-neutral-50/50 dark:even:bg-neutral-800/20 hover:bg-neutral-100 dark:hover:bg-neutral-800/60 transition-colors"
                >
                  <td className={`${cellClasses} font-mono text-[11px] text-neutral-500 dark:text-neutral-400 whitespace-nowrap`}>
                    {invoice.date}
                  </td>
                  <td className={cellClasses}>
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 border border-neutral-200/60 dark:border-neutral-700/60 whitespace-nowrap">
                      {invoice.cycle || '-'}
                    </span>
                  </td>
                  <td className={cellClasses}>
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 border border-neutral-200/60 dark:border-neutral-700/60 whitespace-nowrap">
                      {invoice.market || '-'}
                    </span>
                  </td>
                  <td className={`${cellClasses} text-left whitespace-nowrap`}>
                    <span dir="ltr" className="font-mono font-black text-emerald-600 dark:text-emerald-400 tabular-nums text-sm">
                      {formatCurrency(total)}
                    </span>
                  </td>
                  <td className={`${cellClasses} text-center`}>
                    <div className="flex items-center justify-center gap-1 opacity-50 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => {
                          if (navigator.clipboard) {
                            navigator.clipboard.writeText(`${invoice.date} - ${invoice.market} - ${total}`);
                          }
                        }}
                        className="p-1.5 rounded-md text-neutral-400 hover:bg-neutral-200/70 dark:hover:bg-neutral-700 text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-100 transition-colors" 
                        aria-label="نسخ التفاصيل"
                        title="نسخ"
                      >
                        <ClipboardIcon className="h-4 w-4" />
                      </button>
                      <button 
                        onClick={() => onEdit(invoice.id)} 
                        className="p-1.5 rounded-md text-neutral-400 hover:bg-blue-50 dark:hover:bg-blue-950/50 hover:text-blue-600 dark:hover:text-blue-400 transition-colors" 
                        aria-label="تعديل الفاتورة"
                        title="تعديل"
                      >
                        <PencilIcon className="h-4 w-4" />
                      </button>
                      <button 
                        onClick={() => onDelete(invoice.id)} 
                        className="p-1.5 rounded-md text-neutral-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 hover:text-rose-600 dark:hover:text-rose-400 transition-colors" 
                        aria-label="حذف الفاتورة"
                        title="حذف"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default InvoicesTable;