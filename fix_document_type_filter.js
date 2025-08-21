const fs = require('fs');

const filePath = 'src/app/api/documents/route.ts';
let content = fs.readFileSync(filePath, 'utf8');

// First, let's see if we can add tipoDocumentoId to the backend params
// Check if we can map document types to backend IDs

// Add logic to handle document type filtering at the backend level when possible
const documentTypeLogic = `
    // Handle document type filter - try backend first, fallback to frontend
    if (validatedParams.documentType && validatedParams.documentType !== 'all') {
      console.log('🏷️ Filtering by document type:', validatedParams.documentType);
      
      // For certain document types, we can try to use backend filtering
      // For now, we'll need to get more results to ensure we capture all of the desired type
      backendParams.size = Math.max(backendParams.size, 500); // Ensure we get enough results
    }
`;

// Insert this logic after the enhanced search parameters
content = content.replace(
  /(    \/\/ Enhanced search parameters[\s\S]*?    }\n)/,
  '$1' + documentTypeLogic
);

// Now, let's improve the frontend filtering logic to handle pagination better
// when document type filtering is applied
const improvedFilteringLogic = `
    // Apply document type filter BEFORE calculating pagination
    // so we get accurate totals and pagination
    if (validatedParams.documentType && validatedParams.documentType !== 'all' && mappedDocuments.length > 0) {
      const originalCount = mappedDocuments.length;
      mappedDocuments = mappedDocuments.filter(doc => doc.documentType === validatedParams.documentType);
      console.log(\`🏷️ Document type filter: \${originalCount} -> \${mappedDocuments.length} documents for type "\${validatedParams.documentType}"\`);
      
      // If we filtered out too many documents and don't have enough for current page,
      // we may need to fetch more from backend - but for now, work with what we have
      if (mappedDocuments.length === 0 && validatedParams.page === 1) {
        console.log(\`⚠️ No documents found for type "\${validatedParams.documentType}" in current batch\`);
      }
    }

    // Calculate document types with counts from ALL available documents
    // (not just filtered results) to show proper statistics
    const allDocumentsForTypes = documents.map(mapBackendDocumentToFrontend);
    const documentTypesMap = new Map();
    allDocumentsForTypes.forEach(doc => {
      const type = doc.documentType || 'Documento';
      documentTypesMap.set(type, (documentTypesMap.get(type) || 0) + 1);
    });
    const documentTypes = Array.from(documentTypesMap.entries()).map(([type, count]) => ({ type, count }));

    // For document type filtering, we need to estimate total based on what we know
    let totalFiltered;
    if (validatedParams.documentType && validatedParams.documentType !== 'all') {
      // When filtering by document type, use the count from documentTypes if available
      const typeInfo = documentTypes.find(dt => dt.type === validatedParams.documentType);
      totalFiltered = typeInfo ? typeInfo.count : mappedDocuments.length;
    } else {
      totalFiltered = backendResponse.data?.totalElements || backendResponse.data?.content?.length || 0;
    }`;

// Replace the existing filtering and pagination logic
content = content.replace(
  /    \/\/ Apply document type filter \(frontend filtering since backend doesn't support this directly\)[\s\S]*?    \/\/ Calculate document types with counts from filtered results[\s\S]*?    const documentTypes = Array\.from\(documentTypesMap\.entries\(\)\)\.map\(\([^)]+\)\);[\s\S]*?    \/\/ Use backend pagination data directly[\s\S]*?    const totalFiltered = [^;]*;/,
  improvedFilteringLogic
);

fs.writeFileSync(filePath, content);
console.log('✅ Document type filtering logic improved');
