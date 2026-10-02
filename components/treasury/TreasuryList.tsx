import React, { useState } from 'react';
import type { TreasuryFund, BankAccount } from '../../types';
import { formatNumber } from '../../utils/helpers';
import { 
    SafeIcon, 
    ArrowLeftIcon, 
    WalletIcon, 
    PlusIcon, 
    InfoIcon
} from '../Icons';
import { useTreasury } from '../../hooks/useTreasury';
import { useCycles } from '../../hooks/useCycles';
import { useSettings } from '../../contexts/SettingsContext';
import { useUI } from '../../contexts/UIContext';
import { useToast } from '../../hooks/useToast';
import Modal from '../shared/Modal';
import Skeleton from '../shared/Skeleton';
import StaggerItem from '../shared/StaggerItem';
import TreasuryReport from './TreasuryReport';

interface FundCardProps {
    fund: TreasuryFund;
    onViewDetails: (id: string) => void;
}

const FundCard: React.FC<FundCardProps> = ({ fund, onViewDetails }) => {
    const totalInflow = fund.inflows.totalRevenue + fund.inflows.bankWithdrawals + (fund.inflows.transferredBalance || 0) + (fund.inflows.manualFunding || 0) + (fund.inflows.jointDebtsFunding || 0) + (fund.inflows.individualDebtsFunding || 0);
    const totalOutflow = fund.outflows.totalDeductions - fund.outflows.bankDeposits.amount;

    return (
        <button
            onClick={() => onViewDetails(fund.id)}
            className="w-full text-right bg-accent-success/[0.03] hover:bg-accent-success/[0.07] dark:bg-accent-success/[0.01] dark:hover:bg-accent-success/[0.03] p-4 rounded-2xl border border-accent-success/20 dark:border-accent-success/20 flex flex-col justify-between transition-all duration-200 hover:shadow-md hover:border-accent-success/20 group tap relative overflow-hidden"
        >
            <div className="w-full relative z-10 flex flex-col h-full justify-between">
                <div>
                    <div className="flex justify-between items-center mb-3">
                        <div className="flex items-center gap-2 min-w-0">
                            <div className="bg-accent-success/10/85 dark:bg-accent-success/20 text-emerald-650 dark:text-accent-success p-2 rounded-xl shrink-0">
                                <SafeIcon className="w-4 h-4" />
                            </div>
                            <h3 className="text-xs font-black text-neutral-850 dark:text-neutral-100 truncate">
                                {fund.name.replace('صندوق: ', '')}
                            </h3>
                        </div>
                        <ArrowLeftIcon className="w-3.5 h-3.5 text-neutral-400 group-hover:text-accent-success dark:group-hover:text-accent-success transition-all group-hover:-translate-x-0.5" />
                    </div>

                    <div className="flex flex-col gap-1 mb-4">
                        <span className="text-2xs font-bold text-neutral-450 dark:text-neutral-500 uppercase tracking-wider">الرصيد الحالي</span>
                        <div className="flex items-baseline gap-1">
                            <span className="text-2xl font-black text-neutral-900 dark:text-white tabular-nums tracking-tight">
                                {formatNumber(fund.balance)}
                            </span>
                            <span className="text-xs font-bold text-neutral-400">ج.م</span>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-3 border-t border-accent-success/20 w-full text-xs">
                    <div className="flex items-center gap-1.5 text-right min-w-0">
                        <span className="flex items-center justify-center w-5 h-5 rounded-full bg-accent-success/10/50 dark:bg-accent-success/20 text-accent-success dark:text-accent-success shrink-0 text-2xs" aria-hidden="true">
                            ↑
                        </span>
                        <div className="min-w-0">
                            <p className="text-[8.5px] font-bold text-neutral-450 dark:text-neutral-500 truncate">إجمالي الوارد</p>
                            <p className="font-extrabold text-[11px] text-accent-success dark:text-accent-success tabular-nums truncate">
                                {formatNumber(totalInflow)}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-1.5 text-right border-r border-accent-success/20 pr-2.5 min-w-0">
                        <span className="flex items-center justify-center w-5 h-5 rounded-full bg-accent-danger/10/50 dark:bg-accent-danger/20 text-accent-danger dark:text-accent-danger shrink-0 text-2xs" aria-hidden="true">
                            ↓
                        </span>
                        <div className="min-w-0">
                            <p className="text-[8.5px] font-bold text-neutral-450 dark:text-neutral-500 truncate">إجمالي المنصرف</p>
                            <p className="font-extrabold text-[11px] text-accent-danger dark:text-accent-danger tabular-nums truncate">
                                {formatNumber(totalOutflow)}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </button>
    );
};

