import React, { useMemo, useState, useEffect, useRef, lazy, Suspense } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import type { Expense } from "../../types";
import { formatNumber } from "../../utils/helpers";
import { CalendarIcon, PencilIcon, TrashIcon } from "../Icons";
import { useData } from "../../contexts/DataContext";
import Modal from "../shared/Modal";
import StaggerItem from "../shared/StaggerItem";
import { renderShiftBadge, renderEntryIcon } from './laborBadges';
export { renderShiftBadge, renderEntryIcon } from './laborBadges';

const EditLaborForm = lazy(() => import("./EditLaborForm"));
const BatchDayLaborModal = lazy(() => import("./BatchDayLaborModal"));

interface LaborLedgerProps {
  laborExpenses: Expense[];
}

// Local custom Date Formatter with Cache
const WEEKDAY_FMT = new Intl.DateTimeFormat("ar-EG", { weekday: "long" });
const laborDateCache = new Map<string, string>();
const formatLaborDate = (dateString: string | Date): string => {
  const key = typeof dateString === "string" ? dateString : dateString.toISOString();
  const cached = laborDateCache.get(key);
  if (cached) return cached;
  const date = typeof dateString === "string" ? new Date(dateString) : dateString;
  const result = `${WEEKDAY_FMT.format(date)} ${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`;
  laborDateCache.set(key, result);
  return result;
};

// Module-level parsing helpers
const extractWorkerName = (description: string) => {
  if (!description) return "عمالة يومية";
  if (description.includes("منصرف عمالة:")) return "منصرف إضافي";

  // Prioritize explicit worker name tag "عامل:"
  const match = description.match(/(?:^|[\s|])عامل:\s*([^|\-]+)/);
  if (match) {
    const name = match[1].trim();
    if (
      name &&
      name !== "شخص بدون اسم" &&
      name !== "بدون اسم" &&
      name !== "يومية بدون اسم"
    ) {
      return name;
    }
  }

  return "عمالة يومية";
};

const cleanAndDeduplicateActivities = (rawAct: string): string => {
  if (!rawAct) return "يومية عمل";
  const tokens = rawAct
    .split(/\s*(?:\+|\،|\,|\/)\s*/)
    .map((s) => s.trim())
    .filter(Boolean);
  const unique = Array.from(new Set(tokens));
  return unique.join(" + ") || "يومية عمل";
};

const extractActivity = (description: string) => {
  if (!description) return "يومية عمل";

  let rawAct = "";

  // 1. Check for "يومية بدون اسم" format
  if (description.includes('يومية بدون اسم')) {
      // It could be: "يومية بدون اسم - النشاط"
      const dashMatch = description.match(/يومية بدون اسم\s*-\s*([^|]+)/);
      if (dashMatch) {
          rawAct = dashMatch[1].replace(/\(يومية عمل.*?\)/, '').trim();
      } else {
          // Or it could be: "يومية بدون اسم | النشاط | ..."
          const parts = description.split('|').map(p => p.trim());
          // Find "يومية بدون اسم" index
          const index = parts.findIndex(p => p.includes('يومية بدون اسم'));
          if (index !== -1 && index + 1 < parts.length) {
              rawAct = parts[index + 1].replace(/\(يومية عمل.*?\)/, '').trim();
          }
      }
  } else if (description.includes('عامل:')) {
      // 2. Check for "عامل:" format
      const singleMatch = description.match(/عامل:\s*[^|]+\s*\|\s*([^|]+)/);
      if (singleMatch) {
          rawAct = singleMatch[1].replace(/\(يومية عمل.*?\)/, '').trim();
      }
  } else if (description.includes('منصرف عمالة:')) {
      // 3. Check for operational "منصرف عمالة:" format
      const opMatch = description.match(/منصرف عمالة:\s*([^|]+)/);
      if (opMatch) return opMatch[1].trim();
  } else {
      // Fallback split by | or - to extract something
      const parts = description.split(/[-|]/);
      if (parts.length > 1) {
          // Filter out greenhouse names, worker tags, and note headers
          const cleanedParts = parts.map(p => p.trim()).filter(p => {
              if (p.includes('🏠') || p.includes('🌿') || p.includes('عامل:') || p.includes('يومية بدون اسم') || p.includes('ملاحظة') || p.includes('ملاحظات')) return false;
              return true;
          });
          if (cleanedParts.length > 0) {
              rawAct = cleanedParts[0].replace(/\(يومية عمل.*?\)/, '').trim();
          } else {
              rawAct = parts[parts.length - 1].trim();
          }
      } else {
          rawAct = description;
      }
  }

  return cleanAndDeduplicateActivities(rawAct);
};

