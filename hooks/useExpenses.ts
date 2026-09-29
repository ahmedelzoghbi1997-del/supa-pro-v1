import { useExpensesData } from '../contexts/ExpensesContext';
import type { Expense, ExpenseCategory } from '../types';

export interface UseExpensesReturn {
  expenses: Expense[];
  rawExpenses: Expense[];
  expenseCategories: ExpenseCategory[];
  allExpenseCategories: ExpenseCategory[];
  filteredExpenseCategories: ExpenseCategory[];
  lastExpenseAddedId: string | null;
  setLastExpenseAddedId: (id: string | null) => void;
  lastExpenseCategoryAddedId: string | null;
  setLastExpenseCategoryAddedId: (id: string | null) => void;
  addExpense: (data: Omit<Expense, 'id' | 'created_at' | 'user_id' | '_stable_id'>) => Promise<void>;
  updateExpense: (dataOrId: Expense | (Partial<Expense> & { id: string }) | string, updates?: Partial<Expense>) => Promise<void>;
  deleteExpense: (id: string) => Promise<void>;
  addExpenseCategory: (category: Omit<ExpenseCategory, 'id' | 'created_at' | 'user_id' | '_stable_id'>) => Promise<string | undefined>;
  updateExpenseCategory: (category: ExpenseCategory) => Promise<void>;
  deleteExpenseCategory: (id: string) => Promise<boolean>;
  isExternalLabor: (e: { description?: string }) => boolean;
}

export const useExpenses = (): UseExpensesReturn => {
  const {
    expenses,
    rawExpenses,
    expenseCategories,
    allExpenseCategories,
    lastExpenseAddedId,
    setLastExpenseAddedId,
    lastExpenseCategoryAddedId,
    setLastExpenseCategoryAddedId,
    addExpense,
    updateExpense,
    deleteExpense,
    addExpenseCategory,
    updateExpenseCategory,
    deleteExpenseCategory,
    isExternalLabor,
  } = useExpensesData();

  return {
    expenses,
    rawExpenses,
    expenseCategories,
    allExpenseCategories,
    filteredExpenseCategories: expenseCategories,
    lastExpenseAddedId,
    setLastExpenseAddedId,
    lastExpenseCategoryAddedId,
    setLastExpenseCategoryAddedId,
    addExpense,
    updateExpense,
    deleteExpense,
    addExpenseCategory,
    updateExpenseCategory,
    deleteExpenseCategory,
    isExternalLabor,
  };
};

export default useExpenses;
