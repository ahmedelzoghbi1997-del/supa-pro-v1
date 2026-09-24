
import type React from 'react';

export type NavItemId =
  | 'dashboard'
  | 'invoices'
  | 'expenses'
  | 'assets'
  | 'cycles'
  | 'labor'
  | 'suppliers'
  | 'farmer_account'
  | 'treasury'
  | 'advances'
  | 'partners'
  | 'weekly_analysis'
  | 'profits'
  | 'daily_logs'
  | 'settings'
  | 'users'
  | 'subscription';

export interface NavItem {
  id: NavItemId;
  label: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
}

export interface NavSection {
  title: string;
  items: NavItem[];
}

export type Theme = 'light' | 'dark' | 'system';
export type AccentColor = 'emerald' | 'blue' | 'violet' | 'amber' | 'rose';
export type UiScale = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

export interface Profile {
  id: string;
  full_name: string;
  status: 'pending' | 'active' | 'rejected';
  role: 'owner' | 'user' | 'viewer' | 'editor';
  email?: string;
  parent_id?: string | null;
  linking_code?: string | null;
  linking_code_expires_at?: string | null;
  subscription_type?: 'trial' | 'monthly' | 'yearly' | 'custom' | null;
  subscription_ends_at?: string | null;
  app_settings: AppSettings | null;
  last_seen_at?: string | null;
  created_at?: string;
}

export type AppSystem = 'treasury' | 'advances' | 'farmer_account' | 'suppliers' | 'labor' | 'partners_wallet';
export type Terminology = 'cycle' | 'season';
export type DiscountType = 'single' | 'custom';

export interface PartnerDebt {
  id: string;
  user_id?: string;
  description: string;
  total_amount: number;
  partner_allocations: Record<string, number>;
  date: string;
  partner_repayments?: Record<string, number>;
  entered_treasury?: boolean;
  cycle_id?: string | null;
  created_at?: string;
  _stable_id?: string;

  // Backward compatibility getters/aliases for camelCase
  totalAmount?: number;
  partnerAllocations?: Record<string, number>;
  partnerRepayments?: Record<string, number>;
}

export interface AppSettings {
  systems: Record<AppSystem, boolean>;
  welcome_message: string;
  support_whatsapp: string;
  subscription_page_message: string;
  primaryTerm: Terminology;
  theme: Theme;
  accentColor: AccentColor;
  uiScale: UiScale;
  markets: string[];
  discountType: DiscountType;
  deductionItems: string[];
  laborActivities: string[];
  isolateLaborAccount?: boolean;
  greenhouses?: Array<{ id: string; name: string; type: 'mine' | 'external'; is_default?: boolean }>;
  person_partner_mappings?: Record<string, string>; // Maps personId to virtualMemberId
  person_partner_percentages?: Record<string, number>; // Maps personId to profit percentage
  archived_person_ids?: string[];
  freeze_new_cycle_loss?: boolean;
  cycle_external_deductions?: Record<string, number>;
  // TODO (CRITICAL): Migrate partner_debts to a standalone Supabase table to prevent JSONB race conditions.
  partner_debts?: PartnerDebt[];
  owner_bank_account_id?: string;
}

export interface ExpenseCategory {
  id: string;
  user_id: string;
  name: string;
  is_supplier_category: boolean;
  is_labor_category?: boolean;
  is_discount_category?: boolean;
  is_joint_debt_category?: boolean;
  category_type?: 'operating' | 'establishment' | 'joint_debt' | 'supplier' | 'labor' | string;
  created_at: string;
  _stable_id?: string;
}

export interface InvoicePriceItem {
  id: number;
  user_id: string;
  invoice_id: string;
  quantity: number;
  price_per_kg: number;
  packaging_count?: number;
}

export interface InvoiceDeductionItem {
  id: number;
  user_id: string;
  invoice_id: string;
  name: string;
  amount: number;
}

export interface Invoice {
  id: string;
  user_id: string;
  description?: string;
  date: string;
  cycle_id: string;
  cycle?: string;
  market: string;
  price_items: InvoicePriceItem[];
  deductions: InvoiceDeductionItem[];
  packaging_type: 'carton' | 'cage';
  packaging_count?: number;
  carton_count?: number;
  cage_count?: number;
  created_at: string;
  _stable_id?: string;
  source_ref_id?: string;
  source_type?: 'invoice' | 'treasury' | 'settlement' | 'partner_advance' | 'external_debt' | string;
  is_retained_debt?: boolean;
  pending_sync?: boolean;
}

