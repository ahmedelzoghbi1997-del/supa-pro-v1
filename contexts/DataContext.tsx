import React, { createContext, useContext, useMemo, ReactNode, useState, useEffect, useCallback, useRef } from 'react';
import { useSettings } from './SettingsContext';
import { useUI } from './UIContext';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { processSyncQueue } from '../lib/syncQueue';
import { isLocalAction } from '../lib/recentActions';
import { safeArray, getCache, setCache, getCustomCache, setCustomCache } from '../lib/dataCache';
import { useFinancialCalculations } from '../hooks/useFinancialCalculations';
import type {
    DataContextType,
    NavItemId,
    Cycle,
    Invoice,
    Expense,
    Person,
    Advance,
    ExpenseCategory,
    Supplier,
    SupplierPayment,
    Farmer,
    FarmerWithdrawal,
    InvoicePriceItem,
    InvoiceDeductionItem,
    Asset,
    Profile,
    VirtualMember,
    BankAccount,
    BankTransaction,
    DailyLog,
    PartnerDebt
} from '../types';

import { InvoicesProvider, useInvoicesData, InvoicesContext } from './InvoicesContext';
import { ExpensesProvider, useExpensesData, ExpensesContext } from './ExpensesContext';
import { CyclesProvider, useCyclesData, CyclesContext } from './CyclesContext';
import { TreasuryProvider, useTreasuryData, TreasuryContext } from './TreasuryContext';
import { PersonsProvider, usePersonsData, PersonsContext } from './PersonsContext';
import { DailyLogsProvider, useDailyLogsData, DailyLogsContext } from './DailyLogsContext';

const DataContext = createContext<DataContextType | undefined>(undefined);

// Inner data aggregator component that has access to all sub-contexts
const DataAggregator: React.FC<{
    children: ReactNode;
    setActiveItem: (item: NavItemId) => void;
    profile: Profile | null;
    refreshGlobalData: () => Promise<void>;
    broadcastChange: (table: string, record: any, eventType?: 'INSERT' | 'UPDATE' | 'DELETE', oldRecord?: any) => void;
    rpcData: any;
    isPhase2Loading: boolean;
}> = ({
    children,
    setActiveItem,
    profile,
    refreshGlobalData,
    broadcastChange,
    rpcData,
    isPhase2Loading
}) => {
    const { settings, updateSettings } = useSettings();
    const invoicesData = useInvoicesData();
    const expensesData = useExpensesData();
    const cyclesData = useCyclesData();
    const treasuryData = useTreasuryData();
    const personsData = usePersonsData();
    const dailyLogsData = useDailyLogsData();

    // Top-level financial calculations engine combining all domain contexts
    const {
        cyclesWithCalculations,
        treasuryFunds,
        getCycleCashBalance,
        getCycleTotalBalance,
        totalRevenue,
        totalNetRevenue,
        totalExpenses,
        ownerNetProfit,
        totalFarmerShare
    } = useFinancialCalculations({
        cycles: cyclesData.cycles,
        hydratedInvoices: invoicesData.invoices,
        rawExpensesHydrated: expensesData.rawExpenses,
        hydratedExpenses: expensesData.expenses,
        farmers: personsData.farmers,
        advances: personsData.advances,
        farmerWithdrawals: personsData.farmerWithdrawals,
        supplierPayments: personsData.supplierPayments,
        bankTransactions: treasuryData.bankTransactions,
        partnerDebts: treasuryData.partnerDebts,
        expenseCategories: expensesData.allExpenseCategories,
        rpcData,
        isPhase2Loading,
        isExternalLabor: expensesData.isExternalLabor,
        isolateLaborAccount: settings?.isolateLaborAccount !== false
    });

    const value: DataContextType = useMemo(() => ({
        refreshGlobalData,
        broadcastChange,
        // Invoices
        invoices: invoicesData.invoices,
        addInvoice: invoicesData.addInvoice,
        updateInvoice: invoicesData.updateInvoice,
        deleteInvoice: invoicesData.deleteInvoice,
        lastInvoiceAddedId: invoicesData.lastInvoiceAddedId,
        setLastInvoiceAddedId: invoicesData.setLastInvoiceAddedId,
        // Expenses
        expenses: expensesData.expenses,
        rawExpenses: expensesData.rawExpenses,
        addExpense: expensesData.addExpense,
        updateExpense: expensesData.updateExpense,
        deleteExpense: expensesData.deleteExpense,
        lastExpenseAddedId: expensesData.lastExpenseAddedId,
        setLastExpenseAddedId: expensesData.setLastExpenseAddedId,
        isExternalLabor: expensesData.isExternalLabor,
        expenseCategories: expensesData.expenseCategories,
        allExpenseCategories: expensesData.allExpenseCategories,
        addExpenseCategory: expensesData.addExpenseCategory,
        updateExpenseCategory: expensesData.updateExpenseCategory,
        deleteExpenseCategory: expensesData.deleteExpenseCategory,
        lastExpenseCategoryAddedId: expensesData.lastExpenseCategoryAddedId,
        setLastExpenseCategoryAddedId: expensesData.setLastExpenseCategoryAddedId,
        // Cycles
        cycles: cyclesWithCalculations,
        cyclesWithCalculations,
        addCycle: cyclesData.addCycle,
        updateCycle: cyclesData.updateCycle,
        deleteCycle: cyclesData.deleteCycle,
        lastCycleAddedId: cyclesData.lastCycleAddedId,
        setLastCycleAddedId: cyclesData.setLastCycleAddedId,
        getCycleCashBalance,
        getCycleTotalBalance,
        // Persons, advances, suppliers, farmers
        persons: personsData.persons,
        activePersons: personsData.activePersons,
        virtualMembers: personsData.virtualMembers,
        addPerson: personsData.addPerson,
        updatePerson: personsData.updatePerson,
        deletePerson: personsData.deletePerson,
        advances: personsData.advances,
        addAdvance: personsData.addAdvance,
        updateAdvance: personsData.updateAdvance,
        deleteAdvance: personsData.deleteAdvance,
        lastAdvanceAddedId: personsData.lastAdvanceAddedId,
        setLastAdvanceAddedId: personsData.setLastAdvanceAddedId,
        suppliers: personsData.suppliers,
        addSupplier: personsData.addSupplier,
        updateSupplier: personsData.updateSupplier,
        deleteSupplier: personsData.deleteSupplier,
        lastSupplierAddedId: personsData.lastSupplierAddedId,
        setLastSupplierAddedId: personsData.setLastSupplierAddedId,
        supplierPayments: personsData.supplierPayments,
        addSupplierPayment: personsData.addSupplierPayment,
        updateSupplierPayment: personsData.updateSupplierPayment,
        deleteSupplierPayment: personsData.deleteSupplierPayment,
        farmers: personsData.farmers,
        addFarmer: personsData.addFarmer,
        updateFarmer: personsData.updateFarmer,
        deleteFarmer: personsData.deleteFarmer,
        lastFarmerAddedId: personsData.lastFarmerAddedId,
        setLastFarmerAddedId: personsData.setLastFarmerAddedId,
        farmerWithdrawals: personsData.farmerWithdrawals,
        addFarmerWithdrawal: personsData.addFarmerWithdrawal,
        updateFarmerWithdrawal: personsData.updateFarmerWithdrawal,
        deleteFarmerWithdrawal: personsData.deleteFarmerWithdrawal,
        // Daily logs & assets
        dailyLogs: dailyLogsData.dailyLogs,
        addDailyLog: dailyLogsData.addDailyLog,
        updateDailyLog: dailyLogsData.updateDailyLog,
        deleteDailyLog: dailyLogsData.deleteDailyLog,
        assets: dailyLogsData.assets,
        addAsset: dailyLogsData.addAsset,
        updateAsset: dailyLogsData.updateAsset,
        deleteAsset: dailyLogsData.deleteAsset,
        // Treasury & Bank
        treasuryFunds,
        bankAccounts: treasuryData.bankAccounts,
        addBankAccount: treasuryData.addBankAccount,
        updateBankAccount: treasuryData.updateBankAccount,
        deleteBankAccount: treasuryData.deleteBankAccount,
        bankTransactions: treasuryData.bankTransactions,
        addBankTransaction: treasuryData.addBankTransaction,
        updateBankTransaction: treasuryData.updateBankTransaction,
        deleteBankTransaction: treasuryData.deleteBankTransaction,
        partnerDebts: treasuryData.partnerDebts,
        addPartnerDebt: treasuryData.addPartnerDebt,
        updatePartnerDebt: treasuryData.updatePartnerDebt,
        deletePartnerDebt: treasuryData.deletePartnerDebt,
        // Global Totals
        totalRevenue,
        totalNetRevenue,
        totalExpenses,
        ownerNetProfit,
        totalFarmerShare,
        // Settings & Profile
        settings,
        updateSettings,
        profile,
        setActiveItem,
        deleteAllUserData: async () => {
            await supabase.rpc('delete_user_data');
            window.location.reload();
        }
    }), [
        refreshGlobalData,
        broadcastChange,
        invoicesData,
        expensesData,
        cyclesData,
        treasuryData,
        personsData,
        dailyLogsData,
        cyclesWithCalculations,
        treasuryFunds,
        getCycleCashBalance,
        getCycleTotalBalance,
        totalRevenue,
        totalNetRevenue,
        totalExpenses,
        ownerNetProfit,
        totalFarmerShare,
        settings,
        updateSettings,
        profile,
        setActiveItem
    ]);

    return (
        <DataContext.Provider value={value}>
            {children}
        </DataContext.Provider>
    );
};

