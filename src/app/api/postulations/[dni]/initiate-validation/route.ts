import { NextRequest, NextResponse } from 'next/server';
import backendClient from '@/lib/backend-client';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { dni: string } }
) {
  const resolvedParams = await params;
  const { dni } = resolvedParams;

  try {
    // Get the request body
    const body = await request.json();
    const { inscriptionId, note } = body;

    if (!inscriptionId) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'ID de inscripción requerido' 
        },
        { status: 400 }
      );
    }

    console.log('🔄 Iniciando validación para inscripción:', {
      dni,
      inscriptionId,
      note
    });

    // Use the backend client's startValidation method
    const result = await backendClient.startValidation(
      inscriptionId,
      note || 'Validación de documentos iniciada'
    );

    if (result.success) {
      console.log('✅ Estado cambiado a PENDING exitosamente:', result.data);
      
      return NextResponse.json({
        success: true,
        message: 'Estado de inscripción cambiado a PENDING exitosamente',
        data: result.data
      });
    } else {
      console.error('❌ Error del backend al cambiar estado a PENDING:', {
        error: result.error,
        fullResult: result,
        inscriptionId,
        dni
      });
      
      return NextResponse.json(
        { 
          success: false, 
          error: result.error || 'Error al cambiar estado de inscripción',
          details: result,
          debug: {
            inscriptionId,
            dni,
            requestedState: 'PENDING'
          }
        },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('💥 Error en initiate-validation endpoint:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Error interno del servidor',
        details: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    );
  }
}
