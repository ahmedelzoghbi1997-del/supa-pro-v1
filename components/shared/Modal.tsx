import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { XMarkIcon } from '../Icons';
import Button from './Button';
import { triggerLightHaptic } from '../../lib/haptics';
import { useOpenModals } from '../../contexts/OpenModalsContext';

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
  const modalRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  const preventCloseRef = useRef(preventClose);
  const previousActiveElement = useRef<HTMLElement | null>(null);
  const { registerModal, unregisterModal } = useOpenModals();

  // Keep the ref updated with the latest onClose and preventClose functions
  useEffect(() => {
    onCloseRef.current = onClose;
    preventCloseRef.current = preventClose;
  }, [onClose, preventClose]);

  // History and Context management for open modals / back button
  const modalIdRef = useRef(`modal_${Math.random().toString(36).substring(2, 9)}`);

  useEffect(() => {
    if (isOpen) {
      registerModal(modalIdRef.current, () => {
        if (!preventCloseRef.current) {
          onCloseRef.current();
        }
      });
      return () => {
        unregisterModal(modalIdRef.current);
      };
    } else {
      unregisterModal(modalIdRef.current);
    }
  }, [isOpen, registerModal, unregisterModal]);

  useEffect(() => {
    if (isOpen) {
      triggerLightHaptic();
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
  }, [isOpen]);

  // Keyboard (Escape key) & Focus Trap management
  useEffect(() => {
    if (!isOpen) return;

    previousActiveElement.current = document.activeElement as HTMLElement;

    // Focus first focusable element inside modal
    const timer = setTimeout(() => {
      if (modalRef.current) {
        const focusableElements = modalRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        if (focusableElements.length > 0) {
          focusableElements[0].focus();
        } else {
          modalRef.current.focus();
        }
      }
    }, 50);

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !preventCloseRef.current) {
        onCloseRef.current();
        return;
      }

      if (event.key === 'Tab' && modalRef.current) {
        const focusableElements = modalRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        if (focusableElements.length === 0) return;

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (event.shiftKey) {
          if (document.activeElement === firstElement) {
            event.preventDefault();
            lastElement.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            event.preventDefault();
            firstElement.focus();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('keydown', handleKeyDown);
      if (previousActiveElement.current && typeof previousActiveElement.current.focus === 'function') {
        previousActiveElement.current.focus();
      }
    };
  }, [isOpen]);

  // Click outside management
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (backdropRef.current && event.target === backdropRef.current && !preventCloseRef.current) {
        onCloseRef.current();
      }
    };

    if (isOpen) {
      const timer = setTimeout(() => {
        document.addEventListener('click', handleClickOutside);
      }, 0);

      return () => {
        clearTimeout(timer);
        document.removeEventListener('click', handleClickOutside);
      };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const sizeClasses = {
    md: 'max-w-md',
    lg: 'max-w-lg',
    '3xl': 'max-w-3xl',
  };

  const modalContent = (
    <AnimatePresence>
      {isOpen && (
        <div
          ref={backdropRef}
          className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4"
          aria-labelledby="modal-title"
          role="dialog"
          aria-modal="true"
        >
          <motion.div
            ref={modalRef}
            tabIndex={-1}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.7 }}
            onDragEnd={(_event, info) => {
              if (info.offset.y > 100 || info.velocity.y > 400) {
                if (!preventCloseRef.current) {
                  onCloseRef.current();
                }
              }
            }}
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 50, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 320 }}
            className={`relative w-full sm:${sizeClasses[size]} transform-gpu translate-z-0 flex flex-col rounded-t-3xl sm:rounded-modal bg-neutral-0 dark:bg-neutral-800 text-left shadow-elevation-3 transition-colors max-h-[90vh] sm:max-h-[95vh] outline-none`}
          >
            {/* Mobile Sheet Drag Indicator Handle */}
            <div className="w-12 h-1.5 bg-neutral-300 dark:bg-neutral-600 rounded-full mx-auto my-2.5 shrink-0 sm:hidden cursor-grab active:cursor-grabbing" aria-hidden="true" />

            {/* Header */}
            <div className="flex items-start justify-between px-6 py-3 sm:py-4 border-b border-neutral-100 dark:border-neutral-700 shrink-0">
              <h3 className="text-lg font-semibold leading-6 text-neutral-900 dark:text-neutral-50" id="modal-title">
                {title}
              </h3>
              <Button
                variant="ghost"
                size="sm"
                className="!min-h-[44px] !min-w-[44px] !p-0 !inline-flex !items-center !justify-center !rounded-full !text-neutral-400 hover:!bg-neutral-100 dark:hover:!bg-neutral-700 disabled:!opacity-30 disabled:!cursor-not-allowed transition-colors"
                onClick={onClose}
                disabled={preventClose}
                aria-label="Close"
                icon={<XMarkIcon className="h-6 w-6" />}
              />
            </div>
            
            {/* Scrollable Content */}
            <div className="p-4 sm:p-6 overflow-y-auto flex-1">
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
  
  return createPortal(modalContent, document.body);
};

export default Modal;
