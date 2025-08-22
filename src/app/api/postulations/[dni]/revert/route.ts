import { NextRequest, NextResponse } from 'next/server';
import backendClient from '@/lib/backend-client';

/**
 * @fileOverview API para revertir el estado de una postulación de REJECTED o APPROVED a PENDING
 * Utiliza el backend Spring Boot para hacer la transición de estado real
 */

interface RevertRequest {
  inscriptionId: string;
  reason?: string;
  revertedBy: string;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ dni: string }> }
) {
  try {
    const { dni } = await params;
    const body: RevertRequest = await request.json();
    const { inscriptionId, reason, revertedBy } = body;

    console.log(`🔄 [REVERT] Starting revert process for DNI: ${dni}`);
    console.log(`📋 [REVERT] Request body:`, { inscriptionId, reason, revertedBy });

    // Validaciones de entrada
    if (!dni) {
      console.error(`❌ [REVERT] DNI is missing`);
      return NextResponse.json({
        success: false,
        error: 'DNI is required',
        timestamp: new Date().toISOString()
      }, { status: 400 });
    }

    if (!inscriptionId) {
      console.error(`❌ [REVERT] inscriptionId is missing`);
      return NextResponse.json({
        success: false,
        error: 'inscriptionId is required',
        timestamp: new Date().toISOString()
      }, { status: 400 });
    }

    if (!revertedBy) {
      console.error(`❌ [REVERT] revertedBy is missing`);
      return NextResponse.json({
        success: false,
        error: 'revertedBy is required',
        timestamp: new Date().toISOString()
      }, { status: 400 });
    }

    console.log(`🔄 [REVERT] Reverting inscription ${inscriptionId} for DNI: ${dni} by ${revertedBy}`);

    // Directamente usar el inscriptionId para cambiar estado a PENDING usando startValidation
    try {
      console.log(`🔧 [REVERT] Calling backend startValidation for inscription ${inscriptionId}`);
      
      const stateChangeResponse = await backendClient.startValidation(
        inscriptionId,
        reason || `Estado revertido por ${revertedBy} - Revisión manual`
      );

      if (!stateChangeResponse.success) {
        console.error(`❌ [REVERT] Backend state change failed:`, stateChangeResponse.error);
        throw new Error(stateChangeResponse.error || 'Backend state change failed');
      }

      console.log(`✅ [REVERT] Successfully reverted inscription ${inscriptionId} to PENDING`);

      return NextResponse.json({
        success: true,
        message: 'Postulation status reverted successfully',
        data: {
          inscription: {
            id: inscriptionId,
            dni,
            newStatus: 'PENDING',
            revertedAt: new Date().toISOString(),
            revertedBy,
            reason: reason || 'Estado revertido para nueva evaluación'
          },
          nextSteps: [
            'La postulación ha sido revertida a estado PENDING',
            'Los documentos mantienen su estado actual de validación',
            'La postulación está lista para nueva revisión administrativa'
          ]
        },
        timestamp: new Date().toISOString()
      });

    } catch (backendError) {
      console.error('❌ [REVERT] Backend state change failed:', backendError);

      return NextResponse.json({
        success: false,
        error: 'Failed to change state in backend',
        details: backendError instanceof Error ? backendError.message : 'Unknown backend error',
        timestamp: new Date().toISOString()
      }, { status: 500 });
    }

  } catch (error) {
    console.error('❌ [REVERT] Postulation revert API error:', error);

    return NextResponse.json({
      success: false,
      error: 'Failed to revert postulation state',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
