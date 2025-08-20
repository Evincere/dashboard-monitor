const fs = require('fs');

// Leer el archivo actual
const filePath = 'src/app/api/postulations/[dni]/documents/route.ts';
let content = fs.readFileSync(filePath, 'utf8');

// Crear una función auxiliar para calcular el porcentaje correcto
const auxiliaryFunction = `
// Función auxiliar para calcular porcentaje de progreso de validación
function calculateValidationPercentage(documents: Document[]): number {
  if (documents.length === 0) return 0;
  // Progreso = documentos validados (APPROVED + REJECTED) / total documentos
  const validatedDocs = documents.filter(doc => doc.validationStatus !== 'PENDING').length;
  return Math.round((validatedDocs / documents.length) * 100);
}
`;

// Insertar la función auxiliar antes de calculateValidationStatus
const insertBefore = 'function calculateValidationStatus(documents: Document[]):';
content = content.replace(insertBefore, auxiliaryFunction + insertBefore);

// Ahora reemplazar todos los cálculos de porcentaje para usar la función auxiliar
content = content.replace(
  /completionPercentage: 0/g,
  'completionPercentage: calculateValidationPercentage(documents)'
);

content = content.replace(
  /completionPercentage: 100/g,
  'completionPercentage: calculateValidationPercentage(documents)'
);

content = content.replace(
  /completionPercentage: Math\.round\(\([^)]+\)\)/g,
  'completionPercentage: calculateValidationPercentage(documents)'
);

// Escribir el archivo modificado
fs.writeFileSync(filePath, content);

console.log('✅ Lógica de porcentaje corregida usando función auxiliar');
