import React, { useState, useMemo } from "react";
import {
  ResponsiveContainer,
  Tooltip,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  ReferenceLine,
} from "recharts";
import {
  ChevronRightIcon,
  ChevronLeftIcon,
  TruckIcon,
  LeafIcon,
  WavyArrowUpIcon,
  WavyArrowDownIcon,
} from "../../Icons";
import { formatNumber } from "../../../utils/helpers";
import type {
  Cycle,
  Invoice,
  Expense,
  ExpenseCategory,
} from "../../../types";
import { GridCard } from "./DataTables";

export interface InvoiceStats {
  id: string;
  market: string;
  date: string;
  declaredPrice: number;
  netPerRealKilo: number;
  efficiency: number;
}

export interface HarvestCurveData {
  date: string;
  weight: number;
}

// 1. محلل استهلاك المغذيات
export const MonthlyNutrientAnalysis: React.FC<{
  cycle: Cycle;
  expenses: Expense[];
  expenseCategories: ExpenseCategory[];
}> = React.memo(({ cycle, expenses, expenseCategories }) => {
  const [periodOffset, setPeriodOffset] = useState(0);

  const nutrientExpenses = useMemo(() => {
    const isNutrientCategory = (catId: string) => {
      const cat = expenseCategories.find((c) => c.id === catId);
      if (!cat) return false;
      const name = cat.name.toLowerCase();
      const isSeed =
        name.includes("بذور") ||
        name.includes("بذرة") ||
        name.includes("تقاوي") ||
        name.includes("شتلات") ||
        name.includes("شتلة");
      return cat.is_supplier_category && !isSeed;
    };
    return expenses.filter(
      (e) => e.cycle_id === cycle.id && isNutrientCategory(e.category_id),
    );
  }, [expenses, expenseCategories, cycle.id]);

  const stats = useMemo(() => {
    const now = new Date();
    now.setHours(23, 59, 59, 999);
    const getPeriodSum = (offset: number) => {
      const end = new Date(now);
      end.setDate(end.getDate() - offset * 30);
      const start = new Date(end);
      start.setDate(start.getDate() - 30);
      start.setHours(0, 0, 0, 0);
      return {
        sum: nutrientExpenses
          .filter((e) => {
            const d = new Date(e.date);
            return d >= start && d <= end;
          })
          .reduce((s, e) => s + e.amount, 0),
        start,
        end,
      };
    };
    const current = getPeriodSum(periodOffset);
    const previous = getPeriodSum(periodOffset + 1);
    const diff = current.sum - previous.sum;
    const percent =
      previous.sum > 0
        ? (diff / previous.sum) * 100
        : current.sum > 0
          ? 100
          : 0;
    return { current, previous, diff, percent };
  }, [nutrientExpenses, periodOffset]);

  return (
    <GridCard
      title="محلل استهلاك المغذيات"
      subtitle="مقارنة شهرية للأسمدة والمبيدات."
      className="border-indigo-500/20"
    >
      <div className="space-y-4 h-full flex flex-col justify-between">
        <div className="flex items-center justify-between gap-2 px-1">
          <button
            onClick={() => setPeriodOffset((prev) => prev + 1)}
            className="w-8 h-8 flex items-center justify-center rounded-lg bg-neutral-100 dark:bg-neutral-800 text-neutral-400 hover:text-primary transition-all border border-neutral-200 dark:border-neutral-700"
          >
            <ChevronRightIcon className="w-4 h-4" />
          </button>
          <div className="text-center min-w-0">
            <p className="text-[9px] font-black text-neutral-400 uppercase tracking-tighter">
              فترة 30 يوم
            </p>
            <p className="text-[10px] font-bold text-neutral-700 dark:text-neutral-200 tabular-nums">
              {stats.current.start.toLocaleDateString("ar-EG", {
                day: "numeric",
                month: "short",
                numberingSystem: "latn",
              })}{" "}
              –{" "}
              {stats.current.end.toLocaleDateString("ar-EG", {
                day: "numeric",
                month: "short",
                numberingSystem: "latn",
              })}
            </p>
          </div>
          <button
            onClick={() => setPeriodOffset((prev) => Math.max(0, prev - 1))}
            disabled={periodOffset === 0}
            className="w-8 h-8 flex items-center justify-center rounded-lg bg-neutral-100 dark:bg-neutral-800 text-neutral-400 hover:text-primary disabled:opacity-10 transition-all border border-neutral-200 dark:border-neutral-700"
          >
            <ChevronLeftIcon className="w-4 h-4" />
          </button>
        </div>
        <div className="relative p-4 rounded-[1.5rem] bg-gradient-to-br from-indigo-50/30 to-white dark:from-indigo-900/5 dark:to-neutral-900 border border-indigo-100/50 dark:border-neutral-700 shadow-sm">
          <div className="flex items-center justify-between gap-4 relative z-10">
            <div className="flex-1">
              <p className="text-[8px] font-black text-neutral-400 uppercase mb-0.5">
                إجمالي المنصرف
              </p>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-black text-indigo-600 dark:text-indigo-400 tabular-nums">
                  {formatNumber(Math.round(stats.current.sum))}
                </span>
                <span className="text-[10px] font-bold text-neutral-400">
                  ج.م
                </span>
              </div>
            </div>
            <div
              className={`flex flex-col items-end px-2.5 py-1 rounded-xl border ${stats.diff > 0 ? "bg-rose-50 border-rose-100 dark:bg-rose-900/20" : "bg-emerald-50 border-emerald-100 dark:bg-emerald-900/20"}`}
            >
              <div className="flex items-center gap-1">
                {stats.diff > 0 ? (
                  <WavyArrowUpIcon className="w-3 h-3 text-rose-500" />
                ) : (
                  <WavyArrowDownIcon className="w-3 h-3 text-emerald-500" />
                )}
                <span
                  className={`text-[11px] font-black tabular-nums ${stats.diff > 0 ? "text-rose-600" : "text-emerald-600"}`}
                >
                  {stats.percent > 0 ? "+" : ""}
                  {stats.percent.toFixed(1)}%
                </span>
              </div>
            </div>
          </div>
        </div>
        {/* Micro Bar Chart - Increased height and fixed text cutoff */}
        <div className="flex items-end gap-3 h-[4.5rem] px-1">
          <div className="flex-1 h-full flex flex-col justify-end gap-1.5">
            <div className="w-full bg-neutral-100 dark:bg-neutral-800 rounded-t-md overflow-hidden relative flex-grow">
              <div
                className="absolute bottom-0 left-0 right-0 bg-indigo-300 dark:bg-indigo-900/40"
                style={{
                  height: `${(stats.previous.sum / Math.max(stats.current.sum, stats.previous.sum, 1)) * 100}%`,
                }}
              ></div>
            </div>
            <span className="text-[10px] font-black text-neutral-500 dark:text-neutral-400 text-center uppercase whitespace-nowrap leading-normal pb-0.5">
              السابق
            </span>
          </div>
          <div className="flex-1 h-full flex flex-col justify-end gap-1.5">
            <div className="w-full bg-neutral-100 dark:bg-neutral-800 rounded-t-md overflow-hidden relative flex-grow">
              <div
                className="absolute bottom-0 left-0 right-0 bg-indigo-600"
                style={{
                  height: `${(stats.current.sum / Math.max(stats.current.sum, stats.previous.sum, 1)) * 100}%`,
                }}
              ></div>
            </div>
            <span className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 text-center uppercase whitespace-nowrap leading-normal pb-0.5">
              الحالي
            </span>
          </div>
        </div>
      </div>
    </GridCard>
  );
});

