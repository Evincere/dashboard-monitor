import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    // Get all cookies
    const cookies = request.cookies.getAll()
    
    // Get dashboard session specifically
    const sessionCookie = request.cookies.get('dashboard-session')
    
    // Get authorization header
    const authHeader = request.headers.get('authorization')
    
    let sessionData = null
    if (sessionCookie) {
      try {
        sessionData = JSON.parse(sessionCookie.value)
      } catch (error) {
        sessionData = { error: 'Failed to parse session data' }
      }
    }
    
    return NextResponse.json({
      pathname: request.nextUrl.pathname,
      cookies: cookies.map(c => ({ name: c.name, value: c.value.substring(0, 50) + '...' })),
      sessionCookie: sessionCookie ? {
        name: sessionCookie.name,
        hasValue: !!sessionCookie.value,
        valueLength: sessionCookie.value.length
      } : null,
      sessionData: sessionData ? {
        username: sessionData.username,
        hasToken: !!sessionData.token,
        tokenLength: sessionData.token?.length || 0,
        loginTime: sessionData.loginTime,
        authorities: sessionData.authorities
      } : null,
      authHeader: authHeader ? {
        hasHeader: true,
        type: authHeader.split(' ')[0],
        tokenLength: authHeader.split(' ')[1]?.length || 0
      } : null
    })
  } catch (error) {
    return NextResponse.json({
      error: 'Debug failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
