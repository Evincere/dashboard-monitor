import fs from 'fs/promises';
import path from 'path';

export interface DocumentFile {
  id: string;
  fileName: string;
  fullPath: string;
  documentType: string;
}

export interface SimilaritySearchResult {
  exactMatch?: DocumentFile;
  similarDocuments: DocumentFile[];
  searchAttempted: string[];
}

export class DocumentSimilarityMatcher {
  
  /**
   * Extrae el tipo de documento del nombre del archivo
   * Formato esperado: {id}_{TipoDocumento}_{timestamp}.pdf
   */
  static extractDocumentType(fileName: string): string {
    // Remover la extensión .pdf
    const nameWithoutExt = fileName.replace(/\.pdf$/i, '');
    
    // Dividir por underscores
    const parts = nameWithoutExt.split('_');
    
    if (parts.length >= 2) {
      // El tipo de documento está entre el ID (primer parte) y el timestamp (última parte)
      // Reconstruir el tipo de documento uniendo todas las partes intermedias
      const typeParts = parts.slice(1, -1); // Quitar primera (ID) y última parte (timestamp)
      return typeParts.join('_');
    }
    
    // Si no sigue el formato esperado, devolver el nombre completo sin ID
    return nameWithoutExt.replace(/^[a-f0-9-]+_/i, '');
  }

  /**
   * Normaliza el nombre del tipo de documento para comparación
   */
  static normalizeDocumentType(documentType: string): string {
    return documentType
      .toLowerCase()
      .replace(/\s+/g, '_')
      .replace(/[áàäâ]/g, 'a')
      .replace(/[éèëê]/g, 'e')
      .replace(/[íìïî]/g, 'i')
      .replace(/[óòöô]/g, 'o')
      .replace(/[úùüû]/g, 'u')
      .replace(/[ñ]/g, 'n')
      .replace(/[^a-z0-9_]/g, '');
  }

  /**
   * Busca documentos similares por tipo en la carpeta del usuario
   */
  static async searchSimilarDocuments(
    userDni: string, 
    expectedDocumentType: string, 
    expectedDocumentId: string,
    searchPaths: string[]
  ): Promise<SimilaritySearchResult> {
    const result: SimilaritySearchResult = {
      similarDocuments: [],
      searchAttempted: []
    };

    const expectedTypeNormalized = this.normalizeDocumentType(expectedDocumentType);
    
    for (const basePath of searchPaths) {
      const userDir = path.join(basePath, userDni);
      result.searchAttempted.push(userDir);
      
      try {
        await fs.access(userDir);
        const files = await fs.readdir(userDir);
        
        // Filtrar solo archivos PDF
        const pdfFiles = files.filter(file => file.toLowerCase().endsWith('.pdf'));
        
        for (const fileName of pdfFiles) {
          const filePath = path.join(userDir, fileName);
          
          try {
            const stats = await fs.stat(filePath);
            if (!stats.isFile()) continue;
            
            // Extraer ID del documento del nombre del archivo
            const fileId = fileName.split('_')[0];
            
            // Verificar si es el archivo exacto que buscamos
            if (fileId === expectedDocumentId) {
              result.exactMatch = {
                id: fileId,
                fileName,
                fullPath: filePath,
                documentType: this.extractDocumentType(fileName)
              };
              continue;
            }
            
            // Extraer y normalizar el tipo de documento del archivo
            const fileDocumentType = this.extractDocumentType(fileName);
            const fileTypeNormalized = this.normalizeDocumentType(fileDocumentType);
            
            // Verificar similitud EXACTA del tipo de documento
            if (fileTypeNormalized === expectedTypeNormalized) {
              result.similarDocuments.push({
                id: fileId,
                fileName,
                fullPath: filePath,
                documentType: fileDocumentType
              });
            }
          } catch (fileError) {
            console.warn(`⚠️ [SIMILARITY_MATCHER] Error reading file ${filePath}:`, fileError);
            continue;
          }
        }
        
        // Si encontramos documentos similares o exactos en esta ubicación, no continuar buscando
        if (result.exactMatch || result.similarDocuments.length > 0) {
          break;
        }
        
      } catch (dirError) {
        console.log(`📁 [SIMILARITY_MATCHER] Directory ${userDir} not accessible, continuing...`);
        continue;
      }
    }
    
    return result;
  }

  /**
   * Obtiene el mejor candidato de recuperación automática
   */
  static getBestRecoveryCandidate(similarDocuments: DocumentFile[]): DocumentFile | null {
    if (similarDocuments.length === 0) return null;
    
    // Por ahora, devolver el primer documento similar encontrado
    // En el futuro se podría implementar lógica más sofisticada basada en:
    // - Fecha de modificación más reciente
    // - Tamaño del archivo
    // - Otros criterios de relevancia
    
    return similarDocuments[0];
  }

  /**
   * Genera información de log para auditoría
   */
  static generateAuditLog(
    documentId: string, 
    userDni: string, 
    expectedType: string, 
    result: SimilaritySearchResult
  ): string {
    const timestamp = new Date().toISOString();
    
    let logMessage = `[DOCUMENT_RECOVERY] ${timestamp}\n`;
    logMessage += `User DNI: ${userDni}\n`;
    logMessage += `Document ID: ${documentId}\n`;
    logMessage += `Expected Type: ${expectedType}\n`;
    logMessage += `Search Paths: ${result.searchAttempted.join(', ')}\n`;
    
    if (result.exactMatch) {
      logMessage += `EXACT_MATCH_FOUND: ${result.exactMatch.fileName}\n`;
    } else if (result.similarDocuments.length > 0) {
      logMessage += `SIMILAR_DOCUMENTS_FOUND: ${result.similarDocuments.length}\n`;
      result.similarDocuments.forEach((doc, index) => {
        logMessage += `  ${index + 1}. ${doc.fileName} (ID: ${doc.id})\n`;
      });
    } else {
      logMessage += `NO_DOCUMENTS_FOUND\n`;
    }
    
    logMessage += `---\n`;
    
    return logMessage;
  }
}
