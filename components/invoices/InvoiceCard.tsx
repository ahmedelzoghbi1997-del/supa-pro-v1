
import React from 'react';
import type { Invoice } from '../../types';
import { TrashIcon, PencilIcon, ScaleIcon, TruckIcon, CalendarIcon, BoxIcon } from '../Icons';
import { formatCurrency, calculateInvoiceTotal, formatNumber, formatShortDate, getInvoiceRetainedDetails } from '../../utils/helpers';

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
    <div className="flex items-center gap-1.5 text-neutral-500 dark:text-neutral-400 text-2xs sm:text-[11px] shrink-0">
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
    const delay = isNew ? '0ms' : `${Math.min(index * 30, 600)}ms`;

    return (
        <div 
            onClick={() => onViewDetails?.(invoice)}
            className={`
                relative w-full bg-white dark:bg-neutral-900 rounded-2xl px-4 py-3
                border border-neutral-200 dark:border-neutral-800 shadow-sm
                transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-md
                hover:border-accent-success/20 dark:hover:border-emerald-800/50
                cursor-pointer tap group
                ${animationClass}
            `}
            style={{ 
                animationDelay: delay
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
                            {(() => {
                                const retDetails = getInvoiceRetainedDetails(invoice.description, invoice.is_retained_debt, totalAmount);
                                if (!retDetails.isRetained) return null;
                                if (retDetails.surplus > 0) {
                                    return (
                                        <span className="text-2xs font-black bg-accent-success/10 text-accent-success px-1.5 py-0.5 rounded border border-accent-success/20 whitespace-nowrap flex items-center gap-1">
                                            <span>مرصودة جزئياً</span>
                                            <span className="text-accent-success underline font-black">(+{formatCurrency(retDetails.surplus).replace('EGP', '')} ج للخزنة)</span>
                                        </span>
                                    );
                                }
                                return (
                                    <span className="text-2xs font-black bg-accent-warning/10 text-accent-warning px-1.5 py-0.5 rounded border border-accent-warning/20 whitespace-nowrap">
                                        مرصودة بالكامل للدين 🔄
                                    </span>
                                );
                            })()}
                        </div>
                        <div className="flex items-center gap-x-3 mt-1 overflow-x-auto scrollbar-hide w-full pb-0.5">
                            <InfoItem icon={CalendarIcon} value={formatShortDate(invoice.date)} />
                            <InfoItem icon={TruckIcon} value={invoice.market} />
                            <InfoItem icon={ScaleIcon} value={`${formatNumber(totalWeight)} كج`} />
                            {packagingCount > 0 && (
                                <InfoItem icon={BoxIcon} value={`${formatNumber(packagingCount)} ${packagingLabel}`} />
                            )}
                            {avgCageWeight > 0 && (
                                <div className="flex items-center gap-1 bg-accent-warning/10 text-accent-warning px-1.5 py-0.5 rounded-md text-2xs font-black border border-accent-warning/20 shrink-0" title="متوسط وزن القفص">
                                    <span>⚖️</span>
                                    <span>{avgCageWeight.toFixed(1)} كج/{packagingLabel === 'كرتونة' ? 'ك' : 'قفص'}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex flex-col items-end shrink-0 pl-1">
                        <div className="bg-accent-success/10 px-2 py-0.5 rounded-lg border border-accent-success/20 flex items-baseline gap-1">
                            <span className="text-base sm:text-lg font-black text-accent-success tabular-nums leading-none">
                                {formatCurrency(totalAmount).replace('EGP', '')}
                            </span>
                            <span className="text-2xs font-bold text-accent-success/70">ج.م</span>
                        </div>
                    </div>
                </div>

                {/* Footer: Prices & Actions */}
                <div className="flex justify-between items-center pt-1 border-t border-neutral-100 dark:border-neutral-800">
                    <div className="flex items-center gap-1.5 flex-wrap overflow-hidden h-5">
                        {invoice.price_items.map((item, idx) => (
                            <div 
                                key={idx} 
                                className={`text-2xs sm:text-2xs font-bold px-1.5 py-0.5 rounded-md border flex items-center gap-0.5 leading-none ${
                                    idx === 0 
                                    ? 'text-accent-success bg-accent-success/10 border-accent-success/20' 
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
                                    className="p-1 rounded-md text-neutral-400 hover:bg-accent-info/10 hover:text-accent-info transition-colors"
                                    aria-label="تعديل"
                                >
                                    <PencilIcon className="h-3.5 w-3.5" />
                                </button>
                            )}
                            {onDelete && (
                                <button 
                                    onClick={(e) => { e.stopPropagation(); onDelete(invoice.id); }} 
                                    className="p-1 rounded-md text-neutral-400 hover:bg-accent-danger/10 hover:text-accent-danger transition-colors"
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
