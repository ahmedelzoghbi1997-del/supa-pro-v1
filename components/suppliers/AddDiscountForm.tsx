import React, { useState, useMemo } from 'react';
import type { Supplier, Expense, Cycle } from '../../types';
import { ChevronDownIcon, LucideTag } from '../Icons';
import { useSettings, terminology } from '../../contexts/SettingsContext';
import { useData } from '../../contexts/DataContext';
import { formatNumberWithCommas, parseFormattedNumber, formatCurrency, getLocalDateString } from '../../utils/helpers';
import { triggerSaveHaptic } from '../../lib/haptics';

interface AddDiscountFormProps {
    onSave: (discount: Omit<Expense, 'id' | 'user_id' | 'created_at'>) => Promise<void>;
    onCancel: () => void;
    supplierId: string;
    suppliers: Supplier[];
    cycles: Cycle[];
    initialData?: Expense;
}

const AddDiscountForm: React.FC<AddDiscountFormProps> = ({ onSave, onCancel, supplierId, suppliers, cycles, initialData }) => {
    const { settings } = useSettings();
    const { addExpenseCategory, allExpenseCategories } = useData();
    const term = terminology[settings.primaryTerm];
    const [isSaving, setIsSaving] = useState(false);
    
    const supplier = useMemo(() => suppliers.find(s => s.id === supplierId), [suppliers, supplierId]);
    
    const activeCycles = useMemo(() => cycles.filter(c => c.status === 'active' || c.id === initialData?.cycle_id), [cycles, initialData]);

    const [amount, setAmount] = useState(initialData ? formatNumberWithCommas(Math.abs(initialData.amount)) : '');
    const [cycleId, setCycleId] = useState(initialData?.cycle_id || activeCycles[0]?.id || '');
    const [date, setDate] = useState(initialData?.date || getLocalDateString());
    const [description, setDescription] = useState(initialData?.description || 'خصم ممنوح من المورد');
    
    const [errors, setErrors] = useState<Record<string, string>>({});

    const selectedCycleName = useMemo(() => {
        return cycles.find(c => c.id === cycleId)?.name || '...';
    }, [cycles, cycleId]);

    const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        const cleanValue = value.replace(/[^\d.]/g, '');
        if (cleanValue) {
            setAmount(formatNumberWithCommas(parseFormattedNumber(cleanValue)));
        } else {
            setAmount('');
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        triggerSaveHaptic();
        const amtNum = parseFormattedNumber(amount);
        const newErrors: Record<string, string> = {};
        
        if (!amtNum || amtNum <= 0) {
            newErrors.amount = 'يجب إدخال قيمة خصم صالحة أكبر من صفر.';
        }
        if (!cycleId) {
            newErrors.cycleId = `يجب تحديد ${term.singular}.`;
        }
        if (!date) {
            newErrors.date = 'يجب تحديد تاريخ الخصم.';
        }
        if (!description.trim()) {
            newErrors.description = 'يجب إدخال بيان أو وصف للخصم.';
        }

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }

        setIsSaving(true);
        try {
            // Check if "خصم مكتسب (موردين)" category exists, otherwise create it
            const cat = allExpenseCategories.find(c => c.name === 'خصم مكتسب (موردين)');
            let catId = cat?.id;
            if (!catId) {
                // If not found, we create it
                catId = await addExpenseCategory({
                    name: 'خصم مكتسب (موردين)',
                    is_supplier_category: true
                });
            }

            await onSave({
                amount: -amtNum, 
                cycle_id: cycleId,
                date: date,
                description: description.trim(),
                category_id: catId || allExpenseCategories[0]?.id || '',
                supplier_id: supplierId,
                payment_method: 'credit', 
            });
        } catch (err) {
            console.error(err);
        } finally {
            setIsSaving(false);
        }
    };

    const amtNum = parseFormattedNumber(amount) || 0;

    return (
        <div className="text-right font-sans" dir="rtl">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Right Side: Inputs Column (lg:col-span-2) */}
                <form onSubmit={handleSubmit} className="lg:col-span-2 space-y-5">
                    
                    <div className="bg-neutral-50 dark:bg-neutral-850/50 p-5 rounded-2xl border border-neutral-200/60 dark:border-neutral-800/80 space-y-4">
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Supplier Name (Read Only) */}
                            <div>
                                <label className="block text-xs font-black text-neutral-450 dark:text-neutral-500 uppercase tracking-widest mb-1.5 px-1">المورد المستفيد</label>
                                <div className="w-full h-11 bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700/60 rounded-xl px-4 flex items-center justify-between font-bold text-xs text-neutral-700 dark:text-neutral-300">
                                    {supplier?.name || 'مورد غير معروف'}
                                </div>
                            </div>

                            {/* Cycle (العروة) */}
                            <div className="relative">
                                <label className="block text-xs font-black text-neutral-450 dark:text-neutral-500 uppercase tracking-widest mb-1.5 px-1">{term.singular}</label>
                                <div className="relative">
                                    <select
                                        value={cycleId}
                                        onChange={(e) => setCycleId(e.target.value)}
                                        className="w-full h-11 bg-white dark:bg-neutral-900 hover:bg-neutral-50 dark:hover:bg-neutral-800 border border-neutral-250 dark:border-neutral-700 text-neutral-800 dark:text-white rounded-xl px-4 pl-10 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all cursor-pointer appearance-none"
                                    >
                                        <option value="">اختر {term.singular}...</option>
                                        {activeCycles.map(c => (
                                            <option key={c.id} value={c.id}>{c.name}</option>
                                        ))}
                                    </select>
                                    <ChevronDownIcon className="w-4 h-4 ml-3 text-neutral-400 absolute left-2 top-3.5 pointer-events-none" />
                                </div>
                                {errors.cycleId && <p className="text-rose-500 text-[10px] font-bold mt-1 px-1">{errors.cycleId}</p>}
                            </div>

                            {/* Amount (المبلغ) */}
                            <div>
                                <label className="block text-xs font-black text-neutral-450 dark:text-neutral-500 uppercase tracking-widest mb-1.5 px-1">قيمة الخصم (ج.م)</label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        inputMode="decimal"
                                        placeholder="0.00"
                                        value={amount}
                                        onChange={handleAmountChange}
                                        className="w-full h-11 bg-white dark:bg-neutral-900 hover:bg-neutral-50 dark:hover:bg-neutral-800 border-2 border-violet-100 dark:border-violet-950/20 text-violet-600 dark:text-violet-400 rounded-xl px-4 pl-12 text-sm font-black focus:outline-none focus:ring-4 focus:ring-violet-500/10 focus:border-violet-500 transition-all text-left placeholder:text-neutral-300"
                                    />
                                    <span className="absolute left-4 top-3 text-xs font-black text-violet-400">ج.م</span>
                                </div>
                                {errors.amount && <p className="text-rose-500 text-[10px] font-bold mt-1 px-1">{errors.amount}</p>}
                            </div>

                            {/* Date (التاريخ) */}
                            <div>
                                <label className="block text-xs font-black text-neutral-450 dark:text-neutral-500 uppercase tracking-widest mb-1.5 px-1">التاريخ</label>
                                <input
                                    type="date"
                                    value={date}
                                    onChange={(e) => setDate(e.target.value)}
                                    className="w-full h-11 bg-white dark:bg-neutral-900 hover:bg-neutral-50 dark:hover:bg-neutral-800 border border-neutral-250 dark:border-neutral-700 text-neutral-800 dark:text-white rounded-xl px-4 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all cursor-pointer"
                                />
                                {errors.date && <p className="text-rose-500 text-[10px] font-bold mt-1 px-1">{errors.date}</p>}
                            </div>
                        </div>

                        {/* Description */}
                        <div>
                            <label className="block text-xs font-black text-neutral-450 dark:text-neutral-500 uppercase tracking-widest mb-1.5 px-1">البيان (الوصف للدفتر المالي)</label>
                            <input
                                type="text"
                                placeholder="مثال: خصم تسوية حساب / خصم كمية للكميات المستلمة..."
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                className="w-full h-11 bg-white dark:bg-neutral-900 hover:bg-neutral-50 dark:hover:bg-neutral-800 border border-neutral-250 dark:border-neutral-700 text-neutral-800 dark:text-white rounded-xl px-4 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all"
                            />
                            {errors.description && <p className="text-rose-500 text-[10px] font-bold mt-1 px-1">{errors.description}</p>}
                        </div>

                    </div>

                    {/* Form Buttons */}
                    <div className="flex gap-3 justify-end pt-2">
                        <button
                            type="button"
                            onClick={onCancel}
                            disabled={isSaving}
                            className="h-10 px-5 bg-neutral-200 hover:bg-neutral-250 dark:bg-neutral-800 dark:hover:bg-neutral-750 text-neutral-750 dark:text-white text-xs font-bold rounded-xl transition-all disabled:opacity-50 active:scale-95"
                        >
                            إلغاء
                        </button>
                        <button
                            type="submit"
                            onClick={triggerSaveHaptic}
                            disabled={isSaving}
                            className="h-10 px-8 bg-violet-600 hover:bg-violet-700 text-white text-xs font-black rounded-xl transition-all shadow-sm shadow-violet-200/5 disabled:opacity-50 active:scale-95 flex items-center justify-center gap-2"
                        >
                            {isSaving ? 'جاري الحفظ...' : initialData ? 'حفظ التعديلات' : 'تسجيل الخصم'}
                        </button>
                    </div>

                </form>

                {/* Left Side: Real-time Premium Voucher Ticket preview (lg:col-span-1) */}
                <div className="lg:col-span-1">
                    <div className="bg-gradient-to-br from-violet-600 to-indigo-700 text-white rounded-2.5xl p-5 shadow-lg relative overflow-hidden flex flex-col justify-between h-full min-h-[310px] border border-violet-500/30">
                        
                        {/* Background subtle geometric rings */}
                        <div className="absolute -top-12 -left-12 w-32 h-32 bg-white/5 rounded-full blur-xl pointer-events-none"></div>
                        <div className="absolute -bottom-16 -right-16 w-36 h-36 bg-white/10 rounded-full blur-2xl pointer-events-none"></div>
                        
                        <div className="relative z-10 space-y-4">
                            {/* Header Voucher */}
                            <div className="flex items-center justify-between border-b border-white/20 pb-2.5">
                                <div className="flex items-center gap-1.5">
                                    <div className="p-1.5 bg-white/15 dark:bg-black/20 rounded-lg">
                                        <LucideTag className="w-4 h-4 text-violet-100" />
                                    </div>
                                    <span className="text-[10px] uppercase font-black tracking-wider text-violet-100">سند خصم مكتسب</span>
                                </div>
                                <span className="text-[9px] font-mono tracking-tight bg-black/20 px-2 py-0.5 rounded-full text-violet-200">
                                    مؤقت
                                </span>
                            </div>

                            {/* Main Body */}
                            <div className="space-y-3">
                                <div>
                                    <p className="text-[8px] text-violet-200 font-bold mb-0.5">المستفيد الأصلي</p>
                                    <p className="font-extrabold text-sm truncate">{supplier?.name || "اختر مورداً..."}</p>
                                </div>

                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <p className="text-[8px] text-violet-200 font-bold mb-0.5">تابع لعروة</p>
                                        <p className="font-bold text-xs truncate">{selectedCycleName}</p>
                                    </div>
                                    <div>
                                        <p className="text-[8px] text-violet-200 font-bold mb-0.5">التاريخ المسجل</p>
                                        <p className="font-bold text-xs tracking-wide">{date || '...'}</p>
                                    </div>
                                </div>

                                <div>
                                    <p className="text-[8px] text-violet-200 font-bold mb-0.5">بيان قيد الحركة</p>
                                    <p className="font-bold text-xs truncate leading-snug">{description || 'لا يوجد وصف...'}</p>
                                </div>
                            </div>
                        </div>

                        {/* Large value & stamp impact area */}
                        <div className="relative z-10 border-t border-dashed border-white/25 pt-3 mt-4 space-y-2">
                            <div className="flex justify-between items-baseline">
                                <span className="text-[9px] text-violet-100 font-extrabold">مبلغ التخفيض:</span>
                                <div className="text-left">
                                    <span className="text-2xl font-black tabular-nums tracking-tight">
                                        -{amtNum > 0 ? formatNumberWithCommas(amtNum) : '0.00'}
                                    </span>
                                    <span className="text-[10px] font-bold text-violet-200 mr-1">ج.م</span>
                                </div>
                            </div>

                            {/* Ledger effect indicator */}
                            <div className="text-[9px] bg-black/15 text-violet-100/90 py-2 px-2.5 rounded-xl border border-white/5 space-y-1">
                                <div className="flex items-center gap-1.5">
                                    <span className="w-1 h-1 rounded-full bg-emerald-300"></span>
                                    <p>خفض مديونية المورد بـ <strong className="font-black text-white">{formatCurrency(amtNum)} ج.م</strong></p>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <span className="w-1 h-1 rounded-full bg-emerald-300"></span>
                                    <p>زيادة أرباح الدورة الزراعية تلقائياً</p>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>

            </div>
        </div>
    );
};

export default AddDiscountForm;
