import React, { createContext, useContext } from "react";

export interface SplashTransitionContextType {
  isTransitioning: boolean;
  hasTransitionCompleted: boolean;
  completeTransition: () => void;
}

const SplashTransitionContext = createContext<SplashTransitionContextType>({
  isTransitioning: false,
  hasTransitionCompleted: false,
  completeTransition: () => {},
});

export const SplashTransitionProvider: React.FC<{
  value: SplashTransitionContextType;
  children: React.ReactNode;
}> = ({ value, children }) => {
  return (
    <SplashTransitionContext.Provider value={value}>
      {children}
    </SplashTransitionContext.Provider>
  );
};

export const useSplashTransition = () => useContext(SplashTransitionContext);
