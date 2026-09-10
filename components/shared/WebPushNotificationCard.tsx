import React, { useState } from 'react';
import { useData } from '../../contexts/DataContext';
import { useRealtimeListener } from '../../contexts/RealtimeNotificationContext';
import { subscribeToWebPush } from '../../lib/notifications';
import { BellIcon } from '../Icons';

interface WebPushNotificationCardProps {
  className?: string;
  compact?: boolean;
  title?: string;
  description?: string;
}

export const WebPushNotificationCard: React.FC<WebPushNotificationCardProps> = ({
  className = '',
  compact = false,
  title,
  description,
}) => {
  const { profile } = useData();
  const { permission, requestAndTestNotifications, realtimeStatus } = useRealtimeListener();

  const [isSubscribingPush, setIsSubscribingPush] = useState(false);
  const [isTestingNotification, setIsTestingNotification] = useState(false);

  const isPartner = profile?.role === 'viewer' || profile?.id?.startsWith('virtual_');
  const targetUserId = profile?.id || (profile as any)?.owner_id || profile?.parent_id;

  const handleSubscribePush = async () => {
    setIsSubscribingPush(true);
    try {
      await subscribeToWebPush(targetUserId);
    } finally {
      setIsSubscribingPush(false);
    }
  };

  const handleTestNotification = async () => {
    setIsTestingNotification(true);
    try {
      await requestAndTestNotifications();
      // اشتراك تلقائي بالسيرفر أيضاً لضمان تسجيل الجهاز
      await subscribeToWebPush(targetUserId);
    } finally {
      setIsTestingNotification(false);
    }
  };

  if (compact) {
    return (
      <div className={`p-3 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/40 dark:to-indigo-950/40 border border-blue-200/80 dark:border-blue-800/60 flex flex-col sm:flex-row items-center justify-between gap-3 ${className}`}>
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-blue-600/10 dark:bg-blue-400/10 text-blue-600 dark:text-blue-400 flex items-center justify-center flex-shrink-0">
            <BellIcon className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-neutral-800 dark:text-neutral-100">
              إشعارات Web Push الفورية
            </h4>
            <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
              استقبال تنبيهات الفواتير والمبيعات في الخلفية
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            type="button"
            disabled={isSubscribingPush}
            onClick={handleSubscribePush}
            className="flex-1 sm:flex-initial px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-bold transition-all shadow-sm disabled:opacity-60 flex items-center justify-center gap-1.5 whitespace-nowrap"
          >
            <span>{isSubscribingPush ? 'جاري الاشتراك...' : 'تفعيل Web Push 📡'}</span>
          </button>
          <button
            type="button"
            disabled={isTestingNotification}
            onClick={handleTestNotification}
            className="flex-1 sm:flex-initial px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-bold transition-all shadow-sm disabled:opacity-60 flex items-center justify-center gap-1.5 whitespace-nowrap"
          >
            <span>{isTestingNotification ? 'جاري الاختبار...' : 'تجربة الإشعار 🔔'}</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-white via-neutral-50 to-blue-50/40 dark:from-neutral-900 dark:via-neutral-900/90 dark:to-blue-950/20 border border-blue-200/80 dark:border-blue-800/50 shadow-sm transition-all ${className}`}>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* التفاصيل والشارات */}
        <div className="flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-blue-600/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center flex-shrink-0 mt-0.5">
            <BellIcon className="w-5 h-5" />
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm sm:text-base font-bold text-neutral-900 dark:text-neutral-100">
                {title || 'إشعارات الفواتير اللحظية (Web Push)'}
              </h3>

              {isPartner && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 border border-blue-300/60 dark:border-blue-700">
                  حساب شريك / تقارير 📊
                </span>
              )}

              {permission === 'granted' ? (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 inline-flex items-center gap-1">
                  إذن المتصفح: مفعّل 🟢
                </span>
              ) : (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950/70 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-700 inline-flex items-center gap-1">
                  إذن المتصفح: يتطلب التفعيل 🟡
                </span>
              )}

              {realtimeStatus === 'CONNECTED' && (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 inline-flex items-center gap-1">
                  الخادم: متصل 🟢
                </span>
              )}
            </div>

            <p className="text-xs text-neutral-600 dark:text-neutral-300 leading-relaxed max-w-xl">
              {description || 'قم بتفعيل واستقبال إشعارات الفواتير والمبيعات في الخلفية حتى أثناء إغلاق المتصفح أو التطبيق على جهازك.'}
            </p>
          </div>
        </div>

        {/* الأزرار التفاعلية */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 flex-shrink-0">
          <button
            id="btn-partner-subscribe-push"
            type="button"
            disabled={isSubscribingPush}
            onClick={handleSubscribePush}
            className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-60 text-white font-bold text-xs sm:text-sm shadow-sm hover:shadow transition-all flex items-center justify-center gap-2"
            title="تفعيل واشتراك Web Push وحفظ المفاتيح في جدول push_subscriptions"
          >
            <span>{isSubscribingPush ? 'جاري الاشتراك...' : 'تفعيل واشتراك Web Push 📡'}</span>
          </button>

          <button
            id="btn-partner-test-push"
            type="button"
            disabled={isTestingNotification}
            onClick={handleTestNotification}
            className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-60 text-white font-bold text-xs sm:text-sm shadow-sm hover:shadow transition-all flex items-center justify-center gap-2"
            title="طلب إذن المتصفح وإرسال إشعار تجريبي فوري"
          >
            <span>{isTestingNotification ? 'جاري الاختبار...' : 'تفعيل وتجربة الإشعارات 🔔'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
