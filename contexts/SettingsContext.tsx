import React, {
  createContext,
  useContext,
  ReactNode,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import type { AppSettings, Terminology } from "../types";
import { supabase, isSupabaseConfigured } from "../lib/supabase";

export const terminology: Record<
  Terminology,
  { singular: string; plural: string; new: string }
> = {
  cycle: { singular: "العروة", plural: "العروات", new: "عروة" },
  season: { singular: "الموسم", plural: "المواسم", new: "موسم" },
};

const defaultSettings: AppSettings = {
  systems: {
    treasury: true,
    advances: true,
    farmer_account: true,
    suppliers: true,
    labor: false,
    partners_wallet: true,
  },
  welcome_message: "مرحباً بك في نظام المحاسب الزراعي المحلي.",
  support_whatsapp: "201061136177",
  subscription_page_message: "التطبيق يعمل الآن بنظام التخزين السحابي الآمن.",
  primaryTerm: "cycle",
  theme: "light",
  accentColor: "emerald",
  uiScale: "md",
  markets: ["العبور", "6 أكتوبر", "سوق الجملة"],
  discountType: "custom",
  deductionItems: ["نقل", "وهبة", "إكرامية"],
  laborActivities: [
    "جمع وحصاد",
    "رش ووقاية",
    "تسميد وري",
    "تقليم وتربيط",
    "عزيق ونظافة وحشائش",
    "تعبئة وتغليف",
    "تحميل وتنزيل",
    "صيانة وشبك",
    "تجهيز شتلات وزراعة",
  ],
  isolateLaborAccount: true,
  greenhouses: [
    { id: "mine", name: "الصوبة الخاصة بي", type: "mine", is_default: true },
    { id: "father", name: "صوبة أبي وأخي", type: "external" },
  ],
};

interface SettingsContextType {
  settings: AppSettings;
  updateSettings: (newSettings: Partial<AppSettings>) => void;
  loadingSettings: boolean;
}

const SettingsContext = createContext<SettingsContextType | undefined>(
  undefined,
);

export const SettingsProvider: React.FC<{
  children: ReactNode;
  userId?: string;
}> = ({ children, userId }) => {
  const getStorageKey = (uid?: string) => uid ? `local-app-settings_${uid}` : "local-app-settings_anon";

  const [settings, setSettings] = useState<AppSettings>(() => {
    const key = getStorageKey(userId);
    const saved = localStorage.getItem(key);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const merged = { ...defaultSettings, ...parsed };
        if (parsed.systems) {
          merged.systems = { ...defaultSettings.systems, ...parsed.systems };
        }
        return merged;
      } catch (e) {
        console.error("Error parsing initial local settings:", e);
      }
    }
    return defaultSettings;
  });
  const [loadingSettings, setLoadingSettings] = useState(true);

  // 1. تحميل الإعدادات عند تغير المستخدم
  useEffect(() => {
    let isCancelled = false;

    const loadSettings = async () => {
      const storageKey = getStorageKey(userId);
      setLoadingSettings(true);

      if (!userId || userId.includes("undefined") || !isSupabaseConfigured) {
        const saved = localStorage.getItem(storageKey);
        if (saved) {
          try {
            const parsed = JSON.parse(saved);
            const merged = { ...defaultSettings, ...parsed };
            if (parsed.systems) {
              merged.systems = {
                ...defaultSettings.systems,
                ...parsed.systems,
              };
            }
            if (!isCancelled) setSettings(merged);
          } catch (e) {
            console.error("Error parsing local settings:", e);
          }
        } else {
          if (!isCancelled) setSettings(defaultSettings);
        }
        if (!isCancelled) setLoadingSettings(false);
        return;
      }

      let remoteSettings: any = null;
      let loadError: any = null;

      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("app_settings")
          .eq("id", userId)
          .single();

        if (error) {
          loadError = error;
        } else if (data?.app_settings) {
          remoteSettings = data.app_settings;
        }
      } catch (err: any) {
        loadError = err;
      }

      // If direct Supabase fetch failed (network / CORS / iframe sandbox restriction), try the server proxy
      if (!remoteSettings && loadError) {
        try {
          const res = await fetch(`/api/settings/${encodeURIComponent(userId)}`);
          if (res.ok) {
            const data = await res.json();
            if (data) {
              remoteSettings = data;
              loadError = null;
            }
          }
        } catch (_proxyErr) {
          // Server proxy not available or offline
        }
      }

      try {
        if (remoteSettings) {
          const parsed = remoteSettings as any;
          const finalSettings = { ...defaultSettings, ...parsed };
          if (parsed.systems) {
            finalSettings.systems = { ...defaultSettings.systems, ...parsed.systems };
          }
          if (!isCancelled) {
            setSettings(finalSettings as AppSettings);
            localStorage.setItem(storageKey, JSON.stringify(finalSettings));
          }
        } else if (!loadError) {
          // إذا لم تكن هناك إعدادات في قاعدة البيانات، نستخدم التخزين المحلي لهذا الحساب أو الافتراضي
          const saved = localStorage.getItem(storageKey);
          let initial = defaultSettings;
          if (saved) {
            try {
              const parsed = JSON.parse(saved);
              initial = { ...defaultSettings, ...parsed };
              if (parsed.systems) {
                initial.systems = {
                  ...defaultSettings.systems,
                  ...parsed.systems,
                };
              }
            } catch (e) {
              console.warn("Could not parse local settings:", e);
            }
          }
          if (!isCancelled) {
            setSettings(initial);
            localStorage.setItem(storageKey, JSON.stringify(initial));
          }
          // حفظها في قاعدة البيانات لأول مرة
          if (isSupabaseConfigured) {
            try {
              await supabase
                .from("profiles")
                .update({ app_settings: initial })
                .eq("id", userId);
            } catch {}
          }
        } else {
          // There was a network or server error loading remote settings; fallback to local storage
          throw loadError;
        }
      } catch (e: any) {
        console.warn("Notice: Operating in local/offline settings mode (cloud unreachable):", e?.message || e);
        // Fallback to local storage for this specific user
        const saved = localStorage.getItem(storageKey);
        if (saved && !isCancelled) {
          try {
            const parsed = JSON.parse(saved);
            const merged = { ...defaultSettings, ...parsed };
            if (parsed.systems) {
              merged.systems = { ...defaultSettings.systems, ...parsed.systems };
            }
            setSettings(merged);
          } catch (err) {
            console.warn("Could not parse local settings fallback:", err);
          }
        } else if (!isCancelled) {
          setSettings(defaultSettings);
        }
      } finally {
        if (!isCancelled) setLoadingSettings(false);
      }
    };

    loadSettings();

    return () => {
      isCancelled = true;
    };
  }, [userId]);

  // 2. تطبيق الثيم والقياس عند تغير الإعدادات
  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove("light", "dark");
    const activeTheme =
      settings.theme === "system"
        ? window.matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light"
        : settings.theme;
    root.classList.add(activeTheme);
    root.style.colorScheme = activeTheme;

    // تطبيق اللون المخصص وحجم الواجهة
    const accent = settings.accentColor || "emerald";
    root.setAttribute("data-theme-color", accent);

    if (settings.uiScale) {
      root.setAttribute("data-ui-scale", settings.uiScale);
    }

    // تحديث ديناميكي لوسوم meta theme-color لتتناسق مع شريط المتصفح والأجهزة المحمولة
    const colorHexMap: Record<string, { 500: string; 600: string }> = {
      emerald: { 500: "#10B981", 600: "#064e3b" },
      blue: { 500: "#3B82F6", 600: "#1e3a8a" },
      violet: { 500: "#8B5CF6", 600: "#4c1d95" },
      amber: { 500: "#F59E0B", 600: "#78350f" },
      rose: { 500: "#F43F5E", 600: "#881337" },
    };

    const newThemeColor500 = colorHexMap[accent]?.['500'] || "#10B981";
    const newThemeColor600 = colorHexMap[accent]?.['600'] || "#064e3b";

    document.querySelector('meta[name="theme-color"]:not([media])')?.setAttribute('content', newThemeColor500);
    document.querySelector('meta[name="theme-color"][media="(prefers-color-scheme: light)"]')?.setAttribute('content', newThemeColor500);
    document.querySelector('meta[name="theme-color"][media="(prefers-color-scheme: dark)"]')?.setAttribute('content', newThemeColor600);

    // حفظ نسخة محلية خاصة بالمستخدم
    const storageKey = getStorageKey(userId);
    localStorage.setItem(storageKey, JSON.stringify(settings));
  }, [settings, userId]);

  const updateSettings = useCallback(async (newSettings: Partial<AppSettings>) => {
    const updated = { ...settings, ...newSettings };
    if (newSettings.systems) {
      updated.systems = { ...settings.systems, ...newSettings.systems };
    }

    setSettings(updated);
    const storageKey = getStorageKey(userId);
    localStorage.setItem(storageKey, JSON.stringify(updated));

    // حفظ في Supabase إذا كان المستخدم مسجلاً وكان Supabase مهيأ
    if (isSupabaseConfigured && userId && !userId.includes("undefined")) {
      try {
        const { error } = await supabase
          .from("profiles")
          .update({ app_settings: updated })
          .eq("id", userId);
        if (error) throw error;
      } catch (e: any) {
        // Fallback to server-side proxy
        try {
          await fetch(`/api/settings/${encodeURIComponent(userId)}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ settings: updated }),
          });
        } catch (_proxyErr) {
          console.warn("Notice: Saved settings locally (cloud sync pending/offline):", e?.message || e);
        }
      }
    }
  }, [settings, userId]);

  const value = useMemo(
    () => ({ settings, updateSettings, loadingSettings }),
    [settings, updateSettings, loadingSettings]
  );

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context)
    throw new Error("useSettings must be used within SettingsProvider");
  return context;
};
