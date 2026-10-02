
import React, { useMemo } from 'react';
import { useData } from '../../contexts/DataContext';
import { formatCurrency, formatNumber } from '../../utils/helpers';
import type { Advance } from '../../types';
import { PencilIcon, TrashIcon, TrendingDownIcon, WalletIcon, CalendarIcon, ClipboardDocumentIcon } from '../Icons';

interface PersonStatementProps {
    personId: string;
    onEdit?: (advance: Advance) => void;
    onDelete?: (id: string) => void;
    cycleId?: string;
}

const AdvanceRow: React.FC<{ 
    advance: Advance; 
    onEdit?: (a: Advance) => void; 
    onDelete?: (id: string) => void;
    isHighlighted?: boolean;
}> = ({ advance, onEdit, onDelete, isHighlighted }) => {
    const isSettled = advance.reason?.includes('[SETTLED]');
    const rawReason = (advance.reason || 'سلفة نقدية').replace(' [SETTLED]', '').trim();
    const isRepayment = (advance.amount || 0) < 0;

    return (
        <div className={`group bg-white dark:bg-neutral-800/40 border border-neutral-200 dark:border-neutral-700/50 px-4 py-2.5 rounded-xl flex items-center justify-between gap-3 hover:shadow-sm hover:border-primary/30 transition-all ${isHighlighted ? 'animate-highlight' : ''}`}>
            <div className="flex items-center gap-3 min-w-0">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${isSettled || isRepayment ? 'bg-accent-success/10 dark:bg-accent-success/20 text-accent-success dark:text-accent-success' : 'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400'}`}>
                    <TrendingDownIcon className={`w-4 h-4 ${isRepayment ? 'rotate-180' : ''}`} />
                </div>
                <div className="min-w-0">
                    <div className="flex items-center gap-2">
                        <h4 className="font-bold text-xs text-neutral-800 dark:text-neutral-100 truncate">{rawReason}</h4>
                        {advance.funding_source === 'external_debt' && (
                            <span className="shrink-0 text-2xs font-black px-1.5 py-0.5 bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-450 rounded border border-sky-100 dark:border-sky-900/50">
                                تمويل خارجي (بدون كاش)
                            </span>
                        )}
                        {isSettled && (
                            <span className="shrink-0 text-2xs font-bold px-1.5 py-0.5 bg-accent-success/10 dark:bg-accent-success/20 text-accent-success dark:text-accent-success rounded">
                                تمت التسوية
                            </span>
                        )}
                        {isRepayment && (
                            <span className="shrink-0 text-2xs font-bold px-1.5 py-0.5 bg-accent-success/10 dark:bg-accent-success/20 text-accent-success dark:text-accent-success rounded">
                                سداد
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 text-2xs text-neutral-500 dark:text-neutral-400 font-bold">
                        <div className="flex items-center gap-1">
                            <CalendarIcon className="w-3 h-3 opacity-70" />
                            <span>{advance.date}</span>
                        </div>
                        {advance.fund && (
                            <span className="text-primary/70 border-r border-neutral-200 dark:border-neutral-700 pr-2 mr-0">{advance.fund}</span>
                        )}
                    </div>
                </div>
            </div>
            
            <div className="flex items-center gap-4 shrink-0">
                <div className="text-left">
                    <p className={`text-sm font-black tracking-tight ${isSettled ? 'text-neutral-400 line-through' : isRepayment ? 'text-accent-success dark:text-accent-success' : 'text-accent-danger dark:text-accent-danger'}`}>
                        <span dir="ltr"> {isRepayment ? '+' : ''}{formatCurrency(Math.abs(advance.amount)).replace('EGP', '')} </span>
                        <span className="text-2xs mr-0.5 font-bold opacity-70">ج.م</span>
                    </p>
                </div>
                
                {!isSettled && (
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        {onEdit && (
                        <button onClick={() => onEdit(advance)} className="p-1.5 text-neutral-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors">
                            <PencilIcon className="w-3.5 h-3.5" />
                        </button>
                        )}
                        {onDelete && (
                        <button onClick={() => onDelete(advance.id)} className="p-1.5 text-neutral-400 hover:text-accent-danger hover:bg-accent-danger/10 rounded-lg transition-colors">
                            <TrashIcon className="w-3.5 h-3.5" />
                        </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

const PersonStatement: React.FC<PersonStatementProps> = ({ personId, onEdit, onDelete, cycleId }) => {
    const { persons, advances, profile, highlightedItemId } = useData();

    const person = useMemo(() => persons.find(p => p.id === personId), [persons, personId]);
    const isViewer = profile?.role === 'viewer';

    const personAdvances = useMemo(() => {
        if (!personId) return [];
        return advances
            .filter(a => a.person_id === personId && (cycleId ? a.cycle_id === cycleId : true))
            .sort((a, b) => {
                const dateB = new Date(b.date).getTime();
                const dateA = new Date(a.date).getTime();
                if (dateB !== dateA) return dateB - dateA;
                return new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime();
            });
    }, [personId, advances, cycleId]);

    const totalOutstanding = useMemo(() => 
        personAdvances
            .filter(a => !a.reason?.includes('[SETTLED]'))
            .reduce((sum, a) => sum + (parseFloat(String(a.amount)) || 0), 0)
    , [personAdvances]);

    const totalHistorical = useMemo(() => 
        personAdvances.reduce((sum, a) => sum + (parseFloat(String(a.amount)) > 0 ? parseFloat(String(a.amount)) : 0), 0)
    , [personAdvances]);

    if (!person) {
        return <div className="p-12 text-center text-neutral-500 font-bold">لم يتم العثور على البيانات.</div>;
    }

    return (
        <div className="max-h-[80vh] overflow-y-auto px-1">
            <div className="space-y-6 pb-6">
                
                <div className="flex flex-col lg:flex-row gap-3">
                    <div className="flex-1 relative bg-neutral-900 dark:bg-black rounded-2xl p-6 text-white shadow-lg overflow-hidden group border border-white/5">
                        <div className="relative z-10 flex flex-col md:flex-row justify-between md:items-center gap-4">
                            <div>
                                <div className="flex items-center gap-1.5 opacity-80 mb-1">
                                    <WalletIcon className="w-4 h-4" />
                                    <span className="text-2xs font-black uppercase tracking-widest">الرصيد</span>
                                </div>
                                <div className="flex items-baseline gap-1.5">
                                    <h2 className="text-3xl font-black tracking-tighter tabular-nums text-purple-400">
                                        {formatNumber(totalOutstanding)}
                                    </h2>
                                    <span className="text-xs font-bold opacity-70">ج.م</span>
                                </div>
                            </div>
                            <div className="border-t md:border-t-0 md:border-r border-neutral-850 md:pr-4 pt-3 md:pt-0">
                                <div className="text-2xs opacity-75 font-bold mb-1">إجمالي السحب التاريخي</div>
                                <div className="flex items-baseline gap-1 font-black text-lg text-neutral-300">
                                    {formatNumber(totalHistorical)}
                                    <span className="text-2xs opacity-50 font-bold mr-0.5">ج.م</span>
                                </div>
                            </div>
                        </div>
                        <p className="mt-4 text-[11px] font-bold text-neutral-400">تم تسجيل {personAdvances.length} عمليات سجل مالي لهذا الشخص.</p>
                        <div className="absolute -bottom-6 -left-6 w-24 h-24 bg-purple-500/10 rounded-full blur-2xl"></div>
                    </div>

                    <div className="lg:w-72 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-2xl p-4 flex flex-col justify-center">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-purple-50 dark:bg-purple-900/50 flex items-center justify-center text-purple-600 font-black text-sm shrink-0 border border-purple-100 dark:border-purple-800/50">
                                {person.name.charAt(0)}
                            </div>
                            <div className="min-w-0">
                                <h3 className="font-black text-sm text-neutral-800 dark:text-neutral-100 truncate">{person.name}</h3>
                                <p className="text-2xs text-neutral-500 font-bold uppercase tracking-tight">سجل سلف الموظف</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="space-y-3">
                    <div className="flex items-center justify-between px-1">
                        <div className="flex items-center gap-2 border-r-4 border-purple-500 pr-2">
                            <h3 className="font-black text-neutral-800 dark:text-white text-sm uppercase tracking-wider">سجل العمليات التفصيلي</h3>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-2">
                        {personAdvances.length > 0 ? (
                            personAdvances.map((adv) => {
                                const isSelectedForHighlight = highlightedItemId != null && (String(highlightedItemId) === String(adv.id) || String(highlightedItemId) === String((adv as any)._stable_id));
                                return (
                                    <AdvanceRow 
                                        key={adv.id} 
                                        advance={adv} 
                                        onEdit={isViewer ? undefined as any : onEdit} 
                                        onDelete={isViewer ? undefined as any : onDelete} 
                                        isHighlighted={isSelectedForHighlight}
                                    />
                                );
                            })
                        ) : (
                            <div className="text-center py-12 bg-neutral-50 dark:bg-neutral-900/30 border-2 border-dashed border-neutral-200 dark:border-neutral-800 rounded-2xl">
                                <ClipboardDocumentIcon className="w-12 h-12 mx-auto text-neutral-200 dark:text-neutral-700 mb-2 opacity-50" />
                                <p className="text-neutral-400 text-xs font-bold">لا توجد عمليات مسجلة.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PersonStatement;
