
import React, { useState, useMemo } from 'react';
import { useSettings } from '../../contexts/SettingsContext';
import { useData } from '../../contexts/DataContext';
import { PlusIcon, TrashIcon, PencilIcon, CheckIcon, XMarkIcon } from '../Icons';
import Button from '../shared/Button';
import { useToast } from '../../hooks/useToast';

interface ManageMarketsProps {
    onClose: () => void;
}

const ManageMarkets: React.FC<ManageMarketsProps> = ({ onClose }) => {
    const { settings, updateSettings } = useSettings();
    const { invoices } = useData();
    const { showToast } = useToast();
    const [newName, setNewName] = useState('');
    const [editingMarket, setEditingMarket] = useState<{ original: string; current: string } | null>(null);
    const [errors, setErrors] = useState<{ newName?: string; editName?: string }>({});

    // تحديد الأسواق المستخدمة في فواتير حالياً
    const usedMarkets = useMemo(() => {
        const set = new Set<string>();
        invoices.forEach(inv => {
            if (inv.market) set.add(inv.market);
        });
        return set;
    }, [invoices]);

    const handleAddMarket = () => {
        const trimmedName = newName.trim();
        if (!trimmedName) {
            setErrors({ newName: 'اسم السوق مطلوب.' });
            return;
        }
        if (settings.markets.includes(trimmedName)) {
            showToast('هذا السوق موجود بالفعل.', 'error');
            return;
        }
        const updatedMarkets = [...settings.markets, trimmedName];
        updateSettings({ markets: updatedMarkets });
        setNewName('');
        setErrors({});
        showToast('تم إضافة السوق بنجاح.');
    };

    const handleDeleteMarket = (marketNameToDelete: string) => {
        if (usedMarkets.has(marketNameToDelete)) {
            showToast('لا يمكن حذف هذا السوق لوجود فواتير مسجلة عليه.', 'error');
            return;
        }
        const updatedMarkets = settings.markets.filter(market => market !== marketNameToDelete);
        updateSettings({ markets: updatedMarkets });
        showToast('تم حذف السوق.');
    };

    const handleStartEdit = (marketName: string) => {
        setEditingMarket({ original: marketName, current: marketName });
        setErrors({});
    };

    const handleSaveEdit = () => {
        if (!editingMarket) return;
        const trimmedName = editingMarket.current.trim();
        
        if (!trimmedName) {
            setErrors({ editName: 'الاسم لا يمكن أن يكون فارغاً.' });
            return;
        }

        if (trimmedName !== editingMarket.original && settings.markets.includes(trimmedName)) {
            showToast('هذا الاسم مستخدم لسوق آخر.', 'error');
            return;
        }

        const updatedMarkets = settings.markets.map(m => m === editingMarket.original ? trimmedName : m);
        updateSettings({ markets: updatedMarkets });
        setEditingMarket(null);
        showToast('تم تعديل اسم السوق.');
    };
    
    const inputClasses = "flex-grow bg-neutral-0 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 border rounded-lg p-3 focus:ring-2 focus:ring-primary focus:border-primary transition text-sm";
    const errorInputClasses = "border-accent-danger focus:border-accent-danger focus:ring-accent-danger/50";

    return (
        <div className="max-h-[70vh] flex flex-col">
            <div className="space-y-3 mb-4 flex-grow overflow-y-auto pr-2 -mr-2">
                {[...(settings.markets || [])].reverse().map(market => {
                    const isUsed = usedMarkets.has(market);
                    return (
                        <div key={market} className="bg-neutral-100 dark:bg-neutral-800 p-3 rounded-lg flex justify-between items-center group">
                            {editingMarket?.original === market ? (
                                <div className="flex-grow flex items-center gap-2">
                                    <div className="flex-grow">
                                        <input
                                            type="text"
                                            value={editingMarket.current}
                                            onChange={(e) => setEditingMarket({ ...editingMarket, current: e.target.value })}
                                            className={`${inputClasses} !p-1.5 ${errors.editName ? errorInputClasses : ''}`}
                                            autoFocus
                                        />
                                        {errors.editName && <p className="text-accent-danger text-2xs mt-1">{errors.editName}</p>}
                                    </div>
                                    <Button 
                                        variant="primary"
                                        size="sm"
                                        onClick={handleSaveEdit} 
                                        className="!p-1.5 !rounded-md !bg-accent-success hover:!bg-accent-success"
                                        icon={<CheckIcon className="w-4 h-4" />}
                                        aria-label="حفظ التعديل"
                                    />
                                    <Button 
                                        variant="secondary"
                                        size="sm"
                                        onClick={() => setEditingMarket(null)} 
                                        className="!p-1.5 !rounded-md"
                                        icon={<XMarkIcon className="w-4 h-4" />}
                                        aria-label="إلغاء التعديل"
                                    />
                                </div>
                            ) : (
                                <>
                                    <p className="font-semibold text-neutral-800 dark:text-neutral-100">{market}</p>
                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Button 
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleStartEdit(market)} 
                                            className="!p-2 !rounded-full text-neutral-500 hover:text-primary hover:bg-primary/10"
                                            title="تعديل"
                                            icon={<PencilIcon className="w-4 h-4" />}
                                        />
                                        
                                        <div className="relative group/tip">
                                            <Button 
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleDeleteMarket(market)} 
                                                disabled={isUsed}
                                                className={`!p-2 !rounded-full transition-colors ${isUsed ? 'opacity-20 grayscale cursor-not-allowed' : 'text-neutral-500 hover:text-accent-danger hover:bg-accent-danger/10'}`}
                                                title={isUsed ? "لا يمكن الحذف" : "حذف"}
                                                icon={<TrashIcon className="w-4 h-4" />}
                                            />
                                            {isUsed && (
                                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-32 p-1.5 bg-neutral-900 text-white text-2xs rounded-md opacity-0 group-hover/tip:opacity-100 transition-opacity z-10 pointer-events-none text-center leading-normal">
                                                    سوق نشط: يحتوي على فواتير.
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    );
                })}
                {(!settings.markets || settings.markets.length === 0) && (
                    <p className="text-center text-neutral-500 py-8 italic text-sm">لا توجد أسواق. قم بإضافة سوق جديد.</p>
                )}
            </div>

            {!editingMarket && (
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
                                placeholder="إضافة سوق جديد"
                                className={`${inputClasses} ${errors.newName ? errorInputClasses : ''}`}
                            />
                             {errors.newName && <p className="text-accent-danger text-xs mt-1 text-right">{errors.newName}</p>}
                        </div>
                        <Button
                            variant="primary"
                            onClick={handleAddMarket}
                            className="flex-shrink-0 flex items-center gap-2 py-3 px-4 tap"
                            icon={<PlusIcon className="h-5 w-5" />}
                        >
                            <span className="hidden sm:inline">إضافة</span>
                        </Button>
                    </div>
                </div>
            )}
            <div className="mt-6 flex justify-end">
                <Button 
                    variant="secondary"
                    size="sm"
                    onClick={onClose} 
                    className="py-2 px-6"
                >
                    إغلاق
                </Button>
            </div>
        </div>
    );
};

export default ManageMarkets;
