import React, { useState, useMemo } from 'react';
import Card from '../shared/Card';
import { 
    ArrowUpRight, 
    ArrowDownLeft, 
    HandCoins, 
    Calendar, 
    Sprout, 
     
     
     
     
    Building2, 
     
    X, 
    ChevronLeft, 
    
    Receipt
} from 'lucide-react';
import { formatNumber, calculateInvoiceTotal, formatDateShort, formatDateFull } from '../../utils/helpers';
import { useData } from '../../contexts/DataContext';
import { useUI } from '../../contexts/UIContext';
import Skeleton from '../shared/Skeleton';
import { motion, AnimatePresence } from 'motion/react';

interface RecentTransactionsProps {
    filteredInvoices?: any[];
    filteredExpenses?: any[];
    filteredAdvances?: any[];
}

type TransactionType = 'invoice' | 'expense' | 'advance';

interface UnifiedTransaction {
    id: string;
    type: TransactionType;
    title: string;
    subtitle?: string;
    amount: number;
    date: string;
    created_at: string;
    cycleId: string;
    cycleName: string;
    raw: any;
}

const RecentTransactions: React.FC<RecentTransactionsProps> = ({ 
    filteredInvoices, 
    filteredExpenses,
    filteredAdvances 
}) => {
    const { 
        invoices: allInvoices = [], 
        expenses: allExpenses = [], 
        advances: allAdvances = [], 
        cycles = [], 
        persons = [],
        expenseCategories = [] 
    } = useData();
    const { loading } = useUI();
    const [selectedTx, setSelectedTx] = useState<UnifiedTransaction | null>(null);

    const cyclesMap = useMemo(() => {
        const map: Record<string, string> = {};
        (cycles || []).forEach(c => {
            if (c?.id) map[c.id] = c.name;
        });
        return map;
    }, [cycles]);

    const personsMap = useMemo(() => {
        const map: Record<string, string> = {};
        (persons || []).forEach(p => {
            if (p?.id) map[p.id] = p.name;
        });
        return map;
    }, [persons]);

    const categoriesMap = useMemo(() => {
        const map: Record<string, string> = {};
        (expenseCategories || []).forEach(c => {
            if (c?.id) map[c.id] = c.name;
        });
        return map;
    }, [expenseCategories]);

    const sortedTransactions = useMemo(() => {
        const activeCycleIds = new Set((cycles || []).filter(c => c && c.status === 'active').map(c => c.id));
        const srcInvoices = filteredInvoices || allInvoices || [];
        const srcExpenses = filteredExpenses || allExpenses || [];
        const srcAdvances = filteredAdvances || allAdvances || [];

        const invoicesList: UnifiedTransaction[] = srcInvoices
            .filter(inv => activeCycleIds.has(inv.cycle_id) && inv.market !== 'رصيد منقول' && inv.market !== 'تمويل يدوي')
            .map(inv => {
                const total = calculateInvoiceTotal(inv.price_items, inv.deductions);
                const marketName = inv.market || 'سوق عام';
                return {
                    id: inv.id,
                    type: 'invoice' as const,
                    title: inv.description || `فاتورة بيع (${marketName})`,
                    subtitle: marketName,
                    amount: total,
                    date: inv.date,
                    created_at: inv.created_at || inv.date,
                    cycleId: inv.cycle_id,
                    cycleName: cyclesMap[inv.cycle_id] || 'العروة الحالية',
                    raw: inv
                };
            });

        const expensesList: UnifiedTransaction[] = srcExpenses
            .filter(exp => activeCycleIds.has(exp.cycle_id) && exp.category !== 'سداد ديون والتزامات مشتركة' && exp.categoryName !== 'سداد ديون والتزامات مشتركة')
            .map(exp => {
                const categoryName = exp.categoryName || categoriesMap[exp.category_id] || 'مصروف عام';
                return {
                    id: exp.id,
                    type: 'expense' as const,
                    title: exp.description || categoryName,
                    subtitle: categoryName,
                    amount: Number(exp.amount) || 0,
                    date: exp.date,
                    created_at: exp.created_at || exp.date,
                    cycleId: exp.cycle_id,
                    cycleName: cyclesMap[exp.cycle_id] || 'العروة الحالية',
                    raw: exp
                };
            });

        const advancesList: UnifiedTransaction[] = srcAdvances
            .filter(adv => activeCycleIds.has(adv.cycle_id))
            .map(adv => {
                const personName = adv.personName || personsMap[adv.person_id] || 'مستفيد غير محدد';
                return {
                    id: adv.id,
                    type: 'advance' as const,
                    title: `سلفة نقدية: ${personName}`,
                    subtitle: personName,
                    amount: Number(adv.amount) || 0,
                    date: adv.date,
                    created_at: adv.created_at || adv.date,
                    cycleId: adv.cycle_id,
                    cycleName: cyclesMap[adv.cycle_id] || 'العروة الحالية',
                    raw: adv
                };
            });

        const combined = [...invoicesList, ...expensesList, ...advancesList];
        
        return combined.sort((a, b) => {
            const dateB = new Date(b.date).getTime();
            const dateA = new Date(a.date).getTime();
            if (dateB !== dateA) return dateB - dateA;
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        }).slice(0, 6);
    }, [filteredInvoices, filteredExpenses, filteredAdvances, allInvoices, allExpenses, allAdvances, cycles, cyclesMap, personsMap, categoriesMap]);

    if (loading) {
        return (
            <Card>
                <div className="flex items-center justify-between mb-4">
                    <Skeleton className="h-6 w-36" />
                    <Skeleton className="h-5 w-16 rounded-full" />
                </div>
                <div className="space-y-3">
                    {[1, 2, 3, 4, 5].map(i => (
                        <div key={i} className="flex items-center justify-between p-2.5 rounded-xl border border-neutral-100 dark:border-neutral-800">
                            <div className="flex items-center gap-3">
                                <Skeleton className="h-9 w-9 rounded-xl" />
                                <div className="space-y-1.5">
                                    <Skeleton className="h-4 w-32" />
                                    <Skeleton className="h-3 w-20" />
                                </div>
                            </div>
                            <Skeleton className="h-5 w-20" />
                        </div>
                    ))}
                </div>
            </Card>
        );
    }

    return (
        <>
            <Card>
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-600 dark:text-neutral-300">
                            <Receipt className="w-4 h-4" />
                        </div>
                        <div>
                            <h3 className="text-base font-extrabold text-neutral-900 dark:text-white">
                                أحدث المعاملات
                            </h3>
                            <p className="text-[10px] font-semibold text-neutral-400">
                                اضغط على أي معاملة لعرض تفاصيلها
                            </p>
                        </div>
                    </div>
                    <span className="text-[11px] font-bold text-neutral-500 dark:text-neutral-400 bg-neutral-100 dark:bg-neutral-800 px-2.5 py-1 rounded-full">
                        {sortedTransactions.length} حركات
                    </span>
                </div>

                {/* Transactions List */}
                <div className="space-y-2.5">
                    {sortedTransactions.length > 0 ? (
                        sortedTransactions.map(tx => {
                            const isInvoice = tx.type === 'invoice';
                            const isExpense = tx.type === 'expense';
                            const isAdvance = tx.type === 'advance';

                            // Styles based on type
                            const iconBg = isInvoice 
                                ? 'bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20' 
                                : isExpense 
                                    ? 'bg-rose-500/10 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/20' 
                                    : 'bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-500/20';

                            const badgeStyle = isInvoice 
                                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border-emerald-200/60 dark:border-emerald-800/40' 
                                : isExpense 
                                    ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 border-rose-200/60 dark:border-rose-800/40' 
                                    : 'bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 border-blue-200/60 dark:border-blue-800/40';

                            const amountColor = isInvoice 
                                ? 'text-emerald-600 dark:text-emerald-400' 
                                : isExpense 
                                    ? 'text-rose-600 dark:text-rose-400' 
                                    : 'text-blue-600 dark:text-blue-400';

                            const typeLabel = isInvoice ? 'فاتورة بيع' : isExpense ? 'مصروف' : 'سلفة نقدية';

                            return (
                                <div 
                                    key={`${tx.type}-${tx.id}`} 
                                    onClick={() => setSelectedTx(tx)}
                                    className="flex items-center justify-between p-3 rounded-2xl border border-neutral-100 dark:border-neutral-800/70 hover:border-neutral-300 dark:hover:border-neutral-700 bg-neutral-50/40 dark:bg-neutral-900/40 hover:bg-white dark:hover:bg-neutral-800/80 transition-all duration-200 cursor-pointer group active:scale-[0.99] shadow-none hover:shadow-soft"
                                >
                                    <div className="flex items-center gap-3 min-w-0">
                                        {/* Colored Icon */}
                                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-105 ${iconBg}`}>
                                            {isInvoice && <ArrowUpRight className="w-4 h-4" />}
                                            {isExpense && <ArrowDownLeft className="w-4 h-4" />}
                                            {isAdvance && <HandCoins className="w-4 h-4" />}
                                        </div>

                                        {/* Title and Subtitle */}
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-2">
                                                <p className="font-bold text-xs sm:text-sm text-neutral-800 dark:text-neutral-100 truncate group-hover:text-primary transition-colors">
                                                    {tx.title}
                                                </p>
                                                <span className={`hidden sm:inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-extrabold border shrink-0 ${badgeStyle}`}>
                                                    {typeLabel}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2 text-[10px] text-neutral-400 mt-0.5">
                                                <span>{formatDateShort(tx.date)}</span>
                                                <span>•</span>
                                                <span className="truncate">{tx.cycleName}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Amount and Action Indicator */}
                                    <div className="flex items-center gap-2 shrink-0">
                                        <div className="text-left">
                                            <span className={`font-black text-xs sm:text-sm tabular-nums ${amountColor}`}>
                                                {isInvoice ? '+' : '-'}{formatNumber(Math.round(tx.amount))}
                                            </span>
                                            <span className="text-[9px] font-bold text-neutral-400 mr-1">ج.م</span>
                                        </div>
                                        <ChevronLeft className="w-3.5 h-3.5 text-neutral-300 dark:text-neutral-600 group-hover:text-neutral-600 dark:group-hover:text-neutral-300 transition-transform group-hover:-translate-x-0.5" />
                                    </div>
                                </div>
                            );
                        })
                    ) : (
                        <div className="text-center py-6 text-neutral-400 text-xs font-semibold">
                            لا توجد معاملات مسجلة في هذه الفترة
                        </div>
                    )}
                </div>
            </Card>

            {/* 🔍 Transaction Details Modal */}
            <AnimatePresence>
                {selectedTx && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
                        {/* Backdrop */}
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-neutral-900/60 backdrop-blur-sm"
                            onClick={() => setSelectedTx(null)}
                        />

                        {/* Modal Box */}
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 16 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 16 }}
                            transition={{ duration: 0.2 }}
                            className="relative w-full max-w-lg bg-white dark:bg-neutral-900 rounded-3xl shadow-2xl border border-neutral-200/80 dark:border-neutral-800 overflow-hidden z-10 my-8"
                        >
                            {/* Modal Header Banner */}
                            {(() => {
                                const isInvoice = selectedTx.type === 'invoice';
                                const isExpense = selectedTx.type === 'expense';
                                const isAdvance = selectedTx.type === 'advance';

                                const headerBg = isInvoice 
                                    ? 'from-emerald-500 to-emerald-700' 
                                    : isExpense 
                                        ? 'from-rose-500 to-rose-700' 
                                        : 'from-blue-600 to-indigo-700';

                                const typeTitle = isInvoice ? 'تفاصيل فاتورة البيع' : isExpense ? 'تفاصيل المصروف' : 'تفاصيل السلفة النقدية';

                                return (
                                    <div className={`p-6 bg-gradient-to-r ${headerBg} text-white relative`}>
                                        <button 
                                            onClick={() => setSelectedTx(null)}
                                            className="absolute top-4 left-4 p-2 bg-black/20 hover:bg-black/30 rounded-full text-white transition-colors cursor-pointer"
                                            aria-label="إغلاق"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>

                                        <div className="flex items-center gap-2 mb-2 opacity-90 text-xs font-bold">
                                            {isInvoice && <ArrowUpRight className="w-4 h-4" />}
                                            {isExpense && <ArrowDownLeft className="w-4 h-4" />}
                                            {isAdvance && <HandCoins className="w-4 h-4" />}
                                            <span>{typeTitle}</span>
                                        </div>

                                        <div className="flex items-baseline gap-1.5">
                                            <span className="text-3xl font-black tabular-nums tracking-tight">
                                                {isInvoice ? '+' : '-'}{formatNumber(Math.round(selectedTx.amount))}
                                            </span>
                                            <span className="text-sm font-bold opacity-80">جنيه مصري</span>
                                        </div>

                                        <p className="text-xs font-medium opacity-90 mt-1 line-clamp-1">
                                            {selectedTx.title}
                                        </p>
                                    </div>
                                );
                            })()}

                            {/* Modal Body Content */}
                            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                                {/* Basic Info Cards Grid */}
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="bg-neutral-50 dark:bg-neutral-800/60 p-3 rounded-2xl border border-neutral-100 dark:border-neutral-800">
                                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-neutral-400 mb-1">
                                            <Calendar className="w-3.5 h-3.5 text-neutral-500" />
                                            <span>تاريخ المعاملة</span>
                                        </div>
                                        <p className="text-xs font-extrabold text-neutral-800 dark:text-neutral-200">
                                            {formatDateFull(selectedTx.date)}
                                        </p>
                                    </div>

                                    <div className="bg-neutral-50 dark:bg-neutral-800/60 p-3 rounded-2xl border border-neutral-100 dark:border-neutral-800">
                                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-neutral-400 mb-1">
                                            <Sprout className="w-3.5 h-3.5 text-emerald-500" />
                                            <span>العروة / المحصول</span>
                                        </div>
                                        <p className="text-xs font-extrabold text-neutral-800 dark:text-neutral-200 truncate">
                                            {selectedTx.cycleName}
                                        </p>
                                    </div>
                                </div>

                                {/* Detailed Content by Type */}
                                {selectedTx.type === 'invoice' && (
                                    <div className="space-y-3">
                                        {/* Market & Buyer */}
                                        <div className="bg-neutral-50 dark:bg-neutral-800/60 p-3.5 rounded-2xl border border-neutral-100 dark:border-neutral-800 flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <Building2 className="w-4 h-4 text-indigo-500" />
                                                <span className="text-xs font-bold text-neutral-600 dark:text-neutral-300">السوق / المشتري:</span>
                                            </div>
                                            <span className="text-xs font-black text-neutral-900 dark:text-white">
                                                {selectedTx.raw?.market || 'غير محدد'}
                                            </span>
                                        </div>

                                        {/* Price Items Breakdown */}
                                        {selectedTx.raw?.price_items && selectedTx.raw.price_items.length > 0 && (
                                            <div className="border border-neutral-100 dark:border-neutral-800 rounded-2xl p-3.5 bg-neutral-50/50 dark:bg-neutral-800/40">
                                                <span className="text-[11px] font-extrabold text-neutral-500 dark:text-neutral-400 block mb-2">
                                                    بنود المبيعات والوزن:
                                                </span>
                                                <div className="space-y-2">
                                                    {selectedTx.raw.price_items.map((item: any, idx: number) => {
                                                        const rowTotal = (Number(item.quantity) || 0) * (Number(item.price_per_kg) || 0);
                                                        return (
                                                            <div key={idx} className="flex justify-between items-center text-xs bg-white dark:bg-neutral-900 p-2 rounded-xl border border-neutral-100 dark:border-neutral-800">
                                                                <span className="font-bold text-neutral-700 dark:text-neutral-200">
                                                                    {item.quantity} كجم × {item.price_per_kg} ج.م/كجم
                                                                </span>
                                                                <span className="font-black text-emerald-600 dark:text-emerald-400 tabular-nums">
                                                                    {formatNumber(rowTotal)} ج.م
                                                                </span>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}

                                        {/* Deductions Breakdown */}
                                        {selectedTx.raw?.deductions && selectedTx.raw.deductions.length > 0 && (
                                            <div className="border border-neutral-100 dark:border-neutral-800 rounded-2xl p-3.5 bg-rose-50/30 dark:bg-rose-950/20">
                                                <span className="text-[11px] font-extrabold text-rose-600 dark:text-rose-400 block mb-2">
                                                    الخصومات والعمولة:
                                                </span>
                                                <div className="space-y-1.5">
                                                    {selectedTx.raw.deductions.map((ded: any, idx: number) => (
                                                        <div key={idx} className="flex justify-between items-center text-xs">
                                                            <span className="text-neutral-600 dark:text-neutral-300 font-medium">
                                                                {ded.name || 'خصم'}
                                                            </span>
                                                            <span className="font-bold text-rose-600 dark:text-rose-400 tabular-nums">
                                                                -{formatNumber(Number(ded.amount) || 0)} ج.م
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {selectedTx.type === 'expense' && (
                                    <div className="space-y-3">
                                        <div className="bg-neutral-50 dark:bg-neutral-800/60 p-3.5 rounded-2xl border border-neutral-100 dark:border-neutral-800 space-y-2">
                                            <div className="flex justify-between items-center text-xs">
                                                <span className="text-neutral-500 font-bold">بند المصروف:</span>
                                                <span className="font-black text-neutral-800 dark:text-white">
                                                    {selectedTx.raw?.categoryName || categoriesMap[selectedTx.raw?.category_id] || 'عام'}
                                                </span>
                                            </div>
                                            <div className="flex justify-between items-center text-xs">
                                                <span className="text-neutral-500 font-bold">طريقة الدفع:</span>
                                                <span className="font-black text-neutral-800 dark:text-white">
                                                    {selectedTx.raw?.payment_method === 'credit' ? 'آجل (ذمم موردين)' : 'نقدي من الخزينة'}
                                                </span>
                                            </div>
                                            {selectedTx.raw?.is_establishment && (
                                                <div className="flex justify-between items-center text-xs text-indigo-600 dark:text-indigo-400 font-bold">
                                                    <span>طبيعة المصروف:</span>
                                                    <span>تكلفة تأسيسية مستردة</span>
                                                </div>
                                            )}
                                        </div>

                                        {selectedTx.raw?.description && (
                                            <div className="bg-neutral-50 dark:bg-neutral-800/60 p-3 rounded-2xl border border-neutral-100 dark:border-neutral-800">
                                                <span className="text-[10px] font-bold text-neutral-400 block mb-1">
                                                    ملاحظات المصروف:
                                                </span>
                                                <p className="text-xs text-neutral-700 dark:text-neutral-300 font-medium">
                                                    {selectedTx.raw.description}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {selectedTx.type === 'advance' && (
                                    <div className="space-y-3">
                                        <div className="bg-blue-50/40 dark:bg-blue-950/20 p-3.5 rounded-2xl border border-blue-100 dark:border-blue-900/40 space-y-2">
                                            <div className="flex justify-between items-center text-xs">
                                                <span className="text-neutral-500 dark:text-neutral-400 font-bold">المستفيد من السلفة:</span>
                                                <span className="font-black text-blue-700 dark:text-blue-300">
                                                    {selectedTx.subtitle}
                                                </span>
                                            </div>
                                            <div className="flex justify-between items-center text-xs">
                                                <span className="text-neutral-500 dark:text-neutral-400 font-bold">طريقة الصرف:</span>
                                                <span className="font-bold text-neutral-700 dark:text-neutral-300">
                                                    نقدي من درج المزرعة
                                                </span>
                                            </div>
                                        </div>

                                        {selectedTx.raw?.notes && (
                                            <div className="bg-neutral-50 dark:bg-neutral-800/60 p-3 rounded-2xl border border-neutral-100 dark:border-neutral-800">
                                                <span className="text-[10px] font-bold text-neutral-400 block mb-1">
                                                    بيان السلفة / الملاحظات:
                                                </span>
                                                <p className="text-xs text-neutral-700 dark:text-neutral-300 font-medium">
                                                    {selectedTx.raw.notes}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Modal Footer */}
                            <div className="p-4 bg-neutral-50 dark:bg-neutral-800/60 border-t border-neutral-100 dark:border-neutral-800 flex justify-end">
                                <button
                                    onClick={() => setSelectedTx(null)}
                                    className="px-5 py-2.5 rounded-xl bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-xs font-black hover:opacity-90 transition-opacity cursor-pointer"
                                >
                                    إغلاق
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </>
    );
};

export default RecentTransactions;
