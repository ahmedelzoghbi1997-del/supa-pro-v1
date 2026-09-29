-- ==============================================================================
-- ملف هجرة: سياسات أمان RLS لأعضاء الفريق المرتبطين (Team Members RLS Policies)
-- التاريخ: 2026-09-26
-- الوصف:
--   1. تمكين الأعضاء المرتبطين بحساب المالك (parent_id) من قراءة بيانات المالك (SELECT).
--   2. تمكين الأعضاء أصحاب دور محرر (role = 'editor') من إضافة وتعديل وحذف البيانات (INSERT, UPDATE, DELETE).
--   3. قصر صلاحيات الأعضاء أصحاب دور مطلع/مشاهد (role = 'viewer') على القراءة فقط.
--   4. شمول الجداول الأساسية (cycles, invoices, expenses, daily_logs, persons, advances, suppliers, farmers)
--      بالإضافة إلى الجداول التابعة المكملة (invoice_price_items, invoice_deductions, expense_categories,
--      supplier_payments, farmer_withdrawals, partner_debts, bank_accounts, bank_transactions, assets).
--   5. تحديث دالة upsert_invoice_items للسماح للمحررين بحفظ بنود الفواتير مع تحديد search_path الآمن.
-- ==============================================================================

-- ==============================================================================
-- (1) سياسة قراءة ملف المالك الشخصي للأعضاء المرتبطين (Profiles)
-- ==============================================================================
DROP POLICY IF EXISTS "Members can view their owner profile" ON public.profiles;
CREATE POLICY "Members can view their owner profile"
ON public.profiles FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid()
          AND p.parent_id = profiles.id
    )
);

-- ==============================================================================
-- (2) جدول الدورات الزراعية (cycles)
-- ==============================================================================
ALTER TABLE public.cycles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own cycles." ON public.cycles;
DROP POLICY IF EXISTS "Users can insert their own cycles." ON public.cycles;
DROP POLICY IF EXISTS "Users can update their own cycles." ON public.cycles;
DROP POLICY IF EXISTS "Users can delete their own cycles." ON public.cycles;
DROP POLICY IF EXISTS "Users and team members can view cycles" ON public.cycles;
DROP POLICY IF EXISTS "Users and editors can insert cycles" ON public.cycles;
DROP POLICY IF EXISTS "Users and editors can update cycles" ON public.cycles;
DROP POLICY IF EXISTS "Users and editors can delete cycles" ON public.cycles;

-- قراءة الدورات: المالك + أي عضو مرتبط (viewer / editor / partner)
CREATE POLICY "Users and team members can view cycles" 
ON public.cycles FOR SELECT 
USING (
    auth.uid() = user_id OR 
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() 
          AND profiles.parent_id = cycles.user_id
    )
);

-- إضافة الدورات: المالك + المحرر (editor)
CREATE POLICY "Users and editors can insert cycles" 
ON public.cycles FOR INSERT 
WITH CHECK (
    auth.uid() = user_id OR 
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() 
          AND profiles.parent_id = cycles.user_id 
          AND profiles.role = 'editor'
    )
);

-- تعديل الدورات: المالك + المحرر (editor)
CREATE POLICY "Users and editors can update cycles" 
ON public.cycles FOR UPDATE 
USING (
    auth.uid() = user_id OR 
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() 
          AND profiles.parent_id = cycles.user_id 
          AND profiles.role = 'editor'
    )
)
WITH CHECK (
    auth.uid() = user_id OR 
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() 
          AND profiles.parent_id = cycles.user_id 
          AND profiles.role = 'editor'
    )
);

-- حذف الدورات: المالك + المحرر (editor)
CREATE POLICY "Users and editors can delete cycles" 
ON public.cycles FOR DELETE 
USING (
    auth.uid() = user_id OR 
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() 
          AND profiles.parent_id = cycles.user_id 
          AND profiles.role = 'editor'
    )
);

