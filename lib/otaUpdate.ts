import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { CURRENT_APP_VERSION } from '../constants';
import { isUpdateAvailable } from '../utils/helpers';

export interface OTAMetadata {
  version?: string;
  name?: string;
  description?: string;
  updatedAt?: string | number;
  [key: string]: unknown;
}

const VERCEL_METADATA_URL = 'https://supa-pro-v1.vercel.app/metadata.json';
const STORAGE_KEY_OTA_VERSION = 'ota_last_checked_version';
const STORAGE_KEY_LIVE_URL_ACTIVE = 'ota_live_url_active';

/**
 * جلب metadata.json من Vercel مع مهلة (timeout) ومنع الكاش
 */
export async function fetchRemoteMetadata(timeoutMs = 5000): Promise<OTAMetadata | null> {
  if (!navigator.onLine) {
    return null;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${VERCEL_METADATA_URL}?t=${Date.now()}`, {
      method: 'GET',
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
      },
      signal: controller.signal,
    });

    clearTimeout(timer);

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return data as OTAMetadata;
  } catch (err) {
    clearTimeout(timer);
    console.warn('[OTA] Failed to fetch remote metadata:', err);
    return null;
  }
}

/**
 * الحصول على الإصدار الحالي للتطبيق (محلياً أو من Capacitor App API)
 */
export async function getLocalAppVersion(): Promise<string> {
  if (Capacitor.isNativePlatform()) {
    try {
      const info = await App.getInfo();
      if (info?.version) {
        return info.version;
      }
    } catch (_err) {
      // Fallback to constant
    }
  }
  return CURRENT_APP_VERSION;
}

/**
 * فحص وتطبيق التحديث الصامت عبر Vercel
 */
export async function checkAndApplyOTAUpdate(): Promise<boolean> {
  // OTA updates only apply to native platforms (APK)
  if (!Capacitor.isNativePlatform()) {
    return false;
  }

  // إذا كان الجهاز offline، تأكد من الاعتماد على الأصول المحلية
  if (!navigator.onLine) {
    if (localStorage.getItem(STORAGE_KEY_LIVE_URL_ACTIVE) === 'true') {
      localStorage.removeItem(STORAGE_KEY_LIVE_URL_ACTIVE);
    }
    return false;
  }

  try {
    const remoteMeta = await fetchRemoteMetadata();
    if (!remoteMeta) {
      return false;
    }

    const currentVersion = await getLocalAppVersion();
    const remoteVersion = remoteMeta.version || CURRENT_APP_VERSION;

    // حفظ كـ reference
    localStorage.setItem(STORAGE_KEY_OTA_VERSION, remoteVersion);

    // إذا كان الإصدار في Vercel أحدث من الأصلي أو تم تحديث الكود
    const hasNewVersion = isUpdateAvailable(remoteVersion, currentVersion);
    
    if (hasNewVersion) {
      localStorage.setItem(STORAGE_KEY_LIVE_URL_ACTIVE, 'true');
      return true;
    }
  } catch (err) {
    console.warn('[OTA] Error during OTA update check:', err);
  }

  return false;
}

/**
 * التهيئة الأوليّة لنظام OTA عند تشغيل التطبيق
 */
export function initOTAUpdate(): void {
  if (!Capacitor.isNativePlatform()) return;

  // فحص صامت للتحديثات في الخلفية
  setTimeout(() => {
    checkAndApplyOTAUpdate().catch((err) => {
      console.warn('[OTA] Background check error:', err);
    });
  }, 3000);

  // إعادة الفحص عند عودة الاتصال بالإنترنت
  window.addEventListener('online', () => {
    checkAndApplyOTAUpdate().catch(() => {});
  });
}
