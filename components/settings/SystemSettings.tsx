import React from 'react';
import { useSettings } from '../../contexts/SettingsContext';
import { useData } from '../../contexts/DataContext';
import { useToast } from '../../hooks/useToast';
import { WarningIcon } from '../Icons';
import { AppSystem } from '../../types';

const ToggleSwitch = ({ checked, onChange, disabled = false }: { checked: boolean, onChange: (checked: boolean) => void, disabled?: boolean }) => {
    return (
        <label className={`relative inline-flex items-center ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
            <input 
                type="checkbox" 
                checked={checked} 
                onChange={(e) => !disabled && onChange(e.target.checked)} 
                className="sr-only peer" 
                disabled={disabled} 
            />
            <div className={`w-14 h-8 bg-gray-200 dark:bg-gray-600 rounded-full peer peer-focus:ring-2 peer-focus:ring-accent-success peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-1 after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-accent-success ${disabled ? 'opacity-40' : ''}`}></div>
        </label>
    );
};

interface SystemToggleProps {
    title: string;
    description: string;
    system: AppSystem;
    dependency?: AppSystem;
}

const SystemToggle: React.FC<SystemToggleProps> = ({ title, description, system, dependency }) => {
    const { settings, updateSettings } = useSettings();
    const { farmers, farmerWithdrawals, suppliers, supplierPayments, advances, expenses, expenseCategories, partnerDebts } = useData();
    const { showToast } = useToast();
    
    const isEnabled = settings.systems[system];
    const isDependencyEnabled = dependency ? settings.systems[dependency] : true;

    const hasData = React.useMemo(() => {
        if (!isEnabled) return false;
        switch (system) {
            case 'farmer_account': return false; // Allow disabling even if data exists
            case 'suppliers': return suppliers.length > 0 || supplierPayments.length > 0;
            case 'advances': return advances.length > 0;
            case 'partners_wallet': return Object.keys(settings.person_partner_percentages || {}).length > 0 || (partnerDebts && partnerDebts.length > 0);
            case 'treasury': return settings.systems.advances;
            case 'labor': {
                const laborCategoryIds = expenseCategories
                    .filter(c => c.name.includes('عمالة') || c.name.includes('عماله') || c.name.includes('يومية') || c.name.includes('عامل'))
                    .map(c => c.id);
                return expenses.some(e => laborCategoryIds.includes(e.category_id));
            }
            default: return false;
        }
    }, [system, isEnabled, farmers, farmerWithdrawals, suppliers, supplierPayments, advances, settings.systems.advances, expenses, expenseCategories, partnerDebts]);

    const isDisabled = !isDependencyEnabled || (isEnabled && hasData);

    const handleChange = (checked: boolean) => {
        if (!checked && hasData) {
            showToast('لا يمكن تعطيل النظام لوجود بيانات مسجلة به.', 'error');
            return;
        }

        updateSettings({ systems: { ...settings.systems, [system]: checked } });
    };

    return (
        <div className={`flex flex-col sm:flex-row justify-between sm:items-center gap-4 bg-white dark:bg-neutral-800 p-4 rounded-lg border ${hasData && isEnabled ? 'border-accent-warning/20 dark:border-accent-warning/30' : 'border-transparent'}`}>
            <div className="flex-1">
                <div className="flex items-center gap-2">
                    <h4 className={`font-semibold text-lg ${!isDependencyEnabled ? 'text-neutral-400 dark:text-neutral-500' : 'text-slate-800 dark:text-white'}`}>{title}</h4>
                    {isEnabled && hasData && (
                        <div className="group relative">
                            <WarningIcon className="w-4 h-4 text-accent-warning" />
                            <div className="absolute bottom-full right-0 mb-2 w-64 p-2 bg-neutral-900 text-white text-2xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none shadow-xl border border-white/10 leading-relaxed">
                                نظام محمي: لا يمكن التعطيل لوجود سجلات مرتبطة.
                            </div>
                        </div>
                    )}
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                    {description}
                    {dependency && !isDependencyEnabled && <span className="text-accent-danger font-bold"> (يجب تفعيل نظام {dependency === 'treasury' ? 'الخزنة' : ''} أولاً)</span>}
                </p>
            </div>
            <div className="flex-shrink-0 ml-auto sm:ml-4">
                <ToggleSwitch checked={isEnabled} onChange={handleChange} disabled={isDisabled}/>
            </div>
        </div>
    );
};

const SystemSettings: React.FC = () => {
    const systems: SystemToggleProps[] = [
        { system: 'treasury', title: 'نظام الخزنة', description: 'تتبع السيولة نقديا والمصروفات.' },
        { system: 'advances', title: 'نظام السلف الشخصية', description: 'تتبع المبالغ المسحوبة كلف من الخزنة.', dependency: 'treasury' },
        { system: 'farmer_account', title: 'نظام حساب المزارع', description: 'احتساب نسبة المزارع من الأرباح.' },
        { system: 'partners_wallet', title: 'نظام الشراكة والمحفظة', description: 'إدارة حسابات الشركاء والممولين وتوزيع الأرباح والمديونيات.' },
        { system: 'labor', title: 'نظام العمالة', description: 'تتبع حضور ويوميات وحسابات العمال.' },
        { system: 'suppliers', title: 'نظام الموردين', description: 'إدارة المشتريات والمديونيات للموردين.' },
    ];

    return (
        <div className="space-y-4">
            <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-4">تفعيل الأنظمة</h3>
            {systems.map((system) => (
                <SystemToggle key={system.system} {...system} />
            ))}
        </div>
    );
};

export default SystemSettings;
