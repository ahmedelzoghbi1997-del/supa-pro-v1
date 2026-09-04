import React, { useMemo, useState } from 'react';
import type { Cycle, Invoice } from '../../types';
import { useData } from '../../contexts/DataContext';
import { useUI } from '../../contexts/UIContext';
import { useSettings } from '../../contexts/SettingsContext';
import { formatNumber } from '../../utils/helpers';
import { 
  Scale, 
  Calendar, 
  Clock, 
  ChevronDown, 
  ChevronUp, 
  ArrowUpDown, 
  TrendingUp, 
  BarChart3, 
  ArrowRight
} from 'lucide-react';

interface ProductionTabProps {
  cycle: Cycle;
}

const ProductionTab: React.FC<ProductionTabProps> = ({ cycle }) => {
  const { invoices } = useData();
  const { loading } = useUI();
  const { language } = useSettings();
  const isEn = language === 'en';
  const [viewType, setViewType] = useState<'monthly' | 'weekly'>('monthly');
  const [sortBy, setSortBy] = useState<'date' | 'weight'>('date');
  const [expandedPeriod, setExpandedPeriod] = useState<string | null>(null);

  // دالة لجلب اسم الشهر بالعربية الفصحى
  const getMonthName = (date: Date) => {
    return new Intl.DateTimeFormat('ar-EG', { month: 'long' }).format(date);
  };

  // تصفية الفواتير الخاصة بهذه العروة فقط لمصداقية البيانات
  const cycleInvoices = useMemo(() => {
    return invoices.filter(inv => inv.cycle_id === cycle.id && inv.market !== 'رصيد منقول' && inv.market !== 'تمويل يدوي');
  }, [invoices, cycle.id]);

  // حساب حركة الأوزان والإنتاج الشهري والأسبوعي
  const stats = useMemo(() => {
    // 1. حسابات الأسابيع
    const weeksMap: Record<string, { 
      key: string; 
      label: string; 
      weight: number; 
      invoiceCount: number; 
      invoicesList: Invoice[];
      start: Date;
    }> = {};

    // 2. حسابات الشهور
    const monthsMap: Record<string, { 
      key: string; 
      label: string; 
      weight: number; 
      invoiceCount: number; 
      invoicesList: Invoice[];
      start: Date;
    }> = {};

    let totalProductionWeight = 0;

    cycleInvoices.forEach(inv => {
      const d = new Date(inv.date);
      d.setHours(0, 0, 0, 0);

      // حساب وزن الفاتورة الإجمالي
      const invoiceWeight = inv.price_items?.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0) || 0;
      totalProductionWeight += invoiceWeight;

      // أ. معالجة بيانات الأسبوع
      const day = d.getDate();
      const weekNum = Math.ceil(day / 7);
      const monthName = getMonthName(d);
      const weekLabel = `أسبوع ${weekNum} - ${monthName}`;
      const weekKey = `${d.getFullYear()}-${d.getMonth()}-${weekNum}`;
      const weekStart = new Date(d.getFullYear(), d.getMonth(), (weekNum - 1) * 7 + 1);

      if (!weeksMap[weekKey]) {
        weeksMap[weekKey] = {
          key: weekKey,
          label: weekLabel,
          weight: 0,
          invoiceCount: 0,
          invoicesList: [],
          start: weekStart
        };
      }
      weeksMap[weekKey].weight += invoiceWeight;
      weeksMap[weekKey].invoiceCount += 1;
      weeksMap[weekKey].invoicesList.push(inv);

      // ب. معالجة بيانات الشهر
      const monthLabel = monthName;
      const monthKey = `${d.getFullYear()}-${d.getMonth()}`;
      const monthStart = new Date(d.getFullYear(), d.getMonth(), 1);

      if (!monthsMap[monthKey]) {
        monthsMap[monthKey] = {
          key: monthKey,
          label: monthLabel,
          weight: 0,
          invoiceCount: 0,
          invoicesList: [],
          start: monthStart
        };
      }
      monthsMap[monthKey].weight += invoiceWeight;
      monthsMap[monthKey].invoiceCount += 1;
      monthsMap[monthKey].invoicesList.push(inv);
    });

    // تحويل الكائن لمصفوفات مرتبة افتراضياً بالتاريخ الأحدث أولاً
    const weeksList = Object.values(weeksMap);
    const monthsList = Object.values(monthsMap);

    // العثور على ذروة الإنتاج (الأعلى وزناً)
    const peakWeek = weeksList.length > 0 
      ? [...weeksList].sort((a, b) => b.weight - a.weight)[0] 
      : null;

    const peakMonth = monthsList.length > 0 
      ? [...monthsList].sort((a, b) => b.weight - a.weight)[0] 
      : null;

    return {
      weeks: weeksList,
      months: monthsList,
      totalWeight: totalProductionWeight,
      peakWeek,
      peakMonth,
      invoiceCount: cycleInvoices.length
    };
  }, [cycleInvoices]);

  // الفرز والتصفية للمجاميع المعروضة
  const displayedData = useMemo(() => {
    const list = viewType === 'weekly' ? stats.weeks : stats.months;
    const sorted = [...list];

    if (sortBy === 'date') {
      // فرز حسب التاريخ التنازلي (الأحدث أولاً)
      sorted.sort((a, b) => b.start.getTime() - a.start.getTime());
    } else {
      // فرز حسب الإنتاج التنازلي (الأكثر وزناً أولاً)
      sorted.sort((a, b) => b.weight - a.weight);
    }

    return sorted;
  }, [viewType, sortBy, stats]);

  // إيجاد القيمة القصوى محلياً للرسم البياني الأفقي
  const maxWeightInView = useMemo(() => {
    if (displayedData.length === 0) return 0;
    return Math.max(...displayedData.map(d => d.weight));
  }, [displayedData]);

  const togglePeriodExpanded = (key: string) => {
    setExpandedPeriod(prev => (prev === key ? null : key));
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 animate-pulse">
        <Scale className="w-12 h-12 text-emerald-500 animate-spin mb-4" />
        <p className="text-neutral-500 font-bold dark:text-neutral-400">جاري تحليل بيانات الإنتاج الفعلي بالكيلو...</p>
      </div>
    );
  }

  if (cycleInvoices.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-transparent mt-6 text-neutral-400">
        <Scale className="w-16 h-16 opacity-30 text-emerald-500 mb-4" />
        <p className="text-base font-bold text-neutral-600 dark:text-neutral-400">لا توجد بيانات إنتاج مسجلة حالياً.</p>
        <p className="text-xs mt-1 opacity-70 text-center max-w-sm px-4">
          لم يتم العثور على فواتير بيع مرتبطة بهذه العروة. سيتم احتساب الإنتاج الإجمالي تلقائياً فور إصدار أول فاتورة بيع محصول.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 mt-6 pb-12 animate-page-enter text-right" dir="rtl">
      {/* 1. قسم الإحصائيات ومرئيات الأداء الكلي - بطاقة موحدة صغيرة وملونة فائقة الجمال */}
      <div className="max-w-lg mx-auto bg-gradient-to-br from-emerald-600 to-teal-700 dark:from-emerald-700 dark:to-teal-850 text-white rounded-2xl p-4 sm:p-5 shadow-lg border border-emerald-500/20 relative overflow-hidden group">
        {/* تأثيرات لمعان وانعكاسات خلفية جمالية */}
        <div className="absolute -right-12 -bottom-12 w-28 h-28 bg-white/5 rounded-full blur-2xl pointer-events-none group-hover:bg-white/10 transition-all duration-700"></div>
        <div className="absolute -left-12 -top-12 w-24 h-24 bg-emerald-400/15 rounded-full blur-xl pointer-events-none"></div>
 
        <div className="flex flex-col gap-4 relative z-10">
          {/* الكتلة الرئيسية: إجمالي الإنتاج وإنتاج النبات في صف واحد مدمج للغاية */}
          <div className="grid grid-cols-2 gap-4 border-b border-white/10 pb-3.5">
            <div>
              <span className="text-emerald-250 text-[10px] font-black tracking-wider block opacity-90">
                {isEn ? 'Total Cycle Production' : 'إجمالي إنتاج العروة'}
              </span>
              <h3 className="text-xl sm:text-2xl font-black tabular-nums leading-none mt-1 text-white">
                {formatNumber(Math.round(stats.totalWeight))}
                <span className="text-xs mr-0.5 opacity-75 font-semibold">{isEn ? ' kg' : ' كجم'}</span>
              </h3>
              <p className="text-[9px] text-emerald-200/80 font-bold mt-1.5 leading-none">
                {isEn ? `Across ${stats.invoiceCount} Shipments` : `برواية ${stats.invoiceCount} شحنات بيع.`}
              </p>
            </div>

            <div className="text-left border-r border-white/10 pr-4">
              <span className="text-emerald-250 text-[10px] font-black tracking-wider block opacity-90">إنتاج النبات الواحد</span>
              <h3 className="text-xl sm:text-2xl font-black tabular-nums leading-none mt-1 text-white">
                {cycle.plant_count > 0 
                  ? `${(stats.totalWeight / cycle.plant_count).toFixed(2)}` 
                  : 'غير محدد'}
                {cycle.plant_count > 0 && <span className="text-xs mr-0.5 opacity-75 font-semibold">كجم</span>}
              </h3>
              <p className="text-[9px] text-emerald-200/80 font-bold mt-1.5 leading-none truncate">
                {cycle.plant_count > 0 ? `لـ ${formatNumber(cycle.plant_count)} شتلة` : 'يرجى تحديد عدد شتلات العروة'}
              </p>
            </div>
          </div>
 
          {/* التقسيمات الفرعية الثلاثة في صف واحد مدمج وأنيق للغاية */}
          <div className="grid grid-cols-3 gap-3 text-right">
            {/* التقسيمة 1: أعلى الشهور */}
            <div className="flex flex-col gap-0.5 border-l border-white/10 pl-2">
              <div className="flex items-center gap-1 text-emerald-200">
                <Calendar className="w-2.5 h-2.5 shrink-0" />
                <span className="text-[9px] font-bold">أعلى الشهور</span>
              </div>
              <h4 className="text-[11px] font-black truncate text-white mt-1">
                {stats.peakMonth ? stats.peakMonth.label : 'غير متوفر'}
              </h4>
              <p className="text-[10px] font-extrabold text-emerald-150 tabular-nums">
                {stats.peakMonth ? `${formatNumber(Math.round(stats.peakMonth.weight))} كجم` : '-'}
              </p>
            </div>
 
            {/* التقسيمة 2: أعلى الأسابيع */}
            <div className="flex flex-col gap-0.5 border-l border-white/10 pl-2 pr-0.5">
              <div className="flex items-center gap-1 text-emerald-200">
                <Clock className="w-2.5 h-2.5 shrink-0" />
                <span className="text-[9px] font-bold">أعلى الأسابيع</span>
              </div>
              <h4 className="text-[11px] font-black truncate text-white mt-1">
                {stats.peakWeek ? stats.peakWeek.label : 'غير متوفر'}
              </h4>
              <p className="text-[10px] font-extrabold text-emerald-150 tabular-nums">
                {stats.peakWeek ? `${formatNumber(Math.round(stats.peakWeek.weight))} كجم` : '-'}
              </p>
            </div>
 
            {/* التقسيمة 3: متوسط وزن الشحنة */}
            <div className="flex flex-col gap-0.5 pr-0.5">
              <div className="flex items-center gap-1 text-emerald-200">
                <TrendingUp className="w-2.5 h-2.5 shrink-0" />
                <span className="text-[9px] font-bold">متوسط الشحنة</span>
              </div>
              <h4 className="text-[11px] font-black text-white truncate mt-1">
                {stats.invoiceCount > 0 
                  ? `${formatNumber(Math.round(stats.totalWeight / stats.invoiceCount))} كجم` 
                  : '0 كجم'}
              </h4>
              <p className="text-[9px] text-emerald-250 font-bold opacity-80 leading-none truncate">
                {isEn ? 'Average Daily Shipments' : 'معدل تحميل مستقر'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 2. قسم التحكم (التبديل بين الشهري والاسبوعي مع الترتيب والفلترة) */}
      <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4 bg-white dark:bg-neutral-900 p-3.5 rounded-3xl border border-neutral-150 dark:border-neutral-800 shadow-soft">
        <div className="flex items-center gap-1 bg-neutral-100 dark:bg-neutral-950 p-1 rounded-2xl">
          <button
            onClick={() => { setViewType('monthly'); setExpandedPeriod(null); }}
            className={`px-5 py-2 rounded-xl text-xs sm:text-sm font-black transition-all select-none ${viewType === 'monthly' ? 'bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white shadow-soft' : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-white'}`}
          >
            الإنتاج الشهري
          </button>
          <button
            onClick={() => { setViewType('weekly'); setExpandedPeriod(null); }}
            className={`px-5 py-2 rounded-xl text-xs sm:text-sm font-black transition-all select-none ${viewType === 'weekly' ? 'bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white shadow-soft' : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-white'}`}
          >
            الإنتاج الأسبوعي
          </button>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-neutral-400 font-bold">
            <ArrowUpDown className="w-3.5 h-3.5 text-neutral-400" />
            <span>ترتيب حسب:</span>
          </div>
          <div className="flex bg-neutral-100 dark:bg-neutral-950 p-1 rounded-xl">
            <button
              onClick={() => setSortBy('date')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${sortBy === 'date' ? 'bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white shadow-soft' : 'text-neutral-550 dark:text-neutral-400'}`}
            >
              الجدول الزمني
            </button>
            <button
              onClick={() => setSortBy('weight')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${sortBy === 'weight' ? 'bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white shadow-soft' : 'text-neutral-550 dark:text-neutral-400'}`}
            >
              الأعلى إنتاجاً
            </button>
          </div>
        </div>
      </div>

      {/* 3. قائمة الأوزان والنسب البيانية التفاعلية */}
      <div className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-150 dark:border-neutral-800 shadow-soft overflow-hidden">
        {/* رأس الجدول */}
        <div className="grid grid-cols-12 px-6 py-4 bg-neutral-50 dark:bg-neutral-950/40 border-b border-neutral-200/60 dark:border-neutral-800/40 text-xs font-black text-neutral-400 uppercase tracking-widest leading-none select-none">
          <div className="col-span-4 sm:col-span-3 text-right">الفترة</div>
          <div className="col-span-5 sm:col-span-6 text-center">توزيع المساهمة البيانية (كيلو)</div>
          <div className="col-span-3 text-left">الوزن الكلي للفترة</div>
        </div>

        {/* محتوى الجدول الأنيق والجديد كلياً */}
        <div className="divide-y divide-neutral-100 dark:divide-neutral-800/60">
          {displayedData.map((item) => {
            const isExpanded = expandedPeriod === item.key;
            // حساب نسبة هذه الفترة من إنتاج العروة الكلية
            const percentage = stats.totalWeight > 0 ? (item.weight / stats.totalWeight) * 100 : 0;
            // حساب التوزيع النسبي للبار البياني مقارنة بالوزن الأكبر في العرض
            const visualRelativePct = maxWeightInView > 0 ? (item.weight / maxWeightInView) * 100 : 0;

            return (
              <div key={item.key} className="transition-all duration-300">
                {/* الصف الرئيسي القابل للنقر */}
                <div 
                  onClick={() => togglePeriodExpanded(item.key)}
                  className="grid grid-cols-12 items-center px-6 py-4 sm:py-5 hover:bg-neutral-100 dark:hover:bg-neutral-950/30 transition-colors cursor-pointer select-none group"
                >
                  {/* الفترة */}
                  <div className="col-span-4 sm:col-span-3 text-right flex items-center gap-3">
                    <span className="p-1.5 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-neutral-500 group-hover:text-primary dark:group-hover:text-white transition-all">
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </span>
                    <div>
                      <h4 className="text-xs sm:text-sm font-black text-neutral-800 dark:text-neutral-100 group-hover:text-primary dark:group-hover:text-white transition-colors">
                        {item.label}
                      </h4>
                      <p className="text-[9px] text-neutral-400 dark:text-neutral-500 font-bold mt-0.5">
                        {item.invoiceCount} شحنات بيع محملة
                      </p>
                    </div>
                  </div>

                  {/* شريط التقدم التوضيحي عالي الجودة */}
                  <div className="col-span-5 sm:col-span-6 px-2 text-center flex flex-col items-stretch gap-1.5">
                    <div className="w-full h-2.5 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden border border-neutral-150/40 dark:border-neutral-800/40">
                      <div 
                        className="h-full bg-gradient-to-l from-emerald-500 to-emerald-400 rounded-full transition-all duration-1000 group-hover:from-emerald-600 group-hover:to-emerald-500" 
                        style={{ width: `${visualRelativePct}%` }}
                      ></div>
                    </div>
                    <div className="flex justify-between items-center text-[9px] text-neutral-400 dark:text-neutral-500 font-bold px-1">
                      <span>{percentage.toFixed(1)}% من كلي العروة</span>
                      <span className="tabular-nums">الحد الأقصى</span>
                    </div>
                  </div>

                  {/* الوزن الكلي والربحية */}
                  <div className="col-span-3 text-left">
                    <p className="text-xs sm:text-sm font-black text-emerald-600 dark:text-emerald-400 tabular-nums">
                      {formatNumber(Math.round(item.weight))} <span className="text-[10px] sm:text-xs font-bold opacity-75">كجم</span>
                    </p>
                  </div>
                </div>

                {/* التفاصيل المنسدلة: عند النقر لإظهار تفاصيل الشحنات والمبيعات */}
                {isExpanded && (
                  <div className="bg-neutral-50/70 dark:bg-neutral-950/20 px-6 py-4 border-t border-b border-neutral-100 dark:border-neutral-800/50 space-y-3.5 animate-page-enter">
                    <div className="flex items-center justify-between border-b border-neutral-200/50 dark:border-neutral-800/50 pb-2">
                      <span className="text-[10px] sm:text-xs font-black text-neutral-500 dark:text-neutral-400">
                        بروتوكول تفصيل الفواتير المرتبطة بـ ({item.label}):
                      </span>
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold select-none">
                        إجمالي التعبئة والتحميل كجم
                      </span>
                    </div>

                    <div className="space-y-2">
                      {item.invoicesList.map((inv) => {
                        const invWeight = inv.price_items?.reduce((s, pi) => s + (Number(pi.quantity) || 0), 0) || 0;
                        return (
                          <div 
                            key={inv.id}
                            className="flex items-center justify-between bg-white dark:bg-neutral-900 border border-neutral-150/50 dark:border-neutral-850 p-3 rounded-2xl shadow-soft hover:shadow-md transition-all group/item"
                          >
                            <div className="flex items-center gap-3">
                              <div className="p-2 bg-emerald-100/40 dark:bg-emerald-900/10 text-emerald-600 dark:text-emerald-400 rounded-xl font-bold text-xs select-none">
                                شحنة
                              </div>
                              <div className="text-right">
                                <h5 className="text-xs sm:text-sm font-extrabold text-neutral-700 dark:text-neutral-200 group-hover/item:text-primary dark:group-hover/item:text-white transition-colors">
                                  سوق {inv.market}
                                </h5>
                                <p className="text-[10px] text-neutral-400 dark:text-neutral-500 font-bold mt-0.5">
                                  بتاريخ {new Date(inv.date).toLocaleDateString('ar-EG', { day: 'numeric', month: 'numeric', year: 'numeric', numberingSystem: 'latn' })}
                                </p>
                              </div>
                            </div>
                            <div className="text-left flex items-center gap-2">
                              <span className="text-xs font-black text-neutral-700 dark:text-neutral-300 tabular-nums">
                                {formatNumber(Math.round(invWeight))} كجم
                              </span>
                              <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover/item:opacity-100 text-primary dark:text-white transition-all transform hover:translate-x-1" />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. لوحة الإرشادات والتنويه */}
      <div className="bg-neutral-100 dark:bg-neutral-900/60 p-5 rounded-3xl border border-neutral-150 dark:border-neutral-800 flex items-start gap-3">
        <div className="p-2 rounded-2xl bg-primary/10 text-primary dark:bg-white/10 dark:text-white mt-1 shrink-0">
          <BarChart3 className="w-4 h-4" />
        </div>
        <div>
          <h4 className="text-sm font-bold text-neutral-800 dark:text-neutral-100 mb-1">توجيه مالي وزراعي ذكي</h4>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed font-bold">
            يتيح لك هذا التقرير معرفة فترات الذروة الزراعية الخاصة بك لتحديد مواعيد التسميد والري المناسبة مقارنة بمستويات ومعدلات نضج الثمار بالمقارنة مع العزوم والمواسم المحيطة بك.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ProductionTab;
