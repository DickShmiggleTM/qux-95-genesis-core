
import { useState, useEffect, useRef } from 'react';

/**
 * Hook to throttle a value
 * @param value The value to throttle
 * @param limit The limit in milliseconds
 */
export function useThrottle<T>(value: T, limit: number = 200): T {
  const [throttledValue, setThrottledValue] = useState<T>(value);
  const lastRan = useRef<number>(Date.now());

  useEffect(() => {
    const handler = setTimeout(() => {
      if (Date.now() - lastRan.current >= limit) {
        setThrottledValue(value);
        lastRan.current = Date.now();
      }
    }, limit - (Date.now() - lastRan.current));

    return () => {
      clearTimeout(handler);
    };
  }, [value, limit]);

  return throttledValue;
}

/**
 * Function to create a throttled version of a function
 * @param func The function to throttle
 * @param limit The limit in milliseconds
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T, 
  limit: number = 200
): (...args: Parameters<T>) => void {
  let lastRan = 0;
  let lastFunc: ReturnType<typeof setTimeout> | null = null;

  return function(...args: Parameters<T>): void {
    if (lastFunc) {
      clearTimeout(lastFunc);
      lastFunc = null;
    }

    const now = Date.now();
    if (now - lastRan >= limit) {
      func(...args);
      lastRan = now;
    } else {
      lastFunc = setTimeout(() => {
        lastRan = Date.now();
        func(...args);
      }, limit - (now - lastRan));
    }
  };
}
