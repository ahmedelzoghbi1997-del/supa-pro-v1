import { useExpensesData } from '../contexts/ExpensesContext';
import type { ExpenseCategory } from '../types';

export interface UseExpenseCategoriesReturn {
  expenseCategories: ExpenseCategory[];
  allExpenseCategories: ExpenseCategory[];
  filteredExpenseCategories: ExpenseCategory[];
  addExpenseCategory: (category: Omit<ExpenseCategory, 'id' | 'created_at' | 'user_id' | '_stable_id'>) => Promise<string | undefined>;
  updateExpenseCategory: (category: ExpenseCategory) => Promise<void>;
  deleteExpenseCategory: (id: string) => Promise<boolean>;
  lastExpenseCategoryAddedId: string | null;
  setLastExpenseCategoryAddedId: (id: string | null) => void;
}

export const useExpenseCategories = (): UseExpenseCategoriesReturn => {
  const {
    expenseCategories,
    allExpenseCategories,
    lastExpenseCategoryAddedId,
    setLastExpenseCategoryAddedId,
    addExpenseCategory,
    updateExpenseCategory,
    deleteExpenseCategory,
  } = useExpensesData();

  return {
    expenseCategories,
    allExpenseCategories,
    filteredExpenseCategories: expenseCategories,
    addExpenseCategory,
    updateExpenseCategory,
    deleteExpenseCategory,
    lastExpenseCategoryAddedId,
    setLastExpenseCategoryAddedId,
  };
};

export default useExpenseCategories;
