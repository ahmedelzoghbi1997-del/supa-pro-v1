import { db, type SyncQueueItem } from './db';
import { supabase } from './supabase';
import { sanitizePayloadForTable } from './payloadWhitelist';

export const isNetworkError = (error: unknown): boolean => {
    if (!error) return false;
    if (typeof navigator !== 'undefined' && !navigator.onLine) return true;
    
    const err = error as { message?: string; details?: string; hint?: string; name?: string };
    const message = (err.message || err.details || err.hint || String(error)).toLowerCase();
    return (
        message.includes('fetch') ||
        message.includes('network') ||
        message.includes('failed to fetch') ||
        message.includes('networkerror') ||
        message.includes('connection') ||
        message.includes('timeout') ||
        message.includes('offline') ||
        message.includes('aborterror') ||
        err.name === 'AbortError' ||
        (err.name === 'TypeError' && message.includes('fetch'))
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
        return await (db as any).sync_queue
            .filter((item: SyncQueueItem) => item.status !== 'failed')
            .count();
    } catch {
        return 0;
    }
};

export const getFailedSyncCount = async (): Promise<number> => {
    try {
        return await (db as any).sync_queue
            .filter((item: SyncQueueItem) => item.status === 'failed')
            .count();
    } catch {
        return 0;
    }
};

let isProcessingQueue = false;

