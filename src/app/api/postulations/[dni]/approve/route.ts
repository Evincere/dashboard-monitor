import { NextRequest, NextResponse } from 'next/server';
import backendClient from '@/lib/backend-client';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ dni: string }> }
) {
  console.log('🟢 API Route - Iniciando PATCH /api/postulations/[dni]/approve');
  
  try {
    const resolvedParams = await params;
    const { dni } = resolvedParams;
    console.log('🔍 DNI extraído de params:', dni);

    // Leer el body de la request
    const requestBody = await request.json();
    console.log('🔍 Request body completo:', JSON.stringify(requestBody, null, 2));

    const { inscriptionId, note } = requestBody;
    console.log('🔍 Datos extraídos del body:', { inscriptionId, note });

    console.log('🟢 API Route - Aprobando inscripción:', {
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

    console.log('🟡 Llamando a backendClient.approveInscription...');
    
    // Llamar al backend para aprobar la inscripción
    const result = await backendClient.approveInscription(inscriptionId, note);

    console.log('✅ Backend response completa:', JSON.stringify(result, null, 2));

    if (!result.success) {
      console.log('❌ Backend retornó error:', result.error);
      return NextResponse.json(result, { status: 400 });
    }

    console.log('✅ Aprobación exitosa, retornando resultado');
    return NextResponse.json(result);

  } catch (error) {
    console.error('❌ Error en API approve:', error);
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
