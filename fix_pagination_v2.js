const fs = require('fs');

const filePath = 'src/app/api/documents/route.ts';
let content = fs.readFileSync(filePath, 'utf8');

// Replace the backend params configuration
const newBackendParamsSection = `    // Get documents from backend with proper pagination
    const backendParams: any = {};
    
    // Only add pagination params if not first page, or if we need a specific limit
    if (validatedParams.page > 1) {
      backendParams.page = validatedParams.page - 1; // Backend uses 0-based indexing
    }
    
    // Always set size to get the requested amount
    backendParams.size = validatedParams.limit;

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

// Replace the backend params section
content = content.replace(
  /\/\/ Get documents from backend with real pagination[\s\S]*?console\.log\('📋 Searching by general term:', searchTerm\);\s*}\s*}/,
  newBackendParamsSection + '\n\n    }'
);

fs.writeFileSync(filePath, content);
console.log('✅ Backend pagination fixed');
