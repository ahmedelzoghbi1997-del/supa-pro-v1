
import { Dexie, type Table } from 'dexie';
import type { 
    Invoice, Expense, Cycle, Person, Advance, Supplier, SupplierPayment, Farmer, FarmerWithdrawal, 
    ExpenseCategory, Asset, InvoicePriceItem, InvoiceDeductionItem,
    BankAccount, BankTransaction, DailyLog, VirtualMember, PartnerDebt
} from '../types';

export interface CacheEntry<T = any> {
    key: string;
    data: T;
    updated_at?: number;
}

export interface SyncQueueItem {
    id?: number;
    table: string;
    action: 'insert' | 'update' | 'delete';
    recordId?: string;
    payload: any;
    created_at: number;
    retryCount?: number;
    error?: string;
    status?: 'pending' | 'failed' | 'synced';
}

// v13: دعم الـ Sync Queue وإدارة البيانات غير المرفوعة أثناء عدم توفر الإنترنت (Offline-First)
export class AlMohasebLocalDB extends Dexie {
    invoices!: Table<Invoice>;
    invoice_price_items!: Table<InvoicePriceItem>;
    invoice_deductions!: Table<InvoiceDeductionItem>;
    expenses!: Table<Expense>;
    cycles!: Table<Cycle>;
    persons!: Table<Person>;
    advances!: Table<Advance>;
    suppliers!: Table<Supplier>;
    supplier_payments!: Table<SupplierPayment>;
    farmers!: Table<Farmer>;
    farmer_withdrawals!: Table<FarmerWithdrawal>;
    expense_categories!: Table<ExpenseCategory>;
    assets!: Table<Asset>;
    bank_accounts!: Table<BankAccount>;
    bank_transactions!: Table<BankTransaction>;
    daily_logs!: Table<DailyLog>;
    virtual_members!: Table<VirtualMember>;
    partner_debts!: Table<PartnerDebt>;
    cache!: Table<CacheEntry, string>;
    sync_queue!: Table<SyncQueueItem, number>;

    constructor() {
        super('AlMohaseb_Local_V11');
        // FIX: Casting this to any to access the version method, as inheritance may not be correctly resolved by the compiler.
        (this as any).version(11).stores({
            invoices: 'id, cycle_id, date, market',
            invoice_price_items: '++id, invoice_id',
            invoice_deductions: '++id, invoice_id',
            expenses: 'id, cycle_id, category_id, date',
            cycles: 'id, status, start_date',
            persons: 'id, name',
            advances: 'id, person_id, cycle_id, date',
            suppliers: 'id, name',
            supplier_payments: 'id, supplier_id, cycle_id, date',
            farmers: 'id, name',
            farmer_withdrawals: 'id, farmer_id, cycle_id, date',
            expense_categories: 'id, name, is_establishment',
            assets: 'id, name',
        });
        (this as any).version(12).stores({
            bank_accounts: 'id, name',
            bank_transactions: 'id, account_id, date',
            daily_logs: 'id, date',
            virtual_members: 'id, owner_id',
            partner_debts: 'id, partner_id',
            cache: 'key'
        });
        (this as any).version(13).stores({
            sync_queue: '++id, table, action, created_at'
        });
    }
}

export const db = new AlMohasebLocalDB();

export const hardResetLocalDB = async () => {
    try {
        // FIX: Casting db to any to access the Dexie instance method delete().
        await (db as any).delete();
        window.localStorage.clear();
        const dbs = await window.indexedDB.databases();
        for (const database of dbs) {
            if (database.name && database.name.includes('AlMohaseb')) {
                window.indexedDB.deleteDatabase(database.name);
            }
        }
    } catch (e) {
        console.error("Reset failed", e);
    } finally {
        window.location.href = '/';
    }
};
