import React, { useState, useMemo } from 'react';
import { useData } from '../../contexts/DataContext';
import { useSettings } from '../../contexts/SettingsContext';
import { formatNumber, calculateInvoiceTotal, getInvoiceRetainedDetails } from '../../utils/helpers';
import { Info, ChevronDown, ChevronUp, CheckCircle2, ArrowLeft, Layers, ShieldCheck, Scale } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface GlobalFinancialReconciliationProps {
    filteredInvoices?: any[];
    filteredExpenses?: any[];
    filteredAdvances?: any[];
    filteredFarmerWithdrawals?: any[];
    filteredSupplierPayments?: any[];
    filteredTotalRevenue?: number;
    filteredTotalFarmerShare?: number;
    filteredTotalExpenses?: number;
    filteredOwnerNetProfit?: number;
}

const GlobalFinancialReconciliation: React.FC<GlobalFinancialReconciliationProps> = ({
    filteredInvoices,
    filteredExpenses,
    filteredAdvances,
    filteredFarmerWithdrawals,
    filteredSupplierPayments,
    filteredTotalRevenue,
    filteredTotalFarmerShare,
    filteredTotalExpenses,
    filteredOwnerNetProfit
}) => {
    const [isExpanded, setIsExpanded] = useState(false);

    const { 
        invoices: allInvoices,
        expenses: allExpenses, 
        advances: allAdvances, 
        farmerWithdrawals: allFarmerWithdrawals, 
        supplierPayments: allSupplierPayments, 
        totalRevenue: allTotalRevenue,
        totalFarmerShare: allTotalFarmerShare,
        ownerNetProfit: allOwnerNetProfit,
        expenseCategories
    } = useData();

    const invoices = filteredInvoices || allInvoices;
    const expenses = filteredExpenses || allExpenses;
    const advances = filteredAdvances || allAdvances;
    const farmerWithdrawals = filteredFarmerWithdrawals || allFarmerWithdrawals;
    const supplierPayments = filteredSupplierPayments || allSupplierPayments;
    const totalRevenue = filteredTotalRevenue !== undefined ? filteredTotalRevenue : allTotalRevenue;
    const totalFarmerShare = filteredTotalFarmerShare !== undefined ? filteredTotalFarmerShare : allTotalFarmerShare;
    const ownerNetProfit = filteredOwnerNetProfit !== undefined ? filteredOwnerNetProfit : allOwnerNetProfit;

    // Expenses Categories
    const establishmentCash = useMemo(() => 
        expenses.filter(e => (e.is_establishment === true || String(e.is_establishment) === 'true') && e.payment_method === 'cash')
                .reduce((s, e) => s + (Number(e.amount) || 0), 0), 
    [expenses]);

    const operatingCash = useMemo(() => 
        expenses.filter(e => (e.is_establishment === false || String(e.is_establishment) === 'false' || !e.is_establishment) && e.payment_method === 'cash')
                .reduce((s, e) => s + (Number(e.amount) || 0), 0), 
    [expenses]);

    const totalCredit = useMemo(() => 
        expenses.filter(e => e.payment_method === 'credit')
                .reduce((s, e) => s + (Number(e.amount) || 0), 0), 
    [expenses]);

    const totalExpensesSum = useMemo(() => {
        if (filteredTotalExpenses !== undefined) return filteredTotalExpenses;
        return expenses.reduce((s, e) => s + (Number(e.amount) || 0), 0);
    }, [expenses, filteredTotalExpenses]);

    // Supplier payments
    const totalSupplierPayments = useMemo(() => 
        supplierPayments.reduce((s, p) => s + (Number(p.amount) || 0), 0), 
    [supplierPayments]);
    
    // Remaining supplier debt
    const remainingSupplierDebt = Math.max(0, totalCredit - totalSupplierPayments);

    const { settings } = useSettings();
    const isFarmerEnabled = settings?.systems?.farmer_account !== false;

    // Farmer
    const totalFarmerWithdrawals = useMemo(() => 
        farmerWithdrawals.reduce((s, w) => s + (Number(w.amount) || 0), 0), 
    [farmerWithdrawals]);

    const remainingFarmerDues = isFarmerEnabled ? (totalFarmerShare - totalFarmerWithdrawals) : 0;
    const farmerOverdrawn = isFarmerEnabled && remainingFarmerDues < 0 ? Math.abs(remainingFarmerDues) : 0;
    const farmerOwed = isFarmerEnabled && remainingFarmerDues > 0 ? remainingFarmerDues : 0;

    // --- CASH FLOW & TREASURY ALIGNMENT ---
    const cashInvoices = useMemo(() => {
        return (invoices || []).filter(i => 
            i.market !== 'رصيد منقول' && 
            i.market !== 'تمويل يدوي'
        );
    }, [invoices]);

    const cashRevenue = useMemo(() => {
        return cashInvoices.reduce((s, i) => {
            const net = Number(calculateInvoiceTotal(i.price_items || [], i.deductions || [])) || 0;
            const { isRetained, surplus } = getInvoiceRetainedDetails(i.description, i.is_retained_debt, net);
            return s + (isRetained ? surplus : net);
        }, 0);
    }, [cashInvoices]);

    // Exclude ALL non-cash advances (Profit transfers, paper debts)
    const cashAdvancesList = useMemo(() => {
        return (advances || []).filter(a => {
            if (a.is_retained_debt || a.source_type === 'invoice' || a.source_ref_id || a.reason?.includes('[INVOICE_REPAYMENT:')) return false;
            if (a.reason?.includes('[TRANSFERRED]') || a.reason?.includes('ترحيل')) return false;
            const isExternal = a.funding_source === 'external_debt' || a.reason?.includes('[EXTERNAL_DEBT]');
            if (isExternal) {
                const isCashEntered = a.is_entered_treasury === true || a.reason?.includes('[ENTERED_TREASURY]');
                const isCashPaid = a.is_paid_from_treasury === true || a.reason?.includes('[PAID_FROM_TREASURY]');
                if (!isCashEntered && !isCashPaid) return false;
            }
            return true;
        });
    }, [advances]);

    const cashAdvances = useMemo(() => {
        return cashAdvancesList.reduce((s, a) => s + (Number(a.amount) || 0), 0);
    }, [cashAdvancesList]);

    // Set of IDs identifying Joint Debt categories robustly
    const jointDebtCategoryIds = useMemo(() => {
        return new Set(
            (expenseCategories || [])
                .filter(cat => cat.is_joint_debt_category || cat.category_type === 'joint_debt' || cat.name === 'سداد ديون والتزامات مشتركة')
                .map(cat => cat.id)
        );
    }, [expenseCategories]);

    // Track Joint Debt payments paid from Treasury (to balance the math)
    const jointDebtTreasuryPayments = useMemo(() => 
        expenses.filter(e => 
            (
                e.is_joint_debt_payment === true ||
                jointDebtCategoryIds.has(e.category_id) ||
                e.category_id === 'joint_debt_payment' ||
                e.category === 'سداد ديون والتزامات مشتركة' || 
                e.categoryName === 'سداد ديون والتزامات مشتركة'
            ) && e.payment_method === 'cash'
        ).reduce((s, e) => s + (Number(e.amount) || 0), 0), 
    [expenses, jointDebtCategoryIds]);

    const currentTreasury = cashRevenue - (operatingCash + totalSupplierPayments + cashAdvances + totalFarmerWithdrawals);
    const ownerTotalExpected = establishmentCash + ownerNetProfit;

    // Added jointDebtTreasuryPayments back to Assets since they were paid out of the drawer for the partners
    const mathReconciliation = currentTreasury + cashAdvances + jointDebtTreasuryPayments + farmerOverdrawn - remainingSupplierDebt - farmerOwed;
    const isReconciled = Math.abs(mathReconciliation - ownerTotalExpected) < 1;

    if (ownerNetProfit <= 0 && totalRevenue <= 0) return null;

    return (
        <div className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-sm overflow-hidden transition-all duration-300">
            {/* Header & Waterfall Flow Bar Container */}
            <div className="p-4 sm:p-6 bg-gradient-to-br from-neutral-50/50 via-white to-indigo-50/30 dark:from-neutral-900 dark:via-neutral-900 dark:to-indigo-950/20 border-b border-neutral-100 dark:border-neutral-800/60">
                
                {/* Title & Quick Status Action */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                            <Scale className="w-5 h-5" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="text-base font-black text-neutral-900 dark:text-white">
                                    المطابقة ومسار التدفق المالي
                                </h3>
                                {isReconciled ? (
                                    <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/40">
                                        <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                                        مطابقة 100%
                                    </span>
                                ) : (
                                    <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800/40">
                                        <Info className="w-3 h-3 text-amber-500" />
                                        فارق تسوية: {formatNumber(Math.abs(mathReconciliation - ownerTotalExpected))} ج.م
                                    </span>
                                )}
                            </div>
                            <p className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 mt-0.5">
                                تتبع حركة رأس المال من الإيراد حتى صافي الربح والخزينة
                            </p>
                        </div>
                    </div>

                    {/* Accordion Toggle Button */}
                    <button
                        onClick={() => setIsExpanded(prev => !prev)}
                        className="self-start sm:self-auto flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-extrabold bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-200 border border-neutral-200/80 dark:border-neutral-700/80 shadow-soft hover:bg-neutral-50 dark:hover:bg-neutral-700/50 transition-all cursor-pointer active:scale-95 shrink-0"
                    >
                        <span>{isExpanded ? 'طي تفاصيل المطابقة' : 'عرض تفاصيل المطابقة الشاملة'}</span>
                        {isExpanded ? (
                            <ChevronUp className="w-4 h-4 text-neutral-400 transition-transform" />
                        ) : (
                            <ChevronDown className="w-4 h-4 text-neutral-400 transition-transform" />
                        )}
                    </button>
                </div>

                {/* 🌊 Waterfall Financial Flow Bar */}
                <div className="bg-neutral-100/70 dark:bg-neutral-800/50 p-3 sm:p-4 rounded-2xl border border-neutral-200/60 dark:border-neutral-700/50">
                    <div className="flex items-center justify-between mb-2.5 px-1">
                        <span className="text-[11px] font-extrabold text-neutral-500 dark:text-neutral-400 flex items-center gap-1.5 uppercase tracking-wider">
                            <Layers className="w-3.5 h-3.5 text-indigo-500" />
                            مسار حركة الأموال (Financial Flow)
                        </span>
                        <span className="text-[10px] font-bold text-neutral-400">
                            من المبيعات إلى صافي أرباح المالك
                        </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3 items-stretch">
                        
                        {/* 1. إجمالي الإيراد */}
                        <div className="bg-white dark:bg-neutral-800/90 p-3 rounded-xl border border-neutral-200/70 dark:border-neutral-700/70 flex flex-col justify-between relative overflow-hidden group">
                            <div className="flex justify-between items-center mb-1">
                                <span className="text-[11px] font-bold text-neutral-500 dark:text-neutral-400">1. إجمالي الإيراد</span>
                                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                            </div>
                            <div className="flex items-baseline gap-1">
                                <span className="text-base sm:text-lg font-black text-neutral-900 dark:text-white tabular-nums">
                                    {formatNumber(Math.round(totalRevenue))}
                                </span>
                                <span className="text-[10px] font-bold text-neutral-400">ج.م</span>
                            </div>
                            <span className="text-[9px] font-bold text-neutral-400 mt-1">حجم مبيعات المحصول</span>
                        </div>

                        {/* 2. خصم حصة المزارع */}
                        <div className="bg-white dark:bg-neutral-800/90 p-3 rounded-xl border border-neutral-200/70 dark:border-neutral-700/70 flex flex-col justify-between relative">
                            <div className="hidden lg:flex absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-neutral-200 dark:bg-neutral-700 items-center justify-center z-10 text-neutral-500 dark:text-neutral-300">
                                <ArrowLeft className="w-3 h-3" />
                            </div>
                            <div className="flex justify-between items-center mb-1">
                                <span className="text-[11px] font-bold text-purple-600 dark:text-purple-400">2. (-) حصة المزارع</span>
                                <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                            </div>
                            <div className="flex items-baseline gap-1">
                                <span className="text-base sm:text-lg font-black text-purple-600 dark:text-purple-400 tabular-nums">
                                    -{formatNumber(Math.round(totalFarmerShare))}
                                </span>
                                <span className="text-[10px] font-bold text-neutral-400">ج.م</span>
                            </div>
                            <span className="text-[9px] font-bold text-neutral-400 mt-1">
                                {isFarmerEnabled ? 'نسبة الشريك/المزارع' : 'معطل'}
                            </span>
                        </div>

                        {/* 3. خصم المصروفات */}
                        <div className="bg-white dark:bg-neutral-800/90 p-3 rounded-xl border border-neutral-200/70 dark:border-neutral-700/70 flex flex-col justify-between relative">
                            <div className="hidden lg:flex absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-neutral-200 dark:bg-neutral-700 items-center justify-center z-10 text-neutral-500 dark:text-neutral-300">
                                <ArrowLeft className="w-3 h-3" />
                            </div>
                            <div className="flex justify-between items-center mb-1">
                                <span className="text-[11px] font-bold text-rose-600 dark:text-rose-400">3. (-) إجمالي المصروفات</span>
                                <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                            </div>
                            <div className="flex items-baseline gap-1">
                                <span className="text-base sm:text-lg font-black text-rose-600 dark:text-rose-400 tabular-nums">
                                    -{formatNumber(Math.round(totalExpensesSum))}
                                </span>
                                <span className="text-[10px] font-bold text-neutral-400">ج.م</span>
                            </div>
                            <span className="text-[9px] font-bold text-neutral-400 mt-1">تشغيلي + تأسيسي</span>
                        </div>

                        {/* 4. صافي ربح المالك النهائي */}
                        <div className={`p-3 rounded-xl border flex flex-col justify-between relative ${
                            ownerNetProfit >= 0 
                                ? 'bg-gradient-to-br from-indigo-500 to-indigo-700 text-white border-indigo-400/40 shadow-sm' 
                                : 'bg-gradient-to-br from-rose-500 to-rose-700 text-white border-rose-400/40 shadow-sm'
                        }`}>
                            <div className="hidden lg:flex absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-neutral-200 dark:bg-neutral-700 items-center justify-center z-10 text-neutral-500 dark:text-neutral-300">
                                <ArrowLeft className="w-3 h-3" />
                            </div>
                            <div className="flex justify-between items-center mb-1">
                                <span className="text-[11px] font-black text-indigo-100">4. (=) صافي ربح المالك</span>
                                <ShieldCheck className="w-4 h-4 text-indigo-200" />
                            </div>
                            <div className="flex items-baseline gap-1">
                                <span className="text-base sm:text-lg font-black text-white tabular-nums">
                                    {ownerNetProfit > 0 ? '+' : ''}{formatNumber(Math.round(ownerNetProfit))}
                                </span>
                                <span className="text-[10px] font-bold text-indigo-200">ج.م</span>
                            </div>
                            <span className="text-[9px] font-bold text-indigo-100/90 mt-1">الربح الفعلي النهائي</span>
                        </div>

                    </div>
                </div>

            </div>

            {/* Collapsible Deep Ledger Breakdown */}
            <AnimatePresence>
                {isExpanded && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.25 }}
                        className="overflow-hidden p-5 sm:p-6 bg-white dark:bg-neutral-900 border-t border-neutral-100 dark:border-neutral-800"
                    >
                        <div className="flex flex-col lg:flex-row gap-6 h-full">
                            
                            {/* 1. حق المالك الإجمالي */}
                            <div className="flex-1 space-y-4">
                                <h4 className="text-[11px] font-black text-neutral-500 dark:text-neutral-400 uppercase tracking-widest flex items-center gap-2">
                                    <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 shadow-sm shadow-indigo-500/50"></span> مستحقات المالك (المطلوب تحصيله)
                                </h4>
                                
                                <div className="space-y-3.5 pl-4 border-r-2 border-indigo-100 dark:border-indigo-900/30 mr-2 py-1">
                                    <div className="flex justify-between items-center text-sm" title="تم دفعها من جيب المالك أول العروة، ولابد أن يستردها">
                                        <span className="font-bold text-neutral-600 dark:text-neutral-300">تكلفة تأسيسية مستردة</span>
                                        <span className="font-black tabular-nums">{formatNumber(Math.round(establishmentCash))} ج.م</span>
                                    </div>
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="font-bold text-neutral-600 dark:text-neutral-300">صافي الربح العام للمالك</span>
                                        <span className={`font-black tabular-nums ${ownerNetProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                                            {ownerNetProfit > 0 ? '+' : ''}{formatNumber(Math.round(ownerNetProfit))} ج.م
                                        </span>
                                    </div>
                                </div>
                                
                                <div className="bg-indigo-50 dark:bg-indigo-900/20 p-5 rounded-2xl border border-indigo-100 dark:border-indigo-800/50 flex justify-between items-center mt-4">
                                    <div className="flex flex-col gap-1">
                                        <span className="text-sm font-black text-indigo-700 dark:text-indigo-400">إجمالي المطلوب للمالك</span>
                                        <span className="text-[9px] font-bold text-indigo-500/80 tracking-wider">رأس المال + الأرباح</span>
                                    </div>
                                    <span className="text-2xl font-black text-indigo-700 dark:text-indigo-300 tabular-nums">{formatNumber(Math.round(ownerTotalExpected))} ج.م</span>
                                </div>

                                {isReconciled && (
                                    <div className="flex items-center gap-2 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 p-3 rounded-xl border border-emerald-500/20 mt-2">
                                        <CheckCircle2 className="w-5 h-5 shrink-0" />
                                        <span className="text-[10px] font-bold tracking-wide">المعادلة متطابقة 100%. أموالك المتوقعة تساوي بالضبط محصلة الأصول والخصوم.</span>
                                    </div>
                                )}
                            </div>

                            {/* 2. تسوية المزرعة */}
                            <div className="flex-[1.5] space-y-4">
                                <h4 className="text-[11px] font-black text-neutral-500 dark:text-neutral-400 uppercase tracking-widest flex items-center gap-2">
                                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/50"></span> أين تتواجد هذه الأموال فعلياً؟ (الأصول والخصوم)
                                </h4>
                                
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4 pl-4 border-r-2 border-emerald-100 dark:border-emerald-900/30 mr-2 py-1">
                                    
                                    {/* الإيجابيات (أموال لنا) */}
                                    <div className="space-y-3.5">
                                        <div className="flex justify-between items-center text-sm" title="الإيراد - (التشغيل النقدي للورق + مدفوعات الموردين + السلف + مسحوبات المزارعين)">
                                            <span className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 cursor-help">
                                                <Info className="w-3.5 h-3.5 opacity-60" />
                                                (+) سيولة صافية بدرج المزرعة
                                            </span>
                                            <span className="font-black text-emerald-600 dark:text-emerald-400 tabular-nums">{formatNumber(Math.round(currentTreasury))} ج.م</span>
                                        </div>
                                        <div className="flex justify-between items-center text-sm opacity-90" title="أموال تم إخراجها كسلف للعمال أو مزارعين ولم تسدد بعد">
                                            <span className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 cursor-help">
                                                <Info className="w-3.5 h-3.5 opacity-60" />
                                                (+) ديون لنا بالخارج (سلف)
                                            </span>
                                            <span className="font-black text-emerald-600 dark:text-emerald-400 tabular-nums">{formatNumber(Math.round(cashAdvances))} ج.م</span>
                                        </div>
                                        <div className={`flex justify-between items-center text-sm ${jointDebtTreasuryPayments > 0 ? '' : 'hidden'}`} title="ديون والتزامات مشتركة تم سدادها من سيولة الخزنة (تعتبر مسحوبات شركاء)">
                                            <span className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 cursor-help">
                                                <Info className="w-3.5 h-3.5 opacity-60" />
                                                (+) سداد ديون مشتركة (من الخزنة)
                                            </span>
                                            <span className="font-black text-emerald-600 dark:text-emerald-400 tabular-nums">{formatNumber(Math.round(jointDebtTreasuryPayments))} ج.م</span>
                                        </div>
                                        <div className={`flex justify-between items-center text-sm ${farmerOverdrawn > 0 ? '' : 'opacity-40'}`} title="المزارع أخذ أموالاً تفوق حصته من الأرباح وبالتالي هي ديون لنا عنده">
                                            <span className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 cursor-help">
                                                <Info className="w-3.5 h-3.5 opacity-60" />
                                                (+) سحب بالزيادة للمزارعين
                                            </span>
                                            <span className="font-black text-emerald-600 dark:text-emerald-400 tabular-nums">{formatNumber(Math.round(farmerOverdrawn))} ج.م</span>
                                        </div>
                                    </div>

                                    {/* السلبيات (أموال علينا) */}
                                    <div className="space-y-3.5">
                                        <div className={`flex justify-between items-center text-sm ${remainingSupplierDebt > 0 ? '' : 'opacity-40'}`} title="أموال لم تسدد بعد لطلبيات الأسمدة والمبيدات أو الموردين">
                                            <span className="font-bold text-rose-500 flex items-center gap-1.5 cursor-help">
                                                <Info className="w-3.5 h-3.5 opacity-60" />
                                                (-) ديون علينا (للموردين)
                                            </span>
                                            <span className="font-black text-rose-500 tabular-nums">{formatNumber(Math.round(remainingSupplierDebt))} ج.م</span>
                                        </div>
                                        <div className={`flex justify-between items-center text-sm ${farmerOwed > 0 ? '' : 'opacity-40'}`} title="حصة المزارعين من الربح لم يسحبوها بعد من الخزنة">
                                            <span className="font-bold text-rose-500 flex items-center gap-1.5 cursor-help">
                                                <Info className="w-3.5 h-3.5 opacity-60" />
                                                (-) مستحقات متأخرة للمزارعين
                                            </span>
                                            <span className="font-black text-rose-500 tabular-nums">{formatNumber(Math.round(farmerOwed))} ج.م</span>
                                        </div>
                                        
                                        <div className="pt-2 mt-2 border-t border-neutral-100 dark:border-neutral-800/50 flex justify-between items-center text-sm">
                                            <span className="font-extrabold text-neutral-800 dark:text-neutral-200 flex items-center gap-1.5 cursor-help" title="مجموع الأصول يطرح منها مجموع الخصوم">
                                               <Info className="w-3.5 h-3.5 opacity-40 text-neutral-500" />
                                               = صافي الأصول بالكامل
                                            </span>
                                            <span className="font-black tabular-nums text-indigo-600 dark:text-indigo-400 cursor-help" title={`تساوي ${formatNumber(Math.round(currentTreasury))} + ${formatNumber(Math.round(cashAdvances))} + ${formatNumber(Math.round(farmerOverdrawn))} - ${formatNumber(Math.round(remainingSupplierDebt))} - ${formatNumber(Math.round(farmerOwed))}`}>{formatNumber(Math.round(mathReconciliation))} ج.م</span>
                                        </div>
                                    </div>
                                </div>

                                {/* 3. المؤشرات المالية المتقدمة */}
                                <div className="mt-6 border-t border-neutral-100 dark:border-neutral-800/50 pt-4">
                                    {/* صافي الخزنة إذا تم السداد */}
                                    <div className={`p-3 rounded-xl border ${currentTreasury - (remainingSupplierDebt + farmerOwed) >= 0 ? 'bg-emerald-50/50 border-emerald-100 dark:bg-emerald-900/10 dark:border-emerald-800/30' : 'bg-rose-50/50 border-rose-100 dark:bg-rose-900/10 dark:border-rose-800/30'}`}>
                                        <div className="flex justify-between items-center mb-1">
                                            <span className="text-[10px] font-bold text-neutral-500">صافي الدرج إذا سددنا اليوم</span>
                                            <span className={`text-xs font-black tabular-nums ${currentTreasury - (remainingSupplierDebt + farmerOwed) >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                                                {formatNumber(Math.round(currentTreasury - (remainingSupplierDebt + farmerOwed)))} ج.م
                                            </span>
                                        </div>
                                        <p className="text-[9px] text-neutral-400">ما سيتبقى في الخزنة الفعلي بعد تصفية وتشفير حساب الموردين والمزارع.</p>
                                    </div>
                                </div>
                            </div>

                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default GlobalFinancialReconciliation;
