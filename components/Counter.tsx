
import React, { useState, useEffect, useRef } from 'react';

interface CounterProps {
  value: number;
  className?: string;
  showPlus?: boolean;
}

const Counter: React.FC<CounterProps> = ({ value, className = '', showPlus = false }) => {
  const [displayValue, setDisplayValue] = useState(value);
  const [isPulsing, setIsPulsing] = useState(false);
  const [floatingPoints, setFloatingPoints] = useState<number | null>(null);
  const prevValue = useRef(value);

  useEffect(() => {
    if (value !== prevValue.current) {
      const diff = value - prevValue.current;
      if (diff > 0) {
        setFloatingPoints(diff);
        setIsPulsing(true);
        setTimeout(() => {
          setIsPulsing(false);
          setFloatingPoints(null);
        }, 2000);
      }

      const startValue = displayValue;
      const endValue = value;
      const duration = 1000; // ms
      const startTime = performance.now();

      const animate = (now: number) => {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Ease out quad
        const easedProgress = progress * (2 - progress);
        const nextValue = Math.floor(startValue + (endValue - startValue) * easedProgress);
        
        setDisplayValue(nextValue);

        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          setDisplayValue(endValue);
        }
      };

      requestAnimationFrame(animate);
      prevValue.current = value;
    }
  }, [value]);

  return (
    <div className={`relative inline-block ${className}`}>
      <span className={`inline-block transition-transform duration-300 ${isPulsing ? 'scale-125 text-white drop-shadow-[0_0_8px_rgba(245,158,11,0.8)]' : ''}`}>
        {displayValue}
      </span>
      {floatingPoints !== null && (
        <span className="absolute -top-6 left-1/2 -translate-x-1/2 font-bold text-amber-400 text-sm animate-float-up-fade pointer-events-none whitespace-nowrap">
          +{floatingPoints}
        </span>
      )}
      <style>{`
        @keyframes float-up-fade {
          0% { transform: translate(-50%, 0); opacity: 0; }
          20% { opacity: 1; }
          100% { transform: translate(-50%, -30px); opacity: 0; }
        }
        .animate-float-up-fade {
          animation: float-up-fade 2s ease-out forwards;
        }
      `}</style>
    </div>
  );
};

export default Counter;
