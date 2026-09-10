import express from "express";
import rateLimit from "express-rate-limit";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";

const __filename = fileURLToPath(import.meta.env ? new URL(import.meta.url) : import.meta.url);
const __dirname = path.dirname(__filename);

const supabaseUrl = 'https://ibudczfescwpmldarfbi.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlidWRjemZlc2N3cG1sZGFyZmJpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjExMzczOTksImV4cCI6MjA3NjcxMzM5OX0.nleKjCMgO2cOhMFR8psjXPqHnUK8PoAvv5kcp22KDKw';

if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.warn("⚠️ Running with Anon Key. Service Role Key is recommended for virtual member management (bypass RLS).");
}

// Note: Using service role key is recommended for creating users without logging out.
// For now, if no service role is provided, we use the anon key (which has limits).
const supabase = createClient(supabaseUrl, supabaseKey);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Rate Limiter for virtual login
  const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // Limit each IP to 5 requests per windowMs
    message: { error: "تم تجاوز عدد محاولات تسجيل الدخول المسموح بها، يرجى المحاولة لاحقاً" },
    standardHeaders: true,
    legacyHeaders: false,
  });

  // API Route: Login for Virtual Members
  app.post("/api/auth/virtual-login", loginLimiter, async (req, res) => {
    const { username, password } = req.body;
    try {
      const { data, error } = await supabase.rpc('virtual_login', {
        p_username: username,
        p_password: password
      });

      const member = Array.isArray(data) ? data[0] : data;

      if (error) {
        console.error("Virtual Login Supabase Error:", JSON.stringify(error, null, 2));
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
  app.post("/api/auth/create-virtual", async (req, res) => {
    const { owner_id, username, password, full_name, role } = req.body;
    try {
      const { data, error } = await supabase
        .from('virtual_members')
        .insert([{ owner_id, username, password, full_name, role }])
        .select()
        .single();

      if (error) {
        console.error("Create Virtual Supabase Error:", JSON.stringify(error, null, 2));
        throw error;
      }
      console.log("Create Virtual Supabase Success:", data);
      res.json(data);
    } catch (err: any) {
      console.error("Create Virtual Server Error:", err);
      res.status(500).json({ error: "فشل إنشاء الحساب الافتراضي - تأكد من إعداد قاعدة البيانات" });
    }
  });

  // API Route: List Virtual Members
  app.get("/api/auth/list-virtual/:ownerId", async (req, res) => {
    const { ownerId } = req.params;
    try {
      const { data, error } = await supabase
        .from('virtual_members')
        .select('*')
        .eq('owner_id', ownerId);

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
  app.delete("/api/auth/delete-virtual/:id", async (req, res) => {
    const { id } = req.params;
    try {
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
  app.post("/api/log-error", (req, res) => {
    console.error("=== FRONTEND ERROR RECEIVED ===");
    // Truncate payload to 500 characters to prevent log flooding / memory exhaustion
    const safePayload = JSON.stringify(req.body).substring(0, 500);
    console.error(safePayload);
    console.error("===============================");
    
    res.json({ ok: true });
  });

  // API Route: Get Settings for User (Proxy / Fallback for iframe/CORS issues)
  app.get("/api/settings/:userId", async (req, res) => {
    const { userId } = req.params;
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
  app.post("/api/settings/:userId", async (req, res) => {
    const { userId } = req.params;
    const { settings } = req.body;
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

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
