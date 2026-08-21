
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { BellIcon, SunIcon, MoonIcon } from './Icons';
import type { NavItemId, Invoice, Expense, Cycle, SupplierPayment, FarmerWithdrawal, Advance } from '../types';
import InvoiceManager from './invoices/InvoiceManager';
import ExpenseManager from './expenses/ExpenseManager';
import Dashboard from './dashboard/Dashboard';
import AssetManager from './greenhouses/GreenhouseManager';
import CycleManager from './cycles/CycleManager';
import SupplierManager from './suppliers/SupplierManager';
import FarmerAccountManager from './farmer_account/FarmerAccountManager';
import TreasuryManager from './treasury/TreasuryManager';
import AdvancesManager from './advances/AdvancesManager';
import { DailyLogManager } from './daily_logs/DailyLogManager';
import WeeklyAnalysis from './analytics/WeeklyAnalysis';
import SettingsManager from './settings/SettingsManager';
import PartnersManager from './partners/PartnersManager';
import NotificationsPanel from './shared/NotificationsPanel';
import UserManager from './users/UserManager';
import SubscriptionPage from './subscription/SubscriptionPage';
import LaborManager from './labor/LaborManager';
import { navItems } from '../constants';
import { useSettings, terminology } from '../contexts/SettingsContext';
import { useData } from '../contexts/DataContext';
import { useUI } from '../contexts/UIContext';
import AccountSwitcher from './shared/AccountSwitcher';
import Modal from './shared/Modal';
import AddInvoiceForm from './invoices/AddInvoiceForm';
import AddExpenseForm from './expenses/AddExpenseForm';
import AddCycleForm from './cycles/AddCycleForm';
import AddPaymentForm from './suppliers/AddPaymentForm';
import AddWithdrawalForm from './farmer_account/AddWithdrawalForm';
import AddAdvanceForm from './advances/AddAdvanceForm';
import { useToast } from '../hooks/useToast';
import { triggerLightHaptic, triggerSaveHaptic } from '../lib/haptics';

interface MainContentProps {
  activeItem: NavItemId;
  onOpenSidebar?: () => void;
}

