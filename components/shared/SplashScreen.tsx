import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';

interface SplashScreenProps {
  statusText?: string;
  isSwitching?: boolean;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({
  statusText,
  isSwitching = false,
}) => {
  const [progress, setProgress] = useState(15);

  useEffect(() => {
    const timer1 = setTimeout(() => setProgress(45), 150);
    const timer2 = setTimeout(() => setProgress(80), 400);
    const timer3 = setTimeout(() => setProgress(95), 800);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  }, []);

  const displayMessage =
    statusText || (isSwitching ? 'جارٍ تبديل الحساب...' : 'تهيئة النظام وقواعد البيانات...');

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.35, ease: 'easeInOut' }}
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-gradient-to-b from-white via-neutral-50 to-neutral-100 dark:from-[#0b1322] dark:via-[#0f172a] dark:to-[#080d1a] select-none overflow-hidden px-6"
    >
      {/* Dynamic Background Ambient Light */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 sm:w-96 h-80 sm:h-96 bg-emerald-500/10 dark:bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-blue-500/10 dark:bg-blue-600/10 rounded-full blur-2xl pointer-events-none" />

      <div className="relative z-10 flex flex-col items-center max-w-sm w-full">
        {/* Animated Brand Card */}
        <motion.div
          initial={{ scale: 0.85, opacity: 0, y: 15 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          transition={{
            type: 'spring',
            stiffness: 260,
            damping: 22,
            mass: 0.9,
          }}
          className="relative mb-8"
        >
          {/* Subtle Breathing Glow behind the card */}
          <motion.div
            animate={{
              scale: [1, 1.08, 1],
              opacity: [0.35, 0.6, 0.35],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
            className="absolute -inset-2 bg-gradient-to-r from-emerald-500/30 to-teal-500/30 dark:from-emerald-400/20 dark:to-teal-400/20 rounded-[2.5rem] blur-xl"
          />

          {/* Logo Container Card */}
          <div className="relative overflow-hidden w-28 h-28 sm:w-32 sm:h-32 rounded-[2.25rem] bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-700/70 p-4 shadow-xl shadow-emerald-950/5 dark:shadow-black/50 flex items-center justify-center">
            <img
              src="/app-logo.png"
              alt="المحاسب الزراعي"
              className="w-full h-full object-contain select-none"
              loading="eager"
              decoding="sync"
            />

            {/* Shimmer light sweep across the logo */}
            <motion.div
              initial={{ x: '-150%' }}
              animate={{ x: '150%' }}
              transition={{
                repeat: Infinity,
                duration: 2.2,
                repeatDelay: 1,
                ease: 'easeInOut',
              }}
              className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/40 dark:via-white/15 to-transparent skew-x-12 pointer-events-none"
            />
          </div>
        </motion.div>

        {/* Brand Typography */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.4 }}
          className="text-center mb-8"
        >
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-neutral-900 dark:text-neutral-50 mb-1.5 font-sans">
            المحاسب الزراعي
          </h1>
          <p className="text-xs sm:text-sm font-semibold text-emerald-600 dark:text-emerald-400">
            الأجندة الزراعية الذكية والمحاسبة المالية
          </p>
        </motion.div>

        {/* Sleek Minimalist Linear Progress Bar */}
        <div className="w-48 sm:w-56 flex flex-col items-center gap-3">
          <div className="w-full h-1.5 bg-neutral-200/70 dark:bg-neutral-800 rounded-full overflow-hidden p-0.5 relative">
            <motion.div
              className="h-full bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-500 rounded-full"
              initial={{ width: '10%' }}
              animate={{ width: `${progress}%` }}
              transition={{ ease: 'easeInOut', duration: 0.5 }}
            />
          </div>

          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.25 }}
            className="text-[11px] font-bold text-neutral-400 dark:text-neutral-400 font-mono tracking-wide"
          >
            {displayMessage}
          </motion.span>
        </div>
      </div>
    </motion.div>
  );
};

export default SplashScreen;
