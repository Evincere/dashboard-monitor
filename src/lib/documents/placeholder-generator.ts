import PDFDocument from 'pdfkit';

export interface DocumentPlaceholderInfo {
  documentId: string;
  fileName: string;
  expectedPath: string;
  userDni: string;
  userName?: string;
  documentType: {
    code: string;
    nombre: string;
    descripcion?: string;
  };
  uploadDate?: string;
  searchAttempted: string[];
  similarDocuments?: {
    id: string;
    fileName: string;
    path: string;
  }[];
  recoveryType: 'NOT_FOUND' | 'RECOVERED_BY_SIMILARITY';
  recoveredDocument?: {
    id: string;
    fileName: string;
    path: string;
  };
}

export class DocumentPlaceholderGenerator {
  static async generatePlaceholderPDF(info: DocumentPlaceholderInfo): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      
      // Configurar PDFDocument con fuentes estándar
      const doc = new PDFDocument({ 
        margin: 50,
        font: 'Helvetica' // Usar fuente estándar incorporada
      });

      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      try {
        // Configurar colores
        const primaryColor = '#dc3545'; // Rojo de error
        const secondaryColor = '#6c757d'; // Gris
        const successColor = '#28a745'; // Verde para recuperación automática

        // Header - Logo y título institucional
        doc.fillColor('#000000')
           .fontSize(16)
           .text('MINISTERIO PÚBLICO DE LA DEFENSA', { align: 'center' });
        
        doc.fontSize(14)
           .text('Sistema de Concursos - Validación de Documentos', { align: 'center' });
        
        doc.moveDown(1);

        // Estado del documento
        if (info.recoveryType === 'RECOVERED_BY_SIMILARITY') {
          doc.fillColor(successColor)
             .fontSize(18)
             .text('DOCUMENTO RECUPERADO AUTOMATICAMENTE', { align: 'center' });
          
          doc.fillColor('#000000')
             .fontSize(12)
             .text('Este documento fue recuperado usando detección por similitud', { align: 'center' });
        } else {
          doc.fillColor(primaryColor)
             .fontSize(18)
             .text('DOCUMENTO NO ENCONTRADO', { align: 'center' });
          
          doc.fillColor('#000000')
             .fontSize(12)
             .text('El archivo físico de este documento no pudo ser localizado', { align: 'center' });
        }

        doc.moveDown(2);

        // Información del documento
        doc.fillColor('#000000')
           .fontSize(14)
           .text('INFORMACIÓN DEL DOCUMENTO');
        
        doc.moveTo(50, doc.y)
           .lineTo(550, doc.y)
           .stroke();
        
        doc.moveDown(0.5);

        const leftCol = 70;
        const rightCol = 300;
        let currentY = doc.y;

        // Usuario
        doc.fontSize(12)
           .text('Usuario:', leftCol, currentY);
        doc.text(`${info.userName || 'N/A'} (DNI: ${info.userDni})`, rightCol, currentY);

        currentY += 20;

        // Tipo de documento
        doc.text('Tipo de Documento:', leftCol, currentY);
        doc.text(info.documentType.nombre, rightCol, currentY);

        currentY += 20;

        // ID del documento
        doc.text('ID de Documento:', leftCol, currentY);
        doc.text(info.documentId, rightCol, currentY);

        currentY += 20;

        // Nombre del archivo esperado
        doc.text('Archivo Esperado:', leftCol, currentY);
        doc.text(info.fileName, rightCol, currentY);

        currentY += 20;

        // Fecha de carga
        if (info.uploadDate) {
          doc.text('Fecha de Carga:', leftCol, currentY);
          doc.text(new Date(info.uploadDate).toLocaleString('es-AR'), rightCol, currentY);
          currentY += 20;
        }

        // Ruta esperada
        doc.text('Ruta Esperada:', leftCol, currentY);
        doc.text(info.expectedPath, rightCol, currentY);

        doc.moveDown(2);

        // Información de recuperación automática
        if (info.recoveryType === 'RECOVERED_BY_SIMILARITY' && info.recoveredDocument) {
          doc.fillColor(successColor)
             .fontSize(14)
             .text('DOCUMENTO RECUPERADO');
          
          doc.moveTo(50, doc.y)
             .lineTo(550, doc.y)
             .stroke();
          
          doc.moveDown(0.5);
          doc.fillColor('#000000');

          currentY = doc.y;

          doc.fontSize(12)
             .text('Archivo Recuperado:', leftCol, currentY);
          doc.text(info.recoveredDocument.fileName, rightCol, currentY);

          currentY += 20;

          doc.text('ID Recuperado:', leftCol, currentY);
          doc.text(info.recoveredDocument.id, rightCol, currentY);

          doc.moveDown(1);

          // Advertencia sobre recuperación automática
          doc.fillColor('#ffc107')
             .rect(50, doc.y, 500, 80)
             .fill();
          
          doc.fillColor('#000000')
             .fontSize(11)
             .text('ADVERTENCIA:', 60, doc.y + 10);
          
          doc.text('Este documento fue recuperado automáticamente por coincidencia de tipo.', 60, doc.y + 25);
          doc.text('Verifique que el contenido corresponde al documento solicitado.', 60, doc.y + 40);
          doc.text('Si no es correcto, solicite al usuario que vuelva a cargar el documento.', 60, doc.y + 55);

          doc.moveDown(3);
        }

        // Rutas de búsqueda
        doc.fillColor('#000000')
           .fontSize(14)
           .text('RUTAS DE BÚSQUEDA');
        
        doc.moveTo(50, doc.y)
           .lineTo(550, doc.y)
           .stroke();
        
        doc.moveDown(0.5);

        doc.fontSize(11)
           .text('Se buscó el archivo en las siguientes ubicaciones:');

        doc.moveDown(0.5);

        info.searchAttempted.forEach((pathItem, index) => {
          doc.fontSize(10)
             .text(`${index + 1}. ${pathItem}`, { indent: 20 });
        });

        // Documentos similares encontrados
        if (info.similarDocuments && info.similarDocuments.length > 0) {
          doc.moveDown(1);
          
          doc.fillColor('#000000')
             .fontSize(14)
             .text('DOCUMENTOS SIMILARES ENCONTRADOS');
          
          doc.moveTo(50, doc.y)
             .lineTo(550, doc.y)
             .stroke();
          
          doc.moveDown(0.5);

          info.similarDocuments.forEach((similar, index) => {
            doc.fontSize(11)
               .text(`${index + 1}. ${similar.fileName}`, { indent: 20 });
            doc.fontSize(10)
               .fillColor(secondaryColor)
               .text(`   ID: ${similar.id}`, { indent: 40 });
            doc.text(`   Ruta: ${similar.path}`, { indent: 40 });
            doc.moveDown(0.3);
          });
        }

        doc.moveDown(2);

        // Instrucciones para el administrador
        doc.fillColor(primaryColor)
           .fontSize(14)
           .text('INSTRUCCIONES PARA EL ADMINISTRADOR');
        
        doc.moveTo(50, doc.y)
           .lineTo(550, doc.y)
           .stroke();
        
        doc.moveDown(0.5);
        doc.fillColor('#000000');

        if (info.recoveryType === 'RECOVERED_BY_SIMILARITY') {
          doc.fontSize(11)
             .text('1. Revisar que el documento recuperado corresponde al tipo solicitado');
          doc.text('2. Si el documento es correcto, puede continuar con la validación');
          doc.text('3. Si el documento no es correcto, marcar como "Requiere Re-subida"');
          doc.text('4. Contactar al usuario para que cargue el documento correcto');
        } else {
          doc.fontSize(11)
             .text('1. Marcar esta postulación como "Documentación Incompleta"');
          doc.text('2. Contactar al usuario para informar sobre el documento faltante');
          doc.text('3. Solicitar que vuelva a cargar el documento requerido');
          doc.text('4. Una vez recargado, procesar nuevamente la validación');
        }

        doc.moveDown(2);

        // Footer con información técnica
        doc.fontSize(9)
           .fillColor(secondaryColor)
           .text(`Generado automáticamente el ${new Date().toLocaleString('es-AR')}`, { align: 'center' });
        doc.text(`Sistema de Validación de Documentos v1.0`, { align: 'center' });

        doc.end();

      } catch (error) {
        console.error('Error generating placeholder PDF:', error);
        reject(error);
      }
    });
  }
}
