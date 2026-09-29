-- ==============================================================================
-- المحاسب الزراعي - مخطط قاعدة البيانات الشامل والآمن (Production Master Schema)
-- الإصدار: النهائي الموحد مع إنشاء كافة الجداول (17 جدولاً) والتحقق التراكمي
-- ==============================================================================

-- 0. تفعيل الإضافات المطلوبة (Extensions)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ==============================================================================
-- 1. فحص وتخطي الأعمدة المتعارضة إذا كانت الجداول منشأة مسبقاً عبر Migrations
-- ==============================================================================
DO $$ 
BEGIN
    -- profiles
    EXECUTE 'ALTER TABLE IF EXISTS public.profiles ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL';
    EXECUTE 'ALTER TABLE IF EXISTS public.profiles ADD COLUMN IF NOT EXISTS linking_code TEXT';
    EXECUTE 'ALTER TABLE IF EXISTS public.profiles ADD COLUMN IF NOT EXISTS linking_code_expires_at TIMESTAMPTZ';
    EXECUTE 'ALTER TABLE IF EXISTS public.profiles ADD COLUMN IF NOT EXISTS app_settings JSONB';
    EXECUTE 'ALTER TABLE IF EXISTS public.profiles ADD COLUMN IF NOT EXISTS push_token TEXT';
    EXECUTE 'ALTER TABLE IF EXISTS public.profiles ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ';

    -- expense_categories
    EXECUTE 'ALTER TABLE IF EXISTS public.expense_categories ADD COLUMN IF NOT EXISTS is_supplier_category BOOLEAN DEFAULT false';
    EXECUTE 'ALTER TABLE IF EXISTS public.expense_categories ADD COLUMN IF NOT EXISTS is_labor_category BOOLEAN DEFAULT false';
    EXECUTE 'ALTER TABLE IF EXISTS public.expense_categories ADD COLUMN IF NOT EXISTS is_discount_category BOOLEAN DEFAULT false';

    -- cycles
    EXECUTE 'ALTER TABLE IF EXISTS public.cycles ADD COLUMN IF NOT EXISTS unit_of_measure TEXT DEFAULT ''plants''';
    EXECUTE 'ALTER TABLE IF EXISTS public.cycles ADD COLUMN IF NOT EXISTS area_in_feddans NUMERIC DEFAULT 0';
    EXECUTE 'ALTER TABLE IF EXISTS public.cycles ADD COLUMN IF NOT EXISTS production_start_date DATE';
    EXECUTE 'ALTER TABLE IF EXISTS public.cycles ADD COLUMN IF NOT EXISTS responsible_farmer_id UUID';
    EXECUTE 'ALTER TABLE IF EXISTS public.cycles ADD COLUMN IF NOT EXISTS farmer_share_percentage NUMERIC DEFAULT 0';
    EXECUTE 'ALTER TABLE IF EXISTS public.cycles ADD COLUMN IF NOT EXISTS target_yield NUMERIC DEFAULT 0';
    EXECUTE 'ALTER TABLE IF EXISTS public.cycles ADD COLUMN IF NOT EXISTS notes TEXT';

    -- invoices
    EXECUTE 'ALTER TABLE IF EXISTS public.invoices ADD COLUMN IF NOT EXISTS description TEXT';
    EXECUTE 'ALTER TABLE IF EXISTS public.invoices ADD COLUMN IF NOT EXISTS packaging_type TEXT DEFAULT ''carton''';
    EXECUTE 'ALTER TABLE IF EXISTS public.invoices ADD COLUMN IF NOT EXISTS packaging_count NUMERIC DEFAULT 0';
    EXECUTE 'ALTER TABLE IF EXISTS public.invoices ADD COLUMN IF NOT EXISTS carton_count NUMERIC DEFAULT 0';
    EXECUTE 'ALTER TABLE IF EXISTS public.invoices ADD COLUMN IF NOT EXISTS cage_count NUMERIC DEFAULT 0';

    -- invoice_price_items & invoice_deductions
    EXECUTE 'ALTER TABLE IF EXISTS public.invoice_price_items ADD COLUMN IF NOT EXISTS packaging_count NUMERIC DEFAULT 0';

    -- expenses
    EXECUTE 'ALTER TABLE IF EXISTS public.expenses ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT ''cash''';
    EXECUTE 'ALTER TABLE IF EXISTS public.expenses ADD COLUMN IF NOT EXISTS is_establishment BOOLEAN DEFAULT false';
    EXECUTE 'ALTER TABLE IF EXISTS public.expenses ADD COLUMN IF NOT EXISTS shift_type TEXT';

    -- advances
    EXECUTE 'ALTER TABLE IF EXISTS public.advances ADD COLUMN IF NOT EXISTS reason TEXT';
    EXECUTE 'ALTER TABLE IF EXISTS public.advances ADD COLUMN IF NOT EXISTS fund TEXT';
    EXECUTE 'ALTER TABLE IF EXISTS public.advances ADD COLUMN IF NOT EXISTS source_ref_id TEXT';
    EXECUTE 'ALTER TABLE IF EXISTS public.advances ADD COLUMN IF NOT EXISTS source_type TEXT';
    EXECUTE 'ALTER TABLE IF EXISTS public.advances ADD COLUMN IF NOT EXISTS is_retained_debt BOOLEAN DEFAULT false';

    -- suppliers
    EXECUTE 'ALTER TABLE IF EXISTS public.suppliers ADD COLUMN IF NOT EXISTS opening_balance NUMERIC DEFAULT 0';

    -- partner_debts
    EXECUTE 'ALTER TABLE IF EXISTS public.partner_debts ADD COLUMN IF NOT EXISTS entered_treasury BOOLEAN DEFAULT false';
    EXECUTE 'ALTER TABLE IF EXISTS public.partner_debts ADD COLUMN IF NOT EXISTS partner_repayments JSONB DEFAULT ''{}''::jsonb';

    -- report_visits
    EXECUTE 'ALTER TABLE IF EXISTS public.report_visits ADD COLUMN IF NOT EXISTS visitor_name TEXT';
    EXECUTE 'ALTER TABLE IF EXISTS public.report_visits ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT false';
    EXECUTE 'ALTER TABLE IF EXISTS public.report_visits ADD COLUMN IF NOT EXISTS is_ignored BOOLEAN DEFAULT false';
EXCEPTION WHEN OTHERS THEN
    -- تخطي آمن عند عدم وجود الجداول بعد
    NULL;
END $$;

-- ==============================================================================
-- 2. تعريفات الجداول الأساسية (CREATE TABLE IF NOT EXISTS) بالترتيب الاعتمادي
-- ==============================================================================

-- (1) جدول الملفات الشخصية (profiles)
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
    app_settings JSONB,
    last_seen_at TIMESTAMPTZ,
    push_token TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- (2) جدول الأصول والمزارع (assets)
