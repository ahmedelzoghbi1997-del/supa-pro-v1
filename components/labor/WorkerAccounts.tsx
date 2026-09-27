import React, { useMemo, useState, useEffect } from 'react';
import type { Expense } from '../../types';
import { formatNumber, formatWeekdayShort } from '../../utils/helpers';
import { UserIcon, WalletIcon, ClipboardIcon, PencilIcon, TrashIcon } from '../Icons';
import { useData } from '../../contexts/DataContext';
import Modal from '../shared/Modal';
import StaggerItem from '../shared/StaggerItem';
import EditLaborForm from './EditLaborForm';
import { renderShiftBadge } from './LaborLedger';

interface WorkerAccountsProps {
    laborExpenses: Expense[];
    greenhouseFilter?: string;
    currentGhs?: any[];
}

const WorkerAccounts: React.FC<WorkerAccountsProps> = ({ 
    laborExpenses,
    greenhouseFilter,
    currentGhs
}) => {
    const { addExpense, deleteExpense, cyclesWithCalculations, expenseCategories } = useData();
    const [settlingWorker, setSettlingWorker] = useState<string | null>(null);
    const [settleType, setSettleType] = useState<'full' | 'partial'>('full');
    const [settleAmount, setSettleAmount] = useState('');
    const [settleDirection, setSettleDirection] = useState<'pay' | 'receive'>('pay');
    const [isSettling, setIsSettling] = useState(false);
    const [expandedWorker, setExpandedWorker] = useState<string | null>(null);
    const [workerQuery, setWorkerQuery] = useState('');
    const [settleNote, setSettleNote] = useState('');
    
    // Edit & delete states for transactions
    const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
    const [expenseToDelete, setExpenseToDelete] = useState<Expense | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const extractWorkerName = (description: string) => {
        if (!description) return null;
        if (description.includes('يومية بدون اسم') || description.includes('بدون اسم') || description.includes('منصرف عمالة:')) {
            return null;
        }
        const match = description.match(/(?:^|[\s|])عامل:\s*([^|\-]+)/);
        if (!match) return null;
        const name = match[1].trim();
        if (name === 'شخص بدون اسم' || name === 'بدون اسم') return null;
        return name;
    };

    const extractGreenhouseTag = (description: string) => {
        if (!description) return null;
        const matchExt = description.match(/🏠\s*([^|]+)/);
        if (matchExt) return `🏠 ${matchExt[1].trim()}`;
        const matchMine = description.match(/🌿\s*([^|]+)/);
        if (matchMine) return `🌿 ${matchMine[1].trim()}`;

        for (const gh of (currentGhs || [])) {
            if (description.includes(gh.name)) {
                return gh.type === 'external' ? `🏠 ${gh.name}` : `🌿 ${gh.name}`;
            }
        }
        return null;
    };

    const extractActivity = (description: string) => {
        const parts = description.split(/[-|]/);
        return parts.length > 1 ? parts[parts.length - 1].trim() : 'يومية عمل';
    };

    const workerStats = useMemo(() => {
        const stats: Record<string, { 
            totalAmount: number, 
            cashPaid: number, 
            creditUnpaid: number, 
            recordCount: number,
            greenhouses: Set<string>
        }> = {};
        
        laborExpenses.forEach(exp => {
            const name = extractWorkerName(exp.description);
            if (name) {
                if (!stats[name]) {
                    stats[name] = { 
                        totalAmount: 0, 
                        cashPaid: 0, 
                        creditUnpaid: 0, 
                        recordCount: 0,
                        greenhouses: new Set<string>()
                    };
                }

                const ghTag = extractGreenhouseTag(exp.description);
                if (ghTag) {
                    stats[name].greenhouses.add(ghTag);
                }

                // Identify if this cash expense represents a payment/settlement/advance to reduce worker credit instead of adding new work
                const isSettlementOrAdvance = 
                    exp.amount < 0 ||
                    exp.description.includes('سداد') || 
                    exp.description.includes('تسديد') ||
                    exp.description.includes('سلفة') ||
                    exp.description.includes('سلفية') ||
                    exp.description.includes('تخصيم') ||
                    exp.description.includes('تصفية') ||
                    exp.description.includes('دفعة نقدية') ||
                    exp.description.includes('مسحوبات');

                if (isSettlementOrAdvance) {
                    // Settlements and advances always reduce the owed credit (if payment is to them, credit goes down)
                    stats[name].creditUnpaid -= exp.amount;
                    if (exp.payment_method === 'cash') {
                        stats[name].cashPaid += exp.amount;
                    }
                } else {
                    if (exp.payment_method === 'cash') {
                        // Regular day labor paid in cash is a new day of work
                        stats[name].cashPaid += exp.amount;
                        stats[name].totalAmount += exp.amount;
                    } else {
                        // Credit day labor is work performed and adds both to total performed and unpaid balance
                        stats[name].totalAmount += exp.amount;
                        stats[name].creditUnpaid += exp.amount;
                    }
                    stats[name].recordCount += 1;
                }
            }
        });

        return Object.entries(stats).sort((a, b) => b[1].totalAmount - a[1].totalAmount);
    }, [laborExpenses, currentGhs]);

    // Track settlingWorker to auto-detect payment direction (pay vs receive)
    const handleOpenSettle = (name: string, type: 'full' | 'partial', direction?: 'pay' | 'receive') => {
        setSettlingWorker(name);
        setSettleType(type);
        setSettleAmount('');
        setSettleNote('');
        if (direction) {
            setSettleDirection(direction);
        } else {
            const stat = workerStats.find(([wName]) => wName === name)?.[1];
            const balance = stat ? stat.creditUnpaid : 0;
            setSettleDirection(balance < 0 ? 'receive' : 'pay');
        }
    };

    useEffect(() => {
        if (settlingWorker && settleType === 'full') {
            const stat = workerStats.find(([name]) => name === settlingWorker)?.[1];
            const balance = stat ? stat.creditUnpaid : 0;
            if (balance < 0) {
                setSettleDirection('receive'); // Default to receiving money if they owe us
            } else {
                setSettleDirection('pay'); // Default to paying them if we owe them
            }
        }
    }, [settlingWorker, settleType, workerStats]);

    const handleSettleAccountConfirm = async () => {
        if (!settlingWorker) return;
        setIsSettling(true);
        try {
            const stat = workerStats.find(([name]) => name === settlingWorker)?.[1];
            const currentWorkerBalance = stat ? stat.creditUnpaid : 0;

            const activeCycle = cyclesWithCalculations?.find(c => c.status === 'active') || cyclesWithCalculations?.[0];
            const cid = activeCycle?.id;
            const laborCategory = expenseCategories?.find(c => 
                c.name.includes('عمالة') || c.name.includes('عماله') || c.name.includes('يومية') || c.name.includes('عامل')
            ) || expenseCategories?.[0];
            const catId = laborCategory?.id;
            if (!cid || !catId) {
                alert("لم يتم العثور على عروة نشطة أو تصنيف عمالة صالح.");
                setIsSettling(false);
                return;
            }

            const todayStr = new Date().toISOString().split('T')[0];

            // Determine correct greenhouse prefix to associate this payment with the appropriate greenhouse
            const selectedGh = currentGhs?.find(g => g.id === greenhouseFilter);
            const prefix = selectedGh && selectedGh.type === 'external' ? `🏠 ${selectedGh.name} | ` : '';

            if (settleType === 'full') {
                if (currentWorkerBalance < 0) {
                    // Worker owes us, so they fully repay their debt.
                    // This is an inflow of Math.abs(currentWorkerBalance) into the drawer.
                    // We record this as a negative expense.
                    await addExpense({
                        amount: -Math.abs(currentWorkerBalance),
                        category_id: catId,
                        cycle_id: cid,
                        date: todayStr,
                        description: `${prefix}عامل: ${settlingWorker} | سداد كامل الحساب المتبقي وتصفية السلفة`,
                        payment_method: 'cash'
                    });
                } else if (currentWorkerBalance > 0) {
                    // We owe the worker. We record a cash payout of the remaining balance.
                    await addExpense({
                        amount: currentWorkerBalance,
                        category_id: catId,
                        cycle_id: cid,
                        date: todayStr,
                        description: `${prefix}عامل: ${settlingWorker} | سداد كامل الحساب المتبقي وتصفية المستحقات`,
                        payment_method: 'cash'
                    });
                }
            } else {
                const amountToPay = parseFloat(settleAmount);
                if (isNaN(amountToPay) || amountToPay <= 0) {
                    alert("الرجاء تحديد قيمة دفع صالحة أكبر من صفر.");
                    setIsSettling(false);
                    return;
                }

                // Determine finalAmount considering direction:
                // If it is 'receive' (inflow), it should be negative. If 'pay' (outflow), it is positive.
                const finalAmount = settleDirection === 'receive' ? -amountToPay : amountToPay;

                const isReceive = settleDirection === 'receive';
                const explanation = settleNote.trim()
                    ? (isReceive ? `سداد دفعة نقدية من الحساب (${settleNote.trim()})` : `صرف سلفة نقدية على الحساب (${settleNote.trim()})`)
                    : (isReceive ? `سداد دفعة نقدية من الحساب` : `صرف سلفة نقدية على الحساب`);

                // Add Cash Expense
                await addExpense({
                    amount: finalAmount,
                    category_id: catId,
                    cycle_id: cid,
                    date: todayStr,
                    description: `${prefix}عامل: ${settlingWorker} | ${explanation}`,
                    payment_method: 'cash'
                });
            }
            setSettlingWorker(null);
            setSettleAmount('');
            setSettleNote('');
            setSettleType('full');
        } catch (error: any) {
            console.error(error);
            alert("حدث خطأ أثناء حفظ المعاملة: " + (error?.message || error));
        } finally {
            setIsSettling(false);
        }
    };

    const isWorkerActiveInGreenhouse = (name: string, ghId: string) => {
        if (!ghId || ghId === 'all') return true;
        const selectedGh = currentGhs?.find(g => g.id === ghId);
        if (!selectedGh) return true;

        const workerExps = laborExpenses.filter(e => extractWorkerName(e.description) === name);
        if (selectedGh.type === 'mine') {
            const externalGhs = (currentGhs || []).filter(g => g.type === 'external');
            return workerExps.some(e => {
                const desc = e.description || '';
                if (desc.includes('صوبة أبي وأخي') || desc.includes('[صوبة أبي وأخي]')) return false;
                const isExt = externalGhs.some(g => desc.includes(g.name) || desc.includes(`🏠 ${g.name}`));
                return !isExt;
            });
        } else {
            return workerExps.some(e => {
                const desc = e.description || '';
                if (selectedGh.id === 'father' && (desc.includes('صوبة أبي وأخي') || desc.includes('[صوبة أبي وأخي]'))) return true;
                return desc.includes(selectedGh.name) || desc.includes(`🏠 ${selectedGh.name}`);
            });
        }
    };

    const filteredStats = useMemo(() => {
        let list = workerStats;

        // If filtering by a specific greenhouse and not searching, show workers who have transactions in that greenhouse
        if (greenhouseFilter && greenhouseFilter !== 'all' && !workerQuery.trim()) {
            list = list.filter(([name]) => isWorkerActiveInGreenhouse(name, greenhouseFilter));
        }

        if (workerQuery.trim()) {
            const norm = workerQuery.trim().toLowerCase();
            list = list.filter(([name]) => name.toLowerCase().includes(norm));
        }

        return list;
    }, [workerStats, workerQuery, greenhouseFilter, currentGhs, laborExpenses]);

    if (workerStats.length === 0) {
        return (
            <div className="bg-white dark:bg-neutral-800 rounded-3xl p-12 text-center border border-neutral-200 dark:border-neutral-700 shadow-sm animate-fade-in">
                <UserIcon className="w-12 h-12 text-neutral-300 dark:text-neutral-600 mx-auto mb-4" />
                <h3 className="text-xl font-black text-neutral-800 dark:text-neutral-0 mb-2">لا توجد حسابات عمال بالاسم</h3>
                <p className="text-sm font-bold text-neutral-500">قم بإضافة يومية وحدد خيار "عامل بالاسم" لفتح حساب منفصل له هنا.</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-2.5 animate-fade-in">
            {/* Search filter bar */}
            <div className="bg-white dark:bg-neutral-900 p-2 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-2xs flex items-center gap-2">
                <div className="flex-1 relative flex items-center">
                    <span className="absolute right-3 text-neutral-400 text-xs pointer-events-none">🔍</span>
                    <input
                        type="text"
                        value={workerQuery}
                        onChange={(e) => setWorkerQuery(e.target.value)}
                        placeholder="بحث عن عامل بالاسم..."
                        className="w-full bg-neutral-50 dark:bg-neutral-950/60 border border-neutral-200/80 dark:border-neutral-800 rounded-lg pr-8 pl-3 py-1.5 text-xs font-bold focus:ring-1 focus:ring-indigo-500/25 focus:border-indigo-500/50 outline-none text-neutral-800 dark:text-neutral-100 placeholder-neutral-400"
                    />
                </div>
                {workerQuery && (
                    <button
                        onClick={() => setWorkerQuery('')}
                        className="text-[11px] text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-100 font-bold hover:bg-neutral-100 dark:hover:bg-neutral-800 px-2.5 py-1.5 rounded-lg text-nowrap cursor-pointer transition-colors"
                    >
                        إلغاء
                    </button>
                )}
            </div>

            {filteredStats.length === 0 ? (
                <div className="bg-white dark:bg-neutral-900 rounded-xl p-8 text-center border border-neutral-200 dark:border-neutral-800 shadow-2xs animate-fade-in">
                    <UserIcon className="w-8 h-8 text-neutral-300 dark:text-neutral-700 mx-auto mb-2 animate-pulse" />
                    <h3 className="text-xs font-black text-neutral-800 dark:text-neutral-200">لا يوجد عمال يطابقون مسمى البحث</h3>
                    <p className="text-[10px] font-bold text-neutral-400 mt-1">جرب تغيير فلتر الصوبة أو البحث باسم آخر.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 items-start">
                    {filteredStats.map(([name, stat], idx) => {
                        const isExpanded = expandedWorker === name;
                        // Sort ASC by date / created_at to calculate running balance
                        const workerHistoryAsc = [...laborExpenses]
                            .filter((e) => extractWorkerName(e.description) === name)
                            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime() || new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
                        
                        let runningBalance = 0;
                        const historyWithBalances = workerHistoryAsc.map(exp => {
                            const isSettlementOrAdvance = 
                                exp.amount < 0 ||
                                exp.description.includes('سداد') || 
                                exp.description.includes('تسديد') ||
                                exp.description.includes('سلفة') ||
                                exp.description.includes('سلفية') ||
                                exp.description.includes('تخصيم') ||
                                exp.description.includes('تصفية') ||
                                exp.description.includes('دفعة نقدية') ||
                                exp.description.includes('مسحوبات');
                                
                            if (isSettlementOrAdvance) {
                                runningBalance -= exp.amount;
                            } else {
                                if (exp.payment_method === 'credit') {
                                    runningBalance += exp.amount;
                                }
                            }
                            return { ...exp, runningBalance };
                        });

                        // Sort DESC for display
                        const workerHistory = historyWithBalances.reverse();

                        const isOwed = stat.creditUnpaid > 0;
                        const hasAdvance = stat.creditUnpaid < 0;

                        return (
                            <StaggerItem key={name || idx} index={idx} className={isExpanded ? 'col-span-1 md:col-span-2' : ''}>
                            <div 
                                className={`bg-white dark:bg-neutral-900 border rounded-xl transition-all duration-200 overflow-hidden flex flex-col justify-between ${
                                    isExpanded 
                                        ? 'border-indigo-300 dark:border-indigo-700/70 shadow-sm col-span-1 md:col-span-2' 
                                        : 'border-neutral-200 dark:border-neutral-800 shadow-2xs hover:border-neutral-300 dark:hover:border-neutral-700'
                                }`}
                            >
                                {/* Compact High-Density Worker Card */}
                                <div className="p-2.5 sm:p-3 flex flex-col gap-2">
                                    {/* Line 1: Worker name, tags, and Ledger Toggle */}
                                    <div className="flex items-center justify-between gap-2">
                                        <div className="flex items-center gap-2 min-w-0">
                                            <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                                                isOwed
                                                    ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200/50'
                                                    : hasAdvance
                                                        ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-200/50'
                                                        : 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400'
                                            }`}>
                                                <UserIcon className="w-3.5 h-3.5" />
                                            </div>
                                            <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                                                <h3 className="text-sm font-black text-neutral-900 dark:text-neutral-50 truncate tracking-tight">{name}</h3>
                                                <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-500">
                                                    {stat.recordCount} يومية
                                                </span>
                                                {/* Greenhouse Badges */}
                                                {stat.greenhouses && stat.greenhouses.size > 0 && Array.from(stat.greenhouses).map((ghTag, gIdx) => (
                                                    <span key={gIdx} className="text-[9px] font-bold px-1 py-0.2 rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 border border-neutral-200/60 dark:border-neutral-700/60">
                                                        {ghTag}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Toggle Statement Button */}
                                        <button
                                            type="button"
                                            onClick={() => setExpandedWorker(isExpanded ? null : name)}
                                            className={`h-7 px-2 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer select-none shrink-0 ${
                                                isExpanded 
                                                    ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800' 
                                                    : 'bg-neutral-50 text-neutral-600 hover:bg-neutral-100 dark:bg-neutral-800/80 dark:text-neutral-300 border border-neutral-200/80 dark:border-neutral-700/60'
                                            }`}
                                            title={isExpanded ? 'إخفاء كشف الحساب' : 'عرض كشف الحساب'}
                                        >
                                            <ClipboardIcon className="w-3 h-3" />
                                            <span>{isExpanded ? 'إغلاق' : 'كشف حساب'}</span>
                                            <span className={`text-[8px] transform transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}>▼</span>
                                        </button>
                                    </div>

                                    {/* Line 2: Horizontal Balance + Compact Action Buttons */}
                                    <div className="flex items-center justify-between gap-2 pt-1 border-t border-neutral-100 dark:border-neutral-800/80">
                                        {/* Compact Balance */}
                                        <div className="flex items-baseline gap-1.5 text-right">
                                            <span className="text-[10px] font-extrabold text-neutral-400 dark:text-neutral-500">
                                                {isOwed ? 'له:' : hasAdvance ? 'عليه سلف:' : 'الحساب:'}
                                            </span>
                                            <div className="flex items-baseline gap-1" dir="ltr">
                                                <span className={`text-base sm:text-lg font-black font-mono tabular-nums ${
                                                    isOwed
                                                        ? 'text-emerald-600 dark:text-emerald-400'
                                                        : hasAdvance
                                                            ? 'text-rose-600 dark:text-rose-450'
                                                            : 'text-neutral-500'
                                                }`}>
                                                    {formatNumber(Math.abs(stat.creditUnpaid))}
                                                </span>
                                                <span className="text-[10px] font-bold text-neutral-400">ج.م</span>
                                            </div>
                                        </div>

                                        {/* Compact Action Buttons */}
                                        <div className="flex items-center gap-1.5 shrink-0">
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleOpenSettle(name, 'partial', 'pay');
                                                }}
                                                title="صرف سلفة نقدية"
                                                className="h-7 px-2.5 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 rounded-lg flex items-center justify-center gap-1 transition-all active:scale-95 border border-amber-200/80 dark:border-amber-800/60 text-[10px] font-black cursor-pointer"
                                            >
                                                <span className="text-xs font-black">+</span>
                                                <span>سلفة</span>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleOpenSettle(name, 'full');
                                                }}
                                                title="تصفية وتسديد الحساب"
                                                className="h-7 px-2.5 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 rounded-lg flex items-center justify-center gap-1 transition-all active:scale-95 border border-emerald-200/80 dark:border-emerald-800/60 text-[10px] font-black cursor-pointer"
                                            >
                                                <WalletIcon className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                                                <span>تسديد</span>
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* Expandable High-Density Bank Statement Ledger */}
                                {isExpanded && (
                                    <div className="border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-950/30 p-2 sm:p-2.5 animate-slide-down">
                                        <div className="flex items-center justify-between gap-1 mb-1.5 px-1">
                                            <div className="flex items-center gap-1.5">
                                                <ClipboardIcon className="w-3 h-3 text-indigo-500" />
                                                <h4 className="text-[10px] font-black text-neutral-800 dark:text-neutral-200">
                                                    كشف الحساب
                                                </h4>
                                            </div>
                                            <span className="text-[9px] font-bold text-neutral-400">
                                                {workerHistory.length} حركة
                                            </span>
                                        </div>
                                        
                                        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg overflow-hidden divide-y divide-neutral-100 dark:divide-neutral-800">
                                            {workerHistory.map((exp) => {
                                                const isAdvanceRepayment = exp.amount < 0 || (exp.description.includes('سداد') && !exp.description.includes('صرف'));
                                                const isAdvanceTaken = exp.amount > 0 && (exp.description.includes('سلفة') || exp.description.includes('سلفية') || exp.description.includes('تخصيم') || exp.description.includes('صرف') || exp.description.includes('دفعة نقدية') || exp.description.includes('مسحوبات'));
                                                const isWageDeferred = exp.amount > 0 && exp.payment_method === 'credit';
                                                const ghTag = extractGreenhouseTag(exp.description);
                                                
                                                let badgeClass = 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400';
                                                let badgeText = 'حركة';
                                                
                                                if (isAdvanceRepayment) {
                                                    badgeClass = 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300';
                                                    badgeText = 'سداد';
                                                } else if (isAdvanceTaken) {
                                                    badgeClass = 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300';
                                                    badgeText = 'سلفة';
                                                } else if (isWageDeferred) {
                                                    badgeClass = 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300';
                                                    badgeText = 'يومية آجل';
                                                } else {
                                                    badgeClass = 'bg-teal-50 text-teal-700 dark:bg-teal-950/40 dark:text-teal-300';
                                                    badgeText = 'نقدي';
                                                }

                                                return (
                                                    <div 
                                                        key={exp.id} 
                                                        className="flex items-center justify-between py-1.5 px-2 gap-1.5 hover:bg-neutral-50 dark:hover:bg-neutral-850/50 transition-colors group"
                                                    >
                                                        {/* Right: Date */}
                                                        <div className="flex flex-col items-center justify-center shrink-0 min-w-[36px] text-center">
                                                            <span dir="ltr" className="font-mono text-[10px] font-bold text-neutral-700 dark:text-neutral-300">
                                                                {new Date(exp.date + 'T00:00:00').getMonth() + 1}/{new Date(exp.date + 'T00:00:00').getDate()}
                                                            </span>
                                                            <span className="text-[8px] font-bold text-neutral-400">
                                                                {formatWeekdayShort(exp.date)}
                                                            </span>
                                                        </div>
                                                        
                                                        <div className="border-r border-neutral-200 dark:border-neutral-800 h-5 shrink-0" />

                                                        {/* Center: Activity, Tags, and Shift */}
                                                        <div className="flex-1 min-w-0 text-right px-0.5 flex flex-col gap-0.5">
                                                            <div className="flex items-center gap-1 flex-wrap">
                                                                <span className="text-[10px] font-bold text-neutral-800 dark:text-neutral-100 truncate" title={extractActivity(exp.description) || ''}>
                                                                    {extractActivity(exp.description)}
                                                                </span>
                                                                <span className={`text-[8px] font-black px-1 py-0.2 rounded ${badgeClass}`}>
                                                                    {badgeText}
                                                                </span>
                                                                {ghTag && (
                                                                    <span className="text-[8px] font-bold px-1 py-0.2 rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400">
                                                                        {ghTag}
                                                                    </span>
                                                                )}
                                                            </div>
                                                            {(!isAdvanceRepayment && !isAdvanceTaken) && (
                                                                <div className="self-start scale-90 origin-right">
                                                                    {renderShiftBadge(exp.shift_type)}
                                                                </div>
                                                            )}
                                                        </div>
                                                        
                                                        {/* Left: Amount & Running Balance */}
                                                        <div className="flex flex-col items-end shrink-0 min-w-[70px] text-left">
                                                            <div className="flex items-center gap-0.5" dir="ltr">
                                                                <span className={`font-mono text-[11px] font-black tabular-nums ${
                                                                    exp.amount < 0 || isAdvanceRepayment
                                                                        ? 'text-emerald-600 dark:text-emerald-400'
                                                                        : isAdvanceTaken
                                                                            ? 'text-rose-600 dark:text-rose-450'
                                                                            : 'text-neutral-800 dark:text-neutral-200'
                                                                }`}>
                                                                    {exp.amount < 0 ? `+${formatNumber(Math.abs(exp.amount))}` : formatNumber(exp.amount)}
                                                                </span>
                                                                <span className="text-[8px] text-neutral-400 font-medium">ج.م</span>
                                                            </div>
                                                            <span className="text-[8px] font-mono text-neutral-400 dark:text-neutral-500" dir="rtl">
                                                                رصيد: <span dir="ltr" className="font-bold inline-block">{exp.runningBalance < 0 ? '- ' : ''}{formatNumber(Math.abs(exp.runningBalance))}</span>
                                                            </span>
                                                        </div>
                                                        
                                                        {/* Controls */}
                                                        <div className="flex items-center gap-0.5 border-r border-neutral-200 dark:border-neutral-800 pr-1 shrink-0">
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setEditingExpense(exp);
                                                                }}
                                                                title="تعديل"
                                                                className="p-1 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-400 hover:text-amber-600 dark:hover:text-amber-400 rounded transition-colors cursor-pointer"
                                                            >
                                                                <PencilIcon className="w-3 h-3" />
                                                            </button>
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setExpenseToDelete(exp);
                                                                }}
                                                                title="حذف"
                                                                className="p-1 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-neutral-400 hover:text-rose-600 dark:hover:text-rose-450 rounded transition-colors cursor-pointer"
                                                            >
                                                                <TrashIcon className="w-3 h-3" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>
                            </StaggerItem>
                        );
                    })}
                </div>
            )}

            {/* Settle Account Modal */}
            <Modal isOpen={!!settlingWorker} onClose={() => setSettlingWorker(null)} title="تصفية وتسديد حساب العامل" size="md">
                <div className="space-y-4 text-right">
                    {/* Modern Underline Tabs */}
                    <div className="w-full flex border-b border-neutral-200 dark:border-neutral-700 pb-0.5">
                        <button
                            type="button"
                            onClick={() => { setSettleType('full'); setSettleAmount(''); }}
                            className={`flex-1 pb-2.5 text-xs sm:text-sm font-black transition-all relative cursor-pointer ${
                                settleType === 'full' 
                                    ? 'text-indigo-600 dark:text-indigo-400 font-black' 
                                    : 'text-neutral-400 hover:text-neutral-600 dark:text-neutral-500 dark:hover:text-neutral-300'
                            }`}
                        >
                            <span>تصفية كامل الحساب</span>
                            {settleType === 'full' && (
                                <span className="absolute bottom-0 right-1/2 translate-x-1/2 w-20 h-0.5 bg-indigo-500 dark:bg-indigo-400 rounded-full" />
                            )}
                        </button>
                        <button
                            type="button"
                            onClick={() => { setSettleType('partial'); }}
                            className={`flex-1 pb-2.5 text-xs sm:text-sm font-black transition-all relative cursor-pointer ${
                                settleType === 'partial' 
                                    ? 'text-indigo-600 dark:text-indigo-400 font-black' 
                                    : 'text-neutral-400 hover:text-neutral-600 dark:text-neutral-500 dark:hover:text-neutral-300'
                            }`}
                        >
                            <span>دفع جزء / سلفة جزئية</span>
                            {settleType === 'partial' && (
                                <span className="absolute bottom-0 right-1/2 translate-x-1/2 w-20 h-0.5 bg-indigo-500 dark:bg-indigo-400 rounded-full" />
                            )}
                        </button>
                    </div>

                    {settleType === 'full' ? (
                        <div className="space-y-3">
                            <div className="p-4 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-300 rounded-xl text-xs sm:text-sm font-bold border border-emerald-150/40 dark:border-emerald-900/30 leading-relaxed">
                                {((workerStats.find(([name]) => name === settlingWorker)?.[1].creditUnpaid || 0)) < 0 ? (
                                    <span>هل تريد تصفية ديون العامل الآجل وسلفياته (<span className="font-extrabold">{settlingWorker}</span>) بالكامل؟ سيتم تسجيل قبض كامل الدين كاش للداخل.</span>
                                ) : (
                                    <span>هل تريد تصفية جميع يوميات العامل (<span className="font-extrabold">{settlingWorker}</span>) الآجلة وتحويلها إلى "كاش" ليتم خصمها من الخزنة الآن؟</span>
                                )}
                            </div>
                            <div className="bg-neutral-50 dark:bg-neutral-900/30 p-3 rounded-lg text-[10px] leading-relaxed text-neutral-500 font-bold border border-neutral-150/40 dark:border-neutral-800/40">
                                ملاحظة: هذا الإجراء سيقوم تلقائياً بخصم/تسجيل الأموال لتصفية رصيد العامل ليرجع إلى (خالص).
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-3.5 animate-fade-in">
                            <div className="p-3 bg-indigo-50/40 dark:bg-indigo-950/15 text-indigo-700 dark:text-indigo-300 rounded-xl text-xs font-bold border border-indigo-100/50 dark:border-indigo-900/30 leading-relaxed">
                                <p className="mb-1">تسجيل دفعة جزئية نقدية للعامل: <span className="font-black text-indigo-600 dark:text-indigo-400">{settlingWorker}</span></p>
                                <p>الرصيد المتبقي له حالياً: <span className="font-black text-xs">
                                    {((workerStats.find(([name]) => name === settlingWorker)?.[1].creditUnpaid || 0)) < 0 ? (
                                        <span className="inline-flex items-center gap-1">عليه سلفيات بقيمة: <span className="font-bold text-rose-600 dark:text-rose-455">ج.م</span><span dir="ltr" className="font-mono">{formatNumber(Math.abs((workerStats.find(([name]) => name === settlingWorker)?.[1].creditUnpaid || 0)))}</span></span>
                                    ) : (
                                        <span className="inline-flex items-center gap-1">له متبقي بقيمة: <span className="font-bold text-emerald-600 dark:text-emerald-400">ج.م</span><span dir="ltr" className="font-mono">{formatNumber((workerStats.find(([name]) => name === settlingWorker)?.[1].creditUnpaid || 0))}</span></span>
                                    )}
                                </span></p>
                            </div>

                            {/* Settle Direction small modern chips */}
                            <div className="space-y-1.5 text-right">
                                <label className="text-[11px] font-black text-neutral-400 dark:text-neutral-550">طبيعة العملية:</label>
                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setSettleDirection('receive')}
                                        className={`flex-1 flex items-start gap-2 py-2 px-3 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                                            settleDirection === 'receive' 
                                                ? 'bg-emerald-500/10 text-emerald-700 border-emerald-500/80 dark:bg-emerald-500/15 dark:text-emerald-400 dark:border-emerald-500/50' 
                                                : 'bg-neutral-50 text-neutral-500 border-transparent dark:bg-neutral-850 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-750'
                                        }`}
                                    >
                                        <div className={`mt-0.5 w-3.5 h-3.5 rounded-full border flex items-center justify-center shrink-0 ${settleDirection === 'receive' ? 'border-emerald-600 dark:border-emerald-405' : 'border-neutral-300 dark:border-neutral-600'}`}>
                                            {settleDirection === 'receive' && <div className="w-1.5 h-1.5 rounded-full bg-emerald-600 dark:bg-emerald-400" />}
                                        </div>
                                        <div className="flex flex-col text-right">
                                            <span>استرداد نقدية / سداد من العامل</span>
                                            <span className="text-[9px] font-medium opacity-70 mt-0.5">يخفض ديونه</span>
                                        </div>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setSettleDirection('pay')}
                                        className={`flex-1 flex items-start gap-2 py-2 px-3 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                                            settleDirection === 'pay' 
                                                ? 'bg-sky-500/10 text-sky-700 border-sky-500/80 dark:bg-sky-500/15 dark:text-sky-400 dark:border-sky-500/50' 
                                                : 'bg-neutral-50 text-neutral-500 border-transparent dark:bg-neutral-850 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-750'
                                        }`}
                                    >
                                        <div className={`mt-0.5 w-3.5 h-3.5 rounded-full border flex items-center justify-center shrink-0 ${settleDirection === 'pay' ? 'border-sky-600 dark:border-sky-405' : 'border-neutral-300 dark:border-neutral-600'}`}>
                                            {settleDirection === 'pay' && <div className="w-1.5 h-1.5 rounded-full bg-sky-600 dark:bg-sky-400" />}
                                        </div>
                                        <div className="flex flex-col text-right">
                                            <span>صرف نقدية / خصم من الحساب</span>
                                            <span className="text-[9px] font-medium opacity-70 mt-0.5">يقلل مستحقاته</span>
                                        </div>
                                    </button>
                                </div>
                            </div>

                            {/* Focal Point amount input */}
                            <div className="bg-indigo-50/15 dark:bg-neutral-900/60 p-4 rounded-xl border border-neutral-150 dark:border-neutral-800 flex flex-col items-center justify-center gap-1.5">
                                <label className="text-[11px] font-black text-neutral-400 dark:text-neutral-500">المبلغ المراد تسجيله (ج.م)</label>
                                <div className="relative w-full max-w-[200px]">
                                    <input
                                        type="text"
                                        inputMode="decimal"
                                        pattern="[0-9]*"
                                        lang="en"
                                        required
                                        value={settleAmount}
                                        onChange={(e) => setSettleAmount(e.target.value)}
                                        placeholder="0"
                                        className="w-full bg-transparent border-0 border-b-2 border-neutral-350 dark:border-neutral-700 focus:border-indigo-500 focus:ring-0 px-2 py-1 text-center font-bold text-xl tracking-tight text-neutral-800 dark:text-neutral-100 placeholder-neutral-300 dark:placeholder-neutral-600 focus:outline-none"
                                        dir="ltr"
                                    />
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-gray-500 dark:text-neutral-400">بيان حركة السداد (اختياري):</label>
                                <input
                                    type="text"
                                    value={settleNote}
                                    onChange={(e) => setSettleNote(e.target.value)}
                                    placeholder="مثال: خصم يومية طارئة"
                                    className="w-full bg-neutral-50 dark:bg-neutral-905 border border-neutral-200 dark:border-neutral-750 rounded-xl px-3 py-2 text-xs font-bold focus:ring-2 focus:ring-indigo-500/25 outline-none text-neutral-800 dark:text-neutral-100 text-right"
                                />
                            </div>
                            <div className="bg-neutral-50 dark:bg-neutral-900/20 p-2.5 rounded-lg text-[10px] leading-relaxed text-neutral-500 font-bold border border-neutral-150/40 dark:border-neutral-800/40">
                                {settleDirection === 'receive' ? (
                                    <span className="flex flex-wrap items-center gap-1">سيتم قبض <span className="font-black text-neutral-800 dark:text-neutral-100">ج.م</span><span dir="ltr" lang="en" className="font-mono font-black text-emerald-600">{settleAmount || '0'}</span> وتخفيض الدين المطلوب منه.</span>
                                ) : (
                                    <span className="flex flex-wrap items-center gap-1">سيتم صرف <span className="font-black text-neutral-800 dark:text-neutral-100">ج.م</span><span dir="ltr" lang="en" className="font-mono font-black text-rose-500">{settleAmount || '0'}</span> منصرف ورفع الحساب.</span>
                                )}
                            </div>
                        </div>
                    )}

                    <div className="flex gap-3 pt-2">
                        <button
                            onClick={() => { setSettlingWorker(null); setSettleAmount(''); setSettleNote(''); setSettleType('full'); }}
                            disabled={isSettling}
                            className="flex-1 py-2.5 bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700 rounded-xl text-sm font-bold transition-all disabled:opacity-50 cursor-pointer"
                        >
                            إلغاء
                        </button>
                        <button
                            onClick={handleSettleAccountConfirm}
                            disabled={isSettling}
                            className={`flex-1 py-2.5 text-white rounded-xl text-sm font-black transition-all shadow-sm disabled:opacity-50 cursor-pointer ${settleType === 'full' ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-indigo-500 hover:bg-indigo-600'}`}
                        >
                            {isSettling ? 'جاري التسجيل...' : 'تأكيد ودفع'}
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Edit Modal */}
            <Modal isOpen={!!editingExpense} onClose={() => setEditingExpense(null)} title="تعديل يومية أو حركة حساب للعامل" size="md">
                {editingExpense && (
                    <EditLaborForm expense={editingExpense} onClose={() => setEditingExpense(null)} />
                )}
            </Modal>

            {/* Delete Modal */}
            <Modal isOpen={!!expenseToDelete} onClose={() => setExpenseToDelete(null)} title="تأكيد الحذف" size="md">
                <div className="space-y-4 text-right">
                    <div className="p-4 bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-300 rounded-xl text-sm font-bold border border-rose-100 dark:border-rose-900/50">
                        {expenseToDelete && expenseToDelete.amount < 0 ? (
                            <span className="flex flex-wrap items-center gap-1">هل أنت متأكد من حذف حركة السداد هذه؟ سيتم حذفه من الخزنة ليرتفع متبقي أو عجز السلفيات على العامل بمقدار <span className="font-semibold text-rose-500">ج.م</span><span dir="ltr" className="font-mono font-black text-rose-600 dark:text-rose-455">{formatNumber(Math.abs(expenseToDelete.amount))}</span> بشكل نهائي.</span>
                        ) : (
                            <span>هل أنت متأكد من حذف هذه الحركة؟ سيتم إزالتها من المصروفات وحسابات العمال بشكل نهائي.</span>
                        )}
                    </div>
                    <div className="flex gap-3 pt-2">
                        <button
                            type="button"
                            onClick={() => setExpenseToDelete(null)}
                            disabled={isDeleting}
                            className="flex-1 py-2.5 bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700 rounded-lg text-sm font-bold transition-all disabled:opacity-50 cursor-pointer"
                        >
                            تراجع
                        </button>
                        <button
                            type="button"
                            disabled={isDeleting}
                            onClick={async () => {
                                if (!expenseToDelete) return;
                                setIsDeleting(true);
                                try {
                                    await deleteExpense(expenseToDelete.id);
                                    setExpenseToDelete(null);
                                } catch (err) {
                                    console.error(err);
                                } finally {
                                    setIsDeleting(false);
                                }
                            }}
                            className="flex-1 py-2.5 bg-rose-500 hover:bg-rose-600 text-white rounded-lg text-sm font-black transition-all shadow-sm disabled:opacity-50 flex justify-center items-center gap-2 cursor-pointer"
                        >
                            {isDeleting ? 'جاري الحذف...' : 'نعم، احذف'}
                            {!isDeleting && <TrashIcon className="w-4 h-4" />}
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default WorkerAccounts;
