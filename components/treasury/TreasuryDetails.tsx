import React, { useState, useMemo } from 'react';
import type { TreasuryFund } from '../../types';
import { formatNumber, calculateInvoiceTotal, getLocalDateString, getInvoiceRetainedDetails } from '../../utils/helpers';
import { useData } from '../../contexts/DataContext';
import Breadcrumbs from '../shared/Breadcrumbs';
import Modal from '../shared/Modal';
import { triggerSaveHaptic, triggerLightHaptic } from '../../lib/haptics';
import { 
    ArrowRightIcon, 
    TrendingUpIcon, 
    TrendingDownIcon,
    WalletIcon,
    UserMinusIcon,
    CreditCardIcon,
    FarmerAccountIcon,
    UserIcon,
    TruckIcon,
    PlusIcon,
    ClockIcon,
    SparklesIcon,
    ArrowUpRightIcon,
    ArrowDownLeftIcon,

    PencilIcon,
    CheckCircleIcon
} from '../Icons';

interface TreasuryDetailsProps {
    fund: TreasuryFund;
    onBack: () => void;
    showBackButton?: boolean;
}

type TransactionTab = 'all' | 'inflow' | 'outflow';

const StatMiniCard = ({ label, value, icon: Icon, colorClass, bgColorClass, count, subLabel, subIcon: SubIcon }: any) => (
    <div className={`p-4 sm:p-5 rounded-[1.5rem] sm:rounded-[2rem] ${bgColorClass} border border-neutral-100 dark:border-neutral-700/50 shadow-soft flex flex-col justify-between h-full transition-all hover:shadow-md group`}>
        <div className="flex justify-between items-start mb-3 sm:mb-4">
            <div className={`p-2 sm:p-3 rounded-xl sm:rounded-2xl ${colorClass.replace('text-', 'bg-')}/10 ${colorClass} transition-transform group-hover:scale-110`}>
                <Icon className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div className="text-left">
                <span className="text-[8px] sm:text-[10px] font-black text-neutral-400 bg-neutral-50 dark:bg-neutral-900 px-1.5 sm:px-2.5 py-0.5 sm:py-1 rounded-lg border border-neutral-100 dark:border-neutral-800 tabular-nums">
                    {count} حركات
                </span>
            </div>
        </div>
        <div>
            <p className="text-[9px] sm:text-[11px] font-black text-neutral-500 dark:text-neutral-400 uppercase tracking-tight sm:tracking-widest mb-1">{label}</p>
            <p className={`text-sm sm:text-2xl font-black ${colorClass} tracking-tighter tabular-nums mb-2 sm:mb-3`}>
                {formatNumber(value)}
                <span className="text-[8px] sm:text-xs mr-1 opacity-60 font-bold">ج.م</span>
            </p>
            
            {subLabel && (
                <div className="flex items-center gap-1 sm:gap-1.5 pt-2 sm:pt-3 border-t border-neutral-100 dark:border-neutral-700/50">
                    {SubIcon && <SubIcon className="w-2.5 h-2.5 sm:w-3 h-3 text-neutral-400" />}
                    <span className="text-[8px] sm:text-[10px] font-bold text-neutral-400 truncate max-w-full">{subLabel}</span>
                </div>
            )}
        </div>
    </div>
);

