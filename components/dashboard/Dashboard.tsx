
import React, { useMemo, useEffect, useState } from 'react';
import { Rocket, HandCoins } from 'lucide-react';
import { FarmerAccountIcon, TrendingUpIcon, TrendingDownIcon, ChartBarIcon, ChevronUpIcon, ChevronDownIcon, ClockIcon, CalendarIcon, WalletIcon, ScaleIcon } from '../Icons';
import CashFlowChart from './CashFlowChart';
import RecentTransactions from './RecentTransactions';
import ActiveCyclesOverview from './ActiveCyclesOverview';
import BreakEvenModal from './BreakEvenModal';
import GlobalFinancialReconciliation from './GlobalFinancialReconciliation';
import { useData } from '../../contexts/DataContext';
import { useUI } from '../../contexts/UIContext';
import { formatCurrency, calculateInvoiceTotal, formatNumber } from '../../utils/helpers';
import { useSettings, terminology } from '../../contexts/SettingsContext';
import Skeleton from '../shared/Skeleton';
import { motion, AnimatePresence } from 'motion/react';
import type { PartnerDebt, Advance } from '../../types';

// Sparkline component
export const Sparkline: React.FC<{ data: number[]; color: string; gradientId: string; }> = ({ data, color, gradientId }) => {
    if (data.length < 2) {
        const width = 100;
        const height = 24;
        const y = height / 2;
        const points = `0,${y} ${width},${y}`;
        return (
            <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-6" preserveAspectRatio="none">
                <polyline fill="none" stroke={color} strokeWidth="1.2" points={points} strokeLinecap="round" strokeLinejoin="round" />
            </svg>
        );
    }

    const width = 100;
    const height = 24;
    const maxVal = Math.max(...data);
    const minVal = Math.min(...data);
    const range = maxVal - minVal;
    const isFlat = range === 0;

    const points = data.map((d, i) => {
        const x = (i / (data.length - 1)) * width;
        let y;
        if (isFlat) {
            y = height / 2;
        } else {
            const padding = 1;
            y = (height - padding * 2) * (1 - ((d - minVal) / range)) + padding;
        }
        return `${x.toFixed(2)},${y.toFixed(2)}`;
    }).join(' ');
    
    const areaPoints = `0,${height} ${points} ${width},${height}`;

    return (
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-6" preserveAspectRatio="none">
            <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={color} stopOpacity="0.3"/>
                    <stop offset="100%" stopColor={color} stopOpacity="0"/>
                </linearGradient>
            </defs>
            {!isFlat && <polyline fill={`url(#${gradientId})`} points={areaPoints} />}
             <polyline fill="none" stroke={color} strokeWidth="1.2" points={points} strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
};

interface DashboardCardProps {
  title: string;
  value: string;
  subValue?: string;
  secondaryValue?: string;
  secondaryTitle?: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  color: {
    icon: string;
    glow: string;
    gradient: string;
    sparkline: string;
  };
  trend?: {
    value: number;
    direction: 'up' | 'down';
  };
  sparklineData: number[];
  onClick?: () => void;
  isLoading?: boolean;
  isCelebration?: boolean;
  isProfitMode?: boolean;
  productionValue?: string;
}

export const TrendIndicator: React.FC<{ trend: { value: number; direction: 'up' | 'down'; } }> = ({ trend }) => {
    const isUp = trend.direction === 'up';
    const colorClasses = isUp 
        ? 'bg-accent-success/10 dark:bg-accent-success/20 text-accent-success dark:text-accent-success'
        : 'bg-accent-danger/10 dark:bg-accent-danger/20 text-accent-danger dark:text-accent-danger';
    const Icon = isUp ? ChevronUpIcon : ChevronDownIcon;

    return (
        <div className={`flex items-center gap-1 text-2xs font-black px-1.5 py-0.5 rounded-full ${colorClasses}`}>
            <Icon className="w-2.5 h-2.5" />
            <span>{trend.value.toFixed(1)}%</span>
        </div>
    );
};

export const DashboardCard: React.FC<DashboardCardProps> = ({ 
    title, value, subValue, secondaryValue, secondaryTitle, icon: Icon, color, trend, sparklineData, onClick, isLoading, isCelebration, isProfitMode, productionValue 
}) => {
  if (isLoading) {
      return (
        <div className="w-full text-right block h-28">
            <div className="bg-white dark:bg-neutral-800 py-2.5 px-3 rounded-xl shadow-soft h-full flex flex-col justify-between border border-neutral-100 dark:border-neutral-700/50">
                <div className="flex justify-between items-start">
                    <Skeleton className="h-2.5 w-20" />
                    <Skeleton className="h-4 w-4 rounded-md" />
                </div>
                <div className="flex items-end justify-between mt-1 gap-2 min-h-[28px]">
                    <Skeleton className="h-7 w-24 rounded" />
                    <Skeleton className="h-4.5 w-10 rounded-lg" />
                </div>
                <div className="mt-2 -mb-0.5 h-6 flex items-center">
                    <Skeleton className="h-2 w-full rounded" />
                </div>
            </div>
        </div>
      );
  }

  const cardContent = (
    <div 
      className={`group bg-white dark:bg-neutral-800 ${isProfitMode ? 'shadow-[0_0_25px_rgba(16,185,129,0.25)] border-accent-success dark:border-emerald-400' : isCelebration ? 'shadow-[0_0_20px_rgba(251,191,36,0.3)] border-amber-400 dark:border-accent-warning' : color.gradient} py-2.5 px-3 rounded-xl flex flex-col justify-between shadow-soft border ${isProfitMode || isCelebration ? '' : 'border-neutral-200 dark:border-neutral-700'} h-28 hover:shadow-md hover:border-primary/20 transition-all duration-500 relative overflow-hidden`}
    >
      {isProfitMode && (
         <div className="absolute inset-0 bg-gradient-to-br from-emerald-400/10 via-transparent to-amber-400/10 dark:from-emerald-500/10 dark:to-amber-500/10 pointer-events-none"></div>
      )}
      {isCelebration && !isProfitMode && (
         <div className="absolute inset-0 bg-gradient-to-br from-amber-400/20 to-transparent dark:from-amber-500/20 pointer-events-none animate-pulse"></div>
      )}
      <div className="flex justify-between items-start relative z-10">
        <p className={`font-bold text-2xs uppercase tracking-wider ${isProfitMode ? 'text-accent-success dark:text-accent-success' : isCelebration ? 'text-accent-warning dark:text-accent-warning' : 'text-neutral-500 dark:text-neutral-400'}`}>{title}</p>
        <Icon className={`w-4 h-4 ${isProfitMode ? 'text-accent-success' : isCelebration ? 'text-accent-warning animate-bounce' : color.icon}`} />
      </div>
      
      <div className="flex items-end justify-between mt-0.5 gap-2 min-h-[28px] relative z-10">
        {secondaryValue ? (
            <div className="flex-1 flex justify-between items-end min-w-0">
                <div className="min-w-0">
                    <h3 className={`text-2xl font-bold ${isProfitMode ? 'bg-clip-text text-transparent bg-gradient-to-r from-emerald-600 via-amber-500 to-emerald-600 dark:from-emerald-400 dark:via-amber-300 dark:to-emerald-400 bg-[length:200%_auto] animate-shimmer' : isCelebration ? 'text-accent-warning dark:text-accent-warning' : 'text-neutral-800 dark:text-white'} leading-tight tabular-nums truncate`}>{value}</h3>
                </div>
                <div className="min-w-0 text-left">
                    <span className="text-2xs font-black text-neutral-400 block mb-0.5 uppercase tracking-tighter">{secondaryTitle}</span>
                    <h3 className="text-2xl font-bold text-primary leading-tight tabular-nums truncate">{secondaryValue}</h3>
                    {productionValue && (
                        <div className="flex items-center gap-0.5 text-2xs text-accent-warning dark:text-accent-warning font-extrabold justify-end select-none mt-0.5">
                            <ScaleIcon className="w-3 h-3 text-accent-warning dark:text-accent-warning animate-pulse" />
                            <span>{productionValue}</span>
                        </div>
                    )}
                </div>
            </div>
        ) : (
            <>
                <div className="min-w-0">
                    <h3 className={`text-2xl font-bold ${isProfitMode ? 'bg-clip-text text-transparent bg-gradient-to-r from-emerald-600 via-amber-500 to-emerald-600 dark:from-emerald-400 dark:via-amber-300 dark:to-emerald-400 bg-[length:200%_auto] animate-shimmer' : isCelebration ? 'text-accent-warning dark:text-accent-warning' : 'text-neutral-800 dark:text-white'} leading-tight tabular-nums truncate`}>{value}</h3>
                </div>
                <div className="flex-shrink-0 flex items-center gap-1.5 h-full">
                    {productionValue && (
                        <div className="flex items-center gap-1 text-2xs sm:text-xs text-accent-warning dark:text-accent-warning font-extrabold select-none bg-accent-warning/10 dark:bg-accent-warning/20 px-2 py-0.5 rounded-lg border border-accent-warning/20/50 dark:border-accent-warning/30">
                            <ScaleIcon className="w-3.5 h-3.5 text-accent-warning animate-pulse" />
                            <span>{productionValue}</span>
                        </div>
                    )}
                    {trend ? (
                        <TrendIndicator trend={trend} />
                    ) : subValue ? (
                        <div className={`text-2xs font-black ${isProfitMode ? 'text-accent-success dark:text-accent-success bg-accent-success/10 dark:bg-accent-success/20 border-accent-success/20 dark:border-accent-success/30' : isCelebration ? 'text-accent-warning dark:text-accent-warning bg-accent-warning/10 dark:bg-accent-warning/20 border-accent-warning/20 dark:border-accent-warning/30' : 'text-neutral-400 dark:text-neutral-500 bg-neutral-100 dark:bg-neutral-700/50 border-neutral-200/50 dark:border-neutral-600/30'} px-1.5 py-0.5 rounded border whitespace-nowrap`}>
                            {subValue}
                        </div>
                    ) : null}
                </div>
            </>
        )}
      </div>

      <div className="mt-2 -mb-0.5 h-6 flex items-center relative z-10">
        <Sparkline data={sparklineData} color={isCelebration ? '#F59E0B' : color.sparkline} gradientId={`sparkline-${title.replace(/\s/g, '')}`} />
      </div>
    </div>
  );

  return (
    <div 
      onClick={onClick} 
      className={`w-full text-right block h-28 ${onClick ? 'cursor-pointer outline-none' : ''}`}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      {cardContent}
    </div>
  );
};

const Dashboard: React.FC = () => {
  const { loading } = useUI();
  const { 
    profile, setActiveItem, 
    invoices, expenses, cyclesWithCalculations,
    treasuryFunds, bankAccounts, bankTransactions,
    advances, farmerWithdrawals, supplierPayments,
    persons, partnerDebts
  } = useData();
  const { settings } = useSettings();
  const term = terminology[settings.primaryTerm];

  const [period, setPeriod] = useState<string>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const periodLabels: Record<string, string> = {
    all: `${term.singular} ${settings.primaryTerm === 'cycle' ? 'الحالية' : 'الحالي'}`,
    today: 'هذا اليوم',
    this_week: 'هذا الأسبوع',
    this_month: 'هذا الشهر',
    last_30_days: 'آخر ٣٠ يوم',
    custom: 'مخصص'
  };

  const filteredData = useMemo(() => {
    const now = new Date();
    let fromDate: Date | null = null;
    let toDate: Date | null = new Date();
    toDate.setHours(23, 59, 59, 999);

    if (period === 'today') {
      fromDate = new Date();
      fromDate.setHours(0, 0, 0, 0);
    } else if (period === 'this_week') {
      fromDate = new Date();
      const day = fromDate.getDay(); // 0 is Sunday, 6 is Saturday
      // Week start is Saturday in Egypt/Arabic calendar context
      const diff = fromDate.getDate() - day + (day === 6 ? 0 : -day - 1);
      fromDate.setDate(diff);
      fromDate.setHours(0, 0, 0, 0);
    } else if (period === 'this_month') {
      fromDate = new Date(now.getFullYear(), now.getMonth(), 1);
    } else if (period === 'last_30_days') {
      fromDate = new Date();
      fromDate.setDate(fromDate.getDate() - 30);
      fromDate.setHours(0, 0, 0, 0);
    } else if (period === 'last_90_days') {
      fromDate = new Date();
      fromDate.setDate(fromDate.getDate() - 90);
      fromDate.setHours(0, 0, 0, 0);
    } else if (period === 'this_year') {
      fromDate = new Date(now.getFullYear(), 0, 1);
    } else if (period === 'custom') {
      if (startDate) {
        fromDate = new Date(startDate);
        fromDate.setHours(0, 0, 0, 0);
      }
      if (endDate) {
        toDate = new Date(endDate);
        toDate.setHours(23, 59, 59, 999);
      }
    }

    const isWithin = (dateStr: string) => {
      if (!dateStr) return false;
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return false;
      if (fromDate && d < fromDate) return false;
      if (toDate && d > toDate) return false;
      return true;
    };

    const isAll = period === 'all';

    const activeCycleIds = new Set(cyclesWithCalculations.filter(c => c.status === 'active').map(c => c.id));

    const activeInvoices = invoices.filter(inv => activeCycleIds.has(inv.cycle_id) && inv.market !== 'رصيد منقول' && inv.market !== 'تمويل يدوي');
    const activeExpenses = expenses.filter(exp => activeCycleIds.has(exp.cycle_id) && exp.category !== 'سداد ديون والتزامات مشتركة' && exp.categoryName !== 'سداد ديون والتزامات مشتركة');
    const activeAdvances = advances.filter(adv => activeCycleIds.has(adv.cycle_id));
    const activeFarmerWithdrawals = farmerWithdrawals.filter(w => activeCycleIds.has(w.cycle_id));
    const activeSupplierPayments = supplierPayments.filter(p => activeCycleIds.has(p.cycle_id));

    const fInvoices = isAll ? activeInvoices : activeInvoices.filter(inv => isWithin(inv.date));
    const fExpenses = isAll ? activeExpenses : activeExpenses.filter(exp => isWithin(exp.date));
    const fAdvances = isAll ? activeAdvances : activeAdvances.filter(adv => isWithin(adv.date));
    const fFarmerWithdrawals = isAll ? activeFarmerWithdrawals : activeFarmerWithdrawals.filter(w => isWithin(w.date));
    const fSupplierPayments = isAll ? activeSupplierPayments : activeSupplierPayments.filter(p => isWithin(p.date));

    // Pre-calculate cycle share percentage
    const cycleShareMap: Record<string, number> = {};
    cyclesWithCalculations.forEach(c => {
      cycleShareMap[c.id] = Number(c.farmer_share_percentage) || 0;
    });

    const isFarmerEnabled = settings.systems?.farmer_account !== false;
    let filteredTotalRev = 0;
    let filteredTotalFarmerShare = 0;
    let filteredTotalProductionKg = 0;

    fInvoices.forEach(inv => {
      const invTotal = calculateInvoiceTotal(inv.price_items, inv.deductions);
      filteredTotalRev += invTotal;
      if (isFarmerEnabled) {
        const pct = cycleShareMap[inv.cycle_id] || 0;
        filteredTotalFarmerShare += invTotal * (pct / 100);
      }
      if (inv.price_items) {
        inv.price_items.forEach(item => {
          filteredTotalProductionKg += item.quantity || 0;
        });
      }
    });

    const filteredTotalNetRevenue = filteredTotalRev - filteredTotalFarmerShare;
    const filteredTotalExp = fExpenses.reduce((sum, exp) => sum + (Number(exp.amount) || 0), 0);

    // Calculate shared debts (advances assigned to persons linked as "shared_debt")
    const sharedDebtTotal = fAdvances
      .filter(a => {
         const p = persons.find(person => person.id === a.person_id);
         return p?.virtual_id === 'shared_debt';
      })
      .reduce((sum, a) => sum + (Number(a.amount) || 0), 0);

    const filteredOwnerNetProfit = filteredTotalNetRevenue - filteredTotalExp;

    return {
      filteredInvoices: fInvoices,
      filteredExpenses: fExpenses,
      filteredAdvances: fAdvances,
      filteredFarmerWithdrawals: fFarmerWithdrawals,
      filteredSupplierPayments: fSupplierPayments,
      filteredTotalRevenue: filteredTotalRev,
      filteredTotalFarmerShare,
      filteredTotalNetRevenue,
      filteredTotalExpenses: filteredTotalExp,
      filteredTotalProductionKg,
      sharedDebtTotal, // Export it just in case
      filteredOwnerNetProfit,
    };
  }, [period, startDate, endDate, invoices, expenses, advances, farmerWithdrawals, supplierPayments, cyclesWithCalculations, persons]);

  const globalFinancials = useMemo(() => {
    const activeCycles = cyclesWithCalculations.filter(c => c.status === 'active');

    // Pre-calculate cycle share percentage
    const cycleShareMap: Record<string, number> = {};
    cyclesWithCalculations.forEach(c => {
      cycleShareMap[c.id] = Number(c.farmer_share_percentage) || 0;
    });

    const freezeEnabled = settings?.freeze_new_cycle_loss !== false; // ON by default

    let totalRev = 0;
    let totalFarmerShare = 0;
    let totalExp = 0;
    let ownerNetProfit = 0;
    let sharedDebtTotal = 0;

    activeCycles.forEach(cycle => {
      const cInvoices = invoices.filter(inv => inv.cycle_id === cycle.id && inv.market !== 'رصيد منقول' && inv.market !== 'تمويل يدوي');
      const cExpenses = expenses.filter(exp => exp.cycle_id === cycle.id && exp.category !== 'سداد ديون والتزامات مشتركة' && exp.categoryName !== 'سداد ديون والتزامات مشتركة');
      const cAdvances = advances.filter(adv => adv.cycle_id === cycle.id);

      const rev = cInvoices.reduce((sum, inv) => sum + calculateInvoiceTotal(inv.price_items, inv.deductions), 0);
      const pct = cycleShareMap[cycle.id] || 0;
      const fShare = cInvoices.reduce((sum, inv) => {
        const total = calculateInvoiceTotal(inv.price_items, inv.deductions);
        return sum + (total * (pct / 100));
      }, 0);

      const netRev = rev - fShare;
      const exp = cExpenses.reduce((sum, exp) => sum + (Number(exp.amount) || 0), 0);
      const netProfit = netRev - exp;

      // If freeze rule is enabled, an active cycle with negative net profit (under set up) does not affect global financials
      const isFrozen = freezeEnabled && netProfit < 0;

      if (!isFrozen) {
        totalRev += rev;
        totalFarmerShare += fShare;
        totalExp += exp;
        ownerNetProfit += netProfit;

        const sDebt = cAdvances
          .filter(a => {
             const p = persons.find(person => person.id === a.person_id);
             return p?.virtual_id === 'shared_debt';
          })
          .reduce((sum, a) => sum + (Number(a.amount) || 0), 0);
        sharedDebtTotal += sDebt;
      }
    });

    return {
      totalRev,
      totalNetRevenue: totalRev - totalFarmerShare,
      totalFarmerShare,
      totalExp,
      sharedDebtTotal,
      ownerNetProfit,
    };
  }, [invoices, expenses, advances, cyclesWithCalculations, persons, settings]);

  const totalTreasuryBalance = useMemo(() => {
    const totalCash = treasuryFunds.reduce((s, f) => s + f.balance, 0);
    const activeCycleIds = new Set(cyclesWithCalculations.filter(c => c.status === 'active').map(c => c.id));
    const totalBank = bankAccounts.reduce((total, account) => {
        const txs = bankTransactions.filter(t => t.account_id === account.id && t.cycle_id && activeCycleIds.has(t.cycle_id));
        const deposits = txs.filter(t => t.type === 'deposit').reduce((s, t) => s + (Number(t.amount) || 0), 0);
        const withdrawals = txs.filter(t => t.type === 'withdrawal').reduce((s, t) => s + (Number(t.amount) || 0), 0);
        const initial = activeCycleIds.size > 0 ? (Number(account.initial_balance) || 0) : 0;
        return total + initial + deposits - withdrawals;
    }, 0);
    return totalCash + totalBank;
  }, [treasuryFunds, bankAccounts, bankTransactions, cyclesWithCalculations]);

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'صباح الخير';
    if (hour < 17) return 'أهلاً بك';
    return 'مساء الخير';
  }, []);

  const userName = profile?.full_name?.split(' ')[0] || 'مزارعنا';

  const userNameColor = useMemo(() => {
    if (!profile?.id) return 'text-primary';
    const colors = [
      'text-accent-success dark:text-accent-success',
      'text-accent-info dark:text-accent-info',
      'text-accent-danger dark:text-accent-danger',
      'text-violet-500 dark:text-violet-400',
      'text-accent-warning dark:text-accent-warning',
      'text-teal-500 dark:text-teal-400',
      'text-fuchsia-500 dark:text-fuchsia-400',
      'text-cyan-500 dark:text-cyan-400'
    ];
    let hash = 0;
    for (let i = 0; i < profile.id.length; i++) {
        hash = profile.id.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  }, [profile?.id]);

  const partnerFinancials = useMemo(() => {
    const currentVirtualId = profile?.id?.startsWith('virtual_') ? profile.id.replace('virtual_', '') : profile?.id;
    if (!currentVirtualId || !persons || persons.length === 0) return null;
    
    const linkedPerson = persons.find(p => p.virtual_id === currentVirtualId || p.virtual_id === profile?.id);
    if (!linkedPerson) return null;
    
    const pct = settings?.person_partner_percentages?.[linkedPerson.id] || 0;
    
    const totalBorrowed = advances
      .filter(a => a.person_id === linkedPerson.id)
      .reduce((sum, a) => sum + (a.amount || 0), 0);
      
    const distributableProfit = globalFinancials.ownerNetProfit - globalFinancials.sharedDebtTotal;
    const totalProfit = distributableProfit * (pct / 100);
    const remaining = totalProfit - totalBorrowed;
    
    // Check if other partners are overdrawn
    let otherPartnerOverdrawn = false;
    let overdrawnAmount = 0;
    const overdrawnPartnerNames: string[] = [];
    const owedPartnerNames: string[] = [];
    persons.forEach(p => {
        if (p.id !== linkedPerson.id && p.virtual_id && p.virtual_id !== 'shared_debt') {
            const pPct = settings?.person_partner_percentages?.[p.id] || 0;
            const pBorrowed = advances
                .filter(a => a.person_id === p.id)
                .reduce((sum, a) => sum + (a.amount || 0), 0);
            const pProfit = distributableProfit * (pPct / 100);
            const pRemaining = pProfit - pBorrowed;
            if (pRemaining < 0) {
                otherPartnerOverdrawn = true;
                overdrawnAmount += Math.abs(pRemaining);
                overdrawnPartnerNames.push(p.name);
            } else if (pRemaining > 0) {
                owedPartnerNames.push(p.name);
            }
        }
    });
    
    return {
      personName: linkedPerson.name,
      percentage: pct,
      totalProfit,
      totalBorrowed,
      remaining,
      otherPartnerOverdrawn,
      overdrawnAmount,
      overdrawnPartnerNames: overdrawnPartnerNames.join(' و'),
      owedPartnerNames: owedPartnerNames.join(' و')
    };
  }, [profile, persons, settings, advances, globalFinancials]);

  // الحساب الذكي لاسترداد رأس المال
  const combinedRecoveryStats = useMemo(() => {
    const totalOwnerInflow = filteredData.filteredTotalRevenue - filteredData.filteredTotalFarmerShare;
    const target = filteredData.filteredTotalExpenses;
    
    if (target <= 0) {
      return { 
        progress: totalOwnerInflow > 0 ? 100 : 0, 
        remaining: 0, 
        isRecovered: totalOwnerInflow > 0, 
        target: 0, 
        totalOwnerInflow 
      };
    }
    
    const progress = Math.max(0, Math.round((totalOwnerInflow / target) * 100));
    const remaining = Math.max(0, target - totalOwnerInflow);
    
    return { progress, remaining, isRecovered: progress >= 100, target, totalOwnerInflow };
  }, [filteredData.filteredTotalRevenue, filteredData.filteredTotalFarmerShare, filteredData.filteredTotalExpenses]);

  const [showBreakEvenModal, setShowBreakEvenModal] = useState(false);

  useEffect(() => {
    if (combinedRecoveryStats.isRecovered && !loading) {
      const hasShown = localStorage.getItem('breakeven_shown_overall');
      if (!hasShown) {
        setShowBreakEvenModal(true);
        localStorage.setItem('breakeven_shown_overall', 'true');
      }
    }
  }, [combinedRecoveryStats.isRecovered, loading]);

  // إغلاق قائمة التصفية المنسدلة تلقائياً عند التمرير/السكورل
  useEffect(() => {
    const handleScroll = () => {
      if (isDropdownOpen) {
        setIsDropdownOpen(false);
      }
    };
    window.addEventListener('scroll', handleScroll, true);
    return () => {
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, [isDropdownOpen]);

  const weeklyChartData = useMemo(() => {
    const weeks = 7;
    const revArray = Array(weeks).fill(0);
    const expArray = Array(weeks).fill(0);
    const profArray = Array(weeks).fill(0);
    const fShareArray = Array(weeks).fill(0);
    const recoveryTrendArray = Array(weeks).fill(0);

    const now = new Date();
    now.setHours(23, 59, 59, 999);

    const getWeekIndex = (dateString: string) => {
        const date = new Date(dateString);
        const diffTime = now.getTime() - date.getTime();
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        if (diffDays >= weeks * 7 || diffDays < 0) return -1;
        return (weeks - 1) - Math.floor(diffDays / 7);
    };
    
    const activeCycleIds = new Set(cyclesWithCalculations.filter(c => c.status === 'active').map(c => c.id));
    const activeInvoices = invoices.filter(inv => activeCycleIds.has(inv.cycle_id) && inv.market !== 'رصيد منقول' && inv.market !== 'تمويل يدوي');
    const activeExpenses = expenses.filter(exp => activeCycleIds.has(exp.cycle_id) && exp.category !== 'سداد ديون والتزامات مشتركة' && exp.categoryName !== 'سداد ديون والتزامات مشتركة');

    activeInvoices.forEach(invoice => {
        const weekIndex = getWeekIndex(invoice.date);
        if (weekIndex !== -1) {
            const invoiceTotal = calculateInvoiceTotal(invoice.price_items, invoice.deductions);
            revArray[weekIndex] += invoiceTotal;
            const cycle = cyclesWithCalculations.find(c => c.id === invoice.cycle_id);
            const isFarmerEnabled = settings.systems?.farmer_account !== false;
            if (cycle && isFarmerEnabled) {
                const invoiceFarmerShare = invoiceTotal * ((cycle.farmer_share_percentage || 0) / 100);
                fShareArray[weekIndex] += invoiceFarmerShare;
                profArray[weekIndex] += invoiceTotal - invoiceFarmerShare;
            } else {
                profArray[weekIndex] += invoiceTotal;
            }
        }
    });

    activeExpenses.forEach(expense => {
        const weekIndex = getWeekIndex(expense.date);
        if (weekIndex !== -1) {
            expArray[weekIndex] += expense.amount;
            profArray[weekIndex] -= expense.amount;
        }
    });

    let cumulativeOwnerRev = 0;
    let cumulativeExp = 0;
    for (let i = 0; i < weeks; i++) {
        cumulativeOwnerRev += (revArray[i] - fShareArray[i]);
        cumulativeExp += expArray[i];
        recoveryTrendArray[i] = cumulativeExp > 0 ? Math.min(100, (cumulativeOwnerRev / cumulativeExp) * 100) : 0;
    }

    return { revenue: revArray, expenses: expArray, profit: profArray, farmerShare: fShareArray, recovery: recoveryTrendArray };
  }, [invoices, expenses, cyclesWithCalculations]);

  const trendData = useMemo(() => {
      const calculateTrend = (current: number, previous: number) => {
          if (previous === 0) return { value: current > 0 ? 100.0 : 0, direction: 'up' as const };
          const percentageChange = ((current - previous) / previous) * 100;
          return { value: Math.abs(percentageChange), direction: percentageChange >= 0 ? 'up' as const : 'down' as const };
      };
      const lastWeek = weeklyChartData.revenue.length - 1;
      const secondLastWeek = lastWeek - 1;
      if (secondLastWeek < 0) return { revenue: { value: 0, direction: 'up' as const }, expenses: { value: 0, direction: 'up' as const }, profit: { value: 0, direction: 'up' as const }, farmerShare: { value: 0, direction: 'down' as const } };
      return {
          revenue: calculateTrend(weeklyChartData.revenue[lastWeek], weeklyChartData.revenue[secondLastWeek]),
          expenses: calculateTrend(weeklyChartData.expenses[lastWeek], weeklyChartData.expenses[secondLastWeek]),
          profit: calculateTrend(weeklyChartData.profit[lastWeek], weeklyChartData.profit[secondLastWeek]),
          farmerShare: calculateTrend(weeklyChartData.farmerShare[lastWeek], weeklyChartData.farmerShare[secondLastWeek]),
      };
  }, [weeklyChartData]);

  const merchantDebtStats = useMemo(() => {
    const recordedDebts: PartnerDebt[] = partnerDebts || [];
    
    // Enrich debts with invoice repayments
    const enrichedDebts = recordedDebts.map(debt => {
      const partnerRepayments = { ...(debt.partner_repayments || debt.partnerRepayments || {}) };
      (advances || []).forEach(adv => {
        if (adv.reason?.includes(`[PARTNER_DEBT_PAYMENT:${debt.id}]`)) {
          const pId = adv.person_id;
          if (pId) {
            partnerRepayments[pId] = (partnerRepayments[pId] || 0) + Math.abs(adv.amount || 0);
          }
        }
      });
      return {
        ...debt,
        partner_repayments: partnerRepayments,
        partnerRepayments
      };
    });

    const individualExternalDebts = (advances || []).filter(
      adv => adv.funding_source === 'external_debt' || adv.reason?.includes('[EXTERNAL_DEBT]') || adv.reason?.includes('المعلم')
    );

    // 1. Total Joint Debts
    const jointDebtTotal = enrichedDebts.reduce((sum, d) => sum + (d.total_amount ?? d.totalAmount ?? 0), 0);

    // 2. Retained Invoice Settlements (Double-Entry Non-Cash Repayments)
    const isInvoiceRepayment = (adv: Advance) => 
      Boolean(adv.is_retained_debt) || 
      adv.source_type === 'invoice' || 
      Boolean(adv.source_ref_id) || 
      Boolean(adv.reason?.includes('[INVOICE_REPAYMENT:')) ||
      Boolean(adv.reason?.includes('[PARTNER_DEBT_PAYMENT:'));

    const retainedInvoiceRepayments = (advances || []).filter(adv => isInvoiceRepayment(adv));
    const totalRetainedSettled = retainedInvoiceRepayments.reduce((sum, adv) => sum + Math.abs(adv.amount || 0), 0);

    // 3. Cash Repayments
    const jointDebtInvoicePaid = (advances || [])
      .filter(adv => adv.reason?.includes('[PARTNER_DEBT_PAYMENT:'))
      .reduce((sum, adv) => sum + Math.abs(adv.amount || 0), 0);

    const jointDebtTotalPaidInEnriched = enrichedDebts.reduce((sum, d) => {
      const paid = Object.values(d.partnerRepayments || {}).reduce((s, v) => s + v, 0);
      return sum + paid;
    }, 0);

    const jointDebtCashPaid = Math.max(0, jointDebtTotalPaidInEnriched - jointDebtInvoicePaid);

    // 4. Individual External Debt Cash Repayments & Additions
    const individualDebtTotal = individualExternalDebts
      .filter(adv => (adv.amount || 0) > 0 && !adv.reason?.includes('[PARTNER_DEBT_PAYMENT]') && !isInvoiceRepayment(adv))
      .reduce((sum, adv) => sum + (adv.amount || 0), 0);

    const individualDebtCashPaid = individualExternalDebts
      .filter(adv => (adv.amount || 0) < 0 && !isInvoiceRepayment(adv))
      .reduce((sum, adv) => sum + Math.abs(adv.amount || 0), 0);

    const totalCashSettled = jointDebtCashPaid + individualDebtCashPaid;

    const grandTotalDebt = jointDebtTotal + individualDebtTotal;
    const grandTotalSettled = totalRetainedSettled + totalCashSettled;
    const remainingDebt = Math.max(0, grandTotalDebt - grandTotalSettled);
    const settlementPercentage = grandTotalDebt > 0 
      ? Math.min(100, Math.round((grandTotalSettled / grandTotalDebt) * 100))
      : 100;

    return {
      grandTotalDebt,
      grandTotalSettled,
      remainingDebt,
      settlementPercentage
    };
  }, [partnerDebts, advances]);

  return (
    <div id="dashboard-page" className="space-y-3.5 sm:space-y-4 relative">
      <canvas id="dashboard-confetti-canvas" className="fixed inset-0 w-full h-full pointer-events-none z-[10000]" />
      <div className="flex flex-row justify-between items-center gap-3 animate-enter px-0.5 relative z-20">
          <div className="min-w-0">
              <h2 className="text-base sm:text-lg md:text-xl font-black text-neutral-900 dark:text-white tracking-tight leading-snug flex items-center gap-1.5">
                  <span>{greeting}،</span>
                  <span className={userNameColor}>{userName}</span>
                  <span className="text-sm sm:text-base inline-block animate-wave origin-bottom-right">👋</span>
              </h2>
              <p className="text-neutral-500 dark:text-neutral-400 text-[11px] sm:text-xs font-medium mt-1 block">
                  {settings.primaryTerm === 'season' ? 'إليك ملخص سريع للموسم النشط' : 'إليك ملخص سريع للعروة النشطة'}
              </p>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200/80 dark:border-neutral-700/80 shadow-xs">
                  <CalendarIcon className="w-3.5 h-3.5 text-primary" />
                  <span className="text-[11px] font-bold text-neutral-600 dark:text-neutral-300">
                      {new Date().toLocaleDateString('ar-EG', { weekday: 'short', day: 'numeric', month: 'short', numberingSystem: 'latn' })}
                  </span>
              </div>

              {/* Dynamic Dropdown Filter */}
              <div className="relative z-30">
                  <button 
                      onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                      className="flex items-center gap-1.5 px-2.5 py-1 sm:px-3 sm:py-1.5 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-[11px] sm:text-xs font-black text-neutral-800 dark:text-neutral-200 shadow-xs hover:bg-neutral-50 dark:hover:bg-neutral-700/50 transition-all tap cursor-pointer outline-none select-none"
                  >
                      <CalendarIcon className="w-3.5 h-3.5 text-primary" />
                      <span className="whitespace-nowrap">{periodLabels[period]}</span>
                      <ChevronDownIcon className={`w-3 h-3 text-neutral-400 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>

                  <AnimatePresence>
                      {isDropdownOpen && (
                          <>
                              {/* Close overlay on backdrop click */}
                              <div className="fixed inset-0 z-10" onClick={() => setIsDropdownOpen(false)} />
                              
                              <motion.div 
                                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                  animate={{ opacity: 1, y: 0, scale: 1 }}
                                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                  transition={{ duration: 0.15 }}
                                  className="absolute left-0 mt-1.5 w-44 sm:w-48 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-xl py-1.5 z-40"
                              >
                                  {Object.entries(periodLabels).map(([id, label]) => (
                                      <button
                                          key={id}
                                          onClick={() => {
                                              setPeriod(id);
                                              setIsDropdownOpen(false);
                                          }}
                                          className={`w-full text-right px-3.5 py-1.5 text-xs font-bold transition-all flex items-center justify-between ${
                                              period === id 
                                                  ? 'bg-primary/10 text-primary dark:bg-primary/25 dark:text-primary-light font-black' 
                                                  : 'text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800'
                                          }`}
                                      >
                                          <span>{label}</span>
                                          {period === id && <span className="w-1.5 h-1.5 bg-primary dark:bg-primary-light rounded-full" />}
                                      </button>
                                  ))}
                              </motion.div>
                          </>
                      )}
                  </AnimatePresence>
              </div>
          </div>
      </div>

      {/* Dynamic Date Filter Bar for Custom Period */}
      <AnimatePresence>
        {period === 'custom' && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden bg-white dark:bg-neutral-900 px-4 py-3 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-soft flex flex-col gap-3 animate-enter"
          >
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-1">
              <div className="flex items-center gap-2 flex-grow sm:flex-initial">
                <span className="text-[11px] font-bold text-neutral-400 shrink-0">من تاريخ:</span>
                <input 
                  type="date" 
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="px-3 py-1.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-xs text-neutral-800 dark:text-neutral-100 font-bold outline-none focus:border-primary dark:focus:border-primary focus:ring-1 focus:ring-primary transition-all w-full"
                />
              </div>
              <div className="flex items-center gap-2 flex-grow sm:flex-initial">
                <span className="text-[11px] font-bold text-neutral-400 shrink-0">إلى تاريخ:</span>
                <input 
                  type="date" 
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="px-3 py-1.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-xs text-neutral-800 dark:text-neutral-100 font-bold outline-none focus:border-primary dark:focus:border-primary focus:ring-1 focus:ring-primary transition-all w-full"
                />
              </div>
              {(startDate || endDate) && (
                <button
                  onClick={() => { setStartDate(''); setEndDate(''); }}
                  className="px-3 py-1.5 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 text-[11px] font-bold transition-all text-center shrink-0"
                >
                  إعادة تعيين التواريخ
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {!loading && profile?.role === 'user' && !profile?.parent_id && invoices.length === 0 && expenses.length === 0 && cyclesWithCalculations.length === 0 && (
        <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border-2 border-primary/20 rounded-[2.5rem] p-8 text-center animate-enter overflow-hidden relative group">
            <div className="absolute -top-24 -right-24 w-64 h-64 bg-primary/10 rounded-full blur-3xl group-hover:bg-primary/20 transition-all duration-700"></div>
            <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-primary/10 rounded-full blur-3xl group-hover:bg-primary/20 transition-all duration-700"></div>
            
            <div className="relative z-10 flex flex-col items-center max-w-2xl mx-auto">
                <div className="w-20 h-20 bg-white dark:bg-neutral-800 rounded-3xl shadow-xl flex items-center justify-center mb-6 border border-primary/10 transform group-hover:rotate-12 transition-transform duration-500">
                    <Rocket className="w-10 h-10 text-primary" />
                </div>
                <h3 className="text-3xl font-black mb-4">أهلاً بك في المحاسب الزراعي!</h3>
                <p className="text-neutral-600 dark:text-neutral-400 font-bold mb-8 leading-relaxed">
                    يمكنك البدء من الصفر وإضافة بياناتك الخاصة، أو إذا كان لديك كود ربط من صاحب حساب آخر، يمكنك استخدامه لمشاهدة بياناته فوراً.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 w-full justify-center">
                    <button 
                        onClick={() => setActiveItem('settings')}
                        className="bg-primary hover:bg-primary-dark text-white font-black px-8 py-4 rounded-2xl transition-all shadow-lg shadow-primary/20 tap flex items-center justify-center gap-2"
                    >
                        الارتباط بحساب مالك
                    </button>
                    <button 
                        onClick={() => setActiveItem('invoices')}
                        className="bg-white dark:bg-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-700 text-neutral-800 dark:text-white border border-neutral-200 dark:border-neutral-700 font-black px-8 py-4 rounded-2xl transition-all shadow-sm tap"
                    >
                        البدء في إضافة بياناتي
                    </button>
                </div>
            </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6 gap-4 items-stretch">
        {partnerFinancials && (
          <div className="col-span-1 sm:col-span-2 xl:col-span-3 2xl:col-span-3 bg-gradient-to-br from-[#0c1328] via-[#0f2547] to-[#06101f] text-white rounded-xl shadow-lg flex flex-col justify-between overflow-hidden relative group border border-blue-900/60 transition-all hover:shadow-xl">
              {/* Soft decorative background glow */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-accent-info/10 rounded-full blur-2xl pointer-events-none"></div>
              
              <div className="p-3.5 relative z-10 flex flex-col justify-center gap-2 text-right w-full">
                  <div className="flex justify-between items-center mb-0.5">
                      <div className="bg-blue-950/80 text-blue-300 px-2.5 py-0.5 rounded text-2xs font-bold inline-flex items-center gap-1 border border-blue-800/50 backdrop-blur-sm">
                        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse"></span>
                        <span>مرحباً، {partnerFinancials.personName}</span>
                      </div>
                      <FarmerAccountIcon className="w-4 h-4 text-blue-400/80" />
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                      <div className="bg-white/5 rounded-lg p-2 border border-white/5 flex flex-col justify-center shadow-inner">
                          <p className="text-2xs text-blue-300/80 font-bold mb-0.5">أرباحك المستحقة</p>
                          <p className="text-xs font-black truncate">{formatNumber(partnerFinancials.totalProfit)} ج.م</p>
                      </div>
                      <div className="bg-white/5 rounded-lg p-2 border border-white/5 flex flex-col justify-center shadow-inner">
                          <p className="text-2xs text-rose-300/80 font-bold mb-0.5">مسحوبات وسلف</p>
                          <p className="text-xs font-black truncate text-rose-200">{formatNumber(partnerFinancials.totalBorrowed)} ج.م</p>
                      </div>
                      <div className="bg-blue-600/90 rounded-lg p-2 border border-blue-400/40 shadow-[0_0_12px_rgba(59,130,246,0.5)] transform scale-102 z-10 relative flex flex-col justify-center items-center">
                          <p className="text-2xs text-cyan-200 font-black mb-0.5">المتبقي لك</p>
                          <p className={`text-xs font-black truncate ${partnerFinancials.remaining >= 0 ? 'text-emerald-300 drop-shadow-[0_0_5px_rgba(52,211,153,0.6)]' : 'text-accent-danger drop-shadow-[0_0_5px_rgba(251,113,133,0.6)]'}`}>{formatNumber(partnerFinancials.remaining)} ج.م</p>
                      </div>
                  </div>

                  {partnerFinancials.otherPartnerOverdrawn && partnerFinancials.remaining > 0 && (
                      <div className="bg-accent-danger/10 border border-accent-danger/50 rounded-lg p-2 mt-1.5 flex items-start gap-1.5 shadow-[0_0_12px_rgba(239,68,68,0.3)] animate-pulse">
                          <span className="text-base animate-bounce mt-0">⚠️</span>
                          <p className="text-[9.5px] leading-tight text-accent-danger font-extrabold drop-shadow-[0_0_8px_rgba(239,68,68,0.85)]">
                              تنبيه من الصندوق: شريكك ({partnerFinancials.overdrawnPartnerNames}) سحب بزيادة ({formatNumber(partnerFinancials.overdrawnAmount)} ج.م). سحبك لكامل رصيدك سيؤدي لعجز في التكلفة التأسيسية للعروة القادمة.
                          </p>
                      </div>
                  )}

                  {partnerFinancials.remaining < 0 && (
                      <div className="bg-accent-danger/10 border border-accent-danger/50 rounded-lg p-2 mt-1.5 flex items-start gap-1.5 shadow-[0_0_12px_rgba(239,68,68,0.3)] animate-pulse">
                          <span className="text-base animate-bounce mt-0">⚠️</span>
                          <p className="text-[9.5px] leading-tight text-accent-danger font-extrabold drop-shadow-[0_0_8px_rgba(239,68,68,0.85)]">
                              تنبيه من الصندوق: مسحوباتك تخطت أرباحك المستحقة بزيادة ({formatNumber(Math.abs(partnerFinancials.remaining))} ج.م). هذا المبلغ الزائد مأخوذ من السيولة التأسيسية للعروة القادمة {partnerFinancials.owedPartnerNames ? `أو من أرباح الشريك (${partnerFinancials.owedPartnerNames})` : 'أو من أرباح الشركاء الآخرين'}، ويرجى تسويته.
                          </p>
                      </div>
                  )}
              </div>
          </div>
        )}
        <DashboardCard
          isLoading={loading}
          onClick={() => setActiveItem('invoices')}
          title="إجمالي الإيرادات"
          value={formatNumber(filteredData.filteredTotalRevenue)}
          secondaryValue={settings.systems?.farmer_account ? formatNumber(filteredData.filteredTotalNetRevenue) : undefined}
          secondaryTitle={settings.systems?.farmer_account ? "الايراد الصافي بعد المزارع" : undefined}
          productionValue={`${formatNumber(filteredData.filteredTotalProductionKg)} كجم`}
          icon={TrendingUpIcon}
          trend={trendData.revenue}
          sparklineData={weeklyChartData.revenue}
          color={{
            icon: 'text-accent-success',
            glow: 'glow-on-hover-success',
            gradient: 'bg-gradient-to-br from-green-50/20 to-transparent dark:from-green-900/5',
            sparkline: '#10B981',
          }}
        />

        <DashboardCard
          isLoading={loading}
          onClick={() => setActiveItem('expenses')}
          title="إجمالي المصروفات"
          value={formatCurrency(filteredData.filteredTotalExpenses).replace('EGP', '')}
          icon={TrendingDownIcon}
          trend={trendData.expenses}
          sparklineData={weeklyChartData.expenses}
          color={{
            icon: 'text-accent-danger',
            glow: 'glow-on-hover-danger',
            gradient: 'bg-gradient-to-br from-red-50/20 to-transparent dark:from-red-900/5',
            sparkline: '#F43F5E',
          }}
        />

        <DashboardCard
          isLoading={loading}
          title="صافي ربح المالك"
          value={formatCurrency(filteredData.filteredOwnerNetProfit).replace('EGP', '')}
          subValue={filteredData.sharedDebtTotal > 0 ? `بعد خصم ديون خارجية: ${formatNumber(filteredData.sharedDebtTotal)}` : undefined}
          icon={ChartBarIcon}
          trend={trendData.profit}
          sparklineData={weeklyChartData.profit}
          isProfitMode={filteredData.filteredOwnerNetProfit > 0}
          color={{
            icon: 'text-accent-info',
            glow: 'glow-on-hover-info',
            gradient: 'bg-gradient-to-br from-blue-50/20 to-transparent dark:from-blue-900/5',
            sparkline: '#3B82F6',
          }}
        />

        <DashboardCard
          isLoading={loading}
          title={combinedRecoveryStats.isRecovered ? `عائد ${term.singular} (ROI)` : "استرداد رأس المال"}
          value={combinedRecoveryStats.isRecovered ? `%${combinedRecoveryStats.target > 0 ? Math.round((filteredData.filteredOwnerNetProfit / combinedRecoveryStats.target) * 100) : 100}` : `${combinedRecoveryStats.progress}%`}
          subValue={combinedRecoveryStats.isRecovered ? `الربح: ${formatNumber(filteredData.filteredOwnerNetProfit)}` : `-${formatNumber(combinedRecoveryStats.remaining)}`}
          icon={combinedRecoveryStats.isRecovered ? Rocket : ClockIcon}
          sparklineData={weeklyChartData.recovery}
          isProfitMode={combinedRecoveryStats.isRecovered}
          color={{
            icon: combinedRecoveryStats.isRecovered ? 'text-accent-success' : 'text-primary',
            glow: 'glow-on-hover-success',
            gradient: 'bg-gradient-to-br from-amber-50/20 to-transparent dark:from-amber-900/5',
            sparkline: combinedRecoveryStats.isRecovered ? '#10B981' : '#F59E0B',
          }}
        />
        
        {settings.systems.farmer_account && (
          <DashboardCard
            isLoading={loading}
            onClick={() => setActiveItem('farmer_account')}
            title="إجمالي حصة المزارع"
            value={formatCurrency(filteredData.filteredTotalFarmerShare).replace('EGP', '')}
            icon={FarmerAccountIcon}
            trend={trendData.farmerShare}
            sparklineData={weeklyChartData.farmerShare}
            color={{
              icon: 'text-accent-purple',
              glow: 'glow-on-hover-purple',
              gradient: 'bg-gradient-to-br from-purple-50/20 to-transparent dark:from-purple-900/5',
              sparkline: '#8B5CF6',
            }}
          />
        )}

        <DashboardCard
          isLoading={loading}
          onClick={() => setActiveItem('treasury')}
          title="إجمالي السيولة (الخزنة)"
          value={formatNumber(totalTreasuryBalance)}
          icon={WalletIcon}
          sparklineData={[]}
          color={{
            icon: 'text-accent-warning',
            glow: 'glow-on-hover-warning',
            gradient: 'bg-gradient-to-br from-amber-50/20 to-transparent dark:from-amber-900/5',
            sparkline: '#F59E0B',
          }}
        />

        {/* Merchant / Teacher Debt Card - Automatically hidden when no debt is recorded */}
        {merchantDebtStats.grandTotalDebt > 0 && (
          <div 
            onClick={() => setActiveItem('partners')}
            className="group bg-white dark:bg-neutral-800 bg-gradient-to-br from-indigo-50/20 via-transparent to-purple-50/10 dark:from-indigo-950/20 dark:to-purple-950/10 py-2.5 px-3 rounded-xl flex flex-col justify-between shadow-soft border border-neutral-200 dark:border-neutral-700 h-28 hover:shadow-md hover:border-purple-500/30 transition-all duration-500 relative overflow-hidden cursor-pointer"
          >
            {/* Header */}
            <div className="flex justify-between items-start relative z-10">
              <div className="flex items-center gap-1.5">
                <p className="font-bold text-2xs uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                  ديون وحسابات المعلم
                </p>
                <span className="text-2xs font-extrabold text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/60 px-2 py-0.5 rounded-full border border-purple-200/60 dark:border-purple-800/40">
                  {merchantDebtStats.settlementPercentage}% مسدد
                </span>
              </div>
              <HandCoins className="w-4 h-4 text-purple-600 dark:text-purple-400 group-hover:scale-110 transition-transform duration-300" />
            </div>

            {/* Main Display: Remaining Debt */}
            <div className="flex items-baseline justify-between mt-0.5 relative z-10">
              <div className="flex items-baseline gap-1">
                <h3 className="text-2xl font-bold text-neutral-800 dark:text-white leading-tight tabular-nums">
                  {formatNumber(merchantDebtStats.remainingDebt)}
                </h3>
                <span className="text-xs font-bold text-neutral-400">ج.م</span>
              </div>
              <span className="text-2xs font-extrabold text-accent-info dark:text-accent-info bg-accent-info/10 dark:bg-accent-info/20 px-2 py-0.5 rounded-md border border-accent-info/20 dark:border-accent-info/30">
                المتبقي المستحق
              </span>
            </div>

            {/* Progress Bar & Footer Line */}
            <div className="space-y-1 relative z-10">
              <div className="w-full bg-neutral-100 dark:bg-neutral-700/60 h-1.5 rounded-full overflow-hidden">
                <div 
                  className="bg-gradient-to-r from-emerald-500 via-indigo-500 to-purple-600 h-full rounded-full transition-all duration-1000"
                  style={{ width: `${merchantDebtStats.settlementPercentage}%` }}
                />
              </div>
              <div className="flex justify-between items-center text-2xs font-medium text-neutral-500 dark:text-neutral-400">
                <span>الإجمالي: <strong className="font-bold text-neutral-700 dark:text-neutral-200 tabular-nums">{formatNumber(merchantDebtStats.grandTotalDebt)} ج.م</strong></span>
                <span>المدفوع: <strong className="font-bold text-accent-success dark:text-accent-success tabular-nums">{formatNumber(merchantDebtStats.grandTotalSettled)} ج.م</strong></span>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1">
        <GlobalFinancialReconciliation 
          filteredInvoices={invoices}
          filteredExpenses={expenses}
          filteredAdvances={advances}
          filteredFarmerWithdrawals={farmerWithdrawals}
          filteredSupplierPayments={supplierPayments}
          filteredTotalRevenue={globalFinancials.totalNetRevenue + globalFinancials.totalFarmerShare}
          filteredTotalFarmerShare={globalFinancials.totalFarmerShare}
          filteredTotalExpenses={globalFinancials.totalExp}
          filteredOwnerNetProfit={globalFinancials.ownerNetProfit}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
            <CashFlowChart 
              period={period}
              startDate={startDate}
              endDate={endDate}
            />
        </div>
        <div className="space-y-6">
            <ActiveCyclesOverview />
            <RecentTransactions 
              filteredInvoices={filteredData.filteredInvoices}
              filteredExpenses={filteredData.filteredExpenses}
              filteredAdvances={filteredData.filteredAdvances}
            />
        </div>
      </div>

      <BreakEvenModal 
        isOpen={showBreakEvenModal} 
        onClose={() => setShowBreakEvenModal(false)} 
        totalExpenses={filteredData.filteredTotalExpenses} 
      />
    </div>
  );
};

export default Dashboard;
