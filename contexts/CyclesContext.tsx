import React, { createContext, useContext } from 'react';
import type { Cycle } from '../types';

export interface CyclesContextType {
  cycles: Cycle[];
  cyclesWithCalculations: Cycle[];
  lastCycleAddedId: string | null;
  setLastCycleAddedId: (id: string | null) => void;
  addCycle: (
    data: Omit<Cycle, 'id' | 'created_at' | 'user_id' | '_stable_id' | 'revenue' | 'expenses' | 'profit' | 'health'>,
    transferBalance?: boolean,
    customTransferAmount?: number
  ) => Promise<void>;
  updateCycle: (data: Cycle, transferBalance?: boolean) => Promise<void>;
  deleteCycle: (id: string) => Promise<boolean>;
  getCycleCashBalance: (id: string) => number;
  getCycleTotalBalance: (id: string) => number;
}

export const CyclesContext = createContext<CyclesContextType | undefined>(undefined);

export const useCyclesData = (): CyclesContextType => {
  const context = useContext(CyclesContext);
  if (!context) {
    throw new Error('useCyclesData must be used within a CyclesProvider or DataProvider');
  }
  return context;
};

export const CyclesProvider: React.FC<{
  value: CyclesContextType;
  children: React.ReactNode;
}> = ({ value, children }) => {
  return (
    <CyclesContext.Provider value={value}>
      {children}
    </CyclesContext.Provider>
  );
};
