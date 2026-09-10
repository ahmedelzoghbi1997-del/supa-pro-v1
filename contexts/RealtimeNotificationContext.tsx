import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRealtimeNotifications, playNotificationSound, type RealtimeConnectionStatus } from '../hooks/useRealtimeNotifications';
import { useData } from './DataContext';
import { useToast } from '../hooks/useToast';
import { useUI } from './UIContext';
import { triggerSuccessHaptic } from '../lib/haptics';
import { showCrossPlatformNotification } from '../lib/notifications';
import { Capacitor } from '@capacitor/core';
import type { Notification } from '../types';

interface RealtimeNotificationContextType {
  isListening: boolean;
  realtimeStatus: RealtimeConnectionStatus;
  permission: NotificationPermission | 'unsupported';
  requestAndTestNotifications: () => Promise<boolean>;
}

const RealtimeNotificationContext = createContext<RealtimeNotificationContextType>({
  isListening: true,
  realtimeStatus: 'CONNECTING',
  permission: 'default',
  requestAndTestNotifications: async () => false,
});

export const RealtimeNotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { profile } = useData();
  const { showToast } = useToast();
  const { setNotifications } = useUI();
  const effectiveUserId = profile?.parent_id || (profile as any)?.owner_id || profile?.id;

  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      return Notification.permission;
    }
    return 'unsupported';
  });

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setPermission(Notification.permission);
    }
  }, []);

  const { status: realtimeStatus } = useRealtimeNotifications({
    effectiveUserId,
    enabled: true,
  });

  const requestAndTestNotifications = useCallback(async (): Promise<boolean> => {
    const testTitle = 'المحاسب الزراعي 🔔';
    const testMessage = 'الإشعارات تعمل بنجاح في المحاسب الزراعي!';

    // 1. إطلاق التنبيه الصوتي والاهتزاز التفاعلي وتنبيه Toast داخل الشاشة فوراً لتأكيد عمل الزر
    playNotificationSound();
    triggerSuccessHaptic();
    showToast(testMessage, 'success', 6000);

    // إضافة الإشعار في مركز الإشعارات بالواجهة
    const newNotif: Notification = {
      id: `test-notif-${Date.now()}`,
      type: 'financial',
      title: 'اختبار الإشعارات 🔔',
      message: testMessage,
      timestamp: new Date().toISOString(),
      isRead: false,
      link: 'settings',
    };
    setNotifications((prev) => [newNotif, ...prev]);

    // Handle Native Capacitor (Android APK / iOS)
    if (Capacitor.isNativePlatform()) {
      try {
        await showCrossPlatformNotification({
          title: testTitle,
          body: testMessage,
          tag: 'test-native-notification',
        });
        return true;
      } catch (err) {
        console.error('Native notification error:', err);
        return false;
      }
    }

    // Handle PWA / Mobile Web Browsers
    if (typeof window === 'undefined' || !('Notification' in window)) {
      showToast('المتصفح الحالي لا يدعم إشعارات النظام (Web Notifications)، ولكن تم تفعيل التنبيهات الداخلية.', 'info');
      return false;
    }

    try {
      let currentPerm = Notification.permission;
      if (currentPerm === 'default') {
        currentPerm = await new Promise<NotificationPermission>((resolve) => {
          try {
            const promise = Notification.requestPermission((result) => resolve(result));
            if (promise && typeof promise.then === 'function') {
              promise.then(resolve).catch(() => resolve('default'));
            }
          } catch (_err) {
            resolve('default');
          }
        });
        setPermission(currentPerm);
      }

      if (currentPerm === 'granted') {
        // الاعتماد على دالة الإشعارات الموحدة التي تستخدم ServiceWorkerRegistration.showNotification على هواتف أندرويد
        const sent = await showCrossPlatformNotification({
          title: testTitle,
          body: testMessage,
          tag: 'test-pwa-notification',
        });
        return sent;
      } else if (currentPerm === 'denied') {
        showToast('إذن الإشعارات محظور في إعدادات المتصفح. يرجى السماح بالإشعارات من إعدادات الموقع.', 'warning', 7000);
        return false;
      } else {
        return false;
      }
    } catch (err) {
      console.error('[Realtime Notifications] Error requesting permission / sending test notification:', err);
      return false;
    }
  }, [showToast, setNotifications]);

  return (
    <RealtimeNotificationContext.Provider
      value={{
        isListening: !!effectiveUserId,
        realtimeStatus,
        permission,
        requestAndTestNotifications,
      }}
    >
      {children}
    </RealtimeNotificationContext.Provider>
  );
};

export const useRealtimeListener = () => useContext(RealtimeNotificationContext);
