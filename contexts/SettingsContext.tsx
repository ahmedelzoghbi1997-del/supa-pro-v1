import React, {
  createContext,
  useContext,
  ReactNode,
  useState,
  useEffect,
} from "react";
import type { AppSettings, Terminology, Language } from "../types";
import { supabase } from "../lib/supabase";
import { applyLanguage, t as translate, getTerminology } from "../lib/i18n";

export { getTerminology };

export const terminology: Record<
  Terminology,
  { singular: string; plural: string; new: string }
> = {
  cycle: { singular: "العروة", plural: "العروات", new: "عروة" },
  season: { singular: "الموسم", plural: "المواسم", new: "موسم" },
};

const defaultSettings: AppSettings = {
  language: "en",
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
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
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

      if (!userId || userId.includes("undefined")) {
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

      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("app_settings")
          .eq("id", userId)
          .single();

        if (error) throw error;

        if (data?.app_settings) {
          const parsed = data.app_settings as any;
          const finalSettings = { ...defaultSettings, ...parsed };
          if (parsed.systems) {
            finalSettings.systems = { ...defaultSettings.systems, ...parsed.systems };
          }
          if (!isCancelled) {
            setSettings(finalSettings as AppSettings);
            localStorage.setItem(storageKey, JSON.stringify(finalSettings));
          }
        } else {
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
              console.error(e);
            }
          }
          if (!isCancelled) {
            setSettings(initial);
            localStorage.setItem(storageKey, JSON.stringify(initial));
          }
          // حفظها في قاعدة البيانات لأول مرة
          await supabase
            .from("profiles")
            .update({ app_settings: initial })
            .eq("id", userId);
        }
      } catch (e) {
        console.error("Error loading settings from Supabase:", e);
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
            console.error(err);
          }
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

    // حفظ نسخة محلية خاصة بالمستخدم
    const storageKey = getStorageKey(userId);
    localStorage.setItem(storageKey, JSON.stringify(settings));
  }, [settings, userId]);

  // 3. تطبيق اللغة واتجاه الصفحة وتفعيل التعريب الشامل
  const activeLanguage: Language = settings.language || 'en';
  useEffect(() => {
    applyLanguage(activeLanguage);
    document.title = translate('appName', activeLanguage);
  }, [activeLanguage]);

  const setLanguage = (lang: Language) => {
    updateSettings({ language: lang });
  };

  const tHelper = (key: string) => {
    return translate(key, activeLanguage);
  };

  const updateSettings = async (newSettings: Partial<AppSettings>) => {
    const updated = { ...settings, ...newSettings };
    if (newSettings.systems) {
      updated.systems = { ...settings.systems, ...newSettings.systems };
    }

    setSettings(updated);
    const storageKey = getStorageKey(userId);
    localStorage.setItem(storageKey, JSON.stringify(updated));

    // حفظ في Supabase إذا كان المستخدم مسجلاً
    if (userId && !userId.includes("undefined")) {
      try {
        await supabase
          .from("profiles")
          .update({ app_settings: updated })
          .eq("id", userId);
      } catch (e) {
        console.error("Error updating settings in Supabase:", e);
      }
    }
  };

  return (
    <SettingsContext.Provider
      value={{
        settings,
        language: activeLanguage,
        setLanguage,
        t: tHelper,
        updateSettings,
        loadingSettings,
      }}
    >
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
