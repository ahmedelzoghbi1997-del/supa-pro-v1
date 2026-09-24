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
    const maxAttempts = 30;

    const startFlight = () => {
      const logoEl = logoRef.current;
      const targetEl = document.getElementById('header-logo-target');

      if (!logoEl) return;

      if (!targetEl) {
        if (attempts++ < maxAttempts) {
          rafId = requestAnimationFrame(startFlight);
          return;
        }
        onTransitionCompleteRef.current?.();
        return;
      }

      const targetRect = targetEl.getBoundingClientRect();
      const logoRect = logoEl.getBoundingClientRect();

      if ((targetRect.width === 0 || targetRect.height === 0) && attempts++ < maxAttempts) {
        rafId = requestAnimationFrame(startFlight);
        return;
      }

      hasStartedRef.current = true;

      // Calculate exact subpixel centers for pixel-perfect docking
      const sourceCenterX = logoRect.left + logoRect.width / 2;
      const sourceCenterY = logoRect.top + logoRect.height / 2;
      const targetCenterX = targetRect.left + targetRect.width / 2;
      const targetCenterY = targetRect.top + targetRect.height / 2;

      const deltaX = targetCenterX - sourceCenterX;
      const deltaY = targetCenterY - sourceCenterY;
      const targetSize = Math.max(targetRect.width, targetRect.height) || 36;
      const scale = targetSize / logoRect.width;

      // Cleanly remove entrance animation and lock opacity to 1 before flight
      logoEl.classList.remove('animate-splash-enter');
      logoEl.style.opacity = '1';

      // 1. Fluid GPU background fadeout revealing the dashboard content SIMULTANEOUSLY
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

      // 2. Silky-smooth flight starts in the EXACT SAME FRAME as the dashboard opens
      const flightAnim = logoEl.animate(
        [
          {
            transform: 'translate3d(0, 0, 0) scale(1)',
          },
          {
            transform: `translate3d(${deltaX.toFixed(2)}px, ${deltaY.toFixed(2)}px, 0) scale(${scale.toFixed(4)})`,
          }
        ],
        {
          duration: 520,
          easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
          fill: 'forwards',
        }
      );

      flightAnim.onfinish = () => {
        // Direct DOM handoff: immediately reveal the header target image
        const targetImg = targetEl.querySelector('img') || targetEl;
        targetImg.classList.remove('opacity-0');
        targetImg.classList.add('opacity-100');

        requestAnimationFrame(() => {
          onTransitionCompleteRef.current?.();
        });
      };
    };

    rafId = requestAnimationFrame(startFlight);
    return () => {
      cancelAnimationFrame(rafId);
    };
  }, [isExiting]);

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        contain: 'layout paint',
        zIndex: 9999,
        backgroundColor: 'transparent',
      }}
      className="splash-critical-overlay fixed inset-0 z-[100] pointer-events-none select-none overflow-hidden"
    >
      {/* Background matching exact dashboard canvas (zero color-shift flash) */}
      <div
        ref={bgRef}
        style={{ willChange: 'opacity' }}
        className="absolute inset-0 bg-[#F8FAFC] dark:bg-[#020617] flex items-center justify-center"
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
      <div
        style={{
          position: 'absolute',
          top: 0,
          right: 0,
          bottom: 0,
          left: 0,
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: 'auto',
        }}
        className="splash-critical-center absolute inset-0 flex items-center justify-center pointer-events-none"
      >
        <div
          ref={logoRef}
          style={{
            willChange: 'transform, opacity',
            transformOrigin: 'center center',
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
            transform: 'translate3d(0, 0, 0)',
            transformStyle: 'preserve-3d',
            width: '16rem',
            height: '16rem',
            maxWidth: '75vw',
            maxHeight: '75vw',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          className="splash-critical-box animate-splash-enter relative w-64 h-64 sm:w-72 sm:h-72 md:w-80 md:h-80 flex items-center justify-center pointer-events-none select-none"
        >
          <img
            src="/app-logo.png"
            alt="المحاسب الزراعي"
            width={256}
            height={256}
            className="w-full h-full object-contain pointer-events-none select-none drop-shadow-sm"
            loading="eager"
            decoding="sync"
          />
        </div>
      </div>
    </div>
  );
};

export default SplashScreen;
