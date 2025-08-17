const fs = require('fs');
const path = require('path');

// Configuration similar to the API
const LOCAL_DOCS_PATH = process.env.LOCAL_DOCUMENTS_PATH || 'B:\\concursos_situacion_post_gracia\\descarga_administracion_20250814_191745\\documentos';
const STORAGE_BASE_PATH = process.env.STORAGE_BASE_DIR || '/app/storage';
const DOCUMENTS_DIR = process.env.DOCUMENTS_DIR || 'documents';

// Test file paths from database (based on the structure we confirmed earlier)
const testFiles = [
  {
    path: '35515608/23204633-822e-488a-ab32-07e5ffb4aa8a_DNI__Dorso__1754703516277.pdf',
    id: '23204633-822e-488a-ab32-07e5ffb4aa8a'
  },
  {
    path: '35515608/69fc33eb-49d7-49b9-8a9a-d51055841886_Certificado_de_Antigüedad_Profesional__1748103516278.pdf',
    id: '69fc33eb-49d7-49b9-8a9a-d51055841886'
  },
  {
    path: '35515608/abc1dd8b-7cd7-49ba-80f8-49e908e89c0c_Certificado_Sin_Sanciones_Disciplinarias__1751903516278.pdf',
    id: 'abc1dd8b-7cd7-49ba-80f8-49e908e89c0c'
  }
];

async function getFileSize(filePath, documentId) {
  if (!filePath) {
    console.warn(`📏 getFileSize: filePath is empty`);
    return 0;
  }
  
  try {
    console.log(`📏 getFileSize: Processing filePath: "${filePath}" with documentId: "${documentId}"`);
    
    // Extract DNI from filePath
    const pathParts = filePath.split('/');
    const dni = pathParts[0];
    const fileName = pathParts[pathParts.length - 1];
    
    console.log(`📏 getFileSize: Extracted DNI: "${dni}", fileName: "${fileName}"`);
    
    // Try multiple possible paths
    const possibleBasePaths = [
      LOCAL_DOCS_PATH,
      path.join(STORAGE_BASE_PATH, DOCUMENTS_DIR),
      path.join(process.cwd(), 'storage', 'documents'),
      path.join(process.cwd(), 'uploads'),
      '/app/storage/documents',
      path.join('C:', 'app', 'storage', 'documents'),
    ];
    
    console.log(`📏 getFileSize: LOCAL_DOCS_PATH = "${LOCAL_DOCS_PATH}"`);
    
    // First, try exact path matching
    for (const basePath of possibleBasePaths) {
      const exactPath = path.join(basePath, filePath);
      try {
        console.log(`📏 getFileSize: Trying exact path: "${exactPath}"`);
        const stats = await fs.promises.stat(exactPath);
        if (stats.isFile()) {
          console.log(`✅ getFileSize: File found (exact match)! Size: ${stats.size} bytes at "${exactPath}"`);
          return stats.size;
        }
      } catch (err) {
        console.log(`❌ getFileSize: Exact path failed: ${err.code || err.message}`);
        continue;
      }
    }
    
    // If exact match fails and we have a documentId, try fuzzy matching
    if (documentId && dni) {
      console.log(`📏 getFileSize: Exact match failed, trying fuzzy matching with documentId: ${documentId}`);
      
      for (const basePath of possibleBasePaths) {
        const userDir = path.join(basePath, dni);
        try {
          const files = await fs.promises.readdir(userDir);
          console.log(`📏 getFileSize: Found ${files.length} files in "${userDir}"`);
          
          // Look for files that start with the documentId
          const matchingFile = files.find(file => file.startsWith(documentId));
          
          if (matchingFile) {
            const fullPath = path.join(userDir, matchingFile);
            console.log(`📏 getFileSize: Found fuzzy match: "${matchingFile}"`);
            
            const stats = await fs.promises.stat(fullPath);
            if (stats.isFile()) {
              console.log(`✅ getFileSize: File found (fuzzy match)! Size: ${stats.size} bytes at "${fullPath}"`);
              return stats.size;
            }
          }
        } catch (err) {
          console.log(`❌ getFileSize: Fuzzy matching in "${userDir}" failed: ${err.code || err.message}`);
          continue;
        }
      }
    }
    
    // If no file found, return 0
    console.warn(`📏 getFileSize: Could not find file in any path for: ${filePath}`);
    return 0;
  } catch (error) {
    console.error(`📏 getFileSize: Unexpected error for ${filePath}:`, error);
    return 0;
  }
}

// Test the function with sample file paths
async function runTests() {
  console.log('🧪 Testing file size calculation...\n');
  
  for (const testFile of testFiles) {
    console.log(`\n=== Testing: ${testFile.path} ===`);
    const size = await getFileSize(testFile.path, testFile.id);
    console.log(`Result: ${size} bytes\n`);
  }
}

runTests().catch(console.error);
