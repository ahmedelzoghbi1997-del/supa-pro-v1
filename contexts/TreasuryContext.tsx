import React, { createContext, useContext } from 'react';
import type { BankAccount, BankTransaction, PartnerDebt, TreasuryFund } from '../types';

export interface TreasuryContextType {
  bankAccounts: BankAccount[];
  addBankAccount: (account: Omit<BankAccount, 'id' | 'created_at' | 'user_id' | '_stable_id'>) => Promise<string>;
  updateBankAccount: (account: BankAccount) => Promise<void>;
  deleteBankAccount: (id: string) => Promise<boolean>;
  bankTransactions: BankTransaction[];
  addBankTransaction: (transaction: Omit<BankTransaction, 'id' | 'created_at' | 'user_id' | '_stable_id'>) => Promise<void>;
  updateBankTransaction: (transaction: BankTransaction) => Promise<void>;
  deleteBankTransaction: (id: string) => Promise<void>;
  partnerDebts: PartnerDebt[];
  addPartnerDebt: (data: Omit<PartnerDebt, 'id' | 'created_at' | 'user_id' | '_stable_id'>) => Promise<void>;
  updatePartnerDebt: (data: PartnerDebt) => Promise<void>;
  deletePartnerDebt: (id: string) => Promise<void>;
  treasuryFunds: TreasuryFund[];
}

export const TreasuryContext = createContext<TreasuryContextType | undefined>(undefined);

export const useTreasuryData = (): TreasuryContextType => {
  const context = useContext(TreasuryContext);
  if (!context) {
    throw new Error('useTreasuryData must be used within a TreasuryProvider or DataProvider');
  }
  return context;
};

export const TreasuryProvider: React.FC<{
  value: TreasuryContextType;
  children: React.ReactNode;
}> = ({ value, children }) => {
  return (
    <TreasuryContext.Provider value={value}>
      {children}
    </TreasuryContext.Provider>
  );
};
