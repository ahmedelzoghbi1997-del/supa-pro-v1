import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { useData } from '../../contexts/DataContext';
import { useToast } from '../../hooks/useToast';
import { ShieldIcon, CheckCircleIcon } from '../Icons';
import { Copy, Check, Clock, RefreshCw, AlertTriangle, Key } from 'lucide-react';
import Button from '../shared/Button';

/**
 * دالة توليد كود ربط عشوائي فائق الأمان (Crypto-Secure)
 * بطول 12 خانة على الأقل من أحرف وأرقام بدون تشابه بصري (تجنب 0, O, 1, I)
 */
export const generateSecureLinkingCode = (length = 12): string => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const actualLength = Math.max(10, length);
    const array = new Uint8Array(actualLength);
    crypto.getRandomValues(array);
    let result = '';
    for (let i = 0; i < actualLength; i++) {
        result += chars[array[i] % chars.length];
    }
    return result;
};

const ATTEMPTS_STORAGE_KEY = 'harvest_linking_failed_attempts';
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_WINDOW_MS = 15 * 60 * 1000; // 15 دقيقة

interface LockoutStatus {
    isLocked: boolean;
    remainingMinutes: number;
    failedCount: number;
}

const LinkToOwner: React.FC = () => {
    const { profile, refreshGlobalData } = useData();
    const { showToast } = useToast();
    
    // نموذج إدخال الكود
    const [code, setCode] = useState('');
    const [loading, setLoading] = useState(false);
    const [lockout, setLockout] = useState<LockoutStatus>({ isLocked: false, remainingMinutes: 0, failedCount: 0 });

    // كود الربط الخاص بهذا الحساب (للمشاركة)
    const [generatingCode, setGeneratingCode] = useState(false);
    const [myLinkingCode, setMyLinkingCode] = useState<string | null>(profile?.linking_code || null);
    const [myExpiresAt, setMyExpiresAt] = useState<string | null>(profile?.linking_code_expires_at || null);
    const [copied, setCopied] = useState(false);

    // فحص المحاولات الفاشلة محلياً وفي قاعدة البيانات
    const checkFailedAttempts = useCallback(async (userId: string): Promise<LockoutStatus> => {
        const now = Date.now();

        // 1. فحص LocalStorage كخط دفاع أول وسريع
        let localAttempts: number[] = [];
        try {
            const raw = localStorage.getItem(`${ATTEMPTS_STORAGE_KEY}_${userId}`);
            if (raw) {
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed)) {
                    localAttempts = parsed.filter((ts: number) => now - ts < LOCKOUT_WINDOW_MS);
                }
            }
        } catch {
            localAttempts = [];
        }

        // 2. محاولة جلب المحاولات من جدول linking_attempts في Supabase
        let dbAttemptsCount = 0;
        let oldestAttemptTime = now;
        try {
            const fifteenMinutesAgo = new Date(now - LOCKOUT_WINDOW_MS).toISOString();
            const { data, error } = await supabase
                .from('linking_attempts')
                .select('attempted_at')
                .eq('user_id', userId)
                .gte('attempted_at', fifteenMinutesAgo)
                .order('attempted_at', { ascending: true });

            if (!error && data) {
                dbAttemptsCount = data.length;
                if (data.length > 0) {
                    oldestAttemptTime = new Date(data[0].attempted_at).getTime();
                }
            }
        } catch {
            // الجدول ربما لم ينشأ بعد، الاعتماد على LocalStorage
        }

        const totalFailed = Math.max(localAttempts.length, dbAttemptsCount);
        if (totalFailed >= MAX_FAILED_ATTEMPTS) {
            const oldest = localAttempts.length > 0 ? Math.min(localAttempts[0], oldestAttemptTime) : oldestAttemptTime;
            const elapsed = now - oldest;
            const remaining = Math.max(1, Math.ceil((LOCKOUT_WINDOW_MS - elapsed) / 60000));
            return { isLocked: true, remainingMinutes: remaining, failedCount: totalFailed };
        }

        return { isLocked: false, remainingMinutes: 0, failedCount: totalFailed };
    }, []);

    // تسجيل محاولة فاشلة
    const recordFailedAttempt = useCallback(async (userId: string) => {
        const now = Date.now();
        // 1. حفظ محلي
        try {
            const key = `${ATTEMPTS_STORAGE_KEY}_${userId}`;
            const raw = localStorage.getItem(key);
            let attempts: number[] = [];
            if (raw) {
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed)) {
                    attempts = parsed.filter((ts: number) => now - ts < LOCKOUT_WINDOW_MS);
                }
            }
            attempts.push(now);
            localStorage.setItem(key, JSON.stringify(attempts));
        } catch (e) {
            console.error('LocalStorage attempt save error:', e);
        }

        // 2. حفظ في جدول linking_attempts
        try {
            await supabase.from('linking_attempts').insert([{
                user_id: userId,
                attempted_at: new Date(now).toISOString()
            }]);
        } catch {
            // تجاهل خطأ عدم وجود الجدول
        }

        // تحديث حالة القفل
        const status = await checkFailedAttempts(userId);
        setLockout(status);
    }, [checkFailedAttempts]);

    // مسح المحاولات الفاشلة عند النجاح
    const clearFailedAttempts = useCallback(async (userId: string) => {
        try {
            localStorage.removeItem(`${ATTEMPTS_STORAGE_KEY}_${userId}`);
            await supabase.from('linking_attempts').delete().eq('user_id', userId);
        } catch {
            // إخفاق صامت
        }
        setLockout({ isLocked: false, remainingMinutes: 0, failedCount: 0 });
    }, []);

    // تهيئة فحص القفل ومزامنة بيانات كود المالك
    useEffect(() => {
        if (profile?.id) {
            checkFailedAttempts(profile.id).then(setLockout);
        }
        if (profile?.linking_code) {
            setMyLinkingCode(profile.linking_code);
        }
        if (profile?.linking_code_expires_at) {
            setMyExpiresAt(profile.linking_code_expires_at);
        }
    }, [profile?.id, profile?.linking_code, profile?.linking_code_expires_at, checkFailedAttempts]);

    // معالجة توليد كود ربط جديد للمالك (صالح 24 ساعة - 12 خانة مشفرة)
    const handleGenerateNewCode = async () => {
        if (!profile?.id) return;
        setGeneratingCode(true);
        try {
            // محاولة استدعاء دالة RPC في قاعدة البيانات أولاً
            const { data: rpcData, error: rpcError } = await supabase.rpc('generate_owner_linking_code');
            
            let newCode = '';
            let expiresAt = '';

            if (!rpcError && rpcData && Array.isArray(rpcData) && rpcData.length > 0) {
                newCode = rpcData[0].linking_code;
                expiresAt = rpcData[0].linking_code_expires_at;
            } else {
                // توليد كود مشفر عشوائي محلياً (12 خانة crypto-secure) وتاريخ انتهاء 24 ساعة
                newCode = generateSecureLinkingCode(12);
                expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

                const { error: updateError } = await supabase
                    .from('profiles')
                    .update({
                        linking_code: newCode,
                        linking_code_expires_at: expiresAt
                    } as any)
                    .eq('id', profile.id);

                if (updateError) throw updateError;
            }

            setMyLinkingCode(newCode);
            setMyExpiresAt(expiresAt);
            showToast('تم توليد كود ربط مشفر جديد بنجاح (صالح لمدة 24 ساعة).');
            if (refreshGlobalData) refreshGlobalData();
        } catch (_err: any) {
            console.error('Error generating linking code:', _err);
            showToast(`فشل في توليد الكود: ${_err.message || 'خطأ في الاتصال'}`, 'error');
        } finally {
            setGeneratingCode(false);
        }
    };

    // معالجة نسخ كود الربط
    const handleCopyCode = (codeToCopy: string) => {
        navigator.clipboard.writeText(codeToCopy);
        setCopied(true);
        showToast('تم نسخ كود الربط إلى الحافظة.');
        setTimeout(() => setCopied(false), 2500);
    };

    // معالجة إرسال كود للربط بحساب مالك
    const handleLink = async (e: React.FormEvent) => {
        e.preventDefault();
        const cleanCode = code.trim().toUpperCase();
        if (!cleanCode || !profile?.id) return;

        // 1. التحقق من القفل المؤقت (5 محاولات فاشلة)
        const currentLock = await checkFailedAttempts(profile.id);
        if (currentLock.isLocked) {
            showToast(`تم قفل محاولات الربط مؤقتاً لكثرة المحاولات الخاطئة. يرجى المحاولة بعد ${currentLock.remainingMinutes} دقيقة.`, 'error');
            return;
        }

        setLoading(true);
        try {
            // 2. محاولة استخدام دالة RPC الآمنة بقاعدة البيانات (link_account_to_owner)
            const { data: rpcResult, error: rpcError } = await supabase.rpc('link_account_to_owner', {
                p_code: cleanCode
            });

            if (!rpcError && rpcResult?.success) {
                await clearFailedAttempts(profile.id);
                showToast(`تم الربط بنجاح بحساب ${rpcResult.owner_name || 'المالك'}. سيتم تحديث البيانات الآن.`);
                setTimeout(() => window.location.reload(), 1500);
                return;
            }

            // إذا كان الخطأ من الـ RPC متعلق بالقفل أو انتهاء الصلاحية
            if (rpcError) {
                const errMsg = rpcError.message || '';
                if (errMsg.includes('تم قفل محاولات الربط')) {
                    setLockout({ isLocked: true, remainingMinutes: 15, failedCount: MAX_FAILED_ATTEMPTS });
                    showToast(errMsg, 'error');
                    setLoading(false);
                    return;
                }
                if (errMsg.includes('منتهي الصلاحية') || errMsg.includes('غير صحيح')) {
                    await recordFailedAttempt(profile.id);
                    showToast(errMsg, 'error');
                    setLoading(false);
                    return;
                }
                // في حالة لم تكن الدالة منشأة في Supabase بعد، نستمر في التحقق المباشر
            }

            // 3. التحقق المباشر عبر جدول profiles
            const { data: owner, error: findError } = await supabase
                .from('profiles')
                .select('id, full_name, linking_code_expires_at')
                .eq('linking_code', cleanCode)
                .maybeSingle();

            if (findError) throw findError;

            // إذا لم يتم العثور على الكود
            if (!owner) {
                await recordFailedAttempt(profile.id);
                showToast('كود غير صحيح. تأكد من الكود من صاحب الحساب.', 'error');
                setLoading(false);
                return;
            }

            // التحقق من محاولة ربط الحساب بنفسه
            if (owner.id === profile.id) {
                showToast('لا يمكنك ربط حسابك بنفسك.', 'error');
                setLoading(false);
                return;
            }

            // 4. التحقق من انتهاء الصلاحية (صالح لمدة 24 ساعة فقط)
            if (owner.linking_code_expires_at) {
                const expiresTime = new Date(owner.linking_code_expires_at).getTime();
                if (Date.now() > expiresTime) {
                    await recordFailedAttempt(profile.id);
                    showToast('هذا الكود منتهي الصلاحية (صلاحية الكود 24 ساعة فقط من توليده). اطلب كوداً جديداً من صاحب الحساب.', 'error');
                    setLoading(false);
                    return;
                }
            } else {
                // الكود ليس له تاريخ انتهاء مسجل (كود قديم)
                await recordFailedAttempt(profile.id);
                showToast('هذا الكود منتهي الصلاحية أو غير صالح. اطلب كوداً جديداً من صاحب الحساب.', 'error');
                setLoading(false);
                return;
            }

            // 5. ربط الحساب بصلاحية مشاهد
            const { error: updateError } = await supabase
                .from('profiles')
                .update({ 
                    parent_id: owner.id, 
                    role: 'viewer',
                    status: 'active' 
                } as any)
                .eq('id', profile.id);

            if (updateError) {
                console.error('Linking Update Error:', updateError);
                throw updateError;
            }

            // مسح المحاولات الفاشلة عند النجاح
            await clearFailedAttempts(profile.id);
            showToast(`تم الربط بنجاح بحساب ${owner.full_name}. سيتم تحديث البيانات الآن.`);
            setTimeout(() => window.location.reload(), 1500);

        } catch (_err: any) {
            console.error('Final Link Error:', _err);
            showToast(`فشل في الربط: ${_err.message || 'تأكد من إعدادات Supabase'}`, 'error');
        } finally {
            setLoading(false);
        }
    };

    // فك الارتباط
    const handleUnlink = async () => {
        if (!confirm('هل أنت متأكد من فك الارتباط؟ ستفقد القدرة على مشاهدة هذه البيانات.')) return;

        try {
            const { error } = await supabase
                .from('profiles')
                .update({ 
                    parent_id: null, 
                    role: 'user' 
                } as any)
                .eq('id', profile!.id);

            if (error) throw error;
            showToast('تم فك الارتباط بنجاح.');
            setTimeout(() => window.location.reload(), 1000);
        } catch (_err) {
            showToast('فشل في فك الارتباط.', 'error');
        }
    };

    // حساب حالة صلاحية كود المالك
    const isCodeExpired = myExpiresAt ? new Date(myExpiresAt).getTime() < Date.now() : true;
    const hoursRemaining = myExpiresAt && !isCodeExpired 
        ? Math.max(1, Math.round((new Date(myExpiresAt).getTime() - Date.now()) / (1000 * 60 * 60)))
        : 0;

    // إذا كان الحساب مرتبطاً كـ viewer
    if (profile?.parent_id && profile?.role === 'viewer') {
        return (
            <div className="bg-white dark:bg-neutral-800 rounded-3xl p-6 shadow-soft border border-neutral-100 dark:border-neutral-700 space-y-6">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-accent-success/10 dark:bg-accent-success/20 text-accent-success dark:text-accent-success rounded-2xl">
                        <CheckCircleIcon className="w-6 h-6" />
                    </div>
                    <div>
                        <h3 className="text-xl font-bold">حالة الربط</h3>
                        <p className="text-xs sm:text-sm text-neutral-500">أنت الآن متصل بحساب مالك بصلاحيات "مشاهدة فقط".</p>
                    </div>
                </div>

                <div className="bg-neutral-50 dark:bg-neutral-900/50 p-4 rounded-2xl border border-neutral-100 dark:border-neutral-700 flex items-center justify-between">
                    <div>
                        <p className="text-xs font-bold text-neutral-400 mb-1">مرتبط بحساب</p>
                        <p className="font-bold text-neutral-800 dark:text-neutral-200">حساب المالك الرئيسي</p>
                    </div>
                    <Button 
                        variant="ghost"
                        size="sm"
                        onClick={handleUnlink}
                        className="!px-4 !py-2 !text-accent-danger hover:!bg-accent-danger/10 dark:hover:!bg-accent-danger/20 !rounded-xl !text-xs !font-bold transition-all border !border-accent-danger/20 dark:!border-accent-danger/30"
                    >
                        فك الارتباط
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* بطاقة إدخال كود المالك للربط */}
            <div className="bg-white dark:bg-neutral-800 rounded-3xl p-6 shadow-soft border border-neutral-100 dark:border-neutral-700">
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-3 bg-accent-info/10 dark:bg-accent-info/20 text-accent-info dark:text-accent-info rounded-2xl">
                        <ShieldIcon className="w-6 h-6" />
                    </div>
                    <div>
                        <h3 className="text-xl font-bold">الربط بحساب مالك</h3>
                        <p className="text-xs sm:text-sm text-neutral-500">أدخل الكود المؤقت (صالح 24 ساعة) الذي أرسله لك صاحب الحساب.</p>
                    </div>
                </div>

                {/* تحذير القفل المؤقت في حالة تجاوز عدد المحاولات */}
                {lockout.isLocked && (
                    <div className="mb-5 p-4 bg-accent-danger/10 dark:bg-accent-danger/20 border border-accent-danger/20 dark:border-accent-danger/30 rounded-2xl flex items-start gap-3 text-accent-danger dark:text-accent-danger">
                        <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-accent-danger" />
                        <div className="text-xs leading-relaxed">
                            <p className="font-bold mb-1">تم قفل إدخال الكود مؤقتاً لحماية الحسابات</p>
                            <p>تم إدخال كود غير صحيح 5 مرات متتالية. يرجى الانتظار لمدة <strong>{lockout.remainingMinutes} دقيقة</strong> قبل المحاولة مرة أخرى.</p>
                        </div>
                    </div>
                )}

                <form onSubmit={handleLink} className="space-y-4">
                    <div>
                        <div className="flex justify-between items-center mb-2 px-1">
                            <label className="text-xs font-black text-neutral-400 uppercase tracking-widest">كود الربط</label>
                            {lockout.failedCount > 0 && !lockout.isLocked && (
                                <span className="text-[11px] font-bold text-accent-warning">
                                    محاولات خاطئة: {lockout.failedCount} من {MAX_FAILED_ATTEMPTS}
                                </span>
                            )}
                        </div>
                        <input
                            type="text"
                            required
                            disabled={lockout.isLocked || loading}
                            placeholder="أدخل الكود (مثال: K7M9P2X4W8Q5)..."
                            className="w-full h-14 bg-neutral-100 dark:bg-neutral-900 border-2 border-transparent focus:border-primary/40 rounded-2xl px-6 text-lg font-black tracking-widest text-center focus:ring-4 focus:ring-primary/10 transition-all uppercase disabled:opacity-50 disabled:cursor-not-allowed"
                            value={code}
                            onChange={(e) => setCode(e.target.value.toUpperCase())}
                        />
                    </div>
                    <Button
                        type="submit"
                        variant="primary"
                        loading={loading}
                        disabled={loading || lockout.isLocked || !code.trim()}
                        className="w-full !h-14 !rounded-2xl !font-black !text-sm transition-all shadow-lg shadow-primary/20 tap"
                    >
                        {lockout.isLocked ? `مغلق مؤقتاً (${lockout.remainingMinutes} دقيقة)` : 'تأكيد الربط بالحساب'}
                    </Button>
                </form>
            </div>

            {/* بطاقة توليد كود ربط خاص بك لمشاركته مع الشركاء أو المشاهدين */}
            <div className="bg-white dark:bg-neutral-800 rounded-3xl p-6 shadow-soft border border-neutral-100 dark:border-neutral-700 space-y-5">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-accent-success/10 dark:bg-accent-success/20 text-accent-success dark:text-accent-success rounded-2xl">
                            <Key className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold">كود الربط الخاص بك</h3>
                            <p className="text-xs sm:text-sm text-neutral-500">شارك هذا الكود المشفر لربط حسابات الشركاء أو المطلعين معك بصلاحية مشاهدة.</p>
                        </div>
                    </div>
                </div>

                <div className="bg-neutral-50 dark:bg-neutral-900/40 p-4 rounded-2xl border border-neutral-100 dark:border-neutral-700/60 space-y-3">
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                        <div className="w-full sm:w-auto text-center sm:text-right">
                            <span className="text-2xs uppercase font-black tracking-wider text-neutral-400 block mb-1">
                                الكود الحالي (مشفر عشوائياً)
                            </span>
                            {myLinkingCode ? (
                                <div className="flex items-center justify-center sm:justify-start gap-2">
                                    <span className="text-2xl font-black tracking-widest text-primary font-mono select-all">
                                        {myLinkingCode}
                                    </span>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleCopyCode(myLinkingCode)}
                                        className="!p-2 text-neutral-400 hover:text-primary hover:bg-neutral-200/50 dark:hover:bg-neutral-700/50 !rounded-xl transition-all"
                                        title="نسخ الكود"
                                        icon={copied ? <Check className="w-5 h-5 text-accent-success" /> : <Copy className="w-5 h-5" />}
                                    />
                                </div>
                            ) : (
                                <span className="text-sm font-bold text-neutral-400 italic">
                                    لم يتم توليد كود حتى الآن
                                </span>
                            )}
                        </div>

                        {/* شارة الصلاحية والوقت */}
                        <div className="flex items-center gap-2">
                            {myLinkingCode && (
                                isCodeExpired ? (
                                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-accent-warning/10 text-accent-warning dark:bg-accent-warning/20 dark:text-accent-warning border border-accent-warning/20/60 dark:border-accent-warning/30">
                                        <Clock className="w-3.5 h-3.5" />
                                        منتهي الصلاحية
                                    </span>
                                ) : (
                                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-accent-success/10 text-accent-success dark:bg-accent-success/20 dark:text-accent-success border border-accent-success/20/60 dark:border-accent-success/30">
                                        <Clock className="w-3.5 h-3.5" />
                                        صالح (متبقي {hoursRemaining} ساعة)
                                    </span>
                                )
                            )}
                        </div>
                    </div>

                    {myExpiresAt && (
                        <p className="text-[11px] text-neutral-400 text-center sm:text-right">
                            {isCodeExpired 
                                ? 'انتهت صلاحية الكود السابق، يرجى توليد كود جديد.'
                                : `ينتهي في: ${new Date(myExpiresAt).toLocaleString('ar-EG-u-nu-latn', { dateStyle: 'medium', timeStyle: 'short' })}`}
                        </p>
                    )}
                </div>

                <Button
                    type="button"
                    variant="secondary"
                    onClick={handleGenerateNewCode}
                    disabled={generatingCode}
                    loading={generatingCode}
                    className="w-full !py-3.5 !px-4 !rounded-2xl !font-bold !text-xs sm:!text-sm flex items-center justify-center gap-2 transition-all tap"
                    icon={!generatingCode ? <RefreshCw className="w-4 h-4" /> : undefined}
                >
                    {myLinkingCode ? 'توليد كود ربط جديد (صالح لمدة 24 ساعة)' : 'توليد كود ربط آمن (12 خانة مشفرة)'}
                </Button>
            </div>
        </div>
    );
};

export default LinkToOwner;
