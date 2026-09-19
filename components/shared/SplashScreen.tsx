import React from 'react';
import { motion } from 'motion/react';

interface SplashScreenProps {
  statusText?: string;
  isSwitching?: boolean;
}

export const SplashScreen: React.FC<SplashScreenProps> = () => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-gradient-to-b from-neutral-50 via-white to-neutral-100 dark:from-[#060b13] dark:via-[#090f1d] dark:to-[#050811] select-none overflow-hidden p-6"
    >
      {/* Background Soft Static Ambient Light */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 sm:w-[32rem] h-96 sm:h-[32rem] bg-emerald-500/10 dark:bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 flex flex-col items-center justify-center">
        {/* Static Ambient Edge Glow */}
        <div className="absolute w-72 h-72 sm:w-96 sm:h-96 bg-emerald-400/15 dark:bg-emerald-400/20 rounded-full blur-2xl pointer-events-none" />

        {/* Large Transparent Logo With Subtle Edge Radiance */}
        <div className="relative w-64 h-64 sm:w-80 sm:h-80 md:w-96 md:h-96 max-w-[85vw] max-h-[50vh] flex items-center justify-center">
          <img
            src="/app-logo.png"
            alt="المحاسب الزراعي"
            className="w-full h-full object-contain select-none filter drop-shadow-[0_0_14px_rgba(16,185,129,0.35)] drop-shadow-[0_0_32px_rgba(16,185,129,0.18)] dark:drop-shadow-[0_0_18px_rgba(52,211,153,0.45)] dark:drop-shadow-[0_0_40px_rgba(16,185,129,0.25)]"
            loading="eager"
            decoding="sync"
          />
        </div>
      </div>
    </motion.div>
  );
};

export default SplashScreen;

