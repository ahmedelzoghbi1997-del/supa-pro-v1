import React, { useState, useMemo } from 'react';
import type { Cycle } from '../../types';
import { 
    CalendarIcon, 
    TrendingUpIcon, 
    TrendingDownIcon, 
    SparklesIcon, 
    CheckCircleIcon,
    InvoicesIcon,
    WalletIcon,
    LeafIcon
} from '../Icons';
import { calculateInvoiceTotal, formatNumber } from '../../utils/helpers';
import { useData } from '../../contexts/DataContext';
import { useSettings, terminology } from '../../contexts/SettingsContext';
import { motion, AnimatePresence } from 'motion/react';
import { Search, ArrowUpDown, ChevronDown, ChevronUp, Clock, Tag, CreditCard } from 'lucide-react';

interface TimelineEvent {
    id: string;
    originalDate: string;
    dateLabel: string;
    created_at: string;
    type: 'start' | 'invoice' | 'expense' | 'daily_log' | 'done';
    title: string;
    description: string;
    amount?: number;
    tasks?: string[];
    // Details for expansion
    paymentMethod?: string;
    categoryName?: string;
    invoiceItems?: any[];
    packagingInfo?: { count: number; type: string };
    marketName?: string;
}

const TimelineItem: React.FC<{ 
    event: TimelineEvent; 
    isLast: boolean; 
    isNewest: boolean;
    isExpanded: boolean;
    onToggleExpand: () => void;
}> = ({ event, isLast, isNewest, isExpanded, onToggleExpand }) => {
    
    const getMeta = (type: string) => {
        switch (type) {
            case 'start': 
                return { 
                    icon: LeafIcon, 
                    color: 'text-indigo-600 dark:text-indigo-400', 
                    bg: 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800/80',
                    badgeBg: 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300'
                };
            case 'invoice': 
                return { 
                    icon: TrendingUpIcon, 
                    color: 'text-emerald-600 dark:text-emerald-400', 
                    bg: 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/80',
                    badgeBg: 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300'
                };
            case 'expense': 
                return { 
                    icon: TrendingDownIcon, 
                    color: 'text-rose-600 dark:text-rose-400', 
                    bg: 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800/80',
                    badgeBg: 'bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300'
                };
            case 'daily_log': 
                return { 
                    icon: SparklesIcon, 
                    color: 'text-amber-600 dark:text-amber-400', 
                    bg: 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800/80',
                    badgeBg: 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300'
                };
            case 'done': 
                return { 
                    icon: CheckCircleIcon, 
                    color: 'text-teal-600 dark:text-teal-400', 
                    bg: 'bg-teal-50 dark:bg-teal-950/40 border-teal-200 dark:border-teal-800/80',
                    badgeBg: 'bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300'
                };
            default: 
                return { 
                    icon: SparklesIcon, 
                    color: 'text-neutral-600 dark:text-neutral-400', 
                    bg: 'bg-neutral-50 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700',
                    badgeBg: 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300'
                };
        }
    };

    const { icon: Icon, color, bg, badgeBg } = getMeta(event.type);

    return (
        <motion.div 
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.2 }}
            className="relative pr-10 pb-10 last:pb-0 font-sans"
        >
            {/* Beautiful Vertical Timeline Glowing Connecting Line */}
            {!isLast && (
                <div className="absolute right-[19px] top-[40px] bottom-0 w-[3px] bg-gradient-to-b from-neutral-200/50 via-neutral-300 dark:via-neutral-800 to-neutral-200/50 dark:from-neutral-800 dark:to-neutral-900/30 rounded-full" />
            )}
            
            {/* The Floating Interactive Icon Node */}
            <motion.div 
                whileHover={{ scale: 1.1, rotate: 5 }}
                className={`absolute right-1 top-0 w-10 h-10 rounded-full ${bg} ${color} flex items-center justify-center z-10 border-4 border-neutral-50 dark:border-neutral-950 shadow-md cursor-pointer transition-colors`}
                onClick={onToggleExpand}
            >
                <Icon className="w-4 h-4 text-current" />
                {isNewest && (
                    <span className="absolute -top-1 -left-1 flex h-3.5 w-3.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500"></span>
                    </span>
                )}
            </motion.div>

            {/* Content Box */}
            <div 
                onClick={onToggleExpand}
                className="cursor-pointer bg-white dark:bg-neutral-900 p-5 rounded-3xl border border-neutral-200 dark:border-neutral-800/70 hover:shadow-lg hover:border-neutral-300 dark:hover:border-neutral-700/80 transition-all duration-300 select-none relative overflow-hidden group hover:-translate-y-0.5"
            >
                {/* Visual Accent Glow according to type */}
                <div className="absolute top-0 left-0 w-32 h-32 bg-current opacity-[0.015] rounded-full blur-3xl group-hover:opacity-[0.03] transition-opacity duration-300 pointer-events-none" />

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2">
                        <span className={`text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full ${badgeBg}`}>
                            {event.type === 'start' && 'بداية العروة'}
                            {event.type === 'invoice' && 'فاتورة توريد'}
                            {event.type === 'expense' && 'مصروف تشغيلي'}
                            {event.type === 'daily_log' && 'متابعة زراعية'}
                            {event.type === 'done' && 'نهاية العروة'}
                        </span>
                        <h4 className="font-black text-neutral-850 dark:text-neutral-100 text-[13px] sm:text-sm group-hover:text-primary transition-colors leading-tight">
                            {event.title}
                        </h4>
                    </div>
                    
                    <div className="flex items-center gap-1 bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-100 dark:border-neutral-800 text-neutral-400 dark:text-neutral-500 px-3 py-1 rounded-full text-[10px] font-bold shrink-0 w-fit">
                        <Clock className="w-3 h-3 text-neutral-400" />
                        <span className="tabular-nums">{event.dateLabel}</span>
                    </div>
                </div>

                <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed whitespace-pre-line">
                    {event.description}
                </p>

                {/* Amount display for financial transactions */}
                {event.amount != null && (
                    <div className="mt-3 flex items-center justify-between">
                        <div className={`text-xs sm:text-sm font-black px-3.5 py-1.5 rounded-2xl flex items-center gap-1.5 w-fit shadow-xs ${event.amount > 0 ? 'bg-emerald-50/50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400 border border-emerald-100/50' : 'bg-rose-50/50 text-rose-500 dark:bg-rose-900/20 dark:text-rose-400 border border-rose-100/50'}`}>
                            <span>{event.amount > 0 ? 'إيراد لليد:' : 'منصرف لليد:'}</span>
                            <span className="tabular-nums font-black text-sm">
                                {event.amount > 0 ? '+' : ''}{formatNumber(Math.abs(event.amount))}
                            </span>
                            <span className="text-[10px] font-bold">ج.م</span>
                        </div>
                        
                        <div className="text-neutral-400 dark:text-neutral-500 hover:text-neutral-600 dark:hover:text-neutral-300">
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </div>
                    </div>
                )}

                {/* Optional expanding indicator for non-financial but detailed items */}
                {event.amount == null && (event.tasks?.length || event.description) && (
                    <div className="mt-2.5 flex justify-end">
                        <div className="text-neutral-400 dark:text-neutral-500 text-[10px] font-bold flex items-center gap-1">
                            <span>{isExpanded ? 'عرض أقل' : 'عرض التفاصيل'}</span>
                            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        </div>
                    </div>
                )}

                {/* Interactive Smooth Advanced Panel Expansion */}
                <AnimatePresence initial={false}>
                    {isExpanded && (
                        <motion.div 
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.25, ease: "easeInOut" }}
                            className="overflow-hidden mt-4 pt-4 border-t border-dashed border-neutral-100 dark:border-neutral-800"
                            onClick={(e) => e.stopPropagation()} // Prevent double collapse
                        >
                            {/* 1. Expand invoice items */}
                            {event.type === 'invoice' && event.invoiceItems && (
                                <div className="space-y-3 font-sans">
                                    <h5 className="text-[10px] font-black text-neutral-400 dark:text-neutral-500 uppercase tracking-widest flex items-center gap-1.5 mb-2">
                                        <Tag className="w-3.5 h-3.5 text-neutral-400" /> تفاصيل الأسعار والكمية
                                    </h5>
                                    
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                                        {event.invoiceItems.map((item, id) => (
                                            <div key={id} className="p-3 rounded-2xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-100 dark:border-neutral-800 flex justify-between items-center whitespace-nowrap">
                                                <div className="flex flex-col">
                                                    <span className="font-extrabold text-neutral-800 dark:text-neutral-250 select-text">{item.fruit_type || 'صنف'}</span>
                                                    <span className="text-[10px] text-neutral-400 tracking-tight tabular-nums mt-0.5">{formatNumber(item.quantity)} كجم × {item.price_per_kg} ج</span>
                                                </div>
                                                <span className="font-black text-neutral-900 dark:text-white tabular-nums">
                                                    {formatNumber(Number(item.quantity) * Number(item.price_per_kg))} ج
                                                </span>
                                            </div>
                                        ))}
                                    </div>

                                    {event.packagingInfo && (
                                        <div className="p-3 rounded-2xl bg-emerald-500/5 border border-emerald-500/10 text-[10px] font-extrabold text-emerald-800 dark:text-emerald-400 flex items-center gap-1.5 mt-2">
                                            <span>📦 الطرود الموردة:</span>
                                            <span className="font-bold tabular-nums">({event.packagingInfo.count} {event.packagingInfo.type === 'carton' ? 'كرتونة' : 'قفص'})</span>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* 2. Expand expense options */}
                            {event.type === 'expense' && (
                                <div className="space-y-2.5 text-xs text-neutral-600 dark:text-neutral-300">
                                    <h5 className="text-[10px] font-black text-neutral-400 dark:text-neutral-500 uppercase tracking-widest flex items-center gap-1.5 mb-2">
                                        <CreditCard className="w-3.5 h-3.5 text-neutral-400" /> تفاصيل المعاملة المصرفية
                                    </h5>
                                    <div className="flex flex-wrap items-center gap-3">
                                        <div className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-150 dark:border-neutral-700/50">
                                            <span className="font-bold opacity-60">طريقة الدفع:</span>
                                            <span className="font-black text-neutral-800 dark:text-white">{event.paymentMethod === 'credit' ? 'أجل (على الحساب)' : 'كاش (نقدي)'}</span>
                                        </div>
                                        {event.categoryName && (
                                            <div className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-150 dark:border-neutral-700/50">
                                                <span className="font-bold opacity-60">الفئة:</span>
                                                <span className="font-black text-neutral-850 dark:text-white">{event.categoryName}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* 3. Expand tasks items */}
                            {event.type === 'daily_log' && event.tasks && event.tasks.length > 0 && (
                                <div className="space-y-2 font-sans">
                                    <h5 className="text-[10px] font-black text-neutral-400 dark:text-neutral-500 uppercase tracking-widest flex items-center gap-1.5 mb-2">
                                        <LeafIcon className="w-3.5 h-3.5 text-neutral-450" /> المهام والعمليات المسجلة
                                    </h5>
                                    
                                    <div className="space-y-2">
                                        {event.tasks.map((taskStr, id) => (
                                            <div key={id} className="flex gap-2 p-3 rounded-2xl bg-amber-500/5 border border-amber-500/10 text-xs">
                                                <span className="text-amber-500">•</span>
                                                <div className="text-neutral-700 dark:text-neutral-300 select-text">
                                                    {taskStr}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* 4. Plantings start details */}
                            {event.type === 'start' && (
                                <div className="text-xs text-neutral-500 dark:text-neutral-450 leading-relaxed font-sans space-y-2">
                                    <p className="flex items-center gap-1">
                                        <span>📍 تاريخ التسجيل الفعلي بالنظام:</span>
                                        <span className="font-black text-neutral-700 dark:text-neutral-300 tabular-nums">{new Date(event.created_at).toLocaleString('ar-EG')}</span>
                                    </p>
                                    <p>انطلقت العروة لضمان إدارة تدفق السيولة النقدية، تفتيت التكاليف التشغيلية ومراقبة هامش الربح الحقيقي لكل فدان زراعي.</p>
                                </div>
                            )}

                            {/* 5. Close season done details */}
                            {event.type === 'done' && (
                                <div className="text-xs text-neutral-500 dark:text-neutral-450 leading-relaxed font-sans space-y-2">
                                    <p className="font-exrabold text-emerald-600 dark:text-emerald-400">✅ تم إغلاق موسم العروة وحصاد الأرباح بنجاح.</p>
                                    <p>تم إغلاق دفاتر العروة نهائياً. تم تخزين كافة العمليات المالية من فواتير مبيعات ومشتريات مغذيات لتكون مرجعاً للأعوام القادمة.</p>
                                </div>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </motion.div>
    );
};

const TimelineTab: React.FC<{ cycle: Cycle }> = ({ cycle }) => {
    const { invoices, expenses, expenseCategories, dailyLogs, suppliers } = useData();
    const { settings } = useSettings();
    const term = terminology[settings.primaryTerm];

    const [activeFilter, setActiveFilter] = useState<'all' | 'invoices' | 'expenses' | 'logs'>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [sortDirection, setSortDirection] = useState<'desc' | 'asc'>('desc');
    const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});
    const [visibleCount, setVisibleCount] = useState(15);

    // Reset visible count when filter or query changes
    React.useEffect(() => {
        setVisibleCount(15);
    }, [activeFilter, searchQuery]);

    const timelineEvents = useMemo(() => {
        const events: TimelineEvent[] = [
            {
                id: `start-${cycle.id}`,
                originalDate: cycle.start_date,
                created_at: cycle.created_at || cycle.start_date,
                dateLabel: new Date(cycle.start_date).toLocaleDateString('ar-EG', { day: 'numeric', month: 'short', year: 'numeric' }),
                type: 'start',
                title: `تأسيس ${term.singular}`,
                description: `انطلاق الرحلة الإنتاجية لـ "${cycle.name}" مع زراعة ${cycle.plant_count || cycle.area_in_feddans || 0} ${cycle.unit_of_measure === 'area' ? 'فدان' : 'نبات'}.`
            },
            ...invoices.filter(i => i.cycle_id === cycle.id).map(inv => {
                const isTransfer = inv.market === 'رصيد منقول';
                return {
                    id: `invoice-${inv.id}`,
                    originalDate: inv.date,
                    created_at: inv.created_at || inv.date,
                    dateLabel: new Date(inv.date).toLocaleDateString('ar-EG', { day: 'numeric', month: 'short', year: 'numeric' }),
                    type: 'invoice' as const,
                    title: isTransfer ? 'رصيد منقول' : `توريد: ${inv.market}`,
                    description: isTransfer ? 'رصيد مرحل من العروة السابقة' : (inv.description || `عملية بيع وتوريد محصول لتاجر السوق "${inv.market}".`),
                    amount: calculateInvoiceTotal(inv.price_items, inv.deductions),
                    invoiceItems: inv.price_items,
                    packagingInfo: { count: inv.packaging_count || 0, type: inv.packaging_type },
                    marketName: inv.market
                };
            }),
            ...expenses.filter(e => e.cycle_id === cycle.id).map(exp => {
                const cat = expenseCategories.find(c => c.id === exp.category_id);
                const sup = suppliers.find(s => s.id === exp.supplier_id);
                return {
                    id: `expense-${exp.id}`,
                    originalDate: exp.date,
                    created_at: exp.created_at || exp.date,
                    dateLabel: new Date(exp.date).toLocaleDateString('ar-EG', { day: 'numeric', month: 'short', year: 'numeric' }),
                    type: 'expense' as const,
                    title: `مصروف: ${cat?.name || 'مصروف عام'} ${sup ? `(${sup.name})` : ''}`,
                    description: exp.description || `صرف وتشغيل على المغذيات والمستلزمات.`,
                    amount: -exp.amount,
                    paymentMethod: exp.payment_method,
                    categoryName: cat?.name
                };
            }),
            ...dailyLogs.filter(l => l.cycle_id === cycle.id).map(log => ({
                id: `daily_log-${log.id}`,
                originalDate: log.date,
                created_at: log.created_at || log.date,
                dateLabel: new Date(log.date).toLocaleDateString('ar-EG', { day: 'numeric', month: 'short', year: 'numeric' }),
                type: 'daily_log' as const,
                title: `سجل زراعي يومي`,
                description: log.notes || 'تسجيل يومي للمهامات والعمليات الزراعية بالصوبة أو الحقل.',
                tasks: log.tasks.map(t => `${t.category}${t.subCategory ? ` (${t.subCategory})` : ''}: ${t.details}`)
            }))
        ];

        // Sort dynamically
        events.sort((a, b) => {
            const dateA = new Date(a.originalDate).getTime();
            const dateB = new Date(b.originalDate).getTime();
            if (dateA !== dateB) {
                return sortDirection === 'asc' ? dateA - dateB : dateB - dateA;
            }
            const timeA = new Date(a.created_at).getTime();
            const timeB = new Date(b.created_at).getTime();
            return sortDirection === 'asc' ? timeA - timeB : timeB - timeA;
        });

        // Add closing event at correct chronological location if cycle is closed
        if (cycle.status === 'closed') {
            const closingDate = cycle.end_date || new Date().toISOString().split('T')[0];
            const closingEvent: TimelineEvent = {
                id: `done-${cycle.id}`,
                originalDate: closingDate,
                created_at: closingDate,
                dateLabel: new Date(closingDate).toLocaleDateString('ar-EG', { day: 'numeric', month: 'short', year: 'numeric' }),
                type: 'done',
                title: `إغلاق ${term.singular} نهائياً`,
                description: `تم الانتهاء من كافة العمليات وتسوية الحسابات الرياضية للموردين وصاحب المزرعة بنجاح.`
            };

            // Insert at the beginning or end depending on sorting direction
            if (sortDirection === 'desc') {
                events.unshift(closingEvent);
            } else {
                events.push(closingEvent);
            }
        }

        return events;
    }, [cycle, invoices, expenses, expenseCategories, dailyLogs, suppliers, term, sortDirection]);

    const filteredEvents = useMemo(() => {
        return timelineEvents.filter(event => {
            // Apply category filters
            if (activeFilter === 'invoices' && event.type !== 'invoice') return false;
            if (activeFilter === 'expenses' && event.type !== 'expense') return false;
            if (activeFilter === 'logs' && event.type !== 'daily_log') return false;

            // Apply search filter
            const query = searchQuery.trim().toLowerCase();
            if (!query) return true;
            return (
                event.title.toLowerCase().includes(query) ||
                event.description.toLowerCase().includes(query) ||
                event.dateLabel.includes(query) ||
                (event.tasks && event.tasks.some(t => t.toLowerCase().includes(query))) ||
                (event.categoryName && event.categoryName.toLowerCase().includes(query)) ||
                (event.marketName && event.marketName.toLowerCase().includes(query))
            );
        });
    }, [timelineEvents, activeFilter, searchQuery]);

    const visibleEvents = useMemo(() => {
        return filteredEvents.slice(0, visibleCount);
    }, [filteredEvents, visibleCount]);

    const handleToggleExpand = (id: string) => {
        setExpandedIds(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const handleExpandAll = () => {
        const expanded: Record<string, boolean> = {};
        visibleEvents.forEach(e => {
            expanded[e.id] = true;
        });
        setExpandedIds(expanded);
    };

    const handleCollapseAll = () => {
        setExpandedIds({});
    };

    return (
        <div className="mt-8 max-w-3xl mx-auto pb-20 px-4 sm:px-6">
            
            {/* Control Panel Block */}
            <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-5 rounded-3xl shadow-sm mb-8 space-y-4">
                
                {/* Search & Sort Row */}
                <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1">
                        <Search className="absolute right-3.5 top-2.5 w-4.5 h-4.5 text-neutral-400 pointer-events-none" />
                        <input 
                            type="text"
                            placeholder="بحث في خط زمني العروة (المبيعات، المهام الزراعية، المشتريات)..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-4 pr-10 py-2 rounded-2xl border border-neutral-250 dark:border-neutral-800 bg-white dark:bg-neutral-950 font-bold text-xs focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none"
                        />
                    </div>
                    
                    <div className="flex gap-2">
                        <button 
                            onClick={() => setSortDirection(prev => prev === 'desc' ? 'asc' : 'desc')}
                            className="px-3 py-2 rounded-2xl border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800 flex items-center gap-1.5 text-xs font-bold text-neutral-600 dark:text-neutral-400 cursor-pointer transition-colors"
                            title="ترتيب زمني"
                        >
                            <ArrowUpDown className="w-4 h-4 text-neutral-400" />
                            <span>{sortDirection === 'desc' ? 'الأحدث أولاً' : 'الأقدم أولاً'}</span>
                        </button>

                        <button 
                            onClick={Object.keys(expandedIds).length > 0 ? handleCollapseAll : handleExpandAll}
                            className="px-3.5 py-2 rounded-2xl border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-805 flex items-center justify-center text-xs font-bold text-neutral-500 hover:text-neutral-850 cursor-pointer transition-colors shrink-0"
                        >
                            {Object.keys(expandedIds).length > 0 ? 'طي الكل' : 'تفاصيل الكل'}
                        </button>
                    </div>
                </div>

                {/* Filter Tabs Sub-bar */}
                <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-dashed border-neutral-100 dark:border-neutral-800">
                    <button 
                        onClick={() => setActiveFilter('all')}
                        className={`px-4 py-1.5 rounded-xl text-xs font-black transition-all ${activeFilter === 'all' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-neutral-50 hover:bg-neutral-100 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-500'}`}
                    >
                        الكل
                    </button>
                    <button 
                        onClick={() => setActiveFilter('invoices')}
                        className={`px-4 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all ${activeFilter === 'invoices' ? 'bg-emerald-600 text-white shadow-sm' : 'bg-neutral-50 hover:bg-neutral-100 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-500'}`}
                    >
                        <InvoicesIcon className="w-3.5 h-3.5" />
                        <span>مبيعات وتوريدات</span>
                    </button>
                    <button 
                        onClick={() => setActiveFilter('expenses')}
                        className={`px-4 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all ${activeFilter === 'expenses' ? 'bg-rose-600 text-white shadow-sm' : 'bg-neutral-50 hover:bg-neutral-100 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-500'}`}
                    >
                        <WalletIcon className="w-3.5 h-3.5" />
                        <span>مصروفات تشغيلية</span>
                    </button>
                    <button 
                        onClick={() => setActiveFilter('logs')}
                        className={`px-4 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all ${activeFilter === 'logs' ? 'bg-amber-600 text-white shadow-sm' : 'bg-neutral-50 hover:bg-neutral-100 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-500'}`}
                    >
                        <SparklesIcon className="w-3.5 h-3.5" />
                        <span>سجلات زراعية</span>
                    </button>
                </div>
            </div>

            {/* Timeline Stream */}
            <div className="relative pr-2">
                {visibleEvents.length > 0 ? (
                    <div className="relative">
                        <AnimatePresence mode="popLayout">
                            {visibleEvents.map((event, index) => (
                                <TimelineItem 
                                    key={event.id} 
                                    event={event} 
                                    isLast={index === visibleEvents.length - 1 && filteredEvents.length <= visibleCount} 
                                    isNewest={index === 0 && sortDirection === 'desc'}
                                    isExpanded={!!expandedIds[event.id]}
                                    onToggleExpand={() => handleToggleExpand(event.id)}
                                />
                            ))}
                        </AnimatePresence>
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-24 border-2 border-dashed border-neutral-200 dark:border-neutral-800 rounded-3xl text-neutral-400">
                        <CalendarIcon className="w-12 h-12 opacity-20 mb-3 text-neutral-500" />
                        <h4 className="text-base font-bold italic text-neutral-600 dark:text-neutral-400">لا توجد حركات مطابقة في خط الوقت</h4>
                        <p className="text-xs text-neutral-400 mt-1 opacity-70">قم بتغيير فلاتر العرض أو كلمة البحث للعثور على النتائج.</p>
                    </div>
                )}

                {/* Highly Polished Lazy loading / Show more button */}
                {filteredEvents.length > visibleCount && (
                    <div className="mt-8 flex flex-col items-center gap-2">
                        <button
                            onClick={() => setVisibleCount(prev => prev + 15)}
                            className="px-6 py-3 rounded-2xl bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/40 border border-indigo-150 dark:border-indigo-800/80 text-indigo-600 dark:text-indigo-400 font-extrabold text-xs flex items-center gap-2 cursor-pointer transition-all duration-300 shadow-sm"
                        >
                            <ChevronDown className="w-4 h-4" />
                            <span>عرض المزيد من الحركات ({filteredEvents.length - visibleCount} متبقية)</span>
                        </button>
                        <button
                            onClick={() => setVisibleCount(filteredEvents.length)}
                            className="text-[10px] font-bold text-neutral-400 hover:text-neutral-500 hover:underline transition-colors cursor-pointer"
                        >
                            عرض الكل دفعة واحدة
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default TimelineTab;
