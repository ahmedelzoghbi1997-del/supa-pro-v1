import { describe, it, expect } from 'vitest';
import { sanitizePayloadForTable } from '../lib/payloadWhitelist';

describe('Payload Whitelist Sanitization (sanitizePayloadForTable)', () => {
    it('removes computed and UI-only fields from invoice payloads and preserves whitelisted fields', () => {
        const rawInvoice = {
            id: 'inv-123',
            user_id: 'user-001',
            date: '2026-03-25',
            cycle_id: 'cycle-789',
            market: 'سوق العبور',
            packaging_type: 'carton',
            packaging_count: 50,
            carton_count: 50,
            // UI / Computed fields that MUST be stripped:
            _stable_id: 'temp-123',
            total_net: 5000,
            price_items: [{ quantity: 100, price_per_kg: 50 }],
            deductions: [{ name: 'مشال', amount: 200 }],
            pending_sync: true,
            cycle_name: 'عروة الصيف 2026'
        };

        const sanitized = sanitizePayloadForTable('invoices', rawInvoice);

        expect(sanitized).toEqual({
            id: 'inv-123',
            user_id: 'user-001',
            date: '2026-03-25',
            cycle_id: 'cycle-789',
            market: 'سوق العبور',
            packaging_type: 'carton',
            packaging_count: 50,
            carton_count: 50
        });

        expect(sanitized).not.toHaveProperty('_stable_id');
        expect(sanitized).not.toHaveProperty('total_net');
        expect(sanitized).not.toHaveProperty('price_items');
        expect(sanitized).not.toHaveProperty('deductions');
        expect(sanitized).not.toHaveProperty('pending_sync');
    });

    it('removes categoryName, _stable_id, and handles _original_category_id in expenses', () => {
        const rawExpense = {
            id: 'exp-555',
            user_id: 'user-001',
            description: 'شراء أسمدة ومبيدات',
            date: '2026-03-20',
            amount: 1500,
            category_id: 'cat-display-name',
            _original_category_id: 'cat-db-real-uuid',
            categoryName: 'أسمدة',
            cycle_id: 'cycle-789',
            supplier_id: 'supp-456',
            supplierName: 'شركة النصر للأسمدة',
            payment_method: 'cash',
            is_establishment: false,
            // Extra computed / UI state
            _stable_id: 'exp-stable-1',
            isDiscount: false,
            isAdvanceTaken: false
        };

        const sanitized = sanitizePayloadForTable('expenses', rawExpense);

        expect(sanitized).toEqual({
            id: 'exp-555',
            user_id: 'user-001',
            description: 'شراء أسمدة ومبيدات',
            date: '2026-03-20',
            amount: 1500,
            category_id: 'cat-db-real-uuid',
            cycle_id: 'cycle-789',
            supplier_id: 'supp-456',
            payment_method: 'cash',
            is_establishment: false
        });

        expect(sanitized).not.toHaveProperty('categoryName');
        expect(sanitized).not.toHaveProperty('supplierName');
        expect(sanitized).not.toHaveProperty('_stable_id');
        expect(sanitized).not.toHaveProperty('isDiscount');
    });

    it('removes computed performance fields from cycle payloads', () => {
        const rawCycle = {
            id: 'cycle-101',
            user_id: 'user-001',
            name: 'طماطم مكشوف 2026',
            seed_type: '023 هجين',
            plant_count: 10000,
            unit_of_measure: 'plants',
            area_in_feddans: 2.5,
            asset_id: 'asset-1',
            start_date: '2026-01-01',
            status: 'active',
            responsible_farmer_id: 'farmer-1',
            farmer_share_percentage: 10,
            // Calculated fields to strip
            revenue: 150000,
            expenses: 60000,
            profit: 75000,
            farmerShare: 15000,
            totalProductionKg: 25000,
            health: 95,
            returnOnInvestment: 125,
            expenseBreakdown: []
        };

        const sanitized = sanitizePayloadForTable('cycles', rawCycle);

        expect(sanitized).toEqual({
            id: 'cycle-101',
            user_id: 'user-001',
            name: 'طماطم مكشوف 2026',
            seed_type: '023 هجين',
            plant_count: 10000,
            unit_of_measure: 'plants',
            area_in_feddans: 2.5,
            asset_id: 'asset-1',
            start_date: '2026-01-01',
            status: 'active',
            responsible_farmer_id: 'farmer-1',
            farmer_share_percentage: 10
        });

        expect(sanitized).not.toHaveProperty('revenue');
        expect(sanitized).not.toHaveProperty('profit');
        expect(sanitized).not.toHaveProperty('totalProductionKg');
        expect(sanitized).not.toHaveProperty('expenseBreakdown');
    });

    it('sanitizes advance payloads properly', () => {
        const rawAdvance = {
            id: 'adv-01',
            user_id: 'user-001',
            person_id: 'person-99',
            personName: 'محمود أحمد',
            amount: 500,
            date: '2026-03-10',
            cycle_id: 'cycle-789',
            reason: 'سلفة أسبوعية',
            fund: 'الخزينة الرئيسية',
            _stable_id: 'st-adv-01',
            runningBalance: 2500
        };

        const sanitized = sanitizePayloadForTable('advances', rawAdvance);

        expect(sanitized).toEqual({
            id: 'adv-01',
            user_id: 'user-001',
            person_id: 'person-99',
            amount: 500,
            date: '2026-03-10',
            cycle_id: 'cycle-789',
            reason: 'سلفة أسبوعية',
            fund: 'الخزينة الرئيسية'
        });

        expect(sanitized).not.toHaveProperty('personName');
        expect(sanitized).not.toHaveProperty('_stable_id');
        expect(sanitized).not.toHaveProperty('runningBalance');
    });

    it('uses fallback sanitization for unknown tables by removing common computed fields', () => {
        const unknownEntity = {
            id: 'custom-1',
            title: 'سجل تجريبي',
            _stable_id: 'temp-custom-1',
            categoryName: 'تصنيف وهمي',
            farmerName: 'مزارع 1',
            supplierName: 'مورد 1',
            runningBalance: 1000,
            pending_sync: true,
            valid_field: 'قيمة صحيحة'
        };

        const sanitized = sanitizePayloadForTable('custom_unknown_table', unknownEntity);

        expect(sanitized).toEqual({
            id: 'custom-1',
            title: 'سجل تجريبي',
            valid_field: 'قيمة صحيحة'
        });

        expect(sanitized).not.toHaveProperty('_stable_id');
        expect(sanitized).not.toHaveProperty('categoryName');
        expect(sanitized).not.toHaveProperty('farmerName');
        expect(sanitized).not.toHaveProperty('supplierName');
        expect(sanitized).not.toHaveProperty('runningBalance');
        expect(sanitized).not.toHaveProperty('pending_sync');
    });
});
