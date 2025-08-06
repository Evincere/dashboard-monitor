// src/lib/performance-monitor.ts

/**
 * @fileOverview Performance monitoring and metrics collection service
 */

interface PerformanceMetric {
  name: string;
  value: number;
  timestamp: number;
  labels?: Record<string, string>;
}

interface QueryMetric {
  query: string;
  duration: number;
  timestamp: number;
  success: boolean;
  error?: string;
}

interface APIMetric {
  endpoint: string;
  method: string;
  statusCode: number;
  duration: number;
  timestamp: number;
  userAgent?: string;
  ip?: string;
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private queryMetrics: QueryMetric[] = [];
  private apiMetrics: APIMetric[] = [];
  private maxMetrics = 10000; // Keep last 10k metrics

  /**
   * Record a custom metric
   */
  recordMetric(name: string, value: number, labels?: Record<string, string>): void {
    this.metrics.push({
      name,
      value,
      timestamp: Date.now(),
      labels
    });

    // Cleanup old metrics
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics);
    }
  }

  /**
   * Record database query performance
   */
  recordQuery(query: string, duration: number, success: boolean, error?: string): void {
    this.queryMetrics.push({
      query: query.substring(0, 200), // Truncate long queries
      duration,
      timestamp: Date.now(),
      success,
      error
    });

    // Cleanup old metrics
    if (this.queryMetrics.length > this.maxMetrics) {
      this.queryMetrics = this.queryMetrics.slice(-this.maxMetrics);
    }

    // Record as general metric
    this.recordMetric('db_query_duration', duration, {
      success: success.toString(),
      query_type: this.getQueryType(query)
    });
  }

  /**
   * Record API endpoint performance
   */
  recordAPI(endpoint: string, method: string, statusCode: number, duration: number, userAgent?: string, ip?: string): void {
    this.apiMetrics.push({
      endpoint,
      method,
      statusCode,
      duration,
      timestamp: Date.now(),
      userAgent,
      ip
    });

    // Cleanup old metrics
    if (this.apiMetrics.length > this.maxMetrics) {
      this.apiMetrics = this.apiMetrics.slice(-this.maxMetrics);
    }

    // Record as general metric
    this.recordMetric('api_request_duration', duration, {
      endpoint,
      method,
      status: statusCode.toString()
    });
  }

  /**
   * Get query type from SQL
   */
  private getQueryType(query: string): string {
    const trimmed = query.trim().toUpperCase();
    if (trimmed.startsWith('SELECT')) return 'SELECT';
    if (trimmed.startsWith('INSERT')) return 'INSERT';
    if (trimmed.startsWith('UPDATE')) return 'UPDATE';
    if (trimmed.startsWith('DELETE')) return 'DELETE';
    if (trimmed.startsWith('CREATE')) return 'CREATE';
    if (trimmed.startsWith('ALTER')) return 'ALTER';
    if (trimmed.startsWith('DROP')) return 'DROP';
    return 'OTHER';
  }

  /**
   * Get performance statistics
   */
  getStats(timeWindow: number = 300000): { // 5 minutes default
    general: any;
    queries: any;
    apis: any;
  } {
    const now = Date.now();
    const cutoff = now - timeWindow;

    // Filter recent metrics
    const recentMetrics = this.metrics.filter(m => m.timestamp > cutoff);
    const recentQueries = this.queryMetrics.filter(m => m.timestamp > cutoff);
    const recentAPIs = this.apiMetrics.filter(m => m.timestamp > cutoff);

    return {
      general: this.calculateGeneralStats(recentMetrics),
      queries: this.calculateQueryStats(recentQueries),
      apis: this.calculateAPIStats(recentAPIs)
    };
  }

  /**
   * Calculate general performance statistics
   */
  private calculateGeneralStats(metrics: PerformanceMetric[]) {
    if (metrics.length === 0) {
      return { count: 0, avg: 0, min: 0, max: 0, p95: 0, p99: 0 };
    }

    const values = metrics.map(m => m.value).sort((a, b) => a - b);
    const count = values.length;
    const sum = values.reduce((a, b) => a + b, 0);

    return {
      count,
      avg: sum / count,
      min: values[0],
      max: values[count - 1],
      p95: values[Math.floor(count * 0.95)] || 0,
      p99: values[Math.floor(count * 0.99)] || 0
    };
  }

  /**
   * Calculate query performance statistics
   */
  private calculateQueryStats(queries: QueryMetric[]) {
    if (queries.length === 0) {
      return { 
        total: 0, 
        successful: 0, 
        failed: 0, 
        avgDuration: 0, 
        slowQueries: 0,
        queryTypes: {}
      };
    }

    const successful = queries.filter(q => q.success);
    const failed = queries.filter(q => !q.success);
    const slowQueries = queries.filter(q => q.duration > 1000);
    
    const durations = queries.map(q => q.duration);
    const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;

    // Group by query type
    const queryTypes: Record<string, number> = {};
    queries.forEach(q => {
      const type = this.getQueryType(q.query);
      queryTypes[type] = (queryTypes[type] || 0) + 1;
    });

    return {
      total: queries.length,
      successful: successful.length,
      failed: failed.length,
      avgDuration,
      slowQueries: slowQueries.length,
      queryTypes
    };
  }

  /**
   * Calculate API performance statistics
   */
  private calculateAPIStats(apis: APIMetric[]) {
    if (apis.length === 0) {
      return {
        total: 0,
        avgDuration: 0,
        statusCodes: {},
        endpoints: {},
        methods: {}
      };
    }

    const durations = apis.map(a => a.duration);
    const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;

    // Group by status code
    const statusCodes: Record<string, number> = {};
    apis.forEach(a => {
      const status = a.statusCode.toString();
      statusCodes[status] = (statusCodes[status] || 0) + 1;
    });

    // Group by endpoint
    const endpoints: Record<string, number> = {};
    apis.forEach(a => {
      endpoints[a.endpoint] = (endpoints[a.endpoint] || 0) + 1;
    });

    // Group by method
    const methods: Record<string, number> = {};
    apis.forEach(a => {
      methods[a.method] = (methods[a.method] || 0) + 1;
    });

    return {
      total: apis.length,
      avgDuration,
      statusCodes,
      endpoints,
      methods
    };
  }

  /**
   * Get slow queries
   */
  getSlowQueries(limit: number = 10, threshold: number = 1000): QueryMetric[] {
    return this.queryMetrics
      .filter(q => q.duration > threshold)
      .sort((a, b) => b.duration - a.duration)
      .slice(0, limit);
  }

  /**
   * Get error queries
   */
  getErrorQueries(limit: number = 10): QueryMetric[] {
    return this.queryMetrics
      .filter(q => !q.success)
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }

  /**
   * Export metrics in Prometheus format
   */
  exportPrometheusMetrics(): string {
    const stats = this.getStats();
    const lines: string[] = [];

    // API metrics
    lines.push('# HELP api_requests_total Total number of API requests');
    lines.push('# TYPE api_requests_total counter');
    lines.push(`api_requests_total ${stats.apis.total}`);

    lines.push('# HELP api_request_duration_seconds API request duration');
    lines.push('# TYPE api_request_duration_seconds histogram');
    lines.push(`api_request_duration_seconds_sum ${stats.apis.avgDuration * stats.apis.total / 1000}`);
    lines.push(`api_request_duration_seconds_count ${stats.apis.total}`);

    // Database metrics
    lines.push('# HELP db_queries_total Total number of database queries');
    lines.push('# TYPE db_queries_total counter');
    lines.push(`db_queries_total ${stats.queries.total}`);

    lines.push('# HELP db_query_duration_seconds Database query duration');
    lines.push('# TYPE db_query_duration_seconds histogram');
    lines.push(`db_query_duration_seconds_sum ${stats.queries.avgDuration * stats.queries.total / 1000}`);
    lines.push(`db_query_duration_seconds_count ${stats.queries.total}`);

    lines.push('# HELP db_slow_queries_total Total number of slow queries');
    lines.push('# TYPE db_slow_queries_total counter');
    lines.push(`db_slow_queries_total ${stats.queries.slowQueries}`);

    return lines.join('\n');
  }

  /**
   * Clear all metrics
   */
  clear(): void {
    this.metrics = [];
    this.queryMetrics = [];
    this.apiMetrics = [];
  }
}

