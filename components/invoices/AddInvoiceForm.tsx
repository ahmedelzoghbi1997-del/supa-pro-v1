import React, { useState, useEffect, useMemo, useCallback } from 'react';
import type { Invoice } from '../../types';
import { useData } from '../../contexts/DataContext';
import { PlusIcon, TrashIcon, CalendarIcon, TruckIcon, CartonIcon, PencilIcon, SparklesIcon, CheckCircleIcon, UserIcon, WalletIcon } from '../Icons';
import { formatCurrency } from '../../utils/helpers';
import Modal from '../shared/Modal';
import ManageMarkets from '../settings/ManageMarkets';
import { useToast } from '../../hooks/useToast';
import { triggerSaveHaptic } from '../../lib/haptics';

interface AddInvoiceFormProps {
    onSave: (invoice: any) => Promise<void> | void;
    onCancel: () => void;
    initialData?: Partial<Invoice> | null;
}

const generateRowId = () => {
    return typeof crypto !== 'undefined' && crypto.randomUUID 
        ? crypto.randomUUID() 
        : `row_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
};

interface FormPriceItem {
    id: string;
    quantity: string;
    price_per_kg: string;
    packaging_count: string;
}

interface FormDeductionItem {
    id: string;
    name: string;
    amount: string;
}

interface InvoiceFormData {
    description: string;
    date: string;
    cycle_id: string;
    market: string;
    price_items: FormPriceItem[];
    deductions: FormDeductionItem[];
    packaging_type: 'carton' | 'cage';
    packaging_count: string;
}

const inputBase = "w-full bg-white dark:bg-[#1e293b] border border-neutral-200 dark:border-neutral-700 text-slate-800 dark:text-white rounded-lg p-2 text-sm focus:ring-1 focus:ring-primary transition-all outline-none";
const labelBase = "flex items-center gap-1 text-[10px] font-bold text-neutral-400 dark:text-neutral-500 mb-1 uppercase tracking-tighter";

// --- MEMOIZED SUB-COMPONENTS FOR HIGH-PERFORMANCE INPUTS ---

interface PriceItemRowProps {
    id: string;
    packagingCount: string;
    quantity: string;
    pricePerKg: string;
    isCarton: boolean;
    canRemove: boolean;
    onChangeField: (id: string, field: 'packaging_count' | 'quantity' | 'price_per_kg', value: string) => void;
    onRemove: (id: string) => void;
}

const PriceItemRow: React.FC<PriceItemRowProps> = React.memo(({
    id,
    packagingCount,
    quantity,
    pricePerKg,
    isCarton,
    canRemove,
    onChangeField,
    onRemove
}) => {
    return (
        <div className="flex gap-2 items-start animate-page-enter">
            <div className="w-20 md:w-24 flex-shrink-0">
                <input 
                    type="text" 
                    inputMode="numeric" 
                    placeholder="العدد" 
                    value={packagingCount} 
                    onChange={e => {
                        if (/^\d*$/.test(e.target.value)) {
                            onChangeField(id, 'packaging_count', e.target.value);
                        }
                    }} 
                    className={`${inputBase} !py-2 text-center text-base md:text-lg font-bold border-primary/30`} 
                />
                <span className="text-[8px] text-center block text-neutral-400 font-bold mt-0.5">{isCarton ? 'كرتونة' : 'قفص'}</span>
            </div>
            <div className="flex-1">
                <input 
                    type="text" 
                    inputMode="decimal" 
                    placeholder="الوزن" 
                    value={quantity} 
                    onChange={e => {
                        const val = e.target.value;
                        if (/^\d*\.?\d*$/.test(val)) {
                            onChangeField(id, 'quantity', val);
                        }
                    }} 
                    className={`${inputBase} !py-2 text-center text-base md:text-lg font-bold`} 
                />
                <span className="text-[8px] text-center block text-neutral-400 font-bold mt-0.5">الوزن كجم</span>
            </div>
            <span className="text-neutral-400 text-lg font-bold self-start mt-2 select-none">×</span>
            <div className="flex-1">
                <input 
                    type="text" 
                    inputMode="decimal" 
                    placeholder="السعر" 
                    value={pricePerKg} 
                    onChange={e => {
                        const val = e.target.value;
                        if (/^\d*\.?\d*$/.test(val)) {
                            onChangeField(id, 'price_per_kg', val);
                        }
                    }} 
                    className={`${inputBase} !py-2 text-center text-base md:text-lg font-bold`} 
                />
                <span className="text-[8px] text-center block text-neutral-400 font-bold mt-0.5">سعر الكيلو</span>
            </div>
            {canRemove && (
                <button 
                    type="button" 
                    onClick={() => onRemove(id)}
                    className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-md transition-all self-start mt-1.5 cursor-pointer"
                    aria-label="حذف السطر"
                >
                    <TrashIcon className="w-4 h-4" />
                </button>
            )}
        </div>
    );
});

PriceItemRow.displayName = 'PriceItemRow';

interface DeductionRowProps {
    id: string;
    name: string;
    amount: string;
    totalItemsAmount: number;
    onChangeAmount: (id: string, amount: string) => void;
}

const DeductionRow: React.FC<DeductionRowProps> = React.memo(({
    id,
    name,
    amount,
    totalItemsAmount,
    onChangeAmount
}) => {
    const itemP = totalItemsAmount > 0 ? ((parseFloat(amount) || 0) / totalItemsAmount * 100).toFixed(1) : '0';
    
    return (
        <div className="space-y-1">
            <div className="flex justify-between items-center gap-1">
                <span className="text-[9px] font-bold text-neutral-500 truncate block">{name}</span>
                <span className="text-[8px] font-black text-neutral-400">%{itemP}</span>
            </div>
            <input 
                type="text" 
                inputMode="decimal" 
                value={amount} 
                onChange={e => {
                    const val = e.target.value;
                    if (/^\d*\.?\d*$/.test(val)) {
                        onChangeAmount(id, val);
                    }
                }} 
                className={`${inputBase} !p-1.5 !text-xs text-center border-neutral-200 dark:border-neutral-700/50`} 
                placeholder="0" 
            />
        </div>
    );
});

DeductionRow.displayName = 'DeductionRow';

// --- MAIN COMPONENT ---

const AddInvoiceForm: React.FC<AddInvoiceFormProps> = ({ onSave, onCancel, initialData }) => {
    const { cycles, settings, activePersons, advances, partnerDebts } = useData();
    const { showToast } = useToast();
    const [isSaving, setIsSaving] = useState(false);
    const [isManageMarketsOpen, setManageMarketsOpen] = useState(false);
    const [dateError, setDateError] = useState(false);

    const [isRetained, setIsRetained] = useState<boolean>(() => {
        return initialData?.description?.includes('[RETAINED_DEBT]') || 
               initialData?.description?.includes('[مرصودة]') || false;
    });

    const [allocationItems, setAllocationItems] = useState<Array<{ id: string, debtType: 'external' | 'joint', debtId: string, allocations: Record<string, string> }>>(() => {
        if (initialData?.description) {
            const match = initialData.description.match(/\[RETAINED_DEBT:([^\]]*)\]/);
            if (match) {
                try {
                    const parsed = JSON.parse(match[1]);
                    let items: any[] = [];
                    if (parsed && typeof parsed === 'object' && 'items' in parsed) {
                        items = Object.values(parsed.items);
                    } else if (parsed && typeof parsed === 'object') {
                        if ('allocations' in parsed) {
                            items = [{ debtId: parsed.debtId || '', allocations: parsed.allocations }];
                        } else {
                            items = [{ debtId: '', allocations: parsed }];
                        }
                    }
                    
                    return items.map(item => {
                        const strAllocations: Record<string, string> = {};
                        for (const [k, v] of Object.entries(item.allocations || {})) {
                            strAllocations[k] = String(v);
                        }
                        return {
                            id: generateRowId(),
                            debtType: item.debtId ? 'joint' : 'external',
                            debtId: item.debtId || '',
                            allocations: strAllocations
                        };
                    });
                } catch (e) {
                    console.error("Failed to parse initial retained allocations:", e);
                }
            }
        }
        return [{ id: generateRowId(), debtType: 'joint', debtId: '', allocations: {} }];
    });

    const partnerExternalDebt = useMemo(() => {
        const debtMap: Record<string, number> = {};
        (activePersons || []).forEach(p => {
            const partnerAdvs = (advances || []).filter(adv => 
                adv.person_id === p.id && 
                (adv.funding_source === 'external_debt' || 
                 adv.reason?.includes('[EXTERNAL_DEBT]') ||
                 adv.reason?.includes('المعلم') ||
                 adv.reason?.includes('خارجي')) &&
                (!initialData?.id || adv.source_ref_id !== initialData.id)
            );
            const total = partnerAdvs.reduce((s, a) => s + (a.amount || 0), 0);
            debtMap[p.id] = total;
        });
        return debtMap;
    }, [activePersons, advances, initialData?.id]);

    const getTrueRemainingJointDebt = useCallback((debtId: string, personId: string) => {
        const linkedDebt = (partnerDebts || []).find(d => d.id === debtId);
        if (!linkedDebt) return 0;
        const alloc = (linkedDebt.partner_allocations ?? linkedDebt.partnerAllocations)?.[personId] || 0;
        const basePaid = (linkedDebt.partner_repayments ?? linkedDebt.partnerRepayments)?.[personId] || 0;
        const invoicePaid = (advances || [])
            .filter(a => a.person_id === personId && 
                         a.reason?.includes(`[PARTNER_DEBT_PAYMENT:${debtId}]`) &&
                         (!initialData?.id || a.source_ref_id !== initialData.id))
            .reduce((s, a) => s + Math.abs(a.amount || 0), 0);
        return Math.max(0, alloc - (basePaid + invoicePaid));
    }, [partnerDebts, advances, initialData?.id]);

    // Summary map of total debts (personal external + joint share) for each partner
    const _partnerTotalDebtMap = useMemo(() => {
        const map: Record<string, { joint: number; external: number; total: number }> = {};
        (activePersons || []).forEach(p => {
            const extDebt = partnerExternalDebt[p.id] || 0;
            let jointAlloc = 0;
            (partnerDebts || []).forEach(d => {
                jointAlloc += getTrueRemainingJointDebt(d.id, p.id);
            });
            map[p.id] = { joint: jointAlloc, external: extDebt, total: jointAlloc + extDebt };
        });
        return map;
    }, [activePersons, partnerExternalDebt, partnerDebts, getTrueRemainingJointDebt]);

    const cycleOptions = useMemo(() => cycles.filter(c => c.status === 'active' || c.status === 'closed'), [cycles]);

    const draftKey = initialData?.id ? `draft_invoice_${initialData.id}` : 'draft_invoice_new';

    // Local State for Instant Keypress Responsiveness
    const [formData, setFormData] = useState<InvoiceFormData>(() => {
        if (!initialData?.id) {
            try {
                const saved = window.localStorage.getItem(draftKey);
                if (saved) {
                    const parsed = JSON.parse(saved);
                    if (parsed && typeof parsed === 'object') {
                        return {
                            description: parsed.description || '',
                            date: parsed.date || '',
                            cycle_id: parsed.cycle_id || cycleOptions[0]?.id || '',
                            market: parsed.market || settings.markets[0] || '',
                            price_items: Array.isArray(parsed.price_items) && parsed.price_items.length > 0 
                                ? parsed.price_items.map((i: any) => ({
                                    id: i.id || generateRowId(),
                                    quantity: String(i.quantity ?? ''),
                                    price_per_kg: String(i.price_per_kg ?? ''),
                                    packaging_count: String(i.packaging_count ?? '')
                                }))
                                : [
                                    { id: generateRowId(), quantity: '', price_per_kg: '', packaging_count: '' },
                                    { id: generateRowId(), quantity: '', price_per_kg: '', packaging_count: '' }
                                ],
                            deductions: Array.isArray(parsed.deductions)
                                ? parsed.deductions.map((d: any) => ({ id: d.id || d.name, name: d.name, amount: String(d.amount ?? '') }))
                                : settings.deductionItems.map(name => ({ id: name, name, amount: '' })),
                            packaging_type: (parsed.packaging_type as 'carton' | 'cage') || 'cage',
                            packaging_count: String(parsed.packaging_count ?? '')
                        };
                    }
                }
            } catch (e) {
                console.error("Failed to read draft from localStorage:", e);
            }
        }

        return {
            description: initialData?.description || '',
            date: initialData?.date || '',
            cycle_id: initialData?.cycle_id || cycleOptions[0]?.id || '',
            market: initialData?.market || settings.markets[0] || '',
            price_items: initialData?.price_items?.map(i => ({ 
                id: generateRowId(),
                quantity: String(i.quantity ?? ''), 
                price_per_kg: String(i.price_per_kg ?? ''),
                packaging_count: String(i.packaging_count || '') 
            })) || [
                { id: generateRowId(), quantity: '', price_per_kg: '', packaging_count: '' },
                { id: generateRowId(), quantity: '', price_per_kg: '', packaging_count: '' }
            ],
            deductions: initialData?.deductions?.map(d => ({ id: d.name, name: d.name, amount: String(d.amount ?? '') })) || (settings.deductionItems.map(name => ({ id: name, name, amount: '' }))),
            packaging_type: (initialData?.packaging_type as 'carton' | 'cage') || 'cage',
            packaging_count: String(initialData?.packaging_count !== undefined ? initialData.packaging_count : initialData?.carton_count || ''),
        };
    });

    // Debounced draft persistence (500ms) to eliminate storage latency on rapid typing
    useEffect(() => {
        const timer = setTimeout(() => {
            try {
                window.localStorage.setItem(draftKey, JSON.stringify(formData));
            } catch (e) {
                console.error("Failed to save draft to localStorage:", e);
            }
        }, 500);

        return () => clearTimeout(timer);
    }, [draftKey, formData]);

    const clearDraft = useCallback(() => {
        try {
            window.localStorage.removeItem(draftKey);
        } catch (e) {
            console.error("Failed to clear draft from localStorage:", e);
        }
    }, [draftKey]);

    const totals = useMemo(() => {
        const items = formData.price_items.reduce((s, i) => s + (parseFloat(i.quantity) || 0) * (parseFloat(i.price_per_kg) || 0), 0);
        const deds = formData.deductions.reduce((s, d) => s + (parseFloat(d.amount) || 0), 0);
        return { items, deds, net: items - deds };
    }, [formData.price_items, formData.deductions]);

    // Stable Handlers for Price and Deduction Row Updates
    const handlePriceItemChange = useCallback((id: string, field: 'packaging_count' | 'quantity' | 'price_per_kg', value: string) => {
        setFormData(prev => ({
            ...prev,
            price_items: prev.price_items.map(item => 
                item.id === id ? { ...item, [field]: value } : item
            )
        }));
    }, []);

    const addPriceItem = useCallback(() => {
        setFormData(prev => ({
            ...prev,
            price_items: [...prev.price_items, { id: generateRowId(), quantity: '', price_per_kg: '', packaging_count: '' }]
        }));
    }, []);

    const removePriceItem = useCallback((id: string) => {
        setFormData(prev => {
            if (prev.price_items.length <= 1) return prev;
            return {
                ...prev,
                price_items: prev.price_items.filter(item => item.id !== id)
            };
        });
    }, []);

    const handleDeductionChange = useCallback((id: string, amount: string) => {
        setFormData(prev => ({
            ...prev,
            deductions: prev.deductions.map(d => 
                d.id === id ? { ...d, amount } : d
            )
        }));
    }, []);

    // Smart Allocation Helpers
    const _handleAssignToSinglePartner = useCallback((partnerId: string) => {
        const newAllocations: Record<string, string> = {};
        const maxAllowed = partnerExternalDebt[partnerId] || 0;
        const alloc = Math.min(totals.net, Math.max(0, maxAllowed));
        (activePersons || []).forEach(p => {
            newAllocations[p.id] = p.id === partnerId && alloc > 0 ? String(alloc) : '';
        });
        setAllocationItems(prev => {
            if (prev.length === 0) return [{ id: generateRowId(), debtType: 'external', debtId: '', allocations: newAllocations }];
            const updated = [...prev];
            updated[0] = { ...updated[0], allocations: newAllocations };
            return updated;
        });
    }, [activePersons, partnerExternalDebt, totals.net]);

    const handleSmartAutoFitDebts = useCallback(() => {
        const newAllocations: Record<string, string> = {};
        const persons = activePersons || [];
        
        // 1. حساب مديونية كل شريك بدقة لمنع وضع أي مبالغ للشريك الذي مديونيته = 0
        const debts: Record<string, number> = {};
        let totalDebtAll = 0;

        persons.forEach(p => {
            const externalDebt = partnerExternalDebt[p.id] || 0;
            const debt = Math.max(0, externalDebt);
            debts[p.id] = debt;
            totalDebtAll += debt;
        });

        // 2. إذا وُجدت ديون وصافي الفاتورة موجب:
        if (totalDebtAll > 0 && totals.net > 0) {
            // أ) إذا كان صافي الفاتورة يغطي أو يفوق إجمالي الديون:
            // سداد ديون جميع الشركاء المدينين بالكامل وتصفيرها، والشريك صاحب 0 دين يظل فارغاً تماماً
            if (totals.net >= totalDebtAll) {
                persons.forEach(p => {
                    const maxDebt = debts[p.id] || 0;
                    newAllocations[p.id] = maxDebt > 0 ? String(maxDebt) : '';
                });
                // الفارق (totals.net - totalDebtAll) يظل فائضاً يرحل كاش للخزنة
            } else {
                // ب) إذا كان صافي الفاتورة أقل من إجمالي الديون: توزيع تناسبي بين أصحاب الديون فقط
                let remainingNet = totals.net;
                persons.forEach((p, idx) => {
                    const maxDebt = debts[p.id] || 0;
                    if (maxDebt <= 0) {
                        newAllocations[p.id] = '';
                        return;
                    }
                    let share = 0;
                    if (idx === persons.length - 1) {
                        share = Math.min(maxDebt, Number(remainingNet.toFixed(2)));
                    } else {
                        share = Number(((totals.net * maxDebt) / totalDebtAll).toFixed(2));
                        share = Math.min(share, maxDebt, remainingNet);
                    }
                    newAllocations[p.id] = share > 0 ? String(share) : '';
                    remainingNet -= share;
                });
            }
        } else {
            // لا توجد ديون: تبقى جميع الحقول فارغة (صفر) ولا يُفرض أي مبلغ عشوائي
            persons.forEach(p => {
                newAllocations[p.id] = '';
            });
        }
        
        // تحديث البلوك الأول في لوحة التوزيع
        setAllocationItems(prev => {
            if (prev.length === 0) return [{ id: generateRowId(), debtType: 'external', debtId: '', allocations: newAllocations }];
            const updated = [...prev];
            updated[0] = { ...updated[0], allocations: newAllocations };
            return updated;
        });
    }, [activePersons, partnerExternalDebt, totals.net]);

    // Update package count when items change
    useEffect(() => {
        const totalPackages = formData.price_items.reduce((sum, item) => sum + (parseInt(item.packaging_count) || 0), 0);
        if (totalPackages > 0) {
            setFormData(prev => {
                if (prev.packaging_count === String(totalPackages)) return prev;
                return { ...prev, packaging_count: String(totalPackages) };
            });
        }
    }, [formData.price_items]);

    // Active cycle and date safety check
    useEffect(() => {
        if (initialData?.id) {
            setFormData(prev => {
                const targetDate = initialData.date || '';
                if (prev.date === targetDate) return prev;
                return { ...prev, date: targetDate };
            });
        } else if (initialData?.date) {
            setFormData(prev => {
                if (prev.date === initialData.date) return prev;
                return { ...prev, date: initialData.date! };
            });
        }

        if (!initialData) {
            const activeCycles = cycles.filter(c => c.status === 'active');
            const currentSelectedCycle = cycles.find(c => c.id === formData.cycle_id);
            if (activeCycles.length > 0 && (!currentSelectedCycle || currentSelectedCycle.status !== 'active')) {
                setFormData(prev => {
                    if (prev.cycle_id === activeCycles[0].id) return prev;
                    return { ...prev, cycle_id: activeCycles[0].id };
                });
            }
        }
    }, [cycles, formData.cycle_id, initialData]);

    const isCarton = formData.packaging_type === 'carton';
    const isFutureMarket = formData.market === 'سوق المستقبل';

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        triggerSaveHaptic();
        
        if (!formData.date) {
            setDateError(true);
            showToast('يرجى اختيار تاريخ الفاتورة أولاً', 'error');
            return;
        }

        if (totals.net <= 0) {
            showToast('لا يمكن حفظ فاتورة بصافي صفر أو قيمة سالبة', 'error');
            return;
        }

        if (isRetained) {
            let grandTotalAllocated = 0;
            for (const item of allocationItems) {
                if (item.debtType === 'joint' && !item.debtId) {
                    showToast('يرجى اختيار الدين المشترك النشط في أحد بنود التوزيع', 'error');
                    setIsSaving(false); return;
                }
                for (const person of activePersons) {
                    const val = parseFloat(item.allocations[person.id]) || 0;
                    if (val > 0) {
                        grandTotalAllocated += val;
                        const maxAllowed = item.debtType === 'joint' ? getTrueRemainingJointDebt(item.debtId, person.id) : (partnerExternalDebt[person.id] || 0);
                        if (val > maxAllowed) {
                            showToast(`توزيع خاطئ! المتبقي الفعلي على ${person.name} هو ${formatCurrency(maxAllowed)} فقط`, 'error');
                            setIsSaving(false); return;
                        }
                    }
                }
            }
            if (grandTotalAllocated <= 0) {
                showToast('يرجى إدخال مبلغ المرصود لسداد الدين في بند واحد على الأقل', 'error');
                setIsSaving(false); return;
            }
            if (grandTotalAllocated > totals.net) {
                showToast(`إجمالي المبالغ المرصودة (${formatCurrency(grandTotalAllocated)}) يتجاوز صافي الفاتورة (${formatCurrency(totals.net)})`, 'error');
                setIsSaving(false); return;
            }
        }

        if (isSaving) return;
        
        setIsSaving(true);
        
        try {
            let finalDescription = formData.description.trim();
            finalDescription = finalDescription.replace(/\s*\[RETAINED_DEBT:.*?\]/g, '').replace(/\s*\[مرصودة\]/g, '').trim();

            if (isRetained) {
                const payloadItems: Record<string, any> = {};
                let itemIndex = 0;
                let totalRetainedSum = 0;
                for (const item of allocationItems) {
                    if (item.debtType === 'joint' && !item.debtId) {
                        showToast('يرجى اختيار الدين المشترك النشط في أحد بنود التوزيع', 'error');
                        setIsSaving(false);
                        return;
                    }
                    const cleanAllocations: Record<string, number> = {};
                    let hasAmount = false;
                    for (const [partnerId, val] of Object.entries(item.allocations)) {
                        const amt = parseFloat(val);
                        if (amt > 0) {
                            cleanAllocations[partnerId] = amt;
                            totalRetainedSum += amt;
                            hasAmount = true;
                        }
                    }
                    if (hasAmount) {
                        payloadItems[itemIndex++] = {
                            allocations: cleanAllocations,
                            debtId: item.debtType === 'joint' ? item.debtId : ''
                        };
                    }
                }
                if (itemIndex === 0 || totalRetainedSum <= 0) {
                    showToast('يرجى إدخال مبلغ واحد على الأقل في التوزيع', 'error');
                    setIsSaving(false);
                    return;
                }
                const surplusAmount = Math.max(0, Math.round((totals.net - totalRetainedSum) * 100) / 100);
                finalDescription = `${finalDescription} [مرصودة] [RETAINED_DEBT:${JSON.stringify({ 
                    items: payloadItems,
                    retainedTotal: Number(totalRetainedSum.toFixed(2)),
                    surplus: Number(surplusAmount.toFixed(2))
                })}]`.trim();
            }

            const data: any = {
                description: finalDescription,
                date: formData.date,
                cycle_id: formData.cycle_id,
                market: formData.market,
                packaging_type: formData.packaging_type,
                packaging_count: formData.packaging_count ? parseInt(formData.packaging_count) : 0,
                price_items: formData.price_items
                    .filter(i => i.quantity !== '' || i.price_per_kg !== '')
                    .map(i => ({ 
                        quantity: parseFloat(i.quantity) || 0, 
                        price_per_kg: parseFloat(i.price_per_kg) || 0,
                        packaging_count: parseInt(i.packaging_count) || 0
                    })),
                deductions: formData.deductions.map(d => ({ 
                    name: d.name, 
                    amount: parseFloat(d.amount) || 0 
                })),
            };

            if (initialData?.id) {
                data.id = initialData.id;
            }

            await onSave(data);
            clearDraft();
        } catch (error) {
            console.error("Form submission error:", error);
            setIsSaving(false);
        }
    };

    return (
        <div className="max-h-[85vh] overflow-y-auto px-1">
            <form onSubmit={handleSubmit} className="space-y-4 pb-6">
                <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-1">
                        <label className={`${labelBase} ${dateError ? 'text-rose-500 dark:text-rose-400' : ''}`}>
                            <CalendarIcon className="w-3 h-3"/> التاريخ (إجباري)
                        </label>
                        <input 
                            type="date" 
                            value={formData.date} 
                            onChange={e => {
                                setFormData(prev => ({ ...prev, date: e.target.value }));
                                if (e.target.value) setDateError(false);
                            }} 
                            className={`${inputBase} ${dateError ? 'border-rose-500 ring-1 ring-rose-500/20' : ''}`} 
                        />
                        {dateError && (
                            <p className="text-[9px] text-rose-500 font-bold mt-1 animate-pulse">يجب تحديد تاريخ الفاتورة</p>
                        )}
                    </div>
                    <div className="col-span-1">
                        <label className={labelBase}><TruckIcon className="w-3 h-3"/> السوق</label>
                        <div className="flex gap-1">
                            <select 
                                value={formData.market} 
                                onChange={e => setFormData(prev => ({ ...prev, market: e.target.value }))} 
                                className={inputBase}
                            >
                                {settings.markets.map(m => <option key={m} value={m}>{m}</option>)}
                            </select>
                            <button 
                                type="button" 
                                onClick={() => setManageMarketsOpen(true)} 
                                className="p-2 bg-neutral-100 dark:bg-neutral-800 text-neutral-400 rounded-lg hover:text-primary cursor-pointer"
                                aria-label="إدارة الأسواق"
                            >
                                <PlusIcon className="w-4 h-4"/>
                            </button>
                        </div>
                    </div>
                </div>

                <div className="space-y-2 bg-neutral-50 dark:bg-neutral-900/40 p-3 rounded-xl border border-neutral-100 dark:border-neutral-800">
                    <label className={labelBase}>نوع التعبئة</label>
                    <div className="grid grid-cols-2 gap-2">
                        <button 
                            type="button"
                            onClick={() => setFormData(prev => ({ ...prev, packaging_type: 'carton' }))}
                            className={`py-2 rounded-lg text-xs font-bold transition-all border cursor-pointer ${isCarton ? 'bg-primary text-white border-primary' : 'bg-white dark:bg-neutral-800 text-neutral-400 border-neutral-200 dark:border-neutral-700'}`}
                        >
                            📦 كرتونة {isFutureMarket ? '(تطهير 2ك)' : ''}
                        </button>
                        <button 
                            type="button"
                            onClick={() => setFormData(prev => ({ ...prev, packaging_type: 'cage' }))}
                            className={`py-2 rounded-lg text-xs font-bold transition-all border cursor-pointer ${!isCarton ? 'bg-primary text-white border-primary' : 'bg-white dark:bg-neutral-800 text-neutral-400 border-neutral-200 dark:border-neutral-700'}`}
                        >
                            🧺 قفص (وزن فعلي)
                        </button>
                    </div>
                </div>

                <div className="p-3 bg-emerald-50/50 dark:bg-emerald-500/5 rounded-xl border border-emerald-100 dark:border-emerald-900/20">
                    <div className="flex justify-between items-center mb-3">
                        <label className="text-[11px] font-black text-emerald-600 dark:text-emerald-400 block">💰 تفاصيل الأوزان والأسعار</label>
                        <button 
                            type="button" 
                            onClick={addPriceItem}
                            className="flex items-center gap-1 text-[10px] font-black bg-emerald-600 text-white px-2 py-1 rounded-lg hover:bg-emerald-700 transition-all shadow-sm cursor-pointer"
                        >
                            <PlusIcon className="w-3 h-3" />
                            <span>إضافة سطر</span>
                        </button>
                    </div>
                    <div className="space-y-2">
                        {formData.price_items.map((item) => (
                            <PriceItemRow
                                key={item.id}
                                id={item.id}
                                packagingCount={item.packaging_count}
                                quantity={item.quantity}
                                pricePerKg={item.price_per_kg}
                                isCarton={isCarton}
                                canRemove={formData.price_items.length > 1}
                                onChangeField={handlePriceItemChange}
                                onRemove={removePriceItem}
                            />
                        ))}
                    </div>
                </div>

                <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-3 p-3 bg-blue-50/50 dark:bg-blue-950/20 rounded-xl border border-blue-100/60 dark:border-blue-900/20">
                        <div className="flex items-center gap-1.5">
                            <CartonIcon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                            <span className="text-xs font-black text-blue-800 dark:text-blue-300">إجمالي عدد الطرود (محسوب تلقائياً)</span>
                        </div>
                        <span className="px-3 py-1 bg-blue-100/60 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 rounded-lg text-base font-black tabular-nums">
                            {formData.packaging_count || '0'}
                        </span>
                    </div>
                    {isCarton && isFutureMarket && (
                        <p className="text-[9px] text-emerald-650 dark:text-emerald-400 font-black text-right px-1">
                            ⚠️ سيتم خصم 2ك وزن و 10ج تكلفة لكل كرتونة (خاص بسوق المستقبل)
                        </p>
                    )}
                </div>

                <div className="p-3 bg-gray-50 dark:bg-neutral-900/40 rounded-xl border border-gray-200 dark:border-neutral-800">
                    <label className="text-[11px] font-black text-neutral-700 dark:text-neutral-300 mb-2 block">📉 خصومات الفاتورة المكتوبة</label>
                    <div className="grid grid-cols-3 gap-2">
                        {formData.deductions.map((d) => (
                            <DeductionRow
                                key={d.id}
                                id={d.id}
                                name={d.name}
                                amount={d.amount}
                                totalItemsAmount={totals.items}
                                onChangeAmount={handleDeductionChange}
                            />
                        ))}
                    </div>
                </div>

                <div>
                    <label className={labelBase}><PencilIcon className="w-3 h-3"/> ملاحظات (اختياري)</label>
                    <input 
                        type="text" 
                        value={formData.description} 
                        onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))} 
                        className={inputBase} 
                        placeholder="مثل: ثلاجة، رقم السيارة، إلخ..."
                    />
                </div>

                {/* PILLAR 1: SMART & FAST RETAINED INVOICE ENTRY PANEL */}
                <div className="p-4 bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-amber-600/10 dark:from-amber-500/15 dark:to-amber-900/20 rounded-2xl border border-amber-500/30 space-y-4 shadow-sm">
                    <label className="flex items-center justify-between cursor-pointer select-none">
                        <div className="flex items-center gap-2.5">
                            <input 
                                type="checkbox" 
                                checked={isRetained} 
                                onChange={e => {
                                    setIsRetained(e.target.checked);
                                    if (e.target.checked) {
                                        handleSmartAutoFitDebts();
                                    }
                                }}
                                className="w-5 h-5 text-amber-600 rounded border-amber-400 focus:ring-amber-500 focus:ring-offset-0 cursor-pointer"
                            />
                            <div>
                                <span className="text-xs font-black text-amber-900 dark:text-amber-200 block">
                                    🌾 رصد الفاتورة لسداد ديون (رصد كامل أو جزئي مع ترحيل الفائض للخزنة)
                                </span>
                                <span className="text-[9px] text-amber-700/80 dark:text-amber-400 font-bold block">
                                    (سداد ديون الشركاء أو المعلم مباشرة من المبيعات، مع ترحيل أي فائض نقدي تلقائياً إلى الخزنة)
                                </span>
                            </div>
                        </div>
                        {isRetained && (
                            <span className="px-2 py-0.5 bg-amber-500 text-white rounded-full text-[9px] font-black animate-pulse">
                                إدخال ذكي نشط
                            </span>
                        )}
                    </label>
                    
                    {isRetained && (
                        <div className="space-y-4 pt-3 border-t border-amber-500/20 animate-page-enter">
                            
                            
                            {/* SMART ALLOCATION BOARD */}
                            <div className="space-y-4 mb-4">
                                <div className="flex items-center justify-between">
                                    <h4 className="text-xs font-black text-amber-900 dark:text-amber-100 flex items-center gap-1.5">
                                        <SparklesIcon className="w-4 h-4 text-amber-600" />
                                        <span>توزيع الفاتورة (لوحة التوزيع الذكية)</span>
                                    </h4>
                                    <div className="text-[10px] font-bold text-amber-700 bg-amber-100 dark:bg-amber-900/30 px-2 py-1 rounded-full">
                                        إجمالي صافي الفاتورة: {formatCurrency(totals.net)}
                                    </div>
                                </div>
                                
                                {allocationItems.map((item) => {
                                    const itemAllocationsTotal = Object.values(item.allocations).reduce((sum, val) => sum + (parseFloat(val) || 0), 0);
                                    
                                    return (
                                    <div key={item.id} className="p-3 bg-white dark:bg-neutral-900 border border-amber-200 dark:border-neutral-700 rounded-xl relative shadow-sm">
                                        {allocationItems.length > 1 && (
                                            <button
                                                type="button"
                                                onClick={() => setAllocationItems(prev => prev.filter(a => a.id !== item.id))}
                                                className="absolute top-2 left-2 p-1.5 bg-rose-50 text-rose-600 rounded-lg hover:bg-rose-100 transition-colors z-10"
                                                aria-label="حذف التوزيع"
                                            >
                                                <TrashIcon className="w-4 h-4" />
                                            </button>
                                        )}
                                        
                                        <div className="grid grid-cols-2 gap-2 mb-3 pr-8">
                                            <button
                                                type="button"
                                                onClick={() => setAllocationItems(prev => prev.map(a => {
                                                    if (a.id === item.id) {
                                                        const clamped = { ...a.allocations };
                                                        activePersons.forEach(person => {
                                                            const maxAllowed = partnerExternalDebt[person.id] || 0;
                                                            if ((parseFloat(clamped[person.id]) || 0) > maxAllowed) clamped[person.id] = maxAllowed > 0 ? String(maxAllowed) : '';
                                                        });
                                                        return { ...a, debtType: 'external', debtId: '', allocations: clamped };
                                                    }
                                                    return a;
                                                }))}
                                                className={`p-2.5 rounded-xl text-[11px] font-black transition-all flex items-center justify-center gap-1.5 border ${
                                                    item.debtType === 'external' 
                                                        ? 'bg-amber-600 text-white border-amber-600 shadow-md shadow-amber-600/20' 
                                                        : 'bg-neutral-50 dark:bg-neutral-800 text-amber-900 dark:text-amber-300 border-amber-200 dark:border-neutral-700'
                                                }`}
                                            >
                                                <span>مديونية خارجية</span>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setAllocationItems(prev => prev.map(a => a.id === item.id ? { ...a, debtType: 'joint' } : a))}
                                                className={`p-2.5 rounded-xl text-[11px] font-black transition-all flex items-center justify-center gap-1.5 border ${
                                                    item.debtType === 'joint' 
                                                        ? 'bg-amber-600 text-white border-amber-600 shadow-md shadow-amber-600/20' 
                                                        : 'bg-neutral-50 dark:bg-neutral-800 text-amber-900 dark:text-amber-300 border-amber-200 dark:border-neutral-700'
                                                }`}
                                            >
                                                <span>دين مشترك نشط</span>
                                            </button>
                                        </div>

                                        {item.debtType === 'joint' && (
                                            <div className="mb-3">
                                                {(!partnerDebts || partnerDebts.length === 0) ? (
                                                    <div className="p-2 bg-rose-50 text-rose-700 rounded-lg text-[10px] font-bold">
                                                        لا يوجد ديون مشتركة.
                                                    </div>
                                                ) : (
                                                    <select
                                                        value={item.debtId}
                                                        onChange={e => {
                                                            const newDebtId = e.target.value;
                                                            setAllocationItems(prev => prev.map(a => {
                                                                if (a.id === item.id) {
                                                                    const clamped = { ...a.allocations };
                                                                    if (newDebtId) {
                                                                        activePersons.forEach(person => {
                                                                            const maxAllowed = getTrueRemainingJointDebt(newDebtId, person.id);
                                                                            if ((parseFloat(clamped[person.id]) || 0) > maxAllowed) clamped[person.id] = maxAllowed > 0 ? String(maxAllowed) : '';
                                                                        });
                                                                    }
                                                                    return { ...a, debtId: newDebtId, allocations: clamped };
                                                                }
                                                                return a;
                                                            }));
                                                        }}
                                                        className={`${inputBase} !py-2 font-bold text-xs border-amber-300`}
                                                        required={isRetained && item.debtType === 'joint'}
                                                    >
                                                        <option value="">-- اختر الدين المشترك لتسديده --</option>
                                                        {partnerDebts.map(debt => {
                                                            const repayments = debt.partner_repayments ?? debt.partnerRepayments ?? {};
                                                            const totalPaid = Object.values(repayments).reduce((s, v) => s + v, 0);
                                                            const totalAmount = debt.total_amount ?? debt.totalAmount ?? 0;
                                                            const totalRemaining = Math.max(0, totalAmount - totalPaid);
                                                            return (
                                                                <option key={debt.id} value={debt.id}>
                                                                    {debt.description} (المتبقي: {totalRemaining} ج.م)
                                                                </option>
                                                            );
                                                        })}
                                                    </select>
                                                )}
                                            </div>
                                        )}

                                        <div className="space-y-2 bg-amber-500/5 dark:bg-neutral-800/50 p-2.5 rounded-xl border border-amber-500/15">
                                            {activePersons.map(person => {
                                                let capValue = -1;
                                                if (item.debtType === 'joint' && item.debtId) {
                                                    capValue = getTrueRemainingJointDebt(item.debtId, person.id);
                                                } else if (item.debtType === 'external') {
                                                    capValue = partnerExternalDebt[person.id] || 0;
                                                }

                                                let alreadyAllocated = 0;
                                                allocationItems.forEach(otherItem => {
                                                    if (otherItem.id !== item.id) {
                                                        alreadyAllocated += parseFloat(otherItem.allocations[person.id]) || 0;
                                                    }
                                                });
                                                if (capValue >= 0) {
                                                    capValue = Math.max(0, capValue - alreadyAllocated);
                                                }

                                                // حساب الحد الأقصى المتاح من صافي الفاتورة لهذا الشريك تحديداً
                                                let otherAllocatedAcrossBoard = 0;
                                                allocationItems.forEach(anyItem => {
                                                    Object.entries(anyItem.allocations).forEach(([pId, v]) => {
                                                        if (anyItem.id !== item.id || pId !== person.id) {
                                                            otherAllocatedAcrossBoard += parseFloat(v) || 0;
                                                        }
                                                    });
                                                });
                                                const netRemainingCap = Math.max(0, totals.net - otherAllocatedAcrossBoard);
                                                const effectiveMax = capValue >= 0 ? Math.min(capValue, netRemainingCap) : netRemainingCap;

                                                return (
                                                    <div key={person.id} className="flex items-center gap-2">
                                                        <label className="text-xs font-black text-slate-800 dark:text-neutral-200 w-24 shrink-0 truncate flex items-center gap-1">
                                                            <UserIcon className="w-3 h-3 text-amber-600"/>
                                                            {person.name}
                                                        </label>
                                                        <div className="flex-1 flex flex-col gap-1">
                                                            {capValue >= 0 && (
                                                                <div className="flex justify-between items-center px-1">
                                                                    <span className={`text-[9px] font-black ${capValue === 0 ? 'text-neutral-400 dark:text-neutral-500' : 'text-amber-700 dark:text-amber-400'}`}>
                                                                        {capValue === 0 ? 'أقصى سداد مسموح: 0 ج (لا توجد مديونية)' : `أقصى سداد مسموح: ${formatCurrency(capValue).replace('EGP', '')} ج`}
                                                                    </span>
                                                                </div>
                                                            )}
                                                            <input
                                                                type="text"
                                                                inputMode="decimal"
                                                                placeholder="0"
                                                                value={effectiveMax === 0 ? '' : (item.allocations[person.id] || '')}
                                                                onChange={e => {
                                                                    let val = e.target.value;
                                                                    if (/^\d*\.?\d*$/.test(val)) {
                                                                        const numVal = parseFloat(val) || 0;
                                                                        if (val !== '' && numVal > effectiveMax) {
                                                                            val = effectiveMax > 0 ? String(effectiveMax) : '';
                                                                            if (effectiveMax === capValue && capValue >= 0) {
                                                                                showToast(`تجاوزت الحد المسموح للشريك ${person.name} (${formatCurrency(capValue).replace('EGP', '')} ج)`, 'warning');
                                                                            } else {
                                                                                showToast(`لا يمكن أن يتجاوز إجمالي التوزيع صافي الفاتورة (${formatCurrency(totals.net).replace('EGP', '')} ج)`, 'warning');
                                                                            }
                                                                        }
                                                                        setAllocationItems(prev => prev.map(a => 
                                                                            a.id === item.id 
                                                                                ? { ...a, allocations: { ...a.allocations, [person.id]: val } } 
                                                                                : a
                                                                        ));
                                                                    }
                                                                }}
                                                                className={`${inputBase} !py-2 text-center text-sm font-black w-full border-amber-300 ${effectiveMax === 0 ? 'opacity-50 cursor-not-allowed bg-neutral-200/60 dark:bg-neutral-800' : 'focus:border-amber-500 focus:ring-amber-500'}`}
                                                                disabled={effectiveMax === 0}
                                                            />
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                        
                                        <div className="mt-3 flex items-center justify-between border-t border-amber-200/50 pt-2">
                                            <span className="text-[10px] font-bold text-amber-900/60 dark:text-amber-100/50">إجمالي هذا التوزيع:</span>
                                            <span className="text-xs font-black text-amber-700 dark:text-amber-400">
                                                {formatCurrency(itemAllocationsTotal)}
                                            </span>
                                        </div>
                                    </div>
                                    );
                                })}

                                {(() => {
                                    let grandTotalAllocated = 0;
                                    allocationItems.forEach(item => {
                                        Object.values(item.allocations).forEach(val => {
                                            grandTotalAllocated += parseFloat(val) || 0;
                                        });
                                    });
                                    const surplus = Math.max(0, Math.round((totals.net - grandTotalAllocated) * 100) / 100);
                                    
                                    return (
                                        <>
                                            {/* SURPLUS & RETENTION SUMMARY CARD */}
                                            {grandTotalAllocated > 0 && surplus > 0 && (
                                                <div className="w-full p-3.5 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl border border-emerald-300 dark:border-emerald-800/60 flex items-start gap-3 shadow-sm animate-page-enter">
                                                    <div className="p-2 bg-emerald-500 text-white rounded-lg shrink-0 shadow-sm">
                                                        <WalletIcon className="w-5 h-5" />
                                                    </div>
                                                    <div className="space-y-1 text-right flex-1">
                                                        <div className="flex items-center justify-between flex-wrap gap-2">
                                                            <span className="text-xs font-black text-emerald-900 dark:text-emerald-200">
                                                                رصد جزئي مع ترحيل الفائض تلقائياً للخزنة
                                                            </span>
                                                            <span className="px-2.5 py-0.5 bg-emerald-600 text-white rounded-full text-[10px] font-black">
                                                                +{formatCurrency(surplus).replace('EGP', '')} ج.م نقدية واردة
                                                            </span>
                                                        </div>
                                                        <p className="text-[11px] text-emerald-800 dark:text-emerald-300 font-bold leading-relaxed">
                                                            سيتم اعتماد سداد الدين بالكامل وتصفيره بمبلغ <span className="underline font-black">{formatCurrency(grandTotalAllocated).replace('EGP', '')} ج.م</span>، و<span className="font-black underline text-emerald-900 dark:text-emerald-100">سيتم ترحيل الفائض المتبقي ({formatCurrency(surplus).replace('EGP', '')} ج.م) كاش إلى الخزنة</span> كإيراد مبيعات لنفس الفاتورة مع حفظ المبيعات بكامل قيمتها ({formatCurrency(totals.net).replace('EGP', '')} ج.م).
                                                        </p>
                                                    </div>
                                                </div>
                                            )}

                                            {grandTotalAllocated > 0 && surplus === 0 && (
                                                <div className="w-full p-3 bg-amber-50 dark:bg-amber-950/30 rounded-xl border border-amber-200 dark:border-amber-800/50 flex items-center gap-2 text-[11px] font-bold text-amber-900 dark:text-amber-200">
                                                    <SparklesIcon className="w-4 h-4 text-amber-600 shrink-0" />
                                                    <span>تم رصد صافي الفاتورة بالكامل ({formatCurrency(totals.net).replace('EGP', '')} ج.م) لسداد الديون من المنبع ولا يوجد فائض مرحل.</span>
                                                </div>
                                            )}

                                            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                                                <button
                                                    type="button"
                                                    onClick={() => setAllocationItems(prev => [...prev, { id: generateRowId(), debtType: 'joint', debtId: '', allocations: {} }])}
                                                    className="w-full sm:w-auto text-[11px] font-black text-emerald-700 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 px-4 py-2.5 rounded-xl flex items-center justify-center gap-1.5 transition-colors shadow-sm cursor-pointer"
                                                >
                                                    <PlusIcon className="w-4 h-4" />
                                                    توجيه جزء لدين آخر
                                                </button>

                                                {grandTotalAllocated > 0 && grandTotalAllocated <= totals.net ? (
                                                    <div className="w-full sm:w-auto text-[10px] sm:text-xs font-black px-4 py-2.5 rounded-xl flex items-center justify-center gap-2 border shadow-sm bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border-emerald-500/30">
                                                        <CheckCircleIcon className="w-4 h-4 text-emerald-600" />
                                                        <span>
                                                            سداد دين: {formatCurrency(grandTotalAllocated).replace('EGP', '')} ج.م
                                                            {surplus > 0 ? ` | فائض كاش للخزنة: ${formatCurrency(surplus).replace('EGP', '')} ج.م` : ' (مرصودة بالكامل)'}
                                                        </span>
                                                    </div>
                                                ) : grandTotalAllocated > totals.net ? (
                                                    <div className="w-full sm:w-auto text-[10px] sm:text-xs font-black px-4 py-2.5 rounded-xl flex items-center justify-center gap-2 border shadow-sm bg-rose-50 text-rose-700 border-rose-200">
                                                        <div className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
                                                        <span>تجاوزت صافي الفاتورة بمقدار: {formatCurrency(grandTotalAllocated - totals.net).replace('EGP', '')} ج.م</span>
                                                    </div>
                                                ) : (
                                                    <div className="w-full sm:w-auto text-[10px] sm:text-xs font-black px-4 py-2.5 rounded-xl flex items-center justify-center gap-2 border shadow-sm bg-amber-50 text-amber-700 border-amber-200">
                                                        <div className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
                                                        <span>يرجى تحديد مبالغ سداد الديون</span>
                                                    </div>
                                                )}
                                            </div>
                                        </>
                                    );
                                })()}
                            </div>
                        </div>
                    )}
                </div>

                {/* BOTTOM SUMMARY CARD */}
                {(() => {
                    let grandTotalAllocated = 0;
                    if (isRetained) {
                        allocationItems.forEach(item => {
                            Object.values(item.allocations).forEach(val => {
                                grandTotalAllocated += parseFloat(val) || 0;
                            });
                        });
                    }
                    const surplus = isRetained ? Math.max(0, Math.round((totals.net - grandTotalAllocated) * 100) / 100) : totals.net;

                    return (
                        <div className="mt-6 bg-neutral-900 dark:bg-black p-4 rounded-2xl text-white relative">
                            <div className="flex justify-between items-end">
                                <div>
                                    <span className="text-[9px] font-black opacity-50 block mb-0.5">
                                        {isRetained && surplus > 0 
                                            ? `صافي الفاتورة (${formatCurrency(totals.net).replace('EGP', '')}) - فائض كاش للخزنة:`
                                            : isRetained 
                                            ? 'مرصودة بالكامل لسداد الديون' 
                                            : 'المبلغ المدفوع لك فعلياً'}
                                    </span>
                                    <span className="text-sm font-bold text-primary-light">
                                        {isRetained && surplus > 0 
                                            ? 'فائض الخزنة النقدي' 
                                            : isRetained 
                                            ? 'صافي الفاتورة (مرصود للديون)' 
                                            : 'صافي الفاتورة'}
                                    </span>
                                </div>
                                <div className="text-3xl font-black tracking-tighter tabular-nums text-emerald-400">
                                    {formatCurrency(isRetained && surplus > 0 ? surplus : totals.net).replace('EGP', '')}
                                    <span className="text-xs mr-1 opacity-60">ج.م</span>
                                </div>
                            </div>
                        </div>
                    );
                })()}

                <div className="grid grid-cols-2 gap-3 mt-6">
                    <button 
                        type="button" 
                        onClick={() => { clearDraft(); onCancel(); }} 
                        disabled={isSaving}
                        className="py-3 bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 font-bold rounded-xl text-sm transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    >
                        إلغاء
                    </button>
                    <button 
                        type="submit" 
                        disabled={isSaving} 
                        className="py-3 bg-primary text-white font-bold rounded-xl text-sm shadow-lg shadow-primary/20 transition-all active:scale-95 disabled:bg-neutral-300 dark:disabled:bg-neutral-700 disabled:cursor-not-allowed cursor-pointer"
                    >
                        {isSaving ? 'جاري الحفظ...' : (initialData?.id ? 'حفظ التعديلات' : 'حفظ الفاتورة')}
                    </button>
                </div>
            </form>
            <Modal isOpen={isManageMarketsOpen} onClose={() => setManageMarketsOpen(false)} title="إدارة الأسواق" size="md">
                <ManageMarkets onClose={() => setManageMarketsOpen(false)} />
            </Modal>
        </div>
    );
};

export default AddInvoiceForm;
