import React, { useEffect, useState, useRef } from 'react';

const DURATION = 1000; // Animation duration in milliseconds

const AnimatedNumber: React.FC<{ value: number, decimals?: number }> = ({ value, decimals = 0 }) => {
    const [displayValue, setDisplayValue] = useState(0);
    // FIX: Initialize useRef with null to satisfy the argument requirement and provide a correct initial type.
    const frameRef = useRef<number | null>(null);
    const startTimeRef = useRef<number | null>(null);
    const startValueRef = useRef<number | null>(null);

    useEffect(() => {
        // FIX: Corrected typo from startValueeRef to startValueRef.
        startValueRef.current = 0; // Always start from 0 for a nice "counting up" effect
        startTimeRef.current = performance.now();

        const animate = (currentTime: number) => {
            const elapsedTime = currentTime - (startTimeRef.current || 0);
            const progress = Math.min(elapsedTime / DURATION, 1);
            const currentVal = (startValueRef.current || 0) + (value - (startValueRef.current || 0)) * progress;
            
            setDisplayValue(currentVal);

            if (progress < 1) {
                frameRef.current = requestAnimationFrame(animate);
            } else {
                setDisplayValue(value); // Ensure it ends on the exact value
            }
        };

        frameRef.current = requestAnimationFrame(animate);

        return () => {
            if (frameRef.current) {
                cancelAnimationFrame(frameRef.current);
            }
        };
    }, [value]);

    return <span>{displayValue.toFixed(decimals)}</span>;
};

export default AnimatedNumber;