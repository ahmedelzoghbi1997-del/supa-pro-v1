import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { VercelRequest, VercelResponse } from '@vercel/node';

const rawServerUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
export const supabaseUrl = (typeof rawServerUrl === 'string' && (rawServerUrl.startsWith('http://') || rawServerUrl.startsWith('https://')))
  ? rawServerUrl.trim()
  : '';

export const supabaseServiceRoleKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();

let cachedClient: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient {
  if (cachedClient) return cachedClient;

  cachedClient = createClient(
    supabaseUrl || 'https://placeholder.supabase.co',
    supabaseServiceRoleKey || 'placeholder-key'
  );
  return cachedClient;
}

export function requireServiceRole(res: VercelResponse): boolean {
  if (!supabaseServiceRoleKey) {
    res.status(503).json({
      error: "العمليات الإدارية على الخادم معطلة لعدم تكوين SUPABASE_SERVICE_ROLE_KEY في متغيرات البيئة."
    });
    return false;
  }
  return true;
}

export async function authenticateUser(req: VercelRequest, res: VercelResponse): Promise<any | null> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: "غير مصرح - يرجى تسجيل الدخول أولاً وإرسال رمز المصادقة (Bearer Token)" });
    return null;
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    res.status(401).json({ error: "رمز المصادقة مفقود" });
    return null;
  }

  const supabase = getSupabaseAdmin();
  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) {
      res.status(401).json({ error: "جلسة المستخدم منتهية الصلاحية أو غير صالحة" });
      return null;
    }
    return user;
  } catch (err: any) {
    console.error("Auth helper error:", err);
    res.status(401).json({ error: "فشل التحقق من هوية المستخدم" });
    return null;
  }
}

export async function verifyOwnerRole(user: any, res: VercelResponse): Promise<any | null> {
  if (!user) {
    res.status(401).json({ error: "المستخدم غير موثق" });
    return null;
  }

  const supabase = getSupabaseAdmin();
  try {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('id, role')
      .eq('id', user.id)
      .single();

    if (error || !profile) {
      res.status(403).json({ error: "تعذر العثور على ملف تعريف المستخدم" });
      return null;
    }

    if (profile.role !== 'owner') {
      res.status(403).json({ error: "غير مصرح - هذه العملية مخصصة لمالك الحساب فقط (Owner)" });
      return null;
    }

    return profile;
  } catch (err: any) {
    console.error("Verify Owner helper error:", err);
    res.status(500).json({ error: "فشل التحقق من صلاحيات المالك" });
    return null;
  }
}

// In-Memory Rate Limiter Utility
interface RateLimitBucket {
  timestamps: number[];
}

const rateLimiters = new Map<string, Map<string, RateLimitBucket>>();

export function checkRateLimit(key: string, ip: string, limit: number, windowMs: number): boolean {
  if (!rateLimiters.has(key)) {
    rateLimiters.set(key, new Map());
  }
  const buckets = rateLimiters.get(key)!;
  const now = Date.now();
  const record = buckets.get(ip) || { timestamps: [] };

  const validTimestamps = record.timestamps.filter(ts => now - ts < windowMs);

  if (validTimestamps.length >= limit) {
    buckets.set(ip, { timestamps: validTimestamps });
    return false; // Rate limited
  }

  validTimestamps.push(now);
  buckets.set(ip, { timestamps: validTimestamps });

  // Cleanup
  if (buckets.size > 500) {
    for (const [clientIp, val] of buckets.entries()) {
      const active = val.timestamps.filter(t => now - t < windowMs);
      if (active.length === 0) {
        buckets.delete(clientIp);
      } else {
        buckets.set(clientIp, { timestamps: active });
      }
    }
  }

  return true; // Allowed
}

export function getClientIp(req: VercelRequest): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  if (Array.isArray(forwarded) && forwarded.length > 0) {
    return forwarded[0].trim();
  }
  return (req.socket as any)?.remoteAddress || 'anonymous';
}
