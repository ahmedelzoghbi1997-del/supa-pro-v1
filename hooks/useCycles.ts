import { useData } from '../contexts/DataContext';
import type { Cycle } from '../types';

export interface UseCyclesReturn {
  cycles: Cycle[];
  cyclesWithCalculations: Cycle[];
  lastCycleAddedId: string | null;
  setLastCycleAddedId: (id: string | null) => void;
  addCycle: (data: Omit<Cycle, 'id' | 'created_at' | 'user_id' | '_stable_id' | 'revenue' | 'expenses' | 'profit' | 'health'>, transferBalance?: boolean, customTransferAmount?: number) => Promise<void>;
  updateCycle: (data: Cycle, transferBalance?: boolean) => Promise<void>;
  deleteCycle: (id: string) => Promise<boolean>;
  getCycleCashBalance: (id: string) => number;
  getCycleTotalBalance: (id: string) => number;
}

export const useCycles = (): UseCyclesReturn => {
  const {
    cycles,
    cyclesWithCalculations,
    lastCycleAddedId,
    setLastCycleAddedId,
    addCycle,
    updateCycle,
    deleteCycle,
    getCycleCashBalance,
    getCycleTotalBalance,
  } = useData();

  return {
    cycles,
    cyclesWithCalculations,
    lastCycleAddedId,
    setLastCycleAddedId,
    addCycle,
    updateCycle,
    deleteCycle,
    getCycleCashBalance,
    getCycleTotalBalance,
  };
};

export default useCycles;
