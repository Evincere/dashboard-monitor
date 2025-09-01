// src/app/api/backend/documents/route.ts
import { NextRequest, NextResponse } from 'next/server';
import backendClient from '@/lib/backend-client';

/**
 * @fileOverview API Proxy para documentos del backend Spring Boot
 * Proporciona acceso a los endpoints de documentos con filtros y paginación
 */

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Extraer parámetros de consulta para filtros
    const params = {
      estado: searchParams.get('estado') || undefined,
      tipoDocumentoId: searchParams.get('tipoDocumentoId') || undefined,
      usuario: searchParams.get('usuarioId') || undefined,
      fechaDesde: searchParams.get('fechaDesde') || undefined,
      fechaHasta: searchParams.get('fechaHasta') || undefined,
      busqueda: searchParams.get('busqueda') || undefined,
      page: searchParams.get('page') ? parseInt(searchParams.get('page')!) : undefined,
      size: searchParams.get('size') ? parseInt(searchParams.get('size')!) : undefined,
      sort: searchParams.get('sort') || undefined,
      direction: searchParams.get('direction') || undefined,
    };

    console.log('📄 Fetching documents with params:', params);

    const response = await backendClient.getDocuments(params);
    
    if (!response.success) {
      console.error('Error fetching documents:', response.error);
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
    console.error('Documents API error:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch documents',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const documentId = searchParams.get('id');
    const action = searchParams.get('action');

    if (!documentId) {
      return NextResponse.json({
        success: false,
        error: 'Document ID is required',
        timestamp: new Date().toISOString()
      }, { status: 400 });
    }

    if (!action || !['approve', 'reject'].includes(action)) {
      return NextResponse.json({
        success: false,
        error: 'Valid action (approve/reject) is required',
        timestamp: new Date().toISOString()
      }, { status: 400 });
    }

    let response;

    if (action === 'approve') {
      console.log('✅ Approving document:', documentId);
      response = await backendClient.approveDocument(documentId);
    } else if (action === 'reject') {
      const body = await request.json();
      const motivo = body.motivo || 'No especificado';
      
      console.log('❌ Rejecting document:', documentId, 'Reason:', motivo);
      response = await backendClient.rejectDocument(documentId, motivo);
    }

    if (!response || !response.success) {
      console.error(`Error ${action}ing document:`, response?.error);
      return NextResponse.json({
        success: false,
        error: response?.error || `Failed to ${action} document`,
        timestamp: new Date().toISOString()
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: response.data,
      message: `Document ${action}ed successfully`,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Document action error:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to process document action',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const documentId = searchParams.get('id');

    if (!documentId) {
      return NextResponse.json({
        success: false,
        error: 'Document ID is required',
        timestamp: new Date().toISOString()
      }, { status: 400 });
    }

    console.log('🗑️ [Proxy] Eliminando documento:', documentId);

    const response = await backendClient.deleteDocument(documentId);
    
    if (!response.success) {
      console.error('Error deleting document:', response.error);
      return NextResponse.json({
        success: false,
        error: response.error,
        timestamp: new Date().toISOString()
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: response.data,
      message: 'Document deleted successfully',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Document deletion error:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to delete document',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
