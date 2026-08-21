/**
 * Whitelist payload formatting for Supabase database operations.
 * Ensures only explicitly allowed columns are sent to Supabase tables,
 * preventing extra computed fields or runtime metadata from breaking updates.
 */

// Invoices table
export interface DbInvoicePayload {
    id?: string;
    user_id?: string;
    description?: string;
    date: string;
    cycle_id: string;
    market: string;
    packaging_type: 'carton' | 'cage';
    packaging_count?: number;
    carton_count?: number;
    cage_count?: number;
    created_at?: string;
}

export const sanitizeInvoicePayload = (obj: any): Partial<DbInvoicePayload> => {
    if (!obj || typeof obj !== 'object') return {};
    const allowedKeys: (keyof DbInvoicePayload)[] = [
        'id', 'user_id', 'description', 'date', 'cycle_id', 'market',
        'packaging_type', 'packaging_count', 'carton_count', 'cage_count', 'created_at'
    ];
    const clean: any = {};
    for (const key of allowedKeys) {
        if (key in obj && obj[key] !== undefined) {
            clean[key] = obj[key];
        }
    }
    return clean;
};

// Invoice Price Items table
export interface DbInvoicePriceItemPayload {
    id?: number;
    user_id?: string;
    invoice_id: string;
    quantity: number;
    price_per_kg: number;
    packaging_count?: number;
}

export const sanitizeInvoicePriceItemPayload = (obj: any): Partial<DbInvoicePriceItemPayload> => {
    if (!obj || typeof obj !== 'object') return {};
    const allowedKeys: (keyof DbInvoicePriceItemPayload)[] = [
        'id', 'user_id', 'invoice_id', 'quantity', 'price_per_kg', 'packaging_count'
    ];
    const clean: any = {};
    for (const key of allowedKeys) {
        if (key in obj && obj[key] !== undefined) {
            clean[key] = obj[key];
        }
    }
    return clean;
};

// Invoice Deductions table
export interface DbInvoiceDeductionPayload {
    id?: number;
    user_id?: string;
    invoice_id: string;
    name: string;
    amount: number;
}

export const sanitizeInvoiceDeductionPayload = (obj: any): Partial<DbInvoiceDeductionPayload> => {
    if (!obj || typeof obj !== 'object') return {};
    const allowedKeys: (keyof DbInvoiceDeductionPayload)[] = [
        'id', 'user_id', 'invoice_id', 'name', 'amount'
    ];
    const clean: any = {};
    for (const key of allowedKeys) {
        if (key in obj && obj[key] !== undefined) {
            clean[key] = obj[key];
        }
    }
    return clean;
};

// Expenses table
export interface DbExpensePayload {
    id?: string;
    user_id?: string;
    description: string;
    date: string;
    amount: number;
    category_id: string;
    cycle_id: string;
    supplier_id?: string | null;
    payment_method?: 'cash' | 'credit';
    is_establishment?: boolean;
    shift_type?: 'morning' | 'evening' | 'full_day' | null;
    created_at?: string;
}

export const sanitizeExpensePayload = (obj: any): Partial<DbExpensePayload> => {
    if (!obj || typeof obj !== 'object') return {};
    const allowedKeys: (keyof DbExpensePayload)[] = [
        'id', 'user_id', 'description', 'date', 'amount', 'category_id',
        'cycle_id', 'supplier_id', 'payment_method', 'is_establishment',
        'shift_type', 'created_at'
    ];
    const clean: any = {};
    // Handle category restoring if _original_category_id is present
    const categoryId = obj._original_category_id || obj.category_id;
    for (const key of allowedKeys) {
        if (key === 'category_id') {
            if (categoryId !== undefined) clean.category_id = categoryId;
        } else if (key in obj && obj[key] !== undefined) {
            clean[key] = obj[key];
        }
    }
    return clean;
};

// Cycles table
export interface DbCyclePayload {
    id?: string;
    user_id?: string;
    name: string;
    seed_type: string;
    plant_count: number;
    unit_of_measure: 'plants' | 'area';
    area_in_feddans: number;
    asset_id: string;
    start_date: string;
    production_start_date?: string | null;
    status: 'active' | 'closed' | 'archived';
    responsible_farmer_id?: string | null;
    farmer_share_percentage?: number;
    target_yield?: number;
    notes?: string | null;
    created_at?: string;
}