const getNormalizedActivity = (description: string): string => {
  let act = extractActivity(description);
  act = act.replace(/\s*\(دفعة كاش فوري\)/g, "");
  act = act.replace(/\s*\(المتبقي رصيد آجل\)/g, "");
  return cleanAndDeduplicateActivities(act.trim()) || "يومية عمل";
};

const LaborLedger: React.FC<LaborLedgerProps> = ({ laborExpenses }) => {
  const { deleteExpense } = useData();
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [batchEditingDay, setBatchEditingDay] = useState<{ date: string; expenses: Expense[] } | null>(null);
  const [expenseToDelete, setExpenseToDelete] = useState<Expense | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // State for toggling groups
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(
    {},
  );

  const toggleGroup = (key: string) => {
    setExpandedGroups((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // Group by Date AND then by Worker Name (Smart Grouping)
  const processedGroups = useMemo(() => {
    // Double-safety filter: exclude advances and payment settlements to preserve pure operational wages
    const filteredExpenses = laborExpenses.filter((exp) => {
      const desc = exp.description || "";

      // Strict exclusion for financial/ledger transactions
      const isFinancial =
        desc.includes("سداد") ||
        desc.includes("تسديد") ||
        desc.includes("سلفة") ||
        desc.includes("سلفية") ||
        desc.includes("تخصيم") ||
        desc.includes("تصفية") ||
        (desc.includes("صرف") && !desc.includes("منصرف")) ||
        desc.includes("دفعة نقدية") ||
        desc.includes("مسحوبات");

      return !isFinancial;
    });

    const dayGroups: Record<string, Expense[]> = {};
    const sorted = [...filteredExpenses].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );

    sorted.forEach((exp) => {
      if (!dayGroups[exp.date]) dayGroups[exp.date] = [];
      dayGroups[exp.date].push(exp);
    });

    return Object.entries(dayGroups).map(([date, exps]) => {
      const workerMap: Record<string, Expense[]> = {};

      exps.forEach((e) => {
        const workerName = extractWorkerName(e.description);
        if (!workerMap[workerName]) {
          workerMap[workerName] = [];
        }
        workerMap[workerName].push(e);
      });

      const finalItems: any[] = [];

      Object.entries(workerMap).forEach(([workerName, items]) => {
        const totalAmount = items.reduce((sum, exp) => sum + exp.amount, 0);
        const cashAmount = items
          .filter((exp) => exp.payment_method === "cash")
          .reduce((sum, exp) => sum + exp.amount, 0);
        const creditAmount = items
          .filter((exp) => exp.payment_method === "credit")
          .reduce((sum, exp) => sum + exp.amount, 0);

        const allTokens = items.flatMap((exp) => {
          const raw = getNormalizedActivity(exp.description);
          return raw.split(/\s*(?:\+|\،|\,|\/)\s*/).map((s) => s.trim()).filter(Boolean);
        });
        const consolidatedActivity = Array.from(new Set(allTokens)).join(" + ") || "يومية عمل";

        finalItems.push({
          isConsolidatedWorker: true,
          workerName,
          activity: consolidatedActivity,
          totalAmount,
          cashAmount,
          creditAmount,
          expenses: items,
          cycleId: items[0].cycle_id,
          date,
        });
      });

      return {
        date,
        items: finalItems,
        allExpenses: exps,
        totalForDay: exps.reduce((s, e) => s + e.amount, 0),
      };
    });
  }, [laborExpenses]);

  const PAGE_SIZE = 10; // عدد الأيام المعروضة في كل دفعة

  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const sentinelRef = useRef<HTMLDivElement>(null);

  // إعادة الضبط عند تغيّر البيانات (فلتر / صوبة / دورة)
  useEffect(() => { setVisibleCount(PAGE_SIZE); }, [laborExpenses]);

  useEffect(() => {
    const target = sentinelRef.current;
    if (!target || visibleCount >= processedGroups.length) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setVisibleCount(prev => Math.min(prev + PAGE_SIZE, processedGroups.length));
        }
      },
      { rootMargin: "400px" }
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [visibleCount, processedGroups.length]);

  const visibleGroups = useMemo(
    () => processedGroups.slice(0, visibleCount),
    [processedGroups, visibleCount]
  );

  const parentRef = useRef<HTMLDivElement>(null);

  const rowVirtualizer = useVirtualizer({
    count: visibleGroups.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 160,
    overscan: 5,
  });

  if (processedGroups.length === 0) {
    return (
      <div className="bg-white dark:bg-neutral-800 rounded-3xl p-12 text-center border border-neutral-200 dark:border-neutral-700 shadow-sm animate-fade-in">
        <CalendarIcon className="w-12 h-12 text-neutral-300 dark:text-neutral-600 mx-auto mb-4" />
        <h3 className="text-xl font-black text-neutral-800 dark:text-neutral-200 mb-2">
          لا توجد يوميات مسجلة
        </h3>
        <p className="text-sm font-bold text-neutral-500">
          قم بتسجيل يوميات العمال لعرض الكشف التفصيلي هنا.
        </p>
      </div>
    );
  }

  const renderGroupCard = (group: typeof processedGroups[0], idx: number) => (
        <StaggerItem key={group.date || idx} index={idx}>
          <div
            className="bg-white dark:bg-neutral-900 rounded-3xl border-r-4 border-r-indigo-500 dark:border-r-indigo-400 border-y border-l border-neutral-200/70 dark:border-neutral-800 shadow-sm overflow-hidden transition-all hover:shadow-md"
          >
          {/* Card Header (تاريخ اليوم - تعديل اليوم بالكامل - إجمالي اليوم) */}
          <div className="bg-neutral-50/70 dark:bg-neutral-900/45 py-2.5 px-3.5 sm:px-5 flex justify-between items-center border-b border-neutral-100 dark:border-neutral-800/80 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <CalendarIcon className="w-4 h-4 text-accent-warning shrink-0" />
              <span className="text-xs sm:text-sm font-black text-neutral-800 dark:text-neutral-100 tracking-tight">
                {formatLaborDate(group.date)}
              </span>
            </div>

            <div className="flex items-center gap-2">
              {/* Batch Edit Day Button (Icon-only) */}
              <button
                type="button"
                onClick={() => setBatchEditingDay({ date: group.date, expenses: group.allExpenses })}
                className="w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center bg-accent-info/10 hover:bg-accent-info/10 text-accent-info dark:bg-accent-info/20 dark:hover:bg-indigo-900/80 dark:text-accent-info border border-accent-info/20 dark:border-accent-info/30 transition-all cursor-pointer shadow-2xs hover:scale-105 tap shrink-0"
                title="تعديل وتوحيد يوميات هذا اليوم مجمعة"
                aria-label="تعديل وتوحيد يوميات هذا اليوم"
              >
                <PencilIcon className="w-3.5 h-3.5" />
              </button>

              <div className="flex items-center gap-1 bg-neutral-100 dark:bg-neutral-800 px-2.5 py-1 rounded-full border border-neutral-200/40 dark:border-neutral-700/40 shrink-0">
                <span className="text-2xs sm:text-2xs font-bold text-neutral-500 dark:text-neutral-400">
                  إجمالي:
                </span>
                <span className="inline-flex items-center gap-[2px]">
                  <span className="text-[9.5px] font-black text-neutral-400 dark:text-neutral-500 select-none">
                    ج.م
                  </span>
                  <span
                    dir="ltr"
                    className="text-xs sm:text-sm font-mono font-black text-accent-info dark:text-accent-info tabular-nums tracking-tight"
                  >
                    {formatNumber(group.totalForDay)}
                  </span>
                </span>
              </div>
            </div>
          </div>

          {/* Inside Day Container Card: Continuous Rows of Actions separated by dividers */}
          <div className="bg-transparent">
            {group.items.map((item, _itemIdx) => {
              if (item.isConsolidatedWorker) {
                const consolidated = item as {
                  isConsolidatedWorker: true;
                  workerName: string;
                  activity: string;
                  totalAmount: number;
                  cashAmount: number;
                  creditAmount: number;
                  expenses: Expense[];
                  cycleId: string;
                  date: string;
                };

                const key = `${consolidated.date}-${consolidated.workerName}-${consolidated.activity}`;
                const hasMultiple = consolidated.expenses.length > 1;
                const isExpanded = !!expandedGroups[key];

                return (
                  <div
                    key={key}
                    className={`flex flex-col relative transition-all duration-200 my-2 mx-2 sm:mx-3 rounded-2xl border ${
                      hasMultiple && isExpanded
                        ? "border-accent-info/20 dark:border-accent-info/30 bg-accent-info/10 dark:bg-accent-info/20 shadow-sm"
                        : "border-neutral-200/90 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-2xs hover:border-neutral-300 dark:hover:border-neutral-700"
                    }`}
                  >
                    {/* Stacked Cards Effect (تأثير الورق المتراكم للبطاقات المجمعة المغلقة) */}
                    {hasMultiple && !isExpanded && (
                      <>
                        <div className="absolute -bottom-1.5 inset-x-2.5 h-full bg-neutral-200/70 dark:bg-neutral-800/70 rounded-2xl border border-neutral-300/60 dark:border-neutral-700/60 -z-20 pointer-events-none scale-[0.96] shadow-2xs" />
                        <div className="absolute -bottom-0.75 inset-x-1.25 h-full bg-neutral-100 dark:bg-neutral-850 rounded-2xl border border-neutral-200 dark:border-neutral-800 -z-10 pointer-events-none scale-[0.98] shadow-2xs" />
                      </>
                    )}

                    {/* Consolidated Worker Row Header */}
                    <div
                      onClick={() => {
                        if (hasMultiple) {
                          toggleGroup(key);
                        }
                      }}
                      className={`flex items-center justify-between py-3 px-3.5 sm:px-4 rounded-2xl transition-all duration-150 group gap-2.5 ${
                        hasMultiple ? "cursor-pointer select-none" : ""
                      }`}
                    >
                      <div className="min-w-0 flex-1 flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-accent-info/10 text-indigo-650 dark:bg-indigo-500/15 dark:text-accent-info flex items-center justify-center shrink-0 font-medium select-none">
                          {renderEntryIcon(consolidated.workerName, consolidated.activity, consolidated.expenses[0]?.description)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <h4 className="text-xs sm:text-sm font-bold text-neutral-800 dark:text-neutral-100 truncate leading-tight">
                              {consolidated.workerName}
                            </h4>
                            {!hasMultiple && consolidated.expenses[0] && (
                              <div className="shrink-0">
                                {renderShiftBadge(consolidated.expenses[0].shift_type)}
                              </div>
                            )}
                            {hasMultiple && (
                              <span className="text-2xs font-black bg-accent-info/10 text-accent-info dark:bg-indigo-500/20 dark:text-accent-info px-1.5 py-0.5 rounded-md leading-none">
                                ({consolidated.expenses.length} يوميات)
                              </span>
                            )}
                          </div>
                          <div className="text-2xs font-medium text-neutral-400 dark:text-neutral-500 mt-1 truncate leading-none">
                            {consolidated.activity}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2.5 shrink-0">
                        {!hasMultiple ? (
                          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-all duration-150">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingExpense(consolidated.expenses[0]);
                              }}
                              className="p-1 text-neutral-400 hover:text-accent-info hover:bg-accent-info/10 dark:hover:bg-indigo-950/30 rounded transition-colors cursor-pointer"
                              title="تعديل"
                            >
                              <PencilIcon className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setExpenseToDelete(consolidated.expenses[0]);
                              }}
                              className="p-1 text-neutral-400 hover:text-accent-danger hover:bg-accent-danger/10 dark:hover:bg-accent-danger/20 rounded transition-colors cursor-pointer"
                              title="حذف"
                            >
                              <TrashIcon className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : null}

                        <div className="text-left flex flex-col items-end">
                          <div className="flex items-center gap-0.5">
                            <span className="text-2xs font-bold text-neutral-400 font-sans select-none">
                              ج.م
                            </span>
                            <span
                              dir="ltr"
                              className="text-xs sm:text-sm font-mono font-black tabular-nums leading-none text-neutral-800 dark:text-neutral-100"
                            >
                              {formatNumber(consolidated.totalAmount)}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 mt-1 leading-none">
                            {consolidated.cashAmount > 0 &&
                            consolidated.creditAmount > 0 ? (
                              <div className="flex items-center gap-1 flex-wrap">
                                <span className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded text-2xs font-bold bg-accent-success/10 text-accent-success dark:bg-accent-success/15 dark:text-accent-success">
                                  نقدي {formatNumber(consolidated.cashAmount)}
                                </span>
                                <span className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded text-2xs font-bold bg-accent-warning/10 text-accent-warning dark:bg-accent-warning/15 dark:text-accent-warning">
                                  آجل {formatNumber(consolidated.creditAmount)}
                                </span>
                              </div>
                            ) : consolidated.cashAmount > 0 ? (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-2xs font-bold bg-accent-success/10 text-accent-success dark:bg-accent-success/15 dark:text-accent-success">
                                <span className="w-1 h-1 rounded-full bg-accent-success" />
                                نقداً بالكامل
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-2xs font-bold bg-accent-warning/10 text-accent-warning dark:bg-accent-warning/15 dark:text-accent-warning">
                                <span className="w-1 h-1 rounded-full bg-accent-warning" />
                                آجل بالكامل
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Action Chevron Button in a small prominent circle on far left */}
                        {hasMultiple && (
                          <div
                            className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center shrink-0 transition-all duration-200 border shadow-2xs ${
                              isExpanded
                                ? "bg-indigo-600 text-white border-indigo-600 dark:bg-indigo-500 dark:border-indigo-500 shadow-indigo-500/20"
                                : "bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 hover:bg-accent-info/10 dark:hover:bg-indigo-900/40 hover:text-accent-info dark:hover:text-indigo-300 border-neutral-200/80 dark:border-neutral-700/60"
                            }`}
                          >
                            <svg
                              className={`w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[2.5] transition-transform duration-200 ${
                                isExpanded ? "rotate-180" : ""
                              }`}
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M19 9l-7 7-7-7"
                              />
                            </svg>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Nested list for split payments */}
                    {hasMultiple && isExpanded && (
                      <div className="bg-neutral-50/30 dark:bg-neutral-900/10 flex flex-col w-full border-b border-neutral-100 dark:border-neutral-800/40">
                        {consolidated.expenses.map((exp: Expense) => {
                          const subActivity = extractActivity(exp.description);
                          return (
                            <div
                              key={exp.id}
                              className="flex items-center justify-between py-2 px-6 sm:px-10 border-b border-neutral-100/40 dark:border-neutral-800/30 last:border-b-0 bg-transparent hover:bg-neutral-50/50 dark:hover:bg-neutral-800/15 transition-all duration-150 group/item gap-2"
                            >
                              <div className="flex items-center gap-2 min-w-0 flex-1 flex-wrap">
                                <div
                                  className={`w-1.5 h-1.5 rounded-full ${exp.payment_method === "cash" ? "bg-accent-success" : "bg-accent-warning"} shrink-0`}
                                />
                                <span className="text-2xs sm:text-xs font-bold text-neutral-700 dark:text-neutral-300 truncate">
                                  {subActivity}
                                </span>
                                <div className="shrink-0">
                                  {renderShiftBadge(exp.shift_type)}
                                </div>
                                <span
                                  className={`inline-flex items-center px-1.5 py-0.5 rounded text-2xs font-bold ${
                                    exp.payment_method === "cash"
                                      ? "bg-accent-success/10 text-accent-success dark:bg-accent-success/15 dark:text-accent-success"
                                      : "bg-accent-warning/10 text-accent-warning dark:bg-accent-warning/15 dark:text-accent-warning"
                                  }`}
                                >
                                  {exp.payment_method === "cash" ? "نقداً" : "آجل"}
                                </span>
                              </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <div className="flex items-center gap-0.5 opacity-0 group-hover/item:opacity-100 transition-all duration-150">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEditingExpense(exp);
                                  }}
                                  className="p-1 text-neutral-400 hover:text-accent-info hover:bg-accent-info/10 dark:hover:bg-indigo-950/30 rounded transition-colors cursor-pointer"
                                  title="تعديل"
                                >
                                  <PencilIcon className="w-3 h-3" />
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setExpenseToDelete(exp);
                                  }}
                                  className="p-1 text-neutral-400 hover:text-accent-danger hover:bg-accent-danger/10 dark:hover:bg-accent-danger/20 rounded transition-colors cursor-pointer"
                                  title="حذف"
                                >
                                  <TrashIcon className="w-3 h-3" />
                                </button>
                              </div>
                              <div className="flex items-center gap-0.5">
                                <span className="text-2xs font-bold text-neutral-400 select-none">
                                  ج.م
                                </span>
                                <span
                                  dir="ltr"
                                  className="text-xs font-mono font-bold text-neutral-700 dark:text-neutral-300 tabular-nums"
                                >
                                  {formatNumber(exp.amount)}
                                </span>
                              </div>
                            </div>
                          </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              }

              // Single Expense/unnamed Rendering
              const expense = item as Expense;
              const workerName = extractWorkerName(expense.description);
              const activity = extractActivity(expense.description);

              return (
                <div
                  key={expense.id}
                  className="flex items-center justify-between py-3 px-4 border-b border-gray-100 dark:border-neutral-800/60 last:border-b-0 bg-transparent hover:bg-neutral-50/35 dark:hover:bg-neutral-800/10 transition-all duration-150 group gap-3"
                >
                  <div className="min-w-0 flex-1 flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-accent-warning/10 text-accent-warning dark:bg-accent-warning/15 dark:text-accent-warning flex items-center justify-center shrink-0 font-medium select-none">
                      {renderEntryIcon(workerName, activity, expense.description)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h4 className="text-xs sm:text-sm font-bold text-neutral-800 dark:text-neutral-100 truncate leading-tight">
                          {workerName}
                        </h4>
                        <div className="shrink-0">
                          {renderShiftBadge(expense.shift_type)}
                        </div>
                      </div>
                      <div className="text-2xs font-medium text-neutral-400 dark:text-neutral-500 mt-1 truncate leading-none">
                        {activity}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 shrink-0">
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-all duration-150">
                      <button
                        onClick={() => setEditingExpense(expense)}
                        className="p-1 text-neutral-400 hover:text-accent-info hover:bg-accent-info/10 dark:hover:bg-indigo-950/30 rounded transition-colors cursor-pointer"
                        title="تعديل"
                      >
                        <PencilIcon className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setExpenseToDelete(expense)}
                        className="p-1 text-neutral-400 hover:text-accent-danger hover:bg-accent-danger/10 dark:hover:bg-accent-danger/20 rounded transition-colors cursor-pointer"
                        title="حذف"
                      >
                        <TrashIcon className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="text-left flex flex-col items-end">
                      <div className="flex items-center gap-0.5">
                        <span className="text-2xs font-bold text-neutral-400 font-sans select-none">
                          ج.م
                        </span>
                        <span
                          dir="ltr"
                          className={`text-xs sm:text-sm font-mono font-black tabular-nums leading-none ${expense.amount < 0 ? "text-accent-success font-extrabold" : "text-neutral-800 dark:text-neutral-100"}`}
                        >
                          {expense.amount < 0
                            ? `+${formatNumber(Math.abs(expense.amount))}`
                            : formatNumber(expense.amount)}
                        </span>
                      </div>
                      <span
                        className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-2xs font-bold mt-1.5 transition-all ${
                          expense.amount < 0
                            ? "bg-accent-info/10 text-accent-info dark:bg-blue-500/15 dark:text-accent-info"
                            : expense.payment_method === "cash"
                              ? "bg-accent-success/10 text-accent-success dark:bg-accent-success/15 dark:text-accent-success"
                              : "bg-accent-warning/10 text-accent-warning dark:bg-accent-warning/15 dark:text-accent-warning"
                        }`}
                      >
                        <span
                          className={`w-1 h-1 rounded-full ${expense.amount < 0 ? "bg-blue-500" : expense.payment_method === "cash" ? "bg-accent-success" : "bg-accent-warning"}`}
                        />
                        {expense.amount < 0
                          ? "قبض كاش للداخل"
                          : expense.payment_method === "cash"
                            ? "نقداً"
                            : "آجل"}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        </StaggerItem>
);

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex justify-between items-center px-1">
        <span className="text-xs font-black text-neutral-500 dark:text-neutral-400">
          دفتر الحضور اليومي للعمالة
        </span>
        <span className="text-2xs font-black text-neutral-400 bg-neutral-100 dark:bg-neutral-800/60 px-2.5 py-1 rounded-lg">
          {processedGroups.length} أيام مسجلة
        </span>
      </div>

      {visibleGroups.length < 30 ? (
        <div className="space-y-4">
          {visibleGroups.map((group, idx) => renderGroupCard(group, idx))}
        </div>
      ) : (
        <div 
          ref={parentRef}
          className="max-h-[75vh] overflow-y-auto space-y-4 pr-0.5"
        >
          <div
            style={{
              height: `${rowVirtualizer.getTotalSize()}px`,
              width: '100%',
              position: 'relative',
            }}
          >
            {rowVirtualizer.getVirtualItems().map((virtualRow) => {
              const group = visibleGroups[virtualRow.index];
              return (
                <div
                  key={virtualRow.key}
                  data-index={virtualRow.index}
                  ref={rowVirtualizer.measureElement}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    transform: `translateY(${virtualRow.start}px)`,
                  }}
                  className="pb-4"
                >
                  {renderGroupCard(group, virtualRow.index)}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {visibleCount < processedGroups.length && (
        <div ref={sentinelRef} className="py-4 flex justify-center">
          <button
            type="button"
            onClick={() => setVisibleCount(prev => Math.min(prev + PAGE_SIZE, processedGroups.length))}
            className="px-4 py-2 rounded-xl text-xs font-black bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-all cursor-pointer"
          >
            عرض المزيد ({processedGroups.length - visibleCount} يوم متبقٍ)
          </button>
        </div>
      )}

      {/* Batch Day Labor Modal */}
      <Modal
        isOpen={!!batchEditingDay}
        onClose={() => setBatchEditingDay(null)}
        title="تعديل وتوحيد يوميات اليوم بالكامل"
        size="lg"
      >
        {batchEditingDay && (
          <Suspense fallback={<div className="py-10 flex justify-center"><div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" /></div>}>
            <BatchDayLaborModal
              date={batchEditingDay.date}
              expenses={batchEditingDay.expenses}
              onClose={() => setBatchEditingDay(null)}
            />
          </Suspense>
        )}
      </Modal>

      {/* Edit Modal */}
      <Modal
        isOpen={!!editingExpense}
        onClose={() => setEditingExpense(null)}
        title="تعديل يومية عمالة"
        size="md"
      >
        {editingExpense && (
          <Suspense fallback={<div className="py-10 flex justify-center"><div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" /></div>}>
            <EditLaborForm
              expense={editingExpense}
              onClose={() => setEditingExpense(null)}
            />
          </Suspense>
        )}
      </Modal>

      {/* Delete Modal */}
      <Modal
        isOpen={!!expenseToDelete}
        onClose={() => setExpenseToDelete(null)}
        title="تأكيد الحذف"
        size="md"
      >
        <div className="space-y-4">
          <div className="p-4 bg-accent-danger/10 dark:bg-accent-danger/20 text-accent-danger dark:text-accent-danger rounded-xl text-sm font-bold border border-accent-danger/20 dark:border-accent-danger/30">
            هل أنت متأكد من حذف هذه اليومية؟ سيتم إزالتها من المصروفات وحسابات
            العمال (إن كانت آجلة) بشكل نهائي.
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => setExpenseToDelete(null)}
              disabled={isDeleting}
              className="flex-1 py-2.5 bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700 rounded-lg text-sm font-bold transition-all disabled:opacity-50"
            >
              تراجع
            </button>
            <button
              type="button"
              disabled={isDeleting}
              onClick={async () => {
                if (!expenseToDelete) return;
                setIsDeleting(true);
                try {
                  await deleteExpense(expenseToDelete.id);
                  setExpenseToDelete(null);
                } catch (err) {
                  console.error(err);
                } finally {
                  setIsDeleting(false);
                }
              }}
              className="flex-1 py-2.5 bg-accent-danger hover:bg-accent-danger text-white rounded-lg text-sm font-black transition-all shadow-sm disabled:opacity-50 flex justify-center items-center gap-2"
            >
              {isDeleting ? "جاري الحذف..." : "نعم، احذف"}
              {!isDeleting && <TrashIcon className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default LaborLedger;
