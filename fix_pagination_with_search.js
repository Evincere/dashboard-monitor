const fs = require('fs');

const filePath = 'src/app/api/documents/route.ts';
let content = fs.readFileSync(filePath, 'utf8');

// Fix the total count calculation to account for frontend filtering
const improvedPaginationLogic = `
    // Calculate correct totals accounting for frontend filtering
    let totalFiltered;
    if (validatedParams.search && !/^\\d+$/.test(validatedParams.search.trim())) {
      // For frontend text searches, the total is the filtered count
      totalFiltered = mappedDocuments.length;
      console.log(\`📊 Frontend search total: \${totalFiltered}\`);
    } else if (validatedParams.documentType && validatedParams.documentType !== 'all') {
      // For document type filtering, estimate based on filter ratio
      totalFiltered = mappedDocuments.length;
      console.log(\`📊 Document type filter total: \${totalFiltered}\`);
    } else {
      // Use backend total for normal pagination
      totalFiltered = backendResponse.data?.totalElements || backendResponse.data?.content?.length || 0;
      console.log(\`📊 Backend pagination total: \${totalFiltered}\`);
    }

    // For frontend filtering, we need to handle pagination ourselves
    let paginatedDocuments = mappedDocuments;
    if (validatedParams.search && !/^\\d+$/.test(validatedParams.search.trim())) {
      // Frontend pagination for search results
      const startIndex = (validatedParams.page - 1) * validatedParams.limit;
      const endIndex = startIndex + validatedParams.limit;
      paginatedDocuments = mappedDocuments.slice(startIndex, endIndex);
      console.log(\`📄 Frontend pagination: showing \${paginatedDocuments.length} of \${mappedDocuments.length} results\`);
    }
`;

// Replace the existing total calculation logic
content = content.replace(
  /    \/\/ Use backend pagination data directly[\s\S]*?    const paginatedDocuments = mappedDocuments;/,
  improvedPaginationLogic + '\n    // Results are ready for response'
);

fs.writeFileSync(filePath, content);
console.log('✅ Pagination with search filtering fixed');
