// src/app/api/security/dashboard/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getDatabaseConnection } from '@/services/database';
import { withAdmin, withSecurityHeaders, withCORS, type AuthenticatedRequest } from '@/lib/middleware';
import { withRateLimit, apiRateLimit } from '@/lib/rate-limiter';
import { auditLogger } from '@/lib/audit-logger';
import { getKeyInfo } from '@/lib/encryption';
import type { RowDataPacket } from 'mysql2';

async function getSecurityDashboardHandler(request: AuthenticatedRequest) {
  try {
    const connection = await getDatabaseConnection();

    // Get security metrics from the last 24 hours
    const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);

    // Failed login attempts
    const [failedLogins] = await connection.execute(
      `SELECT COUNT(*) as count 
       FROM security_events 
       WHERE event IN ('LOGIN_FAILED_INVALID_PASSWORD', 'LOGIN_FAILED_USER_NOT_FOUND') 
       AND created_at >= ?`,
      [last24Hours]
    ) as [RowDataPacket[], any];

    // Rate limit violations
    const [rateLimitViolations] = await connection.execute(
      `SELECT COUNT(*) as count 
       FROM security_events 
       WHERE event = 'RATE_LIMIT_EXCEEDED' 
       AND created_at >= ?`,
      [last24Hours]
    ) as [RowDataPacket[], any];

    // DDoS attacks detected
    const [ddosAttacks] = await connection.execute(
      `SELECT COUNT(*) as count 
       FROM security_events 
       WHERE event = 'DDOS_ATTACK_DETECTED' 
       AND created_at >= ?`,
      [last24Hours]
    ) as [RowDataPacket[], any];

    // Unauthorized access attempts
    const [unauthorizedAttempts] = await connection.execute(
      `SELECT COUNT(*) as count 
       FROM security_events 
       WHERE event IN ('UNAUTHORIZED_ACCESS_ATTEMPT', 'INVALID_TOKEN', 'INSUFFICIENT_PERMISSIONS') 
       AND created_at >= ?`,
      [last24Hours]
    ) as [RowDataPacket[], any];

    // Active sessions count
    const [activeSessions] = await connection.execute(
      `SELECT COUNT(DISTINCT user_id) as count 
       FROM audit_logs 
       WHERE event = 'USER_LOGIN_SUCCESS' 
       AND created_at >= ?`,
      [last24Hours]
    ) as [RowDataPacket[], any];

    // Top suspicious IPs
    const [suspiciousIPs] = await connection.execute(
      `SELECT ip_address, COUNT(*) as violation_count,
              GROUP_CONCAT(DISTINCT event) as events
       FROM security_events 
       WHERE created_at >= ? 
       GROUP BY ip_address 
       HAVING violation_count > 5
       ORDER BY violation_count DESC 
       LIMIT 10`,
      [last24Hours]
    ) as [RowDataPacket[], any];

    // Recent security events
    const [recentEvents] = await connection.execute(
      `SELECT event, ip_address, user_agent, created_at, metadata
       FROM security_events 
       WHERE created_at >= ? 
       ORDER BY created_at DESC 
       LIMIT 20`,
      [last24Hours]
    ) as [RowDataPacket[], any];

    // User account security status
    const [accountSecurity] = await connection.execute(
      `SELECT 
         COUNT(*) as total_users,
         SUM(CASE WHEN status = 'ACTIVE' THEN 1 ELSE 0 END) as active_users,
         SUM(CASE WHEN status = 'BLOCKED' THEN 1 ELSE 0 END) as blocked_users,
         SUM(CASE WHEN locked_until IS NOT NULL AND locked_until > NOW() THEN 1 ELSE 0 END) as locked_users,
         SUM(CASE WHEN failed_login_attempts >= 3 THEN 1 ELSE 0 END) as users_with_failed_attempts
       FROM users`,
      []
    ) as [RowDataPacket[], any];

    connection.release();

    // Get encryption key information
    const keyInfo = getKeyInfo();

    // Calculate security score (0-100)
    const securityMetrics = {
      failedLogins: failedLogins[0]?.count || 0,
      rateLimitViolations: rateLimitViolations[0]?.count || 0,
      ddosAttacks: ddosAttacks[0]?.count || 0,
      unauthorizedAttempts: unauthorizedAttempts[0]?.count || 0,
      activeSessions: activeSessions[0]?.count || 0,
      suspiciousIPs: suspiciousIPs.length,
      blockedUsers: accountSecurity[0]?.blocked_users || 0,
      lockedUsers: accountSecurity[0]?.locked_users || 0
    };

    // Simple security score calculation
    let securityScore = 100;
    securityScore -= Math.min(securityMetrics.failedLogins * 2, 20);
    securityScore -= Math.min(securityMetrics.rateLimitViolations * 3, 30);
    securityScore -= Math.min(securityMetrics.ddosAttacks * 10, 40);
    securityScore -= Math.min(securityMetrics.unauthorizedAttempts * 1, 10);
    securityScore = Math.max(securityScore, 0);

    const securityLevel = securityScore >= 80 ? 'HIGH' : securityScore >= 60 ? 'MEDIUM' : 'LOW';

    // Import utility functions
    const { getClientIP, getUserAgent } = await import('@/lib/request-utils');
    
    // Log dashboard access
    await auditLogger.logActivity({
      event: 'SECURITY_DASHBOARD_ACCESSED',
      userId: request.user?.userId,
      userRole: request.user?.role,
      ipAddress: getClientIP(request),
      userAgent: getUserAgent(request),
      path: '/api/security/dashboard',
      method: 'GET',
      responseStatus: 200,
      timestamp: new Date()
    });

    return NextResponse.json({
      securityOverview: {
        score: securityScore,
        level: securityLevel,
        lastUpdated: new Date().toISOString()
      },
      metrics: securityMetrics,
      accountSecurity: accountSecurity[0] || {},
      encryption: {
        status: 'ACTIVE',
        currentKeyId: keyInfo.currentKeyId,
        nextRotation: keyInfo.nextRotation,
        totalActiveKeys: keyInfo.totalActiveKeys
      },
      threats: {
        suspiciousIPs: suspiciousIPs.map(ip => ({
          ipAddress: ip.ip_address,
          violationCount: ip.violation_count,
          events: ip.events ? ip.events.split(',') : []
        })),
        recentEvents: recentEvents.map(event => ({
          event: event.event,
          ipAddress: event.ip_address,
          userAgent: event.user_agent,
          timestamp: event.created_at,
          metadata: event.metadata ? JSON.parse(event.metadata) : null
        }))
      },
      recommendations: generateSecurityRecommendations(securityMetrics),
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error fetching security dashboard:', error);
    return NextResponse.json(
      { error: 'Failed to fetch security dashboard', code: 'SECURITY_DASHBOARD_ERROR' },
      { status: 500 }
    );
  }
}

function generateSecurityRecommendations(metrics: any): string[] {
  const recommendations: string[] = [];

  if (metrics.failedLogins > 10) {
    recommendations.push('High number of failed login attempts detected. Consider implementing CAPTCHA or additional verification.');
  }

  if (metrics.rateLimitViolations > 5) {
    recommendations.push('Multiple rate limit violations detected. Review rate limiting configuration.');
  }

  if (metrics.ddosAttacks > 0) {
    recommendations.push('DDoS attacks detected. Consider implementing additional DDoS protection measures.');
  }

  if (metrics.unauthorizedAttempts > 20) {
    recommendations.push('High number of unauthorized access attempts. Review authentication mechanisms.');
  }

  if (metrics.suspiciousIPs > 3) {
    recommendations.push('Multiple suspicious IP addresses detected. Consider implementing IP blocking.');
  }

  if (metrics.blockedUsers > 0) {
    recommendations.push(`${metrics.blockedUsers} user accounts are currently blocked. Review and investigate.`);
  }

  if (recommendations.length === 0) {
    recommendations.push('Security status is good. Continue monitoring for potential threats.');
  }

  return recommendations;
}

export const GET = withSecurityHeaders(
  withCORS(
    withRateLimit(apiRateLimit)(
      withAdmin(getSecurityDashboardHandler)
    )
  )
);