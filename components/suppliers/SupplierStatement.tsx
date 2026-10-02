import InlineLoading from "../shared/InlineLoading";
import React, { useMemo, useState } from 'react';
import { useData } from '../../contexts/DataContext';
import { formatCurrency } from '../../utils/helpers';
import type { SupplierPayment } from '../../types';
import { PencilIcon, TrashIcon, LucideTag } from '../Icons';

interface SupplierStatementProps {
    supplierId: string;
    onEdit: (payment: SupplierPayment) => void;
    onDelete: (id: string) => void;
    onEditDiscount: (expenseId: string) => void;
    onDeleteDiscount: (expenseId: string) => void;
}

const SupplierStatement: React.FC<SupplierStatementProps> = ({ supplierId, onEdit, onDelete, onEditDiscount, onDeleteDiscount }) => {
    const { suppliers, rawExpenses: expenses, supplierPayments, highlightedItemId, isPhase2Loading, cycles } = useData();

    // Search, Filter, Sort, Copy states
    const [searchQuery, setSearchQuery] = useState('');
    const [filterType, setFilterType] = useState<'all' | 'expense' | 'payment'>('all');
    const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
    const [copied, setCopied] = useState(false);

    const supplier = useMemo(() => suppliers.find(s => s.id === supplierId), [suppliers, supplierId]);
    const cycleMap = useMemo(() => new Map(cycles.map(c => [c.id, c.name])), [cycles]);



    const transactions = useMemo(() => {
        if (!supplierId) return [];

        const supplierExpenses = expenses
            .filter(e => e.supplier_id === supplierId && e.payment_method === 'credit')
            .map(e => ({
                id: `exp-${e.id}`,
                originalId: e.id,
                type: 'expense' as const,
                date: e.date,
                description: e.description || 'فاتورة مشتريات',
                debit: e.amount || 0,
                credit: 0,
                cycleId: e.cycle_id,
                isDiscount: e.isDiscount || false,
                is_establishment: e.is_establishment || false,
            }));

        const payments = supplierPayments
            .filter(p => p.supplier_id === supplierId)
            .map(p => ({
                ...p,
                originalId: p.id,
                type: 'payment' as const,
                debit: 0,
                credit: p.amount || 0,
                cycleId: p.cycle_id,
            }));

        // Sort Chronologically (Oldest to Newest) for correct balance calculation
        return [...supplierExpenses, ...payments].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    }, [supplierId, expenses, supplierPayments]);

    const openingBalance = supplier?.opening_balance || 0;
    
    // Add running balance and cycle names
    const transactionsWithBalance = useMemo(() => {
        let runningBalance = openingBalance;
        return transactions.map(tx => {
            runningBalance += tx.debit - tx.credit;
            return { 
                ...tx, 
                balance: runningBalance,
                cycleName: tx.cycleId ? cycleMap.get(tx.cycleId) : undefined
            };
        });
    }, [transactions, openingBalance, cycleMap]);

    // Apply interactive search and type filtering
    const filteredTransactions = useMemo(() => {
        return transactionsWithBalance.filter(tx => {
            // Type Filter
            if (filterType !== 'all' && tx.type !== filterType) return false;

            // Search query filter
            if (searchQuery.trim() !== '') {
                const query = searchQuery.toLowerCase();
                const descMatch = (tx.description || '').toLowerCase().includes(query);
                const cycleMatch = (tx.cycleName || '').toLowerCase().includes(query);
                const amountMatch = String(tx.debit || tx.credit || '').includes(query);
                const dateMatch = tx.date.includes(query);
                return descMatch || cycleMatch || amountMatch || dateMatch;
            }

            return true;
        });
    }, [transactionsWithBalance, filterType, searchQuery]);

    // Apply Sorting Toggle
    const displayTransactions = useMemo(() => {
        const sorted = [...filteredTransactions];
        if (sortOrder === 'desc') {
            return sorted.reverse(); // Newest first
        }
        return sorted; // Oldest first
    }, [filteredTransactions, sortOrder]);

    const finalBalance = transactionsWithBalance.length > 0 
        ? transactionsWithBalance[transactionsWithBalance.length - 1].balance 
        : openingBalance;

    const totalDebit = transactions.reduce((sum, tx) => sum + tx.debit, 0) + openingBalance;
    const totalCredit = transactions.reduce((sum, tx) => sum + tx.credit, 0);

    // Format Statement text for sharing/WhatsApp
    const handleCopyStatement = () => {
        if (!supplier) return;
        const dateStr = new Date().toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' });
        
        let text = `📄 *كشف حساب المورد: ${supplier.name}*\n`;
        text += `📅 تاريخ الاستخراج: ${dateStr}\n`;
        text += `----------------------------------------\n`;
        text += `💵 رصيد افتتاحي: ${formatCurrency(openingBalance)}\n`;
        text += `📈 إجمالي المشتريات (عليه): ${formatCurrency(totalDebit)}\n`;
        text += `📉 إجمالي المسدد (له): ${formatCurrency(totalCredit)}\n`;
        text += `----------------------------------------\n`;
        text += `🔴 *الرصيد المتبقي المستحق: ${formatCurrency(finalBalance)}*\n`;
        text += `========================================\n\n`;
        text += `📋 *آخر المعاملات المسجلة:*\n`;

        displayTransactions.slice(0, 10).forEach((tx) => {
            const isExp = tx.type === 'expense';
            const typeText = isExp ? '📥 مشتريات' : '📤 سداد';
            const val = isExp ? tx.debit : tx.credit;
            const cycleText = tx.cycleName ? ` [العروة: ${tx.cycleName}]` : '';
            text += `• ${tx.date} - ${tx.description}${cycleText}\n  👈 القيمة: ${formatCurrency(val)} | (${typeText}) | الرصيد: ${formatCurrency(tx.balance)}\n`;
        });

        if (displayTransactions.length > 10) {
            text += `• ... ومتبقي حركات أخرى.\n`;
        }

        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    if (!supplier) {
        if (isPhase2Loading) {
            return (
                <div className="p-12 text-center space-y-4">
                    <InlineLoading message="جاري استخراج كشف الحساب والمطابقات المالية..." />
                    <p className="text-neutral-500 font-bold">جاري تحضير بيانات المورد...</p>
                </div>
            );
        }
        return <div className="p-4 text-center">لم يتم العثور على المورد.</div>;
    }

    return (
        <div className="max-h-[75vh] overflow-y-auto pr-2 -mr-2 text-right font-sans">
            <div className="space-y-6 p-1">
                {/* Compact, Overhauled Remaining Balance Card with Total Purchases & Payments Integrated */}
                <div className="space-y-3">
                    {/* Compact King Card: Outstanding Balance to Pay with internal sub-metrics */}
                    <div className="bg-gradient-to-br from-neutral-900 via-slate-900 to-indigo-950 text-white rounded-xl p-3 sm:p-4 border border-slate-800 shadow-md relative overflow-hidden group transition-all duration-300">
                        {/* Elegant background highlight glow */}
                        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-550/5 rounded-full blur-[40px] pointer-events-none group-hover:bg-emerald-550/10 transition-all duration-500" />
                        
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 relative z-10">
                            <div>
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-2xs font-black tracking-wider text-accent-success bg-accent-success/10 border border-accent-success/20 shadow-xs mb-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                    المطلوب سداده للمورد (الرصيد المتبقي)
                                </span>
                                
                                <div className="flex items-baseline gap-0.5 mt-0.5">
                                    <p className="font-extrabold text-xl sm:text-2xl tracking-tight tabular-nums truncate text-accent-success drop-shadow-sm">
                                        {formatCurrency(finalBalance)}
                                    </p>
                                    <span className="text-2xs font-bold text-neutral-400 mr-1">ج.م</span>
                                </div>
                            </div>

                            <div className="flex flex-col sm:items-end justify-center">
                                <span className="text-2xs text-neutral-450 font-medium">اسم المورد</span>
                                <span className="text-xs sm:text-sm font-extrabold text-white">{supplier.name}</span>
                                {supplier.phone && (
                                    <span className="text-2xs text-neutral-500 font-mono" dir="ltr">{supplier.phone}</span>
                                )}
                            </div>
                        </div>

                        {/* Internal Sub-metrics in footer: Total Purchases and Total Paid */}
                        <div className="mt-2.5 pt-2 border-t border-white/10 grid grid-cols-2 gap-3 text-right relative z-10">
                            <div>
                                <span className="text-2xs text-slate-400 block font-bold mb-0.5">إجمالي المشتريات (عليه)</span>
                                <div className="flex items-baseline gap-1">
                                    <span className="text-xs sm:text-sm font-extrabold text-accent-danger tabular-nums">
                                        {formatCurrency(totalDebit)}
                                    </span>
                                    <span className="text-2xs text-slate-450 font-bold mr-0.5">ج.م</span>
                                </div>
                            </div>
                            <div className="border-r border-white/10 pr-3">
                                <span className="text-2xs text-slate-400 block font-bold mb-0.5">إجمالي المسدد (له)</span>
                                <div className="flex items-baseline gap-1">
                                    <span className="text-xs sm:text-sm font-extrabold text-accent-success tabular-nums">
                                        {formatCurrency(totalCredit)}
                                    </span>
                                    <span className="text-2xs text-slate-450 font-bold mr-0.5">ج.م</span>
                                </div>
                            </div>
                        </div>

                        {/* Subtle Transaction/Account Info Bar */}
                        <div className="mt-2 pt-1.5 border-t border-white/5 flex items-center justify-between text-2xs sm:text-2xs text-slate-500 font-medium relative z-10">
                            <span>مجموع العمليات: {transactions.length} معاملة</span>
                            <span>الرصيد الافتتاحي: {formatCurrency(openingBalance)} ج.م</span>
                        </div>
                    </div>
                </div>

                {/* Search, Filter, Sort, Export Toolbar */}
                <div className="bg-neutral-50 dark:bg-neutral-900/60 p-2 rounded-xl border border-neutral-200/60 dark:border-neutral-800/80 flex flex-col sm:flex-row gap-2 items-stretch sm:items-center justify-between">
                    
                    {/* Search Field */}
                    <div className="relative flex-1">
                        <input
                            type="text"
                            placeholder="بحث في البيان، القيمة، أو العروة..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pr-8 pl-3 py-1 bg-white dark:bg-neutral-800 rounded-lg border border-neutral-250 dark:border-neutral-700/80 text-[11px] font-bold text-neutral-800 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-1 focus:ring-indigo-505 focus:border-indigo-505 transition-all"
                        />
                        <svg className="absolute right-2.5 top-2 w-3.5 h-3.5 text-neutral-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </div>

                    {/* Filter Type Pills */}
                    <div className="flex bg-neutral-100 dark:bg-neutral-800/80 p-0.5 rounded-lg gap-0.5 shrink-0 self-center sm:self-auto">
                        <button
                            onClick={() => setFilterType('all')}
                            className={`px-2 py-1 rounded-md text-2xs font-black transition-all ${filterType === 'all' ? 'bg-white dark:bg-neutral-700 text-neutral-800 dark:text-white shadow-xs' : 'text-neutral-550 dark:text-neutral-450 hover:text-neutral-850'}`}
                        >
                            الكل
                        </button>
                        <button
                            onClick={() => setFilterType('expense')}
                            className={`px-2 py-1 rounded-md text-2xs font-black transition-all ${filterType === 'expense' ? 'bg-accent-danger text-white shadow-xs' : 'text-neutral-550 dark:text-neutral-450 hover:text-neutral-850'}`}
                        >
                            مشتريات
                        </button>
                        <button
                            onClick={() => setFilterType('payment')}
                            className={`px-2 py-1 rounded-md text-2xs font-black transition-all ${filterType === 'payment' ? 'bg-accent-success text-white shadow-xs' : 'text-neutral-550 dark:text-neutral-450 hover:text-neutral-850'}`}
                        >
                            مدفوعات
                        </button>
                    </div>

                    {/* Sorting & Sharing Actions */}
                    <div className="flex items-center gap-1.5 shrink-0 justify-center sm:justify-end">
                        {/* Sort Toggle Button */}
                        <button
                            onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
                            className="p-1 sm:p-1.5 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700/80 rounded-lg text-neutral-600 dark:text-neutral-350 hover:bg-neutral-50 dark:hover:bg-neutral-750 transition-all flex items-center gap-1 text-2xs font-black"
                            title={sortOrder === 'desc' ? 'الترتيب: الأحدث أولاً' : 'الترتيب: الأقدم أولاً'}
                        >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
                            </svg>
                            <span>{sortOrder === 'desc' ? 'الأحدث' : 'الأقدم'}</span>
                        </button>

                        {/* WhatsApp Ready Export Tool */}
                        <button
                            onClick={handleCopyStatement}
                            className={`px-2.5 py-1.5 rounded-lg text-2xs font-black flex items-center gap-1 transition-all shadow-xs ${copied ? 'bg-accent-success text-white' : 'bg-indigo-600 hover:bg-indigo-700 text-white'}`}
                        >
                            {copied ? (
                                <>
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                                    </svg>
                                    <span>تم نسخ البيان !</span>
                                </>
                            ) : (
                                <>
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                                    </svg>
                                    <span>نسخ للواتس</span>
                                </>
                            )}
                        </button>
                    </div>

                </div>

                {/* Transactions Timeline */}
                {displayTransactions.length > 0 || openingBalance > 0 ? (
                    <div>
                        {displayTransactions.length === 0 && searchQuery !== '' && (
                            <div className="text-center py-12 text-neutral-450 border border-dashed border-neutral-200 dark:border-neutral-800 rounded-3xl">
                                لم يتم العثور على أي حركات تطابق "{searchQuery}"
                            </div>
                        )}

                        <div className="relative border-r-2 border-neutral-200 dark:border-neutral-800 pr-6 space-y-4 mt-4">
                            {displayTransactions.map((tx) => {
                                const isSelectedForHighlight = highlightedItemId != null && (String(highlightedItemId) === String(tx.originalId) || String(highlightedItemId) === String(tx.id) || String(highlightedItemId) === String((tx as any)._stable_id));
                                const isExp = tx.type === 'expense';

                                return (
                                <div key={tx.id} className="relative">
                                    {/* Timeline Dot */}
                                    <div className={`absolute -right-[31px] top-[22px] w-3 h-3 rounded-full border-2 border-white dark:border-neutral-950 ${isExp ? (tx.debit < 0 ? 'bg-violet-500 shadow-violet-200/50' : 'bg-accent-danger shadow-rose-200/50') : 'bg-accent-success shadow-emerald-250/50'} shadow-md z-10`} />
                                    
                                    {/* Overhauled individual transaction card - compact, beautiful & overflow-free */}
                                    <div className={`p-4 bg-white dark:bg-neutral-900 rounded-2xl border ${isSelectedForHighlight ? 'border-primary/40 bg-primary/[0.02] ring-2 ring-primary/10' : 'border-neutral-200/60 dark:border-neutral-800/80'} hover:border-primary/20 hover:shadow-sm transition-all duration-300 flex items-center justify-between gap-3 shadow-xs`}>
                                        
                                        {/* Right side: Icon, Title, Date & Cycle tags */}
                                        <div className="flex items-center gap-3 min-w-0">
                                            {/* Beautiful icon badge */}
                                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                                                isExp 
                                                    ? (tx.debit < 0 
                                                        ? 'bg-violet-50 dark:bg-violet-950/20 text-violet-600 dark:text-violet-400' 
                                                        : 'bg-accent-danger/10 dark:bg-accent-danger/20 text-accent-danger dark:text-accent-danger')
                                                    : 'bg-accent-success/10 dark:bg-accent-success/20 text-accent-success dark:text-accent-success'
                                            }`}>
                                                {isExp ? (
                                                    tx.debit < 0 ? (
                                                        <LucideTag className="w-4.5 h-4.5" strokeWidth={2.5} />
                                                    ) : (
                                                        <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                        </svg>
                                                    )
                                                ) : (
                                                    <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                                                    </svg>
                                                )}
                                            </div>
 
                                            {/* Text descriptions */}
                                            <div className="min-w-0">
                                                <div className="flex flex-wrap items-center gap-1.5">
                                                    <span className={`text-2xs font-black px-1.5 py-0.5 rounded-md ${
                                                        isExp 
                                                            ? (tx.debit < 0 
                                                                ? 'text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-950/30'
                                                                : 'text-accent-danger dark:text-accent-danger bg-accent-danger/10 dark:bg-accent-danger/20')
                                                            : 'text-accent-success dark:text-accent-success bg-accent-success/10 dark:bg-accent-success/20'
                                                    }`}>
                                                        {isExp ? (tx.debit < 0 ? 'خصم ممنوح' : 'شراء آجل') : 'دفعة نقدية'}
                                                    </span>
 
                                                    {tx.cycleName && (
                                                        <span className="inline-flex items-center gap-1 text-[8.5px] font-black text-accent-info dark:text-indigo-450 bg-accent-info/10 dark:bg-accent-info/20 px-1.5 py-0.5 rounded-md border border-accent-info/20 dark:border-accent-info/30">
                                                            <span className="w-1 h-1 rounded-full bg-indigo-500 animate-pulse" />
                                                            {tx.cycleName}
                                                        </span>
                                                    )}
                                                </div>
 
                                                <h4 className="font-extrabold text-neutral-850 dark:text-neutral-100 text-xs mt-1 truncate max-w-[180px] sm:max-w-xs">{tx.description}</h4>
                                                <p className="text-2xs text-neutral-400 dark:text-neutral-500 mt-0.5 tracking-tight">{tx.date}</p>
                                            </div>
                                        </div>
 
                                        {/* Left side: Money amount & Edit/Delete actions */}
                                        <div className="flex items-center gap-2.5 shrink-0">
                                            {/* Values */}
                                            <div className="text-left flex flex-col items-end">
                                                <div className="flex items-baseline gap-0.5">
                                                    <span className={`text-sm sm:text-base font-black tabular-nums ${
                                                        isExp 
                                                            ? (tx.debit < 0 ? 'text-violet-600 dark:text-violet-450' : 'text-accent-danger dark:text-rose-455') 
                                                            : 'text-accent-success dark:text-emerald-455'
                                                    }`}>
                                                        {isExp ? (tx.debit < 0 ? `-${formatCurrency(Math.abs(tx.debit))}` : `+${formatCurrency(tx.debit)}`) : `-${formatCurrency(tx.credit)}`}
                                                    </span>
                                                    <span className="text-2xs font-bold text-neutral-400">ج.م</span>
                                                </div>
                                                <span className="text-[8.5px] font-black text-accent-info dark:text-accent-info bg-indigo-500/[0.04] dark:bg-indigo-500/[0.08] px-1 rounded mt-0.5 border border-indigo-500/5">
                                                    الرصيد: {formatCurrency(tx.balance)}
                                                </span>
                                            </div>
 
                                            {/* Action icons */}
                                            {(!isExp || tx.debit < 0) && (
                                                <div className="flex items-center gap-0.5 border-r border-neutral-200 dark:border-neutral-800 pr-1.5 mr-0.5">
                                                    {!isExp && onEdit && (
                                                        <button 
                                                            onClick={() => onEdit(tx as SupplierPayment)} 
                                                            className="p-1 rounded-lg text-neutral-400 hover:text-accent-info hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                                                            title="تعديل الدفعة"
                                                        >
                                                            <PencilIcon className="w-3.5 h-3.5" />
                                                        </button>
                                                    )}
                                                    {isExp && tx.debit < 0 && onEditDiscount && (
                                                        <button 
                                                            onClick={() => onEditDiscount(tx.originalId)} 
                                                            className="p-1 rounded-lg text-neutral-400 hover:text-accent-info hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                                                            title="تعديل الخصم"
                                                        >
                                                            <PencilIcon className="w-3.5 h-3.5" />
                                                        </button>
                                                    )}
                                                    {!isExp && onDelete && (
                                                        <button 
                                                            onClick={() => onDelete(tx.id)} 
                                                            className="p-1 rounded-lg text-neutral-400 hover:text-accent-danger hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                                                            title="حذف الدفعة"
                                                        >
                                                            <TrashIcon className="w-3.5 h-3.5" />
                                                        </button>
                                                    )}
                                                    {isExp && tx.debit < 0 && onDeleteDiscount && (
                                                        <button 
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                onDeleteDiscount(tx.originalId);
                                                            }} 
                                                            className="p-1 rounded-lg text-neutral-400 hover:text-accent-danger hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                                                            title="حذف الخصم"
                                                            type="button"
                                                        >
                                                            <TrashIcon className="w-3.5 h-3.5" />
                                                        </button>
                                                    )}
                                                </div>
                                            )}
                                        </div>
 
                                    </div>
                                </div>
                                );
                            })}
                            
                            {openingBalance > 0 && (
                                <div className="relative">
                                    <div className="absolute -right-[31px] top-[22px] w-3 h-3 rounded-full border-2 border-white dark:border-neutral-950 bg-neutral-400 shadow-md z-10" />
                                    
                                    {/* Overhauled opening balance card - compact & matches transaction elements */}
                                    <div className="p-4 bg-neutral-50 dark:bg-neutral-900/40 rounded-2xl border border-dashed border-neutral-200 dark:border-neutral-800 flex items-center justify-between gap-3">
                                        
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className="w-9 h-9 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-500 flex items-center justify-center shrink-0">
                                                <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                </svg>
                                            </div>

                                            <div className="min-w-0">
                                                <span className="text-2xs font-black px-1.5 py-0.5 rounded-md text-neutral-500 bg-neutral-100 dark:text-neutral-400 dark:bg-neutral-800">
                                                    رصيد افتتاحي
                                                </span>
                                                <h4 className="font-extrabold text-neutral-600 dark:text-neutral-400 text-xs mt-1">مديونية سابقة مرحلة</h4>
                                                <p className="text-2xs text-neutral-400 dark:text-neutral-500 mt-0.5">تاريخ فتح الحساب</p>
                                            </div>
                                        </div>

                                        <div className="text-left flex flex-col items-end shrink-0">
                                            <div className="flex items-baseline gap-0.5">
                                                <span className="text-sm sm:text-base font-black tabular-nums text-neutral-600 dark:text-neutral-300">
                                                    {formatCurrency(openingBalance)}
                                                </span>
                                                <span className="text-2xs font-bold text-neutral-400">ج.م</span>
                                            </div>
                                            <span className="text-2xs font-black text-neutral-500 mt-0.5">رصيد أول المدة</span>
                                        </div>

                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="text-center py-16 text-neutral-450 border border-dashed border-neutral-250 dark:border-neutral-800 rounded-3xl">
                        لم يتم تسجيل أي فواتير آجلة أو دفعات مالية لهذا المورد بعد.
                    </div>
                )}
            </div>
        </div>
    );
};

export default SupplierStatement;
