const fs = require('fs');

// Leer el archivo actual
const filePath = 'src/app/api/postulations/[dni]/documents/route.ts';
let content = fs.readFileSync(filePath, 'utf8');

// Agregar logs de debugging en la función calculateValidationStatus
const oldFunctionStart = `  // Calcular progreso basado en TODOS los documentos (obligatorios + opcionales)
  // Progreso = documentos validados (APPROVED + REJECTED) / total documentos
  const validatedDocs = documents.filter(doc => doc.validationStatus !== 'PENDING').length;
  const completionPercentage = Math.round((validatedDocs / documents.length) * 100);`;

const newFunctionStart = `  // Calcular progreso basado en TODOS los documentos (obligatorios + opcionales)
  // Progreso = documentos validados (APPROVED + REJECTED) / total documentos
  const validatedDocs = documents.filter(doc => doc.validationStatus !== 'PENDING').length;
  const completionPercentage = Math.round((validatedDocs / documents.length) * 100);
  
  console.log(\`🔍 PROGRESS DEBUG: Total docs: \${documents.length}, Validated docs: \${validatedDocs}, Percentage: \${completionPercentage}%\`);
  console.log(\`🔍 PROGRESS DEBUG: Document statuses:\`, documents.map(d => ({ name: d.fileName, status: d.validationStatus })));`;

content = content.replace(oldFunctionStart, newFunctionStart);

// Escribir el archivo modificado
fs.writeFileSync(filePath, content);

console.log('✅ Logs de debugging agregados para diagnosticar el cálculo de progreso');
