import React, { createContext, useContext } from 'react';
import { useRealtimeNotifications } from '../hooks/useRealtimeNotifications';
import { useData } from './DataContext';

interface RealtimeNotificationContextType {
  isListening: boolean;
}

const RealtimeNotificationContext = createContext<RealtimeNotificationContextType>({
  isListening: true,
});

export const RealtimeNotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { profile } = useData();
  const effectiveUserId = profile?.parent_id || (profile as any)?.owner_id || profile?.id;

  useRealtimeNotifications({
    effectiveUserId,
    enabled: !!effectiveUserId,
  });

  return (
    <RealtimeNotificationContext.Provider value={{ isListening: !!effectiveUserId }}>
      {children}
    </RealtimeNotificationContext.Provider>
  );
};

export const useRealtimeListener = () => useContext(RealtimeNotificationContext);
