-- ==============================================================================
-- ملف هجرة: نظام مشاركة التقارير الآمن عبر الرموز (Report Shares & RPC)
-- التاريخ: 2026-09-26
-- الوصف:
--   1. إنشاء جدول report_shares لحفظ روابط التقارير المشتركة بالرموز المشفرة وتاريخ الصلاحية وحالة الإلغاء.
--   2. تفعيل RLS على report_shares لمنع الوصول المباشر من المستخدمين العامين anon والمستخدمين الآخرين.
--   3. إنشاء دالة create_report_share لتمكين المالك والمحرر من توليد رمز مشاركة آمن (share_token).
--   4. إنشاء دالة get_shared_report لجلب البيانات المحددة للتقرير فقط بدون فتح صلاحيات RLS العامة.
--   5. الالتزام بـ SECURITY DEFINER مع تحديد SET search_path = public, pg_temp.
-- ==============================================================================

-- 1. جدول روابط مشاركة التقارير
CREATE TABLE IF NOT EXISTS public.report_shares (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cycle_id UUID NOT NULL REFERENCES public.cycles(id) ON DELETE CASCADE,
    share_token TEXT UNIQUE NOT NULL,
    created_by UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    expires_at TIMESTAMPTZ,
    is_revoked BOOLEAN DEFAULT false NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- فهارس التسريع
CREATE INDEX IF NOT EXISTS idx_report_shares_token ON public.report_shares (share_token);
CREATE INDEX IF NOT EXISTS idx_report_shares_cycle_id ON public.report_shares (cycle_id);

-- تفعيل RLS على جدول report_shares
ALTER TABLE public.report_shares ENABLE ROW LEVEL SECURITY;

-- سياسة الأمان: منع أي وصول مباشر من anon، والسماح للمنشئ بإدارة روابطه فقط
DROP POLICY IF EXISTS "Owners can manage own report shares" ON public.report_shares;
CREATE POLICY "Owners can manage own report shares"
ON public.report_shares FOR ALL
USING (auth.uid() = created_by);

-- إلغاء أي وصول مباشر من المستخدمين غير الموثقين
REVOKE ALL ON public.report_shares FROM anon;

-- ==============================================================================
-- 2. دالة إنشاء رابط مشاركة تقرير (create_report_share)
-- ==============================================================================
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

    -- التحقق من وجود العروة ومالكها
    SELECT user_id INTO v_owner_id
    FROM public.cycles
    WHERE id = p_cycle_id;

    IF v_owner_id IS NULL THEN
        RAISE EXCEPTION 'العروة المطلوبة غير موجودة';
    END IF;

    -- التحقق من الصلاحية: المالك المباشر أو عضو مرتبط بدور محرر أو مالك
    IF v_owner_id <> v_user_id AND NOT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = v_user_id
          AND parent_id = v_owner_id
          AND role IN ('editor', 'owner')
    ) THEN
        RAISE EXCEPTION 'غير مصرح: لا تملك صلاحية مشاركة هذا التقرير';
    END IF;

    -- فحص ما إذا كان هناك رابط نشط وساري بالفعل لنفس العروة (لتجنب التكرار غير المبرر)
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

    -- توليد رمز عشوائي مشفر آمن بطول 64 حرفاً
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

