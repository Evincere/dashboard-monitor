import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import backendClient from '@/lib/backend-client';
import { mapBackendDocumentToFrontend } from '@/lib/document-status-utils';

const DocumentFilterSchema = z.object({
  search: z.string().optional().nullable(),
  status: z.string().optional().nullable(),
  documentType: z.string().optional().nullable(),
  page: z.string().nullable().optional().transform(val => val ? parseInt(val, 10) : 1).pipe(z.number().min(1)),
  limit: z.string().nullable().optional().transform(val => val ? parseInt(val, 10) : 20).pipe(z.number().min(1).max(100)),
});

async function getDocumentStatistics() {
  try {
    const statsResponse = await backendClient.getDocumentStatistics();
    if (statsResponse.success && statsResponse.data) {
      const data = statsResponse.data as any; // Type assertion to access dynamic properties
      return {
        totalDocuments: data.totalDocumentos || data.totalDocuments || 0,
        uniqueUsers: data.totalUsuarios || data.totalUsuariosUnicos || data.uniqueUsers || 0,
        totalSize: 0,
        avgSize: 0,
        statusCounts: {
          pending: data.pendientes || data.pending || 0,
          approved: data.aprobados || data.approved || 0,
          rejected: data.rechazados || data.rejected || 0
        }
      };
    }
  } catch (error) {
    console.error('Error fetching statistics:', error);
  }
  
  return {
    totalDocuments: 0,
    uniqueUsers: 0,
    totalSize: 0,
    avgSize: 0,
    statusCounts: { pending: 0, approved: 0, rejected: 0 }
  };
}

