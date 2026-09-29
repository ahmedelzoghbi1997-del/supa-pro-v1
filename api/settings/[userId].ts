import { VercelRequest, VercelResponse } from '@vercel/node';
import { getSupabaseAdmin, requireServiceRole, authenticateUser } from '../_lib/supabaseAdmin';
import { handleCors } from '../_lib/cors';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!handleCors(req, res)) return;

  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!requireServiceRole(res)) return;

  const authUser = await authenticateUser(req, res);
  if (!authUser) return;

  const userId = (req.query?.userId || (req as any).params?.userId) as string;

  // Verify userId matches authenticated user
  if (userId !== authUser.id) {
    return res.status(403).json({ error: "غير مصرح لك بالوصول لإعدادات هذا الحساب" });
  }

  const supabase = getSupabaseAdmin();

  // GET: Retrieve Settings
  if (req.method === 'GET') {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("app_settings")
        .eq("id", userId)
        .single();

      if (error) {
        return res.status(404).json({ error: error.message });
      }
      return res.json(data?.app_settings || null);
    } catch (err: any) {
      return res.status(500).json({ error: err.message || "Failed to fetch settings" });
    }
  }

  // POST: Update Settings
  if (req.method === 'POST') {
    const { settings } = req.body || {};

    // 1. تحقق أن settings كائن (typeof === 'object') وليس null
    if (!settings || typeof settings !== 'object') {
      return res.status(400).json({ error: "يجب أن تكون الإعدادات كائنًا صالحًا" });
    }

    // 2. حدد حجم الحمولة: إذا تجاوز JSON.stringify(settings) حجم 100 كيلوبايت، ارفض برسالة 413
    try {
      const settingsStr = JSON.stringify(settings);
      const byteLength = Buffer.byteLength(settingsStr, 'utf8');
      if (byteLength > 100 * 1024) {
        return res.status(413).json({ error: "حجم الإعدادات كبير جدًا" });
      }
    } catch (_e) {
      return res.status(400).json({ error: "فشل في تحويل الإعدادات إلى JSON" });
    }

    try {
      const { error } = await supabase
        .from("profiles")
        .update({ app_settings: settings })
        .eq("id", userId);

      if (error) {
        return res.status(400).json({ error: error.message });
      }
      return res.json({ success: true });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || "Failed to update settings" });
    }
  }
}
