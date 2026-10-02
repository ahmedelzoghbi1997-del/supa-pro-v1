
import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { XMarkIcon, CheckCircleIcon, WarningIcon } from '../Icons';

interface ToastProps {
  id: number;
  message: string;
  type: 'success' | 'error';
  duration?: number | null;
  removeToast: (id: number) => void;
}

const Toast: React.FC<ToastProps> = ({ id, message, type, duration, removeToast }) => {
    useEffect(() => {
        if (duration !== null && duration !== undefined) {
            const timer = setTimeout(() => {
                removeToast(id);
            }, duration);
            return () => clearTimeout(timer);
        }
    }, [id, duration, removeToast]);

    const isSuccess = type === 'success';
    
    // تصميم الكبسولة الرشيقة
    const baseClasses = isSuccess 
        ? "bg-accent-success text-white shadow-xl shadow-emerald-500/20 border border-accent-success/50" 
        : "bg-accent-danger text-white shadow-xl shadow-rose-500/20 border border-accent-danger/50";

    return (
        <motion.div 
            layout
            initial={{ opacity: 0, y: -20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -16, scale: 0.92, transition: { duration: 0.15 } }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className={`flex items-center gap-3 px-4 py-2.5 rounded-full pointer-events-auto select-none ${baseClasses}`}
        >
            {/* Simple Icon */}
            <div className="flex-shrink-0">
                {isSuccess ? (
                    <CheckCircleIcon className="w-4 h-4" />
                ) : (
                    <WarningIcon className="w-4 h-4" />
                )}
            </div>

            {/* Content Text */}
            <p className="text-sm font-bold leading-snug max-w-[80vw] sm:max-w-xs">
                {message}
            </p>
            
            {/* Mini Manual Close */}
            <button
                onClick={() => removeToast(id)}
                className="flex-shrink-0 p-1 hover:bg-white/10 rounded-full transition-colors ml-1 cursor-pointer"
                aria-label="إغلاق"
            >
                <XMarkIcon className="w-3 h-3 opacity-60 hover:opacity-100" />
            </button>
        </motion.div>
    );
};

interface ToastContainerProps {
  toasts: { id: number; message: string; type: 'success' | 'error'; duration?: number | null }[];
  removeToast: (id: number) => void;
}

const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, removeToast }) => {
    return (
        <div 
            className="fixed top-4 inset-x-0 z-[250] flex flex-col items-center gap-2 px-4 pointer-events-none"
            style={{ paddingTop: 'env(safe-area-inset-top)' }}
        >
            <AnimatePresence mode="popLayout">
                {toasts.map(toast => (
                    <Toast key={toast.id} {...toast} removeToast={removeToast} />
                ))}
            </AnimatePresence>
        </div>
    );
};

export default ToastContainer;
