const fs = require('fs');

// Leer el archivo actual
const filePath = 'src/app/api/postulations/[dni]/documents/route.ts';
let content = fs.readFileSync(filePath, 'utf8');

// Buscar el inicio y fin de la función calculateValidationStatus
const functionStart = content.indexOf('function calculateValidationStatus(documents: Document[]):');
const functionEnd = content.indexOf('\n}', functionStart) + 2;

if (functionStart === -1) {
  console.error('❌ No se encontró la función calculateValidationStatus');
  process.exit(1);
}

// Nueva función corregida
const newFunction = `function calculateValidationStatus(documents: Document[]): {
  status: 'PENDING' | 'PARTIAL' | 'COMPLETED' | 'REJECTED';
  completionPercentage: number;
} {
  if (documents.length === 0) {
    return { status: 'PENDING', completionPercentage: 0 };
  }

  // Calcular progreso basado en TODOS los documentos (obligatorios + opcionales)
  const validatedDocs = documents.filter(doc => doc.validationStatus !== 'PENDING').length;
  const completionPercentage = Math.round((validatedDocs / documents.length) * 100);

  const requiredDocs = documents.filter(doc => doc.isRequired);
  
  if (requiredDocs.length === 0) {
    // Si no hay documentos obligatorios, basarse en todos los documentos
    const approved = documents.filter(doc => doc.validationStatus === 'APPROVED').length;
    const rejected = documents.filter(doc => doc.validationStatus === 'REJECTED').length;
    
    if (rejected > 0) return { status: 'REJECTED', completionPercentage };
    if (approved === documents.length) return { status: 'COMPLETED', completionPercentage };
    if (approved > 0) return { status: 'PARTIAL', completionPercentage };
    return { status: 'PENDING', completionPercentage };
  }

  const approvedRequired = requiredDocs.filter(doc => doc.validationStatus === 'APPROVED').length;
  const rejectedRequired = requiredDocs.filter(doc => doc.validationStatus === 'REJECTED').length;

  // Si hay documentos obligatorios rechazados, está rechazado
  if (rejectedRequired > 0) {
    return { status: 'REJECTED', completionPercentage };
  }

  // Si todos los obligatorios están aprobados, está completado
  if (approvedRequired === requiredDocs.length) {
    return { status: 'COMPLETED', completionPercentage };
  }

  // Si algunos están aprobados, está parcial
  if (approvedRequired > 0) {
    return { status: 'PARTIAL', completionPercentage };
  }

  // Todos pendientes
  return { status: 'PENDING', completionPercentage };
}`;

// Reemplazar la función completa
content = content.slice(0, functionStart) + newFunction + content.slice(functionEnd);

// Escribir el archivo modificado
fs.writeFileSync(filePath, content);

console.log('✅ Función calculateValidationStatus reescrita completamente sin bugs');
