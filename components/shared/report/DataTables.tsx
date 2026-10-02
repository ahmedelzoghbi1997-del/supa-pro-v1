import React, { useMemo } from "react";
import {
  CalendarIcon,
  InvoicesIcon,
  CyclesIcon,
  TruckIcon,
} from "../../Icons";
import { formatNumber, formatShortDate } from "../../../utils/helpers";
import { getExpenseCategoryMeta } from "../../../utils/expenseIconUtils";
import type {
  Expense,
  ExpenseCategory,
  Supplier,
} from "../../../types";

// --- InfoTooltip Component ---
export const InfoTooltip = ({ content }: { content: string }) => {
  const [isVisible, setIsVisible] = React.useState(false);

  return (
    <div
      className="relative inline-flex items-center justify-center ml-1 z-50"
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
      onClick={(e) => {
        e.stopPropagation();
        setIsVisible(!isVisible);
      }}
    >
      <div className="w-4 h-4 rounded-full bg-neutral-200 dark:bg-neutral-700 flex items-center justify-center text-2xs font-bold text-neutral-500 dark:text-neutral-400 cursor-help hover:bg-neutral-300 dark:hover:bg-neutral-600 transition-colors">
        ؟
      </div>
      {isVisible && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-3 bg-neutral-800 dark:bg-neutral-100 text-white dark:text-neutral-900 text-2xs sm:text-xs rounded-lg shadow-xl z-[100] text-center leading-relaxed font-medium animate-enter pointer-events-none">
          {content}
          <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-neutral-800 dark:border-t-neutral-100"></div>
        </div>
      )}
    </div>
  );
};

export interface CategorySummaryCardProps {
  category: ExpenseCategory;
  total: number;
  count: number;
  totalExpenses: number;
  onClick: () => void;
}

export const CategorySummaryCard: React.FC<CategorySummaryCardProps> = React.memo(
  ({ category, total, count, totalExpenses, onClick }) => {
    const meta = getExpenseCategoryMeta(category.name);
    const Icon = meta.icon;
    const percentage = totalExpenses > 0 ? (total / totalExpenses) * 100 : 0;

    return (
      <button
        onClick={onClick}
        className="group w-full bg-white dark:bg-neutral-800 p-4 rounded-2xl shadow-[0_4px_12px_rgba(0,0,0,0.06)] border border-neutral-100 dark:border-neutral-700/50 hover:shadow-[0_8px_16px_rgba(0,0,0,0.08)] hover:-translate-y-0.5 transition-all duration-300 text-right tap flex items-center justify-between gap-4"
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
              className={`text-2xs font-bold px-2 py-0.5 rounded-lg border ${meta.badgeBg}`}
            >
              %{percentage.toFixed(1)}
            </span>
          )}
        </div>
      </button>
    );
  },
);

export interface ReadOnlyExpenseCardProps {
  expense: Expense;
  expenseCategories: ExpenseCategory[];
  suppliers: Supplier[];
  index: number;
  hideCycle?: boolean;
  hideSupplier?: boolean;
  hideCategory?: boolean;
}

export const InfoItem: React.FC<{
  value: string;
  icon: React.FC<React.SVGProps<SVGSVGElement>>;
}> = ({ value, icon: Icon }) => (
  <div className="flex items-center gap-1 text-neutral-400 dark:text-neutral-500 text-2xs sm:text-2xs shrink-0">
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
          textColor: "text-accent-info dark:text-accent-info",
          bgColor: "bg-accent-info/10 dark:bg-accent-info/20",
          borderColor: "border-accent-info/20 dark:border-accent-info/30",
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
          textColor: "text-accent-success dark:text-accent-success",
          bgColor: "bg-accent-success/10 dark:bg-accent-success/20",
          borderColor: "border-accent-success/20 dark:border-accent-success/30",
        });
      }

      return activeTags;
    }, [expense.is_establishment, expense.payment_method]);

    const primaryTextColor = tags[0]?.textColor || "text-neutral-600";

    return (
      <div
        className={`group relative bg-white dark:bg-neutral-800 p-2.5 sm:p-3 rounded-[16px] border border-neutral-200 dark:border-neutral-700 shadow-soft hover:shadow-md transition-all text-right tap flex items-center justify-between gap-3 w-full overflow-hidden animate-stagger-in`}
        style={{
          animationDelay: `${Math.min(index * 30, 600)}ms`,
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
                  className={`text-2xs font-black px-1.5 py-px rounded-full border ${tag.bgColor} ${tag.textColor} ${tag.borderColor} shadow-sm whitespace-nowrap`}
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
              <span className="text-2xs mr-0.5 opacity-50 font-bold uppercase">
                ج.م
              </span>
            </p>
          </div>
        </div>
      </div>
    );
  },
);

export interface StatMiniCardProps {
  label: string;
  value: number | string;
  icon: React.ElementType;
  colorClass: string;
  bgColorClass: string;
  count?: number;
  subLabel?: string;
  subIcon?: React.ElementType;
  onClick?: () => void;
}