interface BankCardProps {
    account: BankAccount;
    balance: number;
    onViewDetails: (id: string) => void;
}

const BankCard: React.FC<BankCardProps> = ({ account, balance, onViewDetails }) => {
    return (
        <button
            onClick={() => onViewDetails(account.id)}
            className="w-full text-right bg-indigo-500/[0.03] hover:bg-indigo-500/[0.07] dark:bg-indigo-500/[0.01] dark:hover:bg-indigo-500/[0.03] p-3.5 rounded-xl border border-indigo-500/10 dark:border-indigo-500/10 flex flex-col justify-between transition-all duration-200 hover:shadow-xs hover:border-indigo-500/30 group tap relative overflow-hidden"
        >
            <div className="w-full relative z-10">
                <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center gap-2 min-w-0">
                        <div className="bg-indigo-100/80 dark:bg-indigo-950/40 text-indigo-650 dark:text-indigo-400 p-1.5 rounded-lg shrink-0">
                            <WalletIcon className="w-4 h-4" />
                        </div>
                        <h3 className="text-[13px] font-black text-neutral-855 dark:text-neutral-100 truncate">
                            {account.name}
                        </h3>
                    </div>
                    <ArrowLeftIcon className="w-3 h-3 text-neutral-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-all group-hover:-translate-x-0.5" />
                </div>
                
                <div className="flex items-baseline justify-between gap-1 mt-1.5 pr-1 border-b border-indigo-500/[0.07] pb-2 mb-2">
                    <span className="text-lg font-black text-indigo-700 dark:text-indigo-300 tabular-nums tracking-tight">
                        {formatNumber(balance)}
                        <span className="text-2xs font-bold text-indigo-400 mr-0.5">ج.م</span>
                    </span>
                    <span className="text-2xs font-bold text-indigo-600/80 dark:text-indigo-400 uppercase tracking-tight">الرصيد المتوفر بالبنك</span>
                </div>

                <div className="pt-0.5 flex justify-between items-center text-2xs text-neutral-450 dark:text-neutral-500 font-extrabold">
                    <span>كشف الحساب والعمليات</span>
                    <span className="text-indigo-500 dark:text-indigo-400 font-black">←</span>
                </div>
            </div>
        </button>
    );
};

interface TreasuryListProps {
    funds: TreasuryFund[];
    onViewDetails: (id: string) => void;
    onViewBankDetails: (id: string) => void;
}

