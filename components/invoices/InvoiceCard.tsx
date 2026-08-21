
import React from 'react';
import type { Invoice } from '../../types';
import { TrashIcon, PencilIcon, ScaleIcon, TruckIcon, CalendarIcon, BoxIcon } from '../Icons';
import { formatCurrency, calculateInvoiceTotal, formatNumber, formatShortDate } from '../../utils/helpers';

interface InvoiceCardProps {
    invoice: Invoice;
    onDelete?: (id: string) => void;
    onEdit?: (id: string) => void;
    onViewDetails?: (invoice: Invoice) => void;
    isNew?: boolean;
    isHighlighted?: boolean;
    index: number;
}

const InfoItem: React.FC<{ value: string; icon: React.FC<any> }> = ({ value, icon: Icon }) => (
    <div className="flex items-center gap-1.5 text-neutral-500 dark:text-neutral-400 text-[10px] sm:text-[11px] shrink-0">
        <Icon className="h-3.5 w-3.5 flex-shrink-0 opacity-70" />
        <span className="font-bold whitespace-nowrap text-neutral-600 dark:text-neutral-300">{value}</span>
    </div>
);

// استخدام React.memo لمنع إعادة الرندرة غير الضرورية
const InvoiceCard: React.FC<InvoiceCardProps> = React.memo(({ invoice, onDelete, onEdit, onViewDetails, isNew, isHighlighted, index }) => {
    const totalAmount = calculateInvoiceTotal(invoice.price_items, invoice.deductions);
    const totalWeight = invoice.price_items.reduce((s, i) => s + (i.quantity || 0), 0);
    const packagingCount = invoice.packaging_count || 0;
    const avgCageWeight = packagingCount > 0 ? (totalWeight / packagingCount) : 0;
    const packagingLabel = invoice.packaging_type === 'carton' ? 'كرتونة' : 'قفص';
    
    // تثبيت كلاس الأنيميشن
    const animationClass = isHighlighted ? 'animate-highlight' : isNew ? 'animate-enter' : 'animate-stagger-in';
    const delay = isNew ? '0ms' : `${index * 30}ms`;

    return (
        <div 
            onClick={() => onViewDetails?.(invoice)}
            className={`
                relative w-full bg-white dark:bg-neutral-900 rounded-2xl px-4 py-3
                border border-neutral-200 dark:border-neutral-800 shadow-sm
                transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-md
                hover:border-emerald-200 dark:hover:border-emerald-800/50
                cursor-pointer active:scale-[0.99] group
                ${animationClass}
            `}
            style={{ 
                animationDelay: delay,
                willChange: 'transform, opacity, box-shadow'
            }}
        >
            <div className="flex flex-col gap-1.5">
                {/* Header: Description & Amount */}
                <div className="flex justify-between items-start gap-2">
                    <div className="flex-1 min-w-0 flex flex-col justify-center">
                        <div className="flex items-center gap-1.5 flex-wrap">
                            <p className="font-black text-xs sm:text-sm text-neutral-800 dark:text-neutral-100 break-words line-clamp-1 leading-tight">
                                {invoice.description 
                                    ? invoice.description.replace(/\s*\[RETAINED_DEBT:.*?\]/g, '').replace(/\s*\[مرصودة\]/g, '').trim() 
                                    : 'فاتورة توريد محصول'}
                            </p>
                            {(invoice.description?.includes('[RETAINED_DEBT]') || invoice.description?.includes('[مرصودة]')) && (
                                <span className="text-[8px] font-black bg-amber-500/10 text-amber-700 dark:text-amber-400 px-1.5 py-0.5 rounded border border-amber-500/10 whitespace-nowrap">
                                    مرصودة للدين 🔄
                                </span>
                            )}
                        </div>
                        <div className="flex items-center gap-x-3 mt-1 overflow-x-auto scrollbar-hide w-full pb-0.5">
                            <InfoItem icon={CalendarIcon} value={formatShortDate(invoice.date)} />
                            <InfoItem icon={TruckIcon} value={invoice.market} />
                            <InfoItem icon={ScaleIcon} value={`${formatNumber(totalWeight)} كج`} />
                            {packagingCount > 0 && (
                                <InfoItem icon={BoxIcon} value={`${formatNumber(packagingCount)} ${packagingLabel}`} />
                            )}
                            {avgCageWeight > 0 && (
                                <div className="flex items-center gap-1 bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 px-1.5 py-0.5 rounded-md text-[10px] font-black border border-amber-200/50 dark:border-amber-500/20 shrink-0" title="متوسط وزن القفص">
                                    <span>⚖️</span>
                                    <span>{avgCageWeight.toFixed(1)} كج/{packagingLabel === 'كرتونة' ? 'ك' : 'قفص'}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex flex-col items-end shrink-0 pl-1">
                        <div className="bg-emerald-50 dark:bg-emerald-500/10 px-2 py-0.5 rounded-lg border border-emerald-100 dark:border-emerald-500/20 flex items-baseline gap-1">
                            <span className="text-base sm:text-lg font-black text-emerald-700 dark:text-emerald-400 tabular-nums leading-none">
                                {formatCurrency(totalAmount).replace('EGP', '')}
                            </span>
                            <span className="text-[9px] font-bold text-emerald-600/70 dark:text-emerald-400/70">ج.م</span>
                        </div>
                    </div>
                </div>

                {/* Footer: Prices & Actions */}
                <div className="flex justify-between items-center pt-1 border-t border-neutral-100 dark:border-neutral-800">
                    <div className="flex items-center gap-1.5 flex-wrap overflow-hidden h-5">
                        {invoice.price_items.map((item, idx) => (
                            <div 
                                key={idx} 
                                className={`text-[9px] sm:text-[10px] font-bold px-1.5 py-0.5 rounded-md border flex items-center gap-0.5 leading-none ${
                                    idx === 0 
                                    ? 'text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20' 
                                    : 'text-neutral-600 dark:text-neutral-300 bg-neutral-50 dark:bg-neutral-800/50 border-neutral-200 dark:border-neutral-700'
                                }`}
                            >
                                <span>{formatNumber(item.price_per_kg)} ج.م</span>
                                {item.quantity > 0 && <span className="opacity-60 font-normal">({formatNumber(item.quantity)}ك)</span>}
                            </div>
                        ))}
                    </div>

                    {/* Actions: Visible only if handlers are provided */}
                    {(onEdit || onDelete) && (
                        <div className="flex items-center gap-1 flex-shrink-0">
                            {onEdit && (
                                <button 
                                    onClick={(e) => { e.stopPropagation(); onEdit(invoice.id); }} 
                                    className="p-1 rounded-md text-neutral-400 hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-500/10 dark:hover:text-blue-400 transition-colors"
                                    aria-label="تعديل"
                                >
                                    <PencilIcon className="h-3.5 w-3.5" />
                                </button>
                            )}
                            {onDelete && (
                                <button 
                                    onClick={(e) => { e.stopPropagation(); onDelete(invoice.id); }} 
                                    className="p-1 rounded-md text-neutral-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/10 dark:hover:text-rose-400 transition-colors"
                                    aria-label="حذف"
                                >
                                    <TrashIcon className="h-3.5 w-3.5" />
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}, (prevProps, nextProps) => {
    // تخصيص عملية المقارنة في memo لضمان الاستقرار التام
    return prevProps.invoice.id === nextProps.invoice.id && 
           prevProps.isNew === nextProps.isNew &&
           prevProps.index === nextProps.index &&
           JSON.stringify(prevProps.invoice.price_items) === JSON.stringify(nextProps.invoice.price_items);
});

export default InvoiceCard;
