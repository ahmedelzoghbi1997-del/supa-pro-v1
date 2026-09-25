import { useMemo } from 'react';
import { calculateInvoiceTotal, getInvoiceRetainedDetails } from '../utils/helpers';
import type { 
    Cycle, 
    Invoice, 
    Expense, 
    Advance, 
    Farmer, 
    FarmerWithdrawal, 
    SupplierPayment, 
    BankTransaction, 
    PartnerDebt, 
    TreasuryFund,
    ExpenseCategory 
} from '../types';

export interface UseFinancialCalculationsParams {
    cycles: Cycle[];
    hydratedInvoices: Invoice[];
    rawExpensesHydrated: (Expense & {
        categoryName?: string;
        isDiscount?: boolean;
        isAdvanceTaken?: boolean;
        isAdvanceRepayment?: boolean;
        isSettlement?: boolean;
        isWageWork?: boolean;
        _original_category_id?: string;
    })[];
    hydratedExpenses: Expense[];
    farmers: Farmer[];
    advances: Advance[];
    farmerWithdrawals: FarmerWithdrawal[];
    supplierPayments: SupplierPayment[];
    bankTransactions: BankTransaction[];
    partnerDebts: PartnerDebt[];
    expenseCategories: ExpenseCategory[];
    rpcData: any;
    isPhase2Loading: boolean;
    isExternalLabor: (exp: Expense) => boolean;
    isolateLaborAccount?: boolean;
}

const safeNum = (val: unknown): number => {
    const n = Number(val);
    return isNaN(n) ? 0 : n;
};

// Backward compatible helper to check if invoice is retained (non-cash)
const _isInvoiceRetained = (i: Invoice): boolean => {
    return Boolean(i.is_retained_debt) || 
           Boolean(i.description?.includes('[مرصودة]')) || 
           Boolean(i.description?.includes('[RETAINED_DEBT]'));
};

// Helper to calculate exact cash inflow from an invoice (full net if normal, or surplus if retained)
const getInvoiceCashRevenue = (i: Invoice): number => {
    const net = calculateInvoiceTotal(i.price_items, i.deductions);
    const { isRetained, surplus } = getInvoiceRetainedDetails(i.description, i.is_retained_debt, net);
    return isRetained ? surplus : net;
};

// Backward compatible helper to check if advance is external debt
const isAdvanceExternalDebt = (a: Advance): boolean => {
    return a.funding_source === 'external_debt' || 
           Boolean(a.reason?.includes('[EXTERNAL_DEBT]')) || 
           Boolean(a.reason?.includes('المعلم'));
};

// Backward compatible helper to check if advance entered treasury
const isAdvanceEnteredTreasury = (a: Advance): boolean => {
    return a.is_entered_treasury === true || 
           /خزن|خزنة|تمويل/.test(a.reason || '') || 
           Boolean(a.reason?.includes('[ENTERED_TREASURY]'));
};

// Backward compatible helper to check if advance repayment was paid from treasury
const isAdvancePaidFromTreasury = (a: Advance): boolean => {
    return a.is_paid_from_treasury === true || 
           Boolean(a.reason?.includes('[PAID_FROM_TREASURY]')) || 
           (/سداد|تسديد/.test(a.reason || '') && /خزن|خزنة/.test(a.reason || ''));
};

// Backward compatible helper to check if advance is a non-cash invoice repayment
const isAdvanceInvoiceRepayment = (a: Advance): boolean => {
    return Boolean(a.is_retained_debt) || 
           a.source_type === 'invoice' || 
           Boolean(a.source_ref_id) || 
           Boolean(a.reason?.includes('[INVOICE_REPAYMENT:'));
};

// Backward compatible helper for joint debt expense
const isExpenseJointDebt = (e: any): boolean => {
    return e.is_joint_debt_payment === true || 
           e.categoryName === 'سداد ديون والتزامات مشتركة' || 
           e.category === 'سداد ديون والتزامات مشتركة' || 
           e.category_id === 'joint_debt_payment';
};

