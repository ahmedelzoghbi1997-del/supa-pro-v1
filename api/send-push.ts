import { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import webpush from 'web-push';

webpush.setVapidDetails(
  "mailto:ahmed.elzoghbe1997@gmail.com",
  "BP101sEliba9o7qrqxHPriHkFkTS5OhokFOu0-G7wf1UmP---IP3WYsagVoozyRAyCdSoXt-TrQianQOuhMh5Xk",
  "JrDTClsx-eI2Ac4cPw3K34HXRUEoT2yYfB0CMzrE4wE"
);

// يتم استخدام المفتاح المتاح للاتصال بقاعدة البيانات
const supabase = createClient(
  (process.env.VITE_SUPABASE_URL && process.env.VITE_SUPABASE_URL.startsWith('http') ? process.env.VITE_SUPABASE_URL : 'https://ibudczfescwpmldarfbi.supabase.co'),
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlidWRjemZlc2N3cG1sZGFyZmJpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjExMzczOTksImV4cCI6MjA3NjcxMzM5OX0.nleKjCMgO2cOhMFR8psjXPqHnUK8PoAvv5kcp22KDKw'
);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const payload = req.body;
    const record = payload.record || {};
    const table = payload.table || 'invoices';
    
    // معرف الشريك أو المزرعة
    const ownerId = payload.owner_id || payload.effectiveUserId || record.user_id;
    const actionCreatorId = record.created_by || record.user_id;

    let title = "حركة جديدة 🧾";
    let body = `تم تسجيل حركة جديدة في النظام.`;

    if (table === 'invoices') {
      const customerName = record.customer_name || '';
      const amount = record.total_amount || record.net_amount || record.amount || 0;
      title = "فاتورة جديدة 📄";
      body = `تم تسجيل فاتورة لـ ${customerName} بقيمة ${amount} ج.م`;
    } else if (table === 'expenses') {
      title = "مصروف جديد 💸";
      body = `تم تسجيل مصروف ${record.description || ''} بقيمة ${record.amount || 0} ج.م`;
    } else if (table === 'advances') {
      title = "سلفة / سداد 💵";
      body = `تم تسجيل حركة سلفة بقيمة ${record.amount || 0} ج.م`;
    } else if (table === 'supplier_payments') {
      title = "سداد لمورد 📦";
      body = `تم سداد دفعة للمورد بقيمة ${record.amount || 0} ج.م`;
    } else if (table === 'farmer_withdrawals') {
      title = "سحب نقدي 🏧";
      body = `تم سحب مبلغ بقيمة ${record.amount || 0} ج.م`;
    } else if (table === 'partner_debts') {
      title = "مديونية شريك 🤝";
      body = `تم تسجيل مديونية شريك بقيمة ${record.amount || 0} ج.م`;
    } else if (table === 'bank_transactions') {
      title = "حركة بالخزنة / البنك 🏦";
      body = `تم تسجيل معاملة بالخزنة بقيمة ${record.amount || 0} ج.م`;
    }

    // ارسال اشعار للخادم اللحظي على القنوات المخصصة
    const notifChannel = ownerId ? `realtime_notifs_${ownerId}` : 'realtime_notifs_global';
    const dataChannel = ownerId ? `realtime_data_${ownerId}` : 'realtime_data_global';
    const syncChannel = ownerId ? `realtime_sync_${ownerId}` : 'realtime_sync_global';
    const bPayload = { table, record, new: record, eventType: payload.eventType || 'INSERT', user_id: ownerId };
    
    try {
      await Promise.allSettled([
        supabase.channel(notifChannel).send({ type: 'broadcast', event: 'new_transaction', payload: bPayload }),
        supabase.channel(dataChannel).send({ type: 'broadcast', event: 'new_transaction', payload: bPayload }),
        supabase.channel(syncChannel).send({ type: 'broadcast', event: 'new_transaction', payload: bPayload })
      ]);
    } catch (_bErr) {
      console.warn("Broadcast in send-push error:", _bErr);
    }
    
    const { data: subscriptions } = await supabase.from('push_subscriptions').select('*');
    if (!subscriptions) return res.status(200).json({ message: 'No subscriptions' });

    // إحضار الحسابات لمعرفة أدوار المستخدمين
    const { data: profiles } = await supabase.from('profiles').select('id, role');
    const ownerIds = profiles?.filter((p: any) => p.role === 'owner').map((p: any) => p.id) || [];

    // الفلترة الذكية: إرسال الإشعارات للشركاء فقط
    // 1- استبعاد حسابات المالك (owner)
    // 2- استبعاد من قام بالإضافة (actionCreatorId)
    const validSubscriptions = subscriptions.filter(sub => {
      if (ownerIds.includes(sub.user_id)) return false;
      return sub.user_id !== actionCreatorId;
    });

    const notificationPayload = JSON.stringify({
      title, body,
      icon: '/icon-192x192.png', badge: '/icon-192x192.png',
      vibrate: [200, 100, 200], url: '/'
    });

    const promises = validSubscriptions.map(async (sub) => {
      // 1. التعامل مع توكنات FCM الأصلية لأجهزة أندرويد
      if (sub.auth_key === 'native_fcm' || sub.endpoint?.includes('fcm.googleapis.com/fcm/send/')) {
        const fcmToken = sub.endpoint.replace('https://fcm.googleapis.com/fcm/send/', '');
        const serverKey = process.env.FCM_SERVER_KEY;
        if (serverKey) {
          try {
            await fetch('https://fcm.googleapis.com/fcm/send', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `key=${serverKey}`
              },
              body: JSON.stringify({
                to: fcmToken,
                priority: 'high',
                notification: {
                  title,
                  body,
                  sound: 'default'
                },
                data: {
                  title,
                  body,
                  route: '/'
                }
              })
            });
          } catch (fcmErr) {
            console.warn('[FCM Send Error]:', fcmErr);
          }
        }
        return;
      }

      // 2. إشعارات متصفحات الويب والـ PWA
      try {
        await webpush.sendNotification({
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh_key, auth: sub.auth_key }
        }, notificationPayload);
      } catch (e: any) {
        if (e.statusCode === 410 || e.statusCode === 404) {
          await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint);
        }
      }
    });

    await Promise.allSettled(promises);
    return res.status(200).json({ success: true, sent: validSubscriptions.length });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}
