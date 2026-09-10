import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useToast } from './useToast';
import { useUI } from '../contexts/UIContext';
import { triggerSuccessHaptic } from '../lib/haptics';
import type { Notification } from '../types';

export type RealtimeConnectionStatus = 'SUBSCRIBED' | 'CONNECTING' | 'CLOSED' | 'CHANNEL_ERROR' | 'TIMED_OUT';

export function playNotificationSound() {
  try {
    if (typeof window === 'undefined') return;
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15); // A5
    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.35);
  } catch (_e) {
    // Autoplay restrictions or headless env; safely ignore
  }
}

interface RealtimeNotificationOptions {
  effectiveUserId?: string | null;
  enabled?: boolean;
}

// قناة عامة وحيدة ومستمرة طوال الجلسة لمنع الـ Unsubscribe الخاطئ عند التنقل بين الصفحات
let globalRealtimeChannel: ReturnType<typeof supabase.channel> | null = null;
let currentConnectionStatus: RealtimeConnectionStatus = 'CLOSED';

export function useRealtimeNotifications({ enabled = true }: RealtimeNotificationOptions) {
  const { showToast } = useToast();
  const { setNotifications } = useUI();
  const [status, setStatus] = useState<RealtimeConnectionStatus>(currentConnectionStatus);

  const showToastRef = useRef(showToast);
  const setNotificationsRef = useRef(setNotifications);

  useEffect(() => {
    showToastRef.current = showToast;
    setNotificationsRef.current = setNotifications;
  });

  useEffect(() => {
    if (!enabled) {
      setStatus('CLOSED');
      return;
    }

    // إذا كانت القناة متصلة بالفعل، لا تقم بإعادة إنشائها أو إغلاقها عند التنقل
    if (globalRealtimeChannel && currentConnectionStatus === 'SUBSCRIBED') {
      setStatus('SUBSCRIBED');
      return;
    }

    setStatus('CONNECTING');
    currentConnectionStatus = 'CONNECTING';

    // 1. تبسيط قناة الاستماع لتكون عامة schema-db-changes وتلتقط كل شيء على جدول invoices
    const channel = supabase.channel('schema-db-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'invoices' }, (payload) => {
        console.log("Supabase Event Received (invoices):", payload);

        // فخ برمجي لكشف وصول البيانات
        try {
          alert("تم التقاط فاتورة جديدة من السيرفر!");
        } catch (_e) {
          console.log("Alert blocked by iframe/browser policy:", _e);
        }

        // استدعاء الـ Service Worker
        if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
          navigator.serviceWorker.ready.then(reg => {
            reg.showNotification("حركة جديدة", {
              body: "تم التسجيل بنجاح",
              icon: '/icon-192x192.png',
              badge: '/icon-192x192.png',
              vibrate: [200, 100, 200]
            });
          }).catch(err => {
            console.warn('[Realtime Notifications] SW error:', err);
            try {
              new Notification("حركة جديدة", { body: "تم التسجيل بنجاح", icon: '/icon-192x192.png' });
            } catch (_e) {}
          });
        }

        // التنبيه الصوتي والاهتزاز والـ Toast والتحديث بالواجهة
        playNotificationSound();
        triggerSuccessHaptic();
        if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
          try { navigator.vibrate([200, 100, 200]); } catch (_e) {}
        }
        showToastRef.current("تم التقاط فاتورة جديدة من السيرفر! 🔔", 'success', 6000);

        const newNotif: Notification = {
          id: `realtime-invoice-${Date.now()}`,
          type: 'financial',
          title: 'حركة جديدة',
          message: 'تم تسجيل فاتورة بنجاح في قاعدة البيانات',
          timestamp: new Date().toISOString(),
          isRead: false,
          link: 'invoices',
        };
        setNotificationsRef.current(prev => [newNotif, ...prev]);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'expenses' }, (payload) => {
        console.log("Supabase Event Received (expenses):", payload);

        if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
          navigator.serviceWorker.ready.then(reg => {
            reg.showNotification("مصروف جديد", {
              body: "تم تسجيل حركة في الخزنة بنجاح",
              icon: '/icon-192x192.png',
              badge: '/icon-192x192.png',
              vibrate: [200, 100, 200]
            });
          }).catch(() => {});
        }

        playNotificationSound();
        triggerSuccessHaptic();
        showToastRef.current("تم تسجيل مصروف جديد بالخزنة 💸", 'success', 5000);
      })
      .subscribe((subStatus, err) => {
        console.log(`[Realtime Notifications] Channel status changed: ${subStatus}`, err ? `Error: ${JSON.stringify(err)}` : '');
        if (subStatus === 'SUBSCRIBED') {
          console.log("متصل بقناة قاعدة البيانات بنجاح");
          setStatus('SUBSCRIBED');
          currentConnectionStatus = 'SUBSCRIBED';
        } else if (subStatus === 'CHANNEL_ERROR') {
          setStatus('CHANNEL_ERROR');
          currentConnectionStatus = 'CHANNEL_ERROR';
        } else if (subStatus === 'TIMED_OUT') {
          setStatus('TIMED_OUT');
          currentConnectionStatus = 'TIMED_OUT';
        } else if (subStatus === 'CLOSED') {
          setStatus('CLOSED');
          currentConnectionStatus = 'CLOSED';
        }
      });

    globalRealtimeChannel = channel;

    // 2. منع الـ Unsubscribe الخاطئ:
    // دالة الـ cleanup هنا لا تقوم بإلغاء الاشتراك أثناء تنقل المستخدم بين الصفحات
    return () => {
      // نترك القناة متصلة ومستمرة لحين تسجيل الخروج الفعلي
    };
  }, [enabled]);

  // إدارة إلغاء الاشتراك عند تسجيل الخروج الصريح فقط
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        if (globalRealtimeChannel) {
          console.log("[Realtime Notifications] المستخدم قام بتسجيل الخروج، جاري إغلاق القناة.");
          supabase.removeChannel(globalRealtimeChannel);
          globalRealtimeChannel = null;
          currentConnectionStatus = 'CLOSED';
          setStatus('CLOSED');
        }
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return { status };
}
