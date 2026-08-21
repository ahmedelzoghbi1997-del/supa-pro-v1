
import React, { useEffect, useRef, useMemo } from 'react';
import type { Expense, ExpenseCategory, Supplier } from '../../types';
import { TrashIcon, PencilIcon, InvoicesIcon, CyclesIcon, TruckIcon, CalendarIcon } from '../Icons';
import { formatNumber, formatShortDate } from '../../utils/helpers';

interface ExpenseCardProps {
    expense: Expense;
    onDelete?: (id: string) => void;
    onEdit?: (id: string) => void;
    isNew?: boolean;
    isHighlighted?: boolean;
    onAnimationEnd?: () => void;
    expenseCategories: ExpenseCategory[];
    suppliers: Supplier[];
    index: number;
    hideCycle?: boolean;
    hideSupplier?: boolean;
    hideCategory?: boolean;
}

const InfoItem: React.FC<{ value: string; icon: React.FC<{ className?: string }> }> = ({ value, icon: Icon }) => (
    <div className="flex items-center gap-1 text-neutral-400 dark:text-neutral-500 text-[9px] sm:text-[10px] shrink-0">
        <Icon className="h-3 w-3 flex-shrink-0 opacity-50" />
        <span className="font-bold whitespace-nowrap text-neutral-600 dark:text-neutral-300">{value}</span>
    </div>
);