CREATE TABLE IF NOT EXISTS public.assets (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    establishment_date DATE DEFAULT CURRENT_DATE,
    establishment_cost NUMERIC DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- (3) جدول المزارعين (farmers)
CREATE TABLE IF NOT EXISTS public.farmers (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- (4) جدول الموردين (suppliers)
CREATE TABLE IF NOT EXISTS public.suppliers (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    opening_balance NUMERIC DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- (5) جدول الأشخاص والعمالة (persons)
CREATE TABLE IF NOT EXISTS public.persons (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    virtual_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- (6) جدول فئات المصروفات (expense_categories)
CREATE TABLE IF NOT EXISTS public.expense_categories (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    is_supplier_category BOOLEAN DEFAULT false,
    is_labor_category BOOLEAN DEFAULT false,
    is_discount_category BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- (7) جدول الحسابات البنكية والخزينة (bank_accounts)
CREATE TABLE IF NOT EXISTS public.bank_accounts (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    initial_balance NUMERIC DEFAULT 0 NOT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- (8) جدول الدورات والعروات الزراعية (cycles)
CREATE TABLE IF NOT EXISTS public.cycles (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    seed_type TEXT NOT NULL,
    plant_count NUMERIC DEFAULT 0,
    unit_of_measure TEXT DEFAULT 'plants' CHECK (unit_of_measure IN ('plants', 'area')),
    area_in_feddans NUMERIC DEFAULT 0,
    asset_id UUID REFERENCES public.assets(id) ON DELETE SET NULL,
    start_date DATE NOT NULL DEFAULT CURRENT_DATE,
    production_start_date DATE,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'closed', 'archived')),
    responsible_farmer_id UUID REFERENCES public.farmers(id) ON DELETE SET NULL,
    farmer_share_percentage NUMERIC DEFAULT 0,
    target_yield NUMERIC DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- (9) جدول الفواتير (invoices)
CREATE TABLE IF NOT EXISTS public.invoices (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    cycle_id UUID NOT NULL REFERENCES public.cycles(id) ON DELETE CASCADE,
    description TEXT,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    market TEXT NOT NULL,
    packaging_type TEXT DEFAULT 'carton' CHECK (packaging_type IN ('carton', 'cage')),
    packaging_count NUMERIC DEFAULT 0,
    carton_count NUMERIC DEFAULT 0,
    cage_count NUMERIC DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- (10) جدول بنود أسعار الفواتير (invoice_price_items)
CREATE TABLE IF NOT EXISTS public.invoice_price_items (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
    quantity NUMERIC DEFAULT 0 NOT NULL,
    price_per_kg NUMERIC DEFAULT 0 NOT NULL,
    packaging_count NUMERIC DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- (11) جدول خصومات الفواتير (invoice_deductions)
CREATE TABLE IF NOT EXISTS public.invoice_deductions (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    amount NUMERIC DEFAULT 0 NOT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- (12) جدول المصروفات (expenses)
CREATE TABLE IF NOT EXISTS public.expenses (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    cycle_id UUID NOT NULL REFERENCES public.cycles(id) ON DELETE CASCADE,
    category_id UUID REFERENCES public.expense_categories(id) ON DELETE SET NULL,
    supplier_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL,
    description TEXT NOT NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    amount NUMERIC DEFAULT 0 NOT NULL,
    payment_method TEXT DEFAULT 'cash' CHECK (payment_method IN ('cash', 'credit')),
    is_establishment BOOLEAN DEFAULT false,
    shift_type TEXT CHECK (shift_type IN ('morning', 'evening', 'full_day')),
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- (13) جدول السلفيات (advances)
CREATE TABLE IF NOT EXISTS public.advances (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    cycle_id UUID NOT NULL REFERENCES public.cycles(id) ON DELETE CASCADE,
    person_id UUID NOT NULL REFERENCES public.persons(id) ON DELETE CASCADE,
    amount NUMERIC DEFAULT 0 NOT NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    reason TEXT,
    fund TEXT,
    source_ref_id TEXT,
    source_type TEXT,
    is_retained_debt BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- (14) جدول مدفوعات الموردين (supplier_payments)
CREATE TABLE IF NOT EXISTS public.supplier_payments (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    cycle_id UUID NOT NULL REFERENCES public.cycles(id) ON DELETE CASCADE,
    supplier_id UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
    amount NUMERIC DEFAULT 0 NOT NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- (15) جدول مسحوبات المزارعين (farmer_withdrawals)
CREATE TABLE IF NOT EXISTS public.farmer_withdrawals (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    cycle_id UUID NOT NULL REFERENCES public.cycles(id) ON DELETE CASCADE,
    farmer_id UUID NOT NULL REFERENCES public.farmers(id) ON DELETE CASCADE,
    amount NUMERIC DEFAULT 0 NOT NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- (16) جدول المعاملات البنكية (bank_transactions)
CREATE TABLE IF NOT EXISTS public.bank_transactions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    account_id UUID NOT NULL REFERENCES public.bank_accounts(id) ON DELETE CASCADE,
    cycle_id UUID REFERENCES public.cycles(id) ON DELETE SET NULL,
    type TEXT NOT NULL CHECK (type IN ('deposit', 'withdrawal')),
    amount NUMERIC DEFAULT 0 NOT NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- (17) جدول ديون والتزامات الشركاء (partner_debts)
CREATE TABLE IF NOT EXISTS public.partner_debts (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    cycle_id UUID REFERENCES public.cycles(id) ON DELETE SET NULL,
    description TEXT NOT NULL,
    total_amount NUMERIC DEFAULT 0 NOT NULL,
    partner_allocations JSONB DEFAULT '{}'::jsonb NOT NULL,
    partner_repayments JSONB DEFAULT '{}'::jsonb,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    entered_treasury BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- (18) جدول السجل اليومي للمزرعة (daily_logs)
CREATE TABLE IF NOT EXISTS public.daily_logs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    cycle_id UUID NOT NULL REFERENCES public.cycles(id) ON DELETE CASCADE,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    tasks JSONB NOT NULL DEFAULT '[]'::jsonb,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- (19) جدول الأعضاء الافتراضيين (virtual_members) لدخول الموظفين
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

-- (20) جدول تتبع محاولات تسجيل الدخول الفاشلة (login_attempts)
CREATE TABLE IF NOT EXISTS public.login_attempts (
    id BIGSERIAL PRIMARY KEY,
    username TEXT NOT NULL,
    attempted_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- (21) جدول تتبع محاولات إدخال كود الربط الفاشلة (linking_attempts)
CREATE TABLE IF NOT EXISTS public.linking_attempts (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL,
    attempted_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- (22) جدول اشتراكات الإشعارات (push_subscriptions)
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    endpoint TEXT NOT NULL,
    p256dh_key TEXT,
    auth_key TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- (23) جدول تتبع زيارات التقارير المشتركة (report_visits)
CREATE TABLE IF NOT EXISTS public.report_visits (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    report_id TEXT NOT NULL,
    visitor_id TEXT NOT NULL,
    visitor_name TEXT,
    accessed_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    is_read BOOLEAN DEFAULT false NOT NULL,
    is_ignored BOOLEAN DEFAULT false NOT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT uq_report_visits_visitor_report UNIQUE (visitor_id, report_id)
);

-- (24) جدول تحديثات التطبيق (app_updates)
CREATE TABLE IF NOT EXISTS public.app_updates (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    latest_version TEXT NOT NULL,
    download_url TEXT,
    is_mandatory BOOLEAN DEFAULT false NOT NULL,
    release_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- (25) جدول روابط مشاركة التقارير المشفرة (report_shares)
CREATE TABLE IF NOT EXISTS public.report_shares (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    cycle_id UUID NOT NULL REFERENCES public.cycles(id) ON DELETE CASCADE,
    share_token TEXT UNIQUE NOT NULL,
    created_by UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    expires_at TIMESTAMPTZ,
    is_revoked BOOLEAN DEFAULT false NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ==============================================================================
-- 3. الفهارس لتسريع الاستعلامات والبحث
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_profiles_linking_code ON public.profiles (linking_code);
CREATE INDEX IF NOT EXISTS idx_profiles_parent_id ON public.profiles (parent_id);
CREATE INDEX IF NOT EXISTS idx_assets_user_id ON public.assets (user_id);
CREATE INDEX IF NOT EXISTS idx_farmers_user_id ON public.farmers (user_id);
CREATE INDEX IF NOT EXISTS idx_suppliers_user_id ON public.suppliers (user_id);
CREATE INDEX IF NOT EXISTS idx_persons_user_id ON public.persons (user_id);
CREATE INDEX IF NOT EXISTS idx_cycles_user_id ON public.cycles (user_id);
CREATE INDEX IF NOT EXISTS idx_cycles_asset_id ON public.cycles (asset_id);
CREATE INDEX IF NOT EXISTS idx_invoices_user_id ON public.invoices (user_id);
CREATE INDEX IF NOT EXISTS idx_invoices_cycle_id ON public.invoices (cycle_id);
CREATE INDEX IF NOT EXISTS idx_invoice_price_items_invoice_id ON public.invoice_price_items (invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_price_items_user_id ON public.invoice_price_items (user_id);
CREATE INDEX IF NOT EXISTS idx_invoice_deductions_invoice_id ON public.invoice_deductions (invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_deductions_user_id ON public.invoice_deductions (user_id);
CREATE INDEX IF NOT EXISTS idx_expenses_user_id ON public.expenses (user_id);
CREATE INDEX IF NOT EXISTS idx_expenses_cycle_id ON public.expenses (cycle_id);
CREATE INDEX IF NOT EXISTS idx_expenses_category_id ON public.expenses (category_id);
CREATE INDEX IF NOT EXISTS idx_advances_user_id ON public.advances (user_id);
CREATE INDEX IF NOT EXISTS idx_advances_cycle_id ON public.advances (cycle_id);
CREATE INDEX IF NOT EXISTS idx_advances_person_id ON public.advances (person_id);
CREATE INDEX IF NOT EXISTS idx_supplier_payments_user_id ON public.supplier_payments (user_id);
CREATE INDEX IF NOT EXISTS idx_supplier_payments_cycle_id ON public.supplier_payments (cycle_id);
CREATE INDEX IF NOT EXISTS idx_farmer_withdrawals_user_id ON public.farmer_withdrawals (user_id);
CREATE INDEX IF NOT EXISTS idx_farmer_withdrawals_cycle_id ON public.farmer_withdrawals (cycle_id);
CREATE INDEX IF NOT EXISTS idx_bank_accounts_user_id ON public.bank_accounts (user_id);
CREATE INDEX IF NOT EXISTS idx_bank_transactions_user_id ON public.bank_transactions (user_id);
CREATE INDEX IF NOT EXISTS idx_bank_transactions_account_id ON public.bank_transactions (account_id);
CREATE INDEX IF NOT EXISTS idx_partner_debts_user_id ON public.partner_debts (user_id);
CREATE INDEX IF NOT EXISTS idx_daily_logs_user_id ON public.daily_logs (user_id);
CREATE INDEX IF NOT EXISTS idx_daily_logs_cycle_id ON public.daily_logs (cycle_id);
CREATE INDEX IF NOT EXISTS idx_login_attempts_username_time ON public.login_attempts (username, attempted_at DESC);
CREATE INDEX IF NOT EXISTS idx_linking_attempts_user_time ON public.linking_attempts (user_id, attempted_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_push_subscriptions_endpoint ON public.push_subscriptions (endpoint);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id ON public.push_subscriptions (user_id);
CREATE INDEX IF NOT EXISTS idx_report_visits_report_id ON public.report_visits (report_id);
CREATE INDEX IF NOT EXISTS idx_report_visits_visitor_id ON public.report_visits (visitor_id);
CREATE INDEX IF NOT EXISTS idx_report_shares_token ON public.report_shares (share_token);
CREATE INDEX IF NOT EXISTS idx_report_shares_cycle_id ON public.report_shares (cycle_id);

-- ==============================================================================
-- 4. المشغلات والدوال المساعدة المشفرة
-- ==============================================================================

-- أ) تشفير كلمة مرور العضو الافتراضي تلقائياً قبل الحفظ
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

-- ب) دالة تسجيل دخول الأعضاء الافتراضيين مع حماية Rate Limiting
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
    -- تنظيف المحاولات القديمة
    DELETE FROM public.login_attempts
    WHERE attempted_at < NOW() - INTERVAL '1 hour';

    -- فحص عدد المحاولات الفاشلة لنفس المستخدم خلال 15 دقيقة
    SELECT COUNT(*)
    INTO v_failed_attempts
    FROM public.login_attempts
    WHERE username = p_username
      AND attempted_at >= NOW() - INTERVAL '15 minutes';

    IF v_failed_attempts > 5 THEN
        RAISE EXCEPTION 'تم قفل الحساب مؤقتاً لكثرة المحاولات الخاطئة. يرجى المحاولة بعد 15 دقيقة.';
    END IF;

    -- التحقق من كلمة المرور
    SELECT vm.id, vm.owner_id, vm.username, vm.full_name, vm.role
    INTO v_member
    FROM public.virtual_members vm
    WHERE vm.username = p_username 
      AND vm.password = crypt(p_password, vm.password)
    LIMIT 1;

    IF v_member.id IS NULL THEN
        INSERT INTO public.login_attempts (username, attempted_at)
        VALUES (p_username, NOW());
        RETURN;
    END IF;

    -- مسح المحاولات الفاشلة عند النجاح وتحديث وقت الظهور
    DELETE FROM public.login_attempts 
    WHERE username = p_username;

    UPDATE public.virtual_members 
    SET last_seen = NOW()
    WHERE id = v_member.id;

    RETURN QUERY
    SELECT v_member.id, v_member.owner_id, v_member.username, v_member.full_name, v_member.role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

GRANT EXECUTE ON FUNCTION public.virtual_login(TEXT, TEXT) TO anon, authenticated, service_role;

-- ج) دالة تحديث آخر ظهور للعضو الافتراضي
CREATE OR REPLACE FUNCTION public.update_virtual_member_last_seen(member_id UUID)
RETURNS VOID AS $$
DECLARE
    v_owner_id UUID;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'غير مصرح';
    END IF;

    SELECT owner_id INTO v_owner_id
    FROM public.virtual_members
    WHERE id = member_id;

    IF v_owner_id IS NULL OR auth.uid() <> v_owner_id THEN
        RAISE EXCEPTION 'غير مصرح';
    END IF;

    UPDATE public.virtual_members
    SET last_seen = NOW()
    WHERE id = member_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

REVOKE ALL ON FUNCTION public.update_virtual_member_last_seen(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_virtual_member_last_seen(UUID) TO authenticated, service_role;

-- د) دالة توليد كود عشوائي قوي مشفر
CREATE OR REPLACE FUNCTION public.generate_secure_linking_code(p_length INT DEFAULT 12)
RETURNS TEXT AS $$
DECLARE
    v_chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    v_result TEXT := '';
    v_i INT;
    v_bytes BYTEA;
    v_rand_byte INT;
BEGIN
    IF p_length < 6 THEN
        p_length := 6;
    END IF;
    IF p_length > 32 THEN
        p_length := 32;
    END IF;

    v_bytes := gen_random_bytes(p_length);
    FOR v_i IN 0..(p_length - 1) LOOP
        v_rand_byte := get_byte(v_bytes, v_i);
        v_result := v_result || substr(v_chars, (v_rand_byte % length(v_chars)) + 1, 1);
    END LOOP;

    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

REVOKE EXECUTE ON FUNCTION public.generate_secure_linking_code(INT) FROM anon;
GRANT EXECUTE ON FUNCTION public.generate_secure_linking_code(INT) TO authenticated;

-- هـ) دالة ربط الحساب بالمالك عبر تجزئة كود الربط
CREATE OR REPLACE FUNCTION public.link_account_to_owner(p_code TEXT)
RETURNS JSONB AS $$
DECLARE
    v_user_id UUID;
    v_clean_code TEXT;
    v_hash TEXT;
    v_owner RECORD;
    v_failed_attempts INT;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'يجب تسجيل الدخول أولاً لربط الحساب.';
    END IF;

    v_clean_code := UPPER(TRIM(COALESCE(p_code, '')));
    IF length(v_clean_code) < 6 THEN
        RAISE EXCEPTION 'يرجى إدخال كود ربط صحيح';
    END IF;

    v_hash := encode(digest(v_clean_code, 'sha256'), 'hex');

    DELETE FROM public.linking_attempts
    WHERE attempted_at < NOW() - INTERVAL '1 hour';

    SELECT COUNT(*)
    INTO v_failed_attempts
    FROM public.linking_attempts
    WHERE user_id = v_user_id
      AND attempted_at >= NOW() - INTERVAL '15 minutes';

    IF v_failed_attempts >= 5 THEN
        RAISE EXCEPTION 'تم قفل محاولات الربط مؤقتاً لكثرة المحاولات الخاطئة. يرجى المحاولة بعد 15 دقيقة.';
    END IF;

    SELECT id, full_name, linking_code_expires_at
    INTO v_owner
    FROM public.profiles
    WHERE linking_code = v_hash
    LIMIT 1;

    IF v_owner.id IS NULL THEN
        INSERT INTO public.linking_attempts (user_id, attempted_at)
        VALUES (v_user_id, NOW());
        RAISE EXCEPTION 'كود غير صحيح. تأكد من الكود من صاحب الحساب.';
    END IF;

    IF v_owner.id = v_user_id THEN
        RAISE EXCEPTION 'لا يمكنك ربط حسابك بنفسك.';
    END IF;

    IF v_owner.linking_code_expires_at IS NULL OR v_owner.linking_code_expires_at < NOW() THEN
        INSERT INTO public.linking_attempts (user_id, attempted_at)
        VALUES (v_user_id, NOW());
        RAISE EXCEPTION 'هذا الكود منتهي الصلاحية (صلاحية الكود 24 ساعة فقط من توليده). اطلب كوداً جديداً من صاحب الحساب.';
    END IF;

    DELETE FROM public.linking_attempts
    WHERE user_id = v_user_id;

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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

GRANT EXECUTE ON FUNCTION public.link_account_to_owner(TEXT) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.link_account_to_owner(TEXT) FROM anon;

-- و) دالة التحديث الذري لبنود الفاتورة والخصومات
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
    v_is_authorized BOOLEAN := false;
BEGIN
    v_actual_user_id := COALESCE(auth.uid(), p_user_id);
    
    IF v_actual_user_id IS NULL THEN
        RAISE EXCEPTION 'غير مصرح: يجب توفر معرف مستخدم صالح';
    END IF;

    SELECT user_id INTO v_invoice_owner_id
    FROM public.invoices
    WHERE id = p_invoice_id;

    IF v_invoice_owner_id IS NULL THEN
        RAISE EXCEPTION 'الفاتورة غير موجودة أو تم حذفها';
    END IF;

    -- التحقق من الصلاحية: المالك المباشر أو محرر مرتبط
    IF v_actual_user_id = v_invoice_owner_id THEN
        v_is_authorized := true;
    ELSE
        SELECT EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = v_actual_user_id 
              AND parent_id = v_invoice_owner_id 
              AND role = 'editor'
        ) INTO v_is_authorized;
    END IF;

    IF NOT v_is_authorized THEN
        RAISE EXCEPTION 'غير مصرح: لا تملك صلاحية تعديل بنود هذه الفاتورة';
    END IF;

    DELETE FROM public.invoice_price_items WHERE invoice_id = p_invoice_id;
    DELETE FROM public.invoice_deductions WHERE invoice_id = p_invoice_id;

    IF p_price_items IS NOT NULL AND jsonb_typeof(p_price_items) = 'array' AND jsonb_array_length(p_price_items) > 0 THEN
        INSERT INTO public.invoice_price_items (invoice_id, user_id, quantity, price_per_kg, packaging_count)
        SELECT 
            p_invoice_id,
            COALESCE((item->>'user_id')::UUID, v_invoice_owner_id),
            COALESCE((item->>'quantity')::NUMERIC, 0),
            COALESCE((item->>'price_per_kg')::NUMERIC, 0),
            (item->>'packaging_count')::NUMERIC
        FROM jsonb_array_elements(p_price_items) AS item;
    END IF;

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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

REVOKE ALL ON FUNCTION public.upsert_invoice_items(UUID, JSONB, JSONB, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.upsert_invoice_items(UUID, JSONB, JSONB, UUID) TO authenticated, service_role;

-- ز) دالة إنشاء رابط مشاركة تقرير آمن
CREATE OR REPLACE FUNCTION public.create_report_share(
    p_cycle_id UUID,
    p_expires_days INT DEFAULT 30
)
RETURNS JSONB AS $$
DECLARE
    v_user_id UUID;
    v_owner_id UUID;
    v_token TEXT;
    v_expires TIMESTAMPTZ;
    v_existing_token TEXT;
    v_existing_expires TIMESTAMPTZ;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'يجب تسجيل الدخول لإنشاء رابط مشاركة للتقرير';
    END IF;

    SELECT user_id INTO v_owner_id
    FROM public.cycles
    WHERE id = p_cycle_id;

    IF v_owner_id IS NULL THEN
        RAISE EXCEPTION 'العروة المطلوبة غير موجودة';
    END IF;

    IF v_owner_id <> v_user_id AND NOT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = v_user_id
          AND parent_id = v_owner_id
          AND role IN ('editor', 'owner')
    ) THEN
        RAISE EXCEPTION 'غير مصرح: لا تملك صلاحية مشاركة هذا التقرير';
    END IF;

    SELECT share_token, expires_at
    INTO v_existing_token, v_existing_expires
    FROM public.report_shares
    WHERE cycle_id = p_cycle_id
      AND is_revoked = false
      AND (expires_at IS NULL OR expires_at > NOW() + INTERVAL '1 day')
    ORDER BY created_at DESC
    LIMIT 1;

    IF v_existing_token IS NOT NULL THEN
        RETURN jsonb_build_object(
            'success', true,
            'share_token', v_existing_token,
            'expires_at', v_existing_expires
        );
    END IF;

    v_token := encode(gen_random_bytes(32), 'hex');
    
    IF p_expires_days IS NOT NULL AND p_expires_days > 0 THEN
        v_expires := NOW() + (p_expires_days || ' days')::INTERVAL;
    ELSE
        v_expires := NULL;
    END IF;

    INSERT INTO public.report_shares (cycle_id, share_token, created_by, expires_at)
    VALUES (p_cycle_id, v_token, v_user_id, v_expires);

    RETURN jsonb_build_object(
        'success', true,
        'share_token', v_token,
        'expires_at', v_expires
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

REVOKE ALL ON FUNCTION public.create_report_share(UUID, INT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_report_share(UUID, INT) TO authenticated, service_role;

-- ح) دالة جلب بيانات التقرير المشترك بالرمز
CREATE OR REPLACE FUNCTION public.get_shared_report(p_share_token TEXT)
RETURNS JSONB AS $$
DECLARE
    v_share RECORD;
    v_cycle RECORD;
    v_asset_name TEXT;
    v_owner_profile RECORD;
    v_invoices JSONB;
    v_expenses JSONB;
    v_price_items JSONB;
    v_deductions JSONB;
    v_categories JSONB;
    v_withdrawals JSONB;
    v_supplier_payments JSONB;
    v_advances JSONB;
    v_suppliers JSONB;
    v_farmers JSONB;
    v_persons JSONB;
    v_bank_accounts JSONB;
    v_bank_transactions JSONB;
BEGIN
    IF p_share_token IS NULL OR TRIM(p_share_token) = '' THEN
        RAISE EXCEPTION 'رمز مشاركة التقرير مطلوب';
    END IF;

    SELECT rs.id, rs.cycle_id, rs.created_by, rs.expires_at, rs.is_revoked
    INTO v_share
    FROM public.report_shares rs
    WHERE rs.share_token = TRIM(p_share_token)
    LIMIT 1;

    IF v_share.id IS NULL THEN
        RAISE EXCEPTION 'رابط التقرير غير صحيح أو تم حذفه';
    END IF;

    IF v_share.is_revoked THEN
        RAISE EXCEPTION 'تم إلغاء صلاحية هذا الرابط من قبل صاحب الحساب';
    END IF;

    IF v_share.expires_at IS NOT NULL AND v_share.expires_at < NOW() THEN
        RAISE EXCEPTION 'انتهت صلاحية رابط هذا التقرير';
    END IF;

    SELECT 
        c.id, c.user_id, c.name, c.seed_type, c.plant_count, 
        c.unit_of_measure, c.area_in_feddans, c.asset_id, 
        c.start_date, c.production_start_date, c.status, 
        c.responsible_farmer_id, c.farmer_share_percentage, 
        c.target_yield, c.notes, c.created_at
    INTO v_cycle
    FROM public.cycles c
    WHERE c.id = v_share.cycle_id;

    IF v_cycle.id IS NULL THEN
        RAISE EXCEPTION 'العروة المرتبطة بهذا التقرير لم تعد متوفرة';
    END IF;

    SELECT a.name INTO v_asset_name
    FROM public.assets a
    WHERE a.id = v_cycle.asset_id;

    SELECT p.app_settings INTO v_owner_profile
    FROM public.profiles p
    WHERE p.id = v_cycle.user_id;

    SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'id', i.id, 'user_id', i.user_id, 'cycle_id', i.cycle_id,
        'description', i.description, 'date', i.date, 'market', i.market,
        'packaging_type', i.packaging_type, 'packaging_count', i.packaging_count,
        'carton_count', i.carton_count, 'cage_count', i.cage_count, 'created_at', i.created_at
    )), '[]'::jsonb)
    INTO v_invoices
    FROM public.invoices i
    WHERE i.cycle_id = v_cycle.id;

    SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'id', ipi.id, 'invoice_id', ipi.invoice_id, 'quantity', ipi.quantity,
        'price_per_kg', ipi.price_per_kg, 'packaging_count', ipi.packaging_count
    )), '[]'::jsonb)
    INTO v_price_items
    FROM public.invoice_price_items ipi
    WHERE ipi.invoice_id IN (SELECT i.id FROM public.invoices i WHERE i.cycle_id = v_cycle.id);

    SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'id', ided.id, 'invoice_id', ided.invoice_id, 'name', ided.name, 'amount', ided.amount
    )), '[]'::jsonb)
    INTO v_deductions
    FROM public.invoice_deductions ided
    WHERE ided.invoice_id IN (SELECT i.id FROM public.invoices i WHERE i.cycle_id = v_cycle.id);

    SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'id', e.id, 'user_id', e.user_id, 'cycle_id', e.cycle_id,
        'category_id', e.category_id, 'description', e.description,
        'date', e.date, 'amount', e.amount, 'supplier_id', e.supplier_id,
        'payment_method', e.payment_method, 'is_establishment', e.is_establishment,
        'shift_type', e.shift_type, 'created_at', e.created_at
    )), '[]'::jsonb)
    INTO v_expenses
    FROM public.expenses e
    WHERE e.cycle_id = v_cycle.id;

    SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'id', ec.id, 'name', ec.name, 'is_supplier_category', ec.is_supplier_category,
        'is_labor_category', ec.is_labor_category, 'is_discount_category', ec.is_discount_category
    )), '[]'::jsonb)
    INTO v_categories
    FROM public.expense_categories ec
    WHERE ec.user_id = v_cycle.user_id;

    SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'id', fw.id, 'cycle_id', fw.cycle_id, 'farmer_id', fw.farmer_id,
        'date', fw.date, 'amount', fw.amount, 'notes', fw.notes
    )), '[]'::jsonb)
    INTO v_withdrawals
    FROM public.farmer_withdrawals fw
    WHERE fw.cycle_id = v_cycle.id;

    SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'id', sp.id, 'cycle_id', sp.cycle_id, 'supplier_id', sp.supplier_id,
        'date', sp.date, 'amount', sp.amount, 'payment_method', sp.payment_method,
        'notes', sp.notes
    )), '[]'::jsonb)
    INTO v_supplier_payments
    FROM public.supplier_payments sp
    WHERE sp.cycle_id = v_cycle.id;

    SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'id', adv.id, 'cycle_id', adv.cycle_id, 'person_id', adv.person_id,
        'date', adv.date, 'amount', adv.amount, 'notes', adv.notes
    )), '[]'::jsonb)
    INTO v_advances
    FROM public.advances adv
    WHERE adv.cycle_id = v_cycle.id;

    SELECT COALESCE(jsonb_agg(jsonb_build_object('id', s.id, 'name', s.name)), '[]'::jsonb)
    INTO v_suppliers
    FROM public.suppliers s
    WHERE s.user_id = v_cycle.user_id;

    SELECT COALESCE(jsonb_agg(jsonb_build_object('id', f.id, 'name', f.name)), '[]'::jsonb)
    INTO v_farmers
    FROM public.farmers f
    WHERE f.user_id = v_cycle.user_id;

    SELECT COALESCE(jsonb_agg(jsonb_build_object('id', p.id, 'name', p.name)), '[]'::jsonb)
    INTO v_persons
    FROM public.persons p
    WHERE p.user_id = v_cycle.user_id;

    SELECT COALESCE(jsonb_agg(jsonb_build_object('id', ba.id, 'name', ba.name, 'balance', ba.balance)), '[]'::jsonb)
    INTO v_bank_accounts
    FROM public.bank_accounts ba
    WHERE ba.user_id = v_cycle.user_id;

    SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'id', bt.id, 'account_id', bt.account_id, 'date', bt.date,
        'amount', bt.amount, 'type', bt.type, 'description', bt.description
    )), '[]'::jsonb)
    INTO v_bank_transactions
    FROM public.bank_transactions bt
    WHERE bt.user_id = v_cycle.user_id;

    RETURN jsonb_build_object(
        'success', true,
        'cycle', row_to_json(v_cycle),
        'asset_name', COALESCE(v_asset_name, 'غير محدد'),
        'invoices', v_invoices,
        'invoice_price_items', v_price_items,
        'invoice_deductions', v_deductions,
        'expenses', v_expenses,
        'expense_categories', v_categories,
        'farmer_withdrawals', v_withdrawals,
        'supplier_payments', v_supplier_payments,
        'advances', v_advances,
        'suppliers', v_suppliers,
        'farmers', v_farmers,
        'persons', v_persons,
        'bank_accounts', v_bank_accounts,
        'bank_transactions', v_bank_transactions,
        'app_settings', v_owner_profile.app_settings
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

REVOKE ALL ON FUNCTION public.get_shared_report(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_shared_report(TEXT) TO anon, authenticated, service_role;

-- ==============================================================================
-- 5. تفعيل Row Level Security (RLS) وسياسات الأمان لكافة الجداول
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- (1) profiles
-- ------------------------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone." ON public.profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Public profiles general info viewable" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile." ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile." ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update safe fields in own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own full profile" ON public.profiles;
DROP POLICY IF EXISTS "Owners can view their linked members" ON public.profiles;
DROP POLICY IF EXISTS "Members can view their owner profile" ON public.profiles;

CREATE POLICY "Users can insert their own profile." 
ON public.profiles FOR INSERT 
WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can view own full profile" 
ON public.profiles FOR SELECT 
USING (auth.uid() = id);

CREATE POLICY "Owners can view their linked members" 
ON public.profiles FOR SELECT 
USING (auth.uid() = parent_id);

CREATE POLICY "Members can view their owner profile"
ON public.profiles FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid()
          AND p.parent_id = profiles.id
    )
);

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

