
import React, { useRef, useEffect, useState, useMemo } from 'react';
import type { Cycle } from '../../types';
import { 
    CalendarIcon, 
    LeafIcon, 
    PencilIcon, 
    TrashIcon, 
    ClipboardDocumentIcon, 
    TrendingUpIcon, 
    TrendingDownIcon, 
    BarChartSimpleIcon, 
    EllipsisVerticalIcon, 
    EyeSlashIcon,
    SparklesIcon,
    WhatsAppIcon,
    ClockIcon
} from '../Icons';
import { formatNumber } from '../../utils/helpers';
import { useData } from '../../contexts/DataContext';
import { useToast } from '../../hooks/useToast';

interface CycleCardProps {
    cycle: Cycle;
    onDelete?: (id: string) => void;
    onEdit?: (id: string) => void;
    onViewReport: (id: string) => void;
    onToggleStatus?: (cycle: Cycle) => void;
    isNew?: boolean;
    onAnimationEnd?: () => void;
    index: number;
}

const MoneyBox = ({ label, value, colorClass, bgColorClass, icon: Icon }: { label: string, value: number, colorClass: string, bgColorClass: string, icon: React.ElementType }) => (
    <div className={`flex flex-col px-3 py-3 rounded-2xl ${bgColorClass} min-w-0 flex-1 relative overflow-hidden group/box`}>
        <div className="absolute -right-3 -top-3 opacity-[0.03] group-hover/box:opacity-[0.08] transition-opacity duration-300 pointer-events-none group-hover/box:scale-150 transform">
            <Icon className={`w-14 h-14 ${colorClass}`} />
        </div>
        <div className="flex items-center gap-1.5 mb-1.5 relative z-10">
            <Icon className={`w-3.5 h-3.5 ${colorClass}`} />
            <span className="text-[10px] font-black uppercase tracking-wider text-neutral-500 dark:text-neutral-400 whitespace-nowrap">{label}</span>
        </div>
        <div className="flex items-baseline gap-1 relative z-10 w-full overflow-hidden">
            <p className={`text-base sm:text-lg font-black ${colorClass} tracking-tight tabular-nums truncate`}>
                {formatNumber(value)}
            </p>
        </div>
    </div>
);

