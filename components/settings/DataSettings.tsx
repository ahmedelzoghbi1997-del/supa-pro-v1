import React, { useState } from 'react';
import { WarningIcon } from '../Icons';
import Modal from '../shared/Modal';
import { useData } from '../../contexts/DataContext';
import { useUI } from '../../contexts/UIContext';
import { useToast } from '../../hooks/useToast';

const DataSettings: React.FC = () => {
    const { deleteAllUserData } = useData();
    const { loading } = useUI();
    const { showToast } = useToast();
    
    // State for Modals
    const [isDeleteModalOpen, setDeleteModalOpen] = useState(false);
    const [deleteConfirmationText, setDeleteConfirmationText] = useState('');

    const handleConfirmDeleteAll = async () => {
        if (deleteConfirmationText === 'حذف') {
            setDeleteModalOpen(false);
            setDeleteConfirmationText('');
            await deleteAllUserData();
        } else {
            showToast('الرجاء كتابة كلمة التأكيد بشكل صحيح.', 'error');
        }
    };

    return (
        <>
            {/* Modal for Deleting ALL User Data */}
            <Modal isOpen={isDeleteModalOpen} onClose={() => setDeleteModalOpen(false)} title="تأكيد الحذف النهائي">
                <p className="text-neutral-500 dark:text-neutral-400 mb-4">
                    هذا الإجراء سيحذف <span className="font-bold text-accent-danger">جميع</span> بياناتك بشكل نهائي. للتأكيد، يرجى كتابة "حذف" في الحقل أدناه.
                </p>
                <input
                    type="text"
                    value={deleteConfirmationText}
                    onChange={(e) => setDeleteConfirmationText(e.target.value)}
                    className="w-full bg-neutral-100 dark:bg-neutral-800 border-neutral-300 dark:border-neutral-700 border rounded-lg p-2 focus:ring-2 focus:ring-accent-danger focus:border-accent-danger transition"
                />
                <div className="mt-6 flex justify-start gap-4 flex-row-reverse">
                    <button onClick={handleConfirmDeleteAll} disabled={deleteConfirmationText !== 'حذف'} className="rounded-lg bg-accent-danger px-4 py-2 text-sm font-semibold text-white shadow-sm disabled:bg-red-300 dark:disabled:bg-red-800 disabled:cursor-not-allowed">حذف نهائي</button>
                    <button onClick={() => setDeleteModalOpen(false)} className="rounded-lg bg-neutral-200 dark:bg-neutral-700 px-4 py-2 text-sm font-semibold text-neutral-800 dark:text-neutral-100 shadow-sm hover:bg-neutral-300 dark:hover:bg-neutral-600">إلغاء</button>
                </div>
            </Modal>
            
            <div className="space-y-8">
                <div className="border-t-4 border-red-500/50 bg-white dark:bg-neutral-900 p-6 rounded-lg">
                    <div className="flex items-start gap-4">
                        <WarningIcon className="w-8 h-8 text-red-500 flex-shrink-0" />
                        <div>
                            <h3 className="font-semibold text-lg text-red-500 dark:text-red-400">إعادة تعيين الحساب</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 mb-6">سيقوم هذا الإجراء بحذف جميع بيانات التطبيق بشكل نهائي، بما في ذلك الصوب والعروات والمعاملات. <span className="font-bold">لا يمكن التراجع عن هذا الإجراء.</span></p>
                            <button onClick={() => setDeleteModalOpen(true)} disabled={loading} className="bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-wait">
                                حذف جميع البيانات
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default DataSettings;