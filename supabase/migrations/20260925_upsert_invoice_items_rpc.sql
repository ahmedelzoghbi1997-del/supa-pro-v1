-- ==============================================================================
-- Migration: Atomic upsert_invoice_items RPC function
-- Date: 2026-09-25
-- Description:
--   Executes atomic deletion and insertion of invoice_price_items and invoice_deductions
--   in a single transaction with SECURITY DEFINER and strict ownership verification.
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
