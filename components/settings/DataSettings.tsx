import React, { useState } from 'react';
import { WarningIcon } from '../Icons';
import Modal from '../shared/Modal';
import Button from '../shared/Button';
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
                    <Button 
                        variant="danger" 
                        size="sm" 
                        onClick={handleConfirmDeleteAll} 
                        disabled={deleteConfirmationText !== 'حذف'}
                    >
                        حذف نهائي
                    </Button>
                    <Button 
                        variant="secondary" 
                        size="sm" 
                        onClick={() => setDeleteModalOpen(false)}
                    >
                        إلغاء
                    </Button>
                </div>
            </Modal>
            
            <div className="space-y-8">
                <div className="border-t-4 border-accent-danger/50 bg-white dark:bg-neutral-900 p-6 rounded-lg">
                    <div className="flex items-start gap-4">
                        <WarningIcon className="w-8 h-8 text-accent-danger flex-shrink-0" />
                        <div>
                            <h3 className="font-semibold text-lg text-accent-danger dark:text-accent-danger">إعادة تعيين الحساب</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 mb-6">سيقوم هذا الإجراء بحذف جميع بيانات التطبيق بشكل نهائي، بما في ذلك الصوب والعروات والمعاملات. <span className="font-bold">لا يمكن التراجع عن هذا الإجراء.</span></p>
                            <Button 
                                variant="danger" 
                                size="md" 
                                onClick={() => setDeleteModalOpen(true)} 
                                disabled={loading} 
                                loading={loading}
                                className="py-3 px-6"
                            >
                                حذف جميع البيانات
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default DataSettings;