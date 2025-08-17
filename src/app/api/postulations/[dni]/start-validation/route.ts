import { NextRequest, NextResponse } from 'next/server';
import backendClient from '@/lib/backend-client';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { dni: string } }
) {
  console.log('🟡 API Route - Iniciando proceso de validación /api/postulations/[dni]/start-validation');
  
  try {
    const { dni } = params;
    console.log('🔍 DNI extraído de params:', dni);

    // Leer el body de la request
    const requestBody = await request.json();
    console.log('🔍 Request body completo:', JSON.stringify(requestBody, null, 2));

    const { inscriptionId, note } = requestBody;
    console.log('🔍 Datos extraídos del body:', { inscriptionId, note });

    console.log('🟡 API Route - Iniciando validación para postulación:', {
      dni,
      inscriptionId,
      note,
      timestamp: new Date().toISOString()
    });

    if (!inscriptionId) {
      console.log('❌ Error: ID de inscripción faltante');
      return NextResponse.json(
        { 
          success: false, 
          error: 'ID de inscripción requerido' 
        },
        { status: 400 }
      );
    }

    console.log('🟡 Cambiando estado COMPLETED_WITH_DOCS → PENDING...');
    
    // Usar el método del backend client para cambiar a PENDING
    const result = await backendClient.startValidation(inscriptionId, note || 'Inicio de proceso de validación administrativa');

    console.log('✅ Resultado del inicio de validación:', JSON.stringify(result, null, 2));

    if (!result.success) {
      console.log('❌ Backend retornó error:', result.error);
      return NextResponse.json(result, { status: 400 });
    }

    console.log('✅ Validación iniciada exitosamente');
    return NextResponse.json(result);

  } catch (error) {
    console.error('❌ Error en API start-validation:', error);
    console.error('❌ Error stack:', error instanceof Error ? error.stack : 'No stack available');
    
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Error interno del servidor',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}