-- ==============================================================================
-- (3) جدول الفواتير (invoices)
-- ==============================================================================
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own invoices." ON public.invoices;
DROP POLICY IF EXISTS "Users can insert their own invoices." ON public.invoices;
DROP POLICY IF EXISTS "Users can update their own invoices." ON public.invoices;
DROP POLICY IF EXISTS "Users can delete their own invoices." ON public.invoices;
DROP POLICY IF EXISTS "Users and team members can view invoices" ON public.invoices;
DROP POLICY IF EXISTS "Users and editors can insert invoices" ON public.invoices;
DROP POLICY IF EXISTS "Users and editors can update invoices" ON public.invoices;
DROP POLICY IF EXISTS "Users and editors can delete invoices" ON public.invoices;

-- قراءة الفواتير: المالك + أي عضو مرتبط
CREATE POLICY "Users and team members can view invoices" 
ON public.invoices FOR SELECT 
USING (
    auth.uid() = user_id OR 
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() 
          AND profiles.parent_id = invoices.user_id
    )
);

-- إضافة الفواتير: المالك + المحرر
CREATE POLICY "Users and editors can insert invoices" 
ON public.invoices FOR INSERT 
WITH CHECK (
    auth.uid() = user_id OR 
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() 
          AND profiles.parent_id = invoices.user_id 
          AND profiles.role = 'editor'
    )
);

-- تعديل الفواتير: المالك + المحرر
CREATE POLICY "Users and editors can update invoices" 
ON public.invoices FOR UPDATE 
USING (
    auth.uid() = user_id OR 
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() 
          AND profiles.parent_id = invoices.user_id 
          AND profiles.role = 'editor'
    )
)
WITH CHECK (
    auth.uid() = user_id OR 
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() 
          AND profiles.parent_id = invoices.user_id 
          AND profiles.role = 'editor'
    )
);

-- حذف الفواتير: المالك + المحرر
CREATE POLICY "Users and editors can delete invoices" 
ON public.invoices FOR DELETE 
USING (
    auth.uid() = user_id OR 
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() 
          AND profiles.parent_id = invoices.user_id 
          AND profiles.role = 'editor'
    )
);

-- ==============================================================================
-- (4) جدول المصروفات (expenses)
-- ==============================================================================
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own expenses." ON public.expenses;
DROP POLICY IF EXISTS "Users can insert their own expenses." ON public.expenses;
DROP POLICY IF EXISTS "Users can update their own expenses." ON public.expenses;
DROP POLICY IF EXISTS "Users can delete their own expenses." ON public.expenses;
DROP POLICY IF EXISTS "Users and team members can view expenses" ON public.expenses;
DROP POLICY IF EXISTS "Users and editors can insert expenses" ON public.expenses;
DROP POLICY IF EXISTS "Users and editors can update expenses" ON public.expenses;
DROP POLICY IF EXISTS "Users and editors can delete expenses" ON public.expenses;

-- قراءة المصروفات: المالك + أي عضو مرتبط
CREATE POLICY "Users and team members can view expenses" 
ON public.expenses FOR SELECT 
USING (
    auth.uid() = user_id OR 
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() 
          AND profiles.parent_id = expenses.user_id
    )
);

-- إضافة المصروفات: المالك + المحرر
CREATE POLICY "Users and editors can insert expenses" 
ON public.expenses FOR INSERT 
WITH CHECK (
    auth.uid() = user_id OR 
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() 
          AND profiles.parent_id = expenses.user_id 
          AND profiles.role = 'editor'
    )
);

-- تعديل المصروفات: المالك + المحرر
CREATE POLICY "Users and editors can update expenses" 
ON public.expenses FOR UPDATE 
USING (
    auth.uid() = user_id OR 
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() 
          AND profiles.parent_id = expenses.user_id 
          AND profiles.role = 'editor'
    )
)
WITH CHECK (
    auth.uid() = user_id OR 
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() 
          AND profiles.parent_id = expenses.user_id 
          AND profiles.role = 'editor'
    )
);

-- حذف المصروفات: المالك + المحرر
CREATE POLICY "Users and editors can delete expenses" 
ON public.expenses FOR DELETE 
USING (
    auth.uid() = user_id OR 
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() 
          AND profiles.parent_id = expenses.user_id 
          AND profiles.role = 'editor'
    )
);

