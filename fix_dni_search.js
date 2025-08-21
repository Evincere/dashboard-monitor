const fs = require('fs');
const filePath = 'src/app/api/documents/route.ts';
let content = fs.readFileSync(filePath, 'utf8');

// Replace the DNI search logic with a more robust version that tries multiple approaches
const improvedDNISearch = `    // Enhanced search functionality with multiple approaches
    if (validatedParams.search) {
      const searchTerm = validatedParams.search.trim();
      console.log('🔍 Searching for:', searchTerm);
      
      if (/^\\d+$/.test(searchTerm)) {
        // DNI search - try multiple backend parameters
        backendParams.usuarioId = searchTerm;
        backendParams.userId = searchTerm; // Fallback parameter name
        console.log('🔍 Backend DNI search with usuarioId and userId:', searchTerm);
      } else {
        // Text search - get more data for frontend filtering
        backendParams.size = Math.max(2500, backendParams.size);
        console.log('🔍 Text search - getting larger dataset');
      }
    }`;

// Replace the existing search functionality
content = content.replace(
  /    \/\/ Enhanced search functionality[\s\S]*?    }/,
  improvedDNISearch
);

// Also add frontend fallback filtering for DNI searches
const frontendDNIFallback = `
    // Frontend fallback for DNI searches if backend filtering didn't work
    if (validatedParams.search && /^\\d+$/.test(validatedParams.search.trim())) {
      const searchedDNI = validatedParams.search.trim();
      const beforeDNIFilter = mappedDocuments.length;
      
      // Check if backend filtering worked (should have fewer results)
      if (mappedDocuments.length > 50) {
        // Backend filtering likely didn't work, apply frontend filtering
        mappedDocuments = mappedDocuments.filter(doc => {
          return doc.user?.id === searchedDNI || doc.user?.id?.toString() === searchedDNI;
        });
        console.log(\`🔍 Frontend DNI fallback: \${beforeDNIFilter} -> \${mappedDocuments.length} documents for DNI \${searchedDNI}\`);
      } else {
        console.log(\`🔍 Backend DNI filtering worked: \${mappedDocuments.length} documents for DNI \${searchedDNI}\`);
      }
    }`;

// Insert this after the regular frontend text search filtering
content = content.replace(
  /(console\.log\(`🔍 Frontend search: \${beforeFilter} -> \${mappedDocuments\.length} documents`\);\s*\n    \})/,
  '$1' + frontendDNIFallback
);

fs.writeFileSync(filePath, content);
console.log('✅ Enhanced DNI search with backend + frontend fallback');
