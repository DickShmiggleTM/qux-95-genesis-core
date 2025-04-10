
/**
 * Performance Benchmarking Utility
 * 
 * Provides tools for measuring and optimizing application performance
 */

interface BenchmarkResult {
  name: string;
  duration: number;
  startTime: number;
  endTime: number;
  memory?: {
    before: number;
    after: number;
    difference: number;
  };
}

class PerformanceBenchmark {
  private results: BenchmarkResult[] = [];
  private ongoing: Map<string, number> = new Map();
  private benchmarkActive: boolean = false;
  
  /**
   * Start measuring performance for a named operation
   * @param name Operation name
   * @param trackMemory Whether to track memory usage (can impact performance)
   * @returns Time when measurement started
   */
  start(name: string, trackMemory: boolean = false): number {
    const startTime = performance.now();
    this.ongoing.set(name, startTime);
    
    // Track memory if requested
    let memoryBefore: number | undefined;
    if (trackMemory && window.performance && 'memory' in window.performance) {
      const memory = (window.performance as any).memory;
      memoryBefore = memory?.usedJSHeapSize;
    }
    
    // Store memory measurement
    if (memoryBefore !== undefined) {
      this.ongoing.set(`${name}_memory`, memoryBefore);
    }
    
    return startTime;
  }
  
  /**
   * End measuring performance for a named operation
   * @param name Operation name
   * @returns Duration in milliseconds
   */
  end(name: string): number | null {
    const endTime = performance.now();
    const startTime = this.ongoing.get(name);
    
    if (startTime === undefined) {
      console.warn(`No benchmark started for "${name}"`);
      return null;
    }
    
    const duration = endTime - startTime;
    this.ongoing.delete(name);
    
    // Check for memory measurements
    let memory: BenchmarkResult['memory'] | undefined;
    const memoryBeforeKey = `${name}_memory`;
    const memoryBefore = this.ongoing.get(memoryBeforeKey);
    
    if (memoryBefore !== undefined) {
      this.ongoing.delete(memoryBeforeKey);
      
      if (window.performance && 'memory' in window.performance) {
        const memoryAfter = (window.performance as any).memory?.usedJSHeapSize;
        if (memoryBefore !== undefined && memoryAfter !== undefined) {
          memory = {
            before: memoryBefore,
            after: memoryAfter,
            difference: memoryAfter - memoryBefore
          };
        }
      }
    }
    
    // Store result
    const result: BenchmarkResult = {
      name,
      duration,
      startTime,
      endTime,
      memory
    };
    
    this.results.push(result);
    
    // Log if benchmarking is active
    if (this.benchmarkActive) {
      this.logResult(result);
    }
    
    return duration;
  }
  
  /**
   * Measure execution time of a function
   * @param fn Function to measure
   * @param name Optional name for the measurement
   * @returns Function result
   */
  measure<T>(fn: () => T, name?: string): T {
    const fnName = name || fn.name || 'anonymous';
    this.start(fnName);
    const result = fn();
    this.end(fnName);
    return result;
  }
  
  /**
   * Measure execution time of an async function
   * @param fn Async function to measure
   * @param name Optional name for the measurement
   * @returns Promise resolving to function result
   */
  async measureAsync<T>(fn: () => Promise<T>, name?: string): Promise<T> {
    const fnName = name || fn.name || 'anonymous_async';
    this.start(fnName);
    try {
      const result = await fn();
      this.end(fnName);
      return result;
    } catch (error) {
      this.end(fnName);
      throw error;
    }
  }
  
  /**
   * Enable logging benchmark results to console
   */
  enableBenchmarking(): void {
    this.benchmarkActive = true;
  }
  
  /**
   * Disable logging benchmark results
   */
  disableBenchmarking(): void {
    this.benchmarkActive = false;
  }
  
  /**
   * Get all benchmark results
   */
  getResults(): BenchmarkResult[] {
    return [...this.results];
  }
  
  /**
   * Clear all benchmark results
   */
  clearResults(): void {
    this.results = [];
  }
  
  /**
   * Log a single benchmark result
   */
  private logResult(result: BenchmarkResult): void {
    const memoryText = result.memory 
      ? ` | Memory: ${(result.memory.difference / 1024 / 1024).toFixed(2)} MB` 
      : '';
      
    console.log(
      `%c📊 ${result.name}: ${result.duration.toFixed(2)}ms${memoryText}`, 
      'color: #8c54fe; font-weight: bold;'
    );
  }
  
  /**
   * Generate a performance report
   * @returns Report text
   */
  generateReport(): string {
    if (this.results.length === 0) {
      return 'No benchmark results available';
    }
    
    let report = '📊 Performance Benchmark Report\n\n';
    
    // Group by operation name
    const groupedResults = this.results.reduce((acc, result) => {
      if (!acc[result.name]) {
        acc[result.name] = [];
      }
      acc[result.name].push(result);
      return acc;
    }, {} as Record<string, BenchmarkResult[]>);
    
    // Generate stats for each group
    Object.entries(groupedResults).forEach(([name, results]) => {
      const durations = results.map(r => r.duration);
      const avg = durations.reduce((sum, d) => sum + d, 0) / durations.length;
      const min = Math.min(...durations);
      const max = Math.max(...durations);
      
      report += `${name}:\n`;
      report += `  Calls: ${results.length}\n`;
      report += `  Avg: ${avg.toFixed(2)}ms\n`;
      report += `  Min: ${min.toFixed(2)}ms\n`;
      report += `  Max: ${max.toFixed(2)}ms\n`;
      
      // Add memory stats if available
      const memoryResults = results.filter(r => r.memory);
      if (memoryResults.length > 0) {
        const avgMemory = memoryResults.reduce((sum, r) => sum + (r.memory?.difference || 0), 0) / memoryResults.length;
        report += `  Avg Memory Delta: ${(avgMemory / 1024 / 1024).toFixed(2)} MB\n`;
      }
      
      report += '\n';
    });
    
    return report;
  }
}

// Export singleton instance
export const benchmark = new PerformanceBenchmark();

// Enable in development mode
if (import.meta.env.DEV) {
  benchmark.enableBenchmarking();
}
