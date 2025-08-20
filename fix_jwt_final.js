const fs = require('fs');

// Function to fix JWT generation
function fixJwtGeneration(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Replace the header generation
  content = content.replace(
    /const header = \{[\s\S]*?\};/,
    `const header = {
    alg: 'HS512'
  };`
  );
  
  fs.writeFileSync(filePath, content);
  console.log(`✅ Fixed JWT header in: ${filePath}`);
}

// Fix both endpoints
fixJwtGeneration('/home/semper/dashboard-monitor/src/app/api/validation/postulants/route.ts');
fixJwtGeneration('/home/semper/dashboard-monitor/src/app/api/validation/search/route.ts');

console.log('🔧 JWT headers fixed in both endpoints');