// 2. محلل كفاءة الأسواق
export const MarketEfficiencyAnalysis: React.FC<{ invoiceStatsList: InvoiceStats[] }> =
  React.memo(({ invoiceStatsList }) => {
    const [currentIdx, setCurrentIdx] = useState(0);
    const currentInv = invoiceStatsList[currentIdx];

    if (invoiceStatsList.length === 0)
      return (
        <GridCard
          title="محلل كفاءة الأسواق"
          subtitle="تحليل الفواتير المسجلة."
          className="border-emerald-500/20"
        >
          <div className="flex flex-col items-center justify-center py-8 text-center text-neutral-400">
            <TruckIcon className="w-8 h-8 opacity-20 mb-2" />
            <p className="text-[10px] italic">بانتظار تسجيل فواتير.</p>
          </div>
        </GridCard>
      );

    return (
      <GridCard
        title="محلل كفاءة الأسواق"
        subtitle="صافي سعر الكيلو vs السوق."
        className="border-emerald-500/20"
      >
        <div className="space-y-4 h-full flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2 px-1">
            <button
              onClick={() =>
                setCurrentIdx((prev) =>
                  Math.min(prev + 1, invoiceStatsList.length - 1),
                )
              }
              disabled={currentIdx === invoiceStatsList.length - 1}
              className="w-8 h-8 flex items-center justify-center rounded-lg bg-neutral-100 dark:bg-neutral-800 text-neutral-400 hover:text-primary transition-all border border-neutral-200 dark:border-neutral-700 disabled:opacity-10"
            >
              <ChevronRightIcon className="w-4 h-4" />
            </button>
            <div className="text-center min-w-0">
              <p className="text-[9px] font-black text-neutral-400 truncate">
                {currentInv.market}
              </p>
              <p className="text-[10px] font-bold text-neutral-700 dark:text-neutral-200 tabular-nums">
                {currentInv.date}
              </p>
            </div>
            <button
              onClick={() => setCurrentIdx((prev) => Math.max(prev - 1, 0))}
              disabled={currentIdx === 0}
              className="w-8 h-8 flex items-center justify-center rounded-lg bg-neutral-100 dark:bg-neutral-800 text-neutral-400 hover:text-primary disabled:opacity-10 transition-all border border-neutral-200 dark:border-neutral-700"
            >
              <ChevronLeftIcon className="w-4 h-4" />
            </button>
          </div>
          <div className="relative p-4 rounded-[1.5rem] bg-gradient-to-br from-emerald-50/30 to-white dark:from-emerald-900/5 dark:to-neutral-900 border border-emerald-100/50 dark:border-neutral-700 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between gap-4 relative z-10">
              <div className="flex-1">
                <p className="text-[8px] font-black text-neutral-400 uppercase mb-0.5">
                  صافي الكيلو الحقيقي
                </p>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400 tabular-nums">
                    {currentInv.netPerRealKilo.toFixed(2)}
                  </span>
                  <span className="text-[10px] font-bold text-neutral-400">
                    ج.م
                  </span>
                </div>
              </div>
              <div className="flex flex-col items-end px-2.5 py-1 rounded-xl border border-emerald-100 dark:border-emerald-800 bg-white dark:bg-neutral-800 shadow-sm">
                <span className="text-[11px] font-black text-primary tabular-nums">
                  %{currentInv.efficiency.toFixed(1)}
                </span>
              </div>
            </div>
          </div>
          {/* Market Price Bar Chart - Increased height and fixed text cutoff */}
          <div className="flex items-end gap-3 h-[4.5rem] px-1">
            <div className="flex-1 h-full flex flex-col justify-end gap-1.5">
              <div className="w-full bg-neutral-100 dark:bg-neutral-800 rounded-t-md overflow-hidden relative flex-grow">
                <div
                  className="absolute bottom-0 left-0 right-0 bg-emerald-600"
                  style={{
                    height: `${(currentInv.netPerRealKilo / Math.max(currentInv.declaredPrice, 1)) * 100}%`,
                  }}
                ></div>
              </div>
              <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 text-center uppercase whitespace-nowrap leading-normal pb-0.5">
                الصافي: {currentInv.netPerRealKilo.toFixed(1)}ج
              </span>
            </div>
            <div className="flex-1 h-full flex flex-col justify-end gap-1.5">
              <div className="w-full bg-neutral-100 dark:bg-neutral-800 rounded-t-md overflow-hidden relative flex-grow border-x border-t border-neutral-200 dark:border-neutral-700">
                <div
                  className="absolute bottom-0 left-0 right-0 bg-neutral-300 dark:bg-neutral-600"
                  style={{ height: "100%" }}
                ></div>
              </div>
              <span className="text-[10px] font-black text-neutral-500 dark:text-neutral-400 text-center uppercase whitespace-nowrap leading-normal pb-0.5">
                السوق: {currentInv.declaredPrice.toFixed(1)}ج
              </span>
            </div>
          </div>
        </div>
      </GridCard>
    );
  });

