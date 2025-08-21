const fs = require('fs');

// Read the current file
const filePath = 'src/app/api/documents/route.ts';
let content = fs.readFileSync(filePath, 'utf8');

// Replace the backend params section to use real backend pagination
const newBackendParamsSection = `    // Get documents from backend with real pagination
    const backendParams: any = {
      page: validatedParams.page - 1, // Backend uses 0-based indexing
      size: validatedParams.limit, // Use the actual requested limit
    };

    // Add search parameters to backend
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
    }`;

// Replace the section from "// Get documents from backend" to the end of the search parameters
content = content.replace(
  /\/\/ Get documents from backend.*?\n    }/s,
  newBackendParamsSection + '\n\n    }'
);

// Fix the pagination calculation section to use backend pagination data
const newPaginationSection = `    // Use backend pagination data directly
    const totalFiltered = backendResponse.data.totalElements || 0;
    const paginatedDocuments = mappedDocuments; // Backend already paginated these

    // Get statistics
    const statistics = await getDocumentStatistics();

    const response = {
      documents: paginatedDocuments,
      pagination: {
        page: validatedParams.page,
        limit: validatedParams.limit,
        total: totalFiltered,
        totalPages: Math.ceil(totalFiltered / validatedParams.limit),
        hasNext: validatedParams.page < Math.ceil(totalFiltered / validatedParams.limit),
        hasPrev: validatedParams.page > 1,
      },
      statistics,
      documentTypes,
      cached: false,
      timestamp: new Date().toISOString()
    };`;

// Replace the pagination section
content = content.replace(
  /\/\/ Apply pagination to filtered results[\s\S]*?timestamp: new Date\(\)\.toISOString\(\)\s*}/,
  newPaginationSection
);

// Write the updated content
fs.writeFileSync(filePath, content);
console.log('✅ Pagination fix applied successfully');
