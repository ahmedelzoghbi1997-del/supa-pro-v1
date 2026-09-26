
import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import type { Person } from '../../types';
import { PlusIcon, TrashIcon, XMarkIcon, FarmerAccountIcon } from '../Icons';
import { useToast } from '../../hooks/useToast';
import Modal from '../shared/Modal';
import { useData } from '../../contexts/DataContext';

interface ManagePersonsPopupProps {
    isOpen: boolean;
    onClose: () => void;
    persons: Person[];
    onSave: (name: string, virtualId?: string | null, percentage?: number) => void;
    onDelete: (id: string) => Promise<boolean>;
}

const ManagePersonsPopup: React.FC<ManagePersonsPopupProps> = ({ isOpen, onClose, persons, onSave, onDelete }) => {
    const [newName, setNewName] = useState('');
    const [editingPersonId, setEditingPersonId] = useState<string | null>(null);
    const [selectedVirtualId, setSelectedVirtualId] = useState<string>('');
    const [partnerPercentage, setPartnerPercentage] = useState<string>('');
    const [errors, setErrors] = useState<{ newName?: string }>({});
    const { showToast } = useToast();
    const { advances, virtualMembers, updatePerson, settings } = useData();
    const [personToDelete, setPersonToDelete] = useState<Person | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const sortedPersons = useMemo(() => 
        [...persons]
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()), 
    [persons]);

    const handleSave = async () => {
        if (!newName.trim()) {
            setErrors({ newName: 'اسم الشخص مطلوب.' });
            return;
        }
        
        const vid = selectedVirtualId || null;
        const pct = parseFloat(partnerPercentage) || 0;
        
        if (editingPersonId) {
            try {
                const success = await updatePerson(editingPersonId, newName.trim(), vid, pct);
                if (success) {
                    showToast('تم تعديل بيانات الشخص والربط بنجاح.', 'success');
                    cancelEditing();
                } else {
                    showToast('حدث خطأ أثناء تعديل بيانات الشخص.', 'error');
                }
            } catch (_err) {
                showToast('فشل تعديل بيانات الشخص.', 'error');
            }
        } else {
            onSave(newName.trim(), vid, pct);
            cancelEditing();
        }
    };

    const startEditing = (person: Person) => {
        setEditingPersonId(person.id);
        setNewName(person.name);
        setSelectedVirtualId(person.virtual_id || '');
        const pct = settings?.person_partner_percentages?.[person.id] || 0;
        setPartnerPercentage(pct > 0 ? String(pct) : '');
        setErrors({});
    };

    const cancelEditing = () => {
        setEditingPersonId(null);
        setNewName('');
        setSelectedVirtualId('');
        setPartnerPercentage('');
        setErrors({});
    };
    
    const handleDeleteRequest = (id: string) => {
        const personAdvances = advances.filter(a => a.person_id === id);
        const activeBalance = personAdvances
            .filter(a => !a.reason?.includes('[SETTLED]'))
            .reduce((sum, a) => sum + (a.amount || 0), 0);

        if (activeBalance > 0) {
            showToast('لا يمكن حذف الشخص لوجود رصيد سلف فعال بذمته. يرجى تصفير حسابه أولاً.', 'error');
            return;
        }
        const person = persons.find(p => p.id === id);
        if (person) setPersonToDelete(person);
    };

    const confirmDelete = async () => {
        if (personToDelete) {
            setIsDeleting(true);
            try {
                const success = await onDelete(personToDelete.id);
                if (success) {
                    showToast('تم حذف الشخص بنجاح.', 'success');
                    setPersonToDelete(null);
                }
            } catch (_e) {
                showToast('فشل الحذف.', 'error');
            } finally {
                setIsDeleting(false);
            }
        }
    };

    if (!isOpen) return null;
    
    const errorInputClasses = "border-accent-danger focus:border-accent-danger focus:ring-accent-danger/50";

    const popupContent = (
        <>
            <Modal isOpen={!!personToDelete} onClose={() => setPersonToDelete(null)} title="تأكيد حذف الشخص">
                 <p className="text-neutral-500 dark:text-neutral-400">
                    هل أنت متأكد من رغبتك في حذف "{personToDelete?.name}"؟ لا يمكن التراجع عن هذا الإجراء.
                </p>
                <div className="mt-6 flex justify-start gap-4 flex-row-reverse">
                    <button 
                        onClick={confirmDelete} 
                        disabled={isDeleting}
                        className="rounded-lg bg-accent-danger px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isDeleting ? 'جاري الحذف...' : 'حذف'}
                    </button>
                    <button 
                        onClick={() => setPersonToDelete(null)} 
                        disabled={isDeleting}
                        className="rounded-lg bg-neutral-100 dark:bg-neutral-800 px-4 py-2 text-sm font-semibold text-neutral-800 dark:text-neutral-100 shadow-sm hover:bg-neutral-200 dark:hover:bg-neutral-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        إلغاء
                    </button>
                </div>
            </Modal>
            <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4" onClick={onClose}>
                <div className="bg-white dark:bg-neutral-800 rounded-lg shadow-xl p-6 w-full max-w-md text-slate-800 dark:text-white animate-modal-enter" onClick={e => e.stopPropagation()}>
                    <div className="flex justify-between items-center mb-6">
                        <div className="flex items-center gap-3">
                            <FarmerAccountIcon className="w-8 h-8"/>
                            <h2 className="text-2xl font-bold">إدارة الأشخاص</h2>
                        </div>
                        <button onClick={onClose} className="p-1 text-gray-400 hover:text-slate-800 dark:hover:text-white">
                            <XMarkIcon className="w-6 w-6" />
                        </button>
                    </div>
                    
                    {/* Add/Edit Person Form */}
                    <div className="mb-6 bg-neutral-50 dark:bg-neutral-900/30 p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 space-y-3">
                        <div className="text-right">
                            <label className="block text-xs font-bold text-neutral-500 dark:text-neutral-400 mb-1">
                                {editingPersonId ? 'اسم الشخص المعدل:' : 'اسم الشخص الجديد:'}
                            </label>
                            <input
                                type="text"
                                value={newName}
                                onChange={(e) => {
                                    setNewName(e.target.value);
                                    if(errors.newName) setErrors({});
                                }}
                                placeholder="مثال: الحاج ربيع"
                                className={`w-full bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 text-slate-800 dark:text-white rounded-lg p-3 text-right focus:ring-2 focus:ring-primary focus:border-primary transition placeholder:text-neutral-500 ${errors.newName ? errorInputClasses : ''}`}
                            />
                            {errors.newName && <p className="text-accent-danger text-xs mt-1 text-right">{errors.newName}</p>}
                        </div>

                        <div className="text-right">
                            <label className="block text-xs font-bold text-neutral-500 dark:text-neutral-400 mb-1">
                                ربط بحساب مطلع / شريك مستخدم:
                            </label>
                            <select
                                value={selectedVirtualId}
                                onChange={(e) => setSelectedVirtualId(e.target.value)}
                                className="w-full bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 text-slate-800 dark:text-white rounded-lg p-3 text-right focus:ring-2 focus:ring-primary focus:border-primary transition"
                            >
                                <option value="">بدون ربط (مستخدم غير مسجل)</option>
                                <option value="shared_debt" className="text-rose-500 font-bold bg-rose-50 dark:bg-rose-900/20">
                                    🔴 مديونية عامة (تخصم مسحوباته من صافي الأرباح الموزعة)
                                </option>
                                {virtualMembers.map(vm => (
                                    <option key={vm.id} value={vm.id}>
                                        {vm.full_name} ({vm.role === 'partner' ? 'شريك' : 'مطلع'})
                                    </option>
                                ))}
                            </select>
                        </div>

                        {selectedVirtualId !== 'shared_debt' && (
                            <div className="text-right animate-enter">
                                <label className="block text-xs font-bold text-neutral-500 dark:text-neutral-400 mb-1">
                                    نسبة الشراكة من صافي أرباح المالك (إن وجد) %:
                                </label>
                                <input
                                    type="number"
                                    min="0"
                                    max="100"
                                    step="any"
                                    value={partnerPercentage}
                                    onChange={(e) => setPartnerPercentage(e.target.value)}
                                    placeholder="مثال: 25 (اتركها فارغة لغير الشركاء)"
                                    className="w-full bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 text-slate-800 dark:text-white rounded-lg p-3 text-right focus:ring-2 focus:ring-primary focus:border-primary transition [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                />
                                <p className="text-[10px] text-neutral-400 dark:text-neutral-500 mt-1">
                                    تُستخدم لحساب الأرباح المستحقة والمتبقية للشريك على لوحة التحكم تلقائياً وتجعله يظهر في قائمة الشركاء.
                                </p>
                            </div>
                        )}

                        <div className="flex gap-2 pt-1">
                            <button
                                onClick={handleSave}
                                className="flex-grow flex items-center justify-center gap-2 bg-primary text-white font-bold py-2.5 px-4 rounded-lg hover:bg-primary-dark transition text-sm"
                            >
                                {editingPersonId ? 'حفظ التغييرات' : (
                                    <>
                                        <PlusIcon className="h-4 w-4" />
                                        <span>إضافة لشجرة الحسابات</span>
                                    </>
                                )}
                            </button>
                            {editingPersonId && (
                                <button
                                    onClick={cancelEditing}
                                    className="bg-neutral-200 dark:bg-neutral-700 text-slate-800 dark:text-white font-semibold py-2.5 px-4 rounded-lg hover:bg-neutral-300 dark:hover:bg-neutral-600 transition text-sm"
                                >
                                    إلغاء التعديل
                                </button>
                            )}
                        </div>
                    </div>
                    
                    {/* Persons List */}
                    <div className="space-y-3 max-h-64 overflow-y-auto pr-2 -mr-2">
                        {sortedPersons.map(person => {
                            const personAdvances = advances.filter(a => a.person_id === person.id);
                            const hasActiveBalance = personAdvances
                                .filter(a => !a.reason?.includes('[SETTLED]'))
                                .reduce((sum, a) => sum + (a.amount || 0), 0) > 0;
                            const pairedMember = virtualMembers.find(v => v.id === person.virtual_id);
                            return (
                                <div key={person.id} className="bg-gray-50 dark:bg-neutral-900/50 p-3 rounded-lg flex justify-between items-center text-right border border-neutral-100 dark:border-neutral-800">
                                    <div className="flex flex-col text-right">
                                        <span className="font-semibold text-sm">{person.name}</span>
                                        {person.virtual_id === 'shared_debt' && (
                                            <span className="text-[10px] text-rose-500 bg-rose-50 dark:bg-rose-900/20 px-1.5 py-0.5 rounded font-bold self-start mt-0.5">
                                                مديونية عامة
                                            </span>
                                        )}
                                        <div className="flex flex-col gap-0.5 mt-0.5 self-start items-start text-right">
                                            {pairedMember && (
                                                <span className="text-[10px] text-primary font-bold">
                                                    مرتبط بحساب: {pairedMember.full_name} ({pairedMember.role === 'partner' ? 'شريك' : 'مطلع'})
                                                </span>
                                            )}
                                            {settings?.person_partner_percentages?.[person.id] !== undefined && settings.person_partner_percentages[person.id] > 0 && (
                                                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
                                                    شريك في الأرباح: {settings.person_partner_percentages[person.id]}%
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1 flex-row-reverse">
                                        <button 
                                            onClick={() => handleDeleteRequest(person.id)} 
                                            className={`p-1.5 rounded-full transition-colors ${hasActiveBalance ? 'opacity-30 grayscale cursor-not-allowed text-neutral-400' : 'text-neutral-500 hover:text-accent-danger hover:bg-accent-danger/10'}`}
                                            title={hasActiveBalance ? "لا يمكن حذف الشخص لوجود رصيد سلف فعال بذمته" : "حذف الاسم"}
                                            disabled={hasActiveBalance}
                                        >
                                            <TrashIcon className="h-4 w-4" />
                                        </button>
                                        <button 
                                            onClick={() => startEditing(person)} 
                                            className="p-1.5 rounded-full text-neutral-500 hover:text-primary hover:bg-primary/10 transition-colors"
                                            title="تعديل أو تعديل الربط"
                                        >
                                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                            </svg>
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                         {sortedPersons.length === 0 && (
                             <p className="text-center text-gray-500 py-4">لا يوجد أشخاص.</p>
                         )}
                    </div>
                </div>
            </div>
        </>
    );

    return createPortal(popupContent, document.body);
};

export default ManagePersonsPopup;