const ExpenseCard: React.FC<ExpenseCardProps> = ({ 
    expense, onDelete, onEdit, isNew, isHighlighted, onAnimationEnd, 
    expenseCategories, suppliers, index,
    hideCycle = false, hideSupplier = false, hideCategory = false 
}) => {
    const amount = parseFloat(String(expense.amount)) || 0;
    const cardRef = useRef<HTMLDivElement>(null);

    const categoryName = expenseCategories.find(c => c.id === expense.category_id)?.name || 'غير محدد';
    const supplierName = suppliers.find(s => s.id === expense.supplier_id)?.name;

    // منطق الأوسمة المطور بناءً على طلب المستخدم
    const tags = useMemo(() => {
        const activeTags = [];
        const isEstablishment = expense.is_establishment === true || String(expense.is_establishment) === 'true';
        const isCredit = expense.payment_method === 'credit';
        
        // 1. وسم التأسيس (يظهر دائماً إذا كان المصروف تأسيسياً)
        if (isEstablishment) {
            activeTags.push({
                label: 'تأسيس',
                textColor: 'text-blue-600 dark:text-blue-400',
                bgColor: 'bg-blue-50 dark:bg-blue-900/30',
                borderColor: 'border-blue-200 dark:border-blue-800/50'
            });
        }

        // 2. وسم طريقة السداد
        if (isCredit) {
            // "آجل" تظهر دائماً سواء كان تأسيس أو تشغيل
            activeTags.push({
                label: 'آجل',
                textColor: 'text-purple-600 dark:text-purple-400',
                bgColor: 'bg-purple-50 dark:bg-purple-900/30',
                borderColor: 'border-purple-200 dark:border-purple-800/50'
            });
        } else if (!isEstablishment) {
            // "نقدي" تظهر فقط في حالة المصاريف التشغيلية اليومية
            activeTags.push({
                label: 'نقدي',
                textColor: 'text-emerald-600 dark:text-emerald-400',
                bgColor: 'bg-emerald-50 dark:bg-emerald-900/30',
                borderColor: 'border-emerald-200 dark:border-emerald-800/50'
            });
        }

        return activeTags;
    }, [expense.is_establishment, expense.payment_method]);

    // اللون الرئيسي للمبلغ يعتمد على أول وسم
    const primaryTextColor = tags[0]?.textColor || 'text-neutral-600';

    useEffect(() => {
        if (isNew && cardRef.current && onAnimationEnd) {
            const handleAnimationEnd = () => onAnimationEnd();
            cardRef.current.addEventListener('animationend', handleAnimationEnd, { once: true });
        }
    }, [isNew, onAnimationEnd]);
    
    const animationClass = isHighlighted ? 'animate-highlight' : isNew ? 'animate-enter' : 'animate-stagger-in';

    return (
        <div 
            id={`expense-${expense.id}`}
            data-id={expense.id}
            ref={cardRef}
            className={`group relative bg-white dark:bg-neutral-800 py-3 px-3.5 sm:px-4 rounded-[16px] border border-neutral-200 dark:border-neutral-700 shadow-soft hover:shadow-md transition-all text-right active:scale-[0.99] flex items-center justify-between gap-3 w-full overflow-hidden ${animationClass}`}
            style={{ 
                animationDelay: isNew ? '0ms' : `${index * 30}ms`,
                willChange: 'transform, opacity'
            }}
        >
            <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-1 min-w-0">
                    <h3 className="font-bold text-neutral-800 dark:text-neutral-100 text-xs sm:text-sm truncate leading-tight flex-1" title={expense.description}>
                        {expense.description}
                    </h3>
                    
                    {/* عرض الأوسمة المتعددة */}
                    <div className="flex items-center gap-1 shrink-0">
                        {tags.map((tag, tIdx) => (
                            <span 
                                key={tIdx}
                                className={`text-[8px] font-black px-1.5 py-px rounded-full border ${tag.bgColor} ${tag.textColor} ${tag.borderColor} shadow-sm whitespace-nowrap`}
                            >
                                {tag.label}
                            </span>
                        ))}
                    </div>
                </div>
                
                <div className="flex items-center gap-x-3 overflow-x-auto scrollbar-hide w-full pb-0.5">
                    <InfoItem icon={CalendarIcon} value={formatShortDate(expense.date)} />
                    {!hideCategory && <InfoItem icon={InvoicesIcon} value={categoryName} />}
                    {!hideCycle && <InfoItem icon={CyclesIcon} value={expense.cycle || '-'} />}
                    {!hideSupplier && supplierName && <InfoItem icon={TruckIcon} value={supplierName} />}
                </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 border-r border-neutral-100 dark:border-neutral-700 pr-2">
                <div className="text-left min-w-[60px]">
                    <p className={`text-sm sm:text-base font-black tabular-nums tracking-tighter ${primaryTextColor}`}>
                        {formatNumber(Math.round(amount))}
                        <span className="text-[9px] mr-0.5 opacity-50 font-bold uppercase">ج.م</span>
                    </p>
                </div>
                
                {(onEdit || onDelete) && (
                    <div className="flex items-center gap-1.5 opacity-80 sm:opacity-0 group-hover:opacity-100 hover:opacity-100 transition-opacity duration-200 pr-1 border-l border-neutral-100 dark:border-neutral-700/50 pl-1 mr-1">
                        {onEdit && (
                            <button 
                                onClick={(e) => { e.stopPropagation(); onEdit(expense.id); }} 
                                className="p-1.5 sm:p-1 rounded-lg text-neutral-500 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-700 hover:text-blue-500 bg-neutral-50 dark:bg-neutral-900/40 border border-neutral-200/50 dark:border-neutral-700/60 shadow-sm sm:shadow-none sm:bg-transparent sm:dark:bg-transparent sm:border-transparent active:scale-95 transition-all"
                                aria-label="تعديل"
                            >
                                <PencilIcon className="h-3.5 w-3.5 sm:h-3 sm:w-3" />
                            </button>
                        )}
                        {onDelete && (
                            <button 
                                onClick={(e) => { e.stopPropagation(); onDelete(expense.id); }} 
                                className="p-1.5 sm:p-1 rounded-lg text-neutral-500 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700 hover:text-rose-500 bg-neutral-50 dark:bg-neutral-900/40 border border-neutral-200/50 dark:border-neutral-700/60 shadow-sm sm:shadow-none sm:bg-transparent sm:dark:bg-transparent sm:border-transparent active:scale-95 transition-all"
                                aria-label="حذف"
                            >
                                <TrashIcon className="h-3.5 w-3.5 sm:h-3 sm:w-3" />
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ExpenseCard;
