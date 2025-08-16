import { NextRequest, NextResponse } from 'next/server';
import backendClient from '@/lib/backend-client';

/**
 * @fileOverview API para rechazar documentos individuales
 * Utiliza el backend Spring Boot para procesar el rechazo
 */

interface RejectionRequest {
  documentId: string;
  reason: string;
  validatedBy: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: RejectionRequest = await request.json();
    const { documentId, reason, validatedBy } = body;

    // Validar parámetros requeridos
    if (!documentId || !reason || !validatedBy) {
      return NextResponse.json({
        success: false,
        error: 'Document ID, reason, and validated by are required',
        timestamp: new Date().toISOString()
      }, { status: 400 });
    }

    console.log(`❌ Rejecting document ${documentId} by ${validatedBy}, reason: ${reason}`);

    // Usar el backend client para rechazar el documento
    const rejectionResponse = await backendClient.rejectDocument(documentId, reason);

    if (!rejectionResponse.success) {
      console.error('Backend rejection failed:', rejectionResponse.error);
      return NextResponse.json({
        success: false,
        error: 'Failed to reject document',
        details: rejectionResponse.error,
        timestamp: new Date().toISOString()
      }, { status: 500 });
    }

    console.log(`❌ Document ${documentId} rejected successfully`);

    return NextResponse.json({
      success: true,
      message: 'Document rejected successfully',
      data: {
        documentId,
        validatedBy,
        reason,
        rejectedDocument: rejectionResponse.data
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Document rejection API error:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to process document rejection',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
