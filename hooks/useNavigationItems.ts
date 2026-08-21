import { useMemo } from 'react';
import { navItems } from '../constants';
import type { NavSection, AppSystem } from '../types';
import { SubscriptionIcon } from '../components/Icons';
import { useSettings, terminology } from '../contexts/SettingsContext';
import { useData } from '../contexts/DataContext';

const systemToNavItem: Record<AppSystem, string> = {
    treasury: 'treasury',
    advances: 'advances',
    farmer_account: 'farmer_account',
    suppliers: 'suppliers',
    labor: 'labor',
    partners_wallet: 'partners',
};

export const useNavigationItems = () => {
    const { settings } = useSettings();
    const { profile } = useData();
    const term = terminology[settings.primaryTerm];

    const visibleNavItems = useMemo<NavSection[]>(() => {
        if (!profile) return [];

        const enabledSystems = Object.entries(settings.systems)
            .filter(([, isEnabled]) => isEnabled)
            .map(([systemKey]) => systemToNavItem[systemKey as AppSystem]);

        const processedNavItems: NavSection[] = navItems.map(section => ({
            ...section,
            items: [...section.items].map(item => {
                if (item.id === 'cycles') {
                    return { ...item, label: `إدارة ${term.plural}` };
                }
                return item;
            }),
        }));

        if (profile.role === 'user') {
            const appSection = processedNavItems.find(section => section.title === 'التطبيق');
            if (appSection) {
                if (!appSection.items.some(item => item.id === 'subscription')) {
                    appSection.items.push({ id: 'subscription', label: 'الاشتراك', icon: SubscriptionIcon });
                }
            }
        }

        return processedNavItems
            .map(section => ({
                ...section,
                items: section.items.filter(item => {
                    if (item.id === 'users' && profile.role !== 'owner') {
                        return false;
                    }
                    if (profile.role === 'viewer') {
                        if (item.id === 'settings' || item.id === 'subscription' || item.id === 'labor') {
                            return false;
                        }
                    }
                    const matchingSystem = Object.keys(systemToNavItem).find(
                        sys => systemToNavItem[sys as AppSystem] === item.id
                    );
                    if (matchingSystem) {
                        return enabledSystems.includes(item.id);
                    }
                    return true;
                }),
            }))
            .filter(section => section.items.length > 0);
    }, [settings.systems, profile, term]);

    return visibleNavItems;
};
