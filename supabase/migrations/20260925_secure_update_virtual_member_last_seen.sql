-- ==============================================================================
-- Migration: Secure update_virtual_member_last_seen Function
-- Date: 2026-09-25
-- Description:
--   1. Enforce that caller is authenticated and auth.uid() matches owner_id.
--   2. Raise exception 'غير مصرح' if unauthorized.
--   3. Revoke EXECUTE permissions from anon and restrict to authenticated and service_role.
-- ==============================================================================

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

-- إلغاء الصلاحيات من anon و PUBLIC
REVOKE ALL ON FUNCTION public.update_virtual_member_last_seen(UUID) FROM PUBLIC, anon;

-- منح الصلاحيات حصراً لـ authenticated و service_role
GRANT EXECUTE ON FUNCTION public.update_virtual_member_last_seen(UUID) TO authenticated, service_role;
