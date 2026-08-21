import React, { useState, useMemo, useEffect } from 'react';
import { useData } from '../../contexts/DataContext';
import { useSettings } from '../../contexts/SettingsContext';
import { PlusIcon, XMarkIcon } from '../Icons';
import type { Expense } from '../../types';
import { triggerSaveHaptic } from '../../lib/haptics';

interface EditLaborFormProps {
    expense: Expense;
    onClose: () => void;
}

const EditLaborForm: React.FC<EditLaborFormProps> = ({ expense, onClose }) => {
    const { updateExpense, cyclesWithCalculations } = useData();
    const { settings, updateSettings, loadingSettings } = useSettings();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const currentGhs = settings?.greenhouses || [
        { id: 'mine', name: 'الصوبة الخاصة بي', type: 'mine', is_default: true },
        { id: 'father', name: 'صوبة أبي وأخي', type: 'external' }
    ];

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

    const laborActivities = useMemo(() => {
        const list = settings?.laborActivities || [];
        if (list.length === 0) return defaultStandardActivities;
        return list;
    }, [settings?.laborActivities]);

    // Determine initial transaction type
    const getInitialType = (): string => {
        const isCash = expense.payment_method === 'cash';
        const desc = expense.description || '';
        const isSettlement = expense.amount > 0 && (desc.includes('سداد دفعة') || desc.includes('تسديد') || desc.includes('تصفية') || desc.includes('سداد كامل')) && !desc.includes('من العامل');
        const isAdvance = (expense.amount > 0) && (desc.includes('سلفة') || desc.includes('سلفية') || desc.includes('تخصيم') || (desc.includes('صرف') && !desc.includes('منصرف')) || desc.includes('دفعة نقدية') || desc.includes('مسحوبات'));
        const isRepayment = (expense.amount < 0) || (desc.includes('سداد') && desc.includes('من العامل'));
        const isOp = desc.includes('منصرف عمالة:');

        if (isSettlement) return 'settlement';
        if (isOp) return 'labor_operational';
        if (isRepayment) return 'advance_repayment';
        if (isAdvance) return 'advance_taken';
        if (isCash) return 'wage_cash';
        return 'wage_deferred';
    };

    const [transactionType, setTransactionType] = useState<string>(getInitialType());

    // Parse description upon mounting to extract structured inputs
    const parseDescription = () => {
        let workerName = '';
        let greenhouseId = 'mine';
        let activity = '';
        let additionalNotes = '';

        const desc = expense.description || '';

        // 1. Detect Greenhouse name
        const foundGh = currentGhs.find(gh => desc.includes(gh.name));
        if (foundGh) {
            greenhouseId = foundGh.id;
        }

        // 2. Extract worker name and activity
        if (desc.includes('يومية بدون اسم')) {
            workerName = 'يومية بدون اسم';
            let cleanDesc = desc;
            if (foundGh) {
                cleanDesc = desc.replace(new RegExp(`🏠\\s*${foundGh.name}\\s*\\|`, 'g'), '')
                                .replace(new RegExp(`🌿\\s*${foundGh.name}\\s*\\|`, 'g'), '')
                                .trim();
            }
            const mainParts = cleanDesc.split('|').map(p => p.trim());
            const firstPart = mainParts[0]; // Could be "يومية بدون اسم - النشاط" or "يومية بدون اسم"
            
            const dashIndex = firstPart.indexOf('-');
            if (dashIndex !== -1) {
                activity = firstPart.substring(dashIndex + 1).replace(/\(يومية عمل.*?\)/, '').trim();
                additionalNotes = mainParts.slice(1).join(' | ');
            } else {
                if (mainParts.length > 1) {
                    activity = mainParts[1].replace(/\(يومية عمل.*?\)/, '').trim();
                    additionalNotes = mainParts.slice(2).join(' | ');
                } else {
                    activity = 'جمع وحصاد';
                    additionalNotes = '';
                }
            }
        } else {
            // Standard format: "عامل: name | activity | notes..."
            const parts = desc.split('|').map(p => p.trim());
            const partsWithoutGh = parts.filter(p => {
                if (foundGh && (p.includes(foundGh.name) || p.includes('🏠') || p.includes('🌿'))) return false;
                return true;
            });

            let remains = partsWithoutGh;

            // Extract worker name if present
            const workerPart = remains.find(p => p.startsWith('عامل:') || p.includes('بدون اسم'));
            if (workerPart) {
                if (workerPart.startsWith('عامل:')) {
                    workerName = workerPart.replace('عامل:', '').trim();
                } else {
                    workerName = workerPart;
                }
                remains = remains.filter(p => p !== workerPart);
            }

            // Extract Activity or Operational details
            const isOp = desc.includes('منصرف عمالة:');
            if (isOp) {
                const opPart = remains.find(p => p.includes('منصرف عمالة:'));
                if (opPart) {
                    activity = opPart.replace('منصرف عمالة:', '').trim();
                    remains = remains.filter(p => p !== opPart);
                }
            } else {
                if (remains.length > 0) {
                    activity = remains[0].replace(/\(يومية عمل.*?\)/, '').trim();
                    remains = remains.slice(1);
                } else {
                    activity = 'جمع وحصاد';
                }
            }

            additionalNotes = remains.join(' | ');
        }

        return { workerName, greenhouseId, activity, additionalNotes };
    };

    const parsed = parseDescription();

    const [workerName, setWorkerName] = useState(parsed.workerName);
    const [greenhouseId, setGreenhouseId] = useState(parsed.greenhouseId);
    
    // Parse selected activities list from raw parsed activity
    const extractInitialActivities = (raw: string): string[] => {
        if (!raw) return ['جمع وحصاد'];
        const split = raw.split(/\s*(?:\+|\،|\,|\/)\s*/).map(s => s.trim()).filter(Boolean);
        const unique = Array.from(new Set(split));
        return unique.length > 0 ? unique : ['جمع وحصاد'];
    };

    const [selectedActivities, setSelectedActivities] = useState<string[]>(() => extractInitialActivities(parsed.activity));
    const [operationalDesc, setOperationalDesc] = useState<string>(() => parsed.activity);

    // Inline add new activity state
    const [isAddingNewActivity, setIsAddingNewActivity] = useState(false);
    const [newActivityInput, setNewActivityInput] = useState('');

    const [additionalNotes, setAdditionalNotes] = useState(parsed.additionalNotes);
    const [date, setDate] = useState(expense.date);
    const [amount, setAmount] = useState(Math.abs(expense.amount).toString());
    const [shiftType, setShiftType] = useState<'morning' | 'evening' | 'full_day'>(expense.shift_type || 'morning');
    const [hasInitialized, setHasInitialized] = useState(false);

    useEffect(() => {
        if (!loadingSettings && !hasInitialized && settings) {
            const parsedFully = parseDescription();
            setGreenhouseId(parsedFully.greenhouseId);
            setWorkerName(parsedFully.workerName);
            setAdditionalNotes(parsedFully.additionalNotes);
            setSelectedActivities(extractInitialActivities(parsedFully.activity));
            setOperationalDesc(parsedFully.activity);
            setHasInitialized(true);
        }
    }, [loadingSettings, settings, expense.description, hasInitialized]);

    const toggleActivity = (act: string) => {
        setSelectedActivities(prev => {
            if (prev.includes(act)) {
                return prev.filter(a => a !== act);
            } else {
                return [...prev, act];
            }
        });
    };

    const handleCreateNewActivity = () => {
        const trimmed = newActivityInput.trim();
        if (!trimmed) return;

        const currentList = settings?.laborActivities || defaultStandardActivities;
        if (!currentList.includes(trimmed)) {
            updateSettings({ laborActivities: [...currentList, trimmed] });
        }

        if (!selectedActivities.includes(trimmed)) {
            setSelectedActivities(prev => [...prev, trimmed]);
        }

        setNewActivityInput('');
        setIsAddingNewActivity(false);
    };

    const cycleId = expense.cycle_id;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        triggerSaveHaptic();
        setIsSubmitting(true);
        setError(null);

        try {
            const matchedGh = currentGhs.find(g => g.id === greenhouseId) || currentGhs[0];
            const prefix = matchedGh && matchedGh.type === 'external' ? `🏠 ${matchedGh.name} | ` : '';

            let finalDescription = '';
            let paymentMethod: 'cash' | 'credit' = 'cash';
            let finalAmount = Number(amount);

            const isWorkerWage = transactionType === 'wage_deferred' || transactionType === 'wage_cash';

            if (isWorkerWage && selectedActivities.length === 0) {
                setError('برجاء اختيار نشاط واحد على الأقل لكشف اليومية.');
                setIsSubmitting(false);
                return;
            }

            const resolvedActivityString = Array.from(new Set(selectedActivities.map(s => s.trim()).filter(Boolean))).join(' + ') || 'عمل عام';

            if (transactionType === 'labor_operational') {
                paymentMethod = 'cash';
                finalDescription = `${prefix}منصرف عمالة: ${operationalDesc.trim() || 'مصروف عام'}`;
            } else {
                const workerStr = workerName.trim() ? `عامل: ${workerName.trim()}` : 'يومية بدون اسم';
                
                if (transactionType === 'wage_deferred') {
                    paymentMethod = 'credit';
                    finalDescription = `${prefix}${workerStr} | ${resolvedActivityString} (يومية عمل آجل)`;
                } else if (transactionType === 'wage_cash') {
                    paymentMethod = 'cash';
                    finalDescription = `${prefix}${workerStr} | ${resolvedActivityString}`;
                } else if (transactionType === 'settlement') {
                    paymentMethod = 'cash';
                    finalDescription = `${prefix}${workerStr} | سداد كامل الحساب المتبقي وتصفية المستحقات`;
                } else if (transactionType === 'advance_taken') {
                    paymentMethod = 'cash';
                    finalDescription = `${prefix}${workerStr} | صرف سلفة نقدية على الحساب`;
                } else if (transactionType === 'advance_repayment') {
                    paymentMethod = 'cash';
                    finalDescription = `${prefix}${workerStr} | سداد من العامل`;
                    finalAmount = -Math.abs(finalAmount); // Stored as negative
                }
            }

            if (additionalNotes.trim()) {
                finalDescription += ` | ${additionalNotes.trim()}`;
            }

            await updateExpense({
                ...expense,
                date,
                amount: finalAmount,
                payment_method: paymentMethod,
                cycle_id: cycleId,
                description: finalDescription,
                shift_type: shiftType
            });
            onClose();
        } catch (err: any) {
            console.error("Failed to save changes:", err);
            setError(err?.message || 'حدث خطأ أثناء حفظ التعديلات في قاعدة البيانات');
        } finally {
            setIsSubmitting(false);
        }
    };

    const isWorkerWageType = transactionType === 'wage_deferred' || transactionType === 'wage_cash';

    return (
        <form onSubmit={handleSubmit} className="space-y-4 text-right" dir="rtl">
            <div className="bg-amber-50 dark:bg-neutral-900/40 p-3 rounded-2xl border border-amber-100/60 dark:border-neutral-800 text-xs font-bold text-amber-800 dark:text-neutral-400">
                ⚠️ تعديل هذا السجل سيقوم بإعادة جدولة وتحديث كشف يومية العمل وتحليلات الأنشطة تلقائياً.
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Transaction Type Dropdown */}
                <div className="space-y-1">
                    <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300">نوع المعاملة <span className="text-rose-500">*</span></label>
                    <select 
                        required 
                        value={transactionType} 
                        onChange={e => setTransactionType(e.target.value)} 
                        className="w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl px-3 py-2 text-sm font-bold focus:ring-2 focus:ring-amber-500/20"
                    >
                        <option value="wage_deferred">يومية عمل - آجل (يُضاف لحسابه)</option>
                        <option value="wage_cash">يومية عمل - نقدي (صرف فوري)</option>
                        <option value="advance_taken">صرف سلفة نقداً / مسحوبات</option>
                        <option value="advance_repayment">سداد سلفة نقدية من العامل</option>
                        <option value="settlement">تصفية حساب ومستحقات (سداد)</option>
                        <option value="labor_operational">مصروف تشغيلي عام (مأكل/فطار/نثريات)</option>
                    </select>
                </div>

                {/* Worker Name - Disabled / Read-only for integrity */}
                {transactionType !== 'labor_operational' && (
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-neutral-400 dark:text-neutral-500">اسم العامل (غير قابل للتعديل)</label>
                        <input 
                            type="text" 
                            disabled 
                            value={workerName || 'يومية بدون اسم'} 
                            className="w-full bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-800 text-neutral-500 dark:text-neutral-400 rounded-xl px-3 py-2 text-sm font-bold cursor-not-allowed" 
                        />
                    </div>
                )}

                {/* Greenhouse Dropdown */}
                <div className="space-y-1">
                    <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300">الصوبة المستفيدة <span className="text-rose-500">*</span></label>
                    <select 
                        required 
                        value={greenhouseId} 
                        onChange={e => setGreenhouseId(e.target.value)} 
                        className="w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl px-3 py-2 text-sm font-bold focus:ring-2 focus:ring-amber-500/20"
                    >
                        {currentGhs.map(gh => (
                            <option key={gh.id} value={gh.id}>
                                {gh.name} {gh.type === 'mine' ? '🌿' : '🏠'}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Date */}
                <div className="space-y-1">
                    <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300">التاريخ <span className="text-rose-500">*</span></label>
                    <input 
                        type="date" 
                        required 
                        value={date} 
                        onChange={e => setDate(e.target.value)} 
                        className="w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl px-3 py-2 text-sm font-mono font-bold focus:ring-2 focus:ring-amber-500/20 text-right" 
                    />
                </div>

                {/* Amount */}
                <div className="space-y-1">
                    <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300">المبلغ <span className="text-rose-500">*</span></label>
                    <div className="relative">
                        <input 
                            type="text" 
                            inputMode="decimal" 
                            pattern="[0-9]*" 
                            lang="en" 
                            required 
                            value={amount} 
                            onChange={e => setAmount(e.target.value)} 
                            className="w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl pl-10 pr-3 py-2 text-sm font-mono font-bold focus:ring-2 focus:ring-amber-500/20 text-left" 
                            dir="ltr" 
                        />
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-neutral-400 font-mono">ج.م</span>
                    </div>
                </div>

                {/* Operational Expense description if operational */}
                {transactionType === 'labor_operational' && (
                    <div className="space-y-1 md:col-span-2">
                        <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300">بيان المصروف التشغيلي <span className="text-rose-500">*</span></label>
                        <input 
                            type="text" 
                            required 
                            placeholder="مثال: شراء مأكل وفطور للعمال، مواصلات..." 
                            value={operationalDesc} 
                            onChange={e => setOperationalDesc(e.target.value)} 
                            className="w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl px-3 py-2 text-sm font-bold focus:ring-2 focus:ring-amber-500/20" 
                        />
                    </div>
                )}

                {/* Multi-Activity Picker for worker wages */}
                {isWorkerWageType && (
                    <div className="space-y-2 md:col-span-2 p-3 bg-neutral-50 dark:bg-neutral-900/60 rounded-xl border border-neutral-200 dark:border-neutral-800">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                                <span className="text-xs font-black text-neutral-700 dark:text-neutral-300">
                                    🎯 الأنشطة والمهام (اختر نشاطاً أو أكثر):
                                </span>
                                {selectedActivities.length > 0 && (
                                    <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300">
                                        {selectedActivities.length} محدد
                                    </span>
                                )}
                            </div>
                            
                            <button
                                type="button"
                                onClick={() => setIsAddingNewActivity(!isAddingNewActivity)}
                                className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-0.5 cursor-pointer"
                            >
                                <PlusIcon className="w-3.5 h-3.5" />
                                <span>نشاط جديد</span>
                            </button>
                        </div>

                        {/* Quick inline add activity */}
                        {isAddingNewActivity && (
                            <div className="flex items-center gap-1.5 pt-1">
                                <input
                                    type="text"
                                    autoFocus
                                    value={newActivityInput}
                                    onChange={e => setNewActivityInput(e.target.value)}
                                    onKeyDown={e => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            handleCreateNewActivity();
                                        }
                                    }}
                                    placeholder="اسم النشاط الجديد..."
                                    className="flex-1 bg-white dark:bg-neutral-900 border border-emerald-500 rounded-lg px-2.5 py-1.5 text-xs font-bold outline-none text-right"
                                />
                                <button
                                    type="button"
                                    onClick={handleCreateNewActivity}
                                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-black transition-colors cursor-pointer"
                                >
                                    إضافة واختيار
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsAddingNewActivity(false);
                                        setNewActivityInput('');
                                    }}
                                    className="p-1.5 text-neutral-400 hover:text-rose-500 rounded-lg"
                                >
                                    <XMarkIcon className="w-4 h-4" />
                                </button>
                            </div>
                        )}

                        {/* Chips */}
                        <div className="flex flex-wrap gap-1.5 pt-1">
                            {laborActivities.map(act => {
                                const isSelected = selectedActivities.includes(act);
                                return (
                                    <button
                                        key={act}
                                        type="button"
                                        onClick={() => toggleActivity(act)}
                                        className={`text-xs px-2.5 py-1 rounded-lg border transition-all cursor-pointer flex items-center gap-1 shadow-2xs font-bold select-none ${
                                            isSelected
                                                ? 'bg-emerald-600 border-emerald-600 text-white shadow-xs font-black scale-[1.02]'
                                                : 'bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800'
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

                        {/* Split Cost Preview Banner */}
                        {selectedActivities.length > 1 && (
                            <div className="mt-1 p-2 bg-amber-50 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-900/30 rounded-lg text-xs font-bold text-amber-800 dark:text-amber-300 flex items-center justify-between">
                                <span className="flex items-center gap-1">
                                    <span>⚡ توزيع التكلفة بالتساوي:</span>
                                    <span>{selectedActivities.join(' + ')}</span>
                                </span>
                                <span className="font-mono font-black text-emerald-600 dark:text-emerald-400 shrink-0">
                                    ({Math.round((Number(amount) || 0) / selectedActivities.length)} ج.م لكل نشاط)
                                </span>
                            </div>
                        )}

                        {selectedActivities.length === 0 && (
                            <p className="text-[10px] font-bold text-rose-500 pt-0.5">
                                ⚠️ يجب اختيار نشاط واحد على الأقل ليتم حفظ التعديل.
                            </p>
                        )}
                    </div>
                )}

                {/* Shift Type Selection */}
                {isWorkerWageType && (
                    <div className="space-y-1 md:col-span-2">
                        <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300">وردية العمل / الفترة</label>
                        <div className="grid grid-cols-3 gap-1 bg-neutral-100 dark:bg-neutral-800 p-1 rounded-xl border border-neutral-200 dark:border-neutral-700">
                            {[
                                { id: 'morning', label: '🌅 صباحية' },
                                { id: 'evening', label: '🌇 مسائية' },
                                { id: 'full_day', label: '☀️ يوم كامل' }
                            ].map((shift) => (
                                <button
                                    key={shift.id}
                                    type="button"
                                    onClick={() => setShiftType(shift.id as any)}
                                    className={`py-2 px-3 text-xs font-bold rounded-lg transition-all text-center cursor-pointer border ${
                                        shiftType === shift.id
                                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400 border-amber-300'
                                            : 'border-transparent text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300'
                                    }`}
                                >
                                    {shift.label}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Cycle details / Read-only label */}
                <div className="space-y-1">
                    <label className="text-xs font-bold text-neutral-400 dark:text-neutral-500">العروة / الموسم</label>
                    <div className="w-full bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-sm font-bold select-none text-neutral-500 dark:text-neutral-400">
                        {cyclesWithCalculations.find(c => c.id === cycleId)?.name || 'غير محدد'}
                    </div>
                </div>

                {/* Additional Notes */}
                <div className="space-y-1">
                    <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300">ملاحظات إضافية</label>
                    <input 
                        type="text" 
                        placeholder="مثل: تأخير ساعتين، إحضار أدوات خاصة..." 
                        value={additionalNotes} 
                        onChange={e => setAdditionalNotes(e.target.value)} 
                        className="w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl px-3 py-2 text-sm font-bold focus:ring-2 focus:ring-amber-500/20" 
                    />
                </div>
            </div>

            {error && (
                <div className="bg-rose-50 dark:bg-rose-950/20 text-rose-700 dark:text-rose-400 p-3 rounded-xl border border-rose-100 dark:border-rose-900/50 text-xs font-bold leading-relaxed">
                    {error}
                </div>
            )}

            <div className="pt-2 flex gap-3">
                <button 
                    type="button" 
                    onClick={onClose} 
                    className="flex-1 py-2.5 bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700 rounded-xl text-sm font-bold transition-all"
                >
                    إلغاء
                </button>
                <button 
                    type="submit" 
                    onClick={triggerSaveHaptic}
                    disabled={isSubmitting} 
                    className="flex-[2] py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-sm font-black transition-all shadow-sm disabled:opacity-50"
                >
                    {isSubmitting ? 'جاري الحفظ...' : 'تعديل السجل'}
                </button>
            </div>
        </form>
    );
};

export default EditLaborForm;
