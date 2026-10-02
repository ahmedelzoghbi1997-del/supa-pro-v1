
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useData } from '../../contexts/DataContext';
import { useSettings } from '../../contexts/SettingsContext';
import type { ExpenseCategory } from '../../types';
import { PlusIcon, TrashIcon, PencilIcon } from '../Icons';
import Modal from '../shared/Modal';
import Button from '../shared/Button';
import { useToast } from '../../hooks/useToast';

interface ManageExpenseCategoriesProps {
    onClose: () => void;
}

const CategoryForm: React.FC<{
    onSave: (category: Omit<ExpenseCategory, 'id' | 'user_id' | 'created_at'> | ExpenseCategory) => void;
    onCancel: () => void;
    initialData?: ExpenseCategory | null;
}> = ({ onSave, onCancel, initialData }) => {
    const { settings } = useSettings();
    const [name, setName] = useState(initialData?.name || '');
    const [isSupplierCategory, setIsSupplierCategory] = useState(initialData?.is_supplier_category || false);
    const [isLaborCategory, setIsLaborCategory] = useState(initialData?.is_labor_category || false);
    const [isDiscountCategory, setIsDiscountCategory] = useState(initialData?.is_discount_category || false);
    const [errors, setErrors] = useState<{ name?: string }>({});
    
    const inputBaseClasses = "w-full bg-neutral-0 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 border rounded-lg p-2 focus:ring-2 focus:ring-primary focus:border-primary transition";
    const errorInputClasses = "border-accent-danger focus:border-accent-danger focus:ring-accent-danger/50";

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const newErrors: { name?: string } = {};
        if (!name.trim()) {
            newErrors.name = 'اسم الفئة مطلوب.';
            setErrors(newErrors);
            return;
        }
        
        const data = { 
            name, 
            is_supplier_category: settings.systems.suppliers ? isSupplierCategory : false,
            is_labor_category: isLaborCategory,
            is_discount_category: isDiscountCategory
        };
        if (initialData) {
            onSave({ ...initialData, ...data });
        } else {
            onSave(data);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="p-4 bg-neutral-50 dark:bg-neutral-900/50 rounded-lg space-y-4 border border-primary/50">
             <input
                type="text"
                value={name}
                onChange={e => {
                    setName(e.target.value);
                    if(errors.name) setErrors({});
                }}
                placeholder="اسم الفئة"
                className={`${inputBaseClasses} ${errors.name ? errorInputClasses : ''}`}
                required
                autoFocus
            />
             {errors.name && <p className="text-accent-danger text-xs -mt-2 text-right">{errors.name}</p>}

            <div className="grid grid-cols-1 gap-3">
                {settings.systems.suppliers && (
                    <div className="flex items-center">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input type="checkbox" checked={isSupplierCategory} onChange={e => setIsSupplierCategory(e.target.checked)} className="form-checkbox h-4 w-4 text-primary rounded focus:ring-primary" />
                            <span className="text-sm font-bold text-neutral-600 dark:text-neutral-300">هل هذه الفئة تخص الموردين؟ (مثل أسمدة ومبيدات)</span>
                        </label>
                    </div>
                )}
                <div className="flex items-center">
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={isLaborCategory} onChange={e => setIsLaborCategory(e.target.checked)} className="form-checkbox h-4 w-4 text-accent-warning rounded focus:ring-accent-warning" />
                        <span className="text-sm font-bold text-neutral-600 dark:text-neutral-300">تصنيف عمالة؟ (مثل أجور ويوميات العمال)</span>
                    </label>
                </div>
                <div className="flex items-center">
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={isDiscountCategory} onChange={e => setIsDiscountCategory(e.target.checked)} className="form-checkbox h-4 w-4 text-accent-success rounded focus:ring-accent-success" />
                        <span className="text-sm font-bold text-neutral-600 dark:text-neutral-300">تصنيف خصومات؟ (مثل الخصم المكتسب)</span>
                    </label>
                </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
                <Button 
                    type="button" 
                    variant="secondary"
                    size="sm"
                    onClick={onCancel}
                >
                    إلغاء
                </Button>
                <Button 
                    type="submit" 
                    variant="primary"
                    size="sm"
                >
                    {initialData ? 'حفظ' : 'إضافة الفئة'}
                </Button>
            </div>
        </form>
    );
};

