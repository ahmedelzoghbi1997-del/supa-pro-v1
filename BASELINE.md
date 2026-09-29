# 📊 خط الأساس للأداء (Performance Baseline)
**تاريخ التسجيل:** 29 سبتمبر 2026  
**الفرع:** `refactor/ui-perf`

---

## 1. حجم الحزم ومخرجات البناء (`npm run build`)

| الحزمة / الملف (Chunk / Asset) | الحجم الأصلي (Size) | الحجم المضغوط (Gzip) |
| :--- | :--- | :--- |
| **`dist/assets/index.js` (Main Entry)** | **778.36 kB** | **210.96 kB** |
| `dist/assets/charts-vendor.js` (Recharts / D3) | 489.35 kB | 131.85 kB |
| `dist/assets/index.css` (Tailwind / Styles) | 327.60 kB | 37.59 kB |
| `dist/assets/CycleManager.js` | 312.06 kB | 49.18 kB |
| `dist/assets/LaborManager.js` | 264.80 kB | 44.11 kB |
| `dist/assets/supabase-vendor.js` | 170.75 kB | 45.43 kB |
| `dist/assets/SharedReport.js` | 169.61 kB | 27.64 kB |
| `dist/assets/PartnersManager.js` | 163.59 kB | 25.35 kB |
| `dist/assets/TreasuryManager.js` | 159.29 kB | 26.25 kB |
| `dist/assets/Dashboard.js` | 141.95 kB | 24.95 kB |
| `dist/assets/DailyLogManager.js` | 137.98 kB | 20.92 kB |
| `dist/assets/SettingsManager.js` | 110.98 kB | 18.86 kB |
| `dist/assets/db-vendor.js` (Dexie) | 98.21 kB | 32.10 kB |
| `dist/assets/animation-vendor.js` (Motion) | 96.16 kB | 32.09 kB |
| `dist/assets/SupplierManager.js` | 79.65 kB | 14.05 kB |
| **إجمالي التخزين المؤقت المسبق (PWA Precache)** | **117 ملف** | **4,945.68 KiB** |

---

## 2. فحص الجودة والأخطاء البرمجية (Lint & Type-check)

- **`npm run lint`**: 
  - **الأخطاء القاتلة (Errors):** `0`
  - **التحذيرات (Warnings):** `586` (تتعلق بمتغيرات غير مستخدمة وأنواع `any` في ملفات الاختبارات وترويسات Service Worker).
- **`npm run typecheck` (`tsc --noEmit`)**:
  - كشف الفحص عن وجود `24` خطأ عدم تطابق أنواع (Type mismatches) في حقول النماذج وسياقات البيانات القديمة يتم فحصها وتصحيحها تباعاً.

---

## 3. تحليل أداء وإعادة تصيير لوحة التحكم (`Dashboard Re-renders Profiling`)

- **عدد مرات إعادة التصيير عند الإقلاع (Initial Mount Re-renders):** `4 ~ 5 مرات`
  1. *التصيير 1:* التهيئة الأولية للمزودات (`DataContext`, `UIContext`, `SettingsContext`).
  2. *التصيير 2:* استرجاع البيانات المحلية من Dexie IndexedDB (Local Cache Hydration).
  3. *التصيير 3:* اكتمال التحقق من الحساب النشط وحسابات العروات الزراعية النشطة (`cyclesWithCalculations`).
  4. *التصيير 4:* استقرار حالة المزامنة السحابية وتحديث الحسابات المالية الإجمالية.
- **نقاط الاختناق الحسابية المرصودة (Bottlenecks):**
  - ارتباط مكوّن `Dashboard` بالسياق الشامل `DataContext` بشكل مباشر، مما يؤدي لإعادة تصيير لوحة التحكم بالكامل عند تحديث أي جدول فرعي (مثل إضافة دفعة عامل أو مصروف منفصل).
  - إجراء عمليات ترشيح وحسابات تكرارية على القوائم المالية داخل `useMemo` مع كل تحديث للحالة.
