import { NextRequest, NextResponse } from 'next/server';
import backendClient from '@/lib/backend-client';

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
  { params }: { params: { dni: string } }
) {
  try {
    const dni = params.dni;
    const body: RevertRequest = await request.json();
    const { reason, revertedBy } = body;

    if (!dni) {
      return NextResponse.json({
        success: false,
        error: 'DNI is required',
        timestamp: new Date().toISOString()
      }, { status: 400 });
    }

    if (!revertedBy) {
      return NextResponse.json({
        success: false,
        error: 'revertedBy is required',
        timestamp: new Date().toISOString()
      }, { status: 400 });
    }

    console.log(`🔄 Reverting postulation state for DNI: ${dni} by ${revertedBy}`);

    // Paso 1: Buscar el usuario por DNI
    const usersResponse = await backendClient.getUsers({ size: 1000 });
    
    if (!usersResponse.success || !usersResponse.data?.content?.length) {
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
      return NextResponse.json({
        success: false,
        error: `User with DNI ${dni} not found`,
        timestamp: new Date().toISOString()
      }, { status: 404 });
    }

    console.log(`👤 Found user: ${user.fullName || user.name} (ID: ${user.id})`);

    // Paso 2: Buscar la inscripción del usuario
    const inscriptionsResponse = await backendClient.getInscriptions({ 
      userId: user.id, 
      size: 10 
    });

    if (!inscriptionsResponse.success || !inscriptionsResponse.data?.content?.length) {
      return NextResponse.json({
        success: false,
        error: 'No inscription found for this user',
        timestamp: new Date().toISOString()
      }, { status: 404 });
    }

    const inscription = inscriptionsResponse.data.content[0];
    console.log(`📋 Found inscription: ${inscription.id} (current state: ${inscription.state})`);

    // Verificar que está en estado REJECTED o APPROVED
    if (inscription.state !== 'REJECTED' && inscription.state !== 'APPROVED') {
      return NextResponse.json({
        success: false,
        error: `Inscription is not in REJECTED or APPROVED state. Current state: ${inscription.state}`,
        timestamp: new Date().toISOString()
      }, { status: 400 });
    }

    // Paso 3: Cambiar estado en el backend Spring Boot usando la API real
    try {
      const stateChangeResponse = await backendClient.startValidation(
        inscription.id,
        reason || `Estado revertido por ${revertedBy} - Revisión manual`
      );

      if (!stateChangeResponse.success) {
        throw new Error(stateChangeResponse.error || 'Backend state change failed');
      }

      console.log(`✅ Successfully reverted inscription ${inscription.id} from ${inscription.state} to PENDING`);

      return NextResponse.json({
        success: true,
        message: 'Postulation state reverted successfully',
        data: {
          inscription: {
            id: inscription.id,
            dni,
            previousState: inscription.state,
            newState: 'PENDING',
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
      console.error('❌ Backend state change failed:', backendError);
      
      return NextResponse.json({
        success: false,
        error: 'Failed to change state in backend',
        details: backendError instanceof Error ? backendError.message : 'Unknown backend error',
        timestamp: new Date().toISOString()
      }, { status: 500 });
    }

  } catch (error) {
    console.error('❌ Postulation revert API error:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to revert postulation state',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
