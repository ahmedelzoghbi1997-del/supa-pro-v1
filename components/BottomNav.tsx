import React, { useMemo, useTransition } from 'react';
import type { NavItemId, NavItem } from '../types';
import { useNavigationItems } from '../hooks/useNavigationItems';
import { useSettings, terminology } from '../contexts/SettingsContext';
import Button from './shared/Button';

interface BottomNavProps {
    activeItem: NavItemId;
    setActiveItem: (item: NavItemId) => void;
}

const BottomNav: React.FC<BottomNavProps> = ({ activeItem, setActiveItem }) => {
    const visibleNavItems = useNavigationItems();
    const { settings } = useSettings();
    const term = terminology[settings.primaryTerm];
    const [isPending, startTransition] = useTransition();

    const allItems = useMemo(() => visibleNavItems.flatMap(section => section.items), [visibleNavItems]);
        
    const priorityIds = useMemo(() => {
        const ids = ['dashboard', 'invoices', 'expenses'];
        if (settings.systems.labor) {
            ids.push('labor');
        }
        if (settings.systems.farmer_account) {
            ids.push('farmer_account');
        }
        ids.push('treasury'); 
        return ids;
    }, [settings.systems.labor, settings.systems.farmer_account]);
        
    const { bottomBarItems } = useMemo(() => {
        const bottom: NavItem[] = [];
        priorityIds.forEach(id => {
            const item = allItems.find(i => i.id === id);
            if (item) bottom.push(item);
        });
        allItems.forEach(item => {
            if (bottom.length < 5 && !bottom.some(b => b.id === item.id)) bottom.push(item);
        });
        return { bottomBarItems: bottom };
    }, [allItems, priorityIds]);

    const handleItemClick = (id: NavItemId) => {
        if (id !== activeItem) {
            startTransition(() => {
                setActiveItem(id);
            });
        }
    };

    const getShortLabel = (id: string, originalLabel: string) => {
        const labels: Record<string, string> = {
            dashboard: 'الرئيسية', invoices: 'الفواتير', expenses: 'المصروفات', 
            farmer_account: 'المزارع', labor: 'العمالة',
            cycles: term.plural, suppliers: 'الموردين', assets: 'الأصول', weekly_analysis: 'التحليل',
            treasury: 'الخزنة', advances: 'السلف', settings: 'الإعدادات', users: 'المستخدمين', subscription: 'الاشتراك'
        };
        return labels[id] || originalLabel;
    };

    return (
        <>
            <div 
                className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white dark:bg-neutral-900 border-t border-neutral-200 dark:border-neutral-800 shadow-[0_-4px_20px_rgba(0,0,0,0.02)] pb-[env(safe-area-inset-bottom)] in-app-select-none select-none"
            >
                <div className="flex items-center justify-around px-2 py-1.5 relative">
                    {bottomBarItems.map(item => {
                        const isActive = activeItem === item.id;
                        return (
                            <Button
                                key={item.id}
                                variant="ghost"
                                onClick={() => handleItemClick(item.id)}
                                className={`!relative !flex !flex-col !items-center !justify-center !flex-1 !h-[56px] !transition-transform !duration-200 !tap !group !focus:outline-none focus-visible:!ring-2 focus-visible:!ring-primary focus-visible:!ring-offset-2 dark:focus-visible:!ring-offset-neutral-900 !rounded-xl !select-none !p-0 ${isActive && isPending ? 'opacity-70' : ''}`}
                            >
                                <div className={`relative z-10 flex flex-col items-center justify-center gap-1 w-full max-w-[72px] py-1.5 mx-auto transition-colors duration-200 ${isActive ? 'bg-primary/10 dark:bg-primary/15 rounded-2xl' : ''}`}>
                                    <item.icon className={`w-6 h-6 transition-colors duration-200 ${isActive ? 'text-primary dark:text-primary-light' : 'text-neutral-400 dark:text-neutral-500 group-hover:text-neutral-600 dark:group-hover:text-neutral-400'}`} />
                                    <span className={`text-[11px] tracking-wide truncate w-full text-center px-1 transition-colors duration-200 ${isActive ? 'font-black text-primary dark:text-primary-light' : 'font-semibold text-neutral-400 dark:text-neutral-500 group-hover:text-neutral-600 dark:group-hover:text-neutral-400'}`}>{getShortLabel(item.id, item.label)}</span>
                                </div>
                            </Button>
                        );
                    })}
                </div>
            </div>
        </>
    );
};

export default BottomNav;
