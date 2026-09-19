import React from 'react';
import { motion } from 'motion/react';

interface InlineLoadingProps {
  message?: string;
  subMessage?: string;
}

export const InlineLoading: React.FC<InlineLoadingProps> = ({
  message = 'جارٍ تحميل البيانات والتقارير...',
  subMessage,
}) => {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 w-full select-none">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="relative mb-5"
      >
        <div className="w-16 h-16 flex items-center justify-center">
          <img
            src="/app-logo.png"
            alt="المحاسب الزراعي"
            className="w-full h-full object-contain filter drop-shadow-sm"
          />
        </div>
        <motion.div
          animate={{ scale: [1, 1.15, 1], opacity: [0.3, 0.7, 0.3] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute -inset-1 bg-emerald-500/20 rounded-2xl blur-md -z-10"
        />
      </motion.div>

      <div className="w-36 h-1 bg-neutral-200/80 dark:bg-neutral-800 rounded-full overflow-hidden mb-3">
        <motion.div
          className="h-full bg-emerald-500 rounded-full"
          animate={{
            x: ['-100%', '100%'],
          }}
          transition={{
            repeat: Infinity,
            duration: 1.4,
            ease: 'easeInOut',
          }}
        />
      </div>

      <p className="text-xs sm:text-sm font-bold text-neutral-600 dark:text-neutral-300 text-center">
        {message}
      </p>
      {subMessage && (
        <p className="text-[11px] font-medium text-neutral-400 dark:text-neutral-500 mt-1 text-center">
          {subMessage}
        </p>
      )}
    </div>
  );
};

export default InlineLoading;
