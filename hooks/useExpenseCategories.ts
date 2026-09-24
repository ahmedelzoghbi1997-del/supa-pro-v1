import { useData } from '../contexts/DataContext';
import type { ExpenseCategory } from '../types';

export interface UseExpenseCategoriesReturn {
  expenseCategories: ExpenseCategory[];
  allExpenseCategories: ExpenseCategory[];
  filteredExpenseCategories: ExpenseCategory[];
  lastExpenseCategoryAddedId: string | null;
  setLastExpenseCategoryAddedId: (id: string | null) => void;
  addExpenseCategory: (category: Omit<ExpenseCategory, 'id' | 'created_at' | 'user_id' | '_stable_id'>) => Promise<string | undefined>;
  updateExpenseCategory: (category: ExpenseCategory) => Promise<void>;
  deleteExpenseCategory: (id: string) => Promise<boolean>;
}

export const useExpenseCategories = (): UseExpenseCategoriesReturn => {
  const {
    expenseCategories,
    allExpenseCategories,
    filteredExpenseCategories,
    lastExpenseCategoryAddedId,
    setLastExpenseCategoryAddedId,
    addExpenseCategory,
    updateExpenseCategory,
    deleteExpenseCategory,
  } = useData();

  return {
    expenseCategories,
    allExpenseCategories,
    filteredExpenseCategories,
    lastExpenseCategoryAddedId,
    setLastExpenseCategoryAddedId,
    addExpenseCategory,
    updateExpenseCategory,
    deleteExpenseCategory,
  };
};

export default useExpenseCategories;
