
import React, { useMemo, useState } from 'react';
import type { Cycle } from '../../types';
import { formatCurrency, formatNumber } from '../../utils/helpers';
import { Info } from 'lucide-react';
import { 
    BarChartSimpleIcon, 
    PercentIcon, 
    LeafIcon, 
    BoxIcon,
    TruckIcon,
    TrendingUpIcon,
    TrendingDownIcon,
    DollarIcon,
    ChevronLeftIcon,
    ChevronRightIcon,
    WavyArrowUpIcon,
    WavyArrowDownIcon,
    ScaleIcon
} from '../Icons';
import { useData } from '../../contexts/DataContext';
import { 
    ResponsiveContainer, 
    Tooltip, 
    AreaChart,
    Area,
    BarChart,
    Bar,
    PieChart,
    Pie,
    Cell,
    ReferenceLine,
    XAxis,
    YAxis,
    CartesianGrid
} from 'recharts';
import { motion } from 'motion/react';

const GridCard: React.FC<{ children: React.ReactNode; title?: string; className?: string; subtitle?: string }> = ({ children, title, className = "", subtitle }) => (
    <motion.div 
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        whileHover={{ y: -4, boxShadow: "0 10px 30px -10px rgba(0,0,0,0.08)" }}
        className={`bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-sm overflow-hidden flex flex-col h-full transition-shadow duration-300 ${className}`}
    >
        {title && (
            <div className="px-5 py-4 shrink-0 border-b border-neutral-50 dark:border-neutral-800/50">
                <h3 className="text-[13px] font-black text-neutral-800 dark:text-neutral-200 uppercase tracking-wider truncate">{title}</h3>
                {subtitle && <p className="text-2xs text-neutral-500 font-bold mt-0.5 truncate">{subtitle}</p>}
            </div>
        )}
        <div className="p-5 flex-grow flex flex-col justify-between">{children}</div>
    </motion.div>
);

const MetricBox: React.FC<{ label: string; value: string | number; subValue?: string; icon: React.ElementType; color: string; bgColor: string; tooltip?: string }> = ({ label, value, subValue, icon: Icon, color, bgColor, tooltip }) => (
    <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        whileHover={{ y: -3, scale: 1.02 }}
        className="flex items-center gap-4 p-5 rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 shadow-sm group relative cursor-default" 
        title={tooltip}
    >
        <div className={`p-3.5 rounded-2xl ${bgColor} ${color} transition-transform group-hover:scale-110 shadow-sm`}>
            <Icon className="w-7 h-7" />
        </div>
        <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1 mb-0.5">
                <p className="text-2xs font-bold text-neutral-500 dark:text-neutral-400 truncate uppercase tracking-tighter">{label}</p>
                {tooltip && <span className="text-2xs bg-neutral-100 dark:bg-neutral-800 text-neutral-400 w-3.5 h-3.5 flex items-center justify-center rounded-full cursor-help shrink-0">?</span>}
            </div>
            <div className="flex items-baseline gap-1">
                <p className="text-xl font-black text-neutral-800 dark:text-neutral-50 tabular-nums truncate">{value}</p>
                {subValue && <span className="text-2xs font-bold text-neutral-400 shrink-0">{subValue}</span>}
            </div>
        </div>
    </motion.div>
);

// const COLORS = ['#10B981', '#3B82F6', '#F59E0B', '#F43F5E', '#8B5CF6', '#EC4899', '#6366F1'];

// 1. محلل استهلاك المغذيات
const MonthlyNutrientAnalysis: React.FC<{ cycle: Cycle }> = ({ cycle }) => {
    const { expenses, expenseCategories } = useData();
    const [periodOffset, setPeriodOffset] = useState(0);

    const nutrientExpenses = useMemo(() => {
        const isNutrientCategory = (catId: string) => {
            const cat = expenseCategories.find(c => c.id === catId);
            if (!cat) return false;
            const name = cat.name.toLowerCase();
            const isSeed = name.includes('بذور') || name.includes('بذرة') || name.includes('تقاوي') || name.includes('شتلات') || name.includes('شتلة');
            return cat.is_supplier_category && !isSeed;
        };
        return expenses.filter(e => e.cycle_id === cycle.id && isNutrientCategory(e.category_id));
    }, [expenses, expenseCategories, cycle.id]);

    const stats = useMemo(() => {
        const now = new Date();
        now.setHours(23, 59, 59, 999);
        const getPeriodSum = (offset: number) => {
            const end = new Date(now);
            end.setDate(end.getDate() - (offset * 30));
            const start = new Date(end);
            start.setDate(start.getDate() - 30);
            start.setHours(0, 0, 0, 0);
            return {
                sum: nutrientExpenses.filter(e => {
                    const d = new Date(e.date);
                    return d >= start && d <= end;
                }).reduce((s, e) => s + e.amount, 0),
                start, end
            };
        };
        const current = getPeriodSum(periodOffset);
        const previous = getPeriodSum(periodOffset + 1);
        const diff = current.sum - previous.sum;
        const percent = previous.sum > 0 ? (diff / previous.sum) * 100 : (current.sum > 0 ? 100 : 0);
        return { current, previous, diff, percent };
    }, [nutrientExpenses, periodOffset]);

    if (nutrientExpenses.length === 0) return (
        <GridCard title="محلل استهلاك المغذيات" subtitle="مقارنة شهرية للأسمدة والمبيدات." className="border-indigo-500/20">
            <div className="flex flex-col items-center justify-center py-8 text-center text-neutral-400 h-full">
                <LeafIcon className="w-10 h-10 opacity-20 mb-2" />
                <p className="text-sm font-bold italic">لا توجد مصروفات مغذيات.</p>
                <p className="text-2xs mt-1 opacity-70">بانتظار تسجيل أول مصروف أسمدة أو مبيدات.</p>
            </div>
        </GridCard>
    );

    return (
        <GridCard title="محلل استهلاك المغذيات" subtitle="مقارنة شهرية للأسمدة والمبيدات." className="border-indigo-500/20">
            <div className="space-y-4 h-full flex flex-col justify-between">
                <div className="flex items-center justify-between gap-2 px-1">
                    <button onClick={() => setPeriodOffset(prev => prev + 1)} className="w-8 h-8 flex items-center justify-center rounded-lg bg-neutral-100 dark:bg-neutral-800 text-neutral-400 hover:text-primary transition-all border border-neutral-200 dark:border-neutral-700"><ChevronRightIcon className="w-4 h-4" /></button>
                    <div className="text-center min-w-0">
                        <p className="text-2xs font-black text-neutral-400 uppercase tracking-tighter">فترة 30 يوم</p>
                        <p className="text-2xs font-bold text-neutral-700 dark:text-neutral-200 tabular-nums">{stats.current.start.toLocaleDateString('ar-EG', {day:'numeric', month:'short', numberingSystem: 'latn'})} – {stats.current.end.toLocaleDateString('ar-EG', {day:'numeric', month:'short', numberingSystem: 'latn'})}</p>
                    </div>
                    <button onClick={() => setPeriodOffset(prev => Math.max(0, prev - 1))} disabled={periodOffset === 0} className="w-8 h-8 flex items-center justify-center rounded-lg bg-neutral-100 dark:bg-neutral-800 text-neutral-400 hover:text-primary disabled:opacity-10 transition-all border border-neutral-200 dark:border-neutral-700"><ChevronLeftIcon className="w-4 h-4" /></button>
                </div>
                <div className="relative p-5 rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 shadow-sm">
                    <div className="flex items-center justify-between gap-4 relative z-10">
                        <div className="flex-1">
                            <p className="text-2xs font-black text-neutral-400 uppercase mb-0.5">إجمالي المنصرف</p>
                            <div className="flex items-baseline gap-1"><span className="text-2xl font-black text-accent-info dark:text-accent-info tabular-nums">{formatNumber(Math.round(stats.current.sum))}</span><span className="text-2xs font-bold text-neutral-400">ج.م</span></div>
                        </div>
                        <div className={`flex flex-col items-end px-3 py-1.5 rounded-2xl ${stats.diff > 0 ? 'bg-accent-danger/10' : 'bg-accent-success/10'}`}>
                            <div className="flex items-center gap-1">{stats.diff > 0 ? <WavyArrowUpIcon className="w-3 h-3 text-accent-danger" /> : <WavyArrowDownIcon className="w-3 h-3 text-accent-success" />}<span className={`text-[11px] font-black tabular-nums ${stats.diff > 0 ? 'text-accent-danger' : 'text-accent-success'}`}>{stats.percent > 0 ? '+' : ''}{stats.percent.toFixed(1)}%</span></div>
                        </div>
                    </div>
                </div>
                {/* Micro Bar Chart - Increased height and fixed text cutoff */}
                <div className="flex items-end gap-3 h-[4.5rem] px-1">
                    <div className="flex-1 h-full flex flex-col justify-end gap-1.5">
                        <div className="w-full bg-neutral-100 dark:bg-neutral-800 rounded-t-md overflow-hidden relative flex-grow">
                            <div className="absolute bottom-0 left-0 right-0 bg-indigo-300 dark:bg-accent-info/20" style={{ height: `${(stats.previous.sum / Math.max(stats.current.sum, stats.previous.sum, 1)) * 100}%` }}></div>
                        </div>
                        <span className="text-2xs font-black text-neutral-500 dark:text-neutral-400 text-center uppercase whitespace-nowrap leading-normal pb-0.5">السابق</span>
                    </div>
                    <div className="flex-1 h-full flex flex-col justify-end gap-1.5">
                        <div className="w-full bg-neutral-100 dark:bg-neutral-800 rounded-t-md overflow-hidden relative flex-grow">
                            <div className="absolute bottom-0 left-0 right-0 bg-indigo-600" style={{ height: `${(stats.current.sum / Math.max(stats.current.sum, stats.previous.sum, 1)) * 100}%` }}></div>
                        </div>
                        <span className="text-2xs font-black text-accent-info dark:text-accent-info text-center uppercase whitespace-nowrap leading-normal pb-0.5">الحالي</span>
                    </div>
                </div>
            </div>
        </GridCard>
    );
};

