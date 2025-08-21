const fs = require('fs');

// Read the file
let content = fs.readFileSync('src/app/api/documents/route.ts', 'utf8');

// Find the section where we get documents from backend
const beforeGetDocuments = content.indexOf('const response = await backendClient.getDocuments(backendParams);');
const afterGetDocuments = content.indexOf('let documents = response.data?.content || [];');
const afterMapping = content.indexOf('const mappedDocuments = documents.map(mapBackendDocumentToFrontend);');

if (beforeGetDocuments === -1 || afterGetDocuments === -1) {
  console.log('Could not find the expected code sections');
  process.exit(1);
}

// Replace the logic to get MORE documents if we're filtering client-side
const newLogic = `
    // Get more documents if we're applying client-side filters
    const needsClientFiltering = (
      (validatedParams.status && validatedParams.status !== 'all') ||
      (validatedParams.type && validatedParams.type !== 'all') ||
      (validatedParams.user) ||
      (validatedParams.search)
    );

    if (needsClientFiltering) {
      // Get more documents to compensate for client-side filtering
      backendParams.size = Math.min(100, validatedParams.limit * 10);
      backendParams.page = Math.max(0, validatedParams.page - 1);
    }

    console.log('📋 Documents API - Frontend params:', validatedParams);
    console.log('📋 Documents API - Backend params:', backendParams);
    console.log('📋 Documents API - Needs client filtering:', needsClientFiltering);

    // Get documents from backend using backendClient
    const response = await backendClient.getDocuments(backendParams);

    if (!response.success) {
      console.error('Failed to get documents from backend:', response.error);
      console.error('Backend response details:', response);
      return NextResponse.json(
        { error: response.error || 'Failed to fetch documents' },
        { status: 500 }
      );
    }

    let documents = response.data?.content || [];
    const totalCount = response.data?.totalElements || 0;
    const totalPages = response.data?.totalPages || 0;

    console.log(\`📋 Documents API - Retrieved \${documents.length} documents from backend\`);
    console.log(\`📋 Documents API - Total count: \${totalCount}, Total pages: \${totalPages}\`);
    if (documents.length > 0) {
      console.log(\`📋 Documents API - First document status: \${documents[0].status}\`);
    }

    // Map documents to frontend format BEFORE filtering
    documents = documents.map(mapBackendDocumentToFrontend);

    // TEMPORARY: Apply client-side filtering if backend filtering is not working
    // This is a workaround until the Spring Boot backend properly handles filters
    if (validatedParams.status && validatedParams.status !== 'all') {
      const originalCount = documents.length;
      documents = documents.filter(doc => (doc.status || doc.validationStatus) === validatedParams.status);
      console.log(\`📋 Documents API - Client-side status filtering: \${originalCount} -> \${documents.length} documents with status \${validatedParams.status}\`);
    }

    if (validatedParams.type && validatedParams.type !== 'all') {
      const originalCount = documents.length;
      documents = documents.filter(doc => (doc.documentTypeId || doc.documentType) === validatedParams.type);
      console.log(\`📋 Documents API - Client-side type filtering: \${originalCount} -> \${documents.length} documents with type \${validatedParams.type}\`);
    }

    if (validatedParams.user) {
      const originalCount = documents.length;
      documents = documents.filter(doc => (doc.userId || doc.user?.id) === validatedParams.user);
      console.log(\`📋 Documents API - Client-side user filtering: \${originalCount} -> \${documents.length} documents for user \${validatedParams.user}\`);
    }

    if (validatedParams.search) {
      const originalCount = documents.length;
      const searchLower = validatedParams.search.toLowerCase();
      documents = documents.filter(doc => 
        (doc.fileName || doc.name || doc.originalName)?.toLowerCase().includes(searchLower) ||
        (doc.userId || doc.user?.name || doc.user?.email)?.toLowerCase().includes(searchLower)
      );
      console.log(\`📋 Documents API - Client-side search filtering: \${originalCount} -> \${documents.length} documents matching search "\${validatedParams.search}"\`);
    }

    // Apply pagination AFTER filtering
    const startIndex = (validatedParams.page - 1) * validatedParams.limit;
    const endIndex = startIndex + validatedParams.limit;
    const paginatedDocuments = documents.slice(startIndex, endIndex);
    
    console.log(\`📋 Documents API - Pagination: showing \${paginatedDocuments.length} documents (page \${validatedParams.page}, limit \${validatedParams.limit})\`);
    
    // Recalculate pagination info based on filtered results
    const filteredTotal = documents.length;
    const filteredTotalPages = Math.ceil(filteredTotal / validatedParams.limit);
`;

// Find where to insert this logic
const startPattern = 'console.log(\'📋 Documents API - Backend parameters:\', backendParams);';
const endPattern = 'const mappedDocuments = documents.map(mapBackendDocumentToFrontend);';

const startIndex = content.indexOf(startPattern);
const endIndex = content.indexOf(endPattern);

if (startIndex === -1 || endIndex === -1) {
  console.log('Could not find pattern to replace');
  console.log('Start pattern found:', startIndex !== -1);
  console.log('End pattern found:', endIndex !== -1);
  process.exit(1);
}

// Replace the section
const before = content.substring(0, startIndex);
const after = content.substring(endIndex + endPattern.length);

content = before + newLogic + '\n    // Skip the mapping since we already did it above\n    const mappedDocuments = paginatedDocuments;' + after;

// Also need to update the return statement to use filteredTotal
content = content.replace(
  /total: totalCount,/g,
  'total: needsClientFiltering ? filteredTotal : totalCount,'
).replace(
  /totalPages: totalPages,/g,
  'totalPages: needsClientFiltering ? filteredTotalPages : totalPages,'
).replace(
  /hasNext: validatedParams\.page < totalPages,/g,
  'hasNext: validatedParams.page < (needsClientFiltering ? filteredTotalPages : totalPages),'
);

// Write the fixed content
fs.writeFileSync('src/app/api/documents/route.ts', content);

console.log('Fixed pagination and filtering logic in route.ts');
