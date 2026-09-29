import { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * دالة مساعدة لجلب قائمة الأصول المسموح بها من متغير البيئة ALLOWED_ORIGINS والإعدادات الافتراضية
 */
export function getAllowedOrigins(): string[] {
  const envOrigins = (process.env.ALLOWED_ORIGINS || "")
    .split(",")
    .map(o => o.trim())
    .filter(Boolean);

  const vercelUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "";
  const vercelProjectUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "";

  const defaults = [
    "http://localhost:3000",
    "http://localhost:5173",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:5173",
    "capacitor://localhost",
    "ionic://localhost",
    "http://localhost",
  ];

  if (vercelUrl) defaults.push(vercelUrl);
  if (vercelProjectUrl) defaults.push(vercelProjectUrl);

  return Array.from(new Set([...envOrigins, ...defaults]));
}

/**
 * التحقق مما إذا كان النطاق (Origin) مسموحاً به
 */
export function isOriginAllowed(origin: string | undefined, hostHeader?: string): boolean {
  // إذا لم يكن هناك Origin (مثل استدعاء الخادم لنفسه أو طلب مباشر)، يُسمح بالطلب
  if (!origin) return true;

  const allowedList = getAllowedOrigins();
  if (allowedList.includes(origin)) return true;

  // مطابقة الـ Host الحالي للطلب
  if (hostHeader && (origin === `http://${hostHeader}` || origin === `https://${hostHeader}`)) {
    return true;
  }

  // السماح بنطاقات Vercel الفرعية لمعاينات الفروع (*.vercel.app)
  if (/^https:\/\/[a-zA-Z0-9_-]+\.vercel\.app$/i.test(origin)) {
    return true;
  }

  // السماح بنطاقات Cloud Run / AI Studio لمعاينة التطبيق (*.run.app)
  if (/^https:\/\/[a-zA-Z0-9_-]+\.run\.app$/i.test(origin)) {
    return true;
  }

  // السماح بـ Localhost بأي منفذ في بيئة التطوير
  if (process.env.NODE_ENV !== "production") {
    if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin)) {
      return true;
    }
  }

  // السماح بأصول تطبيقات الهواتف الأصلية (Capacitor / Ionic)
  if (origin.startsWith("capacitor://") || origin.startsWith("ionic://")) {
    return true;
  }

  return false;
}

/**
 * معالجة ترويسات CORS والـ Preflight OPTIONS مع رفض الطلبات غير المصرح بها برمز 403
 * @returns true إذا كان الطلب مسموحاً بمواصلة المعالجة، أو false إذا تم إنهاء الاستجابة (OPTIONS أو 403)
 */
export function handleCors(req: VercelRequest, res: VercelResponse): boolean {
  const origin = (req.headers.origin as string) || (req.headers.Origin as string);
  const host = (req.headers.host as string) || (req.headers.Host as string);

  if (origin) {
    if (!isOriginAllowed(origin, host)) {
      res.status(403).json({ error: "غير مصرح - النطاق غير مسموح به (Forbidden Origin)" });
      return false;
    }

    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader("Vary", "Origin");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS, PATCH");
    res.setHeader(
      "Access-Control-Allow-Headers",
      "Origin, X-Requested-With, Content-Type, Accept, Authorization, X-Internal-Secret, x-internal-secret"
    );
  }

  if (req.method === "OPTIONS") {
    res.status(200).end();
    return false;
  }

  return true;
}
