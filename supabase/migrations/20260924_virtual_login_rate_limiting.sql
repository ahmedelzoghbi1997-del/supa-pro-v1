-- ==============================================================================
-- Migration: Add Brute-Force Rate Limiting & Protection to virtual_login
-- Date: 2026-09-24
-- Description:
--   1. Create public.login_attempts table.
--   2. Enforce failed attempt limits (> 5 attempts in last 15 minutes) in virtual_login.
--   3. Auto-prune attempts older than 1 hour.
--   4. Clear failed attempts upon successful login.
-- ==============================================================================

-- 1. Create table for tracking failed login attempts
CREATE TABLE IF NOT EXISTS public.login_attempts (
    id BIGSERIAL PRIMARY KEY,
    username TEXT NOT NULL,
    attempted_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Index for fast lookup on (username, attempted_at)
CREATE INDEX IF NOT EXISTS idx_login_attempts_username_time 
ON public.login_attempts (username, attempted_at DESC);

-- Enable RLS for login_attempts (keeps table secure from direct client tampering)
ALTER TABLE public.login_attempts ENABLE ROW LEVEL SECURITY;

-- Note: Since virtual_login is SECURITY DEFINER, it bypasses RLS internally,
-- while clients calling the Supabase REST API cannot directly alter or read this table.

-- 2. Update virtual_login function with rate limiting
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
    v_failed_attempts INT;
    v_member RECORD;
BEGIN
    -- 1. تنظيف المحاولات القديمة (أقدم من ساعة) تلقائياً عند كل استدعاء
    DELETE FROM public.login_attempts
    WHERE attempted_at < NOW() - INTERVAL '1 hour';

    -- 2. فحص عدد المحاولات الفاشلة لنفس اسم المستخدم خلال آخر 15 دقيقة
    SELECT COUNT(*)
    INTO v_failed_attempts
    FROM public.login_attempts
    WHERE username = p_username
      AND attempted_at >= NOW() - INTERVAL '15 minutes';

    -- إذا كان عدد المحاولات الفاشلة أكبر من 5، يتم قفل الحساب مؤقتاً فوراً دون مقارنة كلمة المرور
    IF v_failed_attempts > 5 THEN
        RAISE EXCEPTION 'تم قفل الحساب مؤقتاً';
    END IF;

    -- 3. التحقق من صحة بيانات الدخول ومقارنة كلمة المرور المشفرة
    SELECT vm.id, vm.owner_id, vm.username, vm.full_name, vm.role
    INTO v_member
    FROM public.virtual_members vm
    WHERE vm.username = p_username 
      AND vm.password = crypt(p_password, vm.password)
    LIMIT 1;

    -- 4. في حالة فشل التحقق (اسم المستخدم غير موجود أو كلمة المرور غير صحيحة)
    IF v_member.id IS NULL THEN
        -- تسجيل المحاولة الفاشلة في جدول login_attempts
        INSERT INTO public.login_attempts (username, attempted_at)
        VALUES (p_username, NOW());

        -- الخروج دون إرجاع بيانات
        RETURN;
    END IF;

    -- 5. في حالة نجاح تسجيل الدخول:
    -- مسح سجل المحاولات الفاشلة السابقة لهذا المستخدم
    DELETE FROM public.login_attempts 
    WHERE username = p_username;

    -- تحديث وقت آخر ظهور (last_seen)
    UPDATE public.virtual_members 
    SET last_seen = NOW()
    WHERE id = v_member.id;

    -- إرجاع بيانات العضو المعتمد
    RETURN QUERY
    SELECT v_member.id, v_member.owner_id, v_member.username, v_member.full_name, v_member.role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- منح صلاحيات التنفيذ لـ anon و authenticated و service_role
GRANT EXECUTE ON FUNCTION public.virtual_login(TEXT, TEXT) TO anon, authenticated, service_role;