// 3. محلل النبض الإنتاجي
export const DailyPulseAnalysis: React.FC<{
  cycle: Cycle;
  harvestCurveData: HarvestCurveData[];
  invoices: Invoice[];
}> = ({ cycle, harvestCurveData, invoices }) => {
  const harvestDaysCount = useMemo(() => {
    const cycleInvoices = invoices.filter(
      (inv) => inv.cycle_id === cycle.id && inv.market !== "رصيد منقول",
    );
    if (cycleInvoices.length === 0) return 0;
    const sorted = [...cycleInvoices].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
    );
    const firstDate = new Date(sorted[0].date);

    // استخدام نفس منطق السياق لحساب عدد الأيام
    const endDate =
      cycle.status === "active"
        ? new Date()
        : new Date(sorted[sorted.length - 1].date);

    firstDate.setHours(0, 0, 0, 0);
    endDate.setHours(0, 0, 0, 0);

    const diffTime = endDate.getTime() - firstDate.getTime();
    return Math.max(1, Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1);
  }, [invoices, cycle.id, cycle.status]);

  return (
    <GridCard
      title="النبض الإنتاجي"
      subtitle="معدل الجمع والتدفق الحقيقي."
      className="border-amber-500/20"
    >
      <div className="space-y-4 h-full flex flex-col justify-between">
        <div className="flex items-center justify-between bg-neutral-50 dark:bg-neutral-900/50 px-3 py-2 rounded-xl border border-neutral-100 dark:border-neutral-700">
          <div className="text-right">
            <p className="text-[8px] font-black text-neutral-400 uppercase tracking-tighter">
              إجمالي الجمع
            </p>
            <p className="text-[10px] font-bold text-neutral-700 dark:text-neutral-200 tabular-nums">
              {formatNumber(Math.round(cycle.totalProductionKg || 0))} كجم
            </p>
          </div>
          <div className="text-left border-r border-neutral-200 dark:border-neutral-700 pr-3">
            <p className="text-[8px] font-black text-neutral-400 uppercase tracking-tighter">
              عمر الجمع
            </p>
            <p className="text-[10px] font-bold text-amber-600 tabular-nums">
              {harvestDaysCount} يوم
            </p>
          </div>
        </div>
        <div className="relative p-4 rounded-[1.5rem] bg-gradient-to-br from-amber-50/30 to-white dark:from-amber-900/5 dark:to-neutral-900 border border-amber-100/50 dark:border-neutral-700 shadow-sm">
          <div className="flex items-center justify-between gap-4 relative z-10">
            <div className="flex-1">
              <p className="text-[8px] font-black text-neutral-400 uppercase mb-0.5">
                المعدل اليومي
              </p>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-black text-amber-600 dark:text-amber-400 tabular-nums">
                  {(cycle.avgDailyProductionKg || 0).toFixed(1)}
                </span>
                <span className="text-[10px] font-bold text-neutral-400">
                  كج/يوم
                </span>
              </div>
            </div>
            <div className="p-2 bg-white dark:bg-neutral-800 rounded-xl border border-amber-100 dark:border-amber-800 shadow-sm text-center">
              <LeafIcon className="w-5 h-5 text-emerald-500" />
            </div>
          </div>
        </div>
        <div className="h-14 w-full">
          {harvestCurveData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={harvestCurveData}>
                <defs>
                  <linearGradient id="pColor" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#F59E0B" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area
                  type="monotone"
                  dataKey="weight"
                  stroke="#F59E0B"
                  strokeWidth={2}
                  fill="url(#pColor)"
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-[8px] text-neutral-400 italic">
              بانتظار بيانات.
            </div>
          )}
        </div>
      </div>
    </GridCard>
  );
};

