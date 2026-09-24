import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useData } from '../../contexts/DataContext';
import { 
    Calendar, Plus, Sparkles, Trash2, X, Sprout, Users, 
    Lightbulb, Shield, ShieldAlert, ShoppingBag, ChevronDown,
    Search, Info,
    PlusCircle, Droplet, Wrench, ChevronLeft, ChevronRight, Leaf
} from 'lucide-react';
import { DailyLog, DailyLogTask } from '../../types';
import { getLocalDateString } from '../../utils/helpers';

// Categories and Lists
const COMMON_PESTS = ['عنكبوت أحمر', 'بياض زغبي', 'ذبابة بيضاء', 'صانعة أنفاق', 'توتة أبسلوتا', 'بياض دقيقي', 'أعفان جذور', 'نيماتودا', 'أخرى'];
const COMMON_COMPOUNDS_SPRAY = ['بوتاسيوم', 'فسفور', 'أحماض أمينية', 'مبيد فطري', 'مبيد حشري', 'عناصر صغرى', 'كالسيوم بورون', 'كبريت ميكروني', 'نحاس'];
const COMMON_COMPOUNDS_FERT = ['نترات نشادر', 'سلفات نشادر', 'حامض فسفوريك', 'سلفات بوتاسيوم', 'نترات كالسيوم', 'سلفات ماغنسيوم', 'حديد مخلبي', 'ماب (MAP)'];
const COMMON_AGRI_OPS = [
    'تهريش وإزالة حشائش',
    'لف النبات على الخيط',
    'تلقيم وتلقيح',
    'تربيط السيقان',
    'تقليم وتطهير الأوراق',
    'تهوية وتظليل الصوبة',
    'تنظيف المشايات والمصاطب'
];

const serializeCompounds = (compounds: Array<{ name: string; amount: string }>, detailsText: string) => {
    const compStr = compounds
        .filter(c => c.name.trim())
        .map(c => `[${c.name.trim()}${c.amount.trim() ? ` - ${c.amount.trim()}` : ''}]`)
        .join(' ');
    return `المركبات: ${compStr || 'لا يوجد'} \nالتفاصيل: ${detailsText.trim()}`;
};

const deserializeCompounds = (detailsStr: string): { compounds: Array<{ name: string; amount: string }>, detailsText: string } => {
    if (!detailsStr || !detailsStr.startsWith('المركبات: ')) {
        return { compounds: [{ name: '', amount: '' }], detailsText: detailsStr || '' };
    }
    
    try {
        const parts = detailsStr.split('\nالتفاصيل: ');
        const compPart = parts[0].replace('المركبات: ', '').trim();
        const detailsText = parts[1] || '';
        
        if (!compPart || compPart === 'لا يوجد') {
            return { compounds: [{ name: '', amount: '' }], detailsText };
        }
        
        const matches = compPart.match(/\[(.*?)\]/g) || [];
        const compounds = matches.map(m => {
            const cleaned = m.slice(1, -1); // remove [ and ]
            const splitIdx = cleaned.indexOf(' - ');
            if (splitIdx !== -1) {
                return {
                    name: cleaned.slice(0, splitIdx).trim(),
                    amount: cleaned.slice(splitIdx + 3).trim()
                };
            }
            return { name: cleaned.trim(), amount: '' };
        });
        
        if (compounds.length === 0) {
            return { compounds: [{ name: '', amount: '' }], detailsText };
        }
        return { compounds, detailsText };
    } catch {
        return { compounds: [{ name: '', amount: '' }], detailsText: detailsStr };
    }
};

const serializePest = (pestName: string, severity: string, status: string, details: string) => {
    return `الإصابة: ${pestName} \nالشدة: ${severity} \nالحالة: ${status} \nتفاصيل: ${details}`;
};

const deserializePest = (text: string) => {
    if (!text || !text.startsWith('الإصابة: ')) {
        return { pestName: text || '', severity: 'خفيفة', status: 'نشطة وتحت العلاج', details: text || '' };
    }
    try {
        const lines = text.split('\n');
        let pestName = '';
        let severity = 'خفيفة';
        let status = 'نشطة وتحت العلاج';
        let details = '';

        lines.forEach(line => {
            if (line.startsWith('الإصابة: ')) pestName = line.replace('الإصابة: ', '').trim();
            else if (line.startsWith('الشدة: ')) severity = line.replace('الشدة: ', '').trim();
            else if (line.startsWith('الحالة: ')) status = line.replace('الحالة: ', '').trim();
            else if (line.startsWith('تفاصيل: ')) details = line.replace('تفاصيل: ', '').trim();
        });

        return { pestName, severity, status, details };
    } catch {
        return { pestName: '', severity: 'خفيفة', status: 'نشطة وتحت العلاج', details: text };
    }
};

const serializeIrrigation = (morning: boolean, morningMin: number | '', evening: boolean, eveningMin: number | '', notes: string) => {
    return `ري صباحي: ${morning ? `${morningMin || 0} دقيقة` : 'لا يوجد'} | ري مسائي: ${evening ? `${eveningMin || 0} دقيقة` : 'لا يوجد'} \nالملاحظات: ${notes.trim()}`;
};

const deserializeIrrigation = (text: string) => {
    if (!text || !text.startsWith('ري صباحي: ')) {
        return { morning: false, morningMin: '', evening: false, eveningMin: '', notes: text || '' };
    }
    try {
        const morningPart = text.split(' | ')[0].replace('ري صباحي: ', '').trim();
        const eveningPart = text.split(' | ')[1].split('\n')[0].replace('ري مسائي: ', '').trim();
        const notesPart = text.includes('\nالملاحظات: ') ? text.split('\nالملاحظات: ')[1].trim() : '';

        const morning = morningPart !== 'لا يوجد';
        const morningMin = morning ? parseInt(morningPart.replace(' دقيقة', '')) || '' : '';

        const evening = eveningPart !== 'لا يوجد';
        const eveningMin = evening ? parseInt(eveningPart.replace(' دقيقة', '')) || '' : '';

        return { morning, morningMin, evening, eveningMin, notes: notesPart };
    } catch {
        return { morning: false, morningMin: '', evening: false, eveningMin: '', notes: text };
    }
};

const serializePlanting = (plantType: string, quantity: number | '', unit: string, notes: string) => {
    return `المحصول: ${plantType.trim()} | الكمية: ${quantity !== '' ? `${quantity} ${unit}` : 'غير محدد'} \nتفاصيل: ${notes.trim()}`;
};

const deserializePlanting = (text: string) => {
    if (!text || !text.startsWith('المحصول: ')) {
        return { plantType: '', quantity: '', unit: 'شتلة', notes: text || '' };
    }
    try {
        const plantTypePart = text.split(' | ')[0].replace('المحصول: ', '').trim();
        const qtyPart = text.split(' | ')[1].split('\n')[0].replace('الكمية: ', '').trim();
        const notesPart = text.includes('\nتفاصيل: ') ? text.split('\nتفاصيل: ')[1].trim() : '';

        let quantity: number | '' = '';
        let unit = 'شتلة';
        if (qtyPart !== 'غير محدد') {
            const spaceIdx = qtyPart.indexOf(' ');
            if (spaceIdx !== -1) {
                quantity = parseInt(qtyPart.slice(0, spaceIdx)) || '';
                unit = qtyPart.slice(spaceIdx + 1).trim();
            }
        }
        return { plantType: plantTypePart, quantity, unit, notes: notesPart };
    } catch {
        return { plantType: '', quantity: '', unit: 'شتلة', notes: text };
    }
};

const serializeAgriOps = (ops: string[], notes: string) => {
    return `العمليات: ${ops.join('، ') || 'لا يوجد'} \nملاحظات: ${notes.trim()}`;
};

