
import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import type { Supplier, SupplierPayment, Expense } from '../../types';
import AddSupplierForm from './AddSupplierForm';
import AddPaymentForm from './AddPaymentForm';
import AddDiscountForm from './AddDiscountForm';
import { PlusIcon, TrashIcon, ClipboardDocumentIcon, UserIcon, PencilIcon, LucideTag } from '../Icons';
import Modal from '../shared/Modal';
import { formatNumber } from '../../utils/helpers';
import { useData } from '../../contexts/DataContext';
import { useUI } from '../../contexts/UIContext';
import { useToast } from '../../hooks/useToast';
import { triggerSaveHaptic } from '../../lib/haptics';
import SupplierStatement from './SupplierStatement';
import EmptyState from '../shared/EmptyState';
import { EmptySuppliersIllustration } from '../Illustrations';

import ExtendedFAB from '../shared/ExtendedFAB';

interface SupplierCardProps {
  supplier: Supplier;
  expenses: Expense[];
  payments: SupplierPayment[];
  onDelete: (id: string) => void;
  onEdit: (supplier: Supplier) => void;
  onViewStatement: (id: string) => void;
  onAddPayment: (id: string) => void;
  onAddDiscount: (id: string) => void;
  isNew?: boolean;
  onAnimationEnd?: () => void;
  index: number;
  isHighlighted?: boolean;
}

const StatMini = ({ label, value, type }: { label: string; value: number; type: 'income' | 'expense' }) => (
    <div className="flex flex-col gap-0.5">
        <span className="text-[8px] font-black text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">{label}</span>
        <div className="flex items-baseline gap-1">
            <span className={`text-sm font-black tabular-nums ${type === 'income' ? 'text-emerald-600 dark:text-emerald-500' : 'text-rose-600 dark:text-rose-500'}`}>
                {formatNumber(value)}
            </span>
            <span className="text-[8px] font-bold opacity-40">ج.م</span>
        </div>
    </div>
);

