import InlineLoading from "../shared/InlineLoading";
import React, { useMemo, useState } from 'react';
import type { Cycle } from '../../types';
import { useData } from '../../contexts/DataContext';
import { useUI } from '../../contexts/UIContext';
import { calculateInvoiceTotal, formatNumber } from '../../utils/helpers';
import { 
  TrendingUp, 
  TrendingDown, 
  ChevronDown, 
  ChevronUp, 
  Coins,
  Receipt,
  Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const WeeklyTab: React.FC<{ cycle: Cycle }> = ({ cycle }) => {
  const { invoices, expenses } = useData();
  const { loading } = useUI();
  const [viewType, setViewType] = useState<'monthly' | 'weekly'>('monthly');
  const [expandedPeriod, setExpandedPeriod] = useState<string | null>(null);

  // دالة لجلب رقم الأسبوع من اليوم
  const getWeekOfMonth = (date: Date) => {
    const day = date.getDate();
    return Math.ceil(day / 7);
  };

  // دالة لجلب اسم الشهر والسنة بالعربي
  const getMonthLabel = (date: Date) => {
    return new Intl.DateTimeFormat('ar-EG', { month: 'long', year: 'numeric' }).format(date);
  };

  // دالة لجلب اسم الأسبوع والشهر بالعربي
  const getWeekLabel = (date: Date) => {
    const weekNum = getWeekOfMonth(date);
    const monthName = new Intl.DateTimeFormat('ar-EG', { month: 'long' }).format(date);
    return `أسبوع ${weekNum} - ${monthName} ${date.getFullYear()}`;
  };

  // المعالجة المالية الموحدة
  const financialStats = useMemo(() => {
    const monthsMap: Record<string, {
      label: string;
      start: Date;
      revenue: number;
      expenses: number;
      invoicesList: { id: string; buyer: string; date: string; amount: number }[];
      expensesList: { id: string; desc: string; category: string; date: string; amount: number }[];
    }> = {};

    const weeksMap: Record<string, {
      label: string;
      start: Date;
      revenue: number;
      expenses: number;
      invoicesList: { id: string; buyer: string; date: string; amount: number }[];
      expensesList: { id: string; desc: string; category: string; date: string; amount: number }[];
    }> = {};

    // تصفية الفواتير والمصروفات الخاصة بهذه العروة
    const cycleInvoices = invoices.filter(inv => inv.cycle_id === cycle.id && inv.market !== 'رصيد منقول' && inv.market !== 'تمويل يدوي');
    const cycleExpenses = expenses.filter(exp => exp.cycle_id === cycle.id);

    // حساب إجمالي المبيعات الإجمالي
    let totalSales = 0;
    cycleInvoices.forEach(inv => {
      const d = new Date(inv.date);
      d.setHours(0, 0, 0, 0);
      const amount = calculateInvoiceTotal(inv.price_items, inv.deductions);
      totalSales += amount;

      // 1. التجميع الشهري
      const mKey = `${d.getFullYear()}-${d.getMonth()}`;
      if (!monthsMap[mKey]) {
        monthsMap[mKey] = {
          label: getMonthLabel(d),
          start: new Date(d.getFullYear(), d.getMonth(), 1),
          revenue: 0,
          expenses: 0,
          invoicesList: [],
          expensesList: []
        };
      }
      monthsMap[mKey].revenue += amount;
      monthsMap[mKey].invoicesList.push({
        id: inv.id,
        buyer: inv.buyer_name || 'عميل نقدي',
        date: inv.date,
        amount: amount
      });

      // 2. التجميع الأسبوعي
      const weekNum = getWeekOfMonth(d);
      const wKey = `${d.getFullYear()}-${d.getMonth()}-${weekNum}`;
      if (!weeksMap[wKey]) {
        weeksMap[wKey] = {
          label: getWeekLabel(d),
          start: new Date(d.getFullYear(), d.getMonth(), (weekNum - 1) * 7 + 1),
          revenue: 0,
          expenses: 0,
          invoicesList: [],
          expensesList: []
        };
      }
      weeksMap[wKey].revenue += amount;
      weeksMap[wKey].invoicesList.push({
        id: inv.id,
        buyer: inv.buyer_name || 'عميل نقدي',
        date: inv.date,
        amount: amount
      });
    });

    // حساب إجمالي المصروفات الإجمالي
    let totalExpensesSum = 0;
    cycleExpenses.forEach(exp => {
      const d = new Date(exp.date);
      d.setHours(0, 0, 0, 0);
      const amount = exp.amount || 0;
      totalExpensesSum += amount;

      // 1. التجميع الشهري
      const mKey = `${d.getFullYear()}-${d.getMonth()}`;
      if (!monthsMap[mKey]) {
        monthsMap[mKey] = {
          label: getMonthLabel(d),
          start: new Date(d.getFullYear(), d.getMonth(), 1),
          revenue: 0,
          expenses: 0,
          invoicesList: [],
          expensesList: []
        };
      }
      monthsMap[mKey].expenses += amount;
      monthsMap[mKey].expensesList.push({
        id: exp.id,
        desc: exp.description || 'مصروف عام',
        category: exp.category || 'نفقات أخرى',
        date: exp.date,
        amount: amount
      });

      // 2. التجميع الأسبوعي
      const weekNum = getWeekOfMonth(d);
      const wKey = `${d.getFullYear()}-${d.getMonth()}-${weekNum}`;
      if (!weeksMap[wKey]) {
        weeksMap[wKey] = {
          label: getWeekLabel(d),
          start: new Date(d.getFullYear(), d.getMonth(), (weekNum - 1) * 7 + 1),
          revenue: 0,
          expenses: 0,
          invoicesList: [],
          expensesList: []
        };
      }
      weeksMap[wKey].expenses += amount;
      weeksMap[wKey].expensesList.push({
        id: exp.id,
        desc: exp.description || 'مصروف عام',
        category: exp.category || 'نفقات أخرى',
        date: exp.date,
        amount: amount
      });
    });

    // تحويل الكائنات إلى مصفوفات مرتبة تنازلياً حسب التاريخ الأحدث
    const monthlyList = Object.values(monthsMap)
      .sort((a, b) => b.start.getTime() - a.start.getTime())
      .map(m => {
        const share = m.revenue * ((cycle.farmer_share_percentage || 0) / 100);
        return {
          ...m,
          profit: m.revenue - m.expenses - share,
          invoicesList: m.invoicesList.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
          expensesList: m.expensesList.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        };
      });

    const weeklyList = Object.values(weeksMap)
      .sort((a, b) => b.start.getTime() - a.start.getTime())
      .map(w => {
        const share = w.revenue * ((cycle.farmer_share_percentage || 0) / 100);
        return {
          ...w,
          profit: w.revenue - w.expenses - share,
          invoicesList: w.invoicesList.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
          expensesList: w.expensesList.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        };
      });

    return {
      monthlyList,
      weeklyList,
      totalSales,
      totalExpenses: totalExpensesSum,
      netProfit: totalSales - totalExpensesSum
    };
  }, [invoices, expenses, cycle.id, cycle.farmer_share_percentage]);

  const activeListData = viewType === 'monthly' ? financialStats.monthlyList : financialStats.weeklyList;

  const maxPeriodAmount = useMemo(() => {
    if (activeListData.length === 0) return 1;
    return Math.max(...activeListData.map(d => Math.max(d.revenue, d.expenses)));
  }, [activeListData]);

  const toggleExpand = (periodLabel: string) => {
    setExpandedPeriod(prev => (prev === periodLabel ? null : periodLabel));
  };

  const invoiceCount = useMemo(() => {
    return invoices.filter(inv => inv.cycle_id === cycle.id && inv.market !== 'رصيد منقول' && inv.market !== 'تمويل يدوي').length;
  }, [invoices, cycle.id]);

  const averageInvoice = useMemo(() => {
    return invoiceCount > 0 ? Math.round(cycle.revenue / invoiceCount) : 0;
  }, [cycle.revenue, invoiceCount]);

  const profitMargin = useMemo(() => {
    const grossProfit = cycle.revenue - cycle.expenses;
    return cycle.revenue > 0 ? Math.round((grossProfit / cycle.revenue) * 100) : 0;
  }, [cycle.revenue, cycle.expenses]);

  if (loading) {
    return <InlineLoading message="جاري تحضير التقارير والتحليلات المالية..." />;
  }

  if (activeListData.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-transparent text-neutral-400 text-center">
        <Coins className="w-16 h-16 opacity-25 mb-4 text-emerald-600 dark:text-emerald-400" />
        <h3 className="text-lg font-black text-neutral-800 dark:text-neutral-100">لا توجد بيانات مالية للعروة حتي الآن</h3>
        <p className="text-xs text-neutral-500 mt-2 max-w-sm leading-relaxed">
          بمجرد تسجيل فواتير مبيعات أو سندات مصروفات مرتبطة بعروة "{cycle.name}"، ستعرض لك هنا التحاليل المالية والأرباح مجمّعة بشكل احترافي.
        </p>
      </div>
    );
  }

  const isProfitPositive = cycle.profit >= 0;

  return (
    <div className="space-y-6 mt-6 pb-20 animate-page-enter text-right" dir="rtl">
      
      {/* 1. قسم الإحصائيات والأداء المالي الكلي - بطاقة موحدة صغيرة وملونة فائقة الجمال */}
      <div className="max-w-lg mx-auto bg-gradient-to-br from-emerald-600 to-teal-700 dark:from-emerald-700 dark:to-teal-850 text-white rounded-3xl p-5 shadow-lg border border-emerald-500/20 relative overflow-hidden group">
        
        {/* تأثيرات لمعان وانعكاسات خلفية جمالية */}
        <div className="absolute -right-12 -bottom-12 w-28 h-28 bg-white/5 rounded-full blur-2xl pointer-events-none group-hover:bg-white/10 transition-all duration-700"></div>
        <div className="absolute -left-12 -top-12 w-24 h-24 bg-emerald-400/15 rounded-full blur-xl pointer-events-none"></div>

        <div className="flex flex-col gap-4 relative z-10">
          {/* الكتلة الرئيسية: إجمالي المبيعات وصافي الأرباح في صف مدمج للغاية */}
          <div className="grid grid-cols-2 gap-4 border-b border-white/10 pb-3.5">
            <div>
              <span className="text-emerald-250 text-[10px] font-black tracking-wider block opacity-95">إجمالي الإيرادات (المبيعات)</span>
              <h3 className="text-lg sm:text-2xl font-black tabular-nums leading-none mt-1.5 text-white">
                {formatNumber(Math.round(cycle.revenue))}
                <span className="text-xs mr-0.5 opacity-75 font-semibold"> ج.م</span>
              </h3>
              <p className="text-[9px] text-emerald-100/80 font-bold mt-1.5 leading-none">
                برواية {invoiceCount} شحنات بيع
              </p>
            </div>

            <div className="text-left border-r border-white/10 pr-4">
              <span className="text-emerald-250 text-[10px] font-black tracking-wider block opacity-95">صافي أرباح العروة</span>
              <h3 className={`text-lg sm:text-2xl font-black tabular-nums leading-none mt-1.5 ${isProfitPositive ? 'text-white' : 'text-rose-200'}`}>
                {isProfitPositive ? '+' : ''}{formatNumber(Math.round(cycle.profit))}
                <span className="text-xs mr-0.5 opacity-75 font-semibold"> ج.م</span>
              </h3>
              <p className="text-[9px] text-emerald-100/80 font-bold mt-1.5 leading-none truncate">
                {isProfitPositive ? 'عائد مالي إيجابي مرضي' : 'العوائد لا تغطي المصروفات'}
              </p>
            </div>
          </div>

          {/* التقسيمات الفرعية الثلاثة في صف واحد مدمج وأنيق للغاية */}
          <div className="grid grid-cols-3 gap-3 text-right">
            {/* التقسيم 1: إجمالي المصروفات */}
            <div className="flex flex-col gap-0.5 border-l border-white/15 pl-2">
              <div className="flex items-center gap-1 text-emerald-200">
                <Coins className="w-2.5 h-2.5 shrink-0" />
                <span className="text-[9px] font-bold">المصروفات الكلية</span>
              </div>
              <h4 className="text-[11px] sm:text-xs font-black truncate text-white mt-1 tabular-nums">
                {formatNumber(Math.round(cycle.expenses))} ج.م
              </h4>
              <p className="text-[8px] font-extrabold text-emerald-150 leading-none">
                تكاليف العروة المسجلة
              </p>
            </div>

            {/* التقسيم 2: متوسط الفاتورة */}
            <div className="flex flex-col gap-0.5 border-l border-white/15 pl-2 pr-0.5">
              <div className="flex items-center gap-1 text-emerald-200">
                <Receipt className="w-2.5 h-2.5 shrink-0" />
                <span className="text-[9px] font-bold">متوسط الشحنة</span>
              </div>
              <h4 className="text-[11px] sm:text-xs font-black truncate text-white mt-1 tabular-nums">
                {formatNumber(averageInvoice)} ج.م
              </h4>
              <p className="text-[8px] font-extrabold text-emerald-150 leading-none">
                لكل نقلة محصولية
              </p>
            </div>

            {/* التقسيم 3: هامش الربحية */}
            <div className="flex flex-col gap-0.5 pr-0.5">
              <div className="flex items-center gap-1 text-emerald-200">
                {isProfitPositive ? (
                  <TrendingUp className="w-2.5 h-2.5 shrink-0" />
                ) : (
                  <TrendingDown className="w-2.5 h-2.5 shrink-0" />
                )}
                <span className="text-[9px] font-bold">هامش الأرباح</span>
              </div>
              <h4 className={`text-[11px] sm:text-xs font-black truncate mt-1 tabular-nums ${isProfitPositive ? 'text-white' : 'text-rose-200'}`}>
                {profitMargin}%
              </h4>
              <p className="text-[8px] text-emerald-150 font-bold opacity-80 leading-none truncate">
                {isProfitPositive ? 'معدل ربح متميز' : 'مراجعة التكاليف'}
              </p>
            </div>
          </div>

        </div>
      </div>

      {/* 2. قسم التحكم وأداة التبديل (شهري / أسبوعي) */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-3 shadow-xs">
        <div>
          <h4 className="text-xs font-black text-neutral-800 dark:text-neutral-200">التحليل المالي الموزع</h4>
          <p className="text-[10px] text-neutral-500 font-bold mt-0.5">تفقد مبيعات ومصروفات كل فترة بالتفصيل</p>
        </div>

        <div className="flex items-center p-1 bg-neutral-100 dark:bg-neutral-950 rounded-xl select-none w-full sm:w-auto">
          <button 
            type="button"
            onClick={() => { setViewType('monthly'); setExpandedPeriod(null); }}
            className={`flex-1 sm:flex-initial px-4 py-1.5 rounded-lg text-xs font-black transition-all ${
              viewType === 'monthly' 
                ? 'bg-white dark:bg-neutral-850 shadow-xs text-neutral-900 dark:text-white' 
                : 'text-neutral-500 hover:text-neutral-800 dark:hover:text-white'
            }`}
          >
            تقرير شهري
          </button>
          <button 
            type="button"
            onClick={() => { setViewType('weekly'); setExpandedPeriod(null); }}
            className={`flex-1 sm:flex-initial px-4 py-1.5 rounded-lg text-xs font-black transition-all ${
              viewType === 'weekly' 
                ? 'bg-white dark:bg-neutral-850 shadow-xs text-neutral-900 dark:text-white' 
                : 'text-neutral-500 hover:text-neutral-800 dark:hover:text-white'
            }`}
          >
            تقرير أسبوعي
          </button>
        </div>
      </div>

      {/* 3. قائمة التجميعات المجمعة والـ Accordion تفاصيل العمليات */}
      <div className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-150 dark:border-neutral-800 shadow-soft overflow-hidden">
        {/* رأس الجدول */}
        <div className="grid grid-cols-12 px-6 py-4 bg-neutral-50 dark:bg-neutral-950/40 border-b border-neutral-200/60 dark:border-neutral-800/40 text-xs font-black text-neutral-400 uppercase tracking-widest leading-none select-none">
          <div className="col-span-4 sm:col-span-3 text-right">الفترة</div>
          <div className="col-span-5 sm:col-span-6 text-center">المساهمة المالية (إيراد / مصروف)</div>
          <div className="col-span-3 text-left">التدفق المالي الصافي</div>
        </div>

        {/* محتوى الجدول */}
        <div className="divide-y divide-neutral-100 dark:divide-neutral-800/60">
          {activeListData.map((row) => {
            const isExpanded = expandedPeriod === row.label;
            const rowProfitPositive = row.profit >= 0;

            return (
              <div key={row.label} className="transition-all duration-300">
                {/* الصف الرئيسي القابل للنقر */}
                <div 
                  onClick={() => toggleExpand(row.label)}
                  className="grid grid-cols-12 items-center px-6 py-4 sm:py-5 hover:bg-neutral-100 dark:hover:bg-neutral-950/30 transition-colors cursor-pointer select-none group"
                >
                  {/* الفترة */}
                  <div className="col-span-4 sm:col-span-3 text-right flex items-center gap-2.5">
                    <span className="p-1 rounded-lg bg-neutral-100 dark:bg-neutral-850 text-neutral-500 group-hover:text-primary dark:group-hover:text-white transition-all">
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </span>
                    <div>
                      <h4 className="text-xs sm:text-sm font-black text-neutral-800 dark:text-neutral-100 group-hover:text-primary dark:group-hover:text-white transition-colors leading-tight">
                        {row.label}
                      </h4>
                      <p className="text-[9px] text-neutral-400 dark:text-neutral-500 font-bold mt-0.5">
                        {row.invoicesList.length} مبيعات • {row.expensesList.length} نفقات
                      </p>
                    </div>
                  </div>

                  {/* شريط التقدم التوضيحي المالي عالي الجودة */}
                  <div className="col-span-5 sm:col-span-6 px-4 text-center flex flex-col items-stretch gap-1">
                    {/* شريط الإيرادات */}
                    <div className="flex items-center gap-2">
                      <span className="text-[8px] font-bold text-emerald-600 dark:text-emerald-400 w-8 text-right shrink-0">إيراد</span>
                      <div className="flex-1 h-1.5 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-emerald-500 rounded-full transition-all duration-500" 
                          style={{ width: `${maxPeriodAmount > 0 ? (row.revenue / maxPeriodAmount) * 100 : 0}%` }}
                        ></div>
                      </div>
                      <span className="text-[8px] font-bold tabular-nums text-neutral-400 dark:text-neutral-500 w-12 text-left">{formatNumber(Math.round(row.revenue))} ج</span>
                    </div>
                    {/* شريط المصروفات */}
                    <div className="flex items-center gap-2">
                      <span className="text-[8px] font-bold text-rose-500 w-8 text-right shrink-0">مصروف</span>
                      <div className="flex-1 h-1.5 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-rose-500 rounded-full transition-all duration-500" 
                          style={{ width: `${maxPeriodAmount > 0 ? (row.expenses / maxPeriodAmount) * 100 : 0}%` }}
                        ></div>
                      </div>
                      <span className="text-[8px] font-bold tabular-nums text-neutral-400 dark:text-neutral-500 w-12 text-left">{formatNumber(Math.round(row.expenses))} ج</span>
                    </div>
                  </div>

                  {/* صافي الربح والتدفق النقدى */}
                  <div className="col-span-3 text-left">
                    <span className="text-[8px] sm:text-[9px] text-neutral-400 dark:text-neutral-500 font-bold block leading-none">صافي الربح</span>
                    <p className={`text-xs sm:text-sm font-black mt-1 tabular-nums ${rowProfitPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500 dark:text-rose-400'}`}>
                      {rowProfitPositive ? '+' : ''}{formatNumber(Math.round(row.profit))} <span className="text-[10px] sm:text-xs font-bold opacity-75">ج.م</span>
                    </p>
                  </div>
                </div>

                {/* تفاصيل العمليات الموسعة النحيفة */}
                <AnimatePresence initial={false}>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25, ease: 'easeInOut' }}
                    >
                      <div className="border-t border-neutral-100 dark:border-neutral-800/60 p-3 sm:p-4 bg-neutral-50/30 dark:bg-neutral-950/20 grid grid-cols-1 md:grid-cols-2 gap-4">
                        
                        {/* العمود الأول: المبيعات */}
                        <div className="space-y-2">
                          <div className="flex items-center gap-1.5 pb-1.5 border-b border-neutral-100 dark:border-neutral-800/40">
                            <Receipt className="w-3.5 h-3.5 text-emerald-500" />
                            <h5 className="text-[10px] font-black text-neutral-800 dark:text-neutral-200">مبيعات المدة ({row.invoicesList.length})</h5>
                          </div>

                          {row.invoicesList.length === 0 ? (
                            <p className="text-[10px] text-neutral-400 font-bold py-2 text-center">لا توجد حركات مبيعات بيع في هذه المدة.</p>
                          ) : (
                            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-0.5">
                              {row.invoicesList.map((invoice, idx) => (
                                <div 
                                  key={invoice.id || idx}
                                  className="bg-white dark:bg-neutral-900 border border-neutral-150 dark:border-neutral-800/50 p-2 rounded-xl flex items-center justify-between text-[11px] transition-colors hover:border-emerald-500/20"
                                >
                                  <div className="text-right">
                                    <p className="font-extrabold text-neutral-800 dark:text-neutral-100 text-[11px]">{invoice.buyer}</p>
                                    <p className="text-[8.5px] text-neutral-400 mt-0.5 font-bold">تاريخ البيع: {invoice.date}</p>
                                  </div>
                                  <div className="text-left font-black text-emerald-600 dark:text-emerald-400 tabular-nums">
                                    +{formatNumber(Math.round(invoice.amount))} <span className="text-[9px] opacity-75 font-medium">ج</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* العمود الثاني: المصروفات */}
                        <div className="space-y-2">
                          <div className="flex items-center gap-1.5 pb-1.5 border-b border-neutral-100 dark:border-neutral-800/40">
                            <Coins className="w-3.5 h-3.5 text-rose-500" />
                            <h5 className="text-[10px] font-black text-neutral-800 dark:text-neutral-200">مصروفات وتكاليف العروة ({row.expensesList.length})</h5>
                          </div>

                          {row.expensesList.length === 0 ? (
                            <p className="text-[10px] text-neutral-400 font-bold py-2 text-center">لا توجد مصروفات أو مسحوبات تشغيلية في هذه المدة.</p>
                          ) : (
                            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-0.5">
                              {row.expensesList.map((expense, idx) => (
                                <div 
                                  key={expense.id || idx}
                                  className="bg-white dark:bg-neutral-900 border border-neutral-150 dark:border-neutral-800/50 p-2 rounded-xl flex items-center justify-between text-[11px] transition-colors hover:border-rose-500/20"
                                >
                                  <div className="text-right max-w-[70%]">
                                    <p className="font-extrabold text-neutral-800 dark:text-neutral-100 text-[11px] truncate">{expense.desc}</p>
                                    <div className="flex items-center gap-1.5 mt-0.5">
                                      <span className="inline-block text-[7.5px] bg-neutral-100 dark:bg-neutral-800 text-neutral-500 px-1 py-0.2 rounded font-bold">
                                        {expense.category}
                                      </span>
                                      <span className="text-[7.5px] text-neutral-400 font-bold">{expense.date}</span>
                                    </div>
                                  </div>
                                  <div className="text-left font-black text-rose-500 dark:text-rose-400 tabular-nums">
                                    -{formatNumber(Math.round(expense.amount))} <span className="text-[9px] opacity-75 font-medium">ج</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. كرت التوعية والإرشاد الإرشادي للتطبيق */}
      <div className="bg-neutral-100 dark:bg-neutral-900/50 p-4 border border-neutral-200/40 dark:border-neutral-800/40 rounded-3xl flex gap-3 items-center">
        <div className="p-2 bg-white dark:bg-neutral-800 rounded-xl text-neutral-400 shrink-0">
          <Info className="w-4 h-4" />
        </div>
        <p className="text-[10px] sm:text-xs text-neutral-500 dark:text-neutral-400 font-bold leading-relaxed">
          نصيحة مالية: يتم حساب صافي الربح التقديري للفترة عبر طرح إجمالي تكاليف التشغيل والمشتريات من إجمالي المستخلصات ومبيعات الحصاد. انقر على أي سطر لعرض السندات والعمليات التفصيلية.
        </p>
      </div>

    </div>
  );
};

export default WeeklyTab;
