
import React, { useMemo } from 'react';
import type { Cycle } from '../../types';
import { UserIcon, CalendarIcon, ClipboardIcon, TrendingUpIcon } from '../Icons';
import { formatCurrency } from '../../utils/helpers';
import { useData } from '../../contexts/DataContext';
import { useSettings, terminology } from '../../contexts/SettingsContext';

const StatMiniCard = ({ label, value, icon: Icon, gradientClass, shadowClass }: { label: string, value: number, icon: React.ElementType, gradientClass: string, shadowClass: string }) => (
    <div className={`relative overflow-hidden p-2 sm:p-2.5 rounded-xl text-white ${gradientClass} ${shadowClass}`}>
        {/* Decorative background element */}
        <div className="absolute -left-4 -bottom-4 w-12 h-12 bg-white/10 rounded-full blur-xl"></div>
        <div className="absolute -right-3 -top-3 w-8 h-8 bg-white/10 rounded-full blur-lg"></div>
        
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-0">
            <div className="min-w-0 order-2 sm:order-1">
                <p className="text-2xs sm:text-2xs font-bold text-white/80 uppercase tracking-wider mb-0.5 truncate">{label}</p>
                <p className="text-sm sm:text-base lg:text-lg font-black tracking-tight truncate">
                    {formatCurrency(value).replace('EGP', '')}
                    <span className="text-2xs sm:text-2xs mr-1 font-bold opacity-80">ج.م</span>
                </p>
            </div>
            <div className="p-1 sm:p-1.5 rounded-lg bg-white/20 backdrop-blur-sm shrink-0 self-start sm:self-auto order-1 sm:order-2">
                <Icon className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
            </div>
        </div>
    </div>
);

const FarmerAccountTab: React.FC<{ 
    cycle: Cycle; 
}> = ({ cycle }) => {
    const { farmers, farmerWithdrawals } = useData();
    const { settings } = useSettings();
    const term = terminology[settings.primaryTerm];

    const farmer = farmers.find(f => f.id === cycle.responsible_farmer_id);
    const farmerShare = cycle.farmerShare || 0;
    
    const cycleWithdrawals = useMemo(() => farmerWithdrawals
        .filter(w => w.cycle_id === cycle.id && w.farmer_id === cycle.responsible_farmer_id)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
        [farmerWithdrawals, cycle.id, cycle.responsible_farmer_id]);

    if (!farmer) {
        return (
            <div className="text-center py-20 mt-6 bg-neutral-50 dark:bg-neutral-800/20 rounded-3xl border-2 border-dashed border-neutral-200 dark:border-neutral-800">
                <UserIcon className="w-16 h-16 mx-auto text-neutral-300 mb-4" />
                <p className="text-neutral-500 font-bold">لم يتم تعيين مزارع مسؤول لهذه {term.singular} بعد.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 mt-6 pb-12 animate-page-enter">
            {/* Quick Stats Grid */}
            <div className="grid grid-cols-1 gap-4">
                <StatMiniCard 
                    label="إجمالي مستحقاته" 
                    value={farmerShare} 
                    icon={TrendingUpIcon} 
                    gradientClass="bg-gradient-to-br from-emerald-500 to-emerald-700"
                    shadowClass="shadow-lg shadow-emerald-500/30"
                />
            </div>

            {/* List Header */}
            <div className="flex justify-between items-center pt-2">
                <h3 className="font-black text-neutral-800 dark:text-white uppercase tracking-wider text-sm flex items-center gap-2">
                    <ClipboardIcon className="w-4 h-4 text-primary" />
                    سجل المعاملات النقدية ({cycleWithdrawals.length})
                </h3>
            </div>
            
            {/* List of Rows */}
            <div className="relative border-r-2 border-neutral-200 dark:border-neutral-700/50 pr-6 space-y-6 mt-6">
                {cycleWithdrawals.length > 0 ? (
                    cycleWithdrawals.map((w, idx) => (
                        <div key={w.id} className="relative animate-stagger-in" style={{ animationDelay: `${Math.min(idx * 30, 600)}ms` }}>
                            {/* Timeline Dot */}
                            <div className="absolute -right-[31px] top-1.5 w-4 h-4 rounded-full border-4 border-white dark:border-neutral-900 bg-accent-danger shadow-sm z-10"></div>
                            
                            <div className="bg-white dark:bg-neutral-800 rounded-2xl p-4 shadow-sm border border-neutral-100 dark:border-neutral-700/50 hover:shadow-md hover:border-primary/30 transition-all">
                                <div className="flex justify-between items-start mb-3">
                                    <div>
                                        <h4 className="font-bold text-neutral-800 dark:text-white text-sm sm:text-base">{w.description || 'سحب نقدي'}</h4>
                                        <div className="flex items-center gap-1.5 mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                                            <CalendarIcon className="w-3.5 h-3.5 opacity-60" />
                                            <span>{w.date}</span>
                                        </div>
                                    </div>
                                    <div className="text-left shrink-0">
                                        <p className="text-lg sm:text-xl font-black text-accent-danger tracking-tight tabular-nums">
                                            {formatCurrency(w.amount).replace('EGP', '')}
                                            <span className="text-2xs font-bold ml-1 opacity-70">ج.م</span>
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="flex flex-col items-center justify-center py-12 text-center bg-neutral-50 dark:bg-neutral-800/20 rounded-2xl border border-dashed border-neutral-200 dark:border-neutral-800 text-neutral-400">
                        <ClipboardIcon className="w-10 h-10 opacity-20 mb-2" />
                        <p className="text-sm font-bold italic text-neutral-500 dark:text-neutral-400">لا توجد مسحوبات مسجلة لهذا المزارع.</p>
                        <p className="text-2xs mt-1 opacity-70">لم يقم المزارع بأي مسحوبات نقدية من حصته حتى الآن.</p>
                    </div>
                )}
                
                {/* Total Share Node */}
                <div className="relative">
                    <div className="absolute -right-[31px] top-1.5 w-4 h-4 rounded-full border-4 border-white dark:border-neutral-900 bg-accent-success shadow-sm z-10"></div>
                    <div className="bg-accent-success/10 dark:bg-accent-success/10 rounded-2xl p-4 border border-accent-success/20 dark:border-accent-success/30 border-dashed">
                        <div className="flex justify-between items-start">
                            <div>
                                <h4 className="font-bold text-accent-success dark:text-accent-success text-sm sm:text-base">إجمالي المستحق (نصيب المزارع)</h4>
                                <p className="text-xs text-accent-success/70 dark:text-accent-success/70 mt-0.5">بناءً على أرباح العروة الحالية</p>
                            </div>
                            <div className="text-left shrink-0">
                                <p className="text-lg sm:text-xl font-black text-accent-success dark:text-accent-success tracking-tight tabular-nums">
                                    {formatCurrency(farmerShare).replace('EGP', '')}
                                    <span className="text-2xs font-bold ml-1 opacity-70">ج.م</span>
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FarmerAccountTab;
