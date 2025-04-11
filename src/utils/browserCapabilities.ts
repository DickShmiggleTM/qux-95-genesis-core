
/**
 * Browser capability detection utilities
 */

/**
 * Check if WebGPU is supported in the current browser
 */
export const isWebGPUSupported = (): boolean => {
  return typeof navigator !== 'undefined' && 
         'gpu' in navigator &&
         typeof (navigator as any).gpu !== 'undefined';
};

/**
 * Check if WebAssembly is supported in the current browser
 */
export const isWebAssemblySupported = (): boolean => {
  return typeof WebAssembly !== 'undefined';
};
