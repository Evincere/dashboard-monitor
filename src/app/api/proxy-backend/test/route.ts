// src/app/api/backend/test/route.ts
import { NextRequest, NextResponse } from 'next/server';
import backendClient from '@/lib/backend-client';

export async function GET(request: NextRequest) {
  try {
    console.log('🔧 Testing backend connection...');
    
    // Test 1: Verificar configuración
    const isEnabled = backendClient.isEnabled();
    console.log('Backend integration enabled:', isEnabled);
    
    if (!isEnabled) {
      return NextResponse.json({
        success: false,
        error: 'Backend integration is disabled',
        config: {
          enabled: process.env.ENABLE_BACKEND_INTEGRATION,
          apiUrl: process.env.BACKEND_API_URL,
          hasJwtSecret: !!process.env.BACKEND_JWT_SECRET
        }
      }, { status: 503 });
    }

    // Test 2: Test de conectividad
    const connectionTest = await backendClient.testConnection();
    console.log('Connection test result:', connectionTest);

    if (!connectionTest.success) {
      return NextResponse.json({
        success: false,
        error: 'Failed to connect to backend',
        details: connectionTest.error,
        timestamp: new Date().toISOString()
      }, { status: 503 });
    }

    // Test 3: Obtener estadísticas como prueba adicional
    const statsTest = await backendClient.getDocumentStatistics();
    console.log('Statistics test result:', statsTest);

    return NextResponse.json({
      success: true,
      message: 'Backend connection successful',
      tests: {
        configuration: {
          enabled: true,
          apiUrl: process.env.BACKEND_API_URL,
          hasJwtSecret: !!process.env.BACKEND_JWT_SECRET
        },
        connectivity: connectionTest.success,
        statistics: statsTest.success ? statsTest.data : null
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Backend test error:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Backend test failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
