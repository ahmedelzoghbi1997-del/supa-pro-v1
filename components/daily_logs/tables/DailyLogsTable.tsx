import React, { useState } from 'react';
import {
  Calendar,
  ChevronDown,
  Trash2,
  ShieldAlert,
} from 'lucide-react';
import type { DailyLog } from '../../../types';
import {
  getArabicDayAndMonth,
  getCategoryStyles,
  deserializeIrrigation,
  deserializeCompounds,
  deserializePest,
  deserializePlanting,
  deserializeAgriOps,
} from '../dailyLogUtils';

export interface DailyLogsTableProps {
  filteredLogs: DailyLog[];
  expandedLogIds: Record<string, boolean>;
  setExpandedLogIds: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  searchQuery: string;
  filterCategory: string;
  selectedDateFilter: string | null;
  onResetFilters: () => void;
  onEditLog: (log: DailyLog) => void;
  onDeleteLog: (id: string) => Promise<void> | void;
}

export const DailyLogsTable: React.FC<DailyLogsTableProps> = ({
  filteredLogs,
  expandedLogIds,
  setExpandedLogIds,
  searchQuery,
  filterCategory,
  selectedDateFilter,
  onResetFilters,
  onEditLog,
  onDeleteLog,
}) => {
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  return (
    <div className="space-y-4">
                {filteredLogs.length === 0 ? (
                    <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl py-16 px-4 text-center">
                        <div className="w-16 h-16 mx-auto mb-4 bg-neutral-100 dark:bg-neutral-800 rounded-full flex items-center justify-center text-neutral-300 dark:text-neutral-600">
                            <Calendar className="w-8 h-8" />
                        </div>
                        <h3 className="text-base font-black text-neutral-800 dark:text-neutral-200 mb-1">لا توجد سجلات مطابقة</h3>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400 max-w-sm mx-auto leading-relaxed">يرجى تعديل خيارات البحث أو تصفية الأيام، أو إضافة وثيقة جديدة للعروة المحددة.</p>
                        {(searchQuery || filterCategory !== 'all' || selectedDateFilter) && (
                            <button 
                                onClick={onResetFilters}
                                className="mt-4 px-5 py-2 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-750 text-neutral-800 dark:text-neutral-200 text-xs font-black rounded-xl transition-colors cursor-pointer"
                            >
                                إعادة تعيين الفلاتر
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="space-y-2">
                        {filteredLogs.map((log) => {
                            const { dayOfMonth, monthName, dayName } = getArabicDayAndMonth(log.date);
                            const isExpanded = !!expandedLogIds[log.id];

                            // Calculate count of tasks for summary badges
                            const categoryCounts = log.tasks.reduce((acc, task) => {
                                const cat = task.category || 'أخرى';
                                acc[cat] = (acc[cat] || 0) + 1;
                                return acc;
                            }, {} as Record<string, number>);

                            return (
                                <div key={log.id} className="bg-white dark:bg-neutral-900 border border-neutral-250/70 dark:border-neutral-800 rounded-2xl shadow-xs overflow-hidden transition-all duration-200">
                                    
                                    {/* Clickable Card Header / Accordion Toggle */}
                                    <div 
                                        onClick={() => {
                                            setExpandedLogIds(prev => ({
                                                ...prev,
                                                [log.id]: !isExpanded
                                            }));
                                        }}
                                        className="px-4 py-2.5 bg-neutral-50/60 hover:bg-neutral-50 dark:bg-neutral-800/15 dark:hover:bg-neutral-800/30 cursor-pointer flex justify-between items-center select-none transition-colors"
                                    >
                                        <div className="flex items-center gap-3 flex-1 min-w-0">
                                            {/* Chevron & Compact Date Indicator */}
                                            <div className="flex items-center gap-2 shrink-0">
                                                <ChevronDown className={`w-4 h-4 text-neutral-400 dark:text-neutral-500 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                                                <div className="flex flex-col items-center justify-center bg-primary/10 dark:bg-primary/20 w-8 h-8 rounded-lg shrink-0">
                                                    <span className="text-xs font-black text-primary leading-none">{dayOfMonth}</span>
                                                </div>
                                                <div className="flex flex-col text-right">
                                                    <span className="text-xs font-black text-neutral-800 dark:text-neutral-200">{dayName}، {dayOfMonth} {monthName}</span>
                                                    <span className="text-[9px] font-bold text-neutral-400 dark:text-neutral-500 mt-0.5">{log.cycle}</span>
                                                </div>
                                            </div>

                                            {/* Summary Badges - Desktop/Tablet (visible above sm) */}
                                            <div className="hidden sm:flex items-center gap-1.5 flex-wrap overflow-hidden pr-2">
                                                {Object.entries(categoryCounts).map(([cat, count]) => {
                                                    const styles = getCategoryStyles(cat);
                                                    const Icon = styles.icon;
                                                    return (
                                                        <span 
                                                            key={cat} 
                                                            className={`inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-md ${styles.bg} ${styles.color} border ${styles.border}`}
                                                        >
                                                            <Icon className="w-2.5 h-2.5" />
                                                            <span>{count} {cat}</span>
                                                        </span>
                                                    );
                                                })}
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2 shrink-0">
                                                {/* Summary Badges - Mobile (visible below sm, compact icons look) */}
                                                <div className="sm:hidden flex items-center gap-1 pl-1">
                                                    {Object.entries(categoryCounts).map(([cat, count]) => {
                                                        const styles = getCategoryStyles(cat);
                                                        const Icon = styles.icon;
                                                        return (
                                                            <span 
                                                                key={cat} 
                                                                title={`${count} ${cat}`}
                                                                className={`inline-flex items-center justify-center w-5 h-5 rounded-md ${styles.bg} ${styles.color} border ${styles.border}`}
                                                            >
                                                                <Icon className="w-3 h-3" />
                                                            </span>
                                                        );
                                                    })}
                                                </div>

                                                {/* Actions for log */}
                                                {confirmDeleteId === log.id ? (
                                                    <div className="flex items-center gap-1 animate-in fade-in zoom-in-95 duration-150">
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setConfirmDeleteId(null);
                                                            }}
                                                            className="px-2 py-1 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-750 border border-neutral-200/50 dark:border-neutral-700/50 text-neutral-600 dark:text-neutral-300 text-[10px] font-black rounded-lg transition-colors cursor-pointer"
                                                        >
                                                            إلغاء
                                                        </button>
                                                        <button
                                                            onClick={async (e) => {
                                                                e.stopPropagation();
                                                                await onDeleteLog(log.id);
                                                                setConfirmDeleteId(null);
                                                            }}
                                                            className="px-2 py-1 bg-rose-500 hover:bg-rose-600 text-white text-[10px] font-black rounded-lg transition-colors cursor-pointer"
                                                        >
                                                            تأكيد الحذف
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-1 animate-in fade-in duration-150">
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(null); onEditLog(log); }}
                                                            className="px-2 py-1 bg-white hover:bg-neutral-100 dark:bg-neutral-800 dark:hover:bg-neutral-750 border border-neutral-200/60 dark:border-neutral-700/60 text-neutral-600 dark:text-neutral-300 text-[10px] font-black rounded-lg transition-colors cursor-pointer"
                                                        >
                                                            تعديل
                                                        </button>
                                                        <button 
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setConfirmDeleteId(log.id);
                                                            }}
                                                            className="p-1 px-1.5 rounded-lg border border-transparent hover:border-rose-100 dark:hover:border-rose-900/30 hover:bg-rose-50 dark:hover:bg-rose-950/20 text-neutral-400 hover:text-rose-500 transition-colors cursor-pointer"
                                                            title="حذف"
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                    {/* Task entries for this day - Expanded State */}
                                    {isExpanded && (
                                        <div className="p-2.5 space-y-1.5 border-t border-neutral-100 dark:border-neutral-800/60 animate-in fade-in slide-in-from-top-1 duration-200 bg-neutral-50/20 dark:bg-neutral-900/10">
                                            {log.tasks.length > 0 ? log.tasks.map((task, taskIdx) => {
                                                const styling = getCategoryStyles(task.category);
                                                const TaskIcon = styling.icon;
                                                
                                                // Handle parsed layouts based on category
                                                const isSpraying = task.category === 'رش';
                                                const isFertilization = task.category === 'تسميد';
                                                const isPests = task.category === 'الاصابات والآفات' || task.category === 'إصابات';

                                                if (isSpraying || isFertilization) {
                                                    const { compounds, detailsText } = deserializeCompounds(task.details);
                                                    return (
                                                        <div key={`${task.id}-${taskIdx}`} className={`p-2 rounded-xl border ${styling.bg} ${styling.border} flex flex-col gap-1`}>
                                                            <div className="flex items-center justify-between flex-wrap gap-2">
                                                                {/* Inline header: Icon + Name + Subcategory + Compounds */}
                                                                <div className="flex items-center gap-2 flex-wrap flex-1 min-w-0">
                                                                    <div className="flex items-center gap-1 shrink-0">
                                                                        <TaskIcon className={`w-3 h-3 ${styling.color}`} />
                                                                        <span className="text-[11px] font-black text-neutral-850 dark:text-neutral-200">{task.category}</span>
                                                                        {task.subCategory && (
                                                                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded text-neutral-500 dark:text-neutral-400 bg-black/5 dark:bg-white/5">
                                                                                {task.subCategory}
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                    
                                                                    {/* Compounds chips inlined */}
                                                                    {compounds.length > 0 && compounds[0].name && (
                                                                        <div className="flex flex-wrap gap-1 items-center">
                                                                            {compounds.map((comp, idx) => (
                                                                                <div key={idx} className="bg-black/5 dark:bg-white/5 px-1.5 py-0.5 rounded text-[9px] font-bold flex items-center gap-1 text-neutral-600 dark:text-neutral-300">
                                                                                    <span>{comp.name}</span>
                                                                                    {comp.amount && (
                                                                                        <>
                                                                                            <span className="text-neutral-400/70">/</span>
                                                                                            <span className="text-primary font-bold">{comp.amount}</span>
                                                                                        </>
                                                                                    )}
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>

                                                            {/* Details Text super compact below */}
                                                            {detailsText && (
                                                                <div className="text-[9.5px] text-neutral-500 dark:text-neutral-400 leading-normal pl-1.5 pr-0.5 flex gap-1 items-baseline">
                                                                    <span className="text-neutral-400 dark:text-neutral-500 shrink-0 select-none">←</span>
                                                                    <span>{detailsText}</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                } else if (isPests) {
                                                    const { pestName, severity, status, details } = deserializePest(task.details);
                                                    
                                                    // Severity badge styling
                                                    let severityBadge = "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400";
                                                    if (severity.includes('شديدة')) severityBadge = "bg-rose-500/10 text-rose-600 dark:text-rose-400 font-black animate-pulse";
                                                    else if (severity.includes('خفيفة')) severityBadge = "bg-emerald-500/10 text-emerald-650 dark:text-emerald-400";

                                                    // Status badge styling
                                                    let statusBadge = "bg-indigo-500/10 text-indigo-600 dark:text-indigo-455";
                                                    if (status.includes('تمت')) statusBadge = "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-bold";

                                                    return (
                                                        <div key={`${task.id}-${taskIdx}`} className="p-2 rounded-xl border border-rose-100 dark:border-rose-900/30 bg-rose-50/40 dark:bg-rose-900/10 flex flex-col gap-1">
                                                            <div className="flex items-center justify-between flex-wrap gap-2">
                                                                <div className="flex items-center gap-2 flex-wrap flex-1 min-w-0">
                                                                    <div className="flex items-center gap-1.5 shrink-0">
                                                                        <ShieldAlert className="w-3.5 h-3.5 text-rose-500" />
                                                                        <span className="text-[11px] font-black text-rose-700 dark:text-rose-400">آفة وإصابة:</span>
                                                                        <span className="text-[11px] font-bold text-rose-600 dark:text-rose-455">{pestName || 'غير مححدد'}</span>
                                                                    </div>
                                                                    
                                                                    <div className="flex items-center gap-1">
                                                                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${severityBadge}`}>
                                                                            {severity}
                                                                        </span>
                                                                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${statusBadge}`}>
                                                                            {status}
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            {/* Details / Action */}
                                                            {details && (
                                                                <div className="text-[9.5px] text-neutral-500 dark:text-neutral-450 leading-normal pl-1.5 pr-0.5 flex gap-1 items-baseline">
                                                                    <span className="text-neutral-400 dark:text-neutral-500 shrink-0 select-none">←</span>
                                                                    <span><span className="text-neutral-450 dark:text-neutral-500">الإجراء:</span> {details}</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                } else if (task.category === 'ري') {
                                                    const { morning, morningMin, evening, eveningMin, notes: irrNotes } = deserializeIrrigation(task.details);
                                                    return (
                                                        <div key={`${task.id}-${taskIdx}`} className={`p-2 rounded-xl border ${styling.bg} ${styling.border} flex flex-col gap-1`}>
                                                            <div className="flex items-center justify-between flex-wrap gap-2">
                                                                <div className="flex items-center gap-2 flex-wrap flex-1 min-w-0">
                                                                    <div className="flex items-center gap-1 shrink-0">
                                                                        <TaskIcon className={`w-3.5 h-3.5 ${styling.color}`} />
                                                                        <span className="text-[11px] font-black text-neutral-850 dark:text-neutral-200">ري الصوبة:</span>
                                                                    </div>
                                                                    <div className="flex flex-wrap gap-1">
                                                                        {morning && (
                                                                            <span className="bg-sky-500/10 text-sky-600 dark:text-sky-400 text-[9px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1">
                                                                                <span>🌅 صباحاً:</span>
                                                                                <span className="font-mono text-primary">{morningMin || 0} د</span>
                                                                            </span>
                                                                        )}
                                                                        {evening && (
                                                                            <span className="bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[9px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1">
                                                                                <span>🌇 مساءً:</span>
                                                                                <span className="font-mono text-primary">{eveningMin || 0} د</span>
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            {irrNotes && (
                                                                <div className="text-[9.5px] text-neutral-500 dark:text-neutral-400 leading-normal pl-1.5 pr-0.5 flex gap-1 items-baseline">
                                                                    <span className="text-neutral-400 dark:text-neutral-500 shrink-0 select-none">←</span>
                                                                    <span>{irrNotes}</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                } else if (task.category === 'زراعة') {
                                                    const { plantType, quantity, unit, notes: pNotes } = deserializePlanting(task.details);
                                                    return (
                                                        <div key={`${task.id}-${taskIdx}`} className={`p-2 rounded-xl border ${styling.bg} ${styling.border} flex flex-col gap-1`}>
                                                            <div className="flex items-center justify-between flex-wrap gap-2">
                                                                <div className="flex items-center gap-2 flex-wrap">
                                                                    <div className="flex items-center gap-1 shrink-0">
                                                                        <TaskIcon className={`w-3.5 h-3.5 ${styling.color}`} />
                                                                        <span className="text-[11px] font-black text-neutral-850 dark:text-neutral-200">زراعة:</span>
                                                                        <span className="text-[11px] font-bold text-teal-600 dark:text-teal-400">{plantType}</span>
                                                                    </div>
                                                                    {quantity !== undefined && (
                                                                        <span className="bg-teal-500/10 text-teal-600 dark:text-teal-400 text-[9px] font-bold px-1.5 py-0.5 rounded">
                                                                            الكمية: {quantity} {unit}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                            {pNotes && (
                                                                <div className="text-[9.5px] text-neutral-500 dark:text-neutral-400 leading-normal pl-1.5 pr-0.5 flex gap-1 items-baseline">
                                                                    <span className="text-neutral-400 dark:text-neutral-500 shrink-0 select-none">←</span>
                                                                    <span>{pNotes}</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                } else if (task.category === 'عمليات زراعية') {
                                                    const { ops, notes: oNotes } = deserializeAgriOps(task.details);
                                                    return (
                                                        <div key={`${task.id}-${taskIdx}`} className={`p-2 rounded-xl border ${styling.bg} ${styling.border} flex flex-col gap-1`}>
                                                            <div className="flex items-center justify-between flex-wrap gap-2">
                                                                <div className="flex items-center gap-2 flex-wrap flex-1 min-w-0">
                                                                    <div className="flex items-center gap-1 shrink-0">
                                                                        <TaskIcon className={`w-3.5 h-3.5 ${styling.color}`} />
                                                                        <span className="text-[11px] font-black text-neutral-850 dark:text-neutral-200">عمليات زراعية:</span>
                                                                    </div>
                                                                    <div className="flex flex-wrap gap-1">
                                                                        {ops.map((op, idx) => (
                                                                            <span key={idx} className="bg-orange-500/10 text-orange-600 dark:text-orange-400 text-[9px] font-bold px-1.5 py-0.5 rounded">
                                                                                {op}
                                                                            </span>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            {oNotes && (
                                                                <div className="text-[9.5px] text-neutral-500 dark:text-neutral-400 leading-normal pl-1.5 pr-0.5 flex gap-1 items-baseline">
                                                                    <span className="text-neutral-400 dark:text-neutral-500 shrink-0 select-none">←</span>
                                                                    <span>{oNotes}</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                } else {
                                                    // Default tasks fallback (Harvest, labor, others)
                                                    return (
                                                        <div key={`${task.id}-${taskIdx}`} className={`p-2 rounded-xl border ${styling.bg} ${styling.border} flex flex-col gap-1`}>
                                                            <div className="flex items-center justify-between flex-wrap gap-2">
                                                                <div className="flex items-center gap-2 flex-wrap">
                                                                    <div className="flex items-center gap-1 shrink-0">
                                                                        <TaskIcon className={`w-3 h-3 ${styling.color}`} />
                                                                        <span className="text-[11px] font-black text-neutral-850 dark:text-neutral-200">{task.category}</span>
                                                                        {task.subCategory && (
                                                                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded text-neutral-500 dark:text-neutral-400 bg-black/5 dark:bg-white/5">
                                                                                {task.subCategory}
                                                                            </span>
                                                                        )}
                                                                    </div>

                                                                    {/* Worker count, quantity counters inlined neatly */}
                                                                    {(task.workersCount || task.quantity) && (
                                                                        <div className="flex items-center gap-1 font-bold">
                                                                            {task.workersCount && (
                                                                                <span className="text-[9px] text-neutral-500 bg-black/5 dark:bg-white/5 px-1.5 py-0.5 rounded">
                                                                                    العمال: {task.workersCount}
                                                                                </span>
                                                                            )}
                                                                            {task.quantity && (
                                                                                <span className="text-[9px] text-neutral-500 bg-black/5 dark:bg-white/5 px-1.5 py-0.5 rounded">
                                                                                    الكمية: {task.quantity} {task.unit}
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>

                                                            {/* Details Text inline or compact */}
                                                            {task.details && (
                                                                <div className="text-[9.5px] text-neutral-500 dark:text-neutral-400 leading-normal pl-1.5 pr-0.5 flex gap-1 items-baseline">
                                                                    <span className="text-neutral-400 dark:text-neutral-500 shrink-0 select-none">←</span>
                                                                    <span>{task.details}</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                }
                                            }) : (
                                                <div className="text-center py-2 text-neutral-400 text-xs">لا يوجد بنود مسجلة لهذا التاريخ</div>
                                            )}

                                            {/* General Notes for the whole day */}
                                            {log.notes && (
                                                <div className="p-2 bg-neutral-100/40 dark:bg-neutral-800/10 border border-neutral-200/40 dark:border-neutral-800/40 rounded-xl mt-1.5">
                                                    <p className="text-[9.5px] text-neutral-500 dark:text-neutral-400 leading-normal font-semibold">
                                                        <span className="font-bold text-neutral-700 dark:text-neutral-350">الملاحظات العامة:</span> {log.notes}
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

  );
};

export default DailyLogsTable;
