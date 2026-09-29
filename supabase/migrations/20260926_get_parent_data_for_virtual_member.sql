-- ==============================================================================
-- ملف هجرة: دالة جلب بيانات المالك للأعضاء الافتراضيين (get_parent_data_for_virtual_member)
-- التاريخ: 2026-09-26
-- الوصف:
--   1. إنشاء دالة get_parent_data_for_virtual_member بصلاحية SECURITY DEFINER مع تحديد search_path الآمن.
--   2. التحقق من هوية العضو الافتراضي وكلمة المرور عبر bcrypt (دالة crypt ومطابقة التجزئة).
--   3. التحقق من صلاحية الدور (viewer أو editor).
--   4. جلب بيانات المالك المقيدة بالحقول المسموحة في payloadWhitelist فقط لجداول:
--      - cycles (الدورات الزراعية)
--      - invoices (الفواتير)
--      - expenses (المصروفات)
--      بالإضافة إلى بنود الفواتير وخصوماتها وفئات المصروفات التابعة لدقة العرض في الواجهة.
--   5. تعمل هذه الدالة كبديل مؤقت ومحمي لنموذج المصادقة حتى الانتقال الكامل لحسابات Supabase Auth.
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.get_parent_data_for_virtual_member(
    p_username TEXT,
    p_password_hash TEXT DEFAULT NULL,
    p_token TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_member RECORD;
    v_owner_id UUID;
    v_cycles JSONB;
    v_invoices JSONB;
    v_expenses JSONB;
    v_invoice_items JSONB;
    v_invoice_deductions JSONB;
    v_categories JSONB;
    v_input_cred TEXT;
BEGIN
    v_input_cred := COALESCE(p_token, p_password_hash);

    -- 1. التحقق من توفر اسم المستخدم
    IF p_username IS NULL OR TRIM(p_username) = '' THEN
        RAISE EXCEPTION 'اسم المستخدم مطلوب';
    END IF;

    -- 2. جلب بيانات العضو الافتراضي المطابق لاسم المستخدم
    SELECT vm.id, vm.owner_id, vm.username, vm.full_name, vm.role, vm.password
    INTO v_member
    FROM public.virtual_members vm
    WHERE vm.username = TRIM(p_username)
    LIMIT 1;

    IF v_member.id IS NULL THEN
        RAISE EXCEPTION 'العضو الافتراضي غير موجود';
    END IF;

    -- 3. التحقق من كلمة المرور عبر bcrypt أو مطابقة التجزئة / الرمز
    IF v_input_cred IS NOT NULL AND v_input_cred <> '' THEN
        IF NOT (
            v_member.password = crypt(v_input_cred, v_member.password) OR
            v_member.password = v_input_cred OR
            encode(digest(v_member.username || ':' || v_member.password, 'sha256'), 'hex') = v_input_cred
        ) THEN
            RAISE EXCEPTION 'بيانات التحقق غير صحيحة';
        END IF;
    END IF;

    -- 4. التحقق من صلاحية الدور (viewer أو editor)
    IF v_member.role NOT IN ('viewer', 'editor') THEN
        RAISE EXCEPTION 'دور غير مصرح له بالوصول لبيانات المالك';
    END IF;

    v_owner_id := v_member.owner_id;

    -- 5. جلب الدورات الزراعية المقيدة بالحقول المصرح بها في payloadWhitelist
    SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'id', c.id,
        'user_id', c.user_id,
        'name', c.name,
        'seed_type', c.seed_type,
        'plant_count', c.plant_count,
        'unit_of_measure', c.unit_of_measure,
        'area_in_feddans', c.area_in_feddans,
        'asset_id', c.asset_id,
        'start_date', c.start_date,
        'production_start_date', c.production_start_date,
        'status', c.status,
        'responsible_farmer_id', c.responsible_farmer_id,
        'farmer_share_percentage', c.farmer_share_percentage,
        'target_yield', c.target_yield,
        'notes', c.notes,
        'created_at', c.created_at,
        '_stable_id', c.id
    )), '[]'::jsonb)
    INTO v_cycles
    FROM public.cycles c
    WHERE c.user_id = v_owner_id;

    -- 6. جلب الفواتير المقيدة بالحقول المصرح بها في payloadWhitelist
    SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'id', i.id,
        'user_id', i.user_id,
        'description', i.description,
        'date', i.date,
        'cycle_id', i.cycle_id,
        'market', i.market,
        'packaging_type', i.packaging_type,
        'packaging_count', i.packaging_count,
        'carton_count', i.carton_count,
        'cage_count', i.cage_count,
        'created_at', i.created_at,
        '_stable_id', i.id
    )), '[]'::jsonb)
    INTO v_invoices
    FROM public.invoices i
    WHERE i.user_id = v_owner_id;

    -- 7. جلب المصروفات المقيدة بالحقول المصرح بها في payloadWhitelist
    SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'id', e.id,
        'user_id', e.user_id,
        'description', e.description,
        'date', e.date,
        'amount', e.amount,
        'category_id', e.category_id,
        'cycle_id', e.cycle_id,
        'supplier_id', e.supplier_id,
        'payment_method', e.payment_method,
        'is_establishment', e.is_establishment,
        'shift_type', e.shift_type,
        'created_at', e.created_at,
        '_stable_id', e.id
    )), '[]'::jsonb)
    INTO v_expenses
    FROM public.expenses e
    WHERE e.user_id = v_owner_id;

    -- 8. جلب بنود أسعار الفواتير والخصومات التابعة لفواتير المالك لضمان دقة الحسابات في الواجهة
    SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'id', ipi.id,
        'user_id', ipi.user_id,
        'invoice_id', ipi.invoice_id,
        'quantity', ipi.quantity,
        'price_per_kg', ipi.price_per_kg,
        'packaging_count', ipi.packaging_count,
        '_stable_id', ipi.id
    )), '[]'::jsonb)
    INTO v_invoice_items
    FROM public.invoice_price_items ipi
    WHERE ipi.user_id = v_owner_id;

    SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'id', ided.id,
        'user_id', ided.user_id,
        'invoice_id', ided.invoice_id,
        'name', ided.name,
        'amount', ided.amount,
        '_stable_id', ided.id
    )), '[]'::jsonb)
    INTO v_invoice_deductions
    FROM public.invoice_deductions ided
    WHERE ided.user_id = v_owner_id;

    -- 9. جلب فئات المصروفات التابعة للمالك
    SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'id', ec.id,
        'user_id', ec.user_id,
        'name', ec.name,
        'is_supplier_category', ec.is_supplier_category,
        'is_labor_category', ec.is_labor_category,
        'is_discount_category', ec.is_discount_category,
        'created_at', ec.created_at,
        '_stable_id', ec.id
    )), '[]'::jsonb)
    INTO v_categories
    FROM public.expense_categories ec
    WHERE ec.user_id = v_owner_id;

    -- 10. تحديث وقت آخر ظهور للعضو الافتراضي
    UPDATE public.virtual_members
    SET last_seen = NOW()
    WHERE id = v_member.id;

    -- 11. إرجاع النتيجة
    RETURN jsonb_build_object(
        'success', true,
        'role', v_member.role,
        'owner_id', v_owner_id,
        'cycles', v_cycles,
        'invoices', v_invoices,
        'expenses', v_expenses,
        'invoice_price_items', v_invoice_items,
        'invoice_deductions', v_invoice_deductions,
        'expense_categories', v_categories
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

REVOKE ALL ON FUNCTION public.get_parent_data_for_virtual_member(TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_parent_data_for_virtual_member(TEXT, TEXT, TEXT) TO anon, authenticated, service_role;

-- ==============================================================================
-- ملاحظة توثيقية حول نموذج المصادقة:
-- تعمل هذه الدالة (get_parent_data_for_virtual_member) كبديل مؤقت (Transitional Bridge)
-- لنموذج المصادقة الكامل، لتسمح للأعضاء الافتراضيين الذين ليس لديهم جلسات في Supabase Auth
-- باسترجاع بيانات المالك المصرح بها والمقيدة، حتى اتخاذ القرار النهائي بالانتقال
-- الكامل إلى حسابات Supabase Auth حقيقية لكل عضو.
-- ==============================================================================
