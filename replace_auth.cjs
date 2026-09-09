const fs = require('fs');

let content = fs.readFileSync('components/auth/AuthPage.tsx', 'utf8');

// 1. Remove isVirtual state
content = content.replace(/const \[isVirtual, setIsVirtual\] = useState\(false\);\n/, '');

// 2. Replace email/username states with identifier
content = content.replace(/const \[email, setEmail\] = useState\(''\);\n\s*const \[username, setUsername\] = useState\(''\);/, "const [identifier, setIdentifier] = useState('');");

// 3. Update resetFormState
content = content.replace(
/const resetFormState = \(\) => \{\s*setError\(null\);\s*setMessage\(null\);\s*setEmail\(''\);\s*setUsername\(''\);/,
"const resetFormState = () => {\n    setError(null);\n    setMessage(null);\n    setIdentifier('');"
);

// 4. Update handleLogin
const newHandleLogin = `const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    const isOwner = identifier.includes('@');

    if (!isOwner) {
        try {
            // Using RPC function to bypass RLS securely for virtual login
            const { data, error: supabaseError } = await supabase.rpc('virtual_login', {
                p_username: identifier,
                p_password: password
            });

            let vMember = Array.isArray(data) ? data[0] : data;

            if (supabaseError || !vMember || !vMember.id) {
                // If RPC failed or wasn't found, attempt server API fallback
                try {
                    const res = await fetch('/api/auth/virtual-login', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ username: identifier, password })
                    });
                    const serverData = await res.json();
                    if (res.ok && serverData.user) {
                        vMember = {
                            id: serverData.user.id.replace('virtual_', ''),
                            full_name: serverData.user.full_name,
                            role: serverData.user.role,
                            owner_id: serverData.user.parent_id,
                            username: serverData.user.username
                        };
                    } else if (serverData.error) {
                        setError('بيانات الدخول غير صحيحة');
                        setLoading(false);
                        return;
                    }
                } catch {
                    // Ignore fallback fetch error and check vMember
                }
            }

            if (!vMember || !vMember.id) {
                setError('بيانات الدخول غير صحيحة');
            } else {
                const virtualUser = {
                  id: \`virtual_\${vMember.id}\`,
                  full_name: vMember.full_name,
                  role: vMember.role,
                  parent_id: vMember.owner_id,
                  username: vMember.username
                };
                localStorage.setItem('virtual_auth', JSON.stringify(virtualUser));
                await Preferences.set({ key: 'virtual_auth', value: JSON.stringify(virtualUser) });
                
                // Save/update this account to saved accounts list automatically
                const gName = (vMember.full_name && (vMember.full_name.includes('صوبة') || vMember.full_name.includes('مشاهد') || vMember.full_name.includes('مطلع'))) ? vMember.full_name : undefined;
                await saveAccount({
                  id: virtualUser.id,
                  username: identifier,
                  password,
                  fullName: vMember.full_name,
                  role: vMember.role,
                  isVirtual: true,
                  greenhouseName: gName
                });
                await setLastActiveAccount(virtualUser.id);
                
                window.location.reload();
            }
        } catch (err) {
            console.error("Virtual Login Exception:", err);
            setError('بيانات الدخول غير صحيحة');
        }
    } else {
        const { data: authData, error } = await supabase.auth.signInWithPassword({ email: identifier, password });
        if (error) {
            if (error.message.includes('Email not confirmed')) {
                setError('لم يتم تأكيد بريدك الإلكتروني. يرجى إدخال الرمز الذي تم إرساله.');
                setOtpFlow('signup');
                setView('verify_otp');
            } else {
                setError('بيانات الدخول غير صحيحة');
            }
        } else if (authData?.user) {
            await Preferences.remove({ key: 'was_explicitly_logged_out' });
            try {
                const { data: profData } = await supabase
                    .from('profiles')
                    .select('full_name, role')
                    .eq('id', authData.user.id)
                    .single();
                
                await saveAccount({
                    id: authData.user.id,
                    email: identifier,
                    password,
                    fullName: profData?.full_name || 'مالك',
                    role: profData?.role || 'owner',
                    isVirtual: false,
                    greenhouseName: profData?.full_name || 'المالك الرئيسي'
                });
                await setLastActiveAccount(authData.user.id);
            } catch (err) {
                console.error("Error saving real auth profile:", err);
            }
            window.location.reload();
        }
    }
    setLoading(false);
  };`;

content = content.replace(/const handleLogin = async.*?setLoading\(false\);\n  \};\n/s, newHandleLogin + '\n');

// 5. Update email usage in auth operations
content = content.replace(/email,/g, 'email: identifier,');
content = content.replace(/email\)/g, 'identifier)');

// 6. Update VerifyOtpView usage
content = content.replace(/email={email}/, 'email={identifier}');

// 7. Update CredentialsView Props in renderContent
content = content.replace(
/<CredentialsView\s+view={view}\s+setView=\{\(v: View\) => \{ setView\(v\); resetFormState\(\); \}\}\s+email={email} setEmail={setEmail}\s+username={username} setUsername={setUsername}\s+isVirtual={isVirtual} setIsVirtual={setIsVirtual}/,
`<CredentialsView 
                    view={view} 
                    setView={(v: View) => { setView(v); resetFormState(); }}
                    identifier={identifier} setIdentifier={setIdentifier}`
);

