-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. جدول الملفات الشخصية (Profiles)
-- يحتوي على عمود app_settings لحفظ الإعدادات (الأسواق، بنود الخصم، الثيم، إلخ)
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade not null primary key,
  full_name text,
  status text default 'pending',
  role text default 'user',
  email text,
  subscription_type text,
  subscription_ends_at timestamp with time zone,
  app_settings jsonb, -- هنا يتم حفظ الأسواق وبنود الخصومات
  last_seen_at timestamp with time zone,
  push_token text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- تفعيل الحماية (RLS)
alter table public.profiles enable row level security;

-- سياسات الوصول (Policies)
create policy "Public profiles are viewable by everyone." on public.profiles for select using (true);
create policy "Users can insert their own profile." on public.profiles for insert with check (auth.uid() = id);
create policy "Users can update own profile." on public.profiles for update using (auth.uid() = id);

-- 2. جدول فئات المصروفات (Expense Categories)
-- يتم حفظ فئات المصروفات هنا بشكل منفصل
create table if not exists public.expense_categories (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  name text not null,
  is_supplier_category boolean default false,
  is_labor_category boolean default false,
  is_discount_category boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- تفعيل الحماية (RLS)
alter table public.expense_categories enable row level security;

-- سياسات الوصول
create policy "Users can view their own expense categories." on public.expense_categories for select using (auth.uid() = user_id);
create policy "Users can insert their own expense categories." on public.expense_categories for insert with check (auth.uid() = user_id);
create policy "Users can update their own expense categories." on public.expense_categories for update using (auth.uid() = user_id);
create policy "Users can delete their own expense categories." on public.expense_categories for delete using (auth.uid() = user_id);

-- Enable pgcrypto extension for password hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Virtual members table for employee logins
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

-- Trigger function to automatically hash passwords before insert or update
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

-- Enable RLS for virtual_members
ALTER TABLE public.virtual_members ENABLE ROW LEVEL SECURITY;

-- Owner can see and manage their virtual members
CREATE POLICY "Owners can manage their virtual members" ON public.virtual_members
FOR ALL USING (auth.uid() = owner_id);

-- 2.5 Failed Login Attempts Tracking
CREATE TABLE IF NOT EXISTS public.login_attempts (
    id BIGSERIAL PRIMARY KEY,
    username TEXT NOT NULL,
    attempted_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_login_attempts_username_time 
ON public.login_attempts (username, attempted_at DESC);

ALTER TABLE public.login_attempts ENABLE ROW LEVEL SECURITY;

-- 3. Functions for virtual members
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

GRANT EXECUTE ON FUNCTION public.virtual_login(TEXT, TEXT) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.update_virtual_member_last_seen(member_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE public.virtual_members
    SET last_seen = NOW()
    WHERE id = member_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Daily Logs (السجل اليومي)
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

-- 5. تحديثات لاحقة لقاعدة البيانات (Schema Updates)
-- إضافة عمود وردية العمل لجدول المصروفات (للتمييز بين اليوميات الصباحية والمسائية ويوم كامل)
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS shift_type TEXT DEFAULT NULL;

-- 6. الربط بحساب مالك وكود الربط الآمن (Linking Code & Expiry & Rate Limiting)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS linking_code_expires_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_profiles_linking_code ON public.profiles (linking_code);

CREATE TABLE IF NOT EXISTS public.linking_attempts (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL,
    attempted_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_linking_attempts_user_time ON public.linking_attempts (user_id, attempted_at DESC);
ALTER TABLE public.linking_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own linking attempts" 
ON public.linking_attempts FOR ALL 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

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
    WHERE UPPER(linking_code) = v_clean_code
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.link_account_to_owner(TEXT) TO authenticated;

