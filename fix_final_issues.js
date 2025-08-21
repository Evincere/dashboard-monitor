const fs = require('fs');

const filePath = 'src/app/api/documents/route.ts';
let content = fs.readFileSync(filePath, 'utf8');

// Fix the TypeScript error - replace totalUsuariosUnicos with totalUsuarios
content = content.replace(
  'uniqueUsers: statsResponse.data.totalUsuariosUnicos || 0,',
  'uniqueUsers: statsResponse.data.totalUsuarios || 0,'
);

// Remove duplicate search logic that's causing issues
// First, remove the second search block that starts around line 78
const lines = content.split('\n');
const cleanedLines = [];
let inDuplicateSearchBlock = false;
let duplicateBlockStart = false;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  
  // Detect start of duplicate block
  if (line.includes('// Add search parameters to backend') && 
      cleanedLines.some(l => l.includes('🔍 Searching for:'))) {
    inDuplicateSearchBlock = true;
    duplicateBlockStart = true;
    continue;
  }
  
  // Detect end of duplicate block - when we hit status filter
  if (inDuplicateSearchBlock && line.includes('// Add status filter to backend')) {
    inDuplicateSearchBlock = false;
    cleanedLines.push(line);
    continue;
  }
  
  // Skip lines in duplicate block
  if (inDuplicateSearchBlock) {
    continue;
  }
  
  cleanedLines.push(line);
}

content = cleanedLines.join('\n');

// Remove duplicate frontend search filtering
// The first one is better, so remove the second one
content = content.replace(
  /    \/\/ Apply additional frontend search filtering if needed[\s\S]*?    \}/,
  ''
);

fs.writeFileSync(filePath, content);
console.log('✅ Fixed TypeScript errors and cleaned up duplicates');
