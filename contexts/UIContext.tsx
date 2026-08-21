import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';

export interface UIContextType {
  loading: boolean;
  setLoading: (loading: boolean) => void;
  isPhase2Loading: boolean;
  setIsPhase2Loading: (loading: boolean) => void;
  loadingMessage: string | null;
  setLoadingMessage: (message: string | null) => void;
  setLoadingState: (loading: boolean, message: string | null) => void;
  highlightedItemId: string | null;
  setHighlightedItemId: (id: string | null) => void;
  statementAction: { route: string; parentId: string } | null;
  setStatementAction: (action: { route: string; parentId: string } | null) => void;
  isOffline: boolean;
  setIsOffline: (offline: boolean) => void;
  isSyncing: boolean;
  setIsSyncing: (syncing: boolean) => void;
  presences: Record<string, any>;
  setPresences: React.Dispatch<React.SetStateAction<Record<string, any>>>;
  notifications: any[];
  setNotifications: React.Dispatch<React.SetStateAction<any[]>>;
  markNotificationAsRead: (id: string) => void;
  markAllNotificationsAsRead: () => void;
  clearNotifications: () => void;
}

const UIContext = createContext<UIContextType | undefined>(undefined);

export const UIProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [loading, setLoading] = useState(true);
  const [isPhase2Loading, setIsPhase2Loading] = useState(true);
  const [loadingMessage, setLoadingMessage] = useState<string | null>(null);
  const [highlightedItemId, setHighlightedItemId] = useState<string | null>(null);
  const [statementAction, setStatementAction] = useState<{ route: string; parentId: string } | null>(null);
  const [presences, setPresences] = useState<Record<string, any>>({});
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const setLoadingState = useCallback((l: boolean, m: string | null) => {
    setLoading(l);
    setLoadingMessage(m);
  }, []);

  const markNotificationAsRead = useCallback((id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
  }, []);

  const markAllNotificationsAsRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
  }, []);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  const value: UIContextType = {
    loading,
    setLoading,
    isPhase2Loading,
    setIsPhase2Loading,
    loadingMessage,
    setLoadingMessage,
    setLoadingState,
    highlightedItemId,
    setHighlightedItemId,
    statementAction,
    setStatementAction,
    isOffline,
    setIsOffline,
    isSyncing,
    setIsSyncing,
    presences,
    setPresences,
    notifications,
    setNotifications,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    clearNotifications,
  };

  return <UIContext.Provider value={value}>{children}</UIContext.Provider>;
};

export const useUI = () => {
  const context = useContext(UIContext);
  if (!context) {
    throw new Error('useUI must be used within a UIProvider');
  }
  return context;
};
