
import React, { useState, useEffect, useMemo } from 'react';
import type { Expense, Cycle } from '../../types';
import { ChevronDownIcon, WalletIcon, LeafIcon, SparklesIcon } from '../Icons';
import { useData } from '../../contexts/DataContext';
import { useSettings, terminology } from '../../contexts/SettingsContext';
import { formatNumberWithCommas, parseFormattedNumber, getLocalDateString, formatNumber } from '../../utils/helpers';
import { usePersistedState } from '../../hooks/usePersistedState';
import { triggerSaveHaptic } from '../../lib/haptics';

interface AddExpenseFormProps {
    onSave: (expense: Omit<Expense, 'id' | 'user_id' | 'created_at'> | Expense) => void;
    onCancel: () => void;
    initialData?: Partial<Expense> | null;
}

const AddExpenseForm: React.FC<AddExpenseFormProps> = ({ onSave, onCancel, initialData }) => {
    const { cycles, expenseCategories, suppliers, settings, expenses: allExpenses, supplierPayments } = useData();
    const { primaryTerm } = useSettings().settings;
    const term = terminology[primaryTerm];
    const activeCycles = useMemo(() => cycles.filter(c => c.status === 'active'), [cycles]);
    const [isSaving, setIsSaving] = useState(false);

    const draftKey = initialData?.id ? `draft_expense_${initialData.id}` : 'draft_expense_new';
    const [formData, setFormData, clearFormData] = usePersistedState(draftKey, {
        description: initialData?.description || (initialData ? '' : 'تسميد-رش'),
        date: initialData?.date || getLocalDateString(),
        amount: String(initialData?.amount || ''),
        categoryId: initialData?.category_id || expenseCategories.find(c => c.name === 'أخرى')?.id || expenseCategories[0]?.id || '',
        cycle: '',
        supplierId: initialData?.supplier_id || '',
        paymentMethod: (initialData?.payment_method as 'cash' | 'credit') || 'cash',
        isEstablishment: initialData?.is_establishment || false,
    });
    
    const [errors, setErrors] = useState<Record<string, string>>({});
    
    useEffect(() => {
        const today = getLocalDateString();
        if (initialData?.id) {
            setFormData(prev => ({
                ...prev,
                description: initialData.description || prev.description,
                date: initialData.date || today,
                amount: String(initialData.amount || ''),
                categoryId: initialData.category_id || prev.categoryId,
                supplierId: initialData.supplier_id || prev.supplierId,
                paymentMethod: (initialData.payment_method as 'cash' | 'credit') || prev.paymentMethod,
                isEstablishment: initialData.is_establishment ?? prev.isEstablishment,
            }));
        } else {
            if (initialData?.date) {
                setFormData(prev => ({ ...prev, date: initialData.date! }));
            } else if (!formData.date || formData.date < today) {
                setFormData(prev => ({ ...prev, date: today }));
            }
        }
    }, [initialData]);

    useEffect(() => {
        if (formData.paymentMethod === 'credit' && !formData.supplierId && suppliers.length > 0) {
            setFormData(prev => ({ ...prev, supplierId: suppliers[0].id }));
        }
    }, [formData.paymentMethod, suppliers, formData.supplierId]);

    useEffect(() => {
        if (initialData?.cycle_id) {
            const cycleName = cycles.find(c => c.id === initialData.cycle_id)?.name || '';
            setFormData(prev => ({ ...prev, cycle: cycleName }));
        } else {
            const currentSelectedCycle = cycles.find(c => c.name === formData.cycle);
            if (activeCycles.length > 0 && (!currentSelectedCycle || currentSelectedCycle.status !== 'active')) {
                setFormData(prev => ({ ...prev, cycle: activeCycles[0].name }));
            }
        }
    }, [initialData, cycles, activeCycles, formData.cycle]);

    useEffect(() => {
        if (expenseCategories.length > 0) {
            const isValid = expenseCategories.some(c => c.id === formData.categoryId);
            if (!isValid) {
                const defaultCat = expenseCategories.find(c => c.name === 'أخرى')?.id || expenseCategories[0]?.id || '';
                setFormData(prev => ({ ...prev, categoryId: defaultCat }));
            }
        }
    }, [expenseCategories, formData.categoryId, setFormData]);

    const selectedCategory = useMemo(() => {
        return expenseCategories.find(c => c.id === formData.categoryId);
    }, [formData.categoryId, expenseCategories]);

    const supplierBalanceInfo = useMemo(() => {
        if (formData.paymentMethod !== 'credit' || !formData.supplierId) return null;

        const currentInvoices = allExpenses
            .filter(e => e.supplier_id === formData.supplierId && e.payment_method === 'credit')
            .reduce((sum, e) => sum + (e.amount || 0), 0);
        
        const currentPayments = supplierPayments
            .filter(p => p.supplier_id === formData.supplierId)
            .reduce((sum, p) => sum + (p.amount || 0), 0);

        const currentBalance = currentInvoices - currentPayments;
        const newAmount = parseFloat(formData.amount) || 0;
        const expectedBalance = currentBalance + newAmount;

        return {
            current: currentBalance,
            expected: expectedBalance,
            name: suppliers.find(s => s.id === formData.supplierId)?.name || ''
        };
    }, [formData.supplierId, formData.paymentMethod, formData.amount, allExpenses, supplierPayments, suppliers]);

    const isSeedCategory = useMemo(() => {
        if (!selectedCategory) return false;
        const name = selectedCategory.name.toLowerCase();
        return name.includes('بذور') || name.includes('بذرة') || name.includes('تقاوي') || name.includes('شتلات') || name.includes('شتلة');
    }, [selectedCategory]);

    // تم التعديل هنا: خيارات السداد تظهر دائماً للفئات المرتبطة بموردين حتى لو كانت تأسيسية
    const showPaymentOptions = useMemo(() => {
        return settings.systems.suppliers && (selectedCategory?.is_supplier_category || isSeedCategory);
    }, [settings.systems.suppliers, selectedCategory, isSeedCategory]);

    const showSupplierDropdown = useMemo(() => {
        return showPaymentOptions && formData.paymentMethod === 'credit';
    }, [showPaymentOptions, formData.paymentMethod]);

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

    const validate = (): boolean => {
        const newErrors: Record<string, string> = {};
        if (formData.description.trim() === '') newErrors.description = 'وصف المصروف مطلوب.';
        const amountNumber = parseFloat(formData.amount);
        if (isNaN(amountNumber) || amountNumber <= 0) newErrors.amount = 'المبلغ يجب أن يكون رقمًا أكبر من صفر.';
        if (!formData.date) newErrors.date = 'التاريخ مطلوب.';
        if (!formData.categoryId) newErrors.categoryId = 'الفئة مطلوبة.';
        if (!formData.cycle) newErrors.cycle = `يجب اختيار ${term.singular}.`;
        if (showPaymentOptions && formData.paymentMethod === 'credit' && !formData.supplierId) {
            newErrors.supplierId = 'يجب اختيار مورد للفواتير الآجلة.';
        }
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

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        triggerSaveHaptic();
        if (!validate()) return;
        setIsSaving(true);
        
        const selectedCycle = cycles.find(c => c.name === formData.cycle);
        
        let supplierIdToSend: string | null | undefined = undefined;
        if (showPaymentOptions && formData.paymentMethod === 'credit') {
            supplierIdToSend = formData.supplierId;
        } else {
            supplierIdToSend = null;
        }

        const expenseData: Omit<Expense, 'id' | 'user_id' | 'created_at'> = {
            description: formData.description,
            date: formData.date,
            amount: parseFloat(formData.amount),
            category_id: formData.categoryId,
            cycle_id: selectedCycle?.id || '',
            supplier_id: supplierIdToSend,
            payment_method: showPaymentOptions ? formData.paymentMethod as 'cash' | 'credit' : 'cash',
            is_establishment: formData.isEstablishment,
        };

        if (initialData && 'id' in initialData) {
            onSave({ 
                id: initialData.id, 
                user_id: initialData.user_id,
                created_at: initialData.created_at,
                ...expenseData 
            } as Expense);
        } else {
            onSave(expenseData);
        }
        clearFormData();
    };
    
    const inputBaseClasses = "w-full bg-neutral-100 dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 text-slate-800 dark:text-white rounded-lg p-3 focus:ring-2 focus:ring-primary focus:border-primary transition placeholder:text-neutral-500";
    const labelClasses = "block text-sm font-medium text-gray-500 dark:text-gray-400 mb-2 text-right";
    const ErrorMessage: React.FC<{ error?: string }> = ({ error }) => {
        if (!error) return null;
        return <p className="text-accent-danger text-xs mt-1 text-right">{error}</p>
    }

    return (
        <form onSubmit={handleSubmit} className="flex flex-col h-[75vh] md:h-[80vh] text-right text-neutral-800 dark:text-neutral-100 relative">
            {/* Scrollable Container Body */}
            <div className="flex-1 overflow-y-auto pr-1 pl-1 space-y-4 pb-4 scrollbar-thin scrollbar-thumb-neutral-200 dark:scrollbar-thumb-neutral-800">
                
                <div className="bg-neutral-50 dark:bg-neutral-900/40 p-3 rounded-xl border border-neutral-200 dark:border-neutral-700/50">
                    <div className="bg-neutral-200/50 dark:bg-black/20 p-1 rounded-lg flex items-center">
                        <button 
                            type="button"
                            onClick={() => setFormData({...formData, isEstablishment: false})}
                            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-xs font-black transition-all ${!formData.isEstablishment ? 'bg-white dark:bg-neutral-800 text-emerald-600 shadow-sm border border-neutral-100 dark:border-neutral-700' : 'text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300'}`}
                        >
                            <SparklesIcon className="w-3.5 h-3.5" />
                            <span>تشغيل</span>
                        </button>
                        <button 
                            type="button"
                            onClick={() => setFormData({...formData, isEstablishment: true})}
                            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-xs font-black transition-all ${formData.isEstablishment ? 'bg-white dark:bg-neutral-800 text-blue-600 shadow-sm border border-neutral-100 dark:border-neutral-700' : 'text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300'}`}
                        >
                            <LeafIcon className="w-3.5 h-3.5" />
                            <span>تأسيس</span>
                        </button>
                    </div>
                    
                    <p className={`text-[9px] font-bold mt-2 text-center transition-colors ${formData.isEstablishment ? 'text-blue-500/80' : 'text-emerald-500/80'}`}>
                        {formData.isEstablishment 
                            ? "يُحسب ضمن تكلفة تجهيز العروة" 
                            : "يُحسب ضمن المصاريف اليومية المتكررة"}
                    </p>
                </div>

                {/* Prominent Amount Field (Focal Point) */}
                <div className="bg-emerald-500/5 dark:bg-emerald-950/15 p-4 rounded-xl border-2 border-emerald-500/15 dark:border-emerald-500/10 transition-all focus-within:border-emerald-500/30">
                    <label htmlFor="amount" className="block text-center text-xs font-black text-emerald-600 dark:text-emerald-400 mb-2">
                        💵 مبلغ المصروف الإجمالي (جنيه مصري)
                    </label>
                    <div className="relative flex items-center justify-center">
                        <input
                            id="amount"
                            name="amount"
                            type="text"
                            inputMode="decimal"
                            value={formatNumberWithCommas(formData.amount)}
                            onChange={handleChange}
                            className="w-full bg-transparent border-none outline-none text-center text-2xl font-black text-emerald-600 dark:text-emerald-400 placeholder:text-emerald-300/60 dark:placeholder:text-emerald-950/40 focus:ring-0 focus:border-none focus:outline-none p-1 block tabular-nums"
                            placeholder="0.00"
                        />
                    </div>
                    <ErrorMessage error={errors.amount} />
                </div>

                {/* Side-by-Side: Description & Category */}
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="description" className={labelClasses}>وصف المصروف</label>
                        <input
                            id="description"
                            name="description"
                            type="text"
                            value={formData.description}
                            onChange={handleChange}
                            className={`${inputBaseClasses} ${errors.description ? 'border-accent-danger focus:border-accent-danger focus:ring-accent-danger/50' : ''}`}
                            placeholder="مثال: تسميد-رش"
                        />
                        <ErrorMessage error={errors.description} />
                    </div>
                    <div>
                        <label htmlFor="categoryId" className={labelClasses}>الفئة</label>
                        <div className="relative">
                            <select
                                id="categoryId"
                                name="categoryId"
                                value={formData.categoryId}
                                onChange={handleChange}
                                className={`${inputBaseClasses} appearance-none pr-8 ${errors.categoryId ? 'border-accent-danger focus:border-accent-danger focus:ring-accent-danger/50' : ''}`}
                            >
                                <option value="" disabled>اختر فئة</option>
                                {expenseCategories.map(option => <option key={option.id} value={option.id}>{option.name}</option>)}
                            </select>
                            <ChevronDownIcon className="h-5 w-5 text-neutral-400 absolute top-1/2 -translate-y-1/2 left-3 pointer-events-none" />
                        </div>
                        <ErrorMessage error={errors.categoryId} />
                    </div>
                </div>
                
                {/* Side-by-Side: Date & Cycle */}
                <div className="grid grid-cols-2 gap-4">
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
                                <option value="" disabled>اختر {term.singular}</option>
                                {cycleOptions.map(option => <option key={option.id} value={option.name}>{option.name}</option>)}
                            </select>
                            <ChevronDownIcon className="h-5 w-5 text-neutral-400 absolute top-1/2 -translate-y-1/2 left-3 pointer-events-none" />
                        </div>
                        <ErrorMessage error={errors.cycle} />
                    </div>
                </div>
                
                {showPaymentOptions && (
                    <div className="p-4 rounded-xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700 space-y-4 animate-enter">
                        <h4 className="font-black text-neutral-600 dark:text-neutral-300 text-xs uppercase tracking-widest">خيارات السداد والمورد</h4>
                        
                        <div className="flex gap-4 p-1 bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-700">
                            {(['cash', 'credit'] as const).map(method => (
                                <button
                                    key={method}
                                    type="button"
                                    onClick={() => setFormData(prev => ({ ...prev, paymentMethod: method }))}
                                    className={`flex-1 py-2 px-3 rounded-md text-xs font-black transition-all ${formData.paymentMethod === method ? 'bg-primary text-white shadow-sm' : 'text-neutral-500 hover:bg-neutral-50 dark:hover:bg-neutral-800'}`}
                                >
                                    {method === 'cash' ? '💵 نقدي (كاش)' : '📑 آجل (على المورد)'}
                                </button>
                            ))}
                        </div>

                        {showSupplierDropdown && (
                            <div className="space-y-4 animate-enter">
                                <div>
                                    <label htmlFor="supplierId" className={labelClasses}>المورد المسجل عليه</label>
                                    <div className="relative">
                                        <select
                                            id="supplierId"
                                            name="supplierId"
                                            value={formData.supplierId}
                                            onChange={handleChange}
                                            className={`${inputBaseClasses} appearance-none pr-8 ${errors.supplierId ? 'border-accent-danger focus:border-accent-danger focus:ring-accent-danger/50' : ''}`}
                                        >
                                            <option value="" disabled>اختر موردًا</option>
                                            {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                        </select>
                                        <ChevronDownIcon className="h-5 w-5 text-neutral-400 absolute top-1/2 -translate-y-1/2 left-3 pointer-events-none" />
                                    </div>
                                    <ErrorMessage error={errors.supplierId} />
                                </div>

                                {supplierBalanceInfo && (
                                    <div className="bg-neutral-900 dark:bg-black rounded-xl p-4 text-white relative overflow-hidden shadow-inner border border-white/5 animate-enter">
                                        <div className="relative z-10 flex justify-between items-center">
                                            <div className="space-y-1">
                                                <p className="text-[10px] font-black text-white/50 uppercase tracking-widest flex items-center gap-1.5">
                                                    <WalletIcon className="w-3 h-3" />
                                                    الرصيد بعد هذه الفاتورة
                                                </p>
                                                <div className="flex items-baseline gap-1.5">
                                                    <h3 className="text-2xl font-black tabular-nums text-primary-light">
                                                        {formatNumber(supplierBalanceInfo.expected)}
                                                    </h3>
                                                    <span className="text-[10px] font-bold opacity-60">ج.م</span>
                                                </div>
                                            </div>
                                            <div className="text-left">
                                                <p className="text-[8px] font-bold text-white/40 mb-0.5">رصيد {supplierBalanceInfo.name} الحالي</p>
                                                <p className="text-xs font-black tabular-nums">{formatNumber(supplierBalanceInfo.current)} ج.م</p>
                                            </div>
                                        </div>
                                        <div className="absolute top-0 right-0 w-16 h-16 bg-primary/10 rounded-full blur-2xl"></div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Sticky Footers */}
            <div className="sticky bottom-0 bg-white dark:bg-neutral-900 pt-3 pb-1 px-1 flex gap-3 border-t border-neutral-200 dark:border-neutral-800 shadow-[0_-4px_12px_rgba(0,0,0,0.05)] z-20">
                <button 
                    type="button" 
                    onClick={() => { clearFormData(); onCancel(); }} 
                    disabled={isSaving}
                    className="flex-1 py-3 bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 font-bold rounded-xl text-xs sm:text-sm transition-all cursor-pointer border border-neutral-200 dark:border-neutral-705"
                >
                    إلغاء
                </button>
                <button 
                    type="submit" 
                    onClick={triggerSaveHaptic}
                    disabled={isSaving} 
                    className="flex-[2] py-3 bg-primary hover:bg-primary-dark text-white font-black rounded-xl text-xs sm:text-sm transition-all shadow-md shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-1.5"
                >
                    {isSaving ? (
                        <span>جاري الحفظ...</span>
                    ) : (
                        <span>{initialData && 'id' in initialData ? 'حفظ التعديلات' : 'تأكيد وحفظ'}</span>
                    )}
                </button>
            </div>
        </form>
    );
};

export default AddExpenseForm;
