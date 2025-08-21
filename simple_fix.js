const fs = require('fs');

const filePath = 'src/app/api/documents/route.ts';
let content = fs.readFileSync(filePath, 'utf8');

// Remove the broken/duplicated lines that are causing the syntax error
content = content.replace(/    }\s*\n\s*};\s*\n\s*\/\/ Add search parameters to backend\s*\n[\s\S]*?    \/\/ Add status filter to backend/m, '    // Add status filter to backend');

// Clean up any remaining duplicate search logic
const lines = content.split('\n');
let cleaned = [];
let skipNext = false;
let inDuplicateBlock = false;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  
  // Skip duplicate search parameter blocks
  if (line.includes('// Add search parameters to backend') && cleaned.some(l => l.includes('// Add search parameters to backend'))) {
    inDuplicateBlock = true;
    continue;
  }
  
  if (inDuplicateBlock) {
    if (line.trim() === '}' && lines[i+1] && lines[i+1].includes('// Add status filter')) {
      inDuplicateBlock = false;
      continue;
    }
    continue;
  }
  
  cleaned.push(line);
}

content = cleaned.join('\n');
fs.writeFileSync(filePath, content);
console.log('✅ Code cleanup completed');
