// src/app/api/backend/users/route.ts
import { NextRequest, NextResponse } from 'next/server';
import backendClient from '@/lib/backend-client';

/**
 * @fileOverview API Proxy para usuarios del backend Spring Boot
 * Proporciona acceso a los endpoints de usuarios del backend con manejo unificado
 */

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Extraer parámetros de consulta
    const params = {
      search: searchParams.get('search') || undefined,
      role: searchParams.get('role') || undefined,
      status: searchParams.get('status') || undefined,
      page: searchParams.get('page') ? parseInt(searchParams.get('page')!) : undefined,
      size: searchParams.get('size') ? parseInt(searchParams.get('size')!) : undefined,
      sort: searchParams.get('sort') || undefined,
      direction: searchParams.get('direction') || undefined,
    };

    console.log('🔍 Fetching users with params:', params);

    const response = await backendClient.getUsers(params);
    
    if (!response.success) {
      console.error('Error fetching users:', response.error);
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
    console.error('Users API error:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch users',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
