/**
 * Application Monitoring and Error Tracking
 * 
 * This utility provides centralized performance monitoring and error tracking
 */

import { toast } from "sonner";

// Performance metrics
interface PerformanceMetrics {
  responseTime: number[];
  errors: {
    count: number;
    lastError: string | null;
    timestamp: number | null;
  };
  requests: number;
  sessionStart: number;
}

// Initialize metrics
const metrics: PerformanceMetrics = {
  responseTime: [],
  errors: {
    count: 0,
    lastError: null,
    timestamp: null
  },
  requests: 0,
  sessionStart: Date.now()
};

/**
 * Track API request performance
 */
export const trackApiRequest = (startTime: number, endpoint: string, success: boolean): void => {
  const duration = Date.now() - startTime;
  metrics.responseTime.push(duration);
  metrics.requests++;
  
  // Keep only the last 100 response times
  if (metrics.responseTime.length > 100) {
    metrics.responseTime.shift();
  }
  
  // Log slow requests (over 1 second)
  if (duration > 1000) {
    console.warn(`Slow API request to ${endpoint}: ${duration}ms`);
  }
  
  // Debug log for all requests
  console.debug(`API ${endpoint} - ${success ? 'Success' : 'Failed'} - ${duration}ms`);
};

/**
 * Track and handle errors
 */
export const trackError = (error: Error, context: string, notify: boolean = false): void => {
  // Update metrics
  metrics.errors.count++;
  metrics.errors.lastError = error.message;
  metrics.errors.timestamp = Date.now();
  
  // Log error with context
  console.error(`Error in ${context}:`, error);
  
  // Show user notification if requested
  if (notify) {
    toast.error(`Error in ${context}`, {
      description: error.message.length > 100 
        ? error.message.substring(0, 100) + '...' 
        : error.message
    });
  }
  
  // In a real implementation, this would send the error to a monitoring service
  // Such as Sentry, LogRocket, etc.
};

/**
 * Get performance metrics
 */
export const getPerformanceMetrics = (): any => {
  const avgResponseTime = metrics.responseTime.length 
    ? metrics.responseTime.reduce((sum, time) => sum + time, 0) / metrics.responseTime.length 
    : 0;
  
  return {
    avgResponseTime: Math.round(avgResponseTime),
    requestCount: metrics.requests,
    errorCount: metrics.errors.count,
    uptime: Math.round((Date.now() - metrics.sessionStart) / 1000),
    lastError: metrics.errors.lastError,
    lastErrorTime: metrics.errors.timestamp
  };
};

/**
 * Reset metrics
 */
export const resetMetrics = (): void => {
  metrics.responseTime = [];
  metrics.errors.count = 0;
  metrics.errors.lastError = null;
  metrics.errors.timestamp = null;
  metrics.requests = 0;
  metrics.sessionStart = Date.now();
};
