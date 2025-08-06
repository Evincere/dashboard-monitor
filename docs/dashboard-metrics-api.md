# Dashboard Metrics API Documentation

## Overview

The Dashboard Metrics API provides real-time statistics and analytics for the MPD Concursos system. It includes optimized SQL queries, connection pooling, and in-memory caching for optimal performance.

## Architecture

### Components

1. **Connection Pooling**: MySQL connection pool with configurable limits
2. **In-Memory Caching**: 30-second cache for all metrics to reduce database load
3. **Optimized Queries**: Parallel execution of SQL queries for better performance
4. **Error Handling**: Comprehensive error handling with proper HTTP status codes

### Cache Strategy

- **Duration**: 30 seconds default (configurable)
- **Storage**: In-memory using Map data structure
- **Cleanup**: Automatic cleanup of expired entries
- **Statistics**: Cache hit/miss tracking and memory usage monitoring

## API Endpoints

### 1. Main Dashboard Metrics

**Endpoint**: `GET /api/dashboard/metrics`

**Description**: Returns the main dashboard metrics displayed on the homepage.

**Response**:
```json
{
  "activeUsers": 150,
  "activeContests": 3,
  "processedDocs": 15829,
  "inscriptions": 87,
  "storageUsed": 25.3,
  "cached": false,
  "timestamp": "2025-01-08T01:45:00.000Z"
}
```

**SQL Queries**:
- Users: `SELECT COUNT(*) as total FROM users`
- Active Contests: `SELECT COUNT(*) as total FROM contests WHERE status = 'active' OR status = 'ACTIVE'`
- Documents: `SELECT COUNT(*) as total FROM documents`
- Inscriptions: `SELECT COUNT(*) as total FROM inscriptions`
- Storage: `SELECT COUNT(*) as document_count, COALESCE(SUM(file_size), 0) as total_size_bytes FROM documents`

### 2. User Statistics

**Endpoint**: `GET /api/dashboard/users`

**Description**: Detailed user statistics including growth, roles, and status distribution.

**Response**:
```json
{
  "total": 150,
  "active": 142,
  "recent": 12,
  "byRole": [
    { "role": "ROLE_USER", "count": 140 },
    { "role": "ROLE_ADMIN", "count": 10 }
  ],
  "byStatus": [
    { "status": "ACTIVE", "count": 142 },
    { "status": "INACTIVE", "count": 8 }
  ],
  "growth": [
    { "month": "2024-07", "count": 25 },
    { "month": "2024-08", "count": 30 }
  ],
  "cached": false,
  "timestamp": "2025-01-08T01:45:00.000Z"
}
```

### 3. Contest Statistics

**Endpoint**: `GET /api/dashboard/contests`

**Description**: Contest analytics including status distribution and top contests by inscriptions.

**Response**:
```json
{
  "total": 15,
  "active": 3,
  "recent": 2,
  "byStatus": [
    { "status": "active", "count": 3 },
    { "status": "finished", "count": 12 }
  ],
  "byType": [
    { "type": "Concurso Público", "count": 10 },
    { "type": "Proceso de Selección", "count": 5 }
  ],
  "topContests": [
    {
      "id": 1,
      "title": "Concurso Administrativo 2024",
      "status": "active",
      "inscriptionCount": 45
    }
  ],
  "cached": false,
  "timestamp": "2025-01-08T01:45:00.000Z"
}
```

### 4. Document Statistics

**Endpoint**: `GET /api/dashboard/documents`

**Description**: Document management statistics including type distribution and storage metrics.

**Response**:
```json
{
  "total": 15829,
  "recent": 234,
  "byType": [
    { "type": "CV", "count": 5000 },
    { "type": "Certificado", "count": 4500 }
  ],
  "byStatus": [
    { "status": "validated", "count": 12000 },
    { "status": "pending", "count": 3829 }
  ],
  "storage": {
    "totalFiles": 15829,
    "totalSizeGB": 25.3,
    "avgSizeMB": 1.6,
    "maxSizeMB": 15.2,
    "minSizeMB": 0.1
  },
  "topUsers": [
    {
      "userName": "Juan Pérez",
      "userEmail": "juan@example.com",
      "documentCount": 15
    }
  ],
  "cached": false,
  "timestamp": "2025-01-08T01:45:00.000Z"
}
```

### 5. Inscription Statistics

**Endpoint**: `GET /api/dashboard/inscriptions`

