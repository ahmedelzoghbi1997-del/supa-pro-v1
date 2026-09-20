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

      // 1. Snappy fade out of the background canvas on the GPU
      if (bgRef.current) {
        bgRef.current.animate(
          [
            { opacity: 1 },
            { opacity: 0 }
          ],
          {
            duration: 380,
            easing: 'cubic-bezier(0.25, 1, 0.5, 1)',
            fill: 'forwards',
          }
        );
      }

      // 2. Ultra-smooth GPU compositor flight directly to header coordinates
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
          duration: 480,
          easing: 'cubic-bezier(0.16, 1, 0.3, 1)', // Snappy, natural deceleration
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
      {/* Background with optimized CSS radial gradient glow (zero Gaussian blur re-rasterization jank) */}
      <div
        ref={bgRef}
        style={{ willChange: 'opacity' }}
        className="absolute inset-0 bg-neutral-50 dark:bg-[#060b13] flex items-center justify-center"
      >
        {/* Ambient Radial Gradient - 100% lightweight & instantaneous GPU fill */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'radial-gradient(circle at 50% 50%, rgba(16, 185, 129, 0.15) 0%, rgba(16, 185, 129, 0.04) 40%, transparent 70%)',
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
