
import React, { useMemo } from 'react';
import Card from '../shared/Card';
import { formatCurrency, calculateInvoiceTotal } from '../../utils/helpers';
import { useData } from '../../contexts/DataContext';
import Skeleton from '../shared/Skeleton';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';

interface CashFlowChartProps {
  period?: string;
  startDate?: string;
  endDate?: string;
}

const CashFlowChart: React.FC<CashFlowChartProps> = ({ period = 'all', startDate = '', endDate = '' }) => {
  const { invoices: hydratedInvoices, expenses: hydratedExpenses, cycles, settings, loading } = useData();

  const activeCycles = useMemo(() => cycles.filter(c => c.status === 'active'), [cycles]);

  const activeCycleName = useMemo(() => {
    if (activeCycles.length === 1) return activeCycles[0].name;
    if (activeCycles.length > 1) return 'العروات النشطة';
    return 'العروة الحالية';
  }, [activeCycles]);

  const data = useMemo(() => {
    const activeCycleIds = new Set(activeCycles.map(c => c.id));
    const activeInvoices = hydratedInvoices.filter(inv => inv.market !== 'رصيد منقول' && inv.market !== 'تمويل يدوي' && activeCycleIds.has(inv.cycle_id));
    const activeExpenses = hydratedExpenses.filter(exp => activeCycleIds.has(exp.cycle_id));
    const now = new Date();

    if (period === 'today') {
      const days: { name: string; revenue: number; expenses: number; originalDate: string }[] = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(now.getDate() - i);
        const dayName = d.toLocaleDateString('ar-EG', { weekday: 'short', day: 'numeric', numberingSystem: 'latn' });
        const dateStr = d.toISOString().split('T')[0];
        days.push({ name: dayName, revenue: 0, expenses: 0, originalDate: dateStr });
      }

      activeInvoices.forEach(invoice => {
        const bucket = days.find(day => day.originalDate === invoice.date);
        if (bucket) bucket.revenue += calculateInvoiceTotal(invoice.price_items, invoice.deductions);
      });

      activeExpenses.forEach(expense => {
        const bucket = days.find(day => day.originalDate === expense.date);
        if (bucket) bucket.expenses += expense.amount;
      });
      return days;

    } else if (period === 'this_week') {
      const days: { name: string; revenue: number; expenses: number; originalDate: string }[] = [];
      const temp = new Date();
      const currentDay = temp.getDay(); 
      const diffToSat = currentDay === 6 ? 0 : -currentDay - 1; 
      const satDate = new Date();
      satDate.setDate(temp.getDate() + diffToSat);
      
      for (let i = 0; i < 7; i++) {
        const d = new Date(satDate);
        d.setDate(satDate.getDate() + i);
        const dayName = d.toLocaleDateString('ar-EG', { weekday: 'long', numberingSystem: 'latn' });
        const dateStr = d.toISOString().split('T')[0];
        days.push({ name: dayName.split(' ')[0], revenue: 0, expenses: 0, originalDate: dateStr });
      }

      activeInvoices.forEach(invoice => {
        const bucket = days.find(day => day.originalDate === invoice.date);
        if (bucket) bucket.revenue += calculateInvoiceTotal(invoice.price_items, invoice.deductions);
      });

      activeExpenses.forEach(expense => {
        const bucket = days.find(day => day.originalDate === expense.date);
        if (bucket) bucket.expenses += expense.amount;
      });
      return days;

    } else if (period === 'this_month' || period === 'last_30_days') {
      const weeksArr = [
        { name: 'الأسبوع 1', revenue: 0, expenses: 0 },
        { name: 'الأسبوع 2', revenue: 0, expenses: 0 },
        { name: 'الأسبوع 3', revenue: 0, expenses: 0 },
        { name: 'الأسبوع 4+', revenue: 0, expenses: 0 }
      ];

      const mStart = period === 'this_month' 
        ? new Date(now.getFullYear(), now.getMonth(), 1)
        : new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30);

      activeInvoices.forEach(invoice => {
        const invDate = new Date(invoice.date);
        if (invDate >= mStart) {
          const diffDays = Math.floor((invDate.getTime() - mStart.getTime()) / (1000 * 60 * 60 * 24));
          const wkIdx = Math.min(3, Math.floor(diffDays / 7));
          weeksArr[wkIdx].revenue += calculateInvoiceTotal(invoice.price_items, invoice.deductions);
        }
      });

      activeExpenses.forEach(expense => {
        const expDate = new Date(expense.date);
        if (expDate >= mStart) {
          const diffDays = Math.floor((expDate.getTime() - mStart.getTime()) / (1000 * 60 * 60 * 24));
          const wkIdx = Math.min(3, Math.floor(diffDays / 7));
          weeksArr[wkIdx].expenses += expense.amount;
        }
      });
      return weeksArr;

    } else if (period === 'last_90_days') {
      const monthsArr: { name: string; revenue: number; expenses: number; groupKey: number }[] = [];
      for (let i = 2; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthName = new Intl.DateTimeFormat('ar-EG', { month: 'long' }).format(d);
        monthsArr.push({ name: monthName, revenue: 0, expenses: 0, groupKey: d.getMonth() });
      }

      activeInvoices.forEach(invoice => {
        const invDate = new Date(invoice.date);
        const diffTime = now.getTime() - invDate.getTime();
        if (diffTime >= 0 && diffTime <= 90 * 1000 * 3600 * 24) {
          const m = invDate.getMonth();
          const bucket = monthsArr.find(b => b.groupKey === m);
          if (bucket) bucket.revenue += calculateInvoiceTotal(invoice.price_items, invoice.deductions);
        }
      });

      activeExpenses.forEach(expense => {
        const expDate = new Date(expense.date);
        const diffTime = now.getTime() - expDate.getTime();
        if (diffTime >= 0 && diffTime <= 90 * 1000 * 3600 * 24) {
          const m = expDate.getMonth();
          const bucket = monthsArr.find(b => b.groupKey === m);
          if (bucket) bucket.expenses += expense.amount;
        }
      });
      return monthsArr;

    } else if (period === 'this_year') {
      const monthsArr = Array.from({ length: 12 }, (_, i) => {
        const d = new Date(now.getFullYear(), i, 1);
        const monthName = d.toLocaleDateString('ar-EG', { month: 'short' });
        return { name: monthName, revenue: 0, expenses: 0 };
      });

      activeInvoices.forEach(invoice => {
        const invDate = new Date(invoice.date);
        if (invDate.getFullYear() === now.getFullYear()) {
          monthsArr[invDate.getMonth()].revenue += calculateInvoiceTotal(invoice.price_items, invoice.deductions);
        }
      });

      activeExpenses.forEach(expense => {
        const expDate = new Date(expense.date);
        if (expDate.getFullYear() === now.getFullYear()) {
          monthsArr[expDate.getMonth()].expenses += expense.amount;
        }
      });
      return monthsArr;

    } else if (period === 'custom') {
      const start = startDate ? new Date(startDate) : new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30);
      const end = endDate ? new Date(endDate) : now;
      const durationDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 3600 * 24));

      if (durationDays <= 12) {
        const days: { name: string; revenue: number; expenses: number; originalDate: string }[] = [];
        for (let i = 0; i <= durationDays; i++) {
          const d = new Date(start);
          d.setDate(start.getDate() + i);
          const dayName = d.toLocaleDateString('ar-EG', { day: 'numeric', month: 'short', numberingSystem: 'latn' });
          const dateStr = d.toISOString().split('T')[0];
          days.push({ name: dayName, revenue: 0, expenses: 0, originalDate: dateStr });
        }

        activeInvoices.forEach(invoice => {
          const bucket = days.find(day => day.originalDate === invoice.date);
          if (bucket) bucket.revenue += calculateInvoiceTotal(invoice.price_items, invoice.deductions);
        });

        activeExpenses.forEach(expense => {
          const bucket = days.find(day => day.originalDate === expense.date);
          if (bucket) bucket.expenses += expense.amount;
        });
        return days;
      } else {
        const monthsArr: { name: string; revenue: number; expenses: number; monthValKey: string }[] = [];
        const iter = new Date(start);
        while (iter <= end) {
          const monthKey = `${iter.getFullYear()}-${iter.getMonth()}`;
          const monthName = iter.toLocaleDateString('ar-EG', { month: 'short', year: 'numeric', numberingSystem: 'latn' });
          if (!monthsArr.some(b => b.monthValKey === monthKey)) {
            monthsArr.push({ name: monthName, revenue: 0, expenses: 0, monthValKey: monthKey });
          }
          iter.setMonth(iter.getMonth() + 1);
        }
        
        activeInvoices.forEach(invoice => {
          const invDate = new Date(invoice.date);
          if (invDate >= start && invDate <= end) {
            const key = `${invDate.getFullYear()}-${invDate.getMonth()}`;
            const bucket = monthsArr.find(b => b.monthValKey === key);
            if (bucket) bucket.revenue += calculateInvoiceTotal(invoice.price_items, invoice.deductions);
          }
        });

        activeExpenses.forEach(expense => {
          const expDate = new Date(expense.date);
          if (expDate >= start && expDate <= end) {
            const key = `${expDate.getFullYear()}-${expDate.getMonth()}`;
            const bucket = monthsArr.find(b => b.monthValKey === key);
            if (bucket) bucket.expenses += expense.amount;
          }
        });
        return monthsArr;
      }
    }

    // Default 'all' - dynamic based on active cycle(s) start date
    if (activeCycles.length === 0) {
      return [{ name: now.toLocaleDateString('ar-EG', { month: 'long' }), revenue: 0, expenses: 0 }];
    }

    // Find the earliest start date among active cycles
    const earliestStart = activeCycles.reduce((earliest, c) => {
      if (!c.start_date) return earliest;
      const cDate = new Date(c.start_date);
      return cDate < earliest ? cDate : earliest;
    }, new Date());

    // If the earliest start is in the future or no start date, just show current month
    if (earliestStart > now) {
      return [{ name: now.toLocaleDateString('ar-EG', { month: 'long' }), revenue: 0, expenses: 0 }];
    }

    const durationDays = Math.ceil((now.getTime() - earliestStart.getTime()) / (1000 * 3600 * 24));
    
    // If duration is <= 90 days, show weeks. Otherwise show months.
    if (durationDays <= 90) {
      // Group by weeks
      const weeksArr: { name: string; revenue: number; expenses: number; originalDate?: string }[] = [];
      const numWeeks = Math.max(1, Math.ceil(durationDays / 7));
      
      for (let i = 0; i < numWeeks; i++) {
        weeksArr.push({ name: `الأسبوع ${i + 1}`, revenue: 0, expenses: 0 });
      }

      activeInvoices.forEach(invoice => {
        const invDate = new Date(invoice.date);
        const diffDays = Math.floor((invDate.getTime() - earliestStart.getTime()) / (1000 * 60 * 60 * 24));
        const wkIdx = Math.min(numWeeks - 1, Math.max(0, Math.floor(diffDays / 7)));
        if (weeksArr[wkIdx]) weeksArr[wkIdx].revenue += calculateInvoiceTotal(invoice.price_items, invoice.deductions);
      });

      activeExpenses.forEach(expense => {
        const expDate = new Date(expense.date);
        const diffDays = Math.floor((expDate.getTime() - earliestStart.getTime()) / (1000 * 60 * 60 * 24));
        const wkIdx = Math.min(numWeeks - 1, Math.max(0, Math.floor(diffDays / 7)));
        if (weeksArr[wkIdx]) weeksArr[wkIdx].expenses += expense.amount;
      });
      return weeksArr;
    } else {
      // Group by months
      const monthsArr: { name: string; revenue: number; expenses: number; monthValKey: string }[] = [];
      const iter = new Date(earliestStart.getFullYear(), earliestStart.getMonth(), 1);
      
      while (iter <= now) {
        const monthKey = `${iter.getFullYear()}-${iter.getMonth()}`;
        const monthName = iter.toLocaleDateString('ar-EG', { month: 'short', year: 'numeric', numberingSystem: 'latn' });
        monthsArr.push({ name: monthName, revenue: 0, expenses: 0, monthValKey: monthKey });
        iter.setMonth(iter.getMonth() + 1);
      }

      activeInvoices.forEach(invoice => {
        const invDate = new Date(invoice.date);
        let key = `${invDate.getFullYear()}-${invDate.getMonth()}`;
        if (invDate < earliestStart) {
           // Put prior items in the first bucket
           key = `${earliestStart.getFullYear()}-${earliestStart.getMonth()}`;
        }
        const bucket = monthsArr.find(b => b.monthValKey === key);
        if (bucket) bucket.revenue += calculateInvoiceTotal(invoice.price_items, invoice.deductions);
      });

      activeExpenses.forEach(expense => {
        const expDate = new Date(expense.date);
        let key = `${expDate.getFullYear()}-${expDate.getMonth()}`;
        if (expDate < earliestStart) {
           key = `${earliestStart.getFullYear()}-${earliestStart.getMonth()}`;
        }
        const bucket = monthsArr.find(b => b.monthValKey === key);
        if (bucket) bucket.expenses += expense.amount;
      });
      return monthsArr;
    }
  }, [hydratedInvoices, hydratedExpenses, activeCycles, period, startDate, endDate]);

  if (loading) {
      return (
        <Card className="h-full flex flex-col">
            <div className="mb-6">
                <Skeleton className="h-5 w-32 mb-2" />
                <Skeleton className="h-3 w-20" />
            </div>
            <div className="flex-1 w-full bg-neutral-50 dark:bg-neutral-900/20 rounded-lg flex items-end p-4 gap-2">
                <Skeleton className="h-[40%] flex-1" />
                <Skeleton className="h-[60%] flex-1" />
                <Skeleton className="h-[30%] flex-1" />
                <Skeleton className="h-[80%] flex-1" />
                <Skeleton className="h-[50%] flex-1" />
            </div>
        </Card>
      );
  }

  const CustomTooltip = ({ active, payload, label }: { active?: boolean, payload?: { value: number }[], label?: string }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-neutral-900/90 backdrop-blur-sm text-white p-3 rounded-lg shadow-xl text-sm border border-neutral-700">
          <p className="font-bold mb-2 text-center border-b border-neutral-600 pb-1">{label}</p>
          <div className="space-y-1">
             <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-accent-success"></div>
                    <span className="text-neutral-300">الإيرادات:</span>
                </div>
                <span className="font-mono font-bold text-accent-success">{formatCurrency(payload[0].value).replace('EGP', '')}</span>
             </div>
             <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-accent-danger"></div>
                    <span className="text-neutral-300">المصروفات:</span>
                </div>
                <span className="font-mono font-bold text-accent-danger">{formatCurrency(payload[1].value).replace('EGP', '')}</span>
             </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="h-full flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-lg font-bold text-neutral-800 dark:text-neutral-50">التدفق النقدي</h3>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            {period === 'all' ? `للعروة (${activeCycleName})` : 
             period === 'this_month' ? 'هذا الشهر' : 
             period === 'this_week' ? 'هذا الأسبوع' : 
             period === 'today' ? 'هذا اليوم' : 
             period === 'last_90_days' ? 'آخر 90 يوم' : 
             period === 'this_year' ? 'هذا العام' : 
             'مخصص'}
          </p>
        </div>
      </div>
      
      <div className="flex-1 w-full min-h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10B981" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="colorExpenses" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#F43F5E" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#F43F5E" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={settings.theme === 'dark' ? '#374151' : '#E5E7EB'} />
            <XAxis 
                dataKey="name" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: settings.theme === 'dark' ? '#9CA3AF' : '#6B7280', fontSize: 12 }} 
                dy={10}
            />
            <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: settings.theme === 'dark' ? '#9CA3AF' : '#6B7280', fontSize: 12 }}
                tickFormatter={(value) => `${value / 1000}k`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area type="monotone" dataKey="revenue" stroke="#10B981" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" activeDot={{ r: 6, strokeWidth: 0, fill: '#10B981' }} />
            <Area type="monotone" dataKey="expenses" stroke="#F43F5E" strokeWidth={3} fillOpacity={1} fill="url(#colorExpenses)" activeDot={{ r: 6, strokeWidth: 0, fill: '#F43F5E' }} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
};

export default CashFlowChart;
