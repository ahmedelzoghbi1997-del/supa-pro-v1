-- ==============================================================================
-- المحاسب الزراعي - مخطط قاعدة البيانات الشامل والآمن (Production Schema)
-- الإصدار: النهائي الموحد مع تشديد الأمان وتشفير التجزئة
-- ==============================================================================

-- 0. تفعيل الإضافات المطلوبة (Extensions)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ==============================================================================
-- 1. جدول الملفات الشخصية (Profiles)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL PRIMARY KEY,
  full_name TEXT,
  status TEXT DEFAULT 'pending',
  role TEXT DEFAULT 'user',
  parent_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  linking_code TEXT,
  linking_code_expires_at TIMESTAMPTZ,
  email TEXT,
  subscription_type TEXT,
  subscription_ends_at TIMESTAMPTZ,
  app_settings JSONB, -- حفظ إعدادات التطبيق (الأسواق، بنود الخصم، الثيم، إلخ)
  last_seen_at TIMESTAMPTZ,
  push_token TEXT,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- فهرس لتسريع البحث عن تجزئة كود الربط
CREATE INDEX IF NOT EXISTS idx_profiles_linking_code ON public.profiles (linking_code);

-- تفعيل الحماية (RLS) على جدول profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- سياسات الوصول الآمنة والمشددة لجدول profiles
DROP POLICY IF EXISTS "Public profiles are viewable by everyone." ON public.profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Public profiles general info viewable" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile." ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile." ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update safe fields in own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own full profile" ON public.profiles;
DROP POLICY IF EXISTS "Owners can view their linked members" ON public.profiles;

-- أ) إنشاء الملف الشخصي للمستخدم الجديد
CREATE POLICY "Users can insert their own profile." 
ON public.profiles FOR INSERT 
WITH CHECK (auth.uid() = id);

-- ب) قراءة الملف الشخصي الكامل لصاحب الحساب فقط
CREATE POLICY "Users can view own full profile" 
ON public.profiles FOR SELECT 
USING (auth.uid() = id);

-- ج) قراءة المالك لبيانات الأعضاء المرتبطين بحسابه
CREATE POLICY "Owners can view their linked members" 
ON public.profiles FOR SELECT 
USING (auth.uid() = parent_id);

