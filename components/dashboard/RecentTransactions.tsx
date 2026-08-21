import React, { useMemo } from 'react';
import Card from '../shared/Card';
import { ArrowUpRightIcon, ArrowDownLeftIcon } from '../Icons';
import { formatCurrency, calculateInvoiceTotal } from '../../utils/helpers';
import { useData } from '../../contexts/DataContext';
import { useUI } from '../../contexts/UIContext';
import Skeleton from '../shared/Skeleton';

interface RecentTransactionsProps {
    filteredInvoices?: any[];
    filteredExpenses?: any[];
}

const RecentTransactions: React.FC<RecentTransactionsProps> = ({ filteredInvoices, filteredExpenses }) => {
    const { invoices: allInvoices, expenses: allExpenses, cycles } = useData();
    const { loading } = useUI();

    const sortedTransactions = useMemo(() => {
        const activeCycleIds = new Set(cycles.filter(c => c.status === 'active').map(c => c.id));
        const srcInvoices = filteredInvoices || allInvoices;
        const srcExpenses = filteredExpenses || allExpenses;

        const combined = [
            ...srcInvoices.filter(inv => activeCycleIds.has(inv.cycle_id) && inv.market !== 'رصيد منقول' && inv.market !== 'تمويل يدوي').map(inv => ({
                    id: inv.id, type: 'invoice' as const, description: inv.description || 'فاتورة بيع',
                    amount: calculateInvoiceTotal(inv.price_items, inv.deductions), date: inv.date,
                    created_at: inv.created_at
                })),
            ...srcExpenses.filter(exp => activeCycleIds.has(exp.cycle_id)).map(exp => ({
                    id: exp.id, type: 'expense' as const, description: exp.description, amount: -exp.amount, date: exp.date,
                    created_at: exp.created_at
                }))
        ];
        
        return combined.sort((a, b) => {
            const dateB = new Date(b.date).getTime();
            const dateA = new Date(a.date).getTime();
            if (dateB !== dateA) return dateB - dateA;
            
            // الترتيب الداخلي يظل يعتمد على created_at لضمان صحة التسلسل
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        }).slice(0, 5);
    }, [filteredInvoices, filteredExpenses, allInvoices, allExpenses, cycles]);

    if (loading) {
        return (
            <Card>
                <Skeleton className="h-6 w-40 mb-6" />
                <div className="space-y-4">
                    {[1, 2, 3, 4, 5].map(i => (
                        <div key={i} className="flex items-center justify-between p-2">
                            <div className="flex items-center gap-3">
                                <Skeleton className="h-10 w-10 rounded-full" />
                                <div className="space-y-2">
                                    <Skeleton className="h-4 w-32" />
                                    <Skeleton className="h-3 w-20" />
                                </div>
                            </div>
                            <Skeleton className="h-5 w-24" />
                        </div>
                    ))}
                </div>
            </Card>
        );
    }

    return (
        <Card>
            <h3 className="text-lg font-bold text-neutral-800 dark:text-neutral-50 mb-4">أحدث المعاملات</h3>
            <div className="space-y-3">
                {sortedTransactions.length > 0 ? sortedTransactions.map(tx => {
                    const isInvoice = tx.type === 'invoice';
                    return (
                        <div key={`${tx.type}-${tx.id}`} className="flex items-center justify-between p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800/50">
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-full ${isInvoice ? 'bg-accent-success/10' : 'bg-accent-danger/10'}`}>
                                    {isInvoice ? <ArrowUpRightIcon className="h-5 w-5 text-accent-success" /> : <ArrowDownLeftIcon className="h-5 w-5 text-accent-danger" />}
                                </div>
                                <div>
                                    <p className="font-bold text-sm text-neutral-800 dark:text-neutral-100">{tx.description}</p>
                                    <div className="flex items-center gap-2 text-[10px] text-neutral-400 font-bold">
                                        <span>{tx.date}</span>
                                    </div>
                                </div>
                            </div>
                            <p className={`font-black text-sm tabular-nums ${isInvoice ? 'text-accent-success' : 'text-accent-danger'}`}>
                                {formatCurrency(tx.amount).replace('EGP', '')}
                            </p>
                        </div>
                    );
                }) : <p className="text-center text-neutral-500 dark:text-neutral-400 py-4">لا توجد معاملات لعرضها.</p>}
            </div>
        </Card>
    );
};

export default RecentTransactions;