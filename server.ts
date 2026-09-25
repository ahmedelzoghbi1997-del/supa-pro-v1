import express from "express";
import rateLimit from "express-rate-limit";
import { createServer as createViteServer } from "vite";
import path from "path";
import fs from "fs";
import { createClient } from "@supabase/supabase-js";
import sendPushHandler from "./api/send-push";
import crypto from "crypto";

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

const rawServerUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const supabaseUrl = (typeof rawServerUrl === 'string' && (rawServerUrl.startsWith('http://') || rawServerUrl.startsWith('https://')))
  ? rawServerUrl.trim()
  : '';
// حظر استخدام Anon Key على مستوى الخادم - العمليات الإدارية تتطلب حصراً مفتاح الخدمة
const supabaseServiceRoleKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();

if (!supabaseUrl) {
  console.warn("⚠️ تحذير: SUPABASE_URL غير معرّف أو غير صالح في متغيرات البيئة.");
}

if (!supabaseServiceRoleKey) {
  console.warn("⚠️ تحذير أمني: لم يتم العثور على SUPABASE_SERVICE_ROLE_KEY في متغيرات البيئة. تم إيقاف استخدام Anon Key في السيرفر وسترفض نقاط النهاية الإدارية العمل بدونه.");
}

// إنشاء عميل Supabase الخاص بالخادم بمفتاح الخدمة فقط
const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseServiceRoleKey || 'placeholder-key'
);

// Middleware: التحقق من وجود مفتاح SUPABASE_SERVICE_ROLE_KEY لنقاط النهاية الإدارية
function requireServiceRoleKey(_req: express.Request, res: express.Response, next: express.NextFunction) {
  if (!supabaseServiceRoleKey) {
    return res.status(503).json({
      error: "العمليات الإدارية على الخادم معطلة لعدم تكوين SUPABASE_SERVICE_ROLE_KEY في متغيرات البيئة."
    });
  }
  next();
}

// Middleware: Authenticate user using Bearer Token via supabase.auth.getUser
async function authenticateUser(req: express.Request, res: express.Response, next: express.NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: "غير مصرح - يرجى تسجيل الدخول أولاً وإرسال رمز المصادقة (Bearer Token)" });
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: "رمز المصادقة مفقود" });
  }

  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) {
      return res.status(401).json({ error: "جلسة المستخدم منتهية الصلاحية أو غير صالحة" });
    }

    (req as any).user = user;
    next();
  } catch (err: any) {
    console.error("Auth Middleware Error:", err);
    return res.status(401).json({ error: "فشل التحقق من هوية المستخدم" });
  }
}

// Middleware: Verify Owner Role
async function verifyOwnerRole(req: express.Request, res: express.Response, next: express.NextFunction) {
  const user = (req as any).user;
  if (!user) {
    return res.status(401).json({ error: "المستخدم غير موثق" });
  }

  try {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('id, role')
      .eq('id', user.id)
      .single();

    if (error || !profile) {
      return res.status(403).json({ error: "تعذر العثور على ملف تعريف المستخدم" });
    }

    if (profile.role !== 'owner') {
      return res.status(403).json({ error: "غير مصرح - هذه العملية مخصصة لمالك الحساب فقط (Owner)" });
    }

    (req as any).profile = profile;
    next();
  } catch (err: any) {
    console.error("Verify Owner Error:", err);
    return res.status(500).json({ error: "فشل التحقق من صلاحيات المالك" });
  }
}

