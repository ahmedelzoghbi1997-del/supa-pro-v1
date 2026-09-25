# المحاسب الزراعي 🌾

نظام متكامل ومتقدم لإدارة الحسابات الزراعية، العروات الإنتاجية، الفواتير والمبيعات، المصروفات التشغيلية، الخزينة والبنوك، وسلف وحسابات العمال والموردين والمزارعين، مع دعم كامل للعمل دون اتصال بالإنترنت (Offline-First) والمزامنة التلقائية مع سحابة Supabase.

---

## 📁 بنية المجلدات (Project Structure)

```text
├── android/                   # ملفات وإعدادات تطبيق أندرويد الأصلي (Capacitor)
├── api/                       # دوال السيرفر والـ Serverless Endpoints (مثل دفع الإشعارات)
├── components/                # مكوّنات الواجهة الأمامية (UI Components)
│   ├── auth/                  # شاشات الدخول وتأكيد الحساب والملف الشخصي
│   ├── cycles/                # شاشات وبطاقات وإحصائيات العروات الزراعية
│   ├── expenses/              # إدارة المصروفات وتصنيفاتها والمصروفات التأسيسية
│   ├── invoices/              # فواتير المبيعات، البنود والأسعار، والخصومات
│   ├── dashboard/             # لوحة التحكم الرئيسية والرسوم البيانية والملخصات
│   ├── treasury/              # الخزينة، الحسابات البنكية، المعاملات وصناديق العروات
│   ├── persons/               # إدارة العمال، المزارعين، الموردين، والسلف
│   ├── settings/              # إعدادات النظام، التصدير والنسخ الاحتياطي، وحجم الخط
│   └── shared/                # المكوّنات المشتركة (Card, Button, OfflineBanner, Toast...)
├── contexts/                  # سياقات الحالة المقسّمة (Modular State Management)
│   ├── DataContext.tsx        # المزوّد والمجمّع الرئيسي لبيانات التطبيق
│   ├── InvoicesContext.tsx    # إدارة حالة الفواتير والمبيعات
│   ├── ExpensesContext.tsx    # إدارة حالة المصروفات
│   ├── CyclesContext.tsx      # إدارة حالة العروات
│   ├── TreasuryContext.tsx    # إدارة الخزينة والبنوك
│   ├── PersonsContext.tsx     # إدارة الأشخاص والسلف والموردين
│   └── SettingsContext.tsx    # إعدادات التطبيق والمظهر
├── hooks/                     # خطافات React المخصصة للعمليات والحسابات
│   ├── useFinancialCalculations.ts # محرك الحسابات المالية عالي الأداء
│   ├── useInvoices.ts         # عمليات الفواتير
│   ├── useExpenses.ts         # عمليات المصروفات
│   ├── useCycles.ts           # عمليات العروات
│   └── useTreasury.ts         # عمليات الخزينة
├── lib/                       # المكتبات الأساسية والبنية التحتية
│   ├── db.ts                  # قاعدة البيانات المحلية Dexie (IndexedDB)
│   ├── syncQueue.ts           # طابور المزامنة الذكي وإدارة الاتصال
│   ├── payloadWhitelist.ts    # تنقية البيانات لمنع إرسال الحقول المحسوبة لقاعدة البيانات
│   └── supabase.ts            # تهيئة عميل Supabase وإدارة الجلسات
├── supabase/                  # ملفات وإعدادات Supabase
│   └── migrations/            # سجل ترحيل قواعد البيانات (SQL Migrations)
├── tests/                     # اختبارات الوحدة والمنطق المالي (Vitest)
│   ├── syncQueue.test.ts      # اختبارات طابور المزامنة وأولويات الجداول
│   ├── payloadWhitelist.test.ts # اختبارات تنقية البيانات وحمايتها
│   └── financialCalculations.test.ts # اختبارات الحسابات المالية الخمسة الأساسية
├── utils/                     # دوال مساعدة للتنسيق والتحويل والتاريخ
├── server.ts                  # خادم التطبيق (Node.js + Express)
├── package.json               # التبعيات والسكربتات
└── vite.config.ts             # إعدادات Vite والبناء
```

---

## ⚙️ متغيرات البيئة المطلوبة (Environment Variables)

قم بإنشاء ملف `.env` في جذر المشروع واملأ المتغيرات التالية وفقاً لبيئتك (كما هو موضح في `.env.example`):

```env
# ==============================================================================
# إعدادات Supabase (الواجهة الأمامية - مفتاح Anon العام)
# ==============================================================================
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_public_key_here

# ==============================================================================
# إعدادات Supabase (الخادم الخلفي - صلاحيات الخدمة Service Role)
# ==============================================================================
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here

# ==============================================================================
# مفتاح Google Gemini API للتحليلات الذكية
# ==============================================================================
GEMINI_API_KEY=your_gemini_api_key_here

# ==============================================================================
# مفتاح الحماية الداخلي لإرسال الإشعارات
# ==============================================================================
PUSH_INTERNAL_SECRET=your_push_internal_secret_here

# ==============================================================================
# مفاتيح Web Push VAPID لإشعارات الويب
# ==============================================================================
VAPID_EMAIL=your-email@example.com
VAPID_PUBLIC_KEY=your_vapid_public_key
VAPID_PRIVATE_KEY=your_vapid_private_key
```

---

## 🚀 أوامر التشغيل والبناء (Run & Build Commands)

### 1. تثبيت الحزم:
```bash
npm install
```

### 2. تشغيل بيئة التطوير المحلية:
```bash
npm run dev
```
يعمل خادم التطوير الافتراضي على المنفذ `http://localhost:3000`.

### 3. تشغيل الاختبارات (Vitest):
```bash
npm test
```

### 4. فحص الأخطاء والتوافق البرمجي (Linting):
```bash
npm run lint
```

### 5. بناء التطبيق للإنتاج (Production Build):
```bash
npm run build
```

### 6. تشغيل خادم الإنتاج:
```bash
npm start
```

---

## 🗄️ أوامر وإرشادات Supabase Migrations

لإدارة وترحيل جداول قاعدة البيانات والوظائف الإجرائية (RPC):

### 1. تسجيل الدخول وربط المشروع:
```bash
npx supabase login
npx supabase link --project-ref <your-project-id>
```

### 2. تطبيق الترحيلات الجديدة على السحابة:
```bash
npx supabase db push
```

### 3. إنشاء ملف ترحيل جديد (Migration):
```bash
npx supabase migration new <migration_name>
```

### 4. سحب التعديلات من قاعدة البيانات السحابية:
```bash
npx supabase db pull
```

### 5. تشغيل بيئة Supabase المحلية (اختياري عبر Docker):
```bash
npx supabase start
npx supabase db reset
```

---

## 📜 الترخيص (License)

هذا المشروع مرخص بموجب رخصة [MIT](LICENSE).
