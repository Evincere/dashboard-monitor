import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  return NextResponse.json({
    success: true,
    message: 'Debug endpoint working',
    timestamp: new Date().toISOString(),
    environment: {
      NODE_ENV: process.env.NODE_ENV,
      BACKEND_API_URL: process.env.BACKEND_API_URL,
      basePath: '/dashboard-monitor'
    }
  });
}
