// src/app/api/auth/logout/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { extractTokenFromHeader, destroySession, verifyAccessToken } from '@/lib/auth';
import { auditLogger } from '@/lib/audit-logger';
import { withSecurityHeaders, withCORS } from '@/lib/middleware';
import { getClientIP, getUserAgent } from '@/lib/request-utils';

async function logoutHandler(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = extractTokenFromHeader(authHeader) || request.cookies.get('accessToken')?.value;

    if (token) {
      const payload = verifyAccessToken(token);
      
      if (payload) {
        // Destroy session
        destroySession(token);

        // Log logout
        await auditLogger.logActivity({
          event: 'USER_LOGOUT',
          userId: payload.userId,
          userRole: payload.role,
          ipAddress: getClientIP(request),
          userAgent: getUserAgent(request),
          path: '/api/auth/logout',
          method: 'POST',
          responseStatus: 200,
          timestamp: new Date()
        });
      }
    }

    const response = NextResponse.json({
      message: 'Logout successful'
    });

    // Clear cookies
    response.cookies.set('accessToken', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 0
    });

    response.cookies.set('refreshToken', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 0
    });

    return response;

  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { error: 'Logout failed', code: 'LOGOUT_ERROR' },
      { status: 500 }
    );
  }
}

export const POST = withSecurityHeaders(
  withCORS(logoutHandler)
);