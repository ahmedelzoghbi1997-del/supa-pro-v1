// Supabase Edge Function: push-notify
// يُستخدم لإرسال الإشعارات لحظياً عبر Firebase Cloud Messaging (FCM) و WebPush
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const fcmServerKey = Deno.env.get("FCM_SERVER_KEY") || "";

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    const payload = await req.json();
    const { table, record, type } = payload;
    const actionRecord = record || {};

    let title = "إشعار جديد 🔔";
    let body = "تم تسجيل حركة جديدة في النظام";

    if (table === "invoices") {
      const customer = actionRecord.customer_name ? ` لـ ${actionRecord.customer_name}` : "";
      const amount = actionRecord.total_amount || actionRecord.net_amount || actionRecord.amount || 0;
      title = "فاتورة مبيعات جديدة 📄";
      body = `تم تسجيل فاتورة مبيعات جديدة${customer} بقيمة ${amount} ج.م`;
    } else if (table === "expenses") {
      const desc = actionRecord.description ? ` (${actionRecord.description})` : "";
      const amount = actionRecord.amount || 0;
      title = "مصروف جديد 💸";
      body = `تم تسجيل مصروف جديد${desc} بقيمة ${amount} ج.م`;
    } else if (table === "farmer_withdrawals") {
      const amount = actionRecord.amount || 0;
      title = "سحب نقدي للمزارع 🌾";
      body = `تم تسجيل سحب نقدي للمزارع بقيمة ${amount} ج.م`;
    } else if (table === "supplier_payments") {
      const amount = actionRecord.amount || 0;
      title = "سداد دفعة للمورد 📦";
      body = `تم تسجيل دفعة للمورد بقيمة ${amount} ج.م`;
    } else if (table === "advances") {
      const amount = actionRecord.amount || 0;
      title = "حركة سلفة 💵";
      body = `تم تسجيل حركة سلفة بقيمة ${amount} ج.م`;
    }

    // جلب اشتراكات الـ Push
    const { data: subscriptions, error: subError } = await supabase
      .from("push_subscriptions")
      .select("*");

    if (subError || !subscriptions || subscriptions.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: "No active subscriptions found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // إرسال الإشعارات إلى أجهزة أندرويد عبر FCM مع الأيقونة المفرغة واللون
    const fcmPromises = subscriptions.map(async (sub: any) => {
      // توكنات FCM لأجهزة أندرويد
      const isNative = sub.auth_key === "native_fcm" || sub.endpoint?.includes("fcm.googleapis.com/fcm/send/");
      if (!isNative) return null;

      const fcmToken = sub.endpoint.replace("https://fcm.googleapis.com/fcm/send/", "");
      if (!fcmServerKey) {
        console.warn("[FCM] FCM_SERVER_KEY not set in Supabase Secrets");
        return null;
      }

      try {
        const response = await fetch("https://fcm.googleapis.com/fcm/send", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `key=${fcmServerKey}`,
          },
          body: JSON.stringify({
            to: fcmToken,
            priority: "high",
            notification: {
              title: title,
              body: body,
              sound: "default",
              icon: "ic_notification",
              color: "#10B981",
            },
            data: {
              title: title,
              body: body,
              table: table || "",
              route: "/",
            },
          }),
        });

        const resData = await response.json();
        return resData;
      } catch (err) {
        console.error("[FCM Error]:", err);
        return null;
      }
    });

    const results = await Promise.allSettled(fcmPromises);

    return new Response(
      JSON.stringify({ success: true, count: results.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
