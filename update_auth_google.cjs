const fs = require('fs');

let content = fs.readFileSync('components/auth/AuthPage.tsx', 'utf8');

// 1. Add import for useToast
if (!content.includes("useToast")) {
    content = content.replace(
        "import React, { useState, useEffect } from 'react';",
        "import React, { useState, useEffect } from 'react';\nimport { useToast } from '../../hooks/useToast';"
    );
}

// 2. Add showToast and handleGoogleLogin inside CredentialsView
const handleGoogleLoginStr = `
    const { showToast } = useToast();

    const handleGoogleLogin = async () => {
      try {
        const { error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: window.location.origin,
          },
        });
        if (error) throw error;
      } catch (error: any) {
        showToast('حدث خطأ أثناء تسجيل الدخول بجوجل', 'error');
      }
    };
`;
if (!content.includes('handleGoogleLogin')) {
    content = content.replace(
        "const isForgot = view === 'forgot_password';",
        "const isForgot = view === 'forgot_password';" + handleGoogleLoginStr
    );
}

// 3. Add divider and Google button under the main login/signup button
const newButtons = `
                <button type="submit" onClick={createRipple} disabled={loading} className="group ripple-effect relative flex w-full justify-center rounded-lg bg-primary py-3 px-4 text-md font-semibold text-white hover:bg-primary-dark transition-all duration-300 disabled:opacity-50">
                    {isForgot || <span className="absolute inset-y-0 right-0 flex items-center pr-3"><ArrowLeftIcon className="h-5 w-5 text-emerald-300" /></span>}
                    {loading ? '...جاري التحميل' : isLogin ? 'تسجيل الدخول' : isForgot ? 'إرسال الرمز' : 'إنشاء الحساب'}
                </button>

                {!isForgot && (
                    <div className="mt-4 w-full">
                        <div className="flex items-center my-4">
                            <div className="flex-1 border-t border-neutral-200 dark:border-neutral-700"></div>
                            <span className="px-4 text-sm text-neutral-500 dark:text-neutral-400 font-medium">أو</span>
                            <div className="flex-1 border-t border-neutral-200 dark:border-neutral-700"></div>
                        </div>
                        
                        <button
                            type="button"
                            onClick={handleGoogleLogin}
                            disabled={loading}
                            className="flex items-center justify-center gap-3 w-full py-3 px-4 rounded-lg bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-700 active:scale-95 transition-all font-semibold text-md disabled:opacity-50"
                        >
                            <svg className="w-5 h-5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                            </svg>
                            <span>المتابعة باستخدام Google</span>
                        </button>
                    </div>
                )}
`;

content = content.replace(
    /<button type="submit" onClick={createRipple}[^>]*>[\s\S]*?<\/button>/,
    newButtons
);

fs.writeFileSync('components/auth/AuthPage.tsx', content);
console.log("Success");