export interface Expense {
  id: string;
  user_id: string;
  description: string;
  date: string;
  amount: number;
  category_id: string;
  categoryName?: string;
  cycle_id: string;
  cycle?: string;
  supplier_id?: string;
  payment_method?: 'cash' | 'credit';
  is_establishment?: boolean;
  created_at: string;
  _stable_id?: string;
  isDiscount?: boolean;
  isAdvanceTaken?: boolean;
  isAdvanceRepayment?: boolean;
  isWageWork?: boolean;
  _original_category_id?: string;
  shift_type?: 'morning' | 'evening' | 'full_day' | null;
  is_joint_debt_payment?: boolean;
  pending_sync?: boolean;
}

export interface CyclePerformanceData {
  name: string;
  revenue: number;
  expenses: number;
  netOwnerProfit: number;
}

export interface Asset {
  id: string;
  user_id: string;
  name: string;
  establishment_date: string;
  establishment_cost: number;
  created_at: string;
  cyclePerformances?: CyclePerformanceData[];
  _stable_id?: string;
}

export type CycleStatus = 'active' | 'closed' | 'archived';

export interface Cycle {
  id: string;
  user_id: string;
  name: string;
  seed_type: string;
  plant_count: number;
  unit_of_measure: 'plants' | 'area';
  area_in_feddans: number;
  asset_id: string;
  start_date: string;
  production_start_date?: string;
  status: CycleStatus;
  responsible_farmer_id?: string;
  responsibleFarmer?: string;
  farmer_share_percentage?: number;
  target_yield?: number;
  notes?: string;
  created_at: string;
  revenue: number;
  expenses: number;
  profit: number;
  health: number;
  returnOnInvestment?: number;
  avgDailyProductionKg?: number;
  avgDailyCartons?: number;
  avgDailyCages?: number;
  totalProductionKg?: number;
  productionPerPlantKg?: number;
  costPerPlant?: number;
  revenuePerPlant?: number;
  profitPerPlant?: number;
  costPerKg?: number;
  netRevenuePerKg?: number;
  avgCartonWeight?: number;
  marketBreakEvenPrice?: number;
  deductionPercentage?: number;
  expenseBreakdown?: { category: string; amount: number; percentage: number; color: string }[];
  farmerShare?: number;
  totalCartons?: number;
  totalCages?: number;
  deductionBreakdown?: { name: string; totalAmount: number; percentageOfRevenue?: number }[];
  _stable_id?: string;
}

export interface Supplier {
  id: string;
  user_id: string;
  name: string;
  opening_balance?: number;
  created_at: string;
  _stable_id?: string;
}

export interface SupplierPayment {
  id: string;
  user_id: string;
  supplier_id: string;
  cycle_id: string;
  cycle?: string;
  supplierName?: string;
  amount: number;
  date: string;
  description?: string;
  created_at: string;
  _stable_id?: string;
}

export interface Farmer {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
  _stable_id?: string;
}

export interface FarmerWithdrawal {
  id: string;
  user_id: string;
  farmer_id: string;
  cycle_id: string;
  cycle?: string;
  farmerName?: string;
  amount: number;
  date: string;
  description?: string;
  created_at: string;
  _stable_id?: string;
}

export interface BankAccount {
  id: string;
  user_id: string;
  name: string;
  initial_balance: number;
  created_at: string;
  _stable_id?: string;
  is_owner_account?: boolean;
  account_type?: 'bank' | 'owner_current' | 'cash';
}

export interface BankTransaction {
  id: string;
  user_id: string;
  account_id: string;
  cycle_id?: string;
  type: 'deposit' | 'withdrawal';
  amount: number;
  date: string;
  description?: string;
  created_at: string;
  _stable_id?: string;
}

export interface TreasuryFund {
  id: string;
  name: string;
  balance: number;
  inflows: {
    totalRevenue: number;
    bankWithdrawals: number;
    transferredBalance?: number;
    manualFunding?: number;
    jointDebtsFunding?: number;
    individualDebtsFunding?: number;
  };
  outflows: {
    totalDeductions: number;
    operatingExpenses: { amount: number; transactionCount: number };
    personalAdvances: { amount: number; transactionCount: number };
    farmerWithdrawals: { amount: number; transactionCount: number };
    supplierPayments: { amount: number; transactionCount: number };
    bankDeposits: { amount: number; transactionCount: number };
  };
}

