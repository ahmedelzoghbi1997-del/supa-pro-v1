-- ==============================================================================
-- Migration: Add Secure Linking Code (24h Expiry) & Rate Limiting for Account Linking
-- Date: 2026-09-24
-- Description:
--   1. Add linking_code_expires_at to public.profiles.
--   2. Create linking_attempts table to track failed linking attempts.
--   3. Create RPC link_account_to_owner with 5-attempt rate-limiting (15-min lockout).
--   4. Create crypto-secure linking code generator function (min 10 chars).
-- ==============================================================================

-- 1. إضافة عمود انتهاء صلاحية كود الربط في جدول profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS linking_code_expires_at TIMESTAMPTZ;

-- فهرس لتسريع البحث عن كود الربط
CREATE INDEX IF NOT EXISTS idx_profiles_linking_code 
ON public.profiles (linking_code);

-- 2. جدول تسجيل محاولات إدخال كود الربط الفاشلة (منع التخمين العشوائي Brute-force)
CREATE TABLE IF NOT EXISTS public.linking_attempts (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL,
    attempted_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- فهرس سريع للبحث حسب المستخدم والوقت
CREATE INDEX IF NOT EXISTS idx_linking_attempts_user_time 
ON public.linking_attempts (user_id, attempted_at DESC);

-- تفعيل RLS على جدول المحاولات
ALTER TABLE public.linking_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own linking attempts" 
ON public.linking_attempts FOR ALL 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 3. دالة توليد كود ربط عشوائي آمن مشفراً (Crypto-Secure) بطول 12 خانة على الأقل
CREATE OR REPLACE FUNCTION public.generate_secure_linking_code(p_length INT DEFAULT 12)
RETURNS TEXT AS $$
DECLARE
    chars CONSTANT TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    result TEXT := '';
    i INT;
    rand_byte INT;
    bytes BYTEA;
    actual_length INT;
BEGIN
    -- التأكد من أن الطول لا يقل عن 10 خانات
    actual_length := GREATEST(10, COALESCE(p_length, 12));
    bytes := gen_random_bytes(actual_length);
    FOR i IN 0..(actual_length - 1) LOOP
        rand_byte := get_byte(bytes, i);
        result := result || substr(chars, (rand_byte % length(chars)) + 1, 1);
    END LOOP;
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- 4. دالة للمالك لتوليد كود ربط جديد صالح لمدة 24 ساعة فقط
CREATE OR REPLACE FUNCTION public.generate_owner_linking_code()
RETURNS TABLE (
    linking_code TEXT,
    linking_code_expires_at TIMESTAMPTZ
) AS $$
DECLARE
    v_user_id UUID;
    v_code TEXT;
    v_expires TIMESTAMPTZ;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'يجب تسجيل الدخول أولاً';
    END IF;

    v_code := public.generate_secure_linking_code(12);
    v_expires := NOW() + INTERVAL '24 hours';

    UPDATE public.profiles
    SET linking_code = v_code,
        linking_code_expires_at = v_expires
    WHERE id = v_user_id;

    RETURN QUERY SELECT v_code, v_expires;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.generate_owner_linking_code() TO authenticated;

-- 5. دالة ربط الحساب الآمنة مع فحص انتهاء الصلاحية وتطبيق حد المحاولات (Rate Limiter)
CREATE OR REPLACE FUNCTION public.link_account_to_owner(p_code TEXT)
RETURNS JSONB AS $$
DECLARE
    v_user_id UUID;
    v_failed_attempts INT;
    v_owner RECORD;
    v_clean_code TEXT;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'يجب تسجيل الدخول أولاً';
    END IF;

    v_clean_code := UPPER(TRIM(COALESCE(p_code, '')));
    IF length(v_clean_code) < 6 THEN
        RAISE EXCEPTION 'يرجى إدخال كود ربط صحيح';
    END IF;

    -- أ) تنظيف المحاولات القديمة (أقدم من ساعة)
    DELETE FROM public.linking_attempts
    WHERE attempted_at < NOW() - INTERVAL '1 hour';

    -- ب) فحص عدد المحاولات الفاشلة لهذا المستخدم خلال آخر 15 دقيقة
    SELECT COUNT(*)
    INTO v_failed_attempts
    FROM public.linking_attempts
    WHERE user_id = v_user_id
      AND attempted_at >= NOW() - INTERVAL '15 minutes';

    -- إذا تجاوزت المحاولات الفاشلة 5، قفل العملية مؤقتاً
    IF v_failed_attempts >= 5 THEN
        RAISE EXCEPTION 'تم قفل محاولات الربط مؤقتاً لكثرة المحاولات الخاطئة. يرجى المحاولة بعد 15 دقيقة.';
    END IF;

    -- ج) البحث عن المالك صاحب الكود
    SELECT id, full_name, linking_code_expires_at
    INTO v_owner
    FROM public.profiles
    WHERE UPPER(linking_code) = v_clean_code
    LIMIT 1;

    -- د) إذا لم يتم العثور على الكود: تسجيل محاولة فاشلة ورمي خطأ
    IF v_owner.id IS NULL THEN
        INSERT INTO public.linking_attempts (user_id, attempted_at)
        VALUES (v_user_id, NOW());
        RAISE EXCEPTION 'كود غير صحيح. تأكد من الكود من صاحب الحساب.';
    END IF;

    -- هـ) منع المستخدم من ربط حسابه بنفسه
    IF v_owner.id = v_user_id THEN
        RAISE EXCEPTION 'لا يمكنك ربط حسابك بنفسك.';
    END IF;

    -- و) التحقق من صلاحية الكود (24 ساعة فقط)
    IF v_owner.linking_code_expires_at IS NULL OR v_owner.linking_code_expires_at < NOW() THEN
        INSERT INTO public.linking_attempts (user_id, attempted_at)
        VALUES (v_user_id, NOW());
        RAISE EXCEPTION 'هذا الكود منتهي الصلاحية (صلاحية الكود 24 ساعة فقط من توليده). اطلب كوداً جديداً من صاحب الحساب.';
    END IF;

    -- ز) نجاح التحقق: مسح سجل المحاولات الفاشلة السابقة
    DELETE FROM public.linking_attempts
    WHERE user_id = v_user_id;

    -- ح) ربط الحساب بصلاحية مشاهد (viewer)
    UPDATE public.profiles
    SET parent_id = v_owner.id,
        role = 'viewer',
        status = 'active'
    WHERE id = v_user_id;

    RETURN jsonb_build_object(
        'success', true,
        'owner_id', v_owner.id,
        'owner_name', v_owner.full_name
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.link_account_to_owner(TEXT) TO authenticated;
