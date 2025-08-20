const fs = require('fs');
const path = require('path');

// Function to fix JWT algorithm from HS256 to HS512 in files
function fixJwtAlgorithm(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const updatedContent = content.replace(/alg: 'HS256'/g, "alg: 'HS512'");
  fs.writeFileSync(filePath, updatedContent);
  console.log(`✅ Fixed JWT algorithm in: ${filePath}`);
}

// Fix postulants endpoint
fixJwtAlgorithm('/home/semper/dashboard-monitor/src/app/api/validation/postulants/route.ts');

// Fix search endpoint
fixJwtAlgorithm('/home/semper/dashboard-monitor/src/app/api/validation/search/route.ts');

console.log('🔧 JWT algorithm fixed in both endpoints');
