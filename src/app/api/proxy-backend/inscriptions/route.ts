import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Get the query parameters
    const { searchParams } = new URL(request.url);
    const size = searchParams.get('size') || '1000';
    
    // Get authorization header from the request
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Authorization header missing' },
        { status: 401 }
      );
    }

    console.log('🔄 Proxying request to /api/admin/inscriptions with size:', size);

    // Forward request to the actual backend endpoint
    const backendUrl = process.env.BACKEND_API_URL || 'https://vps-4778464-x.dattaweb.com/api';
    const response = await fetch(`${backendUrl}/admin/inscriptions?size=${size}`, {
      method: 'GET',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });

    console.log('📡 Backend response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Backend error:', errorText);
      return NextResponse.json(
        { error: `Backend error: ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('✅ Successfully proxied inscriptions data:', { 
      total: data.content?.length || 0 
    });

    // Transform the data to match the expected frontend format
    return NextResponse.json({
      success: true,
      data: data // The backend already returns { content: [...], totalElements, etc. }
    });

  } catch (error) {
    console.error('💥 Proxy error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
