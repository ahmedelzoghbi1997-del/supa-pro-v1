import React, { useMemo } from "react";
import type { Expense, ExpenseCategory, Supplier } from "../../types";
import { TrendingDownIcon, ClockIcon } from "../Icons";
import { formatNumber } from "../../utils/helpers";
import EmptyState from "../shared/EmptyState";
import Card from "../shared/Card";
import { useData } from "../../contexts/DataContext";
import { useUI } from "../../contexts/UIContext";
import ExpenseCardSkeleton from "./ExpenseCardSkeleton";
import { EmptyExpensesIllustration } from "../Illustrations";
import ExpenseCard from "./ExpenseCard";
import ExtendedFAB from "../shared/ExtendedFAB";
import { getExpenseCategoryMeta } from "../../utils/expenseIconUtils";

interface CategorySummaryCardProps {
  category: ExpenseCategory;
  total: number;
  count: number;
  totalExpenses: number;
  onClick: () => void;
}

const CategorySummaryCard: React.FC<CategorySummaryCardProps> = ({
  category,
  total,
  count,
  totalExpenses,
  onClick,
}) => {
  const meta = getExpenseCategoryMeta(category);
  const Icon = meta.icon;
  const percentage = totalExpenses > 0 ? (total / totalExpenses) * 100 : 0;

  return (
    <button
      onClick={onClick}
      className="group w-full bg-white dark:bg-neutral-850 p-4 rounded-2xl shadow-soft border border-neutral-100/85 dark:border-neutral-750 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 text-right active:scale-[0.985] flex flex-col gap-3"
    >
      <div className="flex items-center justify-between w-full gap-4">
        <div className="flex items-center gap-4">
          {/* Tinted Minimalist container for Icon */}
          <div
            className={`flex-shrink-0 w-12 h-12 flex items-center justify-center rounded-xl border ${meta.bg} ${meta.border}`}
          >
            <Icon className={`w-6 h-6 ${meta.color}`} strokeWidth={1.5} />
          </div>
          <div className="flex flex-col items-start gap-1">
            <h3 className="text-sm sm:text-[15px] font-bold text-neutral-800 dark:text-neutral-100 leading-snug">
              {category.name}
            </h3>
            <p className="text-[10px] sm:text-xs text-neutral-400 font-medium bg-neutral-100 dark:bg-neutral-800 px-2.5 py-0.5 rounded-lg leading-none">
              {count} حركات
            </p>
          </div>
        </div>

        <div className="flex flex-col items-end gap-1">
          <p className="text-base sm:text-lg font-black text-neutral-850 dark:text-white tabular-nums tracking-tight">
            {formatNumber(Math.round(total))}
            <span className="text-xs mr-1 opacity-50 font-medium text-neutral-500 dark:text-neutral-400">
              ج.م
            </span>
          </p>
          {percentage > 0 && (
            <span
              className={`text-[10px] font-extrabold px-2 py-0.5 rounded-lg border ${meta.badgeBg}`}
            >
              %{percentage.toFixed(1)}
            </span>
          )}
        </div>
      </div>

      {/* Progress Bar - Thinner, Sleeker and Beautifully Cohesive */}
      <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-[4px] overflow-hidden mt-1">
        <div
          className={`h-full ${meta.progressBarBg} rounded-full transition-all duration-1000 ease-out`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </button>
  );
};

interface ExpensesListProps {
  expenses: Expense[];
  onAddNew: () => void;
  onDelete: (id: string) => void;
  onEdit: (id: string) => void;
  lastAddedId: string | null;
  onAnimationEnd: () => void;
  expenseCategories: ExpenseCategory[];
  suppliers: Supplier[];
  onViewSupplierDetails: () => void;
  onViewCategoryDetails: (id: string) => void;
}

const ExpensesList: React.FC<ExpensesListProps> = ({
  expenses,
  onAddNew,
  onDelete,
  onEdit,
  lastAddedId,
  onAnimationEnd,
  expenseCategories,
  onViewCategoryDetails,
}) => {
  const { profile, suppliers } = useData();
  const { loading, highlightedItemId } = useUI();
  const isViewer = profile?.role === "viewer";

  const totals = useMemo(() => {
    return expenses.reduce(
      (acc, e) => {
        acc.total += e.amount;
        if (e.is_establishment) acc.establishment += e.amount;
        else acc.operating += e.amount;
        return acc;
      },
      { total: 0, establishment: 0, operating: 0 },
    );
  }, [expenses]);

  const categoryGroups = useMemo(() => {
    const groups: Record<
      string,
      { category: ExpenseCategory; total: number; count: number }
    > = {};

    expenses.forEach((exp) => {
      const catId = exp.category_id;
      const category = expenseCategories.find((c) => c.id === catId);
      if (category) {
        if (!groups[catId]) groups[catId] = { category, total: 0, count: 0 };
        groups[catId].total += exp.amount;
        groups[catId].count += 1;
      }
    });
    return Object.values(groups).sort((a, b) => b.total - a.total);
  }, [expenses, expenseCategories]);

  const recentExpenses = useMemo(() => {
    const baseRecent = [...expenses]
      .sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      )
      .slice(0, 5);

    // If we have a highlighted item that isn't in the top 5, add it so it can be scrolled to
    if (highlightedItemId) {
      const isAlreadyIncluded = baseRecent.some(
        (e) =>
          String(e.id) === String(highlightedItemId) ||
          String((e as any)._stable_id) === String(highlightedItemId),
      );
      if (!isAlreadyIncluded) {
        const highlightedExpense = expenses.find(
          (e) =>
            String(e.id) === String(highlightedItemId) ||
            String((e as any)._stable_id) === String(highlightedItemId),
        );
        if (highlightedExpense) {
          return [...baseRecent, highlightedExpense];
        }
      }
    }
    return baseRecent;
  }, [expenses, highlightedItemId]);

  if (loading)
    return (
      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <ExpenseCardSkeleton key={i} />
        ))}
      </div>
    );

  if (expenses.length === 0) {
    return (
      <div className="space-y-8">
        <EmptyState
          icon={EmptyExpensesIllustration}
          title="لا توجد مصروفات بعد"
          message="ابدأ بإضافة مصروفك الأول عبر زر الإضافة السريع بالأسفل."
          actionText={!isViewer ? "إضافة مصروف" : undefined}
          onAction={!isViewer ? onAddNew : undefined}
        />
        {!isViewer && <ExtendedFAB onClick={onAddNew} label="مصروف" />}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Unified Agriculture Expenses Card - Exactly matching the premium, compact size and footprint of the invoices card */}
      <Card className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-rose-300/80 dark:border-rose-800/50 p-4 rounded-2xl shadow-sm bg-rose-100/70 dark:bg-rose-900/20">
        {/* القسم الأيمن: إجمالي المصروفات والتقسيم التفصيلي الصغير له */}
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <TrendingDownIcon className="h-8 w-8 text-rose-500 shrink-0" />
          <div className="text-start min-w-0">
            <p className="text-neutral-500 dark:text-neutral-400 text-xs font-black">
              إجمالي المصروفات
            </p>
            <p className="text-2xl font-black text-rose-600 dark:text-rose-400 tabular-nums leading-none mt-1">
              {formatNumber(Math.round(totals.total))}
              <span className="text-xs mr-1 opacity-75">ج.م</span>
            </p>

            {/* التأسيس والتشغيل تفصيلياً بخط مرن ومتجاوب لمنع أي تداخل */}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-[10px] sm:text-xs text-neutral-500 dark:text-neutral-400 font-bold select-none">
              <span className="flex items-center gap-1.5 whitespace-nowrap">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 inline-block shrink-0" />
                <span>تأسيس:</span>{" "}
                <strong className="text-neutral-700 dark:text-neutral-200 tabular-nums font-extrabold">
                  {formatNumber(Math.round(totals.establishment))} ج.م
                </strong>
              </span>
              <span className="hidden sm:inline-block w-[1px] h-3 bg-neutral-300 dark:bg-neutral-700" />
              <span className="flex items-center gap-1.5 whitespace-nowrap">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block shrink-0" />
                <span>تشغيل:</span>{" "}
                <strong className="text-neutral-700 dark:text-neutral-200 tabular-nums font-extrabold">
                  {formatNumber(Math.round(totals.operating))} ج.م
                </strong>
              </span>
            </div>
          </div>
        </div>

        {/* القسم الأيسر: إحصائيات متوازنة لمظهر متناسق تماماً */}
        <div className="text-start sm:text-end shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0 border-rose-200/60 dark:border-rose-800/40 pl-1">
          <p className="text-neutral-500 dark:text-neutral-400 text-[10px] sm:text-xs font-black">
            حركات الصرف
          </p>
          <p className="text-base sm:text-lg font-black text-neutral-800 dark:text-neutral-200 tabular-nums leading-none mt-1">
            {expenses.length}{" "}
            <span className="text-[10px] sm:text-xs opacity-75 font-bold">
              حركة
            </span>
          </p>
        </div>
      </Card>

      {/* Categories Section */}
      <div className="space-y-5">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 px-2">
          <h2 className="text-xl font-black text-neutral-800 dark:text-neutral-100 tracking-tight">
            توزيع المصروفات حسب الفئة
          </h2>
        </div>

        <div className="flex flex-col gap-3 px-1">
          {categoryGroups.map((group) => (
            <CategorySummaryCard
              key={group.category.id}
              category={group.category}
              total={group.total}
              count={group.count}
              totalExpenses={totals.total}
              onClick={() => onViewCategoryDetails(group.category.id)}
            />
          ))}
        </div>
      </div>

      {/* Recent Transactions */}
      {recentExpenses.length > 0 && (
        <div className="space-y-4 px-1 pt-4">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2 opacity-50">
              <ClockIcon className="w-4 h-4" />
              <h3 className="text-[10px] font-black uppercase tracking-widest">
                أحدث الحركات
              </h3>
            </div>
            {expenses.length > 5 && (
              <span className="text-[10px] font-bold text-neutral-400 dark:text-neutral-500">
                يعرض أحدث 5
              </span>
            )}
          </div>

          <div className="space-y-3">
            {recentExpenses.map((expense, index) => {
              const isSelectedForHighlight =
                highlightedItemId != null &&
                (String(highlightedItemId) === String(expense.id) ||
                  String(highlightedItemId) ===
                    String((expense as any)._stable_id));
              return (
                <ExpenseCard
                  key={expense.id}
                  expense={expense}
                  onDelete={isViewer ? undefined : onDelete}
                  onEdit={isViewer ? undefined : onEdit}
                  isNew={expense.id === lastAddedId}
                  isHighlighted={isSelectedForHighlight}
                  onAnimationEnd={onAnimationEnd}
                  expenseCategories={expenseCategories}
                  suppliers={suppliers}
                  index={index}
                />
              );
            })}
          </div>
        </div>
      )}

      {!isViewer && <ExtendedFAB onClick={onAddNew} label="مصروف" />}
    </div>
  );
};

export default ExpensesList;
