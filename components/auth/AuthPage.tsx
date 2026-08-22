
import React, { useState, useEffect } from 'react';
import { useToast } from '../../hooks/useToast';
import { supabase } from '../../lib/supabase';
import { 
  LogoIcon, 
  UserIcon, 
  LockClosedIcon, 
  ArrowLeftIcon, 
  WarningIcon, 
  CheckCircleIcon,
  PencilIcon,
  TrashIcon,
  CheckIcon,
  PlusIcon
} from '../Icons';
import { createRipple } from '../../utils/helpers';
import { Preferences } from '@capacitor/preferences';
import { 
  SavedAccount, 
  getSavedAccounts, 
  saveAccount, 
  removeSavedAccount, 
  updateSavedAccountName,
  toggleSavedAccountBiometrics,
  setSavedAccountPin,
  setSavedAccountsList,
  setLastActiveAccount
} from '../../lib/accountManager';
import { 
  authenticateBiometrically, 
  isBiometricSupportedOnDevice 
} from '../../lib/biometrics';
import { Fingerprint, Shield, User, GripVertical } from 'lucide-react';

type View = 'login' | 'signup' | 'forgot_password' | 'verify_otp' | 'update_password' | 'saved_accounts';
type OtpFlow = 'signup' | 'password_reset';

interface AuthPageProps {
  initialFlow?: 'login' | 'recovery';
  onAuthComplete?: () => void;
}

interface InputFieldProps {
    icon: React.FC<React.SVGProps<SVGSVGElement>>;
    type: string;
    placeholder: string;
    id: string;
    value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    autoComplete?: string;
}

const InputField = ({ icon: Icon, type, placeholder, id, value, onChange, autoComplete }: InputFieldProps) => (
    <div className="relative">
      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
        <Icon className="h-5 w-5 text-neutral-400" aria-hidden="true" />
      </div>
      <input
        id={id}
        name={id}
        type={type}
        required
        value={value}
        onChange={onChange}
        autoComplete={autoComplete}
        className="block w-full rounded-md border-0 bg-neutral-100 dark:bg-neutral-800 py-3 pr-10 pl-3 text-neutral-900 dark:text-neutral-100 ring-1 ring-inset ring-neutral-300 dark:ring-neutral-700 placeholder:text-neutral-400 focus:ring-2 focus:ring-inset focus:ring-primary sm:text-sm sm:leading-6 transition-shadow duration-200"
        placeholder={placeholder}
      />
    </div>
);