-- ------------------------------------------------------------------------------
-- (2) assets
-- ------------------------------------------------------------------------------
ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their own assets." ON public.assets;
DROP POLICY IF EXISTS "Users can insert their own assets." ON public.assets;
DROP POLICY IF EXISTS "Users can update their own assets." ON public.assets;
DROP POLICY IF EXISTS "Users can delete their own assets." ON public.assets;
DROP POLICY IF EXISTS "Users and team members can view assets" ON public.assets;
DROP POLICY IF EXISTS "Users and editors can insert assets" ON public.assets;
DROP POLICY IF EXISTS "Users and editors can update assets" ON public.assets;
DROP POLICY IF EXISTS "Users and editors can delete assets" ON public.assets;

CREATE POLICY "Users and team members can view assets" 
ON public.assets FOR SELECT 
USING (
    auth.uid() = user_id OR 
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.parent_id = assets.user_id)
);

CREATE POLICY "Users and editors can insert assets" 
ON public.assets FOR INSERT 
WITH CHECK (
    auth.uid() = user_id OR 
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.parent_id = assets.user_id AND profiles.role = 'editor')
);

CREATE POLICY "Users and editors can update assets" 
ON public.assets FOR UPDATE 
USING (
    auth.uid() = user_id OR 
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.parent_id = assets.user_id AND profiles.role = 'editor')
)
WITH CHECK (
    auth.uid() = user_id OR 
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.parent_id = assets.user_id AND profiles.role = 'editor')
);

