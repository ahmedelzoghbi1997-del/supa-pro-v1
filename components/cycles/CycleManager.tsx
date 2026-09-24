
import React, { useState, useCallback, useEffect, useMemo } from 'react';
import type { Cycle } from '../../types';
import CyclesList from './CyclesList';
import AddCycleForm from './AddCycleForm';
import CycleReport from './CycleReport';
import Modal from '../shared/Modal';
import { useData } from '../../contexts/DataContext';
import { useToast } from '../../hooks/useToast';
import { useSettings, terminology } from '../../contexts/SettingsContext';
import { triggerSaveHaptic } from '../../lib/haptics';

const CycleManager: React.FC = () => {
    const [view, setView] = useState<'list' | 'report'>('list');
    const [selectedCycleId, setSelectedCycleId] = useState<string | null>(null);

    const [isFormModalOpen, setFormModalOpen] = useState(false);
    const [editingCycleId, setEditingCycleId] = useState<string | null>(null);
    const [isDeleteModalOpen, setDeleteModalOpen] = useState(false);
    const [cycleToDelete, setCycleToDelete] = useState<string | null>(null);
    const [isCloseConfirmModalOpen, setCloseConfirmModalOpen] = useState(false);
    const [cycleToClose, setCycleToClose] = useState<Cycle | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [shouldTransferOnClose, setShouldTransferOnClose] = useState(true);
    
    const { showToast } = useToast();
    const { cyclesWithCalculations, addCycle, updateCycle, deleteCycle, lastCycleAddedId, setLastCycleAddedId, getCycleTotalBalance } = useData();

    const otherActiveCycle = useMemo(() => {
        if (!cycleToClose) return null;
        return cyclesWithCalculations.find(c => c.status === 'active' && c.id !== cycleToClose.id) || null;
    }, [cycleToClose, cyclesWithCalculations]);

    const transferBalanceValue = useMemo(() => {
        if (!cycleToClose || !getCycleTotalBalance) return 0;
        return getCycleTotalBalance(cycleToClose.id);
    }, [cycleToClose, getCycleTotalBalance]);

    const editingCycle = useMemo(() => {
        if (!editingCycleId) return null;
        return cyclesWithCalculations.find(c => c.id === editingCycleId) || null;
    }, [editingCycleId, cyclesWithCalculations]);
    const { settings } = useSettings();
    const term = terminology[settings.primaryTerm];

    const handleSaveCycle = async (
        cycleData: Omit<Cycle, 'id' | 'revenue' | 'expenses' | 'profit' | 'health'> | Cycle,
        transferBalance?: boolean,
        customTransferAmount?: number
    ) => {
        const isEditing = 'id' in cycleData && cycleData.id;

        try {
            if (isEditing) {
                await updateCycle(cycleData as Cycle, transferBalance);
            } else {
                await addCycle(cycleData as Omit<Cycle, 'id' | 'revenue' | 'expenses' | 'profit' | 'health'>, transferBalance, customTransferAmount);
            }
            triggerSaveHaptic();
            showToast(isEditing ? `تم تحديث ${term.singular}.` : `تم إضافة ${term.singular}.`);
            setEditingCycleId(null);
            setFormModalOpen(false);
        } catch (_e) {
            showToast('حدث خطأ أثناء الحفظ.', 'error');
            throw _e;
        }
    };

    const handleDeleteRequest = (cycleId: string) => {
        setCycleToDelete(cycleId);
        setDeleteModalOpen(true);
    };

    const confirmDeleteCycle = async () => {
        if (!cycleToDelete) return;
        const id = cycleToDelete;
        setIsDeleting(true);

        try {
            const success = await deleteCycle(id);
            if (success) {
                showToast(`تم حذف ${term.singular} بنجاح.`);
                setDeleteModalOpen(false);
                setCycleToDelete(null);
                if (selectedCycleId === id) {
                    setView('list');
                    setSelectedCycleId(null);
                }
            }
        } catch (_e) {
            showToast('فشل الحذف.', 'error');
        } finally {
            setIsDeleting(false);
        }
    };
    
    const handleToggleCycleStatusRequest = (cycle: Cycle) => {
        if (cycle.status === 'active') {
            setCycleToClose(cycle);
            setCloseConfirmModalOpen(true);
        } else if (cycle.status === 'closed') {
            showToast(`جاري إعادة فتح ${term.singular}...`);
            updateCycle({ ...cycle, status: 'active' });
        }
    };

    const confirmCloseCycle = async () => {
        if (!cycleToClose) return;
        const cycle = cycleToClose;

        setCloseConfirmModalOpen(false);
        setCycleToClose(null);
        showToast(`تم إغلاق ${term.singular} بنجاح.`);

        try {
            await updateCycle({ ...cycle, status: 'closed' }, !!otherActiveCycle && shouldTransferOnClose);
        } catch (_e) {
            showToast('فشل تحديث الحالة.', 'error');
        }
    };

    const handleStartAddNew = () => {
        setEditingCycleId(null);
        setFormModalOpen(true);
    };

    const handleStartEdit = (cycleId: string) => {
        setEditingCycleId(cycleId);
        setFormModalOpen(true);
    };
    
    const handleCancelForm = () => {
        setFormModalOpen(false);
        setEditingCycleId(null);
    };

    const handleViewReport = (cycleId: string) => {
        window.history.pushState({ ...window.history.state, cycleReport: cycleId }, '', window.location.href);
        setSelectedCycleId(cycleId);
        setView('report');
    };

    const handleBackToList = useCallback(() => {
        setView('list');
        setSelectedCycleId(null);
        window.history.back();
    }, []);

    useEffect(() => {
        const handlePopState = (event: PopStateEvent) => {
            if (view === 'report' && !event.state?.cycleReport) {
                setView('list');
                setSelectedCycleId(null);
            }
        };
        window.addEventListener('popstate', handlePopState);
        return () => window.removeEventListener('popstate', handlePopState);
    }, [view]);

    const selectedCycle = cyclesWithCalculations.find(c => c.id === selectedCycleId);

    const renderContent = () => {
        if (view === 'report' && selectedCycle) {
            return <CycleReport cycle={selectedCycle} onBack={handleBackToList} />;
        }

        return (
            <CyclesList 
                cycles={cyclesWithCalculations} 
                onAddNew={handleStartAddNew} 
                onDelete={handleDeleteRequest}
                onEdit={handleStartEdit}
                onViewReport={handleViewReport}
                onToggleStatus={handleToggleCycleStatusRequest}
                lastAddedId={lastCycleAddedId}
                onAnimationEnd={() => setLastCycleAddedId(null)}
            />
        );
    };

    return (
        <>
            <Modal
                isOpen={isDeleteModalOpen}
                onClose={() => setDeleteModalOpen(false)}
                title={`تأكيد الحذف`}
            >
                <p className="text-neutral-500 dark:text-neutral-400">
                    هل أنت متأكد من رغبتك في حذف هذا {term.singular}؟ سيتم حذف جميع المعاملات المرتبطة به.
                </p>
                <div className="mt-6 flex justify-start gap-4 flex-row-reverse">
                    <button
                        onClick={confirmDeleteCycle}
                        disabled={isDeleting}
                        className="rounded-lg bg-accent-danger px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isDeleting ? 'جاري الحذف...' : 'حذف'}
                    </button>
                    <button
                        onClick={() => setDeleteModalOpen(false)}
                        disabled={isDeleting}
                        className="rounded-lg bg-neutral-100 dark:bg-neutral-800 px-4 py-2 text-sm font-semibold text-neutral-800 dark:text-neutral-100 shadow-sm hover:bg-neutral-200 dark:hover:bg-neutral-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        إلغاء
                    </button>
                </div>
            </Modal>
            <Modal
                isOpen={isCloseConfirmModalOpen}
                onClose={() => setCloseConfirmModalOpen(false)}
                title={`تأكيد إغلاق ${term.singular}`}
            >
                <p className="text-neutral-500 dark:text-neutral-400">
                    سيؤدي إغلاق {term.singular} إلى أرشفتها وإزالتها من لوحة التحكم الرئيسية والتقارير النشطة. هل أنت متأكد؟
                </p>
                {otherActiveCycle && transferBalanceValue > 0 && (
                    <div className="p-4 rounded-xl border border-primary/25 bg-primary/5 dark:bg-primary/10 flex items-start gap-3 mt-4 text-slate-800 dark:text-neutral-100">
                        <input 
                            id="shouldTransferOnClose" 
                            name="shouldTransferOnClose" 
                            type="checkbox" 
                            checked={shouldTransferOnClose}
                            onChange={(e) => setShouldTransferOnClose(e.target.checked)}
                            className="w-5 h-5 rounded text-primary focus:ring-primary border-gray-300 dark:border-gray-700 mt-1 cursor-pointer accent-primary" 
                        />
                        <div className="flex-grow select-none cursor-pointer" onClick={() => setShouldTransferOnClose(!shouldTransferOnClose)}>
                            <label className="block text-sm font-bold text-neutral-800 dark:text-neutral-100 text-right cursor-pointer">
                                نقل رصيد الخزنة المتبقي إلى العروة الحالية
                            </label>
                            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 text-right leading-relaxed">
                                تم العثور على رصيد متبقي بقيمة <span className="font-extrabold text-primary font-mono">{transferBalanceValue.toLocaleString('en-US')} ج.م</span>. عند الإغلاق، سيتم نقل هذا الرصيد تلقائياً كـ رصيد منقول إلى العروة النشطة الحالية (<span className="font-bold text-primary">{otherActiveCycle.name}</span>).
                            </p>
                        </div>
                    </div>
                )}
                <div className="mt-6 flex justify-start gap-4 flex-row-reverse">
                    <button
                        onClick={confirmCloseCycle}
                        className="rounded-lg bg-accent-warning px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-amber-500"
                    >
                        نعم، قم بالإغلاق
                    </button>
                    <button
                        onClick={() => setCloseConfirmModalOpen(false)}
                        className="rounded-lg bg-neutral-100 dark:bg-neutral-800 px-4 py-2 text-sm font-semibold text-neutral-800 dark:text-neutral-100 shadow-sm hover:bg-neutral-200 dark:hover:bg-neutral-700"
                    >
                        إلغاء
                    </button>
                </div>
            </Modal>
            <Modal
                isOpen={isFormModalOpen}
                onClose={handleCancelForm}
                title={editingCycle ? `تعديل بيانات ${term.singular}` : `إضافة ${term.new}`}
                size="lg"
            >
                <AddCycleForm 
                    onSave={handleSaveCycle} 
                    onCancel={handleCancelForm} 
                    initialData={editingCycle}
                />
            </Modal>
            
            <div key={view} className="animate-page-enter">
                {renderContent()}
            </div>
        </>
    );
};

export default CycleManager;