// 2. محلل كفاءة الأسواق
const MarketEfficiencyAnalysis: React.FC<{ invoiceStatsList: { id: string, market: string, date: string, declaredPrice: number, netPerRealKilo: number, efficiency: number }[] }> = ({ invoiceStatsList }) => {
    const [currentIdx, setCurrentIdx] = useState(0);
    const currentInv = invoiceStatsList[currentIdx];

    if (invoiceStatsList.length === 0) return (
        <GridCard title="محلل كفاءة الأسواق" subtitle="تحليل الفواتير المسجلة." className="border-accent-success/20">
            <div className="flex flex-col items-center justify-center py-8 text-center text-neutral-400 h-full">
                <TruckIcon className="w-10 h-10 opacity-20 mb-2" />
                <p className="text-sm font-bold italic">لا توجد فواتير مبيعات.</p>
                <p className="text-2xs mt-1 opacity-70">بانتظار تسجيل أول فاتورة لتحليل الأسواق.</p>
            </div>
        </GridCard>
    );

    return (
        <GridCard title="محلل كفاءة الأسواق" subtitle="صافي سعر الكيلو vs السوق." className="border-accent-success/20">
            <div className="space-y-4 h-full flex flex-col justify-between">
                <div className="flex items-center justify-between gap-2 px-1">
                    <button onClick={() => setCurrentIdx(prev => Math.min(prev + 1, invoiceStatsList.length - 1))} disabled={currentIdx === invoiceStatsList.length - 1} className="w-8 h-8 flex items-center justify-center rounded-lg bg-neutral-100 dark:bg-neutral-800 text-neutral-400 hover:text-primary transition-all border border-neutral-200 dark:border-neutral-700 disabled:opacity-10"><ChevronRightIcon className="w-4 h-4" /></button>
                    <div className="text-center min-w-0">
                        <p className="text-2xs font-black text-neutral-400 truncate">{currentInv.market}</p>
                        <p className="text-2xs font-bold text-neutral-700 dark:text-neutral-200 tabular-nums">{currentInv.date}</p>
                    </div>
                    <button onClick={() => setCurrentIdx(prev => Math.max(prev - 1, 0))} disabled={currentIdx === 0} className="w-8 h-8 flex items-center justify-center rounded-lg bg-neutral-100 dark:bg-neutral-800 text-neutral-400 hover:text-primary disabled:opacity-10 transition-all border border-neutral-200 dark:border-neutral-700"><ChevronLeftIcon className="w-4 h-4" /></button>
                </div>
                <div className="relative p-4 rounded-2xl bg-gradient-to-br from-emerald-50/30 to-white dark:from-emerald-900/5 dark:to-neutral-900 border border-accent-success/20/50 dark:border-neutral-700 shadow-sm overflow-hidden">
                    <div className="flex items-center justify-between gap-4 relative z-10">
                        <div className="flex-1">
                            <p className="text-2xs font-black text-neutral-400 uppercase mb-0.5">صافي الكيلو الحقيقي</p>
                            <div className="flex items-baseline gap-1">
                                <span className="text-2xl font-black text-accent-success dark:text-accent-success tabular-nums">{currentInv.netPerRealKilo.toFixed(2)}</span>
                                <span className="text-2xs font-bold text-neutral-400">ج.م</span>
                            </div>
                        </div>
                        <div className="flex flex-col items-end px-2.5 py-1 rounded-xl border border-accent-success/20 dark:border-accent-success/30 bg-white dark:bg-neutral-800 shadow-sm">
                             <span className="text-[11px] font-black text-primary tabular-nums">%{currentInv.efficiency.toFixed(1)}</span>
                        </div>
                    </div>
                </div>
                {/* Market Price Bar Chart - Increased height and fixed text cutoff */}
                <div className="flex items-end gap-3 h-[4.5rem] px-1">
                    <div className="flex-1 h-full flex flex-col justify-end gap-1.5">
                        <div className="w-full bg-neutral-100 dark:bg-neutral-800 rounded-t-md overflow-hidden relative flex-grow">
                            <div className="absolute bottom-0 left-0 right-0 bg-accent-success" style={{ height: `${(currentInv.netPerRealKilo / Math.max(currentInv.declaredPrice, 1)) * 100}%` }}></div>
                        </div>
                        <span className="text-2xs font-black text-accent-success dark:text-accent-success text-center uppercase whitespace-nowrap leading-normal pb-0.5">الصافي: {currentInv.netPerRealKilo.toFixed(1)}ج</span>
                    </div>
                    <div className="flex-1 h-full flex flex-col justify-end gap-1.5">
                        <div className="w-full bg-neutral-100 dark:bg-neutral-800 rounded-t-md overflow-hidden relative flex-grow border-x border-t border-neutral-200 dark:border-neutral-700">
                            <div className="absolute bottom-0 left-0 right-0 bg-neutral-300 dark:bg-neutral-600" style={{ height: '100%' }}></div>
                        </div>
                        <span className="text-2xs font-black text-neutral-500 dark:text-neutral-400 text-center uppercase whitespace-nowrap leading-normal pb-0.5">السوق: {currentInv.declaredPrice.toFixed(1)}ج</span>
                    </div>
                </div>
            </div>
        </GridCard>
    );
};

