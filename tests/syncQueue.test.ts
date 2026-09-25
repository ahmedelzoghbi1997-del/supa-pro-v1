import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { db } from '../lib/db';
import { supabase } from '../lib/supabase';
import { isNetworkError, processSyncQueue, addToSyncQueue } from '../lib/syncQueue';

describe('Sync Queue Manager (lib/syncQueue.ts)', () => {
    beforeEach(async () => {
        await db.sync_queue.clear();
        vi.restoreAllMocks();
    });

    describe('Network Error Detection (isNetworkError)', () => {
        it('identifies network errors correctly', () => {
            expect(isNetworkError(new Error('Failed to fetch'))).toBe(true);
            expect(isNetworkError(new Error('NetworkError when attempting to fetch resource'))).toBe(true);
            expect(isNetworkError(new Error('Connection timed out'))).toBe(true);
            expect(isNetworkError({ message: 'The user is offline' })).toBe(true);
            expect(isNetworkError({ name: 'AbortError', message: 'The operation was aborted' })).toBe(true);
            expect(isNetworkError({ name: 'TypeError', message: 'fetch failed' })).toBe(true);
        });

        it('identifies non-network errors (e.g. database constraints, schema errors) correctly', () => {
            expect(isNetworkError(new Error('duplicate key value violates unique constraint'))).toBe(false);
            expect(isNetworkError(new Error('violates foreign key constraint'))).toBe(false);
            expect(isNetworkError({ message: 'column "test" does not exist' })).toBe(false);
            expect(isNetworkError(null)).toBe(false);
            expect(isNetworkError(undefined)).toBe(false);
        });
    });

    describe('Priority Ordering & Queue Processing', () => {
        it('processes items in table dependency priority order (cycles & suppliers before invoices before deductions)', async () => {
            const executionOrder: string[] = [];

            // Mock Supabase from(...) handlers
            vi.spyOn(supabase, 'from').mockImplementation((table: string) => {
                return {
                    insert: vi.fn().mockImplementation(() => {
                        executionOrder.push(table);
                        return Promise.resolve({ data: null, error: null });
                    }),
                    update: vi.fn().mockReturnValue({
                        eq: vi.fn().mockImplementation(() => {
                            executionOrder.push(`${table}:update`);
                            return Promise.resolve({ data: null, error: null });
                        })
                    }),
                    delete: vi.fn().mockReturnValue({
                        eq: vi.fn().mockImplementation(() => {
                            executionOrder.push(`${table}:delete`);
                            return Promise.resolve({ data: null, error: null });
                        })
                    })
                } as any;
            });

            // Add items in reverse priority order:
            // 1. invoice_deductions (Priority 3)
            // 2. invoices (Priority 2)
            // 3. cycles (Priority 1)
            // 4. suppliers (Priority 1)
            await db.sync_queue.add({
                table: 'invoice_deductions',
                action: 'insert',
                payload: { id: 1, invoice_id: 'inv-1', name: 'مشال', amount: 100 },
                created_at: 1000
            });
            await db.sync_queue.add({
                table: 'invoices',
                action: 'insert',
                payload: { id: 'inv-1', date: '2026-03-25', cycle_id: 'c-1', market: 'سوق 1', packaging_type: 'carton' },
                created_at: 2000
            });
            await db.sync_queue.add({
                table: 'cycles',
                action: 'insert',
                payload: { id: 'c-1', name: 'طماطم', seed_type: '023', plant_count: 5000, unit_of_measure: 'plants', area_in_feddans: 1, asset_id: 'a1', start_date: '2026-01-01', status: 'active' },
                created_at: 3000
            });
            await db.sync_queue.add({
                table: 'suppliers',
                action: 'insert',
                payload: { id: 's-1', name: 'شركة البركة' },
                created_at: 4000
            });

            const result = await processSyncQueue();

            expect(result.processed).toBe(4);
            expect(result.failed).toBe(0);

            // Verified priority order: Priority 1 (cycles, suppliers) -> Priority 2 (invoices) -> Priority 3 (invoice_deductions)
            expect(executionOrder).toEqual([
                'cycles',
                'suppliers',
                'invoices',
                'invoice_deductions'
            ]);
        });
    });

    describe('Retry Counter & Error Handling', () => {
        it('increments retry count on non-network errors and marks item as failed after 5 attempts', async () => {
            const dbError = { message: 'violates check constraint valid_amount' };

            vi.spyOn(supabase, 'from').mockReturnValue({
                insert: vi.fn().mockResolvedValue({ data: null, error: dbError })
            } as any);

            const itemId = await db.sync_queue.add({
                table: 'expenses',
                action: 'insert',
                payload: { id: 'exp-bad', description: 'مصروف غير صالح', amount: -500, date: '2026-03-25', category_id: 'cat-1', cycle_id: 'c-1' },
                created_at: Date.now(),
                retryCount: 0
            });

            // First 4 attempts: retryCount increments, status remains pending
            for (let i = 1; i <= 4; i++) {
                const res = await processSyncQueue();
                expect(res.failed).toBe(1);
                const item = await db.sync_queue.get(itemId);
                expect(item?.retryCount).toBe(i);
                expect(item?.status).toBe('pending');
            }

            // 5th attempt: reaches threshold -> status becomes 'failed'
            const res5 = await processSyncQueue();
            expect(res5.failed).toBe(1);
            const finalItem = await db.sync_queue.get(itemId);
            expect(finalItem?.retryCount).toBe(5);
            expect(finalItem?.status).toBe('failed');

            // Subsequent process runs skip already failed items
            const res6 = await processSyncQueue();
            expect(res6.processed).toBe(0);
            expect(res6.failed).toBe(0);
        });

        it('pauses processing and preserves retryCount when encountering a network error', async () => {
            const networkError = new Error('Failed to fetch from Supabase');

            vi.spyOn(supabase, 'from').mockReturnValue({
                insert: vi.fn().mockResolvedValue({ data: null, error: networkError })
            } as any);

            const itemId = await db.sync_queue.add({
                table: 'suppliers',
                action: 'insert',
                payload: { id: 's-net', name: 'مورد شبكة' },
                created_at: Date.now(),
                retryCount: 0
            });

            const res = await processSyncQueue();
            expect(res.failed).toBe(1);

            // Retry count should NOT be incremented for network errors (stays 0 to allow infinite retries upon connection recovery)
            const item = await db.sync_queue.get(itemId);
            expect(item?.retryCount).toBe(0);
            expect(item?.status).not.toBe('failed');
        });

        it('successfully removes items from queue upon successful sync', async () => {
            vi.spyOn(supabase, 'from').mockReturnValue({
                insert: vi.fn().mockResolvedValue({ data: null, error: null })
            } as any);

            await addToSyncQueue({
                table: 'farmers',
                action: 'insert',
                payload: { id: 'farmer-ok', name: 'الحاج إبراهيم' }
            });

            const countBefore = await db.sync_queue.count();
            expect(countBefore).toBe(1);

            const res = await processSyncQueue();
            expect(res.processed).toBe(1);
            expect(res.failed).toBe(0);

            const countAfter = await db.sync_queue.count();
            expect(countAfter).toBe(0);
        });
    });
});
