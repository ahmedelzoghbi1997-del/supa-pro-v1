import React, { useEffect, useState, useRef } from 'react';

interface SplashScreenProps {
  isSwitching?: boolean;
  isExiting?: boolean;
  onTransitionComplete?: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({
  isExiting = false,
  onTransitionComplete,
}) => {
  const [targetCoords, setTargetCoords] = useState<{
    x: number;
    y: number;
    size: number;
  } | null>(null);

  const [startCoords, setStartCoords] = useState<{
    centerX: number;
    centerY: number;
    size: number;
  } | null>(null);

  const logoCenterRef = useRef<HTMLDivElement>(null);
  const flightContainerRef = useRef<HTMLDivElement>(null);
  const bgRef = useRef<HTMLDivElement>(null);

  // Measure initial center logo position & size once mounted
  useEffect(() => {
    if (logoCenterRef.current) {
      const rect = logoCenterRef.current.getBoundingClientRect();
      setStartCoords({
        centerX: rect.left + rect.width / 2,
        centerY: rect.top + rect.height / 2,
        size: Math.min(rect.width, rect.height) || 256,
      });
    }
  }, []);

  // When exiting begins, compute exact center coordinates of the target image inside the header
  useEffect(() => {
    if (!isExiting) return;

    const findTargetCoords = () => {
      const targetEl = document.getElementById('header-logo-target');
      if (targetEl) {
        const imgEl = targetEl.querySelector('img') || targetEl;
        const rect = imgEl.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          setTargetCoords({
            x: rect.left + rect.width / 2,
            y: rect.top + rect.height / 2,
            size: Math.min(rect.width, rect.height) || 38,
          });
          return true;
        }
      }
      return false;
    };

    if (!findTargetCoords()) {
      const raf = requestAnimationFrame(() => {
        if (!findTargetCoords()) {
          setTargetCoords({
            x: window.innerWidth - 48,
            y: 30,
            size: 38,
          });
        }
      });
      return () => cancelAnimationFrame(raf);
    }
  }, [isExiting]);

  // Launch the pure compositor Web Animations API (WAAPI) when target is resolved
  useEffect(() => {
    if (!isExiting || !targetCoords) return;

    const initialSize = startCoords?.size || 256;
    const startCenterX = startCoords?.centerX || window.innerWidth / 2;
    const startCenterY = startCoords?.centerY || window.innerHeight / 2;

    const deltaX = targetCoords.x - startCenterX;
    const deltaY = targetCoords.y - startCenterY;
    const scale = targetCoords.size / initialSize;

    // 1. Background soft fade out via compositor
    if (bgRef.current) {
      bgRef.current.animate(
        [
          { opacity: 1 },
          { opacity: 0 }
        ],
        {
          duration: 750,
          easing: 'cubic-bezier(0.25, 1, 0.5, 1)',
          fill: 'forwards',
        }
      );
    }

    // 2. Logo flight animation running on GPU compositor thread (zero JS-thread stutter)
    if (flightContainerRef.current) {
      const animation = flightContainerRef.current.animate(
        [
          {
            transform: 'translate3d(0px, 0px, 0px) scale(1)',
          },
          {
            transform: `translate3d(${deltaX}px, ${deltaY}px, 0px) scale(${scale})`,
          }
        ],
        {
          duration: 950,
          easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
          fill: 'forwards',
        }
      );

      animation.onfinish = () => {
        // Handover smoothly without any drop or flicker
        requestAnimationFrame(() => {
          onTransitionComplete?.();
        });
      };
    }
  }, [isExiting, targetCoords, startCoords, onTransitionComplete]);

  return (
    <div className="fixed inset-0 z-[100] pointer-events-none select-none overflow-hidden">
      {/* Background Canvas */}
      <div
        ref={bgRef}
        style={{ willChange: 'opacity' }}
        className="absolute inset-0 bg-gradient-to-b from-neutral-50 via-white to-neutral-100 dark:from-[#060b13] dark:via-[#090f1d] dark:to-[#050811] flex items-center justify-center p-6"
      >
        {/* Soft Ambient Light Glow */}
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 sm:w-[32rem] h-96 sm:h-[32rem] bg-emerald-500/10 dark:bg-emerald-500/15 rounded-full blur-3xl pointer-events-none"
        />
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 sm:w-96 sm:h-96 bg-emerald-400/15 dark:bg-emerald-400/20 rounded-full blur-2xl pointer-events-none"
        />
      </div>

      {/* The Flying Logo Element (Direct GPU Compositor execution) */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div
          ref={flightContainerRef}
          style={{
            willChange: 'transform',
            transformOrigin: 'center center',
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
          }}
          className="relative flex items-center justify-center"
        >
          <div
            ref={logoCenterRef}
            className="relative w-64 h-64 sm:w-80 sm:h-80 md:w-96 md:h-96 max-w-[85vw] max-h-[50vh] flex items-center justify-center"
          >
            <img
              src="/app-logo.png"
              alt="المحاسب الزراعي"
              className="w-full h-full object-contain select-none"
              style={{
                backfaceVisibility: 'hidden',
                WebkitBackfaceVisibility: 'hidden',
              }}
              loading="eager"
              decoding="sync"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default SplashScreen;
