import { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import webpush from 'web-push';

const pushSupabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const pushSupabaseKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '').trim();

if (!pushSupabaseUrl) {
  console.warn("⚠️ تحذير: SUPABASE_URL أو VITE_SUPABASE_URL غير معرّف في api/send-push.");
}
if (!pushSupabaseKey) {
  console.warn("⚠️ تحذير: لم يتم العثور على مفتاح Supabase في متغيرات البيئة في api/send-push.");
}

// يتم استخدام المفتاح المتاح للاتصال بقاعدة البيانات
const supabase = createClient(
  pushSupabaseUrl || 'https://placeholder.supabase.co',
  pushSupabaseKey || 'placeholder-key'
);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // التحقق من المفتاح السري الداخلي للأمان
  const internalSecret = process.env.PUSH_INTERNAL_SECRET;
  const providedSecret = req.headers['x-internal-secret'] || (req.headers as any)['X-Internal-Secret'];
  if (!internalSecret || !providedSecret || providedSecret !== internalSecret) {
    return res.status(401).json({ error: 'Unauthorized: Invalid or missing internal secret' });
  }

  // التحقق من وجود مفاتيح VAPID لإرسال الإشعارات
  const vapidEmail = process.env.VAPID_EMAIL;
  const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
  const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;

  if (!vapidEmail || !vapidPublicKey || !vapidPrivateKey) {
    return res.status(500).json({
      error: 'إعدادات الخادم غير مكتملة: مفاتيح VAPID مفقودة (يرجى التأكد من تعيين VAPID_EMAIL و VAPID_PUBLIC_KEY و VAPID_PRIVATE_KEY في متغيرات البيئة).'
    });
  }

  try {
    webpush.setVapidDetails(
      vapidEmail.startsWith('mailto:') ? vapidEmail : `mailto:${vapidEmail}`,
      vapidPublicKey,
      vapidPrivateKey
    );
  } catch (vapidErr: any) {
    console.error('VAPID setup error:', vapidErr);
    return res.status(500).json({ error: `فشل تهيئة مفاتيح VAPID: ${vapidErr.message}` });
  }

  try {
    const payload = req.body;
    const record = payload.record || {};
    const table = payload.table || 'invoices';
    
    // معرف الشريك أو المزرعة (المالك)
    const ownerId = payload.owner_id || payload.effectiveUserId || record.owner_id || record.user_id;
    const actionCreatorId = record.created_by || record.user_id;

    // إذا كان ownerId غير موجود أرجع نجاحًا دون إرسال لأي أحد
    if (!ownerId) {
      return res.status(200).json({ success: true, message: 'No ownerId provided, skipped' });
    }

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

    // إحضار الحسابات لمعرفة أدوار المستخدمين والشركاء التابعين لهذا المالك
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, role, parent_id')
      .or(`id.eq.${ownerId},parent_id.eq.${ownerId}`);

    const associatedUserIds = new Set<string>([ownerId, ...(profiles || []).map((p: any) => p.id)]);
    const ownerIds = (profiles || []).filter((p: any) => p.role === 'owner').map((p: any) => p.id);

    const { data: subscriptions } = await supabase.from('push_subscriptions').select('*');
    if (!subscriptions || subscriptions.length === 0) {
      return res.status(200).json({ success: true, message: 'No subscriptions' });
    }

    // الفلترة الذكية: إرسال الإشعارات فقط للاشتراكات المرتبطة بنفس ownerId (للشركاء فقط)
    // 1- يجب أن يكون الاشتراك مرتبطاً بالمالك (owner_id أو user_id يتبع المالك)
    // 2- استبعاد حسابات المالك (owner)
    // 3- استبعاد من قام بالإضافة (actionCreatorId)
    const validSubscriptions = subscriptions.filter(sub => {
      const isRelatedToOwner = (sub.owner_id === ownerId) || (sub.user_id && associatedUserIds.has(sub.user_id));
      if (!isRelatedToOwner) return false;
      if (ownerIds.includes(sub.user_id)) return false;
      return sub.user_id !== actionCreatorId;
    });

    if (validSubscriptions.length === 0) {
      return res.status(200).json({ success: true, message: 'No matching subscriptions for this owner', sent: 0 });
    }

    const notificationPayload = JSON.stringify({
      title, body,
      icon: '/icon-192x192.png', badge: '/badge-icon.png',
      vibrate: [200, 100, 200], url: '/'
    });

    const promises = validSubscriptions.map(async (sub) => {
      // إشعارات متصفحات الويب والـ PWA عبر Web Push
      if (!sub.endpoint || !sub.p256dh_key || !sub.auth_key || sub.auth_key === 'native_fcm') {
        return;
      }

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
