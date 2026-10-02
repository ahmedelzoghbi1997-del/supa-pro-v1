# خطة هجرة الأزرار (Strangler Fig Migration - Button Component)

## 1. نظرة عامة والهدف
تطبيق نمط **Strangler Fig** لاستبدال عناصر `<button>` المباشرة في واجهة التطبيق تدريجياً بالمكوّن المركزي الموحد `Button` (`components/shared/Button.tsx`).

---

## 2. مواصفات مكوّن `Button.tsx` (Design System API)

يدعم المكوّن الخصائص التالية بالكامل مع التوافق العكسي:
- **`variant`**:
  - `primary`: الزر الرئيسي بنسق هوية التطبيق `bg-primary text-white hover:bg-primary-dark`.
  - `secondary`: زر خلفية حيادية وحدود خفيفة `bg-neutral-100 dark:bg-neutral-800`.
  - `danger`: زر العمليات الخطيرة والحذف `bg-accent-danger text-white`.
  - `ghost`: زر شفاف للتنقل والإجراءات الخفيفة `bg-transparent hover:bg-neutral-100`.
  - `neutral`: زر حيادي بدون حدود.
- **`size`**:
  - `sm`: حجم صغير (تلميحات، أشرطة سفلية، أزرار فرعية) `text-xs px-3 py-1.5`.
  - `md`: الحجم القياسي `text-sm px-4 py-2.5`.
  - `lg`: الحجم الكبير للعمليات الرئيسية `text-base px-6 py-3.5`.
- **`loading`**: مؤشر دوران تلقائي `animate-spin` مع تعطيل التفاعل.
- **`disabled`**: تعطيل مع `opacity-50` و `pointer-events-none`.
- **`icon`**: دعم إضافة أيقونة مع ضبط المسافات تلقائياً.
- **`fullWidth`**: التمدد لعرض الحاوية بالكامل.
- **`ref` & Native Props**: توجيه `forwardRef` وتمرير كل خصائص `HTMLButtonElement` كـ `onClick`, `type`, `aria-label`, إلخ.

---

## 3. المرحلة الأولى المنجزة (Phase 1 Completed)

تم استبدال وترقية الأزرار في الملفات المحددة بالكامل:

| الملف / المكوّن | عدد `<button>` قبل | عدد `<button>` الحالي | الحالة |
| :--- | :---: | :---: | :---: |
| `components/shared/Modal.tsx` | 0 (سابقاً) | **0** | مكتمل ✅ |
| `components/BottomNav.tsx` | 0 (سابقاً) | **0** | مكتمل ✅ |
| `components/MainContent.tsx` (Header) | 0 (سابقاً) | **0** | مكتمل ✅ |
| `components/shared/HeaderQuickActions.tsx` | 0 (سابقاً) | **0** | مكتمل ✅ |
| `components/shared/report/ReportHeader.tsx` | 5 | **0** | مكتمل ✅ |
| `components/settings/TeamSettings.tsx` | 10 | **0** | مكتمل ✅ |
| `components/shared/NotificationSettingsModal.tsx` | 3 | **0** | مكتمل ✅ |
| `components/labor/LaborActivitiesSettings.tsx` | 18 | **0** | مكتمل ✅ |
| باقي ملفات الإعدادات (11 ملفاً في `settings/`) | 0 | **0** | مكتمل ✅ |

---

## 4. إحصائيات الأزرار المتبقية للمراحل القادمة

- **إجمالي الأزرار الخام المتبقية في المشروع**: **464** زر خام.
- **إجمالي الملفات التي تحتوي على أزرار خام**: **87** ملف.

### التوزيع حسب الأقسام والموديولات:
1. **العمالة والأجور (`components/labor/`)**: ~71 زر متبقٍ (`UnifiedLaborForm`: 28، `WorkerAccounts`: 14، `BatchDayLaborModal`: 12، `LaborLedger`: 10، `LaborManager`: 8، `EditLaborForm`: 7).
2. **الشركاء والمديونيات (`components/partners/`)**: ~58 زر متبقٍ (`PartnersManager`: 39، `MarketDebtCenter`: 10، `WalletTab`: 6، `LedgerTab`: 3).
3. **الخزنة والحسابات البنكية (`components/treasury/`)**: ~38 زر متبقٍ (`BankAccountDetails`: 14، `TreasuryDetails`: 10، `TreasuryList`: 10، `TreasuryReport`: 4).
4. **اليوميات وسجلات المزرعة (`components/daily_logs/`)**: ~34 زر متبقٍ (`AddEditLogModal`: 16، `DailyLogManager`: 8، `DailyLogsTable`: 5، `WeeklyRadarTable`: 5).
5. **الموردين والدفعات (`components/suppliers/`)**: ~27 زر متبقٍ (`SupplierManager`: 11، `SupplierStatement`: 9، `AddPaymentForm`: 3، `AddDiscountForm`: 2، `AddSupplierForm`: 2).
6. **الفواتير والمبيعات (`components/invoices/`)**: ~21 زر متبقٍ (`AddInvoiceForm`: 11، `InvoicesTable`: 6، `InvoiceCard`: 2، `InvoiceManager`: 2).
7. **العروات والإنتاج (`components/cycles/`)**: ~33 زر متبقٍ (`TimelineTab`: 8، `AddCycleForm`: 7، `CycleCard`: 7، `CyclesTable`: 6، `OverviewTab`: 6، `CycleManager`: 4، `ProductionTab`: 4).
8. **السلف والعهد (`components/advances/`)**: ~21 زر متبقٍ (`ManagePersonsPopup`: 7، `AdvancesManager`: 6، `PersonAdvancesListView`: 5، `AddAdvanceForm`: 3، `PersonStatement`: 2).
9. **المصروفات (`components/expenses/`)**: ~15 زر متبقٍ (`ExpensesTable`: 6، `AddExpenseForm`: 5، `ExpenseCard`: 2، `ExpenseManager`: 2).
10. **حسابات المزارعين (`components/farmer_account/`)**: ~14 زر متبقٍ (`FarmerAccountListView`: 4، `FarmerAccountManager`: 4، `AddFarmerForm`: 2، `AddWithdrawalForm`: 2، `FarmerStatement`: 2).
11. **المستخدمين والاشتراكات (`components/users/`, `subscription/`, `auth/`)**: ~35 زر متبقٍ.
12. **المكونات المشتركة ولوحة التحكم (`dashboard/`, `shared/`)**: ~20 زر متبقٍ.

---

## 5. خطة المراحل القادمة (Roadmap)

- [x] **المرحلة 1**: مكوّن `Button.tsx` الأساسي + النوافذ المنبثقة `Modal` + شريط التنقل `BottomNav` + ترويسة الصفحة `Header` + كافة ملفات الإعدادات `Settings`.
- [ ] **المرحلة 2 (PR القادم)**: نماذج الإدخال الأساسية وإدارات السجلات اليومية والعمالة (`AddEditLogModal`, `UnifiedLaborForm`, `WorkerAccounts`, `LaborLedger`).
- [ ] **المرحلة 3 (PR لاحق)**: إدارة الفواتير، المصروفات، الموردين، والخزينة.
- [ ] **المرحلة 4 (الإنهاء والتنظيف)**: صفحات الشركاء، العروات، المستخدمين، والمكونات الثانوية للوصول إلى **0 أزرار خام**.
