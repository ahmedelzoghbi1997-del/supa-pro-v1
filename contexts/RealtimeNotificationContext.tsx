import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRealtimeNotifications, playNotificationSound } from '../hooks/useRealtimeNotifications';
import { useData } from './DataContext';
import { useToast } from '../hooks/useToast';
import { useUI } from './UIContext';
import { triggerSuccessHaptic } from '../lib/haptics';
import { sendLocalNotification } from '../lib/notifications';
import { Capacitor } from '@capacitor/core';
import type { Notification } from '../types';

interface RealtimeNotificationContextType {
  isListening: boolean;
  permission: NotificationPermission | 'unsupported';
  requestAndTestNotifications: () => Promise<boolean>;
}

const RealtimeNotificationContext = createContext<RealtimeNotificationContextType>({
  isListening: true,
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

  useRealtimeNotifications({
    effectiveUserId,
    enabled: !!effectiveUserId,
  });

  const requestAndTestNotifications = useCallback(async (): Promise<boolean> => {
    const testTitle = 'المحاسب الزراعي 🔔';
    const testMessage = 'الإشعارات تعمل بنجاح في المحاسب الزراعي!';

    // Handle native mobile (Capacitor)
    if (Capacitor.isNativePlatform()) {
      try {
        await sendLocalNotification(testTitle, testMessage);
        showToast(testMessage, 'success', 6000);
        playNotificationSound();
        triggerSuccessHaptic();
        return true;
      } catch (err) {
        console.error('Native notification error:', err);
      }
    }

    // Handle PWA / Web Browsers
    if (typeof window === 'undefined' || !('Notification' in window)) {
      showToast('المتصفح الحالي لا يدعم إشعارات النظام (Web Notifications).', 'warning');
      return false;
    }

    try {
      console.log('[Realtime Notifications] Requesting notification permission...');
      
      // Safe requestPermission handling Promise and callback syntax
      const perm = await new Promise<NotificationPermission>((resolve) => {
        try {
          const promise = Notification.requestPermission((result) => resolve(result));
          if (promise && typeof promise.then === 'function') {
            promise.then(resolve).catch(() => resolve('default'));
          }
        } catch (_err) {
          resolve('default');
        }
      });

      setPermission(perm);
      console.log('[Realtime Notifications] Permission status granted:', perm);

      if (perm === 'granted') {
        const notifOptions: NotificationOptions = {
          body: testMessage,
          icon: '/icon-192x192.png',
          badge: '/icon-192x192.png',
          vibrate: [200, 100, 200] as any,
          tag: 'test-pwa-notification',
        };

        // 1. Send system/OS notification via Service Worker registration
        let sentViaSW = false;
        if ('serviceWorker' in navigator) {
          try {
            const reg = await navigator.serviceWorker.ready;
            if (reg && 'showNotification' in reg) {
              await reg.showNotification(testTitle, notifOptions);
              sentViaSW = true;
              console.log('[Realtime Notifications] Test notification sent via Service Worker.');
            }
          } catch (swErr) {
            console.warn('[Realtime Notifications] Service Worker showNotification failed:', swErr);
          }
        }

        // Fallback to window.Notification
        if (!sentViaSW) {
          try {
            new Notification(testTitle, notifOptions);
            console.log('[Realtime Notifications] Test notification sent via window.Notification.');
          } catch (err) {
            console.warn('[Realtime Notifications] window.Notification error:', err);
          }
        }

        // 2. Play audio sound and haptic feedback
        playNotificationSound();
        triggerSuccessHaptic();

        // 3. Show in-app toast
        showToast(testMessage, 'success', 6000);

        // 4. Add to in-app notification center (UIContext)
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

        return true;
      } else if (perm === 'denied') {
        showToast('تم رفض إذن الإشعارات من المتصفح. يرجى تفعيل الإشعارات من إعدادات الموقع بالمتصفح.', 'warning', 7000);
        return false;
      } else {
        showToast('لم يتم تفعيل إذن الإشعارات.', 'info');
        return false;
      }
    } catch (err) {
      console.error('[Realtime Notifications] Error requesting permission:', err);
      showToast('حدث خطأ أثناء طلب إذن الإشعارات.', 'error');
      return false;
    }
  }, [showToast, setNotifications]);

  return (
    <RealtimeNotificationContext.Provider
      value={{
        isListening: !!effectiveUserId,
        permission,
        requestAndTestNotifications,
      }}
    >
      {children}
    </RealtimeNotificationContext.Provider>
  );
};

export const useRealtimeListener = () => useContext(RealtimeNotificationContext);
