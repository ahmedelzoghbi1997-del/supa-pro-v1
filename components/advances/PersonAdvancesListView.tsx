
import React, { useMemo } from 'react';
import { useData } from '../../contexts/DataContext';
import { formatNumber } from '../../utils/helpers';
import type { Person, Advance } from '../../types';
import { 
    PlusIcon, 
    TrashIcon, 
    WalletIcon, 
    ClipboardDocumentIcon, 
    UserIcon,
    FarmerAccountIcon
} from '../Icons';
import EmptyState from '../shared/EmptyState';
import { EmptyFarmersIllustration } from '../Illustrations';

interface PersonCardProps {
  person: Person;
  personAdvances: Advance[];
  onDelete: (id: string) => void;
  onViewStatement: (id: string) => void;
  onAddAdvance: (id: string) => void;
  onZeroBalance?: (id: string, currentBalance: number) => void;
  index: number;
  isHighlighted?: boolean;
}

const PersonCard: React.FC<PersonCardProps> = ({ person, personAdvances, onDelete, onViewStatement, onAddAdvance, onZeroBalance, index, isHighlighted }) => {
  const totalAmount = useMemo(() => 
    personAdvances
      .filter(adv => !adv.reason?.includes('[SETTLED]'))
      .reduce((sum, adv) => sum + (adv.amount || 0), 0)
  , [personAdvances]);

  const canDelete = totalAmount === 0;

  return (
    <div 
        className={`group relative bg-white dark:bg-neutral-900 rounded-[1.75rem] p-4 shadow-soft border border-neutral-200 dark:border-neutral-800 hover:border-primary/40 transition-all duration-300 flex flex-col gap-4 ${isHighlighted ? 'animate-highlight' : 'animate-stagger-in'}`}
        style={{ animationDelay: isHighlighted ? '0ms' : `${index * 40}ms` }}
    >
      <div className="flex justify-between items-center">
          <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-900/30 flex items-center justify-center text-purple-600 border border-purple-100 dark:border-purple-800/50 shadow-inner">
                  <UserIcon className="w-5 h-5 opacity-80" />
              </div>
              <div className="min-w-0">
                  <h3 className="text-sm font-black text-neutral-800 dark:text-white truncate leading-tight">{person.name}</h3>
                  <div className="flex items-center gap-1 mt-0.5">
                    <span className="text-[8px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-widest">{personAdvances.length} سلفة مسجلة</span>
                  </div>
              </div>
          </div>
          {onDelete && (
          <button 
              onClick={() => canDelete && onDelete(person.id)} 
              disabled={!canDelete}
              title={!canDelete ? "لا يمكن حذف الشخص لوجود رصيد متبقي مستحق بذمته" : "حذف الشخص"}
              className={`p-1.5 transition-all rounded-lg ${!canDelete ? 'opacity-30 grayscale cursor-not-allowed text-neutral-400' : 'text-neutral-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20'}`}
          >
              <TrashIcon className="w-4 h-4" />
          </button>
          )}
      </div>

      <div className={`relative overflow-hidden px-4 py-3 rounded-2xl border bg-neutral-900 dark:bg-black border-neutral-800 text-white shadow-lg`}>
          <div className="relative z-10 flex justify-between items-center">
              <div className="flex flex-col">
                <span className="text-[7px] font-black uppercase tracking-[0.2em] opacity-60 mb-0.5">إجمالي السلف</span>
                <div className="flex items-baseline gap-1.5">
                    <span className="text-sm font-bold text-purple-300">الرصيد: </span>
                    <span className="text-xl font-black tabular-nums tracking-tighter">
                        {formatNumber(totalAmount)}
                    </span>
                    <span className="text-[10px] font-bold opacity-50">ج.م</span>
                </div>
              </div>
              <div className="p-2 bg-white/10 backdrop-blur-md rounded-xl border border-white/5 flex flex-col items-center gap-1">
                <WalletIcon className="w-4 h-4 text-purple-400 opacity-80" />
              </div>
          </div>
          {totalAmount > 0 && onZeroBalance && (
              <div className="relative z-10 mt-2 flex justify-end">
                  <button 
                      onClick={() => onZeroBalance(person.id, totalAmount)}
                      className="text-[9px] font-bold px-2.5 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-all active:scale-95 shadow-sm"
                  >
                      تصفير الحساب ↩
                  </button>
              </div>
          )}
          <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/10 rounded-full blur-2xl"></div>
      </div>

      <div className="flex items-center gap-2 mt-1">
          <button 
              onClick={() => onViewStatement(person.id)}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-white dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 rounded-xl font-black text-[10px] hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-all border border-neutral-200 dark:border-neutral-700"
          >
              <ClipboardDocumentIcon className="w-3.5 h-3.5 opacity-50" />
              <span>كشف الحساب</span>
          </button>
          {onAddAdvance && (
          <button 
              onClick={() => onAddAdvance(person.id)}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-primary text-white rounded-xl font-black text-[10px] hover:bg-primary-dark transition-all shadow-md shadow-primary/10 active:scale-95"
          >
              <PlusIcon className="w-3.5 h-3.5" />
              <span>تسجيل سلفة / سداد</span>
          </button>
          )}
      </div>
    </div>
  );
};