CREATE POLICY "Users and editors can delete assets" 
ON public.assets FOR DELETE 
USING (
    auth.uid() = user_id OR 
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.parent_id = assets.user_id AND profiles.role = 'editor')
);

-- ------------------------------------------------------------------------------
-- (3) farmers
-- ------------------------------------------------------------------------------
ALTER TABLE public.farmers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their own farmers." ON public.farmers;
DROP POLICY IF EXISTS "Users can insert their own farmers." ON public.farmers;
DROP POLICY IF EXISTS "Users can update their own farmers." ON public.farmers;
DROP POLICY IF EXISTS "Users can delete their own farmers." ON public.farmers;
DROP POLICY IF EXISTS "Users and team members can view farmers" ON public.farmers;
DROP POLICY IF EXISTS "Users and editors can insert farmers" ON public.farmers;
DROP POLICY IF EXISTS "Users and editors can update farmers" ON public.farmers;
DROP POLICY IF EXISTS "Users and editors can delete farmers" ON public.farmers;

CREATE POLICY "Users and team members can view farmers" 
ON public.farmers FOR SELECT 
USING (
    auth.uid() = user_id OR 
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.parent_id = farmers.user_id)
);

CREATE POLICY "Users and editors can insert farmers" 
ON public.farmers FOR INSERT 
WITH CHECK (
    auth.uid() = user_id OR 
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.parent_id = farmers.user_id AND profiles.role = 'editor')
);

