import React, { createContext, useContext, useState, useMemo, useCallback, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { sanitizePayloadForTable } from '../lib/payloadWhitelist';
import { addToSyncQueue, isNetworkError } from '../lib/syncQueue';
import { generateStableId } from '../lib/dataCache';
import { markLocalAction } from '../lib/recentActions';
import type { 
    Person, 
    VirtualMember, 
    Advance, 
    Supplier, 
    SupplierPayment, 
    Farmer, 
    FarmerWithdrawal,
    AppSettings
} from '../types';

export interface PersonsContextType {
  persons: Person[];
  activePersons: Person[];
  virtualMembers: VirtualMember[];
  addPerson: (name: string, virtual_id?: string | null, percentage?: number) => Promise<Person | null>;
  updatePerson: (id: string, name: string, virtual_id?: string | null, percentage?: number) => Promise<boolean>;
  deletePerson: (id: string) => Promise<boolean>;
  advances: Advance[];
  addAdvance: (data: Omit<Advance, 'id' | 'created_at' | 'user_id' | '_stable_id'>) => Promise<void>;
  updateAdvance: (data: Advance) => Promise<void>;
  deleteAdvance: (id: string) => Promise<void>;
  lastAdvanceAddedId: string | null;
  setLastAdvanceAddedId: (id: string | null) => void;
  suppliers: Supplier[];
  addSupplier: (name: string, opening_balance?: number) => Promise<void>;
  updateSupplier: (supplier: Supplier) => Promise<void>;
  deleteSupplier: (id: string) => Promise<boolean>;
  lastSupplierAddedId: string | null;
  setLastSupplierAddedId: (id: string | null) => void;
  supplierPayments: SupplierPayment[];
  addSupplierPayment: (payment: Omit<SupplierPayment, 'id' | 'created_at' | 'user_id' | '_stable_id'>) => Promise<void>;
  updateSupplierPayment: (payment: SupplierPayment) => Promise<void>;
  deleteSupplierPayment: (id: string) => Promise<void>;
  farmers: Farmer[];
  addFarmer: (name: string) => Promise<void>;
  updateFarmer: (farmer: Farmer) => Promise<void>;
  deleteFarmer: (id: string) => Promise<boolean>;
  lastFarmerAddedId: string | null;
  setLastFarmerAddedId: (id: string | null) => void;
  farmerWithdrawals: FarmerWithdrawal[];
  addFarmerWithdrawal: (withdrawal: Omit<FarmerWithdrawal, 'id' | 'created_at' | 'user_id' | '_stable_id'>) => Promise<void>;
  updateFarmerWithdrawal: (withdrawal: FarmerWithdrawal) => Promise<void>;
  deleteFarmerWithdrawal: (id: string) => Promise<void>;
  setPersons: React.Dispatch<React.SetStateAction<Person[]>>;
  setVirtualMembers: React.Dispatch<React.SetStateAction<VirtualMember[]>>;
  setAdvances: React.Dispatch<React.SetStateAction<Advance[]>>;
  setSuppliers: React.Dispatch<React.SetStateAction<Supplier[]>>;
  setSupplierPayments: React.Dispatch<React.SetStateAction<SupplierPayment[]>>;
  setFarmers: React.Dispatch<React.SetStateAction<Farmer[]>>;
  setFarmerWithdrawals: React.Dispatch<React.SetStateAction<FarmerWithdrawal[]>>;
}

export const PersonsContext = createContext<PersonsContextType | undefined>(undefined);

export const usePersonsData = (): PersonsContextType => {
  const context = useContext(PersonsContext);
  if (!context) {
    throw new Error('usePersonsData must be used within a PersonsProvider or DataProvider');
  }
  return context;
};

interface PersonsProviderProps {
  children: ReactNode;
  effectiveUserId?: string;
  settings?: AppSettings;
  updateSettings?: (newSettings: Partial<AppSettings>) => void;
  refreshGlobalData?: () => Promise<void>;
  broadcastChange?: (table: string, record: any, eventType?: 'INSERT' | 'UPDATE' | 'DELETE', oldRecord?: any) => void;
  recentlyAddedIdsRef?: React.MutableRefObject<Set<string>>;
  persons?: Person[];
  setPersons?: React.Dispatch<React.SetStateAction<Person[]>>;
  virtualMembers?: VirtualMember[];
  setVirtualMembers?: React.Dispatch<React.SetStateAction<VirtualMember[]>>;
  advances?: Advance[];
  setAdvances?: React.Dispatch<React.SetStateAction<Advance[]>>;
  suppliers?: Supplier[];
  setSuppliers?: React.Dispatch<React.SetStateAction<Supplier[]>>;
  supplierPayments?: SupplierPayment[];
  setSupplierPayments?: React.Dispatch<React.SetStateAction<SupplierPayment[]>>;
  farmers?: Farmer[];
  setFarmers?: React.Dispatch<React.SetStateAction<Farmer[]>>;
  farmerWithdrawals?: FarmerWithdrawal[];
  setFarmerWithdrawals?: React.Dispatch<React.SetStateAction<FarmerWithdrawal[]>>;
  value?: PersonsContextType;
}

export const PersonsProvider: React.FC<PersonsProviderProps> = ({
  children,
  effectiveUserId = '',
  settings,
  updateSettings,
  refreshGlobalData,
  broadcastChange,
  recentlyAddedIdsRef,
  persons: propsPersons,
  setPersons: propsSetPersons,
  virtualMembers: propsVirtualMembers,
  setVirtualMembers: propsSetVirtualMembers,
  advances: propsAdvances,
  setAdvances: propsSetAdvances,
  suppliers: propsSuppliers,
  setSuppliers: propsSetSuppliers,
  supplierPayments: propsSupplierPayments,
  setSupplierPayments: propsSetSupplierPayments,
  farmers: propsFarmers,
  setFarmers: propsSetFarmers,
  farmerWithdrawals: propsFarmerWithdrawals,
  setFarmerWithdrawals: propsSetFarmerWithdrawals,
  value: controlledValue
}) => {
  const [internalPersons, setInternalPersons] = useState<Person[]>([]);
  const [internalVirtualMembers, setInternalVirtualMembers] = useState<VirtualMember[]>([]);
  const [internalAdvances, setInternalAdvances] = useState<Advance[]>([]);
  const [internalSuppliers, setInternalSuppliers] = useState<Supplier[]>([]);
  const [internalSupplierPayments, setInternalSupplierPayments] = useState<SupplierPayment[]>([]);
  const [internalFarmers, setInternalFarmers] = useState<Farmer[]>([]);
  const [internalFarmerWithdrawals, setInternalFarmerWithdrawals] = useState<FarmerWithdrawal[]>([]);

  const persons = propsPersons !== undefined ? propsPersons : internalPersons;
  const setPersons = propsSetPersons || setInternalPersons;
  const virtualMembers = propsVirtualMembers !== undefined ? propsVirtualMembers : internalVirtualMembers;
  const setVirtualMembers = propsSetVirtualMembers || setInternalVirtualMembers;
  const advances = propsAdvances !== undefined ? propsAdvances : internalAdvances;
  const setAdvances = propsSetAdvances || setInternalAdvances;
  const suppliers = propsSuppliers !== undefined ? propsSuppliers : internalSuppliers;
  const setSuppliers = propsSetSuppliers || setInternalSuppliers;
  const supplierPayments = propsSupplierPayments !== undefined ? propsSupplierPayments : internalSupplierPayments;
  const setSupplierPayments = propsSetSupplierPayments || setInternalSupplierPayments;
  const farmers = propsFarmers !== undefined ? propsFarmers : internalFarmers;
  const setFarmers = propsSetFarmers || setInternalFarmers;
  const farmerWithdrawals = propsFarmerWithdrawals !== undefined ? propsFarmerWithdrawals : internalFarmerWithdrawals;
  const setFarmerWithdrawals = propsSetFarmerWithdrawals || setInternalFarmerWithdrawals;

  const [lastAdvanceAddedId, setLastAdvanceAddedId] = useState<string | null>(null);
  const [lastSupplierAddedId, setLastSupplierAddedId] = useState<string | null>(null);
  const [lastFarmerAddedId, setLastFarmerAddedId] = useState<string | null>(null);

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
        const person = hydratedPersons.find(p => String(p.id) === String(a.person_id));
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

  const addPerson = useCallback(async (name: string, virtual_id: string | null = null, percentage = 0): Promise<Person | null> => {
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
    
    if (updateSettings && settings) {
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
    }

    if (refreshGlobalData) await refreshGlobalData();
    if (broadcastChange) broadcastChange('persons', newData, 'INSERT');
    return newData;
  }, [effectiveUserId, settings, updateSettings, refreshGlobalData, broadcastChange]);

  const updatePerson = useCallback(async (id: string, name: string, virtual_id: string | null = null, percentage = 0): Promise<boolean> => {
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

    if (updateSettings && settings) {
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
    }

    if (refreshGlobalData) await refreshGlobalData();
    if (broadcastChange) broadcastChange('persons', { id, name }, 'UPDATE');
    return true;
  }, [settings, updateSettings, refreshGlobalData, broadcastChange]);

  const deletePerson = useCallback(async (id: string): Promise<boolean> => {
    setPersons(prev => prev.filter(p => p.id !== id));
    if (updateSettings && settings) {
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
    }

    try {
        const { error } = await supabase.from('persons').delete().eq('id', id);
        if (error) throw error;
        if (refreshGlobalData) await refreshGlobalData();
        if (broadcastChange) broadcastChange('persons', { id }, 'DELETE');
        return true;
    } catch (error) {
        if (isNetworkError(error)) {
            await addToSyncQueue({ table: 'persons', action: 'delete', payload: {}, recordId: id });
            return true;
        } else {
            throw error;
        }
    }
  }, [settings, updateSettings, refreshGlobalData, broadcastChange]);

  const addAdvance = useCallback(async (d: Omit<Advance, 'id' | 'created_at' | 'user_id' | '_stable_id'>) => {
    const stableId = generateStableId();
    let finalReason = d.reason || '';
    if (d.funding_source === 'external_debt' && !finalReason.includes('[EXTERNAL_DEBT]')) {
        finalReason = `${finalReason} [EXTERNAL_DEBT]`.trim();
    }

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
    if (error) { 
        if (isNetworkError(error)) {
            addToSyncQueue({ table: 'advances', action: 'insert', payload: d }).catch(console.error);
            try {
                setAdvances(prev => prev.map(item => (item._stable_id === stableId || item.id === stableId) ? { ...item, pending_sync: true } as any : item));
            } catch (_e) {} 
            return;
        } else {
            setAdvances(prev => prev.filter(a => a._stable_id !== stableId)); 
            throw error;
        } 
    }

    if (recentlyAddedIdsRef?.current) {
        recentlyAddedIdsRef.current.add(newAdv.id);
        setTimeout(() => recentlyAddedIdsRef.current?.delete(newAdv.id), 10000);
    }
    markLocalAction(newAdv.id);
    markLocalAction(stableId);

    setAdvances(prev => prev.map(a => a._stable_id === stableId ? { ...newAdv, _stable_id: stableId } : a));
    if (refreshGlobalData) await refreshGlobalData();
    if (broadcastChange) broadcastChange('advances', newAdv, 'INSERT');
  }, [effectiveUserId, refreshGlobalData, broadcastChange, recentlyAddedIdsRef]);

  const updateAdvance = useCallback(async (d: Advance) => {
    let finalReason = d.reason || '';
    if (d.funding_source === 'external_debt' && !finalReason.includes('[EXTERNAL_DEBT]')) {
        finalReason = `${finalReason} [EXTERNAL_DEBT]`.trim();
    } else if (d.funding_source !== 'external_debt' && finalReason.includes('[EXTERNAL_DEBT]')) {
        finalReason = finalReason.replace('[EXTERNAL_DEBT]', '').trim();
    }

    const cleanData = sanitizePayloadForTable('advances', d);
    delete (cleanData as any).funding_source;
    cleanData.reason = finalReason;

    setAdvances(prev => prev.map(a => a.id === d.id ? { ...a, ...cleanData } : a));
    const { error } = await supabase.from('advances').update(sanitizePayloadForTable('advances', cleanData)).eq('id', d.id);
    if (error) { 
        if (isNetworkError(error)) {
            addToSyncQueue({ table: 'advances', action: 'update', payload: d }).catch(console.error);
            try {
                setAdvances(prev => prev.map(item => (item._stable_id === d.id || item.id === d.id) ? { ...item, pending_sync: true } as any : item));
            } catch (_e) {} 
            return;
        } else {
            console.error("Failed to update advance:", error);
            throw error;
        } 
    }
    if (refreshGlobalData) await refreshGlobalData();
    if (broadcastChange) broadcastChange('advances', cleanData, 'UPDATE');
  }, [refreshGlobalData, broadcastChange]);

  const deleteAdvance = useCallback(async (id: string) => {
    try {
        setAdvances(prev => prev.filter(a => a.id !== id));
        await supabase.from('advances').delete().eq('id', id);
        if (refreshGlobalData) await refreshGlobalData();
        if (broadcastChange) broadcastChange('advances', { id }, 'DELETE');
    } catch (error) { 
        if (isNetworkError(error)) { 
            await addToSyncQueue({ table: 'advances', action: 'delete', payload: {}, recordId: id }); 
        } else { 
            throw error; 
        } 
    }
  }, [refreshGlobalData, broadcastChange]);

  const addSupplier = useCallback(async (name: string, opening_balance = 0) => {
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
        if (recentlyAddedIdsRef?.current) {
            recentlyAddedIdsRef.current.add(data.id);
            setTimeout(() => recentlyAddedIdsRef.current?.delete(data.id), 10000);
        }
        markLocalAction(data.id);
        markLocalAction(stableId);

        setSuppliers(prev => prev.map(s => s._stable_id === stableId ? { ...data, _stable_id: stableId } : s));
        setLastSupplierAddedId(data.id);
    }
    if (refreshGlobalData) await refreshGlobalData();
    if (broadcastChange && data) broadcastChange('suppliers', data, 'INSERT');
  }, [effectiveUserId, refreshGlobalData, broadcastChange, recentlyAddedIdsRef]);

  const updateSupplier = useCallback(async (supplier: Supplier) => {
    const { _stable_id: _unused_sid, ...cleanData } = supplier;
    const { error } = await supabase.from('suppliers').update(sanitizePayloadForTable('suppliers', cleanData)).eq('id', supplier.id);
    if (error) { 
        if (isNetworkError(error)) {
            addToSyncQueue({ table: 'suppliers', action: 'update', payload: supplier }).catch(console.error);
            try {
                setSuppliers(prev => prev.map(item => (item._stable_id === supplier.id || item.id === supplier.id) ? { ...item, pending_sync: true } as any : item));
            } catch (_e) {} 
            return;
        } else {
            throw error;
        } 
    }
    setSuppliers(prev => prev.map(s => s.id === supplier.id ? { ...s, ...cleanData } : s));
    if (refreshGlobalData) await refreshGlobalData();
    if (broadcastChange) broadcastChange('suppliers', cleanData, 'UPDATE');
  }, [refreshGlobalData, broadcastChange]);

  const deleteSupplier = useCallback(async (id: string): Promise<boolean> => {
    try {
        setSuppliers(prev => prev.filter(s => s.id !== id));
        await supabase.from('suppliers').delete().eq('id', id);
        if (refreshGlobalData) await refreshGlobalData();
        if (broadcastChange) broadcastChange('suppliers', { id }, 'DELETE');
        return true;
    } catch (error) { 
        if (isNetworkError(error)) { 
            await addToSyncQueue({ table: 'suppliers', action: 'delete', payload: {}, recordId: id }); 
            return true;
        } else { 
            throw error; 
        } 
    }
  }, [refreshGlobalData, broadcastChange]);

  const addSupplierPayment = useCallback(async (d: Omit<SupplierPayment, 'id' | 'created_at' | 'user_id' | '_stable_id'>) => {
    const stableId = generateStableId();
    const optimisticPay = { ...d, id: stableId, _stable_id: stableId, created_at: new Date().toISOString() } as unknown as SupplierPayment;
    setSupplierPayments(prev => [optimisticPay, ...prev]);
    const { data: newPay, error } = await supabase.from('supplier_payments').insert([sanitizePayloadForTable('supplier_payments', {...d, user_id: effectiveUserId})]).select().single();
    if (error) { 
        if (isNetworkError(error)) {
            addToSyncQueue({ table: 'supplier_payments', action: 'insert', payload: d }).catch(console.error);
            try {
                setSupplierPayments(prev => prev.map(item => (item._stable_id === stableId || item.id === stableId) ? { ...item, pending_sync: true } as any : item));
            } catch (_e) {} 
            return;
        } else {
            setSupplierPayments(prev => prev.filter(p => p._stable_id !== stableId)); 
            throw error;
        } 
    }

    if (recentlyAddedIdsRef?.current) {
        recentlyAddedIdsRef.current.add(newPay.id);
        setTimeout(() => recentlyAddedIdsRef.current?.delete(newPay.id), 10000);
    }
    markLocalAction(newPay.id);
    markLocalAction(stableId);

    setSupplierPayments(prev => prev.map(p => p._stable_id === stableId ? { ...newPay, _stable_id: stableId } : p));
    if (refreshGlobalData) await refreshGlobalData();
    if (broadcastChange) broadcastChange('supplier_payments', newPay, 'INSERT');
  }, [effectiveUserId, refreshGlobalData, broadcastChange, recentlyAddedIdsRef]);

  const updateSupplierPayment = useCallback(async (d: SupplierPayment) => {
    const cleanData = sanitizePayloadForTable('supplier_payments', d);
    setSupplierPayments(prev => prev.map(p => p.id === d.id ? { ...p, ...cleanData } : p));
    const { error } = await supabase.from('supplier_payments').update(sanitizePayloadForTable('supplier_payments', cleanData)).eq('id', d.id);
    if (error) { 
        if (isNetworkError(error)) {
            addToSyncQueue({ table: 'supplier_payments', action: 'update', payload: d }).catch(console.error);
            try {
                setSupplierPayments(prev => prev.map(item => (item._stable_id === d.id || item.id === d.id) ? { ...item, pending_sync: true } as any : item));
            } catch (_e) {} 
            return;
        } else {
            console.error("Failed to update supplier payment:", error);
            throw error;
        } 
    }
    if (refreshGlobalData) await refreshGlobalData();
    if (broadcastChange) broadcastChange('supplier_payments', cleanData, 'UPDATE');
  }, [refreshGlobalData, broadcastChange]);

  const deleteSupplierPayment = useCallback(async (id: string) => {
    try {
        setSupplierPayments(prev => prev.filter(p => p.id !== id));
        await supabase.from('supplier_payments').delete().eq('id', id);
        if (refreshGlobalData) await refreshGlobalData();
        if (broadcastChange) broadcastChange('supplier_payments', { id }, 'DELETE');
    } catch (error) { 
        if (isNetworkError(error)) { 
            await addToSyncQueue({ table: 'supplier_payments', action: 'delete', payload: {}, recordId: id }); 
        } else { 
            throw error; 
        } 
    }
  }, [refreshGlobalData, broadcastChange]);

  const addFarmer = useCallback(async (name: string) => {
    const { data, error } = await supabase.from('farmers').insert([sanitizePayloadForTable('farmers', {name, user_id: effectiveUserId})]).select().single();
    if (!error && data) { 
        setFarmers(prev => [{...data, _stable_id: data.id}, ...prev]); 
        setLastFarmerAddedId(data.id); 
    }
    if (refreshGlobalData) await refreshGlobalData();
    if (broadcastChange && data) broadcastChange('farmers', data, 'INSERT');
  }, [effectiveUserId, refreshGlobalData, broadcastChange]);

  const updateFarmer = useCallback(async (farmer: Farmer) => {
    const { _stable_id: _unused_sid, ...cleanData } = farmer;
    const { error } = await supabase.from('farmers').update(sanitizePayloadForTable('farmers', cleanData)).eq('id', farmer.id);
    if (error) { 
        if (isNetworkError(error)) {
            addToSyncQueue({ table: 'farmers', action: 'update', payload: farmer }).catch(console.error);
            try {
                setFarmers(prev => prev.map(item => (item._stable_id === farmer.id || item.id === farmer.id) ? { ...item, pending_sync: true } as any : item));
            } catch (_e) {} 
            return;
        } else {
            throw error;
        } 
    }
    setFarmers(prev => prev.map(f => f.id === farmer.id ? { ...farmer, _stable_id: farmer.id } : f));
    if (refreshGlobalData) await refreshGlobalData();
    if (broadcastChange) broadcastChange('farmers', cleanData, 'UPDATE');
  }, [refreshGlobalData, broadcastChange]);

  const deleteFarmer = useCallback(async (id: string): Promise<boolean> => {
    try {
        setFarmers(prev => prev.filter(f => f.id !== id));
        await supabase.from('farmers').delete().eq('id', id);
        if (refreshGlobalData) await refreshGlobalData();
        if (broadcastChange) broadcastChange('farmers', { id }, 'DELETE');
        return true;
    } catch (error) { 
        if (isNetworkError(error)) { 
            await addToSyncQueue({ table: 'farmers', action: 'delete', payload: {}, recordId: id }); 
            return true;
        } else { 
            throw error; 
        } 
    }
  }, [refreshGlobalData, broadcastChange]);

  const addFarmerWithdrawal = useCallback(async (d: Omit<FarmerWithdrawal, 'id' | 'created_at' | 'user_id' | '_stable_id'>) => {
    const stableId = generateStableId();
    const optimisticWith = { ...d, id: stableId, _stable_id: stableId, created_at: new Date().toISOString() } as unknown as FarmerWithdrawal;
    setFarmerWithdrawals(prev => [optimisticWith, ...prev]);
    const { data: newWith, error } = await supabase.from('farmer_withdrawals').insert([sanitizePayloadForTable('farmer_withdrawals', {...d, user_id: effectiveUserId})]).select().single();
    if (error) { 
        if (isNetworkError(error)) {
            addToSyncQueue({ table: 'farmer_withdrawals', action: 'insert', payload: d }).catch(console.error);
            try {
                setFarmerWithdrawals(prev => prev.map(item => (item._stable_id === stableId || item.id === stableId) ? { ...item, pending_sync: true } as any : item));
            } catch (_e) {} 
            return;
        } else {
            setFarmerWithdrawals(prev => prev.filter(w => w._stable_id !== stableId)); 
            throw error;
        } 
    }

    if (recentlyAddedIdsRef?.current) {
        recentlyAddedIdsRef.current.add(newWith.id);
        setTimeout(() => recentlyAddedIdsRef.current?.delete(newWith.id), 10000);
    }
    markLocalAction(newWith.id);
    markLocalAction(stableId);

    setFarmerWithdrawals(prev => prev.map(w => w._stable_id === stableId ? { ...newWith, _stable_id: stableId } : w));
    if (refreshGlobalData) await refreshGlobalData();
    if (broadcastChange) broadcastChange('farmer_withdrawals', newWith, 'INSERT');
  }, [effectiveUserId, refreshGlobalData, broadcastChange, recentlyAddedIdsRef]);

  const updateFarmerWithdrawal = useCallback(async (d: FarmerWithdrawal) => {
    const cleanData = sanitizePayloadForTable('farmer_withdrawals', d);
    setFarmerWithdrawals(prev => prev.map(w => w.id === d.id ? { ...w, ...cleanData } : w));
    const { error } = await supabase.from('farmer_withdrawals').update(sanitizePayloadForTable('farmer_withdrawals', cleanData)).eq('id', d.id);
    if (error) { 
        if (isNetworkError(error)) {
            addToSyncQueue({ table: 'farmer_withdrawals', action: 'update', payload: d }).catch(console.error);
            try {
                setFarmerWithdrawals(prev => prev.map(item => (item._stable_id === d.id || item.id === d.id) ? { ...item, pending_sync: true } as any : item));
            } catch (_e) {} 
            return;
        } else {
            console.error("Failed to update farmer withdrawal:", error);
            throw error;
        } 
    }
    if (refreshGlobalData) await refreshGlobalData();
    if (broadcastChange) broadcastChange('farmer_withdrawals', cleanData, 'UPDATE');
  }, [refreshGlobalData, broadcastChange]);

  const deleteFarmerWithdrawal = useCallback(async (id: string) => {
    try {
        setFarmerWithdrawals(prev => prev.filter(w => w.id !== id));
        await supabase.from('farmer_withdrawals').delete().eq('id', id);
        if (refreshGlobalData) await refreshGlobalData();
        if (broadcastChange) broadcastChange('farmer_withdrawals', { id }, 'DELETE');
    } catch (error) { 
        if (isNetworkError(error)) { 
            await addToSyncQueue({ table: 'farmer_withdrawals', action: 'delete', payload: {}, recordId: id }); 
        } else { 
            throw error; 
        } 
    }
  }, [refreshGlobalData, broadcastChange]);

  const internalValue: PersonsContextType = useMemo(() => ({
    persons: hydratedPersons,
    activePersons,
    virtualMembers,
    addPerson,
    updatePerson,
    deletePerson,
    advances: hydratedAdvances,
    addAdvance,
    updateAdvance,
    deleteAdvance,
    lastAdvanceAddedId,
    setLastAdvanceAddedId,
    suppliers,
    addSupplier,
    updateSupplier,
    deleteSupplier,
    lastSupplierAddedId,
    setLastSupplierAddedId,
    supplierPayments,
    addSupplierPayment,
    updateSupplierPayment,
    deleteSupplierPayment,
    farmers,
    addFarmer,
    updateFarmer,
    deleteFarmer,
    lastFarmerAddedId,
    setLastFarmerAddedId,
    farmerWithdrawals,
    addFarmerWithdrawal,
    updateFarmerWithdrawal,
    deleteFarmerWithdrawal,
    setPersons,
    setVirtualMembers,
    setAdvances,
    setSuppliers,
    setSupplierPayments,
    setFarmers,
    setFarmerWithdrawals
  }), [
    hydratedPersons,
    activePersons,
    virtualMembers,
    addPerson,
    updatePerson,
    deletePerson,
    hydratedAdvances,
    addAdvance,
    updateAdvance,
    deleteAdvance,
    lastAdvanceAddedId,
    suppliers,
    addSupplier,
    updateSupplier,
    deleteSupplier,
    lastSupplierAddedId,
    supplierPayments,
    addSupplierPayment,
    updateSupplierPayment,
    deleteSupplierPayment,
    farmers,
    addFarmer,
    updateFarmer,
    deleteFarmer,
    lastFarmerAddedId,
    farmerWithdrawals,
    addFarmerWithdrawal,
    updateFarmerWithdrawal,
    deleteFarmerWithdrawal
  ]);

  return (
    <PersonsContext.Provider value={controlledValue || internalValue}>
      {children}
    </PersonsContext.Provider>
  );
};
