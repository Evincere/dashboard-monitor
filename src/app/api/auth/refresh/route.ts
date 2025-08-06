// src/app/api/auth/refresh/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getDatabaseConnection } from '@/services/database';
import { verifyRefreshToken, generateAccessToken, generateRefreshToken } from '@/lib/auth';
import { auditLogger } from '@/lib/audit-logger';
import { withSecurityHeaders, withCORS } from '@/lib/middleware';
import { getClientIP, getUserAgent } from '@/lib/request-utils';
import type { RowDataPacket } from 'mysql2';

async function refreshHandler(request: NextRequest) {
  try {
    const body = await request.json();
    const refreshToken = body.refreshToken || request.cookies.get('refreshToken')?.value;

    if (!refreshToken) {
      return NextResponse.json(
        { error: 'Refresh token required', code: 'REFRESH_TOKEN_REQUIRED' },
        { status: 401 }
      );
    }

    const payload = verifyRefreshToken(refreshToken);
    if (!payload) {
      await auditLogger.logSecurityEvent({
        event: 'INVALID_REFRESH_TOKEN',
        ipAddress: getClientIP(request),
        userAgent: getUserAgent(request),
        timestamp: new Date()
      });

      return NextResponse.json(
        { error: 'Invalid refresh token', code: 'INVALID_REFRESH_TOKEN' },
        { status: 401 }
      );
    }

    const connection = await getDatabaseConnection();

    // Get user details
    const [userResult] = await connection.execute(
      `SELECT 
        HEX(id) as id,
        name,
        email,
        role,
        status
      FROM users 
      WHERE id = UNHEX(REPLACE(?, "-", ""))`,
      [payload.userId]
    ) as [RowDataPacket[], any];

    if (userResult.length === 0 || userResult[0].status !== 'ACTIVE') {
      connection.release();
      
      await auditLogger.logSecurityEvent({
        event: 'REFRESH_TOKEN_USER_INVALID',
        userId: payload.userId,
        ipAddress: getClientIP(request),
        userAgent: getUserAgent(request),
        timestamp: new Date()
      });

      return NextResponse.json(
        { error: 'User not found or inactive', code: 'USER_INVALID' },
        { status: 401 }
      );
    }

    const user = userResult[0];
    connection.release();

    // Generate new tokens
    const newAccessToken = generateAccessToken({
      userId: user.id,
      email: user.email,
      role: user.role
    });

    const newRefreshToken = generateRefreshToken(user.id);

    // Log token refresh
    await auditLogger.logActivity({
      event: 'TOKEN_REFRESH',
      userId: user.id,
      userRole: user.role,
      ipAddress: getClientIP(request),
      userAgent: getUserAgent(request),
      path: '/api/auth/refresh',
      method: 'POST',
      responseStatus: 200,
      timestamp: new Date()
    });

    const response = NextResponse.json({
      message: 'Token refreshed successfully',
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      expiresIn: '24h',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status
      }
    });

    // Update cookies
    response.cookies.set('accessToken', newAccessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 // 24 hours
    });

    response.cookies.set('refreshToken', newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 // 7 days
    });

    return response;

  } catch (error) {
    console.error('Token refresh error:', error);

    await auditLogger.logSecurityEvent({
      event: 'TOKEN_REFRESH_ERROR',
      ipAddress: getClientIP(request),
      userAgent: getUserAgent(request),
      metadata: { error: error instanceof Error ? error.message : 'Unknown error' },
      timestamp: new Date()
    });

    return NextResponse.json(
      { error: 'Token refresh failed', code: 'REFRESH_ERROR' },
      { status: 500 }
    );
  }
}

export const POST = withSecurityHeaders(
  withCORS(refreshHandler)
);