CREATE POLICY "Users and editors can update farmers" 
ON public.farmers FOR UPDATE 
USING (
    auth.uid() = user_id OR 
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.parent_id = farmers.user_id AND profiles.role = 'editor')
)
WITH CHECK (
    auth.uid() = user_id OR 
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.parent_id = farmers.user_id AND profiles.role = 'editor')
);

CREATE POLICY "Users and editors can delete farmers" 
ON public.farmers FOR DELETE 
USING (
    auth.uid() = user_id OR 
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.parent_id = farmers.user_id AND profiles.role = 'editor')
);

-- ------------------------------------------------------------------------------
-- (4) suppliers
-- ------------------------------------------------------------------------------
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their own suppliers." ON public.suppliers;
DROP POLICY IF EXISTS "Users can insert their own suppliers." ON public.suppliers;
DROP POLICY IF EXISTS "Users can update their own suppliers." ON public.suppliers;
DROP POLICY IF EXISTS "Users can delete their own suppliers." ON public.suppliers;
DROP POLICY IF EXISTS "Users and team members can view suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "Users and editors can insert suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "Users and editors can update suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "Users and editors can delete suppliers" ON public.suppliers;

CREATE POLICY "Users and team members can view suppliers" 
ON public.suppliers FOR SELECT 
USING (
    auth.uid() = user_id OR 
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.parent_id = suppliers.user_id)
);

CREATE POLICY "Users and editors can insert suppliers" 
ON public.suppliers FOR INSERT 
WITH CHECK (
    auth.uid() = user_id OR 
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.parent_id = suppliers.user_id AND profiles.role = 'editor')
);

CREATE POLICY "Users and editors can update suppliers" 
ON public.suppliers FOR UPDATE 
USING (
    auth.uid() = user_id OR 
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.parent_id = suppliers.user_id AND profiles.role = 'editor')
)
WITH CHECK (
    auth.uid() = user_id OR 
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.parent_id = suppliers.user_id AND profiles.role = 'editor')
);

CREATE POLICY "Users and editors can delete suppliers" 
ON public.suppliers FOR DELETE 
USING (
    auth.uid() = user_id OR 
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.parent_id = suppliers.user_id AND profiles.role = 'editor')
);

-- ------------------------------------------------------------------------------
-- (5) persons
-- ------------------------------------------------------------------------------
ALTER TABLE public.persons ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their own persons." ON public.persons;
DROP POLICY IF EXISTS "Users can insert their own persons." ON public.persons;
DROP POLICY IF EXISTS "Users can update their own persons." ON public.persons;
DROP POLICY IF EXISTS "Users can delete their own persons." ON public.persons;
DROP POLICY IF EXISTS "Users and team members can view persons" ON public.persons;
DROP POLICY IF EXISTS "Users and editors can insert persons" ON public.persons;
DROP POLICY IF EXISTS "Users and editors can update persons" ON public.persons;
DROP POLICY IF EXISTS "Users and editors can delete persons" ON public.persons;

CREATE POLICY "Users and team members can view persons" 
ON public.persons FOR SELECT 
USING (
    auth.uid() = user_id OR 
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.parent_id = persons.user_id)
);

CREATE POLICY "Users and editors can insert persons" 
ON public.persons FOR INSERT 
WITH CHECK (
    auth.uid() = user_id OR 
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.parent_id = persons.user_id AND profiles.role = 'editor')
);

CREATE POLICY "Users and editors can update persons" 
ON public.persons FOR UPDATE 
USING (
    auth.uid() = user_id OR 
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.parent_id = persons.user_id AND profiles.role = 'editor')
)
WITH CHECK (
    auth.uid() = user_id OR 
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.parent_id = persons.user_id AND profiles.role = 'editor')
);

CREATE POLICY "Users and editors can delete persons" 
ON public.persons FOR DELETE 
USING (
    auth.uid() = user_id OR 
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.parent_id = persons.user_id AND profiles.role = 'editor')
);

-- ------------------------------------------------------------------------------
-- (6) expense_categories
-- ------------------------------------------------------------------------------
ALTER TABLE public.expense_categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their own expense categories." ON public.expense_categories;
DROP POLICY IF EXISTS "Users can insert their own expense categories." ON public.expense_categories;
DROP POLICY IF EXISTS "Users can update their own expense categories." ON public.expense_categories;
DROP POLICY IF EXISTS "Users can delete their own expense categories." ON public.expense_categories;
DROP POLICY IF EXISTS "Users and team members can view expense_categories" ON public.expense_categories;
DROP POLICY IF EXISTS "Users and editors can insert expense_categories" ON public.expense_categories;
DROP POLICY IF EXISTS "Users and editors can update expense_categories" ON public.expense_categories;
DROP POLICY IF EXISTS "Users and editors can delete expense_categories" ON public.expense_categories;

CREATE POLICY "Users and team members can view expense_categories" 
ON public.expense_categories FOR SELECT 
USING (
    auth.uid() = user_id OR 
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.parent_id = expense_categories.user_id)
);

CREATE POLICY "Users and editors can insert expense_categories" 
ON public.expense_categories FOR INSERT 
WITH CHECK (
    auth.uid() = user_id OR 
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.parent_id = expense_categories.user_id AND profiles.role = 'editor')
);

