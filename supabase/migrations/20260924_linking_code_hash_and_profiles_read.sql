-- ==============================================================================
-- ملف هجرة أمان تجزئة كود الربط وسياسات قراءة الملفات الشخصية
-- (Secure Linking Code Hashing & Strict Profiles Read Policies)
-- التاريخ: 2026-09-24
-- الوصف:
--   1. تعديل دالة generate_owner_linking_code لتخزين تجزئة SHA-256 لكود الربط بدلاً من النص الصريح.
--   2. تعديل دالة link_account_to_owner لمطابقة تجزئة الكود المدخل مع الحفاظ على فحص المحاولات والانتهاء.
--   3. إبطال كافة الأكواد السابقة المخزنة كنص صريح.
--   4. حذف سياسة القراءة العامة المفتوحة على جدول profiles.
--   5. إنشاء سياستي قراءة فقط: قراءة المستخدم لملفه الخاص، وقراءة المالك لبيانات الأعضاء المرتبطين به.
--   6. توثيق صلاحيات SECURITY DEFINER ومنحها للمستخدمين الموثقين فقط.
-- ==============================================================================

-- تفعيل إضافة التشفير pgcrypto لدعم دالة digest
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ==============================================================================
-- (1) تعديل دالة generate_owner_linking_code بحيث تخزن التجزئة وترجع الكود الصريح لمرة واحدة فقط
-- ==============================================================================
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

    -- توليد كود عشوائي آمن بطول 12 خانة
    v_code := public.generate_secure_linking_code(12);
    
    -- حساب تجزئة SHA-256 للكود بالأحرف الكبيرة
    v_code_hash := encode(digest(upper(v_code), 'sha256'), 'hex');
    
    -- تحديد مدة الصلاحية بـ 24 ساعة من تاريخ التوليد
    v_expires := NOW() + INTERVAL '24 hours';

    -- تخزين قيمة التجزئة فقط في عمود linking_code لمنع تسريب الكود من قاعدة البيانات
    UPDATE public.profiles
    SET linking_code = v_code_hash,
        linking_code_expires_at = v_expires
    WHERE id = v_user_id;

    -- إرجاع الكود الصريح للمستخدم لمرة واحدة فقط لعرضه على شاشة المالك
    RETURN QUERY SELECT v_code, v_expires;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- التأكد من منح الصلاحيات للمستخدمين الموثقين فقط
GRANT EXECUTE ON FUNCTION public.generate_owner_linking_code() TO authenticated;
REVOKE EXECUTE ON FUNCTION public.generate_owner_linking_code() FROM anon;

-- ==============================================================================
-- (2) تعديل دالة link_account_to_owner بحيث تطابق تجزئة الكود المدخل مع التجزئة المخزنة
-- ==============================================================================
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

    -- تحويل الكود المدخل إلى تجزئة SHA-256 للمطابقة
    v_hash := encode(digest(v_clean_code, 'sha256'), 'hex');

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

    -- ج) البحث عن المالك بمطابقة تجزئة الكود (linking_code = v_hash)
    SELECT id, full_name, linking_code_expires_at
    INTO v_owner
    FROM public.profiles
    WHERE linking_code = v_hash
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

    -- و) التحقق من صلاحية الكود (24 ساعة فقط من وقت التوليد)
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

-- منح الصلاحيات للمستخدمين الموثقين فقط
GRANT EXECUTE ON FUNCTION public.link_account_to_owner(TEXT) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.link_account_to_owner(TEXT) FROM anon;

-- ==============================================================================
-- (3) إبطال أي أكواد قديمة مخزنة كنص صريح في قاعدة البيانات
-- ==============================================================================
UPDATE public.profiles
SET linking_code = NULL,
    linking_code_expires_at = NULL;

-- ==============================================================================
-- (4) حذف سياسة القراءة العامة المفتوحة على جدول profiles
-- ==============================================================================
DROP POLICY IF EXISTS "Public profiles general info viewable" ON public.profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone." ON public.profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;

-- ==============================================================================
-- (5) إنشاء سياستين للقراءة فقط (SELECT) على جدول profiles
-- ==============================================================================

-- السياسة الأولى: المستخدم يستطيع قراءة ملفه الشخصي فقط
DROP POLICY IF EXISTS "Users can view own full profile" ON public.profiles;
CREATE POLICY "Users can view own full profile"
ON public.profiles FOR SELECT
USING (auth.uid() = id);

-- السياسة الثانية: المالك يستطيع قراءة بيانات الأعضاء المرتبطين بحسابه فقط
DROP POLICY IF EXISTS "Owners can view their linked members" ON public.profiles;
CREATE POLICY "Owners can view their linked members"
ON public.profiles FOR SELECT
USING (auth.uid() = parent_id);
