import React, { useState } from 'react';
import { useRealtimeListener } from '../../contexts/RealtimeNotificationContext';
import { subscribeToWebPush } from '../../lib/notifications';
import { useData } from '../../contexts/DataContext';

interface NotificationSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NotificationSettingsModal: React.FC<NotificationSettingsModalProps> = ({ isOpen, onClose }) => {
  const { permission, requestAndTestNotifications, realtimeStatus } = useRealtimeListener();
  const { profile } = useData();
  const [isTestingNotification, setIsTestingNotification] = useState(false);
  const [isSubscribingPush, setIsSubscribingPush] = useState(false);

  const handleNotificationTest = async () => {
      setIsTestingNotification(true);
      try {
          await requestAndTestNotifications();
      } finally {
          setIsTestingNotification(false);
      }
  };

  const handleSubscribeWebPush = async () => {
      setIsSubscribingPush(true);
      try {
          await subscribeToWebPush(profile?.id);
      } finally {
          setIsSubscribingPush(false);
      }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 animate-fade-in" onClick={onClose}>
      <div className="bg-white dark:bg-neutral-900 rounded-2xl w-full max-w-lg p-6 shadow-2xl relative" onClick={e => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-4 left-4 p-2 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200">
          ✕
        </button>
        <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-6">إعدادات الإشعارات</h2>
        
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start justify-between gap-4">
            <div className="flex gap-4 items-start w-full">
                <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0 text-xl">
                    🔔
                </div>
                <div>
                    <div className="flex items-center gap-2 flex-wrap mb-2">
                        <h3 className="font-bold text-slate-800 dark:text-white text-base">إشعارات النظام وتنبيهات المعاملات</h3>
                        {permission === 'granted' && (
                            <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700">
                                مفعلة بالنظام ✓
                            </span>
                        )}
                        {permission === 'denied' && (
                            <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950/70 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-700">
                                محظورة من المتصفح ✕
                            </span>
                        )}
                        {permission === 'default' && (
                            <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/70 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-700">
                                يتطلب منح الإذن
                            </span>
                        )}
                        {realtimeStatus === 'SUBSCRIBED' && (
                            <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 inline-flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                الخادم اللحظي: متصل 🟢
                            </span>
                        )}
                        {(realtimeStatus === 'CLOSED' || realtimeStatus === 'CHANNEL_ERROR' || realtimeStatus === 'TIMED_OUT') && (
                            <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950/70 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-700 inline-flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                                الخادم اللحظي: غير متصل 🔴
                            </span>
                        )}
                        {realtimeStatus === 'CONNECTING' && (
                            <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/70 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-700 inline-flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping"></span>
                                الخادم اللحظي: جاري الاتصال 🟡
                            </span>
                        )}
                    </div>
                    <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 mb-4">
                        طلب إذن المتصفح وتجربة إرسال إشعار فوري للتأكد من ربط الـ Service Worker والتنبيهات.
                    </p>

                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full mt-2">
                        <button
                            type="button"
                            disabled={isSubscribingPush}
                            onClick={handleSubscribeWebPush}
                            className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-60 text-white font-bold text-sm shadow-sm hover:shadow transition-all flex items-center justify-center gap-2"
                        >
                            <span>{isSubscribingPush ? 'جاري الاشتراك...' : 'تفعيل واشتراك Web Push 📡'}</span>
                        </button>
                        <button
                            type="button"
                            disabled={isTestingNotification}
                            onClick={handleNotificationTest}
                            className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-60 text-white font-bold text-sm shadow-sm hover:shadow transition-all flex items-center justify-center gap-2"
                        >
                            <span>{isTestingNotification ? 'جاري الاختبار...' : 'تفعيل وتجربة الإشعارات 🔔'}</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};
