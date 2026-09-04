import React from 'react';
import type { Invoice } from '../../types';
import { formatCurrency, calculateInvoiceTotal, formatNumber, formatShortDate } from '../../utils/helpers';
import { PencilIcon, TrashIcon, ClipboardIcon, ScaleIcon, BoxIcon, TruckIcon, CalendarIcon } from '../Icons';

interface InvoicesTableProps {
  invoices: Invoice[];
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
  onViewDetails?: (invoice: Invoice) => void;
}

const InvoicesTable: React.FC<InvoicesTableProps> = ({ invoices, onEdit, onDelete, onViewDetails }) => {
  const headClasses = "p-3.5 text-right text-[11px] font-black uppercase tracking-wider text-neutral-500 dark:text-neutral-400 select-none border-b border-neutral-200 dark:border-neutral-800";
  const cellClasses = "p-3.5 text-sm text-neutral-800 dark:text-neutral-200 align-middle";
  
  return (
    <div>
      {/* 📱 Mobile View: Responsive Data Cards (تمنع التمرير الأفقي تماماً على الجوال) */}
      <div className="md:hidden space-y-3">
        {invoices.map((invoice) => {
          const total = calculateInvoiceTotal(invoice.price_items, invoice.deductions);
          const totalWeight = invoice.price_items?.reduce((s, i) => s + (i.quantity || 0), 0) || 0;
          const packagingCount = invoice.packaging_count || 0;
          const packagingLabel = invoice.packaging_type === 'carton' ? 'كرتونة' : 'قفص';
          const avgCageWeight = packagingCount > 0 ? (totalWeight / packagingCount) : 0;
          
          return (
            <div
              key={invoice.id}
              onClick={() => onViewDetails?.(invoice)}
              className="bg-white dark:bg-neutral-900 rounded-2xl p-3.5 border border-neutral-200/80 dark:border-neutral-800 shadow-sm active:scale-[0.99] transition-all cursor-pointer hover:border-emerald-200 dark:hover:border-emerald-800/50"
            >
              {/* Header: Date, Market badge, Total */}
              <div className="flex items-start justify-between gap-2 pb-2.5 border-b border-neutral-100 dark:border-neutral-800">
                <div className="flex flex-col gap-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-extrabold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/40">
                      <TruckIcon className="w-3 h-3" />
                      <span className="truncate max-w-[110px]">{invoice.market || 'سوق عام'}</span>
                    </span>
                    {invoice.cycle && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] font-bold bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400 border border-neutral-200/60 dark:border-neutral-700/60 truncate max-w-[90px]">
                        {invoice.cycle}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 text-[11px] text-neutral-400 font-medium mt-0.5">
                    <CalendarIcon className="w-3 h-3 opacity-70" />
                    <span>{formatShortDate(invoice.date)}</span>
                  </div>
                </div>

                {/* Total amount */}
                <div className="text-left shrink-0">
                  <div className="bg-emerald-50 dark:bg-emerald-500/10 px-2.5 py-1 rounded-xl border border-emerald-100 dark:border-emerald-500/20">
                    <span className="text-base font-black text-emerald-600 dark:text-emerald-400 tabular-nums">
                      {formatNumber(Math.round(total))}
                    </span>
                    <span className="text-[9px] font-bold text-emerald-600/70 dark:text-emerald-400/70 mr-1">ج.م</span>
                  </div>
                </div>
              </div>

              {/* Body stats: Total weight, Packaging & Pricing Chips */}
              <div className="pt-2.5 flex items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="flex items-center gap-1 text-[11px] font-bold text-neutral-700 dark:text-neutral-300 bg-neutral-50 dark:bg-neutral-800/60 px-2 py-0.5 rounded-lg border border-neutral-100 dark:border-neutral-800">
                    <ScaleIcon className="w-3 h-3 text-neutral-400" />
                    <span>{formatNumber(totalWeight)} كجم</span>
                  </div>
                  {packagingCount > 0 && (
                    <div className="flex items-center gap-1 text-[11px] font-bold text-neutral-700 dark:text-neutral-300 bg-neutral-50 dark:bg-neutral-800/60 px-2 py-0.5 rounded-lg border border-neutral-100 dark:border-neutral-800">
                      <BoxIcon className="w-3 h-3 text-neutral-400" />
                      <span>{packagingCount} {packagingLabel}</span>
                    </div>
                  )}
                  {avgCageWeight > 0 && (
                    <div className="text-[10px] font-extrabold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-1.5 py-0.5 rounded-md border border-amber-200/50 dark:border-amber-800/40">
                      ⚖️ {avgCageWeight.toFixed(1)} ك/{packagingLabel === 'كرتونة' ? 'ك' : 'ق'}
                    </div>
                  )}
                </div>

                {/* Action buttons */}
                {(onEdit || onDelete) && (
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (navigator.clipboard) {
                          navigator.clipboard.writeText(`${invoice.date} - ${invoice.market} - ${total}`);
                        }
                      }}
                      className="p-1.5 rounded-lg text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors"
                      aria-label="نسخ"
                      title="نسخ"
                    >
                      <ClipboardIcon className="h-3.5 w-3.5" />
                    </button>
                    {onEdit && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onEdit(invoice.id);
                        }}
                        className="p-1.5 rounded-lg text-neutral-400 hover:bg-blue-50 dark:hover:bg-blue-950/50 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                        aria-label="تعديل"
                        title="تعديل"
                      >
                        <PencilIcon className="h-3.5 w-3.5" />
                      </button>
                    )}
                    {onDelete && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDelete(invoice.id);
                        }}
                        className="p-1.5 rounded-lg text-neutral-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 hover:text-rose-600 dark:hover:text-rose-400 transition-colors"
                        aria-label="حذف"
                        title="حذف"
                      >
                        <TrashIcon className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* 💻 Desktop / Tablet View: Classic Table (يظهر على شاشات md وما فوق) */}
      <div className="hidden md:block bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-none overflow-hidden">
        <div className="max-h-[65vh] overflow-auto custom-scrollbar">
          <table className="w-full min-w-[650px] border-collapse text-right">
            <thead className="sticky top-0 z-10 bg-neutral-100 dark:bg-neutral-900 shadow-[0_1px_0_0_rgba(0,0,0,0.05)] dark:shadow-[0_1px_0_0_rgba(255,255,255,0.05)]">
              <tr>
                <th className={headClasses}>التاريخ</th>
                <th className={headClasses}>العروة</th>
                <th className={headClasses}>السوق</th>
                <th className={headClasses}>الوزن والتعبئة</th>
                <th className={`${headClasses} text-left`}>الإجمالي</th>
                <th className={`${headClasses} w-28 text-center`}>الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200/80 dark:divide-neutral-800/80">
              {invoices.map((invoice) => {
                const total = calculateInvoiceTotal(invoice.price_items, invoice.deductions);
                const totalWeight = invoice.price_items?.reduce((s, i) => s + (i.quantity || 0), 0) || 0;
                const packagingCount = invoice.packaging_count || 0;
                const packagingLabel = invoice.packaging_type === 'carton' ? 'كرتونة' : 'قفص';

                return (
                  <tr 
                    key={invoice.id} 
                    onClick={() => onViewDetails?.(invoice)}
                    className="group even:bg-neutral-50/50 dark:even:bg-neutral-800/20 hover:bg-neutral-100/80 dark:hover:bg-neutral-800/60 transition-colors cursor-pointer"
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
                    <td className={cellClasses}>
                      <div className="flex items-center gap-1.5 text-xs text-neutral-600 dark:text-neutral-400 font-semibold whitespace-nowrap">
                        <span>{formatNumber(totalWeight)} كجم</span>
                        {packagingCount > 0 && (
                          <span className="text-[10px] opacity-70">({packagingCount} {packagingLabel})</span>
                        )}
                      </div>
                    </td>
                    <td className={`${cellClasses} text-left whitespace-nowrap`}>
                      <span dir="ltr" className="font-mono font-black text-emerald-600 dark:text-emerald-400 tabular-nums text-sm">
                        {formatCurrency(total)}
                      </span>
                    </td>
                    <td className={`${cellClasses} text-center`}>
                      <div className="flex items-center justify-center gap-1 opacity-50 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
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
                        {onEdit && (
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              onEdit(invoice.id);
                            }} 
                            className="p-1.5 rounded-md text-neutral-400 hover:bg-blue-50 dark:hover:bg-blue-950/50 hover:text-blue-600 dark:hover:text-blue-400 transition-colors" 
                            aria-label="تعديل الفاتورة"
                            title="تعديل"
                          >
                            <PencilIcon className="h-4 w-4" />
                          </button>
                        )}
                        {onDelete && (
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              onDelete(invoice.id);
                            }} 
                            className="p-1.5 rounded-md text-neutral-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 hover:text-rose-600 dark:hover:text-rose-400 transition-colors" 
                            aria-label="حذف الفاتورة"
                            title="حذف"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default InvoicesTable;
