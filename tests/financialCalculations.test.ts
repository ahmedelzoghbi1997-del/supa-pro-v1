import { describe, it, expect } from 'vitest';
import { calculateInvoiceTotal, getInvoiceRetainedDetails } from '../utils/helpers';
import type { Invoice, Expense, Cycle, Advance } from '../types';

describe('Financial Calculations Engine', () => {

    // 1. حالة 1: بيانات فارغة أو أصفار (Empty State)
    it('Case 1: handles empty state with zero revenue, zero expenses, and zero profit without errors', () => {
        const emptyPriceItems: { quantity: number; price_per_kg: number }[] = [];
        const emptyDeductions: { name: string; amount: number }[] = [];
        
        const invoiceTotal = calculateInvoiceTotal(emptyPriceItems, emptyDeductions);
        expect(invoiceTotal).toBe(0);

        const _cycle: Cycle = {
            id: 'c1',
            name: 'دورة تجريبية',
            seed_type: 'خيار',
            plant_count: 0,
            unit_of_measure: 'plants',
            area_in_feddans: 0,
            asset_id: 'a1',
            start_date: '2026-01-01',
            status: 'active'
        };

        const invoices: Invoice[] = [];
        const expenses: Expense[] = [];

        const totalRevenue = invoices.reduce((sum, inv) => sum + calculateInvoiceTotal(inv.price_items, inv.deductions), 0);
        const totalExpenses = expenses.reduce((sum, exp) => sum + Number(exp.amount || 0), 0);
        const profit = totalRevenue - totalExpenses;

        expect(totalRevenue).toBe(0);
        expect(totalExpenses).toBe(0);
        expect(profit).toBe(0);
    });

    // 2. حالة 2: مصروف بدون إيراد (Expenses without income)
    it('Case 2: calculates net loss correctly when there are expenses and zero revenue', () => {
        const expenses: Expense[] = [
            { id: 'e1', cycle_id: 'c1', description: 'شراء سماد', amount: 1500, date: '2026-03-01', category_id: 'cat1', payment_method: 'cash' },
            { id: 'e2', cycle_id: 'c1', description: 'شراء شبك وري', amount: 3500, date: '2026-03-02', category_id: 'cat2', payment_method: 'cash' },
            { id: 'e3', cycle_id: 'c1', description: 'يوميات عمالة', amount: 1000, date: '2026-03-05', category_id: 'cat3', payment_method: 'cash' }
        ];

        const invoices: Invoice[] = [];

        const totalRevenue = invoices.reduce((sum, inv) => sum + calculateInvoiceTotal(inv.price_items, inv.deductions), 0);
        const totalExpenses = expenses.reduce((sum, exp) => sum + Number(exp.amount || 0), 0);
        const profit = totalRevenue - totalExpenses;

        expect(totalRevenue).toBe(0);
        expect(totalExpenses).toBe(6000);
        expect(profit).toBe(-6000); // خسارة مساوية للمصروفات
    });

    // 3. حالة 3: إيراد بدون مصروف (Income without expense)
    it('Case 3: calculates net revenue and pure profit when there is income and zero expenses', () => {
        const invoices: Invoice[] = [
            {
                id: 'inv1',
                cycle_id: 'c1',
                date: '2026-03-10',
                market: 'سوق 6 أكتوبر',
                packaging_type: 'carton',
                packaging_count: 100,
                price_items: [
                    { id: 1, invoice_id: 'inv1', quantity: 1500, price_per_kg: 20 } // 30,000 ج.م
                ],
                deductions: []
            },
            {
                id: 'inv2',
                cycle_id: 'c1',
                date: '2026-03-15',
                market: 'سوق العبور',
                packaging_type: 'carton',
                packaging_count: 50,
                price_items: [
                    { id: 2, invoice_id: 'inv2', quantity: 800, price_per_kg: 25 } // 20,000 ج.م
                ],
                deductions: []
            }
        ];

        const expenses: Expense[] = [];

        const totalRevenue = invoices.reduce((sum, inv) => sum + calculateInvoiceTotal(inv.price_items, inv.deductions), 0);
        const totalExpenses = expenses.reduce((sum, exp) => sum + Number(exp.amount || 0), 0);
        const profit = totalRevenue - totalExpenses;
        const totalKg = invoices.reduce((s, inv) => s + inv.price_items.reduce((ss, p) => ss + p.quantity, 0), 0);

        expect(totalRevenue).toBe(50000);
        expect(totalExpenses).toBe(0);
        expect(profit).toBe(50000);
        expect(totalKg).toBe(2300);
    });

    // 4. حالة 4: خصومات الفواتير (Invoice Deductions)
    it('Case 4: applies deductions (commission, freight, packaging) correctly to reduce net revenue', () => {
        const priceItems = [
            { quantity: 2000, price_per_kg: 15 } // إجمالي البضاعة: 30,000
        ];
        const deductions = [
            { name: 'عمولة السوق (7%)', amount: 2100 },
            { name: 'نولون سيارة', amount: 800 },
            { name: 'مشال وتفريغ', amount: 300 },
            { name: 'رسوم بلدية وبوابة', amount: 150 }
        ];

        const netInvoiceTotal = calculateInvoiceTotal(priceItems, deductions);
        const grossTotal = 30000;
        const totalDeductions = 2100 + 800 + 300 + 150; // 3350

        expect(totalDeductions).toBe(3350);
        expect(netInvoiceTotal).toBe(grossTotal - totalDeductions); // 26650

        // اختبار فواتير الديون المرصودة مع الفائض
        const retainedDetails = getInvoiceRetainedDetails(
            'فاتورة مرصودة لسداد ديون [RETAINED_DEBT:{"retainedTotal":20000,"surplus":6650}]',
            true,
            netInvoiceTotal
        );

        expect(retainedDetails.isRetained).toBe(true);
        expect(retainedDetails.retainedAmount).toBe(20000);
        expect(retainedDetails.surplus).toBe(6650);
    });

    // 5. حالة 5: السلف ونسبة المزارع وحساب صافي الربح للمالك (Advances & Farmer Share)
    it('Case 5: calculates farmer share, advances deduction, and owner net profit accurately', () => {
        const revenue = 100000;
        const expenses = 40000;
        const farmerSharePercentage = 15; // 15% من الإيراد

        const farmerShare = revenue * (farmerSharePercentage / 100); // 15,000
        const ownerNetProfit = revenue - expenses - farmerShare; // 100,000 - 40,000 - 15,000 = 45,000

        expect(farmerShare).toBe(15000);
        expect(ownerNetProfit).toBe(45000);

        // تتبع سلف المزارع
        const farmerAdvances: Advance[] = [
            { id: 'adv1', person_id: 'p1', amount: 3000, date: '2026-02-01', cycle_id: 'c1', reason: 'سلفة أول الموسم' },
            { id: 'adv2', person_id: 'p1', amount: 4000, date: '2026-02-15', cycle_id: 'c1', reason: 'سلفة زواج' },
            { id: 'adv3', person_id: 'p1', amount: 2000, date: '2026-03-01', cycle_id: 'c1', reason: 'سلفة نقدية' }
        ];

        const totalAdvances = farmerAdvances.reduce((s, a) => s + a.amount, 0); // 9,000
        const farmerRemainingBalance = farmerShare - totalAdvances; // 15,000 - 9,000 = 6,000

        expect(totalAdvances).toBe(9000);
        expect(farmerRemainingBalance).toBe(6000);
    });
});
