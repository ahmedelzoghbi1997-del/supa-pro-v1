import { db, type SyncQueueItem } from './db';
import { supabase } from './supabase';
import { sanitizePayloadForTable } from './payloadWhitelist';

export const isNetworkError = (error: any): boolean => {
    if (!error) return false;
    if (typeof navigator !== 'undefined' && !navigator.onLine) return true;
    
    const message = (error.message || error.details || error.hint || String(error)).toLowerCase();
    return (
        message.includes('fetch') ||
        message.includes('network') ||
        message.includes('failed to fetch') ||
        message.includes('networkerror') ||
        message.includes('connection') ||
        message.includes('timeout') ||
        message.includes('offline') ||
        message.includes('aborterror') ||
        error.name === 'AbortError' ||
        error.name === 'TypeError' && message.includes('fetch')
    );
};

export const addToSyncQueue = async (item: Omit<SyncQueueItem, 'id' | 'created_at'>): Promise<number | undefined> => {
    try {
        const queueItem: SyncQueueItem = {
            ...item,
            created_at: Date.now(),
            retryCount: 0
        };
        const id = await (db as any).sync_queue.add(queueItem);
        console.log(`[SyncQueue] Added item to queue (id: ${id}, table: ${item.table}, action: ${item.action})`);
        return id;
    } catch (e) {
        console.error('[SyncQueue] Failed to add item to sync queue:', e);
    }
};

export const getPendingSyncCount = async (): Promise<number> => {
    try {
        return await (db as any).sync_queue.count();
    } catch {
        return 0;
    }
};

let isProcessingQueue = false;

export const processSyncQueue = async (onItemSynced?: (item: SyncQueueItem) => void): Promise<{ processed: number; failed: number }> => {
    if (isProcessingQueue) {
        return { processed: 0, failed: 0 };
    }
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
        return { processed: 0, failed: 0 };
    }

    isProcessingQueue = true;
    let processed = 0;
    let failed = 0;

    try {
        const items: SyncQueueItem[] = await (db as any).sync_queue.orderBy('created_at').toArray();
        if (!items || items.length === 0) {
            isProcessingQueue = false;
            return { processed: 0, failed: 0 };
        }

        console.log(`[SyncQueue] Processing ${items.length} pending items...`);

        for (const item of items) {
            try {
                const { table, action, recordId, payload } = item;
                const cleanPayload = sanitizePayloadForTable(table, payload);

                let error: any = null;

                if (action === 'insert') {
                    const res = await supabase.from(table).insert([cleanPayload]);
                    error = res.error;
                } else if (action === 'update') {
                    const targetId = recordId || payload.id;
                    if (!targetId) {
                        // Skip unidentifiable update
                        await (db as any).sync_queue.delete(item.id!);
                        continue;
                    }
                    const res = await supabase.from(table).update(cleanPayload).eq('id', targetId);
                    error = res.error;
                } else if (action === 'delete') {
                    const targetId = recordId || payload.id;
                    if (targetId) {
                        const res = await supabase.from(table).delete().eq('id', targetId);
                        error = res.error;
                    }
                }

                if (error) {
                    if (isNetworkError(error)) {
                        console.warn(`[SyncQueue] Network error for item ${item.id}, will retry later:`, error.message);
                        failed++;
                        break; // Stop loop if still offline / network fails
                    } else {
                        console.error(`[SyncQueue] Permanent error for item ${item.id}, dropping:`, error);
                        await (db as any).sync_queue.delete(item.id!);
                        failed++;
                    }
                } else {
                    await (db as any).sync_queue.delete(item.id!);
                    processed++;
                    if (onItemSynced) {
                        onItemSynced(item);
                    }
                }
            } catch (err: any) {
                if (isNetworkError(err)) {
                    failed++;
                    break;
                } else {
                    console.error(`[SyncQueue] Unexpected error processing item ${item.id}:`, err);
                    await (db as any).sync_queue.delete(item.id!);
                    failed++;
                }
            }
        }
    } catch (queueErr) {
        console.error('[SyncQueue] Error during queue processing:', queueErr);
    } finally {
        isProcessingQueue = false;
    }

    return { processed, failed };
};