const AuthPage: React.FC<AuthPageProps> = ({ initialFlow = 'login', onAuthComplete }) => {
  const [view, setView] = useState<View>(initialFlow === 'recovery' ? 'update_password' : 'login');
  const [otpFlow, setOtpFlow] = useState<OtpFlow>('signup');

  const [loading, setLoading] = useState(false);
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [token, setToken] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  
  const [savedAccounts, setSavedAccounts] = useState<SavedAccount[]>([]);

  // Premium PIN Pad States
  const [activePinAccount, setActivePinAccount] = useState<SavedAccount | null>(null);
  const [pinValue, setPinValue] = useState('');
  const [pinSetupAccount, setPinSetupAccount] = useState<SavedAccount | null>(null);
  const [pinSetupStep, setPinSetupStep] = useState<'enter' | 'confirm'>('enter');
  const [pinSetupValue, setPinSetupValue] = useState('');
  const [pinSetupConfirmValue, setPinSetupConfirmValue] = useState('');
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [pinActionType, setPinActionType] = useState<'enable' | 'verify_disable'>('enable');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('password_updated') === 'true') {
      setMessage('تم تحديث كلمة المرور بنجاح. يرجى تسجيل الدخول.');
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  useEffect(() => {
    const loadSaved = async () => {
      const saved = await getSavedAccounts();
      setSavedAccounts(saved);
      if (saved.length > 0 && initialFlow !== 'recovery') {
        setView('saved_accounts');
      }
    };
    loadSaved();
  }, [initialFlow]);

  const resetFormState = () => {
    setError(null);
    setMessage(null);
    setIdentifier('');
    setPassword('');
    setConfirmPassword('');
    setFullName('');
    setToken('');
  };

  const handleLogin = async (e: React.FormEvent) => {
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
                  id: `virtual_${vMember.id}`,
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
  };
  
  const handleSelectSavedAccount = async (acc: SavedAccount, pinBypass: boolean = false) => {
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
        if (!pinBypass && acc.pinEnabled) {
            setActivePinAccount(acc);
            setPinValue('');
            setLoading(false);
            return;
        }

        if (acc.biometricEnabled) {
            const authOk = await authenticateBiometrically(`الدخول السريع إلى حساب: ${acc.greenhouseName || acc.fullName}`);
            if (!authOk) {
                setError('فشل التحقق من الهوية الحيوية. يرجى إعادة المحاولة.');
                setLoading(false);
                return;
            }
        }

        if (acc.isVirtual) {
            const { data, error: supabaseError } = await supabase.rpc('virtual_login', {
                p_username: acc.username || '',
                p_password: acc.password || ''
            });

            const vMember = Array.isArray(data) ? data[0] : data;

            if (supabaseError) {
                console.error("Virtual Login Error from Saved Accounts Selection:", supabaseError);
                setError('حدث خطأ في الاتصال بقاعدة البيانات');
            } else if (!vMember || !vMember.id) {
                setError('فشل الدخول التلقائي: قد تكون تم تغيير كلمة مرور هذا الحساب.');
            } else {
                const virtualUser = {
                  id: `virtual_${vMember.id}`,
                  full_name: vMember.full_name,
                  role: vMember.role,
                  parent_id: vMember.owner_id,
                  username: vMember.username
                };
                localStorage.setItem('virtual_auth', JSON.stringify(virtualUser));
                await Preferences.set({ key: 'virtual_auth', value: JSON.stringify(virtualUser) });
                
                await saveAccount({
                  ...acc,
                  fullName: vMember.full_name,
                  role: vMember.role
                });
                await setLastActiveAccount(virtualUser.id);
                
                window.location.reload();
            }
        } else {
            const { data: authData, error: signInError } = await supabase.auth.signInWithPassword({
                email: acc.email || '',
                password: acc.password || ''
            });
            
            if (signInError) {
                setError('فشل الدخول التلقائي: قد تكون تم تغيير كلمة مرور البريد الإلكتروني.');
            } else if (authData?.user) {
                const { data: profData } = await supabase
                    .from('profiles')
                    .select('full_name, role')
                    .eq('id', authData.user.id)
                    .single();
                
                await saveAccount({
                    ...acc,
                    fullName: profData?.full_name || 'مالك',
                    role: profData?.role || 'owner'
                });
                await setLastActiveAccount(authData.user.id);
                
                window.location.reload();
            }
        }
    } catch (_err) {
        setError('خطأ في الاتصال بالخادم أثناء تسجيل الدخول التلقائي.');
    } finally {
        setLoading(false);
    }
  };

  const handlePinDigitPress = async (digit: string) => {
    setError(null);
    if (activePinAccount) {
      const newValue = pinValue + digit;
      if (newValue.length <= 4) {
        setPinValue(newValue);
        if (newValue.length === 4) {
          if (newValue === activePinAccount.pinCode) {
            const targetAcc = activePinAccount;
            setActivePinAccount(null);
            setPinValue('');
            await handleSelectSavedAccount(targetAcc, true);
          } else {
            setError('رمز PIN غير صحيح. يرجى الحذر والمحاولة مجدداً.');
            setTimeout(() => {
              setPinValue('');
            }, 600);
          }
        }
      }
    } else if (pinSetupAccount) {
      if (pinActionType === 'verify_disable') {
        const newValue = pinValue + digit;
        if (newValue.length <= 4) {
          setPinValue(newValue);
          if (newValue.length === 4) {
            if (newValue === pinSetupAccount.pinCode) {
              await setSavedAccountPin(pinSetupAccount.id, null);
              const updated = await getSavedAccounts();
              setSavedAccounts(updated);
              setPinSetupAccount(null);
              setPinValue('');
              setMessage('تم إيقاف قفل رمز PIN لهذا الحساب بنجاح.');
            } else {
              setError('رمز PIN غير صحيح. لم يتم إلغاء القفل.');
              setTimeout(() => {
                setPinValue('');
              }, 600);
            }
          }
        }
      } else {
        if (pinSetupStep === 'enter') {
          const newValue = pinSetupValue + digit;
          if (newValue.length <= 4) {
            setPinSetupValue(newValue);
            if (newValue.length === 4) {
              setPinSetupStep('confirm');
            }
          }
        } else {
          const newValue = pinSetupConfirmValue + digit;
          if (newValue.length <= 4) {
            setPinSetupConfirmValue(newValue);
            if (newValue.length === 4) {
              if (newValue === pinSetupValue) {
                await setSavedAccountPin(pinSetupAccount.id, newValue);
                const updated = await getSavedAccounts();
                setSavedAccounts(updated);
                setPinSetupAccount(null);
                setPinSetupValue('');
                setPinSetupConfirmValue('');
                setMessage('تم تفعيل قفل رمز PIN لهذا الحساب بنجاح.');
              } else {
                setError('الرموز غير متطابقة. يرجى المحاولة من جديد.');
                setPinSetupStep('enter');
                setPinSetupValue('');
                setPinSetupConfirmValue('');
              }
            }
          }
        }
      }
    }
  };

  const handlePinBackspace = () => {
    if (activePinAccount) {
      setPinValue(pinValue.slice(0, -1));
    } else if (pinSetupAccount) {
      if (pinActionType === 'verify_disable') {
        setPinValue(pinValue.slice(0, -1));
      } else {
        if (pinSetupStep === 'enter') {
          setPinSetupValue(pinSetupValue.slice(0, -1));
        } else {
          setPinSetupConfirmValue(pinSetupConfirmValue.slice(0, -1));
        }
      }
    }
  };

  const handleToggleBiometric = async (accountId: string, enabled: boolean) => {
    if (enabled) {
      const authOk = await authenticateBiometrically('تأكيد البصمة لربطها بالدخول السريع');
      if (!authOk) {
        setError('فشل تأكيد البصمة. لم يتم تفعيل الميزة على الحساب.');
        return;
      }
    }
    
    await toggleSavedAccountBiometrics(accountId, enabled);
    const updated = await getSavedAccounts();
    setSavedAccounts(updated);
  };

  const handleRemoveSavedAccount = async (accountId: string) => {
    await removeSavedAccount(accountId);
    const updated = await getSavedAccounts();
    setSavedAccounts(updated);
    if (updated.length === 0) {
        setView('login');
    }
  };

  const handleRenameSavedAccount = async (accountId: string, newName: string) => {
    await updateSavedAccountName(accountId, newName);
    const updated = await getSavedAccounts();
    setSavedAccounts(updated);
  };
  
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);
    const { error: signUpError } = await supabase.auth.signUp({
        email: identifier,
        password,
        options: { data: { full_name: fullName } }
    });

    if (signUpError) {
        setError(signUpError.message === 'User already registered' ? 'هذا البريد الإلكتروني مسجل بالفعل.' : signUpError.message);
    } else {
        setMessage('تم إرسال رمز التحقق إلى بريدك الإلكتروني.');
        setOtpFlow('signup');
        setView('verify_otp');
    }
    setLoading(false);
  };

  const handlePasswordResetRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(identifier);
    if (resetError) {
        setError(resetError.message);
    } else {
        setMessage('تم إرسال رمز استعادة كلمة المرور إلى بريدك الإلكتروني.');
        setOtpFlow('password_reset');
        setView('verify_otp');
    }
    setLoading(false);
  };
  
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const type = otpFlow === 'signup' ? 'signup' : 'recovery';
    const { error: verifyError } = await supabase.auth.verifyOtp({ email: identifier, token, type });
    if (verifyError) {
        setError('الرمز غير صالح أو منتهي الصلاحية.');
    }
    setLoading(false);
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError('كلمتا المرور غير متطابقتين.');
      return;
    }
    setLoading(true);
    setError(null);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) {
      setError(updateError.message);
    } else {
      await supabase.auth.signOut();
      if (onAuthComplete) onAuthComplete();
      window.location.search = '?password_updated=true';
    }
    setLoading(false);
  };

  const renderContent = () => {
    switch (view) {
        case 'saved_accounts':
            return (
                <SavedAccountsView 
                    accounts={savedAccounts}
                    onSelect={handleSelectSavedAccount}
                    onRemove={handleRemoveSavedAccount}
                    onRename={handleRenameSavedAccount}
                    onToggleBiometric={handleToggleBiometric}
                    onUpdateOrder={(newOrder) => setSavedAccounts(newOrder)}
                    onSaveOrder={async (newOrder) => {
                        await setSavedAccountsList(newOrder);
                    }}
                    onAddNew={() => { setView('login'); resetFormState(); }}
                    loading={loading}
                    error={error}
                />
            );
        case 'login':
        case 'signup':
        case 'forgot_password':
            return (
                <CredentialsView 
                    view={view} 
                    setView={(v: View) => { setView(v); resetFormState(); }}
                    identifier={identifier} setIdentifier={setIdentifier}
                    password={password} setPassword={setPassword}
                    fullName={fullName} setFullName={setFullName}
                    handleLogin={handleLogin}
                    handleSignUp={handleSignUp}
                    handlePasswordResetRequest={handlePasswordResetRequest}
                    loading={loading}
                    error={error}
                    message={message}
                    hasSavedAccounts={savedAccounts.length > 0}
                />
            );
        case 'verify_otp':
            return (
                <VerifyOtpView
                    email={identifier}
                    flow={otpFlow}
                    token={token}
                    setToken={setToken}
                    handleVerifyOtp={handleVerifyOtp}
                    setView={(v: View) => { setView(v); resetFormState(); }}
                    loading={loading}
                    error={error}
                    message={message}
                />
            );
        case 'update_password':
            return (
                <UpdatePasswordView 
                    password={password} setPassword={setPassword}
                    confirmPassword={confirmPassword} setConfirmPassword={setConfirmPassword}
                    handleUpdatePassword={handleUpdatePassword}
                    loading={loading}
                    error={error}
                />
            );
    }
  }

  const renderPinPad = () => {
    const isVerifying = !!activePinAccount;
    const isSetup = !!pinSetupAccount;
    
    if (!isVerifying && !isSetup) return null;

    const account = activePinAccount || pinSetupAccount;
    if (!account) return null;

    let heading = "تأمين الدخول";
    let subheading = "";
    let currentVal = "";

    if (isVerifying) {
      heading = "رمز المرور (PIN)";
      subheading = `أدخل رمز PIN الحالي لفتح حساب:\n${account.greenhouseName || account.fullName}`;
      currentVal = pinValue;
    } else {
      if (pinActionType === 'verify_disable') {
        heading = "إيقاف رمز الحماية";
        subheading = `أدخل الرمز الحالي لإلغاء القفل لـ ${account.greenhouseName || account.fullName}`;
        currentVal = pinValue;
      } else {
        if (pinSetupStep === 'enter') {
          heading = "تعيين حماية جديدة";
          subheading = `اختر 4 أرقام لتسهيل الدخول لـ ${account.greenhouseName || account.fullName}`;
          currentVal = pinSetupValue;
        } else {
          heading = "تأكيد رمز الاستجابة";
          subheading = "أعد كتابة الرمز نفسه للتأكيد ومطابقة الحساب";
          currentVal = pinSetupConfirmValue;
        }
      }
    }

    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-neutral-900/95 backdrop-blur-md text-white px-6 py-8 animate-page-enter" dir="rtl">
        <div className="w-full max-w-sm flex flex-col items-center space-y-8">
          
          <div className="text-center space-y-3">
            <div className="mx-auto w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center justify-center animate-pulse">
              <Shield className="h-8 w-8" />
            </div>
            <h2 className="text-2xl font-black tracking-tight">{heading}</h2>
            <p className="text-sm text-neutral-400 max-w-xs whitespace-pre-line leading-relaxed">
              {subheading}
            </p>
          </div>

          <div className="flex items-center justify-center gap-4 py-4">
            {[0, 1, 2, 3].map((index) => {
              const hasDigit = index < currentVal.length;
              return (
                <div 
                  key={index}
                  className={`w-4 h-4 rounded-full border-2 transition-all duration-200 transform ${
                    hasDigit 
                      ? 'bg-amber-500 border-amber-500 scale-110 shadow-lg shadow-amber-500/50' 
                      : 'border-neutral-700 bg-neutral-800'
                  }`}
                />
              );
            })}
          </div>

          {error && (
            <div className="text-red-400 text-sm font-semibold bg-red-500/10 px-4 py-2 rounded-xl border border-red-500/20 text-center animate-bounce">
              {error}
            </div>
          )}

          <div className="grid grid-cols-3 gap-4 w-full max-w-[280px]">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
              <button
                key={num}
                onClick={() => handlePinDigitPress(num)}
                className="w-16 h-16 rounded-full bg-neutral-800 hover:bg-neutral-700 text-2xl font-bold flex items-center justify-center transition-all active:scale-95 border border-neutral-700/50 text-white"
              >
                {num}
              </button>
            ))}
            
            <button
              onClick={() => {
                setActivePinAccount(null);
                setPinSetupAccount(null);
                setError(null);
              }}
              className="w-16 h-16 rounded-full bg-neutral-900 text-neutral-400 hover:text-white flex items-center justify-center text-sm font-semibold transition-all active:scale-95"
            >
              إلغاء
            </button>
            
            <button
              onClick={() => handlePinDigitPress('0')}
              className="w-16 h-16 rounded-full bg-neutral-800 hover:bg-neutral-700 text-2xl font-bold flex items-center justify-center transition-all active:scale-95 border border-neutral-700/50 text-white"
            >
              0
            </button>
            
            <button
              onClick={handlePinBackspace}
              className="w-16 h-16 rounded-full bg-neutral-900 text-neutral-400 hover:text-white flex items-center justify-center transition-all active:scale-95"
              aria-label="Delete"
            >
              <Delete className="h-6 w-6" />
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 lg:grid lg:grid-cols-2">
      {renderPinPad()}
      <div className="hidden lg:flex flex-col items-center justify-center bg-gradient-to-br from-primary-dark to-primary p-12 text-center text-white relative overflow-hidden">
        <div className="absolute -top-24 -right-24 w-72 h-72 bg-white/10 rounded-full opacity-50"></div>
        <div className="absolute -bottom-32 -left-16 w-80 h-80 bg-white/5 rounded-full opacity-50"></div>
        <div className="z-10 animate-page-enter" style={{animationDelay: '200ms'}}>
            <div className="bg-white/20 p-4 rounded-full inline-block backdrop-blur-sm">
                <LogoIcon className="mx-auto h-52 w-52" />
            </div>
            <h1 className="mt-8 text-5xl font-bold">المحاسب الزراعي</h1>
            <p className="mt-4 text-lg text-emerald-100 max-w-sm mx-auto">
                إدارة الأصول الزراعية، الفواتير، والمصروفات بكفاءة ودقة.
            </p>
        </div>
      </div>
      
      <div className="h-screen flex flex-col justify-center items-center px-4 sm:px-6 lg:px-8 lg:h-auto">
        <div className="w-full max-w-sm space-y-8 animate-page-enter">
          <div className="text-center lg:hidden">
              <LogoIcon className="mx-auto h-28 w-28 text-primary" />
              <h1 className="mt-4 text-3xl font-bold text-neutral-800 dark:text-neutral-50">المحاسب الزراعي</h1>
          </div>
          {renderContent()}
        </div>
      </div>
    </div>
  );
};