interface PersonAdvancesListViewProps {
  onAddPerson: () => void;
  onAddAdvanceForPerson: (id: string) => void;
  onViewStatement: (id: string) => void;
  onDeletePerson: (id: string) => void;
  onZeroBalance?: (id: string, currentBalance: number) => void;
}

const PersonAdvancesListView: React.FC<PersonAdvancesListViewProps> = ({ onAddPerson, onAddAdvanceForPerson, onViewStatement, onDeletePerson, onZeroBalance }) => {
    const { activePersons, advances, profile, highlightedItemId, settings } = useData();

    const nonPartnerPersons = useMemo(() => {
        return activePersons.filter(p => {
            const isPartner = settings?.person_partner_percentages?.[p.id] !== undefined && settings.person_partner_percentages[p.id] > 0;
            return !isPartner;
        });
    }, [activePersons, settings?.person_partner_percentages]);

    const sortedPersons = useMemo(() => 
        [...nonPartnerPersons]
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
    [nonPartnerPersons]);

    const isViewer = profile?.role === 'viewer';

    return (
        <div className="space-y-8 pb-20">
           <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 px-2">
            <div className="max-w-md">
              <h2 className="text-2xl font-black text-neutral-900 dark:text-white tracking-tight">السلف الشخصية</h2>
              <p className="text-neutral-500 dark:text-neutral-400 mt-1 text-xs font-medium">متابعة المبالغ النقدية الممنوحة للأشخاص والتي تخصم من عهدة العروات.</p>
            </div>
            {!isViewer && (
            <div className="flex gap-2 w-full md:w-auto">
                <button
                    onClick={onAddPerson}
                    className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-white dark:bg-neutral-800 text-neutral-800 dark:text-white border border-neutral-200 dark:border-neutral-700 font-black py-2.5 px-4 rounded-xl shadow-sm hover:bg-neutral-50 transition-all text-sm"
                >
                    <FarmerAccountIcon className="h-4 w-4" />
                    <span>إدارة الأشخاص</span>
                </button>
            </div>
            )}
          </div>

          <div>
             {sortedPersons.length === 0 ? (
              <EmptyState
                icon={EmptyFarmersIllustration}
                title="قائمة الأشخاص فارغة"
                message="ابدأ بإضافة شخص أولاً لتتمكن من تسجيل السلف باسمه."
              />
            ) : (
               <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                {sortedPersons.map((person, index) => {
                  const isSelectedForHighlight = highlightedItemId === person.id || highlightedItemId === (person as any)._stable_id;
                  return (
                    <PersonCard 
                      key={person.id}
                      person={person}
                      personAdvances={advances.filter(a => a.person_id === person.id)}
                      onDelete={isViewer ? undefined as any : onDeletePerson}
                      onViewStatement={onViewStatement}
                      onAddAdvance={isViewer ? undefined as any : onAddAdvanceForPerson}
                      onZeroBalance={isViewer ? undefined : onZeroBalance}
                      index={index}
                      isHighlighted={isSelectedForHighlight}
                    />
                  );
                })}
              </div>
            )}
          </div>
        </div>
    );
};

export default PersonAdvancesListView;
