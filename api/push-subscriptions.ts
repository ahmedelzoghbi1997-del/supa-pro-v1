import { VercelRequest, VercelResponse } from '@vercel/node';
import { getSupabaseAdmin, checkRateLimit, getClientIp } from './_lib/supabaseAdmin';
import { handleCors } from './_lib/cors';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!handleCors(req, res)) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const clientIp = getClientIp(req);
  if (!checkRateLimit('push-subscriptions', clientIp, 20, 60 * 1000)) {
    return res.status(429).json({ error: "طلبات كثيرة جداً، يرجى المحاولة لاحقاً." });
  }

  const { user_id, endpoint, p256dh_key, auth_key } = req.body || {};

  if (!user_id || !endpoint) {
    return res.status(400).json({ error: "البيانات المدخلة غير كاملة" });
  }

  const isVirtual = typeof user_id === 'string' && user_id.startsWith('virtual_');
  const supabase = getSupabaseAdmin();

  let verified = false;

  if (isVirtual) {
    // 1. Virtual member case: verify the member exists in virtual_members table without checking owner_id
    const vId = user_id.replace('virtual_', '');
    try {
      const { data: virtualMember, error: vmError } = await supabase
        .from('virtual_members')
        .select('id')
        .eq('id', vId)
        .single();

      if (vmError || !virtualMember) {
        return res.status(403).json({ error: "العضو الافتراضي غير موجود أو تم حذفه" });
      }
      verified = true;
    } catch (err: any) {
      console.error("Error verifying virtual member push sub:", err);
      return res.status(403).json({ error: "حدث خطأ أثناء التحقق من العضو الافتراضي" });
    }
  } else {
    // 2. Regular authenticated user case: requires session validation
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: "غير مصرح - يرجى تسجيل الدخول أولاً وإرسال رمز المصادقة (Bearer Token)" });
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: "رمز المصادقة مفقود" });
    }

    try {
      const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
      if (authErr || !user) {
        return res.status(401).json({ error: "جلسة المستخدم منتهية الصلاحية أو غير صالحة" });
      }

      const { data: profile, error: profileErr } = await supabase
        .from('profiles')
        .select('id, parent_id')
        .eq('id', user.id)
        .single();

      if (profileErr || !profile) {
        return res.status(403).json({ error: "تعذر العثور على ملف تعريف المستخدم" });
      }

      if (user_id === profile.id || (profile.parent_id && user_id === profile.parent_id)) {
        verified = true;
      } else if (typeof user_id === 'string' && user_id.startsWith('virtual_')) {
        const vId = user_id.replace('virtual_', '');
        const { data: vm, error: vmErr } = await supabase
          .from('virtual_members')
          .select('id')
          .eq('id', vId)
          .eq('owner_id', user.id)
          .single();

        if (!vmErr && vm) {
          verified = true;
        }
      }
    } catch (err: any) {
      console.error("Push Subscription Auth Error:", err);
      return res.status(401).json({ error: "فشل التحقق من الهوية" });
    }
  }

  if (!verified) {
    return res.status(403).json({ error: "غير مصرح لك بتسجيل اشتراك الإشعارات لهذا المستخدم" });
  }

  try {
    // Delete any subscription with the same endpoint
    await supabase
      .from('push_subscriptions')
      .delete()
      .eq('endpoint', endpoint);

    // Insert the new subscription (bypassing RLS because server's supabase uses service_role_key)
    const { error: insertErr } = await supabase
      .from('push_subscriptions')
      .insert([
        {
          user_id,
          endpoint,
          p256dh_key,
          auth_key
        }
      ]);

    if (insertErr) {
      console.error("Failed to insert push subscription:", insertErr);
      return res.status(500).json({ error: "فشل حفظ اشتراك الإشعارات في قاعدة البيانات" });
    }

    return res.json({ success: true, message: "تم حفظ اشتراك الإشعارات بنجاح" });
  } catch (err: any) {
    console.error("Push Subscription Db Error:", err);
    return res.status(500).json({ error: "حدث خطأ غير متوقع أثناء حفظ اشتراك الإشعارات" });
  }
}
