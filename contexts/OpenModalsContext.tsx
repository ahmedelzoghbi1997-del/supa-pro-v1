import React, { createContext, useContext, useRef, useCallback } from 'react';

export interface OpenModalsContextType {
  registerModal: (id: string, closeFn?: () => void) => void;
  unregisterModal: (id: string) => void;
  isAnyModalOpen: () => boolean;
}

const OpenModalsContext = createContext<OpenModalsContextType | null>(null);

export const OpenModalsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const openModalsRef = useRef<Map<string, (() => void) | undefined>>(new Map());

  const registerModal = useCallback((id: string, closeFn?: () => void) => {
    openModalsRef.current.set(id, closeFn);
  }, []);

  const unregisterModal = useCallback((id: string) => {
    openModalsRef.current.delete(id);
  }, []);

  const isAnyModalOpen = useCallback(() => {
    return openModalsRef.current.size > 0;
  }, []);

  return (
    <OpenModalsContext.Provider value={{ registerModal, unregisterModal, isAnyModalOpen }}>
      {children}
    </OpenModalsContext.Provider>
  );
};

export const useOpenModals = (): OpenModalsContextType => {
  const context = useContext(OpenModalsContext);
  if (!context) {
    return {
      registerModal: () => {},
      unregisterModal: () => {},
      isAnyModalOpen: () => false,
    };
  }
  return context;
};

export { OpenModalsContext };
