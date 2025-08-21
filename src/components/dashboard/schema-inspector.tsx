'use client';

import { apiUrl } from '@/lib/utils';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { RefreshCw, Database, Table, Key, Link, Eye, Settings } from 'lucide-react';
import { SchemaDetails, TableDetails, ForeignKey, IndexDetails } from '@/services/database';

interface SchemaOverview {
  tablesCount: number;
  viewsCount: number;
  routinesCount: number;
  foreignKeysCount: number;
  indexesCount: number;
  totalColumns: number;
  schemaName: string;
  characterSet: string;
  collation: string;
  lastIntrospection: Date;
}

interface CacheInfo {
  isCached: boolean;
  cacheAge: number;
  remainingTime: number;
  cacheDuration: number;
  statistics: {
    totalHits: number;
    totalMisses: number;
    lastClearTime: Date | null;
    cacheSize: number;
  };
  tableCacheSize: number;
  tableCacheEntries: number;
}

interface DatabaseMetadata {
  version: string;
  versionComment: string;
  characterSet: string;
  collation: string;
  timezone: string;
  maxConnections: number;
  currentConnections: number;
  uptime: number;
  dataDirectory: string;
}

interface ValidationResult {
  isValid: boolean;
  issues: Array<{
    type: 'error' | 'warning' | 'info';
    table: string;
    column?: string;
    message: string;
    recommendation?: string;
  }>;
  summary: {
    totalIssues: number;
    errors: number;
    warnings: number;
    infos: number;
  };
}

