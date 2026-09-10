
import { LocalNotifications } from '@capacitor/local-notifications';
import { PushNotifications } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';
import { supabase } from './supabase';

export async function requestNotificationPermissions(): Promise<boolean> {
  if (Capacitor.isNativePlatform()) {
    try {
      let status = await LocalNotifications.checkPermissions();
      if (status.display === 'prompt') {
        status = await LocalNotifications.requestPermissions();
      }
      
      // Also request push notification permissions
      let pushStatus = await PushNotifications.checkPermissions();
      if (pushStatus.receive === 'prompt') {
        pushStatus = await PushNotifications.requestPermissions();
      }

      return status.display === 'granted' || pushStatus.receive === 'granted';
    } catch (error) {
      console.error('Error requesting notification permissions:', error);
      return false;
    }
  }

  // Web / PWA browser environment
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  if (Notification.permission === 'denied') {
    return false;
  }

  try {
    const perm = await Notification.requestPermission();
    return perm === 'granted';
  } catch (error) {
    console.error('Error requesting web notification permission:', error);
    return false;
  }
}

export async function registerForPushNotifications(profileId: string | undefined) {
  if (!Capacitor.isNativePlatform() || !profileId) return;

  try {
    const hasPermission = await requestNotificationPermissions();
    if (!hasPermission) return;

    // Remove old listeners to prevent duplicates on multiple calls
    await PushNotifications.removeAllListeners();

    // On success, we should be able to receive notifications
    PushNotifications.addListener('registration', async (token) => {
      console.log('Push registration success, token: ' + token.value);
      
      try {
        // Check if the current user is a virtual member (employee)
        if (profileId.includes('virtual_')) {
          const dbId = profileId.replace(/virtual_/g, '');
          const { error } = await supabase
            .from('virtual_members')
            .update({ push_token: token.value })
            .eq('id', dbId);
            
          if (error) {
              console.error('Failed to update push token for virtual member:', error);
          } else {
              console.log('Push token saved successfully for virtual member:', dbId);
          }
        } else {
            // Save for main owner profile
            const { error } = await supabase
              .from('profiles')
              .update({ push_token: token.value })
              .eq('id', profileId);
              
            if (error) {
                 console.error('Failed to update push token for owner profile:', error);
            } else {
                 console.log('Push token saved successfully for owner:', profileId);
            }
        }
      } catch (err) {
        console.error('Error saving push token:', err);
      }
    });

    // Some issue with our setup and push will not work
    PushNotifications.addListener('registrationError', (error: any) => {
      console.error('Error on registration: ' + JSON.stringify(error));
    });

    // Show us the notification payload if the app is open on our device
    PushNotifications.addListener('pushNotificationReceived', (notification) => {
      console.log('Push received: ' + JSON.stringify(notification));
      
      // Re-trigger it locally so the user sees it even if in-app
      sendLocalNotification(notification.title || 'إشعار جديد', notification.body || '', notification.data);
    });

    // Method called when tapping on a push notification
    PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
      console.log('Push action performed: ' + JSON.stringify(notification));
      const data = notification.notification.data;
      if (data && data.route) {
        window.dispatchEvent(new CustomEvent('notificationInteraction', { 
            detail: { route: data.route, itemId: data.itemId, parentId: data.parentId } 
        }));
      }
    });

    // Method called when tapping on a local notification
    LocalNotifications.addListener('localNotificationActionPerformed', (notification) => {
        console.log('Local action performed: ' + JSON.stringify(notification));
        const data = notification.notification.extra;
        if (data && data.route) {
          window.dispatchEvent(new CustomEvent('notificationInteraction', { 
              detail: { route: data.route, itemId: data.itemId, parentId: data.parentId } 
          }));
        }
    });

    // Register with Apple / Google to receive push via APNS/FCM
    // MUST BE CALLED AFTER ADDING LISTENERS
    await PushNotifications.register();

    // Create a high-priority channel for Android to force Heads-Up (Banner) notifications
    if (Capacitor.getPlatform() === 'android') {
      try {
        await PushNotifications.createChannel({
          id: 'high_priority_notifications',
          name: 'High Priority Alerts',
          description: 'Critical alerts for accounting system',
          importance: 5, // 5 = HIGH IMPORTANCE (heads up popup)
          visibility: 1, // 1 = PUBLIC
          vibration: true,
        });
      } catch (channelError) {
        console.error('Failed to create notification channel:', channelError);
      }
    }

  } catch (error) {
    console.error('Push notification registration failed:', error);
  }
}

export interface CrossPlatformNotificationOptions {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  data?: any;
  tag?: string;
  vibrate?: number[];
}

/**
 * دالة موحدة ومضمونة للإشعارات (Cross-Platform Notification Helper)
 * تعالج مشكلة هواتف أندرويد و Mobile Chrome المانعة لـ new Notification()
 * وتعتمد حصراً على navigator.serviceWorker.ready.showNotification() مع اهتزاز تفاعلي.
 */
