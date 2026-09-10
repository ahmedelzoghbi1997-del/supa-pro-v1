import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useToast } from './useToast';
import { useUI } from '../contexts/UIContext';
import { _isLocalAction } from '../lib/recentActions';
import { triggerSuccessHaptic } from '../lib/haptics';
import { showCrossPlatformNotification } from '../lib/notifications';
import type { Notification, NavItemId } from '../types';

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

export function useRealtimeNotifications({ effectiveUserId, enabled = true }: RealtimeNotificationOptions) {
  const { showToast } = useToast();
  const { setNotifications } = useUI();
  const [status, setStatus] = useState<RealtimeConnectionStatus>(enabled && effectiveUserId ? 'CONNECTING' : 'CLOSED');
  const processedIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!enabled || !effectiveUserId) {
      setStatus('CLOSED');
      return;
    }

    setStatus('CONNECTING');
    const channelName = `partner_realtime_notifications_${effectiveUserId}`;
    const channel = supabase.channel(channelName);

    const handleTransactionEvent = (
      table: string,
      record: Record<string, any>,
      eventType: 'INSERT' | 'UPDATE' = 'INSERT'
    ) => {
      if (!record || !record.id) return;
      const recordId = String(record.id);
      const eventKey = `${table}-${recordId}-${eventType}`;

      // Prevent duplicate notifications in the same session
      if (processedIdsRef.current.has(eventKey)) return;
      processedIdsRef.current.add(eventKey);
      setTimeout(() => processedIdsRef.current.delete(eventKey), 12000);

      // إذا كانت السجلات تحمل user_id صريحاً، نتأكد من مطابقتها لحساب المستخدم/الفريق
      if (record.user_id && String(record.user_id) !== String(effectiveUserId)) {
        return;
      }

      console.log(`[Realtime Notifications] ${eventType} event received for table "${table}":`, record);

      let toastText = '';
      let title = '';
      let message = '';
      let link: NavItemId = 'treasury';

      if (table === 'invoices') {
        const customer = record.customer_name ? ` لـ ${record.customer_name}` : '';
        const amountStr = record.net_amount || record.total_amount ? ` (${Number(record.net_amount || record.total_amount).toLocaleString('ar-EG')} ج.م)` : '';
        if (eventType === 'UPDATE') {
          toastText = `تم تعديل بيانات فاتورة${customer}${amountStr}`;
          title = 'تعديل فاتورة 📄';
          message = `قام أحد الشركاء بتعديل بيانات فاتورة${customer}${amountStr}`;
        } else {
          toastText = `تمت إضافة فاتورة جديدة${customer}${amountStr}`;
          title = 'فاتورة جديدة 📄';
          message = `قام أحد الشركاء بإضافة فاتورة جديدة${customer}${amountStr}`;
        }
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

        if (eventType === 'UPDATE') {
          toastText = `تم تعديل مصروف بالخزنة${amountStr}`;
          title = 'تعديل مصروف 💸';
          message = `تم تعديل مصروف: ${record.description || ''}${amountStr}`;
          link = 'expenses';
        } else if (isDebtSettlement) {
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

        if (eventType === 'UPDATE') {
          toastText = `تم تعديل سلفة نقدية${amountStr}`;
          title = 'تعديل سلفة نقدية 💵';
          message = `تم تعديل حركة سلفة نقدية بالخزنة${amountStr}`;
        } else if (isRepayment) {
          toastText = `تم تسجيل سداد دين / سلفة جديد${amountStr}`;
          title = 'سداد دين / سلفة 💰';
          message = `تم تسجيل سداد سلفة شخصية أو دين خارجي${amountStr}`;
        } else {
          toastText = `تم تسجيل صرف سلفة جديدة${amountStr}`;
          title = 'صرف سلفة نقدية 💵';
          message = `تم صرف سلفة نقدية من الخزنة${amountStr}`;
        }
        link = 'advances';
      } else if (table === 'partner_debts') {
        const amountStr = record.amount ? ` (${Number(record.amount).toLocaleString('ar-EG')} ج.م)` : '';
        toastText = eventType === 'UPDATE' ? `تم تعديل مديونيات الشركاء${amountStr}` : `تم تحديث حسابات ديون الشركاء${amountStr}`;
        title = 'ديون والتزامات الشركاء 🤝';
        message = `تم تسجيل حركة في مديونيات الشركاء${amountStr}`;
        link = 'partners';
      } else if (table === 'bank_transactions') {
        const amountStr = record.amount ? ` (${Number(record.amount).toLocaleString('ar-EG')} ج.م)` : '';
        const typeStr = record.type === 'deposit' ? 'إيداع' : 'سحب';
        toastText = eventType === 'UPDATE' ? `تم تعديل حركة بالخزنة: ${typeStr}${amountStr}` : `حركة جديدة بالخزنة: ${typeStr}${amountStr}`;
        title = 'حركة بالخزنة / البنك 🏦';
        message = `تم تسجيل حركة ${typeStr} في الخزنة${amountStr}`;
        link = 'treasury';
      } else if (table === 'supplier_payments') {
        const amountStr = record.amount ? ` (${Number(record.amount).toLocaleString('ar-EG')} ج.م)` : '';
        toastText = eventType === 'UPDATE' ? `تم تعديل سداد نقدي لمورد${amountStr}` : `تم تسجيل سداد نقدي لمورد من الخزنة${amountStr}`;
        title = 'سداد نقدي لمورد 📦';
        message = `تم سداد دفعة نقدية لمورد من الخزنة${amountStr}`;
        link = 'suppliers';
      } else if (table === 'farmer_withdrawals') {
        const amountStr = record.amount ? ` (${Number(record.amount).toLocaleString('ar-EG')} ج.م)` : '';
        toastText = eventType === 'UPDATE' ? `تم تعديل سحب نقدي من الخزنة${amountStr}` : `تم تسجيل سحب نقدي من الخزنة${amountStr}`;
        title = 'سحب نقدي من الخزنة 🏧';
        message = `تم تسجيل حركة مسحوبات نقدية من الخزنة${amountStr}`;
        link = 'treasury';
      }

      if (!toastText) return;

      // 1. عرض Toast مباشر داخل الشاشة للمستخدمين
      showToast(toastText, 'success', 5000);

      // 2. إطلاق التنبيه الصوتي والاهتزاز التفاعلي
      playNotificationSound();
      triggerSuccessHaptic();

      // 3. الإضافة إلى قائمة الإشعارات ومركز الإشعارات داخل التطبيق
      const newNotif: Notification = {
        id: `realtime-${table}-${recordId}-${eventType}-${Date.now()}`,
        type: 'financial',
        title,
        message,
        timestamp: new Date().toISOString(),
        isRead: false,
        link,
      };

      setNotifications((prev) => [newNotif, ...prev]);

      // 4. إظهار إشعار النظام الموحد عبر Service Worker على الموبايل و new Notification على الديسكتوب
      showCrossPlatformNotification({
        title,
        body: message,
        tag: `realtime-${table}-${recordId}-${eventType}`,
        data: { table, recordId, link, eventType },
      }).catch((notifErr) => {
        console.warn('[Realtime Notifications] showCrossPlatformNotification error:', notifErr);
      });
    };

    // الاستماع لكل من INSERT و UPDATE لجداول invoices و expenses بدون شروط تعجيزية
    ['invoices', 'expenses'].forEach((table) => {
      channel.on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table,
        },
        (payload) => handleTransactionEvent(table, payload.new, 'INSERT')
      );

      channel.on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table,
        },
        (payload) => handleTransactionEvent(table, payload.new, 'UPDATE')
      );
    });

    // الاستماع لجداول الخزنة والديون والسلف المتبقية
    const otherTreasuryTables = [
      'advances',
      'partner_debts',
      'bank_transactions',
      'supplier_payments',
      'farmer_withdrawals',
    ];

    otherTreasuryTables.forEach((table) => {
      channel.on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table,
        },
        (payload) => handleTransactionEvent(table, payload.new, 'INSERT')
      );

      channel.on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table,
        },
        (payload) => handleTransactionEvent(table, payload.new, 'UPDATE')
      );
    });

    console.log(`[Realtime Notifications] Subscribing to channel: ${channelName} for user: ${effectiveUserId}`);

    channel.subscribe((subStatus, err) => {
      console.log(`[Realtime Notifications] Channel status changed: ${subStatus}`, err ? `Error: ${JSON.stringify(err)}` : '');
      if (subStatus === 'SUBSCRIBED') {
        setStatus('SUBSCRIBED');
        console.log(
          `%c[Realtime Notifications] Successfully SUBSCRIBED to channel: ${channelName}`,
          'color: #10b981; font-weight: bold; background: #ecfdf5; padding: 2px 6px; border-radius: 4px;'
        );
      } else if (subStatus === 'CHANNEL_ERROR') {
        setStatus('CHANNEL_ERROR');
        console.error(`[Realtime Notifications] Channel error on ${channelName}:`, err);
      } else if (subStatus === 'TIMED_OUT') {
        setStatus('TIMED_OUT');
        console.warn(`[Realtime Notifications] Channel timed out on ${channelName}`);
      } else if (subStatus === 'CLOSED') {
        setStatus('CLOSED');
        console.log(`[Realtime Notifications] Channel closed.`);
      }
    });

    return () => {
      supabase.removeChannel(channel);
      setStatus('CLOSED');
    };
  }, [effectiveUserId, enabled, setNotifications, showToast]);

  return { status };
}
