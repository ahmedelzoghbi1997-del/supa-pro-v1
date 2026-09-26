import { useEffect } from "react";
import { StatusBar, Style } from "@capacitor/status-bar";
import { Capacitor } from "@capacitor/core";

export function useStatusBarSync() {
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const updateStatusBar = () => {
      const isDark = document.documentElement.classList.contains("dark");
      StatusBar.setStyle({ style: isDark ? Style.Dark : Style.Light }).catch(() => {});
      StatusBar.setBackgroundColor({ color: isDark ? "#0a0a0a" : "#ffffff" }).catch(() => {});
    };

    // Run initially
    updateStatusBar();

    // Observe changes to 'class' attribute of document.documentElement
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.attributeName === "class") {
          updateStatusBar();
          break;
        }
      }
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => {
      observer.disconnect();
    };
  }, []);
}
