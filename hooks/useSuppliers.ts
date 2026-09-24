import { useData } from '../contexts/DataContext';
import type { Supplier, SupplierPayment } from '../types';

export interface UseSuppliersReturn {
  suppliers: Supplier[];
  supplierPayments: SupplierPayment[];
  lastSupplierAddedId: string | null;
  setLastSupplierAddedId: (id: string | null) => void;
  addSupplier: (name: string, opening_balance?: number) => Promise<void>;
  updateSupplier: (supplier: Supplier) => Promise<void>;
  deleteSupplier: (id: string) => Promise<boolean>;
  addSupplierPayment: (payment: Omit<SupplierPayment, 'id' | 'created_at' | 'user_id' | '_stable_id'>) => Promise<void>;
  updateSupplierPayment: (payment: SupplierPayment) => Promise<void>;
  deleteSupplierPayment: (id: string) => Promise<void>;
}

export const useSuppliers = (): UseSuppliersReturn => {
  const {
    suppliers,
    supplierPayments,
    lastSupplierAddedId,
    setLastSupplierAddedId,
    addSupplier,
    updateSupplier,
    deleteSupplier,
    addSupplierPayment,
    updateSupplierPayment,
    deleteSupplierPayment,
  } = useData();

  return {
    suppliers,
    supplierPayments,
    lastSupplierAddedId,
    setLastSupplierAddedId,
    addSupplier,
    updateSupplier,
    deleteSupplier,
    addSupplierPayment,
    updateSupplierPayment,
    deleteSupplierPayment,
  };
};

export default useSuppliers;
