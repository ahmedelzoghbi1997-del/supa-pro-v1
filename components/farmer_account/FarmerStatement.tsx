import InlineLoading from "../shared/InlineLoading";
import React, { useMemo } from 'react';
import { useData } from '../../contexts/DataContext';
import { formatCurrency } from '../../utils/helpers';
import type { FarmerWithdrawal } from '../../types';
import { PencilIcon, TrashIcon, TrendingDownIcon, WalletIcon, CalendarIcon, ClipboardDocumentIcon } from '../Icons';

interface FarmerStatementProps {
    farmerId: string;
    onEdit?: (withdrawal: FarmerWithdrawal) => void;
    onDelete?: (id: string) => void;
}

const WithdrawalItem: React.FC<{ 
    withdrawal: FarmerWithdrawal; 
    onEdit?: (w: FarmerWithdrawal) => void; 
    onDelete?: (id: string) => void;
    isHighlighted?: boolean;
}> = ({ withdrawal, onEdit, onDelete, isHighlighted }) => (
    <div className={`group bg-white dark:bg-neutral-800/40 border border-neutral-200 dark:border-neutral-700/50 px-4 py-2.5 rounded-xl flex items-center justify-between gap-3 hover:shadow-sm hover:border-primary/30 transition-all ${isHighlighted ? 'animate-highlight' : ''}`}>
        <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-rose-50 dark:bg-rose-900/20 flex items-center justify-center text-rose-600 dark:text-rose-400 shrink-0">
                <TrendingDownIcon className="w-4 h-4" />
            </div>
            <div className="min-w-0">
                <h4 className="font-bold text-xs text-neutral-800 dark:text-neutral-100 truncate">{withdrawal.description || 'سحب نقدي'}</h4>
                <div className="flex items-center gap-2 mt-0.5 text-[10px] text-neutral-500 dark:text-neutral-400 font-bold">
                    <div className="flex items-center gap-1">
                        <CalendarIcon className="w-3 h-3 opacity-70" />
                        <span>{withdrawal.date}</span>
                    </div>
                    {withdrawal.cycle && (
                        <span className="text-primary/70 border-r border-neutral-200 dark:border-neutral-700 pr-2 mr-0">{withdrawal.cycle}</span>
                    )}
                </div>
            </div>
        </div>
        
        <div className="flex items-center gap-4 shrink-0">
            <div className="text-left">
                <p className="text-sm font-black text-rose-600 dark:text-rose-400 tracking-tight">
                    {formatCurrency(withdrawal.amount).replace('EGP', '')}
                    <span className="text-[9px] mr-0.5 font-bold opacity-70">ج.م</span>
                </p>
            </div>
            
            {(onEdit || onDelete) && (
                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    {onEdit && (
                        <button onClick={() => onEdit(withdrawal)} className="p-1.5 text-neutral-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors">
                            <PencilIcon className="w-3.5 h-3.5" />
                        </button>
                    )}
                    {onDelete && (
                        <button onClick={() => onDelete(withdrawal.id)} className="p-1.5 text-neutral-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg transition-colors">
                            <TrashIcon className="w-3.5 h-3.5" />
                        </button>
                    )}
                </div>
            )}
        </div>
    </div>
);

