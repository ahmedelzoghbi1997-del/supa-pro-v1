import React, { useState } from 'react';
import AppearanceSettings from './AppearanceSettings';
import DataSettings from './DataSettings';
import SizeSettings from './SizeSettings';
import TerminologySettings from './TerminologySettings';
import AccountSecuritySettings from './AccountSecuritySettings';
import SystemSettings from './SystemSettings';
import FinancialSettings from './FinancialSettings';
import CommunicationSettings from './CommunicationSettings';
import TeamSettings from './TeamSettings';
import LinkToOwner from './LinkToOwner';
import { PWAInstallButton } from '../shared/PWAInstallButton';
import { useData } from '../../contexts/DataContext';
import { useRealtimeListener } from '../../contexts/RealtimeNotificationContext';
import { subscribeToWebPush } from '../../lib/notifications';

type SettingsTab = 'systems_terms' | 'financial' | 'appearance' | 'account_data' | 'team';

const SettingsManager: React.FC = () => {
    const { profile, invoices, expenses, cycles } = useData();
    const { permission, requestAndTestNotifications, realtimeStatus } = useRealtimeListener();
    const [activeTab, setActiveTab] = useState<SettingsTab>('systems_terms');
    const [isTestingNotification, setIsTestingNotification] = useState(false);
    const [isSubscribingPush, setIsSubscribingPush] = useState(false);

    const handleNotificationTest = async () => {
        setIsTestingNotification(true);
        try {
            await requestAndTestNotifications();
            // تفعيل واشتراك Web Push وحفظه بالسيرفر تلقائياً عند تجربة وتفعيل الإشعارات
            const targetUserId = profile?.id || (profile as any)?.owner_id || profile?.parent_id;
            await subscribeToWebPush(targetUserId);
        } finally {
            setIsTestingNotification(false);
        }
    };

    const handleSubscribeWebPush = async () => {
        setIsSubscribingPush(true);
        try {
            const targetUserId = profile?.id || (profile as any)?.owner_id || profile?.parent_id;
            await subscribeToWebPush(targetUserId);
        } finally {
            setIsSubscribingPush(false);
        }
    };
    
    const hasData = invoices.length > 0 || expenses.length > 0 || cycles.length > 0;
    const isOwner = profile?.role === 'owner' || (hasData && !profile?.parent_id);
    const isViewer = profile?.role === 'viewer';
    
    const tabs: { id: SettingsTab; label: string; visible?: boolean }[] = [
        { id: 'systems_terms', label: 'الأنظمة والمصطلحات', visible: !isViewer },
        { id: 'financial', label: 'المالية', visible: !isViewer },
        { id: 'appearance', label: 'المظهر والواجهة', visible: true },
        { 
            id: 'team', 
            label: isOwner ? 'مشاركة التقارير (المشاهدين)' : (isViewer ? 'حالة الارتباط' : 'الارتباط بمالك'), 
            visible: true 
        },
        { id: 'account_data', label: 'الحساب والبيانات', visible: !isViewer },
    ];

    const activeTabs = tabs.filter(t => t.visible);

    const renderContent = () => {
        switch (activeTab) {
            case 'systems_terms':
                return (
                    <div className="space-y-8">
                        <SystemSettings />
                        <TerminologySettings />
                        <CommunicationSettings />
                    </div>
                );
            case 'financial':
                return (
                    <div className="space-y-8">
                        <FinancialSettings />
                    </div>
                );
            case 'appearance':
                return (
                    <div className="space-y-8">
                        <PWAInstallButton variant="settings" />
                        <AppearanceSettings />
                        <SizeSettings />
                    </div>
                );
            case 'team':
                return (
                    <div className="space-y-8">
                        {isOwner ? <TeamSettings /> : <LinkToOwner />}
                    </div>
                );
            case 'account_data':
                return (
                    <div className="space-y-8">
                        <AccountSecuritySettings />
                        <DataSettings />
                    </div>
                );
            default:
                return null;
        }
    };
    
    return (
        <div className="text-slate-800 dark:text-white max-w-4xl mx-auto">
            {/* Sub-header */}
            <div className="mb-6">
                <h1 className="text-3xl sm:text-4xl font-bold mb-2">الإعدادات</h1>
                <p className="text-gray-500 dark:text-gray-400">إدارة تفضيلات التطبيق والبيانات الأساسية.</p>
            </div>

            {/* بطاقة تفعيل وتجربة إشعارات النظام والـ PWA */}
            <div id="pwa-notifications-card" className="mb-8 p-4 sm:p-5 rounded-2xl bg-gradient-to-l from-emerald-500/10 via-emerald-500/5 to-transparent border border-emerald-500/20 dark:border-emerald-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
                <div className="flex items-start sm:items-center gap-3.5">
                    <div className="w-11 h-11 rounded-xl bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-2xl flex-shrink-0">
                        🔔
                    </div>
                    <div>
                        <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-bold text-slate-800 dark:text-white text-base">إشعارات النظام وتنبيهات المعاملات</h3>
                            {permission === 'granted' && (
                                <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700">
                                    مفعلة بالنظام ✓
                                </span>
                            )}
                            {permission === 'denied' && (
                                <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950/70 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-700">
                                    محظورة من المتصفح ✕
                                </span>
                            )}
                            {permission === 'default' && (
                                <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/70 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-700">
                                    يتطلب منح الإذن
                                </span>
                            )}
                            {realtimeStatus === 'SUBSCRIBED' && (
                                <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 inline-flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                    الخادم اللحظي: متصل 🟢
                                </span>
                            )}
                            {(realtimeStatus === 'CLOSED' || realtimeStatus === 'CHANNEL_ERROR' || realtimeStatus === 'TIMED_OUT') && (
                                <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950/70 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-700 inline-flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                                    الخادم اللحظي: غير متصل 🔴
                                </span>
                            )}
                            {realtimeStatus === 'CONNECTING' && (
                                <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/70 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-700 inline-flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping"></span>
                                    الخادم اللحظي: جاري الاتصال 🟡
                                </span>
                            )}
                        </div>
                        <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 mt-1">
                            طلب إذن المتصفح وتجربة إرسال إشعار فوري للتأكد من ربط الـ Service Worker والتنبيهات.
                        </p>
                    </div>
                </div>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full sm:w-auto flex-shrink-0">
                    <button
                        id="btn-subscribe-web-push"
                        type="button"
                        disabled={isSubscribingPush}
                        onClick={handleSubscribeWebPush}
                        className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-60 text-white font-bold text-sm shadow-sm hover:shadow transition-all flex items-center justify-center gap-2"
                        title="تفعيل واشتراك Web Push وحفظ المفاتيح في جدول push_subscriptions"
                    >
                        <span>{isSubscribingPush ? 'جاري الاشتراك...' : 'تفعيل واشتراك Web Push 📡'}</span>
                    </button>
                    <button
                        id="btn-test-notifications"
                        type="button"
                        disabled={isTestingNotification}
                        onClick={handleNotificationTest}
                        className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-60 text-white font-bold text-sm shadow-sm hover:shadow transition-all flex items-center justify-center gap-2"
                    >
                        <span>{isTestingNotification ? 'جاري الاختبار...' : 'تفعيل وتجربة الإشعارات 🔔'}</span>
                    </button>
                </div>
            </div>
            
            {/* Tabs */}
            <div className="sticky top-0 z-10 bg-neutral-50 dark:bg-neutral-950 py-2">
                <div className="border-b border-gray-200 dark:border-gray-700">
                    <nav className="flex items-center gap-4 sm:gap-8 overflow-x-auto pb-1 -mb-1">
                        {activeTabs.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex-shrink-0 pb-3 px-1 font-semibold transition-colors duration-200
                                    ${activeTab === tab.id
                                        ? 'text-primary dark:text-primary-light border-b-2 border-primary'
                                        : 'text-gray-500 hover:text-slate-800 dark:text-gray-400 dark:hover:text-white'
                                    }`
                                }
                            >
                                {tab.label}
                            </button>
                        ))}
                    </nav>
                </div>
            </div>
            
            {/* Tab Content */}
            <div key={activeTab} className="animate-page-enter mt-8">
                {renderContent()}
            </div>
        </div>
    );
};

export default SettingsManager;