// Global performance monitor instance
export const performanceMonitor = new PerformanceMonitor();

/**
 * Middleware to measure API performance
 */
export function measureAPIPerformance(req: any, res: any, next: any): void {
  const start = Date.now();
  const originalSend = res.send;

  res.send = function(data: any) {
    const duration = Date.now() - start;
    const endpoint = req.route?.path || req.url;
    const method = req.method;
    const statusCode = res.statusCode;
    const userAgent = req.get('User-Agent');
    const ip = req.ip || req.connection.remoteAddress;

    performanceMonitor.recordAPI(endpoint, method, statusCode, duration, userAgent, ip);
    
    return originalSend.call(this, data);
  };

  next();
}

/**
 * Decorator to measure function performance
 */
export function measurePerformance(metricName?: string) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;
    const name = metricName || `${target.constructor.name}.${propertyName}`;

    descriptor.value = async function (...args: any[]) {
      const start = Date.now();
      let success = true;
      let error: string | undefined;

      try {
        const result = await method.apply(this, args);
        return result;
      } catch (err) {
        success = false;
        error = err instanceof Error ? err.message : 'Unknown error';
        throw err;
      } finally {
        const duration = Date.now() - start;
        performanceMonitor.recordMetric(name, duration, { success: success.toString() });
      }
    };
  };
}