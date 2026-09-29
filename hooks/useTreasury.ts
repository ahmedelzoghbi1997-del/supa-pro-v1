import { useTreasuryData } from '../contexts/TreasuryContext';
import type { BankAccount, BankTransaction, TreasuryFund } from '../types';

export interface UseTreasuryReturn {
  treasuryFunds: TreasuryFund[];
  bankAccounts: BankAccount[];
  bankTransactions: BankTransaction[];
  addBankAccount: (account: Omit<BankAccount, 'id' | 'created_at' | 'user_id' | '_stable_id'>) => Promise<string>;
  updateBankAccount: (account: BankAccount) => Promise<void>;
  deleteBankAccount: (id: string) => Promise<boolean>;
  addBankTransaction: (transaction: Omit<BankTransaction, 'id' | 'created_at' | 'user_id' | '_stable_id'>) => Promise<void>;
  updateBankTransaction: (transaction: BankTransaction) => Promise<void>;
  deleteBankTransaction: (id: string) => Promise<void>;
}

export const useTreasury = (): UseTreasuryReturn => {
  const {
    treasuryFunds,
    bankAccounts,
    bankTransactions,
    addBankAccount,
    updateBankAccount,
    deleteBankAccount,
    addBankTransaction,
    updateBankTransaction,
    deleteBankTransaction,
  } = useTreasuryData();

  return {
    treasuryFunds,
    bankAccounts,
    bankTransactions,
    addBankAccount,
    updateBankAccount,
    deleteBankAccount,
    addBankTransaction,
    updateBankTransaction,
    deleteBankTransaction,
  };
};

export default useTreasury;
