
import React, { useState, useEffect, useMemo, useRef } from 'react';
import type { Invoice } from '../../types';
import { TrendingUpIcon } from '../Icons';
import { formatCurrency, formatNumber, calculateInvoiceTotal } from '../../utils/helpers';
import Card from '../shared/Card';
import EmptyState from '../shared/EmptyState';
import InvoiceCard from './InvoiceCard';
import { useData } from '../../contexts/DataContext';
import { useUI } from '../../contexts/UIContext';
import InvoiceCardSkeleton from './InvoiceCardSkeleton';
import { EmptyInvoicesIllustration } from '../Illustrations';
import useLocalStorage from '../../hooks/useLocalStorage';
import ViewToggle from '../shared/ViewToggle';
import InvoicesTable from './InvoicesTable';

import ExtendedFAB from '../shared/ExtendedFAB';

interface InvoicesListProps {
  invoices: Invoice[];
  onAddNew: () => void;
  onDelete: (id: string) => void;
  onEdit: (id: string) => void;
  onViewDetails?: (invoice: Invoice) => void;
  lastAddedId: string | null;
}

const PAGE_SIZE = 15;

const InvoicesList: React.FC<InvoicesListProps> = ({ invoices, onAddNew, onDelete, onEdit, onViewDetails, lastAddedId }) => {
  const { profile } = useData();
  const { loading, highlightedItemId } = useUI();
  const [viewMode, setViewMode] = useLocalStorage<'card' | 'table'>('invoices-view-mode', 'card');
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const isViewer = profile?.role === 'viewer';

  // Infinite Scroll / Lazy Loading state & observer ref
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const observerTargetRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Reset pagination if invoices list updates or changes length
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [invoices.length]);

  // IntersectionObserver for auto-loading more items
  useEffect(() => {
    const target = observerTargetRef.current;
    if (!target || visibleCount >= invoices.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisibleCount((prev) => Math.min(prev + PAGE_SIZE, invoices.length));
        }
      },
      {
        root: null,
        rootMargin: '200px',
        threshold: 0.1,
      }
    );

    observer.observe(target);

    return () => {
      observer.disconnect();
    };
  }, [visibleCount, invoices.length]);
  
  const currentView = isMobile ? 'card' : viewMode;

  // Stats Calculations (Calculated on the full invoices array for 100% financial accuracy)
  const totalRevenue = useMemo(() => {
    return invoices.reduce((total, invoice) => {
        return total + calculateInvoiceTotal(invoice.price_items, invoice.deductions);
    }, 0);
  }, [invoices]);

  const totalWeight = useMemo(() => {
    return invoices.reduce((total, invoice) => {
        return total + (invoice.price_items?.reduce((sum, item) => sum + (item.quantity || 0), 0) || 0);
    }, 0);
  }, [invoices]);

  // Visible sliced invoices for high-performance rendering
  const visibleInvoices = useMemo(() => {
    return invoices.slice(0, visibleCount);
  }, [invoices, visibleCount]);

  const renderContent = () => {
    if (loading && invoices.length === 0) {
        return (
            <div className="space-y-4">
                {Array.from({ length: 3 }).map((_, index) => (
                    <InvoiceCardSkeleton key={index} />
                ))}
            </div>
        );
    }

    if (invoices.length === 0 && !loading) {
        return (
            <EmptyState
                icon={EmptyInvoicesIllustration}
                title="لا توجد فواتير بعد"
                message="ابدأ بإضافة فاتورتك الأولى عبر زر الإضافة السريع بالأسفل."
            />
        );
    }

    if (currentView === 'table') {
        return (
            <div className="space-y-4">
                <InvoicesTable invoices={visibleInvoices} onEdit={isViewer ? undefined : onEdit} onDelete={isViewer ? undefined : onDelete} />
                {visibleCount < invoices.length && (
                    <div ref={observerTargetRef} className="py-4 flex items-center justify-center">
                        <div className="flex items-center gap-2 text-xs font-bold text-neutral-400 dark:text-neutral-500">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            <span>عرض {visibleInvoices.length} من أصل {invoices.length} فاتورة...</span>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="space-y-5">
            {visibleInvoices.map((invoice, index) => {
                const isSelectedForHighlight = highlightedItemId != null && (String(highlightedItemId) === String(invoice.id) || String(highlightedItemId) === String((invoice as any)._stable_id));
                return (
                  <InvoiceCard 
                      key={(invoice as any)._stable_id || invoice.id} 
                      invoice={invoice} 
                      onDelete={isViewer ? undefined : onDelete}
                      onEdit={isViewer ? undefined : onEdit}
                      onViewDetails={onViewDetails}
                      isNew={invoice.id === lastAddedId || (invoice as any)._stable_id === lastAddedId}
                      isHighlighted={isSelectedForHighlight}
                      index={index}
                  />
                );
            })}

            {visibleCount < invoices.length && (
                <div ref={observerTargetRef} className="py-6 flex items-center justify-center">
                    <div className="flex items-center gap-2 text-xs font-bold text-neutral-400 dark:text-neutral-500 bg-white dark:bg-neutral-900 px-4 py-2 rounded-full border border-neutral-100 dark:border-neutral-800 shadow-xs">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span>جاري عرض {visibleInvoices.length} من {invoices.length} فاتورة (تحميل تلقائي)...</span>
                    </div>
                </div>
            )}
        </div>
    );
  };

  return (
    <div className="space-y-6">
       {/* بطاقة إحصاءات موحدة: تجمع إيرادات المحاصيل والأوزان المباعة في بطاقة مدمجة واحترافية وبنفس مظهر بطاقة المصروفات */}
       <Card className="flex items-center justify-between border-emerald-300/80 dark:border-emerald-800/50 p-4 rounded-2xl shadow-sm bg-emerald-100/70 dark:bg-emerald-900/20">
           {/* القسم الأيمن: إجمالي الإيرادات والوزن التفصيلي الصغير */}
           <div className="flex items-center gap-3 min-w-0">
               <TrendingUpIcon className="h-8 w-8 text-primary shrink-0" />
               <div className="text-right">
                   <p className="text-neutral-500 dark:text-neutral-400 text-xs font-black">إجمالي الإيرادات</p>
                   <p className="text-2xl font-black text-primary tabular-nums leading-none mt-1">
                       {formatCurrency(totalRevenue).replace('EGP', '')}<span className="text-xs mr-1 opacity-75">ج.م</span>
                   </p>
                   
                   {/* إجمالي الوزن مبين بخط صغير متناسق تماماً تحت المبلغ الأساسي */}
                   <div className="flex items-center gap-1 mt-1.5 text-[10px] text-neutral-400 dark:text-neutral-500 font-bold select-none whitespace-nowrap">
                       <span className="flex items-center gap-1">
                           <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                           إجمالي الوزن: <strong className="text-neutral-600 dark:text-neutral-305 tabular-nums font-extrabold">{formatNumber(totalWeight)} كج</strong>
                       </span>
                   </div>
               </div>
           </div>

           {/* القسم الأيسر: إحصائيات متوازنة لمظهر متناسق تماماً */}
           <div className="text-left pl-1">
               <p className="text-neutral-500 dark:text-neutral-400 text-[10px] sm:text-xs font-black">سجل الفواتير</p>
               <p className="text-base sm:text-lg font-black text-neutral-800 dark:text-neutral-350 tabular-nums leading-none mt-1">
                   {invoices.length} <span className="text-[10px] sm:text-xs opacity-75 font-bold">فاتورة</span>
               </p>
           </div>
       </Card>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4 w-full sm:w-auto">
            <h2 className="text-xl font-black text-neutral-800 dark:text-neutral-100 tracking-tight">سجل الفواتير</h2>
            {!isMobile && <ViewToggle viewMode={viewMode} setViewMode={setViewMode} />}
        </div>
      </div>

      <div>
        {renderContent()}
      </div>

      {!isViewer && <ExtendedFAB onClick={onAddNew} label="فاتورة" />}
    </div>
  );
};

export default InvoicesList;
