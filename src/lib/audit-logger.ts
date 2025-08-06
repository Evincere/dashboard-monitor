// src/lib/audit-logger.ts
import { getDatabaseConnection } from '@/services/database';
import type { ResultSetHeader } from 'mysql2';

export interface AuditLogEntry {
  id?: string;
  event: string;
  userId?: string;
  userRole?: string;
  ipAddress?: string;
  userAgent?: string;
  path?: string;
  method?: string;
  requestBody?: any;
  responseStatus?: number;
  responseTime?: number;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface SecurityEvent {
  event: string;
  userId?: string;
  userRole?: string;
  requiredRole?: string;
  ipAddress?: string;
  userAgent?: string;
  path?: string;
  requestCount?: number;
  limit?: number;
  threshold?: number;
  windowMs?: number;
  timestamp: Date;
  metadata?: Record<string, any>;
}

class AuditLogger {
  private logQueue: AuditLogEntry[] = [];
  private securityQueue: SecurityEvent[] = [];
  private isProcessing = false;
  private readonly batchSize = 50;
  private readonly flushInterval = 5000; // 5 seconds

  constructor() {
    // Process queues periodically
    setInterval(() => this.processQueues(), this.flushInterval);
    
    // Ensure logs are flushed on process exit
    process.on('SIGINT', () => this.flushAll());
    process.on('SIGTERM', () => this.flushAll());
  }

  async logActivity(entry: AuditLogEntry): Promise<void> {
    this.logQueue.push({
      ...entry,
      timestamp: entry.timestamp || new Date()
    });

    // Process immediately if queue is full
    if (this.logQueue.length >= this.batchSize) {
      await this.processQueues();
    }
  }

  async logSecurityEvent(event: SecurityEvent): Promise<void> {
    this.securityQueue.push({
      ...event,
      timestamp: event.timestamp || new Date()
    });

    // Log security events to console immediately for monitoring
    console.warn(`[SECURITY] ${event.event}:`, {
      userId: event.userId,
      ipAddress: event.ipAddress,
      path: event.path,
      timestamp: event.timestamp
    });

    // Process immediately for security events
    await this.processQueues();
  }

