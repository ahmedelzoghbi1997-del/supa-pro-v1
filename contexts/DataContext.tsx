
import React, { createContext, useContext, useMemo, ReactNode, useState, useEffect, useCallback, useRef } from 'react';
import { useSettings } from './SettingsContext';
import { useUI } from './UIContext';
import { getLocalDateString } from '../utils/helpers';
import { sanitizePayloadForTable } from '../lib/payloadWhitelist';
import { addToSyncQueue, isNetworkError, processSyncQueue } from '../lib/syncQueue';
import { markLocalAction, isLocalAction } from '../lib/recentActions';
import { supabase } from '../lib/supabase';
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

import { safeArray, generateStableId, getCache, setCache, getCustomCache, setCustomCache } from '../lib/dataCache';

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: ReactNode; setActiveItem: (item: NavItemId) => void; profile: Profile | null }> = ({ children, setActiveItem, profile }) => {
    const { settings, updateSettings } = useSettings();

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
    
    // Presence tracking
    useEffect(() => {
        if (!profile?.id) return;

        const channel = supabase.channel('online-users', {
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
    }, [profile?.id, profile?.full_name]);

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

        // Initial update
        updateLastSeen();

        // Periodic update every 30 seconds for better accuracy
        const interval = setInterval(updateLastSeen, 30 * 1000);
        
        // Update on visibility change (minimize interval gap)
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                updateLastSeen();
            }
        };

        // Final update before leaving
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

    const effectiveUserId = profile?.parent_id || (profile as any)?.owner_id || profile?.id;

    
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [invoicePriceItems, setInvoicePriceItems] = useState<InvoicePriceItem[]>([]);
    const [invoiceDeductions, setInvoiceDeductions] = useState<InvoiceDeductionItem[]>([]);
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [dailyLogs, setDailyLogs] = useState<DailyLog[]>([]);
    const [cycles, setCycles] = useState<Cycle[]>([]);
    const [persons, setPersons] = useState<Person[]>([]);
    const [virtualMembers, setVirtualMembers] = useState<VirtualMember[]>([]);
    const [advances, setAdvances] = useState<Advance[]>([]);
    const [expenseCategories, setExpenseCategories] = useState<ExpenseCategory[]>([]);
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [supplierPayments, setSupplierPayments] = useState<SupplierPayment[]>([]);
    const [farmers, setFarmers] = useState<Farmer[]>([]);
    const [farmerWithdrawals, setFarmerWithdrawals] = useState<FarmerWithdrawal[]>([]);
    const [assets, setAssets] = useState<Asset[]>([]);
    const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
    const [bankTransactions, setBankTransactions] = useState<BankTransaction[]>([]);
    const [partnerDebts, setPartnerDebts] = useState<PartnerDebt[]>([]);

    const [lastInvoiceAddedId, setLastInvoiceAddedId] = useState<string | null>(null);
    const [lastExpenseAddedId, setLastExpenseAddedId] = useState<string | null>(null);
    const [lastCycleAddedId, setLastCycleAddedId] = useState<string | null>(null);
    const [lastAdvanceAddedId, setLastAdvanceAddedId] = useState<string | null>(null);
    const [lastSupplierAddedId, setLastSupplierAddedId] = useState<string | null>(null);
    const [lastFarmerAddedId, setLastFarmerAddedId] = useState<string | null>(null);
    const [lastExpenseCategoryAddedId, setLastExpenseCategoryAddedId] = useState<string | null>(null);

    const [rpcData, setRpcData] = useState<any>(null);

    const rpcDataTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const recentlyAddedIds = useRef<Set<string>>(new Set());

    // Keep local cache updated whenever React state changes to secure offline availability
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

        // 1. If isInitial, load from Dexie cache asynchronously first to achieve zero-blocking immediate render
        if (isInitial) {
            let hasSomeCache = false;
            
            try {
                // Fetch Phase 1 and Phase 2 cached records concurrently from Dexie IndexedDB
                const [
                    cachedCycles,
                    cachedInvoices,
                    cachedExpenses,
                    cachedInvPrices,
                    cachedInvDeds,
                    cachedCats,
                    cachedAssets,
                    cachedSuppliers,
                    cachedFarmers,
                    cachedPersons,
                    cachedSupPayments,
                    cachedFarmerWithdrawals,
                    cachedAdvances,
                    cachedBankAccounts,
                    cachedBankTransactions,
                    cachedDailyLogs,
                    cachedVirtualMembers,
                    cachedPartnerDebts,
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

                // Immediately disable the loading screen if we have ANY cache
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
            console.log(`Fetching from table: ${table}, for user: ${effectiveUserId}`);
            const { data, error } = await supabase.from(table).select('*').eq('user_id', effectiveUserId);
            if (error) {
                console.warn(`[Network/Supabase] Could not fetch ${table}. Falling back to cache.`, error);
                setIsOffline(true);
                const cached = await getCache(effectiveUserId, table);
                return cached || [];
            }
            console.log(`Fetched ${data?.length || 0} rows from ${table}`);
            const formatted = safeArray(data).map((item: Record<string, unknown>) => ({ ...item, _stable_id: item.id }));
            
            // Save to Dexie IndexedDB cache asynchronously
            setCache(effectiveUserId, table, formatted);
            return formatted;
        };

        const fetchVirtualMembers = async () => {
            console.log(`Fetching virtual members for owner: ${effectiveUserId}`);
            const { data, error } = await supabase
                .from('virtual_members')
                .select('id, owner_id, username, full_name, role, last_seen, push_token, created_at')
                .eq('owner_id', effectiveUserId);
            if (error) {
                console.warn(`[Network/Supabase] Could not fetch virtual_members. Falling back to cache.`, error);
                setIsOffline(true);
                const cached = await getCache<VirtualMember>(effectiveUserId, 'virtual_members');
                return cached || [];
            }
            const formatted = safeArray(data);
            setCache(effectiveUserId, 'virtual_members', formatted);
            return formatted;
        };

        try {
            // Stage 1 Fetch (Phase 1 tables)
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

            // Turn off loading once Phase 1 is done fetching
            setLoading(false);
            setLoadingMessage(null);
            setIsOffline(false); // Succeeded, so we are online!

            // Stage 2 Fetch (Phase 2 tables)
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

            // RPC Totals Fetch
            try {
                const { data } = await supabase.rpc('get_financial_totals', { p_user_id: effectiveUserId });
                if (data) {
                    setRpcData(data);
                    setCustomCache(`app_cache_${effectiveUserId}_rpc_totals`, data);
                }
            } catch (err) {
                console.warn('RPC totals fetch failed, fallback to calculations:', err);
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
    }, [effectiveUserId]);

    useEffect(() => { fetchData(true); }, [fetchData]);

    useEffect(() => {
        const handleAppResumed = () => {
            console.log('App resumed, running silent sync...');
            fetchData(false);
        };
        window.addEventListener('app_resumed', handleAppResumed);
        return () => window.removeEventListener('app_resumed', handleAppResumed);
    }, [fetchData]);

    const refreshGlobalData = useCallback(async () => {
        if (!effectiveUserId) return;
        try {
            // Re-fetch advances to ensure auto-repayments or background changes are in sync
            const { data: rAdvances, error: advError } = await supabase.from('advances').select('*').eq('user_id', effectiveUserId);
            if (!advError && rAdvances) {
                setAdvances(rAdvances as Advance[]);
            }

            const { data } = await supabase.rpc('get_financial_totals', { p_user_id: effectiveUserId });
            if (data) setRpcData(data);
        } catch (err) {
            console.warn('Failed to explicitly refresh global totals (offline/cached):', err);
        }
    }, [effectiveUserId, setAdvances]);

    // دالة إرسال البث اللحظي والتنبيهات الموحدة لجميع الأجهزة والشركاء
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

        // 1. إرسال البث اللحظي لقناة الإشعارات بأمان عبر القناة المشتركة
        const notifTopic = `realtime:realtime_notifs_${effectiveUserId}`;
        const activeNotifChannel = supabase.getChannels().find(c => c.topic === notifTopic);
        if (activeNotifChannel && activeNotifChannel.state === 'joined') {
            activeNotifChannel.send({
                type: 'broadcast',
                event: 'new_transaction',
                payload
            }).catch(err => console.warn('[Realtime Notif Broadcast send error]:', err));
        }

        // 2. إرسال البث اللحظي لقناة مزامنة البيانات
        const dataTopic = `realtime:realtime_data_${effectiveUserId}`;
        const activeDataChannel = supabase.getChannels().find(c => c.topic === dataTopic);
        if (activeDataChannel && activeDataChannel.state === 'joined') {
            activeDataChannel.send({
                type: 'broadcast',
                event: 'new_transaction',
                payload
            }).catch(err => console.warn('[Realtime Data Broadcast send error]:', err));
        }

        // 3. إشعار Web Push في الخلفية للأجهزة المغلقة أو غير النشطة
        if (typeof window !== 'undefined') {
            try {
                fetch('/api/send-push', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        table,
                        record,
                        eventType,
                        owner_id: effectiveUserId,
                        effectiveUserId
                    })
                }).catch(() => {});
            } catch (_e) {}
        }
    }, [effectiveUserId]);

    // real-time subscriptions for notifications and instantaneous sync
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

            // Client-side filtering for UPDATE to save bandwidth mapping if possible, 
            // but if we receive it we must check if it's ours.
            if (eventType === 'UPDATE' && newRecord && newRecord.user_id && newRecord.user_id !== effectiveUserId) return;
            
            // If we added this locally recently, don't duplicate
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

            // Immediately refresh global totals
            refreshGlobalData();

            // Debounce silent sync to guarantee full parity of relations and RPC data
            if (rpcDataTimeoutRef.current) clearTimeout(rpcDataTimeoutRef.current);
            rpcDataTimeoutRef.current = setTimeout(() => {
                refreshGlobalData();
                fetchData(false);
            }, 1000);
        };

        // 1. الاستماع عبر Broadcast على قناة البيانات المخصصة (بدون تضارب في bindings)
        const dataChannelName = `realtime_data_${effectiveUserId}`;
        const dataChannel = supabase.channel(dataChannelName);

        dataChannel.on(
            'broadcast',
            { event: 'new_transaction' },
            (msg: any) => {
                console.log('[DataContext Realtime Broadcast Received]:', msg);
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

        // 2. الاستماع عبر postgres_changes على قناة معزولة تماماً لمنع أي تضارب
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

    const hydratedInvoices = useMemo(() => invoices.map(inv => {
        const isRetained = inv.is_retained_debt || 
            Boolean(inv.description?.includes('[مرصودة]')) || 
            Boolean(inv.description?.includes('[RETAINED_DEBT]'));
        return {
            ...inv,
            cycle: inv.cycle || cycles.find(c => c.id === inv.cycle_id)?.name || '...',
            is_retained_debt: isRetained,
            source_type: 'invoice' as const,
            source_ref_id: inv.source_ref_id || inv.id,
            price_items: invoicePriceItems.filter(item => item.invoice_id === inv.id || (inv._stable_id && item.invoice_id === inv._stable_id)),
            deductions: invoiceDeductions.filter(item => item.invoice_id === inv.id || (inv._stable_id && item.invoice_id === inv._stable_id))
        };
    }), [invoices, cycles, invoicePriceItems, invoiceDeductions]);

    const rawExpensesHydrated = useMemo(() => {
        const laborCategoryIds = expenseCategories.filter(cat => 
            cat.is_labor_category ||
            cat.name.includes('عمالة') || cat.name.includes('عماله') || cat.name.includes('يومية') || cat.name.includes('عامل') || cat.name.includes('خاص بالمزارع') || cat.name.includes('مزارع') || cat.name.includes('نثريات') || cat.name.includes('فطار') || cat.name.includes('ضيافة') || cat.name.includes('إكرامية')
        ).map(cat => cat.id);

        const primaryLaborCategory = expenseCategories.find(cat => cat.is_labor_category) || expenseCategories.find(cat => cat.name === 'عمالة' || cat.name === 'عماله') || expenseCategories.find(cat => cat.name.includes('عمالة') || cat.name.includes('عماله'));
        const primaryLaborCategoryId = primaryLaborCategory?.id;

        return expenses.map(exp => {
            let categoryId = exp.category_id;
            let category = expenseCategories.find(cat => cat.id === categoryId);
            let categoryName = exp.categoryName || category?.name || '...';
            const originalCategoryId = exp.category_id;

            const desc = exp.description || '';
            const amountVal = exp.amount || 0;
            const isLaborCat = Boolean(category?.is_labor_category) || laborCategoryIds.includes(exp.category_id);

            // Apply category mapping / aliasing on-the-fly for labor operational items (like breakfast or hospitality)
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

            // Precision detection matching LaborManager / WorkerAccounts / EditLaborForm
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
                cycle: exp.cycle || cycles.find(c => c.id === exp.cycle_id)?.name || '...',
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
            // Never show discounts in the general expenses list
            if (exp.isDiscount) return false;

            // PREVENT worker balance-sheet transactions (advance_taken, advance_repayment, or settlements) from being considered under general expenses
            if (exp.isAdvanceTaken || exp.isAdvanceRepayment || exp.isSettlement) return false;

            // Exclude external greenhouse expenses from general expenses list entirely
            if (isExternalLabor(exp)) {
                return false;
            }

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

    const hydratedPersons = useMemo(() => {
        const mappings = settings?.person_partner_mappings || {};
        return persons.map(p => ({
            ...p,
            virtual_id: mappings[p.id] || null
        }));
    }, [persons, settings?.person_partner_mappings]);

    const activePersons = useMemo(() => {
        const archivedIds = settings?.archived_person_ids || [];
        return hydratedPersons.filter(p => !archivedIds.includes(p.id));
    }, [hydratedPersons, settings?.archived_person_ids]);

    const hydratedAdvances = useMemo(() => {
        return advances.map(a => {
            const person = hydratedPersons.find(p => p.id === a.person_id);
            const hasExternalDebtTag = a.reason && a.reason.includes('[EXTERNAL_DEBT]');
            const fs = hasExternalDebtTag ? 'external_debt' : (a.funding_source || 'cash');

            let refId = a.source_ref_id;
            let isRetained = a.is_retained_debt || false;
            let sourceType = a.source_type;

            if (!refId && a.reason) {
                const match = a.reason.match(/\[INVOICE_REPAYMENT:([^\]]+)\]/);
                if (match) {
                    refId = match[1];
                    isRetained = true;
                    sourceType = 'invoice';
                }
            } else if (refId) {
                isRetained = true;
                sourceType = sourceType || 'invoice';
            }

            const isEnteredTreasury = (a as any).is_entered_treasury === true ||
                (a.reason ? a.reason.includes('[ENTERED_TREASURY]') : false);
            const isPaidFromTreasury = (a as any).is_paid_from_treasury === true ||
                (a.reason ? a.reason.includes('[PAID_FROM_TREASURY]') : false);

            return {
                ...a,
                source_ref_id: refId,
                source_type: sourceType || 'partner_advance',
                is_retained_debt: isRetained,
                funding_source: fs,
                is_entered_treasury: isEnteredTreasury,
                is_paid_from_treasury: isPaidFromTreasury,
                personName: person?.name || a.personName || 'غير معروف'
            };
        });
    }, [advances, hydratedPersons]);

    // Offload heavy cycles profit, treasury funds, and balances calculation into optimized hook
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
        cycles,
        hydratedInvoices,
        rawExpensesHydrated,
        hydratedExpenses,
        farmers,
        advances: hydratedAdvances,
        farmerWithdrawals,
        supplierPayments,
        bankTransactions,
        partnerDebts,
        expenseCategories,
        rpcData,
        isPhase2Loading,
        isExternalLabor,
        isolateLaborAccount: settings?.isolateLaborAccount !== false
    });

    // Offline-First: Process sync queue when online
    useEffect(() => {
        const handleOnline = () => {
            console.log("Network online, processing sync queue...");
            processSyncQueue(() => {
                refreshGlobalData();
            });
        };
        window.addEventListener('online', handleOnline);
        
        // Also try to process queue on mount if online
        if (typeof navigator !== 'undefined' && navigator.onLine) {
            handleOnline();
        }
        
        return () => window.removeEventListener('online', handleOnline);
    }, [refreshGlobalData]);

    const value: DataContextType = useMemo(() => {
        const val: DataContextType = {
        refreshGlobalData,
        invoices: hydratedInvoices,
        addInvoice: async (data) => {
            const isRetained = data.description?.includes('[مرصودة]') || data.description?.includes('[RETAINED_DEBT]');
            const invoiceData = { ...data, isRetained };

            const { price_items, deductions, ...inv } = data;
            const stableId = (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : generateStableId();
            const cycleName = cycles.find(c => c.id === inv.cycle_id)?.name || '...';
            const optimisticCreatedAt = new Date().toISOString();
            
            const tempPrices = (price_items || []).map((pi) => ({ ...pi, id: Math.random(), invoice_id: stableId, user_id: effectiveUserId })) as InvoicePriceItem[];
            const tempDeds = (deductions || []).map((d) => ({ ...d, id: Math.random(), invoice_id: stableId, user_id: effectiveUserId })) as InvoiceDeductionItem[];
            
            const optimisticInv = { 
                ...inv, 
                id: stableId, 
                _stable_id: stableId,
                cycle: cycleName,
                created_at: optimisticCreatedAt,
                price_items: tempPrices,
                deductions: tempDeds
            } as unknown as Invoice;

            setInvoicePriceItems(prev => [...prev, ...tempPrices]);
            setInvoiceDeductions(prev => [...prev, ...tempDeds]);
            setInvoices(prev => [optimisticInv, ...prev]);
            setLastInvoiceAddedId(stableId);

            const queueOfflineInvoice = async () => {
                // (أ) invoices بإجمالي بيانات الفاتورة مع id المولد
                await addToSyncQueue({ 
                    table: 'invoices', 
                    action: 'insert', 
                    payload: { ...inv, id: stableId, user_id: effectiveUserId } 
                });
                // (ب) عنصر لكل صف في invoice_price_items مع invoice_id = نفس UUID
                if (price_items && price_items.length > 0) {
                    for (const pi of price_items) {
                        const { id: _unused_id, invoice_id: _unused_inv_id, ...cleanPrice } = pi;
                        await addToSyncQueue({
                            table: 'invoice_price_items',
                            action: 'insert',
                            payload: { ...cleanPrice, invoice_id: stableId, user_id: effectiveUserId }
                        });
                    }
                }
                // (ج) عنصر لكل صف في invoice_deductions مع invoice_id = نفس UUID
                if (deductions && deductions.length > 0) {
                    for (const ded of deductions) {
                        const { id: _unused_id, invoice_id: _unused_inv_id, ...cleanDed } = ded;
                        await addToSyncQueue({
                            table: 'invoice_deductions',
                            action: 'insert',
                            payload: { ...cleanDed, invoice_id: stableId, user_id: effectiveUserId }
                        });
                    }
                }
                try {
                    setInvoices(prev => prev.map(item => (item._stable_id === stableId || item.id === stableId) ? { ...item, pending_sync: true } as any : item));
                } catch (_e) {}
            };

            try {
                if (!invoiceData.isRetained) {
                    // كود إدخال الخزينة هنا (الفاتورة العادية تُسجل ديناميكياً في تدفقات الخزينة بالخارج)
                }

                const { data: newInv, error } = await supabase.from('invoices').insert([sanitizePayloadForTable('invoices', { ...inv, id: stableId, user_id: effectiveUserId })]).select().single();
                if (error) { 
                    if (isNetworkError(error)) {
                        await queueOfflineInvoice();
                        return;
                    } else {
                        throw error;
                    } 
                }
                
                // Notification handled by Edge Function to avoid sender duplication

                const realPricesPromise = price_items?.length ? supabase.from('invoice_price_items').insert(price_items.map((i) => ({ ...i, invoice_id: newInv.id, user_id: effectiveUserId }))).select() : Promise.resolve({data:[]});
                const realDedsPromise = deductions?.length ? supabase.from('invoice_deductions').insert(deductions.map((d) => ({ ...d, invoice_id: newInv.id, user_id: effectiveUserId }))).select() : Promise.resolve({data:[]});
                
                const [pricesRes, dedsRes] = await Promise.all([realPricesPromise, realDedsPromise]);
                
                recentlyAddedIds.current.add(newInv.id);
                markLocalAction(newInv.id);
                markLocalAction(stableId);
                setTimeout(() => recentlyAddedIds.current.delete(newInv.id), 10000); // cleanup after 10s

                setInvoicePriceItems(prev => [...prev.filter(p => p.invoice_id !== stableId), ...(pricesRes.data || [])]);
                setInvoiceDeductions(prev => [...prev.filter(d => d.invoice_id !== stableId), ...(dedsRes.data || [])]);
                
                setInvoices(prev => prev.map(i => i._stable_id === stableId ? { ...newInv, _stable_id: stableId, cycle: cycleName, created_at: optimisticCreatedAt } : i));

                // If this is a retained invoice, create matching negative advances
                const retainedMatch = inv.description?.match(/\[RETAINED_DEBT:([^\]]*)\]/);
                if (retainedMatch) {
                    try {
                        const parsed = JSON.parse(retainedMatch[1]);
                        let items: Array<{ debtId: string | null, allocations: Record<string, number> }> = [];
                        if (parsed && typeof parsed === 'object' && 'items' in parsed) {
                            items = Object.values(parsed.items);
                        } else if (parsed && typeof parsed === 'object') {
                            if ('allocations' in parsed) {
                                items.push({ debtId: parsed.debtId, allocations: parsed.allocations });
                            } else {
                                items.push({ debtId: null, allocations: parsed });
                            }
                        }

                        const createdAdvances: Advance[] = [];
                        for (const item of items) {
                          const { debtId, allocations } = item;
                          for (const partnerId of Object.keys(allocations)) {
                            const amount = parseFloat(allocations[partnerId] as any);
                            if (amount > 0) {
                                let finalReason = `سداد جزء من دين المعلم [EXTERNAL_DEBT] [INVOICE_REPAYMENT:${newInv.id}]`;
                                if (debtId) {
                                    const linkedDebt = (partnerDebts || []).find(d => d.id === debtId);
                                    const debtDesc = linkedDebt ? linkedDebt.description : 'دين مشترك';
                                    finalReason = `سداد جزء من الدين المشترك: ${debtDesc} [PARTNER_DEBT_PAYMENT:${debtId}] [INVOICE_REPAYMENT:${newInv.id}]`;
                                }

                                const dbPayload = {
                                    person_id: partnerId,
                                    amount: -amount, // allocations[partnerId] حصراً وليس إجمالي الفاتورة
                                    date: inv.date,
                                    cycle_id: inv.cycle_id,
                                    reason: finalReason,
                                    user_id: effectiveUserId,
            trigger_user_id: profile?.id,
                                    source_ref_id: newInv.id,
                                    source_type: 'invoice',
                                    is_retained_debt: true
                                };
                                const { data: createdAdv } = await supabase.from('advances').insert([dbPayload]).select().single();
                                if (createdAdv) {
                                    createdAdvances.push({ ...createdAdv, source_ref_id: newInv.id, source_type: 'invoice', is_retained_debt: true } as Advance);
                                }
                            }
                          }
                        }
                        if (createdAdvances.length > 0) {
                            setAdvances(prev => [...prev, ...createdAdvances]);
                        }
                    } catch (jsonErr) {
                        if (isNetworkError(jsonErr)) {
                            await queueOfflineInvoice();
                            return;
                        } else {
                            console.error("Failed to parse or save retained debt allocations:", jsonErr);
                        }
                    }
                }

                await refreshGlobalData();
                if (newInv) {
                    broadcastChange('invoices', newInv, 'INSERT');
                }
            } catch (error) {
                if (isNetworkError(error)) {
                    await queueOfflineInvoice();
                    return;
                } else {
                    setInvoices(prev => prev.filter(i => i._stable_id !== stableId));
                    setInvoicePriceItems(prev => prev.filter(p => p.invoice_id !== stableId));
                    setInvoiceDeductions(prev => prev.filter(d => d.invoice_id !== stableId));
                    throw error;
                }
            }
        },
        updateInvoice: async (d) => {
            const isRetained = d.description?.includes('[مرصودة]') || d.description?.includes('[RETAINED_DEBT]');
            const invoiceData = { ...d, isRetained };

            const { price_items, deductions, _stable_id: _unused_stable_id, cycle: _unused_cycle, ...cleanData } = d as Invoice;
            const invoiceId = d.id;

            setInvoices(prev => prev.map(inv => inv.id === invoiceId ? { ...inv, ...cleanData } : inv));
            
            const tempPrices = (price_items || []).map((pi) => ({ ...pi, invoice_id: invoiceId, user_id: effectiveUserId })) as InvoicePriceItem[];
            const tempDeds = (deductions || []).map((ded) => ({ ...ded, invoice_id: invoiceId, user_id: effectiveUserId })) as InvoiceDeductionItem[];
            
            setInvoicePriceItems(prev => [...prev.filter(p => p.invoice_id !== invoiceId), ...tempPrices]);
            setInvoiceDeductions(prev => [...prev.filter(ded => ded.invoice_id !== invoiceId), ...tempDeds]);

            // Optimistically update advances by removing prior linked repayments for this invoice
            setAdvances(prev => prev.filter(adv => adv.source_ref_id !== invoiceId && !adv.reason?.includes(`[INVOICE_REPAYMENT:${invoiceId}]`)));

            // Filter data to only contain database columns of the invoices table
            const allowedKeys = [
                'id',
                'user_id',
                'description',
                'date',
                'cycle_id',
                'market',
                'packaging_type',
                'packaging_count',
                'carton_count',
                'cage_count',
                'created_at'
            ];
            const finalUpdateData: any = {};
            for (const key of allowedKeys) {
                if (key in cleanData) {
                    finalUpdateData[key] = (cleanData as any)[key];
                }
            }

            try {
                if (!invoiceData.isRetained) {
                    // كود إدخال الخزينة هنا (الفاتورة العادية تُسجل ديناميكياً في تدفقات الخزينة بالخارج)
                }

                const { error: invError } = await supabase.from('invoices').update(sanitizePayloadForTable('invoices', finalUpdateData)).eq('id', invoiceId);
                if (invError) { 
                    if (isNetworkError(invError)) {
                        const cleanOfflinePriceItems = (price_items || []).map((pi: any) => {
                            const { id: _unused_id, invoice_id: _unused_invoice_id, user_id: _unused_user_id, ...cleanItem } = pi;
                            return cleanItem;
                        });
                        const cleanOfflineDeductions = (deductions || []).map((ded: any) => {
                            const { id: _unused_id, invoice_id: _unused_invoice_id, user_id: _unused_user_id, ...cleanDed } = ded;
                            return cleanDed;
                        });

                        await addToSyncQueue({
                            table: 'invoices',
                            action: 'update',
                            payload: {
                                ...finalUpdateData,
                                id: invoiceId,
                                _offline_price_items: cleanOfflinePriceItems,
                                _offline_deductions: cleanOfflineDeductions
                            },
                            recordId: invoiceId
                        });

                        try {
                            setInvoices(prev => prev.map(item => (item._stable_id === invoiceId || item.id === invoiceId) ? { ...item, pending_sync: true } as any : item));
                        } catch (_e) {} 
                        return;
                    } else {
                        throw invError;
                    } 
                }

                await supabase.from('invoice_price_items').delete().eq('invoice_id', invoiceId);
                await supabase.from('invoice_deductions').delete().eq('invoice_id', invoiceId);

                const realPricesPromise = price_items?.length 
                    ? supabase.from('invoice_price_items').insert(price_items.map((i) => {
                        const { id: _unused_id, invoice_id: _unused_invoice_id, user_id: _unused_user_id, ...cleanItem } = i;
                        return { ...cleanItem, invoice_id: invoiceId, user_id: effectiveUserId };
                    })).select() 
                    : Promise.resolve({ data: [] });

                const realDedsPromise = deductions?.length 
                    ? supabase.from('invoice_deductions').insert(deductions.map((ded) => {
                        const { id: _unused_id, invoice_id: _unused_invoice_id, user_id: _unused_user_id, ...cleanDed } = ded;
                        return { ...cleanDed, invoice_id: invoiceId, user_id: effectiveUserId };
                    })).select() 
                    : Promise.resolve({ data: [] });

                const [pricesRes, dedsRes] = await Promise.all([realPricesPromise, realDedsPromise]);

                setInvoicePriceItems(prev => [...prev.filter(p => p.invoice_id !== invoiceId), ...(pricesRes.data || [])]);
                setInvoiceDeductions(prev => [...prev.filter(ded => ded.invoice_id !== invoiceId), ...(dedsRes.data || [])]);

                // Delete old repayments in Supabase database for this invoice first
                await supabase.from('advances').delete().ilike('reason', `%[INVOICE_REPAYMENT:${invoiceId}]%`);

                // Insert new repayments if it's retained
                const retainedMatch = cleanData.description?.match(/\[RETAINED_DEBT:([^\]]*)\]/);
                if (retainedMatch) {
                    try {
                        const parsed = JSON.parse(retainedMatch[1]);
                        let items: Array<{ debtId: string | null, allocations: Record<string, number> }> = [];
                        if (parsed && typeof parsed === 'object' && 'items' in parsed) {
                            items = Object.values(parsed.items);
                        } else if (parsed && typeof parsed === 'object') {
                            if ('allocations' in parsed) {
                                items.push({ debtId: parsed.debtId, allocations: parsed.allocations });
                            } else {
                                items.push({ debtId: null, allocations: parsed });
                            }
                        }

                        const updatedAdvances: Advance[] = [];
                        for (const item of items) {
                          const { debtId, allocations } = item;
                          for (const partnerId of Object.keys(allocations)) {
                            const amount = parseFloat(allocations[partnerId] as any);
                            if (amount > 0) {
                                let finalReason = `سداد جزء من دين المعلم [EXTERNAL_DEBT] [INVOICE_REPAYMENT:${invoiceId}]`;
                                if (debtId) {
                                    const linkedDebt = (partnerDebts || []).find(d => d.id === debtId);
                                    const debtDesc = linkedDebt ? linkedDebt.description : 'دين مشترك';
                                    finalReason = `سداد جزء من الدين المشترك: ${debtDesc} [PARTNER_DEBT_PAYMENT:${debtId}] [INVOICE_REPAYMENT:${invoiceId}]`;
                                }

                                const dbPayload = {
                                    person_id: partnerId,
                                    amount: -amount, // allocations[partnerId] حصراً وليس إجمالي الفاتورة
                                    date: cleanData.date,
                                    cycle_id: cleanData.cycle_id,
                                    reason: finalReason,
                                    user_id: effectiveUserId,
            trigger_user_id: profile?.id,
                                    source_ref_id: invoiceId,
                                    source_type: 'invoice',
                                    is_retained_debt: true
                                };
                                const { data: createdAdv } = await supabase.from('advances').insert([dbPayload]).select().single();
                                if (createdAdv) {
                                    updatedAdvances.push({ ...createdAdv, source_ref_id: invoiceId, source_type: 'invoice', is_retained_debt: true } as Advance);
                                }
                            }
                          }
                        }
                        if (updatedAdvances.length > 0) {
                            setAdvances(prev => [...prev, ...updatedAdvances]);
                        }
                    } catch (jsonErr) {
                if (isNetworkError(jsonErr)) {
                  await addToSyncQueue({ table: 'invoices', action: 'update', payload: d });
                  try {
                    setInvoices(prev => prev.map(item => (item._stable_id === invoiceId || item.id === invoiceId) ? { ...item, pending_sync: true } as any : item));
                  } catch (_e) {} return;
                } else {
                  console.error("Failed to update retained debt allocations:", jsonErr);
                }
                }
                }

                await refreshGlobalData();
                broadcastChange('invoices', { ...d, ...finalUpdateData, id: invoiceId }, 'UPDATE');

            } catch (error) {
        if (isNetworkError(error)) {
          await addToSyncQueue({ table: 'invoices', action: 'update', payload: d });
          try {
            setInvoices(prev => prev.map(item => (item._stable_id === invoiceId || item.id === invoiceId) ? { ...item, pending_sync: true } as any : item));
          } catch (_e) {} return;
        } else {
          console.error("Update Invoice Error:", error);
                        fetchData();
                        throw error;
        }
        }
        }, 
        deleteInvoice: async (id) => {
            setInvoices(prev => prev.filter(inv => inv.id !== id));
            setInvoicePriceItems(prev => prev.filter(p => p.invoice_id !== id));
            setInvoiceDeductions(prev => prev.filter(d => d.invoice_id !== id));
            setAdvances(prev => prev.filter(adv => adv.source_ref_id !== id && !adv.reason?.includes(`[INVOICE_REPAYMENT:${id}]`)));
            
            try {
                await supabase.from('invoices').delete().eq('id', id);
                await supabase.from('advances').delete().ilike('reason', `%[INVOICE_REPAYMENT:${id}]%`);
            } catch (error) {
                if (isNetworkError(error)) {
                    await addToSyncQueue({ table: 'invoices', action: 'delete', payload: {}, recordId: id });
                } else {
                    throw error;
                }
            }
            await refreshGlobalData();
            broadcastChange('invoices', { id }, 'DELETE');
        },
        lastInvoiceAddedId, setLastInvoiceAddedId,
        dailyLogs,
        addDailyLog: async (data) => {
            const stableId = generateStableId();
            const optimisticCreatedAt = new Date().toISOString();
            const cycleName = cycles.find(c => c.id === data.cycle_id)?.name;
            const optimisticLog = { ...data, id: stableId, _stable_id: stableId, cycle: cycleName, created_at: optimisticCreatedAt } as DailyLog;
            
            setDailyLogs(prev => [optimisticLog, ...prev]);
            
            const { data: newLog, error } = await supabase.from('daily_logs').insert([sanitizePayloadForTable('daily_logs', { ...data, user_id: effectiveUserId })]).select().single();
            if (error) { if (isNetworkError(error)) {
              addToSyncQueue({ table: 'daily_logs', action: 'insert', payload: data }).catch(console.error);
              try {
                setDailyLogs(prev => prev.map(item => (item._stable_id === stableId || item.id === stableId) ? { ...item, pending_sync: true } as any : item));
              } catch (_e) {} return;
            } else {
              setDailyLogs(prev => prev.filter(l => l._stable_id !== stableId)); throw error;
            } }
            
            recentlyAddedIds.current.add(newLog.id);
            setTimeout(() => recentlyAddedIds.current.delete(newLog.id), 10000);

            setDailyLogs(prev => prev.map(l => l._stable_id === stableId ? { ...newLog, _stable_id: stableId, cycle: cycleName } : l));
            broadcastChange('daily_logs', newLog, 'INSERT');
        },
        updateDailyLog: async (d) => {
            const cleanData = sanitizePayloadForTable('daily_logs', d);
            setDailyLogs(prev => prev.map(l => l.id === d.id ? { ...l, ...cleanData } : l));
            const { error } = await supabase.from('daily_logs').update(sanitizePayloadForTable('daily_logs', cleanData)).eq('id', d.id);
            if (error) { if (isNetworkError(error)) {
              addToSyncQueue({ table: 'daily_logs', action: 'update', payload: d }).catch(console.error);
              try {
                setDailyLogs(prev => prev.map(item => (item._stable_id === d.id || item.id === d.id) ? { ...item, pending_sync: true } as any : item));
              } catch (_e) {} return;
            } else {
              console.error("Failed to update daily log:", error);
                            throw error;
            } }
            await refreshGlobalData();
            broadcastChange('daily_logs', cleanData, 'UPDATE');
        },
        deleteDailyLog: async (id) => {
            try {
                setDailyLogs(prev => prev.filter(l => l.id !== id));
                await supabase.from('daily_logs').delete().eq('id', id);
                broadcastChange('daily_logs', { id }, 'DELETE');
                return true;
            } catch (error) { if (isNetworkError(error)) { await addToSyncQueue({ table: 'daily_logs', action: 'delete', payload: {}, recordId: id }); } else { throw error; } }
        },
        expenses: hydratedExpenses,
        rawExpenses: rawExpensesHydrated,
        isExternalLabor,
        addExpense: async (data) => {
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
                console.warn("shift_type column might not exist in Supabase yet. Retrying without shift_type.");
                const { shift_type: _shift_type, ...fallbackData } = cleanData;
                response = await supabase.from('expenses').insert([sanitizePayloadForTable('expenses', { ...fallbackData, user_id: effectiveUserId })]).select().single();
            }
            const { data: newExp, error } = response;
            if (error) { if (isNetworkError(error)) {
              addToSyncQueue({ table: 'expenses', action: 'insert', payload: data }).catch(console.error);
              try {
                setExpenses(prev => prev.map(item => (item._stable_id === stableId || item.id === stableId) ? { ...item, pending_sync: true } as any : item));
              } catch (_e) {} return;
            } else {
              setExpenses(prev => prev.filter(e => e._stable_id !== stableId)); throw error;
            } }
            
            recentlyAddedIds.current.add(newExp.id);
            markLocalAction(newExp.id);
            markLocalAction(stableId);
            setTimeout(() => recentlyAddedIds.current.delete(newExp.id), 10000);

            // Notification handled by Edge Function

            setExpenses(prev => prev.map(e => e._stable_id === stableId ? { ...newExp, _stable_id: stableId, cycle: cycleName, categoryName: catName, created_at: optimisticCreatedAt } : e));
            await refreshGlobalData();
            broadcastChange('expenses', newExp, 'INSERT');
        },
        updateExpense: async (d: any, updates?: any) => {
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
                console.warn("Retrying expense update without optional columns.");
                const { shift_type: _shift_type, ...fallbackData } = cleanData;
                response = await supabase.from('expenses').update(sanitizePayloadForTable('expenses', fallbackData)).eq('id', targetId);
            }
            if (response.error) { if (isNetworkError(response.error)) {
              addToSyncQueue({ table: 'expenses', action: 'update', payload: payload }).catch(console.error);
              try {
                setExpenses(prev => prev.map(item => (item._stable_id === (d.id || d) || item.id === (d.id || d)) ? { ...item, pending_sync: true } as any : item));
              } catch (_e) {} return;
            } else {
              console.error("Failed to update expense in Supabase:", response.error);
                            throw response.error;
            } }
            await refreshGlobalData();
            broadcastChange('expenses', cleanData, 'UPDATE');
        },
        deleteExpense: async (id) => {
            try {
                setExpenses(prev => prev.filter(e => e.id !== id));
                await supabase.from('expenses').delete().eq('id', id);
                await refreshGlobalData();
                broadcastChange('expenses', { id }, 'DELETE');
            } catch (error) { if (isNetworkError(error)) { await addToSyncQueue({ table: 'expenses', action: 'delete', payload: {}, recordId: id }); } else { throw error; } }
        },
        lastExpenseAddedId, setLastExpenseAddedId,
        cycles: cyclesWithCalculations,
        cyclesWithCalculations,
        addCycle: async (data, transferBalance = false, customTransferAmount) => {
            const stableId = generateStableId();
            const optimisticCreatedAt = new Date().toISOString();
            const optimisticCycle = { ...data, id: stableId, _stable_id: stableId, created_at: optimisticCreatedAt, revenue: 0, expenses: 0, profit: 0, health: 100 } as unknown as Cycle;
            setCycles(prev => [optimisticCycle, ...prev]);
            setLastCycleAddedId(stableId);
            const { data: newCycle, error } = await supabase.from('cycles').insert([sanitizePayloadForTable('cycles', { ...data, user_id: effectiveUserId })]).select().single();
            if (error) { if (isNetworkError(error)) {
              addToSyncQueue({ table: 'cycles', action: 'insert', payload: data }).catch(console.error);
              try {
                setCycles(prev => prev.map(item => (item._stable_id === stableId || item.id === stableId) ? { ...item, pending_sync: true } as any : item));
              } catch (_e) {} return;
            } else {
              setCycles(prev => prev.filter(c => c._stable_id !== stableId)); throw error;
            } }
            setCycles(prev => prev.map(c => c._stable_id === stableId ? { ...newCycle, _stable_id: stableId, created_at: optimisticCreatedAt } : c));
            
            // Check if we should carry forward the cash balance from a closed cycle
            if (transferBalance) {
                const closedCycles = cycles.filter(c => c.status === 'closed');
                if (closedCycles.length > 0) {
                    const sortedClosed = [...closedCycles].sort((a, b) => new Date(b.created_at || b.start_date || 0).getTime() - new Date(a.created_at || a.start_date || 0).getTime());
                    const lastClosed = sortedClosed[0];
                    const balanceToTransfer = customTransferAmount !== undefined ? customTransferAmount : getCycleTotalBalance(lastClosed.id);
                    
                    if (balanceToTransfer !== 0) {
                        const alreadyTransferred = hydratedInvoices.some(inv => 
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
                                await val.addInvoice(invoiceData as any);
                            } catch (invErr) {
                        if (isNetworkError(invErr)) {
                          await addToSyncQueue({ table: 'cycles', action: 'insert', payload: data });
                          try {
                            setCycles(prev => prev.map(item => (item._stable_id === stableId || item.id === stableId) ? { ...item, pending_sync: true } as any : item));
                          } catch (_e) {} return;
                        } else {
                          console.error("Failed to auto-transfer cash balance", invErr);
                        }
                        }
                        }
                    }
                }
            }
            
            await refreshGlobalData();
            broadcastChange('cycles', newCycle, 'INSERT');
        },
        updateCycle: async (d, transferBalance = false) => {
            const cycleObj = d as Cycle;
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
            
            // If cycle is being closed and transferBalance is requested, check if there is an active cycle to receive its balance
            if (cleanDataForDb.status === 'closed' && transferBalance) {
                const activeCycle = cycles.find(c => c.status === 'active' && c.id !== cycleObj.id);
                if (activeCycle) {
                    const alreadyTransferred = hydratedInvoices.some(inv => 
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
                                await val.addInvoice(invoiceData as any);
                            } catch (invErr) {
                        if (isNetworkError(invErr)) {
                          await addToSyncQueue({ table: 'cycles', action: 'update', payload: d });
                          try {
                            setCycles(prev => prev.map(item => (item._stable_id === d.id || item.id === d.id) ? { ...item, pending_sync: true } as any : item));
                          } catch (_e) {} return;
                        } else {
                          console.error("Failed to auto-transfer cash balance on close", invErr);
                        }
                        }
                        }
                    }
                }
            }
            
            await refreshGlobalData();
            broadcastChange('cycles', cleanDataForDb, 'UPDATE');
        },
        deleteCycle: async (id) => {
            // 1. Clean local state immediately for a blazing fast, zero-jank UI (Optimistic Cascade)
            setCycles(prev => prev.filter(c => c.id !== id));
            setInvoices(prev => prev.filter(inv => inv.cycle_id !== id));
            setExpenses(prev => prev.filter(e => e.cycle_id !== id));
            setAdvances(prev => prev.filter(a => a.cycle_id !== id));
            setDailyLogs(prev => prev.filter(l => l.cycle_id !== id));
            setSupplierPayments(prev => prev.filter(p => p.cycle_id !== id));
            setFarmerWithdrawals(prev => prev.filter(w => w.cycle_id !== id));
            setPartnerDebts(prev => prev.filter(d => d.cycle_id !== id));

            try {
                // 2. Delete related records in Supabase explicitly first (prevents FK constraint errors if CASCADE is not configured in DB)
                await Promise.all([
                    supabase.from('invoices').delete().eq('cycle_id', id),
                    supabase.from('expenses').delete().eq('cycle_id', id),
                    supabase.from('advances').delete().eq('cycle_id', id),
                    supabase.from('daily_logs').delete().eq('cycle_id', id),
                    supabase.from('supplier_payments').delete().eq('cycle_id', id),
                    supabase.from('farmer_withdrawals').delete().eq('cycle_id', id),
                    supabase.from('partner_debts').delete().eq('cycle_id', id),
                ]);

                // 3. Finally delete the cycle itself
                await supabase.from('cycles').delete().eq('id', id);
                await refreshGlobalData();
                broadcastChange('cycles', { id }, 'DELETE');
                return true;
            } catch (error) {
        if (isNetworkError(error)) {
          await addToSyncQueue({ table: 'cycles', action: 'delete', payload: {}, recordId: id });
        } else {
          console.error("Failed to safely delete cycle and its relations:", error);
                        // Trigger a full data refresh to restore UI state if deletion failed
                        fetchData();
                        throw error;
        }
        }
        },
        lastCycleAddedId, setLastCycleAddedId,
        persons: hydratedPersons, 
        activePersons, 
        addPerson: async (name, virtual_id = null, percentage = 0) => {
            const stableId = generateStableId();
            const optimisticPerson = { name, id: stableId, _stable_id: stableId, virtual_id } as unknown as Person;
            setPersons(prev => [optimisticPerson, ...prev]);

            const { data, error } = await supabase.from('persons').insert([sanitizePayloadForTable('persons', { name, user_id: effectiveUserId })]).select().single();
            if (error) {
                if (isNetworkError(error)) {
                    addToSyncQueue({ table: 'persons', action: 'insert', payload: { name, virtual_id, percentage } }).catch(console.error);
                    setPersons(prev => prev.map(p => p._stable_id === stableId ? { ...p, pending_sync: true } as any : p));
                    return optimisticPerson;
                } else {
                    setPersons(prev => prev.filter(p => p._stable_id !== stableId));
                    return null;
                }
            }

            const newData = { ...data, _stable_id: data.id, virtual_id };
            setPersons(prev => prev.map(p => p._stable_id === stableId ? newData : p));
            
            // Save virtual partner mapping and percentage in app_settings JSONB
            const currentMappings = settings.person_partner_mappings || {};
            const newMappings = { ...currentMappings };
            if (virtual_id) {
                newMappings[data.id] = virtual_id;
            } else {
                delete newMappings[data.id];
            }

            const currentPercentages = settings.person_partner_percentages || {};
            const newPercentages = { ...currentPercentages };
            if (percentage > 0) {
                newPercentages[data.id] = percentage;
            } else {
                delete newPercentages[data.id];
            }

            await updateSettings({ 
                person_partner_mappings: newMappings,
                person_partner_percentages: newPercentages
            });

            await refreshGlobalData();
            broadcastChange('persons', newData, 'INSERT');
            return newData;
        },
        updatePerson: async (id, name, virtual_id = null, percentage = 0) => {
            setPersons(prev => prev.map(p => p.id === id ? { ...p, name, virtual_id } : p));
            const { error } = await supabase.from('persons').update(sanitizePayloadForTable('persons', { name })).eq('id', id);
            
            if (error) {
                if (isNetworkError(error)) {
                    addToSyncQueue({ table: 'persons', action: 'update', payload: { id, name, virtual_id, percentage } }).catch(console.error);
                    setPersons(prev => prev.map(p => p.id === id ? { ...p, pending_sync: true } as any : p));
                } else {
                    return false;
                }
            }

            // Save virtual partner mapping and percentage in app_settings JSONB
            const currentMappings = settings.person_partner_mappings || {};
            const newMappings = { ...currentMappings };
            if (virtual_id) {
                newMappings[id] = virtual_id;
            } else {
                delete newMappings[id];
            }

            const currentPercentages = settings.person_partner_percentages || {};
            const newPercentages = { ...currentPercentages };
            if (percentage > 0) {
                newPercentages[id] = percentage;
            } else {
                delete newPercentages[id];
            }

            await updateSettings({ 
                person_partner_mappings: newMappings,
                person_partner_percentages: newPercentages
            });

            await refreshGlobalData();
            broadcastChange('persons', { id, name }, 'UPDATE');
            return true;
        },
        deletePerson: async (id) => {
            setPersons(prev => prev.filter(p => p.id !== id));
            const currentMappings = settings.person_partner_mappings || {};
            const currentPercentages = settings.person_partner_percentages || {};
            const newMappings = { ...currentMappings };
            const newPercentages = { ...currentPercentages };
            
            let updated = false;
            if (newMappings[id]) {
                delete newMappings[id];
                updated = true;
            }
            if (newPercentages[id]) {
                delete newPercentages[id];
                updated = true;
            }

            const currentArchived = settings.archived_person_ids || [];
            const newArchived = [...currentArchived];
            if (!newArchived.includes(id)) {
                newArchived.push(id);
                updated = true;
            }
            
            if (updated || !currentArchived.includes(id)) {
                await updateSettings({ 
                    person_partner_mappings: newMappings,
                    person_partner_percentages: newPercentages,
                    archived_person_ids: newArchived
                });
            }

            try {
                const { error } = await supabase.from('persons').delete().eq('id', id);
                if (error) throw error;
                await refreshGlobalData();
                broadcastChange('persons', { id }, 'DELETE');
                return true;
            } catch (error) {
                if (isNetworkError(error)) {
                    await addToSyncQueue({ table: 'persons', action: 'delete', payload: {}, recordId: id });
                    return true;
                } else {
                    throw error;
                }
            }
        },
        virtualMembers,
        advances: hydratedAdvances, 
        addAdvance: async (d) => {
            const stableId = generateStableId();
            
            // Build a clean reason that includes [EXTERNAL_DEBT] if the funding source is external_debt
            let finalReason = d.reason || '';
            if (d.funding_source === 'external_debt' && !finalReason.includes('[EXTERNAL_DEBT]')) {
                finalReason = `${finalReason} [EXTERNAL_DEBT]`.trim();
            }

            // Exclude funding_source column when inserting into the database
            const dbPayload = {
                person_id: d.person_id,
                amount: d.amount,
                date: d.date,
                cycle_id: d.cycle_id,
                reason: finalReason
            };

            const optimisticAdv = { 
                ...d, 
                reason: finalReason, 
                id: stableId, 
                _stable_id: stableId, 
                created_at: new Date().toISOString() 
            } as unknown as Advance;

            setAdvances(prev => [optimisticAdv, ...prev]);
            setLastAdvanceAddedId(stableId);

            const { data: newAdv, error } = await supabase.from('advances').insert([sanitizePayloadForTable('advances', {...dbPayload, user_id: effectiveUserId})]).select().single();
            if (error) { if (isNetworkError(error)) {
              addToSyncQueue({ table: 'advances', action: 'insert', payload: d }).catch(console.error);
              try {
                setAdvances(prev => prev.map(item => (item._stable_id === stableId || item.id === stableId) ? { ...item, pending_sync: true } as any : item));
              } catch (_e) {} return;
            } else {
              setAdvances(prev => prev.filter(a => a._stable_id !== stableId)); throw error;
            } }

            recentlyAddedIds.current.add(newAdv.id);
            markLocalAction(newAdv.id);
            markLocalAction(stableId);
            setTimeout(() => recentlyAddedIds.current.delete(newAdv.id), 10000);

            // Notification handled by Edge Function

            setAdvances(prev => prev.map(a => a._stable_id === stableId ? { ...newAdv, _stable_id: stableId } : a));
            await refreshGlobalData();
            broadcastChange('advances', newAdv, 'INSERT');
        },
        updateAdvance: async (d) => {
            let finalReason = d.reason || '';
            if (d.funding_source === 'external_debt' && !finalReason.includes('[EXTERNAL_DEBT]')) {
                finalReason = `${finalReason} [EXTERNAL_DEBT]`.trim();
            } else if (d.funding_source !== 'external_debt' && finalReason.includes('[EXTERNAL_DEBT]')) {
                finalReason = finalReason.replace('[EXTERNAL_DEBT]', '').trim();
            }

            const cleanData = sanitizePayloadForTable('advances', d);
            // Ensure we delete any client-only properties
            delete (cleanData as any).funding_source;
            cleanData.reason = finalReason;

            setAdvances(prev => prev.map(a => a.id === d.id ? { ...a, ...cleanData } : a));
            const { error } = await supabase.from('advances').update(sanitizePayloadForTable('advances', cleanData)).eq('id', d.id);
            if (error) { if (isNetworkError(error)) {
              addToSyncQueue({ table: 'advances', action: 'update', payload: d }).catch(console.error);
              try {
                setAdvances(prev => prev.map(item => (item._stable_id === d.id || item.id === d.id) ? { ...item, pending_sync: true } as any : item));
              } catch (_e) {} return;
            } else {
              console.error("Failed to update advance:", error);
                            throw error;
            } }
            await refreshGlobalData();
            broadcastChange('advances', cleanData, 'UPDATE');
        }, 
        deleteAdvance: async (id) => {
            try {
                setAdvances(prev => prev.filter(a => a.id !== id));
                await supabase.from('advances').delete().eq('id', id);
                await refreshGlobalData();
                broadcastChange('advances', { id }, 'DELETE');
            } catch (error) { if (isNetworkError(error)) { await addToSyncQueue({ table: 'advances', action: 'delete', payload: {}, recordId: id }); } else { throw error; } }
        },
        lastAdvanceAddedId, setLastAdvanceAddedId,
        suppliers, 
        addSupplier: async (name, opening_balance = 0) => {
            const stableId = generateStableId();
            const optimisticSupplier = {
                id: stableId,
                _stable_id: stableId,
                name,
                opening_balance,
                user_id: effectiveUserId,
                created_at: new Date().toISOString()
            } as unknown as Supplier;
            setSuppliers(prev => [optimisticSupplier, ...prev]);
            setLastSupplierAddedId(stableId);

            const { data, error } = await supabase.from('suppliers').insert([sanitizePayloadForTable('suppliers', {name, opening_balance, user_id: effectiveUserId})]).select().single();
            if (error) { 
                if (isNetworkError(error)) {
                    addToSyncQueue({ table: 'suppliers', action: 'insert', payload: { name, opening_balance } }).catch(console.error);
                    try {
                        setSuppliers(prev => prev.map(item => (item._stable_id === stableId || item.id === stableId) ? { ...item, pending_sync: true } as any : item));
                    } catch (_e) {} 
                    return;
                } else {
                    setSuppliers(prev => prev.filter(s => s._stable_id !== stableId));
                    throw error;
                } 
            }
            if (data) { 
                recentlyAddedIds.current.add(data.id);
                markLocalAction(data.id);
                markLocalAction(stableId);
                setTimeout(() => recentlyAddedIds.current.delete(data.id), 10000);

                setSuppliers(prev => prev.map(s => s._stable_id === stableId ? { ...data, _stable_id: stableId } : s));
                setLastSupplierAddedId(data.id);
            }
            await refreshGlobalData();
            if (data) broadcastChange('suppliers', data, 'INSERT');
        },
        updateSupplier: async (supplier) => {
            const { _stable_id: _unused_sid, ...cleanData } = supplier;
            const { error } = await supabase.from('suppliers').update(sanitizePayloadForTable('suppliers', cleanData)).eq('id', supplier.id);
            if (error) { if (isNetworkError(error)) {
              addToSyncQueue({ table: 'suppliers', action: 'update', payload: supplier }).catch(console.error);
              try {
                setSuppliers(prev => prev.map(item => (item._stable_id === supplier.id || item.id === supplier.id) ? { ...item, pending_sync: true } as any : item));
              } catch (_e) {} return;
            } else {
              throw error;
            } }
            setSuppliers(prev => prev.map(s => s.id === supplier.id ? { ...s, ...cleanData } : s));
            await refreshGlobalData();
            broadcastChange('suppliers', cleanData, 'UPDATE');
        },
        deleteSupplier: async (id) => {
            try {
                setSuppliers(prev => prev.filter(s => s.id !== id));
                await supabase.from('suppliers').delete().eq('id', id);
                await refreshGlobalData();
                broadcastChange('suppliers', { id }, 'DELETE');
                return true;
            } catch (error) { if (isNetworkError(error)) { await addToSyncQueue({ table: 'suppliers', action: 'delete', payload: {}, recordId: id }); } else { throw error; } }
        },
        lastSupplierAddedId, setLastSupplierAddedId,
        supplierPayments, 
        addSupplierPayment: async (d) => {
            const stableId = generateStableId();
            const optimisticPay = { ...d, id: stableId, _stable_id: stableId, created_at: new Date().toISOString() } as unknown as SupplierPayment;
            setSupplierPayments(prev => [optimisticPay, ...prev]);
            const { data: newPay, error } = await supabase.from('supplier_payments').insert([sanitizePayloadForTable('supplier_payments', {...d, user_id: effectiveUserId})]).select().single();
            if (error) { if (isNetworkError(error)) {
              addToSyncQueue({ table: 'supplier_payments', action: 'insert', payload: d }).catch(console.error);
              try {
                setSupplierPayments(prev => prev.map(item => (item._stable_id === stableId || item.id === stableId) ? { ...item, pending_sync: true } as any : item));
              } catch (_e) {} return;
            } else {
              setSupplierPayments(prev => prev.filter(p => p._stable_id !== stableId)); throw error;
            } }

            recentlyAddedIds.current.add(newPay.id);
            markLocalAction(newPay.id);
            markLocalAction(stableId);
            setTimeout(() => recentlyAddedIds.current.delete(newPay.id), 10000);

            // Notification handled by Edge Function

            setSupplierPayments(prev => prev.map(p => p._stable_id === stableId ? { ...newPay, _stable_id: stableId } : p));
            await refreshGlobalData();
            broadcastChange('supplier_payments', newPay, 'INSERT');
        },
        updateSupplierPayment: async (d) => {
            const cleanData = sanitizePayloadForTable('supplier_payments', d);
            setSupplierPayments(prev => prev.map(p => p.id === d.id ? { ...p, ...cleanData } : p));
            const { error } = await supabase.from('supplier_payments').update(sanitizePayloadForTable('supplier_payments', cleanData)).eq('id', d.id);
            if (error) { if (isNetworkError(error)) {
              addToSyncQueue({ table: 'supplier_payments', action: 'update', payload: d }).catch(console.error);
              try {
                setSupplierPayments(prev => prev.map(item => (item._stable_id === d.id || item.id === d.id) ? { ...item, pending_sync: true } as any : item));
              } catch (_e) {} return;
            } else {
              console.error("Failed to update supplier payment:", error);
                            throw error;
            } }
            await refreshGlobalData();
            broadcastChange('supplier_payments', cleanData, 'UPDATE');
        }, 
        deleteSupplierPayment: async (id) => {
            try {
                setSupplierPayments(prev => prev.filter(p => p.id !== id));
                await supabase.from('supplier_payments').delete().eq('id', id);
                await refreshGlobalData();
                broadcastChange('supplier_payments', { id }, 'DELETE');
            } catch (error) { if (isNetworkError(error)) { await addToSyncQueue({ table: 'supplier_payments', action: 'delete', payload: {}, recordId: id }); } else { throw error; } }
        },
        farmers, 
        addFarmer: async (name) => {
            const { data, error } = await supabase.from('farmers').insert([sanitizePayloadForTable('farmers', {name, user_id: effectiveUserId})]).select().single();
            if (!error && data) { setFarmers(prev => [{...data, _stable_id: data.id}, ...prev]); setLastFarmerAddedId(data.id); }
            await refreshGlobalData();
            if (data) broadcastChange('farmers', data, 'INSERT');
        },
        updateFarmer: async (farmer) => {
            const { _stable_id: _unused_sid, ...cleanData } = farmer;
            const { error } = await supabase.from('farmers').update(sanitizePayloadForTable('farmers', cleanData)).eq('id', farmer.id);
            if (error) { if (isNetworkError(error)) {
              addToSyncQueue({ table: 'farmers', action: 'update', payload: farmer }).catch(console.error);
              try {
                setFarmers(prev => prev.map(item => (item._stable_id === farmer.id || item.id === farmer.id) ? { ...item, pending_sync: true } as any : item));
              } catch (_e) {} return;
            } else {
              throw error;
            } }
            setFarmers(prev => prev.map(f => f.id === farmer.id ? { ...farmer, _stable_id: farmer.id } : f));
            await refreshGlobalData();
            broadcastChange('farmers', cleanData, 'UPDATE');
        },
        deleteFarmer: async (id) => {
            try {
                setFarmers(prev => prev.filter(f => f.id !== id));
                await supabase.from('farmers').delete().eq('id', id);
                await refreshGlobalData();
                broadcastChange('farmers', { id }, 'DELETE');
                return true;
            } catch (error) { if (isNetworkError(error)) { await addToSyncQueue({ table: 'farmers', action: 'delete', payload: {}, recordId: id }); } else { throw error; } }
        },
        lastFarmerAddedId, setLastFarmerAddedId,
        farmerWithdrawals, 
        addFarmerWithdrawal: async (d) => {
            const stableId = generateStableId();
            const optimisticWith = { ...d, id: stableId, _stable_id: stableId, created_at: new Date().toISOString() } as unknown as FarmerWithdrawal;
            setFarmerWithdrawals(prev => [optimisticWith, ...prev]);
            const { data: newWith, error } = await supabase.from('farmer_withdrawals').insert([sanitizePayloadForTable('farmer_withdrawals', {...d, user_id: effectiveUserId})]).select().single();
            if (error) { if (isNetworkError(error)) {
              addToSyncQueue({ table: 'farmer_withdrawals', action: 'insert', payload: d }).catch(console.error);
              try {
                setFarmerWithdrawals(prev => prev.map(item => (item._stable_id === stableId || item.id === stableId) ? { ...item, pending_sync: true } as any : item));
              } catch (_e) {} return;
            } else {
              setFarmerWithdrawals(prev => prev.filter(w => w._stable_id !== stableId)); throw error;
            } }

            recentlyAddedIds.current.add(newWith.id);
            markLocalAction(newWith.id);
            markLocalAction(stableId);
            setTimeout(() => recentlyAddedIds.current.delete(newWith.id), 10000);

            // Notification handled by Edge Function

            setFarmerWithdrawals(prev => prev.map(w => w._stable_id === stableId ? { ...newWith, _stable_id: stableId } : w));
            await refreshGlobalData();
            broadcastChange('farmer_withdrawals', newWith, 'INSERT');
        },
        updateFarmerWithdrawal: async (d) => {
            const cleanData = sanitizePayloadForTable('farmer_withdrawals', d);
            setFarmerWithdrawals(prev => prev.map(w => w.id === d.id ? { ...w, ...cleanData } : w));
            const { error } = await supabase.from('farmer_withdrawals').update(sanitizePayloadForTable('farmer_withdrawals', cleanData)).eq('id', d.id);
            if (error) { if (isNetworkError(error)) {
              addToSyncQueue({ table: 'farmer_withdrawals', action: 'update', payload: d }).catch(console.error);
              try {
                setFarmerWithdrawals(prev => prev.map(item => (item._stable_id === d.id || item.id === d.id) ? { ...item, pending_sync: true } as any : item));
              } catch (_e) {} return;
            } else {
              console.error("Failed to update farmer withdrawal:", error);
                            throw error;
            } }
            await refreshGlobalData();
            broadcastChange('farmer_withdrawals', cleanData, 'UPDATE');
        }, 
        deleteFarmerWithdrawal: async (id) => {
            try {
                setFarmerWithdrawals(prev => prev.filter(w => w.id !== id));
                await supabase.from('farmer_withdrawals').delete().eq('id', id);
                await refreshGlobalData();
                broadcastChange('farmer_withdrawals', { id }, 'DELETE');
            } catch (error) { if (isNetworkError(error)) { await addToSyncQueue({ table: 'farmer_withdrawals', action: 'delete', payload: {}, recordId: id }); } else { throw error; } }
        },
        expenseCategories: filteredExpenseCategories, 
        allExpenseCategories: expenseCategories,
        addExpenseCategory: async (c) => {
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
            await refreshGlobalData();
            if (newCat) broadcastChange('expense_categories', newCat, 'INSERT');
            return newCat?.id;
        },
        updateExpenseCategory: async (d) => {
            const cleanData = sanitizePayloadForTable('expense_categories', d);
            setExpenseCategories(prev => prev.map(cat => cat.id === d.id ? { ...cat, ...cleanData } : cat));
            const { error } = await supabase.from('expense_categories').update(sanitizePayloadForTable('expense_categories', cleanData)).eq('id', d.id);
            if (error) { if (isNetworkError(error)) {
              addToSyncQueue({ table: 'expense_categories', action: 'update', payload: d }).catch(console.error);
              try {
                setExpenseCategories(prev => prev.map(item => (item._stable_id === d.id || item.id === d.id) ? { ...item, pending_sync: true } as any : item));
              } catch (_e) {} return;
            } else {
              console.error("Failed to update expense category:", error);
                            throw error;
            } }
            await refreshGlobalData();
            broadcastChange('expense_categories', cleanData, 'UPDATE');
        }, 
        deleteExpenseCategory: async (id) => {
            try {
                setExpenseCategories(prev => prev.filter(cat => cat.id !== id));
                await supabase.from('expense_categories').delete().eq('id', id);
                await refreshGlobalData();
                broadcastChange('expense_categories', { id }, 'DELETE');
                return true;
            } catch (error) { if (isNetworkError(error)) { await addToSyncQueue({ table: 'expense_categories', action: 'delete', payload: {}, recordId: id }); } else { throw error; } }
        },
        lastExpenseCategoryAddedId, setLastExpenseCategoryAddedId,
        assets, 
        addAsset: async (a) => {
            const { data, error } = await supabase.from('assets').insert([sanitizePayloadForTable('assets', {...a, user_id: effectiveUserId})]).select().single();
            if (!error && data) setAssets(prev => [{...data, _stable_id: data.id}, ...prev]);
            await refreshGlobalData();
            if (data) broadcastChange('assets', data, 'INSERT');
        },
        updateAsset: async (d) => {
            const cleanData = sanitizePayloadForTable('assets', d);
            setAssets(prev => prev.map(a => a.id === d.id ? { ...a, ...cleanData } : a));
            const { error } = await supabase.from('assets').update(sanitizePayloadForTable('assets', cleanData)).eq('id', d.id);
            if (error) { if (isNetworkError(error)) {
              addToSyncQueue({ table: 'assets', action: 'update', payload: d }).catch(console.error);
              try {
                setAssets(prev => prev.map(item => (item._stable_id === d.id || item.id === d.id) ? { ...item, pending_sync: true } as any : item));
              } catch (_e) {} return;
            } else {
              console.error("Failed to update asset:", error);
                            throw error;
            } }
            await refreshGlobalData();
            broadcastChange('assets', cleanData, 'UPDATE');
        }, 
        deleteAsset: async (id) => {
            try {
                setAssets(prev => prev.filter(a => a.id !== id));
                await supabase.from('assets').delete().eq('id', id);
                await refreshGlobalData();
                broadcastChange('assets', { id }, 'DELETE');
                return true;
            } catch (error) { if (isNetworkError(error)) { await addToSyncQueue({ table: 'assets', action: 'delete', payload: {}, recordId: id }); } else { throw error; } }
        },
        getCycleCashBalance,
        getCycleTotalBalance,
        totalRevenue,
        totalNetRevenue,
        totalExpenses,
        ownerNetProfit,
        totalFarmerShare,
        treasuryFunds,
        bankAccounts,
        addBankAccount: async (d) => {
            const stableId = generateStableId();
            const optimisticAcc = { ...d, id: stableId, _stable_id: stableId, created_at: new Date().toISOString() } as BankAccount;
            setBankAccounts(prev => [optimisticAcc, ...prev]);
            const { data: newAcc, error } = await supabase.from('bank_accounts').insert([sanitizePayloadForTable('bank_accounts', {...d, user_id: effectiveUserId})]).select().single();
            if (error) { if (isNetworkError(error)) {
              addToSyncQueue({ table: 'bank_accounts', action: 'insert', payload: d }).catch(console.error);
              try {
                setBankAccounts(prev => prev.map(item => (item._stable_id === stableId || item.id === stableId) ? { ...item, pending_sync: true } as any : item));
              } catch (_e) {} return stableId;
            } else {
              setBankAccounts(prev => prev.filter(a => a._stable_id !== stableId)); throw error;
            } }
            setBankAccounts(prev => prev.map(a => a._stable_id === stableId ? { ...newAcc, _stable_id: stableId } : a));
            await refreshGlobalData();
            broadcastChange('bank_accounts', newAcc, 'INSERT');
            return newAcc.id;
        },
        updateBankAccount: async (d) => {
            const cleanData = sanitizePayloadForTable('bank_accounts', d);
            setBankAccounts(prev => prev.map(a => a.id === d.id ? { ...a, ...cleanData } : a));
            const { error } = await supabase.from('bank_accounts').update(sanitizePayloadForTable('bank_accounts', cleanData)).eq('id', d.id);
            if (error) { if (isNetworkError(error)) {
              addToSyncQueue({ table: 'bank_accounts', action: 'update', payload: d }).catch(console.error);
              try {
                setBankAccounts(prev => prev.map(item => (item._stable_id === d.id || item.id === d.id) ? { ...item, pending_sync: true } as any : item));
              } catch (_e) {} return;
            } else {
              console.error("Failed to update bank account:", error);
                            throw error;
            } }
            await refreshGlobalData();
            broadcastChange('bank_accounts', cleanData, 'UPDATE');
        },
        deleteBankAccount: async (id) => {
            try {
                setBankAccounts(prev => prev.filter(a => a.id !== id));
                await supabase.from('bank_accounts').delete().eq('id', id);
                await refreshGlobalData();
                broadcastChange('bank_accounts', { id }, 'DELETE');
                return true;
            } catch (error) { if (isNetworkError(error)) { await addToSyncQueue({ table: 'bank_accounts', action: 'delete', payload: {}, recordId: id }); } else { throw error; } }
        },
        bankTransactions,
        addBankTransaction: async (d) => {
            const stableId = generateStableId();
            const optimisticTx = { ...d, id: stableId, _stable_id: stableId, created_at: new Date().toISOString() } as BankTransaction;
            setBankTransactions(prev => [optimisticTx, ...prev]);
            const { data: newTx, error } = await supabase.from('bank_transactions').insert([sanitizePayloadForTable('bank_transactions', {...d, user_id: effectiveUserId})]).select().single();
            if (error) { if (isNetworkError(error)) {
              addToSyncQueue({ table: 'bank_transactions', action: 'insert', payload: d }).catch(console.error);
              try {
                setBankTransactions(prev => prev.map(item => (item._stable_id === stableId || item.id === stableId) ? { ...item, pending_sync: true } as any : item));
              } catch (_e) {} return;
            } else {
              setBankTransactions(prev => prev.filter(t => t._stable_id !== stableId)); throw error;
            } }
            setBankTransactions(prev => prev.map(t => t._stable_id === stableId ? { ...newTx, _stable_id: stableId } : t));
            await refreshGlobalData();
            broadcastChange('bank_transactions', newTx, 'INSERT');
        },
        updateBankTransaction: async (d) => {
            const cleanData = sanitizePayloadForTable('bank_transactions', d);
            setBankTransactions(prev => prev.map(t => t.id === d.id ? { ...t, ...cleanData } : t));
            const { error } = await supabase.from('bank_transactions').update(sanitizePayloadForTable('bank_transactions', cleanData)).eq('id', d.id);
            if (error) { if (isNetworkError(error)) {
              addToSyncQueue({ table: 'bank_transactions', action: 'update', payload: d }).catch(console.error);
              try {
                setBankTransactions(prev => prev.map(item => (item._stable_id === d.id || item.id === d.id) ? { ...item, pending_sync: true } as any : item));
              } catch (_e) {} return;
            } else {
              console.error("Failed to update bank transaction:", error);
                            throw error;
            } }
            await refreshGlobalData();
            broadcastChange('bank_transactions', cleanData, 'UPDATE');
        },
        deleteBankTransaction: async (id) => {
            try {
                setBankTransactions(prev => prev.filter(t => t.id !== id));
                await supabase.from('bank_transactions').delete().eq('id', id);
                await refreshGlobalData();
                broadcastChange('bank_transactions', { id }, 'DELETE');
            } catch (error) { if (isNetworkError(error)) { await addToSyncQueue({ table: 'bank_transactions', action: 'delete', payload: {}, recordId: id }); } else { throw error; } }
        },
        partnerDebts,
        addPartnerDebt: async (d) => {
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

            recentlyAddedIds.current.add(stableId);
            markLocalAction(stableId);
            setPartnerDebts(prev => [optimisticDebt, ...prev]);

            try {
                const { data: newDebt, error } = await supabase.from('partner_debts').insert([sanitizePayloadForTable('partner_debts', { ...dbPayload, user_id: effectiveUserId })]).select().single();
                if (error) { if (isNetworkError(error)) {
                  addToSyncQueue({ table: 'partner_debts', action: 'insert', payload: d }).catch(console.error);
                  try {
                    setPartnerDebts(prev => prev.map(item => (item._stable_id === stableId || item.id === stableId) ? { ...item, pending_sync: true } as any : item));
                  } catch (_e) {} return;
                } else {
                  setPartnerDebts(prev => prev.filter(item => item._stable_id !== stableId));
                                    throw error;
                } }
                if (newDebt) {
                    setPartnerDebts(prev => prev.map(item => item._stable_id === stableId ? { ...item, ...newDebt, _stable_id: newDebt.id } as unknown as PartnerDebt : item));
                    broadcastChange('partner_debts', newDebt, 'INSERT');
                }
            } catch (err) {
        if (isNetworkError(err)) {
          await addToSyncQueue({ table: 'partner_debts', action: 'insert', payload: d });
          try {
            setPartnerDebts(prev => prev.map(item => (item._stable_id === stableId || item.id === stableId) ? { ...item, pending_sync: true } as any : item));
          } catch (_e) {} return;
        } else {
          console.error("Failed to add partner debt:", err);
                        throw err;
        }
        }
            await refreshGlobalData();
        },
        updatePartnerDebt: async (d) => {
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
            if (error) { if (isNetworkError(error)) {
              addToSyncQueue({ table: 'partner_debts', action: 'update', payload: d }).catch(console.error);
              try {
                setPartnerDebts(prev => prev.map(item => (item._stable_id === d.id || item.id === d.id) ? { ...item, pending_sync: true } as any : item));
              } catch (_e) {} return;
            } else {
              console.error("Failed to update partner debt:", error);
                            throw error;
            } }
            await refreshGlobalData();
            broadcastChange('partner_debts', cleanData, 'UPDATE');
        },
        deletePartnerDebt: async (id) => {
            setPartnerDebts(prev => prev.filter(item => item.id !== id));
            const { error } = await supabase.from('partner_debts').delete().eq('id', id);
            if (error) { if (isNetworkError(error)) {
              addToSyncQueue({ table: 'partner_debts', action: 'delete', payload: {}, recordId: id }).catch(console.error);
            } else {
              console.error("Failed to delete partner debt:", error);
                            throw error;
            } }
            await refreshGlobalData();
            broadcastChange('partner_debts', { id }, 'DELETE');
        },
        settings, updateSettings,
        profile,
        broadcastChange,
        setActiveItem,
        deleteAllUserData: async () => { await supabase.rpc('delete_user_data'); window.location.reload(); }
        };
        return val;
    }, [
        refreshGlobalData,
        broadcastChange,
        hydratedInvoices,
        invoices,
        invoicePriceItems,
        invoiceDeductions,
        advances,
        hydratedAdvances,
        effectiveUserId,
        partnerDebts,
        lastInvoiceAddedId,
        dailyLogs,
        cycles,
        cyclesWithCalculations,
        hydratedExpenses,
        rawExpensesHydrated,
        expenses,
        expenseCategories,
        filteredExpenseCategories,
        isExternalLabor,
        lastExpenseAddedId,
        lastCycleAddedId,
        getCycleTotalBalance,
        getCycleCashBalance,
        hydratedPersons,
        activePersons,
        persons,
        settings,
        updateSettings,
        virtualMembers,
        lastAdvanceAddedId,
        suppliers,
        lastSupplierAddedId,
        supplierPayments,
        farmers,
        lastFarmerAddedId,
        farmerWithdrawals,
        lastExpenseCategoryAddedId,
        assets,
        totalRevenue,
        totalNetRevenue,
        totalExpenses,
        ownerNetProfit,
        totalFarmerShare,
        treasuryFunds,
        bankAccounts,
        bankTransactions,
        profile,
        setActiveItem
    ]);

    return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
};

export const useData = () => {
    const context = useContext(DataContext);
    if (!context) throw new Error('useData must be used within DataProvider');
    return context;
};
