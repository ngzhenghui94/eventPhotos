/**
 * Performance monitoring utilities for backend operations
 */
export class PerformanceUtils {
  private static metrics: Map<string, { count: number; totalTime: number; avgTime: number }> = new Map();

  /**
   * Wraps a function with performance monitoring
   */
  static async withTiming<T>(
    operationName: string,
    operation: () => Promise<T>,
    logSlow = true,
    slowThreshold = 1000 // milliseconds
  ): Promise<T> {
    const startTime = Date.now();
    
    try {
      const result = await operation();
      const endTime = Date.now();
      const duration = endTime - startTime;

      // Update metrics
      this.updateMetrics(operationName, duration);

      // Log slow operations
      if (logSlow && duration > slowThreshold) {
        console.warn(`Slow operation detected: ${operationName} took ${duration}ms`);
      }

      return result;
    } catch (error) {
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      console.error(`Operation failed: ${operationName} took ${duration}ms`, error);
      throw error;
    }
  }

  /**
   * Updates performance metrics
   */
  private static updateMetrics(operationName: string, duration: number): void {
    const existing = this.metrics.get(operationName);
    
    if (existing) {
      existing.count += 1;
      existing.totalTime += duration;
      existing.avgTime = existing.totalTime / existing.count;
    } else {
      this.metrics.set(operationName, {
        count: 1,
        totalTime: duration,
        avgTime: duration,
      });
    }
  }

  /**
   * Gets performance metrics for all operations
   */
  static getMetrics(): Record<string, { count: number; totalTime: number; avgTime: number }> {
    const result: Record<string, any> = {};
    
    for (const [key, value] of this.metrics.entries()) {
      result[key] = { ...value };
    }
    
    return result;
  }

  /**
   * Resets all performance metrics
   */
  static resetMetrics(): void {
    this.metrics.clear();
  }

  /**
   * Logs performance summary
   */
  static logSummary(): void {
    if (this.metrics.size === 0) {
      console.log('No performance metrics available');
      return;
    }

    console.log('\n=== Performance Metrics Summary ===');
    
    const sortedMetrics = Array.from(this.metrics.entries())
      .sort(([, a], [, b]) => b.avgTime - a.avgTime);

    for (const [operation, metrics] of sortedMetrics) {
      console.log(`${operation}:`);
      console.log(`  - Calls: ${metrics.count}`);
      console.log(`  - Total: ${metrics.totalTime}ms`);
      console.log(`  - Average: ${Math.round(metrics.avgTime)}ms`);
    }
    
    console.log('=====================================\n');
  }

  /**
   * Creates a simple profiler for a code block
   */
  static createProfiler(name: string) {
    const startTime = Date.now();
    
    return {
      end: () => {
        const duration = Date.now() - startTime;
        console.log(`[PROFILE] ${name}: ${duration}ms`);
        return duration;
      }
    };
  }

  /**
   * Memory usage helper
   */
  static logMemoryUsage(label = 'Memory Usage'): void {
    if (typeof process !== 'undefined' && process.memoryUsage) {
      const usage = process.memoryUsage();
      const formatMB = (bytes: number) => Math.round(bytes / 1024 / 1024 * 100) / 100;
      
      console.log(`[${label}]`);
      console.log(`  RSS: ${formatMB(usage.rss)}MB`);
      console.log(`  Heap Used: ${formatMB(usage.heapUsed)}MB`);
      console.log(`  Heap Total: ${formatMB(usage.heapTotal)}MB`);
    }
  }
}

// Enhanced database error handling with performance monitoring
export async function withDatabasePerformanceMonitoring<T>(
  operation: () => Promise<T>,
  operationName: string
): Promise<T> {
  return PerformanceUtils.withTiming(
    `DB_${operationName}`,
    operation,
    true,
    500 // Database operations should be faster than 500ms
  );
}