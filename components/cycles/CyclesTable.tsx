
import React, { useState, useRef, useEffect, useMemo } from 'react';
import type { Cycle, CycleStatus } from '../../types';
import { formatCurrency } from '../../utils/helpers';
import { PencilIcon, TrashIcon, ClipboardDocumentIcon, EllipsisVerticalIcon, EyeSlashIcon } from '../Icons';
import { useData } from '../../contexts/DataContext';
import { useToast } from '../../hooks/useToast';

interface CyclesTableProps {
  cycles: Cycle[];
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
  onViewReport: (id: string) => void;
  onToggleStatus?: (cycle: Cycle) => void;
}

const StatusBadge: React.FC<{ status: CycleStatus }> = ({ status }) => {
    const statusMap = {
        active: { label: 'نشطة', classes: 'bg-accent-success/10 text-accent-success' },
        closed: { label: 'مغلقة', classes: 'bg-neutral-200 text-neutral-800 dark:bg-neutral-700 dark:text-neutral-300' },
        archived: { label: 'مؤرشفة', classes: 'bg-accent-warning/10 text-accent-warning' },
    };
    const { label, classes } = statusMap[status] || statusMap.closed;
    return (
        <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${classes}`}>
            {label}
        </span>
    );
};

const ActionsMenu: React.FC<{ 
    cycle: Cycle; 
    onEdit?: (id: string) => void; 
    onDelete?: (id: string) => void; 
    onToggleStatus?: (cycle: Cycle) => void; 
}> = ({ cycle, onEdit, onDelete, onToggleStatus }) => {
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    const { invoices, expenses } = useData();
    const { showToast } = useToast();

    // If no restricted actions are possible, don't show the menu at all
    if (!onEdit && !onToggleStatus && !onDelete) return null;

    const canDelete = useMemo(() => {
        return !invoices.some(i => i.cycle_id === cycle.id && i.market !== 'رصيد منقول') && !expenses.some(e => e.cycle_id === cycle.id);
    }, [invoices, expenses, cycle.id]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleDeleteClick = () => {
        if (!canDelete) {
            showToast('لا يمكن حذف العروة لوجود فواتير أو مصروفات مسجلة بها.', 'error');
            return;
        }
        onDelete(cycle.id);
        setIsOpen(false);
    };

    return (
        <div className="relative" ref={menuRef}>
            <button onClick={() => setIsOpen(!isOpen)} className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center p-2 rounded-full hover:bg-neutral-200 dark:hover:bg-neutral-700" aria-label="خيارات">
                <EllipsisVerticalIcon className="h-5 w-5" />
            </button>
            {isOpen && (
                <div className="absolute left-0 bottom-full mb-2 w-48 bg-white dark:bg-neutral-800 rounded-lg shadow-lg border border-neutral-200 dark:border-neutral-700 z-10">
                     {onEdit && (
                        <button onClick={() => { onEdit(cycle.id); setIsOpen(false); }} className="w-full text-right flex items-center gap-3 px-4 py-2.5 text-sm text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-700">
                            <PencilIcon className="w-4 h-4 text-accent-info" />
                            <span>تعديل</span>
                        </button>
                     )}
                    {onToggleStatus && (
                        <button onClick={() => { onToggleStatus(cycle); setIsOpen(false); }} className="w-full text-right flex items-center gap-3 px-4 py-2.5 text-sm text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-700">
                            <EyeSlashIcon className="w-4 h-4 text-accent-warning" />
                            <span>{cycle.status === 'active' ? 'إغلاق العروة' : 'إعادة فتح العروة'}</span>
                        </button>
                    )}
                    {(onEdit || onToggleStatus) && onDelete && <hr className="my-1 border-neutral-200 dark:border-neutral-700" />}
                    {onDelete && (
                        <button 
                            onClick={handleDeleteClick} 
                            className={`w-full text-right flex items-center gap-3 px-4 py-2.5 text-sm transition-all ${!canDelete ? 'opacity-20 grayscale cursor-not-allowed text-neutral-400' : 'text-accent-danger hover:bg-accent-danger/10'}`}
                        >
                            <TrashIcon className="w-4 h-4" />
                            <span>حذف العروة</span>
                        </button>
                    )}
                </div>
            )}
        </div>
    );
};

const CyclesTable: React.FC<CyclesTableProps> = ({ cycles, onEdit, onDelete, onViewReport, onToggleStatus }) => {
  const { assets, farmers } = useData();
  const headClasses = "p-4 text-sm font-semibold text-right text-neutral-500 dark:text-neutral-400 border-b-2 border-neutral-200 dark:border-neutral-700";
  const cellClasses = "p-4 text-sm text-neutral-800 dark:text-neutral-200 whitespace-nowrap";
  
  return (
    <div className="w-full">
      {/* 📱 Mobile View: Smart Cards (يظهر تلقائياً على الهواتف والشاشات الصغيرة) */}
      <div className="md:hidden space-y-3">
        {cycles.map((cycle) => {
          const assetName = assets.find(g => g.id === cycle.asset_id)?.name || '-';
          const farmerName = farmers.find(f => f.id === cycle.responsible_farmer_id)?.name;

          return (
            <div
              key={cycle.id}
              className="bg-white dark:bg-neutral-900 rounded-2xl p-4 border border-neutral-200/80 dark:border-neutral-800 shadow-sm transition-all"
            >
              {/* Header: Cycle name, status, actions */}
              <div className="flex items-start justify-between gap-2 pb-3 border-b border-neutral-100 dark:border-neutral-800">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-black text-sm text-neutral-900 dark:text-neutral-100 truncate">
                      {cycle.name}
                    </h3>
                    <StatusBadge status={cycle.status} />
                  </div>
                  <p className="text-[11px] text-neutral-400 font-medium mt-0.5">
                    {cycle.seed_type ? `نوع التقاوي: ${cycle.seed_type}` : 'العروة الحالية'}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => onViewReport(cycle.id)}
                    className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center p-2 rounded-lg text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors"
                    aria-label="عرض التقرير"
                    title="التقرير"
                  >
                    <ClipboardDocumentIcon className="h-5 w-5" />
                  </button>
                  <ActionsMenu cycle={cycle} onEdit={onEdit} onDelete={onDelete} onToggleStatus={onToggleStatus} />
                </div>
              </div>

              {/* Sub-info: Greenhouse & Farmer */}
              <div className="py-2.5 flex items-center justify-between text-xs text-neutral-500 dark:text-neutral-400 border-b border-neutral-100 dark:border-neutral-800">
                <span className="flex items-center gap-1 font-semibold">
                  <span>الأصل:</span>
                  <strong className="text-neutral-800 dark:text-neutral-200 font-bold">{assetName}</strong>
                </span>
                <span className="flex items-center gap-1 font-semibold">
                  <span>المزارع:</span>
                  <strong className="text-neutral-800 dark:text-neutral-200 font-bold">{farmerName || 'لا يوجد'}</strong>
                </span>
              </div>

              {/* Financial Mini Strip: Revenue, Expenses, Profit */}
              <div className="grid grid-cols-3 gap-2 pt-3 text-center">
                <div className="bg-accent-success/10/70 dark:bg-accent-success/20 p-2 rounded-xl border border-accent-success/20/60 dark:border-accent-success/30">
                  <span className="text-2xs font-bold text-accent-success dark:text-accent-success block mb-0.5">الإيرادات</span>
                  <span className="text-xs font-black text-accent-success dark:text-accent-success tabular-nums">
                    {formatCurrency(cycle.revenue).replace('EGP', '')}
                  </span>
                </div>
                <div className="bg-accent-danger/10/70 dark:bg-accent-danger/20 p-2 rounded-xl border border-accent-danger/20/60 dark:border-accent-danger/30">
                  <span className="text-2xs font-bold text-accent-danger dark:text-accent-danger block mb-0.5">المصروفات</span>
                  <span className="text-xs font-black text-accent-danger dark:text-accent-danger tabular-nums">
                    {formatCurrency(cycle.expenses).replace('EGP', '')}
                  </span>
                </div>
                <div className="bg-accent-info/10 dark:bg-accent-info/20 p-2 rounded-xl border border-accent-info/20 dark:border-accent-info/30">
                  <span className="text-2xs font-bold text-accent-info dark:text-accent-info block mb-0.5">ربح المالك</span>
                  <span className="text-xs font-black text-accent-info dark:text-accent-info tabular-nums">
                    {formatCurrency(cycle.profit).replace('EGP', '')}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 💻 Desktop View: Classic Table (يظهر على شاشات md وما فوق) */}
      <div className="hidden md:block bg-neutral-0 dark:bg-neutral-800 rounded-lg shadow-soft overflow-x-auto border border-neutral-200 dark:border-neutral-700">
        <table className="w-full min-w-[800px]">
          <thead>
            <tr className="bg-neutral-50 dark:bg-neutral-900/50">
              <th className={headClasses}>اسم العروة</th>
              <th className={headClasses}>الأصل</th>
              <th className={headClasses}>المزارع</th>
              <th className={headClasses}>الإيرادات</th>
              <th className={headClasses}>المصروفات</th>
              <th className={headClasses}>ربح المالك</th>
              <th className={headClasses}>الحالة</th>
              <th className={headClasses}></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-200 dark:divide-neutral-700">
            {cycles.map((cycle) => {
                const assetName = assets.find(g => g.id === cycle.asset_id)?.name || '-';
                const farmerName = farmers.find(f => f.id === cycle.responsible_farmer_id)?.name;
                return (
                    <tr key={cycle.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-700/50">
                    <td className={cellClasses}>
                        <p className="font-bold">{cycle.name}</p>
                        <p className="text-xs text-neutral-500">{cycle.seed_type}</p>
                    </td>
                    <td className={cellClasses}>{assetName}</td>
                    <td className={cellClasses}>
                        {farmerName
                        ? farmerName
                        : <span className="text-neutral-500">لا يوجد</span>
                        }
                    </td>
                    <td className={`${cellClasses} font-semibold text-accent-success`}>{formatCurrency(cycle.revenue)}</td>
                    <td className={`${cellClasses} font-semibold text-accent-danger`}>{formatCurrency(cycle.expenses)}</td>
                    <td className={`${cellClasses} font-bold text-accent-info`}>{formatCurrency(cycle.profit)}</td>
                    <td className={cellClasses}><StatusBadge status={cycle.status} /></td>
                    <td className={`${cellClasses} text-left`}>
                        <div className="flex items-center justify-end gap-1">
                            <button onClick={() => onViewReport(cycle.id)} className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center p-2 rounded-md text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700 hover:text-neutral-600 dark:hover:text-neutral-200 transition-colors" aria-label="عرض التقرير">
                                <ClipboardDocumentIcon className="h-5 w-5" />
                            </button>
                            <ActionsMenu cycle={cycle} onEdit={onEdit} onDelete={onDelete} onToggleStatus={onToggleStatus} />
                        </div>
                    </td>
                    </tr>
                )
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default CyclesTable;
