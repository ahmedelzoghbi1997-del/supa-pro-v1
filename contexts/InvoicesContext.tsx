import React, { createContext, useContext, useState, useMemo, useCallback, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { sanitizePayloadForTable } from '../lib/payloadWhitelist';
import { addToSyncQueue, isNetworkError } from '../lib/syncQueue';
import { generateStableId } from '../lib/dataCache';
import { markLocalAction } from '../lib/recentActions';
import type { Invoice, InvoiceInput, InvoicePriceItem, InvoiceDeductionItem, Cycle } from '../types';

export interface InvoicesContextType {
  invoices: Invoice[];
  invoicePriceItems: InvoicePriceItem[];
  invoiceDeductions: InvoiceDeductionItem[];
  lastInvoiceAddedId: string | null;
  setLastInvoiceAddedId: (id: string | null) => void;
  addInvoice: (data: InvoiceInput) => Promise<void>;
  updateInvoice: (data: Invoice) => Promise<void>;
  deleteInvoice: (id: string) => Promise<void>;
  setInvoices: React.Dispatch<React.SetStateAction<Invoice[]>>;
  setInvoicePriceItems: React.Dispatch<React.SetStateAction<InvoicePriceItem[]>>;
  setInvoiceDeductions: React.Dispatch<React.SetStateAction<InvoiceDeductionItem[]>>;
}

export const InvoicesContext = createContext<InvoicesContextType | undefined>(undefined);

export const useInvoicesData = (): InvoicesContextType => {
  const context = useContext(InvoicesContext);
  if (!context) {
    throw new Error('useInvoicesData must be used within an InvoicesProvider or DataProvider');
  }
  return context;
};

interface InvoicesProviderProps {
  children: ReactNode;
  effectiveUserId?: string;
  cycles?: Cycle[];
  partnerDebts?: any[];
  refreshGlobalData?: () => Promise<void>;
  broadcastChange?: (table: string, record: any, eventType?: 'INSERT' | 'UPDATE' | 'DELETE', oldRecord?: any) => void;
  recentlyAddedIdsRef?: React.MutableRefObject<Set<string>>;
  invoices?: Invoice[];
  setInvoices?: React.Dispatch<React.SetStateAction<Invoice[]>>;
  invoicePriceItems?: InvoicePriceItem[];
  setInvoicePriceItems?: React.Dispatch<React.SetStateAction<InvoicePriceItem[]>>;
  invoiceDeductions?: InvoiceDeductionItem[];
  setInvoiceDeductions?: React.Dispatch<React.SetStateAction<InvoiceDeductionItem[]>>;
  value?: InvoicesContextType;
}

export const InvoicesProvider: React.FC<InvoicesProviderProps> = ({
  children,
  effectiveUserId = '',
  cycles = [],
  partnerDebts = [],
  refreshGlobalData,
  broadcastChange,
  recentlyAddedIdsRef,
  invoices: propsInvoices,
  setInvoices: propsSetInvoices,
  invoicePriceItems: propsInvoicePriceItems,
  setInvoicePriceItems: propsSetInvoicePriceItems,
  invoiceDeductions: propsInvoiceDeductions,
  setInvoiceDeductions: propsSetInvoiceDeductions,
  value: controlledValue
}) => {
  const [internalInvoices, setInternalInvoices] = useState<Invoice[]>([]);
  const [internalInvoicePriceItems, setInternalInvoicePriceItems] = useState<InvoicePriceItem[]>([]);
  const [internalInvoiceDeductions, setInternalInvoiceDeductions] = useState<InvoiceDeductionItem[]>([]);
  const [lastInvoiceAddedId, setLastInvoiceAddedId] = useState<string | null>(null);

  const invoices = propsInvoices !== undefined ? propsInvoices : internalInvoices;
  const setInvoices = propsSetInvoices || setInternalInvoices;
  const invoicePriceItems = propsInvoicePriceItems !== undefined ? propsInvoicePriceItems : internalInvoicePriceItems;
  const setInvoicePriceItems = propsSetInvoicePriceItems || setInternalInvoicePriceItems;
  const invoiceDeductions = propsInvoiceDeductions !== undefined ? propsInvoiceDeductions : internalInvoiceDeductions;
  const setInvoiceDeductions = propsSetInvoiceDeductions || setInternalInvoiceDeductions;

  const hydratedInvoices = useMemo(() => invoices.map(inv => {
    const isRetained = inv.is_retained_debt || 
        Boolean(inv.description?.includes('[مرصودة]')) || 
        Boolean(inv.description?.includes('[RETAINED_DEBT]'));
    const invIdStr = String(inv.id);
    const stableIdStr = inv._stable_id ? String(inv._stable_id) : null;
    return {
        ...inv,
        cycle: inv.cycle || cycles.find(c => String(c.id) === String(inv.cycle_id))?.name || '...',
        is_retained_debt: isRetained,
        source_type: 'invoice' as const,
        source_ref_id: inv.source_ref_id || inv.id,
        price_items: invoicePriceItems.filter(item => String(item.invoice_id) === invIdStr || (stableIdStr && String(item.invoice_id) === stableIdStr)),
        deductions: invoiceDeductions.filter(item => String(item.invoice_id) === invIdStr || (stableIdStr && String(item.invoice_id) === stableIdStr))
    };
  }), [invoices, cycles, invoicePriceItems, invoiceDeductions]);

  const addInvoice = useCallback(async (data: InvoiceInput) => {
    const isRetained = data.description?.includes('[مرصودة]') || data.description?.includes('[RETAINED_DEBT]');
    const _invoiceData = { ...data, isRetained };

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
        await addToSyncQueue({ 
            table: 'invoices', 
            action: 'insert', 
            payload: { ...inv, id: stableId, user_id: effectiveUserId } 
        });
        if (price_items && price_items.length > 0) {
            for (const pi of price_items) {
                const { id: _unused_id, invoice_id: _unused_inv_id, ...cleanPrice } = pi as any;
                await addToSyncQueue({
                    table: 'invoice_price_items',
                    action: 'insert',
                    payload: { ...cleanPrice, invoice_id: stableId, user_id: effectiveUserId }
                });
            }
        }
        if (deductions && deductions.length > 0) {
            for (const ded of deductions) {
                const { id: _unused_id, invoice_id: _unused_inv_id, ...cleanDed } = ded as any;
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
        const { data: newInv, error } = await supabase.from('invoices').insert([sanitizePayloadForTable('invoices', { ...inv, id: stableId, user_id: effectiveUserId })]).select().single();
        if (error) { 
            if (isNetworkError(error)) {
                await queueOfflineInvoice();
                return;
            } else {
                throw error;
            } 
        }
        
        const realPricesPromise = price_items?.length ? supabase.from('invoice_price_items').insert(price_items.map((i) => ({ ...i, invoice_id: newInv.id, user_id: effectiveUserId }))).select() : Promise.resolve({data:[]});
        const realDedsPromise = deductions?.length ? supabase.from('invoice_deductions').insert(deductions.map((d) => ({ ...d, invoice_id: newInv.id, user_id: effectiveUserId }))).select() : Promise.resolve({data:[]});
        
        const [pricesRes, dedsRes] = await Promise.all([realPricesPromise, realDedsPromise]);
        
        if (recentlyAddedIdsRef?.current) {
            recentlyAddedIdsRef.current.add(newInv.id);
            setTimeout(() => recentlyAddedIdsRef.current?.delete(newInv.id), 10000);
        }
        markLocalAction(newInv.id);
        markLocalAction(stableId);

        setInvoicePriceItems(prev => [...prev.filter(p => p.invoice_id !== stableId), ...(pricesRes.data || [])]);
        setInvoiceDeductions(prev => [...prev.filter(d => d.invoice_id !== stableId), ...(dedsRes.data || [])]);
        
        setInvoices(prev => prev.map(i => i._stable_id === stableId ? { ...newInv, _stable_id: stableId, cycle: cycleName, created_at: optimisticCreatedAt } : i));

        // Retained debt handling
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

                for (const item of items) {
                  const { debtId, allocations } = item;
                  for (const partnerId of Object.keys(allocations)) {
                    const amount = parseFloat(allocations[partnerId] as any);
                    if (amount > 0) {
                        let finalReason = `سداد جزء من دين المعلم [EXTERNAL_DEBT] [INVOICE_REPAYMENT:${newInv.id}]`;
                        if (debtId) {
                            const linkedDebt = (partnerDebts || []).find((d: any) => d.id === debtId);
                            const debtDesc = linkedDebt ? linkedDebt.description : 'دين مشترك';
                            finalReason = `سداد جزء من الدين المشترك: ${debtDesc} [PARTNER_DEBT_PAYMENT:${debtId}] [INVOICE_REPAYMENT:${newInv.id}]`;
                        }

                        const dbPayload = {
                            person_id: partnerId,
                            amount: -amount,
                            date: inv.date,
                            cycle_id: inv.cycle_id,
                            reason: finalReason,
                            user_id: effectiveUserId,
                            source_ref_id: newInv.id,
                            source_type: 'invoice',
                            is_retained_debt: true
                        };
                        await supabase.from('advances').insert([dbPayload]);
                    }
                  }
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

        if (refreshGlobalData) await refreshGlobalData();
        if (broadcastChange && newInv) {
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
  }, [cycles, effectiveUserId, partnerDebts, refreshGlobalData, broadcastChange, recentlyAddedIdsRef]);

  const updateInvoice = useCallback(async (d: Invoice) => {
    const isRetained = d.description?.includes('[مرصودة]') || d.description?.includes('[RETAINED_DEBT]');
    const _invoiceData = { ...d, isRetained };

    const { price_items, deductions, _stable_id: _unused_stable_id, cycle: _unused_cycle, ...cleanData } = d;
    const invoiceId = d.id;

    setInvoices(prev => prev.map(inv => inv.id === invoiceId ? { ...inv, ...cleanData } : inv));
    
    const tempPrices = (price_items || []).map((pi) => ({ ...pi, invoice_id: invoiceId, user_id: effectiveUserId })) as InvoicePriceItem[];
    const tempDeds = (deductions || []).map((ded) => ({ ...ded, invoice_id: invoiceId, user_id: effectiveUserId })) as InvoiceDeductionItem[];
    
    setInvoicePriceItems(prev => [...prev.filter(p => p.invoice_id !== invoiceId), ...tempPrices]);
    setInvoiceDeductions(prev => [...prev.filter(ded => ded.invoice_id !== invoiceId), ...tempDeds]);

    const allowedKeys = [
        'id', 'user_id', 'description', 'date', 'cycle_id', 'market',
        'packaging_type', 'packaging_count', 'carton_count', 'cage_count', 'created_at'
    ];
    const finalUpdateData: any = {};
    for (const key of allowedKeys) {
        if (key in cleanData) {
            finalUpdateData[key] = (cleanData as any)[key];
        }
    }

    try {
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
                const { id: _unused_id, invoice_id: _unused_invoice_id, user_id: _unused_user_id, ...cleanItem } = i as any;
                return { ...cleanItem, invoice_id: invoiceId, user_id: effectiveUserId };
            })).select() 
            : Promise.resolve({ data: [] });

        const realDedsPromise = deductions?.length 
            ? supabase.from('invoice_deductions').insert(deductions.map((ded) => {
                const { id: _unused_id, invoice_id: _unused_invoice_id, user_id: _unused_user_id, ...cleanDed } = ded as any;
                return { ...cleanDed, invoice_id: invoiceId, user_id: effectiveUserId };
            })).select() 
            : Promise.resolve({ data: [] });

        const [pricesRes, dedsRes] = await Promise.all([realPricesPromise, realDedsPromise]);

        setInvoicePriceItems(prev => [...prev.filter(p => p.invoice_id !== invoiceId), ...(pricesRes.data || [])]);
        setInvoiceDeductions(prev => [...prev.filter(ded => ded.invoice_id !== invoiceId), ...(dedsRes.data || [])]);

        // Clean & recreate advances
        await supabase.from('advances').delete().ilike('reason', `%[INVOICE_REPAYMENT:${invoiceId}]%`);

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

                for (const item of items) {
                  const { debtId, allocations } = item;
                  for (const partnerId of Object.keys(allocations)) {
                    const amount = parseFloat(allocations[partnerId] as any);
                    if (amount > 0) {
                        let finalReason = `سداد جزء من دين المعلم [EXTERNAL_DEBT] [INVOICE_REPAYMENT:${invoiceId}]`;
                        if (debtId) {
                            const linkedDebt = (partnerDebts || []).find((d: any) => d.id === debtId);
                            const debtDesc = linkedDebt ? linkedDebt.description : 'دين مشترك';
                            finalReason = `سداد جزء من الدين المشترك: ${debtDesc} [PARTNER_DEBT_PAYMENT:${debtId}] [INVOICE_REPAYMENT:${invoiceId}]`;
                        }

                        const dbPayload = {
                            person_id: partnerId,
                            amount: -amount,
                            date: cleanData.date,
                            cycle_id: cleanData.cycle_id,
                            reason: finalReason,
                            user_id: effectiveUserId,
                            source_ref_id: invoiceId,
                            source_type: 'invoice',
                            is_retained_debt: true
                        };
                        await supabase.from('advances').insert([dbPayload]);
                    }
                  }
                }
            } catch (jsonErr) {
                if (isNetworkError(jsonErr)) {
                    await addToSyncQueue({ table: 'invoices', action: 'update', payload: d });
                    try {
                        setInvoices(prev => prev.map(item => (item._stable_id === invoiceId || item.id === invoiceId) ? { ...item, pending_sync: true } as any : item));
                    } catch (_e) {} 
                    return;
                }
            }
        }

        if (refreshGlobalData) await refreshGlobalData();
        if (broadcastChange) broadcastChange('invoices', { ...d, ...finalUpdateData, id: invoiceId }, 'UPDATE');

    } catch (error) {
        if (isNetworkError(error)) {
            await addToSyncQueue({ table: 'invoices', action: 'update', payload: d });
            try {
                setInvoices(prev => prev.map(item => (item._stable_id === invoiceId || item.id === invoiceId) ? { ...item, pending_sync: true } as any : item));
            } catch (_e) {} 
            return;
        } else {
            console.error("Update Invoice Error:", error);
            throw error;
        }
    }
  }, [effectiveUserId, partnerDebts, refreshGlobalData, broadcastChange]);

  const deleteInvoice = useCallback(async (id: string) => {
    setInvoices(prev => prev.filter(inv => inv.id !== id));
    setInvoicePriceItems(prev => prev.filter(p => p.invoice_id !== id));
    setInvoiceDeductions(prev => prev.filter(d => d.invoice_id !== id));
    
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
    if (refreshGlobalData) await refreshGlobalData();
    if (broadcastChange) broadcastChange('invoices', { id }, 'DELETE');
  }, [refreshGlobalData, broadcastChange]);

  const internalValue: InvoicesContextType = useMemo(() => ({
    invoices: hydratedInvoices,
    invoicePriceItems,
    invoiceDeductions,
    lastInvoiceAddedId,
    setLastInvoiceAddedId,
    addInvoice,
    updateInvoice,
    deleteInvoice,
    setInvoices,
    setInvoicePriceItems,
    setInvoiceDeductions
  }), [
    hydratedInvoices,
    invoicePriceItems,
    invoiceDeductions,
    lastInvoiceAddedId,
    addInvoice,
    updateInvoice,
    deleteInvoice
  ]);

  return (
    <InvoicesContext.Provider value={controlledValue || internalValue}>
      {children}
    </InvoicesContext.Provider>
  );
};
