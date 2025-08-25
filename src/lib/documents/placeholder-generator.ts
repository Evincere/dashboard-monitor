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
  /**
   * Genera un PDF placeholder usando un enfoque simple sin dependencias de fuentes externas
   */
  static async generatePlaceholderPDF(info: DocumentPlaceholderInfo): Promise<Buffer> {
    // Crear un PDF muy simple manualmente sin PDFKit
    const pdfContent = this.createSimplePDF(info);
    return Buffer.from(pdfContent, 'binary');
  }

  private static createSimplePDF(info: DocumentPlaceholderInfo): string {
    const status = info.recoveryType === 'RECOVERED_BY_SIMILARITY' 
      ? 'DOCUMENTO RECUPERADO AUTOMATICAMENTE' 
      : 'DOCUMENTO NO ENCONTRADO';

    // Crear contenido de texto para el PDF
    const textContent = this.createTextContent(info, status);
    
    // Crear un PDF simple
    const pdf = `%PDF-1.3
1 0 obj
<<
/Type /Catalog
/Outlines 2 0 R
/Pages 3 0 R
>>
endobj
2 0 obj
<<
/Type /Outlines
/Count 0
>>
endobj
3 0 obj
<<
/Type /Pages
/Count 1
/Kids [4 0 R]
>>
endobj
4 0 obj
<<
/Type /Page
/Parent 3 0 R
/Resources <<
/Font <<
/F1 5 0 R
>>
>>
/MediaBox [0 0 612 792]
/Contents 6 0 R
>>
endobj
5 0 obj
<<
/Type /Font
/Subtype /Type1
/BaseFont /Times-Roman
>>
endobj
6 0 obj
<<
/Length ${textContent.length}
>>
stream
BT
/F1 12 Tf
72 720 Td
${textContent}
ET
endstream
endobj
xref
0 7
0000000000 65535 f 
0000000010 00000 n 
0000000079 00000 n 
0000000126 00000 n 
0000000183 00000 n 
0000000334 00000 n 
0000000397 00000 n 
trailer
<<
/Size 7
/Root 1 0 R
>>
startxref
${500 + textContent.length}
%%EOF`;

    return pdf;
  }

  private static createTextContent(info: DocumentPlaceholderInfo, status: string): string {
    const lines: string[] = [];
    
    // Función helper para agregar líneas
    const addLine = (text: string, moveDown = 15) => {
      lines.push(`(${this.escapeText(text)}) Tj`);
      lines.push(`0 -${moveDown} Td`);
    };

    // Header
    addLine('MINISTERIO PUBLICO DE LA DEFENSA', 20);
    addLine('Sistema de Concursos - Validacion de Documentos', 30);
    addLine(status, 30);
    addLine('', 20);

    // Información del documento
    addLine('INFORMACION DEL DOCUMENTO', 20);
    addLine('-----------------------------------', 15);
    addLine(`Usuario: ${info.userName || 'N/A'} (DNI: ${info.userDni})`, 15);
    addLine(`Tipo de Documento: ${info.documentType.nombre}`, 15);
    addLine(`ID de Documento: ${info.documentId}`, 15);
    addLine(`Archivo Esperado: ${info.fileName}`, 15);
    addLine(`Ruta Esperada: ${info.expectedPath}`, 15);
    
    if (info.uploadDate) {
      addLine(`Fecha de Carga: ${new Date(info.uploadDate).toLocaleString('es-AR')}`, 15);
    }
    addLine('', 20);

    // Información de recuperación
    if (info.recoveryType === 'RECOVERED_BY_SIMILARITY' && info.recoveredDocument) {
      addLine('DOCUMENTO RECUPERADO', 20);
      addLine('-------------------', 15);
      addLine(`Archivo Recuperado: ${info.recoveredDocument.fileName}`, 15);
      addLine(`ID Recuperado: ${info.recoveredDocument.id}`, 15);
      addLine('', 15);
      addLine('ADVERTENCIA: Este documento fue recuperado automaticamente', 15);
      addLine('por coincidencia de tipo. Verifique que el contenido', 15);
      addLine('corresponde al documento solicitado.', 20);
    }

    // Rutas de búsqueda
    addLine('RUTAS DE BUSQUEDA', 20);
    addLine('-----------------', 15);
    addLine('Se busco el archivo en las siguientes ubicaciones:', 15);
    info.searchAttempted.forEach((pathItem, index) => {
      addLine(`${index + 1}. ${pathItem}`, 15);
    });
    addLine('', 20);

    // Documentos similares
    if (info.similarDocuments && info.similarDocuments.length > 0) {
      addLine('DOCUMENTOS SIMILARES ENCONTRADOS', 20);
      addLine('----------------------------------', 15);
      info.similarDocuments.forEach((doc, index) => {
        addLine(`${index + 1}. ${doc.fileName}`, 15);
        addLine(`   ID: ${doc.id}`, 15);
        addLine(`   Ruta: ${doc.path}`, 15);
      });
      addLine('', 20);
    }

    // Instrucciones
    addLine('INSTRUCCIONES PARA EL ADMINISTRADOR', 20);
    addLine('-----------------------------------', 15);
    
    if (info.recoveryType === 'RECOVERED_BY_SIMILARITY') {
      addLine('1. Revisar que el documento recuperado corresponde', 15);
      addLine('   al tipo solicitado', 15);
      addLine('2. Si el documento es correcto, continuar con', 15);
      addLine('   la validacion', 15);
      addLine('3. Si no es correcto, marcar como "Requiere Re-subida"', 15);
      addLine('4. Contactar al usuario para que cargue el documento', 15);
      addLine('   correcto', 15);
    } else {
      addLine('1. Marcar esta postulacion como "Documentacion Incompleta"', 15);
      addLine('2. Contactar al usuario para informar sobre el', 15);
      addLine('   documento faltante', 15);
      addLine('3. Solicitar que vuelva a cargar el documento requerido', 15);
      addLine('4. Una vez recargado, procesar nuevamente la validacion', 15);
    }

    addLine('', 30);
    addLine(`Generado automaticamente el ${new Date().toLocaleString('es-AR')}`, 15);
    addLine('Sistema de Validacion de Documentos v1.0', 15);

    return lines.join('\n');
  }

  private static escapeText(text: string): string {
    // Escapar caracteres especiales para PDF
    return text
      .replace(/\\/g, '\\\\')
      .replace(/\(/g, '\\(')
      .replace(/\)/g, '\\)')
      .replace(/\n/g, ' ')
      .replace(/\r/g, ' ')
      .substring(0, 80); // Limitar longitud de línea
  }
}