-- ==============================================================================
-- (5) جدول السجل اليومي (daily_logs)
-- ==============================================================================
ALTER TABLE public.daily_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own daily logs." ON public.daily_logs;
DROP POLICY IF EXISTS "Users can insert their own daily logs." ON public.daily_logs;
DROP POLICY IF EXISTS "Users can update their own daily logs." ON public.daily_logs;
DROP POLICY IF EXISTS "Users can delete their own daily logs." ON public.daily_logs;
DROP POLICY IF EXISTS "Users and team members can view daily_logs" ON public.daily_logs;
DROP POLICY IF EXISTS "Users and editors can insert daily_logs" ON public.daily_logs;
DROP POLICY IF EXISTS "Users and editors can update daily_logs" ON public.daily_logs;
DROP POLICY IF EXISTS "Users and editors can delete daily_logs" ON public.daily_logs;

-- قراءة السجل اليومي: المالك + أي عضو مرتبط
CREATE POLICY "Users and team members can view daily_logs" 
ON public.daily_logs FOR SELECT 
USING (
    auth.uid() = user_id OR 
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() 
          AND profiles.parent_id = daily_logs.user_id
    )
);

-- إضافة السجل اليومي: المالك + المحرر
CREATE POLICY "Users and editors can insert daily_logs" 
ON public.daily_logs FOR INSERT 
WITH CHECK (
    auth.uid() = user_id OR 
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() 
          AND profiles.parent_id = daily_logs.user_id 
          AND profiles.role = 'editor'
    )
);

-- تعديل السجل اليومي: المالك + المحرر
CREATE POLICY "Users and editors can update daily_logs" 
ON public.daily_logs FOR UPDATE 
USING (
    auth.uid() = user_id OR 
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() 
          AND profiles.parent_id = daily_logs.user_id 
          AND profiles.role = 'editor'
    )
)
WITH CHECK (
    auth.uid() = user_id OR 
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() 
          AND profiles.parent_id = daily_logs.user_id 
          AND profiles.role = 'editor'
    )
);

-- حذف السجل اليومي: المالك + المحرر
CREATE POLICY "Users and editors can delete daily_logs" 
ON public.daily_logs FOR DELETE 
USING (
    auth.uid() = user_id OR 
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() 
          AND profiles.parent_id = daily_logs.user_id 
          AND profiles.role = 'editor'
    )
);

-- ==============================================================================
-- (6) جدول الأشخاص والعمالة (persons)
-- ==============================================================================
ALTER TABLE public.persons ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own persons." ON public.persons;
DROP POLICY IF EXISTS "Users can insert their own persons." ON public.persons;
DROP POLICY IF EXISTS "Users can update their own persons." ON public.persons;
DROP POLICY IF EXISTS "Users can delete their own persons." ON public.persons;
DROP POLICY IF EXISTS "Users and team members can view persons" ON public.persons;
DROP POLICY IF EXISTS "Users and editors can insert persons" ON public.persons;
DROP POLICY IF EXISTS "Users and editors can update persons" ON public.persons;
DROP POLICY IF EXISTS "Users and editors can delete persons" ON public.persons;

-- قراءة الأشخاص: المالك + أي عضو مرتبط
CREATE POLICY "Users and team members can view persons" 
ON public.persons FOR SELECT 
USING (
    auth.uid() = user_id OR 
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() 
          AND profiles.parent_id = persons.user_id
    )
);

-- إضافة الأشخاص: المالك + المحرر
CREATE POLICY "Users and editors can insert persons" 
ON public.persons FOR INSERT 
WITH CHECK (
    auth.uid() = user_id OR 
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() 
          AND profiles.parent_id = persons.user_id 
          AND profiles.role = 'editor'
    )
);

-- تعديل الأشخاص: المالك + المحرر
CREATE POLICY "Users and editors can update persons" 
ON public.persons FOR UPDATE 
USING (
    auth.uid() = user_id OR 
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() 
          AND profiles.parent_id = persons.user_id 
          AND profiles.role = 'editor'
    )
)
WITH CHECK (
    auth.uid() = user_id OR 
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() 
          AND profiles.parent_id = persons.user_id 
          AND profiles.role = 'editor'
    )
);

