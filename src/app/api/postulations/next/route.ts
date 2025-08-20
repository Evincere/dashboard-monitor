import { NextRequest, NextResponse } from 'next/server';
import backendClient from '@/lib/backend-client';

/**
 * API para obtener la próxima postulación pendiente de validación
 */

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Buscando próxima postulación pendiente...');

    // Obtener todas las inscripciones
    const inscriptionsResponse = await backendClient.getInscriptions({ size: 1000 });
    
    if (!inscriptionsResponse.success) {
      throw new Error('Failed to fetch inscriptions from backend');
    }
    
    const allInscriptions = inscriptionsResponse.data?.content || [];
    
    console.log(`📋 Revisando ${allInscriptions.length} inscripciones...`);
    
    // Filtrar inscripciones que requieren validación
    // Estados que requieren validación: COMPLETED_WITH_DOCS, ACTIVE, PENDING
    const pendingValidationStates = ['COMPLETED_WITH_DOCS', 'PENDING']; // Excluir ACTIVE
    const pendingInscriptions = allInscriptions.filter(inscription => 
      pendingValidationStates.includes(inscription.state) && inscription.userInfo?.dni
    );
    
    console.log(`🔍 Encontradas ${pendingInscriptions.length} inscripciones pendientes de validación`);
    
    if (pendingInscriptions.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No hay postulaciones pendientes de validación',
        hasNext: false,
        timestamp: new Date().toISOString()
      });
    }
    
    // Obtener la primera inscripción pendiente
    const nextInscription = pendingInscriptions[0];
    
    console.log(`✅ Próxima postulación: ${nextInscription.userInfo.dni} (${nextInscription.state})`);
    
    return NextResponse.json({
      success: true,
      hasNext: true,
      dni: nextInscription.userInfo.dni,
      postulant: {
        dni: nextInscription.userInfo.dni,
        fullName: nextInscription.userInfo.fullName,
        email: nextInscription.userInfo.email
      },
      inscription: {
        id: nextInscription.id,
        state: nextInscription.state,
        createdAt: nextInscription.inscriptionDate
      },
      totalPending: pendingInscriptions.length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error getting next postulation:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
