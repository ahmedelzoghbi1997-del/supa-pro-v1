
import React, { useState, useRef, useEffect } from 'react';
import type { Cycle, Invoice } from '../../types';
import TransactionsTab from './TransactionsTab';
import OverviewTab from './OverviewTab';
import TimelineTab from './TimelineTab';
import FarmerAccountTab from './FarmerAccountTab';
import WeeklyTab from './WeeklyTab';
import ProductionTab from './ProductionTab';
import TreasuryTab from './TreasuryTab';
import InvoiceDetailsModal from '../invoices/InvoiceDetailsModal';
import { useData } from '../../contexts/DataContext';
import Breadcrumbs from '../shared/Breadcrumbs';
import { 
    AssetIcon,
    LeafIcon,
    ChartPieIcon,
    TrendingUpIcon,
    ScaleIcon,
    InvoicesIcon,
    FarmerAccountIcon,
    ClockIcon,
    WalletIcon,
    UsersIcon,
    AdvancesIcon
} from '../Icons';
import { useSettings, terminology } from '../../contexts/SettingsContext';
import { motion, AnimatePresence } from 'motion/react';
import CycleLaborTab from './CycleLaborTab';
import CycleAdvancesTab from './CycleAdvancesTab';

const CycleReport: React.FC<{ cycle: Cycle; onBack: () => void }> = ({ cycle, onBack }) => {
    const [activeTab, setActiveTab] = useState('overview');
    const [selectedInvoiceDetails, setSelectedInvoiceDetails] = useState<Invoice | null>(null);
    
    const topRef = useRef<HTMLDivElement>(null);
    const { assets, profile } = useData();
    const { settings } = useSettings();
    const term = terminology[settings.primaryTerm];

    useEffect(() => {
        const scrollContainer = document.querySelector('.will-change-scroll');
        if (scrollContainer) {
            scrollContainer.scrollTo({ top: 0, behavior: 'smooth' });
        }
    }, [activeTab]);

    const assetName = assets.find(g => g.id === cycle.asset_id)?.name || 'غير محدد';
    const renderTabButton = (tabName: string, tabLabel: string, Icon: React.ComponentType<any>) => {
        const isActive = activeTab === tabName;
        return (
            <button 
                onClick={() => setActiveTab(tabName)} 
                className={`relative flex-shrink-0 px-4 sm:px-5 py-2.5 rounded-2xl font-bold text-xs sm:text-sm transition-colors duration-300 z-10 select-none flex items-center justify-center gap-2 ${isActive ? 'text-primary dark:text-white' : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-white'}`}
            >
                {isActive && (
                    <motion.div 
                        layoutId="activeCycleTabHighlight"
                        className="absolute inset-0 bg-neutral-200/70 dark:bg-neutral-800 rounded-2xl -z-10"
                        transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    />
                )}
                <Icon className={`w-4 h-4 transition-colors duration-300 ${isActive ? 'text-primary dark:text-accent-success' : 'text-neutral-400 dark:text-neutral-500'}`} />
                <span>{tabLabel}</span>
            </button>
        );
    };

    const statusMap = {
        active: { label: 'نشطة', color: 'text-accent-success', dot: 'bg-accent-success', bg: 'bg-accent-success/10', border: 'border-accent-success/20' },
        closed: { label: 'مكتملة', color: 'text-neutral-500', dot: 'bg-neutral-400', bg: 'bg-neutral-100 dark:bg-neutral-800', border: 'border-neutral-200 dark:border-neutral-700' },
        archived: { label: 'مؤرشفة', color: 'text-accent-warning', dot: 'bg-accent-warning', bg: 'bg-accent-warning/10', border: 'border-accent-warning/20' },
    };

    const currentStatus = statusMap[cycle.status] || statusMap.closed;

    return (
        <div ref={topRef} className="-m-4 sm:-m-8 min-h-screen bg-neutral-50 dark:bg-neutral-950 text-neutral-800 dark:text-neutral-200 flex flex-col">
            {/* Unified Header & Nav Section */}
            <div className="bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 shadow-sm px-4 sm:px-8 pt-6 pb-0">
                <div className="w-full">
                    <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div>
                            <Breadcrumbs 
                                items={[
                                    { label: `إدارة ${term.plural}`, onClick: onBack },
                                    { label: cycle.name }
                                ]}
                            />
                            <div className="flex items-center gap-3 mt-4">
                                <h1 className="text-2xl sm:text-3xl font-bold text-neutral-900 dark:text-white">{cycle.name}</h1>
                                <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border ${currentStatus.bg} ${currentStatus.border} ${currentStatus.color}`}>
                                    <span className={`w-1.5 h-1.5 rounded-full ${currentStatus.dot} ${cycle.status === 'active' ? 'animate-pulse' : ''}`}></span>
                                    <span className="text-2xs font-black uppercase tracking-widest">{currentStatus.label}</span>
                                </div>
                            </div>
                            <div className="flex items-center gap-x-4 gap-y-1 text-sm text-neutral-600 dark:text-neutral-300 mt-2 flex-wrap">
                                <div className="flex items-center gap-2">
                                    <LeafIcon className="w-4 h-4 text-neutral-400 dark:text-neutral-50" />
                                    <span>{cycle.seed_type}</span>
                                </div>
                                <div className="w-1.5 h-1.5 bg-neutral-300 dark:bg-neutral-600 rounded-full hidden sm:block"></div>
                                <div className="flex items-center gap-2">
                                    <AssetIcon className="w-4 h-4 text-neutral-400 dark:text-neutral-50" />
                                    <span>{assetName}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="sticky top-0 z-10 py-2">
                        <div className="overflow-x-auto scrollbar-hide" style={{ WebkitOverflowScrolling: 'touch' }}>
                            <nav className="flex flex-nowrap items-center gap-2 bg-neutral-50 dark:bg-neutral-950/50 p-1 rounded-2xl w-max select-none">
                                {renderTabButton('overview', 'نظرة عامة', ChartPieIcon)}
                                {renderTabButton('weekly', 'التحليل المالي', TrendingUpIcon)}
                                {renderTabButton('production', 'تقارير الإنتاج بالكيلو', ScaleIcon)}
                                {renderTabButton('transactions', 'المعاملات', InvoicesIcon)}
                                {renderTabButton('treasury', 'حركة الخزينة', WalletIcon)}
                                {profile?.role !== 'viewer' && renderTabButton('labor', 'العمالة', UsersIcon)}
                                {cycle.responsible_farmer_id && renderTabButton('farmer_account', 'حساب المزارع', FarmerAccountIcon)}
                                {settings.systems.advances && renderTabButton('advances', 'السلف الشخصية', AdvancesIcon)}
                                {renderTabButton('timeline', 'الجدول الزمني', ClockIcon)}
                            </nav>
                        </div>
                    </div>
                </div>
            </div>
            
            <div className="w-full px-4 sm:px-8 pt-6 pb-12 flex-grow overflow-hidden">
                <AnimatePresence mode="wait">
                    <motion.div 
                        key={activeTab} 
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -12 }}
                        transition={{ duration: 0.2, ease: "easeInOut" }}
                        className="h-full w-full"
                    >
                        {activeTab === 'overview' && <OverviewTab cycle={cycle} />}
                        {activeTab === 'weekly' && <WeeklyTab cycle={cycle} />}
                        {activeTab === 'production' && <ProductionTab cycle={cycle} />}
                        {activeTab === 'timeline' && <TimelineTab cycle={cycle} />}
                        {activeTab === 'transactions' && <TransactionsTab 
                            cycle={cycle} 
                            onViewInvoiceDetails={setSelectedInvoiceDetails}
                        />}
                        {activeTab === 'treasury' && <TreasuryTab cycle={cycle} />}
                        {activeTab === 'labor' && profile?.role !== 'viewer' && <CycleLaborTab cycle={cycle} />}
                        {activeTab === 'farmer_account' && cycle.responsible_farmer_id && <FarmerAccountTab cycle={cycle} />}
                        {activeTab === 'advances' && settings.systems.advances && <CycleAdvancesTab cycle={cycle} />}
                    </motion.div>
                </AnimatePresence>
            </div>


            <InvoiceDetailsModal 
                invoice={selectedInvoiceDetails}
                onClose={() => setSelectedInvoiceDetails(null)}
            />
        </div>
    );
};

export default CycleReport;
