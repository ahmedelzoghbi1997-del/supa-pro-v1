import { VercelRequest, VercelResponse } from '@vercel/node';
import { getSupabaseAdmin, requireServiceRole, authenticateUser, verifyOwnerRole } from '../../_lib/supabaseAdmin';
import { handleCors } from '../../_lib/cors';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!handleCors(req, res)) return;
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  if (!requireServiceRole(res)) return;

  const authUser = await authenticateUser(req, res);
  if (!authUser) return;

  const ownerProfile = await verifyOwnerRole(authUser, res);
  if (!ownerProfile) return;

  const ownerId = (req.query?.ownerId || (req as any).params?.ownerId) as string;

  // Ensure the requester can only list their own virtual members
  if (ownerId !== authUser.id) {
    return res.status(403).json({ error: "غير مصرح لك بعرض حسابات مالك آخر" });
  }

  const supabase = getSupabaseAdmin();
  try {
    const { data, error } = await supabase
      .from('virtual_members')
      .select('id, owner_id, username, full_name, role, last_seen, push_token, created_at')
      .eq('owner_id', authUser.id);

    if (error) {
      console.error("List Virtual Supabase Error:", JSON.stringify(error, null, 2));
      throw error;
    }
    return res.json(data || []);
  } catch (err: any) {
    console.error("List Virtual Server Error:", err);
    return res.status(500).json({ error: "فشل جلب الحسابات - ربما الجدول غير موجود في قاعدة البيانات" });
  }
}
