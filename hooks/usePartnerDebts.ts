import { useTreasuryData } from '../contexts/TreasuryContext';
import type { PartnerDebt } from '../types';

export interface UsePartnerDebtsReturn {
  partnerDebts: PartnerDebt[];
  addPartnerDebt: (data: Omit<PartnerDebt, 'id' | 'created_at' | 'user_id' | '_stable_id'>) => Promise<void>;
  updatePartnerDebt: (data: PartnerDebt) => Promise<void>;
  deletePartnerDebt: (id: string) => Promise<void>;
}

export const usePartnerDebts = (): UsePartnerDebtsReturn => {
  const { partnerDebts, addPartnerDebt, updatePartnerDebt, deletePartnerDebt } = useTreasuryData();
  return { partnerDebts, addPartnerDebt, updatePartnerDebt, deletePartnerDebt };
};

export default usePartnerDebts;
