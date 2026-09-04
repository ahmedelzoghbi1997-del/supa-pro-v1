
import React, { useState, useRef } from 'react';
import type { Invoice } from '../../types';
import { formatCurrency, formatNumber } from '../../utils/helpers';
import { CalendarIcon, TruckIcon, TrendingUpIcon, TrendingDownIcon, LogoIcon, BoxIcon, PencilIcon } from '../Icons';
import Modal from '../shared/Modal';
import { useData } from '../../contexts/DataContext';

interface InvoiceDetailsModalProps {
    invoice: Invoice | null;
    onClose: () => void;
    isSharedView?: boolean;
}

const InvoiceDetailsModal: React.FC<InvoiceDetailsModalProps> = ({ invoice, onClose, isSharedView = false }) => {
    const { activePersons } = useData();
    const [isScreenshotMode, setIsScreenshotMode] = useState(false);
    
    // مرجع للعنصر الذي سيتم تحويله لصورة (احتياطي)
    const shareRef = useRef<HTMLDivElement>(null);

    if (!invoice) return null;

    const priceItems = invoice.price_items || [];
    const deductions = invoice.deductions || [];

    const totalBeforeDeductions = priceItems.reduce((sum, item) => sum + (item.quantity * item.price_per_kg), 0);
    const totalDeductions = deductions.reduce((sum, ded) => sum + ded.amount, 0);
    const netTotal = totalBeforeDeductions - totalDeductions;

    const isRetained = invoice.description?.includes('[RETAINED_DEBT]') || invoice.description?.includes('[مرصودة]');
    let cleanDescription = invoice.description || '';
    let partnerAllocations: Record<string, number> = {};
    
    if (isRetained) {
        cleanDescription = cleanDescription.replace(/\s*\[RETAINED_DEBT:.*?\]/g, '').replace(/\s*\[مرصودة\]/g, '').trim();
        const match = invoice.description?.match(/\[RETAINED_DEBT:([^\]]*)\]/);
        if (match) {
            try {
                const parsed = JSON.parse(match[1]);
                if (parsed && typeof parsed === 'object') {
                    if ('allocations' in parsed) {
                        partnerAllocations = parsed.allocations;
                    } else {
                        partnerAllocations = parsed;
                    }
                }
            } catch (e) {
                console.error("Failed to parse allocations in details modal", e);
            }
        }
    }
    const totalDeductionPercentage = totalBeforeDeductions > 0 ? (totalDeductions / totalBeforeDeductions) * 100 : 0;

    const packagingLabel = invoice.packaging_type === 'carton' ? 'كرتونة' : 'قفص';
    const totalWeight = priceItems.reduce((sum, item) => sum + (item.quantity || 0), 0);
    const totalPackagingCount = invoice.packaging_count || priceItems.reduce((sum, item) => sum + (item.packaging_count || 0), 0);
    const avgCageWeight = totalPackagingCount > 0 ? (totalWeight / totalPackagingCount) : 0;

    const breakdownItems = priceItems
        .filter(item => (item.packaging_count || 0) > 0)
        .map((item, idx) => ({
            label: `نمرة ${idx + 1}`,
            count: item.packaging_count || 0,
            avg: item.quantity > 0 ? (item.quantity / (item.packaging_count || 1)).toFixed(2) : '0'
        }));

    const InvoiceContent = ({ isForPrint = false }) => (
        <div className={`${isForPrint ? 'space-y-6' : 'space-y-4'} w-full overflow-hidden`} dir="rtl">
            {isForPrint && (
                <div className="flex items-center justify-between mb-8 pb-6 border-b-4 border-emerald-500">
                    <div className="flex items-center gap-4">
                        <div className="p-2.5 bg-emerald-500 rounded-2xl">
                            <LogoIcon className="w-12 h-12 text-white" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-black text-neutral-800">المحاسب الزراعي</h1>
                            <p className="text-sm font-bold text-neutral-400">وثيقة مبيعات رقمية</p>
                        </div>
                    </div>
                    <div className="text-left">
                        <p className="text-lg font-black text-neutral-800">{new Date().toLocaleDateString('ar-EG-u-nu-latn')}</p>
                    </div>
                </div>
            )}

            <div className={`grid gap-3 ${invoice.packaging_count ? 'grid-cols-1' : 'grid-cols-2'}`}>
                <div className="grid grid-cols-2 gap-3">
                    <div className={`${isForPrint ? 'p-4 border shadow-sm' : 'p-3 shadow-sm'} bg-white dark:bg-neutral-900/50 rounded-xl border-neutral-100 dark:border-neutral-700`}>
                        <p className="text-[10px] font-black text-neutral-400 uppercase mb-1">التاريخ</p>
                        <div className={`flex items-center gap-2 font-bold ${isForPrint ? 'text-base' : 'text-sm'}`}>
                            <CalendarIcon className={`${isForPrint ? 'w-4 h-4' : 'w-4 h-4'} text-primary`} />
                            <span className="text-neutral-800 dark:text-neutral-200">{invoice.date}</span>
                        </div>
                    </div>
                    <div className={`${isForPrint ? 'p-4 border shadow-sm' : 'p-3 shadow-sm'} bg-white dark:bg-neutral-900/50 rounded-xl border-neutral-100 dark:border-neutral-700`}>
                        <p className="text-[10px] font-black text-neutral-400 uppercase mb-1">السوق</p>
                        <div className={`flex items-center gap-2 font-bold ${isForPrint ? 'text-base' : 'text-sm'}`}>
                            <TruckIcon className={`${isForPrint ? 'w-4 h-4' : 'w-4 h-4'} text-primary`} />
                            <span className="truncate text-neutral-800 dark:text-neutral-200">{invoice.market}</span>
                        </div>
                    </div>
                </div>

                {totalPackagingCount > 0 ? (
                    <div className={`${isForPrint ? 'p-4 border shadow-sm' : 'p-3 shadow-sm'} bg-white dark:bg-neutral-900/50 rounded-xl border-neutral-100 dark:border-neutral-700 space-y-2`}>
                        <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-3 min-w-0">
                                <div className="p-1.5 bg-primary/10 rounded-lg shrink-0">
                                    <BoxIcon className="w-4 h-4 text-primary" />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-[10px] font-black text-neutral-400 uppercase">التعبئة ومعدل الوزن</p>
                                    <p className={`${isForPrint ? 'text-base' : 'text-sm'} font-black text-neutral-800 dark:text-neutral-200 truncate`}>
                                        {packagingLabel} ({formatNumber(totalPackagingCount)})
                                    </p>
                                </div>
                            </div>
                            
                            {avgCageWeight > 0 && (
                                <div className="bg-amber-500/10 dark:bg-amber-500/15 border border-amber-500/20 px-3 py-1.5 rounded-xl text-right shrink-0">
                                    <p className="text-[9px] font-black text-amber-700 dark:text-amber-400 uppercase">معدل وزن {packagingLabel}</p>
                                    <p className="text-sm sm:text-base font-black text-amber-800 dark:text-amber-300 tabular-nums dir-ltr">
                                        <span>{avgCageWeight.toFixed(2)}</span>
                                        <span className="text-[10px] text-amber-700/80 mr-1 font-bold" dir="rtl">كجم</span>
                                    </p>
                                </div>
                            )}
                        </div>

                        {breakdownItems.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 justify-start pt-1.5 border-t border-neutral-100 dark:border-neutral-800">
                                {breakdownItems.map((b, i) => (
                                    <div key={i} className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border font-black whitespace-nowrap text-xs ${
                                        i === 0 
                                        ? 'bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400' 
                                        : 'bg-blue-50 text-blue-700 border-blue-100 dark:bg-blue-900/20 dark:text-blue-400'
                                    }`}>
                                        <span className="text-[9px] opacity-70">{b.label}:</span>
                                        <span>{b.count} {packagingLabel}</span>
                                        {Number(b.avg) > 0 && (
                                            <span className="text-[10px] opacity-80 border-r border-current pr-1.5 mr-0.5">
                                                ({b.avg} كجم/{packagingLabel === 'كرتونة' ? 'ك' : 'ق'})
                                            </span>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                ) : null}
            </div>

            {(cleanDescription || isRetained) && (
                <div className="space-y-3">
                    {cleanDescription && (
                        <div className={`${isForPrint ? 'p-4 border shadow-sm border-r-4 border-r-primary' : 'p-3 border-r-2 border-primary/50'} bg-neutral-50 dark:bg-neutral-900/30 rounded-xl border-neutral-100 dark:border-neutral-700`}>
                            <div className="flex items-center gap-2 mb-1">
                                <PencilIcon className="w-3 h-3 text-neutral-400" />
                                <p className="text-[10px] font-black text-neutral-400 uppercase">ملاحظات إضافية</p>
                            </div>
                            <p className={`${isForPrint ? 'text-sm' : 'text-xs'} font-bold text-neutral-700 dark:text-neutral-300 leading-relaxed`}>
                                {cleanDescription}
                            </p>
                        </div>
                    )}
                    
                    {isRetained && (
                        <div className="p-3.5 bg-amber-500/5 dark:bg-amber-500/5 rounded-2xl border border-amber-500/10 space-y-2.5">
                            <div className="flex items-center gap-2">
                                <span className="text-base">🔄</span>
                                <span className="text-xs font-black text-amber-800 dark:text-amber-300">
                                    تفاصيل سداد دين المعلم (فاتورة مرصودة)
                                </span>
                            </div>
                            <p className="text-[10px] text-neutral-500 dark:text-neutral-400 font-bold leading-relaxed">
                                تم توجيه صافي قيمة هذه الفاتورة بالكامل من المنبع لتسديد دين الشركاء المستحق للمعلم، ولم تدخل الخزنة كسيولة نقدية:
                            </p>
                            <div className="grid grid-cols-1 gap-2">
                                {Object.entries(partnerAllocations).map(([partnerId, amount]) => {
                                    const pName = activePersons?.find(p => p.id === partnerId)?.name || 'شريك';
                                    return (
                                        <div key={partnerId} className="flex justify-between items-center bg-white dark:bg-neutral-900/40 p-2.5 rounded-xl border border-neutral-100 dark:border-neutral-800">
                                            <span className="text-xs font-bold text-slate-700 dark:text-neutral-300">{pName}</span>
                                            <span className="text-sm font-black text-amber-600 dark:text-amber-400 tabular-nums">
                                                -{formatNumber(Math.round(amount))} ج.م
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            )}

            <div className="space-y-3">
                <h4 className="text-[10px] font-black text-neutral-400 uppercase tracking-widest flex items-center gap-2">
                    <TrendingUpIcon className="w-3 h-3 text-emerald-500" />
                    <span>الأوزان والمبيعات</span>
                </h4>
                <div className={`overflow-hidden border border-neutral-200 dark:border-neutral-700 rounded-xl bg-white dark:bg-neutral-900/30 ${isForPrint ? 'shadow-sm' : ''}`}>
                    <table className="w-full text-right">
                        <thead className="bg-neutral-50 dark:bg-neutral-900/80 text-neutral-500 font-black border-b border-neutral-100 dark:border-neutral-700">
                            <tr className={isForPrint ? 'text-sm' : 'text-xs'}>
                                <th className="p-3">العد</th>
                                <th className="p-3">إجمالي الوزن</th>
                                <th className="p-3">معدل القفص</th>
                                <th className="p-3">السعر</th>
                                <th className="p-3 text-left">الإجمالي</th>
                            </tr>
                        </thead>
                        <tbody className={`divide-y divide-neutral-100 dark:divide-neutral-700 ${isForPrint ? 'text-sm' : 'text-xs'}`}>
                            {priceItems.map((item, idx) => {
                                const itemPkCount = item.packaging_count || 0;
                                const itemAvg = itemPkCount > 0 ? (item.quantity / itemPkCount).toFixed(1) : '-';
                                return (
                                    <tr key={idx} className="hover:bg-neutral-50 dark:hover:bg-neutral-900/30 transition-colors">
                                        <td className="p-3 font-bold text-neutral-400">({itemPkCount})</td>
                                        <td className="p-3 font-bold text-neutral-800 dark:text-neutral-200">{formatNumber(item.quantity)} كج</td>
                                        <td className="p-3 font-bold text-amber-700 dark:text-amber-400">
                                            {itemAvg !== '-' ? `${itemAvg} كج` : '-'}
                                        </td>
                                        <td className="p-3 font-bold text-neutral-800 dark:text-neutral-200">{formatNumber(item.price_per_kg)}</td>
                                        <td className="p-3 text-left font-black text-emerald-600 dark:text-emerald-400">
                                            {formatCurrency(item.quantity * item.price_per_kg).replace('EGP', '')}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {deductions.length > 0 && (
                <div className="space-y-3">
                    <h4 className="text-[10px] font-black text-neutral-400 uppercase tracking-widest flex items-center gap-2">
                        <TrendingDownIcon className="w-3 h-3 text-rose-500" />
                        <span>الخصومات والمصاريف التفصيلية</span>
                    </h4>
                    <div className="grid grid-cols-2 gap-2">
                        {deductions.map((ded, idx) => {
                            const itemP = totalBeforeDeductions > 0 ? (ded.amount / totalBeforeDeductions * 100).toFixed(1) : '0';
                            return (
                                <div key={idx} className={`flex justify-between items-center ${isForPrint ? 'p-3 border shadow-sm' : 'p-2 border'} bg-rose-50/50 dark:bg-rose-500/5 rounded-xl border-rose-100 dark:border-rose-900/20`}>
                                    <div className="flex flex-col min-w-0">
                                        <span className={`${isForPrint ? 'text-xs' : 'text-[10px]'} font-bold text-neutral-700 dark:text-neutral-400 truncate`}>{ded.name}</span>
                                        <span className="text-[8px] text-rose-400 opacity-80 font-black uppercase tracking-tighter">
                                            %{itemP}
                                        </span>
                                    </div>
                                    <span className={`${isForPrint ? 'text-sm' : 'text-[11px]'} font-black text-rose-600 dark:text-rose-400 whitespace-nowrap mr-2`}>{formatCurrency(ded.amount).replace('EGP', '')}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            <div className={`bg-primary ${isForPrint ? 'p-6 rounded-2xl shadow-none mt-6 border-0' : 'p-4 rounded-2xl shadow-xl shadow-primary/20 border border-white/10'} text-white relative overflow-hidden`}>
                <div className="relative z-10 space-y-4">
                    <div className={`flex justify-between items-center ${isForPrint ? 'text-xs' : 'text-[10px]'} font-black uppercase tracking-widest opacity-80`}>
                        <span>إجمالي المبيعات:</span>
                        <span>{formatCurrency(totalBeforeDeductions)}</span>
                    </div>
                    {totalDeductions > 0 && (
                        <div className={`flex justify-between items-center ${isForPrint ? 'text-xs' : 'text-[10px]'} font-black uppercase tracking-widest opacity-80`}>
                            <div className="flex items-center gap-2">
                                <span>إجمالي الخصومات</span>
                                <span className={`px-2 py-0.5 rounded-lg font-black ${isForPrint ? 'bg-white/20 text-xs' : 'bg-white/20 text-[8px]'}`}>
                                    %{totalDeductionPercentage.toFixed(1)}
                                </span>
                            </div>
                            <span className="text-rose-100">-{formatCurrency(totalDeductions)}</span>
                        </div>
                    )}
                    <div className={`pt-4 border-t border-white/20 flex justify-between items-end`}>
                        <div>
                            <span className="text-[8px] font-black uppercase tracking-[0.2em] opacity-70 block mb-0.5">الصافي النهائي</span>
                            <span className={`${isForPrint ? 'text-base' : 'text-xs'} font-black uppercase tracking-wider`}>القبض الفعلي</span>
                        </div>
                        <span className={`${isForPrint ? 'text-4xl' : 'text-3xl'} font-black tracking-tighter tabular-nums`}>
                            {formatNumber(Math.round(netTotal))}
                            <span className={`${isForPrint ? 'text-xs' : 'text-[10px]'} mr-1 opacity-70`}>ج.م</span>
                        </span>
                    </div>
                </div>
            </div>

            {isForPrint && (
                <div className="pt-8 text-center space-y-2 opacity-60">
                    <p className="text-xs text-neutral-400 font-black uppercase tracking-[0.3em]">شكراً لاستخدامكم تطبيق المحاسب الزراعي</p>
                </div>
            )}
        </div>
    );

    return (
        <>
            {/* CSS للطباعة - يخفي كل شيء ويظهر الفاتورة فقط */}
            <style>{`
                @media print {
                    @page { size: A4; margin: 0; }
                    body * { visibility: hidden; }
                    #invoice-card, #invoice-card * { visibility: visible; }
                    #invoice-card {
                        position: fixed !important;
                        left: 0 !important;
                        top: 0 !important;
                        width: 100% !important;
                        height: auto !important;
                        z-index: 99999 !important;
                        background: white !important;
                        padding: 20px !important;
                        margin: 0 !important;
                    }
                    /* ضمان طباعة الخلفيات والألوان */
                    * {
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }
                }
            `}</style>

            {/* 
               Hidden Capture Container for Image/PDF Generation
               Positioned fixed with negative z-index to be invisible but renderable.
            */}
            <div 
                id="invoice-card"
                ref={shareRef}
                className="fixed top-0 left-0 -z-50 w-[600px] bg-white p-8 pointer-events-none"
                style={{ visibility: 'visible' }}
            >
                <InvoiceContent isForPrint={true} />
            </div>

            {/* Standard Modal for Normal Viewing */}
            <Modal isOpen={!isScreenshotMode} onClose={onClose} title="تفاصيل الفاتورة" size="md">
                <div className="space-y-6">
                    <InvoiceContent />
                    <div className="pt-4 flex flex-col gap-2 border-t border-neutral-100 dark:border-neutral-800">
                        <button 
                            onClick={onClose}
                            className="w-full bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-200 font-bold py-3 rounded-xl hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-all active:scale-95 text-sm"
                        >
                            إغلاق النافذة
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Screenshot Mode Overlay - For manual screenshots if needed */}
            {isScreenshotMode && !isSharedView && (
                <div 
                    className="fixed inset-0 z-[10000] bg-white flex flex-col items-center justify-center overflow-y-auto animate-enter"
                    onClick={() => setIsScreenshotMode(false)}
                >
                    <div className="w-full max-w-lg p-6 sm:p-8 pointer-events-none">
                        <InvoiceContent isForPrint={true} />
                    </div>
                    <div 
                        className="fixed left-0 right-0 text-center pointer-events-none opacity-40 px-6"
                        style={{ bottom: 'calc(1.5rem + env(safe-area-inset-bottom, 16px))' }}
                    >
                        <p className="text-[10px] text-neutral-400 font-bold bg-neutral-100 px-3 py-1 rounded-full inline-block shadow-sm">
                            اضغط في أي مكان للعودة
                        </p>
                    </div>
                </div>
            )}
        </>
    );
};

export default InvoiceDetailsModal;
