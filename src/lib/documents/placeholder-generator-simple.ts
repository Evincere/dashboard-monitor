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
    // Generar un HTML simple que se puede convertir a PDF usando un enfoque diferente
    const htmlContent = this.generateHTML(info);
    
    // Por ahora, generar un "PDF" simple usando texto plano formateado
    // En una implementación futura se puede usar puppeteer o similar
    const pdfContent = this.htmlToPdfLike(htmlContent);
    
    return Buffer.from(pdfContent, 'utf-8');
  }

  private static generateHTML(info: DocumentPlaceholderInfo): string {
    const status = info.recoveryType === 'RECOVERED_BY_SIMILARITY' 
      ? 'DOCUMENTO RECUPERADO AUTOMÁTICAMENTE' 
      : 'DOCUMENTO NO ENCONTRADO';

    const statusColor = info.recoveryType === 'RECOVERED_BY_SIMILARITY' 
      ? '#28a745' 
      : '#dc3545';

    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Documento ${info.documentId}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { text-align: center; margin-bottom: 30px; }
        .status { color: ${statusColor}; font-size: 24px; font-weight: bold; }
        .section { margin: 20px 0; }
        .field { margin: 10px 0; }
        .label { font-weight: bold; display: inline-block; width: 150px; }
        .warning { background: #fff3cd; border: 1px solid #ffc107; padding: 15px; margin: 20px 0; }
        .error { background: #f8d7da; border: 1px solid #dc3545; padding: 15px; margin: 20px 0; }
        .instructions { background: #d1ecf1; border: 1px solid #bee5eb; padding: 15px; margin: 20px 0; }
    </style>
</head>
<body>
    <div class="header">
        <h1>MINISTERIO PÚBLICO DE LA DEFENSA</h1>
        <h2>Sistema de Concursos - Validación de Documentos</h2>
        <div class="status">${status}</div>
    </div>

    <div class="section">
        <h3>INFORMACIÓN DEL DOCUMENTO</h3>
        <div class="field"><span class="label">Usuario:</span> ${info.userName || 'N/A'} (DNI: ${info.userDni})</div>
        <div class="field"><span class="label">Tipo de Documento:</span> ${info.documentType.nombre}</div>
        <div class="field"><span class="label">ID de Documento:</span> ${info.documentId}</div>
        <div class="field"><span class="label">Archivo Esperado:</span> ${info.fileName}</div>
        <div class="field"><span class="label">Ruta Esperada:</span> ${info.expectedPath}</div>
        ${info.uploadDate ? `<div class="field"><span class="label">Fecha de Carga:</span> ${new Date(info.uploadDate).toLocaleString('es-AR')}</div>` : ''}
    </div>

    ${info.recoveryType === 'RECOVERED_BY_SIMILARITY' && info.recoveredDocument ? `
    <div class="warning">
        <h3>⚠️ DOCUMENTO RECUPERADO</h3>
        <div class="field"><span class="label">Archivo Recuperado:</span> ${info.recoveredDocument.fileName}</div>
        <div class="field"><span class="label">ID Recuperado:</span> ${info.recoveredDocument.id}</div>
        <p><strong>ADVERTENCIA:</strong> Este documento fue recuperado automáticamente por coincidencia de tipo. 
        Verifique que el contenido corresponde al documento solicitado. 
        Si no es correcto, solicite al usuario que vuelva a cargar el documento.</p>
    </div>
    ` : ''}

    <div class="section">
        <h3>RUTAS DE BÚSQUEDA</h3>
        <p>Se buscó el archivo en las siguientes ubicaciones:</p>
        <ol>
            ${info.searchAttempted.map(path => `<li>${path}</li>`).join('')}
        </ol>
    </div>

    ${info.similarDocuments && info.similarDocuments.length > 0 ? `
    <div class="section">
        <h3>DOCUMENTOS SIMILARES ENCONTRADOS</h3>
        <ol>
            ${info.similarDocuments.map(doc => `
                <li>${doc.fileName}
                    <br>ID: ${doc.id}
                    <br>Ruta: ${doc.path}
                </li>
            `).join('')}
        </ol>
    </div>
    ` : ''}

    <div class="instructions">
        <h3>INSTRUCCIONES PARA EL ADMINISTRADOR</h3>
        ${info.recoveryType === 'RECOVERED_BY_SIMILARITY' ? `
        <ol>
            <li>Revisar que el documento recuperado corresponde al tipo solicitado</li>
            <li>Si el documento es correcto, puede continuar con la validación</li>
            <li>Si el documento no es correcto, marcar como "Requiere Re-subida"</li>
            <li>Contactar al usuario para que cargue el documento correcto</li>
        </ol>
        ` : `
        <ol>
            <li>Marcar esta postulación como "Documentación Incompleta"</li>
            <li>Contactar al usuario para informar sobre el documento faltante</li>
            <li>Solicitar que vuelva a cargar el documento requerido</li>
            <li>Una vez recargado, procesar nuevamente la validación</li>
        </ol>
        `}
    </div>

    <div style="text-align: center; margin-top: 40px; font-size: 12px; color: #666;">
        Generado automáticamente el ${new Date().toLocaleString('es-AR')}<br>
        Sistema de Validación de Documentos v1.0
    </div>
</body>
</html>`;
  }

  private static htmlToPdfLike(html: string): string {
    // Convertir HTML a texto plano formateado que se puede mostrar como "PDF"
    // Esta es una implementación simple - en el futuro se puede usar puppeteer
    
    return `%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj

2 0 obj
<<
/Type /Pages
/Kids [3 0 R]
/Count 1
>>
endobj

3 0 obj
<<
/Type /Page
/Parent 2 0 R
/MediaBox [0 0 612 792]
/Contents 4 0 R
/Resources <<
  /Font <<
    /F1 5 0 R
  >>
>>
>>
endobj

4 0 obj
<<
/Length ${Buffer.byteLength(this.createPdfContent(html))}
>>
stream
BT
/F1 12 Tf
50 750 Td
${this.createPdfContent(html)}
ET
endstream
endobj

5 0 obj
<<
/Type /Font
/Subtype /Type1
/BaseFont /Helvetica
>>
endobj

xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000251 00000 n 
0000000${String(350 + Buffer.byteLength(this.createPdfContent(html))).padStart(5, '0')} 00000 n 
trailer
<<
/Size 6
/Root 1 0 R
>>
startxref
${400 + Buffer.byteLength(this.createPdfContent(html))}
%%EOF`;
  }

  private static createPdfContent(html: string): string {
    // Extraer texto del HTML y formatearlo para PDF
    let text = html
      .replace(/<[^>]*>/g, '\n')  // Remover tags HTML
      .replace(/&nbsp;/g, ' ')    // Reemplazar espacios no separables
      .replace(/&amp;/g, '&')     // Reemplazar entidades HTML
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/\n\s*\n/g, '\n')  // Remover líneas vacías múltiples
      .trim();

    // Dividir en líneas y formatear para PDF
    const lines = text.split('\n').filter(line => line.trim().length > 0);
    let pdfLines = [];
    let yPosition = 0;

    for (const line of lines) {
      if (line.length > 80) {
        // Dividir líneas largas
        const words = line.split(' ');
        let currentLine = '';
        for (const word of words) {
          if ((currentLine + ' ' + word).length > 80) {
            if (currentLine) {
              pdfLines.push(`(${currentLine}) Tj`);
              pdfLines.push(`0 -15 Td`);
              yPosition += 15;
            }
            currentLine = word;
          } else {
            currentLine += (currentLine ? ' ' : '') + word;
          }
        }
        if (currentLine) {
          pdfLines.push(`(${currentLine}) Tj`);
          pdfLines.push(`0 -15 Td`);
          yPosition += 15;
        }
      } else {
        pdfLines.push(`(${line}) Tj`);
        pdfLines.push(`0 -15 Td`);
        yPosition += 15;
      }
    }

    return pdfLines.join('\n');
  }
}