export function SchemaInspector() {
  const [schema, setSchema] = useState<SchemaDetails | null>(null);
  const [overview, setOverview] = useState<SchemaOverview | null>(null);
  const [cacheInfo, setCacheInfo] = useState<CacheInfo | null>(null);
  const [metadata, setMetadata] = useState<DatabaseMetadata | null>(null);
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchOverview = async () => {
    try {
      const response = await fetch(apiUrl('schema?overview=true'));
      const result = await response.json();
      if (result.success) {
        setOverview(result.data);
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError('Failed to fetch schema overview');
    }
  };

  const fetchMetadata = async () => {
    try {
      const response = await fetch(apiUrl('schema?metadata=true'));
      const result = await response.json();
      if (result.success) {
        setMetadata(result.data);
      }
    } catch (err) {
      console.error('Failed to fetch metadata:', err);
    }
  };

  const fetchValidation = async () => {
    try {
      const response = await fetch(apiUrl('schema?validate=true'));
      const result = await response.json();
      if (result.success) {
        setValidation(result.data);
      }
    } catch (err) {
      console.error('Failed to fetch validation:', err);
    }
  };

  const fetchCacheInfo = async () => {
    try {
      const response = await fetch(apiUrl('schema?cache=info'));
      const result = await response.json();
      if (result.success) {
        setCacheInfo(result.data);
      }
    } catch (err) {
      console.error('Failed to fetch cache info:', err);
    }
  };

  const fetchSchema = async (refresh = false) => {
    setLoading(true);
    setError(null);
    try {
      const url = refresh ? apiUrl('schema?refresh=true') : apiUrl('schema');
      const response = await fetch(url);
      const result = await response.json();
      if (result.success) {
        setSchema(result.data);
        await Promise.all([
          fetchOverview(),
          fetchCacheInfo(),
          fetchMetadata(),
          fetchValidation()
        ]);
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError('Failed to fetch schema');
    } finally {
      setLoading(false);
    }
  };

  const clearCache = async () => {
    try {
      const response = await fetch(apiUrl('schema'), { method: 'DELETE' });
      const result = await response.json();
      if (result.success) {
        await fetchCacheInfo();
      }
    } catch (err) {
      console.error('Failed to clear cache:', err);
    }
  };

  useEffect(() => {
    fetchOverview();
    fetchCacheInfo();
    fetchMetadata();
    fetchValidation();
  }, []);

  const formatBytes = (bytes: number | null) => {
    if (!bytes) return 'N/A';
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDuration = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}m ${seconds}s`;
  };

  const renderTableDetails = (table: TableDetails) => (
    <Card key={table.name} className="mb-4">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Table className="h-4 w-4" />
            {table.name}
          </CardTitle>
          <Badge variant="outline">{table.engine}</Badge>
        </div>
        {table.comment && (
          <CardDescription>{table.comment}</CardDescription>
        )}
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div>
            <p className="text-sm font-medium">Rows</p>
            <p className="text-2xl font-bold">{table.rowCount?.toLocaleString() || 'N/A'}</p>
          </div>
          <div>
            <p className="text-sm font-medium">Columns</p>
            <p className="text-2xl font-bold">{table.columns.length}</p>
          </div>
          <div>
            <p className="text-sm font-medium">Data Size</p>
            <p className="text-2xl font-bold">{formatBytes(table.dataLength ?? null)}</p>
          </div>
          <div>
            <p className="text-sm font-medium">Index Size</p>
            <p className="text-2xl font-bold">{formatBytes(table.indexLength ?? null)}</p>
          </div>
        </div>

        <Tabs defaultValue="columns" className="w-full">
          <TabsList>
            <TabsTrigger value="columns">Columns</TabsTrigger>
            <TabsTrigger value="indexes">Indexes</TabsTrigger>
            <TabsTrigger value="relations">Relations</TabsTrigger>
          </TabsList>

          <TabsContent value="columns">
            <ScrollArea className="h-64">
              <div className="space-y-2">
                {table.columns.map((column) => (
                  <div key={column.name} className="flex items-center justify-between p-2 border rounded">
                    <div>
                      <span className="font-medium">{column.name}</span>
                      <Badge variant="secondary" className="ml-2">{column.type}</Badge>
                      {column.isPrimary && <Badge variant="outline" className="ml-1">PRIMARY</Badge>}
                      {!column.nullable && <Badge variant="outline" className="ml-1">NOT NULL</Badge>}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {column.defaultValue && `Default: ${column.defaultValue}`}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="indexes">
            <ScrollArea className="h-64">
              <div className="space-y-2">
                {schema?.indexes.filter(idx => idx.table === table.name).map((index) => (
                  <div key={index.name} className="flex items-center justify-between p-2 border rounded">
                    <div>
                      <span className="font-medium">{index.name}</span>
                      {index.isUnique && <Badge variant="outline" className="ml-2">UNIQUE</Badge>}
                      <Badge variant="secondary" className="ml-2">{index.type}</Badge>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {index.columns.join(', ')}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="relations">
            <ScrollArea className="h-64">
              <div className="space-y-2">
                {schema?.foreignKeys.filter(fk => fk.fromTable === table.name || fk.toTable === table.name).map((fk) => (
                  <div key={fk.name} className="flex items-center justify-between p-2 border rounded">
                    <div>
                      <span className="font-medium">{fk.name}</span>
                      <div className="text-sm text-muted-foreground">
                        {fk.fromTable}.{fk.fromColumns.join(', ')} → {fk.toTable}.{fk.toColumns.join(', ')}
                      </div>
                    </div>
                    <div className="text-sm">
                      <Badge variant="outline">ON UPDATE {fk.onUpdate || 'RESTRICT'}</Badge>
                      <Badge variant="outline" className="ml-1">ON DELETE {fk.onDelete || 'RESTRICT'}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      {/* Header with controls */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Database Schema Inspector</h2>
          <p className="text-muted-foreground">
            Complete database structure introspection with caching
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={clearCache}
            disabled={loading}
          >
            <Settings className="h-4 w-4 mr-2" />
            Clear Cache
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchSchema(true)}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Database Metadata */}
      {metadata && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-4 w-4" />
              Database Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm font-medium">Version</p>
                <p className="text-sm font-mono">{metadata.version}</p>
              </div>
              <div>
                <p className="text-sm font-medium">Connections</p>
                <p className="text-sm">{metadata.currentConnections} / {metadata.maxConnections}</p>
              </div>
              <div>
                <p className="text-sm font-medium">Uptime</p>
                <p className="text-sm">{formatDuration(metadata.uptime * 1000)}</p>
              </div>
              <div>
                <p className="text-sm font-medium">Timezone</p>
                <p className="text-sm">{metadata.timezone}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Cache Information */}
      {cacheInfo && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-4 w-4" />
              Cache Status & Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div>
                <p className="text-sm font-medium">Status</p>
                <Badge variant={cacheInfo.isCached ? "default" : "secondary"}>
                  {cacheInfo.isCached ? "Cached" : "Not Cached"}
                </Badge>
              </div>
              <div>
                <p className="text-sm font-medium">Cache Age</p>
                <p className="text-sm">{formatDuration(cacheInfo.cacheAge)}</p>
              </div>
              <div>
                <p className="text-sm font-medium">Remaining Time</p>
                <p className="text-sm">{formatDuration(cacheInfo.remainingTime)}</p>
              </div>
              <div>
                <p className="text-sm font-medium">Cache Duration</p>
                <p className="text-sm">{formatDuration(cacheInfo.cacheDuration)}</p>
              </div>
            </div>
            <Separator className="my-4" />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm font-medium">Cache Hits</p>
                <p className="text-2xl font-bold text-green-600">{cacheInfo.statistics.totalHits}</p>
              </div>
              <div>
                <p className="text-sm font-medium">Cache Misses</p>
                <p className="text-2xl font-bold text-red-600">{cacheInfo.statistics.totalMisses}</p>
              </div>
              <div>
                <p className="text-sm font-medium">Hit Rate</p>
                <p className="text-2xl font-bold text-blue-600">
                  {cacheInfo.statistics.totalHits + cacheInfo.statistics.totalMisses > 0
                    ? Math.round((cacheInfo.statistics.totalHits / (cacheInfo.statistics.totalHits + cacheInfo.statistics.totalMisses)) * 100)
                    : 0}%
                </p>
              </div>
              <div>
                <p className="text-sm font-medium">Table Cache Entries</p>
                <p className="text-2xl font-bold text-purple-600">{cacheInfo.tableCacheEntries}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Schema Validation */}
      {validation && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Schema Validation
              <Badge variant={validation.isValid ? "default" : "destructive"}>
                {validation.isValid ? "Valid" : "Issues Found"}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div>
                <p className="text-sm font-medium">Total Issues</p>
                <p className="text-2xl font-bold">{validation.summary.totalIssues}</p>
              </div>
              <div>
                <p className="text-sm font-medium">Errors</p>
                <p className="text-2xl font-bold text-red-600">{validation.summary.errors}</p>
              </div>
              <div>
                <p className="text-sm font-medium">Warnings</p>
                <p className="text-2xl font-bold text-yellow-600">{validation.summary.warnings}</p>
              </div>
              <div>
                <p className="text-sm font-medium">Info</p>
                <p className="text-2xl font-bold text-blue-600">{validation.summary.infos}</p>
              </div>
            </div>
            {validation.issues.length > 0 && (
              <>
                <Separator className="my-4" />
                <ScrollArea className="h-32">
                  <div className="space-y-2">
                    {validation.issues.slice(0, 5).map((issue, index) => (
                      <div key={index} className="flex items-start gap-2 p-2 border rounded">
                        <Badge variant={
                          issue.type === 'error' ? 'destructive' :
                            issue.type === 'warning' ? 'secondary' : 'outline'
                        }>
                          {issue.type}
                        </Badge>
                        <div className="flex-1">
                          <p className="text-sm font-medium">{issue.table}{issue.column && `.${issue.column}`}</p>
                          <p className="text-sm text-muted-foreground">{issue.message}</p>
                          {issue.recommendation && (
                            <p className="text-xs text-blue-600 mt-1">{issue.recommendation}</p>
                          )}
                        </div>
                      </div>
                    ))}
                    {validation.issues.length > 5 && (
                      <p className="text-sm text-muted-foreground text-center">
                        ... and {validation.issues.length - 5} more issues
                      </p>
                    )}
                  </div>
                </ScrollArea>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Schema Overview */}
      {overview && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-4 w-4" />
              Schema Overview: {overview.schemaName}
            </CardTitle>
            <CardDescription>
              Character Set: {overview.characterSet} | Collation: {overview.collation}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-600">{overview.tablesCount}</p>
                <p className="text-sm text-muted-foreground">Tables</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">{overview.totalColumns}</p>
                <p className="text-sm text-muted-foreground">Columns</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-purple-600">{overview.viewsCount}</p>
                <p className="text-sm text-muted-foreground">Views</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-orange-600">{overview.routinesCount}</p>
                <p className="text-sm text-muted-foreground">Routines</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-red-600">{overview.foreignKeysCount}</p>
                <p className="text-sm text-muted-foreground">Foreign Keys</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-yellow-600">{overview.indexesCount}</p>
                <p className="text-sm text-muted-foreground">Indexes</p>
              </div>
            </div>
            <Separator className="my-4" />
            <p className="text-sm text-muted-foreground">
              Last introspection: {new Date(overview.lastIntrospection).toLocaleString()}
            </p>
          </CardContent>
        </Card>
      )}

      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <p className="text-red-600">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Schema Details */}
      {schema && (
        <Tabs defaultValue="tables" className="w-full">
          <TabsList className="w-full">
            <TabsTrigger value="tables" className="flex-1">Tables ({schema.tables.length})</TabsTrigger>
            <TabsTrigger value="relationships" className="flex-1">Relationships ({schema.foreignKeys.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="tables">
            <div className="space-y-4">
              {schema.tables.map(renderTableDetails)}
            </div>
          </TabsContent>

          <TabsContent value="relationships">
            <div className="space-y-4">
              {schema.foreignKeys.map((fk) => (
                <Card key={fk.name}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Link className="h-4 w-4" />
                      {fk.name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">
                          {fk.fromTable}.{fk.fromColumns.join(', ')} → {fk.toTable}.{fk.toColumns.join(', ')}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Badge variant="outline">UPDATE {fk.onUpdate || 'RESTRICT'}</Badge>
                        <Badge variant="outline">DELETE {fk.onDelete || 'RESTRICT'}</Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      )}

      {!schema && !loading && (
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-muted-foreground mb-4">No schema data loaded</p>
            <Button onClick={() => fetchSchema()}>
              <Database className="h-4 w-4 mr-2" />
              Load Schema
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}