
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import type { Expense } from '../../types';
import ExpensesList from './ExpensesList';
import AddExpenseForm from './AddExpenseForm';
import CategoryExpensesDetails from './CategoryExpensesDetails';
import SupplierExpensesDetails from './SupplierExpensesDetails';
import { useToast } from '../../hooks/useToast';
import Modal from '../shared/Modal';
import { useData } from '../../contexts/DataContext';
import { useUI } from '../../contexts/UIContext';

const ExpenseManager: React.FC = () => {
    const [view, setView] = useState<'list' | 'supplier_details' | 'category_details'>(() => {
        const state = window.history.state;
        if (state?.expenseView) return state.expenseView;
        return 'list';
    });
    const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(() => window.history.state?.catId || null);
    const [isFormModalOpen, setFormModalOpen] = useState(false);
    const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
    const [isDeleteModalOpen, setDeleteModalOpen] = useState(false);
    const [expenseToDelete, setExpenseToDelete] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    
    const { showToast } = useToast();
    const { expenses, addExpense, updateExpense, deleteExpense, lastExpenseAddedId, setLastExpenseAddedId, expenseCategories, suppliers, profile, cycles } = useData();
    const { statementAction, setStatementAction } = useUI();
    const isViewer = profile?.role === 'viewer';
    
    const editingExpense = useMemo(() => {
        if (!editingExpenseId) return null;
        return expenses.find(expense => expense.id === editingExpenseId) || null;
    }, [editingExpenseId, expenses]);

    // Respond to notification/statement actions
    useEffect(() => {
        if (statementAction?.route === 'expenses' && statementAction.parentId) {
            setSelectedCategoryId(statementAction.parentId);
            setView('category_details');
            // Clear the action after responding to it
            setStatementAction(null);
        }
    }, [statementAction, setStatementAction]);
    
    const activeCycleIds = useMemo(() => 
        new Set(cycles.filter(c => c.status === 'active').map(c => c.id)),
    [cycles]);

    const activeExpenses = useMemo(() => 
        expenses.filter(e => activeCycleIds.has(e.cycle_id)),
    [expenses, activeCycleIds]);

    const validExpenses = useMemo(() => {
        return [...activeExpenses].sort((a, b) => {
            const dateComparison = new Date(b.date).getTime() - new Date(a.date).getTime();
            if (dateComparison !== 0) return dateComparison;
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        });
    }, [activeExpenses]);

    const isSeedCategory = useCallback((categoryId: string) => {
        const category = expenseCategories.find(c => c.id === categoryId);
        if (!category) return false;
        const name = category.name.toLowerCase();
        return name.includes('بذور') || name.includes('بذرة') || name.includes('تقاوي') || name.includes('شتلات') || name.includes('شتلة');
    }, [expenseCategories]);

    const handleSaveExpense = async (expenseData: Omit<Expense, 'id' | 'user_id' | 'created_at'> | Expense) => {
        const isEditing = 'id' in expenseData && !!expenseData.id;

        try {
            if (isEditing) {
                await updateExpense(expenseData);
            } else {
                await addExpense(expenseData);
            }
            showToast(isEditing ? 'تم تحديث المصروف.' : 'تم إضافة المصروف.');
            setEditingExpenseId(null);
            setFormModalOpen(false);
        } catch (_e) {
            showToast('حدث خطأ أثناء الحفظ.', 'error');
            throw _e;
        }
    };

    const handleDeleteRequest = (expenseId: string) => {
        setExpenseToDelete(expenseId);
        setDeleteModalOpen(true);
    };

    const confirmDeleteExpense = async () => {
        if (!expenseToDelete) return;
        const id = expenseToDelete;
        setIsDeleting(true);

        try {
            await deleteExpense(id);
            showToast('تم حذف المصروف بنجاح.');
            setDeleteModalOpen(false);
            setExpenseToDelete(null);
        } catch (_e) {
            showToast('فشل الحذف.', 'error');
        } finally {
            setIsDeleting(false);
        }
    };

    const handleStartEdit = (expenseId: string) => {
        setEditingExpenseId(expenseId);
        setFormModalOpen(true);
    };

    const handleViewSupplierDetails = () => {
        window.history.pushState({ ...window.history.state, expenseView: 'supplier_details' }, '', window.location.href);
        setView('supplier_details');
    };

    const handleViewCategoryDetails = (categoryId: string) => {
        window.history.pushState({ ...window.history.state, expenseView: 'category_details', catId: categoryId }, '', window.location.href);
        setSelectedCategoryId(categoryId);
        setView('category_details');
    };

    const handleBackToList = useCallback(() => {
        window.history.back();
    }, []);

    useEffect(() => {
        const handlePopState = (event: PopStateEvent) => {
            const state = event.state;
            if (!state?.expenseView) {
                setView('list');
                setSelectedCategoryId(null);
            } else {
                setView(state.expenseView);
                if (state.catId) setSelectedCategoryId(state.catId);
            }
        };
        window.addEventListener('popstate', handlePopState);
        return () => window.removeEventListener('popstate', handlePopState);
    }, []);

    return (
        <>
            <Modal
                isOpen={isDeleteModalOpen}
                onClose={() => setDeleteModalOpen(false)}
                title="تأكيد الحذف"
            >
                <p className="text-neutral-500 dark:text-neutral-400">
                    هل أنت متأكد من رغبتك في حذف هذا المصروف؟
                </p>
                <div className="mt-6 flex justify-start gap-4 flex-row-reverse">
                    <button 
                        onClick={confirmDeleteExpense} 
                        disabled={isDeleting}
                        className="rounded-lg bg-accent-danger px-4 py-2 text-white font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isDeleting ? 'جاري الحذف...' : 'حذف'}
                    </button>
                    <button 
                        onClick={() => setDeleteModalOpen(false)} 
                        disabled={isDeleting}
                        className="rounded-lg bg-neutral-100 dark:bg-neutral-800 px-4 py-2 font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        إلغاء
                    </button>
                </div>
            </Modal>
            
            {!isViewer && (
                <Modal isOpen={isFormModalOpen} onClose={() => setFormModalOpen(false)} title={editingExpense ? 'تعديل المصروف' : 'إضافة مصروف جديد'} size="lg">
                    <AddExpenseForm onSave={handleSaveExpense} onCancel={() => setFormModalOpen(false)} initialData={editingExpense} />
                </Modal>
            )}

            {view === 'supplier_details' ? (
                <SupplierExpensesDetails 
                    expenses={validExpenses.filter(e => e.supplier_id && !isSeedCategory(e.category_id))}
                    onBack={handleBackToList}
                    onEdit={isViewer ? undefined : handleStartEdit}
                    onDelete={isViewer ? undefined : handleDeleteRequest}
                    expenseCategories={expenseCategories}
                    suppliers={suppliers}
                />
            ) : view === 'category_details' && selectedCategoryId ? (
                <CategoryExpensesDetails
                    categoryId={selectedCategoryId}
                    expenses={validExpenses.filter(e => e.category_id === selectedCategoryId)}
                    onBack={handleBackToList}
                    onEdit={isViewer ? undefined : handleStartEdit}
                    onDelete={isViewer ? undefined : handleDeleteRequest}
                    expenseCategories={expenseCategories}
                    suppliers={suppliers}
                />
            ) : (
                <ExpensesList 
                    expenses={validExpenses} 
                    onAddNew={isViewer ? () => {} : () => { setEditingExpenseId(null); setFormModalOpen(true); }}
                    onDelete={isViewer ? () => {} : handleDeleteRequest}
                    onEdit={isViewer ? () => {} : handleStartEdit}
                    lastAddedId={lastExpenseAddedId}
                    onAnimationEnd={() => setLastExpenseAddedId(null)}
                    expenseCategories={expenseCategories}
                    suppliers={suppliers}
                    onViewSupplierDetails={handleViewSupplierDetails}
                    onViewCategoryDetails={handleViewCategoryDetails}
                />
            )}
        </>
    );
};

export default ExpenseManager;
