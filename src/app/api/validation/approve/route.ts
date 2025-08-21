// src/app/api/validation/approve/route.ts
import { NextRequest, NextResponse } from 'next/server';
import backendClient from '@/lib/backend-client';

/**
 * @fileOverview API para aprobar postulaciones de postulantes
 * Permite aprobar documentos individuales o toda la postulación de un usuario
 */

interface ApprovalRequest {
  userId?: string;
  dni?: string;
  documentIds?: string[];
  approveAll?: boolean;
  comments?: string;
  validatedBy: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: ApprovalRequest = await request.json();

    const { userId, dni, documentIds, approveAll, comments, validatedBy } = body;

    // Validar que tengamos el identificador del usuario
    if (!userId && !dni) {
      return NextResponse.json({
        success: false,
        error: 'User ID or DNI is required',
        timestamp: new Date().toISOString()
      }, { status: 400 });
    }

    // Validar que tengamos el validador
    if (!validatedBy) {
      return NextResponse.json({
        success: false,
        error: 'Validated by field is required',
        timestamp: new Date().toISOString()
      }, { status: 400 });
    }

    console.log('✅ Processing approval request:', { userId, dni, documentIds, approveAll, validatedBy });

    let targetUserId = userId;

    // Si tenemos DNI pero no userId, buscar el usuario
    if (!targetUserId && dni) {
      const postulantResponse = await backendClient.getPostulantByDni(dni);

      if (!postulantResponse.success || !postulantResponse.data?.user) {
        return NextResponse.json({
          success: false,
          error: 'Postulant not found with provided DNI',
          timestamp: new Date().toISOString()
        }, { status: 404 });
      }

      targetUserId = postulantResponse.data.user.id;
    }

    // Obtener documentos del usuario
    const documentsResponse = await backendClient.getDocuments({
      usuarioId: targetUserId,
      size: 100
    });

    if (!documentsResponse.success) {
      console.error('Error fetching user documents:', documentsResponse.error);
      return NextResponse.json({
        success: false,
        error: documentsResponse.error,
        timestamp: new Date().toISOString()
      }, { status: 500 });
    }

    const userDocuments = documentsResponse.data?.content || [];

    if (userDocuments.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No documents found for this user',
        timestamp: new Date().toISOString()
      }, { status: 404 });
    }

    // Determinar qué documentos aprobar
    let documentsToApprove: string[] = [];

    if (approveAll) {
      // Aprobar todos los documentos pendientes
      documentsToApprove = userDocuments
        .filter(doc => doc.status === 'PENDING')
        .map(doc => doc.id);
    } else if (documentIds && documentIds.length > 0) {
      // Aprobar solo los documentos especificados
      documentsToApprove = documentIds.filter(id =>
        userDocuments.some(doc => doc.id === id)
      );
    } else {
      return NextResponse.json({
        success: false,
        error: 'Either specify document IDs or set approveAll to true',
        timestamp: new Date().toISOString()
      }, { status: 400 });
    }

    if (documentsToApprove.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No valid documents to approve',
        timestamp: new Date().toISOString()
      }, { status: 400 });
    }

    console.log(`📝 Approving ${documentsToApprove.length} documents for user ${targetUserId}`);

    // Aprobar cada documento
    const approvalResults = [];
    let successCount = 0;
    let errorCount = 0;

    for (const documentId of documentsToApprove) {
      try {
        const approvalResponse = await backendClient.approveDocument(documentId);

        if (approvalResponse.success) {
          successCount++;
          approvalResults.push({
            documentId,
            status: 'approved',
            document: approvalResponse.data
          });
        } else {
          errorCount++;
          approvalResults.push({
            documentId,
            status: 'error',
            error: approvalResponse.error
          });
        }
      } catch (docError) {
        errorCount++;
        approvalResults.push({
          documentId,
          status: 'error',
          error: docError instanceof Error ? docError.message : 'Unknown error'
        });
      }
    }

    console.log(`✅ Approval completed: ${successCount} successful, ${errorCount} errors`);

    // Obtener estado actualizado del postulante
    if (!targetUserId) {
      throw new Error('Target user ID is required but was not found');
    }

    const updatedPostulantResponse = await backendClient.getPostulantByDni(targetUserId);
    const updatedPostulant = updatedPostulantResponse.data;

    return NextResponse.json({
      success: true,
      message: `${successCount} document(s) approved successfully`,
      data: {
        userId: targetUserId,
        approvedCount: successCount,
        errorCount,
        results: approvalResults,
        updatedPostulant: updatedPostulant || null
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Approval API error:', error);

    return NextResponse.json({
      success: false,
      error: 'Failed to process approval',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