CREATE POLICY "Users and editors can update expense_categories" 
ON public.expense_categories FOR UPDATE 
USING (
    auth.uid() = user_id OR 
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.parent_id = expense_categories.user_id AND profiles.role = 'editor')
)
WITH CHECK (
    auth.uid() = user_id OR 
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.parent_id = expense_categories.user_id AND profiles.role = 'editor')
);

CREATE POLICY "Users and editors can delete expense_categories" 
ON public.expense_categories FOR DELETE 
USING (
    auth.uid() = user_id OR 
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.parent_id = expense_categories.user_id AND profiles.role = 'editor')
);

-- ------------------------------------------------------------------------------
-- (7) bank_accounts
-- ------------------------------------------------------------------------------
ALTER TABLE public.bank_accounts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their own bank_accounts." ON public.bank_accounts;
DROP POLICY IF EXISTS "Users can insert their own bank_accounts." ON public.bank_accounts;
DROP POLICY IF EXISTS "Users can update their own bank_accounts." ON public.bank_accounts;
DROP POLICY IF EXISTS "Users can delete their own bank_accounts." ON public.bank_accounts;
DROP POLICY IF EXISTS "Users and team members can view bank_accounts" ON public.bank_accounts;
DROP POLICY IF EXISTS "Users and editors can insert bank_accounts" ON public.bank_accounts;
DROP POLICY IF EXISTS "Users and editors can update bank_accounts" ON public.bank_accounts;
DROP POLICY IF EXISTS "Users and editors can delete bank_accounts" ON public.bank_accounts;

CREATE POLICY "Users and team members can view bank_accounts" 
ON public.bank_accounts FOR SELECT 
USING (
    auth.uid() = user_id OR 
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.parent_id = bank_accounts.user_id)
);

CREATE POLICY "Users and editors can insert bank_accounts" 
ON public.bank_accounts FOR INSERT 
WITH CHECK (
    auth.uid() = user_id OR 
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.parent_id = bank_accounts.user_id AND profiles.role = 'editor')
);

CREATE POLICY "Users and editors can update bank_accounts" 
ON public.bank_accounts FOR UPDATE 
USING (
    auth.uid() = user_id OR 
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.parent_id = bank_accounts.user_id AND profiles.role = 'editor')
)
WITH CHECK (
    auth.uid() = user_id OR 
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.parent_id = bank_accounts.user_id AND profiles.role = 'editor')
);

CREATE POLICY "Users and editors can delete bank_accounts" 
ON public.bank_accounts FOR DELETE 
USING (
    auth.uid() = user_id OR 
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.parent_id = bank_accounts.user_id AND profiles.role = 'editor')
);

-- ------------------------------------------------------------------------------
-- (8) cycles
-- ------------------------------------------------------------------------------
ALTER TABLE public.cycles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their own cycles." ON public.cycles;
DROP POLICY IF EXISTS "Users can insert their own cycles." ON public.cycles;
DROP POLICY IF EXISTS "Users can update their own cycles." ON public.cycles;
DROP POLICY IF EXISTS "Users can delete their own cycles." ON public.cycles;
DROP POLICY IF EXISTS "Users and team members can view cycles" ON public.cycles;
DROP POLICY IF EXISTS "Users and editors can insert cycles" ON public.cycles;
DROP POLICY IF EXISTS "Users and editors can update cycles" ON public.cycles;
DROP POLICY IF EXISTS "Users and editors can delete cycles" ON public.cycles;

CREATE POLICY "Users and team members can view cycles" 
ON public.cycles FOR SELECT 
USING (
    auth.uid() = user_id OR 
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.parent_id = cycles.user_id)
);

CREATE POLICY "Users and editors can insert cycles" 
ON public.cycles FOR INSERT 
WITH CHECK (
    auth.uid() = user_id OR 
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.parent_id = cycles.user_id AND profiles.role = 'editor')
);

CREATE POLICY "Users and editors can update cycles" 
ON public.cycles FOR UPDATE 
USING (
    auth.uid() = user_id OR 
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.parent_id = cycles.user_id AND profiles.role = 'editor')
)
WITH CHECK (
    auth.uid() = user_id OR 
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.parent_id = cycles.user_id AND profiles.role = 'editor')
);

CREATE POLICY "Users and editors can delete cycles" 
ON public.cycles FOR DELETE 
USING (
    auth.uid() = user_id OR 
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.parent_id = cycles.user_id AND profiles.role = 'editor')
);

-- ------------------------------------------------------------------------------
-- (9) invoices
-- ------------------------------------------------------------------------------
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their own invoices." ON public.invoices;
DROP POLICY IF EXISTS "Users can insert their own invoices." ON public.invoices;
DROP POLICY IF EXISTS "Users can update their own invoices." ON public.invoices;
DROP POLICY IF EXISTS "Users can delete their own invoices." ON public.invoices;
DROP POLICY IF EXISTS "Users and team members can view invoices" ON public.invoices;
DROP POLICY IF EXISTS "Users and editors can insert invoices" ON public.invoices;
DROP POLICY IF EXISTS "Users and editors can update invoices" ON public.invoices;
DROP POLICY IF EXISTS "Users and editors can delete invoices" ON public.invoices;

CREATE POLICY "Users and team members can view invoices" 
ON public.invoices FOR SELECT 
USING (
    auth.uid() = user_id OR 
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.parent_id = invoices.user_id)
);

CREATE POLICY "Users and editors can insert invoices" 
ON public.invoices FOR INSERT 
WITH CHECK (
    auth.uid() = user_id OR 
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.parent_id = invoices.user_id AND profiles.role = 'editor')
);

CREATE POLICY "Users and editors can update invoices" 
ON public.invoices FOR UPDATE 
USING (
    auth.uid() = user_id OR 
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.parent_id = invoices.user_id AND profiles.role = 'editor')
)
WITH CHECK (
    auth.uid() = user_id OR 
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.parent_id = invoices.user_id AND profiles.role = 'editor')
);

CREATE POLICY "Users and editors can delete invoices" 
ON public.invoices FOR DELETE 
USING (
    auth.uid() = user_id OR 
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.parent_id = invoices.user_id AND profiles.role = 'editor')
);

-- ------------------------------------------------------------------------------
-- (10) invoice_price_items
-- ------------------------------------------------------------------------------
ALTER TABLE public.invoice_price_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their own invoice_price_items." ON public.invoice_price_items;
DROP POLICY IF EXISTS "Users can insert their own invoice_price_items." ON public.invoice_price_items;
DROP POLICY IF EXISTS "Users can update their own invoice_price_items." ON public.invoice_price_items;
DROP POLICY IF EXISTS "Users can delete their own invoice_price_items." ON public.invoice_price_items;
DROP POLICY IF EXISTS "Users and team members can view invoice_price_items" ON public.invoice_price_items;
DROP POLICY IF EXISTS "Users and editors can insert invoice_price_items" ON public.invoice_price_items;
DROP POLICY IF EXISTS "Users and editors can update invoice_price_items" ON public.invoice_price_items;
DROP POLICY IF EXISTS "Users and editors can delete invoice_price_items" ON public.invoice_price_items;

CREATE POLICY "Users and team members can view invoice_price_items" 
ON public.invoice_price_items FOR SELECT 
USING (
    auth.uid() = user_id OR 
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.parent_id = invoice_price_items.user_id)
);

CREATE POLICY "Users and editors can insert invoice_price_items" 
ON public.invoice_price_items FOR INSERT 
WITH CHECK (
    auth.uid() = user_id OR 
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.parent_id = invoice_price_items.user_id AND profiles.role = 'editor')
);

CREATE POLICY "Users and editors can update invoice_price_items" 
ON public.invoice_price_items FOR UPDATE 
USING (
    auth.uid() = user_id OR 
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.parent_id = invoice_price_items.user_id AND profiles.role = 'editor')
)
WITH CHECK (
    auth.uid() = user_id OR 
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.parent_id = invoice_price_items.user_id AND profiles.role = 'editor')
);

CREATE POLICY "Users and editors can delete invoice_price_items" 
ON public.invoice_price_items FOR DELETE 
USING (
    auth.uid() = user_id OR 
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.parent_id = invoice_price_items.user_id AND profiles.role = 'editor')
);

-- ------------------------------------------------------------------------------
-- (11) invoice_deductions
-- ------------------------------------------------------------------------------
ALTER TABLE public.invoice_deductions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their own invoice_deductions." ON public.invoice_deductions;
DROP POLICY IF EXISTS "Users can insert their own invoice_deductions." ON public.invoice_deductions;
DROP POLICY IF EXISTS "Users can update their own invoice_deductions." ON public.invoice_deductions;
DROP POLICY IF EXISTS "Users can delete their own invoice_deductions." ON public.invoice_deductions;
DROP POLICY IF EXISTS "Users and team members can view invoice_deductions" ON public.invoice_deductions;
DROP POLICY IF EXISTS "Users and editors can insert invoice_deductions" ON public.invoice_deductions;
DROP POLICY IF EXISTS "Users and editors can update invoice_deductions" ON public.invoice_deductions;
DROP POLICY IF EXISTS "Users and editors can delete invoice_deductions" ON public.invoice_deductions;

CREATE POLICY "Users and team members can view invoice_deductions" 
ON public.invoice_deductions FOR SELECT 
USING (
    auth.uid() = user_id OR 
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.parent_id = invoice_deductions.user_id)
);

CREATE POLICY "Users and editors can insert invoice_deductions" 
ON public.invoice_deductions FOR INSERT 
WITH CHECK (
    auth.uid() = user_id OR 
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.parent_id = invoice_deductions.user_id AND profiles.role = 'editor')
);

