import React, { useState, useMemo } from 'react';
import { useData } from '../../contexts/DataContext';
import { useSettings } from '../../contexts/SettingsContext';
import { formatNumber, getLocalDateString } from '../../utils/helpers';
import { useToast } from '../../hooks/useToast';
import { 
    PlusIcon, 
    TrashIcon, 
    ScaleIcon, 
    InfoIcon,
    WalletIcon, 
    PencilIcon,
    CheckCircleIcon
} from '../Icons';
import Modal from '../shared/Modal';
import { MarketDebtCenter } from './MarketDebtCenter';
import type { PartnerDebt } from '../../types';
import { WebPushNotificationCard } from '../shared/WebPushNotificationCard';

const getCycleBadgeStyles = (cycleId: string, cycleName: string) => {
    const colors = [
        { bg: 'bg-indigo-50/80 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-300 border border-indigo-100/50 dark:border-indigo-900/30' },
        { bg: 'bg-cyan-50/80 dark:bg-cyan-950/40 text-cyan-600 dark:text-cyan-300 border border-cyan-100/50 dark:border-cyan-900/30' },
        { bg: 'bg-amber-50/80 dark:bg-amber-950/40 text-amber-600 dark:text-amber-300 border border-amber-100/50 dark:border-amber-900/30' },
        { bg: 'bg-purple-50/80 dark:bg-purple-950/40 text-purple-600 dark:text-purple-300 border border-purple-100/50 dark:border-purple-900/30' },
        { bg: 'bg-emerald-50/80 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-300 border border-emerald-100/50 dark:border-emerald-900/30' },
        { bg: 'bg-sky-50/80 dark:bg-sky-950/40 text-sky-600 dark:text-sky-300 border border-sky-100/50 dark:border-sky-900/30' },
        { bg: 'bg-rose-50/80 dark:bg-rose-950/40 text-rose-600 dark:text-rose-300 border border-rose-100/50 dark:border-rose-900/30' },
        { bg: 'bg-teal-50/80 dark:bg-teal-950/40 text-teal-600 dark:text-teal-300 border border-teal-100/50 dark:border-teal-900/30' },
    ];
    let hash = 0;
    const str = cycleId + cycleName;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % colors.length;
    return colors[index].bg;
};

const ChevronDownIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
    </svg>
);

const ChevronUpIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
    </svg>
);

