import React from 'react';
import type { Theme, AccentColor } from '../../types';
import { SunIcon, MoonIcon, DesktopIcon, CheckCircleIcon } from '../Icons';
import { useSettings } from '../../contexts/SettingsContext';

const AppearanceSettings: React.FC = () => {
    const { settings, updateSettings } = useSettings();
    const { theme, accentColor } = settings;
    const setTheme = (theme: Theme) => updateSettings({ theme });
    const setAccentColor = (accentColor: AccentColor) => updateSettings({ accentColor });

    const themeOptions: { id: Theme, label: string, icon: React.FC<any> }[] = [
        { id: 'light', label: 'فاتح', icon: SunIcon },
        { id: 'dark', label: 'داكن', icon: MoonIcon },
        { id: 'system', label: 'النظام', icon: DesktopIcon },
    ];

    const colorOptions: { id: AccentColor, label: string, bgClass: string }[] = [
        { id: 'emerald', label: 'زمردي', bgClass: 'bg-[#10B981]' },
        { id: 'blue', label: 'أزرق', bgClass: 'bg-[#3B82F6]' },
        { id: 'violet', label: 'بنفسجي', bgClass: 'bg-[#8B5CF6]' },
        { id: 'amber', label: 'كهرماني', bgClass: 'bg-[#F59E0B]' },
        { id: 'rose', label: 'وردي', bgClass: 'bg-[#F43F5E]' },
    ];


    return (
        <div className="space-y-8">
            <div className="bg-white dark:bg-neutral-900 p-6 rounded-2xl border border-neutral-100 dark:border-neutral-800 shadow-soft">
                <h3 className="font-semibold text-lg text-neutral-800 dark:text-neutral-0">مظهر التطبيق</h3>
                <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-4">اختر المظهر المفضل لديك لواجهة التطبيق.</p>
                <div className="bg-neutral-100 dark:bg-neutral-800/50 p-1.5 rounded-xl flex items-center justify-between gap-2">
                    {themeOptions.map((option) => (
                        <button
                            key={option.id}
                            onClick={() => setTheme(option.id)}
                            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-colors duration-300
                                ${theme === option.id 
                                    ? 'bg-primary text-white shadow-sm' 
                                    : 'text-neutral-500 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-800/50'}`
                                }
                        >
                            <option.icon className="w-5 h-5" />
                            <span>{option.label}</span>
                        </button>
                    ))}
                </div>
            </div>

            <div className="bg-white dark:bg-neutral-900 p-6 rounded-2xl border border-neutral-100 dark:border-neutral-800 shadow-soft">
                <h3 className="font-semibold text-lg text-neutral-800 dark:text-neutral-0">اللون المميز</h3>
                <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-4">اختر اللون الرئيسي الذي يظهر في الأزرار والأيقونات والروابط.</p>
                <div className="flex flex-wrap items-center gap-4">
                    {colorOptions.map((color) => (
                        <button
                            key={color.id}
                            onClick={() => setAccentColor(color.id)}
                            className="flex flex-col items-center gap-2 group"
                            aria-label={`Set theme to ${color.label}`}
                        >
                            <div className={`relative w-10 h-10 rounded-full ${color.bgClass} flex items-center justify-center transition-transform group-hover:scale-110 ring-2 ring-offset-2 ring-offset-white dark:ring-offset-neutral-900 ${accentColor === color.id ? 'ring-primary' : 'ring-transparent'}`}>
                                {accentColor === color.id && (
                                    <CheckCircleIcon className="w-6 h-6 text-white" />
                                )}
                            </div>
                            <span className={`text-xs font-medium transition-colors ${accentColor === color.id ? 'text-primary' : 'text-neutral-500'}`}>
                                {color.label}
                            </span>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default AppearanceSettings;