export interface Person {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
  _stable_id?: string;
  virtual_id?: string | null;
}

export interface Advance {
  id: string;
  user_id: string;
  person_id: string;
  personName?: string;
  amount: number;
  date: string;
  cycle_id: string;
  fund?: string;
  reason?: string;
  funding_source?: 'cash' | 'external_debt';
  is_entered_treasury?: boolean;
  is_paid_from_treasury?: boolean;
  created_at: string;
  _stable_id?: string;
  source_ref_id?: string;
  source_type?: 'invoice' | 'treasury' | 'settlement' | 'partner_advance' | 'external_debt' | string;
  is_retained_debt?: boolean;
}

export interface DailyLogTask {
  id: string;
  category: string;
  subCategory?: string;
  details: string;
  workersCount?: number;
  quantity?: number;
  unit?: string;
}

export interface DailyLog {
  id: string;
  user_id: string;
  cycle_id: string;
  cycle?: string;
  date: string;
  tasks: DailyLogTask[];
  notes?: string;
  created_at: string;
  _stable_id?: string;
}

export interface WeeklyProduction {
  week: number;
  year: number;
  production: number;
}

export type NotificationType = 'financial' | 'administrative' | 'insight' | 'system';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: string;
  isRead: boolean;
  link?: NavItemId;
}

export interface VirtualMember {
  id: string;
  owner_id: string;
  username: string;
  password?: string;
  full_name: string;
  role: 'viewer' | 'editor';
  created_at: string;
  last_seen?: string;
}

export interface InvoiceInput extends Omit<Invoice, 'id' | 'created_at' | 'user_id' | '_stable_id' | 'price_items' | 'deductions'> {
  price_items: Omit<InvoicePriceItem, 'id' | 'invoice_id' | 'user_id'>[];
  deductions: Omit<InvoiceDeductionItem, 'id' | 'invoice_id' | 'user_id'>[];
}

