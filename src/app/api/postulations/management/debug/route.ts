import { NextRequest, NextResponse } from 'next/server';
import backendClient from '@/lib/backend-client';

/**
 * @fileOverview API de diagnóstico para identificar problemas de performance
 * Endpoint simple que permite probar diferentes niveles de funcionalidad
 */

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const testLevel = searchParams.get('level') || '1';
  
  console.log(`🔍 DIAGNÓSTICO - Nivel ${testLevel} - Iniciando...`);
  
  try {
    switch (testLevel) {
      case '1':
        // Nivel 1: Test básico - solo devolver respuesta estática
        console.log(`✅ DIAGNÓSTICO - Nivel 1: Respuesta estática OK`);
        return NextResponse.json({
          success: true,
          level: 1,
          message: 'Test básico - Sin consultas BD',
          timestamp: new Date().toISOString(),
          data: {
            static: true
          }
        });

      case '2':
        // Nivel 2: Test de conectividad backendClient
        console.log(`🔍 DIAGNÓSTICO - Nivel 2: Probando conectividad backendClient...`);
        const isEnabled = backendClient.isEnabled();
        console.log(`✅ DIAGNÓSTICO - Nivel 2: BackendClient enabled: ${isEnabled}`);
        
        return NextResponse.json({
          success: true,
          level: 2,
          message: 'Test conectividad backend',
          timestamp: new Date().toISOString(),
          data: {
            backendEnabled: isEnabled
          }
        });

      case '3':
        // Nivel 3: Test de consulta simple de usuarios (sin procesamiento)
        console.log(`🔍 DIAGNÓSTICO - Nivel 3: Probando consulta simple de usuarios...`);
        
        const usersResponse = await backendClient.getUsers({ size: 10 }); // Solo 10 usuarios
        
        console.log(`✅ DIAGNÓSTICO - Nivel 3: Users query result:`, {
          success: usersResponse.success,
          userCount: usersResponse.data?.content?.length || 0,
          error: usersResponse.error
        });
        
        return NextResponse.json({
          success: true,
          level: 3,
          message: 'Test consulta usuarios básica',
          timestamp: new Date().toISOString(),
          data: {
            usersSuccess: usersResponse.success,
            userCount: usersResponse.data?.content?.length || 0,
            error: usersResponse.error
          }
        });

      case '4':
        // Nivel 4: Test de consulta simple de inscripciones
        console.log(`🔍 DIAGNÓSTICO - Nivel 4: Probando consulta simple de inscripciones...`);
        
        const inscriptionsResponse = await backendClient.getInscriptions({ size: 10 });
        
        console.log(`✅ DIAGNÓSTICO - Nivel 4: Inscriptions query result:`, {
          success: inscriptionsResponse.success,
          inscriptionCount: inscriptionsResponse.data?.content?.length || 0,
          error: inscriptionsResponse.error
        });
        
        return NextResponse.json({
          success: true,
          level: 4,
          message: 'Test consulta inscripciones básica',
          timestamp: new Date().toISOString(),
          data: {
            inscriptionsSuccess: inscriptionsResponse.success,
            inscriptionCount: inscriptionsResponse.data?.content?.length || 0,
            error: inscriptionsResponse.error
          }
        });

      case '5':
        // Nivel 5: Test de consulta de documentos para UN usuario específico
        console.log(`🔍 DIAGNÓSTICO - Nivel 5: Probando consulta de documentos para un usuario...`);
        
        // Primero obtener un usuario
        const singleUserResponse = await backendClient.getUsers({ size: 1 });
        if (!singleUserResponse.success || !singleUserResponse.data?.content?.length) {
          throw new Error('No se pudo obtener usuarios para test');
        }
        
        const testUser = singleUserResponse.data.content[0];
        console.log(`🔍 DIAGNÓSTICO - Nivel 5: Testing documents for user: ${testUser.id}`);
        
        const documentsResponse = await backendClient.getDocuments({
          usuarioId: testUser.id,
          size: 5
        });
        
        console.log(`✅ DIAGNÓSTICO - Nivel 5: Documents query result:`, {
          success: documentsResponse.success,
          documentCount: documentsResponse.data?.content?.length || 0,
          error: documentsResponse.error
        });
        
        return NextResponse.json({
          success: true,
          level: 5,
          message: 'Test consulta documentos para un usuario',
          timestamp: new Date().toISOString(),
          data: {
            testUserId: testUser.id,
            documentsSuccess: documentsResponse.success,
            documentCount: documentsResponse.data?.content?.length || 0,
            error: documentsResponse.error
          }
        });

      default:
        return NextResponse.json({
          success: false,
          error: 'Nivel de test no válido. Use levels 1-5',
          timestamp: new Date().toISOString()
        }, { status: 400 });
    }

  } catch (error) {
    console.error(`❌ DIAGNÓSTICO - Nivel ${testLevel} FAILED:`, error);
    return NextResponse.json({
      success: false,
      level: parseInt(testLevel),
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
