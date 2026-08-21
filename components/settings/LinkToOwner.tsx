
import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useData } from '../../contexts/DataContext';
import { useToast } from '../../hooks/useToast';
import { ShieldIcon, CheckCircleIcon } from '../Icons';

const LinkToOwner: React.FC = () => {
    const { profile } = useData();
    const { showToast } = useToast();
    const [code, setCode] = useState('');
    const [loading, setLoading] = useState(false);

    const handleLink = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!code.trim() || !profile?.id) return;

        setLoading(true);
        try {
            // 1. Find owner by linking code
            // We search for any user with this code (linking_code is unique enough)
            const { data: owner, error: findError } = await supabase
                .from('profiles')
                .select('id, full_name')
                .eq('linking_code', code.trim().toUpperCase())
                .maybeSingle();

            if (findError) throw findError;
            if (!owner) {
                showToast('كود غير صحيح أو منتهي الصلاحية. تأكد من الكود من صاحب الحساب.', 'error');
                setLoading(false);
                return;
            }

            if (owner.id === profile.id) {
                showToast('لا يمكنك ربط حسابك بنفسك.', 'error');
                setLoading(false);
                return;
            }

            // 2. Link this user as viewer
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

            showToast(`تم الربط بنجاح بحساب ${owner.full_name}. سيتم تحديث البيانات الآن.`);
            
            // Reload page to apply changes
            setTimeout(() => window.location.reload(), 1500);
        } catch (_err: any) {
            console.error('Final Link Error:', _err);
            showToast(`فشل في الربط: ${_err.message || 'تأكد من إعدادات Supabase'}`, 'error');
        } finally {
            setLoading(false);
        }
    };

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

    // If linked, show status
    if (profile?.parent_id && profile?.role === 'viewer') {
        return (
            <div className="bg-white dark:bg-neutral-800 rounded-2xl p-6 shadow-soft border border-neutral-100 dark:border-neutral-700">
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-2.5 bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-xl">
                        <CheckCircleIcon className="w-6 h-6" />
                    </div>
                    <div>
                        <h3 className="text-xl font-bold">حالة الربط</h3>
                        <p className="text-sm text-gray-500">أنت الآن متصل بحساب مالك بصلاحيات "مشاهدة فقط".</p>
                    </div>
                </div>

                <div className="bg-neutral-50 dark:bg-neutral-900/50 p-4 rounded-xl border border-neutral-100 dark:border-neutral-700 mb-6 flex items-center justify-between">
                    <div>
                        <p className="text-xs font-bold text-neutral-400 mb-1">مرتبط بحساب</p>
                        <p className="font-bold">حساب المالك</p>
                    </div>
                    <button 
                        onClick={handleUnlink}
                        className="px-4 py-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg text-xs font-bold transition-all border border-rose-100 dark:border-rose-900/30"
                    >
                        فك الارتباط
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white dark:bg-neutral-800 rounded-2xl p-6 shadow-soft border border-neutral-100 dark:border-neutral-700">
            <div className="flex items-center gap-3 mb-6">
                <div className="p-2.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-xl">
                    <ShieldIcon className="w-6 h-6" />
                </div>
                <div>
                    <h3 className="text-xl font-bold">الربط بحساب مالك</h3>
                    <p className="text-sm text-gray-500">أدخل الكود الذي أرسله لك صاحب الحساب لعرض بياناته.</p>
                </div>
            </div>

            <form onSubmit={handleLink} className="space-y-4">
                <div>
                    <label className="block text-xs font-black text-neutral-400 uppercase tracking-widest mb-2 px-1">كود الربط</label>
                    <input
                        type="text"
                        required
                        placeholder="أدخل الكود هنا (مثال: ZOG-123)..."
                        className="w-full h-14 bg-neutral-100 dark:bg-neutral-900 border-2 border-transparent focus:border-primary/30 rounded-2xl px-6 text-lg font-black tracking-widest text-center focus:ring-4 focus:ring-primary/10 transition-all uppercase"
                        value={code}
                        onChange={(e) => setCode(e.target.value.toUpperCase())}
                    />
                </div>
                <button
                    type="submit"
                    disabled={loading}
                    className="w-full h-14 bg-primary hover:bg-primary-dark text-white rounded-2xl font-black text-sm transition-all shadow-lg shadow-primary/20 active:scale-95 disabled:opacity-50"
                >
                    {loading ? 'جاري التحقق...' : 'تأكيد الربط بالحساب'}
                </button>
            </form>
        </div>
    );
};

export default LinkToOwner;