interface CredentialsViewProps {
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
}

const CredentialsView: React.FC<CredentialsViewProps> = ({ 
    view, setView, identifier, setIdentifier,
    password, setPassword, fullName, setFullName, handleLogin, handleSignUp, 
    handlePasswordResetRequest, loading, error, message, hasSavedAccounts = false
}) => {
    const isLogin = view === 'login';
    const isForgot = view === 'forgot_password';
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
                    <InputField icon={UserIcon} type="email" placeholder="البريد الإلكتروني" id="email" value={identifier} onChange={e => setIdentifier(e.target.value)} autoComplete="email" />
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
};

interface SavedAccountsViewProps {
    accounts: SavedAccount[];
    onSelect: (account: SavedAccount) => void;
    onRemove: (accountId: string) => void;
    onRename: (accountId: string, newName: string) => void;
    onToggleBiometric: (accountId: string, enabled: boolean) => void;
    onUpdateOrder: (accounts: SavedAccount[]) => void;
    onSaveOrder: (accounts: SavedAccount[]) => void;
    onAddNew: () => void;
    loading: boolean;
    error: string | null;
}

const SavedAccountsView: React.FC<SavedAccountsViewProps> = ({
    accounts,
    onSelect,
    onRemove,
    onRename,
    onToggleBiometric,
    onUpdateOrder,
    onSaveOrder,
    onAddNew,
    loading,
    error
}) => {
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editingName, setEditingName] = useState('');
    const [supportsBio, setSupportsBio] = useState(false);
    const [draggedItem, setDraggedItem] = useState<string | null>(null);

    useEffect(() => {
        isBiometricSupportedOnDevice().then(setSupportsBio);
    }, []);

    const handleDragStart = (e: React.DragEvent, id: string) => {
        setDraggedItem(id);
        if (e.dataTransfer) {
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', id);
            // This is needed for Firefox to allow dragging
        }
    };

    const handleDragOver = (e: React.DragEvent, id: string) => {
        e.preventDefault();
        if (!draggedItem || draggedItem === id) return;
        
        const sourceIndex = accounts.findIndex(a => a.id === draggedItem);
        const targetIndex = accounts.findIndex(a => a.id === id);
        if (sourceIndex < 0 || targetIndex < 0) return;

        const newAccounts = [...accounts];
        const [removed] = newAccounts.splice(sourceIndex, 1);
        newAccounts.splice(targetIndex, 0, removed);
        
        onUpdateOrder(newAccounts);
    };

    const handleDragEnd = () => {
        if (draggedItem) {
            onSaveOrder(accounts);
        }
        setDraggedItem(null);
    };

    const getDynamicAvatarStyle = (name: string) => {
        if (!name) return { background: '#9ca3af', color: '#ffffff' };
        let hash = 0;
        for (let i = 0; i < name.length; i++) {
            hash = name.charCodeAt(i) + ((hash << 5) - hash);
        }
        const h = Math.abs(hash) % 360;
        return {
            background: `linear-gradient(135deg, hsl(${h}, 70%, 55%), hsl(${(h + 30) % 360}, 80%, 45%))`,
            color: '#ffffff',
            textShadow: '0 1px 2px rgba(0,0,0,0.2)'
        };
    };

    const getInitials = (name: string) => {
        if (!name) return 'ح';
        const firstLetter = name.trim().charAt(0);
        return firstLetter ? firstLetter.toUpperCase() : 'ح';
    };

    const handleStartEdit = (e: React.MouseEvent, acc: SavedAccount) => {
        e.stopPropagation();
        setEditingId(acc.id);
        setEditingName(acc.greenhouseName || acc.fullName);
    };

    const handleSaveEdit = (e: React.MouseEvent, accountId: string) => {
        e.stopPropagation();
        if (editingName.trim()) {
            onRename(accountId, editingName.trim());
        }
        setEditingId(null);
    };

    const handleCancelEdit = (e: React.MouseEvent) => {
        e.stopPropagation();
        setEditingId(null);
    };

    return (
        <div className="space-y-6">
            <div className="text-center">
                <h2 className="text-3xl font-black tracking-tight text-neutral-900 dark:text-neutral-50">
                    الدخول السريع
                </h2>
                <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400 leading-relaxed">
                    اختر الحساب المسجل للانتقال مباشرة دون كتابة بيانات
                </p>
            </div>

            {error && (
                <div className="flex items-center gap-3 text-sm text-accent-danger bg-accent-danger/10 p-4 rounded-xl border border-accent-danger/20">
                    <WarningIcon className="h-5 w-5 flex-shrink-0" />
                    <p>{error}</p>
                </div>
            )}

            <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1" dir="rtl">
                {accounts.map((acc) => {
                    const isEditing = editingId === acc.id;
                    const displayLabel = acc.greenhouseName || acc.fullName;

                    return (
                        <div
                            key={acc.id}
                            draggable={!isEditing}
                            onDragStart={(e) => handleDragStart(e, acc.id)}
                            onDragOver={(e) => handleDragOver(e, acc.id)}
                            onDragEnd={handleDragEnd}
                            style={{
                                opacity: draggedItem === acc.id ? 0.4 : 1,
                                transform: draggedItem === acc.id ? 'scale(0.98)' : 'scale(1)',
                            }}
                            onClick={() => !isEditing && !loading && onSelect(acc)}
                            className={`group relative flex items-center justify-between p-4 rounded-2xl transition-all duration-300 w-full text-right ${
                                loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer active:scale-[0.98]'
                            } bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 hover:border-purple-300 dark:hover:border-purple-500/40 hover:shadow-sm overflow-hidden`}
                        >
                            <div className="flex items-center gap-4 flex-1 min-w-0 z-10">
                                <div 
                                    className="cursor-grab active:cursor-grabbing text-neutral-300 hover:text-neutral-500 transition-colors p-1 z-20 pointer-events-auto" 
                                    title="اسحب لترتيب الحسابات"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        e.preventDefault();
                                    }}
                                >
                                    <GripVertical className="h-5 w-5" />
                                </div>
                                <div 
                                    className="h-12 w-12 rounded-full flex items-center justify-center flex-shrink-0 text-[18px] font-black shadow-inner object-cover"
                                    style={getDynamicAvatarStyle(displayLabel)}
                                >
                                    {getInitials(displayLabel)}
                                </div>

                                <div className="flex-1 min-w-0 text-right">
                                    {isEditing ? (
                                        <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                                            <input
                                                type="text"
                                                value={editingName}
                                                onChange={e => setEditingName(e.target.value)}
                                                className="w-full text-sm py-1 px-2 border border-neutral-300 dark:border-neutral-700 rounded-md bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-1 focus:ring-primary"
                                                autoFocus
                                                onKeyDown={e => {
                                                    if (e.key === 'Enter') handleSaveEdit(e as unknown as React.MouseEvent, acc.id);
                                                    if (e.key === 'Escape') handleCancelEdit(e as unknown as React.MouseEvent);
                                                }}
                                            />
                                            <button
                                                onClick={e => handleSaveEdit(e, acc.id)}
                                                className="p-1 text-accent-success hover:bg-accent-success/10 rounded"
                                            >
                                                <CheckIcon className="h-4 w-4" />
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-2">
                                            <p className="font-extrabold text-neutral-800 dark:text-neutral-100 truncate text-base">
                                                {displayLabel}
                                            </p>
                                            <button
                                                onClick={e => handleStartEdit(e, acc)}
                                                className="opacity-0 group-hover:opacity-100 p-1 text-neutral-400 hover:text-primary transition-opacity rounded"
                                            >
                                                <PencilIcon className="h-3.5 w-3.5" />
                                            </button>
                                        </div>
                                    )}
                                    <div className="flex items-center gap-2 mt-1 text-[11px] font-bold text-neutral-500 dark:text-neutral-400">
                                        {!acc.isVirtual ? (
                                            <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                                                <Shield className="w-3.5 h-3.5" /> مالك رئيسي
                                                <span className="text-neutral-400 font-normal mr-1" dir="ltr">{acc.email}</span>
                                            </span>
                                        ) : (
                                            <span className="flex items-center gap-1 text-blue-500 dark:text-blue-400">
                                                <User className="w-3.5 h-3.5" /> رابط صوبة 
                                                <span className="text-neutral-400 font-normal mr-1" dir="ltr">{acc.username}</span>
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Actions Area */}
                            <div className="flex items-center gap-3 z-10 pl-2">
                                {supportsBio && (
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (!loading) onToggleBiometric(acc.id, !acc.biometricEnabled);
                                        }}
                                        className={`p-2 rounded-full transition-all duration-300 pointer-events-auto ${
                                            acc.biometricEnabled
                                                ? 'text-emerald-500 bg-emerald-50/80 dark:bg-emerald-500/10 hover:bg-emerald-100 dark:hover:bg-emerald-500/20'
                                                : 'text-neutral-300 dark:text-neutral-600 hover:text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                                        }`}
                                        title={acc.biometricEnabled ? "تعطيل الدخول بالبصمة" : "تمكين الدخول بالبصمة"}
                                    >
                                        <Fingerprint className="h-5 w-5" />
                                    </button>
                                )}
                            </div>

                            {/* Faint absolute Trash button in top corner to prevent accidental clicks */}
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (!loading) onRemove(acc.id);
                                }}
                                className="absolute top-2 left-2 p-1.5 text-neutral-200 dark:text-neutral-700 hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors z-20 pointer-events-auto"
                                title="إزالة الحساب من القائمة"
                            >
                                <TrashIcon className="h-3.5 w-3.5" />
                            </button>
                        </div>
                    );
                })}
            </div>

            <div className="space-y-3 pt-2">
                <button
                    onClick={onAddNew}
                    disabled={loading}
                    className="flex items-center justify-center gap-2 w-full py-3.5 px-4 rounded-xl border-2 border-dashed border-neutral-300 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100/50 dark:hover:bg-neutral-800/30 hover:text-primary hover:border-primary transition-all font-semibold text-sm"
                >
                    <PlusIcon className="h-5 w-5" />
                    <span>تسجيل الدخول كحساب جديد</span>
                </button>
            </div>
        </div>
    );
};

