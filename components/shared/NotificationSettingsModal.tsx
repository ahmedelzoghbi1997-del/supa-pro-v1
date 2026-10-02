import React, { useState } from 'react';
import { useRealtimeListener } from '../../contexts/RealtimeNotificationContext';
import { subscribeToWebPush } from '../../lib/notifications';
import { useData } from '../../contexts/DataContext';
import Button from './Button';

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
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={onClose} 
          className="!absolute !top-4 !left-4 !p-2 !rounded-full !text-neutral-400 hover:!text-neutral-700 dark:hover:!text-neutral-200"
          aria-label="إغلاق"
        >
          ✕
        </Button>
        <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-6">إعدادات الإشعارات</h2>
        
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start justify-between gap-4">
            <div className="flex gap-4 items-start w-full">
                <div className="w-10 h-10 rounded-full bg-accent-info/10 dark:bg-accent-info/20 flex items-center justify-center flex-shrink-0 text-xl">
                    🔔
                </div>
                <div>
                    <div className="flex items-center gap-2 flex-wrap mb-2">
                        <h3 className="font-bold text-slate-800 dark:text-white text-base">إشعارات النظام وتنبيهات المعاملات</h3>
                        {permission === 'granted' && (
                            <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-accent-success/10 dark:bg-accent-success/20/70 text-accent-success dark:text-accent-success border border-accent-success/20 dark:border-accent-success/30">
                                مفعلة بالنظام ✓
                            </span>
                        )}
                        {permission === 'denied' && (
                            <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-accent-danger/10 dark:bg-accent-danger/20/70 text-accent-danger dark:text-accent-danger border border-accent-danger/20 dark:border-accent-danger/30">
                                محظورة من المتصفح ✕
                            </span>
                        )}
                        {permission === 'default' && (
                            <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-accent-warning/10 dark:bg-accent-warning/20/70 text-accent-warning dark:text-accent-warning border border-accent-warning/20 dark:border-accent-warning/30">
                                يتطلب منح الإذن
                            </span>
                        )}
                        {realtimeStatus === 'SUBSCRIBED' && (
                            <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-accent-success/10 dark:bg-accent-success/20/70 text-accent-success dark:text-accent-success border border-accent-success/20 dark:border-accent-success/30 inline-flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-accent-success animate-pulse"></span>
                                الخادم اللحظي: متصل 🟢
                            </span>
                        )}
                        {(realtimeStatus === 'CLOSED' || realtimeStatus === 'CHANNEL_ERROR' || realtimeStatus === 'TIMED_OUT') && (
                            <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-accent-danger/10 dark:bg-accent-danger/20/70 text-accent-danger dark:text-accent-danger border border-accent-danger/20 dark:border-accent-danger/30 inline-flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-accent-danger"></span>
                                الخادم اللحظي: غير متصل 🔴
                            </span>
                        )}
                        {realtimeStatus === 'CONNECTING' && (
                            <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-accent-warning/10 dark:bg-accent-warning/20/70 text-accent-warning dark:text-accent-warning border border-accent-warning/20 dark:border-accent-warning/30 inline-flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-accent-warning animate-ping"></span>
                                الخادم اللحظي: جاري الاتصال 🟡
                            </span>
                        )}
                    </div>
                    <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 mb-4">
                        طلب إذن المتصفح وتجربة إرسال إشعار فوري للتأكد من ربط الـ Service Worker والتنبيهات.
                    </p>

                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full mt-2">
                        <Button
                            type="button"
                            variant="secondary"
                            size="md"
                            loading={isSubscribingPush}
                            onClick={handleSubscribeWebPush}
                            className="w-full sm:w-auto !rounded-xl !bg-accent-info hover:!bg-accent-info/90 !text-white !border-transparent"
                        >
                            تفعيل واشتراك Web Push 📡
                        </Button>
                        <Button
                            type="button"
                            variant="primary"
                            size="md"
                            loading={isTestingNotification}
                            onClick={handleNotificationTest}
                            className="w-full sm:w-auto !rounded-xl"
                        >
                            تفعيل وتجربة الإشعارات 🔔
                        </Button>
                    </div>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};
