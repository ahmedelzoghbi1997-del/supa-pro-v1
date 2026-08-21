
import React, { useState, useMemo, useEffect } from 'react';
import type { Farmer, FarmerWithdrawal, Cycle } from '../../types';
import { ChevronDownIcon } from '../Icons';
import { useSettings, terminology } from '../../contexts/SettingsContext';
import { formatNumberWithCommas, parseFormattedNumber, getLocalDateString } from '../../utils/helpers';
import { triggerSaveHaptic } from '../../lib/haptics';

interface AddWithdrawalFormProps {
    onSave: (withdrawal: Omit<FarmerWithdrawal, 'id' | 'user_id' | 'created_at'> | FarmerWithdrawal) => void;
    onCancel: () => void;
    farmers: Farmer[];
    cycles: Cycle[];
    initialData?: Partial<FarmerWithdrawal> | null;
}


const AddWithdrawalForm: React.FC<AddWithdrawalFormProps> = ({ onSave, onCancel, farmers, cycles, initialData }) => {
    const { settings } = useSettings();
    const term = terminology[settings.primaryTerm];
    const [isSaving, setIsSaving] = useState(false);
    
    const cycleOptions = useMemo(() => {
        const activeAndClosed = cycles.filter(c => c.status === 'active' || c.status === 'closed');
        if (initialData?.cycle_id) {
            const initialCycle = cycles.find(c => c.id === initialData.cycle_id);
            if (initialCycle && !activeAndClosed.some(c => c.id === initialCycle.id)) {
                return [initialCycle, ...activeAndClosed];
            }
        }
        return activeAndClosed;
    }, [cycles, initialData]);

    const getInitialState = () => {
        const defaultActiveCycle = cycles.find(c => c.status === 'active');
        const defaultCycleName = defaultActiveCycle?.name || cycleOptions[0]?.name || '';

        if (initialData) {
            const cycleName = initialData.cycle_id 
                ? (cycles.find(c => c.id === initialData.cycle_id)?.name || defaultCycleName)
                : defaultCycleName;

            return {
                farmerId: initialData.farmer_id || farmers[0]?.id || '',
                cycle: cycleName,
                amount: initialData.amount !== undefined ? String(initialData.amount) : '',
                date: initialData.date || getLocalDateString(),
                description: initialData.description || '',
            };
        }

        return {
            farmerId: farmers[0]?.id || '',
            cycle: defaultCycleName,
            amount: '',
            date: getLocalDateString(),
            description: '',
        };
    };

    const [formData, setFormData] = useState(getInitialState);
    const [errors, setErrors] = useState<Record<string, string>>({});

    useEffect(() => {
        setFormData(getInitialState());
    }, [initialData, cycles, farmers]);
    
    const validate = (): boolean => {
        const newErrors: Record<string, string> = {};
        if (!formData.farmerId) newErrors.farmerId = 'يجب اختيار المزارع.';
        const amountNumber = parseFloat(formData.amount);
        if (isNaN(amountNumber) || amountNumber <= 0) newErrors.amount = 'المبلغ يجب أن يكون رقمًا أكبر من صفر.';
        if (!formData.date) newErrors.date = 'تاريخ السحب مطلوب.';
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
        const withdrawalData = {
            farmer_id: formData.farmerId,
            cycle_id: selectedCycle?.id || null,
            amount: parseFloat(formData.amount) || 0,
            date: formData.date,
            description: formData.description,
        };
        
        try {
            if (initialData && 'id' in initialData) {
                const updatePayload = {
                    id: initialData.id,
                    user_id: initialData.user_id,
                    created_at: initialData.created_at,
                    ...withdrawalData
                };
                await onSave(updatePayload as FarmerWithdrawal);
            } else {
                await onSave(withdrawalData as Omit<FarmerWithdrawal, 'id' | 'user_id' | 'created_at'>);
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
                    <label htmlFor="date" className={labelClasses}>تاريخ السحب</label>
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
                    <label htmlFor="farmerId" className={labelClasses}>المزارع</label>
                    <div className="relative">
                        <select
                            id="farmerId"
                            name="farmerId"
                            value={formData.farmerId}
                            onChange={handleChange}
                            className={`${inputBaseClasses} appearance-none pr-8 ${errors.farmerId ? 'border-accent-danger focus:border-accent-danger focus:ring-accent-danger/50' : ''}`}
                            disabled={farmers.length === 0}
                        >
                            <option value="" disabled>اختر مزارعًا</option>
                            {farmers.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                        </select>
                        <ChevronDownIcon className="h-5 w-5 text-gray-400 absolute top-1/2 -translate-y-1/2 left-3 pointer-events-none" />
                    </div>
                     <ErrorMessage error={errors.farmerId} />
                </div>

                <div>
                    <label htmlFor="cycle" className={labelClasses}>{term.singular}</label>
                    <div className="relative">
                        <select
                            id="cycle"
                            name="cycle"
                            value={formData.cycle}
                            onChange={handleChange}
                            className={`${inputBaseClasses} appearance-none pr-8`}
                        >
                             <option value="">بدون {term.singular}</option>
                            {cycleOptions.map(option => <option key={option.id} value={option.name}>{option.name}</option>)}
                        </select>
                        <ChevronDownIcon className="h-5 w-5 text-gray-400 absolute top-1/2 -translate-y-1/2 left-3 pointer-events-none" />
                    </div>
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

                <div className="pt-4 flex justify-start gap-4 flex-row-reverse">
                    <button type="submit" onClick={triggerSaveHaptic} disabled={isSaving} className="py-2 px-6 bg-primary text-white font-semibold rounded-lg hover:bg-primary-dark transition shadow-md disabled:bg-primary/50 disabled:cursor-not-allowed">
                        {isSaving ? 'جاري الحفظ...' : (initialData?.id ? 'حفظ التعديلات' : 'حفظ')}
                    </button>
                    <button 
                        type="button" 
                        onClick={onCancel} 
                        disabled={isSaving}
                        className="py-2 px-6 bg-neutral-200 dark:bg-neutral-700 text-slate-800 dark:text-neutral-100 rounded-lg hover:bg-neutral-300 dark:hover:bg-neutral-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        إلغاء
                    </button>
                </div>
            </form>
        </div>
    );
};

export default AddWithdrawalForm;