interface VerifyOtpViewProps {
    email: string;
    flow: OtpFlow;
    token: string;
    setToken: (v: string) => void;
    handleVerifyOtp: (e: React.FormEvent) => void;
    setView: (v: View) => void;
    loading: boolean;
    error: string | null;
    message: string | null;
}

const VerifyOtpView: React.FC<VerifyOtpViewProps> = ({ email: identifier, flow, token, setToken, handleVerifyOtp, setView, loading, error, message }) => {
    return (
        <>
            <div className="text-center">
                <h2 className="text-3xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50">التحقق من الرمز</h2>
                <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
                    تم إرسال رمز مكون من 6 أرقام إلى <span className="font-bold text-neutral-700 dark:text-neutral-200">{email}</span>.
                </p>
            </div>

            {error && <div className="flex items-center gap-3 text-sm text-accent-danger bg-accent-danger/10 p-3 rounded-md"><WarningIcon className="h-5 w-5 flex-shrink-0" /><p>{error}</p></div>}
            {message && <div className="flex items-center gap-3 text-sm text-accent-success bg-accent-success/10 p-3 rounded-md"><CheckCircleIcon className="h-5 w-5 flex-shrink-0" /><p>{message}</p></div>}
            
            <form className="mt-8 space-y-6" onSubmit={handleVerifyOtp}>
                <InputField icon={LockClosedIcon} type="text" placeholder="أدخل الرمز" id="token" value={token} onChange={e => setToken(e.target.value)} autoComplete="one-time-code" />
                <div>
                    <button type="submit" onClick={createRipple} disabled={loading} className="group ripple-effect relative flex w-full justify-center rounded-lg bg-primary py-3 px-4 text-md font-semibold text-white hover:bg-primary-dark transition-all duration-300 disabled:opacity-50">
                        {loading ? '...جاري التحقق' : 'تحقق'}
                    </button>
                </div>
                <div className="text-sm text-center">
                    <a href="#" onClick={(e) => { e.preventDefault(); setView(flow === 'signup' ? 'signup' : 'forgot_password'); }} className="font-medium text-primary hover:text-primary-light transition-colors">
                        العودة
                    </a>
                </div>
            </form>
        </>
    );
};