const FarmerStatement: React.FC<FarmerStatementProps> = ({ farmerId, onEdit, onDelete }) => {
    const { farmers, cyclesWithCalculations, farmerWithdrawals, profile, highlightedItemId, isPhase2Loading } = useData();
    
    const farmer = useMemo(() => farmers.find(f => f.id === farmerId), [farmers, farmerId]);
    const isViewer = profile?.role === 'viewer';

    const activeCycleIds = useMemo(() => new Set(cyclesWithCalculations.filter(c => c.status === 'active').map(c => c.id)), [cyclesWithCalculations]);
    const hasActiveAssignedCycle = useMemo(() => cyclesWithCalculations.some(c => (c.responsible_farmer_id === farmerId || c.responsibleFarmer === farmer?.name) && c.status === 'active'), [cyclesWithCalculations, farmerId, farmer?.name]);

    const totalEarnedShares = useMemo(() => {
        if (!farmer) return 0;
        return cyclesWithCalculations
            .filter(c => (c.responsible_farmer_id === farmer.id || c.responsibleFarmer === farmer.name) && (hasActiveAssignedCycle ? c.status === 'active' : true))
            .reduce((sum, c) => sum + (c.farmerShare || 0), 0);
    }, [farmer, cyclesWithCalculations, hasActiveAssignedCycle]);

    const withdrawals = useMemo(() => {
        if (!farmerId) return [];
        return farmerWithdrawals
            .filter(w => w.farmer_id === farmerId && (hasActiveAssignedCycle ? activeCycleIds.has(w.cycle_id) : true))
            .sort((a, b) => {
                const dateB = new Date(b.date).getTime();
                const dateA = new Date(a.date).getTime();
                if (dateB !== dateA) return dateB - dateA;
                return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
            });
    }, [farmerId, farmerWithdrawals, hasActiveAssignedCycle, activeCycleIds]);

    const totalWithdrawals = useMemo(() => 
        withdrawals.reduce((sum, w) => sum + (parseFloat(String(w.amount)) || 0), 0)
    , [withdrawals]);

    const finalBalance = totalEarnedShares - totalWithdrawals;

    if (!farmer) {
        if (isPhase2Loading) {
            return (
                <div className="p-12 text-center space-y-4">
                    <InlineLoading message="جاري تحميل كشف حساب المزارع..." />
                    <p className="text-neutral-500 font-bold">جاري تحضير بيانات المزارع...</p>
                </div>
            );
        }
        return <div className="p-12 text-center text-neutral-500 font-bold">لم يتم العثور على بيانات المزارع.</div>;
    }

    return (
        <div className="max-h-[80vh] overflow-y-auto px-1">
            <div className="space-y-6 pb-6">
                
                <div className="flex flex-col lg:flex-row gap-3">
                    <div className="flex-1 relative bg-primary rounded-2xl p-6 text-white shadow-lg shadow-primary/10 overflow-hidden group border border-white/10">
                        <div className="relative z-10">
                            <div className="flex items-center gap-1.5 opacity-80 mb-1">
                                <WalletIcon className="w-4 h-4" />
                                <span className="text-[10px] font-black uppercase tracking-widest">الرصيد الصافي المتاح</span>
                            </div>
                            <div className="flex items-baseline gap-1.5">
                                <h2 className="text-3xl font-black tracking-tighter tabular-nums">
                                    {formatCurrency(finalBalance).replace('EGP', '')}
                                </h2>
                                <span className="text-xs font-bold opacity-70">جنيه</span>
                            </div>
                            
                            <div className="mt-4 flex gap-6 text-[11px] font-bold border-t border-white/10 pt-3">
                                <div className="flex items-center gap-1.5">
                                    <span className="opacity-60">المستحقات:</span>
                                    <span>{formatCurrency(totalEarnedShares).replace('EGP', '')}</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <span className="opacity-60">المسحوبات:</span>
                                    <span className="text-rose-100">{formatCurrency(totalWithdrawals).replace('EGP', '')}</span>
                                </div>
                            </div>
                        </div>
                        <div className="absolute -bottom-6 -left-6 w-24 h-24 bg-white/5 rounded-full blur-2xl"></div>
                    </div>

                    <div className="lg:w-72 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-2xl p-4 flex flex-col justify-center">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-neutral-100 dark:bg-neutral-700 flex items-center justify-center text-primary font-black text-sm shrink-0 border border-neutral-200/50 dark:border-neutral-600/50">
                                {farmer.name.charAt(0)}
                            </div>
                            <div className="min-w-0">
                                <h3 className="font-black text-sm text-neutral-800 dark:text-neutral-100 truncate">{farmer.name}</h3>
                                <p className="text-[10px] text-neutral-500 font-bold uppercase tracking-tight">سجل المعاملات النشط</p>
                            </div>
                        </div>
                        <div className="mt-3 flex justify-between items-center bg-neutral-50 dark:bg-neutral-900/50 p-2 rounded-xl text-[10px]">
                            <span className="text-neutral-500 font-bold">عدد العمليات:</span>
                            <span className="font-black text-primary bg-primary/10 px-2 py-0.5 rounded-md">{withdrawals.length} عملية</span>
                        </div>
                    </div>
                </div>

                <div className="space-y-3">
                    <div className="flex items-center justify-between px-1">
                        <div className="flex items-center gap-2 border-r-4 border-rose-500 pr-2">
                            <h3 className="font-black text-neutral-800 dark:text-white text-sm uppercase tracking-wider">سجل المسحوبات النقدية</h3>
                        </div>
                        <div className="text-[9px] font-black text-neutral-400 uppercase bg-neutral-100 dark:bg-neutral-800 px-2.5 py-1 rounded-lg">
                            التاريخ
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-2">
                        {withdrawals.length > 0 ? (
                            withdrawals.map((w) => {
                                const isSelectedForHighlight = highlightedItemId != null && (String(highlightedItemId) === String(w.id) || String(highlightedItemId) === String((w as any)._stable_id));
                                return (
                                    <WithdrawalItem 
                                        key={w.id} 
                                        withdrawal={w} 
                                        onEdit={isViewer ? undefined as any : onEdit} 
                                        onDelete={isViewer ? undefined as any : onDelete} 
                                        isHighlighted={isSelectedForHighlight}
                                    />
                                );
                            })
                        ) : (
                            <div className="text-center py-12 bg-neutral-50 dark:bg-neutral-900/30 border-2 border-dashed border-neutral-200 dark:border-neutral-800 rounded-2xl">
                                <ClipboardDocumentIcon className="w-12 h-12 mx-auto text-neutral-200 dark:text-neutral-700 mb-2 opacity-50" />
                                <p className="text-neutral-400 text-xs font-bold">لا توجد أي مسحوبات مسجلة لهذا المزارع.</p>
                            </div>
                        )}
                    </div>
                </div>

                <div className="bg-blue-50 dark:bg-blue-900/10 p-3 rounded-xl border border-blue-100 dark:border-blue-900/30 flex items-start gap-3">
                    <div className="w-1 h-6 bg-blue-500 rounded-full shrink-0"></div>
                    <p className="text-[10px] text-blue-800 dark:text-blue-300 leading-normal font-semibold">
                        ملاحظة: "إجمالي المستحقات" يتم تحديثه لحظياً بناءً على فواتير المبيعات المسجلة في كافة العروات المسندة للمزارع.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default FarmerStatement;