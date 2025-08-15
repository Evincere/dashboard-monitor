// src/app/api/test-db/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { testDatabaseConnection } from '@/services/database';

export async function GET(request: NextRequest) {
  try {
    const result = await testDatabaseConnection();
    
    return NextResponse.json({
      success: true,
      message: 'Conexión a base de datos exitosa',
      data: result,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error testing database connection:', error);
    
    return NextResponse.json({
      success: false,
      message: 'Error al conectar con la base de datos',
      error: error instanceof Error ? error.message : 'Error desconocido',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}