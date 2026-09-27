import React, { useState, useEffect, useCallback } from 'react';
import { getPendingSyncCount, getFailedSyncCount, processSyncQueue } from '../../lib/syncQueue';
import { WifiOff, RefreshCw, AlertTriangle } from 'lucide-react';

export const OfflineBanner: React.FC = () => {
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [failedCount, setFailedCount] = useState<number>(0);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  const updateCounts = useCallback(async () => {
    try {
      const [pending, failed] = await Promise.all([
        getPendingSyncCount(),
        getFailedSyncCount()
      ]);
      setPendingCount(pending);
      setFailedCount(failed);
    } catch {
      // Ignore count fetch errors
    }
  }, []);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      updateCounts();
    };

    const handleOffline = () => {
      setIsOnline(false);
      updateCounts();
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial check
    updateCounts();

    // Periodic refresh while offline
    const interval = setInterval(() => {
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        setIsOnline(false);
        updateCounts();
      } else if (typeof navigator !== 'undefined' && navigator.onLine && !isOnline) {
        setIsOnline(true);
      }
    }, 4000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, [isOnline, updateCounts]);

  const handleSyncNow = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    try {
      await processSyncQueue();
      await updateCounts();
    } catch (e) {
      console.error('Manual sync queue error:', e);
    } finally {
      setIsSyncing(false);
    }
  };

  if (isOnline) {
    return null;
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className="w-full bg-gradient-to-r from-amber-600 via-amber-500 to-orange-600 text-white px-3 py-1.5 sm:px-4 sm:py-2 text-xs font-semibold shadow-md flex items-center justify-between gap-2 z-[90] transition-all animate-enter"
    >
      <div className="flex items-center gap-2 overflow-hidden truncate">
        <WifiOff className="w-4 h-4 flex-shrink-0 animate-pulse text-amber-100" />
        <span className="truncate">
          أنت تعمل دون اتصال بالإنترنت
        </span>
        {pendingCount > 0 && (
          <span className="inline-flex items-center gap-1 bg-black/20 text-amber-50 px-2 py-0.5 rounded-full text-[11px] font-bold">
            <span>{pendingCount} معلّق</span>
          </span>
        )}
        {failedCount > 0 && (
          <span className="inline-flex items-center gap-1 bg-rose-900/40 text-rose-100 px-2 py-0.5 rounded-full text-[11px] font-bold">
            <AlertTriangle className="w-3 h-3 text-rose-200" />
            <span>{failedCount} متعثر</span>
          </span>
        )}
      </div>

      <button
        onClick={handleSyncNow}
        disabled={isSyncing}
        className="flex-shrink-0 inline-flex items-center gap-1.5 bg-white/20 hover:bg-white/30 active:scale-95 text-white text-[11px] font-bold px-2.5 py-1 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed border border-white/20"
        title="مزامنة التغييرات الآن"
      >
        <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
        <span>{isSyncing ? 'جارٍ المزامنة...' : 'مزامنة الآن'}</span>
      </button>
    </div>
  );
};

export default OfflineBanner;
