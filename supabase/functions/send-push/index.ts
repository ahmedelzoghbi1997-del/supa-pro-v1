import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import webpush from "npm:web-push@3.6.7";

// مفاتيح VAPID
const VAPID_SUBJECT = Deno.env.get('VAPID_SUBJECT') || "mailto:ahmed.elzoghbe1997@gmail.com";
const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY') || "BP101sEliba9o7qrqxHPriHkFkTS5OhokFOu0-G7wf1UmP---IP3WYsagVoozyRAyCdSoXt-TrQianQOuhMh5Xk";
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY') || "JrDTClsx-eI2Ac4cPw3K34HXRUEoT2yYfB0CMzrE4wE";

// تهيئة إعدادات VAPID في مكتبة web-push
webpush.setVapidDetails(
  VAPID_SUBJECT,
  VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY
);

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || 'https://ibudczfescwpmldarfbi.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_ANON_KEY') || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlidWRjemZlc2N3cG1sZGFyZmJpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjExMzczOTksImV4cCI6MjA3NjcxMzM5OX0.nleKjCMgO2cOhMFR8psjXPqHnUK8PoAvv5kcp22KDKw';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // التعامل مع طلبات الـ CORS Preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const payload = await req.json().catch(() => ({}));
    console.log("Push trigger received with payload:", JSON.stringify(payload));

    const { type: _type, record, title: customTitle, body: customBody } = payload;

    // استخراج محتوى الإشعار
    const title = customTitle || "فاتورة جديدة 🧾";
    let body = customBody || "تم تسجيل فاتورة جديدة بنجاح في النظام.";

    if (record) {
      const invoiceNumber = record.invoice_number || record.id || '';
      const customerName = record.customer_name || record.market || '';
      const amount = Number(record.total_amount || record.amount || 0).toLocaleString('en-US');

      if (customerName) {
        body = `تم تسجيل فاتورة لـ ${customerName} بقيمة ${amount} ج.م`;
      } else if (invoiceNumber) {
        body = `تم تسجيل فاتورة جديدة برقم #${invoiceNumber} بقيمة ${amount} ج.م`;
      }
    }

    // جلب الاشتراكات المسجلة من جدول push_subscriptions
    const query = supabase.from('push_subscriptions').select('*');

    // إذا كان السجل مرتبطاً بمستخدم محدد، يمكن إرسال الإشعار لحسابات هذا المستخدم ومشاركيه
    // وفي حال رغبتك بإرسال الإشعار لجميع الأجهزة المسجلة:
    const { data: subscriptions, error: fetchError } = await query;

    if (fetchError) {
      throw new Error(`خطأ في جلب الاشتراكات: ${fetchError.message}`);
    }

    if (!subscriptions || subscriptions.length === 0) {
      console.log("No push subscriptions found in database.");
      return new Response(
        JSON.stringify({ success: true, message: "لا توجد أجهزة مسجلة في جدول push_subscriptions" }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    console.log(`Sending Web Push to ${subscriptions.length} subscriptions...`);

    // تجهيز حزمة الإشعار للـ Service Worker
    const notificationPayload = JSON.stringify({
      title: title,
      body: body,
      icon: '/icon-192x192.png',
      badge: '/icon-192x192.png',
      vibrate: [200, 100, 200],
      data: {
        dateOfArrival: Date.now(),
        url: '/',
        table: table || 'invoices',
        recordId: record?.id || null,
      }
    });

    const results = await Promise.allSettled(
      subscriptions.map(async (sub) => {
        const pushSubscription = {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh_key,
            auth: sub.auth_key,
          },
        };

        try {
          await webpush.sendNotification(pushSubscription, notificationPayload);
          return { endpoint: sub.endpoint, status: 'sent' };
        } catch (pushErr: any) {
          console.error(`Failed to send to endpoint: ${sub.endpoint}`, pushErr.statusCode || pushErr.message);

          // إذا انتهت صلاحية الاشتراك في خادم المتصفح (410 Gone أو 404 Not Found)، نقوم بحذفه
          if (pushErr.statusCode === 410 || pushErr.statusCode === 404) {
            console.log(`Removing expired subscription: ${sub.endpoint}`);
            await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint);
          }
          throw pushErr;
        }
      })
    );

    const successful = results.filter((r) => r.status === 'fulfilled').length;
    const failed = results.filter((r) => r.status === 'rejected').length;

    console.log(`Push notifications result: ${successful} succeeded, ${failed} failed.`);

    return new Response(
      JSON.stringify({
        success: true,
        sent: successful,
        failed: failed,
        total: subscriptions.length,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (err: any) {
    console.error("Error in send-push function:", err);
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
