
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
