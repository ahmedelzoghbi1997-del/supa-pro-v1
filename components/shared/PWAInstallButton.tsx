import React, { useState } from 'react';
import { usePWAInstall } from '../../hooks/usePWAInstall';
import { ArrowDownToLine, Smartphone, X, Check } from 'lucide-react';

export const PWAInstallButton: React.FC<{ variant?: 'header' | 'banner' | 'settings' }> = ({ variant = 'header' }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  // If already running as an installed PWA or dismissed, hide
  if (isInstalled || isDismissed) {
    return null;
  }

  // Header button variant (compact)
  if (variant === 'header') {
    if (isInstallable) {
      return (
        <button
          onClick={install}
          title="تثبيت التطبيق على جهازك"
          className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-bold shadow-sm transition-all animate-enter"
        >
          <ArrowDownToLine className="w-3.5 h-3.5" />
          <span>تثبيت التطبيق</span>
        </button>
      );
    }

    if (isIOS) {
      return (
        <>
          <button
            onClick={() => setShowIOSGuide(true)}
            title="تثبيت على الآيفون"
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-emerald-600/30 text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 active:scale-95 text-xs font-bold transition-all"
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>تثبيت PWA</span>
          </button>

          {showIOSGuide && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in" dir="rtl">
              <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-neutral-900 p-6 shadow-2xl border border-neutral-200 dark:border-neutral-800 animate-enter">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base font-bold text-neutral-800 dark:text-neutral-100 flex items-center gap-2">
                    <Smartphone className="w-5 h-5 text-emerald-600" />
                    <span>تثبيت التطبيق على آيفون / آيباد</span>
                  </h3>
                  <button onClick={() => setShowIOSGuide(false)} className="p-1 rounded-full text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="space-y-3 text-sm text-neutral-600 dark:text-neutral-300">
                  <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-100 dark:border-neutral-800">
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 font-bold text-xs shrink-0">١</span>
                    <p>اضغط على زر <strong>المشاركة (Share)</strong> أسفل متصفح Safari.</p>
                  </div>
                  <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-100 dark:border-neutral-800">
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 font-bold text-xs shrink-0">٢</span>
                    <p>مرر للأسفل واضغط على <strong>إضافة إلى الصفحة الرئيسية (Add to Home Screen)</strong>.</p>
                  </div>
                  <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-100 dark:border-neutral-800">
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 font-bold text-xs shrink-0">٣</span>
                    <p>اضغط <strong>إضافة (Add)</strong> في الزاوية العلوية لتثبيت التطبيق كتطبيق هاتف كامل.</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowIOSGuide(false)}
                  className="mt-5 w-full rounded-xl bg-emerald-600 hover:bg-emerald-700 py-2.5 text-sm font-bold text-white shadow-sm transition"
                >
                  فهمت ذلك
                </button>
              </div>
            </div>
          )}
        </>
      );
    }
  }

  // Settings variant
  if (variant === 'settings') {
    return (
      <div className="p-4 rounded-xl border border-emerald-500/20 bg-emerald-50/50 dark:bg-emerald-950/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-600 text-white shadow-sm">
            <Smartphone className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-neutral-800 dark:text-neutral-100">تطبيق الويب التقدمي (PWA)</h4>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">تثبيت التطبيق على شاشة الهاتف والكمبيوتر للوصول الفوري بدون متصفح</p>
          </div>
        </div>
        {isInstallable ? (
          <button
            onClick={install}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-bold shadow transition"
          >
            <ArrowDownToLine className="w-4 h-4" />
            <span>تثبيت التطبيق الآن</span>
          </button>
        ) : isIOS ? (
          <button
            onClick={() => setShowIOSGuide(true)}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-emerald-600 text-emerald-700 dark:text-emerald-300 text-xs font-bold hover:bg-emerald-500/10 transition"
          >
            <Smartphone className="w-4 h-4" />
            <span>تعليمات آيفون</span>
          </button>
        ) : (
          <div className="inline-flex items-center gap-1.5 text-xs text-emerald-600 font-semibold">
            <Check className="w-4 h-4" />
            <span>جاهز للتثبيت من شريط المتصفح</span>
          </div>
        )}
      </div>
    );
  }

  return null;
};
