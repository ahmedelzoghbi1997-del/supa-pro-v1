-- Migration: 20260926_add_push_subscriptions_table
-- Description: Creates the push_subscriptions table with RLS and specific access control policies.

CREATE TABLE IF NOT EXISTS public.push_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    endpoint TEXT NOT NULL,
    p256dh_key TEXT,
    auth_key TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 1. الفهارس
CREATE UNIQUE INDEX IF NOT EXISTS idx_push_subscriptions_endpoint ON public.push_subscriptions (endpoint);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id ON public.push_subscriptions (user_id);

-- 2. تفعيل RLS
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- 3. السياسات الأمنية
DROP POLICY IF EXISTS "push_subscriptions_select" ON public.push_subscriptions;
DROP POLICY IF EXISTS "push_subscriptions_delete" ON public.push_subscriptions;
DROP POLICY IF EXISTS "push_subscriptions_insert" ON public.push_subscriptions;

-- أ) سياسة القراءة (SELECT)
CREATE POLICY "push_subscriptions_select" ON public.push_subscriptions
FOR SELECT USING (
    user_id = auth.uid()::text OR 
    EXISTS (
        SELECT 1 FROM public.virtual_members vm
        WHERE ('virtual_' || vm.id::text) = user_id AND vm.owner_id = auth.uid()
    )
);

-- ب) سياسة الحذف (DELETE)
CREATE POLICY "push_subscriptions_delete" ON public.push_subscriptions
FOR DELETE USING (
    user_id = auth.uid()::text OR 
    EXISTS (
        SELECT 1 FROM public.virtual_members vm
        WHERE ('virtual_' || vm.id::text) = user_id AND vm.owner_id = auth.uid()
    )
);

-- ج) سياسة الإدراج (INSERT)
CREATE POLICY "push_subscriptions_insert" ON public.push_subscriptions
FOR INSERT WITH CHECK (
    user_id = auth.uid()::text OR 
    EXISTS (
        SELECT 1 FROM public.virtual_members vm
        WHERE ('virtual_' || vm.id::text) = user_id AND vm.owner_id = auth.uid()
    )
);
