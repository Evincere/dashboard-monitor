// src/app/api/validation/reject/route.ts
import { NextRequest, NextResponse } from 'next/server';
import backendClient from '@/lib/backend-client';

/**
 * @fileOverview API para rechazar postulaciones de postulantes
 * Permite rechazar documentos individuales o toda la postulación de un usuario
 */

interface RejectionRequest {
  userId?: string;
  dni?: string;
  documentIds?: string[];
  rejectAll?: boolean;
  reason: string;
  comments?: string;
  validatedBy: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: RejectionRequest = await request.json();

    const { userId, dni, documentIds, rejectAll, reason, comments, validatedBy } = body;

    // Validar que tengamos el identificador del usuario
    if (!userId && !dni) {
      return NextResponse.json({
        success: false,
        error: 'User ID or DNI is required',
        timestamp: new Date().toISOString()
      }, { status: 400 });
    }

    // Validar campos requeridos
    if (!reason || !validatedBy) {
      return NextResponse.json({
        success: false,
        error: 'Rejection reason and validated by fields are required',
        timestamp: new Date().toISOString()
      }, { status: 400 });
    }

    console.log('❌ Processing rejection request:', { userId, dni, documentIds, rejectAll, reason, validatedBy });

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
      usuario: targetUserId,
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

    // Determinar qué documentos rechazar
    let documentsToReject: string[] = [];

    if (rejectAll) {
      // Rechazar todos los documentos pendientes
      documentsToReject = userDocuments
        .filter(doc => ['PENDING', 'PROCESSING'].includes(doc.status))
        .map(doc => doc.id);
    } else if (documentIds && documentIds.length > 0) {
      // Rechazar solo los documentos especificados
      documentsToReject = documentIds.filter(id =>
        userDocuments.some(doc => doc.id === id)
      );
    } else {
      return NextResponse.json({
        success: false,
        error: 'Either specify document IDs or set rejectAll to true',
        timestamp: new Date().toISOString()
      }, { status: 400 });
    }

    if (documentsToReject.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No valid documents to reject',
        timestamp: new Date().toISOString()
      }, { status: 400 });
    }

    console.log(`📝 Rejecting ${documentsToReject.length} documents for user ${targetUserId}`);

    // Construir motivo completo
    const fullReason = comments ? `${reason}. ${comments}` : reason;

    // Rechazar cada documento
    const rejectionResults = [];
    let successCount = 0;
    let errorCount = 0;

    for (const documentId of documentsToReject) {
      try {
        const rejectionResponse = await backendClient.rejectDocument(documentId, fullReason);

        if (rejectionResponse.success) {
          successCount++;
          rejectionResults.push({
            documentId,
            status: 'rejected',
            document: rejectionResponse.data
          });
        } else {
          errorCount++;
          rejectionResults.push({
            documentId,
            status: 'error',
            error: rejectionResponse.error
          });
        }
      } catch (docError) {
        errorCount++;
        rejectionResults.push({
          documentId,
          status: 'error',
          error: docError instanceof Error ? docError.message : 'Unknown error'
        });
      }
    }

    console.log(`❌ Rejection completed: ${successCount} successful, ${errorCount} errors`);

    // Obtener estado actualizado del postulante
    if (!targetUserId) {
      throw new Error('Target user ID is required but was not found');
    }

    const updatedPostulantResponse = await backendClient.getPostulantByDni(targetUserId);
    const updatedPostulant = updatedPostulantResponse.data;

    return NextResponse.json({
      success: true,
      message: `${successCount} document(s) rejected successfully`,
      data: {
        userId: targetUserId,
        rejectedCount: successCount,
        errorCount,
        reason: fullReason,
        results: rejectionResults,
        updatedPostulant: updatedPostulant || null
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Rejection API error:', error);

    return NextResponse.json({
      success: false,
      error: 'Failed to process rejection',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
