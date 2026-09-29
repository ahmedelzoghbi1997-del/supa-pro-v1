import { VercelRequest, VercelResponse } from '@vercel/node';
import { getSupabaseAdmin, requireServiceRole, authenticateUser, verifyOwnerRole, checkRateLimit, getClientIp } from '../../_lib/supabaseAdmin';
import { handleCors } from '../../_lib/cors';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!handleCors(req, res)) return;
  if (req.method !== 'DELETE') return res.status(405).json({ error: 'Method not allowed' });

  if (!requireServiceRole(res)) return;

  const clientIp = getClientIp(req);
  if (!checkRateLimit('virtual-manage', clientIp, 10, 15 * 60 * 1000)) {
    return res.status(429).json({ error: "تم تجاوز الحد المسموح من عمليات إدارة الحسابات، يرجى المحاولة لاحقاً" });
  }

  const authUser = await authenticateUser(req, res);
  if (!authUser) return;

  const ownerProfile = await verifyOwnerRole(authUser, res);
  if (!ownerProfile) return;

  const id = (req.query?.id || (req as any).params?.id) as string;
  if (!id) {
    return res.status(400).json({ error: "معرف الحساب مطلوب" });
  }

  const supabase = getSupabaseAdmin();
  try {
    const { data: member, error: fetchError } = await supabase
      .from('virtual_members')
      .select('id, owner_id')
      .eq('id', id)
      .single();

    if (fetchError || !member) {
      return res.status(404).json({ error: "الحساب الافتراضي غير موجود" });
    }

    if (member.owner_id !== authUser.id) {
      return res.status(403).json({ error: "غير مصرح لك بحذف هذا الحساب الافتراضي" });
    }

    const { error } = await supabase
      .from('virtual_members')
      .delete()
      .eq('id', id);

    if (error) {
      console.error("Delete Virtual Supabase Error:", JSON.stringify(error, null, 2));
      throw error;
    }
    return res.json({ success: true });
  } catch (err: any) {
    console.error("Delete Virtual Server Error:", err);
    return res.status(500).json({ error: "فشل حذف الحساب" });
  }
}
