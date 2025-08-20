const fs = require('fs');

// Leer el archivo actual
const filePath = 'src/app/api/postulations/[dni]/documents/route.ts';
let content = fs.readFileSync(filePath, 'utf8');

// Reemplazar las líneas específicas de cálculo de porcentaje
// Línea ~324: 'completionPercentage: 0' -> usar cálculo correcto
content = content.replace(
  'if (rejected > 0) return { status: \'REJECTED\', completionPercentage: 0 };',
  'if (rejected > 0) return { status: \'REJECTED\', completionPercentage: Math.round(((approved + rejected) / documents.length) * 100) };'
);

content = content.replace(
  'if (approved === documents.length) return { status: \'COMPLETED\', completionPercentage: 100 };',
  'if (approved === documents.length) return { status: \'COMPLETED\', completionPercentage: Math.round(((approved + rejected) / documents.length) * 100) };'
);

content = content.replace(
  'completionPercentage: Math.round((approved / documents.length) * 100)',
  'completionPercentage: Math.round(((approved + rejected) / documents.length) * 100)'
);

content = content.replace(
  'return { status: \'PENDING\', completionPercentage: 0 };',
  'return { status: \'PENDING\', completionPercentage: Math.round(((approved + rejected) / documents.length) * 100) };'
);

// Para la sección de documentos requeridos también
content = content.replace(
  'return { status: \'REJECTED\', completionPercentage: 0 };',
  'return { status: \'REJECTED\', completionPercentage: Math.round(((documents.filter(d => d.validationStatus !== \'PENDING\').length) / documents.length) * 100) };'
);

content = content.replace(
  'return { status: \'COMPLETED\', completionPercentage: 100 };',
  'return { status: \'COMPLETED\', completionPercentage: Math.round(((documents.filter(d => d.validationStatus !== \'PENDING\').length) / documents.length) * 100) };'
);

content = content.replace(
  'const percentage = Math.round((approvedRequired / requiredDocs.length) * 100);',
  'const percentage = Math.round(((documents.filter(d => d.validationStatus !== \'PENDING\').length) / documents.length) * 100);'
);

// Escribir el archivo modificado
fs.writeFileSync(filePath, content);

console.log('✅ Lógica de progreso corregida: ahora calcula (validados / total) * 100');
