const fs = require('fs');
let code = fs.readFileSync('components/auth/AuthPage.tsx', 'utf8');

code = code.replace(
  "subheading = `أدخل رمز PIN الحالي لفتح حساب:\\n${account.greenhouseName || account.fullName}`;",
  "subheading = `${t('أدخل رمز PIN الحالي لفتح حساب:\\n')}${account.greenhouseName || account.fullName}`;"
);

code = code.replace(
  "subheading = `أدخل الرمز الحالي لإلغاء القفل لـ ${account.greenhouseName || account.fullName}`;",
  "subheading = `${t('أدخل الرمز الحالي لإلغاء القفل لـ ')}${account.greenhouseName || account.fullName}`;"
);

code = code.replace(
  "subheading = `اختر 4 أرقام لتسهيل الدخول لـ ${account.greenhouseName || account.fullName}`;",
  "subheading = `${t('اختر 4 أرقام لتسهيل الدخول لـ ')}${account.greenhouseName || account.fullName}`;"
);

code = code.replace(
  "subheading = \"أعد كتابة الرمز نفسه للتأكيد ومطابقة الحساب\";",
  "subheading = t('أعد كتابة الرمز نفسه للتأكيد ومطابقة الحساب');"
);

fs.writeFileSync('components/auth/AuthPage.tsx', code);