// 3. محلل النبض الإنتاجي
const DailyPulseAnalysis: React.FC<{ cycle: Cycle, harvestCurveData: { date: string, weight: number }[] }> = ({ cycle, harvestCurveData }) => {
    const { invoices } = useData();
    
    const harvestDaysCount = useMemo(() => {
        const cycleInvoices = invoices.filter(inv => inv.cycle_id === cycle.id && inv.market !== 'رصيد منقول' && inv.market !== 'تمويل يدوي');
        if (cycleInvoices.length === 0) return 0;
        const sorted = [...cycleInvoices].sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        const firstDate = new Date(sorted[0].date);
        
        // حساب عدد الأيام من أول فاتورة لأخر فاتورة
        const endDate = new Date(sorted[sorted.length - 1].date);
        
        firstDate.setHours(0,0,0,0);
        endDate.setHours(0,0,0,0);
        
        const diffTime = endDate.getTime() - firstDate.getTime();
        return Math.max(1, Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1);
    }, [invoices, cycle.id]);

    return (
        <GridCard title="النبض الإنتاجي" subtitle="معدل الجمع والتدفق الحقيقي." className="border-accent-warning/20">
            <div className="space-y-4 h-full flex flex-col justify-between">
                <div className="flex items-center justify-between bg-white dark:bg-neutral-900 px-4 py-3 rounded-2xl border border-neutral-100 dark:border-neutral-800 shadow-sm">
                    <div className="text-right">
                        <p className="text-2xs font-black text-neutral-400 uppercase tracking-tighter">إجمالي الجمع</p>
                        <p className="text-2xs font-bold text-neutral-700 dark:text-neutral-200 tabular-nums">{formatNumber(Math.round(cycle.totalProductionKg || 0))} كجم</p>
                    </div>
                    <div className="text-left border-r border-neutral-200 dark:border-neutral-700 pr-4">
                        <p className="text-2xs font-black text-neutral-400 uppercase tracking-tighter">عمر الجمع</p>
                        <p className="text-2xs font-bold text-accent-warning tabular-nums">{harvestDaysCount} يوم</p>
                    </div>
                </div>
                <div className="relative p-4 rounded-2xl bg-gradient-to-br from-amber-50/30 to-white dark:from-amber-900/5 dark:to-neutral-900 border border-accent-warning/20/50 dark:border-neutral-700 shadow-sm">
                    <div className="flex items-center justify-between gap-4 relative z-10">
                    	<div className="flex-1">
                            <p className="text-2xs font-black text-neutral-400 uppercase mb-0.5">المعدل اليومي</p>
                            <div className="flex items-baseline gap-1"><span className="text-2xl font-black text-accent-warning dark:text-accent-warning tabular-nums">{(cycle.avgDailyProductionKg || 0).toFixed(1)}</span><span className="text-2xs font-bold text-neutral-400">كج/يوم</span></div>
                    	</div>
                        <div className="p-2 bg-white dark:bg-neutral-800 rounded-xl border border-accent-warning/20 dark:border-accent-warning/30 shadow-sm text-center">
                            <LeafIcon className="w-5 h-5 text-accent-success" />
                        </div>
                    </div>
                </div>
                <div className="h-24 w-full" dir="ltr">
                    {harvestCurveData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={harvestCurveData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                                <defs><linearGradient id="pColor" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10B981" stopOpacity={0.4}/><stop offset="95%" stopColor="#10B981" stopOpacity={0}/></linearGradient></defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#888" opacity={0.12} />
                                <Tooltip 
                                    contentStyle={{ borderRadius: '14px', border: 'none', boxShadow: '0 4px 15px rgba(0,0,0,0.1)', backgroundColor: '#171717', color: '#fff' }}
                                    itemStyle={{ fontSize: '11px', fontWeight: 'bold', color: '#10B981' }}
                                    labelStyle={{ fontSize: '10px', color: '#a3a3a3' }}
                                    formatter={(value: number) => [`${formatNumber(value)} كجم`, 'الجمع']}
                                    cursor={{ stroke: '#10B981', strokeWidth: 1, strokeDasharray: '3 3', opacity: 0.5 }}
                                />
                                <Area type="monotone" dataKey="weight" stroke="#10B981" strokeWidth={2.5} fill="url(#pColor)" dot={{ r: 2, fill: '#10B981' }} activeDot={{ r: 5 }} />
                                {cycle.avgDailyProductionKg && cycle.avgDailyProductionKg > 0 && (
                                    <ReferenceLine y={cycle.avgDailyProductionKg} stroke="#F59E0B" strokeDasharray="3 3" strokeOpacity={0.5} />
                                )}
                            </AreaChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-neutral-400">
                            <ScaleIcon className="w-6 h-6 opacity-20 mb-1" />
                            <p className="text-2xs italic">لم يتم تسجيل أي جمعيات حتى الآن.</p>
                        </div>
                    )}
                </div>
            </div>
        </GridCard>
    );
};

