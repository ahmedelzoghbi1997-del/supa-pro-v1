-- ==============================================================================
-- ملف هجرة تشديد الأمان والحماية (Security Hardening Migration)
-- التاريخ: 2026-09-24
-- الوصف:
--   1. تحديث سياسة التعديل على جدول profiles لحماية الأعمدة الحساسة من التعديل المباشر.
--   2. تعديل سياسة القراءة على جدول profiles لحماية البريد الإلكتروني وكود الربط.
--   3. تشديد الصلاحيات على جدول linking_attempts وإلغاء صلاحيات التعديل والحذف المباشرة.
-- ==============================================================================

-- التأكد من وجود الأعمدة اللازمة في جدول profiles لتجنب أي أخطاء
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS linking_code TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS linking_code_expires_at TIMESTAMPTZ;

-- ==============================================================================
-- (1) سياسة محدثة على جدول profiles لمنع تعديل الأعمدة الحساسة
-- تمنع المستخدم من تعديل: role, parent_id, subscription_type, subscription_ends_at, status, linking_code, linking_code_expires_at
-- ويسمح فقط بتعديل باقي الحقول مثل (full_name, app_settings, push_token, last_seen_at)
-- ==============================================================================

DROP POLICY IF EXISTS "Users can update own profile." ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update safe fields in own profile" ON public.profiles;

CREATE POLICY "Users can update safe fields in own profile"
ON public.profiles FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (
    auth.uid() = id AND
    (
        SELECT (
            p.role IS NOT DISTINCT FROM profiles.role AND
            p.parent_id IS NOT DISTINCT FROM profiles.parent_id AND
            p.subscription_type IS NOT DISTINCT FROM profiles.subscription_type AND
            p.subscription_ends_at IS NOT DISTINCT FROM profiles.subscription_ends_at AND
            p.status IS NOT DISTINCT FROM profiles.status AND
            p.linking_code IS NOT DISTINCT FROM profiles.linking_code AND
            p.linking_code_expires_at IS NOT DISTINCT FROM profiles.linking_code_expires_at
        )
        FROM public.profiles p
        WHERE p.id = profiles.id
    )
);

-- ==============================================================================
-- (2) تعديل سياسة القراءة على جدول profiles
-- حماية البيانات الخاصة بحيث يكون الملف الشخصي مرئياً لصاحب الحساب فقط بشرط auth.uid() = id
-- ==============================================================================

DROP POLICY IF EXISTS "Public profiles are viewable by everyone." ON public.profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own full profile" ON public.profiles;
DROP POLICY IF EXISTS "Public profiles general info viewable" ON public.profiles;

-- سياسة قراءة الملف الشخصي الكامل لصاحب الحساب
CREATE POLICY "Users can view own full profile"
ON public.profiles FOR SELECT
USING (auth.uid() = id);

-- ==============================================================================
-- (3) تشديد الحماية على جدول محاولات الربط (linking_attempts)
-- حذف سياسة FOR ALL السابقة، وإنشاء سياسة SELECT فقط للمستخدم الموثق،
-- وإلغاء صلاحيات INSERT, UPDATE, DELETE المباشرة من authenticated لضمان إدارتها عبر الدوال الآمنة فقط
-- ==============================================================================

DROP POLICY IF EXISTS "Users can manage own linking attempts" ON public.linking_attempts;
DROP POLICY IF EXISTS "Users can view own linking attempts" ON public.linking_attempts;

-- سياسة SELECT فقط للمستخدم لمشاهدة محاولاته الخاصة
CREATE POLICY "Users can view own linking attempts"
ON public.linking_attempts FOR SELECT
USING (auth.uid() = user_id);

-- إلغاء صلاحيات الإضافة والتعديل والحذف المباشرة من المستخدمين الموثقين وغير الموثقين
REVOKE INSERT, UPDATE, DELETE ON public.linking_attempts FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.linking_attempts FROM anon;
