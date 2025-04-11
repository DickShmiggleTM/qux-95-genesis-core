
/**
 * Browser capability detection utilities
 */

// Add WebGPU interface to extend Navigator type
interface NavigatorGPU {
  gpu?: {
    requestAdapter?: () => Promise<any>;
  };
}

/**
 * Check if WebGPU is supported in the current browser
 */
export const isWebGPUSupported = (): boolean => {
  return typeof navigator !== 'undefined' && 
         'gpu' in navigator &&
         typeof (navigator as NavigatorGPU).gpu !== 'undefined';
};

/**
 * Check if WebAssembly is supported in the current browser
 */
export const isWebAssemblySupported = (): boolean => {
  return typeof WebAssembly !== 'undefined';
};

/**
 * Check if the browser is mobile
 */
export const isMobileBrowser = (): boolean => {
  if (typeof navigator === 'undefined') return false;
  
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );
};

/**
 * Check if the device supports touch input
 */
export const isTouchDevice = (): boolean => {
  if (typeof window === 'undefined') return false;
  
  return 'ontouchstart' in window || 
    navigator.maxTouchPoints > 0 ||
    // @ts-ignore - This is a non-standard property but useful for detection
    navigator.msMaxTouchPoints > 0;
};

/**
 * Check if screen meets minimum size requirements for complex UI
 */
export const hasAdequateScreenSize = (): boolean => {
  if (typeof window === 'undefined') return true;
  
  return window.innerWidth >= 768 && window.innerHeight >= 500;
};

