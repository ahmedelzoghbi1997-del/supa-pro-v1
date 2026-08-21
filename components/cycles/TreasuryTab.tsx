import React, { useMemo, useState } from 'react';
import type { Cycle } from '../../types';
import { formatNumber, calculateInvoiceTotal } from '../../utils/helpers';
import { useData } from '../../contexts/DataContext';
import { 
    TrendingUpIcon, 
    TrendingDownIcon,
    WalletIcon,
    UserMinusIcon,
    CreditCardIcon,
    FarmerAccountIcon,
    UserIcon,
    TruckIcon,
    ClockIcon,
    XMarkIcon,
    ChevronRightIcon,
    ChevronLeftIcon,
    UsersIcon
} from '../Icons';

const StatMiniCard = ({ label, value, icon: Icon, colorClass, count, subLabel, subIcon: SubIcon, onClick }: any) => (
    <div 
        onClick={onClick}
        className="p-4 sm:p-5 rounded-[1.5rem] bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 shadow-sm flex flex-col justify-between h-full transition-all hover:shadow-md hover:border-neutral-250 dark:hover:border-neutral-700/80 group cursor-pointer select-none"
    >
        <div className="flex justify-between items-start mb-3 sm:mb-4">
            <div className={`p-2 sm:p-3 rounded-xl sm:rounded-2xl ${colorClass.replace('text-', 'bg-')}/10 ${colorClass} transition-transform group-hover:scale-110`}>
                <Icon className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div className="text-left">
                <span className="text-[9px] sm:text-[10px] font-black text-neutral-400 bg-neutral-50 dark:bg-neutral-950 px-1.5 sm:px-2.5 py-0.5 sm:py-1 rounded-lg border border-neutral-100 dark:border-neutral-800 tabular-nums">
                    {count} حركات
                </span>
            </div>
        </div>
        <div>
            <p className="text-[9px] sm:text-[11px] font-black text-neutral-400 dark:text-neutral-500 uppercase tracking-tight sm:tracking-widest mb-1">{label}</p>
            <p className={`text-sm sm:text-2xl font-black ${colorClass} tracking-tighter tabular-nums mb-2 sm:mb-3`}>
                {formatNumber(value)}
                <span className="text-[8px] sm:text-xs mr-1 opacity-60 font-bold">ج.م</span>
            </p>
            
            {subLabel && (
                <div className="flex items-center gap-1 sm:gap-1.5 pt-2 sm:pt-3 border-t border-neutral-100 dark:border-neutral-800/60">
                    {SubIcon && <SubIcon className="w-2.5 h-2.5 sm:w-3 h-3 text-neutral-400" />}
                    <span className="text-[8px] sm:text-[10px] font-bold text-neutral-500 dark:text-neutral-450 truncate max-w-full">{subLabel}</span>
                </div>
            )}
        </div>
    </div>
);