interface UpdatePasswordViewProps {
    password: string;
    setPassword: (v: string) => void;
    confirmPassword: string;
    setConfirmPassword: (v: string) => void;
    handleUpdatePassword: (e: React.FormEvent) => void;
    loading: boolean;
    error: string | null;
}

const UpdatePasswordView: React.FC<UpdatePasswordViewProps> = ({ password, setPassword, confirmPassword, setConfirmPassword, handleUpdatePassword, loading, error }) => {
    return (
        <>
            <div className="text-center">
                <h2 className="text-3xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50">تعيين كلمة مرور جديدة</h2>
                <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
                    أدخل كلمة المرور الجديدة لحسابك.
                </p>
            </div>
             {error && <div className="flex items-center gap-3 text-sm text-accent-danger bg-accent-danger/10 p-3 rounded-md"><WarningIcon className="h-5 w-5 flex-shrink-0" /><p>{error}</p></div>}
            
             <form className="mt-8 space-y-6" onSubmit={handleUpdatePassword}>
                <div className="space-y-4">
                    <InputField icon={LockClosedIcon} type="password" placeholder="كلمة المرور الجديدة" id="password" value={password} onChange={e => setPassword(e.target.value)} autoComplete="new-password" />
                    <InputField icon={LockClosedIcon} type="password" placeholder="تأكيد كلمة المرور" id="confirm-password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} autoComplete="new-password" />
                </div>
                <div>
                    <button type="submit" onClick={createRipple} disabled={loading} className="group ripple-effect relative flex w-full justify-center rounded-lg bg-primary py-3 px-4 text-md font-semibold text-white hover:bg-primary-dark transition-all duration-300 disabled:opacity-50">
                        {loading ? '...جاري التحديث' : 'تحديث كلمة المرور'}
                    </button>
                </div>
            </form>
        </>
    );
}

export default AuthPage;