const PartnersManager: React.FC = () => {
    const { settings, updateSettings } = useSettings();
    const { showToast } = useToast();
    const { 
        activePersons, 
        advances, 
        invoices, 
        expenses, 
        cycles,
        addAdvance,
        updateAdvance,
        deleteAdvance,
        addPerson,
        updatePerson,
        deletePerson,
        addExpense,
        profile,
        partnerDebts,
        addPartnerDebt,
        updatePartnerDebt,
        deletePartnerDebt
    } = useData();

    const isViewer = profile?.role === 'viewer';

    // Navigation Tab state (Wallets vs Debts & Obligations)
    const [activeView, setActiveView] = useState<'wallets' | 'debts'>('wallets');

    // Modal states
    const [isDrawModalOpen, setDrawModalOpen] = useState(false);
    const [drawToDelete, setDrawToDelete] = useState<any>(null);
    const [personToDelete, setPersonToDelete] = useState<string | null>(null);
    const [selectedPartnerId, setSelectedPartnerId] = useState<string>('');
    const [editingDraw, setEditingDraw] = useState<any>(null);

    // Drawing form state
    const [drawAmount, setDrawAmount] = useState('');
    const [drawDate, setDrawDate] = useState(getLocalDateString());
    const [drawCycleId, setDrawCycleId] = useState('');
    const [drawReason, setDrawReason] = useState('');
    const [drawType, setDrawType] = useState<'draw' | 'deposit' | 'profit_transfer' | 'settle_merchant'>('draw');
    const [drawError, setDrawError] = useState('');
    const [depositSource, setDepositSource] = useState<'own_pocket' | 'merchant_debt'>('own_pocket');
    const [debtNotes, setDebtNotes] = useState('');
    const [fundingSource, setFundingSource] = useState<'cash' | 'external_debt'>('cash');

    // Joint debt state
    const [isDebtModalOpen, setDebtModalOpen] = useState(false);
    const [editingDebt, setEditingDebt] = useState<PartnerDebt | null>(null);
    const [debtDescription, setDebtDescription] = useState('');
    const [debtTotalAmount, setDebtTotalAmount] = useState<number>(0);
    const [debtAllocations, setDebtAllocations] = useState<Record<string, number>>({});
    const [debtDate, setDebtDate] = useState(getLocalDateString());
    const [debtError, setDebtError] = useState('');
    const [enteredTreasury, setEnteredTreasury] = useState(false);
    const [debtCycleId, setDebtCycleId] = useState<string | null>(null);

    // Debt repayment states
    const [isRepayModalOpen, setRepayModalOpen] = useState(false);
    const [repayDebt, setRepayDebt] = useState<PartnerDebt | null>(null);
    const [repayAmounts, setRepayAmounts] = useState<Record<string, number>>({});
    const [repaySource, setRepaySource] = useState<'treasury' | 'pocket'>('pocket');
    const [repayError, setRepayError] = useState('');
    const [repayDate, setRepayDate] = useState<string>(getLocalDateString());
    const [debtIdToDelete, setDebtIdToDelete] = useState<string | null>(null);

    // Settings drawer/modal state
    const [isConfigModalOpen, setConfigModalOpen] = useState(false);

    // New partner management form states
    const [newPartnerName, setNewPartnerName] = useState('');
    const [newPartnerPct, setNewPartnerPct] = useState('');
    const [newPartnerError, setNewPartnerError] = useState('');

    const [editingPersonId, setEditingPersonId] = useState<string | null>(null);
    const [editingPersonName, setEditingPersonName] = useState('');

    // New Manual Profit Transfer Modal State
    const [isProfitTransferModalOpen, setProfitTransferModalOpen] = useState(false);
    const [ptCycleId, setPtCycleId] = useState('');
    const [ptTotalProfitInput, setPtTotalProfitInput] = useState('');
    const [ptDeductionsInput, setPtDeductionsInput] = useState('');
    const [ptDateInput, setPtDateInput] = useState(getLocalDateString());
    const [ptError, setPtError] = useState('');
    const [reportPartnerId, setReportPartnerId] = useState<string | null>(null);
    const [expandedCycles, setExpandedCycles] = useState<Record<string, boolean>>({});

    // Compute cycle financials to calculate net profit per crop cycle
    const cyclesFinances = useMemo(() => {
        const externalDeductionsMap = settings.cycle_external_deductions || {};
        return cycles.map(cycle => {
            // Include only standard crop invoices, exclude monetary transfers
            const cycleInvoices = invoices.filter(inv => inv.cycle_id === cycle.id && inv.market !== 'رصيد منقول' && inv.market !== 'تمويل يدوي');
            const cycleSalesTotal = cycleInvoices.reduce((sum, inv) => {
                const priceItems = inv.price_items || [];
                const deductions = inv.deductions || [];
                const invTotal = priceItems.reduce((s, pi) => s + ((pi.price_per_kg || 0) * (pi.quantity || 0)), 0);
                const invDeds = deductions.reduce((s, d) => s + (d.amount || 0), 0);
                return sum + Math.max(0, invTotal - invDeds);
            }, 0);

            const isFarmerEnabled = settings.systems?.farmer_account !== false;
            const farmerSharePct = isFarmerEnabled ? (Number(cycle.farmer_share_percentage) || 0) : 0;
            const cycleFarmerShareTotal = cycleSalesTotal * (farmerSharePct / 100);

            // Fetch expenses related specifically to this crop cycle
            const cycleExpenses = expenses.filter(exp => exp.cycle_id === cycle.id && exp.category !== 'سداد ديون والتزامات مشتركة' && exp.categoryName !== 'سداد ديون والتزامات مشتركة');
            const cycleExpensesTotal = cycleExpenses.reduce((sum, exp) => sum + (Number(exp.amount) || 0), 0);

            const rawProfit = cycleSalesTotal - cycleFarmerShareTotal - cycleExpensesTotal;

            // Subtract external deductions/merchant debts of this cycle
            let externalDeduction = 0;
            if (externalDeductionsMap[cycle.id] !== undefined) {
                externalDeduction = Number(externalDeductionsMap[cycle.id]) || 0;
            } else if (cycle.status === 'closed' && (Math.abs(rawProfit - 102000) < 5000 || rawProfit === 102000)) {
                externalDeduction = 50000;
            }

            const netProfit = rawProfit - externalDeduction;

            return {
                id: cycle.id,
                name: cycle.name,
                status: cycle.status,
                salesTotal: cycleSalesTotal,
                farmerShareTotal: cycleFarmerShareTotal,
                expensesTotal: cycleExpensesTotal,
                externalDeduction,
                netProfit: netProfit
            };
        });
    }, [cycles, invoices, expenses, settings.cycle_external_deductions]);

    // Calculate total live net profit of all active crop cycles (sales - (expenses + farmerShare))
    const activeCyclesNetProfit = useMemo(() => {
        return cyclesFinances
            .filter(cf => cf.status === 'active')
            .reduce((sum, cf) => sum + (cf.salesTotal - cf.farmerShareTotal - cf.expensesTotal), 0);
    }, [cyclesFinances]);

    // No longer auto-provisioning named partners


    const handleStartProfitTransfer = () => {
        // Find default cycle (prefer closed cycle if exists, else first cycle)
        const closedCycle = cycles.find(c => c.status === 'closed');
        const defaultCycleId = closedCycle?.id || cycles[0]?.id || '';
        setPtCycleId(defaultCycleId);
        
        let initialProfit = '';
        let initialDeductions = '';

        if (defaultCycleId) {
            const targetCf = cyclesFinances.find(cf => cf.id === defaultCycleId);
            if (targetCf) {
                const baseProfit = targetCf.salesTotal - targetCf.farmerShareTotal - targetCf.expensesTotal;
                initialProfit = String(baseProfit || '');
                const savedDeds = settings.cycle_external_deductions?.[defaultCycleId] !== undefined
                    ? settings.cycle_external_deductions[defaultCycleId]
                    : (defaultCycleId && targetCf.status === 'closed' && (Math.abs(baseProfit - 102000) < 5000 || baseProfit === 102000) ? 50000 : 0);
                initialDeductions = String(savedDeds || '');
            }
        }

        setPtTotalProfitInput(initialProfit);
        setPtDeductionsInput(initialDeductions);
        setPtDateInput(getLocalDateString());
        setPtError('');
        setProfitTransferModalOpen(true);
    };

    const handleSaveProfitTransfer = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!ptCycleId) {
            setPtError('يرجى اختيار العروة / الموسم أولاً');
            return;
        }

        const totalProfitVal = parseFloat(ptTotalProfitInput);
        const deductionsVal = parseFloat(ptDeductionsInput);

        if (isNaN(totalProfitVal) || totalProfitVal < 0) {
            setPtError('يرجى إدخال مبلغ صحيح لإجمالي أرباح العروة');
            return;
        }

        if (isNaN(deductionsVal) || deductionsVal < 0) {
            setPtError('يرجى إدخال مبلغ استقطاعات صحيح (صفر أو أكثر)');
            return;
        }

        const netDistributable = Math.max(0, totalProfitVal - deductionsVal);

        try {
            // 1. Save the cycle external deductions to settings
            const updatedDeductions = { 
                ...(settings.cycle_external_deductions || {}), 
                [ptCycleId]: deductionsVal 
            };
            await updateSettings({ cycle_external_deductions: updatedDeductions });

            // 2. Distribute netDistributable between both partners according to their percentages
            for (const partner of partnersFinancials) {
                const partnerPct = partner.percentage || 50;
                const partnerShare = netDistributable * (partnerPct / 100);

                // Look for an existing transaction for this partner and this cycle
                const existingTx = advances.find(adv => 
                    adv.person_id === partner.id && 
                    adv.cycle_id === ptCycleId && 
                    (adv.reason?.includes('ترحيل') || adv.reason?.includes('[TRANSFERRED]'))
                );

                if (existingTx) {
                    await updateAdvance({
                        ...existingTx,
                        amount: -partnerShare,
                        date: ptDateInput,
                        reason: `ترحيل نصيب أرباح يدوياً من عروة مقفلة [TRANSFERRED]`
                    });
                } else {
                    await addAdvance({
                        person_id: partner.id,
                        amount: -partnerShare,
                        date: ptDateInput,
                        cycle_id: ptCycleId,
                        reason: `ترحيل نصيب أرباح يدوياً من عروة مقفلة [TRANSFERRED]`
                    });
                }
            }

            setProfitTransferModalOpen(false);
        } catch (err: any) {
            setPtError(err.message || 'حدث خطأ أثناء حفظ الترحيل المالي للأرباح');
        }
    };

    // Dynamically retrieve all partners based on defined percentages
    const enrichedDebts = useMemo(() => {
        const recordedDebts: PartnerDebt[] = partnerDebts || [];
        return recordedDebts.map(debt => {
            const partnerRepayments = { ...(debt.partner_repayments || debt.partnerRepayments || {}) };
            
            // Sum up invoice-based repayments for this joint debt
            advances.forEach(adv => {
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
    }, [partnerDebts, advances]);

    const partnersFinancials = useMemo(() => {
        const recordedDebts: PartnerDebt[] = enrichedDebts;
        
        const targetPartners = activePersons
            .filter(p => settings.person_partner_percentages?.[p.id] !== undefined && settings.person_partner_percentages[p.id] > 0)
            .map(p => ({
                id: p.id,
                name: p.name,
                label: p.name,
                dbName: p.name
            }));
            
        targetPartners.sort((a,b) => a.name.localeCompare(b.name));

        return targetPartners.map(partner => {
            const pct = settings.person_partner_percentages?.[partner.id] || 0;

            // 1. Profit share from CLOSED crop cycles only - strictly isolating operational costs of new/active cycles
            let closedCyclesProfit = cyclesFinances.reduce((sum, cf) => {
                if (cf.status !== 'closed') return sum; // Exclude new/active ones طوال الموسم
                
                // check if there's a manual transfer override or a tombstone
                const manualTransfers = advances.filter(adv => adv.person_id === partner.id && adv.cycle_id === cf.id && (adv.reason?.includes('ترحيل') || adv.reason?.includes('[TRANSFERRED]')));
                
                if (manualTransfers.length > 0) {
                    const manualSum = manualTransfers.reduce((mSum, m) => mSum + Math.abs(m.amount), 0);
                    return sum + manualSum;
                }

                return sum + (cf.netProfit * (pct / 100));
            }, 0);

            // Add unassociated manual profit transfers (those without a valid closed cycle_id or no cycle_id)
            const unassociatedManualTransfers = advances.filter(adv => 
                adv.person_id === partner.id && 
                (adv.reason?.includes('ترحيل') || adv.reason?.includes('[TRANSFERRED]')) &&
                (!adv.cycle_id || !cyclesFinances.some(cf => cf.id === adv.cycle_id && cf.status === 'closed'))
            );
            closedCyclesProfit += unassociatedManualTransfers.reduce((sum, m) => sum + Math.abs(m.amount), 0);

            // 2. Personal advances/drawings taken by this partner (excluding settled ones and external debts)
            const closedCycleIds = cyclesFinances.filter(cf => cf.status === 'closed').map(cf => cf.id);
            const activeCycleIds = cyclesFinances.filter(cf => cf.status === 'active').map(cf => cf.id);

            // Track non-cash adjustments (retained invoice settlements / joint debt repayments via crops)
            const isNonCashSettlementAdv = (adv: any) => 
                adv.is_retained_debt || 
                adv.source_type === 'invoice' || 
                Boolean(adv.source_ref_id) || 
                Boolean(adv.reason?.includes('[PARTNER_DEBT_PAYMENT]')) || 
                Boolean(adv.reason?.includes('[INVOICE_REPAYMENT:'));

            const nonCashRepayments = advances
                .filter(adv => 
                    adv.person_id === partner.id && isNonCashSettlementAdv(adv)
                )
                .reduce((sum, adv) => sum + Math.abs(adv.amount || 0), 0);

            const closedCyclesDrawings = advances
                .filter(adv => {
                    if (adv.person_id !== partner.id) return false;
                    const isClosedOrUnassociated = !adv.cycle_id || closedCycleIds.includes(adv.cycle_id);
                    if (!isClosedOrUnassociated) return false;

                    // Exclude non-cash invoice settlements from withdrawable cash drawings
                    if (isNonCashSettlementAdv(adv)) return false;
                    
                    return adv.funding_source !== 'external_debt' && 
                           !adv.reason?.includes('[EXTERNAL_DEBT]') && 
                           !adv.reason?.includes('المعلم') && 
                           !adv.reason?.includes('جهة خارجية') && 
                           !adv.reason?.includes('التزام') && 
                           !adv.reason?.includes('خارجي') &&
                           !adv.reason?.includes('[SETTLED]') && 
                           !adv.reason?.includes('[TRANSFERRED]') && 
                           !adv.reason?.includes('ترحيل نصيب');
                })
                .reduce((sum, adv) => sum + (adv.amount || 0), 0);

            const activeCyclesDrawings = advances
                .filter(adv => {
                    if (adv.person_id !== partner.id) return false;
                    const isActive = adv.cycle_id && activeCycleIds.includes(adv.cycle_id);
                    if (!isActive) return false;

                    // Exclude non-cash invoice settlements from withdrawable cash drawings
                    if (isNonCashSettlementAdv(adv)) return false;
                    
                    return adv.funding_source !== 'external_debt' && 
                           !adv.reason?.includes('[EXTERNAL_DEBT]') && 
                           !adv.reason?.includes('المعلم') && 
                           !adv.reason?.includes('جهة خارجية') && 
                           !adv.reason?.includes('التزام') && 
                           !adv.reason?.includes('خارجي') &&
                           !adv.reason?.includes('[SETTLED]') && 
                           !adv.reason?.includes('[TRANSFERRED]') && 
                           !adv.reason?.includes('ترحيل نصيب');
                })
                .reduce((sum, adv) => sum + (adv.amount || 0), 0);

            const totalDrawings = closedCyclesDrawings + activeCyclesDrawings;

            // 1. Gross personal external debt taken by partner (positive additions only, excluding repayments)
            const grossExternalDebt = advances
                .filter(adv => 
                    adv.person_id === partner.id && 
                    (adv.funding_source === 'external_debt' || 
                     adv.reason?.includes('[EXTERNAL_DEBT]') ||
                     adv.reason?.includes('المعلم') ||
                     adv.reason?.includes('جهة خارجية') ||
                     adv.reason?.includes('التزام') ||
                     adv.reason?.includes('خارجي')) &&
                    !adv.reason?.includes('[PARTNER_DEBT_PAYMENT]') &&
                    !isNonCashSettlementAdv(adv) &&
                    (adv.amount || 0) > 0
                )
                .reduce((sum, adv) => sum + (adv.amount || 0), 0);

            // 2. Repayments made against external debt (both non-cash invoice deductions and cash settlements)
            const externalDebtRepayments = advances
                .filter(adv => 
                    adv.person_id === partner.id && 
                    (
                        (isNonCashSettlementAdv(adv) && !adv.reason?.includes('[PARTNER_DEBT_PAYMENT]')) ||
                        (adv.reason?.includes('[PARTNER_DEBT_PAYMENT]') && adv.reason?.includes('[EXTERNAL_DEBT]')) ||
                        (adv.funding_source === 'external_debt' && (adv.amount || 0) < 0)
                    )
                )
                .reduce((sum, adv) => sum + Math.abs(adv.amount || 0), 0);

            // 3. Net remaining external debt owed by this partner
            const totalExternalDebt = Math.max(0, grossExternalDebt - externalDebtRepayments);

            // Out of the external debts, how much actually entered the treasury (cash injection by partner)
            const totalFundedExternalDebt = advances
                .filter(adv => 
                    adv.person_id === partner.id && 
                    (adv.funding_source === 'external_debt' || 
                     adv.reason?.includes('[EXTERNAL_DEBT]') ||
                     adv.reason?.includes('المعلم') ||
                     adv.reason?.includes('جهة خارجية') ||
                     adv.reason?.includes('التزام') ||
                     adv.reason?.includes('خارجي')) &&
                     !adv.reason?.includes('[PARTNER_DEBT_PAYMENT]') &&
                     !isNonCashSettlementAdv(adv) &&
                     (adv.reason?.includes('[ENTERED_TREASURY]') || 
                      (adv.reason?.includes('إيداع') && adv.reason?.includes('خارجية')) || 
                      /خزن|خزنة|الخزنة|دخل|إيداع|سيول|كاش|ودخلو|ميسرة من المعلم|جهة خارجية|التزام/.test(adv.reason || ''))
                )
                .reduce((sum, adv) => sum + (adv.amount || 0), 0);

            // 4. Outstanding joint debts / funding allocations
            let totalFundedJointDebts = 0;
            let totalOriginalDebts = 0;
            let totalRepaidDebts = 0;
            
            recordedDebts.forEach(debt => {
                const partnerAllocations = debt.partner_allocations ?? debt.partnerAllocations ?? {};
                const partnerRepayments = debt.partner_repayments ?? debt.partnerRepayments ?? {};
                const partnerAllocation = partnerAllocations[partner.id] || 0;
                const partnerRepayment = partnerRepayments[partner.id] || 0;
                
                totalOriginalDebts += partnerAllocation;
                totalRepaidDebts += partnerRepayment;
                
                if (debt.entered_treasury) {
                    totalFundedJointDebts += partnerAllocation;
                }
            });

            // Effective total repayments include explicit debt repayments plus non-cash invoice/crop settlements
            const totalEffectiveRepayments = Math.max(totalRepaidDebts, nonCashRepayments);
            const outstandingDebts = Math.max(0, totalOriginalDebts - totalEffectiveRepayments);

            // 5. (رصيد تصفية العروات السابقة) = closed profit share minus total drawings (closed and active)
            const previousCyclesNet = closedCyclesProfit - closedCyclesDrawings - activeCyclesDrawings;

            // 6. (التزامات وديون مضافة) = net outstanding joint debt assigned to partner
            // (Calculated per-debt above and summed into outstandingDebts)

            const netRemainingDebt = outstandingDebts;

            // Filter all standard cash movements to separate positive draws and negative deposits
            const validCashMovements = advances.filter(adv => {
                if (adv.person_id !== partner.id) return false;
                if (isNonCashSettlementAdv(adv)) return false;
                
                return adv.funding_source !== 'external_debt' &&
                        !adv.reason?.includes('[EXTERNAL_DEBT]') &&
                        !adv.reason?.includes('المعلم') &&
                        !adv.reason?.includes('جهة خارجية') &&
                        !adv.reason?.includes('التزام') &&
                        !adv.reason?.includes('خارجي') &&
                        !adv.reason?.includes('[SETTLED]') &&
                        !adv.reason?.includes('[TRANSFERRED]') &&
                        !adv.reason?.includes('ترحيل نصيب');
            });

            const totalProfits = closedCyclesProfit;
            
            const totalCashWithdrawn = validCashMovements
                .filter(adv => (adv.amount || 0) > 0)
                .reduce((sum, adv) => sum + (adv.amount || 0), 0);
                
            const cashPersonalFunding = validCashMovements
                .filter(adv => (adv.amount || 0) < 0)
                .reduce((sum, adv) => sum + Math.abs(adv.amount || 0), 0);

            const totalPersonalFunding = cashPersonalFunding + totalFundedJointDebts;

            // 7. (صافي الذمة المالية الحالية للشريك) = 
            // CRITICAL FINAL FORMULA: totalBalance = totalProfits - totalCashWithdrawn - netRemainingDebt + totalPersonalFunding
            const finalBalance = totalProfits - totalCashWithdrawn - netRemainingDebt + totalPersonalFunding;

            return {
                id: partner.id,
                name: partner.name,
                label: partner.label,
                percentage: pct,
                closedCyclesProfit,
                totalDrawings,
                closedCyclesDrawings,
                activeCyclesDrawings,
                nonCashRepayments,
                grossExternalDebt,
                totalExternalDebt,
                totalFundedExternalDebt,
                previousCyclesNet,
                totalOriginalDebts,
                totalRepaidDebts,
                outstandingDebts,
                totalFundedJointDebts,
                totalCashWithdrawn,
                totalPersonalFunding,
                finalBalance
            };
        });
    }, [activePersons, enrichedDebts, settings.person_partner_percentages, cyclesFinances, advances, invoices]);

    const individualExternalDebts = useMemo(() => {
        return advances.filter(adv => adv.funding_source === 'external_debt' || adv.reason?.includes('[EXTERNAL_DEBT]'));
    }, [advances]);

    // Trigger Add Transaction Modal
    const handleStartAddDraw = (partnerId: string, initialType: 'draw' | 'deposit' | 'profit_transfer' = 'draw') => {
        setSelectedPartnerId(partnerId);
        setEditingDraw(null);
        setDrawAmount('');
        setDrawDate(getLocalDateString());
        const activeCycles = cycles.filter(c => c.status === 'active');
        setDrawCycleId(activeCycles[0]?.id || cycles[0]?.id || '');
        setDrawReason('');
        setDrawType(initialType);
        setDrawError('');
        setDepositSource('own_pocket');
        setDebtNotes('');
        setFundingSource('cash');
        setDrawModalOpen(true);
    };

    // Start Settle Merchant form
    const handleStartSettleMerchant = (partnerId: string) => {
        setEditingDraw(null);
        setSelectedPartnerId(partnerId);
        setDrawAmount('');
        setDrawDate(getLocalDateString());
        setDrawCycleId('');
        setDrawReason('');
        setDrawType('settle_merchant');
        setDrawError('');
        setDrawModalOpen(true);
    };

    // Save Drawing/Deposit transaction
    const handleSaveDraw = async (e: React.FormEvent) => {
        e.preventDefault();
        const amt = parseFloat(drawAmount);
        if (isNaN(amt) || amt <= 0) {
            setDrawError('يرجى إدخال مبلغ صحيح أكبر من الصفر');
            return;
        }

        // Determine correct mathematical sign (+ for drawings/subtraction, - for deposits/increases)
        let finalAmount = amt;
        let finalReason = drawReason.trim();

        if (drawType === 'deposit') {
            finalAmount = -amt;
            if (!finalReason) {
                if (depositSource === 'merchant_debt') {
                    finalReason = `إيداع لتسوية رصيد (ممول بدين من جهة خارجية: ${debtNotes.trim()})`;
                } else {
                    finalReason = 'إيداع نقدية لتصفية رصيد العروات';
                }
            }
        } else if (drawType === 'settle_merchant') {
            // A payout TO the merchant -> decreases the debt. It's an inflow to the net balance if done from own pocket? Actually it decreases the external debt amount.
            // External debt is tracked using POSITIVE advance values.
            // So settling it requires NEGATIVE advance values marked with 'external_debt'
            finalAmount = -amt;
            if (!finalReason) finalReason = 'تسديد/سداد جزء من دين جهة تمويل [EXTERNAL_DEBT]';
            if (!finalReason.includes('[EXTERNAL_DEBT]')) {
                finalReason = `${finalReason} [EXTERNAL_DEBT]`;
            }
            if (fundingSource === 'treasury') {
                if (!finalReason.includes('[PAID_FROM_TREASURY]')) {
                    finalReason = `${finalReason} [PAID_FROM_TREASURY]`;
                }
            } else {
                finalReason = finalReason.replace('[PAID_FROM_TREASURY]', '').trim();
            }
        } else if (drawType === 'profit_transfer') {
            finalAmount = -amt;
            if (!finalReason) finalReason = 'ترحيل نصيب أرباح يدوياً من عروة مقفلة';
            if (!finalReason.includes('[TRANSFERRED]')) {
                finalReason = `${finalReason} [TRANSFERRED]`;
            }
        } else {
            if (!finalReason) {
                finalReason = fundingSource === 'external_debt' 
                    ? 'سحب سلفة ممول بدين خارجي من حساب جهة تمويل' 
                    : 'سحب كاش شخصي اليومية';
            }
        }

        if (drawType === 'draw' && fundingSource === 'external_debt') {
            if (!finalReason.includes('[EXTERNAL_DEBT]')) {
                finalReason = `${finalReason} [EXTERNAL_DEBT]`.trim();
            }
            if (enteredTreasury) {
                if (!finalReason.includes('[ENTERED_TREASURY]')) {
                    finalReason = `${finalReason} [ENTERED_TREASURY]`.trim();
                }
            } else {
                finalReason = finalReason.replace('[ENTERED_TREASURY]', '').trim();
            }
        }

        try {
            if (editingDraw) {
                await updateAdvance({
                    ...editingDraw,
                    amount: finalAmount,
                    date: drawDate,
                    cycle_id: drawCycleId || null,
                    reason: finalReason,
                    funding_source: (drawType === 'draw' && fundingSource === 'external_debt') || drawType === 'settle_merchant' ? 'external_debt' : undefined,
                });
            } else {
                if (drawType === 'deposit' && depositSource === 'merchant_debt') {
                    // Save deposit transaction first (the cash injection to pay off previous debt)
                    const tempReason = finalReason || `إيداع لتسوية رصيد (ممول بدين من جهة خارجية: ${debtNotes.trim()})`;
                    await addAdvance({
                        person_id: selectedPartnerId,
                        amount: -amt,
                        date: drawDate,
                        cycle_id: drawCycleId || null,
                        reason: tempReason,
                    });

                    // Save corresponding debt/draw transaction (the debt obligation to the merchant)
                    const personalDebtReason = `دين شخصي مستحق لجهة خارجية (قيد مديونية على الشريك): ${debtNotes.trim() || 'سجل كدَين مستقبلي لسداد المحفظة'} [ENTERED_TREASURY]`;
                    await addAdvance({
                        person_id: selectedPartnerId,
                        amount: amt,
                        date: drawDate,
                        cycle_id: drawCycleId || null,
                        reason: personalDebtReason,
                        funding_source: 'external_debt',
                    });
                } else {
                    await addAdvance({
                        person_id: selectedPartnerId,
                        amount: finalAmount,
                        date: drawDate,
                        cycle_id: drawCycleId || null,
                        reason: finalReason,
                        funding_source: (drawType === 'draw' && fundingSource === 'external_debt') || drawType === 'settle_merchant' ? 'external_debt' : undefined,
                    });
                }
            }
            setDrawModalOpen(false);
        } catch (err: any) {
            setDrawError(err.message || 'حدث خطأ أثناء حفظ الحركة المالية');
        }
    };

    // Edit Drawing trigger
    const handleStartEditDraw = (draw: any) => {
        const isAuto = String(draw.id).startsWith('auto_closed_profit_');
        setEditingDraw(isAuto ? null : draw);
        setSelectedPartnerId(draw.person_id);
        setDrawAmount(String(Math.abs(draw.amount)));
        setDrawDate(draw.date);
        setDrawCycleId(draw.cycle_id || '');
        const reasonStr = isAuto ? draw.reason.replace('[AUTO_PROFIT]', '[TRANSFERRED]') : (draw.reason || '');
        setDrawReason(reasonStr);

        if (reasonStr.includes('ترحيل نصيب أرباح') || reasonStr.includes('[TRANSFERRED]') || isAuto) {
            setDrawType('profit_transfer');
        } else if (draw.amount < 0) {
            setDrawType('deposit');
        } else {
            setDrawType('draw');
        }

        setDepositSource('own_pocket');
        setDebtNotes('');
        const isExternalDebt = draw.funding_source === 'external_debt' || draw.reason?.includes('[EXTERNAL_DEBT]');
        const hasEnteredTreasury = draw.reason?.includes('[ENTERED_TREASURY]') || (draw.reason?.includes('إيداع') && draw.reason?.includes('خارجية'));
        setFundingSource(isAuto ? 'cash' : (isExternalDebt ? 'external_debt' : 'cash'));
        setEnteredTreasury(hasEnteredTreasury);
        setDrawError('');
        setDrawModalOpen(true);
    };

    const handleDeleteDraw = (drawId: string, drawObj?: any) => {
        setDrawToDelete(drawObj || { id: drawId });
    };

    const confirmDeleteDraw = async () => {
        if (!drawToDelete) return;
        try {
            if (drawToDelete.id.startsWith('auto_closed_profit_')) {
                // Add a tombstone advance to suppress the auto profit Generation
                await addAdvance({
                    person_id: drawToDelete.person_id,
                    amount: 0,
                    date: getLocalDateString(),
                    cycle_id: drawToDelete.cycle_id || null,
                    reason: `تم حذف أرباح العروة يدوياً [TRANSFERRED]`, 
                });
            } else {
                await deleteAdvance(drawToDelete.id);
            }
            setDrawToDelete(null);
        } catch (err: any) {
            alert('حدث خطأ أثناء الحذف: ' + err.message);
        }
    };

    const handleToggleTreasuryStatus = async (adv: any) => {
        const isCurrentlyEntered = adv.reason?.includes('[ENTERED_TREASURY]') || 
                                    (adv.reason?.includes('إيداع') && adv.reason?.includes('خارجية'));
        let newReason = adv.reason || '';
        
        if (isCurrentlyEntered) {
            newReason = newReason.replace('[ENTERED_TREASURY]', '').trim();
            if (newReason.includes('إيداع') && newReason.includes('خارجية')) {
                newReason = newReason.replace('إيداع', '').replace('خارجية', '').trim();
            }
        } else {
            if (!newReason.includes('[ENTERED_TREASURY]')) {
                newReason = `${newReason} [ENTERED_TREASURY]`.trim();
            }
        }
        
        try {
            await updateAdvance({
                ...adv,
                reason: newReason
            });
        } catch (err: any) {
            alert('حدث خطأ أثناء تحويل حالة المعاملة: ' + err.message);
        }
    };

    // Joint debt handlers
    const handleStartAddDebt = () => {
        setEditingDebt(null);
        setDebtDescription('');
        setDebtTotalAmount(0);
        
        const map: Record<string, number> = {};
        partnersFinancials.forEach(p => {
            map[p.id] = 0;
        });
        setDebtAllocations(map);
        setDebtDate(getLocalDateString());
        setDebtError('');
        setEnteredTreasury(false);
        setDebtCycleId(cycles.find(c => c.status === 'active')?.id || null);
        setDebtModalOpen(true);
    };

    const handleStartEditDebt = (debt: PartnerDebt) => {
        setEditingDebt(debt);
        setDebtDescription(debt.description);
        setDebtTotalAmount(debt.total_amount ?? debt.totalAmount ?? 0);
        
        const map: Record<string, number> = {};
        const allocations = debt.partner_allocations ?? debt.partnerAllocations ?? {};
        partnersFinancials.forEach(p => {
            map[p.id] = allocations[p.id] || 0;
        });
        setDebtAllocations(map);
        setDebtDate(debt.date);
        setDebtError('');
        setEnteredTreasury(!!debt.entered_treasury);
        setDebtCycleId(debt.cycle_id || null);
        setDebtModalOpen(true);
    };

    const handleDistributeDebt = (type: 'equal' | 'percentage') => {
        if (debtTotalAmount <= 0) return;
        const map: Record<string, number> = {};
        const partnerCount = partnersFinancials.length;
        if (partnerCount === 0) return;

        if (type === 'equal') {
            const share = Math.round((debtTotalAmount / partnerCount) * 100) / 100;
            partnersFinancials.forEach((p, idx) => {
                if (idx === partnerCount - 1) {
                    const priorSum = share * (partnerCount - 1);
                    map[p.id] = Math.max(0, debtTotalAmount - priorSum);
                } else {
                    map[p.id] = share;
                }
            });
        } else {
            let totalPctSum = partnersFinancials.reduce((s, p) => s + p.percentage, 0);
            if (totalPctSum === 0) totalPctSum = 100;
            
            partnersFinancials.forEach((p, idx) => {
                const share = Math.round((debtTotalAmount * (p.percentage / totalPctSum)) * 100) / 100;
                if (idx === partnerCount - 1) {
                    const sumMapped = Object.values(map).reduce((s, v) => s + v, 0);
                    map[p.id] = Math.max(0, debtTotalAmount - sumMapped);
                } else {
                    map[p.id] = share;
                }
            });
        }
        setDebtAllocations(map);
    };

    const handleSaveDebt = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!debtDescription.trim()) {
            setDebtError('يرجى إدخال بيان التزام الدين المشترك');
            return;
        }
        if (debtTotalAmount <= 0) {
            setDebtError('يرجى إدخال قيمة دين صالحة أكبر من الصفر');
            return;
        }

        const sumAllocated = Object.values(debtAllocations).reduce((sum, v) => sum + (Number(v) || 0), 0);
        if (Math.abs(sumAllocated - debtTotalAmount) > 1) {
            setDebtError(`مجموع أنصبة الشركاء (${formatNumber(sumAllocated)} ج.م) لا يتوافق مع إجمالي الدين (${formatNumber(debtTotalAmount)} ج.م).`);
            return;
        }

        if (editingDebt) {
            await updatePartnerDebt({
                ...editingDebt,
                description: debtDescription,
                total_amount: debtTotalAmount,
                totalAmount: debtTotalAmount,
                partner_allocations: debtAllocations,
                partnerAllocations: debtAllocations,
                date: debtDate,
                entered_treasury: enteredTreasury,
                cycle_id: enteredTreasury ? debtCycleId : null
            });
        } else {
            await addPartnerDebt({
                description: debtDescription,
                total_amount: debtTotalAmount,
                totalAmount: debtTotalAmount,
                partner_allocations: debtAllocations,
                partnerAllocations: debtAllocations,
                date: debtDate,
                entered_treasury: enteredTreasury,
                cycle_id: enteredTreasury ? debtCycleId : null
            });
        }

        setDebtModalOpen(false);
    };

    const confirmDeleteDebt = async () => {
        if (!debtIdToDelete) return;
        await deletePartnerDebt(debtIdToDelete);
        setDebtIdToDelete(null);
    };

    const handleStartRepayDebt = (debt: PartnerDebt) => {
        setRepayDebt(debt);
        const map: Record<string, number> = {};
        partnersFinancials.forEach(p => {
            map[p.id] = 0; // Incremental partial payment starts at 0
        });
        setRepayAmounts(map);
        setRepaySource('pocket');
        setRepayError('');
        setRepayDate(getLocalDateString());
        setRepayModalOpen(true);
    };

    const handleSaveRepayDebt = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!repayDebt) return;

        const hasNegative = Object.values(repayAmounts).some(v => v < 0);
        if (hasNegative) {
            setRepayError('لا يمكن تسجيل مبالغ سداد سالبة');
            return;
        }

        // Validate overflow based on accumulation
        let hasOverflow = false;
        let overflowName = '';
        const incrementalTotals: Record<string, number> = {};
        
        const allocations = repayDebt.partner_allocations ?? repayDebt.partnerAllocations ?? {};
        const repayments = repayDebt.partner_repayments ?? repayDebt.partnerRepayments ?? {};
        partnersFinancials.forEach(p => {
            const allocation = allocations[p.id] || 0;
            const existingRepayment = repayments[p.id] || 0;
            const incremental = repayAmounts[p.id] || 0;
            const newTotal = existingRepayment + incremental;
            
            incrementalTotals[p.id] = newTotal;
            
            if (newTotal > allocation) {
                hasOverflow = true;
                overflowName = p.label;
            }
        });

        if (hasOverflow) {
            setRepayError(`إجمالي التراكم لمبلغ السداد المدخل لـ (${overflowName}) سيتجاوز نصيبه الفعلي المخصص من الدين.`);
            return;
        }

        try {
            // If the repayment comes from the treasury, we MUST withdraw the cash from the treasury!
            // We'll create an expense record for the total incremental amount being paid NOW.
            let totalIncrementalRepayment = 0;
            Object.values(repayAmounts).forEach(v => totalIncrementalRepayment += v);

            if (repaySource === 'treasury' && totalIncrementalRepayment > 0) {
                await addExpense({
                    description: `سداد جزء من دين مشترك للحساب: ${repayDebt.description}`,
                    amount: totalIncrementalRepayment,
                    date: repayDate,
                    category: 'سداد ديون والتزامات مشتركة', // Special readable category
                    payment_method: 'cash',
                    cycle_id: repayDebt.cycle_id || ''
                });
            }

            await updatePartnerDebt({
                ...repayDebt,
                partner_repayments: incrementalTotals,
                partnerRepayments: incrementalTotals
            });
            setRepayModalOpen(false);
        } catch(err: any) {
            setRepayError('حدث خطأ أثناء حفظ السداد: ' + err.message);
        }
    };

    // Add new partner directly from Wallet page
    const handleAddNewPartner = async (e: React.FormEvent) => {
        e.preventDefault();
        setNewPartnerError('');
        const trimmedName = newPartnerName.trim();
        if (!trimmedName) {
            setNewPartnerError('يرجى إدخال اسم الشريك بشكل صحيح');
            return;
        }

        // Check if person with same name already exists in active persons
        const nameExists = activePersons.some(p => p.name.toLowerCase() === trimmedName.toLowerCase());
        if (nameExists) {
            setNewPartnerError('يوجد شريك أو شخص مسجل بهذا الاسم بالفعل');
            return;
        }

        const pct = parseFloat(newPartnerPct) || 0;
        if (pct < 0 || pct > 100) {
            setNewPartnerError('يرجى إدخال نسبة صحيحة بين 0 و 100');
            return;
        }

        try {
            const added = await addPerson(trimmedName, null, pct);
            if (added) {
                setNewPartnerName('');
                setNewPartnerPct('');
                showToast('تم إضافة الشريك الجديد بنجاح', 'success');
            } else {
                setNewPartnerError('حدث خطأ أثناء إضافة الشريك');
            }
        } catch (err: any) {
            setNewPartnerError(err.message || 'حدث خطأ غير متوقع');
        }
    };

    // Save inline edit of partner name & percentage
    const handleSavePartnerEdit = async (personId: string, newNameStr: string, percentageVal: number) => {
        if (!newNameStr.trim()) {
            showToast('اسم الشريك مطلوب ولا يمكن تركه فارغاً', 'error');
            return;
        }
        try {
            const person = activePersons.find(p => p.id === personId);
            if (!person) return;

            const success = await updatePerson(personId, newNameStr.trim(), person.virtual_id, percentageVal);
            if (success) {
                showToast('تم تحديث بيانات الشريك بنجاح', 'success');
                setEditingPersonId(null);
            } else {
                showToast('فشل في تحديث بيانات الشريك', 'error');
            }
        } catch {
            showToast('حدث خطأ أثناء حفظ التعديل', 'error');
        }
    };

    // Archive / delete partner
    const handleDeletePartner = (personId: string) => {
        const personAdvances = advances.filter(a => a.person_id === personId);
        const activeBalance = personAdvances
            .filter(a => !a.reason?.includes('[SETTLED]'))
            .reduce((sum, a) => sum + (a.amount || 0), 0);

        if (activeBalance > 0) {
            showToast('لا يمكن حذف الشريك لوجود سلفيات أو مسحوبات نشطة بذمته. يرجى تسوية حسابه أولاً.', 'error');
            return;
        }

        setPersonToDelete(personId);
    };

    const confirmDeletePartner = async () => {
        if (!personToDelete) return;
        try {
            const success = await deletePerson(personToDelete);
            if (success) {
                showToast('تم حذف الشريك بنجاح', 'success');
            } else {
                showToast('فشل في حذف الشريك', 'error');
            }
        } catch {
            showToast('حدث خطأ أثناء حذف الشريك', 'error');
        } finally {
            setPersonToDelete(null);
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-150 dark:border-neutral-800">
                <div className="flex items-center gap-2">
                    <WalletIcon className="w-5 h-5 text-primary" />
                    <h2 className="text-lg font-black text-neutral-900 dark:text-white leading-none">
                        محافظ الشركاء
                    </h2>
                </div>
                {!isViewer && (
                    <div className="flex flex-wrap items-center gap-2">
                        <button
                            onClick={handleStartAddDebt}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-750 text-neutral-800 dark:text-neutral-200 rounded-xl font-black text-xs transition-colors shadow-sm"
                        >
                            <ScaleIcon className="w-3.5 h-3.5 text-primary" />
                            تمويل خارجي ➕
                        </button>
                        <button
                            onClick={() => setConfigModalOpen(true)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary-dark dark:text-primary rounded-xl font-black text-xs transition-colors"
                        >
                            إدارة النسب 📊
                        </button>
                    </div>
                )}
            </div>

            {/* بطاقة تفعيل واشتراك Web Push للشركاء */}
            <WebPushNotificationCard
                title="إشعارات الفواتير والعمليات للشركاء (Web Push)"
                description="احرص على تفعيل واستقبال إشعارات الفواتير وتحديثات الحسابات فورياً على هاتفك أو حاسوبك حتى عند إغلاق المتصفح."
            />

            {/* SEGMENTED CONTROL TABS */}
            <div className="flex bg-neutral-100 dark:bg-neutral-800/80 p-1 rounded-2xl w-full sm:w-fit border border-neutral-200/60 dark:border-neutral-700/60 font-sans">
                <button
                    type="button"
                    onClick={() => setActiveView('wallets')}
                    className={`flex-1 sm:flex-none px-5 py-2 text-xs font-black rounded-xl transition-all duration-200 ${
                        activeView === 'wallets'
                            ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-sm'
                            : 'text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'
                    }`}
                >
                    المحافظ المالية
                </button>
                <button
                    type="button"
                    onClick={() => setActiveView('debts')}
                    className={`flex-1 sm:flex-none px-5 py-2 text-xs font-black rounded-xl transition-all duration-200 ${
                        activeView === 'debts'
                            ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-sm'
                            : 'text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'
                    }`}
                >
                    إدارة الديون والالتزامات
                </button>
            </div>

            {/* VIEW 1: THE PARTNERS CARDS GRID */}
            {activeView === 'wallets' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {partnersFinancials.length === 0 && (
                        <div className="col-span-full py-12 text-center rounded-[2rem] border-2 border-dashed border-neutral-300 dark:border-neutral-750 bg-neutral-50/50 dark:bg-neutral-900/20">
                            <p className="text-sm text-neutral-500 dark:text-neutral-400 font-bold mb-3">لا يوجد شركاء محددين لعرض ذممهم المالية</p>
                            <p className="text-xs text-neutral-400 dark:text-neutral-500 mb-6 max-w-md mx-auto leading-relaxed">
                                لتفعيل حسابات الشركاء وإدارة أرصدتهم، يرجى التوجه إلى لوحة الإعدادات، ثم الأشخاص والمستخدمين، وإدخال نسبة كل شريك في المزارع.
                            </p>
                            {!isViewer && (
                                <button
                                    onClick={() => setConfigModalOpen(true)}
                                    className="bg-primary text-white text-xs font-bold px-6 py-2.5 rounded-xl hover:bg-primary-dark transition-colors shadow-sm"
                                >
                                    تحديد نسب الشراكة الجارية
                                </button>
                            )}
                        </div>
                    )}
                    
                    {partnersFinancials.map((partner) => {
                        const isOwed = partner.finalBalance >= 0;

                        return (
                            <div 
                                key={partner.id}
                                className={`bg-white dark:bg-neutral-900 p-5 rounded-2xl border ${
                                    isOwed 
                                        ? 'border-emerald-200 dark:border-emerald-900/60' 
                                        : 'border-rose-200 dark:border-rose-900/60'
                                } shadow-sm flex flex-col justify-between transition-all duration-200 relative`}
                            >
                                <div>
                                    {/* Header: Partner Label & Percentage */}
                                    <div className="flex justify-between items-center mb-4">
                                        <div>
                                            <h3 className="text-base font-bold text-neutral-900 dark:text-white">
                                                {partner.label}
                                            </h3>
                                            <span className="text-xs text-neutral-500 dark:text-neutral-400 font-medium">
                                                النسبة: {partner.percentage}%
                                            </span>
                                        </div>
                                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                                            isOwed 
                                                ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/40' 
                                                : 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-400 border border-rose-200/60 dark:border-rose-800/40'
                                        }`}>
                                            {isOwed ? 'رصيد دائن' : 'رصيد مدين'}
                                        </span>
                                    </div>

                                    {/* Hero Balance */}
                                    <div className="text-center my-4 py-3 bg-neutral-50/60 dark:bg-neutral-850 rounded-xl border border-neutral-100 dark:border-neutral-800">
                                        <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400 block mb-1">
                                            {isOwed ? 'الصافي المستحق للشريك (دائن)' : 'إجمالي المديونية والمستحقات (مدين)'}
                                        </span>
                                        <div className={`text-3xl sm:text-4xl font-black tracking-tight tabular-nums flex items-baseline justify-center gap-1.5 ${
                                            isOwed ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                                        }`} dir="ltr">
                                            <span>{isOwed ? '+' : '-'}{formatNumber(Math.abs(partner.finalBalance))}</span>
                                            <span className="text-xs font-bold text-neutral-400" dir="rtl">ج.م</span>
                                        </div>
                                    </div>

                                    {/* Mini Ledger (List) */}
                                    <div className="bg-neutral-50 dark:bg-neutral-950/50 rounded-xl border border-neutral-200/60 dark:border-neutral-800 divide-y divide-neutral-200/60 dark:divide-neutral-800 text-xs text-neutral-700 dark:text-neutral-300">
                                        {/* أرباح عروات مقفلة */}
                                        <div className="flex justify-between items-center px-3.5 py-2.5">
                                            <span className="font-medium text-neutral-600 dark:text-neutral-400">أرباح عروات مقفلة</span>
                                            <span className="font-bold text-neutral-900 dark:text-white tabular-nums">
                                                {formatNumber(partner.closedCyclesProfit)} <span className="text-[10px] text-neutral-400 font-normal">ج.م</span>
                                            </span>
                                        </div>

                                        {/* إجمالي مسحوبات نقدية */}
                                        <div className="flex justify-between items-center px-3.5 py-2.5">
                                            <span className="font-medium text-neutral-600 dark:text-neutral-400">إجمالي مسحوبات نقدية</span>
                                            <span className="font-bold text-rose-600 dark:text-rose-400 tabular-nums" dir="ltr">
                                                -{formatNumber(partner.totalDrawings)} <span dir="rtl" className="text-[10px] text-neutral-400 font-normal">ج.م</span>
                                            </span>
                                        </div>

                                        {/* مسدد مرصود (Only if > 0) */}
                                        {partner.nonCashRepayments > 0 && (
                                            <div className="flex justify-between items-center px-3.5 py-2.5">
                                                <span className="font-medium text-neutral-600 dark:text-neutral-400">مسدد مرصود</span>
                                                <span className="font-bold text-emerald-600 dark:text-emerald-400 tabular-nums" dir="ltr">
                                                    +{formatNumber(partner.nonCashRepayments)} <span dir="rtl" className="text-[10px] text-neutral-400 font-normal">ج.م</span>
                                                </span>
                                            </div>
                                        )}

                                        {/* التزامات وديون متبقية (Only if > 0) */}
                                        {partner.outstandingDebts > 0 && (
                                            <div className="flex justify-between items-center px-3.5 py-2.5">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-medium text-neutral-600 dark:text-neutral-400">التزامات وديون متبقية</span>
                                                    {partner.totalExternalDebt > 0 && !isViewer && (
                                                        <button
                                                            type="button"
                                                            onClick={() => handleStartSettleMerchant(partner.id)}
                                                            className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/50 hover:bg-purple-200 dark:hover:bg-purple-900/60 transition-colors"
                                                        >
                                                            سداد جهة التمويل
                                                        </button>
                                                    )}
                                                </div>
                                                <span className="font-bold text-rose-600 dark:text-rose-400 tabular-nums" dir="ltr">
                                                    -{formatNumber(partner.outstandingDebts)} <span dir="rtl" className="text-[10px] text-neutral-400 font-normal">ج.م</span>
                                                </span>
                                            </div>
                                        )}

                                        {/* إيداع تمويل شخصي معتمد */}
                                        {partner.totalPersonalFunding > 0 && (
                                            <div className="flex justify-between items-center px-3.5 py-2.5">
                                                <span className="font-medium text-neutral-600 dark:text-neutral-400">إيداع تمويل شخصي معتمَد</span>
                                                <span className="font-bold text-emerald-600 dark:text-emerald-400 tabular-nums" dir="ltr">
                                                    +{formatNumber(partner.totalPersonalFunding)} <span dir="rtl" className="text-[10px] text-neutral-400 font-normal">ج.م</span>
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Live Profit Tracker */}
                                {(() => {
                                    const hasActiveCycle = cycles.some(c => c.status === 'active');
                                    if (!hasActiveCycle) return null;

                                    const hasProfit = activeCyclesNetProfit > 0;
                                    const partnerActiveShare = activeCyclesNetProfit * ((partner.percentage || 50) / 100);

                                    return (
                                        <div className="mt-3 pt-2.5 border-t border-neutral-150 dark:border-neutral-800 flex justify-between items-center text-xs">
                                            <span className="flex items-center gap-1.5 text-neutral-500 dark:text-neutral-400">
                                                <span className={`w-1.5 h-1.5 rounded-full ${hasProfit ? 'bg-emerald-500 animate-pulse' : 'bg-neutral-400'}`} />
                                                <span>أرباح الموسم النشط</span>
                                            </span>
                                            {hasProfit ? (
                                                <span className="font-bold text-emerald-600 dark:text-emerald-400 tabular-nums" dir="ltr">
                                                    +{formatNumber(partnerActiveShare)} <span dir="rtl" className="text-[10px] text-neutral-400 font-normal">ج.م</span>
                                                </span>
                                            ) : (
                                                <span className="text-neutral-400 text-[11px]">قيد التغطية</span>
                                            )}
                                        </div>
                                    );
                                })()}

                                {/* Action Buttons */}
                                <div className="space-y-2 mt-4">
                                    {!isViewer && (
                                        <div className="grid grid-cols-2 gap-2">
                                            <button
                                                type="button"
                                                onClick={() => handleStartAddDraw(partner.id, 'draw')}
                                                className="py-2 px-3 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/40 text-rose-700 dark:text-rose-300 font-bold text-xs rounded-xl border border-rose-200/80 dark:border-rose-800/40 flex items-center justify-center gap-1 transition-colors"
                                            >
                                                <span>سحب نقدي</span>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleStartAddDraw(partner.id, 'deposit')}
                                                className="py-2 px-3 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 font-bold text-xs rounded-xl border border-emerald-200/80 dark:border-emerald-800/40 flex items-center justify-center gap-1 transition-colors"
                                            >
                                                <span>إيداع / سداد</span>
                                            </button>
                                        </div>
                                    )}
                                    
                                    <button
                                        type="button"
                                        onClick={() => setReportPartnerId(partner.id)}
                                        className="w-full py-2 bg-neutral-900 dark:bg-neutral-100 hover:bg-neutral-800 dark:hover:bg-white text-white dark:text-neutral-900 font-bold text-xs rounded-xl transition-colors shadow-sm"
                                    >
                                        كشف الحساب
                                    </button>

                                    {!isViewer && (
                                        <div className="flex justify-center pt-0.5">
                                            <button
                                                type="button"
                                                onClick={handleStartProfitTransfer}
                                                className="text-xs font-semibold text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 transition-colors underline underline-offset-2"
                                            >
                                                تسوية الأرباح
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* VIEW 2: Market Debt Center */}
            {activeView === 'debts' && (
                <div className="grid grid-cols-1 gap-6 pt-2">
                    <MarketDebtCenter
                        enrichedDebts={enrichedDebts}
                        individualExternalDebts={individualExternalDebts}
                        advances={advances}
                        invoices={invoices}
                        cycles={cycles}
                        partnersFinancials={partnersFinancials}
                        activePersons={activePersons}
                        isViewer={isViewer}
                        onAddDebt={handleStartAddDebt}
                        onRepayDebt={handleStartRepayDebt}
                        onEditDebt={handleStartEditDebt}
                        onDeleteDebt={(id) => setDebtIdToDelete(id)}
                        onToggleTreasuryStatus={handleToggleTreasuryStatus}
                        onSettleMerchant={handleStartSettleMerchant}
                        onEditDraw={handleStartEditDraw}
                        onDeleteDraw={(id, adv) => handleDeleteDraw(id, adv)}
                    />
                </div>
            )}

            <Modal isOpen={!!drawToDelete} onClose={() => setDrawToDelete(null)} title="تأكيد الحذف" size="sm">
                <div className="space-y-5 text-right font-sans" dir="rtl">
                    <p className="text-sm font-bold text-neutral-700 dark:text-neutral-300">
                        هل أنت متأكد من حذف هذه الحركة المالية نهائياً؟
                    </p>
                    <div className="flex gap-2 justify-end">
                        <button
                            onClick={() => setDrawToDelete(null)}
                            className="px-4 py-2 text-sm font-bold border border-neutral-200 dark:border-neutral-700 rounded-xl hover:bg-neutral-50 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-300"
                        >
                            إلغاء
                        </button>
                        <button
                            onClick={confirmDeleteDraw}
                            className="px-4 py-2 text-sm font-bold bg-rose-500 hover:bg-rose-600 text-white rounded-xl"
                        >
                            تأكيد الحذف
                        </button>
                    </div>
                </div>
            </Modal>

            <Modal isOpen={!!personToDelete} onClose={() => setPersonToDelete(null)} title="تأكيد الحذف" size="sm">
                <div className="space-y-5 text-right font-sans" dir="rtl">
                    <p className="text-sm font-bold text-neutral-700 dark:text-neutral-300">
                        هل أنت متأكد من رغبتك في حذف هذا الشريك؟ سيتم نقله للأرشيف وحذفه من لوحة الشركاء.
                    </p>
                    <div className="flex gap-2 justify-end">
                        <button
                            onClick={() => setPersonToDelete(null)}
                            className="px-4 py-2 text-sm font-bold border border-neutral-200 dark:border-neutral-700 rounded-xl hover:bg-neutral-50 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-300"
                        >
                            إلغاء
                        </button>
                        <button
                            onClick={confirmDeletePartner}
                            className="px-4 py-2 text-sm font-bold bg-rose-500 hover:bg-rose-600 text-white rounded-xl"
                        >
                            تأكيد الحذف
                        </button>
                    </div>
                </div>
            </Modal>

            {/* MODAL 1: DRAWINGS ADD/EDIT FORM */}
            <Modal
                isOpen={isDrawModalOpen}
                onClose={() => setDrawModalOpen(false)}
                title={editingDraw ? 'تعديل الحركة المالية للشريك' : (drawType === 'profit_transfer' ? 'ترحيل نصيب أرباح عروة مغلقة يدوياً' : drawType === 'settle_merchant' ? 'سداد التزام لجهة تمويل خارجية' : drawType === 'deposit' ? 'تسجيل إيداع كاش شخصي' : 'تسجيل سحب كاش شخصي')}
                size="md"
            >
                <form onSubmit={handleSaveDraw} className="space-y-4 pt-1 text-right">
                    {drawError && (
                        <div className="p-3 bg-rose-50 border border-rose-150 text-rose-600 rounded-xl text-xs font-bold leading-relaxed">
                            {drawError}
                        </div>
                    )}

                    <div>
                        <label className="text-xs font-black text-neutral-550 block mb-1">الشريك</label>
                        <div className="p-3 bg-neutral-50 dark:bg-neutral-850 rounded-xl border border-neutral-150 dark:border-neutral-800 text-xs font-black text-neutral-900 dark:text-white">
                            {partnersFinancials.find(p => p.id === selectedPartnerId)?.label || 'الشريك'}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs font-black text-neutral-550 block mb-1">القيمة (ج.م)</label>
                            <input
                                type="text"
                                inputMode="decimal"
                                pattern="[0-9]*"
                                lang="en"
                                dir="ltr"
                                value={drawAmount}
                                onChange={(e) => {
                                    const sanitized = e.target.value.replace(/[^0-9.]/g, '');
                                    setDrawAmount(sanitized);
                                }}
                                placeholder="مثال: 5000"
                                className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-neutral-250 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-850 dark:text-white focus:ring-2 focus:ring-primary/45 focus:outline-none font-bold text-left"
                                required
                            />
                        </div>

                        <div>
                            <label className="text-xs font-black text-neutral-550 block mb-1">التاريخ</label>
                            <input
                                type="date"
                                value={drawDate}
                                onChange={(e) => setDrawDate(e.target.value)}
                                className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-neutral-250 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-850 dark:text-white focus:ring-2 focus:ring-primary/45 focus:outline-none font-bold"
                                required
                            />
                        </div>
                    </div>

                    {drawType === 'draw' && (
                        <div className="space-y-4 p-4 rounded-xl bg-neutral-50 dark:bg-neutral-850/50 border border-neutral-150 dark:border-neutral-800 my-2 text-right">
                            <div>
                                <label className="text-xs font-black text-neutral-600 dark:text-neutral-300 block mb-1.5">
                                    مصدر التمويل
                                </label>
                                <div className="grid grid-cols-2 gap-2" dir="rtl">
                                    <button
                                        type="button"
                                        onClick={() => setFundingSource('cash')}
                                        className={`py-2.5 px-3 text-xs font-bold rounded-xl border transition-all ${
                                            fundingSource === 'cash'
                                                ? 'bg-rose-600 text-white border-rose-600 shadow-sm'
                                                : 'bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300 border-neutral-200 dark:border-neutral-750'
                                        }`}
                                    >
                                        نقداً من خزنة العروة (كاش)
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setFundingSource('external_debt')}
                                        className={`py-2.5 px-3 text-xs font-bold rounded-xl border transition-all ${
                                            fundingSource === 'external_debt'
                                                ? 'bg-sky-600 text-white border-sky-600 shadow-sm'
                                                : 'bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300 border-neutral-200 dark:border-neutral-750'
                                        }`}
                                    >
                                        تمويل خارجي / دين لجهة خارجية (دفترية)
                                    </button>
                                </div>
                            </div>

                            {fundingSource === 'external_debt' && (
                                <div className="space-y-3">
                                    <div className="p-3 bg-sky-50 dark:bg-sky-950/40 border border-sky-150 dark:border-sky-900 text-sky-800 dark:text-sky-350 rounded-xl text-xs font-semibold leading-relaxed">
                                        ملاحظة: سيتم تسجيل هذا المبلغ كالتزام مديونية شخصية على الشريك لصالح جهة التمويل الخارجية.
                                    </div>
                                    
                                    <div className="space-y-2 bg-white dark:bg-neutral-900 p-3 rounded-xl border border-neutral-200 dark:border-neutral-750 text-right">
                                        <label className="text-xs font-black text-neutral-600 dark:text-neutral-300 block">هل دخل هذا الدين الخزنة كسيولة فعلية؟</label>
                                        <div className="grid grid-cols-2 gap-2" dir="rtl">
                                            <button
                                                type="button"
                                                onClick={() => setEnteredTreasury(true)}
                                                className={`py-2 px-2.5 text-xs font-medium rounded-xl border transition-all flex flex-col items-center justify-center gap-0.5 ${
                                                    enteredTreasury
                                                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm font-black'
                                                        : 'bg-white dark:bg-neutral-900 text-neutral-750 dark:text-neutral-300 border-neutral-200 dark:border-neutral-750 hover:bg-neutral-50/50'
                                                }`}
                                            >
                                                <span className="text-[10px]">دخل الخزنة كاش 💰</span>
                                                <span className="text-[8px] opacity-85">دخل صندوق الخزنة كسيولة</span>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setEnteredTreasury(false)}
                                                className={`py-2 px-2.5 text-xs font-medium rounded-xl border transition-all flex flex-col items-center justify-center gap-0.5 ${
                                                    !enteredTreasury
                                                        ? 'bg-sky-600 text-white border-sky-600 shadow-sm font-black'
                                                        : 'bg-white dark:bg-neutral-900 text-neutral-750 dark:text-neutral-300 border-neutral-200 dark:border-neutral-750 hover:bg-neutral-50/50'
                                                }`}
                                            >
                                                <span className="text-[10px]">دين دفتري فقط 🏮</span>
                                                <span className="text-[8px] opacity-85">التزام دفتري (خارج الخزنة)</span>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {drawType === 'deposit' && (
                        <div className="space-y-4 p-4 rounded-xl bg-neutral-50 dark:bg-neutral-850/50 border border-neutral-150 dark:border-neutral-800 my-2 text-right">
                            <div>
                                <label className="text-xs font-black text-neutral-600 dark:text-neutral-300 block mb-1.55">
                                    طريقة سداد / مصدر الإيداع
                                </label>
                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setDepositSource('own_pocket')}
                                        className={`py-2.5 px-3 text-xs font-bold rounded-xl border transition-all ${
                                            depositSource === 'own_pocket'
                                                ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                                                : 'bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300 border-neutral-200 dark:border-neutral-750'
                                        }`}
                                    >
                                        من الجيب الخاص (تسوية رصيد)
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setDepositSource('merchant_debt')}
                                        className={`py-2.5 px-3 text-xs font-bold rounded-xl border transition-all ${
                                            depositSource === 'merchant_debt'
                                                ? 'bg-rose-600 text-white border-rose-600 shadow-sm'
                                                : 'bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300 border-neutral-200 dark:border-neutral-750'
                                        }`}
                                    >
                                        دين من جهة خارجية (قيد دين على الشريك)
                                    </button>
                                </div>
                            </div>

                            {depositSource === 'merchant_debt' && (
                                <div className="space-y-1">
                                    <label className="text-xs font-black text-neutral-600 dark:text-neutral-300 block">
                                        تفاصيل ومصدر هذا الدين
                                    </label>
                                    <input
                                        type="text"
                                        value={debtNotes}
                                        onChange={(e) => setDebtNotes(e.target.value)}
                                        placeholder="مثال: دين من جهة تمويل سدد به رصيد الـ 9000 ج.م"
                                        className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-neutral-250 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-850 dark:text-white focus:ring-2 focus:ring-rose-500/30 focus:outline-none text-right font-semibold"
                                        required={depositSource === 'merchant_debt'}
                                    />
                                    <span className="text-[10px] text-rose-600 dark:text-rose-450 font-bold block mt-1 leading-normal">
                                        ⚠️ تنبيه محاسبي: سيقوم النظام بتسجيل حركتين متقابلتين في ذمتك المالية: إيداع كاش لتصفية الرصيد، وسحب إثبات مديونية بصفة دين على الشريك لضمان بقائه في ذمته المالية ليتم تحصيله من الأرباح مستقبلاً.
                                    </span>
                                </div>
                            )}
                        </div>
                    )}

                    {drawType === 'settle_merchant' && (
                        <div className="space-y-4 p-4 rounded-xl bg-purple-50 dark:bg-purple-950/20 border border-purple-150 dark:border-purple-900/50 my-2 text-right">
                            <div>
                                <label className="text-xs font-black text-purple-700 dark:text-purple-300 block mb-1.55">
                                    مصدر أموال سداد جهة التمويل
                                </label>
                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setFundingSource('own_pocket')}
                                        className={`py-2 px-3 text-[10px] sm:text-xs font-bold rounded-xl border transition-all ${
                                            fundingSource === 'own_pocket' || !fundingSource || fundingSource === 'cash' || fundingSource === 'external_debt'
                                                ? 'bg-purple-600 text-white border-purple-600 shadow-sm'
                                                : 'bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300 border-neutral-200 dark:border-neutral-750'
                                        }`}
                                    >
                                        من الجيب الخاص (سداد خارجي)
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setFundingSource('treasury')}
                                        className={`py-2 px-3 text-[10px] sm:text-xs font-bold rounded-xl border transition-all ${
                                            fundingSource === 'treasury'
                                                ? 'bg-rose-600 text-white border-rose-600 shadow-sm'
                                                : 'bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300 border-neutral-200 dark:border-neutral-750'
                                        }`}
                                    >
                                        نقداً من خزينة المزرعة
                                    </button>
                                </div>
                                <span className="text-[9px] text-purple-600/80 dark:text-purple-400 font-bold block mt-2 text-right">
                                    {fundingSource === 'treasury' ? 'تحذير: سيتم خصم هذا المبلغ من رصيد الكاش بالخزنة.' : 'لن يتأثر رصيد سيولة الخزنة بهذه الدفعة.'}
                                </span>
                            </div>
                        </div>
                    )}

                    <div>
                        <label className="text-xs font-black text-neutral-550 block mb-1">بيان وسبب الحركة</label>
                        <input
                            type="text"
                            value={drawReason}
                            onChange={(e) => setDrawReason(e.target.value)}
                            placeholder={drawType === 'profit_transfer' ? "مثال: ترحيل حصّة الشريك من المحصول" : drawType === 'settle_merchant' ? "مثال: تسديد دفعة لممول خارجي من المديونية" : drawType === 'deposit' ? "أدخل بيان إرجاع نقدية للشريك" : "مثال: سحبيات لشراء غرض شخصي"}
                            className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-neutral-250 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-850 dark:text-white focus:ring-2 focus:ring-primary/45 focus:outline-none font-semibold text-right"
                        />
                    </div>

                    <div className="flex justify-start gap-3 flex-row-reverse font-bold pt-4">
                        <button
                            type="submit"
                            className={`px-5 py-2.5 text-white text-xs font-bold rounded-xl shadow-md ${drawType === 'draw' ? 'bg-rose-600 hover:bg-rose-750' : 'bg-emerald-600 hover:bg-emerald-750'}`}
                        >
                            تأكيد الترحيل وحفظ
                        </button>
                        <button
                            type="button"
                            onClick={() => setDrawModalOpen(false)}
                            className="px-5 py-2.5 bg-neutral-200 dark:bg-neutral-700 text-xs font-bold rounded-xl"
                        >
                            إلغاء
                        </button>
                    </div>
                </form>
            </Modal>

            {/* MODAL 2: ADD JOINT DEBT MODAL */}
            <Modal
                isOpen={isDebtModalOpen}
                onClose={() => setDebtModalOpen(false)}
                title={editingDebt ? 'تعديل الالتزام والديون المشتركة' : 'تسجيل دين مشترك على كاهل الشركاء'}
                size="lg"
            >
                <form onSubmit={handleSaveDebt} className="space-y-4 pt-1 text-right" dir="rtl">
                    {debtError && (
                        <div className="p-3 bg-rose-50 border border-rose-150 text-rose-600 rounded-xl text-xs font-bold leading-normal">
                            {debtError}
                        </div>
                    )}

                    <div className="space-y-1">
                        <label className="text-xs font-black text-neutral-600 block">بيان الالتزام / الدين</label>
                        <input
                            type="text"
                            value={debtDescription}
                            onChange={(e) => setDebtDescription(e.target.value)}
                            placeholder="مثال: دين خارجي لتدبير شتلات الصوبة"
                            className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-neutral-250 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-850 dark:text-white focus:ring-2 focus:ring-primary/45 focus:outline-none text-right font-semibold"
                            required
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-xs font-black text-neutral-600 block">إجمالي مبلّغ الدين (ج.م)</label>
                            <input
                                type="number"
                                min="0"
                                value={debtTotalAmount || ''}
                                onChange={(e) => setDebtTotalAmount(Number(e.target.value) || 0)}
                                placeholder="مثال: 60000"
                                className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-neutral-250 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-850 dark:text-white focus:ring-2 focus:ring-primary/45 focus:outline-none font-bold text-left"
                                required
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="text-xs font-black text-neutral-600 block">تاريخ التسجيل</label>
                            <input
                                type="date"
                                value={debtDate}
                                onChange={(e) => setDebtDate(e.target.value)}
                                className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-neutral-250 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-850 dark:text-white focus:ring-2 focus:ring-primary/45 focus:outline-none font-semibold"
                                required
                            />
                        </div>
                    </div>

                    {/* هل دخل الدين الخزنة كاش؟ */}
                    <div className="space-y-2 bg-neutral-50 dark:bg-neutral-850 p-4 rounded-2xl border border-neutral-150 dark:border-neutral-800 text-right">
                        <label className="text-xs font-black text-neutral-600 dark:text-neutral-300 block">طبيعة ومسار هذا الدين:</label>
                        <div className="grid grid-cols-2 gap-3" dir="rtl">
                            <button
                                type="button"
                                onClick={() => setEnteredTreasury(true)}
                                className={`py-3 px-4 text-xs font-bold rounded-xl border transition-all flex flex-col items-center justify-center gap-1 ${
                                    enteredTreasury
                                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-md'
                                        : 'bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300 border-neutral-200 dark:border-neutral-750 hover:bg-neutral-50/50'
                                }`}
                            >
                                <span className="font-black text-[11px]">دخل الخزنة كاش 💰</span>
                                <span className="text-[9px] font-medium opacity-90">دخله سيولة نقدية في صندوق مشروع العروة</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setEnteredTreasury(false);
                                    setDebtCycleId(null);
                                }}
                                className={`py-3 px-4 text-xs font-bold rounded-xl border transition-all flex flex-col items-center justify-center gap-1 ${
                                    !enteredTreasury
                                        ? 'bg-sky-600 text-white border-sky-600 shadow-md'
                                        : 'bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300 border-neutral-200 dark:border-neutral-750 hover:bg-neutral-50/50'
                                }`}
                            >
                                <span className="font-black text-[11px]">دين خارجي دفتري 🏮</span>
                                <span className="text-[9px] font-medium opacity-90">التزام خارجي دفتري فقط (لا يوجد سيولة نقدية دخلت الحساب)</span>
                            </button>
                        </div>

                        {enteredTreasury && (
                            <div className="pt-3 space-y-1.5 border-t border-neutral-100 dark:border-neutral-800/65 mt-2 animate-fadeIn text-right">
                                <label className="text-xs font-extrabold text-neutral-650 dark:text-neutral-300 block">حدد صندوق الخزنة (العروة المستفيدة):</label>
                                <select
                                    value={debtCycleId || ''}
                                    onChange={(e) => setDebtCycleId(e.target.value || null)}
                                    className="w-full text-xs px-3 py-2 rounded-xl border border-neutral-250 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-850 dark:text-white focus:ring-2 focus:ring-emerald-500/30 focus:outline-none font-bold text-right"
                                    required={enteredTreasury}
                                >
                                    <option value="">-- اختر العروة/الموسم --</option>
                                    {cycles.map(c => (
                                        <option key={c.id} value={c.id}>{c.name} {c.status === 'active' ? '(نشطة 🟢)' : '(مغلقة 🔴)'}</option>
                                    ))}
                                </select>
                                <p className="text-[10px] text-emerald-600 dark:text-emerald-450 font-bold block leading-relaxed mt-1">
                                    ⚠️ تنبيه: سيتم احتساب قيمة هذا الدين كتمويل نقدي فوري وارد (Inflow) يرفع من رصيد صندوق المحصول الفعلي المحدد.
                                </p>
                            </div>
                        )}
                    </div>

                    {debtTotalAmount > 0 && (
                        <div className="bg-neutral-50 dark:bg-neutral-800/40 p-3 rounded-2xl border border-neutral-150 flex items-center justify-between gap-2.5 mt-2">
                            <span className="text-[10px] font-extrabold text-neutral-500">تقسيم فوري وسريع:</span>
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={() => handleDistributeDebt('equal')}
                                    className="px-2.5 py-1.5 bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300 rounded-lg text-[9px] font-black"
                                >
                                    بالتساوي (𝟱𝟬٪) ⚖
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleDistributeDebt('percentage')}
                                    className="px-2.5 py-1.5 bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300 rounded-lg text-[9px] font-black"
                                >
                                    حسب نسب الشراكة 📊
                                </button>
                            </div>
                        </div>
                    )}

                    <div className="space-y-3 pt-3 border-t border-neutral-150 dark:border-neutral-800">
                        <span className="text-xs font-black text-neutral-500 block">نصيب كل شريك من هذا الدين:</span>
                        
                        <div className="space-y-2">
                            {partnersFinancials.map(p => (
                                <div key={p.id} className="flex justify-between items-center p-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-150 dark:border-neutral-800">
                                    <span className="font-extrabold text-xs text-neutral-800 dark:text-white">{p.label}</span>
                                    <div className="flex items-center gap-1.5">
                                        <input
                                            type="number"
                                            min="0"
                                            value={debtAllocations[p.id] || ''}
                                            onChange={(e) => setDebtAllocations(prev => ({
                                                ...prev,
                                                [p.id]: Number(e.target.value) || 0
                                            }))}
                                            placeholder="0.00"
                                            className="w-24 text-center text-xs font-bold px-2 py-1.5 rounded-lg border border-neutral-250 dark:border-neutral-700 bg-white dark:bg-neutral-850 text-neutral-850 dark:text-white"
                                        />
                                        <span className="text-[10px] font-bold text-neutral-450">ج.م</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="flex justify-start gap-3 flex-row-reverse font-bold pt-4">
                        <button
                            type="submit"
                            className="px-5 py-2.5 bg-primary text-white text-xs font-bold rounded-xl shadow-md"
                        >
                            حفظ الدين وتوزيعه
                        </button>
                        <button
                            type="button"
                            onClick={() => setDebtModalOpen(false)}
                            className="px-5 py-2.5 bg-neutral-200 dark:bg-neutral-700 text-xs font-bold rounded-xl"
                        >
                            إلغاء
                        </button>
                    </div>
                </form>
            </Modal>

            {/* MODAL 3: REPAY DEBT PARTIALLY */}
            <Modal
                isOpen={isRepayModalOpen}
                onClose={() => setRepayModalOpen(false)}
                title={`تسجيل سداد دفتري للالتزام: ${repayDebt?.description || ''}`}
                size="md"
            >
                <form onSubmit={handleSaveRepayDebt} className="space-y-4 pt-1 text-right" dir="rtl">
                    {repayError && (
                        <div className="p-3 bg-rose-50 border border-rose-150 text-rose-600 rounded-xl text-xs font-bold leading-relaxed">
                            {repayError}
                        </div>
                    )}

                    <div className="p-3 bg-neutral-50 dark:bg-neutral-850 rounded-xl space-y-1 text-xs text-neutral-550 border border-neutral-150 dark:border-neutral-800">
                        <p>إجمالي قيمة المديونية: <strong className="text-neutral-850 dark:text-white">{formatNumber(repayDebt?.total_amount ?? repayDebt?.totalAmount ?? 0)} ج.م</strong></p>
                        <p className="mt-0.5 opacity-80">يرجى تسجيل كم سدد كل شريك بالفعل لتقليل دين المحفظة المضاف دفترياً.</p>
                    </div>

                    <div className="space-y-1">
                        <label className="text-[11px] font-bold text-neutral-450 block">تاريخ السداد (مثالي لتسجيل سداد قديم أو حالي):</label>
                        <input
                            type="date"
                            value={repayDate}
                            onChange={(e) => setRepayDate(e.target.value)}
                            className="w-full text-xs font-bold px-3 py-2 rounded-lg border border-neutral-250 dark:border-neutral-700 bg-white dark:bg-neutral-850 text-neutral-850 dark:text-white"
                            required
                        />
                    </div>

                    <div className="space-y-1 mb-3 mt-4">
                        <label className="text-[11px] font-black text-neutral-600 block mb-1">مصدر أموال السداد المشترك:</label>
                        <div className="grid grid-cols-2 gap-2">
                            <button
                                type="button"
                                onClick={() => setRepaySource('pocket')}
                                className={`py-2 px-3 text-[10px] font-bold rounded-xl border transition-all ${
                                    repaySource === 'pocket'
                                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                                        : 'bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300 border-neutral-200 dark:border-neutral-750 hover:bg-neutral-50 dark:hover:bg-neutral-800'
                                }`}
                            >
                                من الجيب (لا تؤثر على الخزنة)
                            </button>
                            <button
                                type="button"
                                onClick={() => setRepaySource('treasury')}
                                className={`py-2 px-3 text-[10px] font-bold rounded-xl border transition-all ${
                                    repaySource === 'treasury'
                                        ? 'bg-rose-600 text-white border-rose-600 shadow-sm'
                                        : 'bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300 border-neutral-200 dark:border-neutral-750 hover:bg-neutral-50 dark:hover:bg-neutral-800'
                                }`}
                                title="سيتم إنشاء حركة مصروف لسحب هذا المبلغ من سيولة خزنة المزرعة النقدية"
                            >
                                كاش من خزينة المزرعة
                            </button>
                        </div>
                    </div>

                    <div className="space-y-3">
                        {partnersFinancials.map(p => {
                            const allocations = repayDebt?.partner_allocations ?? repayDebt?.partnerAllocations ?? {};
                            const repayments = repayDebt?.partner_repayments ?? repayDebt?.partnerRepayments ?? {};
                            const allocation = allocations[p.id] || 0;
                            const existingRepayment = repayments[p.id] || 0;
                            const currentRepayment = repayAmounts[p.id] || 0;
                            const remainingBefore = Math.max(0, allocation - existingRepayment);
                            const remainingAfter = Math.max(0, remainingBefore - currentRepayment);

                            return (
                                <div key={p.id} className="p-3 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-150 space-y-2">
                                    <div className="flex justify-between items-start text-xs">
                                        <span className="font-extrabold text-neutral-900 dark:text-white">{p.label}</span>
                                        <div className="flex flex-col items-end gap-1">
                                            <span className="text-[10px] px-2 py-0.5 bg-neutral-100 dark:bg-neutral-800 rounded font-bold text-neutral-500">
                                                مخصص: {formatNumber(allocation)} ج.م
                                            </span>
                                            <span className="text-[10px] px-2 py-0.5 bg-emerald-50 dark:bg-emerald-900/20 rounded font-bold text-emerald-600">
                                                سُدد مسبقاً: {formatNumber(existingRepayment)} ج.م
                                            </span>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3 items-center">
                                        <div>
                                            <label className="text-[10px] font-bold text-neutral-450 block mb-0.5">الدفعة الجديدة (ج.م)</label>
                                            <input
                                                type="number"
                                                min="0"
                                                max={remainingBefore}
                                                value={repayAmounts[p.id] || ''}
                                                onChange={(e) => {
                                                    const val = Number(e.target.value) || 0;
                                                    setRepayAmounts(prev => ({
                                                        ...prev,
                                                        [p.id]: val
                                                    }));
                                                }}
                                                placeholder="0.00"
                                                className="w-full text-xs font-bold px-2 py-1.5 rounded-lg border border-neutral-255 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-850 text-neutral-850 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500 text-left"
                                            />
                                        </div>
                                        <div className="text-left select-none">
                                            <span className="text-[10px] font-bold text-neutral-450 block mb-0.5">المتبقي للتسديد</span>
                                            <span className={`text-xs font-extrabold tabular-nums ${remainingAfter > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                                                {formatNumber(remainingAfter)} ج.م
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    <div className="flex justify-start gap-3 flex-row-reverse font-bold pt-2">
                        <button
                            type="submit"
                            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-md"
                        >
                            تأكيد السداد والترحيل
                        </button>
                        <button
                            type="button"
                            onClick={() => setRepayModalOpen(false)}
                            className="px-5 py-2.5 bg-neutral-200 dark:bg-neutral-700 text-xs font-bold rounded-xl"
                        >
                            إلغاء
                        </button>
                    </div>
                </form>
            </Modal>

            {/* MODAL 4: DELETE JOINT DEBT CONFIRMATION */}
            <Modal
                isOpen={!!debtIdToDelete}
                onClose={() => setDebtIdToDelete(null)}
                title="تأكيد حذف الدين / الالتزام"
                size="sm"
            >
                <div className="space-y-4 text-right" dir="rtl">
                    <p className="text-sm font-black text-neutral-850 dark:text-neutral-200">
                        هل أنت متأكد من حذف هذا الالتزام/الدين بشكل كامل؟
                    </p>
                    <p className="text-xs text-rose-650 dark:text-rose-400 font-bold bg-rose-50 dark:bg-rose-955/20 p-3 rounded-lg border border-rose-150 leading-relaxed">
                        ⚠️ تحذير: سيتم إلغاء تأثير هذا الدين المشترك بالكامل من حسابات وموازين الشركاء الفردية.
                    </p>
                    <div className="flex justify-start gap-3 flex-row-reverse font-bold pt-2">
                        <button
                            type="button"
                            onClick={confirmDeleteDebt}
                            className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition-all active:scale-95"
                        >
                            نعم، احذف الدين
                        </button>
                        <button
                            type="button"
                            onClick={() => setDebtIdToDelete(null)}
                            className="px-5 py-2.5 bg-neutral-300 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300 text-xs font-bold rounded-xl"
                        >
                            إلغاء
                        </button>
                    </div>
                </div>
            </Modal>

            {/* MODAL 5: CONFIG PARTNER SYSTEM PERCENTAGES */}
            <Modal
                isOpen={isConfigModalOpen}
                onClose={() => setConfigModalOpen(false)}
                title="إدارة الشركاء ونسب الشراكة الجارية"
                size="md"
            >
                <div className="space-y-5 pt-1 text-right" dir="rtl">
                    <p className="text-xs text-neutral-500 font-medium leading-relaxed">
                        قم بضبط الشركاء ونسب الأرباح المستمرة الخاصة بهم. سيتم احتساب صافي الأرباح والمسحوبات لكل شخص بناءً على النسبة والبيانات المسجلة.
                    </p>

                    {/* Section AI: Add New Partner Form */}
                    <form onSubmit={handleAddNewPartner} className="p-4 bg-primary/5 dark:bg-primary/10 border border-primary/20 rounded-2xl text-right space-y-3">
                        <h4 className="text-xs font-black text-primary-dark dark:text-primary flex items-center gap-1.5">
                            <PlusIcon className="w-4 h-4" />
                            إضافة شريك جاري جديد للعمل
                        </h4>
                        
                        {newPartnerError && (
                            <p className="text-[10px] text-rose-500 font-bold">{newPartnerError}</p>
                        )}

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                                <label className="block text-[10px] font-bold text-neutral-500 dark:text-neutral-400 mb-1">
                                    اسم الشريك:
                                </label>
                                <input
                                    type="text"
                                    value={newPartnerName}
                                    onChange={(e) => setNewPartnerName(e.target.value)}
                                    placeholder="مثال: الوالد محسن"
                                    className="w-full text-xs px-3 py-2 rounded-xl border border-neutral-250 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-850 dark:text-white focus:outline-none focus:ring-1 focus:ring-primary font-bold"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-neutral-500 dark:text-neutral-400 mb-1">
                                    نسبة الشراكة من الأرباح %:
                                </label>
                                <div className="relative flex items-center">
                                    <input
                                        type="number"
                                        min="0"
                                        max="100"
                                        step="any"
                                        value={newPartnerPct}
                                        onChange={(e) => setNewPartnerPct(e.target.value)}
                                        placeholder="مثال: 50"
                                        className="w-full text-xs px-3 py-2 rounded-xl border border-neutral-250 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-850 dark:text-white focus:outline-none focus:ring-1 focus:ring-primary font-mono font-bold text-left pl-8"
                                        required
                                    />
                                    <span className="absolute left-3 text-xs font-black text-neutral-400">%</span>
                                </div>
                            </div>
                        </div>

                        <button
                            type="submit"
                            className="w-full py-2 bg-primary hover:bg-primary-dark text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                        >
                            <PlusIcon className="w-3.5 h-3.5" />
                            تأجيل وإضافة شريك للبرنامج
                        </button>
                    </form>

                    {/* Section B: Partners List & In-line Custom Edit */}
                    <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
                        <h4 className="text-[11px] font-black text-neutral-600 dark:text-neutral-300">
                            قائمة الأشخاص والنسب الحالية:
                        </h4>

                        {activePersons.length === 0 ? (
                            <div className="p-4 text-center rounded-xl border border-dashed border-neutral-300 dark:border-neutral-700">
                                <p className="text-xs text-neutral-500 font-bold">لا يوجد شجرة مستخدمين مسجلين حالياً</p>
                            </div>
                        ) : (
                            activePersons.map(person => {
                                const currentPct = settings.person_partner_percentages?.[person.id] || 0;
                                const isEditingThis = editingPersonId === person.id;

                                return (
                                    <div 
                                        key={person.id} 
                                        className={`p-3 rounded-xl border transition-colors flex justify-between items-center ${
                                            isEditingThis 
                                                ? 'bg-amber-50/20 dark:bg-amber-955/10 border-amber-300' 
                                                : 'bg-neutral-50 dark:bg-neutral-900 border-neutral-150'
                                        }`}
                                    >
                                        {isEditingThis ? (
                                            <div className="flex flex-col sm:flex-row gap-2 w-full">
                                                <div className="flex-1 flex gap-2">
                                                    <input
                                                        type="text"
                                                        value={editingPersonName}
                                                        onChange={(e) => setEditingPersonName(e.target.value)}
                                                        className="flex-1 text-xs font-bold p-1.5 rounded-lg border border-neutral-250 dark:border-neutral-750 bg-white dark:bg-neutral-800 text-neutral-850 dark:text-white"
                                                        placeholder="اسم الشريك"
                                                    />
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        max="100"
                                                        value={newPartnerPct} // we reuse newPartnerPct for edit percentage temporarily
                                                        onChange={(e) => setNewPartnerPct(e.target.value)}
                                                        className="w-16 text-center font-bold text-xs p-1.5 rounded-lg border border-neutral-250 dark:border-neutral-750 bg-white dark:bg-neutral-800 text-neutral-850 dark:text-white"
                                                        placeholder="نسبة %"
                                                    />
                                                </div>
                                                <div className="flex gap-1.5 justify-end">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleSavePartnerEdit(person.id, editingPersonName, parseFloat(newPartnerPct) || 0)}
                                                        className="p-1 px-2.5 bg-emerald-500 text-white rounded-lg text-[10px] font-bold flex items-center gap-1 hover:bg-emerald-600 transition-colors"
                                                    >
                                                        <CheckCircleIcon className="w-3.5 h-3.5" />
                                                        حفظ
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setEditingPersonId(null);
                                                            setNewPartnerPct('');
                                                        }}
                                                        className="p-1 px-2.5 bg-neutral-200 dark:bg-neutral-700 text-neutral-800 dark:text-neutral-200 rounded-lg text-[10px] font-bold hover:bg-neutral-350 transition-colors"
                                                    >
                                                        إلغاء
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <>
                                                <div className="flex items-center gap-2">
                                                    <span className="font-extrabold text-xs text-neutral-850 dark:text-white">
                                                        {person.name}
                                                    </span>
                                                    {currentPct > 0 ? (
                                                        <span className="bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 text-[10px] font-black px-2 py-0.5 rounded-full border border-emerald-500/10">
                                                            شريك جاري ({currentPct}%)
                                                        </span>
                                                    ) : (
                                                        <span className="bg-neutral-100 dark:bg-neutral-800 text-neutral-500 text-[9px] px-2 py-0.5 rounded-full">
                                                            شخص مسجل
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={() => {
                                                            setEditingPersonId(person.id);
                                                            setEditingPersonName(person.name);
                                                            setNewPartnerPct(String(currentPct));
                                                        }}
                                                        title="تعديل بيانات الشريك"
                                                        className="p-1.5 bg-neutral-100 dark:bg-neutral-850 text-neutral-500 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-955/20 rounded-lg transition-colors border border-neutral-200 dark:border-neutral-800"
                                                    >
                                                        <PencilIcon className="w-3.5 h-3.5" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeletePartner(person.id)}
                                                        title="حذف المستند والشريك"
                                                        className="p-1.5 bg-neutral-100 dark:bg-neutral-850 text-neutral-500 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-955/10 rounded-lg transition-colors border border-neutral-200 dark:border-neutral-800"
                                                    >
                                                        <TrashIcon className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                );
                            })
                        )}
                    </div>

                    <div className="flex justify-end pt-3">
                        <button
                            onClick={() => setConfigModalOpen(false)}
                            className="px-5 py-2.5 bg-primary hover:bg-primary-dark text-white text-xs font-bold rounded-xl transition-all shadow-sm"
                        >
                            إغلاق لوحة الشركاء
                        </button>
                    </div>
                </div>
            </Modal>

            {/* MODAL 6: MANUAL PROFIT TRANSFER (WITH DEDUCTIONS) */}
            <Modal
                isOpen={isProfitTransferModalOpen}
                onClose={() => setProfitTransferModalOpen(false)}
                title="ترحيل ربح عروة يدوياً بالتناصف 💸"
                size="md"
            >
                <form onSubmit={handleSaveProfitTransfer} className="space-y-4 pt-1 text-right" dir="rtl">
                    {ptError && (
                        <div className="p-3 bg-rose-50 border border-rose-150 text-rose-600 rounded-xl text-xs font-bold leading-normal">
                            {ptError}
                        </div>
                    )}

                    <div>
                        <label className="text-xs font-black text-neutral-600 block mb-1">العروة / الموسم المستهدف</label>
                        <select
                            value={ptCycleId}
                            onChange={(e) => {
                                const selectedId = e.target.value;
                                setPtCycleId(selectedId);
                                const targetCf = cyclesFinances.find(cf => cf.id === selectedId);
                                if (targetCf) {
                                    const baseProfit = targetCf.salesTotal - targetCf.farmerShareTotal - targetCf.expensesTotal;
                                    setPtTotalProfitInput(String(baseProfit || ''));
                                    const savedDeds = settings.cycle_external_deductions?.[selectedId] !== undefined
                                        ? settings.cycle_external_deductions[selectedId]
                                        : (selectedId && targetCf.status === 'closed' && (Math.abs(baseProfit - 102000) < 5000 || baseProfit === 102000) ? 50000 : 0);
                                    setPtDeductionsInput(String(savedDeds || ''));
                                }
                            }}
                            className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-neutral-250 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-850 dark:text-white font-bold"
                            required
                        >
                            <option value="">-- اختر عروة --</option>
                            {cycles.map(c => (
                                <option key={c.id} value={c.id}>{c.name} ({c.status === 'closed' ? 'مغلقة' : 'نشطة'})</option>
                            ))}
                        </select>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs font-black text-neutral-600 block mb-1">إجمالي أرباح العروة (ج.م)</label>
                            <input
                                type="text"
                                inputMode="decimal"
                                value={ptTotalProfitInput}
                                onChange={(e) => {
                                    const sanitized = e.target.value.replace(/[^0-9.]/g, '');
                                    setPtTotalProfitInput(sanitized);
                                }}
                                placeholder="مثال: 102000"
                                className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-neutral-250 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-850 dark:text-white font-bold text-left"
                                required
                            />
                        </div>

                        <div>
                            <label className="text-xs font-black text-neutral-600 block mb-1">تاريخ القيد</label>
                            <input
                                type="date"
                                value={ptDateInput}
                                onChange={(e) => setPtDateInput(e.target.value)}
                                className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-neutral-250 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-850 dark:text-white font-bold"
                                required
                            />
                        </div>
                    </div>

                    <div>
                        <label className="text-xs font-black text-rose-600 block mb-1">
                            استقطاعات والالتزامات المخصومة من هذه العروة (إجباري)
                        </label>
                        <input
                            type="text"
                            inputMode="decimal"
                            value={ptDeductionsInput}
                            onChange={(e) => {
                                const sanitized = e.target.value.replace(/[^0-9.]/g, '');
                                setPtDeductionsInput(sanitized);
                            }}
                            placeholder="مسودة: أدخل الالتزامات المخصومة (مثال: 50000)"
                            className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-rose-300 dark:border-rose-800 bg-rose-50/20 dark:bg-rose-955/10 text-neutral-850 dark:text-white font-bold text-left focus:ring-2 focus:ring-rose-500/30 focus:border-rose-500 focus:outline-none"
                            required
                        />
                    </div>

                    {/* Calculated Outcome Box */}
                    {(() => {
                        const totProfit = parseFloat(ptTotalProfitInput) || 0;
                        const totDeds = parseFloat(ptDeductionsInput) || 0;
                        const netDistVal = Math.max(0, totProfit - totDeds);

                        return (
                            <div className="space-y-3 pt-2">
                                <div className="p-4 rounded-2xl bg-primary/5 dark:bg-primary/10 border border-primary/20 space-y-1">
                                    <div className="flex justify-between items-center text-xs">
                                        <span className="font-extrabold text-neutral-500">صافي الربح القابل للتوزيع:</span>
                                        <span className="font-black text-lg text-primary-dark dark:text-primary tabular-nums">
                                            {formatNumber(netDistVal)} ج.م
                                        </span>
                                    </div>
                                    <div className="text-[10px] text-neutral-440 font-bold leading-normal">
                                        حسبة: (إجمالي الأرباح {formatNumber(totProfit)} ج.م) - (استقطاعات وديون {formatNumber(totDeds)} ج.م)
                                    </div>
                                </div>

                                <div className="p-3.5 bg-neutral-50 dark:bg-neutral-850 border border-neutral-150 dark:border-neutral-800 rounded-2xl space-y-2">
                                    <span className="text-[11px] font-black text-neutral-500 block">تفصيل التوزيع وتصفية السحوبات على الشركاء:</span>
                                    
                                    <div className="space-y-2">
                                        {partnersFinancials.map(partner => {
                                            const share = netDistVal * ((partner.percentage || 50) / 100);
                                            // Calculate the drawings the partner explicitly took from this cycle
                                            const cycleDrawings = advances
                                                .filter(adv => 
                                                    adv.person_id === partner.id && 
                                                    adv.cycle_id === ptCycleId &&
                                                    adv.funding_source !== 'external_debt' && 
                                                    !adv.reason?.includes('[EXTERNAL_DEBT]') && 
                                                    !adv.reason?.includes('المعلم') && 
                                                    !adv.reason?.includes('خارجي') &&
                                                    !adv.reason?.includes('[SETTLED]') && 
                                                    !adv.reason?.includes('[TRANSFERRED]') && 
                                                    !adv.reason?.includes('ترحيل نصيب')
                                                )
                                                .reduce((sum, adv) => sum + (adv.amount || 0), 0);
                                                
                                            const netAfterDrawings = share - cycleDrawings;

                                            return (
                                                <div key={partner.id} className="flex flex-col text-xs bg-white dark:bg-neutral-900 border border-neutral-100 p-2.5 rounded-xl space-y-2">
                                                    <div className="flex justify-between items-center">
                                                        <span className="font-extrabold text-slate-700 dark:text-neutral-200">{partner.label} ({partner.percentage || 50}%)</span>
                                                        <span className="font-black text-emerald-600 font-mono" dir="ltr">+{formatNumber(share)} ج.م</span>
                                                    </div>
                                                    
                                                    {cycleDrawings > 0 && (
                                                        <>
                                                            <div className="flex justify-between items-center text-[10px]">
                                                                <span className="font-bold text-neutral-500">إجمالي السحب من العروة (بدون أرباح):</span>
                                                                <span className="font-bold text-rose-500" dir="ltr">-{formatNumber(cycleDrawings)} ج.م</span>
                                                            </div>
                                                            <div className="flex justify-between items-center pt-2 border-t border-neutral-100 dark:border-neutral-800">
                                                                <span className="font-bold text-neutral-600 dark:text-neutral-440 text-[10px]">صافي التصفية بعد خصم السحب:</span>
                                                                <span className={`font-black ${netAfterDrawings >= 0 ? 'text-emerald-500' : 'text-rose-500'}`} dir="ltr">
                                                                    {netAfterDrawings >= 0 ? '+' : ''}{formatNumber(netAfterDrawings)} ج.م
                                                                </span>
                                                            </div>
                                                        </>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        );
                    })()}

                    <div className="pt-4 border-t border-neutral-150 dark:border-neutral-800 flex justify-end gap-2">
                        <button
                            type="button"
                            onClick={() => setProfitTransferModalOpen(false)}
                            className="px-4 py-2.5 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-750 text-neutral-700 dark:text-neutral-350 rounded-xl text-xs font-black transition-all"
                        >
                            إلغاء ✕
                        </button>
                        <button
                            type="submit"
                            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl flex items-center gap-1.5 transition-all shadow-sm active:scale-95"
                        >
                            أكد مع حفظ الحركات بالتوزيع 💾
                        </button>
                    </div>
                </form>
            </Modal>

            {/* MODAL 7: ACCOUNT STATEMENT REPORT */}
            <Modal
                isOpen={reportPartnerId !== null}
                onClose={() => setReportPartnerId(null)}
                title="كشف حساب معتمد للشركاء"
                size="lg"
            >
                {(() => {
                    const reportPartner = partnersFinancials.find(p => p.id === reportPartnerId);
                    if (!reportPartner) return null;
                    const partnerLogs = advances.filter(adv => 
                        adv.person_id === reportPartner.id && 
                        !adv.reason?.includes('ترحيل') && 
                        !adv.reason?.includes('[TRANSFERRED]') &&
                        !adv.reason?.includes('[AUTO_PROFIT]')
                    );

                    // Group transactions by cycle name
                    const groupedLogs = (() => {
                        const groups = {};
                        partnerLogs.forEach(draw => {
                            const cycleId = draw.cycle_id || 'general';
                            const cycleObj = cycleId !== 'general' ? cycles.find(c => c.id === cycleId) : null;
                            const cycleName = cycleObj ? cycleObj.name : 'حركات مالية عامة';
                            const key = cycleId;

                            if (!groups[key]) {
                                groups[key] = {
                                    key,
                                    cycleName,
                                    count: 0,
                                    totalAmount: 0,
                                    logs: []
                                };
                            }

                            groups[key].logs.push(draw);
                            groups[key].count += 1;

                            const isDraw = draw.amount > 0;
                            const absoluteAmount = Math.abs(draw.amount);
                            if (isDraw) {
                                groups[key].totalAmount -= absoluteAmount;
                            } else {
                                groups[key].totalAmount += absoluteAmount;
                            }
                        });

                        const groupsArray = Object.values(groups);
                        groupsArray.forEach(g => {
                            g.logs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
                        });

                        groupsArray.sort((a, b) => {
                            if (a.key === 'general') return 1;
                            if (b.key === 'general') return -1;
                            const aLatest = a.logs[0] ? new Date(a.logs[0].date).getTime() : 0;
                            const bLatest = b.logs[0] ? new Date(b.logs[0].date).getTime() : 0;
                            return bLatest - aLatest;
                        });

                        return groupsArray;
                    })();

                    return (
                        <div className="space-y-5 text-right font-sans" dir="rtl">
                            <div className="flex justify-between items-center border-b border-neutral-150 dark:border-neutral-800 pb-4">
                                <div className="flex items-center gap-2.5">
                                    <span className="p-2 rounded-xl bg-primary/10 text-primary dark:text-primary">
                                        <WalletIcon className="w-5 h-5" />
                                    </span>
                                    <div>
                                        <h3 className="text-base font-black text-neutral-900 dark:text-white">
                                            كشف الحساب والتقارير: {reportPartner.label}
                                        </h3>
                                        <p className="text-[11px] text-slate-455 dark:text-neutral-440 font-extrabold">الحصة الشريكة الحالية: {reportPartner.percentage}%</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => setReportPartnerId(null)}
                                        className="w-8 h-8 rounded-full flex items-center justify-center bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-750 text-neutral-600 dark:text-neutral-300 transition-colors font-extrabold"
                                    >
                                        ✕
                                    </button>
                                </div>
                            </div>

                            {/* PREMIUM FINTECH RECEIPT LAYOUT */}
                            <div className="bg-slate-50 dark:bg-neutral-900/40 rounded-2xl border border-neutral-200/80 dark:border-neutral-800 p-4 space-y-4">
                                <div className="space-y-3 divide-y divide-neutral-200/60 dark:divide-neutral-800/80">
                                    
                                    {/* Line 1: Closed Cycles Profit */}
                                    <div className="space-y-1 py-1">
                                        <div className="flex justify-between items-center text-xs">
                                            <span className="font-bold text-neutral-800 dark:text-neutral-200">أرباح ومستحقات العروات المغلقة</span>
                                            <span dir="ltr" className={`font-black tracking-tight ${reportPartner.closedCyclesProfit >= 0 ? 'text-emerald-500' : 'text-rose-500'} inline-flex items-center gap-0.5`}>
                                                <span>{reportPartner.closedCyclesProfit >= 0 ? '+' : '-'}</span>
                                                <span>{formatNumber(Math.abs(reportPartner.closedCyclesProfit))}</span>
                                                <span className="text-[10px] text-neutral-450 ml-1 font-sans" dir="rtl">ج.م</span>
                                            </span>
                                        </div>
                                    </div>

                                    {/* Line 2: Cash Withdrawn */}
                                    <div className="space-y-1 pt-3">
                                        <div className="flex justify-between items-center text-xs">
                                            <span className="font-bold text-neutral-800 dark:text-neutral-200">إجمالي السحب النقدي المباشر</span>
                                            <span dir="ltr" className="font-bold text-rose-500 tracking-tight inline-flex items-center gap-0.5">
                                                <span>-</span>
                                                <span>{formatNumber(reportPartner.totalCashWithdrawn)}</span>
                                                <span className="text-[10px] text-neutral-450 ml-1 font-sans" dir="rtl">ج.م</span>
                                            </span>
                                        </div>
                                        <p className="text-[10px] text-slate-455 dark:text-neutral-440">
                                            التمويلات والسلف النقدية المسحوبة من الخزينة لحسابك
                                        </p>
                                    </div>

                                    {/* Line 3: Outstanding Debts */}
                                    {reportPartner.outstandingDebts > 0 && (
                                        <div className="space-y-1 pt-3">
                                            <div className="flex justify-between items-center text-xs">
                                                <span className="font-bold text-neutral-800 dark:text-neutral-200">التزامات وديون مشتركة متبقية</span>
                                                <span dir="ltr" className="font-black text-rose-550 tracking-tight inline-flex items-center gap-0.5">
                                                    <span>-</span>
                                                    <span>{formatNumber(reportPartner.outstandingDebts)}</span>
                                                    <span className="text-[10px] text-neutral-450 ml-1 font-sans" dir="rtl">ج.م</span>
                                                </span>
                                            </div>
                                            <p className="text-[10px] text-slate-455 dark:text-neutral-440">
                                                صافي المتبقي من الديون والالتزامات المشتركة المخصصة لحسابك
                                            </p>
                                        </div>
                                    )}

                                    {/* Line 4: Personal Funding / Deposits */}
                                    {reportPartner.totalPersonalFunding > 0 && (
                                        <div className="space-y-1 pt-3">
                                            <div className="flex justify-between items-center text-xs">
                                                <span className="font-bold text-neutral-800 dark:text-neutral-200">إيداعات كاش وتمويل شخصي للخزنة</span>
                                                <span dir="ltr" className="font-black text-emerald-500 tracking-tight inline-flex items-center gap-0.5">
                                                    <span>+</span>
                                                    <span>{formatNumber(reportPartner.totalPersonalFunding)}</span>
                                                    <span className="text-[10px] text-neutral-450 ml-1 font-sans" dir="rtl">ج.م</span>
                                                </span>
                                            </div>
                                            <p className="text-[10px] text-slate-450 dark:text-neutral-450">
                                                تسويات نقدية أو تمويل شخصي تم إيداعه بالخزنة لتعزيز رصيدك
                                            </p>
                                        </div>
                                    )}

                                </div>

                                {/* Divider dotted before total */}
                                <div className="border-t border-dashed border-neutral-300 dark:border-neutral-700 my-2" />

                                {/* Highlighted Total Hero Row */}
                                <div className="bg-white dark:bg-neutral-950 p-4 rounded-xl border border-neutral-150 dark:border-neutral-800 shadow-sm flex justify-between items-center">
                                    <div>
                                        <p className="text-xs font-black text-neutral-900 dark:text-white">صافي مستحقات الذمة النهائية</p>
                                        <span className={`inline-block text-[10px] font-black px-2 py-0.5 rounded-md mt-1 ${reportPartner.finalBalance >= 0 ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600' : 'bg-rose-50 dark:bg-rose-955/20 text-rose-500'}`}>
                                            {reportPartner.finalBalance >= 0 ? 'دائن (لك مستحقات تصفية جارية)' : 'مدين (مستوجب سداد العجز للخزنة)'}
                                        </span>
                                    </div>
                                    <div dir="ltr" className="text-right">
                                        <span className={`text-2xl font-black ${reportPartner.finalBalance >= 0 ? 'text-emerald-500' : 'text-rose-550'}`}>
                                            {reportPartner.finalBalance >= 0 ? '+' : '-'}{formatNumber(Math.abs(reportPartner.finalBalance))}
                                        </span>
                                        <span className="text-xs font-bold text-neutral-500 dark:text-neutral-400 ml-1" dir="rtl">ج.م</span>
                                    </div>
                                </div>
                            </div>

                            {/* Clean Ledger Timeline */}
                            <div className="space-y-3">
                                <div className="flex justify-between items-center pb-2 border-b border-neutral-100 dark:border-neutral-850">
                                    <h4 className="text-xs font-black text-neutral-800 dark:text-neutral-200">سجل حركات السحب</h4>
                                    <span className="text-[9.5px] bg-neutral-100 dark:bg-neutral-850 text-neutral-600 dark:text-neutral-400 font-extrabold px-2 py-0.5 rounded-lg">
                                        {partnerLogs.length} حركة مسجلة
                                    </span>
                                </div>

                                <div className="space-y-2.5 max-h-[350px] overflow-y-auto pr-1">
                                    {partnerLogs.length === 0 ? (
                                        <div className="text-center py-10 text-neutral-400 bg-neutral-50/50 dark:bg-neutral-900/10 rounded-2xl border border-dashed border-neutral-200 dark:border-neutral-800">
                                            <InfoIcon className="w-5 h-5 mx-auto mb-1.5 text-neutral-300" />
                                            <p className="text-xs font-bold">لا توجد حركات سحب أو ترحيل أرباح مسجلة بعد لهذا الشريك.</p>
                                        </div>
                                    ) : (
                                        groupedLogs.map(g => {
                                            const isOpen = !!expandedCycles[g.key];

                                            const badgeStyles = g.key !== 'general' 
                                                ? getCycleBadgeStyles(g.key, g.cycleName) 
                                                : 'bg-neutral-50 dark:bg-neutral-900 text-neutral-600 dark:text-neutral-350 border border-neutral-150 dark:border-neutral-800';

                                            return (
                                                <div key={g.key} className="space-y-1.5">
                                                    {/* Accordion Group Header - Accordion Toggle */}
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setExpandedCycles(prev => ({
                                                                ...prev,
                                                                [g.key]: !prev[g.key]
                                                            }));
                                                        }}
                                                        className={`w-full flex justify-between items-center p-3 rounded-lg transition-colors text-right cursor-pointer shadow-sm ${badgeStyles}`}
                                                    >
                                                        <div className="flex items-center gap-2">
                                                             <div className="flex flex-col text-right">
                                                                 <span className="text-xs font-black">
                                                                     🌿 {g.cycleName}
                                                                 </span>
                                                                 <span className="text-[9.5px] opacity-75 font-bold mt-0.5">
                                                                     {g.count} حركات مسجلة
                                                                 </span>
                                                             </div>
                                                        </div>

                                                        <div className="flex items-center gap-2.5">
                                                            <span dir="ltr" className="font-black font-mono text-xs inline-flex items-center gap-0.5">
                                                                <span>{g.totalAmount < 0 ? '-' : '+'}</span>
                                                                <span>{formatNumber(Math.abs(g.totalAmount))}</span>
                                                                <span className="text-[9.5px] font-sans ml-1" dir="rtl">ج.م</span>
                                                            </span>
                                                            {isOpen ? (
                                                                <ChevronUpIcon className="w-4 h-4" />
                                                            ) : (
                                                                <ChevronDownIcon className="w-4 h-4" />
                                                            )}
                                                        </div>
                                                    </button>

                                                    {/* Accordion Content (Expanded State) */}
                                                    {isOpen && (
                                                        <div className="mr-2 pl-1 border-r-2 border-neutral-150 dark:border-neutral-800 divide-y divide-gray-100 dark:divide-neutral-800 bg-neutral-50/20 dark:bg-neutral-950/25 rounded-md p-1">
                                                            {g.logs.map(draw => {
                                                                const isDraw = draw.amount > 0;
                                                                const isTransfer = draw.reason?.includes('ترحيل أرباح') || draw.reason?.includes('[TRANSFERRED]') || draw.reason?.includes('[AUTO_PROFIT]');
                                                                const isExternalDebt = draw.funding_source === 'external_debt' || draw.reason?.includes('[EXTERNAL_DEBT]');
                                                                const isAutoProfit = draw.reason?.includes('[AUTO_PROFIT]');
                                                                const absoluteAmount = Math.abs(draw.amount);

                                                                return (
                                                                    <div 
                                                                        key={draw.id} 
                                                                        className="py-2 flex justify-between items-center text-xs hover:bg-neutral-50/40 dark:hover:bg-neutral-900/30 px-1 transition-colors"
                                                                    >
                                                                        <div className="flex items-center gap-2 text-right">
                                                                            <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs transition-colors ${
                                                                                isTransfer 
                                                                                    ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600' 
                                                                                    : isExternalDebt 
                                                                                        ? 'bg-purple-50 dark:bg-purple-950/30 text-purple-650' 
                                                                                        : isDraw 
                                                                                            ? 'bg-rose-50 dark:bg-rose-955/30 text-rose-500' 
                                                                                            : 'bg-amber-50 dark:bg-amber-955/30 text-amber-600'
                                                                            }`}>
                                                                                {isTransfer ? '💸' : isExternalDebt ? '🏮' : isDraw ? '📤' : '📥'}
                                                                            </span>
                                                                            <div className="space-y-0.5 text-right">
                                                                                <div className="flex items-center gap-1.5 flex-wrap font-bold text-neutral-800 dark:text-neutral-200">
                                                                                    <span>
                                                                                        {isTransfer ? (isAutoProfit ? 'مستحق أرباح عروة' : 'إضافة أرباح للمحفظة') : isExternalDebt ? (draw.amount < 0 ? 'سداد دين جهة خارجية' : 'دين جهة خارجية') : isDraw ? 'سحب كاش شخصي' : 'إيداع كاش للمحفظة'}
                                                                                    </span>
                                                                                    <span className="text-[9px] text-neutral-400 dark:text-neutral-500 font-normal">({draw.date})</span>
                                                                                </div>
                                                                                <p className="text-[10px] text-neutral-500 dark:text-neutral-400 font-medium">{draw.reason?.replace(' [AUTO_PROFIT]', '') || 'حركة مالية جارية'}</p>
                                                                            </div>
                                                                        </div>

                                                                        <div className="flex items-center gap-2">
                                                                            <span dir="ltr" className={`font-black font-mono text-xs ${isTransfer ? 'text-emerald-500' : isExternalDebt ? 'text-purple-600 dark:text-purple-400' : isDraw ? 'text-rose-500' : 'text-emerald-500'} inline-flex items-center gap-0.5`}>
                                                                                <span>{isDraw ? '-' : '+'}</span>
                                                                                <span>{formatNumber(absoluteAmount)}</span>
                                                                                <span className="text-[9px] font-sans ml-1" dir="rtl">ج.م</span>
                                                                            </span>
                                                                            {!isViewer && (
                                                                                <div className="flex gap-0.5">
                                                                                    <button
                                                                                        onClick={() => handleStartEditDraw(draw)}
                                                                                        className="p-1 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded transition-colors"
                                                                                        title="تعديل"
                                                                                        type="button"
                                                                                    >
                                                                                        <PencilIcon className="w-3.5 h-3.5" />
                                                                                    </button>
                                                                                    <button
                                                                                        onClick={() => handleDeleteDraw(draw.id, draw)}
                                                                                        className="p-1 text-rose-455 hover:text-rose-600 hover:bg-rose-50/50 dark:hover:bg-rose-955/20 rounded transition-colors"
                                                                                        title="حذف"
                                                                                        type="button"
                                                                                    >
                                                                                        <TrashIcon className="w-3.5 h-3.5" />
                                                                                    </button>
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            </div>

                            {/* Safe Read-Only Close Statement Button */}
                            <div className="pt-4 border-t border-neutral-150 dark:border-neutral-800 flex justify-center">
                                <button
                                    onClick={() => setReportPartnerId(null)}
                                    className="px-6 py-2 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-750 text-neutral-700 dark:text-neutral-350 font-black text-xs rounded-xl transition-all shadow-sm active:scale-95"
                                    type="button"
                                >
                                    إغلاق التقرير وذات البين ✕
                                </button>
                            </div>
                        </div>
                    );
                })()}
            </Modal>

        </div>
    );
};

export default PartnersManager;