export const DataProvider: React.FC<{ children: ReactNode; setActiveItem: (item: NavItemId) => void; profile: Profile | null }> = ({ children, setActiveItem, profile }) => {
    const { settings, updateSettings } = useSettings();
    const {
        loading,
        setLoading,
        isPhase2Loading,
        setIsPhase2Loading,
        setLoadingMessage,
        setPresences,
        setIsOffline,
        setIsSyncing
    } = useUI();

    const effectiveUserId = profile?.parent_id || (profile as any)?.owner_id || profile?.id;

    // Direct domain state buffers initialized for rapid offline-first hydrating
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [invoicePriceItems, setInvoicePriceItems] = useState<InvoicePriceItem[]>([]);
    const [invoiceDeductions, setInvoiceDeductions] = useState<InvoiceDeductionItem[]>([]);
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [expenseCategories, setExpenseCategories] = useState<ExpenseCategory[]>([]);
    const [cycles, setCycles] = useState<Cycle[]>([]);
    const [persons, setPersons] = useState<Person[]>([]);
    const [virtualMembers, setVirtualMembers] = useState<VirtualMember[]>([]);
    const [advances, setAdvances] = useState<Advance[]>([]);
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [supplierPayments, setSupplierPayments] = useState<SupplierPayment[]>([]);
    const [farmers, setFarmers] = useState<Farmer[]>([]);
    const [farmerWithdrawals, setFarmerWithdrawals] = useState<FarmerWithdrawal[]>([]);
    const [assets, setAssets] = useState<Asset[]>([]);
    const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
    const [bankTransactions, setBankTransactions] = useState<BankTransaction[]>([]);
    const [dailyLogs, setDailyLogs] = useState<DailyLog[]>([]);
    const [partnerDebts, setPartnerDebts] = useState<PartnerDebt[]>([]);
    const [rpcData, setRpcData] = useState<any>(null);

    const rpcDataTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const recentlyAddedIds = useRef<Set<string>>(new Set());

    // Presence tracking
    useEffect(() => {
        if (!profile?.id || !effectiveUserId) return;

        const channelName = `online-users-${effectiveUserId}`;
        const channel = supabase.channel(channelName, {
            config: {
                presence: {
                    key: profile.id,
                },
            },
        });

        channel
            .on('presence', { event: 'sync' }, () => {
                const state = channel.presenceState();
                const filteredState: Record<string, any> = {};
                Object.keys(state).forEach(key => {
                    filteredState[key] = state[key][0];
                });
                setPresences(filteredState);
            })
            .on('presence', { event: 'join' }, ({ key, newPresences }) => {
                setPresences(prev => ({ ...prev, [key]: newPresences[0] }));
            })
            .on('presence', { event: 'leave' }, ({ key }) => {
                setPresences(prev => {
                    const newState = { ...prev };
                    delete newState[key];
                    return newState;
                });
            })
            .subscribe(async (status) => {
                if (status === 'SUBSCRIBED') {
                    await channel.track({
                        id: profile.id,
                        full_name: profile.full_name,
                        online_at: new Date().toISOString(),
                    });
                }
            });

        return () => {
            supabase.removeChannel(channel);
        };
    }, [profile?.id, profile?.full_name, setPresences, effectiveUserId]);

    // Heartbeat to update last_seen
    useEffect(() => {
        if (!profile?.id) return;

        const updateLastSeen = async () => {
            const isVirtual = profile.id.startsWith('virtual_');
            const now = new Date().toISOString();

            if (isVirtual) {
                const vId = profile.id.replace('virtual_', '');
                await supabase.rpc('update_virtual_member_last_seen', { member_id: vId });
            } else {
                await supabase.from('profiles').update({ last_seen_at: now }).eq('id', profile.id);
            }
        };

        updateLastSeen();
        const interval = setInterval(updateLastSeen, 30 * 1000);
        
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                updateLastSeen();
            }
        };

        const handleBeforeUnload = () => {
            updateLastSeen();
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener('beforeunload', handleBeforeUnload);

        return () => {
            clearInterval(interval);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };
    }, [profile?.id]);

    // Cache sync to Dexie
    useEffect(() => {
        if (!effectiveUserId || loading) return;
        setCache(effectiveUserId, 'cycles', cycles);
    }, [cycles, effectiveUserId, loading]);

    useEffect(() => {
        if (!effectiveUserId || loading) return;
        setCache(effectiveUserId, 'invoices', invoices);
    }, [invoices, effectiveUserId, loading]);

    useEffect(() => {
        if (!effectiveUserId || loading) return;
        setCache(effectiveUserId, 'expenses', expenses);
    }, [expenses, effectiveUserId, loading]);

    useEffect(() => {
        if (!effectiveUserId || loading) return;
        setCache(effectiveUserId, 'invoice_price_items', invoicePriceItems);
    }, [invoicePriceItems, effectiveUserId, loading]);

    useEffect(() => {
        if (!effectiveUserId || loading) return;
        setCache(effectiveUserId, 'invoice_deductions', invoiceDeductions);
    }, [invoiceDeductions, effectiveUserId, loading]);

    useEffect(() => {
        if (!effectiveUserId || loading) return;
        setCache(effectiveUserId, 'expense_categories', expenseCategories);
    }, [expenseCategories, effectiveUserId, loading]);

    useEffect(() => {
        if (!effectiveUserId || isPhase2Loading) return;
        setCache(effectiveUserId, 'assets', assets);
    }, [assets, effectiveUserId, isPhase2Loading]);

    useEffect(() => {
        if (!effectiveUserId || isPhase2Loading) return;
        setCache(effectiveUserId, 'suppliers', suppliers);
    }, [suppliers, effectiveUserId, isPhase2Loading]);

    useEffect(() => {
        if (!effectiveUserId || isPhase2Loading) return;
        setCache(effectiveUserId, 'farmers', farmers);
    }, [farmers, effectiveUserId, isPhase2Loading]);

    useEffect(() => {
        if (!effectiveUserId || isPhase2Loading) return;
        setCache(effectiveUserId, 'persons', persons);
    }, [persons, effectiveUserId, isPhase2Loading]);

    useEffect(() => {
        if (!effectiveUserId || isPhase2Loading) return;
        setCache(effectiveUserId, 'supplier_payments', supplierPayments);
    }, [supplierPayments, effectiveUserId, isPhase2Loading]);

    useEffect(() => {
        if (!effectiveUserId || isPhase2Loading) return;
        setCache(effectiveUserId, 'farmer_withdrawals', farmerWithdrawals);
    }, [farmerWithdrawals, effectiveUserId, isPhase2Loading]);

    useEffect(() => {
        if (!effectiveUserId || isPhase2Loading) return;
        setCache(effectiveUserId, 'advances', advances);
    }, [advances, effectiveUserId, isPhase2Loading]);

    useEffect(() => {
        if (!effectiveUserId || isPhase2Loading) return;
        setCache(effectiveUserId, 'bank_accounts', bankAccounts);
    }, [bankAccounts, effectiveUserId, isPhase2Loading]);

    useEffect(() => {
        if (!effectiveUserId || isPhase2Loading) return;
        setCache(effectiveUserId, 'bank_transactions', bankTransactions);
    }, [bankTransactions, effectiveUserId, isPhase2Loading]);

    useEffect(() => {
        if (!effectiveUserId || isPhase2Loading) return;
        setCache(effectiveUserId, 'daily_logs', dailyLogs);
    }, [dailyLogs, effectiveUserId, isPhase2Loading]);

    useEffect(() => {
        if (!effectiveUserId || isPhase2Loading) return;
        setCache(effectiveUserId, 'virtual_members', virtualMembers);
    }, [virtualMembers, effectiveUserId, isPhase2Loading]);

    useEffect(() => {
        if (!effectiveUserId || isPhase2Loading) return;
        setCache(effectiveUserId, 'partner_debts', partnerDebts);
    }, [partnerDebts, effectiveUserId, isPhase2Loading]);

    const fetchData = useCallback(async (isInitial = false) => {
        if (!effectiveUserId || effectiveUserId.includes("undefined")) {
            setIsSyncing(false);
            return;
        }
        
        setIsSyncing(true);

        if (isInitial) {
            let hasSomeCache = false;
            try {
                const [
                    cachedCycles, cachedInvoices, cachedExpenses,
                    cachedInvPrices, cachedInvDeds, cachedCats,
                    cachedAssets, cachedSuppliers, cachedFarmers,
                    cachedPersons, cachedSupPayments, cachedFarmerWithdrawals,
                    cachedAdvances, cachedBankAccounts, cachedBankTransactions,
                    cachedDailyLogs, cachedVirtualMembers, cachedPartnerDebts,
                    cachedRpc
                ] = await Promise.all([
                    getCache<Cycle>(effectiveUserId, 'cycles'),
                    getCache<Invoice>(effectiveUserId, 'invoices'),
                    getCache<Expense>(effectiveUserId, 'expenses'),
                    getCache<InvoicePriceItem>(effectiveUserId, 'invoice_price_items'),
                    getCache<InvoiceDeductionItem>(effectiveUserId, 'invoice_deductions'),
                    getCache<ExpenseCategory>(effectiveUserId, 'expense_categories'),
                    getCache<Asset>(effectiveUserId, 'assets'),
                    getCache<Supplier>(effectiveUserId, 'suppliers'),
                    getCache<Farmer>(effectiveUserId, 'farmers'),
                    getCache<Person>(effectiveUserId, 'persons'),
                    getCache<SupplierPayment>(effectiveUserId, 'supplier_payments'),
                    getCache<FarmerWithdrawal>(effectiveUserId, 'farmer_withdrawals'),
                    getCache<Advance>(effectiveUserId, 'advances'),
                    getCache<BankAccount>(effectiveUserId, 'bank_accounts'),
                    getCache<BankTransaction>(effectiveUserId, 'bank_transactions'),
                    getCache<DailyLog>(effectiveUserId, 'daily_logs'),
                    getCache<VirtualMember>(effectiveUserId, 'virtual_members'),
                    getCache<PartnerDebt>(effectiveUserId, 'partner_debts'),
                    getCustomCache<any>(`app_cache_${effectiveUserId}_rpc_totals`)
                ]);

                if (cachedCycles && cachedCycles.length > 0) { setCycles(cachedCycles); hasSomeCache = true; }
                if (cachedInvoices && cachedInvoices.length > 0) { setInvoices(cachedInvoices); hasSomeCache = true; }
                if (cachedExpenses && cachedExpenses.length > 0) { setExpenses(cachedExpenses); hasSomeCache = true; }
                if (cachedInvPrices && cachedInvPrices.length > 0) { setInvoicePriceItems(cachedInvPrices); hasSomeCache = true; }
                if (cachedInvDeds && cachedInvDeds.length > 0) { setInvoiceDeductions(cachedInvDeds); hasSomeCache = true; }
                if (cachedCats && cachedCats.length > 0) { setExpenseCategories(cachedCats); hasSomeCache = true; }

                if (cachedAssets && cachedAssets.length > 0) setAssets(cachedAssets);
                if (cachedSuppliers && cachedSuppliers.length > 0) setSuppliers(cachedSuppliers);
                if (cachedFarmers && cachedFarmers.length > 0) setFarmers(cachedFarmers);
                if (cachedPersons && cachedPersons.length > 0) setPersons(cachedPersons);
                if (cachedSupPayments && cachedSupPayments.length > 0) setSupplierPayments(cachedSupPayments);
                if (cachedFarmerWithdrawals && cachedFarmerWithdrawals.length > 0) setFarmerWithdrawals(cachedFarmerWithdrawals);
                if (cachedAdvances && cachedAdvances.length > 0) setAdvances(cachedAdvances);
                if (cachedBankAccounts && cachedBankAccounts.length > 0) setBankAccounts(cachedBankAccounts);
                if (cachedBankTransactions && cachedBankTransactions.length > 0) setBankTransactions(cachedBankTransactions);
                if (cachedDailyLogs && cachedDailyLogs.length > 0) setDailyLogs(cachedDailyLogs);
                if (cachedVirtualMembers && cachedVirtualMembers.length > 0) setVirtualMembers(cachedVirtualMembers);
                if (cachedPartnerDebts && cachedPartnerDebts.length > 0) setPartnerDebts(cachedPartnerDebts);

                if (cachedRpc) setRpcData(cachedRpc);

                if (hasSomeCache) {
                    setLoading(false);
                    setLoadingMessage(null);
                    setIsPhase2Loading(false);
                } else {
                    setLoading(true);
                    setLoadingMessage("تحميل البيانات لأول مرة...");
                }
            } catch (cacheErr) {
                console.warn('[Dexie] Error during initial cache load:', cacheErr);
            }
        }

        const fetchTable = async (table: string) => {
            const cached = await getCache(effectiveUserId, table);

            if (!isSupabaseConfigured) {
                setIsOffline(true);
                return cached || [];
            }

            if (profile?.id?.startsWith('virtual_')) {
                // للأعضاء الافتراضيين: إرجاع البيانات المحفوظة محلياً دون إجبار التطبيق على وضع offline
                return cached || [];
            }
            try {
                const { data: { session } } = await supabase.auth.getSession().catch(() => ({ data: { session: null } }));
                if (!session?.access_token) {
                    return cached || [];
                }

                const { data, error } = await supabase.from(table).select('*').eq('user_id', effectiveUserId);
                if (error) {
                    setIsOffline(true);
                    return cached || [];
                }
                const formatted = safeArray(data).map((item: Record<string, unknown>) => ({ ...item, _stable_id: item.id }));

                // Preserve local cache if Supabase query yields empty array while local cache has records
                if (formatted.length === 0 && cached && cached.length > 0) {
                    return cached;
                }

                setCache(effectiveUserId, table, formatted);
                return formatted;
            } catch (_err) {
                setIsOffline(true);
                return cached || [];
            }
        };

        const fetchVirtualMembers = async () => {
            const cached = await getCache<VirtualMember>(effectiveUserId, 'virtual_members');

            if (!isSupabaseConfigured) {
                setIsOffline(true);
                return cached || [];
            }

            if (profile?.id?.startsWith('virtual_')) {
                return cached || [];
            }
            try {
                const { data: { session } } = await supabase.auth.getSession().catch(() => ({ data: { session: null } }));
                if (!session?.access_token) {
                    return cached || [];
                }

                const { data, error } = await supabase
                    .from('virtual_members')
                    .select('id, owner_id, username, full_name, role, last_seen, push_token, created_at')
                    .eq('owner_id', effectiveUserId);
                if (error) {
                    setIsOffline(true);
                    return cached || [];
                }
                const formatted = safeArray(data);

                if (formatted.length === 0 && cached && cached.length > 0) {
                    return cached;
                }

                setCache(effectiveUserId, 'virtual_members', formatted);
                return formatted;
            } catch (_err) {
                setIsOffline(true);
                return cached || [];
            }
        };

        try {
            const isVirtual = !!profile?.id?.startsWith('virtual_');
            if (isVirtual && isSupabaseConfigured) {
                try {
                    const virtualUsername = (profile as any)?.username || profile?.full_name;
                    const virtualCred = (profile as any)?.session_token || 
                                       (profile as any)?.password || 
                                       (typeof localStorage !== 'undefined' ? localStorage.getItem('virtual_session_token') || localStorage.getItem(`virtual_token_${profile?.id}`) : null);

                    const { data: rpcResult, error: rpcError } = await supabase.rpc('get_parent_data_for_virtual_member', {
                        p_username: virtualUsername,
                        p_password_hash: virtualCred,
                        p_token: virtualCred
                    });

                    if (!rpcError && rpcResult && rpcResult.success) {
                        setIsOffline(false);
                        const vCycles = safeArray(rpcResult.cycles).map((item: any) => ({ ...item, _stable_id: item.id }));
                        const vInvoices = safeArray(rpcResult.invoices).map((item: any) => ({ ...item, _stable_id: item.id }));
                        const vExpenses = safeArray(rpcResult.expenses).map((item: any) => ({ ...item, _stable_id: item.id }));
                        const vInvPrices = safeArray(rpcResult.invoice_price_items).map((item: any) => ({ ...item, _stable_id: item.id }));
                        const vInvDeds = safeArray(rpcResult.invoice_deductions).map((item: any) => ({ ...item, _stable_id: item.id }));
                        const vCats = safeArray(rpcResult.expense_categories).map((item: any) => ({ ...item, _stable_id: item.id }));

                        setCycles(vCycles as Cycle[]);
                        setInvoices(vInvoices as Invoice[]);
                        setExpenses(vExpenses as Expense[]);
                        setInvoicePriceItems(vInvPrices as InvoicePriceItem[]);
                        setInvoiceDeductions(vInvDeds as InvoiceDeductionItem[]);
                        setExpenseCategories(vCats as ExpenseCategory[]);

                        setCache(effectiveUserId, 'cycles', vCycles);
                        setCache(effectiveUserId, 'invoices', vInvoices);
                        setCache(effectiveUserId, 'expenses', vExpenses);
                        if (vInvPrices.length > 0) setCache(effectiveUserId, 'invoice_price_items', vInvPrices);
                        if (vInvDeds.length > 0) setCache(effectiveUserId, 'invoice_deductions', vInvDeds);
                        if (vCats.length > 0) setCache(effectiveUserId, 'expense_categories', vCats);

                        // جلب الجداول المتبقية من الكاش المحلي بدون قفل التطبيق
                        const [
                            cAssets, cSuppliers, cFarmers,
                            cPersons, cSupPayments,
                            cFarmerWithdrawals, cAdvances,
                            cBankAccounts, cBankTransactions,
                            cDailyLogs, cPartnerDebts
                        ] = await Promise.all([
                            getCache(effectiveUserId, 'assets'), getCache(effectiveUserId, 'suppliers'),
                            getCache(effectiveUserId, 'farmers'), getCache(effectiveUserId, 'persons'),
                            getCache(effectiveUserId, 'supplier_payments'),
                            getCache(effectiveUserId, 'farmer_withdrawals'), getCache(effectiveUserId, 'advances'),
                            getCache(effectiveUserId, 'bank_accounts'), getCache(effectiveUserId, 'bank_transactions'),
                            getCache(effectiveUserId, 'daily_logs'), getCache(effectiveUserId, 'partner_debts')
                        ]);

                        if (cAssets) setAssets(cAssets as Asset[]);
                        if (cSuppliers) setSuppliers(cSuppliers as Supplier[]);
                        if (cFarmers) setFarmers(cFarmers as Farmer[]);
                        if (cPersons) setPersons(cPersons as Person[]);
                        if (cSupPayments) setSupplierPayments(cSupPayments as SupplierPayment[]);
                        if (cFarmerWithdrawals) setFarmerWithdrawals(cFarmerWithdrawals as FarmerWithdrawal[]);
                        if (cAdvances) setAdvances(cAdvances as Advance[]);
                        if (cBankAccounts) setBankAccounts(cBankAccounts as BankAccount[]);
                        if (cBankTransactions) setBankTransactions(cBankTransactions as BankTransaction[]);
                        if (cDailyLogs) setDailyLogs(cDailyLogs as DailyLog[]);
                        if (cPartnerDebts) setPartnerDebts(cPartnerDebts as PartnerDebt[]);

                        setLoading(false);
                        setLoadingMessage(null);
                        setIsPhase2Loading(false);
                        return;
                    } else if (rpcError) {
                        console.warn('[VirtualMember] RPC fetch parent data warning, using cached local data:', rpcError);
                    }
                } catch (vErr) {
                    console.warn('[VirtualMember] Exception fetching parent data via RPC:', vErr);
                }
            }

            // Stage 1 Fetch (Phase 1)
            const [
                rCycles, rInvoices, rExp, 
                rInvPrices, rInvDeds, rCats
            ] = await Promise.all([
                fetchTable('cycles'),
                fetchTable('invoices'), fetchTable('expenses'), 
                fetchTable('invoice_price_items'), fetchTable('invoice_deductions'),
                fetchTable('expense_categories')
            ]);

            setCycles(rCycles as Cycle[]);
            setInvoices(rInvoices as Invoice[]);
            setExpenses(rExp as Expense[]);
            setInvoicePriceItems(rInvPrices as InvoicePriceItem[]);
            setInvoiceDeductions(rInvDeds as InvoiceDeductionItem[]);
            setExpenseCategories(rCats as ExpenseCategory[]);

            setLoading(false);
            setLoadingMessage(null);
            setIsOffline(false);

            // Stage 2 Fetch (Phase 2)
            setIsPhase2Loading(true);
            const [
                rAssets, rSuppliers, rFarmers, 
                rPersons, rSupPayments, 
                rFarmerWithdrawals, rAdvances,
                rBankAccounts, rBankTransactions,
                rDailyLogs, rVirtualMembers,
                rPartnerDebts
            ] = await Promise.all([
                fetchTable('assets'), fetchTable('suppliers'),
                fetchTable('farmers'), fetchTable('persons'),
                fetchTable('supplier_payments'),
                fetchTable('farmer_withdrawals'), fetchTable('advances'),
                fetchTable('bank_accounts'), fetchTable('bank_transactions'),
                fetchTable('daily_logs'),
                fetchVirtualMembers(),
                fetchTable('partner_debts')
            ]);

            setAssets(rAssets as Asset[]);
            setSuppliers(rSuppliers as Supplier[]);
            setFarmers(rFarmers as Farmer[]);
            setPersons(rPersons as Person[]);
            setSupplierPayments(rSupPayments as SupplierPayment[]);
            setFarmerWithdrawals(rFarmerWithdrawals as FarmerWithdrawal[]);
            setAdvances(rAdvances as Advance[]);
            setBankAccounts(rBankAccounts as BankAccount[]);
            setBankTransactions(rBankTransactions as BankTransaction[]);
            setDailyLogs(rDailyLogs as DailyLog[]);
            setVirtualMembers(rVirtualMembers as VirtualMember[]);
            setPartnerDebts(rPartnerDebts as PartnerDebt[]);

            try {
                const { data } = await supabase.rpc('get_financial_totals', { p_user_id: effectiveUserId });
                if (data) {
                    setRpcData(data);
                    setCustomCache(`app_cache_${effectiveUserId}_rpc_totals`, data);
                }
            } catch (err) {
                console.warn('RPC totals fetch failed:', err);
            }

            setIsPhase2Loading(false);
            setIsSyncing(false);

        } catch (err) {
            console.warn("Fetch Error (operating in offline/cached mode):", err);
            setLoading(false);
            setIsPhase2Loading(false);
            setIsSyncing(false);
            setIsOffline(true);
        }
    }, [effectiveUserId, setLoading, setLoadingMessage, setIsOffline, setIsPhase2Loading, setIsSyncing]);

    useEffect(() => { fetchData(true); }, [fetchData]);

    useEffect(() => {
        const handleAppResumed = () => {
            fetchData(false);
        };
        window.addEventListener('app_resumed', handleAppResumed);
        return () => window.removeEventListener('app_resumed', handleAppResumed);
    }, [fetchData]);

    const refreshGlobalData = useCallback(async () => {
        if (!effectiveUserId) return;
        try {
            const { data: rAdvances, error: advError } = await supabase.from('advances').select('*').eq('user_id', effectiveUserId);
            if (!advError && rAdvances) {
                setAdvances(rAdvances as Advance[]);
            }

            const { data } = await supabase.rpc('get_financial_totals', { p_user_id: effectiveUserId });
            if (data) setRpcData(data);
        } catch (err) {
            console.warn('Failed to refresh global totals:', err);
        }
    }, [effectiveUserId]);

    const broadcastChange = useCallback((table: string, record: any, eventType: 'INSERT' | 'UPDATE' | 'DELETE' = 'INSERT', oldRecord?: any) => {
        if (!effectiveUserId) return;
        const payload = {
            table,
            record,
            new: record,
            old: oldRecord,
            eventType,
            user_id: effectiveUserId,
            trigger_user_id: profile?.id,
            timestamp: Date.now()
        };

        const notifTopic = `realtime:realtime_notifs_${effectiveUserId}`;
        const activeNotifChannel = supabase.getChannels().find(c => c.topic === notifTopic);
        if (activeNotifChannel && activeNotifChannel.state === 'joined') {
            activeNotifChannel.send({
                type: 'broadcast',
                event: 'new_transaction',
                payload
            }).catch(err => console.warn('[Realtime Notif Broadcast send error]:', err));
        }

        const dataTopic = `realtime:realtime_data_${effectiveUserId}`;
        const activeDataChannel = supabase.getChannels().find(c => c.topic === dataTopic);
        if (activeDataChannel && activeDataChannel.state === 'joined') {
            activeDataChannel.send({
                type: 'broadcast',
                event: 'new_transaction',
                payload
            }).catch(err => console.warn('[Realtime Data Broadcast send error]:', err));
        }
    }, [effectiveUserId, profile?.id]);

    // Realtime subscriptions
    useEffect(() => {
        if (!effectiveUserId) return;

        const updateState = <T extends { id: string | number }>(
            setter: React.Dispatch<React.SetStateAction<T[]>>,
            newData: Record<string, unknown> | null,
            oldData: Record<string, unknown> | null,
            eventType: string
        ) => {
            setter(prev => {
                if (eventType === 'INSERT' && newData) {
                    if (prev.some(item => String(item.id) === String(newData.id))) return prev;
                    return [...prev, { ...newData, _stable_id: newData.id } as unknown as T];
                } else if (eventType === 'UPDATE' && newData) {
                    return prev.map(item => String(item.id) === String(newData.id) ? { ...item, ...newData, _stable_id: newData.id } as unknown as T : item);
                } else if (eventType === 'DELETE' && oldData) {
                    return prev.filter(item => String(item.id) !== String(oldData.id));
                }
                return prev;
            });
        };

        const tables = [
            'cycles', 'invoices', 'expenses', 
            'invoice_price_items', 'invoice_deductions', 'expense_categories', 
            'assets', 'suppliers', 'farmers', 'persons', 
            'supplier_payments', 'farmer_withdrawals', 'advances', 
            'bank_accounts', 'bank_transactions', 'daily_logs', 'partner_debts'
        ];

        const processEvent = (table: string, payload: { eventType?: string, new?: Record<string, unknown> | null, old?: Record<string, unknown> | null, record?: Record<string, unknown> | null }) => {
            const eventType = payload.eventType || 'INSERT';
            const newRecord = payload.new || payload.record || null;
            const oldRecord = payload.old || (eventType === 'DELETE' ? (payload.record || payload.new) : null) || null;

            if (eventType === 'UPDATE' && newRecord && newRecord.user_id && newRecord.user_id !== effectiveUserId) return;
            if (eventType === 'INSERT' && newRecord && (recentlyAddedIds.current.has(String(newRecord.id)) || isLocalAction(newRecord.id))) return;

            switch (table) {
                case 'cycles': updateState(setCycles, newRecord, oldRecord, eventType); break;
                case 'invoices': updateState(setInvoices, newRecord, oldRecord, eventType); break;
                case 'expenses': updateState(setExpenses, newRecord, oldRecord, eventType); break;
                case 'invoice_price_items': updateState(setInvoicePriceItems, newRecord, oldRecord, eventType); break;
                case 'invoice_deductions': updateState(setInvoiceDeductions, newRecord, oldRecord, eventType); break;
                case 'expense_categories': updateState(setExpenseCategories, newRecord, oldRecord, eventType); break;
                case 'assets': updateState(setAssets, newRecord, oldRecord, eventType); break;
                case 'suppliers': updateState(setSuppliers, newRecord, oldRecord, eventType); break;
                case 'farmers': updateState(setFarmers, newRecord, oldRecord, eventType); break;
                case 'persons': updateState(setPersons, newRecord, oldRecord, eventType); break;
                case 'supplier_payments': updateState(setSupplierPayments, newRecord, oldRecord, eventType); break;
                case 'farmer_withdrawals': updateState(setFarmerWithdrawals, newRecord, oldRecord, eventType); break;
                case 'advances': updateState(setAdvances, newRecord, oldRecord, eventType); break;
                case 'bank_accounts': updateState(setBankAccounts, newRecord, oldRecord, eventType); break;
                case 'bank_transactions': updateState(setBankTransactions, newRecord, oldRecord, eventType); break;
                case 'daily_logs': updateState(setDailyLogs, newRecord, oldRecord, eventType); break;
                case 'partner_debts': updateState(setPartnerDebts, newRecord, oldRecord, eventType); break;
            }

            refreshGlobalData();
            if (rpcDataTimeoutRef.current) clearTimeout(rpcDataTimeoutRef.current);
            rpcDataTimeoutRef.current = setTimeout(() => {
                refreshGlobalData();
                fetchData(false);
            }, 1000);
        };

        const dataChannelName = `realtime_data_${effectiveUserId}`;
        const dataChannel = supabase.channel(dataChannelName);

        dataChannel.on(
            'broadcast',
            { event: 'new_transaction' },
            (msg: any) => {
                const p = msg?.payload || msg;
                const table = p?.table;
                if (table && tables.includes(table)) {
                    processEvent(table, p);
                } else {
                    refreshGlobalData();
                    if (rpcDataTimeoutRef.current) clearTimeout(rpcDataTimeoutRef.current);
                    rpcDataTimeoutRef.current = setTimeout(() => {
                        refreshGlobalData();
                        fetchData(false);
                    }, 1000);
                }
            }
        );

        dataChannel.subscribe();

        const dbChannelName = `realtime_db_${effectiveUserId}`;
        const dbChannel = supabase.channel(dbChannelName);

        tables.forEach(table => {
            dbChannel.on(
                'postgres_changes',
                { event: '*', schema: 'public', table },
                (payload: any) => processEvent(table, payload)
            );
        });

        dbChannel.subscribe();

        return () => {
            supabase.removeChannel(dataChannel);
            supabase.removeChannel(dbChannel);
            if (rpcDataTimeoutRef.current) clearTimeout(rpcDataTimeoutRef.current);
        };
    }, [effectiveUserId, refreshGlobalData, fetchData]);

    // Offline sync queue processing on connection recovery
    useEffect(() => {
        const handleOnline = () => {
            processSyncQueue(() => {
                refreshGlobalData();
            });
        };
        window.addEventListener('online', handleOnline);
        if (typeof navigator !== 'undefined' && navigator.onLine) {
            handleOnline();
        }
        return () => window.removeEventListener('online', handleOnline);
    }, [refreshGlobalData]);

    const _hydratedInvoicesList = useMemo(() => invoices.map(inv => {
        const invIdStr = String(inv.id);
        const stableIdStr = inv._stable_id ? String(inv._stable_id) : null;
        return {
            ...inv,
            cycle: inv.cycle || cycles.find(c => String(c.id) === String(inv.cycle_id))?.name || '...',
            price_items: inv.price_items || invoicePriceItems.filter(item => String(item.invoice_id) === invIdStr || (stableIdStr && String(item.invoice_id) === stableIdStr)),
            deductions: inv.deductions || invoiceDeductions.filter(item => String(item.invoice_id) === invIdStr || (stableIdStr && String(item.invoice_id) === stableIdStr))
        };
    }), [invoices, cycles, invoicePriceItems, invoiceDeductions]);

    return (
        <InvoicesProvider
            effectiveUserId={effectiveUserId}
            cycles={cycles}
            partnerDebts={partnerDebts}
            refreshGlobalData={refreshGlobalData}
            broadcastChange={broadcastChange}
            recentlyAddedIdsRef={recentlyAddedIds}
            invoices={invoices}
            setInvoices={setInvoices}
            invoicePriceItems={invoicePriceItems}
            setInvoicePriceItems={setInvoicePriceItems}
            invoiceDeductions={invoiceDeductions}
            setInvoiceDeductions={setInvoiceDeductions}
        >
            <ExpensesProvider
                effectiveUserId={effectiveUserId}
                cycles={cycles}
                settings={settings}
                refreshGlobalData={refreshGlobalData}
                broadcastChange={broadcastChange}
                recentlyAddedIdsRef={recentlyAddedIds}
                expenses={expenses}
                setExpenses={setExpenses}
                expenseCategories={expenseCategories}
                setExpenseCategories={setExpenseCategories}
            >
                <CyclesProvider
                    effectiveUserId={effectiveUserId}
                    farmers={farmers}
                    advances={advances}
                    farmerWithdrawals={farmerWithdrawals}
                    supplierPayments={supplierPayments}
                    bankTransactions={bankTransactions}
                    partnerDebts={partnerDebts}
                    rpcData={rpcData}
                    isPhase2Loading={isPhase2Loading}
                    refreshGlobalData={refreshGlobalData}
                    fetchData={fetchData}
                    broadcastChange={broadcastChange}
                    cycles={cycles}
                    setCycles={setCycles}
                >
                    <TreasuryProvider
                        effectiveUserId={effectiveUserId}
                        cycles={cycles}
                        farmers={farmers}
                        advances={advances}
                        farmerWithdrawals={farmerWithdrawals}
                        supplierPayments={supplierPayments}
                        rpcData={rpcData}
                        isPhase2Loading={isPhase2Loading}
                        refreshGlobalData={refreshGlobalData}
                        broadcastChange={broadcastChange}
                        recentlyAddedIdsRef={recentlyAddedIds}
                        bankAccounts={bankAccounts}
                        setBankAccounts={setBankAccounts}
                        bankTransactions={bankTransactions}
                        setBankTransactions={setBankTransactions}
                        partnerDebts={partnerDebts}
                        setPartnerDebts={setPartnerDebts}
                    >
                        <PersonsProvider
                            effectiveUserId={effectiveUserId}
                            settings={settings}
                            updateSettings={updateSettings}
                            refreshGlobalData={refreshGlobalData}
                            broadcastChange={broadcastChange}
                            recentlyAddedIdsRef={recentlyAddedIds}
                            persons={persons}
                            setPersons={setPersons}
                            virtualMembers={virtualMembers}
                            setVirtualMembers={setVirtualMembers}
                            advances={advances}
                            setAdvances={setAdvances}
                            suppliers={suppliers}
                            setSuppliers={setSuppliers}
                            supplierPayments={supplierPayments}
                            setSupplierPayments={setSupplierPayments}
                            farmers={farmers}
                            setFarmers={setFarmers}
                            farmerWithdrawals={farmerWithdrawals}
                            setFarmerWithdrawals={setFarmerWithdrawals}
                        >
                            <DailyLogsProvider
                                effectiveUserId={effectiveUserId}
                                cycles={cycles}
                                refreshGlobalData={refreshGlobalData}
                                broadcastChange={broadcastChange}
                                recentlyAddedIdsRef={recentlyAddedIds}
                                dailyLogs={dailyLogs}
                                setDailyLogs={setDailyLogs}
                                assets={assets}
                                setAssets={setAssets}
                            >
                                <DataAggregator
                                    setActiveItem={setActiveItem}
                                    profile={profile}
                                    refreshGlobalData={refreshGlobalData}
                                    broadcastChange={broadcastChange}
                                    rpcData={rpcData}
                                    isPhase2Loading={isPhase2Loading}
                                >
                                    {children}
                                </DataAggregator>
                            </DailyLogsProvider>
                        </PersonsProvider>
                    </TreasuryProvider>
                </CyclesProvider>
            </ExpensesProvider>
        </InvoicesProvider>
    );
};

/**
 * @deprecated TODO: Deprecate DataContext and useData in favor of domain contexts
 * (useInvoices, useExpenses, useCycles, useTreasury, usePersons, useDailyLogs).
 */
export const useData = () => {
    const context = useContext(DataContext);
    if (!context) throw new Error('useData must be used within DataProvider');
    return context;
};

export {
    useInvoicesData,
    useExpensesData,
    useCyclesData,
    useTreasuryData,
    usePersonsData,
    useDailyLogsData,
    InvoicesContext,
    ExpensesContext,
    CyclesContext,
    TreasuryContext,
    PersonsContext,
    DailyLogsContext,
    DataContext
};
