import React, { createContext, useContext, useState, useMemo, useCallback, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { sanitizePayloadForTable } from '../lib/payloadWhitelist';
import { addToSyncQueue, isNetworkError } from '../lib/syncQueue';
import { generateStableId } from '../lib/dataCache';
import { markLocalAction } from '../lib/recentActions';
import type { 
    BankAccount, 
    BankTransaction, 
    PartnerDebt, 
    TreasuryFund,
    Cycle,
    Invoice,
    Expense,
    Advance,
    Farmer,
    FarmerWithdrawal,
    SupplierPayment,
    ExpenseCategory
} from '../types';
import { InvoicesContext } from './InvoicesContext';
import { ExpensesContext } from './ExpensesContext';
import { useFinancialCalculations } from '../hooks/useFinancialCalculations';

export interface TreasuryContextType {
  bankAccounts: BankAccount[];
  addBankAccount: (account: Omit<BankAccount, 'id' | 'created_at' | 'user_id' | '_stable_id'>) => Promise<string>;
  updateBankAccount: (account: BankAccount) => Promise<void>;
  deleteBankAccount: (id: string) => Promise<boolean>;
  bankTransactions: BankTransaction[];
  addBankTransaction: (transaction: Omit<BankTransaction, 'id' | 'created_at' | 'user_id' | '_stable_id'>) => Promise<void>;
  updateBankTransaction: (transaction: BankTransaction) => Promise<void>;
  deleteBankTransaction: (id: string) => Promise<void>;
  partnerDebts: PartnerDebt[];
  addPartnerDebt: (data: Omit<PartnerDebt, 'id' | 'created_at' | 'user_id' | '_stable_id'>) => Promise<void>;
  updatePartnerDebt: (data: PartnerDebt) => Promise<void>;
  deletePartnerDebt: (id: string) => Promise<void>;
  treasuryFunds: TreasuryFund[];
  setBankAccounts: React.Dispatch<React.SetStateAction<BankAccount[]>>;
  setBankTransactions: React.Dispatch<React.SetStateAction<BankTransaction[]>>;
  setPartnerDebts: React.Dispatch<React.SetStateAction<PartnerDebt[]>>;
}

export const TreasuryContext = createContext<TreasuryContextType | undefined>(undefined);

export const useTreasuryData = (): TreasuryContextType => {
  const context = useContext(TreasuryContext);
  if (!context) {
    throw new Error('useTreasuryData must be used within a TreasuryProvider or DataProvider');
  }
  return context;
};

interface TreasuryProviderProps {
  children: ReactNode;
  effectiveUserId?: string;
  cycles?: Cycle[];
  invoices?: Invoice[];
  rawExpenses?: Expense[];
  hydratedExpenses?: Expense[];
  farmers?: Farmer[];
  advances?: Advance[];
  farmerWithdrawals?: FarmerWithdrawal[];
  supplierPayments?: SupplierPayment[];
  expenseCategories?: ExpenseCategory[];
  rpcData?: any;
  isPhase2Loading?: boolean;
  isExternalLabor?: (e: { description?: string }) => boolean;
  isolateLaborAccount?: boolean;
  refreshGlobalData?: () => Promise<void>;
  broadcastChange?: (table: string, record: any, eventType?: 'INSERT' | 'UPDATE' | 'DELETE', oldRecord?: any) => void;
  recentlyAddedIdsRef?: React.MutableRefObject<Set<string>>;
  bankAccounts?: BankAccount[];
  setBankAccounts?: React.Dispatch<React.SetStateAction<BankAccount[]>>;
  bankTransactions?: BankTransaction[];
  setBankTransactions?: React.Dispatch<React.SetStateAction<BankTransaction[]>>;
  partnerDebts?: PartnerDebt[];
  setPartnerDebts?: React.Dispatch<React.SetStateAction<PartnerDebt[]>>;
  value?: TreasuryContextType;
}

export const TreasuryProvider: React.FC<TreasuryProviderProps> = ({
  children,
  effectiveUserId = '',
  cycles = [],
  invoices: propsInvoices,
  rawExpenses: propsRawExpenses,
  hydratedExpenses: propsHydratedExpenses,
  farmers = [],
  advances = [],
  farmerWithdrawals = [],
  supplierPayments = [],
  expenseCategories: propsExpenseCategories,
  rpcData = null,
  isPhase2Loading = false,
  isExternalLabor: propsIsExternalLabor,
  isolateLaborAccount = true,
  refreshGlobalData,
  broadcastChange,
  recentlyAddedIdsRef,
  bankAccounts: propsBankAccounts,
  setBankAccounts: propsSetBankAccounts,
  bankTransactions: propsBankTransactions,
  setBankTransactions: propsSetBankTransactions,
  partnerDebts: propsPartnerDebts,
  setPartnerDebts: propsSetPartnerDebts,
  value: controlledValue
}) => {
  const invoicesContext = useContext(InvoicesContext);
  const expensesContext = useContext(ExpensesContext);

  const [internalBankAccounts, setInternalBankAccounts] = useState<BankAccount[]>([]);
  const [internalBankTransactions, setInternalBankTransactions] = useState<BankTransaction[]>([]);
  const [internalPartnerDebts, setInternalPartnerDebts] = useState<PartnerDebt[]>([]);

  const bankAccounts = propsBankAccounts !== undefined ? propsBankAccounts : internalBankAccounts;
  const setBankAccounts = propsSetBankAccounts || setInternalBankAccounts;
  const bankTransactions = propsBankTransactions !== undefined ? propsBankTransactions : internalBankTransactions;
  const setBankTransactions = propsSetBankTransactions || setInternalBankTransactions;
  const partnerDebts = propsPartnerDebts !== undefined ? propsPartnerDebts : internalPartnerDebts;
  const setPartnerDebts = propsSetPartnerDebts || setInternalPartnerDebts;

  const actualInvoices = propsInvoices && propsInvoices.length > 0 ? propsInvoices : (invoicesContext?.invoices || []);
  const actualRawExpenses = propsRawExpenses && propsRawExpenses.length > 0 ? propsRawExpenses : (expensesContext?.rawExpenses || []);
  const actualHydratedExpenses = propsHydratedExpenses && propsHydratedExpenses.length > 0 ? propsHydratedExpenses : (expensesContext?.expenses || []);
  const actualExpenseCategories = propsExpenseCategories && propsExpenseCategories.length > 0 ? propsExpenseCategories : (expensesContext?.allExpenseCategories || []);
  const actualIsExternalLabor = propsIsExternalLabor || expensesContext?.isExternalLabor || (() => false);

  const { treasuryFunds } = useFinancialCalculations({
    cycles,
    hydratedInvoices: actualInvoices,
    rawExpensesHydrated: actualRawExpenses,
    hydratedExpenses: actualHydratedExpenses,
    farmers,
    advances,
    farmerWithdrawals,
    supplierPayments,
    bankTransactions,
    partnerDebts,
    expenseCategories: actualExpenseCategories,
    rpcData,
    isPhase2Loading,
    isExternalLabor: actualIsExternalLabor,
    isolateLaborAccount
  });

  const addBankAccount = useCallback(async (d: Omit<BankAccount, 'id' | 'created_at' | 'user_id' | '_stable_id'>) => {
    const stableId = generateStableId();
    const optimisticAcc = { ...d, id: stableId, _stable_id: stableId, created_at: new Date().toISOString() } as BankAccount;
    setBankAccounts(prev => [optimisticAcc, ...prev]);
    const { data: newAcc, error } = await supabase.from('bank_accounts').insert([sanitizePayloadForTable('bank_accounts', {...d, user_id: effectiveUserId})]).select().single();
    if (error) { 
        if (isNetworkError(error)) {
            addToSyncQueue({ table: 'bank_accounts', action: 'insert', payload: d }).catch(console.error);
            try {
                setBankAccounts(prev => prev.map(item => (item._stable_id === stableId || item.id === stableId) ? { ...item, pending_sync: true } as any : item));
            } catch (_e) {} 
            return stableId;
        } else {
            setBankAccounts(prev => prev.filter(a => a._stable_id !== stableId)); 
            throw error;
        } 
    }
    setBankAccounts(prev => prev.map(a => a._stable_id === stableId ? { ...newAcc, _stable_id: stableId } : a));
    if (refreshGlobalData) await refreshGlobalData();
    if (broadcastChange) broadcastChange('bank_accounts', newAcc, 'INSERT');
    return newAcc.id;
  }, [effectiveUserId, refreshGlobalData, broadcastChange]);

  const updateBankAccount = useCallback(async (d: BankAccount) => {
    const cleanData = sanitizePayloadForTable('bank_accounts', d);
    setBankAccounts(prev => prev.map(a => a.id === d.id ? { ...a, ...cleanData } : a));
    const { error } = await supabase.from('bank_accounts').update(sanitizePayloadForTable('bank_accounts', cleanData)).eq('id', d.id);
    if (error) { 
        if (isNetworkError(error)) {
            addToSyncQueue({ table: 'bank_accounts', action: 'update', payload: d }).catch(console.error);
            try {
                setBankAccounts(prev => prev.map(item => (item._stable_id === d.id || item.id === d.id) ? { ...item, pending_sync: true } as any : item));
            } catch (_e) {} 
            return;
        } else {
            console.error("Failed to update bank account:", error);
            throw error;
        } 
    }
    if (refreshGlobalData) await refreshGlobalData();
    if (broadcastChange) broadcastChange('bank_accounts', cleanData, 'UPDATE');
  }, [refreshGlobalData, broadcastChange]);

  const deleteBankAccount = useCallback(async (id: string) => {
    try {
        setBankAccounts(prev => prev.filter(a => a.id !== id));
        await supabase.from('bank_accounts').delete().eq('id', id);
        if (refreshGlobalData) await refreshGlobalData();
        if (broadcastChange) broadcastChange('bank_accounts', { id }, 'DELETE');
        return true;
    } catch (error) { 
        if (isNetworkError(error)) { 
            await addToSyncQueue({ table: 'bank_accounts', action: 'delete', payload: {}, recordId: id }); 
            return true;
        } else { 
            throw error; 
        } 
    }
  }, [refreshGlobalData, broadcastChange]);

  const addBankTransaction = useCallback(async (d: Omit<BankTransaction, 'id' | 'created_at' | 'user_id' | '_stable_id'>) => {
    const stableId = generateStableId();
    const optimisticTx = { ...d, id: stableId, _stable_id: stableId, created_at: new Date().toISOString() } as BankTransaction;
    setBankTransactions(prev => [optimisticTx, ...prev]);
    const { data: newTx, error } = await supabase.from('bank_transactions').insert([sanitizePayloadForTable('bank_transactions', {...d, user_id: effectiveUserId})]).select().single();
    if (error) { 
        if (isNetworkError(error)) {
            addToSyncQueue({ table: 'bank_transactions', action: 'insert', payload: d }).catch(console.error);
            try {
                setBankTransactions(prev => prev.map(item => (item._stable_id === stableId || item.id === stableId) ? { ...item, pending_sync: true } as any : item));
            } catch (_e) {} 
            return;
        } else {
            setBankTransactions(prev => prev.filter(t => t._stable_id !== stableId)); 
            throw error;
        } 
    }
    setBankTransactions(prev => prev.map(t => t._stable_id === stableId ? { ...newTx, _stable_id: stableId } : t));
    if (refreshGlobalData) await refreshGlobalData();
    if (broadcastChange) broadcastChange('bank_transactions', newTx, 'INSERT');
  }, [effectiveUserId, refreshGlobalData, broadcastChange]);

  const updateBankTransaction = useCallback(async (d: BankTransaction) => {
    const cleanData = sanitizePayloadForTable('bank_transactions', d);
    setBankTransactions(prev => prev.map(t => t.id === d.id ? { ...t, ...cleanData } : t));
    const { error } = await supabase.from('bank_transactions').update(sanitizePayloadForTable('bank_transactions', cleanData)).eq('id', d.id);
    if (error) { 
        if (isNetworkError(error)) {
            addToSyncQueue({ table: 'bank_transactions', action: 'update', payload: d }).catch(console.error);
            try {
                setBankTransactions(prev => prev.map(item => (item._stable_id === d.id || item.id === d.id) ? { ...item, pending_sync: true } as any : item));
            } catch (_e) {} 
            return;
        } else {
            console.error("Failed to update bank transaction:", error);
            throw error;
        } 
    }
    if (refreshGlobalData) await refreshGlobalData();
    if (broadcastChange) broadcastChange('bank_transactions', cleanData, 'UPDATE');
  }, [refreshGlobalData, broadcastChange]);

  const deleteBankTransaction = useCallback(async (id: string) => {
    try {
        setBankTransactions(prev => prev.filter(t => t.id !== id));
        await supabase.from('bank_transactions').delete().eq('id', id);
        if (refreshGlobalData) await refreshGlobalData();
        if (broadcastChange) broadcastChange('bank_transactions', { id }, 'DELETE');
    } catch (error) { 
        if (isNetworkError(error)) { 
            await addToSyncQueue({ table: 'bank_transactions', action: 'delete', payload: {}, recordId: id }); 
        } else { 
            throw error; 
        } 
    }
  }, [refreshGlobalData, broadcastChange]);

  const addPartnerDebt = useCallback(async (d: Omit<PartnerDebt, 'id' | 'created_at' | 'user_id' | '_stable_id'>) => {
    const stableId = generateStableId();
    const dbPayload = {
        description: d.description,
        total_amount: d.total_amount ?? d.totalAmount ?? 0,
        partner_allocations: d.partner_allocations ?? d.partnerAllocations ?? {},
        date: d.date,
        partner_repayments: d.partner_repayments ?? d.partnerRepayments ?? {},
        entered_treasury: d.entered_treasury ?? false,
        cycle_id: d.cycle_id || null
    };
    const optimisticDebt = {
        ...d,
        ...dbPayload,
        id: stableId,
        _stable_id: stableId,
        created_at: new Date().toISOString()
    } as unknown as PartnerDebt;

    if (recentlyAddedIdsRef?.current) {
        recentlyAddedIdsRef.current.add(stableId);
    }
    markLocalAction(stableId);
    setPartnerDebts(prev => [optimisticDebt, ...prev]);

    try {
        const { data: newDebt, error } = await supabase.from('partner_debts').insert([sanitizePayloadForTable('partner_debts', { ...dbPayload, user_id: effectiveUserId })]).select().single();
        if (error) { 
            if (isNetworkError(error)) {
                addToSyncQueue({ table: 'partner_debts', action: 'insert', payload: d }).catch(console.error);
                try {
                    setPartnerDebts(prev => prev.map(item => (item._stable_id === stableId || item.id === stableId) ? { ...item, pending_sync: true } as any : item));
                } catch (_e) {} 
                return;
            } else {
                setPartnerDebts(prev => prev.filter(item => item._stable_id !== stableId));
                throw error;
            } 
        }
        if (newDebt) {
            setPartnerDebts(prev => prev.map(item => item._stable_id === stableId ? { ...item, ...newDebt, _stable_id: newDebt.id } as unknown as PartnerDebt : item));
            if (broadcastChange) broadcastChange('partner_debts', newDebt, 'INSERT');
        }
    } catch (err) {
        if (isNetworkError(err)) {
            await addToSyncQueue({ table: 'partner_debts', action: 'insert', payload: d });
            try {
                setPartnerDebts(prev => prev.map(item => (item._stable_id === stableId || item.id === stableId) ? { ...item, pending_sync: true } as any : item));
            } catch (_e) {} 
            return;
        } else {
            console.error("Failed to add partner debt:", err);
            throw err;
        }
    }
    if (refreshGlobalData) await refreshGlobalData();
  }, [effectiveUserId, refreshGlobalData, broadcastChange, recentlyAddedIdsRef]);

  const updatePartnerDebt = useCallback(async (d: PartnerDebt) => {
    const cleanData = sanitizePayloadForTable('partner_debts', {
        description: d.description,
        total_amount: d.total_amount ?? d.totalAmount ?? 0,
        partner_allocations: d.partner_allocations ?? d.partnerAllocations ?? {},
        date: d.date,
        partner_repayments: d.partner_repayments ?? d.partnerRepayments ?? {},
        entered_treasury: d.entered_treasury ?? false,
        cycle_id: d.cycle_id || null
    });
    setPartnerDebts(prev => prev.map(item => item.id === d.id ? { ...item, ...cleanData } as unknown as PartnerDebt : item));
    const { error } = await supabase.from('partner_debts').update(sanitizePayloadForTable('partner_debts', cleanData)).eq('id', d.id);
    if (error) { 
        if (isNetworkError(error)) {
            addToSyncQueue({ table: 'partner_debts', action: 'update', payload: d }).catch(console.error);
            try {
                setPartnerDebts(prev => prev.map(item => (item._stable_id === d.id || item.id === d.id) ? { ...item, pending_sync: true } as any : item));
            } catch (_e) {} 
            return;
        } else {
            console.error("Failed to update partner debt:", error);
            throw error;
        } 
    }
    if (refreshGlobalData) await refreshGlobalData();
    if (broadcastChange) broadcastChange('partner_debts', cleanData, 'UPDATE');
  }, [refreshGlobalData, broadcastChange]);

  const deletePartnerDebt = useCallback(async (id: string) => {
    setPartnerDebts(prev => prev.filter(item => item.id !== id));
    const { error } = await supabase.from('partner_debts').delete().eq('id', id);
    if (error) { 
        if (isNetworkError(error)) {
            addToSyncQueue({ table: 'partner_debts', action: 'delete', payload: {}, recordId: id }).catch(console.error);
        } else {
            console.error("Failed to delete partner debt:", error);
            throw error;
        } 
    }
    if (refreshGlobalData) await refreshGlobalData();
    if (broadcastChange) broadcastChange('partner_debts', { id }, 'DELETE');
  }, [refreshGlobalData, broadcastChange]);

  const internalValue: TreasuryContextType = useMemo(() => ({
    bankAccounts,
    addBankAccount,
    updateBankAccount,
    deleteBankAccount,
    bankTransactions,
    addBankTransaction,
    updateBankTransaction,
    deleteBankTransaction,
    partnerDebts,
    addPartnerDebt,
    updatePartnerDebt,
    deletePartnerDebt,
    treasuryFunds,
    setBankAccounts,
    setBankTransactions,
    setPartnerDebts
  }), [
    bankAccounts,
    addBankAccount,
    updateBankAccount,
    deleteBankAccount,
    bankTransactions,
    addBankTransaction,
    updateBankTransaction,
    deleteBankTransaction,
    partnerDebts,
    addPartnerDebt,
    updatePartnerDebt,
    deletePartnerDebt,
    treasuryFunds
  ]);

  return (
    <TreasuryContext.Provider value={controlledValue || internalValue}>
      {children}
    </TreasuryContext.Provider>
  );
};
