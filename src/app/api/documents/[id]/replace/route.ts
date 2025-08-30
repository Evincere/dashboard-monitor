import { NextRequest, NextResponse } from 'next/server';
import backendClient from '@/lib/backend-client';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    console.log('🔄 [API] Replace document request for ID:', id);

    // Obtener FormData del request
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const comments = formData.get('comments') as string;
    const forceReplace = formData.get('forceReplace') === 'true';

    if (!file) {
      return NextResponse.json({ error: 'File is required' }, { status: 400 });
    }

    console.log('📁 [API] File details:', {
      name: file.name,
      size: file.size,
      type: file.type,
      comments: comments || 'Sin comentarios',
      forceReplace
    });

    // ✨ NUEVA IMPLEMENTACIÓN: Usar BackendClient para reemplazo real
    const result = await backendClient.replaceDocument(
      id,
      file,
      comments,
      forceReplace
    );

    if (!result.success) {
      console.error('❌ [API] Error al reemplazar documento:', result.error);
      return NextResponse.json({ 
        error: result.error || 'Document replacement failed',
        details: result.data
      }, { status: 400 });
    }

    console.log('✅ [API] Document replace completed successfully');
    
    return NextResponse.json({
      success: true,
      data: result.data,
      message: result.data?.message || 'Document replaced successfully'
    });

  } catch (error) {
    console.error('❌ [API] Error replacing document:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
