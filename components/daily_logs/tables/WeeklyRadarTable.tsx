import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Droplet,
  Sprout,
  Shield,
  Wrench,
  ShieldAlert,
  ShoppingBag,
  Users,
  Lightbulb,
  ChevronRight,
  ChevronLeft,
  X,
  Leaf,
} from 'lucide-react';
import type { DailyLog } from '../../../types';
import {
  deserializeIrrigation,
  deserializeCompounds,
  deserializePest,
  deserializePlanting,
  deserializeAgriOps,
} from '../dailyLogUtils';

export interface WeeklyRadarModalProps {
    onClose: () => void;
    dailyLogs: DailyLog[];
    selectedCycleId: string;
    activeCycleIds: Set<string>;
}

export const WeeklyRadarModal: React.FC<WeeklyRadarModalProps> = ({ onClose, dailyLogs, selectedCycleId, activeCycleIds }) => {
    const [refDate, setRefDate] = useState<Date>(new Date());

    const handlePrevWeek = () => {
        setRefDate(prev => {
            const d = new Date(prev);
            d.setDate(d.getDate() - 7);
            return d;
        });
    };

    const handleNextWeek = () => {
        setRefDate(prev => {
            const d = new Date(prev);
            d.setDate(d.getDate() + 7);
            return d;
        });
    };

    const handleCurrentWeek = () => {
        setRefDate(new Date());
    };

    const getWeekDates = (referenceDate: Date) => {
        const day = referenceDate.getDay(); // 0 is Sunday, 1 is Monday, ..., 6 is Saturday
        const offsetToSaturday = day === 6 ? 0 : -(day + 1);
        
        const satDate = new Date(referenceDate);
        satDate.setDate(referenceDate.getDate() + offsetToSaturday);
        
        const weekDays = [
            { name: 'السبت', key: 'Saturday' },
            { name: 'الأحد', key: 'Sunday' },
            { name: 'الاثنين', key: 'Monday' },
            { name: 'الثلاثاء', key: 'Tuesday' },
            { name: 'الأربعاء', key: 'Wednesday' },
            { name: 'الخميس', key: 'Thursday' },
            { name: 'الجمعة', key: 'Friday' }
        ];
        
        return weekDays.map((wd, index) => {
            const d = new Date(satDate);
            d.setDate(satDate.getDate() + index);
            const yyyy = d.getFullYear();
            const mm = String(d.getMonth() + 1).padStart(2, '0');
            const dd = String(d.getDate()).padStart(2, '0');
            const formatted = `${yyyy}-${mm}-${dd}`;
            return {
                ...wd,
                dateStr: formatted,
                dateObj: d
            };
        });
    };

    const days = useMemo(() => getWeekDates(refDate), [refDate]);

    const startDayFormatted = useMemo(() => {
        return days[0].dateObj.toLocaleDateString('ar-EG', { day: 'numeric', month: 'short' });
    }, [days]);

    const endDayFormatted = useMemo(() => {
        return days[6].dateObj.toLocaleDateString('ar-EG', { day: 'numeric', month: 'short' });
    }, [days]);

    const yearStr = useMemo(() => {
        return days[0].dateObj.getFullYear();
    }, [days]);

    const weekLogMap = useMemo(() => {
        const map: Record<string, DailyLog> = {};
        const dateSet = new Set(days.map(d => d.dateStr));
        
        let logs = dailyLogs.filter(l => dateSet.has(l.date));
        if (selectedCycleId) {
            logs = logs.filter(l => l.cycle_id === selectedCycleId);
        } else {
            logs = logs.filter(l => activeCycleIds.has(l.cycle_id));
        }
        
        logs.forEach(l => {
            map[l.date] = l;
        });
        return map;
    }, [dailyLogs, days, selectedCycleId, activeCycleIds]);



    return createPortal(
        <div className="fixed inset-0 z-[99999] flex flex-col bg-neutral-900/60 backdrop-blur-xs animate-in fade-in duration-250 p-4 items-center justify-center" dir="rtl">
            <div className="flex flex-col w-full bg-white dark:bg-neutral-900 max-w-md rounded-3xl shadow-2xl relative overflow-hidden max-h-[90vh]">
                
                {/* Header */}
                <div className="flex justify-between items-center py-4 px-5 border-b border-neutral-100 dark:border-neutral-800 bg-white dark:bg-neutral-900 shrink-0">
                    <div className="flex items-center gap-2">
                        <span className="text-base">📊</span>
                        <h3 className="text-sm font-black text-neutral-800 dark:text-neutral-100">ملخص الأسبوع (Weekly Radar)</h3>
                    </div>
                    <button 
                        onClick={onClose}
                        className="p-1.5 rounded-xl bg-neutral-50 hover:bg-neutral-100 dark:bg-neutral-800 dark:hover:bg-neutral-750 text-neutral-500 dark:text-neutral-400 transition-all cursor-pointer"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Body Content */}
                <div className="p-4 overflow-y-auto space-y-4">
                    {/* Week Navigation bar */}
                    <div className="flex items-center justify-between gap-2 p-2 bg-neutral-50 dark:bg-neutral-850 rounded-2xl border border-neutral-150/40 dark:border-neutral-800/40">
                        <button 
                            onClick={handleNextWeek}
                            className="p-1.5 rounded-lg bg-white dark:bg-neutral-800 hover:bg-neutral-100 text-neutral-600 dark:text-neutral-300 transition-all border border-neutral-200 dark:border-neutral-750 cursor-pointer shadow-xs active:scale-95"
                            title="الأسبوع التالي"
                        >
                            <ChevronRight className="w-4 h-4" />
                        </button>

                        <div className="flex flex-col items-center flex-1">
                            <span className="text-[10.5px] font-black text-neutral-750 dark:text-neutral-300">
                                {startDayFormatted} – {endDayFormatted}
                            </span>
                            <span className="text-[9px] font-bold text-neutral-400">
                                عام {yearStr}
                            </span>
                        </div>

                        <button 
                            onClick={handleCurrentWeek}
                            className="px-2.5 py-1 text-[10px] font-black rounded-md bg-white dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 transition-all border border-neutral-200 dark:border-neutral-750 cursor-pointer shadow-xs active:scale-95"
                        >
                            اليوم
                        </button>

                        <button 
                            onClick={handlePrevWeek}
                            className="p-1.5 rounded-lg bg-white dark:bg-neutral-800 hover:bg-neutral-100 text-neutral-600 dark:text-neutral-300 transition-all border border-neutral-200 dark:border-neutral-750 cursor-pointer shadow-xs active:scale-95"
                            title="الأسبوع السابق"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Matrix Two-Column Flex Layout */}
                    <div className="overflow-hidden border border-neutral-150 dark:border-neutral-800/85 rounded-2xl bg-neutral-50/20 dark:bg-neutral-900 divide-y divide-neutral-150/40 dark:divide-neutral-850/60">
                        {days.map(day => {
                            const log = weekLogMap[day.dateStr];
                            const dObj = day.dateObj;
                            const isToday = new Date().toISOString().split('T')[0] === day.dateStr;
                            return (
                                <div key={day.dateStr} className={`flex items-start gap-4 p-3.5 transition-colors ${isToday ? 'bg-primary/5 dark:bg-primary/10' : ''}`}>
                                    {/* Column 1: Day & Date (w-1/4 fixed width) */}
                                    <div className="w-1/4 shrink-0 flex flex-col text-right">
                                        <span className={`font-black text-[11.5px] ${isToday ? 'text-primary' : 'text-neutral-800 dark:text-neutral-200'}`}>
                                            {day.name}
                                        </span>
                                        <span className="text-[9.5px] font-mono text-neutral-400 mt-0.5">
                                            {dObj.getDate()}/{dObj.getMonth() + 1}
                                        </span>
                                    </div>

                                    {/* Column 2: Activities badging (w-3/4 flexible flex-wrap container) */}
                                    <div className="w-3/4 flex flex-wrap gap-1.5">
                                        {log && log.tasks && log.tasks.length > 0 ? (
                                            log.tasks.map((task, idx) => {
                                                let icon: React.ReactNode = null;
                                                let badgeStyle = '';
                                                let text = '';

                                                switch (task.category) {
                                                    case 'ري': {
                                                        const { morning, morningMin, evening, eveningMin } = deserializeIrrigation(task.details);
                                                        let timeStr = '';
                                                        if (morning && evening) {
                                                            timeStr = `${morningMin || 0}+${eveningMin || 0} د`;
                                                        } else if (morning) {
                                                            timeStr = `${morningMin || 0} د`;
                                                        } else if (evening) {
                                                            timeStr = `${eveningMin || 0} د`;
                                                        } else {
                                                            timeStr = 'تم الري';
                                                        }
                                                        text = `ري: ${timeStr}`;
                                                        badgeStyle = 'bg-sky-50 dark:bg-sky-950/30 text-sky-700 dark:text-sky-300 border border-sky-100 dark:border-sky-900/30';
                                                        icon = <Droplet className="w-3 h-3 shrink-0" />;
                                                        break;
                                                    }
                                                    case 'تسميد': {
                                                        const { compounds } = deserializeCompounds(task.details);
                                                        const compoundsStr = compounds.map(c => c.name + (c.amount ? ` (${c.amount})` : '')).join(' + ');
                                                        text = `تسميد: ${compoundsStr || task.subCategory || 'تسميد ومغذيات'}`;
                                                        badgeStyle = 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 border border-emerald-100 dark:border-emerald-900/30';
                                                        icon = <Leaf className="w-3 h-3 shrink-0" />;
                                                        break;
                                                    }
                                                    case 'رش': {
                                                        const { compounds } = deserializeCompounds(task.details);
                                                        const compoundsStr = compounds.map(c => c.name + (c.amount ? ` (${c.amount})` : '')).join(' + ');
                                                        text = `رش: ${compoundsStr || task.subCategory || 'رش وقائي'}`;
                                                        badgeStyle = 'bg-indigo-50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-900/30';
                                                        icon = <Shield className="w-3 h-3 shrink-0" />;
                                                        break;
                                                    }
                                                    case 'الاصابات والآفات':
                                                    case 'إصابات': {
                                                        const { pestName, severity } = deserializePest(task.details);
                                                        text = `مكافحة آفة: ${pestName || task.subCategory || 'إصابة نشطة'}${severity ? ` (${severity})` : ''}`;
                                                        badgeStyle = 'bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300 border border-rose-100 dark:border-rose-900/30';
                                                        icon = <ShieldAlert className="w-3 h-3 shrink-0" />;
                                                        break;
                                                    }
                                                    case 'عمليات زراعية': {
                                                        const { ops } = deserializeAgriOps(task.details);
                                                        text = `عملية: ${ops.join('، ') || task.subCategory || 'عملية زراعية'}`;
                                                        badgeStyle = 'bg-orange-50 dark:bg-orange-950/30 text-orange-700 dark:text-orange-300 border border-orange-100 dark:border-orange-900/30';
                                                        icon = <Wrench className="w-3 h-3 shrink-0" />;
                                                        break;
                                                    }
                                                    case 'زراعة': {
                                                        const { plantType, quantity, unit } = deserializePlanting(task.details);
                                                        text = `زراعة: ${plantType || 'شتلات'} (${quantity || ''} ${unit || ''})`;
                                                        badgeStyle = 'bg-teal-50 dark:bg-teal-950/30 text-teal-700 dark:text-teal-300 border border-teal-100 dark:border-teal-900/30';
                                                        icon = <Sprout className="w-3 h-3 shrink-0" />;
                                                        break;
                                                    }
                                                    case 'حصاد': {
                                                        text = `حصاد: ${task.quantity ? `${task.quantity} ${task.unit || 'قفص'}` : ''} ${task.subCategory || ''}`.trim() || 'حصاد';
                                                        badgeStyle = 'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 border border-amber-100 dark:border-amber-900/30';
                                                        icon = <ShoppingBag className="w-3 h-3 shrink-0" />;
                                                        break;
                                                    }
                                                    case 'عمالة': {
                                                        text = `عمالة: ${task.workersCount ? `${task.workersCount} عمال` : task.details || 'عمالة يدوي'}`;
                                                        badgeStyle = 'bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 border border-blue-100 dark:border-blue-900/30';
                                                        icon = <Users className="w-3 h-3 shrink-0" />;
                                                        break;
                                                    }
                                                    default: {
                                                        text = `${task.category}: ${task.details || ''}`;
                                                        badgeStyle = 'bg-purple-50 dark:bg-purple-950/30 text-purple-700 dark:text-purple-300 border border-purple-100 dark:border-purple-900/30';
                                                        icon = <Lightbulb className="w-3 h-3 shrink-0" />;
                                                        break;
                                                    }
                                                }

                                                return (
                                                    <div 
                                                        key={task.id || idx} 
                                                        className={`text-[11px] px-2 py-1 rounded-md flex items-center gap-1 font-semibold leading-tight select-none animate-in zoom-in-50 duration-150 ${badgeStyle}`}
                                                    >
                                                        {icon}
                                                        <span>{text}</span>
                                                    </div>
                                                );
                                            })
                                        ) : (
                                            <span className="text-[10px] text-neutral-350 dark:text-neutral-600 font-bold self-center">لا توجد أنشطة</span>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Legend info block */}
                    <div className="p-3 bg-neutral-50 dark:bg-neutral-850 rounded-xl border border-neutral-150 dark:border-neutral-800 text-[10px] text-neutral-500 dark:text-neutral-400 space-y-1.5 leading-relaxed">
                        <div className="font-bold text-neutral-700 dark:text-neutral-300">💡 توضيح الرموز والألوان:</div>
                        <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[9px] font-black">
                            <div className="flex items-center gap-1.5">
                                <span className="inline-block w-2.5 h-2.5 rounded-full bg-sky-500"></span>
                                <span>ري بالصوبة</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                                <span>تسميد ومغذيات</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <span className="inline-block w-2.5 h-2.5 rounded-full bg-rose-500"></span>
                                <span>رش ومكافحة آفات</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <span className="inline-block w-2.5 h-2.5 rounded-full bg-orange-500"></span>
                                <span>عمليات وعمالة يدوي</span>
                            </div>
                            <div className="flex items-center gap-1.5 col-span-2">
                                <span className="inline-block w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                                <span>إنتاج وحصاد المحصول</span>
                            </div>
                        </div>
                    </div>

                </div>

                {/* Footer close button */}
                <div className="p-3.5 bg-neutral-50 dark:bg-neutral-850/30 border-t border-neutral-100 dark:border-neutral-800 text-center shrink-0">
                    <button
                        onClick={onClose}
                        className="w-full py-2 px-4 rounded-xl bg-neutral-850 hover:bg-neutral-800 dark:bg-neutral-800 dark:hover:bg-neutral-750 text-white dark:text-neutral-100 text-xs font-black transition-all cursor-pointer"
                    >
                        إغلاق الملخص
                    </button>
                </div>

            </div>
        </div>,
        document.body
    );
};

export const WeeklyRadarTable = WeeklyRadarModal;
export default WeeklyRadarModal;
