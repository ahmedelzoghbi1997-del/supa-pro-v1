import React, { useState, useEffect } from 'react';
import { useSettings } from '../../contexts/SettingsContext';
import { useToast } from '../../hooks/useToast';
import Card from '../shared/Card';
import Button from '../shared/Button';
import { useData } from '../../contexts/DataContext';

const CommunicationSettings: React.FC = () => {
    const { settings, updateSettings } = useSettings();
    const { showToast } = useToast();
    const { profile } = useData();
    const [welcomeMessage, setWelcomeMessage] = useState(settings.welcome_message);
    const [supportWhatsapp, setSupportWhatsapp] = useState(settings.support_whatsapp);
    const [subscriptionMessage, setSubscriptionMessage] = useState(settings.subscription_page_message);

    useEffect(() => {
        setWelcomeMessage(settings.welcome_message);
        setSupportWhatsapp(settings.support_whatsapp);
        setSubscriptionMessage(settings.subscription_page_message);
    }, [settings]);

    const handleSave = () => {
        updateSettings({
            welcome_message: welcomeMessage,
            support_whatsapp: supportWhatsapp,
            subscription_page_message: subscriptionMessage,
        });
        showToast('تم حفظ الإعدادات بنجاح.');
    };

    if (profile?.role !== 'owner') return null;

    const labelClasses = "block text-sm font-medium text-gray-500 dark:text-gray-300 mb-2 text-right";
    const inputBaseClasses = "w-full bg-neutral-100 dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 text-slate-800 dark:text-white rounded-lg p-3 focus:ring-2 focus:ring-primary focus:border-primary transition placeholder:text-neutral-500";

    return (
        <Card>
            <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-4">إعدادات التواصل والتخصيص</h3>
            <div className="space-y-6">
                 <div>
                    <label htmlFor="welcome_message" className={labelClasses}>رسالة الترحيب للمستخدم الجديد</label>
                    <textarea
                        id="welcome_message"
                        value={welcomeMessage}
                        onChange={(e) => setWelcomeMessage(e.target.value)}
                        rows={3}
                        className={inputBaseClasses}
                    />
                </div>
                 <div>
                    <label htmlFor="support_whatsapp" className={labelClasses}>رقم الواتساب للدعم الفني</label>
                    <input
                        id="support_whatsapp"
                        type="text"
                        value={supportWhatsapp}
                        onChange={(e) => setSupportWhatsapp(e.target.value)}
                        className={inputBaseClasses}
                        placeholder="e.g., 201012345678"
                    />
                </div>
                <div>
                    <label htmlFor="subscription_page_message" className={labelClasses}>رسالة صفحة الاشتراك</label>
                    <textarea
                        id="subscription_page_message"
                        value={subscriptionMessage}
                        onChange={(e) => setSubscriptionMessage(e.target.value)}
                        rows={3}
                        className={inputBaseClasses}
                    />
                </div>
                <div className="flex justify-end">
                    <Button
                        variant="primary"
                        onClick={handleSave}
                        className="py-2 px-6"
                    >
                        حفظ التغييرات
                    </Button>
                </div>
            </div>
        </Card>
    );
};

export default CommunicationSettings;
