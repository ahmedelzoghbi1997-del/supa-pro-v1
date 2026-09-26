
import { LocalNotifications } from '@capacitor/local-notifications';
import { PushNotifications } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';
import { supabase } from './supabase';
import { emitToast } from '../hooks/useToast';

export async function requestNotificationPermissions(): Promise<boolean> {
  if (Capacitor.isNativePlatform()) {
    try {
      // 1. طلب إذن إشعارات Push أولاً من نظام أندرويد
      let pushStatus = await PushNotifications.checkPermissions();
      if (pushStatus.receive === 'prompt' || pushStatus.receive === 'prompt-with-rationale') {
        pushStatus = await PushNotifications.requestPermissions();
      }

      // 2. طلب إذن الإشعارات المحلية كاحتياطي
      let status = await LocalNotifications.checkPermissions();
      if (status.display === 'prompt') {
        status = await LocalNotifications.requestPermissions();
      }

      return pushStatus.receive === 'granted' || status.display === 'granted';
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

/**
 * حفظ توكن أجهزة أندرويد FCM الأصلي في جدول push_subscriptions بالسيرفر
 */
export async function saveFCMTokenToPushSubscriptions(fcmToken: string, targetUserId: string): Promise<boolean> {
  if (!fcmToken || !targetUserId) return false;

  const endpoint = fcmToken.startsWith('http')
    ? fcmToken
    : `https://fcm.googleapis.com/fcm/send/${fcmToken}`;

  try {
    // 1. إرسال التوكن لـ API السيرفر بدلاً من الإدراج المباشر لتجاوز RLS للأعضاء الافتراضيين
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };

    if (!targetUserId.startsWith('virtual_')) {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;
      if (accessToken) {
        headers['Authorization'] = `Bearer ${accessToken}`;
      }
    }

    let response: Response | null = null;
    try {
      response = await fetch('/api/push-subscriptions', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          user_id: targetUserId,
          endpoint: endpoint,
          auth_key: 'native_fcm',
          p256dh_key: 'native_fcm'
        })
      });
    } catch (netErr) {
      console.warn('[Capacitor Push] Network error contacting push API:', netErr);
    }

    if (response && !response.ok) {
      const errRes = await response.json().catch(() => ({}));
      console.error('[Capacitor Push] Failed to save push subscription via API:', errRes.error || response.statusText);
    } else if (response && response.ok) {
      console.log('[Capacitor Push] Successfully saved FCM token to push_subscriptions via API for user:', targetUserId);
    }

    // 3. تحديث حقل push_token في جدول profiles أو virtual_members للضمان المزدوج
    if (targetUserId.includes('virtual_')) {
      const dbId = targetUserId.replace(/virtual_/g, '');
      await supabase
        .from('virtual_members')
        .update({ push_token: fcmToken })
        .eq('id', dbId);
    } else {
      await supabase
        .from('profiles')
        .update({ push_token: fcmToken })
        .eq('id', targetUserId);
    }

    return true;
  } catch (err) {
    console.error('[Capacitor Push] Error in saveFCMTokenToPushSubscriptions:', err);
    return false;
  }
}

/**
 * دالة تسجيل وتفعيل إشعارات أندرويد الأصلية واستخراج FCM Token وحفظه بجدول push_subscriptions
 */
export async function subscribeNativePushNotifications(
  userId?: string
): Promise<{ success: boolean; token?: string; error?: string }> {
  if (!Capacitor.isNativePlatform()) {
    return { success: false, error: 'Not running on a native platform' };
  }

  let targetUserId = userId;
  if (!targetUserId) {
    const vAuth = typeof localStorage !== 'undefined' ? localStorage.getItem('virtual_auth') : null;
    if (vAuth) {
      try {
        targetUserId = JSON.parse(vAuth).id;
      } catch (_e) {}
    }
    if (!targetUserId) {
      const { data: authData } = await supabase.auth.getUser();
      targetUserId = authData?.user?.id || 'anonymous_user';
    }
  }

  try {
    // 1. طلب الصلاحية عبر Capacitor
    let permStatus = await PushNotifications.checkPermissions();
    if (permStatus.receive === 'prompt' || permStatus.receive === 'prompt-with-rationale') {
      permStatus = await PushNotifications.requestPermissions();
    }

    if (permStatus.receive !== 'granted') {
      console.warn('[Capacitor Push] Permission not granted:', permStatus.receive);
      return { success: false, error: 'Notification permission denied' };
    }

    // 2. إنشاء قناة إشعارات عالية الأهمية للأندرويد
    if (Capacitor.getPlatform() === 'android') {
      try {
        await PushNotifications.createChannel({
          id: 'high_priority_notifications',
          name: 'High Priority Alerts',
          description: 'Critical alerts for accounting system',
          importance: 5,
          visibility: 1,
          vibration: true,
        });
      } catch (channelError) {
        console.warn('[Capacitor Push] Failed to create notification channel:', channelError);
      }
    }

    // 3. الاستماع واستخراج التوكن
    return new Promise((resolve) => {
      let resolved = false;

      const timer = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          resolve({ success: false, error: 'Push registration timeout (check google-services.json)' });
        }
      }, 10000);

      PushNotifications.addListener('registration', async (token) => {
        console.log('[Capacitor Push] FCM Registration success! Token:', token.value);
        if (targetUserId) {
          await saveFCMTokenToPushSubscriptions(token.value, targetUserId);
        }
        if (!resolved) {
          resolved = true;
          clearTimeout(timer);
          resolve({ success: true, token: token.value });
        }
      });

      PushNotifications.addListener('registrationError', (err: any) => {
        console.error('[Capacitor Push] Registration error:', err);
        if (!resolved) {
          resolved = true;
          clearTimeout(timer);
          resolve({ success: false, error: err?.error || JSON.stringify(err) });
        }
      });

      PushNotifications.register().catch((regErr) => {
        console.error('[Capacitor Push] register() failed:', regErr);
        if (!resolved) {
          resolved = true;
          clearTimeout(timer);
          resolve({ success: false, error: String(regErr) });
        }
      });
    });
  } catch (err: any) {
    console.error('[Capacitor Push] Error in subscribeNativePushNotifications:', err);
    return { success: false, error: err?.message || String(err) };
  }
}