const CategoryItem: React.FC<{
    category: ExpenseCategory;
    onEdit: (cat: ExpenseCategory) => void;
    onDelete: (id: string) => void;
    isNew?: boolean;
    onAnimationEnd?: () => void;
}> = ({ category, onEdit, onDelete, isNew, onAnimationEnd }) => {
    const { settings } = useSettings();
    const itemRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (isNew && itemRef.current && onAnimationEnd) {
            const handleAnimationEnd = () => {
                onAnimationEnd();
            };
            itemRef.current.addEventListener('animationend', handleAnimationEnd, { once: true });
        }
    }, [isNew, onAnimationEnd]);
    
    return (
        <div 
            ref={itemRef}
            className={`bg-neutral-100 dark:bg-neutral-800 p-3 rounded-lg flex justify-between items-center transition-all duration-300 ${isNew ? 'animate-enter' : ''}`}
        >
            <div className="flex items-center gap-3">
                <p className="font-semibold">{category.name}</p>
                <div className="flex items-center gap-1.5 flex-wrap">
                    {settings.systems.suppliers && category.is_supplier_category && (
                        <span className="text-xs px-2.5 py-0.5 font-semibold rounded-full bg-accent-info/10 text-accent-info dark:bg-accent-info/20 dark:text-accent-info">
                            موردين
                        </span>
                    )}
                    {category.is_labor_category && (
                        <span className="text-xs px-2.5 py-0.5 font-semibold rounded-full bg-accent-warning/10 text-accent-warning dark:bg-accent-warning/20 dark:text-accent-warning">
                            عمالة
                        </span>
                    )}
                    {category.is_discount_category && (
                        <span className="text-xs px-2.5 py-0.5 font-semibold rounded-full bg-accent-success/10 text-accent-success dark:bg-accent-success/20 dark:text-accent-success">
                            خصم
                        </span>
                    )}
                </div>
            </div>
            <div className="flex items-center gap-1">
                <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => onEdit(category)} 
                    className="!p-2 !rounded-full text-neutral-500 hover:text-primary hover:bg-primary/10"
                    icon={<PencilIcon className="w-5 h-5" />}
                    aria-label="تعديل الفئة"
                />
                <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => onDelete(category.id)} 
                    className="!p-2 !rounded-full text-neutral-500 hover:text-accent-danger hover:bg-accent-danger/10"
                    icon={<TrashIcon className="w-5 h-5" />}
                    aria-label="حذف الفئة"
                />
            </div>
        </div>
    );
};


