import { useDailyLogsData } from '../contexts/DailyLogsContext';
import type { DailyLog } from '../types';

export interface UseDailyLogsReturn {
  dailyLogs: DailyLog[];
  addDailyLog: (log: Omit<DailyLog, 'id' | 'created_at' | 'user_id' | '_stable_id'>) => Promise<void>;
  updateDailyLog: (log: DailyLog) => Promise<void>;
  deleteDailyLog: (id: string) => Promise<boolean>;
}

export const useDailyLogs = (): UseDailyLogsReturn => {
  const { dailyLogs, addDailyLog, updateDailyLog, deleteDailyLog } = useDailyLogsData();
  return { dailyLogs, addDailyLog, updateDailyLog, deleteDailyLog };
};

export default useDailyLogs;
