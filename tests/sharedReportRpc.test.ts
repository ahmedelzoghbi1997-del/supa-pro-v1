/**
 * ==============================================================================
 * اختبار وحدة: نظام مشاركة التقارير الآمن عبر الرموز المشفرة (Report Shares RPC)
 * ==============================================================================
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { supabase } from '../lib/supabase';

describe('Shared Report RPC Token System (report_shares)', () => {
    beforeEach(() => {
        vi.restoreAllMocks();
    });

    it('creates a secure report share token via create_report_share RPC', async () => {
        const mockCycleId = '11111111-2222-3333-4444-555555555555';
        const mockToken = 'a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f90';

        const rpcSpy = vi.spyOn(supabase, 'rpc').mockResolvedValue({
            data: {
                success: true,
                share_token: mockToken,
                expires_at: '2026-10-29T12:00:00Z'
            },
            error: null
        } as any);

        const { data, error } = await supabase.rpc('create_report_share', {
            p_cycle_id: mockCycleId
        });

        expect(error).toBeNull();
        expect(data).toBeDefined();
        expect(data.success).toBe(true);
        expect(data.share_token).toBe(mockToken);
        expect(rpcSpy).toHaveBeenCalledWith('create_report_share', {
            p_cycle_id: mockCycleId
        });

        const shareUrl = `/shared-report/${data.share_token}`;
        expect(shareUrl).toContain(mockToken);
    });

    it('fetches shared report securely via get_shared_report RPC with share_token', async () => {
        const mockToken = 'a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f90';
        const mockReportPayload = {
            success: true,
            cycle: {
                id: 'cycle-101',
                name: 'صوبة طماطم شيري',
                seed_type: 'شيري أحمر',
                plant_count: 2000,
                status: 'active'
            },
            asset_name: 'صوبة رقم 3',
            invoices: [
                { id: 'inv-1', date: '2026-09-20', market: 'سوق الجملة', packaging_count: 40 }
            ],
            invoice_price_items: [
                { id: 1, invoice_id: 'inv-1', quantity: 200, price_per_kg: 25 }
            ],
            invoice_deductions: [],
            expenses: [
                { id: 'exp-1', amount: 1500, description: 'سماد نترات', date: '2026-09-15' }
            ],
            expense_categories: [
                { id: 'cat-1', name: 'أسمدة ومخصبات' }
            ]
        };

        const rpcSpy = vi.spyOn(supabase, 'rpc').mockResolvedValue({
            data: mockReportPayload,
            error: null
        } as any);

        const { data, error } = await supabase.rpc('get_shared_report', {
            p_share_token: mockToken
        });

        expect(error).toBeNull();
        expect(data).toBeDefined();
        expect(data.success).toBe(true);
        expect(data.cycle.name).toBe('صوبة طماطم شيري');
        expect(data.invoices).toHaveLength(1);
        expect(data.expenses).toHaveLength(1);
        expect(rpcSpy).toHaveBeenCalledWith('get_shared_report', {
            p_share_token: mockToken
        });
    });

    it('handles expired or revoked tokens properly with error message', async () => {
        vi.spyOn(supabase, 'rpc').mockResolvedValue({
            data: null,
            error: { message: 'انتهت صلاحية رابط هذا التقرير' }
        } as any);

        const { data, error } = await supabase.rpc('get_shared_report', {
            p_share_token: 'expired_or_revoked_token'
        });

        expect(data).toBeNull();
        expect(error).toBeDefined();
        expect(error.message).toBe('انتهت صلاحية رابط هذا التقرير');
    });
});
