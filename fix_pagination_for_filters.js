const fs = require('fs');
const filePath = 'src/app/api/documents/route.ts';
let content = fs.readFileSync(filePath, 'utf8');

// Fix the pagination logic to get all data when frontend filtering is needed
content = content.replace(
  /    \/\/ Only add pagination params if not first page\s*\n    if \(validatedParams\.page > 1\) \{\s*\n      backendParams\.page = validatedParams\.page - 1; \/\/ Backend uses 0-based indexing\s*\n    \}/,
  `    // For frontend filtering, don't use backend pagination
    if ((validatedParams.search && !/^\\d+$/.test(validatedParams.search)) || 
        (validatedParams.documentType && validatedParams.documentType !== 'all')) {
      // Don't set page for frontend filtering - get all data
      console.log('🔧 Frontend filtering detected - getting all data, no backend pagination');
    } else if (validatedParams.page > 1) {
      // Only use backend pagination for non-filtered requests
      backendParams.page = validatedParams.page - 1; // Backend uses 0-based indexing
      console.log('🔧 Using backend pagination for page:', validatedParams.page);
    }`
);

fs.writeFileSync(filePath, content);
console.log('✅ Fixed pagination logic for frontend filtering');
