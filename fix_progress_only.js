const fs = require('fs');

// Leer el archivo actual
const filePath = 'src/app/api/postulations/[dni]/documents/route.ts';
let content = fs.readFileSync(filePath, 'utf8');

// Encontrar la función calculateValidationStatus y solo modificar el cálculo de porcentaje
// Buscar todas las instancias donde se calcula el porcentaje basado solo en documentos requeridos

// 1. En la línea con approvedRequired / requiredDocs.length
content = content.replace(
  /Math\.round\(\(approvedRequired \/ requiredDocs\.length\) \* 100\)/g,
  'Math.round(((documents.filter(d => d.validationStatus !== "PENDING").length) / documents.length) * 100)'
);

// 2. En la línea con approved / documents.length (dentro del bloque de no required docs)
content = content.replace(
  /Math\.round\(\(approved \/ documents\.length\) \* 100\)/g,
  'Math.round(((approved + rejected) / documents.length) * 100)'
);

console.log('✅ Solo corregido el cálculo de porcentaje sin modificar estructura');
