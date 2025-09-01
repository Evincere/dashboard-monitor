import { NextRequest, NextResponse } from 'next/server';
import sessionBackendClient from '@/lib/session-backend-client';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const size = searchParams.get('size') || '1000';
    
    console.log('🔄 Proxying inscriptions with session authentication, size:', size);

    const result = await sessionBackendClient.getInscriptions({ size: parseInt(size) });

    if (!result.success) {
      console.error('❌ Backend returned error:', result.error);
      return NextResponse.json(
        { error: result.error || 'Could not authenticate with backend' },
        { status: 500 }
      );
    }

    console.log('✅ Successfully obtained inscriptions data:', { 
      total: result.data?.content?.length || 0 
    });

    return NextResponse.json({
      success: true,
      data: result.data
    });

  } catch (error) {
    console.error('💥 Proxy error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
