import React, { createContext, useContext } from 'react';
import type { Person, VirtualMember, Advance, Supplier, SupplierPayment, Farmer, FarmerWithdrawal } from '../types';

export interface PersonsContextType {
  persons: Person[];
  activePersons: Person[];
  virtualMembers: VirtualMember[];
  addPerson: (name: string, virtual_id?: string | null, percentage?: number) => Promise<Person | null>;
  updatePerson: (id: string, name: string, virtual_id?: string | null, percentage?: number) => Promise<boolean>;
  deletePerson: (id: string) => Promise<boolean>;
  advances: Advance[];
  addAdvance: (data: Omit<Advance, 'id' | 'created_at' | 'user_id' | '_stable_id'>) => Promise<void>;
  updateAdvance: (data: Advance) => Promise<void>;
  deleteAdvance: (id: string) => Promise<void>;
  lastAdvanceAddedId: string | null;
  setLastAdvanceAddedId: (id: string | null) => void;
  suppliers: Supplier[];
  addSupplier: (name: string, opening_balance?: number) => Promise<void>;
  updateSupplier: (supplier: Supplier) => Promise<void>;
  deleteSupplier: (id: string) => Promise<boolean>;
  lastSupplierAddedId: string | null;
  setLastSupplierAddedId: (id: string | null) => void;
  supplierPayments: SupplierPayment[];
  addSupplierPayment: (payment: Omit<SupplierPayment, 'id' | 'created_at' | 'user_id' | '_stable_id'>) => Promise<void>;
  updateSupplierPayment: (payment: SupplierPayment) => Promise<void>;
  deleteSupplierPayment: (id: string) => Promise<void>;
  farmers: Farmer[];
  addFarmer: (name: string) => Promise<void>;
  updateFarmer: (farmer: Farmer) => Promise<void>;
  deleteFarmer: (id: string) => Promise<boolean>;
  lastFarmerAddedId: string | null;
  setLastFarmerAddedId: (id: string | null) => void;
  farmerWithdrawals: FarmerWithdrawal[];
  addFarmerWithdrawal: (withdrawal: Omit<FarmerWithdrawal, 'id' | 'created_at' | 'user_id' | '_stable_id'>) => Promise<void>;
  updateFarmerWithdrawal: (withdrawal: FarmerWithdrawal) => Promise<void>;
  deleteFarmerWithdrawal: (id: string) => Promise<void>;
}

export const PersonsContext = createContext<PersonsContextType | undefined>(undefined);

export const usePersonsData = (): PersonsContextType => {
  const context = useContext(PersonsContext);
  if (!context) {
    throw new Error('usePersonsData must be used within a PersonsProvider or DataProvider');
  }
  return context;
};

export const PersonsProvider: React.FC<{
  value: PersonsContextType;
  children: React.ReactNode;
}> = ({ value, children }) => {
  return (
    <PersonsContext.Provider value={value}>
      {children}
    </PersonsContext.Provider>
  );
};
