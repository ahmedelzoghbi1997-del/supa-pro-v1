import { Session } from "@supabase/supabase-js";
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { AnimatePresence } from "motion/react";
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
import { SplashTransitionProvider } from "./contexts/SplashTransitionContext";
import SharedReportErrorBoundary from "./src/components/shared/SharedReportErrorBoundary";
import PageSkeleton from "./components/shared/PageSkeleton";
import AppUpdateModal from "./components/shared/AppUpdateModal";
import OfflineBanner from "./components/shared/OfflineBanner";

const SharedReport = React.lazy(() => import("./components/shared/SharedReport"));

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
import { OpenModalsProvider, useOpenModals } from "./contexts/OpenModalsContext";

async function parseVirtualProfile(str: string): Promise<Profile | null> {
  try {
    const virtualProfile = JSON.parse(str);
    if (!virtualProfile || !virtualProfile.id || String(virtualProfile.id).includes("undefined")) {
      return null;
    }
    const normalizedProfile = {
      ...virtualProfile,
      id: String(virtualProfile.id).startsWith("virtual_")
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

    return normalizedProfile;
  } catch {
    return null;
  }
}

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
  const [exitCountdown, setExitCountdown] = useState<number | null>(null);
  const exitTimerRef = React.useRef<any>(null);

  const activeItemRef = React.useRef(activeItem);
  const { settings } = useSettings();
  const { showToast } = useToast();
  const { isAnyModalOpen } = useOpenModals();
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
      if (isAnyModalOpen()) {
        return;
      }
      if (event.state?.page) {
        setActiveItem(event.state.page);
      } else {
        setActiveItem("dashboard");
      }
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [isAnyModalOpen]);

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
            // If any modal is currently registered and open, let the modal close handler handle it
            if (isAnyModalOpen()) {
              return;
            }

            if (canGoBack) {
              window.history.back();
            } else {
              if (activeItemRef.current === "dashboard") {
                const now = Date.now();
                if (now - lastBackPressTime.current < 2000) {
                  if (exitTimerRef.current) clearInterval(exitTimerRef.current);
                  CapApp.exitApp();
                } else {
                  lastBackPressTime.current = now;
                  if (exitTimerRef.current) clearInterval(exitTimerRef.current);
                  setExitCountdown(2);
                  let remaining = 2;
                  exitTimerRef.current = setInterval(() => {
                    remaining -= 1;
                    if (remaining <= 0) {
                      clearInterval(exitTimerRef.current);
                      setExitCountdown(null);
                    } else {
                      setExitCountdown(remaining);
                    }
                  }, 1000);
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
      if (exitTimerRef.current) clearInterval(exitTimerRef.current);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [settings, handleNavigation, showToast]);

  return (
    <UIProvider>
      <DataProvider profile={profile} setActiveItem={handleNavigation}>
        <RealtimeNotificationProvider>
          <NotificationListener />
          <AppUpdateModal />
          {exitCountdown !== null && (
            <div className="fixed bottom-20 sm:bottom-8 inset-x-0 z-[300] flex justify-center items-center px-4 pointer-events-none animate-enter">
              <div className="bg-neutral-900/95 dark:bg-neutral-800/95 backdrop-blur-md text-white px-4 py-2.5 rounded-full shadow-2xl border border-neutral-700/60 flex items-center gap-3 text-xs font-semibold">
                <span>اضغط مرة أخرى للخروج من التطبيق</span>
                <span className="w-5 h-5 rounded-full bg-emerald-500 text-white font-black text-[11px] flex items-center justify-center animate-pulse">
                  {exitCountdown}
                </span>
              </div>
            </div>
          )}
          <div className="flex flex-col h-screen font-sans bg-white dark:bg-[#0f172a] pt-[env(safe-area-inset-top)]">
            <OfflineBanner />
            <div className="flex flex-1 overflow-hidden relative">
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
          </div>
        </RealtimeNotificationProvider>
      </DataProvider>
    </UIProvider>
  );
};

const App: React.FC = () => {
  const isSharedRoute = window.location.pathname.includes("/shared-report/");

  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const profileIdRef = React.useRef<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSwitching, setIsSwitching] = useState(false);
  const [isFirstLogin, setIsFirstLogin] = useState(false);
  const [showSplash, setShowSplash] = useState(true);
  const [isSplashExiting, setIsSplashExiting] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(true);
  const [hasTransitionCompleted, setHasTransitionCompleted] = useState(false);
  const appMountedAt = React.useRef(Date.now());
  const [showOnboarding, setShowOnboarding] = useState<boolean>(() => {
    return !localStorage.getItem("onboarding_completed");
  });

  useEffect(() => {
    if (!loading && !isSwitching) {
      const elapsed = Date.now() - appMountedAt.current;
      const minSplashTime = 1200;
      const remaining = Math.max(0, minSplashTime - elapsed);
      const timer = setTimeout(() => {
        // If user is ready to see the dashboard, trigger the flight transition
        if (session && profile && !isFirstLogin && !showOnboarding) {
          setIsSplashExiting(true);
        } else {
          // If onboarding or auth page, fade out normally
          setIsTransitioning(false);
          setShowSplash(false);
        }
      }, remaining);
      return () => clearTimeout(timer);
    } else if (isSwitching) {
      setShowSplash(true);
      setIsSplashExiting(false);
      setIsTransitioning(true);
      setHasTransitionCompleted(false);
    }
  }, [loading, isSwitching, session, profile, isFirstLogin, showOnboarding]);

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
        const normalizedProfile = await parseVirtualProfile(virtualAuthString);
        if (normalizedProfile) {
          setProfile(normalizedProfile);
          setSession({ user: { id: normalizedProfile.id } } as any);
          await Preferences.set({
            key: `virtual_auth_${normalizedProfile.id}`,
            value: virtualAuthString,
          });
          setLoading(false);
          return true;
        } else {
          await Preferences.remove({ key: "virtual_auth" });
          localStorage.removeItem("virtual_auth");
        }
      } else {
        // Check local storage as a fallback, then move it to preferences
        const fallbackStr = localStorage.getItem("virtual_auth");
        if (fallbackStr) {
          const normalizedProfile = await parseVirtualProfile(fallbackStr);
          if (normalizedProfile) {
            await Preferences.set({ key: "virtual_auth", value: fallbackStr });
            setProfile(normalizedProfile);
            setSession({ user: { id: normalizedProfile.id } } as any);
            setLoading(false);
            return true;
          } else {
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
          data: { session: initialSession },
          error: sessionError,
        } = await supabase.auth.getSession();
        let session = initialSession;
        if (sessionError && !sessionError.message?.toLowerCase().includes("refresh token")) {
          console.error("Session error:", sessionError);
        }

        // Check if there is a target active account from account switcher or previous session
        const { value: lastActiveId } = await Preferences.get({ key: 'last_active_account_id' });
        const targetId = lastActiveId || localStorage.getItem('last_active_account_id');

        if (targetId && !targetId.startsWith('virtual_') && session?.user?.id !== targetId) {
          const accounts = await getSavedAccounts();
          const targetAcc = accounts.find((a) => a.id === targetId);
          if (targetAcc?.refreshToken) {
            try {
              const { data: setRes, error: setErr } = await supabase.auth.setSession({
                access_token: targetAcc.accessToken || '',
                refresh_token: targetAcc.refreshToken,
              });
              if (!setErr && setRes?.session) {
                session = setRes.session;
              }
            } catch (e) {
              console.warn("Could not restore target session via refresh token:", e);
            }
          }
        }

        if (!session) {
          try {
            const { data: refreshRes, error: refreshErr } = await supabase.auth.refreshSession();
            if (!refreshErr && refreshRes?.session) {
              session = refreshRes.session;
            }
          } catch (_e) {
            // No refresh token available or expired
          }
        }

        if (session) {
          await Preferences.remove({ key: "was_explicitly_logged_out" });
          localStorage.removeItem("was_explicitly_logged_out");
          setSession(session);
          fetchProfile(session.user.id);
          return;
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

  const handleSplashTransitionComplete = useCallback(() => {
    setHasTransitionCompleted(true);
    setIsTransitioning(false);
    setShowSplash(false);
  }, []);

  const splashTransitionValue = useMemo(() => ({
    isTransitioning,
    hasTransitionCompleted,
    completeTransition: handleSplashTransitionComplete,
  }), [isTransitioning, hasTransitionCompleted, handleSplashTransitionComplete]);

  if (isSharedRoute) {
    return (
      <ToastProvider>
        <SettingsProvider>
          <SharedReportErrorBoundary>
            <React.Suspense fallback={<PageSkeleton />}>
              <SharedReport />
            </React.Suspense>
          </SharedReportErrorBoundary>
        </SettingsProvider>
      </ToastProvider>
    );
  }

  return (
    <>
      <AnimatePresence>
        {showSplash && (
          <SplashScreen
            key="app-root-splash"
            isSwitching={isSwitching}
            isExiting={isSplashExiting}
            onTransitionComplete={handleSplashTransitionComplete}
          />
        )}
      </AnimatePresence>

      {!loading && (
        <>
          {showOnboarding ? (
            <Onboarding onComplete={() => setShowOnboarding(false)} />
          ) : !session || !profile ? (
            <AuthPage />
          ) : isFirstLogin && profile ? (
            <WelcomePage
              profile={profile}
              onContinue={() => setIsFirstLogin(false)}
            />
          ) : (
            <ToastProvider>
              <SettingsProvider
                userId={profile.parent_id || (profile as any).owner_id || profile.id}
              >
                <GlobalErrorBoundary>
                  <SplashTransitionProvider value={splashTransitionValue}>
                    <OpenModalsProvider>
                      <AppContent profile={profile} />
                    </OpenModalsProvider>
                  </SplashTransitionProvider>
                </GlobalErrorBoundary>
              </SettingsProvider>
            </ToastProvider>
          )}
        </>
      )}
    </>
  );
};

export default App;
