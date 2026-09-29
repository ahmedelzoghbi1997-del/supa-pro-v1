import { VercelRequest, VercelResponse } from '@vercel/node';
import { getSupabaseAdmin, requireServiceRole, authenticateUser, verifyOwnerRole, checkRateLimit, getClientIp } from '../_lib/supabaseAdmin';
import { handleCors } from '../_lib/cors';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!handleCors(req, res)) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  if (!requireServiceRole(res)) return;

  const clientIp = getClientIp(req);
  if (!checkRateLimit('virtual-manage', clientIp, 10, 15 * 60 * 1000)) {
    return res.status(429).json({ error: "تم تجاوز الحد المسموح من عمليات إدارة الحسابات، يرجى المحاولة لاحقاً" });
  }

  const authUser = await authenticateUser(req, res);
  if (!authUser) return;

  const ownerProfile = await verifyOwnerRole(authUser, res);
  if (!ownerProfile) return;

  const { owner_id, username, password, full_name, role } = req.body || {};

  // Ensure the requester can only create virtual members for their own account
  if (owner_id && owner_id !== authUser.id) {
    return res.status(403).json({ error: "غير مصرح لك بإنشاء حساب لمالك آخر" });
  }

  // 1. تحقق أن كلمة المرور طولها 6 أحرف على الأقل
  if (!password || typeof password !== 'string' || password.length < 6) {
    return res.status(400).json({ error: "يجب أن تكون كلمة المرور مكونة من 6 أحرف على الأقل" });
  }

  // 2. تحقق أن role قادمة من قائمة مسموحة فقط: 'viewer' أو 'editor'
  const allowedRoles = ['viewer', 'editor'];
  if (!role || !allowedRoles.includes(role)) {
    return res.status(400).json({ error: "الصلاحية المحددة غير صالحة. الصلاحيات المسموح بها هي: 'viewer' أو 'editor'" });
  }

  const supabase = getSupabaseAdmin();
  try {
    const { data, error } = await supabase
      .from('virtual_members')
      .insert([{ owner_id: authUser.id, username, password, full_name, role }])
      .select('id, owner_id, username, full_name, role, last_seen, push_token, created_at')
      .single();

    if (error) {
      console.error("Create Virtual Supabase Error:", JSON.stringify(error, null, 2));
      return res.status(400).json({ error: error.message });
    }

    return res.json(data);
  } catch (err: any) {
    console.error("Create Virtual Server Error:", err);
    return res.status(500).json({ error: err.message || "فشل إنشاء الحساب الافتراضي" });
  }
}
