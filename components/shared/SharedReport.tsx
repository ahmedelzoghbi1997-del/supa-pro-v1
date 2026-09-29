import React, { useState, useEffect, useMemo, useRef } from "react";
import { Rocket } from "lucide-react";
import { supabase, isSupabaseConfigured } from "../../lib/supabase";
import {
  TrendingUpIcon,
  TrendingDownIcon,
  SafeIcon,
  ClockIcon,
  TruckIcon,
  ChevronRightIcon,
  ChevronLeftIcon,
  CalendarIcon,
  WalletIcon,
  UserMinusIcon,
  CreditCardIcon,
  FarmerAccountIcon,
  UserIcon,
  ChartBarIcon,
  ClipboardDocumentIcon,
} from "../Icons";
import {
  formatNumber,
  formatCurrency,
  calculateInvoiceTotal,
} from "../../utils/helpers";
import InvoiceDetailsModal from "../invoices/InvoiceDetailsModal";
import { DashboardCard } from "../dashboard/Dashboard";
import Modal from "./Modal";
import { useToast } from "../../hooks/useToast";
import type {
  Cycle,
  Invoice,
  Expense,
  FarmerWithdrawal,
  ExpenseCategory,
  SupplierPayment,
  Advance,
  Supplier,
  Farmer,
  Person,
  InvoicePriceItem,
  InvoiceDeductionItem,
} from "../../types";

import type {
  AppNotification,
  ReportTabId,
} from "./report/types";
import ReportHeader from "./report/ReportHeader";
import ReportInvoicesTable from "./report/ReportInvoicesTable";
import ReportExpensesTable from "./report/ReportExpensesTable";
import ReportCharts, { StatMiniCard } from "./report/ReportCharts";

