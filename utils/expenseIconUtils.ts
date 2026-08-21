import {
  Users,
  Sprout,
  Tractor,
  Fuel,
  ReceiptText,
  Leaf,
  BugOff,
} from "lucide-react";

import type { ExpenseCategory } from "../types";

export const getExpenseCategoryMeta = (categoryOrName: string | Partial<ExpenseCategory> | { name: string; is_labor_category?: boolean; is_discount_category?: boolean }) => {
  const name = typeof categoryOrName === "string" ? categoryOrName : categoryOrName?.name || "";
  const isLaborCat = typeof categoryOrName === "object" ? Boolean(categoryOrName?.is_labor_category) : false;
  const isDiscountCat = typeof categoryOrName === "object" ? Boolean(categoryOrName?.is_discount_category) : false;
  const n = name.toLowerCase();

  if (isDiscountCat)
    return {
      icon: ReceiptText,
      bg: "bg-emerald-50 dark:bg-emerald-900/20",
      border: "border-emerald-100 dark:border-emerald-800/30",
      color: "text-emerald-600 dark:text-emerald-400",
      badgeBg:
        "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
      progressBarBg: "bg-emerald-500",
    };

  if (isLaborCat || n.includes("عمالة") || n.includes("يومية") || n.includes("عامل"))
    return {
      icon: Users,
      bg: "bg-blue-50 dark:bg-blue-900/20",
      border: "border-blue-100 dark:border-blue-800/30",
      color: "text-blue-600 dark:text-blue-400",
      badgeBg:
        "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800",
      progressBarBg: "bg-blue-500",
    };

  if (
    n.includes("بذور") ||
    n.includes("بذرة") ||
    n.includes("تقاوي") ||
    n.includes("شتلات")
  )
    return {
      icon: Sprout,
      bg: "bg-emerald-50 dark:bg-emerald-900/20",
      border: "border-emerald-100 dark:border-emerald-800/30",
      color: "text-emerald-600 dark:text-emerald-400",
      badgeBg:
        "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
      progressBarBg: "bg-emerald-500",
    };

  if (n.includes("سماد عضوي") || n.includes("سباخ") || n.includes("كومبوست"))
    return {
      icon: Leaf,
      bg: "bg-amber-50 dark:bg-amber-900/20",
      border: "border-amber-100 dark:border-amber-800/30",
      color: "text-amber-600 dark:text-amber-400",
      badgeBg:
        "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800",
      progressBarBg: "bg-amber-500",
    };

  if (
    n.includes("أسمدة") ||
    n.includes("مبيدات") ||
    n.includes("كيماوي") ||
    n.includes("رش") ||
    n.includes("سماد")
  )
    return {
      icon: BugOff,
      bg: "bg-violet-50 dark:bg-violet-900/20",
      border: "border-violet-100 dark:border-violet-800/30",
      color: "text-violet-600 dark:text-violet-400",
      badgeBg:
        "bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 border-violet-200 dark:border-violet-800",
      progressBarBg: "bg-violet-500",
    };

  if (
    n.includes("خدمة") ||
    n.includes("أرضية") ||
    n.includes("حرث") ||
    n.includes("جرار") ||
    n.includes("عزق") ||
    n.includes("ماكينة") ||
    n.includes("مولد")
  )
    return {
      icon: Tractor,
      bg: "bg-amber-50 dark:bg-amber-900/20",
      border: "border-amber-100 dark:border-amber-800/30",
      color: "text-amber-600 dark:text-amber-400",
      badgeBg:
        "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800",
      progressBarBg: "bg-amber-500",
    };

  if (
    n.includes("جاز") ||
    n.includes("وقود") ||
    n.includes("بنزين") ||
    n.includes("كهرباء") ||
    n.includes("سولار") ||
    n.includes("صيانة") ||
    n.includes("كراتين") ||
    n.includes("ورق") ||
    n.includes("تعبئة") ||
    n.includes("إصلاح")
  )
    return {
      icon: Fuel,
      bg: "bg-rose-50 dark:bg-rose-900/20",
      border: "border-rose-100 dark:border-rose-800/30",
      color: "text-rose-600 dark:text-rose-400",
      badgeBg:
        "bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800",
      progressBarBg: "bg-rose-500",
    };

  return {
    icon: ReceiptText,
    bg: "bg-slate-50 dark:bg-slate-800",
    border: "border-slate-200 dark:border-slate-700",
    color: "text-slate-600 dark:text-slate-300",
    badgeBg:
      "bg-slate-100 dark:bg-slate-800/50 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700",
    progressBarBg: "bg-slate-500 dark:bg-slate-400",
  };
};
