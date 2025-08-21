const fs = require('fs');

const filePath = 'src/app/api/documents/route.ts';
let content = fs.readFileSync(filePath, 'utf8');

// Create a completely new GET function that properly handles backend pagination
const newGetFunction = `export async function GET(request: NextRequest) {
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

    // Build backend parameters - handle first page specially
    const backendParams: any = {};
    
    // For pagination: omit page parameter for first page (backend issue with page=0)
    if (validatedParams.page > 1) {
      backendParams.page = validatedParams.page - 1; // Backend uses 0-based indexing
    }
    
    // Set size for the requested limit
    backendParams.size = validatedParams.limit;

    // Add search parameters
    if (validatedParams.search) {
      const searchTerm = validatedParams.search.trim();
      console.log('📋 Searching for:', searchTerm);
      
      // If it looks like a DNI (only numbers), search by user ID
      if (/^\\d+$/.test(searchTerm)) {
        backendParams.usuarioId = searchTerm;
        console.log('📋 Searching by DNI/usuarioId:', searchTerm);
      } else {
        // Otherwise, search by general term
        backendParams.busqueda = searchTerm;
        console.log('📋 Searching by general term:', searchTerm);
      }
    }

    // Add status filter
    if (validatedParams.status && validatedParams.status !== 'all') {
      backendParams.estado = validatedParams.status.toUpperCase();
      console.log('📋 Filtering by status:', validatedParams.status);
    }

    console.log('📋 Documents API - Backend params:', backendParams);
    
    // Call backend
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
    const totalDocuments = backendResponse.data.totalElements || 0;
    
    console.log(\`📋 Backend returned: \${documents.length} documents, total: \${totalDocuments}\`);

    // Map documents to frontend format
    let mappedDocuments = documents.map(mapBackendDocumentToFrontend);
    
    // Apply frontend filtering only for document type (since backend doesn't support this filter directly)
    if (validatedParams.documentType && validatedParams.documentType !== 'all') {
      const originalCount = mappedDocuments.length;
      mappedDocuments = mappedDocuments.filter(doc => doc.documentType === validatedParams.documentType);
      console.log(\`📋 Document type filter: \${originalCount} -> \${mappedDocuments.length} documents for type "\${validatedParams.documentType}"\`);
    }

    // Calculate document types with counts from current page results
    const documentTypesMap = new Map();
    mappedDocuments.forEach(doc => {
      const type = doc.documentType || 'Documento';
      documentTypesMap.set(type, (documentTypesMap.get(type) || 0) + 1);
    });
    const documentTypes = Array.from(documentTypesMap.entries()).map(([type, count]) => ({ type, count }));

    // Get statistics
    const statistics = await getDocumentStatistics();

    // Calculate proper pagination based on backend data
    const effectiveTotal = validatedParams.documentType && validatedParams.documentType !== 'all' ? 
      mappedDocuments.length : totalDocuments;
    
    const totalPages = Math.ceil(effectiveTotal / validatedParams.limit);

    const response = {
      documents: mappedDocuments,
      pagination: {
        page: validatedParams.page,
        limit: validatedParams.limit,
        total: effectiveTotal,
        totalPages: totalPages,
        hasNext: validatedParams.page < totalPages,
        hasPrev: validatedParams.page > 1,
      },
      statistics,
      documentTypes,
      cached: false,
      timestamp: new Date().toISOString()
    };

    console.log(\`📋 Final response - returning \${response.documents.length} documents, total: \${response.pagination.total}\`);
    return NextResponse.json(response);

  } catch (error) {
    console.error('📋 Documents API Error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error.message,
        documents: [],
        pagination: { page: 1, limit: 20, total: 0, totalPages: 0, hasNext: false, hasPrev: false },
        statistics: { totalDocuments: 0, uniqueUsers: 0, totalSize: 0, avgSize: 0, statusCounts: { pending: 0, approved: 0, rejected: 0 } },
        documentTypes: [],
      },
      { status: 500 }
    );
  }
}`;

// Replace the entire GET function
content = content.replace(
  /export async function GET\(request: NextRequest\) \{[\s\S]*?\n}/,
  newGetFunction
);

fs.writeFileSync(filePath, content);
console.log('✅ Final pagination solution implemented');
