// Supabase Edge Function: push-notify
// يُستخدم لإرسال الإشعارات لحظياً عبر Firebase Cloud Messaging (FCM HTTP v1 API)
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://supa-pro-v1.vercel.app",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// تخزين التوكن مؤقتاً لتفادي إعادة طلبه مع كل استدعاء
let cachedAccessToken: string | null = null;
let tokenExpiresAt = 0;

function base64UrlEncodeBytes(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function base64UrlEncodeString(str: string): string {
  return base64UrlEncodeBytes(new TextEncoder().encode(str));
}

/**
 * توليد Google OAuth2 Access Token باستخدام FCM_SERVICE_ACCOUNT_KEY
 * عبر Web Crypto API الأصلي في Deno دون أي مكتبات خارجية
 */
async function getGoogleAccessToken(serviceAccount: {
  client_email: string;
  private_key: string;
  project_id: string;
}): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  if (cachedAccessToken && now < tokenExpiresAt - 60) {
    return cachedAccessToken;
  }

  const pem = serviceAccount.private_key;
  const b64 = pem
    .replace(/-----BEGIN [A-Z ]+-----/, "")
    .replace(/-----END [A-Z ]+-----/, "")
    .replace(/\s+/g, "");
  const binary = atob(b64);
  const keyBytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    keyBytes[i] = binary.charCodeAt(i);
  }

  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8",
    keyBytes.buffer,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const header = base64UrlEncodeString(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claim = base64UrlEncodeString(
    JSON.stringify({
      iss: serviceAccount.client_email,
      scope: "https://www.googleapis.com/auth/firebase.messaging",
      aud: "https://oauth2.googleapis.com/token",
      exp: now + 3600,
      iat: now,
    })
  );

  const signData = new TextEncoder().encode(`${header}.${claim}`);
  const signatureBuffer = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", cryptoKey, signData);
  const signature = base64UrlEncodeBytes(new Uint8Array(signatureBuffer));
  const jwt = `${header}.${claim}.${signature}`;

  const tokenResp = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });

  const tokenData = await tokenResp.json();
  if (!tokenResp.ok || !tokenData.access_token) {
    throw new Error(`Failed to obtain Google access token: ${JSON.stringify(tokenData)}`);
  }

  cachedAccessToken = tokenData.access_token;
  tokenExpiresAt = now + (tokenData.expires_in || 3600);
  return cachedAccessToken;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // التحقق الأمني: حصر استدعاء الدالة بحاملي مفتاح Service Role Key فقط
  const authHeader = req.headers.get("Authorization") || req.headers.get("authorization");
  const expectedServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!expectedServiceKey || authHeader !== `Bearer ${expectedServiceKey}`) {
    return new Response(
      JSON.stringify({ error: "Unauthorized" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const rawServiceAccount = Deno.env.get("FCM_SERVICE_ACCOUNT_KEY") || "";

    if (!rawServiceAccount) {
      console.error("[Push Notify] Error: FCM_SERVICE_ACCOUNT_KEY not found in secrets");
      return new Response(
        JSON.stringify({ error: "FCM_SERVICE_ACCOUNT_KEY secret is missing" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let serviceAccount: {
      client_email: string;
      private_key: string;
      project_id: string;
    };
    try {
      serviceAccount = typeof rawServiceAccount === "string" ? JSON.parse(rawServiceAccount) : rawServiceAccount;
    } catch (e) {
      console.error("[Push Notify] Error parsing FCM_SERVICE_ACCOUNT_KEY:", e);
      return new Response(
        JSON.stringify({ error: "Failed to parse FCM_SERVICE_ACCOUNT_KEY JSON" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    const payload = await req.json();
    const { table, record } = payload;
    const actionRecord = record || {};
    const lowerTable = String(table || "").toLowerCase().trim();

    // معرف الشريك أو المزرعة (المالك)
    const ownerId = payload.owner_id || payload.effectiveUserId || actionRecord.owner_id || actionRecord.user_id;
    const actionCreatorId = actionRecord.created_by || actionRecord.user_id;

    // إذا كان ownerId غير موجود أرجع نجاحًا دون إرسال لأي أحد
    if (!ownerId) {
      return new Response(
        JSON.stringify({ success: true, message: "No ownerId provided, skipped" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let title = "إشعار جديد 🔔";
    let body = "تم تسجيل حركة جديدة في النظام";

    if (lowerTable === "invoices" || lowerTable === "invoice") {
      const customer = actionRecord.customer_name || actionRecord.market || actionRecord.client_name || actionRecord.merchant || "";
      const customerStr = customer ? ` لـ ${customer}` : "";
      
      let amount = Number(actionRecord.total_amount || actionRecord.net_amount || actionRecord.amount || actionRecord.total || actionRecord.total_price || 0);

      // إذا كان المبلغ 0 وموجود id الفاتورة، نحاول جلب إجمالي بنود الأسعار من جدول invoice_price_items
      if (!amount && actionRecord.id) {
        try {
          const { data: priceItems } = await supabase
            .from("invoice_price_items")
            .select("quantity, price_per_kg")
            .eq("invoice_id", actionRecord.id);

          if (priceItems && priceItems.length > 0) {
            amount = priceItems.reduce((acc: number, item: any) => {
              const q = Number(item.quantity) || 0;
              const p = Number(item.price_per_kg) || 0;
              return acc + (q * p);
            }, 0);
          }
        } catch (itemErr) {
          console.warn("[Push Notify] Failed to fetch invoice price items:", itemErr);
        }
      }

      title = "فاتورة مبيعات جديدة 📄";
      body = amount > 0
        ? `تم تسجيل فاتورة مبيعات جديدة${customerStr} بقيمة ${amount} ج.م`
        : `تم تسجيل فاتورة مبيعات جديدة${customerStr}`;
    } else if (lowerTable === "expenses" || lowerTable === "expense") {
      let expenseDesc = actionRecord.description || actionRecord.name || actionRecord.notes || "";
      
      // إذا لم يكن هناك وصف وكان هناك معرف تصنيف، نحاول جلب اسم التصنيف
      if (!expenseDesc && actionRecord.category_id) {
        try {
          const { data: cat } = await supabase
            .from("categories")
            .select("name")
            .eq("id", actionRecord.category_id)
            .maybeSingle();
          if (cat?.name) expenseDesc = cat.name;
        } catch (_) {}
      }

      const descStr = expenseDesc ? ` (${expenseDesc})` : "";
      const amount = Number(actionRecord.amount || actionRecord.cost || actionRecord.total || 0);
      title = "مصروف جديد 💸";
      body = amount > 0
        ? `تم تسجيل مصروف جديد${descStr} بقيمة ${amount} ج.م`
        : `تم تسجيل مصروف جديد${descStr}`;
    } else if (lowerTable === "farmer_withdrawals" || lowerTable === "farmer_withdrawal" || lowerTable === "withdrawals") {
      const amount = Number(actionRecord.amount || 0);
      title = "سحب نقدي للمزارع 🌾";
      body = amount > 0
        ? `تم تسجيل سحب نقدي للمزارع بقيمة ${amount} ج.م`
        : `تم تسجيل سحب نقدي للمزارع`;
    } else if (lowerTable === "supplier_payments" || lowerTable === "supplier_payment") {
      const amount = Number(actionRecord.amount || 0);
      title = "سداد دفعة للمورد 📦";
      body = amount > 0
        ? `تم تسجيل دفعة للمورد بقيمة ${amount} ج.م`
        : `تم تسجيل دفعة للمورد`;
    } else if (lowerTable === "advances" || lowerTable === "advance") {
      const amount = Number(actionRecord.amount || 0);
      title = "حركة سلفة 💵";
      body = amount > 0
        ? `تم تسجيل حركة سلفة بقيمة ${amount} ج.م`
        : `تم تسجيل حركة سلفة`;
    }

    // إحضار الحسابات لمعرفة أدوار المستخدمين والشركاء التابعين لهذا المالك
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, role, parent_id")
      .or(`id.eq.${ownerId},parent_id.eq.${ownerId}`);

    const associatedUserIds = new Set<string>([ownerId, ...(profiles || []).map((p: any) => p.id)]);
    const ownerIds = (profiles || []).filter((p: any) => p.role === "owner").map((p: any) => p.id);

    const validUserIds = [ownerId, ...(profiles || []).map((p: any) => p.id)];
    // جلب اشتراكات الـ Push
    const { data: subscriptions, error: subError } = await supabase
      .from("push_subscriptions")
      .select("*")
      .in("user_id", validUserIds);

    if (subError || !subscriptions || subscriptions.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: "No subscriptions found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // تصفية الاشتراكات التابعة لهذا المالك فقط (للشركاء مع استبعاد المالك ومنشئ الحركة)
    const validSubscriptions = subscriptions.filter((sub: any) => {
      const isRelatedToOwner = (sub.owner_id === ownerId) || (sub.user_id && associatedUserIds.has(sub.user_id));
      if (!isRelatedToOwner) return false;
      if (ownerIds.includes(sub.user_id)) return false;
      return sub.user_id !== actionCreatorId;
    });

    if (validSubscriptions.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: "No matching subscriptions for this owner", processed: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // استخراج Google OAuth2 Access Token
    const accessToken = await getGoogleAccessToken(serviceAccount);
    const projectId = serviceAccount.project_id;
    const fcmV1Url = `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`;

    // إرسال الإشعارات إلى الأجهزة المؤهلة عبر FCM HTTP v1 API
    const sendPromises = validSubscriptions.map(async (sub: any) => {
      // استخراج توكن FCM
      let fcmToken = "";
      if (sub.endpoint && sub.endpoint.includes("/fcm/send/")) {
        fcmToken = sub.endpoint.split("/fcm/send/")[1];
      } else if (sub.auth_key === "native_fcm" || (sub.endpoint && !sub.endpoint.startsWith("http"))) {
        fcmToken = sub.endpoint;
      }

      if (!fcmToken) {
        return null;
      }

      // بناء هيكل رسالة FCM v1 المخصص لتطبيقات الويب (PWA)
      // يحتوي على notification الأساسي، مع حذف android بالكامل والاعتماد حصراً على webpush
      const messagePayload = {
        message: {
          token: fcmToken,
          notification: {
            title: title,
            body: body,
          },
          data: {
            title: String(title),
            body: String(body),
            icon: "https://supa-pro-v1.vercel.app/icon-192x192.png",
            badge: "https://supa-pro-v1.vercel.app/badge-icon.png",
            table: String(table || ""),
            route: "/",
          },
          webpush: {
            headers: {
              Urgency: "high",
            },
            notification: {
              title: title,
              body: body,
              icon: "https://supa-pro-v1.vercel.app/icon-192x192.png",
              badge: "https://supa-pro-v1.vercel.app/badge-icon.png",
            },
          },
        },
      };

      try {
        const resp = await fetch(fcmV1Url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${accessToken}`,
          },
          body: JSON.stringify(messagePayload),
        });

        const resultData = await resp.json();
        if (!resp.ok) {
          console.warn(`[FCM HTTP v1 Error] Status ${resp.status}:`, resultData);
          if (resp.status === 404 || resultData?.error?.details?.some((d: any) => d.errorCode === "UNREGISTERED")) {
            await supabase.from("push_subscriptions").delete().eq("id", sub.id);
          }
        }
        return { success: resp.ok, result: resultData };
      } catch (sendErr) {
        console.error("[FCM Send Exception]:", sendErr);
        return { success: false, error: String(sendErr) };
      }
    });

    const results = await Promise.allSettled(sendPromises);

    return new Response(
      JSON.stringify({ success: true, processed: results.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("[Push Notify Function Error]:", error);
    return new Response(
      JSON.stringify({ error: error.message || String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
