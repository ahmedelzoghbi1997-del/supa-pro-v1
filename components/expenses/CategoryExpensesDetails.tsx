
import React, { useMemo } from 'react';
import { Expense, ExpenseCategory, Supplier } from '../../types';
import ExpenseCard from './ExpenseCard';
import Breadcrumbs from '../shared/Breadcrumbs';
import EmptyState from '../shared/EmptyState';
import { EmptyExpensesIllustration } from '../Illustrations';
import { useUI } from '../../contexts/UIContext';
import { getExpenseCategoryMeta } from '../../utils/expenseIconUtils';

interface CategoryExpensesDetailsProps {
    categoryId: string;
    expenses: Expense[];
    onBack: () => void;
    onEdit?: (id: string) => void;
    onDelete?: (id: string) => void;
    expenseCategories: ExpenseCategory[];
    suppliers: Supplier[];
}

const CategoryExpensesDetails: React.FC<CategoryExpensesDetailsProps> = ({
    categoryId,
    expenses,
    onBack,
    onEdit,
    onDelete,
    expenseCategories,
    suppliers
}) => {
    const category = expenseCategories.find(c => c.id === categoryId);
    const { highlightedItemId } = useUI();

    const meta = useMemo(() => {
        return getExpenseCategoryMeta(category?.name || '');
    }, [category]);
    
    const Icon = meta.icon;

    return (
        <div className="space-y-6 animate-page-enter">
            <div className="px-2">
                <Breadcrumbs items={[{ label: 'سجل المصروفات', onClick: onBack }, { label: `تفاصيل: ${category?.name || 'الفئة'}` }]} />
                <div className="flex items-center gap-4 mt-4">
                    <div className={`flex-shrink-0 w-16 h-16 flex items-center justify-center rounded-2xl border shadow-sm ${meta.bg} ${meta.border}`}>
                        <Icon className={`w-8 h-8 ${meta.color}`} strokeWidth={1.5} />
                    </div>
                    <div>
                        <h1 className="text-xl font-black text-neutral-800 dark:text-neutral-100">{category?.name}</h1>
                        <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">سجل الحركات التفصيلي (تشغيلي وتأسيسي)</p>
                    </div>
                </div>
            </div>

            <div className="flex flex-col gap-2.5 px-1">
                {expenses.length > 0 ? (
                    expenses.map((expense, index) => {
                        const isSelectedForHighlight = highlightedItemId === expense.id || highlightedItemId === (expense as any)._stable_id;
                        return (
                            <ExpenseCard
                                key={expense.id}
                                expense={expense}
                                onDelete={onDelete}
                                onEdit={onEdit}
                                isHighlighted={isSelectedForHighlight}
                                expenseCategories={expenseCategories}
                                suppliers={suppliers}
                                index={index}
                                hideCategory={true}
                                hideCycle={true}
                                hideSupplier={true}
                            />
                        );
                    })
                ) : (
                    <EmptyState
                        icon={EmptyExpensesIllustration}
                        title="لا توجد عمليات"
                        message="لم يتم تسجيل أي عمليات لهذه الفئة بعد."
                    />
                )}
            </div>
        </div>
    );
};

export default CategoryExpensesDetails;
