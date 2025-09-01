import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function GET() {
  try {
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get('dashboard-session')
    
    if (!sessionCookie) {
      return NextResponse.json({ error: 'No session found' }, { status: 401 })
    }
    
    const sessionData = JSON.parse(sessionCookie.value)
    
    // Check if session is expired (24 hours)
    const loginTime = new Date(sessionData.loginTime)
    const expiryTime = new Date(loginTime.getTime() + (24 * 60 * 60 * 1000))
    
    if (new Date() > expiryTime) {
      const response = NextResponse.json({ error: 'Session expired' }, { status: 401 })
      // Clear expired cookie
      response.cookies.set('dashboard-session', '', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 0,
        path: '/' // Changed from '/dashboard-monitor' to '/'
      })
      return response
    }
    
    return NextResponse.json({
      success: true,
      user: {
        username: sessionData.username,
        authorities: sessionData.authorities,
        loginTime: sessionData.loginTime
      },
      token: sessionData.token
    })
  } catch (error) {
    console.error('Session error:', error)
    return NextResponse.json({ error: 'Session service unavailable' }, { status: 500 })
  }
}
