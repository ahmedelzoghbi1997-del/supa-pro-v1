import { VercelRequest, VercelResponse } from '@vercel/node';
import { checkRateLimit, getClientIp } from './_lib/supabaseAdmin';
import { handleCors } from './_lib/cors';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!handleCors(req, res)) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const clientIp = getClientIp(req);
  if (!checkRateLimit('log-error', clientIp, 20, 60 * 1000)) {
    return res.status(429).json({ error: "تم تجاوز الحد المسموح لتسجيل الأخطاء" });
  }

  console.error("=== FRONTEND ERROR RECEIVED ===");
  const safePayload = JSON.stringify(req.body).substring(0, 500);
  console.error(safePayload);
  console.error("===============================");

  return res.json({ ok: true });
}