const CycleCard: React.FC<CycleCardProps> = ({ cycle, onDelete, onEdit, onViewReport, onToggleStatus, isNew, index }) => {
    const { invoices, expenses, dailyLogs } = useData();
    const { showToast } = useToast();
    
    const measureLabel = cycle.unit_of_measure === 'area'
        ? `${formatNumber(cycle.area_in_feddans || 0)} فدان`
        : `${formatNumber(cycle.plant_count)} نبات`;

    const cardRef = useRef<HTMLDivElement>(null);
    const menuRef = useRef<HTMLDivElement>(null);
    const [isMenuOpen, setMenuOpen] = useState(false);

    const hasRestrictedActions = onEdit || onToggleStatus || onDelete;

    const statusMap = {
        active: { label: 'نشطة', color: 'text-emerald-600 dark:text-emerald-400', dot: 'bg-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-500/10', border: 'border-emerald-200 dark:border-emerald-500/20' },
        closed: { label: 'مكتملة', color: 'text-neutral-600 dark:text-neutral-400', dot: 'bg-neutral-400', bg: 'bg-neutral-100 dark:bg-neutral-800', border: 'border-neutral-200 dark:border-neutral-700' },
        archived: { label: 'مؤرشفة', color: 'text-amber-600 dark:text-amber-400', dot: 'bg-amber-500', bg: 'bg-amber-50 dark:bg-amber-500/10', border: 'border-amber-200 dark:border-amber-500/20' },
    };

    const currentStatus = statusMap[cycle.status] || statusMap.closed;

    const roi = cycle.returnOnInvestment || 0;
    const isProfitable = cycle.profit > 0;
    const isLoss = cycle.profit < 0;
    
    const roiColor = isProfitable ? 'text-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20' : 
                     (isLoss ? 'text-rose-500 bg-rose-50 dark:bg-rose-500/10 border-rose-200 dark:border-rose-500/20' : 
                               'text-neutral-500 bg-neutral-50 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700');
                               
    const roiIcon = isProfitable ? <TrendingUpIcon className="w-3 h-3" /> : (isLoss ? <TrendingDownIcon className="w-3 h-3" /> : <BarChartSimpleIcon className="w-3 h-3" />);

    const daysPassed = useMemo(() => {
        const start = new Date(cycle.start_date);
        let endDate = new Date();
        
        if (cycle.status !== 'active') {
             const cycleInvoices = invoices.filter(i => i.cycle_id === cycle.id);
             const cycleExpenses = expenses.filter(e => e.cycle_id === cycle.id);
             const cycleLogs = dailyLogs ? dailyLogs.filter(l => l.cycle_id === cycle.id) : [];
             let lastDateStr = cycle.start_date;
             
             for (const inv of cycleInvoices) {
                 if (inv.date > lastDateStr) lastDateStr = inv.date;
             }
             for (const exp of cycleExpenses) {
                 if (exp.date > lastDateStr) lastDateStr = exp.date;
             }
             for (const log of cycleLogs) {
                 if (log.date > lastDateStr) lastDateStr = log.date;
             }
             endDate = new Date(lastDateStr);
        }

        const diffTime = endDate.getTime() - start.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return Math.max(0, diffDays);
    }, [cycle.start_date, cycle.status, cycle.id, invoices, expenses, dailyLogs]);

    const cropPhase = useMemo(() => {
        if (cycle.status !== 'active') {
            return {
                label: 'العروة منتهية',
                color: 'text-neutral-500 dark:text-neutral-400',
                bg: 'bg-neutral-400 dark:bg-neutral-600',
                percent: 100
            };
        }
        if (daysPassed < 30) {
            return {
                label: 'النمو الخضري',
                color: 'text-emerald-600 dark:text-emerald-400',
                bg: 'bg-emerald-500',
                percent: Math.min(100, Math.round((daysPassed / 30) * 100))
            };
        }
        if (daysPassed < 60) {
            return {
                label: 'التزهير وعقد الثمار',
                color: 'text-amber-600 dark:text-amber-400',
                bg: 'bg-amber-500',
                percent: Math.min(100, Math.round(((daysPassed - 30) / 30) * 100))
            };
        }
        if (daysPassed < 100) {
            return {
                label: 'ذروة الجمع والبيع',
                color: 'text-indigo-600 dark:text-indigo-400',
                bg: 'bg-indigo-500',
                percent: Math.min(100, Math.round(((daysPassed - 60) / 40) * 100))
            };
        }
        return {
            label: 'الجمع الأخير والإنهاء',
            color: 'text-rose-600 dark:text-rose-400',
            bg: 'bg-rose-500',
            percent: Math.min(100, Math.round(((daysPassed - 100) / 20) * 100))
        };
    }, [daysPassed, cycle.status]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const canDelete = useMemo(() => {
        return !invoices.some(i => i.cycle_id === cycle.id && i.market !== 'رصيد منقول') && !expenses.some(e => e.cycle_id === cycle.id);
    }, [invoices, expenses, cycle.id]);

    const handleDeleteClick = () => {
        if (!canDelete) {
            showToast('يرجى حذف كافة الفواتير والمصروفات المرتبطة بهذه العروة أولاً.', 'error');
            return;
        }
        if (onDelete) onDelete(cycle.id);
    };

    return (
        <div 
            ref={cardRef}
            className={`group relative bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200/80 dark:border-white/5 flex flex-col justify-between shadow-sm hover:shadow-2xl hover:-translate-y-1 hover:border-primary/30 dark:hover:border-primary/30 transition-all duration-300 ease-out will-change-transform overflow-hidden ${isNew ? 'animate-enter' : 'animate-stagger-in'}`}
            style={{ animationDelay: isNew ? '0ms' : `${index * 60}ms` }}
        >
            {/* Top decorative gradient line */}
            <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${isProfitable ? 'from-emerald-400 to-teal-500' : (isLoss ? 'from-rose-400 to-red-500' : 'from-neutral-300 to-neutral-400')} opacity-80`} />

            <div className="p-6 pb-5">
                {/* Header Section */}
                <div className="flex justify-between items-start mb-4">
                    <div className="space-y-1.5 min-w-0 flex-1 pl-4">
                        <div className="flex items-center gap-2 mb-2">
                            <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border ${currentStatus.bg} ${currentStatus.border} ${currentStatus.color}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${currentStatus.dot} ${cycle.status === 'active' ? 'animate-pulse' : ''}`}></span>
                                <span className="text-[9px] font-bold tracking-wider">{currentStatus.label}</span>
                            </div>
                            <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[10px] font-bold ${roiColor}`}>
                                {roiIcon}
                                العائد {roi > 0 ? '+' : ''}{Math.round(roi)}%
                            </div>
                        </div>
                        <h3 className="text-xl sm:text-2xl font-black text-neutral-800 dark:text-neutral-100 leading-tight truncate">
                            {cycle.name}
                        </h3>
                    </div>
                </div>
                
                {/* Minimal Metadata List */}
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mb-6 text-[11px] font-bold text-neutral-500 dark:text-neutral-400">
                    <div className="flex items-center gap-1.5">
                        <CalendarIcon className="w-3.5 h-3.5 opacity-70" />
                        <span>{cycle.start_date}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <LeafIcon className="w-3.5 h-3.5 opacity-70" />
                        <span className="truncate max-w-[100px]">{cycle.seed_type}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <SparklesIcon className="w-3.5 h-3.5 opacity-70" />
                        <span>{measureLabel}</span>
                    </div>
                </div>

                {/* Progress Bar (Super thin & elegant) */}
                <div className="mb-6 relative">
                    <div className="flex justify-between items-end mb-1.5">
                        <span className={`text-[10px] font-black tracking-tight ${cropPhase.color}`}>{cropPhase.label}</span>
                        <div className="flex items-center gap-1">
                            <ClockIcon className="w-3 h-3 text-neutral-400" />
                            <span className="text-[10px] font-bold text-neutral-500 dark:text-neutral-400 tabular-nums">
                                {daysPassed} يوم
                            </span>
                        </div>
                    </div>
                    <div className="h-1.5 w-full bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
                        <div 
                            className={`h-full ${cropPhase.bg} rounded-full transition-all duration-1000 ease-out`} 
                            style={{ width: `${cropPhase.percent}%` }}
                        />
                    </div>
                </div>

                {/* Financial Grid */}
                <div className="flex gap-2">
                    <MoneyBox 
                        label="الإيراد" 
                        value={cycle.revenue} 
                        icon={TrendingUpIcon} 
                        colorClass="text-emerald-700 dark:text-emerald-400" 
                        bgColorClass="bg-emerald-50/50 dark:bg-emerald-950/30" 
                    />
                    <MoneyBox 
                        label="المصروف" 
                        value={cycle.expenses} 
                        icon={TrendingDownIcon} 
                        colorClass="text-rose-700 dark:text-rose-400" 
                        bgColorClass="bg-rose-50/50 dark:bg-rose-950/30" 
                    />
                    <MoneyBox 
                        label="الربح" 
                        value={cycle.profit} 
                        icon={BarChartSimpleIcon} 
                        colorClass="text-indigo-700 dark:text-indigo-400" 
                        bgColorClass="bg-indigo-50/50 dark:bg-indigo-950/30" 
                    />
                </div>
            </div>

            {/* Actions Bar (Integrated smoothly with the card base) */}
            <div className="px-6 py-4 bg-neutral-50/50 dark:bg-neutral-800/20 border-t border-neutral-100 dark:border-white/5 flex items-center justify-between gap-3">
                <button 
                    onClick={() => onViewReport(cycle.id)}
                    className="flex-1 flex items-center justify-center gap-2 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 font-bold py-2.5 px-4 rounded-xl hover:bg-neutral-800 dark:hover:bg-neutral-100 transition-all active:scale-95 text-xs sm:text-sm shadow-sm"
                >
                    <ClipboardDocumentIcon className="w-4 h-4 opacity-80"/>
                    <span className="truncate">فتح تقرير حسابات العروة</span>
                </button>

                <div ref={menuRef} className="relative flex-shrink-0">
                    {hasRestrictedActions && (
                        <button 
                            onClick={() => setMenuOpen(prev => !prev)}
                            className={`p-2.5 rounded-xl transition-all active:scale-95 border ${isMenuOpen ? 'bg-neutral-200 dark:bg-neutral-700 border-neutral-300 dark:border-neutral-600 text-neutral-900 dark:text-white' : 'bg-white dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 text-neutral-500 hover:text-neutral-900 dark:hover:text-white hover:border-neutral-300 dark:hover:border-neutral-600'}`}
                        >
                            <EllipsisVerticalIcon className="h-5 w-5"/>
                        </button>
                    )}

                    {isMenuOpen && (
                         <div className="absolute bottom-full left-0 mb-2 w-48 bg-white dark:bg-neutral-800 rounded-2xl shadow-xl shadow-neutral-200/50 dark:shadow-none border border-neutral-200 dark:border-neutral-700 z-20 overflow-hidden animate-enter">
                            <div className="p-1 space-y-0.5">
                                <button onClick={() => {
                                    const url = `${window.location.origin}/shared-report/${cycle.id}`;
                                    const text = `تم إصدار تقرير حسابات العروة. لمراجعة التفاصيل، اضغط على الرابط التالي: ${url}`;
                                    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
                                    setMenuOpen(false);
                                }} className="w-full text-right flex items-center gap-2.5 px-3 py-2 text-[11px] font-bold text-neutral-700 dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-700 rounded-xl">
                                    <WhatsAppIcon className="w-4 h-4 text-emerald-500" />
                                    <span>مشاركة رابط التقرير 🔗</span>
                                </button>
                                {onEdit && (
                                    <button onClick={() => { onEdit(cycle.id); setMenuOpen(false); }} className="w-full text-right flex items-center gap-2.5 px-3 py-2 text-[11px] font-bold text-neutral-700 dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-700 rounded-xl">
                                        <PencilIcon className="w-4 h-4 text-blue-500" />
                                        <span>تعديل البيانات</span>
                                    </button>
                                )}
                                {onToggleStatus && (
                                    <button onClick={() => { onToggleStatus(cycle); setMenuOpen(false); }} className="w-full text-right flex items-center gap-2.5 px-3 py-2 text-[11px] font-bold text-neutral-700 dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-700 rounded-xl">
                                        <EyeSlashIcon className="w-4 h-4 text-amber-500" />
                                        <span>{cycle.status === 'active' ? 'إغلاق العروة' : 'تفعيل العروة'}</span>
                                    </button>
                                )}
                                {(onEdit || onToggleStatus) && onDelete && <div className="h-px bg-neutral-100 dark:bg-neutral-700 mx-3 my-1"></div>}
                                {onDelete && (
                                    <button 
                                        onClick={() => { handleDeleteClick(); setMenuOpen(false); }} 
                                        className={`w-full text-right flex items-center gap-2.5 px-3 py-2 text-[11px] font-bold rounded-xl transition-all ${!canDelete ? 'opacity-30 grayscale cursor-not-allowed' : 'text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/30'}`}
                                    >
                                        <TrashIcon className="w-4 h-4 flex-shrink-0" />
                                        <span>حذف العروة</span>
                                    </button>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CycleCard;
