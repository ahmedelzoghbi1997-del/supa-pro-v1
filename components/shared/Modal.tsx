import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { XMarkIcon } from '../Icons';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: 'md' | 'lg' | '3xl';
  preventClose?: boolean;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, size = 'md', preventClose = false }) => {
  const backdropRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  const preventCloseRef = useRef(preventClose);

  // Keep the ref updated with the latest onClose and preventClose functions
  useEffect(() => {
    onCloseRef.current = onClose;
    preventCloseRef.current = preventClose;
  }, [onClose, preventClose]);

  // History management for back button
  const modalIdRef = useRef(`modal_${Math.random().toString(36).substring(2, 9)}`);

  useEffect(() => {
    if (isOpen) {
      window.history.pushState({ ...window.history.state, modal: modalIdRef.current }, '');

      const handlePopState = () => {
        if (!preventCloseRef.current) {
          onCloseRef.current();
        } else {
          // If we prevent close, we need to push the state back to keep the modal open
          window.history.pushState({ ...window.history.state, modal: modalIdRef.current }, '');
        }
      };

      window.addEventListener('popstate', handlePopState);
      
      return () => {
        window.removeEventListener('popstate', handlePopState);
        if (window.history.state?.modal === modalIdRef.current) {
          window.history.back();
        }
      };
    }
  }, [isOpen]); // Dependency array only has isOpen

  // Keyboard (Escape key) management
  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !preventCloseRef.current) {
        onCloseRef.current();
      }
    };

    if (isOpen) {
      window.addEventListener('keydown', handleEsc);
    }
    
    return () => {
      window.removeEventListener('keydown', handleEsc);
    };
  }, [isOpen]); // Dependency array only has isOpen

  // Click outside management
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
        if (backdropRef.current && event.target === backdropRef.current && !preventCloseRef.current) {
            onCloseRef.current();
        }
    };

    if (isOpen) {
        // Use timeout to prevent the click that opened the modal from closing it
        const timer = setTimeout(() => {
            document.addEventListener('click', handleClickOutside);
        }, 0);

        return () => {
            clearTimeout(timer);
            document.removeEventListener('click', handleClickOutside);
        };
    }
  }, [isOpen]); // Dependency array only has isOpen


  if (!isOpen) return null;

  const sizeClasses = {
      md: 'max-w-md',
      lg: 'max-w-lg',
      '3xl': 'max-w-3xl',
  };

  const modalContent = (
    <div
      ref={backdropRef}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-page-enter p-4 will-change-opacity"
      aria-labelledby="modal-title"
      role="dialog"
      aria-modal="true"
    >
      <div
        className={`relative w-full ${sizeClasses[size]} transform-gpu translate-z-0 will-change-transform will-change-[opacity,transform] flex flex-col rounded-xl bg-neutral-0 dark:bg-neutral-800 text-left shadow-xl transition-all animate-modal-enter max-h-[95vh]`}
      >
        {/* Header */}
        <div className="flex items-start justify-between px-6 py-4 border-b border-neutral-100 dark:border-neutral-700 shrink-0">
            <h3 className="text-lg font-semibold leading-6 text-neutral-900 dark:text-neutral-50" id="modal-title">
                {title}
            </h3>
            <button
                type="button"
                className="p-1 rounded-full text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                onClick={onClose}
                disabled={preventClose}
                aria-label="Close"
            >
                <XMarkIcon className="h-6 w-6" />
            </button>
        </div>
        
        {/* Scrollable Content */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1">
            {children}
        </div>
      </div>
    </div>
  );
  
  return createPortal(modalContent, document.body);
};

export default Modal;
