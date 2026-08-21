-- ==========================================
-- ملف إعداد مشغلات الإشعارات في قاعدة بيانات Supabase (نسخة آمنة ومحمية)
-- ==========================================
-- هذا الملف يقوم بربط جداول النظام بدالة الـ Edge Function تلقائياً عند إضافة سجلات جديدة.
-- تم تزويد الدالة بحماية كاملة (Exception Handling) لضمان عدم توقف عمليات الحفظ (INSERT) أبداً
-- حتى في حال عدم تفعيل خدمة الإشعارات أو حدوث خطأ في حزمة pg_net.

-- 1. تفعيل حزمة pg_net لإرسال طلبات الـ HTTP
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 2. إنشاء الدالة المشغلة المحمية (Safe Trigger Function)
CREATE OR REPLACE FUNCTION public.send_push_notification_on_insert()
RETURNS TRIGGER AS $$
DECLARE
  -- استبدل <PROJECT_REF> بمعرف مشروعك في سوبابيز (مثال: abcdefghijklm)
  project_ref TEXT := '<PROJECT_REF>'; 
  
  -- استبدل <SERVICE_ROLE_KEY> بمفتاح الـ service_role_key الخاص بمشروعك
  service_role_key TEXT := '<SERVICE_ROLE_KEY>';
  
  fcm_url TEXT;
  payload JSONB;
BEGIN
  -- التحقق من تهيئة البيانات؛ إذا لم تكن مهيأة يتم تخطي الإشعار لعدم تعطيل الحفظ
  IF project_ref = '<PROJECT_REF>' OR service_role_key = '<SERVICE_ROLE_KEY>' OR project_ref IS NULL OR length(project_ref) < 5 THEN
    RETURN NEW;
  END IF;

  BEGIN
    -- بناء رابط الـ Edge Function
    fcm_url := 'https://' || project_ref || '.supabase.co/functions/v1/push-notify';

    -- تجهيز الحمولة المطلوبة للـ Edge Function
    payload := jsonb_build_object(
      'type', 'INSERT',
      'table', TG_TABLE_NAME,
      'record', row_to_json(NEW)
    );

    -- إرسال الإشعار في الخلفية عبر pg_net
    PERFORM net.http_post(
      url := fcm_url,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || service_role_key
      ),
      body := payload
    );
  EXCEPTION WHEN OTHERS THEN
    -- حماية مطلقة: في حال فشل الاتصال أو حدوث خطأ في pg_net (مثل Quote command error)، لا يتم إيقاف حفظ البيانات
    RAISE WARNING 'Push notification trigger failed safely: %', SQLERRM;
  END;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. تنظيف أي مشغلات سابقة لضمان عدم وجود تكرار
DROP TRIGGER IF EXISTS trg_push_notify_invoices ON public.invoices;
DROP TRIGGER IF EXISTS trg_push_notify_expenses ON public.expenses;
DROP TRIGGER IF EXISTS trg_push_notify_farmer_withdrawals ON public.farmer_withdrawals;
DROP TRIGGER IF EXISTS trg_push_notify_supplier_payments ON public.supplier_payments;
DROP TRIGGER IF EXISTS trg_push_notify_advances ON public.advances;

-- 4. ربط المشغلات بالجداول الخمسة الأساسية عند الإدخال (INSERT)
CREATE TRIGGER trg_push_notify_invoices
AFTER INSERT ON public.invoices
FOR EACH ROW EXECUTE FUNCTION public.send_push_notification_on_insert();

CREATE TRIGGER trg_push_notify_expenses
AFTER INSERT ON public.expenses
FOR EACH ROW EXECUTE FUNCTION public.send_push_notification_on_insert();

CREATE TRIGGER trg_push_notify_farmer_withdrawals
AFTER INSERT ON public.farmer_withdrawals
FOR EACH ROW EXECUTE FUNCTION public.send_push_notification_on_insert();

CREATE TRIGGER trg_push_notify_supplier_payments
AFTER INSERT ON public.supplier_payments
FOR EACH ROW EXECUTE FUNCTION public.send_push_notification_on_insert();

CREATE TRIGGER trg_push_notify_advances
AFTER INSERT ON public.advances
FOR EACH ROW EXECUTE FUNCTION public.send_push_notification_on_insert();

-- ========================================================
-- في حال رغبتك في إيقاف المشغلات فوراً دون تشغيل الإشعارات، نفّذ التالي فقط:
-- DROP TRIGGER IF EXISTS trg_push_notify_invoices ON public.invoices;
-- DROP TRIGGER IF EXISTS trg_push_notify_expenses ON public.expenses;
-- DROP TRIGGER IF EXISTS trg_push_notify_farmer_withdrawals ON public.farmer_withdrawals;
-- DROP TRIGGER IF EXISTS trg_push_notify_supplier_payments ON public.supplier_payments;
-- DROP TRIGGER IF EXISTS trg_push_notify_advances ON public.advances;
-- ========================================================
