import React, { useState, useEffect, useMemo } from 'react';
import type { Cycle } from '../../types';
import { ChevronDownIcon } from '../Icons';
import { useData } from '../../contexts/DataContext';
import { terminology } from '../../contexts/SettingsContext';
import { formatNumberWithCommas, parseFormattedNumber, getLocalDateString } from '../../utils/helpers';
import { triggerSaveHaptic } from '../../lib/haptics';

interface AddCycleFormProps {
    onSave: (cycle: Omit<Cycle, 'id' | 'revenue' | 'expenses' | 'profit' | 'health'> | Cycle, transferBalance?: boolean, customTransferAmount?: number) => void;
    onCancel: () => void;
    initialData?: Cycle | null;
}

const statusOptions = [{value: 'active', label: 'نشطة'}, {value: 'closed', label: 'مغلقة'}, {value: 'archived', label: 'مؤرشفة'}];


const AddCycleForm: React.FC<AddCycleFormProps> = ({ onSave, onCancel, initialData }) => {
    const { settings, farmers, assets, cycles, getCycleTotalBalance, invoices } = useData();
    const term = terminology[settings.primaryTerm];
    const [unitOfMeasure, setUnitOfMeasure] = useState<'plants' | 'area'>(initialData?.unit_of_measure || 'plants');
    const [isSaving, setIsSaving] = useState(false);

    const closedCycleToTransfer = useMemo(() => {
        if (initialData) return null; // Only for new cycles
        if (!cycles || cycles.length === 0) return null;
        
        const closed = cycles.filter(c => c.status === 'closed');
        if (closed.length === 0) return null;
        
        // Sort closed cycles by creation or start date descending to find the latest
        const sortedClosed = [...closed].sort((a, b) => new Date(b.created_at || b.start_date || 0).getTime() - new Date(a.created_at || a.start_date || 0).getTime());
        const latestClosed = sortedClosed[0];
        const balance = getCycleTotalBalance(latestClosed.id);
        
        if (balance > 0) {
            // Check if its balance has already been transferred to some other cycle
            const isAlreadyTransferred = invoices.some(inv => inv.market === 'رصيد منقول' && inv.notes?.includes(latestClosed.id));
            if (!isAlreadyTransferred) {
                return {
                    id: latestClosed.id,
                    name: latestClosed.name,
                    balance
                };
            }
        }
        return null;
    }, [cycles, getCycleTotalBalance, invoices, initialData]);

    const [shouldTransferBalance, setShouldTransferBalance] = useState(true);
    const [transferMode, setTransferMode] = useState<'full' | 'deduct' | 'add'>('full');
    const [adjustmentAmount, setAdjustmentAmount] = useState('');

    const getInitialState = () => ({
        name: initialData?.name || '',
        seed_type: initialData?.seed_type || '',
        plant_count: (initialData?.unit_of_measure === 'plants' || !initialData) ? String(initialData?.plant_count || '') : '',
        area_in_feddans: initialData?.unit_of_measure === 'area' ? String(initialData?.area_in_feddans || '') : '',
        asset_id: initialData?.asset_id || '',
        start_date: initialData?.start_date || getLocalDateString(),
        status: (initialData?.status as 'active' | 'closed' | 'archived') || 'active',
        responsible_farmer_id: initialData?.responsible_farmer_id || '',
        farmer_share_percentage: (initialData?.farmer_share_percentage ?? 20).toString(),
        target_yield: String(initialData?.target_yield || ''),
        notes: initialData?.notes || '',
    });

    const [formData, setFormData] = useState(getInitialState());
    const [errors, setErrors] = useState<Record<string, string>>({});

    useEffect(() => {
        setUnitOfMeasure(initialData?.unit_of_measure || 'plants');
        setFormData({
            name: initialData?.name || '',
            seed_type: initialData?.seed_type || '',
            plant_count: (initialData?.unit_of_measure === 'plants' || !initialData) ? String(initialData?.plant_count || '') : '',
            area_in_feddans: initialData?.unit_of_measure === 'area' ? String(initialData?.area_in_feddans || '') : '',
            asset_id: initialData?.asset_id || '',
            start_date: initialData?.start_date || getLocalDateString(),
            status: (initialData?.status as 'active' | 'closed' | 'archived') || 'active',
            responsible_farmer_id: initialData?.responsible_farmer_id || '',
            farmer_share_percentage: (initialData?.farmer_share_percentage ?? 20).toString(),
            target_yield: String(initialData?.target_yield || ''),
            notes: initialData?.notes || '',
        });
    }, [initialData, farmers, assets]);

    const validate = (): boolean => {
        const newErrors: Record<string, string> = {};
        if (formData.name.trim() === '') {
            newErrors.name = `اسم ${term.singular} مطلوب.`;
        }
        if (formData.seed_type.trim() === '') {
            newErrors.seed_type = 'نوع البذرة مطلوب.';
        }
        if (!formData.asset_id) {
            newErrors.asset_id = 'يجب اختيار الأصل.';
        }
        if (unitOfMeasure === 'plants') {
            const plantCountNum = parseInt(formData.plant_count, 10);
            if (isNaN(plantCountNum) || plantCountNum <= 0) {
                newErrors.plant_count = 'عدد النباتات يجب أن يكون رقمًا صحيحًا أكبر من صفر.';
            }
        } else {
             const areaNum = parseFloat(formData.area_in_feddans);
            if (isNaN(areaNum) || areaNum <= 0) {
                newErrors.area_in_feddans = 'المساحة يجب أن تكون رقمًا أكبر من صفر.';
            }
        }
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };


    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        
        const numericIntFields = ['plant_count'];
        const numericDecimalFields = ['area_in_feddans', 'farmer_share_percentage', 'target_yield'];

        if (numericIntFields.includes(name)) {
            const parsedValue = parseFormattedNumber(value);
            if (/^\d*$/.test(parsedValue)) {
                setFormData(prev => ({ ...prev, [name]: parsedValue }));
            }
        } else if (numericDecimalFields.includes(name)) {
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
        const getNum = (val: string) => {
            if (val.trim() === '') return null;
            const num = parseFloat(val);
            return isNaN(num) ? null : num;
        };
        const getInt = (val: string) => {
            if (val.trim() === '') return null;
            const num = parseInt(val, 10);
            return isNaN(num) ? null : num;
        };

        const cycleData = {
            name: formData.name,
            seed_type: formData.seed_type,
            asset_id: formData.asset_id,
            start_date: formData.start_date,
            status: formData.status,
            responsible_farmer_id: formData.responsible_farmer_id || null,
            farmer_share_percentage: getNum(formData.farmer_share_percentage) ?? 0,
            target_yield: getNum(formData.target_yield),
            unit_of_measure: unitOfMeasure,
            plant_count: unitOfMeasure === 'plants' ? getInt(formData.plant_count) : null,
            area_in_feddans: unitOfMeasure === 'area' ? getNum(formData.area_in_feddans) : null,
            notes: formData.notes,
        };

        try {
            if (initialData) {
                 await onSave({ ...initialData, ...cycleData });
            } else {
                 let finalAmount: number | undefined = undefined;
                 if (closedCycleToTransfer && shouldTransferBalance) {
                     const originalBalance = closedCycleToTransfer.balance;
                     const adj = parseFloat(adjustmentAmount) || 0;
                     if (transferMode === 'deduct') {
                         finalAmount = Math.max(0, originalBalance - adj);
                     } else if (transferMode === 'add') {
                         finalAmount = originalBalance + adj;
                     } else {
                         finalAmount = originalBalance;
                     }
                 }
                 await onSave(cycleData as Omit<Cycle, 'id' | 'revenue' | 'expenses' | 'profit' | 'health'>, !!closedCycleToTransfer && shouldTransferBalance, finalAmount);
            }
        } catch (error) {
            console.error("Save error:", error);
            setIsSaving(false);
        }
    };
    
    const inputBaseClasses = "w-full bg-neutral-100 dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 text-slate-800 dark:text-white rounded-lg p-3 focus:ring-2 focus:ring-primary focus:border-primary transition placeholder:text-neutral-500";
    const labelClasses = "block text-sm font-medium text-gray-500 dark:text-gray-300 mb-2 text-right";
    const ErrorMessage: React.FC<{ error?: string }> = ({ error }) => {
        if (!error) return null;
        return <p className="text-accent-danger text-xs mt-1 text-right">{error}</p>
    }

    return (
        <div className="max-h-[70vh] overflow-y-auto pr-2">
            <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                    <label htmlFor="name" className={labelClasses}>{`اسم ${term.singular}`}</label>
                    <input id="name" name="name" type="text" value={formData.name} onChange={handleChange} className={`${inputBaseClasses} ${errors.name ? 'border-accent-danger focus:border-accent-danger focus:ring-accent-danger/50' : ''}`} />
                    <ErrorMessage error={errors.name} />
                </div>
                 <div>
                    <label htmlFor="seed_type" className={labelClasses}>نوع البذرة</label>
                    <input id="seed_type" name="seed_type" type="text" value={formData.seed_type} onChange={handleChange} className={`${inputBaseClasses} ${errors.seed_type ? 'border-accent-danger focus:border-accent-danger focus:ring-accent-danger/50' : ''}`} />
                    <ErrorMessage error={errors.seed_type} />
                </div>
                 <div>
                    <label htmlFor="target_yield" className={labelClasses}>الإنتاج المستهدف (ك.ج)</label>
                    <input id="target_yield" name="target_yield" type="text" inputMode="decimal" value={formatNumberWithCommas(formData.target_yield)} onChange={handleChange} className={inputBaseClasses} />
                    <p className="text-xs text-gray-500 mt-2">اختياري: حدد الكمية المستهدفة بالكيلوجرام.</p>
                </div>

                <div>
                    <label className={labelClasses}>وحدة القياس</label>
                    <div className="grid grid-cols-2 gap-2 p-1 bg-neutral-200 dark:bg-neutral-700/50 rounded-lg">
                        <button type="button" onClick={() => setUnitOfMeasure('plants')} className={`py-2 rounded-md font-semibold transition ${unitOfMeasure === 'plants' ? 'bg-white dark:bg-neutral-600 text-primary' : 'text-neutral-500'}`}>عدد النباتات</button>
                        <button type="button" onClick={() => setUnitOfMeasure('area')} className={`py-2 rounded-md font-semibold transition ${unitOfMeasure === 'area' ? 'bg-white dark:bg-neutral-600 text-primary' : 'text-neutral-500'}`}>المساحة</button>
                    </div>
                </div>

                {unitOfMeasure === 'plants' ? (
                     <div>
                        <label htmlFor="plant_count" className={labelClasses}>عدد النباتات</label>
                        <input id="plant_count" name="plant_count" type="text" inputMode="numeric" value={formatNumberWithCommas(formData.plant_count)} onChange={handleChange} className={`${inputBaseClasses} ${errors.plant_count ? 'border-accent-danger focus:border-accent-danger focus:ring-accent-danger/50' : ''}`}/>
                        <ErrorMessage error={errors.plant_count} />
                    </div>
                ) : (
                    <div>
                        <label htmlFor="area_in_feddans" className={labelClasses}>المساحة (بالفدان)</label>
                        <input id="area_in_feddans" name="area_in_feddans" type="text" inputMode="decimal" value={formatNumberWithCommas(formData.area_in_feddans)} onChange={handleChange} className={`${inputBaseClasses} ${errors.area_in_feddans ? 'border-accent-danger focus:border-accent-danger focus:ring-accent-danger/50' : ''}`}/>
                        <ErrorMessage error={errors.area_in_feddans} />
                    </div>
                )}


                <div>
                    <label htmlFor="asset_id" className={labelClasses}>الأصل</label>
                    <div className="relative">
                        <select id="asset_id" name="asset_id" value={formData.asset_id} onChange={handleChange} className={`${inputBaseClasses} appearance-none pr-8 ${errors.asset_id ? 'border-accent-danger focus:border-accent-danger focus:ring-accent-danger/50' : ''}`}>
                            <option value="" disabled>اختر أصلاً</option>
                            {assets.map(option => <option key={option.id} value={option.id}>{option.name}</option>)}
                        </select>
                        <ChevronDownIcon className="h-5 w-5 text-gray-400 absolute top-1/2 -translate-y-1/2 left-3 pointer-events-none" />
                    </div>
                    {assets.length === 0 && <p className="text-xs text-amber-600 dark:text-amber-500 mt-2 text-right">لا توجد أصول. الرجاء إضافة أصل من صفحة "إدارة الأصول" أولاً.</p>}
                    <ErrorMessage error={errors.asset_id} />
                </div>
                <div>
                    <label htmlFor="start_date" className={labelClasses}>تاريخ البدء</label>
                    <input id="start_date" name="start_date" type="date" value={formData.start_date} onChange={handleChange} className={`${inputBaseClasses} ${errors.start_date ? 'border-accent-danger focus:border-accent-danger focus:ring-accent-danger/50' : ''}`} />
                    <ErrorMessage error={errors.start_date} />
                     <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-right">
                        ملاحظة: سيتم تحديد تاريخ بدء الإنتاج تلقائيًا بناءً على تاريخ أول فاتورة بيع لهذا {term.singular}.
                    </p>
                </div>
                <div>
                    <label htmlFor="status" className={labelClasses}>الحالة</label>
                    <div className="relative">
                        <select id="status" name="status" value={formData.status} onChange={handleChange} className={`${inputBaseClasses} appearance-none pr-8`}>
                            {statusOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                        </select>
                        <ChevronDownIcon className="h-5 w-5 text-gray-400 absolute top-1/2 -translate-y-1/2 left-3 pointer-events-none" />
                    </div>
                </div>
                
                {settings.systems.farmer_account && (
                    <>
                        <div>
                            <label htmlFor="responsible_farmer_id" className={labelClasses}>المزارع المسؤول</label>
                            <div className="relative">
                                <select id="responsible_farmer_id" name="responsible_farmer_id" value={formData.responsible_farmer_id || ''} onChange={handleChange} className={`${inputBaseClasses} appearance-none pr-8`}>
                                    <option value="">بدون مزارع</option>
                                    {farmers.map(option => <option key={option.id} value={option.id}>{option.name}</option>)}
                                </select>
                                <ChevronDownIcon className="h-5 w-5 text-gray-400 absolute top-1/2 -translate-y-1/2 left-3 pointer-events-none" />
                            </div>
                        </div>

                        {formData.responsible_farmer_id && (
                           <div>
                                <label htmlFor="farmer_share_percentage" className={labelClasses}>نسبة حصة المزارع (%)</label>
                                <input id="farmer_share_percentage" name="farmer_share_percentage" type="text" inputMode="decimal" value={formatNumberWithCommas(formData.farmer_share_percentage)} onChange={handleChange} className={inputBaseClasses} />
                           </div>
                        )}
                    </>
                )}

                <div>
                    <label htmlFor="notes" className={labelClasses}>ملاحظات (اختياري)</label>
                    <textarea
                        id="notes"
                        name="notes"
                        value={formData.notes}
                        onChange={handleChange}
                        rows={3}
                        className={inputBaseClasses}
                        placeholder="أضف أي ملاحظات إضافية هنا..."
                    />
                </div>

                {closedCycleToTransfer && (
                    <div className="space-y-4">
                        <div className="p-4 rounded-xl border border-primary/25 bg-primary/5 dark:bg-primary/10 flex items-start gap-3 mt-4 text-slate-800 dark:text-neutral-100">
                            <input 
                                id="shouldTransferBalance" 
                                name="shouldTransferBalance" 
                                type="checkbox" 
                                checked={shouldTransferBalance}
                                onChange={(e) => setShouldTransferBalance(e.target.checked)}
                                className="w-5 h-5 rounded text-primary focus:ring-primary border-gray-300 dark:border-gray-700 mt-1 cursor-pointer accent-primary" 
                            />
                            <div className="flex-grow select-none cursor-pointer" onClick={() => setShouldTransferBalance(!shouldTransferBalance)}>
                                <label className="block text-sm font-bold text-neutral-800 dark:text-neutral-100 text-right cursor-pointer">
                                    نقل رصيد الخزنة المتبقي كـ رأس مال البداية
                                </label>
                                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 text-right leading-relaxed">
                                    تم العثور على رصيد متبقي بقيمة <span className="font-extrabold text-primary font-mono">{closedCycleToTransfer.balance.toLocaleString('en-US')} ج.م</span> من العروة المغلقة السابقة (<span className="font-black text-primary">{closedCycleToTransfer.name}</span>). سيؤدي تفعيل هذا الخيار لنقله تلقائياً كـ رصيد منقول للبداية في العروة الجديدة.
                                </p>
                            </div>
                        </div>

                        {shouldTransferBalance && (
                            <div className="p-4 bg-white dark:bg-[#111927] rounded-xl border border-neutral-200 dark:border-neutral-700 space-y-4 animate-fade-in text-right">
                                <span className="text-xs font-black text-gray-500 dark:text-gray-300 block mb-2">كيف ترغب في معالجة هذا الرصيد لبدء العروة الجديدة؟</span>
                                <div className="grid grid-cols-3 gap-2">
                                    <button
                                        type="button"
                                        onClick={() => { setTransferMode('full'); setAdjustmentAmount(''); }}
                                        className={`py-2.5 px-3 rounded-lg text-xs font-bold transition-all border cursor-pointer ${transferMode === 'full' ? 'bg-primary text-white border-primary' : 'bg-neutral-50 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 border-neutral-200 dark:border-neutral-700'}`}
                                    >
                                        نقل بالكامل كما هو
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => { setTransferMode('deduct'); setAdjustmentAmount(''); }}
                                        className={`py-2.5 px-3 rounded-lg text-xs font-bold transition-all border cursor-pointer ${transferMode === 'deduct' ? 'bg-amber-500 text-white border-amber-500' : 'bg-neutral-50 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 border-neutral-200 dark:border-neutral-700'}`}
                                    >
                                        خصم/سحب أرباح منه
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => { setTransferMode('add'); setAdjustmentAmount(''); }}
                                        className={`py-2.5 px-3 rounded-lg text-xs font-bold transition-all border cursor-pointer ${transferMode === 'add' ? 'bg-indigo-500 text-white border-indigo-500' : 'bg-neutral-50 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 border-neutral-200 dark:border-neutral-700'}`}
                                    >
                                        إضافة رأس مال أكثر
                                    </button>
                                </div>

                                {transferMode === 'deduct' && (
                                    <div className="space-y-1.5 text-right animate-slide-up bg-neutral-50 dark:bg-neutral-800/40 p-3 rounded-lg border border-neutral-200 dark:border-neutral-700">
                                        <label className="text-[11px] font-bold text-slate-600 dark:text-neutral-300 block">المبلغ المراد سحبه/خصمه كربح قبل البداية (ج.م)</label>
                                        <input 
                                            type="number"
                                            required
                                            min="1"
                                            max={closedCycleToTransfer.balance}
                                            value={adjustmentAmount}
                                            onChange={e => setAdjustmentAmount(e.target.value)}
                                            placeholder="مثال: 5000"
                                            className="w-full bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 text-slate-800 dark:text-white rounded-lg p-2.5 text-sm font-bold text-left outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                                            dir="ltr"
                                        />
                                        <p className="text-[10px] font-bold text-amber-600 dark:text-amber-500 mt-1">
                                            الرصيد النهائي الذي ستنطلق به عروتك الجديدة: <span className="font-extrabold text-xs font-mono">{(closedCycleToTransfer.balance - (parseFloat(adjustmentAmount) || 0)).toLocaleString('en-US')} ج.م</span>
                                        </p>
                                    </div>
                                )}

                                {transferMode === 'add' && (
                                    <div className="space-y-1.5 text-right animate-slide-up bg-neutral-50 dark:bg-neutral-800/40 p-3 rounded-lg border border-neutral-200 dark:border-neutral-700">
                                        <label className="text-[11px] font-bold text-slate-600 dark:text-neutral-300 block">المبلغ الإضافي المراد إيداعه مع رصيد البداية (ج.م)</label>
                                        <input 
                                            type="number"
                                            required
                                            min="1"
                                            value={adjustmentAmount}
                                            onChange={e => setAdjustmentAmount(e.target.value)}
                                            placeholder="مثال: 10000"
                                            className="w-full bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 text-slate-800 dark:text-white rounded-lg p-2.5 text-sm font-bold text-left outline-none focus:ring-2 focus:ring-indigo-500/25 focus:border-indigo-500"
                                            dir="ltr"
                                        />
                                        <p className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 mt-1">
                                            الرصيد النهائي الذي ستنطلق به عروتك الجديدة: <span className="font-extrabold text-xs font-mono">{(closedCycleToTransfer.balance + (parseFloat(adjustmentAmount) || 0)).toLocaleString('en-US')} ج.م</span>
                                        </p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}
                
                 <div className="pt-6 flex justify-start gap-4 flex-row-reverse">
                    <button type="submit" onClick={triggerSaveHaptic} disabled={isSaving} className="py-3 px-8 bg-primary text-white font-semibold rounded-lg hover:bg-primary-dark transition shadow-md disabled:bg-primary/50 disabled:cursor-not-allowed">
                        {isSaving ? 'جاري الحفظ...' : (initialData ? 'حفظ التعديلات' : 'حفظ')}
                    </button>
                    <button 
                        type="button" 
                        onClick={onCancel} 
                        disabled={isSaving}
                        className="py-3 px-8 bg-gray-200 dark:bg-gray-700/80 text-slate-800 dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600/80 transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        إلغاء
                    </button>
                </div>
            </form>
        </div>
    );
};

export default AddCycleForm;
