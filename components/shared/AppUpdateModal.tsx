import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { CURRENT_APP_VERSION } from '../../constants';
import { isUpdateAvailable } from '../../utils/helpers';
import { SparklesIcon, XMarkIcon } from '../Icons';
import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';

interface AppUpdate {
    latest_version: string;
    download_url: string;
    is_mandatory: boolean;
    release_notes: string;
}

const AppUpdateModal: React.FC = () => {
    const [updateInfo, setUpdateInfo] = useState<AppUpdate | null>(null);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const checkUpdate = async () => {
            if (!Capacitor.isNativePlatform()) {
                return;
            }

            try {
                const { data, error } = await supabase
                    .from('app_updates')
                    .select('*')
                    .order('id', { ascending: false })
                    .limit(1)
                    .single();

                if (error) {
                    if (error.code !== 'PGRST116') { // Ignore "No rows found"
                        console.error('Error fetching app updates:', error);
                    }
                    return;
                }

                if (data) {
                    let localVersion = CURRENT_APP_VERSION;
                    if (Capacitor.isNativePlatform()) {
                        try {
                            const info = await App.getInfo();
                            localVersion = info.version;
                        } catch (e) {
                            console.warn("Failed to get native app info, falling back to constant", e);
                        }
                    }

                    if (isUpdateAvailable(data.latest_version, localVersion)) {
                        // Always check snooze (force non-mandatory behavior)
                        const snoozedUntil = localStorage.getItem('app_update_snooze');
                        if (snoozedUntil && new Date().getTime() < parseInt(snoozedUntil, 10)) {
                            return; // Snoozed
                        }
                        setUpdateInfo({ ...data, is_mandatory: false });
                        setIsVisible(true);
                    }
                }
            } catch (err) {
                console.error('Failed to check for updates:', err);
            }
        };

        checkUpdate();
    }, []);

    if (!isVisible || !updateInfo) return null;

    const handleClose = () => {
        // Snooze for 24 hours
        const snoozeTime = new Date().getTime() + 24 * 60 * 60 * 1000;
        localStorage.setItem('app_update_snooze', snoozeTime.toString());
        setIsVisible(false);
    };

    const handleUpdate = () => {
        window.open(updateInfo.download_url, '_blank');
    };

    return (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 sm:p-6">
            <div 
                className="absolute inset-0 bg-neutral-900/60 dark:bg-black/80 backdrop-blur-sm transition-opacity"
                onClick={updateInfo.is_mandatory ? undefined : handleClose}
            />
            
            <div className="relative bg-white dark:bg-neutral-900 w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-enter border border-neutral-200/50 dark:border-neutral-800">
                {/* Header */}
                <div className="bg-gradient-to-br from-primary/10 to-transparent p-6 text-center relative">
                    {!updateInfo.is_mandatory && (
                        <button 
                            onClick={handleClose}
                            className="absolute top-4 right-4 p-2 bg-white/50 dark:bg-black/20 hover:bg-neutral-200 dark:hover:bg-neutral-800 rounded-full text-neutral-500 transition-colors"
                        >
                            <XMarkIcon className="w-5 h-5" />
                        </button>
                    )}
                    <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4">
                        <SparklesIcon className="w-8 h-8 text-primary" />
                    </div>
                    <h2 className="text-2xl font-black text-neutral-900 dark:text-white tracking-tight">تحديث جديد متاح!</h2>
                    <p className="text-sm font-bold text-primary mt-1">الإصدار {updateInfo.latest_version}</p>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">
                    {updateInfo.release_notes && (
                        <div className="bg-neutral-50 dark:bg-neutral-800/50 rounded-2xl p-4 border border-neutral-100 dark:border-neutral-700/50">
                            <h3 className="text-xs font-black text-neutral-500 dark:text-neutral-400 uppercase tracking-widest mb-2">ما الجديد؟</h3>
                            <p className="text-sm text-neutral-700 dark:text-neutral-300 leading-relaxed whitespace-pre-wrap">
                                {updateInfo.release_notes}
                            </p>
                        </div>
                    )}

                    {updateInfo.is_mandatory && (
                        <div className="flex items-center gap-2 text-amber-600 dark:text-amber-500 bg-amber-50 dark:bg-amber-500/10 p-3 rounded-xl text-xs font-bold">
                            <span className="relative flex h-2.5 w-2.5">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
                            </span>
                            هذا التحديث إجباري لضمان استقرار التطبيق.
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex flex-col gap-3 pt-2">
                        <button
                            onClick={handleUpdate}
                            className="w-full py-3.5 px-4 bg-primary hover:bg-primary-dark text-white rounded-xl font-black text-lg transition-all active:scale-[0.98] shadow-lg shadow-primary/25"
                        >
                            تحديث الآن
                        </button>
                        {!updateInfo.is_mandatory && (
                            <button
                                onClick={handleClose}
                                className="w-full py-3 px-4 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 rounded-xl font-bold transition-all"
                            >
                                لاحقاً
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AppUpdateModal;
