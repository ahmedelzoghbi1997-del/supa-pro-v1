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
  process.env.VITE_SUPABASE_URL || 'https://ibudczfescwpmldarfbi.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlidWRjemZlc2N3cG1sZGFyZmJpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjExMzczOTksImV4cCI6MjA3NjcxMzM5OX0.nleKjCMgO2cOhMFR8psjXPqHnUK8PoAvv5kcp22KDKw'
);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const payload = req.body;
    const record = payload.record || {};
    const table = payload.table || 'invoices';
    
    // معرف الشريك الذي قام بتسجيل الفاتورة لاستبعاده من الإشعار
    const actionCreatorId = record.created_by || record.user_id;

    let title = "حركة جديدة 🧾";
    let body = `تم تسجيل حركة جديدة في النظام.`;

    if (table === 'invoices') {
      const customerName = record.customer_name || '';
      const amount = record.total_amount || record.net_amount || record.amount || 0;
      title = "فاتورة جديدة 📄";
      body = `تم تسجيل فاتورة لـ ${customerName} بقيمة ${amount} ج.م`;
    }

    // ارسال اشعار للخادم اللحظي
    await supabase.channel('global_notifications').send({
      type: 'broadcast',
      event: 'new_transaction',
      payload: { table, record, eventType: 'INSERT' }
    });
    
    const { data: subscriptions } = await supabase.from('push_subscriptions').select('*');
    if (!subscriptions) return res.status(200).json({ message: 'No subscriptions' });

    // الفلترة الذكية (للشركاء فقط): استبعاد الشخص الذي أضاف الفاتورة للتو
    const validSubscriptions = subscriptions.filter(sub => sub.user_id !== actionCreatorId);

    const notificationPayload = JSON.stringify({
      title, body,
      icon: '/icon-192x192.png', badge: '/icon-192x192.png',
      vibrate: [200, 100, 200], url: '/'
    });

    const promises = validSubscriptions.map(async (sub) => {
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