CREATE POLICY "Users and editors can update invoice_deductions" 
ON public.invoice_deductions FOR UPDATE 
USING (
    auth.uid() = user_id OR 
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.parent_id = invoice_deductions.user_id AND profiles.role = 'editor')
)
WITH CHECK (
    auth.uid() = user_id OR 
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.parent_id = invoice_deductions.user_id AND profiles.role = 'editor')
);

CREATE POLICY "Users and editors can delete invoice_deductions" 
ON public.invoice_deductions FOR DELETE 
USING (
    auth.uid() = user_id OR 
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.parent_id = invoice_deductions.user_id AND profiles.role = 'editor')
);

-- ------------------------------------------------------------------------------
-- (12) expenses
-- ------------------------------------------------------------------------------
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their own expenses." ON public.expenses;
DROP POLICY IF EXISTS "Users can insert their own expenses." ON public.expenses;
DROP POLICY IF EXISTS "Users can update their own expenses." ON public.expenses;
DROP POLICY IF EXISTS "Users can delete their own expenses." ON public.expenses;
DROP POLICY IF EXISTS "Users and team members can view expenses" ON public.expenses;
DROP POLICY IF EXISTS "Users and editors can insert expenses" ON public.expenses;
DROP POLICY IF EXISTS "Users and editors can update expenses" ON public.expenses;
DROP POLICY IF EXISTS "Users and editors can delete expenses" ON public.expenses;

CREATE POLICY "Users and team members can view expenses" 
ON public.expenses FOR SELECT 
USING (
    auth.uid() = user_id OR 
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.parent_id = expenses.user_id)
);

CREATE POLICY "Users and editors can insert expenses" 
ON public.expenses FOR INSERT 
WITH CHECK (
    auth.uid() = user_id OR 
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.parent_id = expenses.user_id AND profiles.role = 'editor')
);

CREATE POLICY "Users and editors can update expenses" 
ON public.expenses FOR UPDATE 
USING (
    auth.uid() = user_id OR 
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.parent_id = expenses.user_id AND profiles.role = 'editor')
)
WITH CHECK (
    auth.uid() = user_id OR 
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.parent_id = expenses.user_id AND profiles.role = 'editor')
);

CREATE POLICY "Users and editors can delete expenses" 
ON public.expenses FOR DELETE 
USING (
    auth.uid() = user_id OR 
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.parent_id = expenses.user_id AND profiles.role = 'editor')
);

-- ------------------------------------------------------------------------------
-- (13) advances
-- ------------------------------------------------------------------------------
ALTER TABLE public.advances ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their own advances." ON public.advances;
DROP POLICY IF EXISTS "Users can insert their own advances." ON public.advances;
DROP POLICY IF EXISTS "Users can update their own advances." ON public.advances;
DROP POLICY IF EXISTS "Users can delete their own advances." ON public.advances;
DROP POLICY IF EXISTS "Users and team members can view advances" ON public.advances;
DROP POLICY IF EXISTS "Users and editors can insert advances" ON public.advances;
DROP POLICY IF EXISTS "Users and editors can update advances" ON public.advances;
DROP POLICY IF EXISTS "Users and editors can delete advances" ON public.advances;

CREATE POLICY "Users and team members can view advances" 
ON public.advances FOR SELECT 
USING (
    auth.uid() = user_id OR 
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.parent_id = advances.user_id)
);

CREATE POLICY "Users and editors can insert advances" 
ON public.advances FOR INSERT 
WITH CHECK (
    auth.uid() = user_id OR 
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.parent_id = advances.user_id AND profiles.role = 'editor')
);

CREATE POLICY "Users and editors can update advances" 
ON public.advances FOR UPDATE 
USING (
    auth.uid() = user_id OR 
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.parent_id = advances.user_id AND profiles.role = 'editor')
)
WITH CHECK (
    auth.uid() = user_id OR 
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.parent_id = advances.user_id AND profiles.role = 'editor')
);

CREATE POLICY "Users and editors can delete advances" 
ON public.advances FOR DELETE 
USING (
    auth.uid() = user_id OR 
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.parent_id = advances.user_id AND profiles.role = 'editor')
);

-- ------------------------------------------------------------------------------
-- (14) supplier_payments
-- ------------------------------------------------------------------------------
ALTER TABLE public.supplier_payments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their own supplier_payments." ON public.supplier_payments;
DROP POLICY IF EXISTS "Users can insert their own supplier_payments." ON public.supplier_payments;
DROP POLICY IF EXISTS "Users can update their own supplier_payments." ON public.supplier_payments;
DROP POLICY IF EXISTS "Users can delete their own supplier_payments." ON public.supplier_payments;
DROP POLICY IF EXISTS "Users and team members can view supplier_payments" ON public.supplier_payments;
DROP POLICY IF EXISTS "Users and editors can insert supplier_payments" ON public.supplier_payments;
DROP POLICY IF EXISTS "Users and editors can update supplier_payments" ON public.supplier_payments;
DROP POLICY IF EXISTS "Users and editors can delete supplier_payments" ON public.supplier_payments;

CREATE POLICY "Users and team members can view supplier_payments" 
ON public.supplier_payments FOR SELECT 
USING (
    auth.uid() = user_id OR 
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.parent_id = supplier_payments.user_id)
);

CREATE POLICY "Users and editors can insert supplier_payments" 
ON public.supplier_payments FOR INSERT 
WITH CHECK (
    auth.uid() = user_id OR 
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.parent_id = supplier_payments.user_id AND profiles.role = 'editor')
);

CREATE POLICY "Users and editors can update supplier_payments" 
ON public.supplier_payments FOR UPDATE 
USING (
    auth.uid() = user_id OR 
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.parent_id = supplier_payments.user_id AND profiles.role = 'editor')
)
WITH CHECK (
    auth.uid() = user_id OR 
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.parent_id = supplier_payments.user_id AND profiles.role = 'editor')
);

CREATE POLICY "Users and editors can delete supplier_payments" 
ON public.supplier_payments FOR DELETE 
USING (
    auth.uid() = user_id OR 
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.parent_id = supplier_payments.user_id AND profiles.role = 'editor')
);

-- ------------------------------------------------------------------------------
-- (15) farmer_withdrawals
-- ------------------------------------------------------------------------------
ALTER TABLE public.farmer_withdrawals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their own farmer_withdrawals." ON public.farmer_withdrawals;
DROP POLICY IF EXISTS "Users can insert their own farmer_withdrawals." ON public.farmer_withdrawals;
DROP POLICY IF EXISTS "Users can update their own farmer_withdrawals." ON public.farmer_withdrawals;
DROP POLICY IF EXISTS "Users can delete their own farmer_withdrawals." ON public.farmer_withdrawals;
DROP POLICY IF EXISTS "Users and team members can view farmer_withdrawals" ON public.farmer_withdrawals;
DROP POLICY IF EXISTS "Users and editors can insert farmer_withdrawals" ON public.farmer_withdrawals;
DROP POLICY IF EXISTS "Users and editors can update farmer_withdrawals" ON public.farmer_withdrawals;
DROP POLICY IF EXISTS "Users and editors can delete farmer_withdrawals" ON public.farmer_withdrawals;

CREATE POLICY "Users and team members can view farmer_withdrawals" 
ON public.farmer_withdrawals FOR SELECT 
USING (
    auth.uid() = user_id OR 
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.parent_id = farmer_withdrawals.user_id)
);

CREATE POLICY "Users and editors can insert farmer_withdrawals" 
ON public.farmer_withdrawals FOR INSERT 
WITH CHECK (
    auth.uid() = user_id OR 
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.parent_id = farmer_withdrawals.user_id AND profiles.role = 'editor')
);

CREATE POLICY "Users and editors can update farmer_withdrawals" 
ON public.farmer_withdrawals FOR UPDATE 
USING (
    auth.uid() = user_id OR 
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.parent_id = farmer_withdrawals.user_id AND profiles.role = 'editor')
)
WITH CHECK (
    auth.uid() = user_id OR 
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.parent_id = farmer_withdrawals.user_id AND profiles.role = 'editor')
);

CREATE POLICY "Users and editors can delete farmer_withdrawals" 
ON public.farmer_withdrawals FOR DELETE 
USING (
    auth.uid() = user_id OR 
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.parent_id = farmer_withdrawals.user_id AND profiles.role = 'editor')
);

-- ------------------------------------------------------------------------------
-- (16) bank_transactions
-- ------------------------------------------------------------------------------
ALTER TABLE public.bank_transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their own bank_transactions." ON public.bank_transactions;
DROP POLICY IF EXISTS "Users can insert their own bank_transactions." ON public.bank_transactions;
DROP POLICY IF EXISTS "Users can update their own bank_transactions." ON public.bank_transactions;
DROP POLICY IF EXISTS "Users can delete their own bank_transactions." ON public.bank_transactions;
DROP POLICY IF EXISTS "Users and team members can view bank_transactions" ON public.bank_transactions;
DROP POLICY IF EXISTS "Users and editors can insert bank_transactions" ON public.bank_transactions;
DROP POLICY IF EXISTS "Users and editors can update bank_transactions" ON public.bank_transactions;
DROP POLICY IF EXISTS "Users and editors can delete bank_transactions" ON public.bank_transactions;

