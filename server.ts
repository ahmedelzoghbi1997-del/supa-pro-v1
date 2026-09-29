/**
 * ==============================================================================
 * خادم التطوير المحلي وبيئة Node.js (Local Development & Express Server)
 * ==============================================================================
 * ملاحظة معمارية هامة:
 * - بيئة الإنتاج على منصة Vercel تعتمد مباشرة على الدوال اللامركزية (Serverless Functions)
 *   الموجودة في مجلد `api/`.
 * - هذا الملف `server.ts` مخصص للتطوير المحلي (npm run dev / tsx server.ts) أو التشغيل كحاوية Node.js،
 *   ويقوم بتمرير كافة مسارات `/api/*` إلى نفس الدوال البرمجية الموحدة في `api/` لضمان تطابق السلوك 100%.
 * ==============================================================================
 */

import express from "express";
import helmet from "helmet";
import { createServer as createViteServer } from "vite";
import path from "path";
import fs from "fs";
import { isOriginAllowed } from "./api/_lib/cors";

// استيراد معالجات API الموحدة من مجلد api/
import virtualLoginHandler from "./api/auth/virtual-login";
import createVirtualHandler from "./api/auth/create-virtual";
import listVirtualHandler from "./api/auth/list-virtual/[ownerId]";
import deleteVirtualHandler from "./api/auth/delete-virtual/[id]";
import settingsHandler from "./api/settings/[userId]";
import pushSubscriptionsHandler from "./api/push-subscriptions";
import logErrorHandler from "./api/log-error";
import sendPushHandler from "./api/send-push";
import aiInsightsHandler from "./api/ai-insights";

// تحميل متغيرات البيئة محلياً إن وجدت
if (typeof (process as any).loadEnvFile === 'function') {
  try { (process as any).loadEnvFile(); } catch {}
}