// 8. Update CredentialsViewProps interface
content = content.replace(
/interface CredentialsViewProps \{.*?hasSavedAccounts\?: boolean;\n\}/s,
`interface CredentialsViewProps {
    view: View;
    setView: (v: View) => void;
    identifier: string;
    setIdentifier: (v: string) => void;
    password: string;
    setPassword: (v: string) => void;
    fullName: string;
    setFullName: (v: string) => void;
    handleLogin: (e: React.FormEvent) => void;
    handleSignUp: (e: React.FormEvent) => void;
    handlePasswordResetRequest: (e: React.FormEvent) => void;
    loading: boolean;
    error: string | null;
    message: string | null;
    hasSavedAccounts?: boolean;
}`
);

// 9. Update CredentialsView Component
const newCredentialsView = `const CredentialsView: React.FC<CredentialsViewProps> = ({ 
    view, setView, identifier, setIdentifier,
    password, setPassword, fullName, setFullName, handleLogin, handleSignUp, 
    handlePasswordResetRequest, loading, error, message, hasSavedAccounts = false
}) => {
    const isLogin = view === 'login';
    const isForgot = view === 'forgot_password';
    
    return (
        <>
         <div className="text-center">
          <h2 className="mt-6 lg:mt-0 text-3xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50">
            {isLogin ? 'مرحباً بعودتك' : isForgot ? 'إعادة تعيين كلمة المرور' : 'إنشاء حساب جديد'}
          </h2>
          <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
            {isForgot ? 'أدخل بريدك الإلكتروني لإرسال رمز الاستعادة.' : isLogin ? 'ليس لديك حساب؟' : 'لديك حساب بالفعل؟'}{' '}
            {!isForgot && (
                <a href="#" onClick={(e) => { e.preventDefault(); setView(isLogin ? 'signup' : 'login'); }} className="font-medium text-primary hover:text-primary-light transition-colors">
                {isLogin ? 'أنشئ حسابًا' : 'سجل الدخول'}
                </a>
            )}
          </p>
        </div>

        {error && <div className="flex items-center gap-3 text-sm text-accent-danger bg-accent-danger/10 p-3 rounded-md"><WarningIcon className="h-5 w-5 flex-shrink-0" /><p>{error}</p></div>}
        {message && <div className="flex items-center gap-3 text-sm text-accent-success bg-accent-success/10 p-3 rounded-md"><CheckCircleIcon className="h-5 w-5 flex-shrink-0" /><p>{message}</p></div>}
        
        <form className="mt-8 space-y-6" onSubmit={isLogin ? handleLogin : isForgot ? handlePasswordResetRequest : handleSignUp}>
            <div className="space-y-4 rounded-md">
                {!isLogin && !isForgot && (
                    <InputField icon={UserIcon} type="text" placeholder="الاسم الكامل" id="full-name" value={fullName} onChange={e => setFullName(e.target.value)} autoComplete="name" />
                )}
                {isLogin ? (
                    <InputField icon={UserIcon} type="text" placeholder="البريد الإلكتروني أو اسم المستخدم" id="identifier" value={identifier} onChange={e => setIdentifier(e.target.value)} autoComplete="username" />
                ) : (
                    <InputField icon={UserIcon} type="email" placeholder="البريد الإلكتروني" id="identifier" value={identifier} onChange={e => setIdentifier(e.target.value)} autoComplete="email" />
                )}
                {!isForgot && (
                    <InputField icon={LockClosedIcon} type="password" placeholder="كلمة المرور" id="password" value={password} onChange={e => setPassword(e.target.value)} autoComplete={isLogin ? "current-password" : "new-password"} />
                )}
            </div>

            {isLogin && (
                <div className="flex items-center justify-end">
                    <div className="text-sm">
                        <a href="#" onClick={(e) => { e.preventDefault(); setView('forgot_password'); }} className="font-medium text-primary hover:text-primary-light transition-colors">
                        هل نسيت كلمة المرور؟
                        </a>
                    </div>
                </div>
            )}

             <div className="space-y-3">
                <button type="submit" onClick={createRipple} disabled={loading} className="group ripple-effect relative flex w-full justify-center rounded-lg bg-primary py-3 px-4 text-md font-semibold text-white hover:bg-primary-dark transition-all duration-300 disabled:opacity-50">
                    {isForgot || <span className="absolute inset-y-0 right-0 flex items-center pr-3"><ArrowLeftIcon className="h-5 w-5 text-emerald-300" /></span>}
                    {loading ? '...جاري التحميل' : isLogin ? 'تسجيل الدخول' : isForgot ? 'إرسال الرمز' : 'إنشاء الحساب'}
                </button>
                {hasSavedAccounts && isLogin && (
                    <button
                        type="button"
                        onClick={() => setView('saved_accounts')}
                        className="flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-lg text-neutral-500 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-sm font-semibold transition-colors"
                    >
                        <span>العودة لصفحة الدخول السريع</span>
                    </button>
                )}
            </div>
            {isForgot && (
                 <div className="text-sm text-center">
                    <a href="#" onClick={(e) => { e.preventDefault(); setView('login'); }} className="font-medium text-primary hover:text-primary-light transition-colors">
                        العودة لتسجيل الدخول
                    </a>
                </div>
            )}
        </form>
        </>
    );
};`;

content = content.replace(/const CredentialsView: React\.FC<CredentialsViewProps> = \(\{.*?\}\);\n\};\n/s, newCredentialsView + '\n');

fs.writeFileSync('components/auth/AuthPage.tsx', content);
