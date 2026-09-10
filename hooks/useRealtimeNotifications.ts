import { useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useToast } from './useToast';
import { useUI } from '../contexts/UIContext';
import { _isLocalAction } from '../lib/recentActions';
import { triggerSuccessHaptic } from '../lib/haptics';
import type { Notification, NavItemId } from '../types';

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

export function useRealtimeNotifications({ effectiveUserId, enabled = true }: RealtimeNotificationOptions) {
  const { showToast } = useToast();
  const { setNotifications } = useUI();
  const processedIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!enabled || !effectiveUserId) return;

    const channelName = `partner_realtime_notifications_${effectiveUserId}`;
    const channel = supabase.channel(channelName);

    const handleTransactionEvent = (
      table: string,
      record: Record<string, any>
    ) => {
      if (!record || !record.id) return;
      const recordId = String(record.id);

      // Prevent duplicate notifications in the same session
      if (processedIdsRef.current.has(recordId)) return;
      processedIdsRef.current.add(recordId);
      setTimeout(() => processedIdsRef.current.delete(recordId), 30000);

      // [مؤقت للاختبار على جهاز واحد]: تم تعطيل فلترة الحركات الذاتية مؤقتاً لتظهر الإشعارات حتى للمستخدم نفسه
      // if (isLocalAction(recordId)) return;
      console.log(`[Realtime Notifications] Transaction event received for table "${table}":`, record);

      let toastText = '';
      let title = '';
      let message = '';
      let link: NavItemId = 'treasury';

      if (table === 'invoices') {
        const customer = record.customer_name ? ` لـ ${record.customer_name}` : '';
        const amountStr = record.net_amount || record.total_amount ? ` (${Number(record.net_amount || record.total_amount).toLocaleString('ar-EG')} ج.م)` : '';
        toastText = `تمت إضافة فاتورة جديدة${customer}${amountStr}`;
        title = 'فاتورة جديدة 📄';
        message = `قام أحد الشركاء بإضافة فاتورة جديدة${customer}${amountStr}`;
        link = 'invoices';
      } else if (table === 'expenses') {
        const desc = String(record.description || '').toLowerCase();
        const cat = String(record.category || '').toLowerCase();
        const isDebtSettlement =
          desc.includes('سداد') ||
          desc.includes('دين') ||
          desc.includes('مديونية') ||
          desc.includes('التزام') ||
          cat.includes('سداد') ||
          cat.includes('دين');

        const amountStr = record.amount ? ` (${Number(record.amount).toLocaleString('ar-EG')} ج.م)` : '';

        if (isDebtSettlement) {
          toastText = `تم تسجيل سداد دين جديد${amountStr}`;
          title = 'سداد دين جديد 💰';
          message = `تم تسجيل حركة سداد دين في الخزنة: ${record.description || 'سداد التزام'}${amountStr}`;
          link = 'treasury';
        } else {
          toastText = `تم تسجيل مصروف جديد في الخزنة${amountStr}`;
          title = 'مصروف خزنة جديد 💸';
          message = `تم تسجيل مصروف جديد: ${record.description || ''}${amountStr}`;
          link = 'expenses';
        }
      } else if (table === 'advances') {
        const isRepayment =
          record.is_repayment === true ||
          String(record.reason || '').includes('EXTERNAL_DEBT') ||
          String(record.reason || '').includes('سداد');
        const amountStr = record.amount ? ` (${Number(record.amount).toLocaleString('ar-EG')} ج.م)` : '';

        if (isRepayment) {
          toastText = `تم تسجيل سداد دين / سلفة جديد${amountStr}`;
          title = 'سداد دين / سلفة 💰';
          message = `تم تسجيل سداد سلفة شخصية أو دين خارجي${amountStr}`;
          link = 'treasury';
        } else {
          toastText = `تم تسجيل صرف سلفة جديدة${amountStr}`;
          title = 'صرف سلفة نقدية 💵';
          message = `تم صرف سلفة نقدية من الخزنة${amountStr}`;
          link = 'advances';
        }
      } else if (table === 'partner_debts') {
        const amountStr = record.amount ? ` (${Number(record.amount).toLocaleString('ar-EG')} ج.م)` : '';
        toastText = `تم تحديث حسابات ديون الشركاء${amountStr}`;
        title = 'ديون والتزامات الشركاء 🤝';
        message = `تم تسجيل حركة في مديونيات الشركاء${amountStr}`;
        link = 'partners';
      } else if (table === 'bank_transactions') {
        const amountStr = record.amount ? ` (${Number(record.amount).toLocaleString('ar-EG')} ج.م)` : '';
        const typeStr = record.type === 'deposit' ? 'إيداع' : 'سحب';
        toastText = `حركة جديدة بالخزنة: ${typeStr}${amountStr}`;
        title = 'حركة بالخزنة / البنك 🏦';
        message = `تم تسجيل حركة ${typeStr} في الخزنة${amountStr}`;
        link = 'treasury';
      } else if (table === 'supplier_payments') {
        const amountStr = record.amount ? ` (${Number(record.amount).toLocaleString('ar-EG')} ج.م)` : '';
        toastText = `تم تسجيل سداد نقدي لمورد من الخزنة${amountStr}`;
        title = 'سداد نقدي لمورد 📦';
        message = `تم سداد دفعة نقدية لمورد من الخزنة${amountStr}`;
        link = 'suppliers';
      } else if (table === 'farmer_withdrawals') {
        const amountStr = record.amount ? ` (${Number(record.amount).toLocaleString('ar-EG')} ج.م)` : '';
        toastText = `تم تسجيل سحب نقدي من الخزنة${amountStr}`;
        title = 'سحب نقدي من الخزنة 🏧';
        message = `تم تسجيل حركة مسحوبات نقدية من الخزنة${amountStr}`;
        link = 'treasury';
      }

      if (!toastText) return;

      // 1. Show Toast to active partners immediately
      showToast(toastText, 'success', 5000);

      // 2. Play audio chime and haptic feedback
      playNotificationSound();
      triggerSuccessHaptic();

      // 3. Add to notifications badge & panel in UIContext
      const newNotif: Notification = {
        id: `realtime-${table}-${recordId}-${Date.now()}`,
        type: 'financial',
        title,
        message,
        timestamp: new Date().toISOString(),
        isRead: false,
        link,
      };

      setNotifications((prev) => [newNotif, ...prev]);

      // 4. Trigger system / PWA notification via Service Worker or Notification API if granted
      if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
        const notifOptions: NotificationOptions = {
          body: message,
          icon: '/icon-192x192.png',
          badge: '/icon-192x192.png',
          vibrate: [200, 100, 200] as any,
          tag: `realtime-${table}-${recordId}`,
        };

        if ('serviceWorker' in navigator) {
          navigator.serviceWorker.ready.then((reg) => {
            reg.showNotification(title, notifOptions).catch((err) => {
              console.warn('[Realtime Notifications] Service Worker showNotification error:', err);
              try { new Notification(title, notifOptions); } catch (_e) {}
            });
          }).catch(() => {
            try { new Notification(title, notifOptions); } catch (_e) {}
          });
        } else {
          try { new Notification(title, notifOptions); } catch (_e) {}
        }
      }
    };

    // Subscribing to invoices (الفواتير)
    channel.on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'invoices',
        filter: `user_id=eq.${effectiveUserId}`,
      },
      (payload) => handleTransactionEvent('invoices', payload.new)
    );

    // Subscribing to treasury & debt repayment tables (الخزنة وسداد الديون)
    const treasuryTables = [
      'expenses',
      'advances',
      'partner_debts',
      'bank_transactions',
      'supplier_payments',
      'farmer_withdrawals',
    ];

    treasuryTables.forEach((table) => {
      channel.on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table,
          filter: `user_id=eq.${effectiveUserId}`,
        },
        (payload) => handleTransactionEvent(table, payload.new)
      );
    });

    console.log(`[Realtime Notifications] Subscribing to channel: ${channelName} for user: ${effectiveUserId}`);

    channel.subscribe((status, err) => {
      console.log(`[Realtime Notifications] Channel status changed: ${status}`, err ? `Error: ${JSON.stringify(err)}` : '');
      if (status === 'SUBSCRIBED') {
        console.log(
          `%c[Realtime Notifications] Successfully SUBSCRIBED to channel: ${channelName}`,
          'color: #10b981; font-weight: bold; background: #ecfdf5; padding: 2px 6px; border-radius: 4px;'
        );
      } else if (status === 'CHANNEL_ERROR') {
        console.error(`[Realtime Notifications] Channel error on ${channelName}:`, err);
      } else if (status === 'TIMED_OUT') {
        console.warn(`[Realtime Notifications] Channel timed out on ${channelName}`);
      } else if (status === 'CLOSED') {
        console.log(`[Realtime Notifications] Channel closed.`);
      }
    });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [effectiveUserId, enabled, setNotifications, showToast]);
}