const TreasuryList: React.FC<TreasuryListProps> = ({ funds, onViewDetails, onViewBankDetails }) => {
    const [activeTab, setActiveTab] = useState<'cash' | 'bank'>('cash');
    const [isAddBankModalOpen, setIsAddBankModalOpen] = useState(false);
    const [newBankName, setNewBankName] = useState('');
    const [newBankBalance, setNewBankBalance] = useState('');
    const [isCashSafeExplainOpen, setIsCashSafeExplainOpen] = useState(false);
    const [isLedgerOpen, setIsLedgerOpen] = useState(false);

    const { 
        bankAccounts, 
        bankTransactions, 
        addBankAccount
    } = useTreasury();
    const { cycles } = useCycles();
    const { settings } = useSettings();
    const { loading } = useUI();
    const { showToast } = useToast();
    const isViewer = false;

    const handleAddBank = async (e: React.FormEvent) => {
        if (isViewer) return;
        e.preventDefault();
        if (!newBankName.trim()) return;
        try {
            await addBankAccount({
                name: newBankName.trim(),
                initial_balance: Number(newBankBalance) || 0
            });
            setIsAddBankModalOpen(false);
            setNewBankName('');
            setNewBankBalance('');
            showToast('تم إضافة الحساب البنكي بنجاح');
            setActiveTab('bank'); // Switch to bank tab to see the new account
        } catch (_error) {
            showToast('حدث خطأ أثناء إضافة الحساب البنكي', 'error');
        }
    };

    const getBankBalance = (accountId: string) => {
        const account = bankAccounts.find(a => a.id === accountId);
        if (!account) return 0;
        
        // Filter bank transactions to only include those belonging to active cycles
        const activeCycleIds = new Set(cycles.filter(c => c.status === 'active').map(c => c.id));
        const txs = bankTransactions.filter(t => t.account_id === accountId && t.cycle_id && activeCycleIds.has(t.cycle_id));
        
        const deposits = txs.filter(t => t.type === 'deposit').reduce((s, t) => s + t.amount, 0);
        const withdrawals = txs.filter(t => t.type === 'withdrawal').reduce((s, t) => s + t.amount, 0);
        
        // Only include initial_balance if there is at least one active cycle
        const initial = activeCycleIds.size > 0 ? (account.initial_balance || 0) : 0;
        return initial + deposits - withdrawals;
    };

    const totalCash = funds.reduce((s, f) => s + f.balance, 0);
    const isOwnerAccount = (a: BankAccount) => 
        (settings?.owner_bank_account_id && a.id === settings.owner_bank_account_id) || 
        a.is_owner_account === true || 
        a.account_type === 'owner_current' || 
        a.name.includes('جاري المالك');

    const realBankAccounts = bankAccounts.filter(a => !a.name.includes('نقدية') && !isOwnerAccount(a));
    const totalBank = realBankAccounts.reduce((s, a) => s + getBankBalance(a.id), 0);
    const totalLiquidity = totalCash + totalBank;
    
    // Calculate percentages for the progress bar
    const cashPercentage = totalLiquidity > 0 ? (totalCash / totalLiquidity) * 100 : 0;
    const bankPercentage = totalLiquidity > 0 ? (totalBank / totalLiquidity) * 100 : 0;

    return (
        <div className="space-y-6 animate-fade-in text-right">
            {/* Bento Grid: Liquidity Summary */}
            <div className="grid grid-cols-2 gap-4">
                {/* Main Total Liquidity Card */}
                <div className="col-span-2 bg-gradient-to-br from-neutral-950 via-indigo-950 to-neutral-950 dark:from-black dark:via-indigo-950/25 dark:to-neutral-950 rounded-[2rem] p-6 sm:p-8 text-white shadow-xl relative overflow-hidden flex flex-col justify-between border border-white/[0.04]">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4 pointer-events-none"></div>
                    <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/4 pointer-events-none"></div>
                    
                    <div className="relative z-10">
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <p className="text-xs font-bold text-indigo-300 dark:text-indigo-400 uppercase tracking-widest mb-1">إجمالي السيولة المتوفرة بالمشروع</p>
                                <div className="flex items-baseline gap-2 min-h-[48px] sm:min-h-[60px]">
                                    {loading ? (
                                        <Skeleton className="h-10 sm:h-12 w-32 bg-white/10 rounded-md" />
                                    ) : (
                                        <>
                                            <span className="text-4xl sm:text-5xl font-black tabular-nums tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-white via-neutral-100 to-indigo-100">{formatNumber(totalLiquidity)}</span>
                                            <span className="text-lg font-bold text-indigo-300">ج.م</span>
                                        </>
                                    )}
                                </div>
                            </div>
                            <div className="p-3.5 bg-white/5 dark:bg-white/5 rounded-2xl border border-white/10 backdrop-blur-sm shadow-inner">
                                <SafeIcon className="w-6 h-6 text-indigo-300" />
                            </div>
                        </div>
                        
                        {/* Progress Bar */}
                        <div className="mt-8">
                            <div className="flex justify-between text-2xs font-black text-indigo-200 mb-2.5 uppercase tracking-widest">
                                <span className="flex items-center gap-1.5">
                                    <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]" />
                                    <span>نقدية / كاش ({Math.round(cashPercentage)}%)</span>
                                </span>
                                <span className="flex items-center gap-1.5">
                                    <span className="w-2 h-2 rounded-full bg-indigo-400 shadow-[0_0_8px_rgba(129,140,248,0.5)]" />
                                    <span>حسابات بنكية ({Math.round(bankPercentage)}%)</span>
                                </span>
                            </div>
                            <div className="h-3 w-full bg-black/20 dark:bg-black/40 rounded-full overflow-hidden flex border border-white/10 backdrop-blur-sm">
                                <div className="h-full bg-emerald-400 transition-all duration-1000 ease-out" style={{ width: `${cashPercentage}%` }}></div>
                                <div className="h-full bg-indigo-400 transition-all duration-1000 ease-out border-l border-white/10" style={{ width: `${bankPercentage}%` }}></div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Side Cards */}
                <div className="col-span-1 bg-white dark:bg-neutral-900/30 rounded-[1.5rem] p-5 border border-neutral-200/65 dark:border-neutral-800/60 shadow-xs flex flex-col justify-center relative overflow-hidden group hover:shadow-md transition-all duration-300">
                    <div className="absolute top-0 right-0 w-24 h-24 sm:w-32 sm:h-32 bg-accent-success/5 rounded-full blur-2xl -translate-y-1/2 translate-x-1/4 group-hover:bg-accent-success/10 transition-all duration-300"></div>
                    <div className="relative z-10">
                        <div className="flex items-center gap-1.5 mb-1.5">
                            <div className="w-1.5 h-1.5 rounded-full bg-accent-success"></div>
                            <p className="text-2xs sm:text-[11px] font-black text-neutral-500 dark:text-neutral-400 uppercase tracking-widest">إجمالي النقدية بالكاش</p>
                        </div>
                        <div className="flex items-baseline gap-1">
                            <span className="text-xl sm:text-2xl font-black text-neutral-800 dark:text-neutral-100 tabular-nums tracking-tighter">{formatNumber(totalCash)}</span>
                            <span className="text-2xs sm:text-xs font-bold text-neutral-400">ج.م</span>
                        </div>
                    </div>
                </div>
                
                <div className="col-span-1 bg-white dark:bg-neutral-900/30 rounded-[1.5rem] p-5 border border-neutral-200/65 dark:border-neutral-800/60 shadow-xs flex flex-col justify-center relative overflow-hidden group hover:shadow-md transition-all duration-300">
                    <div className="absolute top-0 right-0 w-24 h-24 sm:w-32 sm:h-32 bg-indigo-500/5 rounded-full blur-2xl -translate-y-1/2 translate-x-1/4 group-hover:bg-indigo-500/10 transition-all duration-300"></div>
                    <div className="relative z-10">
                        <div className="flex items-center gap-1.5 mb-1.5">
                            <div className="w-1.5 h-1.5 rounded-full bg-indigo-500"></div>
                            <p className="text-2xs sm:text-[11px] font-black text-neutral-500 dark:text-neutral-400 uppercase tracking-widest">إجمالي الحسابات البنكية</p>
                        </div>
                        <div className="flex items-baseline gap-1">
                            <span className="text-xl sm:text-2xl font-black text-neutral-800 dark:text-neutral-100 tabular-nums tracking-tighter">{formatNumber(totalBank)}</span>
                            <span className="text-2xs sm:text-xs font-bold text-neutral-400">ج.م</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Quick Actions & Tabs */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 pt-4 border-t border-neutral-100 dark:border-neutral-800/40">
                {/* Tabs */}
                <div className="flex bg-neutral-100 dark:bg-neutral-900 p-0.5 rounded-lg border border-neutral-200/30 dark:border-neutral-800/30 w-full sm:w-auto">
                    <button
                        onClick={() => setActiveTab('cash')}
                        className={`flex-1 sm:flex-none px-3.5 sm:px-5 py-2 rounded-md text-[13px] font-black transition-all duration-200 text-center ${
                            activeTab === 'cash' 
                            ? 'bg-white dark:bg-neutral-850 text-accent-success dark:text-accent-success shadow-xs' 
                            : 'text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'
                        }`}
                    >
                        الخزائن النقدية (الكاش)
                    </button>
                    <button
                        onClick={() => setActiveTab('bank')}
                        className={`flex-1 sm:flex-none px-3.5 sm:px-5 py-2 rounded-md text-[13px] font-black transition-all duration-200 text-center ${
                            activeTab === 'bank' 
                            ? 'bg-white dark:bg-neutral-850 text-indigo-600 dark:text-indigo-400 shadow-xs' 
                            : 'text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'
                        }`}
                    >
                        الحسابات البنكية (المصارف)
                    </button>
                </div>

                {/* Quick Actions */}
                {!isViewer && (
                    <button 
                        onClick={() => {
                            if (activeTab === 'bank') {
                                setIsAddBankModalOpen(true);
                            } else {
                                setIsCashSafeExplainOpen(true);
                            }
                        }}
                        className={`flex items-center justify-center gap-2 text-xs sm:text-sm font-bold w-full sm:w-auto px-5 py-2.5 rounded-xl transition-all duration-200 cursor-pointer border-2 border-dashed ${
                            activeTab === 'bank'
                                ? 'border-indigo-300 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 dark:border-indigo-700/50 dark:bg-indigo-900/30 dark:text-indigo-400 dark:hover:bg-indigo-900/50'
                                : 'border-accent-success/20 bg-accent-success/10 text-accent-success hover:bg-accent-success/10 dark:border-accent-success/30 dark:bg-accent-success/20 dark:text-accent-success dark:hover:bg-accent-success/20'
                        }`}
                    >
                        <PlusIcon className="w-4 h-4 shrink-0" /> 
                        <span>{activeTab === 'bank' ? 'إضافة حساب بنكي جديد' : 'تأسيس خزنة كاش جديدة'}</span>
                    </button>
                )}
            </div>

            {/* Tab Content */}
            <div className="mt-6">
                {activeTab === 'cash' ? (
                    <div className="space-y-8">
                        {funds.length > 0 && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                {funds.map((fund, index) => (
                                    <StaggerItem key={fund.id} index={index}>
                                        <FundCard fund={fund} onViewDetails={onViewDetails} />
                                    </StaggerItem>
                                ))}
                            </div>
                        )}
                        
                        {funds.length === 0 && (
                            <div className="py-20 text-center bg-white dark:bg-neutral-900/20 rounded-[2rem] border-2 border-dashed border-neutral-200 dark:border-neutral-800">
                                <SafeIcon className="w-16 h-16 mx-auto text-neutral-300 dark:text-neutral-700 mb-4 opacity-50" />
                                <h3 className="text-lg font-bold text-neutral-500 dark:text-neutral-400">لا توجد خزائن نقدية نشطة</h3>
                                <p className="text-sm text-neutral-400 dark:text-neutral-500 mt-2">يتم إنشاء عهد الكاش تلقائياً بمجرد تفعيل عروة جديدة.</p>
                            </div>
                        )}

                        {/* Beautiful triggers for Consolidated General Cash Safe Ledger Modal */}
                        {funds.length > 0 && (
                            <div className="flex justify-center pt-4">
                                <button
                                    type="button"
                                    onClick={() => setIsLedgerOpen(true)}
                                    className="group flex items-center justify-between gap-4 w-full max-w-lg px-6 py-4 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-805 dark:hover:bg-neutral-750 text-neutral-800 dark:text-neutral-200 text-[13px] font-black rounded-2xl shadow-xs tap transition-all cursor-pointer border border-neutral-200/50 dark:border-neutral-800/60"
                                    id="toggle-statement-btn"
                                >
                                    <div className="flex items-center gap-3">
                                        <span className="text-lg shrink-0">📄</span>
                                        <span className="text-right">عرض كشف حركات الخزائن النقدي العام الموحد</span>
                                    </div>
                                    <ArrowLeftIcon className="w-4 h-4 text-neutral-500 group-hover:-translate-x-1 transition-transform shrink-0" />
                                </button>
                            </div>
                        )}

                        {/* Consolidated General Cash Safe Ledger Modal */}
                        {isLedgerOpen && (
                            <TreasuryReport 
                                onClose={() => setIsLedgerOpen(false)} 
                                totalLiquidity={totalLiquidity} 
                                totalCash={totalCash} 
                                totalBank={totalBank} 
                            />
                        )}
                    </div>
                ) : (
                    <div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                            {realBankAccounts.map((account, index) => (
                                <StaggerItem key={account.id} index={index}>
                                    <BankCard 
                                        account={account} 
                                        balance={getBankBalance(account.id)}
                                        onViewDetails={onViewBankDetails} 
                                    />
                                </StaggerItem>
                            ))}
                        </div>
                        {realBankAccounts.length === 0 && (
                            <div className="py-20 text-center bg-white dark:bg-neutral-900/20 rounded-[2rem] border-2 border-dashed border-neutral-200 dark:border-neutral-800">
                                <WalletIcon className="w-16 h-16 mx-auto text-neutral-300 dark:text-neutral-700 mb-4 opacity-50" />
                                <h3 className="text-lg font-bold text-neutral-500 dark:text-neutral-400">لا توجد حسابات بنكية</h3>
                                {!isViewer && (
                                <button 
                                    onClick={() => setIsAddBankModalOpen(true)}
                                    className="mt-4 px-4 py-2 border-2 border-dashed border-indigo-300 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 dark:border-indigo-700/50 dark:bg-indigo-900/30 dark:text-indigo-400 dark:hover:bg-indigo-900/50 rounded-xl font-bold transition-all"
                                >
                                    اضغط لإضافة أول حساب بنكي الآن
                                </button>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Custom Educational Cash Safe Explanation Info Modal */}
            <Modal 
                isOpen={isCashSafeExplainOpen} 
                onClose={() => setIsCashSafeExplainOpen(false)} 
                title="تأسيس وإدارة خزائن الكاش الرقمية"
            >
                <div className="space-y-4 text-right">
                    <div className="bg-accent-success/10 dark:bg-accent-success/20 p-4 rounded-xl border border-accent-success/20 dark:border-accent-success/30 flex items-start gap-3">
                        <InfoIcon className="w-6 h-6 text-accent-success dark:text-accent-success mt-1 shrink-0" />
                        <div>
                            <h4 className="font-black text-accent-success dark:text-accent-success">عروتك الزراعية هي محرك الخزائن</h4>
                            <p className="text-sm text-accent-success/85 dark:text-accent-success mt-1 leading-relaxed">
                                بدلاً من إدارة خزنة نقدية عشوائية، "المحاسب الزراعي" يطبق المعايير المحاسبية السليمة بحيث توجد **خزنة/عهدة مستقلة لكل عروة**.
                            </p>
                        </div>
                    </div>

                    <div className="space-y-3 pt-2 text-sm text-neutral-600 dark:text-neutral-300">
                        <p className="font-extrabold text-neutral-800 dark:text-neutral-200">آلية العمل بداخل النظام:</p>
                        <div className="space-y-2.5 pr-2">
                            <div className="flex gap-2">
                                <span className="text-accent-success font-black">١.</span>
                                <span>عند قيامك بإضافة عروة زراعية جديدة من صفحة العروات، يتم تأسيس صندوق كاش تلقائي يحمل نفس الاسم لتتبع التدفق المالي لتلك الأرض.</span>
                            </div>
                            <div className="flex gap-2">
                                <span className="text-accent-success font-black">٢.</span>
                                <span>كافة فواتير التوريد، والعمالة، والمشتريات والمسحوبات المصاحبة لتلك العروة تصب وتخصم من هذا الصندوق مباشرةً.</span>
                            </div>
                            <div className="flex gap-2">
                                <span className="text-accent-success font-black">٣.</span>
                                <span>بعد انتهاء العروة وحصادها، يُمكنك تسوية المتبقي وتوريد الفوائض لحسابك البنكي لإقفال الصندوق وعمل الأثر المزدوج في الحركات.</span>
                            </div>
                        </div>
                    </div>

                    <div className="pt-4 flex gap-2">
                        <button 
                            type="button" 
                            onClick={() => setIsCashSafeExplainOpen(false)} 
                            className="w-full py-3 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-850 dark:text-white rounded-xl font-black transition-colors"
                        >
                            فهمت ذلك
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Add Bank Modal */}
            <Modal isOpen={isAddBankModalOpen} onClose={() => setIsAddBankModalOpen(false)} title="إضافة حساب بنكي">
                <form onSubmit={handleAddBank} className="space-y-4">
                    <div>
                        <label className="block text-sm font-bold text-neutral-700 dark:text-neutral-300 mb-1">اسم البنك / الحساب</label>
                        <input 
                            type="text" 
                            required 
                            value={newBankName} 
                            onChange={e => setNewBankName(e.target.value)} 
                            className="w-full p-3 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                            placeholder="مثال: البنك الأهلي المصري - حساب المحصول"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-neutral-700 dark:text-neutral-300 mb-1">رصيد البداية (اختياري)</label>
                        <input 
                            type="number" 
                            value={newBankBalance} 
                            onChange={e => setNewBankBalance(e.target.value)} 
                            className="w-full p-3 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                            placeholder="0"
                        />
                    </div>
                    <div className="flex gap-3 pt-4">
                        <button type="button" onClick={() => setIsAddBankModalOpen(false)} className="flex-1 py-3 bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 rounded-xl font-bold hover:bg-neutral-205 dark:hover:bg-neutral-700 transition-colors">إلغاء</button>
                        <button type="submit" className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200 dark:shadow-none">حفظ الحساب</button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default TreasuryList;