export async function GET(request: NextRequest) {
  try {
    console.log('📋 Documents API - Starting request');
    
    const { searchParams } = new URL(request.url);
    const validatedParams = DocumentFilterSchema.parse({
      search: searchParams.get('search'),
      status: searchParams.get('status'), 
      documentType: searchParams.get('documentType'),
      page: searchParams.get('page'),
      limit: searchParams.get('limit'),
    });

    console.log('📋 Documents API - Validated params:', validatedParams);

    // Get documents from backend with proper pagination
    const backendParams: any = {};
    
    // For frontend filtering, don't use backend pagination
    if ((validatedParams.search && !/^\d+$/.test(validatedParams.search)) || 
        (validatedParams.documentType && validatedParams.documentType !== 'all')) {
      // Don't set page for frontend filtering - get all data
      console.log('🔧 Frontend filtering detected - getting all data, no backend pagination');
    } else if (validatedParams.page > 1) {
      // Only use backend pagination for non-filtered requests
      backendParams.page = validatedParams.page - 1; // Backend uses 0-based indexing
      console.log('🔧 Using backend pagination for page:', validatedParams.page);
    }
    
    // Set size based on what we need
    backendParams.size = Math.max(validatedParams.limit * 5, 200);

    // Enhanced search functionality with multiple approaches
    if (validatedParams.search) {
      const searchTerm = validatedParams.search.trim();
      console.log('🔍 Searching for:', searchTerm);
      
      if (/^\d+$/.test(searchTerm)) {
        // DNI search - try multiple backend parameters
        backendParams.usuarioId = searchTerm;
        backendParams.userId = searchTerm; // Fallback parameter name
        console.log('🔍 Backend DNI search with usuarioId and userId:', searchTerm);
      } else {
        // Text search - get more data for frontend filtering
        backendParams.size = Math.max(2500, backendParams.size);
        console.log('🔍 Text search - getting larger dataset');
      }
    }

    // Document type filtering - get more data
    if (validatedParams.documentType && validatedParams.documentType !== 'all') {
      backendParams.size = Math.max(2500, backendParams.size);
      console.log('🏷️ Document type filter - getting larger dataset');
    }

    // Add status filter to backend
    if (validatedParams.status && validatedParams.status !== 'all') {
      backendParams.estado = validatedParams.status.toUpperCase();
      console.log('📋 Filtering by status:', validatedParams.status);
    }

    console.log('📋 Documents API - Calling backend with:', backendParams);
    const backendResponse = await backendClient.getDocuments(backendParams);
    
    if (!backendResponse.success || !backendResponse.data) {
      console.error('📋 Backend error:', backendResponse.error);
      return NextResponse.json({
        error: backendResponse.error || 'Failed to fetch documents',
        documents: [],
        pagination: { page: 1, limit: 20, total: 0, totalPages: 0, hasNext: false, hasPrev: false },
        statistics: await getDocumentStatistics(),
        documentTypes: [],
      });
    }

    const documents = backendResponse.data.content || [];
    console.log(`📋 Raw documents from backend: ${documents.length}, total available: ${backendResponse.data.totalElements || "unknown"}`);

    // Map documents to frontend format
    let mappedDocuments = documents.map(mapBackendDocumentToFrontend);
    console.log('📋 Mapped documents:', mappedDocuments.length);

    // Frontend fallback for DNI searches if backend filtering didn't work
    if (validatedParams.search && /^\d+$/.test(validatedParams.search.trim())) {
      const searchedDNI = validatedParams.search.trim();
      const beforeDNIFilter = mappedDocuments.length;
      
      // Check if backend filtering worked (should have fewer results)
      if (mappedDocuments.length > 50) {
        // Backend filtering likely didn't work, apply frontend filtering
        mappedDocuments = mappedDocuments.filter(doc => {
          return doc.user?.id === searchedDNI || doc.user?.id?.toString() === searchedDNI;
        });
        console.log(`🔍 Frontend DNI fallback: ${beforeDNIFilter} -> ${mappedDocuments.length} documents for DNI ${searchedDNI}`);
      } else {
        console.log(`🔍 Backend DNI filtering worked: ${mappedDocuments.length} documents for DNI ${searchedDNI}`);
      }
    }

    // Apply frontend text search filtering  
    if (validatedParams.search && !/^\d+$/.test(validatedParams.search.trim())) {
      const searchTerm = validatedParams.search.trim().toLowerCase();
      const beforeFilter = mappedDocuments.length;
      
      mappedDocuments = mappedDocuments.filter(doc => {
        const searchableFields = [
          doc.user?.name || '',
          doc.user?.email || '',
          doc.documentType || '',
          doc.originalName || doc.name || ''
        ].join(' ').toLowerCase();

        return searchableFields.includes(searchTerm);
      });
      
      console.log(`🔍 Frontend search: ${beforeFilter} -> ${mappedDocuments.length} documents`);
    }

    // Apply document type filter (frontend filtering)
    if (validatedParams.documentType && validatedParams.documentType !== 'all' && mappedDocuments.length > 0) {
      const originalCount = mappedDocuments.length;
      mappedDocuments = mappedDocuments.filter(doc => doc.documentType === validatedParams.documentType);
      console.log(`📋 Document type filter: ${originalCount} -> ${mappedDocuments.length} documents for type "${validatedParams.documentType}"`);
    }

    // Calculate document types with counts from all available documents (for dropdown)
    const allDocuments = documents.map(mapBackendDocumentToFrontend);
    const documentTypesMap = new Map();
    allDocuments.forEach(doc => {
      const type = doc.documentType || 'Documento';
      documentTypesMap.set(type, (documentTypesMap.get(type) || 0) + 1);
    });
    const documentTypes = Array.from(documentTypesMap.entries()).map(([type, count]) => ({ type, count }));
    
    // Handle pagination for filtered results
    let totalForPagination;
    let documentsForResponse;
    
    if ((validatedParams.search && !/^\d+$/.test(validatedParams.search.trim())) || 
        (validatedParams.documentType && validatedParams.documentType !== 'all') ||
        (validatedParams.search && /^\d+$/.test(validatedParams.search.trim()) && mappedDocuments.length <= 50)) {
      // Frontend filtering was applied - paginate filtered results
      totalForPagination = mappedDocuments.length;
      const startIndex = (validatedParams.page - 1) * validatedParams.limit;
      documentsForResponse = mappedDocuments.slice(startIndex, startIndex + validatedParams.limit);
      console.log(`📄 Frontend pagination: page ${validatedParams.page}, showing ${documentsForResponse.length} of ${totalForPagination}`);
    } else {
      // Normal backend pagination
      totalForPagination = backendResponse.data?.totalElements || mappedDocuments.length;
      documentsForResponse = mappedDocuments;
      console.log(`📄 Backend pagination: showing ${documentsForResponse.length} of ${totalForPagination}`);
    }

    // Get statistics
    const statistics = await getDocumentStatistics();

    const response = {
      documents: documentsForResponse,
      pagination: {
        page: validatedParams.page,
        limit: validatedParams.limit,
        total: totalForPagination,
        totalPages: Math.ceil(totalForPagination / validatedParams.limit),
        hasNext: validatedParams.page < Math.ceil(totalForPagination / validatedParams.limit),
        hasPrev: validatedParams.page > 1,
      },
      statistics,
      documentTypes,
      cached: false,
      timestamp: new Date().toISOString()
    };

    console.log(`📋 Final response - returning ${response.documents.length} documents out of ${totalForPagination} total`);
    return NextResponse.json(response);

  } catch (error) {
    console.error('📋 Documents API Error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
        documents: [],
        pagination: { page: 1, limit: 20, total: 0, totalPages: 0, hasNext: false, hasPrev: false },
        statistics: { totalDocuments: 0, uniqueUsers: 0, totalSize: 0, avgSize: 0, statusCounts: { pending: 0, approved: 0, rejected: 0 } },
        documentTypes: [],
      },
      { status: 500 }
    );
  }
}

