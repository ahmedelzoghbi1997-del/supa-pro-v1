import { useInvoicesData } from '../contexts/InvoicesContext';
import type { Invoice, InvoiceInput } from '../types';

export interface UseInvoicesReturn {
  invoices: Invoice[];
  lastInvoiceAddedId: string | null;
  setLastInvoiceAddedId: (id: string | null) => void;
  addInvoice: (data: InvoiceInput) => Promise<void>;
  updateInvoice: (data: Invoice) => Promise<void>;
  deleteInvoice: (id: string) => Promise<void>;
}

export const useInvoices = (): UseInvoicesReturn => {
  const {
    invoices,
    lastInvoiceAddedId,
    setLastInvoiceAddedId,
    addInvoice,
    updateInvoice,
    deleteInvoice,
  } = useInvoicesData();

  return {
    invoices,
    lastInvoiceAddedId,
    setLastInvoiceAddedId,
    addInvoice,
    updateInvoice,
    deleteInvoice,
  };
};

export default useInvoices;
