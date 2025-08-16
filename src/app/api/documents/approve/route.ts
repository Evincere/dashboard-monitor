import { NextRequest, NextResponse } from 'next/server';
import backendClient from '@/lib/backend-client';

/**
 * @fileOverview API para aprobar documentos individuales
 * Utiliza el backend Spring Boot para procesar la aprobación
 */

interface ApprovalRequest {
  documentId: string;
  reason?: string;
  validatedBy: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: ApprovalRequest = await request.json();
    const { documentId, reason, validatedBy } = body;

    // Validar parámetros requeridos
    if (!documentId || !validatedBy) {
      return NextResponse.json({
        success: false,
        error: 'Document ID and validated by are required',
        timestamp: new Date().toISOString()
      }, { status: 400 });
    }

    console.log(`✅ Approving document ${documentId} by ${validatedBy}`);

    // Usar el backend client para aprobar el documento
    const approvalResponse = await backendClient.approveDocument(documentId);

    if (!approvalResponse.success) {
      console.error('Backend approval failed:', approvalResponse.error);
      return NextResponse.json({
        success: false,
        error: 'Failed to approve document',
        details: approvalResponse.error,
        timestamp: new Date().toISOString()
      }, { status: 500 });
    }

    console.log(`✅ Document ${documentId} approved successfully`);

    return NextResponse.json({
      success: true,
      message: 'Document approved successfully',
      data: {
        documentId,
        validatedBy,
        reason: reason || undefined,
        approvedDocument: approvalResponse.data
      },
      timestamp: new Date().toISOString()
    });

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