// ✅ CORREGIDO: Implementar método PUT para cambios de estado
export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const documentId = searchParams.get('id');
    
    if (!documentId) {
      return NextResponse.json({ error: 'Document ID is required' }, { status: 400 });
    }

    const body = await request.json();
    const { validation_status } = body;

    if (!validation_status || !['PENDING', 'APPROVED', 'REJECTED'].includes(validation_status)) {
      return NextResponse.json({ error: 'Valid validation_status is required' }, { status: 400 });
    }

    console.log('🔄 [API] Updating document status:', documentId, 'to:', validation_status);

    let response;
    
    // Mapear al método correspondiente del BackendClient
    switch (validation_status) {
      case 'APPROVED':
        response = await backendClient.approveDocument(documentId);
        break;
      case 'REJECTED':
        response = await backendClient.rejectDocument(documentId, 'Rechazado por el administrador');
        break;
      case 'PENDING':
        response = await backendClient.revertDocument(documentId);
        break;
      default:
        return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    if (!response.success) {
      console.error('🔄 [API] Backend error:', response.error);
      return NextResponse.json({ error: response.error || 'Failed to update document status' }, { status: 500 });
    }

    console.log('✅ [API] Document status updated successfully');
    return NextResponse.json({ success: true, data: response.data });

  } catch (error) {
    console.error('🔄 [API] Error updating document status:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ✅ CORREGIDO: Implementar método DELETE
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const documentId = searchParams.get('id');
    
    if (!documentId) {
      return NextResponse.json({ error: 'Document ID is required' }, { status: 400 });
    }

    console.log('🗑️ [API] Deleting document:', documentId);

    const response = await backendClient.deleteDocument(documentId);

    if (!response.success) {
      console.error('🗑️ [API] Backend error:', response.error);
      return NextResponse.json({ error: response.error || 'Failed to delete document' }, { status: 500 });
    }

    console.log('✅ [API] Document deleted successfully');
    return NextResponse.json({ success: true, message: 'Document deleted successfully' });

  } catch (error) {
    console.error('🗑️ [API] Error deleting document:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
