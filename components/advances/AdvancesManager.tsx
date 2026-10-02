
import React, { useState, useEffect, useMemo } from 'react';
import type { Advance } from '../../types';
import PersonAdvancesListView from './PersonAdvancesListView';
import AddAdvanceForm from './AddAdvanceForm';
import ManagePersonsPopup from './ManagePersonsPopup';
import PersonStatement from './PersonStatement';
import Modal from '../shared/Modal';
import { useData } from '../../contexts/DataContext';
import { useUI } from '../../contexts/UIContext';
import { useToast } from '../../hooks/useToast';
import { triggerSaveHaptic } from '../../lib/haptics';

const AdvancesManager: React.FC = () => {
    const [isAdvanceModalOpen, setAdvanceModalOpen] = useState(false);
    const [isStatementModalOpen, setStatementModalOpen] = useState(false);
    const [isPersonsPopupOpen, setPersonsPopupOpen] = useState(false);
    const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);
    const [editingAdvanceId, setEditingAdvanceId] = useState<string | null>(null);
    const [isAddingNewAdvanceForPerson, setIsAddingNewAdvanceForPerson] = useState<string | null>(null);
    const [advanceToDelete, setAdvanceToDelete] = useState<string | null>(null);
    const [personToDelete, setPersonToDelete] = useState<string | null>(null);
    const [personToZero, setPersonToZero] = useState<{ id: string, balance: number } | null>(null);
    const [zeroConfirmText, setZeroConfirmText] = useState('');
    const [isDeletingAdvance, setIsDeletingAdvance] = useState(false);
    const [isDeletingPerson, setIsDeletingPerson] = useState(false);
    const [isSavingZeroBalance, setIsSavingZeroBalance] = useState(false);

    const { showToast } = useToast();
    const { 
        persons, activePersons, addPerson, deletePerson,
        addAdvance, updateAdvance, deleteAdvance,
        cycles, advances, settings
    } = useData();
    const { statementAction, setStatementAction } = useUI();

    const filteredActivePersons = useMemo(() => {
        return activePersons.filter(p => {
            const isPartner = settings?.person_partner_percentages?.[p.id] !== undefined && settings.person_partner_percentages[p.id] > 0;
            return !isPartner;
        });
    }, [activePersons, settings?.person_partner_percentages]);

    // Use memo to safely extract full advance object
    const editingAdvance = useMemo(() => {
        if (editingAdvanceId) {
            return advances.find(a => a.id === editingAdvanceId) || null;
        } else if (isAddingNewAdvanceForPerson) {
            return { person_id: isAddingNewAdvanceForPerson } as Partial<Advance> as Advance;
        }
        return null;
    }, [editingAdvanceId, isAddingNewAdvanceForPerson, advances]);

    useEffect(() => {
        if (statementAction?.route === 'advances' && statementAction.parentId) {
            setSelectedPersonId(statementAction.parentId);
            setStatementModalOpen(true);
            setStatementAction(null);
        }
    }, [statementAction, setStatementAction]);

    // Advance Handlers
    const handleSaveAdvance = async (advanceData: Omit<Advance, 'id' | 'user_id' | 'created_at'> | Advance) => {
        const isEditing = 'id' in advanceData && advanceData.id;

        try {
            if (isEditing) {
                await updateAdvance(advanceData as Advance);
                triggerSaveHaptic();
                showToast(isEditing ? 'تم تحديث السلفة.' : 'تم إضافة السلفة.');
            } else {
                await addAdvance(advanceData as Omit<Advance, 'id' | 'user_id' | 'created_at'>);
                triggerSaveHaptic();
                showToast(isEditing ? 'تم تحديث السلفة.' : 'تم إضافة السلفة.');
            }
            setEditingAdvanceId(null);
            setIsAddingNewAdvanceForPerson(null);
            setAdvanceModalOpen(false);
        } catch (_error) {
            showToast('حدث خطأ أثناء الحفظ.', 'error');
            throw _error;
        }
    };

    const handleStartEditAdvance = (advance: Advance) => {
        setEditingAdvanceId(advance.id);
        setIsAddingNewAdvanceForPerson(null);
        setStatementModalOpen(false);
        setTimeout(() => setAdvanceModalOpen(true), 150);
    };

    const handleDeleteAdvanceRequest = (id: string) => {
        setAdvanceToDelete(id);
    };

    const confirmDeleteAdvance = async () => {
        if (!advanceToDelete) return;
        const id = advanceToDelete;
        setIsDeletingAdvance(true);

        try {
            await deleteAdvance(id);
            showToast('تم حذف السلفة بنجاح.');
            setAdvanceToDelete(null);
        } catch (_error) {
            showToast('فشل الحذف.', 'error');
        } finally {
            setIsDeletingAdvance(false);
        }
    };

    const handleViewStatement = (personId: string) => {
        setSelectedPersonId(personId);
        setStatementModalOpen(true);
    };

    const handleAddAdvanceForPerson = (personId: string) => {
        setEditingAdvanceId(null);
        setIsAddingNewAdvanceForPerson(personId);
        setAdvanceModalOpen(true);
    };

    const handleDeletePersonRequest = (id: string) => {
        const personAdvances = advances.filter(a => a.person_id === id);
        const activeBalance = personAdvances
            .filter(a => !a.reason?.includes('[SETTLED]'))
            .reduce((sum, a) => sum + (a.amount || 0), 0);

        if (activeBalance > 0) {
            showToast('لا يمكن حذف الشخص لوجود رصيد فعال بذمته. يرجى تصفير حسابه أولاً.', 'error');
            return;
        }
        setPersonToDelete(id);
    };

    const confirmDeletePerson = async () => {
        if (!personToDelete) return;
        const id = personToDelete;
        setIsDeletingPerson(true);

        try {
            await deletePerson(id);
            showToast('تم حذف الشخص بنجاح.');
            setPersonToDelete(null);
        } catch (_error) {
            showToast('فشل الحذف.', 'error');
        } finally {
            setIsDeletingPerson(false);
        }
    };

    const handleZeroBalance = (id: string, currentBalance: number) => {
        setPersonToZero({ id, balance: currentBalance });
        setZeroConfirmText('');
    };

    const confirmZeroBalance = async () => {
        if (!personToZero) return;
        setIsSavingZeroBalance(true);
        try {
            const unsettled = advances.filter(a => a.person_id === personToZero.id && !a.reason?.includes('[SETTLED]'));
            for (const adv of unsettled) {
                await updateAdvance({
                    ...adv,
                    reason: `${(adv.reason || 'سلفة نقدية').replace(' [SETTLED]', '').trim()} [SETTLED]`
                });
            }
            showToast('تم تصفير حساب الشخص بنجاح.');
            setPersonToZero(null);
        } catch {
            showToast('حدث خطأ أثناء تصفير الحساب.', 'error');
        } finally {
            setIsSavingZeroBalance(false);
        }
    };

    const handleCancelAdvanceForm = () => {
        setAdvanceModalOpen(false);
        setEditingAdvanceId(null);
        setIsAddingNewAdvanceForPerson(null);
        if (selectedPersonId) {
            setTimeout(() => setStatementModalOpen(true), 150);
        }
    };

    return (
        <>
            {/* Person Zeroing Balance Confirmation */}
            <Modal isOpen={!!personToZero} onClose={() => setPersonToZero(null)} title="تأكيد تصفير حساب الشخص">
                <p className="text-neutral-500 dark:text-neutral-400">
                    هل أنت متأكد من تصفير حساب <strong>{persons.find(p => p.id === personToZero?.id)?.name}</strong> بالكامل؟
                </p>
                <div className="mt-3 p-3 bg-accent-warning/10 dark:bg-accent-warning/20 border border-accent-warning/20 dark:border-accent-warning/30 rounded-xl text-xs text-accent-warning dark:text-accent-warning font-bold leading-relaxed space-y-1.5">
                    <p>• سيتم وضع علامة "تمت التسوية" على جميع السلف والمسحوبات غير المسددة لهذا الشخص.</p>
                    <p>• سيصبح رصيد حسابه مساوياً لـ (0) ج.م.</p>
                    <p>• رصيد الخزنة الفعلي وحفظ الحسابات التاريخي لن يتأثرا لضمان بقائها دقيقة بنسبة 100% محاسبيًا.</p>
                </div>
                <div className="mt-4 text-right" dir="rtl">
                    <label className="block text-xs font-bold text-neutral-600 dark:text-neutral-400 mb-1.5">
                        لتأكيد التصفير، يرجى كتابة <strong className="text-accent-danger dark:text-accent-danger">حذف نهائي</strong> في الحقل أدناه:
                    </label>
                    <input
                        type="text"
                        value={zeroConfirmText}
                        onChange={(e) => setZeroConfirmText(e.target.value)}
                        placeholder="حذف نهائي"
                        className="w-full text-sm px-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-850 dark:text-neutral-100 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50 text-right"
                    />
                </div>
                <div className="mt-6 flex justify-start gap-4 flex-row-reverse font-bold">
                    <button 
                        onClick={confirmZeroBalance} 
                        disabled={isSavingZeroBalance || zeroConfirmText !== 'حذف نهائي'}
                        className="rounded-lg bg-purple-600 px-4 py-2 text-white font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isSavingZeroBalance ? 'جاري تصفير الحساب...' : 'تأكيد التصفير'}
                    </button>
                    <button 
                        onClick={() => setPersonToZero(null)} 
                        disabled={isSavingZeroBalance}
                        className="rounded-lg bg-neutral-200 dark:bg-neutral-700 px-4 py-2 font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        إلغاء
                    </button>
                </div>
            </Modal>

            {/* Person Deletion Confirmation */}
            <Modal isOpen={!!personToDelete} onClose={() => setPersonToDelete(null)} title="تأكيد حذف الشخص">
                <p className="text-neutral-500 dark:text-neutral-400">هل أنت متأكد من حذف هذا الشخص؟ سيتم حذف سجله بالكامل.</p>
                <div className="mt-6 flex justify-start gap-4 flex-row-reverse">
                    <button 
                        onClick={confirmDeletePerson} 
                        disabled={isDeletingPerson}
                        className="rounded-lg bg-accent-danger px-4 py-2 text-white font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isDeletingPerson ? 'جاري الحذف...' : 'حذف'}
                    </button>
                    <button 
                        onClick={() => setPersonToDelete(null)} 
                        disabled={isDeletingPerson}
                        className="rounded-lg bg-neutral-200 dark:bg-neutral-700 px-4 py-2 font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        إلغاء
                    </button>
                </div>
            </Modal>

            {/* Advance Deletion Confirmation */}
            <Modal isOpen={!!advanceToDelete} onClose={() => setAdvanceToDelete(null)} title="تأكيد حذف السلفة">
                <p className="text-neutral-500 dark:text-neutral-400">هل أنت متأكد من حذف هذه السلفة من السجل؟</p>
                <div className="mt-6 flex justify-start gap-4 flex-row-reverse">
                    <button 
                        onClick={confirmDeleteAdvance} 
                        disabled={isDeletingAdvance}
                        className="rounded-lg bg-accent-danger px-4 py-2 text-white font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isDeletingAdvance ? 'جاري الحذف...' : 'حذف'}
                    </button>
                    <button 
                        onClick={() => setAdvanceToDelete(null)} 
                        disabled={isDeletingAdvance}
                        className="rounded-lg bg-neutral-200 dark:bg-neutral-700 px-4 py-2 font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        إلغاء
                    </button>
                </div>
            </Modal>

            {/* Advance Form Modal */}
            <Modal
                isOpen={isAdvanceModalOpen}
                onClose={handleCancelAdvanceForm}
                title={editingAdvance?.id ? 'تعديل سلفة' : 'إضافة سلفة شخصية'}
                size="lg"
            >
                <AddAdvanceForm
                    onSave={handleSaveAdvance}
                    onCancel={handleCancelAdvanceForm}
                    persons={filteredActivePersons}
                    cycles={cycles}
                    initialData={editingAdvance}
                    onManagePersons={() => {
                        setAdvanceModalOpen(false);
                        setPersonsPopupOpen(true);
                    }}
                />
            </Modal>

            {/* Statement Modal */}
            <Modal
                isOpen={isStatementModalOpen}
                onClose={() => { setStatementModalOpen(false); setSelectedPersonId(null); }}
                title={`كشف حساب: ${persons.find(p => p.id === selectedPersonId)?.name || ''}`}
                size="3xl"
            >
                {selectedPersonId && (
                    <PersonStatement
                        personId={selectedPersonId}
                        onEdit={handleStartEditAdvance}
                        onDelete={handleDeleteAdvanceRequest}
                    />
                )}
            </Modal>

            {/* Main Content View */}
            <PersonAdvancesListView
                onAddPerson={() => setPersonsPopupOpen(true)}
                onAddAdvanceForPerson={handleAddAdvanceForPerson}
                onViewStatement={handleViewStatement}
                onDeletePerson={handleDeletePersonRequest}
                onZeroBalance={handleZeroBalance}
            />

            {/* Manage Persons (Reuse existing popup) */}
            <ManagePersonsPopup
                isOpen={isPersonsPopupOpen}
                onClose={() => setPersonsPopupOpen(false)}
                persons={filteredActivePersons}
                onSave={addPerson}
                onDelete={deletePerson}
            />
        </>
    );
};

export default AdvancesManager;
