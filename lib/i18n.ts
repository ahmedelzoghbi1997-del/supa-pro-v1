import { translationsData } from './translationsData';
import type { Language, Terminology } from '../types';

export type { Language };

const translations: Record<string, string> = translationsData;

// Domain terminology translations
export const englishTerminology: Record<Terminology, { singular: string; plural: string; new: string }> = {
  cycle: { singular: "Cycle", plural: "Cycles", new: "Cycle" },
  season: { singular: "Season", plural: "Seasons", new: "Season" },
};

export const arabicTerminology: Record<Terminology, { singular: string; plural: string; new: string }> = {
  cycle: { singular: "العروة", plural: "العروات", new: "عروة" },
  season: { singular: "الموسم", plural: "المواسم", new: "موسم" },
};

export function getTerminology(term: Terminology, lang: Language = 'ar') {
  return lang === 'en' ? englishTerminology[term] : arabicTerminology[term];
}

const arabicCharRegex = /[\u0600-\u06FF]/;

// Core domain high-fidelity terminology overrides
const domainOverrides: Record<string, string> = {
  // 1. Status Badges
  'نشطة': 'Active',
  'مؤرشفة': 'Archived',
  'مكتملة': 'Completed',
  'قيد العمل': 'In Progress',
  'قيد التنفيذ': 'In Progress',
  'معلقة': 'Pending',
  'مسددة': 'Paid',
  'غير مسددة': 'Unpaid',
  'مدفوعة': 'Paid',
  'غير مدفوعة': 'Unpaid',
  'مدفوعة جزئياً': 'Partially Paid',
  'مسدد جزئياً': 'Partially Paid',
  'نقد': 'Cash',
  'نقداً': 'Cash',
  'آجل': 'Credit',

  // 2. Current loop -> Current Cycle / Active Season
  'العروة الحالية': 'Current Cycle',
  'عروة حالية': 'Current Cycle',
  'العروة النشطة': 'Active Season',
  'عروة نشطة': 'Active Season',
  'الدورة الحالية': 'Current Cycle',
  'دورة حالية': 'Current Cycle',
  'العروات الحالية': 'Current Cycles',
  'العروات النشطة': 'Active Cycles',
  'العروة': 'Cycle',
  'عروة': 'Cycle',
  'العروات': 'Cycles',
  'عروات': 'Cycles',
  'اسم العروة': 'Cycle Name',
  'إغلاق العروة': 'Close Cycle',
  'تفعيل العروة': 'Activate Cycle',
  'حذف العروة': 'Delete Cycle',

  // 3. History -> Date
  'تاريخ': 'Date',
  'التاريخ': 'Date',
  'تاريخ اليوم': "Today's Date",
  'تاريخ الفاتورة': 'Invoice Date',
  'تاريخ الصرف': 'Disbursement Date',
  'تاريخ الحركة': 'Transaction Date',
  'تاريخ التوريد': 'Delivery Date',
  'تاريخ البدء': 'Start Date',
  'تاريخ البداية': 'Start Date',
  'تاريخ الانتهاء': 'End Date',
  'تاريخ النهاية': 'End Date',
  'تاريخ السداد': 'Payment Date',
  'تاريخ الاستحقاق': 'Due Date',
  'تاريخ التحصيل': 'Collection Date',
  'اختر التاريخ': 'Select Date',
  'تحديد التاريخ': 'Select Date',
  'فلترة بالتاريخ': 'Filter by Date',
  'حسب التاريخ': 'By Date',
  'تاريخ المعاملة': 'Transaction Date',
  'التاريخ (إجباري)': 'Date (Required)',
  'التاريخ (إلزامي)': 'Date (Required)',
  'تاريخ (إجباري)': 'Date (Required)',
  'تاريخ (إلزامي)': 'Date (Required)',
  'HISTORY (MANDATORY)': 'Date (Required)',
  'History (mandatory)': 'Date (Required)',

  // Treasury Flow & Source Terminology
  'من': 'From',
  'من الصوبة': 'From Greenhouse',
  'من صوبة': 'From Greenhouse',
  'من الصوب': 'From Greenhouses',
  'من الخزنة': 'From Treasury',
  'من البنك': 'From Bank',
  'من المزرعة': 'From Farm',
  'من المزارع': 'From Farmer',
  'من المورد': 'From Supplier',
  'من التاجر': 'From Merchant',
  'من العميل': 'From Customer',
  'منصرف': 'Outflow',
  'المنصرف': 'Outflow',
  'منصرفة': 'Outflow',
  'منصرفات': 'Outflows',
  'المنصرفات': 'Outflows',
  'وارد': 'Inflow',
  'الوارد': 'Inflow',
  'واردة': 'Inflow',
  'واردات': 'Inflows',
  'إجمالي الداخل': 'Total Inflow',
  'إجمالي الخارج': 'Total Outflow',
  'إجمالي الوارد': 'Total Inflow',
  'إجمالي المنصرف': 'Total Outflow',
  'إجمالي المنصرف ⬆️': 'Total Outflow ⬆️',
  'الداخل': 'Inflow',
  'الخارج': 'Outflow',
  'إجمالي الحركات المنصرفة المعروضة': 'Total Outflow Transactions Displayed',
  'إجمالي الحركات الواردة المعروضة': 'Total Inflow Transactions Displayed',
  'لا توجد حركات منصرفة مسجلة': 'No outflow transactions recorded',
  'لا توجد حركات واردة مسجلة': 'No inflow transactions recorded',

  // Cycle Production Reports
  'إجمالي إنتاج العروة': 'Total Cycle Production',
  'إنتاج العروة': 'Cycle Production',
  'إنتاج العروات': 'Cycles Production',
  'إجمالي إنتاج الموسم': 'Total Season Production',
  'برواية': 'Across',
  'شحنات بيع': 'Shipments',
  'شحنات بيع.': 'Shipments.',
  'شحنة بيع': 'Shipment',
  'شحنات': 'Shipments',
  'معدل تحميل مستقر': 'Average Daily Shipments',
  'معدل التحميل المستقر': 'Average Daily Shipments',
  'تحميل مستقر': 'Average Daily Shipments',

  // Modals & Form Validations
  'تسجيل يومية وحضور عمالة': 'Record Daily Wage & Attendance',
  'تسجيل يومية وحضور العمالة': 'Record Daily Wage & Attendance',
  'يرجى تحديد نشاط واحد على الأقل': 'Please select at least one activity.',
  'يرجى تحديد نشاط واحد على الأقل.': 'Please select at least one activity.',
  'يرجى النقر على نشاط واحد على الأقل لتحديده لهذا الكشف': 'Please select at least one activity.',
  'يرجى النقر على نشاط واحد على الأقل لتحديده لهذا الكشف.': 'Please select at least one activity.',
  'برجاء اختيار نشاط واحد على الأقل لكشف اليومية': 'Please select at least one activity.',
  'برجاء اختيار نشاط واحد على الأقل لكشف اليومية.': 'Please select at least one activity.',
  'يجب اختيار نشاط واحد على الأقل ليتم حفظ التعديل': 'Please select at least one activity.',
  'يجب اختيار نشاط واحد على الأقل ليتم حفظ التعديل.': 'Please select at least one activity.',
  'برجاء كتابة النشاط أولاً قبل حفظ كشف العمالة': 'Please select at least one activity.',
  'برجاء كتابة النشاط أولاً قبل حفظ كشف العمالة.': 'Please select at least one activity.',
  'اختيار نشاط واحد على الأقل': 'Select at least one activity',
  'تاريخ التحصيل': 'Collection Date',
  'اختر التاريخ': 'Select Date',
  'تحديد التاريخ': 'Select Date',
  'فلترة بالتاريخ': 'Filter by Date',
  'حسب التاريخ': 'By Date',
  'تاريخ المعاملة': 'Transaction Date',

  // 4. Run -> Operational | Establishment -> Capital / Setup
  'تشغيل': 'Operational',
  'التشغيل': 'Operational',
  'تشغيلي': 'Operational',
  'مصروف تشغيلي': 'Operational Expense',
  'مصروفات تشغيل': 'Operational Expenses',
  'مصاريف تشغيل': 'Operational Expenses',
  'مصروفات تشغيلية': 'Operational Expenses',
  'مصاريف تشغيلية': 'Operational Expenses',
  'مصروفات التشغيل': 'Operating Expenses',
  'تكاليف التشغيل': 'Operating Costs',
  'تأسيس': 'Capital / Setup',
  'التأسيس': 'Capital / Setup',
  'تأسيسي': 'Capital / Setup',
  'مصروف تأسيسي': 'Setup / Capital Expense',
  'مصروفات تأسيس': 'Setup / Capital Expenses',
  'مصاريف تأسيس': 'Setup / Capital Expenses',
  'تكلفة التأسيس': 'Setup Cost',
  'تكاليف التأسيس': 'Setup Costs',
  'مصروفات التأسيس': 'Capital / Setup Expenses',

  // 5. Cage -> Crate
  'قفص': 'Crate',
  'القفص': 'Crate',
  'أقفاص': 'Crates',
  'الأقفاص': 'Crates',
  'سعر القفص': 'Crate Price',
  'عدد الأقفاص': 'Number of Crates',
  'وزن القفص': 'Crate Weight',
  'معدل القفص': 'Average per Crate',
  'أقفاص فارغة': 'Empty Crates',
  'أقفاص ممتلئة': 'Full Crates',
  'صافي الأقفاص': 'Net Crates',
  'قفص فارغ': 'Empty Crate',
  'قفص ممتلئ': 'Full Crate',
  'فوارغ': 'Empty Crates',
  'الفوارغ': 'Empty Crates',

  // 6. Transit (market) -> Al-Obour Market or Wholesale Market
  'العبور': 'Al-Obour Market',
  'سوق العبور': 'Al-Obour Wholesale Market',
  'سوق جملة': 'Wholesale Market',
  'سوق الجملة': 'Wholesale Market',
  'وكالة العبور': 'Al-Obour Agency',
  'وكيل العبور': 'Al-Obour Commission Agent',
  'معلم العبور': 'Al-Obour Merchant',
  'مكتب العبور': 'Al-Obour Office',
  'الوكالة': 'Market Agency',
  'وكالة': 'Market Agency',

  // 7. Download (market fee) -> Handling / Unloading Fee
  'مشال': 'Handling / Unloading Fee',
  'المشال': 'Handling / Unloading Fee',
  'تنزيل': 'Handling / Unloading Fee',
  'التنزيل': 'Handling / Unloading Fee',
  'تحميل': 'Loading Fee',
  'التحميل': 'Loading Fee',
  'مشال وتنزيل': 'Handling & Unloading Fee',
  'مصاريف مشال': 'Handling Expenses',
  'رسوم تنزيل': 'Unloading Fee',
  'أجرة مشال': 'Handling / Unloading Fee',

  // 8. A gift (market discount) -> Market Allowance
  'وهبة': 'Market Allowance',
  'الوهبة': 'Market Allowance',
  'خصم وهبة': 'Market Allowance',
  'خصم الوهبة': 'Market Allowance Discount',
  'وهبة السوق': 'Market Allowance',

  // 9. Plural (farm labor activity) -> Harvesting / Picking
  'جمع': 'Harvesting / Picking',
  'الجمع': 'Harvesting / Picking',
  'جني': 'Harvesting / Picking',
  'الجني': 'Harvesting / Picking',
  'حصاد': 'Harvest',
  'الحصاد': 'Harvest',
  'يومية جمع': 'Harvesting Daily Log',
  'عمال جمع': 'Harvesting Workers',
  'جمع محصول': 'Crop Harvesting',
  'جمع وطرح': 'Picking & Sorting',

  // 10. Scratching (soil) -> Hoeing / Weeding
  'خربشة': 'Hoeing / Weeding',
  'الخربشة': 'Hoeing / Weeding',
  'عزق': 'Hoeing',
  'العزق': 'Hoeing',
  'تنقية حشائش': 'Weeding',
  'خربشة الأرض': 'Soil Hoeing / Weeding',
  'خربشة التربة': 'Soil Hoeing / Weeding',

  // 11. Roll (plant training) -> Trellising / Vine Training
  'لف': 'Trellising / Vine Training',
  'اللف': 'Trellising / Vine Training',
  'توجيه': 'Vine Training',
  'التوجيه': 'Vine Training',
  'تربيط': 'Trellising / Tying',
  'التربيط': 'Trellising / Tying',
  'لف الخيط': 'Vine Stringing',
  'لف وتوجيه': 'Trellising & Training',
  'توجيه شتلات': 'Seedling Training',
  'لف وبرعمه': 'Vine Training & Budding',

  // 12. Reveal the diary -> Daily Attendance Log
  'كشف اليوميات': 'Daily Attendance Log',
  'كشف يوميات': 'Daily Attendance Log',
  'سجل اليوميات': 'Daily Attendance Log',
  'سجل يوميات': 'Daily Attendance Log',
  'كشف العمال': 'Worker Attendance Sheet',
  'كشف حضور': 'Attendance Sheet',
  'يوميات العمال': 'Worker Daily Logs',
  'اليوميات': 'Daily Attendance Logs',
  'سجل الحضور': 'Attendance Record',

  // 13. Virtual journal -> Default Daily Wage
  'يومية افتراضية': 'Default Daily Wage',
  'اليومية الافتراضية': 'Default Daily Wage',
  'أجر اليومية': 'Daily Wage Rate',
  'قيمة اليومية': 'Daily Wage',
  'أجر يومي': 'Daily Wage',

  // 14. Lockers Cash -> Cash Vaults / Drawers
  'خزائن النقدية': 'Cash Vaults / Drawers',
  'الخزائن النقدية': 'Cash Vaults / Drawers',
  'خزائن نقدية': 'Cash Vaults / Drawers',
  'خزينة نقدية': 'Cash Vault / Drawer',
  'الخزينة النقدية': 'Cash Vault / Drawer',
  'صناديق نقدية': 'Cash Drawers',
  'صندوق النقدية': 'Cash Drawer',
  'خزائن النقد': 'Cash Vaults',
  'الخزائن': 'Vaults / Safes',
  'الخزنة': 'Treasury / Cash Vault',
  'خزنة': 'Treasury / Safe',

  // 15. Total cash in cash -> Total Cash on Hand
  'إجمالي النقدية بالخزينة': 'Total Cash on Hand',
  'إجمالي النقدية في الخزنة': 'Total Cash on Hand',
  'إجمالي النقدية': 'Total Cash on Hand',
  'النقدية بالخزينة': 'Cash on Hand',
  'النقدية في الخزنة': 'Cash on Hand',
  'رصيد النقدية': 'Cash Balance',
  'النقدية المتاحة': 'Available Cash',
  'رصيد الخزنة': 'Treasury Balance',

  // 16. Item (save button) -> Save Expense / Add Item
  'حفظ البند': 'Save Expense',
  'تأكيد وحفظ': 'Save Expense',
  'إضافة بند': 'Add Item',
  'إضافة بند جديد': 'Add New Item',
  'بند المصروف': 'Expense Item',
  'بند مصروف': 'Expense Item',
  'اسم البند': 'Item Name',
  'حفظ المصروف': 'Save Expense',
  'حفظ الفاتورة': 'Save Invoice',
  'حفظ التعديلات': 'Save Changes',

  // Common UI entities
  'اسم العميل': 'Customer Name',
  'اسم التاجر': 'Merchant Name',
  'اسم المورد': 'Supplier Name',
  'اسم العامل': 'Worker Name',
  'أدخل اسم الصنف': 'Enter item name',
  'البيان': 'Description',
  'ملاحظات': 'Notes',
  'المبلغ المدفوع': 'Amount Paid',
  'المبلغ المتبقي': 'Remaining Amount',
  'المبلغ الكلي': 'Total Amount',
  'صافي الربح': 'Net Profit',
  'إجمالي الإيرادات': 'Total Revenue',
  'إجمالي المصروفات': 'Total Expenses',
  'كشف حساب': 'Statement of Account',
  'تقرير تفصيلي': 'Detailed Report',
  'تصدير PDF': 'Export PDF',
  'تصدير Excel': 'Export Excel',
  'طباعة': 'Print',
  'حفظ': 'Save',
  'إلغاء': 'Cancel',
  'تعديل': 'Edit',
  'حذف': 'Delete',
  'تأكيد': 'Confirm',
  'إغلاق': 'Close',
  'إضافة': 'Add',
  'بحث...': 'Search...',
  'بحث': 'Search',
  'تصفية': 'Filter',
  'الكل': 'All',
  'تسجيل الخروج': 'Logout',
  'تسجيل الدخول': 'Login',
  'المحاسب الزراعي': 'Agri Accountant',
  'المحاسبة اليومية': 'Daily Accounting',
  'لوحة التحكم': 'Dashboard',
  'الفواتير': 'Invoices',
  'المصروفات': 'Expenses',
  'المواسم': 'Seasons',
  'الموردين': 'Suppliers',
  'حساب المزارع': 'Farmer Account',
  'السلف': 'Advances',
  'محفظة الشركاء': 'Partners Wallet',
  'العمالة': 'Labor',
  'الأصول والصوب': 'Assets & Greenhouses',
  'التحليل الأسبوعي': 'Weekly Analysis',
  'الإعدادات': 'Settings',
  'المستخدمين': 'Users',
  'الاشتراك': 'Subscription',
  'جاري التحميل...': 'Loading...',
  'جاري الحفظ...': 'Saving...',
  'جاري التحديث...': 'Updating...',
  'مزامن': 'Synced',
  'غير متصل': 'Offline',
  'لا توجد بيانات': 'No data available',
  'لا توجد سجلات': 'No records found',
};

