import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useData } from '../../contexts/DataContext';
import { useSettings } from '../../contexts/SettingsContext';
import { 
    CheckCircleIcon,
    SettingsIcon,
    PlusIcon,
    XMarkIcon
} from '../Icons';
import type { ExpenseCategory } from '../../types';
import { formatNumber, getLocalDateString } from '../../utils/helpers';
import { triggerSaveHaptic } from '../../lib/haptics';

interface UnifiedLaborFormProps {
    onClose: () => void;
    defaultCycleId?: string;
    laborCategories: ExpenseCategory[];
    onManageActivities: () => void;
}

export interface WorkerRecord {
    id: string;
    name: string;
    amount: string;
    paymentMethod: 'cash' | 'credit' | 'split';
    cashAmount: string;
    isUnnamed?: boolean;
    notes?: string;
}

export interface OtherExpenseRecord {
    id: string;
    description: string;
    amount: string;
    paymentMethod: 'cash' | 'credit';
}

const DRAFT_STORAGE_KEY = 'unified_labor_form_dynamic_draft_v5';

// Extracted Memoized Worker Record Row
interface WorkerRecordRowProps {
    record: WorkerRecord;
    onUpdateAmount: (id: string, amount: string) => void;
    onUpdatePaymentMethod: (id: string, method: 'cash' | 'credit' | 'split', cashAmount?: string) => void;
    onOpenNotes: (id: string) => void;
    onRemove: (id: string) => void;
}

const WorkerRecordRow: React.FC<WorkerRecordRowProps> = React.memo(({
    record,
    onUpdateAmount,
    onUpdatePaymentMethod,
    onOpenNotes,
    onRemove
}) => {
    const [localAmount, setLocalAmount] = useState(record.amount);

    useEffect(() => {
        setLocalAmount(record.amount);
    }, [record.amount]);

    const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setLocalAmount(val);
        onUpdateAmount(record.id, val);
    };

    return (
        <div 
            className="flex items-center justify-between gap-2 bg-neutral-50/40 dark:bg-neutral-900/10 py-1 px-2 rounded-lg hover:bg-neutral-100/40 dark:hover:bg-neutral-900/20 transition-all text-xs"
        >
            {/* Name and unnamed status */}
            <div className="flex items-center gap-1.5 min-w-0 flex-1">
                <span className="text-[11px] font-black text-neutral-700 dark:text-neutral-200 truncate" title={record.name}>
                    {record.name}
                </span>
                {record.isUnnamed && (
                    <span className="text-[8px] bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 px-1 py-0.5 rounded font-bold shrink-0">
                        مجهول
                    </span>
                )}
            </div>

            {/* Day wage input */}
            <div className="relative w-16 shrink-0">
                <input 
                    type="text" 
                    inputMode="decimal"
                    pattern="[0-9]*"
                    required
                    value={localAmount} 
                    dir="ltr"
                    lang="en"
                    onChange={handleAmountChange}
                    placeholder="200" 
                    className="w-full bg-white dark:bg-neutral-950 border border-neutral-200/80 dark:border-neutral-805 rounded-md pl-8 pr-1 py-0.5 text-[11px] font-mono font-black text-emerald-600 dark:text-emerald-400 text-left outline-none" 
                />
                <span className="absolute left-1 top-1/2 -translate-y-1/2 text-[8px] text-neutral-400 font-bold font-mono">ج.م</span>
            </div>

            {/* Toggle button group [كاش / آجل / مجزأ] */}
            {record.isUnnamed ? (
                <span className="text-[9px] text-emerald-600 bg-emerald-50 dark:bg-emerald-950/20 px-2 py-0.5 rounded font-semibold shrink-0">
                    💵 كاش فوري
                </span>
            ) : (
                <div className="flex rounded overflow-hidden bg-neutral-100 dark:bg-neutral-950 p-0.5 shrink-0 select-none">
                    <button
                        type="button"
                        onClick={() => onUpdatePaymentMethod(record.id, 'cash')}
                        className={`px-1.5 py-0.5 text-[8.5px] sm:text-[10px] font-semibold rounded transition-all cursor-pointer ${
                            record.paymentMethod === 'cash'
                                ? 'bg-emerald-500 text-white font-bold shadow-xs'
                                : 'text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'
                        }`}
                    >
                        كاش
                    </button>
                    <button
                        type="button"
                        onClick={() => onUpdatePaymentMethod(record.id, 'credit')}
                        className={`px-1.5 py-0.5 text-[8.5px] sm:text-[10px] font-semibold rounded transition-all cursor-pointer ${
                            record.paymentMethod === 'credit'
                                ? 'bg-rose-500 text-white font-bold shadow-xs'
                                : 'text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'
                        }`}
                    >
                        آجل
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            const half = String(Math.floor((Number(localAmount || record.amount) || 0) * 0.5));
                            onUpdatePaymentMethod(record.id, 'split', half);
                            onOpenNotes(record.id);
                        }}
                        className={`px-1.5 py-0.5 text-[8.5px] sm:text-[10px] font-semibold rounded transition-all cursor-pointer ${
                            record.paymentMethod === 'split' 
                                ? 'bg-indigo-500 text-white font-bold shadow-xs' 
                                : 'text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'
                        }`}
                    >
                        مجزأ
                    </button>
                </div>
            )}

            <div className="flex items-center gap-1.5 shrink-0">
                {/* Notes Trigger Button 📝 */}
                <button
                    type="button"
                    onClick={() => onOpenNotes(record.id)}
                    className="p-1 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-400 hover:text-emerald-600 rounded transition-all relative cursor-pointer"
                    title="ملاحظات العامل وتفاصيل الحساب"
                >
                    📝
                    {((record.notes && record.notes.trim()) || record.paymentMethod === 'split') && (
                        <span className="absolute top-0 right-0 w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping" />
                    )}
                </button>

                {/* Delete Button 🗑️ */}
                <button
                    type="button"
                    onClick={() => onRemove(record.id)}
                    className="p-1 hover:bg-rose-50 dark:hover:bg-rose-900/20 text-neutral-400 hover:text-rose-500 rounded transition-all cursor-pointer"
                    title="إزالة من كشف اليوم"
                >
                    🗑️
                </button>
            </div>
        </div>
    );
});
WorkerRecordRow.displayName = 'WorkerRecordRow';

// Extracted Memoized Other Expense Row
interface OtherExpenseRowProps {
    item: OtherExpenseRecord;
    onRemove: (id: string) => void;
}

const OtherExpenseRow: React.FC<OtherExpenseRowProps> = React.memo(({ item, onRemove }) => {
    return (
        <div className="flex justify-between items-center p-1.5 bg-neutral-100/50 dark:bg-neutral-900/30 rounded-lg text-[11px] border border-neutral-150/20">
            <div className="flex items-center gap-1.5 font-bold">
                <span className="text-amber-500">🥪</span>
                <span className="text-neutral-750 dark:text-neutral-300">{item.description}</span>
                <span className={`text-[8px] px-1 py-0.5 rounded font-black ${item.paymentMethod === 'cash' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40' : 'bg-rose-50 text-rose-500 dark:bg-rose-950/40'}`}>
                    {item.paymentMethod === 'cash' ? 'كاش' : 'آجل'}
                </span>
            </div>
            <div className="flex items-center gap-3 font-semibold">
                <span className="font-mono text-amber-600 dark:text-amber-400 font-extrabold">{item.amount} ج.م</span>
                <button
                    type="button"
                    onClick={() => onRemove(item.id)}
                    className="text-neutral-400 hover:text-rose-500 text-xs font-bold cursor-pointer"
                    title="حذف"
                >
                    ✕
                </button>
            </div>
        </div>
    );
});
OtherExpenseRow.displayName = 'OtherExpenseRow';

