// middleware.ts
import { NextRequest, NextResponse } from 'next/server';

// Define protected routes (WITHOUT basePath prefix since Next.js handles that)
const protectedRoutes = [
  '/api/users',
  '/api/documents/approve',
  '/api/documents/reject',
  '/api/backups',
  '/api/dashboard',
  '/api/security',
  '/api/reports/list',
  '/api/reports/generate',
  '/api/reports'
];

// Define admin-only routes
const adminRoutes = [
  '/api/users',
  '/api/security',
  '/api/backups'
];

// Define public routes that don't require authentication
const publicRoutes = [
  '/api/auth/login',
  '/api/auth/refresh',
  '/api/auth/session',
  '/api/auth/logout',
  '/api/health',
  '/api/test',
  '/api/debug-auth',
  '/api/documents', // Allow documents listing without auth for now
  '/api/documents/[id]/view',
  '/api/documents/[id]/download'
];

/**
 * Extract and validate token from dashboard-session cookie
 */
function validateSessionFromCookie(request: NextRequest): any {
  try {
    const sessionCookie = request.cookies.get('dashboard-session');
    if (!sessionCookie) {
      return null;
    }
    
    const sessionData = JSON.parse(sessionCookie.value);
    
    // Check if session is expired (24 hours)
    const loginTime = new Date(sessionData.loginTime);
    const expiryTime = new Date(loginTime.getTime() + (24 * 60 * 60 * 1000));
    
    if (new Date() > expiryTime) {
      return null;
    }
    
    // If we have a valid session, return user info
    if (sessionData.username && sessionData.authorities && sessionData.token) {
      return {
        userId: sessionData.username,
        email: sessionData.username,
        role: sessionData.authorities?.[0]?.authority || 'ROLE_USER',
        token: sessionData.token
      };
    }
    
    return null;
  } catch (error) {
    console.error('Error validating session:', error);
    return null;
  }
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  console.log('🔍 Middleware check for:', pathname);

  // Skip middleware for static files and Next.js internals
  if (
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/static/') ||
    pathname.includes('.') ||
    pathname === '/favicon.ico'
  ) {
    return NextResponse.next();
  }

  // Allow public routes
  if (publicRoutes.some(route => pathname.startsWith(route))) {
    console.log('✅ Public route - allowing access:', pathname);
    return NextResponse.next();
  }

  // Check if this is a document view/download endpoint
  if (pathname.includes('/api/documents/') && (pathname.endsWith('/view') || pathname.endsWith('/download'))) {
    console.log('✅ Document endpoint - allowing access:', pathname);
    return NextResponse.next();
  }

  // Check if route requires authentication
  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route));

  if (!isProtectedRoute) {
    return NextResponse.next();
  }

  console.log('🔐 Protected route detected:', pathname);

  // Validate session from cookie
  const userSession = validateSessionFromCookie(request);

  if (!userSession) {
    console.log('❌ No valid session found for protected route');
    return NextResponse.json(
      {
        error: 'Authentication required',
        code: 'AUTH_REQUIRED',
        path: pathname
      },
      { status: 401 }
    );
  }

  console.log('✅ Session validated successfully for user:', userSession.email);

  // Check admin routes
  const isAdminRoute = adminRoutes.some(route => pathname.startsWith(route));
  if (isAdminRoute && userSession.role !== 'ROLE_ADMIN') {
    console.log('❌ Insufficient permissions for admin route');
    return NextResponse.json(
      {
        error: 'Insufficient permissions',
        code: 'INSUFFICIENT_PERMISSIONS',
        required: 'ROLE_ADMIN',
        current: userSession.role,
        path: pathname
      },
      { status: 403 }
    );
  }

  // Add user info to request headers for downstream handlers
  const response = NextResponse.next();
  response.headers.set('x-user-id', userSession.userId);
  response.headers.set('x-user-email', userSession.email);
  response.headers.set('x-user-role', userSession.role);

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public/).*)',
  ],
};
