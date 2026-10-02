
import React, { useRef, useEffect, useMemo } from 'react';
import { useData } from '../../contexts/DataContext';
import { formatNumber } from '../../utils/helpers';
import type { Farmer, Cycle } from '../../types';
import { 
    PlusIcon, 
    TrashIcon, 
    ClipboardDocumentIcon, 
    UserIcon,
    PencilIcon,
} from '../Icons';
import EmptyState from '../shared/EmptyState';
import { EmptyFarmersIllustration } from '../Illustrations';
import { useToast } from '../../hooks/useToast';

import ExtendedFAB from '../shared/ExtendedFAB';

interface FarmerCardProps {
  farmer: Farmer;
  allCycles: Cycle[];
  onDelete: (id: string) => void;
  onEdit: (farmer: Farmer) => void;
  onViewStatement: (id: string) => void;
  onAddWithdrawal: (id: string) => void;
  isNew?: boolean;
  onAnimationEnd?: () => void;
  index: number;
  isHighlighted?: boolean;
}

const StatMini = ({ label, value, type }: { label: string; value: number; type: 'income' | 'expense' }) => (
    <div className="flex flex-col gap-0.5">
        <span className="text-2xs font-black text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">{label}</span>
        <div className="flex items-baseline gap-1">
            <span className={`text-sm font-black tabular-nums ${type === 'income' ? 'text-accent-success dark:text-accent-success' : 'text-accent-danger dark:text-accent-danger'}`}>
                {formatNumber(value)}
            </span>
            <span className="text-2xs font-bold opacity-40">ج.م</span>
        </div>
    </div>
);

