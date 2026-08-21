
import React, { useState, useEffect, useRef } from 'react';
import { 
    PlusIcon, 
    InvoicesIcon, 
    ExpensesIcon, 
    CyclesIcon,
    FarmerAccountIcon,
    SuppliersIcon,
    AdvancesIcon
} from '../Icons';
import { useSettings } from '../../contexts/SettingsContext';
import { useData } from '../../contexts/DataContext';

interface FloatingActionButtonProps {
    onAction: (type: string) => void;
}

const FloatingActionButton: React.FC<FloatingActionButtonProps> = ({ onAction }) => {
    const [isOpen, setIsOpen] = useState(false);
    const { settings } = useSettings();
    const { profile } = useData();
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    if (profile?.role === 'viewer' || !!profile?.parent_id) return null;

    const allActions = [
        { id: 'invoice', label: 'فاتورة', icon: InvoicesIcon, color: 'bg-emerald-500', visible: true },
        { id: 'expense', label: 'مصروف', icon: ExpensesIcon, color: 'bg-rose-500', visible: true },
        { id: 'cycle', label: 'عروة', icon: CyclesIcon, color: 'bg-amber-500', visible: true },
        { id: 'withdrawal', label: 'سحب', icon: FarmerAccountIcon, color: 'bg-blue-600', visible: settings.systems.farmer_account },
        { id: 'payment', label: 'دفعة', icon: SuppliersIcon, color: 'bg-indigo-600', visible: settings.systems.suppliers },
        { id: 'advance', label: 'سلفة', icon: AdvancesIcon, color: 'bg-purple-600', visible: settings.systems.advances },
    ];

    const activeActions = allActions.filter(a => a.visible);

    return (
        <div 
            className="fixed left-4 lg:bottom-12 lg:left-12 z-[60] flex flex-col items-center gap-3" 
            ref={menuRef}
            style={{ bottom: 'calc(82px + env(safe-area-inset-bottom, 16px))' }}
        >
            {/* Backdrop Blur when open */}
            {isOpen && (
                <div 
                    className="fixed inset-0 bg-neutral-900/40 backdrop-blur-sm z-[-1] transition-all duration-300"
                    onClick={() => setIsOpen(false)}
                ></div>
            )}

            {/* Actions Menu */}
            <div className={`flex flex-col gap-3 transition-all duration-500 cubic-bezier(0.68, -0.55, 0.265, 1.55) ${isOpen ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-12 scale-50 pointer-events-none'}`}>
                {activeActions.map((action, index) => (
                    <button
                        key={action.id}
                        onClick={() => { onAction(action.id); setIsOpen(false); }}
                        className="flex items-center gap-3 group transition-all"
                        style={{ 
                            transitionDelay: isOpen ? `${index * 40}ms` : '0ms',
                        }}
                    >
                        <span className="bg-white dark:bg-neutral-800 text-neutral-800 dark:text-neutral-100 px-3 py-1.5 rounded-xl text-sm font-bold shadow-lg border border-neutral-100 dark:border-neutral-700 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
                            {action.label}
                        </span>
                        <div className={`p-3.5 rounded-full text-white shadow-xl ${action.color} hover:brightness-110 transition-all transform hover:scale-110 active:scale-90 border-2 border-white/20`}>
                            <action.icon className="w-5 h-5" />
                        </div>
                    </button>
                ))}
            </div>

            {/* Main Toggle Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`group p-4 rounded-full shadow-xl transition-all duration-500 transform hover:scale-105 active:scale-90 ${isOpen ? 'bg-neutral-800 dark:bg-neutral-700 rotate-[135deg] shadow-none' : 'bg-primary text-white'}`}
            >
                <PlusIcon className="w-7 h-7" />
            </button>
        </div>
    );
};

export default FloatingActionButton;
