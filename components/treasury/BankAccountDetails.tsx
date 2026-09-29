import React, { useState, useMemo, useEffect } from 'react';
import type { BankAccount, BankTransaction } from '../../types';
import { useTreasury } from '../../hooks/useTreasury';
import { useCycles } from '../../hooks/useCycles';
import { useToast } from '../../hooks/useToast';
import { formatNumber, getLocalDateString } from '../../utils/helpers';
import { ArrowLeftIcon, WalletIcon, TrendingUpIcon, TrendingDownIcon, TrashIcon, PencilIcon, WarningIcon } from '../Icons';
import Modal from '../shared/Modal';

interface BankAccountDetailsProps {
    account: BankAccount;
    onBack: () => void;
}

const BankAccountDetails: React.FC<BankAccountDetailsProps> = ({ account, onBack }) => {
    const { 
        bankTransactions, addBankTransaction, deleteBankTransaction, 
        updateBankAccount, deleteBankAccount
    } = useTreasury();
    const { cycles } = useCycles();
    const isViewer = false;

    // Transfer Modal State
    const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
    const [transferType, setTransferType] = useState<'deposit' | 'withdrawal'>('deposit');
    const [amount, setAmount] = useState('');
    const [cycleId, setCycleId] = useState('');
    const [description, setDescription] = useState('');

    // Edit Bank Modal State
    const [isEditBankModalOpen, setIsEditBankModalOpen] = useState(false);
    const [editBankName, setEditBankName] = useState(account.name);
    const [editBankBalance, setEditBankBalance] = useState(account.initial_balance.toString());

    // Delete Bank Modal State
    const [isDeleteBankModalOpen, setIsDeleteBankModalOpen] = useState(false);

    // Delete Transaction Modal State
    const [isDeleteTxModalOpen, setIsDeleteTxModalOpen] = useState(false);
    const [txToDelete, setTxToDelete] = useState<BankTransaction | null>(null);

    const activeCycleIds = useMemo(() => new Set(cycles.filter(c => c.status === 'active').map(c => c.id)), [cycles]);

    const accountTransactions = bankTransactions
        .filter(t => t.account_id === account.id && t.cycle_id && activeCycleIds.has(t.cycle_id))
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const deposits = accountTransactions.filter(t => t.type === 'deposit').reduce((s, t) => s + t.amount, 0);
    const withdrawals = accountTransactions.filter(t => t.type === 'withdrawal').reduce((s, t) => s + t.amount, 0);
    const initial = activeCycleIds.size > 0 ? account.initial_balance : 0;
    const balance = initial + deposits - withdrawals;

    // Monthly stats
    const currentMonthStats = useMemo(() => {
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();

        const monthlyTransactions = accountTransactions.filter(t => {
            const date = new Date(t.date);
            return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
        });

        const monthlyDeposits = monthlyTransactions.filter(t => t.type === 'deposit').reduce((s, t) => s + t.amount, 0);
        const monthlyWithdrawals = monthlyTransactions.filter(t => t.type === 'withdrawal').reduce((s, t) => s + t.amount, 0);

        return { monthlyDeposits, monthlyWithdrawals };
    }, [accountTransactions]);

    const activeCycles = cycles.filter(c => c.status === 'active');
    const hasTransactions = accountTransactions.length > 0;

    // Set default cycle when modal opens
    useEffect(() => {
        if (isTransferModalOpen && !cycleId && activeCycles.length > 0) {
            setCycleId(activeCycles[0].id);
        }
    }, [isTransferModalOpen, activeCycles, cycleId]);

    const handleTransfer = async (e: React.FormEvent) => {
        if (isViewer) return;
        e.preventDefault();
        if (!amount || Number(amount) <= 0 || !cycleId) return;

        try {
            await addBankTransaction({
                account_id: account.id,
                cycle_id: cycleId,
                type: transferType,
                amount: Number(amount),
                date: getLocalDateString(),
                description: description.trim()
            });

            setIsTransferModalOpen(false);
            setAmount('');
            setDescription('');
            setCycleId('');
            showToast(transferType === 'deposit' ? 'تم تسجيل الإيداع البنكي بنجاح' : 'تم تسجيل السحب البنكي بنجاح');
        } catch (_error) {
            showToast('حدث خطأ أثناء معالجة الحركة البنكية', 'error');
        }
    };

    const handleEditBank = async (e: React.FormEvent) => {
        if (isViewer) return;
        e.preventDefault();
        if (!editBankName.trim()) return;
        
        try {
            await updateBankAccount({
                ...account,
                name: editBankName.trim(),
                initial_balance: Number(editBankBalance) || 0
            });
            setIsEditBankModalOpen(false);
            showToast('تم تحديث بيانات الحساب البنكي بنجاح');
        } catch (_error) {
            showToast('حدث خطأ أثناء تعديل بيانات الحساب', 'error');
        }
    };

    const handleDeleteBank = async () => {
        if (isViewer || hasTransactions) return;
        try {
            await deleteBankAccount(account.id);
            setIsDeleteBankModalOpen(false);
            showToast('تم حذف الحساب البنكي بنجاح');
            onBack();
        } catch (_error) {
            showToast('حدث خطأ أثناء حذف الحساب البنكي', 'error');
        }
    };

    const handleDeleteTx = async () => {
        if (isViewer || !txToDelete) return;
        try {
            await deleteBankTransaction(txToDelete.id);
            setIsDeleteTxModalOpen(false);
            setTxToDelete(null);
            showToast('تم حذف الحركة المالية بنجاح للبنك والعهدة الزراعية');
        } catch (_error) {
            showToast('حدث خطأ أثناء حذف الحركة المالية', 'error');
        }
    };

    return (
        <div className="space-y-6 animate-fade-in text-right" dir="rtl">
            {/* Header */}
            <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-3.5">
                    <button 
                        onClick={onBack} 
                        className="p-2.5 bg-white dark:bg-neutral-900 rounded-xl shadow-xs border border-neutral-200/70 dark:border-neutral-800/80 hover:bg-neutral-50 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-450 transition-all active:scale-95 cursor-pointer"
                        title="رجوع"
                    >
                        <ArrowLeftIcon className="w-4 h-4 transform rotate-180" />
                    </button>
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-pulse" />
                            <h2 className="text-xl sm:text-2xl font-black text-neutral-800 dark:text-neutral-100">
                                {account.name}
                            </h2>
                        </div>
                        <p className="text-xs font-bold text-neutral-400 dark:text-neutral-500 mt-0.5">تفاصيل الحساب ودفتر الحركات المصرفية المباشرة</p>
                    </div>
                </div>
                {!isViewer && (
                <div className="flex gap-1.5">
                    <button 
                        onClick={() => {
                            setEditBankName(account.name);
                            setEditBankBalance(account.initial_balance.toString());
                            setIsEditBankModalOpen(true);
                        }}
                        className="p-2 text-neutral-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/20 rounded-xl transition-all active:scale-95 cursor-pointer border border-transparent hover:border-indigo-150 dark:hover:border-indigo-900/40"
                        title="تعديل الحساب"
                    >
                        <PencilIcon className="w-4.5 h-4.5" />
                    </button>
                    <button 
                        onClick={() => setIsDeleteBankModalOpen(true)}
                        disabled={hasTransactions}
                        className={`p-2 rounded-xl transition-all active:scale-95 border border-transparent ${
                            hasTransactions 
                            ? 'text-neutral-200 dark:text-neutral-800 cursor-not-allowed' 
                            : 'text-neutral-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 hover:border-rose-150 dark:hover:border-rose-900/40 cursor-pointer'
                        }`}
                        title={hasTransactions ? "لا يمكن حذف حساب به حركات" : "حذف الحساب"}
                    >
                        <TrashIcon className="w-4.5 h-4.5" />
                    </button>
                </div>
                )}
            </div>

            {/* Contemporary Compact Banking Asset Card */}
            <div className="space-y-4">
                <div className="bg-gradient-to-br from-neutral-950 via-indigo-950 to-neutral-950 dark:from-black dark:via-indigo-950/25 dark:to-neutral-950 rounded-2xl p-4 sm:p-5 text-white shadow-md relative overflow-hidden border border-white/[0.04]">
                    {/* Abstract Decorative Light Glows */}
                    <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-2xl -translate-y-1/2 translate-x-1/4 pointer-events-none" />
                    
                    <div className="relative z-10 flex flex-col justify-between">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-[10px] font-black text-indigo-300 dark:text-indigo-400 uppercase tracking-widest mb-1 flex items-center gap-1">
                                    <WalletIcon className="w-3.5 h-3.5 text-indigo-400" />
                                    <span>الرصيد المتاح بالبنك</span>
                                </p>
                                <div className="flex items-baseline gap-1.5">
                                    <span className="text-2xl sm:text-3xl font-black tabular-nums tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-white via-neutral-100 to-indigo-100">
                                        {formatNumber(balance)}
                                    </span>
                                    <span className="text-xs font-bold text-indigo-300">ج.م</span>
                                </div>
                            </div>
                            <div className="px-2.5 py-1 bg-white/5 rounded-lg border border-white/10 text-right">
                                <span className="text-[8px] text-indigo-200 block font-bold leading-none">رصيد البداية</span>
                                <span className="text-xs font-bold text-neutral-200 tabular-nums">{formatNumber(account.initial_balance)} ج.م</span>
                            </div>
                        </div>

                        {/* Breakdown Inlays */}
                        <div className="grid grid-cols-2 gap-3 mt-4 pt-3 border-t border-white/[0.06]">
                            <div>
                                <p className="text-[8px] font-bold text-neutral-450 uppercase tracking-wider mb-0.5">إجمالي الإيداعات</p>
                                <p className="text-xs sm:text-sm font-black text-emerald-400 tabular-nums">
                                    +{formatNumber(deposits)} <span className="text-[9px] font-bold">ج.م</span>
                                </p>
                            </div>
                            <div className="border-r border-white/[0.06] pr-3">
                                <p className="text-[8px] font-bold text-neutral-450 uppercase tracking-wider mb-0.5">إجمالي السحوبات</p>
                                <p className="text-xs sm:text-sm font-black text-rose-400 tabular-nums">
                                    -{formatNumber(withdrawals)} <span className="text-[9px] font-bold">ج.م</span>
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {!isViewer && (
                    <div className="grid grid-cols-2 gap-3 sm:gap-4">
                        <button 
                            onClick={() => { setTransferType('deposit'); setIsTransferModalOpen(true); }}
                            className="flex items-center justify-center gap-2.5 py-4 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-600 hover:text-white dark:hover:bg-emerald-600 dark:hover:text-white rounded-2xl font-black transition-all duration-200 active:scale-[0.98] border border-emerald-100 dark:border-emerald-900/35 shadow-xs cursor-pointer group"
                        >
                            <div className="p-1 px-2.5 bg-emerald-100 dark:bg-emerald-950/50 group-hover:bg-white/10 text-emerald-700 dark:text-emerald-400 group-hover:text-white rounded-lg transition-colors">
                                <span className="font-bold text-base sm:text-lg">↓</span>
                            </div>
                            <span className="text-sm sm:text-base">إيداع جديد للمصرف</span>
                        </button>
                        <button 
                            onClick={() => { setTransferType('withdrawal'); setIsTransferModalOpen(true); }}
                            className="flex items-center justify-center gap-2.5 py-4 bg-rose-50 dark:bg-rose-950/20 text-rose-700 dark:text-rose-400 hover:bg-rose-600 hover:text-white dark:hover:bg-rose-600 dark:hover:text-white rounded-2xl font-black transition-all duration-200 active:scale-[0.98] border border-rose-100 dark:border-rose-900/35 shadow-xs cursor-pointer group"
                        >
                            <div className="p-1 px-2.5 bg-rose-100 dark:bg-rose-950/50 group-hover:bg-white/10 text-rose-700 dark:text-rose-400 group-hover:text-white rounded-lg transition-colors">
                                <span className="font-bold text-base sm:text-lg">↑</span>
                            </div>
                            <span className="text-sm sm:text-base">سحب نقدي من البنك</span>
                        </button>
                    </div>
                )}
            </div>

            {/* Contemporary Bento Monthly Statistics Box */}
            <div className="grid grid-cols-2 gap-4">
                <div className="bg-white dark:bg-neutral-905/30 p-5 rounded-2xl border border-neutral-200/65 dark:border-neutral-800/80 shadow-xs flex items-center justify-between relative overflow-hidden group hover:border-emerald-500/25 transition-all duration-300">
                    <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-500/5 rounded-full blur-xl pointer-events-none" />
                    <div className="relative z-10 text-right">
                        <p className="text-[10px] sm:text-xs font-black text-neutral-400 dark:text-neutral-500 uppercase tracking-widest mb-1">وارد الشهر الحالي ({new Date().toLocaleString('ar-EG', { month: 'long' })})</p>
                        <p className="text-lg sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 tabular-nums">
                            {formatNumber(currentMonthStats.monthlyDeposits)} <span className="text-[10px] font-black">ج.م</span>
                        </p>
                    </div>
                    <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-450 rounded-xl group-hover:scale-110 transition-transform duration-300">
                        <TrendingUpIcon className="w-5 h-5" />
                    </div>
                </div>
                
                <div className="bg-white dark:bg-neutral-905/30 p-5 rounded-2xl border border-neutral-200/65 dark:border-neutral-800/80 shadow-xs flex items-center justify-between relative overflow-hidden group hover:border-rose-500/25 transition-all duration-300">
                    <div className="absolute top-0 right-0 w-16 h-16 bg-rose-500/5 rounded-full blur-xl pointer-events-none" />
                    <div className="relative z-10 text-right">
                        <p className="text-[10px] sm:text-xs font-black text-neutral-400 dark:text-neutral-500 uppercase tracking-widest mb-1">صادر الشهر الحالي ({new Date().toLocaleString('ar-EG', { month: 'long' })})</p>
                        <p className="text-lg sm:text-2xl font-black text-rose-600 dark:text-rose-400 tabular-nums">
                            {formatNumber(currentMonthStats.monthlyWithdrawals)} <span className="text-[10px] font-black">ج.م</span>
                        </p>
                    </div>
                    <div className="p-2.5 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-450 rounded-xl group-hover:scale-110 transition-transform duration-300">
                        <TrendingDownIcon className="w-5 h-5" />
                    </div>
                </div>
            </div>

            {/* Ledger Transactions Audit List */}
            <div className="bg-white dark:bg-neutral-900/40 rounded-[2rem] border border-neutral-200/65 dark:border-neutral-800/80 overflow-hidden shadow-xs">
                <div className="px-6 py-5 border-b border-neutral-100 dark:border-neutral-800/60 flex justify-between items-center bg-neutral-50/50 dark:bg-neutral-900/30">
                    <div>
                        <h3 className="text-base font-black text-neutral-800 dark:text-neutral-100">سجل حركات الحساب</h3>
                        <p className="text-[11px] font-bold text-neutral-400 mt-0.5">جدول زمني بكافة التدفقات النقدية الصادرة والواردة</p>
                    </div>
                    <span className="px-3 py-1 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-lg text-xs font-black tabular-nums">
                        {accountTransactions.length} حركة
                    </span>
                </div>
                
                <div className="divide-y divide-neutral-100 dark:divide-neutral-800/60">
                    {accountTransactions.length > 0 ? (
                        accountTransactions.map(tx => {
                            const cycle = cycles.find(c => c.id === tx.cycle_id);
                            const isDeposit = tx.type === 'deposit';
                            return (
                                <div key={tx.id} className="p-4 sm:p-5 flex items-center justify-between hover:bg-neutral-50/70 dark:hover:bg-neutral-850/20 transition-all duration-150 group">
                                    <div className="flex items-center gap-3.5 min-w-0">
                                        <div className={`p-2.5 rounded-xl shrink-0 transition-transform duration-200 group-hover:scale-105 ${
                                            isDeposit 
                                            ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400' 
                                            : 'bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400'
                                        }`}>
                                            {isDeposit ? <TrendingUpIcon className="w-5 h-5" /> : <TrendingDownIcon className="w-5 h-5" />}
                                        </div>
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-1.5 flex-wrap">
                                                <p className="text-sm font-black text-neutral-800 dark:text-neutral-250 truncate">
                                                    {isDeposit ? 'إيداع نقدي للمصرف' : 'سحب نقدي للعهدة'}
                                                </p>
                                                {cycle && (
                                                    <span className="text-[10px] font-black px-1.5 py-0.5 bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 rounded-md">
                                                        {cycle.name}
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-[11px] text-neutral-400 dark:text-neutral-500 mt-1 flex items-center gap-1.5 flex-wrap">
                                                <span className="tabular-nums font-bold">{tx.date}</span>
                                                {tx.description && (
                                                    <span className="truncate border-r border-neutral-200 dark:border-neutral-700/60 pr-1.5 text-neutral-450 dark:text-neutral-400">
                                                        {tx.description}
                                                    </span>
                                                )}
                                            </p>
                                        </div>
                                    </div>
                                    
                                    <div className="flex items-center gap-3">
                                        <div className="text-left shrink-0">
                                            <div className={`px-2 py-1 rounded-md font-semibold font-mono text-sm sm:text-base tabular-nums transition-colors ${
                                                isDeposit 
                                                ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400' 
                                                : 'bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-400'
                                            }`}>
                                                {isDeposit ? '+' : '-'}{formatNumber(tx.amount)} <span className="text-[10px] font-bold">ج.م</span>
                                            </div>
                                        </div>
                                        {!isViewer && (
                                        <button 
                                            onClick={() => { setTxToDelete(tx); setIsDeleteTxModalOpen(true); }}
                                            className="p-2 text-neutral-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-xl transition-all active:scale-95 cursor-pointer opacity-0 group-hover:opacity-100 focus:opacity-100"
                                            title="حذف الحركة"
                                        >
                                            <TrashIcon className="w-4 h-4" />
                                        </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })
                    ) : (
                        <div className="py-20 text-center bg-white dark:bg-neutral-900/10 rounded-[2rem] border-2 border-dashed border-neutral-100 dark:border-neutral-800/40 m-4">
                            <WalletIcon className="w-16 h-16 mx-auto text-neutral-200 dark:text-neutral-800 mb-4 opacity-50" />
                            <h3 className="text-base font-bold text-neutral-400 dark:text-neutral-500">سجل حركات البنك فارغ</h3>
                            <p className="text-xs text-neutral-450 dark:text-neutral-500 mt-1">لم يتم تسجيل أي عمليات سحب أو إيداع بعد لهذا الحساب.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Transfer Modal */}
            <Modal 
                isOpen={isTransferModalOpen} 
                onClose={() => setIsTransferModalOpen(false)} 
                title={transferType === 'deposit' ? 'إيداع نقدي للمصرف' : 'سحب نقدي من البنك'}
            >
                <div className="space-y-6 text-right" dir="rtl">
                    <div className={`p-4 rounded-2xl flex items-start gap-3 border transition-colors ${
                        transferType === 'deposit' 
                        ? 'bg-emerald-50/50 dark:bg-emerald-950/10 border-emerald-100/50 dark:border-emerald-900/20 text-emerald-800 dark:text-emerald-400' 
                        : 'bg-rose-50/50 dark:bg-rose-950/10 border-rose-100/50 dark:border-rose-900/20 text-rose-800 dark:text-rose-400'
                    }`}>
                        <div className={`p-2 rounded-xl shrink-0 ${
                            transferType === 'deposit' ? 'bg-emerald-100 dark:bg-emerald-900/30' : 'bg-rose-100 dark:bg-rose-900/30'
                        }`}>
                            {transferType === 'deposit' ? <TrendingUpIcon className="w-5 h-5" /> : <TrendingDownIcon className="w-5 h-5" />}
                        </div>
                        <div>
                            <p className="text-sm font-black leading-tight">
                                {transferType === 'deposit' ? 'إيداع في حساب البنك' : 'سحب من حساب البنك'}
                            </p>
                            <p className="text-[11px] mt-1 opacity-80 font-bold leading-relaxed">
                                {transferType === 'deposit' 
                                 ? 'سيتم تحويل الأموال من "كاش العروة" المختارة إلى رصيد حسابك المصرفي.'
                                 : 'سيتم سحب الأموال من رصيدك المصرفي وضخها في "كاش صندوق العروة" المختارة.'}
                            </p>
                        </div>
                    </div>

                    <form onSubmit={handleTransfer} className="space-y-5">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-black text-neutral-700 dark:text-neutral-400 mb-2 mr-1">المبلغ المطلوب</label>
                                <div className="relative group">
                                    <input 
                                        type="number" 
                                        required 
                                        min="1"
                                        value={amount} 
                                        onChange={e => setAmount(e.target.value)} 
                                        className="w-full p-4 pl-12 bg-neutral-50 dark:bg-neutral-905 border-2 border-neutral-100 dark:border-neutral-800/80 rounded-2xl focus:ring-0 focus:border-indigo-500 outline-none text-left font-black tabular-nums transition-all text-lg group-hover:bg-white dark:group-hover:bg-neutral-900"
                                        placeholder="0.00"
                                    />
                                    <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-1 pointer-events-none">
                                        <span className="text-[10px] font-black text-neutral-400 uppercase tracking-tighter">ج.م</span>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-black text-neutral-700 dark:text-neutral-400 mb-2 mr-1">العروة المرتبطة</label>
                                <select
                                    required
                                    value={cycleId}
                                    onChange={e => setCycleId(e.target.value)}
                                    className="w-full p-4 bg-neutral-50 dark:bg-neutral-905 border-2 border-neutral-100 dark:border-neutral-800/80 rounded-2xl focus:ring-0 focus:border-indigo-500 outline-none font-black text-neutral-800 dark:text-neutral-100 transition-all cursor-pointer appearance-none text-sm group-hover:bg-white dark:group-hover:bg-neutral-900"
                                >
                                    <option value="">اختر العروة...</option>
                                    {activeCycles.map(c => (
                                        <option key={c.id} value={c.id}>{c.name} (عروة نشطة)</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-black text-neutral-700 dark:text-neutral-400 mb-2 mr-1">بيان الحركة (الملاحظات)</label>
                            <textarea 
                                rows={2}
                                value={description} 
                                onChange={e => setDescription(e.target.value)} 
                                className="w-full p-4 bg-neutral-50 dark:bg-neutral-905 border-2 border-neutral-100 dark:border-neutral-800/80 rounded-2xl focus:ring-0 focus:border-indigo-500 outline-none font-bold text-neutral-800 dark:text-neutral-100 transition-all resize-none text-sm group-hover:bg-white dark:group-hover:bg-neutral-900"
                                placeholder={transferType === 'deposit' ? 'مثال: توريد مبيعات المحصول...' : 'مثال: سحب لتغطية أجور العمالة...'}
                            />
                        </div>

                        <div className="flex gap-3 pt-3">
                            <button 
                                type="button" 
                                onClick={() => setIsTransferModalOpen(false)} 
                                className="flex-1 py-3 bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 rounded-xl font-black hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-all outline-none cursor-pointer"
                            >
                                إلغاء
                            </button>
                            <button 
                                type="submit" 
                                className={`flex-1 py-3 text-white rounded-xl font-black transition-all outline-none cursor-pointer shadow-lg ${
                                    transferType === 'deposit' 
                                    ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/10 dark:shadow-none' 
                                    : 'bg-rose-600 hover:bg-rose-700 shadow-rose-500/10 dark:shadow-none'
                                }`}
                            >
                                تأكيد العملية
                            </button>
                        </div>
                    </form>
                </div>
            </Modal>

            {/* Edit Bank Modal */}
            <Modal isOpen={isEditBankModalOpen} onClose={() => setIsEditBankModalOpen(false)} title="تعديل الحساب البنكي">
                <form onSubmit={handleEditBank} className="space-y-4 text-right">
                    <div>
                        <label className="block text-xs font-black text-neutral-700 dark:text-neutral-300 mb-1.5">اسم البنك / رقم الحساب</label>
                        <input 
                            type="text" 
                            required 
                            value={editBankName} 
                            onChange={e => setEditBankName(e.target.value)} 
                            className="w-full p-3.5 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700/80 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none font-bold text-neutral-850 dark:text-neutral-200 transition-all"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-black text-neutral-700 dark:text-neutral-300 mb-1.5">الرصيد الافتتاحي (رصيد البداية)</label>
                        <div className="relative">
                            <input 
                                type="number" 
                                value={editBankBalance} 
                                onChange={e => setEditBankBalance(e.target.value)} 
                                className="w-full p-3.5 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700/80 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none font-black tabular-nums transition-all text-left"
                            />
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-bold text-neutral-400">ج.م</span>
                        </div>
                    </div>
                    <div className="flex gap-3 pt-4">
                        <button type="button" onClick={() => setIsEditBankModalOpen(false)} className="flex-1 py-3 bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-355 rounded-xl font-black hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors cursor-pointer">إلغاء</button>
                        <button type="submit" className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-black hover:bg-indigo-700 transition-all cursor-pointer shadow-lg shadow-indigo-505/10 dark:shadow-none">حفظ التغييرات</button>
                    </div>
                </form>
            </Modal>

            {/* Delete Bank Modal */}
            <Modal isOpen={isDeleteBankModalOpen} onClose={() => setIsDeleteBankModalOpen(false)} title="تأكيد حذف الحساب البنكي">
                <div className="space-y-4 text-right">
                    <div className="p-4 bg-rose-50 dark:bg-rose-955/20 text-rose-600 dark:text-rose-400 rounded-xl flex items-start gap-3 border border-rose-100 dark:border-rose-900/30">
                        <WarningIcon className="w-6 h-6 shrink-0 mt-0.5 text-rose-600 dark:text-rose-450" />
                        <div>
                            <p className="font-black text-base">هل أنت متأكد من حذف هذا الحساب نهائياً؟</p>
                            <p className="text-sm mt-1 opacity-80 leading-relaxed">يرجى العلم بأنه لا يمكن حذف أي حساب بنكي يحتوي على معاملات مالية نشطة في السجل، لضمان تكامل القيود المحاسبية.</p>
                        </div>
                    </div>
                    <div className="flex gap-3 pt-4">
                        <button onClick={() => setIsDeleteBankModalOpen(false)} className="flex-1 py-3 bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-350 rounded-xl font-black hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors cursor-pointer">إلغاء الإجراء</button>
                        <button onClick={handleDeleteBank} className="flex-1 py-3 bg-rose-600 text-white rounded-xl font-black hover:bg-rose-700 transition-colors cursor-pointer shadow-lg shadow-rose-500/15 dark:shadow-none">تأكيد عملية الحذف</button>
                    </div>
                </div>
            </Modal>

            {/* Delete Transaction Modal */}
            <Modal isOpen={isDeleteTxModalOpen} onClose={() => { setIsDeleteTxModalOpen(false); setTxToDelete(null); }} title="تأكيد حذف الحركة المالية">
                <div className="space-y-4 text-right">
                    <div className="p-4 bg-rose-55/70 dark:bg-rose-955/20 text-rose-600 dark:text-rose-400 rounded-xl flex items-start gap-3 border border-rose-100 dark:border-rose-900/30">
                        <WarningIcon className="w-6 h-6 shrink-0 mt-0.5 text-rose-600 or dark:text-rose-450" />
                        <div>
                            <p className="font-black">تأكيد حذف الحركة المصرفية</p>
                            <p className="text-sm mt-1 opacity-85 leading-relaxed">سيؤثر حذف هذه المعاملة بشكل مباشر ومزدوج على رصيد البنك ورصيد كاش الصندوق للعهدة الزراعية المرتبطة بها!</p>
                        </div>
                    </div>
                    {txToDelete && (
                        <div className="p-4 bg-neutral-50 dark:bg-neutral-900 border border-neutral-150 dark:border-neutral-800/80 rounded-xl">
                            <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-500 mb-2 inline-block">تفاصيل المعاملة الحالية</span>
                            <p className="text-sm font-black text-neutral-800 dark:text-neutral-200">
                                {txToDelete.type === 'deposit' ? 'إيداع نقدي' : 'سحب نقدي'} بقيمة: {formatNumber(txToDelete.amount)} ج.م
                            </p>
                            {txToDelete.description && <p className="text-xs text-neutral-450 mt-1">البيان: {txToDelete.description}</p>}
                            <p className="text-[10px] text-neutral-400 mt-2 font-mono">{txToDelete.date}</p>
                        </div>
                    )}
                    <div className="flex gap-3 pt-4">
                        <button onClick={() => { setIsDeleteTxModalOpen(false); setTxToDelete(null); }} className="flex-1 py-3 bg-neutral-100 dark:bg-neutral-805 text-neutral-700 dark:text-neutral-350 rounded-xl font-black hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors cursor-pointer">إلغاء</button>
                        <button onClick={handleDeleteTx} className="flex-1 py-3 bg-rose-600 text-white rounded-xl font-black hover:bg-rose-700 transition-all cursor-pointer shadow-lg shadow-rose-500/15 dark:shadow-none">حفظ وحذف الحركة</button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default BankAccountDetails;
