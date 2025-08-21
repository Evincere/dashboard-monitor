const fs = require('fs');

const filePath = 'src/app/api/documents/route.ts';
let content = fs.readFileSync(filePath, 'utf8');

// Replace the current search logic with hybrid approach
const hybridSearchLogic = `    // Hybrid search approach: backend for DNI, frontend for text
    let useBackendSearch = false;
    if (validatedParams.search) {
      const searchTerm = validatedParams.search.trim();
      console.log('🔍 Hybrid search for:', searchTerm);
      
      if (/^\\d+$/.test(searchTerm)) {
        // For numeric searches (DNI), use backend search
        backendParams.usuarioId = searchTerm;
        useBackendSearch = true;
        console.log('🔍 Backend DNI search:', searchTerm);
      } else {
        // For text searches, get larger dataset and search frontend
        backendParams.size = Math.max(backendParams.size, 2000); // Get large dataset
        console.log('🔍 Frontend text search setup for:', searchTerm, 'with size:', backendParams.size);
        
        // Remove any backend search params for text search
        delete backendParams.busqueda;
      }
    }`;

// Find and replace the existing search logic
content = content.replace(
  /    \/\/ Enhanced search with better backend integration[\s\S]*?    }/,
  hybridSearchLogic
);

// Now enhance the frontend filtering to handle text search
const frontendSearchLogic = `
    // Apply frontend text search if needed
    if (validatedParams.search && !/^\\d+$/.test(validatedParams.search.trim())) {
      const searchTerm = validatedParams.search.trim().toLowerCase();
      const originalCount = mappedDocuments.length;
      
      mappedDocuments = mappedDocuments.filter(doc => {
        const searchableText = [
          doc.user?.name || '',
          doc.user?.email || '',
          doc.user?.id || '',
          doc.documentType || '',
          doc.fileName || doc.originalName || ''
        ].join(' ').toLowerCase();
        
        return searchableText.includes(searchTerm);
      });
      
      console.log(\`🔍 Frontend search filtered: \${originalCount} -> \${mappedDocuments.length} documents for "\${searchTerm}"\`);
    }`;

// Insert this after the document mapping but before document type filtering
content = content.replace(
  /(console\.log\('📋 Mapped documents:', mappedDocuments\.length\);)/,
  '$1' + frontendSearchLogic
);

fs.writeFileSync(filePath, content);
console.log('✅ Hybrid search solution implemented');
