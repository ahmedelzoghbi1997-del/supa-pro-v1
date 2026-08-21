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
import { useData } from '../../contexts/DataContext';

type SettingsTab = 'systems_terms' | 'financial' | 'appearance' | 'account_data' | 'team';

const SettingsManager: React.FC = () => {
    const { profile, invoices, expenses, cycles } = useData();
    const [activeTab, setActiveTab] = useState<SettingsTab>('systems_terms');
    
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
            <div className="mb-8">
                <h1 className="text-3xl sm:text-4xl font-bold mb-2">الإعدادات</h1>
                <p className="text-gray-500 dark:text-gray-400">إدارة تفضيلات التطبيق والبيانات الأساسية.</p>
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