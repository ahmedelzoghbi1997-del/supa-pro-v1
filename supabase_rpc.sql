CREATE OR REPLACE FUNCTION public.get_financial_totals(p_user_id uuid)
RETURNS jsonb AS $$
DECLARE
    result jsonb;
BEGIN
    WITH cycle_stats AS (
        SELECT 
            c.id,
            c.name,
            COALESCE((
                SELECT SUM(ipi.quantity * ipi.price_per_kg)
                FROM public.invoices i
                JOIN public.invoice_price_items ipi ON ipi.invoice_id = i.id
                WHERE i.cycle_id = c.id AND (i.market IS NULL OR (i.market != 'رصيد منقول' AND i.market != 'تمويل يدوي'))
            ), 0) - 
            COALESCE((
                SELECT SUM(ided.amount)
                FROM public.invoices i
                JOIN public.invoice_deductions ided ON ided.invoice_id = i.id
                WHERE i.cycle_id = c.id AND (i.market IS NULL OR (i.market != 'رصيد منقول' AND i.market != 'تمويل يدوي'))
            ), 0) AS revenue,
            
            COALESCE((SELECT SUM(e.amount) FROM public.expenses e WHERE e.cycle_id = c.id), 0) AS total_expenses,
            COALESCE((SELECT SUM(e.amount) FROM public.expenses e WHERE e.cycle_id = c.id AND e.payment_method = 'cash' AND e.is_establishment = false), 0) AS operating_expenses,
            COALESCE((SELECT SUM(a.amount) FROM public.advances a WHERE a.cycle_id = c.id), 0) AS advances,
            COALESCE((SELECT SUM(w.amount) FROM public.farmer_withdrawals w WHERE w.cycle_id = c.id), 0) AS farmer_withdrawals,
            COALESCE((SELECT SUM(p.amount) FROM public.supplier_payments p WHERE p.cycle_id = c.id), 0) AS supplier_payments,
            COALESCE((SELECT SUM(t.amount) FROM public.bank_transactions t WHERE t.cycle_id = c.id AND t.type = 'withdrawal'), 0) AS bank_withdrawals,
            COALESCE((SELECT SUM(t.amount) FROM public.bank_transactions t WHERE t.cycle_id = c.id AND t.type = 'deposit'), 0) AS bank_deposits,
            c.farmer_share_percentage
        FROM public.cycles c
        WHERE c.user_id = p_user_id AND c.status = 'active'
    ),
    bank_stats AS (
        SELECT 
            ba.id,
            ba.name,
            ba.initial_balance,
            COALESCE((SELECT SUM(t.amount) FROM public.bank_transactions t WHERE t.account_id = ba.id AND t.type = 'deposit'), 0) AS total_deposits,
            COALESCE((SELECT SUM(t.amount) FROM public.bank_transactions t WHERE t.account_id = ba.id AND t.type = 'withdrawal'), 0) AS total_withdrawals
        FROM public.bank_accounts ba
        WHERE ba.user_id = p_user_id
    )
    SELECT jsonb_build_object(
        'cycles', (SELECT COALESCE(jsonb_agg(row_to_json(cs)), '[]'::jsonb) FROM cycle_stats cs),
        'bank_accounts', (SELECT COALESCE(jsonb_agg(row_to_json(bs)), '[]'::jsonb) FROM bank_stats bs)
    ) INTO result;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