const PriceRadarAnalysis: React.FC<{ invoiceStatsList: { id: string, market: string, date: string, declaredPrice: number, netPerRealKilo: number, efficiency: number }[] }> = ({ invoiceStatsList }) => {
    const [chartMode, setChartMode] = useState<'area' | 'bar'>('area');
    const data = useMemo(() => {
        // Ensure uniqueness for XAxis by keeping only the last invoice per day, or grouping by day
        const groupedMap = new Map();
        [...invoiceStatsList]
            .filter(inv => inv.declaredPrice > 0)
            .sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime())
            .forEach(inv => {
                const dateObj = new Date(inv.date);
                const dateLabel = dateObj.toLocaleDateString('ar-EG', { day: 'numeric', month: 'short' });
                groupedMap.set(dateLabel, {
                    ...inv,
                    dateLabel,
                    'سعر السوق': Number(inv.declaredPrice.toFixed(2)),
                    timestamp: dateObj.getTime(),
                    originalDate: inv.date
                });
            });
        return Array.from(groupedMap.values()).sort((a, b) => a.timestamp - b.timestamp);
    }, [invoiceStatsList]);

    if (data.length === 0) return null;

    const averagePrice = data.reduce((acc, curr) => acc + curr['سعر السوق'], 0) / data.length;
    const maxPriceObj = data.reduce((max, curr) => curr['سعر السوق'] > max['سعر السوق'] ? curr : max, data[0]);
    const minPriceObj = data.reduce((min, curr) => curr['سعر السوق'] < min['سعر السوق'] ? curr : min, data[0]);

    const maxVal = maxPriceObj['سعر السوق'];
    const minVal = minPriceObj['سعر السوق'];
    const yMin = minVal - (minVal * 0.1);

    const fillHeight = maxVal - yMin;
    const strokeHeight = maxVal - minVal;

    const avgPercentFill = fillHeight === 0 ? 50 : Math.max(0, Math.min(100, Math.round(((maxVal - averagePrice) / fillHeight) * 100)));
    const minPercentFill = fillHeight === 0 ? 100 : Math.max(0, Math.min(100, Math.round(((maxVal - minVal) / fillHeight) * 100)));

    const avgPercentStroke = strokeHeight === 0 ? 50 : Math.max(0, Math.min(100, Math.round(((maxVal - averagePrice) / strokeHeight) * 100)));

    return (
        <GridCard title="مؤشر أسعار المبيعات" subtitle="تتبع متوسط سعر البيع للكيلو عبر أيام العروة." className="col-span-full border-teal-500/20 px-0">
            {/* Chart Type Toggle Tabs */}
            <div className="flex gap-2 justify-end mb-4 px-5">
                <button 
                    onClick={() => setChartMode('area')}
                    className={`px-3.5 py-1.5 rounded-xl text-2xs font-black cursor-pointer transition-all ${chartMode === 'area' ? 'bg-teal-600 text-white shadow-xs' : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-500 hover:text-neutral-800'}`}
                >
                    مساحة متدفقة
                </button>
                <button 
                    onClick={() => setChartMode('bar')}
                    className={`px-3.5 py-1.5 rounded-xl text-2xs font-black cursor-pointer transition-all ${chartMode === 'bar' ? 'bg-teal-600 text-white shadow-xs' : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-500 hover:text-neutral-800'}`}
                >
                    مؤشر بياني بالأعمدة
                </button>
            </div>

            <div className="-mx-5 h-[320px] w-[calc(100%+40px)] mt-2 relative" dir="ltr">
                <ResponsiveContainer width="100%" height="100%">
                    {chartMode === 'area' ? (
                        <AreaChart data={data} margin={{ top: 30, right: 15, left: 15, bottom: 10 }}>
                            <defs>
                                <linearGradient id="colorStrokeOverview" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#10B981" />
                                    <stop offset={`${avgPercentStroke}%`} stopColor="#F59E0B" />
                                    <stop offset="100%" stopColor="#EF4444" />
                                </linearGradient>
                                <linearGradient id="colorFillOverview" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#10B981" stopOpacity={0.4}/>
                                    <stop offset={`${avgPercentFill}%`} stopColor="#F59E0B" stopOpacity={0.2}/>
                                    <stop offset={`${minPercentFill}%`} stopColor="#EF4444" stopOpacity={0.1}/>
                                    <stop offset="100%" stopColor="#EF4444" stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#888" opacity={0.1} />
                            <XAxis 
                                dataKey="dateLabel" 
                                tick={{ fontSize: 10, fill: '#9ca3af', fontWeight: 'bold' }} 
                                axisLine={false} 
                                tickLine={false} 
                                dy={10} 
                                minTickGap={30} 
                            />
                            <YAxis hide domain={['dataMin - (dataMin*0.1)', 'dataMax + (dataMax*0.1)']} />
                            <Tooltip 
                                contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 4px 25px rgba(0,0,0,0.1)', backgroundColor: 'var(--tw-colors-neutral-900, #171717)', color: '#fff' }}
                                itemStyle={{ fontSize: '13px', fontWeight: '900', color: '#F59E0B' }}
                                labelStyle={{ fontSize: '11px', color: '#a3a3a3', marginBottom: '8px' }}
                                formatter={(value: number) => [`${value} ج`, 'سعر السوق']}
                                cursor={{ stroke: '#F59E0B', strokeWidth: 1, strokeDasharray: '4 4', opacity: 0.5 }}
                            />

                            <ReferenceLine y={averagePrice} stroke="#F59E0B" strokeDasharray="5 5" opacity={0.6} label={{ value: 'المعدل ' + averagePrice.toFixed(1), fill: '#F59E0B', position: 'top', fontSize: 9, fontWeight: 'bold' }} />
                            
                            <Area 
                                type="linear" 
                                name="سعر السوق" 
                                dataKey="سعر السوق" 
                                stroke="url(#colorStrokeOverview)" 
                                strokeWidth={2.5} 
                                fillOpacity={1} 
                                fill="url(#colorFillOverview)" 
                                dot={{ r: 3, fill: '#fff', stroke: '#10B981', strokeWidth: 2 }}
                                activeDot={{ r: 6, stroke: '#F59E0B', strokeWidth: 2, fill: '#fff' }} 
                            />
                        </AreaChart>
                    ) : (
                        <BarChart data={data} margin={{ top: 30, right: 15, left: 15, bottom: 10 }}>
                            <defs>
                                <linearGradient id="colorBarOverview" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#10B981" />
                                    <stop offset="50%" stopColor="#F59E0B" />
                                    <stop offset="100%" stopColor="#EF4444" />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#888" opacity={0.1} />
                            <XAxis 
                                dataKey="dateLabel" 
                                tick={{ fontSize: 10, fill: '#9ca3af', fontWeight: 'bold' }} 
                                axisLine={false} 
                                tickLine={false} 
                                dy={10} 
                                minTickGap={30} 
                            />
                            <YAxis hide domain={['dataMin - (dataMin*0.1)', 'dataMax + (dataMax*0.1)']} />
                            <Tooltip 
                                contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 4px 25px rgba(0,0,0,0.1)', backgroundColor: '#171717', color: '#fff' }}
                                itemStyle={{ fontSize: '13px', fontWeight: '900', color: '#10B981' }}
                                labelStyle={{ fontSize: '11px', color: '#a3a3a3', marginBottom: '8px' }}
                                formatter={(value: number) => [`${value} ج`, 'سعر السوق']}
                                cursor={{ fill: 'rgba(0,0,0,0.05)' }}
                            />

                            <ReferenceLine y={averagePrice} stroke="#F59E0B" strokeDasharray="5 5" opacity={0.6} label={{ value: 'المعدل ' + averagePrice.toFixed(1), fill: '#F59E0B', position: 'top', fontSize: 9, fontWeight: 'bold' }} />
                            
                            <Bar 
                                name="سعر السوق" 
                                dataKey="سعر السوق" 
                                fill="url(#colorBarOverview)" 
                                radius={[6, 6, 0, 0]}
                                maxBarSize={32}
                            />
                        </BarChart>
                    )}
                </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap justify-center items-center gap-3 mt-8 pb-3 px-5">
                 <div className="flex items-center gap-2 bg-neutral-100 dark:bg-neutral-800 px-3 py-1.5 rounded-full border border-neutral-200 dark:border-neutral-700">
                     <div className="w-2.5 h-2.5 rounded-full bg-gradient-to-b from-emerald-500 via-amber-500 to-rose-500 shadow-sm opacity-80"></div>
                     <span className="text-[11px] font-black text-neutral-700 dark:text-neutral-200">سعر البيع</span>
                 </div>
                 {maxPriceObj && (
                     <div className="flex items-center gap-2 bg-accent-success/10 dark:bg-accent-success/10 px-3 py-1.5 rounded-full border border-accent-success/20 dark:border-accent-success/20">
                          <svg className="w-3.5 h-3.5 text-accent-success dark:text-accent-success" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
                          <span className="text-[11px] font-bold text-accent-success dark:text-accent-success">الأعلى سعراً: {maxPriceObj['سعر السوق']} ج <span className="opacity-70 font-normal">(يوم {maxPriceObj.dateLabel})</span></span>
                     </div>
                 )}
                 {minPriceObj && (
                     <div className="flex items-center gap-2 bg-accent-danger/10 dark:bg-accent-danger/10 px-3 py-1.5 rounded-full border border-accent-danger/20 dark:border-accent-danger/20">
                          <svg className="w-3.5 h-3.5 text-accent-danger dark:text-accent-danger" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" /></svg>
                          <span className="text-[11px] font-bold text-accent-danger dark:text-accent-danger">الأقل سعراً: {minPriceObj['سعر السوق']} ج <span className="opacity-70 font-normal">(يوم {minPriceObj.dateLabel})</span></span>
                     </div>
                 )}
            </div>
        </GridCard>
    );
};

