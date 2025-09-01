'use client';
import { useAuthenticatedApi } from "@/lib/auth-fetch";


import { apiUrl } from '@/lib/utils';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Progress } from '../ui/progress';
import { Alert, AlertDescription } from '../ui/alert';
import { 
  Activity, 
  Database, 
  Zap, 
  Clock, 
  AlertTriangle, 
  CheckCircle, 
  RefreshCw,
  TrendingUp,
  Server,
  HardDrive
} from 'lucide-react';

interface PerformanceData {
  timestamp: string;
  timeWindow: number;
  performance: {
    general: {
      count: number;
      avg: number;
      min: number;
      max: number;
      p95: number;
      p99: number;
    };
    queries: {
      total: number;
      successful: number;
      failed: number;
      avgDuration: number;
      slowQueries: number;
      queryTypes: Record<string, number>;
    };
    apis: {
      total: number;
      avgDuration: number;
      statusCodes: Record<string, number>;
      endpoints: Record<string, number>;
      methods: Record<string, number>;
    };
  };
  database: {
    pool: {
      totalConnections: number;
      activeConnections: number;
      idleConnections: number;
      queuedRequests: number;
      totalQueries: number;
      averageQueryTime: number;
      slowQueries: number;
    };
    slowQueries: Array<{
      query: string;
      duration: number;
      timestamp: string;
    }>;
    errorQueries: Array<{
      query: string;
      error: string;
      timestamp: string;
    }>;
  };
  cache: {
    stats: {
      type: 'redis' | 'memory';
      keys: number;
      memoryUsage?: number;
      redisInfo?: any;
    };
    health: {
      status: 'healthy' | 'degraded' | 'unhealthy';
      details: string;
    };
  };
  system: {
    memory: {
      rss: number;
      heapTotal: number;
      heapUsed: number;
      external: number;
    };
    uptime: number;
    nodeVersion: string;
    platform: string;
    arch: string;
  };
}

