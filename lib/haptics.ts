import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { Capacitor } from '@capacitor/core';

/**
 * Triggers light haptic feedback - exclusively for Sidebar/Drawer opening and closing.
 */
export const triggerLightHaptic = async () => {
  try {
    if (Capacitor.isNativePlatform()) {
      await Haptics.impact({ style: ImpactStyle.Light });
    }
  } catch (_err) {
    // Ignore error silently on unsupported environments
  }
};

/**
 * Triggers medium/confirmation haptic feedback - for Save/Submit buttons inside forms
 * (e.g. Invoices, Expenses, Advances, Farmer withdrawals, Supplier payments, etc.).
 */
export const triggerSaveHaptic = async () => {
  try {
    if (Capacitor.isNativePlatform()) {
      await Haptics.impact({ style: ImpactStyle.Medium });
    }
  } catch (_err) {
    // Ignore error silently on unsupported environments
  }
};

/**
 * Triggers success haptic feedback - for successful completion of a transaction or save.
 */
export const triggerSuccessHaptic = async () => {
  try {
    if (Capacitor.isNativePlatform()) {
      await Haptics.notification({ type: NotificationType.Success });
    }
  } catch (_err) {
    // Fallback to medium impact
    triggerSaveHaptic();
  }
};
