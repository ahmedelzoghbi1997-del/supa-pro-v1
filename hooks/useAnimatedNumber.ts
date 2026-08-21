import { useState, useEffect, useRef } from 'react';

const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

export function useAnimatedNumber(endValue: number, duration: number = 1000): number {
    const [currentValue, setCurrentValue] = useState(0);
    // FIX: Added null as initial value to satisfy useRef type definition which expected 1 argument.
    const frameRef = useRef<number | null>(null);

    useEffect(() => {
        const startValue = currentValue;
        const valueChange = endValue - startValue;
        
        if (valueChange === 0) {
            return;
        }

        const isIntegerAnimation = Number.isInteger(endValue);
        let startTime: number | null = null;

        const animate = (timestamp: number) => {
            if (!startTime) {
                startTime = timestamp;
            }

            const elapsedTime = timestamp - startTime;
            const progress = Math.min(elapsedTime / duration, 1);
            const easedProgress = easeOutCubic(progress);

            const newDisplayValue = startValue + valueChange * easedProgress;

            if (progress < 1) {
                setCurrentValue(isIntegerAnimation ? Math.round(newDisplayValue) : newDisplayValue);
                frameRef.current = requestAnimationFrame(animate);
            } else {
                setCurrentValue(endValue);
            }
        };

        frameRef.current = requestAnimationFrame(animate);

        return () => {
            if (frameRef.current) {
                cancelAnimationFrame(frameRef.current);
            }
        };
    }, [endValue, duration]);

    return currentValue;
}