// src/app/api/backend/inscriptions/route.ts
import { NextRequest, NextResponse } from 'next/server';
import backendClient from '@/lib/backend-client';

/**
 * @fileOverview API Proxy para inscripciones del backend Spring Boot
 * Proporciona acceso a los endpoints de inscripciones con filtros y paginación
 */

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Extraer parámetros de consulta para filtros
    const params = {
      userId: searchParams.get('userId') || undefined,
      status: searchParams.get('status') || undefined,
      contestId: searchParams.get('contestId') ? parseInt(searchParams.get('contestId')!) : undefined,
      page: searchParams.get('page') ? parseInt(searchParams.get('page')!) : undefined,
      size: searchParams.get('size') ? parseInt(searchParams.get('size')!) : undefined,
    };

    console.log('📋 Fetching inscriptions with params:', params);

    const response = await backendClient.getInscriptions(params);
    
    if (!response.success) {
      console.error('Error fetching inscriptions:', response.error);
      return NextResponse.json({
        success: false,
        error: response.error,
        timestamp: new Date().toISOString()
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: response.data,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Inscriptions API error:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch inscriptions',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
