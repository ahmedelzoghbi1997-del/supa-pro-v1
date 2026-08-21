
import React, { useState, useMemo } from 'react';
import type { Invoice } from '../../types';
import InvoicesList from './InvoicesList';
import AddInvoiceForm from './AddInvoiceForm';
import InvoiceDetailsModal from './InvoiceDetailsModal';
import { useToast } from '../../hooks/useToast';
import Modal from '../shared/Modal';
import { useData } from '../../contexts/DataContext';

const InvoiceManager: React.FC = () => {
    const [isFormModalOpen, setFormModalOpen] = useState(false);
    const [editingInvoiceId, setEditingInvoiceId] = useState<string | null>(null);
    const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);
    const [isDeleteModalOpen, setDeleteModalOpen] = useState(false);
    const [invoiceToDelete, setInvoiceToDelete] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const { showToast } = useToast();
    const { invoices, addInvoice, updateInvoice, deleteInvoice, lastInvoiceAddedId, cycles } = useData();

    const editingInvoice = useMemo(() => {
        if (!editingInvoiceId) return null;
        return invoices.find(inv => inv.id === editingInvoiceId) || null;
    }, [editingInvoiceId, invoices]);

    const selectedInvoiceDetails = useMemo(() => {
        if (!selectedInvoiceId) return null;
        return invoices.find(inv => inv.id === selectedInvoiceId) || null;
    }, [selectedInvoiceId, invoices]);

    const activeCycleIds = useMemo(() => 
        cycles.filter(c => c.status === 'active').map(c => c.id),
    [cycles]);

    const activeInvoices = useMemo(() =>
        invoices
            .filter(inv => activeCycleIds.includes(inv.cycle_id) && inv.market !== 'رصيد منقول' && inv.market !== 'تمويل يدوي')
            .sort((a, b) => {
                const dateComparison = new Date(b.date).getTime() - new Date(a.date).getTime();
                if (dateComparison !== 0) return dateComparison;
                return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
            }),
    [invoices, activeCycleIds]);

    const handleSaveInvoice = async (invoiceData: Omit<Invoice, 'id'> | Invoice) => {
        const isEditing = 'id' in invoiceData && invoiceData.id;
        
        try {
            if (isEditing) {
                await updateInvoice(invoiceData as Invoice);
                showToast('تم التحديث بنجاح.');
            } else {
                await addInvoice(invoiceData as Omit<Invoice, 'id'>);
                showToast('تمت الإضافة بنجاح.');
            }
            setEditingInvoiceId(null);
            setFormModalOpen(false);
        } catch (error: any) {
            console.error("Save error:", error);
            showToast(error.message || 'حدث خطأ أثناء الحفظ.', 'error');
            throw error;
        }
    };

    const handleDeleteRequest = (invoiceId: string) => {
        setInvoiceToDelete(invoiceId);
        setDeleteModalOpen(true);
    };
    
    const confirmDeleteInvoice = async () => {
        if (!invoiceToDelete) return;

        const id = invoiceToDelete;
        setIsDeleting(true);

        try {
            await deleteInvoice(id);
            showToast('تم الحذف بنجاح.');
            setDeleteModalOpen(false);
            setInvoiceToDelete(null);
        } catch (_error) {
            showToast('فشل الحذف.', 'error');
        } finally {
            setIsDeleting(false);
        }
    };

    const handleStartAddNew = () => {
        setEditingInvoiceId(null);
        setFormModalOpen(true);
    }

    const handleStartEdit = (invoiceId: string) => {
        setEditingInvoiceId(invoiceId);
        setFormModalOpen(true);
    };
    
    const handleCancelForm = () => {
        setFormModalOpen(false);
        setEditingInvoiceId(null);
    };

    const handleViewDetails = (invoice: Invoice) => {
        setSelectedInvoiceId(invoice.id);
    };

    return (
        <>
             <Modal
                isOpen={isDeleteModalOpen}
                onClose={() => setDeleteModalOpen(false)}
                title="تأكيد الحذف"
            >
                <p className="text-neutral-500 dark:text-neutral-400">
                    هل أنت متأكد من رغبتك في حذف هذه الفاتورة؟ لا يمكن التراجع عن هذا الإجراء.
                </p>
                <div className="mt-6 flex justify-start gap-4 flex-row-reverse">
                    <button
                        onClick={confirmDeleteInvoice}
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
                isOpen={isFormModalOpen}
                onClose={handleCancelForm}
                title={editingInvoice ? 'تعديل الفاتورة' : 'إضافة فاتورة جديدة'}
                size="3xl"
            >
                 <AddInvoiceForm 
                    onSave={handleSaveInvoice} 
                    onCancel={handleCancelForm} 
                    initialData={editingInvoice}
                />
            </Modal>

            <InvoiceDetailsModal 
                invoice={selectedInvoiceDetails}
                onClose={() => setSelectedInvoiceId(null)}
            />
            
            <InvoicesList
                invoices={activeInvoices}
                onAddNew={handleStartAddNew}
                onDelete={handleDeleteRequest}
                onEdit={handleStartEdit}
                onViewDetails={handleViewDetails}
                lastAddedId={lastInvoiceAddedId}
            />
        </>
    );
};

export default InvoiceManager;
