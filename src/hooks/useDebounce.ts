
import { useState, useEffect } from 'react';

/**
 * Hook to debounce a value
 * @param value The value to debounce
 * @param delay The delay in milliseconds
 */
export function useDebounce<T>(value: T, delay: number = 500): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // Cancel the timeout if value changes or component unmounts
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * Function to create a debounced version of a function
 * @param func The function to debounce
 * @param wait The wait time in milliseconds
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T, 
  wait: number = 500
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;

  return function(...args: Parameters<T>): void {
    if (timeout) {
      clearTimeout(timeout);
    }
    
    timeout = setTimeout(() => {
      func(...args);
    }, wait);
  };
}
