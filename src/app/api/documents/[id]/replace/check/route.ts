import { NextRequest, NextResponse } from 'next/server';
import backendClient from '@/lib/backend-client';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    console.log('🔍 [API] Check replace document request for ID:', id);

    // Obtener FormData del request
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const comments = formData.get('comments') as string;

    if (!file) {
      return NextResponse.json({ error: 'File is required' }, { status: 400 });
    }

    console.log('📁 [API] File details for check:', {
      name: file.name,
      size: file.size,
      type: file.type,
      comments: comments || 'Sin comentarios'
    });

    // ✨ NUEVA IMPLEMENTACIÓN: Usar BackendClient para verificación real
    const result = await backendClient.checkReplaceDocument(
      id,
      file,
      comments
    );

    if (!result.success) {
      console.error('❌ [API] Error al verificar reemplazo:', result.error);
      return NextResponse.json({ 
        error: result.error || 'Document replacement check failed',
        details: result.data
      }, { status: 400 });
    }

    console.log('✅ [API] Document replace check completed successfully');
    
    return NextResponse.json({
      success: true,
      data: result.data,
      message: result.data?.message || 'Document replacement check completed'
    });

  } catch (error) {
    console.error('❌ [API] Error checking document replacement:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
