import React, { useState, useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
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
  const parentRef = useRef<HTMLDivElement>(null);

  const rowVirtualizer = useVirtualizer({
    count: filteredLogs.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 80,
    overscan: 5,
  });

  const renderLogItem = (log: DailyLog) => {
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
                <span className="text-2xs font-bold text-neutral-400 dark:text-neutral-500 mt-0.5">{log.cycle}</span>
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
                    className={`inline-flex items-center gap-1 text-2xs font-bold px-2 py-0.5 rounded-md ${styles.bg} ${styles.color} border ${styles.border}`}
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
                  className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center px-2 py-1 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-750 border border-neutral-200/50 dark:border-neutral-700/50 text-neutral-600 dark:text-neutral-300 text-2xs font-black rounded-lg transition-colors cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  onClick={async (e) => {
                    e.stopPropagation();
                    await onDeleteLog(log.id);
                    setConfirmDeleteId(null);
                  }}
                  className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center px-2 py-1 bg-accent-danger hover:bg-accent-danger text-white text-2xs font-black rounded-lg transition-colors cursor-pointer"
                >
                  تأكيد الحذف
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1 animate-in fade-in duration-150">
                <button
                  onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(null); onEditLog(log); }}
                  className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center px-2 py-1 bg-white hover:bg-neutral-100 dark:bg-neutral-800 dark:hover:bg-neutral-750 border border-neutral-200/60 dark:border-neutral-700/60 text-neutral-600 dark:text-neutral-300 text-2xs font-black rounded-lg transition-colors cursor-pointer"
                >
                  تعديل
                </button>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setConfirmDeleteId(log.id);
                  }}
                  className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center p-1 px-1.5 rounded-lg border border-transparent hover:border-accent-danger/20 dark:hover:border-rose-900/30 hover:bg-accent-danger/10 dark:hover:bg-accent-danger/20 text-neutral-400 hover:text-accent-danger transition-colors cursor-pointer"
                  title="حذف"
                  aria-label="حذف"
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
                      <div className="flex items-center gap-2 flex-wrap flex-1 min-w-0">
                        <div className="flex items-center gap-1 shrink-0">
                          <TaskIcon className={`w-3 h-3 ${styling.color}`} />
                          <span className="text-[11px] font-black text-neutral-850 dark:text-neutral-200">{task.category}</span>
                          {task.subCategory && (
                            <span className="text-2xs font-bold px-1.5 py-0.5 rounded text-neutral-500 dark:text-neutral-400 bg-black/5 dark:bg-white/5">
                              {task.subCategory}
                            </span>
                          )}
                        </div>
                        
                        {compounds.length > 0 && compounds[0].name && (
                          <div className="flex flex-wrap gap-1 items-center">
                            {compounds.map((comp, idx) => (
                              <div key={idx} className="bg-black/5 dark:bg-white/5 px-1.5 py-0.5 rounded text-2xs font-bold flex items-center gap-1 text-neutral-600 dark:text-neutral-300">
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
                
                let severityBadge = "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400";
                if (severity.includes('شديدة')) severityBadge = "bg-accent-danger/10 text-accent-danger dark:text-accent-danger font-black animate-pulse";
                else if (severity.includes('خفيفة')) severityBadge = "bg-accent-success/10 text-emerald-650 dark:text-accent-success";

                let statusBadge = "bg-accent-info/10 text-accent-info dark:text-indigo-455";
                if (status.includes('تحت العلاج')) statusBadge = "bg-accent-warning/10 text-accent-warning dark:text-accent-warning font-bold";
                else if (status.includes('تم الشفاء') || status.includes('انتهت')) statusBadge = "bg-accent-success/10 text-accent-success dark:text-accent-success";

                return (
                  <div key={`${task.id}-${taskIdx}`} className={`p-2 rounded-xl border ${styling.bg} ${styling.border} flex flex-col gap-1`}>
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2 flex-wrap flex-1 min-w-0">
                        <div className="flex items-center gap-1 shrink-0">
                          <ShieldAlert className={`w-3 h-3 ${styling.color}`} />
                          <span className="text-[11px] font-black text-neutral-850 dark:text-neutral-200">{pestName || 'إصابة زراعية'}</span>
                        </div>

                        <div className="flex items-center gap-1">
                          {severity && (
                            <span className={`text-2xs font-bold px-1.5 py-0.5 rounded ${severityBadge}`}>
                              {severity}
                            </span>
                          )}
                          {status && (
                            <span className={`text-2xs font-bold px-1.5 py-0.5 rounded ${statusBadge}`}>
                              {status}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {details && (
                      <div className="text-[9.5px] text-neutral-500 dark:text-neutral-400 leading-normal pl-1.5 pr-0.5 flex gap-1 items-baseline">
                        <span className="text-neutral-400 dark:text-neutral-500 shrink-0 select-none">←</span>
                        <span>{details}</span>
                      </div>
                    )}
                  </div>
                );
              } else if (task.category === 'ري') {
                const { waterAmount, duration, details } = deserializeIrrigation(task.details);
                return (
                  <div key={`${task.id}-${taskIdx}`} className={`p-2 rounded-xl border ${styling.bg} ${styling.border} flex flex-col gap-1`}>
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2 flex-wrap flex-1 min-w-0">
                        <div className="flex items-center gap-1 shrink-0">
                          <TaskIcon className={`w-3 h-3 ${styling.color}`} />
                          <span className="text-[11px] font-black text-neutral-850 dark:text-neutral-200">ري المحصول</span>
                        </div>

                        <div className="flex items-center gap-1.5 text-2xs font-bold text-neutral-600 dark:text-neutral-300">
                          {waterAmount && (
                            <span className="bg-black/5 dark:bg-white/5 px-1.5 py-0.5 rounded">
                              الكمية: {waterAmount}
                            </span>
                          )}
                          {duration && (
                            <span className="bg-black/5 dark:bg-white/5 px-1.5 py-0.5 rounded">
                              المدة: {duration}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {details && (
                      <div className="text-[9.5px] text-neutral-500 dark:text-neutral-400 leading-normal pl-1.5 pr-0.5 flex gap-1 items-baseline">
                        <span className="text-neutral-400 dark:text-neutral-500 shrink-0 select-none">←</span>
                        <span>{details}</span>
                      </div>
                    )}
                  </div>
                );
              } else if (task.category === 'زراعة وششتل') {
                const { cropType, quantity, details } = deserializePlanting(task.details);
                return (
                  <div key={`${task.id}-${taskIdx}`} className={`p-2 rounded-xl border ${styling.bg} ${styling.border} flex flex-col gap-1`}>
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2 flex-wrap flex-1 min-w-0">
                        <div className="flex items-center gap-1 shrink-0">
                          <TaskIcon className={`w-3 h-3 ${styling.color}`} />
                          <span className="text-[11px] font-black text-neutral-850 dark:text-neutral-200">{task.category}</span>
                          {cropType && (
                            <span className="text-2xs font-bold px-1.5 py-0.5 rounded text-neutral-500 dark:text-neutral-400 bg-black/5 dark:bg-white/5">
                              {cropType}
                            </span>
                          )}
                        </div>

                        {quantity && (
                          <span className="text-2xs font-bold text-neutral-600 dark:text-neutral-300 bg-black/5 dark:bg-white/5 px-1.5 py-0.5 rounded">
                            العدد: {quantity}
                          </span>
                        )}
                      </div>
                    </div>

                    {details && (
                      <div className="text-[9.5px] text-neutral-500 dark:text-neutral-400 leading-normal pl-1.5 pr-0.5 flex gap-1 items-baseline">
                        <span className="text-neutral-400 dark:text-neutral-500 shrink-0 select-none">←</span>
                        <span>{details}</span>
                      </div>
                    )}
                  </div>
                );
              } else if (task.category === 'عمليات فلاحية' || task.category === 'تجهيز تربة') {
                const { opName, workersCount, duration, details } = deserializeAgriOps(task.details);
                return (
                  <div key={`${task.id}-${taskIdx}`} className={`p-2 rounded-xl border ${styling.bg} ${styling.border} flex flex-col gap-1`}>
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2 flex-wrap flex-1 min-w-0">
                        <div className="flex items-center gap-1 shrink-0">
                          <TaskIcon className={`w-3 h-3 ${styling.color}`} />
                          <span className="text-[11px] font-black text-neutral-850 dark:text-neutral-200">{opName || task.category}</span>
                        </div>

                        <div className="flex items-center gap-1.5 text-2xs font-bold text-neutral-600 dark:text-neutral-300">
                          {workersCount && (
                            <span className="bg-black/5 dark:bg-white/5 px-1.5 py-0.5 rounded">
                              العمال: {workersCount}
                            </span>
                          )}
                          {duration && (
                            <span className="bg-black/5 dark:bg-white/5 px-1.5 py-0.5 rounded">
                              المدة: {duration}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {details && (
                      <div className="text-[9.5px] text-neutral-500 dark:text-neutral-400 leading-normal pl-1.5 pr-0.5 flex gap-1 items-baseline">
                        <span className="text-neutral-400 dark:text-neutral-500 shrink-0 select-none">←</span>
                        <span>{details}</span>
                      </div>
                    )}
                  </div>
                );
              } else {
                return (
                  <div key={`${task.id}-${taskIdx}`} className={`p-2 rounded-xl border ${styling.bg} ${styling.border} flex flex-col gap-1`}>
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2 flex-wrap flex-1 min-w-0">
                        <div className="flex items-center gap-1 shrink-0">
                          <TaskIcon className={`w-3 h-3 ${styling.color}`} />
                          <span className="text-[11px] font-black text-neutral-850 dark:text-neutral-200">{task.category}</span>
                          {task.subCategory && (
                            <span className="text-2xs font-bold px-1.5 py-0.5 rounded text-neutral-500 dark:text-neutral-400 bg-black/5 dark:bg-white/5">
                              {task.subCategory}
                            </span>
                          )}
                        </div>

                        {(task.workersCount || task.quantity) && (
                          <div className="flex items-center gap-1 font-bold">
                            {task.workersCount && (
                              <span className="text-2xs text-neutral-500 bg-black/5 dark:bg-white/5 px-1.5 py-0.5 rounded">
                                العمال: {task.workersCount}
                              </span>
                            )}
                            {task.quantity && (
                              <span className="text-2xs text-neutral-500 bg-black/5 dark:bg-white/5 px-1.5 py-0.5 rounded">
                                الكمية: {task.quantity} {task.unit}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

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
  };

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
      ) : filteredLogs.length < 30 ? (
        // Fallback for short lists (< 30 rows render normally)
        <div className="space-y-2">
          {filteredLogs.map(renderLogItem)}
        </div>
      ) : (
        // Virtualized list for large lists (>= 30 rows)
        <div 
          ref={parentRef}
          className="max-h-[75vh] overflow-y-auto space-y-2 pr-0.5"
        >
          <div
            style={{
              height: `${rowVirtualizer.getTotalSize()}px`,
              width: '100%',
              position: 'relative',
            }}
          >
            {rowVirtualizer.getVirtualItems().map((virtualRow) => {
              const log = filteredLogs[virtualRow.index];
              return (
                <div
                  key={virtualRow.key}
                  data-index={virtualRow.index}
                  ref={rowVirtualizer.measureElement}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    transform: `translateY(${virtualRow.start}px)`,
                  }}
                  className="pb-2"
                >
                  {renderLogItem(log)}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default DailyLogsTable;