/**
 * Translates a single text string from Arabic to English if lang === 'en'.
 * Guarantees that no Arabic characters remain when lang === 'en'.
 */
export function translateText(text: string, lang: Language = 'ar'): string {
  if (lang !== 'en' || !text || typeof text !== 'string') {
    return text;
  }

  // If text does not contain Arabic characters, return as is
  if (!arabicCharRegex.test(text)) {
    return text;
  }

  // Check direct domain overrides first
  if (domainOverrides[text]) {
    return domainOverrides[text];
  }

  const trimmed = text.trim();
  if (domainOverrides[trimmed]) {
    const leading = text.match(/^\s*/)?.[0] || '';
    const trailing = text.match(/\s*$/)?.[0] || '';
    return leading + domainOverrides[trimmed] + trailing;
  }

  // 1. Direct exact match in dictionary
  if (translations[text]) {
    return translations[text];
  }

  // 2. Trimmed match in dictionary
  if (translations[trimmed]) {
    const leading = text.match(/^\s*/)?.[0] || '';
    const trailing = text.match(/\s*$/)?.[0] || '';
    return leading + translations[trimmed] + trailing;
  }

  // 3. Check with surrounding punctuation stripped
  const punctMatch = trimmed.match(/^([(\[{<'"«-]*)(.*?)([)\]}>'"»:,.-]*)$/);
  if (punctMatch && punctMatch[2]) {
    const prefix = punctMatch[1];
    const core = punctMatch[2].trim();
    const suffix = punctMatch[3];
    const coreTrans = domainOverrides[core] || translations[core];
    if (coreTrans) {
      const leading = text.match(/^\s*/)?.[0] || '';
      const trailing = text.match(/\s*$/)?.[0] || '';
      return leading + prefix + coreTrans + suffix + trailing;
    }
  }

  // 4. Word-by-word tokenized translation for compound phrases and dynamic expressions
  let result = text;

  // Replace currencies & common markers
  result = result.replace(/ج\.م\.?/g, 'EGP')
                 .replace(/جنيه مصري/g, 'EGP')
                 .replace(/جنيه/g, 'EGP')
                 .replace(/كجم/g, 'kg')
                 .replace(/كيلو/g, 'kg')
                 .replace(/طن/g, 'ton');

  // Replace dates / months
  const monthMap: Record<string, string> = {
    'يناير': 'January', 'فبراير': 'February', 'مارس': 'March', 'أبريل': 'April',
    'مايو': 'May', 'يونيو': 'June', 'يوليو': 'July', 'أغسطس': 'August',
    'سبتمبر': 'September', 'أكتوبر': 'October', 'نوفمبر': 'November', 'ديسمبر': 'December',
    'السبت': 'Saturday', 'الأحد': 'Sunday', 'الإثنين': 'Monday', 'الاثنين': 'Monday',
    'الثلاثاء': 'Tuesday', 'الأربعاء': 'Wednesday', 'الخميس': 'Thursday', 'الجمعة': 'Friday'
  };
  for (const [mAr, mEn] of Object.entries(monthMap)) {
    result = result.replace(new RegExp(mAr, 'g'), mEn);
  }

  // Replace token by token
  const tokens = result.split(/([\s،,:;()\[\]{}<>\/\\\-+="'`«»]+)/);
  const translatedTokens = tokens.map(token => {
    if (!arabicCharRegex.test(token)) {
      return token;
    }
    const cleanToken = token.trim();
    if (domainOverrides[cleanToken]) {
      return domainOverrides[cleanToken];
    }
    if (translations[cleanToken]) {
      return translations[cleanToken];
    }
    // Try without Al- prefix (ال)
    if (cleanToken.startsWith('ال') && cleanToken.length > 3) {
      const stem = cleanToken.slice(2);
      if (domainOverrides[stem]) return domainOverrides[stem];
      if (translations[stem]) return translations[stem];
    }
    // Try without Wa- prefix (و)
    if (cleanToken.startsWith('و') && cleanToken.length > 2) {
      const stem = cleanToken.slice(1);
      if (domainOverrides[stem]) return 'and ' + domainOverrides[stem];
      if (translations[stem]) return 'and ' + translations[stem];
    }
    // Try without Bi- prefix (ب)
    if (cleanToken.startsWith('ب') && cleanToken.length > 2) {
      const stem = cleanToken.slice(1);
      if (domainOverrides[stem]) return 'with ' + domainOverrides[stem];
      if (translations[stem]) return 'with ' + translations[stem];
    }
    // Try without Li- prefix (ل)
    if (cleanToken.startsWith('ل') && cleanToken.length > 2) {
      const stem = cleanToken.slice(1);
      if (domainOverrides[stem]) return 'for ' + domainOverrides[stem];
      if (translations[stem]) return 'for ' + translations[stem];
    }
    // Strip any remaining untranslated Arabic letters to ensure strict 0% Arabic presence
    return '';
  });

  let translatedString = translatedTokens.join('').replace(/\s+/g, ' ').trim();
  // Strip any leftover Arabic characters completely
  translatedString = translatedString.replace(/[\u0600-\u06FF]/g, '').trim();
  // Deduplicate any repeated currency markers like "EGP EGP"
  translatedString = translatedString.replace(/\b(EGP\s*)+EGP\b/gi, 'EGP');

  // Capitalize first letter if valid English text
  if (translatedString.length > 0 && /^[a-zA-Z]/.test(translatedString)) {
    translatedString = translatedString.charAt(0).toUpperCase() + translatedString.slice(1);
  }

  return translatedString.replace(/\b(EGP\s*)+EGP\b/gi, 'EGP') || text.replace(/[\u0600-\u06FF]/g, '').trim() || '—';
}

/**
 * Fast lookup helper for components
 */
export function t(key: string, lang: Language = 'ar'): string {
  return translateText(key, lang);
}

// Memory stores for DOM nodes to preserve original text when switching between ar/en
const nodeOriginalText = new WeakMap<Node, string>();
const elementOriginalAttributes = new WeakMap<Element, Record<string, string>>();

let isTranslating = false;
let currentLanguage: Language = 'ar';
let domObserver: MutationObserver | null = null;

function translateNode(node: Node, lang: Language) {
  if (node.nodeType === Node.TEXT_NODE) {
    const currentText = node.nodeValue || '';
    if (!nodeOriginalText.has(node)) {
      nodeOriginalText.set(node, currentText);
    }

    if (lang === 'en') {
      const original = nodeOriginalText.get(node) || currentText;
      if (arabicCharRegex.test(original)) {
        let translated = translateText(original, 'en');
        // Prevent duplicate EGP if immediately preceding sibling already ends with EGP
        if (translated.trim() === 'EGP' && node.previousSibling && node.previousSibling.textContent?.trim().endsWith('EGP')) {
          translated = '';
        }
        translated = translated.replace(/\b(EGP\s*)+EGP\b/gi, 'EGP');
        if (node.nodeValue !== translated) {
          node.nodeValue = translated;
        }
      } else if (node.nodeValue && /\b(EGP\s*)+EGP\b/i.test(node.nodeValue)) {
        node.nodeValue = node.nodeValue.replace(/\b(EGP\s*)+EGP\b/gi, 'EGP');
      }
    } else {
      const original = nodeOriginalText.get(node);
      if (original !== undefined && node.nodeValue !== original) {
        node.nodeValue = original;
      }
    }
    return;
  }

  if (node.nodeType === Node.ELEMENT_NODE) {
    const el = node as Element;
    // Don't translate scripts or styles
    if (el.tagName === 'SCRIPT' || el.tagName === 'STYLE' || el.tagName === 'NOSCRIPT') {
      return;
    }

    const attrs = ['placeholder', 'title', 'aria-label', 'alt'];
    if (el instanceof HTMLInputElement && (el.type === 'button' || el.type === 'submit')) {
      attrs.push('value');
    }

    for (const attr of attrs) {
      if (el.hasAttribute(attr)) {
        const currentVal = el.getAttribute(attr) || '';
        let storedAttrs = elementOriginalAttributes.get(el);
        if (!storedAttrs) {
          storedAttrs = {};
          elementOriginalAttributes.set(el, storedAttrs);
        }
        if (!(attr in storedAttrs)) {
          storedAttrs[attr] = currentVal;
        }

        if (lang === 'en') {
          const original = storedAttrs[attr] || currentVal;
          if (arabicCharRegex.test(original)) {
            const translated = translateText(original, 'en');
            if (el.getAttribute(attr) !== translated) {
              el.setAttribute(attr, translated);
            }
          }
        } else {
          const original = storedAttrs[attr];
          if (original !== undefined && el.getAttribute(attr) !== original) {
            el.setAttribute(attr, original);
          }
        }
      }
    }

    // Traverse children
    for (let i = 0; i < el.childNodes.length; i++) {
      translateNode(el.childNodes[i], lang);
    }
  }
}

/**
 * Applies full translation to the entire document DOM and activates observer
 */
export function applyLanguage(lang: Language) {
  currentLanguage = lang;
  if (typeof document === 'undefined') return;

  const docEl = document.documentElement;
  docEl.lang = lang;
  docEl.dir = lang === 'en' ? 'ltr' : 'rtl';

  if (lang === 'en') {
    docEl.classList.add('lang-en');
    docEl.classList.remove('lang-ar');
    document.body.classList.add('font-sans');
  } else {
    docEl.classList.add('lang-ar');
    docEl.classList.remove('lang-en');
  }

  isTranslating = true;
  try {
    translateNode(document.body, lang);
  } finally {
    isTranslating = false;
  }

  // Setup observer if not already established
  if (!domObserver) {
    let timeoutId: number | null = null;
    domObserver = new MutationObserver((mutations) => {
      if (isTranslating || currentLanguage !== 'en') return;

      let shouldTranslate = false;
      for (const m of mutations) {
        if (m.type === 'childList' && (m.addedNodes.length > 0)) {
          shouldTranslate = true;
          break;
        }
        if (m.type === 'characterData' && arabicCharRegex.test(m.target.nodeValue || '')) {
          shouldTranslate = true;
          break;
        }
        if (m.type === 'attributes' && (m.target instanceof Element)) {
          const el = m.target;
          const attr = m.attributeName;
          if (attr && ['placeholder', 'title', 'aria-label', 'alt'].includes(attr)) {
            const val = el.getAttribute(attr) || '';
            if (arabicCharRegex.test(val)) {
              shouldTranslate = true;
              break;
            }
          }
        }
      }

      if (shouldTranslate) {
        if (timeoutId) cancelAnimationFrame(timeoutId);
        timeoutId = requestAnimationFrame(() => {
          isTranslating = true;
          try {
            translateNode(document.body, 'en');
          } finally {
            isTranslating = false;
          }
        });
      }
    });

    domObserver.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ['placeholder', 'title', 'aria-label', 'alt', 'value'],
    });
  }
}
