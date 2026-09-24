import { useData } from '../contexts/DataContext';
import type { Farmer, FarmerWithdrawal } from '../types';

export interface UseFarmersReturn {
  farmers: Farmer[];
  farmerWithdrawals: FarmerWithdrawal[];
  lastFarmerAddedId: string | null;
  setLastFarmerAddedId: (id: string | null) => void;
  addFarmer: (name: string) => Promise<void>;
  updateFarmer: (farmer: Farmer) => Promise<void>;
  deleteFarmer: (id: string) => Promise<boolean>;
  addFarmerWithdrawal: (withdrawal: Omit<FarmerWithdrawal, 'id' | 'created_at' | 'user_id' | '_stable_id'>) => Promise<void>;
  updateFarmerWithdrawal: (withdrawal: FarmerWithdrawal) => Promise<void>;
  deleteFarmerWithdrawal: (id: string) => Promise<void>;
  totalFarmerShare: number;
}

export const useFarmers = (): UseFarmersReturn => {
  const {
    farmers,
    farmerWithdrawals,
    lastFarmerAddedId,
    setLastFarmerAddedId,
    addFarmer,
    updateFarmer,
    deleteFarmer,
    addFarmerWithdrawal,
    updateFarmerWithdrawal,
    deleteFarmerWithdrawal,
    totalFarmerShare,
  } = useData();

  return {
    farmers,
    farmerWithdrawals,
    lastFarmerAddedId,
    setLastFarmerAddedId,
    addFarmer,
    updateFarmer,
    deleteFarmer,
    addFarmerWithdrawal,
    updateFarmerWithdrawal,
    deleteFarmerWithdrawal,
    totalFarmerShare,
  };
};

export default useFarmers;
