
import React, { useState, useRef, useEffect } from 'react';
import { 
    PlusIcon, 
    InvoicesIcon, 
    ExpensesIcon, 
    FarmerAccountIcon,
    SuppliersIcon
} from '../Icons';
import { useSettings } from '../../contexts/SettingsContext';
import { useData } from '../../contexts/DataContext';
import Button from './Button';

interface HeaderQuickActionsProps {
    onAction: (type: string) => void;
}

const HeaderQuickActions: React.FC<HeaderQuickActionsProps> = ({ onAction }) => {
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

    const isViewer = profile?.role === 'viewer';

    if (isViewer) return null;

    const allActions = [
        { id: 'invoice', label: 'فاتورة بيع جديدة', icon: InvoicesIcon, color: 'text-accent-success', bgColor: 'bg-accent-success/10 dark:bg-accent-success/10', visible: true },
        { id: 'expense', label: 'تسجيل مصروف', icon: ExpensesIcon, color: 'text-accent-danger', bgColor: 'bg-accent-danger/10 dark:bg-accent-danger/10', visible: true },
        { id: 'withdrawal', label: 'سحب نقدي لمزارع', icon: FarmerAccountIcon, color: 'text-accent-info', bgColor: 'bg-accent-info/10 dark:bg-accent-info/10', visible: settings.systems.farmer_account },
        { id: 'payment', label: 'سداد دفعة لمورد', icon: SuppliersIcon, color: 'text-accent-info', bgColor: 'bg-accent-info/10 dark:bg-accent-info/10', visible: settings.systems.suppliers },
    ];

    const activeActions = allActions.filter(a => a.visible);

    return (
        <div className="relative select-none" ref={menuRef}>
            <Button
                variant={isOpen ? 'secondary' : 'primary'}
                onClick={() => setIsOpen(!isOpen)}
                className={`
                    !flex !items-center !justify-center !w-10 !h-10 !rounded-xl !p-0 transition-all duration-300 shadow-sm border
                    ${isOpen 
                        ? '!bg-neutral-800 !text-white !border-neutral-800 ring-4 ring-neutral-100 dark:ring-neutral-800/30' 
                        : '!bg-primary !text-white !border-primary hover:!bg-primary-dark hover:shadow-lg tap'
                    }
                `}
                aria-label="إجراء جديد"
            >
                <PlusIcon className={`w-6 h-6 transition-transform duration-500 ${isOpen ? 'rotate-[135deg]' : ''}`} />
            </Button>

            {/* Dropdown Menu */}
            {isOpen && (
                <div className="absolute top-full left-0 mt-3 w-64 bg-white dark:bg-neutral-900 rounded-[1.5rem] shadow-2xl border border-neutral-200 dark:border-neutral-700 overflow-hidden z-[100] animate-menu-snappy origin-top-left">
                    <div className="p-2 space-y-1">
                        <div className="px-4 py-2 mb-1">
                            <p className="text-2xs font-black text-neutral-400 uppercase tracking-widest">ماذا تريد أن تفعل؟</p>
                        </div>
                        {activeActions.map((action) => (
                            <Button
                                key={action.id}
                                variant="ghost"
                                onClick={() => { onAction(action.id); setIsOpen(false); }}
                                className="!w-full !flex !items-center !justify-start !gap-3 !px-3 !py-3 !rounded-xl hover:!bg-neutral-50 dark:hover:!bg-neutral-800 transition-all group text-right font-normal"
                            >
                                <div className={`p-2.5 rounded-lg shrink-0 transition-transform group-hover:scale-110 ${action.bgColor} ${action.color}`}>
                                    <action.icon className="w-5 h-5" />
                                </div>
                                <span className="text-sm font-bold text-neutral-700 dark:text-neutral-200 group-hover:text-primary transition-colors">
                                    {action.label}
                                </span>
                            </Button>
                        ))}
                    </div>
                    <div className="bg-neutral-50 dark:bg-neutral-800/50 p-3 text-center border-t border-neutral-100 dark:border-neutral-700">
                         <p className="text-2xs font-bold text-neutral-400">نظام الإدخال السريع</p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default HeaderQuickActions;
