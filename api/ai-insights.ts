import { VercelRequest, VercelResponse } from '@vercel/node';
import { handleCors } from './_lib/cors';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // 1. CORS & Preflight handling
  if (!handleCors(req, res)) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'الطريقة غير مسموحة (Method Not Allowed)' });
  }

  // AI insights feature disabled as per user request (no Gemini API required)
  return res.status(200).json({ 
    insight: 'خدمة الذكاء الاصطناعي معطلة بطلب المستخدم، ولا تتطلب أي مفتاح API.' 
  });
}