export const sanitizeCyclePayload = (obj: any): Partial<DbCyclePayload> => {
    if (!obj || typeof obj !== 'object') return {};
    const allowedKeys: (keyof DbCyclePayload)[] = [
        'id', 'user_id', 'name', 'seed_type', 'plant_count', 'unit_of_measure',
        'area_in_feddans', 'asset_id', 'start_date', 'production_start_date',
        'status', 'responsible_farmer_id', 'farmer_share_percentage', 'target_yield',
        'notes', 'created_at'
    ];
    const clean: any = {};
    for (const key of allowedKeys) {
        if (key in obj && obj[key] !== undefined) {
            clean[key] = obj[key];
        }
    }
    return clean;
};

// Persons table
export interface DbPersonPayload {
    id?: string;
    user_id?: string;
    name: string;
    created_at?: string;
}

export const sanitizePersonPayload = (obj: any): Partial<DbPersonPayload> => {
    if (!obj || typeof obj !== 'object') return {};
    const allowedKeys: (keyof DbPersonPayload)[] = ['id', 'user_id', 'name', 'created_at'];
    const clean: any = {};
    for (const key of allowedKeys) {
        if (key in obj && obj[key] !== undefined) {
            clean[key] = obj[key];
        }
    }
    return clean;
};

// Advances table
export interface DbAdvancePayload {
    id?: string;
    user_id?: string;
    person_id: string;
    amount: number;
    date: string;
    cycle_id: string;
    reason?: string;
    fund?: string;
    source_ref_id?: string;
    source_type?: string;
    is_retained_debt?: boolean;
    created_at?: string;
}

export const sanitizeAdvancePayload = (obj: any): Partial<DbAdvancePayload> => {
    if (!obj || typeof obj !== 'object') return {};
    const allowedKeys: (keyof DbAdvancePayload)[] = [
        'id', 'user_id', 'person_id', 'amount', 'date', 'cycle_id',
        'reason', 'fund', 'source_ref_id', 'source_type', 'is_retained_debt', 'created_at'
    ];
    const clean: any = {};
    for (const key of allowedKeys) {
        if (key in obj && obj[key] !== undefined) {
            clean[key] = obj[key];
        }
    }
    return clean;
};

// Suppliers table
export interface DbSupplierPayload {
    id?: string;
    user_id?: string;
    name: string;
    opening_balance?: number;
    created_at?: string;
}

export const sanitizeSupplierPayload = (obj: any): Partial<DbSupplierPayload> => {
    if (!obj || typeof obj !== 'object') return {};
    const allowedKeys: (keyof DbSupplierPayload)[] = ['id', 'user_id', 'name', 'opening_balance', 'created_at'];
    const clean: any = {};
    for (const key of allowedKeys) {
        if (key in obj && obj[key] !== undefined) {
            clean[key] = obj[key];
        }
    }
    return clean;
};

// Supplier Payments table
export interface DbSupplierPaymentPayload {
    id?: string;
    user_id?: string;
    supplier_id: string;
    cycle_id: string;
    amount: number;
    date: string;
    description?: string;
    created_at?: string;
}

export const sanitizeSupplierPaymentPayload = (obj: any): Partial<DbSupplierPaymentPayload> => {
    if (!obj || typeof obj !== 'object') return {};
    const allowedKeys: (keyof DbSupplierPaymentPayload)[] = [
        'id', 'user_id', 'supplier_id', 'cycle_id', 'amount', 'date', 'description', 'created_at'
    ];
    const clean: any = {};
    for (const key of allowedKeys) {
        if (key in obj && obj[key] !== undefined) {
            clean[key] = obj[key];
        }
    }
    return clean;
};

// Farmers table
export interface DbFarmerPayload {
    id?: string;
    user_id?: string;
    name: string;
    created_at?: string;
}