  private async processQueues(): Promise<void> {
    if (this.isProcessing || (this.logQueue.length === 0 && this.securityQueue.length === 0)) {
      return;
    }

    this.isProcessing = true;

    try {
      // Process audit logs
      if (this.logQueue.length > 0) {
        await this.flushAuditLogs();
      }

      // Process security events
      if (this.securityQueue.length > 0) {
        await this.flushSecurityEvents();
      }
    } catch (error) {
      console.error('Error processing audit queues:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  private async flushAuditLogs(): Promise<void> {
    const logsToProcess = this.logQueue.splice(0, this.batchSize);
    
    if (logsToProcess.length === 0) return;

    try {
      const connection = await getDatabaseConnection();

      // Create audit_logs table if it doesn't exist
      await connection.execute(`
        CREATE TABLE IF NOT EXISTS audit_logs (
          id BINARY(16) PRIMARY KEY DEFAULT (UUID_TO_BIN(UUID())),
          event VARCHAR(100) NOT NULL,
          user_id BINARY(16) NULL,
          user_role VARCHAR(50) NULL,
          ip_address VARCHAR(45) NULL,
          user_agent TEXT NULL,
          path VARCHAR(500) NULL,
          method VARCHAR(10) NULL,
          request_body JSON NULL,
          response_status INT NULL,
          response_time INT NULL,
          metadata JSON NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_event (event),
          INDEX idx_user_id (user_id),
          INDEX idx_ip_address (ip_address),
          INDEX idx_created_at (created_at)
        ) ENGINE=InnoDB
      `);

      // Insert logs in batch
      const values = logsToProcess.map(log => [
        log.event,
        log.userId ? `UNHEX(REPLACE('${log.userId}', '-', ''))` : null,
        log.userRole,
        log.ipAddress,
        log.userAgent,
        log.path,
        log.method,
        log.requestBody ? JSON.stringify(log.requestBody) : null,
        log.responseStatus,
        log.responseTime,
        log.metadata ? JSON.stringify(log.metadata) : null,
        log.timestamp
      ]);

      const placeholders = values.map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').join(', ');
      const flatValues = values.flat();

      await connection.execute(
        `INSERT INTO audit_logs (event, user_id, user_role, ip_address, user_agent, path, method, request_body, response_status, response_time, metadata, created_at) VALUES ${placeholders}`,
        flatValues
      );

      connection.release();
    } catch (error) {
      console.error('Error flushing audit logs:', error);
      // Re-add logs to queue for retry
      this.logQueue.unshift(...logsToProcess);
    }
  }

  private async flushSecurityEvents(): Promise<void> {
    const eventsToProcess = this.securityQueue.splice(0, this.batchSize);
    
    if (eventsToProcess.length === 0) return;

    try {
      const connection = await getDatabaseConnection();

      // Create security_events table if it doesn't exist
      await connection.execute(`
        CREATE TABLE IF NOT EXISTS security_events (
          id BINARY(16) PRIMARY KEY DEFAULT (UUID_TO_BIN(UUID())),
          event VARCHAR(100) NOT NULL,
          user_id BINARY(16) NULL,
          user_role VARCHAR(50) NULL,
          required_role VARCHAR(50) NULL,
          ip_address VARCHAR(45) NULL,
          user_agent TEXT NULL,
          path VARCHAR(500) NULL,
          request_count INT NULL,
          limit_value INT NULL,
          threshold_value INT NULL,
          window_ms INT NULL,
          metadata JSON NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_event (event),
          INDEX idx_ip_address (ip_address),
          INDEX idx_created_at (created_at)
        ) ENGINE=InnoDB
      `);

      // Insert events in batch
      const values = eventsToProcess.map(event => [
        event.event,
        event.userId ? `UNHEX(REPLACE('${event.userId}', '-', ''))` : null,
        event.userRole,
        event.requiredRole,
        event.ipAddress,
        event.userAgent,
        event.path,
        event.requestCount,
        event.limit,
        event.threshold,
        event.windowMs,
        event.metadata ? JSON.stringify(event.metadata) : null,
        event.timestamp
      ]);

      const placeholders = values.map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').join(', ');
      const flatValues = values.flat();

      await connection.execute(
        `INSERT INTO security_events (event, user_id, user_role, required_role, ip_address, user_agent, path, request_count, limit_value, threshold_value, window_ms, metadata, created_at) VALUES ${placeholders}`,
        flatValues
      );

      connection.release();
    } catch (error) {
      console.error('Error flushing security events:', error);
      // Re-add events to queue for retry
      this.securityQueue.unshift(...eventsToProcess);
    }
  }

  private async flushAll(): Promise<void> {
    await this.processQueues();
  }

  // Query methods for retrieving audit logs
  async getAuditLogs(filters: {
    event?: string;
    userId?: string;
    ipAddress?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
  } = {}): Promise<AuditLogEntry[]> {
    try {
      const connection = await getDatabaseConnection();

      let whereClause = 'WHERE 1=1';
      const params: any[] = [];

      if (filters.event) {
        whereClause += ' AND event = ?';
        params.push(filters.event);
      }

      if (filters.userId) {
        whereClause += ' AND user_id = UNHEX(REPLACE(?, "-", ""))';
        params.push(filters.userId);
      }

      if (filters.ipAddress) {
        whereClause += ' AND ip_address = ?';
        params.push(filters.ipAddress);
      }

      if (filters.startDate) {
        whereClause += ' AND created_at >= ?';
        params.push(filters.startDate);
      }

      if (filters.endDate) {
        whereClause += ' AND created_at <= ?';
        params.push(filters.endDate);
      }

      const limit = Math.min(filters.limit || 100, 1000);
      const offset = filters.offset || 0;

      const [rows] = await connection.execute(
        `SELECT 
          HEX(id) as id,
          event,
          HEX(user_id) as user_id,
          user_role,
          ip_address,
          user_agent,
          path,
          method,
          request_body,
          response_status,
          response_time,
          metadata,
          created_at
        FROM audit_logs 
        ${whereClause}
        ORDER BY created_at DESC
        LIMIT ? OFFSET ?`,
        [...params, limit, offset]
      );

      connection.release();

      return (rows as any[]).map(row => ({
        id: row.id,
        event: row.event,
        userId: row.user_id,
        userRole: row.user_role,
        ipAddress: row.ip_address,
        userAgent: row.user_agent,
        path: row.path,
        method: row.method,
        requestBody: row.request_body ? JSON.parse(row.request_body) : null,
        responseStatus: row.response_status,
        responseTime: row.response_time,
        metadata: row.metadata ? JSON.parse(row.metadata) : null,
        timestamp: new Date(row.created_at)
      }));
    } catch (error) {
      console.error('Error retrieving audit logs:', error);
      return [];
    }
  }

  async getSecurityEvents(filters: {
    event?: string;
    ipAddress?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
  } = {}): Promise<SecurityEvent[]> {
    try {
      const connection = await getDatabaseConnection();

      let whereClause = 'WHERE 1=1';
      const params: any[] = [];

      if (filters.event) {
        whereClause += ' AND event = ?';
        params.push(filters.event);
      }

      if (filters.ipAddress) {
        whereClause += ' AND ip_address = ?';
        params.push(filters.ipAddress);
      }

      if (filters.startDate) {
        whereClause += ' AND created_at >= ?';
        params.push(filters.startDate);
      }

      if (filters.endDate) {
        whereClause += ' AND created_at <= ?';
        params.push(filters.endDate);
      }

      const limit = Math.min(filters.limit || 100, 1000);
      const offset = filters.offset || 0;

      const [rows] = await connection.execute(
        `SELECT 
          event,
          HEX(user_id) as user_id,
          user_role,
          required_role,
          ip_address,
          user_agent,
          path,
          request_count,
          limit_value,
          threshold_value,
          window_ms,
          metadata,
          created_at
        FROM security_events 
        ${whereClause}
        ORDER BY created_at DESC
        LIMIT ? OFFSET ?`,
        [...params, limit, offset]
      );

      connection.release();

      return (rows as any[]).map(row => ({
        event: row.event,
        userId: row.user_id,
        userRole: row.user_role,
        requiredRole: row.required_role,
        ipAddress: row.ip_address,
        userAgent: row.user_agent,
        path: row.path,
        requestCount: row.request_count,
        limit: row.limit_value,
        threshold: row.threshold_value,
        windowMs: row.window_ms,
        metadata: row.metadata ? JSON.parse(row.metadata) : null,
        timestamp: new Date(row.created_at)
      }));
    } catch (error) {
      console.error('Error retrieving security events:', error);
      return [];
    }
  }
}

export const auditLogger = new AuditLogger();

// Middleware for automatic audit logging
export const withAuditLog = (handler: (req: any) => Promise<any>) => {
  return async (req: any): Promise<any> => {
    const startTime = Date.now();
    let response;
    let error;

    try {
      response = await handler(req);
      return response;
    } catch (err) {
      error = err;
      throw err;
    } finally {
      const endTime = Date.now();
      const responseTime = endTime - startTime;

      // Extract request body for logging (be careful with sensitive data)
      let requestBody;
      try {
        if (req.method !== 'GET' && req.body) {
          requestBody = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
          
          // Remove sensitive fields
          if (requestBody.password) requestBody.password = '[REDACTED]';
          if (requestBody.token) requestBody.token = '[REDACTED]';
        }
      } catch {
        requestBody = null;
      }

      // Import getClientIP and getUserAgent at the top of the function
      const { getClientIP, getUserAgent } = await import('./request-utils');
      
      await auditLogger.logActivity({
        event: error ? 'API_ERROR' : 'API_REQUEST',
        userId: req.user?.userId,
        userRole: req.user?.role,
        ipAddress: getClientIP(req),
        userAgent: getUserAgent(req),
        path: req.nextUrl?.pathname || req.url,
        method: req.method,
        requestBody,
        responseStatus: response?.status || (error ? 500 : 200),
        responseTime,
        timestamp: new Date(),
        metadata: error ? { error: (error as Error).message } : undefined
      });
    }
  };
};