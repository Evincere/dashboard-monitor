import { NextRequest, NextResponse } from 'next/server';
import backendClient from '@/lib/backend-client';

/**
 * @fileOverview API para revertir documentos a estado PENDING
 * Utiliza el backend Spring Boot para procesar la reversión
 */

interface RevertRequest {
  documentId: string;
  validatedBy: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: RevertRequest = await request.json();
    const { documentId, validatedBy } = body;

    // Validar parámetros requeridos
    if (!documentId || !validatedBy) {
      return NextResponse.json({
        success: false,
        error: 'Document ID and validated by are required',
        timestamp: new Date().toISOString()
      }, { status: 400 });
    }

    console.log(`🔄 Reverting document ${documentId} to PENDING by ${validatedBy}`);

    // ALWAYS use real backend - no fallback to mock
    try {
      console.log('🔗 Using real backend client for document revert');
      const revertResponse = await backendClient.revertDocument(documentId);

      if (revertResponse.success) {
        console.log(`🔄 Document ${documentId} reverted successfully via REAL backend`);
        return NextResponse.json({
          success: true,
          message: 'Document reverted to PENDING successfully',
          data: {
            documentId,
            validatedBy,
            revertedDocument: revertResponse.data
          },
          timestamp: new Date().toISOString()
        });
      } else {
        console.error('❌ Real backend revert failed:', revertResponse.error);
        throw new Error(revertResponse.error || 'Backend revert failed');
      }
    } catch (error) {
      console.error('❌ Backend revert error:', error);
      return NextResponse.json({
        success: false,
        error: 'Failed to revert document in backend',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      }, { status: 500 });
    }

  } catch (error) {
    console.error('❌ Document revert API error:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to process document revert',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