// 4. تقرير تسوية العروة والحصاد المالي
const FinancialReconciliationStatement: React.FC<{ cycle: Cycle }> = ({ cycle }) => {
    const { expenses, advances, farmerWithdrawals, supplierPayments } = useData();
    
    // Expenses
    const cycleExpenses = useMemo(() => expenses.filter(e => e.cycle_id === cycle.id), [expenses, cycle.id]);
    const establishmentCash = useMemo(() => cycleExpenses.filter(e => (e.is_establishment === true || String(e.is_establishment) === 'true') && e.payment_method === 'cash').reduce((s, e) => s + (Number(e.amount) || 0), 0), [cycleExpenses]);
    const operatingCash = useMemo(() => cycleExpenses.filter(e => (e.is_establishment === false || String(e.is_establishment) === 'false' || !e.is_establishment) && e.payment_method === 'cash').reduce((s, e) => s + (Number(e.amount) || 0), 0), [cycleExpenses]);
    const totalCredit = useMemo(() => cycleExpenses.filter(e => e.payment_method === 'credit').reduce((s, e) => s + (Number(e.amount) || 0), 0), [cycleExpenses]);

    // Supplier payments
    const cycleSupplierPayments = useMemo(() => supplierPayments.filter(p => p.cycle_id === cycle.id).reduce((s, p) => s + (Number(p.amount) || 0), 0), [supplierPayments, cycle.id]);
    
    // Remaining supplier debt
    const remainingSupplierDebt = Math.max(0, totalCredit - cycleSupplierPayments);

    // Advances
    const cycleAdvances = useMemo(() => advances.filter(a => a.cycle_id === cycle.id).reduce((s, a) => s + (Number(a.amount) || 0), 0), [advances, cycle.id]);

    // Farmer
    const hasFarmer = Boolean(cycle.responsible_farmer_id) && (cycle.farmerShare || 0) > 0;
    const farmerShare = hasFarmer ? (cycle.farmerShare || 0) : 0;
    const cycleFarmerWithdrawals = useMemo(() => farmerWithdrawals.filter(w => w.cycle_id === cycle.id).reduce((s, w) => s + (Number(w.amount) || 0), 0), [farmerWithdrawals, cycle.id]);

    const remainingFarmerDues = hasFarmer ? (farmerShare - cycleFarmerWithdrawals) : 0;
    const farmerOverdrawn = hasFarmer && remainingFarmerDues < 0 ? Math.abs(remainingFarmerDues) : 0;
    const farmerOwed = hasFarmer && remainingFarmerDues > 0 ? remainingFarmerDues : 0;

    const totalRevenue = cycle.revenue || 0;
    
    // Net Flow from Cycle = Revenue - (Cash Ops + Supplier Payments + Advances + Farmer Withdrawals)
    const currentTreasury = totalRevenue - (operatingCash + cycleSupplierPayments + cycleAdvances + cycleFarmerWithdrawals);
    
    const ownerProfit = cycle.profit || 0;
    const ownerTotalExpected = establishmentCash + ownerProfit;

    const mathReconciliation = currentTreasury + cycleAdvances + farmerOverdrawn - remainingSupplierDebt - farmerOwed;
    const isReconciled = Math.abs(mathReconciliation - ownerTotalExpected) < 1;

    // Hide if cycle net profit is less than or equal to 0
    if ((cycle.profit || 0) <= 0) return null;

    return (
        <GridCard title="الحصاد المالي وتسوية العروة (شامل التأسيس)" subtitle="تقرير تسوية رياضي دقيق يوضح حقوقك وكيفية تحصيلها من السيولة المتوفرة." className="col-span-1 border-indigo-500/20 bg-gradient-to-br from-white to-indigo-50/30 dark:from-neutral-900 dark:to-indigo-900/10 xl:col-span-6">
            <div className="flex flex-col lg:flex-row gap-6 h-full p-2">
                
                {/* 1. حق المالك الإجمالي */}
                <div className="flex-1 space-y-4">
                    <h4 className="text-[11px] font-black text-neutral-500 dark:text-neutral-400 uppercase tracking-widest flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 shadow-sm shadow-indigo-500/50"></span> حق المالك الإجمالي (الهدف)
                    </h4>
                    
                    <div className="space-y-3.5 pl-4 border-r-2 border-accent-info/20 dark:border-accent-info/30 mr-2 py-1">
                        <div className="flex justify-between items-center text-sm" title="مبلغ التأسيس الذي تم ضخه من المالك نقداً">
                            <span className="font-bold text-neutral-600 dark:text-neutral-300">تكلفة تأسيسية مستردة</span>
                            <span className="font-black tabular-nums">{formatNumber(Math.round(establishmentCash))} ج.م</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                            <span className="font-bold text-neutral-600 dark:text-neutral-300">صافي ربح وحصيلة المالك</span>
                            <span className="font-black text-accent-success tabular-nums">+{formatNumber(Math.round(ownerProfit))} ج.م</span>
                        </div>
                    </div>
                    
                    <div className="bg-accent-info/10 dark:bg-accent-info/20 p-5 rounded-2xl border border-accent-info/20 dark:border-accent-info/30 flex justify-between items-center mt-4">
                        <div className="flex flex-col gap-1">
                            <span className="text-sm font-black text-accent-info dark:text-accent-info">إجمالي المطلوب للمالك</span>
                            <span className="text-2xs font-bold text-accent-info/80 tracking-wider">رأس مال التأسيس + الأرباح</span>
                        </div>
                        <span className="text-2xl font-black text-accent-info dark:text-accent-info tabular-nums">{formatNumber(Math.round(ownerTotalExpected))} ج.م</span>
                    </div>

                    {isReconciled && (
                        <div className="flex items-center gap-2 bg-accent-success/10 text-accent-success p-3 rounded-xl border border-accent-success/20 mt-2">
                            <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                            <span className="text-2xs font-bold tracking-wide">المعادلة متطابقة 100%. أموالك المتوقعة تساوي بالضبط محصلة الأصول والخصوم.</span>
                        </div>
                    )}
                </div>

                {/* 2. تسوية الخزنة */}
                <div className="flex-[1.5] space-y-4">
                    <h4 className="text-[11px] font-black text-neutral-500 dark:text-neutral-400 uppercase tracking-widest flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-accent-success shadow-sm shadow-accent-success/50"></span> أين سنجد هذه الأموال فعلياً؟ (الأصول والخصوم)
                    </h4>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4 pl-4 border-r-2 border-accent-success/20 dark:border-accent-success/30 mr-2 py-1">
                        
                        {/* الإيجابيات (أموال لنا) */}
                        <div className="space-y-3.5">
                            <div className="flex justify-between items-center text-sm" title="صافي الإيراد الحقيقي لهذه العروة بعد خصم المدفوعات النقدية التشغيلية">
                                <span className="font-bold text-accent-success flex items-center gap-1.5 cursor-help">
                                    <Info className="w-3.5 h-3.5 opacity-60" />
                                    (+) سيولة صافية من العروة
                                </span>
                                <span className="font-black text-accent-success tabular-nums">{formatNumber(Math.round(currentTreasury))} ج.م</span>
                            </div>
                            <div className="flex justify-between items-center text-sm opacity-90" title="سلف خرجت من درج العروة ولم ترد">
                                <span className="font-bold text-accent-success flex items-center gap-1.5 cursor-help">
                                    <Info className="w-3.5 h-3.5 opacity-60" />
                                    (+) سلف استخرجت لم تسترد
                                </span>
                                <span className="font-black text-accent-success tabular-nums">{formatNumber(Math.round(cycleAdvances))} ج.م</span>
                            </div>
                            <div className={`flex justify-between items-center text-sm ${farmerOverdrawn > 0 ? '' : 'opacity-40'}`}>
                                <span className="font-bold text-accent-success flex items-center gap-1.5 cursor-help" title="سحب المزارع مدفوعات نقدية أكبر من حصته المستحقة بالربح">
                                    <Info className="w-3.5 h-3.5 opacity-60" />
                                    (+) سحب بالزيادة على المزارع
                                </span>
                                <span className="font-black text-accent-success tabular-nums">{formatNumber(Math.round(farmerOverdrawn))} ج.م</span>
                            </div>
                        </div>

                        {/* السلبيات (أموال علينا) */}
                        <div className="space-y-3.5">
                            <div className={`flex justify-between items-center text-sm ${remainingSupplierDebt > 0 ? '' : 'opacity-40'}`}>
                                <span className="font-bold text-accent-danger flex items-center gap-1.5 cursor-help" title="ديون لم تسدد لموردي الأسمدة والمبيدات الخاصة بهذه العروة">
                                    <Info className="w-3.5 h-3.5 opacity-60" />
                                    (-) ديون أسمدة للموردين
                                </span>
                                <span className="font-black text-accent-danger tabular-nums">{formatNumber(Math.round(remainingSupplierDebt))} ج.م</span>
                            </div>
                            <div className={`flex justify-between items-center text-sm ${farmerOwed > 0 ? '' : 'opacity-40'}`}>
                                <span className="font-bold text-accent-danger flex items-center gap-1.5 cursor-help" title="حصة المزارع من الربح التي لم يسحبها بعد">
                                    <Info className="w-3.5 h-3.5 opacity-60" />
                                    (-) باقي مستحق للمزارع 
                                </span>
                                <span className="font-black text-accent-danger tabular-nums">{formatNumber(Math.round(farmerOwed))} ج.م</span>
                            </div>
                            
                            <div className="pt-2 mt-2 border-t border-neutral-100 dark:border-neutral-800/50 flex justify-between items-center text-sm">
                                <span className="font-extrabold text-neutral-800 dark:text-neutral-200 flex items-center gap-1.5 cursor-help" title="الأصول (السيولة والديون لنا) - الخصوم (ديون علينا)">
                                    <Info className="w-3.5 h-3.5 opacity-40 text-neutral-500" />
                                    = صافي المطابقة الرياضية
                                </span>
                                <span className="font-black tabular-nums text-accent-info dark:text-accent-info cursor-help" title={`المعادلة: ${formatNumber(Math.round(currentTreasury))} + ${formatNumber(Math.round(cycleAdvances))} + ${formatNumber(Math.round(farmerOverdrawn))} - ${formatNumber(Math.round(remainingSupplierDebt))} - ${formatNumber(Math.round(farmerOwed))}`}>{formatNumber(Math.round(mathReconciliation))} ج.م</span>
                            </div>
                        </div>
                    </div>
                
                    {/* 3. المؤشرات المالية المتقدمة للعروة */}
                    <div className="mt-6 border-t border-neutral-100 dark:border-neutral-800/50 pt-4">
                        {/* صافي الخزنة إذا تم السداد */}
                        <div className={`p-3 rounded-xl border ${currentTreasury - (remainingSupplierDebt + farmerOwed) >= 0 ? 'bg-accent-success/10/50 border-accent-success/20 dark:bg-accent-success/20/10 dark:border-accent-success/30' : 'bg-accent-danger/10/50 border-accent-danger/20 dark:bg-accent-danger/20/10 dark:border-accent-danger/30'}`}>
                            <div className="flex justify-between items-center mb-1">
                                <span className="text-2xs font-bold text-neutral-500">صافي الدرج بعد سداد الديون</span>
                                <span className={`text-xs font-black tabular-nums ${currentTreasury - (remainingSupplierDebt + farmerOwed) >= 0 ? 'text-accent-success dark:text-accent-success' : 'text-accent-danger dark:text-accent-danger'}`}>
                                    {formatNumber(Math.round(currentTreasury - (remainingSupplierDebt + farmerOwed)))} ج.م
                                </span>
                            </div>
                            <p className="text-2xs text-neutral-400">المتبقي من كاش العروة بعد دفع كل الديون المستحقة.</p>
                        </div>
                    </div>

                </div>

            </div>
        </GridCard>
    );
};

