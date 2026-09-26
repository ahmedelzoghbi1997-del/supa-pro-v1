import React, { useState } from 'react';
import { triggerSaveHaptic } from '../../lib/haptics';

interface AddSupplierFormProps {
    onSave: (name: string, openingBalance?: number) => void;
    onCancel: () => void;
    initialName?: string;
    initialOpeningBalance?: number;
}

const AddSupplierForm: React.FC<AddSupplierFormProps> = ({ onSave, onCancel, initialName = '', initialOpeningBalance = 0 }) => {
    const [name, setName] = useState(initialName);
    const [openingBalance, setOpeningBalance] = useState(initialOpeningBalance ? initialOpeningBalance.toString() : '');
    const [errors, setErrors] = useState<{ name?: string }>({});
    const [isSaving, setIsSaving] = useState(false);

    const validate = () => {
        const newErrors: { name?: string } = {};
        if (!name.trim()) {
            newErrors.name = 'اسم المورد مطلوب.';
        }
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        triggerSaveHaptic();
        if (validate()) {
            setIsSaving(true);
            try {
                await onSave(name.trim(), Number(openingBalance) || 0);
            } catch (error) {
                console.error("Save error:", error);
                setIsSaving(false);
            }
        }
    };
    
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setName(e.target.value);
        if (errors.name) {
            setErrors({});
        }
    };
    
    const inputClasses = "w-full bg-neutral-100 dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 text-slate-800 dark:text-white rounded-lg p-3 focus:ring-2 focus:ring-primary focus:border-primary transition placeholder:text-neutral-500";
    const errorInputClasses = "border-accent-danger focus:border-accent-danger focus:ring-accent-danger/50";

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div>
                <label htmlFor="supplier-name" className="block text-sm font-medium text-gray-500 dark:text-gray-300 mb-2 text-right">اسم المورد</label>
                <input
                    id="supplier-name"
                    type="text"
                    value={name}
                    onChange={handleChange}
                    className={`${inputClasses} ${errors.name ? errorInputClasses : ''}`}
                    autoFocus
                />
                {errors.name && <p className="text-accent-danger text-xs mt-1 text-right">{errors.name}</p>}
            </div>
            <div>
                <label htmlFor="opening-balance" className="block text-sm font-medium text-gray-500 dark:text-gray-300 mb-2 text-right">رصيد افتتاحي / مديونية سابقة (اختياري)</label>
                <input
                    id="opening-balance"
                    type="number"
                    value={openingBalance}
                    onChange={(e) => setOpeningBalance(e.target.value)}
                    className={inputClasses}
                    placeholder="0"
                />
            </div>
            <div className="pt-4 flex justify-start gap-4 flex-row-reverse">
                <button type="submit" onClick={triggerSaveHaptic} disabled={isSaving} className="py-2 px-6 bg-primary text-white font-semibold rounded-lg hover:bg-primary-dark transition shadow-md disabled:bg-primary/50 disabled:cursor-not-allowed">
                    {isSaving ? 'جاري الحفظ...' : 'حفظ'}
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
    );
};

export default AddSupplierForm;