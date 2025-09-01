import { NextResponse } from 'next/server'

export async function POST() {
  try {
    // Create response
    const response = NextResponse.json({ success: true, message: 'Logged out successfully' })
    
    // Delete the session cookie using response.cookies
    response.cookies.set('dashboard-session', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0, // Expire immediately
      path: '/' // Changed from '/dashboard-monitor' to '/'
    })
    
    return response
  } catch (error) {
    console.error('Logout error:', error)
    return NextResponse.json({ error: 'Logout failed' }, { status: 500 })
  }
}
