import React, { useMemo } from 'react';
import { useData } from '../../contexts/DataContext';
import { UsersIcon, WalletIcon, TrendingUpIcon, ChartPieIcon } from '../Icons';
import { formatNumber } from '../../utils/helpers';
import type { Cycle } from '../../types';

const CycleLaborTab: React.FC<{ cycle: Cycle }> = ({ cycle }) => {
    const { rawExpenses: hydratedExpenses, isExternalLabor } = useData();

    // 1. Filter by cycle (strictly includes only actual wage & operational daily records, excluding advances and settlements)
    const filteredLabor = useMemo(() => {
        return hydratedExpenses.filter(e => e.cycle_id === cycle.id && e.isWageWork && !isExternalLabor(e));
    }, [hydratedExpenses, cycle.id, isExternalLabor]);

    // Calculate Dashboard Stats
    const stats = useMemo(() => {
        let totalLaborCost = 0;
        let totalWorkersCount = 0;

        filteredLabor.forEach(exp => {
            totalLaborCost += exp.amount;

            // Extract worker count using simple regex mapping
            const countMatch = exp.description?.match(/عدد العمال:\s*(\d+)/);
            if (countMatch && countMatch[1]) {
                totalWorkersCount += parseInt(countMatch[1], 10);
            } else if (exp.description?.includes('عامل:')) {
                totalWorkersCount += 1;
            } else {
                totalWorkersCount += 1; // Fallback
            }
        });

        // The farmer's share comes from cycle calculations
        const grossFarmerShare = cycle.farmerShare || 0;
        const netProfit = grossFarmerShare - totalLaborCost;
        
        return { totalLaborCost, totalWorkersCount, grossFarmerShare, netProfit };
    }, [filteredLabor, cycle.farmerShare]);

    return (
        <div className="space-y-6 animate-fade-in pb-12 mt-6">
            <div className="flex items-center gap-3 mb-6">
                <div className="p-2.5 bg-amber-500/10 text-amber-600 rounded-xl">
                    <ChartPieIcon className="w-5 h-5" />
                </div>
                <div>
                    <h3 className="font-black text-neutral-800 dark:text-neutral-100 text-lg">تقرير الدخل والعمالة</h3>
                    <p className="text-xs font-bold text-neutral-500 dark:text-neutral-400">ملخص حسابات العمالة والتكاليف</p>
                </div>
            </div>

            <div className={`grid grid-cols-1 ${cycle.responsible_farmer_id ? 'md:grid-cols-3' : 'md:grid-cols-2'} gap-4`}>
                {/* 1. Gross Farmer Share */}
                {cycle.responsible_farmer_id && (
                <div className="bg-emerald-50 dark:bg-emerald-500/10 rounded-2xl p-5 border border-emerald-200 dark:border-emerald-800/30">
                    <div className="flex justify-between items-start mb-3">
                        <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 rounded-lg">
                            <TrendingUpIcon className="w-5 h-5" />
                        </div>
                        <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/50 px-2 py-1 rounded-full">نسبة المزارع</span>
                    </div>
                    <div>
                        <p className="text-xs font-bold text-emerald-700 dark:text-emerald-300 mb-1">إجمالي المستحق لك</p>
                        <div className="flex items-baseline gap-1">
                            <span className="text-3xl font-black text-emerald-600 dark:text-emerald-400 tabular-nums">
                                {formatNumber(stats.grossFarmerShare)}
                            </span>
                            <span className="text-xs font-bold text-emerald-500">ج.م</span>
                        </div>
                    </div>
                </div>
                )}

                {/* 2. Total Labor Cost */}
                <div className="bg-rose-50 dark:bg-rose-500/10 rounded-2xl p-5 border border-rose-200 dark:border-rose-800/30">
                    <div className="flex justify-between items-start mb-3">
                        <div className="p-2 bg-rose-100 dark:bg-rose-900/30 text-rose-600 rounded-lg">
                            <UsersIcon className="w-5 h-5" />
                        </div>
                        <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 bg-rose-100 dark:bg-rose-900/50 px-2 py-1 rounded-full">الخصومات</span>
                    </div>
                    <div>
                        <p className="text-xs font-bold text-rose-700 dark:text-rose-300 mb-1">إجمالي ما تم صرفه للعمالة</p>
                        <div className="flex items-baseline gap-1">
                            <span className="text-3xl font-black text-rose-600 dark:text-rose-400 tabular-nums">
                                {formatNumber(stats.totalLaborCost)}
                            </span>
                            <span className="text-xs font-bold text-rose-500">ج.م</span>
                        </div>
                        <p className="text-[10px] font-bold text-rose-500/80 mt-1">بإجمالي {stats.totalWorkersCount} يومية</p>
                    </div>
                </div>

                {/* 3. Net Profit */}
                {cycle.responsible_farmer_id && (
                <div className="relative bg-gradient-to-br from-indigo-500 to-indigo-700 rounded-2xl p-5 shadow-xl shadow-indigo-500/20 overflow-hidden text-white">
                    <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/10 rounded-full blur-2xl pointer-events-none"></div>
                    <div className="relative z-10">
                        <div className="flex justify-between items-start mb-3">
                            <div className="p-2 bg-white/20 backdrop-blur-sm text-white rounded-lg">
                                <WalletIcon className="w-5 h-5" />
                            </div>
                            <span className="text-[10px] items-center flex font-bold text-indigo-100 bg-black/20 px-2 py-1 rounded-full">
                                صافي الربح
                            </span>
                        </div>
                        <div>
                            <p className="text-xs font-bold text-indigo-100 mb-1">الربح الصافي النهائي لك</p>
                            <div className="flex items-baseline gap-1">
                                <span className="text-4xl font-black text-white tabular-nums tracking-tight">
                                    {formatNumber(stats.netProfit)}
                                </span>
                                <span className="text-xs font-bold text-indigo-200">ج.م</span>
                            </div>
                        </div>
                    </div>
                </div>
                )}
            </div>

            {/* Read Only Labor List */}
            {filteredLabor.length > 0 && (
                <div className="mt-8">
                    <h4 className="text-sm font-black text-neutral-800 dark:text-neutral-100 mb-4 pb-2 border-b border-neutral-200 dark:border-neutral-800">
                        سجل يوميات العمالة المخصومة
                    </h4>
                    <div className="space-y-3">
                        {filteredLabor.map(exp => (
                            <div key={exp.id} className="flex justify-between items-center bg-white dark:bg-neutral-800/50 p-4 rounded-xl border border-neutral-200 dark:border-neutral-700/50">
                                <div>
                                    <p className="font-bold text-sm text-neutral-800 dark:text-neutral-100">{exp.description || 'يومية عمال'}</p>
                                    <p className="text-xs text-neutral-500 mt-1">{exp.date}</p>
                                </div>
                                <div className="text-right">
                                    <span className="font-black text-rose-600 dark:text-rose-400">{formatNumber(exp.amount)} ج.م</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default CycleLaborTab;