-- حذف الأشخاص: المالك + المحرر
CREATE POLICY "Users and editors can delete persons" 
ON public.persons FOR DELETE 
USING (
    auth.uid() = user_id OR 
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() 
          AND profiles.parent_id = persons.user_id 
          AND profiles.role = 'editor'
    )
);

-- ==============================================================================
-- (7) جدول السلفيات (advances)
-- ==============================================================================
ALTER TABLE public.advances ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own advances." ON public.advances;
DROP POLICY IF EXISTS "Users can insert their own advances." ON public.advances;
DROP POLICY IF EXISTS "Users can update their own advances." ON public.advances;
DROP POLICY IF EXISTS "Users can delete their own advances." ON public.advances;
DROP POLICY IF EXISTS "Users and team members can view advances" ON public.advances;
DROP POLICY IF EXISTS "Users and editors can insert advances" ON public.advances;
DROP POLICY IF EXISTS "Users and editors can update advances" ON public.advances;
DROP POLICY IF EXISTS "Users and editors can delete advances" ON public.advances;

-- قراءة السلفيات: المالك + أي عضو مرتبط
CREATE POLICY "Users and team members can view advances" 
ON public.advances FOR SELECT 
USING (
    auth.uid() = user_id OR 
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() 
          AND profiles.parent_id = advances.user_id
    )
);

-- إضافة السلفيات: المالك + المحرر
CREATE POLICY "Users and editors can insert advances" 
ON public.advances FOR INSERT 
WITH CHECK (
    auth.uid() = user_id OR 
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() 
          AND profiles.parent_id = advances.user_id 
          AND profiles.role = 'editor'
    )
);

-- تعديل السلفيات: المالك + المحرر
CREATE POLICY "Users and editors can update advances" 
ON public.advances FOR UPDATE 
USING (
    auth.uid() = user_id OR 
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() 
          AND profiles.parent_id = advances.user_id 
          AND profiles.role = 'editor'
    )
)
WITH CHECK (
    auth.uid() = user_id OR 
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() 
          AND profiles.parent_id = advances.user_id 
          AND profiles.role = 'editor'
    )
);

-- حذف السلفيات: المالك + المحرر
CREATE POLICY "Users and editors can delete advances" 
ON public.advances FOR DELETE 
USING (
    auth.uid() = user_id OR 
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() 
          AND profiles.parent_id = advances.user_id 
          AND profiles.role = 'editor'
    )
);

-- ==============================================================================
-- (8) جدول الموردين (suppliers)
-- ==============================================================================
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own suppliers." ON public.suppliers;
DROP POLICY IF EXISTS "Users can insert their own suppliers." ON public.suppliers;
DROP POLICY IF EXISTS "Users can update their own suppliers." ON public.suppliers;
DROP POLICY IF EXISTS "Users can delete their own suppliers." ON public.suppliers;
DROP POLICY IF EXISTS "Users and team members can view suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "Users and editors can insert suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "Users and editors can update suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "Users and editors can delete suppliers" ON public.suppliers;

-- قراءة الموردين: المالك + أي عضو مرتبط
CREATE POLICY "Users and team members can view suppliers" 
ON public.suppliers FOR SELECT 
USING (
    auth.uid() = user_id OR 
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() 
          AND profiles.parent_id = suppliers.user_id
    )
);

-- إضافة الموردين: المالك + المحرر
CREATE POLICY "Users and editors can insert suppliers" 
ON public.suppliers FOR INSERT 
WITH CHECK (
    auth.uid() = user_id OR 
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() 
          AND profiles.parent_id = suppliers.user_id 
          AND profiles.role = 'editor'
    )
);

-- تعديل الموردين: المالك + المحرر
CREATE POLICY "Users and editors can update suppliers" 
ON public.suppliers FOR UPDATE 
USING (
    auth.uid() = user_id OR 
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() 
          AND profiles.parent_id = suppliers.user_id 
          AND profiles.role = 'editor'
    )
)
WITH CHECK (
    auth.uid() = user_id OR 
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() 
          AND profiles.parent_id = suppliers.user_id 
          AND profiles.role = 'editor'
    )
);