const deserializeAgriOps = (text: string) => {
    if (!text || !text.startsWith('العمليات: ')) {
        return { ops: [], notes: text || '' };
    }
    try {
        const parts = text.split('\nملاحظات: ');
        const opsStr = parts[0].replace('العمليات: ', '').trim();
        const notes = parts[1] || '';
        const ops = opsStr === 'لا يوجد' ? [] : opsStr.split('، ').map(o => o.trim());
        return { ops, notes };
    } catch {
        return { ops: [], notes: text };
    }
};

const deduplicateTasks = (taskList: DailyLogTask[]): DailyLogTask[] => {
    const seen = new Set<string>();
    return taskList.map(t => ({
        ...t,
        id: t.id || crypto.randomUUID()
    })).filter(t => {
        if (seen.has(t.id)) {
            return false;
        }
        seen.add(t.id);
        return true;
    });
};

const getCategoryStyles = (category: string) => {
    switch(category) {
        case 'ري':
            return { icon: Droplet, color: 'text-sky-500 dark:text-sky-400', bg: 'bg-sky-50 dark:bg-sky-900/10', border: 'border-sky-100 dark:border-sky-800/40', badge: 'bg-sky-100 dark:bg-sky-900/40 text-sky-800 dark:text-sky-300' };
        case 'تسميد': 
            return { icon: Sprout, color: 'text-emerald-500 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/10', border: 'border-emerald-100 dark:border-emerald-800/40', badge: 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300' };
        case 'رش': 
            return { icon: Shield, color: 'text-indigo-500 dark:text-indigo-400', bg: 'bg-indigo-50 dark:bg-indigo-900/10', border: 'border-indigo-100 dark:border-indigo-800/40', badge: 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-800 dark:text-indigo-300' };
        case 'عمليات زراعية':
            return { icon: Wrench, color: 'text-orange-500 dark:text-orange-400', bg: 'bg-orange-50 dark:bg-orange-900/10', border: 'border-orange-100 dark:border-orange-800/40', badge: 'bg-orange-100 dark:bg-orange-900/40 text-orange-800 dark:text-orange-300' };
        case 'زراعة':
            return { icon: Sprout, color: 'text-teal-500 dark:text-teal-400', bg: 'bg-teal-50 dark:bg-teal-900/10', border: 'border-teal-100 dark:border-teal-800/40', badge: 'bg-teal-100 dark:bg-teal-900/40 text-teal-800 dark:text-teal-300' };
        case 'الاصابات والآفات': 
        case 'إصابات': 
            return { icon: ShieldAlert, color: 'text-rose-500 dark:text-rose-400', bg: 'bg-rose-50 dark:bg-rose-900/10', border: 'border-rose-100 dark:border-rose-800/40', badge: 'bg-rose-100 dark:bg-rose-900/40 text-rose-800 dark:text-rose-300' };
        case 'حصاد': 
            return { icon: ShoppingBag, color: 'text-amber-555 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-900/10', border: 'border-amber-100 dark:border-amber-800/40', badge: 'bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300' };
        case 'عمالة': 
            return { icon: Users, color: 'text-blue-500 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-900/10', border: 'border-blue-100 dark:border-blue-800/40', badge: 'bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300' };
        default: 
            return { icon: Lightbulb, color: 'text-purple-500 dark:text-purple-400', bg: 'bg-purple-50 dark:bg-purple-900/10', border: 'border-purple-100 dark:border-purple-800/40', badge: 'bg-purple-100 dark:bg-purple-900/40 text-purple-800 dark:text-purple-300' };
    }
};

export const DailyLogManager: React.FC = () => {
    const { dailyLogs, deleteDailyLog, cycles } = useData();
    const [selectedCycleId, setSelectedCycleId] = useState<string>('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingLog, setEditingLog] = useState<DailyLog | null>(null);
    const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
    
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

    // Format Arabic dates
    const getArabicDayAndMonth = (dateStr: string) => {
        const dateObj = new Date(dateStr);
        const dayOfMonth = dateObj.getDate();
        const monthName = dateObj.toLocaleDateString('ar-EG', { month: 'short' });
        const dayName = dateObj.toLocaleDateString('ar-EG', { weekday: 'long' });
        return { dayOfMonth, monthName, dayName };
    };

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
                                ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 shadow-sm'
                                : 'bg-amber-50 text-amber-600 border border-amber-200 hover:bg-amber-100 dark:bg-amber-500/10 dark:border-amber-500/20 dark:text-amber-500'
                            }`}
                            title="تنبيهات المساعد"
                        >
                            <Sparkles className="w-5 h-5" />
                            <span className="absolute -top-1 -left-1 flex items-center justify-center w-4 h-4 bg-red-500 text-white border border-white dark:border-neutral-900 rounded-full text-[10px] font-black">
                                {alerts.length}
                            </span>
                        </button>
                    )}
                </div>
            )}

            {/* Smart Alerts */}
            {alerts.length > 0 && isSmartAssistVisible && (
                <div className="bg-amber-50/80 dark:bg-amber-500/5 py-3 px-4 rounded-xl border border-amber-200/60 dark:border-amber-500/20 text-amber-800 dark:text-amber-400 text-xs font-semibold space-y-2 animate-in fade-in shrink-0">
                    <div className="flex items-center gap-2 font-black mb-1">
                        <Info className="w-4 h-4" />
                        <span>توصيات المساعد الذكي:</span>
                    </div>
                    {alerts.map((al, idx) => (
                        <div key={idx} className="flex items-start gap-2 pr-6">
                            <div className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0"></div>
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
                            className="text-xs font-black text-rose-500 hover:text-rose-600 flex items-center gap-1 bg-white dark:bg-neutral-800 px-3 py-1.5 rounded-xl border border-rose-100 dark:border-rose-950/60 cursor-pointer shadow-sm"
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
                        className="shrink-0 flex items-center justify-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-black bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-md hover:shadow-lg transition-all duration-200 cursor-pointer border border-teal-500/10 active:scale-95"
                    >
                        <span>📊 ملخص الأسبوع</span>
                    </button>
                </div>
            </div>

            {/* Timeline cards list */}
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
                                onClick={() => { setSearchQuery(''); setFilterCategory('all'); setSelectedDateFilter(null); }}
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
                                                                await deleteDailyLog(log.id);
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
                                                            onClick={(e) => { 
                                                                e.stopPropagation(); 
                                                                setConfirmDeleteId(null);
                                                                setEditingLog(log); 
                                                                setIsModalOpen(true); 
                                                            }}
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

            {/* Floating Action Button (FAB) */}
            <button
                onClick={() => { setEditingLog(null); setIsModalOpen(true); }}
                className="fixed bottom-24 left-6 z-50 flex items-center justify-center w-14 h-14 bg-primary hover:bg-opacity-95 text-white rounded-2xl font-black shadow-2xl shadow-emerald-500/20 active:scale-95 transition-all text-sm cursor-pointer lg:bottom-10"
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

// Modal Component for Weekly Summary (Weekly Matrix Radar)
interface WeeklyRadarModalProps {
    onClose: () => void;
    dailyLogs: DailyLog[];
    selectedCycleId: string;
    activeCycleIds: Set<string>;
}

const WeeklyRadarModal: React.FC<WeeklyRadarModalProps> = ({ onClose, dailyLogs, selectedCycleId, activeCycleIds }) => {
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

// Modal Component for Add & Edit
interface AddEditLogModalProps {
    onClose: () => void;
    activeCycles: any[];
    currentSelectedCycleId: string;
    editingRecord: DailyLog | null;
}

const AddEditLogModal: React.FC<AddEditLogModalProps> = ({ onClose, activeCycles, currentSelectedCycleId, editingRecord }) => {
    const { addDailyLog, updateDailyLog, dailyLogs } = useData();
    const [date, setDate] = useState(getLocalDateString());
    const [cycleId, setCycleId] = useState('');

    // Accordion/collapsible cards toggle state
    const [openSections, setOpenSections] = useState<Record<string, boolean>>({
        irrigation: true,
        fertilization: false,
        protection: false,
        operations: false,
        harvest: false,
        planting: false
    });

    // Main tasks IDs mapping to keep track of loaded tasks
    const [taskIds, setTaskIds] = useState<Record<string, string>>({});
    const [notes, setNotes] = useState('');

    // --- Unified Subform States ---
    
    // 1. Irrigation
    const [irrigationMorningMinutes, setIrrigationMorningMinutes] = useState<number | ''>('');
    const [irrigationEveningMinutes, setIrrigationEveningMinutes] = useState<number | ''>('');
    const [irrigationNotes, setIrrigationNotes] = useState('');

    // 2. Fertilization
    const [fertilizationCompounds, setFertilizationCompounds] = useState<Array<{ name: string; amount: string }>>([
        { name: '', amount: '' },
        { name: '', amount: '' }
    ]);
    const [fertilizationNotes, setFertilizationNotes] = useState('');

    // 3. Spraying & Pests (Protection)
    const [sprayingCompounds, setSprayingCompounds] = useState<Array<{ name: string; amount: string }>>([
        { name: '', amount: '' },
        { name: '', amount: '' }
    ]);
    const [sprayingNotes, setSprayingNotes] = useState('');
    const [pestName, setPestName] = useState('');
    const [pestSeverity, setPestSeverity] = useState('متوسطة');
    const [pestStatus, setPestStatus] = useState('نشطة وتحت العلاج');
    const [pestNotes, setPestNotes] = useState('');

    // 4. Agri Operations & Labor
    const [selectedAgriOps, setSelectedAgriOps] = useState<string[]>([]);
    const [opsNotes, setOpsNotes] = useState('');
    const [workersCount, setWorkersCount] = useState<number | ''>('');

    // 5. Harvest
    const [harvestQuantity, setHarvestQuantity] = useState<number | ''>('');
    const [harvestUnit, setHarvestUnit] = useState('قفص');
    const [harvestNotes, setHarvestNotes] = useState('');

    // 6. Planting
    const [plantType, setPlantType] = useState('');
    const [plantingQty, setPlantingQty] = useState<number | ''>('');
    const [plantingUnit, setPlantingUnit] = useState('شتلة');
    const [plantingNotes, setPlantingNotes] = useState('');

    // Helper functions for compounds rows
    const handleAddFertCompoundRow = () => {
        setFertilizationCompounds([...fertilizationCompounds, { name: '', amount: '' }]);
    };
    const handleRemoveFertCompoundRow = (index: number) => {
        setFertilizationCompounds(fertilizationCompounds.filter((_, i) => i !== index));
    };
    const handleFertCompoundChange = (index: number, key: 'name' | 'amount', val: string) => {
        const copy = [...fertilizationCompounds];
        copy[index][key] = val;
        setFertilizationCompounds(copy);
    };

    const handleAddSprayCompoundRow = () => {
        setSprayingCompounds([...sprayingCompounds, { name: '', amount: '' }]);
    };
    const handleRemoveSprayCompoundRow = (index: number) => {
        setSprayingCompounds(sprayingCompounds.filter((_, i) => i !== index));
    };
    const handleSprayCompoundChange = (index: number, key: 'name' | 'amount', val: string) => {
        const copy = [...sprayingCompounds];
        copy[index][key] = val;
        setSprayingCompounds(copy);
    };

    const toggleSection = (sec: string) => {
        setOpenSections(prev => ({ ...prev, [sec]: !prev[sec] }));
    };

    const handleExpandAll = () => {
        setOpenSections({
            irrigation: true,
            fertilization: true,
            protection: true,
            operations: true,
            harvest: true,
            planting: true
        });
    };

    const handleCollapseAll = () => {
        setOpenSections({
            irrigation: false,
            fertilization: false,
            protection: false,
            operations: false,
            harvest: false,
            planting: false
        });
    };

    const isSectionActive = (sec: string) => {
        switch (sec) {
            case 'irrigation':
                return irrigationMorningMinutes !== '' || irrigationEveningMinutes !== '';
            case 'fertilization':
                return fertilizationCompounds.some(c => c.name.trim()) || fertilizationNotes.trim() !== '';
            case 'protection':
                return sprayingCompounds.some(c => c.name.trim()) || sprayingNotes.trim() !== '' || pestName.trim() !== '';
            case 'operations':
                return selectedAgriOps.length > 0 || workersCount !== '' || opsNotes.trim() !== '';
            case 'harvest':
                return harvestQuantity !== '' || harvestNotes.trim() !== '';
            case 'planting':
                return plantType.trim() !== '';
            default:
                return false;
        }
    };

    // Populate form states from task array
    const populateFormFromTasks = (taskList: DailyLogTask[]) => {
        setIrrigationMorningMinutes('');
        setIrrigationEveningMinutes('');
        setIrrigationNotes('');

        setFertilizationCompounds([{ name: '', amount: '' }, { name: '', amount: '' }]);
        setFertilizationNotes('');

        setSprayingCompounds([{ name: '', amount: '' }, { name: '', amount: '' }]);
        setSprayingNotes('');
        setPestName('');
        setPestSeverity('متوسطة');
        setPestStatus('نشطة وتحت العلاج');
        setPestNotes('');

        setSelectedAgriOps([]);
        setOpsNotes('');
        setWorkersCount('');

        setHarvestQuantity('');
        setHarvestUnit('قفص');
        setHarvestNotes('');

        setPlantType('');
        setPlantingQty('');
        setPlantingUnit('شتلة');
        setPlantingNotes('');

        const ids: Record<string, string> = {};

        taskList.forEach(task => {
            ids[task.category] = task.id;

            switch (task.category) {
                case 'ري': {
                    const { morning, morningMin, evening, eveningMin, notes: irrNotes } = deserializeIrrigation(task.details);
                    if (morning) setIrrigationMorningMinutes(morningMin);
                    if (evening) setIrrigationEveningMinutes(eveningMin);
                    setIrrigationNotes(irrNotes || '');
                    break;
                }
                case 'تسميد': {
                    const { compounds: parsed, detailsText } = deserializeCompounds(task.details);
                    setFertilizationCompounds(parsed.length > 0 ? parsed : [{ name: '', amount: '' }]);
                    setFertilizationNotes(detailsText || '');
                    break;
                }
                case 'رش': {
                    const { compounds: parsed, detailsText } = deserializeCompounds(task.details);
                    setSprayingCompounds(parsed.length > 0 ? parsed : [{ name: '', amount: '' }]);
                    setSprayingNotes(detailsText || '');
                    break;
                }
                case 'الاصابات والآفات':
                case 'إصابات': {
                    const { pestName: pName, severity, status, details: pNotes } = deserializePest(task.details);
                    setPestName(pName);
                    setPestSeverity(severity || 'متوسطة');
                    setPestStatus(status || 'نشطة وتحت العلاج');
                    setPestNotes(pNotes || '');
                    break;
                }
                case 'عمليات زراعية': {
                    const { ops, notes: oNotes } = deserializeAgriOps(task.details);
                    setSelectedAgriOps(ops);
                    setOpsNotes(oNotes || '');
                    break;
                }
                case 'عمالة': {
                    setWorkersCount(task.workersCount !== undefined ? task.workersCount : '');
                    break;
                }
                case 'حصاد': {
                    setHarvestQuantity(task.quantity !== undefined ? task.quantity : '');
                    setHarvestUnit(task.unit || 'قفص');
                    setHarvestNotes(task.details || '');
                    break;
                }
                case 'زراعة': {
                    const { plantType: pType, quantity: pQty, unit: pUnit, notes: pNotes } = deserializePlanting(task.details);
                    setPlantType(pType);
                    setPlantingQty(pQty);
                    setPlantingUnit(pUnit);
                    setPlantingNotes(pNotes || '');
                    break;
                }
            }
        });

        setTaskIds(ids);
    };

    // Prepopulate or auto-select values
    useEffect(() => {
        if (editingRecord) {
            setDate(editingRecord.date);
            setCycleId(editingRecord.cycle_id);
            populateFormFromTasks(deduplicateTasks(editingRecord.tasks));
            setNotes(editingRecord.notes || '');
            setOpenSections({
                irrigation: true,
                fertilization: true,
                protection: true,
                operations: true,
                harvest: true,
                planting: true
            });
        } else {
            setDate(getLocalDateString());
            setCycleId(currentSelectedCycleId || (activeCycles[0]?.id || ''));
            populateFormFromTasks([]);
            setNotes('');
            setOpenSections({
                irrigation: true,
                fertilization: false,
                protection: false,
                operations: false,
                harvest: false,
                planting: false
            });
        }
    }, [editingRecord, currentSelectedCycleId, activeCycles]);

    // Check if log already exists on this date and is not the one we are currently editing
    const existingDateLog = useMemo(() => {
        if (editingRecord) return null; // editing mode overrides date warning
        return dailyLogs.find(l => l.date === date && l.cycle_id === cycleId);
    }, [dailyLogs, date, cycleId, editingRecord]);

    // Populate tasks and notes if matching log exists for adding more easily
    useEffect(() => {
        if (existingDateLog && !editingRecord) {
            populateFormFromTasks(deduplicateTasks(existingDateLog.tasks));
            setNotes(existingDateLog.notes || '');
            const hasIrr = existingDateLog.tasks.some(t => t.category === 'ري');
            const hasFert = existingDateLog.tasks.some(t => t.category === 'تسميد');
            const hasProt = existingDateLog.tasks.some(t => t.category === 'رش' || t.category === 'الاصابات والآفات' || t.category === 'إصابات');
            const hasOps = existingDateLog.tasks.some(t => t.category === 'عمليات زراعية' || t.category === 'عمالة');
            const hasHarv = existingDateLog.tasks.some(t => t.category === 'حصاد');
            const hasPlant = existingDateLog.tasks.some(t => t.category === 'زراعة');
            setOpenSections({
                irrigation: hasIrr,
                fertilization: hasFert,
                protection: hasProt,
                operations: hasOps,
                harvest: hasHarv,
                planting: hasPlant
            });
        }
    }, [existingDateLog, editingRecord]);

    const handleSaveProcess = async () => {
        if (!cycleId) {
            alert('يرجى اختيار عروة الموسم قبل المتابعة');
            return;
        }

        const getTaskId = (category: string) => taskIds[category] || crypto.randomUUID();
        const finalTasks: DailyLogTask[] = [];

        // 1. Irrigation (ري)
        const isIrrigationFilled = irrigationMorningMinutes !== '' || irrigationEveningMinutes !== '';
        if (isIrrigationFilled) {
            const hasMorning = irrigationMorningMinutes !== '' && Number(irrigationMorningMinutes) > 0;
            const hasEvening = irrigationEveningMinutes !== '' && Number(irrigationEveningMinutes) > 0;
            const details = serializeIrrigation(hasMorning, irrigationMorningMinutes, hasEvening, irrigationEveningMinutes, irrigationNotes);
            const subParts = [];
            if (hasMorning) subParts.push(`صباحاً: ${irrigationMorningMinutes} د`);
            if (hasEvening) subParts.push(`مساءً: ${irrigationEveningMinutes} د`);
            
            finalTasks.push({
                id: getTaskId('ري'),
                category: 'ري',
                subCategory: subParts.join(' | ') || 'تم الري',
                details
            });
        }

        // 2. Fertilization (تسميد)
        const filledFertCompounds = fertilizationCompounds.filter(c => c.name.trim());
        if (filledFertCompounds.length > 0 || fertilizationNotes.trim() !== '') {
            const details = serializeCompounds(filledFertCompounds, fertilizationNotes);
            const subCategory = filledFertCompounds.map(c => c.name.trim()).join('، ') || 'تسميد ومغذيات';
            finalTasks.push({
                id: getTaskId('تسميد'),
                category: 'تسميد',
                subCategory,
                details
            });
        }

        // 3. Spraying (رش)
        const filledSprayCompounds = sprayingCompounds.filter(c => c.name.trim());
        if (filledSprayCompounds.length > 0 || sprayingNotes.trim() !== '') {
            const details = serializeCompounds(filledSprayCompounds, sprayingNotes);
            const subCategory = filledSprayCompounds.map(c => c.name.trim()).join('، ') || 'رش وقائي/علاجي';
            finalTasks.push({
                id: getTaskId('رش'),
                category: 'رش',
                subCategory,
                details
            });
        }

        // 4. Pests & Infections (الاصابات والآفات)
        if (pestName.trim()) {
            const details = serializePest(pestName.trim(), pestSeverity, pestStatus, pestNotes.trim());
            finalTasks.push({
                id: getTaskId('الاصابات والآفات'),
                category: 'الاصابات والآفات',
                subCategory: pestName.trim(),
                details
            });
        }

        // 5. AgriOps (عمليات زراعية)
        if (selectedAgriOps.length > 0 || opsNotes.trim() !== '') {
            const details = serializeAgriOps(selectedAgriOps, opsNotes);
            const subCategory = selectedAgriOps.slice(0, 2).join('، ') + (selectedAgriOps.length > 2 ? '...' : '') || 'عملية زراعية';
            finalTasks.push({
                id: getTaskId('عمليات زراعية'),
                category: 'عمليات زراعية',
                subCategory,
                details
            });
        }

        // 6. Labor (عمالة)
        if (workersCount !== '') {
            finalTasks.push({
                id: getTaskId('عمالة'),
                category: 'عمالة',
                workersCount: Number(workersCount),
                details: 'تم توظيف العمالة في الصوبة الزراعية'
            });
        }

        // 7. Harvest (حصاد)
        if (harvestQuantity !== '' || harvestNotes.trim() !== '') {
            finalTasks.push({
                id: getTaskId('حصاد'),
                category: 'حصاد',
                quantity: harvestQuantity !== '' ? Number(harvestQuantity) : undefined,
                unit: harvestUnit,
                details: harvestNotes.trim()
            });
        }

        // 8. Planting (زراعة)
        if (plantType.trim()) {
            const details = serializePlanting(plantType.trim(), plantingQty, plantingUnit, plantingNotes);
            finalTasks.push({
                id: getTaskId('زراعة'),
                category: 'زراعة',
                subCategory: plantType.trim(),
                details
            });
        }

        if (finalTasks.length === 0 && !notes.trim()) {
            alert('يرجى تعبئة قسم واحد على الأقل قبل حفظ يوميات الصوبة');
            return;
        }

        try {
            if (editingRecord) {
                await updateDailyLog({
                    ...editingRecord,
                    cycle_id: cycleId,
                    date,
                    tasks: deduplicateTasks(finalTasks),
                    notes: notes.trim()
                });
            } else if (existingDateLog) {
                await updateDailyLog({
                    ...existingDateLog,
                    tasks: deduplicateTasks(finalTasks),
                    notes: notes.trim() 
                        ? (existingDateLog.notes ? (existingDateLog.notes.includes(notes.trim()) ? existingDateLog.notes : `${existingDateLog.notes}\n${notes.trim()}`.trim()) : notes.trim())
                        : (existingDateLog.notes || '')
                });
            } else {
                await addDailyLog({
                    id: crypto.randomUUID(),
                    cycle_id: cycleId,
                    date,
                    tasks: deduplicateTasks(finalTasks),
                    notes: notes.trim()
                });
            }
            onClose();
        } catch (e) {
            console.error(e);
            alert('حدث خطأ أثناء حفظ السجل');
        }
    };

    return createPortal(
        <div className="fixed inset-0 z-[99999] flex flex-col bg-white dark:bg-neutral-900 animate-in fade-in duration-200 sm:p-4 sm:bg-neutral-900/60 sm:items-center sm:justify-center">
            <div className="flex flex-col w-full bg-white dark:bg-neutral-900 sm:max-w-2xl sm:rounded-3xl sm:max-h-[92vh] h-full sm:h-auto shadow-2xl relative overflow-hidden" dir="rtl">
                
                {/* Header */}
                <div className="flex justify-between items-center py-4.5 px-5 border-b border-neutral-100 dark:border-neutral-800 shrink-0 bg-white dark:bg-neutral-900 z-10">
                    <div>
                        <h2 className="text-base font-black text-neutral-800 dark:text-neutral-100 flex items-center gap-2">
                            <PlusCircle className="w-5 h-5 text-primary" />
                            <span>{editingRecord ? 'تعديل الأجندة الزراعية' : 'صناعة تدوينة زراعية جديدة'}</span>
                        </h2>
                    </div>
                    <button onClick={onClose} className="p-2 text-neutral-500 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>
                
                <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
                    {/* Date and Cycle Selectors */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 bg-neutral-50 dark:bg-neutral-800/20 p-3.5 rounded-2xl border border-neutral-100 dark:border-neutral-800/40">
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-neutral-400">عروة الموسم</label>
                            <div className="relative">
                                <select 
                                    className="w-full pl-8 pr-3 py-3 bg-white dark:bg-neutral-900 border-none rounded-xl text-xs font-black text-neutral-700 dark:text-neutral-200 appearance-none focus:ring-1 focus:ring-primary shadow-sm" 
                                    value={cycleId} 
                                    onChange={e => setCycleId(e.target.value)}
                                >
                                    <option value="" disabled>اختر العروة...</option>
                                    {activeCycles.map(c => <option key={c.id} value={c.id}>🌿 {c.name}</option>)}
                                </select>
                                <ChevronDown className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-neutral-400">تاريخ العملية</label>
                            <input 
                                type="date" 
                                className="w-full px-3 py-3 bg-white dark:bg-neutral-900 border-none rounded-xl text-xs font-mono font-bold text-neutral-700 dark:text-neutral-200 focus:ring-1 focus:ring-primary shadow-sm" 
                                value={date} 
                                onChange={e => setDate(e.target.value)} 
                            />
                        </div>
                    </div>

                    {/* Same date warning indicator */}
                    {existingDateLog && (
                        <div className="bg-amber-500/10 text-amber-600 border border-amber-500/25 p-3 rounded-2xl flex items-start gap-2.5 text-xs font-bold leading-relaxed">
                            <Info className="w-4 h-4 shrink-0 mt-0.5" />
                            <span>ملاحظة: يوجد سجل سابق لهذا التاريخ بالفعل. متابعة الحفظ ستقوم بدمج العمليات الجديدة إلى السجل الحالي لتسهيل المتابعة.</span>
                        </div>
                    )}

                    {/* Expand/Collapse Control Buttons */}
                    <div className="flex justify-between items-center bg-neutral-50 dark:bg-neutral-850/45 p-2 rounded-xl text-xs border border-neutral-100 dark:border-neutral-800/40">
                        <span className="text-neutral-500 dark:text-neutral-450 font-black pr-1">نموذج اليوميات الموحد (Accordion)</span>
                        <div className="flex gap-2">
                            <button 
                                type="button" 
                                onClick={handleExpandAll}
                                className="px-2.5 py-1 bg-white dark:bg-neutral-900 border border-neutral-150 dark:border-neutral-800 rounded-lg font-black text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
                            >
                                فتح الكل
                            </button>
                            <button 
                                type="button" 
                                onClick={handleCollapseAll}
                                className="px-2.5 py-1 bg-white dark:bg-neutral-900 border border-neutral-150 dark:border-neutral-800 rounded-lg font-black text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
                            >
                                طي الكل
                            </button>
                        </div>
                    </div>

                    {/* Accordion / Collapsible Cards Vertical Stack */}
                    <div className="space-y-3.5">
                        
                        {/* 💧 Irrigation Card */}
                        <div className="border border-neutral-150 dark:border-neutral-800/80 rounded-2xl overflow-hidden bg-white dark:bg-neutral-900 shadow-sm">
                            <button
                                type="button"
                                onClick={() => toggleSection('irrigation')}
                                className="w-full p-4 flex justify-between items-center hover:bg-neutral-50/50 dark:hover:bg-neutral-800/15 transition-colors cursor-pointer text-right"
                            >
                                <div className="flex items-center gap-2.5">
                                    <div className="p-2 bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400 rounded-xl">
                                        <Droplet className="w-4 h-4" />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-xs font-black text-neutral-800 dark:text-neutral-200">💧 ري النباتات</span>
                                        <span className="text-[9.5px] text-neutral-400 font-bold">تسجيل جدول وفترات الري بدقة بالدقائق</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    {isSectionActive('irrigation') && (
                                        <span className="text-[9.5px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-full font-black flex items-center gap-1">
                                            <span className="w-1 h-1 bg-emerald-500 rounded-full animate-pulse"></span>
                                            <span>تم الإدخال</span>
                                        </span>
                                    )}
                                    <ChevronDown className={`w-4 h-4 text-neutral-400 transform transition-transform duration-200 ${openSections.irrigation ? 'rotate-180' : ''}`} />
                                </div>
                            </button>
                            {openSections.irrigation && (
                                <div className="p-4 border-t border-neutral-100 dark:border-neutral-800/60 bg-neutral-50/30 dark:bg-neutral-900/40 space-y-3.5 animate-in slide-in-from-top-2 duration-150">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                                        <div className="space-y-1">
                                            <label className="text-[10.5px] font-bold text-neutral-600 dark:text-neutral-300">مدة الري الصباحي (بالدقائق)</label>
                                            <input 
                                                type="number" 
                                                min="0"
                                                value={irrigationMorningMinutes} 
                                                onChange={e => setIrrigationMorningMinutes(e.target.value ? Number(e.target.value) : '')}
                                                className="w-full p-2.5 text-xs bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 font-bold"
                                                placeholder="مثال: 15"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10.5px] font-bold text-neutral-600 dark:text-neutral-300">مدة الري المسائي (بالدقائق)</label>
                                            <input 
                                                type="number" 
                                                min="0"
                                                value={irrigationEveningMinutes} 
                                                onChange={e => setIrrigationEveningMinutes(e.target.value ? Number(e.target.value) : '')}
                                                className="w-full p-2.5 text-xs bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 font-bold"
                                                placeholder="مثال: 5"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-neutral-400">ملاحظات إضافية حول الري</label>
                                        <textarea 
                                            rows={2}
                                            value={irrigationNotes}
                                            onChange={e => setIrrigationNotes(e.target.value)}
                                            className="w-full p-2.5 text-xs bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 resize-none font-bold"
                                            placeholder="مثال: فحص خراطيم التنقيط بالصوبة، رفع الملوحة..."
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* 🌱 Fertilization Card */}
                        <div className="border border-neutral-150 dark:border-neutral-800/80 rounded-2xl overflow-hidden bg-white dark:bg-neutral-900 shadow-sm">
                            <button
                                type="button"
                                onClick={() => toggleSection('fertilization')}
                                className="w-full p-4 flex justify-between items-center hover:bg-neutral-50/50 dark:hover:bg-neutral-800/15 transition-colors cursor-pointer text-right"
                            >
                                <div className="flex items-center gap-2.5">
                                    <div className="p-2 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-xl">
                                        <Sprout className="w-4 h-4" />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-xs font-black text-neutral-800 dark:text-neutral-200">🌱 تسميد ومغذيات</span>
                                        <span className="text-[9.5px] text-neutral-400 font-bold">تسجيل العناصر المغذية والأسمدة المضافة</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    {isSectionActive('fertilization') && (
                                        <span className="text-[9.5px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-full font-black flex items-center gap-1">
                                            <span className="w-1 h-1 bg-emerald-500 rounded-full animate-pulse"></span>
                                            <span>تم الإدخال</span>
                                        </span>
                                    )}
                                    <ChevronDown className={`w-4 h-4 text-neutral-400 transform transition-transform duration-200 ${openSections.fertilization ? 'rotate-180' : ''}`} />
                                </div>
                            </button>
                            {openSections.fertilization && (
                                <div className="p-4 border-t border-neutral-100 dark:border-neutral-800/60 bg-neutral-50/30 dark:bg-neutral-900/40 space-y-4 animate-in slide-in-from-top-2 duration-150">
                                    <div className="space-y-3">
                                        {fertilizationCompounds.map((comp, idx) => (
                                            <div key={idx} className="p-3 bg-white dark:bg-neutral-900 rounded-xl border border-neutral-150 dark:border-neutral-800 relative group flex gap-3.5 items-center">
                                                <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                                    <div className="space-y-1">
                                                        <label className="text-[9.5px] font-bold text-neutral-400 block">اسم السماد/المركب</label>
                                                        <input
                                                            type="text"
                                                            list="common_fert"
                                                            value={comp.name}
                                                            onChange={e => handleFertCompoundChange(idx, 'name', e.target.value)}
                                                            placeholder="مثال: حامض فسفوريك، نترات كالسيوم..."
                                                            className="w-full p-2.5 text-xs bg-neutral-50 dark:bg-neutral-800/40 rounded-lg border-none font-bold text-neutral-800 dark:text-neutral-200"
                                                        />
                                                    </div>
                                                    <div className="space-y-1">
                                                        <label className="text-[9.5px] font-bold text-neutral-400 block">الكمية المضافة</label>
                                                        <input
                                                            type="text"
                                                            value={comp.amount}
                                                            onChange={e => handleFertCompoundChange(idx, 'amount', e.target.value)}
                                                            placeholder="مثال: ٥ كجم، ٢ لتر..."
                                                            className="w-full p-2.5 text-xs bg-neutral-50 dark:bg-neutral-800/40 rounded-lg border-none font-bold text-neutral-800 dark:text-neutral-200"
                                                        />
                                                    </div>
                                                </div>
                                                {fertilizationCompounds.length > 1 && (
                                                    <button 
                                                        type="button"
                                                        onClick={() => handleRemoveFertCompoundRow(idx)}
                                                        className="p-2 text-neutral-400 hover:text-rose-500 rounded-xl cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-800 shrink-0 transition-all self-end mb-1"
                                                        title="إزالة السماد"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                    <div className="flex justify-end">
                                        <button 
                                            type="button" 
                                            onClick={handleAddFertCompoundRow}
                                            className="flex items-center gap-1.5 text-xs font-black text-primary hover:text-primary/80 transition-colors cursor-pointer"
                                        >
                                            <Plus className="w-4 h-4" />
                                            <span>إضافة سماد آخر</span>
                                        </button>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-neutral-400">ملاحظات وتفاصيل التسميد</label>
                                        <textarea 
                                            rows={2}
                                            value={fertilizationNotes}
                                            onChange={e => setFertilizationNotes(e.target.value)}
                                            className="w-full p-2.5 text-xs bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 resize-none font-bold"
                                            placeholder="مثال: تم الحقن على فترتين ري بمعدل ربع ساعة..."
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* 🧪 Protection & Spraying Card */}
                        <div className="border border-neutral-150 dark:border-neutral-800/80 rounded-2xl overflow-hidden bg-white dark:bg-neutral-900 shadow-sm">
                            <button
                                type="button"
                                onClick={() => toggleSection('protection')}
                                className="w-full p-4 flex justify-between items-center hover:bg-neutral-50/50 dark:hover:bg-neutral-800/15 transition-colors cursor-pointer text-right"
                            >
                                <div className="flex items-center gap-2.5">
                                    <div className="p-2 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 rounded-xl">
                                        <Shield className="w-4 h-4" />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-xs font-black text-neutral-800 dark:text-neutral-200">🧪 رش مكافحة وآفات</span>
                                        <span className="text-[9.5px] text-neutral-400 font-bold">مبيدات الرش الوقائي، مكافحة الإصابات والآفات</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    {isSectionActive('protection') && (
                                        <span className="text-[9.5px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-full font-black flex items-center gap-1">
                                            <span className="w-1 h-1 bg-emerald-500 rounded-full animate-pulse"></span>
                                            <span>تم الإدخال</span>
                                        </span>
                                    )}
                                    <ChevronDown className={`w-4 h-4 text-neutral-400 transform transition-transform duration-200 ${openSections.protection ? 'rotate-180' : ''}`} />
                                </div>
                            </button>
                            {openSections.protection && (
                                <div className="p-4 border-t border-neutral-100 dark:border-neutral-800/60 bg-neutral-50/30 dark:bg-neutral-900/40 space-y-4 animate-in slide-in-from-top-2 duration-150">
                                    
                                    {/* Part A: Spraying Compounds */}
                                    <div className="space-y-3">
                                        <span className="text-[10px] font-black text-neutral-400 block pr-1">🧪 مركبات ومبيدات الرش:</span>
                                        {sprayingCompounds.map((comp, idx) => (
                                            <div key={idx} className="p-3 bg-white dark:bg-neutral-900 rounded-xl border border-neutral-150 dark:border-neutral-800 relative group flex gap-3.5 items-center">
                                                <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                                    <div className="space-y-1">
                                                        <label className="text-[9.5px] font-bold text-neutral-400 block">اسم المبيد/المركب</label>
                                                        <input
                                                            type="text"
                                                            list="common_spray"
                                                            value={comp.name}
                                                            onChange={e => handleSprayCompoundChange(idx, 'name', e.target.value)}
                                                            placeholder="مثال: مبيد فطري، أحماض أمينية..."
                                                            className="w-full p-2.5 text-xs bg-neutral-50 dark:bg-neutral-800/40 rounded-lg border-none font-bold text-neutral-800 dark:text-neutral-200"
                                                        />
                                                    </div>
                                                    <div className="space-y-1">
                                                        <label className="text-[9.5px] font-bold text-neutral-400 block">التركيز/النسبة</label>
                                                        <input
                                                            type="text"
                                                            value={comp.amount}
                                                            onChange={e => handleSprayCompoundChange(idx, 'amount', e.target.value)}
                                                            placeholder="مثال: نصف لتر، ٢٥٠ جرام..."
                                                            className="w-full p-2.5 text-xs bg-neutral-50 dark:bg-neutral-800/40 rounded-lg border-none font-bold text-neutral-800 dark:text-neutral-200"
                                                        />
                                                    </div>
                                                </div>
                                                {sprayingCompounds.length > 1 && (
                                                    <button 
                                                        type="button"
                                                        onClick={() => handleRemoveSprayCompoundRow(idx)}
                                                        className="p-2 text-neutral-400 hover:text-rose-500 rounded-xl cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-800 shrink-0 transition-all self-end mb-1"
                                                        title="إزالة المركب"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                    <div className="flex justify-end">
                                        <button 
                                            type="button" 
                                            onClick={handleAddSprayCompoundRow}
                                            className="flex items-center gap-1.5 text-xs font-black text-primary hover:text-primary/80 transition-colors cursor-pointer"
                                        >
                                            <Plus className="w-4 h-4" />
                                            <span>إضافة مركب رش آخر</span>
                                        </button>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-neutral-450">ملاحظات حول عملية الرش</label>
                                        <textarea 
                                            rows={1.5}
                                            value={sprayingNotes}
                                            onChange={e => setSprayingNotes(e.target.value)}
                                            className="w-full p-2.5 text-xs bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 resize-none font-bold"
                                            placeholder="مثال: رشة عقب المغرب، مخصصة للورق السفلي..."
                                        />
                                    </div>

                                    <hr className="border-neutral-200 dark:border-neutral-850" />

                                    {/* Part B: Pests & Infections */}
                                    <div className="space-y-3">
                                        <span className="text-[10px] font-black text-rose-500 block pr-1">🐛 تقرير الآفات والإصابات المكتشفة بالصوبة:</span>
                                        <div className="space-y-3 p-3 bg-red-500/5 rounded-xl border border-red-500/10">
                                            <div>
                                                <label className="text-[9.5px] font-bold text-neutral-600 dark:text-neutral-300 block mb-1">اسم الآفة أو المرض</label>
                                                <input 
                                                    type="text"
                                                    list="common_pests"
                                                    value={pestName}
                                                    onChange={e => setPestName(e.target.value)}
                                                    className="w-full p-2.5 text-xs bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800 font-bold text-neutral-700 dark:text-neutral-200"
                                                    placeholder="مثال: بياض زغبي، عنكبوت أحمر..."
                                                />
                                            </div>

                                            <div className="grid grid-cols-2 gap-3.5">
                                                <div>
                                                    <label className="text-[9.5px] font-bold text-neutral-600 dark:text-neutral-300 block mb-1">شدة الإصابة</label>
                                                    <select 
                                                        className="w-full p-2.5 text-xs bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800 font-bold text-neutral-700 dark:text-neutral-200"
                                                        value={pestSeverity}
                                                        onChange={e => setPestSeverity(e.target.value)}
                                                    >
                                                        <option value="خفيفة">🟢 خفيفة</option>
                                                        <option value="متوسطة">🟡 متوسطة</option>
                                                        <option value="شديدة">🔴 شديدة</option>
                                                    </select>
                                                </div>

                                                <div>
                                                    <label className="text-[9.5px] font-bold text-neutral-600 dark:text-neutral-300 block mb-1">حالة البلاغ</label>
                                                    <select 
                                                        className="w-full p-2.5 text-xs bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800 font-bold text-neutral-700 dark:text-neutral-200"
                                                        value={pestStatus}
                                                        onChange={e => setPestStatus(e.target.value)}
                                                    >
                                                        <option value="نشطة وتحت العلاج">🔄 نشطة وتحت العلاج</option>
                                                        <option value="تمت المكافحة بنجاح">✅ تمت المكافحة بنجاح</option>
                                                        <option value="تحت الملاحظة">👀 تحت الملاحظة</option>
                                                    </select>
                                                </div>
                                            </div>

                                            <div className="space-y-1">
                                                <label className="text-[9.5px] font-bold text-neutral-400 block">ملاحظات مكافحة الآفة</label>
                                                <textarea 
                                                    rows={1.5}
                                                    value={pestNotes}
                                                    onChange={e => setPestNotes(e.target.value)}
                                                    className="w-full p-2.5 text-xs bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800 resize-none font-bold"
                                                    placeholder="اكتب أية تفاصيل أخرى حول بؤرة الإصابة والمكافحة..."
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* ✂️ Agricultural Operations & Labor Card */}
                        <div className="border border-neutral-150 dark:border-neutral-800/80 rounded-2xl overflow-hidden bg-white dark:bg-neutral-900 shadow-sm">
                            <button
                                type="button"
                                onClick={() => toggleSection('operations')}
                                className="w-full p-4 flex justify-between items-center hover:bg-neutral-50/50 dark:hover:bg-neutral-800/15 transition-colors cursor-pointer text-right"
                            >
                                <div className="flex items-center gap-2.5">
                                    <div className="p-2 bg-orange-50 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400 rounded-xl">
                                        <Wrench className="w-4 h-4" />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-xs font-black text-neutral-800 dark:text-neutral-200">✂️ عمليات يدوية وعمالة</span>
                                        <span className="text-[9.5px] text-neutral-400 font-bold">تقليم، تهوية، تربيط، وعمالة الصوبة الزراعية</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    {isSectionActive('operations') && (
                                        <span className="text-[9.5px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-full font-black flex items-center gap-1">
                                            <span className="w-1 h-1 bg-emerald-500 rounded-full animate-pulse"></span>
                                            <span>تم الإدخال</span>
                                        </span>
                                    )}
                                    <ChevronDown className={`w-4 h-4 text-neutral-400 transform transition-transform duration-200 ${openSections.operations ? 'rotate-180' : ''}`} />
                                </div>
                            </button>
                            {openSections.operations && (
                                <div className="p-4 border-t border-neutral-100 dark:border-neutral-800/60 bg-neutral-50/30 dark:bg-neutral-900/40 space-y-4 animate-in slide-in-from-top-2 duration-150">
                                    
                                    {/* Part A: AgriOps Quick Tags */}
                                    <div className="space-y-2">
                                        <span className="text-[10px] font-black text-orange-650 dark:text-orange-400 block pr-1">✂️ اختر العمليات الفنية واليدوية المنجزة لليوم:</span>
                                        <div className="flex flex-wrap gap-1.5">
                                            {COMMON_AGRI_OPS.map(op => {
                                                const isSelected = selectedAgriOps.includes(op);
                                                return (
                                                    <button
                                                        key={op}
                                                        type="button"
                                                        onClick={() => {
                                                            if (isSelected) {
                                                                setSelectedAgriOps(selectedAgriOps.filter(o => o !== op));
                                                            } else {
                                                                setSelectedAgriOps([...selectedAgriOps, op]);
                                                            }
                                                        }}
                                                        className={`px-3 py-1.5 rounded-full text-[11px] font-bold transition-all duration-200 flex items-center gap-1.5 cursor-pointer border ${
                                                            isSelected 
                                                            ? 'bg-orange-500 border-orange-500 text-white shadow-xs' 
                                                            : 'bg-white hover:bg-neutral-100 text-neutral-700 border-neutral-150 dark:bg-neutral-850 dark:hover:bg-neutral-800 dark:text-neutral-300 dark:border-neutral-800'
                                                        }`}
                                                    >
                                                        {isSelected && <span className="text-[8px]">●</span>}
                                                        <span>{op}</span>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* Part B: Labor count */}
                                    <div className="space-y-1">
                                        <label className="text-[10.5px] font-bold text-neutral-600 dark:text-neutral-300">عدد عمال الصوبة بمشروع اليوم</label>
                                        <input 
                                            type="number"
                                            min="0"
                                            placeholder="مثال: 3 عمال..."
                                            value={workersCount}
                                            onChange={(e) => setWorkersCount(e.target.value ? Number(e.target.value) : '')}
                                            className="w-full p-2.5 text-xs bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 font-bold"
                                        />
                                    </div>

                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-neutral-400">ملاحظات وتفاصيل إضافية</label>
                                        <textarea 
                                            rows={1.5}
                                            value={opsNotes}
                                            onChange={e => setOpsNotes(e.target.value)}
                                            className="w-full p-2.5 text-xs bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 resize-none font-bold"
                                            placeholder="اكتب أية ملاحظات تفصيلية أخرى عن العمالة والعمليات الزراعية اليوم..."
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* 🧺 Harvest Card */}
                        <div className="border border-neutral-150 dark:border-neutral-800/80 rounded-2xl overflow-hidden bg-white dark:bg-neutral-900 shadow-sm">
                            <button
                                type="button"
                                onClick={() => toggleSection('harvest')}
                                className="w-full p-4 flex justify-between items-center hover:bg-neutral-50/50 dark:hover:bg-neutral-800/15 transition-colors cursor-pointer text-right"
                            >
                                <div className="flex items-center gap-2.5">
                                    <div className="p-2 bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 rounded-xl">
                                        <ShoppingBag className="w-4 h-4" />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-xs font-black text-neutral-800 dark:text-neutral-200">🧺 حصاد المحصول</span>
                                        <span className="text-[9.5px] text-neutral-400 font-bold">سحب المحصول وتجميع الإنتاج والصناديق</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    {isSectionActive('harvest') && (
                                        <span className="text-[9.5px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-full font-black flex items-center gap-1">
                                            <span className="w-1 h-1 bg-emerald-500 rounded-full animate-pulse"></span>
                                            <span>تم الإدخال</span>
                                        </span>
                                    )}
                                    <ChevronDown className={`w-4 h-4 text-neutral-400 transform transition-transform duration-200 ${openSections.harvest ? 'rotate-180' : ''}`} />
                                </div>
                            </button>
                            {openSections.harvest && (
                                <div className="p-4 border-t border-neutral-100 dark:border-neutral-800/60 bg-neutral-50/30 dark:bg-neutral-900/40 space-y-3.5 animate-in slide-in-from-top-2 duration-150">
                                    <div className="grid grid-cols-2 gap-3.5">
                                        <div className="space-y-1">
                                            <label className="text-[10.5px] font-bold text-neutral-600 dark:text-neutral-300">الكمية الإجمالية المحصودة</label>
                                            <input 
                                                type="number"
                                                min="0"
                                                placeholder="مثال: 25"
                                                value={harvestQuantity}
                                                onChange={(e) => setHarvestQuantity(e.target.value ? Number(e.target.value) : '')}
                                                className="w-full p-2.5 text-xs bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 font-bold"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10.5px] font-bold text-neutral-600 dark:text-neutral-300">الوحدة المستخدمة</label>
                                            <select 
                                                value={harvestUnit}
                                                onChange={(e) => setHarvestUnit(e.target.value)}
                                                className="w-full p-2.5 text-xs bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 font-bold text-neutral-700 dark:text-neutral-200"
                                            >
                                                <option value="قفص">قفص</option>
                                                <option value="كرتونة">كرتونة</option>
                                                <option value="برنيكة">برنيكة</option>
                                                <option value="كيلو">كيلو</option>
                                                <option value="طن">طن</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-neutral-400">ملاحظات الجودة والتعبئة</label>
                                        <textarea 
                                            rows={2}
                                            value={harvestNotes}
                                            onChange={e => setHarvestNotes(e.target.value)}
                                            className="w-full p-2.5 text-xs bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 resize-none font-bold"
                                            placeholder="مثال: جودة الثمار عالية، تم الاستبعاد البسيط، الحجم متوسط..."
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* 🌿 Planting / الزراعة Card */}
                        <div className="border border-neutral-150 dark:border-neutral-800/80 rounded-2xl overflow-hidden bg-white dark:bg-neutral-900 shadow-sm">
                            <button
                                type="button"
                                onClick={() => toggleSection('planting')}
                                className="w-full p-4 flex justify-between items-center hover:bg-neutral-50/50 dark:hover:bg-neutral-800/15 transition-colors cursor-pointer text-right"
                            >
                                <div className="flex items-center gap-2.5">
                                    <div className="p-2 bg-teal-50 dark:bg-teal-950/40 text-teal-600 dark:text-teal-400 rounded-xl">
                                        <Sprout className="w-4 h-4" />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-xs font-black text-neutral-800 dark:text-neutral-200">🌿 زراعة شتلات جديدة</span>
                                        <span className="text-[9.5px] text-neutral-400 font-bold">زراعة أصناف ومحاصيل وشتلات جديدة بداخل الصوبة</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    {isSectionActive('planting') && (
                                        <span className="text-[9.5px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-full font-black flex items-center gap-1">
                                            <span className="w-1 h-1 bg-emerald-500 rounded-full animate-pulse"></span>
                                            <span>تم الإدخال</span>
                                        </span>
                                    )}
                                    <ChevronDown className={`w-4 h-4 text-neutral-400 transform transition-transform duration-200 ${openSections.planting ? 'rotate-180' : ''}`} />
                                </div>
                            </button>
                            {openSections.planting && (
                                <div className="p-4 border-t border-neutral-100 dark:border-neutral-800/60 bg-neutral-50/30 dark:bg-neutral-900/40 space-y-3.5 animate-in slide-in-from-top-2 duration-150">
                                    <div className="space-y-1">
                                        <label className="text-[10.5px] font-bold text-neutral-600 dark:text-neutral-300">الصنف أو المحصول المزروع</label>
                                        <input 
                                            type="text"
                                            value={plantType}
                                            onChange={e => setPlantType(e.target.value)}
                                            className="w-full p-2.5 text-xs bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 font-bold"
                                            placeholder="مثال: خيار بلدي هجين، طماطم شيري..."
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-3.5">
                                        <div className="space-y-1">
                                            <label className="text-[10.5px] font-bold text-neutral-600 dark:text-neutral-300">الكمية المزروعة (اختياري)</label>
                                            <input 
                                                type="number"
                                                min="0"
                                                placeholder="مثال: 500"
                                                value={plantingQty}
                                                onChange={(e) => setPlantingQty(e.target.value ? Number(e.target.value) : '')}
                                                className="w-full p-2.5 text-xs bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 font-bold"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10.5px] font-bold text-neutral-600 dark:text-neutral-300">الوحدة</label>
                                            <select 
                                                value={plantingUnit}
                                                onChange={(e) => setPlantingUnit(e.target.value)}
                                                className="w-full p-2.5 text-xs bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 font-bold text-neutral-700 dark:text-neutral-200"
                                            >
                                                <option value="شتلة">شتلة</option>
                                                <option value="بذرة">بذرة</option>
                                                <option value="عروة">عروة</option>
                                                <option value="مصطبة">مصطبة</option>
                                                <option value="أخرى">أخرى</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-neutral-400">ملاحظات وتفاصيل الزراعة</label>
                                        <textarea 
                                            rows={2}
                                            value={plantingNotes}
                                            onChange={e => setPlantingNotes(e.target.value)}
                                            className="w-full p-2.5 text-xs bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 resize-none font-bold"
                                            placeholder="أية ملاحظات إضافية حول نسبة نجاح التشتيل والنمو المبدئي..."
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                    </div>

                    {/* General notes for the whole day log */}
                    <div className="space-y-1 bg-neutral-50 dark:bg-neutral-850/40 p-3.5 rounded-2xl border border-neutral-100 dark:border-neutral-800">
                        <label className="text-[10px] font-black text-neutral-400">مذكرات أو ملاحظات عامة حول هذا السجل اليومي:</label>
                        <textarea 
                            className="w-full p-2.5 text-xs bg-white dark:bg-neutral-900 border border-neutral-150 dark:border-neutral-800 rounded-xl outline-none focus:ring-1 focus:ring-primary h-[60px] resize-none font-bold"
                            placeholder="أي تفاصيل عامة تذكرك لاحقاً بأحداث اليوم (مثال: مشكلة الصنبور بالصوبة الخامسة، تفقد العمال)..."
                            value={notes}
                            onChange={e => setNotes(e.target.value)}
                        />
                    </div>
                </div>

                {/* Submit actions bottom panel */}
                <div 
                    className="shrink-0 p-4 bg-white dark:bg-neutral-900 border-t border-neutral-100 dark:border-neutral-850 z-10 flex gap-3"
                    style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom, 0px))' }}
                >
                    <button 
                        type="button"
                        onClick={onClose}
                        className="px-6 py-4 bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 hover:dark:bg-neutral-700 text-sm font-black rounded-2xl active:scale-95 transition-colors cursor-pointer shrink-0"
                    >
                        إلغاء
                    </button>
                    <button 
                        onClick={handleSaveProcess}
                        className="flex-1 py-4 bg-primary hover:bg-opacity-95 text-white text-sm font-black rounded-2xl active:scale-95 transition-transform cursor-pointer"
                    >
                        💾 حفظ يوميات الصوبة
                    </button>
                </div>
            </div>
            
            {/* Native Datalists to facilitate choices */}
            <datalist id="common_pests">
                {COMMON_PESTS.map(p => <option key={p} value={p} />)}
            </datalist>
            <datalist id="common_spray">
                {COMMON_COMPOUNDS_SPRAY.map(p => <option key={p} value={p} />)}
            </datalist>
            <datalist id="common_fert">
                {COMMON_COMPOUNDS_FERT.map(p => <option key={p} value={p} />)}
            </datalist>
        </div>,
        document.body
    );
};

export default DailyLogManager;

