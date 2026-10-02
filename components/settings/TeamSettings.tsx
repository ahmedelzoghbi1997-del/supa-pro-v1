import React, { useState, useEffect } from 'react';
import { useData } from '../../contexts/DataContext';
import { useRealtime } from '../../contexts/UIContext';
import { useToast } from '../../hooks/useToast';
import { TrashIcon, UserIcon, ShieldIcon, PlusIcon, LockClosedIcon, FingerPrintIcon } from '../Icons';
import { Copy, Check, AlertTriangle, Key, Clock, RefreshCw } from 'lucide-react';
import type { VirtualMember } from '../../types';
import { supabase } from '../../lib/supabase';
import { removeSavedAccount } from '../../lib/accountManager';
import { generateSecureLinkingCode } from './LinkToOwner';
import Button from '../shared/Button';

const TeamSettings: React.FC = () => {
    const { profile } = useData();
    const { presences } = useRealtime();
    const { showToast } = useToast();
    const [subUsers, setSubUsers] = useState<VirtualMember[]>([]);
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(true);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [memberToDelete, setMemberToDelete] = useState<VirtualMember | null>(null);
    const [copiedId, setCopiedId] = useState<string | null>(null);

    // Linking code state
    const [generatingCode, setGeneratingCode] = useState(false);
    const [myLinkingCode, setMyLinkingCode] = useState<string | null>(profile?.linking_code || null);
    const [myExpiresAt, setMyExpiresAt] = useState<string | null>(profile?.linking_code_expires_at || null);
    const [copiedCode, setCopiedCode] = useState(false);

    useEffect(() => {
        if (profile?.linking_code) setMyLinkingCode(profile.linking_code);
        if (profile?.linking_code_expires_at) setMyExpiresAt(profile.linking_code_expires_at);
    }, [profile?.linking_code, profile?.linking_code_expires_at]);

    const handleGenerateNewCode = async () => {
        if (!profile?.id) return;
        setGeneratingCode(true);
        try {
            const { data: rpcData, error: rpcError } = await supabase.rpc('generate_owner_linking_code');
            let newCode = '';
            let expiresAt = '';

            if (!rpcError && rpcData && Array.isArray(rpcData) && rpcData.length > 0) {
                newCode = rpcData[0].linking_code;
                expiresAt = rpcData[0].linking_code_expires_at;
            } else {
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
        } catch (_err: any) {
            showToast(`فشل في توليد الكود: ${_err.message || 'خطأ في الاتصال'}`, 'error');
        } finally {
            setGeneratingCode(false);
        }
    };

    const handleCopyCode = (codeToCopy: string) => {
        navigator.clipboard.writeText(codeToCopy);
        setCopiedCode(true);
        showToast('تم نسخ كود الربط إلى الحافظة.');
        setTimeout(() => setCopiedCode(false), 2500);
    };
    
    const [isAdding, setIsAdding] = useState(false);
    const [newMember, setNewMember] = useState({
        full_name: '',
        username: '',
        password: '',
        role: 'viewer' as const
    });

    const fetchSubUsers = async () => {
        if (!profile?.id) return;
        setFetching(true);
        try {
            const { data, error } = await supabase
                .from('virtual_members')
                .select('id, owner_id, username, full_name, role, last_seen, push_token, created_at')
                .eq('owner_id', profile.id);

            if (error) {
                // Fallback to server API if needed
                try {
                    const res = await fetch(`/api/auth/list-virtual/${profile.id}`);
                    if (res && res.ok) {
                        const serverMembers = await res.json();
                        setSubUsers(serverMembers);
                        return;
                    }
                } catch {}
                throw error;
            }
            if (data) setSubUsers(data as any);
        } catch (_err) {
            console.error('Error fetching virtual members:', _err);
        } finally {
            setFetching(false);
        }
    };

    useEffect(() => {
        fetchSubUsers();
    }, [profile?.id]);

    // Listen to real-time changes on virtual_members
    useEffect(() => {
        if (!profile?.id) return;

        const channel = supabase
            .channel('virtual-members-realtime')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'virtual_members', filter: `owner_id=eq.${profile.id}` },
                () => {
                    fetchSubUsers();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [profile?.id]);

    const handleCreateAccount = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!profile?.id) return;
        setLoading(true);

        try {
            const { data, error } = await supabase
                .from('virtual_members')
                .insert([{ 
                    ...newMember, 
                    owner_id: profile.id 
                }])
                .select('id, owner_id, username, full_name, role, last_seen, push_token, created_at');

            if (!error && data) {
                showToast('تم إنشاء حساب المطلع بنجاح.');
                setIsAdding(false);
                setNewMember({ full_name: '', username: '', password: '', role: 'viewer' });
                fetchSubUsers();
            } else {
                // Fallback to server endpoint
                const res = await fetch('/api/auth/create-virtual', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ ...newMember, owner_id: profile.id })
                });
                const resData = await res.json();
                if (res.ok && resData?.id) {
                    showToast('تم إنشاء حساب المطلع بنجاح.');
                    setIsAdding(false);
                    setNewMember({ full_name: '', username: '', password: '', role: 'viewer' });
                    fetchSubUsers();
                } else {
                    showToast(resData.error || error?.message || 'فشل في إنشاء الحساب', 'error');
                }
            }
        } catch (_err: any) {
            showToast('خطأ في الاتصال بالخادم', 'error');
        } finally {
            setLoading(false);
        }
    };

    const confirmDeleteMember = async () => {
        if (!memberToDelete) return;
        const id = memberToDelete.id;
        setDeletingId(id);

        try {
            let success = false;
            const { error } = await supabase
                .from('virtual_members')
                .delete()
                .eq('id', id);

            if (!error) {
                success = true;
            } else {
                // Fallback to server API endpoint
                try {
                    const res = await fetch(`/api/auth/delete-virtual/${id}`, {
                        method: 'DELETE'
                    });
                    if (res.ok) success = true;
                } catch {
                    // Fallback failed
                }
            }

            if (success) {
                showToast('تم حذف حساب المطلع بنجاح.');
                setSubUsers(prev => prev.filter(m => m.id !== id));
                // Also remove from saved accounts locally if exists
                await removeSavedAccount(`virtual_${id}`);
                setMemberToDelete(null);
                fetchSubUsers();
            } else {
                showToast('فشل في حذف الحساب. يرجى إعادة المحاولة.', 'error');
            }
        } catch (_err) {
            showToast('فشل في الاتصال بالخادم.', 'error');
        } finally {
            setDeletingId(null);
        }
    };

    const handleCopyInfo = (member: VirtualMember) => {
        const text = `بيانات الدخول إلى التقارير:\nالاسم: ${member.full_name}\nاسم المستخدم: ${member.username}\n(اختر "دخول التقارير" من شاشة تسجيل الدخول)`;
        navigator.clipboard.writeText(text);
        setCopiedId(member.id);
        showToast('تم نسخ بيانات الدخول إلى الحافظة');
        setTimeout(() => setCopiedId(null), 2500);
    };

    if (profile?.role === 'viewer' || profile?.parent_id) return null;

    return (
        <div className="space-y-6">
            {/* Custom Delete Confirmation Modal */}
            {memberToDelete && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in" dir="rtl">
                    <div className="bg-white dark:bg-neutral-800 rounded-3xl p-6 max-w-md w-full shadow-2xl border border-neutral-100 dark:border-neutral-700 animate-scale-up space-y-5">
                        <div className="flex items-center gap-3 text-accent-danger">
                            <div className="p-3 bg-accent-danger/10 dark:bg-accent-danger/20 rounded-2xl">
                                <AlertTriangle className="w-6 h-6" />
                            </div>
                            <div>
                                <h4 className="text-lg font-black text-neutral-900 dark:text-white">تأكيد حذف حساب المطلع</h4>
                                <p className="text-xs text-neutral-500 dark:text-neutral-400">إجراء لا يمكن التراجع عنه</p>
                            </div>
                        </div>

                        <div className="bg-neutral-50 dark:bg-neutral-900/60 p-4 rounded-2xl border border-neutral-100 dark:border-neutral-700/60 space-y-2">
                            <div className="flex items-center justify-between">
                                <span className="text-xs text-neutral-500">اسم المطلع:</span>
                                <span className="text-sm font-bold text-neutral-900 dark:text-white">{memberToDelete.full_name}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-xs text-neutral-500">اسم المستخدم:</span>
                                <span className="text-xs font-mono font-bold bg-neutral-200 dark:bg-neutral-800 px-2 py-0.5 rounded text-primary">@{memberToDelete.username}</span>
                            </div>
                        </div>

                        <p className="text-xs text-neutral-600 dark:text-neutral-300 leading-relaxed font-medium">
                            هل أنت متأكد من حذف هذا الحساب نهائياً؟ سيفقد هذا المستخدم إمكانية الدخول ومشاهدة تقارير وبيانات المزرعة على الفور.
                        </p>

                        <div className="flex items-center justify-end gap-3 pt-2">
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => setMemberToDelete(null)}
                                disabled={!!deletingId}
                                className="!px-5 !py-2.5 !rounded-xl"
                            >
                                إلغاء
                            </Button>
                            <Button
                                type="button"
                                variant="danger"
                                size="sm"
                                onClick={confirmDeleteMember}
                                loading={!!deletingId}
                                icon={<TrashIcon className="w-4 h-4" />}
                                className="!px-5 !py-2.5 !rounded-xl"
                            >
                                تأكيد الحذف
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Quick 24h Linking Code Card */}
            <div className="bg-white dark:bg-neutral-800 rounded-2xl p-6 shadow-soft border border-neutral-100 dark:border-neutral-700 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-accent-success/10 dark:bg-accent-success/20 text-accent-success dark:text-accent-success rounded-xl">
                            <Key className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-neutral-800 dark:text-neutral-50">كود الربط المباشر (صالح 24 ساعة)</h3>
                            <p className="text-xs text-neutral-500">طريقة سريعة بديلة: أعطِ هذا الكود للشريك أو المحاسب لربط حسابه بحسابك مباشرة كـ (مشاهد).</p>
                        </div>
                    </div>

                    <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={handleGenerateNewCode}
                        loading={generatingCode}
                        icon={<RefreshCw className="w-3.5 h-3.5" />}
                        className="!py-2.5 !px-4 !bg-primary/10 hover:!bg-primary/20 !text-primary dark:!text-accent-success !rounded-xl !border-transparent"
                    >
                        {myLinkingCode ? 'تجديد الكود (24 ساعة)' : 'توليد كود آمن'}
                    </Button>
                </div>

                {myLinkingCode && (
                    <div className="bg-neutral-50 dark:bg-neutral-900/50 p-3.5 rounded-xl border border-neutral-100 dark:border-neutral-700/60 flex flex-col sm:flex-row items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                            <span className="text-xl font-black font-mono tracking-widest text-primary select-all">
                                {myLinkingCode}
                            </span>
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => handleCopyCode(myLinkingCode)}
                                className="!p-1.5 text-neutral-400 hover:text-primary hover:bg-neutral-200/60 dark:hover:bg-neutral-700 !rounded-lg"
                                title="نسخ الكود"
                                aria-label="نسخ الكود"
                            >
                                {copiedCode ? <Check className="w-4 h-4 text-accent-success" /> : <Copy className="w-4 h-4" />}
                            </Button>
                        </div>

                        <div className="flex items-center gap-2">
                            {myExpiresAt && new Date(myExpiresAt).getTime() < Date.now() ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-accent-warning/10 text-accent-warning dark:bg-accent-warning/20 dark:text-accent-warning border border-accent-warning/20 dark:border-accent-warning/30">
                                    <Clock className="w-3 h-3" />
                                    منتهي الصلاحية
                                </span>
                            ) : myExpiresAt ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-accent-success/10 text-accent-success dark:bg-accent-success/20 dark:text-accent-success border border-accent-success/20 dark:border-accent-success/30">
                                    <Clock className="w-3 h-3" />
                                    صالح حتى {new Date(myExpiresAt).toLocaleTimeString('ar-EG-u-nu-latn', { hour: '2-digit', minute: '2-digit' })}
                                </span>
                            ) : null}
                        </div>
                    </div>
                )}
            </div>

            <div className="bg-white dark:bg-neutral-800 rounded-2xl p-6 shadow-soft border border-neutral-100 dark:border-neutral-700">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-accent-info/10 dark:bg-accent-info/20 text-accent-info dark:text-accent-info rounded-xl">
                            <ShieldIcon className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-neutral-800 dark:text-neutral-50">صلاحيات الوصول والتقارير</h3>
                            <p className="text-sm text-neutral-500">أنشئ حسابات دخول لتمكين الشركاء أو المستثمرين من متابعة التقارير والبيانات.</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button 
                            variant="ghost"
                            size="sm"
                            onClick={fetchSubUsers}
                            className="!p-2 text-neutral-400 hover:text-primary !rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-700"
                            title="تحديث البيانات"
                            aria-label="تحديث البيانات"
                        >
                            <svg className={`w-5 h-5 ${fetching ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                        </Button>
                        {!isAdding && (
                            <Button
                                variant="primary"
                                size="md"
                                onClick={() => setIsAdding(true)}
                                icon={<PlusIcon className="w-5 h-5" />}
                                className="!rounded-xl shadow-md shadow-primary/20"
                            >
                                إضافة مطلع
                            </Button>
                        )}
                    </div>
                </div>

                {isAdding && (
                    <div className="bg-neutral-50 dark:bg-neutral-900/50 rounded-2xl p-6 border border-neutral-100 dark:border-neutral-700 mb-8 animate-page-enter">
                        <div className="flex items-center justify-between mb-4">
                            <h4 className="font-bold text-neutral-800 dark:text-neutral-50">إضافة مستخدم جديد للتقارير</h4>
                            <Button variant="ghost" size="sm" onClick={() => setIsAdding(false)} className="text-sm text-neutral-500 hover:text-neutral-700">
                                إلغاء
                            </Button>
                        </div>
                        <form onSubmit={handleCreateAccount} className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-neutral-500 mr-2">الاسم (شريك / مستثمر / مطلع)</label>
                                    <div className="relative">
                                        <UserIcon className="absolute right-3 top-3 w-5 h-5 text-neutral-400" />
                                        <input
                                            type="text"
                                            required
                                            value={newMember.full_name}
                                            onChange={(e) => setNewMember({ ...newMember, full_name: e.target.value })}
                                            className="w-full bg-white dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 rounded-xl pr-10 py-2.5 text-sm focus:ring-primary"
                                            placeholder="مثال: أحمد محمد"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-neutral-500 mr-2">اسم المستخدم (للوصول للتقارير)</label>
                                    <div className="relative">
                                        <FingerPrintIcon className="absolute right-3 top-3 w-5 h-5 text-neutral-400" />
                                        <input
                                            type="text"
                                            required
                                            value={newMember.username}
                                            onChange={(e) => setNewMember({ ...newMember, username: e.target.value.trim() })}
                                            className="w-full bg-white dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 rounded-xl pr-10 py-2.5 text-sm focus:ring-primary"
                                            placeholder="مثال: partner2024"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-neutral-500 mr-2">كلمة المرور</label>
                                    <div className="relative">
                                        <LockClosedIcon className="absolute right-3 top-3 w-5 h-5 text-neutral-400" />
                                        <input
                                            type="text"
                                            required
                                            value={newMember.password}
                                            onChange={(e) => setNewMember({ ...newMember, password: e.target.value })}
                                            className="w-full bg-white dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 rounded-xl pr-10 py-2.5 text-sm focus:ring-primary"
                                            placeholder="أدخل كلمة مرور الدخول"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-neutral-500 mr-2">مستوى الوصول</label>
                                    <select
                                        value={newMember.role}
                                        onChange={(e) => setNewMember({ ...newMember, role: e.target.value as any })}
                                        className="w-full bg-white dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 rounded-xl px-4 py-2.5 text-sm focus:ring-primary"
                                    >
                                        <option value="viewer">مشاهد فقط (اطلاع على التقارير)</option>
                                        <option value="editor">محرر (إدخال بيانات ومتابعة)</option>
                                    </select>
                                </div>
                            </div>
                            <div className="flex justify-end pt-2">
                                <Button
                                    type="submit"
                                    variant="primary"
                                    size="md"
                                    loading={loading}
                                    className="!px-6 !py-2.5 !rounded-xl shadow-lg shadow-primary/20"
                                >
                                    تأكيد إنشاء الحساب
                                </Button>
                            </div>
                        </form>
                    </div>
                )}

                <div className="space-y-3">
                    <h4 className="text-xs font-black text-neutral-400 uppercase tracking-widest px-1 flex items-center gap-2">
                        المستخدمون النشطون
                        <span className="bg-neutral-100 dark:bg-neutral-700 px-2 py-0.5 rounded-full">{subUsers.length}</span>
                    </h4>
                    
                    {fetching ? (
                        <div className="py-8 text-center text-neutral-400">جاري التحميل...</div>
                    ) : subUsers.length === 0 ? (
                        <div className="py-12 bg-neutral-50 dark:bg-neutral-900/30 rounded-2xl border-2 border-dashed border-neutral-200 dark:border-neutral-800 text-center">
                            <UserIcon className="w-12 h-12 mx-auto text-neutral-300 mb-2 opacity-50" />
                            <p className="text-sm text-neutral-400 font-bold">لا توجد حسابات مشاركة حالياً.</p>
                            <p className="text-2xs text-neutral-500 mt-1">ابدأ بإضافة حساب لتمكين أطراف أخرى من الاطلاع على التقارير.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {subUsers.map(member => {
                                const isOnline = !!(presences && presences[`virtual_${member.id}`]);
                                return (
                                <div key={member.id} className="flex items-center justify-between p-4 bg-neutral-50 dark:bg-neutral-900/50 rounded-2xl border border-neutral-100 dark:border-neutral-700 hover:border-primary/30 transition-all group">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className="relative shrink-0">
                                            <div className="w-11 h-11 rounded-xl bg-white dark:bg-neutral-800 shadow-sm border border-neutral-100 dark:border-neutral-700 flex items-center justify-center text-primary font-black text-lg">
                                                {member.full_name?.charAt(0) || 'م'}
                                            </div>
                                            {isOnline && (
                                                <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-accent-success border-2 border-white dark:border-neutral-900 rounded-full"></span>
                                            )}
                                        </div>
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-2">
                                                <p className="text-sm font-bold text-neutral-800 dark:text-neutral-50 truncate">{member.full_name}</p>
                                                {isOnline && <span className="text-2xs font-bold text-accent-success animate-pulse shrink-0">متصل الآن</span>}
                                            </div>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <span className="text-2xs font-mono text-neutral-500 bg-neutral-100 dark:bg-neutral-800 px-1.5 py-0.5 rounded italic">@{member.username}</span>
                                                <span className={`text-2xs px-1.5 py-0.5 rounded-full font-bold shrink-0 ${member.role === 'viewer' ? 'bg-accent-info/10 text-accent-info dark:bg-accent-info/20' : 'bg-accent-success/10 text-accent-success dark:bg-accent-success/20'}`}>
                                                    {member.role === 'viewer' ? 'مشاهد' : 'محرر'}
                                                </span>
                                            </div>
                                            {isOnline ? null : member.last_seen ? (
                                                <p className="text-2xs text-neutral-400 mt-1">
                                                    آخر دخول: {new Date(member.last_seen).toLocaleString('ar-EG-u-nu-latn', { 
                                                         dateStyle: 'medium', 
                                                         timeStyle: 'short'
                                                     })}
                                                </p>
                                            ) : (
                                                <p className="text-2xs text-neutral-400 mt-1 italic">لم يسجل دخول بعد</p>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1 shrink-0">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleCopyInfo(member)}
                                            className="!p-2 text-neutral-400 hover:text-primary hover:bg-neutral-100 dark:hover:bg-neutral-700/60 !rounded-xl"
                                            title="نسخ بيانات الدخول"
                                            aria-label="نسخ بيانات الدخول"
                                        >
                                            {copiedId === member.id ? <Check className="w-4 h-4 text-accent-success" /> : <Copy className="w-4 h-4" />}
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => setMemberToDelete(member)}
                                            className="!p-2 text-accent-danger hover:text-accent-danger hover:bg-accent-danger/10 dark:hover:bg-accent-danger/20 !rounded-xl"
                                            title="حذف حساب المطلع"
                                            aria-label="حذف حساب المطلع"
                                        >
                                            <TrashIcon className="w-5 h-5" />
                                        </Button>
                                    </div>
                                </div>
                            )})}
                        </div>
                    )}
                </div>
            </div>

            <div className="bg-accent-success/10 dark:bg-accent-success/20/10 border border-accent-success/20 dark:border-accent-success/30 rounded-2xl p-4 flex gap-3">
                <div className="w-1 h-10 bg-emerald-400 rounded-full shrink-0"></div>
                <div className="text-[11px] text-accent-success dark:text-emerald-200 leading-normal">
                    <p className="font-black mb-1">كيف يعمل هذا النظام؟</p>
                    <ul className="list-disc list-inside space-y-1 font-bold opacity-80">
                        <li>بدلاً من إرسال الصور أو الملفات، قم بإنشاء حساب دخول بسيط للشريك أو المستثمر.</li>
                        <li>أعطِ هذه البيانات للشخص ليتمكن من الدخول ورؤية أرصدة وتقارير المزرعة لحظياً عبر خيار (دخول التقارير).</li>
                        <li>يمكنك التحكم في الصلاحيات (مشاهدة فقط أو إمكانية التعديل).</li>
                        <li>تتم مشاركة البيانات بشكل آمن وتدفق حي للتقارير والعمليات.</li>
                    </ul>
                </div>
            </div>
        </div>
    );
};

export default TeamSettings;
