
import React, { useMemo } from 'react';
import { useData } from '../../contexts/DataContext';
import { useUI } from '../../contexts/UIContext';
import { calculateInvoiceTotal, formatNumber } from '../../utils/helpers';
import Card from '../shared/Card';
import { 
    TrendingUpIcon, 
    ChartBarIcon, 
} from '../Icons';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    LineChart,
    Line,
} from 'recharts';

const WeeklyAnalysis: React.FC = () => {
    const { invoices, expenses, settings, cycles } = useData();
    const { loading } = useUI();

    // دالة لجلب اسم الشهر بالعربي
    const getMonthName = (date: Date) => {
        return new Intl.DateTimeFormat('ar-EG', { month: 'long' }).format(date);
    };

    const activeCycleIds = useMemo(() => 
        new Set((cycles || []).filter(c => c.status === 'active').map(c => c.id)),
    [cycles]);

    const activeInvoices = useMemo(() => 
        invoices.filter(inv => activeCycleIds.has(inv.cycle_id) && inv.market !== 'رصيد منقول'),
    [invoices, activeCycleIds]);

    const activeExpenses = useMemo(() => 
        expenses.filter(exp => activeCycleIds.has(exp.cycle_id)),
    [expenses, activeCycleIds]);

    // معالجة البيانات أسبوعياً
    const weeklyData = useMemo(() => {
        const weeksMap: Record<string, { start: Date, revenue: number, expenses: number, label: string, weekNum: number }> = {};
        
        const processDate = (date: Date) => {
            const d = new Date(date);
            d.setHours(0, 0, 0, 0);
            const day = d.getDate();
            const weekNum = Math.ceil(day / 7);
            const month = getMonthName(d);
            const label = `أسبوع ${weekNum} - ${month}`;
            const key = `${d.getFullYear()}-${d.getMonth()}-${weekNum}`;
            return { key, label, weekNum, start: new Date(d.getFullYear(), d.getMonth(), (weekNum - 1) * 7 + 1) };
        };

        activeInvoices.forEach(inv => {
            const { key, label, weekNum, start } = processDate(new Date(inv.date));
            if (!weeksMap[key]) weeksMap[key] = { start, revenue: 0, expenses: 0, label, weekNum };
            
            const cycle = cycles.find(c => c.id === inv.cycle_id);
            const pct = Number(cycle?.farmer_share_percentage) || 0;
            const total = calculateInvoiceTotal(inv.price_items, inv.deductions);
            const invoiceFarmerShare = total * (pct / 100);

            weeksMap[key].revenue += (total - invoiceFarmerShare);
        });

        activeExpenses.forEach(exp => {
            const { key, label, weekNum, start } = processDate(new Date(exp.date));
            if (!weeksMap[key]) weeksMap[key] = { start, revenue: 0, expenses: 0, label, weekNum };
            weeksMap[key].expenses += exp.amount;
        });

        return Object.values(weeksMap)
            .sort((a, b) => a.start.getTime() - b.start.getTime())
            .map((w, idx) => ({ ...w, shortLabel: `W${idx + 1}`, profit: w.revenue - w.expenses }));
    }, [activeInvoices, activeExpenses, cycles]);

    // بيانات آخر أسبوع للبطاقات العلوية
    const lastWeek = useMemo(() => {
        return weeklyData.length > 0 ? weeklyData[weeklyData.length - 1] : null;
    }, [weeklyData]);

    const totals = useMemo(() => {
        const rev = weeklyData.reduce((s, w) => s + w.revenue, 0);
        const exp = weeklyData.reduce((s, w) => s + w.expenses, 0);
        const profit = rev - exp;
        const margin = rev > 0 ? (profit / rev) * 100 : 0;
        return { rev, exp, profit, margin };
    }, [weeklyData]);

    if (loading) return (
        <div className="flex flex-col items-center justify-center py-20 animate-pulse">
            <ChartBarIcon className="w-12 h-12 text-neutral-300 mb-4" />
            <p className="text-neutral-500 font-bold">جاري تحليل الأداء الأسبوعي...</p>
        </div>
    );

    if (weeklyData.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-center px-4">
                <div className="bg-neutral-100 dark:bg-neutral-800 p-6 rounded-full mb-6">
                    <ChartBarIcon className="w-16 h-16 text-neutral-400" />
                </div>
                <h2 className="text-2xl font-black text-neutral-800 dark:text-neutral-100">لا توجد بيانات تحليلية بعد</h2>
                <p className="text-neutral-500 max-w-sm mt-2">ابدأ بإضافة الفواتير والمصروفات لتظهر لك الرسوم البيانية والتحليلات هنا.</p>
            </div>
        );
    }

    const CustomTooltip = ({ active, payload }: { active?: boolean, payload?: { payload: { label: string }, color: string, value: number, name: string }[], label?: string }) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 p-3 rounded-xl shadow-xl text-right">
                    <p className="font-black text-xs mb-2 border-b pb-1 border-neutral-100 dark:border-neutral-800">{payload[0].payload.label}</p>
                    {payload.map((p: { color: string, value: number, name: string }, i: number) => (
                        <div key={i} className="flex items-center justify-between gap-4 py-0.5">
                            <span className="text-xs font-bold" style={{ color: p.color }}>{p.value.toLocaleString('ar-EG', { numberingSystem: 'latn' })} ج.م</span>
                            <span className="text-2xs text-neutral-500 font-black">{p.name}</span>
                        </div>
                    ))}
                </div>
            );
        }
        return null;
    };

    return (
        <div className="space-y-8 pb-24 max-w-5xl mx-auto px-1 sm:px-4">
            {/* Header Section */}
            <div className="text-center space-y-1">
                <h1 className="text-3xl font-black text-neutral-900 dark:text-white tracking-tight">التحليل الأسبوعي</h1>
                <p className="text-neutral-400 dark:text-neutral-500 font-bold text-xs uppercase tracking-widest">إحصائيات الأسبوع الأخير</p>
            </div>

            {/* 3 Compact Summary Cards (Last Week Only) */}
            <div className="grid grid-cols-3 gap-2 sm:gap-4">
                <Card className="flex flex-col items-center justify-center p-3 sm:p-5 bg-white dark:bg-neutral-900 rounded-3xl border-transparent shadow-soft">
                    <p className="text-2xs sm:text-2xs font-black text-neutral-400 uppercase tracking-tighter mb-1">إجمالي الإيرادات</p>
                    <div className="flex items-baseline gap-1">
                        <span className="text-sm sm:text-xl font-black tabular-nums text-emerald-600 dark:text-emerald-400">{formatNumber(lastWeek?.revenue || 0)}</span>
                        <span className="text-2xs sm:text-2xs font-bold text-neutral-400">ج.م</span>
                    </div>
                </Card>

                <Card className="flex flex-col items-center justify-center p-3 sm:p-5 bg-white dark:bg-neutral-900 rounded-3xl border-transparent shadow-soft">
                    <p className="text-2xs sm:text-2xs font-black text-neutral-400 uppercase tracking-tighter mb-1">إجمالي المصروفات</p>
                    <div className="flex items-baseline gap-1">
                        <span className="text-sm sm:text-xl font-black tabular-nums text-rose-600 dark:text-rose-400">{formatNumber(lastWeek?.expenses || 0)}</span>
                        <span className="text-2xs sm:text-2xs font-bold text-neutral-400">ج.م</span>
                    </div>
                </Card>

                <Card className="flex flex-col items-center justify-center p-3 sm:p-5 bg-white dark:bg-neutral-900 rounded-3xl border-transparent shadow-soft">
                    <p className="text-2xs sm:text-2xs font-black text-neutral-400 uppercase tracking-tighter mb-1">صافي الربح</p>
                    <div className="flex items-baseline gap-1">
                        <span className="text-sm sm:text-xl font-black tabular-nums text-blue-600 dark:text-blue-400">{formatNumber(lastWeek?.profit || 0)}</span>
                        <span className="text-2xs sm:text-2xs font-bold text-neutral-400">ج.م</span>
                    </div>
                </Card>
            </div>

            {/* Profit Margin Progress */}
            <Card className="bg-white dark:bg-neutral-900 p-6 rounded-[2.5rem] border-transparent shadow-soft">
                <div className="flex justify-between items-center mb-4">
                    <span className="text-sm font-black text-neutral-400 uppercase">هامش الربح الكلي</span>
                    <span className="text-lg font-black text-neutral-800 dark:text-white tabular-nums">{Math.round(totals.margin)}%</span>
                </div>
                <div className="h-4 w-full bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden text-right" dir="rtl">
                    <div 
                        className="h-full bg-emerald-600 transition-all duration-1000 ease-out shadow-[0_0_15px_rgba(16,185,129,0.3)]" 
                        style={{ width: `${Math.min(100, Math.max(0, totals.margin))}%` }}
                    />
                </div>
            </Card>

            {/* Grouped Bar Chart: Revenue vs Expenses */}
            <Card className="bg-white dark:bg-neutral-900 p-8 rounded-[3rem] border-transparent shadow-soft overflow-hidden">
                <div className="flex items-center justify-between mb-8">
                    <h3 className="text-xl font-black text-neutral-800 dark:text-neutral-100">الإيرادات والمصروفات الأسبوعية</h3>
                    <div className="p-2 bg-neutral-50 dark:bg-neutral-800 rounded-xl">
                        <TrendingUpIcon className="w-5 h-5 text-emerald-500" />
                    </div>
                </div>
                <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={weeklyData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={settings.theme === 'dark' ? '#262626' : '#f3f4f6'} />
                            <XAxis dataKey="shortLabel" axisLine={false} tickLine={false} tick={{ fill: '#9CA3AF', fontSize: 11, fontWeight: 'bold' }} dy={10} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fill: '#9CA3AF', fontSize: 10 }} tickFormatter={(val) => `${val / 1000}k`} />
                            <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc', opacity: 0.1 }} />
                            <Bar name="الإيرادات" dataKey="revenue" fill="#059669" radius={[4, 4, 0, 0]} barSize={12} />
                            <Bar name="المصروفات" dataKey="expenses" fill="#E11D48" radius={[4, 4, 0, 0]} barSize={12} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
                <div className="flex justify-center gap-6 mt-6">
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-emerald-600 rounded-sm"></div>
                        <span className="text-xs font-black text-neutral-500">الإيرادات</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-rose-600 rounded-sm"></div>
                        <span className="text-xs font-black text-neutral-500">المصروفات</span>
                    </div>
                </div>
            </Card>

            {/* Line Chart: Net Profit Trend */}
            <Card className="bg-white dark:bg-neutral-900 p-8 rounded-[3rem] border-transparent shadow-soft overflow-hidden">
                <div className="flex items-center justify-between mb-8">
                    <h3 className="text-xl font-black text-neutral-800 dark:text-neutral-100">اتجاه صافي الربح الأسبوعي</h3>
                    <TrendingUpIcon className="w-6 h-6 text-emerald-500" />
                </div>
                <div className="h-[250px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={weeklyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={settings.theme === 'dark' ? '#262626' : '#f3f4f6'} />
                            <XAxis dataKey="shortLabel" axisLine={false} tickLine={false} tick={{ fill: '#9CA3AF', fontSize: 11, fontWeight: 'bold' }} dy={10} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fill: '#9CA3AF', fontSize: 10 }} tickFormatter={(val) => `${val / 1000}k`} />
                            <Tooltip content={<CustomTooltip />} />
                            <Line 
                                name="صافي الربح" 
                                type="monotone" 
                                dataKey="profit" 
                                stroke="#059669" 
                                strokeWidth={3} 
                                dot={{ r: 4, fill: '#059669', strokeWidth: 2, stroke: '#fff' }} 
                                activeDot={{ r: 6, strokeWidth: 0 }} 
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </Card>

            {/* Weekly Details List - Redesigned to match image exactly */}
            <div className="space-y-4">
                <div className="px-6 flex justify-end mb-2">
                    <h3 className="text-2xl font-black text-neutral-900 dark:text-white">تفاصيل الأسابيع</h3>
                </div>

                <div className="bg-white dark:bg-neutral-900 rounded-[2.5rem] shadow-soft border border-neutral-100 dark:border-neutral-800 overflow-hidden">
                    {/* Table Header like the image */}
                    <div className="grid grid-cols-4 px-6 py-5 text-[12px] sm:text-sm font-black text-neutral-400 uppercase border-b border-neutral-100 dark:border-neutral-800/50 tracking-tight">
                        <div className="text-right">الأسبوع</div>
                        <div className="text-center pr-4 sm:pr-8">الإيرادات</div>
                        <div className="text-center">المصروفات</div>
                        <div className="text-left">الربح</div>
                    </div>

                    <div className="divide-y divide-neutral-50 dark:divide-neutral-800/30">
                        {[...weeklyData].reverse().map((week, idx) => (
                            <div key={idx} className="grid grid-cols-4 items-center px-6 py-4 sm:py-5 hover:bg-neutral-50 dark:hover:bg-neutral-800/30 transition-colors group">
                                <div className="text-right">
                                    <h4 className="text-xs sm:text-base font-bold text-neutral-800 dark:text-neutral-100">{week.label}</h4>
                                </div>
                                <div className="text-center">
                                    <p className="text-[11px] sm:text-sm font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                                        {formatNumber(Math.round(week.revenue))} <span className="text-2xs sm:text-2xs font-bold">ج.م</span>
                                    </p>
                                </div>
                                <div className="text-center">
                                    <p className="text-[11px] sm:text-sm font-bold text-rose-600 dark:text-rose-400 tabular-nums">
                                        {formatNumber(Math.round(week.expenses))} <span className="text-2xs sm:text-2xs font-bold">ج.م</span>
                                    </p>
                                </div>
                                <div className="text-left">
                                    <p className={`text-[11px] sm:text-base font-black tabular-nums ${week.profit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                        {formatNumber(Math.round(week.profit))} 
                                        <span className="text-2xs sm:text-2xs mr-1 font-bold">ج.م</span>
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default WeeklyAnalysis;
