import { NextRequest, NextResponse } from 'next/server';
import backendClient from '@/lib/backend-client';

export async function GET(request: NextRequest) {
  try {
    // Get the query parameters
    const { searchParams } = new URL(request.url);
    const size = searchParams.get('size') || '1000';
    
    console.log('🔄 Proxying request to backend with automatic authentication, size:', size);

    // Use backendClient which handles authentication automatically
    const result = await backendClient.getInscriptions({ size: parseInt(size) });

    if (!result.success) {
      console.error('❌ Backend returned error:', result.error);
      return NextResponse.json(
        { error: 'Could not authenticate with backend' },
        { status: 500 }
      );
    }

    console.log('✅ Successfully obtained inscriptions data:', { 
      total: result.data?.content?.length || 0 
    });

    // Return the data in the expected format
    return NextResponse.json({
      success: true,
      data: result.data // The backend already returns { content: [...], totalElements, etc. }
    });

  } catch (error) {
    console.error('💥 Proxy error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
