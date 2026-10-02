import React from 'react';
import type { Expense, ExpenseCategory, Supplier } from '../../types';
import { formatCurrency } from '../../utils/helpers';
import { PencilIcon, TrashIcon, ClipboardIcon } from '../Icons';

interface ExpensesTableProps {
  expenses: Expense[];
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  expenseCategories: ExpenseCategory[];
  suppliers: Supplier[];
}

const ExpensesTable: React.FC<ExpensesTableProps> = ({ expenses, onEdit, onDelete, expenseCategories, suppliers }) => {
  const headClasses = "p-3.5 text-right text-[11px] font-black uppercase tracking-wider text-neutral-500 dark:text-neutral-400 select-none border-b border-neutral-200 dark:border-neutral-800";
  const cellClasses = "p-3.5 text-sm text-neutral-800 dark:text-neutral-200 align-middle";

  return (
    <div className="w-full allow-select">
      {/* 📱 Mobile View: Smart Cards (يظهر تلقائياً على الهواتف والشاشات الصغيرة) */}
      <div className="md:hidden space-y-2.5 allow-select">
        {expenses.map((expense) => {
          const amount = expense.amount || 0;
          const categoryName = expenseCategories.find(c => c.id === expense.category_id)?.name || 'غير محدد';
          const supplier = expense.supplier_id ? suppliers.find(s => s.id === expense.supplier_id) : null;
          const supplierName = supplier?.name;

          return (
            <div
              key={expense.id}
              className="bg-white dark:bg-neutral-900 rounded-2xl p-3.5 border border-neutral-200/80 dark:border-neutral-800 shadow-sm transition-all"
            >
              {/* Header: Date, Category badge, Amount */}
              <div className="flex items-start justify-between gap-2 pb-2.5 border-b border-neutral-100 dark:border-neutral-800">
                <div className="flex flex-col gap-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-2xs font-extrabold bg-neutral-100 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-200 border border-neutral-200/60 dark:border-neutral-700/60 whitespace-nowrap">
                      {categoryName}
                    </span>
                    {expense.cycle && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-2xs font-bold bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400 border border-neutral-200/60 dark:border-neutral-700/60 truncate max-w-[100px]">
                        {expense.cycle}
                      </span>
                    )}
                  </div>
                  <span className="font-mono text-2xs text-neutral-400 font-medium">
                    {expense.date}
                  </span>
                </div>

                {/* Amount */}
                <div className="text-left shrink-0">
                  <div className="bg-accent-danger/10 dark:bg-accent-danger/20 px-2.5 py-1 rounded-xl border border-accent-danger/20 dark:border-accent-danger/30">
                    <span dir="ltr" className="text-base font-black text-accent-danger dark:text-accent-danger tabular-nums">
                      {formatCurrency(amount).replace('EGP', '')}
                    </span>
                    <span className="text-2xs font-bold text-accent-danger/70 dark:text-accent-danger/70 mr-1">ج.م</span>
                  </div>
                </div>
              </div>

              {/* Description & Details */}
              <div className="pt-2.5 flex items-center justify-between gap-2 text-xs">
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-neutral-850 dark:text-neutral-200 truncate">
                    {expense.description || 'بدون بيان'}
                  </p>
                  {supplierName && (
                    <span className="text-2xs text-neutral-400 dark:text-neutral-500 font-bold block mt-0.5">
                      المورد: {supplierName}
                    </span>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => {
                      if (navigator.clipboard) {
                        navigator.clipboard.writeText(`${expense.date} - ${expense.description || ''} - ${amount}`);
                      }
                    }}
                    className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center p-2 rounded-lg text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors"
                    aria-label="نسخ"
                    title="نسخ"
                  >
                    <ClipboardIcon className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => onEdit(expense.id)}
                    className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center p-2 rounded-lg text-neutral-400 hover:bg-accent-info/10 dark:hover:bg-blue-950/50 hover:text-accent-info dark:hover:text-blue-400 transition-colors"
                    aria-label="تعديل"
                    title="تعديل"
                  >
                    <PencilIcon className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => onDelete(expense.id)}
                    className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center p-2 rounded-lg text-neutral-400 hover:bg-accent-danger/10 dark:hover:bg-accent-danger/20 hover:text-accent-danger dark:hover:text-accent-danger transition-colors"
                    aria-label="حذف"
                    title="حذف"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 💻 Desktop View: Classic Table (يظهر على شاشات md وما فوق) */}
      <div className="hidden md:block bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-none overflow-hidden allow-select">
        <div className="max-h-[65vh] overflow-auto custom-scrollbar">
          <table className="w-full min-w-[700px] border-collapse text-right allow-select">
          <thead className="sticky top-0 z-10 bg-neutral-100 dark:bg-neutral-900 shadow-[0_1px_0_0_rgba(0,0,0,0.05)] dark:shadow-[0_1px_0_0_rgba(255,255,255,0.05)]">
            <tr>
              <th className={headClasses}>التاريخ</th>
              <th className={headClasses}>الوصف</th>
              <th className={headClasses}>الفئة</th>
              <th className={headClasses}>العروة</th>
              <th className={headClasses}>المورد</th>
              <th className={`${headClasses} text-left`}>المبلغ</th>
              <th className={`${headClasses} w-28 text-center`}>الإجراءات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-200/80 dark:divide-neutral-800/80">
            {expenses.map((expense) => {
              const amount = expense.amount || 0;
              const categoryName = expenseCategories.find(c => c.id === expense.category_id)?.name || 'غير محدد';
              const supplier = expense.supplier_id ? suppliers.find(s => s.id === expense.supplier_id) : null;
              const supplierName = supplier?.name;

              return (
                <tr 
                  key={expense.id} 
                  className="group even:bg-neutral-50/50 dark:even:bg-neutral-800/20 hover:bg-neutral-100 dark:hover:bg-neutral-800/60 transition-colors"
                >
                  <td className={`${cellClasses} font-mono text-[11px] text-neutral-500 dark:text-neutral-400 whitespace-nowrap`}>
                    {expense.date}
                  </td>
                  <td className={`${cellClasses} font-medium text-neutral-900 dark:text-neutral-100 max-w-xs truncate`}>
                    {expense.description || '-'}
                  </td>
                  <td className={cellClasses}>
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-2xs font-bold bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 border border-neutral-200/60 dark:border-neutral-700/60 whitespace-nowrap">
                      {categoryName}
                    </span>
                  </td>
                  <td className={`${cellClasses} text-xs text-neutral-600 dark:text-neutral-400 whitespace-nowrap`}>
                    {expense.cycle || '-'}
                  </td>
                  <td className={cellClasses}>
                    {supplierName ? (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-2xs font-bold bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 border border-neutral-200/60 dark:border-neutral-700/60 whitespace-nowrap">
                        {supplierName}
                      </span>
                    ) : (
                      <span className="text-neutral-400 text-xs">-</span>
                    )}
                  </td>
                  <td className={`${cellClasses} text-left whitespace-nowrap`}>
                    <span dir="ltr" className="font-mono font-black text-accent-danger tabular-nums text-sm">
                      {formatCurrency(amount)}
                    </span>
                  </td>
                  <td className={`${cellClasses} text-center`}>
                    <div className="flex items-center justify-center gap-1 opacity-50 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => {
                          if (navigator.clipboard) {
                            navigator.clipboard.writeText(`${expense.date} - ${expense.description} - ${amount}`);
                          }
                        }}
                        className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center p-1.5 rounded-md text-neutral-400 hover:bg-neutral-200/70 dark:hover:bg-neutral-700 text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-100 transition-colors" 
                        aria-label="نسخ التفاصيل"
                        title="نسخ"
                      >
                        <ClipboardIcon className="h-4 w-4" />
                      </button>
                      <button 
                        onClick={() => onEdit(expense.id)} 
                        className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center p-1.5 rounded-md text-neutral-400 hover:bg-accent-info/10 hover:text-accent-info transition-colors" 
                        aria-label="تعديل المصروف"
                        title="تعديل"
                      >
                        <PencilIcon className="h-4 w-4" />
                      </button>
                      <button 
                        onClick={() => onDelete(expense.id)} 
                        className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center p-1.5 rounded-md text-neutral-400 hover:bg-accent-danger/10 hover:text-accent-danger transition-colors" 
                        aria-label="حذف المصروف"
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
  </div>
  );
};

export default ExpensesTable;
