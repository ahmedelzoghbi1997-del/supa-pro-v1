import React, { useState, useMemo } from 'react';
import { useSettings } from '../../contexts/SettingsContext';
import { PlusIcon, TrashIcon } from '../Icons';
import Button from '../shared/Button';
import { useToast } from '../../hooks/useToast';
import { useData } from '../../contexts/DataContext';

interface ManageDeductionItemsProps {
    onClose: () => void;
}

const ManageDeductionItems: React.FC<ManageDeductionItemsProps> = ({ onClose }) => {
    const { settings, updateSettings } = useSettings();
    const { showToast } = useToast();
    const { invoices, cycles } = useData();
    const [newName, setNewName] = useState('');
    const [errors, setErrors] = useState<{ newName?: string }>({});

    const activeDeductionNames = useMemo(() => {
        const activeCycleIds = new Set(cycles.filter(c => c.status === 'active').map(c => c.id));
        const activeDeductions = invoices
            .filter(inv => activeCycleIds.has(inv.cycle_id))
            .flatMap(inv => inv.deductions.map(d => d.name));
        return new Set(activeDeductions);
    }, [invoices, cycles]);

    const handleAddItem = () => {
        if (!newName.trim()) {
            setErrors({ newName: 'اسم البند مطلوب.' });
            return;
        }
        if (settings.deductionItems.includes(newName.trim())) {
            showToast('هذا البند موجود بالفعل.', 'error');
            return;
        }
        const updatedItems = [...settings.deductionItems, newName.trim()];
        updateSettings({ deductionItems: updatedItems });
        setNewName('');
        setErrors({});
    };

    const handleDeleteItem = (itemNameToDelete: string) => {
        if (activeDeductionNames.has(itemNameToDelete)) {
            showToast('لا يمكن حذف هذا البند لأنه مستخدم حالياً في فواتير نشطة.', 'error');
            return;
        }
        const updatedItems = settings.deductionItems.filter(item => item !== itemNameToDelete);
        updateSettings({ deductionItems: updatedItems });
        showToast('تم حذف البند.');
    };
    
    const inputClasses = "flex-grow bg-neutral-0 dark:bg-neutral-800 border-neutral-300 dark:border-neutral-700 border rounded-lg p-3 focus:ring-2 focus:ring-primary focus:border-primary transition";
    const errorInputClasses = "border-accent-danger focus:border-accent-danger focus:ring-accent-danger/50";

    return (
        <div className="max-h-[70vh] flex flex-col">
            <div className="space-y-3 mb-4 flex-grow overflow-y-auto pr-2 -mr-2">
                {[...(settings.deductionItems || [])].reverse().map(item => {
                    const isUsed = activeDeductionNames.has(item);
                    return (
                        <div key={item} className="bg-neutral-100 dark:bg-neutral-800 p-3 rounded-lg flex justify-between items-center">
                            <p className="font-semibold">{item}</p>
                            <div className="relative group">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleDeleteItem(item)}
                                    disabled={isUsed}
                                    className={`!p-2 !rounded-full !text-neutral-500 transition-colors ${
                                        isUsed 
                                            ? 'cursor-not-allowed opacity-40' 
                                            : 'hover:!text-accent-danger hover:!bg-accent-danger/10'
                                    }`}
                                    aria-label={`حذف ${item}`}
                                    icon={<TrashIcon className="w-5 h-5" />}
                                />
                                {isUsed && (
                                    <div role="tooltip" className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max max-w-xs px-3 py-1.5 bg-neutral-900 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                                        لا يمكن الحذف، البند مستخدم في الفواتير النشطة.
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
                {(!settings.deductionItems || settings.deductionItems.length === 0) && (
                    <p className="text-center text-neutral-500 py-8">لا توجد بنود محفوظة.</p>
                )}
            </div>

            <div className="pt-4 border-t border-neutral-200 dark:border-neutral-700">
                <div className="flex gap-2">
                    <div className="flex-grow">
                        <input
                            type="text"
                            value={newName}
                            onChange={(e) => {
                                setNewName(e.target.value);
                                if (errors.newName) setErrors({});
                            }}
                            placeholder="إضافة بند خصم جديد"
                            className={`${inputClasses} ${errors.newName ? errorInputClasses : ''}`}
                        />
                         {errors.newName && <p className="text-accent-danger text-xs mt-1 text-right">{errors.newName}</p>}
                    </div>
                    <Button
                        variant="primary"
                        onClick={handleAddItem}
                        className="flex-shrink-0 flex items-center gap-2 py-3 px-4"
                        icon={<PlusIcon className="h-5 w-5" />}
                    >
                        إضافة
                    </Button>
                </div>
            </div>
            <div className="mt-8 flex justify-end">
                <Button 
                    variant="secondary"
                    onClick={onClose} 
                    className="py-2 px-6"
                >
                    إغلاق
                </Button>
            </div>
        </div>
    );
};

export default ManageDeductionItems;