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
BEGIN
    RETURN QUERY
    SELECT vm.id, vm.owner_id, vm.username, vm.full_name, vm.role
    FROM public.virtual_members vm
    WHERE vm.username = p_username 
      AND vm.password = crypt(p_password, vm.password)
    LIMIT 1;
    
    -- Update last seen upon successful login
    IF FOUND THEN
        UPDATE public.virtual_members 
        SET last_seen = NOW()
        WHERE virtual_members.username = p_username;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

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

