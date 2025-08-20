// Fix agresivo para todas las URLs problemáticas
const fs = require('fs');
const path = require('path');

// Función para encontrar y reemplazar todas las llamadas a apiUrl problemáticas
function fixApiUrlsInFile(filePath) {
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  File not found: ${filePath}`);
    return;
  }
  
  let content = fs.readFileSync(filePath, 'utf8');
  const originalContent = content;
  
  // Reemplazar todas las llamadas específicas a documentos
  content = content.replace(
    /apiUrl\('documents\/approve'\)/g,
    "'/dashboard-monitor/api/documents/approve'"
  );
  
  content = content.replace(
    /apiUrl\('documents\/reject'\)/g,
    "'/dashboard-monitor/api/documents/reject'"
  );
  
  // También reemplazar las llamadas a postulaciones que podrían estar fallando
  content = content.replace(
    /apiUrl\(`postulations\/\$\{dni\}\/documents`\)/g,
    "`/dashboard-monitor/api/postulations/${dni}/documents`"
  );
  
  content = content.replace(
    /apiUrl\(`postulations\/\$\{dni\}\/approve`\)/g,
    "`/dashboard-monitor/api/postulations/${dni}/approve`"
  );
  
  content = content.replace(
    /apiUrl\(`postulations\/\$\{dni\}\/reject`\)/g,
    "`/dashboard-monitor/api/postulations/${dni}/reject`"
  );
  
  content = content.replace(
    /apiUrl\(`postulations\/\$\{dni\}\/revert`\)/g,
    "`/dashboard-monitor/api/postulations/${dni}/revert`"
  );
  
  content = content.replace(
    /apiUrl\(`postulations\/\$\{dni\}\/initiate-validation`\)/g,
    "`/dashboard-monitor/api/postulations/${dni}/initiate-validation`"
  );
  
  if (content !== originalContent) {
    fs.writeFileSync(filePath, content);
    console.log(`✅ Fixed URLs in: ${filePath}`);
    return true;
  }
  
  return false;
}

// Archivos a corregir
const filesToFix = [
  'src/app/(dashboard)/postulations/[dni]/documents/page.tsx',
  'src/app/(dashboard)/postulations/[dni]/documents/validation/page.tsx'
];

console.log('🔧 Applying aggressive URL fixes...');

let fixedFiles = 0;
filesToFix.forEach(file => {
  if (fixApiUrlsInFile(file)) {
    fixedFiles++;
  }
});

console.log(`✅ Fixed ${fixedFiles} files with hardcoded URLs`);
