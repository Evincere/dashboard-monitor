// src/app/api/documents/download/route.ts
import { NextRequest, NextResponse } from 'next/server';
import backendClient from '@/lib/backend-client';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const documentId = searchParams.get('id');

    if (!documentId) {
      return NextResponse.json(
        { error: 'Document ID is required' },
        { status: 400 }
      );
    }

    console.log('📥 [API] Download request for document:', documentId);

    // ✨ NUEVA IMPLEMENTACIÓN: Usar BackendClient para descarga real
    const result = await backendClient.downloadDocument(documentId);
    
    if (!result.success) {
      console.error('❌ [API] Error al descargar documento:', result.error);
      return NextResponse.json({ 
        error: result.error || 'Document not available for download' 
      }, { status: 404 });
    }

    if (!result.blob) {
      console.error('❌ [API] No se recibió contenido del documento');
      return NextResponse.json({ 
        error: 'No file content received from backend' 
      }, { status: 500 });
    }

    console.log(`✅ [API] Documento obtenido exitosamente: ${result.fileName}, ${result.blob.size} bytes`);

    // Convertir el blob a buffer para NextResponse
    const arrayBuffer = await result.blob.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Determinar el tipo MIME basado en la extensión del archivo
    const fileName = result.fileName || `documento_${documentId}`;
    let mimeType = 'application/octet-stream';
    
    const lowerFileName = fileName.toLowerCase();
    if (lowerFileName.endsWith('.pdf')) {
      mimeType = 'application/pdf';
    } else if (lowerFileName.endsWith('.jpg') || lowerFileName.endsWith('.jpeg')) {
      mimeType = 'image/jpeg';
    } else if (lowerFileName.endsWith('.png')) {
      mimeType = 'image/png';
    } else if (lowerFileName.endsWith('.gif')) {
      mimeType = 'image/gif';
    } else if (lowerFileName.endsWith('.doc')) {
      mimeType = 'application/msword';
    } else if (lowerFileName.endsWith('.docx')) {
      mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    }

    // Crear la respuesta con el archivo
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': mimeType,
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Content-Length': buffer.length.toString(),
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });

  } catch (error) {
    console.error('❌ [API] Error in download endpoint:', error);
    return NextResponse.json(
      {
        error: 'Failed to process download request',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