const SharedReport = () => {
  // URL parsing manually since we might not have a router
  const [seasonId, setSeasonId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ReportTabId>("overview");
  const [selectedExpenseCategory, setSelectedExpenseCategory] = useState<
    string | null
  >(null);
  const [fontSizeLevel, setFontSizeLevel] = useState(5); // 1 to 10 scale
  const [isFontMenuOpen, setIsFontMenuOpen] = useState(false);

  // Data State
  const [cycle, setCycle] = useState<Cycle | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [withdrawals, setWithdrawals] = useState<FarmerWithdrawal[]>([]);
  const [supplierPayments, setSupplierPayments] = useState<SupplierPayment[]>(
    [],
  );
  const [advances, setAdvances] = useState<Advance[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [farmers, setFarmers] = useState<Farmer[]>([]);
  const [persons, setPersons] = useState<Person[]>([]);
  const [assetName, setAssetName] = useState("");
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [bankTransactions, setBankTransactions] = useState<
    Record<string, unknown>[]
  >([]);
  const [bankAccounts, setBankAccounts] = useState<Record<string, unknown>[]>(
    [],
  );

  // Modal State
  const hydratedInvoices = useMemo(() => {
    return invoices.map((inv) => {
      const totalAmount = calculateInvoiceTotal(
        inv.price_items || [],
        inv.deductions || [],
      );
      const totalWeight = (inv.price_items || []).reduce(
        (s, i) => s + (i.quantity || 0),
        0,
      );
      return {
        ...inv,
        totalAmount,
        totalWeight,
      };
    });
  }, [invoices]);

  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [selectedTreasuryType, setSelectedTreasuryType] = useState<
    "suppliers" | "farmers" | "expenses" | "advances" | null
  >(null);
  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null);
  const [isTreasuryModalOpen, setIsTreasuryModalOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [isFarmerAccountEnabled, setIsFarmerAccountEnabled] = useState<boolean>(true);
  const { showToast } = useToast();

  // --- Visitor Tracking ---
  const hasTracked = useRef(false);

  useEffect(() => {
    if (seasonId && !hasTracked.current && isSupabaseConfigured) {
      const trackVisit = async () => {
        if (hasTracked.current || !isSupabaseConfigured) return;
        hasTracked.current = true;

        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) return;

        let visitorId = localStorage.getItem("visitor_id");
        if (!visitorId) {
          visitorId = crypto.randomUUID();
          localStorage.setItem("visitor_id", visitorId);
        }

        // 1. البحث عن أي اسم محفوظ مسبقاً لهذا الزائر في أي تقرير
        const { data: nameData } = await supabase
          .from("report_visits")
          .select("visitor_name, is_ignored")
          .eq("visitor_id", visitorId)
          .not("visitor_name", "is", null)
          .not("visitor_name", "eq", "")
          .order("accessed_at", { ascending: false })
          .limit(1);

        const existingName =
          nameData && nameData.length > 0 ? nameData[0].visitor_name : null;
        const isIgnored =
          nameData && nameData.length > 0 ? nameData[0].is_ignored : false;

        // إذا كان الزائر "متجاهل"، لا تفعل شيئاً
        if (isIgnored) return;

        // استخدام upsert مع التأكد من عدم إرسال قيمة فارغة للاسم إذا كان موجوداً
        const updatePayload: any = {
          report_id: seasonId,
          visitor_id: visitorId,
          accessed_at: new Date().toISOString(),
          is_read: false,
          is_ignored: false,
        };

        if (existingName) {
          updatePayload.visitor_name = existingName;
        }

        const { error } = await supabase
          .from("report_visits")
          .upsert(updatePayload, {
            onConflict: "visitor_id,report_id",
            ignoreDuplicates: false,
          });

        if (error) {
          console.error("Error tracking visit:", error.message);
        }
      };
      trackVisit();
    }
  }, [seasonId]);

  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [seenIds, setSeenIds] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem("seen_notifications_v4");
      return new Set(saved ? JSON.parse(saved) : []);
    } catch {
      return new Set();
    }
  });

  // Baseline timestamp to ignore everything registered before this logic was implemented
  const [baselineTime] = useState<number>(() => {
    const saved = localStorage.getItem("notifications_baseline_v4");
    if (saved) return parseInt(saved, 10);
    const now = Date.now();
    localStorage.setItem("notifications_baseline_v4", String(now));
    return now;
  });

  // 1. Check for unseen items on load (Only items registered AFTER baseline)
  useEffect(() => {
    if (
      loading ||
      !seasonId ||
      (invoices.length === 0 &&
        expenses.length === 0 &&
        withdrawals.length === 0 &&
        supplierPayments.length === 0)
    )
      return;

    // Helper to check if item is "New" (Registered after baseline and not seen)
    const isNewAndUnseen = (item: Record<string, unknown>, prefix: string) => {
      const regTime = new Date(
        (item.created_at as string) || (item.date as string) || 0,
      ).getTime();
      return regTime > baselineTime && !seenIds.has(`${prefix}-${item.id}`);
    };

    // Get latest items that are truly new (registered after baseline)
    const latestInv = invoices.filter((inv) =>
      isNewAndUnseen(inv as unknown as Record<string, unknown>, "inv"),
    )[0];
    let latestExp: Expense | undefined = expenses.filter((exp) =>
      isNewAndUnseen(exp as unknown as Record<string, unknown>, "exp"),
    )[0];

    // Prevent labor expense notifications absolutely for secrecy
    if (latestExp) {
      const cat = categories.find((c) => c.id === latestExp.category_id);
      const catName = cat ? cat.name : "";
      const desc = (latestExp.description || "").toLowerCase();
      const isLaborDesc =
        desc.includes("عامل") ||
        desc.includes("عمالة") ||
        desc.includes("عماله") ||
        desc.includes("يومية");
      const isLaborCat =
        catName.includes("عمالة") ||
        catName.includes("عماله") ||
        catName.includes("يومية") ||
        catName.includes("عامل") ||
        isLaborDesc;
      if (isLaborCat || isLaborDesc) {
        latestExp = undefined;
      }
    }

    const latestWith = withdrawals.filter((w) =>
      isNewAndUnseen(w as unknown as Record<string, unknown>, "with"),
    )[0];
    const latestPay = supplierPayments.filter((p) =>
      isNewAndUnseen(p as unknown as Record<string, unknown>, "pay"),
    )[0];

    const newNotifs: AppNotification[] = [];

    if (latestInv) {
      const amount = calculateInvoiceTotal(
        latestInv.price_items || [],
        latestInv.deductions || [],
      );
      newNotifs.push({
        id: `inv-${latestInv.id}`,
        dbId: String(latestInv.id),
        type: "invoice",
        amount,
        date: new Date(latestInv.created_at || latestInv.date || Date.now()),
        label: `فاتورة جديدة بمبلغ ${formatCurrency(amount)}`,
        isPositive: true,
      });
    }

    if (latestExp) {
      const amount = Number(latestExp.amount) || 0;
      const cat = categories.find((c) => c.id === latestExp.category_id);
      const catName = cat ? ` (${cat.name})` : "";
      newNotifs.push({
        id: `exp-${latestExp.id}`,
        dbId: String(latestExp.id),
        type: "expense",
        amount,
        date: new Date(latestExp.created_at || latestExp.date || Date.now()),
        label: `مصروف جديد${catName} بمبلغ ${formatCurrency(amount)}`,
        isPositive: false,
      });
    }

    if (latestWith) {
      const amount = Number(latestWith.amount) || 0;
      newNotifs.push({
        id: `with-${latestWith.id}`,
        dbId: String(latestWith.id),
        type: "withdrawal",
        amount,
        date: new Date(latestWith.created_at || latestWith.date || Date.now()),
        label: `سحب مزارع جديد بمبلغ ${formatCurrency(amount)}`,
        isPositive: false,
      });
    }

    if (latestPay) {
      const amount = Number(latestPay.amount) || 0;
      newNotifs.push({
        id: `pay-${latestPay.id}`,
        dbId: String(latestPay.id),
        type: "payment",
        amount,
        date: new Date(latestPay.created_at || latestPay.date || Date.now()),
        label: `مدفوع مورد جديد بمبلغ ${formatCurrency(amount)}`,
        isPositive: false,
      });
    }

    // Show only the absolute latest one
    const sorted = newNotifs.sort(
      (a, b) => b.date.getTime() - a.date.getTime(),
    );
    if (sorted.length > 0 && notifications.length === 0) {
      setNotifications([sorted[0]]);
    }
  }, [
    invoices,
    expenses,
    withdrawals,
    supplierPayments,
    loading,
    seenIds,
    seasonId,
    notifications.length,
    baselineTime,
    categories,
  ]);

  // 2. Realtime Subscription
  useEffect(() => {
    if (!seasonId) return;

    const channel = supabase
      .channel("realtime_notifications_v5")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "invoices" },
        async (payload: { new: Invoice }) => {
          const newInv = payload.new;
          if (newInv.cycle_id !== seasonId) return;

          const [{ data: items }, { data: deds }] = await Promise.all([
            supabase
              .from("invoice_price_items")
              .select("*")
              .eq("invoice_id", newInv.id),
            supabase
              .from("invoice_deductions")
              .select("*")
              .eq("invoice_id", newInv.id),
          ]);

          const amount = calculateInvoiceTotal(
            (items || []) as InvoicePriceItem[],
            (deds || []) as InvoiceDeductionItem[],
          );
          const notif: AppNotification = {
            id: `inv-${newInv.id}`,
            dbId: String(newInv.id),
            type: "invoice",
            amount,
            date: new Date(),
            label: `فاتورة جديدة بمبلغ ${formatCurrency(amount)}`,
            isPositive: true,
          };

          setNotifications([notif]);
          showToast("تم تسجيل فاتورة جديدة", "success");
          setInvoices((prev) => [
            {
              ...newInv,
              price_items: (items || []) as InvoicePriceItem[],
              deductions: (deds || []) as InvoiceDeductionItem[],
            },
            ...prev,
          ]);
        },
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "expenses" },
        async (payload: { new: Expense }) => {
          const newExp = payload.new;
          if (newExp.cycle_id !== seasonId) return;

          const cat = categories.find((c) => c.id === newExp.category_id);
          const catName = cat ? cat.name : "";
          const desc = (newExp.description || "").toLowerCase();
          const isLaborDesc =
            desc.includes("عامل") ||
            desc.includes("عمالة") ||
            desc.includes("عماله") ||
            desc.includes("يومية");
          const isLaborCat =
            catName.includes("عمالة") ||
            catName.includes("عماله") ||
            catName.includes("يومية") ||
            catName.includes("عامل") ||
            isLaborDesc;

          // حجب إشعارات العمالة بشكل جذري ومطلق للسرية، بغض النظر عن أي إعدادات أخرى
          if (isLaborCat || isLaborDesc) {
            return;
          }

          const amount = Number(newExp.amount) || 0;
          const catStr = catName ? ` (${catName})` : "";
          const notif: AppNotification = {
            id: `exp-${newExp.id}`,
            dbId: String(newExp.id),
            type: "expense",
            amount,
            date: new Date(),
            label: `مصروف جديد${catStr} بمبلغ ${formatCurrency(amount)}`,
            isPositive: false,
          };

          setNotifications([notif]);
          showToast("تم تسجيل مصروف جديد", "error");
          setExpenses((prev) => [newExp, ...prev]);
        },
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "farmer_withdrawals" },
        (payload: { new: FarmerWithdrawal }) => {
          const newWith = payload.new;
          if (newWith.cycle_id !== seasonId) return;

          const amount = Number(newWith.amount) || 0;
          const notif: AppNotification = {
            id: `with-${newWith.id}`,
            dbId: String(newWith.id),
            type: "withdrawal",
            amount,
            date: new Date(),
            label: `سحب مزارع جديد بمبلغ ${formatCurrency(amount)}`,
            isPositive: false,
          };

          setNotifications([notif]);
          showToast("تم تسجيل سحب مزارع جديد", "success");
          setWithdrawals((prev) => [newWith, ...prev]);
        },
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "supplier_payments" },
        (payload: { new: SupplierPayment }) => {
          const newPay = payload.new;
          if (newPay.cycle_id !== seasonId) return;

          const amount = Number(newPay.amount) || 0;
          const notif: AppNotification = {
            id: `pay-${newPay.id}`,
            dbId: String(newPay.id),
            type: "payment",
            amount,
            date: new Date(),
            label: `مدفوع مورد جديد بمبلغ ${formatCurrency(amount)}`,
            isPositive: false,
          };

          setNotifications([notif]);
          showToast("تم تسجيل مدفوع مورد جديد", "success");
          setSupplierPayments((prev) => [newPay, ...prev]);
        },
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "invoices" },
        (payload: { old: { id: string } }) => {
          const deletedId = payload.old.id;
          setNotifications((prev) =>
            prev.filter((n) => n.id !== `inv-${deletedId}`),
          );
          setInvoices((prev) => prev.filter((inv) => inv.id !== deletedId));
        },
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "expenses" },
        (payload: { old: { id: string } }) => {
          const deletedId = payload.old.id;
          setNotifications((prev) =>
            prev.filter((n) => n.id !== `exp-${deletedId}`),
          );
          setExpenses((prev) => prev.filter((exp) => exp.id !== deletedId));
        },
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "farmer_withdrawals" },
        (payload: { old: { id: string } }) => {
          const deletedId = payload.old.id;
          setNotifications((prev) =>
            prev.filter((n) => n.id !== `with-${deletedId}`),
          );
          setWithdrawals((prev) => prev.filter((w) => w.id !== deletedId));
        },
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "supplier_payments" },
        (payload: { old: { id: string } }) => {
          const deletedId = payload.old.id;
          setNotifications((prev) =>
            prev.filter((n) => n.id !== `pay-${deletedId}`),
          );
          setSupplierPayments((prev) => prev.filter((p) => p.id !== deletedId));
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [seasonId, showToast]);

  // 3. Immediate Dismissal on View
  useEffect(() => {
    if (isNotificationOpen && notifications.length > 0) {
      // Mark as seen immediately in memory
      const newSeenIds = new Set(seenIds);
      notifications.forEach((n) => newSeenIds.add(n.id));
      setSeenIds(newSeenIds);
      localStorage.setItem(
        "seen_notifications_v4",
        JSON.stringify([...newSeenIds]),
      );

      // Close dropdown and clear list after 1 second of viewing
      const timer = setTimeout(() => {
        setNotifications([]);
        setIsNotificationOpen(false);
        showToast("تمت أرشفة التنبيه", "success");
      }, 500); // Reduced to 500ms for even faster dismissal

      return () => clearTimeout(timer);
    }
  }, [isNotificationOpen, notifications, seenIds, showToast]);

  useEffect(() => {
    const savedSize = localStorage.getItem("sharedReportFontSize_v3");
    if (savedSize) {
      setFontSizeLevel(parseInt(savedSize, 10));
    }
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    const sizes: Record<number, string> = {
      1: "10px",
      2: "11px",
      3: "12px",
      4: "13px",
      5: "", // Default (relies on device settings)
      6: "15px",
      7: "16px",
      8: "18px",
      9: "20px",
      10: "22px",
    };

    root.style.fontSize =
      sizes[fontSizeLevel] !== undefined ? sizes[fontSizeLevel] : "";
    localStorage.setItem("sharedReportFontSize_v3", String(fontSizeLevel));

    // Cleanup on unmount
    return () => {
      root.style.fontSize = "";
    };
  }, [fontSizeLevel]);

  const increaseFontSize = () =>
    setFontSizeLevel((prev) => Math.min(prev + 1, 10));
  const decreaseFontSize = () =>
    setFontSizeLevel((prev) => Math.max(prev - 1, 1));

  // Scroll to top when activeTab changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [activeTab]);

  useEffect(() => {
    // Extract ID from URL: /shared-report/ID
    // Robust extraction handling trailing slashes
    const path = window.location.pathname;
    // Remove trailing slash if exists
    const cleanPath = path.endsWith("/") ? path.slice(0, -1) : path;
    const parts = cleanPath.split("/");
    const idIndex = parts.indexOf("shared-report");

    if (idIndex !== -1 && parts[idIndex + 1]) {
      setSeasonId(parts[idIndex + 1]);
    } else {
      setError("رابط غير صالح");
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!seasonId) return;

    if (!isSupabaseConfigured) {
      setError("الخدمة السحابية غير مهيأة حالياً");
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        // 1. محاولة جلب بيانات التقرير عبر دالة RPC الآمنة get_shared_report باستخدام رمز المشاركة
        const { data: reportData, error: rpcError } = await supabase.rpc(
          "get_shared_report",
          { p_share_token: seasonId },
        );

        let cycleData: any = null;
        let fetchedExpensesRaw: any[] = [];
        let fetchedInvoicesRaw: any[] = [];
        let fetchedCategoriesRaw: any[] = [];
        let fetchedSuppliers: any[] = [];
        let fetchedFarmers: any[] = [];
        let fetchedPersons: any[] = [];
        let fetchedWithdrawals: any[] = [];
        let fetchedPayments: any[] = [];
        let fetchedAdvances: any[] = [];
        let assetNameVal = "غير محدد";
        let fetchedPriceItems: InvoicePriceItem[] = [];
        let fetchedDeductions: InvoiceDeductionItem[] = [];
        let fetchedBankAccounts: any[] = [];
        let fetchedBankTransactions: any[] = [];
        let isolateLaborObj = true;

        if (!rpcError && reportData && reportData.success && reportData.cycle) {
          // تم جلب التقرير بنجاح عبر رمز المشاركة المشفر
          cycleData = reportData.cycle;
          assetNameVal = reportData.asset_name || "غير محدد";
          fetchedExpensesRaw = reportData.expenses || [];
          fetchedInvoicesRaw = reportData.invoices || [];
          fetchedCategoriesRaw = reportData.expense_categories || [];
          fetchedSuppliers = reportData.suppliers || [];
          fetchedFarmers = reportData.farmers || [];
          fetchedPersons = reportData.persons || [];
          fetchedWithdrawals = reportData.farmer_withdrawals || [];
          fetchedPayments = reportData.supplier_payments || [];
          fetchedAdvances = reportData.advances || [];
          fetchedPriceItems = (reportData.invoice_price_items || []) as InvoicePriceItem[];
          fetchedDeductions = (reportData.invoice_deductions || []) as InvoiceDeductionItem[];
          fetchedBankAccounts = reportData.bank_accounts || [];
          fetchedBankTransactions = reportData.bank_transactions || [];

          if (reportData.app_settings) {
            try {
              const settingsObj =
                typeof reportData.app_settings === "string"
                  ? JSON.parse(reportData.app_settings)
                  : reportData.app_settings;
              if (settingsObj?.isolateLaborAccount === false) {
                isolateLaborObj = false;
              }
              if (settingsObj?.systems?.farmer_account === false) {
                setIsFarmerAccountEnabled(false);
              } else {
                setIsFarmerAccountEnabled(true);
              }
            } catch (e) {
              console.error("Error parsing owner app_settings:", e);
            }
          }
        } else {
          // إذا كان هناك رسالة خطأ صريحة من الدالة (مثل انتهاء الصلاحية أو الإلغاء)
          if (rpcError && (rpcError.message?.includes("انتهت صلاحية") || rpcError.message?.includes("تم إلغاء") || rpcError.message?.includes("حذفه"))) {
            setError(rpcError.message);
            setLoading(false);
            return;
          }

          // مسار احتياطي في حال كان المستخدم هو المالك وفتح الرابط بمعرف العروة المباشر (Direct UUID)
          const { data: directCycle, error: cycleError } = await supabase
            .from("cycles")
            .select("*")
            .eq("id", seasonId)
            .single();

          if (cycleError || !directCycle) {
            setError(
              rpcError?.message || "عذراً، رابط التقرير غير صحيح أو انتهت صلاحيته.",
            );
            setLoading(false);
            return;
          }

          cycleData = directCycle;

          // جلب البيانات المرتبطة بالعروة مباشرة للمالك
          const [expRes, invRes, withRes, payRes, advRes, catRes, assetRes] =
            await Promise.all([
              supabase.from("expenses").select("*").eq("cycle_id", seasonId),
              supabase.from("invoices").select("*").eq("cycle_id", seasonId),
              supabase
                .from("farmer_withdrawals")
                .select("*, farmers(name)")
                .eq("cycle_id", seasonId),
              supabase
                .from("supplier_payments")
                .select("*, suppliers(name)")
                .eq("cycle_id", seasonId),
              supabase
                .from("advances")
                .select("*, persons(name)")
                .eq("cycle_id", seasonId),
              supabase.from("expense_categories").select("*"),
              supabase
                .from("assets")
                .select("name")
                .eq("id", cycleData.asset_id)
                .single(),
            ]);

          const ownerId = cycleData.user_id;
          const [
            supRes,
            farmRes,
            persRes,
            bankAccRes,
            bankTxRes,
            ownerProfileRes,
          ] = await Promise.all([
            supabase.from("suppliers").select("id, name").eq("user_id", ownerId),
            supabase.from("farmers").select("id, name").eq("user_id", ownerId),
            supabase.from("persons").select("id, name").eq("user_id", ownerId),
            supabase.from("bank_accounts").select("*").eq("user_id", ownerId),
            supabase.from("bank_transactions").select("*").eq("user_id", ownerId),
            supabase
              .from("profiles")
              .select("app_settings")
              .eq("id", ownerId)
              .maybeSingle(),
          ]);

          fetchedExpensesRaw = expRes.data || [];
          fetchedInvoicesRaw = invRes.data || [];
          fetchedCategoriesRaw = catRes.data || [];
          fetchedSuppliers = supRes.data || [];
          fetchedFarmers = farmRes.data || [];
          fetchedPersons = persRes.data || [];
          fetchedWithdrawals = withRes.data || [];
          fetchedPayments = payRes.data || [];
          fetchedAdvances = advRes.data || [];
          assetNameVal = assetRes.data?.name || "غير محدد";
          fetchedBankAccounts = bankAccRes.data || [];
          fetchedBankTransactions = bankTxRes.data || [];

          if (ownerProfileRes?.data?.app_settings) {
            try {
              const settingsObj =
                typeof ownerProfileRes.data.app_settings === "string"
                  ? JSON.parse(ownerProfileRes.data.app_settings)
                  : ownerProfileRes.data.app_settings;
              if (settingsObj?.isolateLaborAccount === false) {
                isolateLaborObj = false;
              }
              if (settingsObj?.systems?.farmer_account === false) {
                setIsFarmerAccountEnabled(false);
              } else {
                setIsFarmerAccountEnabled(true);
              }
            } catch (e) {
              console.error("Error parsing owner app_settings:", e);
            }
          }

          const invoiceIds = fetchedInvoicesRaw.map((i) => i.id);
          if (invoiceIds.length > 0) {
            const [pricesRes, dedsRes] = await Promise.all([
              supabase
                .from("invoice_price_items")
                .select("*")
                .in("invoice_id", invoiceIds),
              supabase
                .from("invoice_deductions")
                .select("*")
                .in("invoice_id", invoiceIds),
            ]);
            fetchedPriceItems = (pricesRes.data || []) as InvoicePriceItem[];
            fetchedDeductions = (dedsRes.data || []) as InvoiceDeductionItem[];
          }
        }

        // إخفاء فئة ومصاريف العمالة للحفاظ على الخصوصية عن المشاهد في التقرير المشترك
        const laborCategoryIds = fetchedCategoriesRaw
          .filter(
            (c: any) =>
              c.name.includes("عمالة") ||
              c.name.includes("عماله") ||
              c.name.includes("يومية") ||
              c.name.includes("عامل") ||
              c.name.includes("خاص بالمزارع") ||
              c.name.includes("مزارع") ||
              c.name.includes("نثريات") ||
              c.name.includes("فطار") ||
              c.name.includes("ضيافة") ||
              c.name.includes("إكرامية"),
          )
          .map((c: any) => c.id);

        // Exclude worker advances entirely from general/operational expenses inside report calculations
        const rawExpensesWithoutAdvances = (fetchedExpensesRaw || []).filter(
          (e: any) => {
            const desc = e.description || "";
            const amountVal = e.amount || 0;
            const isLaborCat = laborCategoryIds.includes(e.category_id);

            const isAdvanceTaken =
              isLaborCat &&
              amountVal > 0 &&
              (desc.includes("سلفة") ||
                desc.includes("سلفية") ||
                desc.includes("تخصيم") ||
                (desc.includes("صرف") && !desc.includes("منصرف")) ||
                desc.includes("دفعة نقدية") ||
                desc.includes("مسحوبات"));

            const isAdvanceRepayment =
              isLaborCat &&
              (amountVal < 0 ||
                (desc.includes("سداد") && desc.includes("من العامل")));

            return !isAdvanceTaken && !isAdvanceRepayment;
          },
        );

        let fetchedExpenses = rawExpensesWithoutAdvances;
        let fetchedCategories = fetchedCategoriesRaw;

        if (isolateLaborObj) {
          fetchedExpenses = rawExpensesWithoutAdvances.filter((e: any) => {
            const isLaborCat = laborCategoryIds.includes(e.category_id);
            const desc = (e.description || "").toLowerCase();
            const isLaborDesc =
              desc.includes("عامل") ||
              desc.includes("عمالة") ||
              desc.includes("عماله") ||
              desc.includes("يومية");
            return !isLaborCat && !isLaborDesc;
          });
          fetchedCategories = fetchedCategoriesRaw.filter(
            (c: any) => !laborCategoryIds.includes(c.id),
          );
        }

        const hydratedInvoices = fetchedInvoicesRaw
          .map((inv) => ({
            ...inv,
            price_items: fetchedPriceItems.filter(
              (p) => p.invoice_id === inv.id,
            ),
            deductions: fetchedDeductions.filter(
              (d) => d.invoice_id === inv.id,
            ),
          }))
          .sort(
            (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
          );

        setExpenses(fetchedExpenses);
        setInvoices(hydratedInvoices);
        setWithdrawals(fetchedWithdrawals);
        setSupplierPayments(fetchedPayments);
        setAdvances(fetchedAdvances);
        setCategories(fetchedCategories);
        setSuppliers(fetchedSuppliers);
        setFarmers(fetchedFarmers);
        setPersons(fetchedPersons);
        setAssetName(assetNameVal);
        setBankTransactions(fetchedBankTransactions);
        setBankAccounts(fetchedBankAccounts);

        // 3. Perform Calculations
        // Calculate Revenue (exclude balance transfers and manual funding to reflect actual crop sales)
        const salesInvoices = hydratedInvoices.filter(
          (inv) => inv.market !== "رصيد منقول" && inv.market !== "تمويل يدوي",
        );
        const revenue = salesInvoices.reduce((sum, inv) => {
          return (
            sum +
            calculateInvoiceTotal(inv.price_items || [], inv.deductions || [])
          );
        }, 0);

        // Calculate Operating Expenses (Expenses table)
        const operatingExpenses = fetchedExpenses.reduce(
          (sum, exp) => sum + (exp.amount || 0),
          0,
        );

        // Calculate Farmer Share (if applicable)
        const farmerShareAmount = isFarmerAccountEnabled
          ? revenue * ((cycleData.farmer_share_percentage || 0) / 100)
          : 0;

        // Calculate Owner Net Profit
        const ownerProfit = revenue - operatingExpenses - farmerShareAmount;

        // Calculate Production Stats
        let totalProductionKg = 0;
        let totalCartons = 0;
        let totalCages = 0;

        hydratedInvoices.forEach((inv) => {
          const weight = (inv.price_items || []).reduce(
            (s, item) => s + (Number(item.quantity) || 0),
            0,
          );
          totalProductionKg += weight;

          if (inv.packaging_type === "carton") {
            totalCartons += inv.packaging_count || inv.carton_count || 0;
          } else if (inv.packaging_type === "cage") {
            totalCages += inv.packaging_count || inv.cage_count || 0;
          }
        });

        // Calculate ROI
        const roi =
          operatingExpenses > 0 ? (ownerProfit / operatingExpenses) * 100 : 0;

        // Calculate Per Unit Stats
        const unitDivisor =
          cycleData.unit_of_measure === "plants"
            ? Number(cycleData.plant_count) || 0
            : Number(cycleData.area_in_feddans) || 0;
        const productionPerPlantKg =
          unitDivisor > 0 ? totalProductionKg / unitDivisor : 0;
        const costPerPlant =
          unitDivisor > 0 ? operatingExpenses / unitDivisor : 0;
        const revenuePerPlant =
          unitDivisor > 0 ? (revenue - farmerShareAmount) / unitDivisor : 0;
        const profitPerPlant = unitDivisor > 0 ? ownerProfit / unitDivisor : 0;

        // Calculate Health Score
        let health = 50;
        if (ownerProfit > 0) health += 20;
        if (roi > 20) health += 20;
        if (roi > 50) health += 10;
        if (ownerProfit < 0) health -= 20;
        health = Math.max(0, Math.min(100, health));

        // Calculate Harvest Days for Daily Pulse
        let harvestDays = 0;
        let avgDailyProductionKg = 0;
        if (hydratedInvoices.length > 0) {
          const sortedInvoicesForDays = [...hydratedInvoices].sort(
            (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
          );
          const firstDate = new Date(sortedInvoicesForDays[0].date);
          const endDate =
            cycleData.status === "active"
              ? new Date()
              : new Date(
                  sortedInvoicesForDays[sortedInvoicesForDays.length - 1].date,
                );

          firstDate.setHours(0, 0, 0, 0);
          endDate.setHours(0, 0, 0, 0);

          const diffTime = endDate.getTime() - firstDate.getTime();
          harvestDays = Math.max(
            1,
            Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1,
          );
          avgDailyProductionKg = totalProductionKg / harvestDays;
        }

        // Merge calculations into cycle object
        const enrichedCycle: Cycle = {
          ...cycleData,
          revenue,
          expenses: operatingExpenses,
          profit: ownerProfit, // Display Owner Profit as the main profit metric
          farmerShare: farmerShareAmount,
          totalProductionKg,
          totalCartons,
          totalCages,
          returnOnInvestment: roi,
          productionPerPlantKg,
          costPerPlant,
          revenuePerPlant,
          profitPerPlant,
          health,
          avgDailyProductionKg, // Add this
        };

        setCycle(enrichedCycle);
      } catch (err: unknown) {
        console.error("Error fetching report:", err);
        setError(
          "عذراً، لم نتمكن من تحميل بيانات التقرير. قد يكون الرابط غير صحيح أو انتهت صلاحيته.",
        );
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [seasonId]);

  // --- Treasury Calculations ---
  const treasuryStats = useMemo(() => {
    if (!cycle) return null;

    const rev = cycle.revenue;

    const opExpenses = expenses.filter((e) => e.payment_method === "cash");
    const sumOp = opExpenses.reduce((s, e) => s + (e.amount || 0), 0);

    const sumAdv = advances.reduce((s, a) => s + (a.amount || 0), 0);
    const sumFarmer = withdrawals.reduce((s, w) => s + (w.amount || 0), 0);
    const sumSuppliers = supplierPayments.reduce(
      (s, p) => s + (p.amount || 0),
      0,
    );

    const cycleBankTransactions = bankTransactions.filter(
      (t) => String(t.cycle_id) === String(seasonId),
    );
    const bankDeposits = cycleBankTransactions.filter(
      (t) => t.type === "deposit",
    );
    const sumBankDeposits = bankDeposits.reduce(
      (s, t) => s + (Number(t.amount) || 0),
      0,
    );

    const bankWithdrawals = cycleBankTransactions.filter(
      (t) => t.type === "withdrawal",
    );
    const sumBankWithdrawals = bankWithdrawals.reduce(
      (s, t) => s + (Number(t.amount) || 0),
      0,
    );

    // الكاش = الإيرادات + المسحوبات من البنك - (المصروفات + السلف + مسحوبات المزارعين + مدفوعات الموردين + الإيداعات في البنك)
    const totalOut =
      sumOp + sumAdv + sumFarmer + sumSuppliers + sumBankDeposits;
    const totalIn = rev + sumBankWithdrawals;

    const cashBalance = totalIn - totalOut;

    return {
      balance: cashBalance,
      inflows: {
        totalRevenue: rev,
        bankWithdrawals: {
          amount: sumBankWithdrawals,
          transactionCount: bankWithdrawals.length,
        },
      },
      outflows: {
        totalDeductions: totalOut,
        operatingExpenses: {
          amount: sumOp,
          transactionCount: opExpenses.length,
        },
        personalAdvances: { amount: sumAdv, transactionCount: advances.length },
        farmerWithdrawals: {
          amount: sumFarmer,
          transactionCount: withdrawals.length,
        },
        supplierPayments: {
          amount: sumSuppliers,
          transactionCount: supplierPayments.length,
        },
        bankDeposits: {
          amount: sumBankDeposits,
          transactionCount: bankDeposits.length,
        },
      },
    };
  }, [
    cycle,
    expenses,
    withdrawals,
    supplierPayments,
    advances,
    bankTransactions,
    seasonId,
  ]);

  const extraInfo = useMemo(() => {
    const farmer = farmers.find(
      (f) => String(f.id) === String(cycle?.responsible_farmer_id),
    );
    const lastPayment = [...supplierPayments].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    )[0];
    const lastSupplierName = lastPayment
      ? suppliers.find((s) => String(s.id) === String(lastPayment.supplier_id))
          ?.name || lastPayment.supplierName
      : null;

    return {
      responsibleFarmer: farmer?.name || cycle?.responsibleFarmer || "غير محدد",
      lastSupplier: lastSupplierName,
    };
  }, [cycle, supplierPayments, suppliers, farmers]);

  const totalBankBalance = useMemo(() => {
    if (!bankAccounts || bankAccounts.length === 0) {
      // إذا لم نتمكن من جلب الحسابات (بسبب RLS)، نعتمد على الإيداعات والمسحوبات المسجلة في العروة فقط
      const cycleBankTransactions = bankTransactions.filter(
        (t) => String(t.cycle_id) === String(seasonId),
      );
      const deposits = cycleBankTransactions
        .filter((t) => t.type === "deposit")
        .reduce((s, t) => s + (Number(t.amount) || 0), 0);
      const withdrawals = cycleBankTransactions
        .filter((t) => t.type === "withdrawal")
        .reduce((s, t) => s + (Number(t.amount) || 0), 0);
      return deposits - withdrawals;
    }

    return bankAccounts.reduce((total, account) => {
      const accId = String(account.id);
      const txs = bankTransactions.filter(
        (t) =>
          String(t.account_id) === accId &&
          String(t.cycle_id) === String(seasonId),
      );
      const deposits = txs
        .filter((t) => t.type === "deposit")
        .reduce((s, t) => s + (Number(t.amount) || 0), 0);
      const withdrawals = txs
        .filter((t) => t.type === "withdrawal")
        .reduce((s, t) => s + (Number(t.amount) || 0), 0);
      return total + deposits - withdrawals;
    }, 0);
  }, [bankAccounts, bankTransactions, seasonId]);

  const weeklyChartData = useMemo(() => {
    const weeks = 7;
    const revArray = Array(weeks).fill(0);
    const expArray = Array(weeks).fill(0);
    const profArray = Array(weeks).fill(0);
    const fShareArray = Array(weeks).fill(0);
    const recoveryTrendArray = Array(weeks).fill(0);

    const now = new Date();
    now.setHours(23, 59, 59, 999);

    const getWeekIndex = (dateString: string) => {
      const date = new Date(dateString);
      const diffTime = now.getTime() - date.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays >= weeks * 7 || diffDays < 0) return -1;
      return weeks - 1 - Math.floor(diffDays / 7);
    };

    invoices.forEach((invoice) => {
      const weekIndex = getWeekIndex(invoice.date);
      if (weekIndex !== -1) {
        const invoiceTotal = calculateInvoiceTotal(
          invoice.price_items || [],
          invoice.deductions || [],
        );
        revArray[weekIndex] += invoiceTotal;
        if (cycle) {
          const invoiceFarmerShare =
            invoiceTotal * ((cycle.farmer_share_percentage || 0) / 100);
          fShareArray[weekIndex] += invoiceFarmerShare;
          profArray[weekIndex] += invoiceTotal - invoiceFarmerShare;
        } else {
          profArray[weekIndex] += invoiceTotal;
        }
      }
    });

    expenses.forEach((expense) => {
      const weekIndex = getWeekIndex(expense.date);
      if (weekIndex !== -1) {
        expArray[weekIndex] += expense.amount;
        profArray[weekIndex] -= expense.amount;
      }
    });

    let cumulativeOwnerRev = 0;
    let cumulativeExp = 0;
    for (let i = 0; i < weeks; i++) {
      cumulativeOwnerRev += revArray[i] - fShareArray[i];
      cumulativeExp += expArray[i];
      recoveryTrendArray[i] =
        cumulativeExp > 0
          ? Math.min(100, (cumulativeOwnerRev / cumulativeExp) * 100)
          : 0;
    }

    return {
      revenue: revArray,
      expenses: expArray,
      profit: profArray,
      farmerShare: fShareArray,
      recovery: recoveryTrendArray,
    };
  }, [invoices, expenses, cycle]);

  const trendData = useMemo(() => {
    const calculateTrend = (current: number, previous: number) => {
      if (previous === 0)
        return { value: current > 0 ? 100.0 : 0, direction: "up" as const };
      const percentageChange = ((current - previous) / previous) * 100;
      return {
        value: Math.abs(percentageChange),
        direction: percentageChange >= 0 ? ("up" as const) : ("down" as const),
      };
    };
    const lastWeek = weeklyChartData.revenue.length - 1;
    const secondLastWeek = lastWeek - 1;
    if (secondLastWeek < 0)
      return {
        revenue: { value: 0, direction: "up" as const },
        expenses: { value: 0, direction: "up" as const },
        profit: { value: 0, direction: "up" as const },
        farmerShare: { value: 0, direction: "down" as const },
      };
    return {
      revenue: calculateTrend(
        weeklyChartData.revenue[lastWeek],
        weeklyChartData.revenue[secondLastWeek],
      ),
      expenses: calculateTrend(
        weeklyChartData.expenses[lastWeek],
        weeklyChartData.expenses[secondLastWeek],
      ),
      profit: calculateTrend(
        weeklyChartData.profit[lastWeek],
        weeklyChartData.profit[secondLastWeek],
      ),
      farmerShare: calculateTrend(
        weeklyChartData.farmerShare[lastWeek],
        weeklyChartData.farmerShare[secondLastWeek],
      ),
    };
  }, [weeklyChartData]);

  // --- Calculations (Replicated from OverviewTab/CycleReport) ---
  const recoveryStats = useMemo(() => {
    if (!cycle) return { progress: 0, isRecovered: false, remaining: 0 };
    // Use Owner Revenue (Revenue - Farmer Share) for recovery calculation
    const ownerRevenue = cycle.revenue - (cycle.farmerShare || 0);
    // إزالة الحد الأقصى (100) للسماح بعرض النسب الأكبر من 100%
    const progress =
      cycle.expenses > 0
        ? Math.max(0, Math.round((ownerRevenue / cycle.expenses) * 100))
        : 100;
    return {
      progress,
      isRecovered: progress >= 100,
      remaining: Math.max(0, cycle.expenses - ownerRevenue),
    };
  }, [cycle]);

  useEffect(() => {
    // تم إزالة قصاصات الاحتفال واستبدالها بالوضع الرابح (Profit Mode)
  }, [recoveryStats.isRecovered, loading]);

  // Expense Breakdown
  const expenseBreakdown = useMemo(() => {
    if (!expenses.length || !categories.length) return [];
    const opExpenses = expenses.filter((e) => !e.is_establishment);
    const grouped: Record<string, number> = {};
    opExpenses.forEach((e) => {
      const cat = categories.find(
        (c) => String(c.id) === String(e.category_id),
      );
      const name = cat ? cat.name : "أخرى";
      grouped[name] = (grouped[name] || 0) + e.amount;
    });
    return Object.entries(grouped).map(([category, amount]) => ({
      category,
      amount,
    }));
  }, [expenses, categories]);

  // Harvest Curve
  const harvestCurveData = useMemo(() => {
    if (!invoices.length) return [];
    const grouped: Record<string, number> = {};
    invoices.forEach((inv) => {
      const date = inv.date.split("-").slice(1).reverse().join("/");
      const soldWeight = (inv.price_items || []).reduce(
        (sum: number, item: InvoicePriceItem) =>
          sum + (Number(item.quantity) || 0),
        0,
      );
      if (grouped[date]) {
        grouped[date] += soldWeight;
      } else {
        grouped[date] = soldWeight;
      }
    });
    return Object.keys(grouped).map((date) => ({
      date,
      weight: grouped[date],
    }));
  }, [invoices]);

  // New Calculations for Overview
  const unitLabel = cycle
    ? cycle.unit_of_measure === "area"
      ? "الفدان"
      : "النبات"
    : "";

  const invoiceStatsList = useMemo(() => {
    if (!invoices.length) return [];
    return [...invoices]
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .reverse()
      .map((inv) => {
        const isFutureMarket = inv.market.includes("المستقبل");
        const isCarton = inv.packaging_type === "carton";
        const p_count = Number(inv.packaging_count || 0);

        const grossRevenue = (inv.price_items || []).reduce(
          (s, it) => s + Number(it.quantity) * Number(it.price_per_kg),
          0,
        );
        const deductionsAmount = (inv.deductions || []).reduce(
          (s, d) => s + (Number(d.amount) || 0),
          0,
        );
        const extraExpenses = isFutureMarket && isCarton ? p_count * 10 : 0;
        const totalDed = deductionsAmount + extraExpenses;

        const netProfit = grossRevenue - totalDed;
        const realWeight =
          (inv.price_items || []).reduce(
            (s, it) => s + Number(it.quantity),
            0,
          ) + (isFutureMarket && isCarton ? p_count * 2 : 0);

        const netPerRealKilo = realWeight > 0 ? netProfit / realWeight : 0;
        const declaredPrice = Number(inv.price_items?.[0]?.price_per_kg) || 0;
        const efficiency =
          declaredPrice > 0 ? (netPerRealKilo / declaredPrice) * 100 : 0;

        return {
          id: inv.id,
          market: inv.market,
          date: inv.date,
          declaredPrice,
          netPerRealKilo,
          efficiency,
        };
      });
  }, [invoices]);

  const deductionBreakdown = useMemo(() => {
    if (!invoices.length) return [];
    const grouped: Record<string, number> = {};
    invoices.forEach((inv) => {
      (inv.deductions || []).forEach((d) => {
        grouped[d.name] = (grouped[d.name] || 0) + (d.amount || 0);
      });
    });
    return Object.entries(grouped)
      .map(([name, totalAmount]) => ({
        name,
        totalAmount,
        percentageOfRevenue:
          cycle?.revenue > 0 ? (totalAmount / cycle.revenue) * 100 : 0,
      }))
      .sort((a, b) => b.totalAmount - a.totalAmount);
  }, [invoices, cycle]);

  const getTreasuryModalTitle = () => {
    switch (selectedTreasuryType) {
      case "suppliers":
        return "تفاصيل مدفوعات الموردين";
      case "farmers":
        if (selectedEntityId) {
          const farmer = farmers.find(
            (f) => String(f.id) === String(selectedEntityId),
          );
          const name =
            farmer?.name ||
            withdrawals.find(
              (w) => String(w.farmer_id) === String(selectedEntityId),
            )?.farmerName ||
            "غير معروف";
          return `مسحوبات المزارع: ${name}`;
        }
        return "تفاصيل مسحوبات المزارعين";
      case "expenses":
        return "تفاصيل مصروفات التشغيل (نقدي)";
      case "advances":
        if (selectedEntityId) {
          const person = persons.find(
            (p) => String(p.id) === String(selectedEntityId),
          );
          const name =
            person?.name ||
            advances.find(
              (a) => String(a.person_id) === String(selectedEntityId),
            )?.personName ||
            "غير معروف";
          return `سلف: ${name}`;
        }
        return "تفاصيل السلف الشخصية";
      default:
        return "";
    }
  };

  const renderTreasuryContent = () => {
    const handleBack = () => setSelectedEntityId(null);

    if (selectedTreasuryType === "farmers") {
      if (selectedEntityId) {
        const farmer = farmers.find(
          (f) => String(f.id) === String(selectedEntityId),
        );
        const farmerWithdrawals = withdrawals
          .filter((w) => String(w.farmer_id) === String(selectedEntityId))
          .sort(
            (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
          );
        const fallbackName =
          farmerWithdrawals[0]?.farmerName || "مزارع غير معروف";

        // حساب المستحقات والمسحوبات لهذا المزارع في هذه العروة
        const totalEarnedShares =
          cycle &&
          String(cycle.responsible_farmer_id) === String(selectedEntityId)
            ? cycle.farmerShare || 0
            : 0;
        const totalWithdrawals = farmerWithdrawals.reduce(
          (sum, w) => sum + (Number(w.amount) || 0),
          0,
        );
        const finalBalance = totalEarnedShares - totalWithdrawals;

        return (
          <div className="space-y-6">
            <button
              onClick={handleBack}
              className="flex items-center gap-2 text-sm text-neutral-500 hover:text-primary mb-2 transition-colors"
            >
              <ChevronRightIcon className="w-4 h-4" />
              <span>العودة للقائمة</span>
            </button>

            {/* بطاقة ملخص كشف الحساب */}
            <div className="flex flex-col gap-4">
              <div className="relative bg-emerald-600 rounded-3xl p-6 text-white shadow-lg shadow-emerald-900/10 overflow-hidden border border-white/10">
                <div className="relative z-10">
                  <div className="flex items-center gap-1.5 opacity-80 mb-1">
                    <WalletIcon className="w-4 h-4" />
                    <span className="text-[10px] font-black uppercase tracking-widest">
                      الرصيد الصافي المتاح
                    </span>
                  </div>
                  <div className="flex items-baseline gap-1.5">
                    <h2 className="text-3xl font-black tracking-tighter tabular-nums">
                      {formatNumber(finalBalance)}
                    </h2>
                    <span className="text-xs font-bold opacity-70">ج.م</span>
                  </div>

                  <div className="mt-4 flex gap-6 text-[11px] font-bold border-t border-white/10 pt-3">
                    <div className="flex items-center gap-1.5">
                      <span className="opacity-60">المستحقات:</span>
                      <span className="tabular-nums">
                        {formatNumber(totalEarnedShares)}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="opacity-60">المسحوبات:</span>
                      <span className="text-emerald-100 tabular-nums">
                        {formatNumber(totalWithdrawals)}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="absolute -bottom-6 -left-6 w-24 h-24 bg-white/5 rounded-full blur-2xl"></div>
              </div>

              <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-2xl p-4 flex flex-col justify-center">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-neutral-100 dark:bg-neutral-700 flex items-center justify-center text-emerald-600 font-black text-sm shrink-0 border border-neutral-200/50 dark:border-neutral-600/50">
                    {(farmer?.name || fallbackName)?.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-black text-sm text-neutral-800 dark:text-neutral-100 truncate">
                      {farmer?.name || fallbackName}
                    </h3>
                    <p className="text-[10px] text-neutral-500 font-bold uppercase tracking-tight">
                      سجل المعاملات النشط
                    </p>
                  </div>
                </div>
                <div className="mt-3 flex justify-between items-center bg-neutral-50 dark:bg-neutral-900/50 p-2 rounded-xl text-[10px]">
                  <span className="text-neutral-500 font-bold">
                    عدد العمليات:
                  </span>
                  <span className="font-black text-emerald-600 bg-emerald-600/10 px-2 py-0.5 rounded-md">
                    {farmerWithdrawals.length} عملية
                  </span>
                </div>
              </div>
            </div>

            {/* سجل المسحوبات */}
            <div className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2 border-r-4 border-rose-500 pr-2">
                  <h3 className="font-black text-neutral-800 dark:text-white text-sm uppercase tracking-wider">
                    سجل المسحوبات النقدية
                  </h3>
                </div>
                <div className="text-[9px] font-black text-neutral-400 uppercase bg-neutral-100 dark:bg-neutral-800 px-2.5 py-1 rounded-lg">
                  التاريخ
                </div>
              </div>

              <div className="grid grid-cols-1 gap-2">
                {farmerWithdrawals.length > 0 ? (
                  farmerWithdrawals.map((w) => (
                    <div
                      key={w.id}
                      className="bg-white dark:bg-neutral-800/40 border border-neutral-200 dark:border-neutral-700/50 px-4 py-3 rounded-2xl flex items-center justify-between gap-3 hover:shadow-sm transition-all"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-rose-50 dark:bg-rose-900/20 flex items-center justify-center text-rose-600 dark:text-rose-400 shrink-0">
                          <TrendingDownIcon className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-bold text-xs text-neutral-800 dark:text-neutral-100 truncate">
                            {w.description || "سحب نقدي"}
                          </h4>
                          <div className="flex items-center gap-2 mt-0.5 text-[10px] text-neutral-500 dark:text-neutral-400 font-bold">
                            <CalendarIcon className="w-3 h-3 opacity-70" />
                            <span>{w.date}</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-left shrink-0">
                        <p className="text-sm font-black text-rose-600 dark:text-rose-400 tracking-tight tabular-nums">
                          {formatNumber(w.amount)}
                          <span className="text-[9px] mr-1 font-bold opacity-70">
                            ج.م
                          </span>
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-12 bg-neutral-50 dark:bg-neutral-900/30 border-2 border-dashed border-neutral-200 dark:border-neutral-800 rounded-2xl">
                    <ClipboardDocumentIcon className="w-12 h-12 mx-auto text-neutral-200 dark:text-neutral-700 mb-2 opacity-50" />
                    <p className="text-neutral-400 text-xs font-bold">
                      لا توجد أي مسحوبات مسجلة لهذا المزارع.
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/10 p-4 rounded-2xl border border-blue-100 dark:border-blue-900/30 flex items-start gap-3">
              <div className="w-1 h-6 bg-blue-500 rounded-full shrink-0"></div>
              <p className="text-[10px] text-blue-800 dark:text-blue-300 leading-normal font-semibold">
                ملاحظة: "إجمالي المستحقات" يتم تحديثه لحظياً بناءً على فواتير
                المبيعات المسجلة في هذه العروة المسندة للمزارع.
              </p>
            </div>
          </div>
        );
      } else {
        const grouped = withdrawals.reduce(
          (acc, curr) => {
            const id = String(curr.farmer_id);
            if (!acc[id]) acc[id] = 0;
            acc[id] += curr.amount;
            return acc;
          },
          {} as Record<string, number>,
        );

        if (Object.keys(grouped).length === 0)
          return (
            <p className="text-center text-neutral-400 py-8">
              لا توجد مسحوبات مسجلة
            </p>
          );

        return (
          <div className="space-y-3">
            {Object.entries(grouped).map(([id, total]) => {
              const farmer = farmers.find((f) => String(f.id) === id);
              return (
                <div
                  key={id}
                  onClick={() => setSelectedEntityId(id)}
                  className="cursor-pointer p-4 bg-neutral-50 dark:bg-neutral-900/50 rounded-2xl border border-neutral-100 dark:border-neutral-800 flex justify-between items-center hover:border-blue-500/30 transition-all group"
                >
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-xl bg-blue-600/10 text-blue-600 group-hover:scale-110 transition-transform">
                      <UserIcon className="w-5 h-5" />
                    </div>
                    <p className="text-sm font-black text-neutral-800 dark:text-neutral-200">
                      {farmer?.name ||
                        withdrawals.find((w) => String(w.farmer_id) === id)
                          ?.farmerName ||
                        "مزارع غير معروف"}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <p className="text-lg font-black text-blue-600 tabular-nums">
                      {formatNumber(total)}{" "}
                      <span className="text-[10px] opacity-50 mr-1">ج.م</span>
                    </p>
                    <ChevronLeftIcon className="w-4 h-4 text-neutral-400" />
                  </div>
                </div>
              );
            })}
          </div>
        );
      }
    }

    if (selectedTreasuryType === "advances") {
      if (selectedEntityId) {
        const personAdvances = advances
          .filter((a) => String(a.person_id) === String(selectedEntityId))
          .sort(
            (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
          );
        const person = persons.find(
          (p) => String(p.id) === String(selectedEntityId),
        );
        const anyAdvanceWithName = personAdvances.find(
          (a) => a.personName && a.personName !== "غير معروف",
        );
        const fallbackName =
          person?.name || anyAdvanceWithName?.personName || "غير معروف";

        return (
          <div className="space-y-6">
            <button
              onClick={handleBack}
              className="flex items-center gap-2 text-sm text-neutral-500 hover:text-primary mb-2 transition-colors"
            >
              <ChevronRightIcon className="w-4 h-4" />
              <span>العودة للقائمة</span>
            </button>

            <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-2xl p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-purple-50 dark:bg-purple-900/30 flex items-center justify-center text-purple-600 font-black text-sm shrink-0 border border-purple-100 dark:border-purple-800/50">
                {fallbackName.charAt(0)}
              </div>
              <div className="min-w-0">
                <h3 className="font-black text-sm text-neutral-800 dark:text-neutral-100 truncate">
                  {fallbackName}
                </h3>
                <p className="text-[10px] text-neutral-500 font-bold uppercase tracking-tight">
                  سجل السلف الشخصية
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {personAdvances.length > 0 ? (
                personAdvances.map((a) => (
                  <div
                    key={a.id}
                    className="p-4 bg-neutral-50 dark:bg-neutral-900/50 rounded-2xl border border-neutral-100 dark:border-neutral-800 flex justify-between items-center"
                  >
                    <div className="flex items-center gap-4">
                      <div className="p-3 rounded-xl bg-purple-600/10 text-purple-600">
                        <UserMinusIcon className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-sm font-black text-neutral-800 dark:text-neutral-200">
                          {a.reason || "سلفة شخصية"}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <CalendarIcon className="w-3 h-3 text-neutral-400" />
                          <span className="text-[10px] font-bold text-neutral-400">
                            {a.date}
                          </span>
                        </div>
                      </div>
                    </div>
                    <p className="text-lg font-black text-purple-600 tabular-nums">
                      {formatNumber(a.amount)}{" "}
                      <span className="text-[10px] opacity-50 mr-1">ج.م</span>
                    </p>
                  </div>
                ))
              ) : (
                <div className="text-center py-12 bg-neutral-50 dark:bg-neutral-900/30 border-2 border-dashed border-neutral-200 dark:border-neutral-800 rounded-2xl">
                  <ClipboardDocumentIcon className="w-12 h-12 mx-auto text-neutral-200 dark:text-neutral-700 mb-2 opacity-50" />
                  <p className="text-neutral-400 text-xs font-bold">
                    لا توجد أي سلف مسجلة.
                  </p>
                </div>
              )}
            </div>
          </div>
        );
      } else {
        const grouped = advances.reduce(
          (acc, curr) => {
            const id = String(curr.person_id);
            if (!acc[id]) acc[id] = 0;
            acc[id] += curr.amount;
            return acc;
          },
          {} as Record<string, number>,
        );

        if (Object.keys(grouped).length === 0)
          return (
            <p className="text-center text-neutral-400 py-8">
              لا توجد سلف مسجلة
            </p>
          );

        return (
          <div className="space-y-3">
            {Object.entries(grouped).map(([id, total]) => {
              const person = persons.find((p) => String(p.id) === id);
              const anyAdvanceWithName = advances.find(
                (a) =>
                  String(a.person_id) === id &&
                  a.personName &&
                  a.personName !== "غير معروف",
              );
              const name =
                person?.name || anyAdvanceWithName?.personName || "غير معروف";
              return (
                <div
                  key={id}
                  onClick={() => setSelectedEntityId(id)}
                  className="cursor-pointer p-4 bg-neutral-50 dark:bg-neutral-900/50 rounded-2xl border border-neutral-100 dark:border-neutral-800 flex justify-between items-center hover:border-purple-500/30 transition-all group"
                >
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-xl bg-purple-600/10 text-purple-600 group-hover:scale-110 transition-transform">
                      <UserIcon className="w-5 h-5" />
                    </div>
                    <p className="text-sm font-black text-neutral-800 dark:text-neutral-200">
                      {name}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <p className="text-lg font-black text-purple-600 tabular-nums">
                      {formatNumber(total)}{" "}
                      <span className="text-[10px] opacity-50 mr-1">ج.م</span>
                    </p>
                    <ChevronLeftIcon className="w-4 h-4 text-neutral-400" />
                  </div>
                </div>
              );
            })}
          </div>
        );
      }
    }

    if (selectedTreasuryType === "expenses") {
      const cashExpenses = expenses
        .filter((e) => e.payment_method !== "credit")
        .sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
        );

      if (cashExpenses.length === 0)
        return (
          <p className="text-center text-neutral-400 py-8">
            لا توجد مصروفات نقدية
          </p>
        );

      return (
        <div className="space-y-3">
          {cashExpenses.map((e) => (
            <div
              key={e.id}
              className="p-4 bg-neutral-50 dark:bg-neutral-900/50 rounded-2xl border border-neutral-100 dark:border-neutral-800 flex justify-between items-center group hover:border-rose-500/30 transition-all"
            >
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-rose-500/10 text-rose-500">
                  <WalletIcon className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-black text-neutral-800 dark:text-neutral-200">
                    {e.description ||
                      categories.find(
                        (c) => String(c.id) === String(e.category_id),
                      )?.name ||
                      "مصروف تشغيل"}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <CalendarIcon className="w-3 h-3 text-neutral-400" />
                    <span className="text-[10px] font-bold text-neutral-400">
                      {e.date}
                    </span>
                  </div>
                </div>
              </div>
              <p className="text-lg font-black text-rose-500 tabular-nums">
                {formatNumber(e.amount)}{" "}
                <span className="text-[10px] opacity-50 mr-1">ج.م</span>
              </p>
            </div>
          ))}
        </div>
      );
    }

    if (selectedTreasuryType === "suppliers") {
      if (selectedEntityId) {
        const supplier = suppliers.find(
          (s) => String(s.id) === String(selectedEntityId),
        );
        const payments = supplierPayments
          .filter((p) => String(p.supplier_id) === String(selectedEntityId))
          .sort(
            (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
          );
        const supplierExpenses = expenses
          .filter(
            (e) =>
              String(e.supplier_id) === String(selectedEntityId) &&
              e.payment_method === "credit",
          )
          .sort(
            (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
          );

        const fallbackName =
          payments[0]?.supplierName ||
          supplierExpenses[0]?.description ||
          "مورد غير معروف";

        const totalPurchases = supplierExpenses.reduce(
          (sum, e) => sum + (Number(e.amount) || 0),
          0,
        );
        const totalPayments = payments.reduce(
          (sum, p) => sum + (Number(p.amount) || 0),
          0,
        );
        const finalBalance = totalPurchases - totalPayments;

        const allTransactions = [
          ...supplierExpenses.map((e) => ({ ...e, type: "purchase" as const })),
          ...payments.map((p) => ({ ...p, type: "payment" as const })),
        ].sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
        );

        return (
          <div className="space-y-6">
            <button
              onClick={handleBack}
              className="flex items-center gap-2 text-sm text-neutral-500 hover:text-primary mb-2 transition-colors"
            >
              <ChevronRightIcon className="w-4 h-4" />
              <span>العودة للقائمة</span>
            </button>

            {/* بطاقة ملخص كشف حساب المورد */}
            <div className="flex flex-col gap-4">
              <div className="relative bg-amber-600 rounded-3xl p-6 text-white shadow-lg shadow-amber-900/10 overflow-hidden border border-white/10">
                <div className="relative z-10">
                  <div className="flex items-center gap-1.5 opacity-80 mb-1">
                    <WalletIcon className="w-4 h-4" />
                    <span className="text-[10px] font-black uppercase tracking-widest">
                      الرصيد المتبقي للمورد
                    </span>
                  </div>
                  <div className="flex items-baseline gap-1.5">
                    <h2 className="text-3xl font-black tracking-tighter tabular-nums">
                      {formatNumber(finalBalance)}
                    </h2>
                    <span className="text-xs font-bold opacity-70">ج.م</span>
                  </div>

                  <div className="mt-4 flex gap-6 text-[11px] font-bold border-t border-white/10 pt-3">
                    <div className="flex items-center gap-1.5">
                      <span className="opacity-60">المشتريات:</span>
                      <span className="tabular-nums">
                        {formatNumber(totalPurchases)}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="opacity-60">المدفوعات:</span>
                      <span className="text-amber-100 tabular-nums">
                        {formatNumber(totalPayments)}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="absolute -bottom-6 -left-6 w-24 h-24 bg-white/5 rounded-full blur-2xl"></div>
              </div>

              <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-2xl p-4 flex flex-col justify-center">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-neutral-100 dark:bg-neutral-700 flex items-center justify-center text-amber-600 font-black text-sm shrink-0 border border-neutral-200/50 dark:border-neutral-600/50">
                    {(supplier?.name || fallbackName)?.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-black text-sm text-neutral-800 dark:text-neutral-100 truncate">
                      {supplier?.name || fallbackName}
                    </h3>
                    <p className="text-[10px] text-neutral-500 font-bold uppercase tracking-tight">
                      سجل المعاملات الآجل
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* قائمة المعاملات */}
            <div className="space-y-4">
              <h4 className="text-[11px] font-black text-neutral-400 uppercase tracking-widest px-1">
                آخر المعاملات
              </h4>
              <div className="space-y-3">
                {allTransactions.length > 0 ? (
                  allTransactions.map((tx) => (
                    <div
                      key={tx.id}
                      className="p-4 bg-white dark:bg-neutral-800/50 rounded-2xl border border-neutral-100 dark:border-neutral-700 flex justify-between items-center group hover:border-amber-500/30 transition-all"
                    >
                      <div className="flex items-center gap-4">
                        <div
                          className={`p-3 rounded-xl ${tx.type === "purchase" ? "bg-rose-500/10 text-rose-500" : "bg-emerald-500/10 text-emerald-500"}`}
                        >
                          {tx.type === "purchase" ? (
                            <CreditCardIcon className="w-5 h-5" />
                          ) : (
                            <WalletIcon className="w-5 h-5" />
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-black text-neutral-800 dark:text-neutral-200">
                            {tx.description ||
                              (tx.type === "purchase"
                                ? "فاتورة مشتريات"
                                : "دفعة نقدية")}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <CalendarIcon className="w-3 h-3 text-neutral-400" />
                            <span className="text-[10px] font-bold text-neutral-400">
                              {tx.date}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="text-left shrink-0">
                        <p
                          className={`text-sm font-black ${tx.type === "purchase" ? "text-rose-600" : "text-emerald-600"} tracking-tight tabular-nums`}
                        >
                          {tx.type === "purchase" ? "-" : "+"}
                          {formatNumber(tx.amount)}
                          <span className="text-[9px] mr-1 font-bold opacity-70">
                            ج.م
                          </span>
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-12 bg-neutral-50 dark:bg-neutral-900/30 border-2 border-dashed border-neutral-200 dark:border-neutral-800 rounded-2xl">
                    <ClipboardDocumentIcon className="w-12 h-12 mx-auto text-neutral-200 dark:text-neutral-700 mb-2 opacity-50" />
                    <p className="text-neutral-400 text-xs font-bold">
                      لا توجد أي معاملات مسجلة لهذا المورد.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      } else {
        const grouped: Record<string, number> = {};

        // Add payments
        supplierPayments.forEach((p) => {
          const id = String(p.supplier_id);
          grouped[id] = (grouped[id] || 0) + p.amount;
        });

        // Ensure suppliers with credit expenses are included
        expenses.forEach((e) => {
          if (e.supplier_id && e.payment_method === "credit") {
            const id = String(e.supplier_id);
            if (grouped[id] === undefined) {
              grouped[id] = 0;
            }
          }
        });

        if (Object.keys(grouped).length === 0)
          return (
            <p className="text-center text-neutral-400 py-8">
              لا توجد مدفوعات أو مستحقات مسجلة
            </p>
          );

        return (
          <div className="space-y-3">
            {Object.entries(grouped).map(([id, total]) => {
              const supplier = suppliers.find((s) => String(s.id) === id);
              const name =
                supplier?.name ||
                supplierPayments.find((p) => String(p.supplier_id) === id)
                  ?.supplierName ||
                "مورد غير معروف";
              return (
                <div
                  key={id}
                  onClick={() => setSelectedEntityId(id)}
                  className="cursor-pointer p-4 bg-neutral-50 dark:bg-neutral-900/50 rounded-2xl border border-neutral-100 dark:border-neutral-800 flex justify-between items-center hover:border-amber-600/30 transition-all group"
                >
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-xl bg-amber-600/10 text-amber-600 group-hover:scale-110 transition-transform">
                      <CreditCardIcon className="w-5 h-5" />
                    </div>
                    <p className="text-sm font-black text-neutral-800 dark:text-neutral-200">
                      {name}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <p className="text-lg font-black text-amber-600 tabular-nums">
                      {formatNumber(total)}{" "}
                      <span className="text-[10px] opacity-50 mr-1">ج.م</span>
                    </p>
                    <ChevronLeftIcon className="w-4 h-4 text-neutral-400" />
                  </div>
                </div>
              );
            })}
          </div>
        );
      }
    }
  };

  // --- Expense Tab Calculations ---
  const expenseTotals = useMemo(() => {
    return expenses.reduce(
      (acc, e) => {
        acc.total += e.amount;
        if (e.is_establishment) acc.establishment += e.amount;
        else acc.operating += e.amount;
        return acc;
      },
      { total: 0, establishment: 0, operating: 0 },
    );
  }, [expenses]);

  const categoryGroups = useMemo(() => {
    const groups: Record<
      string,
      { category: ExpenseCategory; total: number; count: number }
    > = {};

    expenses.forEach((exp) => {
      const catId = exp.category_id;
      const category = categories.find((c) => String(c.id) === String(catId));
      if (category) {
        if (!groups[catId]) groups[catId] = { category, total: 0, count: 0 };
        groups[catId].total += exp.amount;
        groups[catId].count += 1;
      }
    });
    return Object.values(groups).sort((a, b) => b.total - a.total);
  }, [expenses, categories]);

  const selectedCategoryExpenses = useMemo(() => {
    if (!selectedExpenseCategory) return [];
    return expenses
      .filter((e) => String(e.category_id) === String(selectedExpenseCategory))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [expenses, selectedExpenseCategory]);

  const selectedCategory = useMemo(() => {
    if (!selectedExpenseCategory) return null;
    return categories.find(
      (c) => String(c.id) === String(selectedExpenseCategory),
    );
  }, [categories, selectedExpenseCategory]);

  if (loading) {
    return (
      <div
        className="min-h-screen bg-neutral-100 dark:bg-neutral-950 text-neutral-800 dark:text-neutral-200 font-sans"
        dir="rtl"
      >
        {/* Header Skeleton */}
        <div className="bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 h-20 flex items-center px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3 animate-pulse">
            <div className="w-10 h-10 bg-neutral-200 dark:bg-neutral-800 rounded-xl"></div>
            <div className="space-y-2">
              <div className="w-32 h-4 bg-neutral-200 dark:bg-neutral-800 rounded"></div>
              <div className="w-24 h-3 bg-neutral-200 dark:bg-neutral-800 rounded"></div>
            </div>
          </div>
        </div>

        {/* Main Content Skeleton */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
          {/* Title Skeleton */}
          <div className="animate-pulse space-y-3">
            <div className="w-64 h-8 bg-neutral-200 dark:bg-neutral-800 rounded-lg"></div>
            <div className="w-48 h-4 bg-neutral-200 dark:bg-neutral-800 rounded"></div>
          </div>

          {/* Stats Grid Skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="bg-white dark:bg-neutral-900 p-6 rounded-3xl border border-neutral-200 dark:border-neutral-800 animate-pulse"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="w-12 h-12 bg-neutral-200 dark:bg-neutral-800 rounded-2xl"></div>
                  <div className="w-16 h-6 bg-neutral-200 dark:bg-neutral-800 rounded-full"></div>
                </div>
                <div className="space-y-3">
                  <div className="w-20 h-4 bg-neutral-200 dark:bg-neutral-800 rounded"></div>
                  <div className="w-32 h-8 bg-neutral-200 dark:bg-neutral-800 rounded-lg"></div>
                </div>
              </div>
            ))}
          </div>

          {/* Charts Skeleton */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-neutral-900 p-6 rounded-3xl border border-neutral-200 dark:border-neutral-800 h-80 animate-pulse">
              <div className="w-48 h-6 bg-neutral-200 dark:bg-neutral-800 rounded mb-6"></div>
              <div className="w-full h-56 bg-neutral-100 dark:bg-neutral-800/50 rounded-xl"></div>
            </div>
            <div className="bg-white dark:bg-neutral-900 p-6 rounded-3xl border border-neutral-200 dark:border-neutral-800 h-80 animate-pulse">
              <div className="w-48 h-6 bg-neutral-200 dark:bg-neutral-800 rounded mb-6"></div>
              <div className="w-full h-56 bg-neutral-100 dark:bg-neutral-800/50 rounded-xl"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !cycle || !treasuryStats) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-neutral-50 dark:bg-neutral-950 p-4 text-center">
        <div className="bg-white dark:bg-neutral-900 p-8 rounded-3xl shadow-xl max-w-md w-full border border-neutral-100 dark:border-neutral-800">
          <div className="w-16 h-16 bg-rose-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <SafeIcon className="w-8 h-8 text-rose-500" />
          </div>
          <h1 className="text-xl font-black text-neutral-800 dark:text-white mb-2">
            عفواً
          </h1>
          <p className="text-neutral-500 dark:text-neutral-400 text-sm leading-relaxed">
            {error || "التقرير غير موجود"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen bg-neutral-100 dark:bg-neutral-950 text-neutral-800 dark:text-neutral-200 font-sans relative"
      dir="rtl"
    >
      <ReportHeader
        cycle={cycle}
        assetName={assetName}
        notifications={notifications}
        isNotificationOpen={isNotificationOpen}
        setIsNotificationOpen={setIsNotificationOpen}
        isFontMenuOpen={isFontMenuOpen}
        setIsFontMenuOpen={setIsFontMenuOpen}
        fontSizeLevel={fontSizeLevel}
        increaseFontSize={increaseFontSize}
        decreaseFontSize={decreaseFontSize}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 pb-32">
        {activeTab === "overview" && (
          <div className="space-y-8 animate-enter">
            {/* Dashboard Cards Overview */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6 gap-4 items-stretch">
              <DashboardCard
                isLoading={loading}
                onClick={() => setActiveTab("invoices")}
                title="إجمالي الإيرادات"
                value={formatNumber(cycle.revenue)}
                secondaryValue={
                  isFarmerAccountEnabled
                    ? formatNumber(cycle.revenue - (cycle.farmerShare || 0))
                    : undefined
                }
                secondaryTitle={
                  isFarmerAccountEnabled ? "الايراد الصافي بعد المزارع" : undefined
                }
                icon={TrendingUpIcon}
                trend={trendData.revenue}
                sparklineData={weeklyChartData.revenue}
                color={{
                  icon: "text-accent-success",
                  glow: "glow-on-hover-success",
                  gradient:
                    "bg-gradient-to-br from-green-50/20 to-transparent dark:from-green-900/5",
                  sparkline: "#10B981",
                }}
              />

              <DashboardCard
                isLoading={loading}
                onClick={() => setActiveTab("expenses")}
                title="إجمالي المصروفات"
                value={formatNumber(cycle.expenses)}
                icon={TrendingDownIcon}
                trend={trendData.expenses}
                sparklineData={weeklyChartData.expenses}
                color={{
                  icon: "text-accent-danger",
                  glow: "glow-on-hover-danger",
                  gradient:
                    "bg-gradient-to-br from-red-50/20 to-transparent dark:from-red-900/5",
                  sparkline: "#F43F5E",
                }}
              />

              <DashboardCard
                isLoading={loading}
                title="صافي ربح المالك"
                value={formatNumber(cycle.profit)}
                icon={ChartBarIcon}
                trend={trendData.profit}
                sparklineData={weeklyChartData.profit}
                isProfitMode={cycle.profit > 0}
                color={{
                  icon: "text-accent-info",
                  glow: "glow-on-hover-info",
                  gradient:
                    "bg-gradient-to-br from-blue-50/20 to-transparent dark:from-blue-900/5",
                  sparkline: "#3B82F6",
                }}
              />

              <DashboardCard
                isLoading={loading}
                title={
                  recoveryStats.isRecovered
                    ? "عائد العروة (ROI)"
                    : "استرداد رأس المال"
                }
                value={
                  recoveryStats.isRecovered
                    ? `%${cycle.expenses > 0 ? Math.round((cycle.profit / cycle.expenses) * 100) : 0}`
                    : `${recoveryStats.progress}%`
                }
                subValue={
                  recoveryStats.isRecovered
                    ? `الربح: ${formatNumber(cycle.profit)}`
                    : `-${formatNumber(recoveryStats.remaining)}`
                }
                icon={recoveryStats.isRecovered ? Rocket : ClockIcon}
                sparklineData={weeklyChartData.recovery}
                isProfitMode={recoveryStats.isRecovered}
                color={{
                  icon: recoveryStats.isRecovered
                    ? "text-emerald-500"
                    : "text-primary",
                  glow: "glow-on-hover-success",
                  gradient:
                    "bg-gradient-to-br from-amber-50/20 to-transparent dark:from-amber-900/5",
                  sparkline: recoveryStats.isRecovered ? "#10B981" : "#F59E0B",
                }}
              />

              {isFarmerAccountEnabled && (
                <DashboardCard
                  isLoading={loading}
                  title="إجمالي حصة المزارع"
                  value={formatNumber(cycle.farmerShare || 0)}
                  icon={FarmerAccountIcon}
                  trend={trendData.farmerShare}
                  sparklineData={weeklyChartData.farmerShare}
                  color={{
                    icon: "text-accent-purple",
                    glow: "glow-on-hover-purple",
                    gradient:
                      "bg-gradient-to-br from-purple-50/20 to-transparent dark:from-purple-900/5",
                    sparkline: "#8B5CF6",
                  }}
                />
              )}

              <DashboardCard
                isLoading={loading}
                onClick={() => setActiveTab("treasury")}
                title="إجمالي السيولة (الخزنة)"
                value={formatNumber(
                  (treasuryStats?.balance || 0) + totalBankBalance,
                )}
                icon={WalletIcon}
                sparklineData={[]}
                color={{
                  icon: "text-accent-warning",
                  glow: "glow-on-hover-warning",
                  gradient:
                    "bg-gradient-to-br from-orange-50/20 to-transparent dark:from-orange-900/5",
                  sparkline: "#F97316",
                }}
              />
            </div>

            <ReportCharts
              cycle={cycle}
              expenses={expenses}
              categories={categories}
              invoices={invoices}
              invoiceStatsList={invoiceStatsList}
              harvestCurveData={harvestCurveData}
              expenseBreakdown={expenseBreakdown}
              deductionBreakdown={deductionBreakdown}
              unitLabel={unitLabel}
            />
          </div>
        )}

        {activeTab === "treasury" && (
          <div className="space-y-6 animate-enter">
            <h3 className="text-2xl font-black text-neutral-800 dark:text-white mb-4">
              تقرير الخزنة
            </h3>
            <div className="relative overflow-hidden bg-neutral-900 dark:bg-black rounded-3xl p-5 sm:p-6 text-white shadow-xl border border-white/5">
              <div className="relative z-10">
                {/* الرصيد المتاح مع توزيع الكاش والبنك */}
                <div className="mb-6 bg-white/5 backdrop-blur-md rounded-3xl border border-white/10 shadow-2xl overflow-hidden">
                  <div className="p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6">
                    {/* إجمالي السيولة */}
                    <div className="flex flex-col items-center md:items-start text-center md:text-right">
                      <div className="flex items-center gap-2 opacity-60 mb-2">
                        <WalletIcon className="w-5 h-5" />
                        <span className="text-xs font-black uppercase tracking-widest">
                          إجمالي السيولة
                        </span>
                      </div>
                      <div className="flex items-baseline gap-2">
                        <h2 className="text-4xl sm:text-5xl font-black tracking-tighter tabular-nums text-white">
                          {formatNumber(
                            treasuryStats.balance + totalBankBalance,
                          )}
                        </h2>
                        <span className="text-lg font-bold opacity-50">
                          ج.م
                        </span>
                      </div>
                    </div>

                    {/* Divider */}
                    <div className="hidden md:block w-px h-16 bg-white/10"></div>
                    <div className="block md:hidden w-full h-px bg-white/10"></div>

                    {/* توزيع السيولة */}
                    <div className="flex items-center gap-8 sm:gap-12 w-full md:w-auto justify-center">
                      {/* الكاش */}
                      <div className="flex flex-col items-center md:items-start group">
                        <div className="flex items-center gap-2 mb-1">
                          <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]"></div>
                          <span className="text-[10px] font-black opacity-60 uppercase tracking-widest">
                            كاش
                          </span>
                        </div>
                        <p className="text-2xl sm:text-3xl font-black tabular-nums text-emerald-400 tracking-tighter">
                          {formatNumber(treasuryStats.balance)}
                        </p>
                      </div>

                      {/* البنك */}
                      <div className="flex flex-col items-center md:items-start group">
                        <div className="flex items-center gap-2 mb-1">
                          <div className="w-2 h-2 rounded-full bg-indigo-400 shadow-[0_0_8px_rgba(129,140,248,0.8)]"></div>
                          <span className="text-[10px] font-black opacity-60 uppercase tracking-widest">
                            بنك
                          </span>
                        </div>
                        <p className="text-2xl sm:text-3xl font-black tabular-nums text-indigo-400 tracking-tighter">
                          {formatNumber(totalBankBalance)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* الإيرادات والمصروفات */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white/5 p-3 rounded-2xl border border-white/10">
                    <p className="text-[9px] sm:text-[10px] font-black opacity-40 uppercase tracking-wider mb-1">
                      إجمالي الإيرادات
                    </p>
                    <p className="text-lg font-bold tabular-nums text-emerald-400">
                      {formatNumber(treasuryStats.inflows.totalRevenue)}
                    </p>
                  </div>
                  <div className="bg-white/5 p-3 rounded-2xl border border-white/10">
                    <p className="text-[9px] sm:text-[10px] font-black opacity-40 uppercase tracking-wider mb-1">
                      إجمالي الخارج
                    </p>
                    <p className="text-lg font-bold tabular-nums text-rose-400">
                      {formatNumber(treasuryStats.outflows.totalDeductions)}
                    </p>
                  </div>
                </div>
              </div>
              <div className="absolute top-0 right-0 w-80 h-80 bg-primary/20 rounded-full blur-[120px] -mr-40 -mt-40"></div>
              <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/10 rounded-full blur-[100px] -ml-32 -mb-32"></div>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              <StatMiniCard
                label="مدفوعات الموردين"
                value={treasuryStats.outflows.supplierPayments.amount}
                count={treasuryStats.outflows.supplierPayments.transactionCount}
                icon={CreditCardIcon}
                colorClass="text-amber-600"
                bgColorClass="bg-white dark:bg-neutral-800"
                subLabel={
                  extraInfo.lastSupplier
                    ? `آخر مورد: ${extraInfo.lastSupplier}`
                    : "لا توجد مدفوعات"
                }
                subIcon={TruckIcon}
                onClick={() => {
                  setSelectedTreasuryType("suppliers");
                  const uniqueSupplierIds = [
                    ...new Set(
                      supplierPayments.map((p) => String(p.supplier_id)),
                    ),
                  ];
                  if (uniqueSupplierIds.length === 1) {
                    setSelectedEntityId(uniqueSupplierIds[0]);
                  }
                  setIsTreasuryModalOpen(true);
                }}
              />
              <StatMiniCard
                label="سحوبات المزارعين"
                value={treasuryStats.outflows.farmerWithdrawals.amount}
                count={
                  treasuryStats.outflows.farmerWithdrawals.transactionCount
                }
                icon={FarmerAccountIcon}
                colorClass="text-blue-600"
                bgColorClass="bg-white dark:bg-neutral-800"
                subLabel={`المزارع: ${extraInfo.responsibleFarmer}`}
                subIcon={UserIcon}
                onClick={() => {
                  setSelectedTreasuryType("farmers");
                  const uniqueFarmerIds = [
                    ...new Set(withdrawals.map((w) => String(w.farmer_id))),
                  ];
                  if (uniqueFarmerIds.length === 1) {
                    setSelectedEntityId(uniqueFarmerIds[0]);
                  }
                  setIsTreasuryModalOpen(true);
                }}
              />
              <StatMiniCard
                label="مصروفات تشغيل"
                value={treasuryStats.outflows.operatingExpenses.amount}
                count={
                  treasuryStats.outflows.operatingExpenses.transactionCount
                }
                icon={WalletIcon}
                colorClass="text-rose-500"
                bgColorClass="bg-white dark:bg-neutral-800"
                subLabel="نثريات نقدية يومية"
                onClick={() => {
                  setSelectedTreasuryType("expenses");
                  setIsTreasuryModalOpen(true);
                }}
              />
              <StatMiniCard
                label="سلفة شخصية"
                value={treasuryStats.outflows.personalAdvances.amount}
                count={treasuryStats.outflows.personalAdvances.transactionCount}
                icon={UserMinusIcon}
                colorClass="text-purple-600"
                bgColorClass="bg-white dark:bg-neutral-800"
                subLabel="سلف تخصم من العهدة"
                onClick={() => {
                  setSelectedTreasuryType("advances");
                  setIsTreasuryModalOpen(true);
                }}
              />
            </div>

            <div className="p-4 sm:p-6 bg-blue-50 dark:bg-blue-900/10 rounded-[1.5rem] sm:rounded-[2rem] border border-blue-100 dark:border-blue-900/30">
              <p className="text-[10px] sm:text-xs text-blue-700 dark:text-blue-300 font-bold leading-relaxed text-center">
                رصيد الخزنة يمثل المال الفعلي "الكاش" الموجود في عهدة هذه العروة
                حالياً. لا تُحتسب المصروفات الآجلة هنا إلا بعد سدادها نقدياً
                للمورد.
              </p>
            </div>
          </div>
        )}

        {activeTab === "invoices" && (
          <ReportInvoicesTable
            invoices={invoices}
            hydratedInvoices={hydratedInvoices}
            onSelectInvoice={(inv) => setSelectedInvoice(inv)}
          />
        )}

        {activeTab === "expenses" && (
          <ReportExpensesTable
            expenses={expenses}
            categories={categories}
            suppliers={suppliers}
            expenseTotals={expenseTotals}
            categoryGroups={categoryGroups}
            selectedExpenseCategory={selectedExpenseCategory}
            setSelectedExpenseCategory={setSelectedExpenseCategory}
            selectedCategory={selectedCategory}
            selectedCategoryExpenses={selectedCategoryExpenses}
          />
        )}

        {/* Footer */}
        <div className="pt-10 pb-6 border-t border-neutral-200 dark:border-neutral-800 text-center opacity-40">
          <p className="text-xs font-black uppercase tracking-[0.2em]">
            تم توليد هذا التقرير بواسطة نظام المحاسب الزراعي
          </p>
        </div>
      </main>

      {/* Invoice Details Modal */}
      <InvoiceDetailsModal
        invoice={selectedInvoice}
        onClose={() => setSelectedInvoice(null)}
        isSharedView={true}
      />

      <Modal
        isOpen={isTreasuryModalOpen}
        onClose={() => {
          setIsTreasuryModalOpen(false);
          setSelectedEntityId(null);
        }}
        title={getTreasuryModalTitle()}
        size="md"
      >
        <div
          className="max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar"
          dir="rtl"
        >
          {renderTreasuryContent()}
        </div>
      </Modal>
      <style>{`
                @keyframes pulse-glow {
                    0%, 100% { background-color: #ffffff; box-shadow: 0 0 5px rgba(16, 185, 129, 0.2); color: #059669; }
                    50% { background-color: #10b981; box-shadow: 0 0 25px rgba(16, 185, 129, 0.8); color: #ffffff; }
                }
            `}</style>
    </div>
  );
};

export default SharedReport;
