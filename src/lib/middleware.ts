// src/lib/middleware.ts
import { NextRequest, NextResponse } from 'next/server';
import { verifyAccessToken, extractTokenFromHeader, updateSessionActivity, type JWTPayload } from './auth';
import { auditLogger } from './audit-logger';
import { getClientIP, getUserAgent } from './request-utils';

export interface AuthenticatedRequest extends NextRequest {
  user?: JWTPayload;
}

// Authentication middleware
export const withAuth = (handler: (req: AuthenticatedRequest) => Promise<NextResponse>) => {
  return async (req: AuthenticatedRequest): Promise<NextResponse> => {
    try {
      const authHeader = req.headers.get('authorization');
      const token = extractTokenFromHeader(authHeader);

      if (!token) {
        await auditLogger.logSecurityEvent({
          event: 'UNAUTHORIZED_ACCESS_ATTEMPT',
          ipAddress: getClientIP(req),
          userAgent: getUserAgent(req),
          path: req.nextUrl.pathname,
          timestamp: new Date()
        });

        return NextResponse.json(
          { error: 'Authentication required', code: 'AUTH_REQUIRED' },
          { status: 401 }
        );
      }

      const payload = verifyAccessToken(token);
      if (!payload) {
        await auditLogger.logSecurityEvent({
          event: 'INVALID_TOKEN',
          ipAddress: getClientIP(req),
          userAgent: getUserAgent(req),
          path: req.nextUrl.pathname,
          timestamp: new Date()
        });

        return NextResponse.json(
          { error: 'Invalid or expired token', code: 'INVALID_TOKEN' },
          { status: 401 }
        );
      }

      // Update session activity
      updateSessionActivity(token);

      // Attach user to request
      req.user = payload;

      return handler(req);
    } catch (error) {
      console.error('Authentication middleware error:', error);
      return NextResponse.json(
        { error: 'Authentication failed', code: 'AUTH_ERROR' },
        { status: 500 }
      );
    }
  };
};

// Role-based authorization middleware
export const withRole = (requiredRole: string) => {
  return (handler: (req: AuthenticatedRequest) => Promise<NextResponse>) => {
    return withAuth(async (req: AuthenticatedRequest): Promise<NextResponse> => {
      if (!req.user) {
        return NextResponse.json(
          { error: 'Authentication required', code: 'AUTH_REQUIRED' },
          { status: 401 }
        );
      }

      const userRole = req.user.role;
      const roleHierarchy = {
        'ROLE_ADMIN': 2,
        'ROLE_USER': 1
      };

      const userLevel = roleHierarchy[userRole as keyof typeof roleHierarchy] || 0;
      const requiredLevel = roleHierarchy[requiredRole as keyof typeof roleHierarchy] || 0;

      if (userLevel < requiredLevel) {
        await auditLogger.logSecurityEvent({
          event: 'INSUFFICIENT_PERMISSIONS',
          userId: req.user.userId,
          userRole,
          requiredRole,
          ipAddress: getClientIP(req),
          path: req.nextUrl.pathname,
          timestamp: new Date()
        });

        return NextResponse.json(
          { 
            error: 'Insufficient permissions', 
            code: 'INSUFFICIENT_PERMISSIONS',
            required: requiredRole,
            current: userRole
          },
          { status: 403 }
        );
      }

      return handler(req);
    });
  };
};

// Admin-only middleware
export const withAdmin = withRole('ROLE_ADMIN');

// CORS middleware
export const withCORS = (handler: (req: NextRequest) => Promise<NextResponse>) => {
  return async (req: NextRequest): Promise<NextResponse> => {
    // Handle preflight requests
    if (req.method === 'OPTIONS') {
      return new NextResponse(null, {
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGINS || '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
          'Access-Control-Max-Age': '86400',
        },
      });
    }

    const response = await handler(req);

    // Add CORS headers to response
    response.headers.set('Access-Control-Allow-Origin', process.env.ALLOWED_ORIGINS || '*');
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');

    return response;
  };
};

// Security headers middleware
export const withSecurityHeaders = (handler: (req: NextRequest) => Promise<NextResponse>) => {
  return async (req: NextRequest): Promise<NextResponse> => {
    const response = await handler(req);

    // Add security headers
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('X-Frame-Options', 'DENY');
    response.headers.set('X-XSS-Protection', '1; mode=block');
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    
    if (process.env.NODE_ENV === 'production') {
      response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    }

    return response;
  };
};

// Request validation middleware
export const withValidation = <T>(schema: any) => {
  return (handler: (req: NextRequest, validatedData: T) => Promise<NextResponse>) => {
    return async (req: NextRequest): Promise<NextResponse> => {
      try {
        let data;
        
        if (req.method === 'GET') {
          // Validate query parameters
          const searchParams = Object.fromEntries(req.nextUrl.searchParams.entries());
          data = schema.parse(searchParams);
        } else {
          // Validate request body
          const body = await req.json();
          data = schema.parse(body);
        }

        return handler(req, data);
      } catch (error) {
        if (error instanceof Error && 'errors' in error) {
          return NextResponse.json(
            {
              error: 'Validation failed',
              code: 'VALIDATION_ERROR',
              details: (error as any).errors,
              timestamp: new Date().toISOString()
            },
            { status: 400 }
          );
        }

        return NextResponse.json(
          {
            error: 'Invalid request data',
            code: 'INVALID_DATA',
            timestamp: new Date().toISOString()
          },
          { status: 400 }
        );
      }
    };
  };
};

// Combine multiple middlewares
export const withMiddleware = (...middlewares: Array<(handler: any) => any>) => {
  return (handler: any) => {
    return middlewares.reduceRight((acc, middleware) => middleware(acc), handler);
  };
};