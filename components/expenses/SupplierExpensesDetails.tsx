
import React from 'react';
import { Expense, ExpenseCategory, Supplier } from '../../types';
import ExpenseCard from './ExpenseCard';
import Breadcrumbs from '../shared/Breadcrumbs';
import { LeafIcon } from '../Icons';
import EmptyState from '../shared/EmptyState';
import { EmptyExpensesIllustration } from '../Illustrations';
import { useUI } from '../../contexts/UIContext';

interface SupplierExpensesDetailsProps {
    expenses: Expense[];
    onBack: () => void;
    onEdit?: (id: string) => void;
    onDelete?: (id: string) => void;
    expenseCategories: ExpenseCategory[];
    suppliers: Supplier[];
}

const SupplierExpensesDetails: React.FC<SupplierExpensesDetailsProps> = ({
    expenses,
    onBack,
    onEdit,
    onDelete,
    expenseCategories,
    suppliers
}) => {
    const { highlightedItemId } = useUI();

    return (
        <div className="space-y-6 animate-page-enter">
            {/* Header */}
            <div className="px-2">
                <Breadcrumbs items={[{ label: 'سجل المصروفات', onClick: onBack }, { label: 'تفاصيل مصروفات الموردين' }]} />
                <div className="flex items-center gap-3 mt-4">
                    <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-800">
                        <LeafIcon className="h-7 w-7" />
                    </div>
                    <div>
                        <h1 className="text-xl font-black text-neutral-800 dark:text-neutral-100">أسمدة ومبيدات (آجل)</h1>
                        <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">فواتير موردين لم تسدد بعد</p>
                    </div>
                </div>
            </div>

            {/* List */}
            <div className="space-y-2 px-1">
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
                                hideSupplier={true}
                                hideCycle={true}
                            />
                        );
                    })
                ) : (
                    <EmptyState
                        icon={EmptyExpensesIllustration}
                        title="لا توجد مصروفات"
                        message="لا توجد مصروفات موردين مسجلة لعرضها."
                    />
                )}
            </div>
        </div>
    );
};

export default SupplierExpensesDetails;
