import React, { useMemo, useState } from 'react';
import { Expense } from '../../types';
import { formatNumber, formatDateShort, formatWeekdayShort } from '../../utils/helpers';
import { ChartPieIcon, CalendarIcon } from '../Icons';
import Modal from '../shared/Modal';
import { renderShiftBadge, renderEntryIcon } from './laborBadges';

interface ActivityAnalysisProps {
    laborExpenses: Expense[];
}

interface ActivityItemRecord {
    expense: Expense;
    allocatedAmount: number;
    totalActivities: number;
    allActivities: string[];
}

const ActivityAnalysis: React.FC<ActivityAnalysisProps> = ({ laborExpenses }) => {
    const [selectedActivity, setSelectedActivity] = useState<string | null>(null);

    const extractActivities = (description: string): string[] => {
        if (!description) return ['غير محدد'];

        let rawActivity = '';

        // 1. Check for "يومية بدون اسم" format
        if (description.includes('يومية بدون اسم')) {
            const dashMatch = description.match(/يومية بدون اسم\s*-\s*([^|]+)/);
            if (dashMatch) {
                rawActivity = dashMatch[1].replace(/\(يومية عمل.*?\)/, '').trim();
            } else {
                const parts = description.split('|').map(p => p.trim());
                const index = parts.findIndex(p => p.includes('يومية بدون اسم'));
                if (index !== -1 && index + 1 < parts.length) {
                    rawActivity = parts[index + 1].replace(/\(يومية عمل.*?\)/, '').trim();
                }
            }
        } else if (description.includes('عامل:')) {
            // 2. Check for "عامل:" format
            const singleMatch = description.match(/عامل:\s*[^|]+\s*\|\s*([^|]+)/);
            if (singleMatch) {
                rawActivity = singleMatch[1].replace(/\(يومية عمل.*?\)/, '').trim();
            }
        } else if (description.includes('منصرف عمالة:')) {
            // 3. Check for operational "منصرف عمالة:" format
            const opMatch = description.match(/منصرف عمالة:\s*([^|]+)/);
            if (opMatch) rawActivity = opMatch[1].trim();
        }

        if (!rawActivity) {
            rawActivity = 'غير محدد';
        }

        // Split multiple activities by +, ،, ,, /
        const split = rawActivity
            .split(/\s*(?:\+|\،|\,|\/)\s*/)
            .map(s => s.trim())
            .filter(Boolean);

        const unique = Array.from(new Set(split));
        return unique.length > 0 ? unique : ['غير محدد'];
    };

    const extractWorkerName = (description: string) => {
        if (!description) return 'عمالة يومية';
        if (description.includes('منصرف عمالة:')) return 'منصرف إضافي';

        const match = description.match(/(?:^|[\s|])عامل:\s*([^|\-]+)/);
        if (match) {
            const name = match[1].trim();
            if (name && name !== 'شخص بدون اسم' && name !== 'بدون اسم' && name !== 'يومية بدون اسم') {
                return name;
            }
        }
        return 'عمالة يومية';
    };

    const analysis = useMemo(() => {
        const data: Record<string, { total: number, count: number, items: ActivityItemRecord[] }> = {};
        
        laborExpenses.forEach(exp => {
            const activities = extractActivities(exp.description);
            const countActivities = Math.max(1, activities.length);
            const allocatedAmount = exp.amount / countActivities;

            activities.forEach(act => {
                const cleanAct = act.trim();
                if (!cleanAct) return;

                if (!data[cleanAct]) {
                    data[cleanAct] = { total: 0, count: 0, items: [] };
                }
                data[cleanAct].total += allocatedAmount;
                data[cleanAct].count += 1;
                data[cleanAct].items.push({
                    expense: exp,
                    allocatedAmount,
                    totalActivities: countActivities,
                    allActivities: activities
                });
            });
        });

        return Object.entries(data).sort((a, b) => b[1].total - a[1].total);
    }, [laborExpenses]);

    if (analysis.length === 0) {
        return (
            <div className="bg-white dark:bg-neutral-800 rounded-3xl p-12 text-center border border-neutral-200 dark:border-neutral-700 shadow-sm animate-fade-in">
                <ChartPieIcon className="w-12 h-12 text-neutral-300 dark:text-neutral-600 mx-auto mb-4" />
                <h3 className="text-xl font-black text-neutral-800 dark:text-neutral-0 mb-2">لا توجد بيانات للتحليل</h3>
                <p className="text-sm font-bold text-neutral-500">سجل بعض اليوميات ليظهر تحليل الأنشطة هنا.</p>
            </div>
        );
    }

    const totalAll = analysis.reduce((sum, [_, stat]) => sum + stat.total, 0);

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-fade-in">
                {analysis.map(([activity, stat], idx) => {
                    const percentage = totalAll > 0 ? (stat.total / totalAll) * 100 : 0;
                    
                    return (
                        <div 
                            key={idx} 
                            onClick={() => setSelectedActivity(activity)}
                            className="bg-white dark:bg-neutral-800 p-5 rounded-2xl border border-neutral-200 dark:border-neutral-700 shadow-sm flex flex-col gap-3 relative overflow-hidden group transition-all hover:shadow-md cursor-pointer tap"
                        >
                            <div className="flex items-center justify-between relative z-10">
                                <h4 className="text-sm font-black text-neutral-800 dark:text-neutral-0">{activity}</h4>
                                <span className="text-2xs font-black px-2 py-0.5 rounded-lg bg-accent-warning/10 dark:bg-accent-warning/20 text-accent-warning">
                                    {Math.round(percentage)}%
                                </span>
                            </div>

                            <div className="flex items-center gap-1 relative z-10">
                                <span className="text-2xs font-bold text-neutral-400 select-none">ج.م</span>
                                <span dir="ltr" className="text-xl font-black text-neutral-800 dark:text-neutral-0 tabular-nums font-mono">{formatNumber(Math.round(stat.total))}</span>
                            </div>

                            <div className="flex items-center justify-between relative z-10">
                                <span className="text-2xs font-bold text-neutral-500">{stat.count} حركات مسجلة</span>
                                <span className="text-2xs font-black text-accent-warning opacity-0 group-hover:opacity-100 transition-opacity">عرض التقرير ←</span>
                            </div>

                            {/* Progress bar background */}
                            <div className="absolute bottom-0 left-0 h-1 bg-accent-warning/10 w-full">
                                <div 
                                    className="h-full bg-accent-warning transition-all duration-1000 ease-out" 
                                    style={{ width: `${percentage}%` }}
                                ></div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Activity Detailed Report Modal */}
            <Modal 
                isOpen={!!selectedActivity} 
                onClose={() => setSelectedActivity(null)} 
                title={`تقرير نشاط: ${selectedActivity}`}
                size="md"
            >
                {selectedActivity && (
                    <div className="space-y-4">
                        {/* Summary Card at the top of report */}
                        <div className="bg-accent-warning text-white p-5 rounded-2xl shadow-lg shadow-amber-500/20 flex items-center justify-between">
                            <div>
                                <span className="text-2xs font-black uppercase tracking-widest opacity-80">إجمالي تكلفة النشاط</span>
                                <div className="flex items-center gap-1 mt-0.5">
                                    <span className="text-2xs font-bold opacity-80 select-none">ج.م</span>
                                    <span dir="ltr" className="text-2xl font-black tabular-nums font-mono">
                                        {formatNumber(Math.round(analysis.find(a => a[0] === selectedActivity)?.[1].total || 0))}
                                    </span>
                                </div>
                            </div>
                            <div className="p-3 bg-white/20 rounded-xl">
                                <ChartPieIcon className="w-6 h-6" />
                            </div>
                        </div>

                        {/* List of details */}
                        <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
                            {analysis.find(a => a[0] === selectedActivity)?.[1].items
                                .sort((a, b) => new Date(b.expense.date).getTime() - new Date(a.expense.date).getTime())
                                .map((item, itemIdx) => {
                                    const exp = item.expense;
                                    return (
                                        <div key={exp.id || itemIdx} className="bg-white dark:bg-neutral-800 p-3 rounded-xl border border-neutral-100 dark:border-neutral-700 shadow-xs flex items-center justify-between transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-900/50">
                                            <div className="flex items-center gap-3">
                                                <div className="flex flex-col items-center justify-center bg-neutral-100 dark:bg-neutral-900 w-11 h-11 rounded-lg shrink-0">
                                                    <span className="text-2xs font-black text-neutral-800 dark:text-neutral-0 leading-none">
                                                        {formatDateShort(exp.date)}
                                                    </span>
                                                    <span className="text-2xs font-bold text-neutral-400 mt-0.5">
                                                        {formatWeekdayShort(exp.date)}
                                                    </span>
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-1.5 flex-wrap">
                                                        {renderEntryIcon(extractWorkerName(exp.description), selectedActivity, exp.description)}
                                                        <span className="text-xs font-black text-neutral-800 dark:text-neutral-0">{extractWorkerName(exp.description)}</span>
                                                        <div className="shrink-0 mr-1">
                                                            {renderShiftBadge(exp.shift_type)}
                                                        </div>
                                                    </div>
                                                    
                                                    {/* Multi-activity indicator */}
                                                    {item.totalActivities > 1 && (
                                                        <div className="mt-1 flex items-center gap-1">
                                                            <span className="text-2xs font-bold px-1.5 py-0.5 rounded bg-accent-warning/10 dark:bg-accent-warning/20 text-accent-warning dark:text-accent-warning">
                                                                مشترك مع: {item.allActivities.filter(a => a !== selectedActivity).join(' + ')}
                                                            </span>
                                                        </div>
                                                    )}

                                                    <div className="flex items-center gap-1 mt-0.5 opacity-60">
                                                        <CalendarIcon className="w-2.5 h-2.5" />
                                                        <span className="text-2xs font-bold">{exp.date}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="text-left shrink-0">
                                                <div className="flex items-center gap-1 justify-end">
                                                    <span className="text-2xs font-bold text-neutral-400 select-none">ج.م</span>
                                                    <span dir="ltr" className="text-sm font-black text-accent-warning tabular-nums font-mono">
                                                        {formatNumber(Math.round(item.allocatedAmount))}
                                                    </span>
                                                </div>
                                                {item.totalActivities > 1 && (
                                                    <div className="text-[8.5px] font-bold text-neutral-400 text-left">
                                                        من أصل {formatNumber(Math.round(exp.amount))}
                                                    </div>
                                                )}
                                                <div className={`text-2xs font-black px-1.5 py-0.5 rounded mt-1 inline-block ${exp.payment_method === 'cash' ? 'bg-accent-success/10 text-accent-success dark:bg-accent-success/20 dark:text-accent-success' : 'bg-accent-danger/10 text-accent-danger dark:bg-accent-danger/20 dark:text-accent-danger'}`}>
                                                    {exp.payment_method === 'cash' ? 'نقداً' : 'آجل'}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                        </div>

                        <button 
                            onClick={() => setSelectedActivity(null)}
                            className="w-full py-3 bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-700 dark:text-neutral-200 rounded-xl text-sm font-bold transition-all mt-2 cursor-pointer"
                        >
                            إغلاق التقرير
                        </button>
                    </div>
                )}
            </Modal>
        </div>
    );
};

export default ActivityAnalysis;