export const StatMiniCard: React.FC<StatMiniCardProps> = React.memo(
  ({
    label,
    value,
    icon: Icon,
    colorClass,
    bgColorClass,
    count,
    subLabel,
    subIcon: SubIcon,
    onClick,
  }) => (
    <div
      onClick={onClick}
      className={`relative overflow-hidden p-4 sm:p-5 rounded-[1.5rem] sm:rounded-[2rem] ${bgColorClass} border border-neutral-100 dark:border-neutral-800 shadow-sm flex flex-col justify-between h-full transition-all duration-500 ease-out hover:-translate-y-1 hover:shadow-xl hover:border-neutral-200 dark:hover:border-neutral-700 group ${onClick ? "cursor-pointer tap" : ""}`}
    >
      <div
        className={`absolute -right-6 -top-6 w-24 h-24 rounded-full blur-2xl opacity-0 group-hover:opacity-20 transition-opacity duration-500 ${colorClass.replace("text-", "bg-")}`}
      ></div>
      <div className="relative z-10 flex justify-between items-start mb-3 sm:mb-4">
        <div
          className={`p-2 sm:p-3 rounded-xl sm:rounded-2xl ${colorClass.replace("text-", "bg-")}/10 ${colorClass} transition-transform duration-500 group-hover:scale-110 group-hover:rotate-3`}
        >
          <Icon className="w-5 h-5 sm:w-6 sm:h-6" />
        </div>
        <div className="text-left">
          <span className="text-2xs sm:text-2xs font-black text-neutral-400 bg-neutral-50 dark:bg-neutral-900 px-1.5 sm:px-2.5 py-0.5 sm:py-1 rounded-lg border border-neutral-100 dark:border-neutral-800 tabular-nums transition-colors group-hover:bg-white dark:group-hover:bg-neutral-800">
            {count} حركات
          </span>
        </div>
      </div>
      <div className="relative z-10">
        <p className="text-2xs sm:text-[11px] font-black text-neutral-500 dark:text-neutral-400 uppercase tracking-tight sm:tracking-widest mb-1">
          {label}
        </p>
        <p
          className={`text-sm sm:text-2xl font-black ${colorClass} tracking-tighter tabular-nums mb-2 sm:mb-3`}
        >
          {formatNumber(value)}
          <span className="text-2xs sm:text-xs mr-1 opacity-60 font-bold">
            ج.م
          </span>
        </p>

        {subLabel && (
          <div className="flex items-center gap-1 sm:gap-1.5 pt-2 sm:pt-3 border-t border-neutral-100 dark:border-neutral-700/50">
            {SubIcon && (
              <SubIcon className="w-2.5 h-2.5 sm:w-3 h-3 text-neutral-400" />
            )}
            <span className="text-2xs sm:text-2xs font-bold text-neutral-400 truncate max-w-full">
              {subLabel}
            </span>
          </div>
        )}
      </div>
    </div>
  ),
);

export interface MetricBoxProps {
  label: string;
  value: string | number;
  subValue?: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  tooltip?: string;
}

export const MetricBox: React.FC<MetricBoxProps> = React.memo(
  ({ label, value, subValue, icon: Icon, color, bgColor, tooltip }) => (
    <div className="group flex items-center gap-4 p-4 rounded-[1.5rem] bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 transition-all duration-500 ease-out hover:-translate-y-1 hover:shadow-xl hover:border-neutral-200 dark:hover:border-neutral-700 relative overflow-hidden">
      <div
        className={`absolute -right-4 -top-4 w-16 h-16 rounded-full blur-xl opacity-0 group-hover:opacity-20 transition-opacity duration-500 ${color.replace("text-", "bg-")}`}
      ></div>
      <div
        className={`relative z-10 p-3 rounded-2xl ${bgColor} ${color} transition-transform duration-500 group-hover:scale-110 group-hover:-rotate-3`}
      >
        <Icon className="w-6 h-6" />
      </div>
      <div className="relative z-10 flex-1 min-w-0">
        <div className="flex items-center gap-1 mb-0.5">
          <p className="text-2xs font-bold text-neutral-500 dark:text-neutral-400 truncate uppercase tracking-tighter">
            {label}
          </p>
          {tooltip && <InfoTooltip content={tooltip} />}
        </div>
        <div className="flex items-baseline gap-1">
          <p className="text-lg font-black text-neutral-800 dark:text-50 tabular-nums truncate">
            {value}
          </p>
          {subValue && (
            <span className="text-2xs font-bold text-neutral-400 shrink-0">
              {subValue}
            </span>
          )}
        </div>
      </div>
    </div>
  ),
);

export interface GridCardProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  className?: string;
}

export const GridCard: React.FC<GridCardProps> = ({
  children,
  title,
  subtitle,
  className = "",
}) => (
  <div
    className={`bg-white dark:bg-neutral-900 rounded-[2rem] border border-neutral-100 dark:border-neutral-800 shadow-sm overflow-hidden flex flex-col h-full transition-all duration-500 hover:shadow-md ${className}`}
  >
    {title && (
      <div className="px-5 py-4 border-b border-neutral-100 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/50 shrink-0">
        <h3 className="text-[13px] font-black text-neutral-800 dark:text-neutral-200 uppercase tracking-wider truncate">
          {title}
        </h3>
        {subtitle && (
          <p className="text-2xs text-neutral-500 font-bold mt-0.5 truncate">
            {subtitle}
          </p>
        )}
      </div>
    )}
    <div className="p-5 flex-grow flex flex-col justify-between">
      {children}
    </div>
  </div>
);