export function useFinancialCalculations({
    cycles,
    hydratedInvoices,
    rawExpensesHydrated,
    hydratedExpenses,
    farmers,
    advances,
    farmerWithdrawals,
    supplierPayments,
    bankTransactions,
    partnerDebts,
    expenseCategories,
    rpcData,
    isPhase2Loading: _isPhase2Loading,
    isExternalLabor,
    isolateLaborAccount = true,
}: UseFinancialCalculationsParams) {

    // 1. Indexed lookup maps O(1) for high-performance calculations without O(N^2) loops
    const invoicesByCycle = useMemo(() => {
        const map = new Map<string, Invoice[]>();
        for (const inv of hydratedInvoices) {
            if (!inv.cycle_id) continue;
            const key = String(inv.cycle_id);
            let list = map.get(key);
            if (!list) {
                list = [];
                map.set(key, list);
            }
            list.push(inv);
        }
        return map;
    }, [hydratedInvoices]);

    const rawExpensesByCycle = useMemo(() => {
        const map = new Map<string, typeof rawExpensesHydrated>();
        for (const exp of rawExpensesHydrated) {
            if (!exp.cycle_id) continue;
            const key = String(exp.cycle_id);
            let list = map.get(key);
            if (!list) {
                list = [];
                map.set(key, list);
            }
            list.push(exp);
        }
        return map;
    }, [rawExpensesHydrated]);

    const operationalExpensesByCycle = useMemo(() => {
        const map = new Map<string, Expense[]>();
        for (const exp of hydratedExpenses) {
            if (!exp.cycle_id) continue;
            const key = String(exp.cycle_id);
            let list = map.get(key);
            if (!list) {
                list = [];
                map.set(key, list);
            }
            list.push(exp);
        }
        return map;
    }, [hydratedExpenses]);

    const advancesByCycle = useMemo(() => {
        const map = new Map<string, Advance[]>();
        for (const adv of advances) {
            if (!adv.cycle_id) continue;
            const key = String(adv.cycle_id);
            let list = map.get(key);
            if (!list) {
                list = [];
                map.set(key, list);
            }
            list.push(adv);
        }
        return map;
    }, [advances]);

    const bankTxByCycle = useMemo(() => {
        const map = new Map<string, BankTransaction[]>();
        for (const tx of bankTransactions) {
            if (!tx.cycle_id) continue;
            const key = String(tx.cycle_id);
            let list = map.get(key);
            if (!list) {
                list = [];
                map.set(key, list);
            }
            list.push(tx);
        }
        return map;
    }, [bankTransactions]);

    const farmerWithdrawalsByCycle = useMemo(() => {
        const map = new Map<string, FarmerWithdrawal[]>();
        for (const fw of farmerWithdrawals) {
            if (!fw.cycle_id) continue;
            const key = String(fw.cycle_id);
            let list = map.get(key);
            if (!list) {
                list = [];
                map.set(key, list);
            }
            list.push(fw);
        }
        return map;
    }, [farmerWithdrawals]);

    const supplierPaymentsByCycle = useMemo(() => {
        const map = new Map<string, SupplierPayment[]>();
        for (const sp of supplierPayments) {
            if (!sp.cycle_id) continue;
            const key = String(sp.cycle_id);
            let list = map.get(key);
            if (!list) {
                list = [];
                map.set(key, list);
            }
            list.push(sp);
        }
        return map;
    }, [supplierPayments]);

    const partnerDebtsByCycle = useMemo(() => {
        const map = new Map<string, PartnerDebt[]>();
        for (const pd of partnerDebts || []) {
            if (!pd.cycle_id) continue;
            const key = String(pd.cycle_id);
            let list = map.get(key);
            if (!list) {
                list = [];
                map.set(key, list);
            }
            list.push(pd);
        }
        return map;
    }, [partnerDebts]);

    const farmersMap = useMemo(() => {
        const map = new Map<string, Farmer>();
        for (const f of farmers) {
            map.set(String(f.id), f);
        }
        return map;
    }, [farmers]);

    // 2. High-performance calculation for cyclesWithCalculations
    const cyclesWithCalculations: Cycle[] = useMemo(() => {
        return cycles.map(cycle => {
            const cycleIdKey = String(cycle.id);
            const allCycleInvoices = invoicesByCycle.get(cycleIdKey) || [];
            const cycleInvoices = allCycleInvoices.filter(i => i.market !== 'رصيد منقول' && i.market !== 'تمويل يدوي');

            const allCycleRawExpenses = rawExpensesByCycle.get(cycleIdKey) || [];
            const cycleAllExpenses = allCycleRawExpenses.filter(e => 
                !isExternalLabor(e) && 
                !e.isAdvanceTaken && 
                !e.isAdvanceRepayment && 
                !e.isSettlement && 
                !isExpenseJointDebt(e)
            );

            const allCycleOpExpenses = operationalExpensesByCycle.get(cycleIdKey) || [];
            const cycleOperationalExpenses = allCycleOpExpenses.filter(e => 
                !isExpenseJointDebt(e)
            );

            const totalRev = cycleInvoices.reduce((s, inv) => s + calculateInvoiceTotal(inv.price_items, inv.deductions), 0);
            const totalAllExp = cycleAllExpenses.reduce((s, e) => s + safeNum(e.amount), 0);

            const hasFarmerAssigned = Boolean(cycle.responsible_farmer_id) && safeNum(cycle.farmer_share_percentage) > 0;
            const fshare = hasFarmerAssigned ? totalRev * (safeNum(cycle.farmer_share_percentage) / 100) : 0;
            const profit = totalRev - totalAllExp - fshare;
            const totalProductionKg = cycleInvoices.reduce((s, inv) => s + (inv.price_items || []).reduce((ss, it) => ss + safeNum(it.quantity), 0), 0);

            const unitDivisor = cycle.unit_of_measure === 'plants' ? safeNum(cycle.plant_count) : safeNum(cycle.area_in_feddans);
            const totalCartons = cycleInvoices.filter(i => i.packaging_type === 'carton').reduce((s, i) => s + safeNum(i.packaging_count), 0);
            const totalCages = cycleInvoices.filter(i => i.packaging_type === 'cage').reduce((s, i) => s + safeNum(i.packaging_count), 0);

            let calculatedAvgDailyProductionKg = 0;
            if (cycleInvoices.length > 0) {
                const sortedInvoices = [...cycleInvoices].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
                const firstHarvestDate = new Date(sortedInvoices[0].date);
                const lastHarvestDate = (cycle.status === 'active') ? new Date() : new Date(sortedInvoices[sortedInvoices.length - 1].date);

                firstHarvestDate.setHours(0, 0, 0, 0);
                lastHarvestDate.setHours(0, 0, 0, 0);

                const diffTime = Math.abs(lastHarvestDate.getTime() - firstHarvestDate.getTime());
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
                calculatedAvgDailyProductionKg = diffDays > 0 ? totalProductionKg / diffDays : 0;
            }

            // Breakdown of operational expenses
            const opExpenses = cycleOperationalExpenses.filter(e => !e.is_establishment);
            const expGroups: Record<string, number> = {};
            opExpenses.forEach(e => {
                const catName = e.categoryName || 'أخرى';
                expGroups[catName] = (expGroups[catName] || 0) + e.amount;
            });
            const totalOpExp = opExpenses.reduce((s, e) => s + e.amount, 0);
            const expenseBreakdown = Object.entries(expGroups).map(([category, amount]) => ({
                category,
                amount,
                percentage: totalOpExp > 0 ? (amount / totalOpExp) * 100 : 0,
                color: '#10B981'
            }));

            // Breakdown of sales deductions
            const dedGroups: Record<string, number> = {};
            cycleInvoices.forEach(inv => {
                (inv.deductions || []).forEach(d => {
                    dedGroups[d.name] = (dedGroups[d.name] || 0) + d.amount;
                });
            });
            const deductionBreakdown = Object.entries(dedGroups).map(([name, totalAmount]) => ({
                name,
                totalAmount,
                percentageOfRevenue: totalRev > 0 ? (totalAmount / (totalRev + totalAmount)) * 100 : 0
            }));

            return {
                ...cycle,
                revenue: totalRev,
                expenses: totalAllExp,
                profit,
                farmerShare: fshare,
                responsibleFarmer: farmersMap.get(cycle.responsible_farmer_id || '')?.name || 'بدون مزارع',
                totalProductionKg,
                totalCartons,
                totalCages,
                productionPerPlantKg: unitDivisor > 0 ? totalProductionKg / unitDivisor : 0,
                costPerPlant: unitDivisor > 0 ? totalAllExp / unitDivisor : 0,
                revenuePerPlant: unitDivisor > 0 ? (totalRev - fshare) / unitDivisor : 0,
                profitPerPlant: unitDivisor > 0 ? profit / unitDivisor : 0,
                returnOnInvestment: totalAllExp > 0 ? (profit / totalAllExp) * 100 : 0,
                health: Math.min(100, Math.max(0, 100 + ((totalAllExp > 0 ? (profit / totalAllExp) * 100 : 0) / 2))),
                avgDailyProductionKg: calculatedAvgDailyProductionKg,
                expenseBreakdown,
                deductionBreakdown
            } as Cycle;
        });
    }, [
        cycles,
        invoicesByCycle,
        rawExpensesByCycle,
        operationalExpensesByCycle,
        farmersMap,
        isExternalLabor
    ]);

    // 3. High-performance calculation for Treasury Funds
    const treasuryFunds: TreasuryFund[] = useMemo(() => {
        const activeCycles = cycles.filter(c => c.status === 'active');

        const laborCategoryIds = expenseCategories.filter(cat =>
            cat.is_labor_category ||
            cat.name.includes('عمالة') || cat.name.includes('عماله') || cat.name.includes('يومية') || cat.name.includes('عامل') || cat.name.includes('خاص بالمزارع') || cat.name.includes('مزارع') || cat.name.includes('نثريات') || cat.name.includes('فطار') || cat.name.includes('ضيافة') || cat.name.includes('إكرامية')
        ).map(cat => cat.id);

        if (rpcData && rpcData.cycles && Array.isArray(rpcData.cycles)) {
            return activeCycles.map(cycle => {
                const cIdKey = String(cycle.id);
                const cRpc = rpcData.cycles.find((rc: any) => String(rc.id) === cIdKey);
                const allCycleInvoices = invoicesByCycle.get(cIdKey) || [];
                const allCycleRawExpenses = rawExpensesByCycle.get(cIdKey) || [];
                const allCycleAdvances = advancesByCycle.get(cIdKey) || [];
                const allCyclePartnerDebts = partnerDebtsByCycle.get(cIdKey) || [];

                if (cRpc) {
                    const salesInvoices = allCycleInvoices.filter(i =>
                        i.market !== 'رصيد منقول' &&
                        i.market !== 'تمويل يدوي'
                    );
                    const localRev = salesInvoices.reduce((s, i) => s + getInvoiceCashRevenue(i), 0);

                    const transferInvoices = allCycleInvoices.filter(i =>
                        i.market === 'رصيد منقول'
                    );
                    const transferredBal = transferInvoices.reduce((s, i) => s + calculateInvoiceTotal(i.price_items, i.deductions), 0);

                    const fundingInvoices = allCycleInvoices.filter(i =>
                        i.market === 'تمويل يدوي'
                    );
                    const manualFunding = fundingInvoices.reduce((s, i) => s + calculateInvoiceTotal(i.price_items, i.deductions), 0);

                    const cycleLocalCashExpenses = allCycleRawExpenses
                        .filter(e => e.payment_method === 'cash' && !isExternalLabor(e))
                        .reduce((s, e) => s + safeNum(e.amount), 0);

                    const fatherLaborExpsSum = allCycleRawExpenses.filter(e =>
                        e.payment_method === 'cash' &&
                        isExternalLabor(e)
                    ).reduce((s, e) => s + safeNum(e.amount), 0);

                    const laborExpsSum = allCycleRawExpenses.filter(e =>
                        e.payment_method === 'cash' &&
                        laborCategoryIds.includes(e.category_id) &&
                        !isExternalLabor(e)
                    ).reduce((s, e) => s + safeNum(e.amount), 0);

                    let opExpensesAmount = 0;
                    if (hydratedExpenses.length > 0) {
                        opExpensesAmount = cycleLocalCashExpenses;
                    } else {
                        let baseOp = cRpc.operating_expenses;
                        if (isolateLaborAccount) {
                            baseOp = Math.max(0, baseOp - laborExpsSum);
                        }
                        opExpensesAmount = Math.max(0, baseOp - fatherLaborExpsSum);
                    }

                    const actualLaborCashInFlow = hydratedExpenses.length > 0 ? 0 : (isolateLaborAccount ? laborExpsSum : 0);
                    const personalAdvancesAmount = allCycleAdvances
                        .filter(a => !isAdvanceExternalDebt(a) && !isAdvanceInvoiceRepayment(a))
                        .reduce((s, a) => s + safeNum(a.amount), 0);

                    const jointDebtsFunding = allCyclePartnerDebts
                        .filter(d => d.entered_treasury)
                        .reduce((s, d) => s + (d.total_amount ?? d.totalAmount ?? 0), 0);

                    const individualDebtsFunding = allCycleAdvances
                        .filter(a => {
                            if (a.amount <= 0) return false;
                            if (!isAdvanceExternalDebt(a)) return false;
                            if (!isAdvanceEnteredTreasury(a)) return false;
                            const isCancelled = allCycleAdvances.some(dep =>
                                dep.person_id === a.person_id &&
                                dep.amount === -a.amount &&
                                dep.date === a.date
                            );
                            return !isCancelled;
                        })
                        .reduce((s, a) => s + safeNum(a.amount), 0);

                    const individualDebtsRepaymentFromTreasury = allCycleAdvances
                        .filter(a => {
                            if (a.amount >= 0) return false;
                            if (!isAdvanceExternalDebt(a)) return false;
                            return isAdvancePaidFromTreasury(a);
                        })
                        .reduce((s, a) => s + Math.abs(safeNum(a.amount)), 0);

                    const actualRevenue = localRev;
                    const totalIn = actualRevenue + cRpc.bank_withdrawals + transferredBal + manualFunding + jointDebtsFunding + individualDebtsFunding;
                    const totalOut = opExpensesAmount + actualLaborCashInFlow + fatherLaborExpsSum + personalAdvancesAmount + cRpc.farmer_withdrawals + cRpc.supplier_payments + cRpc.bank_deposits + individualDebtsRepaymentFromTreasury;

                    return {
                        id: cycle.id,
                        name: `صندوق: ${cycle.name}`,
                        balance: totalIn - totalOut,
                        inflows: {
                            totalRevenue: actualRevenue,
                            bankWithdrawals: cRpc.bank_withdrawals,
                            transferredBalance: transferredBal,
                            manualFunding: manualFunding,
                            jointDebtsFunding: jointDebtsFunding,
                            individualDebtsFunding: individualDebtsFunding
                        },
                        outflows: {
                            totalDeductions: totalOut,
                            operatingExpenses: { amount: opExpensesAmount + actualLaborCashInFlow, transactionCount: 0 },
                            personalAdvances: { amount: personalAdvancesAmount, transactionCount: 0 },
                            farmerWithdrawals: { amount: cRpc.farmer_withdrawals, transactionCount: 0 },
                            supplierPayments: { amount: cRpc.supplier_payments, transactionCount: 0 },
                            bankDeposits: { amount: cRpc.bank_deposits, transactionCount: 0 }
                        }
                    } as TreasuryFund;
                }

                // Fallback calculations for cycles not in rpc
                const cIdKeyFallback = String(cycle.id);
                const realInvoices = (invoicesByCycle.get(cIdKeyFallback) || []).filter(i =>
                    i.market !== 'رصيد منقول' &&
                    i.market !== 'تمويل يدوي'
                );
                const rev = realInvoices.reduce((s, i) => s + getInvoiceCashRevenue(i), 0);

                const transferInvoices = (invoicesByCycle.get(cIdKeyFallback) || []).filter(i =>
                    i.market === 'رصيد منقول'
                );
                const transferredBal = transferInvoices.reduce((s, i) => s + calculateInvoiceTotal(i.price_items, i.deductions), 0);

                const fundingInvoices = (invoicesByCycle.get(cIdKeyFallback) || []).filter(i =>
                    i.market === 'تمويل يدوي'
                );
                const manualFunding = fundingInvoices.reduce((s, i) => s + calculateInvoiceTotal(i.price_items, i.deductions), 0);

                const cycleBankTx = bankTxByCycle.get(cIdKeyFallback) || [];
                const bankWithdrawals = cycleBankTx.filter(t => t.type === 'withdrawal').reduce((s, t) => s + safeNum(t.amount), 0);
                const bankDeposits = cycleBankTx.filter(t => t.type === 'deposit').reduce((s, t) => s + safeNum(t.amount), 0);

                const fallbackRawExpenses = rawExpensesByCycle.get(cIdKeyFallback) || [];
                const cycleLocalCashExpenses = fallbackRawExpenses
                    .filter(e => e.payment_method === 'cash' && !isExternalLabor(e))
                    .reduce((s, e) => s + safeNum(e.amount), 0);

                const fatherLaborExpsSum = fallbackRawExpenses.filter(e =>
                    e.payment_method === 'cash' &&
                    isExternalLabor(e)
                ).reduce((s, e) => s + safeNum(e.amount), 0);

                const fallbackAdvances = advancesByCycle.get(cIdKeyFallback) || [];
                const sumAdv = fallbackAdvances
                    .filter(a => !isAdvanceExternalDebt(a) && !isAdvanceInvoiceRepayment(a))
                    .reduce((s, a) => s + safeNum(a.amount), 0);
                const sumFarmer = (farmerWithdrawalsByCycle.get(cIdKeyFallback) || []).reduce((s, w) => s + safeNum(w.amount), 0);
                const sumSuppliers = (supplierPaymentsByCycle.get(cIdKeyFallback) || []).reduce((s, p) => s + safeNum(p.amount), 0);

                const fallbackPartnerDebts = partnerDebtsByCycle.get(cIdKeyFallback) || [];
                const jointDebtsFunding = fallbackPartnerDebts
                    .filter(d => d.entered_treasury)
                    .reduce((s, d) => s + (d.total_amount ?? d.totalAmount ?? 0), 0);

                const individualDebtsFunding = fallbackAdvances
                    .filter(a => {
                        if (a.amount <= 0) return false;
                        if (!isAdvanceExternalDebt(a)) return false;
                        if (!isAdvanceEnteredTreasury(a)) return false;
                        const isCancelled = fallbackAdvances.some(dep =>
                            dep.person_id === a.person_id &&
                            dep.amount === -a.amount &&
                            dep.date === a.date
                        );
                        return !isCancelled;
                    })
                    .reduce((s, a) => s + safeNum(a.amount), 0);

                const individualDebtsRepaymentFromTreasury = fallbackAdvances
                    .filter(a => {
                        if (a.amount >= 0) return false;
                        if (!isAdvanceExternalDebt(a)) return false;
                        return isAdvancePaidFromTreasury(a);
                    })
                    .reduce((s, a) => s + Math.abs(safeNum(a.amount)), 0);

                const actualRevenue = rev;
                const totalIn = actualRevenue + bankWithdrawals + transferredBal + manualFunding + jointDebtsFunding + individualDebtsFunding;
                const totalOut = cycleLocalCashExpenses + fatherLaborExpsSum + sumAdv + sumFarmer + sumSuppliers + bankDeposits + individualDebtsRepaymentFromTreasury;

                return {
                    id: cycle.id,
                    name: `صندوق: ${cycle.name}`,
                    balance: totalIn - totalOut,
                    inflows: {
                        totalRevenue: actualRevenue,
                        bankWithdrawals,
                        transferredBalance: transferredBal,
                        manualFunding,
                        jointDebtsFunding,
                        individualDebtsFunding
                    },
                    outflows: {
                        totalDeductions: totalOut,
                        operatingExpenses: { amount: cycleLocalCashExpenses, transactionCount: 0 },
                        personalAdvances: { amount: sumAdv, transactionCount: 0 },
                        farmerWithdrawals: { amount: sumFarmer, transactionCount: 0 },
                        supplierPayments: { amount: sumSuppliers, transactionCount: 0 },
                        bankDeposits: { amount: bankDeposits, transactionCount: 0 }
                    }
                } as TreasuryFund;
            }).filter(Boolean) as TreasuryFund[];
        }

        // Standard fallback if no rpcData
        return activeCycles.map(cycle => {
            const allCycleInvoices = invoicesByCycle.get(cycle.id) || [];
            const allCycleRawExpenses = rawExpensesByCycle.get(cycle.id) || [];
            const allCycleAdvances = advancesByCycle.get(cycle.id) || [];
            const allCyclePartnerDebts = partnerDebtsByCycle.get(cycle.id) || [];

            const salesInvoices = allCycleInvoices.filter(i =>
                i.market !== 'رصيد منقول' &&
                i.market !== 'تمويل يدوي'
            );
            const rev = salesInvoices.reduce((s, i) => s + getInvoiceCashRevenue(i), 0);

            const cycleBankTx = bankTxByCycle.get(cycle.id) || [];
            const bankWithdrawals = cycleBankTx.filter(t => t.type === 'withdrawal').reduce((s, t) => s + safeNum(t.amount), 0);
            const bankDeposits = cycleBankTx.filter(t => t.type === 'deposit').reduce((s, t) => s + safeNum(t.amount), 0);

            const cycleLocalCashExpenses = allCycleRawExpenses
                .filter(e => e.payment_method === 'cash' && !isExternalLabor(e))
                .reduce((s, e) => s + safeNum(e.amount), 0);

            const fatherLaborExpsSum = allCycleRawExpenses.filter(e =>
                e.payment_method === 'cash' &&
                isExternalLabor(e)
            ).reduce((s, e) => s + safeNum(e.amount), 0);

            const sumAdv = allCycleAdvances
                .filter(a => !isAdvanceExternalDebt(a) && !isAdvanceInvoiceRepayment(a))
                .reduce((s, a) => s + safeNum(a.amount), 0);
            const sumFarmer = (farmerWithdrawalsByCycle.get(cycle.id) || []).reduce((s, w) => s + safeNum(w.amount), 0);
            const sumSuppliers = (supplierPaymentsByCycle.get(cycle.id) || []).reduce((s, p) => s + safeNum(p.amount), 0);

            const jointDebtsFunding = allCyclePartnerDebts
                .filter(d => d.entered_treasury)
                .reduce((s, d) => s + (d.total_amount ?? d.totalAmount ?? 0), 0);

            const individualDebtsFunding = allCycleAdvances
                .filter(a => {
                    if (a.amount <= 0) return false;
                    if (!isAdvanceExternalDebt(a)) return false;
                    if (!isAdvanceEnteredTreasury(a)) return false;
                    const isCancelled = allCycleAdvances.some(dep =>
                        dep.person_id === a.person_id &&
                        dep.amount === -a.amount &&
                        dep.date === a.date
                    );
                    return !isCancelled;
                })
                .reduce((s, a) => s + safeNum(a.amount), 0);

            const transferInvoices = allCycleInvoices.filter(i =>
                i.market === 'رصيد منقول'
            );
            const transferredBal = transferInvoices.reduce((s, i) => s + calculateInvoiceTotal(i.price_items, i.deductions), 0);

            const fundingInvoices = allCycleInvoices.filter(i =>
                i.market === 'تمويل يدوي'
            );
            const manualFunding = fundingInvoices.reduce((s, i) => s + calculateInvoiceTotal(i.price_items, i.deductions), 0);

            const individualDebtsRepaymentFromTreasury = allCycleAdvances
                .filter(a => {
                    if (a.amount >= 0) return false;
                    if (!isAdvanceExternalDebt(a)) return false;
                    return isAdvancePaidFromTreasury(a);
                })
                .reduce((s, a) => s + Math.abs(safeNum(a.amount)), 0);

            const actualRevenue = rev;
            const totalIn = actualRevenue + bankWithdrawals + transferredBal + manualFunding + jointDebtsFunding + individualDebtsFunding;
            const totalOut = cycleLocalCashExpenses + fatherLaborExpsSum + sumAdv + sumFarmer + sumSuppliers + bankDeposits + individualDebtsRepaymentFromTreasury;

            return {
                id: cycle.id,
                name: `صندوق: ${cycle.name}`,
                balance: totalIn - totalOut,
                inflows: {
                    totalRevenue: actualRevenue,
                    bankWithdrawals,
                    transferredBalance: transferredBal,
                    manualFunding,
                    jointDebtsFunding,
                    individualDebtsFunding
                },
                outflows: {
                    totalDeductions: totalOut,
                    operatingExpenses: { amount: cycleLocalCashExpenses + fatherLaborExpsSum, transactionCount: 0 },
                    personalAdvances: { amount: sumAdv, transactionCount: 0 },
                    farmerWithdrawals: { amount: sumFarmer, transactionCount: 0 },
                    supplierPayments: { amount: sumSuppliers, transactionCount: 0 },
                    bankDeposits: { amount: bankDeposits, transactionCount: 0 }
                }
            } as TreasuryFund;
        });
    }, [
        cycles,
        invoicesByCycle,
        rawExpensesByCycle,
        advancesByCycle,
        partnerDebtsByCycle,
        bankTxByCycle,
        farmerWithdrawalsByCycle,
        supplierPaymentsByCycle,
        hydratedExpenses.length,
        expenseCategories,
        rpcData,
        isExternalLabor,
        isolateLaborAccount
    ]);

    // 4. Cycle Cash Balances calculations
    const getCycleCashBalance = (cycleId: string) => {
        const cKey = String(cycleId);
        const allCycleInvoices = invoicesByCycle.get(cKey) || [];
        const allCycleRawExpenses = rawExpensesByCycle.get(cKey) || [];
        const allCycleAdvances = advancesByCycle.get(cKey) || [];
        const allCyclePartnerDebts = partnerDebtsByCycle.get(cKey) || [];

        const salesInvoices = allCycleInvoices.filter(i =>
            i.market !== 'رصيد منقول' &&
            i.market !== 'تمويل يدوي'
        );
        const rev = salesInvoices.reduce((s, i) => s + getInvoiceCashRevenue(i), 0);

        const transferInvoices = allCycleInvoices.filter(i => i.market === 'رصيد منقول');
        const transferredBal = transferInvoices.reduce((s, i) => s + calculateInvoiceTotal(i.price_items, i.deductions), 0);

        const fundingInvoices = allCycleInvoices.filter(i => i.market === 'تمويل يدوي');
        const manualFunding = fundingInvoices.reduce((s, i) => s + calculateInvoiceTotal(i.price_items, i.deductions), 0);

        const cycleBankTx = bankTxByCycle.get(cKey) || [];
        const bankWithdrawals = cycleBankTx.filter(t => t.type === 'withdrawal').reduce((s, t) => s + safeNum(t.amount), 0);
        const bankDeposits = cycleBankTx.filter(t => t.type === 'deposit').reduce((s, t) => s + safeNum(t.amount), 0);

        const cycleLocalCashExpenses = allCycleRawExpenses
            .filter(e => e.payment_method === 'cash' && !isExternalLabor(e))
            .reduce((s, e) => s + safeNum(e.amount), 0);

        const fatherLaborCash = allCycleRawExpenses.filter(e =>
            e.payment_method === 'cash' &&
            isExternalLabor(e)
        ).reduce((s, e) => s + safeNum(e.amount), 0);

        const sumAdv = allCycleAdvances
            .filter(a => !isAdvanceExternalDebt(a) && !isAdvanceInvoiceRepayment(a))
            .reduce((s, a) => s + safeNum(a.amount), 0);
        const sumFarmer = (farmerWithdrawalsByCycle.get(cKey) || []).reduce((s, w) => s + safeNum(w.amount), 0);
        const sumSuppliers = (supplierPaymentsByCycle.get(cKey) || []).reduce((s, p) => s + safeNum(p.amount), 0);

        const jointDebtsFunding = allCyclePartnerDebts
            .filter(d => d.entered_treasury)
            .reduce((s, d) => s + (d.total_amount ?? d.totalAmount ?? 0), 0);

        const individualDebtsFunding = allCycleAdvances
            .filter(a => {
                if (a.amount <= 0) return false;
                if (!isAdvanceExternalDebt(a)) return false;
                if (!isAdvanceEnteredTreasury(a)) return false;
                const isCancelled = allCycleAdvances.some(dep =>
                    dep.person_id === a.person_id &&
                    dep.amount === -a.amount &&
                    dep.date === a.date
                );
                return !isCancelled;
            })
            .reduce((s, a) => s + safeNum(a.amount), 0);

        const individualDebtsRepaymentFromTreasury = allCycleAdvances
            .filter(a => {
                if (a.amount >= 0) return false;
                if (!isAdvanceExternalDebt(a)) return false;
                return isAdvancePaidFromTreasury(a);
            })
            .reduce((s, a) => s + Math.abs(safeNum(a.amount)), 0);

        const actualRevenue = rev;

        return actualRevenue + bankWithdrawals + transferredBal + manualFunding + jointDebtsFunding + individualDebtsFunding -
            (cycleLocalCashExpenses + fatherLaborCash + sumAdv + sumFarmer + sumSuppliers + bankDeposits + individualDebtsRepaymentFromTreasury);
    };

    const getCycleTotalBalance = (cycleId: string) => {
        const cash = getCycleCashBalance(cycleId);
        const cycleBankTx = bankTxByCycle.get(String(cycleId)) || [];
        const bankDeposits = cycleBankTx.filter(t => t.type === 'deposit').reduce((s, t) => s + safeNum(t.amount), 0);
        const bankWithdrawals = cycleBankTx.filter(t => t.type === 'withdrawal').reduce((s, t) => s + safeNum(t.amount), 0);
        const bank = bankDeposits - bankWithdrawals;
        return cash + bank;
    };

    // 5. Total Summaries
    const totalRevenue = useMemo(() => cyclesWithCalculations.reduce((s, c) => s + c.revenue, 0), [cyclesWithCalculations]);
    const totalNetRevenue = useMemo(() => cyclesWithCalculations.reduce((s, c) => s + (c.revenue - (c.farmerShare || 0)), 0), [cyclesWithCalculations]);
    const totalExpenses = useMemo(() => rawExpensesHydrated.filter(e => !isExternalLabor(e)).reduce((s, e) => s + safeNum(e.amount), 0), [rawExpensesHydrated, isExternalLabor]);
    const ownerNetProfit = useMemo(() => cyclesWithCalculations.reduce((s, c) => s + c.profit, 0), [cyclesWithCalculations]);
    const totalFarmerShare = useMemo(() => cyclesWithCalculations.reduce((s, c) => s + (c.farmerShare || 0), 0), [cyclesWithCalculations]);

    return {
        cyclesWithCalculations,
        treasuryFunds,
        getCycleCashBalance,
        getCycleTotalBalance,
        totalRevenue,
        totalNetRevenue,
        totalExpenses,
        ownerNetProfit,
        totalFarmerShare
    };
}