export const sanitizeFarmerPayload = (obj: any): Partial<DbFarmerPayload> => {
    if (!obj || typeof obj !== 'object') return {};
    const allowedKeys: (keyof DbFarmerPayload)[] = ['id', 'user_id', 'name', 'created_at'];
    const clean: any = {};
    for (const key of allowedKeys) {
        if (key in obj && obj[key] !== undefined) {
            clean[key] = obj[key];
        }
    }
    return clean;
};

// Farmer Withdrawals table
export interface DbFarmerWithdrawalPayload {
    id?: string;
    user_id?: string;
    farmer_id: string;
    cycle_id: string;
    amount: number;
    date: string;
    description?: string;
    created_at?: string;
}

export const sanitizeFarmerWithdrawalPayload = (obj: any): Partial<DbFarmerWithdrawalPayload> => {
    if (!obj || typeof obj !== 'object') return {};
    const allowedKeys: (keyof DbFarmerWithdrawalPayload)[] = [
        'id', 'user_id', 'farmer_id', 'cycle_id', 'amount', 'date', 'description', 'created_at'
    ];
    const clean: any = {};
    for (const key of allowedKeys) {
        if (key in obj && obj[key] !== undefined) {
            clean[key] = obj[key];
        }
    }
    return clean;
};

// Expense Categories table
export interface DbExpenseCategoryPayload {
    id?: string;
    user_id?: string;
    name: string;
    is_supplier_category: boolean;
    is_labor_category?: boolean;
    is_discount_category?: boolean;
    created_at?: string;
}

export const sanitizeExpenseCategoryPayload = (obj: any): Partial<DbExpenseCategoryPayload> => {
    if (!obj || typeof obj !== 'object') return {};
    const allowedKeys: (keyof DbExpenseCategoryPayload)[] = [
        'id', 'user_id', 'name', 'is_supplier_category', 'is_labor_category', 'is_discount_category', 'created_at'
    ];
    const clean: any = {};
    for (const key of allowedKeys) {
        if (key in obj && obj[key] !== undefined) {
            clean[key] = obj[key];
        }
    }
    return clean;
};

// Assets table
export interface DbAssetPayload {
    id?: string;
    user_id?: string;
    name: string;
    establishment_date: string;
    establishment_cost: number;
    created_at?: string;
}

export const sanitizeAssetPayload = (obj: any): Partial<DbAssetPayload> => {
    if (!obj || typeof obj !== 'object') return {};
    const allowedKeys: (keyof DbAssetPayload)[] = [
        'id', 'user_id', 'name', 'establishment_date', 'establishment_cost', 'created_at'
    ];
    const clean: any = {};
    for (const key of allowedKeys) {
        if (key in obj && obj[key] !== undefined) {
            clean[key] = obj[key];
        }
    }
    return clean;
};

// Daily Logs table
export interface DbDailyLogPayload {
    id?: string;
    user_id?: string;
    cycle_id: string;
    date: string;
    tasks: any[];
    notes?: string | null;
    created_at?: string;
}

export const sanitizeDailyLogPayload = (obj: any): Partial<DbDailyLogPayload> => {
    if (!obj || typeof obj !== 'object') return {};
    const allowedKeys: (keyof DbDailyLogPayload)[] = [
        'id', 'user_id', 'cycle_id', 'date', 'tasks', 'notes', 'created_at'
    ];
    const clean: any = {};
    for (const key of allowedKeys) {
        if (key in obj && obj[key] !== undefined) {
            clean[key] = obj[key];
        }
    }
    return clean;
};

// Bank Accounts table
export interface DbBankAccountPayload {
    id?: string;
    user_id?: string;
    name: string;
    initial_balance: number;
    created_at?: string;
}

export const sanitizeBankAccountPayload = (obj: any): Partial<DbBankAccountPayload> => {
    if (!obj || typeof obj !== 'object') return {};
    const allowedKeys: (keyof DbBankAccountPayload)[] = [
        'id', 'user_id', 'name', 'initial_balance', 'created_at'
    ];
    const clean: any = {};
    for (const key of allowedKeys) {
        if (key in obj && obj[key] !== undefined) {
            clean[key] = obj[key];
        }
    }
    return clean;
};

// Bank Transactions table
export interface DbBankTransactionPayload {
    id?: string;
    user_id?: string;
    account_id: string;
    cycle_id?: string | null;
    type: 'deposit' | 'withdrawal';
    amount: number;
    date: string;
    description?: string | null;
    created_at?: string;
}