const FarmerCard: React.FC<FarmerCardProps> = ({ farmer, allCycles, onDelete, onEdit, onViewStatement, onAddWithdrawal, isNew, onAnimationEnd, index, isHighlighted }) => {
  const { farmerWithdrawals } = useData();
  const { showToast } = useToast();
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isNew && cardRef.current && onAnimationEnd) {
        const handleAnimEnd = () => onAnimationEnd();
        const node = cardRef.current;
        node.addEventListener('animationend', handleAnimEnd, { once: true });
        return () => {
            node.removeEventListener('animationend', handleAnimEnd);
        };
    }
  }, [isNew, onAnimationEnd]);
  
  const activeCycleIds = useMemo(() => new Set(allCycles.filter(c => c.status === 'active').map(c => c.id)), [allCycles]);
  const hasActiveAssignedCycle = useMemo(() => allCycles.some(c => c.responsible_farmer_id === farmer.id && c.status === 'active'), [allCycles, farmer.id]);

  const totalShare = useMemo(() => allCycles
    .filter(c => c.responsible_farmer_id === farmer.id && (hasActiveAssignedCycle ? c.status === 'active' : true))
    .reduce((sum, c) => sum + (c.farmerShare || 0), 0), [allCycles, farmer.id, hasActiveAssignedCycle]);
  
  const totalWithdrawals = useMemo(() => farmerWithdrawals
    .filter(w => w.farmer_id === farmer.id && (hasActiveAssignedCycle ? activeCycleIds.has(w.cycle_id) : true))
    .reduce((sum, w) => sum + (w.amount || 0), 0), [farmerWithdrawals, farmer.id, hasActiveAssignedCycle, activeCycleIds]);

  const balance = totalShare - totalWithdrawals;

  // منطق حماية المزارع من الحذف
  const canDelete = useMemo(() => {
      const hasWithdrawals = farmerWithdrawals.some(w => w.farmer_id === farmer.id);
      const hasAssignedCycles = allCycles.some(c => c.responsible_farmer_id === farmer.id);
      return !hasWithdrawals && !hasAssignedCycles;
  }, [farmerWithdrawals, allCycles, farmer.id]);

  const handleDeleteClick = () => {
      if (!canDelete) {
          showToast('لا يمكن حذف المزارع لوجود مسحوبات مسجلة أو عروات مسندة إليه.', 'error');
          return;
      }
      onDelete(farmer.id);
  };

  const animationClass = isHighlighted ? 'animate-highlight' : (isNew ? 'animate-enter' : 'animate-stagger-in');

  return (
    <div 
        ref={cardRef}
        className={`group relative bg-white dark:bg-neutral-900 rounded-[1.75rem] p-4 shadow-soft border border-neutral-200 dark:border-neutral-800 hover:border-primary/40 transition-all duration-300 flex flex-col gap-4 ${animationClass}`}
        style={{ animationDelay: isNew || isHighlighted ? '0ms' : `${Math.min(index * 30, 600)}ms` }}
    >
      <div className="flex justify-between items-center">
          <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-primary border border-neutral-200 dark:border-neutral-700 shadow-inner">
                  <span className="font-black text-sm uppercase">{farmer.name.charAt(0)}</span>
              </div>
              <div className="min-w-0">
                  <h3 className="text-sm font-black text-neutral-800 dark:text-white truncate leading-tight">{farmer.name}</h3>
                  <div className="flex items-center gap-1 mt-0.5 text-2xs font-bold text-neutral-400">
                    <span className="uppercase tracking-widest">ID #{farmer.id.substring(0, 4)}</span>
                  </div>
              </div>
          </div>
          
          <div className="flex items-center gap-1">
            {onEdit && (
            <button 
                onClick={() => onEdit(farmer)} 
                className="p-1.5 transition-all rounded-lg text-neutral-300 hover:text-primary hover:bg-primary/5"
                aria-label="تعديل مزارع"
            >
                <PencilIcon className="w-4 h-4" />
            </button>
            )}
            {onDelete && (
            <div className="relative group/del">
                <button 
                    onClick={handleDeleteClick} 
                    className={`p-1.5 transition-all rounded-lg ${!canDelete ? 'opacity-20 grayscale cursor-not-allowed' : 'text-neutral-300 hover:text-accent-danger hover:bg-accent-danger/10'}`}
                    aria-label="حذف مزارع"
                >
                    <TrashIcon className="w-4 h-4" />
                </button>
                {!canDelete && (
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-neutral-900 text-white text-2xs rounded-lg opacity-0 group-hover/del:opacity-100 transition-opacity z-10 pointer-events-none shadow-xl border border-white/10 leading-relaxed text-center">
                        نظام الحماية: لا يمكن حذف مزارع لديه سجلات مالية أو عروات مرتبطة.
                    </div>
                )}
            </div>
            )}
          </div>
      </div>

      <div className={`relative overflow-hidden px-4 py-3 rounded-2xl border transition-all ${balance < 0 ? 'bg-accent-danger border-rose-700 text-white' : 'bg-neutral-900 dark:bg-black border-neutral-800 text-white'}`}>
          <div className="relative z-10 flex justify-between items-center">
              <div className="flex flex-col">
                <span className="text-2xs font-black uppercase tracking-[0.2em] opacity-60 mb-0.5">الرصيد الصافي المتبقي</span>
                <div className="flex items-baseline gap-1.5">
                    <span className="text-xl font-black tabular-nums tracking-tighter">{formatNumber(balance)}</span>
                    <span className="text-2xs font-bold opacity-50">ج.م</span>
                </div>
              </div>
              <UserIcon className="w-4 h-4 text-primary-light opacity-80" />
          </div>
          <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full blur-2xl"></div>
      </div>

      <div className="flex items-center justify-between px-3 py-2 bg-neutral-50 dark:bg-neutral-800/50 rounded-xl border border-neutral-100 dark:border-neutral-800 shadow-sm">
          <StatMini label="إجمالي المستحقات" value={totalShare} type="income" />
          <div className="w-px h-8 bg-neutral-200 dark:bg-neutral-700"></div>
          <StatMini label="إجمالي المسحوبات" value={totalWithdrawals} type="expense" />
      </div>

      <div className="flex items-center gap-2 mt-1">
          <button onClick={() => onViewStatement(farmer.id)} className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-white dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 rounded-xl font-black text-2xs hover:bg-neutral-50 border border-neutral-200 dark:border-neutral-700">
              <ClipboardDocumentIcon className="w-3.5 h-3.5 opacity-50" />
              <span>كشف الحساب</span>
          </button>
          {onAddWithdrawal && (
          <button onClick={() => onAddWithdrawal(farmer.id)} className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-primary text-white rounded-xl font-black text-2xs hover:bg-primary-dark transition-all tap shadow-md shadow-primary/10">
              <PlusIcon className="w-3.5 h-3.5" />
              <span>تسجيل سحب</span>
          </button>
          )}
      </div>
    </div>
  );
};

