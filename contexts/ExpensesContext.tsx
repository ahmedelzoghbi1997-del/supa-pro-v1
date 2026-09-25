import React, { createContext, useContext } from 'react';
import type { Expense, ExpenseCategory } from '../types';

export interface ExpensesContextType {
  expenses: Expense[];
  rawExpenses: Expense[];
  lastExpenseAddedId: string | null;
  setLastExpenseAddedId: (id: string | null) => void;
  addExpense: (data: Omit<Expense, 'id' | 'created_at' | 'user_id' | '_stable_id'>) => Promise<void>;
  updateExpense: (dataOrId: Expense | (Partial<Expense> & { id: string }) | string, updates?: Partial<Expense>) => Promise<void>;
  deleteExpense: (id: string) => Promise<void>;
  expenseCategories: ExpenseCategory[];
  allExpenseCategories: ExpenseCategory[];
  addExpenseCategory: (category: Omit<ExpenseCategory, 'id' | 'created_at' | 'user_id' | '_stable_id'>) => Promise<string | undefined>;
  updateExpenseCategory: (category: ExpenseCategory) => Promise<void>;
  deleteExpenseCategory: (id: string) => Promise<boolean>;
  lastExpenseCategoryAddedId: string | null;
  setLastExpenseCategoryAddedId: (id: string | null) => void;
  isExternalLabor: (e: { description?: string }) => boolean;
}

export const ExpensesContext = createContext<ExpensesContextType | undefined>(undefined);

export const useExpensesData = (): ExpensesContextType => {
  const context = useContext(ExpensesContext);
  if (!context) {
    throw new Error('useExpensesData must be used within an ExpensesProvider or DataProvider');
  }
  return context;
};

export const ExpensesProvider: React.FC<{
  value: ExpensesContextType;
  children: React.ReactNode;
}> = ({ value, children }) => {
  return (
    <ExpensesContext.Provider value={value}>
      {children}
    </ExpensesContext.Provider>
  );
};
