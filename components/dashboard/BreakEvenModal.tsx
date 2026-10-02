import React, { useEffect, useState } from 'react';
import { Rocket, X } from 'lucide-react';
import { formatCurrency } from '../../utils/helpers';

interface BreakEvenModalProps {
  isOpen: boolean;
  onClose: () => void;
  totalExpenses: number;
}

const BreakEvenModal: React.FC<BreakEvenModalProps> = ({ isOpen, onClose, totalExpenses }) => {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // Small delay for animation
      setTimeout(() => setShow(true), 50);
    } else {
      setShow(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
      {/* Backdrop */}
      <div 
        className={`absolute inset-0 bg-neutral-900/60 backdrop-blur-sm transition-opacity duration-500 ${show ? 'opacity-100' : 'opacity-0'}`}
        onClick={onClose}
      />
      
      {/* Modal */}
      <div 
        className={`relative w-full max-w-md bg-white dark:bg-neutral-900 rounded-3xl shadow-2xl overflow-hidden transition-all duration-500 transform ${show ? 'scale-100 opacity-100 translate-y-0' : 'scale-95 opacity-0 translate-y-8'}`}
      >
        {/* Decorative Header */}
        <div className="relative h-32 bg-gradient-to-br from-emerald-500 to-emerald-700 p-6 flex items-center justify-center overflow-hidden">
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 mix-blend-overlay"></div>
          <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
          <div className="absolute -top-10 -left-10 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
          
          <div className="relative z-10 w-16 h-16 bg-white/20 backdrop-blur-md rounded-2xl border border-white/30 flex items-center justify-center shadow-inner">
            <Rocket className="w-8 h-8 text-white drop-shadow-md animate-bounce" />
          </div>
        </div>

        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 z-20 p-2 bg-black/10 hover:bg-black/20 text-white rounded-full backdrop-blur-md transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Content */}
        <div className="p-6 sm:p-8 text-center">
          <h3 className="text-2xl font-black text-neutral-900 dark:text-white mb-2">
            تهانينا! نقطة التعادل 🎉
          </h3>
          <p className="text-neutral-600 dark:text-neutral-400 leading-relaxed mb-6">
            لقد وصلت إلى نقطة التعادل (Break-even). تم تغطية جميع تكاليف التأسيس والتشغيل بنجاح 
            <span className="inline-block font-bold text-accent-success dark:text-accent-success mx-1 bg-accent-success/10 dark:bg-accent-success/20 px-2 py-0.5 rounded-md">
              ({formatCurrency(totalExpenses)})
            </span>.
            <br className="hidden sm:block" />
            كل جنيه يدخل المزرعة من الآن فصاعداً هو <strong className="text-neutral-900 dark:text-white">ربح صافي</strong>.
          </p>

          <button 
            onClick={onClose}
            className="w-full py-3.5 px-4 bg-accent-success hover:bg-accent-success text-white font-bold rounded-xl shadow-lg shadow-emerald-500/30 transition-all tap"
          >
            مرحباً بالأرباح
          </button>
        </div>
      </div>
    </div>
  );
};

export default BreakEvenModal;