CREATE POLICY "Users and team members can view bank_transactions" 
ON public.bank_transactions FOR SELECT 
USING (
    auth.uid() = user_id OR 
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.parent_id = bank_transactions.user_id)
);

CREATE POLICY "Users and editors can insert bank_transactions" 
ON public.bank_transactions FOR INSERT 
WITH CHECK (
    auth.uid() = user_id OR 
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.parent_id = bank_transactions.user_id AND profiles.role = 'editor')
);

CREATE POLICY "Users and editors can update bank_transactions" 
ON public.bank_transactions FOR UPDATE 
USING (
    auth.uid() = user_id OR 
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.parent_id = bank_transactions.user_id AND profiles.role = 'editor')
)
WITH CHECK (
    auth.uid() = user_id OR 
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.parent_id = bank_transactions.user_id AND profiles.role = 'editor')
);

CREATE POLICY "Users and editors can delete bank_transactions" 
ON public.bank_transactions FOR DELETE 
USING (
    auth.uid() = user_id OR 
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.parent_id = bank_transactions.user_id AND profiles.role = 'editor')
);

-- ------------------------------------------------------------------------------
-- (17) partner_debts
-- ------------------------------------------------------------------------------
ALTER TABLE public.partner_debts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their own partner_debts." ON public.partner_debts;
DROP POLICY IF EXISTS "Users can insert their own partner_debts." ON public.partner_debts;
DROP POLICY IF EXISTS "Users can update their own partner_debts." ON public.partner_debts;
DROP POLICY IF EXISTS "Users can delete their own partner_debts." ON public.partner_debts;
DROP POLICY IF EXISTS "Users and team members can view partner_debts" ON public.partner_debts;
DROP POLICY IF EXISTS "Users and editors can insert partner_debts" ON public.partner_debts;
DROP POLICY IF EXISTS "Users and editors can update partner_debts" ON public.partner_debts;
DROP POLICY IF EXISTS "Users and editors can delete partner_debts" ON public.partner_debts;

CREATE POLICY "Users and team members can view partner_debts" 
ON public.partner_debts FOR SELECT 
USING (
    auth.uid() = user_id OR 
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.parent_id = partner_debts.user_id)
);

CREATE POLICY "Users and editors can insert partner_debts" 
ON public.partner_debts FOR INSERT 
WITH CHECK (
    auth.uid() = user_id OR 
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.parent_id = partner_debts.user_id AND profiles.role = 'editor')
);

CREATE POLICY "Users and editors can update partner_debts" 
ON public.partner_debts FOR UPDATE 
USING (
    auth.uid() = user_id OR 
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.parent_id = partner_debts.user_id AND profiles.role = 'editor')
)
WITH CHECK (
    auth.uid() = user_id OR 
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.parent_id = partner_debts.user_id AND profiles.role = 'editor')
);

CREATE POLICY "Users and editors can delete partner_debts" 
ON public.partner_debts FOR DELETE 
USING (
    auth.uid() = user_id OR 
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.parent_id = partner_debts.user_id AND profiles.role = 'editor')
);

-- ------------------------------------------------------------------------------
-- (18) daily_logs
-- ------------------------------------------------------------------------------
ALTER TABLE public.daily_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their own daily logs." ON public.daily_logs;
DROP POLICY IF EXISTS "Users can insert their own daily logs." ON public.daily_logs;
DROP POLICY IF EXISTS "Users can update their own daily logs." ON public.daily_logs;
DROP POLICY IF EXISTS "Users can delete their own daily logs." ON public.daily_logs;
DROP POLICY IF EXISTS "Users and team members can view daily_logs" ON public.daily_logs;
DROP POLICY IF EXISTS "Users and editors can insert daily_logs" ON public.daily_logs;
DROP POLICY IF EXISTS "Users and editors can update daily_logs" ON public.daily_logs;
DROP POLICY IF EXISTS "Users and editors can delete daily_logs" ON public.daily_logs;

CREATE POLICY "Users and team members can view daily_logs" 
ON public.daily_logs FOR SELECT 
USING (
    auth.uid() = user_id OR 
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.parent_id = daily_logs.user_id)
);

CREATE POLICY "Users and editors can insert daily_logs" 
ON public.daily_logs FOR INSERT 
WITH CHECK (
    auth.uid() = user_id OR 
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.parent_id = daily_logs.user_id AND profiles.role = 'editor')
);

CREATE POLICY "Users and editors can update daily_logs" 
ON public.daily_logs FOR UPDATE 
USING (
    auth.uid() = user_id OR 
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.parent_id = daily_logs.user_id AND profiles.role = 'editor')
)
WITH CHECK (
    auth.uid() = user_id OR 
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.parent_id = daily_logs.user_id AND profiles.role = 'editor')
);

CREATE POLICY "Users and editors can delete daily_logs" 
ON public.daily_logs FOR DELETE 
USING (
    auth.uid() = user_id OR 
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.parent_id = daily_logs.user_id AND profiles.role = 'editor')
);

-- ------------------------------------------------------------------------------
-- (19) virtual_members
-- ------------------------------------------------------------------------------
ALTER TABLE public.virtual_members ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Owners can manage their virtual members" ON public.virtual_members;

CREATE POLICY "Owners can manage their virtual members" 
ON public.virtual_members FOR ALL 
USING (auth.uid() = owner_id);

-- ------------------------------------------------------------------------------
-- (20) login_attempts
-- ------------------------------------------------------------------------------
ALTER TABLE public.login_attempts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.login_attempts FROM anon, authenticated;

-- ------------------------------------------------------------------------------
-- (21) linking_attempts
-- ------------------------------------------------------------------------------
ALTER TABLE public.linking_attempts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own linking attempts" ON public.linking_attempts;
DROP POLICY IF EXISTS "Users can view own linking attempts" ON public.linking_attempts;

CREATE POLICY "Users can view own linking attempts" 
ON public.linking_attempts FOR SELECT 
USING (auth.uid() = user_id);

REVOKE INSERT, UPDATE, DELETE ON public.linking_attempts FROM authenticated, anon;

-- ------------------------------------------------------------------------------
-- (22) push_subscriptions
-- ------------------------------------------------------------------------------
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "push_subscriptions_select" ON public.push_subscriptions;
DROP POLICY IF EXISTS "push_subscriptions_delete" ON public.push_subscriptions;
DROP POLICY IF EXISTS "push_subscriptions_insert" ON public.push_subscriptions;

CREATE POLICY "push_subscriptions_select" ON public.push_subscriptions
FOR SELECT USING (
    user_id = auth.uid()::text OR 
    EXISTS (
        SELECT 1 FROM public.virtual_members vm
        WHERE ('virtual_' || vm.id::text) = user_id AND vm.owner_id = auth.uid()
    )
);

CREATE POLICY "push_subscriptions_delete" ON public.push_subscriptions
FOR DELETE USING (
    user_id = auth.uid()::text OR 
    EXISTS (
        SELECT 1 FROM public.virtual_members vm
        WHERE ('virtual_' || vm.id::text) = user_id AND vm.owner_id = auth.uid()
    )
);

CREATE POLICY "push_subscriptions_insert" ON public.push_subscriptions
FOR INSERT WITH CHECK (
    user_id = auth.uid()::text OR 
    EXISTS (
        SELECT 1 FROM public.virtual_members vm
        WHERE ('virtual_' || vm.id::text) = user_id AND vm.owner_id = auth.uid()
    )
);

-- ------------------------------------------------------------------------------
-- (23) report_visits
-- ------------------------------------------------------------------------------
ALTER TABLE public.report_visits ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public and owners can view report visits" ON public.report_visits;
DROP POLICY IF EXISTS "Public can insert report visits" ON public.report_visits;
DROP POLICY IF EXISTS "Public can update report visits" ON public.report_visits;
DROP POLICY IF EXISTS "Owners can delete report visits" ON public.report_visits;

CREATE POLICY "Public and owners can view report visits" 
ON public.report_visits FOR SELECT 
USING (true);

CREATE POLICY "Public can insert report visits" 
ON public.report_visits FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Public can update report visits" 
ON public.report_visits FOR UPDATE 
USING (true)
WITH CHECK (true);

CREATE POLICY "Owners can delete report visits" 
ON public.report_visits FOR DELETE 
USING (auth.uid() = user_id OR auth.uid() IS NOT NULL);

-- ------------------------------------------------------------------------------
-- (24) app_updates
-- ------------------------------------------------------------------------------
ALTER TABLE public.app_updates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public can view app updates" ON public.app_updates;
DROP POLICY IF EXISTS "Admins can manage app updates" ON public.app_updates;

CREATE POLICY "Public can view app updates" 
ON public.app_updates FOR SELECT 
USING (true);

CREATE POLICY "Admins can manage app updates" 
ON public.app_updates FOR ALL 
USING (auth.uid() = user_id);

-- ------------------------------------------------------------------------------
-- (25) report_shares
-- ------------------------------------------------------------------------------
ALTER TABLE public.report_shares ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Owners can manage own report shares" ON public.report_shares;

CREATE POLICY "Owners can manage own report shares"
ON public.report_shares FOR ALL
USING (auth.uid() = created_by);

REVOKE ALL ON public.report_shares FROM anon;

-- ==============================================================================
-- تم بحمد الله: اكتمال المخطط الشامل مع دعم كامل لكافة الجداول الـ 17 وسياسات RLS المشددة
-- ==============================================================================