try {
  const envPath = path.join(process.cwd(), '.env');
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf-8');
    content.split('\n').forEach(line => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const idx = trimmed.indexOf('=');
        if (idx !== -1) {
          const key = trimmed.substring(0, idx).trim();
          const val = trimmed.substring(idx + 1).trim();
          if (key && !process.env[key]) {
            process.env[key] = val;
          }
        }
      }
    });
  }
} catch {}

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  // ============================================================================
  // 1. تفعيل Helmet مع Content Security Policy (CSP) وسياسات الأمان الصارمة
  // ============================================================================
  app.use(helmet({
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: [
          "'self'",
          "'unsafe-inline'",
          "'unsafe-eval'",
          "blob:",
          "https://*.supabase.co",
        ],
        styleSrc: [
          "'self'",
          "'unsafe-inline'",
          "https:",
        ],
        imgSrc: [
          "'self'",
          "data:",
          "blob:",
          "https://*.supabase.co",
          "https://*.google.com",
          "https://*.google.dev",
        ],
        fontSrc: [
          "'self'",
          "data:",
          "blob:",
          "https:",
        ],
        connectSrc: [
          "'self'",
          "https://*.supabase.co",
          "wss://*.supabase.co",
          "https://*.vercel.app",
          "https://*.run.app",
          "https://generativelanguage.googleapis.com",
          "http://localhost:*",
          "ws://localhost:*",
          "ws:",
          "wss:",
        ],
        workerSrc: [
          "'self'",
          "blob:",
        ],
        manifestSrc: ["'self'"],
        frameAncestors: ["'self'", "https://*.google.com", "https://*.google.dev", "https://*.run.app", "https://*.vercel.app", "capacitor://*", "*"],
      },
    },
    // frameguard: معطل لتمكين معاينة التطبيق داخل إطار المنصة (AI Studio preview iframe)
    frameguard: false,
    // hsts: إجبار اتصالات HTTPS لمدة سنة كاملة
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
    // noSniff: منع تخمين أنواع الملفات (MIME type sniffing)
    noSniff: true,
    // xssFilter: تفعيل فلتر XSS للمتصفحات القديمة
    xssFilter: true,
    // crossOriginResourcePolicy: السماح بتحميل الموارد عبر النطاقات المسموحة بأمان
    crossOriginResourcePolicy: { policy: "cross-origin" },
    // crossOriginEmbedderPolicy: معطل للسماح بتحميل الصور وملفات PWA والخطوط دون قيود COEP
    crossOriginEmbedderPolicy: false,
    // crossOriginOpenerPolicy: معطل لتجنب تعارضات فتح النوافذ والتوثيق المنبثق
    crossOriginOpenerPolicy: false,
  }));

  // ============================================================================
  // 2. معالجة CORS والتحقق من النطاقات المسموحة (ALLOWED_ORIGINS)
  // ============================================================================
  app.use((req, res, next) => {
    const origin = req.headers.origin;
    const host = req.headers.host;

    if (origin) {
      if (!isOriginAllowed(origin, host)) {
        return res.status(403).json({ error: "غير مصرح - النطاق غير مسموح به (Forbidden Origin)" });
      }

      res.header("Access-Control-Allow-Origin", origin);
      res.header("Access-Control-Allow-Credentials", "true");
      res.header("Vary", "Origin");
      res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS, PATCH");
      res.header(
        "Access-Control-Allow-Headers",
        "Origin, X-Requested-With, Content-Type, Accept, Authorization, X-Internal-Secret, x-internal-secret"
      );
    }

    if (req.method === "OPTIONS") {
      return res.status(200).end();
    }

    next();
  });

  // Trust proxy for reverse proxy environments (Vercel / Cloud Run)
  app.set('trust proxy', 1);

  app.use(express.json());

  // ============================================================================
  // 3. API Routes (تمرير الطلبات لنفس المعالجات المشتركة مع Vercel Serverless Functions)
  // ============================================================================

  // Auth: Virtual Login
  app.post("/api/auth/virtual-login", async (req, res) => {
    await virtualLoginHandler(req as any, res as any);
  });

  // Auth: Create Virtual Member
  app.post("/api/auth/create-virtual", async (req, res) => {
    await createVirtualHandler(req as any, res as any);
  });

  // Auth: List Virtual Members
  app.get("/api/auth/list-virtual/:ownerId", async (req, res) => {
    await listVirtualHandler(req as any, res as any);
  });

  // Auth: Delete Virtual Member
  app.delete("/api/auth/delete-virtual/:id", async (req, res) => {
    await deleteVirtualHandler(req as any, res as any);
  });

  // Settings: Get & Update Settings
  app.all("/api/settings/:userId", async (req, res) => {
    await settingsHandler(req as any, res as any);
  });

  // Push Subscriptions
  app.post("/api/push-subscriptions", async (req, res) => {
    await pushSubscriptionsHandler(req as any, res as any);
  });

  // Log Error
  app.post("/api/log-error", async (req, res) => {
    await logErrorHandler(req as any, res as any);
  });

  // Send Push (Internal Secret protected)
  app.all("/api/send-push", async (req, res) => {
    await sendPushHandler(req as any, res as any);
  });

  // AI Insights (Server-side Gemini)
  app.all("/api/ai-insights", async (req, res) => {
    await aiInsightsHandler(req as any, res as any);
  });

  // ============================================================================
  // 4. Vite Frontend Middleware / Static Serving
  // ============================================================================

  let vite: any = null;
  if (process.env.NODE_ENV !== "production") {
    vite = await createViteServer({
      server: { middlewareMode: true, hmr: false },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
  }

  // Fallback for SPA routing
  app.use(async (req, res, next) => {
    if (req.path.startsWith('/api/') || req.path === '/api') {
      return res.status(404).json({ error: "المسار غير موجود (Endpoint not found)" });
    }

    if (process.env.NODE_ENV === "production") {
      const distPath = path.join(process.cwd(), 'dist');
      return res.sendFile(path.join(distPath, 'index.html'));
    }

    if (vite) {
      try {
        const indexPath = path.join(process.cwd(), 'index.html');
        let template = fs.readFileSync(indexPath, 'utf-8');
        template = await vite.transformIndexHtml(req.originalUrl, template);
        return res.status(200).set({ 'Content-Type': 'text/html' }).send(template);
      } catch (e) {
        return next(e);
      }
    }

    res.status(404).send("Not Found");
  });

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
