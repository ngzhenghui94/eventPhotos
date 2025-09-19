// Frontend performance monitoring utilities for photo loading

interface PerformanceMetric {
  name: string;
  value: number;
  timestamp: number;
  metadata?: Record<string, any>;
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private maxMetrics = 1000; // Prevent memory leaks

  // Track timing metrics
  time(name: string, metadata?: Record<string, any>): () => void {
    const startTime = performance.now();
    
    return () => {
      const duration = performance.now() - startTime;
      this.addMetric(name, duration, metadata);
    };
  }

  // Track custom metrics
  addMetric(name: string, value: number, metadata?: Record<string, any>) {
    this.metrics.push({
      name,
      value,
      timestamp: Date.now(),
      metadata
    });

    // Prevent memory leaks
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics / 2);
    }
  }

  // Get metrics by name
  getMetrics(name?: string): PerformanceMetric[] {
    if (!name) return [...this.metrics];
    return this.metrics.filter(m => m.name === name);
  }

  // Get average for a metric
  getAverage(name: string): number {
    const metrics = this.getMetrics(name);
    if (metrics.length === 0) return 0;
    return metrics.reduce((sum, m) => sum + m.value, 0) / metrics.length;
  }

  // Clear all metrics
  clear() {
    this.metrics = [];
  }

  // Generate performance report
  getReport(): Record<string, { count: number; average: number; min: number; max: number }> {
    const report: Record<string, { count: number; average: number; min: number; max: number }> = {};
    
    const metricNames = [...new Set(this.metrics.map(m => m.name))];
    
    for (const name of metricNames) {
      const values = this.metrics.filter(m => m.name === name).map(m => m.value);
      report[name] = {
        count: values.length,
        average: values.reduce((sum, v) => sum + v, 0) / values.length,
        min: Math.min(...values),
        max: Math.max(...values)
      };
    }

    return report;
  }
}

// Global performance monitor instance
export const performanceMonitor = new PerformanceMonitor();

// Helper function to measure async operations
export async function measureAsync<T>(
  name: string, 
  operation: () => Promise<T>,
  metadata?: Record<string, any>
): Promise<T> {
  const endTiming = performanceMonitor.time(name, metadata);
  
  try {
    const result = await operation();
    endTiming();
    return result;
  } catch (error) {
    endTiming();
    performanceMonitor.addMetric(`${name}_error`, 1, { 
      error: error instanceof Error ? error.message : String(error),
      ...metadata 
    });
    throw error;
  }
}

// Helper function to measure sync operations
export function measure<T>(
  name: string,
  operation: () => T,
  metadata?: Record<string, any>
): T {
  const endTiming = performanceMonitor.time(name, metadata);
  
  try {
    const result = operation();
    endTiming();
    return result;
  } catch (error) {
    endTiming();
    performanceMonitor.addMetric(`${name}_error`, 1, { 
      error: error instanceof Error ? error.message : String(error),
      ...metadata 
    });
    throw error;
  }
}

// Image loading performance tracking
export function trackImageLoad(photoId: number, type: 'thumbnail' | 'full') {
  const startTime = performance.now();
  
  return {
    onLoad: () => {
      const loadTime = performance.now() - startTime;
      performanceMonitor.addMetric(`image_load_${type}`, loadTime, { photoId });
    },
    onError: (error?: string) => {
      const loadTime = performance.now() - startTime;
      performanceMonitor.addMetric(`image_load_${type}_error`, loadTime, { 
        photoId, 
        error: error || 'Unknown error' 
      });
    }
  };
}

// Network request performance tracking
export function trackNetworkRequest(url: string, method: string = 'GET') {
  const startTime = performance.now();
  
  return {
    onSuccess: (statusCode: number) => {
      const duration = performance.now() - startTime;
      performanceMonitor.addMetric('network_request', duration, { 
        url, 
        method, 
        statusCode,
        success: true 
      });
    },
    onError: (statusCode?: number, error?: string) => {
      const duration = performance.now() - startTime;
      performanceMonitor.addMetric('network_request_error', duration, { 
        url, 
        method, 
        statusCode: statusCode || 0,
        error: error || 'Unknown error',
        success: false
      });
    }
  };
}

// Log performance report to console (development only)
export function logPerformanceReport() {
  if (process.env.NODE_ENV !== 'development') return;
  
  const report = performanceMonitor.getReport();
  console.group('🚀 Photo Loading Performance Report');
  
  Object.entries(report).forEach(([name, stats]) => {
    console.log(`${name}:`, {
      count: stats.count,
      average: `${stats.average.toFixed(2)}ms`,
      min: `${stats.min.toFixed(2)}ms`,
      max: `${stats.max.toFixed(2)}ms`
    });
  });
  
  console.groupEnd();
}

// Auto-log performance report every 30 seconds in development
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  setInterval(logPerformanceReport, 30000);
}