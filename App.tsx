import { Session } from "@supabase/supabase-js";
import React, { useState, useEffect, useCallback } from "react";
import Sidebar from "./components/Sidebar";
import BottomNav from "./components/BottomNav";
import MainContent from "./components/MainContent";
import type { NavItemId, Profile } from "./types";
import { ToastProvider } from "./hooks/useToast";
import { DataProvider } from "./contexts/DataContext";
import { UIProvider, useUI } from "./contexts/UIContext";
import { SettingsProvider, useSettings } from "./contexts/SettingsContext";
import { supabase } from "./lib/supabase";
import AuthPage from "./components/auth/AuthPage";
import WelcomePage from "./components/auth/WelcomePage";
import { Onboarding } from "./components/Onboarding";
import SplashScreen from "./components/shared/SplashScreen";
import SharedReport from "./components/shared/SharedReport";
import SharedReportErrorBoundary from "./src/components/shared/SharedReportErrorBoundary";
import AppUpdateModal from "./components/shared/AppUpdateModal";

import { triggerLightHaptic } from "./lib/haptics";
import { StatusBar, Style } from "@capacitor/status-bar";

import { Capacitor } from "@capacitor/core";
import { App as CapApp } from "@capacitor/app";
import { useToast } from "./hooks/useToast";
import { registerForPushNotifications } from "./lib/notifications";
import { Preferences } from "@capacitor/preferences";
import { getSavedAccounts } from "./lib/accountManager";

import { useData } from "./contexts/DataContext";
import { RealtimeNotificationProvider } from "./contexts/RealtimeNotificationContext";

const NotificationListener: React.FC = () => {
  const { setActiveItem } = useData();
  const { setHighlightedItemId, setStatementAction } = useUI();

  useEffect(() => {
    const handleNotificationInteraction = (e: CustomEvent) => {
      const { route, itemId, parentId } = e.detail;
      if (route) {
        // Ensure valid route by asserting/casting if necessary
        setActiveItem(route as NavItemId);
      }
      if (parentId && setStatementAction) {
        setStatementAction({ route, parentId });
      }
      if (itemId) {
        // Clear any existing highlight first
        setHighlightedItemId(null);

        // Small delay to ensure the DOM has switched to the new route before highlighting
        setTimeout(() => {
          setHighlightedItemId(itemId);

          // Automatically scroll the item into the center of the screen, give statement modals a slightly longer delay to open
          setTimeout(
            () => {
              const target = document.querySelector(".animate-highlight");
              if (target) {
                target.scrollIntoView({ behavior: "smooth", block: "center" });
              }
            },
            parentId ? 500 : 100,
          );
        }, 300);

        // Clear the highlight after 8.5 seconds
        setTimeout(() => setHighlightedItemId(null), 8500);
      }
    };

    window.addEventListener(
      "notificationInteraction",
      handleNotificationInteraction as EventListener,
    );
    return () =>
      window.removeEventListener(
        "notificationInteraction",
        handleNotificationInteraction as EventListener,
      );
  }, [setActiveItem, setHighlightedItemId, setStatementAction]);

  return null;
};