-- ==============================================================================
-- 3. دالة جلب بيانات التقرير المشترك بالرمز (get_shared_report)
-- ==============================================================================
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

    -- 1. التحقق من وجود الرمز وصلاحيته
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

    -- 2. جلب بيانات العروة المحددة فقط بحقولها الآمنة
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

    -- 3. اسم الأصل (الصوبة / المزرعة)
    SELECT a.name INTO v_asset_name
    FROM public.assets a
    WHERE a.id = v_cycle.asset_id;

    -- 4. إعدادات المالك (لعزل حسابات العمالة وتفعيل حساب المزارع)
    SELECT p.app_settings INTO v_owner_profile
    FROM public.profiles p
    WHERE p.id = v_cycle.user_id;

    -- 5. فواتير هذه العروة فقط
    SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'id', i.id,
        'user_id', i.user_id,
        'cycle_id', i.cycle_id,
        'description', i.description,
        'date', i.date,
        'market', i.market,
        'packaging_type', i.packaging_type,
        'packaging_count', i.packaging_count,
        'carton_count', i.carton_count,
        'cage_count', i.cage_count,
        'created_at', i.created_at
    )), '[]'::jsonb)
    INTO v_invoices
    FROM public.invoices i
    WHERE i.cycle_id = v_cycle.id;

    -- 6. بنود الأسعار والخصومات التابعة لفواتير هذه العروة فقط
    SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'id', ipi.id,
        'invoice_id', ipi.invoice_id,
        'quantity', ipi.quantity,
        'price_per_kg', ipi.price_per_kg,
        'packaging_count', ipi.packaging_count
    )), '[]'::jsonb)
    INTO v_price_items
    FROM public.invoice_price_items ipi
    WHERE ipi.invoice_id IN (SELECT i.id FROM public.invoices i WHERE i.cycle_id = v_cycle.id);

    SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'id', ided.id,
        'invoice_id', ided.invoice_id,
        'name', ided.name,
        'amount', ided.amount
    )), '[]'::jsonb)
    INTO v_deductions
    FROM public.invoice_deductions ided
    WHERE ided.invoice_id IN (SELECT i.id FROM public.invoices i WHERE i.cycle_id = v_cycle.id);

    -- 7. مصروفات هذه العروة فقط
    SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'id', e.id,
        'user_id', e.user_id,
        'cycle_id', e.cycle_id,
        'category_id', e.category_id,
        'description', e.description,
        'date', e.date,
        'amount', e.amount,
        'supplier_id', e.supplier_id,
        'payment_method', e.payment_method,
        'is_establishment', e.is_establishment,
        'shift_type', e.shift_type,
        'created_at', e.created_at
    )), '[]'::jsonb)
    INTO v_expenses
    FROM public.expenses e
    WHERE e.cycle_id = v_cycle.id;

    -- 8. فئات المصروفات
    SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'id', ec.id,
        'name', ec.name,
        'is_supplier_category', ec.is_supplier_category,
        'is_labor_category', ec.is_labor_category,
        'is_discount_category', ec.is_discount_category
    )), '[]'::jsonb)
    INTO v_categories
    FROM public.expense_categories ec
    WHERE ec.user_id = v_cycle.user_id;

    -- 9. مسحوبات المزارعين المرتبطة بهذه العروة
    SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'id', fw.id,
        'cycle_id', fw.cycle_id,
        'farmer_id', fw.farmer_id,
        'date', fw.date,
        'amount', fw.amount,
        'notes', fw.notes
    )), '[]'::jsonb)
    INTO v_withdrawals
    FROM public.farmer_withdrawals fw
    WHERE fw.cycle_id = v_cycle.id;

    -- 10. مدفوعات الموردين المرتبطة بهذه العروة
    SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'id', sp.id,
        'cycle_id', sp.cycle_id,
        'supplier_id', sp.supplier_id,
        'date', sp.date,
        'amount', sp.amount,
        'payment_method', sp.payment_method,
        'notes', sp.notes
    )), '[]'::jsonb)
    INTO v_supplier_payments
    FROM public.supplier_payments sp
    WHERE sp.cycle_id = v_cycle.id;

    -- 11. السلفيات المرتبطة بهذه العروة
    SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'id', adv.id,
        'cycle_id', adv.cycle_id,
        'person_id', adv.person_id,
        'date', adv.date,
        'amount', adv.amount,
        'notes', adv.notes
    )), '[]'::jsonb)
    INTO v_advances
    FROM public.advances adv
    WHERE adv.cycle_id = v_cycle.id;

    -- 12. الموردين والمزارعين والعمالة (فقط الأسماء والمعرفات)
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

    -- 13. الحسابات البنكية ومعاملاتها
    SELECT COALESCE(jsonb_agg(jsonb_build_object('id', ba.id, 'name', ba.name, 'balance', ba.balance)), '[]'::jsonb)
    INTO v_bank_accounts
    FROM public.bank_accounts ba
    WHERE ba.user_id = v_cycle.user_id;

    SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'id', bt.id,
        'account_id', bt.account_id,
        'date', bt.date,
        'amount', bt.amount,
        'type', bt.type,
        'description', bt.description
    )), '[]'::jsonb)
    INTO v_bank_transactions
    FROM public.bank_transactions bt
    WHERE bt.user_id = v_cycle.user_id;

    -- إرجاع كامل البيانات المجمعة والمفحوصة
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
