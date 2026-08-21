import React from 'react';
import type { UiScale } from '../../types';
import { useSettings } from '../../contexts/SettingsContext';

const SizeSettings: React.FC = () => {
    const { settings, updateSettings } = useSettings();
    const { uiScale } = settings;
    const setUiScale = (uiScale: UiScale) => updateSettings({ uiScale });

    const scaleOptions: { id: UiScale, label: string }[] = [
        { id: 'xs', label: 'صغير جدا' },
        { id: 'sm', label: 'صغير' },
        { id: 'md', label: 'متوسط' },
        { id: 'lg', label: 'كبير' },
        { id: 'xl', label: 'كبير جدا' },
    ];

    return (
        <div className="space-y-8">
            <div className="bg-white dark:bg-[#182134] p-6 rounded-lg">
                <h3 className="font-semibold text-lg text-slate-800 dark:text-white">حجم التطبيق</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">تحكم في حجم الخط وعناصر الواجهة لتناسب تفضيلاتك.</p>
                <div className="bg-gray-100 dark:bg-[#0D1423] p-1.5 rounded-lg flex items-center justify-between gap-2">
                    {scaleOptions.map((option) => (
                        <button
                            key={option.id}
                            onClick={() => setUiScale(option.id)}
                            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-md text-sm font-semibold transition-colors duration-300 ${
                                uiScale === option.id 
                                    ? 'bg-primary text-white shadow-sm' 
                                    : 'text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-800/50'
                            }`}
                        >
                            <span>{option.label}</span>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default SizeSettings;