
import React, { useState, useMemo, useEffect } from 'react';
import type { Supplier, SupplierPayment, Cycle } from '../../types';
import { ChevronDownIcon, PlusIcon } from '../Icons';
import { useSettings, terminology } from '../../contexts/SettingsContext';
import { formatNumberWithCommas, parseFormattedNumber, getLocalDateString } from '../../utils/helpers';
import { usePersistedState } from '../../hooks/usePersistedState';
import { triggerSaveHaptic } from '../../lib/haptics';

interface AddPaymentFormProps {
    onSave: (payment: Omit<SupplierPayment, 'id' | 'user_id' | 'created_at'> | SupplierPayment) => void;
    onCancel: () => void;
    suppliers: Supplier[];
    cycles: Cycle[];
    initialData?: SupplierPayment | null;
}


const AddPaymentForm: React.FC<AddPaymentFormProps> = ({ onSave, onCancel, suppliers, cycles, initialData }) => {
    const { settings } = useSettings();
    const term = terminology[settings.primaryTerm];
    const [isSaving, setIsSaving] = useState(false);
    
    const cycleOptions = useMemo(() => {
        const active = cycles.filter(c => c.status === 'active');
        if (initialData?.cycle_id) {
            const initialCycle = cycles.find(c => c.id === initialData.cycle_id);
            if (initialCycle && !active.some(c => c.id === initialCycle.id)) {
                return [initialCycle, ...active];
            }
        }
        return active;
    }, [cycles, initialData]);

    const getInitialState = () => {
        if (initialData && initialData.amount !== undefined) {
            const cycleName = cycles.find(c => c.id === initialData.cycle_id)?.name || '';
            return {
                supplierId: initialData.supplier_id || suppliers[0]?.id || '',
                cycle: cycleName || (cycleOptions[0]?.name || ''),
                amount: String(initialData.amount || ''),
                date: initialData.date || getLocalDateString(),
                description: initialData.description || '',
            };
        }
        return {
            supplierId: initialData?.supplier_id || suppliers[0]?.id || '',
            cycle: cycleOptions[0]?.name || '',
            amount: '',
            date: getLocalDateString(),
            description: '',
        };
    };

    const [draft, setDraft, clearDraft] = usePersistedState('add_payment_form_draft', {
        supplierId: suppliers[0]?.id || '',
        cycle: cycleOptions[0]?.name || '',
        amount: '',
        date: getLocalDateString(),
        description: '',
    });

    const [editData, setEditData] = useState(getInitialState());

    const formData = initialData?.id ? editData : draft;

    useEffect(() => {
        const today = getLocalDateString();
        if (initialData?.id) {
            setEditData(getInitialState());
        } else {
            if (initialData?.date) {
                setDraft(prev => ({ ...prev, date: initialData.date! }));
            } else if (!draft.date || draft.date < today) {
                setDraft(prev => ({ ...prev, date: today }));
            }
        }
    }, [initialData]);

    const setFormData = (updater: any) => {
        if (initialData?.id) {
            setEditData(updater);
        } else {
            setDraft(updater);
        }
    };

    const [errors, setErrors] = useState<Record<string, string>>({});

    useEffect(() => {
        if (initialData?.id) {
            setEditData(getInitialState());
        }
    }, [initialData, cycles, suppliers]);

    // المزامنة التلقائية لعروة الدفعة السريعة إلى عروة نشطة في حالة إغلاق العروة الحالية المثبتة في المسودة
    useEffect(() => {
        if (!initialData?.id) {
            const activeCyclesList = cycles.filter(c => c.status === 'active');
            const currentSelectedCycle = cycles.find(c => c.name === formData.cycle);
            if (activeCyclesList.length > 0 && (!currentSelectedCycle || currentSelectedCycle.status !== 'active')) {
                setFormData(prev => ({ ...prev, cycle: activeCyclesList[0].name }));
            }
        }
    }, [cycles, formData.cycle, initialData]);

    const validate = (): boolean => {
        const newErrors: Record<string, string> = {};
        if (!formData.supplierId) newErrors.supplierId = 'يجب اختيار المورد.';
        if (!formData.cycle) newErrors.cycle = `يجب اختيار ${term.singular}.`;
        const amountNumber = parseFloat(formData.amount);
        if (isNaN(amountNumber) || amountNumber <= 0) newErrors.amount = 'المبلغ يجب أن يكون رقمًا أكبر من صفر.';
        if (!formData.date) newErrors.date = 'تاريخ الدفعة مطلوب.';
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };


    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        if (name === 'amount') {
            const parsedValue = parseFormattedNumber(value);
            if (/^\d*\.?\d*$/.test(parsedValue)) {
                setFormData(prev => ({ ...prev, [name]: parsedValue }));
            }
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
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
        const selectedCycle = cycles.find(c => c.name === formData.cycle);
        const paymentData = {
            supplier_id: formData.supplierId,
            cycle_id: selectedCycle?.id,
            amount: parseFloat(formData.amount) || 0,
            date: formData.date,
            description: formData.description,
        };
        try {
            if (initialData && 'id' in initialData) {
                await onSave({ ...initialData, ...paymentData });
            } else {
                await onSave(paymentData);
                clearDraft();
            }
        } catch (error) {
            console.error("Save error:", error);
            setIsSaving(false);
        }
    };
    
    const inputBaseClasses = "w-full bg-neutral-100 dark:bg-[#182134] border border-neutral-300 dark:border-neutral-700 text-slate-800 dark:text-white rounded-lg p-3 focus:ring-2 focus:ring-primary focus:border-primary transition placeholder:text-neutral-500";
    const labelClasses = "block text-sm font-medium text-gray-500 dark:text-gray-400 mb-2 text-right";
    const ErrorMessage: React.FC<{ error?: string }> = ({ error }) => {
        if (!error) return null;
        return <p className="text-accent-danger text-xs mt-1 text-right">{error}</p>
    };

    return (
        <div className="max-h-[70vh] overflow-y-auto pr-2">
            <form onSubmit={handleSubmit} className="space-y-6">
                
                <div>
                    <label htmlFor="supplierId" className={labelClasses}>المورد</label>
                    <div className="relative">
                        <select
                            id="supplierId"
                            name="supplierId"
                            value={formData.supplierId}
                            onChange={handleChange}
                            className={`${inputBaseClasses} appearance-none pr-8 ${errors.supplierId ? 'border-accent-danger focus:border-accent-danger focus:ring-accent-danger/50' : ''}`}
                            disabled={suppliers.length === 0}
                        >
                            {suppliers.length > 0 ? (
                                suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)
                            ) : (
                                <option>اختر موردا</option>
                            )}
                        </select>
                        <ChevronDownIcon className="h-5 w-5 text-gray-400 absolute top-1/2 -translate-y-1/2 left-3 pointer-events-none" />
                    </div>
                    <ErrorMessage error={errors.supplierId} />
                </div>

                <div>
                    <label htmlFor="cycle" className={labelClasses}>{term.singular}</label>
                    <div className="relative">
                        <select
                            id="cycle"
                            name="cycle"
                            value={formData.cycle}
                            onChange={handleChange}
                            className={`${inputBaseClasses} appearance-none pr-8 ${errors.cycle ? 'border-accent-danger focus:border-accent-danger focus:ring-accent-danger/50' : ''}`}
                        >
                            {cycleOptions.map(option => <option key={option.id} value={option.name}>{option.name}</option>)}
                        </select>
                        <ChevronDownIcon className="h-5 w-5 text-gray-400 absolute top-1/2 -translate-y-1/2 left-3 pointer-events-none" />
                    </div>
                    <ErrorMessage error={errors.cycle} />
                </div>

                <div>
                    <label htmlFor="amount" className={labelClasses}>المبلغ (ج.م)</label>
                    <input
                        id="amount"
                        name="amount"
                        type="text"
                        inputMode="decimal"
                        value={formatNumberWithCommas(formData.amount)}
                        onChange={handleChange}
                        className={`${inputBaseClasses} ${errors.amount ? 'border-accent-danger focus:border-accent-danger focus:ring-accent-danger/50' : ''}`}
                    />
                    <ErrorMessage error={errors.amount} />
                </div>

                <div>
                    <label htmlFor="date" className={labelClasses}>تاريخ الدفعة</label>
                    <div className="relative">
                       <input
                            id="date"
                            name="date"
                            type="date"
                            value={formData.date}
                            onChange={handleChange}
                            className={`${inputBaseClasses} ${errors.date ? 'border-accent-danger focus:border-accent-danger focus:ring-accent-danger/50' : ''}`}
                        />
                    </div>
                    <ErrorMessage error={errors.date} />
                </div>

                <div>
                    <label htmlFor="description" className={labelClasses}>الوصف</label>
                    <input
                        id="description"
                        name="description"
                        type="text"
                        value={formData.description}
                        onChange={handleChange}
                        className={inputBaseClasses}
                    />
                </div>

                <div>
                    <button type="button" className="text-sm text-primary hover:underline flex items-center gap-1">
                        <PlusIcon className="w-4 h-4" />
                        <span>ربط بفواتير مشتريات</span>
                    </button>
                </div>

                <div className="pt-4 flex justify-start gap-4 flex-row-reverse">
                    <button type="submit" onClick={triggerSaveHaptic} disabled={isSaving} className="py-3 px-8 bg-primary text-white font-semibold rounded-lg hover:bg-primary-dark transition shadow-md disabled:bg-primary/50 disabled:cursor-not-allowed">
                        {isSaving ? 'جاري الحفظ...' : (initialData?.id ? 'حفظ التعديلات' : 'حفظ الدفعة')}
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

export default AddPaymentForm;