export async function showCrossPlatformNotification({
  title,
  body,
  icon = '/icon-192x192.png',
  badge = '/icon-192x192.png',
  data = {},
  tag,
  vibrate = [200, 100, 200],
}: CrossPlatformNotificationOptions): Promise<boolean> {
  // الاهتزاز التفاعلي في جميع الأحوال لضمان تنبيه المستخدم
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate(vibrate);
    } catch (_e) {
      // Ignored if device does not support vibration
    }
  }

  // 1. تطبيق أندرويد / iOS الأصلي عبر Capacitor
  if (Capacitor.isNativePlatform()) {
    try {
      await sendLocalNotification(title, body, data);
      return true;
    } catch (err) {
      console.error('[Notification] Capacitor local notification error:', err);
    }
  }

  // 2. بيئة المتصفحات والـ PWA
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return false;
  }

  // فحص إذن المتصفح
  if (Notification.permission !== 'granted') {
    console.warn('[Notification] Notification permission not granted:', Notification.permission);
    return false;
  }

  const notifOptions: NotificationOptions = {
    body,
    icon,
    badge,
    vibrate: vibrate as any,
    tag: tag || `notif-${Date.now()}`,
    data,
  };

  const isMobile = typeof navigator !== 'undefined' && /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent || '');

  // 3. على هواتف الموبايل (Android / PWA): الاعتماد حصراً على ServiceWorkerRegistration.showNotification
  if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
    try {
      const reg = await navigator.serviceWorker.ready;
      if (reg && typeof reg.showNotification === 'function') {
        await reg.showNotification(title, notifOptions);
        return true;
      }
    } catch (swErr) {
      console.warn('[Notification] ServiceWorker showNotification failed:', swErr);
      // على هواتف الموبايل، يمنع منعاً باتاً استدعاء new Notification لتجنب خطأ Illegal constructor
      if (isMobile) {
        return false;
      }
    }
  }

  // 4. على أجهزة الديسكتوب فقط: استخدام new Notification() كخيار احتياطي داخل try/catch
  if (!isMobile) {
    try {
      new Notification(title, notifOptions);
      return true;
    } catch (deskErr) {
      console.warn('[Notification] Desktop Notification constructor fallback failed:', deskErr);
    }
  }

  return false;
}

export async function sendLocalNotification(title: string, body: string, data: any = {}) {
  if (!Capacitor.isNativePlatform()) {
    return showCrossPlatformNotification({ title, body, data });
  }

  try {
    const hasPermission = await requestNotificationPermissions();
    if (!hasPermission) return false;

    await LocalNotifications.schedule({
      notifications: [
        {
          title,
          body,
          id: Math.floor(Math.random() * 1000000),
          schedule: { at: new Date(Date.now() + 1000) }, // Send after 1 second
          extra: data,
          sound: undefined,
          actionTypeId: '',
          attachments: []
        }
      ]
    });
    return true;
  } catch (error) {
    console.error('Error sending local notification:', error);
    return false;
  }
}

/**
 * دالة تحويل المفتاح من Base64URL إلى Uint8Array قبل تمريره إلى applicationServerKey
 */
export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * الاشتراك في خدمة Web Push API وحفظ البيانات في جدول push_subscriptions بـ Supabase
 */
export async function subscribeToWebPush(userId?: string, vapidPublicKey?: string) {
  try {
    // 1. فحص دعم المتصفح
    if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('PushManager' in window)) {
      alert('المتصفح الحالي لا يدعم تقنية Web Push API أو PushManager');
      return null;
    }

    // 2. فحص وطلب إذن الإشعارات من المتصفح
    let currentPerm = Notification.permission;
    if (currentPerm === 'default') {
      currentPerm = await Notification.requestPermission();
    }
    if (currentPerm !== 'granted') {
      alert('تم رفض إذن الإشعارات من المتصفح. يرجى تفعيل الإذن من إعدادات الموقع.');
      return null;
    }

    // 3. مفتاح VAPID العام (VAPID Public Key)
    let vapidKey = vapidPublicKey || (import.meta.env.VITE_VAPID_PUBLIC_KEY as string);
    if (!vapidKey) {
      vapidKey = prompt('يرجى إدخال VAPID Public Key لتفعيل إشعارات الويب:') || '';
      if (!vapidKey) {
        alert('لم يتم إدخال مفتاح VAPID العام، لا يمكن إتمام الاشتراك.');
        return null;
      }
    }

    // 4. تحويل المفتاح والاشتراك عبر Service Worker
    const reg = await navigator.serviceWorker.ready;
    let subscription = await reg.pushManager.getSubscription();

    if (!subscription) {
      const convertedVapidKey = urlBase64ToUint8Array(vapidKey.trim());
      subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertedVapidKey,
      });
    }

    if (!subscription) {
      alert('فشل إنشاء كائن الاشتراك pushManager.subscribe في المتصفح');
      return null;
    }

    // تنبيه نجاح الاشتراك المحلي
    alert('نجح الاشتراك محلياً. جاري الحفظ في السيرفر...');

    // 5. استخراج endpoint ومفاتيح p256dh و auth
    const subJson = subscription.toJSON();
    const endpoint = subscription.endpoint;
    const p256dh_key = subJson.keys?.p256dh || '';
    const auth_key = subJson.keys?.auth || '';

    // تحديد معرف المستخدم الحالي
    let targetUserId = userId;
    if (!targetUserId) {
      const { data: authData } = await supabase.auth.getUser();
      targetUserId = authData?.user?.id || 'anonymous_user';
    }

    // 6. إرسال البيانات لـ Supabase
    const { data, error } = await supabase.from('push_subscriptions').insert([
      {
        user_id: targetUserId,
        endpoint: endpoint,
        auth_key: auth_key,
        p256dh_key: p256dh_key,
      },
    ]);

    if (error) {
      alert('خطأ قاعدة البيانات: ' + error.message);
      console.error('Supabase push_subscriptions error:', error);
    } else {
      alert('تم حفظ الاشتراك في السيرفر بنجاح!');
      console.log('Saved push subscription successfully:', data);
    }

    return subscription;
  } catch (err: any) {
    alert('حدث خطأ تقني: ' + (err?.message || String(err)));
    console.error('Technical error in subscribeToWebPush:', err);
    return null;
  }
}


