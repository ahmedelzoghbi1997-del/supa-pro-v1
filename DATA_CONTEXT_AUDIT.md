# 📋 تدقيق واستهلاك سياق البيانات (`DATA_CONTEXT_AUDIT.md`)
**تاريخ التدقيق:** 29 سبتمبر 2026  
**الفرع:** `refactor/ui-perf`

---

## 1. ملخص المشكلة
سياق البيانات الرئيسي `DataContext.tsx` يحتوي على **أكثر من 100 مفتاح** و **25 دالة اعتمادية** في كائن `value` واحد.  
أي تغيير محلي بسيط (مثل إضافة مصروف أو تحديث بند فاتورة) يؤدي إلى إعادة تصيير **كافة المكوّنات الـ 65+** التي تستهلك `useData()`.

---

## 2. جدول استهلاك المكوّنات للمفاتيح واقتراح السياق التخصصي لكل مكوّن

| المكوّن (Component) | المفاتيح المستهلكة فعلياً (Consumed Keys) | السياق البديل الموصى به (Target Context / Hook) |
| :--- | :--- | :--- |
| **قسم الفواتير (Invoices)** | | |
| `InvoiceManager.tsx` | `invoices`, `addInvoice`, `updateInvoice`, `deleteInvoice`, `lastInvoiceAddedId`, `cycles` | `useInvoices()` / `useCycles()` |
| `InvoiceDetailsModal.tsx` | `activePersons` | `usePersons()` |
| `AddInvoiceForm.tsx` | `cycles`, `settings`, `activePersons`, `advances`, `partnerDebts` | `useInvoices()` / `useCycles()` / `usePersons()` |
| `InvoicesList.tsx` | `profile` | `DataContext` (أو `ProfileContext`) |
| **قسم المصروفات والعمالة (Expenses & Labor)** | | |
| `ExpenseManager.tsx` | `expenses`, `addExpense`, `updateExpense`, `deleteExpense`, `lastExpenseAddedId`, `expenseCategories`, `suppliers`, `profile`, `cycles` | `useExpenses()` / `useCycles()` |
| `AddExpenseForm.tsx` | `cycles`, `expenseCategories`, `suppliers`, `settings`, `expenses`, `supplierPayments` | `useExpenses()` / `useCycles()` |
| `ExpensesList.tsx` | `profile`, `suppliers` | `useExpenses()` / `useSuppliers()` |
| `LaborManager.tsx` | `rawExpenses`, `expenseCategories`, `cyclesWithCalculations` | `useExpenses()` / `useCycles()` |
| `WorkerAccounts.tsx` | `addExpense`, `deleteExpense`, `cyclesWithCalculations`, `expenseCategories` | `useExpenses()` / `useCycles()` |
| `UnifiedLaborForm.tsx` | `addExpense`, `cyclesWithCalculations`, `addExpenseCategory`, `rawExpenses` | `useExpenses()` / `useCycles()` |
| **قسم الخزنة والموارد المالية (Treasury & Finance)** | | |
| `TreasuryManager.tsx` | `treasuryFunds`, `bankAccounts` | `useTreasury()` |
| `BankAccountDetails.tsx` | `bankAccounts`, `bankTransactions`, `addBankTransaction`, `deleteBankTransaction`, `updateBankAccount` | `useTreasury()` |
| `TreasuryDetails.tsx` | `treasuryFunds`, `invoices`, `expenses`, `advances`, `farmerWithdrawals`, `supplierPayments` | `useTreasury()` |
| `TreasuryReport.tsx` | `treasuryFunds`, `bankAccounts`, `bankTransactions`, `invoices`, `expenses`, `cycles` | `useTreasury()` |
| `TreasuryList.tsx` | `treasuryFunds`, `bankAccounts` | `useTreasury()` |
| **قسم العروات الزراعية (Cycles)** | | |
| `CycleManager.tsx` | `cyclesWithCalculations`, `addCycle`, `updateCycle`, `deleteCycle`, `lastCycleAddedId`, `getCycleTotalBalance` | `useCycles()` |
| `AddCycleForm.tsx` | `settings`, `farmers`, `assets`, `cycles`, `getCycleTotalBalance`, `invoices` | `useCycles()` |
| `CycleCard.tsx` | `invoices`, `expenses`, `dailyLogs` | `useCycles()` |
| `OverviewTab.tsx` | `expenses`, `expenseCategories`, `invoices`, `advances`, `farmerWithdrawals`, `supplierPayments` | `useCycles()` |
| **قسم الموردين والشركاء والسلف (Suppliers, Partners, Advances)** | | |
| `SupplierManager.tsx` | `suppliers`, `addSupplier`, `updateSupplier`, `deleteSupplier`, `supplierPayments`, `addSupplierPayment`, `cycles`, `rawExpenses` | `useSuppliers()` / `useExpenses()` |
| `PartnersManager.tsx` | `activePersons`, `partnerDebts`, `addPartnerDebt`, `updatePartnerDebt`, `deletePartnerDebt`, `profile`, `settings` | `usePersons()` / `useTreasury()` |
| `AdvancesManager.tsx` | `advances`, `addAdvance`, `updateAdvance`, `deleteAdvance`, `persons`, `profile`, `settings` | `useAdvances()` / `usePersons()` |
| **لوحة التحكم (Dashboard)** | | |
| `Dashboard.tsx` | `profile`, `invoices`, `expenses`, `advances`, `cyclesWithCalculations`, `persons`, `treasuryFunds`, `bankAccounts`, `settings` | تفكيك الاعتمادات المباشرة |
| `ActiveCyclesOverview.tsx` | `cyclesWithCalculations` | `useCycles()` |
| `RecentTransactions.tsx` | `invoices`, `expenses`, `advances`, `supplierPayments`, `farmerWithdrawals` | `useTreasury()` / `useExpenses()` |

---

## 3. خطة المزامنة والتحويل (Migration Plan)
1. **تحديث الـ Domain Hooks:**
   - ربط `useInvoices` بـ `InvoicesContext`.
   - ربط `useExpenses` بـ `ExpensesContext`.
   - ربط `useTreasury` بـ `TreasuryContext`.
   - ربط `useCycles` بـ `CyclesContext`.
   - ربط `useDailyLogs` بـ `DailyLogsContext`.
2. **تحويل المكوّنات:**
   - تحويل مكوّنات الفواتير لاستخدام `useInvoices()`.
   - تحويل مكوّنات المصروفات لاستخدام `useExpenses()`.
   - تحويل مكوّنات الخزنة لاستخدام `useTreasury()`.
   - تحويل مكوّنات العروات لاستخدام `useCycles()`.
3. **الحفاظ على التوافق:**
   - الإبقاء على `DataContext` كـ Wrapper مؤقت يُعيد تصدير القيم للمكوّنات غير المحولة بعد مع إضافة تعليق `// TODO: Deprecate DataContext in favor of domain contexts`.
