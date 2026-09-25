import React, { createContext, useContext } from 'react';
import type { Invoice, InvoiceInput, InvoicePriceItem, InvoiceDeductionItem } from '../types';

export interface InvoicesContextType {
  invoices: Invoice[];
  invoicePriceItems?: InvoicePriceItem[];
  invoiceDeductions?: InvoiceDeductionItem[];
  lastInvoiceAddedId: string | null;
  setLastInvoiceAddedId: (id: string | null) => void;
  addInvoice: (data: InvoiceInput) => Promise<void>;
  updateInvoice: (data: Invoice) => Promise<void>;
  deleteInvoice: (id: string) => Promise<void>;
}

export const InvoicesContext = createContext<InvoicesContextType | undefined>(undefined);

export const useInvoicesData = (): InvoicesContextType => {
  const context = useContext(InvoicesContext);
  if (!context) {
    throw new Error('useInvoicesData must be used within an InvoicesProvider or DataProvider');
  }
  return context;
};

export const InvoicesProvider: React.FC<{
  value: InvoicesContextType;
  children: React.ReactNode;
}> = ({ value, children }) => {
  return (
    <InvoicesContext.Provider value={value}>
      {children}
    </InvoicesContext.Provider>
  );
};
