import { db, type SyncQueueItem } from './db';
import { supabase, isSupabaseConfigured } from './supabase';
import { sanitizePayloadForTable } from './payloadWhitelist';

export const isNetworkError = (error: unknown): boolean => {
    if (!error) return false;
    if (typeof navigator !== 'undefined' && navigator.onLine === false) return true;
    
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
        const id = await db.sync_queue.add(queueItem);
        console.log(`[SyncQueue] Added item to queue (id: ${id}, table: ${item.table}, action: ${item.action})`);
        return id;
    } catch (e) {
        console.error('[SyncQueue] Failed to add item to sync queue:', e);
    }
};

export const getPendingSyncCount = async (): Promise<number> => {
    try {
        return await db.sync_queue
            .filter((item: SyncQueueItem) => item.status !== 'failed')
            .count();
    } catch {
        return 0;
    }
};

export const getFailedSyncCount = async (): Promise<number> => {
    try {
        return await db.sync_queue
            .filter((item: SyncQueueItem) => item.status === 'failed')
            .count();
    } catch {
        return 0;
    }
};

let isProcessingQueue = false;

const KNOWN_TABLES = new Set([
    'profiles',
    'cycles',
    'assets',
    'expense_categories',
    'suppliers',
    'farmers',
    'persons',
    'bank_accounts',
    'invoices',
    'expenses',
    'advances',
    'daily_logs',
    'invoice_price_items',
    'invoice_deductions',
    'supplier_payments',
    'farmer_withdrawals',
    'bank_transactions',
    'partner_debts'
]);

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
    if (!isSupabaseConfigured) {
        return { processed: 0, failed: 0 };
    }
    if (isProcessingQueue) {
        return { processed: 0, failed: 0 };
    }
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
        return { processed: 0, failed: 0 };
    }

    isProcessingQueue = true;
    let processed = 0;
    let failed = 0;

    try {
        const rawItems: SyncQueueItem[] = await db.sync_queue.orderBy('created_at').toArray();
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

                // التحقق من صحة الجدول
                if (!table || !KNOWN_TABLES.has(table)) {
                    const currentRetry = (item.retryCount || 0) + 1;
                    const errorMsg = !table ? 'Missing table for sync operation' : `Unknown table '${table}' for sync operation`;
                    console.error(`[SyncQueue] ${errorMsg} for item ${item.id}`);
                    await db.sync_queue.update(item.id!, {
                        retryCount: currentRetry,
                        error: errorMsg,
                        status: currentRetry >= 5 ? 'failed' : 'pending'
                    });
                    failed++;
                    continue;
                }

                const cleanPayload = sanitizePayloadForTable(table, payload);

                let error: any = null;

                if (action === 'insert') {
                    if (!cleanPayload || (typeof cleanPayload === 'object' && Object.keys(cleanPayload).length === 0)) {
                        const currentRetry = (item.retryCount || 0) + 1;
                        await db.sync_queue.update(item.id!, {
                            retryCount: currentRetry,
                            error: 'Empty payload for insert operation',
                            status: currentRetry >= 5 ? 'failed' : 'pending'
                        });
                        failed++;
                        continue;
                    }
                    
                    const IDEMPOTENT_UUID_TABLES = new Set([
                        'invoices',
                        'expenses',
                        'cycles',
                        'persons',
                        'advances',
                        'suppliers',
                        'farmers',
                        'farmer_withdrawals',
                        'supplier_payments',
                        'bank_accounts',
                        'bank_transactions',
                        'partner_debts',
                        'daily_logs',
                        'expense_categories',
                        'assets'
                    ]);

                    const res = IDEMPOTENT_UUID_TABLES.has(table)
                        ? await supabase.from(table).upsert([cleanPayload], { onConflict: 'id' })
                        : await supabase.from(table).insert([cleanPayload]);

                    error = res.error;
                } else if (action === 'update') {
                    // ملاحظة: الجداول التابعة مثل invoice_price_items و invoice_deductions تستخدم معرفات رقمية محلية (++id تلقائي في Dexie/IndexedDB)
                    // بينما السحابة (Supabase) تولد معرفات مختلفة، وعمليات المزامنة والتحديث ترتبط أساساً بـ invoice_id وليس بالـ id الرقمي المحلي.
                    const targetId = recordId || payload?.id;
                    if (!targetId) {
                        // في حال عدم وجود معرف للتحديث
                        const currentRetry = (item.retryCount || 0) + 1;
                        await db.sync_queue.update(item.id!, {
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
                    const targetId = recordId || payload?.id;
                    if (!targetId) {
                        // في حال عدم وجود معرف للحذف
                        const currentRetry = (item.retryCount || 0) + 1;
                        await db.sync_queue.update(item.id!, {
                            retryCount: currentRetry,
                            error: 'Missing targetId for delete operation',
                            status: currentRetry >= 5 ? 'failed' : 'pending'
                        });
                        failed++;
                        continue;
                    }
                    const res = await supabase.from(table).delete().eq('id', targetId);
                    error = res.error;
                } else {
                    const currentRetry = (item.retryCount || 0) + 1;
                    await db.sync_queue.update(item.id!, {
                        retryCount: currentRetry,
                        error: `Unknown action '${action}' for sync operation`,
                        status: currentRetry >= 5 ? 'failed' : 'pending'
                    });
                    failed++;
                    continue;
                }

                // عند معالجة عنصر insert أو update لجدول invoices ووجود _offline_price_items أو _offline_deductions في الحمولة
                // يتم تنفيذ الحذف والإدراج في معاملة ذرية واحدة عبر دالة upsert_invoice_items
                if (!error && table === 'invoices' && (action === 'insert' || action === 'update')) {
                    if (payload && (payload._offline_price_items !== undefined || payload._offline_deductions !== undefined)) {
                        const targetId = recordId || payload.id || cleanPayload?.id;
                        if (targetId) {
                            const invoiceUserId = payload.user_id || cleanPayload?.user_id;
                            const rpcRes = await supabase.rpc('upsert_invoice_items', {
                                p_invoice_id: targetId,
                                p_price_items: payload._offline_price_items || [],
                                p_deductions: payload._offline_deductions || [],
                                p_user_id: invoiceUserId || null
                            });
                            if (rpcRes.error) {
                                error = rpcRes.error;
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
                        
                        await db.sync_queue.update(item.id!, {
                            retryCount: nextRetry,
                            error: errorMsg,
                            status: nextRetry >= 5 ? 'failed' : 'pending'
                        });
                        failed++;
                    }
                } else {
                    // الحذف يتم فقط عند نجاح المزامنة
                    await db.sync_queue.delete(item.id!);
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
                    
                    await db.sync_queue.update(item.id!, {
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
