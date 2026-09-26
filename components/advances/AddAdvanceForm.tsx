
import React, { useState, useEffect, useMemo } from 'react';
import type { Advance, Person, Cycle } from '../../types';
import { ChevronDownIcon, PlusIcon } from '../Icons';
import { useSettings, terminology } from '../../contexts/SettingsContext';
import { getLocalDateString } from '../../utils/helpers';
import { usePersistedState } from '../../hooks/usePersistedState';
import { triggerSaveHaptic } from '../../lib/haptics';

interface AddAdvanceFormProps {
    onClose?: () => void;
    onSave: (advance: Omit<Advance, 'id' | 'user_id' | 'created_at'> | Advance) => void;
    onCancel: () => void;
    initialData?: Advance | null;
    persons: Person[];
    cycles: Cycle[];
    onManagePersons: () => void;
    newlyAddedPersonId?: string | null;
    onPersonAdded?: () => void;
}

const AddAdvanceForm: React.FC<AddAdvanceFormProps> = ({ onSave, onCancel, initialData, persons, cycles, onManagePersons, newlyAddedPersonId, onPersonAdded }) => {
    const { settings } = useSettings();
    const term = terminology[settings.primaryTerm];
    const activeCycles = useMemo(() => cycles.filter(c => c.status === 'active'), [cycles]);
    const [isSaving, setIsSaving] = useState(false);
    
    // هل نحن في وضع الإضافة لشخص محدد مسبقاً؟
    // إذا كان هناك person_id ولكن لا يوجد id (أي ليست عملية تعديل)
    const isAddingForSpecificPerson = !!(initialData?.person_id && !initialData?.id);

    // تحديد العروة النشطة الافتراضية بشكل تلقائي
    const defaultCycleId = useMemo(() => {
        if (initialData?.cycle_id) return initialData.cycle_id;
        return activeCycles[0]?.id || '';
    }, [activeCycles, initialData]);

    const [draft, setDraft, clearDraft] = usePersistedState('add_advance_form_draft', {
        personId: initialData?.person_id || '',
        date: getLocalDateString(),
        amount: '',
        cycleId: defaultCycleId,
        reason: '',
        isRepayment: false,
    });

    const [editData, setEditData] = useState({
        personId: initialData?.person_id || '',
        date: initialData?.date || getLocalDateString(),
        amount: (initialData?.amount !== undefined && initialData?.amount !== null) ? String(Math.abs(initialData.amount)) : '',
        cycleId: initialData?.cycle_id || defaultCycleId,
        reason: initialData?.reason || '',
        isRepayment: (initialData?.amount || 0) < 0,
    });

    const formData = initialData?.id ? editData : draft;

    useEffect(() => {
        const today = getLocalDateString();
        if (initialData?.id) {
            setEditData({
                personId: initialData.person_id || '',
                date: initialData.date || today,
                amount: (initialData.amount !== undefined && initialData.amount !== null) ? String(Math.abs(initialData.amount)) : '',
                cycleId: initialData.cycle_id || defaultCycleId,
                reason: initialData.reason || '',
                isRepayment: (initialData.amount || 0) < 0,
            });
        } else {
            if (initialData?.date) {
                setDraft(prev => ({ ...prev, date: initialData.date! }));
            } else if (!draft.date || draft.date < today) {
                setDraft(prev => ({ ...prev, date: today }));
            }
        }
    }, [initialData, defaultCycleId]);

    const setFormData = (updater: any) => {
        if (initialData?.id) {
            setEditData(updater);
        } else {
            setDraft(updater);
        }
    };
    
    const [errors, setErrors] = useState<Record<string, string>>({});

    const cycleOptions = useMemo(() => {
        const options: Cycle[] = [...activeCycles];
        if (initialData?.cycle_id) {
            const initialCycle = cycles.find(c => c.id === initialData.cycle_id);
            if (initialCycle && !options.some(opt => opt.id === initialCycle.id)) {
                options.unshift(initialCycle);
            }
        }
        return options;
    }, [cycles, activeCycles, initialData]);

    useEffect(() => {
        if (initialData) {
            setFormData({
                personId: initialData.person_id || '',
                date: initialData.date || getLocalDateString(),
                amount: (initialData.amount !== undefined && initialData.amount !== null) ? String(Math.abs(initialData.amount)) : '',
                cycleId: initialData.cycle_id || defaultCycleId,
                reason: initialData.reason || '',
                isRepayment: (initialData.amount || 0) < 0,
            });
        }
    }, [initialData, defaultCycleId]);

    // التأكد من تهيئة السلفة بوضع عروة نشطة إذا كانت الحالية مغلقة أو غير متوفرة لغير التعديل
    useEffect(() => {
        if (!initialData?.id) {
            const activeCyclesList = cycles.filter(c => c.status === 'active');
            const currentSelectedCycle = cycles.find(c => c.id === formData.cycleId);
            if (activeCyclesList.length > 0 && (!currentSelectedCycle || currentSelectedCycle.status !== 'active')) {
                setFormData(prev => ({ ...prev, cycleId: activeCyclesList[0].id }));
            }
        }
    }, [cycles, formData.cycleId, initialData]);

    useEffect(() => {
        if (newlyAddedPersonId && onPersonAdded) {
            setFormData(prev => ({ ...prev, personId: newlyAddedPersonId }));
            onPersonAdded(); 
        }
    }, [newlyAddedPersonId, onPersonAdded]);
    
    const validate = (): boolean => {
        const newErrors: Record<string, string> = {};
        if (!formData.personId) newErrors.personId = 'يجب اختيار شخص.';
        if (!formData.date) newErrors.date = 'التاريخ مطلوب.';
        const amountNumber = parseFloat(formData.amount);
        if (isNaN(amountNumber) || amountNumber <= 0) newErrors.amount = 'المبلغ يجب أن يكون رقمًا أكبر من صفر.';
        if (!formData.cycleId) newErrors.cycleId = `يجب اختيار ${term.singular}.`;
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        
        if (type === 'checkbox') {
            const checked = (e.target as HTMLInputElement).checked;
            setFormData((prev: any) => ({ ...prev, [name]: checked }));
            return;
        }
        
        if (name === 'amount') {
            const sanitized = value.replace(/[^0-9.]/g, '');
            const parts = sanitized.split('.');
            const cleanValue = parts.length > 2 ? `${parts[0]}.${parts[1]}` : sanitized;
            setFormData((prev: any) => ({ ...prev, amount: cleanValue }));
        } else {
            setFormData((prev: any) => ({ ...prev, [name]: value }));
        }

        if (errors[name]) {
            setErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[name];
                return newErrors;
            });
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        triggerSaveHaptic();
        if (!validate()) {
            return;
        }
        setIsSaving(true);
        
        const rawAmount = parseFloat(formData.amount);
        const finalAmount = formData.isRepayment ? -rawAmount : rawAmount;
        
        const advanceData: Omit<Advance, 'id' | 'user_id' | 'created_at'> = {
            person_id: formData.personId,
            date: formData.date,
            amount: finalAmount,
            cycle_id: formData.cycleId,
            reason: formData.reason || (formData.isRepayment ? 'سداد جزء من السلفة' : '')
        };

        try {
            if (initialData?.id) {
                await onSave({ ...initialData, ...advanceData } as Advance);
            } else {
                await onSave(advanceData);
                clearDraft();
            }
        } catch (error) {
            console.error("Save error:", error);
            setIsSaving(false);
        }
    };
    
    const inputBaseClasses = "w-full bg-neutral-100 dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 text-slate-800 dark:text-white rounded-lg p-3 focus:ring-2 focus:ring-primary focus:border-primary transition placeholder:text-neutral-500";
    const labelClasses = "block text-sm font-medium text-gray-500 dark:text-gray-400 mb-2 text-right";
    
    const ErrorMessage: React.FC<{ error?: string }> = ({ error }) => {
        if (!error) return null;
        return <p className="text-accent-danger text-xs mt-1 text-right">{error}</p>
    };

    return (
        <div className="max-h-[70vh] overflow-y-auto pr-2">
            <form onSubmit={handleSubmit} className="space-y-6">
                
                <div>
                    <label htmlFor="personId" className={labelClasses}>الشخص المستلف</label>
                    <div className="flex items-center gap-2">
                         <div className="relative flex-grow">
                            <select
                                id="personId"
                                name="personId"
                                value={formData.personId}
                                onChange={handleChange}
                                disabled={isAddingForSpecificPerson}
                                className={`${inputBaseClasses} appearance-none pr-8 ${isAddingForSpecificPerson ? 'opacity-70 cursor-not-allowed bg-neutral-200 dark:bg-neutral-800' : ''} ${errors.personId ? 'border-accent-danger focus:border-accent-danger focus:ring-accent-danger/50' : ''}`}
                            >
                                <option value="" disabled>اختر شخصًا</option>
                                {persons.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>
                            {!isAddingForSpecificPerson && <ChevronDownIcon className="h-5 w-5 text-gray-400 absolute top-1/2 -translate-y-1/2 left-3 pointer-events-none" />}
                        </div>
                        {!isAddingForSpecificPerson && (
                            <button type="button" onClick={onManagePersons} className="p-3 bg-gray-200 dark:bg-gray-600/50 hover:bg-gray-300 dark:hover:bg-gray-500/50 rounded-lg" aria-label="إدارة الأشخاص">
                                <PlusIcon className="h-6 w-6 text-slate-800 dark:text-white" />
                            </button>
                        )}
                    </div>
                    {isAddingForSpecificPerson && <p className="text-[10px] text-primary font-bold mt-1">يتم الإضافة لهذا الشخص بناءً على اختيارك من القائمة الرئيسية.</p>}
                    <ErrorMessage error={errors.personId} />
                </div>

                <div>
                    <label htmlFor="date" className={labelClasses}>التاريخ</label>
                    <input
                        id="date"
                        name="date"
                        type="date"
                        value={formData.date}
                        onChange={handleChange}
                        className={`${inputBaseClasses} ${errors.date ? 'border-accent-danger focus:border-accent-danger focus:ring-accent-danger/50' : ''}`}
                    />
                    <ErrorMessage error={errors.date} />
                </div>
                
                <div className="flex items-center gap-3 bg-neutral-100 dark:bg-neutral-800/50 p-3 rounded-lg border border-neutral-200 dark:border-neutral-700/50">
                    <input
                        id="isRepayment"
                        name="isRepayment"
                        type="checkbox"
                        checked={formData.isRepayment}
                        onChange={handleChange}
                        className="w-5 h-5 text-primary border-gray-300 rounded focus:ring-primary"
                    />
                    <label htmlFor="isRepayment" className="text-sm font-bold text-gray-700 dark:text-gray-300 cursor-pointer">
                        تسجيل هذه العملية كسداد مبلغ من السلفة المستحقة 
                    </label>
                </div>

                 <div>
                    <label htmlFor="amount" className={labelClasses}>المبلغ (ج.م)</label>
                    <input
                        id="amount"
                        name="amount"
                        type="text"
                        inputMode="decimal"
                        value={formData.amount}
                        onChange={handleChange}
                        className={`${inputBaseClasses} ${errors.amount ? 'border-accent-danger focus:border-accent-danger focus:ring-accent-danger/50' : ''}`}
                        placeholder="0.00"
                    />
                     <ErrorMessage error={errors.amount} />
                </div>

                <div>
                    <label htmlFor="cycleId" className={labelClasses}>{term.singular}</label>
                    <div className="relative">
                        <select
                            id="cycleId"
                            name="cycleId"
                            value={formData.cycleId}
                            onChange={handleChange}
                            className={`${inputBaseClasses} appearance-none pr-8 ${errors.cycleId ? 'border-accent-danger focus:border-accent-danger focus:ring-accent-danger/50' : ''}`}
                        >
                            <option value="" disabled>اختر {term.singular}</option>
                            {cycleOptions.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                        <ChevronDownIcon className="h-5 w-5 text-gray-400 absolute top-1/2 -translate-y-1/2 left-3 pointer-events-none" />
                    </div>
                    <ErrorMessage error={errors.cycleId} />
                </div>

                <div>
                    <label htmlFor="reason" className={labelClasses}>الوصف/السبب</label>
                    <input
                        id="reason"
                        name="reason"
                        type="text"
                        value={formData.reason}
                        onChange={handleChange}
                        className={inputBaseClasses}
                        placeholder="مثال: سلفة نقدية طارئة"
                    />
                </div>

                <div className="pt-4 flex justify-start gap-4 flex-row-reverse">
                    <button type="submit" onClick={triggerSaveHaptic} disabled={isSaving} className="py-3 px-8 bg-primary text-white font-semibold rounded-lg hover:bg-primary-dark transition shadow-md disabled:bg-primary/50 disabled:cursor-not-allowed">
                        {isSaving ? 'جاري الحفظ...' : (initialData?.id ? 'حفظ التعديلات' : 'حفظ')}
                    </button>
                    <button 
                        type="button" 
                        onClick={() => { clearDraft(); onCancel(); }} 
                        disabled={isSaving}
                        className="py-3 px-8 bg-neutral-200 dark:bg-neutral-700 text-slate-800 dark:text-neutral-100 rounded-lg hover:bg-neutral-300 dark:hover:bg-neutral-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        إلغاء
                    </button>
                </div>
            </form>
        </div>
    );
};

export default AddAdvanceForm;
