import React, { useState, useEffect } from 'react';
import type { Profile } from '../../types';
import Modal from '../shared/Modal';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../hooks/useToast';
import { UserIcon, WarningIcon } from '../Icons';
import { formatNumberWithCommas, parseFormattedNumber } from '../../utils/helpers';

interface ManageSubscriptionModalProps {
    user: Profile;
    onClose: () => void;
    onUpdate: (updatedData: Partial<Profile>) => void;
}

const getSubscriptionLabel = (type?: string | null) => {
    switch (type) {
        case 'trial': return 'تجريبي';
        case 'monthly': return 'شهري';
        case 'yearly': return 'سنوي';
        case 'custom': return 'مخصص';
        default: return 'لا يوجد';
    }
};

const ManageSubscriptionModal: React.FC<ManageSubscriptionModalProps> = ({ user, onClose, onUpdate }) => {
    const { showToast } = useToast();
    const [status, setStatus] = useState<Profile['status']>(user.status);
    const [days, setDays] = useState('0');
    const [hours, setHours] = useState('0');
    const [minutes, setMinutes] = useState('0');
    const [remainingTime, setRemainingTime] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: true });
    const [isCancelConfirmOpen, setCancelConfirmOpen] = useState(false);

    useEffect(() => {
        const calculateRemaining = () => {
            if (!user.subscription_ends_at) {
                setRemainingTime({ days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: true });
                return;
            }
            const endDate = new Date(user.subscription_ends_at);
            const now = new Date();
            const diff = endDate.getTime() - now.getTime();

            if (diff <= 0) {
                setRemainingTime({ days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: true });
                return;
            }
            
            const days = Math.floor(diff / (1000 * 60 * 60 * 24));
            const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((diff % (1000 * 60)) / 1000);
            
            setRemainingTime({ days, hours, minutes, seconds, isExpired: false });
        };

        calculateRemaining();
        const interval = setInterval(calculateRemaining, 1000);
        return () => clearInterval(interval);
    }, [user.subscription_ends_at]);
    
    const isCustomDurationValid = (parseInt(days) || 0) > 0 || (parseInt(hours) || 0) > 0 || (parseInt(minutes) || 0) > 0;

    const handleSubscriptionUpdate = async (type: 'trial' | 'monthly' | 'yearly') => {
        const newEndDate = new Date(); // Always calculate from now
        let newSubsType: Profile['subscription_type'] = 'trial';

        if (type === 'trial') {
            newSubsType = 'trial';
            newEndDate.setDate(newEndDate.getDate() + 1);
        } else if (type === 'monthly') {
            newSubsType = 'monthly';
            newEndDate.setDate(newEndDate.getDate() + 30);
        } else if (type === 'yearly') {
            newSubsType = 'yearly';
            newEndDate.setDate(newEndDate.getDate() + 365);
        }

        const payload = {
            subscription_type: newSubsType,
            subscription_ends_at: newEndDate.toISOString(),
            status: 'active' as const,
        };
        
        const { error } = await supabase
            .from('profiles')
            .update(payload)
            .eq('id', user.id);

        if (error) {
            showToast(`فشل تحديث الاشتراك. تحقق من صلاحيات الوصول إلى قاعدة البيانات (RLS). السبب: ${error.message}`, 'error');
        } else {
            showToast('تم تحديث الاشتراك بنجاح.');
            onUpdate(payload);
        }
    };

    const handleCancelSubscription = async () => {
        setCancelConfirmOpen(false);
        const payload = {
            subscription_type: null,
            subscription_ends_at: null,
        };
        const { error } = await supabase
            .from('profiles')
            .update(payload)
            .eq('id', user.id);
            
        if (error) {
            showToast(`فشل إلغاء الاشتراك. تحقق من صلاحيات الوصول إلى قاعدة البيانات (RLS). السبب: ${error.message}`, 'error');
        } else {
            showToast('تم إلغاء الاشتراك.');
            onUpdate(payload);
        }
    };
    
    const handleStatusUpdate = async () => {
        const payload: Partial<Profile> = { status };
        if (status === 'pending' || status === 'rejected') {
            payload.subscription_type = null;
            payload.subscription_ends_at = null;
        }

        const { error } = await supabase
            .from('profiles')
            .update(payload)
            .eq('id', user.id);
        
        if (error) {
            showToast(`فشل تحديث حالة المستخدم. تحقق من صلاحيات الوصول إلى قاعدة البيانات (RLS). السبب: ${error.message}`, 'error');
        } else {
            showToast('تم تحديث حالة المستخدم بنجاح.');
            onUpdate(payload);
        }
    };

    const handleCustomSubscription = async () => {
        if (!isCustomDurationValid) return;
        const numDays = parseInt(days) || 0;
        const numHours = parseInt(hours) || 0;
        const numMinutes = parseInt(minutes) || 0;
        
        const newEndDate = new Date(); // Always calculate from now
        newEndDate.setDate(newEndDate.getDate() + numDays);
        newEndDate.setHours(newEndDate.getHours() + numHours);
        newEndDate.setMinutes(newEndDate.getMinutes() + numMinutes);

        const payload = {
            subscription_type: 'custom' as const,
            subscription_ends_at: newEndDate.toISOString(),
            status: 'active' as const,
        };

        const { error } = await supabase
            .from('profiles')
            .update(payload)
            .eq('id', user.id);

        if (error) {
            showToast(`فشل تفعيل الاشتراك المخصص. تحقق من صلاحيات الوصول إلى قاعدة البيانات (RLS). السبب: ${error.message}`, 'error');
        } else {
            showToast('تم تفعيل الاشتراك المخصص بنجاح.');
            onUpdate(payload);
        }
    };
    
    const renderRemainingTime = () => {
        const timeClass = remainingTime.isExpired ? "text-neutral-500" : remainingTime.days < 7 ? "text-amber-500" : "text-primary";

        if (remainingTime.isExpired) {
            return <p className={`font-bold text-3xl ${timeClass} mt-1`}>منتهي</p>;
        }
        if (remainingTime.days > 0) {
            return <p className={`font-bold text-3xl ${timeClass} mt-1`}>{remainingTime.days} يوم</p>;
        }
        const paddedHours = String(remainingTime.hours).padStart(2, '0');
        const paddedMinutes = String(remainingTime.minutes).padStart(2, '0');
        const paddedSeconds = String(remainingTime.seconds).padStart(2, '0');
        return <p className={`font-bold text-3xl ${timeClass} mt-1 font-mono tracking-wider`}>{`${paddedHours}:${paddedMinutes}:${paddedSeconds}`}</p>;
    };

    const handleNumericChange = (setter: (value: string) => void) => (e: React.ChangeEvent<HTMLInputElement>) => {
        const parsedValue = parseFormattedNumber(e.target.value);
        if (/^\d*$/.test(parsedValue)) {
            setter(parsedValue);
        }
    };

    return (
        <>
            <Modal isOpen={isCancelConfirmOpen} onClose={() => setCancelConfirmOpen(false)} title="تأكيد إلغاء الاشتراك">
                <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 dark:bg-red-900/50 sm:h-10 sm:w-10">
                        <WarningIcon className="h-6 w-6 text-red-600 dark:text-red-400" />
                    </div>
                    <div className="mt-0 text-right">
                        <p className="text-neutral-600 dark:text-neutral-300">هل أنت متأكد من رغبتك في إلغاء اشتراك هذا المستخدم؟ سيتم إلغاء وصوله إلى التطبيق فورًا.</p>
                    </div>
                </div>
                <div className="mt-6 flex justify-start gap-4 flex-row-reverse">
                    <button onClick={handleCancelSubscription} className="rounded-lg bg-accent-danger px-4 py-2 text-sm font-semibold text-white">نعم، قم بالإلغاء</button>
                    <button onClick={() => setCancelConfirmOpen(false)} className="rounded-lg bg-neutral-100 dark:bg-neutral-800 px-4 py-2 text-sm font-semibold">تراجع</button>
                </div>
            </Modal>

            <Modal isOpen={true} onClose={onClose} title="إدارة المستخدم" size="3xl">
                <div className="space-y-6">
                    <div className="flex items-center gap-4 bg-neutral-50 dark:bg-neutral-900/50 p-4 rounded-lg">
                        <UserIcon className="w-10 h-10 text-neutral-500 flex-shrink-0" />
                        <div>
                            <p className="font-bold text-xl">{user.full_name}</p>
                            <p className="text-sm text-neutral-500 dark:text-neutral-400">{user.email}</p>
                        </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-x-8 gap-y-6">
                        {/* Right Column: Status */}
                        <div className="space-y-4">
                            <div className={`bg-neutral-50 dark:bg-neutral-800/50 p-4 rounded-lg text-center border-2 ${remainingTime.isExpired ? "border-neutral-300 dark:border-neutral-600" : remainingTime.days < 7 ? "border-amber-400 dark:border-amber-500" : "border-primary"}`}>
                                <p className="text-sm text-neutral-500 dark:text-neutral-400">الوقت المتبقي</p>
                                {renderRemainingTime()}
                            </div>
                            <div className="text-sm space-y-2">
                                <div className="flex justify-between"><span>نوع الاشتراك:</span> <span className="font-semibold">{getSubscriptionLabel(user.subscription_type)}</span></div>
                                <div className="flex justify-between"><span>تاريخ الانتهاء:</span> <span className="font-semibold">{user.subscription_ends_at ? new Date(user.subscription_ends_at).toLocaleDateString('ar-EG-u-nu-latn') : 'لا يوجد'}</span></div>
                            </div>
                        </div>

                        {/* Left Column: Actions */}
                        <div className="space-y-6">
                            <div>
                                <h4 className="font-semibold mb-2">تغيير الحالة</h4>
                                <div className="p-1.5 bg-neutral-100 dark:bg-neutral-900/50 rounded-lg flex gap-1">
                                    {(['active', 'pending', 'rejected'] as const).map(s => (
                                        <button key={s} onClick={() => setStatus(s)} className={`flex-1 py-1.5 text-sm rounded-md font-semibold transition-colors ${status === s ? 'bg-primary text-white shadow' : 'text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700/50'}`}>
                                            {s === 'active' ? 'نشط' : s === 'pending' ? 'قيد المراجعة' : 'مرفوض'}
                                        </button>
                                    ))}
                                </div>
                                {status !== user.status && (
                                    <button onClick={handleStatusUpdate} className="w-full mt-2 text-sm bg-primary/10 text-primary font-semibold py-2 rounded-lg hover:bg-primary/20">حفظ تغيير الحالة</button>
                                )}
                            </div>

                            <fieldset>
                                <legend className="font-semibold mb-2 text-neutral-800 dark:text-neutral-100">تفعيل/تمديد الاشتراك</legend>
                                <div className="grid grid-cols-3 gap-2 mb-3">
                                    <button onClick={() => handleSubscriptionUpdate('trial')} className="p-2 bg-blue-100 hover:bg-blue-200 dark:bg-blue-900/50 dark:hover:bg-blue-900 text-blue-800 dark:text-blue-300 font-semibold rounded-lg text-sm">تجريبي</button>
                                    <button onClick={() => handleSubscriptionUpdate('monthly')} className="p-2 bg-green-100 hover:bg-green-200 dark:bg-green-900/50 dark:hover:bg-green-900 text-green-800 dark:text-green-300 font-semibold rounded-lg text-sm">شهري</button>
                                    <button onClick={() => handleSubscriptionUpdate('yearly')} className="p-2 bg-purple-100 hover:bg-purple-200 dark:bg-purple-900/50 dark:hover:bg-purple-900 text-purple-800 dark:text-purple-300 font-semibold rounded-lg text-sm">سنوي</button>
                                </div>
                                <div className="grid grid-cols-3 gap-2 mb-2">
                                    {/* Inputs for custom duration */}
                                    <input type="text" inputMode="numeric" placeholder="أيام" value={formatNumberWithCommas(days)} onChange={handleNumericChange(setDays)} min="0" className="w-full p-2 bg-neutral-100 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-600 rounded-md text-sm" />
                                    <input type="text" inputMode="numeric" placeholder="ساعات" value={formatNumberWithCommas(hours)} onChange={handleNumericChange(setHours)} min="0" max="23" className="w-full p-2 bg-neutral-100 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-600 rounded-md text-sm" />
                                    <input type="text" inputMode="numeric" placeholder="دقائق" value={formatNumberWithCommas(minutes)} onChange={handleNumericChange(setMinutes)} min="0" max="59" className="w-full p-2 bg-neutral-100 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-600 rounded-md text-sm" />
                                </div>
                                <button onClick={handleCustomSubscription} disabled={!isCustomDurationValid} className="w-full p-2 bg-primary text-white font-semibold rounded-lg text-sm hover:bg-primary-dark disabled:bg-primary/50">تفعيل مخصص</button>
                            </fieldset>
                            
                            <div className="p-4 border-t border-dashed border-red-500/50">
                                <h4 className="font-semibold text-red-600 dark:text-red-400 mb-2">منطقة الخطر</h4>
                                <button onClick={() => setCancelConfirmOpen(true)} className="w-full p-2 bg-red-100 hover:bg-red-200 dark:bg-red-900/50 dark:hover:bg-red-900 text-red-800 dark:text-red-300 font-semibold rounded-lg text-sm">إلغاء الاشتراك الحالي</button>
                            </div>

                        </div>
                    </div>
                </div>
            </Modal>
        </>
    );
};

export default ManageSubscriptionModal;
