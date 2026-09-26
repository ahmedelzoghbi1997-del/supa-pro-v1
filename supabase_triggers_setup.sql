-- ==============================================================================
-- ملف إعداد مشغلات الإشعارات في قاعدة بيانات Supabase (نسخة آمنة ومشفرة)
-- ==============================================================================
-- هذا الملف يقوم بربط جداول النظام بدالة الـ Edge Function تلقائياً عند إضافة سجلات جديدة.
-- تم تأمين قراءة معرف المشروع ومفتاح الخدمة عبر إعدادات PostgreSQL و Supabase Vault
-- بدلاً من تضمين المفاتيح كنصوص صريحة داخل كود الدوال، مع حماية كاملة (Exception Handling)
-- لضمان عدم توقف عمليات الحفظ (INSERT) أبداً حتى في حال عدم تفعيل خدمة الإشعارات.

-- 1. تفعيل حزمة pg_net لإرسال طلبات الـ HTTP
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 2. دالة مساعدة محمية لقراءة مفتاح service_role بأمان من Supabase Vault أو من إعدادات القاعدة
CREATE OR REPLACE FUNCTION public.get_push_service_key()
RETURNS TEXT AS $$
DECLARE
  v_secret TEXT;
BEGIN
  -- 1. محاولة القراءة من Supabase Vault (vault.decrypted_secrets)
  BEGIN
    SELECT decrypted_secret INTO v_secret 
    FROM vault.decrypted_secrets 
    WHERE name = 'service_role_key' OR name = 'SUPABASE_SERVICE_ROLE_KEY'
    LIMIT 1;
  EXCEPTION WHEN OTHERS THEN
    v_secret := NULL;
  END;

  -- 2. إذا لم يكن في Vault، محاولة القراءة من إعدادات قاعدة البيانات (PostgreSQL Settings)
  IF v_secret IS NULL OR length(v_secret) < 10 THEN
    v_secret := NULLIF(current_setting('app.supabase_service_role_key', true), '');
    IF v_secret IS NULL THEN
      v_secret := NULLIF(current_setting('app.service_role_key', true), '');
    END IF;
  END IF;

  RETURN v_secret;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- تقييد صلاحية تنفيذ دالة قراءة المفتاح للـ postgres و service_role فقط ومنع الوصول العام
REVOKE ALL ON FUNCTION public.get_push_service_key() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_push_service_key() FROM anon;
REVOKE ALL ON FUNCTION public.get_push_service_key() FROM authenticated;

-- 3. إنشاء الدالة المشغلة المحمية (Safe Trigger Function)
CREATE OR REPLACE FUNCTION public.send_push_notification_on_insert()
RETURNS TRIGGER AS $$
DECLARE
  project_ref TEXT;
  service_role_key TEXT;
  fcm_url TEXT;
  payload JSONB;
BEGIN
  -- قراءة project_ref من إعدادات قاعدة البيانات
  project_ref := NULLIF(current_setting('app.project_ref', true), '');
  
  -- قراءة مفتاح service_role بأمان عبر دالة مساعدة محمية
  service_role_key := public.get_push_service_key();

  -- التحقق من توافر الإعدادات؛ إذا لم تكن مهيأة يتم تخطي الإشعار بأمان تام دون تعطيل الحفظ
  IF project_ref IS NULL OR length(project_ref) < 3 OR service_role_key IS NULL OR length(service_role_key) < 10 THEN
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
    -- حماية مطلقة: في حال فشل الاتصال أو حدوث خطأ في pg_net، لا يتم إيقاف حفظ البيانات
    RAISE WARNING 'Push notification trigger failed safely: %', SQLERRM;
  END;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- 4. تنظيف أي مشغلات سابقة لضمان عدم وجود تكرار
DROP TRIGGER IF EXISTS trg_push_notify_invoices ON public.invoices;
DROP TRIGGER IF EXISTS trg_push_notify_expenses ON public.expenses;
DROP TRIGGER IF EXISTS trg_push_notify_farmer_withdrawals ON public.farmer_withdrawals;
DROP TRIGGER IF EXISTS trg_push_notify_supplier_payments ON public.supplier_payments;
DROP TRIGGER IF EXISTS trg_push_notify_advances ON public.advances;

-- 5. ربط المشغلات بالجداول الأساسية عند الإدخال (INSERT)
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

-- ==============================================================================
-- تعليمات التهيئة لمرة واحدة في محرر SQL بـ Supabase:
-- 1. تعيين معرف المشروع (Project Ref):
--    ALTER DATABASE postgres SET "app.project_ref" = 'YOUR_PROJECT_REF';
--
-- 2. تخزين مفتاح service_role في Supabase Vault (أو عبر إعدادات القاعدة):
--    SELECT vault.create_secret('YOUR_SUPABASE_SERVICE_ROLE_KEY', 'service_role_key');
--    -- أو كبديل:
--    ALTER DATABASE postgres SET "app.supabase_service_role_key" = 'YOUR_SUPABASE_SERVICE_ROLE_KEY';
-- ==============================================================================
