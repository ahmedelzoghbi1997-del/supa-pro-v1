import React, { useMemo, useState } from 'react';
import type { Cycle, Person, Advance } from '../../types';
import { useData } from '../../contexts/DataContext';
import { formatNumber } from '../../utils/helpers';
import { 
    UserIcon, 
    WalletIcon, 
    ClipboardDocumentIcon
} from '../Icons';
import EmptyState from '../shared/EmptyState';
import { EmptyFarmersIllustration } from '../Illustrations';
import Modal from '../shared/Modal';
import PersonStatement from '../advances/PersonStatement';

interface CycleAdvancesTabProps {
    cycle: Cycle;
}

const PersonMiniCard: React.FC<{
    person: Person;
    personAdvances: Advance[];
    onViewStatement: (id: string) => void;
    index: number;
}> = ({ person, personAdvances, onViewStatement, index }) => {
    const totalAmount = useMemo(() => 
        personAdvances
            .filter(adv => !adv.reason?.includes('[SETTLED]'))
            .reduce((sum, adv) => sum + (adv.amount || 0), 0)
    , [personAdvances]);

    return (
        <div 
            className="group relative bg-white dark:bg-neutral-900 rounded-[1.75rem] p-4 shadow-soft border border-neutral-200 dark:border-neutral-800 hover:border-primary/40 transition-all duration-300 flex flex-col gap-4 animate-stagger-in"
            style={{ animationDelay: `${Math.min(index * 30, 600)}ms` }}
        >
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-900/30 flex items-center justify-center text-purple-600 border border-purple-100 dark:border-purple-800/50 shadow-inner">
                        <UserIcon className="w-5 h-5 opacity-80" />
                    </div>
                    <div className="min-w-0">
                        <h3 className="text-sm font-black text-neutral-800 dark:text-white truncate leading-tight">{person.name}</h3>
                        <div className="flex items-center gap-1 mt-0.5">
                            <span className="text-2xs font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-widest">{personAdvances.length} سلفة مسجلة</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="relative overflow-hidden px-4 py-3 rounded-2xl border bg-neutral-900 dark:bg-black border-neutral-800 text-white shadow-lg">
                <div className="relative z-10 flex justify-between items-center">
                    <div className="flex flex-col">
                        <span className="text-2xs font-black uppercase tracking-[0.2em] opacity-60 mb-0.5">مجموع السلف بالعروة</span>
                        <div className="flex items-baseline gap-1.5">
                            <span className="text-xl font-black tabular-nums tracking-tighter">
                                {formatNumber(totalAmount)}
                            </span>
                            <span className="text-2xs font-bold opacity-50">ج.م</span>
                        </div>
                    </div>
                    <div className="p-2 bg-white/10 backdrop-blur-md rounded-xl border border-white/5">
                        <WalletIcon className="w-4 h-4 text-purple-400 opacity-80" />
                    </div>
                </div>
                <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/10 rounded-full blur-2xl"></div>
            </div>

            <button 
                onClick={() => onViewStatement(person.id)}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-neutral-50 hover:bg-neutral-100 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-600 dark:text-neutral-300 rounded-xl font-black text-xs transition-all border border-neutral-200 dark:border-neutral-700 tap"
            >
                <ClipboardDocumentIcon className="w-4 h-4 opacity-70" />
                <span>عرض كشف الحساب بالتفصيل</span>
            </button>
        </div>
    );
};

const CycleAdvancesTab: React.FC<CycleAdvancesTabProps> = ({ cycle }) => {
    const { persons, advances, settings } = useData();
    const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);

    const cycleAdvances = useMemo(() => 
        advances.filter(adv => adv.cycle_id === cycle.id),
    [advances, cycle.id]);

    const activePersonIds = useMemo(() => {
        const ids = new Set<string>();
        cycleAdvances.forEach(adv => { if (adv.person_id) ids.add(adv.person_id); });
        return ids;
    }, [cycleAdvances]);

    const sortedPersons = useMemo(() => 
        persons
            .filter(p => {
                const isPartner = settings?.person_partner_percentages?.[p.id] !== undefined && settings.person_partner_percentages[p.id] > 0;
                return activePersonIds.has(p.id) && !isPartner;
            })
            .sort((a, b) => a.name.localeCompare(b.name, 'ar')),
    [persons, activePersonIds, settings?.person_partner_percentages]);

    return (
        <div className="space-y-6 mt-6 pb-12 animate-page-enter">
            <div className="px-1 max-w-xl">
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                    كشف بجميع الأشخاص الذين استلموا سلفاً نقدية أو عُهدات مخصومة من هذه العروة، مع عرض المجموع التفصيلي لكل شخص وإمكانية تصفح كشوف حساباتهم.
                </p>
            </div>

            {sortedPersons.length === 0 ? (
                <EmptyState
                    icon={EmptyFarmersIllustration}
                    title="لا توجد سلف شخصية لهذه العروة"
                    message="لم يتم تسجيل أي عمليات سحب سلف نقدية مخصومة من حساب هذه العروة بعد."
                />
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                    {sortedPersons.map((person, index) => (
                        <PersonMiniCard 
                            key={person.id}
                            person={person}
                            personAdvances={cycleAdvances.filter(a => a.person_id === person.id)}
                            onViewStatement={setSelectedPersonId}
                            index={index}
                        />
                    ))}
                </div>
            )}

            {/* Statement Modal */}
            <Modal
                isOpen={!!selectedPersonId}
                onClose={() => setSelectedPersonId(null)}
                title={`كشف حساب العروة لشخص: ${persons.find(p => p.id === selectedPersonId)?.name || ''}`}
                size="3xl"
            >
                {selectedPersonId && (
                    <PersonStatement
                        personId={selectedPersonId}
                        cycleId={cycle.id}
                    />
                )}
            </Modal>
        </div>
    );
};

export default CycleAdvancesTab;
