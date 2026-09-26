
import React, { useState, useRef, useEffect, useMemo, lazy, Suspense } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { BellIcon, SunIcon, MoonIcon, LogoIcon } from './Icons';
import type { NavItemId, Invoice, Expense, Cycle, SupplierPayment, FarmerWithdrawal, Advance } from '../types';
import NotificationsPanel from './shared/NotificationsPanel';
import { useSplashTransition } from '../contexts/SplashTransitionContext';
import { navItems } from '../constants';
import { useSettings, terminology } from '../contexts/SettingsContext';
import { useData } from '../contexts/DataContext';
import { useUI } from '../contexts/UIContext';
import AccountSwitcher from './shared/AccountSwitcher';
import { PWAInstallButton } from './shared/PWAInstallButton';
import Modal from './shared/Modal';
import { useToast } from '../hooks/useToast';
import { triggerLightHaptic, triggerSaveHaptic } from '../lib/haptics';

// Lazy loaded views & managers
const Dashboard = lazy(() => import('./dashboard/Dashboard'));
const InvoiceManager = lazy(() => import('./invoices/InvoiceManager'));
const ExpenseManager = lazy(() => import('./expenses/ExpenseManager'));
const AssetManager = lazy(() => import('./greenhouses/GreenhouseManager'));
const CycleManager = lazy(() => import('./cycles/CycleManager'));
const SupplierManager = lazy(() => import('./suppliers/SupplierManager'));
const FarmerAccountManager = lazy(() => import('./farmer_account/FarmerAccountManager'));
const TreasuryManager = lazy(() => import('./treasury/TreasuryManager'));
const AdvancesManager = lazy(() => import('./advances/AdvancesManager'));
const DailyLogManager = lazy(() => import('./daily_logs/DailyLogManager'));
const WeeklyAnalysis = lazy(() => import('./analytics/WeeklyAnalysis'));
const SettingsManager = lazy(() => import('./settings/SettingsManager'));
const PartnersManager = lazy(() => import('./partners/PartnersManager'));
const UserManager = lazy(() => import('./users/UserManager'));
const SubscriptionPage = lazy(() => import('./subscription/SubscriptionPage'));
const LaborManager = lazy(() => import('./labor/LaborManager'));

import PageSkeleton from './shared/PageSkeleton';

// Lazy loaded modal forms
const AddInvoiceForm = lazy(() => import('./invoices/AddInvoiceForm'));
const AddExpenseForm = lazy(() => import('./expenses/AddExpenseForm'));
const AddCycleForm = lazy(() => import('./cycles/AddCycleForm'));
const AddPaymentForm = lazy(() => import('./suppliers/AddPaymentForm'));
const AddWithdrawalForm = lazy(() => import('./farmer_account/AddWithdrawalForm'));
const AddAdvanceForm = lazy(() => import('./advances/AddAdvanceForm'));

const ViewLoadingFallback = () => <PageSkeleton />;

interface MainContentProps {
  activeItem: NavItemId;
  onOpenSidebar?: () => void;
}

const HeaderLogoTarget: React.FC<{ onOpenSidebar?: () => void }> = React.memo(({ onOpenSidebar }) => {
  const { isTransitioning, hasTransitionCompleted } = useSplashTransition();
  return (
    <div
      id="header-logo-target"
      className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center shrink-0 select-none group cursor-pointer"
      onClick={() => { if (onOpenSidebar) onOpenSidebar(); }}
    >
      <LogoIcon
        className={`w-full h-full group-hover:scale-105 active:scale-95 transition-none ${
          isTransitioning && !hasTransitionCompleted ? 'opacity-0' : 'opacity-100'
        }`}
      />
    </div>
  );
});

const MainContent: React.FC<MainContentProps> = ({ activeItem, onOpenSidebar }) => {
  const { settings, updateSettings } = useSettings();
  const { 
    notifications, markAllNotificationsAsRead
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
      <header className="flex-shrink-0 z-20 h-14 sm:h-16 flex justify-between items-center bg-neutral-100/90 dark:bg-neutral-900/90 backdrop-blur-xl px-4 sm:px-8 border-b border-neutral-200 dark:border-neutral-800 w-full transition-colors duration-300">
        <div className="flex items-center gap-3 sm:gap-4 min-w-0">
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
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <HeaderLogoTarget onOpenSidebar={onOpenSidebar} />
            <div className="flex flex-col min-w-0">
              <h1 className="text-base sm:text-lg font-bold text-neutral-800 dark:text-neutral-0 truncate animate-enter leading-tight">{activeItemLabel}</h1>
              <span className="text-[10px] font-bold text-neutral-400 dark:text-neutral-500 hidden sm:inline-block leading-tight">المحاسب الزراعي</span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
          <PWAInstallButton variant="header" />
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
                if (!isNotificationsOpen) {
                  markAllNotificationsAsRead();
                }
                setNotificationsOpen(prev => !prev);
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
        className="flex-grow overflow-y-auto overflow-x-hidden w-full scrollbar-hide"
        style={{ WebkitOverflowScrolling: 'touch' }} // Smooth scrolling for iOS
      >
        <div 
          className={`${activeItem === 'dashboard' ? 'pt-2.5 sm:pt-4 sm:pb-8 px-3.5 sm:px-6' : 'pt-4 px-4 sm:p-8'} w-full min-h-full relative`}
          style={{ paddingBottom: 'calc(8.5rem + env(safe-area-inset-bottom, 16px))' }}
        >
            
            {/* Component Rendering - All screens are viewable by Strategic Partners (viewer role) */}
            <Suspense fallback={<PageSkeleton />}>
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeItem}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2 }}
                  className="h-full w-full"
                >
                  {activeItem === 'dashboard' && <div className="h-full"><Dashboard /></div>}
                  {activeItem === 'invoices' && <div className="h-full"><InvoiceManager /></div>}
                  {activeItem === 'expenses' && <div className="h-full"><ExpenseManager /></div>}
                  {activeItem === 'cycles' && <div className="h-full"><CycleManager /></div>}
                  {activeItem === 'weekly_analysis' && <div className="h-full"><WeeklyAnalysis /></div>}
                  {activeItem === 'treasury' && settings.systems.treasury && <div className="h-full"><TreasuryManager /></div>}

                  {/* Standard Rendering for Secondary Pages */}
                  {activeItem === 'daily_logs' && <div><DailyLogManager /></div>}
                  {activeItem === 'assets' && <div><AssetManager /></div>}
                  {activeItem === 'labor' && settings.systems.labor && <div><LaborManager /></div>}
                  {activeItem === 'suppliers' && settings.systems.suppliers && <div><SupplierManager /></div>}
                  {activeItem === 'farmer_account' && settings.systems.farmer_account && <div><FarmerAccountManager /></div>}
                  {activeItem === 'advances' && settings.systems.advances && <div><AdvancesManager /></div>}
                  {activeItem === 'partners' && settings.systems.partners_wallet && <div><PartnersManager /></div>}
                  {activeItem === 'settings' && <div><SettingsManager /></div>}
                  {activeItem === 'users' && profile?.role === 'owner' && <div><UserManager /></div>}
                  {activeItem === 'subscription' && <div><SubscriptionPage /></div>}
                </motion.div>
              </AnimatePresence>
            </Suspense>

        </div>
      </div>

      {/* Global Modals - Strictly prevented from mounting/rendering if role is viewer */}
      {profile?.role !== 'viewer' && (
        <Suspense fallback={<ViewLoadingFallback />}>
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
        </Suspense>
      )}
    </main>
  );
};

export default MainContent;
