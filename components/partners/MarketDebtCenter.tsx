import React, { useState, useMemo } from 'react';
import StaggerItem from '../shared/StaggerItem';
import { formatNumber } from '../../utils/helpers';
import { ScaleIcon, PlusIcon, PencilIcon, TrashIcon, CheckCircleIcon } from '../Icons';
import type { PartnerDebt, Advance, Invoice, Cycle } from '../../types';

interface MarketDebtCenterProps {
    enrichedDebts: PartnerDebt[];
    individualExternalDebts: Advance[];
    advances: Advance[];
    invoices: Invoice[];
    cycles: Cycle[];
    partnersFinancials: Array<{ id: string; label: string }>;
    activePersons: Array<{ id: string; name: string }>;
    isViewer: boolean;
    onAddDebt: () => void;
    onRepayDebt: (debt: PartnerDebt) => void;
    onEditDebt: (debt: PartnerDebt) => void;
    onDeleteDebt: (debtId: string) => void;
    onToggleTreasuryStatus: (adv: Advance) => void;
    onSettleMerchant: (partnerId: string) => void;
    onEditDraw: (adv: Advance) => void;
    onDeleteDraw: (advId: string, adv: Advance) => void;
}

export const MarketDebtCenter: React.FC<MarketDebtCenterProps> = ({
    enrichedDebts,
    individualExternalDebts,
    advances,
    invoices,
    cycles,
    partnersFinancials,
    activePersons,
    isViewer,
    onAddDebt,
    onRepayDebt,
    onEditDebt,
    onDeleteDebt,
    onToggleTreasuryStatus,
    onSettleMerchant,
    onEditDraw,
    onDeleteDraw
}) => {
    const [activeTab, setActiveTab] = useState<'overview' | 'retained_invoices' | 'debt_records'>('overview');

    // Calculate comprehensive Market & Teacher Debt Summary
    const summary = useMemo(() => {
        // 1. Total Joint Debts
        const jointDebtTotal = (enrichedDebts || []).reduce((sum, d) => sum + (d.total_amount ?? d.totalAmount ?? 0), 0);

        // 2. Retained Invoice Settlements (Double-Entry Non-Cash Repayments)
        const isInvoiceRepayment = (adv: Advance) => 
            Boolean(adv.is_retained_debt) || 
            adv.source_type === 'invoice' || 
            Boolean(adv.source_ref_id) || 
            Boolean(adv.reason?.includes('[INVOICE_REPAYMENT:'));

        const retainedInvoiceRepayments = (advances || []).filter(adv => isInvoiceRepayment(adv));
        const totalRetainedSettled = retainedInvoiceRepayments.reduce((sum, adv) => sum + Math.abs(adv.amount || 0), 0);

        // 3. Cash Repayments
        // a. Joint Debt Cash Repayments
        const jointDebtInvoicePaid = (advances || [])
            .filter(adv => adv.reason?.includes('[PARTNER_DEBT_PAYMENT:'))
            .reduce((sum, adv) => sum + Math.abs(adv.amount || 0), 0);

        const jointDebtTotalPaidInEnriched = (enrichedDebts || []).reduce((sum, d) => {
            const repayments = d.partner_repayments ?? d.partnerRepayments ?? {};
            const paid = Object.values(repayments).reduce((s, v) => s + v, 0);
            return sum + paid;
        }, 0);

        const jointDebtCashPaid = Math.max(0, jointDebtTotalPaidInEnriched - jointDebtInvoicePaid);

        // b. Individual External Debt Cash Repayments
        const individualDebtTotal = (individualExternalDebts || [])
            .filter(adv => (adv.amount || 0) > 0)
            .reduce((sum, adv) => sum + (adv.amount || 0), 0);

        const individualDebtCashPaid = (individualExternalDebts || [])
            .filter(adv => (adv.amount || 0) < 0 && !isInvoiceRepayment(adv))
            .reduce((sum, adv) => sum + Math.abs(adv.amount || 0), 0);

        const totalCashSettled = jointDebtCashPaid + individualDebtCashPaid;

        const grandTotalDebt = jointDebtTotal + individualDebtTotal;
        const grandTotalSettled = totalRetainedSettled + totalCashSettled;
        const remainingDebt = Math.max(0, grandTotalDebt - grandTotalSettled);

        const overallProgress = grandTotalDebt > 0 
            ? Math.min(100, Math.round((grandTotalSettled / grandTotalDebt) * 100))
            : 100;

        const retainedPct = grandTotalDebt > 0 
            ? Math.min(100, (totalRetainedSettled / grandTotalDebt) * 100)
            : 0;

        const cashPct = grandTotalDebt > 0
            ? Math.min(100 - retainedPct, (totalCashSettled / grandTotalDebt) * 100)
            : 0;

        return {
            jointDebtTotal,
            individualDebtTotal,
            grandTotalDebt,
            totalRetainedSettled,
            totalCashSettled,
            grandTotalSettled,
            remainingDebt,
            overallProgress,
            retainedPct,
            cashPct,
            retainedInvoiceRepayments
        };
    }, [enrichedDebts, individualExternalDebts, advances]);

    // Group retained invoice settlements by invoice ID
    const retainedByInvoiceMap = useMemo(() => {
        const map: Record<string, {
            invoice?: Invoice;
            cycleName: string;
            totalAmount: number;
            repayments: Advance[];
        }> = {};

        summary.retainedInvoiceRepayments.forEach(adv => {
            const invId = adv.source_ref_id || (adv.reason?.match(/\[INVOICE_REPAYMENT:([^\]]+)\]/)?.[1] || 'unknown');
            const inv = invoices.find(i => i.id === invId || i._stable_id === invId);
            const cycleName = cycles.find(c => c.id === (inv?.cycle_id || adv.cycle_id))?.name || 'غير محدد';

            if (!map[invId]) {
                map[invId] = {
                    invoice: inv,
                    cycleName,
                    totalAmount: 0,
                    repayments: []
                };
            }
            map[invId].totalAmount += Math.abs(adv.amount || 0);
            map[invId].repayments.push(adv);
        });

        return Object.values(map);
    }, [summary.retainedInvoiceRepayments, invoices, cycles]);

    return (
        <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-5 sm:p-6 flex flex-col space-y-6 shadow-sm">
            {/* Header Title */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-neutral-100 dark:border-neutral-800 font-sans">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-neutral-100 dark:bg-neutral-800 rounded-xl text-neutral-700 dark:text-neutral-300">
                        <ScaleIcon className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className="text-base font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                            مركز إدارة الديون والالتزامات الخارجية
                            <span className="text-2xs bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 font-semibold px-2 py-0.5 rounded-full border border-purple-200/60 dark:border-purple-800/40">
                                External Debts Center
                            </span>
                        </h3>
                        <p className="text-xs text-neutral-500 font-normal mt-0.5">
                            متابعة الديون والالتزامات الخارجية، كشف حساب الجهات الخارجية، والسدادات الآلية المربوطة بفواتير المحاصيل المرصودة
                        </p>
                    </div>
                </div>

                {!isViewer && (
                    <button
                        type="button"
                        onClick={onAddDebt}
                        className="py-2 px-3.5 bg-neutral-900 dark:bg-neutral-100 hover:bg-neutral-800 dark:hover:bg-white text-white dark:text-neutral-900 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors shadow-sm"
                    >
                        <PlusIcon className="w-4 h-4" />
                        <span>إضافة دين خارجي جديد</span>
                    </button>
                )}
            </div>

            {/* VISUAL PROGRESS BAR CARD (شريط التقدم البصري للسداد) */}
            <div className="bg-white dark:bg-neutral-900 rounded-xl p-5 border border-neutral-200 dark:border-neutral-800 space-y-4 font-sans">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2">
                    <div>
                        <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400 block">
                            نسبة تغطية الديون والالتزامات الخارجية
                        </span>
                        <div className="flex items-baseline gap-2 mt-1">
                            <span className="text-2xl sm:text-3xl font-extrabold text-neutral-900 dark:text-white tabular-nums">
                                {summary.overallProgress}%
                            </span>
                            <span className="text-xs text-neutral-500 dark:text-neutral-400">
                                ({formatNumber(summary.grandTotalSettled)} من أصل {formatNumber(summary.grandTotalDebt)} ج.م)
                            </span>
                        </div>
                    </div>
                </div>

                {/* Horizontal Stat Metrics */}
                <div className="grid grid-cols-3 divide-x divide-x-reverse divide-neutral-200 dark:divide-neutral-800 text-center py-3 border-y border-neutral-100 dark:border-neutral-800">
                    <div className="px-2">
                        <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400 block mb-0.5">إجمالي الديون</span>
                        <span className="text-base sm:text-lg font-bold text-neutral-900 dark:text-white tabular-nums">
                            {formatNumber(summary.grandTotalDebt)} <span className="text-2xs font-normal text-neutral-400">ج.م</span>
                        </span>
                    </div>
                    <div className="px-2">
                        <span className="text-xs font-medium text-accent-success dark:text-accent-success block mb-0.5">سداد فواتير مرصودة</span>
                        <span className="text-base sm:text-lg font-bold text-accent-success dark:text-accent-success tabular-nums">
                            {formatNumber(summary.totalRetainedSettled)} <span className="text-2xs font-normal text-neutral-400">ج.م</span>
                        </span>
                    </div>
                    <div className="px-2">
                        <span className="text-xs font-medium text-accent-danger dark:text-accent-danger block mb-0.5">المتبقي المستحق</span>
                        <span className="text-base sm:text-lg font-bold text-accent-danger dark:text-accent-danger tabular-nums">
                            {formatNumber(summary.remainingDebt)} <span className="text-2xs font-normal text-neutral-400">ج.م</span>
                        </span>
                    </div>
                </div>

                {/* MULTI-SEGMENT PROGRESS BAR */}
                <div className="space-y-2">
                    <div className="w-full h-2.5 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden flex gap-0.5">
                        {summary.retainedPct > 0 && (
                            <div 
                                style={{ width: `${summary.retainedPct}%` }}
                                className="h-full bg-accent-success transition-all duration-500"
                                title={`سداد مرصود من الفواتير: ${formatNumber(summary.totalRetainedSettled)} ج.م (${Math.round(summary.retainedPct)}%)`}
                            />
                        )}
                        {summary.cashPct > 0 && (
                            <div 
                                style={{ width: `${summary.cashPct}%` }}
                                className="h-full bg-sky-500 transition-all duration-500"
                                title={`سداد نقدي مباشر: ${formatNumber(summary.totalCashSettled)} ج.م (${Math.round(summary.cashPct)}%)`}
                            />
                        )}
                    </div>

                    {/* Progress Bar Legend */}
                    <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-neutral-500 dark:text-neutral-400">
                        <div className="flex items-center gap-4 flex-wrap">
                            <span className="flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-accent-success" />
                                <span>سداد مرصود من فواتير المحصول: <strong className="font-semibold text-neutral-800 dark:text-neutral-200 tabular-nums">{formatNumber(summary.totalRetainedSettled)} ج.م</strong></span>
                            </span>
                            <span className="flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-sky-500" />
                                <span>سداد نقدي مباشر: <strong className="font-semibold text-neutral-800 dark:text-neutral-200 tabular-nums">{formatNumber(summary.totalCashSettled)} ج.م</strong></span>
                            </span>
                        </div>
                        <span className="flex items-center gap-1 text-accent-danger dark:text-accent-danger font-medium">
                            <span>المتبقي:</span>
                            <strong className="tabular-nums">{formatNumber(summary.remainingDebt)} ج.م</strong>
                        </span>
                    </div>
                </div>
            </div>

            {/* Navigation Filter Tabs */}
            <div className="flex border-b border-neutral-200 dark:border-neutral-800 text-xs font-medium gap-6">
                <button
                    type="button"
                    onClick={() => setActiveTab('overview')}
                    className={`pb-3 border-b-2 transition-all flex items-center gap-2 ${
                        activeTab === 'overview'
                            ? 'border-neutral-900 dark:border-white text-neutral-900 dark:text-white font-bold'
                            : 'border-transparent text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'
                    }`}
                >
                    <span>سجل الديون العامة</span>
                    <span className="bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 px-2 py-0.5 rounded-full text-2xs font-semibold">
                        {enrichedDebts.length + individualExternalDebts.length}
                    </span>
                </button>

                <button
                    type="button"
                    onClick={() => setActiveTab('retained_invoices')}
                    className={`pb-3 border-b-2 transition-all flex items-center gap-2 ${
                        activeTab === 'retained_invoices'
                            ? 'border-neutral-900 dark:border-white text-neutral-900 dark:text-white font-bold'
                            : 'border-transparent text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'
                    }`}
                >
                    <span>الفواتير المرصودة والسدادات الآلية</span>
                    <span className="bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 px-2 py-0.5 rounded-full text-2xs font-semibold">
                        {retainedByInvoiceMap.length}
                    </span>
                </button>
            </div>

            {/* TAB CONTENTS */}
            {activeTab === 'overview' && (
                <div className="space-y-6">
                    {/* 1. Joint Debts */}
                    {enrichedDebts && enrichedDebts.length > 0 && (
                        <div className="space-y-3">
                            <h4 className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 flex items-center gap-1.5 pb-1 border-b border-neutral-100 dark:border-neutral-800">
                                <span className="w-1.5 h-1.5 rounded-full bg-neutral-900 dark:bg-white" />
                                الديون المشتركة الموزعة دفترياً بين الشركاء ({enrichedDebts.length})
                            </h4>
                            {enrichedDebts.map((debt, idx) => {
                                const repayments = debt.partner_repayments ?? debt.partnerRepayments ?? {};
                                const totalPaid = Object.values(repayments).reduce((s, v) => s + v, 0);
                                const totalAmount = debt.total_amount ?? debt.totalAmount ?? 0;
                                const totalRemaining = Math.max(0, totalAmount - totalPaid);
                                const isFullyPaid = totalRemaining <= 0;

                                return (
                                    <StaggerItem key={debt.id} index={idx}>
                                    <div className="p-4 bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 text-xs space-y-3 shadow-sm">
                                        <div className="flex justify-between items-start">
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-2">
                                                    <span className={`w-2 h-2 rounded-full ${isFullyPaid ? 'bg-accent-success' : 'bg-accent-danger'}`} />
                                                    <h4 className="font-bold text-neutral-900 dark:text-white text-sm">{debt.description}</h4>
                                                </div>
                                                <div className="flex items-center gap-2 flex-wrap text-xs">
                                                    <span className="text-neutral-400">التاريخ: {debt.date}</span>
                                                    {debt.entered_treasury ? (
                                                        <span className="bg-accent-success/10 dark:bg-accent-success/20 text-accent-success dark:text-accent-success font-medium px-2 py-0.5 rounded border border-accent-success/20/50 dark:border-accent-success/30 text-2xs">
                                                            دخل الخزنة كاش ({cycles.find(cy => cy.id === debt.cycle_id)?.name || 'المحصول'})
                                                        </span>
                                                    ) : (
                                                        <span className="bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-400 font-medium px-2 py-0.5 rounded border border-sky-200/50 dark:border-sky-800/40 text-2xs">
                                                            دين دفتري (خارج الخزنة)
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            {!isViewer && (
                                                <div className="flex gap-1.5 items-center">
                                                    <button
                                                        onClick={() => onRepayDebt(debt)}
                                                        className="px-2.5 py-1 bg-accent-success/10 hover:bg-accent-success/10 dark:bg-accent-success/20 dark:hover:bg-accent-success/20 text-accent-success dark:text-accent-success border border-accent-success/20/80 dark:border-accent-success/30 rounded-lg text-xs font-semibold transition-colors"
                                                    >
                                                        سداد دفتري
                                                    </button>
                                                    <button
                                                        onClick={() => onEditDebt(debt)}
                                                        className="p-1.5 text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 rounded-lg transition-colors"
                                                    >
                                                        <PencilIcon className="w-3.5 h-3.5" />
                                                    </button>
                                                    <button
                                                        onClick={() => onDeleteDebt(debt.id)}
                                                        className="p-1.5 text-accent-danger hover:text-accent-danger rounded-lg transition-colors"
                                                    >
                                                        <TrashIcon className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            )}
                                        </div>

                                        {/* Financial Totals Row */}
                                        <div className="flex justify-between items-center py-2 px-3.5 bg-neutral-50 dark:bg-neutral-950/50 rounded-lg border border-neutral-100 dark:border-neutral-800/60 text-xs">
                                            <div>
                                                <span className="text-neutral-400 text-2xs block font-medium">الدين المجموع</span>
                                                <span className="text-neutral-900 dark:text-white tabular-nums font-bold">{formatNumber(debt.total_amount ?? debt.totalAmount ?? 0)} ج.م</span>
                                            </div>
                                            <div>
                                                <span className="text-accent-success dark:text-accent-success text-2xs block font-medium">المسدد</span>
                                                <span className="text-accent-success dark:text-accent-success tabular-nums font-bold">{formatNumber(totalPaid)} ج.م</span>
                                            </div>
                                            <div>
                                                <span className="text-accent-danger dark:text-accent-danger text-2xs block font-medium">المتبقي</span>
                                                <span className="text-accent-danger dark:text-accent-danger tabular-nums font-bold">{formatNumber(totalRemaining)} ج.م</span>
                                            </div>
                                        </div>

                                        {/* Partner Allocations */}
                                        <div className="pt-2 border-t border-dashed border-neutral-200 dark:border-neutral-800 space-y-1.5 text-xs">
                                            <span className="text-[11px] font-medium text-neutral-500 block">توزيع الشركاء:</span>
                                            {partnersFinancials.map(p => {
                                                const alloc = (debt.partner_allocations ?? debt.partnerAllocations)?.[p.id] || 0;
                                                const paid = (debt.partner_repayments ?? debt.partnerRepayments)?.[p.id] || 0;
                                                const rem = Math.max(0, alloc - paid);
                                                return (
                                                    <div key={p.id} className="flex justify-between items-center text-xs text-neutral-600 dark:text-neutral-300">
                                                        <span className="font-medium">{p.label}</span>
                                                        <span className="tabular-nums font-medium text-neutral-500 dark:text-neutral-400">
                                                            مخصص: <strong className="text-neutral-900 dark:text-white font-semibold">{formatNumber(alloc)} ج.م</strong>
                                                            <span className="mx-2 text-neutral-300 dark:text-neutral-700">|</span>
                                                            متبقي: <strong className={rem > 0 ? "text-accent-danger dark:text-accent-danger font-bold" : "text-accent-success dark:text-accent-success font-bold"}>{formatNumber(rem)} ج.م</strong>
                                                        </span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                    </StaggerItem>
                                );
                            })}
                        </div>
                    )}

                    {/* 2. Individual Merchant/External Debts */}
                    {individualExternalDebts.length > 0 && (
                        <div className="space-y-3 pt-2">
                            <h4 className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 flex items-center gap-1.5 pb-1 border-b border-neutral-100 dark:border-neutral-800">
                                <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                                ديون الشركاء الشخصية الفردية لجهات خارجية ({individualExternalDebts.length})
                            </h4>
                            {individualExternalDebts.map((adv, idx) => {
                                const partnerLabel = activePersons.find(p => p.id === adv.person_id)?.name || 'شريك مسجل';
                                const isEntered = adv.reason?.includes('[ENTERED_TREASURY]') || 
                                                  (adv.reason?.includes('إيداع') && adv.reason?.includes('خارجية')) ||
                                                  /خزن|خزنة|الخزنة|دخل|إيداع|سيول|كاش|ودخلو|ميسرة من المعلم/.test(adv.reason || '');
                                return (
                                    <StaggerItem key={adv.id} index={idx}>
                                    <div className="p-4 bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 text-xs flex justify-between items-center shadow-sm">
                                        <div className="space-y-1 text-right w-2/3">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className="font-bold text-neutral-900 dark:text-white">الشريك: {partnerLabel}</span>
                                                <span className={isEntered ? "bg-accent-success/10 dark:bg-accent-success/20 text-accent-success dark:text-accent-success text-2xs font-medium px-2 py-0.5 rounded border border-accent-success/20/50 dark:border-accent-success/30" : "bg-accent-warning/10 dark:bg-accent-warning/20 text-accent-warning dark:text-accent-warning text-2xs font-medium px-2 py-0.5 rounded border border-accent-warning/20/50 dark:border-accent-warning/30"}>
                                                    {isEntered ? `دخل الخزنة كاش (${cycles.find(cy => cy.id === adv.cycle_id)?.name || 'المحصول'})` : 'دين دفتري (خارج الخزنة)'}
                                                </span>
                                                <span className="text-2xs text-neutral-400">({adv.date})</span>
                                            </div>
                                            <p className="text-xs text-neutral-500 font-normal">{adv.reason || 'قيد مديونية شخصية لجهة خارجية'}</p>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className="font-bold text-purple-700 dark:text-purple-300 text-sm tabular-nums whitespace-nowrap">
                                                -{formatNumber(adv.amount || 0)} ج.م
                                            </span>
                                            {!isViewer && (
                                                <div className="flex gap-1 items-center">
                                                    <button
                                                        onClick={() => onToggleTreasuryStatus(adv)}
                                                        className={`px-2 py-1 rounded-lg text-xs font-semibold transition-colors ${
                                                            isEntered 
                                                                ? 'bg-accent-warning/10 dark:bg-accent-warning/20 text-accent-warning dark:text-accent-warning border border-accent-warning/20/60 dark:border-accent-warning/30' 
                                                                : 'bg-accent-success/10 dark:bg-accent-success/20 text-accent-success dark:text-accent-success border border-accent-success/20/60 dark:border-accent-success/30'
                                                        }`}
                                                    >
                                                        {isEntered ? 'جعل دفتري' : 'ربطه بالخزنة'}
                                                    </button>
                                                    <button
                                                        onClick={() => onSettleMerchant(adv.person_id)}
                                                        className="px-2.5 py-1 bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200/60 dark:border-purple-800/40 rounded-lg text-xs font-semibold transition-colors"
                                                    >
                                                        تسديد
                                                    </button>
                                                    <button
                                                        onClick={() => onEditDraw(adv)}
                                                        className="p-1 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
                                                    >
                                                        <PencilIcon className="w-3.5 h-3.5" />
                                                    </button>
                                                    <button
                                                        onClick={() => onDeleteDraw(adv.id, adv)}
                                                        className="p-1 text-accent-danger hover:text-accent-danger"
                                                    >
                                                        <TrashIcon className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    </StaggerItem>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* TAB: RETAINED CROP INVOICES (السدادات الآلية من الفواتير المرصودة) */}
            {activeTab === 'retained_invoices' && (
                <div className="space-y-4">
                    <div className="p-3.5 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-300 rounded-xl text-xs leading-relaxed">
                        هذا السجل يعرض جميع سدادات الديون المستقطعة آلياً من فواتير المحصول المرصودة (Double-Entry Audit Log) بدون المساس بالسيولة النقدية للخزينة.
                    </div>

                    {retainedByInvoiceMap.length === 0 ? (
                        <div className="text-center py-12 text-neutral-400 text-xs font-medium">
                            لا توجد فواتير مرصودة مسجلة حالياً
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {retainedByInvoiceMap.map((item, idx) => {
                                const inv = item.invoice;
                                return (
                                    <div key={idx} className="p-4 bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 space-y-3 text-xs shadow-sm">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <span className="font-bold text-neutral-900 dark:text-white text-sm">
                                                        {inv?.market ? `استقطاع فواتير المبيعات: ${inv.market}` : 'فاتورة محصول مرصودة'}
                                                    </span>
                                                    <span className="bg-accent-success/10 dark:bg-accent-success/20 text-accent-success dark:text-accent-success text-2xs font-semibold px-2 py-0.5 rounded border border-accent-success/20/60 dark:border-accent-success/30 flex items-center gap-1">
                                                        <CheckCircleIcon className="w-3 h-3" />
                                                        مرصودة آلياً
                                                    </span>
                                                </div>
                                                <div className="text-xs text-neutral-500 font-normal mt-1 flex items-center gap-3">
                                                    <span>العروة: {item.cycleName}</span>
                                                    <span>•</span>
                                                    <span>التاريخ: {inv?.date || 'غير محدد'}</span>
                                                    {inv?.id && <><span>•</span><span>المعرف: #{inv.id.slice(0, 8)}</span></>}
                                                </div>
                                            </div>

                                            <div className="text-left">
                                                <span className="text-2xs text-neutral-400 font-medium block">إجمالي الخصم المرصود</span>
                                                <span className="text-base font-bold text-accent-success dark:text-accent-success tabular-nums">
                                                    {formatNumber(item.totalAmount)} ج.م
                                                </span>
                                            </div>
                                        </div>

                                        {/* Breakup allocations per partner */}
                                        <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800 space-y-1.5">
                                            <span className="text-xs font-medium text-neutral-500 block">تفاصيل التوزيع على حركات الشركاء:</span>
                                            <div className="divide-y divide-neutral-100 dark:divide-neutral-800 border-t border-b border-neutral-100 dark:border-neutral-800">
                                                {item.repayments.map((adv, aIdx) => {
                                                    const partnerName = activePersons.find(p => p.id === adv.person_id)?.name || adv.personName || 'شريك';
                                                    return (
                                                        <div key={aIdx} className="py-2 flex justify-between items-center text-xs">
                                                            <span className="font-medium text-neutral-700 dark:text-neutral-300">{partnerName}</span>
                                                            <span className="font-bold text-accent-success dark:text-accent-success tabular-nums">
                                                                +{formatNumber(Math.abs(adv.amount || 0))} ج.م
                                                            </span>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
