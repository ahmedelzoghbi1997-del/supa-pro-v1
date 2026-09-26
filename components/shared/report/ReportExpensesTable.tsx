import React, { useMemo } from "react";
import { Sprout, FlaskConical } from "lucide-react";
import type { Expense, ExpenseCategory, Supplier } from "../../../types";
import type {
  CategorySummaryCardProps,
  ReadOnlyExpenseCardProps,
} from "./types";
import {
  TrendingDownIcon,
  ChevronRightIcon,
  CalendarIcon,
  InvoicesIcon,
  CyclesIcon,
  TruckIcon,
} from "../../Icons";
import { formatNumber, formatShortDate } from "../../../utils/helpers";
import { getExpenseCategoryMeta } from "../../../utils/expenseIconUtils";

export const CategorySummaryCard: React.FC<CategorySummaryCardProps> = React.memo(
  ({ category, total, count, totalExpenses, onClick }) => {
    const meta = getExpenseCategoryMeta(category.name);
    const Icon = meta.icon;
    const percentage = totalExpenses > 0 ? (total / totalExpenses) * 100 : 0;

    return (
      <button
        onClick={onClick}
        className="group w-full bg-white dark:bg-neutral-800 p-4 rounded-2xl shadow-[0_4px_12px_rgba(0,0,0,0.06)] border border-neutral-100 dark:border-neutral-700/50 hover:shadow-[0_8px_16px_rgba(0,0,0,0.08)] hover:-translate-y-0.5 transition-all duration-300 text-right active:scale-[0.98] flex items-center justify-between gap-4"
      >
        <div className="flex items-center gap-4">
          <div
            className={`flex-shrink-0 w-12 h-12 flex items-center justify-center rounded-xl border ${meta.bg} ${meta.border}`}
          >
            <Icon className={`w-6 h-6 ${meta.color}`} strokeWidth={1.5} />
          </div>
          <div className="flex flex-col items-start gap-1">
            <h3 className="text-[15px] font-bold text-neutral-900 dark:text-neutral-100 leading-snug">
              {category.name}
            </h3>
            <p className="text-xs text-neutral-400 font-medium bg-neutral-100 dark:bg-neutral-700/50 px-2 py-0.5 rounded-md">
              {count} حركات
            </p>
          </div>
        </div>

        <div className="flex flex-col items-end gap-1">
          <p className="text-lg font-black text-neutral-900 dark:text-white tabular-nums tracking-tight">
            {formatNumber(Math.round(total))}
            <span className="text-xs mr-1.5 opacity-50 font-medium text-neutral-500 dark:text-neutral-400">
              ج.م
            </span>
          </p>
          {percentage > 0 && (
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border ${meta.badgeBg}`}
            >
              %{percentage.toFixed(1)}
            </span>
          )}
        </div>
      </button>
    );
  },
);

export const InfoItem: React.FC<{
  value: string;
  icon: React.FC<React.SVGProps<SVGSVGElement>>;
}> = ({ value, icon: Icon }) => (
  <div className="flex items-center gap-1 text-neutral-400 dark:text-neutral-500 text-[9px] sm:text-[10px] shrink-0">
    <Icon className="h-3 w-3 flex-shrink-0 opacity-50" />
    <span className="font-bold whitespace-nowrap text-neutral-600 dark:text-neutral-300">
      {value}
    </span>
  </div>
);

export const ReadOnlyExpenseCard: React.FC<ReadOnlyExpenseCardProps> = React.memo(
  ({
    expense,
    expenseCategories,
    suppliers,
    index,
    hideCycle = false,
    hideSupplier = false,
    hideCategory = false,
  }) => {
    const amount = parseFloat(String(expense.amount)) || 0;
    const categoryName =
      expenseCategories.find((c) => c.id === expense.category_id)?.name ||
      "غير محدد";
    const supplierName = suppliers.find(
      (s) => s.id === expense.supplier_id,
    )?.name;

    const tags = useMemo(() => {
      const activeTags = [];
      const isEstablishment =
        expense.is_establishment === true ||
        String(expense.is_establishment) === "true";
      const isCredit = expense.payment_method === "credit";

      if (isEstablishment) {
        activeTags.push({
          label: "تأسيس",
          textColor: "text-blue-600 dark:text-blue-400",
          bgColor: "bg-blue-50 dark:bg-blue-900/30",
          borderColor: "border-blue-200 dark:border-blue-800/50",
        });
      }

      if (isCredit) {
        activeTags.push({
          label: "آجل",
          textColor: "text-purple-600 dark:text-purple-400",
          bgColor: "bg-purple-50 dark:bg-purple-900/30",
          borderColor: "border-purple-200 dark:border-purple-800/50",
        });
      } else if (!isEstablishment) {
        activeTags.push({
          label: "نقدي",
          textColor: "text-emerald-600 dark:text-emerald-400",
          bgColor: "bg-emerald-50 dark:bg-emerald-900/30",
          borderColor: "border-emerald-200 dark:border-emerald-800/50",
        });
      }

      return activeTags;
    }, [expense.is_establishment, expense.payment_method]);

    const primaryTextColor = tags[0]?.textColor || "text-neutral-600";

    return (
      <div
        className={`group relative bg-white dark:bg-neutral-800 p-2.5 sm:p-3 rounded-[16px] border border-neutral-200 dark:border-neutral-700 shadow-soft hover:shadow-md transition-all text-right active:scale-[0.99] flex items-center justify-between gap-3 w-full overflow-hidden animate-stagger-in`}
        style={{
          animationDelay: `${Math.min(index * 30, 300)}ms`,
          willChange: "transform, opacity",
        }}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <h3 className="font-bold text-neutral-800 dark:text-neutral-100 text-xs sm:text-sm truncate leading-tight">
              {expense.description}
            </h3>

            <div className="flex items-center gap-1">
              {tags.map((tag, tIdx) => (
                <span
                  key={tIdx}
                  className={`text-[8px] font-black px-1.5 py-px rounded-full border ${tag.bgColor} ${tag.textColor} ${tag.borderColor} shadow-sm whitespace-nowrap`}
                >
                  {tag.label}
                </span>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-x-3 overflow-x-auto scrollbar-hide w-full pb-0.5">
            <InfoItem
              icon={CalendarIcon}
              value={formatShortDate(expense.date)}
            />
            {!hideCategory && (
              <InfoItem icon={InvoicesIcon} value={categoryName} />
            )}
            {!hideCycle && (
              <InfoItem icon={CyclesIcon} value={expense.cycle || "-"} />
            )}
            {!hideSupplier && supplierName && (
              <InfoItem icon={TruckIcon} value={supplierName} />
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 border-r border-neutral-100 dark:border-neutral-700 pr-2">
          <div className="text-left min-w-[60px]">
            <p
              className={`text-sm sm:text-base font-black tabular-nums tracking-tighter ${primaryTextColor}`}
            >
              {formatNumber(Math.round(amount))}
              <span className="text-[9px] mr-0.5 opacity-50 font-bold uppercase">
                ج.م
              </span>
            </p>
          </div>
        </div>
      </div>
    );
  },
);

export interface ReportExpensesTableProps {
  expenses: Expense[];
  categories: ExpenseCategory[];
  suppliers: Supplier[];
  expenseTotals: {
    total: number;
    establishment: number;
    operating: number;
  };
  categoryGroups: {
    category: ExpenseCategory;
    total: number;
    count: number;
  }[];
  selectedExpenseCategory: string | number | null;
  setSelectedExpenseCategory: (catId: string | number | null) => void;
  selectedCategory: ExpenseCategory | null | undefined;
  selectedCategoryExpenses: Expense[];
}

export const ReportExpensesTable: React.FC<ReportExpensesTableProps> = ({
  expenses: _expenses,
  categories,
  suppliers,
  expenseTotals,
  categoryGroups,
  selectedExpenseCategory,
  setSelectedExpenseCategory,
  selectedCategory,
  selectedCategoryExpenses,
}) => {
  return (
    <div className="space-y-8 animate-enter">
      {!selectedExpenseCategory ? (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="md:col-span-1 bg-white dark:bg-neutral-800 p-5 rounded-3xl border border-neutral-200 dark:border-neutral-700 shadow-soft flex flex-col justify-center gap-1">
              <div className="flex items-center gap-2 mb-1">
                <TrendingDownIcon className="h-5 w-5 text-rose-500" />
                <p className="text-neutral-500 dark:text-neutral-400 text-[10px] font-black uppercase tracking-widest">
                  إجمالي المصروفات
                </p>
              </div>
              <p className="text-3xl font-black text-neutral-800 dark:text-neutral-50 tabular-nums">
                {formatNumber(Math.round(expenseTotals.total))}
                <span className="text-xs mr-1.5 opacity-40 font-bold">
                  ج.م
                </span>
              </p>
            </div>

            <div className="md:col-span-2 grid grid-cols-2 gap-3">
              <div className="bg-white dark:bg-neutral-800 p-4 rounded-3xl border border-blue-100 dark:border-blue-900/20 shadow-soft flex items-center justify-between group">
                <div>
                  <p className="text-neutral-400 dark:text-neutral-500 text-[9px] font-black uppercase mb-1">
                    تكاليف التأسيس
                  </p>
                  <p className="text-xl font-black text-blue-600 dark:text-blue-400 tabular-nums">
                    {formatNumber(
                      Math.round(expenseTotals.establishment),
                    )}
                  </p>
                </div>
                <div className="p-2.5 bg-blue-50 dark:bg-blue-900/20 text-blue-500 rounded-2xl group-hover:scale-110 transition-transform">
                  <Sprout className="w-5 h-5" />
                </div>
              </div>
              <div className="bg-white dark:bg-neutral-800 p-4 rounded-3xl border border-emerald-100 dark:border-emerald-900/20 shadow-soft flex items-center justify-between group">
                <div>
                  <p className="text-neutral-400 dark:text-neutral-500 text-[9px] font-black uppercase mb-1">
                    تكاليف التشغيل
                  </p>
                  <p className="text-xl font-black text-emerald-600 dark:text-emerald-400 tabular-nums">
                    {formatNumber(Math.round(expenseTotals.operating))}
                  </p>
                </div>
                <div className="p-2.5 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-500 rounded-2xl group-hover:scale-110 transition-transform">
                  <FlaskConical className="w-5 h-5" />
                </div>
              </div>
            </div>
          </div>

          {/* Categories List */}
          <div className="space-y-4">
            <h3 className="text-lg font-black text-neutral-800 dark:text-neutral-100 px-1">
              توزيع المصروفات حسب الفئة
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {categoryGroups.map((group) => (
                <CategorySummaryCard
                  key={group.category.id}
                  category={group.category}
                  total={group.total}
                  count={group.count}
                  totalExpenses={expenseTotals.total}
                  onClick={() =>
                    setSelectedExpenseCategory(group.category.id)
                  }
                />
              ))}
            </div>
            {categoryGroups.length === 0 && (
              <div className="p-12 text-center text-neutral-400 font-bold bg-white dark:bg-neutral-900 rounded-[2rem] border border-neutral-200 dark:border-neutral-800">
                لا توجد مصروفات مسجلة
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="space-y-6 animate-enter">
          {/* Header with Back Button */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSelectedExpenseCategory(null)}
              className="p-2 rounded-xl bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors"
            >
              <ChevronRightIcon className="w-5 h-5 text-neutral-500" />
            </button>
            <div>
              <h2 className="text-xl font-black text-neutral-900 dark:text-white">
                {selectedCategory?.name}
              </h2>
              <p className="text-xs font-bold text-neutral-400">
                سجل الحركات التفصيلي
              </p>
            </div>
          </div>

          {/* Expenses List */}
          <div className="flex flex-col gap-2.5">
            {selectedCategoryExpenses.map((expense, index) => (
              <ReadOnlyExpenseCard
                key={expense.id}
                expense={expense}
                expenseCategories={categories}
                suppliers={suppliers}
                index={index}
                hideCategory={true}
                hideCycle={true}
                hideSupplier={true}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ReportExpensesTable;
