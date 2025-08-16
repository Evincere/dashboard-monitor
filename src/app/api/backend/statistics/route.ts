// src/app/api/backend/statistics/route.ts
import { NextRequest, NextResponse } from 'next/server';
import backendClient from '@/lib/backend-client';

/**
 * @fileOverview API Proxy para estadísticas del backend Spring Boot
 * Proporciona estadísticas consolidadas de documentos y estado general
 */

export async function GET(request: NextRequest) {
  try {
    console.log('📊 Fetching backend statistics...');

    const response = await backendClient.getDocumentStatistics();
    
    if (!response.success) {
      console.error('Error fetching statistics:', response.error);
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
    console.error('Statistics API error:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch statistics',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