// 4. مؤشر أسعار المبيعات
export const PriceRadarAnalysis: React.FC<{ invoiceStatsList: InvoiceStats[] }> =
  React.memo(({ invoiceStatsList }) => {
    const data = useMemo(() => {
      const groupedMap = new Map();
      [...invoiceStatsList]
        .filter((inv) => inv.declaredPrice > 0)
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        .forEach((inv) => {
          const dateObj = new Date(inv.date);
          const dateLabel = dateObj.toLocaleDateString("ar-EG", {
            day: "numeric",
            month: "short",
          });
          groupedMap.set(dateLabel, {
            ...inv,
            dateLabel,
            "سعر السوق": Number(inv.declaredPrice.toFixed(2)),
            timestamp: dateObj.getTime(),
            originalDate: inv.date,
          });
        });
      return Array.from(groupedMap.values()).sort(
        (a, b) => a.timestamp - b.timestamp,
      );
    }, [invoiceStatsList]);

    if (data.length === 0) return null;

    const averagePrice =
      data.reduce((acc, curr) => acc + curr["سعر السوق"], 0) / data.length;
    const maxPriceObj = data.reduce(
      (max, curr) => (curr["سعر السوق"] > max["سعر السوق"] ? curr : max),
      data[0],
    );
    const minPriceObj = data.reduce(
      (min, curr) => (curr["سعر السوق"] < min["سعر السوق"] ? curr : min),
      data[0],
    );

    const maxVal = maxPriceObj["سعر السوق"];
    const minVal = minPriceObj["سعر السوق"];
    const yMin = minVal - minVal * 0.1;

    const fillHeight = maxVal - yMin;
    const strokeHeight = maxVal - minVal;

    const avgPercentFill =
      fillHeight === 0
        ? 50
        : Math.max(
            0,
            Math.min(
              100,
              Math.round(((maxVal - averagePrice) / fillHeight) * 100),
            ),
          );
    const minPercentFill =
      fillHeight === 0
        ? 100
        : Math.max(
            0,
            Math.min(100, Math.round(((maxVal - minVal) / fillHeight) * 100)),
          );

    const avgPercentStroke =
      strokeHeight === 0
        ? 50
        : Math.max(
            0,
            Math.min(
              100,
              Math.round(((maxVal - averagePrice) / strokeHeight) * 100),
            ),
          );

    return (
      <GridCard
        title="مؤشر أسعار المبيعات"
        subtitle="تتبع متوسط سعر البيع للكيلو عبر أيام العروة."
        className="col-span-full border-teal-500/20 px-0"
      >
        <div
          className="-mx-5 h-[320px] w-[calc(100%+40px)] mt-2 relative"
          dir="ltr"
        >
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={data}
              margin={{ top: 30, right: 15, left: 15, bottom: 10 }}
            >
              <defs>
                <linearGradient
                  id="colorStrokeShared"
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop offset="0%" stopColor="#10B981" />
                  <stop offset={`${avgPercentStroke}%`} stopColor="#F59E0B" />
                  <stop offset="100%" stopColor="#EF4444" />
                </linearGradient>
                <linearGradient
                  id="colorFillShared"
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop offset="0%" stopColor="#10B981" stopOpacity={0.4} />
                  <stop
                    offset={`${avgPercentFill}%`}
                    stopColor="#F59E0B"
                    stopOpacity={0.2}
                  />
                  <stop
                    offset={`${minPercentFill}%`}
                    stopColor="#EF4444"
                    stopOpacity={0.1}
                  />
                  <stop offset="100%" stopColor="#EF4444" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="dateLabel"
                tick={{ fontSize: 10, fill: "#9ca3af", fontWeight: "bold" }}
                axisLine={false}
                tickLine={false}
                dy={10}
                minTickGap={30}
              />
              <YAxis
                hide
                domain={["dataMin - (dataMin*0.1)", "dataMax + (dataMax*0.1)"]}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: "16px",
                  border: "none",
                  boxShadow: "0 4px 25px rgba(0,0,0,0.1)",
                  backgroundColor: "var(--tw-colors-neutral-900, #171717)",
                  color: "#fff",
                }}
                itemStyle={{
                  fontSize: "13px",
                  fontWeight: "900",
                  color: "#F59E0B",
                }}
                labelStyle={{
                  fontSize: "11px",
                  color: "#a3a3a3",
                  marginBottom: "8px",
                }}
                formatter={(value: number) => [`${value} ج`, "سعر السوق"]}
                cursor={{
                  stroke: "#F59E0B",
                  strokeWidth: 1,
                  strokeDasharray: "4 4",
                  opacity: 0.5,
                }}
              />

              <ReferenceLine
                y={averagePrice}
                stroke="#F59E0B"
                strokeDasharray="5 5"
                opacity={0.6}
              />

              <Area
                type="linear"
                name="سعر السوق"
                dataKey="سعر السوق"
                stroke="url(#colorStrokeShared)"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorFillShared)"
                dot={{ r: 2, fill: "transparent", strokeWidth: 0 }}
                activeDot={{
                  r: 6,
                  stroke: "#F59E0B",
                  strokeWidth: 2,
                  fill: "#fff",
                }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="flex flex-wrap justify-center items-center gap-3 mt-8 pb-3 px-5">
          <div className="flex items-center gap-2 bg-neutral-100 dark:bg-neutral-800 px-3 py-1.5 rounded-full border border-neutral-200 dark:border-neutral-700">
            <div className="w-2.5 h-2.5 rounded-full bg-gradient-to-b from-emerald-500 via-amber-500 to-rose-500 shadow-sm opacity-80"></div>
            <span className="text-[11px] font-black text-neutral-700 dark:text-neutral-200">
              سعر البيع
            </span>
          </div>
          {maxPriceObj && (
            <div className="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-500/10 px-3 py-1.5 rounded-full border border-emerald-200 dark:border-emerald-500/20">
              <svg
                className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                />
              </svg>
              <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400">
                الأعلى سعراً: {maxPriceObj["سعر السوق"]} ج{" "}
                <span className="opacity-70 font-normal">
                  (يوم {maxPriceObj.dateLabel})
                </span>
              </span>
            </div>
          )}
          {minPriceObj && (
            <div className="flex items-center gap-2 bg-rose-50 dark:bg-rose-500/10 px-3 py-1.5 rounded-full border border-rose-200 dark:border-rose-500/20">
              <svg
                className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6"
                />
              </svg>
              <span className="text-[11px] font-bold text-rose-700 dark:text-rose-400">
                الأقل سعراً: {minPriceObj["سعر السوق"]} ج{" "}
                <span className="opacity-70 font-normal">
                  (يوم {minPriceObj.dateLabel})
                </span>
              </span>
            </div>
          )}
        </div>
      </GridCard>
    );
  });
