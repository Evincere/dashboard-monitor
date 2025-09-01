import { NextRequest, NextResponse } from 'next/server'

// Type definitions for the backend response
interface Authority {
  authority: string;
}

interface LoginResponse {
  token: string;
  bearer: string;
  username: string;
  authorities: Authority[];
  cuit?: string;
}

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json()

    if (!username || !password) {
      return NextResponse.json({ error: 'Username and password are required' }, { status: 400 })
    }

    // Authenticate with Spring Boot backend
    const backendUrl = process.env.BACKEND_API_URL || 'http://localhost:8080/api'
    
    const backendResponse = await fetch(`${backendUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    })

    if (!backendResponse.ok) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }

    const loginData: LoginResponse = await backendResponse.json()

    // Check admin role with proper typing
    const hasAdminRole = loginData.authorities?.some((auth: Authority) => auth.authority === 'ROLE_ADMIN')
    if (!hasAdminRole) {
      return NextResponse.json({ error: 'Admin role required' }, { status: 403 })
    }

    // Create session
    const sessionData = {
      username: loginData.username,
      token: loginData.token,
      authorities: loginData.authorities,
      loginTime: new Date().toISOString()
    }

    // Create response
    const response = NextResponse.json({
      success: true,
      user: { username: loginData.username, authorities: loginData.authorities }
    })

    // Set secure cookie with correct path
    response.cookies.set('dashboard-session', JSON.stringify(sessionData), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60,
      path: '/' // Changed from '/dashboard-monitor' to '/' for broader scope
    })

    return response

  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json({ error: 'Authentication service unavailable' }, { status: 500 })
  }
}
