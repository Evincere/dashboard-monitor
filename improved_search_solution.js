const fs = require('fs');

const filePath = 'src/app/api/documents/route.ts';
let content = fs.readFileSync(filePath, 'utf8');

// Replace the current logic for search with a more comprehensive approach
const searchLogic = `    // Enhanced search with better backend integration
    if (validatedParams.search) {
      const searchTerm = validatedParams.search.trim();
      console.log('🔍 Enhanced search for:', searchTerm);
      
      if (/^\\d+$/.test(searchTerm)) {
        // For numeric searches (DNI), use usuarioId
        backendParams.usuarioId = searchTerm;
        console.log('🔍 DNI search:', searchTerm);
      } else {
        // For text searches, use general search AND increase result limit
        backendParams.busqueda = searchTerm;
        // Get more results for text searches to ensure we don't miss matches
        backendParams.size = Math.max(backendParams.size, 1000);
        console.log('🔍 Text search:', searchTerm, 'with size:', backendParams.size);
      }
    }`;

// Insert this after the size setting
content = content.replace(
  /(backendParams\.size = Math\.max\(validatedParams\.limit \* 5, 200\);[^\n]*\n)/,
  '$1\n' + searchLogic + '\n'
);

// Also enhance the document type filtering logic
const documentTypeLogic = `
    // Document type filtering - get more results if filtering by type
    if (validatedParams.documentType && validatedParams.documentType !== 'all') {
      console.log('🏷️ Filtering by document type:', validatedParams.documentType);
      // Increase size to get more documents for filtering
      backendParams.size = Math.max(backendParams.size, 1000);
    }`;

content = content.replace(
  /(🔍 Text search[^}]+})/,
  '$1' + documentTypeLogic
);

fs.writeFileSync(filePath, content);
console.log('✅ Enhanced search and filtering implemented');