const MainContent: React.FC<MainContentProps> = ({ activeItem, onOpenSidebar }) => {
  const { settings, updateSettings } = useSettings();
  const { 
    notifications, markAllNotificationsAsRead,
    isOffline, isSyncing
  } = useUI();
  const { 
    addInvoice, addExpense, addCycle, addSupplierPayment, 
    addFarmerWithdrawal, addAdvance,
    farmers, suppliers, cycles, activePersons, profile
  } = useData();
  const { showToast } = useToast();
  const term = terminology[settings.primaryTerm];
  const [isNotificationsOpen, setNotificationsOpen] = useState(false);
  const notificationsRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  
  const [activeModal, setActiveModal] = useState<'invoice' | 'expense' | 'cycle' | 'payment' | 'withdrawal' | 'advance' | null>(null);
  
  const unreadCount = useMemo(() => notifications.filter(n => !n.isRead).length, [notifications]);

  // Force load requested view immediately if not preloaded
  useEffect(() => {
      // Reset scroll when switching tabs (Native-like feel)
      requestAnimationFrame(() => {
          if (scrollContainerRef.current) {
              scrollContainerRef.current.scrollTo({ top: 0, behavior: 'auto' });
          }
      });
  }, [activeItem]);

  const activeItemLabel = useMemo(() => {
    const baseLabel = navItems
      .flatMap(section => section.items)
      .find(item => item.id === activeItem)?.label || 'لوحة التحكم';
    
    if (activeItem === 'cycles') {
      return `إدارة ${term.plural}`;
    }
    return baseLabel;
  }, [activeItem, term]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
        if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
            setNotificationsOpen(false);
        }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleGlobalSave = async (type: string, data: unknown) => {
      if (profile?.role === 'viewer') {
          showToast('غير مسموح للمشاهد بتنفيذ هذه العملية', 'error');
          return;
      }
      triggerSaveHaptic();
      try {
          switch(type) {
              case 'invoice': await addInvoice(data as Omit<Invoice, 'id'>); break;
              case 'expense': await addExpense(data as Omit<Expense, 'id'>); break;
              case 'cycle': await addCycle(data as Omit<Cycle, 'id'>); break;
              case 'payment': await addSupplierPayment(data as Omit<SupplierPayment, 'id'>); break;
              case 'withdrawal': await addFarmerWithdrawal(data as Omit<FarmerWithdrawal, 'id'>); break;
              case 'advance': await addAdvance(data as Omit<Advance, 'id'>); break;
          }
          showToast('تمت العملية بنجاح');
          setActiveModal(null);
      } catch (_e) {
          showToast('حدث خطأ أثناء الحفظ', 'error');
          throw _e;
      }
  };

  return (
    <main className="flex-1 bg-transparent h-screen flex flex-col w-full max-w-full overflow-hidden relative">
      <header className="flex-shrink-0 z-20 flex flex-wrap justify-between items-center gap-y-2 bg-neutral-100/90 dark:bg-neutral-900/90 backdrop-blur-xl px-4 sm:px-8 py-3 border-b border-neutral-200 dark:border-neutral-800 w-full transition-colors duration-300">
        <div className="flex items-center gap-4 min-w-0">
          <button 
              onClick={() => {
                  triggerLightHaptic();
                  if (onOpenSidebar) onOpenSidebar();
              }}
              className="p-2 -ml-2 rounded-full lg:hidden text-neutral-500 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-800 transition-colors active:scale-95"
          >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
          </button>
          <div className="flex items-center gap-2.5 min-w-0">
            <h1 className="text-lg sm:text-xl font-bold text-neutral-800 dark:text-neutral-0 truncate animate-enter">{activeItemLabel}</h1>
            {isOffline ? (
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 animate-pulse">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                <span>غير متصل</span>
              </span>
            ) : isSyncing ? (
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
                <span>جاري التحديث...</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/10">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                <span>مزامن</span>
              </span>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
          <AccountSwitcher />

          <div className="h-6 w-px bg-neutral-300 dark:bg-neutral-700 mx-1 hidden sm:block"></div>

          <button 
              onClick={() => updateSettings({ theme: settings.theme === 'dark' ? 'light' : 'dark'})}
              className="p-2 rounded-full text-neutral-500 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-800 transition-colors active:scale-95"
          >
              {settings.theme === 'dark' ? <SunIcon className="h-5 w-5" /> : <MoonIcon className="h-5 w-5" />}
          </button>
          
          <div ref={notificationsRef} className="relative">
            <button
              onClick={() => {
                setNotificationsOpen(prev => {
                    if (!prev) markAllNotificationsAsRead();
                    return !prev;
                });
              }}
              className="relative p-2 rounded-full text-neutral-500 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-800 active:scale-95 transition-transform"
            >
              <BellIcon className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-accent-danger text-white text-[10px] font-bold ring-2 ring-neutral-100 dark:ring-neutral-900 animate-pulse">
                  {unreadCount}
                </span>
              )}
            </button>
            <NotificationsPanel isOpen={isNotificationsOpen} onClose={() => setNotificationsOpen(false)} />
          </div>
        </div>
      </header>

      {/* 4. Scroll Container with Hardware Acceleration */}
      <div 
        ref={scrollContainerRef} 
        className="flex-grow overflow-y-auto overflow-x-hidden w-full scrollbar-hide will-change-scroll"
        style={{ WebkitOverflowScrolling: 'touch' }} // Smooth scrolling for iOS
      >
        <div 
          className={`${activeItem === 'dashboard' ? 'pt-3 sm:py-8 px-4' : 'pt-4 px-4 sm:p-8'} w-full min-h-full relative`}
          style={{ paddingBottom: 'calc(8.5rem + env(safe-area-inset-bottom, 16px))' }}
        >
            
            {/* Component Rendering - All screens are viewable by Strategic Partners (viewer role) */}
            {activeItem === 'dashboard' && <div className="animate-page-enter h-full"><Dashboard /></div>}
            {activeItem === 'invoices' && <div className="animate-page-enter h-full"><InvoiceManager /></div>}
            {activeItem === 'expenses' && <div className="animate-page-enter h-full"><ExpenseManager /></div>}
            {activeItem === 'cycles' && <div className="animate-page-enter h-full"><CycleManager /></div>}
            {activeItem === 'weekly_analysis' && <div className="animate-page-enter h-full"><WeeklyAnalysis /></div>}
            {activeItem === 'treasury' && settings.systems.treasury && <div className="animate-page-enter h-full"><TreasuryManager /></div>}

            {/* Standard Rendering for Secondary Pages */}
            {activeItem === 'daily_logs' && <div className="animate-page-enter"><DailyLogManager /></div>}
            {activeItem === 'assets' && <div className="animate-page-enter"><AssetManager /></div>}
            {activeItem === 'labor' && settings.systems.labor && <div className="animate-page-enter"><LaborManager /></div>}
            {activeItem === 'suppliers' && settings.systems.suppliers && <div className="animate-page-enter"><SupplierManager /></div>}
            {activeItem === 'farmer_account' && settings.systems.farmer_account && <div className="animate-page-enter"><FarmerAccountManager /></div>}
            {activeItem === 'advances' && settings.systems.advances && <div className="animate-page-enter"><AdvancesManager /></div>}
            {activeItem === 'partners' && settings.systems.partners_wallet && <div className="animate-page-enter"><PartnersManager /></div>}
            {activeItem === 'settings' && <div className="animate-page-enter"><SettingsManager /></div>}
            {activeItem === 'users' && profile?.role === 'owner' && <div className="animate-page-enter"><UserManager /></div>}
            {activeItem === 'subscription' && <div className="animate-page-enter"><SubscriptionPage /></div>}

        </div>
      </div>

      {/* Global Modals - Strictly prevented from mounting/rendering if role is viewer */}
      {profile?.role !== 'viewer' && (
        <>
          <Modal isOpen={activeModal === 'invoice'} onClose={() => setActiveModal(null)} title="إضافة فاتورة سريعة" size="3xl">
            <AddInvoiceForm onSave={(d) => handleGlobalSave('invoice', d)} onCancel={() => setActiveModal(null)} />
          </Modal>

          <Modal isOpen={activeModal === 'expense'} onClose={() => setActiveModal(null)} title="إضافة مصروف سريع" size="lg">
            <AddExpenseForm onSave={(d) => handleGlobalSave('expense', d)} onCancel={() => setActiveModal(null)} />
          </Modal>

          <Modal isOpen={activeModal === 'cycle'} onClose={() => setActiveModal(null)} title={`إضافة ${term.singular} جديد`} size="lg">
            <AddCycleForm onSave={(d) => handleGlobalSave('cycle', d)} onCancel={() => setActiveModal(null)} />
          </Modal>

          <Modal isOpen={activeModal === 'payment'} onClose={() => setActiveModal(null)} title="إضافة دفعة مورد" size="lg">
            <AddPaymentForm onSave={(d) => handleGlobalSave('payment', d)} onCancel={() => setActiveModal(null)} suppliers={suppliers} cycles={cycles} />
          </Modal>

          <Modal isOpen={activeModal === 'withdrawal'} onClose={() => setActiveModal(null)} title="إضافة سحب مزارع" size="lg">
            <AddWithdrawalForm onSave={(d) => handleGlobalSave('withdrawal', d)} onCancel={() => setActiveModal(null)} farmers={farmers} cycles={cycles} />
          </Modal>

          <Modal isOpen={activeModal === 'advance'} onClose={() => setActiveModal(null)} title="إضافة سلفة شخصية" size="lg">
            <AddAdvanceForm onSave={(d) => handleGlobalSave('advance', d)} onCancel={() => setActiveModal(null)} persons={activePersons} cycles={cycles} onManagePersons={() => {}} />
          </Modal>
        </>
      )}
    </main>
  );
};

export default MainContent;
