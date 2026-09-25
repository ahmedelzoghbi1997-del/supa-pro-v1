import React, { createContext, useContext, useState, useMemo, useCallback, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { sanitizePayloadForTable } from '../lib/payloadWhitelist';
import { addToSyncQueue, isNetworkError } from '../lib/syncQueue';
import { generateStableId } from '../lib/dataCache';
import type { DailyLog, Asset, Cycle } from '../types';

export interface DailyLogsContextType {
  dailyLogs: DailyLog[];
  addDailyLog: (log: Omit<DailyLog, 'id' | 'created_at' | 'user_id' | '_stable_id'>) => Promise<void>;
  updateDailyLog: (log: DailyLog) => Promise<void>;
  deleteDailyLog: (id: string) => Promise<boolean>;
  assets: Asset[];
  addAsset: (asset: Omit<Asset, 'id' | 'created_at' | 'user_id' | '_stable_id'>) => Promise<void>;
  updateAsset: (asset: Asset) => Promise<void>;
  deleteAsset: (id: string) => Promise<boolean>;
  setDailyLogs: React.Dispatch<React.SetStateAction<DailyLog[]>>;
  setAssets: React.Dispatch<React.SetStateAction<Asset[]>>;
}

export const DailyLogsContext = createContext<DailyLogsContextType | undefined>(undefined);

export const useDailyLogsData = (): DailyLogsContextType => {
  const context = useContext(DailyLogsContext);
  if (!context) {
    throw new Error('useDailyLogsData must be used within a DailyLogsProvider or DataProvider');
  }
  return context;
};

interface DailyLogsProviderProps {
  children: ReactNode;
  effectiveUserId?: string;
  cycles?: Cycle[];
  refreshGlobalData?: () => Promise<void>;
  broadcastChange?: (table: string, record: any, eventType?: 'INSERT' | 'UPDATE' | 'DELETE', oldRecord?: any) => void;
  recentlyAddedIdsRef?: React.MutableRefObject<Set<string>>;
  dailyLogs?: DailyLog[];
  setDailyLogs?: React.Dispatch<React.SetStateAction<DailyLog[]>>;
  assets?: Asset[];
  setAssets?: React.Dispatch<React.SetStateAction<Asset[]>>;
  value?: DailyLogsContextType;
}

export const DailyLogsProvider: React.FC<DailyLogsProviderProps> = ({
  children,
  effectiveUserId = '',
  cycles = [],
  refreshGlobalData,
  broadcastChange,
  recentlyAddedIdsRef,
  dailyLogs: propsDailyLogs,
  setDailyLogs: propsSetDailyLogs,
  assets: propsAssets,
  setAssets: propsSetAssets,
  value: controlledValue
}) => {
  const [internalDailyLogs, setInternalDailyLogs] = useState<DailyLog[]>([]);
  const [internalAssets, setInternalAssets] = useState<Asset[]>([]);

  const dailyLogs = propsDailyLogs !== undefined ? propsDailyLogs : internalDailyLogs;
  const setDailyLogs = propsSetDailyLogs || setInternalDailyLogs;
  const assets = propsAssets !== undefined ? propsAssets : internalAssets;
  const setAssets = propsSetAssets || setInternalAssets;

  const addDailyLog = useCallback(async (data: Omit<DailyLog, 'id' | 'created_at' | 'user_id' | '_stable_id'>) => {
    const stableId = generateStableId();
    const optimisticCreatedAt = new Date().toISOString();
    const cycleName = cycles.find(c => String(c.id) === String(data.cycle_id))?.name;
    const optimisticLog = { ...data, id: stableId, _stable_id: stableId, cycle: cycleName, created_at: optimisticCreatedAt } as DailyLog;
    
    setDailyLogs(prev => [optimisticLog, ...prev]);
    
    const { data: newLog, error } = await supabase.from('daily_logs').insert([sanitizePayloadForTable('daily_logs', { ...data, user_id: effectiveUserId })]).select().single();
    if (error) { 
        if (isNetworkError(error)) {
            addToSyncQueue({ table: 'daily_logs', action: 'insert', payload: data }).catch(console.error);
            try {
                setDailyLogs(prev => prev.map(item => (item._stable_id === stableId || item.id === stableId) ? { ...item, pending_sync: true } as any : item));
            } catch (_e) {} 
            return;
        } else {
            setDailyLogs(prev => prev.filter(l => l._stable_id !== stableId)); 
            throw error;
        } 
    }
    
    if (recentlyAddedIdsRef?.current) {
        recentlyAddedIdsRef.current.add(newLog.id);
        setTimeout(() => recentlyAddedIdsRef.current?.delete(newLog.id), 10000);
    }

    setDailyLogs(prev => prev.map(l => l._stable_id === stableId ? { ...newLog, _stable_id: stableId, cycle: cycleName } : l));
    if (broadcastChange) broadcastChange('daily_logs', newLog, 'INSERT');
  }, [cycles, effectiveUserId, broadcastChange, recentlyAddedIdsRef]);

  const updateDailyLog = useCallback(async (d: DailyLog) => {
    const cleanData = sanitizePayloadForTable('daily_logs', d);
    setDailyLogs(prev => prev.map(l => l.id === d.id ? { ...l, ...cleanData } : l));
    const { error } = await supabase.from('daily_logs').update(sanitizePayloadForTable('daily_logs', cleanData)).eq('id', d.id);
    if (error) { 
        if (isNetworkError(error)) {
            addToSyncQueue({ table: 'daily_logs', action: 'update', payload: d }).catch(console.error);
            try {
                setDailyLogs(prev => prev.map(item => (item._stable_id === d.id || item.id === d.id) ? { ...item, pending_sync: true } as any : item));
            } catch (_e) {} 
            return;
        } else {
            console.error("Failed to update daily log:", error);
            throw error;
        } 
    }
    if (refreshGlobalData) await refreshGlobalData();
    if (broadcastChange) broadcastChange('daily_logs', cleanData, 'UPDATE');
  }, [refreshGlobalData, broadcastChange]);

  const deleteDailyLog = useCallback(async (id: string): Promise<boolean> => {
    try {
        setDailyLogs(prev => prev.filter(l => l.id !== id));
        await supabase.from('daily_logs').delete().eq('id', id);
        if (broadcastChange) broadcastChange('daily_logs', { id }, 'DELETE');
        return true;
    } catch (error) { 
        if (isNetworkError(error)) { 
            await addToSyncQueue({ table: 'daily_logs', action: 'delete', payload: {}, recordId: id }); 
            return true;
        } else { 
            throw error; 
        } 
    }
  }, [broadcastChange]);

  const addAsset = useCallback(async (a: Omit<Asset, 'id' | 'created_at' | 'user_id' | '_stable_id'>) => {
    const { data, error } = await supabase.from('assets').insert([sanitizePayloadForTable('assets', {...a, user_id: effectiveUserId})]).select().single();
    if (!error && data) setAssets(prev => [{...data, _stable_id: data.id}, ...prev]);
    if (refreshGlobalData) await refreshGlobalData();
    if (broadcastChange && data) broadcastChange('assets', data, 'INSERT');
  }, [effectiveUserId, refreshGlobalData, broadcastChange]);

  const updateAsset = useCallback(async (d: Asset) => {
    const cleanData = sanitizePayloadForTable('assets', d);
    setAssets(prev => prev.map(a => a.id === d.id ? { ...a, ...cleanData } : a));
    const { error } = await supabase.from('assets').update(sanitizePayloadForTable('assets', cleanData)).eq('id', d.id);
    if (error) { 
        if (isNetworkError(error)) {
            addToSyncQueue({ table: 'assets', action: 'update', payload: d }).catch(console.error);
            try {
                setAssets(prev => prev.map(item => (item._stable_id === d.id || item.id === d.id) ? { ...item, pending_sync: true } as any : item));
            } catch (_e) {} 
            return;
        } else {
            console.error("Failed to update asset:", error);
            throw error;
        } 
    }
    if (refreshGlobalData) await refreshGlobalData();
    if (broadcastChange) broadcastChange('assets', cleanData, 'UPDATE');
  }, [refreshGlobalData, broadcastChange]);

  const deleteAsset = useCallback(async (id: string): Promise<boolean> => {
    try {
        setAssets(prev => prev.filter(a => a.id !== id));
        await supabase.from('assets').delete().eq('id', id);
        if (refreshGlobalData) await refreshGlobalData();
        if (broadcastChange) broadcastChange('assets', { id }, 'DELETE');
        return true;
    } catch (error) { 
        if (isNetworkError(error)) { 
            await addToSyncQueue({ table: 'assets', action: 'delete', payload: {}, recordId: id }); 
            return true;
        } else { 
            throw error; 
        } 
    }
  }, [refreshGlobalData, broadcastChange]);

  const internalValue: DailyLogsContextType = useMemo(() => ({
    dailyLogs,
    addDailyLog,
    updateDailyLog,
    deleteDailyLog,
    assets,
    addAsset,
    updateAsset,
    deleteAsset,
    setDailyLogs,
    setAssets
  }), [
    dailyLogs,
    addDailyLog,
    updateDailyLog,
    deleteDailyLog,
    assets,
    addAsset,
    updateAsset,
    deleteAsset
  ]);

  return (
    <DailyLogsContext.Provider value={controlledValue || internalValue}>
      {children}
    </DailyLogsContext.Provider>
  );
};
