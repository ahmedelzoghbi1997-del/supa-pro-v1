import React, { useMemo, useState, useEffect } from 'react';
import type { NavItemId, NavItem } from '../types';
import { useNavigationItems } from '../hooks/useNavigationItems';
import { useSettings, getTerminology } from '../contexts/SettingsContext';
import { translateText } from '../lib/i18n';

interface BottomNavProps {
    activeItem: NavItemId;
    setActiveItem: (item: NavItemId) => void;
}

const BottomNav: React.FC<BottomNavProps> = ({ activeItem, setActiveItem }) => {
    const visibleNavItems = useNavigationItems();
    const { settings } = useSettings();
    const isEn = settings.language === 'en';
    const term = getTerminology(settings.primaryTerm, settings.language || 'ar');

    // حالة محلية مسؤولة فقط عن تلوين الزر بسرعة البرق
    const [localActiveItem, setLocalActiveItem] = useState<NavItemId>(activeItem);

    // مزامنة الحالة إذا تغيرت الصفحة من مكان آخر
    useEffect(() => {
        setLocalActiveItem(activeItem);
    }, [activeItem]);

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
        if (id !== localActiveItem) {
            // 1. تلوين الزر فوراً في نفس اللحظة
            setLocalActiveItem(id);
            
            // 2. إجبار المتصفح على رسم اللون الجديد، ثم إرسال أمر تحميل الصفحة الثقيلة
            requestAnimationFrame(() => {
                setTimeout(() => {
                    setActiveItem(id);
                }, 0);
            });
        }
    };

    const getShortLabel = (id: string, originalLabel: string) => {
        if (isEn) {
            const enLabels: Record<string, string> = {
                dashboard: 'Home', invoices: 'Invoices', expenses: 'Expenses', 
                farmer_account: 'Farmer', labor: 'Labor',
                cycles: term.plural, suppliers: 'Suppliers', assets: 'Assets', weekly_analysis: 'Analysis',
                treasury: 'Treasury', advances: 'Advances', settings: 'Settings', users: 'Users', subscription: 'Subscription'
            };
            return enLabels[id] || translateText(originalLabel, 'en');
        }
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
                className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white dark:bg-[#0a0a0a] border-t border-neutral-200 dark:border-neutral-800 shadow-[0_-4px_20px_rgba(0,0,0,0.02)]"
                style={{ paddingBottom: 'env(safe-area-inset-bottom, 24px)' }}
            >
                <div className="flex items-center justify-around px-2 py-1.5 relative">
                    {bottomBarItems.map(item => {
                        const isActive = localActiveItem === item.id;
                        return (
                            <button
                                key={item.id}
                                onClick={() => handleItemClick(item.id)}
                                className="relative flex flex-col items-center justify-center flex-1 h-[56px] transition-transform duration-200 active:scale-90 group outline-none select-none"
                            >
                                <div className={`relative z-10 flex flex-col items-center justify-center gap-1 w-full max-w-[72px] py-1.5 mx-auto transition-colors duration-200 ${isActive ? 'bg-indigo-50 dark:bg-indigo-500/15 rounded-2xl' : ''}`}>
                                    <item.icon className={`w-6 h-6 transition-colors duration-200 ${isActive ? 'text-indigo-700 dark:text-indigo-300' : 'text-neutral-400 dark:text-neutral-500 group-hover:text-neutral-600 dark:group-hover:text-neutral-400'}`} />
                                    <span className={`text-[11px] tracking-wide truncate w-full text-center px-1 transition-colors duration-200 ${isActive ? 'font-black text-indigo-700 dark:text-indigo-300' : 'font-semibold text-neutral-400 dark:text-neutral-500 group-hover:text-neutral-600 dark:group-hover:text-neutral-400'}`}>{getShortLabel(item.id, item.label)}</span>
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>
        </>
    );
};

export default BottomNav;