interface FarmerAccountListViewProps {
  onAddFarmer: () => void;
  onEditFarmer: (farmer: Farmer) => void;
  onAddWithdrawalForFarmer: (id: string) => void;
  onViewStatement: (id: string) => void;
  onDeleteRequest: (id: string) => void;
  lastAddedId: string | null;
  onAnimationEnd: () => void;
}

const FarmerAccountListView: React.FC<FarmerAccountListViewProps> = ({ onAddFarmer, onEditFarmer, onAddWithdrawalForFarmer, onViewStatement, onDeleteRequest, lastAddedId, onAnimationEnd }) => {
    const { farmers, cyclesWithCalculations, profile, highlightedItemId, farmerWithdrawals, cycles } = useData();

    const activeCycleIds = useMemo(() => new Set(cycles.filter(c => c.status === 'active').map(c => c.id)), [cycles]);

    const visibleFarmers = useMemo(() => {
        return farmers.filter(farmer => {
            // Has active assigned cycle
            const hasActiveCycle = cyclesWithCalculations.some(c => c.responsible_farmer_id === farmer.id && activeCycleIds.has(c.id));
            
            // Has active withdrawals
            const hasActiveWithdrawals = farmerWithdrawals.some(w => w.farmer_id === farmer.id && activeCycleIds.has(w.cycle_id));

            // Is brand new (has zero cycles ever, zero withdrawals ever)
            const hasAnyCycles = cyclesWithCalculations.some(c => c.responsible_farmer_id === farmer.id);
            const hasAnyWithdrawals = farmerWithdrawals.some(w => w.farmer_id === farmer.id);
            const isBrandNew = !hasAnyCycles && !hasAnyWithdrawals;

            return hasActiveCycle || hasActiveWithdrawals || isBrandNew;
        });
    }, [farmers, cyclesWithCalculations, activeCycleIds, farmerWithdrawals]);

    const sortedFarmers = useMemo(() => 
        visibleFarmers
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
    [visibleFarmers]);

    const isViewer = profile?.role === 'viewer';

    return (
        <div className="space-y-8 pb-24">
           <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 px-2">
            <div className="max-w-md">
              <h2 className="text-2xl font-black text-neutral-900 dark:text-white tracking-tight">حسابات المزارعين</h2>
              <p className="text-neutral-500 dark:text-neutral-400 mt-1 text-xs font-medium">متابعة حصص الأرباح والمسحوبات النقدية.</p>
            </div>
          </div>

          <div>
            {sortedFarmers.length === 0 ? (
              <EmptyState icon={EmptyFarmersIllustration} title="قائمة المزارعين فارغة" message="ابدأ بإضافة مزارع لتتبع مستحقاته." />
            ) : (
               <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                {sortedFarmers.map((farmer, index) => {
                  const isSelectedForHighlight = highlightedItemId === farmer.id || highlightedItemId === (farmer as any)._stable_id;
                  return (
                    <FarmerCard 
                      key={farmer.id}
                      farmer={farmer}
                      allCycles={cyclesWithCalculations}
                      onDelete={isViewer ? undefined as any : onDeleteRequest}
                      onEdit={isViewer ? undefined as any : onEditFarmer}
                      onViewStatement={onViewStatement}
                      onAddWithdrawal={isViewer ? undefined as any : onAddWithdrawalForFarmer}
                      isNew={farmer.id === lastAddedId}
                      onAnimationEnd={onAnimationEnd}
                      index={index}
                      isHighlighted={isSelectedForHighlight}
                    />
                  );
                })}
              </div>
            )}
          </div>

          {!isViewer && <ExtendedFAB onClick={onAddFarmer} label="مزارع" />}
        </div>
    );
};

export default FarmerAccountListView;
