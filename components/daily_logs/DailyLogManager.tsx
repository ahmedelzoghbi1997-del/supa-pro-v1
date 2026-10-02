import React, { useState, useMemo, useEffect } from 'react';
import { useData } from '../../contexts/DataContext';
import {
  Plus,
  Search,
  X,
  Info,
  Sparkles,
} from 'lucide-react';
import type { DailyLog } from '../../types';
import { getArabicDayAndMonth } from './dailyLogUtils';
import { AddEditLogModal } from './forms';
import { DailyLogsTable, WeeklyRadarModal } from './tables';

export const DailyLogManager: React.FC = () => {
    const { dailyLogs, deleteDailyLog, cycles } = useData();
    const [selectedCycleId, setSelectedCycleId] = useState<string>('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingLog, setEditingLog] = useState<DailyLog | null>(null);
    
    // Search & Filter State
    const [searchQuery, setSearchQuery] = useState('');
    const [filterCategory, setFilterCategory] = useState('all');
    const [selectedDateFilter, setSelectedDateFilter] = useState<string | null>(null);

    // View state toggles
    const [isSmartAssistVisible, setIsSmartAssistVisible] = useState(false);
    const [expandedLogIds, setExpandedLogIds] = useState<Record<string, boolean>>({});
    const [isWeeklySummaryOpen, setIsWeeklySummaryOpen] = useState(false);



    // Active cycles lookup
    const activeCycles = useMemo(() => cycles.filter(c => c.status === 'active'), [cycles]);
    const activeCycleIds = useMemo(() => new Set(activeCycles.map(c => c.id)), [activeCycles]);

    // Select first active cycle automatically if none chosen
    useEffect(() => {
        if (!selectedCycleId && activeCycles.length > 0) {
            setSelectedCycleId(activeCycles[0].id);
        }
    }, [activeCycles, selectedCycleId]);

    // Filter Logs (by Cycle, Search, Category, Cell Date)
    const filteredLogs = useMemo(() => {
        let logs = [...dailyLogs];
        
        // Filter by selected cycle
        if (selectedCycleId) {
            logs = logs.filter(l => l.cycle_id === selectedCycleId);
        } else {
            logs = logs.filter(l => activeCycleIds.has(l.cycle_id));
        }

        // Apply specific selected day filter from our interactive week grid
        if (selectedDateFilter) {
            logs = logs.filter(l => l.date === selectedDateFilter);
        }

        // Apply search query
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            logs = logs.filter(l => {
                const notesMatch = l.notes?.toLowerCase().includes(query);
                const cycleMatch = l.cycle?.toLowerCase().includes(query);
                const taskMatch = l.tasks.some(t => 
                    t.category.toLowerCase().includes(query) ||
                    t.subCategory?.toLowerCase().includes(query) ||
                    t.details.toLowerCase().includes(query)
                );
                return notesMatch || cycleMatch || taskMatch || l.date.includes(query);
            });
        }

        // Apply category quick filter
        if (filterCategory !== 'all') {
            logs = logs.filter(l => l.tasks.some(t => {
                if (filterCategory === 'إصابات') {
                    return t.category === 'الاصابات والآفات' || t.category === 'إصابات';
                }
                return t.category === filterCategory;
            }));
        }

        // Sort by date descending
        return logs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [dailyLogs, selectedCycleId, activeCycleIds, searchQuery, filterCategory, selectedDateFilter]);

    // Agricultural Assistant Advisory Alerts
    const alerts = useMemo(() => {
        const alertsList: string[] = [];
        const sortedLogs = [...dailyLogs].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        
        // 1. Red Spider prevention / reminder
        const lastRedSpiderSpray = sortedLogs.find(l => l.tasks.some(t => 
            (t.category === 'رش' && (t.subCategory?.includes('عنكبوت') || t.details.includes('عنكبوت'))) ||
            (t.category === 'الاصابات والآفات' && t.details.includes('عنكبوت'))
        ));
        
        if (lastRedSpiderSpray) {
            const daysSince = Math.floor((new Date().getTime() - new Date(lastRedSpiderSpray.date).getTime()) / (1000 * 3600 * 24));
            if (daysSince >= 7 && daysSince <= 12) {
                alertsList.push(`تنبيه: مر ${daysSince} أيام على آخر مكافحة للعنكبوت الأحمر. يوصى بفحص الأوراق السفلى للتحقق من وجود إصابة جديدة قد تستوجب رشة وقائية.`);
            } else if (daysSince > 12) {
                alertsList.push(`تنبيه حرج: مر أكثر من ${daysSince} يوماً على مكافحة العنكبوت الأحمر. يرجى التدخل فوراً لحماية القمم النامية.`);
            }
        } else {
            alertsList.push("معلومة: لم يتم تسجيل أي رشة لمكافحة العنكبوت الأحمر في العروة الحالية حتى الآن.");
        }

        // 2. preventative downy mildew
        const lastMildewSpray = sortedLogs.find(l => l.tasks.some(t => 
            (t.category === 'رش' && (t.subCategory?.includes('بياض') || t.details.includes('بياض') || t.subCategory?.includes('فطري'))) ||
            (t.category === 'الاصابات والآفات' && t.details.includes('بياض'))
        ));

        if (lastMildewSpray) {
            const daysSince = Math.floor((new Date().getTime() - new Date(lastMildewSpray.date).getTime()) / (1000 * 3600 * 24));
            if (daysSince > 10) {
                alertsList.push(`مر ${daysSince} يوماً بدون رشة وقائية للأعفان والبياض الزغبي. يُنصح بالرش الوقائي مع تغير درجات الحرارة والرطوبة.`);
            }
        }

        // 3. Preventative Root Rot control
        const rootInfection = sortedLogs.find(l => l.tasks.some(t => 
            t.category === 'الاصابات والآفات' && (t.details.includes('أعفان جذور') || t.details.includes('جذور'))
        ));
        if (rootInfection) {
            alertsList.push("تحذير: تم رصد إصابات بأعفان الجذور مسبقاً. يرجى تقليل الري نسبياً وحقن مبيد فطري نحاسي أو هيمكسازول في التسميد القادم.");
        }

        return alertsList;
    }, [dailyLogs]);

    return (
        <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-24 text-neutral-800 dark:text-neutral-100" dir="rtl">
            
            {/* Header section */}
            <div className="flex flex-col justify-between items-start mb-2">
                <div>
                    <h1 className="text-2xl font-black text-neutral-900 dark:text-white">الأجندة الزراعية اليومية</h1>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">تتبع التسميد والرش والعمليات الأسبوعية باحترافية ونقاء</p>
                </div>
            </div>

            {/* Cycle Tabs */}
            {activeCycles.length > 0 && (
                <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0">
                    <button 
                        onClick={() => setSelectedCycleId('')}
                        className={`shrink-0 px-5 py-2.5 rounded-2xl text-xs font-black transition-all ${
                            selectedCycleId === '' 
                            ? 'bg-neutral-900 text-white shadow-md dark:bg-white dark:text-neutral-900' 
                            : 'bg-white text-neutral-500 border border-neutral-150 hover:bg-neutral-50 dark:bg-neutral-900 dark:border-neutral-800 dark:text-neutral-400'
                        }`}
                    >
                        كل العروات النشطة
                    </button>
                    {activeCycles.map(c => (
                        <button 
                            key={c.id} 
                            onClick={() => setSelectedCycleId(c.id)}
                            className={`shrink-0 px-5 py-2.5 rounded-2xl text-xs font-black transition-all ${
                                selectedCycleId === c.id 
                                ? 'bg-neutral-900 text-white shadow-md dark:bg-white dark:text-neutral-900' 
                                : 'bg-white text-neutral-500 border border-neutral-150 hover:bg-neutral-50 dark:bg-neutral-900 dark:border-neutral-800 dark:text-neutral-400'
                            }`}
                        >
                            🌿 عروة: {c.name}
                        </button>
                    ))}
                    
                    {alerts.length > 0 && (
                        <button 
                            onClick={() => setIsSmartAssistVisible(!isSmartAssistVisible)}
                            className={`shrink-0 relative flex items-center justify-center p-2.5 rounded-xl transition-all ${
                                isSmartAssistVisible
                                ? 'bg-accent-warning/10 text-accent-warning dark:bg-accent-warning/20 dark:text-accent-warning shadow-sm'
                                : 'bg-accent-warning/10 text-accent-warning border border-accent-warning/20 hover:bg-accent-warning/10 dark:bg-accent-warning/10 dark:border-accent-warning/20 dark:text-accent-warning'
                            }`}
                            title="تنبيهات المساعد"
                        >
                            <Sparkles className="w-5 h-5" />
                            <span className="absolute -top-1 -left-1 flex items-center justify-center w-4 h-4 bg-accent-danger text-white border border-white dark:border-neutral-900 rounded-full text-2xs font-black">
                                {alerts.length}
                            </span>
                        </button>
                    )}
                </div>
            )}

            {/* Smart Alerts */}
            {alerts.length > 0 && isSmartAssistVisible && (
                <div className="bg-accent-warning/10/80 dark:bg-accent-warning/5 py-3 px-4 rounded-xl border border-accent-warning/20/60 dark:border-accent-warning/20 text-accent-warning dark:text-accent-warning text-xs font-semibold space-y-2 animate-in fade-in shrink-0">
                    <div className="flex items-center gap-2 font-black mb-1">
                        <Info className="w-4 h-4" />
                        <span>توصيات المساعد الذكي:</span>
                    </div>
                    {alerts.map((al, idx) => (
                        <div key={idx} className="flex items-start gap-2 pr-6">
                            <div className="w-1.5 h-1.5 rounded-full bg-accent-warning mt-1.5 shrink-0"></div>
                            <p className="leading-relaxed">{al}</p>
                        </div>
                    ))}
                </div>
            )}

            {/* Summary and Filters Section */}
            <div className="bg-white dark:bg-neutral-900 border border-neutral-200/60 dark:border-neutral-800 rounded-3xl p-4 sm:p-5 shadow-sm space-y-4">
                <div className="flex flex-col md:flex-row gap-3">
                    {/* Search Field */}
                    <div className="flex-1 relative">
                        <Search className="w-5 h-5 text-neutral-400 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <input
                            type="text"
                            placeholder="ابحث في السجلات (اسم العروة، مركب محدد، تشخيص إصابة، تفاصيل)..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pr-11 pl-4 py-3 bg-neutral-50 dark:bg-neutral-800 border-none rounded-2xl text-xs font-bold text-neutral-800 dark:text-neutral-100 placeholder:text-neutral-400 dark:placeholder:text-neutral-500 focus:outline-none focus:ring-1 focus:ring-primary shadow-inner"
                        />
                        {searchQuery && (
                            <button 
                                onClick={() => setSearchQuery('')}
                                className="absolute left-3 top-1/2 -translate-y-1/2 p-1 text-neutral-400 hover:text-neutral-600"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                </div>

                {/* Day Filter Indicator if applicable */}
                {selectedDateFilter && (
                    <div className="flex items-center justify-between bg-primary/5 dark:bg-primary/10 border border-primary/20 px-4 py-2.5 rounded-2xl">
                        <div className="flex items-center gap-2 text-primary font-black text-xs">
                            <Info className="w-4 h-4" />
                            <span>تصفية مخصصة لليوم: {getArabicDayAndMonth(selectedDateFilter).dayName} ({getArabicDayAndMonth(selectedDateFilter).dayOfMonth} {getArabicDayAndMonth(selectedDateFilter).monthName})</span>
                        </div>
                        <button 
                            onClick={() => setSelectedDateFilter(null)}
                            className="text-xs font-black text-accent-danger hover:text-accent-danger flex items-center gap-1 bg-white dark:bg-neutral-800 px-3 py-1.5 rounded-xl border border-accent-danger/20 dark:border-rose-950/60 cursor-pointer shadow-sm"
                        >
                            <span>إلغاء التصفية</span>
                            <X className="w-3 h-3" />
                        </button>
                    </div>
                )}

                {/* Category Switcher Chips & Weekly Summary Button */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                    <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide flex-1">
                        <span className="text-xs font-black text-neutral-400 shrink-0 ml-1">تصفية سريعة:</span>
                        {[
                            { id: 'all', text: 'الكل' },
                            { id: 'رش', text: '🧪 رش وقائي وعلاجي' },
                            { id: 'تسميد', text: '🌿 تسميد ومغذيات' },
                            { id: 'إصابات', text: '🐛 آفات وإصابات' },
                            { id: 'حصاد', text: '🧺 إنتاج وحصاد' },
                            { id: 'عمالة', text: '👨‍🌾 عمالة ويوميات' },
                            { id: 'عمليات أخرى', text: '⚙️ أخرى' }
                        ].map(chip => {
                            const isActive = filterCategory === chip.id;
                            return (
                                <button
                                    key={chip.id}
                                    onClick={() => setFilterCategory(chip.id)}
                                    className={`shrink-0 px-4 py-2 rounded-xl text-xs font-black transition-all border cursor-pointer ${
                                        isActive
                                        ? 'bg-primary border-primary text-white shadow-sm'
                                        : 'bg-white border-neutral-150 text-neutral-600 dark:bg-neutral-900 dark:border-neutral-800 dark:text-neutral-400 hover:bg-neutral-50'
                                    }`}
                                >
                                    {chip.text}
                                </button>
                            );
                        })}
                    </div>

                    {/* Weekly Summary Button */}
                    <button
                        onClick={() => setIsWeeklySummaryOpen(true)}
                        className="shrink-0 flex items-center justify-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-black bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-md hover:shadow-lg transition-all duration-200 cursor-pointer border border-teal-500/10 tap"
                    >
                        <span>📊 ملخص الأسبوع</span>
                    </button>
                </div>
            </div>

            {/* Timeline cards list (Table Component) */}
            <DailyLogsTable
                filteredLogs={filteredLogs}
                expandedLogIds={expandedLogIds}
                setExpandedLogIds={setExpandedLogIds}
                searchQuery={searchQuery}
                filterCategory={filterCategory}
                selectedDateFilter={selectedDateFilter}
                onResetFilters={() => {
                    setSearchQuery('');
                    setFilterCategory('all');
                    setSelectedDateFilter(null);
                }}
                onEditLog={(log) => {
                    setEditingLog(log);
                    setIsModalOpen(true);
                }}
                onDeleteLog={async (id) => {
                    await deleteDailyLog(id);
                }}
            />
            {/* Floating Action Button (FAB) */}
            <button
                onClick={() => { setEditingLog(null); setIsModalOpen(true); }}
                className="fixed bottom-24 left-6 z-50 flex items-center justify-center w-14 h-14 bg-primary hover:bg-opacity-95 text-white rounded-2xl font-black shadow-2xl shadow-emerald-500/20 tap transition-all text-sm cursor-pointer lg:bottom-10"
            >
                <Plus className="w-6 h-6" />
            </button>

            {/* Combined Modal for Add / Edit Log */}
            {isModalOpen && (
                <AddEditLogModal 
                    onClose={() => { setIsModalOpen(false); setEditingLog(null); }} 
                    activeCycles={activeCycles} 
                    currentSelectedCycleId={selectedCycleId}
                    editingRecord={editingLog}
                />
            )}

            {/* Weekly Summary Modal */}
            {isWeeklySummaryOpen && (
                <WeeklyRadarModal 
                    onClose={() => setIsWeeklySummaryOpen(false)}
                    dailyLogs={dailyLogs}
                    selectedCycleId={selectedCycleId}
                    activeCycleIds={activeCycleIds}
                />
            )}
        </div>
    );
};

export default DailyLogManager;
