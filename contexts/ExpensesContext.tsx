import React, { createContext, useContext, useState, useMemo, useCallback, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { sanitizePayloadForTable } from '../lib/payloadWhitelist';
import { addToSyncQueue, isNetworkError } from '../lib/syncQueue';
import { generateStableId } from '../lib/dataCache';
import { markLocalAction } from '../lib/recentActions';
import type { Expense, ExpenseCategory, Cycle, AppSettings } from '../types';

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
  setExpenses: React.Dispatch<React.SetStateAction<Expense[]>>;
  setExpenseCategories: React.Dispatch<React.SetStateAction<ExpenseCategory[]>>;
}

export const ExpensesContext = createContext<ExpensesContextType | undefined>(undefined);

export const useExpensesData = (): ExpensesContextType => {
  const context = useContext(ExpensesContext);
  if (!context) {
    throw new Error('useExpensesData must be used within an ExpensesProvider or DataProvider');
  }
  return context;
};

interface ExpensesProviderProps {
  children: ReactNode;
  effectiveUserId?: string;
  cycles?: Cycle[];
  settings?: AppSettings;
  refreshGlobalData?: () => Promise<void>;
  broadcastChange?: (table: string, record: any, eventType?: 'INSERT' | 'UPDATE' | 'DELETE', oldRecord?: any) => void;
  recentlyAddedIdsRef?: React.MutableRefObject<Set<string>>;
  expenses?: Expense[];
  setExpenses?: React.Dispatch<React.SetStateAction<Expense[]>>;
  expenseCategories?: ExpenseCategory[];
  setExpenseCategories?: React.Dispatch<React.SetStateAction<ExpenseCategory[]>>;
  value?: ExpensesContextType;
}

