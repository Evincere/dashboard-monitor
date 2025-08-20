const fs = require('fs');

// Leer el archivo actual
const filePath = 'src/app/api/postulations/management/route.ts';
let content = fs.readFileSync(filePath, 'utf8');

// Encontrar la función calculateDocumentsStats y corregir la lógica
const oldCalculation = `    if (requiredDocs.length > 0) {
      const approvedRequired = requiredDocs.filter(doc => doc.estado === 'APPROVED').length;
      const rejectedRequired = requiredDocs.filter(doc => doc.estado === 'REJECTED').length;
      
      if (rejectedRequired > 0) {
        stats.validationStatus = 'REJECTED';
        stats.completionPercentage = 0;
      } else if (approvedRequired === requiredDocs.length) {
        stats.validationStatus = 'COMPLETED';
        stats.completionPercentage = 100;
      } else if (approvedRequired > 0) {
        stats.validationStatus = 'PARTIAL';
        stats.completionPercentage = Math.round((approvedRequired / requiredDocs.length) * 100);
      } else {
        stats.validationStatus = 'PENDING';
        stats.completionPercentage = 0;
      }
    }`;

const newCalculation = `    // Calcular progreso basado en TODOS los documentos (obligatorios + opcionales)
    // Progreso = documentos validados (APPROVED + REJECTED) / total documentos
    const validatedDocs = documents.filter(doc => doc.estado !== 'PENDING').length;
    stats.completionPercentage = documents.length > 0 ? Math.round((validatedDocs / documents.length) * 100) : 0;

    // Para determinar el STATUS, usar solo documentos requeridos
    if (requiredDocs.length > 0) {
      const approvedRequired = requiredDocs.filter(doc => doc.estado === 'APPROVED').length;
      const rejectedRequired = requiredDocs.filter(doc => doc.estado === 'REJECTED').length;
      
      if (rejectedRequired > 0) {
        stats.validationStatus = 'REJECTED';
      } else if (approvedRequired === requiredDocs.length) {
        stats.validationStatus = 'COMPLETED';
      } else if (approvedRequired > 0) {
        stats.validationStatus = 'PARTIAL';
      } else {
        stats.validationStatus = 'PENDING';
      }
    } else {
      // Si no hay documentos obligatorios, basarse en todos los documentos
      const approved = documents.filter(doc => doc.estado === 'APPROVED').length;
      const rejected = documents.filter(doc => doc.estado === 'REJECTED').length;
      
      if (rejected > 0) stats.validationStatus = 'REJECTED';
      else if (approved === documents.length) stats.validationStatus = 'COMPLETED';
      else if (approved > 0) stats.validationStatus = 'PARTIAL';
      else stats.validationStatus = 'PENDING';
    }`;

// Reemplazar la lógica
content = content.replace(oldCalculation, newCalculation);

// Escribir el archivo modificado
fs.writeFileSync(filePath, content);

console.log('✅ Lógica de progreso en management también corregida');
