// src/app/api/security/audit/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { withAdmin, withSecurityHeaders, withCORS, type AuthenticatedRequest } from '@/lib/middleware';
import { withRateLimit, strictRateLimit } from '@/lib/rate-limiter';
import { auditLogger } from '@/lib/audit-logger';
import { z } from 'zod';

const AuditQuerySchema = z.object({
  event: z.string().optional(),
  userId: z.string().optional(),
  ipAddress: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  limit: z.coerce.number().min(1).max(1000).default(100),
  offset: z.coerce.number().min(0).default(0)
});

async function getAuditLogsHandler(request: AuthenticatedRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = AuditQuerySchema.parse(Object.fromEntries(searchParams.entries()));

    const filters: any = {
      limit: query.limit,
      offset: query.offset
    };

    if (query.event) filters.event = query.event;
    if (query.userId) filters.userId = query.userId;
    if (query.ipAddress) filters.ipAddress = query.ipAddress;
    if (query.startDate) filters.startDate = new Date(query.startDate);
    if (query.endDate) filters.endDate = new Date(query.endDate);

    const auditLogs = await auditLogger.getAuditLogs(filters);
    const securityEvents = await auditLogger.getSecurityEvents(filters);

    // Import utility functions
    const { getClientIP, getUserAgent } = await import('@/lib/request-utils');
    
    // Log audit access
    await auditLogger.logActivity({
      event: 'AUDIT_LOGS_ACCESSED',
      userId: request.user?.userId,
      userRole: request.user?.role,
      ipAddress: getClientIP(request),
      userAgent: getUserAgent(request),
      path: '/api/security/audit',
      method: 'GET',
      responseStatus: 200,
      timestamp: new Date(),
      metadata: { filters }
    });

    return NextResponse.json({
      auditLogs,
      securityEvents,
      pagination: {
        limit: query.limit,
        offset: query.offset,
        total: auditLogs.length + securityEvents.length
      },
      filters: query,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error fetching audit logs:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Validation error',
          code: 'VALIDATION_ERROR',
          details: error.errors
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to fetch audit logs', code: 'AUDIT_ERROR' },
      { status: 500 }
    );
  }
}

export const GET = withSecurityHeaders(
  withCORS(
    withRateLimit(strictRateLimit)(
      withAdmin(getAuditLogsHandler)
    )
  )
);