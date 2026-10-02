import React, { useMemo, useState } from 'react';
import { formatNumber, calculateInvoiceTotal, getInvoiceRetainedDetails } from '../../utils/helpers';
import { X, PieChart, Search } from 'lucide-react';
import { 
    WalletIcon
} from '../Icons';
import { useData } from '../../contexts/DataContext';
import { 
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    BarChart, Bar, Cell
} from 'recharts';

interface TreasuryReportProps {
    onClose: () => void;
    totalLiquidity: number;
    totalCash: number;
    totalBank: number;
}

const TreasuryReport: React.FC<TreasuryReportProps> = ({ 
    onClose,
    totalLiquidity,
    totalCash: _totalCash,
    totalBank: _totalBank
}) => {
    const { 
        cycles, suppliers, farmers, persons,
        bankAccounts, bankTransactions,
        invoices, supplierPayments, farmerWithdrawals,
        rawExpenses, advances, expenseCategories,
        treasuryFunds, settings, partnerDebts
    } = useData();
    const [periodFilter, setPeriodFilter] = useState<'all' | 'year' | 'month'>('all');
    const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
    const [selectedCycleId, setSelectedCycleId] = useState<string>('all');
    const [searchQuery, setSearchQuery] = useState('');
    
    // Build consolidated history across ALL cycles (active and closed)
    const consolidatedHistory = useMemo(() => {
        const h: any[] = [];
        
        const getCycleName = (id: string | undefined) => {
             if (!id) return 'غير محدد';
             return cycles.find(c => c.id === id)?.name || 'غير محدد';
        };

        // 1. Invoices (Inflows)
        (invoices || []).forEach(i => {
            const invoiceTotal = calculateInvoiceTotal(i.price_items || [], i.deductions || []);
            const { isRetained, surplus, retainedAmount } = getInvoiceRetainedDetails(i.description, i.is_retained_debt, invoiceTotal);
            const isBalanceTransfer = i.market === 'رصيد منقول';
            const isManualFunding = i.market === 'تمويل يدوي';
            const amount = isRetained ? surplus : invoiceTotal;
            const cleanDesc = i.description ? i.description.replace(/\s*\[RETAINED_DEBT:.*?\]/g, '').replace(/\s*\[مرصودة\]/g, '').trim() : '';

            const isPureNonCash = isRetained && surplus === 0;

            let typeLabel = 'توريد إنتاج مبيعات';
            let description = i.invoice_number ? `فاتورة مبيعات رقـم #${i.invoice_number}` : (cleanDesc || 'مبيعات المحصول بالكيلو');
            let subNote = `الزبون: ${i.market || 'سوق محلي'}`;

            if (isRetained) {
                if (surplus > 0) {
                    typeLabel = 'فائض مبيعات مرصودة';
                    description = `(فائض نقدي للخزنة بعد سداد دين ${formatNumber(retainedAmount)} ج) ${cleanDesc || 'مبيعات المحصول بالكيلو'}`;
                    subNote = `سداد دين: ${formatNumber(retainedAmount)} ج | فائض كاش وارد: ${formatNumber(surplus)} ج 🔄`;
                } else {
                    typeLabel = 'فاتورة مرصودة للدين';
                    description = `(مرصودة لسداد مديونية المعلم) ${cleanDesc || 'مبيعات المحصول بالكيلو'}`;
                    subNote = 'سداد دين من المنبع (0 كاش) 🔄';
                }
            } else if (isBalanceTransfer) {
                typeLabel = 'رصيد منقول';
                description = cleanDesc || 'تحويل رصيد نقدي مرحل من العروة السابقة';
                subNote = 'صافي الرصيد المرحل';
            } else if (isManualFunding) {
                typeLabel = 'تمويل شخصي/يدوي من المالك';
                description = cleanDesc || 'تمويل كاش إضافي من المالك لتغذية الخزنة';
                subNote = 'تمويل شخصي من جيب المالك 💼';
            }

            h.push({
                id: `invoice-${i.id}`,
                rawDate: new Date(i.date),
                dateStr: i.date,
                amount,
                typeLabel,
                description,
                subNote,
                isOutflow: false,
                cycleId: i.cycle_id,
                cycleName: getCycleName(i.cycle_id),
                isRetained,
                isPureNonCash,
                surplus,
                retainedAmount,
                isManualFunding,
                isBalanceTransfer,
                originalAmount: invoiceTotal
            });
        });

        // 2. Bank Transactions
        (bankTransactions || []).forEach(t => {
            const accName = bankAccounts.find(ba => ba.id === t.account_id)?.name || 'الحساب البنكي';
            const isOutflow = t.type === 'deposit'; 
            h.push({
                id: `bank-${t.id}`,
                rawDate: new Date(t.date),
                dateStr: t.date,
                amount: t.amount,
                typeLabel: isOutflow ? 'إيداع بالبنك من الخزنة' : 'سحب من البنك للخزنة',
                description: isOutflow ? `تغذية حساب البنك` : `سحب كاش للخزنة`,
                subNote: accName,
                isOutflow,
                cycleId: t.cycle_id,
                cycleName: getCycleName(t.cycle_id)
            });
        });

        // 3. Supplier Payments
        (supplierPayments || []).forEach(p => {
            const supName = suppliers.find(s => s.id === p.supplier_id)?.name || 'مورد';
            h.push({
                id: `supplier-${p.id}`,
                rawDate: new Date(p.date),
                dateStr: p.date,
                amount: p.amount,
                typeLabel: 'دفعات الموردين',
                description: `سداد نقدي للمورد`,
                subNote: supName,
                isOutflow: true,
                cycleId: p.cycle_id,
                cycleName: getCycleName(p.cycle_id)
            });
        });

        // 4. Farmer Withdrawals
        (farmerWithdrawals || []).forEach(w => {
            const farmerName = farmers.find(f => f.id === w.farmer_id)?.name || '';
            h.push({
                id: `farmer-${w.id}`,
                rawDate: new Date(w.date),
                dateStr: w.date,
                amount: w.amount,
                typeLabel: 'سحوبات مزارعين',
                description: `سحب نقدي من الخزنة`,
                subNote: farmerName,
                isOutflow: true,
                cycleId: w.cycle_id,
                cycleName: getCycleName(w.cycle_id)
            });
        });

        // 5. Cash Expenses
        (rawExpenses || []).filter(e => e.payment_method === 'cash').forEach(e => {
            const catName = expenseCategories?.find(c => c.id === e.category_id)?.name || e.categoryName || 'مصروف عام';
            const isEst = e.is_establishment === true || String(e.is_establishment) === 'true';
            h.push({
                id: `expense-${e.id}`,
                rawDate: new Date(e.date),
                dateStr: e.date,
                amount: Math.abs(e.amount),
                typeLabel: `مصروفات: ${catName}`,
                description: e.description || `سداد مصروفات ${isEst ? 'تأسيسية' : 'تشغيل'} نقداً`,
                subNote: isEst ? 'مصاريف تأسيس الحقل' : 'مصاريف تشغيل الحقل',
                isOutflow: e.amount >= 0,
                cycleId: e.cycle_id,
                cycleName: getCycleName(e.cycle_id)
            });
        });

        // 6. Advances
        (advances || []).forEach(a => {
            const isExternalDebt = a.funding_source === 'external_debt' || 
                                   a.reason?.includes('[EXTERNAL_DEBT]');
            const enteredTreasury = a.is_entered_treasury === true || 
                                    a.reason?.includes('[ENTERED_TREASURY]');
            const paidFromTreasury = a.is_paid_from_treasury === true || 
                                     a.reason?.includes('[PAID_FROM_TREASURY]');
            const isInvoiceRepayment = Boolean(a.is_retained_debt) || 
                                       a.source_type === 'invoice' || 
                                       Boolean(a.source_ref_id) || 
                                       a.reason?.includes('[INVOICE_REPAYMENT:');
            
            const personName = (persons || []).find(p => p.id === a.person_id)?.name || a.personName || 'غير معروف';

            if (isExternalDebt) {
                if (enteredTreasury && a.amount > 0) {
                    h.push({
                        id: `advance-ext-${a.id}`,
                        rawDate: new Date(a.date),
                        dateStr: a.date,
                        amount: Math.abs(a.amount),
                        typeLabel: 'تمويل دين فردي (سيولة)',
                        description: a.reason?.replace('[ENTERED_TREASURY]', '').replace('[EXTERNAL_DEBT]', '').trim() || 'دين فردي خارجي دخل الخزنة كاش',
                        subNote: `بواسطة الشريك: ${personName}`,
                        isOutflow: false,
                        cycleId: a.cycle_id,
                        cycleName: getCycleName(a.cycle_id)
                    });
                } else if (a.amount < 0) {
                    if (paidFromTreasury) {
                        h.push({
                            id: `advance-ext-repay-${a.id}`,
                            rawDate: new Date(a.date),
                            dateStr: a.date,
                            amount: Math.abs(a.amount),
                            typeLabel: 'سداد دين المعلم (كاش من الخزنة)',
                            description: a.reason?.replace('[PAID_FROM_TREASURY]', '').replace('[EXTERNAL_DEBT]', '').trim() || 'سداد جزء من دين المعلم كاش من الخزنة',
                            subNote: personName,
                            isOutflow: true,
                            cycleId: a.cycle_id,
                            cycleName: getCycleName(a.cycle_id)
                        });
                    } else if (isInvoiceRepayment) {
                        h.push({
                            id: `advance-ext-repay-nocash-${a.id}`,
                            rawDate: new Date(a.date),
                            dateStr: a.date,
                            amount: 0, // non-cash
                            typeLabel: 'سداد دين المعلم (تسوية مخصومة)',
                            description: `(تسوية غير نقدية من فاتورة) ${a.reason?.replace(/\[EXTERNAL_DEBT\]/g, '').replace(/\[INVOICE_REPAYMENT:.*?\]/g, '').trim() || ''}`,
                            subNote: personName,
                            isOutflow: true,
                            cycleId: a.cycle_id,
                            cycleName: getCycleName(a.cycle_id),
                            isRetained: true,
                            isPureNonCash: true,
                            originalAmount: Math.abs(a.amount)
                        });
                    }
                }
            } else {
                const isRepayment = a.amount < 0;
                h.push({
                    id: `advance-${a.id}`,
                    rawDate: new Date(a.date),
                    dateStr: a.date,
                    amount: Math.abs(a.amount),
                    typeLabel: isRepayment ? 'سداد سلف شخصية' : 'سلف شخصية',
                    description: isRepayment ? `سداد جزء من السلفة الشخصية` : `صرف سلفة نقدية لمستحقّها`,
                    subNote: personName,
                    isOutflow: !isRepayment,
                    cycleId: a.cycle_id,
                    cycleName: getCycleName(a.cycle_id)
                });
            }
        });

        // 7. Joint Debts (Inflows to treasury)
        (partnerDebts || [])
            .filter(d => Boolean(d.entered_treasury))
            .forEach(d => {
                h.push({
                    id: `joint-debt-inflow-${d.id}`,
                    rawDate: new Date(d.date),
                    dateStr: d.date,
                    amount: d.total_amount ?? d.totalAmount ?? 0,
                    typeLabel: 'تمويل دين مشترك (سيولة)',
                    description: `تمويل كاش مشترك: ${d.description}`,
                    subNote: 'دخل الخزنة كسيولة نقدية ✅',
                    isOutflow: false,
                    cycleId: d.cycle_id || undefined,
                    cycleName: d.cycle_id ? getCycleName(d.cycle_id) : 'غير محدد'
                });
            });

        // Sort newest first
        return h.sort((a, b) => b.rawDate.getTime() - a.rawDate.getTime());

    }, [cycles, bankAccounts, bankTransactions, invoices, supplierPayments, farmerWithdrawals, rawExpenses, advances, expenseCategories, suppliers, farmers, settings, partnerDebts]);

    const filteredHistory = useMemo(() => {
        let list = [...consolidatedHistory];
        if (selectedCycleId !== 'all') {
            list = list.filter(tx => tx.cycleId === selectedCycleId);
        }
        
        // Calculate running balances backward (since list is sorted newest first)
        let targetBalance = totalLiquidity; // default for 'all' is total current liquidity
        
        if (selectedCycleId !== 'all') {
            const cycleFund = (treasuryFunds || []).find(f => f.id === selectedCycleId);
            targetBalance = cycleFund ? cycleFund.balance : 0;
        }
        
        let running = targetBalance;
        return list.map(tx => {
            const txWithBalance = { ...tx, runningBalance: running };
            
            // Adjust running backward for the previous (older) transaction
            if (tx.isPureNonCash || tx.amount === 0) {
                // Non-cash retained settlements have 0 cash impact
            } else if (selectedCycleId !== 'all') {
                // For a specific cycle, we trace the CASH safe drawer balance.
                // EVERY cash transaction (including bank deposits/withdrawals) affects cash.
                // Outflows decrease cash, so going backward adds them. Inflows increase cash, so going backward subtracts them.
                running += tx.isOutflow ? tx.amount : -tx.amount;
            } else {
                // For all cycles combined, we trace the TOTAL LIQUIDITY of the project.
                // Bank transactions and internal balance transfers are internal transfers, so impact is 0.
                const isBankTx = tx.id.startsWith('bank-');
                const isInternalBalanceTransfer = tx.isBalanceTransfer;
                if (!isBankTx && !isInternalBalanceTransfer) {
                    running += tx.isOutflow ? tx.amount : -tx.amount;
                }
            }
            
            return txWithBalance;
        });
    }, [consolidatedHistory, selectedCycleId, totalLiquidity, treasuryFunds]);

    // Derived states and analytics

    const stats = useMemo(() => {
        let inflow = 0;
        let outflow = 0;
        let largestInflow = 0;
        let largestOutflow = 0;
        let salesRevenue = 0;
        let manualFunding = 0;
        
        filteredHistory.forEach(tx => {
            if (periodFilter === 'year' && tx.rawDate.getFullYear() !== selectedYear) return;
            if (tx.isPureNonCash || tx.amount === 0) return;
            
            const isBankTx = tx.id.startsWith('bank-');
            if (isBankTx && selectedCycleId === 'all') return; // Keep internal transfers out of revenue/expenses metrics
            
            if (tx.isOutflow) {
                outflow += tx.amount;
                if (tx.amount > largestOutflow) largestOutflow = tx.amount;
            } else {
                inflow += tx.amount;
                if (tx.amount > largestInflow) largestInflow = tx.amount;
                if (tx.isManualFunding) {
                    manualFunding += tx.amount;
                } else if (!tx.isBalanceTransfer && !tx.id.startsWith('advance-ext-') && !tx.id.startsWith('joint-debt-')) {
                    salesRevenue += tx.amount;
                }
            }
        });
        
        return { 
            inflow, 
            outflow, 
            largestInflow, 
            largestOutflow, 
            salesRevenue,
            manualFunding,
            net: inflow - outflow 
        };
    }, [filteredHistory, periodFilter, selectedYear, selectedCycleId]);

    const categoryBreakdown = useMemo(() => {
        const breakDown: Record<string, number> = {};
        filteredHistory.forEach(tx => {
             if (periodFilter === 'year' && tx.rawDate.getFullYear() !== selectedYear) return;
             if (!tx.isOutflow || tx.isPureNonCash || tx.amount <= 0) return;
             const isBankTx = tx.id.startsWith('bank-');
             if (isBankTx) return;
             const label = tx.typeLabel || 'آخر';
             breakDown[label] = (breakDown[label] || 0) + tx.amount;
        });
        return Object.entries(breakDown)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value);
    }, [filteredHistory, periodFilter, selectedYear]);

    const COLORS = ['#059669', '#0d9488', '#10b981', '#14b8a6', '#34d399', '#2dd4bf', '#66c2a5', '#a7f3d0'];

    const getEmojiForTx = (tx: any) => {
        const id = tx.id || '';
        const typeLabel = tx.typeLabel || '';
        
        if (tx.isRetained) {
            return '🔄';
        }
        if (tx.isManualFunding || typeLabel.includes('تمويل شخصي') || typeLabel.includes('يدوي')) {
            return '💼';
        }
        if (id.startsWith('bank-')) {
            return '🏦';
        }
        if (id.startsWith('supplier-') || typeLabel.includes('مورد')) {
            return '🚜';
        }
        if (typeLabel.includes('العمالة') || typeLabel.includes('أجور') || typeLabel.includes('عمل') || typeLabel.includes('عامله') || typeLabel.includes('عامل')) {
            return '👷‍♂️';
        }
        if (id.startsWith('farmer-') || typeLabel.includes('مزارع') || typeLabel.includes('سحوبات')) {
            return '👨‍🌾';
        }
        if (typeLabel.includes('سلف') || typeLabel.includes('سلفة')) {
            return '👤';
        }
        if (typeLabel.includes('توريد') || typeLabel.includes('مبيعات') || typeLabel.includes('إنتاج')) {
            return '🌾';
        }
        if (typeLabel.includes('دين مشترك') || typeLabel.includes('دين فردي')) {
            return '🤝';
        }
        return '💰';
    };

    const displayHistory = useMemo(() => {
        let list = filteredHistory.filter(tx => periodFilter === 'all' || tx.rawDate.getFullYear() === selectedYear);
        
        if (searchQuery.trim()) {
            const query = searchQuery.trim().toLowerCase();
            list = list.filter(tx => {
                const typeLabel = (tx.typeLabel || '').toLowerCase();
                const description = (tx.description || '').toLowerCase();
                const subNote = (tx.subNote || '').toLowerCase();
                const cycleName = (tx.cycleName || '').toLowerCase();
                const amountStr = String(tx.amount || '');
                const originalAmountStr = String(tx.originalAmount || '');
                
                return typeLabel.includes(query) || 
                       description.includes(query) || 
                       subNote.includes(query) || 
                       cycleName.includes(query) ||
                       amountStr.includes(query) ||
                       originalAmountStr.includes(query);
            });
        }
        return list;
    }, [filteredHistory, periodFilter, selectedYear, searchQuery]);

    return (
        <div className="fixed inset-0 z-[100] bg-neutral-100 dark:bg-neutral-950 overflow-y-auto w-full h-full text-right" dir="rtl">
            <div className="max-w-4xl mx-auto px-4 py-6 sm:px-6 sm:py-8 min-h-screen flex flex-col">
                
                {/* Sleek, Minimal Banking Header */}
                <div className="flex items-center justify-between mb-6 sticky top-0 bg-neutral-100/80 dark:bg-neutral-950/80 backdrop-blur-md z-25 py-3 border-b border-neutral-200/50 dark:border-neutral-800/50">
                    <h2 className="text-lg font-black text-neutral-900 dark:text-white">كشف حركات الخزنة الموحد</h2>
                    <button 
                        onClick={onClose}
                        className="bg-neutral-200/60 hover:bg-neutral-300/60 dark:bg-neutral-800/60 dark:hover:bg-neutral-700/60 tap transition-all p-2 rounded-full outline-none cursor-pointer"
                    >
                        <X className="w-5 h-5 text-neutral-700 dark:text-neutral-300" />
                    </button>
                </div>

                {/* Banking Filters */}
                <div className="flex flex-wrap items-center gap-2 mb-6">
                    <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto overflow-x-auto pb-2 sm:pb-0">
                        <div className="flex bg-neutral-200/55 dark:bg-neutral-900 rounded-xl p-1 shrink-0 w-full sm:w-auto overflow-x-auto">
                            <button 
                                className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all ${periodFilter === 'all' ? 'bg-white dark:bg-neutral-800 text-emerald-650 shadow-xs' : 'text-neutral-500 hover:text-neutral-750 dark:text-neutral-400'}`}
                                onClick={() => setPeriodFilter('all')}
                            >
                                كل الأوقات
                            </button>
                            <button 
                                className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all ${periodFilter === 'year' ? 'bg-white dark:bg-neutral-800 text-emerald-650 shadow-xs' : 'text-neutral-500 hover:text-neutral-750 dark:text-neutral-400'}`}
                                onClick={() => setPeriodFilter('year')}
                            >
                                تحديد سنة
                            </button>
                            
                            <div className="w-[1px] bg-neutral-300 dark:bg-neutral-700 mx-1.5 self-center h-4"></div>
                            
                            <select 
                                className="bg-transparent border-none text-xs font-black text-neutral-600 dark:text-neutral-300 outline-none px-2 pr-6 cursor-pointer whitespace-nowrap"
                                value={selectedCycleId}
                                onChange={(e) => setSelectedCycleId(e.target.value)}
                            >
                                <option value="all">كل العروات والمصروفات العامة</option>
                                {cycles.map(cycle => (
                                    <option key={cycle.id} value={cycle.id}>{cycle.name} {cycle.status === 'closed' ? '(مغلقة)' : ''}</option>
                                ))}
                            </select>
                        </div>
                        
                        {periodFilter === 'year' && (
                            <select 
                                className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl px-4 py-2 text-xs font-black text-neutral-800 dark:text-neutral-200 cursor-pointer outline-none shrink-0"
                                value={selectedYear}
                                onChange={(e) => setSelectedYear(Number(e.target.value))}
                            >
                                {Array.from(new Set(consolidatedHistory.map(tx => tx.rawDate.getFullYear()))).sort((a,b) => b-a).map(year => (
                                    <option key={year} value={year}>{year}</option>
                                ))}
                            </select>
                        )}
                    </div>
                </div>

                {/* Hero Balance Card (Banking Style) */}
                <div className="bg-gradient-to-br from-[#064e3b] via-[#043e34] to-[#012e31] text-white rounded-[2rem] p-6 sm:p-8 relative overflow-hidden shadow-2xl shadow-emerald-950/25 border border-accent-success/20 mb-6 w-full text-center">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-accent-success/5 rounded-full blur-3xl -translate-y-16 translate-x-16 pointer-events-none" />
                    <div className="absolute bottom-0 left-0 w-64 h-64 bg-cyan-500/5 rounded-full blur-3xl translate-y-16 -translate-x-16 pointer-events-none" />
                    <div className="relative z-10 flex flex-col items-center select-none">
                        <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-emerald-250 opacity-90 mb-3 block">
                            💰 السيولة الحالية للموازنة
                        </span>
                        <div className="flex items-baseline justify-center gap-1.5 mb-2">
                            <span className="text-3xl sm:text-5xl font-black tracking-tight tabular-nums">
                                {formatNumber(totalLiquidity)}
                            </span>
                            <span className="text-sm sm:text-lg font-bold text-emerald-300 shrink-0">ج.م</span>
                        </div>
                        
                        {/* Two smaller figures underneath inside the same card */}
                        <div className="w-full grid grid-cols-2 gap-4 mt-6 pt-5 border-t border-white/10">
                            <div className="text-center">
                                <span className="text-2xs sm:text-[11px] text-emerald-200/70 block mb-1 font-bold">إجمالي الوارد ⬇️</span>
                                <span className="text-sm sm:text-base font-black text-[#6ee7b7] tabular-nums">
                                    {formatNumber(stats.inflow)} <span className="text-2xs font-bold">ج.م</span>
                                </span>
                            </div>
                            <div className="text-center border-r border-white/10">
                                <span className="text-2xs sm:text-[11px] text-rose-200/70 block mb-1 font-bold">إجمالي المنصرف ⬆️</span>
                                <span className="text-sm sm:text-base font-black text-[#fca5a5] tabular-nums">
                                    {formatNumber(stats.outflow)} <span className="text-2xs font-bold">ج.م</span>
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Compact Bar Chart for Expense Breakdown */}
                {categoryBreakdown.length > 0 && (
                    <div className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200/60 dark:border-neutral-800 p-5 shadow-xs flex flex-col mb-6 animate-fade-in">
                        <h3 className="text-xs font-black text-neutral-800 dark:text-neutral-200 mb-4 flex items-center gap-2">
                            <PieChart className="w-4 h-4 text-accent-success" />
                            تحليل المنصرفات جرافيكياً
                        </h3>
                        <div className="w-full h-[140px]" dir="ltr">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={categoryBreakdown.slice(0, 5)} layout="vertical" margin={{ top: 0, right: 10, left: 10, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#525252" opacity={0.1} />
                                    <XAxis type="number" hide />
                                    <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#888' }} width={80} />
                                    <Tooltip 
                                        cursor={{fill: '#e5e5e5', opacity: 0.1}} 
                                        contentStyle={{ backgroundColor: '#171717', borderRadius: '12px', border: 'none', color: '#fff', fontSize: '11px', textAlign: 'right' }} 
                                        formatter={(value: number) => [formatNumber(value) + ' ج.م', 'القيمة']}
                                    />
                                    <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={12}>
                                        {categoryBreakdown.slice(0, 5).map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="mt-3 border-t border-neutral-100 dark:border-neutral-800 pt-3 flex justify-between items-center text-2xs">
                            <span className="text-neutral-500">الأعلى كلفة</span>
                            <span className="font-extrabold text-neutral-850 dark:text-neutral-200">
                                {categoryBreakdown.length > 0 ? `${categoryBreakdown[0].name.replace('مصروفات: ', '')}` : '-'}
                            </span>
                        </div>
                    </div>
                )}

                {/* Clean, Smart Search Bar */}
                <div className="relative mb-6">
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                        <Search className="w-4 h-4 text-neutral-400" />
                    </div>
                    <input 
                        type="text"
                        className="w-full h-10 pr-9 pl-4 bg-neutral-200/30 dark:bg-neutral-900/40 hover:bg-neutral-200/50 dark:hover:bg-neutral-900/50 focus:bg-white dark:focus:bg-neutral-900 border border-neutral-200/20 dark:border-neutral-800/20 focus:border-accent-success/20 text-xs text-neutral-850 dark:text-neutral-250 placeholder-neutral-400 dark:placeholder-neutral-500 rounded-xl outline-none transition-all text-right shadow-xs"
                        placeholder="ابحث باسم الحركة، الصوبة، أو البيان..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        dir="rtl"
                    />
                    {searchQuery && (
                        <button 
                            onClick={() => setSearchQuery('')}
                            className="absolute inset-y-0 left-0 flex items-center pl-3 text-neutral-400 hover:text-accent-danger dark:hover:text-accent-danger text-xs font-bold transition-colors"
                        >
                            مسح
                        </button>
                    )}
                </div>

                {/* Sleek Banking List View Transaction Log — Highly readable */}
                <div className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200/60 dark:border-neutral-800 shadow-xs flex-grow flex flex-col overflow-hidden mb-6">
                    <div className="p-5 border-b border-neutral-100 dark:border-neutral-800 flex justify-between items-center">
                         <h3 className="text-sm font-black text-neutral-800 dark:text-neutral-200 flex items-center gap-2">
                             <WalletIcon className="w-5 h-5 text-emerald-550" />
                             سجل الحركات المالية
                         </h3>
                         <span className="text-2xs bg-neutral-100 dark:bg-neutral-800 text-neutral-500 px-3 py-1 rounded-full font-black">
                             {displayHistory.length} حركة مسجلة
                         </span>
                    </div>

                    <div className="divide-y divide-neutral-100 dark:divide-neutral-800/60 max-h-[500px] overflow-y-auto">
                        {displayHistory.length === 0 ? (
                            <div className="py-16 text-center text-neutral-400 font-bold text-xs">
                                لا توجد عمليات مسجلة متوفرة حالياً
                            </div>
                        ) : (
                            displayHistory.map((tx) => (
                                <div key={tx.id} className="flex items-start justify-between p-4 hover:bg-neutral-50 dark:hover:bg-neutral-800/30 transition-all gap-4">
                                    {/* Right side: Circular Icon, Type, Subtitle, details & badges */}
                                    <div className="flex items-start gap-3.5 min-w-0 flex-1">
                                        {/* Circular Icon with gentle matching colors */}
                                        <div className="w-10 h-10 rounded-full flex items-center justify-center text-base bg-accent-success/10 dark:bg-accent-success/20 border border-accent-success/20/50 dark:border-accent-success/30/10 shrink-0 mt-0.5">
                                            {getEmojiForTx(tx)}
                                        </div>
                                        {/* Name & subtitle */}
                                        <div className="flex flex-col min-w-0 pr-1 flex-1">
                                            <div className="flex flex-wrap items-center gap-1.5 flex-row">
                                                <span className="text-xs sm:text-sm font-black text-neutral-900 dark:text-neutral-100">
                                                    {tx.typeLabel}
                                                </span>
                                                
                                                {/* Specific badge showing name / person / party */}
                                                {tx.subNote && (
                                                    <span className="text-2xs font-black bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 px-2 py-0.5 rounded-md border border-neutral-200/40 dark:border-neutral-700/40 shrink-0">
                                                        {tx.id.startsWith('advance-') ? `المستلم: ${tx.subNote}` : 
                                                         tx.id.startsWith('supplier-') ? `المورد: ${tx.subNote}` :
                                                         tx.id.startsWith('farmer-') ? `المزارع: ${tx.subNote}` :
                                                         tx.id.startsWith('bank-') ? `البنك: ${tx.subNote}` :
                                                         tx.subNote}
                                                    </span>
                                                )}
                                            </div>

                                            {/* Rich descriptive note if available */}
                                            {tx.description && tx.description !== 'سحب نقدي من الخزنة' && tx.description !== 'صرف سلفة نقدية لمستحقّها' && tx.description !== 'سداد نقدي للمورد' && (
                                                <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-1 font-medium leading-relaxed">
                                                    {tx.description}
                                                </p>
                                            )}

                                            <span className="text-2xs text-neutral-400 dark:text-neutral-500 mt-1 flex items-center gap-1.5 flex-wrap">
                                                <span>{new Date(tx.dateStr).toLocaleDateString('ar-EG', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                                                {tx.cycleName && (
                                                    <>
                                                        <span className="opacity-40 select-none">•</span>
                                                        <span className="text-accent-success dark:text-accent-success font-extrabold">{tx.cycleName}</span>
                                                    </>
                                                )}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Left side: Amount & Running Balance */}
                                    <div className="flex flex-col items-end text-left shrink-0 pl-1.5 mt-0.5">
                                        {tx.isPureNonCash || tx.amount === 0 ? (
                                            <div className="flex flex-col items-end gap-1">
                                                <div className="px-2 py-1 rounded-md font-semibold font-mono text-2xs sm:text-xs bg-accent-warning/10 text-accent-warning dark:text-accent-warning border border-accent-warning/20">
                                                    <span>تسوية: {formatNumber(tx.originalAmount)}</span>
                                                    <span className="text-2xs pr-1 font-bold">ج.م</span>
                                                </div>
                                                <span className="text-2xs font-black text-accent-warning dark:text-accent-warning bg-accent-warning/5 px-1 py-0.5 rounded">
                                                    أثر نقدي: ٠ ج.م 🔄
                                                </span>
                                            </div>
                                        ) : tx.isRetained && tx.amount > 0 ? (
                                            <div className="flex flex-col items-end gap-1">
                                                <div className="px-2 py-1 rounded-md font-semibold font-mono text-xs sm:text-sm tracking-tight bg-accent-success/10 dark:bg-accent-success/20 text-accent-success dark:text-accent-success border border-accent-success/20">
                                                    <span dir="ltr">+ {formatNumber(tx.amount)}</span>
                                                    <span className="text-2xs pr-1 font-bold">ج.م</span>
                                                </div>
                                                <span className="text-2xs font-black text-accent-success dark:text-accent-success bg-accent-success/10 px-1.5 py-0.5 rounded">
                                                    فائض كاش (تسوية دين {formatNumber((tx.originalAmount || 0) - tx.amount)} ج)
                                                </span>
                                            </div>
                                        ) : (
                                            <div className={`px-2 py-1 rounded-md font-semibold font-mono text-xs sm:text-sm tracking-tight mb-0.5 ${!tx.isOutflow ? 'bg-accent-success/10 dark:bg-accent-success/20 text-accent-success dark:text-accent-success' : 'bg-accent-danger/10 dark:bg-accent-danger/20 text-accent-danger dark:text-accent-danger'}`}>
                                                <span dir="ltr">{!tx.isOutflow ? '+' : '-'} {formatNumber(Math.abs(tx.amount))}</span>
                                                <span className="text-2xs pr-1 font-bold">ج.م</span>
                                            </div>
                                        )}
                                        <span className="text-2xs text-neutral-450 dark:text-neutral-500 mt-1 font-bold tabular-nums">
                                            رصيد: {formatNumber(tx.runningBalance)} ج.م
                                        </span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
};

export default TreasuryReport;
