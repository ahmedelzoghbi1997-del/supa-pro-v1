import React from 'react';
import { useSettings } from '../../contexts/SettingsContext';
import { CyclesIcon, CalendarIcon } from '../Icons';

const TerminologySettings: React.FC = () => {
    const { settings, updateSettings } = useSettings();

    const termOptions: { id: 'cycle' | 'season', label: string, icon: React.FC<any> }[] = [
        { id: 'cycle', label: 'العروة', icon: CyclesIcon },
        { id: 'season', label: 'الموسم', icon: CalendarIcon },
    ];

    return (
        <div className="space-y-8">
            <div className="bg-white dark:bg-[#182134] p-6 rounded-lg">
                <h3 className="font-semibold text-lg text-slate-800 dark:text-white">المصطلح الزراعي الرئيسي</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">اختر المصطلح الذي يناسب طبيعة عملك (عروة للمحاصيل القصيرة، أو موسم للمحاصيل السنوية).</p>
                <div className="bg-gray-100 dark:bg-[#0D1423] p-1.5 rounded-lg flex items-center justify-between gap-2">
                    {termOptions.map((option) => (
                        <button
                            key={option.id}
                            onClick={() => updateSettings({ primaryTerm: option.id })}
                            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-md text-sm font-semibold transition-colors duration-300 ${
                                settings.primaryTerm === option.id 
                                    ? 'bg-primary text-white shadow-sm' 
                                    : 'text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-800/50'
                            }`}
                        >
                            <option.icon className="w-5 h-5" />
                            <span>{option.label}</span>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default TerminologySettings;