export const sanitizeBankTransactionPayload = (obj: any): Partial<DbBankTransactionPayload> => {
    if (!obj || typeof obj !== 'object') return {};
    const allowedKeys: (keyof DbBankTransactionPayload)[] = [
        'id', 'user_id', 'account_id', 'cycle_id', 'type', 'amount', 'date', 'description', 'created_at'
    ];
    const clean: any = {};
    for (const key of allowedKeys) {
        if (key in obj && obj[key] !== undefined) {
            clean[key] = obj[key];
        }
    }
    return clean;
};

// Partner Debts table
export interface DbPartnerDebtPayload {
    id?: string;
    user_id?: string;
    description: string;
    total_amount: number;
    partner_allocations: Record<string, number>;
    date: string;
    partner_repayments?: Record<string, number>;
    entered_treasury?: boolean;
    cycle_id?: string | null;
    created_at?: string;
}

export const sanitizePartnerDebtPayload = (obj: any): Partial<DbPartnerDebtPayload> => {
    if (!obj || typeof obj !== 'object') return {};
    const allowedKeys: (keyof DbPartnerDebtPayload)[] = [
        'id', 'user_id', 'description', 'total_amount', 'partner_allocations',
        'date', 'partner_repayments', 'entered_treasury', 'cycle_id', 'created_at'
    ];
    const clean: any = {};
    for (const key of allowedKeys) {
        if (key in obj && obj[key] !== undefined) {
            clean[key] = obj[key];
        }
    }
    // Handle camelCase aliases if passed
    if (clean.total_amount === undefined && obj.totalAmount !== undefined) clean.total_amount = obj.totalAmount;
    if (clean.partner_allocations === undefined && obj.partnerAllocations !== undefined) clean.partner_allocations = obj.partnerAllocations;
    if (clean.partner_repayments === undefined && obj.partnerRepayments !== undefined) clean.partner_repayments = obj.partnerRepayments;
    return clean;
};

// Generic dispatcher for table sanitization
export const sanitizePayloadForTable = (table: string, obj: any): Record<string, any> => {
    switch (table) {
        case 'invoices': return sanitizeInvoicePayload(obj);
        case 'invoice_price_items': return sanitizeInvoicePriceItemPayload(obj);
        case 'invoice_deductions': return sanitizeInvoiceDeductionPayload(obj);
        case 'expenses': return sanitizeExpensePayload(obj);
        case 'cycles': return sanitizeCyclePayload(obj);
        case 'persons': return sanitizePersonPayload(obj);
        case 'advances': return sanitizeAdvancePayload(obj);
        case 'suppliers': return sanitizeSupplierPayload(obj);
        case 'supplier_payments': return sanitizeSupplierPaymentPayload(obj);
        case 'farmers': return sanitizeFarmerPayload(obj);
        case 'farmer_withdrawals': return sanitizeFarmerWithdrawalPayload(obj);
        case 'expense_categories': return sanitizeExpenseCategoryPayload(obj);
        case 'assets': return sanitizeAssetPayload(obj);
        case 'daily_logs': return sanitizeDailyLogPayload(obj);
        case 'bank_accounts': return sanitizeBankAccountPayload(obj);
        case 'bank_transactions': return sanitizeBankTransactionPayload(obj);
        case 'partner_debts': return sanitizePartnerDebtPayload(obj);
        default: {
            // Safe fallback: strip known frontend/calculated properties
            if (!obj || typeof obj !== 'object') return {};
            const {
                _stable_id, _original_category_id, cycle: _cycle, categoryName: _categoryName,
                isDiscount: _isDiscount, isAdvanceTaken: _isAdvanceTaken, isAdvanceRepayment: _isAdvanceRepayment, isWageWork: _isWageWork,
                isSettlement: _isSettlement, fund: _fund, supplierName: _supplierName, farmerName: _farmerName, personName: _personName,
                cyclePerformances: _cyclePerformances, runningBalance: _runningBalance, pending_sync: _pending_sync, ...rest
            } = obj;
            return rest;
        }
    }
};
