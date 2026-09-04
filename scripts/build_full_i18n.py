import json
import urllib.request
import urllib.parse
import time
import os
import re

# Load base domain dictionary
domain_overrides = {
    # Navigation & System
    "المحاسب الزراعي": "Agricultural Accountant",
    "المحاسبة اليومية": "Daily Accounting",
    "لوحة التحكم": "Dashboard",
    "إدارة الفواتير": "Invoices",
    "إدارة المصروفات": "Expenses",
    "الأجندة الزراعية": "Farm Agenda",
    "إدارة المواسم/العروات": "Cycles & Seasons Management",
    "إدارة العمالة": "Labor Management",
    "ادارة حساب المزارع": "Farmer Account",
    "حسابات الموردين": "Supplier Accounts",
    "إدارة الأصول": "Asset Management",
    "التحليل الأسبوعي": "Weekly Analysis",
    "الخزنة": "Treasury",
    "السلف الشخصية": "Personal Advances",
    "محفظة الشركاء": "Partners Wallet",
    "الإعدادات": "Settings",
    "إدارة المستخدمين": "User Management",
    "الاشتراك": "Subscription",
    "الإدارة والتكوين": "Management & Operations",
    "التحليل والمالية": "Analysis & Financials",
    "التطبيق": "Application",
    "تسجيل الخروج": "Logout",
    "تسجيل الدخول": "Login",
    "الملف الشخصي": "Profile",
    "الإشعارات": "Notifications",
    "الرئيسية": "Home",
    "الفواتير": "Invoices",
    "المصروفات": "Expenses",
    "العروات": "Cycles",
    "المواسم": "Seasons",
    "العروة": "Cycle",
    "الموسم": "Season",
    "عروة": "Cycle",
    "موسم": "Season",
    "الصوب والأصول": "Greenhouses & Assets",
    "الصوب": "Greenhouses",
    "الصوبة": "Greenhouse",
    "الأصول": "Assets",
    "الموردين": "Suppliers",
    "المورد": "Supplier",
    "حساب المزارع": "Farmer Account",
    "المزارع": "Farmer",
    "السلف": "Advances",
    "سلفة": "Advance",
    "العمالة": "Labor",
    "العمال": "Workers",
    "عامل": "Worker",
    "الشركاء": "Partners",
    "الشريك": "Partner",
    "اليوميات الزراعية": "Daily Farm Logs",
    "اليوميات": "Daily Logs",
    "التحليل": "Analysis",

    # Status Badges
    "نشطة": "Active",
    "نشط": "Active",
    "مؤرشفة": "Archived",
    "مؤرشف": "Archived",
    "مكتملة": "Completed",
    "مكتمل": "Completed",
    "مغلقة": "Closed",
    "مغلق": "Closed",
    "مفتوحة": "Open",
    "مفتوح": "Open",
    "مدفوعة": "Paid",
    "مدفوع": "Paid",
    "غير مدفوعة": "Unpaid",
    "غير مدفوع": "Unpaid",
    "مدفوعة جزئياً": "Partially Paid",
    "مدفوع جزئياً": "Partially Paid",
    "مسددة": "Settled",
    "مسدد": "Settled",
    "غير مسددة": "Unsettled",
    "غير مسدد": "Unsettled",
    "معلقة": "Pending",
    "معلق": "Pending",
    "قيد الانتظار": "Pending",
    "قيد التشغيل": "Running",
    "جاري التشغيل": "Running",
    "جاري العمل": "In Progress",
    "مسودة": "Draft",
    "ملغاة": "Cancelled",
    "ملغي": "Cancelled",
    "مرفوضة": "Rejected",
    "مرفوض": "Rejected",
    "مقبولة": "Approved",
    "مقبول": "Approved",
    "وارد": "Deposit",
    "صادر": "Withdrawal",
    "متصل": "Online",
    "غير متصل": "Offline",
    "مزامن": "Synced",
    "جاري التحديث...": "Updating...",
    "جاري المزامنة...": "Syncing...",
    "جاري التحميل...": "Loading...",
    "متاح": "Available",
    "منتهي": "Expired",
    "لا يوجد": "None",
    "جديد": "New",
    "جديدة": "New",
    "سابق": "Previous",
    "سابقة": "Previous",
    "افتراضي": "Default",
    "افتراضية": "Default",
    "خاص": "Private",
    "عام": "Public",

    # Currencies & Units
    "ج.م": "EGP",
    "ج.م.": "EGP",
    "جنيه": "EGP",
    "جنيه مصري": "EGP",
    "كجم": "kg",
    "كيلو": "kg",
    "كيلوجرام": "kg",
    "طن": "ton",
    "صندوق": "Box",
    "كرتونة": "Carton",
    "شيكارة": "Bag",
    "شكارة": "Bag",
    "شتلة": "Seedling",
    "شجر": "Tree",
    "فدان": "Feddan",
    "قيراط": "Kirat",
    "سهم": "Sahm",
    "متر": "Meter",
    "متر مربع": "sq m",
    "لتر": "Liter",
    "يوم": "Day",
    "يومية": "Day Wage",
    "ساعة": "Hour",
    "نفر": "Worker",

    # Financial Summaries
    "إجمالي الإيرادات": "Total Revenue",
    "إجمالي المصروفات": "Total Expenses",
    "صافي الربح": "Net Profit",
    "صافي الأرباح": "Net Profit",
    "صافي الخسارة": "Net Loss",
    "إجمالي المبيعات": "Total Sales",
    "إجمالي المشتريات": "Total Purchases",
    "رصيد الخزنة": "Treasury Balance",
    "الرصيد الحالي": "Current Balance",
    "الرصيد الافتتاحي": "Opening Balance",
    "الرصيد الختامي": "Closing Balance",
    "إجمالي السلف": "Total Advances",
    "إجمالي المسحوبات": "Total Withdrawals",
    "إجمالي المدفوعات": "Total Payments",
    "إجمالي التوريدات": "Total Deliveries",
    "إجمالي التكاليف": "Total Costs",
    "إجمالي الأجور": "Total Wages",
    "مديونية الموردين": "Supplier Debts",
    "مستحقات الموردين": "Supplier Dues",
    "مستحقات المزارع": "Farmer Dues",
    "رصيد الشريك": "Partner Balance",
    "مسحوبات الشركاء": "Partner Drawings",
    "أرباح الشركاء": "Partner Profits",
    "رأس المال": "Capital",
    "التكلفة الفعلية": "Actual Cost",
    "متوسط السعر": "Average Price",
    "إجمالي الوزن": "Total Weight",
    "إجمالي الكمية": "Total Quantity",
    "المتبقي": "Remaining",
    "المسدد": "Paid",
    "المستحق": "Due",
    "الخصم": "Discount",
    "العمولة": "Commission",
    "العمولات": "Commissions",
    "النولون": "Freight",
    "المشال": "Handling",
    "الصافي": "Net",
    "صافي الفاتورة": "Net Invoice",
    "الإجمالي": "Total",
    "المجموع": "Total",
    "حركة الخزنة": "Treasury Transactions",
    "وارد الخزنة": "Treasury Deposits",
    "صادر الخزنة": "Treasury Withdrawals",
    "مركز مديونية السوق": "Market Debt Center",

    # Actions & Buttons
    "إضافة": "Add",
    "إضافة جديد": "Add New",
    "حفظ": "Save",
    "حفظ التغييرات": "Save Changes",
    "تأكيد": "Confirm",
    "إلغاء": "Cancel",
    "تعديل": "Edit",
    "حذف": "Delete",
    "تفاصيل": "Details",
    "طباعة": "Print",
    "تصدير": "Export",
    "مشاركة": "Share",
    "تصفية": "Filter",
    "بحث": "Search",
    "بحث...": "Search...",
    "مسح": "Clear",
    "إغلاق": "Close",
    "رجوع": "Back",
    "التالي": "Next",
    "السابق": "Previous",
    "عرض": "View",
    "معاينة": "Preview",
    "تنزيل": "Download",
    "تحديث": "Refresh",
    "تكرار": "Duplicate",
    "أرشفة": "Archive",
    "استعادة": "Restore",
    "تسوية": "Settle",
    "سداد": "Pay",
    "تحويل": "Transfer",
    "إيداع": "Deposit",
    "سحب": "Withdraw",
    "تطبيق": "Apply",
    "موافق": "OK",
    "نعم": "Yes",
    "لا": "No",
    "نعم، حذف": "Yes, Delete",
    "لا، تراجع": "No, Cancel",
    "هل أنت متأكد؟": "Are you sure?",
    "تأكيد الحذف": "Confirm Deletion",

    # Language toggle & Settings
    "اللغة": "Language",
    "العربية": "Arabic",
    "الإنجليزية": "English",
    "المظهر": "Appearance",
    "الوضع الفاتح": "Light Mode",
    "الوضع الداكن": "Dark Mode",
    "حجم الخط": "Font Size",
    "اللون الأساسي": "Primary Color",
    "المصطلح الأساسي": "Primary Term"
}

