
import React, { useEffect } from 'react';
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
        ? "bg-emerald-600 text-white shadow-xl shadow-emerald-500/20 border border-emerald-500/50" 
        : "bg-rose-600 text-white shadow-xl shadow-rose-500/20 border border-rose-500/50";

    return (
        <div className={`flex items-center gap-3 px-4 py-2 rounded-full animate-enter transition-all pointer-events-auto ${baseClasses}`}>
            {/* Simple Icon */}
            <div className="flex-shrink-0">
                {isSuccess ? (
                    <CheckCircleIcon className="w-4 h-4" />
                ) : (
                    <WarningIcon className="w-4 h-4" />
                )}
            </div>

            {/* Content Text */}
            <p className="text-[11px] font-black whitespace-nowrap leading-none tracking-tight">
                {message}
            </p>
            
            {/* Mini Manual Close */}
            <button
                onClick={() => removeToast(id)}
                className="flex-shrink-0 p-1 hover:bg-white/10 rounded-full transition-colors ml-1"
                aria-label="إغلاق"
            >
                <XMarkIcon className="w-3 h-3 opacity-60" />
            </button>
        </div>
    );
};

interface ToastContainerProps {
  toasts: { id: number; message: string; type: 'success' | 'error'; duration?: number | null }[];
  removeToast: (id: number) => void;
}

const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, removeToast }) => {
    if (toasts.length === 0) return null;

    return (
        <div className="fixed top-4 inset-x-0 z-[250] flex flex-col items-center gap-2 px-4 pointer-events-none">
            {toasts.map(toast => (
                <Toast key={toast.id} {...toast} removeToast={removeToast} />
            ))}
        </div>
    );
};

export default ToastContainer;