class GlobalErrorBoundary extends React.Component<{children: React.ReactNode}, {hasError: boolean}> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error: any, info: any) {
    console.error("Global Error Caught:", error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-neutral-50 dark:bg-neutral-950 p-6">
          <div className="bg-white dark:bg-neutral-900 rounded-3xl p-8 shadow-2xl flex flex-col items-center max-w-sm text-center border border-neutral-100 dark:border-neutral-800">
            <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mb-6">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-neutral-800 dark:text-neutral-100 mb-2">عذراً، حدث خطأ غير متوقع</h2>
            <p className="text-sm text-neutral-500 mb-8">لقد واجه التطبيق مشكلة غير متوقعة. يرجى إعادة التحميل للمحاولة مرة أخرى.</p>
            <button 
              onClick={() => window.location.reload()}
              className="w-full bg-primary text-white font-bold py-4 rounded-2xl active:scale-95 transition-transform"
            >
              إعادة تحميل التطبيق
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const AppContent: React.FC<{ profile: Profile }> = ({ profile }) => {
  const [activeItem, setActiveItem] = useState<NavItemId>("dashboard");
  const [isSidebarOpen, setSidebarOpen] = useState(false);

  const activeItemRef = React.useRef(activeItem);
  const { settings, loadingSettings } = useSettings();
  const { showToast } = useToast();
  const lastBackPressTime = React.useRef<number>(0);

  useEffect(() => {
    activeItemRef.current = activeItem;
  }, [activeItem]);

  useEffect(() => {
    // Initialize history state on first mount if it's empty to ensure we have a valid base state
    if (!window.history.state || !window.history.state.page) {
      window.history.replaceState(
        { ...window.history.state, page: "dashboard" },
        "",
        window.location.href,
      );
    }

    const handlePopState = (event: PopStateEvent) => {
      if (event.state?.page) {
        setActiveItem(event.state.page);
      } else {
        setActiveItem("dashboard");
      }
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const handleNavigation = useCallback(
    (newItemId: NavItemId) => {
      if (newItemId !== activeItem) {
        window.history.pushState({ page: newItemId }, "", window.location.href);
        setActiveItem(newItemId);
      }
    },
    [activeItem],
  );

  useEffect(() => {
    const root = window.document.documentElement;
    if (settings?.accentColor)
      root.setAttribute("data-theme-color", settings.accentColor);
    if (settings?.uiScale) root.setAttribute("data-ui-scale", settings.uiScale);

    
    // Status bar logic
    if (Capacitor.isNativePlatform()) {
      const isDark = document.documentElement.classList.contains('dark') || window.matchMedia('(prefers-color-scheme: dark)').matches;
      StatusBar.setStyle({ style: isDark ? Style.Dark : Style.Light }).catch(()=> {});
      if (settings?.accentColor) {
        StatusBar.setBackgroundColor({ color: isDark ? '#0a0a0a' : '#ffffff' }).catch(()=> {});
      }
    }

    // Capacitor Hardware Back Button Handling
    let backListener: any;
    const initBackListener = async () => {
      if (Capacitor.isNativePlatform()) {
        backListener = await CapApp.addListener(
          "backButton",
         
          ({ canGoBack }) => {
            // Check for open modals
            const openModal = document.querySelector('[role="dialog"], .fixed.z-50');
            if (openModal) {
              const closeBtn = openModal.querySelector('button[aria-label="Close"], button[aria-label="إغلاق"], .close-btn') || openModal.querySelector('button');
              if (closeBtn) {
                 closeBtn.click();
              } else {
                 window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
              }
              return;
            }

            if (canGoBack) {

              window.history.back();
            } else {
              if (activeItemRef.current === "dashboard") {
                const now = Date.now();
                if (now - lastBackPressTime.current < 2000) {
                  CapApp.exitApp();
                } else {
                  lastBackPressTime.current = now;
                  showToast("اضغط مرة أخرى للخروج من التطبيق", "info");
                }
              } else {
                handleNavigation("dashboard");
              }
            }
          },
        );
      }
    };

    initBackListener();

    // Request Notification Permission and register for push (Android/iOS only)
    const initNotifications = async () => {
      await registerForPushNotifications(profile.id);
    };

    // Initialize immediately to ensure tap listeners catch cached intents, removing the 2s delay
    initNotifications();

    // Session Expiry Listeners (Double Guarantee)
    const handleInactive = () => {
      // Intentionally left empty as we don't clear sessions anymore
    };

    const handleActive = () => {
      // Trigger a silent sync to catch up on any missed websocket events while suspended
      window.dispatchEvent(new CustomEvent("app_resumed"));
    };

    let appStateListener: any;
    if (Capacitor.isNativePlatform()) {
      CapApp.addListener("appStateChange", ({ isActive }) => {
        if (!isActive) handleInactive();
        else handleActive();
      }).then((listener) => {
        appStateListener = listener;
      });
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        handleInactive();
      } else if (document.visibilityState === "visible") {
        handleActive();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      if (backListener) backListener.remove();
      if (appStateListener) appStateListener.remove();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [settings, handleNavigation, showToast]);

  if (loadingSettings) {
    return <SplashScreen statusText="جارٍ تحميل الإعدادات وتفضيلات النظام..." />;
  }

  return (
    <UIProvider>
      <DataProvider profile={profile} setActiveItem={handleNavigation}>
        <RealtimeNotificationProvider>
          <NotificationListener />
          <AppUpdateModal />
          <div className="flex h-screen font-sans bg-white dark:bg-[#0f172a] pt-[env(safe-area-inset-top)]">
            <Sidebar
              activeItem={activeItem}
              setActiveItem={handleNavigation}
              isOpen={isSidebarOpen}
              onClose={() => {
                triggerLightHaptic();
                setSidebarOpen(false);
              }}
            />
            <main className="flex-1 overflow-hidden relative pb-[calc(4rem+env(safe-area-inset-bottom))] lg:pb-0">
              <MainContent
                activeItem={activeItem}
                onOpenSidebar={() => {
                  triggerLightHaptic();
                  setSidebarOpen(true);
                }}
              />
            </main>
            <BottomNav activeItem={activeItem} setActiveItem={handleNavigation} />
          </div>
        </RealtimeNotificationProvider>
      </DataProvider>
    </UIProvider>
  );
};

const App: React.FC = () => {
  // Check for shared report route immediately
  const isSharedRoute = window.location.pathname.includes("/shared-report/");
  if (isSharedRoute) {
    return (
      <ToastProvider>
        <SettingsProvider>
          <SharedReportErrorBoundary>
            <SharedReport />
          </SharedReportErrorBoundary>
        </SettingsProvider>
      </ToastProvider>
    );
  }

  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const profileIdRef = React.useRef<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSwitching, setIsSwitching] = useState(false);
  const [isFirstLogin, setIsFirstLogin] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState<boolean>(() => {
    return !localStorage.getItem("onboarding_completed");
  });

  useEffect(() => {
    const handleSwitching = () => setIsSwitching(true);
    window.addEventListener("account_switching", handleSwitching);
    return () =>
      window.removeEventListener("account_switching", handleSwitching);
  }, []);

  const handleLogout = useCallback(async () => {
    localStorage.removeItem("virtual_auth");
    await Preferences.remove({ key: "virtual_auth" });
    await Preferences.set({ key: "was_explicitly_logged_out", value: "true" });
    await supabase.auth.signOut();
    setProfile(null);
    profileIdRef.current = null;
    setSession(null);
  }, []);

  useEffect(() => {
    const initializeAuth = async () => {
      const { value: virtualAuthString } = await Preferences.get({
        key: "virtual_auth",
      });
      if (virtualAuthString) {
        try {
          const virtualProfile = JSON.parse(virtualAuthString);
          if (!virtualProfile || !virtualProfile.id || virtualProfile.id.includes("undefined")) {
            throw new Error("Invalid virtual profile");
          }
          const normalizedProfile = {
            ...virtualProfile,
            id: virtualProfile.id.startsWith("virtual_")
              ? virtualProfile.id
              : `virtual_${virtualProfile.id}`,
            full_name: virtualProfile.full_name,
            role: virtualProfile.role || "viewer",
          } as Profile;

          const accounts = await getSavedAccounts();
          const savedAcc = accounts.find((a) => a.id === normalizedProfile.id);
          if (savedAcc && savedAcc.greenhouseName) {
            normalizedProfile.full_name = savedAcc.greenhouseName;
          }

          setProfile(normalizedProfile);
          setSession({ user: { id: normalizedProfile.id } } as any);
          setLoading(false);
          return true;
        } catch (_err) {
          await Preferences.remove({ key: "virtual_auth" });
          localStorage.removeItem("virtual_auth");
        }
      } else {
        // Check local storage as a fallback, then move it to preferences
        const fallbackStr = localStorage.getItem("virtual_auth");
        if (fallbackStr) {
          try {
            const virtualProfile = JSON.parse(fallbackStr);
            if (!virtualProfile || !virtualProfile.id || virtualProfile.id.includes("undefined")) {
              throw new Error("Invalid virtual profile");
            }
            const normalizedProfile = {
              ...virtualProfile,
              id: virtualProfile.id.startsWith("virtual_")
                ? virtualProfile.id
                : `virtual_${virtualProfile.id}`,
              full_name: virtualProfile.full_name,
              role: virtualProfile.role || "viewer",
            } as Profile;

            const accounts = await getSavedAccounts();
            const savedAcc = accounts.find(
              (a) => a.id === normalizedProfile.id,
            );
            if (savedAcc && savedAcc.greenhouseName) {
              normalizedProfile.full_name = savedAcc.greenhouseName;
            }

            await Preferences.set({ key: "virtual_auth", value: fallbackStr });

            setProfile(normalizedProfile);
            setSession({ user: { id: normalizedProfile.id } } as any);
            setLoading(false);
            return true;
          } catch (_err) {
            localStorage.removeItem("virtual_auth");
          }
        }
      }
      return false;
    };

    const executeAuthCheck = async () => {
      const isVirtual = await initializeAuth();
      if (isVirtual) {
        return; // skip supabase session logic if virtual user
      }

      // Real auth
      try {
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();
        if (error && !error.message?.toLowerCase().includes("refresh token")) {
          console.error("Session error:", error);
        }

        if (session) {
          await Preferences.remove({ key: "was_explicitly_logged_out" });
          setSession(session);
          fetchProfile(session.user.id);
          return;
        }

        // If no session, try auto-login from saved accounts
        const { value: loggedOut } = await Preferences.get({
          key: "was_explicitly_logged_out",
        });
        if (loggedOut !== "true") {
          const accounts = await getSavedAccounts();
          const { value: lastId } = await Preferences.get({
            key: "last_active_account_id",
          });

          let targetAcc = accounts.find((a) => a.id === lastId);
          if (!targetAcc && accounts.length > 0) targetAcc = accounts[0];

          if (
            targetAcc &&
            !targetAcc.isVirtual &&
            targetAcc.email &&
            targetAcc.password
          ) {
            const { data: signInData, error: signInError } =
              await supabase.auth.signInWithPassword({
                email: targetAcc.email,
                password: targetAcc.password,
              });

            if (signInData.session && !signInError) {
              await Preferences.remove({ key: "was_explicitly_logged_out" });
              setSession(signInData.session);
              fetchProfile(signInData.user.id);
              return;
            }
          } else if (
            targetAcc &&
            targetAcc.isVirtual &&
            targetAcc.username &&
            targetAcc.password
          ) {
            const { data: virtualData, error: virtualError } =
              await supabase.rpc("virtual_login", {
                p_username: targetAcc.username,
                p_password: targetAcc.password,
              });
            const vMember = Array.isArray(virtualData) ? virtualData[0] : virtualData;
            if (vMember && vMember.id && !virtualError) {
              await Preferences.remove({ key: "was_explicitly_logged_out" });
              const virtualUser = {
                id: `virtual_${vMember.id}`,
                full_name: vMember.full_name,
                role: vMember.role,
                parent_id: vMember.owner_id,
                username: vMember.username,
              };
              await Preferences.set({
                key: "virtual_auth",
                value: JSON.stringify(virtualUser),
              });
              localStorage.setItem("virtual_auth", JSON.stringify(virtualUser));
              window.location.reload();
              return;
            }
          }
        }

        setSession(null);
        setLoading(false);
      } catch (err: any) {
        if (
          err &&
          err.message &&
          err.message.toLowerCase().includes("refresh token")
        ) {
          console.warn(
            "Session refresh token not found - user must log in again.",
          );
        } else {
          console.error("Failed to get session:", err);
        }
        setLoading(false);
      }
    };

    executeAuthCheck();
  }, []); // Run only once on mount

  useEffect(() => {
    const setupUserMonitor = (usrProfile: Profile | null) => {
      let channel: any = null;
      if (usrProfile?.id) {
        const currentId = usrProfile.id;
        const isVirtual = currentId.startsWith("virtual_");
        const targetTable = isVirtual ? "virtual_members" : "profiles";
        const rawId = isVirtual ? currentId.replace("virtual_", "") : currentId;

        channel = supabase
          .channel("user-deletion-monitor")
          .on(
            "postgres_changes",
            {
              event: "DELETE",
              schema: "public",
              table: targetTable,
            },
            (payload) => {
              const deletedId = payload.old?.id;
              if (deletedId === rawId) {
                handleLogout();
                window.location.reload();
              }
            },
          )
          .subscribe();
      }
      return channel;
    };

    const monitorChannel = setupUserMonitor(profile);

    return () => {
      if (monitorChannel) supabase.removeChannel(monitorChannel);
    };
  }, [handleLogout, profile?.id]);

  useEffect(() => {
    // مراقبة حالة تسجيل الدخول
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      const { value: virtualAuthString } = await Preferences.get({
        key: "virtual_auth",
      });
      if (virtualAuthString) {
        return; // ignore supabase auth changes if virtual
      }
      if (event === "TOKEN_REFRESHED") {
        setSession(session);
        return;
      }
      setSession(session);
      if (session) {
        fetchProfile(session.user.id);
      } else {
        setProfile(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId: string) => {
    try {
      if (profileIdRef.current !== userId) {
        setLoading(true); // التأكد من تفعيل حالة التحميل للمستخدم الجديد فقط
      }
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (error && error.code !== "PGRST116") throw error;

      if (!data) {
        // إنشاء بروفايل إذا كان المستخدم جديداً تماماً
        const { data: newProfile, error: createError } = await supabase
          .from("profiles")
          .insert([
            {
              id: userId,
              full_name: "مستخدم جديد",
              status: "active",
              role: "owner",
            },
          ])
          .select()
          .single();
        if (createError) throw createError;
        setProfile(newProfile);
        profileIdRef.current = userId;
        setIsFirstLogin(true);
      } else {
        const accounts = await getSavedAccounts();
        const savedAcc = accounts.find((a) => a.id === data.id);
        if (savedAcc && savedAcc.greenhouseName) {
          data.full_name = savedAcc.greenhouseName;
        }

        setProfile(data);
        profileIdRef.current = userId;
      }
    } catch (e) {
      console.error("Profile Fetch Error:", e);
      setProfile(null); // التأكد من تصفير البروفايل في حال الخطأ
      profileIdRef.current = null;
    } finally {
      setLoading(false);
    }
  };

  if (loading || isSwitching) {
    return <SplashScreen isSwitching={isSwitching} />;
  }

  if (showOnboarding) {
    return <Onboarding onComplete={() => setShowOnboarding(false)} />;
  }

  if (!session) return <AuthPage />;
  if (isFirstLogin && profile)
    return (
      <WelcomePage
        profile={profile}
        onContinue={() => setIsFirstLogin(false)}
      />
    );
  if (!profile) return <AuthPage />;

  return (
    <ToastProvider>
      <SettingsProvider
        userId={profile.parent_id || (profile as any).owner_id || profile.id}
      >
        <GlobalErrorBoundary><AppContent profile={profile} /></GlobalErrorBoundary>
      </SettingsProvider>
    </ToastProvider>
  );
};

export default App;