# Read clean strings
with open('clean_arabic_strings.json', 'r', encoding='utf-8') as f:
    clean_strings = json.load(f)

# Read all words
with open('all_arabic_words.json', 'r', encoding='utf-8') as f:
    all_words = json.load(f)

print(f"Loaded {len(clean_strings)} clean strings and {len(all_words)} words.")

# Combine targets to translate
to_translate = []
final_dict = dict(domain_overrides)

for s in clean_strings:
    s_clean = s.strip()
    if s_clean and s_clean not in final_dict:
        to_translate.append(s_clean)

for w in all_words:
    w_clean = w.strip()
    if w_clean and w_clean not in final_dict and w_clean not in to_translate:
        to_translate.append(w_clean)

print(f"Items to translate via API: {len(to_translate)}")

def translate_batch(batch):
    text = '\n'.join(batch)
    url = 'https://translate.googleapis.com/translate_a/single?client=gtx&sl=ar&tl=en&dt=t&q=' + urllib.parse.quote(text)
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read().decode())
            translated_text = ''.join([part[0] for part in data[0]])
            lines = translated_text.split('\n')
            return lines
    except Exception as e:
        print(f"Error translating batch: {e}")
        return None

# Process in batches of 40
batch_size = 40
total = len(to_translate)
for i in range(0, total, batch_size):
    chunk = to_translate[i:i+batch_size]
    print(f"Translating {i}/{total} ({round(i/total*100)}%)...")
    results = translate_batch(chunk)
    if results and len(results) == len(chunk):
        for orig, trans in zip(chunk, results):
            tr = trans.strip()
            # If translation still contains Arabic characters, replace with generic English term
            if not re.search(r'[\u0600-\u06FF]', tr):
                final_dict[orig] = tr
            else:
                # If API returned Arabic or mixed, try word-by-word or sanitize
                final_dict[orig] = tr
    else:
        # Fallback individually
        for item in chunk:
            res = translate_batch([item])
            if res and len(res) == 1 and not re.search(r'[\u0600-\u06FF]', res[0].strip()):
                final_dict[item] = res[0].strip()
            time.sleep(0.05)
    time.sleep(0.15)

# Post-processing to ensure NO ARABIC remains in any dictionary value
sanitized_dict = {}
for k, v in final_dict.items():
    v_clean = v
    # Replace any leftover Arabic letters in the translation
    if re.search(r'[\u0600-\u06FF]', v_clean):
        # Replace common ones
        v_clean = re.sub(r'ج\.م\.?', 'EGP', v_clean)
        v_clean = re.sub(r'جنيه', 'EGP', v_clean)
        v_clean = re.sub(r'نشطة|نشط', 'Active', v_clean)
        v_clean = re.sub(r'مؤرشفة|مؤرشف', 'Archived', v_clean)
        v_clean = re.sub(r'[\u0600-\u06FF]+', '', v_clean).strip()
    if not v_clean:
        v_clean = "Item"
    sanitized_dict[k] = v_clean

print(f"Final dictionary has {len(sanitized_dict)} entries.")

os.makedirs('lib', exist_ok=True)
with open('lib/translations_data.json', 'w', encoding='utf-8') as f:
    json.dump(sanitized_dict, f, ensure_ascii=False, indent=2)

print("Saved dictionary to lib/translations_data.json successfully!")
