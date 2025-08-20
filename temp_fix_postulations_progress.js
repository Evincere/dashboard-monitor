const fs = require('fs');

// Leer el archivo actual
const filePath = 'src/app/api/postulations/management/route.ts';
let content = fs.readFileSync(filePath, 'utf8');

// Agregar función para obtener estadísticas de documentos
const getDocumentsStatsFunction = `
// Función para obtener estadísticas de documentos de una postulación
async function getDocumentsStats(dni: string, token: string): Promise<{
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  required: number;
  completionPercentage: number;
  validationStatus: string;
}> {
  try {
    const documentsResponse = await fetch(\`http://localhost:8080/api/admin/documents?usuarioId=\${dni}&size=100\`, {
      headers: {
        'Authorization': \`Bearer \${token}\`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!documentsResponse.ok) {
      console.warn(\`Failed to fetch documents for \${dni}\`);
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
    
    return stats;
  } catch (error) {
    console.error(\`Error fetching documents stats for \${dni}:\`, error);
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

// Insertar la función después de getRealCentroDeVida
const insertPoint = content.indexOf('export async function GET(request: NextRequest) {');
content = content.slice(0, insertPoint) + getDocumentsStatsFunction + '\n\n' + content.slice(insertPoint);

// Reemplazar la sección hardcodeada de documents
const hardcodedSection = `        const postulation = {
          id: inscription.id,
          user: {
            dni: dni,
            fullName: inscription.userInfo.fullName,
            email: inscription.userInfo.email
          },
          inscription: {
            id: inscription.id,
            state: inscription.state,
            centroDeVida: realCentroDeVida || 'Sin especificar',
            createdAt: inscription.inscriptionDate
          },
          contest: {
            title: inscription.contestInfo?.title || 'Concurso Multifuero MPD',
            position: inscription.contestInfo?.position || 'Magistrado/a'
          },
          documents: {
            total: 7,
            pending: 7,
            approved: 0,
            rejected: 0,
            required: 7,
            types: []
          },
          validationStatus: 'PENDING',
          priority: 'MEDIUM',
          completionPercentage: 0
        };`;

const dynamicSection = `        // Obtener estadísticas reales de documentos
        const documentsStats = await getDocumentsStats(dni, token);
        
        const postulation = {
          id: inscription.id,
          user: {
            dni: dni,
            fullName: inscription.userInfo.fullName,
            email: inscription.userInfo.email
          },
          inscription: {
            id: inscription.id,
            state: inscription.state,
            centroDeVida: realCentroDeVida || 'Sin especificar',
            createdAt: inscription.inscriptionDate
          },
          contest: {
            title: inscription.contestInfo?.title || 'Concurso Multifuero MPD',
            position: inscription.contestInfo?.position || 'Magistrado/a'
          },
          documents: {
            total: documentsStats.total,
            pending: documentsStats.pending,
            approved: documentsStats.approved,
            rejected: documentsStats.rejected,
            required: documentsStats.required,
            types: []
          },
          validationStatus: documentsStats.validationStatus,
          priority: 'MEDIUM',
          completionPercentage: documentsStats.completionPercentage
        };`;

content = content.replace(hardcodedSection, dynamicSection);

// Escribir el archivo modificado
fs.writeFileSync(filePath, content);

console.log('✅ Archivo corregido: ahora calcula dinámicamente el progreso de documentos');
