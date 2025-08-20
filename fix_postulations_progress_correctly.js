const fs = require('fs');

// Leer el archivo actual
const filePath = 'src/app/api/postulations/management/route.ts';
let content = fs.readFileSync(filePath, 'utf8');

// Reemplazar la función getDocumentsStats con la implementación correcta
const oldFunction = /\/\/ Función para obtener estadísticas de documentos de una postulación[\s\S]*?^}/m;

const newFunction = `// Función para obtener estadísticas de documentos de una postulación
async function getDocumentsStats(userId: string, token: string): Promise<{
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  required: number;
  completionPercentage: number;
  validationStatus: string;
}> {
  try {
    const documentsResponse = await fetch(\`http://localhost:8080/api/admin/documentos?usuarioId=\${userId}&size=100\`, {
      headers: {
        'Authorization': \`Bearer \${token}\`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!documentsResponse.ok) {
      console.warn(\`Failed to fetch documents for user \${userId}\`);
      return {
        total: 0,
        pending: 0,
        approved: 0,
        rejected: 0,
        required: 0,
        completionPercentage: 0,
        validationStatus: 'PENDING'
      };
    }
    
    const documentsData = await documentsResponse.json();
    const documents = documentsData.content || [];
    
    // Tipos de documentos obligatorios
    const REQUIRED_DOCUMENT_TYPES = [
      'DNI_FRONTAL',
      'DNI_DORSO', 
      'TITULO_UNIVERSITARIO_Y_CERTIFICADO_ANALITICO',
      'ANTECEDENTES_PENALES',
      'CERTIFICADO_SIN_SANCIONES',
      'CERTIFICADO_PROFESIONAL_ANTIGUEDAD',
      'CONSTANCIA_CUIL'
    ];
    
    const stats = {
      total: documents.length,
      pending: documents.filter(d => d.estado === 'PENDING').length,
      approved: documents.filter(d => d.estado === 'APPROVED').length,
      rejected: documents.filter(d => d.estado === 'REJECTED').length,
      required: 0,
      completionPercentage: 0,
      validationStatus: 'PENDING'
    };
    
    // Calcular documentos requeridos y progreso
    const requiredDocs = documents.filter(doc => {
      const docType = doc.tipoDocumento?.code || '';
      return REQUIRED_DOCUMENT_TYPES.includes(docType);
    });
    
    stats.required = requiredDocs.length;
    
    if (requiredDocs.length > 0) {
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
    }
    
    console.log(\`📊 Documents stats for user \${userId}: \${stats.approved}/\${stats.required} approved (\${stats.completionPercentage}%)\`);
    
    return stats;
  } catch (error) {
    console.error(\`Error fetching documents stats for user \${userId}:\`, error);
    return {
      total: 0,
      pending: 0,
      approved: 0,
      rejected: 0,
      required: 0,
      completionPercentage: 0,
      validationStatus: 'PENDING'
    };
  }
}`;

// Reemplazar la función
content = content.replace(oldFunction, newFunction);

// También cambiar la llamada de dni a userId
content = content.replace(
  'const documentsStats = await getDocumentsStats(dni, token);',
  'const documentsStats = await getDocumentsStats(inscription.userId, token);'
);

// Escribir el archivo modificado
fs.writeFileSync(filePath, content);

console.log('✅ Archivo corregido: ahora usa userId en lugar de DNI para obtener documentos');