export function PerformanceMonitor() {
  const api = useAuthenticatedApi();
  const [data, setData] = useState<PerformanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(30000); // 30 seconds

  const fetchPerformanceData = async () => {
    try {
      setLoading(true);
      const result = await api(apiUrl('performance?recommendations=false'));
      if (!result.success) {
        throw new Error('Failed to fetch performance data');
      }
      
      setData(result);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const clearMetrics = async (action: string) => {
    try {
      const result = await api(apiUrl('performance'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      });
      
      if (result.success) {
        await fetchPerformanceData();
      }
    } catch (err) {
      console.error('Failed to clear metrics:', err);
    }
  };

  useEffect(() => {
    fetchPerformanceData();
  }, []);

  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(fetchPerformanceData, refreshInterval);
    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval]);

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms.toFixed(0)}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${days}d ${hours}h ${minutes}m`;
  };

  if (loading && !data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Performance Monitor
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center p-8">
            <RefreshCw className="h-6 w-6 animate-spin" />
            <span className="ml-2">Loading performance data...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Performance Monitor
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Failed to load performance data: {error}
            </AlertDescription>
          </Alert>
          <Button onClick={fetchPerformanceData} className="mt-4">
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  const dbPoolUsage = data.database.pool.totalConnections > 0 
    ? (data.database.pool.activeConnections / data.database.pool.totalConnections) * 100 
    : 0;

  const memoryUsage = data.system.memory.heapTotal > 0
    ? (data.system.memory.heapUsed / data.system.memory.heapTotal) * 100
    : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Performance Monitor</h2>
          <p className="text-muted-foreground">
            Last updated: {new Date(data.timestamp).toLocaleString()}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            {autoRefresh ? (
              <CheckCircle className="h-4 w-4 mr-2" />
            ) : (
              <Clock className="h-4 w-4 mr-2" />
            )}
            Auto Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchPerformanceData}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">API Requests</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.performance.apis.total}</div>
            <p className="text-xs text-muted-foreground">
              Avg: {formatDuration(data.performance.apis.avgDuration)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">DB Queries</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.performance.queries.total}</div>
            <p className="text-xs text-muted-foreground">
              {data.performance.queries.slowQueries} slow queries
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cache Status</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Badge variant={data.cache.health.status === 'healthy' ? 'default' : 'secondary'}>
                {data.cache.stats.type}
              </Badge>
              <span className="text-sm">{data.cache.stats.keys} keys</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {data.cache.health.details}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Health</CardTitle>
            <Server className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatUptime(data.system.uptime)}</div>
            <p className="text-xs text-muted-foreground">
              Memory: {memoryUsage.toFixed(1)}%
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Tabs */}
      <Tabs defaultValue="database" className="space-y-4">
        <TabsList>
          <TabsTrigger value="database">Database</TabsTrigger>
          <TabsTrigger value="api">API Performance</TabsTrigger>
          <TabsTrigger value="cache">Cache</TabsTrigger>
          <TabsTrigger value="system">System</TabsTrigger>
        </TabsList>

        <TabsContent value="database" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Connection Pool</CardTitle>
                <CardDescription>Database connection pool status</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Pool Usage</span>
                    <span>{dbPoolUsage.toFixed(1)}%</span>
                  </div>
                  <Progress value={dbPoolUsage} />
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Active:</span>
                    <span className="ml-2 font-medium">{data.database.pool.activeConnections}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Idle:</span>
                    <span className="ml-2 font-medium">{data.database.pool.idleConnections}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Total:</span>
                    <span className="ml-2 font-medium">{data.database.pool.totalConnections}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Queued:</span>
                    <span className="ml-2 font-medium">{data.database.pool.queuedRequests}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Query Performance</CardTitle>
                <CardDescription>Database query statistics</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Success Rate:</span>
                    <span className="ml-2 font-medium">
                      {data.performance.queries.total > 0 
                        ? ((data.performance.queries.successful / data.performance.queries.total) * 100).toFixed(1)
                        : 0}%
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Avg Duration:</span>
                    <span className="ml-2 font-medium">
                      {formatDuration(data.performance.queries.avgDuration)}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Failed:</span>
                    <span className="ml-2 font-medium">{data.performance.queries.failed}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Slow:</span>
                    <span className="ml-2 font-medium">{data.performance.queries.slowQueries}</span>
                  </div>
                </div>
                
                {Object.keys(data.performance.queries.queryTypes).length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium mb-2">Query Types</h4>
                    <div className="space-y-1">
                      {Object.entries(data.performance.queries.queryTypes).map(([type, count]) => (
                        <div key={type} className="flex justify-between text-sm">
                          <span>{type}</span>
                          <span>{count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Slow Queries */}
          {data.database.slowQueries.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Slow Queries</CardTitle>
                <CardDescription>Queries taking longer than expected</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {data.database.slowQueries.map((query, index) => (
                    <div key={index} className="border rounded p-3 space-y-1">
                      <div className="flex justify-between items-center">
                        <Badge variant="destructive">{formatDuration(query.duration)}</Badge>
                        <span className="text-xs text-muted-foreground">
                          {new Date(query.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      <code className="text-xs bg-muted p-1 rounded block">
                        {query.query}
                      </code>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="api" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Status Codes</CardTitle>
                <CardDescription>HTTP response status distribution</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {Object.entries(data.performance.apis.statusCodes).map(([code, count]) => (
                    <div key={code} className="flex justify-between items-center">
                      <Badge variant={code.startsWith('2') ? 'default' : 'destructive'}>
                        {code}
                      </Badge>
                      <span>{count}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Top Endpoints</CardTitle>
                <CardDescription>Most frequently accessed endpoints</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {Object.entries(data.performance.apis.endpoints)
                    .sort(([,a], [,b]) => b - a)
                    .slice(0, 5)
                    .map(([endpoint, count]) => (
                      <div key={endpoint} className="flex justify-between text-sm">
                        <span className="truncate">{endpoint}</span>
                        <span>{count}</span>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="cache" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Cache Statistics</CardTitle>
              <CardDescription>Cache performance and health</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <Badge variant={data.cache.health.status === 'healthy' ? 'default' : 'secondary'}>
                  {data.cache.stats.type.toUpperCase()}
                </Badge>
                <Badge variant={
                  data.cache.health.status === 'healthy' ? 'default' : 
                  data.cache.health.status === 'degraded' ? 'secondary' : 'destructive'
                }>
                  {data.cache.health.status}
                </Badge>
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Keys:</span>
                  <span className="ml-2 font-medium">{data.cache.stats.keys}</span>
                </div>
                {data.cache.stats.memoryUsage && (
                  <div>
                    <span className="text-muted-foreground">Memory:</span>
                    <span className="ml-2 font-medium">{formatBytes(data.cache.stats.memoryUsage)}</span>
                  </div>
                )}
              </div>
              
              <p className="text-sm text-muted-foreground">
                {data.cache.health.details}
              </p>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => clearMetrics('clear_cache')}
                >
                  Clear Cache
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="system" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Memory Usage</CardTitle>
                <CardDescription>Node.js memory consumption</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Heap Usage</span>
                    <span>{memoryUsage.toFixed(1)}%</span>
                  </div>
                  <Progress value={memoryUsage} />
                </div>
                
                <div className="grid grid-cols-1 gap-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">RSS:</span>
                    <span>{formatBytes(data.system.memory.rss)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Heap Total:</span>
                    <span>{formatBytes(data.system.memory.heapTotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Heap Used:</span>
                    <span>{formatBytes(data.system.memory.heapUsed)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">External:</span>
                    <span>{formatBytes(data.system.memory.external)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>System Info</CardTitle>
                <CardDescription>Runtime environment details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Uptime:</span>
                  <span>{formatUptime(data.system.uptime)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Node.js:</span>
                  <span>{data.system.nodeVersion}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Platform:</span>
                  <span>{data.system.platform}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Architecture:</span>
                  <span>{data.system.arch}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Actions</CardTitle>
          <CardDescription>Performance monitoring actions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => clearMetrics('clear_metrics')}
            >
              Clear Metrics
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => clearMetrics('clear_query_cache')}
            >
              Clear Query Cache
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => clearMetrics('clear_all')}
            >
              Clear All
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}