**Description**: Inscription analytics including growth trends and contest distribution.

**Response**:
```json
{
  "total": 87,
  "recent": 15,
  "byStatus": [
    { "status": "confirmed", "count": 70 },
    { "status": "pending", "count": 17 }
  ],
  "byContest": [
    {
      "contestId": 1,
      "contestTitle": "Concurso Administrativo 2024",
      "count": 45
    }
  ],
  "growth": [
    { "month": "2024-07", "count": 20 },
    { "month": "2024-08", "count": 25 }
  ],
  "byMonth": [
    { "month": 1, "monthName": "January", "count": 10 },
    { "month": 2, "monthName": "February", "count": 15 }
  ],
  "cached": false,
  "timestamp": "2025-01-08T01:45:00.000Z"
}
```

### 6. Cache Management

**Endpoint**: `GET /api/dashboard/cache`

**Description**: Returns cache statistics and status.

**Response**:
```json
{
  "status": "success",
  "cache": {
    "size": 5,
    "keys": ["dashboard-metrics", "dashboard-users"],
    "totalMemory": 2048,
    "entries": [
      { "key": "dashboard-metrics", "data": "cached" },
      { "key": "dashboard-users", "data": "expired" }
    ]
  },
  "timestamp": "2025-01-08T01:45:00.000Z"
}
```

**Endpoint**: `DELETE /api/dashboard/cache`

**Description**: Clears all cached data.

**Response**:
```json
{
  "status": "success",
  "message": "Cache cleared successfully",
  "timestamp": "2025-01-08T01:45:00.000Z"
}
```

## Performance Optimizations

### 1. Connection Pooling

```typescript
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '3306'),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  acquireTimeout: 60000,
  timeout: 60000,
  reconnect: true
});
```

### 2. Parallel Query Execution

All related queries are executed in parallel using `Promise.all()` to minimize response time.

### 3. Intelligent Caching

- 30-second cache duration balances freshness with performance
- Automatic cache cleanup prevents memory leaks
- Cache statistics for monitoring and debugging

### 4. Optimized SQL Queries

- Use of `COALESCE()` for null handling
- Efficient `COUNT()` operations
- Proper indexing assumptions (primary keys, foreign keys)
- Date-based filtering with `DATE_SUB()` for recent data

## Error Handling

### Database Connection Errors

```json
{
  "error": "Failed to fetch dashboard metrics",
  "timestamp": "2025-01-08T01:45:00.000Z"
}
```

**HTTP Status**: 500

### Query Execution Errors

All SQL errors are caught and logged, returning a generic error message to prevent information disclosure.

## Environment Variables

```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_DATABASE=mpd_concursos
```

## Usage Examples

### Fetch Main Metrics

```javascript
const response = await fetch('/api/dashboard/metrics');
const data = await response.json();

if (data.cached) {
  console.log('Data served from cache');
}

console.log(`Active users: ${data.activeUsers}`);
```

### Clear Cache

```javascript
const response = await fetch('/api/dashboard/cache', {
  method: 'DELETE'
});

const result = await response.json();
console.log(result.message); // "Cache cleared successfully"
```

## Testing

### Unit Tests

- Cache utility functionality
- Error handling scenarios
- Data structure validation

### Integration Tests

- Database connectivity (requires live database)
- API response structure validation
- Cache behavior verification

Run tests:
```bash
npm test -- --run cache-utils.test.ts
```

## Monitoring

### Cache Statistics

Monitor cache performance using the `/api/dashboard/cache` endpoint:

- **Hit Rate**: Percentage of requests served from cache
- **Memory Usage**: Total memory consumed by cached data
- **Entry Count**: Number of cached items

### Database Performance

- Connection pool utilization
- Query execution times
- Error rates

## Security Considerations

1. **SQL Injection Prevention**: Using parameterized queries
2. **Error Information Disclosure**: Generic error messages in production
3. **Rate Limiting**: Consider implementing rate limiting for production
4. **Authentication**: Add authentication middleware for sensitive endpoints

## Future Enhancements

1. **Redis Integration**: Replace in-memory cache with Redis for scalability
2. **Query Optimization**: Add database indexes based on usage patterns
3. **Real-time Updates**: WebSocket integration for live metrics
4. **Metrics Aggregation**: Pre-computed metrics for better performance
5. **Monitoring Integration**: Prometheus/Grafana metrics export