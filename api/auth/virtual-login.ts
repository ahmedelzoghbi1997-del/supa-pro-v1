import { VercelRequest, VercelResponse } from '@vercel/node';
import { getSupabaseAdmin, requireServiceRole, checkRateLimit, getClientIp } from '../_lib/supabaseAdmin';
import { handleCors } from '../_lib/cors';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!handleCors(req, res)) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  if (!requireServiceRole(res)) return;

  const clientIp = getClientIp(req);
  if (!checkRateLimit('virtual-login', clientIp, 5, 15 * 60 * 1000)) {
    return res.status(429).json({ error: "تم تجاوز عدد محاولات تسجيل الدخول المسموح بها، يرجى المحاولة لاحقاً" });
  }

  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ error: "اسم المستخدم وكلمة المرور مطلوبان" });
  }

  const supabase = getSupabaseAdmin();
  try {
    const { data, error } = await supabase.rpc('virtual_login', {
      p_username: username,
      p_password: password
    });

    const member = Array.isArray(data) ? data[0] : data;

    if (error) {
      console.error("Virtual Login Supabase Error:", JSON.stringify(error, null, 2));
      if (error.message && error.message.includes("تم قفل الحساب مؤقتاً")) {
        return res.status(429).json({ error: "تم قفل الحساب مؤقتاً لكثرة المحاولات الخاطئة. يرجى المحاولة بعد 15 دقيقة." });
      }
      throw error;
    }
    if (!member || !member.id) {
      return res.status(401).json({ error: "اسم المستخدم أو كلمة المرور غير صحيحة" });
    }

    return res.json({
      user: {
        id: `virtual_${member.id}`,
        full_name: member.full_name,
        role: member.role,
        parent_id: member.owner_id,
        username: member.username
      }
    });
  } catch (err: any) {
    console.error("Virtual Login Error:", err);
    return res.status(500).json({ error: "فشل في تسجيل الدخول" });
  }
}
