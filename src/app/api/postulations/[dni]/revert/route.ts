import { NextRequest, NextResponse } from 'next/server';
import backendClient, { ApiResponse, PagedResponse } from '@/lib/backend-client';
import { BackendInscription } from '@/types/backend';

/**
 * @fileOverview API para revertir el estado de una postulación de REJECTED o APPROVED a PENDING
 * Utiliza el backend Spring Boot para hacer la transición de estado real
 */

interface RevertRequest {
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
    const { reason, revertedBy } = body;

    console.log(`🔄 [REVERT] Starting revert process for DNI: ${dni}`);
    console.log(`📋 [REVERT] Request body:`, { reason, revertedBy });

    if (!dni) {
      console.error(`❌ [REVERT] DNI is missing`);
      return NextResponse.json({
        success: false,
        error: 'DNI is required',
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

    console.log(`🔄 [REVERT] Reverting postulation state for DNI: ${dni} by ${revertedBy}`);

    // Paso 1: Buscar el usuario por DNI
    const usersResponse = await backendClient.getUsers({ size: 1000 });

    if (!usersResponse.success || !usersResponse.data?.content?.length) {
      console.error(`❌ [REVERT] Failed to fetch users from backend`);
      return NextResponse.json({
        success: false,
        error: 'User not found in backend',
        timestamp: new Date().toISOString()
      }, { status: 404 });
    }

    const user = usersResponse.data.content.find((u: any) =>
      (u.dni === dni) || (u.username === dni)
    );

    if (!user) {
      console.error(`❌ [REVERT] User with DNI ${dni} not found`);
      return NextResponse.json({
        success: false,
        error: `User with DNI ${dni} not found`,
        timestamp: new Date().toISOString()
      }, { status: 404 });
    }

    console.log(`👤 [REVERT] Found user: ${user.fullName || user.name} (ID: ${user.id})`);

    // Paso 2: Buscar la inscripción del usuario
    const inscriptionsResponse: ApiResponse<PagedResponse<BackendInscription>> = await backendClient.getInscriptions({
      userId: user.id,
      size: 10
    });

    if (!inscriptionsResponse.success || !inscriptionsResponse.data?.content?.length) {
      console.error(`❌ [REVERT] No inscription found for user ${user.id}`);
      return NextResponse.json({
        success: false,
        error: 'No inscription found for this user',
        timestamp: new Date().toISOString()
      }, { status: 404 });
    }

    const inscription = inscriptionsResponse.data.content[0];
    console.log(`📋 [REVERT] Found inscription: ${inscription.id} (current status: ${inscription.status})`);

    // Verificar que está en estado REJECTED o APPROVED
    if (inscription.status !== 'REJECTED' && inscription.status !== 'APPROVED') {
      console.error(`❌ [REVERT] Invalid status for revert: ${inscription.status}`);
      return NextResponse.json({
        success: false,
        error: `Inscription is not in REJECTED or APPROVED status. Current status: ${inscription.status}`,
        timestamp: new Date().toISOString()
      }, { status: 400 });
    }

    // Paso 3: Cambiar estado en el backend Spring Boot usando la API real
    try {
      console.log(`🔧 [REVERT] Calling backend startValidation for inscription ${inscription.id}`);
      
      const stateChangeResponse = await backendClient.startValidation(
        inscription.id,
        reason || `Estado revertido por ${revertedBy} - Revisión manual`
      );

      if (!stateChangeResponse.success) {
        console.error(`❌ [REVERT] Backend state change failed:`, stateChangeResponse.error);
        throw new Error(stateChangeResponse.error || 'Backend state change failed');
      }

      console.log(`✅ [REVERT] Successfully reverted inscription ${inscription.id} from ${inscription.status} to PENDING`);

      return NextResponse.json({
        success: true,
        message: 'Postulation status reverted successfully',
        data: {
          inscription: {
            id: inscription.id,
            dni,
            previousStatus: inscription.status,
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
