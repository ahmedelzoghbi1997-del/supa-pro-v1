import React, { useMemo } from 'react';
import type { Expense } from '../../types';
import { formatNumber } from '../../utils/helpers';
import { ChartBarIcon, CalendarIcon, UsersIcon } from '../Icons';

interface LaborDashboardProps {
    laborExpenses: Expense[];
    totalCost: number;
}

const LaborDashboard: React.FC<LaborDashboardProps> = ({ laborExpenses, totalCost }) => {
    // Group by Activity (extracted from description using convention "Type: Activity" or similar)
    // For now, let's group by typical keywords
    const activityBreakdown = useMemo(() => {
        const breakdown: Record<string, number> = {
            'حصاد وجمع': 0,
            'تعبئة وتغليف': 0,
            'صيانة وتجهيز': 0,
            'أخرى (يومية عامة)': 0
        };

        laborExpenses.forEach(exp => {
            const desc = exp.description || '';
            const amount = exp.amount;
            if (desc.includes('حصاد') || desc.includes('جمع')) breakdown['حصاد وجمع'] += amount;
            else if (desc.includes('تعبئة') || desc.includes('تغليف') || desc.includes('كرتون')) breakdown['تعبئة وتغليف'] += amount;
            else if (desc.includes('صيانة') || desc.includes('تجهيز') || desc.includes('رش') || desc.includes('زرع') || desc.includes('شتلات')) breakdown['صيانة وتجهيز'] += amount;
            else breakdown['أخرى (يومية عامة)'] += amount;
        });

        // Calculate percentages
        return Object.entries(breakdown)
            .filter(([, amount]) => amount > 0)
            .map(([activity, amount]) => ({
                activity,
                amount,
                percentage: totalCost > 0 ? (amount / totalCost) * 100 : 0
            }))
            .sort((a, b) => b.amount - a.amount);
    }, [laborExpenses, totalCost]);

    const uniqueDays = new Set(laborExpenses.map(e => e.date)).size;
    const avgDailyRate = uniqueDays > 0 ? totalCost / uniqueDays : 0;

    return (
        <div className="space-y-6 animate-fade-in">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                {/* Hero Card: Total Labor Cost */}
                <div className="bg-neutral-950 dark:bg-black p-6 rounded-2xl border border-neutral-800 text-white relative overflow-hidden">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-2.5 bg-neutral-800 text-neutral-200 rounded-xl">
                            <UsersIcon className="w-5 h-5" />
                        </div>
                    </div>
                    <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-1">إجمالي تكلفة العمالة</p>
                    <div className="flex items-baseline gap-1.5">
                        <span className="text-xs font-medium text-neutral-400 select-none">ج.م</span>
                        <h3 dir="ltr" className="text-3xl sm:text-4xl font-bold text-white tracking-tight tabular-nums font-mono">
                            {formatNumber(totalCost)}
                        </h3>
                    </div>
                </div>

                {/* Secondary Card: Average Daily Rate */}
                <div className="bg-white dark:bg-neutral-900 p-6 rounded-2xl border border-neutral-200 dark:border-neutral-800">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-2.5 bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 rounded-xl">
                            <CalendarIcon className="w-5 h-5" />
                        </div>
                    </div>
                    <p className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-1">متوسط الصرف اليومي</p>
                    <div className="flex items-baseline gap-1.5">
                        <span className="text-xs font-medium text-neutral-400 select-none">ج.م / يوم</span>
                        <h3 dir="ltr" className="text-3xl sm:text-4xl font-bold text-neutral-900 dark:text-neutral-100 tracking-tight tabular-nums font-mono">
                            {formatNumber(Math.round(avgDailyRate))}
                        </h3>
                    </div>
                </div>

                {/* Secondary Card: Days Worked */}
                <div className="bg-white dark:bg-neutral-900 p-6 rounded-2xl border border-neutral-200 dark:border-neutral-800">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-2.5 bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 rounded-xl">
                            <ChartBarIcon className="w-5 h-5" />
                        </div>
                    </div>
                    <p className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-1">عدد أيام العمل المسجلة</p>
                    <div className="flex items-baseline gap-2">
                        <h3 dir="ltr" className="text-3xl sm:text-4xl font-bold text-neutral-900 dark:text-neutral-100 tracking-tight tabular-nums font-mono">
                            {uniqueDays}
                        </h3>
                        <span className="text-xs font-medium text-neutral-400">يوم تشغيل</span>
                    </div>
                </div>
            </div>

            {/* Activity Breakdown */}
            <div className="bg-white dark:bg-neutral-900 p-6 sm:p-7 rounded-2xl border border-neutral-200 dark:border-neutral-800">
                <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100 mb-6 flex items-center gap-2">
                    <ChartBarIcon className="w-4 h-4 text-neutral-500" />
                    تحليل التكلفة حسب النشاط
                </h3>
                
                {activityBreakdown.length > 0 ? (
                    <div className="space-y-5 w-full">
                        {activityBreakdown.map((item, idx) => (
                            <div key={idx} className="space-y-1.5">
                                <div className="flex justify-between items-center">
                                    <p className="text-sm font-medium text-neutral-800 dark:text-neutral-200">{item.activity}</p>
                                    <div className="flex items-center gap-3">
                                        <span className="text-xs font-mono text-neutral-500 dark:text-neutral-400">
                                            {item.percentage.toFixed(1)}%
                                        </span>
                                        <p className="text-sm font-bold text-neutral-900 dark:text-neutral-100 tabular-nums inline-flex items-center gap-1 font-mono">
                                            <span dir="ltr">{formatNumber(item.amount)}</span>
                                            <span className="text-[11px] font-normal text-neutral-400 font-sans select-none">ج.م</span>
                                        </p>
                                    </div>
                                </div>
                                <div className="h-1.5 w-full bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
                                    <div 
                                        className={`h-full rounded-full transition-all duration-700 ${
                                            idx === 0 ? 'bg-neutral-900 dark:bg-neutral-100' : 
                                            idx === 1 ? 'bg-neutral-600 dark:bg-neutral-400' : 
                                            idx === 2 ? 'bg-neutral-400 dark:bg-neutral-600' : 'bg-neutral-300 dark:bg-neutral-700'
                                        }`}
                                        style={{ width: `${item.percentage}%` }}
                                    ></div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-8">
                        <p className="text-neutral-400 dark:text-neutral-500 text-sm font-medium">لا توجد بيانات كافية للتحليل بعد.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default LaborDashboard;
