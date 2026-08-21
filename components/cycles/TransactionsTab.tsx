import React, { useState, useMemo } from 'react';
import type { Cycle, Invoice, ExpenseCategory } from '../../types';
import { TrendingUpIcon, TrendingDownIcon, WalletIcon, InvoicesIcon } from '../Icons';
import { formatCurrency, calculateInvoiceTotal } from '../../utils/helpers';
import { useData } from '../../contexts/DataContext';
import InvoiceCard from '../invoices/InvoiceCard';
import ExpenseCard from '../expenses/ExpenseCard';
import { Search } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

type FilterMode = 'invoices' | 'expenses';

const SummaryWidget = ({ label, value, icon: Icon, gradientClass, shadowClass }: { label: string, value: number, icon: React.ElementType, gradientClass: string, shadowClass: string }) => (
    <div className={`relative overflow-hidden p-2 sm:p-2.5 rounded-xl text-white ${gradientClass} ${shadowClass} flex-1`}>
        {/* Decorative background element */}
        <div className="absolute -left-4 -bottom-4 w-12 h-12 bg-white/10 rounded-full blur-xl"></div>
        <div className="absolute -right-3 -top-3 w-8 h-8 bg-white/10 rounded-full blur-lg"></div>
        
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-0">
            <div className="min-w-0 order-2 sm:order-1">
                <p className="text-[7px] sm:text-[8px] font-bold text-white/80 uppercase tracking-wider mb-0.5 truncate">{label}</p>
                <p className="text-sm sm:text-base lg:text-lg font-black tracking-tight truncate">
                    {formatCurrency(value).replace('EGP', '')}
                    <span className="text-[7px] sm:text-[8px] mr-1 font-bold opacity-80">ج.م</span>
                </p>
            </div>
            <div className="p-1 sm:p-1.5 rounded-lg bg-white/20 backdrop-blur-sm shrink-0 self-start sm:self-auto order-1 sm:order-2">
                <Icon className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
            </div>
        </div>
    </div>
);