const OverviewTab: React.FC<{ cycle: Cycle }> = ({ cycle }) => {
    const { invoices } = useData();
    
    const cycleInvoices = useMemo(() => 
        (invoices || [])
            .filter(inv => inv.cycle_id === cycle.id && inv.market !== 'رصيد منقول' && inv.market !== 'تمويل يدوي')
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()), 
    [invoices, cycle.id]);

    const harvestCurveData = useMemo(() => {
        const grouped = cycleInvoices.reduce((acc: Record<string, number>, inv) => {
            const date = inv.date.split('-').slice(1).reverse().join('/');
            const soldWeight = inv.price_items.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
            if (acc[date]) { acc[date] += soldWeight; } else { acc[date] = soldWeight; }
            return acc;
        }, {});
        return Object.keys(grouped).map(date => ({ date, weight: grouped[date] }));
    }, [cycleInvoices]);

    const invoiceStatsList = useMemo(() => {
        return [...cycleInvoices].reverse().map(inv => {
            const isFutureMarket = inv.market.includes('المستقبل');
            const isCarton = inv.packaging_type === 'carton';
            const p_count = Number(inv.packaging_count || 0);
            const totalRevenue = inv.price_items.reduce((s, it) => s + (Number(it.quantity) * Number(it.price_per_kg)), 0);
            const totalExpenses = inv.deductions.reduce((s, d) => s + (Number(d.amount) || 0), 0) + ((isFutureMarket && isCarton) ? (p_count * 10) : 0);
            const realGrossWeight = inv.price_items.reduce((s, it) => s + Number(it.quantity), 0) + ((isFutureMarket && isCarton) ? (p_count * 2) : 0);
            const netInvoiceProfit = totalRevenue - totalExpenses;
            const netPerRealKilo = realGrossWeight > 0 ? (netInvoiceProfit / realGrossWeight) : 0;
            const declaredPrice = Number(inv.price_items[0]?.price_per_kg) || 0;
            const efficiency = declaredPrice > 0 ? (netPerRealKilo / declaredPrice) * 100 : 0;
            return { id: inv.id, market: inv.market, date: inv.date, declaredPrice, netPerRealKilo, efficiency };
        });
    }, [cycleInvoices]);

    // grossSales was removed because it was defined but never used

    const unitLabel = cycle.unit_of_measure === 'area' ? 'الفدان' : 'النبات';
    
    // توحيد الألوان لتتناسب مع هوية التطبيق (درجات الأحمر والبرتقالي للمصروفات)
    const COLORS_CHART = ['#F43F5E', '#FB923C', '#FBBF24', '#34D399', '#60A5FA', '#818CF8', '#A78BFA'];

    const hasFarmer = Boolean(cycle.responsible_farmer_id) && (cycle.farmerShare || 0) > 0;
    // تحديد مسمى الإيراد بناءً على حالة نظام المزارع وحصة المزارع
    const revenueLabel = hasFarmer
        ? `إيراد المالك لـ ${unitLabel}`
        : `إيراد ${unitLabel}`;

    const totalOwnerInflow = cycle.revenue - (hasFarmer ? (cycle.farmerShare || 0) : 0);
    const target = cycle.expenses;
    const isRecovered = totalOwnerInflow >= target;
    // إزالة الحد الأقصى (100) للسماح بعرض النسب الأكبر من 100%
    const progress = target > 0 ? Math.max(0, Math.round((totalOwnerInflow / target) * 100)) : (totalOwnerInflow > 0 ? 100 : 0);
    const remaining = Math.max(0, target - totalOwnerInflow);

    return (
        <div className="space-y-6 mt-6 pb-10 animate-page-enter">
            {/* Top Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                <MetricBox label="إجمالي المبيعات" value={formatCurrency(cycle.revenue).replace('EGP', '')} icon={TrendingUpIcon} color="text-accent-info dark:text-accent-info" bgColor="bg-accent-info/10 dark:bg-accent-info/10" tooltip="إجمالي إيرادات المبيعات الفعلي لليد بعد خصم العمولات والمصاريف" />
                <MetricBox label="إجمالي المصروفات" value={formatCurrency(cycle.expenses).replace('EGP', '')} icon={TrendingDownIcon} color="text-accent-danger dark:text-accent-danger" bgColor="bg-accent-danger/10 dark:bg-accent-danger/10" tooltip="إجمالي التكاليف والمصروفات على العروة" />
                <MetricBox label="صافي ربح المالك" value={formatCurrency(cycle.profit).replace('EGP', '')} icon={BarChartSimpleIcon} color="text-accent-success dark:text-accent-success" bgColor="bg-accent-success/10 dark:bg-accent-success/10" tooltip="إجمالي الإيرادات ناقص إجمالي المصروفات وحصة المزارع (إن وجدت)" />
                {hasFarmer && (
                    <MetricBox label="ربح المزارع" value={formatCurrency(cycle.farmerShare || 0).replace('EGP', '')} icon={DollarIcon} color="text-accent-warning dark:text-accent-warning" bgColor="bg-accent-warning/10 dark:bg-accent-warning/10" tooltip="إجمالي ربح المزارع من العروة (المستحق)" />
                )}
                <MetricBox label="إجمالي الإنتاج الحقيقي" value={formatNumber(Math.round(cycle.totalProductionKg || 0))} subValue="ك.ج" icon={ScaleIcon} color="text-accent-success dark:text-accent-success" bgColor="bg-accent-success/10 dark:bg-accent-success/10" tooltip="إجمالي الوزن الفعلي المباع بعد خصم الفوارغ" />
                <MetricBox label="إجمالي الطرود" value={formatNumber((cycle.totalCartons || 0) + (cycle.totalCages || 0))} icon={BoxIcon} color="text-orange-500 dark:text-orange-400" bgColor="bg-orange-50 dark:bg-orange-500/10" tooltip="مجموع الكراتين والأقفاص الموردة للأسواق" />
                <MetricBox label="العائد على الاستثمار" value={`${formatNumber(Math.round(cycle.returnOnInvestment || 0))}%`} icon={PercentIcon} color="text-accent-info dark:text-accent-info" bgColor="bg-accent-info/10 dark:bg-accent-info/10" tooltip="نسبة الأرباح الصافية مقارنة بإجمالي التكاليف (ROI)" />
            </div>

            {/* Break-even Progress Bar */}
            <div className={`bg-white dark:bg-neutral-800 p-6 rounded-3xl border ${isRecovered ? 'border-amber-400 dark:border-accent-warning shadow-[0_0_20px_rgba(251,191,36,0.2)] relative overflow-hidden' : 'border-neutral-200 dark:border-neutral-700/50 shadow-soft'}`}>
                {isRecovered && (
                    <div className="absolute inset-0 bg-gradient-to-br from-amber-400/10 to-transparent dark:from-amber-500/10 pointer-events-none animate-pulse"></div>
                )}
                <div className="flex justify-between items-end mb-3 relative z-10">
                    <div>
                        <h3 className={`text-sm font-black mb-1 ${isRecovered ? 'text-accent-warning dark:text-accent-warning' : 'text-neutral-800 dark:text-neutral-200'}`}>
                            استرداد رأس المال (نقطة التعادل)
                            {isRecovered && <span className="ml-2 inline-block animate-bounce">🚀</span>}
                        </h3>
                        <p className={`text-2xs font-bold ${isRecovered ? 'text-accent-warning/80 dark:text-accent-warning/80' : 'text-neutral-500 dark:text-neutral-400'}`}>
                            {isRecovered 
                                ? (progress > 100 ? `أرباح صافية: +${formatNumber(cycle.profit)} ج.م` : 'تم تغطية كافة التكاليف، العروة الآن تحقق أرباحاً صافية!')
                                : `متبقي ${formatCurrency(remaining).replace('EGP', '')} ج.م لتغطية التكاليف.`}
                        </p>
                    </div>
                    <div className="text-left">
                        <span className={`text-2xl font-black tabular-nums ${isRecovered ? 'text-accent-warning' : 'text-primary'}`}>
                            {progress}%
                        </span>
                    </div>
                </div>
                <div className="h-3 w-full bg-neutral-100 dark:bg-neutral-700 rounded-full overflow-hidden flex relative z-10">
                    <div 
                        className={`h-full transition-all duration-1000 ease-out ${isRecovered ? 'bg-accent-warning' : 'bg-primary'}`} 
                        style={{ width: `${Math.min(100, progress)}%` }}
                    ></div>
                </div>
            </div>

            <FinancialReconciliationStatement cycle={cycle} />

            {/* Performance Indicators */}
            <GridCard title={`مؤشرات أداء ${unitLabel} الواحد`} subtitle={`تحليل الجدوى المالية والإنتاجية لكل ${unitLabel}.`} className="border-primary/10">

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <MetricBox label={`إنتاج ${unitLabel}`} value={(cycle.productionPerPlantKg || 0).toFixed(2)} subValue="كجم" icon={LeafIcon} color="text-accent-success dark:text-accent-success" bgColor="bg-accent-success/10 dark:bg-accent-success/10" tooltip={`متوسط ما ينتجه ${unitLabel} الواحد من المحصول`} />
                    <MetricBox label={`تكلفة ${unitLabel}`} value={(cycle.costPerPlant || 0).toFixed(2)} subValue="ج.م" icon={TrendingDownIcon} color="text-accent-danger dark:text-accent-danger" bgColor="bg-accent-danger/10 dark:bg-accent-danger/10" tooltip={`متوسط التكلفة المصروفة على ${unitLabel} الواحد`} />
                    <MetricBox label={revenueLabel} value={(cycle.revenuePerPlant || 0).toFixed(2)} subValue="ج.م" icon={TrendingUpIcon} color="text-accent-info dark:text-accent-info" bgColor="bg-accent-info/10 dark:bg-accent-info/10" tooltip={`متوسط الإيراد العائد من ${unitLabel} الواحد`} />
                    <MetricBox label={`ربح ${unitLabel} الصافي`} value={(cycle.profitPerPlant || 0).toFixed(2)} subValue="ج.م" icon={DollarIcon} color="text-primary" bgColor="bg-primary/5 dark:bg-primary/10" tooltip={`صافي الربح النهائي لكل ${unitLabel} بعد خصم التكاليف`} />
                </div>
            </GridCard>

            {/* Unified Analysis Grid (3 Cards in one row on desktop) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
                <MonthlyNutrientAnalysis cycle={cycle} />
                <MarketEfficiencyAnalysis invoiceStatsList={invoiceStatsList} />
                <DailyPulseAnalysis cycle={cycle} harvestCurveData={harvestCurveData} />
            </div>

            {/* Price Radar Chart */}
            <PriceRadarAnalysis invoiceStatsList={invoiceStatsList} />

            {/* Final Breakdown Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <GridCard title="توزيع المصروفات التشغيلية" subtitle="نسبة استهلاك كل فئة.">
                    <div className="h-[250px] w-full mt-4 relative">
                        {cycle.expenseBreakdown && cycle.expenseBreakdown.length > 0 ? (
                            <>
                                {/* Centered text overlay panel inside the Donut chart shape */}
                                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none translate-y-[-10px]">
                                    <span className="text-2xs font-black text-neutral-400 dark:text-neutral-500 uppercase tracking-wide">المجموع</span>
                                    <span className="text-sm font-black text-neutral-800 dark:text-neutral-100 tabular-nums">
                                        {formatNumber(Math.round(cycle.expenseBreakdown.reduce((sum, it) => sum + Number(it.amount), 0)))} ج
                                    </span>
                                </div>
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie 
                                            data={cycle.expenseBreakdown} 
                                            innerRadius={55} 
                                            outerRadius={75} 
                                            paddingAngle={4} 
                                            dataKey="amount" 
                                            nameKey="category"
                                            animationDuration={800}
                                        >
                                            {cycle.expenseBreakdown.map((_, index) => <Cell key={`cell-${index}`} fill={COLORS_CHART[index % COLORS_CHART.length]} />)}
                                        </Pie>
                                        <Tooltip 
                                            contentStyle={{ borderRadius: '14px', border: 'none', boxShadow: '0 4px 15px rgba(0,0,0,0.1)', backgroundColor: '#171717', color: '#fff' }}
                                            formatter={(value: number) => {
                                                const total = cycle.expenseBreakdown?.reduce((s, it) => s + Number(it.amount), 0) || 1;
                                                return [`${formatNumber(value)} ج.م (${((value / total) * 100).toFixed(1)}%)`, 'القيمة'];
                                            }}
                                        />
                                    </PieChart>
                                </ResponsiveContainer>
                            </>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-neutral-400">
                                <TrendingDownIcon className="w-10 h-10 opacity-20 mb-2" />
                                <p className="text-sm italic font-bold">لم يتم تسجيل أي مصروفات.</p>
                            </div>
                        )}
                        <div className="flex flex-wrap justify-center gap-4 mt-2">
                             {cycle.expenseBreakdown?.map((item, index) => (
                                <div key={item.category} className="flex items-center gap-1.5">
                                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS_CHART[index % COLORS_CHART.length] }}></div>
                                    <span className="text-2xs font-bold text-neutral-500">{item.category}</span>
                                </div>
                             ))}
                        </div>
                    </div>
                </GridCard>

                <GridCard title="تحليل خصومات المبيعات" subtitle="أين تذهب الفروقات؟">
                    <div className="space-y-3 mt-2 overflow-y-auto max-h-[280px] pr-2">
                        {cycle.deductionBreakdown && cycle.deductionBreakdown.length > 0 ? (
                            cycle.deductionBreakdown.map((deduction, idx) => (
                                <div key={idx} className="bg-white dark:bg-neutral-900 p-4 rounded-2xl border border-neutral-100 dark:border-neutral-800 shadow-sm">
                                    <div className="flex justify-between items-center mb-1">
                                        <span className="text-xs font-black text-neutral-800 dark:text-white uppercase">{deduction.name}</span>
                                        <span className="text-2xs font-black text-accent-danger">%{deduction.percentageOfRevenue?.toFixed(1)}</span>
                                    </div>
                                    <p className="text-base font-black text-accent-danger tracking-tighter">{formatNumber(deduction.totalAmount)}<span className="text-2xs mr-1 opacity-60">ج.م</span></p>
                                </div>
                            ))
                        ) : (
                            <div className="py-10 flex flex-col items-center justify-center text-neutral-400">
                                <TrendingUpIcon className="w-10 h-10 opacity-20 mb-2" />
                                <p className="text-sm italic font-bold">لا توجد خصومات مبيعات مسجلة.</p>
                            </div>
                        )}
                    </div>
                </GridCard>
            </div>
        </div>
    );
};

export default OverviewTab;