-- حذف الموردين: المالك + المحرر
CREATE POLICY "Users and editors can delete suppliers" 
ON public.suppliers FOR DELETE 
USING (
    auth.uid() = user_id OR 
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() 
          AND profiles.parent_id = suppliers.user_id 
          AND profiles.role = 'editor'
    )
);

-- ==============================================================================
-- (9) جدول المزارعين (farmers)
-- ==============================================================================
ALTER TABLE public.farmers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own farmers." ON public.farmers;
DROP POLICY IF EXISTS "Users can insert their own farmers." ON public.farmers;
DROP POLICY IF EXISTS "Users can update their own farmers." ON public.farmers;
DROP POLICY IF EXISTS "Users can delete their own farmers." ON public.farmers;
DROP POLICY IF EXISTS "Users and team members can view farmers" ON public.farmers;
DROP POLICY IF EXISTS "Users and editors can insert farmers" ON public.farmers;
DROP POLICY IF EXISTS "Users and editors can update farmers" ON public.farmers;
DROP POLICY IF EXISTS "Users and editors can delete farmers" ON public.farmers;

-- قراءة المزارعين: المالك + أي عضو مرتبط
CREATE POLICY "Users and team members can view farmers" 
ON public.farmers FOR SELECT 
USING (
    auth.uid() = user_id OR 
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() 
          AND profiles.parent_id = farmers.user_id
    )
);

-- إضافة المزارعين: المالك + المحرر
CREATE POLICY "Users and editors can insert farmers" 
ON public.farmers FOR INSERT 
WITH CHECK (
    auth.uid() = user_id OR 
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() 
          AND profiles.parent_id = farmers.user_id 
          AND profiles.role = 'editor'
    )
);

-- تعديل المزارعين: المالك + المحرر
CREATE POLICY "Users and editors can update farmers" 
ON public.farmers FOR UPDATE 
USING (
    auth.uid() = user_id OR 
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() 
          AND profiles.parent_id = farmers.user_id 
          AND profiles.role = 'editor'
    )
)
WITH CHECK (
    auth.uid() = user_id OR 
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() 
          AND profiles.parent_id = farmers.user_id 
          AND profiles.role = 'editor'
    )
);

-- حذف المزارعين: المالك + المحرر
CREATE POLICY "Users and editors can delete farmers" 
ON public.farmers FOR DELETE 
USING (
    auth.uid() = user_id OR 
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() 
          AND profiles.parent_id = farmers.user_id 
          AND profiles.role = 'editor'
    )
);

-- ==============================================================================
-- (10) الجداول التابعة والمكملة (Sub & Associated Tables)
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- أ) بنود أسعار الفواتير (invoice_price_items)
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
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() 
          AND profiles.parent_id = invoice_price_items.user_id
    )
);

CREATE POLICY "Users and editors can insert invoice_price_items" 
ON public.invoice_price_items FOR INSERT 
WITH CHECK (
    auth.uid() = user_id OR 
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() 
          AND profiles.parent_id = invoice_price_items.user_id 
          AND profiles.role = 'editor'
    )
);

CREATE POLICY "Users and editors can update invoice_price_items" 
ON public.invoice_price_items FOR UPDATE 
USING (
    auth.uid() = user_id OR 
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() 
          AND profiles.parent_id = invoice_price_items.user_id 
          AND profiles.role = 'editor'
    )
)
WITH CHECK (
    auth.uid() = user_id OR 
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() 
          AND profiles.parent_id = invoice_price_items.user_id 
          AND profiles.role = 'editor'
    )
);

CREATE POLICY "Users and editors can delete invoice_price_items" 
ON public.invoice_price_items FOR DELETE 
USING (
    auth.uid() = user_id OR 
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() 
          AND profiles.parent_id = invoice_price_items.user_id 
          AND profiles.role = 'editor'
    )
);

-- ------------------------------------------------------------------------------
-- ب) بنود خصومات الفواتير (invoice_deductions)
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
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() 
          AND profiles.parent_id = invoice_deductions.user_id
    )
);

CREATE POLICY "Users and editors can insert invoice_deductions" 
ON public.invoice_deductions FOR INSERT 
WITH CHECK (
    auth.uid() = user_id OR 
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() 
          AND profiles.parent_id = invoice_deductions.user_id 
          AND profiles.role = 'editor'
    )
);