const getTablePriority = (table: string): number => {
    switch (table) {
        case 'profiles':
        case 'cycles':
        case 'assets':
        case 'expense_categories':
        case 'suppliers':
        case 'farmers':
        case 'persons':
        case 'bank_accounts':
            return 1;
        case 'invoices':
        case 'expenses':
        case 'advances':
        case 'daily_logs':
            return 2;
        case 'invoice_price_items':
        case 'invoice_deductions':
        case 'supplier_payments':
        case 'farmer_withdrawals':
        case 'bank_transactions':
        case 'partner_debts':
            return 3;
        default:
            return 4;
    }
};

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
        const rawItems: SyncQueueItem[] = await (db as any).sync_queue.orderBy('created_at').toArray();
        if (!rawItems || rawItems.length === 0) {
            isProcessingQueue = false;
            return { processed: 0, failed: 0 };
        }

        // ترتيب العمليات بحيث تُعالج الجداول الأساسية (مثل invoices) قبل الجداول التابعة (مثل invoice_price_items و invoice_deductions)
        const items = [...rawItems].sort((a, b) => {
            const prioA = getTablePriority(a.table);
            const prioB = getTablePriority(b.table);
            if (prioA !== prioB) {
                return prioA - prioB;
            }
            return (a.created_at || 0) - (b.created_at || 0);
        });

        console.log(`[SyncQueue] Processing ${items.length} pending items in priority order...`);

        for (const item of items) {
            // تخطي العناصر التي بلغت الحد الأقصى للمحاولات وتم تعليمها كفاشلة نهائياً لتجنب إيقاف الطابور
            if (item.status === 'failed' || (item.retryCount && item.retryCount >= 5)) {
                continue;
            }

            try {
                const { table, action, recordId, payload } = item;
                const cleanPayload = sanitizePayloadForTable(table, payload);

                let error: any = null;

                if (action === 'insert') {
                    const res = await supabase.from(table).insert([cleanPayload]);
                    error = res.error;
                } else if (action === 'update') {
                    // ملاحظة: الجداول التابعة مثل invoice_price_items و invoice_deductions تستخدم معرفات رقمية محلية (++id تلقائي في Dexie/IndexedDB)
                    // بينما السحابة (Supabase) تولد معرفات مختلفة، وعمليات المزامنة والتحديث ترتبط أساساً بـ invoice_id وليس بالـ id الرقمي المحلي.
                    const targetId = recordId || payload.id;
                    if (!targetId) {
                        // في حال عدم وجود معرف للتحديث
                        const currentRetry = (item.retryCount || 0) + 1;
                        await (db as any).sync_queue.update(item.id!, {
                            retryCount: currentRetry,
                            error: 'Missing targetId for update operation',
                            status: currentRetry >= 5 ? 'failed' : 'pending'
                        });
                        failed++;
                        continue;
                    }
                    const res = await supabase.from(table).update(cleanPayload).eq('id', targetId);
                    error = res.error;
                } else if (action === 'delete') {
                    // استخدام recordId ثم payload.id لتحديد السجل المراد حذفه
                    const targetId = recordId || payload.id;
                    if (targetId) {
                        const res = await supabase.from(table).delete().eq('id', targetId);
                        error = res.error;
                    }
                }

                // عند معالجة عنصر insert أو update لجدول invoices ووجود _offline_price_items أو _offline_deductions في الحمولة
                if (!error && table === 'invoices' && (action === 'insert' || action === 'update')) {
                    if (payload && (payload._offline_price_items !== undefined || payload._offline_deductions !== undefined)) {
                        const targetId = recordId || payload.id || cleanPayload?.id;
                        if (targetId) {
                            const invoiceUserId = payload.user_id || cleanPayload?.user_id;

                            // حذف كل البنود القديمة عبر .delete().eq('invoice_id', targetId)
                            const delPrices = await supabase.from('invoice_price_items').delete().eq('invoice_id', targetId);
                            if (delPrices.error) error = delPrices.error;

                            if (!error) {
                                const delDeds = await supabase.from('invoice_deductions').delete().eq('invoice_id', targetId);
                                if (delDeds.error) error = delDeds.error;
                            }

                            // إدراج البنود الجديدة مع invoice_id الصحيح
                            if (!error && payload._offline_price_items && payload._offline_price_items.length > 0) {
                                const itemsToInsert = payload._offline_price_items.map((pi: any) => {
                                    const { id: _unused_id, invoice_id: _unused_inv_id, user_id: _unused_uid, ...cleanItem } = pi;
                                    return {
                                        ...cleanItem,
                                        invoice_id: targetId,
                                        ...(invoiceUserId ? { user_id: invoiceUserId } : {})
                                    };
                                });
                                const insPrices = await supabase.from('invoice_price_items').insert(itemsToInsert);
                                if (insPrices.error) error = insPrices.error;
                            }

                            if (!error && payload._offline_deductions && payload._offline_deductions.length > 0) {
                                const dedsToInsert = payload._offline_deductions.map((ded: any) => {
                                    const { id: _unused_id, invoice_id: _unused_inv_id, user_id: _unused_uid, ...cleanDed } = ded;
                                    return {
                                        ...cleanDed,
                                        invoice_id: targetId,
                                        ...(invoiceUserId ? { user_id: invoiceUserId } : {})
                                    };
                                });
                                const insDeds = await supabase.from('invoice_deductions').insert(dedsToInsert);
                                if (insDeds.error) error = insDeds.error;
                            }
                        }
                    }
                }

                if (error) {
                    if (isNetworkError(error)) {
                        console.warn(`[SyncQueue] Network error for item ${item.id}, will retry later:`, error.message);
                        failed++;
                        break; // التوقف مؤقتاً عند فشل الشبكة
                    } else {
                        const nextRetry = (item.retryCount || 0) + 1;
                        const errorMsg = error.message || error.details || String(error);
                        console.error(`[SyncQueue] Non-network error for item ${item.id} (attempt ${nextRetry}/5):`, errorMsg);
                        
                        await (db as any).sync_queue.update(item.id!, {
                            retryCount: nextRetry,
                            error: errorMsg,
                            status: nextRetry >= 5 ? 'failed' : 'pending'
                        });
                        failed++;
                    }
                } else {
                    // الحذف يتم فقط عند نجاح المزامنة
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
                    const nextRetry = (item.retryCount || 0) + 1;
                    const errorMsg = err.message || String(err);
                    console.error(`[SyncQueue] Unexpected error processing item ${item.id} (attempt ${nextRetry}/5):`, errorMsg);
                    
                    await (db as any).sync_queue.update(item.id!, {
                        retryCount: nextRetry,
                        error: errorMsg,
                        status: nextRetry >= 5 ? 'failed' : 'pending'
                    });
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
