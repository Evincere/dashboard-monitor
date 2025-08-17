import { NextRequest, NextResponse } from 'next/server';
import backendClient from '@/lib/backend-client';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { dni: string } }
) {
  try {
    const resolvedParams = await params;
    const { dni } = resolvedParams;
    const { inscriptionId, note } = await request.json();

    console.log('🔴 API Route - Rechazando inscripción:', {
      dni,
      inscriptionId,
      note
    });

    if (!inscriptionId) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'ID de inscripción requerido' 
        },
        { status: 400 }
      );
    }

    // Llamar al backend para rechazar la inscripción
    const result = await backendClient.rejectInscription(inscriptionId, note);

    console.log('✅ Backend response:', result);

    return NextResponse.json(result);

  } catch (error) {
    console.error('❌ Error en API reject:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Error interno del servidor' 
      },
      { status: 500 }
    );
  }
}
