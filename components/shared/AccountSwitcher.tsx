import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { User, Check, Plus, Shield, X, Loader2, Eye } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useData } from '../../contexts/DataContext';
import { Preferences } from '@capacitor/preferences';
import { SavedAccount, getSavedAccounts, setLastActiveAccount, setAccountSession, getAccountSession } from '../../lib/accountManager';
import { authenticateBiometrically } from '../../lib/biometrics';
import { emitToast } from '../../hooks/useToast';

const AccountSwitcher: React.FC = () => {
    const { profile } = useData();
    const [allAccounts, setAllAccounts] = useState<SavedAccount[]>([]);
    const [activeAccount, setActiveAccount] = useState<SavedAccount | null>(null);
    const [isOpen, setIsOpen] = useState(false);
    const [switching, setSwitching] = useState(false);

    const fetchAccounts = async () => {
        if (!profile?.id) return;
        const all = await getSavedAccounts();
        setAllAccounts(all);
        const current = all.find(acc => acc.id === profile.id);
        if (current) {
            setActiveAccount(current);
        } else {
            // Fallback object if current is not inside the saved list
            setActiveAccount({
                id: profile.id,
                fullName: profile.full_name || 'مستخدم',
                role: profile.role || 'viewer',
                isVirtual: profile.id.startsWith('virtual_'),
                greenhouseName: profile.role !== 'viewer' ? 'إدارة المالك' : 'اتصال مشاهد'
            });
        }
    };

    useEffect(() => {
        fetchAccounts();
    }, [profile?.id]);

    const handleSwitchAccount = async (acc: SavedAccount) => {
        try {
            // فحص البصمة إذا كانت مفعلة لهذا الحساب
            if (acc.biometricEnabled) {
                const authOk = await authenticateBiometrically(`الدخول السريع إلى حساب: ${acc.greenhouseName || acc.fullName}`);
                if (!authOk) {
                    return; // المستخدم ألغى أو فشل التحقق الحيوي
                }
            }

            setIsOpen(false);
            setSwitching(true);
            window.dispatchEvent(new CustomEvent('account_switching'));

            // حفظ الجلسة الحالية قبل الانتقال إن وُجدت
            try {
                const { data: curSess } = await supabase.auth.getSession();
                if (curSess?.session?.user?.id) {
                    setAccountSession(curSess.session.user.id, curSess.session);
                    await Preferences.set({
                        key: `supabase_session_${curSess.session.user.id}`,
                        value: JSON.stringify(curSess.session)
                    });
                }
                const { value: curVAuth } = await Preferences.get({ key: 'virtual_auth' });
                if (curVAuth) {
                    const parsed = JSON.parse(curVAuth);
                    if (parsed?.id) {
                        await Preferences.set({ key: `virtual_auth_${parsed.id}`, value: curVAuth });
                    }
                }
            } catch {}

            if (acc.isVirtual) {
                // فتح الحساب الافتراضي مباشرة دون طلب كلمة مرور ودون فتح صفحة تسجيل الدخول
                let virtualUser: any = null;
                const { value: storedVAuth } = await Preferences.get({ key: `virtual_auth_${acc.id}` });
                if (storedVAuth) {
                    try { virtualUser = JSON.parse(storedVAuth); } catch {}
                }
                if (!virtualUser) {
                    virtualUser = {
                        id: acc.id.startsWith('virtual_') ? acc.id : `virtual_${acc.id}`,
                        full_name: acc.greenhouseName || acc.fullName,
                        role: acc.role || 'viewer',
                        parent_id: acc.parentId || (acc as any).parent_id,
                        username: acc.username
                    };
                }

                await Preferences.set({ key: 'virtual_auth', value: JSON.stringify(virtualUser) });
                await Preferences.set({ key: `virtual_auth_${virtualUser.id}`, value: JSON.stringify(virtualUser) });
                await Preferences.remove({ key: 'was_explicitly_logged_out' });
                await setLastActiveAccount(acc.id);

                await new Promise(r => setTimeout(r, 200));
                window.location.reload();
                return;
            } else {
                // فتح حساب المالك مباشرة دون طلب كلمة مرور ودون فتح صفحة تسجيل الدخول
                await Preferences.remove({ key: 'virtual_auth' });
                await Preferences.remove({ key: 'was_explicitly_logged_out' });

                // 1. استرجاع الجلسة المحفوظة
                const memorySession = getAccountSession(acc.id);
                let sessionObj: any = memorySession;
                if (!sessionObj) {
                    const { value: storedPref } = await Preferences.get({ key: `supabase_session_${acc.id}` });
                    if (storedPref) {
                        try { sessionObj = JSON.parse(storedPref); } catch {}
                    }
                }

                if (sessionObj?.access_token && sessionObj?.refresh_token) {
                    try {
                        const { data: setRes, error: setErr } = await supabase.auth.setSession({
                            access_token: sessionObj.access_token,
                            refresh_token: sessionObj.refresh_token
                        });
                        if (!setErr && setRes?.session) {
                            setAccountSession(acc.id, setRes.session);
                            await Preferences.set({
                                key: `supabase_session_${acc.id}`,
                                value: JSON.stringify(setRes.session)
                            });
                            await setLastActiveAccount(acc.id);
                            await new Promise(r => setTimeout(r, 200));
                            window.location.reload();
                            return;
                        }
                    } catch (e) {
                        console.warn("setSession error:", e);
                    }
                }

                // 2. فحص إذا كانت جلسة Supabase الحالية مطابقة للحساب
                const { data: sessionData } = await supabase.auth.getSession();
                if (sessionData?.session?.user?.id === acc.id) {
                    await setLastActiveAccount(acc.id);
                    await new Promise(r => setTimeout(r, 200));
                    window.location.reload();
                    return;
                }

                // 3. محاولة استعادة الجلسة بالرموز المحفوظة في الحساب إن وجدت
                if (acc.accessToken && acc.refreshToken) {
                    try {
                        const { data: setRes, error: setErr } = await supabase.auth.setSession({
                            access_token: acc.accessToken,
                            refresh_token: acc.refreshToken
                        });
                        if (!setErr && setRes?.session) {
                            setAccountSession(acc.id, setRes.session);
                            await setLastActiveAccount(acc.id);
                            await Preferences.set({
                                key: `supabase_session_${acc.id}`,
                                value: JSON.stringify(setRes.session)
                            });
                            await new Promise(r => setTimeout(r, 200));
                            window.location.reload();
                            return;
                        }
                    } catch (e) {
                        console.warn("Auto token re-auth error:", e);
                    }
                }


                // في حال تعذر التبديل التلقائي
                emitToast('يرجى تسجيل الدخول إلى هذا الحساب لحفظ جلسته للتبديل الفوري', 'info');
                await setLastActiveAccount(acc.id);
                await Preferences.set({ key: 'was_explicitly_logged_out', value: 'true' });
                await supabase.auth.signOut({ scope: 'local' });
                window.location.reload();
            }
        } catch (err) {
            console.error("Error switching accounts in header:", err);
            emitToast('حدث خطأ أثناء التنقل بين الحسابات.', 'error');
            setSwitching(false);
        }
    };

    const handleAddNewAccount = async () => {
        // Logging out locally to allow logging into a new account which will then be appended to saved list
        localStorage.removeItem('virtual_auth');
        await Preferences.remove({ key: 'virtual_auth' });
        await Preferences.set({ key: 'was_explicitly_logged_out', value: 'true' });
        await supabase.auth.signOut({ scope: 'local' });
        window.location.reload();
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

    if (!profile) return null;

    const currentName = activeAccount?.greenhouseName || activeAccount?.fullName || profile.full_name || 'مستودع زراعي';

    return (
        <div className="relative" dir="rtl">
            {/* Switch Trigger Button - Pure Avatar */}
            <button
                onClick={() => setIsOpen(true)}
                className="w-10 h-10 rounded-full sm:w-11 sm:h-11 overflow-hidden transition-transform duration-300 hover:scale-105 tap border-2 border-neutral-200 dark:border-neutral-800 hover:border-purple-500/50 dark:hover:border-purple-500/50 shadow-sm relative focus:outline-none focus:ring-4 focus:ring-purple-500/20"
            >
                <div 
                    className="w-full h-full flex items-center justify-center text-[15px] font-black shadow-inner object-cover"
                    style={getDynamicAvatarStyle(currentName)}
                >
                    {getInitials(currentName)}
                </div>
            </button>

            {/* Bottom Sheet Modal & Switching Overlay */}
            {typeof document !== 'undefined' && createPortal(
                <div dir="rtl">
                    {switching && (
                        <div className="fixed inset-0 bg-white/90 dark:bg-neutral-950/90 z-[9999] flex flex-col items-center justify-center text-neutral-900 dark:text-white">
                            <div className="flex flex-col items-center max-w-sm mx-4 text-center">
                                <Loader2 className="w-12 h-12 text-purple-600 animate-spin mb-4" />
                                <p className="text-xl font-black text-neutral-800 dark:text-neutral-100">
                                    جارٍ التبديل...
                                </p>
                            </div>
                        </div>
                    )}

                    {isOpen && (
                        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 px-4">
                            <div 
                                className="absolute inset-0" 
                                onClick={() => setIsOpen(false)}
                            />
                            <div className="relative z-10 bg-white dark:bg-neutral-900 rounded-2xl shadow-xl w-full max-w-sm flex flex-col max-h-[85vh] overflow-hidden border border-neutral-200 dark:border-neutral-800">
                                {/* Header */}
                                <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-neutral-100 dark:border-neutral-800 shrink-0">
                                    <div>
                                        <h3 className="font-black text-xl text-neutral-800 dark:text-neutral-100 tracking-tight">تبديل الحساب</h3>
                                        <p className="text-xs font-bold text-neutral-500 dark:text-neutral-400 mt-0.5">اختر حساباً للمتابعة كجلسة نشطة.</p>
                                    </div>
                                    <button onClick={() => setIsOpen(false)} className="p-2.5 bg-neutral-100 dark:bg-neutral-800 rounded-full text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 transition-colors">
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>
                                    
                                    {/* Body: Account Rows */}
                                    <div className="p-4 overflow-y-auto custom-scrollbar flex-1 space-y-2.5">
                                        {allAccounts.map((acc) => {
                                            const isActive = acc.id === profile.id;
                                            const accountTitle = acc.greenhouseName || acc.fullName || 'مستخدم زراعي';

                                            return (
                                                <button
                                                    key={acc.id}
                                                    disabled={switching || isActive}
                                                    onClick={() => handleSwitchAccount(acc)}
                                                    className={`w-full flex items-center justify-between p-3 rounded-2xl text-right transition-all group ${
                                                        isActive
                                                            ? 'bg-purple-50/80 dark:bg-purple-500/10 border border-purple-200 dark:border-purple-500/30 ring-1 ring-purple-500/20 shadow-sm'
                                                            : 'bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 hover:border-purple-300 dark:hover:border-purple-500/40 hover:shadow-sm'
                                                    }`}
                                                >
                                                    <div className="flex items-center gap-3.5 min-w-0">
                                                        <div 
                                                            className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-black shadow-sm shrink-0 transition-transform group-hover:scale-105"
                                                            style={getDynamicAvatarStyle(accountTitle)}
                                                        >
                                                            {getInitials(accountTitle)}
                                                        </div>
                                                        
                                                        <div className="min-w-0 text-right">
                                                            <p className={`font-black text-sm truncate leading-snug ${isActive ? 'text-purple-700 dark:text-purple-300' : 'text-neutral-800 dark:text-neutral-100'}`}>
                                                                {accountTitle}
                                                            </p>
                                                            <div className="flex items-center gap-2 mt-1 text-[11px] font-bold text-neutral-500 dark:text-neutral-400">
                                                                {!acc.isVirtual ? (
                                                                    <span className="flex items-center gap-1 text-accent-success dark:text-accent-success">
                                                                        <Shield className="w-3.5 h-3.5" /> المالك
                                                                    </span>
                                                                ) : (
                                                                    <span className="flex items-center gap-1 text-accent-info dark:text-accent-info">
                                                                        <Eye className="w-3.5 h-3.5" /> مشاهدة
                                                                    </span>
                                                                )}
                                                                {acc.biometricEnabled && (
                                                                    <>
                                                                        <span className="w-1 h-1 rounded-full bg-neutral-300 dark:bg-neutral-600"></span>
                                                                        <span className="flex items-center gap-0.5">
                                                                            🔐 بصمة تفاعلية
                                                                        </span>
                                                                    </>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {isActive && (
                                                        <div className="w-6 h-6 rounded-full bg-purple-600 flex items-center justify-center text-white shrink-0 shadow-md transform scale-100 transition-transform duration-300 hover:scale-110 ml-1">
                                                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                                                        </div>
                                                    )}
                                                </button>
                                            );
                                        })}

                                        {allAccounts.length === 0 && (
                                            <div className="py-8 flex flex-col items-center justify-center text-center px-4">
                                                <div className="w-16 h-16 bg-neutral-100 dark:bg-neutral-800 rounded-full flex items-center justify-center text-neutral-400 mb-3">
                                                    <User className="w-8 h-8" />
                                                </div>
                                                <p className="text-sm font-bold text-neutral-700 dark:text-neutral-300">لا توجد حسابات أخرى محفوظة</p>
                                            </div>
                                        )}
                                    </div>

                                    {/* Add Action Footer */}
                                    <div className="p-4 border-t border-neutral-100 dark:border-neutral-800 shrink-0">
                                        <button
                                            onClick={handleAddNewAccount}
                                            className="w-full flex items-center gap-4 p-3 rounded-2xl text-right transition-all group hover:bg-neutral-50 dark:hover:bg-neutral-800/50 border border-transparent outline-none focus:ring-2 focus:ring-neutral-200 dark:focus:ring-neutral-700"
                                        >
                                            <div className="w-12 h-12 rounded-full border-2 border-dashed border-neutral-300 dark:border-neutral-700 flex items-center justify-center text-neutral-400 group-hover:border-neutral-400 dark:group-hover:text-neutral-300 dark:group-hover:border-neutral-500 shrink-0 transition-colors">
                                                <Plus className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <p className="font-black text-sm text-neutral-700 dark:text-neutral-300 group-hover:text-neutral-900 dark:group-hover:text-neutral-100">
                                                    إضافة حساب جديد
                                                </p>
                                                <p className="text-[11px] font-bold text-neutral-400 dark:text-neutral-500 mt-0.5">تسجيل الدخول بحساب أو مستودع آخر</p>
                                            </div>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                </div>,
                document.body
            )}
        </div>
    );
};

export default AccountSwitcher;

