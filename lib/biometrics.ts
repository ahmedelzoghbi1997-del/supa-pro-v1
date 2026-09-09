import { NativeBiometric } from 'capacitor-native-biometric';
import { Capacitor } from '@capacitor/core';

export async function isBiometricSupportedOnDevice(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) {
    // Return true on web preview so the user can test the visual flows/toggles
    return true;
  }
  try {
    const result = await NativeBiometric.isAvailable();
    return !!result.isAvailable;
  } catch (error) {
    console.warn("Biometrics check failed or unsupported:", error);
    return false;
  }
}

export async function checkBiometricType(): Promise<'fingerprint' | 'face' | 'none'> {
  if (!Capacitor.isNativePlatform()) {
    return 'fingerprint';
  }
  try {
    const result = await NativeBiometric.isAvailable();
    if (!result.isAvailable) return 'none';
    
    // In capacitor-native-biometric, the type can indicate TouchID or FaceID
    const typeStr = String(result.biometryType || '').toLowerCase();
    if (typeStr.includes('face') || typeStr.includes('iris')) {
      return 'face';
    }
    return 'fingerprint';
  } catch (_e) {
    return 'none';
  }
}

export async function authenticateBiometrically(reasonArabic: string = "تأكيد الهوية لتسجيل الدخول السريع"): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) {
    // Beautiful mock delay on web simulator
    await new Promise(resolve => setTimeout(resolve, 900));
    return true;
  }
  try {
    await NativeBiometric.verifyIdentity({
      reason: reasonArabic,
      title: "المحاسب الزراعي",
      subtitle: "تأكيد البصمة الحيوية",
      description: "يرجى وضع إصبعك على مستشعر البصمة أو استخدام التعرف على الوجه لتأكيد ملكية الحساب",
      negativeButtonText: "إلغاء واستخدام كلمة المرور"
    });
    return true;
  } catch (error) {
    console.error("Native Biometric error:", error);
    return false;
  }
}
