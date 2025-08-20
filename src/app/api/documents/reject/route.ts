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

    console.log(`❌ Rejecting document ${documentId} by ${validatedBy} with reason: ${reason}`);

    // ALWAYS use real backend - no fallback to mock
    try {
      console.log('🔗 Using real backend client for document rejection');
      const rejectionResponse = await backendClient.rejectDocument(documentId, reason);

      if (rejectionResponse.success) {
        console.log(`❌ Document ${documentId} rejected successfully via REAL backend`);
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
      } else {
        console.error('❌ Real backend rejection failed:', rejectionResponse.error);
        throw new Error(rejectionResponse.error || 'Backend rejection failed');
      }
    } catch (error) {
      console.error('❌ Backend rejection error:', error);
      return NextResponse.json({
        success: false,
        error: 'Failed to reject document in backend',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      }, { status: 500 });
    }

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