const TransactionsTab: React.FC<{ 
    cycle: Cycle, 
    onViewInvoiceDetails: (invoice: Invoice) => void,
}> = ({ cycle, onViewInvoiceDetails }) => {
    const { invoices, expenses, suppliers, expenseCategories } = useData();
    const [filterMode, setFilterMode] = useState<FilterMode>('invoices');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);

    const cycleInvoices = useMemo(() => invoices
        .filter(inv => inv.cycle_id === cycle.id && inv.market !== 'رصيد منقول' && inv.market !== 'تمويل يدوي')
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()), 
        [invoices, cycle.id]);

    const cycleExpenses = useMemo(() => expenses
        .filter(exp => exp.cycle_id === cycle.id)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
        [expenses, cycle.id]);

    const totalRevenue = cycleInvoices.reduce((sum, inv) => sum + calculateInvoiceTotal(inv.price_items, inv.deductions), 0);
    const totalExpenses = cycleExpenses.reduce((sum, exp) => sum + exp.amount, 0);

    const filteredInvoices = useMemo(() => {
        return cycleInvoices.filter(inv => {
            const query = searchQuery.trim().toLowerCase();
            if (!query) return true;
            return (inv.market || '').toLowerCase().includes(query) || 
                   (inv.description || '').toLowerCase().includes(query) ||
                   (inv.packaging_type || '').toLowerCase().includes(query) ||
                   inv.date.includes(query);
         });
    }, [cycleInvoices, searchQuery]);

    const filteredExpenses = useMemo(() => {
        return cycleExpenses.filter(exp => {
            const query = searchQuery.trim().toLowerCase();
            if (!query) return true;
            const catName = expenseCategories.find(c => c.id === exp.category_id)?.name || '';
            const supplierName = suppliers.find(s => s.id === exp.supplier_id)?.name || '';
            return (exp.description || '').toLowerCase().includes(query) || 
                   catName.toLowerCase().includes(query) ||
                   supplierName.toLowerCase().includes(query) ||
                   exp.date.includes(query);
         });
    }, [cycleExpenses, searchQuery, expenseCategories, suppliers]);

    const categoryGroups = useMemo(() => {
        const groups: Record<string, { category: ExpenseCategory, total: number, count: number }> = {};
        
        filteredExpenses.forEach(exp => {
            const catId = exp.category_id;
            const category = expenseCategories.find(c => c.id === catId);
            if (category) {
                if (!groups[catId]) groups[catId] = { category, total: 0, count: 0 };
                groups[catId].total += exp.amount;
                groups[catId].count += 1;
            }
        });
        return Object.values(groups).sort((a, b) => b.total - a.total);
    }, [filteredExpenses, expenseCategories]);

    return (
        <div className="space-y-6 mt-6 pb-12 animate-page-enter">
            {/* Top Summaries - Compact row */}
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
                <SummaryWidget 
                    label="إجمالي التوريدات" 
                    value={totalRevenue} 
                    icon={TrendingUpIcon} 
                    gradientClass="bg-gradient-to-br from-emerald-500 to-emerald-700"
                    shadowClass="shadow-lg shadow-emerald-500/30"
                />
                <SummaryWidget 
                    label="إجمالي النفقات" 
                    value={totalExpenses} 
                    icon={TrendingDownIcon} 
                    gradientClass="bg-gradient-to-br from-rose-500 to-rose-700"
                    shadowClass="shadow-lg shadow-rose-500/30"
                />
            </div>

            {/* Sub-navigation Filter Bar */}
            <div className="sticky top-[64px] z-20 bg-neutral-50 dark:bg-neutral-950 py-2 space-y-3">
                <div className="bg-neutral-100 dark:bg-neutral-900 p-1 rounded-xl flex items-center">
                    <button 
                        onClick={() => { setFilterMode('invoices'); setSelectedCategoryId(null); }}
                        className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[10px] font-black transition-all duration-300 ${filterMode === 'invoices' ? 'bg-emerald-600 text-white shadow-sm' : 'text-neutral-500 hover:text-emerald-600'}`}
                    >
                        <InvoicesIcon className="w-3.5 h-3.5" />
                        <span>المبيعات</span>
                        <span className={`px-1.5 py-0.5 rounded text-[9px] ${filterMode === 'invoices' ? 'bg-white/20' : 'bg-neutral-200 dark:bg-neutral-700'}`}>{cycleInvoices.length}</span>
                    </button>
                    <button 
                        onClick={() => { setFilterMode('expenses'); setSelectedCategoryId(null); }}
                        className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[10px] font-black transition-all duration-300 ${filterMode === 'expenses' ? 'bg-rose-600 text-white shadow-sm' : 'text-neutral-500 hover:text-rose-600'}`}
                    >
                        <WalletIcon className="w-3.5 h-3.5" />
                        <span>المصروفات</span>
                        <span className={`px-1.5 py-0.5 rounded text-[9px] ${filterMode === 'expenses' ? 'bg-white/20' : 'bg-neutral-200 dark:bg-neutral-700'}`}>{cycleExpenses.length}</span>
                    </button>
                </div>

                {/* Interactive Search Bar */}
                <div className="relative">
                    <Search className="absolute right-3.5 top-2.5 w-4 h-4 text-neutral-400 pointer-events-none" />
                    <input 
                        type="text"
                        placeholder={filterMode === 'invoices' ? 'بحث في المبيعات بالاسم والتاريخ...' : 'بحث في النفقات والموردين والفئات...'}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-4 pr-10 py-2 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 font-bold text-xs focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none"
                    />
                </div>
            </div>

            {/* List View */}
            <div className="space-y-4">
                {filterMode === 'invoices' && (
                    filteredInvoices.length > 0 ? (
                        <motion.div layout className="space-y-4">
                            <AnimatePresence mode="popLayout">
                                {filteredInvoices.map((inv, idx) => (
                                    <motion.div 
                                        key={inv.id}
                                        initial={{ opacity: 0, y: 12 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -12 }}
                                        transition={{ duration: 0.2, delay: Math.min(idx * 0.03, 0.3) }}
                                    >
                                        <InvoiceCard 
                                            invoice={inv} 
                                            onViewDetails={onViewInvoiceDetails}
                                            index={idx}
                                        />
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                        </motion.div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed border-neutral-200 dark:border-neutral-800 rounded-3xl text-neutral-400">
                            <InvoicesIcon className="w-12 h-12 opacity-20 mb-3" />
                            <p className="text-base font-bold italic text-neutral-500 dark:text-neutral-400">لا توجد مبيعات مطابقة.</p>
                            <p className="text-xs mt-1 opacity-70">امسح البحث أو جرب كلمات أخرى.</p>
                        </div>
                    )
                )}

                {filterMode === 'expenses' && (
                    selectedCategoryId ? (
                        <div className="space-y-4">
                            <button onClick={() => setSelectedCategoryId(null)} className="flex items-center gap-2 text-xs font-black text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 mb-4 bg-neutral-100 dark:bg-neutral-800 px-3 py-1.5 rounded-full transition-colors">
                                <span>← العودة للفئات</span>
                            </button>
                            <motion.div layout className="space-y-4">
                                <AnimatePresence mode="popLayout">
                                    {filteredExpenses.filter(exp => exp.category_id === selectedCategoryId).map((exp, idx) => (
                                        <motion.div 
                                            key={exp.id}
                                            initial={{ opacity: 0, y: 12 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -12 }}
                                            transition={{ duration: 0.2, delay: Math.min(idx * 0.03, 0.3) }}
                                        >
                                            <ExpenseCard 
                                                expense={exp} 
                                                expenseCategories={expenseCategories} 
                                                suppliers={suppliers} 
                                                index={idx}
                                            />
                                        </motion.div>
                                    ))}
                                </AnimatePresence>
                            </motion.div>
                        </div>
                    ) : (
                        categoryGroups.length > 0 ? (
                            <motion.div layout className="space-y-3">
                                {categoryGroups.map(group => (
                                    <motion.button 
                                        whileHover={{ y: -2, scale: 1.01 }}
                                        whileTap={{ scale: 0.99 }}
                                        key={group.category.id}
                                        onClick={() => setSelectedCategoryId(group.category.id)}
                                        className="w-full bg-white dark:bg-neutral-800 p-4 rounded-2xl shadow-sm border border-neutral-100 dark:border-neutral-700/50 hover:shadow-md transition-all flex items-center justify-between font-sans"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-xl bg-rose-500/10 dark:bg-rose-500/20 flex items-center justify-center text-rose-500">
                                                <span className="text-lg">📁</span>
                                            </div>
                                            <div className="text-right">
                                                <h3 className="font-bold text-neutral-950 dark:text-neutral-100">{group.category.name}</h3>
                                                <p className="text-xs text-neutral-400">{group.count} حركة</p>
                                            </div>
                                        </div>
                                        <div className="font-black text-neutral-900 dark:text-white tabular-nums">
                                            {formatCurrency(group.total).replace('EGP', '')} <span className="text-[10px] text-neutral-400 font-bold">ج.م</span>
                                        </div>
                                    </motion.button>
                                ))}
                            </motion.div>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed border-neutral-200 dark:border-neutral-800 rounded-3xl text-neutral-400">
                                <WalletIcon className="w-12 h-12 opacity-20 mb-3" />
                                <p className="text-base font-bold italic text-neutral-500 dark:text-neutral-400">لا توجد مصروفات مطابقة.</p>
                                <p className="text-xs mt-1 opacity-70">امسح البحث أو جرب كلمات أخرى.</p>
                            </div>
                        )
                    )
                )}
            </div>
        </div>
    );
};

export default TransactionsTab;
