import React, { createContext, useContext, useState, useMemo, useCallback, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { sanitizePayloadForTable } from '../lib/payloadWhitelist';
import { addToSyncQueue, isNetworkError } from '../lib/syncQueue';
import { generateStableId } from '../lib/dataCache';
import { getLocalDateString } from '../utils/helpers';
import type { 
    Cycle, 
    Invoice, 
    Expense, 
    Advance, 
    Farmer, 
    FarmerWithdrawal, 
    SupplierPayment, 
    BankTransaction, 
    PartnerDebt, 
    ExpenseCategory 
} from '../types';
import { InvoicesContext } from './InvoicesContext';
import { ExpensesContext } from './ExpensesContext';
import { useFinancialCalculations } from '../hooks/useFinancialCalculations';

export interface CyclesContextType {
  cycles: Cycle[];
  cyclesWithCalculations: Cycle[];
  lastCycleAddedId: string | null;
  setLastCycleAddedId: (id: string | null) => void;
  addCycle: (
    data: Omit<Cycle, 'id' | 'created_at' | 'user_id' | '_stable_id' | 'revenue' | 'expenses' | 'profit' | 'health'>,
    transferBalance?: boolean,
    customTransferAmount?: number
  ) => Promise<void>;
  updateCycle: (data: Cycle, transferBalance?: boolean) => Promise<void>;
  deleteCycle: (id: string) => Promise<boolean>;
  getCycleCashBalance: (id: string) => number;
  getCycleTotalBalance: (id: string) => number;
  setCycles: React.Dispatch<React.SetStateAction<Cycle[]>>;
}

export const CyclesContext = createContext<CyclesContextType | undefined>(undefined);

export const useCyclesData = (): CyclesContextType => {
  const context = useContext(CyclesContext);
  if (!context) {
    throw new Error('useCyclesData must be used within a CyclesProvider or DataProvider');
  }
  return context;
};

interface CyclesProviderProps {
  children: ReactNode;
  effectiveUserId?: string;
  invoices?: Invoice[];
  rawExpenses?: Expense[];
  hydratedExpenses?: Expense[];
  farmers?: Farmer[];
  advances?: Advance[];
  farmerWithdrawals?: FarmerWithdrawal[];
  supplierPayments?: SupplierPayment[];
  bankTransactions?: BankTransaction[];
  partnerDebts?: PartnerDebt[];
  expenseCategories?: ExpenseCategory[];
  rpcData?: any;
  isPhase2Loading?: boolean;
  isExternalLabor?: (e: { description?: string }) => boolean;
  isolateLaborAccount?: boolean;
  addInvoice?: (data: any) => Promise<void>;
  refreshGlobalData?: () => Promise<void>;
  fetchData?: (isInitial?: boolean) => Promise<void>;
  broadcastChange?: (table: string, record: any, eventType?: 'INSERT' | 'UPDATE' | 'DELETE', oldRecord?: any) => void;
  cycles?: Cycle[];
  setCycles?: React.Dispatch<React.SetStateAction<Cycle[]>>;
  value?: CyclesContextType;
}

export const CyclesProvider: React.FC<CyclesProviderProps> = ({
  children,
  effectiveUserId = '',
  invoices: propsInvoices,
  rawExpenses: propsRawExpenses,
  hydratedExpenses: propsHydratedExpenses,
  farmers = [],
  advances = [],
  farmerWithdrawals = [],
  supplierPayments = [],
  bankTransactions = [],
  partnerDebts = [],
  expenseCategories: propsExpenseCategories,
  rpcData = null,
  isPhase2Loading = false,
  isExternalLabor: propsIsExternalLabor,
  isolateLaborAccount = true,
  addInvoice,
  refreshGlobalData,
  fetchData,
  broadcastChange,
  cycles: propsCycles,
  setCycles: propsSetCycles,
  value: controlledValue
}) => {
  const invoicesContext = useContext(InvoicesContext);
  const expensesContext = useContext(ExpensesContext);

  const [internalCycles, setInternalCycles] = useState<Cycle[]>([]);
  const [lastCycleAddedId, setLastCycleAddedId] = useState<string | null>(null);

  const cycles = propsCycles !== undefined ? propsCycles : internalCycles;
  const setCycles = propsSetCycles || setInternalCycles;

  const actualInvoices = propsInvoices && propsInvoices.length > 0 ? propsInvoices : (invoicesContext?.invoices || []);
  const actualRawExpenses = propsRawExpenses && propsRawExpenses.length > 0 ? propsRawExpenses : (expensesContext?.rawExpenses || []);
  const actualHydratedExpenses = propsHydratedExpenses && propsHydratedExpenses.length > 0 ? propsHydratedExpenses : (expensesContext?.expenses || []);
  const actualExpenseCategories = propsExpenseCategories && propsExpenseCategories.length > 0 ? propsExpenseCategories : (expensesContext?.allExpenseCategories || []);
  const actualIsExternalLabor = propsIsExternalLabor || expensesContext?.isExternalLabor || (() => false);

  const {
    cyclesWithCalculations,
    getCycleCashBalance,
    getCycleTotalBalance
  } = useFinancialCalculations({
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

  const addCycle = useCallback(async (
    data: Omit<Cycle, 'id' | 'created_at' | 'user_id' | '_stable_id' | 'revenue' | 'expenses' | 'profit' | 'health'>,
    transferBalance = false,
    customTransferAmount?: number
  ) => {
    const stableId = generateStableId();
    const optimisticCreatedAt = new Date().toISOString();
    const optimisticCycle = { ...data, id: stableId, _stable_id: stableId, created_at: optimisticCreatedAt, revenue: 0, expenses: 0, profit: 0, health: 100 } as unknown as Cycle;
    setCycles(prev => [optimisticCycle, ...prev]);
    setLastCycleAddedId(stableId);

    const { data: newCycle, error } = await supabase.from('cycles').insert([sanitizePayloadForTable('cycles', { ...data, user_id: effectiveUserId })]).select().single();
    if (error) { 
        if (isNetworkError(error)) {
            addToSyncQueue({ table: 'cycles', action: 'insert', payload: data }).catch(console.error);
            try {
                setCycles(prev => prev.map(item => (item._stable_id === stableId || item.id === stableId) ? { ...item, pending_sync: true } as any : item));
            } catch (_e) {} 
            return;
        } else {
            setCycles(prev => prev.filter(c => c._stable_id !== stableId)); 
            throw error;
        } 
    }
    setCycles(prev => prev.map(c => c._stable_id === stableId ? { ...newCycle, _stable_id: stableId, created_at: optimisticCreatedAt } : c));
    
    if (transferBalance && addInvoice) {
        const closedCycles = cycles.filter(c => c.status === 'closed');
        if (closedCycles.length > 0) {
            const sortedClosed = [...closedCycles].sort((a, b) => new Date(b.created_at || b.start_date || 0).getTime() - new Date(a.created_at || a.start_date || 0).getTime());
            const lastClosed = sortedClosed[0];
            const balanceToTransfer = customTransferAmount !== undefined ? customTransferAmount : getCycleTotalBalance(lastClosed.id);
            
            if (balanceToTransfer !== 0) {
                const alreadyTransferred = actualInvoices.some(inv => 
                    inv.market === 'رصيد منقول' && inv.description?.includes(lastClosed.id)
                );
                if (!alreadyTransferred) {
                    try {
                        const invoiceData = {
                            cycle_id: newCycle.id,
                            date: getLocalDateString(),
                            market: 'رصيد منقول',
                            description: `رصيد منقول من العروة المغلقة السابقة: ${lastClosed.name} (${customTransferAmount !== undefined ? 'تعديل يدوي من المستخدم' : 'تلقائي'}) (معرف: ${lastClosed.id})`,
                            packaging_type: 'cage',
                            packaging_count: 0,
                            price_items: [
                                {
                                    quantity: 1,
                                    price_per_kg: balanceToTransfer
                                }
                            ],
                            deductions: []
                        };
                        await addInvoice(invoiceData);
                    } catch (invErr) {
                        if (isNetworkError(invErr)) {
                            await addToSyncQueue({ table: 'cycles', action: 'insert', payload: data });
                            try {
                                setCycles(prev => prev.map(item => (item._stable_id === stableId || item.id === stableId) ? { ...item, pending_sync: true } as any : item));
                            } catch (_e) {} 
                            return;
                        } else {
                            console.error("Failed to auto-transfer cash balance", invErr);
                        }
                    }
                }
            }
        }
    }
    
    if (refreshGlobalData) await refreshGlobalData();
    if (broadcastChange) broadcastChange('cycles', newCycle, 'INSERT');
  }, [cycles, effectiveUserId, getCycleTotalBalance, actualInvoices, addInvoice, refreshGlobalData, broadcastChange]);

  const updateCycle = useCallback(async (d: Cycle, transferBalance = false) => {
    const cycleObj = d;
    const cleanDataForDb: Record<string, any> = {
        id: cycleObj.id,
        user_id: cycleObj.user_id,
        name: cycleObj.name,
        seed_type: cycleObj.seed_type,
        plant_count: cycleObj.plant_count,
        unit_of_measure: cycleObj.unit_of_measure,
        area_in_feddans: cycleObj.area_in_feddans,
        asset_id: cycleObj.asset_id,
        start_date: cycleObj.start_date,
        production_start_date: cycleObj.production_start_date,
        status: cycleObj.status,
        responsible_farmer_id: cycleObj.responsible_farmer_id,
        farmer_share_percentage: cycleObj.farmer_share_percentage,
        target_yield: cycleObj.target_yield,
        notes: cycleObj.notes,
        created_at: cycleObj.created_at
    };
    Object.keys(cleanDataForDb).forEach(key => {
        if (cleanDataForDb[key] === undefined) {
            delete cleanDataForDb[key];
        }
    });

    setCycles(prev => prev.map(c => (c.id === cycleObj.id || (cycleObj._stable_id && c._stable_id === cycleObj._stable_id)) ? { ...c, ...cleanDataForDb } : c));
    
    const { error: dbError } = await supabase.from('cycles').update(sanitizePayloadForTable('cycles', cleanDataForDb)).eq('id', cycleObj.id);
    if (dbError) {
        console.error("Failed to update cycle in database:", dbError);
        throw dbError;
    }
    
    if (cleanDataForDb.status === 'closed' && transferBalance && addInvoice) {
        const activeCycle = cycles.find(c => c.status === 'active' && c.id !== cycleObj.id);
        if (activeCycle) {
            const alreadyTransferred = actualInvoices.some(inv => 
                inv.market === 'رصيد منقول' && inv.description?.includes(cycleObj.id)
            );
            if (!alreadyTransferred) {
                const balanceToTransfer = getCycleTotalBalance(cycleObj.id);
                if (balanceToTransfer > 0) {
                    try {
                        const invoiceData = {
                            cycle_id: activeCycle.id,
                            date: getLocalDateString(),
                            market: 'رصيد منقول',
                            description: `رصيد منقول تلقائياً من العروة السابقة المغلقة: ${cycleObj.name} (معرف: ${cycleObj.id})`,
                            packaging_type: 'cage',
                            packaging_count: 0,
                            price_items: [
                                {
                                    quantity: 1,
                                    price_per_kg: balanceToTransfer
                                }
                            ],
                            deductions: []
                        };
                        await addInvoice(invoiceData);
                    } catch (invErr) {
                        if (isNetworkError(invErr)) {
                            await addToSyncQueue({ table: 'cycles', action: 'update', payload: d });
                            try {
                                setCycles(prev => prev.map(item => (item._stable_id === d.id || item.id === d.id) ? { ...item, pending_sync: true } as any : item));
                            } catch (_e) {} 
                            return;
                        } else {
                            console.error("Failed to auto-transfer cash balance on close", invErr);
                        }
                    }
                }
            }
        }
    }
    
    if (refreshGlobalData) await refreshGlobalData();
    if (broadcastChange) broadcastChange('cycles', cleanDataForDb, 'UPDATE');
  }, [cycles, getCycleTotalBalance, actualInvoices, addInvoice, refreshGlobalData, broadcastChange]);

  const deleteCycle = useCallback(async (id: string): Promise<boolean> => {
    setCycles(prev => prev.filter(c => c.id !== id));

    try {
        await Promise.all([
            supabase.from('invoices').delete().eq('cycle_id', id),
            supabase.from('expenses').delete().eq('cycle_id', id),
            supabase.from('advances').delete().eq('cycle_id', id),
            supabase.from('daily_logs').delete().eq('cycle_id', id),
            supabase.from('supplier_payments').delete().eq('cycle_id', id),
            supabase.from('farmer_withdrawals').delete().eq('cycle_id', id),
            supabase.from('partner_debts').delete().eq('cycle_id', id),
        ]);

        await supabase.from('cycles').delete().eq('id', id);
        if (refreshGlobalData) await refreshGlobalData();
        if (broadcastChange) broadcastChange('cycles', { id }, 'DELETE');
        return true;
    } catch (error) {
        if (isNetworkError(error)) {
            await addToSyncQueue({ table: 'cycles', action: 'delete', payload: {}, recordId: id });
            return true;
        } else {
            console.error("Failed to safely delete cycle and its relations:", error);
            if (fetchData) fetchData();
            throw error;
        }
    }
  }, [refreshGlobalData, broadcastChange, fetchData]);

  const internalValue: CyclesContextType = useMemo(() => ({
    cycles: cyclesWithCalculations,
    cyclesWithCalculations,
    lastCycleAddedId,
    setLastCycleAddedId,
    addCycle,
    updateCycle,
    deleteCycle,
    getCycleCashBalance,
    getCycleTotalBalance,
    setCycles
  }), [
    cyclesWithCalculations,
    lastCycleAddedId,
    addCycle,
    updateCycle,
    deleteCycle,
    getCycleCashBalance,
    getCycleTotalBalance
  ]);

  return (
    <CyclesContext.Provider value={controlledValue || internalValue}>
      {children}
    </CyclesContext.Provider>
  );
};
