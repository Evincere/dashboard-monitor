const fs = require('fs');
const filePath = 'src/app/api/documents/route.ts';
let content = fs.readFileSync(filePath, 'utf8');

// Clean up any duplicate search logic first
content = content.replace(/    }\s*\n\s*};\s*\n\s*\/\/ Add search parameters to backend[\s\S]*?    \/\/ Add status filter to backend/g, '    // Add status filter to backend');

// Add a simple, effective search implementation
const searchImplementation = `
    // Improved search functionality
    if (validatedParams.search) {
      const searchTerm = validatedParams.search.trim();
      console.log('🔍 Searching for:', searchTerm);
      
      if (/^\\d+$/.test(searchTerm)) {
        // DNI search - use backend
        backendParams.usuarioId = searchTerm;
        console.log('🔍 Backend DNI search');
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
`;

// Insert this after the backendParams.size line
content = content.replace(
  /(backendParams\.size = Math\.max\(validatedParams\.limit \* 5, 200\);[^\n]*\n)/,
  '$1' + searchImplementation
);

// Add frontend search filtering after document mapping
const frontendSearchFilter = `
    // Apply frontend text search filtering
    if (validatedParams.search && !/^\\d+$/.test(validatedParams.search.trim())) {
      const searchTerm = validatedParams.search.trim().toLowerCase();
      const beforeFilter = mappedDocuments.length;
      
      mappedDocuments = mappedDocuments.filter(doc => {
        const searchableFields = [
          doc.user?.name || '',
          doc.user?.email || '',
          doc.documentType || '',
          doc.fileName || doc.originalName || ''
        ].join(' ').toLowerCase();
        
        return searchableFields.includes(searchTerm);
      });
      
      console.log(\`🔍 Frontend search: \${beforeFilter} -> \${mappedDocuments.length} documents\`);
    }
`;

// Insert this after the mapped documents log
content = content.replace(
  /(console\.log\('📋 Mapped documents:', mappedDocuments\.length\);)/,
  '$1' + frontendSearchFilter
);

// Fix pagination calculation for filtered results
const paginationFix = `
    // Handle pagination for filtered results
    let totalForPagination;
    let documentsForResponse;
    
    if ((validatedParams.search && !/^\\d+$/.test(validatedParams.search.trim())) || 
        (validatedParams.documentType && validatedParams.documentType !== 'all')) {
      // Frontend filtering was applied - paginate filtered results
      totalForPagination = mappedDocuments.length;
      const startIndex = (validatedParams.page - 1) * validatedParams.limit;
      documentsForResponse = mappedDocuments.slice(startIndex, startIndex + validatedParams.limit);
      console.log(\`📄 Frontend pagination: page \${validatedParams.page}, showing \${documentsForResponse.length} of \${totalForPagination}\`);
    } else {
      // Normal backend pagination
      totalForPagination = backendResponse.data?.totalElements || mappedDocuments.length;
      documentsForResponse = mappedDocuments;
      console.log(\`📄 Backend pagination: showing \${documentsForResponse.length} of \${totalForPagination}\`);
    }
`;

// Replace the backend pagination section
content = content.replace(
  /    \/\/ Use backend pagination data directly[\s\S]*?    const paginatedDocuments = mappedDocuments;/,
  paginationFix + '\n    const paginatedDocuments = documentsForResponse;'
);

// Fix the total calculation in the response
content = content.replace(
  /const totalFiltered = backendResponse\.data\?\.totalElements \|\| backendResponse\.data\?\.content\?\.length \|\| 0;/,
  'const totalFiltered = totalForPagination;'
);

fs.writeFileSync(filePath, content);
console.log('✅ Clean, comprehensive solution implemented');