export const ExpensesProvider: React.FC<ExpensesProviderProps> = ({
  children,
  effectiveUserId = '',
  cycles = [],
  settings,
  refreshGlobalData,
  broadcastChange,
  recentlyAddedIdsRef,
  expenses: propsExpenses,
  setExpenses: propsSetExpenses,
  expenseCategories: propsExpenseCategories,
  setExpenseCategories: propsSetExpenseCategories,
  value: controlledValue
}) => {
  const [internalExpenses, setInternalExpenses] = useState<Expense[]>([]);
  const [internalExpenseCategories, setInternalExpenseCategories] = useState<ExpenseCategory[]>([]);
  const [lastExpenseAddedId, setLastExpenseAddedId] = useState<string | null>(null);
  const [lastExpenseCategoryAddedId, setLastExpenseCategoryAddedId] = useState<string | null>(null);

  const expenses = propsExpenses !== undefined ? propsExpenses : internalExpenses;
  const setExpenses = propsSetExpenses || setInternalExpenses;
  const expenseCategories = propsExpenseCategories !== undefined ? propsExpenseCategories : internalExpenseCategories;
  const setExpenseCategories = propsSetExpenseCategories || setInternalExpenseCategories;

  const isExternalLabor = useCallback((e: { description?: string }) => {
    if (!e.description) return false;
    
    const currentGhs = settings?.greenhouses || [
        { id: 'mine', name: 'الصوبة الخاصة بي', type: 'mine', is_default: true },
        { id: 'father', name: 'صوبة أبي وأخي', type: 'external' }
    ];

    if (e.description.includes('🏠') || e.description.includes('صوبة أبي وأخي') || e.description.includes('[صوبة أبي وأخي]')) {
        return true;
    }

    const externalGhs = currentGhs.filter(g => g.type === 'external');
    return externalGhs.some(g => e.description.includes(g.name));
  }, [settings?.greenhouses]);

  const rawExpensesHydrated = useMemo(() => {
    const laborCategoryIds = expenseCategories.filter(cat => 
        cat.is_labor_category ||
        cat.name.includes('عمالة') || cat.name.includes('عماله') || cat.name.includes('يومية') || cat.name.includes('عامل') || cat.name.includes('خاص بالمزارع') || cat.name.includes('مزارع') || cat.name.includes('نثريات') || cat.name.includes('فطار') || cat.name.includes('ضيافة') || cat.name.includes('إكرامية')
    ).map(cat => cat.id);

    const primaryLaborCategory = expenseCategories.find(cat => cat.is_labor_category) || expenseCategories.find(cat => cat.name === 'عمالة' || cat.name === 'عماله') || expenseCategories.find(cat => cat.name.includes('عمالة') || cat.name.includes('عماله'));
    const primaryLaborCategoryId = primaryLaborCategory?.id;

    return expenses.map(exp => {
        let categoryId = exp.category_id;
        let category = expenseCategories.find(cat => String(cat.id) === String(categoryId));
        let categoryName = exp.categoryName || category?.name || '...';
        const originalCategoryId = exp.category_id;

        const desc = exp.description || '';
        const amountVal = exp.amount || 0;
        const isLaborCat = Boolean(category?.is_labor_category) || laborCategoryIds.includes(exp.category_id);

        const isLaborOperational = (exp as any).type === 'labor_operational' || 
            categoryName === 'فطار (خاص بالمزارع)' || 
            categoryName.includes('فطار') || 
            categoryName.includes('ضيافة') ||
            categoryName.includes('فطور');

        if (isLaborOperational && primaryLaborCategoryId && isLaborCat) {
            categoryId = primaryLaborCategoryId;
            category = primaryLaborCategory;
            categoryName = primaryLaborCategory?.name || 'عمالة';
        }

        const isAdvanceTaken = isLaborCat && amountVal > 0 && (
            desc.includes('سلفة') || 
            desc.includes('سلفية') || 
            desc.includes('تخصيم') || 
            (desc.includes('صرف') && !desc.includes('منصرف')) || 
            desc.includes('دفعة نقدية') || 
            desc.includes('مسحوبات')
        );

        const isAdvanceRepayment = isLaborCat && (
            amountVal < 0 || 
            (desc.includes('سداد') && desc.includes('من العامل'))
        );

        const isSettlement = isLaborCat && amountVal > 0 && (
            (desc.includes('سداد دفعة') || desc.includes('تسديد') || desc.includes('تصفية') || desc.includes('سداد كامل')) && 
            !desc.includes('من العامل')
        );

        const isWageWork = isLaborCat && !isSettlement && !isAdvanceTaken && !isAdvanceRepayment;
        const isJointDebtPayment = (exp as any).is_joint_debt_payment === true ||
            Boolean(category?.is_joint_debt_category) ||
            category?.category_type === 'joint_debt' ||
            categoryName === 'سداد ديون والتزامات مشتركة' ||
            exp.category_id === 'joint_debt_payment';

        return {
            ...exp,
            category_id: categoryId,
            _original_category_id: originalCategoryId,
            cycle: exp.cycle || cycles.find(c => String(c.id) === String(exp.cycle_id))?.name || '...',
            categoryName,
            isDiscount: Boolean(category?.is_discount_category) || categoryName === 'خصم مكتسب (موردين)' || exp.amount < 0,
            isAdvanceTaken,
            isAdvanceRepayment,
            isSettlement,
            isWageWork,
            is_joint_debt_payment: isJointDebtPayment
        };
    });
  }, [expenses, cycles, expenseCategories]);

  const hydratedExpenses = useMemo(() => {
    const isolateLabor = settings?.isolateLaborAccount !== false;
    const laborCategoryIds = expenseCategories.filter(cat => 
        cat.is_labor_category ||
        cat.name.includes('عمالة') || cat.name.includes('عماله') || cat.name.includes('يومية') || cat.name.includes('عامل') || cat.name.includes('خاص بالمزارع') || cat.name.includes('مزارع') || cat.name.includes('نثريات') || cat.name.includes('فطار') || cat.name.includes('ضيافة') || cat.name.includes('إكرامية')
    ).map(cat => cat.id);
    
    return rawExpensesHydrated.filter(exp => {
        if (exp.isDiscount) return false;
        if (exp.isAdvanceTaken || exp.isAdvanceRepayment || exp.isSettlement) return false;
        if (isExternalLabor(exp)) return false;
        if (isolateLabor) {
            return !laborCategoryIds.includes(exp.category_id);
        }
        return true;
    });
  }, [rawExpensesHydrated, expenseCategories, settings?.isolateLaborAccount, isExternalLabor]);

  const filteredExpenseCategories = useMemo(() => {
    return expenseCategories.filter(cat => {
        if (cat.is_discount_category || cat.name === 'خصم مكتسب (موردين)') return false;
        return true;
    });
  }, [expenseCategories]);

  const addExpense = useCallback(async (data: Omit<Expense, 'id' | 'created_at' | 'user_id' | '_stable_id'>) => {
    const stableId = generateStableId();
    const cycleName = cycles.find(c => c.id === data.cycle_id)?.name || '...';
    const catName = expenseCategories.find(c => c.id === data.category_id)?.name || '...';
    const optimisticCreatedAt = new Date().toISOString();
    const optimisticExp = { ...data, id: stableId, _stable_id: stableId, cycle: cycleName, categoryName: catName, created_at: optimisticCreatedAt } as unknown as Expense;
    setExpenses(prev => [optimisticExp, ...prev]);
    setLastExpenseAddedId(stableId);

    const cleanData = sanitizePayloadForTable('expenses', data);
    let response = await supabase.from('expenses').insert([sanitizePayloadForTable('expenses', { ...cleanData, user_id: effectiveUserId })]).select().single();
    if (response.error && (response.error.message?.includes('shift_type') || response.error.code === 'PGRST204')) {
        const { shift_type: _shift_type, ...fallbackData } = cleanData;
        response = await supabase.from('expenses').insert([sanitizePayloadForTable('expenses', { ...fallbackData, user_id: effectiveUserId })]).select().single();
    }
    const { data: newExp, error } = response;
    if (error) { 
        if (isNetworkError(error)) {
            addToSyncQueue({ table: 'expenses', action: 'insert', payload: data }).catch(console.error);
            try {
                setExpenses(prev => prev.map(item => (item._stable_id === stableId || item.id === stableId) ? { ...item, pending_sync: true } as any : item));
            } catch (_e) {} 
            return;
        } else {
            setExpenses(prev => prev.filter(e => e._stable_id !== stableId)); 
            throw error;
        } 
    }
    
    if (recentlyAddedIdsRef?.current) {
        recentlyAddedIdsRef.current.add(newExp.id);
        setTimeout(() => recentlyAddedIdsRef.current?.delete(newExp.id), 10000);
    }
    markLocalAction(newExp.id);
    markLocalAction(stableId);

    setExpenses(prev => prev.map(e => e._stable_id === stableId ? { ...newExp, _stable_id: stableId, cycle: cycleName, categoryName: catName, created_at: optimisticCreatedAt } : e));
    if (refreshGlobalData) await refreshGlobalData();
    if (broadcastChange && newExp) broadcastChange('expenses', newExp, 'INSERT');
  }, [cycles, expenseCategories, effectiveUserId, refreshGlobalData, broadcastChange, recentlyAddedIdsRef]);

  const updateExpense = useCallback(async (d: any, updates?: any) => {
    let targetId: string;
    let payload: Record<string, any>;

    if (typeof d === 'string') {
        targetId = d;
        payload = { ...(updates || {}) };
    } else if (d && typeof d === 'object') {
        targetId = d.id;
        payload = { ...d, ...(updates || {}) };
    } else {
        return;
    }

    const cleanData = sanitizePayloadForTable('expenses', payload);
    setExpenses(prev => prev.map(exp => exp.id === targetId ? { ...exp, ...cleanData } : exp));
    let response = await supabase.from('expenses').update(sanitizePayloadForTable('expenses', cleanData)).eq('id', targetId);
    if (response.error && (response.error.message?.includes('shift_type') || response.error.code === 'PGRST204')) {
        const { shift_type: _shift_type, ...fallbackData } = cleanData;
        response = await supabase.from('expenses').update(sanitizePayloadForTable('expenses', fallbackData)).eq('id', targetId);
    }
    if (response.error) { 
        if (isNetworkError(response.error)) {
            addToSyncQueue({ table: 'expenses', action: 'update', payload }).catch(console.error);
            try {
                setExpenses(prev => prev.map(item => (item._stable_id === (d.id || d) || item.id === (d.id || d)) ? { ...item, pending_sync: true } as any : item));
            } catch (_e) {} 
            return;
        } else {
            console.error("Failed to update expense in Supabase:", response.error);
            throw response.error;
        } 
    }
    if (refreshGlobalData) await refreshGlobalData();
    if (broadcastChange) broadcastChange('expenses', cleanData, 'UPDATE');
  }, [refreshGlobalData, broadcastChange]);

  const deleteExpense = useCallback(async (id: string) => {
    try {
        setExpenses(prev => prev.filter(e => e.id !== id));
        await supabase.from('expenses').delete().eq('id', id);
        if (refreshGlobalData) await refreshGlobalData();
        if (broadcastChange) broadcastChange('expenses', { id }, 'DELETE');
    } catch (error) { 
        if (isNetworkError(error)) { 
            await addToSyncQueue({ table: 'expenses', action: 'delete', payload: {}, recordId: id }); 
        } else { 
            throw error; 
        } 
    }
  }, [refreshGlobalData, broadcastChange]);

  const addExpenseCategory = useCallback(async (c: Omit<ExpenseCategory, 'id' | 'created_at' | 'user_id' | '_stable_id'>) => {
    const stableId = generateStableId();
    const optimisticCat = { ...c, id: stableId, _stable_id: stableId, created_at: new Date().toISOString() } as unknown as ExpenseCategory;
    setExpenseCategories(prev => [optimisticCat, ...prev]);
    
    const { data: newCat, error = null } = await supabase.from('expense_categories').insert([sanitizePayloadForTable('expense_categories', {...c, user_id: effectiveUserId})]).select().single();
    if (error) { 
        if (isNetworkError(error)) {
            addToSyncQueue({ table: 'expense_categories', action: 'insert', payload: c }).catch(console.error);
            try {
                setExpenseCategories(prev => prev.map(item => (item._stable_id === stableId || item.id === stableId) ? { ...item, pending_sync: true } as any : item));
            } catch (_e) {} 
            return stableId;
        } else {
            setExpenseCategories(prev => prev.filter(cat => cat._stable_id !== stableId));
            throw error;
        } 
    }
    if (newCat) { 
        setExpenseCategories(prev => prev.map(cat => cat._stable_id === stableId ? {...newCat, _stable_id: newCat.id} : cat)); 
        setLastExpenseCategoryAddedId(newCat.id); 
    }
    if (refreshGlobalData) await refreshGlobalData();
    if (broadcastChange && newCat) broadcastChange('expense_categories', newCat, 'INSERT');
    return newCat?.id;
  }, [effectiveUserId, refreshGlobalData, broadcastChange]);

  const updateExpenseCategory = useCallback(async (d: ExpenseCategory) => {
    const cleanData = sanitizePayloadForTable('expense_categories', d);
    setExpenseCategories(prev => prev.map(cat => cat.id === d.id ? { ...cat, ...cleanData } : cat));
    const { error } = await supabase.from('expense_categories').update(sanitizePayloadForTable('expense_categories', cleanData)).eq('id', d.id);
    if (error) { 
        if (isNetworkError(error)) {
            addToSyncQueue({ table: 'expense_categories', action: 'update', payload: d }).catch(console.error);
            try {
                setExpenseCategories(prev => prev.map(item => (item._stable_id === d.id || item.id === d.id) ? { ...item, pending_sync: true } as any : item));
            } catch (_e) {} 
            return;
        } else {
            console.error("Failed to update expense category:", error);
            throw error;
        } 
    }
    if (refreshGlobalData) await refreshGlobalData();
    if (broadcastChange) broadcastChange('expense_categories', cleanData, 'UPDATE');
  }, [refreshGlobalData, broadcastChange]);

  const deleteExpenseCategory = useCallback(async (id: string) => {
    try {
        setExpenseCategories(prev => prev.filter(cat => cat.id !== id));
        await supabase.from('expense_categories').delete().eq('id', id);
        if (refreshGlobalData) await refreshGlobalData();
        if (broadcastChange) broadcastChange('expense_categories', { id }, 'DELETE');
        return true;
    } catch (error) { 
        if (isNetworkError(error)) { 
            await addToSyncQueue({ table: 'expense_categories', action: 'delete', payload: {}, recordId: id }); 
            return true;
        } else { 
            throw error; 
        } 
    }
  }, [refreshGlobalData, broadcastChange]);

  const internalValue: ExpensesContextType = useMemo(() => ({
    expenses: hydratedExpenses,
    rawExpenses: rawExpensesHydrated,
    lastExpenseAddedId,
    setLastExpenseAddedId,
    addExpense,
    updateExpense,
    deleteExpense,
    expenseCategories: filteredExpenseCategories,
    allExpenseCategories: expenseCategories,
    addExpenseCategory,
    updateExpenseCategory,
    deleteExpenseCategory,
    lastExpenseCategoryAddedId,
    setLastExpenseCategoryAddedId,
    isExternalLabor,
    setExpenses,
    setExpenseCategories
  }), [
    hydratedExpenses,
    rawExpensesHydrated,
    lastExpenseAddedId,
    addExpense,
    updateExpense,
    deleteExpense,
    filteredExpenseCategories,
    expenseCategories,
    addExpenseCategory,
    updateExpenseCategory,
    deleteExpenseCategory,
    lastExpenseCategoryAddedId,
    isExternalLabor
  ]);

  return (
    <ExpensesContext.Provider value={controlledValue || internalValue}>
      {children}
    </ExpensesContext.Provider>
  );
};