const TreasuryTab: React.FC<{ cycle: Cycle }> = ({ cycle }) => {
    const { 
        invoices,
        supplierPayments, 
        suppliers, 
        farmers, 
        bankAccounts, 
        bankTransactions, 
        expenses, 
        rawExpenses,
        advances, 
        farmerWithdrawals,
        expenseCategories,
        persons,
        settings,
        partnerDebts
    } = useData();

    const isExternalLabor = (e: any) => {
        if (!e.description) return false;
        const currentGhs = settings?.greenhouses || [
            { id: 'mine', name: 'الصوبة الخاصة بي', type: 'mine', is_default: true },
            { id: 'father', name: 'صوبة أبي وأخي', type: 'external' }
        ];

        if (e.description.includes('🏠') || e.description.includes('صوبة أبي وأخي') || e.description.includes('[صوبة أبي وأخي]')) {
            return true;
        }

        const externalGhs = currentGhs.filter(g => g.type === 'external');
        return externalGhs.some(g => e.description.includes(g.name));
    };

    const [modalCategory, setModalCategory] = useState<'suppliers' | 'farmers' | 'expenses' | 'advances' | null>(null);
    const [selectedSubItemId, setSelectedSubItemId] = useState<string | null>(null);
    const [selectedSubItemName, setSelectedSubItemName] = useState<string | null>(null);

    const openCategoryModal = (category: 'suppliers' | 'farmers' | 'expenses' | 'advances') => {
        setSelectedSubItemId(null);
        setSelectedSubItemName(null);
        setModalCategory(category);
    };

    // Helper for safe numeric conversions
    const safeNum = (val: any) => {
        const num = Number(val);
        return isNaN(num) ? 0 : num;
    };

    const fund = useMemo(() => {
        const realInvoices = invoices.filter(i => i.cycle_id === cycle.id && i.market !== 'رصيد منقول');
        const rev = realInvoices.reduce((s, i) => s + calculateInvoiceTotal(i.price_items, i.deductions), 0);
        
        const transferInvoices = invoices.filter(i => i.cycle_id === cycle.id && i.market === 'رصيد منقول');
        const transferredBal = transferInvoices.reduce((s, i) => s + calculateInvoiceTotal(i.price_items, i.deductions), 0);
        
        const cycleBankTx = bankTransactions.filter(t => t.cycle_id === cycle.id);
        const bankWithdrawals = cycleBankTx.filter(t => t.type === 'withdrawal').reduce((s, t) => s + safeNum(t.amount), 0);
        const bankDeposits = cycleBankTx.filter(t => t.type === 'deposit').reduce((s, t) => s + safeNum(t.amount), 0);
        
        const sumOp = expenses.filter(e => e.cycle_id === cycle.id && e.payment_method === 'cash').reduce((s, e) => s + safeNum(e.amount), 0);
        
        // Calculate external greenhouse labor cash expenses deducted from treasury
        const fatherLaborCash = rawExpenses.filter(e => 
            e.cycle_id === cycle.id && 
            e.payment_method === 'cash' && 
            isExternalLabor(e)
        ).reduce((s, e) => s + safeNum(e.amount), 0);

        const sumAdv = advances.filter(a => a.cycle_id === cycle.id && a.funding_source !== 'external_debt').reduce((s, a) => s + safeNum(a.amount), 0);
        const sumFarmer = farmerWithdrawals.filter(w => w.cycle_id === cycle.id).reduce((s, w) => s + safeNum(w.amount), 0);
        const sumSuppliers = supplierPayments.filter(p => p.cycle_id === cycle.id).reduce((s, p) => s + safeNum(p.amount), 0);
        
        const fundingInvoices = invoices.filter(i => i.cycle_id === cycle.id && i.market === 'تمويل يدوي');
        const manualFunding = fundingInvoices.reduce((s, i) => s + calculateInvoiceTotal(i.price_items, i.deductions), 0);
        
        const jointDebtsFunding = (partnerDebts || [])
            .filter(d => d.entered_treasury && d.cycle_id === cycle.id)
            .reduce((s, d) => s + (d.total_amount ?? d.totalAmount ?? 0), 0);

        const individualDebtsFunding = advances
            .filter(a => {
                if (a.cycle_id !== cycle.id || a.amount <= 0) return false;
                const isExtDebt = a.funding_source === 'external_debt' || 
                                  a.reason?.includes('[EXTERNAL_DEBT]') || 
                                  a.reason?.includes('المعلم') || 
                                  a.reason?.includes('خارجي');
                if (!isExtDebt) return false;
                const entered = a.reason?.includes('[ENTERED_TREASURY]') || 
                                (a.reason?.includes('إيداع') && a.reason?.includes('خارجية')) ||
                                /خزن|خزنة|الخزنة|دخل|إيداع|سيول|كاش|ودخلو|ميسرة من المعلم/.test(a.reason || '');
                if (!entered) return false;
                const isCancelled = advances.some(dep => 
                    dep.cycle_id === a.cycle_id && 
                    dep.person_id === a.person_id && 
                    dep.amount === -a.amount && 
                    dep.date === a.date
                );
                return !isCancelled;
            })
            .reduce((s, a) => s + safeNum(a.amount), 0);

        const totalIn = rev + bankWithdrawals + transferredBal + manualFunding + jointDebtsFunding + individualDebtsFunding;
        const totalOut = sumOp + fatherLaborCash + sumAdv + sumFarmer + sumSuppliers + bankDeposits;
        
        return { 
            id: cycle.id, 
            name: `صندوق: ${cycle.name}`, 
            balance: totalIn - totalOut, 
            inflows: { totalRevenue: rev, bankWithdrawals, transferredBalance: transferredBal, manualFunding, jointDebtsFunding, individualDebtsFunding }, 
            outflows: { 
                totalDeductions: totalOut, 
                operatingExpenses: { amount: sumOp, transactionCount: 0 }, 
                fatherLaborExpenses: { amount: fatherLaborCash, transactionCount: 0 },
                personalAdvances: { amount: sumAdv, transactionCount: 0 }, 
                farmerWithdrawals: { amount: sumFarmer, transactionCount: 0 }, 
                supplierPayments: { amount: sumSuppliers, transactionCount: 0 },
                bankDeposits: { amount: bankDeposits, transactionCount: 0 }
            } 
        } as any; // Cast as any due to layout updates
    }, [cycle.id, invoices, bankTransactions, expenses, rawExpenses, advances, farmerWithdrawals, supplierPayments, isExternalLabor, settings]);

    const totalOutflow = fund.outflows.supplierPayments.amount + 
                         fund.outflows.farmerWithdrawals.amount + 
                         fund.outflows.operatingExpenses.amount + 
                         fund.outflows.fatherLaborExpenses.amount +
                         fund.outflows.personalAdvances.amount;

    const ownerBankId = bankAccounts.find(ba => 
        (settings?.owner_bank_account_id && ba.id === settings.owner_bank_account_id) || 
        ba.is_owner_account === true || 
        ba.account_type === 'owner_current' || 
        ba.name === 'جاري المالك - تمويل شخصي' || 
        ba.name?.includes('جاري المالك')
    )?.id;
    const cycleOwnerTx = ownerBankId ? bankTransactions.filter(t => t.cycle_id === fund.id && t.account_id === ownerBankId) : [];
    
    const ownerFundedAmount = cycleOwnerTx.filter(t => t.type === 'withdrawal').reduce((s,t) => s + t.amount, 0);
    const ownerRepayedAmount = cycleOwnerTx.filter(t => t.type === 'deposit').reduce((s,t) => s + t.amount, 0);
    
    const ownerNetBalance = ownerFundedAmount - ownerRepayedAmount;

    const _bankBalance = (fund.outflows.bankDeposits.amount - ownerRepayedAmount) - (fund.inflows.bankWithdrawals - ownerFundedAmount);
    
    const extraInfo = useMemo(() => {
        const farmer = farmers.find(f => f.id === cycle?.responsible_farmer_id);
        const cycleSupplierPayments = supplierPayments.filter(p => p.cycle_id === fund.id);
        const lastPayment = [...cycleSupplierPayments].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
        
        const lastSupplierName = lastPayment 
            ? suppliers.find(s => s.id === lastPayment.supplier_id)?.name 
            : null;

        const cycleExpenses = expenses.filter(e => e.cycle_id === fund.id);
        const cycleAdvances = advances.filter(a => a.cycle_id === fund.id);
        const cycleFarmerWithdrawals = farmerWithdrawals.filter(w => w.cycle_id === fund.id);

        return {
            responsibleFarmer: farmer?.name || cycle?.responsibleFarmer || 'غير محدد',
            lastSupplier: lastSupplierName,
            counts: {
                supplier: cycleSupplierPayments.length,
                farmer: cycleFarmerWithdrawals.length,
                expenses: cycleExpenses.length,
                advances: cycleAdvances.length
            }
        };
    }, [fund.id, cycle, supplierPayments, suppliers, farmers, expenses, advances, farmerWithdrawals]);

    const modalTitle = useMemo(() => {
        if (modalCategory === 'suppliers') return 'كشف مدفوعات الموردين';
        if (modalCategory === 'farmers') return 'كشف حساب المزارعين والعمالة';
        if (modalCategory === 'expenses') return 'كشف المصروفات النقدية';
        if (modalCategory === 'advances') return 'كشف السلف الشخصية والعهد';
        return '';
    }, [modalCategory]);

    const groupedSummary = useMemo(() => {
        if (!modalCategory) return [];
        
        if (modalCategory === 'suppliers') {
            const cycleSupplierPayments = supplierPayments.filter(p => p.cycle_id === fund.id);
            const group: { [id: string]: { id: string; name: string; total: number; count: number } } = {};
            
            cycleSupplierPayments.forEach(p => {
                const supId = p.supplier_id || 'unknown';
                const name = suppliers.find(s => s.id === p.supplier_id)?.name || p.supplierName || 'مورد غير معروف';
                if (!group[supId]) {
                    group[supId] = { id: supId, name, total: 0, count: 0 };
                }
                group[supId].total += Math.abs(safeNum(p.amount));
                group[supId].count += 1;
            });
            return Object.values(group).sort((a, b) => b.total - a.total);
        }
        
        if (modalCategory === 'farmers') {
            const cycleFarmerWithdrawals = farmerWithdrawals.filter(w => w.cycle_id === fund.id);
            const group: { [id: string]: { id: string; name: string; total: number; count: number } } = {};
            
            cycleFarmerWithdrawals.forEach(w => {
                const farmId = w.farmer_id || 'default_responsible';
                const name = farmers.find(f => f.id === w.farmer_id)?.name || w.farmerName || extraInfo.responsibleFarmer;
                if (!group[farmId]) {
                    group[farmId] = { id: farmId, name, total: 0, count: 0 };
                }
                group[farmId].total += Math.abs(safeNum(w.amount));
                group[farmId].count += 1;
            });
            return Object.values(group).sort((a, b) => b.total - a.total);
        }
        
        if (modalCategory === 'expenses') {
            const cycleExpenses = expenses.filter(e => e.cycle_id === fund.id && e.payment_method === 'cash');
            const group: { [id: string]: { id: string; name: string; total: number; count: number } } = {};
            
            cycleExpenses.forEach(e => {
                const catId = e.category_id || 'uncategorized';
                const name = expenseCategories.find(c => c.id === e.category_id)?.name || e.categoryName || 'مصروف عام';
                if (!group[catId]) {
                    group[catId] = { id: catId, name, total: 0, count: 0 };
                }
                group[catId].total += Math.abs(safeNum(e.amount));
                group[catId].count += 1;
            });
            return Object.values(group).sort((a, b) => b.total - a.total);
        }
        
        if (modalCategory === 'advances') {
            const cycleAdvances = advances.filter(a => {
                if (a.cycle_id !== fund.id) return false;
                const isPartner = settings?.person_partner_percentages?.[a.person_id] !== undefined && settings.person_partner_percentages[a.person_id] > 0;
                return !isPartner;
            });
            const group: { [id: string]: { id: string; name: string; total: number; count: number } } = {};
            
            cycleAdvances.forEach(a => {
                const persId = a.person_id || 'unknown';
                const name = persons.find(p => p.id === a.person_id)?.name || a.personName || 'سلفة شخصية';
                if (!group[persId]) {
                    group[persId] = { id: persId, name, total: 0, count: 0 };
                }
                group[persId].total += Math.abs(safeNum(a.amount));
                group[persId].count += 1;
            });
            return Object.values(group).sort((a, b) => b.total - a.total);
        }
        
        return [];
    }, [modalCategory, fund.id, supplierPayments, suppliers, farmerWithdrawals, farmers, expenses, expenseCategories, advances, persons, extraInfo.responsibleFarmer]);

    const individualTxData = useMemo(() => {
        if (!modalCategory || !selectedSubItemId) return [];
        
        if (modalCategory === 'suppliers') {
            return supplierPayments
                .filter(p => p.cycle_id === fund.id && (p.supplier_id || 'unknown') === selectedSubItemId)
                .map(p => ({
                    id: p.id,
                    date: p.date,
                    name: p.description || 'دفعة مورد نقداً',
                    amount: p.amount,
                    note: 'كاش'
                }))
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        }
        
        if (modalCategory === 'farmers') {
            return farmerWithdrawals
                .filter(w => w.cycle_id === fund.id && (w.farmer_id || 'default_responsible') === selectedSubItemId)
                .map(w => ({
                    id: w.id,
                    date: w.date,
                    name: w.description || 'سحب نقدي',
                    amount: w.amount,
                    note: 'كاش'
                }))
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        }
        
        if (modalCategory === 'expenses') {
            return expenses
                .filter(e => e.cycle_id === fund.id && e.payment_method === 'cash' && (e.category_id || 'uncategorized') === selectedSubItemId)
                .map(e => ({
                    id: e.id,
                    date: e.date,
                    name: e.description || 'مصروف تشغيل عام',
                    amount: e.amount,
                    note: 'كاش نثريات'
                }))
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        }
        
        if (modalCategory === 'advances') {
            return advances
                .filter(a => a.cycle_id === fund.id && (a.person_id || 'unknown') === selectedSubItemId)
                .map(a => ({
                    id: a.id,
                    date: a.date,
                    name: a.reason || 'سلفة نقدية',
                    amount: a.amount,
                    note: a.fund ? `صندوق: ${a.fund}` : 'سلفة مؤقتة'
                }))
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        }
        
        return [];
    }, [modalCategory, selectedSubItemId, fund.id, supplierPayments, farmerWithdrawals, expenses, advances]);

    // Create a synthesized recent history list of transactions across all arrays for this cycle
    const recentHistory = useMemo(() => {
        const h: any[] = [];
        
        supplierPayments.filter(p => p.cycle_id === fund.id).forEach(p => {
            h.push({ ...p, typeLabel: 'دفعة مورد', note: suppliers.find(s => s.id === p.supplier_id)?.name || 'غير معروف', isOutflow: true });
        });
        farmerWithdrawals.filter(w => w.cycle_id === fund.id).forEach(w => {
            h.push({ ...w, typeLabel: 'دفعة عمالة/مزارع', note: extraInfo.responsibleFarmer, isOutflow: true });
        });
        expenses.filter(e => e.cycle_id === fund.id).forEach(e => {
            h.push({ 
                ...e, 
                amount: Math.abs(e.amount),
                typeLabel: 'مصروفات تشغيلية', 
                note: e.description || 'مصروف عام', 
                isOutflow: e.amount >= 0 
            });
        });
        // Include external labor expenses in transaction history
        rawExpenses.filter(e => e.cycle_id === fund.id && e.payment_method === 'cash' && isExternalLabor(e)).forEach(e => {
            let noteStr = e.description || 'أجر كاش صوبة مستقلة';
            const currentGhs = settings?.greenhouses || [
                { id: 'mine', name: 'الصوبة الخاصة بي', type: 'mine', is_default: true },
                { id: 'father', name: 'صوبة أبي وأخي', type: 'external' }
            ];
            currentGhs.forEach(g => {
                noteStr = noteStr.replace(`🏠 ${g.name} | `, '').replace(`[${g.name}]`, '');
            });
            noteStr = noteStr.replace('🏠 صوبة أبي وأخي | ', '');
            
            let typeLabel = 'عمالة صوبة مستقلة (كاش)';
            const matchedGh = currentGhs.find(g => e.description.includes(g.name));
            if (matchedGh) {
                typeLabel = `يوميات مستقلة (${matchedGh.name})`;
            }

            h.push({ 
                ...e, 
                amount: Math.abs(e.amount),
                typeLabel, 
                note: noteStr, 
                isOutflow: e.amount >= 0 
            });
        });
        advances.filter(a => a.cycle_id === fund.id && a.funding_source !== 'external_debt').forEach(a => {
            const isRepayment = a.amount < 0;
            h.push({ 
                ...a, 
                amount: Math.abs(a.amount),
                typeLabel: isRepayment ? 'سداد سلفة' : 'سلفة', 
                note: a.actor_name || a.personName || 'سلفة شخصية', 
                isOutflow: !isRepayment 
            });
        });
        cycleOwnerTx.forEach(t => {
            h.push({ ...t, typeLabel: 'تمويل شخصي المالك', note: t.description || 'تحويل مالي للمشروع', isOutflow: t.type === 'deposit' });
        });
        invoices.filter(inv => inv.cycle_id === fund.id).forEach(inv => {
            const isBalanceTransfer = inv.market === 'رصيد منقول';
            h.push({ 
                ...inv, 
                amount: calculateInvoiceTotal(inv.price_items, inv.deductions), 
                typeLabel: isBalanceTransfer ? 'رصيد منقول' : 'وارد مبيعات', 
                note: isBalanceTransfer ? 'رصيد مرحل من العروة السابقة' : (inv.market || 'مبيعات حقلية'), 
                isOutflow: false 
            });
        });
        
        return h.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [fund.id, supplierPayments, suppliers, farmerWithdrawals, extraInfo.responsibleFarmer, expenses, rawExpenses, advances, cycleOwnerTx, invoices, isExternalLabor, settings]);

    return (
        <div className="space-y-6 max-w-4xl mx-auto pb-12 mt-6 animate-page-enter">
            {/* Hero Balance Card */}
            <div className="relative overflow-hidden bg-gradient-to-br from-indigo-950 via-slate-900 to-indigo-900 rounded-3xl p-5 sm:p-6 text-white shadow-xl border border-white/5">
                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/20 rounded-full blur-[100px] -mr-32 -mt-32 pointer-events-none"></div>
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-emerald-500/10 rounded-full blur-[80px] -ml-24 -mb-24 pointer-events-none"></div>
                
                <div className="relative z-10 space-y-5 text-center">
                    {/* Main Balance Container */}
                    <div>
                        <div className="flex items-center justify-center gap-1.5 opacity-80 mb-2">
                            <WalletIcon className="w-4 h-4 text-indigo-300" />
                            <h2 className="text-[10px] sm:text-xs font-black uppercase tracking-[0.2em] text-indigo-100">الرصيد الإجمالي للخزنة (كاش + بنك)</h2>
                        </div>
                        <div className="flex items-baseline justify-center gap-1.5">
                            <span className="text-4xl sm:text-5xl font-black tracking-tighter tabular-nums text-transparent bg-clip-text bg-gradient-to-br from-white to-neutral-300 drop-shadow-sm">{formatNumber(fund.balance + _bankBalance)}</span>
                            <span className="text-sm sm:text-base font-bold text-neutral-400">ج.م</span>
                        </div>
                    </div>

                    {ownerNetBalance > 0 && (
                        <div className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-indigo-500/10 text-indigo-300 rounded-xl border border-indigo-500/20 max-w-fit mx-auto backdrop-blur-sm">
                            <UserIcon className="w-3.5 h-3.5" />
                            <span className="text-[10px] sm:text-xs font-bold">يتضمن تمويل شخصي المالك: <span className="text-indigo-200 font-black">{formatNumber(ownerNetBalance)}</span> ج.م</span>
                        </div>
                    )}
                    
                    {/* In/Out Stats */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-5 border-t border-white/10">
                        {/* Inflow */}
                        <div className="bg-white/5 backdrop-blur-md rounded-2xl p-3 border border-white/10 flex flex-col items-center justify-center text-center group hover:bg-white/10 transition-colors">
                            <div className="flex items-center gap-1.5 mb-1.5">
                                <div className="p-1 bg-emerald-500/20 rounded-xl text-emerald-400 group-hover:scale-110 transition-transform">
                                    <TrendingUpIcon className="w-3.5 h-3.5" />
                                </div>
                                <p className="text-[8px] sm:text-[9px] font-black text-emerald-100/60 uppercase tracking-widest">إجمالي الوارد</p>
                            </div>
                            <p className="text-xs sm:text-sm font-black tabular-nums text-emerald-400">{formatNumber(fund.inflows.totalRevenue + fund.inflows.bankWithdrawals + (fund.inflows.transferredBalance || 0) + (fund.inflows.manualFunding || 0) + (fund.inflows.jointDebtsFunding || 0) + (fund.inflows.individualDebtsFunding || 0))}</p>
                        </div>

                        {/* Outflow */}
                        <div className="bg-white/5 backdrop-blur-md rounded-2xl p-3 border border-white/10 flex flex-col items-center justify-center text-center group hover:bg-white/10 transition-colors">
                            <div className="flex items-center gap-1.5 mb-1.5">
                                <div className="p-1 bg-rose-500/20 rounded-xl text-rose-400 group-hover:scale-110 transition-transform">
                                    <TrendingDownIcon className="w-3.5 h-3.5" />
                                </div>
                                <p className="text-[8px] sm:text-[9px] font-black text-rose-100/60 uppercase tracking-widest">إجمالي الخارج</p>
                            </div>
                            <p className="text-xs sm:text-sm font-black tabular-nums text-rose-400">{formatNumber(totalOutflow)}</p>
                        </div>

                        {/* Cash balance */}
                        <div className="bg-white/5 backdrop-blur-md rounded-2xl p-3 border border-white/10 flex flex-col items-center justify-center text-center group hover:bg-white/10 transition-colors">
                            <div className="flex items-center gap-1.5 mb-1.5">
                                <div className="p-1 bg-amber-500/20 rounded-xl text-amber-400 group-hover:scale-110 transition-transform">
                                    <WalletIcon className="w-3.5 h-3.5" />
                                </div>
                                <p className="text-[8px] sm:text-[9px] font-black text-amber-100/60 uppercase tracking-widest">المتبقي نقداً (كاش)</p>
                            </div>
                            <p className="text-xs sm:text-sm font-black tabular-nums text-amber-400">{formatNumber(fund.balance)}</p>
                        </div>

                        {/* Bank balance */}
                        <div className="bg-white/5 backdrop-blur-md rounded-2xl p-3 border border-white/10 flex flex-col items-center justify-center text-center group hover:bg-white/10 transition-colors">
                            <div className="flex items-center gap-1.5 mb-1.5">
                                <div className="p-1 bg-blue-500/20 rounded-xl text-blue-400 group-hover:scale-110 transition-transform">
                                    <CreditCardIcon className="w-3.5 h-3.5" />
                                </div>
                                <p className="text-[8px] sm:text-[9px] font-black text-blue-100/60 uppercase tracking-widest">المتاح بالبنك</p>
                            </div>
                            <p className="text-xs sm:text-sm font-black tabular-nums text-blue-400">{formatNumber(_bankBalance)}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Outflows Summary */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
                <StatMiniCard 
                    label="مدفوعات الموردين" 
                    value={fund.outflows.supplierPayments.amount} 
                    count={extraInfo.counts.supplier}
                    icon={CreditCardIcon} 
                    colorClass="text-amber-600 dark:text-amber-400" 
                    subLabel={extraInfo.lastSupplier ? `آخر مورد: ${extraInfo.lastSupplier}` : "لا توجد مدفوعات"}
                    subIcon={TruckIcon}
                    onClick={() => openCategoryModal('suppliers')}
                />
                <StatMiniCard 
                    label="سحوبات المزارعين" 
                    value={fund.outflows.farmerWithdrawals.amount} 
                    count={extraInfo.counts.farmer}
                    icon={FarmerAccountIcon} 
                    colorClass="text-blue-600 dark:text-blue-400" 
                    subLabel={`المزارع: ${extraInfo.responsibleFarmer}`}
                    subIcon={UserIcon}
                    onClick={() => openCategoryModal('farmers')}
                />
                <StatMiniCard 
                    label="مصروفات تشغيل" 
                    value={fund.outflows.operatingExpenses.amount} 
                    count={extraInfo.counts.expenses}
                    icon={WalletIcon} 
                    colorClass="text-rose-600 dark:text-rose-400" 
                    subLabel="نثريات نقدية يومية"
                    onClick={() => openCategoryModal('expenses')}
                />
                <StatMiniCard 
                    label="يوميات الصُوَب المستقلة" 
                    value={fund.outflows.fatherLaborExpenses.amount} 
                    count={rawExpenses.filter(e => e.cycle_id === fund.id && e.payment_method === 'cash' && isExternalLabor(e)).length}
                    icon={UsersIcon} 
                    colorClass="text-indigo-600 dark:text-indigo-400" 
                    subLabel="يوميات مسددة كاش منفصلة"
                />
                <StatMiniCard 
                    label="سلفة شخصية" 
                    value={fund.outflows.personalAdvances.amount} 
                    count={extraInfo.counts.advances}
                    icon={UserMinusIcon} 
                    colorClass="text-purple-600 dark:text-purple-400" 
                    subLabel="سلف تخصم من المستحقات"
                    onClick={() => openCategoryModal('advances')}
                />
            </div>

            {/* Detailed Transaction History for this Cycle */}
            <div className="bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 rounded-3xl overflow-hidden shadow-sm">
                <div className="p-5 sm:p-6 border-b border-neutral-105 dark:border-neutral-800 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-neutral-50 dark:bg-neutral-800 rounded-xl">
                            <ClockIcon className="w-5 h-5 text-neutral-500" />
                        </div>
                        <h3 className="text-sm font-black text-neutral-850 dark:text-white uppercase tracking-wider">سجل حركة الصندوق التفصيلي للعروة</h3>
                    </div>
                </div>
                <div className="divide-y divide-neutral-100 dark:divide-neutral-800/50">
                    {recentHistory.length === 0 ? (
                        <div className="p-8 text-center text-neutral-400 text-sm font-bold">
                            لا توجد حركات مسجلة تصف صندوق هذه العروة
                        </div>
                    ) : (
                        recentHistory.map((h, i) => {
                            const isOutflow = h.isOutflow === true;
                            const absoluteAmount = Math.abs(h.amount);
                            const amountColorClass = isOutflow ? 'text-red-500' : 'text-green-600';
                            const sign = isOutflow ? '-' : '+';

                            return (
                                <div key={i} className="p-4 sm:p-5 flex items-center justify-between hover:bg-neutral-50/50 dark:hover:bg-neutral-800/20 transition-colors">
                                    <div className="flex items-center gap-3 sm:gap-4">
                                        <div className={`p-2 sm:p-2.5 rounded-full ${isOutflow ? 'bg-rose-50 text-rose-500 dark:bg-rose-500/10 dark:text-rose-400' : 'bg-emerald-50 text-emerald-500 dark:bg-emerald-500/10 dark:text-emerald-400'}`}>
                                            {isOutflow ? <TrendingDownIcon className="w-4 h-4 sm:w-5 sm:h-5" /> : <TrendingUpIcon className="w-4 h-4 sm:w-5 sm:h-5" />}
                                        </div>
                                        <div>
                                            <p className="text-xs sm:text-sm font-black text-neutral-900 dark:text-white truncate max-w-[150px] sm:max-w-[250px]">{h.note}</p>
                                            <p className="text-[10px] sm:text-xs text-neutral-400 dark:text-neutral-500 font-bold mt-0.5">{h.typeLabel}</p>
                                        </div>
                                    </div>
                                    <div className="text-left">
                                        <p className="text-sm sm:text-base tracking-tight mb-0.5">
                                            <span dir="ltr" className={`${amountColorClass} font-bold font-mono`}>
                                                {sign} {formatNumber(absoluteAmount)}
                                            </span>
                                        </p>
                                        <p className="text-xs text-gray-400 dark:text-neutral-500 font-medium tabular-nums mt-1">{new Date(h.date).toLocaleDateString('en-GB')}</p>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            {/* Info Message Footer */}
            <div className="p-4 sm:p-6 bg-indigo-50 dark:bg-indigo-900/10 rounded-[1.5rem] sm:rounded-[2rem] border border-indigo-100 dark:border-indigo-900/30">
                <p className="text-[10px] sm:text-xs text-indigo-700 dark:text-indigo-300 font-bold leading-relaxed text-center">
                    تم تصفية هذا الجدول التفصيلي ليوضح بدقة حركة "الكاش" الصادرة والواردة لصندوق عروة ({cycle.name}) وعلاقته بحسابات الموردين، والمزارعين، والمصروفات.
                </p>
            </div>

            {/* Modal Detail Popup */}
            {modalCategory && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in text-slate-805 dark:text-white" dir="rtl">
                    <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl w-full max-w-xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden animate-scale-up">
                        {/* Header */}
                        <div className="p-5 sm:p-6 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between gap-4">
                            <div className="flex items-center gap-2">
                                {selectedSubItemId && (
                                    <button 
                                        onClick={() => {
                                            setSelectedSubItemId(null);
                                            setSelectedSubItemName(null);
                                        }}
                                        className="p-1 px-2.5 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-805 dark:hover:bg-neutral-700 rounded-xl text-xs font-black text-neutral-600 dark:text-neutral-300 flex items-center gap-1 transition"
                                    >
                                        <ChevronRightIcon className="w-4 h-4" />
                                        <span>رجوع للكل</span>
                                    </button>
                                )}
                                <h3 className="text-base sm:text-lg font-black text-neutral-850 dark:text-white">
                                    {selectedSubItemName ? `${modalTitle} 👤 ${selectedSubItemName}` : modalTitle}
                                </h3>
                            </div>
                            <button 
                                onClick={() => {
                                    setModalCategory(null);
                                    setSelectedSubItemId(null);
                                    setSelectedSubItemName(null);
                                }}
                                className="p-2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl transition"
                            >
                                <XMarkIcon className="w-5 h-5" />
                            </button>
                        </div>
                        
                        {/* Content */}
                        <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-3">
                            {!selectedSubItemId ? (
                                /* Master List View (Grouped by names/categories) */
                                groupedSummary.length === 0 ? (
                                    <div className="text-center py-12 text-neutral-400 font-bold text-sm">
                                        لا توجد سجلات مسجلة لهذه الفئة في هذه العروة
                                    </div>
                                ) : (
                                    <div className="space-y-2.5">
                                        <p className="text-[10px] font-black text-neutral-400 uppercase tracking-wider mb-2">إجمالي المسحوبات التفصيلية حسب الأسماء والبنود:</p>
                                        {groupedSummary.map((item, idx) => (
                                            <div 
                                                key={item.id || idx} 
                                                onClick={() => {
                                                    setSelectedSubItemId(item.id);
                                                    setSelectedSubItemName(item.name);
                                                }}
                                                className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-850 border border-neutral-100 dark:border-neutral-800/40 hover:border-primary/40 dark:hover:border-primary/40 flex items-center justify-between cursor-pointer group transition duration-200"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-900/10 text-indigo-650 dark:text-indigo-400 flex items-center justify-center shrink-0 font-black text-sm group-hover:scale-110 transition-transform">
                                                        {item.name.charAt(0)}
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-sm font-black text-neutral-800 dark:text-neutral-200 group-hover:text-primary transition-colors">{item.name}</p>
                                                        <p className="text-[10px] text-neutral-450 font-bold mt-0.5">عدد الحركات: {item.count}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-3 font-semibold">
                                                    <div className="text-left font-black text-base text-neutral-900 dark:text-white tabular-nums">
                                                        {formatNumber(item.total)} <span className="text-[10px] font-bold opacity-70">ج.م</span>
                                                    </div>
                                                    <ChevronLeftIcon className="w-5 h-5 text-neutral-400 group-hover:text-primary group-hover:-translate-x-1 transition-all" />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )
                            ) : (
                                /* Details Statement View (Drilldown ledger) */
                                <div className="space-y-4">
                                    {/* Overview statement card */}
                                    <div className="bg-neutral-900 dark:bg-black rounded-2xl p-5 text-neutral-100 flex items-center justify-between border border-white/5 relative overflow-hidden">
                                        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none"></div>
                                        <div className="space-y-1 relative z-10">
                                            <p className="text-[10px] font-black text-neutral-400 uppercase tracking-wider">كشف حساب تفصيلي خلال العروة</p>
                                            <p className="text-sm font-black text-white">{selectedSubItemName}</p>
                                        </div>
                                        <div className="text-left relative z-10">
                                            <p className="text-[9px] font-bold text-neutral-400">إجمالي البند</p>
                                            <p className="text-lg font-black text-rose-500 tracking-tight">
                                                {formatNumber(individualTxData.reduce((s, x) => s + Math.abs(x.amount), 0))}
                                                <span className="text-xs mr-1 opacity-85 font-black">ج.م</span>
                                            </p>
                                        </div>
                                    </div>

                                    {/* Action ledger list */}
                                    {individualTxData.length === 0 ? (
                                        <div className="text-center py-10 text-neutral-400 font-bold text-sm">
                                            لا توجد معاملات مسجلة لهذا البند.
                                        </div>
                                    ) : (
                                        <div className="space-y-2">
                                            <p className="text-[10px] font-black text-neutral-450 uppercase tracking-wider mb-2">سجل الحركات التفصيلية:</p>
                                            {individualTxData.map((item, idx) => (
                                                <div key={item.id || idx} className="p-3.5 rounded-xl bg-neutral-50/70 dark:bg-neutral-800/20 border border-neutral-100 dark:border-neutral-800/50 flex items-center justify-between transition hover:border-neutral-200 dark:hover:border-neutral-700">
                                                    <div className="space-y-1 text-right">
                                                        <p className="text-xs sm:text-sm font-black text-neutral-800 dark:text-neutral-200">{item.name}</p>
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-[10px] text-neutral-400 font-bold tabular-nums">
                                                                {new Date(item.date).toLocaleDateString('en-GB')}
                                                            </span>
                                                            {item.note && (
                                                                <span className="text-[9px] px-2 py-0.5 bg-neutral-100 dark:bg-neutral-800 rounded text-neutral-500 dark:text-neutral-400 font-black">
                                                                    {item.note}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="text-left font-black text-sm sm:text-base text-rose-600 dark:text-rose-400 tabular-nums">
                                                        {formatNumber(item.amount)} <span className="text-[10px] font-bold opacity-70">ج.م</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                        
                        {/* Footer */}
                        <div className="p-4 bg-neutral-50 dark:bg-neutral-950 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between font-black">
                            <span className="text-xs sm:text-sm text-neutral-500">
                                {!selectedSubItemId ? "إجمالي الفئة للعروة:" : "إجمالي المعاملات للبند:"}
                            </span>
                            <span className="text-sm sm:text-lg text-rose-600 dark:text-rose-400 tabular-nums">
                                {formatNumber(
                                    !selectedSubItemId 
                                        ? groupedSummary.reduce((s, x) => s + x.total, 0)
                                        : individualTxData.reduce((s, x) => s + x.amount, 0)
                                )} ج.م
                            </span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TreasuryTab;
