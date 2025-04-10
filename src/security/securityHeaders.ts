
/**
 * Security Headers Configuration
 * 
 * This file defines security headers for the application
 * to protect against common web vulnerabilities
 */

export interface SecurityHeadersConfig {
  contentSecurityPolicy: string;
  strictTransportSecurity: string;
  xContentTypeOptions: string;
  xFrameOptions: string;
  referrerPolicy: string;
  permissionsPolicy: string;
  xXssProtection: string;
}

// Default CSP directives
const defaultCsp = {
  'default-src': ["'self'"],
  'script-src': ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
  'style-src': ["'self'", "'unsafe-inline'"],
  'img-src': ["'self'", 'data:', 'blob:'],
  'font-src': ["'self'"],
  'connect-src': ["'self'", 'http://localhost:*', 'ws://localhost:*'],
  'media-src': ["'self'"],
  'object-src': ["'none'"],
  'base-uri': ["'self'"]
};

// Build CSP string from directives
const buildCspString = (directives: Record<string, string[]>): string => {
  return Object.entries(directives)
    .map(([key, values]) => `${key} ${values.join(' ')}`)
    .join('; ');
};

// Export default security headers
export const securityHeaders: SecurityHeadersConfig = {
  contentSecurityPolicy: buildCspString(defaultCsp),
  strictTransportSecurity: 'max-age=63072000; includeSubDomains; preload',
  xContentTypeOptions: 'nosniff',
  xFrameOptions: 'SAMEORIGIN',
  referrerPolicy: 'strict-origin-when-cross-origin',
  permissionsPolicy: 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
  xXssProtection: '1; mode=block'
};

// Function to apply security headers to fetch requests
export const applySecurityHeaders = (headers: Headers): Headers => {
  headers.set('Content-Security-Policy', securityHeaders.contentSecurityPolicy);
  headers.set('Strict-Transport-Security', securityHeaders.strictTransportSecurity);
  headers.set('X-Content-Type-Options', securityHeaders.xContentTypeOptions);
  headers.set('X-Frame-Options', securityHeaders.xFrameOptions);
  headers.set('Referrer-Policy', securityHeaders.referrerPolicy);
  headers.set('Permissions-Policy', securityHeaders.permissionsPolicy);
  headers.set('X-XSS-Protection', securityHeaders.xXssProtection);
  
  return headers;
};

// Add security headers to fetch API
const originalFetch = window.fetch;
window.fetch = function(input: RequestInfo | URL, init?: RequestInit) {
  const secureInit = init || {};
  secureInit.headers = secureInit.headers || {};
  
  // Apply security headers to the request
  const headers = new Headers(secureInit.headers);
  applySecurityHeaders(headers);
  secureInit.headers = headers;
  
  return originalFetch(input, secureInit);
};