CREATE POLICY "Users and editors can update invoice_deductions" 
ON public.invoice_deductions FOR UPDATE 
USING (
    auth.uid() = user_id OR 
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() 
          AND profiles.parent_id = invoice_deductions.user_id 
          AND profiles.role = 'editor'
    )
)
WITH CHECK (
    auth.uid() = user_id OR 
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() 
          AND profiles.parent_id = invoice_deductions.user_id 
          AND profiles.role = 'editor'
    )
);

CREATE POLICY "Users and editors can delete invoice_deductions" 
ON public.invoice_deductions FOR DELETE 
USING (
    auth.uid() = user_id OR 
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() 
          AND profiles.parent_id = invoice_deductions.user_id 
          AND profiles.role = 'editor'
    )
);

-- ------------------------------------------------------------------------------
-- ج) فئات المصروفات (expense_categories)
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
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() 
          AND profiles.parent_id = expense_categories.user_id
    )
);

CREATE POLICY "Users and editors can insert expense_categories" 
ON public.expense_categories FOR INSERT 
WITH CHECK (
    auth.uid() = user_id OR 
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() 
          AND profiles.parent_id = expense_categories.user_id 
          AND profiles.role = 'editor'
    )
);

CREATE POLICY "Users and editors can update expense_categories" 
ON public.expense_categories FOR UPDATE 
USING (
    auth.uid() = user_id OR 
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() 
          AND profiles.parent_id = expense_categories.user_id 
          AND profiles.role = 'editor'
    )
)
WITH CHECK (
    auth.uid() = user_id OR 
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() 
          AND profiles.parent_id = expense_categories.user_id 
          AND profiles.role = 'editor'
    )
);

CREATE POLICY "Users and editors can delete expense_categories" 
ON public.expense_categories FOR DELETE 
USING (
    auth.uid() = user_id OR 
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() 
          AND profiles.parent_id = expense_categories.user_id 
          AND profiles.role = 'editor'
    )
);

-- ------------------------------------------------------------------------------
-- د) دفعات الموردين (supplier_payments)
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
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() 
          AND profiles.parent_id = supplier_payments.user_id
    )
);

CREATE POLICY "Users and editors can insert supplier_payments" 
ON public.supplier_payments FOR INSERT 
WITH CHECK (
    auth.uid() = user_id OR 
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() 
          AND profiles.parent_id = supplier_payments.user_id 
          AND profiles.role = 'editor'
    )
);

CREATE POLICY "Users and editors can update supplier_payments" 
ON public.supplier_payments FOR UPDATE 
USING (
    auth.uid() = user_id OR 
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() 
          AND profiles.parent_id = supplier_payments.user_id 
          AND profiles.role = 'editor'
    )
)
WITH CHECK (
    auth.uid() = user_id OR 
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() 
          AND profiles.parent_id = supplier_payments.user_id 
          AND profiles.role = 'editor'
    )
);

CREATE POLICY "Users and editors can delete supplier_payments" 
ON public.supplier_payments FOR DELETE 
USING (
    auth.uid() = user_id OR 
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() 
          AND profiles.parent_id = supplier_payments.user_id 
          AND profiles.role = 'editor'
    )
);

-- ------------------------------------------------------------------------------
-- هـ) مسحوبات المزارعين (farmer_withdrawals)
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
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() 
          AND profiles.parent_id = farmer_withdrawals.user_id
    )
);

CREATE POLICY "Users and editors can insert farmer_withdrawals" 
ON public.farmer_withdrawals FOR INSERT 
WITH CHECK (
    auth.uid() = user_id OR 
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() 
          AND profiles.parent_id = farmer_withdrawals.user_id 
          AND profiles.role = 'editor'
    )
);

CREATE POLICY "Users and editors can update farmer_withdrawals" 
ON public.farmer_withdrawals FOR UPDATE 
USING (
    auth.uid() = user_id OR 
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() 
          AND profiles.parent_id = farmer_withdrawals.user_id 
          AND profiles.role = 'editor'
    )
)
WITH CHECK (
    auth.uid() = user_id OR 
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() 
          AND profiles.parent_id = farmer_withdrawals.user_id 
          AND profiles.role = 'editor'
    )
);

