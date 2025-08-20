// Fix inmediato para las URLs de documentos
const fs = require('fs');

const filePath = 'src/app/(dashboard)/postulations/[dni]/documents/page.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// Hardcodear las URLs correctas temporalmente
content = content.replace(
  /const endpoint = action === 'approve' \? apiUrl\('documents\/approve'\) : apiUrl\('documents\/reject'\);/,
  `const endpoint = action === 'approve' ? '/dashboard-monitor/api/documents/approve' : '/dashboard-monitor/api/documents/reject';
      console.log("🔧 Fixed endpoint URL:", endpoint);`
);

fs.writeFileSync(filePath, content);
console.log('✅ URLs de documentos hardcodeadas para solución inmediata');
