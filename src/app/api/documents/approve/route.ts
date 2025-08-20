import { NextRequest, NextResponse } from 'next/server';
import backendClient from '@/lib/backend-client';

/**
 * @fileOverview API para aprobar documentos individuales
 * Utiliza el backend Spring Boot para procesar la aprobación
 */

interface ApprovalRequest {
  documentId: string;
  comments?: string;
  validatedBy: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: ApprovalRequest = await request.json();
    const { documentId, comments, validatedBy } = body;

    // Validar parámetros requeridos
    if (!documentId || !validatedBy) {
      return NextResponse.json({
        success: false,
        error: 'Document ID and validated by are required',
        timestamp: new Date().toISOString()
      }, { status: 400 });
    }

    console.log(`✅ Approving document ${documentId} by ${validatedBy}`);

    // ALWAYS use real backend - no fallback to mock
    try {
      console.log('🔗 Using real backend client for document approval');
      const approvalResponse = await backendClient.approveDocument(documentId);

      if (approvalResponse.success) {
        console.log(`✅ Document ${documentId} approved successfully via REAL backend`);
        return NextResponse.json({
          success: true,
          message: 'Document approved successfully',
          data: {
            documentId,
            validatedBy,
            comments: comments || undefined,
            approvedDocument: approvalResponse.data
          },
          timestamp: new Date().toISOString()
        });
      } else {
        console.error('❌ Real backend approval failed:', approvalResponse.error);
        throw new Error(approvalResponse.error || 'Backend approval failed');
      }
    } catch (error) {
      console.error('❌ Backend approval error:', error);
      return NextResponse.json({
        success: false,
        error: 'Failed to approve document in backend',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      }, { status: 500 });
    }

  } catch (error) {
    console.error('❌ Document approval API error:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to process document approval',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
