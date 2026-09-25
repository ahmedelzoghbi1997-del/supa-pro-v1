import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import ToastContainer from '../components/shared/Toast';

type ToastMessage = {
    id: number;
    message: string;
    type: 'success' | 'error';
    duration?: number | null;
};

type ToastContextType = {
    showToast: (message: string, type?: 'success' | 'error', duration?: number | null) => void;
};

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return context;
};

export function emitToast(message: string, type: 'success' | 'error' = 'success', duration?: number | null) {
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('app-toast', { detail: { message, type, duration } }));
    }
}

export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [toasts, setToasts] = useState<ToastMessage[]>([]);

    const removeToast = useCallback((id: number) => {
        setToasts(prevToasts => prevToasts.filter(toast => toast.id !== id));
    }, []);

    const showToast = useCallback((message: string, type: 'success' | 'error' = 'success', duration?: number | null) => {
        const id = Date.now();
        
        // ضبط المدة لتكون سريعة (3 ثوانٍ) لرسائل النجاح، و 5 ثوانٍ لرسائل الخطأ
        const finalDuration = duration !== undefined ? duration : (type === 'success' ? 3000 : 5000);
        
        // استبدال أي رسالة قديمة من نفس النوع لتجنب الازدحام
        setToasts(prev => {
            const filtered = prev.filter(t => t.type !== type);
            return [...filtered, { id, message, type, duration: finalDuration }];
        });
    }, []);

    useEffect(() => {
        const handleCustomToast = (e: any) => {
            if (e.detail?.message) {
                showToast(e.detail.message, e.detail.type || 'success', e.detail.duration);
            }
        };

        window.addEventListener('app-toast', handleCustomToast);
        return () => window.removeEventListener('app-toast', handleCustomToast);
    }, [showToast]);

    return React.createElement(
        ToastContext.Provider,
        { value: { showToast } },
        children,
        React.createElement(ToastContainer, { toasts, removeToast })
    );
};
