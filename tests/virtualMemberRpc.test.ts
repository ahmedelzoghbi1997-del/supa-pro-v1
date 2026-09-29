/**
 * ==============================================================================
 * اختبار وحدة: جلب بيانات المالك للأعضاء الافتراضيين عبر RPC
 * Unit Test: Fetching Parent Data for Virtual Members via RPC
 * ==============================================================================
 *
 * ملاحظة معمارية هامة (Architectural Note):
 * ----------------------------------------
 * تعمل دالة RPC هذه (get_parent_data_for_virtual_member) كبديل مؤقت ومحمي
 * (Interim Transitional Bridge) لنموذج المصادقة، حيث تمكن الأعضاء الافتراضيين
 * (virtual_members) الذين لا يملكون جلسات Supabase Auth حقيقية من جلب بيانات
 * المالك المقيدة بالحقول المصرح بها فقط (وفق payloadWhitelist) دون وضع التطبيق
 * في حالة Offline قسرية، وذلك كإجراء مرحلي حتى يتم اتخاذ القرار النهائي
 * بالانتقال الكامل إلى حسابات Supabase Auth موثقة لكل عضو في الفريق.
 * ==============================================================================
 */

import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { supabase } from '../lib/supabase';
import { sanitizeCyclePayload, sanitizeInvoicePayload, sanitizeExpensePayload } from '../lib/payloadWhitelist';

describe('Virtual Members Data RPC Bridge (get_parent_data_for_virtual_member)', () => {
    beforeEach(() => {
        vi.restoreAllMocks();
    });

    it('invokes get_parent_data_for_virtual_member RPC with credentials and returns allowed payload whitelist fields', async () => {
        const mockOwnerId = '11111111-1111-1111-1111-111111111111';
        const mockRpcResponse = {
            success: true,
            role: 'viewer',
            owner_id: mockOwnerId,
            cycles: [
                {
                    id: 'cycle-1',
                    user_id: mockOwnerId,
                    name: 'صوبة الخيار 1',
                    seed_type: 'خيار هجين',
                    plant_count: 1200,
                    unit_of_measure: 'plants',
                    area_in_feddans: 0.5,
                    asset_id: 'asset-1',
                    start_date: '2026-09-01',
                    status: 'active',
                    // Sensitive or extra internal fields that must NOT exist or should be filtered
                    _internal_secret: 'should_not_leak'
                }
            ],
            invoices: [
                {
                    id: 'inv-1',
                    user_id: mockOwnerId,
                    description: 'فاتورة خيار سوق العبور',
                    date: '2026-09-20',
                    cycle_id: 'cycle-1',
                    market: 'سوق العبور',
                    packaging_type: 'carton',
                    packaging_count: 50,
                    carton_count: 50
                }
            ],
            expenses: [
                {
                    id: 'exp-1',
                    user_id: mockOwnerId,
                    description: 'شراء أسمدة ومخصبات',
                    date: '2026-09-10',
                    amount: 4500,
                    category_id: 'cat-1',
                    cycle_id: 'cycle-1',
                    payment_method: 'cash'
                }
            ]
        };

        const rpcSpy = vi.spyOn(supabase, 'rpc').mockResolvedValue({
            data: mockRpcResponse,
            error: null
        } as any);

        const { data, error } = await supabase.rpc('get_parent_data_for_virtual_member', {
            p_username: 'worker_ali',
            p_password_hash: 'secretPass123',
            p_token: 'secretPass123'
        });

        expect(error).toBeNull();
        expect(data).toBeDefined();
        expect(data.success).toBe(true);
        expect(data.role).toBe('viewer');
        expect(data.owner_id).toBe(mockOwnerId);

        // Verify RPC arguments passed correctly
        expect(rpcSpy).toHaveBeenCalledWith('get_parent_data_for_virtual_member', {
            p_username: 'worker_ali',
            p_password_hash: 'secretPass123',
            p_token: 'secretPass123'
        });

        // Verify only payloadWhitelist columns are retained in sanitized representations
        const cycle = data.cycles[0];
        const sanitizedCycle = sanitizeCyclePayload(cycle);
        expect(sanitizedCycle.name).toBe('صوبة الخيار 1');
        expect(sanitizedCycle.user_id).toBe(mockOwnerId);
        expect((sanitizedCycle as any)._internal_secret).toBeUndefined();

        const invoice = data.invoices[0];
        const sanitizedInvoice = sanitizeInvoicePayload(invoice);
        expect(sanitizedInvoice.description).toBe('فاتورة خيار سوق العبور');
        expect(sanitizedInvoice.market).toBe('سوق العبور');

        const expense = data.expenses[0];
        const sanitizedExpense = sanitizeExpensePayload(expense);
        expect(sanitizedExpense.amount).toBe(4500);
        expect(sanitizedExpense.description).toBe('شراء أسمدة ومخصبات');
    });

    it('rejects access when RPC returns error (e.g. invalid password or locked account)', async () => {
        vi.spyOn(supabase, 'rpc').mockResolvedValue({
            data: null,
            error: { message: 'بيانات التحقق غير صحيحة' }
        } as any);

        const { data, error } = await supabase.rpc('get_parent_data_for_virtual_member', {
            p_username: 'worker_ali',
            p_password_hash: 'wrong_password',
            p_token: null
        });

        expect(data).toBeNull();
        expect(error).toBeDefined();
        expect(error?.message).toContain('بيانات التحقق غير صحيحة');
    });
});
