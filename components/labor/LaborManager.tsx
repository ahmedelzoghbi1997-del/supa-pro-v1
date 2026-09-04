import { useState, useEffect } from 'react';
import React, { useMemo } from 'react';
import { useData } from '../../contexts/DataContext';
import { useSettings } from '../../contexts/SettingsContext';
import { UsersIcon, ChartPieIcon, CalendarIcon, SettingsIcon } from '../Icons';
import { formatNumber } from '../../utils/helpers';
import Modal from '../shared/Modal';
import ExtendedFAB from '../shared/ExtendedFAB';
import UnifiedLaborForm from './UnifiedLaborForm';
import LaborLedger from './LaborLedger';
import WorkerAccounts from './WorkerAccounts';
import ActivityAnalysis from './ActivityAnalysis';
import LaborActivitiesSettings from './LaborActivitiesSettings';
type TabType = 'ledger' | 'workers' | 'analysis';

const LaborManager: React.FC = () => {
    const { rawExpenses: expenses, expenseCategories, cyclesWithCalculations } = useData();
    const { settings, language } = useSettings();
    const isEn = language === 'en';
    const [activeTab, setActiveTab] = useState<TabType>('ledger');
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
    const [isStatsModalOpen, setIsStatsModalOpen] = useState(false);
    const activeCycle = useMemo(() => cyclesWithCalculations.find(c => c.status === 'active') || cyclesWithCalculations[0], [cyclesWithCalculations]);
    const [selectedCycleId, setSelectedCycleId] = useState<string>(activeCycle?.id || 'all');

    // Auto-select active cycle when activeCycle changes
    useEffect(() => {
        if (activeCycle?.id) {
            setSelectedCycleId(activeCycle.id);
        }
    }, [activeCycle?.id]);

    const currentGhs = useMemo(() => settings?.greenhouses || [
        { id: 'mine', name: 'الصوبة الخاصة بي', type: 'mine', is_default: true },
        { id: 'father', name: 'صوبة أبي وأخي', type: 'external' }
    ], [settings?.greenhouses]);

    const [greenhouseFilter, setGreenhouseFilter] = useState<string>(() => {
        return currentGhs[0]?.id || 'mine';
    });

    const [hasInitializedFilter, setHasInitializedFilter] = useState(false);

    useEffect(() => {
        if (currentGhs && currentGhs.length > 0 && !hasInitializedFilter) {
            setGreenhouseFilter(currentGhs[0].id);
            setHasInitializedFilter(true);
        }
    }, [currentGhs, hasInitializedFilter]);

    // 1. Identify Labor Expenses
    const laborCategories = expenseCategories.filter(c => 
        c.name.includes('عمالة') || c.name.includes('عماله') || c.name.includes('يومية') || c.name.includes('عامل') || c.name.includes('مزارع') || c.name.includes('فطار') || c.name.includes('نثريات') || c.name.includes('إكرامية') || c.name.includes('ضيافة')
    );
    const laborCategoryIds = laborCategories.map(c => c.id);

    const allLaborExpenses = useMemo(() => {
        return expenses.filter(e => laborCategoryIds.includes(e.category_id));
    }, [expenses, laborCategoryIds]);

    // 2. Filter by Greenhouse type dynamically (First)
    const ghFilteredLabor = useMemo(() => {
        if (greenhouseFilter === 'all') {
            return allLaborExpenses;
        }
        
        const selectedGh = currentGhs.find(g => g.id === greenhouseFilter);
        if (!selectedGh) {
            return allLaborExpenses;
        }

        if (selectedGh.type === 'mine') {
            const externalGhs = currentGhs.filter(g => g.type === 'external');
            return allLaborExpenses.filter(e => {
                if (!e.description) return true;
                if (e.description.includes('صوبة أبي وأخي') || e.description.includes('[صوبة أبي وأخي]')) {
                    return false;
                }
                const isExt = externalGhs.some(g => e.description.includes(g.name) || e.description.includes(`🏠 ${g.name}`));
                return !isExt;
            });
        } else {
            return allLaborExpenses.filter(e => {
                if (!e.description) return false;
                if (selectedGh.id === 'father' && (e.description.includes('صوبة أبي وأخي') || e.description.includes('[صوبة أبي وأخي]'))) {
                    return true;
                }
                return e.description.includes(selectedGh.name) || e.description.includes(`🏠 ${selectedGh.name}`);
            });
        }
    }, [allLaborExpenses, greenhouseFilter, currentGhs]);

    // 3. Filter by Cycle (ignore cycle filter for external greenhouses so their history persists across cycles)
    const displayLabor = useMemo(() => {
        const isExternalGh = currentGhs.find(g => g.id === greenhouseFilter)?.type === 'external';
        const externalGhs = currentGhs.filter(g => g.type === 'external');
        
        if (isExternalGh || selectedCycleId === 'all') {
            return ghFilteredLabor;
        }

        return ghFilteredLabor.filter(e => {
            const desc = e.description || '';
            const isExtExp = externalGhs.some(g => 
                desc.includes(g.name) || desc.includes(`🏠 ${g.name}`) ||
                (g.id === 'father' && (desc.includes('صوبة أبي وأخي') || desc.includes('[صوبة أبي وأخي]')))
            );
            if (isExtExp) return true;

            return e.cycle_id === selectedCycleId;
        });
    }, [ghFilteredLabor, selectedCycleId, greenhouseFilter, currentGhs]);

    // Filter out advances and settlement payments for operational stats, ledger, and analysis
    const actualOperatingLaborExpenses = useMemo(() => {
        return displayLabor.filter(exp => {
            const desc = exp.description || '';
            const isSettlementOrAdvance = 
                desc.includes('سداد دفعة نقدية') || 
                desc.includes('سداد دفعة') ||
                desc.includes('تسديد') ||
                desc.includes('تصفية') ||
                desc.includes('سداد كامل') ||
                desc.includes('سلفة') ||
                desc.includes('تخصيم');
            return !isSettlementOrAdvance;
        });
    }, [displayLabor]);

    // Calculate Dashboards (Comprehensive Multi-Account Calculation Flow matching WorkerAccounts logic)
    const stats = useMemo(() => {
        let totalCost = 0;
        let totalWorkersCount = 0;
        let totalCashWork = 0;
        let totalCreditDayLabor = 0;
        let totalSettlementsAndAdvancesDelta = 0; // Absolute cash movement in/out
        let totalWagesOnly = 0;
        let totalOperationalOnly = 0;

        displayLabor.forEach(exp => {
            const desc = exp.description || '';
            const amount = exp.amount;
            const isCash = exp.payment_method === 'cash';

            // Transaction Types (Matching WorkerAccounts.tsx logic for consistency)
            const isAdvanceTaken = amount > 0 && (desc.includes('سلفة') || desc.includes('سلفية') || desc.includes('تخصيم') || (desc.includes('صرف') && !desc.includes('منصرف')) || desc.includes('دفعة نقدية') || desc.includes('مسحوبات'));
            const isAdvanceRepayment = amount < 0 || (desc.includes('سداد') && desc.includes('من العامل'));
            const isSettlement = amount > 0 && (desc.includes('سداد دفعة') || desc.includes('تسديد') || desc.includes('تصفية') || desc.includes('سداد كامل')) && !desc.includes('من العامل');
            const isWageWork = !isSettlement && !isAdvanceTaken && !isAdvanceRepayment;

            if (isWageWork) {
                totalCost += amount;
                if (isCash) totalCashWork += amount;
                else totalCreditDayLabor += amount;

                if (desc.includes('منصرف عمالة:')) {
                    totalOperationalOnly += amount;
                } else {
                    totalWagesOnly += amount;

                    // Worker Count logic: only count workers under actual wages
                    const countMatch = desc.match(/عدد العمال:\s*(\d+)/);
                    if (countMatch) {
                        totalWorkersCount += parseInt(countMatch[1], 10);
                    } else {
                        totalWorkersCount += 1;
                    }
                }
            }

            // Global Cash Flow (Card 4)
            if (isCash) {
                if (isWageWork || isAdvanceTaken || isSettlement) {
                    totalSettlementsAndAdvancesDelta += amount;
                } else if (isAdvanceRepayment) {
                    totalSettlementsAndAdvancesDelta -= Math.abs(amount);
                }
            }
        });

        // Compute Worker Balances over full scope history (allLaborExpenses)
        // so that credit work and settlements carry over consistently across cycles and greenhouses
        const workerBalances: Record<string, number> = {};
        let totalAdvancesAll = 0;
        let totalRepaymentsAll = 0;

        allLaborExpenses.forEach(exp => {
            const desc = exp.description || '';
            const amount = exp.amount;
            const isCash = exp.payment_method === 'cash';

            const isAdvanceTaken = amount > 0 && (desc.includes('سلفة') || desc.includes('سلفية') || desc.includes('تخصيم') || (desc.includes('صرف') && !desc.includes('منصرف')) || desc.includes('دفعة نقدية') || desc.includes('مسحوبات'));
            const isAdvanceRepayment = amount < 0 || (desc.includes('سداد') && desc.includes('من العامل'));
            const isSettlement = amount > 0 && (desc.includes('سداد دفعة') || desc.includes('تسديد') || desc.includes('تصفية') || desc.includes('سداد كامل')) && !desc.includes('من العامل');
            const isWageWork = !isSettlement && !isAdvanceTaken && !isAdvanceRepayment;

            if (isAdvanceTaken) totalAdvancesAll += amount;
            if (isAdvanceRepayment) totalRepaymentsAll += Math.abs(amount);

            let name: string | null = null;
            if (!desc.includes('منصرف عمالة:')) {
                const match = desc.match(/(?:^|[\s|])عامل:\s*([^|\-]+)/);
                if (match) {
                    const tempName = match[1].trim();
                    if (tempName && tempName !== 'شخص بدون اسم' && tempName !== 'بدون اسم' && tempName !== 'يومية بدون اسم') {
                        name = tempName;
                    }
                }
            }

            if (name) {
                if (isWageWork) {
                    if (!isCash) {
                        workerBalances[name] = (workerBalances[name] || 0) + amount;
                    }
                } else if (isSettlement || isAdvanceTaken) {
                    workerBalances[name] = (workerBalances[name] || 0) - amount;
                } else if (isAdvanceRepayment) {
                    workerBalances[name] = (workerBalances[name] || 0) + Math.abs(amount);
                }
            }
        });

        // Compute Final Balanced Stats
        let totalCredit = 0; // Total Owed to workers (Net Positives)
        Object.values(workerBalances).forEach(bal => {
            if (bal > 0) totalCredit += bal;
        });

        // Global Advances Formula
        const totalAdvances = Math.max(0, totalAdvancesAll - totalRepaymentsAll);
        const avgCost = totalWorkersCount > 0 ? (totalCost / totalWorkersCount) : 0;
        
        // Final cash outflow
        const totalCashPaidOverall = totalSettlementsAndAdvancesDelta;

        return { 
            totalCost, 
            totalWorkersCount, 
            averageCost: avgCost, 
            totalCash: totalCashWork, 
            totalCreditDayLabor,
            totalSettlementsAndAdvances: totalCashPaidOverall - totalCashWork,
            totalCredit, 
            totalAdvances,
            totalCashPaidOverall,
            totalWagesOnly,
            totalOperationalOnly
        };
    }, [displayLabor]);

    return (
        <div className="space-y-3 max-w-7xl mx-auto pb-24 animate-page-enter">
            {/* Header with Integrated Merged Filters & Action Buttons */}
            <div className="bg-white dark:bg-neutral-800 p-3 sm:p-4 rounded-2xl border border-neutral-200 dark:border-neutral-700/50 shadow-xs relative overflow-hidden flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-2xl pointer-events-none"></div>

                {/* Left Side: Title & Merged Filter Selectors */}
                <div className="flex items-center gap-2 flex-wrap min-w-0 relative z-10">
                    <div className="p-2 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-xl shrink-0">
                        <UsersIcon className="w-5 h-5" />
                    </div>
                    
                    <h2 className="text-sm sm:text-base font-black text-neutral-800 dark:text-neutral-100 tracking-tight shrink-0">
                        العمالة
                    </h2>

                    {/* Merged Inline Dropdowns */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                    {/* Active Cycle Badge */}
                    {activeCycle && (
                        <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-xs font-black rounded-xl border border-emerald-200/60 dark:border-emerald-800/40 shrink-0">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                            <span>{activeCycle.name}</span>
                        </div>
                    )}

                        {/* Greenhouse Filter: Compact Segmented Switcher (1-tap pill buttons) */}
                        {currentGhs && currentGhs.length > 0 && (
                            <div className="inline-flex items-center p-0.5 bg-neutral-100 dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-700/80 shrink-0">
                                <button
                                    type="button"
                                    onClick={() => setGreenhouseFilter('all')}
                                    className={`px-2.5 py-1 rounded-lg text-xs font-black transition-all whitespace-nowrap cursor-pointer ${
                                        greenhouseFilter === 'all'
                                            ? 'bg-white dark:bg-neutral-800 text-amber-600 dark:text-amber-400 shadow-xs'
                                            : 'text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'
                                    }`}
                                >
                                    الكل
                                </button>
                                {currentGhs.map(gh => {
                                    const isActive = greenhouseFilter === gh.id;
                                    const icon = gh.type === 'mine' ? '🌿' : '🏠';
                                    return (
                                        <button
                                            key={gh.id}
                                            type="button"
                                            onClick={() => setGreenhouseFilter(gh.id)}
                                            className={`px-2.5 py-1 rounded-lg text-xs font-black transition-all flex items-center gap-1 whitespace-nowrap cursor-pointer ${
                                                isActive
                                                    ? 'bg-white dark:bg-neutral-800 text-amber-600 dark:text-amber-400 shadow-xs'
                                                    : 'text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'
                                            }`}
                                        >
                                            <span>{icon}</span>
                                            <span>{gh.name}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Side: Action Trigger Buttons (Stats Modal Trigger + Settings) */}
                <div className="flex items-center gap-2 relative z-10 shrink-0 self-end sm:self-auto">
                    {/* Stats Trigger Button */}
                    <button
                        onClick={() => setIsStatsModalOpen(true)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 rounded-xl text-xs font-black transition-all border border-amber-500/20 active:scale-95 cursor-pointer shadow-2xs"
                        title="عرض الإحصائيات والملخص المالي"
                    >
                        <ChartPieIcon className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                        <span>الملخص المالي</span>
                    </button>

                    {/* Settings Button */}
                    <button
                        onClick={() => setIsSettingsModalOpen(true)}
                        className="flex items-center justify-center p-2 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-900 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-300 rounded-xl transition-all border border-neutral-200 dark:border-neutral-700 cursor-pointer shadow-2xs"
                        title="إعدادات وتخصيص دفتر العمالة"
                    >
                        <SettingsIcon className="w-4 h-4 text-neutral-500" />
                    </button>
                </div>
            </div>

            {/* iOS-Style Segmented Control for View Tabs */}
            <div className="bg-neutral-200/60 dark:bg-neutral-900 p-1 rounded-2xl border border-neutral-200/80 dark:border-neutral-800 shadow-inner grid grid-cols-3 gap-1">
                <button
                    type="button"
                    onClick={() => setActiveTab('ledger')}
                    className={`flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl font-black text-xs sm:text-sm transition-all cursor-pointer ${
                        activeTab === 'ledger'
                            ? 'bg-white dark:bg-neutral-800 text-amber-600 dark:text-amber-400 shadow-xs border border-neutral-200/50 dark:border-neutral-700/50'
                            : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200'
                    }`}
                >
                    <CalendarIcon className="w-4 h-4" />
                    <span>كشف اليوميات</span>
                </button>

                <button
                    type="button"
                    onClick={() => setActiveTab('workers')}
                    className={`flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl font-black text-xs sm:text-sm transition-all cursor-pointer ${
                        activeTab === 'workers'
                            ? 'bg-white dark:bg-neutral-800 text-amber-600 dark:text-amber-400 shadow-xs border border-neutral-200/50 dark:border-neutral-700/50'
                            : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200'
                    }`}
                >
                    <UsersIcon className="w-4 h-4" />
                    <span>حسابات العمال</span>
                </button>

                <button
                    type="button"
                    onClick={() => setActiveTab('analysis')}
                    className={`flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl font-black text-xs sm:text-sm transition-all cursor-pointer ${
                        activeTab === 'analysis'
                            ? 'bg-white dark:bg-neutral-800 text-amber-600 dark:text-amber-400 shadow-xs border border-neutral-200/50 dark:border-neutral-700/50'
                            : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200'
                    }`}
                >
                    <ChartPieIcon className="w-4 h-4" />
                    <span>تحليل الأنشطة</span>
                </button>
            </div>

            {/* Content area */}
            <div className="mt-4">
                {activeTab === 'ledger' && <LaborLedger laborExpenses={displayLabor} />}
                {activeTab === 'workers' && (
                    <WorkerAccounts 
                        laborExpenses={allLaborExpenses} 
                        greenhouseFilter={greenhouseFilter}
                        currentGhs={currentGhs}
                    />
                )}
                {activeTab === 'analysis' && <ActivityAnalysis laborExpenses={actualOperatingLaborExpenses} />}
            </div>

            {/* Financial Stats Summary Modal / Bottom Sheet */}
            <Modal
                isOpen={isStatsModalOpen}
                onClose={() => setIsStatsModalOpen(false)}
                title="الملخص والإحصائيات المالية للعمالة"
                size="md"
            >
                <div className="space-y-4 py-1">
                    <div className="grid grid-cols-2 gap-3">
                        {/* 1. Total Day Labor Cost */}
                        <div className="p-3.5 bg-neutral-50 dark:bg-neutral-800/80 rounded-2xl border border-neutral-200/80 dark:border-neutral-700/60 text-center flex flex-col justify-between space-y-1">
                            <span className="text-[10px] sm:text-xs font-black text-neutral-400 dark:text-neutral-400 uppercase tracking-wide">إجمالي تكلفة العمل</span>
                            <div className="flex items-center justify-center gap-1 my-1">
                                <span className="text-xs font-black text-neutral-400">ج.م</span>
                                <span dir="ltr" className="text-base sm:text-lg font-black text-neutral-900 dark:text-neutral-100 font-mono tabular-nums">
                                    {formatNumber(stats.totalCost)}
                                </span>
                            </div>
                            <span className="text-[10px] font-bold text-neutral-400 truncate">
                                {stats.totalWorkersCount} يومية (أجور: {formatNumber(stats.totalWagesOnly)})
                            </span>
                        </div>

                        {/* 2. Outstanding Owed Credits (له) */}
                        <div className="p-3.5 bg-rose-50/50 dark:bg-rose-950/20 rounded-2xl border border-rose-200/60 dark:border-rose-900/40 text-center flex flex-col justify-between space-y-1">
                            <span className="text-[10px] sm:text-xs font-black text-rose-600 dark:text-rose-400 uppercase tracking-wide">مستحقات للعمال (له)</span>
                            <div className="flex items-center justify-center gap-1 my-1">
                                <span className="text-xs font-black text-rose-400">ج.م</span>
                                <span dir="ltr" className="text-base sm:text-lg font-black text-rose-700 dark:text-rose-300 font-mono tabular-nums">
                                    {formatNumber(stats.totalCredit)}
                                </span>
                            </div>
                            <span className="text-[10px] font-bold text-rose-500/80 dark:text-rose-400/80 truncate">
                                يوميات عمل آجلة متبقية
                            </span>
                        </div>

                        {/* 3. Worker Advances (عليه) */}
                        <div className="p-3.5 bg-amber-50/50 dark:bg-amber-950/20 rounded-2xl border border-amber-200/60 dark:border-amber-900/40 text-center flex flex-col justify-between space-y-1">
                            <span className="text-[10px] sm:text-xs font-black text-amber-600 dark:text-amber-400 uppercase tracking-wide">سلفيات وقروض (عليه)</span>
                            <div className="flex items-center justify-center gap-1 my-1">
                                <span className="text-xs font-black text-amber-500">ج.م</span>
                                <span dir="ltr" className="text-base sm:text-lg font-black text-amber-700 dark:text-amber-300 font-mono tabular-nums">
                                    {formatNumber(stats.totalAdvances)}
                                </span>
                            </div>
                            <span className="text-[10px] font-bold text-amber-600/80 dark:text-amber-400/80 truncate">
                                سلف ودفعات مقدمة
                            </span>
                        </div>

                        {/* 4. Total Cash Outflow */}
                        <div className="p-3.5 bg-emerald-50/50 dark:bg-emerald-950/20 rounded-2xl border border-emerald-200/60 dark:border-emerald-900/40 text-center flex flex-col justify-between space-y-1">
                            <span className="text-[10px] sm:text-xs font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-wide">الخارج النقدي الفعلي</span>
                            <div className="flex items-center justify-center gap-1 my-1">
                                <span className="text-xs font-black text-emerald-500">ج.م</span>
                                <span dir="ltr" className="text-base sm:text-lg font-black text-emerald-700 dark:text-emerald-300 font-mono tabular-nums">
                                    {formatNumber(stats.totalCashPaidOverall)}
                                </span>
                            </div>
                            <span className="text-[10px] font-bold text-emerald-600/80 dark:text-emerald-400/80 truncate">
                                كاش + سداد سلفيات
                            </span>
                        </div>
                    </div>

                    <div className="p-3 bg-neutral-100 dark:bg-neutral-800 rounded-xl text-xs text-neutral-600 dark:text-neutral-300 flex items-center justify-between">
                        <span className="font-bold">متوسط سعر اليومية:</span>
                        <span className="font-mono font-black text-neutral-800 dark:text-neutral-100">{formatNumber(stats.averageCost)} ج.م</span>
                    </div>

                    <button
                        onClick={() => setIsStatsModalOpen(false)}
                        className="w-full py-2.5 bg-neutral-200 dark:bg-neutral-700 hover:bg-neutral-300 dark:hover:bg-neutral-600 text-neutral-800 dark:text-neutral-100 font-black text-xs rounded-xl transition-all cursor-pointer"
                    >
                        إغلاق
                    </button>
                </div>
            </Modal>

            <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title={isEn ? "Record Daily Wage & Attendance" : "تسجيل يومية وحضور عمالة"} size="md">
                <UnifiedLaborForm 
                    onClose={() => setIsAddModalOpen(false)} 
                    defaultCycleId={selectedCycleId !== 'all' ? selectedCycleId : undefined} 
                    laborCategories={laborCategories}
                    onManageActivities={() => {
                        setIsAddModalOpen(false);
                        setIsSettingsModalOpen(true);
                    }}
                />
            </Modal>

            <Modal isOpen={isSettingsModalOpen} onClose={() => setIsSettingsModalOpen(false)} title="إعدادات وتخصيص دفتر العمالة" size="sm">
                <LaborActivitiesSettings onClose={() => setIsSettingsModalOpen(false)} />
            </Modal>

            <ExtendedFAB onClick={() => setIsAddModalOpen(true)} label="يومية" />
        </div>
    );
};

export default LaborManager;
