
/**
 * Module API Client
 * 
 * Provides a unified interface for making API requests with
 * monitoring, security headers, and automatic retries
 */

import { trackApiRequest, trackError } from './monitoring';
import { applySecurityHeaders } from '../security/securityHeaders';
import { benchmark } from './benchmark';

interface RequestOptions extends RequestInit {
  retries?: number;
  retryDelay?: number;
  timeout?: number;
  trackPerformance?: boolean;
}

class ModuleAPIClient {
  private baseUrl: string;

  constructor(baseUrl: string = '') {
    this.baseUrl = baseUrl;
  }

  /**
   * Set base URL for API requests
   */
  setBaseUrl(url: string): void {
    this.baseUrl = url;
  }

  /**
   * Make a GET request
   */
  async get<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  }

  /**
   * Make a POST request
   */
  async post<T>(endpoint: string, body: any, options: RequestOptions = {}): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: JSON.stringify(body),
      headers: {
        ...options.headers,
        'Content-Type': 'application/json'
      }
    });
  }

  /**
   * Make a PUT request
   */
  async put<T>(endpoint: string, body: any, options: RequestOptions = {}): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: JSON.stringify(body),
      headers: {
        ...options.headers,
        'Content-Type': 'application/json'
      }
    });
  }

  /**
   * Make a DELETE request
   */
  async delete<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' });
  }

  /**
   * Make a generic HTTP request
   */
  async request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    const {
      retries = 3,
      retryDelay = 300,
      timeout = 30000,
      trackPerformance = true,
      ...fetchOptions
    } = options;

    const url = this.buildUrl(endpoint);
    let attempt = 0;
    let lastError: Error | null = null;

    // Start tracking performance
    let benchmarkName: string | undefined;
    if (trackPerformance) {
      benchmarkName = `API ${fetchOptions.method || 'GET'} ${endpoint}`;
      benchmark.start(benchmarkName);
    }

    const startTime = Date.now();

    // Create controller for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      while (attempt < retries) {
        try {
          attempt++;

          const requestOptions: RequestInit = {
            ...fetchOptions,
            signal: controller.signal,
            headers: fetchOptions.headers || {}
          };

          // Add security headers
          const headers = new Headers(requestOptions.headers);
          applySecurityHeaders(headers);
          requestOptions.headers = headers;

          const response = await fetch(url, requestOptions);

          // Stop timeout
          clearTimeout(timeoutId);

          // Track API request
          if (trackPerformance) {
            trackApiRequest(startTime, endpoint, response.ok);
            if (benchmarkName) benchmark.end(benchmarkName);
          }

          if (!response.ok) {
            throw new Error(`HTTP error ${response.status}: ${response.statusText}`);
          }

          return await response.json() as T;
        } catch (error) {
          if (error instanceof Error) {
            lastError = error;

            // Don't retry if aborted or if max retries reached
            if (error.name === 'AbortError' || attempt >= retries) {
              throw error;
            }

            // Wait before retry
            await new Promise(resolve => setTimeout(resolve, retryDelay * attempt));
          } else {
            throw error;
          }
        }
      }

      throw lastError || new Error('Request failed after retries');
    } catch (error) {
      // Track error
      if (error instanceof Error) {
        trackError(error, `API request to ${endpoint}`, false);
      }

      // Clean up timeout
      clearTimeout(timeoutId);

      // End performance tracking
      if (trackPerformance && benchmarkName) {
        benchmark.end(benchmarkName);
      }

      throw error;
    }
  }

  /**
   * Build complete URL from endpoint
   */
  private buildUrl(endpoint: string): string {
    if (endpoint.startsWith('http')) {
      return endpoint;
    }

    const base = this.baseUrl.endsWith('/')
      ? this.baseUrl.slice(0, -1)
      : this.baseUrl;

    const path = endpoint.startsWith('/')
      ? endpoint
      : `/${endpoint}`;

    return `${base}${path}`;
  }
}

// Export singleton instance for global use
export const apiClient = new ModuleAPIClient();

// For specific API services
export default ModuleAPIClient;
