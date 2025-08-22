import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Check for /dashboard-monitor prefix
    if (!pathname.startsWith('/dashboard-monitor')) {
        return NextResponse.next();
    }

    // Get session token from cookie
    const sessionToken = request.cookies.get('session-token')?.value;

    if (!sessionToken && pathname.includes('/api/')) {
        console.error('No session token found for protected route:', pathname);
        return NextResponse.json(
            { error: 'No autorizado - token no encontrado' },
            { status: 401 }
        );
    }

    // Continue to the next middleware or route handler
    return NextResponse.next();
}

export const config = {
    matcher: [
        '/dashboard-monitor/:path*',
    ],
}
