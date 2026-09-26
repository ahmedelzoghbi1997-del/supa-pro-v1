import { describe, it, expect } from 'vitest';
import type { Invoice, InvoicePriceItem, InvoiceDeductionItem } from '../types';

describe('Invoice Hydration - stable_id and id matching', () => {
  function hydrateInvoices(
    invoices: Invoice[],
    invoicePriceItems: InvoicePriceItem[],
    invoiceDeductions: InvoiceDeductionItem[]
  ) {
    const priceItemsMap = new Map<string, InvoicePriceItem[]>();
    for (const item of invoicePriceItems) {
      if (item.invoice_id === undefined || item.invoice_id === null) continue;
      const key = String(item.invoice_id);
      const list = priceItemsMap.get(key);
      if (list) {
        list.push(item);
      } else {
        priceItemsMap.set(key, [item]);
      }
    }

    const deductionsMap = new Map<string, InvoiceDeductionItem[]>();
    for (const item of invoiceDeductions) {
      if (item.invoice_id === undefined || item.invoice_id === null) continue;
      const key = String(item.invoice_id);
      const list = deductionsMap.get(key);
      if (list) {
        list.push(item);
      } else {
        deductionsMap.set(key, [item]);
      }
    }

    return invoices.map((inv) => {
      const invIdStr = String(inv.id);
      const stableIdStr = inv._stable_id ? String(inv._stable_id) : null;

      let price_items = priceItemsMap.get(invIdStr) || [];
      if (price_items.length === 0 && stableIdStr && stableIdStr !== invIdStr) {
        price_items = priceItemsMap.get(stableIdStr) || [];
      }

      let deductions = deductionsMap.get(invIdStr) || [];
      if (deductions.length === 0 && stableIdStr && stableIdStr !== invIdStr) {
        deductions = deductionsMap.get(stableIdStr) || [];
      }

      return {
        ...inv,
        price_items,
        deductions,
      };
    });
  }

  it('correctly hydrates items linked directly to invoice id', () => {
    const invoices: Invoice[] = [
      { id: '101', _stable_id: 'stable-uuid-101', cycle_id: 'c1', date: '2026-01-01' } as any,
    ];
    const priceItems: InvoicePriceItem[] = [
      { id: 1, invoice_id: '101', category: 'طماطم', box_count: 10, price_per_box: 50, total_price: 500 } as any,
    ];
    const deductions: InvoiceDeductionItem[] = [
      { id: 10, invoice_id: '101', name: 'عمولة', amount: 50 } as any,
    ];

    const result = hydrateInvoices(invoices, priceItems, deductions);
    expect(result[0].price_items).toHaveLength(1);
    expect(result[0].price_items[0].category).toBe('طماطم');
    expect(result[0].deductions).toHaveLength(1);
    expect(result[0].deductions[0].name).toBe('عمولة');
  });

  it('correctly hydrates items linked to _stable_id fallback when id matches nothing', () => {
    const invoices: Invoice[] = [
      { id: '202', _stable_id: 'stable-uuid-202', cycle_id: 'c1', date: '2026-01-01' } as any,
    ];
    // Notice items are linked to invoice_id = 'stable-uuid-202' rather than '202'
    const priceItems: InvoicePriceItem[] = [
      { id: 2, invoice_id: 'stable-uuid-202', category: 'خيار', box_count: 5, price_per_box: 40, total_price: 200 } as any,
    ];
    const deductions: InvoiceDeductionItem[] = [
      { id: 20, invoice_id: 'stable-uuid-202', name: 'مشال', amount: 20 } as any,
    ];

    const result = hydrateInvoices(invoices, priceItems, deductions);
    expect(result[0].price_items).toHaveLength(1);
    expect(result[0].price_items[0].category).toBe('خيار');
    expect(result[0].deductions).toHaveLength(1);
    expect(result[0].deductions[0].name).toBe('مشال');
  });

  it('returns identical hydrated items whether linked via id or _stable_id', () => {
    const invA: Invoice = { id: '301', _stable_id: 'stable-uuid-301' } as any;
    const invB: Invoice = { id: '302', _stable_id: 'stable-uuid-302' } as any;

    const priceItems: InvoicePriceItem[] = [
      { id: 100, invoice_id: '301', category: 'كوسة', total_price: 300 } as any,
      { id: 200, invoice_id: 'stable-uuid-302', category: 'كوسة', total_price: 300 } as any,
    ];

    const result = hydrateInvoices([invA, invB], priceItems, []);
    expect(result[0].price_items[0].category).toBe(result[1].price_items[0].category);
    expect(result[0].price_items[0].total_price).toBe(result[1].price_items[0].total_price);
  });
});