-- د) تعديل الحقول الآمنة فقط ومنع التعديل المباشر للأعمدة الحساسة
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
-- 2. جدول فئات المصروفات (Expense Categories)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.expense_categories (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  is_supplier_category BOOLEAN DEFAULT false,
  is_labor_category BOOLEAN DEFAULT false,
  is_discount_category BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.expense_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own expense categories." ON public.expense_categories FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own expense categories." ON public.expense_categories FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own expense categories." ON public.expense_categories FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own expense categories." ON public.expense_categories FOR DELETE USING (auth.uid() = user_id);

-- ==============================================================================
-- 3. جدول الأعضاء الافتراضيين (Virtual Members) لدخول الموظفين
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.virtual_members (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    username TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'viewer' CHECK (role IN ('viewer', 'editor')),
    push_token TEXT,
    last_seen TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- دالة تشفير كلمات المرور تلقائياً قبل الحفظ
CREATE OR REPLACE FUNCTION public.hash_virtual_member_password()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.password IS NOT NULL AND NEW.password NOT LIKE '$2a$%' THEN
        IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND (OLD.password IS NULL OR NEW.password <> OLD.password)) THEN
            NEW.password := crypt(NEW.password, gen_salt('bf'));
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_hash_virtual_member_password ON public.virtual_members;
CREATE TRIGGER trigger_hash_virtual_member_password
BEFORE INSERT OR UPDATE ON public.virtual_members
FOR EACH ROW
EXECUTE FUNCTION public.hash_virtual_member_password();

ALTER TABLE public.virtual_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can manage their virtual members" ON public.virtual_members
FOR ALL USING (auth.uid() = owner_id);

-- ==============================================================================
-- 4. جدول تتبع محاولات تسجيل الدخول الفاشلة (Login Attempts) وحمايته
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.login_attempts (
    id BIGSERIAL PRIMARY KEY,
    username TEXT NOT NULL,
    attempted_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_login_attempts_username_time 
ON public.login_attempts (username, attempted_at DESC);

ALTER TABLE public.login_attempts ENABLE ROW LEVEL SECURITY;

-- حماية الجدول من أي عبث خارجي مباشر (يُدار حصراً عبر دالة virtual_login)
REVOKE ALL ON public.login_attempts FROM anon, authenticated;

-- دالة تسجيل دخول الأعضاء الافتراضيين مع منع التخمين (Rate Limiting)
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
    -- 1. تنظيف المحاولات القديمة (أقدم من ساعة)
    DELETE FROM public.login_attempts
    WHERE attempted_at < NOW() - INTERVAL '1 hour';

    -- 2. فحص عدد المحاولات الفاشلة لنفس اسم المستخدم خلال آخر 15 دقيقة
    SELECT COUNT(*)
    INTO v_failed_attempts
    FROM public.login_attempts
    WHERE username = p_username
      AND attempted_at >= NOW() - INTERVAL '15 minutes';

    -- إذا تجاوزت المحاولات 5، يتم قفل الحساب مؤقتاً
    IF v_failed_attempts > 5 THEN
        RAISE EXCEPTION 'تم قفل الحساب مؤقتاً لكثرة المحاولات الخاطئة. يرجى المحاولة بعد 15 دقيقة.';
    END IF;

    -- 3. التحقق من صحة بيانات الدخول ومقارنة كلمة المرور المشفرة
    SELECT vm.id, vm.owner_id, vm.username, vm.full_name, vm.role
    INTO v_member
    FROM public.virtual_members vm
    WHERE vm.username = p_username 
      AND vm.password = crypt(p_password, vm.password)
    LIMIT 1;

    -- 4. في حالة فشل التحقق: تسجيل المحاولة الفاشلة
    IF v_member.id IS NULL THEN
        INSERT INTO public.login_attempts (username, attempted_at)
        VALUES (p_username, NOW());
        RETURN;
    END IF;

    -- 5. في حالة نجاح تسجيل الدخول: مسح المحاولات الفاشلة وتحديث وقت الظهور
    DELETE FROM public.login_attempts 
    WHERE username = p_username;

    UPDATE public.virtual_members 
    SET last_seen = NOW()
    WHERE id = v_member.id;

    RETURN QUERY
    SELECT v_member.id, v_member.owner_id, v_member.username, v_member.full_name, v_member.role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.virtual_login(TEXT, TEXT) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.update_virtual_member_last_seen(member_id UUID)
RETURNS VOID AS $$
DECLARE
    v_owner_id UUID;
BEGIN
    -- 1. التحقق من وجود مستخدم موثق
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'غير مصرح';
    END IF;

    -- 2. جلب معرّف مالك العضو الافتراضي
    SELECT owner_id INTO v_owner_id
    FROM public.virtual_members
    WHERE id = member_id;

    -- 3. التحقق من مطابقة auth.uid() لمالك العضو (owner_id)
    IF v_owner_id IS NULL OR auth.uid() <> v_owner_id THEN
        RAISE EXCEPTION 'غير مصرح';
    END IF;

    -- 4. تنفيذ التحديث
    UPDATE public.virtual_members
    SET last_seen = NOW()
    WHERE id = member_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

REVOKE ALL ON FUNCTION public.update_virtual_member_last_seen(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_virtual_member_last_seen(UUID) TO authenticated, service_role;

-- ==============================================================================
-- 5. جدول السجل اليومي (Daily Logs)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.daily_logs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    cycle_id UUID NOT NULL,
    date DATE NOT NULL,
    tasks JSONB NOT NULL DEFAULT '[]'::jsonb,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

ALTER TABLE public.daily_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own daily logs." ON public.daily_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own daily logs." ON public.daily_logs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own daily logs." ON public.daily_logs FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own daily logs." ON public.daily_logs FOR DELETE USING (auth.uid() = user_id);

-- ==============================================================================
-- 6. جدول تتبع محاولات إدخال كود الربط الفاشلة (Linking Attempts)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.linking_attempts (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL,
    attempted_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_linking_attempts_user_time 
ON public.linking_attempts (user_id, attempted_at DESC);

ALTER TABLE public.linking_attempts ENABLE ROW LEVEL SECURITY;

-- سياسة SELECT فقط للمستخدم لمشاهدة محاولاته
DROP POLICY IF EXISTS "Users can manage own linking attempts" ON public.linking_attempts;
DROP POLICY IF EXISTS "Users can view own linking attempts" ON public.linking_attempts;

CREATE POLICY "Users can view own linking attempts" 
ON public.linking_attempts FOR SELECT 
USING (auth.uid() = user_id);

-- إلغاء صلاحيات الإضافة والتعديل والحذف المباشرة لحماية الجدول
REVOKE INSERT, UPDATE, DELETE ON public.linking_attempts FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.linking_attempts FROM anon;

-- ==============================================================================
-- 7. دوال توليد كود الربط المشفر والربط الآمن بالحساب
-- ==============================================================================

-- أ) دالة توليد كود عشوائي قوي بطول محدد
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
    actual_length := GREATEST(10, COALESCE(p_length, 12));
    bytes := gen_random_bytes(actual_length);
    FOR i IN 0..(actual_length - 1) LOOP
        rand_byte := get_byte(bytes, i);
        result := result || substr(chars, (rand_byte % length(chars)) + 1, 1);
    END LOOP;
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- ب) دالة توليد كود الربط للمالك مع تخزين تجزئة SHA-256 وإرجاع الكود الصريح لمرة واحدة
CREATE OR REPLACE FUNCTION public.generate_owner_linking_code()
RETURNS TABLE (
    linking_code TEXT,
    linking_code_expires_at TIMESTAMPTZ
) AS $$
DECLARE
    v_user_id UUID;
    v_code TEXT;
    v_code_hash TEXT;
    v_expires TIMESTAMPTZ;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'يجب تسجيل الدخول أولاً';
    END IF;

    -- توليد كود عشوائي بطول 12 خانة
    v_code := public.generate_secure_linking_code(12);
    -- حساب تجزئة SHA-256
    v_code_hash := encode(digest(upper(v_code), 'sha256'), 'hex');
    -- الصلاحية 24 ساعة فقط
    v_expires := NOW() + INTERVAL '24 hours';

    -- تخزين التجزئة فقط في قاعدة البيانات
    UPDATE public.profiles
    SET linking_code = v_code_hash,
        linking_code_expires_at = v_expires
    WHERE id = v_user_id;

    -- إرجاع الكود الصريح مرة واحدة في الاستجابة
    RETURN QUERY SELECT v_code, v_expires;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.generate_owner_linking_code() TO authenticated;
REVOKE EXECUTE ON FUNCTION public.generate_owner_linking_code() FROM anon;

-- ج) دالة ربط الحساب الآمنة بمطابقة التجزئة SHA-256 والتحقق من الصلاحية والمحاولات
CREATE OR REPLACE FUNCTION public.link_account_to_owner(p_code TEXT)
RETURNS JSONB AS $$
DECLARE
    v_user_id UUID;
    v_failed_attempts INT;
    v_owner RECORD;
    v_clean_code TEXT;
    v_hash TEXT;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'يجب تسجيل الدخول أولاً';
    END IF;

    v_clean_code := UPPER(TRIM(COALESCE(p_code, '')));
    IF length(v_clean_code) < 6 THEN
        RAISE EXCEPTION 'يرجى إدخال كود ربط صحيح';
    END IF;

    -- حساب تجزئة الكود المدخل لمقارنته بالتجزئة المخزنة
    v_hash := encode(digest(v_clean_code, 'sha256'), 'hex');

    -- تنظيف المحاولات القديمة
    DELETE FROM public.linking_attempts
    WHERE attempted_at < NOW() - INTERVAL '1 hour';

    -- فحص عدد المحاولات الفاشلة
    SELECT COUNT(*)
    INTO v_failed_attempts
    FROM public.linking_attempts
    WHERE user_id = v_user_id
      AND attempted_at >= NOW() - INTERVAL '15 minutes';

    -- قفل مؤقت إذا تجاوزت 5 محاولات
    IF v_failed_attempts >= 5 THEN
        RAISE EXCEPTION 'تم قفل محاولات الربط مؤقتاً لكثرة المحاولات الخاطئة. يرجى المحاولة بعد 15 دقيقة.';
    END IF;

    -- البحث بمطابقة تجزئة الكود
    SELECT id, full_name, linking_code_expires_at
    INTO v_owner
    FROM public.profiles
    WHERE linking_code = v_hash
    LIMIT 1;

    -- كود خاطئ
    IF v_owner.id IS NULL THEN
        INSERT INTO public.linking_attempts (user_id, attempted_at)
        VALUES (v_user_id, NOW());
        RAISE EXCEPTION 'كود غير صحيح. تأكد من الكود من صاحب الحساب.';
    END IF;

    -- منع ربط الحساب بنفسه
    IF v_owner.id = v_user_id THEN
        RAISE EXCEPTION 'لا يمكنك ربط حسابك بنفسك.';
    END IF;

    -- فحص انتهاء الصلاحية
    IF v_owner.linking_code_expires_at IS NULL OR v_owner.linking_code_expires_at < NOW() THEN
        INSERT INTO public.linking_attempts (user_id, attempted_at)
        VALUES (v_user_id, NOW());
        RAISE EXCEPTION 'هذا الكود منتهي الصلاحية (صلاحية الكود 24 ساعة فقط من توليده). اطلب كوداً جديداً من صاحب الحساب.';
    END IF;

    -- مسح سجل المحاولات الفاشلة عند النجاح
    DELETE FROM public.linking_attempts
    WHERE user_id = v_user_id;

    -- ربط الحساب
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
REVOKE EXECUTE ON FUNCTION public.link_account_to_owner(TEXT) FROM anon;

-- ==============================================================================
-- 8. دالة التحديث الذري لبنود الفاتورة والخصومات (upsert_invoice_items)
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.upsert_invoice_items(
    p_invoice_id UUID,
    p_price_items JSONB,
    p_deductions JSONB,
    p_user_id UUID DEFAULT NULL
)
RETURNS VOID AS $$
DECLARE
    v_actual_user_id UUID;
    v_invoice_owner_id UUID;
BEGIN
    -- 1. تحديد معرف المستخدم الفعلي
    v_actual_user_id := COALESCE(auth.uid(), p_user_id);
    
    IF v_actual_user_id IS NULL THEN
        RAISE EXCEPTION 'غير مصرح: يجب توفر معرف مستخدم صالح';
    END IF;

    -- 2. التحقق من وجود الفاتورة ومطابقة المالك
    SELECT user_id INTO v_invoice_owner_id
    FROM public.invoices
    WHERE id = p_invoice_id;

    IF v_invoice_owner_id IS NULL THEN
        RAISE EXCEPTION 'الفاتورة غير موجودة أو تم حذفها';
    END IF;

    IF auth.uid() IS NOT NULL AND v_invoice_owner_id <> auth.uid() THEN
        RAISE EXCEPTION 'غير مصرح: لا تملك صلاحية تعديل بنود هذه الفاتورة';
    END IF;

    -- 3. حذف البنود والخصومات القديمة للفاتورة في نفس المعاملة
    DELETE FROM public.invoice_price_items WHERE invoice_id = p_invoice_id;
    DELETE FROM public.invoice_deductions WHERE invoice_id = p_invoice_id;

    -- 4. إدراج بنود الأسعار الجديدة إذا وُجدت
    IF p_price_items IS NOT NULL AND jsonb_typeof(p_price_items) = 'array' AND jsonb_array_length(p_price_items) > 0 THEN
        INSERT INTO public.invoice_price_items (invoice_id, user_id, quantity, price_per_kg, packaging_count)
        SELECT 
            p_invoice_id,
            COALESCE((item->>'user_id')::UUID, v_invoice_owner_id),
            COALESCE((item->>'quantity')::NUMERIC, 0),
            COALESCE((item->>'price_per_kg')::NUMERIC, 0),
            (item->>'packaging_count')::INTEGER
        FROM jsonb_array_elements(p_price_items) AS item;
    END IF;

    -- 5. إدراج الخصومات الجديدة إذا وُجدت
    IF p_deductions IS NOT NULL AND jsonb_typeof(p_deductions) = 'array' AND jsonb_array_length(p_deductions) > 0 THEN
        INSERT INTO public.invoice_deductions (invoice_id, user_id, name, amount)
        SELECT 
            p_invoice_id,
            COALESCE((item->>'user_id')::UUID, v_invoice_owner_id),
            COALESCE(item->>'name', ''),
            COALESCE((item->>'amount')::NUMERIC, 0)
        FROM jsonb_array_elements(p_deductions) AS item;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

REVOKE ALL ON FUNCTION public.upsert_invoice_items(UUID, JSONB, JSONB, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.upsert_invoice_items(UUID, JSONB, JSONB, UUID) TO authenticated, service_role;