CREATE POLICY "Users and editors can delete farmer_withdrawals" 
ON public.farmer_withdrawals FOR DELETE 
USING (
    auth.uid() = user_id OR 
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() 
          AND profiles.parent_id = farmer_withdrawals.user_id 
          AND profiles.role = 'editor'
    )
);

-- ------------------------------------------------------------------------------
-- و) ديون الشركاء (partner_debts)
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
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() 
          AND profiles.parent_id = partner_debts.user_id
    )
);

CREATE POLICY "Users and editors can insert partner_debts" 
ON public.partner_debts FOR INSERT 
WITH CHECK (
    auth.uid() = user_id OR 
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() 
          AND profiles.parent_id = partner_debts.user_id 
          AND profiles.role = 'editor'
    )
);

CREATE POLICY "Users and editors can update partner_debts" 
ON public.partner_debts FOR UPDATE 
USING (
    auth.uid() = user_id OR 
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() 
          AND profiles.parent_id = partner_debts.user_id 
          AND profiles.role = 'editor'
    )
)
WITH CHECK (
    auth.uid() = user_id OR 
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() 
          AND profiles.parent_id = partner_debts.user_id 
          AND profiles.role = 'editor'
    )
);

CREATE POLICY "Users and editors can delete partner_debts" 
ON public.partner_debts FOR DELETE 
USING (
    auth.uid() = user_id OR 
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() 
          AND profiles.parent_id = partner_debts.user_id 
          AND profiles.role = 'editor'
    )
);

-- ------------------------------------------------------------------------------
-- ز) الحسابات البنكية والخزائن (bank_accounts)
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
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() 
          AND profiles.parent_id = bank_accounts.user_id
    )
);

CREATE POLICY "Users and editors can insert bank_accounts" 
ON public.bank_accounts FOR INSERT 
WITH CHECK (
    auth.uid() = user_id OR 
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() 
          AND profiles.parent_id = bank_accounts.user_id 
          AND profiles.role = 'editor'
    )
);

CREATE POLICY "Users and editors can update bank_accounts" 
ON public.bank_accounts FOR UPDATE 
USING (
    auth.uid() = user_id OR 
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() 
          AND profiles.parent_id = bank_accounts.user_id 
          AND profiles.role = 'editor'
    )
)
WITH CHECK (
    auth.uid() = user_id OR 
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() 
          AND profiles.parent_id = bank_accounts.user_id 
          AND profiles.role = 'editor'
    )
);

CREATE POLICY "Users and editors can delete bank_accounts" 
ON public.bank_accounts FOR DELETE 
USING (
    auth.uid() = user_id OR 
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() 
          AND profiles.parent_id = bank_accounts.user_id 
          AND profiles.role = 'editor'
    )
);

-- ------------------------------------------------------------------------------
-- ح) المعاملات البنكية (bank_transactions)
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
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() 
          AND profiles.parent_id = bank_transactions.user_id
    )
);

CREATE POLICY "Users and editors can insert bank_transactions" 
ON public.bank_transactions FOR INSERT 
WITH CHECK (
    auth.uid() = user_id OR 
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() 
          AND profiles.parent_id = bank_transactions.user_id 
          AND profiles.role = 'editor'
    )
);

CREATE POLICY "Users and editors can update bank_transactions" 
ON public.bank_transactions FOR UPDATE 
USING (
    auth.uid() = user_id OR 
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() 
          AND profiles.parent_id = bank_transactions.user_id 
          AND profiles.role = 'editor'
    )
)
WITH CHECK (
    auth.uid() = user_id OR 
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() 
          AND profiles.parent_id = bank_transactions.user_id 
          AND profiles.role = 'editor'
    )
);

CREATE POLICY "Users and editors can delete bank_transactions" 
ON public.bank_transactions FOR DELETE 
USING (
    auth.uid() = user_id OR 
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() 
          AND profiles.parent_id = bank_transactions.user_id 
          AND profiles.role = 'editor'
    )
);