export async function registerForPushNotifications(profileId: string | undefined) {
  if (!Capacitor.isNativePlatform() || !profileId) return;

  try {
    const hasPermission = await requestNotificationPermissions();
    if (!hasPermission) return;

    // Remove old listeners to prevent duplicates on multiple calls
    await PushNotifications.removeAllListeners();

    // On success, we extract the FCM token and save it to push_subscriptions
    PushNotifications.addListener('registration', async (token) => {
      console.log('Push registration success, token: ' + token.value);
      await saveFCMTokenToPushSubscriptions(token.value, profileId);
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
  icon = 'https://supa-pro-v1.vercel.app/icon-192x192.png',
  badge = 'https://supa-pro-v1.vercel.app/badge-icon.png',
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
    // @ts-expect-error - vibrate is supported in browser notifications but not in all standard TS lib definitions
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
    // 0. التحقق أولاً إذا كان التطبيق يعمل داخل بيئة Capacitor الأصلية (Android APK)
    if (Capacitor.isNativePlatform()) {
      const nativeRes = await subscribeNativePushNotifications(userId);
      if (nativeRes.success) {
        emitToast('تم تفعيل إشعارات أندرويد الأصلية بنجاح وحفظ الـ FCM Token في السيرفر!', 'success');
        return { native: true, token: nativeRes.token };
      } else {
        emitToast('فشل تفعيل إشعارات أندرويد: ' + (nativeRes.error || 'يرجى التحقق من صلاحيات النظام'), 'error');
        return null;
      }
    }

    // 1. فحص دعم المتصفح (Web / PWA)
    if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('PushManager' in window)) {
      emitToast('المتصفح الحالي لا يدعم تقنية Web Push API أو PushManager', 'error');
      return null;
    }

    // 2. فحص وطلب إذن الإشعارات من المتصفح
    let currentPerm = Notification.permission;
    if (currentPerm === 'default') {
      currentPerm = await Notification.requestPermission();
    }
    if (currentPerm !== 'granted') {
      emitToast('تم رفض إذن الإشعارات من المتصفح. يرجى تفعيل الإذن من إعدادات الموقع.', 'error');
      return null;
    }

    // 3. مفتاح VAPID العام (VAPID Public Key)
    const DEFAULT_VAPID_PUBLIC_KEY = 'BP101sEliba9o7qrqxHPriHkFkTS5OhokFOu0-G7wf1UmP---IP3WYsagVoozyRAyCdSoXt-TrQianQOuhMh5Xk';
    const vapidKey = vapidPublicKey || (import.meta.env.VITE_VAPID_PUBLIC_KEY as string) || DEFAULT_VAPID_PUBLIC_KEY;
    if (!vapidKey) {
      emitToast('مفتاح VAPID العام مفقود في متغيرات البيئة. لا يمكن إتمام الاشتراك.', 'error');
      return null;
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
      emitToast('فشل إنشاء كائن الاشتراك pushManager.subscribe في المتصفح', 'error');
      return null;
    }

    // 5. استخراج endpoint ومفاتيح p256dh و auth
    const subJson = subscription.toJSON();
    const endpoint = subscription.endpoint;
    const p256dh_key = subJson.keys?.p256dh || '';
    const auth_key = subJson.keys?.auth || '';

    // تحديد معرف المستخدم الحالي
    let targetUserId = userId;
    if (!targetUserId) {
      const vAuth = localStorage.getItem('virtual_auth');
      if (vAuth) {
        try { targetUserId = JSON.parse(vAuth).id; } catch (_e) {}
      }
      if (!targetUserId) {
        const { data: authData } = await supabase.auth.getUser();
        targetUserId = authData?.user?.id || 'anonymous_user';
      }
    }

    // 6. إرسال البيانات للـ API
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };

    if (!targetUserId.startsWith('virtual_')) {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;
      if (accessToken) {
        headers['Authorization'] = `Bearer ${accessToken}`;
      }
    }

    let response: Response | null = null;
    try {
      response = await fetch('/api/push-subscriptions', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          user_id: targetUserId,
          endpoint: endpoint,
          auth_key: auth_key,
          p256dh_key: p256dh_key
        })
      });
    } catch (netErr) {
      console.warn('[Web Push] Network error contacting push API:', netErr);
    }

    if (response && !response.ok) {
      const errRes = await response.json().catch(() => ({}));
      emitToast('خطأ في حفظ الاشتراك: ' + (errRes.error || response.statusText), 'error');
      console.error('API push_subscriptions error:', errRes.error);
    } else if (response && response.ok) {
      emitToast('تم حفظ الاشتراك في السيرفر بنجاح!', 'success');
      console.log('Saved push subscription successfully via API');
    }

    return subscription;
  } catch (err: any) {
    emitToast('حدث خطأ تقني: ' + (err?.message || String(err)), 'error');
    console.error('Technical error in subscribeToWebPush:', err);
    return null;
  }
}


