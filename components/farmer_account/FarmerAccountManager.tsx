
import React, { useState, useCallback, useEffect } from 'react';
import type { Farmer, FarmerWithdrawal } from '../../types';
import FarmerAccountListView from './FarmerAccountListView';
import AddFarmerForm from './AddFarmerForm';
import AddWithdrawalForm from './AddWithdrawalForm';
import FarmerStatement from './FarmerStatement';
import Modal from '../shared/Modal';
import { useData } from '../../contexts/DataContext';
import { useToast } from '../../hooks/useToast';

const FarmerAccountManager: React.FC = () => {
    const { farmers, addFarmer, updateFarmer, deleteFarmer, addFarmerWithdrawal, updateFarmerWithdrawal, deleteFarmerWithdrawal, cycles, lastFarmerAddedId, setLastFarmerAddedId, profile, statementAction, setStatementAction } = useData();
    const { showToast } = useToast();
    const [isFarmerModalOpen, setFarmerModalOpen] = useState(false);
    const [isWithdrawalModalOpen, setWithdrawalModalOpen] = useState(false);
    const [isStatementModalOpen, setStatementModalOpen] = useState(false);
    const [selectedFarmerId, setSelectedFarmerId] = useState<string | null>(null);
    const [editingWithdrawal, setEditingWithdrawal] = useState<FarmerWithdrawal | null>(null);
    const [editingFarmer, setEditingFarmer] = useState<Farmer | null>(null);
    const [withdrawalToDelete, setWithdrawalToDelete] = useState<string | null>(null);
    const [farmerToDelete, setFarmerToDelete] = useState<string | null>(null);
    const [isDeletingFarmer, setIsDeletingFarmer] = useState(false);
    const [isDeletingWithdrawal, setIsDeletingWithdrawal] = useState(false);

    useEffect(() => {
        if (statementAction?.route === 'farmer_account' && statementAction.parentId) {
            setSelectedFarmerId(statementAction.parentId);
            setStatementModalOpen(true);
            setStatementAction(null); // Clear it so it doesn't re-trigger unnecessarily
        }
    }, [statementAction, setStatementAction]);

    const handleSaveFarmer = async (name: string) => {
        try {
            if (editingFarmer) {
                await updateFarmer({ ...editingFarmer, name });
                showToast('تم تحديث بيانات المزارع.');
            } else {
                await addFarmer(name);
                showToast('تم إضافة المزارع.');
            }
            setFarmerModalOpen(false);
            setEditingFarmer(null);
        } catch (_e) {
            showToast('حدث خطأ أثناء الحفظ.', 'error');
            throw _e;
        }
    };
    
    const handleStartEditFarmer = (farmer: Farmer) => {
        setEditingFarmer(farmer);
        setFarmerModalOpen(true);
    };

    const handleCancelFarmerForm = () => {
        setFarmerModalOpen(false);
        setEditingFarmer(null);
    };
    
    const handleDeleteRequest = (id: string) => {
        setFarmerToDelete(id);
    };

    const confirmDeleteFarmer = async () => {
        if (!farmerToDelete) return;
        const id = farmerToDelete;
        setIsDeletingFarmer(true);
        
        try {
            await deleteFarmer(id);
            showToast('تم حذف المزارع بنجاح.');
            setFarmerToDelete(null);
        } catch (_e) {
            showToast('فشل الحذف.', 'error');
        } finally {
            setIsDeletingFarmer(false);
        }
    };

    const handleSaveWithdrawal = async (withdrawal: Omit<FarmerWithdrawal, 'id' | 'user_id' | 'created_at'> | FarmerWithdrawal) => {
        const isEditing = 'id' in withdrawal;

        try {
            if (isEditing) {
                await updateFarmerWithdrawal(withdrawal as FarmerWithdrawal);
            } else {
                await addFarmerWithdrawal(withdrawal);
            }
            showToast(isEditing ? 'تم تحديث السحب.' : 'تم إضافة السحب.');
            setEditingWithdrawal(null);
            setWithdrawalModalOpen(false);
        } catch (_e) {
            showToast('حدث خطأ أثناء الحفظ.', 'error');
            throw _e;
        }
    };
    
    const handleViewStatement = (farmerId: string) => {
        setSelectedFarmerId(farmerId);
        setStatementModalOpen(true);
    };

    const closeStatement = useCallback(() => {
        setStatementModalOpen(false);
        setSelectedFarmerId(null);
    }, []);
    
    const handleAddWithdrawalForFarmer = (farmerId: string) => {
        setEditingWithdrawal({ farmer_id: farmerId } as FarmerWithdrawal);
        setWithdrawalModalOpen(true);
    };

    const handleStartEditWithdrawal = (withdrawal: FarmerWithdrawal) => {
        setEditingWithdrawal(withdrawal);
        setWithdrawalModalOpen(true);
    };

    const handleDeleteWithdrawalRequest = (id: string) => {
        setWithdrawalToDelete(id);
    };

    const confirmDeleteWithdrawal = async () => {
        if (!withdrawalToDelete) return;
        const id = withdrawalToDelete;
        setIsDeletingWithdrawal(true);

        try {
            await deleteFarmerWithdrawal(id);
            showToast('تم حذف السحب بنجاح.');
            setWithdrawalToDelete(null);
        } catch (_e) {
            showToast('فشل الحذف.', 'error');
        } finally {
            setIsDeletingWithdrawal(false);
        }
    };
    
    const handleCancelWithdrawalForm = () => {
        setWithdrawalModalOpen(false);
        setEditingWithdrawal(null);
    };

    const isViewer = profile?.role === 'viewer';

    return (
        <>
            <Modal
                isOpen={!!farmerToDelete}
                onClose={() => setFarmerToDelete(null)}
                title="تأكيد حذف المزارع"
            >
                <p>هل أنت متأكد من رغبتك في حذف هذا المزارع؟ سيتم حذف جميع مسحوباته.</p>
                <div className="mt-6 flex justify-start gap-4 flex-row-reverse">
                    <button 
                        onClick={confirmDeleteFarmer} 
                        disabled={isDeletingFarmer}
                        className="rounded-lg bg-accent-danger px-4 py-2 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isDeletingFarmer ? 'جاري الحذف...' : 'حذف'}
                    </button>
                    <button 
                        onClick={() => setFarmerToDelete(null)} 
                        disabled={isDeletingFarmer}
                        className="rounded-lg bg-neutral-200 dark:bg-neutral-700 px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        إلغاء
                    </button>
                </div>
            </Modal>
            
            <Modal
                isOpen={isFarmerModalOpen}
                onClose={handleCancelFarmerForm}
                title={editingFarmer ? 'تعديل بيانات المزارع' : 'إضافة مزارع جديد'}
            >
                <AddFarmerForm 
                    onSave={handleSaveFarmer}
                    onCancel={handleCancelFarmerForm}
                    initialData={editingFarmer}
                />
            </Modal>
            
            <Modal
                isOpen={isStatementModalOpen}
                onClose={() => {
                    closeStatement();
                }}
                title={`كشف حساب: ${farmers.find(f => f.id === selectedFarmerId)?.name || ''}`}
                size="3xl"
            >
                {selectedFarmerId && (
                    <FarmerStatement 
                        farmerId={selectedFarmerId} 
                        onEdit={isViewer ? undefined : handleStartEditWithdrawal}
                        onDelete={isViewer ? undefined : handleDeleteWithdrawalRequest}
                    />
                )}
            </Modal>

            <Modal
                isOpen={isWithdrawalModalOpen}
                onClose={handleCancelWithdrawalForm}
                title={editingWithdrawal?.id ? 'تعديل سحب' : 'إضافة سحب جديد'}
                size="lg"
            >
                <AddWithdrawalForm
                    onSave={handleSaveWithdrawal}
                    onCancel={handleCancelWithdrawalForm}
                    farmers={farmers}
                    cycles={cycles}
                    initialData={editingWithdrawal}
                />
            </Modal>

            <Modal
                isOpen={!!withdrawalToDelete}
                onClose={() => setWithdrawalToDelete(null)}
                title="تأكيد حذف السحب"
            >
                <p>هل أنت متأكد من رغبتك في حذف هذا السحب؟</p>
                <div className="mt-6 flex justify-start gap-4 flex-row-reverse">
                    <button 
                        onClick={confirmDeleteWithdrawal} 
                        disabled={isDeletingWithdrawal}
                        className="rounded-lg bg-accent-danger px-4 py-2 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isDeletingWithdrawal ? 'جاري الحذف...' : 'حذف'}
                    </button>
                    <button 
                        onClick={() => setWithdrawalToDelete(null)} 
                        disabled={isDeletingWithdrawal}
                        className="rounded-lg bg-neutral-200 dark:bg-neutral-700 px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        إلغاء
                    </button>
                </div>
            </Modal>
            
            <FarmerAccountListView 
                onAddFarmer={() => setFarmerModalOpen(true)} 
                onEditFarmer={handleStartEditFarmer}
                onAddWithdrawalForFarmer={handleAddWithdrawalForFarmer}
                onViewStatement={handleViewStatement}
                onDeleteRequest={handleDeleteRequest}
                lastAddedId={lastFarmerAddedId}
                onAnimationEnd={() => setLastFarmerAddedId(null)}
            />
        </>
    );
};

export default FarmerAccountManager;
