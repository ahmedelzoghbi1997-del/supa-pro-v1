import React, { useEffect, useRef } from 'react';

interface SplashScreenProps {
  isSwitching?: boolean;
  isExiting?: boolean;
  onTransitionComplete?: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({
  isExiting = false,
  onTransitionComplete,
}) => {
  const logoRef = useRef<HTMLDivElement>(null);
  const bgRef = useRef<HTMLDivElement>(null);
  const hasStartedRef = useRef(false);
  const onTransitionCompleteRef = useRef(onTransitionComplete);
  onTransitionCompleteRef.current = onTransitionComplete;

  useEffect(() => {
    if (!isExiting || hasStartedRef.current) return;

    let rafId: number;
    let attempts = 0;
    const maxAttempts = 40; // Max ~600ms waiting for target if layout needs a tick

    const startFlight = () => {
      const logoEl = logoRef.current;
      const targetEl = document.getElementById('header-logo-target');

      if (!logoEl) return;

      if (!targetEl) {
        if (attempts++ < maxAttempts) {
          rafId = requestAnimationFrame(startFlight);
          return;
        }
        // Fallback: complete transition cleanly if target never appears
        onTransitionCompleteRef.current?.();
        return;
      }

      const targetRect = targetEl.getBoundingClientRect();
      const logoRect = logoEl.getBoundingClientRect();

      // Ensure target element has laid out with valid dimensions
      if ((targetRect.width === 0 || targetRect.height === 0) && attempts++ < maxAttempts) {
        rafId = requestAnimationFrame(startFlight);
        return;
      }

      // Mark as started so it never runs twice
      hasStartedRef.current = true;

      // Calculate exact subpixel centers
      const sourceCenterX = logoRect.left + logoRect.width / 2;
      const sourceCenterY = logoRect.top + logoRect.height / 2;
      const targetCenterX = targetRect.left + targetRect.width / 2;
      const targetCenterY = targetRect.top + targetRect.height / 2;

      const deltaX = targetCenterX - sourceCenterX;
      const deltaY = targetCenterY - sourceCenterY;
      const targetSize = Math.max(targetRect.width, targetRect.height) || 36;
      const scale = targetSize / logoRect.width;

      // 1. Smooth fade out of the background canvas on the GPU
      if (bgRef.current) {
        bgRef.current.animate(
          [
            { opacity: 1 },
            { opacity: 0 }
          ],
          {
            duration: 620,
            easing: 'cubic-bezier(0.25, 1, 0.5, 1)',
            fill: 'forwards',
          }
        );
      }

      // 2. Ultra-smooth GPU compositor flight directly to header coordinates (slightly slower & graceful)
      const flightAnim = logoEl.animate(
        [
          {
            transform: 'translate3d(0px, 0px, 0px) scale(1)',
          },
          {
            transform: `translate3d(${deltaX}px, ${deltaY}px, 0px) scale(${scale})`,
          }
        ],
        {
          duration: 750,
          easing: 'cubic-bezier(0.22, 1, 0.36, 1)', // Smooth, graceful deceleration without abrupt stopping
          fill: 'forwards',
        }
      );

      flightAnim.onfinish = () => {
        onTransitionCompleteRef.current?.();
      };
    };

    rafId = requestAnimationFrame(startFlight);
    return () => cancelAnimationFrame(rafId);
  }, [isExiting]);

  return (
    <div className="fixed inset-0 z-[100] pointer-events-none select-none overflow-hidden">
      {/* Background matching exact dashboard canvas (zero color-shift flash) */}
      <div
        ref={bgRef}
        style={{ willChange: 'opacity' }}
        className="absolute inset-0 bg-neutral-100 dark:bg-neutral-950 flex items-center justify-center"
      >
        {/* Subtle Ambient Radial Glow */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'radial-gradient(circle at 50% 50%, rgba(16, 185, 129, 0.12) 0%, rgba(16, 185, 129, 0.03) 45%, transparent 70%)',
          }}
        />
      </div>

      {/* Direct Centered Flying Logo Element */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div
          ref={logoRef}
          style={{
            willChange: 'transform',
            transformOrigin: 'center center',
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
          }}
          className="relative w-64 h-64 sm:w-72 sm:h-72 md:w-80 md:h-80 flex items-center justify-center pointer-events-none select-none"
        >
          <img
            src="/app-logo.png"
            alt="المحاسب الزراعي"
            className="w-full h-full object-contain pointer-events-none select-none"
            loading="eager"
            decoding="sync"
          />
        </div>
      </div>
    </div>
  );
};

export default SplashScreen;