const SupplierCard: React.FC<SupplierCardProps> = ({ supplier, expenses, payments, onDelete, onEdit, onViewStatement, onAddPayment, onAddDiscount, isNew, onAnimationEnd, index, isHighlighted }) => {
  const { showToast } = useToast();


  
  const supplierExpenses = useMemo(() => expenses.filter(e => e.supplier_id === supplier.id), [expenses, supplier.id]);
  const supplierPayments = useMemo(() => payments.filter(p => p.supplier_id === supplier.id), [payments, supplier.id]);
  
  const totalCreditInvoices = useMemo(() => supplierExpenses
    .filter(e => e.payment_method === 'credit')
    .reduce((sum, e) => sum + (e.amount || 0), 0), [supplierExpenses]);

  const totalPaid = useMemo(() => supplierPayments
    .reduce((sum, p) => sum + (p.amount || 0), 0), [supplierPayments]);
  
  const totalDuesHistory = (supplier.opening_balance || 0) + totalCreditInvoices;
  const balance = totalDuesHistory - totalPaid;

  const globalExpensesCount = useMemo(() => expenses.filter(e => e.supplier_id === supplier.id).length, [expenses, supplier.id]);
  const globalPaymentsCount = useMemo(() => payments.filter(p => p.supplier_id === supplier.id).length, [payments, supplier.id]);
  const canDelete = globalExpensesCount === 0 && globalPaymentsCount === 0 && (!supplier.opening_balance || supplier.opening_balance === 0);

  // Settlement percent
  const settlementPercentage = totalDuesHistory > 0 
    ? Math.min(Math.round((totalPaid / totalDuesHistory) * 100), 100)
    : (balance <= 0 && totalPaid > 0 ? 100 : 0);

  const totalTransactionsCount = supplierExpenses.length + supplierPayments.length;

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
  
  const animationClass = isHighlighted ? 'animate-highlight' : (isNew ? 'animate-enter' : 'animate-stagger-in');

  // Gradient avatars matching first character
  const avatarGradients = [
    'from-emerald-500 to-teal-600 text-emerald-50',
    'from-indigo-500 to-violet-600 text-indigo-50',
    'from-amber-500 to-orange-600 text-amber-50',
    'from-rose-500 to-pink-600 text-rose-550',
    'from-cyan-500 to-blue-600 text-cyan-50',
    'from-fuchsia-500 to-purple-600 text-fuchsia-50',
  ];
  const avatarClass = avatarGradients[index % avatarGradients.length];

  return (
    <div 
        ref={cardRef}
        className={`group relative bg-white dark:bg-neutral-900 rounded-[2rem] p-5 shadow-soft border border-neutral-200 dark:border-neutral-800/80 hover:border-primary/40 hover:shadow-lg transition-all duration-300 flex flex-col gap-4 ${animationClass}`}
        style={{ animationDelay: isNew || isHighlighted ? '0ms' : `${index * 40}ms` }}
    >
      {/* Upper Section: Profile & Delete */}
      <div className="flex justify-between items-start">
          <div className="flex items-center gap-3 min-w-0">
              <div className={`w-11 h-11 rounded-2xl bg-gradient-to-br ${avatarClass} flex items-center justify-center font-black text-base border-2 border-white dark:border-neutral-900 shadow-md`}>
                  <span>{supplier.name.charAt(0)}</span>
              </div>
              <div className="min-w-0">
                  <h3 className="text-sm font-black text-neutral-800 dark:text-white truncate leading-tight group-hover:text-primary transition-colors">{supplier.name}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[8px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-widest">مورد #{supplier.id.substring(0, 4)}</span>
                    <span className="w-1 h-1 rounded-full bg-neutral-300 dark:bg-neutral-600"></span>
                    <span className="text-[9px] font-black text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-1.5 py-0.5 rounded-md">{totalTransactionsCount} {totalTransactionsCount === 1 ? 'معاملة' : 'معاملات'}</span>
                  </div>
              </div>
          </div>
          <div className="flex items-center gap-1 -mt-1">
              {onEdit && (
              <button 
                  onClick={() => onEdit(supplier)} 
                  className="p-1.5 transition-all rounded-xl text-neutral-400 hover:text-primary hover:bg-neutral-100 dark:hover:bg-neutral-800"
                  title="تعديل بيانات المورد"
              >
                  <PencilIcon className="w-4 h-4" />
              </button>
              )}
              {onDelete && (
              <button 
                  onClick={() => canDelete ? onDelete(supplier.id) : showToast('المورد مرتبط بمعاملات نشطة', 'error')} 
                  className={`p-1.5 transition-all rounded-xl ${!canDelete ? 'opacity-20 cursor-not-allowed' : 'text-neutral-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20'}`}
                  title={canDelete ? "حذف المورد" : "لا يمكن حذف مورد مسجل عليه حركات"}
              >
                  <TrashIcon className="w-4 h-4" />
              </button>
              )}
          </div>
      </div>

      {/* Main Feature: Net Balance Row (Gradient-styled based on status) */}
      <div className={`relative overflow-hidden px-4.5 py-3.5 rounded-2xl border transition-all duration-300 ${balance > 0 ? 'bg-gradient-to-l from-rose-600 to-rose-700 dark:from-rose-950/40 dark:to-rose-900/40 border-rose-500/20 text-rose-50 dark:text-rose-100 shadow-md shadow-rose-200/5' : 'bg-gradient-to-l from-emerald-600 to-teal-600 dark:from-emerald-950/30 dark:to-teal-900/30 border-emerald-500/20 text-emerald-50 dark:text-emerald-100 shadow-sm'}`}>
          <div className="relative z-10 flex justify-between items-center">
              <div className="flex flex-col">
                <span className="text-[7px] font-black uppercase tracking-[0.2em] opacity-80 mb-1">الرصيد المتبقي للمورد</span>
                <div className="flex items-baseline gap-1.5">
                    <span className="text-xl font-extrabold tabular-nums tracking-tighter">
                        {formatNumber(balance)}
                    </span>
                    <span className="text-[10px] font-bold opacity-75">ج.م</span>
                </div>
              </div>
              <div className="flex flex-col items-end gap-1">
                <div className="p-1.5 bg-white/10 dark:bg-black/20 backdrop-blur-md rounded-xl border border-white/10 dark:border-white/5 shadow-inner">
                  <UserIcon className="w-4 h-4" />
                </div>
                <span className="text-[8px] font-extrabold px-1.5 py-0.5 rounded-md bg-white/15 dark:bg-black/30">
                  {balance > 0 ? 'مستحق السداد' : 'خالص الحساب ✓'}
                </span>
              </div>
          </div>
          <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full blur-2xl pointer-events-none"></div>
      </div>

      {/* Settlement Ratio Horizontal Progress Bar */}
      {totalDuesHistory > 0 && (
          <div className="flex flex-col gap-1.5 px-1">
              <div className="flex justify-between items-center text-[9px] font-black">
                  <span className="text-neutral-400">نسبة سداد الحساب</span>
                  <span className="text-primary tracking-tight tabular-nums">{settlementPercentage}%</span>
              </div>
              <div className="w-full h-1.5 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
                  <div 
                      className="h-full bg-gradient-to-r from-teal-500 to-primary rounded-full transition-all duration-500"
                      style={{ width: `${settlementPercentage}%` }}
                  />
              </div>
          </div>
      )}

      {/* Stats Section (Horizontal) */}
      <div className="flex items-center justify-between px-3 py-2.5 bg-neutral-50 dark:bg-neutral-800/40 rounded-2xl border border-neutral-100 dark:border-neutral-800/80 shadow-xs">
          <StatMini label="إجمالي المشتريات" value={totalCreditInvoices} type="expense" />
          <div className="w-px h-8 bg-neutral-200 dark:bg-neutral-700/60"></div>
          <StatMini label="إجمالي المدفوع" value={totalPaid} type="income" />
      </div>

      {/* Action Buttons (Slim Style) */}
      <div className="flex flex-col gap-2 mt-1 w-full">
          <div className="flex items-center gap-2 w-full">
              <button 
                  onClick={() => onViewStatement(supplier.id)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 px-1.5 bg-white hover:bg-neutral-50 dark:bg-neutral-800 dark:hover:bg-neutral-750 text-neutral-600 dark:text-neutral-300 rounded-xl font-extrabold text-[10px] transition-all border border-neutral-200 dark:border-neutral-750/70"
              >
                  <ClipboardDocumentIcon className="w-3.5 h-3.5 opacity-50" />
                  <span>كشف الحساب</span>
              </button>
              {onAddPayment && (
                  <button 
                      onClick={() => onAddPayment(supplier.id)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 px-1.5 bg-primary hover:bg-primary/95 text-white rounded-xl font-extrabold text-[10px] transition-all shadow-sm shadow-primary/10 active:scale-95"
                  >
                      <PlusIcon className="w-3.5 h-3.5" />
                      <span>تسجيل دفع</span>
                  </button>
              )}
          </div>
          {onAddDiscount && (
              <button 
                  onClick={() => onAddDiscount(supplier.id)}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-3 bg-violet-50/70 hover:bg-violet-100 dark:bg-violet-950/30 dark:hover:bg-violet-900/40 text-violet-600 dark:text-violet-450 rounded-xl font-black text-xs transition-all border border-violet-150 dark:border-violet-900/30 active:scale-95 duration-200"
              >
                  <LucideTag className="w-3.5 h-3.5" />
                  <span>خصم</span>
              </button>
          )}
      </div>
    </div>
  );
};


const SuppliersListView: React.FC<{
  onAddSupplier: () => void;
  onEditSupplier: (supplier: Supplier) => void;
  onAddPaymentForSupplier: (id: string) => void;
  onAddDiscountForSupplier: (id: string) => void;
  onViewStatement: (id: string) => void;
  onDeleteRequest: (id: string) => void;
}> = ({ onAddSupplier, onEditSupplier, onAddPaymentForSupplier, onAddDiscountForSupplier, onViewStatement, onDeleteRequest }) => {
    const { suppliers, rawExpenses: expenses, supplierPayments, lastSupplierAddedId, setLastSupplierAddedId, profile, highlightedItemId } = useData();

    const sortedSuppliers = useMemo(() => 
        suppliers
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
    [suppliers]);

    const isViewer = profile?.role === 'viewer';

  return (
    <div className="space-y-8 pb-24">
       <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 px-2">
        <div className="max-w-md">
          <h2 className="text-2xl font-black text-neutral-900 dark:text-white tracking-tight">حسابات الموردين</h2>
          <p className="text-neutral-500 dark:text-neutral-400 mt-1 text-xs font-medium">إدارة ومتابعة فواتير الموردين الآجلة والمدفوعات النقدية.</p>
        </div>
       </div>

      <div>
        {sortedSuppliers.length === 0 ? (
          <EmptyState
            icon={EmptySuppliersIllustration}
            title="قائمة الموردين فارغة"
            message="ابدأ بإضافة مورد جديد لتتبع فواتيره الآجلة ومدفوعاته."
          />
        ) : (
           <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {sortedSuppliers.map((supplier, index) => {
              const isSelectedForHighlight = highlightedItemId === supplier.id || highlightedItemId === (supplier as any)._stable_id;
              return (
                  <SupplierCard 
                    key={supplier.id}
                    supplier={supplier}
                    expenses={expenses}
                    payments={supplierPayments}
                    onDelete={isViewer ? undefined as any : onDeleteRequest}
                    onEdit={isViewer ? undefined as any : onEditSupplier}
                    onViewStatement={onViewStatement}
                    onAddPayment={isViewer ? undefined as any : onAddPaymentForSupplier}
                    onAddDiscount={isViewer ? undefined as any : onAddDiscountForSupplier}
                    isNew={supplier.id === lastSupplierAddedId}
                    onAnimationEnd={() => setLastSupplierAddedId(null)}
                    index={index}
                    isHighlighted={isSelectedForHighlight}
                  />
              );
            })}
          </div>
        )}
      </div>

      {!isViewer && <ExtendedFAB onClick={onAddSupplier} label="مورد" />}
    </div>
  );
};


const SupplierManager: React.FC = () => {
    const { suppliers, addSupplier, updateSupplier, deleteSupplier, addSupplierPayment, updateSupplierPayment, deleteSupplierPayment, cycles, profile, supplierPayments, addExpense, updateExpense, rawExpenses, deleteExpense } = useData();
    const { statementAction, setStatementAction } = useUI();
    const { showToast } = useToast();
    const isViewer = profile?.role === 'viewer';

    const [isSupplierModalOpen, setSupplierModalOpen] = useState(false);
    const [isPaymentModalOpen, setPaymentModalOpen] = useState(false);
    const [isDiscountModalOpen, setDiscountModalOpen] = useState(false);
    const [isStatementModalOpen, setStatementModalOpen] = useState(false);
    const [selectedSupplierId, setSelectedSupplierId] = useState<string | null>(null);
    const [editingPaymentId, setEditingPaymentId] = useState<string | null>(null);
    const [editingDiscountId, setEditingDiscountId] = useState<string | null>(null);
    const [editingSupplierId, setEditingSupplierId] = useState<string | null>(null);
    const [addingPaymentForSupplierId, setAddingPaymentForSupplierId] = useState<string | null>(null);
    const [addingDiscountForSupplierId, setAddingDiscountForSupplierId] = useState<string | null>(null);
    const [paymentToDelete, setPaymentToDelete] = useState<string | null>(null);
    const [supplierToDelete, setSupplierToDelete] = useState<string | null>(null);
    const [discountToDelete, setDiscountToDelete] = useState<string | null>(null);
    const [isDeletingSupplier, setIsDeletingSupplier] = useState(false);
    const [isDeletingPayment, setIsDeletingPayment] = useState(false);
    const [isDeletingDiscount, setIsDeletingDiscount] = useState(false);

    const handleAddDiscountForSupplier = (supplierId: string) => {
        setEditingDiscountId(null);
        setAddingDiscountForSupplierId(supplierId);
        setDiscountModalOpen(true);
    };

    const handleStartEditDiscount = (expenseId: string) => {
        setEditingDiscountId(expenseId);
        setAddingDiscountForSupplierId(null);
        setStatementModalOpen(false);
        setTimeout(() => {
            setDiscountModalOpen(true);
        }, 150);
    };

    const handleDeleteDiscountRequest = (expenseId: string) => {
        setDiscountToDelete(expenseId);
    };

    const confirmDeleteDiscount = async () => {
        if (discountToDelete) {
            setIsDeletingDiscount(true);
            try {
                await deleteExpense(discountToDelete);
                showToast('تم حذف الخصم المكتسب وتحديث الدورة المحاسبية والأرباح بنجاح.');
                setDiscountToDelete(null);
            } catch (error: any) {
                console.error(error);
                showToast(error.message || 'حدث خطأ أثناء حذف الخصم.', 'error');
            } finally {
                setIsDeletingDiscount(false);
            }
        }
    };

    const handleSaveDiscount = async (discountData: Omit<Expense, 'id' | 'user_id' | 'created_at'>) => {
        try {
            if (editingDiscountId) {
                await updateExpense({ ...discountData, id: editingDiscountId } as Expense);
                showToast('تم تحديث الخصم بنجاح.');
            } else {
                await addExpense(discountData);
                showToast('تم تسجيل الخصم وتحديث المصروفات والأرباح بنجاح.');
            }
            setDiscountModalOpen(false);
            setAddingDiscountForSupplierId(null);
            setEditingDiscountId(null);
        } catch (error: any) {
            console.error(error);
            showToast(error.message || 'حدث خطأ أثناء حفظ الخصم.', 'error');
            throw error;
        }
    };

    const editingDiscount = useMemo(() => {
        if (editingDiscountId) {
            return rawExpenses.find(e => e.id === editingDiscountId) || null;
        }
        return null;
    }, [editingDiscountId, rawExpenses]);

    const editingSupplier = useMemo(() => {
        return suppliers.find(s => s.id === editingSupplierId) || null;
    }, [editingSupplierId, suppliers]);

    const editingPayment = useMemo(() => {
        if (editingPaymentId) {
            return supplierPayments.find(p => p.id === editingPaymentId) || null;
        } else if (addingPaymentForSupplierId) {
            return { supplier_id: addingPaymentForSupplierId } as unknown as SupplierPayment;
        }
        return null;
    }, [editingPaymentId, addingPaymentForSupplierId, supplierPayments]);

    useEffect(() => {
        if (statementAction?.route === 'suppliers' && statementAction.parentId) {
            setSelectedSupplierId(statementAction.parentId);
            setStatementModalOpen(true);
            setStatementAction(null);
        }
    }, [statementAction, setStatementAction]);

    const handleSaveSupplier = async (name: string, openingBalance?: number) => {
        try {
            if (editingSupplierId) {
                await updateSupplier({ ...editingSupplier!, name, opening_balance: openingBalance });
                triggerSaveHaptic();
                showToast('تم تحديث المورد بنجاح.');
            } else {
                await addSupplier(name, openingBalance);
                triggerSaveHaptic();
                showToast('تم إضافة المورد بنجاح.');
            }
            setSupplierModalOpen(false);
            setEditingSupplierId(null);
        } catch (error: any) {
            showToast(error.message || 'حدث خطأ أثناء حفظ المورد.', 'error');
            throw error;
        }
    };

    const handleDeleteRequest = (id: string) => {
        setSupplierToDelete(id);
    };

    const confirmDeleteSupplier = async () => {
        if (supplierToDelete) {
            setIsDeletingSupplier(true);
            try {
                const success = await deleteSupplier(supplierToDelete);
                if (success) {
                    showToast('تم حذف المورد بنجاح.', 'success');
                    setSupplierToDelete(null);
                }
            } catch (e: any) {
                showToast(e.message || 'فشل حذف المورد.', 'error');
            } finally {
                setIsDeletingSupplier(false);
            }
        }
    };

    const handleSavePayment = async (payment: Omit<SupplierPayment, 'id' | 'user_id' | 'created_at'> | SupplierPayment) => {
        try {
            if ('id' in payment && payment.id) {
                await updateSupplierPayment(payment as SupplierPayment);
                triggerSaveHaptic();
                showToast('تم تحديث الدفعة بنجاح.');
            } else {
                await addSupplierPayment(payment);
                triggerSaveHaptic();
                showToast('تم إضافة الدفعة بنجاح.');
            }
            setPaymentModalOpen(false);
            setEditingPaymentId(null);
            setAddingPaymentForSupplierId(null);
        } catch (error: any) {
            console.error(error);
            showToast(error.message || 'حدث خطأ أثناء حفظ الدفعة.', 'error');
            throw error;
        }
    };
    
    const handleViewStatement = (supplierId: string) => {
        setSelectedSupplierId(supplierId);
        setStatementModalOpen(true);
    };

    const closeStatement = useCallback(() => {
        setStatementModalOpen(false);
        setSelectedSupplierId(null);
    }, []);
    
    const handleAddPaymentForSupplier = (supplierId: string) => {
        setEditingPaymentId(null);
        setAddingPaymentForSupplierId(supplierId);
        setPaymentModalOpen(true);
    };

    const handleStartEditPayment = (payment: SupplierPayment) => {
        setEditingPaymentId(payment.id);
        setAddingPaymentForSupplierId(null);
        setStatementModalOpen(false);
        setTimeout(() => {
            setPaymentModalOpen(true);
        }, 150);
    };

    const handleDeletePaymentRequest = (id: string) => {
        setPaymentToDelete(id);
    };
    
    const confirmDeletePayment = async () => {
        if (paymentToDelete) {
            setIsDeletingPayment(true);
            try {
                await deleteSupplierPayment(paymentToDelete);
                showToast('تم حذف الدفعة بنجاح.');
                setPaymentToDelete(null);
            } catch (e: any) {
                showToast(e.message || 'فشل حذف الدفعة.', 'error');
            } finally {
                setIsDeletingPayment(false);
            }
        }
    };
    
    const handleCancelPaymentForm = () => {
        setPaymentModalOpen(false);
        setEditingPaymentId(null);
        setAddingPaymentForSupplierId(null);
        if (selectedSupplierId) {
             setTimeout(() => {
                setStatementModalOpen(true);
             }, 150);
        }
    }

    return (
        <>
            <Modal
                isOpen={!!supplierToDelete}
                onClose={() => setSupplierToDelete(null)}
                title="تأكيد حذف المورد"
            >
                <p className="text-neutral-500 dark:text-neutral-400">هل أنت متأكد من رغبتك في حذف هذا المورد؟ لا يمكن التراجع عن هذا الإجراء.</p>
                <div className="mt-6 flex justify-start gap-4 flex-row-reverse">
                    <button 
                        onClick={confirmDeleteSupplier} 
                        disabled={isDeletingSupplier}
                        className="rounded-lg bg-accent-danger px-4 py-2 text-white font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isDeletingSupplier ? 'جاري الحذف...' : 'حذف'}
                    </button>
                    <button 
                        onClick={() => setSupplierToDelete(null)} 
                        disabled={isDeletingSupplier}
                        className="rounded-lg bg-neutral-200 dark:bg-neutral-700 px-4 py-2 font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        إلغاء
                    </button>
                </div>
            </Modal>
            <Modal
                isOpen={isSupplierModalOpen}
                onClose={() => { setSupplierModalOpen(false); setEditingSupplierId(null); }}
                title={editingSupplier ? "تعديل مورد" : "إضافة مورد جديد"}
            >
                <AddSupplierForm 
                    onSave={handleSaveSupplier}
                    onCancel={() => { setSupplierModalOpen(false); setEditingSupplierId(null); }}
                    initialName={editingSupplier?.name}
                    initialOpeningBalance={editingSupplier?.opening_balance}
                />
            </Modal>
            
            <Modal
                isOpen={isPaymentModalOpen}
                onClose={handleCancelPaymentForm}
                title={editingPayment?.id ? 'تعديل دفعة' : 'إضافة دفعة مورد'}
                size="lg"
            >
                <AddPaymentForm
                    onSave={handleSavePayment}
                    onCancel={handleCancelPaymentForm}
                    suppliers={suppliers}
                    cycles={cycles}
                    initialData={editingPayment}
                />
            </Modal>
            
            <Modal
                isOpen={isDiscountModalOpen}
                onClose={() => { setDiscountModalOpen(false); setAddingDiscountForSupplierId(null); setEditingDiscountId(null); }}
                title={editingDiscount ? "تعديل خصم مورد" : "تسجيل خصم ممنوح من المورد"}
                size="lg"
            >
                {(addingDiscountForSupplierId || editingDiscountId) && (
                    <AddDiscountForm
                        onSave={handleSaveDiscount}
                        onCancel={() => { 
                            setDiscountModalOpen(false); 
                            setAddingDiscountForSupplierId(null); 
                            setEditingDiscountId(null);
                            if (selectedSupplierId) {
                                setTimeout(() => setStatementModalOpen(true), 150);
                            }
                        }}
                        supplierId={addingDiscountForSupplierId || editingDiscount?.supplier_id || ''}
                        suppliers={suppliers}
                        cycles={cycles}
                        initialData={editingDiscount}
                    />
                )}
            </Modal>
            
            <Modal
                isOpen={isStatementModalOpen}
                onClose={() => {
                    closeStatement();
                }}
                title={`كشف الحساب: ${suppliers.find(s => s.id === selectedSupplierId)?.name || ''}`}
                size="3xl"
            >
                {selectedSupplierId && (
                    <SupplierStatement 
                        supplierId={selectedSupplierId} 
                        onEdit={isViewer ? undefined as any : handleStartEditPayment}
                        onDelete={isViewer ? undefined as any : handleDeletePaymentRequest}
                        onEditDiscount={isViewer ? undefined as any : handleStartEditDiscount}
                        onDeleteDiscount={isViewer ? undefined as any : handleDeleteDiscountRequest}
                    />
                )}
            </Modal>
            
            <Modal
                isOpen={!!paymentToDelete}
                onClose={() => setPaymentToDelete(null)}
                title="تأكيد حذف الدفعة"
            >
                <p className="text-neutral-500 dark:text-neutral-400">هل أنت متأكد من رغبتك في حذف هذه الدفعة المالية؟</p>
                <div className="mt-6 flex justify-start gap-4 flex-row-reverse">
                    <button 
                        onClick={confirmDeletePayment} 
                        disabled={isDeletingPayment}
                        className="rounded-lg bg-accent-danger px-4 py-2 text-white font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isDeletingPayment ? 'جاري الحذف...' : 'حذف'}
                    </button>
                    <button 
                        onClick={() => setPaymentToDelete(null)} 
                        disabled={isDeletingPayment}
                        className="rounded-lg bg-neutral-200 dark:bg-neutral-700 px-4 py-2 font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        إلغاء
                    </button>
                </div>
            </Modal>

            <Modal
                isOpen={!!discountToDelete}
                onClose={() => setDiscountToDelete(null)}
                title="تأكيد حذف الخصم المكتسب"
            >
                <div className="text-right space-y-4 font-sans" dir="rtl">
                    <p className="text-sm font-semibold text-neutral-600 dark:text-neutral-400 leading-relaxed">
                        هل أنت متأكد من رغبتك في حذف هذا الخصم الممنوح من المورد؟
                    </p>
                    <div className="p-3.5 bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 rounded-2xl text-rose-750 dark:text-rose-300 text-xs leading-relaxed font-bold">
                        ⚠️ تنبيه مالي: حذف هذا الخصم سيؤدي إلى إعادة مديونية المورد لسابقتها (زيادة مطلوباتك)، وفي نفس الوقت سيقوم بزيادة مصروفات عروة الزراعة مما يخفض من صافي الأرباح تلقائياً.
                    </div>
                </div>
                <div className="mt-6 flex justify-start gap-4 flex-row-reverse">
                    <button 
                        onClick={confirmDeleteDiscount} 
                        disabled={isDeletingDiscount}
                        className="rounded-lg bg-accent-danger hover:bg-rose-650 px-5 py-2 text-white text-xs font-black disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 transition-all"
                    >
                        {isDeletingDiscount ? 'جاري الحذف...' : 'نعم، احذف الخصم'}
                    </button>
                    <button 
                        onClick={() => setDiscountToDelete(null)} 
                        disabled={isDeletingDiscount}
                        className="rounded-lg bg-neutral-200 dark:bg-neutral-800 text-neutral-800 dark:text-white px-5 py-2 text-xs font-bold disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 transition-all"
                    >
                        إلغاء
                    </button>
                </div>
            </Modal>


            <SuppliersListView 
                onAddSupplier={() => setSupplierModalOpen(true)} 
                onEditSupplier={(supplier) => { setEditingSupplierId(supplier.id); setSupplierModalOpen(true); }}
                onAddPaymentForSupplier={handleAddPaymentForSupplier}
                onAddDiscountForSupplier={handleAddDiscountForSupplier}
                onViewStatement={handleViewStatement}
                onDeleteRequest={handleDeleteRequest}
            />
        </>
    );
};

export default SupplierManager;
