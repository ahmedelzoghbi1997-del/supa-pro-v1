import React, { createContext, useContext } from 'react';
import type { DailyLog, Asset } from '../types';

export interface DailyLogsContextType {
  dailyLogs: DailyLog[];
  addDailyLog: (log: Omit<DailyLog, 'id' | 'created_at' | 'user_id' | '_stable_id'>) => Promise<void>;
  updateDailyLog: (log: DailyLog) => Promise<void>;
  deleteDailyLog: (id: string) => Promise<boolean>;
  assets: Asset[];
  addAsset: (asset: Omit<Asset, 'id' | 'created_at' | 'user_id' | '_stable_id'>) => Promise<void>;
  updateAsset: (asset: Asset) => Promise<void>;
  deleteAsset: (id: string) => Promise<boolean>;
}

export const DailyLogsContext = createContext<DailyLogsContextType | undefined>(undefined);

export const useDailyLogsData = (): DailyLogsContextType => {
  const context = useContext(DailyLogsContext);
  if (!context) {
    throw new Error('useDailyLogsData must be used within a DailyLogsProvider or DataProvider');
  }
  return context;
};

export const DailyLogsProvider: React.FC<{
  value: DailyLogsContextType;
  children: React.ReactNode;
}> = ({ value, children }) => {
  return (
    <DailyLogsContext.Provider value={value}>
      {children}
    </DailyLogsContext.Provider>
  );
};
