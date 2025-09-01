import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  // Check if the request is for dashboard routes
  const isDashboardRoute = request.nextUrl.pathname.startsWith('/dashboard-monitor') && 
                          !request.nextUrl.pathname.startsWith('/dashboard-monitor/login') &&
                          !request.nextUrl.pathname.startsWith('/dashboard-monitor/api/auth')

  if (isDashboardRoute) {
    // Check if user has a valid session
    const sessionToken = request.cookies.get('dashboard-session')

    if (!sessionToken) {
      // Redirect to login page
      const loginUrl = new URL('/dashboard-monitor/login', request.url)
      return NextResponse.redirect(loginUrl)
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * 1. _next/static (static files)
     * 2. _next/image (image optimization files)
     * 3. favicon.ico (favicon file)
     * 4. public folder files
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