-- ------------------------------------------------------------------------------
-- ط) الأصول والعهد (assets)
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
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() 
          AND profiles.parent_id = assets.user_id
    )
);

CREATE POLICY "Users and editors can insert assets" 
ON public.assets FOR INSERT 
WITH CHECK (
    auth.uid() = user_id OR 
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() 
          AND profiles.parent_id = assets.user_id 
          AND profiles.role = 'editor'
    )
);

CREATE POLICY "Users and editors can update assets" 
ON public.assets FOR UPDATE 
USING (
    auth.uid() = user_id OR 
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() 
          AND profiles.parent_id = assets.user_id 
          AND profiles.role = 'editor'
    )
)
WITH CHECK (
    auth.uid() = user_id OR 
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() 
          AND profiles.parent_id = assets.user_id 
          AND profiles.role = 'editor'
    )
);

CREATE POLICY "Users and editors can delete assets" 
ON public.assets FOR DELETE 
USING (
    auth.uid() = user_id OR 
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() 
          AND profiles.parent_id = assets.user_id 
          AND profiles.role = 'editor'
    )
);

-- ==============================================================================
-- (11) تحديث دالة upsert_invoice_items لدعم صلاحيات أعضاء الفريق المحررين
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
    v_has_permission BOOLEAN;
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

    -- 3. التحقق من الصلاحية: إما المالك المباشر للفاتورة أو عضو مرتبط بدور محرر (editor)
    IF v_actual_user_id = v_invoice_owner_id THEN
        v_has_permission := TRUE;
    ELSE
        SELECT EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = v_actual_user_id
              AND parent_id = v_invoice_owner_id
              AND role = 'editor'
        ) INTO v_has_permission;
    END IF;

    IF NOT v_has_permission THEN
        RAISE EXCEPTION 'غير مصرح: لا تملك صلاحية تعديل بنود هذه الفاتورة';
    END IF;

    -- 4. حذف البنود والخصومات القديمة للفاتورة في نفس المعاملة
    DELETE FROM public.invoice_price_items WHERE invoice_id = p_invoice_id;
    DELETE FROM public.invoice_deductions WHERE invoice_id = p_invoice_id;

    -- 5. إدراج بنود الأسعار الجديدة إذا وُجدت
    IF p_price_items IS NOT NULL AND jsonb_typeof(p_price_items) = 'array' AND jsonb_array_length(p_price_items) > 0 THEN
        INSERT INTO public.invoice_price_items (invoice_id, user_id, quantity, price_per_kg, packaging_count)
        SELECT 
            p_invoice_id,
            v_invoice_owner_id,
            COALESCE((item->>'quantity')::NUMERIC, 0),
            COALESCE((item->>'price_per_kg')::NUMERIC, 0),
            (item->>'packaging_count')::INTEGER
        FROM jsonb_array_elements(p_price_items) AS item;
    END IF;

    -- 6. إدراج الخصومات الجديدة إذا وُجدت
    IF p_deductions IS NOT NULL AND jsonb_typeof(p_deductions) = 'array' AND jsonb_array_length(p_deductions) > 0 THEN
        INSERT INTO public.invoice_deductions (invoice_id, user_id, name, amount)
        SELECT 
            p_invoice_id,
            v_invoice_owner_id,
            COALESCE(item->>'name', ''),
            COALESCE((item->>'amount')::NUMERIC, 0)
        FROM jsonb_array_elements(p_deductions) AS item;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

REVOKE ALL ON FUNCTION public.upsert_invoice_items(UUID, JSONB, JSONB, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.upsert_invoice_items(UUID, JSONB, JSONB, UUID) TO authenticated, service_role;

-- ==============================================================================
-- ملاحظة هامة حول الأعضاء الافتراضيين (Virtual Members):
-- الأعضاء الافتراضيون (الذين لا يملكون معرف مستخدم مستقل auth.uid ضمن Supabase Auth)
-- غير مشمولين بهذه السياسات المبنية على auth.uid()؛ حيث تتم إدارة جلساتهم محلياً
-- وعبر دوال مخصصة (مثل virtual_login)، وسيتم التعامل مع آلية مزامنتهم وصلاحياتهم في أمر منفصل.
-- ==============================================================================