const UnifiedLaborForm: React.FC<UnifiedLaborFormProps> = ({ 
    onClose, 
    defaultCycleId, 
    laborCategories, 
    onManageActivities 
}) => {
    const { addExpense, cyclesWithCalculations, addExpenseCategory, rawExpenses: expenses } = useData();
    const { settings, updateSettings, language } = useSettings();
    const isEn = language === 'en';

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [hasSelectedGh, setHasSelectedGh] = useState(false);
    const [validationError, setValidationError] = useState<string | null>(null);
    
    // Quick inline add new activity state
    const [isAddingNewActivity, setIsAddingNewActivity] = useState(false);
    const [customActivityInput, setCustomActivityInput] = useState('');
    
    const currentGhs = useMemo(() => settings?.greenhouses || [
        { id: 'mine', name: 'الصوبة الخاصة بي', type: 'mine', is_default: true },
        { id: 'father', name: 'صوبة أبي وأخي', type: 'external' }
    ], [settings?.greenhouses]);

    const defaultStandardActivities = [
        "جمع وحصاد",
        "رش ووقاية",
        "تسميد وري",
        "تقليم وتربيط",
        "عزيق ونظافة وحشائش",
        "تعبئة وتغليف",
        "تحميل وتنزيل",
        "صيانة وشبك",
        "تجهيز شتلات وزراعة",
    ];

    const availableActivities = useMemo(() => {
        const list = settings?.laborActivities || [];
        if (list.length === 0) return defaultStandardActivities;
        return list;
    }, [settings?.laborActivities]);
    
    // Dynamic schema storage for multi-worker entries (Local state with debounced persistence)
    const initialDraftState = useMemo(() => ({
        cycleId: defaultCycleId || (cyclesWithCalculations[0]?.id || ''),
        date: getLocalDateString(),
        activity: '',
        notes: '',
        workerRecords: [] as WorkerRecord[],
        amountPerWorker: '200', // Default initial wage for quick fills
        greenhouseId: 'mine' as string,
        otherExpenses: [] as OtherExpenseRecord[],
        shiftType: 'morning' as 'morning' | 'evening' | 'full_day'
    }), [defaultCycleId, cyclesWithCalculations]);

    const [draft, setDraft] = useState(() => {
        try {
            const saved = localStorage.getItem(DRAFT_STORAGE_KEY);
            if (saved) {
                return { ...initialDraftState, ...JSON.parse(saved) };
            }
        } catch {
            // fallback
        }
        return initialDraftState;
    });

    // Debounced draft persistence to localStorage (500ms)
    useEffect(() => {
        const timer = setTimeout(() => {
            try {
                localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));
            } catch {
                // ignore
            }
        }, 500);
        return () => clearTimeout(timer);
    }, [draft]);

    const clearDraft = useCallback(() => {
        try {
            localStorage.removeItem(DRAFT_STORAGE_KEY);
        } catch {}
        setDraft({
            cycleId: defaultCycleId || (cyclesWithCalculations[0]?.id || ''),
            date: getLocalDateString(),
            activity: '',
            notes: '',
            workerRecords: [],
            amountPerWorker: '200',
            greenhouseId: 'mine',
            otherExpenses: [],
            shiftType: 'morning'
        });
    }, [defaultCycleId, cyclesWithCalculations]);

    const setDate = (val: string) => setDraft(prev => ({ ...prev, date: val }));
    const setActivity = (val: string) => setDraft(prev => ({ ...prev, activity: val }));
    const setNotes = (val: string) => setDraft(prev => ({ ...prev, notes: val }));
    const setAmountPerWorker = (val: string) => setDraft(prev => ({ ...prev, amountPerWorker: val }));
    const setShiftType = (val: 'morning' | 'evening' | 'full_day') => setDraft(prev => ({ ...prev, shiftType: val }));
    
    const setWorkerRecords = useCallback((updater: (prev: WorkerRecord[]) => WorkerRecord[]) => {
        setDraft(prev => ({ ...prev, workerRecords: updater(prev.workerRecords) }));
    }, []);
    
    const setOtherExpenses = useCallback((updater: (prev: OtherExpenseRecord[]) => OtherExpenseRecord[]) => {
        setDraft(prev => ({ ...prev, otherExpenses: updater(prev.otherExpenses || []) }));
    }, []);

    // Callbacks for WorkerRecordRow
    const handleUpdateWorkerAmount = useCallback((id: string, amount: string) => {
        setWorkerRecords(prev => prev.map(r => r.id === id ? { 
            ...r, 
            amount,
            cashAmount: r.paymentMethod === 'split' && Number(r.cashAmount) > Number(amount) ? amount : r.cashAmount
        } : r));
    }, [setWorkerRecords]);

    const handleUpdateWorkerPaymentMethod = useCallback((id: string, method: 'cash' | 'credit' | 'split', cashAmount?: string) => {
        setWorkerRecords(prev => prev.map(r => {
            if (r.id !== id) return r;
            if (method === 'split') {
                return { ...r, paymentMethod: method, cashAmount: cashAmount ?? r.cashAmount };
            }
            return { ...r, paymentMethod: method };
        }));
    }, [setWorkerRecords]);

    const handleOpenWorkerNotes = useCallback((id: string) => {
        setNotesEditingWorkerId(id);
    }, []);

    const handleRemoveWorkerRecord = useCallback((id: string) => {
        setWorkerRecords(prev => prev.filter(r => r.id !== id));
    }, [setWorkerRecords]);

    const handleRemoveOtherExpense = useCallback((id: string) => {
        setOtherExpenses(prev => prev.filter(item => item.id !== id));
    }, [setOtherExpenses]);

    // Parse currently selected activities from draft.activity string
    const selectedActivities = useMemo(() => {
        if (!draft.activity) return [];
        return draft.activity
            .split(/\s*(?:\+|\،|\,)\s*/)
            .map(a => a.trim())
            .filter(Boolean);
    }, [draft.activity]);

    const toggleActivity = (act: string) => {
        setValidationError(null);
        let updated: string[];
        if (selectedActivities.includes(act)) {
            updated = selectedActivities.filter(a => a !== act);
        } else {
            updated = [...selectedActivities, act];
        }
        setActivity(updated.join(' + '));
    };

    const handleCreateNewActivity = () => {
        const trimmed = customActivityInput.trim();
        if (!trimmed) return;
        
        // Add to settings if not exists
        const currentList = settings?.laborActivities || defaultStandardActivities;
        if (!currentList.includes(trimmed)) {
            updateSettings({
                laborActivities: [...currentList, trimmed]
            });
        }
        
        // Select it
        if (!selectedActivities.includes(trimmed)) {
            const updated = [...selectedActivities, trimmed];
            setActivity(updated.join(' + '));
        }
        
        setCustomActivityInput('');
        setIsAddingNewActivity(false);
    };

    const [otherDesc, setOtherDesc] = useState('');
    const [otherAmt, setOtherAmt] = useState('');
    const [otherPayMethod, setOtherPayMethod] = useState<'cash' | 'credit'>('cash');

    const handleAddOtherExpense = () => {
        const desc = otherDesc.trim();
        const amt = otherAmt.trim();
        if (!desc || !amt || Number(amt) <= 0) return;

        setOtherExpenses(prev => [
            ...prev,
            {
                id: `other_${Date.now()}_${Math.random()}`,
                description: desc,
                amount: amt,
                paymentMethod: otherPayMethod
            }
        ]);
        setOtherDesc('');
        setOtherAmt('');
        setOtherPayMethod('cash');
    };

    const { 
        cycleId, 
        date, 
        activity, 
        notes, 
        workerRecords, 
        amountPerWorker, 
        greenhouseId = 'mine',
        otherExpenses = [],
        shiftType = 'morning'
    } = draft;

    // Fallback/Ensure active cycle is set
    useEffect(() => {
        const activeCycles = cyclesWithCalculations.filter(c => c.status === 'active');
        const currentSelectedCycle = cyclesWithCalculations.find(c => c.id === cycleId);
        if (activeCycles.length > 0 && (!currentSelectedCycle || currentSelectedCycle.status !== 'active')) {
            setDraft(prev => ({ ...prev, cycleId: activeCycles[0].id }));
        }
    }, [cyclesWithCalculations, cycleId]);

    // Reset/Clear registration lists on mount so the user starts with a clean slate each time
    useEffect(() => {
        setDraft(prev => ({
            ...prev,
            date: getLocalDateString(),
            activity: '',
            notes: '',
            workerRecords: [],
            otherExpenses: []
        }));
    }, []);

    // Extract unique named workers registered historically to provide search suggestions
    const existingWorkers = useMemo(() => {
        const laborCategoryIds = laborCategories.map(c => c.id);
        const laborExps = expenses.filter(e => laborCategoryIds.includes(e.category_id));
        const names = new Set<string>();
        laborExps.forEach(exp => {
            const desc = exp.description || '';
            if (!desc.includes('يومية بدون اسم') && !desc.includes('بدون اسم') && !desc.includes('منصرف عمالة:')) {
                const match = desc.match(/(?:^|[\s|])عامل:\s*([^|\-]+)/);
                if (match) names.add(match[1].trim());
            }
        });
        return Array.from(names).filter(n => n !== 'شخص بدون اسم' && n !== 'بدون اسم').sort();
    }, [expenses, laborCategories]);

    // Top frequent workers based on historical count
    const quickSuggestedWorkers = useMemo(() => {
        const laborCategoryIds = laborCategories.map(c => c.id);
        const laborExps = expenses.filter(e => laborCategoryIds.includes(e.category_id));
        const frequency: Record<string, number> = {};
        
        laborExps.forEach(exp => {
            const desc = exp.description || '';
            if (!desc.includes('يومية بدون اسم') && !desc.includes('بدون اسم') && !desc.includes('منصرف عمالة:')) {
                const match = desc.match(/(?:^|[\s|])عامل:\s*([^|\-]+)/);
                if (match) {
                    const name = match[1].trim();
                    if (name !== 'شخص بدون اسم' && name !== 'بدون اسم') {
                        frequency[name] = (frequency[name] || 0) + 1;
                    }
                }
            }
        });

        return Object.entries(frequency)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 4)
            .map(([name]) => name);
    }, [expenses, laborCategories]);

    const [searchTerm, setSearchTerm] = useState('');
    const [isExpensesExpanded, setIsExpensesExpanded] = useState(false);
    const [notesEditingWorkerId, setNotesEditingWorkerId] = useState<string | null>(null);

    const filteredWorkers = useMemo(() => {
        if (!searchTerm.trim()) return existingWorkers;
        const norm = searchTerm.trim().toLowerCase();
        return existingWorkers.filter(w => w.toLowerCase().includes(norm));
    }, [existingWorkers, searchTerm]);

    // Toggling helper for checklist
    const toggleWorkerSelection = (workerName: string) => {
        setValidationError(null);
        setWorkerRecords(prev => {
            const exists = prev.find(r => r.name === workerName && !r.isUnnamed);
            if (exists) {
                return prev.filter(r => !(r.name === workerName && !r.isUnnamed));
            } else {
                return [
                    ...prev,
                    {
                        id: `worker_${Date.now()}_${Math.random()}`,
                        name: workerName,
                        amount: amountPerWorker || '200',
                        paymentMethod: 'credit', // Named worker defaults to credit (اجل)
                        cashAmount: '0',
                        isUnnamed: false
                    }
                ];
            }
        });
    };

    // Add fully manual worker in checklist
    const [manualWorkerName, setManualWorkerName] = useState('');
    const handleAddManualWorker = () => {
        const name = manualWorkerName.trim();
        if (!name) return;
        setValidationError(null);

        // Check duplicates
        const duplicated = workerRecords.find(r => r.name.toLowerCase() === name.toLowerCase() && !r.isUnnamed);
        if (duplicated) {
            setValidationError(`العامل "${name}" مضاف بالفعل في قائمة التحضير أدناه`);
            return;
        }

        setWorkerRecords(prev => [
            ...prev,
            {
                id: `manual_${Date.now()}_${Math.random()}`,
                name: name,
                amount: amountPerWorker || '200',
                paymentMethod: 'credit',
                cashAmount: '0',
                isUnnamed: false
            }
        ]);
        setManualWorkerName('');
    };

    // Add unnamed/anonymous operator row
    const handleAddUnnamedWorker = () => {
        setValidationError(null);
        setWorkerRecords(prev => [
            ...prev,
            {
                id: `unnamed_${Date.now()}_${Math.random()}`,
                name: 'شخص بدون اسم',
                amount: amountPerWorker || '200',
                paymentMethod: 'cash', // forced cash
                cashAmount: '0',
                isUnnamed: true
            }
        ]);
    };

    // Quick Action: Apply the currently chosen general daily wage to all worker records
    const handleApplyWageToAll = () => {
        if (!amountPerWorker || Number(amountPerWorker) <= 0) return;
        setWorkerRecords(prev => prev.map(rec => ({
            ...rec,
            amount: amountPerWorker,
            // also guard split payments if they exceed the new wage
            cashAmount: rec.paymentMethod === 'split' && Number(rec.cashAmount) > Number(amountPerWorker) 
                ? amountPerWorker 
                : rec.cashAmount
        })));
    };

    // Calculate aggregated totals of the current prep list and other expenses
    const totalsSummary = useMemo(() => {
        const count = workerRecords.length;
        let totalWage = 0;
        let totalCash = 0;
        let totalCredit = 0;

        workerRecords.forEach(rec => {
            const amt = Number(rec.amount) || 0;
            totalWage += amt;
            if (rec.paymentMethod === 'cash') {
                totalCash += amt;
            } else if (rec.paymentMethod === 'credit') {
                totalCredit += amt;
            } else if (rec.paymentMethod === 'split') {
                const cash = Number(rec.cashAmount) || 0;
                totalCash += cash;
                totalCredit += Math.max(0, amt - cash);
            }
        });

        let totalOtherExpenses = 0;
        let totalOtherCash = 0;
        let totalOtherCredit = 0;

        (otherExpenses || []).forEach(item => {
            const amt = Number(item.amount) || 0;
            totalOtherExpenses += amt;
            if (item.paymentMethod === 'cash') {
                totalOtherCash += amt;
            } else {
                totalOtherCredit += amt;
            }
        });

        const overallTotal = totalWage + totalOtherExpenses;
        const overallCash = totalCash + totalOtherCash;
        const overallCredit = totalCredit + totalOtherCredit;

        return { 
            count, 
            totalWage, 
            totalCash, 
            totalCredit,
            totalOtherExpenses,
            totalOtherCash,
            totalOtherCredit,
            overallTotal,
            overallCash,
            overallCredit
        };
    }, [workerRecords, otherExpenses]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        triggerSaveHaptic();
        setValidationError(null);

        if (workerRecords.length === 0 && (otherExpenses || []).length === 0) {
            setValidationError('برجاء تحديد أو إضافة عامل واحد على الأقل لكشف الحضور أو تسجيل مصروف إضافي واحد.');
            return;
        }

        if (workerRecords.length > 0 && (!activity || activity.trim() === '')) {
            setValidationError(isEn ? 'Please select at least one activity.' : 'برجاء كتابة النشاط أولاً قبل حفظ كشف العمالة.');
            return;
        }

        // Validate splits and entries
        for (const rec of workerRecords) {
            const wage = Number(rec.amount) || 0;
            if (wage <= 0) {
                setValidationError(`يرجى تحديد أجر يومية صحيح للشخص: ${rec.name}`);
                return;
            }
            if (rec.paymentMethod === 'split') {
                const cashAmt = Number(rec.cashAmount) || 0;
                if (cashAmt <= 0) {
                    setValidationError(`برجاء تحديد دفعة الكاش المستلمة للعامل "${rec.name}"، أو قم بتحويل خيار الصرف لـ آجل بالكامل.`);
                    return;
                }
                if (cashAmt > wage) {
                    setValidationError(`المبلغ المسحوب كاش (${cashAmt} ج.م) للعامل "${rec.name}" لا يمكن أن يتخطى أجر اليومية الكلي (${wage} ج.م)`);
                    return;
                }
            }
        }

        setIsSubmitting(true);
        
        try {
            let categoryId = laborCategories[0]?.id;
            if (!categoryId) {
                categoryId = await addExpenseCategory({ name: 'عمالة', is_supplier_category: false });
            }

            const matchedGh = currentGhs.find(g => g.id === greenhouseId) || currentGhs[0];
            const prefix = matchedGh.type === 'external' ? `🏠 ${matchedGh.name} | ` : '';
            const cleanActivity = Array.from(new Set(activity.split(/\s*(?:\+|\،|\,|\/)\s*/).map(s => s.trim()).filter(Boolean))).join(' + ') || activity.trim();
            
            // Loop and save each worker record
            for (const rec of workerRecords) {
                const name = rec.name.trim();
                const totalAmt = Number(rec.amount);
                const workerNote = rec.notes ? rec.notes.trim() : '';

                if (rec.isUnnamed || name === 'شخص بدون اسم') {
                    // Unnamed cash worker
                    let finalDescription = `${prefix}يومية بدون اسم - ${cleanActivity}`;
                    if (workerNote) finalDescription += ` | ملاحظة العامل: ${workerNote}`;
                    if (notes) finalDescription += ` | ملاحظات: ${notes}`;

                    await addExpense({
                        description: finalDescription,
                        amount: totalAmt,
                        category_id: categoryId,
                        cycle_id: cycleId,
                        date: date,
                        payment_method: 'cash',
                        is_establishment: false,
                        shift_type: shiftType
                    });
                } else if (rec.paymentMethod === 'split') {
                    // Split Payment -> Save full gross wage as credit, and cash part as advance
                    const advanceAmt = Number(rec.cashAmount);

                    // 1. Full Wage as Credit
                    let descCredit = `${prefix}عامل: ${name} | ${cleanActivity} (يومية عمل آجل)`;
                    if (workerNote) descCredit += ` | ملاحظة العامل: ${workerNote}`;
                    if (notes) descCredit += ` | ملاحظات الكشف: ${notes}`;

                    await addExpense({
                        description: descCredit,
                        amount: totalAmt,
                        category_id: categoryId,
                        cycle_id: cycleId,
                        date: date,
                        payment_method: 'credit',
                        is_establishment: false,
                        shift_type: shiftType
                    });

                    // 2. Advance Taken
                    if (advanceAmt > 0) {
                        let descAdvance = `${prefix}عامل: ${name} | صرف سلفة نقدية على الحساب`;
                        if (workerNote) descAdvance += ` | ${workerNote}`;

                        await addExpense({
                            description: descAdvance,
                            amount: advanceAmt,
                            category_id: categoryId,
                            cycle_id: cycleId,
                            date: date,
                            payment_method: 'cash',
                            is_establishment: false
                        });
                    }
                } else {
                    // Standard named worker (Fully Cash or Fully Credit)
                    let desc = `${prefix}عامل: ${name} | ${cleanActivity}`;
                    if (rec.paymentMethod === 'credit') {
                        desc += ' (يومية عمل آجل)';
                    }
                    if (workerNote) desc += ` | ملاحظة العامل: ${workerNote}`;
                    if (notes) desc += ` | ملاحظات الكشف: ${notes}`;

                    await addExpense({
                        description: desc,
                        amount: totalAmt,
                        category_id: categoryId,
                        cycle_id: cycleId,
                        date: date,
                        payment_method: rec.paymentMethod,
                        is_establishment: false,
                        shift_type: shiftType
                    });
                }
            }

            // A helper to automatically assign specific sub-categories for other expenses when applicable
            const getCategoryIdForExpense = (descStr: string) => {
                const normDesc = descStr.toLowerCase();
                const matched = laborCategories.find(cat => {
                    const catName = cat.name.toLowerCase();
                    if (normDesc.includes('فطار') && catName.includes('فطار')) return true;
                    if (normDesc.includes('ضيافة') && catName.includes('ضيافة')) return true;
                    if (normDesc.includes('مواصلات') && catName.includes('مواصلات')) return true;
                    if (normDesc.includes('إكرام') && catName.includes('إكرام')) return true;
                    if (normDesc.includes('نثريات') && catName.includes('نثريات')) return true;
                    return false;
                });
                return matched ? matched.id : categoryId;
            };

            // Loop and save other daily expenses
            for (const item of (otherExpenses || [])) {
                const descStr = item.description.trim();
                const amtVal = Number(item.amount);
                const finalDescription = `${prefix}منصرف عمالة: ${descStr}`;
                const expenseCatId = getCategoryIdForExpense(descStr);

                await addExpense({
                    description: finalDescription,
                    amount: amtVal,
                    category_id: expenseCatId,
                    cycle_id: cycleId,
                    date: date,
                    payment_method: item.paymentMethod,
                    is_establishment: false,
                    shift_type: shiftType
                });
            }

            clearDraft();
            onClose();
        } catch (error) {
            console.error(error);
            setValidationError('حدث خطأ أثناء حفظ ومزامنة البيانات بالدفاتر');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!hasSelectedGh) {
        return (
            <div className="space-y-6 py-4 px-1 text-right animate-fade-in">
                <div className="text-center space-y-2">
                    <div className="w-16 h-16 mx-auto bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 rounded-full flex items-center justify-center text-3xl shadow-inner animate-pulse">
                        🌱
                    </div>
                    <h3 className="text-lg font-black text-neutral-800 dark:text-neutral-100 mt-3 font-sans">
                        أين عملت العمالة اليوم؟
                    </h3>
                    <p className="text-xs font-bold text-neutral-450 dark:text-neutral-400 max-w-sm mx-auto leading-relaxed">
                        لتفادي الأخطاء في حسابات الأرباح والخزنة، يرجى تحديد الصوبة المستفيدة من هذا العمل أولاً:
                    </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                    {currentGhs.map(gh => {
                        const isMine = gh.type === 'mine';
                        return (
                            <button
                                key={gh.id}
                                type="button"
                                onClick={() => {
                                    setDraft(p => ({ ...p, greenhouseId: gh.id }));
                                    setHasSelectedGh(true);
                                }}
                                className={`group p-5 rounded-3xl border-2 text-right transition-all duration-300 transform hover:-translate-y-1 hover:shadow-lg cursor-pointer flex flex-col justify-between h-44 ${
                                    isMine
                                        ? 'bg-emerald-50/20 hover:bg-emerald-50/50 dark:bg-emerald-950/10 dark:hover:bg-emerald-950/25 border-emerald-500/20 hover:border-emerald-500 focus:ring-4 focus:ring-emerald-500/20'
                                        : 'bg-indigo-50/20 hover:bg-indigo-50/50 dark:bg-indigo-950/10 dark:hover:bg-indigo-950/25 border-indigo-500/20 hover:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20'
                                }`}
                            >
                                <div className="flex items-center justify-between w-full">
                                    <span className={`text-[10px] font-black px-2.5 py-1 rounded-full uppercase ${
                                        isMine 
                                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300' 
                                            : 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300'
                                    }`}>
                                        {isMine ? 'الصوبة الرئيسية (الخاصة بي)' : 'صوبة خارجية (أبي وأخي)'}
                                    </span>
                                    <span className="text-2xl group-hover:scale-110 transition-transform duration-300">
                                        {isMine ? '🌿' : '🏠'}
                                    </span>
                                </div>

                                <div className="space-y-1 my-2">
                                    <h4 className="text-sm sm:text-base font-black text-neutral-855 dark:text-white group-hover:text-amber-500 transition-colors">
                                        {gh.name}
                                    </h4>
                                    <p className="text-[10px] sm:text-[11px] font-semibold text-neutral-400 dark:text-neutral-400 leading-normal">
                                        {isMine 
                                            ? 'ترتبط بحسابات العروة الحالية وتؤثر على صافي أرباحك وتكاليف التشغيل.' 
                                            : 'حساب منفصل تماماً، ستصرف اليوميات كاش من الخزنة لضبط رصيد صوبة أبي.'}
                                    </p>
                                </div>

                                <div className="flex items-center gap-1.5 text-[9px] font-black justify-end text-neutral-400 dark:text-neutral-500 mt-auto group-hover:underline">
                                    <span>اضغط للتحديد ودخول الدفتر</span>
                                    <span>←</span>
                                </div>
                            </button>
                        );
                    })}
                </div>

                <div className="pt-4 flex flex-col items-center gap-3">
                    <p className="text-[10px] font-bold text-amber-600 bg-amber-500/5 px-4 py-2 rounded-xl text-center border border-amber-500/10 leading-relaxed">
                        ⚠️ هذا الاختيار الإجباري صُمم لحماية حسابات الصوب المختلفة من التداخل وتسهيل جرد الربح بدقة وشفافية.
                    </p>
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-6 py-2 bg-neutral-100 hover:bg-neutral-120 dark:bg-neutral-800 dark:hover:bg-neutral-750 text-neutral-500 dark:text-neutral-400 rounded-xl text-xs font-black transition-colors cursor-pointer"
                    >
                        إلغاء وتراجع
                    </button>
                </div>
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit} className="flex flex-col h-[75vh] md:h-[80vh] text-right text-neutral-800 dark:text-neutral-100 relative">
            {/* Scrollable Container Body */}
            <div className="flex-1 overflow-y-auto p-3 bg-gray-50 dark:bg-neutral-950/40 space-y-4 pb-4 rounded-2xl scrollbar-thin scrollbar-thumb-neutral-200 dark:scrollbar-thumb-neutral-800">
                
                {/* 1. COMPACT GENERAL SETTINGS HEADER CARD */}
                <div className="bg-white dark:bg-neutral-900 rounded-xl p-4 space-y-3.5 shadow-sm border border-neutral-100 dark:border-neutral-800/80">
                    <div className="flex flex-wrap items-center justify-between gap-1.5 text-xs">
                        {/* Selected Greenhouse */}
                        <div className="flex items-center gap-1.5">
                            <span className="text-sm">
                                {currentGhs.find(g => g.id === greenhouseId)?.type === 'mine' ? '🌿' : '🏠'}
                            </span>
                            <span className="font-extrabold text-neutral-750 dark:text-neutral-300">
                                {currentGhs.find(g => g.id === greenhouseId)?.name || '...'}
                            </span>
                            <button
                                type="button"
                                onClick={() => setHasSelectedGh(false)}
                                className="text-[10px] text-emerald-600 dark:text-emerald-400 hover:underline font-bold"
                            >
                                (تغيير)
                            </button>
                        </div>
                        
                        {/* Connected Crop Cycle */}
                        <div className="text-[9px] font-bold text-neutral-450 dark:text-neutral-400 bg-neutral-100 dark:bg-neutral-800/80 px-2 py-0.5 rounded">
                            {cyclesWithCalculations.find(c => c.id === cycleId)?.name || 'العروة الحالية'}
                        </div>
                    </div>

                    {/* Shift Type Segmented Control */}
                    <div className="flex flex-col pt-1.5 pb-0.5">
                        <span className="text-[9px] font-bold text-neutral-405 dark:text-neutral-450 mb-1">وردية العمل / الفترة</span>
                        <div className="grid grid-cols-3 gap-1 bg-neutral-100 dark:bg-neutral-900/60 p-0.5 rounded-lg border border-neutral-200/50 dark:border-neutral-800">
                            {[
                                { id: 'morning', label: '🌅 صباحية', activeColor: 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400 border-amber-300/50' },
                                { id: 'evening', label: '🌇 مسائية', activeColor: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-400 border-indigo-300/50' },
                                { id: 'full_day', label: '☀️ يوم كامل', activeColor: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400 border-emerald-300/50' }
                            ].map((shift) => (
                                <button
                                    key={shift.id}
                                    type="button"
                                    onClick={() => setShiftType(shift.id as any)}
                                    className={`py-1 px-2 text-[11px] font-bold rounded-md transition-all text-center cursor-pointer border ${
                                        shiftType === shift.id
                                            ? `${shift.activeColor} shadow-sm font-black`
                                            : 'border-transparent text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300'
                                    }`}
                                >
                                    {shift.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Compact inputs setup row */}
                    <div className="space-y-3 pt-1">
                        {/* Date & Default Wage Setup */}
                        <div className="grid grid-cols-2 gap-3">
                            {/* Date Input */}
                            <div className="flex flex-col">
                                <span className="text-[9px] font-bold text-neutral-405 dark:text-neutral-450 mb-0.5">التاريخ</span>
                                <input 
                                    type="date" 
                                    required 
                                    value={date} 
                                    onChange={e => setDate(e.target.value)} 
                                    className="w-full bg-white dark:bg-neutral-950 border border-neutral-200/60 dark:border-neutral-805 rounded-lg px-2.5 py-1.5 text-xs font-mono font-semibold text-neutral-700 dark:text-neutral-200 outline-none focus:ring-1 focus:ring-emerald-500/20" 
                                />
                            </div>

                            {/* Default wage Setup */}
                            <div className="flex flex-col">
                                <label className="text-[9px] font-bold text-neutral-405 dark:text-neutral-450 mb-0.5 flex justify-between items-center">
                                    <span>يومية افتراضية</span>
                                    {workerRecords.length > 0 && (
                                        <button
                                            type="button"
                                            onClick={handleApplyWageToAll}
                                            className="text-[8px] text-emerald-600 hover:underline cursor-pointer font-bold"
                                            title="تطبيق اليومية على الكشف"
                                        >
                                            تعميم
                                        </button>
                                    )}
                                </label>
                                <div className="flex items-center gap-1 bg-white dark:bg-neutral-950 border border-neutral-200/60 dark:border-neutral-805 rounded-lg px-2 py-1.5 focus-within:ring-1 focus-within:ring-emerald-500/20">
                                    <span dir="ltr" className="font-mono flex-1">
                                        <input 
                                            type="text" 
                                            inputMode="decimal"
                                            pattern="[0-9]*"
                                            value={amountPerWorker} 
                                            onChange={e => setAmountPerWorker(e.target.value)} 
                                            className="w-full bg-transparent text-left outline-none border-none p-0 text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400" 
                                            dir="ltr"
                                            lang="en"
                                        />
                                    </span>
                                    <span className="text-[9px] text-neutral-400 font-bold shrink-0">ج.م</span>
                                </div>
                            </div>
                        </div>

                        {/* Activities Multi-Select Header & Chips */}
                        <div className="flex flex-col space-y-1.5 p-2.5 bg-neutral-50 dark:bg-neutral-950/60 rounded-xl border border-neutral-200/50 dark:border-neutral-800">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1.5">
                                    <span className="text-[10px] font-black text-neutral-700 dark:text-neutral-300">
                                        🎯 الأنشطة والمهام (اختر نشاطاً أو أكثر):
                                    </span>
                                    {selectedActivities.length > 0 && (
                                        <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300">
                                            {selectedActivities.length} محدد
                                        </span>
                                    )}
                                </div>
                                
                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setIsAddingNewActivity(!isAddingNewActivity)}
                                        className="text-[9px] font-black text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-0.5 cursor-pointer"
                                    >
                                        <PlusIcon className="w-3 h-3" />
                                        <span>نشاط جديد</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={onManageActivities}
                                        className="p-1 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 rounded-md transition-colors cursor-pointer"
                                        title="إدارة وتعديل قائمة الأنشطة (الترس)"
                                    >
                                        <SettingsIcon className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            </div>

                            {/* Quick Add Custom Activity Inline Input */}
                            {isAddingNewActivity && (
                                <div className="flex items-center gap-1.5 pt-1 animate-fade-in">
                                    <input
                                        type="text"
                                        autoFocus
                                        value={customActivityInput}
                                        onChange={e => setCustomActivityInput(e.target.value)}
                                        onKeyDown={e => {
                                            if (e.key === 'Enter') {
                                                e.preventDefault();
                                                handleCreateNewActivity();
                                            }
                                        }}
                                        placeholder="اكتب اسم النشاط الجديد (مثل: تقليم شتلات)..."
                                        className="flex-1 bg-white dark:bg-neutral-900 border border-emerald-500 rounded-lg px-2.5 py-1 text-xs font-bold outline-none text-right"
                                    />
                                    <button
                                        type="button"
                                        onClick={handleCreateNewActivity}
                                        className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-black transition-colors cursor-pointer"
                                    >
                                        إضافة واختيار
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setIsAddingNewActivity(false);
                                            setCustomActivityInput('');
                                        }}
                                        className="p-1 text-neutral-400 hover:text-rose-500 rounded-lg"
                                    >
                                        <XMarkIcon className="w-4 h-4" />
                                    </button>
                                </div>
                            )}

                            {/* Activity Chips Multi-Selector */}
                            <div className="flex flex-wrap gap-1.5 pt-1 max-h-28 overflow-y-auto custom-scrollbar pr-0.5">
                                {availableActivities.map(act => {
                                    const isSelected = selectedActivities.includes(act);
                                    return (
                                        <button
                                            key={act}
                                            type="button"
                                            onClick={() => toggleActivity(act)}
                                            className={`text-[10px] px-2.5 py-1 rounded-lg border transition-all cursor-pointer flex items-center gap-1 shadow-2xs font-bold select-none ${
                                                isSelected
                                                    ? 'bg-emerald-600 border-emerald-600 text-white shadow-xs font-black scale-[1.02]'
                                                    : 'bg-white dark:bg-neutral-900 border-neutral-200/80 dark:border-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800/80'
                                            }`}
                                        >
                                            <span>{act}</span>
                                            <span className={`text-[9px] ${isSelected ? 'text-white' : 'text-neutral-400'}`}>
                                                {isSelected ? '✓' : '+'}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Multi-Activity Cost Division Insight Banner */}
                            {selectedActivities.length > 1 && (
                                <div className="mt-1 p-1.5 bg-amber-50 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-900/30 rounded-lg text-[9.5px] font-bold text-amber-800 dark:text-amber-300 flex items-center justify-between">
                                    <span className="flex items-center gap-1">
                                        <span>⚡ تقسيم تلقائي:</span>
                                        <span>{selectedActivities.join(' + ')}</span>
                                    </span>
                                    <span className="font-mono font-black text-emerald-600 dark:text-emerald-400 shrink-0">
                                        ({Math.round((Number(amountPerWorker) || 0) / selectedActivities.length)} ج.م / نشاط)
                                    </span>
                                </div>
                            )}

                            {selectedActivities.length === 0 && (
                                <div className="text-[9px] font-bold text-amber-600 dark:text-amber-400 pt-0.5">
                                    ⚠️ {isEn ? 'Please select at least one activity.' : 'يرجى النقر على نشاط واحد على الأقل لتحديده لهذا الكشف.'}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Validation errors */}
                {validationError && (
                    <div className="p-2 border border-rose-100 dark:border-rose-900/40 bg-rose-50/50 dark:bg-rose-950/10 text-rose-600 dark:text-rose-450 rounded-lg text-xs leading-relaxed font-bold animate-shake">
                        ⚠️ {validationError}
                    </div>
                )}

                {/* 2. CARD FOR WORKERS SELECTION AND ATTENDANCE LIST */}
                <div className="bg-white dark:bg-neutral-900 rounded-xl p-4 space-y-4 shadow-sm border border-neutral-100 dark:border-neutral-800/80">
                    {/* Search Bar - Full Width with overlay for new attendance button */}
                    <div className="relative w-full">
                        <input
                            type="text"
                            placeholder="🔍 ابحث بالاسم أو اكتب اسماً جديداً..."
                            value={searchTerm}
                            onChange={(e) => {
                                setSearchTerm(e.target.value);
                                setManualWorkerName(e.target.value);
                            }}
                            className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200/80 dark:border-neutral-800 rounded-lg px-2.5 py-1.5 text-xs text-neutral-800 dark:text-neutral-100 outline-none focus:ring-1 focus:ring-emerald-500/20"
                        />
                        {searchTerm.trim() && !filteredWorkers.includes(searchTerm.trim()) && (
                            <button 
                                type="button" 
                                onClick={handleAddManualWorker}
                                className="absolute left-1 top-1/2 -translate-y-1/2 bg-emerald-500 hover:bg-emerald-600 text-white px-2.5 py-1 text-[10px] font-black rounded-md transition-all cursor-pointer shadow-sm"
                            >
                                + حضور جديد
                            </button>
                        )}
                    </div>

                    {/* Suggested Workers & Unnamed Cash Horizontal Scroll */}
                    <div className="flex items-center overflow-x-auto gap-2 pb-1 scrollbar-none hide-scrollbar w-full">
                        <button 
                            type="button" 
                            onClick={handleAddUnnamedWorker}
                            className="bg-amber-50 hover:bg-amber-105 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 px-3 py-1.5 text-[10px] font-black rounded-lg shrink-0 transition-all border border-amber-200/40 dark:border-amber-900/20 cursor-pointer flex items-center gap-1 shadow-xs"
                        >
                            👥 مجهول (كاش)
                        </button>

                        {quickSuggestedWorkers.length > 0 && (
                            <div className="border-r border-neutral-200 dark:border-neutral-800 h-5 shrink-0" />
                        )}

                        {quickSuggestedWorkers.map(w => {
                            const isSel = !!workerRecords.find(r => r.name === w && !r.isUnnamed);
                            return (
                                <button
                                    key={w}
                                    type="button"
                                    onClick={() => toggleWorkerSelection(w)}
                                    className={`text-[10px] px-2.5 py-1.5 rounded-lg border transition-all shrink-0 cursor-pointer flex items-center gap-1 shadow-xs ${
                                        isSel
                                            ? 'bg-emerald-600 border-emerald-600 text-white font-extrabold shadow-sm'
                                            : 'bg-white dark:bg-neutral-900 border-neutral-150 dark:border-neutral-800 text-neutral-600 dark:text-neutral-450 hover:bg-neutral-50 dark:hover:bg-neutral-850'
                                    }`}
                                >
                                    <span>{w}</span>
                                    <span className="text-[9px]">{isSel ? '✓' : '+'}</span>
                                </button>
                            );
                        })}
                    </div>

                    {/* Historical workers toggle wrap */}
                    {existingWorkers.length > 0 && (
                        <div className="max-h-24 overflow-y-auto flex flex-wrap gap-1 pr-1 custom-scrollbar">
                            {filteredWorkers.map(w => {
                                const isSelected = !!workerRecords.find(r => r.name === w && !r.isUnnamed);
                                return (
                                    <button
                                        key={w}
                                        type="button"
                                        onClick={() => toggleWorkerSelection(w)}
                                        className={`px-2 py-1 rounded-lg text-right transition-all border text-[10px] cursor-pointer flex items-center gap-1 ${
                                            isSelected 
                                                ? 'bg-emerald-50/40 dark:bg-emerald-950/15 border-emerald-305 dark:border-emerald-805 text-emerald-850 dark:text-emerald-400 font-bold shadow-none' 
                                                : 'bg-white dark:bg-neutral-900 border-neutral-150 dark:border-neutral-800 text-neutral-600 dark:text-neutral-450 hover:bg-neutral-50'
                                        }`}
                                    >
                                        <span>{w}</span>
                                        {isSelected && <span className="text-[9px] text-emerald-700">✓</span>}
                                    </button>
                                );
                            })}
                            {filteredWorkers.length === 0 && (
                                <div className="text-center py-2 text-[10px] font-bold text-neutral-400 w-full">
                                    لا توجد عمالة مطابقة للبحث. اكتب الاسم في الأعلى وانقر زر "إضافة".
                                </div>
                            )}
                        </div>
                    )}

                    {/* 3. Common Shared Notes Input */}
                    <div className="relative">
                        <input 
                            type="text" 
                            value={notes} 
                            onChange={e => setNotes(e.target.value)} 
                            placeholder="✍️ كرت ملاحظة عامة مخصصة للكشف بالكامل اختيارية..." 
                            className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-150 dark:border-neutral-850 rounded-lg px-2.5 py-1.5 text-[11px] outline-none text-neutral-750 dark:text-neutral-300 focus:ring-1 focus:ring-emerald-500/20" 
                        />
                    </div>

                    {/* 4. TODAY'S ATTENDANCE FLAT LIST OF WORKERS */}
                    <div className="space-y-1.5 pt-2 border-t border-neutral-100 dark:border-neutral-800/60">
                        <div className="flex justify-between items-center px-1">
                            <h3 className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">العمال الحاضرون اليوم <span className="font-mono">({workerRecords.length})</span></h3>
                            <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-bold">
                                (انقر 📝 لإثبات السلف والملاحظات والمجهود)
                            </span>
                        </div>

                        {workerRecords.length === 0 ? (
                            <div className="border border-dashed border-neutral-200 dark:border-neutral-800 p-8 rounded-xl text-center shadow-none bg-neutral-50/20">
                                <p className="text-[11px] font-bold text-neutral-400">كشف التحضير فارغ</p>
                                <p className="text-[9px] text-neutral-400 mt-0.5">انقر على عمال من الأعلى لبدء كشف اليوميات.</p>
                            </div>
                        ) : (
                            <div className="space-y-1 max-h-[300px] overflow-y-auto pr-0.5 custom-scrollbar">
                                {workerRecords.map((rec) => (
                                    <WorkerRecordRow
                                        key={rec.id}
                                        record={rec}
                                        onUpdateAmount={handleUpdateWorkerAmount}
                                        onUpdatePaymentMethod={handleUpdateWorkerPaymentMethod}
                                        onOpenNotes={handleOpenWorkerNotes}
                                        onRemove={handleRemoveWorkerRecord}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* 3. CARD FOR OTHER DAILY EXPENSES */}
                <div className="bg-white dark:bg-neutral-900 rounded-xl p-4 space-y-3.5 shadow-sm border border-neutral-100 dark:border-neutral-800/80 animate-fade-in">
                    <div className="flex justify-between items-center px-1">
                        <span className="text-xs font-black text-neutral-700 dark:text-neutral-300 flex items-center gap-1.5">
                            🥪 مصروفات اليوم الأخرى (فطور، شاي وضيافة، مواصلات، إلخ)
                        </span>
                        {otherExpenses.length > 0 && (
                            <span className="text-[10px] bg-amber-500/10 text-amber-600 px-2 py-0.5 rounded-full font-black font-mono">
                                + {formatNumber(totalsSummary.totalOtherExpenses)} ج.م
                            </span>
                        )}
                    </div>

                    {/* Accordion Trigger Button */}
                    <button
                        type="button"
                        onClick={() => setIsExpensesExpanded(!isExpensesExpanded)}
                        className="w-full py-2.5 px-4 bg-neutral-50 hover:bg-neutral-100 dark:bg-neutral-800 dark:hover:bg-neutral-750 text-neutral-600 dark:text-neutral-300 rounded-xl text-xs font-bold transition-all flex items-center justify-between border border-neutral-200/50 dark:border-neutral-700 cursor-pointer shadow-xs"
                    >
                        <span className="flex items-center gap-1.5">
                            {isExpensesExpanded ? '✨ إخفاء لوحة الإدخال' : '➕ إضافة مصروفات أخرى (فطور، شاي، مواصلات...)'}
                        </span>
                        <span className="text-neutral-400 text-[10px]">{isExpensesExpanded ? '▲' : '▼'}</span>
                    </button>

                    {isExpensesExpanded && (
                        <div className="space-y-3 pt-2 border-t border-neutral-100 dark:border-neutral-800/60 animate-fade-in">
                            <div className="grid grid-cols-1 gap-2">
                                {/* Row 1: description */}
                                <div className="space-y-0.5">
                                    <span className="text-[9px] font-bold text-neutral-455 dark:text-neutral-500 block">وصف المصروف</span>
                                    <input
                                        type="text"
                                        placeholder="مثال: فطار للعمال، شاي وضيافة..."
                                        value={otherDesc}
                                        onChange={e => setOtherDesc(e.target.value)}
                                        className="w-full bg-white dark:bg-neutral-950 border border-neutral-200/60 dark:border-neutral-805 rounded-lg px-2.5 py-1.5 text-xs text-neutral-800 dark:text-neutral-100 outline-none focus:ring-1 focus:ring-amber-500/20"
                                    />
                                </div>

                                {/* Row 2: Amount, Payment Method, and Add Button */}
                                <div className="flex gap-2 items-end">
                                    {/* Expense amount */}
                                    <div className="flex-1 space-y-0.5">
                                        <span className="text-[9px] font-bold text-neutral-455 dark:text-neutral-500 block">المبلغ</span>
                                        <div className="relative">
                                            <input
                                                type="text"
                                                inputMode="decimal"
                                                pattern="[0-9]*"
                                                placeholder="0"
                                                value={otherAmt}
                                                onChange={e => setOtherAmt(e.target.value)}
                                                className="w-full bg-white dark:bg-neutral-950 border border-neutral-200/60 dark:border-neutral-805 rounded-lg pl-8 pr-1.5 py-1.5 text-xs font-mono font-bold text-amber-600 text-left outline-none focus:ring-1 focus:ring-amber-500/20"
                                                dir="ltr"
                                                lang="en"
                                            />
                                            <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-[8px] text-neutral-400 font-bold font-mono">ج.م</span>
                                        </div>
                                        {/* Quick Amount Chips */}
                                        <div className="flex gap-1.5 mt-1.5">
                                            {['20', '50', '100'].map(val => (
                                                <button
                                                    key={val}
                                                    type="button"
                                                    onClick={() => setOtherAmt(val)}
                                                    className="text-xs bg-gray-100 dark:bg-neutral-800 text-gray-700 dark:text-neutral-300 px-2.5 py-1 rounded-full cursor-pointer hover:bg-green-100 dark:hover:bg-emerald-950/30 hover:text-green-800 dark:hover:text-green-300 transition-all font-bold"
                                                >
                                                    {val}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* payment method: cash / credit */}
                                    <div className="w-24 space-y-0.5 self-start">
                                        <span className="text-[9px] font-bold text-neutral-455 dark:text-neutral-500 block">طريقة الصرف</span>
                                        <select
                                            value={otherPayMethod}
                                            onChange={e => setOtherPayMethod(e.target.value as 'cash' | 'credit')}
                                            className="w-full bg-white dark:bg-neutral-950 border border-neutral-200/60 dark:border-neutral-805 rounded-lg px-1.5 py-1.5 text-xs font-bold text-neutral-700 dark:text-neutral-200 outline-none cursor-pointer focus:ring-1 focus:ring-amber-500/20"
                                        >
                                            <option value="cash">كاش</option>
                                            <option value="credit">آجل</option>
                                        </select>
                                    </div>

                                    {/* Add button */}
                                    <button
                                        type="button"
                                        onClick={handleAddOtherExpense}
                                        disabled={!otherDesc.trim() || !otherAmt || Number(otherAmt) <= 0}
                                        className="bg-amber-500 hover:bg-amber-600 disabled:opacity-40 text-white font-extrabold px-3 py-1 cursor-pointer h-[32px] self-start mt-4 rounded-lg text-xs shrink-0 transition-all flex items-center justify-center gap-1"
                                    >
                                        ➕ إضافة
                                    </button>
                                </div>
                            </div>

                            {/* common suggestion chips */}
                            <div className="flex gap-1.5 overflow-x-auto py-1.5 hide-scrollbar">
                                {['فطار للعمال', 'شاي وضيافة', 'مواصلات ونقل', 'إكرامية للعمال', 'عمولة ميزان'].map(preset => (
                                    <button
                                        key={preset}
                                        type="button"
                                        onClick={() => setOtherDesc(preset)}
                                        className="text-xs bg-gray-100 dark:bg-neutral-800 text-gray-700 dark:text-neutral-300 px-2.5 py-1 rounded-full cursor-pointer hover:bg-green-100 dark:hover:bg-emerald-950/30 hover:text-green-800 dark:hover:text-green-300 transition-all font-bold border border-neutral-150/40 dark:border-neutral-800/80"
                                    >
                                        {preset}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* List of active temporary other expenses */}
                    {otherExpenses.length > 0 && (
                        <div className="space-y-1.5 pt-1.5 border-t border-neutral-200/40 dark:border-neutral-800">
                            {otherExpenses.map(item => (
                                <OtherExpenseRow
                                    key={item.id}
                                    item={item}
                                    onRemove={handleRemoveOtherExpense}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* POPUP/DIALOG MODAL FOR WORKER NOTES & SPLIT DETAILS */}
            {notesEditingWorkerId && (() => {
                const rec = workerRecords.find(r => r.id === notesEditingWorkerId);
                if (!rec) return null;
                const isSplit = rec.paymentMethod === 'split';
                const parsedWage = Number(rec.amount) || 0;
                const parsedCash = Number(rec.cashAmount) || 0;
                const remainingCredit = Math.max(0, parsedWage - parsedCash);

                return (
                    <div className="fixed inset-0 bg-black/35 backdrop-blur-xs flex items-center justify-center p-4 z-50 text-right">
                        <div className="bg-white dark:bg-neutral-900 rounded-2xl p-4 max-w-sm w-full border border-neutral-100 dark:border-neutral-800 space-y-3.5 shadow-xl animate-scale-up">
                            <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 pb-2">
                                <h4 className="text-xs font-black text-neutral-750 dark:text-neutral-200">
                                    تفاصيل إضافية للحلول: {rec.name}
                                </h4>
                                <button 
                                    type="button" 
                                    onClick={() => setNotesEditingWorkerId(null)} 
                                    className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 text-xs font-bold cursor-pointer"
                                >
                                    ✕
                                </button>
                            </div>

                            {/* Worker-specific individual notes */}
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-neutral-450 block">ملاحظة خاصة بهذا العامل (اختياري):</label>
                                <textarea
                                    value={rec.notes || ''}
                                    onChange={e => {
                                        const newVal = e.target.value;
                                        setWorkerRecords(prev => prev.map(r => r.id === rec.id ? { ...r, notes: newVal } : r));
                                    }}
                                    placeholder="سلفة، عمل نصف يوم، سحب صوبة، خصم تأخر..."
                                    className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-250 dark:border-neutral-800/80 rounded-lg p-2 text-xs font-semibold focus:ring-1 focus:ring-emerald-500/20 outline-none text-neutral-800 dark:text-neutral-100 resize-none h-16"
                                />
                            </div>

                            {/* Split options detail inputs */}
                            {isSplit && (
                                <div className="bg-indigo-50/15 dark:bg-indigo-950/10 p-2.5 rounded-xl border border-indigo-100/50 dark:border-indigo-900/20 space-y-2">
                                    <div className="space-y-1">
                                        <label className="text-[9px] font-bold text-indigo-700 dark:text-indigo-400">المبلغ المستلم كاش فوري (ج.م):</label>
                                        <div className="relative">
                                            <input 
                                                type="text" 
                                                inputMode="decimal"
                                                pattern="[0-9]*"
                                                required
                                                value={rec.cashAmount} 
                                                dir="ltr"
                                                lang="en"
                                                onChange={e => {
                                                    const val = e.target.value;
                                                    setWorkerRecords(prev => prev.map(r => r.id === rec.id ? { ...r, cashAmount: val } : r));
                                                }}
                                                placeholder="..." 
                                                className="w-full bg-white dark:bg-neutral-950 border border-indigo-205 dark:border-indigo-905 rounded-lg px-2 py-1 text-xs font-mono font-black text-indigo-600 text-left pl-9" 
                                            />
                                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[8px] text-neutral-400 font-bold font-mono">ج.م</span>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between text-[10px] text-neutral-550 dark:text-neutral-400 pt-1 border-t border-indigo-100/20">
                                        <span className="flex items-center gap-1">💵 كاش: <span className="text-emerald-600 font-black">ج.م</span><span dir="ltr" lang="en" className="font-mono font-bold text-emerald-600">{parsedCash}</span></span>
                                        <span className="flex items-center gap-1">📝 آجل: <span className="text-rose-550 font-black">ج.م</span><span dir="ltr" lang="en" className="font-mono font-bold text-rose-550">{remainingCredit}</span></span>
                                    </div>

                                    {parsedCash > parsedWage && (
                                        <p className="text-[9px] font-bold text-rose-500 animate-pulse">
                                            ⚠️ خطأ: مبلغ الكاش يتعدى الأجر!
                                        </p>
                                    )}
                                </div>
                            )}

                            <div className="flex justify-end pt-1">
                                <button
                                    type="button"
                                    onClick={() => setNotesEditingWorkerId(null)}
                                    className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs px-4 py-1.5 rounded-lg transition-all cursor-pointer"
                                >
                                    تم
                                </button>
                            </div>
                        </div>
                    </div>
                );
            })()}

            {/* 5. STICKY BOTTOM FIXED FOOTER (MODIFIED ERP UX LAYOUT) */}
            <div className="sticky bottom-0 bg-white dark:bg-neutral-900 border-t border-neutral-100 dark:border-neutral-800/80 pt-2 pb-1.5 z-10 space-y-2 mt-auto">
                {/* Compact summary state view */}
                {(workerRecords.length > 0 || otherExpenses.length > 0) && (
                    <div className="bg-emerald-50/20 dark:bg-emerald-950/5 p-2 rounded-lg border border-emerald-100/30 dark:border-emerald-900/10 space-y-1.5 animate-fade-in">
                        <div className="flex items-center justify-between text-[10px] font-bold text-neutral-500">
                            <span>📊 خلاصة التكلفة لليوم</span>
                            {workerRecords.length > 0 && (
                                <span>الحضور الكلي: <span className="font-mono text-emerald-600" lang="en" dir="ltr">{totalsSummary.count}</span> أفراد</span>
                            )}
                        </div>
                        
                        <div className="grid grid-cols-3 gap-1.5 text-center">
                            <div className="bg-white/40 dark:bg-neutral-950/20 py-1 px-1.5 rounded border border-neutral-100/20 flex flex-col items-center justify-center">
                                <span className="text-[8px] text-neutral-400 block font-semibold leading-none mb-1">إجمالي التكلفة</span>
                                <span className="text-[11px] text-neutral-700 dark:text-neutral-300 tabular-nums font-bold inline-flex items-center justify-center gap-0.5 leading-none">
                                    <span className="text-[9px] text-neutral-450">ج.م</span> <span dir="ltr" lang="en" className="font-mono font-black">{formatNumber(totalsSummary.overallTotal)}</span>
                                </span>
                                {totalsSummary.totalOtherExpenses > 0 && (
                                    <span className="text-[7.5px] text-neutral-400 dark:text-neutral-500 mt-0.5" dir="rtl">
                                        (يوميات: <span lang="en" dir="ltr" className="font-mono">{formatNumber(totalsSummary.totalWage)}</span> + أخرى: <span lang="en" dir="ltr" className="font-mono">{formatNumber(totalsSummary.totalOtherExpenses)}</span>)
                                    </span>
                                )}
                            </div>
                            <div className="bg-emerald-500/5 py-1 px-1.5 rounded border border-emerald-500/10 flex flex-col items-center justify-center">
                                <span className="text-[8px] text-emerald-600 block font-semibold leading-none mb-1">💵 كاش اليوم</span>
                                <span className="text-[11px] text-emerald-600 dark:text-emerald-400 tabular-nums font-bold inline-flex items-center justify-center gap-0.5 leading-none">
                                    <span className="text-[9px] text-emerald-500/80">ج.م</span> <span dir="ltr" lang="en" className="font-mono font-black">{formatNumber(totalsSummary.overallCash)}</span>
                                </span>
                            </div>
                            <div className="bg-rose-500/5 py-1 px-1.5 rounded border border-rose-500/10 flex flex-col items-center justify-center">
                                <span className="text-[8px] text-rose-505 dark:text-rose-455 block font-semibold leading-none mb-1">📝 آجل متبقي</span>
                                <span className="text-[11px] text-rose-505 dark:text-rose-400 tabular-nums font-bold inline-flex items-center justify-center gap-0.5 leading-none">
                                    <span className="text-[9px] text-rose-400/80">ج.م</span> <span dir="ltr" lang="en" className="font-mono font-black">{formatNumber(totalsSummary.overallCredit)}</span>
                                </span>
                            </div>
                        </div>
                    </div>
                )}

                {/* Submit and Clear Buttons row */}
                <div className="flex gap-2.5">
                    <button 
                        type="button" 
                        onClick={() => { clearDraft(); onClose(); }} 
                        className="flex-1 py-2 bg-neutral-50 hover:bg-neutral-100 dark:bg-neutral-800 dark:hover:bg-neutral-750 text-neutral-500 dark:text-neutral-300 rounded-lg text-xs font-semibold transition-all cursor-pointer border border-neutral-150 dark:border-neutral-700/50"
                    >
                        مسح الحساب
                    </button>
                    <button 
                        type="submit" 
                        onClick={triggerSaveHaptic}
                        disabled={isSubmitting || (workerRecords.length === 0 && otherExpenses.length === 0)} 
                        className="flex-[2] py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-xs font-black transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-1 leading-none font-sans"
                    >
                        {isSubmitting ? (
                            <span>جاري ترحيل القيود...</span>
                        ) : (
                            <>
                                <CheckCircleIcon className="w-4 h-4 ml-0.5" />
                                <span>ترحيل وتأكيد الحضور بالدفتر</span>
                            </>
                        )}
                    </button>
                </div>
            </div>
        </form>
    );
};

export default UnifiedLaborForm;
