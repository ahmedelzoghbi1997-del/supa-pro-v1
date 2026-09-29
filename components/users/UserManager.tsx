import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import type { Profile } from '../../types';
import { UsersIcon, Cog6ToothIcon, TrashIcon, WarningIcon, ClockIcon, UserIcon, CheckCircleIcon } from '../Icons';
import { useToast } from '../../hooks/useToast';
import ManageSubscriptionModal from './ManageSubscriptionModal';
import Modal from '../shared/Modal';
import { useData } from '../../contexts/DataContext';
import { useRealtime } from '../../contexts/UIContext';
import { formatTimeAgo } from '../../utils/helpers';

const StatusBadge: React.FC<{ status: Profile['status'] }> = ({ status }) => {
    const statusMap = {
        active: { label: 'نشط', classes: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300' },
        pending: { label: 'قيد المراجعة', classes: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300' },
        rejected: { label: 'مرفوض', classes: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300' },
    };
    const { label, classes } = statusMap[status] || { label: status, classes: 'bg-neutral-200 text-neutral-800' };
    return (
        <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${classes}`}>
            {label}
        </span>
    );
};

const getSubscriptionLabel = (type?: string | null) => {
    switch (type) {
        case 'trial': return 'تجريبي';
        case 'monthly': return 'شهري';
        case 'yearly': return 'سنوي';
        case 'custom': return 'مخصص';
        default: return null;
    }
};

const UserManager: React.FC = () => {
    const { profile } = useData();
    const { presences } = useRealtime();
    const [users, setUsers] = useState<Profile[]>([]);
    const [visits, setVisits] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [userToManage, setUserToManage] = useState<Profile | null>(null);
    const [userToDelete, setUserToDelete] = useState<Profile | null>(null);
    const [deleteConfirmationText, setDeleteConfirmationText] = useState('');
    const { showToast } = useToast();

    const fetchUsers = useCallback(async () => {
        if (!profile) return;
        setLoading(true);

        const [usersRes, visitsRes] = await Promise.all([
            supabase.from('profiles').select('*'),
            supabase.from('report_visits')
                .select('*')
                .not('is_ignored', 'eq', true) // استبعاد أي سجل تم تجاهله صراحة
                .order('accessed_at', { ascending: false })
        ]);
        
        if (usersRes.error) {
            console.error("Error fetching users:", usersRes.error.message);
            showToast('فشل في جلب قائمة المستخدمين.', 'error');
            setUsers([]);
        } else {
            const sortedUsers = (usersRes.data || []).sort((a, b) => {
                if (a.id === profile.id) return -1;
                if (b.id === profile.id) return 1;
                return new Date((b as any).created_at).getTime() - new Date((a as any).created_at).getTime();
            });
            setUsers(sortedUsers);
        }

        if (visitsRes.error) {
            console.error("Error fetching visits:", visitsRes.error.message);
            setVisits([]);
        } else {
            setVisits(visitsRes.data || []);
        }
        setLoading(false);
    }, [profile, showToast]);

    useEffect(() => {
        if (profile?.role === 'owner') {
            fetchUsers();
        }
    }, [profile, fetchUsers]);
    
    // Listen to real-time changes on the profiles table
    useEffect(() => {
        if (profile?.role !== 'owner') return;

        const channel = supabase
            .channel('public-profiles-listener')
            .on(
                'postgres_changes', 
                { event: '*', schema: 'public', table: 'profiles' },
                () => {
                    fetchUsers();
                }
            )
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'report_visits' },
                () => {
                    fetchUsers();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [profile, fetchUsers]);

    const handleUserUpdate = (updatedData: Partial<Profile>) => {
        if (!userToManage) return;
        
        // Create the new user object by merging the old with the new data
        const updatedUser = { ...userToManage, ...updatedData };

        // Update the user in the main list
        setUsers(currentUsers => 
            currentUsers.map(u => (u.id === updatedUser.id ? updatedUser : u))
        );

        // Close the modal
        setUserToManage(null);
    };

    const handleDeleteUser = async () => {
        if (!userToDelete || deleteConfirmationText !== 'حذف نهائي') return;

        // Call the RPC function to delete the user from both profiles and auth.
        const { error: rpcError } = await supabase.rpc('delete_user', { user_id: userToDelete.id });

        if (rpcError) {
            console.error('Error deleting user completely:', rpcError.message);
            showToast(`فشل حذف المستخدم بشكل كامل. السبب: ${rpcError.message}`, 'error');
        } else {
            showToast('تم حذف المستخدم وحسابه بنجاح.');
            setUsers(currentUsers => currentUsers.filter(u => u.id !== userToDelete.id));
        }
        setUserToDelete(null);
        setDeleteConfirmationText('');
    };

    const handleCloseDeleteModal = useCallback(() => {
        setUserToDelete(null);
        setDeleteConfirmationText('');
    }, []);

    const handleDeleteVisit = async (visit: any) => {
        // بدلاً من الحذف النهائي لسجل واحد، نقوم بتعيين is_ignored إلى true
        // لكل السجلات المرتبطة بهذا الزائر لهذا التقرير لضمان عدم بقاء مكررات
        const { error } = await supabase
            .from('report_visits')
            .update({ is_ignored: true })
            .eq('visitor_id', visit.visitor_id)
            .eq('report_id', visit.report_id);

        if (error) {
            showToast('فشل في إخفاء السجل.', 'error');
        } else {
            // تحديث الواجهة لإزالة كل السجلات لهذا الزائر
            setVisits(prev => prev.filter(v => 
                !(v.visitor_id === visit.visitor_id && v.report_id === visit.report_id)
            ));
            showToast('تم إخفاء الزائر بنجاح ولن يظهر مرة أخرى.');
        }
    };

    const headClasses = "p-4 text-sm font-semibold text-right text-neutral-500 dark:text-neutral-400 border-b-2 border-neutral-200 dark:border-neutral-700";
    const cellClasses = "p-4 text-sm text-neutral-800 dark:text-neutral-200";

    const renderUsers = () => {
        if (loading) {
            return (
                <>
                    {/* Desktop Skeleton */}
                    <div className="hidden md:block bg-neutral-0 dark:bg-neutral-800 rounded-lg p-8 text-center text-neutral-500 border border-neutral-200 dark:border-neutral-700">جاري تحميل المستخدمين...</div>
                    {/* Mobile Skeleton */}
                    <div className="md:hidden space-y-4">
                        {[1, 2, 3].map(i => (
                             <div key={i} className="bg-neutral-0 dark:bg-neutral-800 rounded-lg shadow-soft p-4 space-y-4 animate-pulse border border-neutral-200 dark:border-neutral-700">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <div className="h-6 bg-neutral-200 dark:bg-neutral-700 rounded w-32 mb-2"></div>
                                        <div className="h-4 bg-neutral-200 dark:bg-neutral-700 rounded w-48"></div>
                                    </div>
                                    <div className="h-6 bg-neutral-200 dark:bg-neutral-700 rounded-full w-20"></div>
                                </div>
                                <div className="flex items-center justify-end pt-3 border-t border-neutral-200 dark:border-neutral-700">
                                    <div className="h-8 bg-neutral-200 dark:bg-neutral-700 rounded-md w-24"></div>
                                </div>
                            </div>
                        ))}
                    </div>
                </>
            );
        }

        if (users.length === 0) {
            return (
                <div className="bg-neutral-0 dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700">
                    <div className="text-center p-8 text-neutral-500">
                        <UsersIcon className="mx-auto h-12 w-12 text-neutral-400" />
                        <p className="mt-4">لا يوجد مستخدمين لعرضهم.</p>
                    </div>
                </div>
            );
        }

        return (
            <>
                {/* Desktop Table */}
                <div className="hidden md:block bg-neutral-0 dark:bg-neutral-800 rounded-lg shadow-soft overflow-x-auto border border-neutral-200 dark:border-neutral-700">
                    <table className="w-full min-w-[600px]">
                        <thead className="bg-neutral-50 dark:bg-neutral-900/50">
                            <tr>
                                <th className={headClasses}>الاسم</th>
                                <th className={headClasses}>البريد الإلكتروني</th>
                                <th className={headClasses}>الحالة</th>
                                <th className={headClasses}></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-200 dark:divide-neutral-700">
                            {users.map((user) => {
                                const isCurrentUser = user.id === profile!.id;
                                const isOnline = isCurrentUser || !!(presences && presences[user.id]);
                                const presenceColor = isOnline ? 'bg-green-500' : 'bg-neutral-400';
                                const subscriptionLabel = getSubscriptionLabel(user.subscription_type);
                                
                                return (
                                <tr key={user.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-700/50">
                                    <td className={cellClasses}>
                                        <div className="flex items-center gap-3">
                                             <span className={`h-2.5 w-2.5 rounded-full flex-shrink-0 ${presenceColor}`}></span>
                                            <div>
                                                <p className="font-semibold">{user.full_name}</p>
                                                {isOnline ? (
                                                    <p className="text-xs text-green-500">متصل الآن</p>
                                                ) : (
                                                    <p className="text-xs text-neutral-500">{user.last_seen_at ? `آخر ظهور: ${formatTimeAgo(user.last_seen_at)}` : `انضم: ${formatTimeAgo(user.created_at)}`}</p>
                                                )}
                                            </div>
                                            {isCurrentUser && <span className="text-xs px-2 py-0.5 font-semibold rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300">أنت</span>}
                                            {user.role === 'owner' && <span className="text-xs px-2 py-0.5 font-semibold rounded-full bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300">مالك</span>}
                                        </div>
                                    </td>
                                    <td className={cellClasses}>{user.email || 'غير متوفر'}</td>
                                    <td className={cellClasses}>
                                        <div className="flex items-center gap-2">
                                            <StatusBadge status={user.status} />
                                            {subscriptionLabel && <span className="text-xs text-neutral-500">{subscriptionLabel}</span>}
                                        </div>
                                    </td>
                                    <td className={`${cellClasses} text-left`}>
                                        <div className="flex items-center justify-end gap-1">
                                            {user.id !== profile!.id && (
                                                <button 
                                                    onClick={() => setUserToManage(user)} 
                                                    className="flex items-center gap-2 text-sm bg-neutral-100 dark:bg-neutral-700 hover:bg-neutral-200 dark:hover:bg-neutral-600 px-3 py-1.5 rounded-md font-semibold">
                                                    <Cog6ToothIcon className="w-4 h-4" />
                                                    إدارة
                                                </button>
                                            )}
                                            {user.role !== 'owner' && (
                                                <button
                                                    onClick={() => setUserToDelete(user)}
                                                    className="p-2 text-neutral-400 hover:text-accent-danger hover:bg-accent-danger/10 rounded-md transition-colors"
                                                    aria-label={`حذف ${user.full_name}`}
                                                >
                                                    <TrashIcon className="w-5 h-5" />
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            )})}
                        </tbody>
                    </table>
                </div>

                {/* Mobile Card View */}
                <div className="md:hidden space-y-4">
                    {users.map((user) => {
                        const isCurrentUser = user.id === profile!.id;
                        const isOnline = isCurrentUser || !!(presences && presences[user.id]);
                        const presenceColor = isOnline ? 'bg-green-500' : 'bg-neutral-400';
                        const subscriptionLabel = getSubscriptionLabel(user.subscription_type);

                        return (
                        <div key={user.id} className="bg-neutral-0 dark:bg-neutral-800 rounded-lg shadow-soft p-4 space-y-4 border border-neutral-200 dark:border-neutral-700">
                            <div className="flex justify-between items-start">
                                <div className="flex-1 min-w-0 pr-4">
                                     <div className="flex items-center gap-3 mb-1">
                                        <p className="font-bold text-lg truncate">{user.full_name}</p>
                                        {isCurrentUser && <span className="text-xs px-2 py-0.5 font-semibold rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300">أنت</span>}
                                     </div>
                                    <div className="flex items-center gap-2">
                                        <span className={`h-2 w-2 rounded-full flex-shrink-0 ${presenceColor}`}></span>
                                        {isOnline ? (
                                            <p className="text-xs text-green-500">متصل الآن</p>
                                        ) : (
                                            <p className="text-xs text-neutral-500">{user.last_seen_at ? `آخر ظهور: ${formatTimeAgo(user.last_seen_at)}` : `انضم: ${formatTimeAgo(user.created_at)}`}</p>
                                        )}
                                    </div>
                                </div>
                                <div className="flex-shrink-0">
                                    <StatusBadge status={user.status} />
                                </div>
                            </div>
                            <div className="flex items-center justify-between pt-3 border-t border-neutral-200 dark:border-neutral-700">
                                <div>
                                    {user.role === 'owner' && (
                                        <span className="text-xs px-2 py-0.5 font-semibold rounded-full bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300">
                                            مالك
                                        </span>
                                    )}
                                     {subscriptionLabel && <span className="text-xs text-neutral-500 ml-2">{subscriptionLabel}</span>}
                                </div>
                                <div className="flex items-center gap-1">
                                    {user.id !== profile!.id && (
                                        <button 
                                            onClick={() => setUserToManage(user)}
                                            className="flex items-center gap-2 text-sm bg-neutral-100 dark:bg-neutral-700 hover:bg-neutral-200 dark:hover:bg-neutral-600 px-3 py-1.5 rounded-md font-semibold">
                                            <Cog6ToothIcon className="w-4 h-4" />
                                            إدارة
                                        </button>
                                    )}
                                    {user.role !== 'owner' && (
                                        <button
                                            onClick={() => setUserToDelete(user)}
                                            className="p-2 text-neutral-400 hover:text-accent-danger hover:bg-accent-danger/10 rounded-md transition-colors"
                                            aria-label={`حذف ${user.full_name}`}
                                        >
                                            <TrashIcon className="w-5 h-5" />
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    )})}
                </div>
            </>
        );
    };

    if (!profile || profile.role !== 'owner') {
        return <div>Access Denied</div>;
    }

    return (
        <>
            {userToManage && (
                <ManageSubscriptionModal 
                    user={userToManage}
                    onClose={() => setUserToManage(null)}
                    onUpdate={handleUserUpdate}
                />
            )}
            
            <Modal
                isOpen={!!userToDelete}
                onClose={handleCloseDeleteModal}
                title="تأكيد الحذف النهائي"
            >
                <div className="space-y-4">
                    <div className="flex items-start gap-3 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-500/30">
                        <WarningIcon className="w-10 h-10 text-red-500 flex-shrink-0" />
                        <div>
                            <p className="font-semibold text-red-800 dark:text-red-200">
                                أنت على وشك حذف المستخدم: <span className="font-bold">{userToDelete?.full_name}</span> ({userToDelete?.email})
                            </p>
                            <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                                هذا الإجراء سيحذف المستخدم وحسابه و<span className="font-bold">جميع بياناته بالكامل</span> (الفواتير، المصروفات، إلخ) بشكل نهائي. <span className="font-bold">لا يمكن التراجع عن هذا الإجراء.</span>
                            </p>
                        </div>
                    </div>
                     <div>
                        <label htmlFor="delete-confirm" className="block text-sm font-medium text-neutral-600 dark:text-neutral-300 mb-2">
                           للتأكيد، يرجى كتابة "حذف نهائي" في الحقل أدناه.
                        </label>
                        <input
                            id="delete-confirm"
                            type="text"
                            value={deleteConfirmationText}
                            onChange={(e) => setDeleteConfirmationText(e.target.value)}
                            className="w-full bg-neutral-100 dark:bg-neutral-800 border-neutral-300 dark:border-neutral-700 border rounded-lg p-2 focus:ring-2 focus:ring-accent-danger focus:border-accent-danger transition"
                        />
                    </div>
                </div>
                <div className="mt-6 flex justify-start gap-4 flex-row-reverse">
                    <button
                        onClick={handleDeleteUser}
                        disabled={deleteConfirmationText !== 'حذف نهائي'}
                        className="rounded-lg bg-accent-danger px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-700 disabled:bg-red-300 dark:disabled:bg-red-800 disabled:cursor-not-allowed"
                    >
                        أفهم العواقب، قم بالحذف النهائي
                    </button>
                    <button
                        onClick={handleCloseDeleteModal}
                        className="rounded-lg bg-neutral-100 dark:bg-neutral-800 px-4 py-2 text-sm font-semibold text-neutral-800 dark:text-neutral-100 shadow-sm hover:bg-neutral-200 dark:hover:bg-neutral-700"
                    >
                        إلغاء
                    </button>
                </div>
            </Modal>
            
            <div className="space-y-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-bold">إدارة المستخدمين</h1>
                        <p className="text-neutral-500 dark:text-neutral-400 mt-1">إدارة اشتراكات المستخدمين وحالة اتصالهم.</p>
                    </div>
                </div>

                {renderUsers()}
                
                <div className="mt-12 space-y-6">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div>
                            <h2 className="text-2xl font-bold flex items-center gap-2">
                                <ClockIcon className="w-6 h-6 text-accent-emerald" />
                                سجلات زيارات التقارير
                            </h2>
                            <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
                                تتبع من قام بفتح روابط التقارير المشتركة في الوقت الفعلي.
                            </p>
                        </div>
                        <div className="flex items-center gap-2 w-full sm:w-auto">
                            <div className="flex items-center gap-2 bg-white dark:bg-neutral-800 p-1 rounded-xl border border-neutral-200 dark:border-neutral-700 shadow-sm">
                                <div className="px-3 py-1.5 text-center border-l border-neutral-100 dark:border-neutral-700">
                                    <p className="text-[9px] text-neutral-400 uppercase font-bold">الإجمالي</p>
                                    <p className="text-sm font-bold" dir="ltr">{visits.length}</p>
                                </div>
                                <div className="px-3 py-1.5 text-center">
                                    <p className="text-[9px] text-blue-500 uppercase font-bold">جديد</p>
                                    <p className="text-sm font-bold text-blue-500" dir="ltr">
                                        {visits.filter(v => !v.is_read).length}
                                    </p>
                                </div>
                            </div>
                            
                            <div className="flex gap-1">
                                <button 
                                    onClick={() => fetchUsers()}
                                    className="p-2.5 bg-white dark:bg-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-700 rounded-xl border border-neutral-200 dark:border-neutral-700 transition-all shadow-sm text-neutral-600 dark:text-neutral-400"
                                    title="تحديث البيانات"
                                >
                                    <svg className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                    </svg>
                                </button>

                                {visits.some(v => !v.is_read) && (
                                    <button 
                                        onClick={async () => {
                                            const { error } = await supabase.from('report_visits').update({ is_read: true }).eq('is_read', false);
                                            if (!error) {
                                                setVisits(prev => prev.map(v => ({ ...v, is_read: true })));
                                                showToast('تم تعيين الكل كمقروء.');
                                            }
                                        }}
                                        className="p-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-xl transition-all shadow-md shadow-blue-500/20 flex items-center gap-2 px-4"
                                    >
                                        <CheckCircleIcon className="w-5 h-5" />
                                        <span className="text-xs font-bold whitespace-nowrap">قراءة الكل</span>
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-neutral-800 rounded-3xl border border-neutral-200 dark:border-neutral-700 overflow-hidden shadow-sm">
                        {visits.length === 0 ? (
                            <div className="p-16 text-center">
                                <div className="w-20 h-20 bg-neutral-100 dark:bg-neutral-800 rounded-full flex items-center justify-center mx-auto mb-6">
                                    <ClockIcon className="w-10 h-10 text-neutral-300 dark:text-neutral-600" />
                                </div>
                                <h3 className="text-lg font-bold text-neutral-800 dark:text-neutral-200 mb-2">لا توجد زيارات بعد</h3>
                                <p className="text-neutral-500 max-w-xs mx-auto">بمجرد أن يفتح المشتركون روابط التقارير، ستظهر سجلاتهم هنا.</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-right border-collapse">
                                    <thead>
                                        <tr className="bg-neutral-50 dark:bg-neutral-900/50">
                                            <th className="p-4 text-xs font-black text-neutral-400 uppercase tracking-widest border-b border-neutral-100 dark:border-neutral-700">الزائر / الجهاز</th>
                                            <th className="p-4 text-xs font-black text-neutral-400 uppercase tracking-widest border-b border-neutral-100 dark:border-neutral-700">رقم التقرير</th>
                                            <th className="p-4 text-xs font-black text-neutral-400 uppercase tracking-widest border-b border-neutral-100 dark:border-neutral-700">التوقيت</th>
                                            <th className="p-4 text-xs font-black text-neutral-400 uppercase tracking-widest border-b border-neutral-100 dark:border-neutral-700 w-20 text-center">إجراءات</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-neutral-100 dark:divide-neutral-700/50">
                                        {visits.map((visit) => (
                                            <tr 
                                                key={visit.id} 
                                                className={`group transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-900/30 ${!visit.is_read ? 'bg-blue-50/30 dark:bg-blue-900/10' : ''}`}
                                                onClick={async () => {
                                                    if (!visit.is_read) {
                                                        await supabase.from('report_visits').update({ is_read: true }).eq('id', visit.id);
                                                        setVisits(prev => prev.map(v => v.id === visit.id ? { ...v, is_read: true } : v));
                                                    }
                                                }}
                                            >
                                                <td className="p-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className={`p-2 rounded-xl flex-shrink-0 ${!visit.is_read ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-500' : 'bg-neutral-100 dark:bg-neutral-700 text-neutral-400'}`}>
                                                            <UserIcon className="w-4 h-4" />
                                                        </div>
                                                        <div className="min-w-0 flex-1">
                                                            <input
                                                                type="text"
                                                                key={`${visit.id}-${visit.visitor_name}`} // لإجبار الحقل على التحديث عند جلب البيانات
                                                                defaultValue={visit.visitor_name || ''}
                                                                placeholder="زائر مجهول"
                                                                className="w-full bg-transparent font-bold text-sm outline-none border-b border-transparent focus:border-accent-emerald transition-all py-0.5"
                                                                onClick={(e) => e.stopPropagation()}
                                                                onBlur={async (e) => {
                                                                    const newName = e.target.value.trim();
                                                                    if (newName !== (visit.visitor_name || '')) {
                                                                        // تحديث الاسم في جميع السجلات لهذا الزائر (Visitor ID)
                                                                        const { error } = await supabase
                                                                            .from('report_visits')
                                                                            .update({ visitor_name: newName })
                                                                            .eq('visitor_id', visit.visitor_id);
                                                                            
                                                                        if (!error) {
                                                                            showToast('تم حفظ الاسم بنجاح.');
                                                                            // تحديث الحالة المحلية فوراً
                                                                            setVisits(prev => prev.map(v => 
                                                                                v.visitor_id === visit.visitor_id ? { ...v, visitor_name: newName } : v
                                                                            ));
                                                                        } else {
                                                                            showToast('فشل في حفظ الاسم.', 'error');
                                                                            console.error('Update error:', error.message);
                                                                        }
                                                                    }
                                                                }}
                                                            />
                                                            <p className="text-[10px] text-neutral-400 font-mono" dir="ltr">ID: {visit.visitor_id.slice(0, 8)}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="p-4">
                                                    <span className="text-xs font-mono font-bold text-neutral-600 dark:text-neutral-400 bg-neutral-100 dark:bg-neutral-700 px-2 py-1 rounded-lg">
                                                        #{visit.report_id.slice(0, 8)}
                                                    </span>
                                                </td>
                                                <td className="p-4">
                                                    <div className="text-right">
                                                        <p className="text-xs font-bold text-neutral-700 dark:text-neutral-200" dir="ltr">
                                                            {formatTimeAgo(visit.accessed_at)}
                                                        </p>
                                                        <p className="text-[10px] text-neutral-400" dir="ltr">
                                                            {new Date(visit.accessed_at).toLocaleTimeString('ar-EG-u-nu-latn', { hour: '2-digit', minute: '2-digit' })}
                                                        </p>
                                                    </div>
                                                </td>
                                                <td className="p-4 text-center">
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleDeleteVisit(visit);
                                                        }}
                                                        className="p-2 text-neutral-400 hover:text-accent-danger hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
                                                        title="إخفاء الزائر نهائياً"
                                                    >
                                                        <TrashIcon className="w-4 h-4" />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
};

export default UserManager;