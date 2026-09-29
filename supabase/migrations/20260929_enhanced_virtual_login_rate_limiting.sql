-- ==============================================================================
-- Migration: Enhanced Virtual Login Rate Limiting (Username + IP Brute Force Protection)
-- Date: 2026-09-29
-- Description:
--   1. Ensures public.login_attempts exists with username, ip_address, and timestamp.
--   2. Adds compound indexes on (username, attempted_at) and (ip_address, attempted_at).
--   3. Upgrades virtual_login RPC to enforce strict progressive rate limiting on both
--      the username (max 5 failed attempts / 15 mins) and the client IP (max 15 attempts / 15 mins).
--   4. Cleans up old attempt logs and prevents direct REST tampering via RLS.
-- ==============================================================================

-- 1. Create or alter public.login_attempts table
CREATE TABLE IF NOT EXISTS public.login_attempts (
    id BIGSERIAL PRIMARY KEY,
    username TEXT NOT NULL,
    ip_address TEXT,
    attempted_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Ensure ip_address column exists if table was previously created
ALTER TABLE public.login_attempts ADD COLUMN IF NOT EXISTS ip_address TEXT;

-- 2. Indexes for fast lookup
CREATE INDEX IF NOT EXISTS idx_login_attempts_username_time 
ON public.login_attempts (username, attempted_at DESC);

CREATE INDEX IF NOT EXISTS idx_login_attempts_ip_time 
ON public.login_attempts (ip_address, attempted_at DESC);

-- 3. Enable RLS for security
ALTER TABLE public.login_attempts ENABLE ROW LEVEL SECURITY;

-- 4. Upgraded virtual_login RPC
DROP FUNCTION IF EXISTS public.virtual_login(TEXT, TEXT);

CREATE OR REPLACE FUNCTION public.virtual_login(p_username TEXT, p_password TEXT)
RETURNS TABLE (
    id UUID,
    owner_id UUID,
    username TEXT,
    full_name TEXT,
    role TEXT
) AS $$
DECLARE
    v_user_failures INT := 0;
    v_ip_failures INT := 0;
    v_client_ip TEXT := 'unknown';
    v_member RECORD;
BEGIN
    -- 1. استخراج عنوان IP الخاص بالعميل عبر ترويسات PostgREST أو inet_client_addr()
    BEGIN
        v_client_ip := coalesce(
            current_setting('request.headers', true)::json->>'x-forwarded-for',
            inet_client_addr()::TEXT,
            'unknown'
        );
        IF v_client_ip LIKE '%,%' THEN
            v_client_ip := split_part(v_client_ip, ',', 1);
        END IF;
        v_client_ip := trim(v_client_ip);
    EXCEPTION WHEN OTHERS THEN
        v_client_ip := 'unknown';
    END;

    -- 2. تنظيف المحاولات القديمة (أقدم من ساعة) تلقائياً
    DELETE FROM public.login_attempts
    WHERE attempted_at < NOW() - INTERVAL '1 hour';

    -- 3. فحص عدد المحاولات الفاشلة لاسم المستخدم خلال آخر 15 دقيقة
    SELECT COUNT(*)
    INTO v_user_failures
    FROM public.login_attempts
    WHERE username = p_username
      AND attempted_at >= NOW() - INTERVAL '15 minutes';

    -- 4. فحص عدد المحاولات الفاشلة من نفس الـ IP خلال آخر 15 دقيقة (إن كان معرّفاً)
    IF v_client_ip IS NOT NULL AND v_client_ip <> 'unknown' AND v_client_ip <> '' THEN
        SELECT COUNT(*)
        INTO v_ip_failures
        FROM public.login_attempts
        WHERE ip_address = v_client_ip
          AND attempted_at >= NOW() - INTERVAL '15 minutes';
    END IF;

    -- إذا تجاوز عدد المحاولات الفاشلة الحد المسموح (5 للمستخدم أو 15 للـ IP)، يتم قفل الحساب فوراً
    IF v_user_failures >= 5 OR v_ip_failures >= 15 THEN
        RAISE EXCEPTION 'تم قفل الحساب مؤقتاً لكثرة المحاولات الخاطئة. يرجى المحاولة بعد 15 دقيقة.';
    END IF;

    -- 5. التحقق من صحة بيانات الدخول ومقارنة كلمة المرور المشفرة
    SELECT vm.id, vm.owner_id, vm.username, vm.full_name, vm.role
    INTO v_member
    FROM public.virtual_members vm
    WHERE vm.username = p_username 
      AND vm.password = crypt(p_password, vm.password)
    LIMIT 1;

    -- 6. في حالة فشل التحقق (اسم مستخدم غير صحيح أو كلمة مرور خاطئة)
    IF v_member.id IS NULL THEN
        INSERT INTO public.login_attempts (username, ip_address, attempted_at)
        VALUES (p_username, v_client_ip, NOW());
        RETURN;
    END IF;

    -- 7. في حالة نجاح تسجيل الدخول:
    -- تصفير عداد المحاولات الفاشلة لهذا المستخدم
    DELETE FROM public.login_attempts 
    WHERE username = p_username;

    -- تحديث وقت آخر ظهور (last_seen)
    UPDATE public.virtual_members 
    SET last_seen = NOW()
    WHERE id = v_member.id;

    -- إرجاع بيانات العضو
    RETURN QUERY
    SELECT v_member.id, v_member.owner_id, v_member.username, v_member.full_name, v_member.role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- منح الصلاحيات
GRANT EXECUTE ON FUNCTION public.virtual_login(TEXT, TEXT) TO anon, authenticated, service_role;
