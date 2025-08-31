// src/app/api/documents/smart-download/route.ts
import { NextRequest, NextResponse } from 'next/server';
import backendClient from '@/lib/backend-client';

/**
 * Endpoint inteligente de descarga que resuelve documentos reemplazados
 * 
 * Intenta descargar el documento solicitado. Si falla (posiblemente porque está archivado),
 * busca el documento más reciente del mismo tipo del mismo usuario.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const documentId = searchParams.get('id');
    const userId = searchParams.get('userId');

    if (!documentId) {
      return NextResponse.json(
        { error: 'Document ID is required' },
        { status: 400 }
      );
    }

    console.log('🔍 [SmartDownload] Resolviendo descarga para documento:', documentId);

    // Paso 1: Intentar descarga directa del documento solicitado
    console.log(`📥 [SmartDownload] Intentando descarga directa: ${documentId}`);
    let result = await backendClient.downloadDocument(documentId);
    
    let isResolved = false;
    let targetDocumentId = documentId;

    // Paso 2: Si falla la descarga directa y tenemos userId, buscar reemplazo
    if (!result.success && userId) {
      console.log('🔄 [SmartDownload] Descarga directa falló, buscando documento de reemplazo...');
      
      try {
        // Obtener todos los documentos del usuario
        const documentsResponse = await backendClient.getDocuments({ usuarioId: userId });
        
        if (documentsResponse.success && documentsResponse.data?.content) {
          console.log(`📋 [SmartDownload] Encontrados ${documentsResponse.data.content.length} documentos del usuario`);
          
          // Intentar encontrar el documento solicitado para obtener su tipo
          const requestedDoc = documentsResponse.data.content.find(doc => doc.id === documentId);
          let documentType = requestedDoc?.tipoDocumento;
          
          if (documentType) {
            // Buscar el documento más reciente del mismo tipo (activo)
            const activeDoc = documentsResponse.data.content
              .filter(doc => doc.tipoDocumento === documentType)
              .sort((a, b) => new Date(b.uploadDate).getTime() - new Date(a.uploadDate).getTime())[0];
            
            if (activeDoc && activeDoc.id !== documentId) {
              console.log('✅ [SmartDownload] Documento más reciente del mismo tipo encontrado:', activeDoc.id);
              targetDocumentId = activeDoc.id;
              isResolved = true;
              
              // Intentar descargar el documento más reciente
              console.log(`📥 [SmartDownload] Descargando documento más reciente: ${targetDocumentId}`);
              result = await backendClient.downloadDocument(targetDocumentId);
            }
          } else {
            console.warn('⚠️ [SmartDownload] No se pudo determinar el tipo de documento');
          }
        }
      } catch (error) {
        console.warn('⚠️ [SmartDownload] Error buscando reemplazo, usando resultado original:', error);
      }
    }
    
    // Paso 3: Verificar resultado final
    if (!result.success) {
      console.error('❌ [SmartDownload] Error final al descargar documento:', result.error);
      return NextResponse.json({ 
        error: result.error || 'Document not available for download' 
      }, { status: 404 });
    }

    if (!result.blob) {
      console.error('❌ [SmartDownload] No se recibió contenido del documento');
      return NextResponse.json({ 
        error: 'No file content received from backend' 
      }, { status: 500 });
    }

    console.log(`✅ [SmartDownload] Documento descargado exitosamente: ${result.fileName}, ${result.blob.size} bytes`);

    // Convertir el blob a buffer para NextResponse
    const arrayBuffer = await result.blob.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Determinar el tipo MIME basado en la extensión del archivo
    const fileName = result.fileName || `documento_${targetDocumentId}`;
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

    // Agregar información de auditoría en headers si hubo reemplazo
    const headers: Record<string, string> = {
      'Content-Type': mimeType,
      'Content-Disposition': `attachment; filename="${fileName}"`,
      'Content-Length': buffer.length.toString(),
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    };

    // Si se descargó un documento diferente al solicitado, agregar header informativo
    if (isResolved) {
      headers['X-Document-Resolved'] = 'true';
      headers['X-Original-Document'] = documentId;
      headers['X-Resolved-Document'] = targetDocumentId;
      console.log('ℹ️ [SmartDownload] Descarga resuelta de documento reemplazado');
    }

    // Crear la respuesta con el archivo
    return new NextResponse(buffer, {
      status: 200,
      headers
    });

  } catch (error) {
    console.error('❌ [SmartDownload] Error in smart download endpoint:', error);
    return NextResponse.json(
      {
        error: 'Failed to process smart download request',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
