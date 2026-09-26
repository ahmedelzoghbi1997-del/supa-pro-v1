import React from "react";
import type { Expense, ExpenseCategory, Supplier } from "../../../types";

export type ReportTabId = "overview" | "invoices" | "treasury" | "expenses";

export interface AppNotification {
  id: string;
  dbId: string;
  type: "invoice" | "expense" | "withdrawal" | "payment";
  amount: number;
  date: Date;
  label: string;
  isPositive: boolean;
}

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

export interface MetricBoxProps {
  label: string;
  value: string | number;
  subValue?: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  tooltip?: string;
}

export interface GridCardProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  className?: string;
}

export interface CategorySummaryCardProps {
  category: ExpenseCategory;
  total: number;
  count: number;
  totalExpenses: number;
  onClick: () => void;
}

export interface ReadOnlyExpenseCardProps {
  expense: Expense;
  expenseCategories: ExpenseCategory[];
  suppliers: Supplier[];
  index: number;
  hideCycle?: boolean;
  hideSupplier?: boolean;
  hideCategory?: boolean;
}