const ManageExpenseCategories: React.FC<ManageExpenseCategoriesProps> = ({ onClose }) => {
    const { 
        expenseCategories, 
        addExpenseCategory, 
        updateExpenseCategory, 
        deleteExpenseCategory,
        lastExpenseCategoryAddedId,
        setLastExpenseCategoryAddedId
    } = useData();
    const { showToast } = useToast();
    const [isAdding, setIsAdding] = useState(false);
    const [editingCategory, setEditingCategory] = useState<ExpenseCategory | null>(null);
    const [categoryToDelete, setCategoryToDelete] = useState<ExpenseCategory | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const sortedCategories = useMemo(() =>
        [...expenseCategories].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
    [expenseCategories]);

    const handleSave = async (data: Omit<ExpenseCategory, 'id'|'user_id'|'created_at'> | ExpenseCategory) => {
        try {
            if ('id' in data) {
                await updateExpenseCategory(data as ExpenseCategory);
                showToast('تم تحديث الفئة بنجاح.');
            } else {
                await addExpenseCategory(data as Omit<ExpenseCategory, 'id'|'user_id'|'created_at'>);
                showToast('تمت إضافة الفئة بنجاح.');
            }
            setIsAdding(false);
            setEditingCategory(null);
        } catch (_e) {
            showToast('حدث خطأ أثناء الحفظ.', 'error');
            throw _e;
        }
    };

    const handleDeleteRequest = (id: string) => {
        const cat = expenseCategories.find(c => c.id === id);
        if (cat) setCategoryToDelete(cat);
    };

    const confirmDelete = async () => {
        if (categoryToDelete) {
            setIsDeleting(true);
            try {
                const success = await deleteExpenseCategory(categoryToDelete.id);
                if (success) {
                    showToast('تم حذف الفئة بنجاح.', 'success');
                    setCategoryToDelete(null);
                }
            } catch (_e) {
                showToast('فشل الحذف.', 'error');
            } finally {
                setIsDeleting(false);
            }
        }
    };

    return (
        <>
            <Modal isOpen={!!categoryToDelete} onClose={() => setCategoryToDelete(null)} title="تأكيد حذف الفئة">
                <p className="text-neutral-500 dark:text-neutral-400">
                    هل أنت متأكد من رغبتك في حذف فئة "{categoryToDelete?.name}"؟ لا يمكن التراجع عن هذا الإجراء.
                </p>
                <div className="mt-6 flex justify-start gap-4 flex-row-reverse">
                    <Button 
                        variant="danger"
                        size="sm"
                        onClick={confirmDelete} 
                        disabled={isDeleting}
                        loading={isDeleting}
                    >
                        حذف
                    </Button>
                    <Button 
                        variant="secondary"
                        size="sm"
                        onClick={() => setCategoryToDelete(null)} 
                        disabled={isDeleting}
                    >
                        إلغاء
                    </Button>
                </div>
            </Modal>
            <div className="max-h-[70vh] flex flex-col">
                <div className="flex-grow overflow-y-auto pr-2 -mr-2 space-y-3">
                    {sortedCategories.length > 0 ? (
                        sortedCategories.map(cat => (
                            editingCategory?.id === cat.id ? (
                                <CategoryForm 
                                    key={cat.id}
                                    initialData={cat}
                                    onSave={handleSave}
                                    onCancel={() => setEditingCategory(null)}
                                />
                            ) : (
                                <CategoryItem 
                                    key={cat.id}
                                    category={cat}
                                    onEdit={setEditingCategory}
                                    onDelete={handleDeleteRequest}
                                    isNew={cat.id === lastExpenseCategoryAddedId}
                                    onAnimationEnd={() => setLastExpenseCategoryAddedId(null)}
                                />
                            )
                        ))
                     ) : (
                         !isAdding && <p className="text-center text-neutral-500 py-8">لا توجد فئات مصروفات. قم بإضافة فئة جديدة.</p>
                    )}
                </div>

                <div className="pt-4 flex-shrink-0">
                    {isAdding ? (
                         <CategoryForm 
                            onSave={handleSave}
                            onCancel={() => setIsAdding(false)}
                        />
                    ) : (
                    <Button 
                        variant="ghost"
                        onClick={() => {
                            setIsAdding(true);
                            setEditingCategory(null);
                        }} 
                        className="w-full !flex !items-center !justify-center !gap-2 border-2 border-dashed border-neutral-300 dark:border-neutral-700 !text-neutral-500 dark:!text-neutral-400 !font-semibold !py-3 !px-6 !rounded-lg hover:!bg-neutral-100 dark:hover:!bg-neutral-800 transition-colors"
                        icon={<PlusIcon className="w-5 h-5" />}
                    >
                        إضافة فئة جديدة
                    </Button>
                    )}
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
        </>
    );
};

export default ManageExpenseCategories;