const TreasuryDetails: React.FC<TreasuryDetailsProps> = ({ fund, onBack, showBackButton = true }) => {
    const { 
        cyclesWithCalculations, 
        supplierPayments, 
        suppliers, 
        farmers, 
        bankAccounts, 
        bankTransactions, 
        rawExpenses,
        invoices,
        advances, 
        farmerWithdrawals,
        settings,
        profile,
        addInvoice,
        updateInvoice,
        deleteInvoice
    } = useData();

    const isViewer = profile?.role === 'viewer';

    // Tab Filter state
    const [historyTab, setHistoryTab] = useState<TransactionTab>('all');

    // Manual Funding Modal state
    const [isFundingModalOpen, setIsFundingModalOpen] = useState(false);
    const [editingFunding, setEditingFunding] = useState<any>(null);
    const [fundingAmount, setFundingAmount] = useState('');
    const [fundingNote, setFundingNote] = useState('');
    const [fundingDate, setFundingDate] = useState(getLocalDateString());
    const [validationError, setValidationError] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

    const handleTabChange = (tab: TransactionTab) => {
        triggerLightHaptic();
        setHistoryTab(tab);
    };

    const handleAddFunding = async (e?: React.FormEvent) => {
        if (isViewer) return;
        if (e) e.preventDefault();
        const parsedAmount = parseFloat(fundingAmount);
        if (!fundingAmount || isNaN(parsedAmount) || parsedAmount <= 0) {
            setValidationError('يرجى إدخال مبلغ صحيح أكبر من الصفر');
            return;
        }

        setValidationError(null);
        triggerSaveHaptic();
        setIsSaving(true);

        try {
            const cleanNote = fundingNote.trim() || 'تمويل يدوي من المالك لتكملة المصاريف';
            const selectedDate = fundingDate || getLocalDateString();

            if (editingFunding) {
                const updatedInvoice = {
                    ...editingFunding,
                    cycle_id: fund.id,
                    date: selectedDate,
                    market: 'تمويل يدوي',
                    description: cleanNote,
                    packaging_type: 'cage',
                    packaging_count: 0,
                    price_items: [
                        {
                            ...(editingFunding.price_items?.[0] || {}),
                            quantity: 1,
                            price_per_kg: parsedAmount
                        }
                    ],
                    deductions: editingFunding.deductions || []
                };
                await updateInvoice(updatedInvoice);
            } else {
                const invoiceData = {
                    cycle_id: fund.id,
                    date: selectedDate,
                    market: 'تمويل يدوي',
                    description: cleanNote,
                    packaging_type: 'cage',
                    packaging_count: 0,
                    price_items: [
                        {
                            quantity: 1,
                            price_per_kg: parsedAmount
                        }
                    ],
                    deductions: []
                };

                await addInvoice(invoiceData as any);
            }

            setIsFundingModalOpen(false);
            setEditingFunding(null);
            setFundingAmount('');
            setFundingNote('');
            setFundingDate(getLocalDateString());
        } catch (error) {
            console.error('Funding error:', error);
            setValidationError('حدث خطأ أثناء حفظ التمويل، يرجى المحاولة مرة أخرى.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteFunding = async () => {
        if (isViewer || !editingFunding) return;
        triggerSaveHaptic();
        setIsSaving(true);
        try {
            await deleteInvoice(editingFunding.id);
            setIsDeleteModalOpen(false);
            setIsFundingModalOpen(false);
            setEditingFunding(null);
        } catch (error) {
            console.error('Delete funding error:', error);
        } finally {
            setIsSaving(false);
        }
    };

    const handleEditFundingClick = (funding: any) => {
        if (isViewer) return;
        triggerLightHaptic();
        setEditingFunding(funding);
        setFundingAmount(funding.amount?.toString() || '');
        setFundingNote(funding.description || funding.note || '');
        setFundingDate(funding.date || getLocalDateString());
        setValidationError(null);
        setIsFundingModalOpen(true);
    };

    const totalOutflow = fund.outflows.supplierPayments.amount + 
                         fund.outflows.farmerWithdrawals.amount + 
                         fund.outflows.operatingExpenses.amount + 
                         fund.outflows.personalAdvances.amount;

    // Secure owner bank account resolution without relying strictly on a fixed name string
    const ownerBankAccount = useMemo(() => {
        return bankAccounts.find(ba => 
            (settings?.owner_bank_account_id && ba.id === settings.owner_bank_account_id) || 
            ba.is_owner_account === true || 
            ba.account_type === 'owner_current' || 
            ba.name === 'جاري المالك - تمويل شخصي' || 
            ba.name?.includes('جاري المالك')
        );
    }, [bankAccounts, settings?.owner_bank_account_id]);

    const ownerBankId = ownerBankAccount?.id;
    const cycleOwnerTx = ownerBankId ? bankTransactions.filter(t => t.cycle_id === fund.id && t.account_id === ownerBankId) : [];
    
    const ownerFundedAmount = cycleOwnerTx.filter(t => t.type === 'withdrawal').reduce((s,t) => s + t.amount, 0);
    const ownerRepayedAmount = cycleOwnerTx.filter(t => t.type === 'deposit').reduce((s,t) => s + t.amount, 0);
    
    const ownerNetBalance = ownerFundedAmount - ownerRepayedAmount;

    const bankBalance = (fund.outflows.bankDeposits.amount - ownerRepayedAmount) - (fund.inflows.bankWithdrawals - ownerFundedAmount);
    
    const extraInfo = useMemo(() => {
        const cycle = cyclesWithCalculations.find(c => c.id === fund.id);
        const farmer = farmers.find(f => f.id === cycle?.responsible_farmer_id);
        const cycleSupplierPayments = supplierPayments.filter(p => p.cycle_id === fund.id);
        const lastPayment = [...cycleSupplierPayments].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
        
        const lastSupplierName = lastPayment 
            ? suppliers.find(s => s.id === lastPayment.supplier_id)?.name 
            : null;

        const cycleExpenses = rawExpenses.filter(e => e.cycle_id === fund.id && e.payment_method === 'cash');
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
    }, [fund.id, cyclesWithCalculations, supplierPayments, suppliers, farmers, rawExpenses, advances, farmerWithdrawals]);

    // Create a synthesized history list of transactions across all accounting records
    const recentHistory = useMemo(() => {
        const h: any[] = [];
        
        supplierPayments.filter(p => p.cycle_id === fund.id).forEach(p => {
            h.push({ 
                ...p, 
                typeLabel: 'مورد', 
                note: suppliers.find(s => s.id === p.supplier_id)?.name || 'دفعة مورد', 
                isOutflow: true,
                badgeColor: 'amber'
            });
        });

        farmerWithdrawals.filter(w => w.cycle_id === fund.id).forEach(w => {
            h.push({ 
                ...w, 
                typeLabel: 'مزارع', 
                note: `سحب مزارع: ${extraInfo.responsibleFarmer}`, 
                isOutflow: true,
                badgeColor: 'blue'
            });
        });

        rawExpenses.filter(e => e.cycle_id === fund.id && e.payment_method === 'cash').forEach(e => {
            h.push({ 
                ...e, 
                amount: Math.abs(e.amount),
                typeLabel: 'مصروفات', 
                note: e.description || 'مصروف نقدي', 
                isOutflow: e.amount >= 0,
                badgeColor: 'rose'
            });
        });

        advances.filter(a => a.cycle_id === fund.id).forEach(a => {
            const isRepayment = a.amount < 0;
            h.push({ 
                ...a, 
                amount: Math.abs(a.amount),
                typeLabel: isRepayment ? 'سداد سلفة' : 'سلفة نقدية', 
                note: a.actor_name || a.personName || 'سلفة شخصية', 
                isOutflow: !isRepayment,
                badgeColor: isRepayment ? 'emerald' : 'purple'
            });
        });

        cycleOwnerTx.forEach(t => {
            const isDeposit = t.type === 'deposit';
            h.push({ 
                ...t, 
                typeLabel: 'تمويل شخصي', 
                note: t.description || (isDeposit ? 'إيداع من الخزنة إلى جاري المالك' : 'سحب من جاري المالك لتغذية الخزنة'), 
                isOutflow: isDeposit,
                badgeColor: 'indigo'
            });
        });

        invoices.filter(i => i.cycle_id === fund.id).forEach(i => {
            const isManualFunding = i.market === 'تمويل يدوي';
            const invoiceTotal = calculateInvoiceTotal(i.price_items, i.deductions);
            const { isRetained, surplus, retainedAmount } = getInvoiceRetainedDetails(i.description, i.is_retained_debt, invoiceTotal);
            
            if (isRetained) {
                h.push({ 
                    ...i, 
                    amount: surplus, 
                    typeLabel: surplus > 0 ? 'فائض مبيعات مرصودة (نقدية واردة)' : 'فاتورة مرصودة للدين', 
                    note: surplus > 0 
                        ? `(سداد دين: ${formatNumber(retainedAmount)} ج | فائض مرحل للخزنة: ${formatNumber(surplus)} ج) ${i.description ? i.description.replace(/\s*\[RETAINED_DEBT:.*?\]/g, '').replace(/\s*\[مرصودة\]/g, '').trim() : ''}`
                        : `(مرصودة لسداد مديونية المعلم) ${i.description ? i.description.replace(/\s*\[RETAINED_DEBT:.*?\]/g, '').replace(/\s*\[مرصودة\]/g, '').trim() : ''}`, 
                    isOutflow: false,
                    badgeColor: surplus > 0 ? 'emerald' : 'neutral'
                });
            } else {
                h.push({ 
                    ...i, 
                    amount: invoiceTotal, 
                    typeLabel: i.market === 'رصيد منقول' ? 'رصيد منقول' : (isManualFunding ? 'تمويل يدوي' : 'إيراد مبيعات'), 
                    note: i.description || (i.market === 'رصيد منقول' ? 'رصيد مرحل من العروة السابقة' : (isManualFunding ? 'تمويل من جيبي الخاص' : `توريد: ${i.market}`)), 
                    isOutflow: false,
                    isManualFunding,
                    badgeColor: isManualFunding ? 'violet' : (i.market === 'رصيد منقول' ? 'cyan' : 'emerald')
                });
            }
        });
        
        return h.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [fund.id, invoices, supplierPayments, suppliers, farmerWithdrawals, extraInfo.responsibleFarmer, rawExpenses, advances, cycleOwnerTx]);

    // Derived statistics for tabs
    const tabCounts = useMemo(() => {
        const inflowItems = recentHistory.filter(h => !h.isOutflow);
        const outflowItems = recentHistory.filter(h => h.isOutflow);
        return {
            all: recentHistory.length,
            inflow: inflowItems.length,
            outflow: outflowItems.length,
            inflowTotal: inflowItems.reduce((acc, curr) => acc + (curr.amount || 0), 0),
            outflowTotal: outflowItems.reduce((acc, curr) => acc + (curr.amount || 0), 0)
        };
    }, [recentHistory]);

    // Filtered list based on active tab
    const filteredHistory = useMemo(() => {
        if (historyTab === 'inflow') {
            return recentHistory.filter(h => !h.isOutflow);
        }
        if (historyTab === 'outflow') {
            return recentHistory.filter(h => h.isOutflow);
        }
        return recentHistory;
    }, [recentHistory, historyTab]);

    return (
        <div className="space-y-6 max-w-4xl mx-auto pb-20 animate-page-enter">
            {/* Top Navigation & Actions */}
            <div className="flex items-center justify-between px-2">
                <Breadcrumbs items={[{ label: 'الخزنة', onClick: showBackButton ? onBack : undefined }, { label: fund.name.replace('صندوق: ', '') }]} />
                <div className="flex items-center gap-2">
                    {!isViewer && (
                        <button 
                            onClick={() => {
                                triggerLightHaptic();
                                setEditingFunding(null);
                                setFundingAmount('');
                                setFundingNote('');
                                setFundingDate(getLocalDateString());
                                setValidationError(null);
                                setIsFundingModalOpen(true);
                            }}
                            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white rounded-2xl shadow-sm transition-all active:scale-95 text-xs font-black cursor-pointer"
                        >
                            <PlusIcon className="w-4 h-4" />
                            <span>إضافة تمويل</span>
                        </button>
                    )}
                    {showBackButton && (
                        <button 
                            onClick={() => {
                                triggerLightHaptic();
                                onBack();
                            }} 
                            className="p-2.5 bg-white dark:bg-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-700/50 rounded-2xl shadow-sm border border-neutral-200 dark:border-neutral-700 transition-all active:scale-95 cursor-pointer"
                        >
                            <ArrowRightIcon className="w-5 h-5 transform rotate-180 text-neutral-600 dark:text-neutral-300" />
                        </button>
                    )}
                </div>
            </div>
            
            {/* Funding Modal */}
            {!isViewer && (
                <>
                    <Modal
                        isOpen={isFundingModalOpen}
                    onClose={() => {
                        setIsFundingModalOpen(false);
                        setEditingFunding(null);
                        setValidationError(null);
                    }}
                    title={editingFunding ? "تعديل تمويل العروة" : "إضافة تمويل شخصي (كاش)"}
                    size="md"
                >
                    <form onSubmit={handleAddFunding} className="space-y-4 text-right" dir="rtl">
                    <div className="bg-indigo-50/70 dark:bg-indigo-950/30 p-3.5 rounded-2xl border border-indigo-100 dark:border-indigo-900/40 flex items-start gap-2.5">
                        <SparklesIcon className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
                        <p className="text-xs text-indigo-900 dark:text-indigo-200 leading-relaxed font-semibold">
                            {editingFunding 
                                ? "تعديل بيانات وسند التمويل الشخصي المسجل لدعم الخزنة ومصاريف العروة."
                                : "سيتم قيد هذا المبلغ كتمويل نقدي إضافي مباشر داخل عهدة هذه العروة، مما يرفع رصيد الكاش فوراً."}
                        </p>
                    </div>

                    {validationError && (
                        <div className="p-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40 rounded-xl text-rose-700 dark:text-rose-300 text-xs font-bold">
                            {validationError}
                        </div>
                    )}
                    
                    <div className="space-y-1.5">
                        <label className="text-xs font-black text-neutral-700 dark:text-neutral-200">المبلغ (ج.م) *</label>
                        <div className="relative">
                            <input
                                type="number"
                                step="any"
                                min="0.01"
                                required
                                autoFocus
                                value={fundingAmount}
                                onChange={(e) => {
                                    setFundingAmount(e.target.value);
                                    if (validationError) setValidationError(null);
                                }}
                                placeholder="مثلاً: 5000"
                                className="w-full bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-3.5 pr-4 pl-12 rounded-xl focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 outline-none text-xl font-black tabular-nums text-neutral-900 dark:text-white"
                            />
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-bold text-neutral-400">ج.م</span>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                            <label className="text-xs font-black text-neutral-700 dark:text-neutral-200">التاريخ</label>
                            <div className="relative">
                                <input
                                    type="date"
                                    value={fundingDate}
                                    onChange={(e) => setFundingDate(e.target.value)}
                                    className="w-full bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-3 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-xs font-bold text-neutral-800 dark:text-neutral-100"
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-black text-neutral-700 dark:text-neutral-200">البيان والملاحظة</label>
                            <input
                                type="text"
                                value={fundingNote}
                                onChange={(e) => setFundingNote(e.target.value)}
                                placeholder="مثلاً: دفعة إضافية لتكملة المصاريف"
                                className="w-full bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-3 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-xs text-neutral-800 dark:text-neutral-100"
                            />
                        </div>
                    </div>

                    {fundingAmount && parseFloat(fundingAmount) > 0 && (
                        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 rounded-xl border border-emerald-100 dark:border-emerald-900/30 flex items-center justify-between">
                            <span className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300">الأثر المالي المتوقع:</span>
                            <span className="text-xs font-black text-emerald-700 dark:text-emerald-400 tabular-nums">
                                +{formatNumber(parseFloat(fundingAmount))} ج.م في كاش الخزنة
                            </span>
                        </div>
                    )}

                    <div className="flex gap-2.5 pt-4">
                        <button
                            type="submit"
                            disabled={isSaving || !fundingAmount}
                            className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-black py-3 rounded-xl transition-all active:scale-95 text-xs shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                            <CheckCircleIcon className="w-4 h-4" />
                            <span>{isSaving ? 'جاري الحفظ...' : (editingFunding ? 'تحديث السند' : 'تأكيد التمويل')}</span>
                        </button>
                        
                        {editingFunding && (
                            <button
                                type="button"
                                onClick={() => {
                                    triggerLightHaptic();
                                    setIsDeleteModalOpen(true);
                                }}
                                className="px-4 bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 font-bold rounded-xl hover:bg-rose-100 transition-all text-xs border border-rose-200/50 dark:border-rose-900/30 cursor-pointer"
                            >
                                حذف
                            </button>
                        )}

                        <button
                            type="button"
                            onClick={() => {
                                triggerLightHaptic();
                                setIsFundingModalOpen(false);
                                setEditingFunding(null);
                                setValidationError(null);
                            }}
                            className="px-4 bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 font-bold rounded-xl hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-all text-xs cursor-pointer"
                        >
                            إلغاء
                        </button>
                    </div>
                </form>
            </Modal>

            {/* Delete Confirmation Modal */}
            <Modal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                title="تأكيد حذف التمويل"
                size="sm"
            >
                <div className="space-y-4 text-right" dir="rtl">
                    <p className="text-xs text-neutral-600 dark:text-neutral-300 leading-relaxed font-semibold">
                        هل أنت متأكد من حذف هذا السند التمويلي؟ سيتم خصم هذا المبلغ من رصيد الخزنة فوراً وضبط الحسابات المالية.
                    </p>
                    <div className="flex gap-2.5 pt-2">
                        <button
                            onClick={handleDeleteFunding}
                            disabled={isSaving}
                            className="flex-1 bg-rose-600 hover:bg-rose-700 text-white font-black py-2.5 rounded-xl transition-all active:scale-95 text-xs shadow-sm cursor-pointer"
                        >
                            {isSaving ? 'جاري الحذف...' : 'نعم، تأكيد الحذف'}
                        </button>
                        <button
                            onClick={() => {
                                triggerLightHaptic();
                                setIsDeleteModalOpen(false);
                            }}
                            className="flex-1 bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 font-bold rounded-xl hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-all text-xs cursor-pointer"
                        >
                            تراجع
                        </button>
                    </div>
                </div>
            </Modal>
            </>
            )}

            {/* Hero Balance Card (Fintech Grade) */}
            <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-indigo-950 to-neutral-950 rounded-3xl p-5 sm:p-7 text-white shadow-xl border border-white/10">
                <div className="absolute top-0 right-0 w-72 h-72 bg-indigo-500/15 rounded-full blur-[90px] -mr-32 -mt-32 pointer-events-none"></div>
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-[80px] -ml-24 -mb-24 pointer-events-none"></div>
                
                <div className="relative z-10 space-y-6 text-center">
                    
                    {/* Main Balance */}
                    <div>
                        <div className="inline-flex items-center justify-center gap-2 px-3 py-1 bg-white/10 rounded-full backdrop-blur-md mb-3 border border-white/10">
                            <WalletIcon className="w-3.5 h-3.5 text-indigo-300" />
                            <span className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-indigo-100">رصيد الكاش الفعلي في العهدة</span>
                        </div>
                        <div className="flex items-baseline justify-center gap-1.5">
                            <span className="text-5xl sm:text-6xl font-black tracking-tight tabular-nums text-white drop-shadow-md">
                                {formatNumber(fund.balance)}
                            </span>
                            <span className="text-lg sm:text-xl font-bold text-neutral-300">ج.م</span>
                        </div>
                    </div>

                    {ownerNetBalance > 0 && (
                        <div className="inline-flex items-center justify-center gap-2 px-3.5 py-1.5 bg-indigo-500/20 text-indigo-200 rounded-xl border border-indigo-400/30 max-w-fit mx-auto backdrop-blur-md shadow-inner">
                            <UserIcon className="w-3.5 h-3.5 text-indigo-300" />
                            <span className="text-[11px] font-bold">
                                يتضمن تمويل شخصي: <strong className="text-white font-black tabular-nums">{formatNumber(ownerNetBalance)}</strong> ج.م
                            </span>
                        </div>
                    )}
                    
                    {/* In/Out/Bank Balance Triple Strip */}
                    <div className="grid grid-cols-3 gap-2.5 sm:gap-3 pt-4 border-t border-white/10">
                        {/* Inflow */}
                        <div className="bg-white/5 backdrop-blur-md rounded-2xl p-3 sm:p-4 border border-white/10 flex flex-col items-center justify-center text-center group hover:bg-white/10 transition-colors">
                            <div className="flex items-center gap-1.5 mb-1">
                                <div className="p-1 sm:p-1.5 bg-emerald-500/20 rounded-xl text-emerald-400 group-hover:scale-110 transition-transform">
                                    <TrendingUpIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                </div>
                                <p className="text-[8px] sm:text-[10px] font-black text-emerald-200/70 uppercase tracking-wider">إجمالي الداخل</p>
                            </div>
                            <p className="text-xs sm:text-lg font-black tabular-nums text-emerald-400">
                                {formatNumber(fund.inflows.totalRevenue + fund.inflows.bankWithdrawals + (fund.inflows.transferredBalance || 0) + (fund.inflows.manualFunding || 0) + (fund.inflows.jointDebtsFunding || 0) + (fund.inflows.individualDebtsFunding || 0))}
                            </p>
                        </div>

                        {/* Outflow */}
                        <div className="bg-white/5 backdrop-blur-md rounded-2xl p-3 sm:p-4 border border-white/10 flex flex-col items-center justify-center text-center group hover:bg-white/10 transition-colors">
                            <div className="flex items-center gap-1.5 mb-1">
                                <div className="p-1 sm:p-1.5 bg-rose-500/20 rounded-xl text-rose-400 group-hover:scale-110 transition-transform">
                                    <TrendingDownIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                </div>
                                <p className="text-[8px] sm:text-[10px] font-black text-rose-200/70 uppercase tracking-wider">إجمالي الخارج</p>
                            </div>
                            <p className="text-xs sm:text-lg font-black tabular-nums text-rose-400">{formatNumber(totalOutflow)}</p>
                        </div>

                        {/* Available in Bank */}
                        <div className="bg-white/5 backdrop-blur-md rounded-2xl p-3 sm:p-4 border border-white/10 flex flex-col items-center justify-center text-center group hover:bg-white/10 transition-colors">
                            <div className="flex items-center gap-1.5 mb-1">
                                <div className="p-1 sm:p-1.5 bg-blue-500/20 rounded-xl text-blue-400 group-hover:scale-110 transition-transform">
                                    <WalletIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                </div>
                                <p className="text-[8px] sm:text-[10px] font-black text-blue-200/70 uppercase tracking-wider">المتاح بالبنك</p>
                            </div>
                            <p className="text-xs sm:text-lg font-black tabular-nums text-blue-400">{formatNumber(bankBalance)}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Outflows Category Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                <StatMiniCard 
                    label="مدفوعات الموردين" 
                    value={fund.outflows.supplierPayments.amount} 
                    count={extraInfo.counts.supplier}
                    icon={CreditCardIcon} 
                    colorClass="text-amber-600 dark:text-amber-400" 
                    bgColorClass="bg-white dark:bg-neutral-800"
                    subLabel={extraInfo.lastSupplier ? `آخر مورد: ${extraInfo.lastSupplier}` : "لا توجد مدفوعات"}
                    subIcon={TruckIcon}
                />
                <StatMiniCard 
                    label="سحوبات المزارعين" 
                    value={fund.outflows.farmerWithdrawals.amount} 
                    count={extraInfo.counts.farmer}
                    icon={FarmerAccountIcon} 
                    colorClass="text-blue-600 dark:text-blue-400" 
                    bgColorClass="bg-white dark:bg-neutral-800"
                    subLabel={`المزارع: ${extraInfo.responsibleFarmer}`}
                    subIcon={UserIcon}
                />
                <StatMiniCard 
                    label="مصروفات تشغيل" 
                    value={fund.outflows.operatingExpenses.amount} 
                    count={extraInfo.counts.expenses}
                    icon={WalletIcon} 
                    colorClass="text-rose-500 dark:text-rose-400" 
                    bgColorClass="bg-white dark:bg-neutral-800"
                    subLabel="نثريات نقدية يومية"
                />
                <StatMiniCard 
                    label="سلفة شخصية" 
                    value={fund.outflows.personalAdvances.amount} 
                    count={extraInfo.counts.advances}
                    icon={UserMinusIcon} 
                    colorClass="text-purple-600 dark:text-purple-400" 
                    bgColorClass="bg-white dark:bg-neutral-800"
                    subLabel="سلف تخصم من العهدة"
                />
            </div>

            {/* Recent History Section with Fintech Tabs */}
            <div className="bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 rounded-3xl overflow-hidden shadow-sm">
                
                {/* Header & Tabs */}
                <div className="p-4 sm:p-5 border-b border-neutral-100 dark:border-neutral-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 rounded-xl">
                            <ClockIcon className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="text-sm font-black text-neutral-900 dark:text-white uppercase tracking-wider">سجل الحركات المالي</h3>
                            <p className="text-[10px] text-neutral-400 font-bold mt-0.5">تفاصيل التدفقات النقدية الواردة والمنصرفة</p>
                        </div>
                    </div>

                    {/* Fintech Filter Tabs */}
                    <div className="flex items-center p-1 bg-neutral-100 dark:bg-neutral-800/80 rounded-2xl border border-neutral-200/50 dark:border-neutral-700/50 self-stretch sm:self-auto">
                        {/* Tab: All */}
                        <button
                            type="button"
                            onClick={() => handleTabChange('all')}
                            className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                                historyTab === 'all'
                                    ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-sm'
                                    : 'text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200'
                            }`}
                        >
                            <span>الكل</span>
                            <span className={`px-1.5 py-0.2 rounded-md text-[9px] font-bold tabular-nums ${
                                historyTab === 'all' 
                                    ? 'bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200' 
                                    : 'bg-neutral-200/60 dark:bg-neutral-700/50 text-neutral-500'
                            }`}>
                                {tabCounts.all}
                            </span>
                        </button>

                        {/* Tab: Inflow */}
                        <button
                            type="button"
                            onClick={() => handleTabChange('inflow')}
                            className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                                historyTab === 'inflow'
                                    ? 'bg-emerald-600 text-white shadow-sm'
                                    : 'text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20'
                            }`}
                        >
                            <ArrowDownLeftIcon className="w-3 h-3" />
                            <span>وارد</span>
                            <span className={`px-1.5 py-0.2 rounded-md text-[9px] font-bold tabular-nums ${
                                historyTab === 'inflow' 
                                    ? 'bg-white/20 text-white' 
                                    : 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300'
                            }`}>
                                {tabCounts.inflow}
                            </span>
                        </button>

                        {/* Tab: Outflow */}
                        <button
                            type="button"
                            onClick={() => handleTabChange('outflow')}
                            className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                                historyTab === 'outflow'
                                    ? 'bg-rose-600 text-white shadow-sm'
                                    : 'text-rose-700 dark:text-rose-400 hover:bg-rose-50/50 dark:hover:bg-rose-950/20'
                            }`}
                        >
                            <ArrowUpRightIcon className="w-3 h-3" />
                            <span>منصرف</span>
                            <span className={`px-1.5 py-0.2 rounded-md text-[9px] font-bold tabular-nums ${
                                historyTab === 'outflow' 
                                    ? 'bg-white/20 text-white' 
                                    : 'bg-rose-100 dark:bg-rose-950/50 text-rose-800 dark:text-rose-300'
                            }`}>
                                {tabCounts.outflow}
                            </span>
                        </button>
                    </div>
                </div>

                {/* Tab Summary Banner */}
                {historyTab !== 'all' && (
                    <div className={`px-5 py-2.5 flex items-center justify-between text-xs font-black border-b border-neutral-100 dark:border-neutral-800 ${
                        historyTab === 'inflow' 
                            ? 'bg-emerald-50/50 dark:bg-emerald-950/15 text-emerald-800 dark:text-emerald-300' 
                            : 'bg-rose-50/50 dark:bg-rose-950/15 text-rose-800 dark:text-rose-300'
                    }`}>
                        <div className="flex items-center gap-1.5">
                            {historyTab === 'inflow' ? <TrendingUpIcon className="w-4 h-4 text-emerald-600" /> : <TrendingDownIcon className="w-4 h-4 text-rose-600" />}
                            <span>{historyTab === 'inflow' ? 'إجمالي الحركات الواردة المعروضة' : 'إجمالي الحركات المنصرفة المعروضة'}</span>
                        </div>
                        <span className="tabular-nums font-mono">
                            {formatNumber(historyTab === 'inflow' ? tabCounts.inflowTotal : tabCounts.outflowTotal)} ج.م
                        </span>
                    </div>
                )}

                {/* Transactions List */}
                <div className="divide-y divide-neutral-100 dark:divide-neutral-800/60">
                    {filteredHistory.length === 0 ? (
                        <div className="p-12 text-center flex flex-col items-center justify-center gap-2">
                            <div className="p-3 bg-neutral-50 dark:bg-neutral-800 rounded-full text-neutral-400">
                                <ClockIcon className="w-6 h-6" />
                            </div>
                            <p className="text-neutral-500 dark:text-neutral-400 text-xs font-black">
                                {historyTab === 'all' 
                                    ? 'لا توجد حركات مسجلة في هذه الخزنة حتى الآن' 
                                    : (historyTab === 'inflow' ? 'لا توجد حركات واردة مسجلة' : 'لا توجد حركات منصرفة مسجلة')}
                            </p>
                            <p className="text-[10px] text-neutral-400 font-bold">
                                ستظهر هنا كافة المعاملات المالية المرتبطة بالعهد فور تسجيلها.
                            </p>
                        </div>
                    ) : (
                        filteredHistory.map((h, i) => {
                            const isOutflow = h.isOutflow === true;
                            const absoluteAmount = Math.abs(h.amount);
                            const sign = isOutflow ? '-' : '+';
                            const isEditableFunding = !isViewer && (h.isManualFunding || h.market === 'تمويل يدوي');

                            return (
                                <div 
                                    key={h.id || i} 
                                    onClick={() => isEditableFunding ? handleEditFundingClick(h) : undefined}
                                    className={`p-4 sm:p-5 flex items-center justify-between hover:bg-neutral-50/80 dark:hover:bg-neutral-800/40 transition-colors group ${isEditableFunding ? 'cursor-pointer' : ''}`}
                                >
                                    <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                                        <div className={`p-2.5 rounded-2xl shrink-0 transition-transform group-hover:scale-105 ${
                                            isOutflow 
                                                ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/30 dark:text-rose-400 border border-rose-100/80 dark:border-rose-900/30' 
                                                : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400 border border-emerald-100/80 dark:border-emerald-900/30'
                                        }`}>
                                            {isOutflow ? <ArrowUpRightIcon className="w-4 h-4 sm:w-5 sm:h-5" /> : <ArrowDownLeftIcon className="w-4 h-4 sm:w-5 sm:h-5" />}
                                        </div>
                                        
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <p className="text-xs sm:text-sm font-black text-neutral-900 dark:text-white truncate max-w-[160px] sm:max-w-[280px]">
                                                    {h.note}
                                                </p>
                                                {isEditableFunding && (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-violet-50 dark:bg-violet-950/40 text-violet-700 dark:text-violet-300 rounded-md text-[9px] font-black border border-violet-200/60 dark:border-violet-800/40">
                                                        <PencilIcon className="w-2.5 h-2.5" />
                                                        <span>تعديل</span>
                                                    </span>
                                                )}
                                            </div>
                                            
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className={`inline-block px-1.5 py-0.2 rounded text-[9px] font-bold ${
                                                    h.badgeColor === 'amber' ? 'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400' :
                                                    h.badgeColor === 'blue' ? 'bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400' :
                                                    h.badgeColor === 'rose' ? 'bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-400' :
                                                    h.badgeColor === 'purple' ? 'bg-purple-50 dark:bg-purple-950/30 text-purple-700 dark:text-purple-400' :
                                                    h.badgeColor === 'violet' ? 'bg-violet-50 dark:bg-violet-950/30 text-violet-700 dark:text-violet-400' :
                                                    h.badgeColor === 'cyan' ? 'bg-cyan-50 dark:bg-cyan-950/30 text-cyan-700 dark:text-cyan-400' :
                                                    h.badgeColor === 'indigo' ? 'bg-indigo-50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-400' :
                                                    'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400'
                                                }`}>
                                                    {h.typeLabel}
                                                </span>
                                                <span className="text-[10px] text-neutral-400 dark:text-neutral-500 font-bold tabular-nums">
                                                    {new Date(h.date).toLocaleDateString('en-GB')}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Amount Badge */}
                                    <div className="flex flex-col items-end text-left shrink-0 mr-3">
                                        <div className={`px-2.5 py-1 rounded-xl font-black font-mono text-xs sm:text-sm tracking-tight border ${
                                            !isOutflow 
                                                ? 'bg-emerald-50/80 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200/60 dark:border-emerald-800/40' 
                                                : 'bg-rose-50/80 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border-rose-200/60 dark:border-rose-800/40'
                                        }`}>
                                            <span dir="ltr">{sign} {formatNumber(absoluteAmount)}</span>
                                            <span className="text-[10px] pr-1 font-bold">ج.م</span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            {/* Info Message Footer */}
            <div className="p-4 sm:p-5 bg-indigo-50/50 dark:bg-indigo-950/20 rounded-2xl border border-indigo-100 dark:border-indigo-900/30 text-center">
                <p className="text-[11px] text-indigo-900 dark:text-indigo-300 font-bold leading-relaxed">
                    💡 رصيد الخزنة يمثل السيولة النقدية الفعلية (الكاش) في عهدة هذه العروة بعد حساب كافة المقبوضات والمدفوعات.
                </p>
            </div>
        </div>
    );
};

export default TreasuryDetails;
