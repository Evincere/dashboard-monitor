const fs = require('fs');

const filePath = 'src/app/api/documents/route.ts';
let content = fs.readFileSync(filePath, 'utf8');

// Remove the duplicate and broken search logic (lines around 85-103)
content = content.replace(
  /    }\s*\n\s*};\s*\n\s*\/\/ Add search parameters to backend[\s\S]*?    }\s*\n/,
  ''
);

// Also let's clean up any other duplicated search logic
content = content.replace(
  /    \/\/ Add search parameters to backend\s*\n    if \(validatedParams\.search\) \{[\s\S]*?    \}\s*\n/g,
  ''
);

// Now let's add a proper, enhanced search logic that handles multiple scenarios
const searchLogic = `    // Enhanced search parameters
    if (validatedParams.search) {
      const searchTerm = validatedParams.search.trim();
      console.log('🔍 Searching for:', searchTerm);
      
      // If it looks like a DNI (only numbers), search by user ID
      if (/^\\d+$/.test(searchTerm)) {
        backendParams.usuarioId = searchTerm;
        console.log('🔍 Searching by DNI/usuarioId:', searchTerm);
      } else {
        // For text searches, try multiple approaches to get better results
        backendParams.busqueda = searchTerm;
        console.log('🔍 Searching by general term:', searchTerm);
        
        // For better results, let's also try without pagination limits initially
        // to ensure we get all matching documents from the backend
        if (!backendParams.page || backendParams.page === 0) {
          backendParams.size = Math.max(backendParams.size, 1000); // Increase size for searches
        }
      }
    }

`;

// Insert the search logic after backendParams.size is set
content = content.replace(
  /(backendParams\.size = Math\.max\(validatedParams\.limit \* 5, 200\);[^\n]*\n)/,
  '$1\n' + searchLogic
);

fs.writeFileSync(filePath, content);
console.log('✅ Search logic fixed and enhanced');
