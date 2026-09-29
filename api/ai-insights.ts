import { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI } from '@google/genai';
import { handleCors } from './_lib/cors';

// In-memory rate limiter (First layer before distributed cache/Redis)
interface RateLimitRecord {
  timestamps: number[];
}

const rateLimitMap = new Map<string, RateLimitRecord>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 10; // max 10 requests per minute per IP

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(ip) || { timestamps: [] };

  // Filter timestamps within current window
  const validTimestamps = record.timestamps.filter(ts => now - ts < RATE_LIMIT_WINDOW_MS);

  if (validTimestamps.length >= MAX_REQUESTS_PER_WINDOW) {
    rateLimitMap.set(ip, { timestamps: validTimestamps });
    return true;
  }

  validTimestamps.push(now);
  rateLimitMap.set(ip, { timestamps: validTimestamps });

  // Periodically cleanup stale entries
  if (rateLimitMap.size > 500) {
    for (const [key, val] of rateLimitMap.entries()) {
      const active = val.timestamps.filter(t => now - t < RATE_LIMIT_WINDOW_MS);
      if (active.length === 0) {
        rateLimitMap.delete(key);
      } else {
        rateLimitMap.set(key, { timestamps: active });
      }
    }
  }

  return false;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // 1. CORS & Preflight handling
  if (!handleCors(req, res)) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'الطريقة غير مسموحة (Method Not Allowed)' });
  }

  // 2. In-Memory Rate Limiting
  const clientIp = (
    (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
    req.socket?.remoteAddress ||
    'anonymous'
  );

  if (isRateLimited(clientIp)) {
    res.setHeader('Retry-After', '60');
    return res.status(429).json({
      error: 'تم تجاوز الحد المسموح للطلبات. يرجى الانتظار دقيقة قبل المحاولة مرة أخرى.'
    });
  }

  // 3. API Key check on server environment
  const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
  if (!apiKey) {
    return res.status(503).json({
      error: 'خدمة التحليل الذكي غير متاحة حالياً لعدم تكوين مفتاح GEMINI_API_KEY على الخادم.'
    });
  }

  try {
    const { summaryData, userName } = req.body || {};

    if (!summaryData) {
      return res.status(400).json({ error: 'بيانات الملخص المالي مفقودة.' });
    }

    const name = typeof userName === 'string' && userName.trim() ? userName.trim() : (typeof summaryData.userName === 'string' ? summaryData.userName : 'المستخدم');

    const prompt = `
مرحباً، اسمي هو ${name}.
هذه هي بياناتي المالية الزراعية للشهر الحالي والعروات النشطة:
${JSON.stringify(summaryData, null, 2)}

قدم لي ملاحظة ذكية ومختصرة (جملة واحدة أو اثنتين) باللغة العربية. ركز على أهم شيء، مثل زيادة كبيرة في المصاريف، أو أداء ممتاز لعروة معينة، أو مقارنة الإيرادات بالمصروفات. اجعل النص ودودًا ومباشرًا واحترافيًا دون مقدمات طويلة.
`;

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        systemInstruction: 'أنت مستشار مالي وزراعي ذكي وخبير في محاسبة المزارع والبيوت المحمية والعروات. تقدم تحليلات موجزة ودقيقة ومباشرة باللغة العربية.',
        temperature: 0.7,
      }
    });

    const insightText = response.text || '';
    return res.status(200).json({ insight: insightText });

  } catch (err: unknown) {
    console.error('Server error in /api/ai-insights:', err);

    let statusCode = 500;
    let errorMessage = 'حدث خطأ أثناء توليد التحليل الذكي. يرجى المحاولة مرة أخرى.';

    if (err instanceof Error) {
      if (err.message.includes('429') || err.message.includes('RESOURCE_EXHAUSTED') || err.message.includes('quota')) {
        statusCode = 429;
        errorMessage = 'تم تجاوز حصة طلبات الذكاء الاصطناعي الحالية. يرجى المحاولة لاحقاً.';
      } else if (err.message.includes('API_KEY_INVALID') || err.message.includes('403')) {
        statusCode = 502;
        errorMessage = 'مفتاح خدمة الذكاء الاصطناعي غير صالح أو غير مصرح.';
      }
    }

    return res.status(statusCode).json({ error: errorMessage });
  }
}
