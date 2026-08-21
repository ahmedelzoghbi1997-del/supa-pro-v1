
import type { NavSection } from './types';
import {
  DashboardIcon,
  InvoicesIcon,
  ExpensesIcon,
  AssetIcon,
  CyclesIcon,
  TruckIcon,
  FarmerIcon,
  TreasuryIcon,
  AdvancesIcon,
  ChartBarIcon,
  SettingsIcon,
  UsersIcon,
  CalendarIcon,
  WalletIcon,
} from './components/Icons';

export const CURRENT_APP_VERSION = '1.1';

export const navItems: NavSection[] = [
  {
    title: '',
    items: [
      { id: 'dashboard', label: 'لوحة التحكم', icon: DashboardIcon },
    ],
  },
  {
    title: '',
    items: [
      { id: 'invoices', label: 'إدارة الفواتير', icon: InvoicesIcon },
      { id: 'expenses', label: 'إدارة المصروفات', icon: ExpensesIcon },
    ],
  },
  {
    title: 'الإدارة والتكوين',
    items: [
      { id: 'daily_logs', label: 'الأجندة الزراعية', icon: CalendarIcon },
      { id: 'cycles', label: 'إدارة المواسم/العروات', icon: CyclesIcon },
      { id: 'labor', label: 'إدارة العمالة', icon: UsersIcon },
      { id: 'farmer_account', label: 'ادارة حساب المزارع', icon: FarmerIcon },
      { id: 'suppliers', label: 'حسابات الموردين', icon: TruckIcon },
      { id: 'assets', label: 'إدارة الأصول', icon: AssetIcon },
    ],
  },
  {
    title: 'التحليل والمالية',
    items: [
      { id: 'weekly_analysis', label: 'التحليل الأسبوعي', icon: ChartBarIcon },
      { id: 'treasury', label: 'الخزنة', icon: TreasuryIcon },
      { id: 'advances', label: 'السلف الشخصية', icon: AdvancesIcon },
      { id: 'partners', label: 'محفظة الشركاء', icon: WalletIcon },
    ],
  },
  {
    title: 'التطبيق',
    items: [
      { id: 'settings', label: 'الإعدادات', icon: SettingsIcon },
      { id: 'users', label: 'إدارة المستخدمين', icon: UsersIcon },
    ],
  },
];
