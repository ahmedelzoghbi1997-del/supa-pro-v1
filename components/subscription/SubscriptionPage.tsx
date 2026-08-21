import React, { useState, useEffect } from 'react';
import { SubscriptionIcon, CalendarIcon, ClockIcon, WhatsAppIcon, UserIcon } from '../Icons';
import { useSettings } from '../../contexts/SettingsContext';
import { useData } from '../../contexts/DataContext';

const SubscriptionPage: React.FC = () => {
    const { settings } = useSettings();
    const { profile } = useData();
    const [remainingTime, setRemainingTime] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: true });

    useEffect(() => {
        if (!profile || !profile.subscription_ends_at) {
            setRemainingTime({ days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: true });
            return;
        }

        const calculateRemaining = () => {
            const endDate = new Date(profile.subscription_ends_at!);
            const now = new Date();
            const diff = endDate.getTime() - now.getTime();

            if (diff <= 0) {
                setRemainingTime({ days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: true });
                return;
            }
            
            const days = Math.floor(diff / (1000 * 60 * 60 * 24));
            const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((diff % (1000 * 60)) / 1000);
            
            setRemainingTime({ days, hours, minutes, seconds, isExpired: false });
        };

        calculateRemaining();
        const interval = setInterval(calculateRemaining, 1000);

        return () => clearInterval(interval);
    }, [profile]);

    if (!profile) {
        return null; // or a loading state
    }

    const getSubscriptionLabel = (type?: string | null) => {
        switch (type) {
            case 'trial': return 'تجريبي';
            case 'monthly': return 'شهري';
            case 'yearly': return 'سنوي';
            case 'custom': return 'مخصص';
            default: return 'غير مشترك';
        }
    };

    const subscriptionType = getSubscriptionLabel(profile.subscription_type);
    const endDate = profile.subscription_ends_at ? new Date(profile.subscription_ends_at).toLocaleDateString('ar-EG-u-nu-latn') : 'N/A';

    const isSubscribed = !remainingTime.isExpired;

    const renderRemainingTime = () => {
        if (remainingTime.days > 0) {
            return <span className="font-bold text-lg text-neutral-800 dark:text-white">{remainingTime.days} يوم</span>;
        }
        if (!remainingTime.isExpired) {
            const paddedHours = String(remainingTime.hours).padStart(2, '0');
            const paddedMinutes = String(remainingTime.minutes).padStart(2, '0');
            const paddedSeconds = String(remainingTime.seconds).padStart(2, '0');
            return <span className="font-bold text-lg text-neutral-800 dark:text-white font-mono tracking-wider">{`${paddedHours}:${paddedMinutes}:${paddedSeconds}`}</span>;
        }
        return <span className="font-bold text-lg text-neutral-800 dark:text-white">0</span>;
    };


    return (
        <div className="max-w-2xl mx-auto">
            <div className="mb-8">
                <h1 className="text-3xl font-bold">الاشتراك</h1>
                <p className="text-neutral-500 dark:text-neutral-400 mt-1">تفاصيل خطة اشتراكك الحالية.</p>
            </div>
            
            {settings.subscription_page_message && (
                <div className="mb-6 bg-blue-50 dark:bg-neutral-800/50 p-4 rounded-lg">
                    <p className="font-semibold text-neutral-800 dark:text-neutral-200">{settings.subscription_page_message}</p>
                </div>
            )}

            <div className="bg-white dark:bg-neutral-800 rounded-xl shadow-soft border border-neutral-200 dark:border-neutral-700 overflow-hidden">
                <div className="p-6">
                    {/* User Info */}
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-neutral-100 dark:bg-neutral-700 rounded-full">
                            <UserIcon className="w-8 h-8 text-neutral-500 dark:text-neutral-300" />
                        </div>
                        <div>
                            <p className="font-bold text-xl text-neutral-800 dark:text-white">{profile.full_name}</p>
                            <p className="text-sm text-neutral-500 dark:text-neutral-400">{profile.email}</p>
                        </div>
                    </div>

                    <hr className="my-6 border-neutral-200 dark:border-neutral-700/50" />

                    {/* Subscription Info */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-neutral-500 dark:text-neutral-400">نوع الاشتراك</p>
                                <p className="text-2xl font-bold text-neutral-800 dark:text-white mt-1">{subscriptionType}</p>
                            </div>
                            <SubscriptionIcon className={`w-10 h-10 ${isSubscribed ? 'text-primary' : 'text-neutral-400'}`} />
                        </div>

                        {isSubscribed ? (
                            <>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2 text-neutral-500 dark:text-neutral-400">
                                        <ClockIcon className="w-5 h-5" />
                                        <span>{remainingTime.days > 0 ? 'الأيام المتبقية' : 'الوقت المتبقي'}</span>
                                    </div>
                                    {renderRemainingTime()}
                                </div>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2 text-neutral-500 dark:text-neutral-400">
                                        <CalendarIcon className="w-5 h-5" />
                                        <span>تاريخ الانتهاء</span>
                                    </div>
                                    <span className="font-semibold text-neutral-800 dark:text-white">{endDate}</span>
                                </div>
                            </>
                        ) : (
                            <div className="pt-4 text-center">
                                <p className="text-neutral-600 dark:text-neutral-300">ليس لديك اشتراك نشط حاليًا.</p>
                                <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-2">يرجى التواصل مع مسؤول النظام لتفعيل أو تجديد اشتراكك.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="mt-8 text-center bg-green-50 dark:bg-green-900/20 p-6 rounded-lg border border-green-200 dark:border-green-700/50">
                <p className="font-semibold text-green-800 dark:text-green-300">لتجديد الاشتراك أو الاستفسار، تواصل معنا عبر واتساب:</p>
                <a 
                    href={`https://wa.me/${settings.support_whatsapp}`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="mt-3 inline-flex items-center gap-3 text-lg font-bold text-green-600 dark:text-green-400 hover:underline"
                >
                    <WhatsAppIcon className="w-6 h-6" />
                    <span>{settings.support_whatsapp}</span>
                </a>
            </div>
        </div>
    );
};

export default SubscriptionPage;