function verifySecret(provided: string, expected: string): boolean {
  if (typeof provided !== "string" || typeof expected !== "string") {
    return false;
  }
  if (provided.length !== expected.length) {
    return false;
  }
  const providedBuffer = Buffer.from(provided, "utf-8");
  const expectedBuffer = Buffer.from(expected, "utf-8");
  if (providedBuffer.length !== expectedBuffer.length) {
    return false;
  }
  return crypto.timingSafeEqual(providedBuffer, expectedBuffer);
}

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json());

  // Rate Limiter for virtual login (5 requests per 15 minutes)
  const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    limit: 5, // Limit each IP to 5 requests per windowMs
    message: { error: "تم تجاوز عدد محاولات تسجيل الدخول المسموح بها، يرجى المحاولة لاحقاً" },
    standardHeaders: true,
    legacyHeaders: false,
  });

  // Rate Limiter for virtual member management (10 requests per 15 minutes)
  const virtualManageLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    limit: 10, // Limit each IP to 10 requests per windowMs
    message: { error: "تم تجاوز الحد المسموح من عمليات إدارة الحسابات، يرجى المحاولة لاحقاً" },
    standardHeaders: true,
    legacyHeaders: false,
  });

  // Rate Limiter for logging frontend errors (20 requests per minute)
  const logErrorLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    limit: 20, // Limit each IP to 20 requests per minute
    message: { error: "تم تجاوز الحد المسموح لتسجيل الأخطاء" },
    standardHeaders: true,
    legacyHeaders: false,
  });

  // API Route: Login for Virtual Members
  app.post("/api/auth/virtual-login", requireServiceRoleKey, loginLimiter, async (req, res) => {
    const { username, password } = req.body;
    try {
      const { data, error } = await supabase.rpc('virtual_login', {
        p_username: username,
        p_password: password
      });

      const member = Array.isArray(data) ? data[0] : data;

      if (error) {
        console.error("Virtual Login Supabase Error:", JSON.stringify(error, null, 2));
        if (error.message && error.message.includes("تم قفل الحساب مؤقتاً")) {
          return res.status(429).json({ error: "تم قفل الحساب مؤقتاً لكثرة المحاولات الخاطئة. يرجى المحاولة بعد 15 دقيقة." });
        }
        throw error;
      }
      if (!member || !member.id) {
        return res.status(401).json({ error: "اسم المستخدم أو كلمة المرور غير صحيحة" });
      }

      console.log("Virtual Login Success for user:", username);
      // Return the virtual profile information
      res.json({
        user: {
          id: `virtual_${member.id}`,
          full_name: member.full_name,
          role: member.role,
          parent_id: member.owner_id,
          username: member.username
        }
      });
    } catch (err: any) {
      console.error("Virtual Login Error:", err);
      res.status(500).json({ error: "فشل في تسجيل الدخول" });
    }
  });

  // API Route: Create Virtual Member
  app.post("/api/auth/create-virtual", requireServiceRoleKey, virtualManageLimiter, authenticateUser, verifyOwnerRole, async (req, res) => {
    const authUser = (req as any).user;
    const { owner_id, username, password, full_name, role } = req.body;

    // Ensure the requester can only create virtual members for their own account
    if (owner_id && owner_id !== authUser.id) {
      return res.status(403).json({ error: "غير مصرح لك بإنشاء حساب لمالك آخر" });
    }

    // 1. تحقق أن كلمة المرور طولها 6 أحرف على الأقل
    if (!password || typeof password !== 'string' || password.length < 6) {
      return res.status(400).json({ error: "يجب أن تكون كلمة المرور مكونة من 6 أحرف على الأقل" });
    }

    // 2. تحقق أن role قادمة من قائمة مسموحة فقط: 'viewer' أو 'editor'، وارفض غير ذلك برسالة 400
    const allowedRoles = ['viewer', 'editor'];
    if (!role || !allowedRoles.includes(role)) {
      return res.status(400).json({ error: "الصلاحية المحددة غير صالحة. الصلاحيات المسموح بها هي: 'viewer' أو 'editor'" });
    }

    try {
      // 3. ملاحظة تعليقية: التشفير يتم عبر الـ Trigger في قاعدة البيانات (trigger_hash_virtual_member_password).
      // أي فشل في الإدراج يجب أن يرجع رسالة الخطأ الفعلية من Supabase للمستخدم.
      const { data, error } = await supabase
        .from('virtual_members')
        .insert([{ owner_id: authUser.id, username, password, full_name, role }])
        .select('id, owner_id, username, full_name, role, last_seen, push_token, created_at')
        .single();

      if (error) {
        console.error("Create Virtual Supabase Error:", JSON.stringify(error, null, 2));
        return res.status(400).json({ error: error.message });
      }
      console.log("Create Virtual Supabase Success:", data);
      res.json(data);
    } catch (err: any) {
      console.error("Create Virtual Server Error:", err);
      res.status(500).json({ error: err.message || "فشل إنشاء الحساب الافتراضي" });
    }
  });

  // API Route: List Virtual Members
  app.get("/api/auth/list-virtual/:ownerId", requireServiceRoleKey, authenticateUser, verifyOwnerRole, async (req, res) => {
    const authUser = (req as any).user;
    const { ownerId } = req.params;

    // Ensure the requester can only list their own virtual members
    if (ownerId !== authUser.id) {
      return res.status(403).json({ error: "غير مصرح لك بعرض حسابات مالك آخر" });
    }

    try {
      const { data, error } = await supabase
        .from('virtual_members')
        .select('id, owner_id, username, full_name, role, last_seen, push_token, created_at')
        .eq('owner_id', authUser.id);

      if (error) {
        console.error("List Virtual Supabase Error:", JSON.stringify(error, null, 2));
        throw error;
      }
      res.json(data || []);
    } catch (err: any) {
      console.error("List Virtual Server Error:", err);
      res.status(500).json({ error: "فشل جلب الحسابات - ربما الجدول غير موجود في قاعدة البيانات" });
    }
  });

  // API Route: Delete Virtual Member
  app.delete("/api/auth/delete-virtual/:id", requireServiceRoleKey, virtualManageLimiter, authenticateUser, verifyOwnerRole, async (req, res) => {
    const authUser = (req as any).user;
    const { id } = req.params;

    try {
      // Check if virtual member exists and belongs to the authenticated owner
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
      res.json({ success: true });
    } catch (err: any) {
      console.error("Delete Virtual Server Error:", err);
      res.status(500).json({ error: "فشل حذف الحساب" });
    }
  });

  // API Route: Log Frontend Errors to Server Console securely
  app.post("/api/log-error", logErrorLimiter, (req, res) => {
    console.error("=== FRONTEND ERROR RECEIVED ===");
    // Truncate payload to 500 characters to prevent log flooding / memory exhaustion
    const safePayload = JSON.stringify(req.body).substring(0, 500);
    console.error(safePayload);
    console.error("===============================");
    
    res.json({ ok: true });
  });

  // API Route: Get Settings for User (Proxy / Fallback for iframe/CORS issues)
  app.get("/api/settings/:userId", requireServiceRoleKey, authenticateUser, async (req, res) => {
    const authUser = (req as any).user;
    const { userId } = req.params;

    // Verify userId matches authenticated user
    if (userId !== authUser.id) {
      return res.status(403).json({ error: "غير مصرح لك بالوصول لإعدادات هذا الحساب" });
    }

    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("app_settings")
        .eq("id", userId)
        .single();

      if (error) {
        return res.status(404).json({ error: error.message });
      }
      res.json(data?.app_settings || null);
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to fetch settings" });
    }
  });

  // API Route: Update Settings for User (Proxy / Fallback)
  app.post("/api/settings/:userId", requireServiceRoleKey, authenticateUser, async (req, res) => {
    const authUser = (req as any).user;
    const { userId } = req.params;
    const { settings } = req.body;

    // Verify userId matches authenticated user
    if (userId !== authUser.id) {
      return res.status(403).json({ error: "غير مصرح لك بتعديل إعدادات هذا الحساب" });
    }

    // 1. تحقق أن settings كائن (typeof === 'object') وليس null، وارفض غير ذلك برسالة 400.
    if (!settings || typeof settings !== 'object') {
      return res.status(400).json({ error: "يجب أن تكون الإعدادات كائنًا صالحًا" });
    }

    // 2. حدد حجم الحمولة: إذا تجاوز JSON.stringify(settings) حجم 100 كيلوبايت، ارفض برسالة 413 "حجم الإعدادات كبير جدًا".
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
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to update settings" });
    }
  });

  // Rate limiter for push subscriptions: 20 requests per minute
  const pushSubscriptionsLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    limit: 20,
    message: { error: "طلبات كثيرة جداً، يرجى المحاولة لاحقاً." }
  });

  // API Route: Create or Update Push Subscription (with client bypass / virtual members support)
  app.post("/api/push-subscriptions", pushSubscriptionsLimiter, async (req, res) => {
    const { user_id, endpoint, p256dh_key, auth_key } = req.body;

    if (!user_id || !endpoint) {
      return res.status(400).json({ error: "البيانات المدخلة غير كاملة" });
    }

    const isVirtual = typeof user_id === 'string' && user_id.startsWith('virtual_');

    let verified = false;

    if (isVirtual) {
      // 1. Virtual member case: verify the member exists in virtual_members table without checking owner_id
      const vId = user_id.replace('virtual_', '');
      try {
        const { data: virtualMember, error: vmError } = await supabase
          .from('virtual_members')
          .select('id')
          .eq('id', vId)
          .single();

        if (vmError || !virtualMember) {
          return res.status(403).json({ error: "العضو الافتراضي غير موجود أو تم حذفه" });
        }
        verified = true;
      } catch (err: any) {
        console.error("Error verifying virtual member push sub:", err);
        return res.status(403).json({ error: "حدث خطأ أثناء التحقق من العضو الافتراضي" });
      }
    } else {
      // 2. Regular authenticated user case: requires session validation
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: "غير مصرح - يرجى تسجيل الدخول أولاً وإرسال رمز المصادقة (Bearer Token)" });
      }

      const token = authHeader.split(' ')[1];
      if (!token) {
        return res.status(401).json({ error: "رمز المصادقة مفقود" });
      }

      try {
        const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
        if (authErr || !user) {
          return res.status(401).json({ error: "جلسة المستخدم منتهية الصلاحية أو غير صالحة" });
        }

        const { data: profile, error: profileErr } = await supabase
          .from('profiles')
          .select('id, parent_id')
          .eq('id', user.id)
          .single();

        if (profileErr || !profile) {
          return res.status(403).json({ error: "تعذر العثور على ملف تعريف المستخدم" });
        }

        if (user_id === profile.id || (profile.parent_id && user_id === profile.parent_id)) {
          verified = true;
        } else if (typeof user_id === 'string' && user_id.startsWith('virtual_')) {
          const vId = user_id.replace('virtual_', '');
          const { data: vm, error: vmErr } = await supabase
            .from('virtual_members')
            .select('id')
            .eq('id', vId)
            .eq('owner_id', user.id)
            .single();

          if (!vmErr && vm) {
            verified = true;
          }
        }
      } catch (err: any) {
        console.error("Push Subscription Auth Error:", err);
        return res.status(401).json({ error: "فشل التحقق من الهوية" });
      }
    }

    if (!verified) {
      return res.status(403).json({ error: "غير مصرح لك بتسجيل اشتراك الإشعارات لهذا المستخدم" });
    }

    try {
      // Delete any subscription with the same endpoint
      await supabase
        .from('push_subscriptions')
        .delete()
        .eq('endpoint', endpoint);

      // Insert the new subscription (bypassing RLS because server's supabase uses service_role_key)
      const { error: insertErr } = await supabase
        .from('push_subscriptions')
        .insert([
          {
            user_id,
            endpoint,
            p256dh_key,
            auth_key
          }
        ]);

      if (insertErr) {
        console.error("Failed to insert push subscription:", insertErr);
        return res.status(500).json({ error: "فشل حفظ اشتراك الإشعارات في قاعدة البيانات" });
      }

      return res.json({ success: true, message: "تم حفظ اشتراك الإشعارات بنجاح" });
    } catch (err: any) {
      console.error("Push Subscription Db Error:", err);
      return res.status(500).json({ error: "حدث خطأ غير متوقع أثناء حفظ اشتراك الإشعارات" });
    }
  });

  // API Route: Send Web Push (Compatible with Vercel Serverless Function)
  app.all("/api/send-push", async (req, res) => {
    const internalSecret = process.env.PUSH_INTERNAL_SECRET;
    const providedSecret = req.headers['x-internal-secret'] || (req.headers as any)['X-Internal-Secret'];
    const providedStr = Array.isArray(providedSecret) ? providedSecret[0] : (providedSecret as string || "");
    if (!internalSecret || !providedSecret || !verifySecret(providedStr, internalSecret)) {
      return res.status(401).json({ error: 'Unauthorized: Invalid or missing internal secret' });
    }

    try {
      await sendPushHandler(req as any, res as any);
    } catch (err: any) {
      console.error("Error invoking /api/send-push:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // Vite middleware for development
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

  // Middleware نهائي: إرجاع 404 JSON لمسارات API غير المعرفة، وخدمة index.html
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
