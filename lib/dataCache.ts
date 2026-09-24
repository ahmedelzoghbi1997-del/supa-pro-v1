import { db } from './db';

export const safeArray = <T,>(arr: unknown): T[] => Array.isArray(arr) ? arr : [];

export const safeNum = (val: unknown): number => {
    const n = parseFloat(String(val));
    return isNaN(n) ? 0 : n;
};

export const generateStableId = (): string => `sid-${Math.random().toString(36).substring(2, 11)}`;

// Async Dexie IndexedDB caching helpers (non-blocking for UI)
export const getCache = async <T,>(userId: string, table: string): Promise<T[] | null> => {
    try {
        const key = `app_cache_${userId}_${table}`;
        const item = await db.cache.get(key);
        if (item && item.data) {
            return item.data as T[];
        }
        // One-time fallback & migration from localStorage if exists
        const local = localStorage.getItem(key);
        if (local) {
            try {
                const parsed = JSON.parse(local) as T[];
                db.cache.put({ key, data: parsed, updated_at: Date.now() }).catch(() => {});
                return parsed;
            } catch {
                // ignore JSON parse error
            }
        }
    } catch (err) {
        console.warn(`[Dexie] Failed to get cache for ${table}:`, err);
    }
    return null;
};

export const setCache = async <T,>(userId: string, table: string, data: T[]): Promise<void> => {
    try {
        const key = `app_cache_${userId}_${table}`;
        await db.cache.put({ key, data, updated_at: Date.now() });
    } catch (err) {
        console.warn(`[Dexie] Failed to set cache for ${table}:`, err);
    }
};

export const getCustomCache = async <T,>(key: string): Promise<T | null> => {
    try {
        const item = await db.cache.get(key);
        if (item && item.data) {
            return item.data as T;
        }
        const local = localStorage.getItem(key);
        if (local) {
            try {
                const parsed = JSON.parse(local) as T;
                db.cache.put({ key, data: parsed, updated_at: Date.now() }).catch(() => {});
                return parsed;
            } catch {
                // ignore JSON parse error
            }
        }
    } catch (err) {
        console.warn(`[Dexie] Failed to get custom cache for ${key}:`, err);
    }
    return null;
};

export const setCustomCache = async <T,>(key: string, data: T): Promise<void> => {
    try {
        await db.cache.put({ key, data, updated_at: Date.now() });
    } catch (err) {
        console.warn(`[Dexie] Failed to set custom cache for ${key}:`, err);
    }
};