export interface DataContextType {
  refreshGlobalData: () => Promise<void>;
  broadcastChange?: (table: string, record: unknown, eventType?: 'INSERT' | 'UPDATE' | 'DELETE', oldRecord?: unknown) => void;
  invoices: Invoice[];
  addInvoice: (data: InvoiceInput) => Promise<void>;
  updateInvoice: (data: Invoice) => Promise<void>;
  deleteInvoice: (id: string) => Promise<void>;
  lastInvoiceAddedId: string | null;
  setLastInvoiceAddedId: (id: string | null) => void;
  expenses: Expense[];
  rawExpenses: Expense[];
  addExpense: (data: Omit<Expense, 'id' | 'created_at' | 'user_id' | '_stable_id'>) => Promise<void>;
  updateExpense: (dataOrId: Expense | (Partial<Expense> & { id: string }) | string, updates?: Partial<Expense>) => Promise<void>;
  deleteExpense: (id: string) => Promise<void>;
  lastExpenseAddedId: string | null;
  setLastExpenseAddedId: (id: string | null) => void;
  isExternalLabor: (e: { description?: string }) => boolean;
  cycles: Cycle[];
  cyclesWithCalculations: Cycle[];
  addCycle: (data: Omit<Cycle, 'id' | 'created_at' | 'user_id' | '_stable_id' | 'revenue' | 'expenses' | 'profit' | 'health'>, transferBalance?: boolean, customTransferAmount?: number) => Promise<void>;
  updateCycle: (data: Cycle, transferBalance?: boolean) => Promise<void>;
  deleteCycle: (id: string) => Promise<boolean>;
  lastCycleAddedId: string | null;
  setLastCycleAddedId: (id: string | null) => void;
  persons: Person[];
  activePersons: Person[];
  virtualMembers: VirtualMember[];
  addPerson: (name: string, virtual_id?: string | null, percentage?: number) => Promise<Person | null>;
  updatePerson: (id: string, name: string, virtual_id?: string | null, percentage?: number) => Promise<boolean>;
  deletePerson: (id: string) => Promise<boolean>;
  advances: Advance[];
  addAdvance: (data: Omit<Advance, 'id' | 'created_at' | 'user_id' | '_stable_id'>) => Promise<void>;
  updateAdvance: (data: Advance) => Promise<void>;
  deleteAdvance: (id: string) => Promise<void>;
  lastAdvanceAddedId: string | null;
  setLastAdvanceAddedId: (id: string | null) => void;
  suppliers: Supplier[];
  addSupplier: (name: string, opening_balance?: number) => Promise<void>;
  updateSupplier: (supplier: Supplier) => Promise<void>;
  deleteSupplier: (id: string) => Promise<boolean>;
  lastSupplierAddedId: string | null;
  setLastSupplierAddedId: (id: string | null) => void;
  supplierPayments: SupplierPayment[];
  addSupplierPayment: (payment: Omit<SupplierPayment, 'id' | 'created_at' | 'user_id' | '_stable_id'>) => Promise<void>;
  updateSupplierPayment: (payment: SupplierPayment) => Promise<void>;
  deleteSupplierPayment: (id: string) => Promise<void>;
  farmers: Farmer[];
  addFarmer: (name: string) => Promise<void>;
  updateFarmer: (farmer: Farmer) => Promise<void>;
  deleteFarmer: (id: string) => Promise<boolean>;
  lastFarmerAddedId: string | null;
  setLastFarmerAddedId: (id: string | null) => void;
  farmerWithdrawals: FarmerWithdrawal[];
  addFarmerWithdrawal: (withdrawal: Omit<FarmerWithdrawal, 'id' | 'created_at' | 'user_id' | '_stable_id'>) => Promise<void>;
  updateFarmerWithdrawal: (withdrawal: FarmerWithdrawal) => Promise<void>;
  deleteFarmerWithdrawal: (id: string) => Promise<void>;
  expenseCategories: ExpenseCategory[];
  allExpenseCategories: ExpenseCategory[];
  addExpenseCategory: (category: Omit<ExpenseCategory, 'id' | 'created_at' | 'user_id' | '_stable_id'>) => Promise<string | undefined>;
  updateExpenseCategory: (category: ExpenseCategory) => Promise<void>;
  deleteExpenseCategory: (id: string) => Promise<boolean>;
  lastExpenseCategoryAddedId: string | null;
  setLastExpenseCategoryAddedId: (id: string | null) => void;
  assets: Asset[];
  addAsset: (asset: Omit<Asset, 'id' | 'created_at' | 'user_id' | '_stable_id'>) => Promise<void>;
  updateAsset: (asset: Asset) => Promise<void>;
  deleteAsset: (id: string) => Promise<boolean>;
  dailyLogs: DailyLog[];
  addDailyLog: (log: Omit<DailyLog, 'id' | 'created_at' | 'user_id' | '_stable_id'>) => Promise<void>;
  updateDailyLog: (log: DailyLog) => Promise<void>;
  deleteDailyLog: (id: string) => Promise<boolean>;
  getCycleCashBalance: (id: string) => number;
  getCycleTotalBalance: (id: string) => number;
  totalRevenue: number;
  totalNetRevenue: number;
  totalExpenses: number;
  ownerNetProfit: number;
  totalFarmerShare: number;
  treasuryFunds: TreasuryFund[];
  bankAccounts: BankAccount[];
  addBankAccount: (account: Omit<BankAccount, 'id' | 'created_at' | 'user_id' | '_stable_id'>) => Promise<string>;
  updateBankAccount: (account: BankAccount) => Promise<void>;
  deleteBankAccount: (id: string) => Promise<boolean>;
  bankTransactions: BankTransaction[];
  addBankTransaction: (transaction: Omit<BankTransaction, 'id' | 'created_at' | 'user_id' | '_stable_id'>) => Promise<void>;
  updateBankTransaction: (transaction: BankTransaction) => Promise<void>;
  deleteBankTransaction: (id: string) => Promise<void>;
  partnerDebts: PartnerDebt[];
  addPartnerDebt: (data: Omit<PartnerDebt, 'id' | 'created_at' | 'user_id' | '_stable_id'>) => Promise<void>;
  updatePartnerDebt: (data: PartnerDebt) => Promise<void>;
  deletePartnerDebt: (id: string) => Promise<void>;
  settings: AppSettings;
  updateSettings: (newSettings: Partial<AppSettings>) => void;
  profile: Profile | null;
  setActiveItem: (item: NavItemId) => void;
  deleteAllUserData: () => Promise<void>;
}
